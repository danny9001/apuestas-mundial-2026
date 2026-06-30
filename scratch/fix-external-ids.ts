import { Client } from 'pg';

const pgClient = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://mundial:5g_kR654y-T6zx4WMq2kG_Xac2-T9wJ@127.0.0.1:5432/apuestas_mundial'
});

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
  'Canada': 'Canadá',
  'South Africa Republic': 'Sudáfrica',
  'Cape Verde Islands': 'Cabo Verde',
  'United States': 'Estados Unidos',
  'Bosnia-Herzegovina': 'Bosnia y Herzegovina',
  'Congo DR': 'RD Congo',
  'Czechia': 'República Checa',
};

const stageMapping: Record<string, string> = {
  'GROUP_STAGE': 'Fase de Grupos',
  'LAST_32': 'Ronda de 32',
  'ROUND_OF_16': 'Octavos de Final',
  'QUARTER_FINALS': 'Cuartos de Final',
  'SEMI_FINALS': 'Semifinal',
  'THIRD_PLACE': 'Tercer Puesto',
  'FINAL': 'Final'
};

async function main() {
  await pgClient.connect();

  const apiKey = process.env.FOOTBALL_API_KEY;
  if (!apiKey) {
    console.error('✗ FOOTBALL_API_KEY no está configurado en las variables de entorno.');
    process.exit(1);
  }

  const apiBase = process.env.FOOTBALL_API_BASE || 'https://api.football-data.org/v4';
  const wcId = process.env.FOOTBALL_WC_ID || '2000';

  console.log('▶ Cargando partidos de FootballData...');
  const res = await fetch(`${apiBase}/competitions/${wcId}/matches`, {
    headers: { 'X-Auth-Token': apiKey }
  });

  if (!res.ok) {
    console.error(`✗ Error al consultar la API: ${res.status}`);
    process.exit(1);
  }

  const data = await res.json() as any;
  const apiMatches = data.matches || [];
  console.log(`✓ Se cargaron ${apiMatches.length} partidos de la API.`);

  // Clear external_id unique constraint violations by setting all external_ids to temporary negative values
  console.log('▶ Reseteando temporalmente external_ids de todos los partidos para evitar colisiones...');
  await pgClient.query("UPDATE matches SET external_id = -id");

  const localRes = await pgClient.query('SELECT * FROM matches');
  const localMatches = localRes.rows;

  let matchedCount = 0;

  for (const apiMatch of apiMatches) {
    const apiFase = stageMapping[apiMatch.stage] || apiMatch.stage;
    const apiDate = new Date(apiMatch.utcDate).getTime();
    
    // Find local match by closest date and same phase
    let bestMatch: any = null;
    let minDiff = Infinity;

    for (const lm of localMatches) {
      if (lm.fase !== apiFase) continue;
      const lmDate = new Date(lm.fecha).getTime();
      const diff = Math.abs(lmDate - apiDate);
      if (diff < minDiff && diff < 2 * 60 * 60 * 1000) { // within 2 hours
        minDiff = diff;
        bestMatch = lm;
      }
    }

    if (bestMatch) {
      const localName = teamNameMapping[apiMatch.homeTeam?.name] || apiMatch.homeTeam?.name;
      const visitanteName = teamNameMapping[apiMatch.awayTeam?.name] || apiMatch.awayTeam?.name;

      if (localName && visitanteName) {
        const logoLocal = `/uploads/flags/${localName.toLowerCase().replace(/ /g, '_')}.png`;
        const logoVisitante = `/uploads/flags/${visitanteName.toLowerCase().replace(/ /g, '_')}.png`;

        console.log(`⚡ Mapeando Partido ${bestMatch.id} [${bestMatch.fase}]: ${bestMatch.local} vs ${bestMatch.visitante} ➔ ${localName} vs ${visitanteName} (external_id: ${apiMatch.id})`);

        await pgClient.query(
          `UPDATE matches 
           SET external_id = $1, 
               local = $2, 
               visitante = $3, 
               logo_local = $4, 
               logo_visitante = $5,
               updated_at = CURRENT_TIMESTAMP 
           WHERE id = $6`,
          [apiMatch.id, localName, visitanteName, logoLocal, logoVisitante, bestMatch.id]
        );
        matchedCount++;
      }
    }
  }

  console.log(`\n✓ Finalizado: Se mapearon y actualizaron ${matchedCount} partidos.`);
  await pgClient.end();
}

main().catch(console.error);
