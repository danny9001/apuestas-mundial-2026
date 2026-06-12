import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

async function ensurePaymentsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_payments (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      monto NUMERIC NOT NULL DEFAULT 0,
      fecha TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

// GET: fetch participants and their payments
export async function GET(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || (sessionUser.tipo !== 'admin' && sessionUser.tipo !== 'superadmin')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    await ensurePaymentsTable();

    let queryText = `
      SELECT u.id, u.nombre, u.email, u.participa, u.activo, u.aprobado,
             COALESCE(
               json_agg(json_build_object('id', c.id, 'nombre', c.nombre, 'color', c.color, 'monto_participacion', c.monto_participacion))
               FILTER (WHERE c.id IS NOT NULL), '[]'
             ) AS companies,
             COALESCE(
               (SELECT json_agg(json_build_object('id', p.id, 'monto', p.monto, 'fecha', p.fecha) ORDER BY p.fecha DESC)
                FROM user_payments p
                WHERE p.user_id = u.id), '[]'
             ) AS payments
      FROM users u
      LEFT JOIN user_companies uc ON uc.user_id = u.id
      LEFT JOIN companies c ON c.id = uc.company_id
      WHERE u.activo = true 
        AND u.aprobado = true 
        AND u.participa IS NOT FALSE
    `;

    let queryParams: any[] = [];

    if (sessionUser.tipo === 'admin') {
      // Only show users in companies that the admin is assigned to
      queryText += `
        AND (u.id IN (
          SELECT uc2.user_id FROM user_companies uc2
          WHERE uc2.company_id IN (
            SELECT company_id FROM user_companies WHERE user_id = $1
          )
        ) OR u.id = $1)
        AND u.tipo != 'superadmin'
      `;
      queryParams.push(sessionUser.id);
    }

    queryText += `
      GROUP BY u.id, u.nombre, u.email, u.participa, u.activo, u.aprobado
      ORDER BY u.nombre ASC
    `;

    const res = await pool.query(queryText, queryParams);
    return NextResponse.json(res.rows);
  } catch (error: any) {
    console.error('Error fetching payments:', error);
    return NextResponse.json({ error: 'Error del servidor: ' + error.message }, { status: 500 });
  }
}

// POST: manage payments (add, update, delete)
export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || (sessionUser.tipo !== 'admin' && sessionUser.tipo !== 'superadmin')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    await ensurePaymentsTable();

    const body = await req.json();
    const { action, userId, paymentId, monto, fecha } = body;

    // Helper to check if admin is allowed to manage a user's payments
    const checkPermission = async (targetUserId: number) => {
      if (sessionUser.tipo === 'superadmin') return true;
      // Admin can only manage users in the same company
      const check = await pool.query(`
        SELECT 1 FROM user_companies uc1
        JOIN user_companies uc2 ON uc1.company_id = uc2.company_id
        WHERE uc1.user_id = $1 AND uc2.user_id = $2
      `, [sessionUser.id, targetUserId]);
      return check.rows.length > 0;
    };

    if (action === 'add') {
      if (!userId) return NextResponse.json({ error: 'ID de usuario requerido' }, { status: 400 });
      if (monto == null || isNaN(parseFloat(monto))) return NextResponse.json({ error: 'Monto inválido' }, { status: 400 });

      const allowed = await checkPermission(userId);
      if (!allowed) return NextResponse.json({ error: 'No autorizado para este usuario' }, { status: 403 });

      const payDate = fecha ? new Date(fecha) : new Date();
      const res = await pool.query(
        `INSERT INTO user_payments (user_id, monto, fecha) VALUES ($1, $2, $3) RETURNING *`,
        [userId, parseFloat(monto), payDate]
      );
      return NextResponse.json({ success: true, payment: res.rows[0] });
    }

    if (action === 'update') {
      if (!paymentId) return NextResponse.json({ error: 'ID de pago requerido' }, { status: 400 });
      if (monto == null || isNaN(parseFloat(monto))) return NextResponse.json({ error: 'Monto inválido' }, { status: 400 });

      // Find user of this payment
      const userRes = await pool.query(`SELECT user_id FROM user_payments WHERE id = $1`, [paymentId]);
      if (userRes.rows.length === 0) return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 });
      const targetUserId = userRes.rows[0].user_id;

      const allowed = await checkPermission(targetUserId);
      if (!allowed) return NextResponse.json({ error: 'No autorizado para este usuario' }, { status: 403 });

      const payDate = fecha ? new Date(fecha) : new Date();
      const res = await pool.query(
        `UPDATE user_payments SET monto = $1, fecha = $2 WHERE id = $3 RETURNING *`,
        [parseFloat(monto), payDate, paymentId]
      );
      return NextResponse.json({ success: true, payment: res.rows[0] });
    }

    if (action === 'delete') {
      if (!paymentId) return NextResponse.json({ error: 'ID de pago requerido' }, { status: 400 });

      // Find user of this payment
      const userRes = await pool.query(`SELECT user_id FROM user_payments WHERE id = $1`, [paymentId]);
      if (userRes.rows.length === 0) return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 });
      const targetUserId = userRes.rows[0].user_id;

      const allowed = await checkPermission(targetUserId);
      if (!allowed) return NextResponse.json({ error: 'No autorizado para este usuario' }, { status: 403 });

      await pool.query(`DELETE FROM user_payments WHERE id = $1`, [paymentId]);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (error: any) {
    console.error('Error managing payment:', error);
    return NextResponse.json({ error: 'Error del servidor: ' + error.message }, { status: 500 });
  }
}
