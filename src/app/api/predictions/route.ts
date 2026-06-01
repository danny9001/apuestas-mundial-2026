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
      // Fetch all predictions for this specific match (community review)
      const res = await pool.query(
        `SELECT p.*, u.nombre, u.avatar, u.tipo
         FROM predictions p
         JOIN users u ON p.user_id = u.id
         WHERE p.match_id = $1
         ORDER BY p.puntos DESC, u.nombre ASC`,
        [parseInt(matchId)]
      );
      return NextResponse.json(res.rows);
    }

    // Retrieve current user predictions joined with match information
    const res = await pool.query(
      `SELECT p.*, m.local, m.visitante, m.fecha, m.estado, m.goles_local, m.goles_visitante, m.fase, m.grupo
       FROM predictions p
       JOIN matches m ON p.match_id = m.id
       WHERE p.user_id = $1`,
      [user.id]
    );

    return NextResponse.json(res.rows);
  } catch (error: any) {
    console.error('Error fetching predictions:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

// POST: save or update a prediction
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { matchId, predLocal, predVisitante } = await req.json();

    if (matchId === undefined || predLocal === undefined || predVisitante === undefined) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 });
    }

    // Check match start time and current status
    const matchRes = await pool.query(
      'SELECT fecha, estado FROM matches WHERE id = $1',
      [matchId]
    );

    if (matchRes.rows.length === 0) {
      return NextResponse.json({ error: 'Partido no encontrado' }, { status: 404 });
    }

    const match = matchRes.rows[0];
    const now = new Date();
    const matchTime = new Date(match.fecha);

    // Block predictions if game has started or is not in 'upcoming' state
    if (match.estado !== 'upcoming' || now >= matchTime) {
      return NextResponse.json(
        { error: 'El partido ya ha comenzado. Apuestas cerradas.' },
        { status: 400 }
      );
    }

    // Upsert prediction
    const upsertQuery = `
      INSERT INTO predictions (user_id, match_id, pred_local, pred_visitante)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, match_id) 
      DO UPDATE SET pred_local = EXCLUDED.pred_local,
                    pred_visitante = EXCLUDED.pred_visitante,
                    created_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const res = await pool.query(upsertQuery, [
      user.id,
      matchId,
      parseInt(predLocal),
      parseInt(predVisitante)
    ]);

    return NextResponse.json({ success: true, prediction: res.rows[0] });
  } catch (error: any) {
    console.error('Error saving prediction:', error);
    return NextResponse.json({ error: 'Error del servidor: ' + error.message }, { status: 500 });
  }
}
