import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSessionUser, setSession } from '@/lib/auth';
import { promises as fs } from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import sharp from 'sharp';
import { sanitizeText, validatePassword, BCRYPT_ROUNDS, MAX_AVATAR_BYTES } from '@/lib/validation';
import { syncUserPassword } from '@/lib/identity-sync';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const formData = await req.formData();
    const nombreRaw = formData.get('nombre') as string;
    const password = formData.get('password') as string;
    const telefonoRaw = formData.get('telefono') as string;
    const file = formData.get('avatarFile') as File | null;

    const nombreSafe = sanitizeText(nombreRaw ?? '', 100);
    if (!nombreSafe) {
      return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 });
    }

    const telefonoSafe = telefonoRaw ? sanitizeText(telefonoRaw, 30) : null;

    let avatarPath = user.avatar;

    // Handle avatar upload — enforce 5 MB limit, convert to WebP 200×200
    if (file && file.size > 0) {
      if (file.size > MAX_AVATAR_BYTES) {
        return NextResponse.json({ error: 'El archivo no puede superar 5 MB' }, { status: 400 });
      }

      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'avatars');
      await fs.mkdir(uploadDir, { recursive: true });

      const filename = `avatar_${user.id}_${Date.now()}.webp`;
      const filePath = path.join(uploadDir, filename);

      const inputBuffer = Buffer.from(await file.arrayBuffer());
      const webpBuffer = await sharp(inputBuffer)
        .rotate()
        .resize(200, 200, { fit: 'cover' })
        .webp({ quality: 80, effort: 6 })
        .toBuffer();
      await fs.writeFile(filePath, webpBuffer);

      avatarPath = `/uploads/avatars/${filename}`;
    }

    // Update in database
    console.log('[profile] Updating database for user ID:', user.id);
    if (password && password.trim().length > 0) {
      const pwCheck = validatePassword(password.trim());
      if (!pwCheck.ok) {
        return NextResponse.json({ error: pwCheck.error }, { status: 400 });
      }
      const passwordHash = await bcrypt.hash(password.trim(), BCRYPT_ROUNDS);
      await pool.query(
        'UPDATE users SET nombre = $1, avatar = $2, password_hash = $3, telefono = $4 WHERE id = $5',
        [nombreSafe, avatarPath, passwordHash, telefonoSafe, user.id]
      );
      void syncUserPassword({ email: user.email, password: password.trim() });
    } else {
      await pool.query(
        'UPDATE users SET nombre = $1, avatar = $2, telefono = $3 WHERE id = $4',
        [nombreSafe, avatarPath, telefonoSafe, user.id]
      );
    }
    console.log('[profile] Database updated successfully');

    // Fetch companies to keep session in sync
    const compRes = await pool.query(
      `SELECT c.id, c.nombre, c.color, c.monto_participacion FROM companies c
       JOIN user_companies uc ON uc.company_id = c.id
       WHERE uc.user_id = $1`,
      [user.id]
    );
    console.log('[profile] Fetched companies:', compRes.rows.length);

    // Fetch aprobado/denegado to keep session complete
    const userRow = await pool.query('SELECT aprobado, denegado FROM users WHERE id = $1', [user.id]);
    console.log('[profile] Fetched user approval status');

    // Refresh Session Cookie
    const updatedSession = {
      id: user.id,
      nombre: nombreSafe,
      email: user.email,
      tipo: user.tipo,
      avatar: avatarPath,
      telefono: telefonoSafe,
      aprobado: userRow.rows[0]?.aprobado ?? user.aprobado,
      denegado: userRow.rows[0]?.denegado ?? user.denegado,
      companies: compRes.rows
    };
    console.log('[profile] Setting session cookie');
    await setSession(updatedSession);
    console.log('[profile] Session cookie set successfully');

    return NextResponse.json({
      success: true,
      message: 'Perfil actualizado con éxito',
      user: updatedSession
    });
  } catch (error: any) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: `Error del servidor: ${error.message || error}` }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { pwaInstalled } = body;

    if (typeof pwaInstalled !== 'boolean') {
      return NextResponse.json({ error: 'Parámetro inválido' }, { status: 400 });
    }

    await pool.query(
      'UPDATE users SET pwa_installed = $1, pwa_updated_at = NOW() WHERE id = $2',
      [pwaInstalled, user.id]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating PWA status:', error);
    return NextResponse.json({ error: `Error del servidor: ${error.message || error}` }, { status: 500 });
  }
}
