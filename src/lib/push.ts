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


export async function sendTelegramNotification(userId: number, text: string): Promise<boolean> {
  try {
    const userRes = await pool.query('SELECT telefono FROM users WHERE id = $1', [userId]);
    const phone = userRes.rows[0]?.telefono;
    if (!phone) return false;

    const apiKey = process.env.TELEGRAM_GATEWAY_KEY;
    const gatewayUrl = process.env.TELEGRAM_GATEWAY_URL;
    if (!apiKey || !gatewayUrl) {
      console.warn('[push] Telegram gateway not fully configured');
      return false;
    }

    // Note: HTTP is acceptable here because gatewayUrl resolves to a private internal IP (10.0.0.4) on the local subnet.
    const res = await fetch(gatewayUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify({
        phoneNumber: phone,
        message: text
      })
    });
    return res.ok;
  } catch (error) {
    console.error('sendTelegramNotification failed:', error);
    return false;
  }
}

export async function sendPushNotification(userId: number, payload: PushPayload): Promise<void> {
  // Send via Telegram first in parallel (non-blocking)
  const formattedMsg = `<b>${payload.title}</b>\n\n${payload.body}`;
  void sendTelegramNotification(userId, formattedMsg);

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

export async function sendPushToAllActive(payload: PushPayload): Promise<void> {
  try {
    const users = await pool.query(
      `SELECT DISTINCT ps.user_id
       FROM push_subscriptions ps
       JOIN users u ON u.id = ps.user_id
       WHERE u.activo = true`
    );
    await Promise.all(users.rows.map((row) => sendPushNotification(row.user_id, payload)));
  } catch (error) {
    console.error('sendPushToAllActive failed:', error);
  }
}

export async function sendPushToUsersWithoutPrediction(matchId: number, payload: PushPayload): Promise<void> {
  try {
    const users = await pool.query(
      `SELECT DISTINCT ps.user_id
       FROM push_subscriptions ps
       JOIN users u ON u.id = ps.user_id
       WHERE u.activo = true AND u.aprobado = true
         AND NOT EXISTS (
           SELECT 1 FROM predictions p WHERE p.user_id = ps.user_id AND p.match_id = $1
         )`,
      [matchId]
    );
    await Promise.all(users.rows.map((row) => sendPushNotification(row.user_id, payload)));
  } catch (error) {
    console.error('sendPushToUsersWithoutPrediction failed:', error);
  }
}
