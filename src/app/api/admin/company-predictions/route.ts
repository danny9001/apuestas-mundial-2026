import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || (user.tipo !== 'superadmin' && user.tipo !== 'admin')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    let queryStr = '';
    let params: any[] = [];

    if (user.tipo === 'superadmin') {
      queryStr = `
        SELECT 
          u.nombre as usuario_nombre,
          u.email as usuario_email,
          u.tipo as usuario_tipo,
          u.participa as usuario_participa,
          uc.company_id,
          COALESCE(c.nombre, 'Sin Empresa') as empresa_nombre,
          m.local,
          m.visitante,
          m.fase,
          m.fecha,
          p.pred_local,
          p.pred_visitante,
          p.puntos,
          m.goles_local,
          m.goles_visitante,
          m.estado
        FROM predictions p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN user_companies uc ON uc.user_id = u.id
        LEFT JOIN companies c ON c.id = uc.company_id
        JOIN matches m ON p.match_id = m.id
        ORDER BY COALESCE(c.nombre, 'Sin Empresa') ASC, u.nombre ASC, m.fecha ASC
      `;
    } else {
      queryStr = `
        SELECT 
          u.nombre as usuario_nombre,
          u.email as usuario_email,
          u.tipo as usuario_tipo,
          u.participa as usuario_participa,
          uc.company_id,
          c.nombre as empresa_nombre,
          m.local,
          m.visitante,
          m.fase,
          m.fecha,
          p.pred_local,
          p.pred_visitante,
          p.puntos,
          m.goles_local,
          m.goles_visitante,
          m.estado
        FROM predictions p
        JOIN users u ON p.user_id = u.id
        JOIN user_companies uc ON uc.user_id = u.id
        JOIN companies c ON c.id = uc.company_id
        JOIN matches m ON p.match_id = m.id
        WHERE uc.company_id IN (
          SELECT company_id FROM user_companies WHERE user_id = $1
        )
        ORDER BY c.nombre ASC, u.nombre ASC, m.fecha ASC
      `;
      params = [user.id];
    }

    const res = await pool.query(queryStr, params);

    const response = NextResponse.json(res.rows);
    response.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
    return response;
  } catch (error: unknown) {
    console.error('Error fetching company predictions:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
