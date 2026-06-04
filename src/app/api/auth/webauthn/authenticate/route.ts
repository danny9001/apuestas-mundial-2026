import { NextRequest, NextResponse } from 'next/server';
import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import pool from '@/lib/db';
import { setSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

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

// ── DB-backed challenge store (shared across all app replicas) ──────────────

async function saveChallenge(key: string, challenge: string): Promise<void> {
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
    const { rpID: finalRpID, origin: finalOrigin } = resolveRpContext(req);
    const step = new URL(req.url).searchParams.get('step');

    // ── OPTIONS ─────────────────────────────────────────────────────────────
    if (step === 'options') {
      const body = await req.json().catch(() => ({}));
      const email: string = body?.email?.toLowerCase().trim() ?? '';

      if (email) {
        // Email-specific flow
        const userRes = await pool.query(
          'SELECT id, activo FROM users WHERE lower(email) = $1', [email]
        );
        if (userRes.rows.length === 0) {
          return NextResponse.json({ error: 'No se encontró passkey para este usuario' }, { status: 404 });
        }
        const user = userRes.rows[0];
        if (!user.activo) return NextResponse.json({ error: 'Usuario desactivado' }, { status: 403 });

        const passkeysRes = await pool.query(
          'SELECT credential_id, transports FROM passkeys WHERE user_id = $1', [user.id]
        );
        if (passkeysRes.rows.length === 0) {
          return NextResponse.json({ error: 'Este usuario no tiene passkeys registradas' }, { status: 404 });
        }

        const options = await generateAuthenticationOptions({
          rpID: finalRpID,
          userVerification: 'preferred',
          allowCredentials: passkeysRes.rows.map((r) => ({
            id: r.credential_id,
            type: 'public-key' as const,
            transports: r.transports ?? [],
          })),
        });
        await saveChallenge(`auth:${email}`, options.challenge);
        return NextResponse.json(options);

      } else {
        // Resident / discoverable credential flow — no email needed
        const options = await generateAuthenticationOptions({
          rpID: finalRpID,
          userVerification: 'required',
          allowCredentials: [],
        });
        await saveChallenge('auth:__discoverable__', options.challenge);
        return NextResponse.json(options);
      }
    }

    // ── VERIFY ──────────────────────────────────────────────────────────────
    if (step === 'verify') {
      const body = await req.json();
      const email: string = body?.email?.toLowerCase().trim() ?? '';
      const challengeKey = email ? `auth:${email}` : 'auth:__discoverable__';

      const expectedChallenge = await consumeChallenge(challengeKey);
      if (!expectedChallenge) {
        return NextResponse.json({ error: 'Challenge expirado. Intentá de nuevo.' }, { status: 400 });
      }

      const pkRes = await pool.query(
        `SELECT pk.credential_id, pk.public_key, pk.counter, pk.transports,
                u.id AS uid, u.nombre, u.email, u.tipo, u.avatar, u.activo, u.aprobado
         FROM passkeys pk
         JOIN users u ON pk.user_id = u.id
         WHERE pk.credential_id = $1`,
        [body.id]
      );
      if (pkRes.rows.length === 0) {
        return NextResponse.json({ error: 'Passkey no registrada en este sistema' }, { status: 404 });
      }

      const pk = pkRes.rows[0];
      if (!pk.activo) return NextResponse.json({ error: 'Usuario desactivado' }, { status: 403 });

      // Resident-key: validate userHandle matches the DB user
      if (!email && body.response?.userHandle) {
        try {
          const pad = (body.response.userHandle as string).replace(/-/g, '+').replace(/_/g, '/');
          const handleId = new TextDecoder().decode(Uint8Array.from(atob(pad), (c) => c.charCodeAt(0)));
          if (String(pk.uid) !== handleId) {
            return NextResponse.json({ error: 'Identidad no coincide' }, { status: 403 });
          }
        } catch { /* malformed — let verifyAuthenticationResponse fail */ }
      }

      let verification;
      try {
        verification = await verifyAuthenticationResponse({
          response: body,
          expectedChallenge,
          expectedOrigin: finalOrigin,
          expectedRPID: finalRpID,
          credential: {
            id: pk.credential_id,
            publicKey: new Uint8Array(pk.public_key),
            counter: pk.counter,
            transports: pk.transports ?? [],
          },
        });
      } catch {
        return NextResponse.json({ error: 'Verificación fallida' }, { status: 400 });
      }

      if (!verification.verified) {
        return NextResponse.json({ error: 'Verificación fallida' }, { status: 400 });
      }

      await pool.query(
        'UPDATE passkeys SET counter = $1, last_used_at = CURRENT_TIMESTAMP WHERE credential_id = $2',
        [verification.authenticationInfo.newCounter, pk.credential_id]
      );

      const sessionData = {
        id: pk.uid, nombre: pk.nombre, email: pk.email,
        tipo: pk.tipo, avatar: pk.avatar, aprobado: !!pk.aprobado,
      };
      await setSession(sessionData);

      const compRes = await pool.query(
        `SELECT c.id, c.nombre, c.color, c.monto_participacion FROM companies c
         JOIN user_companies uc ON uc.company_id = c.id WHERE uc.user_id = $1`,
        [pk.uid]
      );

      return NextResponse.json({ verified: true, user: { ...sessionData, companies: compRes.rows } });
    }

    return NextResponse.json({ error: 'step inválido' }, { status: 400 });
  } catch (error: any) {
    console.error('WebAuthn authenticate error:', error);
    return NextResponse.json({ error: 'Error de autenticación' }, { status: 500 });
  }
}
