import pool from './db';

/**
 * Simple database-backed rate limiter for Next.js endpoints.
 * Returns true if the limit for the specified key is exceeded within the windowMs.
 */
export async function isRateLimited(key: string, limit: number, windowMs: number): Promise<boolean> {
  const now = new Date();

  try {
    // Clean up expired limits
    await pool.query('DELETE FROM rate_limits WHERE expire_at < $1', [now]);

    // Upsert key
    const res = await pool.query(
      `INSERT INTO rate_limits (key, points, expire_at)
       VALUES ($1, 1, $2)
       ON CONFLICT (key) DO UPDATE
       SET points = rate_limits.points + 1
       RETURNING points`,
      [key, new Date(now.getTime() + windowMs)]
    );

    const points = res.rows[0]?.points ?? 1;
    return points > limit;
  } catch (err) {
    console.error('[rate-limit] Error checking rate limit:', err);
    return false; // Fail open to avoid blocking legitimate users on DB issues
  }
}
