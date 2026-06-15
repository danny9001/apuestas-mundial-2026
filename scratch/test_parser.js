const fs = require('fs');

const data = JSON.parse(fs.readFileSync('scratch/espn_dump.json', 'utf8'));

for (const event of data.events) {
  const comp = event.competitions && event.competitions[0];
  if (!comp || !comp.competitors) continue;

  const homeCompetitor = comp.competitors.find((c) => c.homeAway === 'home');
  const awayCompetitor = comp.competitors.find((c) => c.homeAway === 'away');
  if (!homeCompetitor || !awayCompetitor) continue;

  const homeDisplayName = homeCompetitor.team?.name || homeCompetitor.team?.displayName;
  const awayDisplayName = awayCompetitor.team?.name || awayCompetitor.team?.displayName;
  
  if (homeDisplayName === 'Spain' || homeDisplayName === 'España') {
    console.log('Matchup:', homeDisplayName, 'vs', awayDisplayName);
    console.log('Home ID:', homeCompetitor.team?.id, 'Away ID:', awayCompetitor.team?.id);
    if (comp.details) {
      for (const d of comp.details) {
        console.log('Detail team ID:', d.team?.id, 'yellowCard:', d.yellowCard);
      }
    }
  }
}
