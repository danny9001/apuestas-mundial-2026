import { Client } from 'pg';

const pgClient = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://mundial:5g_kR654y-T6zx4WMq2kG_Xac2-T9wJ@127.0.0.1:5432/apuestas_mundial'
});

async function main() {
  await pgClient.connect();

  console.log('=== COMPARANDO BASE DE DATOS CON FUENTES DE SYNC ===\n');

  // 1. Fetch local matches
  const localRes = await pgClient.query('SELECT id, external_id, local, visitante, goles_local, goles_visitante, estado, fase FROM matches ORDER BY fase, id');
  const localMatches = localRes.rows;

  // 2. Fetch FootballData
  const apiKey = process.env.FOOTBALL_API_KEY;
  const apiBase = process.env.FOOTBALL_API_BASE || 'https://api.football-data.org/v4';
  const wcId = process.env.FOOTBALL_WC_ID || '2000';

  let footballDataMatches: any[] = [];
  if (apiKey) {
    try {
      const res = await fetch(`${apiBase}/competitions/${wcId}/matches`, {
        headers: { 'X-Auth-Token': apiKey }
      });
      if (res.ok) {
        const data = await res.json() as any;
        footballDataMatches = data.matches || [];
        console.log(`✓ FootballData API cargado: ${footballDataMatches.length} partidos encontrados.`);
      } else {
        console.error(`✗ Error al cargar FootballData: ${res.status}`);
      }
    } catch (err: any) {
      console.error(`✗ Error de red FootballData: ${err.message}`);
    }
  } else {
    console.log('⚠ FOOTBALL_API_KEY no configurado, omitiendo FootballData.');
  }

  // 3. Fetch 365Scores
  let scores365Matches: any[] = [];
  try {
    const formatDate = (d: Date) => {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    };
    const now = new Date();
    const startDate = formatDate(new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000));
    const endDate = formatDate(new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000));
    const url = `https://webws.365scores.com/web/games/?langId=29&timezoneName=America/La_Paz&appTypeId=5&competitions=5930&startDate=${startDate}&endDate=${endDate}`;
    
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      }
    });
    if (res.ok) {
      const data = await res.json() as any;
      scores365Matches = data.games || [];
      console.log(`✓ 365Scores API cargado: ${scores365Matches.length} partidos en rango de fechas.`);
    } else {
      console.error(`✗ Error al cargar 365Scores: ${res.status}`);
    }
  } catch (err: any) {
    console.error(`✗ Error de red 365Scores: ${err.message}`);
  }

  console.log('\n--- Comparando Eliminatorias (Ronda de 32 en adelante) ---');

  const teamNameMapping: Record<string, string> = {
    'South Africa': 'Sudáfrica',
    'Cape Verde': 'Cabo Verde',
    'Saudi Arabia': 'Arabia Saudita',
    'Spain': 'España',
    'Uruguay': 'Uruguay',
    'France': 'Francia',
    'Senegal': 'Senegal',
    'Iraq': 'Irak',
    'Norway': 'Noruega',
    'Argentina': 'Argentina',
    'Algeria': 'Argelia',
    'Austria': 'Austria',
    'Jordan': 'Jordania',
    'Portugal': 'Portugal',
    'DR Congo': 'RD Congo',
    'Uzbekistan': 'Uzbekistán',
    'Colombia': 'Colombia',
    'England': 'Inglaterra',
    'Croatia': 'Croacia',
    'Ghana': 'Ghana',
    'Panama': 'Panamá',
    'Germany': 'Alemania',
    'Paraguay': 'Paraguay',
    'Brazil': 'Brasil',
    'Japan': 'Japón',
    'South Korea': 'Corea del Sur',
    'Netherlands': 'Países Bajos',
    'Morocco': 'Marruecos',
    'Ivory Coast': 'Costa de Marfil',
    'Sweden': 'Suecia',
    'Mexico': 'México',
    'Ecuador': 'Ecuador',
    'Belgium': 'Bélgica',
    'Bosnia and Herzegovina': 'Bosnia y Herzegovina',
    'Switzerland': 'Suiza',
    'Australia': 'Australia',
    'Egypt': 'Egipto',
  };

  const cleanName = (n: string) => n ? n.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : '';

  for (const dbMatch of localMatches) {
    if (dbMatch.fase === 'Fase de Grupos' || !dbMatch.fase) continue;

    // Try to find in FootballData by external_id
    const fdMatch = footballDataMatches.find((m: any) => m.id === dbMatch.external_id);
    // Try to find in 365Scores by team names
    const score365Match = scores365Matches.find((g: any) => {
      const home = cleanName(g.homeCompetitor?.name);
      const away = cleanName(g.awayCompetitor?.name);
      const dbL = cleanName(dbMatch.local);
      const dbV = cleanName(dbMatch.visitante);
      return (home === dbL && away === dbV) || (home === dbV && away === dbL);
    });

    console.log(`\nPartido ID ${dbMatch.id} [${dbMatch.fase}]:`);
    console.log(`  BD:   ${dbMatch.local} ${dbMatch.goles_local} - ${dbMatch.goles_visitante} ${dbMatch.visitante} (${dbMatch.estado})`);
    
    if (fdMatch) {
      const fdHome = teamNameMapping[fdMatch.homeTeam?.name] || fdMatch.homeTeam?.name;
      const fdAway = teamNameMapping[fdMatch.awayTeam?.name] || fdMatch.awayTeam?.name;
      const fdHomeScore = fdMatch.score?.fullTime?.home ?? 0;
      const fdAwayScore = fdMatch.score?.fullTime?.away ?? 0;
      console.log(`  FD:   ${fdHome} ${fdHomeScore} - ${fdAwayScore} ${fdAway} (${fdMatch.status})`);
    } else {
      console.log(`  FD:   No encontrado por external_id (${dbMatch.external_id})`);
    }

    if (score365Match) {
      const s365Home = score365Match.homeCompetitor?.name;
      const s365Away = score365Match.awayCompetitor?.name;
      const s365HomeScore = score365Match.homeCompetitor?.score ?? 0;
      const s365AwayScore = score365Match.awayCompetitor?.score ?? 0;
      console.log(`  365:  ${s365Home} ${s365HomeScore} - ${s365AwayScore} ${s365Away} (StatusGroup: ${score365Match.statusGroup})`);
    } else {
      console.log(`  365:  No encontrado por nombres de equipos`);
    }
  }

  await pgClient.end();
}

main().catch(console.error);
