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

const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12h

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET no configurado');
  return secret;
}

export async function getSessionUser(): Promise<UserSession | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('apuestas_session');
    if (!sessionCookie?.value) return null;

    let payload: { id: number; tipo: string };
    try {
      payload = jwt.verify(sessionCookie.value, getJwtSecret()) as { id: number; tipo: string };
    } catch {
      return null;
    }

    if (!payload.id) return null;

    const res = await pool.query(
      'SELECT id, nombre, email, avatar, tipo, aprobado, denegado, telefono, tincaso, notif_prefs, activo FROM users WHERE id = $1',
      [payload.id]
    );

    if (res.rows.length === 0 || !res.rows[0].activo) return null;

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
  } catch {
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
    secure: true,
    sameSite: 'none',
    maxAge: SESSION_TTL_SECONDS,
    path: '/',
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete('apuestas_session');
}
