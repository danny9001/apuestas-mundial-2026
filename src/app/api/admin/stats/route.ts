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
      loginsByHourRes,
      predBeforeMatchRes,
      messageReadRes,
    ] = await Promise.all([

      // Overview counts
      pool.query(`
        SELECT
          (SELECT COUNT(*) FROM users WHERE activo = true) AS total_users,
          (SELECT COUNT(*) FROM predictions) AS total_predictions,
          (SELECT COUNT(*) FROM matches WHERE estado = 'finished') AS finished_matches,
          (SELECT COUNT(*) FROM system_logs WHERE created_at > NOW() - ($1 || ' days')::INTERVAL) AS total_events
      `, [days]),

      // Daily events breakdown by category
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

      // Events count per category
      pool.query(`
        SELECT categoria, COUNT(*) AS count
        FROM system_logs
        WHERE created_at > NOW() - ($1 || ' days')::INTERVAL
        GROUP BY categoria
        ORDER BY count DESC
      `, [days]),

      // Predictions per match
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

      // Top users by predictions + points
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

      // New users per day
      pool.query(`
        SELECT
          TO_CHAR(created_at AT TIME ZONE 'America/La_Paz', 'YYYY-MM-DD') AS date,
          COUNT(*) AS count
        FROM users
        WHERE created_at > NOW() - ($1 || ' days')::INTERVAL
        GROUP BY TO_CHAR(created_at AT TIME ZONE 'America/La_Paz', 'YYYY-MM-DD')
        ORDER BY date ASC
      `, [days]),

      // Today's logins
      pool.query(`
        SELECT COUNT(*) AS count
        FROM system_logs
        WHERE categoria = 'ACCESO'
          AND mensaje LIKE '%ingresó%'
          AND created_at > NOW() - INTERVAL '24 hours'
      `),

      // Logins by hour of day (Bolivia time)
      pool.query(`
        SELECT
          EXTRACT(HOUR FROM created_at AT TIME ZONE 'America/La_Paz')::int AS hour,
          COUNT(*) AS count
        FROM system_logs
        WHERE categoria = 'ACCESO'
          AND mensaje LIKE '%ingresó%'
          AND created_at > NOW() - ($1 || ' days')::INTERVAL
        GROUP BY EXTRACT(HOUR FROM created_at AT TIME ZONE 'America/La_Paz')::int
        ORDER BY hour ASC
      `, [days]),

      // Predictions distribution by hours before match start
      pool.query(`
        SELECT
          CASE
            WHEN EXTRACT(EPOCH FROM (m.fecha - p.created_at)) < 0
              THEN 'Post-partido'
            WHEN EXTRACT(EPOCH FROM (m.fecha - p.created_at)) / 3600 < 1
              THEN '< 1h'
            WHEN EXTRACT(EPOCH FROM (m.fecha - p.created_at)) / 3600 < 6
              THEN '1–6h'
            WHEN EXTRACT(EPOCH FROM (m.fecha - p.created_at)) / 3600 < 24
              THEN '6–24h'
            WHEN EXTRACT(EPOCH FROM (m.fecha - p.created_at)) / 3600 < 48
              THEN '1–2 días'
            WHEN EXTRACT(EPOCH FROM (m.fecha - p.created_at)) / 3600 < 120
              THEN '2–5 días'
            ELSE '5+ días'
          END AS bucket,
          MIN(EXTRACT(EPOCH FROM (m.fecha - p.created_at))) AS sort_key,
          COUNT(*) AS count
        FROM predictions p
        JOIN matches m ON m.id = p.match_id
        GROUP BY bucket
        ORDER BY sort_key ASC
      `),

      // Message read stats
      pool.query(`
        SELECT
          n.tipo,
          COUNT(DISTINCT n.id) AS sent,
          COUNT(DISTINCT nr.notification_id) AS leidas,
          ROUND(
            COUNT(DISTINCT nr.notification_id)::numeric
            / NULLIF(COUNT(DISTINCT n.id), 0) * 100, 1
          ) AS pct_leida
        FROM notifications n
        LEFT JOIN notification_reads nr ON nr.notification_id = n.id
        WHERE n.created_at > NOW() - ($1 || ' days')::INTERVAL
        GROUP BY n.tipo
        ORDER BY sent DESC
      `, [days]),
    ]);

    // Build full 24-hour array (fill zeros for missing hours)
    const loginsByHourMap = new Map<number, number>(
      loginsByHourRes.rows.map((r: any) => [parseInt(r.hour), parseInt(r.count)])
    );
    const loginsByHour = Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      label: `${String(h).padStart(2, '0')}:00`,
      count: loginsByHourMap.get(h) ?? 0,
    }));

    // Message read totals
    const totalSent = messageReadRes.rows.reduce((s: number, r: any) => s + parseInt(r.sent), 0);
    const totalLeidas = messageReadRes.rows.reduce((s: number, r: any) => s + parseInt(r.leidas), 0);
    const globalReadPct = totalSent > 0 ? Math.round((totalLeidas / totalSent) * 100) : 0;

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
      loginsByHour,
      predBeforeMatch: predBeforeMatchRes.rows.map(r => ({
        bucket: r.bucket,
        count: parseInt(r.count),
      })),
      messageStats: {
        totalSent,
        totalLeidas,
        globalReadPct,
        byType: messageReadRes.rows.map(r => ({
          tipo: r.tipo,
          sent: parseInt(r.sent),
          leidas: parseInt(r.leidas),
          pct: parseFloat(r.pct_leida) || 0,
        })),
      },
    });
  } catch (error: any) {
    console.error('Stats error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
