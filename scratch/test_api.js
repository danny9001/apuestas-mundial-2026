const fs = require('fs');

async function testESPN() {
  try {
    const res = await fetch('https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard');
    const data = await res.json();
    fs.writeFileSync('scratch/espn_dump.json', JSON.stringify(data, null, 2));
    console.log('ESPN fetched and saved');
  } catch (e) {
    console.error('ESPN fetch failed:', e);
  }
}

async function test365() {
  try {
    const today = '15/06/2026';
    const url = `https://webws.365scores.com/web/games/?langId=29&timezoneName=America/La_Paz&appTypeId=5&competitions=5930&startDate=${today}&endDate=${today}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });
    const data = await res.json();
    fs.writeFileSync('scratch/365_dump.json', JSON.stringify(data, null, 2));
    console.log('365Scores fetched and saved');
  } catch (e) {
    console.error('365Scores fetch failed:', e);
  }
}

async function run() {
  await testESPN();
  await test365();
}

run();
