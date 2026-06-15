import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import pool from './db';

export interface UserSession {
  id: number;
  nombre: string;
  email: string;
  avatar: string;
  tipo: string;
  aprobado: boolean;
  denegado: boolean;
  telefono?: string;
  tincaso?: string;
  notif_prefs?: any;
}

const SESSION_TTL_SECONDS = 604800; // 7 days

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET no configurado');
  return secret;
}

export async function getSessionUser(): Promise<UserSession | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('apuestas_session');
    if (!sessionCookie?.value) {
      console.log('[getSessionUser] No session cookie found');
      return null;
    }

    let payload: { id: number; tipo: string };
    try {
      payload = jwt.verify(sessionCookie.value, getJwtSecret()) as { id: number; tipo: string };
    } catch (e: any) {
      console.log('[getSessionUser] JWT verify failed:', e.message);
      return null;
    }

    if (!payload.id) {
      console.log('[getSessionUser] No payload ID');
      return null;
    }

    const res = await pool.query(
      'SELECT id, nombre, email, avatar, tipo, aprobado, denegado, telefono, tincaso, notif_prefs, activo FROM users WHERE id = $1',
      [payload.id]
    );

    if (res.rows.length === 0) {
      console.log('[getSessionUser] User not found in DB:', payload.id);
      return null;
    }
    if (!res.rows[0].activo) {
      console.log('[getSessionUser] User inactive:', payload.id);
      return null;
    }

    return {
      id: res.rows[0].id,
      nombre: res.rows[0].nombre,
      email: res.rows[0].email,
      tipo: res.rows[0].tipo,
      avatar: res.rows[0].avatar,
      aprobado: !!res.rows[0].aprobado,
      denegado: !!res.rows[0].denegado,
      telefono: res.rows[0].telefono,
      tincaso: res.rows[0].tincaso,
      notif_prefs: res.rows[0].notif_prefs,
    };
  } catch (err: any) {
    console.error('[getSessionUser] Catch all error:', err);
    return null;
  }
}

export async function setSession(user: {
  id: number;
  nombre: string;
  email: string;
  tipo: string;
  avatar: string;
}) {
  const token = jwt.sign(
    { id: user.id, email: user.email, tipo: user.tipo },
    getJwtSecret(),
    { expiresIn: SESSION_TTL_SECONDS }
  );

  const cookieStore = await cookies();
  cookieStore.set('apuestas_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_TTL_SECONDS,
    path: '/',
  });

  return token;
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete('apuestas_session');
}
