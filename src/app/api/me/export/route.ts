import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireUser, isUnauthorized } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await requireUser();
  if (isUnauthorized(user)) return user;

  const [userRow, predictions, payments, notifications, passkeys] = await Promise.all([
    pool.query(
      'SELECT id, nombre, email, tipo, telefono, tincaso, notif_prefs, created_at FROM users WHERE id = $1',
      [user.id]
    ),
    pool.query(
      `SELECT p.pred_local, p.pred_visitante, p.puntos, p.created_at,
              m.local, m.visitante, m.fecha, m.fase
       FROM predictions p JOIN matches m ON p.match_id = m.id WHERE p.user_id = $1`,
      [user.id]
    ),
    pool.query(
      'SELECT monto, fecha, created_at FROM user_payments WHERE user_id = $1',
      [user.id]
    ),
    pool.query(
      `SELECT n.titulo, n.contenido, n.tipo, nr.read_at
       FROM notification_reads nr JOIN notifications n ON nr.notification_id = n.id
       WHERE nr.user_id = $1`,
      [user.id]
    ),
    pool.query(
      'SELECT label, device_type, created_at, last_used_at FROM passkeys WHERE user_id = $1',
      [user.id]
    ),
  ]);

  return NextResponse.json({
    exported_at: new Date().toISOString(),
    user: userRow.rows[0] ?? null,
    predictions: predictions.rows,
    payments: payments.rows,
    notifications: notifications.rows,
    passkeys: passkeys.rows,
  }, {
    headers: {
      'Content-Disposition': 'attachment; filename="mis-datos.json"',
      'Content-Type': 'application/json',
    },
  });
}
