import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { broadcastUpdate } from '@/lib/realtime';

export const dynamic = 'force-dynamic';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; msgId: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const isArbitro = user.tipo === 'admin' || user.tipo === 'superadmin' || user.is_moderador === true;
  if (!isArbitro) return NextResponse.json({ error: 'Solo árbitros y jueces de línea pueden eliminar mensajes' }, { status: 403 });

  const { id, msgId } = await params;
  const matchId = parseInt(id);
  const messageId = parseInt(msgId);
  if (isNaN(matchId) || isNaN(messageId)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });

  const client = await pool.connect();
  try {
    const res = await client.query(`
      UPDATE match_messages
      SET deleted_at = NOW(), deleted_by_id = $1
      WHERE id = $2 AND match_id = $3 AND deleted_at IS NULL
      RETURNING id
    `, [user.id, messageId, matchId]);

    if (res.rowCount === 0) return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 });

    broadcastUpdate('chat', { matchId, deleted: messageId, deletedBy: user.nombre });

    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } finally {
    client.release();
  }
}
