import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const res = await pool.query(`
      SELECT
        synced_at        AS last_attempted_sync,
        matches_updated,
        errors,
        duration_ms,
        CASE WHEN array_length(errors, 1) = 0 OR errors IS NULL THEN synced_at END AS last_successful_sync
      FROM sync_log
      ORDER BY synced_at DESC
      LIMIT 10
    `);

    const rows = res.rows;
    const lastAttempted = rows[0]?.last_attempted_sync ?? null;
    const lastSuccessful = rows.find(r => r.last_successful_sync)?.last_successful_sync ?? null;
    const lastError = rows[0]?.errors?.length ? rows[0].errors[0] : null;

    const stallThresholdMs = 5 * 60 * 1000;
    const isStalled = lastSuccessful
      ? Date.now() - new Date(lastSuccessful).getTime() > stallThresholdMs
      : true;

    return NextResponse.json({
      last_attempted_sync: lastAttempted,
      last_successful_sync: lastSuccessful,
      last_error: lastError,
      is_stalled: isStalled,
      recent: rows.slice(0, 5).map(r => ({
        synced_at: r.last_attempted_sync,
        matches_updated: r.matches_updated,
        duration_ms: r.duration_ms,
        errors: r.errors,
      })),
    });
  } catch (err) {
    console.error('[health/sync]', err);
    return NextResponse.json({ error: 'Health check failed' }, { status: 500 });
  }
}
