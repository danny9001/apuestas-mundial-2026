import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { broadcastUpdate } from '@/lib/realtime';
import { sanitizeText } from '@/lib/validation';

export const dynamic = 'force-dynamic';

function isChatOpen(match: any): boolean {
  if (match.estado === 'live') return true;
  if (match.estado === 'finished' && match.updated_at) {
    return Date.now() - new Date(match.updated_at).getTime() < 30 * 60 * 1000;
  }
  return false;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { id } = await params;
  const matchId = parseInt(id);
  if (isNaN(matchId)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });

  const client = await pool.connect();
  try {
    const matchRes = await client.query('SELECT estado, updated_at FROM matches WHERE id = $1', [matchId]);
    if (matchRes.rowCount === 0) return NextResponse.json({ error: 'Partido no encontrado' }, { status: 404 });

    const msgs = await client.query(`
      SELECT
        mm.id, mm.match_id, mm.user_id, mm.created_at, mm.deleted_at, mm.deleted_by_id,
        CASE WHEN mm.deleted_at IS NOT NULL THEN NULL ELSE mm.message END AS message,
        u.nombre, u.avatar,
        db.nombre AS deleted_by_nombre
      FROM match_messages mm
      JOIN users u ON u.id = mm.user_id
      LEFT JOIN users db ON db.id = mm.deleted_by_id
      WHERE mm.match_id = $1
      ORDER BY mm.created_at ASC
      LIMIT 300
    `, [matchId]);

    return NextResponse.json(
      { messages: msgs.rows, isOpen: isChatOpen(matchRes.rows[0]) },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } finally {
    client.release();
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (!user.aprobado) return NextResponse.json({ error: 'Cuenta no aprobada' }, { status: 403 });

  const { id } = await params;
  const matchId = parseInt(id);
  if (isNaN(matchId)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });

  const body = await req.json();
  const rawMessage = body?.message;
  if (!rawMessage || typeof rawMessage !== 'string') return NextResponse.json({ error: 'Mensaje requerido' }, { status: 400 });

  const message = sanitizeText(rawMessage.trim()).slice(0, 300);
  if (!message) return NextResponse.json({ error: 'Mensaje vacío' }, { status: 400 });

  const client = await pool.connect();
  try {
    const matchRes = await client.query('SELECT estado, updated_at FROM matches WHERE id = $1', [matchId]);
    if (matchRes.rowCount === 0) return NextResponse.json({ error: 'Partido no encontrado' }, { status: 404 });
    if (!isChatOpen(matchRes.rows[0])) return NextResponse.json({ error: 'Chat cerrado para este partido' }, { status: 403 });

    const res = await client.query(`
      INSERT INTO match_messages (match_id, user_id, message)
      VALUES ($1, $2, $3)
      RETURNING id, match_id, user_id, message, created_at
    `, [matchId, user.id, message]);

    const newMsg = { ...res.rows[0], nombre: user.nombre, avatar: user.avatar, deleted_at: null };
    broadcastUpdate('chat', { matchId, message: newMsg });

    return NextResponse.json(newMsg, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } finally {
    client.release();
  }
}
