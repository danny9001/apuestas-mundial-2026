import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

async function ensureGroupsTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS groups (
      id SERIAL PRIMARY KEY,
      nombre VARCHAR(255) NOT NULL,
      descripcion TEXT,
      color VARCHAR(20) DEFAULT '#10b981',
      activo BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_groups (
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
      PRIMARY KEY (user_id, group_id)
    );
  `);
}

export async function GET() {
  try {
    await ensureGroupsTables();

    const [groupsRes, countsRes] = await Promise.all([
      pool.query('SELECT id, nombre, descripcion, color, activo, created_at FROM groups ORDER BY nombre ASC'),
      pool.query('SELECT group_id, COUNT(*)::int AS member_count FROM user_groups GROUP BY group_id'),
    ]);

    const countMap: Record<number, number> = {};
    for (const row of countsRes.rows) countMap[row.group_id] = row.member_count;

    const groups = groupsRes.rows.map((g) => ({ ...g, member_count: countMap[g.id] || 0 }));

    const response = NextResponse.json(groups);
    response.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
    return response;
  } catch (error: any) {
    console.error('Error fetching groups:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.tipo !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    await ensureGroupsTables();

    const body = await req.json();
    const { action } = body;

    if (action === 'create') {
      const { nombre, descripcion, color } = body;
      if (!nombre?.trim()) return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 });
      const res = await pool.query(
        `INSERT INTO groups (nombre, descripcion, color) VALUES ($1, $2, $3) RETURNING *`,
        [nombre.trim(), descripcion || null, color || '#10b981']
      );
      return NextResponse.json({ success: true, group: res.rows[0] });
    }

    if (action === 'update') {
      const { id, nombre, descripcion, color, activo } = body;
      if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
      const res = await pool.query(
        `UPDATE groups SET
          nombre = COALESCE($1, nombre),
          descripcion = COALESCE($2, descripcion),
          color = COALESCE($3, color),
          activo = COALESCE($4, activo)
        WHERE id = $5 RETURNING *`,
        [nombre || null, descripcion || null, color || null, activo ?? null, id]
      );
      if (res.rows.length === 0) return NextResponse.json({ error: 'Grupo no encontrado' }, { status: 404 });
      return NextResponse.json({ success: true, group: res.rows[0] });
    }

    if (action === 'delete') {
      const { id } = body;
      if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
      await pool.query('DELETE FROM groups WHERE id = $1', [id]);
      return NextResponse.json({ success: true });
    }

    if (action === 'addUser') {
      const { groupId, userId } = body;
      await pool.query(
        'INSERT INTO user_groups (user_id, group_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [userId, groupId]
      );
      return NextResponse.json({ success: true });
    }

    if (action === 'removeUser') {
      const { groupId, userId } = body;
      await pool.query('DELETE FROM user_groups WHERE user_id = $1 AND group_id = $2', [userId, groupId]);
      return NextResponse.json({ success: true });
    }

    if (action === 'members') {
      const { groupId } = body;
      if (!groupId) return NextResponse.json({ error: 'groupId requerido' }, { status: 400 });
      const res = await pool.query(
        `SELECT u.id, u.nombre, u.email, u.avatar, u.tipo, u.activo,
                u.company_id, c.nombre AS company_nombre, c.color AS company_color
         FROM user_groups ug
         JOIN users u ON u.id = ug.user_id
         LEFT JOIN companies c ON c.id = u.company_id
         WHERE ug.group_id = $1
         ORDER BY u.nombre ASC`,
        [groupId]
      );
      return NextResponse.json(res.rows);
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (error: any) {
    console.error('Error managing group:', error);
    return NextResponse.json({ error: 'Error del servidor: ' + error.message }, { status: 500 });
  }
}
