import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { broadcastUpdate } from '@/lib/realtime';
import { sendPushToAllActive } from '@/lib/push';
import { logSystem } from '@/lib/mail';

export const dynamic = 'force-dynamic';

const TIPOS_VALIDOS = ['gol', 'gol_penal', 'tarjeta_amarilla', 'tarjeta_roja', 'sustitucion'];

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const isAdmin = user.tipo === 'admin' || user.tipo === 'superadmin';
    const isArbitro = !!(user as any).arbitro_marcador;
    if (!isAdmin && !isArbitro) {
      return NextResponse.json({ error: 'Sin permisos para registrar eventos' }, { status: 403 });
    }

    const body = await req.json();
    const { matchId, tipo, jugador, equipo, minuto, ganador, penales_local, penales_visitante } = body;

    if (!matchId) return NextResponse.json({ error: 'matchId requerido' }, { status: 400 });

    const matchRes = await pool.query('SELECT * FROM matches WHERE id = $1', [matchId]);
    if (matchRes.rows.length === 0) return NextResponse.json({ error: 'Partido no encontrado' }, { status: 404 });
    const match = matchRes.rows[0];

    const currentStats: any = match.stats || {};
    const eventos: any[] = Array.isArray(currentStats.eventos) ? [...currentStats.eventos] : [];

    // ── Advanced Stats Update (Penalties list, lineups, fouls, substitutions) ──
    if (tipo === 'stats_update') {
      const {
        penales_local,
        penales_visitante,
        penales_lista_local,
        penales_lista_visitante,
        fase_actual,
        extra_time,
        ganador: statGanador,
        faltas_local,
        faltas_visitante,
        alineacion_local,
        alineacion_visitante,
        cambios_local,
        cambios_visitante
      } = body;

      const newStats = {
        ...currentStats,
        penales_local: penales_local !== undefined ? penales_local : currentStats.penales_local,
        penales_visitante: penales_visitante !== undefined ? penales_visitante : currentStats.penales_visitante,
        penales_lista_local: penales_lista_local !== undefined ? penales_lista_local : currentStats.penales_lista_local,
        penales_lista_visitante: penales_lista_visitante !== undefined ? penales_lista_visitante : currentStats.penales_lista_visitante,
        fase_actual: fase_actual !== undefined ? fase_actual : currentStats.fase_actual,
        extra_time: extra_time !== undefined ? extra_time : currentStats.extra_time,
        ganador: statGanador !== undefined ? statGanador : currentStats.ganador,
        fouls_local: faltas_local !== undefined ? faltas_local : currentStats.fouls_local,
        fouls_visitante: faltas_visitante !== undefined ? faltas_visitante : currentStats.fouls_visitante,
        alineacion_local: alineacion_local !== undefined ? alineacion_local : currentStats.alineacion_local,
        alineacion_visitante: alineacion_visitante !== undefined ? alineacion_visitante : currentStats.alineacion_visitante,
        cambios_local: cambios_local !== undefined ? cambios_local : currentStats.cambios_local,
        cambios_visitante: cambios_visitante !== undefined ? cambios_visitante : currentStats.cambios_visitante,
      };

      const res = await pool.query(
        'UPDATE matches SET stats = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
        [JSON.stringify(newStats), matchId]
      );
      const updated = res.rows[0];
      broadcastUpdate('match', updated);

      if (updated.estado === 'finished' || updated.estado === 'live') {
        pool.query('SELECT recalculate_leaderboard()').catch(() => {});
        broadcastUpdate('leaderboard', { updated: true });
      }

      return NextResponse.json({ success: true, match: updated });
    }

    // ── Penalty shootout result ──
    if (tipo === 'penales') {
      if (!ganador) return NextResponse.json({ error: 'ganador requerido para penales' }, { status: 400 });
      const newStats = {
        ...currentStats,
        ganador,
        penales_local: penales_local ?? null,
        penales_visitante: penales_visitante ?? null,
      };
      const res = await pool.query(
        'UPDATE matches SET stats = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
        [JSON.stringify(newStats), matchId]
      );
      const updated = res.rows[0];
      broadcastUpdate('match', updated);
      pool.query('SELECT recalculate_leaderboard()').catch(() => {});
      broadcastUpdate('leaderboard', { updated: true });

      const penStr = (penales_local != null && penales_visitante != null)
        ? ` (${penales_local}-${penales_visitante} en penales)`
        : ' en penales';
      const notifTitle = `🎯 ${ganador} avanza${penStr}`;
      const notifBody = `${match.local} ${match.goles_local} - ${match.goles_visitante} ${match.visitante}`;
      await pool.query(
        `INSERT INTO notifications (titulo, contenido, tipo, target_type, expires_at)
         VALUES ($1, $2, 'info', 'all', NOW() + INTERVAL '3 hours')`,
        [notifTitle, notifBody]
      );
      broadcastUpdate('notification', { auto: true });
      void sendPushToAllActive({ title: notifTitle, body: notifBody, url: '/fixture' });
      logSystem('info', 'PARTIDO', `Penales: ${match.local} vs ${match.visitante}`, `Ganador: ${ganador} | ${penales_local}-${penales_visitante}`).catch(() => {});
      return NextResponse.json({ success: true, match: updated });
    }

    // ── Regular event ──
    if (!tipo || !TIPOS_VALIDOS.includes(tipo)) {
      return NextResponse.json({ error: `tipo inválido. Válidos: ${TIPOS_VALIDOS.join(', ')}` }, { status: 400 });
    }

    const nuevoEvento = {
      tipo,
      jugador: (jugador || '').toString().trim().slice(0, 80),
      equipo: (equipo || '').toString().trim(),
      minuto: (minuto || '').toString().trim(),
    };
    eventos.push(nuevoEvento);
    const newStats = { ...currentStats, eventos };

    let updatedMatch: any;

    if (tipo === 'gol' || tipo === 'gol_penal') {
      const isLocal = equipo === match.local;
      const newLocal = isLocal ? (match.goles_local ?? 0) + 1 : (match.goles_local ?? 0);
      const newVisitante = !isLocal ? (match.goles_visitante ?? 0) + 1 : (match.goles_visitante ?? 0);

      const res = await pool.query(
        `UPDATE matches SET goles_local = $1, goles_visitante = $2, stats = $3, updated_at = CURRENT_TIMESTAMP
         WHERE id = $4 RETURNING *`,
        [newLocal, newVisitante, JSON.stringify(newStats), matchId]
      );
      updatedMatch = res.rows[0];

      broadcastUpdate('goal', {
        matchId: updatedMatch.id,
        local: updatedMatch.local,
        visitante: updatedMatch.visitante,
        goles_local: updatedMatch.goles_local,
        goles_visitante: updatedMatch.goles_visitante,
        jugador: nuevoEvento.jugador,
        equipo: nuevoEvento.equipo,
        minuto: nuevoEvento.minuto,
        tipo,
      });

      const scorerText = nuevoEvento.jugador
        ? ` — ${nuevoEvento.jugador}${nuevoEvento.minuto ? ` ${nuevoEvento.minuto}'` : ''}`
        : '';
      const label = tipo === 'gol_penal' ? '⚽ GOL (Penal)' : '⚽ GOL';
      const notifTitle = `${label} de ${nuevoEvento.equipo}${scorerText}`;
      const notifBody = `${updatedMatch.local} ${updatedMatch.goles_local} - ${updatedMatch.goles_visitante} ${updatedMatch.visitante}`;
      await pool.query(
        `INSERT INTO notifications (titulo, contenido, tipo, target_type, expires_at)
         VALUES ($1, $2, 'success', 'all', NOW() + INTERVAL '3 hours')`,
        [notifTitle, notifBody]
      );
      broadcastUpdate('notification', { auto: true });
      void sendPushToAllActive({ title: notifTitle, body: notifBody, url: '/dashboard' });

      if (updatedMatch.estado === 'finished' || updatedMatch.estado === 'live') {
        pool.query('SELECT recalculate_leaderboard()').catch(() => {});
        broadcastUpdate('leaderboard', { updated: true });
      }
    } else {
      // Card or substitution — update stats only
      const res = await pool.query(
        'UPDATE matches SET stats = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
        [JSON.stringify(newStats), matchId]
      );
      updatedMatch = res.rows[0];

      broadcastUpdate('card', {
        matchId: updatedMatch.id,
        local: updatedMatch.local,
        visitante: updatedMatch.visitante,
        jugador: nuevoEvento.jugador,
        equipo: nuevoEvento.equipo,
        minuto: nuevoEvento.minuto,
        tipo,
      });
    }

    broadcastUpdate('match', updatedMatch);
    logSystem('info', 'PARTIDO',
      `Evento [${tipo}]: ${match.local} vs ${match.visitante}`,
      `Jugador: ${nuevoEvento.jugador} | Min: ${nuevoEvento.minuto} | Equipo: ${nuevoEvento.equipo} | Por: ${user.nombre}`
    ).catch(() => {});

    return NextResponse.json({ success: true, match: updatedMatch });
  } catch (err: any) {
    console.error('[match-events]', err);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

// DELETE: remove last event or a specific event by index
export async function DELETE(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    const isAdmin = user.tipo === 'admin' || user.tipo === 'superadmin';
    const isArbitro = !!(user as any).arbitro_marcador;
    if (!isAdmin && !isArbitro) return NextResponse.json({ error: 'Sin permisos para modificar eventos' }, { status: 403 });

    const body = await req.json();
    const { matchId, eventIndex } = body;
    if (!matchId) return NextResponse.json({ error: 'matchId requerido' }, { status: 400 });

    const matchRes = await pool.query('SELECT * FROM matches WHERE id = $1', [matchId]);
    if (matchRes.rows.length === 0) return NextResponse.json({ error: 'Partido no encontrado' }, { status: 404 });
    const match = matchRes.rows[0];

    const currentStats: any = match.stats || {};
    const eventos: any[] = Array.isArray(currentStats.eventos) ? [...currentStats.eventos] : [];
    if (eventos.length === 0) return NextResponse.json({ error: 'Sin eventos para eliminar' }, { status: 400 });

    const idx = eventIndex != null ? Number(eventIndex) : eventos.length - 1;
    if (idx < 0 || idx >= eventos.length) return NextResponse.json({ error: 'Índice inválido' }, { status: 400 });

    const removed = eventos.splice(idx, 1)[0];
    const newStats = { ...currentStats, eventos };

    let updatedMatch: any;
    // If removing a goal event, decrement the score
    if (removed.tipo === 'gol' || removed.tipo === 'gol_penal') {
      const isLocal = removed.equipo === match.local;
      const newLocal = isLocal ? Math.max(0, (match.goles_local ?? 0) - 1) : (match.goles_local ?? 0);
      const newVisitante = !isLocal ? Math.max(0, (match.goles_visitante ?? 0) - 1) : (match.goles_visitante ?? 0);
      const res = await pool.query(
        `UPDATE matches SET goles_local = $1, goles_visitante = $2, stats = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *`,
        [newLocal, newVisitante, JSON.stringify(newStats), matchId]
      );
      updatedMatch = res.rows[0];
      if (updatedMatch.estado === 'finished' || updatedMatch.estado === 'live') {
        pool.query('SELECT recalculate_leaderboard()').catch(() => {});
        broadcastUpdate('leaderboard', { updated: true });
      }
    } else {
      const res = await pool.query(
        'UPDATE matches SET stats = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
        [JSON.stringify(newStats), matchId]
      );
      updatedMatch = res.rows[0];
    }

    broadcastUpdate('match', updatedMatch);
    logSystem('warn', 'PARTIDO', `Evento eliminado [${removed.tipo}]: ${match.local} vs ${match.visitante}`, `Jugador: ${removed.jugador} | Por: ${user.nombre}`).catch(() => {});
    return NextResponse.json({ success: true, match: updatedMatch });
  } catch (err: any) {
    console.error('[match-events DELETE]', err);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
