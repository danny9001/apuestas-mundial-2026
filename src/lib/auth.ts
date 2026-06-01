import { cookies } from 'next/headers';
import pool from './db';

export interface UserSession {
  id: number;
  nombre: string;
  email: string;
  tipo: 'interno' | 'externo' | 'admin';
  avatar: string;
}

export async function getSessionUser(): Promise<UserSession | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('apuestas_session');
    if (!sessionCookie || !sessionCookie.value) return null;

    // Decode session payload
    const payloadStr = Buffer.from(sessionCookie.value, 'base64').toString('utf-8');
    const payload = JSON.parse(payloadStr);

    if (!payload.id) return null;

    // Fetch user from DB to verify they exist and are active
    const res = await pool.query(
      'SELECT id, nombre, email, tipo, avatar, activo FROM users WHERE id = $1',
      [payload.id]
    );

    if (res.rows.length === 0 || !res.rows[0].activo) {
      return null;
    }

    return {
      id: res.rows[0].id,
      nombre: res.rows[0].nombre,
      email: res.rows[0].email,
      tipo: res.rows[0].tipo,
      avatar: res.rows[0].avatar
    };
  } catch (error) {
    return null;
  }
}

export async function setSession(user: { id: number; nombre: string; email: string; tipo: string; avatar: string }) {
  const payloadStr = JSON.stringify({
    id: user.id,
    email: user.email,
    tipo: user.tipo,
    timestamp: Date.now()
  });

  const encodedPayload = Buffer.from(payloadStr).toString('base64');
  const cookieStore = await cookies();
  
  cookieStore.set('apuestas_session', encodedPayload, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/'
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete('apuestas_session');
}
