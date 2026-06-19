/**
 * Scheduler de notificaciones automáticas y sincronización de partidos
 * - Cada 15 minutos: avisos de partidos próximas 24h
 * - Cada lunes 8:00: ranking semanal por empresa
 * - Cada 1 minuto: sincroniza marcadores de partidos en vivo, próximos (15 min) o empezados hace < 2h
 */
const https = require('https');
const http = require('http');

const BASE_URL = process.env.APP_BASE_URL || 'http://localhost:3002';
const SECRET   = process.env.SCHEDULER_SECRET || '';
const SYNC_SECRET = process.env.SYNC_SECRET || 'sync2026';

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
  req.on('error', (e) => console.error(`[scheduler] Error calling notify-scheduled:`, e.message));
  req.write(payload);
  req.end();
}

function triggerSync() {
  const url = new URL(`/api/sync?key=${SYNC_SECRET}`, BASE_URL);
  const isHttps = url.protocol === 'https:';
  const lib = isHttps ? https : http;

  const options = {
    hostname: url.hostname,
    port: url.port || (isHttps ? 443 : 80),
    path: url.pathname + url.search,
    method: 'POST',
  };

  const req = lib.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      console.log(`[${new Date().toISOString()}] Sync matches result:`, data);
    });
  });
  req.on('error', (e) => console.error(`[scheduler] Sync error:`, e.message));
  req.end();
}

function checkAndSyncMatches() {
  const url = new URL('/api/matches', BASE_URL);
  const isHttps = url.protocol === 'https:';
  const lib = isHttps ? https : http;

  const req = lib.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      try {
        const matches = JSON.parse(data);
        if (!Array.isArray(matches)) return;

        const now = Date.now();
        const hasLiveOrSoon = matches.some(m => {
          if (m.estado === 'live') return true;
          if (m.estado === 'upcoming') {
            const matchTime = new Date(m.fecha).getTime();
            // Sync if match starts within 15 min OR already started (within last 2 hours)
            // The 2-hour window catches cases where the sync missed the narrow window
            return matchTime - now <= 15 * 60 * 1000 && now - matchTime <= 120 * 60 * 1000;
          }
          return false;
        });

        if (hasLiveOrSoon) {
          console.log(`[${new Date().toISOString()}] Live or upcoming match detected. Triggering sync...`);
          triggerSync();
        }
      } catch (err) {
        console.error('[scheduler] Error parsing matches for sync:', err.message);
      }
    });
  });
  req.on('error', (e) => console.error(`[scheduler] Fetch matches error:`, e.message));
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

// Sincronizador en vivo cada 1 minuto y procesamiento de cola de correos
checkAndSyncMatches();
callApi('queue');
setInterval(() => {
  checkAndSyncMatches();
  callApi('queue');
}, 60 * 1000);

scheduleWeeklyRankings();
