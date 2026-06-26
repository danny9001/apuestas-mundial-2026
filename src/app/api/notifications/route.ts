import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { broadcastUpdate } from '@/lib/realtime';
import { logSystem } from '@/lib/mail';

export const dynamic = 'force-dynamic';


export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }


    const { searchParams } = new URL(req.url);
    const isAdminQuery = searchParams.get('admin') === 'true';

    if (isAdminQuery) {
      if (user.tipo !== 'admin' && user.tipo !== 'superadmin') {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
      }

      let query = `
        SELECT n.id, n.titulo, n.contenido, n.tipo, n.target_type, n.target_id, n.expires_at, n.created_at, n.created_by,
               u.nombre as creator_name
        FROM notifications n
        LEFT JOIN users u ON u.id = n.created_by
      `;
      let params: any[] = [];

      if (user.tipo !== 'superadmin') {
        // Admins can see notifications they created OR notifications targeted to their companies
        query += `
          WHERE n.created_by = $1
             OR (n.target_type = 'company' AND n.target_id IN (
               SELECT company_id FROM user_companies WHERE user_id = $1
             ))
        `;
        params.push(user.id);
      }

      query += ` ORDER BY n.created_at DESC LIMIT 100`;

      const res = await pool.query(query, params);
      const response = NextResponse.json(res.rows);
      response.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
      return response;
    }

    const popupOnly = searchParams.get('popup') === 'true';

    const res = await pool.query(
      `SELECT n.id, n.titulo, n.contenido, n.tipo, n.target_type, n.target_id,
              n.expires_at, n.created_at, n.show_as_popup,
              (nr.user_id IS NOT NULL) AS leido
       FROM notifications n
       LEFT JOIN notification_reads nr ON nr.notification_id = n.id AND nr.user_id = $1
       WHERE (n.expires_at IS NULL OR n.expires_at > NOW())
         AND (
           n.target_type = 'all'
           OR (n.target_type = 'user' AND n.target_id = $1)
           OR (n.target_type = 'group' AND EXISTS (
             SELECT 1 FROM user_groups ug WHERE ug.user_id = $1 AND ug.group_id = n.target_id
           ))
           OR (n.target_type = 'company' AND EXISTS (
             SELECT 1 FROM user_companies uc WHERE uc.user_id = $1 AND uc.company_id = n.target_id
           ))
         )
         ${popupOnly ? 'AND n.show_as_popup = TRUE AND nr.user_id IS NULL' : ''}
       ORDER BY n.created_at ASC
       LIMIT 50`,
      [user.id]
    );

    const response = NextResponse.json(res.rows);
    response.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
    return response;
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || (user.tipo !== 'admin' && user.tipo !== 'superadmin')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }


    const body = await req.json();
    const { titulo, contenido, tipo, target_type, target_id, expires_at, show_as_popup } = body;

    if (!titulo?.trim() || !contenido?.trim()) {
      return NextResponse.json({ error: 'Título y contenido son requeridos' }, { status: 400 });
    }

    let resolvedTargetType = target_type || 'all';
    let resolvedTargetId = target_id || null;

    if (user.tipo !== 'superadmin') {
      // Query the database directly to get the admin's assigned companies
      const userCompaniesRes = await pool.query(
        'SELECT company_id FROM user_companies WHERE user_id = $1',
        [user.id]
      );
      const userCompanyIds = userCompaniesRes.rows.map(r => r.company_id);

      if (userCompanyIds.length === 0) {
        return NextResponse.json({ error: 'No tienes ninguna empresa asignada para enviar mensajes.' }, { status: 403 });
      }

      if (resolvedTargetType !== 'company' || !resolvedTargetId || !userCompanyIds.includes(Number(resolvedTargetId))) {
        resolvedTargetType = 'company';
        resolvedTargetId = userCompanyIds[0];
      }
    }

    const res = await pool.query(
      `INSERT INTO notifications (titulo, contenido, tipo, target_type, target_id, created_by, expires_at, show_as_popup)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        titulo.trim(),
        contenido.trim(),
        tipo || 'info',
        resolvedTargetType,
        resolvedTargetId,
        user.id,
        expires_at || null,
        !!show_as_popup,
      ]
    );

    broadcastUpdate('notification', {
      notificationId: res.rows[0].id,
      titulo: res.rows[0].titulo,
      tipo: res.rows[0].tipo,
      target_type: res.rows[0].target_type,
      target_id: res.rows[0].target_id,
    });

    const targetLabel = resolvedTargetType === 'all' ? 'todos' : resolvedTargetType === 'company' ? `empresa #${resolvedTargetId}` : resolvedTargetType === 'user' ? `usuario #${resolvedTargetId}` : `grupo #${resolvedTargetId}`;
    logSystem('info', 'MENSAJE', `${user.nombre} envió mensaje: "${titulo.trim()}"`, `Destinatario: ${targetLabel}`).catch(() => {});

    return NextResponse.json({ success: true, notification: res.rows[0] });
  } catch (error: any) {
    console.error('Error creating notification:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || (user.tipo !== 'admin' && user.tipo !== 'superadmin')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await req.json();
    const { id, titulo, contenido, tipo, target_type, target_id, expires_at, show_as_popup } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID es requerido' }, { status: 400 });
    }

    if (!titulo?.trim() || !contenido?.trim()) {
      return NextResponse.json({ error: 'Título y contenido son requeridos' }, { status: 400 });
    }

    let query = `UPDATE notifications SET titulo = $1, contenido = $2, tipo = $3, target_type = $4, target_id = $5, expires_at = $6, show_as_popup = $7 WHERE id = $8`;
    let params: any[] = [titulo.trim(), contenido.trim(), tipo || 'info', target_type || 'all', target_id || null, expires_at || null, !!show_as_popup, id];

    if (user.tipo !== 'superadmin') {
      query += ` AND created_by = $9`;
      params.push(user.id);
    }

    const res = await pool.query(query + ` RETURNING *`, params);
    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'Notificación no encontrada o no tienes permisos' }, { status: 404 });
    }

    broadcastUpdate('notification', {
      notificationId: res.rows[0].id,
      titulo: res.rows[0].titulo,
      tipo: res.rows[0].tipo,
      target_type: res.rows[0].target_type,
      target_id: res.rows[0].target_id,
      updated: true
    });

    return NextResponse.json({ success: true, notification: res.rows[0] });
  } catch (error: any) {
    console.error('Error updating notification:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || (user.tipo !== 'admin' && user.tipo !== 'superadmin')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID es requerido' }, { status: 400 });
    }

    let query = `DELETE FROM notifications WHERE id = $1`;
    let params = [parseInt(id)];

    if (user.tipo !== 'superadmin') {
      query += ` AND created_by = $2`;
      params.push(user.id);
    }

    const res = await pool.query(query + ` RETURNING id`, params);
    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'Notificación no encontrada o no tienes permisos' }, { status: 404 });
    }

    broadcastUpdate('notification', {
      notificationId: parseInt(id),
      deleted: true
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting notification:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

