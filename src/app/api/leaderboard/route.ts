import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET: fetch global leaderboard ranking
export async function GET() {
  try {
    const res = await pool.query(
      `SELECT l.*, u.nombre, u.email, u.tipo, u.avatar, u.activo
       FROM leaderboard l
       JOIN users u ON l.user_id = u.id
       WHERE u.activo = true
       ORDER BY l.posicion ASC, u.nombre ASC`
    );

    const response = NextResponse.json(res.rows);
    response.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
    return response;
  } catch (error: any) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
