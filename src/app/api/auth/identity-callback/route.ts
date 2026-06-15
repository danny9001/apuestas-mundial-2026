import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import pool from '@/lib/db';
import { setSession } from '@/lib/auth';
import { syncCompanyAssignment } from '@/lib/identity-sync';

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

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://mundial.genial-it.net').replace(/\/$/, '');
}

export async function GET(req: NextRequest) {
  const base = siteUrl();

  try {
    const { searchParams } = new URL(req.url);
    const token       = searchParams.get('token');
    const redirectTo  = searchParams.get('redirect') ?? '/';
    const inviteToken = searchParams.get('invite_token');

    if (!token) return NextResponse.redirect(`${base}/?error=no_token`);

    let payload: IdentityToken;
    try {
      payload = jwt.verify(token, getIdentitySecret()) as IdentityToken;
    } catch {
      return NextResponse.redirect(`${base}/?error=invalid_token`);
    }

    // Determine tipo in mundial from JWT
    let tipoMundial: string;
    if (payload.role === 'superadmin') {
      tipoMundial = 'superadmin';
    } else {
      const mundialApp = payload.empresas
        ?.flatMap((e) => Object.entries(e.apps ?? {}))
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

    // Upsert user in mundial DB
    const result = await pool.query(
      `INSERT INTO users (nombre, email, tipo, avatar, activo, aprobado, password_hash)
       VALUES ($1, $2, $3, $4, true, true, 'SSO_IDENTITY')
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

    // Consume invitation if provided — assigns user to company
    if (inviteToken) {
      try {
        const inv = await pool.query(
          'SELECT id, company_id, expires_at FROM invitations WHERE token = $1',
          [inviteToken]
        );
        if (inv.rows.length > 0) {
          const invitation = inv.rows[0];
          if (new Date(invitation.expires_at) >= new Date()) {
            if (invitation.company_id) {
              await pool.query(
                'INSERT INTO user_companies (user_id, company_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                [user.id, invitation.company_id]
              );
              // Sync to Identity
              const compRes = await pool.query('SELECT nombre FROM companies WHERE id = $1', [invitation.company_id]);
              if (compRes.rows.length > 0) {
                syncCompanyAssignment(user.email, compRes.rows[0].nombre, user.tipo).catch(() => {});
              }
            }
            await pool.query(
              'UPDATE invitations SET email_usado = $1 WHERE id = $2',
              [user.email.toLowerCase(), invitation.id]
            );
          }
        }
      } catch (err) {
        console.error('invite_token processing error:', err);
      }
    }

    // Sync companies from Identity JWT into mundial
    if (payload.empresas?.length) {
      for (const empresa of payload.empresas) {
        const mundialRol = empresa.apps?.['mundial']?.rol;
        if (mundialRol && empresa.nombre) {
          const compRes = await pool.query(
            'SELECT id FROM companies WHERE lower(nombre) = lower($1)',
            [empresa.nombre]
          );
          if (compRes.rows.length > 0) {
            await pool.query(
              'INSERT INTO user_companies (user_id, company_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
              [user.id, compRes.rows[0].id]
            );
          }
        }
      }
    }

    // Generar JWT sin establecer cookie aún
    const sessionToken = jwt.sign(
      { id: user.id, email: user.email, tipo: user.tipo },
      process.env.JWT_SECRET!,
      { expiresIn: 604800 }
    );
    console.log('Generated sessionToken for:', user.email, 'length:', sessionToken.length);

    let safeRedirect = '/';
    if (redirectTo.startsWith('/') && !redirectTo.startsWith('//')) {
      safeRedirect = redirectTo;
    }
    const dest = safeRedirect;

    // Usar JavaScript para hacer POST automático
    // Esto evita problemas de NextResponse.redirect() con cookies
    const htmlForm = `
      <!DOCTYPE html>
      <html>
        <head><title>Iniciando sesión...</title></head>
        <body style="margin:0; padding:0; background:#f5f5f5;">
          <script>
            (async () => {
              try {
                const res = await fetch('/api/auth/sso-complete', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    token: ${JSON.stringify(sessionToken)},
                    redirect: ${JSON.stringify(dest)}
                  }),
                  credentials: 'include'
                });
                const data = await res.json();
                if (data.success && data.redirect) {
                  window.location.href = data.redirect;
                } else {
                  window.location.href = '/?error=sso_failed';
                }
              } catch (err) {
                window.location.href = '/?error=sso_failed';
              }
            })();
          </script>
          <div style="display:flex; align-items:center; justify-content:center; height:100vh; font-family:sans-serif; color:#666;">
            <div style="text-align:center;">
              <div style="font-size:18px; margin-bottom:20px;">Iniciando sesión...</div>
              <div style="width:40px; height:40px; border:4px solid #f3f3f3; border-top:4px solid #3498db; border-radius:50%; margin:0 auto; animation:spin 1s linear infinite;"></div>
              <style>@keyframes spin { 0% { transform:rotate(0deg); } 100% { transform:rotate(360deg); } }</style>
            </div>
          </div>
        </body>
      </html>
    `;

    return new NextResponse(htmlForm, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8; charset=utf-8' },
    });
  } catch (err) {
    console.error('identity-callback error:', err);
    return NextResponse.redirect(`${base}/?error=sso_failed`);
  }
}
