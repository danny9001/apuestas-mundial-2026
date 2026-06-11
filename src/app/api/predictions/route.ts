import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET: fetch predictions
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const matchId = searchParams.get('matchId');

    if (matchId) {
      const res = await pool.query(
        `SELECT p.*, u.nombre, u.avatar, u.tipo
         FROM predictions p
         JOIN users u ON p.user_id = u.id
         WHERE p.match_id = $1
         ORDER BY p.puntos DESC, u.nombre ASC`,
        [parseInt(matchId)]
      );
      const response = NextResponse.json(res.rows);
      response.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
      return response;
    }

    // Retrieve current user predictions joined with match information
    const res = await pool.query(
      `SELECT p.*, m.local, m.visitante, m.fecha, m.estado, m.goles_local, m.goles_visitante, m.fase, m.grupo
       FROM predictions p
       JOIN matches m ON p.match_id = m.id
       WHERE p.user_id = $1`,
      [user.id]
    );

    const response = NextResponse.json(res.rows);
    response.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
    return response;
  } catch (error: any) {
    console.error('Error fetching predictions:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

// POST: save or update prediction(s) (supports single or batch array!)
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (!user.aprobado) {
      return NextResponse.json({ error: 'Tu cuenta está pendiente de aprobación por el administrador para participar.' }, { status: 403 });
    }

    const body = await req.json();

    // Check if the request is a batch array
    if (Array.isArray(body)) {
      const valid = body.filter(
        (i) => i.matchId !== undefined && i.predLocal !== undefined && i.predVisitante !== undefined
      );
      if (valid.length === 0) return NextResponse.json({ success: true, results: [], errors: [] });

      const matchIds = valid.map((i) => i.matchId);
      const now = new Date();

      // 1 query para todos los partidos + 1 query para predicciones existentes (en paralelo)
      const [matchesRes, existingRes] = await Promise.all([
        pool.query(
          `SELECT id, fecha, estado FROM matches WHERE id = ANY($1::int[])`,
          [matchIds]
        ),
        pool.query(
          `SELECT match_id FROM predictions WHERE user_id = $1 AND match_id = ANY($2::int[])`,
          [user.id, matchIds]
        ),
      ]);

      const matchMap = new Map(matchesRes.rows.map((m: { id: number; fecha: string; estado: string }) => [m.id, m]));
      const existingSet = new Set(existingRes.rows.map((r: { match_id: number }) => r.match_id));

      const results = [];
      const errors = [];

      for (const item of valid) {
        const { matchId, predLocal, predVisitante } = item;
        const match = matchMap.get(matchId);
        if (!match) { errors.push({ matchId, error: 'Partido no encontrado' }); continue; }
        // Bets close 1 hour before match starts
        const closeTime = new Date(new Date(match.fecha).getTime() - 60 * 60 * 1000);
        if (match.estado !== 'upcoming' || now >= closeTime) {
          errors.push({ matchId, error: 'Apuestas cerradas (cierran 1 hora antes del partido)' }); continue;
        }
        if (existingSet.has(matchId)) {
          // Allow correction within 3 minutes of original bet
          const existingPred = await pool.query(
            'SELECT id, created_at FROM predictions WHERE user_id = $1 AND match_id = $2',
            [user.id, matchId]
          );
          const minsAgo = existingPred.rows.length > 0
            ? (now.getTime() - new Date(existingPred.rows[0].created_at).getTime()) / 60000
            : Infinity;
          if (minsAgo > 3) {
            errors.push({ matchId, error: 'El período de corrección (3 min) ha vencido.' }); continue;
          }
          const upd = await pool.query(
            'UPDATE predictions SET pred_local = $1, pred_visitante = $2 WHERE user_id = $3 AND match_id = $4 RETURNING *',
            [parseInt(predLocal), parseInt(predVisitante), user.id, matchId]
          );
          results.push({ ...upd.rows[0], corrected: true });
          continue;
        }

        const res = await pool.query(
          `INSERT INTO predictions (user_id, match_id, pred_local, pred_visitante) VALUES ($1, $2, $3, $4) RETURNING *`,
          [user.id, matchId, parseInt(predLocal), parseInt(predVisitante)]
        );
        results.push(res.rows[0]);
      }

      return NextResponse.json({ success: true, results, errors });
    }

    // Otherwise, handle standard single prediction
    const { matchId, predLocal, predVisitante } = body;

    if (matchId === undefined || predLocal === undefined || predVisitante === undefined) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 });
    }

    const now = new Date();
    const matchRes = await pool.query(
      'SELECT fecha, estado FROM matches WHERE id = $1',
      [matchId]
    );

    if (matchRes.rows.length === 0) {
      return NextResponse.json({ error: 'Partido no encontrado' }, { status: 404 });
    }

    const match = matchRes.rows[0];
    const matchTime = new Date(match.fecha);

    // Bets close 1 hour before match starts
    const closeTime = new Date(matchTime.getTime() - 60 * 60 * 1000);
    if (match.estado !== 'upcoming' || now >= closeTime) {
      return NextResponse.json(
        { error: 'Apuestas cerradas. Los pronósticos se cierran 1 hora antes del inicio.' },
        { status: 400 }
      );
    }

    // Check if prediction already exists for this user and match
    const existingPredRes = await pool.query(
      'SELECT id, created_at FROM predictions WHERE user_id = $1 AND match_id = $2',
      [user.id, matchId]
    );

    if (existingPredRes.rows.length > 0) {
      const minsAgo = (now.getTime() - new Date(existingPredRes.rows[0].created_at).getTime()) / 60000;
      if (minsAgo > 3) {
        return NextResponse.json(
          { error: 'El período de corrección (3 min) ha vencido. No se puede modificar la apuesta.' },
          { status: 400 }
        );
      }
      const upd = await pool.query(
        'UPDATE predictions SET pred_local = $1, pred_visitante = $2 WHERE user_id = $3 AND match_id = $4 RETURNING *',
        [parseInt(predLocal), parseInt(predVisitante), user.id, matchId]
      );
      return NextResponse.json({ success: true, prediction: upd.rows[0], corrected: true });
    }


    const insertQuery = `
      INSERT INTO predictions (user_id, match_id, pred_local, pred_visitante)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const res = await pool.query(insertQuery, [
      user.id,
      matchId,
      parseInt(predLocal),
      parseInt(predVisitante)
    ]);

    return NextResponse.json({ success: true, prediction: res.rows[0] });
  } catch (error: any) {
    console.error('Error saving predictions:', error);
    return NextResponse.json({ error: 'Error del servidor: ' + error.message }, { status: 500 });
  }
}
