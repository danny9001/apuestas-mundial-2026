import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { broadcastUpdate } from '@/lib/realtime';

export const dynamic = 'force-dynamic';

// GET: Fetch global messages
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || !user.aprobado) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const since = searchParams.get('since');
    const adminHistory = searchParams.get('admin_history') === 'true';

    // Admin history: returns system messages sent by this admin (or all if superadmin)
    if (adminHistory) {
      const isAdmin = user.tipo === 'admin' || user.tipo === 'superadmin';
      if (!isAdmin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

      const historyQuery = user.tipo === 'superadmin'
        ? `SELECT gm.id, gm.message, gm.is_system, gm.target_type, gm.target_id, gm.created_at, gm.user_id,
                  u.nombre as user_nombre,
                  CASE gm.target_type
                    WHEN 'company' THEN (SELECT nombre FROM companies WHERE id = gm.target_id)
                    WHEN 'group'   THEN (SELECT nombre FROM groups   WHERE id = gm.target_id)
                    WHEN 'user'    THEN (SELECT nombre FROM users    WHERE id = gm.target_id)
                    ELSE NULL
                  END as target_nombre
           FROM global_messages gm
           LEFT JOIN users u ON gm.user_id = u.id
           WHERE gm.is_system = TRUE AND gm.deleted_at IS NULL
           ORDER BY gm.created_at DESC LIMIT 50`
        : `SELECT gm.id, gm.message, gm.is_system, gm.target_type, gm.target_id, gm.created_at, gm.user_id,
                  u.nombre as user_nombre,
                  CASE gm.target_type
                    WHEN 'company' THEN (SELECT nombre FROM companies WHERE id = gm.target_id)
                    WHEN 'group'   THEN (SELECT nombre FROM groups   WHERE id = gm.target_id)
                    WHEN 'user'    THEN (SELECT nombre FROM users    WHERE id = gm.target_id)
                    ELSE NULL
                  END as target_nombre
           FROM global_messages gm
           LEFT JOIN users u ON gm.user_id = u.id
           WHERE gm.is_system = TRUE AND gm.deleted_at IS NULL AND gm.user_id = $1
           ORDER BY gm.created_at DESC LIMIT 50`;
      const hRes = await pool.query(historyQuery, user.tipo === 'superadmin' ? [] : [user.id]);
      const response = NextResponse.json(hRes.rows);
      response.headers.set('Cache-Control', 'no-store');
      return response;
    }

    let query = `
      SELECT gm.*, u.nombre as user_nombre, u.avatar as user_avatar, u.tipo as user_tipo
      FROM global_messages gm
      LEFT JOIN users u ON gm.user_id = u.id
      WHERE gm.deleted_at IS NULL
        AND (
          gm.is_system = FALSE
          OR gm.target_type = 'all'
          OR (gm.target_type = 'user' AND gm.target_id = $1)
          OR (gm.target_type = 'company' AND EXISTS (
            SELECT 1 FROM user_companies uc WHERE uc.user_id = $1 AND uc.company_id = gm.target_id
          ))
          OR (gm.target_type = 'group' AND EXISTS (
            SELECT 1 FROM user_groups ug WHERE ug.user_id = $1 AND ug.group_id = gm.target_id
          ))
        )
    `;
    const params: any[] = [user.id];

    if (since) {
      query += ` AND gm.created_at > $2`;
      params.push(new Date(since));
      query += ` ORDER BY gm.created_at ASC`;
    } else {
      query += ` ORDER BY gm.created_at DESC LIMIT 100`;
    }

    const res = await pool.query(query, params);

    // If not since, we queried DESC to get the last 100, now reverse to return chronologically ASC
    const rows = since ? res.rows : res.rows.reverse();

    const response = NextResponse.json(rows);
    response.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
    return response;
  } catch (error: unknown) {
    console.error('Error fetching chat messages:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

// POST: Send a normal message
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || !user.aprobado) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
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

    const res = await pool.query(
      `INSERT INTO global_messages (user_id, message, is_system, target_type)
       VALUES ($1, $2, FALSE, 'all')
       RETURNING *`,
      [user.id, trimmed]
    );

    const inserted = res.rows[0];
    
    // Attach user details for broadcast
    const chatMsg = {
      ...inserted,
      user_nombre: user.nombre,
      user_avatar: user.avatar,
      user_tipo: user.tipo,
    };

    broadcastUpdate('chat', chatMsg);

    return NextResponse.json({ success: true, message: chatMsg });
  } catch (error: unknown) {
    console.error('Error sending chat message:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
