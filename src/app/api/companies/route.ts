import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { broadcastUpdate } from '@/lib/realtime';

export const dynamic = 'force-dynamic';

async function ensureCompaniesTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS companies (
      id SERIAL PRIMARY KEY,
      nombre VARCHAR(255) NOT NULL,
      logo TEXT,
      color VARCHAR(20) DEFAULT '#6366f1',
      activo BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await pool.query(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS monto_participacion NUMERIC DEFAULT 150`);
  // Legacy single-field (kept for backward compat, not actively used)
  await pool.query(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS modo_apuesta VARCHAR(20) DEFAULT 'partido'`);
  // New: per-phase modes stored as JSONB
  await pool.query(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS modos_por_fase JSONB DEFAULT '{}'::jsonb`);
}

export async function GET() {
  try {
    await ensureCompaniesTable();
    const res = await pool.query(
      'SELECT id, nombre, logo, color, activo, monto_participacion, modo_apuesta, modos_por_fase, created_at FROM companies ORDER BY nombre ASC'
    );
    const response = NextResponse.json(res.rows);
    response.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
    return response;
  } catch (error: any) {
    console.error('Error fetching companies:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || (user.tipo !== 'superadmin' && user.tipo !== 'admin')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    await ensureCompaniesTable();

    const body = await req.json();
    // Admins can only update (not create/delete) their own companies
    if (user.tipo === 'admin' && body?.action !== 'update') {
      return NextResponse.json({ error: 'Solo el super administrador puede crear o eliminar empresas' }, { status: 403 });
    }
    const { action } = body;

    if (action === 'create') {
      const { nombre, logo, color, monto_participacion, modos_por_fase } = body;
      if (!nombre?.trim()) return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 });
      const monto = parseFloat(monto_participacion) || 150;
      const modos = modos_por_fase && typeof modos_por_fase === 'object' ? modos_por_fase : {};
      const res = await pool.query(
        `INSERT INTO companies (nombre, logo, color, monto_participacion, modos_por_fase) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [nombre.trim(), logo || null, color || '#6366f1', monto, JSON.stringify(modos)]
      );
      broadcastUpdate('settings', { type: 'company', action: 'create', company: res.rows[0] });
      return NextResponse.json({ success: true, company: res.rows[0] });
    }

    if (action === 'update') {
      const { id, nombre, logo, color, activo, monto_participacion, modos_por_fase } = body;
      if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

      // Admin (non-superadmin) can only update companies they belong to
      if (user.tipo === 'admin') {
        const check = await pool.query('SELECT 1 FROM user_companies WHERE user_id=$1 AND company_id=$2', [user.id, id]);
        if (check.rows.length === 0) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
      }

      const monto = monto_participacion != null ? parseFloat(monto_participacion) : null;
      const modosJson = modos_por_fase && typeof modos_por_fase === 'object' ? JSON.stringify(modos_por_fase) : null;

      const res = await pool.query(
        `UPDATE companies SET
          nombre = COALESCE($1, nombre),
          logo = COALESCE($2, logo),
          color = COALESCE($3, color),
          activo = COALESCE($4, activo),
          monto_participacion = COALESCE($5, monto_participacion),
          modos_por_fase = COALESCE($6::jsonb, modos_por_fase)
        WHERE id = $7 RETURNING *`,
        [nombre || null, logo || null, color || null, activo ?? null, monto, modosJson, id]
      );
      if (res.rows.length === 0) return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 });
      broadcastUpdate('settings', { type: 'company', action: 'update', company: res.rows[0] });
      return NextResponse.json({ success: true, company: res.rows[0] });
    }

    if (action === 'delete') {
      const { id } = body;
      if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
      await pool.query('DELETE FROM companies WHERE id = $1', [id]);
      broadcastUpdate('settings', { type: 'company', action: 'delete', id });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (error: any) {
    console.error('Error managing company:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
