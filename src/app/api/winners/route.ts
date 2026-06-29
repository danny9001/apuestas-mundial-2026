import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    // Get the Final match (id = 104)
    const finalRes = await pool.query(
      'SELECT id, local, visitante, goles_local, goles_visitante, estado, stats FROM matches WHERE id = 104 LIMIT 1'
    );

    if (finalRes.rows.length === 0) {
      return NextResponse.json({ champion: null, tinkasoWinners: [], finalMatch: null });
    }

    const finalMatch = finalRes.rows[0];

    // Only reveal champion when the Final is finished
    if (finalMatch.estado !== 'finished') {
      return NextResponse.json({ champion: null, tinkasoWinners: [], finalMatch: null });
    }

    const stats = finalMatch.stats || {};
    let champion: string | null = null;

    if (stats.ganador) {
      // Decided by penalty shootout
      champion = stats.ganador;
    } else if (finalMatch.goles_local > finalMatch.goles_visitante) {
      champion = finalMatch.local;
    } else if (finalMatch.goles_visitante > finalMatch.goles_local) {
      champion = finalMatch.visitante;
    }
    // Draw at 90' with no penalty winner = still pending
    if (!champion) {
      return NextResponse.json({ champion: null, tinkasoWinners: [], finalMatch });
    }

    // Users who predicted the champion via tinkaso
    const winnersRes = await pool.query(
      `SELECT u.id, u.nombre, u.avatar, u.tincaso, l.puntos_totales, l.exactos, l.posicion
       FROM users u
       JOIN leaderboard l ON u.id = l.user_id
       WHERE u.tincaso = $1 AND u.activo = true AND u.aprobado = true
       ORDER BY l.puntos_totales DESC, l.exactos DESC`,
      [champion]
    );

    return NextResponse.json(
      { champion, tinkasoWinners: winnersRes.rows, finalMatch },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    console.error('[/api/winners]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
