import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET: returns official group standings from DB (synced from football-data.org)
// Response: { [grupo: string]: { posicion, team, pts, pj, pg, pe, pp, gf, gc, dif }[] }
export async function GET() {
  try {
    const res = await pool.query(
      `SELECT grupo, posicion, team, pts, pj, pg, pe, pp, gf, gc, dif
       FROM group_standings
       ORDER BY grupo ASC, posicion ASC`
    );

    const grouped: Record<string, any[]> = {};
    for (const row of res.rows) {
      if (!grouped[row.grupo]) grouped[row.grupo] = [];
      grouped[row.grupo].push(row);
    }

    const response = NextResponse.json(grouped);
    response.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
    return response;
  } catch (err: any) {
    // Table may not exist yet — return empty object (frontend falls back to local calculation)
    const response = NextResponse.json({});
    response.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
    return response;
  }
}
