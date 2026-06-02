import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { broadcastUpdate } from '@/lib/realtime';

export const dynamic = 'force-dynamic';

async function ensureNotificationsTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      titulo VARCHAR(255) NOT NULL,
      contenido TEXT NOT NULL,
      tipo VARCHAR(20) DEFAULT 'info',
      target_type VARCHAR(20) DEFAULT 'all',
      target_id INTEGER,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      expires_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notification_reads (
      notification_id INTEGER REFERENCES notifications(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      read_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (notification_id, user_id)
    );
  `);
}

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    await ensureNotificationsTables();

    const res = await pool.query(
      `SELECT n.id, n.titulo, n.contenido, n.tipo, n.target_type, n.target_id,
              n.expires_at, n.created_at,
              (nr.user_id IS NOT NULL) AS leido
       FROM notifications n
       LEFT JOIN notification_reads nr ON nr.notification_id = n.id AND nr.user_id = $1
       WHERE (n.expires_at IS NULL OR n.expires_at > NOW())
         AND (
           n.target_type = 'all'
           OR (n.target_type = 'user' AND n.target_id = $1)
           OR (n.target_type = 'group' AND EXISTS (
             SELECT 1 FROM user_groups ug WHERE ug.user_id = $1 AND ug.group_id = n.target_id
           ))
         )
       ORDER BY n.created_at DESC
       LIMIT 50`,
      [user.id]
    );

    const response = NextResponse.json(res.rows);
    response.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
    return response;
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.tipo !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    await ensureNotificationsTables();

    const body = await req.json();
    const { titulo, contenido, tipo, target_type, target_id, expires_at } = body;

    if (!titulo?.trim() || !contenido?.trim()) {
      return NextResponse.json({ error: 'Título y contenido son requeridos' }, { status: 400 });
    }

    const res = await pool.query(
      `INSERT INTO notifications (titulo, contenido, tipo, target_type, target_id, created_by, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        titulo.trim(),
        contenido.trim(),
        tipo || 'info',
        target_type || 'all',
        target_id || null,
        user.id,
        expires_at || null,
      ]
    );

    broadcastUpdate('notification', {
      notificationId: res.rows[0].id,
      titulo: res.rows[0].titulo,
      tipo: res.rows[0].tipo,
      target_type: res.rows[0].target_type,
      target_id: res.rows[0].target_id,
    });

    return NextResponse.json({ success: true, notification: res.rows[0] });
  } catch (error: any) {
    console.error('Error creating notification:', error);
    return NextResponse.json({ error: 'Error del servidor: ' + error.message }, { status: 500 });
  }
}
