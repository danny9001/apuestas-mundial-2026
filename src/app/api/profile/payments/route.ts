import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }


    // Fetch user's companies to get fee + QR de pago
    const compRes = await pool.query(
      `SELECT c.id, c.nombre, c.color, c.monto_participacion, c.qr_url FROM companies c
       JOIN user_companies uc ON uc.company_id = c.id
       WHERE uc.user_id = $1`,
      [user.id]
    );

    let cuota = 150;
    if (compRes.rows.length > 0) {
      cuota = compRes.rows.reduce((sum, row) => sum + parseFloat(row.monto_participacion || '150'), 0);
    }

    // Fetch payments
    const payRes = await pool.query(
      'SELECT id, monto, fecha, comprobante_url FROM user_payments WHERE user_id = $1 ORDER BY fecha DESC',
      [user.id]
    );

    const payments = payRes.rows;
    const totalPagado = payments.reduce((sum: number, p: any) => sum + parseFloat(p.monto), 0);
    const pagadoCompleto = totalPagado >= cuota;

    // participa=false identifica a los "visores", quienes no tienen cuota de participación
    const participaRes = await pool.query('SELECT participa FROM users WHERE id = $1', [user.id]);
    const participa = participaRes.rows[0]?.participa !== false;

    const response = NextResponse.json({
      cuota,
      totalPagado,
      pagadoCompleto,
      payments,
      participa,
      companies: compRes.rows,
    });
    response.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
    return response;
  } catch (error: unknown) {
    console.error('Error fetching profile payments:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
