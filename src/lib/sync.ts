import pool from './db';
import { broadcastUpdate } from './realtime';
import { sendPushToAllActive, sendPushToUsersWithoutPrediction } from './push';
import { logSystem } from './mail';

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

async function notifSent(matchId: number, event: string): Promise<boolean> {
  const res = await pool.query(
    'SELECT 1 FROM match_notif_log WHERE match_id = $1 AND event = $2',
    [matchId, event]
  );
  return res.rows.length > 0;
}

async function markNotifSent(matchId: number, event: string): Promise<boolean> {
  const res = await pool.query(
    'INSERT INTO match_notif_log (match_id, event) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING 1',
    [matchId, event]
  );
  return res.rows.length > 0;
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
    const res = await fetch(url, {
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

      let estado: 'upcoming' | 'live' | 'finished' = 'upcoming';
      if (game.statusGroup === 5 || game.statusGroup === 4) {
        estado = 'finished';
      } else if (game.statusGroup === 3) {
        estado = 'live';
      }

      const isLInverted = cleanName(localMatch.local) === cleanAway;
      const scoreHome = game.homeCompetitor.score >= 0 ? game.homeCompetitor.score : 0;
      const scoreAway = game.awayCompetitor.score >= 0 ? game.awayCompetitor.score : 0;

      const golesLocal = isLInverted ? scoreAway : scoreHome;
      const golesVisitante = isLInverted ? scoreHome : scoreAway;

      // Only block downgrade during live (prevents API glitch flicker); allow it when finished (fixes annulled goals)
      const isDowngrade = estado === 'live' && (golesLocal < (localMatch.goles_local || 0) || golesVisitante < (localMatch.goles_visitante || 0));
      const finalGolesLocal = isDowngrade ? (localMatch.goles_local || 0) : golesLocal;
      const finalGolesVisitante = isDowngrade ? (localMatch.goles_visitante || 0) : golesVisitante;

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
      const liveTime = game.gameTimeDisplay || (game.gameTime ? `${game.gameTime}'` : '') || game.statusText || '';
      const timeChanged = estado === 'live' && localMatch.stats?.time !== liveTime;

      if (stateChanged || scoreChanged || timeChanged) {
        const stats = localMatch.stats || {};
        if (game.homeCompetitor.redCards !== undefined) {
          stats.red_cards_local = isLInverted ? game.awayCompetitor.redCards : game.homeCompetitor.redCards;
          stats.red_cards_visitante = isLInverted ? game.homeCompetitor.redCards : game.awayCompetitor.redCards;
        }

        if (estado === 'live') {
          stats.time = liveTime;
        } else if (estado === 'finished') {
          stats.time = 'Final';
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

        if (estado === 'live' && scoreChanged) {
          goalsDetected++;
          broadcastUpdate('goal', {
            matchId: updatedMatch.id,
            local: updatedMatch.local,
            visitante: updatedMatch.visitante,
            goles_local: updatedMatch.goles_local,
            goles_visitante: updatedMatch.goles_visitante
          });

          logSystem('info', 'SYNC',
            `[365Scores] Gol detectado: ${updatedMatch.local} vs ${updatedMatch.visitante}`,
            `${localMatch.goles_local ?? 0}-${localMatch.goles_visitante ?? 0} → ${updatedMatch.goles_local}-${updatedMatch.goles_visitante}`
          ).catch(() => {});
          pool.query(
            `INSERT INTO score_change_log (match_id, source, old_goles_local, old_goles_visitante, new_goles_local, new_goles_visitante, estado) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
            [localMatch.id, '365Scores', localMatch.goles_local ?? 0, localMatch.goles_visitante ?? 0, updatedMatch.goles_local, updatedMatch.goles_visitante, estado]
          ).catch(() => {});

          if (pendingGoalNotifs) {
            const existing = pendingGoalNotifs.get(updatedMatch.id);
            pendingGoalNotifs.set(updatedMatch.id, {
              matchId: updatedMatch.id,
              local: updatedMatch.local,
              visitante: updatedMatch.visitante,
              golesLocal: updatedMatch.goles_local,
              golesVisitante: updatedMatch.goles_visitante,
              baselineGolesLocal: existing?.baselineGolesLocal ?? (localMatch.goles_local || 0),
              baselineGolesVisitante: existing?.baselineGolesVisitante ?? (localMatch.goles_visitante || 0),
              isFinished: existing?.isFinished ?? false,
            });
          } else {
            const goalKey = `goal_${updatedMatch.goles_local}_${updatedMatch.goles_visitante}`;
            if (await markNotifSent(updatedMatch.id, goalKey)) {
              const scoringTeam = updatedMatch.goles_local > (localMatch.goles_local || 0)
                ? updatedMatch.local : updatedMatch.visitante;
              await pool.query(
                `INSERT INTO notifications (titulo, contenido, tipo, target_type, expires_at)
                 VALUES ($1, $2, 'success', 'all', NOW() + INTERVAL '3 hours')`,
                [
                  `🥅 ¡GOL de ${scoringTeam}!`,
                  `${updatedMatch.local} ${updatedMatch.goles_local} - ${updatedMatch.goles_visitante} ${updatedMatch.visitante}`
                ]
              );
              broadcastUpdate('notification', { auto: true });
              void sendPushToAllActive({
                title: `🥅 ¡GOL de ${scoringTeam}!`,
                body: `${updatedMatch.local} ${updatedMatch.goles_local} - ${updatedMatch.goles_visitante} ${updatedMatch.visitante}`,
                url: '/fixture'
              });
            }
          }
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
            if (pendingGoalNotifs) {
              const existing = pendingGoalNotifs.get(updatedMatch.id);
              pendingGoalNotifs.set(updatedMatch.id, {
                matchId: updatedMatch.id,
                local: updatedMatch.local,
                visitante: updatedMatch.visitante,
                golesLocal: updatedMatch.goles_local,
                golesVisitante: updatedMatch.goles_visitante,
                baselineGolesLocal: existing?.baselineGolesLocal ?? (localMatch.goles_local || 0),
                baselineGolesVisitante: existing?.baselineGolesVisitante ?? (localMatch.goles_visitante || 0),
                isFinished: true,
              });
            } else {
              const finKey = `finished`;
              if (await markNotifSent(updatedMatch.id, finKey)) {
                await pool.query(
                  `INSERT INTO notifications (titulo, contenido, tipo, target_type, expires_at)
                   VALUES ($1, $2, 'info', 'all', NOW() + INTERVAL '24 hours')`,
                  [
                    `🏁 Resultado: ${updatedMatch.local} ${updatedMatch.goles_local} - ${updatedMatch.goles_visitante} ${updatedMatch.visitante}`,
                    `¡Partido terminado! La tabla de clasificación ha sido actualizada. Consulta tu posición en Ranking.`
                  ]
                );
                broadcastUpdate('notification', { auto: true });
                void sendPushToAllActive({
                  title: `🏁 Resultado final: ${updatedMatch.local} ${updatedMatch.goles_local} - ${updatedMatch.goles_visitante} ${updatedMatch.visitante}`,
                  body: `¡Partido terminado! La tabla de clasificación ha sido actualizada.`,
                  url: '/ranking'
                });
              }
            }
          } else {
            await pool.query('SELECT recalculate_leaderboard()');
            broadcastUpdate('leaderboard', { updated: true });
          }
        }
      }
    }
  } catch (err: any) {
    console.error("365Scores sync error:", err);
    errors.push(err.message || '365Scores unknown error');
  }

  return {
    updated: updatedCount,
    goals_detected: goalsDetected,
    finished: finishedCount,
    errors
  };
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
    const res = await fetch('https://fixturedownload.com/feed/json/fifa-world-cup-2026', { cache: 'no-store' });
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

      // Only block downgrade during live (prevents API glitch flicker); allow it when finished (fixes annulled goals)
      const isDowngrade = estado === 'live' && (golesLocal < (localMatch.goles_local || 0) || golesVisitante < (localMatch.goles_visitante || 0));
      const finalGolesLocal = isDowngrade ? (localMatch.goles_local || 0) : golesLocal;
      const finalGolesVisitante = isDowngrade ? (localMatch.goles_visitante || 0) : golesVisitante;

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

      if (stateChanged || scoreChanged) {
        const stats = localMatch.stats || {};
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
          broadcastUpdate('goal', {
            matchId: updatedMatch.id,
            local: updatedMatch.local,
            visitante: updatedMatch.visitante,
            goles_local: updatedMatch.goles_local,
            goles_visitante: updatedMatch.goles_visitante
          });

          logSystem('info', 'SYNC',
            `[FixtureDownload] Gol detectado: ${updatedMatch.local} vs ${updatedMatch.visitante}`,
            `${localMatch.goles_local ?? 0}-${localMatch.goles_visitante ?? 0} → ${updatedMatch.goles_local}-${updatedMatch.goles_visitante}`
          ).catch(() => {});
          pool.query(
            `INSERT INTO score_change_log (match_id, source, old_goles_local, old_goles_visitante, new_goles_local, new_goles_visitante, estado) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
            [localMatch.id, 'FixtureDownload', localMatch.goles_local ?? 0, localMatch.goles_visitante ?? 0, updatedMatch.goles_local, updatedMatch.goles_visitante, estado]
          ).catch(() => {});

          if (pendingGoalNotifs) {
            const existing = pendingGoalNotifs.get(updatedMatch.id);
            pendingGoalNotifs.set(updatedMatch.id, {
              matchId: updatedMatch.id,
              local: updatedMatch.local,
              visitante: updatedMatch.visitante,
              golesLocal: updatedMatch.goles_local,
              golesVisitante: updatedMatch.goles_visitante,
              baselineGolesLocal: existing?.baselineGolesLocal ?? (localMatch.goles_local || 0),
              baselineGolesVisitante: existing?.baselineGolesVisitante ?? (localMatch.goles_visitante || 0),
              isFinished: existing?.isFinished ?? false,
            });
          } else {
            const goalKey = `goal_${updatedMatch.goles_local}_${updatedMatch.goles_visitante}`;
            if (await markNotifSent(updatedMatch.id, goalKey)) {
              const scoringTeam = updatedMatch.goles_local > (localMatch.goles_local || 0)
                ? updatedMatch.local : updatedMatch.visitante;
              await pool.query(
                `INSERT INTO notifications (titulo, contenido, tipo, target_type, expires_at)
                 VALUES ($1, $2, 'success', 'all', NOW() + INTERVAL '3 hours')`,
                [
                  `🥅 ¡GOL de ${scoringTeam}!`,
                  `${updatedMatch.local} ${updatedMatch.goles_local} - ${updatedMatch.goles_visitante} ${updatedMatch.visitante}`
                ]
              );
              broadcastUpdate('notification', { auto: true });
              void sendPushToAllActive({
                title: `🥅 ¡GOL de ${scoringTeam}!`,
                body: `${updatedMatch.local} ${updatedMatch.goles_local} - ${updatedMatch.goles_visitante} ${updatedMatch.visitante}`,
                url: '/fixture'
              });
            }
          }
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
            if (pendingGoalNotifs) {
              const existing = pendingGoalNotifs.get(updatedMatch.id);
              pendingGoalNotifs.set(updatedMatch.id, {
                matchId: updatedMatch.id,
                local: updatedMatch.local,
                visitante: updatedMatch.visitante,
                golesLocal: updatedMatch.goles_local,
                golesVisitante: updatedMatch.goles_visitante,
                baselineGolesLocal: existing?.baselineGolesLocal ?? (localMatch.goles_local || 0),
                baselineGolesVisitante: existing?.baselineGolesVisitante ?? (localMatch.goles_visitante || 0),
                isFinished: true,
              });
            } else {
              const finKey = `finished`;
              if (await markNotifSent(updatedMatch.id, finKey)) {
                await pool.query(
                  `INSERT INTO notifications (titulo, contenido, tipo, target_type, expires_at)
                   VALUES ($1, $2, 'info', 'all', NOW() + INTERVAL '24 hours')`,
                  [
                    `🏁 Resultado: ${updatedMatch.local} ${updatedMatch.goles_local} - ${updatedMatch.goles_visitante} ${updatedMatch.visitante}`,
                    `¡Partido terminado! La tabla de clasificación ha sido actualizada. Consulta tu posición en Ranking.`
                  ]
                );
                broadcastUpdate('notification', { auto: true });
                void sendPushToAllActive({
                  title: `🏁 Resultado final: ${updatedMatch.local} ${updatedMatch.goles_local} - ${updatedMatch.goles_visitante} ${updatedMatch.visitante}`,
                  body: `¡Partido terminado! La tabla de clasificación ha sido actualizada.`,
                  url: '/ranking'
                });
              }
            }
          } else {
            await pool.query('SELECT recalculate_leaderboard()');
            broadcastUpdate('leaderboard', { updated: true });
          }
        }
      }
    }
  } catch (err: any) {
    console.error("FixtureDownload sync error:", err);
    errors.push(err.message || 'FixtureDownload unknown error');
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
    const res = await fetch('https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard', {
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

      const homeCompetitor = comp.competitors.find((c: any) => c.homeAway === 'home');
      const awayCompetitor = comp.competitors.find((c: any) => c.homeAway === 'away');
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

      let estado: 'upcoming' | 'live' | 'finished' = 'upcoming';
      const stateStr = comp.status?.type?.state;
      if (stateStr === 'post') {
        estado = 'finished';
      } else if (stateStr === 'in') {
        estado = 'live';
      }

      const isLInverted = cleanName(localMatch.local) === cleanAway;
      const scoreHome = parseInt(homeCompetitor.score) >= 0 ? parseInt(homeCompetitor.score) : 0;
      const scoreAway = parseInt(awayCompetitor.score) >= 0 ? parseInt(awayCompetitor.score) : 0;

      const golesLocal = isLInverted ? scoreAway : scoreHome;
      const golesVisitante = isLInverted ? scoreHome : scoreAway;

      // Only block downgrade during live (prevents API glitch flicker); allow it when finished (fixes annulled goals)
      const isDowngrade = estado === 'live' && (golesLocal < (localMatch.goles_local || 0) || golesVisitante < (localMatch.goles_visitante || 0));
      const finalGolesLocal = isDowngrade ? (localMatch.goles_local || 0) : golesLocal;
      const finalGolesVisitante = isDowngrade ? (localMatch.goles_visitante || 0) : golesVisitante;

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
      const liveTime = comp.status?.type?.detail || comp.status?.displayClock || '';
      const detailsCountChanged = (comp.details?.length || 0) !== (localMatch.stats?.events?.length || 0);
      const timeChanged = estado === 'live' && (localMatch.stats?.time !== liveTime || detailsCountChanged);

      if (stateChanged || scoreChanged || timeChanged) {
        const stats = localMatch.stats || {};
        
        if (estado === 'live') {
          stats.time = liveTime;
        } else if (estado === 'finished') {
          stats.time = 'Final';
        }

        // Extract detailed events (cards, goals) from ESPN scoreboard if available
        if (comp.details && Array.isArray(comp.details)) {
          const events: any[] = [];
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
          const getStatVal = (comp: any, name: string) => {
            const found = comp.statistics.find((s: any) => s.name === name);
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

        if (estado === 'live' && scoreChanged) {
          goalsDetected++;
          broadcastUpdate('goal', {
            matchId: updatedMatch.id,
            local: updatedMatch.local,
            visitante: updatedMatch.visitante,
            goles_local: updatedMatch.goles_local,
            goles_visitante: updatedMatch.goles_visitante
          });

          logSystem('info', 'SYNC',
            `[ESPN] Gol detectado: ${updatedMatch.local} vs ${updatedMatch.visitante}`,
            `${localMatch.goles_local ?? 0}-${localMatch.goles_visitante ?? 0} → ${updatedMatch.goles_local}-${updatedMatch.goles_visitante}`
          ).catch(() => {});
          pool.query(
            `INSERT INTO score_change_log (match_id, source, old_goles_local, old_goles_visitante, new_goles_local, new_goles_visitante, estado) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
            [localMatch.id, 'ESPN', localMatch.goles_local ?? 0, localMatch.goles_visitante ?? 0, updatedMatch.goles_local, updatedMatch.goles_visitante, estado]
          ).catch(() => {});

          if (pendingGoalNotifs) {
            const existing = pendingGoalNotifs.get(updatedMatch.id);
            pendingGoalNotifs.set(updatedMatch.id, {
              matchId: updatedMatch.id,
              local: updatedMatch.local,
              visitante: updatedMatch.visitante,
              golesLocal: updatedMatch.goles_local,
              golesVisitante: updatedMatch.goles_visitante,
              baselineGolesLocal: existing?.baselineGolesLocal ?? (localMatch.goles_local || 0),
              baselineGolesVisitante: existing?.baselineGolesVisitante ?? (localMatch.goles_visitante || 0),
              isFinished: existing?.isFinished ?? false,
            });
          } else {
            const goalKey = `goal_${updatedMatch.goles_local}_${updatedMatch.goles_visitante}`;
            if (await markNotifSent(updatedMatch.id, goalKey)) {
              const scoringTeam = updatedMatch.goles_local > (localMatch.goles_local || 0)
                ? updatedMatch.local : updatedMatch.visitante;
              await pool.query(
                `INSERT INTO notifications (titulo, contenido, tipo, target_type, expires_at)
                 VALUES ($1, $2, 'success', 'all', NOW() + INTERVAL '3 hours')`,
                [
                  `🥅 ¡GOL de ${scoringTeam}!`,
                  `${updatedMatch.local} ${updatedMatch.goles_local} - ${updatedMatch.goles_visitante} ${updatedMatch.visitante}`
                ]
              );
              broadcastUpdate('notification', { auto: true });
              void sendPushToAllActive({
                title: `🥅 ¡GOL de ${scoringTeam}!`,
                body: `${updatedMatch.local} ${updatedMatch.goles_local} - ${updatedMatch.goles_visitante} ${updatedMatch.visitante}`,
                url: '/fixture'
              });
            }
          }
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
            if (pendingGoalNotifs) {
              const existing = pendingGoalNotifs.get(updatedMatch.id);
              pendingGoalNotifs.set(updatedMatch.id, {
                matchId: updatedMatch.id,
                local: updatedMatch.local,
                visitante: updatedMatch.visitante,
                golesLocal: updatedMatch.goles_local,
                golesVisitante: updatedMatch.goles_visitante,
                baselineGolesLocal: existing?.baselineGolesLocal ?? (localMatch.goles_local || 0),
                baselineGolesVisitante: existing?.baselineGolesVisitante ?? (localMatch.goles_visitante || 0),
                isFinished: true,
              });
            } else {
              const finKey = `finished`;
              if (await markNotifSent(updatedMatch.id, finKey)) {
                await pool.query(
                  `INSERT INTO notifications (titulo, contenido, tipo, target_type, expires_at)
                   VALUES ($1, $2, 'info', 'all', NOW() + INTERVAL '24 hours')`,
                  [
                    `🏁 Resultado: ${updatedMatch.local} ${updatedMatch.goles_local} - ${updatedMatch.goles_visitante} ${updatedMatch.visitante}`,
                    `¡Partido terminado! La tabla de clasificación ha sido actualizada. Consulta tu posición en Ranking.`
                  ]
                );
                broadcastUpdate('notification', { auto: true });
                void sendPushToAllActive({
                  title: `🏁 Resultado final: ${updatedMatch.local} ${updatedMatch.goles_local} - ${updatedMatch.goles_visitante} ${updatedMatch.visitante}`,
                  body: `¡Partido terminado! La tabla de clasificación ha sido actualizada.`,
                  url: '/ranking'
                });
              }
            }
          } else {
            await pool.query('SELECT recalculate_leaderboard()');
            broadcastUpdate('leaderboard', { updated: true });
          }
        }
      }
    }
  } catch (err: any) {
    console.error("ESPN sync error:", err);
    errors.push(err.message || 'ESPN unknown error');
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
    const response = await fetch(`${apiBase}/competitions/${wcId}/matches`, {
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

      const golesLocal = score?.fullTime?.home !== null ? score.fullTime.home : 0;
      const golesVisitante = score?.fullTime?.away !== null ? score.fullTime.away : 0;

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

      if (localMatch.external_id !== extId) {
        await pool.query('UPDATE matches SET external_id = $1 WHERE id = $2', [extId, localMatch.id]);
        localMatch.external_id = extId;
      }

      // Only block downgrade during live (prevents API glitch flicker); allow it when finished (fixes annulled goals)
      const isDowngrade = estado === 'live' && (golesLocal < (localMatch.goles_local || 0) || golesVisitante < (localMatch.goles_visitante || 0));
      const finalGolesLocal = isDowngrade ? (localMatch.goles_local || 0) : golesLocal;
      const finalGolesVisitante = isDowngrade ? (localMatch.goles_visitante || 0) : golesVisitante;

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

      if (stateChanged || scoreChanged) {
        const stats = apiMatch.stats || {};
        
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
          broadcastUpdate('goal', {
            matchId: updatedMatch.id,
            local: updatedMatch.local,
            visitante: updatedMatch.visitante,
            goles_local: updatedMatch.goles_local,
            goles_visitante: updatedMatch.goles_visitante
          });

          logSystem('info', 'SYNC',
            `[FootballData] Gol detectado: ${updatedMatch.local} vs ${updatedMatch.visitante}`,
            `${localMatch.goles_local ?? 0}-${localMatch.goles_visitante ?? 0} → ${updatedMatch.goles_local}-${updatedMatch.goles_visitante}`
          ).catch(() => {});
          pool.query(
            `INSERT INTO score_change_log (match_id, source, old_goles_local, old_goles_visitante, new_goles_local, new_goles_visitante, estado) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
            [localMatch.id, 'FootballData', localMatch.goles_local ?? 0, localMatch.goles_visitante ?? 0, updatedMatch.goles_local, updatedMatch.goles_visitante, estado]
          ).catch(() => {});

          if (pendingGoalNotifs) {
            const existing = pendingGoalNotifs.get(updatedMatch.id);
            pendingGoalNotifs.set(updatedMatch.id, {
              matchId: updatedMatch.id,
              local: updatedMatch.local,
              visitante: updatedMatch.visitante,
              golesLocal: updatedMatch.goles_local,
              golesVisitante: updatedMatch.goles_visitante,
              baselineGolesLocal: existing?.baselineGolesLocal ?? (localMatch.goles_local || 0),
              baselineGolesVisitante: existing?.baselineGolesVisitante ?? (localMatch.goles_visitante || 0),
              isFinished: existing?.isFinished ?? false,
            });
          } else {
            const goalKey = `goal_${updatedMatch.goles_local}_${updatedMatch.goles_visitante}`;
            if (await markNotifSent(updatedMatch.id, goalKey)) {
              const scoringTeam = updatedMatch.goles_local > (localMatch.goles_local || 0)
                ? updatedMatch.local : updatedMatch.visitante;
              await pool.query(
                `INSERT INTO notifications (titulo, contenido, tipo, target_type, expires_at)
                 VALUES ($1, $2, 'success', 'all', NOW() + INTERVAL '3 hours')`,
                [
                  `🥅 ¡GOL de ${scoringTeam}!`,
                  `${updatedMatch.local} ${updatedMatch.goles_local} - ${updatedMatch.goles_visitante} ${updatedMatch.visitante}`
                ]
              );
              broadcastUpdate('notification', { auto: true });
              void sendPushToAllActive({
                title: `🥅 ¡GOL de ${scoringTeam}!`,
                body: `${updatedMatch.local} ${updatedMatch.goles_local} - ${updatedMatch.goles_visitante} ${updatedMatch.visitante}`,
                url: '/fixture'
              });
            }
          }
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
            if (pendingGoalNotifs) {
              const existing = pendingGoalNotifs.get(updatedMatch.id);
              pendingGoalNotifs.set(updatedMatch.id, {
                matchId: updatedMatch.id,
                local: updatedMatch.local,
                visitante: updatedMatch.visitante,
                golesLocal: updatedMatch.goles_local,
                golesVisitante: updatedMatch.goles_visitante,
                baselineGolesLocal: existing?.baselineGolesLocal ?? (localMatch.goles_local || 0),
                baselineGolesVisitante: existing?.baselineGolesVisitante ?? (localMatch.goles_visitante || 0),
                isFinished: true,
              });
            } else {
              const finKey = `finished`;
              if (await markNotifSent(updatedMatch.id, finKey)) {
                await pool.query(
                  `INSERT INTO notifications (titulo, contenido, tipo, target_type, expires_at)
                   VALUES ($1, $2, 'info', 'all', NOW() + INTERVAL '24 hours')`,
                  [
                    `🏁 Resultado: ${updatedMatch.local} ${updatedMatch.goles_local} - ${updatedMatch.goles_visitante} ${updatedMatch.visitante}`,
                    `¡Partido terminado! La tabla de clasificación ha sido actualizada. Consulta tu posición en Ranking.`
                  ]
                );
                broadcastUpdate('notification', { auto: true });
                void sendPushToAllActive({
                  title: `🏁 Resultado final: ${updatedMatch.local} ${updatedMatch.goles_local} - ${updatedMatch.goles_visitante} ${updatedMatch.visitante}`,
                  body: `¡Partido terminado! La tabla de clasificación ha sido actualizada.`,
                  url: '/ranking'
                });
              }
            }
          } else {
            await pool.query('SELECT recalculate_leaderboard()');
            broadcastUpdate('leaderboard', { updated: true });
          }
        }
      }
    }
  } catch (err: any) {
    errors.push(err.message || 'FootballData unknown error');
    console.error("FootballData source exception:", err);
  }

  return {
    updated: updatedCount,
    goals_detected: goalsDetected,
    finished: finishedCount,
    errors
  };
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
      `UPDATE matches SET goles_local = $1, goles_visitante = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 RETURNING *`,
      [row.proposed_local, row.proposed_visitante, row.match_id]
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

  // Send reminders for upcoming matches (60 min and 30 min before kickoff)
  await sendUpcomingReminders();

  // Ensure score audit table exists (created once, silent on subsequent calls)
  pool.query(`
    CREATE TABLE IF NOT EXISTS score_change_log (
      id SERIAL PRIMARY KEY,
      match_id INTEGER REFERENCES matches(id) ON DELETE CASCADE,
      source VARCHAR(50) NOT NULL,
      old_goles_local INTEGER,
      old_goles_visitante INTEGER,
      new_goles_local INTEGER NOT NULL,
      new_goles_visitante INTEGER NOT NULL,
      estado VARCHAR(20) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_scl_match_id ON score_change_log(match_id);
    CREATE INDEX IF NOT EXISTS idx_scl_created_at ON score_change_log(created_at DESC);
  `).catch(() => {});

  // Ensure pending_downgrades table exists
  pool.query(`
    CREATE TABLE IF NOT EXISTS pending_downgrades (
      id SERIAL PRIMARY KEY,
      match_id INTEGER REFERENCES matches(id) ON DELETE CASCADE UNIQUE,
      proposed_local INTEGER NOT NULL,
      proposed_visitante INTEGER NOT NULL,
      sources_agreed INTEGER NOT NULL DEFAULT 0,
      total_sources INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      applied BOOLEAN DEFAULT FALSE
    )
  `).catch(() => {});

  // Apply confirmed downgrades older than 2 minutes (no árbitro correction needed)
  await applyConfirmedDowngrades();

  // Accumulators: goal notifs + downgrade consensus tracking
  const pendingGoalNotifs = new Map<number, PendingGoalNotif>();
  const pendingDowngrades = new Map<number, DowngradeEntry>();

  // Run all sources sequentially to avoid race conditions and database contentions
  const sources: Array<{ name: string; fn: (m: Map<number, PendingGoalNotif>, d: Map<number, DowngradeEntry>) => Promise<{ updated: number; goals_detected: number; finished: number; errors: string[] }> }> = [
    { name: 'ESPN', fn: syncESPNScoreboard },
    { name: '365Scores', fn: sync365Scores },
    { name: 'FixtureDownload', fn: syncFixtureDownload }
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
    } catch (err: any) {
      errors.push(`[${source.name}] Sync failed: ${err?.message || err}`);
    }
  }

  // Record or dismiss downgrade consensus results
  await reconcileDowngrades(pendingDowngrades);

  // Fire ONE push notification per match using the final confirmed score
  await flushPendingNotifications(pendingGoalNotifs);

  if (updatedCount > 0) {
    await runKnockoutCascade();
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
  } catch (err: any) {
    console.error('sendUpcomingReminders error:', err);
  }
}

async function runKnockoutCascade() {
  try {
    // 1. Get all matches for "Fase de Grupos"
    const res = await pool.query("SELECT * FROM matches WHERE fase = 'Fase de Grupos'");
    const matches = res.rows;
    
    const groups = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
    const completedGroups: string[] = [];
    
    for (const g of groups) {
      const groupMatches = matches.filter(m => m.grupo === g);
      if (groupMatches.length > 0 && groupMatches.every(m => m.estado === 'finished')) {
        completedGroups.push(g);
      }
    }
    
    // 2. For each completed group, compute standings
    const groupStandings: { [group: string]: string[] } = {}; 
    for (const g of completedGroups) {
      const groupMatches = matches.filter(m => m.grupo === g);
      const teamsMap: { [team: string]: { pts: number, gd: number, gf: number } } = {};
      
      groupMatches.forEach(m => {
        if (!teamsMap[m.local]) teamsMap[m.local] = { pts: 0, gd: 0, gf: 0 };
        if (!teamsMap[m.visitante]) teamsMap[m.visitante] = { pts: 0, gd: 0, gf: 0 };
        
        const gl = m.goles_local;
        const gv = m.goles_visitante;
        teamsMap[m.local].gf += gl;
        teamsMap[m.visitante].gf += gv;
        teamsMap[m.local].gd += (gl - gv);
        teamsMap[m.visitante].gd += (gv - gl);
        
        if (gl > gv) {
          teamsMap[m.local].pts += 3;
        } else if (gl < gv) {
          teamsMap[m.visitante].pts += 3;
        } else {
          teamsMap[m.local].pts += 1;
          teamsMap[m.visitante].pts += 1;
        }
      });
      
      const sortedTeams = Object.keys(teamsMap).sort((a, b) => {
        const ta = teamsMap[a];
        const tb = teamsMap[b];
        if (tb.pts !== ta.pts) return tb.pts - ta.pts;
        if (tb.gd !== ta.gd) return tb.gd - ta.gd;
        if (tb.gf !== ta.gf) return tb.gf - ta.gf;
        return a.localeCompare(b);
      });
      groupStandings[g] = sortedTeams;
    }
    
    // 3. Update placeholders in subsequent stages
    const knockoutRes = await pool.query("SELECT * FROM matches WHERE fase != 'Fase de Grupos' AND estado = 'upcoming'");
    
    for (const match of knockoutRes.rows) {
      let updatedLocal = match.local;
      let updatedVisitante = match.visitante;
      let changed = false;
      
      // Check local placeholder (e.g. '1A')
      const matchLocalPlaceholder = match.local.match(/^([1-3])([A-L])$/);
      if (matchLocalPlaceholder) {
        const pos = parseInt(matchLocalPlaceholder[1]) - 1; 
        const grp = matchLocalPlaceholder[2];
        if (groupStandings[grp] && groupStandings[grp][pos]) {
          updatedLocal = groupStandings[grp][pos];
          changed = true;
        }
      }
      
      // Check visitante placeholder (e.g. '2B')
      const matchVisitantePlaceholder = match.visitante.match(/^([1-3])([A-L])$/);
      if (matchVisitantePlaceholder) {
        const pos = parseInt(matchVisitantePlaceholder[1]) - 1;
        const grp = matchVisitantePlaceholder[2];
        if (groupStandings[grp] && groupStandings[grp][pos]) {
          updatedVisitante = groupStandings[grp][pos];
          changed = true;
        }
      }

      // Check best 3rd places (e.g. '3C/D/E')
      if (match.local.startsWith('3') && match.local.includes('/')) {
        const grps = match.local.replace('3', '').split('/');
        for (const grp of grps) {
          if (groupStandings[grp] && groupStandings[grp][2]) {
            updatedLocal = groupStandings[grp][2];
            changed = true;
            break;
          }
        }
      }
      if (match.visitante.startsWith('3') && match.visitante.includes('/')) {
        const grps = match.visitante.replace('3', '').split('/');
        for (const grp of grps) {
          if (groupStandings[grp] && groupStandings[grp][2]) {
            updatedVisitante = groupStandings[grp][2];
            changed = true;
            break;
          }
        }
      }
      
      // Check 'Ganador R32-X'
      const localR32Match = match.local.match(/^Ganador R32-(\d+)$/);
      if (localR32Match) {
        const idx = parseInt(localR32Match[1]) - 1;
        const r32MatchesDb = await pool.query("SELECT * FROM matches WHERE fase = 'Ronda de 32' ORDER BY fecha ASC, id ASC");
        const r32M = r32MatchesDb.rows[idx];
        if (r32M && r32M.estado === 'finished') {
          updatedLocal = r32M.goles_local > r32M.goles_visitante ? r32M.local : r32M.visitante;
          changed = true;
        }
      }
      const visitanteR32Match = match.visitante.match(/^Ganador R32-(\d+)$/);
      if (visitanteR32Match) {
        const idx = parseInt(visitanteR32Match[1]) - 1;
        const r32MatchesDb = await pool.query("SELECT * FROM matches WHERE fase = 'Ronda de 32' ORDER BY fecha ASC, id ASC");
        const r32M = r32MatchesDb.rows[idx];
        if (r32M && r32M.estado === 'finished') {
          updatedVisitante = r32M.goles_local > r32M.goles_visitante ? r32M.local : r32M.visitante;
          changed = true;
        }
      }

      // Check 'Ganador Octavos-X'
      const localOctavosMatch = match.local.match(/^Ganador Octavos-(\d+)$/);
      if (localOctavosMatch) {
        const idx = parseInt(localOctavosMatch[1]) - 1;
        const octMatchesDb = await pool.query("SELECT * FROM matches WHERE fase = 'Octavos de Final' ORDER BY fecha ASC, id ASC");
        const octM = octMatchesDb.rows[idx];
        if (octM && octM.estado === 'finished') {
          updatedLocal = octM.goles_local > octM.goles_visitante ? octM.local : octM.visitante;
          changed = true;
        }
      }
      const visitanteOctavosMatch = match.visitante.match(/^Ganador Octavos-(\d+)$/);
      if (visitanteOctavosMatch) {
        const idx = parseInt(visitanteOctavosMatch[1]) - 1;
        const octMatchesDb = await pool.query("SELECT * FROM matches WHERE fase = 'Octavos de Final' ORDER BY fecha ASC, id ASC");
        const octM = octMatchesDb.rows[idx];
        if (octM && octM.estado === 'finished') {
          updatedVisitante = octM.goles_local > octM.goles_visitante ? octM.local : octM.visitante;
          changed = true;
        }
      }

      // Check 'Ganador Semifinal-X'
      const localSemisMatch = match.local.match(/^Ganador Semifinal-(\d+)$/);
      if (localSemisMatch) {
        const idx = parseInt(localSemisMatch[1]) - 1;
        const semiMatchesDb = await pool.query("SELECT * FROM matches WHERE fase = 'Semifinal' ORDER BY fecha ASC, id ASC");
        const semiM = semiMatchesDb.rows[idx];
        if (semiM && semiM.estado === 'finished') {
          updatedLocal = semiM.goles_local > semiM.goles_visitante ? semiM.local : semiM.visitante;
          changed = true;
        }
      }
      const visitanteSemisMatch = match.visitante.match(/^Ganador Semifinal-(\d+)$/);
      if (visitanteSemisMatch) {
        const idx = parseInt(visitanteSemisMatch[1]) - 1;
        const semiMatchesDb = await pool.query("SELECT * FROM matches WHERE fase = 'Semifinal' ORDER BY fecha ASC, id ASC");
        const semiM = semiMatchesDb.rows[idx];
        if (semiM && semiM.estado === 'finished') {
          updatedVisitante = semiM.goles_local > semiM.goles_visitante ? semiM.local : semiM.visitante;
          changed = true;
        }
      }

      // Check 'Perdedor Semifinal-X'
      const localSemisPerdedor = match.local.match(/^Perdedor Semifinal-(\d+)$/);
      if (localSemisPerdedor) {
        const idx = parseInt(localSemisPerdedor[1]) - 1;
        const semiMatchesDb = await pool.query("SELECT * FROM matches WHERE fase = 'Semifinal' ORDER BY fecha ASC, id ASC");
        const semiM = semiMatchesDb.rows[idx];
        if (semiM && semiM.estado === 'finished') {
          updatedLocal = semiM.goles_local < semiM.goles_visitante ? semiM.local : semiM.visitante;
          changed = true;
        }
      }
      const visitanteSemisPerdedor = match.visitante.match(/^Perdedor Semifinal-(\d+)$/);
      if (visitanteSemisPerdedor) {
        const idx = parseInt(visitanteSemisPerdedor[1]) - 1;
        const semiMatchesDb = await pool.query("SELECT * FROM matches WHERE fase = 'Semifinal' ORDER BY fecha ASC, id ASC");
        const semiM = semiMatchesDb.rows[idx];
        if (semiM && semiM.estado === 'finished') {
          updatedVisitante = semiM.goles_local < semiM.goles_visitante ? semiM.local : semiM.visitante;
          changed = true;
        }
      }
      
      if (changed) {
        const logoLocal = `/uploads/flags/${updatedLocal.toLowerCase().replace(/ /g, '_')}.png`;
        const logoVisitante = `/uploads/flags/${updatedVisitante.toLowerCase().replace(/ /g, '_')}.png`;
        
        await pool.query(
          `UPDATE matches 
           SET local = $1, 
               visitante = $2, 
               logo_local = $3, 
               logo_visitante = $4, 
               updated_at = CURRENT_TIMESTAMP 
           WHERE id = $5`,
          [updatedLocal, updatedVisitante, logoLocal, logoVisitante, match.id]
        );
        
        // Broadcast single match update
        const finalMatchRes = await pool.query("SELECT * FROM matches WHERE id = $1", [match.id]);
        broadcastUpdate('match', finalMatchRes.rows[0]);
      }
    }
  } catch (error) {
    console.error('Error running knockout cascade calculation:', error);
  }
}
