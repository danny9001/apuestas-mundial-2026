import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';


export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const body = await req.json();
    const { endpoint, keys } = body;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: 'Suscripción inválida' }, { status: 400 });
    }


    await pool.query(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (user_id, endpoint) DO UPDATE
         SET p256dh = EXCLUDED.p256dh,
             auth = EXCLUDED.auth,
             updated_at = NOW()`,
      [user.id, endpoint, keys.p256dh, keys.auth]
    );

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Push subscribe error:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const body = await req.json();
    const { endpoint } = body;
    if (!endpoint) return NextResponse.json({ error: 'endpoint requerido' }, { status: 400 });

    await pool.query(
      'DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2',
      [user.id, endpoint]
    );

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Push unsubscribe error:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
