import { describe, it, expect } from 'vitest';
import { getStandings, getMatchesByDate, getTodayMatchGroupIndex } from '@/lib/match-utils';
import type { Match } from '@/lib/types';

const BASE_DATE = '2026-06-15T20:00:00.000Z';

function makeMatch(overrides: Partial<Match>): Match {
  return {
    id: 1,
    local: 'Argentina',
    visitante: 'Brasil',
    fecha: BASE_DATE,
    estado: 'finished',
    goles_local: 2,
    goles_visitante: 1,
    fase: 'Fase de Grupos',
    grupo: 'A',
    stats: null,
    ...overrides,
  };
}

describe('getStandings', () => {
  it('awards 3pts to winner and 0 to loser', () => {
    const matches: Match[] = [makeMatch({ local: 'Argentina', visitante: 'Brasil', goles_local: 2, goles_visitante: 0, grupo: 'A' })];
    const standings = getStandings(matches);
    const arg = standings['A'].find(s => s.team === 'Argentina');
    const bra = standings['A'].find(s => s.team === 'Brasil');
    expect(arg?.pts).toBe(3);
    expect(bra?.pts).toBe(0);
    expect(arg?.pg).toBe(1);
    expect(bra?.pp).toBe(1);
  });

  it('awards 1pt each on draw', () => {
    const matches: Match[] = [makeMatch({ local: 'Francia', visitante: 'Alemania', goles_local: 1, goles_visitante: 1, grupo: 'B' })];
    const standings = getStandings(matches);
    const fra = standings['B'].find(s => s.team === 'Francia');
    const ale = standings['B'].find(s => s.team === 'Alemania');
    expect(fra?.pts).toBe(1);
    expect(ale?.pts).toBe(1);
    expect(fra?.pe).toBe(1);
  });

  it('sorts by points then goal diff', () => {
    const matches: Match[] = [
      makeMatch({ local: 'España', visitante: 'Italia', goles_local: 3, goles_visitante: 0, grupo: 'C' }),
      makeMatch({ id: 2, local: 'Portugal', visitante: 'Bélgica', goles_local: 1, goles_visitante: 0, grupo: 'C' }),
    ];
    const standings = getStandings(matches);
    expect(standings['C'][0].team).toBe('España');
  });

  it('ignores upcoming matches', () => {
    const matches: Match[] = [makeMatch({ estado: 'upcoming', goles_local: null, goles_visitante: null, grupo: 'D' })];
    const standings = getStandings(matches);
    const entry = standings['D'].find(s => s.team === 'Argentina');
    expect(entry?.pts ?? 0).toBe(0);
    expect(entry?.pj ?? 0).toBe(0);
  });
});

describe('getMatchesByDate', () => {
  it('groups matches by day', () => {
    const m1 = makeMatch({ fecha: '2026-06-15T15:00:00.000Z' });
    const m2 = makeMatch({ id: 2, fecha: '2026-06-16T15:00:00.000Z' });
    const groups = getMatchesByDate([m1, m2]);
    expect(groups.length).toBe(2);
  });

  it('puts matches on same day in same group', () => {
    const m1 = makeMatch({ fecha: '2026-06-15T15:00:00.000Z' });
    const m2 = makeMatch({ id: 2, fecha: '2026-06-15T19:00:00.000Z' });
    const groups = getMatchesByDate([m1, m2]);
    expect(groups.length).toBe(1);
    expect(groups[0].matches.length).toBe(2);
  });
});

describe('getTodayMatchGroupIndex', () => {
  it('returns -1 when no group has HOY label', () => {
    const groups = [{ dateStr: 'Lunes 15 de junio de 2026', matches: [] }];
    expect(getTodayMatchGroupIndex(groups)).toBe(-1);
  });

  it('returns correct index when HOY group exists', () => {
    const groups = [
      { dateStr: 'Domingo 14 de junio de 2026', matches: [] },
      { dateStr: 'Lunes 15 de junio de 2026 (HOY)', matches: [] },
      { dateStr: 'Martes 16 de junio de 2026', matches: [] },
    ];
    expect(getTodayMatchGroupIndex(groups)).toBe(1);
  });
});
