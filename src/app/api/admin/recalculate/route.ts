import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { broadcastUpdate } from '@/lib/realtime';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const user = await getSessionUser();
    if (!user || (user.tipo !== 'admin' && user.tipo !== 'superadmin')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Call the database function to recalculate predictions and rankings
    await pool.query('SELECT recalculate_leaderboard()');

    // Broadcast the update to all clients (including TV mode)
    broadcastUpdate('leaderboard', { manualRecalculation: true });

    return NextResponse.json({ success: true, message: 'Clasificación recalculada con éxito' });
  } catch (error: any) {
    console.error('Error recalculating leaderboard:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
