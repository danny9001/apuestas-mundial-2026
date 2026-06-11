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
         COALESCE(
           json_agg(json_build_object('id', c.id, 'nombre', c.nombre, 'color', c.color, 'monto_participacion', c.monto_participacion))
           FILTER (WHERE c.id IS NOT NULL), '[]'
         ) AS companies,
         COALESCE(l.puntos_totales, 0) as puntos_totales,
         COALESCE(l.exactos, 0) as exactos,
         COALESCE(l.posicion, 9999) as posicion,
         COALESCE(l.posicion_anterior, 9999) as posicion_anterior,
         COALESCE(l.tendencia, 'same') as tendencia
       FROM users u
       LEFT JOIN leaderboard l ON u.id = l.user_id
       LEFT JOIN user_companies uc ON uc.user_id = u.id
       LEFT JOIN companies c ON c.id = uc.company_id
       WHERE u.activo = true
         AND u.participa = true
         AND (u.tipo != 'superadmin' OR EXISTS (SELECT 1 FROM user_companies WHERE user_id = u.id))
       GROUP BY u.id, l.puntos_totales, l.exactos, l.posicion, l.posicion_anterior, l.tendencia
       ORDER BY COALESCE(l.posicion, 9999) ASC, u.nombre ASC`
    );

    const response = NextResponse.json(res.rows);
    response.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
    return response;
  } catch (error: unknown) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
