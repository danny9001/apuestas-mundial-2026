import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Check database connection
    await pool.query('SELECT 1');
    return NextResponse.json({ status: 'healthy', database: 'connected' }, { status: 200 });
  } catch (error: any) {
    console.error('[health] DB check failed:', error);
    return NextResponse.json({ status: 'unhealthy', error: 'Database unavailable' }, { status: 500 });
  }
}
