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
}

export async function GET() {
  try {
    await ensureCompaniesTable();
    const res = await pool.query('SELECT id, nombre, logo, color, activo, created_at FROM companies ORDER BY nombre ASC');
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
    if (!user || user.tipo !== 'superadmin') {
      return NextResponse.json({ error: 'Solo el super administrador puede gestionar empresas' }, { status: 403 });
    }

    await ensureCompaniesTable();

    const body = await req.json();
    const { action } = body;

    if (action === 'create') {
      const { nombre, logo, color } = body;
      if (!nombre?.trim()) return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 });
      const res = await pool.query(
        `INSERT INTO companies (nombre, logo, color) VALUES ($1, $2, $3) RETURNING *`,
        [nombre.trim(), logo || null, color || '#6366f1']
      );
      broadcastUpdate('settings', { type: 'company', action: 'create', company: res.rows[0] });
      return NextResponse.json({ success: true, company: res.rows[0] });
    }

    if (action === 'update') {
      const { id, nombre, logo, color, activo } = body;
      if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
      const res = await pool.query(
        `UPDATE companies SET
          nombre = COALESCE($1, nombre),
          logo = COALESCE($2, logo),
          color = COALESCE($3, color),
          activo = COALESCE($4, activo)
        WHERE id = $5 RETURNING *`,
        [nombre || null, logo || null, color || null, activo ?? null, id]
      );
      if (res.rows.length === 0) return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 });
      broadcastUpdate('settings', { type: 'company', action: 'update', company: res.rows[0] });
      return NextResponse.json({ success: true, company: res.rows[0] });
    }

    if (action === 'delete') {
      const { id } = body;
      if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
      // user_companies rows cascade on delete via FK, companies table cascade deletes
      await pool.query('DELETE FROM companies WHERE id = $1', [id]);
      broadcastUpdate('settings', { type: 'company', action: 'delete', id });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (error: any) {
    console.error('Error managing company:', error);
    return NextResponse.json({ error: 'Error del servidor: ' + error.message }, { status: 500 });
  }
}
