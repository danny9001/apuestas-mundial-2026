import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSessionUser, type UserSession } from '@/lib/auth';
import { broadcastUpdate } from '@/lib/realtime';
import sharp from 'sharp';
import { validateUploadedFile } from '@/lib/validation';

export const dynamic = 'force-dynamic';

const MAX_QR_BYTES = 5 * 1024 * 1024;

export async function GET() {
  try {
    const res = await pool.query(
      'SELECT id, nombre, logo, color, activo, monto_participacion, modo_apuesta, modos_por_fase, qr_url, created_at FROM companies ORDER BY nombre ASC'
    );
    const response = NextResponse.json(res.rows);
    response.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
    return response;
  } catch (error: unknown) {
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

    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      return handleUploadQr(req, user);
    }

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
  } catch (error: unknown) {
    console.error('Error managing company:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

async function handleUploadQr(req: NextRequest, user: UserSession) {
  try {
    const formData = await req.formData();
    const action = formData.get('action') as string;
    if (action !== 'update_qr') {
      return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
    }

    const id = parseInt(formData.get('id') as string);
    const file = formData.get('file') as File | null;
    if (!id || !file) return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });

    // Admin (non-superadmin) can only upload QR for companies they belong to
    if (user.tipo === 'admin') {
      const check = await pool.query('SELECT 1 FROM user_companies WHERE user_id=$1 AND company_id=$2', [user.id, id]);
      if (check.rows.length === 0) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const fileCheck = validateUploadedFile(file, ['image/*'], MAX_QR_BYTES);
    if (!fileCheck.ok) {
      return NextResponse.json({ error: fileCheck.error ?? 'Archivo no válido' }, { status: 400 });
    }

    const inputBuffer = Buffer.from(await file.arrayBuffer());
    const webpBuffer = await sharp(inputBuffer).rotate().webp({ quality: 80 }).toBuffer();
    const blobName = `qr_company_${id}_${Date.now()}.webp`;

    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'jet00';
    if (!connectionString) {
      return NextResponse.json({ error: 'Azure Storage Connection String no configurado' }, { status: 500 });
    }

    const { BlobServiceClient } = await import('@azure/storage-blob');
    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = blobServiceClient.getContainerClient(containerName);
    await containerClient.createIfNotExists({ access: 'blob' });
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.upload(webpBuffer, webpBuffer.length, {
      blobHTTPHeaders: { blobContentType: 'image/webp' },
    });
    const qrUrl = `https://stg00vm.blob.core.windows.net/${containerName}/${blobName}`;

    const res = await pool.query('UPDATE companies SET qr_url = $1 WHERE id = $2 RETURNING *', [qrUrl, id]);
    if (res.rows.length === 0) return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 });

    broadcastUpdate('settings', { type: 'company', action: 'update', company: res.rows[0] });
    return NextResponse.json({ success: true, company: res.rows[0] });
  } catch (error: unknown) {
    console.error('Error uploading company QR:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
