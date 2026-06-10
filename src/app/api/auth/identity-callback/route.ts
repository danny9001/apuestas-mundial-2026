import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import pool from '@/lib/db';
import { setSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface IdentityToken {
  sub: string;
  email: string;
  name: string;
  image?: string;
  role: string;
  accountType?: string;
  empresas: {
    id: string;
    slug: string;
    nombre: string;
    tipo: string;
    apps: Record<string, { rol: string; activa: boolean; vence: string | null }>;
  }[];
}

const VALID_MUNDIAL_TIPOS = ['superadmin', 'admin', 'interno', 'externo'];

function getIdentitySecret(): string {
  const s = process.env.IDENTITY_JWT_SECRET;
  if (!s) throw new Error('IDENTITY_JWT_SECRET no configurado');
  return s;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token      = searchParams.get('token');
    const redirectTo = searchParams.get('redirect') ?? '/';

    if (!token) {
      return NextResponse.redirect(new URL('/?error=no_token', req.url));
    }

    let payload: IdentityToken;
    try {
      payload = jwt.verify(token, getIdentitySecret()) as IdentityToken;
    } catch {
      return NextResponse.redirect(new URL('/?error=invalid_token', req.url));
    }

    // Determinar tipo en mundial desde el JWT
    let tipoMundial: string;

    if (payload.role === 'superadmin') {
      tipoMundial = 'superadmin';
    } else {
      // Usar appRoles['mundial'] desde el JWT si está disponible
      const mundialApp = payload.empresas
        ?.flatMap((e) => Object.entries(e.apps))
        .find(([slug]) => slug === 'mundial');
      const rolFromJwt = mundialApp?.[1]?.rol;

      if (rolFromJwt && VALID_MUNDIAL_TIPOS.includes(rolFromJwt)) {
        tipoMundial = rolFromJwt;
      } else if (payload.accountType === 'EXTERNAL' || payload.accountType === 'CLIENT') {
        tipoMundial = 'externo';
      } else if (payload.role === 'admin') {
        tipoMundial = 'admin';
      } else {
        tipoMundial = 'interno';
      }
    }

    // Upsert user — nunca degradar un superadmin/admin ya existente
    const result = await pool.query(
      `INSERT INTO users (nombre, email, tipo, avatar, activo, aprobado)
       VALUES ($1, $2, $3, $4, true, true)
       ON CONFLICT (email) DO UPDATE
         SET nombre   = EXCLUDED.nombre,
             tipo     = CASE
                          WHEN users.tipo IN ('superadmin','admin') AND EXCLUDED.tipo NOT IN ('superadmin','admin')
                          THEN users.tipo
                          ELSE EXCLUDED.tipo
                        END,
             avatar   = COALESCE(EXCLUDED.avatar, users.avatar),
             activo   = true,
             aprobado = true
       RETURNING id, nombre, email, tipo, avatar`,
      [payload.name, payload.email.toLowerCase(), tipoMundial, payload.image ?? null]
    );

    const user = result.rows[0];
    await setSession({
      id:     user.id,
      nombre: user.nombre,
      email:  user.email,
      tipo:   user.tipo,
      avatar: user.avatar ?? '',
    });

    const base = process.env.APP_BASE_URL ?? 'http://localhost:3002';
    const dest = redirectTo.startsWith('http') ? redirectTo : `${base}${redirectTo}`;
    return NextResponse.redirect(dest);
  } catch (err) {
    console.error('identity-callback error:', err);
    return NextResponse.redirect(new URL('/?error=sso_failed', req.url));
  }
}
