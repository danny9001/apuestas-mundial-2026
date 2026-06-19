import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { logSystem } from '@/lib/mail';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const body = await req.json();
    const { notificationId } = body;

    if (notificationId) {
      // Mark single notification as read
      await pool.query(
        `INSERT INTO notification_reads (notification_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [notificationId, user.id]
      );
    } else {
      // Mark all visible notifications as read for this user
      await pool.query(
        `INSERT INTO notification_reads (notification_id, user_id)
         SELECT n.id, $1
         FROM notifications n
         WHERE (n.expires_at IS NULL OR n.expires_at > NOW())
           AND (
             n.target_type = 'all'
             OR (n.target_type = 'user' AND n.target_id = $1)
             OR (n.target_type = 'group' AND EXISTS (
               SELECT 1 FROM user_groups ug WHERE ug.user_id = $1 AND ug.group_id = n.target_id
             ))
             OR (n.target_type = 'company' AND EXISTS (
               SELECT 1 FROM user_companies uc WHERE uc.user_id = $1 AND uc.company_id = n.target_id
             ))
           )
           AND NOT EXISTS (
             SELECT 1 FROM notification_reads nr WHERE nr.notification_id = n.id AND nr.user_id = $1
           )`,
        [user.id]
      );
    }

    logSystem('info', 'NOTIFICACION', `${user.nombre} marcó notificaciones como leídas`, notificationId ? `ID: ${notificationId}` : 'Todas').catch(() => {});
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error marking notification as read:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
