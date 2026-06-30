import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSessionUser, setSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const body = await req.json();
    const { notif_prefs } = body;

    if (!notif_prefs) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 });
    }

    await pool.query('UPDATE users SET notif_prefs = $1 WHERE id = $2', [JSON.stringify(notif_prefs), user.id]);

    const updatedSession = { ...user, notif_prefs };
    await setSession(updatedSession);

    return NextResponse.json({ success: true, notif_prefs });
  } catch (error: unknown) {
    console.error('Error saving notification preferences:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
