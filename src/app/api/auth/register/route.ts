import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db';
import { setSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { nombre, email, password } = await req.json();

    if (!nombre || !email || !password) {
      return NextResponse.json({ error: 'Todos los campos son obligatorios' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 });
    }

    const emailTrim = email.toLowerCase().trim();
    const nombreTrim = nombre.trim();

    // Check if user already exists
    const duplicateCheck = await pool.query('SELECT id FROM users WHERE email = $1', [emailTrim]);
    if (duplicateCheck.rows.length > 0) {
      return NextResponse.json({ error: 'El correo electrónico ya está registrado' }, { status: 409 });
    }

    // Generate standard standard salt and bcrypt hash
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Dynamic avatar seed from Dicebear
    const avatarUrl = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(nombreTrim)}`;

    // Insert user into PostgreSQL (type 'externo' by default, and pending approval)
    const insertRes = await pool.query(
      'INSERT INTO users (nombre, email, password_hash, tipo, avatar, activo, aprobado) VALUES ($1, $2, $3, $4, $5, true, false) RETURNING id, nombre, email, tipo, avatar, aprobado',
      [nombreTrim, emailTrim, passwordHash, 'externo', avatarUrl]
    );

    const newUser = insertRes.rows[0];

    // Trigger PL/pgSQL recalculation so the new user is correctly indexed in the Leaderboard
    await pool.query('SELECT recalculate_leaderboard()');

    // Set cookie session for automatic authentication
    const sessionData = {
      id: newUser.id,
      nombre: newUser.nombre,
      email: newUser.email,
      tipo: newUser.tipo,
      avatar: newUser.avatar,
      aprobado: !!newUser.aprobado
    };

    await setSession(sessionData);

    return NextResponse.json({ success: true, user: sessionData });
  } catch (error: any) {
    console.error('Registration API error:', error);
    return NextResponse.json({ error: 'Error interno del servidor al registrar usuario' }, { status: 500 });
  }
}
