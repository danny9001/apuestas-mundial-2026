import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db';
import { setSession } from '@/lib/auth';
import { broadcastUpdate } from '@/lib/realtime';
import { sendPushToAdmins } from '@/lib/push';
import { sendMail, buildNewUserEmail } from '@/lib/mail';
import { isValidEmail, sanitizeText, validatePassword, BCRYPT_ROUNDS } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { nombre, email, password, telefono, company_id, company_ids } = await req.json();

    if (!nombre || !email || !password) {
      return NextResponse.json({ error: 'Todos los campos son obligatorios' }, { status: 400 });
    }

    const emailNorm = (email as string).toLowerCase().trim();
    if (!isValidEmail(emailNorm)) {
      return NextResponse.json({ error: 'Formato de correo electrónico inválido' }, { status: 400 });
    }

    const pwCheck = validatePassword(password as string);
    if (!pwCheck.ok) {
      return NextResponse.json({ error: pwCheck.error }, { status: 400 });
    }

    const nombreSafe = sanitizeText(nombre as string, 100);
    if (!nombreSafe) {
      return NextResponse.json({ error: 'El nombre no puede estar vacío' }, { status: 400 });
    }

    // Case-insensitive duplicate check (email already normalised to lowercase)
    const duplicateCheck = await pool.query(
      'SELECT id FROM users WHERE lower(email) = $1',
      [emailNorm]
    );
    if (duplicateCheck.rows.length > 0) {
      return NextResponse.json({ error: 'El correo electrónico ya está registrado' }, { status: 409 });
    }

    // Hash with cost factor 12 (≈250 ms — brute-force resistant)
    const passwordHash = await bcrypt.hash((password as string).trim(), BCRYPT_ROUNDS);

    // Dynamic avatar seed from Dicebear
    const avatarUrl = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(nombreSafe)}`;

    // Insert user — telefono is optional
    const insertRes = await pool.query(
      `INSERT INTO users (nombre, email, password_hash, tipo, avatar, activo, aprobado, telefono)
       VALUES ($1, $2, $3, $4, $5, true, false, $6)
       RETURNING id, nombre, email, tipo, avatar, aprobado, telefono`,
      [nombreSafe, emailNorm, passwordHash, 'externo', avatarUrl, telefono ? sanitizeText(String(telefono), 30) : null]
    );

    const newUser = insertRes.rows[0];

    // Assign companies if provided (multi-company support)
    const cids: number[] = company_ids?.length ? company_ids : (company_id ? [company_id] : []);
    for (const cid of cids) {
      await pool.query('INSERT INTO user_companies (user_id, company_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [newUser.id, cid]);
    }

    // Trigger PL/pgSQL recalculation so the new user is correctly indexed in the Leaderboard
    await pool.query('SELECT recalculate_leaderboard()');

    // Notify all admins and superadmins of the new registration
    try {
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
      const admins = await pool.query(
        `SELECT id FROM users WHERE tipo IN ('admin', 'superadmin') AND activo = true`
      );
      for (const admin of admins.rows) {
        const notif = await pool.query(
          `INSERT INTO notifications (titulo, contenido, tipo, target_type, target_id, created_by)
           VALUES ($1, $2, 'info', 'user', $3, NULL)
           RETURNING id, titulo, tipo, target_type, target_id`,
          [
            'Nuevo usuario registrado',
            `${newUser.nombre} (${newUser.email}) se registró y está pendiente de aprobación.`,
            admin.id,
          ]
        );
        broadcastUpdate('notification', {
          notificationId: notif.rows[0].id,
          titulo: notif.rows[0].titulo,
          tipo: notif.rows[0].tipo,
          target_type: notif.rows[0].target_type,
          target_id: notif.rows[0].target_id,
        });
      }
      await sendPushToAdmins({
        title: 'Nuevo usuario registrado',
        body: `${newUser.nombre} (${newUser.email}) está pendiente de aprobación.`,
        icon: '/icon-192x192.svg',
        url: '/',
      });

      // Email to all admins
      const adminEmails = await pool.query(
        `SELECT email FROM users WHERE tipo IN ('admin', 'superadmin') AND activo = true`
      );
      if (adminEmails.rows.length > 0) {
        const toList = adminEmails.rows.map((r: { email: string }) => r.email);
        sendMail({
          to: toList,
          subject: `[Mundial 2026] Nuevo registro: ${newUser.nombre}`,
          html: buildNewUserEmail(newUser.nombre, newUser.email),
        }).catch((e) => console.error('Admin email error:', e));
      }
    } catch (notifError) {
      console.error('Error sending admin notifications:', notifError);
    }

    // Set cookie session for automatic authentication
    const sessionData = {
      id: newUser.id,
      nombre: newUser.nombre,
      email: newUser.email,
      tipo: newUser.tipo,
      avatar: newUser.avatar,
      aprobado: !!newUser.aprobado
    };

    await setSession(sessionData);

    return NextResponse.json({ success: true, user: sessionData });
  } catch (error: any) {
    console.error('Registration API error:', error);
    return NextResponse.json({ error: 'Error interno del servidor al registrar usuario' }, { status: 500 });
  }
}
