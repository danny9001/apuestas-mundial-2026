import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    // Public: validate an invitation token (no auth needed for the landing page)
    if (token) {
      const res = await pool.query(
        `SELECT i.id, i.token, i.used, i.email_usado, i.expires_at, i.created_at,
                c.id as company_id, c.nombre as company_nombre, c.color as company_color
         FROM invitations i
         LEFT JOIN companies c ON c.id = i.company_id
         WHERE i.token = $1`,
        [token]
      );
      if (res.rows.length === 0) return NextResponse.json({ error: 'Invitación no encontrada' }, { status: 404 });
      const row = res.rows[0];
      const expired = new Date(row.expires_at) < new Date();
      return NextResponse.json({ ...row, expired, used: false });
    }

    // Protected: list invitations for admin/superadmin
    const user = await getSessionUser();
    if (!user || (user.tipo !== 'admin' && user.tipo !== 'superadmin'))
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

    const companyFilter = user.tipo === 'admin'
      ? 'AND i.company_id IN (SELECT company_id FROM user_companies WHERE user_id = $1)'
      : '';
    const params: unknown[] = user.tipo === 'admin' ? [user.id] : [];

    const listRes = await pool.query(
      `SELECT i.id, i.token, i.used, i.email_usado, i.expires_at, i.created_at,
              c.id as company_id, c.nombre as company_nombre, u.nombre as created_by_nombre
       FROM invitations i
       LEFT JOIN companies c ON c.id = i.company_id
       LEFT JOIN users u ON u.id = i.created_by
       WHERE 1=1 ${companyFilter}
       ORDER BY i.created_at DESC LIMIT 50`,
      params
    );
    return NextResponse.json(listRes.rows);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    // Public endpoint: consume an invitation — multi-use until expiry
    if (action === 'consume') {
      const { token, email } = body;
      if (!token || !email) return NextResponse.json({ error: 'token y email requeridos' }, { status: 400 });

      const inv = await pool.query(
        'SELECT id, company_id, expires_at FROM invitations WHERE token = $1',
        [token]
      );
      if (inv.rows.length === 0) return NextResponse.json({ error: 'Invitación no encontrada' }, { status: 404 });
      const invitation = inv.rows[0];
      if (new Date(invitation.expires_at) < new Date()) return NextResponse.json({ error: 'Invitación expirada' }, { status: 410 });

      const userRes = await pool.query('SELECT id FROM users WHERE lower(email) = lower($1)', [email]);
      if (userRes.rows.length === 0) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
      const userId = userRes.rows[0].id;

      if (invitation.company_id) {
        await pool.query(
          'INSERT INTO user_companies (user_id, company_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [userId, invitation.company_id]
        );
      }
      await pool.query(
        'UPDATE invitations SET email_usado = $1 WHERE id = $2',
        [email.toLowerCase(), invitation.id]
      );
      return NextResponse.json({ success: true, company_id: invitation.company_id, user_id: userId });
    }

    const user = await getSessionUser();
    if (!user || (user.tipo !== 'admin' && user.tipo !== 'superadmin'))
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

    if (action === 'create') {
      const { company_id } = body;
      if (!company_id) return NextResponse.json({ error: 'company_id requerido' }, { status: 400 });

      if (user.tipo === 'admin') {
        const check = await pool.query(
          'SELECT 1 FROM user_companies WHERE user_id = $1 AND company_id = $2',
          [user.id, company_id]
        );
        if (check.rows.length === 0)
          return NextResponse.json({ error: 'No autorizado para esta empresa' }, { status: 403 });
      }

      const res = await pool.query(
        `INSERT INTO invitations (company_id, created_by, expires_at)
         VALUES ($1, $2, NOW() + INTERVAL '7 days')
         RETURNING id, token, expires_at, company_id`,
        [company_id, user.id]
      );
      return NextResponse.json({ success: true, invitation: res.rows[0] });
    }

    if (action === 'delete') {
      const { id } = body;
      if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });
      await pool.query('DELETE FROM invitations WHERE id = $1', [id]);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
