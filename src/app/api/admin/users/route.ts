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
      `SELECT u.id, u.nombre, u.email, u.tipo, u.avatar, u.activo, u.aprobado, u.created_at, u.telefono,
              COALESCE(
                json_agg(json_build_object('id', c.id, 'nombre', c.nombre, 'color', c.color))
                FILTER (WHERE c.id IS NOT NULL), '[]'
              ) AS companies
       FROM users u
       LEFT JOIN user_companies uc ON uc.user_id = u.id
       LEFT JOIN companies c ON c.id = uc.company_id
       GROUP BY u.id
       ORDER BY u.id ASC`
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

    if (action === 'assignCompany') {
      // Toggle: add if not member, remove if already member
      const { userId: targetUserId, companyId, assign } = body;
      if (!targetUserId || !companyId) return NextResponse.json({ error: 'userId y companyId requeridos' }, { status: 400 });
      if (assign) {
        await pool.query('INSERT INTO user_companies (user_id, company_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [targetUserId, companyId]);
      } else {
        await pool.query('DELETE FROM user_companies WHERE user_id = $1 AND company_id = $2', [targetUserId, companyId]);
      }
      return NextResponse.json({ success: true });
    }

    if (action === 'setCompanies') {
      // Replace all companies for a user
      const { userId: targetUserId, companyIds } = body;
      if (!targetUserId) return NextResponse.json({ error: 'userId requerido' }, { status: 400 });
      await pool.query('DELETE FROM user_companies WHERE user_id = $1', [targetUserId]);
      for (const cid of (companyIds || [])) {
        await pool.query('INSERT INTO user_companies (user_id, company_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [targetUserId, cid]);
      }
      return NextResponse.json({ success: true });
    }

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
        INSERT INTO users (nombre, email, password_hash, tipo, avatar, activo, aprobado)
        VALUES ($1, $2, $3, $4, $5, true, true)
        RETURNING id, nombre, email, tipo, avatar, activo, aprobado, created_at
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

    const { userId, activo, tipo, aprobado } = body;

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
          tipo = COALESCE($2, tipo),
          aprobado = COALESCE($3, aprobado)
      WHERE id = $4
      RETURNING id, nombre, email, tipo, avatar, activo, aprobado
    `;

    const res = await pool.query(updateQuery, [
      activo !== undefined ? activo : null,
      tipo || null,
      aprobado !== undefined ? aprobado : null,
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
