import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || (sessionUser.tipo !== 'admin' && sessionUser.tipo !== 'superadmin')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    let query = `
      SELECT 
        m.id AS match_id,
        m.local,
        m.visitante,
        m.fecha,
        u.id AS user_id,
        u.nombre AS user_nombre,
        u.email AS user_email,
        u.telefono AS user_telefono,
        COALESCE(
          json_agg(json_build_object('id', c.id, 'nombre', c.nombre)) 
          FILTER (WHERE c.id IS NOT NULL), '[]'
        ) AS companies
      FROM matches m
      CROSS JOIN users u
      LEFT JOIN user_companies uc ON uc.user_id = u.id
      LEFT JOIN companies c ON c.id = uc.company_id
      WHERE m.estado = 'upcoming'
        AND m.fecha BETWEEN NOW() AND NOW() + INTERVAL '12 hours'
        AND u.activo = true
        AND u.aprobado = true
        AND u.participa IS NOT FALSE
        AND (u.tipo != 'superadmin' OR EXISTS (SELECT 1 FROM user_companies WHERE user_id = u.id))
        AND NOT EXISTS (
          SELECT 1 FROM predictions p 
          WHERE p.user_id = u.id AND p.match_id = m.id
        )
    `;

    const params: any[] = [];

    if (sessionUser.tipo === 'admin') {
      // Standard admin only sees users in their company
      query += `
        AND EXISTS (
          SELECT 1 FROM user_companies uc_admin
          WHERE uc_admin.user_id = $1 
            AND uc_admin.company_id = uc.company_id
        )
      `;
      params.push(sessionUser.id);
    }

    query += `
      GROUP BY m.id, m.local, m.visitante, m.fecha, u.id, u.nombre, u.email, u.telefono
      ORDER BY m.fecha ASC, u.nombre ASC
    `;

    const res = await pool.query(query, params);

    // Group result by match
    const grouped: Record<number, any> = {};
    for (const row of res.rows) {
      if (!grouped[row.match_id]) {
        grouped[row.match_id] = {
          match_id: row.match_id,
          local: row.local,
          visitante: row.visitante,
          fecha: row.fecha,
          users: [],
        };
      }
      grouped[row.match_id].users.push({
        id: row.user_id,
        nombre: row.user_nombre,
        email: row.user_email,
        telefono: row.user_telefono,
        companies: row.companies,
      });
    }

    return NextResponse.json(Object.values(grouped));
  } catch (error: any) {
    console.error('Error fetching unbet users:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || (sessionUser.tipo !== 'admin' && sessionUser.tipo !== 'superadmin')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { action, matchId, usersList, local, visitante } = body;

    if (action === 'notify') {
      if (!matchId || !usersList || !Array.isArray(usersList)) {
        return NextResponse.json({ error: 'Datos incompletos para notificar' }, { status: 400 });
      }

      const closeRes = await pool.query("SELECT value FROM settings WHERE key = 'prediction_close_minutes'");
      const closeMinutes = closeRes.rows.length > 0 ? parseInt(closeRes.rows[0].value, 10) || 15 : 15;

      const { sendPushNotification } = await import('@/lib/push');
      const titulo = `⚠️ Recordatorio: Falta tu apuesta`;
      const contenido = `Aún no registraste tu pronóstico para el partido ${local} vs ${visitante}. Recuerda que las apuestas cierran ${closeMinutes} minutos antes de que comience el partido.`;

      let count = 0;
      for (const u of usersList) {
        // Double check permissions for standard admins
        if (sessionUser.tipo === 'admin') {
          const checkRes = await pool.query(
            `SELECT 1 FROM user_companies uc1
             JOIN user_companies uc2 ON uc1.company_id = uc2.company_id
             WHERE uc1.user_id = $1 AND uc2.user_id = $2`,
            [sessionUser.id, u.id]
          );
          if (checkRes.rows.length === 0) continue;
        }

        await sendPushNotification(u.id, {
          title: titulo,
          body: contenido,
          icon: '/icon-192x192.svg',
          url: '/'
        });
        count++;
      }

      return NextResponse.json({ success: true, notified_count: count });
    } else if (action === 'publish_public') {
      if (!matchId || !usersList || !Array.isArray(usersList) || !local || !visitante) {
        return NextResponse.json({ error: 'Datos incompletos para publicar' }, { status: 400 });
      }

      const closeRes2 = await pool.query("SELECT value FROM settings WHERE key = 'prediction_close_minutes'");
      const closeMinutes2 = closeRes2.rows.length > 0 ? parseInt(closeRes2.rows[0].value, 10) || 15 : 15;

      const names = usersList.map((u: any) => u.nombre).join(', ');
      const titulo = `🚫 Sin Pronóstico: ${local} vs ${visitante}`;
      const contenido = `Los siguientes participantes aún no guardaron su pronóstico para el partido ${local} vs ${visitante}:\n${names}\n\n¡Apúrense, cierra ${closeMinutes2} minutos antes del pitazo inicial!`;

      // Insert notification
      const res = await pool.query(
        `INSERT INTO notifications (titulo, contenido, tipo, target_type, target_id, created_by)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, titulo, tipo, target_type, target_id`,
        [titulo, contenido, 'warning', 'all', null, sessionUser.id]
      );
      
      const { broadcastUpdate } = await import('@/lib/realtime');
      broadcastUpdate('notification', res.rows[0]);

      // Push notification to all active users
      const { sendPushToAllActive } = await import('@/lib/push');
      await sendPushToAllActive({
        title: titulo,
        body: contenido,
        icon: '/icon-192x192.svg',
        url: '/'
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Acción no soportada' }, { status: 400 });
  } catch (error: any) {
    console.error('Error in unbet POST route:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
