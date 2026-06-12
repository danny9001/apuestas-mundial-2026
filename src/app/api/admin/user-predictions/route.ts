import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || (user.tipo !== 'superadmin' && user.tipo !== 'admin')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId || isNaN(parseInt(userId))) {
      return NextResponse.json({ error: 'Falta parámetro userId válido' }, { status: 400 });
    }

    if (user.tipo === 'admin') {
      const checkRes = await pool.query(
        `SELECT 1 FROM user_companies uc1
         JOIN user_companies uc2 ON uc1.company_id = uc2.company_id
         WHERE uc1.user_id = $1 AND uc2.user_id = $2`,
        [user.id, parseInt(userId)]
      );
      if (checkRes.rows.length === 0) {
        return NextResponse.json({ error: 'No autorizado para ver este usuario' }, { status: 403 });
      }
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
       FROM matches m
       LEFT JOIN predictions p ON p.match_id = m.id AND p.user_id = $1
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
