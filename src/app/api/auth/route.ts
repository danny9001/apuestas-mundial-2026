import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db';
import { getSessionUser, setSession, clearSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET: check current session user
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true, user });
}

// POST: login
export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Falta email o contraseña' }, { status: 400 });
    }

    // Fetch user
    const res = await pool.query(
      'SELECT id, nombre, email, password_hash, tipo, avatar, activo FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    const user = res.rows[0];

    if (!user.activo) {
      return NextResponse.json({ error: 'Usuario desactivado por el administrador' }, { status: 403 });
    }

    // Verify password using bcryptjs
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    // Set cookie session
    const sessionData = {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      tipo: user.tipo,
      avatar: user.avatar
    };

    await setSession(sessionData);

    return NextResponse.json({ success: true, user: sessionData });
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
