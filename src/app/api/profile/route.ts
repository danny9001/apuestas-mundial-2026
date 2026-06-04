import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSessionUser, setSession } from '@/lib/auth';
import { promises as fs } from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import sharp from 'sharp';
import { sanitizeText, validatePassword, BCRYPT_ROUNDS, MAX_AVATAR_BYTES } from '@/lib/validation';

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
    const file = formData.get('avatarFile') as File | null;

    const nombreSafe = sanitizeText(nombreRaw ?? '', 100);
    if (!nombreSafe) {
      return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 });
    }

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
    if (password && password.trim().length > 0) {
      const pwCheck = validatePassword(password.trim());
      if (!pwCheck.ok) {
        return NextResponse.json({ error: pwCheck.error }, { status: 400 });
      }
      const passwordHash = await bcrypt.hash(password.trim(), BCRYPT_ROUNDS);
      await pool.query(
        'UPDATE users SET nombre = $1, avatar = $2, password_hash = $3 WHERE id = $4',
        [nombreSafe, avatarPath, passwordHash, user.id]
      );
    } else {
      await pool.query(
        'UPDATE users SET nombre = $1, avatar = $2 WHERE id = $3',
        [nombreSafe, avatarPath, user.id]
      );
    }

    // Refresh Session Cookie
    const updatedSession = {
      id: user.id,
      nombre: nombreSafe,
      email: user.email,
      tipo: user.tipo,
      avatar: avatarPath
    };
    await setSession(updatedSession);

    return NextResponse.json({
      success: true,
      message: 'Perfil actualizado con éxito',
      user: updatedSession
    });
  } catch (error: any) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
