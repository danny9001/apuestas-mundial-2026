import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user || !user.aprobado) return NextResponse.json([], { status: 401 });

    const res = await pool.query(
      `SELECT u.id, u.nombre, u.avatar, u.tipo, up.last_seen_at
       FROM user_presence up
       JOIN users u ON u.id = up.user_id
       WHERE up.last_seen_at > NOW() - INTERVAL '90 seconds'
         AND u.aprobado = TRUE
         AND u.activo = TRUE
       ORDER BY up.last_seen_at DESC
       LIMIT 50`
    );

    return NextResponse.json(res.rows);
  } catch {
    return NextResponse.json([]);
  }
}
