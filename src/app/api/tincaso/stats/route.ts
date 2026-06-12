import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Get aggregated vote counts for tincaso
    const query = `
      SELECT tincaso as team, COUNT(*)::int as votes 
      FROM users 
      WHERE tincaso IS NOT NULL AND tincaso != ''
      GROUP BY tincaso
      ORDER BY votes DESC
    `;
    const { rows } = await pool.query(query);

    const totalVotes = rows.reduce((sum, r) => sum + r.votes, 0);

    const stats = rows.map(r => ({
      team: r.team,
      votes: r.votes,
      percentage: totalVotes > 0 ? Math.round((r.votes / totalVotes) * 100) : 0
    }));

    return NextResponse.json({ stats, totalVotes });
  } catch (error: any) {
    console.error('Error fetching tincaso stats:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
