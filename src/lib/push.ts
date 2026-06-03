import webpush from 'web-push';
import pool from './db';

function initWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails('mailto:danny9001@gmail.com', publicKey, privateKey);
  return true;
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  url?: string;
}

export async function sendPushNotification(userId: number, payload: PushPayload): Promise<void> {
  if (!initWebPush()) return;
  try {
    const result = await pool.query(
      'SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1',
      [userId]
    );
    for (const row of result.rows) {
      const subscription = { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } };
      try {
        await webpush.sendNotification(subscription, JSON.stringify(payload));
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await pool.query(
            'DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2',
            [userId, row.endpoint]
          );
        } else {
          console.error('Push send error for user', userId, err.message);
        }
      }
    }
  } catch (error) {
    console.error('sendPushNotification failed:', error);
  }
}

export async function sendPushToAdmins(payload: PushPayload): Promise<void> {
  try {
    const admins = await pool.query(
      `SELECT DISTINCT ps.user_id
       FROM push_subscriptions ps
       JOIN users u ON u.id = ps.user_id
       WHERE u.tipo IN ('admin', 'superadmin') AND u.activo = true`
    );
    await Promise.all(admins.rows.map((row) => sendPushNotification(row.user_id, payload)));
  } catch (error) {
    console.error('sendPushToAdmins failed:', error);
  }
}
