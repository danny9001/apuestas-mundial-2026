import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

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
         u.participa,
         u.tincaso,
         COALESCE(l.puntos_totales, 0) as puntos_totales,
         COALESCE(l.exactos, 0) as exactos,
         COALESCE(
           (SELECT COUNT(*) FROM predictions p WHERE p.user_id = u.id),
           0
         ) as total_predicciones
       FROM users u
       LEFT JOIN leaderboard l ON u.id = l.user_id
       WHERE u.activo = true
         AND u.aprobado = true
         AND u.participa = false
         AND u.tipo != 'admin'
         AND u.tipo != 'superadmin'
       ORDER BY COALESCE(l.puntos_totales, 0) DESC, u.nombre ASC`
    );

    const response = NextResponse.json(res.rows);
    response.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
    return response;
  } catch (error: unknown) {
    console.error('Error fetching visor leaderboard:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
