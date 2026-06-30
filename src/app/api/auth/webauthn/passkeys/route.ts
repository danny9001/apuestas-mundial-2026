import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET: list passkeys for the current user
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const res = await pool.query(
      `SELECT id, credential_id, device_type, backed_up, transports, NULL as label, created_at, last_used_at
       FROM passkeys WHERE user_id = $1 ORDER BY created_at ASC`,
      [user.id]
    );
    const response = NextResponse.json(res.rows);
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch (error: unknown) {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

// DELETE: remove a specific passkey
export async function DELETE(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });

    // Verify ownership before deleting
    const check = await pool.query('SELECT id FROM passkeys WHERE id = $1 AND user_id = $2', [id, user.id]);
    if (check.rows.length === 0) return NextResponse.json({ error: 'Passkey no encontrada' }, { status: 404 });

    await pool.query('DELETE FROM passkeys WHERE id = $1', [id]);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
