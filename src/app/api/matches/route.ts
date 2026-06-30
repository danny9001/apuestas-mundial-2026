import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { broadcastUpdate } from '@/lib/realtime';
import { logSystem } from '@/lib/mail';
import { validateScore } from '@/lib/validation';

export const dynamic = 'force-dynamic';

// GET: fetch matches
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const grupo = searchParams.get('grupo');
    const fase = searchParams.get('fase');
    const estado = searchParams.get('estado');

    let queryStr = 'SELECT * FROM matches';
    const params: any[] = [];
    const conditions: string[] = [];

    if (grupo) {
      params.push(grupo);
      conditions.push(`grupo = $${params.length}`);
    }
    if (fase) {
      params.push(fase);
      conditions.push(`fase = $${params.length}`);
    }
    if (estado) {
      params.push(estado);
      conditions.push(`estado = $${params.length}`);
    }

    if (conditions.length > 0) {
      queryStr += ' WHERE ' + conditions.join(' AND ');
    }

    queryStr += ' ORDER BY fecha ASC, id ASC';

    const res = await pool.query(queryStr, params);
    const response = NextResponse.json(res.rows);
    response.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
    return response;
  } catch (error: any) {
    console.error('Error fetching matches:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

// POST: create or update match (Admin only!)
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || (user.tipo !== 'admin' && user.tipo !== 'superadmin')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await req.json();
    const {
      id,
      fecha,
      local,
      visitante,
      logo_local,
      logo_visitante,
      estado,
      goles_local,
      goles_visitante,
      fase,
      grupo,
      transmision_enlaces,
      stats,
      penales_habilitados
    } = body;

    const scoreLocal = goles_local !== undefined && goles_local !== null ? validateScore(goles_local) : undefined;
    const scoreVisitante = goles_visitante !== undefined && goles_visitante !== null ? validateScore(goles_visitante) : undefined;

    if (goles_local !== undefined && goles_local !== null && scoreLocal === null) {
      return NextResponse.json({ error: 'Goles locales inválidos (debe ser número entre 0 y 99)' }, { status: 400 });
    }
    if (goles_visitante !== undefined && goles_visitante !== null && scoreVisitante === null) {
      return NextResponse.json({ error: 'Goles visitantes inválidos (debe ser número entre 0 y 99)' }, { status: 400 });
    }

    let matchResult;

    if (id) {
      if (body.open_for_arbitros) {
        if (user.tipo !== 'superadmin') {
          return NextResponse.json({ error: 'Solo el superadmin puede abrir un partido para corrección' }, { status: 403 });
        }
        const getStatsRes = await pool.query('SELECT stats FROM matches WHERE id = $1', [id]);
        if (getStatsRes.rows.length === 0) {
          return NextResponse.json({ error: 'Partido no encontrado' }, { status: 404 });
        }
        const currentStats = getStatsRes.rows[0].stats || {};
        currentStats.finished_at = new Date().toISOString(); // Reset finished_at to now
        delete currentStats.manual_control; // Clear freeze so sync can resume after correction window
        
        const updateRes = await pool.query(
          `UPDATE matches 
           SET stats = $1, updated_at = CURRENT_TIMESTAMP 
           WHERE id = $2 RETURNING *`,
          [JSON.stringify(currentStats), id]
        );
        const updatedMatch = updateRes.rows[0];
        broadcastUpdate('match', updatedMatch);
        logSystem('info', 'PARTIDO', `${user.nombre} abrió partido ${updatedMatch.local} vs ${updatedMatch.visitante} para edición de árbitros`, '').catch(() => {});
        return NextResponse.json({ success: true, match: updatedMatch });
      }

      // UPDATE MATCH
      // Get the existing match state before updating to check for transitions
      const checkRes = await pool.query('SELECT estado, goles_local, goles_visitante FROM matches WHERE id = $1', [id]);
      if (checkRes.rows.length === 0) {
        return NextResponse.json({ error: 'Partido no encontrado' }, { status: 404 });
      }
      const prevMatch = checkRes.rows[0];

      // penales_habilitados only changeable by superadmin
      const penalesHabilitadosValue = user.tipo === 'superadmin' && penales_habilitados !== undefined
        ? penales_habilitados
        : null;

      // If transition to finished, set finished_at in stats
      let finalStats = stats || {};
      if (typeof finalStats === 'string') {
        try { finalStats = JSON.parse(finalStats); } catch { finalStats = {}; }
      }
      if (estado === 'finished') {
        finalStats.finished_at = finalStats.finished_at || new Date().toISOString();
      }
      // Only freeze sync when score/estado is being manually overridden
      if (scoreLocal !== undefined || scoreVisitante !== undefined || estado !== undefined) {
        finalStats.manual_control = true;
      }

      const updateQuery = `
        UPDATE matches
        SET fecha = COALESCE($1, fecha),
            local = COALESCE($2, local),
            visitante = COALESCE($3, visitante),
            logo_local = COALESCE($4, logo_local),
            logo_visitante = COALESCE($5, logo_visitante),
            estado = COALESCE($6, estado),
            goles_local = COALESCE($7, goles_local),
            goles_visitante = COALESCE($8, goles_visitante),
            fase = COALESCE($9, fase),
            grupo = COALESCE($10, grupo),
            transmision_enlaces = COALESCE($11, transmision_enlaces),
            stats = COALESCE($12, stats),
            penales_habilitados = COALESCE($14, penales_habilitados),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $13
        RETURNING *
      `;

      matchResult = await pool.query(updateQuery, [
        fecha, local, visitante, logo_local, logo_visitante, estado,
        scoreLocal !== undefined && scoreLocal !== null ? scoreLocal : null,
        scoreVisitante !== undefined && scoreVisitante !== null ? scoreVisitante : null,
        fase, grupo, transmision_enlaces,
        finalStats ? (typeof finalStats === 'string' ? finalStats : JSON.stringify(finalStats)) : null,
        id,
        penalesHabilitadosValue
      ]);

      const updatedMatch = matchResult.rows[0];

      // Detect goal event (if score changed during live state)
      const scoreChanged = prevMatch.goles_local !== updatedMatch.goles_local || prevMatch.goles_visitante !== updatedMatch.goles_visitante;
      
      if (updatedMatch.estado === 'live' && scoreChanged) {
        broadcastUpdate('goal', {
          matchId: updatedMatch.id,
          local: updatedMatch.local,
          visitante: updatedMatch.visitante,
          goles_local: updatedMatch.goles_local,
          goles_visitante: updatedMatch.goles_visitante
        });
      }

      // If transition to finished, live, score changed, or penalty scoring toggled → recalculate
      const penalesToggled = penalesHabilitadosValue !== null;
      if (
        (estado === 'finished' && prevMatch.estado !== 'finished') ||
        (estado === 'live' && prevMatch.estado !== 'live') ||
        (scoreChanged && (updatedMatch.estado === 'finished' || updatedMatch.estado === 'live')) ||
        (penalesToggled && updatedMatch.estado === 'finished')
      ) {
        await pool.query('SELECT recalculate_leaderboard()');
        broadcastUpdate('leaderboard', { updated: true });
      }

      // Broadcast general match update
      broadcastUpdate('match', updatedMatch);
      const penalesLog = penalesToggled ? ` | Penales: ${updatedMatch.penales_habilitados ? 'ON' : 'OFF'}` : '';
      logSystem('info', 'PARTIDO', `${user.nombre} editó partido ${updatedMatch.local} vs ${updatedMatch.visitante}`, `Estado: ${updatedMatch.estado} | Marcador: ${updatedMatch.goles_local}-${updatedMatch.goles_visitante}${penalesLog}`).catch(() => {});

    } else {
      // CREATE MATCH
      const insertQuery = `
        INSERT INTO matches (fecha, local, visitante, logo_local, logo_visitante, estado, goles_local, goles_visitante, fase, grupo, transmision_enlaces, stats)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `;
      matchResult = await pool.query(insertQuery, [
        fecha, local, visitante, logo_local || null, logo_visitante || null,
        estado || 'upcoming',
        scoreLocal !== undefined && scoreLocal !== null ? scoreLocal : 0,
        scoreVisitante !== undefined && scoreVisitante !== null ? scoreVisitante : 0,
        fase || 'Fase de Grupos', grupo || null, transmision_enlaces || '',
        stats ? (typeof stats === 'string' ? stats : JSON.stringify(stats)) : '{}'
      ]);

      const createdMatch = matchResult.rows[0];
      broadcastUpdate('match', createdMatch);
      logSystem('info', 'PARTIDO', `${user.nombre} creó partido ${createdMatch.local} vs ${createdMatch.visitante}`, `Fase: ${createdMatch.fase} | Grupo: ${createdMatch.grupo || '-'}`).catch(() => {});
    }

    return NextResponse.json({ success: true, match: matchResult.rows[0] });
  } catch (error: any) {
    console.error('Error creating/updating match:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
