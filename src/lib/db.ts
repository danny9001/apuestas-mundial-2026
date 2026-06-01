import { Pool, QueryResult, QueryResultRow } from 'pg';

let pool: Pool;

if (!global._postgresPool) {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:mundial2026@localhost:5432/apuestas_mundial';
  
  global._postgresPool = new Pool({
    connectionString,
    max: 10, // maximum number of clients in the pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
}

pool = global._postgresPool;

export default pool;

export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    // Log in development if needed
    if (process.env.NODE_ENV !== 'production') {
      console.log('Executed query', { text, duration, rows: res.rowCount });
    }
    return res;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}
