import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db';
import { getSessionUser, setSession, clearSession } from '@/lib/auth';
import { isValidEmail, validatePassword, sanitizeText, DUMMY_BCRYPT_HASH } from '@/lib/validation';

export const dynamic = 'force-dynamic';

// GET: check current session user
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    const response = NextResponse.json({ authenticated: false }, { status: 401 });
    response.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
    return response;
  }

  const compRes = await pool.query(
    `SELECT c.id, c.nombre, c.color, c.monto_participacion FROM companies c
     JOIN user_companies uc ON uc.company_id = c.id
     WHERE uc.user_id = $1`,
    [user.id]
  );

  const response = NextResponse.json({
    authenticated: true,
    user: { ...user, companies: compRes.rows },
  });
  response.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
  return response;
}

// POST: login local con email + password
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Cuerpo de solicitud inválido' }, { status: 400 });

    const email = typeof body.email === 'string' ? body.email.toLowerCase().trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!isValidEmail(email) || !password) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 400 });
    }

    const res = await pool.query(
      'SELECT id, nombre, email, password_hash, tipo, avatar, activo, aprobado, denegado FROM users WHERE email = $1',
      [email]
    );

    const user = res.rows[0];

    // Constant-time comparison even if user doesn't exist
    const hashToCompare = user?.password_hash ?? DUMMY_BCRYPT_HASH;
    const match = user?.password_hash === 'SSO_IDENTITY' ? false : await bcrypt.compare(password, hashToCompare);

    if (!user || !match) {
      if (user?.password_hash === 'SSO_IDENTITY') {
        return NextResponse.json({
          error: 'Esta cuenta fue creada con ElitePass Identity. Usá el botón "Ingresar con ElitePass Identity".',
          sso: true,
        }, { status: 401 });
      }
      return NextResponse.json({ error: 'Correo o contraseña incorrectos' }, { status: 401 });
    }

    if (!user.activo) {
      return NextResponse.json({ error: 'Tu cuenta ha sido desactivada' }, { status: 403 });
    }

    if (user.denegado) {
      return NextResponse.json({ error: 'Tu solicitud de acceso fue rechazada' }, { status: 403 });
    }

    if (!user.aprobado) {
      return NextResponse.json(
        { error: 'Tu cuenta está pendiente de aprobación por el administrador' },
        { status: 403 }
      );
    }

    await setSession({
      id:     user.id,
      nombre: user.nombre,
      email:  user.email,
      tipo:   user.tipo,
      avatar: user.avatar ?? '',
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// DELETE: logout
export async function DELETE() {
  await clearSession();
  return NextResponse.json({ success: true, message: 'Sesión cerrada correctamente' });
}
