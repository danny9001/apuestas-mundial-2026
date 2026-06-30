import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { broadcastUpdate } from '@/lib/realtime';
import { sendPushToAllActive } from '@/lib/push';
import { logSystem } from '@/lib/mail';

export const dynamic = 'force-dynamic';

const GRACE_PERIOD_MS = 15 * 60 * 1000; // 15 min after match ends

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const isAdmin = user.tipo === 'admin' || user.tipo === 'superadmin';
    const isArbitro = !!(user as any).arbitro_marcador;

    if (!isAdmin && !isArbitro) {
      return NextResponse.json({ error: 'Sin permisos para corregir scores' }, { status: 403 });
    }

    const body = await req.json();
    const { matchId, goles_local, goles_visitante } = body;

    if (!matchId) return NextResponse.json({ error: 'matchId requerido' }, { status: 400 });
    if (typeof goles_local !== 'number' || typeof goles_visitante !== 'number') {
      return NextResponse.json({ error: 'Scores inválidos' }, { status: 400 });
    }
    if (goles_local < 0 || goles_visitante < 0) {
      return NextResponse.json({ error: 'El score no puede ser negativo' }, { status: 400 });
    }

    const matchRes = await pool.query('SELECT * FROM matches WHERE id = $1', [matchId]);
    if (matchRes.rows.length === 0) return NextResponse.json({ error: 'Partido no encontrado' }, { status: 404 });

    const match = matchRes.rows[0];

    // Time window check (15 minutes limit) for everyone (admins must use Marcadores en Vivo after 15 mins)
    const isLive = match.estado === 'live';
    const finishedTime = match.stats?.finished_at 
      ? new Date(match.stats.finished_at).getTime() 
      : (match.updated_at ? new Date(match.updated_at).getTime() : 0);
    const isRecentlyFinished = match.estado === 'finished' &&
      finishedTime > 0 &&
      (Date.now() - finishedTime) <= GRACE_PERIOD_MS;

    if (!isLive && !isRecentlyFinished) {
      const minsSinceEnd = finishedTime > 0
        ? Math.floor((Date.now() - finishedTime) / 60000)
        : '?';
      return NextResponse.json({
        error: `Solo se puede corregir desde el inicio durante el partido en vivo o hasta 15 minutos después de finalizar. Han pasado ${minsSinceEnd} minutos. Como administrador, realiza correcciones fuera de este tiempo desde Marcadores en Vivo.`
      }, { status: 400 });
    }

    const prevLocal = match.goles_local ?? 0;
    const prevVisitante = match.goles_visitante ?? 0;
    const noChange = prevLocal === goles_local && prevVisitante === goles_visitante;
    if (noChange) return NextResponse.json({ error: 'El score ya tiene ese valor' }, { status: 400 });

    const currentStats = match.stats || {};
    currentStats.manual_control = true;
    if (match.estado === 'finished' && !currentStats.finished_at) {
      currentStats.finished_at = new Date().toISOString();
    }

    // Apply correction
    const updateRes = await pool.query(
      `UPDATE matches SET goles_local = $1, goles_visitante = $2, stats = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 RETURNING *`,
      [goles_local, goles_visitante, JSON.stringify(currentStats), matchId]
    );
    const updated = updateRes.rows[0];

    // Broadcast live update to all connected clients
    broadcastUpdate('match', updated);
    broadcastUpdate('goal', {
      matchId: updated.id,
      local: updated.local,
      visitante: updated.visitante,
      goles_local: updated.goles_local,
      goles_visitante: updated.goles_visitante,
    });

    // Determine if goal or annulment
    const localDiff = goles_local - prevLocal;
    const visitanteDiff = goles_visitante - prevVisitante;
    const isAnnulment = localDiff < 0 || visitanteDiff < 0;
    const goalTeam = localDiff > 0 ? updated.local : visitanteDiff > 0 ? updated.visitante : null;
    const annulledTeam = localDiff < 0 ? updated.local : visitanteDiff < 0 ? updated.visitante : null;

    // Notification
    const notifTitle = isAnnulment
      ? `🚫 Gol Anulado — ${annulledTeam}`
      : `🥅 ¡GOL de ${goalTeam}!`;
    const notifBody = `${updated.local} ${updated.goles_local} - ${updated.goles_visitante} ${updated.visitante}`;

    await pool.query(
      `INSERT INTO notifications (titulo, contenido, tipo, target_type, expires_at)
       VALUES ($1, $2, $3, 'all', NOW() + INTERVAL '3 hours')`,
      [notifTitle, notifBody, isAnnulment ? 'warn' : 'success']
    );
    broadcastUpdate('notification', { auto: true });
    void sendPushToAllActive({ title: notifTitle, body: notifBody, url: '/fixture' });

    // Recalculate leaderboard if finished
    if (updated.estado === 'finished' || updated.estado === 'live') {
      pool.query('SELECT recalculate_leaderboard()').catch(() => {});
      broadcastUpdate('leaderboard', { updated: true });
    }

    // Record in score_change_log so applyConfirmedDowngrades knows an árbitro intervened
    pool.query(
      `INSERT INTO score_change_log (match_id, source, old_goles_local, old_goles_visitante, new_goles_local, new_goles_visitante, estado)
       VALUES ($1,'ARBITRO',$2,$3,$4,$5,$6)`,
      [matchId, prevLocal, prevVisitante, goles_local, goles_visitante, match.estado]
    ).catch(() => {});

    // Also cancel any pending auto-downgrade for this match since árbitro intervened
    pool.query('DELETE FROM pending_downgrades WHERE match_id = $1 AND applied = FALSE', [matchId]).catch(() => {});

    // Audit log
    const changeDesc = isAnnulment
      ? `GOL ANULADO: ${annulledTeam}`
      : `Gol: ${goalTeam}`;
    logSystem('warn', 'ARBITRO',
      `[${isAdmin ? user.tipo : 'Árbitro'}] Corrección de score: ${updated.local} vs ${updated.visitante}`,
      `${prevLocal}-${prevVisitante} → ${goles_local}-${goles_visitante} | ${changeDesc} | Estado: ${updated.estado} | Por: ${user.nombre} (ID ${user.id})`
    ).catch(() => {});

    return NextResponse.json({ success: true, match: updated });
  } catch (err: any) {
    console.error('[score-correction]', err);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
