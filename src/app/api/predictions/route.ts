import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { logSystem } from '@/lib/mail';
import { validateScore } from '@/lib/validation';

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

    if (user.tipo !== 'superadmin') {
      const companyCheck = await pool.query(
        'SELECT 1 FROM user_companies WHERE user_id = $1 LIMIT 1',
        [user.id]
      );
      if (companyCheck.rows.length === 0) {
        return NextResponse.json({ error: 'Debes tener una empresa asignada para poder guardar pronósticos.' }, { status: 403 });
      }
    }

    const settingRes = await pool.query(
      "SELECT value FROM settings WHERE key = 'prediction_close_minutes'"
    );
    const closeMinutes = settingRes.rows.length > 0 ? parseInt(settingRes.rows[0].value, 10) || 15 : 15;
    const closeMs = closeMinutes * 60 * 1000;

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
          `SELECT id, fecha, estado, local, visitante FROM matches WHERE id = ANY($1::int[])`,
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
        const scoreLocal = validateScore(predLocal);
        const scoreVisitante = validateScore(predVisitante);
        if (scoreLocal === null || scoreVisitante === null) {
          errors.push({ matchId, error: 'Marcador inválido (debe ser número entre 0 y 99)' });
          continue;
        }

        const match = matchMap.get(matchId);
        if (!match) { errors.push({ matchId, error: 'Partido no encontrado' }); continue; }
        const closeTime = new Date(new Date(match.fecha).getTime() - closeMs);
        if (match.estado !== 'upcoming' || now >= closeTime) {
          errors.push({ matchId, error: `Apuestas cerradas (cierran ${closeMinutes} minutos antes del partido)` }); continue;
        }
        if (existingSet.has(matchId)) {
          const res = await pool.query(
            `UPDATE predictions SET pred_local = $1, pred_visitante = $2 WHERE user_id = $3 AND match_id = $4 RETURNING *`,
            [scoreLocal, scoreVisitante, user.id, matchId]
          );
          results.push(res.rows[0]);
        } else {
          const res = await pool.query(
            `INSERT INTO predictions (user_id, match_id, pred_local, pred_visitante) VALUES ($1, $2, $3, $4) RETURNING *`,
            [user.id, matchId, scoreLocal, scoreVisitante]
          );
          results.push(res.rows[0]);
        }
      }

      if (results.length > 0) {
        logSystem('info', 'PRONOSTICO', `${user.nombre} guardó ${results.length} pronóstico(s) en lote`).catch(() => {});
      }

      return NextResponse.json({ success: true, results, errors });
    }

    // Otherwise, handle standard single prediction
    const { matchId, predLocal, predVisitante, userId } = body;

    const scoreLocal = validateScore(predLocal);
    const scoreVisitante = validateScore(predVisitante);

    if (matchId === undefined || scoreLocal === null || scoreVisitante === null) {
      return NextResponse.json({ error: 'Marcador inválido (debe ser número entre 0 y 99)' }, { status: 400 });
    }

    let targetUserId = user.id;
    // Bypass only when superadmin edits ANOTHER user's prediction — own predictions follow normal time rules
    let isSuperAdminBypass = false;

    if (userId !== undefined && parseInt(userId) !== user.id) {
      if (user.tipo !== 'superadmin') {
        return NextResponse.json({ error: 'No autorizado para editar predicciones de otros usuarios' }, { status: 403 });
      }
      targetUserId = parseInt(userId);
      isSuperAdminBypass = true;
    }

    const now = new Date();
    const matchRes = await pool.query(
      'SELECT fecha, estado, local, visitante FROM matches WHERE id = $1',
      [matchId]
    );

    if (matchRes.rows.length === 0) {
      return NextResponse.json({ error: 'Partido no encontrado' }, { status: 404 });
    }

    const match = matchRes.rows[0];
    const matchTime = new Date(match.fecha);

    if (!isSuperAdminBypass) {
      const closeTime = new Date(matchTime.getTime() - closeMs);
      if (match.estado !== 'upcoming' || now >= closeTime) {
        return NextResponse.json(
          { error: `Apuestas cerradas. Los pronósticos se cierran ${closeMinutes} minutos antes del inicio.` },
          { status: 400 }
        );
      }
    }


    const logSuperadminAction = async (
      superadminId: number, superadminNombre: string,
      targetId: number, mId: number,
      matchLocal: string, matchVisitante: string,
      oldL: number | null, oldV: number | null,
      newL: number, newV: number
    ) => {
      try {

        const targetRes = await pool.query('SELECT nombre FROM users WHERE id = $1', [targetId]);
        const targetNombre = targetRes.rows[0]?.nombre || `ID:${targetId}`;
        const anteriorStr = oldL !== null ? `${oldL}-${oldV}` : 'Sin pronóstico previo';
        const details = `${superadminNombre} editó pronóstico de ${targetNombre} | ${matchLocal} vs ${matchVisitante} | Anterior: ${anteriorStr} → Nuevo: ${newL}-${newV}`;
        await pool.query(
          `INSERT INTO audit_logs (user_id, action, details) VALUES ($1, $2, $3)`,
          [superadminId, 'SUPERADMIN_PREDICTION_EDIT', details]
        );
        await logSystem('warn', 'PRONOSTICO', `Admin ${superadminNombre} editó pronóstico de ${targetNombre}`, `${matchLocal} vs ${matchVisitante} | Anterior: ${anteriorStr} → Nuevo: ${newL}-${newV}`);
      } catch (err) {
        console.error('Error writing audit log:', err);
      }
    };

    // Check if prediction already exists for this user and match
    const existingPredRes = await pool.query(
      'SELECT id, pred_local, pred_visitante, created_at FROM predictions WHERE user_id = $1 AND match_id = $2',
      [targetUserId, matchId]
    );

    if (existingPredRes.rows.length > 0) {
      const oldPred = existingPredRes.rows[0];
      const upd = await pool.query(
        'UPDATE predictions SET pred_local = $1, pred_visitante = $2 WHERE user_id = $3 AND match_id = $4 RETURNING *',
        [scoreLocal, scoreVisitante, targetUserId, matchId]
      );
      if (user.tipo === 'superadmin') {
        await logSuperadminAction(user.id, user.nombre, targetUserId, parseInt(matchId), match.local, match.visitante, oldPred.pred_local, oldPred.pred_visitante, scoreLocal, scoreVisitante);
      } else {
        logSystem('info', 'PRONOSTICO', `${user.nombre} editó pronóstico`, `${match.local} vs ${match.visitante}: ${oldPred.pred_local}-${oldPred.pred_visitante} → ${scoreLocal}-${scoreVisitante}`).catch(() => {});
      }
      return NextResponse.json({ success: true, prediction: upd.rows[0], corrected: true });
    }

    const insertQuery = `
      INSERT INTO predictions (user_id, match_id, pred_local, pred_visitante)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const res = await pool.query(insertQuery, [
      targetUserId,
      matchId,
      scoreLocal,
      scoreVisitante
    ]);

    if (user.tipo === 'superadmin') {
      await logSuperadminAction(user.id, user.nombre, targetUserId, parseInt(matchId), match.local, match.visitante, null, null, scoreLocal, scoreVisitante);
    } else {
      logSystem('info', 'PRONOSTICO', `${user.nombre} registró pronóstico`, `${match.local} vs ${match.visitante}: ${scoreLocal}-${scoreVisitante}`).catch(() => {});
    }

    return NextResponse.json({ success: true, prediction: res.rows[0] });
  } catch (error: any) {
    console.error('Error saving predictions:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
