/**
 * Sincroniza las fechas/horarios de todos los partidos upcoming con FixtureDownload API.
 * Solo actualiza partidos con estado 'upcoming' (no toca live ni finished).
 */
import pg from 'pg';
import { readFileSync } from 'fs';

// Load env
const envFile = readFileSync('/home/soporte/elitepass-mundial/.env.local', 'utf8');
const env = Object.fromEntries(
  envFile.split('\n').filter(l => l.includes('=')).map(l => {
    const idx = l.indexOf('=');
    return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
  })
);

const pool = new pg.Pool({
  host: env.DB_HOST || '127.0.0.1',
  port: parseInt(env.DB_PORT || '5432'),
  user: env.DB_USER || 'mundial',
  password: env.DB_PASSWORD,
  database: env.DB_NAME || 'apuestas_mundial',
});

const teamNameMapping = {
  'Germany': 'Alemania', 'Saudi Arabia': 'Arabia Saudita', 'Algeria': 'Argelia',
  'Argentina': 'Argentina', 'Australia': 'Australia', 'Austria': 'Austria',
  'Bosnia-Herzegovina': 'Bosnia y Herzegovina', 'Bosnia and Herzegovina': 'Bosnia y Herzegovina',
  'Brazil': 'Brasil', 'Belgium': 'Bélgica', 'Cape Verde': 'Cabo Verde',
  'Cape Verde Islands': 'Cabo Verde', 'Canada': 'Canadá', 'Colombia': 'Colombia',
  'South Korea': 'Corea del Sur', 'Korea Republic': 'Corea del Sur',
  'Ivory Coast': 'Costa de Marfil', "Côte d'Ivoire": 'Costa de Marfil',
  'Croatia': 'Croacia', 'Curaçao': 'Curazao', 'Curacao': 'Curazao',
  'Ecuador': 'Ecuador', 'Egypt': 'Egipto', 'Scotland': 'Escocia', 'Spain': 'España',
  'United States': 'Estados Unidos', 'USA': 'Estados Unidos', 'France': 'Francia',
  'Ghana': 'Ghana', 'Haiti': 'Haití', 'England': 'Inglaterra', 'Iraq': 'Irak',
  'Iran': 'Irán', 'IR Iran': 'Irán', 'Japan': 'Japón', 'Jordan': 'Jordania',
  'Morocco': 'Marruecos', 'Mexico': 'México', 'Norway': 'Noruega',
  'New Zealand': 'Nueva Zelanda', 'Panama': 'Panamá', 'Paraguay': 'Paraguay',
  'Netherlands': 'Países Bajos', 'Portugal': 'Portugal', 'Qatar': 'Qatar',
  'DR Congo': 'RD Congo', 'Congo DR': 'RD Congo',
  'Czechia': 'República Checa', 'Czech Republic': 'República Checa',
  'Senegal': 'Senegal', 'South Africa': 'Sudáfrica', 'Sweden': 'Suecia',
  'Switzerland': 'Suiza', 'Turkey': 'Turquía', 'Türkiye': 'Turquía',
  'Tunisia': 'Túnez', 'Uruguay': 'Uruguay', 'Uzbekistan': 'Uzbekistán',
  'Uzbek': 'Uzbekistán',
};

function cleanName(name) {
  if (!name) return '';
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

async function run() {
  console.log('Fetching FixtureDownload API...');
  const res = await fetch('https://fixturedownload.com/feed/json/fifa-world-cup-2026');
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const apiMatches = await res.json();
  console.log(`API returned ${apiMatches.length} matches`);

  const dbRes = await pool.query("SELECT * FROM matches WHERE estado = 'upcoming'");
  const dbMatches = dbRes.rows;
  console.log(`DB has ${dbMatches.length} upcoming matches`);

  let updated = 0;
  let notFound = 0;
  const changes = [];

  for (const game of apiMatches) {
    if (!game.DateUtc || !game.HomeTeam || !game.AwayTeam) continue;

    const homeMapped = teamNameMapping[game.HomeTeam] || game.HomeTeam;
    const awayMapped = teamNameMapping[game.AwayTeam] || game.AwayTeam;
    const cleanHome = cleanName(homeMapped);
    const cleanAway = cleanName(awayMapped);

    const dbMatch = dbMatches.find(m => {
      const localClean = cleanName(m.local);
      const visitanteClean = cleanName(m.visitante);
      return (localClean === cleanHome && visitanteClean === cleanAway) ||
             (localClean === cleanAway && visitanteClean === cleanHome);
    });

    if (!dbMatch) {
      // Only warn for concrete teams (not bracket placeholders)
      if (!/^\d|^[A-Z]\d|^Ganador|^Perdedor/.test(game.HomeTeam)) {
        console.log(`  NOT FOUND: ${game.HomeTeam} (${homeMapped}) vs ${game.AwayTeam} (${awayMapped})`);
        notFound++;
      }
      continue;
    }

    const apiDate = new Date(game.DateUtc.replace(' ', 'T').replace('Z', '+00:00'));
    const dbDate = new Date(dbMatch.fecha);
    const diffMs = Math.abs(apiDate.getTime() - dbDate.getTime());
    const diffMin = Math.round(diffMs / 60000);

    if (diffMin >= 5) {
      const boliviaApi = new Date(apiDate.getTime() - 4 * 3600000);
      const boliviaDb = new Date(dbDate.getTime() - 4 * 3600000);
      changes.push({
        id: dbMatch.id,
        local: dbMatch.local,
        visitante: dbMatch.visitante,
        old: boliviaDb.toISOString().replace('T', ' ').slice(0, 16),
        new: boliviaApi.toISOString().replace('T', ' ').slice(0, 16),
        apiUtc: game.DateUtc,
      });

      await pool.query(
        'UPDATE matches SET fecha = $1 WHERE id = $2',
        [apiDate.toISOString(), dbMatch.id]
      );
      updated++;
    }
  }

  console.log(`\n=== RESULTADOS ===`);
  console.log(`Actualizados: ${updated}`);
  console.log(`No encontrados: ${notFound}`);
  if (changes.length > 0) {
    console.log(`\nCambios realizados (hora Bolivia):`);
    for (const c of changes) {
      console.log(`  [${c.id}] ${c.local} vs ${c.visitante}`);
      console.log(`    ANTES: ${c.old} BOL`);
      console.log(`    AHORA: ${c.new} BOL`);
    }
  }

  await pool.end();
}

run().catch(e => { console.error(e); process.exit(1); });
