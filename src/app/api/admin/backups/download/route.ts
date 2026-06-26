import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { BlobServiceClient } from '@azure/storage-blob';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.tipo !== 'superadmin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Falta el ID del backup' }, { status: 400 });
    }

    const res = await pool.query(
      'SELECT blob_name FROM database_backups WHERE id = $1',
      [parseInt(id, 10)]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'Backup no encontrado' }, { status: 404 });
    }

    const blobName = res.rows[0].blob_name;
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'jet00';
    if (!connectionString) {
      return NextResponse.json({ error: 'Azure storage no configurado' }, { status: 500 });
    }

    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    const exists = await blockBlobClient.exists();
    if (!exists) {
      return NextResponse.json({ error: 'El archivo no existe en Azure storage' }, { status: 404 });
    }

    const properties = await blockBlobClient.getProperties();
    const downloadResponse = await blockBlobClient.download(0);

    const filename = blobName.split('/').pop() || 'backup.sql.bin';
    const headers = new Headers();
    headers.set('Content-Disposition', `attachment; filename="${filename}"`);
    headers.set('Content-Type', 'application/octet-stream');
    if (properties.contentLength !== undefined) {
      headers.set('Content-Length', properties.contentLength.toString());
    }

    return new Response(downloadResponse.readableStreamBody as any, {
      status: 200,
      headers
    });

  } catch (err: any) {
    console.error('[API Backup Download GET Error]:', err);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
