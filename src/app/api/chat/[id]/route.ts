import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { broadcastUpdate } from '@/lib/realtime';

export async function DELETE(
  req: NextRequest,
  props: { params: any }
) {
  try {
    const user = await getSessionUser();
    if (!user || user.tipo !== 'superadmin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const params = await props.params;
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const res = await pool.query(
      `UPDATE global_messages
       SET deleted_at = NOW(), deleted_by_id = $1
       WHERE id = $2 AND deleted_at IS NULL
       RETURNING *`,
      [user.id, id]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 });
    }

    broadcastUpdate('chat', { id, deleted: true });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting chat message:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
