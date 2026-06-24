import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import sharp from 'sharp';
import { validateUploadedFile } from '@/lib/validation';

export const dynamic = 'force-dynamic';


// GET: fetch participants and their payments
export async function GET(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || (sessionUser.tipo !== 'admin' && sessionUser.tipo !== 'superadmin')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }



    let queryText = `
      SELECT u.id, u.nombre, u.email, u.participa, u.activo, u.aprobado, u.notas,
             COALESCE(
               json_agg(json_build_object('id', c.id, 'nombre', c.nombre, 'color', c.color, 'monto_participacion', c.monto_participacion))
               FILTER (WHERE c.id IS NOT NULL), '[]'
             ) AS companies,
             COALESCE(
               (SELECT json_agg(json_build_object('id', p.id, 'monto', p.monto, 'fecha', p.fecha, 'comprobante_url', p.comprobante_url, 'notas', p.notas) ORDER BY p.fecha DESC)
                FROM user_payments p
                WHERE p.user_id = u.id), '[]'
             ) AS payments
      FROM users u
      LEFT JOIN user_companies uc ON uc.user_id = u.id
      LEFT JOIN companies c ON c.id = uc.company_id
      WHERE u.activo = true 
        AND u.aprobado = true 
        AND u.participa IS NOT FALSE
    `;

    let queryParams: any[] = [];

    if (sessionUser.tipo === 'admin') {
      // Only show users in companies that the admin is assigned to
      queryText += `
        AND (u.id IN (
          SELECT uc2.user_id FROM user_companies uc2
          WHERE uc2.company_id IN (
            SELECT company_id FROM user_companies WHERE user_id = $1
          )
        ) OR u.id = $1)
        AND u.tipo != 'superadmin'
      `;
      queryParams.push(sessionUser.id);
    }

    queryText += `
      GROUP BY u.id, u.nombre, u.email, u.participa, u.activo, u.aprobado, u.notas
      ORDER BY u.nombre ASC
    `;

    const res = await pool.query(queryText, queryParams);
    return NextResponse.json(res.rows);
  } catch (error: any) {
    console.error('Error fetching payments:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

// POST: manage payments (add, update, delete)
export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || (sessionUser.tipo !== 'admin' && sessionUser.tipo !== 'superadmin')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }



    let action, userId, paymentId, monto, fecha, file, notas;
    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      action = formData.get('action') as string;
      userId = formData.get('userId') ? parseInt(formData.get('userId') as string) : undefined;
      paymentId = formData.get('paymentId') ? parseInt(formData.get('paymentId') as string) : undefined;
      monto = formData.get('monto') as string;
      fecha = formData.get('fecha') as string;
      file = formData.get('file') as File | null;
      notas = formData.get('notas') as string || null;
    } else {
      const body = await req.json();
      action = body.action;
      userId = body.userId;
      paymentId = body.paymentId;
      monto = body.monto;
      fecha = body.fecha;
      notas = body.notas || null;
    }

    // Helper to check if admin is allowed to manage a user's payments
    const checkPermission = async (targetUserId: number) => {
      if (sessionUser.tipo === 'superadmin') return true;
      // Admin can only manage users in the same company
      const check = await pool.query(`
        SELECT 1 FROM user_companies uc1
        JOIN user_companies uc2 ON uc1.company_id = uc2.company_id
        WHERE uc1.user_id = $1 AND uc2.user_id = $2
      `, [sessionUser.id, targetUserId]);
      return check.rows.length > 0;
    };

    // Helper to process and upload file to Azure Blob
    const uploadReceipt = async (targetId: number, receiptFile: File) => {
      const fileCheck = validateUploadedFile(receiptFile, ['image/*', 'application/pdf'], 10 * 1024 * 1024);
      if (!fileCheck.ok) {
        throw new Error(fileCheck.error);
      }

      const userRes = await pool.query('SELECT nombre FROM users WHERE id = $1', [targetId]);
      const targetUserName = userRes.rows[0]?.nombre || 'anonimo';
      const cleanPerson = targetUserName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      const loadDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const uid = Math.random().toString(36).substring(2, 8) + Date.now().toString().slice(-4);

      let uploadBuffer: Buffer;
      let blobName: string;
      let mimeType: string;

      if (receiptFile.type.includes('image')) {
        const inputBuffer = Buffer.from(await receiptFile.arrayBuffer());
        uploadBuffer = await sharp(inputBuffer)
          .rotate()
          .webp({ quality: 80 })
          .toBuffer();
        blobName = `${cleanPerson}_${loadDate}_${uid}.webp`;
        mimeType = 'image/webp';
      } else {
        uploadBuffer = Buffer.from(await receiptFile.arrayBuffer());
        const originalExtension = receiptFile.name.split('.').pop() || 'pdf';
        blobName = `${cleanPerson}_${loadDate}_${uid}.${originalExtension}`;
        mimeType = receiptFile.type || 'application/pdf';
      }

      const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
      const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'jet00';
      if (!connectionString) {
        throw new Error('Azure Storage Connection String no configurado');
      }

      const { BlobServiceClient } = await import('@azure/storage-blob');
      const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
      const containerClient = blobServiceClient.getContainerClient(containerName);
      await containerClient.createIfNotExists({ access: 'blob' });
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);
      await blockBlobClient.upload(uploadBuffer, uploadBuffer.length, {
        blobHTTPHeaders: { blobContentType: mimeType }
      });
      return `https://stg00vm.blob.core.windows.net/${containerName}/${blobName}`;
    };

    if (action === 'add') {
      if (!userId) return NextResponse.json({ error: 'ID de usuario requerido' }, { status: 400 });
      if (monto == null || isNaN(parseFloat(monto))) return NextResponse.json({ error: 'Monto inválido' }, { status: 400 });

      const allowed = await checkPermission(userId);
      if (!allowed) return NextResponse.json({ error: 'No autorizado para este usuario' }, { status: 403 });

      let comprobanteUrl = null;
      if (file && file.size > 0) {
        comprobanteUrl = await uploadReceipt(userId, file);
      }

      const payDate = fecha ? new Date(fecha) : new Date();
      const res = await pool.query(
        `INSERT INTO user_payments (user_id, monto, fecha, comprobante_url, notas) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [userId, parseFloat(monto), payDate, comprobanteUrl, notas]
      );
      
      const { sendPaymentEmailNotification, logSystem } = await import('@/lib/mail');
      sendPaymentEmailNotification(userId, parseFloat(monto), payDate, comprobanteUrl, notas).catch(e => console.error(e));
      logSystem('info', 'payment', `Pago registrado para usuario ID ${userId}`, `Monto: ${monto}, Notas: ${notas}`).catch(e => console.error(e));

      return NextResponse.json({ success: true, payment: res.rows[0] });
    }

    if (action === 'update') {
      if (!paymentId) return NextResponse.json({ error: 'ID de pago requerido' }, { status: 400 });
      if (monto == null || isNaN(parseFloat(monto))) return NextResponse.json({ error: 'Monto inválido' }, { status: 400 });

      const userRes = await pool.query(`SELECT user_id FROM user_payments WHERE id = $1`, [paymentId]);
      if (userRes.rows.length === 0) return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 });
      const targetUserId = userRes.rows[0].user_id;

      const allowed = await checkPermission(targetUserId);
      if (!allowed) return NextResponse.json({ error: 'No autorizado para este usuario' }, { status: 403 });

      let comprobanteUrl = null;
      if (file && file.size > 0) {
        comprobanteUrl = await uploadReceipt(targetUserId, file);
      }

      const payDate = fecha ? new Date(fecha) : new Date();
      
      let updateQuery = `UPDATE user_payments SET monto = $1, fecha = $2, notas = $3`;
      let queryParams: any[] = [parseFloat(monto), payDate, notas];
      if (comprobanteUrl) {
        updateQuery += `, comprobante_url = $4 WHERE id = $5`;
        queryParams.push(comprobanteUrl, paymentId);
      } else {
        updateQuery += ` WHERE id = $4`;
        queryParams.push(paymentId);
      }

      const res = await pool.query(updateQuery + ' RETURNING *', queryParams);
      return NextResponse.json({ success: true, payment: res.rows[0] });
    }

    if (action === 'delete') {
      if (!paymentId) return NextResponse.json({ error: 'ID de pago requerido' }, { status: 400 });

      const userRes = await pool.query(`SELECT user_id FROM user_payments WHERE id = $1`, [paymentId]);
      if (userRes.rows.length === 0) return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 });
      const targetUserId = userRes.rows[0].user_id;

      const allowed = await checkPermission(targetUserId);
      if (!allowed) return NextResponse.json({ error: 'No autorizado para este usuario' }, { status: 403 });

      await pool.query(`DELETE FROM user_payments WHERE id = $1`, [paymentId]);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (error: any) {
    console.error('Error managing payment:', error);
    const isValidationErr = error.message.includes('tipo de archivo') || 
                            error.message.includes('supera') || 
                            error.message.includes('extensión');
    return NextResponse.json(
      { error: isValidationErr ? error.message : 'Error del servidor' },
      { status: isValidationErr ? 400 : 500 }
    );
  }
}
