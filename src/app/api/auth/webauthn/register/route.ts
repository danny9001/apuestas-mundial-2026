import { NextRequest, NextResponse } from 'next/server';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  type VerifiedRegistrationResponse,
} from '@simplewebauthn/server';
import pool from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const rpName = process.env.WEBAUTHN_RP_NAME || 'Apuestas Mundial 2026';

function resolveRpContext(req: NextRequest): { rpID: string; origin: string } {
  const requestUrl = new URL(req.url);
  let resolvedOrigin =
    req.headers.get('origin') || req.headers.get('referer') || requestUrl.origin;
  try { resolvedOrigin = new URL(resolvedOrigin).origin; } catch { /* keep */ }
  const resolvedRpID = new URL(resolvedOrigin).hostname;

  const envRpID = process.env.WEBAUTHN_RP_ID;
  const envOrigin = process.env.WEBAUTHN_ORIGIN;
  const finalRpID =
    envRpID && envRpID !== 'localhost' && resolvedRpID !== 'localhost' ? envRpID : resolvedRpID;
  const finalOrigin =
    envOrigin && !envOrigin.includes('localhost') && !resolvedOrigin.includes('localhost')
      ? envOrigin
      : resolvedOrigin;

  return { rpID: finalRpID, origin: finalOrigin };
}

// Key used in webauthn_challenges table: "reg:<userId>"
function regKey(userId: number) {
  return `reg:${userId}`;
}

async function saveChallenge(key: string, challenge: string): Promise<void> {
  // Upsert challenge — TTL 5 min. Also purge expired rows opportunistically.
  await pool.query(`DELETE FROM webauthn_challenges WHERE expires_at < NOW()`);
  await pool.query(
    `INSERT INTO webauthn_challenges (challenge_key, challenge, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '5 minutes')
     ON CONFLICT (challenge_key) DO UPDATE
       SET challenge = EXCLUDED.challenge, expires_at = EXCLUDED.expires_at`,
    [key, challenge]
  );
}

async function consumeChallenge(key: string): Promise<string | null> {
  const res = await pool.query(
    `DELETE FROM webauthn_challenges
     WHERE challenge_key = $1 AND expires_at > NOW()
     RETURNING challenge`,
    [key]
  );
  return res.rows[0]?.challenge ?? null;
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Debes iniciar sesión primero' }, { status: 401 });
    }

    const { rpID: finalRpID, origin: finalOrigin } = resolveRpContext(req);
    const step = new URL(req.url).searchParams.get('step');

    if (step === 'options') {
      const existingRes = await pool.query(
        'SELECT credential_id FROM passkeys WHERE user_id = $1',
        [user.id]
      );
      const excludeCredentials = existingRes.rows.map((r) => ({
        id: r.credential_id,
        type: 'public-key' as const,
      }));

      const options = await generateRegistrationOptions({
        rpName,
        rpID: finalRpID,
        userID: new TextEncoder().encode(String(user.id)),
        userName: user.email,
        userDisplayName: user.nombre,
        attestationType: 'none',
        excludeCredentials,
        authenticatorSelection: {
          residentKey: 'preferred',
          userVerification: 'preferred',
        },
      });

      await saveChallenge(regKey(user.id), options.challenge);
      return NextResponse.json(options);
    }

    if (step === 'verify') {
      const body = await req.json();

      const expectedChallenge = await consumeChallenge(regKey(user.id));
      if (!expectedChallenge) {
        return NextResponse.json({ error: 'Challenge expirado. Volvé a iniciar el registro.' }, { status: 400 });
      }

      let verification: VerifiedRegistrationResponse;
      try {
        verification = await verifyRegistrationResponse({
          response: body,
          expectedChallenge,
          expectedOrigin: finalOrigin,
          expectedRPID: finalRpID,
        });
      } catch (err: any) {
        return NextResponse.json({ error: 'Verificación fallida' }, { status: 400 });
      }

      if (!verification.verified || !verification.registrationInfo) {
        return NextResponse.json({ error: 'Verificación fallida' }, { status: 400 });
      }

      const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

      await pool.query(
        `INSERT INTO passkeys (user_id, credential_id, public_key, counter, device_type, backed_up, transports)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (credential_id) DO NOTHING`,
        [
          user.id,
          credential.id,
          Buffer.from(credential.publicKey),
          credential.counter,
          credentialDeviceType,
          credentialBackedUp,
          body.response?.transports ?? [],
        ]
      );

      return NextResponse.json({ verified: true });
    }

    return NextResponse.json({ error: 'step inválido' }, { status: 400 });
  } catch (error: any) {
    console.error('WebAuthn register error:', error);
    return NextResponse.json({ error: 'Error al registrar passkey' }, { status: 500 });
  }
}
