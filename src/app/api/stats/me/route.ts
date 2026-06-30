import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const res = await pool.query(`
      SELECT
        COUNT(p.id) as total,
        COALESCE(SUM(CASE WHEN p.puntos = 3 THEN 1 ELSE 0 END), 0) as exactos,
        COALESCE(SUM(CASE WHEN p.puntos = 1 THEN 1 ELSE 0 END), 0) as aciertos,
        COALESCE(SUM(CASE WHEN p.puntos = 0 THEN 1 ELSE 0 END), 0) as fallos,
        COALESCE(SUM(p.puntos), 0) as puntos_totales
      FROM predictions p
      JOIN matches m ON p.match_id = m.id
      WHERE p.user_id = $1 AND m.estado = 'finished'
    `, [user.id]);

    const s = res.rows[0];
    const total = parseInt(s.total) || 0;

    return NextResponse.json({
      total,
      exactos: parseInt(s.exactos) || 0,
      aciertos: parseInt(s.aciertos) || 0,
      fallos: parseInt(s.fallos) || 0,
      puntos_totales: parseInt(s.puntos_totales) || 0,
      pct_exacto: total > 0 ? Math.round((parseInt(s.exactos) / total) * 100) : 0,
      pct_acierto: total > 0 ? Math.round((parseInt(s.aciertos) / total) * 100) : 0,
      pct_fallo: total > 0 ? Math.round((parseInt(s.fallos) / total) * 100) : 0
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
