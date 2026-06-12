import React from 'react';

export const TEAM_CODES: Record<string, string> = {
  'México': 'mx', 'Sudáfrica': 'za', 'Corea del Sur': 'kr', 'República Checa': 'cz',
  'Canadá': 'ca', 'Bosnia y Herzegovina': 'ba', 'Qatar': 'qa', 'Suiza': 'ch',
  'Brasil': 'br', 'Marruecos': 'ma', 'Haití': 'ht', 'Escocia': 'gb-sct',
  'Estados Unidos': 'us', 'Paraguay': 'py', 'Australia': 'au', 'Turquía': 'tr',
  'Alemania': 'de', 'Curazao': 'cw', 'Costa de Marfil': 'ci', 'Ecuador': 'ec',
  'Países Bajos': 'nl', 'Japón': 'jp', 'Suecia': 'se', 'Túnez': 'tn',
  'Bélgica': 'be', 'Egipto': 'eg', 'Irán': 'ir', 'Nueva Zelanda': 'nz',
  'España': 'es', 'Cabo Verde': 'cv', 'Arabia Saudita': 'sa', 'Uruguay': 'uy',
  'Francia': 'fr', 'Senegal': 'sn', 'Irak': 'iq', 'Noruega': 'no',
  'Argentina': 'ar', 'Argelia': 'dz', 'Austria': 'at', 'Jordania': 'jo',
  'Portugal': 'pt', 'RD Congo': 'cd', 'Uzbekistán': 'uz', 'Colombia': 'co',
  'Inglaterra': 'gb-eng', 'Croacia': 'hr', 'Ghana': 'gh', 'Panamá': 'pa',
};

export function getTeamFlag(name: string): React.ReactNode {
  if (!name) return '🏳️';
  const code = TEAM_CODES[name];
  if (code) {
    return React.createElement('img', {
      src: `https://flagcdn.com/w40/${code}.png`,
      alt: name,
      className: 'inline-block align-middle w-[1.3em] h-[0.9em] object-cover rounded-[0.15em] shadow-sm border border-neutral-850/60 flex-shrink-0',
    });
  }
  return '🏳️';
}

export function formatPlaceholderText(name: string): string {
  if (!name) return '';
  const clean = name.trim();
  if (/^[1-3][A-L]$/.test(clean)) return `${clean[0]}° del Grupo ${clean[1]}`;
  if (clean.startsWith('3') && clean.includes('/')) return `Mejor 3° Grupo ${clean.substring(1)}`;
  if (/^[G][0-9]+$/.test(clean)) return `Ganador Partido ${clean.substring(1)}`;
  if (/^[P][0-9]+$/.test(clean)) return `Perdedor Partido ${clean.substring(1)}`;
  return '';
}

export const PHASES_APUESTA = [
  { key: 'Grupos',           label: 'Fase de Grupos',  short: 'Grupos' },
  { key: 'Ronda de 32',      label: 'Ronda de 32',      short: 'R32' },
  { key: 'Octavos de Final', label: 'Octavos de Final', short: 'Octavos' },
  { key: 'Cuartos de Final', label: 'Cuartos de Final', short: 'Cuartos' },
  { key: 'Semifinal',        label: 'Semifinal',         short: 'Semi' },
  { key: 'Tercer Puesto',    label: 'Tercer Puesto',     short: '3°' },
  { key: 'Final',            label: 'Gran Final',        short: 'Final' },
] as const;

export const DEFAULT_MODOS_POR_FASE: Record<string, string> = Object.fromEntries(
  PHASES_APUESTA.map(p => [p.key, 'partido'])
);
