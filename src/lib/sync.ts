import pool from './db';
import { broadcastUpdate } from './realtime';

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

  const apiKey = process.env.FOOTBALL_API_KEY;
  const apiBase = process.env.FOOTBALL_API_BASE || 'https://api.football-data.org/v4';
  const wcId = process.env.FOOTBALL_WC_ID || '2000';

  if (!apiKey) {
    return {
      updated: 0,
      goals_detected: 0,
      finished: 0,
      errors: ['FOOTBALL_API_KEY is missing in env variables'],
      duration_ms: Date.now() - startTime
    };
  }

  try {
    // 1. Fetch matches from football-data.org
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

      // 3. Find matching local match in DB by external_id
      const matchRes = await pool.query('SELECT * FROM matches WHERE external_id = $1', [extId]);
      if (matchRes.rows.length === 0) {
        continue;
      }

      const localMatch = matchRes.rows[0];

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
        }

        // Match finished transition
        if (estado === 'finished' && localMatch.estado !== 'finished') {
          finishedCount++;
          // Recalculate leaderboard
          await pool.query('SELECT recalculate_leaderboard()');
          broadcastUpdate('leaderboard', { updated: true });
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
