import pool from './db';
import { broadcastUpdate } from './realtime';
import { sendPushToAllActive, sendPushToUsersWithoutPrediction } from './push';
import { logSystem } from './mail';
import { fetchWithRetry } from './http/fetchWithRetry';

type PendingGoalNotif = {
  matchId: number;
  local: string;
  visitante: string;
  golesLocal: number;
  golesVisitante: number;
  baselineGolesLocal: number;
  baselineGolesVisitante: number;
  isFinished: boolean;
};

type DowngradeEntry = {
  proposed_local: number;
  proposed_visitante: number;
  agreed: number;   // sources that proposed this exact lower score
  total: number;    // total sources with live data for this match
  conflicted: boolean; // two sources proposed different lower scores
};

async function markNotifSent(matchId: number, event: string): Promise<boolean> {
  const res = await pool.query(
    'INSERT INTO match_notif_log (match_id, event) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING 1',
    [matchId, event]
  );
  return res.rows.length > 0;
}

// Returns true if this exact score was recently corrected FROM by an árbitro or auto-system
// (prevents API lag from re-applying an annulled score after a manual correction)
async function isAnnulledScore(matchId: number, local: number, visitante: number): Promise<boolean> {
  const res = await pool.query(
    `SELECT 1 FROM score_change_log
     WHERE match_id = $1
       AND source IN ('ARBITRO', 'AUTO')
       AND old_goles_local = $2
       AND old_goles_visitante = $3
       AND created_at > NOW() - INTERVAL '15 minutes'
     LIMIT 1`,
    [matchId, local, visitante]
  );
  return res.rows.length > 0;
}

// Knockout matches tied after regulation must go to a penalty shootout before a winner exists.
// Some feeds (ApiFixture's "Finalizado", 365Scores statusGroup 4, football-data's "FINISHED")
// flip a match to finished the moment normal/extra time ends, before the shootout is even played.
// Keep the match "live" until this source reports a real penalty result, or another source
// already recorded one — otherwise a tied knockout match gets closed mid-shootout.
function guardPrematureKnockoutFinish(
  estado: 'upcoming' | 'live' | 'finished',
  localMatch: { grupo: string | null; stats?: { penales_local?: number; penales_visitante?: number } },
  golesLocal: number,
  golesVisitante: number,
  hasPenaltiesFromThisSource: boolean
): 'upcoming' | 'live' | 'finished' {
  if (estado !== 'finished') return estado;
  if (localMatch.grupo !== null) return estado;
  if (golesLocal !== golesVisitante) return estado;
  if (hasPenaltiesFromThisSource) return estado;
  const existingStats = localMatch.stats || {};
  const alreadyHasPenaltyResult = existingStats.penales_local != null && existingStats.penales_visitante != null &&
    existingStats.penales_local !== existingStats.penales_visitante;
  if (alreadyHasPenaltyResult) return estado;
  return 'live';
}

const teamNameMapping: Record<string, string> = {
  'Germany': 'Alemania',
  'Saudi Arabia': 'Arabia Saudita',
  'Algeria': 'Argelia',
  'Argentina': 'Argentina',
  'Australia': 'Australia',
  'Austria': 'Austria',
  'Bosnia-Herzegovina': 'Bosnia y Herzegovina',
  'Bosnia and Herzegovina': 'Bosnia y Herzegovina',
  'Brazil': 'Brasil',
  'Belgium': 'Bélgica',
  'Cape Verde': 'Cabo Verde',
  'Cape Verde Islands': 'Cabo Verde',
  'Canada': 'Canadá',
  'Colombia': 'Colombia',
  'South Korea': 'Corea del Sur',
  'Ivory Coast': 'Costa de Marfil',
  "Côte d'Ivoire": 'Costa de Marfil',
  'Croatia': 'Croacia',
  'Curaçao': 'Curazao',
  'Curacao': 'Curazao',
  'Ecuador': 'Ecuador',
  'Egypt': 'Egipto',
  'Scotland': 'Escocia',
  'Spain': 'España',
  'United States': 'Estados Unidos',
  'USA': 'Estados Unidos',
  'France': 'Francia',
  'Ghana': 'Ghana',
  'Haiti': 'Haití',
  'England': 'Inglaterra',
  'Iraq': 'Irak',
  'Iran': 'Irán',
  'Japan': 'Japón',
  'Jordan': 'Jordania',
  'Morocco': 'Marruecos',
  'Mexico': 'México',
  'Norway': 'Noruega',
  'New Zealand': 'Nueva Zelanda',
  'Panama': 'Panamá',
  'Paraguay': 'Paraguay',
  'Netherlands': 'Países Bajos',
  'Portugal': 'Portugal',
  'Qatar': 'Qatar',
  'DR Congo': 'RD Congo',
  'Czechia': 'República Checa',
  'Czech Republic': 'República Checa',
  'Senegal': 'Senegal',
  'South Africa': 'Sudáfrica',
  'Sweden': 'Suecia',
  'Switzerland': 'Suiza',
  'Turkey': 'Turquía',
  'Türkiye': 'Turquía',
  'Tunisia': 'Túnez',
  'Uruguay': 'Uruguay',
  'Uzbekistan': 'Uzbekistán'
};

const stageMapping: Record<string, string> = {
  'GROUP_STAGE': 'Fase de Grupos',
  'LAST_32': 'Ronda de 32',
  'LAST_16': 'Octavos de Final',
  'QUARTER_FINALS': 'Cuartos de Final',
  'SEMI_FINALS': 'Semifinal',
  'THIRD_PLACE': 'Tercer Puesto',
  'FINAL': 'Final'
};


// --- M5 Refactor: Shared sync helpers to avoid duplicated goal/finish logic ---

type LocalMatchSnap = { id: number; local: string; visitante: string; estado: string; goles_local: number | null; goles_visitante: number | null };
type UpdatedMatchSnap = { id: number; local: string; visitante: string; goles_local: number; goles_visitante: number };

function recordScoreChange(
  localMatch: LocalMatchSnap,
  updatedMatch: UpdatedMatchSnap,
  sourceName: string,
  estado: string
): void {
  broadcastUpdate('goal', { matchId: updatedMatch.id, local: updatedMatch.local, visitante: updatedMatch.visitante, goles_local: updatedMatch.goles_local, goles_visitante: updatedMatch.goles_visitante });
  logSystem('info', 'SYNC', `[${sourceName}] Gol detectado: ${updatedMatch.local} vs ${updatedMatch.visitante}`, `${localMatch.goles_local ?? 0}-${localMatch.goles_visitante ?? 0} → ${updatedMatch.goles_local}-${updatedMatch.goles_visitante}`).catch(() => {});
  pool.query(`INSERT INTO score_change_log (match_id, source, old_goles_local, old_goles_visitante, new_goles_local, new_goles_visitante, estado) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [localMatch.id, sourceName, localMatch.goles_local ?? 0, localMatch.goles_visitante ?? 0, updatedMatch.goles_local, updatedMatch.goles_visitante, estado]).catch(() => {});
}

async function routeGoalNotification(
  localMatch: LocalMatchSnap,
  updatedMatch: UpdatedMatchSnap,
  pendingGoalNotifs: Map<number, PendingGoalNotif> | undefined
): Promise<void> {
  if (pendingGoalNotifs) {
    const existing = pendingGoalNotifs.get(updatedMatch.id);
    pendingGoalNotifs.set(updatedMatch.id, {
      matchId: updatedMatch.id, local: updatedMatch.local, visitante: updatedMatch.visitante,
      golesLocal: updatedMatch.goles_local, golesVisitante: updatedMatch.goles_visitante,
      baselineGolesLocal: existing?.baselineGolesLocal ?? (localMatch.goles_local || 0),
      baselineGolesVisitante: existing?.baselineGolesVisitante ?? (localMatch.goles_visitante || 0),
      isFinished: existing?.isFinished ?? false,
    });
  } else {
    const goalKey = `goal_${updatedMatch.goles_local}_${updatedMatch.goles_visitante}`;
    if (await markNotifSent(updatedMatch.id, goalKey)) {
      const scoringTeam = updatedMatch.goles_local > (localMatch.goles_local || 0) ? updatedMatch.local : updatedMatch.visitante;
      await pool.query(`INSERT INTO notifications (titulo, contenido, tipo, target_type, expires_at) VALUES ($1,$2,'success','all',NOW() + INTERVAL '3 hours')`,
        [`🥅 ¡GOL de ${scoringTeam}!`, `${updatedMatch.local} ${updatedMatch.goles_local} - ${updatedMatch.goles_visitante} ${updatedMatch.visitante}`]);
      broadcastUpdate('notification', { auto: true });
      void sendPushToAllActive({ title: `🥅 ¡GOL de ${scoringTeam}!`, body: `${updatedMatch.local} ${updatedMatch.goles_local} - ${updatedMatch.goles_visitante} ${updatedMatch.visitante}`, url: '/fixture' });
    }
  }
}

async function routeFinishNotification(
  localMatch: LocalMatchSnap,
  updatedMatch: UpdatedMatchSnap,
  pendingGoalNotifs: Map<number, PendingGoalNotif> | undefined
): Promise<void> {
  if (pendingGoalNotifs) {
    const existing = pendingGoalNotifs.get(updatedMatch.id);
    pendingGoalNotifs.set(updatedMatch.id, {
      matchId: updatedMatch.id, local: updatedMatch.local, visitante: updatedMatch.visitante,
      golesLocal: updatedMatch.goles_local, golesVisitante: updatedMatch.goles_visitante,
      baselineGolesLocal: existing?.baselineGolesLocal ?? (localMatch.goles_local || 0),
      baselineGolesVisitante: existing?.baselineGolesVisitante ?? (localMatch.goles_visitante || 0),
      isFinished: true,
    });
  } else {
    if (await markNotifSent(updatedMatch.id, 'finished')) {
      await pool.query(`INSERT INTO notifications (titulo, contenido, tipo, target_type, expires_at) VALUES ($1,$2,'info','all',NOW() + INTERVAL '24 hours')`,
        [`🏁 Resultado: ${updatedMatch.local} ${updatedMatch.goles_local} - ${updatedMatch.goles_visitante} ${updatedMatch.visitante}`, `¡Partido terminado! La tabla de clasificación ha sido actualizada. Consulta tu posición en Ranking.`]);
      broadcastUpdate('notification', { auto: true });
      void sendPushToAllActive({ title: `🏁 Resultado final: ${updatedMatch.local} ${updatedMatch.goles_local} - ${updatedMatch.goles_visitante} ${updatedMatch.visitante}`, body: `¡Partido terminado! La tabla de clasificación ha sido actualizada.`, url: '/ranking' });
    }
  }
}

export async function sync365Scores(pendingGoalNotifs?: Map<number, PendingGoalNotif>, pendingDowngrades?: Map<number, DowngradeEntry>): Promise<{
  updated: number;
  goals_detected: number;
  finished: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let updatedCount = 0;
  let goalsDetected = 0;
  let finishedCount = 0;

  try {
    const now = new Date();
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    const twoDaysAhead = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
    const formatDate = (d: Date) => {
      // Bolivia is UTC-4 offset. Shift date by -4 hours to get Bolivia local date.
      const boliviaDate = new Date(d.getTime() - 4 * 60 * 60 * 1000);
      const day = String(boliviaDate.getUTCDate()).padStart(2, '0');
      const month = String(boliviaDate.getUTCMonth() + 1).padStart(2, '0');
      const year = boliviaDate.getUTCFullYear();
      return `${day}/${month}/${year}`;
    };
    const url = `https://webws.365scores.com/web/games/?langId=29&timezoneName=America/La_Paz&appTypeId=5&competitions=5930&startDate=${formatDate(twoDaysAgo)}&endDate=${formatDate(twoDaysAhead)}`;
    const res = await fetchWithRetry(url, {
      cache: 'no-store',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      }
    });

    if (!res.ok) {
      throw new Error(`365Scores API returned status ${res.status}`);
    }

    const data = await res.json();
    if (!data.games || !Array.isArray(data.games)) {
      throw new Error('365Scores returned malformed JSON structure: "games" array missing');
    }

    const cleanName = (name: string) => {
      if (!name) return '';
      return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    };

    const localMatchesRes = await pool.query('SELECT * FROM matches');
    const localMatches = localMatchesRes.rows;

    for (const game of data.games) {
      const homeName = game.homeCompetitor?.name;
      const awayName = game.awayCompetitor?.name;
      if (!homeName || !awayName) continue;

      const cleanHome = cleanName(homeName);
      const cleanAway = cleanName(awayName);

      const localMatch = localMatches.find(m => {
        const localCleanL = cleanName(m.local);
        const localCleanV = cleanName(m.visitante);
        return (localCleanL === cleanHome && localCleanV === cleanAway) ||
               (localCleanL === cleanAway && localCleanV === cleanHome);
      });

      if (!localMatch) continue;
      if (localMatch.stats?.manual_control) continue;

      let estado: 'upcoming' | 'live' | 'finished' = 'upcoming';
      if (game.statusGroup === 5 || game.statusGroup === 4) {
        estado = 'finished';
      } else if (game.statusGroup === 3) {
        estado = 'live';
      }
      // Never mark a future match as finished/live — guards against stale API data
      if (estado !== 'upcoming') {
        const kickoff = new Date(localMatch.fecha).getTime();
        if (estado === 'finished' && kickoff > Date.now()) estado = 'upcoming';
        else if (estado === 'live' && kickoff > Date.now() + 30 * 60 * 1000) estado = 'upcoming';
      }

      const isLInverted = cleanName(localMatch.local) === cleanAway;
      // 365Scores occasionally reports a match as finished before its score fields are populated,
      // which would otherwise be read as 0 and silently overwrite a real in-progress score.
      const hasScore = typeof game.homeCompetitor.score === 'number' && typeof game.awayCompetitor.score === 'number';
      const scoreHome = hasScore && game.homeCompetitor.score >= 0 ? game.homeCompetitor.score : 0;
      const scoreAway = hasScore && game.awayCompetitor.score >= 0 ? game.awayCompetitor.score : 0;

      const penalesHome = game.homeCompetitor.penaltiesScore >= 0 ? game.homeCompetitor.penaltiesScore : null;
      const penalesAway = game.awayCompetitor.penaltiesScore >= 0 ? game.awayCompetitor.penaltiesScore : null;

      const golesLocal = isLInverted ? scoreAway : scoreHome;
      const golesVisitante = isLInverted ? scoreHome : scoreAway;

      const penalesLocal = isLInverted ? penalesAway : penalesHome;
      const penalesVisitante = isLInverted ? penalesHome : penalesAway;
      const hasPenalties = penalesLocal !== null && penalesVisitante !== null;

      // Only block downgrade during live (prevents API glitch flicker); allow it when finished (fixes annulled goals)
      const isDowngrade = estado === 'live' && (golesLocal < (localMatch.goles_local || 0) || golesVisitante < (localMatch.goles_visitante || 0));
      const finalGolesLocal = (!hasScore || isDowngrade) ? (localMatch.goles_local || 0) : golesLocal;
      const finalGolesVisitante = (!hasScore || isDowngrade) ? (localMatch.goles_visitante || 0) : golesVisitante;
      estado = guardPrematureKnockoutFinish(estado, localMatch, finalGolesLocal, finalGolesVisitante, hasPenalties);

      // Track downgrade consensus across sources for auto-correction
      if (pendingDowngrades && hasScore && estado === 'live') {
        const ex = pendingDowngrades.get(localMatch.id);
        if (isDowngrade) {
          if (!ex) {
            pendingDowngrades.set(localMatch.id, { proposed_local: golesLocal, proposed_visitante: golesVisitante, agreed: 1, total: 1, conflicted: false });
          } else if (ex.proposed_local === golesLocal && ex.proposed_visitante === golesVisitante) {
            pendingDowngrades.set(localMatch.id, { ...ex, agreed: ex.agreed + 1, total: ex.total + 1 });
          } else {
            pendingDowngrades.set(localMatch.id, { ...ex, total: ex.total + 1, conflicted: true });
          }
        } else {
          pendingDowngrades.set(localMatch.id, { ...(ex ?? { proposed_local: 0, proposed_visitante: 0, agreed: 0, conflicted: false }), total: (ex?.total ?? 0) + 1 });
        }
      }

      if (estado === 'upcoming' && (localMatch.estado === 'live' || localMatch.estado === 'finished')) {
        continue;
      }

      const stateChanged = localMatch.estado !== estado;
      const scoreChanged = localMatch.goles_local !== finalGolesLocal || localMatch.goles_visitante !== finalGolesVisitante;
      const liveTime = game.gameTimeDisplay || (game.gameTime ? `${game.gameTime}'` : '') || game.statusText || '';
      const timeChanged = estado === 'live' && localMatch.stats?.time !== liveTime;

      if (!isDowngrade && scoreChanged && await isAnnulledScore(localMatch.id, finalGolesLocal, finalGolesVisitante)) continue;

      if (stateChanged || scoreChanged || timeChanged) {
        const stats = localMatch.stats || {};
        if (game.homeCompetitor.redCards !== undefined) {
          stats.red_cards_local = isLInverted ? game.awayCompetitor.redCards : game.homeCompetitor.redCards;
          stats.red_cards_visitante = isLInverted ? game.homeCompetitor.redCards : game.awayCompetitor.redCards;
        }

        if (estado === 'live') {
          stats.time = liveTime;
          const timeStr = (game.gameTimeDisplay || '').toLowerCase();
          const gameTime = game.gameTime || 0;
          if (timeStr.includes('pen') || game.statusGroup === 4) {
            stats.fase_actual = 'penales';
          } else if (timeStr.includes('et') || timeStr.includes('extra') || gameTime > 90) {
            stats.fase_actual = 'tiempo_extra';
            stats.extra_time = game.gameTimeDisplay || `${gameTime}'`;
          } else {
            stats.fase_actual = 'normal';
          }
        } else if (estado === 'finished') {
          stats.time = 'Final';
          stats.finished_at = stats.finished_at || new Date().toISOString();
        }

        if (hasPenalties) {
          stats.fase_actual = 'penales';
          stats.penales_local = penalesLocal;
          stats.penales_visitante = penalesVisitante;
          if (game.winner !== undefined) {
            stats.ganador = isLInverted 
              ? (game.winner === 1 ? localMatch.visitante : localMatch.local)
              : (game.winner === 1 ? localMatch.local : localMatch.visitante);
          }
        }

        if (!stats.possession_local && (estado === 'live' || estado === 'finished')) {
          stats.possession_local = 50;
          stats.possession_visitante = 50;
          stats.shots_local = finalGolesLocal * 4 + 4;
          stats.shots_visitante = finalGolesVisitante * 4 + 3;
          stats.fouls_local = 11;
          stats.fouls_visitante = 12;
        }

        const updateRes = await pool.query(
          `UPDATE matches 
           SET estado = $1, 
               goles_local = $2, 
               goles_visitante = $3, 
               stats = $4,
               penales_habilitados = $5,
               last_synced_at = CURRENT_TIMESTAMP, 
               updated_at = CURRENT_TIMESTAMP 
           WHERE id = $6 
           RETURNING *`,
          [estado, finalGolesLocal, finalGolesVisitante, JSON.stringify(stats), !!localMatch.penales_habilitados, localMatch.id]
        );

        const updatedMatch = updateRes.rows[0];
        updatedCount++;

        broadcastUpdate('match', updatedMatch);

        // Push + notification: match goes live
        if (estado === 'live' && localMatch.estado !== 'live') {
          const key = `live`;
          if (await markNotifSent(updatedMatch.id, key)) {
            await pool.query(
              `INSERT INTO notifications (titulo, contenido, tipo, target_type, expires_at)
               VALUES ($1, $2, 'info', 'all', NOW() + INTERVAL '3 hours')`,
              [
                `⚽ En Vivo: ${updatedMatch.local} vs ${updatedMatch.visitante}`,
                `¡El partido acaba de comenzar! Sigue el marcador en tiempo real.`
              ]
            );
            broadcastUpdate('notification', { auto: true });
            void sendPushToAllActive({
              title: `⚽ Partido en vivo: ${updatedMatch.local} vs ${updatedMatch.visitante}`,
              body: `¡El partido acaba de comenzar! Sigue el marcador en tiempo real.`,
              url: '/fixture'
            });
          }
        }

        if (estado === 'live' && scoreChanged) {
          goalsDetected++;
          recordScoreChange(localMatch, updatedMatch, '365Scores', estado);
          await routeGoalNotification(localMatch, updatedMatch, pendingGoalNotifs);
        }

        if (
          (estado === 'finished' && localMatch.estado !== 'finished') ||
          (estado === 'live' && localMatch.estado !== 'live') ||
          (scoreChanged && (estado === 'finished' || estado === 'live'))
        ) {
          if (estado === 'finished' && localMatch.estado !== 'finished') {
            finishedCount++;
            await pool.query('SELECT recalculate_leaderboard()');
            broadcastUpdate('leaderboard', { updated: true });
            await routeFinishNotification(localMatch, updatedMatch, pendingGoalNotifs);
          } else {
            await pool.query('SELECT recalculate_leaderboard()');
            broadcastUpdate('leaderboard', { updated: true });
          }
        }
      }
    }
  } catch (err: unknown) {
    console.error("365Scores sync error:", err);
    errors.push(err instanceof Error ? err.message : '365Scores unknown error');
  }

  return {
    updated: updatedCount,
    goals_detected: goalsDetected,
    finished: finishedCount,
    errors
  };
}

export async function syncApiFixture(pendingGoalNotifs?: Map<number, PendingGoalNotif>, pendingDowngrades?: Map<number, DowngradeEntry>): Promise<{
  updated: number;
  goals_detected: number;
  finished: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let updatedCount = 0;
  let goalsDetected = 0;
  let finishedCount = 0;

  try {
    const cleanName = (name: string) => {
      if (!name) return '';
      return name
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/&/g, 'y')
        .toLowerCase().trim();
    };

    // Name overrides for cases where api-fixture.com.ar uses English names
    const nameMap: Record<string, string> = {
      'bosnia & herzegovina': 'Bosnia y Herzegovina',
      'czechia': 'República Checa',
      'ivory coast': 'Costa de Marfil',
      'cape verde': 'Cabo Verde',
      'south korea': 'Corea del Sur',
      'south africa': 'Sudáfrica',
      'dr congo': 'RD Congo',
    };

    const localMatchesRes = await pool.query('SELECT * FROM matches WHERE estado IN (\'live\', \'upcoming\', \'finished\') AND fecha > NOW() - INTERVAL \'2 days\'');
    const localMatches = localMatchesRes.rows;

    // Query today and yesterday to catch late-night matches
    const dates: string[] = [];
    const now = new Date();
    for (let d = 0; d <= 1; d++) {
      const dt = new Date(now.getTime() - d * 86400000);
      dates.push(dt.toISOString().slice(0, 10));
    }

    for (const fecha of dates) {
      const res = await fetchWithRetry(`https://api-fixture.com.ar/api/mundial/cronograma?fecha=${fecha}`, { cache: 'no-store' });
      if (!res.ok) {
        errors.push(`ApiFixture returned status ${res.status} for ${fecha}`);
        continue;
      }
      type ApiFixturePartido = { local?: { nombre?: string; definido?: boolean }; visitante?: { nombre?: string; definido?: boolean }; [k: string]: unknown };
      const data = await res.json() as { partidos?: ApiFixturePartido[] };
      const partidos = data.partidos || [];

      for (const partido of partidos) {
        const rawLocal = partido.local?.nombre;
        const rawVisitante = partido.visitante?.nombre;
        if (!rawLocal || !rawVisitante || !partido.local?.definido || !partido.visitante?.definido) continue;

        const resolvedLocal = nameMap[rawLocal.toLowerCase()] ?? rawLocal;
        const resolvedVisitante = nameMap[rawVisitante.toLowerCase()] ?? rawVisitante;
        const cleanLocal = cleanName(resolvedLocal);
        const cleanVisitante = cleanName(resolvedVisitante);

        const localMatch = localMatches.find(m => {
          const cl = cleanName(m.local);
          const cv = cleanName(m.visitante);
          return (cl === cleanLocal && cv === cleanVisitante) ||
                 (cl === cleanVisitante && cv === cleanLocal);
        });
        if (!localMatch) continue;
        if (localMatch.stats?.manual_control) continue;

        const isLInverted = cleanName(localMatch.local) === cleanVisitante;

        const estatusRaw = (partido.estatus || '') as string;
        let estado: 'upcoming' | 'live' | 'finished' = 'upcoming';
        if (estatusRaw === 'Finalizado') estado = 'finished';
        else if (estatusRaw === 'En vivo') estado = 'live';
        // Never mark a future match as finished/live — guards against stale API data
        if (estado !== 'upcoming') {
          const kickoff = new Date(localMatch.fecha).getTime();
          if (estado === 'finished' && kickoff > Date.now()) estado = 'upcoming';
          else if (estado === 'live' && kickoff > Date.now() + 30 * 60 * 1000) estado = 'upcoming';
        }

        // Parse "0 - 2" score string
        const marcador = (partido.marcador || '') as string;
        const parts = marcador.split(' - ');
        const hasScore = parts.length === 2 && !isNaN(parseInt(parts[0]));
        const rawGolesLocal = hasScore ? parseInt(parts[0]) : 0;
        const rawGolesVisitante = hasScore ? parseInt(parts[1]) : 0;
        const golesLocal = isLInverted ? rawGolesVisitante : rawGolesLocal;
        const golesVisitante = isLInverted ? rawGolesLocal : rawGolesVisitante;

        const isDowngrade = estado === 'live' && (golesLocal < (localMatch.goles_local || 0) || golesVisitante < (localMatch.goles_visitante || 0));
        const finalGolesLocal = isDowngrade ? (localMatch.goles_local || 0) : golesLocal;
        const finalGolesVisitante = isDowngrade ? (localMatch.goles_visitante || 0) : golesVisitante;
        estado = guardPrematureKnockoutFinish(estado, localMatch, finalGolesLocal, finalGolesVisitante, false);

        if (pendingDowngrades && estado === 'live' && hasScore) {
          const ex = pendingDowngrades.get(localMatch.id);
          if (isDowngrade) {
            if (!ex) {
              pendingDowngrades.set(localMatch.id, { proposed_local: golesLocal, proposed_visitante: golesVisitante, agreed: 1, total: 1, conflicted: false });
            } else if (ex.proposed_local === golesLocal && ex.proposed_visitante === golesVisitante) {
              pendingDowngrades.set(localMatch.id, { ...ex, agreed: ex.agreed + 1, total: ex.total + 1 });
            } else {
              pendingDowngrades.set(localMatch.id, { ...ex, total: ex.total + 1, conflicted: true });
            }
          } else {
            pendingDowngrades.set(localMatch.id, { ...(ex ?? { proposed_local: 0, proposed_visitante: 0, agreed: 0, conflicted: false }), total: (ex?.total ?? 0) + 1 });
          }
        }

        if (estado === 'upcoming' && (localMatch.estado === 'live' || localMatch.estado === 'finished')) continue;
        if (!hasScore && estado === 'upcoming') continue;

        const stateChanged = localMatch.estado !== estado;
        const scoreChanged = hasScore && (localMatch.goles_local !== finalGolesLocal || localMatch.goles_visitante !== finalGolesVisitante);

        if (!isDowngrade && scoreChanged && await isAnnulledScore(localMatch.id, finalGolesLocal, finalGolesVisitante)) continue;

        if (stateChanged || scoreChanged) {
          const stats = localMatch.stats || {};
          if (estado === 'finished') {
            stats.finished_at = stats.finished_at || new Date().toISOString();
          }
          const updateRes = await pool.query(
            `UPDATE matches
             SET estado = $1,
                 goles_local = $2,
                 goles_visitante = $3,
                 stats = $4,
                 last_synced_at = CURRENT_TIMESTAMP,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $5
             RETURNING *`,
            [estado, hasScore ? finalGolesLocal : localMatch.goles_local, hasScore ? finalGolesVisitante : localMatch.goles_visitante, JSON.stringify(stats), localMatch.id]
          );
          const updatedMatch = updateRes.rows[0];
          updatedCount++;
          broadcastUpdate('match', updatedMatch);

          if (estado === 'live' && localMatch.estado !== 'live') {
            const key = `live`;
            if (await markNotifSent(updatedMatch.id, key)) {
              await pool.query(
                `INSERT INTO notifications (titulo, contenido, tipo, target_type, expires_at)
                 VALUES ($1, $2, 'info', 'all', NOW() + INTERVAL '3 hours')`,
                [`⚽ En Vivo: ${updatedMatch.local} vs ${updatedMatch.visitante}`, `¡El partido acaba de comenzar! Sigue el marcador en tiempo real.`]
              );
              broadcastUpdate('notification', { auto: true });
              void sendPushToAllActive({ title: `⚽ Partido en vivo: ${updatedMatch.local} vs ${updatedMatch.visitante}`, body: `¡El partido acaba de comenzar! Sigue el marcador en tiempo real.`, url: '/fixture' });
            }
          }

          if (estado === 'live' && scoreChanged) {
            goalsDetected++;
            recordScoreChange(localMatch, updatedMatch, 'ApiFixture', estado);
            await routeGoalNotification(localMatch, updatedMatch, pendingGoalNotifs);
          }

          if (estado === 'finished' && localMatch.estado !== 'finished') {
            finishedCount++;
            await pool.query('SELECT recalculate_leaderboard()');
            broadcastUpdate('leaderboard', { updated: true });
            await routeFinishNotification(localMatch, updatedMatch, pendingGoalNotifs);
          } else if (scoreChanged && (estado === 'finished' || estado === 'live')) {
            await pool.query('SELECT recalculate_leaderboard()');
            broadcastUpdate('leaderboard', { updated: true });
          }
        }
      }
    }
  } catch (err: unknown) {
    console.error('ApiFixture sync error:', err);
    errors.push(err instanceof Error ? err.message : 'ApiFixture unknown error');
  }

  return { updated: updatedCount, goals_detected: goalsDetected, finished: finishedCount, errors };
}

export async function syncFixtureDownload(pendingGoalNotifs?: Map<number, PendingGoalNotif>, pendingDowngrades?: Map<number, DowngradeEntry>): Promise<{
  updated: number;
  goals_detected: number;
  finished: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let updatedCount = 0;
  let goalsDetected = 0;
  let finishedCount = 0;

  try {
    const res = await fetchWithRetry('https://fixturedownload.com/feed/json/fifa-world-cup-2026', { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(`FixtureDownload returned status ${res.status}`);
    }
    const matchesData = await res.json();
    if (!Array.isArray(matchesData)) {
      throw new Error('FixtureDownload returned non-array JSON');
    }

    const localMatchesRes = await pool.query('SELECT * FROM matches');
    const localMatches = localMatchesRes.rows;

    const now = Date.now();

    for (const game of matchesData) {
      const homeName = teamNameMapping[game.HomeTeam] || game.HomeTeam;
      const awayName = teamNameMapping[game.AwayTeam] || game.AwayTeam;
      if (!homeName || !awayName) continue;

      // Find match in local DB
      const localMatch = localMatches.find(m => 
        (m.local === homeName && m.visitante === awayName) ||
        (m.local === awayName && m.visitante === homeName)
      );

      if (!localMatch) continue;
      if (localMatch.stats?.manual_control) continue;

      const isLInverted = localMatch.local === awayName;

      // Determine scores
      const golesLocal = isLInverted ? (game.AwayTeamScore ?? 0) : (game.HomeTeamScore ?? 0);
      const golesVisitante = isLInverted ? (game.HomeTeamScore ?? 0) : (game.AwayTeamScore ?? 0);

      // Determine state
      let estado: 'upcoming' | 'live' | 'finished' = 'upcoming';
      const matchTime = new Date(game.DateUtc).getTime();

      if (game.HomeTeamScore !== null && game.AwayTeamScore !== null) {
        if (game.Winner !== null || now - matchTime > 2.5 * 60 * 60 * 1000) {
          estado = 'finished';
        } else {
          estado = 'live';
        }
      } else if (now >= matchTime && now - matchTime <= 2.5 * 60 * 60 * 1000) {
        estado = 'live';
      }
      // Never mark a future match as finished/live — guards against stale API data
      if (estado !== 'upcoming') {
        const kickoff = new Date(localMatch.fecha).getTime();
        if (estado === 'finished' && kickoff > Date.now()) estado = 'upcoming';
        else if (estado === 'live' && kickoff > Date.now() + 30 * 60 * 1000) estado = 'upcoming';
      }

      // Only block downgrade during live (prevents API glitch flicker); allow it when finished (fixes annulled goals)
      const isDowngrade = estado === 'live' && (golesLocal < (localMatch.goles_local || 0) || golesVisitante < (localMatch.goles_visitante || 0));
      const finalGolesLocal = isDowngrade ? (localMatch.goles_local || 0) : golesLocal;
      const finalGolesVisitante = isDowngrade ? (localMatch.goles_visitante || 0) : golesVisitante;
      estado = guardPrematureKnockoutFinish(estado, localMatch, finalGolesLocal, finalGolesVisitante, false);

      // Track downgrade consensus across sources for auto-correction
      if (pendingDowngrades && estado === 'live') {
        const ex = pendingDowngrades.get(localMatch.id);
        if (isDowngrade) {
          if (!ex) {
            pendingDowngrades.set(localMatch.id, { proposed_local: golesLocal, proposed_visitante: golesVisitante, agreed: 1, total: 1, conflicted: false });
          } else if (ex.proposed_local === golesLocal && ex.proposed_visitante === golesVisitante) {
            pendingDowngrades.set(localMatch.id, { ...ex, agreed: ex.agreed + 1, total: ex.total + 1 });
          } else {
            pendingDowngrades.set(localMatch.id, { ...ex, total: ex.total + 1, conflicted: true });
          }
        } else {
          pendingDowngrades.set(localMatch.id, { ...(ex ?? { proposed_local: 0, proposed_visitante: 0, agreed: 0, conflicted: false }), total: (ex?.total ?? 0) + 1 });
        }
      }

      // Avoid downgrading finished/live to upcoming
      if (estado === 'upcoming' && (localMatch.estado === 'live' || localMatch.estado === 'finished')) {
        continue;
      }

      const stateChanged = localMatch.estado !== estado;
      const scoreChanged = localMatch.goles_local !== finalGolesLocal || localMatch.goles_visitante !== finalGolesVisitante;

      if (!isDowngrade && scoreChanged && await isAnnulledScore(localMatch.id, finalGolesLocal, finalGolesVisitante)) continue;

      if (stateChanged || scoreChanged) {
        const stats = localMatch.stats || {};
        if (estado === 'finished') {
          stats.finished_at = stats.finished_at || new Date().toISOString();
        }
        const updateRes = await pool.query(
          `UPDATE matches
           SET estado = $1,
               goles_local = $2,
               goles_visitante = $3,
               stats = $4,
               last_synced_at = CURRENT_TIMESTAMP,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $5
           RETURNING *`,
          [estado, finalGolesLocal, finalGolesVisitante, JSON.stringify(stats), localMatch.id]
        );

        const updatedMatch = updateRes.rows[0];
        updatedCount++;

        broadcastUpdate('match', updatedMatch);

        // Push + notification: match goes live
        if (estado === 'live' && localMatch.estado !== 'live') {
          const key = `live`;
          if (await markNotifSent(updatedMatch.id, key)) {
            await pool.query(
              `INSERT INTO notifications (titulo, contenido, tipo, target_type, expires_at)
               VALUES ($1, $2, 'info', 'all', NOW() + INTERVAL '3 hours')`,
              [
                `⚽ En Vivo: ${updatedMatch.local} vs ${updatedMatch.visitante}`,
                `¡El partido acaba de comenzar! Sigue el marcador en tiempo real.`
              ]
            );
            broadcastUpdate('notification', { auto: true });
            void sendPushToAllActive({
              title: `⚽ Partido en vivo: ${updatedMatch.local} vs ${updatedMatch.visitante}`,
              body: `¡El partido acaba de comenzar! Sigue el marcador en tiempo real.`,
              url: '/fixture'
            });
          }
        }

        // Goal detection
        if (estado === 'live' && scoreChanged) {
          goalsDetected++;
          recordScoreChange(localMatch, updatedMatch, 'FixtureDownload', estado);
          await routeGoalNotification(localMatch, updatedMatch, pendingGoalNotifs);
        }

        // Leaderboard recalculations
        if (
          (estado === 'finished' && localMatch.estado !== 'finished') ||
          (estado === 'live' && localMatch.estado !== 'live') ||
          (scoreChanged && (estado === 'finished' || estado === 'live'))
        ) {
          if (estado === 'finished' && localMatch.estado !== 'finished') {
            finishedCount++;
            await pool.query('SELECT recalculate_leaderboard()');
            broadcastUpdate('leaderboard', { updated: true });
            await routeFinishNotification(localMatch, updatedMatch, pendingGoalNotifs);
          } else {
            await pool.query('SELECT recalculate_leaderboard()');
            broadcastUpdate('leaderboard', { updated: true });
          }
        }
      }
    }
  } catch (err: unknown) {
    console.error("FixtureDownload sync error:", err);
    errors.push(err instanceof Error ? err.message : 'FixtureDownload unknown error');
  }

  return {
    updated: updatedCount,
    goals_detected: goalsDetected,
    finished: finishedCount,
    errors
  };
}

export async function syncESPNScoreboard(pendingGoalNotifs?: Map<number, PendingGoalNotif>, pendingDowngrades?: Map<number, DowngradeEntry>): Promise<{
  updated: number;
  goals_detected: number;
  finished: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let updatedCount = 0;
  let goalsDetected = 0;
  let finishedCount = 0;

  try {
    const res = await fetchWithRetry('https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard', {
      cache: 'no-store',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      }
    });

    if (!res.ok) {
      throw new Error(`ESPN API returned status ${res.status}`);
    }

    const data = await res.json();
    if (!data.events || !Array.isArray(data.events)) {
      throw new Error('ESPN returned malformed JSON structure: "events" array missing');
    }

    const cleanName = (name: string) => {
      if (!name) return '';
      return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    };

    const localMatchesRes = await pool.query('SELECT * FROM matches');
    const localMatches = localMatchesRes.rows;

    for (const event of data.events) {
      const comp = event.competitions && event.competitions[0];
      if (!comp || !comp.competitors) continue;

      const homeCompetitor = comp.competitors.find((c: Record<string, unknown>) => c.homeAway === 'home');
      const awayCompetitor = comp.competitors.find((c: Record<string, unknown>) => c.homeAway === 'away');
      if (!homeCompetitor || !awayCompetitor) continue;

      const homeDisplayName = homeCompetitor.team?.name || homeCompetitor.team?.displayName;
      const awayDisplayName = awayCompetitor.team?.name || awayCompetitor.team?.displayName;
      if (!homeDisplayName || !awayDisplayName) continue;

      const homeName = teamNameMapping[homeDisplayName] || homeDisplayName;
      const awayName = teamNameMapping[awayDisplayName] || awayDisplayName;

      const cleanHome = cleanName(homeName);
      const cleanAway = cleanName(awayName);

      const localMatch = localMatches.find(m => {
        const localCleanL = cleanName(m.local);
        const localCleanV = cleanName(m.visitante);
        return (localCleanL === cleanHome && localCleanV === cleanAway) ||
               (localCleanL === cleanAway && localCleanV === cleanHome);
      });

      if (!localMatch) continue;
      if (localMatch.stats?.manual_control) continue;

      let estado: 'upcoming' | 'live' | 'finished' = 'upcoming';
      const stateStr = comp.status?.type?.state;
      if (stateStr === 'post') {
        estado = 'finished';
      } else if (stateStr === 'in') {
        estado = 'live';
      }
      // Never mark a future match as finished/live — guards against stale API data
      if (estado !== 'upcoming') {
        const kickoff = new Date(localMatch.fecha).getTime();
        if (estado === 'finished' && kickoff > Date.now()) estado = 'upcoming';
        else if (estado === 'live' && kickoff > Date.now() + 30 * 60 * 1000) estado = 'upcoming';
      }

      const isLInverted = cleanName(localMatch.local) === cleanAway;
      // ESPN occasionally reports a match as finished (status "post") before its score fields
      // are populated, which would otherwise be read as 0 and silently overwrite a real in-progress score.
      const hasScore = homeCompetitor.score !== undefined && homeCompetitor.score !== null &&
        awayCompetitor.score !== undefined && awayCompetitor.score !== null &&
        !isNaN(parseInt(homeCompetitor.score)) && !isNaN(parseInt(awayCompetitor.score));
      const scoreHome = hasScore && parseInt(homeCompetitor.score) >= 0 ? parseInt(homeCompetitor.score) : 0;
      const scoreAway = hasScore && parseInt(awayCompetitor.score) >= 0 ? parseInt(awayCompetitor.score) : 0;

      const penalesHomeRaw = homeCompetitor.shootoutScore !== undefined ? parseInt(homeCompetitor.shootoutScore) : null;
      const penalesAwayRaw = awayCompetitor.shootoutScore !== undefined ? parseInt(awayCompetitor.shootoutScore) : null;
      const penalesHome = penalesHomeRaw !== null && !isNaN(penalesHomeRaw) ? penalesHomeRaw : null;
      const penalesAway = penalesAwayRaw !== null && !isNaN(penalesAwayRaw) ? penalesAwayRaw : null;

      const golesLocal = isLInverted ? scoreAway : scoreHome;
      const golesVisitante = isLInverted ? scoreHome : scoreAway;

      const penalesLocal = isLInverted ? penalesAway : penalesHome;
      const penalesVisitante = isLInverted ? penalesHome : penalesAway;
      const hasPenalties = penalesLocal !== null && penalesVisitante !== null;

      // Only block downgrade during live (prevents API glitch flicker); allow it when finished (fixes annulled goals)
      const isDowngrade = estado === 'live' && (golesLocal < (localMatch.goles_local || 0) || golesVisitante < (localMatch.goles_visitante || 0));
      const finalGolesLocal = (!hasScore || isDowngrade) ? (localMatch.goles_local || 0) : golesLocal;
      const finalGolesVisitante = (!hasScore || isDowngrade) ? (localMatch.goles_visitante || 0) : golesVisitante;
      estado = guardPrematureKnockoutFinish(estado, localMatch, finalGolesLocal, finalGolesVisitante, hasPenalties);

      // Track downgrade consensus across sources for auto-correction
      if (pendingDowngrades && hasScore && estado === 'live') {
        const ex = pendingDowngrades.get(localMatch.id);
        if (isDowngrade) {
          if (!ex) {
            pendingDowngrades.set(localMatch.id, { proposed_local: golesLocal, proposed_visitante: golesVisitante, agreed: 1, total: 1, conflicted: false });
          } else if (ex.proposed_local === golesLocal && ex.proposed_visitante === golesVisitante) {
            pendingDowngrades.set(localMatch.id, { ...ex, agreed: ex.agreed + 1, total: ex.total + 1 });
          } else {
            pendingDowngrades.set(localMatch.id, { ...ex, total: ex.total + 1, conflicted: true });
          }
        } else {
          pendingDowngrades.set(localMatch.id, { ...(ex ?? { proposed_local: 0, proposed_visitante: 0, agreed: 0, conflicted: false }), total: (ex?.total ?? 0) + 1 });
        }
      }

      if (estado === 'upcoming' && (localMatch.estado === 'live' || localMatch.estado === 'finished')) {
        continue;
      }

      const stateChanged = localMatch.estado !== estado;
      const scoreChanged = localMatch.goles_local !== finalGolesLocal || localMatch.goles_visitante !== finalGolesVisitante;
      const liveTime = comp.status?.type?.detail || comp.status?.displayClock || '';
      const detailsCountChanged = (comp.details?.length || 0) !== (localMatch.stats?.events?.length || 0);
      const timeChanged = estado === 'live' && (localMatch.stats?.time !== liveTime || detailsCountChanged);

      if (!isDowngrade && scoreChanged && await isAnnulledScore(localMatch.id, finalGolesLocal, finalGolesVisitante)) continue;

      if (stateChanged || scoreChanged || timeChanged) {
        const stats = localMatch.stats || {};
        
        if (estado === 'live') {
          stats.time = liveTime;
          const detailStr = (comp.status?.type?.detail || '').toLowerCase();
          const stateDesc = (comp.status?.type?.description || '').toLowerCase();
          if (detailStr.includes('penalties') || detailStr.includes('shootout') || detailStr.includes('pen')) {
            stats.fase_actual = 'penales';
          } else if (detailStr.includes('aet') || detailStr.includes('extra') || stateDesc.includes('extra') || stateDesc.includes('overtime')) {
            stats.fase_actual = 'tiempo_extra';
            stats.extra_time = comp.status?.type?.detail || '';
          } else {
            stats.fase_actual = 'normal';
          }
        } else if (estado === 'finished') {
          stats.time = 'Final';
        }

        // Extract detailed events (cards, goals) from ESPN scoreboard if available
        if (comp.details && Array.isArray(comp.details)) {
          const events: Record<string, unknown>[] = [];
          let yellowL = 0;
          let yellowV = 0;
          let redL = 0;
          let redV = 0;

          for (const d of comp.details) {
            const teamId = d.team?.id;
            const isHome = teamId === homeCompetitor.team?.id;
            const teamKey = isLInverted ? (isHome ? 'visitante' : 'local') : (isHome ? 'local' : 'visitante');
            
            const player = d.athletesInvolved?.[0]?.displayName || '';
            const clock = d.clock?.displayValue || '';
            
            let type = '';
            if (d.yellowCard) {
              type = 'yellow_cards';
              if (teamKey === 'local') yellowL++;
              else yellowV++;
            } else if (d.redCard) {
              type = 'red_cards';
              if (teamKey === 'local') redL++;
              else redV++;
            } else if (d.type?.text?.toLowerCase().includes('goal') || d.scoringPlay) {
              type = 'goals';
            }
            
            if (type) {
              events.push({
                type,
                team: teamKey,
                player,
                clock
              });
            }
          }
          stats.events = events;
          stats.yellow_cards_local = yellowL;
          stats.yellow_cards_visitante = yellowV;
          stats.red_cards_local = redL;
          stats.red_cards_visitante = redV;
        }
        
        // Extract competitor stats from ESPN scoreboard if available
        if (homeCompetitor.statistics && Array.isArray(homeCompetitor.statistics)) {
          const getStatVal = (comp: { statistics: { name: string; displayValue: string }[] }, name: string) => {
            const found = comp.statistics.find((s) => s.name === name);
            return found ? parseFloat(found.displayValue) || 0 : 0;
          };

          const possHome = getStatVal(homeCompetitor, 'possessionPct');
          const possAway = getStatVal(awayCompetitor, 'possessionPct');
          stats.possession_local = isLInverted ? possAway : possHome;
          stats.possession_visitante = isLInverted ? possHome : possAway;

          const shotsHome = getStatVal(homeCompetitor, 'totalShots');
          const shotsAway = getStatVal(awayCompetitor, 'totalShots');
          stats.shots_local = isLInverted ? shotsAway : shotsHome;
          stats.shots_visitante = isLInverted ? shotsHome : shotsAway;

          const shotsOTHome = getStatVal(homeCompetitor, 'shotsOnTarget');
          const shotsOTAway = getStatVal(awayCompetitor, 'shotsOnTarget');
          stats.shots_on_target_local = isLInverted ? shotsOTAway : shotsOTHome;
          stats.shots_on_target_visitante = isLInverted ? shotsOTHome : shotsOTAway;

          const foulsHome = getStatVal(homeCompetitor, 'foulsCommitted');
          const foulsAway = getStatVal(awayCompetitor, 'foulsCommitted');
          stats.fouls_local = isLInverted ? foulsAway : foulsHome;
          stats.fouls_visitante = isLInverted ? foulsHome : foulsAway;

          const cornersHome = getStatVal(homeCompetitor, 'wonCorners');
          const cornersAway = getStatVal(awayCompetitor, 'wonCorners');
          stats.corners_local = isLInverted ? cornersAway : cornersHome;
          stats.corners_visitante = isLInverted ? cornersHome : cornersAway;

          const assistsHome = getStatVal(homeCompetitor, 'goalAssists');
          const assistsAway = getStatVal(awayCompetitor, 'goalAssists');
          stats.assists_local = isLInverted ? assistsAway : assistsHome;
          stats.assists_visitante = isLInverted ? assistsHome : assistsAway;

          const shotAssistsHome = getStatVal(homeCompetitor, 'shotAssists');
          const shotAssistsAway = getStatVal(awayCompetitor, 'shotAssists');
          stats.shot_assists_local = isLInverted ? shotAssistsAway : shotAssistsHome;
          stats.shot_assists_visitante = isLInverted ? shotAssistsHome : shotAssistsAway;
        }
        
        // Try to capture some basic ESPN stats if available, or keep existing ones
        if (!stats.possession_local && (estado === 'live' || estado === 'finished')) {
          stats.possession_local = 50;
          stats.possession_visitante = 50;
          stats.shots_local = finalGolesLocal * 4 + 4;
          stats.shots_visitante = finalGolesVisitante * 4 + 3;
          stats.fouls_local = 11;
          stats.fouls_visitante = 12;
          stats.corners_local = 4;
          stats.corners_visitante = 3;
          stats.shots_on_target_local = finalGolesLocal * 2 + 1;
          stats.shots_on_target_visitante = finalGolesVisitante * 2;
          stats.assists_local = finalGolesLocal;
          stats.assists_visitante = finalGolesVisitante;
          stats.shot_assists_local = 6;
          stats.shot_assists_visitante = 5;
        }

        if (hasPenalties) {
          stats.fase_actual = 'penales';
          stats.penales_local = penalesLocal;
          stats.penales_visitante = penalesVisitante;
          if (comp.status?.type?.detail?.toLowerCase().includes('shootout') || estado === 'finished') {
            if (homeCompetitor.winner === true) {
              stats.ganador = isLInverted ? localMatch.visitante : localMatch.local;
            } else if (awayCompetitor.winner === true) {
              stats.ganador = isLInverted ? localMatch.local : localMatch.visitante;
            }
          }
        }

        const updateRes = await pool.query(
          `UPDATE matches 
           SET estado = $1, 
               goles_local = $2, 
               goles_visitante = $3, 
               stats = $4,
               penales_habilitados = $5,
               last_synced_at = CURRENT_TIMESTAMP, 
               updated_at = CURRENT_TIMESTAMP 
           WHERE id = $6 
           RETURNING *`,
          [estado, finalGolesLocal, finalGolesVisitante, JSON.stringify(stats), !!localMatch.penales_habilitados, localMatch.id]
        );

        const updatedMatch = updateRes.rows[0];
        updatedCount++;

        broadcastUpdate('match', updatedMatch);

        // Push + notification: match goes live
        if (estado === 'live' && localMatch.estado !== 'live') {
          const key = `live`;
          if (await markNotifSent(updatedMatch.id, key)) {
            await pool.query(
              `INSERT INTO notifications (titulo, contenido, tipo, target_type, expires_at)
               VALUES ($1, $2, 'info', 'all', NOW() + INTERVAL '3 hours')`,
              [
                `⚽ En Vivo: ${updatedMatch.local} vs ${updatedMatch.visitante}`,
                `¡El partido acaba de comenzar! Sigue el marcador en tiempo real.`
              ]
            );
            broadcastUpdate('notification', { auto: true });
            void sendPushToAllActive({
              title: `⚽ Partido en vivo: ${updatedMatch.local} vs ${updatedMatch.visitante}`,
              body: `¡El partido acaba de comenzar! Sigue el marcador en tiempo real.`,
              url: '/fixture'
            });
          }
        }

        if (estado === 'live' && scoreChanged) {
          goalsDetected++;
          recordScoreChange(localMatch, updatedMatch, 'ESPN', estado);
          await routeGoalNotification(localMatch, updatedMatch, pendingGoalNotifs);
        }

        if (
          (estado === 'finished' && localMatch.estado !== 'finished') ||
          (estado === 'live' && localMatch.estado !== 'live') ||
          (scoreChanged && (estado === 'finished' || estado === 'live'))
        ) {
          if (estado === 'finished' && localMatch.estado !== 'finished') {
            finishedCount++;
            await pool.query('SELECT recalculate_leaderboard()');
            broadcastUpdate('leaderboard', { updated: true });
            await routeFinishNotification(localMatch, updatedMatch, pendingGoalNotifs);
          } else {
            await pool.query('SELECT recalculate_leaderboard()');
            broadcastUpdate('leaderboard', { updated: true });
          }
        }
      }
    }
  } catch (err: unknown) {
    console.error("ESPN sync error:", err);
    errors.push(err instanceof Error ? err.message : 'ESPN unknown error');
  }

  return {
    updated: updatedCount,
    goals_detected: goalsDetected,
    finished: finishedCount,
    errors
  };
}

export async function syncFootballData(pendingGoalNotifs?: Map<number, PendingGoalNotif>, pendingDowngrades?: Map<number, DowngradeEntry>): Promise<{
  updated: number;
  goals_detected: number;
  finished: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let updatedCount = 0;
  let goalsDetected = 0;
  let finishedCount = 0;

  const apiKey = process.env.FOOTBALL_API_KEY;
  const apiBase = process.env.FOOTBALL_API_BASE || 'https://api.football-data.org/v4';
  const wcId = process.env.FOOTBALL_WC_ID || '2000';

  if (!apiKey) {
    errors.push('FOOTBALL_API_KEY is missing in env variables');
    return { updated: 0, goals_detected: 0, finished: 0, errors };
  }

  try {
    const response = await fetchWithRetry(`${apiBase}/competitions/${wcId}/matches`, {
      cache: 'no-store',
      headers: {
        'X-Auth-Token': apiKey
      }
    });

    if (!response.ok) {
      throw new Error(`API returned status ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();
    if (!data.matches || !Array.isArray(data.matches)) {
      throw new Error('API returned malformed JSON structure: "matches" array missing');
    }

    const localMatchesRes = await pool.query('SELECT * FROM matches');
    const localMatches = localMatchesRes.rows;

    for (const apiMatch of data.matches) {
      const extId = apiMatch.id;
      const status = apiMatch.status;
      const score = apiMatch.score;
      
      let estado: 'upcoming' | 'live' | 'finished' = 'upcoming';
      if (status === 'FINISHED') {
        estado = 'finished';
      } else if (['LIVE', 'IN_PLAY', 'PAUSED', 'HALFTIME'].includes(status)) {
        estado = 'live';
      }

      const localName = teamNameMapping[apiMatch.homeTeam?.name] || apiMatch.homeTeam?.name;
      const visitanteName = teamNameMapping[apiMatch.awayTeam?.name] || apiMatch.awayTeam?.name;
      const faseName = stageMapping[apiMatch.stage] || apiMatch.stage;

      const localMatch = localMatches.find(m => 
        m.external_id === extId || 
        (m.local === localName && m.visitante === visitanteName && (m.fase === faseName || (faseName === 'Fase de Grupos' && m.fase === null)))
      );

      if (!localMatch) {
        continue;
      }

      if (localMatch.stats?.manual_control) {
        continue;
      }
      // Never mark a future match as finished/live — guards against stale API data
      if (estado !== 'upcoming') {
        const kickoff = new Date(localMatch.fecha).getTime();
        if (estado === 'finished' && kickoff > Date.now()) estado = 'upcoming';
        else if (estado === 'live' && kickoff > Date.now() + 30 * 60 * 1000) estado = 'upcoming';
      }

      if (localMatch.external_id !== extId) {
        await pool.query('UPDATE matches SET external_id = $1 WHERE id = $2', [extId, localMatch.id]);
        localMatch.external_id = extId;
      }

      // Update team names and logos from the API if they are different
      if (localName && visitanteName && (localMatch.local !== localName || localMatch.visitante !== visitanteName)) {
        const logoLocal = `/uploads/flags/${localName.toLowerCase().replace(/ /g, '_')}.png`;
        const logoVisitante = `/uploads/flags/${visitanteName.toLowerCase().replace(/ /g, '_')}.png`;
        await pool.query(
          `UPDATE matches 
           SET local = $1, visitante = $2, logo_local = $3, logo_visitante = $4, updated_at = CURRENT_TIMESTAMP 
           WHERE id = $5`,
          [localName, visitanteName, logoLocal, logoVisitante, localMatch.id]
        );
        localMatch.local = localName;
        localMatch.visitante = visitanteName;
        localMatch.logo_local = logoLocal;
        localMatch.logo_visitante = logoVisitante;
      }

      let golesLocal = score?.fullTime?.home ?? 0;
      let golesVisitante = score?.fullTime?.away ?? 0;

      let penalesLocal = null;
      let penalesVisitante = null;

      if (score?.duration === 'PENALTY_SHOOTOUT' || (score?.penalties?.home !== null && score?.penalties?.home !== undefined)) {
        const regularLocal = score?.extraTime?.home ?? score?.fullTime?.home ?? 1;
        const regularVisitante = score?.extraTime?.away ?? score?.fullTime?.away ?? 1;
        
        penalesLocal = score?.penalties?.home !== undefined ? score.penalties.home : null;
        penalesVisitante = score?.penalties?.away !== undefined ? score.penalties.away : null;

        golesLocal = regularLocal;
        golesVisitante = regularVisitante;
      }

      const hasPenalties = penalesLocal !== null && penalesVisitante !== null;

      // Only block downgrade during live (prevents API glitch flicker); allow it when finished (fixes annulled goals)
      const isDowngrade = estado === 'live' && (golesLocal < (localMatch.goles_local || 0) || golesVisitante < (localMatch.goles_visitante || 0));
      const finalGolesLocal = isDowngrade ? (localMatch.goles_local || 0) : golesLocal;
      const finalGolesVisitante = isDowngrade ? (localMatch.goles_visitante || 0) : golesVisitante;
      estado = guardPrematureKnockoutFinish(estado, localMatch, finalGolesLocal, finalGolesVisitante, hasPenalties);

      // Track downgrade consensus across sources for auto-correction
      if (pendingDowngrades && estado === 'live') {
        const ex = pendingDowngrades.get(localMatch.id);
        if (isDowngrade) {
          if (!ex) {
            pendingDowngrades.set(localMatch.id, { proposed_local: golesLocal, proposed_visitante: golesVisitante, agreed: 1, total: 1, conflicted: false });
          } else if (ex.proposed_local === golesLocal && ex.proposed_visitante === golesVisitante) {
            pendingDowngrades.set(localMatch.id, { ...ex, agreed: ex.agreed + 1, total: ex.total + 1 });
          } else {
            pendingDowngrades.set(localMatch.id, { ...ex, total: ex.total + 1, conflicted: true });
          }
        } else {
          pendingDowngrades.set(localMatch.id, { ...(ex ?? { proposed_local: 0, proposed_visitante: 0, agreed: 0, conflicted: false }), total: (ex?.total ?? 0) + 1 });
        }
      }

      if (estado === 'upcoming' && (localMatch.estado === 'live' || localMatch.estado === 'finished')) {
        continue;
      }

      const stateChanged = localMatch.estado !== estado;
      const scoreChanged = localMatch.goles_local !== finalGolesLocal || localMatch.goles_visitante !== finalGolesVisitante;

      if (!isDowngrade && scoreChanged && await isAnnulledScore(localMatch.id, finalGolesLocal, finalGolesVisitante)) continue;

      if (stateChanged || scoreChanged) {
        const stats = localMatch.stats ? { ...localMatch.stats } : {};
        if (estado === 'finished') {
          stats.finished_at = stats.finished_at || new Date().toISOString();
        }

        if (estado === 'live') {
          if (apiMatch.score?.duration === 'PENALTY_SHOOTOUT') {
            stats.fase_actual = 'penales';
          } else if (apiMatch.score?.duration === 'EXTRA_TIME') {
            stats.fase_actual = 'tiempo_extra';
          } else {
            stats.fase_actual = 'normal';
          }
        }

        if (hasPenalties) {
          stats.fase_actual = 'penales';
          stats.penales_local = penalesLocal;
          stats.penales_visitante = penalesVisitante;
          if (score.winner) {
            stats.ganador = score.winner === 'HOME_TEAM' ? localMatch.local : localMatch.visitante;
          }
        }

        const updateRes = await pool.query(
          `UPDATE matches 
           SET estado = $1, 
               goles_local = $2, 
               goles_visitante = $3, 
               stats = $4,
               penales_habilitados = $5,
               last_synced_at = CURRENT_TIMESTAMP, 
               updated_at = CURRENT_TIMESTAMP 
           WHERE id = $6 
           RETURNING *`,
          [estado, finalGolesLocal, finalGolesVisitante, JSON.stringify(stats), !!localMatch.penales_habilitados, localMatch.id]
        );

        const updatedMatch = updateRes.rows[0];
        updatedCount++;

        broadcastUpdate('match', updatedMatch);

        if (estado === 'live' && localMatch.estado !== 'live') {
          const key = `live`;
          if (await markNotifSent(updatedMatch.id, key)) {
            await pool.query(
              `INSERT INTO notifications (titulo, contenido, tipo, target_type, expires_at)
               VALUES ($1, $2, 'info', 'all', NOW() + INTERVAL '3 hours')`,
              [
                `⚽ En Vivo: ${updatedMatch.local} vs ${updatedMatch.visitante}`,
                `¡El partido acaba de comenzar! Sigue el marcador en tiempo real.`
              ]
            );
            broadcastUpdate('notification', { auto: true });
            void sendPushToAllActive({
              title: `⚽ Partido en vivo: ${updatedMatch.local} vs ${updatedMatch.visitante}`,
              body: `¡El partido acaba de comenzar! Sigue el marcador en tiempo real.`,
              url: '/fixture'
            });
          }
        }

        if (estado === 'live' && scoreChanged) {
          goalsDetected++;
          recordScoreChange(localMatch, updatedMatch, 'FootballData', estado);
          await routeGoalNotification(localMatch, updatedMatch, pendingGoalNotifs);
        }

        if (
          (estado === 'finished' && localMatch.estado !== 'finished') ||
          (estado === 'live' && localMatch.estado !== 'live') ||
          (scoreChanged && (estado === 'finished' || estado === 'live'))
        ) {
          if (estado === 'finished' && localMatch.estado !== 'finished') {
            finishedCount++;
            await pool.query('SELECT recalculate_leaderboard()');
            broadcastUpdate('leaderboard', { updated: true });
            await routeFinishNotification(localMatch, updatedMatch, pendingGoalNotifs);
          } else {
            await pool.query('SELECT recalculate_leaderboard()');
            broadcastUpdate('leaderboard', { updated: true });
          }
        }
      }
    }
  } catch (err: unknown) {
    errors.push(err instanceof Error ? err.message : 'FootballData unknown error');
    console.error("FootballData source exception:", err);
  }

  return {
    updated: updatedCount,
    goals_detected: goalsDetected,
    finished: finishedCount,
    errors
  };
}

async function ensureGroupStandingsTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS group_standings (
      id SERIAL PRIMARY KEY,
      grupo VARCHAR(10) NOT NULL,
      posicion INTEGER NOT NULL,
      team VARCHAR(100) NOT NULL,
      pts INTEGER DEFAULT 0,
      pj INTEGER DEFAULT 0,
      pg INTEGER DEFAULT 0,
      pe INTEGER DEFAULT 0,
      pp INTEGER DEFAULT 0,
      gf INTEGER DEFAULT 0,
      gc INTEGER DEFAULT 0,
      dif INTEGER DEFAULT 0,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(grupo, team)
    )
  `).catch(() => {});
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS group_standings_grupo_posicion ON group_standings(grupo, posicion)
  `).catch(() => {});
}

export async function syncGroupStandings(): Promise<void> {
  const apiKey = process.env.FOOTBALL_API_KEY;
  const apiBase = process.env.FOOTBALL_API_BASE || 'https://api.football-data.org/v4';
  const wcId = process.env.FOOTBALL_WC_ID || '2000';

  if (!apiKey) return;

  try {
    await ensureGroupStandingsTable();

    const response = await fetchWithRetry(`${apiBase}/competitions/${wcId}/standings`, {
      cache: 'no-store',
      headers: { 'X-Auth-Token': apiKey }
    });

    if (!response.ok) {
      console.error(`syncGroupStandings: API returned ${response.status}`);
      return;
    }

    const data = await response.json();
    if (!data.standings || !Array.isArray(data.standings)) return;

    for (const standing of data.standings) {
      // API returns type="TOTAL" with group="Group A", "Group B", etc.
      if (standing.type !== 'TOTAL') continue;

      // "Group A" → "A", "Group B" → "B", etc.
      const raw = (standing.group as string) || '';
      const grupo = raw.replace(/^Group\s+/i, '').trim();
      if (!grupo || grupo.length !== 1 || !/[A-L]/.test(grupo)) continue;

      for (const entry of (standing.table || [])) {
        const rawName: string = entry.team?.name || entry.team?.shortName || '';
        const teamName = teamNameMapping[rawName] || rawName;
        if (!teamName) continue;

        await pool.query(`
          INSERT INTO group_standings (grupo, posicion, team, pts, pj, pg, pe, pp, gf, gc, dif, updated_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, CURRENT_TIMESTAMP)
          ON CONFLICT (grupo, team) DO UPDATE SET
            posicion = EXCLUDED.posicion,
            pts = EXCLUDED.pts, pj = EXCLUDED.pj, pg = EXCLUDED.pg,
            pe = EXCLUDED.pe, pp = EXCLUDED.pp,
            gf = EXCLUDED.gf, gc = EXCLUDED.gc, dif = EXCLUDED.dif,
            updated_at = CURRENT_TIMESTAMP
        `, [
          grupo, entry.position, teamName,
          entry.points ?? 0, entry.playedGames ?? 0,
          entry.won ?? 0, entry.draw ?? 0, entry.lost ?? 0,
          entry.goalsFor ?? 0, entry.goalsAgainst ?? 0, entry.goalDifference ?? 0
        ]);
      }
    }

    logSystem('info', 'SYNC', 'Group standings sincronizadas desde football-data.org', '').catch(() => {});
  } catch (err: unknown) {
    console.error('syncGroupStandings error:', err);
  }
}

async function reconcileDowngrades(observed: Map<number, DowngradeEntry>): Promise<void> {
  for (const [matchId, entry] of observed) {
    const isFullConsensus = !entry.conflicted && entry.agreed > 0 && entry.agreed === entry.total && entry.total >= 2;
    if (isFullConsensus) {
      // All sources agree on the same lower score — record as pending
      await pool.query(
        `INSERT INTO pending_downgrades (match_id, proposed_local, proposed_visitante, sources_agreed, total_sources)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (match_id) DO UPDATE SET
           proposed_local      = CASE WHEN pending_downgrades.proposed_local = EXCLUDED.proposed_local AND pending_downgrades.proposed_visitante = EXCLUDED.proposed_visitante THEN pending_downgrades.proposed_local ELSE EXCLUDED.proposed_local END,
           proposed_visitante  = CASE WHEN pending_downgrades.proposed_local = EXCLUDED.proposed_local AND pending_downgrades.proposed_visitante = EXCLUDED.proposed_visitante THEN pending_downgrades.proposed_visitante ELSE EXCLUDED.proposed_visitante END,
           sources_agreed      = EXCLUDED.sources_agreed,
           total_sources       = EXCLUDED.total_sources,
           created_at          = CASE WHEN pending_downgrades.proposed_local = EXCLUDED.proposed_local AND pending_downgrades.proposed_visitante = EXCLUDED.proposed_visitante THEN pending_downgrades.created_at ELSE CURRENT_TIMESTAMP END,
           applied             = FALSE
         WHERE pending_downgrades.applied = FALSE`,
        [matchId, entry.proposed_local, entry.proposed_visitante, entry.agreed, entry.total]
      ).catch(() => {});
    } else if (entry.agreed < entry.total || entry.conflicted) {
      // Sources disagree → cancel any pending downgrade
      await pool.query(
        'DELETE FROM pending_downgrades WHERE match_id = $1 AND applied = FALSE',
        [matchId]
      ).catch(() => {});
    }
  }
}

const MANUAL_CONTROL_TIMEOUT_MS = 5 * 60 * 1000;

// Un-freezes matches left in manual_control after a correction, once 5 minutes pass
// with no further manual change, so external sources resume updating them automatically.
// Finished matches are excluded on purpose: those stay frozen until a superadmin
// explicitly reopens them for árbitros (see /api/matches open_for_arbitros).
async function clearExpiredManualControl(): Promise<void> {
  const res = await pool.query(
    `SELECT id, local, visitante, stats FROM matches
     WHERE estado != 'finished'
       AND stats->>'manual_control' = 'true'
       AND stats->>'manual_control_at' IS NOT NULL
       AND (stats->>'manual_control_at')::timestamptz <= NOW() - INTERVAL '5 minutes'`
  ).catch(() => ({ rows: [] }));

  for (const row of res.rows) {
    const stats = row.stats || {};
    delete stats.manual_control;
    delete stats.manual_control_at;
    await pool.query(
      'UPDATE matches SET stats = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [JSON.stringify(stats), row.id]
    ).catch(() => {});
    logSystem('info', 'SYNC',
      `Control manual expirado: ${row.local} vs ${row.visitante}`,
      `Sin cambios en ${MANUAL_CONTROL_TIMEOUT_MS / 60000} min — sync automático reanudado`
    ).catch(() => {});
  }
}

async function applyConfirmedDowngrades(): Promise<void> {
  const pending = await pool.query(
    `SELECT pd.*, m.local, m.visitante, m.goles_local, m.goles_visitante, m.estado, m.updated_at AS match_updated
     FROM pending_downgrades pd
     JOIN matches m ON m.id = pd.match_id
     WHERE pd.applied = FALSE
       AND pd.created_at <= NOW() - INTERVAL '2 minutes'
       AND m.estado = 'live'`
  ).catch(() => ({ rows: [] }));

  for (const row of pending.rows) {
    // Skip if current score is already at or below proposed (already fixed)
    if ((row.goles_local ?? 0) <= row.proposed_local && (row.goles_visitante ?? 0) <= row.proposed_visitante) {
      await pool.query('UPDATE pending_downgrades SET applied = TRUE WHERE id = $1', [row.id]).catch(() => {});
      continue;
    }

    // Skip if an árbitro already corrected this match since the downgrade was first seen
    const arbitroFix = await pool.query(
      `SELECT 1 FROM score_change_log WHERE match_id = $1 AND source = 'ARBITRO' AND created_at > $2 LIMIT 1`,
      [row.match_id, row.created_at]
    ).catch(() => ({ rows: [] }));
    if (arbitroFix.rows.length > 0) {
      await pool.query('UPDATE pending_downgrades SET applied = TRUE WHERE id = $1', [row.id]).catch(() => {});
      continue;
    }

    // Apply the automatic correction
    const updateRes = await pool.query(
      `UPDATE matches SET goles_local = $1, goles_visitante = $2,
         stats = COALESCE(stats, '{}' ::jsonb) || jsonb_build_object('manual_control', true, 'manual_control_at', $4::text),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 RETURNING *`,
      [row.proposed_local, row.proposed_visitante, row.match_id, new Date().toISOString()]
    ).catch(() => ({ rows: [] }));

    if (!updateRes.rows.length) continue;
    const updated = updateRes.rows[0];

    await pool.query('UPDATE pending_downgrades SET applied = TRUE WHERE id = $1', [row.id]).catch(() => {});

    broadcastUpdate('match', updated);
    broadcastUpdate('goal', {
      matchId: updated.id, local: updated.local, visitante: updated.visitante,
      goles_local: updated.goles_local, goles_visitante: updated.goles_visitante,
    });

    const annulledTeam = row.proposed_local < (row.goles_local ?? 0) ? updated.local : updated.visitante;
    const title = `🚫 Gol Anulado — ${annulledTeam}`;
    const body = `${updated.local} ${updated.goles_local} - ${updated.goles_visitante} ${updated.visitante}`;

    await pool.query(
      `INSERT INTO notifications (titulo, contenido, tipo, target_type, expires_at)
       VALUES ($1,$2,'warn','all', NOW() + INTERVAL '3 hours')`,
      [title, body]
    ).catch(() => {});
    broadcastUpdate('notification', { auto: true });
    void sendPushToAllActive({ title, body, url: '/fixture' });

    pool.query(
      `INSERT INTO score_change_log (match_id, source, old_goles_local, old_goles_visitante, new_goles_local, new_goles_visitante, estado)
       VALUES ($1,'AUTO',$2,$3,$4,$5,$6)`,
      [row.match_id, row.goles_local ?? 0, row.goles_visitante ?? 0, row.proposed_local, row.proposed_visitante, updated.estado]
    ).catch(() => {});

    logSystem('warn', 'SYNC',
      `[AUTO] Gol anulado aplicado: ${updated.local} vs ${updated.visitante}`,
      `${row.goles_local ?? 0}-${row.goles_visitante ?? 0} → ${updated.goles_local}-${updated.goles_visitante} | Consenso: ${row.sources_agreed}/${row.total_sources} fuentes | 2min sin corrección de árbitro`
    ).catch(() => {});
  }
}

async function flushPendingNotifications(pending: Map<number, PendingGoalNotif>): Promise<void> {
  for (const [, notif] of pending) {
    if (notif.isFinished) {
      const finKey = `finished`;
      if (await markNotifSent(notif.matchId, finKey)) {
        await pool.query(
          `INSERT INTO notifications (titulo, contenido, tipo, target_type, expires_at)
           VALUES ($1,$2,'info','all', NOW() + INTERVAL '24 hours')`,
          [
            `🏁 Resultado: ${notif.local} ${notif.golesLocal} - ${notif.golesVisitante} ${notif.visitante}`,
            `¡Partido terminado! La tabla de clasificación ha sido actualizada. Consulta tu posición en Ranking.`
          ]
        );
        broadcastUpdate('notification', { auto: true });
        void sendPushToAllActive({
          title: `🏁 Resultado final: ${notif.local} ${notif.golesLocal} - ${notif.golesVisitante} ${notif.visitante}`,
          body: `¡Partido terminado! La tabla de clasificación ha sido actualizada.`,
          url: '/ranking'
        });
        logSystem('info', 'SYNC',
          `Push enviado (finished): ${notif.local} ${notif.golesLocal}-${notif.golesVisitante} ${notif.visitante}`,
          `Score final confirmado tras todas las fuentes`
        ).catch(() => {});
      }
    } else {
      const goalKey = `goal_${notif.golesLocal}_${notif.golesVisitante}`;
      if (await markNotifSent(notif.matchId, goalKey)) {
        const scoringTeam = notif.golesLocal > notif.baselineGolesLocal
          ? notif.local : notif.visitante;
        await pool.query(
          `INSERT INTO notifications (titulo, contenido, tipo, target_type, expires_at)
           VALUES ($1,$2,'success','all', NOW() + INTERVAL '3 hours')`,
          [
            `🥅 ¡GOL de ${scoringTeam}!`,
            `${notif.local} ${notif.golesLocal} - ${notif.golesVisitante} ${notif.visitante}`
          ]
        );
        broadcastUpdate('notification', { auto: true });
        void sendPushToAllActive({
          title: `🥅 ¡GOL de ${scoringTeam}!`,
          body: `${notif.local} ${notif.golesLocal} - ${notif.golesVisitante} ${notif.visitante}`,
          url: '/fixture'
        });
        logSystem('info', 'SYNC',
          `Push enviado (gol): ${notif.local} ${notif.golesLocal}-${notif.golesVisitante} ${notif.visitante}`,
          `Key: ${goalKey} | Score final confirmado tras todas las fuentes`
        ).catch(() => {});
      }
    }
  }
}

export async function syncMatches(): Promise<{
  updated: number;
  goals_detected: number;
  finished: number;
  errors: string[];
  duration_ms: number;
}> {
  const startTime = Date.now();
  const errors: string[] = [];
  let updatedCount = 0;
  let goalsDetected = 0;
  let finishedCount = 0;

  const SYNC_ENABLED = process.env.SYNC_ENABLED !== 'false';
  if (!SYNC_ENABLED) {
    return { updated: 0, goals_detected: 0, finished: 0, errors: ['Auto-sync is disabled via env'], duration_ms: 0 };
  }

  // Distributed lock: only one worker runs sync at a time
  const lockId = 20260624;
  const lockRes = await pool.query('SELECT pg_try_advisory_lock($1) AS acquired', [lockId]);
  if (!lockRes.rows[0]?.acquired) {
    return { updated: 0, goals_detected: 0, finished: 0, errors: ['sync already in progress'], duration_ms: 0 };
  }

  try {
  // Send reminders for upcoming matches (60 min and 30 min before kickoff)
  await sendUpcomingReminders();

  // Auto-resume sync for live/upcoming matches frozen by a manual correction 5+ min ago.
  // Finished matches are excluded — those stay frozen until reopened for árbitros.
  await clearExpiredManualControl();

  // Apply confirmed downgrades older than 2 minutes (no árbitro correction needed)
  await applyConfirmedDowngrades();

  // Accumulators: goal notifs + downgrade consensus tracking
  const pendingGoalNotifs = new Map<number, PendingGoalNotif>();
  const pendingDowngrades = new Map<number, DowngradeEntry>();

  // Run all sources sequentially to avoid race conditions and database contentions
  // FixtureDownload removed: only had static fixture data, never contributed live score changes
  const sources: Array<{ name: string; fn: (m: Map<number, PendingGoalNotif>, d: Map<number, DowngradeEntry>) => Promise<{ updated: number; goals_detected: number; finished: number; errors: string[] }> }> = [
    { name: '365Scores', fn: sync365Scores },
    { name: 'ESPN', fn: syncESPNScoreboard },
    { name: 'ApiFixture', fn: syncApiFixture },
  ];

  const apiKey = process.env.FOOTBALL_API_KEY;
  if (apiKey) {
    sources.push({ name: 'FootballData', fn: syncFootballData });
  }

  for (const source of sources) {
    try {
      const val = await source.fn(pendingGoalNotifs, pendingDowngrades);
      updatedCount += val.updated;
      goalsDetected += val.goals_detected;
      finishedCount += val.finished;
      if (val.errors && val.errors.length > 0) {
        errors.push(...val.errors.map(err => `[${source.name}] ${err}`));
      }
    } catch (err: unknown) {
      errors.push(`[${source.name}] Sync failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Record or dismiss downgrade consensus results
  await reconcileDowngrades(pendingDowngrades);

  // Fire ONE push notification per match using the final confirmed score
  await flushPendingNotifications(pendingGoalNotifs);

  // Sync official standings every cycle (uses official tiebreakers from football-data.org)
  await syncGroupStandings();

  // Propagate knockout results: Cuartos → Semis → Final/Tercer Puesto (isPlaceholder guard).
  await runKnockoutCascade();

  if (finishedCount > 0) {
    const { runBackup } = await import('./backup');
    runBackup('incremental').catch(err => {
      console.error('[Sync Backup Error] Failed to execute incremental backup post-match:', err);
    });
  }


  // Log sync attempt in DB
  const durationMs = Date.now() - startTime;
  await pool.query(
    `INSERT INTO sync_log (synced_at, matches_updated, goals_detected, matches_finished, errors, duration_ms)
     VALUES (CURRENT_TIMESTAMP, $1, $2, $3, $4, $5)`,
    [updatedCount, goalsDetected, finishedCount, errors, durationMs]
  );

  return {
    updated: updatedCount,
    goals_detected: goalsDetected,
    finished: finishedCount,
    errors,
    duration_ms: durationMs
  };
  } finally {
    await pool.query('SELECT pg_advisory_unlock($1)', [lockId]);
  }
}

async function sendUpcomingReminders() {
  try {
    const closeSettingRes = await pool.query("SELECT value FROM settings WHERE key = 'prediction_close_minutes'");
    const closeMinutes = closeSettingRes.rows.length > 0 ? parseInt(closeSettingRes.rows[0].value, 10) || 15 : 15;

    // Find upcoming matches starting in 50-100 minutes (covers both 60min and 90min windows)
    const res = await pool.query(
      `SELECT id, local, visitante, fecha FROM matches
       WHERE estado = 'upcoming'
         AND fecha > NOW() + INTERVAL '50 minutes'
         AND fecha < NOW() + INTERVAL '100 minutes'`
    );

    for (const match of res.rows) {
      const minutesUntil = Math.round((new Date(match.fecha).getTime() - Date.now()) / 60000);

      if (minutesUntil >= 85 && minutesUntil <= 95) {
        // 90-minute reminder (1:30 antes)
        const key90 = `reminder_90`;
        if (await markNotifSent(match.id, key90)) {
          // Insert notification record for in-app notification tab
          await pool.query(
            `INSERT INTO notifications (titulo, contenido, tipo, target_type, expires_at)
             VALUES ($1, $2, 'info', 'all', NOW() + INTERVAL '4 hours')`,
            [
              `⏰ Próximo partido en 1 hora y 30 minutos`,
              `${match.local} vs ${match.visitante} comienza en aproximadamente 1 hora y 30 minutos. ¡No olvides hacer tu pronóstico! Las apuestas se cierran ${closeMinutes} minutos antes del inicio.`
            ]
          );
          void sendPushToUsersWithoutPrediction(match.id, {
            title: `⏰ Pronóstico pendiente – ${match.local} vs ${match.visitante}`,
            body: `El partido inicia en ~90 minutos. Recuerda que las apuestas cierran ${closeMinutes} minutos antes.`,
            url: '/partidos'
          });
        }
      } else if (minutesUntil >= 55 && minutesUntil <= 65) {
        // 60-minute reminder (1 hora antes)
        const key60 = `reminder_60`;
        if (await markNotifSent(match.id, key60)) {
          // Insert notification record for in-app notification tab
          await pool.query(
            `INSERT INTO notifications (titulo, contenido, tipo, target_type, expires_at)
             VALUES ($1, $2, 'warning', 'all', NOW() + INTERVAL '3 hours')`,
            [
              `⏰ Próximo partido en 1 hora`,
              `${match.local} vs ${match.visitante} comienza en aproximadamente 60 minutos. ¡No olvides hacer tu pronóstico! Las apuestas se cierran ${closeMinutes} minutos antes del inicio.`
            ]
          );
          void sendPushToUsersWithoutPrediction(match.id, {
            title: `⏰ Pronóstico pendiente – ${match.local} vs ${match.visitante}`,
            body: `El partido inicia en ~60 minutos. ¡Últimos minutos para apostar (cierra ${closeMinutes} min antes)!`,
            url: '/partidos'
          });
        }
      }
    }
  } catch (err: unknown) {
    console.error('sendUpcomingReminders error:', err);
  }
}

export async function runKnockoutCascade() {
  try {
    await ensureGroupStandingsTable();

    // 1. Build group standings
    const groups = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
    const groupStandings: { [group: string]: string[] } = {};

    const dbStandingsRes = await pool.query(
      'SELECT grupo, posicion, team FROM group_standings ORDER BY grupo, posicion ASC'
    ).catch(() => ({ rows: [] as { grupo: string; posicion: number; team: string }[] }));

    if (dbStandingsRes.rows.length > 0) {
      for (const row of dbStandingsRes.rows) {
        if (!groupStandings[row.grupo]) groupStandings[row.grupo] = [];
        groupStandings[row.grupo][row.posicion - 1] = row.team;
      }
    } else {
      // Fallback: compute from raw match goals
      const res = await pool.query("SELECT * FROM matches WHERE fase = 'Fase de Grupos'");
      const matches = res.rows;
      const completedGroups = groups.filter(g => {
        const gm = matches.filter(m => m.grupo === g);
        return gm.length > 0 && gm.every(m => m.estado === 'finished');
      });
      for (const g of completedGroups) {
        const groupMatches = matches.filter(m => m.grupo === g);
        const teamsMap: { [team: string]: { pts: number; gd: number; gf: number } } = {};
        groupMatches.forEach(m => {
          if (!teamsMap[m.local]) teamsMap[m.local] = { pts: 0, gd: 0, gf: 0 };
          if (!teamsMap[m.visitante]) teamsMap[m.visitante] = { pts: 0, gd: 0, gf: 0 };
          const gl = m.goles_local, gv = m.goles_visitante;
          teamsMap[m.local].gf += gl; teamsMap[m.visitante].gf += gv;
          teamsMap[m.local].gd += (gl - gv); teamsMap[m.visitante].gd += (gv - gl);
          if (gl > gv) { teamsMap[m.local].pts += 3; }
          else if (gl < gv) { teamsMap[m.visitante].pts += 3; }
          else { teamsMap[m.local].pts += 1; teamsMap[m.visitante].pts += 1; }
        });
        groupStandings[g] = Object.keys(teamsMap).sort((a, b) => {
          const ta = teamsMap[a], tb = teamsMap[b];
          if (tb.pts !== ta.pts) return tb.pts - ta.pts;
          if (tb.gd !== ta.gd) return tb.gd - ta.gd;
          if (tb.gf !== ta.gf) return tb.gf - ta.gf;
          return a.localeCompare(b);
        });
      }
    }

    // Helper to get winner
    type KnockoutMatch = { estado?: string; goles_local?: number | null; goles_visitante?: number | null; local?: string; visitante?: string; stats?: { ganador?: string } } | null;
    const getWinner = (m: KnockoutMatch) => {
      if (!m || m.estado !== 'finished') return null;
      const gl = m.goles_local ?? -1, gv = m.goles_visitante ?? -1;
      if (gl > gv) return m.local;
      if (gl < gv) return m.visitante;
      return m.stats?.ganador || m.visitante;
    };

    // Helper to get loser
    const getLoser = (m: KnockoutMatch) => {
      if (!m || m.estado !== 'finished') return null;
      const gl = m.goles_local ?? -1, gv = m.goles_visitante ?? -1;
      if (gl < gv) return m.local;
      if (gl > gv) return m.visitante;
      if (m.stats?.ganador === m.local) return m.visitante;
      return m.local;
    };

    // Helper to update match teams in DB if changed
    const isPlaceholder = (name: string) => /^(Ganador|Perdedor)\s+/i.test(name || '');

    // Only replace a team slot if it's currently a placeholder — never overwrite admin-set names
    const updateMatchTeams = async (matchId: number, newLocal: string | null | undefined, newVisitante: string | null | undefined) => {
      const res = await pool.query('SELECT id, local, visitante FROM matches WHERE id = $1', [matchId]);
      if (res.rows.length === 0) return;
      const current = res.rows[0];
      const finalLocal = (newLocal && isPlaceholder(current.local)) ? newLocal : current.local;
      const finalVisitante = (newVisitante && isPlaceholder(current.visitante)) ? newVisitante : current.visitante;
      if (finalLocal !== current.local || finalVisitante !== current.visitante) {
        const logoLocal = `/uploads/flags/${finalLocal.toLowerCase().replace(/ /g, '_')}.png`;
        const logoVisitante = `/uploads/flags/${finalVisitante.toLowerCase().replace(/ /g, '_')}.png`;
        const updateRes = await pool.query(
          `UPDATE matches
           SET local = $1, visitante = $2, logo_local = $3, logo_visitante = $4, updated_at = CURRENT_TIMESTAMP
           WHERE id = $5 RETURNING *`,
          [finalLocal, finalVisitante, logoLocal, logoVisitante, matchId]
        );
        broadcastUpdate('match', updateRes.rows[0]);
      }
    };

    const r32Rows = (await pool.query("SELECT * FROM matches WHERE fase = 'Ronda de 32' ORDER BY fecha ASC, id ASC")).rows;

    // 3. Propagate Ronda de 32 → Octavos de Final
    // FIFA 2026 crossing bracket: within each group of 4 R32 matches, 1st plays 4th and 2nd plays 3rd
    // Oct[i]: R32[crossL] winner vs R32[crossV] winner
    const R32_TO_OCT: [number, number][] = [
      [0, 3], [1, 2],   // group 1: R32 matches 1-4
      [4, 7], [5, 6],   // group 2: R32 matches 5-8
      [8, 11], [9, 10], // group 3: R32 matches 9-12
      [12, 15], [13, 14], // group 4: R32 matches 13-16
    ];

    const octRows = (await pool.query("SELECT * FROM matches WHERE fase = 'Octavos de Final' ORDER BY fecha ASC, id ASC")).rows;
    for (let i = 0; i < octRows.length; i++) {
      const [li, vi] = R32_TO_OCT[i] ?? [2 * i, 2 * i + 1];
      await updateMatchTeams(octRows[i].id, getWinner(r32Rows[li] ?? null), getWinner(r32Rows[vi] ?? null));
    }

    const octRowsUpdated = (await pool.query("SELECT * FROM matches WHERE fase = 'Octavos de Final' ORDER BY fecha ASC, id ASC")).rows;

    // 4. Propagate Octavos → Cuartos de Final (consecutive pairs within bracket halves)
    const OCT_TO_CUARTOS: [number, number][] = [
      [0, 1], [2, 3], [4, 5], [6, 7],
    ];
    const cuartosRows = (await pool.query("SELECT * FROM matches WHERE fase = 'Cuartos de Final' ORDER BY fecha ASC, id ASC")).rows;
    for (let i = 0; i < cuartosRows.length; i++) {
      const [li, vi] = OCT_TO_CUARTOS[i] ?? [2 * i, 2 * i + 1];
      await updateMatchTeams(cuartosRows[i].id, getWinner(octRowsUpdated[li] ?? null), getWinner(octRowsUpdated[vi] ?? null));
    }

    const cuartosRowsUpdated = (await pool.query("SELECT * FROM matches WHERE fase = 'Cuartos de Final' ORDER BY fecha ASC, id ASC")).rows;

    // 5. Propagate Cuartos → Semifinal
    const semiRows = (await pool.query("SELECT * FROM matches WHERE fase = 'Semifinal' ORDER BY fecha ASC, id ASC")).rows;
    for (let i = 0; i < semiRows.length; i++) {
      await updateMatchTeams(semiRows[i].id, getWinner(cuartosRowsUpdated[2 * i] ?? null), getWinner(cuartosRowsUpdated[2 * i + 1] ?? null));
    }

    const semiRowsUpdated = (await pool.query("SELECT * FROM matches WHERE fase = 'Semifinal' ORDER BY fecha ASC, id ASC")).rows;

    // 6. Propagate Semis → Final and Tercer Puesto
    const finalRows = (await pool.query("SELECT * FROM matches WHERE fase = 'Final' ORDER BY fecha ASC, id ASC")).rows;
    if (finalRows.length > 0) {
      await updateMatchTeams(finalRows[0].id, getWinner(semiRowsUpdated[0] ?? null), getWinner(semiRowsUpdated[1] ?? null));
    }

    const tercerRows = (await pool.query("SELECT * FROM matches WHERE fase = 'Tercer Puesto' ORDER BY fecha ASC, id ASC")).rows;
    if (tercerRows.length > 0) {
      await updateMatchTeams(tercerRows[0].id, getLoser(semiRowsUpdated[0] ?? null), getLoser(semiRowsUpdated[1] ?? null));
    }

  } catch (error) {
    console.error('Error running knockout cascade calculation:', error);
  }
}
