import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { runBackup } from '@/lib/backup';

export const dynamic = 'force-dynamic';

// GET: List backups
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user || user.tipo !== 'superadmin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const res = await pool.query(
      `SELECT id, type, blob_name, size_bytes, status, error_message, created_at 
       FROM database_backups 
       ORDER BY created_at DESC 
       LIMIT 50`
    );

    return NextResponse.json(res.rows);
  } catch (err: any) {
    console.error('[API Backup GET Error]:', err);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

// POST: Run a backup — body: { type?: 'full' | 'incremental' | 'manual' }
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.tipo !== 'superadmin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    let type: 'full' | 'incremental' | 'manual' = 'manual';
    try {
      const body = await req.json();
      if (body?.type === 'full' || body?.type === 'incremental' || body?.type === 'manual') {
        type = body.type;
      }
    } catch { /* sin body — usar manual */ }

    const result = await runBackup(type);

    if (result.success) {
      return NextResponse.json({ success: true, blobName: result.blobName, sizeBytes: result.sizeBytes });
    } else {
      return NextResponse.json({ error: result.error || 'Fallo al ejecutar el backup' }, { status: 500 });
    }
  } catch (err: any) {
    console.error('[API Backup POST Error]:', err);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
