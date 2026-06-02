import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSessionUser, setSession } from '@/lib/auth';
import { promises as fs } from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import sharp from 'sharp';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const formData = await req.formData();
    const nombre = formData.get('nombre') as string;
    const password = formData.get('password') as string;
    const file = formData.get('avatarFile') as File | null;

    if (!nombre || nombre.trim().length === 0) {
      return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 });
    }

    let avatarPath = user.avatar;

    // Handle avatar upload — convert to WebP 200×200 for consistency and performance
    if (file && file.size > 0) {
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
      if (password.trim().length < 6) {
        return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 });
      }
      const passwordHash = await bcrypt.hash(password, 10);
      await pool.query(
        'UPDATE users SET nombre = $1, avatar = $2, password_hash = $3 WHERE id = $4',
        [nombre.trim(), avatarPath, passwordHash, user.id]
      );
    } else {
      await pool.query(
        'UPDATE users SET nombre = $1, avatar = $2 WHERE id = $3',
        [nombre.trim(), avatarPath, user.id]
      );
    }

    // Refresh Session Cookie
    const updatedSession = {
      id: user.id,
      nombre: nombre.trim(),
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
    return NextResponse.json({ error: 'Error del servidor: ' + error.message }, { status: 500 });
  }
}
