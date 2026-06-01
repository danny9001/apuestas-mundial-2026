import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { syncMatches } from '@/lib/sync';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user || user.tipo !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const [logsRes, lastSyncRes] = await Promise.all([
      pool.query('SELECT * FROM sync_log ORDER BY synced_at DESC LIMIT 10'),
      pool.query("SELECT MAX(last_synced_at) as last_synced FROM matches WHERE last_synced_at IS NOT NULL")
    ]);

    return NextResponse.json({
      logs: logsRes.rows,
      last_synced: lastSyncRes.rows[0]?.last_synced || null,
      sync_enabled: process.env.SYNC_ENABLED !== 'false'
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const user = await getSessionUser();
    if (!user || user.tipo !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const result = await syncMatches();
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
