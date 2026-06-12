import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.tipo !== 'superadmin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId || isNaN(parseInt(userId))) {
      return NextResponse.json({ error: 'Falta parámetro userId válido' }, { status: 400 });
    }

    const res = await pool.query(
      `SELECT
        p.id,
        p.pred_local,
        p.pred_visitante,
        p.puntos,
        p.created_at,
        m.id   AS match_id,
        m.local,
        m.visitante,
        m.fecha,
        m.estado,
        m.fase,
        m.grupo,
        m.goles_local,
        m.goles_visitante
       FROM predictions p
       JOIN matches m ON p.match_id = m.id
       WHERE p.user_id = $1
       ORDER BY m.fecha ASC`,
      [parseInt(userId)]
    );

    const response = NextResponse.json(res.rows);
    response.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
    return response;
  } catch (error: any) {
    console.error('Error fetching user predictions:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
