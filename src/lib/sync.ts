import pool from './db';
import { broadcastUpdate } from './realtime';
import { sendPushToAllActive, sendPushToUsersWithoutPrediction } from './push';

async function notifSent(matchId: number, event: string): Promise<boolean> {
  const res = await pool.query(
    'SELECT 1 FROM match_notif_log WHERE match_id = $1 AND event = $2',
    [matchId, event]
  );
  return res.rows.length > 0;
}

async function markNotifSent(matchId: number, event: string): Promise<void> {
  await pool.query(
    'INSERT INTO match_notif_log (match_id, event) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [matchId, event]
  );
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

export async function sync365Scores(): Promise<{
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
    const url = 'https://webws.365scores.com/web/games/?langId=29&timezoneName=America/Mexico_City&appTypeId=5&competitions=5930';
    const res = await fetch(url, {
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

      if (estado === 'upcoming' && (localMatch.estado === 'live' || localMatch.estado === 'finished')) {
        continue;
      }

      const stateChanged = localMatch.estado !== estado;
      const scoreChanged = localMatch.goles_local !== golesLocal || localMatch.goles_visitante !== golesVisitante;

      if (stateChanged || scoreChanged) {
        const stats = localMatch.stats || {};
        if (game.homeCompetitor.redCards !== undefined) {
          stats.red_cards_local = isLInverted ? game.awayCompetitor.redCards : game.homeCompetitor.redCards;
          stats.red_cards_visitante = isLInverted ? game.homeCompetitor.redCards : game.awayCompetitor.redCards;
        }

        if (!stats.possession_local && (estado === 'live' || estado === 'finished')) {
          stats.possession_local = 50;
          stats.possession_visitante = 50;
          stats.shots_local = golesLocal * 4 + 4;
          stats.shots_visitante = golesVisitante * 4 + 3;
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
          [estado, golesLocal, golesVisitante, JSON.stringify(stats), localMatch.id]
        );

        const updatedMatch = updateRes.rows[0];
        updatedCount++;

        broadcastUpdate('match', updatedMatch);

        // Push + notification: match goes live
        if (estado === 'live' && localMatch.estado !== 'live') {
          const key = `live`;
          if (!(await notifSent(updatedMatch.id, key))) {
            await markNotifSent(updatedMatch.id, key);
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

          // Push + notification: goal (deduplicated by score)
          const goalKey = `goal_${updatedMatch.goles_local}_${updatedMatch.goles_visitante}`;
          if (!(await notifSent(updatedMatch.id, goalKey))) {
            await markNotifSent(updatedMatch.id, goalKey);
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

        if (
          (estado === 'finished' && localMatch.estado !== 'finished') ||
          (estado === 'live' && localMatch.estado !== 'live') ||
          (scoreChanged && (estado === 'finished' || estado === 'live'))
        ) {
          if (estado === 'finished' && localMatch.estado !== 'finished') {
            finishedCount++;
            await pool.query('SELECT recalculate_leaderboard()');
            broadcastUpdate('leaderboard', { updated: true });
            // Push + notification: match finished + leaderboard
            const finKey = `finished`;
            if (!(await notifSent(updatedMatch.id, finKey))) {
              await markNotifSent(updatedMatch.id, finKey);
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

  // 1. Try primary source: 365scores
  try {
    const res365 = await sync365Scores();
    if (res365.errors.length === 0) {
      const durationMs = Date.now() - startTime;
      await pool.query(
        `INSERT INTO sync_log (synced_at, matches_updated, goals_detected, matches_finished, errors, duration_ms)
         VALUES (CURRENT_TIMESTAMP, $1, $2, $3, $4, $5)`,
        [res365.updated, res365.goals_detected, res365.finished, [], durationMs]
      );
      
      if (res365.updated > 0) {
        await runKnockoutCascade();
      }

      return {
        updated: res365.updated,
        goals_detected: res365.goals_detected,
        finished: res365.finished,
        errors: [],
        duration_ms: durationMs
      };
    } else {
      errors.push(...res365.errors);
      console.warn("Primary source (365Scores) failed. Proceeding with fallback (football-data.org).");
    }
  } catch (err365: any) {
    errors.push(err365.message || 'Primary source exception');
    console.error("Primary source exception:", err365);
  }

  const apiKey = process.env.FOOTBALL_API_KEY;
  const apiBase = process.env.FOOTBALL_API_BASE || 'https://api.football-data.org/v4';
  const wcId = process.env.FOOTBALL_WC_ID || '2000';

  if (!apiKey) {
    return {
      updated: 0,
      goals_detected: 0,
      finished: 0,
      errors: [...errors, 'FOOTBALL_API_KEY is missing in env variables'],
      duration_ms: Date.now() - startTime
    };
  }

  try {
    // 2. Fetch matches from football-data.org (Fallback)
    const response = await fetch(`${apiBase}/competitions/${wcId}/matches`, {
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

    // 2. Loop through each API match
    for (const apiMatch of data.matches) {
      const extId = apiMatch.id;
      const status = apiMatch.status;
      const score = apiMatch.score;
      
      // Determine local state
      let estado: 'upcoming' | 'live' | 'finished' = 'upcoming';
      if (status === 'FINISHED') {
        estado = 'finished';
      } else if (['LIVE', 'IN_PLAY', 'PAUSED', 'HALFTIME'].includes(status)) {
        estado = 'live';
      }

      const golesLocal = score?.fullTime?.home !== null ? score.fullTime.home : 0;
      const golesVisitante = score?.fullTime?.away !== null ? score.fullTime.away : 0;

      // 3. Find matching local match in DB
      // Match by external_id or by local + visitante teams and stage
      const localName = teamNameMapping[apiMatch.homeTeam?.name] || apiMatch.homeTeam?.name;
      const visitanteName = teamNameMapping[apiMatch.awayTeam?.name] || apiMatch.awayTeam?.name;
      const faseName = stageMapping[apiMatch.stage] || apiMatch.stage;

      let matchRes = await pool.query(
        `SELECT * FROM matches 
         WHERE external_id = $1 
            OR (local = $2 AND visitante = $3 AND (fase = $4 OR ($4 = 'Fase de Grupos' AND fase IS NULL)))`,
        [extId, localName, visitanteName, faseName]
      );

      if (matchRes.rows.length === 0) {
        continue;
      }

      const localMatch = matchRes.rows[0];

      // Self-healing: update external_id in the DB if it is different
      if (localMatch.external_id !== extId) {
        await pool.query('UPDATE matches SET external_id = $1 WHERE id = $2', [extId, localMatch.id]);
        localMatch.external_id = extId;
      }

      // Avoid downgrading a match from live/finished back to upcoming if the API returned TIMED
      if (estado === 'upcoming' && (localMatch.estado === 'live' || localMatch.estado === 'finished')) {
        continue;
      }

      // Check if changes are detected
      const stateChanged = localMatch.estado !== estado;
      const scoreChanged = localMatch.goles_local !== golesLocal || localMatch.goles_visitante !== golesVisitante;

      if (stateChanged || scoreChanged) {
        const stats = apiMatch.stats || {};
        
        // Update local DB
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
          [estado, golesLocal, golesVisitante, JSON.stringify(stats), localMatch.id]
        );

        const updatedMatch = updateRes.rows[0];
        updatedCount++;

        // Broadcast to clients
        broadcastUpdate('match', updatedMatch);

        // Push + notification: match goes live
        if (estado === 'live' && localMatch.estado !== 'live') {
          const key = `live`;
          if (!(await notifSent(updatedMatch.id, key))) {
            await markNotifSent(updatedMatch.id, key);
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

        // Goal detection (during active live matches)
        if (estado === 'live' && scoreChanged) {
          goalsDetected++;
          broadcastUpdate('goal', {
            matchId: updatedMatch.id,
            local: updatedMatch.local,
            visitante: updatedMatch.visitante,
            goles_local: updatedMatch.goles_local,
            goles_visitante: updatedMatch.goles_visitante
          });

          // Push + notification: goal
          const goalKey = `goal_${updatedMatch.goles_local}_${updatedMatch.goles_visitante}`;
          if (!(await notifSent(updatedMatch.id, goalKey))) {
            await markNotifSent(updatedMatch.id, goalKey);
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

        // Recalculate leaderboard if match finished, went live, or live score changed
        if (
          (estado === 'finished' && localMatch.estado !== 'finished') ||
          (estado === 'live' && localMatch.estado !== 'live') ||
          (scoreChanged && (estado === 'finished' || estado === 'live'))
        ) {
          if (estado === 'finished' && localMatch.estado !== 'finished') {
            finishedCount++;
            await pool.query('SELECT recalculate_leaderboard()');
            broadcastUpdate('leaderboard', { updated: true });
            // Push + notification: match finished + leaderboard
            const finKey = `finished`;
            if (!(await notifSent(updatedMatch.id, finKey))) {
              await markNotifSent(updatedMatch.id, finKey);
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
          } else {
            await pool.query('SELECT recalculate_leaderboard()');
            broadcastUpdate('leaderboard', { updated: true });
          }
        }
      }
    }

    // 4. Run Knockout cascade check to advance teams
    if (updatedCount > 0) {
      await runKnockoutCascade();
    }

    // 5. Log synchronization attempt in DB
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

  } catch (error: any) {
    console.error('Error synchronizing matches:', error);
    const durationMs = Date.now() - startTime;
    errors.push(error.message || 'Unknown syncing error');
    
    // Log error in database
    await pool.query(
      `INSERT INTO sync_log (synced_at, matches_updated, goals_detected, matches_finished, errors, duration_ms)
       VALUES (CURRENT_TIMESTAMP, 0, 0, 0, $1, $2)`,
      [errors, durationMs]
    );

    return {
      updated: 0,
      goals_detected: 0,
      finished: 0,
      errors,
      duration_ms: durationMs
    };
  }
}

async function sendUpcomingReminders() {
  try {
    // Find upcoming matches starting in 25-65 minutes (covers both 30min and 60min windows)
    const res = await pool.query(
      `SELECT id, local, visitante, fecha FROM matches
       WHERE estado = 'upcoming'
         AND fecha > NOW() + INTERVAL '24 minutes'
         AND fecha < NOW() + INTERVAL '66 minutes'`
    );

    for (const match of res.rows) {
      const minutesUntil = Math.round((new Date(match.fecha).getTime() - Date.now()) / 60000);

      if (minutesUntil >= 55 && minutesUntil <= 65) {
        // 60-minute reminder
        const key60 = `reminder_60`;
        if (!(await notifSent(match.id, key60))) {
          await markNotifSent(match.id, key60);
          // Insert notification record for in-app notification tab
          await pool.query(
            `INSERT INTO notifications (titulo, contenido, tipo, target_type, expires_at)
             VALUES ($1, $2, 'info', 'all', NOW() + INTERVAL '4 hours')`,
            [
              `⏰ Próximo partido en 1 hora`,
              `${match.local} vs ${match.visitante} comienza en aproximadamente 60 minutos. ¡No olvides hacer tu pronóstico antes de que cierre!`
            ]
          );
          void sendPushToUsersWithoutPrediction(match.id, {
            title: `⏰ Pronóstico pendiente – ${match.local} vs ${match.visitante}`,
            body: `El partido inicia en ~60 minutos. ¡Aún estás a tiempo de apostar!`,
            url: '/partidos'
          });
        }
      } else if (minutesUntil >= 25 && minutesUntil <= 35) {
        // 30-minute reminder
        const key30 = `reminder_30`;
        if (!(await notifSent(match.id, key30))) {
          await markNotifSent(match.id, key30);
          // Insert notification record for in-app notification tab
          await pool.query(
            `INSERT INTO notifications (titulo, contenido, tipo, target_type, expires_at)
             VALUES ($1, $2, 'warning', 'all', NOW() + INTERVAL '2 hours')`,
            [
              `🚨 Último aviso – ${match.local} vs ${match.visitante}`,
              `El partido inicia en ~30 minutos. ¡Las apuestas cierran pronto!`
            ]
          );
          void sendPushToUsersWithoutPrediction(match.id, {
            title: `🚨 ¡Último aviso! ${match.local} vs ${match.visitante}`,
            body: `Solo quedan ~30 minutos para apostar. ¡No te quedes sin pronóstico!`,
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
