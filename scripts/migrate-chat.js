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
      CREATE TABLE IF NOT EXISTS match_messages (
        id SERIAL PRIMARY KEY,
        match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        deleted_at TIMESTAMP WITH TIME ZONE,
        deleted_by_id INTEGER REFERENCES users(id)
      );

      CREATE INDEX IF NOT EXISTS idx_match_messages_match_id ON match_messages(match_id);
      CREATE INDEX IF NOT EXISTS idx_match_messages_created_at ON match_messages(created_at);

      CREATE TABLE IF NOT EXISTS match_reactions (
        match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reaction VARCHAR(20) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        PRIMARY KEY (match_id, user_id)
      );

      CREATE INDEX IF NOT EXISTS idx_match_reactions_match_id ON match_reactions(match_id);

      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_moderador BOOLEAN NOT NULL DEFAULT FALSE;
    `);
    console.log('✅ Migración de chat y reacciones completada');
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(e => { console.error('❌ Error en migración:', e.message); process.exit(1); });
