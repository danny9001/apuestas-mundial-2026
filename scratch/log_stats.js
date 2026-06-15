const fs = require('fs');

const data = JSON.parse(fs.readFileSync('scratch/espn_dump.json', 'utf8'));

for (const event of data.events) {
  const comp = event.competitions && event.competitions[0];
  if (!comp || !comp.competitors) continue;

  const homeCompetitor = comp.competitors.find((c) => c.homeAway === 'home');
  
  if (homeCompetitor.statistics) {
    console.log('Statistics keys for:', event.name);
    for (const stat of homeCompetitor.statistics) {
      console.log(`- ${stat.name} (${stat.abbreviation}): ${stat.displayValue}`);
    }
    break; // Just print one
  }
}
