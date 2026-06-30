import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { broadcastUpdate } from '@/lib/realtime';

export const dynamic = 'force-dynamic';

// POST: Create a system message (official announcement) and send via Telegram
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || (user.tipo !== 'admin' && user.tipo !== 'superadmin')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { message, target_type, target_id } = body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'El mensaje es requerido' }, { status: 400 });
    }

    const trimmedMessage = message.trim();
    if (trimmedMessage.length > 500) {
      return NextResponse.json({ error: 'El mensaje no puede exceder los 500 caracteres' }, { status: 400 });
    }

    let resolvedTargetType = target_type || 'all';
    let resolvedTargetId = target_id ? Number(target_id) : null;

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

      if (resolvedTargetType !== 'company' || !resolvedTargetId || !userCompanyIds.includes(resolvedTargetId)) {
        resolvedTargetType = 'company';
        resolvedTargetId = userCompanyIds[0];
      }
    }

    const res = await pool.query(
      `INSERT INTO global_messages (user_id, message, is_system, target_type, target_id)
       VALUES ($1, $2, TRUE, $3, $4)
       RETURNING *`,
      [user.id, trimmedMessage, resolvedTargetType, resolvedTargetId]
    );

    const inserted = res.rows[0];

    const chatMsg = {
      ...inserted,
      user_nombre: user.nombre,
      user_avatar: user.avatar,
      user_tipo: user.tipo,
    };

    broadcastUpdate('chat', chatMsg);

    // Send Telegram notifications asynchronously
    let targetLabel = 'Todos';
    if (resolvedTargetType === 'company') {
      const compRes = await pool.query('SELECT nombre FROM companies WHERE id = $1', [resolvedTargetId]);
      targetLabel = compRes.rows[0]?.nombre || `Empresa #${resolvedTargetId}`;
    } else if (resolvedTargetType === 'group') {
      const grpRes = await pool.query('SELECT nombre FROM groups WHERE id = $1', [resolvedTargetId]);
      targetLabel = grpRes.rows[0]?.nombre || `Grupo #${resolvedTargetId}`;
    } else if (resolvedTargetType === 'user') {
      const usrRes = await pool.query('SELECT nombre FROM users WHERE id = $1', [resolvedTargetId]);
      targetLabel = usrRes.rows[0]?.nombre || `Usuario #${resolvedTargetId}`;
    }

    const telegramText = `📣 Aviso Oficial\n${trimmedMessage}\nDestinatario: ${targetLabel}`;

    let usersQuery = `SELECT id FROM users WHERE activo = true AND aprobado = true`;
    const queryParams: any[] = [];

    if (resolvedTargetType === 'user') {
      usersQuery += ` AND id = $1`;
      queryParams.push(resolvedTargetId);
    } else if (resolvedTargetType === 'company') {
      usersQuery += ` AND EXISTS (SELECT 1 FROM user_companies uc WHERE uc.user_id = users.id AND uc.company_id = $1)`;
      queryParams.push(resolvedTargetId);
    } else if (resolvedTargetType === 'group') {
      usersQuery += ` AND EXISTS (SELECT 1 FROM user_groups ug WHERE ug.user_id = users.id AND ug.group_id = $1)`;
      queryParams.push(resolvedTargetId);
    }

    const targetedUsers = await pool.query(usersQuery, queryParams);
    
    const { sendTelegramNotification } = await import('@/lib/push');
    for (const u of targetedUsers.rows) {
      sendTelegramNotification(u.id, telegramText).catch(e => {
        console.error(`Failed to send Telegram notification to user ${u.id}:`, e);
      });
    }

    return NextResponse.json({ success: true, message: chatMsg });
  } catch (error: unknown) {
    console.error('Error creating system chat message:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
