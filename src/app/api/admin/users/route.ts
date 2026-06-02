import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET: fetch users for management — superadmin sees all, admin sees only their company's users
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user || (user.tipo !== 'admin' && user.tipo !== 'superadmin')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    let res;
    if (user.tipo === 'superadmin') {
      res = await pool.query(
        `SELECT u.id, u.nombre, u.email, u.tipo, u.avatar, u.activo, u.aprobado, u.denegado, u.created_at, u.telefono,
                COALESCE(
                  json_agg(json_build_object('id', c.id, 'nombre', c.nombre, 'color', c.color))
                  FILTER (WHERE c.id IS NOT NULL), '[]'
                ) AS companies
         FROM users u
         LEFT JOIN user_companies uc ON uc.user_id = u.id
         LEFT JOIN companies c ON c.id = uc.company_id
         GROUP BY u.id
         ORDER BY u.aprobado ASC, u.denegado ASC, u.id ASC`
      );
    } else {
      // Company admin: only users in shared companies OR users with no company assigned (pending approval)
      res = await pool.query(
        `SELECT DISTINCT u.id, u.nombre, u.email, u.tipo, u.avatar, u.activo, u.aprobado, u.denegado, u.created_at, u.telefono,
                COALESCE(
                  json_agg(json_build_object('id', c.id, 'nombre', c.nombre, 'color', c.color))
                  FILTER (WHERE c.id IS NOT NULL), '[]'
                ) AS companies
         FROM users u
         LEFT JOIN user_companies uc ON uc.user_id = u.id
         LEFT JOIN companies c ON c.id = uc.company_id
         WHERE u.id IN (
           SELECT uc2.user_id FROM user_companies uc2
           WHERE uc2.company_id IN (
             SELECT company_id FROM user_companies WHERE user_id = $1
           )
         ) OR u.id = $1 OR NOT EXISTS (SELECT 1 FROM user_companies uc3 WHERE uc3.user_id = u.id)
         GROUP BY u.id
         ORDER BY u.id ASC`,
        [user.id]
      );
    }
    return NextResponse.json(res.rows);
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

// POST: update user status (activate/deactivate or change role)
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || (user.tipo !== 'admin' && user.tipo !== 'superadmin')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await req.json();
    const { action } = body;

    if (action === 'editUser') {
      const { userId: targetId, nombre, email, tipo, password } = body;
      if (!targetId) return NextResponse.json({ error: 'userId requerido' }, { status: 400 });
      if (!nombre?.trim()) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 });
      if (!email?.trim()) return NextResponse.json({ error: 'Email requerido' }, { status: 400 });

      // Admin cannot elevate to superadmin or edit other admins
      if (user.tipo === 'admin') {
        const targetRes = await pool.query('SELECT tipo FROM users WHERE id = $1', [targetId]);
        const targetTipo = targetRes.rows[0]?.tipo;
        if (targetTipo === 'admin' || targetTipo === 'superadmin') {
          return NextResponse.json({ error: 'No autorizado para editar administradores' }, { status: 403 });
        }
        if (tipo === 'admin' || tipo === 'superadmin') {
          return NextResponse.json({ error: 'No autorizado para asignar ese rol' }, { status: 403 });
        }
      }

      // Check email not taken by another user
      const dup = await pool.query('SELECT id FROM users WHERE email = $1 AND id <> $2', [email.trim().toLowerCase(), targetId]);
      if (dup.rows.length > 0) return NextResponse.json({ error: 'El correo ya está en uso por otro usuario' }, { status: 400 });

      let updateQuery: string;
      let params: any[];

      if (password?.trim()) {
        const bcrypt = await import('bcryptjs');
        const hash = await bcrypt.hash(password.trim(), 10);
        updateQuery = `UPDATE users SET nombre=$1, email=$2, tipo=$3, password_hash=$4 WHERE id=$5
          RETURNING id, nombre, email, tipo, avatar, activo, aprobado, denegado`;
        params = [nombre.trim(), email.trim().toLowerCase(), tipo, hash, targetId];
      } else {
        updateQuery = `UPDATE users SET nombre=$1, email=$2, tipo=$3 WHERE id=$4
          RETURNING id, nombre, email, tipo, avatar, activo, aprobado, denegado`;
        params = [nombre.trim(), email.trim().toLowerCase(), tipo, targetId];
      }

      const r = await pool.query(updateQuery, params);
      if (r.rows.length === 0) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
      return NextResponse.json({ success: true, user: r.rows[0] });
    }

    if (action === 'approve') {
      const { userId: targetId } = body;
      if (!targetId) return NextResponse.json({ error: 'userId requerido' }, { status: 400 });
      const r = await pool.query(
        `UPDATE users SET aprobado = true, denegado = false WHERE id = $1
         RETURNING id, nombre, email, tipo, avatar, activo, aprobado, denegado`,
        [targetId]
      );
      return NextResponse.json({ success: true, user: r.rows[0] });
    }

    if (action === 'deny') {
      const { userId: targetId } = body;
      if (!targetId) return NextResponse.json({ error: 'userId requerido' }, { status: 400 });
      const r = await pool.query(
        `UPDATE users SET aprobado = false, denegado = true WHERE id = $1
         RETURNING id, nombre, email, tipo, avatar, activo, aprobado, denegado`,
        [targetId]
      );
      return NextResponse.json({ success: true, user: r.rows[0] });
    }

    if (action === 'set_pending') {
      const { userId: targetId } = body;
      if (!targetId) return NextResponse.json({ error: 'userId requerido' }, { status: 400 });
      const r = await pool.query(
        `UPDATE users SET aprobado = false, denegado = false WHERE id = $1
         RETURNING id, nombre, email, tipo, avatar, activo, aprobado, denegado`,
        [targetId]
      );
      return NextResponse.json({ success: true, user: r.rows[0] });
    }

    if (action === 'assignCompany') {
      // Toggle: add if not member, remove if already member
      const { userId: targetUserId, companyId, assign } = body;
      if (!targetUserId || !companyId) return NextResponse.json({ error: 'userId y companyId requeridos' }, { status: 400 });
      
      // If company admin, they can only assign/remove companies they belong to
      if (user.tipo === 'admin') {
        const checkAdminCompany = await pool.query(
          'SELECT 1 FROM user_companies WHERE user_id = $1 AND company_id = $2',
          [user.id, companyId]
        );
        if (checkAdminCompany.rows.length === 0) {
          return NextResponse.json({ error: 'No autorizado para gestionar esta empresa' }, { status: 403 });
        }
      }

      if (assign) {
        await pool.query('INSERT INTO user_companies (user_id, company_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [targetUserId, companyId]);
      } else {
        await pool.query('DELETE FROM user_companies WHERE user_id = $1 AND company_id = $2', [targetUserId, companyId]);
      }
      return NextResponse.json({ success: true });
    }

    if (action === 'setCompanies') {
      // Replace all companies for a user (superadmin only)
      if (user.tipo !== 'superadmin') {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
      }
      const { userId: targetUserId, companyIds } = body;
      if (!targetUserId) return NextResponse.json({ error: 'userId requerido' }, { status: 400 });
      await pool.query('DELETE FROM user_companies WHERE user_id = $1', [targetUserId]);
      for (const cid of (companyIds || [])) {
        await pool.query('INSERT INTO user_companies (user_id, company_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [targetUserId, cid]);
      }
      return NextResponse.json({ success: true });
    }

    if (action === 'create') {
      const { nombre, email, password } = body;
      if (!nombre || !email || !password) {
        return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
      }

      // Company admin can only create regular users
      let tipoNuevo = body.tipo || 'user';
      if (user.tipo === 'admin') {
        tipoNuevo = 'user';
      }
      // Only superadmin can create superadmin accounts
      if (tipoNuevo === 'superadmin' && user.tipo !== 'superadmin') {
        return NextResponse.json({ error: 'No autorizado para crear superadministradores' }, { status: 403 });
      }

      // Check if email already exists
      const checkRes = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
      if (checkRes.rows.length > 0) {
        return NextResponse.json({ error: 'El correo electrónico ya está registrado' }, { status: 400 });
      }

      const bcrypt = await import('bcryptjs');
      const passwordHash = await bcrypt.hash(password, 10);
      const defaultAvatar = `/uploads/avatars/avatar_${Math.floor(Math.random() * 5) + 1}.png`;

      const insertQuery = `
        INSERT INTO users (nombre, email, password_hash, tipo, avatar, activo, aprobado)
        VALUES ($1, $2, $3, $4, $5, true, true)
        RETURNING id, nombre, email, tipo, avatar, activo, aprobado, created_at
      `;

      const res = await pool.query(insertQuery, [
        nombre.trim(),
        email.toLowerCase().trim(),
        passwordHash,
        tipoNuevo,
        defaultAvatar
      ]);

      const newUserId = res.rows[0].id;

      // Auto-assign new user to admin's companies (if company admin)
      if (user.tipo === 'admin') {
        const adminCompanies = await pool.query('SELECT company_id FROM user_companies WHERE user_id = $1', [user.id]);
        for (const row of adminCompanies.rows) {
          await pool.query('INSERT INTO user_companies (user_id, company_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [newUserId, row.company_id]);
        }
      }

      // If superadmin specifies a companyId for new admin user, assign it
      if (user.tipo === 'superadmin' && body.companyId) {
        await pool.query('INSERT INTO user_companies (user_id, company_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [newUserId, body.companyId]);
      }

      return NextResponse.json({ success: true, user: res.rows[0] });
    }

    const { userId, activo, tipo, aprobado } = body;

    if (userId === undefined) {
      return NextResponse.json({ error: 'Falta ID de usuario' }, { status: 400 });
    }

    // Don't allow admins to deactivate themselves
    if (parseInt(userId) === user.id) {
      return NextResponse.json({ error: 'No puedes desactivarte a ti mismo' }, { status: 400 });
    }

    // Company admin cannot modify other admins or superadmins
    if (user.tipo === 'admin') {
      const targetRes = await pool.query('SELECT tipo FROM users WHERE id = $1', [userId]);
      if (targetRes.rows.length > 0 && (targetRes.rows[0].tipo === 'admin' || targetRes.rows[0].tipo === 'superadmin')) {
        return NextResponse.json({ error: 'No autorizado para modificar administradores' }, { status: 403 });
      }
    }

    const updateQuery = `
      UPDATE users 
      SET activo = COALESCE($1, activo),
          tipo = COALESCE($2, tipo),
          aprobado = COALESCE($3, aprobado)
      WHERE id = $4
      RETURNING id, nombre, email, tipo, avatar, activo, aprobado
    `;

    const res = await pool.query(updateQuery, [
      activo !== undefined ? activo : null,
      tipo || null,
      aprobado !== undefined ? aprobado : null,
      userId
    ]);

    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ success: true, user: res.rows[0] });
  } catch (error: any) {
    console.error('Error updating user status:', error);
    return NextResponse.json({ error: 'Error del servidor: ' + error.message }, { status: 500 });
  }
}
