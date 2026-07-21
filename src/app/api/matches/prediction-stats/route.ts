import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || !user.aprobado) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const matchId = parseInt(searchParams.get('matchId') || '0');
    if (!matchId) return NextResponse.json({ error: 'matchId requerido' }, { status: 400 });

    // Check if betting is closed for this match
    const matchRes = await pool.query(
      "SELECT estado, fecha FROM matches WHERE id = $1",
      [matchId]
    );
    if (matchRes.rows.length === 0) {
      return NextResponse.json({ error: 'Partido no encontrado' }, { status: 404 });
    }
    const match = matchRes.rows[0];

    const closeSettingRes = await pool.query(
      "SELECT value FROM settings WHERE key = 'prediction_close_minutes'"
    );
    const closeMinutes = closeSettingRes.rows.length > 0
      ? parseInt(closeSettingRes.rows[0].value, 10) || 15
      : 15;

    const matchDate = new Date(match.fecha).getTime();
    const isClosed = match.estado !== 'upcoming' ||
      Date.now() >= matchDate - closeMinutes * 60 * 1000;

    // Aggregate predictions
    const statsRes = await pool.query(
      `SELECT pred_local, pred_visitante, COUNT(*) AS cnt
       FROM predictions
       WHERE match_id = $1
       GROUP BY pred_local, pred_visitante
       ORDER BY cnt DESC`,
      [matchId]
    );

    const rows = statsRes.rows;
    const total = rows.reduce((s: number, r: any) => s + parseInt(r.cnt), 0);

    if (total === 0) {
      return NextResponse.json({ matchId, total: 0, isClosed, trend: null, topScores: [] });
    }

    // Win / draw / lose tendency
    let localWins = 0, draws = 0, visitanteWins = 0;
    for (const r of rows) {
      const cnt = parseInt(r.cnt);
      if (r.pred_local > r.pred_visitante) localWins += cnt;
      else if (r.pred_local === r.pred_visitante) draws += cnt;
      else visitanteWins += cnt;
    }

    const trend = {
      local: parseFloat(((localWins / total) * 100).toFixed(1)),
      empate: parseFloat(((draws / total) * 100).toFixed(1)),
      visitante: parseFloat(((visitanteWins / total) * 100).toFixed(1)),
    };

    // Top 7 scores — only reveal exact scores after betting is closed
    const topScores = isClosed
      ? rows.slice(0, 7).map((r: any) => ({
          pred_local: r.pred_local,
          pred_visitante: r.pred_visitante,
          count: parseInt(r.cnt),
          pct: parseFloat(((parseInt(r.cnt) / total) * 100).toFixed(1)),
        }))
      : [];

    let userPredictions: any[] = [];
    if (isClosed) {
      let query = `
        SELECT 
          u.id as user_id,
          u.nombre,
          u.avatar,
          c.nombre as empresa_nombre,
          p.pred_local,
          p.pred_visitante,
          p.puntos
        FROM predictions p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN user_companies uc ON uc.user_id = u.id
        LEFT JOIN companies c ON c.id = uc.company_id
        WHERE p.match_id = $1 
          AND u.activo = true 
          AND u.participa IS NOT FALSE
      `;
      const params: any[] = [matchId];
      if (user.tipo !== 'superadmin') {
        query += ` AND uc.company_id IN (SELECT company_id FROM user_companies WHERE user_id = $2)`;
        params.push(user.id);
      }
      query += ` ORDER BY u.nombre ASC`;
      const predsRes = await pool.query(query, params);
      userPredictions = predsRes.rows;
    }

    const response = NextResponse.json({ matchId, total, isClosed, trend, topScores, userPredictions });
    response.headers.set('Cache-Control', 'no-store, max-age=0');
    return response;
  } catch (error: unknown) {
    console.error('Error fetching prediction stats:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
