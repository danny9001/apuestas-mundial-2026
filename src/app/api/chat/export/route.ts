import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || !user.aprobado) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const isAdmin = user.tipo === 'superadmin' || user.tipo === 'admin';

    if (!isAdmin) {
      return NextResponse.json({ error: 'Acceso denegado. Se requieren permisos de administrador.' }, { status: 403 });
    }

    // Query all messages, joining with users, including deleted ones for audit/moderation purposes
    // We order them by creation time descending or ascending. Ascending makes sense for logs.
    const query = `
      SELECT 
        gm.id,
        gm.user_id,
        u.nombre as user_nombre,
        u.email as user_email,
        gm.message,
        gm.is_system,
        gm.created_at,
        gm.deleted_at,
        gm.deleted_by_id,
        del_u.nombre as deleted_by_nombre
      FROM global_messages gm
      LEFT JOIN users u ON gm.user_id = u.id
      LEFT JOIN users del_u ON gm.deleted_by_id = del_u.id
      ORDER BY gm.created_at ASC
    `;

    const res = await pool.query(query);

    return NextResponse.json(res.rows);
  } catch (error: any) {
    console.error('Error exporting chat logs:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
