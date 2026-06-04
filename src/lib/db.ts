import { Pool, QueryResult, QueryResultRow } from 'pg';

function getPool(): Pool {
  if (global._postgresPool) return global._postgresPool;

  // Use individual params when set (avoids URL-encoding issues with special chars in passwords).
  // Falls back to DATABASE_URL for backward compatibility.
  const poolConfig = process.env.DB_HOST
    ? {
        host:     process.env.DB_HOST,
        port:     parseInt(process.env.DB_PORT || '5432', 10),
        user:     process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      }
    : { connectionString: process.env.DATABASE_URL };

  global._postgresPool = new Pool({
    ...poolConfig,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  return global._postgresPool;
}

const pool = new Proxy({} as Pool, {
  get(_target, prop) {
    return (getPool() as any)[prop];
  },
});

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
