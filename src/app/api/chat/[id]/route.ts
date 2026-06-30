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
    if (!user || !user.aprobado) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const params = await props.params;
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const isModerator =
      user.tipo === 'superadmin' ||
      user.tipo === 'admin' ||
      !!user.is_moderador;

    let query = `
      UPDATE global_messages
      SET deleted_at = NOW(), deleted_by_id = $1
      WHERE id = $2 AND deleted_at IS NULL
    `;
    const dbParams = [user.id, id];

    if (!isModerator) {
      // Non-moderators can only delete their own messages
      query += ` AND user_id = $3`;
      dbParams.push(user.id);
    }

    query += ` RETURNING *`;
    const res = await pool.query(query, dbParams);

    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'Mensaje no encontrado o no tienes permisos' }, { status: 404 });
    }

    broadcastUpdate('chat', { id, deleted: true });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error deleting chat message:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  props: { params: any }
) {
  try {
    const user = await getSessionUser();
    if (!user || !user.aprobado) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const params = await props.params;
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const { message } = body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'El mensaje es requerido' }, { status: 400 });
    }

    const trimmed = message.trim();
    if (trimmed.length > 500) {
      return NextResponse.json({ error: 'El mensaje no puede exceder los 500 caracteres' }, { status: 400 });
    }

    const isModerator =
      user.tipo === 'superadmin' ||
      user.tipo === 'admin' ||
      !!user.is_moderador;

    let query = `
      UPDATE global_messages
      SET message = $1
      WHERE id = $2 AND deleted_at IS NULL
    `;
    const dbParams = [trimmed, id];

    if (!isModerator) {
      // Non-moderators can only edit their own messages
      query += ` AND user_id = $3`;
      dbParams.push(user.id);
    }

    query += ` RETURNING *`;
    const res = await pool.query(query, dbParams);

    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'Mensaje no encontrado o no tienes permisos' }, { status: 404 });
    }

    const updated = res.rows[0];

    // Broadcast the update so other clients update the message in their UI
    broadcastUpdate('chat', {
      id: updated.id,
      message: updated.message,
      updated: true
    });

    return NextResponse.json({ success: true, message: updated });
  } catch (error: unknown) {
    console.error('Error updating chat message:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
