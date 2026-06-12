import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { broadcastUpdate } from '@/lib/realtime';
import { sendPushNotification } from '@/lib/push';
import { sendMail, buildApprovalEmail, buildDenialEmail } from '@/lib/mail';
import { isValidEmail, sanitizeText, validatePassword, isValidRole, BCRYPT_ROUNDS } from '@/lib/validation';
import { syncCompanyAssignment, unsyncCompanyAssignment, syncUserToIdentity, syncUserPassword } from '@/lib/identity-sync';

async function ensureNotificationsTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      titulo VARCHAR(255) NOT NULL,
      contenido TEXT NOT NULL,
      tipo VARCHAR(20) DEFAULT 'info',
      target_type VARCHAR(20) DEFAULT 'all',
      target_id INTEGER,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      expires_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notification_reads (
      notification_id INTEGER REFERENCES notifications(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      read_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (notification_id, user_id)
    )
  `);
}

async function notifyUser(targetId: number, adminId: number, titulo: string, contenido: string, tipo: string) {
  try {
    await ensureNotificationsTables();
    const notif = await pool.query(
      `INSERT INTO notifications (titulo, contenido, tipo, target_type, target_id, created_by)
       VALUES ($1, $2, $3, 'user', $4, $5)
       RETURNING id, titulo, tipo, target_type, target_id`,
      [titulo, contenido, tipo, targetId, adminId]
    );
    broadcastUpdate('notification', {
      notificationId: notif.rows[0].id,
      titulo: notif.rows[0].titulo,
      tipo: notif.rows[0].tipo,
      target_type: notif.rows[0].target_type,
      target_id: notif.rows[0].target_id,
    });
  } catch (err) {
    console.error('Error sending user notification:', err);
  }
}

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
        `SELECT u.id, u.nombre, u.email, u.tipo, u.avatar, u.activo, u.aprobado, u.denegado, u.created_at, u.telefono, u.participa, u.tincaso,
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
        `SELECT u.id, u.nombre, u.email, u.tipo, u.avatar, u.activo, u.aprobado, u.denegado, u.created_at, u.telefono, u.participa, u.tincaso,
                COALESCE(
                  json_agg(json_build_object('id', c.id, 'nombre', c.nombre, 'color', c.color))
                  FILTER (WHERE c.id IS NOT NULL), '[]'
                ) AS companies
         FROM users u
         LEFT JOIN user_companies uc ON uc.user_id = u.id
         LEFT JOIN companies c ON c.id = uc.company_id
         WHERE (u.id IN (
           SELECT uc2.user_id FROM user_companies uc2
           WHERE uc2.company_id IN (
             SELECT company_id FROM user_companies WHERE user_id = $1
           )
         ) OR u.id = $1 OR NOT EXISTS (SELECT 1 FROM user_companies uc3 WHERE uc3.user_id = u.id))
         AND u.tipo != 'superadmin'
         GROUP BY u.id, u.nombre, u.email, u.tipo, u.avatar, u.activo, u.aprobado, u.denegado, u.created_at, u.telefono, u.tincaso
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
      return NextResponse.json({ error: `No autorizado (User: ${user?.tipo || 'null'})` }, { status: 403 });
    }

    const body = await req.json();
    const { action } = body;

    if (action === 'editUser') {
      const { userId: targetId, nombre, email, tipo, password, telefono, tincaso } = body;
      if (!targetId) return NextResponse.json({ error: 'userId requerido' }, { status: 400 });

      const nombreSafe = sanitizeText(nombre ?? '', 100);
      if (!nombreSafe) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 });

      const emailNorm = (email ?? '').toString().toLowerCase().trim();
      if (!isValidEmail(emailNorm)) return NextResponse.json({ error: 'Formato de correo inválido' }, { status: 400 });

      if (tipo && !isValidRole(tipo)) {
        return NextResponse.json({ error: 'Rol no válido' }, { status: 400 });
      }

      // Admin cannot elevate to superadmin or edit other admins
      if (user.tipo === 'admin') {
        const targetRes = await pool.query('SELECT tipo FROM users WHERE id = $1', [targetId]);
        const targetTipo = targetRes.rows[0]?.tipo;
        if (targetTipo === 'admin' || targetTipo === 'superadmin') {
          return NextResponse.json({ error: 'No autorizado para editar administradores (Tu rol es admin)' }, { status: 403 });
        }
        if (tipo === 'admin' || tipo === 'superadmin') {
          return NextResponse.json({ error: 'No autorizado para asignar rol de admin/superadmin' }, { status: 403 });
        }
      }

      // Case-insensitive duplicate check
      const dup = await pool.query(
        'SELECT id FROM users WHERE lower(email) = $1 AND id <> $2',
        [emailNorm, targetId]
      );
      if (dup.rows.length > 0) return NextResponse.json({ error: 'El correo ya está en uso por otro usuario' }, { status: 400 });

      const tel = telefono ? sanitizeText(String(telefono), 30) : null;
      let updateQuery: string;
      let params: any[];

      if (password?.trim()) {
        const pwCheck = validatePassword(password.trim());
        if (!pwCheck.ok) return NextResponse.json({ error: pwCheck.error }, { status: 400 });
        const bcrypt = await import('bcryptjs');
        const hash = await bcrypt.hash(password.trim(), BCRYPT_ROUNDS);
        updateQuery = `UPDATE users SET nombre=$1, email=$2, tipo=$3, password_hash=$4, telefono=$5, tincaso=$6 WHERE id=$7
          RETURNING id, nombre, email, tipo, telefono, avatar, activo, aprobado, denegado, tincaso`;
        params = [nombreSafe, emailNorm, tipo, hash, tel, tincaso || null, targetId];
      } else {
        updateQuery = `UPDATE users SET nombre=$1, email=$2, tipo=$3, telefono=$4, tincaso=$5 WHERE id=$6
          RETURNING id, nombre, email, tipo, telefono, avatar, activo, aprobado, denegado, tincaso`;
        params = [nombreSafe, emailNorm, tipo, tel, tincaso || null, targetId];
      }

      const r = await pool.query(updateQuery, params);
      if (r.rows.length === 0) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
      // Sync password to Identity if it was changed
      if (password?.trim()) {
        void syncUserToIdentity({ email: emailNorm, name: nombreSafe, password: password.trim() });
        void syncUserPassword({ email: emailNorm, password: password.trim() });
      }
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
      await notifyUser(
        targetId, user.id,
        '¡Tu cuenta ha sido aprobada!',
        'El administrador aprobó tu participación. Ya podés guardar pronósticos y ver la clasificación general.',
        'success'
      );
      await sendPushNotification(targetId, {
        title: '¡Tu cuenta fue aprobada!',
        body: 'Ya podés guardar pronósticos y ver la clasificación general.',
        icon: '/icon-192x192.svg',
        url: '/',
      });
      if (r.rows[0]?.email) {
        sendMail({
          to: r.rows[0].email,
          subject: '[Mundial 2026] ¡Tu cuenta fue aprobada!',
          html: buildApprovalEmail(r.rows[0].nombre),
        }).catch((e) => console.error('Approval email error:', e));
      }
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
      await notifyUser(
        targetId, user.id,
        'Solicitud de participación denegada',
        'Tu solicitud no fue aprobada por el administrador. Si creés que es un error, contactalo directamente.',
        'error'
      );
      await sendPushNotification(targetId, {
        title: 'Solicitud denegada',
        body: 'Tu solicitud no fue aprobada. Contactá al administrador.',
        icon: '/icon-192x192.svg',
        url: '/',
      });
      if (r.rows[0]?.email) {
        sendMail({
          to: r.rows[0].email,
          subject: '[Mundial 2026] Solicitud de participación denegada',
          html: buildDenialEmail(r.rows[0].nombre),
        }).catch((e) => console.error('Denial email error:', e));
      }
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
      const { userId: targetUserId, companyId, assign } = body;
      if (!targetUserId || !companyId) return NextResponse.json({ error: 'userId y companyId requeridos' }, { status: 400 });

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
        // Sync to Identity
        const [targetUser, company] = await Promise.all([
          pool.query('SELECT email, tipo FROM users WHERE id = $1', [targetUserId]),
          pool.query('SELECT nombre FROM companies WHERE id = $1', [companyId]),
        ]);
        if (targetUser.rows.length > 0 && company.rows.length > 0) {
          syncCompanyAssignment(targetUser.rows[0].email, company.rows[0].nombre, targetUser.rows[0].tipo).catch(() => {});
        }
      } else {
        const [targetUser, company] = await Promise.all([
          pool.query('SELECT email FROM users WHERE id = $1', [targetUserId]),
          pool.query('SELECT nombre FROM companies WHERE id = $1', [companyId]),
        ]);
        await pool.query('DELETE FROM user_companies WHERE user_id = $1 AND company_id = $2', [targetUserId, companyId]);
        if (targetUser.rows.length > 0 && company.rows.length > 0) {
          unsyncCompanyAssignment(targetUser.rows[0].email, company.rows[0].nombre).catch(() => {});
        }
      }
      return NextResponse.json({ success: true });
    }

    if (action === 'toggleParticipa') {
      const { userId: targetUserId } = body;
      if (!targetUserId) return NextResponse.json({ error: 'userId requerido' }, { status: 400 });
      const r = await pool.query(
        'UPDATE users SET participa = NOT participa WHERE id = $1 RETURNING id, participa',
        [targetUserId]
      );
      return NextResponse.json({ success: true, participa: r.rows[0]?.participa });
    }

    if (action === 'setCompanies') {
      const { userId: targetUserId, companyIds } = body;
      if (!targetUserId) return NextResponse.json({ error: 'userId requerido' }, { status: 400 });
      
      const targetUserRes = await pool.query('SELECT email, tipo FROM users WHERE id = $1', [targetUserId]);
      const targetUser = targetUserRes.rows[0];
      if (!targetUser) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
      
      if (user.tipo === 'superadmin') {
        const currentCompaniesRes = await pool.query('SELECT company_id FROM user_companies WHERE user_id = $1', [targetUserId]);
        const currentCompanyIds = currentCompaniesRes.rows.map(r => r.company_id);

        await pool.query('DELETE FROM user_companies WHERE user_id = $1', [targetUserId]);
        for (const cid of (companyIds || [])) {
          await pool.query('INSERT INTO user_companies (user_id, company_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [targetUserId, cid]);
          const companyRes = await pool.query('SELECT nombre FROM companies WHERE id = $1', [cid]);
          if (companyRes.rows.length > 0) {
            syncCompanyAssignment(targetUser.email, companyRes.rows[0].nombre, targetUser.tipo).catch(() => {});
          }
        }

        for (const cid of currentCompanyIds) {
          if (!(companyIds || []).includes(cid)) {
            const companyRes = await pool.query('SELECT nombre FROM companies WHERE id = $1', [cid]);
            if (companyRes.rows.length > 0) {
              unsyncCompanyAssignment(targetUser.email, companyRes.rows[0].nombre).catch(() => {});
            }
          }
        }
      } else if (user.tipo === 'admin') {
        // Admin can only replace companies they own
        const adminCompanies = await pool.query('SELECT company_id FROM user_companies WHERE user_id = $1', [user.id]);
        const adminCompIds = adminCompanies.rows.map(r => r.company_id);
        
        // Delete target user from all admin's companies
        if (adminCompIds.length > 0) {
          await pool.query('DELETE FROM user_companies WHERE user_id = $1 AND company_id = ANY($2::int[])', [targetUserId, adminCompIds]);
        }
        
        // Insert new ones, but only if they are in admin's companies
        for (const cid of (companyIds || [])) {
          if (adminCompIds.includes(cid)) {
            await pool.query('INSERT INTO user_companies (user_id, company_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [targetUserId, cid]);
          }
        }
      }
      return NextResponse.json({ success: true });
    }

    if (action === 'create') {
      const { nombre, email, password } = body;
      if (!nombre || !email || !password) {
        return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
      }

      const nombreSafe2 = sanitizeText(String(nombre), 100);
      if (!nombreSafe2) return NextResponse.json({ error: 'Nombre inválido' }, { status: 400 });

      const emailNorm2 = String(email).toLowerCase().trim();
      if (!isValidEmail(emailNorm2)) {
        return NextResponse.json({ error: 'Formato de correo inválido' }, { status: 400 });
      }

      const pwCheck2 = validatePassword(String(password));
      if (!pwCheck2.ok) return NextResponse.json({ error: pwCheck2.error }, { status: 400 });

      // Company admin can only create regular users
      let tipoNuevo = body.tipo || 'externo';
      if (user.tipo === 'admin') tipoNuevo = 'externo';
      if (!isValidRole(tipoNuevo)) tipoNuevo = 'externo';

      // Only superadmin can create superadmin accounts
      if (tipoNuevo === 'superadmin' && user.tipo !== 'superadmin') {
        return NextResponse.json({ error: 'No autorizado para crear superadministradores' }, { status: 403 });
      }

      // Case-insensitive duplicate check
      const checkRes = await pool.query(
        'SELECT id FROM users WHERE lower(email) = $1',
        [emailNorm2]
      );
      if (checkRes.rows.length > 0) {
        return NextResponse.json({ error: 'El correo electrónico ya está registrado' }, { status: 400 });
      }

      const telSafe = body.telefono ? sanitizeText(String(body.telefono), 30) : null;

      const bcrypt = await import('bcryptjs');
      const passwordHash = await bcrypt.hash(String(password).trim(), BCRYPT_ROUNDS);
      const avatarUrl = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(nombreSafe2)}`;

      const res = await pool.query(
        `INSERT INTO users (nombre, email, password_hash, tipo, avatar, activo, aprobado, telefono)
         VALUES ($1, $2, $3, $4, $5, true, true, $6)
         RETURNING id, nombre, email, tipo, avatar, activo, aprobado, telefono, created_at`,
        [nombreSafe2, emailNorm2, passwordHash, tipoNuevo, avatarUrl, telSafe]
      );

      const newUserId = res.rows[0].id;

      // Company-admin: auto-assign to their own companies (they can override via companyIds)
      const companyIdsFromBody: number[] = Array.isArray(body.companyIds)
        ? body.companyIds.filter((id: any) => typeof id === 'number')
        : [];

      if (companyIdsFromBody.length > 0) {
        // Superadmin or admin selected explicit companies from the form
        for (const cid of companyIdsFromBody) {
          // Admin can only assign companies they belong to
          if (user.tipo === 'admin') {
            const check = await pool.query('SELECT 1 FROM user_companies WHERE user_id = $1 AND company_id = $2', [user.id, cid]);
            if (check.rows.length === 0) continue;
          }
          await pool.query('INSERT INTO user_companies (user_id, company_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [newUserId, cid]);
        }
      } else if (user.tipo === 'admin') {
        // Fallback: assign to all of admin's companies
        const adminCompanies = await pool.query('SELECT company_id FROM user_companies WHERE user_id = $1', [user.id]);
        for (const row of adminCompanies.rows) {
          await pool.query('INSERT INTO user_companies (user_id, company_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [newUserId, row.company_id]);
        }
      } else if (user.tipo === 'superadmin' && body.companyId) {
        // Single company for admin role
        await pool.query('INSERT INTO user_companies (user_id, company_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [newUserId, body.companyId]);
      }

      // Sync to Identity — create credential account
      void syncUserToIdentity({ email: emailNorm2, name: nombreSafe2, password: String(password).trim() });

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

    // Company admin cannot modify superadmins
    if (user.tipo === 'admin') {
      const targetRes = await pool.query('SELECT tipo FROM users WHERE id = $1', [userId]);
      if (targetRes.rows.length > 0 && targetRes.rows[0].tipo === 'superadmin') {
        return NextResponse.json({ error: 'No autorizado para modificar superadministradores' }, { status: 403 });
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
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

// DELETE: delete user (only superadmin)
export async function DELETE(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.tipo !== 'superadmin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId || isNaN(parseInt(userId))) {
      return NextResponse.json({ error: 'ID de usuario no válido' }, { status: 400 });
    }

    if (parseInt(userId) === user.id) {
      return NextResponse.json({ error: 'No puedes borrarte a ti mismo' }, { status: 400 });
    }

    const res = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id, nombre', [parseInt(userId)]);
    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: `Usuario ${res.rows[0].nombre} eliminado con éxito` });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

