/**
 * Scheduler de notificaciones automáticas
 * - Cada hora: avisos de partidos próximas 24h
 * - Cada lunes 8:00: ranking semanal por empresa
 */
const https = require('https');
const http = require('http');

const BASE_URL = process.env.APP_BASE_URL || 'http://localhost:3002';
const SECRET   = process.env.SCHEDULER_SECRET || '';

function callApi(tipo) {
  const url = new URL('/api/admin/notify-scheduled', BASE_URL);
  const isHttps = url.protocol === 'https:';
  const lib = isHttps ? https : http;
  const payload = JSON.stringify({ tipo });

  const options = {
    hostname: url.hostname,
    port: url.port || (isHttps ? 443 : 80),
    path: url.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
      'x-scheduler-secret': SECRET,
    },
  };

  const req = lib.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      console.log(`[${new Date().toISOString()}] notify-scheduled (${tipo}):`, data);
    });
  });
  req.on('error', (e) => console.error(`[scheduler] Error:`, e.message));
  req.write(payload);
  req.end();
}

// Ejecutar matches cada hora
function runMatchReminders() {
  callApi('matches');
}

// Ejecutar rankings los lunes a las 8:00
function scheduleWeeklyRankings() {
  function msUntilNextMonday8am() {
    const now = new Date();
    const target = new Date(now);
    target.setHours(8, 0, 0, 0);
    const day = now.getDay(); // 0=sun,1=mon
    const daysUntilMonday = (8 - day) % 7 || 7;
    target.setDate(now.getDate() + (day === 1 && now < target ? 0 : daysUntilMonday));
    return target - now;
  }

  function setNextMonday() {
    const ms = msUntilNextMonday8am();
    console.log(`[scheduler] Próximo ranking en ${Math.round(ms/1000/60)} minutos`);
    setTimeout(() => {
      callApi('rankings');
      setNextMonday(); // reprogramar
    }, ms);
  }

  setNextMonday();
}

// Arranque
console.log(`[scheduler] Iniciado. BASE_URL=${BASE_URL}`);
runMatchReminders();
setInterval(runMatchReminders, 15 * 60 * 1000); // cada 15 mins
scheduleWeeklyRankings();
