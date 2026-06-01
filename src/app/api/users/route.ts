import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET: list all active users (public info only — visible to all authenticated users)
export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const res = await pool.query(
      `SELECT
         u.id,
         u.nombre,
         u.tipo,
         u.avatar,
         u.created_at,
         COALESCE(l.puntos_totales, 0) as puntos_totales,
         COALESCE(l.exactos, 0) as exactos,
         COALESCE(l.posicion, 9999) as posicion
       FROM users u
       LEFT JOIN leaderboard l ON u.id = l.user_id
       WHERE u.activo = true
       ORDER BY COALESCE(l.posicion, 9999) ASC, u.nombre ASC`
    );

    return NextResponse.json(res.rows);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
