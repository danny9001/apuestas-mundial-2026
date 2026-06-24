import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireUser, isUnauthorized, clearSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function DELETE() {
  const user = await requireUser();
  if (isUnauthorized(user)) return user;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Anonymize leaderboard entry
    await client.query(
      `UPDATE leaderboard SET updated_at = CURRENT_TIMESTAMP WHERE user_id = $1`,
      [user.id]
    );

    // Soft-delete: anonymize user data
    await client.query(
      `UPDATE users SET
         nombre = 'Usuario eliminado',
         email = 'deleted_' || id || '@deleted.invalid',
         telefono = NULL,
         tincaso = NULL,
         avatar = NULL,
         activo = false,
         aprobado = false,
         notif_prefs = '{"email":false,"push":false}'::jsonb
       WHERE id = $1`,
      [user.id]
    );

    // Delete push subscriptions and predictions (PII + irrelevant)
    await client.query('DELETE FROM push_subscriptions WHERE user_id = $1', [user.id]);
    await client.query('DELETE FROM passkeys WHERE user_id = $1', [user.id]);

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[DELETE /api/me]', err);
    return NextResponse.json({ error: 'Error interno del servidor', code: 'INTERNAL_ERROR' }, { status: 500 });
  } finally {
    client.release();
  }

  await clearSession();
  return NextResponse.json({ message: 'Tu cuenta ha sido eliminada correctamente.' });
}
