import { NextRequest, NextResponse } from 'next/server';
import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import pool from '@/lib/db';
import { setSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const rpID = process.env.WEBAUTHN_RP_ID || 'localhost';
const origin = process.env.WEBAUTHN_ORIGIN || 'http://localhost:3000';

// Per-session challenge store (email → challenge)
const challengeStore = new Map<string, string>();

// POST /api/auth/webauthn/authenticate?step=options|verify
export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const step = searchParams.get('step');

    if (step === 'options') {
      const { email } = await req.json();
      if (!email) return NextResponse.json({ error: 'Email requerido' }, { status: 400 });

      // Find user's passkeys
      const userRes = await pool.query(
        'SELECT u.id, u.nombre, u.email, u.tipo, u.avatar, u.activo FROM users u WHERE u.email = $1',
        [email.toLowerCase().trim()]
      );
      if (userRes.rows.length === 0) {
        return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
      }
      const user = userRes.rows[0];
      if (!user.activo) {
        return NextResponse.json({ error: 'Usuario desactivado' }, { status: 403 });
      }

      const passkeysRes = await pool.query(
        'SELECT credential_id, transports FROM passkeys WHERE user_id = $1',
        [user.id]
      );

      const allowCredentials = passkeysRes.rows.map((r) => ({
        id: r.credential_id,
        type: 'public-key' as const,
        transports: r.transports ?? [],
      }));

      const options = await generateAuthenticationOptions({
        rpID,
        userVerification: 'preferred',
        allowCredentials,
      });

      challengeStore.set(email.toLowerCase(), options.challenge);
      return NextResponse.json(options);
    }

    if (step === 'verify') {
      const body = await req.json();
      const { email } = body;
      if (!email) return NextResponse.json({ error: 'Email requerido' }, { status: 400 });

      const expectedChallenge = challengeStore.get(email.toLowerCase());
      if (!expectedChallenge) {
        return NextResponse.json({ error: 'Challenge expirado' }, { status: 400 });
      }

      // Find the passkey
      const pkRes = await pool.query(
        `SELECT pk.*, u.id as uid, u.nombre, u.email, u.tipo, u.avatar, u.activo
         FROM passkeys pk
         JOIN users u ON pk.user_id = u.id
         WHERE pk.credential_id = $1`,
        [body.id]
      );
      if (pkRes.rows.length === 0) {
        return NextResponse.json({ error: 'Passkey no registrada' }, { status: 404 });
      }

      const pk = pkRes.rows[0];

      let verification;
      try {
        verification = await verifyAuthenticationResponse({
          response: body,
          expectedChallenge,
          expectedOrigin: origin,
          expectedRPID: rpID,
          credential: {
            id: pk.credential_id,
            publicKey: new Uint8Array(pk.public_key),
            counter: pk.counter,
            transports: pk.transports ?? [],
          },
        });
      } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }

      if (!verification.verified) {
        return NextResponse.json({ error: 'Verificación fallida' }, { status: 400 });
      }

      challengeStore.delete(email.toLowerCase());

      // Update counter
      await pool.query(
        'UPDATE passkeys SET counter = $1, last_used_at = CURRENT_TIMESTAMP WHERE credential_id = $2',
        [verification.authenticationInfo.newCounter, pk.credential_id]
      );

      // Create session
      const sessionData = {
        id: pk.uid,
        nombre: pk.nombre,
        email: pk.email,
        tipo: pk.tipo,
        avatar: pk.avatar,
      };
      await setSession(sessionData);

      return NextResponse.json({ verified: true, user: sessionData });
    }

    return NextResponse.json({ error: 'step inválido' }, { status: 400 });
  } catch (error: any) {
    console.error('WebAuthn authenticate error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
