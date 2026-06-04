import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db';
import { getSessionUser, setSession, clearSession } from '@/lib/auth';
import { isValidEmail, DUMMY_BCRYPT_HASH } from '@/lib/validation';

export const dynamic = 'force-dynamic';

// GET: check current session user
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    const response = NextResponse.json({ authenticated: false }, { status: 401 });
    response.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
    return response;
  }

  // Fetch companies for this user
  const compRes = await pool.query(
    `SELECT c.id, c.nombre, c.color, c.monto_participacion FROM companies c
     JOIN user_companies uc ON uc.company_id = c.id
     WHERE uc.user_id = $1`,
    [user.id]
  );

  const userWithCompanies = {
    ...user,
    companies: compRes.rows
  };

  const response = NextResponse.json({ authenticated: true, user: userWithCompanies });
  response.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
  return response;
}

// POST: login
export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Falta email o contraseña' }, { status: 400 });
    }

    const emailNorm = (email as string).toLowerCase().trim();
    if (!isValidEmail(emailNorm)) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    // Fetch user
    const res = await pool.query(
      'SELECT id, nombre, email, password_hash, tipo, avatar, activo, aprobado FROM users WHERE email = $1',
      [emailNorm]
    );

    // Always run bcrypt to prevent user-enumeration via timing
    const hash = res.rows[0]?.password_hash ?? DUMMY_BCRYPT_HASH;
    const passwordMatch = await bcrypt.compare(password as string, hash);

    if (res.rows.length === 0 || !passwordMatch) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    const user = res.rows[0];

    if (!user.activo) {
      return NextResponse.json({ error: 'Usuario desactivado por el administrador' }, { status: 403 });
    }

    // Set cookie session
    const sessionData = {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      tipo: user.tipo,
      avatar: user.avatar,
      aprobado: !!user.aprobado
    };

    await setSession(sessionData);

    // Fetch companies for this user
    const compRes = await pool.query(
      `SELECT c.id, c.nombre, c.color, c.monto_participacion FROM companies c
       JOIN user_companies uc ON uc.company_id = c.id
       WHERE uc.user_id = $1`,
      [user.id]
    );

    const userWithCompanies = {
      ...sessionData,
      companies: compRes.rows
    };

    return NextResponse.json({ success: true, user: userWithCompanies });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

// DELETE: logout
export async function DELETE() {
  await clearSession();
  return NextResponse.json({ success: true, message: 'Sesión cerrada correctamente' });
}
