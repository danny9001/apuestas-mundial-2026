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

    const { userId, activo, tipo } = await req.json();

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
