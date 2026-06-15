const { Pool } = require('pg');

const pool = new Pool({
  host: '127.0.0.1',
  port: 5432,
  user: 'mundial',
  password: '5g_kR654y-T6zx4WMq2kG_Xac2-T9wJ',
  database: 'apuestas_mundial'
});

async function run() {
  const res = await pool.query("SELECT id, local, visitante, estado, goles_local, goles_visitante, stats FROM matches WHERE estado = 'live' ORDER BY id");
  console.log(JSON.stringify(res.rows, null, 2));
  await pool.end();
}

run().catch(console.error);
