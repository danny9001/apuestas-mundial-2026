import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const user = await getSessionUser();
    if (!user || !user.aprobado) return NextResponse.json({ ok: false });

    await pool.query(
      `INSERT INTO user_presence (user_id, last_seen_at)
       VALUES ($1, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id) DO UPDATE SET last_seen_at = CURRENT_TIMESTAMP`,
      [user.id]
    );

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
