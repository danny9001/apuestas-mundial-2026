import { NextRequest, NextResponse } from 'next/server';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  type VerifiedRegistrationResponse,
} from '@simplewebauthn/server';
import pool from '@/lib/db';
import { getSessionUser, setSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const rpID = process.env.WEBAUTHN_RP_ID || 'localhost';
const rpName = process.env.WEBAUTHN_RP_NAME || 'Apuestas Mundial 2026';
const origin = process.env.WEBAUTHN_ORIGIN || 'http://localhost:3000';

// In-memory challenge store (dev only — use Redis/DB in production)
const challengeStore = new Map<number, string>();

// POST /api/auth/webauthn/register?step=options|verify
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Debes iniciar sesión primero' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const step = searchParams.get('step');

    if (step === 'options') {
      // Fetch existing credentials to exclude them
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
        rpID,
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

      challengeStore.set(user.id, options.challenge);
      return NextResponse.json(options);
    }

    if (step === 'verify') {
      const body = await req.json();
      const expectedChallenge = challengeStore.get(user.id);

      if (!expectedChallenge) {
        return NextResponse.json({ error: 'Challenge expirado o no encontrado' }, { status: 400 });
      }

      let verification: VerifiedRegistrationResponse;
      try {
        verification = await verifyRegistrationResponse({
          response: body,
          expectedChallenge,
          expectedOrigin: origin,
          expectedRPID: rpID,
        });
      } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }

      if (!verification.verified || !verification.registrationInfo) {
        return NextResponse.json({ error: 'Verificación fallida' }, { status: 400 });
      }

      challengeStore.delete(user.id);

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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
