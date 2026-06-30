import { EventEmitter } from 'events';
import { Client } from 'pg';
import pool from './db';

if (!global._realtimeEmitter) {
  global._realtimeEmitter = new EventEmitter();
  // Set unlimited listeners since there might be many client browser connections
  global._realtimeEmitter.setMaxListeners(0);
  
  // Set up PostgreSQL notification listener for cluster sync
  setupPostgresListener(global._realtimeEmitter);
}

export const realtimeEmitter = global._realtimeEmitter;

function setupPostgresListener(emitter: EventEmitter) {
  const connectionConfig = process.env.DB_HOST
    ? {
        host:     process.env.DB_HOST,
        port:     parseInt(process.env.DB_PORT || '5432', 10),
        user:     process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      }
    : { connectionString: process.env.DATABASE_URL };

  let client: Client | null = null;

  async function connectAndListen() {
    try {
      client = new Client(connectionConfig);
      await client.connect();

      client.on('notification', (msg) => {
        if (msg.channel === 'elitepass_realtime' && msg.payload) {
          try {
            const parsed = JSON.parse(msg.payload);
            emitter.emit('update', parsed);
          } catch (e) {
            console.error('[realtime] Failed to parse PG notification payload:', e);
          }
        }
      });

      client.on('error', (err) => {
        console.error('[realtime] PG listener client error, reconnecting...', err);
        cleanup();
        setTimeout(connectAndListen, 5000);
      });

      client.on('end', () => {
        console.warn('[realtime] PG listener connection ended, reconnecting...');
        cleanup();
        setTimeout(connectAndListen, 5000);
      });

      await client.query('LISTEN elitepass_realtime');
      console.log('[realtime] Successfully listening to Postgres channel: elitepass_realtime');
    } catch (err) {
      console.error('[realtime] Failed to connect PG listener, retrying in 5s...', err);
      cleanup();
      setTimeout(connectAndListen, 5000);
    }
  }

  function cleanup() {
    if (client) {
      client.removeAllListeners();
      client.end().catch(() => {});
      client = null;
    }
  }

  // Start connection
  connectAndListen();
}

export function broadcastUpdate(type: 'match' | 'leaderboard' | 'goal' | 'card' | 'notification' | 'settings' | 'chat' | 'reaction', data: unknown) {
  const payload = {
    type,
    data,
    timestamp: new Date().toISOString()
  };

  // Broadcast to all cluster instances via Postgres notify
  pool.query("SELECT pg_notify('elitepass_realtime', $1)", [JSON.stringify(payload)])
    .catch(err => {
      console.error('[realtime] pg_notify error, falling back to local emit:', err);
      realtimeEmitter.emit('update', payload);
    });
}

