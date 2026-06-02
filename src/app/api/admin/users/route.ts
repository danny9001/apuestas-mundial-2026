import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET: fetch all users for management
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user || user.tipo !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const res = await pool.query(
      'SELECT id, nombre, email, tipo, avatar, activo, created_at FROM users ORDER BY id ASC'
    );
    return NextResponse.json(res.rows);
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

// POST: update user status (activate/deactivate or change role)
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.tipo !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await req.json();
    const { action } = body;

    if (action === 'create') {
      const { nombre, email, password, tipo } = body;
      if (!nombre || !email || !password) {
        return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
      }

      // Check if email already exists
      const checkRes = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
      if (checkRes.rows.length > 0) {
        return NextResponse.json({ error: 'El correo electrónico ya está registrado' }, { status: 400 });
      }

      const bcrypt = await import('bcryptjs');
      const passwordHash = await bcrypt.hash(password, 10);
      const defaultAvatar = `/uploads/avatars/avatar_${Math.floor(Math.random() * 5) + 1}.png`; // seed random default avatar

      const insertQuery = `
        INSERT INTO users (nombre, email, password_hash, tipo, avatar, activo)
        VALUES ($1, $2, $3, $4, $5, true)
        RETURNING id, nombre, email, tipo, avatar, activo, created_at
      `;

      const res = await pool.query(insertQuery, [
        nombre.trim(),
        email.toLowerCase().trim(),
        passwordHash,
        tipo || 'user',
        defaultAvatar
      ]);

      return NextResponse.json({ success: true, user: res.rows[0] });
    }

    const { userId, activo, tipo } = body;

    if (userId === undefined) {
      return NextResponse.json({ error: 'Falta ID de usuario' }, { status: 400 });
    }

    // Don't allow admins to deactivate themselves
    if (parseInt(userId) === user.id) {
      return NextResponse.json({ error: 'No puedes desactivarte a ti mismo' }, { status: 400 });
    }

    const updateQuery = `
      UPDATE users 
      SET activo = COALESCE($1, activo),
          tipo = COALESCE($2, tipo)
      WHERE id = $3
      RETURNING id, nombre, email, tipo, avatar, activo
    `;

    const res = await pool.query(updateQuery, [
      activo !== undefined ? activo : null,
      tipo || null,
      userId
    ]);

    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ success: true, user: res.rows[0] });
  } catch (error: any) {
    console.error('Error updating user status:', error);
    return NextResponse.json({ error: 'Error del servidor: ' + error.message }, { status: 500 });
  }
}
