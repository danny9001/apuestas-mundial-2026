import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.tipo !== 'superadmin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const days = Math.min(Math.max(parseInt(searchParams.get('days') || '30'), 1), 90);

    const [
      overviewRes,
      dailyEventsRes,
      byCategoryRes,
      predictionsPerMatchRes,
      topUsersRes,
      newUsersRes,
      todayLoginsRes,
    ] = await Promise.all([
      pool.query(`
        SELECT
          (SELECT COUNT(*) FROM users WHERE activo = true) AS total_users,
          (SELECT COUNT(*) FROM predictions) AS total_predictions,
          (SELECT COUNT(*) FROM matches WHERE estado = 'finished') AS finished_matches,
          (SELECT COUNT(*) FROM system_logs WHERE created_at > NOW() - ($1 || ' days')::INTERVAL) AS total_events
      `, [days]),

      pool.query(`
        SELECT
          TO_CHAR(created_at AT TIME ZONE 'America/La_Paz', 'YYYY-MM-DD') AS date,
          COUNT(*) AS total,
          SUM(CASE WHEN categoria = 'ACCESO' THEN 1 ELSE 0 END) AS acceso,
          SUM(CASE WHEN categoria = 'PRONOSTICO' THEN 1 ELSE 0 END) AS pronostico,
          SUM(CASE WHEN categoria = 'USUARIO' THEN 1 ELSE 0 END) AS usuario,
          SUM(CASE WHEN categoria = 'MENSAJE' THEN 1 ELSE 0 END) AS mensaje,
          SUM(CASE WHEN categoria = 'REGISTRO' THEN 1 ELSE 0 END) AS registro,
          SUM(CASE WHEN categoria = 'PARTIDO' THEN 1 ELSE 0 END) AS partido,
          SUM(CASE WHEN categoria = 'PERFIL' THEN 1 ELSE 0 END) AS perfil,
          SUM(CASE WHEN categoria = 'NOTIFICACION' THEN 1 ELSE 0 END) AS notificacion
        FROM system_logs
        WHERE created_at > NOW() - ($1 || ' days')::INTERVAL
        GROUP BY TO_CHAR(created_at AT TIME ZONE 'America/La_Paz', 'YYYY-MM-DD')
        ORDER BY date ASC
      `, [days]),

      pool.query(`
        SELECT categoria, COUNT(*) AS count
        FROM system_logs
        WHERE created_at > NOW() - ($1 || ' days')::INTERVAL
        GROUP BY categoria
        ORDER BY count DESC
      `, [days]),

      pool.query(`
        SELECT
          m.local, m.visitante, m.fase, m.estado,
          COUNT(p.id) AS count,
          m.goles_local, m.goles_visitante
        FROM matches m
        LEFT JOIN predictions p ON p.match_id = m.id
        GROUP BY m.id, m.local, m.visitante, m.fase, m.estado, m.goles_local, m.goles_visitante
        ORDER BY count DESC
        LIMIT 15
      `),

      pool.query(`
        SELECT
          u.nombre,
          COUNT(p.id) AS predictions,
          COALESCE(l.puntos_totales, 0) AS puntos,
          COALESCE(l.posicion, 9999) AS posicion
        FROM users u
        LEFT JOIN predictions p ON p.user_id = u.id
        LEFT JOIN leaderboard l ON l.user_id = u.id
        WHERE u.activo = true AND u.tipo NOT IN ('superadmin')
        GROUP BY u.id, u.nombre, l.puntos_totales, l.posicion
        ORDER BY predictions DESC
        LIMIT 12
      `),

      pool.query(`
        SELECT
          TO_CHAR(created_at AT TIME ZONE 'America/La_Paz', 'YYYY-MM-DD') AS date,
          COUNT(*) AS count
        FROM users
        WHERE created_at > NOW() - ($1 || ' days')::INTERVAL
        GROUP BY TO_CHAR(created_at AT TIME ZONE 'America/La_Paz', 'YYYY-MM-DD')
        ORDER BY date ASC
      `, [days]),

      pool.query(`
        SELECT COUNT(*) AS count
        FROM system_logs
        WHERE categoria = 'ACCESO'
          AND mensaje LIKE '%ingresó%'
          AND created_at > NOW() - INTERVAL '24 hours'
      `),
    ]);

    const overview = overviewRes.rows[0];

    return NextResponse.json({
      overview: {
        totalUsers: parseInt(overview.total_users),
        totalPredictions: parseInt(overview.total_predictions),
        finishedMatches: parseInt(overview.finished_matches),
        totalEvents: parseInt(overview.total_events),
        todayLogins: parseInt(todayLoginsRes.rows[0]?.count || '0'),
      },
      dailyEvents: dailyEventsRes.rows.map(r => ({
        date: r.date,
        total: parseInt(r.total),
        acceso: parseInt(r.acceso),
        pronostico: parseInt(r.pronostico),
        usuario: parseInt(r.usuario),
        mensaje: parseInt(r.mensaje),
        registro: parseInt(r.registro),
        partido: parseInt(r.partido),
        perfil: parseInt(r.perfil),
        notificacion: parseInt(r.notificacion),
      })),
      byCategory: byCategoryRes.rows.map(r => ({
        categoria: r.categoria,
        count: parseInt(r.count),
      })),
      predictionsPerMatch: predictionsPerMatchRes.rows.map(r => ({
        label: `${r.local} vs ${r.visitante}`,
        local: r.local,
        visitante: r.visitante,
        fase: r.fase,
        estado: r.estado,
        count: parseInt(r.count),
        score: r.goles_local !== null ? `${r.goles_local}-${r.goles_visitante}` : null,
      })),
      topUsers: topUsersRes.rows.map(r => ({
        nombre: r.nombre,
        predictions: parseInt(r.predictions),
        puntos: parseInt(r.puntos),
        posicion: parseInt(r.posicion),
      })),
      newUsers: newUsersRes.rows.map(r => ({
        date: r.date,
        count: parseInt(r.count),
      })),
    });
  } catch (error: any) {
    console.error('Stats error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
