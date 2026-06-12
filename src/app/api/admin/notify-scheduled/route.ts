import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { sendPushNotification } from '@/lib/push';
import { broadcastUpdate } from '@/lib/realtime';

export const dynamic = 'force-dynamic';

async function ensureNotifTables() {
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
  await pool.query(`
    CREATE TABLE IF NOT EXISTS scheduled_notify_log (
      id SERIAL PRIMARY KEY,
      tipo VARCHAR(50) NOT NULL,
      referencia_id INTEGER,
      enviado_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function insertNotification(titulo: string, contenido: string, tipo: string, targetType: string, targetId: number | null) {
  const res = await pool.query(
    `INSERT INTO notifications (titulo, contenido, tipo, target_type, target_id)
     VALUES ($1, $2, $3, $4, $5) RETURNING id, titulo, tipo, target_type, target_id`,
    [titulo, contenido, tipo, targetType, targetId]
  );
  broadcastUpdate('notification', res.rows[0]);
  return res.rows[0];
}



/** Envía aviso de partidos próximas 24h (o 36h si es forzado) que aún no se han notificado */
async function notifyUpcomingMatches(force: boolean = false) {
  let query = `
    SELECT m.id, m.local, m.visitante, m.fecha, m.fase
    FROM matches m
    WHERE m.estado = 'upcoming'
      AND m.fecha BETWEEN NOW() AND NOW() + INTERVAL '24 hours'
  `;
  if (force) {
    // When forced from admin panel, extend window to 36 hours and allow notifying already notified matches
    query = `
      SELECT m.id, m.local, m.visitante, m.fecha, m.fase
      FROM matches m
      WHERE m.estado = 'upcoming'
        AND m.fecha BETWEEN NOW() AND NOW() + INTERVAL '36 hours'
    `;
  } else {
    query += `
      AND NOT EXISTS (
        SELECT 1 FROM scheduled_notify_log WHERE tipo = 'match_reminder' AND referencia_id = m.id
      )
    `;
  }
  query += ` ORDER BY m.fecha ASC`;

  const matches = await pool.query(query);

  for (const m of matches.rows) {
    const diffMs = new Date(m.fecha).getTime() - Date.now();
    const diffMins = Math.round(diffMs / 60000);
    
    let tiempoRestanteStr = '';
    if (diffMins >= 60) {
      const hrs = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      const hrsText = hrs === 1 ? '1 hora' : `${hrs} horas`;
      const minsText = mins > 0 ? ` y ${mins} minutos` : '';
      tiempoRestanteStr = `${hrsText}${minsText}`;
    } else {
      tiempoRestanteStr = `${diffMins} minutos`;
    }

    const titulo = `⚽ Partido próximo: ${m.local} vs ${m.visitante}`;
    const contenido = `Falta ${tiempoRestanteStr} para el inicio del partido. ¡Registra tu pronóstico ahora! Recuerda que las apuestas cierran 1 hora antes de que inicie el partido.`;

    await insertNotification(titulo, contenido, 'info', 'all', null);

    // Push a todos los usuarios activos
    const users = await pool.query('SELECT id FROM users WHERE activo = true AND aprobado = true');
    for (const u of users.rows) {
      await sendPushNotification(u.id, { title: titulo, body: contenido, icon: '/icon-192x192.svg', url: '/' });
    }

    // Insert to log only if not already there to avoid duplicates in automated runs
    const logCheck = await pool.query(
      'SELECT id FROM scheduled_notify_log WHERE tipo = $1 AND referencia_id = $2',
      ['match_reminder', m.id]
    );
    if (logCheck.rows.length === 0) {
      await pool.query(
        'INSERT INTO scheduled_notify_log (tipo, referencia_id) VALUES ($1, $2)',
        ['match_reminder', m.id]
      );
    }
  }

  return matches.rows.length;
}

/** Envía ranking semanal por empresa (lunes) */
async function notifyWeeklyRankings() {
  const alreadySentThisWeek = await pool.query(`
    SELECT 1 FROM scheduled_notify_log
    WHERE tipo = 'weekly_ranking'
      AND enviado_at > DATE_TRUNC('week', NOW())
    LIMIT 1
  `);
  if (alreadySentThisWeek.rows.length > 0) return 0;

  const companies = await pool.query('SELECT id, nombre FROM companies WHERE activo = true');

  for (const c of companies.rows) {
    const top = await pool.query(`
      SELECT u.nombre, l.puntos_totales, l.posicion
      FROM leaderboard l
      JOIN users u ON u.id = l.user_id
      JOIN user_companies uc ON uc.user_id = u.id
      WHERE uc.company_id = $1 AND u.participa IS NOT FALSE
      ORDER BY l.posicion ASC
      LIMIT 10
    `, [c.id]);

    if (top.rows.length === 0) continue;

    const podio = top.rows.map((r: any, i: number) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
      return `${medal} ${r.nombre}: ${r.puntos_totales} pts`;
    }).join('\n');
    const titulo = `📊 Ranking semanal — ${c.nombre}`;
    const contenido = `Top 10 de esta semana:\n${podio}`;

    await insertNotification(titulo, contenido, 'info', 'company', c.id);

    // Push a usuarios de la empresa
    const members = await pool.query(
      'SELECT user_id FROM user_companies WHERE company_id = $1', [c.id]
    );
    for (const u of members.rows) {
      await sendPushNotification(u.user_id, { title: titulo, body: contenido, icon: '/icon-192x192.svg', url: '/' });
    }
  }

  await pool.query('INSERT INTO scheduled_notify_log (tipo) VALUES ($1)', ['weekly_ranking']);
  return companies.rows.length;
}

// GET: estado del scheduler
export async function GET() {
  try {
    await ensureNotifTables();
    const lastMatch = await pool.query(
      "SELECT enviado_at FROM scheduled_notify_log WHERE tipo='match_reminder' ORDER BY enviado_at DESC LIMIT 1"
    );
    const lastRanking = await pool.query(
      "SELECT enviado_at FROM scheduled_notify_log WHERE tipo='weekly_ranking' ORDER BY enviado_at DESC LIMIT 1"
    );
    return NextResponse.json({
      last_match_reminder: lastMatch.rows[0]?.enviado_at || null,
      last_weekly_ranking: lastRanking.rows[0]?.enviado_at || null,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST: ejecutar notificaciones programadas
export async function POST(req: NextRequest) {
  try {
    // Requires internal secret or superadmin session
    const body = await req.json().catch(() => ({}));
    const secret = req.headers.get('x-scheduler-secret');
    const validSecret = secret === process.env.SCHEDULER_SECRET;

    if (!validSecret) {
      const { getSessionUser } = await import('@/lib/auth');
      const user = await getSessionUser();
      if (!user || user.tipo !== 'superadmin') {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
      }
    }

    await ensureNotifTables();

    const tipo = body.tipo || 'all';
    const force = body.force === true;
    const results: Record<string, number> = {};

    if (tipo === 'all' || tipo === 'matches') {
      results.matches_notified = await notifyUpcomingMatches(force);
    }
    if (tipo === 'all' || tipo === 'rankings') {
      results.companies_notified = await notifyWeeklyRankings();
    }

    return NextResponse.json({ success: true, ...results });
  } catch (e: any) {
    console.error('Scheduled notify error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
