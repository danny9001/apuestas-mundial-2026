const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(`
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS show_as_popup BOOLEAN NOT NULL DEFAULT FALSE;
    `);
    console.log('✅ Columna show_as_popup agregada a notifications');
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(e => { console.error('❌ Error en migración:', e.message); process.exit(1); });
