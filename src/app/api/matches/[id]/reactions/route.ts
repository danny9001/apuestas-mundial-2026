import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { broadcastUpdate } from '@/lib/realtime';

export const dynamic = 'force-dynamic';

export const VALID_REACTIONS = ['⚽', '🔥', '😱', '😂', '😢', '😡', '👏', '💔'];

async function getCounts(client: any, matchId: number): Promise<Record<string, number>> {
  const rows = await client.query(
    'SELECT reaction, COUNT(*) as count FROM match_reactions WHERE match_id = $1 GROUP BY reaction',
    [matchId]
  );
  const result: Record<string, number> = {};
  VALID_REACTIONS.forEach(r => { result[r] = 0; });
  rows.rows.forEach((row: any) => { result[row.reaction] = parseInt(row.count); });
  return result;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const matchId = parseInt(id);
  if (isNaN(matchId)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });

  const user = await getSessionUser();
  const client = await pool.connect();
  try {
    const counts = await getCounts(client, matchId);
    let myReaction: string | null = null;
    if (user) {
      const myRes = await client.query(
        'SELECT reaction FROM match_reactions WHERE match_id = $1 AND user_id = $2',
        [matchId, user.id]
      );
      if (myRes.rowCount && myRes.rowCount > 0) myReaction = myRes.rows[0].reaction;
    }
    return NextResponse.json({ counts, myReaction }, { headers: { 'Cache-Control': 'no-store' } });
  } finally {
    client.release();
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { id } = await params;
  const matchId = parseInt(id);
  if (isNaN(matchId)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });

  const body = await req.json();
  const { reaction } = body;
  if (!reaction || !VALID_REACTIONS.includes(reaction)) {
    return NextResponse.json({ error: 'Reacción inválida' }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    const current = await client.query(
      'SELECT reaction FROM match_reactions WHERE match_id = $1 AND user_id = $2',
      [matchId, user.id]
    );

    if (current.rowCount && current.rowCount > 0 && current.rows[0].reaction === reaction) {
      await client.query('DELETE FROM match_reactions WHERE match_id = $1 AND user_id = $2', [matchId, user.id]);
    } else {
      await client.query(`
        INSERT INTO match_reactions (match_id, user_id, reaction)
        VALUES ($1, $2, $3)
        ON CONFLICT (match_id, user_id) DO UPDATE SET reaction = $3, created_at = NOW()
      `, [matchId, user.id, reaction]);
    }

    const counts = await getCounts(client, matchId);
    const myRes = await client.query(
      'SELECT reaction FROM match_reactions WHERE match_id = $1 AND user_id = $2',
      [matchId, user.id]
    );
    const myReaction = myRes.rowCount && myRes.rowCount > 0 ? myRes.rows[0].reaction : null;

    broadcastUpdate('reaction', { matchId, counts });

    return NextResponse.json({ counts, myReaction }, { headers: { 'Cache-Control': 'no-store' } });
  } finally {
    client.release();
  }
}
