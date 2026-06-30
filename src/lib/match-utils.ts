import type { Match, StandingEntry } from './types';

export function getStandings(matchesList: Match[]) {
  const standings: Record<string, StandingEntry[]> = {};
  const groupMatches = matchesList.filter(m => m.fase === 'Fase de Grupos');
  ['A','B','C','D','E','F','G','H','I','J','K','L'].forEach(g => { standings[g] = []; });

  const ensureTeam = (grp: string, team: string): StandingEntry | null => {
    if (!team || team.includes('A confirmar') || team.startsWith('Ganador')) return null;
    if (!standings[grp]) return null;
    let s = standings[grp].find((x) => x.team === team);
    if (!s) { s = { team, pts: 0, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, dif: 0 }; standings[grp].push(s); }
    return s;
  };

  groupMatches.forEach(m => {
    if (!m.grupo) return;
    const s1 = ensureTeam(m.grupo, m.local);
    const s2 = ensureTeam(m.grupo, m.visitante);
    if (s1 && s2 && m.estado !== 'upcoming' && m.goles_local !== null && m.goles_visitante !== null) {
      const gl = m.goles_local, gv = m.goles_visitante;
      s1.pj++; s2.pj++;
      s1.gf += gl; s2.gf += gv;
      s1.gc += gv; s2.gc += gl;
      s1.dif = s1.gf - s1.gc; s2.dif = s2.gf - s2.gc;
      if (gl > gv)      { s1.pg++; s1.pts += 3; s2.pp++; }
      else if (gl < gv) { s2.pg++; s2.pts += 3; s1.pp++; }
      else              { s1.pe++; s1.pts += 1; s2.pe++; s2.pts += 1; }
    }
  });

  Object.keys(standings).forEach(grp => {
    standings[grp].sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.dif !== a.dif) return b.dif - a.dif;
      return b.gf - a.gf;
    });
  });
  return standings;
}

const TZ = 'America/La_Paz';

function toBoliviaDateStr(date: Date): string {
  return date.toLocaleDateString('es-ES', { timeZone: TZ });
}

export function getMatchesByDate(matchesList: Match[]) {
  const sorted = [...matchesList].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
  const groups: { dateStr: string; matches: Match[] }[] = [];
  const now = new Date();
  const nowStr = toBoliviaDateStr(now);
  const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = toBoliviaDateStr(tomorrow);

  sorted.forEach(m => {
    const d = new Date(m.fecha);
    const dateStr = d.toLocaleDateString('es-ES', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const capitalized = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
    const matchDayStr = toBoliviaDateStr(d);
    const relativeLabel = matchDayStr === nowStr ? ' (HOY)' : matchDayStr === tomorrowStr ? ' (MAÑANA)' : '';
    const key = capitalized + relativeLabel;
    let group = groups.find(g => g.dateStr === key);
    if (!group) { group = { dateStr: key, matches: [] }; groups.push(group); }
    group.matches.push(m);
  });
  return groups;
}

export function getTodayMatchGroupIndex(groupedMatches: { dateStr: string; matches: Match[] }[]): number {
  return groupedMatches.findIndex(g => g.dateStr.includes('(HOY)'));
}
