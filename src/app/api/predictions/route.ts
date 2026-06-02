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
      const results = [];
      const errors = [];

      for (const item of body) {
        const { matchId, predLocal, predVisitante } = item;
        if (matchId === undefined || predLocal === undefined || predVisitante === undefined) {
          continue;
        }

        // Check match validity and kickoff time
        const matchRes = await pool.query(
          'SELECT fecha, estado FROM matches WHERE id = $1',
          [matchId]
        );

        if (matchRes.rows.length === 0) {
          errors.push({ matchId, error: 'Partido no encontrado' });
          continue;
        }

        const match = matchRes.rows[0];
        const now = new Date();
        const matchTime = new Date(match.fecha);

        if (match.estado !== 'upcoming' || now >= matchTime) {
          errors.push({ matchId, error: 'Apuestas cerradas' });
          continue;
        }

        // Check if prediction already exists for this user and match
        const existingPredRes = await pool.query(
          'SELECT id FROM predictions WHERE user_id = $1 AND match_id = $2',
          [user.id, matchId]
        );

        if (existingPredRes.rows.length > 0) {
          errors.push({ matchId, error: 'La apuesta ya ha sido confirmada y no se puede modificar.' });
          continue;
        }

        // Insert prediction
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

        results.push(res.rows[0]);
      }

      return NextResponse.json({ success: true, results, errors });
    }

    // Otherwise, handle standard single prediction
    const { matchId, predLocal, predVisitante } = body;

    if (matchId === undefined || predLocal === undefined || predVisitante === undefined) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 });
    }

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

    if (match.estado !== 'upcoming' || now >= matchTime) {
      return NextResponse.json(
        { error: 'El partido ya ha comenzado. Apuestas cerradas.' },
        { status: 400 }
      );
    }

    // Check if prediction already exists for this user and match
    const existingPredRes = await pool.query(
      'SELECT id FROM predictions WHERE user_id = $1 AND match_id = $2',
      [user.id, matchId]
    );

    if (existingPredRes.rows.length > 0) {
      return NextResponse.json(
        { error: 'La apuesta ya ha sido confirmada y no se puede modificar.' },
        { status: 400 }
      );
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
