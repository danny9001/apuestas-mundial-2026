import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET: fetch global leaderboard ranking
export async function GET() {
  try {
    const res = await pool.query(
      `SELECT
         u.id as user_id,
         u.nombre,
         u.email,
         u.tipo,
         u.avatar,
         u.activo,
         COALESCE(l.puntos_totales, 0) as puntos_totales,
         COALESCE(l.exactos, 0) as exactos,
         COALESCE(l.posicion, 9999) as posicion,
         COALESCE(l.posicion_anterior, 9999) as posicion_anterior,
         COALESCE(l.tendencia, 'same') as tendencia
       FROM users u
       LEFT JOIN leaderboard l ON u.id = l.user_id
       WHERE u.activo = true
       ORDER BY COALESCE(l.posicion, 9999) ASC, u.nombre ASC`
    );

    const response = NextResponse.json(res.rows);
    response.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
    return response;
  } catch (error: any) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
