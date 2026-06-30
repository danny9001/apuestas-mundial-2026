import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.tipo !== 'superadmin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'mail'; // 'mail' or 'system'
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500);
    const offset = parseInt(searchParams.get('offset') || '0');

    if (type === 'mail') {
      const res = await pool.query(
        `SELECT id, destinatario, asunto, estado, error_mensaje, created_at 
         FROM mail_logs 
         ORDER BY id DESC 
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );
      return NextResponse.json({ logs: res.rows });
    } else if (type === 'system') {
      const res = await pool.query(
        `SELECT id, nivel, categoria, mensaje, detalles, created_at 
         FROM system_logs 
         ORDER BY id DESC 
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );
      return NextResponse.json({ logs: res.rows });
    } else if (type === 'payment') {
      const res = await pool.query(
        `SELECT up.id, u.nombre, u.email, up.monto, up.fecha, up.comprobante_url, up.notas, up.created_at
         FROM user_payments up
         JOIN users u ON up.user_id = u.id
         ORDER BY up.created_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );
      return NextResponse.json({ logs: res.rows });
    } else if (type === 'audit') {
      const res = await pool.query(
        `SELECT a.id, a.user_id, u.nombre as user_nombre, a.action, a.details, a.created_at
         FROM audit_logs a
         LEFT JOIN users u ON a.user_id = u.id
         ORDER BY a.id DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );
      return NextResponse.json({ logs: res.rows });
    }

    return NextResponse.json({ error: 'Tipo de log no soportado' }, { status: 400 });
  } catch (error: unknown) {
    console.error('Error fetching logs:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
