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
    const tincaso = body.tincaso || body.team;

    if (!tincaso) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 });
    }

    // Check if tincaso was already bet on
    const checkRes = await pool.query('SELECT tincaso FROM users WHERE id = $1', [user.id]);
    if (checkRes.rows.length > 0 && checkRes.rows[0].tincaso) {
      return NextResponse.json({ error: 'Ya has guardado tu tincaso. Solo se permite una vez.' }, { status: 400 });
    }

    await pool.query('UPDATE users SET tincaso = $1 WHERE id = $2', [tincaso, user.id]);

    const updatedSession = { ...user, tincaso };
    await setSession(updatedSession);

    return NextResponse.json({ success: true, tincaso });
  } catch (error: unknown) {
    console.error('Error saving tincaso:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
