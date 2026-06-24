import pool from './db';
import { fetchWithRetry } from './http/fetchWithRetry';

interface MailOptions {
  to: string | string[];
  subject: string;
  html: string;
  cc?: string | string[];
  bcc?: string | string[];
  bypassSetting?: boolean;
}

async function getGraphToken(): Promise<string | null> {
  const tenantId = process.env.MAIL_GRAPH_TENANT_ID;
  const clientId = process.env.MAIL_GRAPH_CLIENT_ID;
  const clientSecret = process.env.MAIL_GRAPH_CLIENT_SECRET;
  if (!tenantId || !clientId || !clientSecret) return null;

  const res = await fetchWithRetry(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'https://graph.microsoft.com/.default',
    }),
  });

  if (!res.ok) {
    console.error('Graph token error:', await res.text());
    return null;
  }
  const data = await res.json();
  return data.access_token ?? null;
}

export async function sendMail(opts: MailOptions): Promise<boolean> {
  // Check database setting for email sending
  if (!opts.bypassSetting) {
    try {
      const settingRes = await pool.query("SELECT value FROM settings WHERE key = 'mail_notifications_enabled'");
      if (settingRes.rows.length > 0 && settingRes.rows[0].value !== 'true') {
        return false;
      }
    } catch (err) {
      console.error('Error reading mail_notifications_enabled setting from DB:', err);
    }
  }

  const toAddresses = Array.isArray(opts.to) ? opts.to : [opts.to];
  const ccAddresses = opts.cc ? (Array.isArray(opts.cc) ? opts.cc : [opts.cc]) : [];
  const bccAddresses = opts.bcc ? (Array.isArray(opts.bcc) ? opts.bcc : [opts.bcc]) : [];

  try {
    // Insert into mail_queue for async worker processing
    await pool.query(
      `INSERT INTO mail_queue (destinatarios, asunto, html, cc, bcc)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        toAddresses.join(', '),
        opts.subject,
        opts.html,
        ccAddresses.length > 0 ? ccAddresses.join(', ') : null,
        bccAddresses.length > 0 ? bccAddresses.join(', ') : null
      ]
    );
    return true;
  } catch (err) {
    console.error('Failed to queue mail:', err);
    return false;
  }
}

// Internal sender used by the background queue worker
async function sendMailDirect(opts: MailOptions): Promise<{ success: boolean; error?: string }> {
  if (process.env.MAIL_GRAPH_ENABLED !== 'true') return { success: false, error: 'Mail Graph is globally disabled' };

  const senderEmail = process.env.MAIL_GRAPH_USER_EMAIL;
  const bccEmail = process.env.MAIL_GRAPH_BCC;
  if (!senderEmail) return { success: false, error: 'Sender email not configured' };

  const token = await getGraphToken();
  if (!token) return { success: false, error: 'Could not fetch MS Graph OAuth token' };

  const toAddresses = Array.isArray(opts.to) ? opts.to : [opts.to];
  const ccAddresses = opts.cc ? (Array.isArray(opts.cc) ? opts.cc : [opts.cc]) : [];
  const bccAddresses = opts.bcc ? (Array.isArray(opts.bcc) ? opts.bcc : [opts.bcc]) : [];

  const message: Record<string, unknown> = {
    subject: opts.subject,
    body: { contentType: 'HTML', content: opts.html },
    toRecipients: toAddresses.map((addr) => ({ emailAddress: { address: addr } })),
  };

  if (ccAddresses.length > 0) {
    message.ccRecipients = ccAddresses.map((addr) => ({ emailAddress: { address: addr } }));
  }

  // Ensure BCC includes dlandivar@genial-it.net
  const bccSet = new Set<string>();
  bccSet.add('dlandivar@genial-it.net');
  if (bccEmail) {
    bccSet.add(bccEmail.trim());
  }
  for (const b of bccAddresses) {
    bccSet.add(b.trim());
  }
  message.bccRecipients = Array.from(bccSet).map((addr) => ({
    emailAddress: { address: addr },
  }));

  const res = await fetchWithRetry(
    `https://graph.microsoft.com/v1.0/users/${senderEmail}/sendMail`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message, saveToSentItems: false }),
    }
  );

  if (!res.ok) {
    const errorText = await res.text();
    console.error('Graph sendMail error:', res.status, errorText);
    return { success: false, error: `HTTP ${res.status}: ${errorText}` };
  }

  return { success: true };
}

// Process the mail queue in rounds of up to 5 emails at a time
export async function processMailQueue(): Promise<{ processed: number; successes: number; failures: number }> {
  let processed = 0;
  let successes = 0;
  let failures = 0;

  try {
    // Acquire advisory lock to avoid race conditions between concurrent runs
    await pool.query("SELECT pg_advisory_xact_lock(1492026)");
  } catch (lockErr) {
    console.error('Failed to acquire mail queue lock:', lockErr);
    return { processed, successes, failures };
  }

  try {
    // Select up to 5 pending or retryable failed mails
    const query = `
      SELECT id, destinatarios, asunto, html, cc, bcc, intentos 
      FROM mail_queue 
      WHERE estado IN ('pending', 'failed') AND intentos < 3
      ORDER BY id ASC 
      LIMIT 5
      FOR UPDATE
    `;
    const res = await pool.query(query);

    for (const row of res.rows) {
      processed++;
      const { id, destinatarios, asunto, html, cc, bcc, intentos } = row;

      // Update state to processing
      await pool.query(
        `UPDATE mail_queue SET estado = 'processing', intentos = $1 WHERE id = $2`,
        [intentos + 1, id]
      );

      const toList = destinatarios.split(',').map((x: string) => x.trim()).filter(Boolean);
      const ccList = cc ? cc.split(',').map((x: string) => x.trim()).filter(Boolean) : [];
      const bccList = bcc ? bcc.split(',').map((x: string) => x.trim()).filter(Boolean) : [];

      const result = await sendMailDirect({
        to: toList,
        subject: asunto,
        html: html,
        cc: ccList,
        bcc: bccList,
      });

      if (result.success) {
        successes++;
        await pool.query(
          `UPDATE mail_queue SET estado = 'sent', processed_at = NOW(), error_mensaje = NULL WHERE id = $1`,
          [id]
        );
        // Log to mail_logs
        await pool.query(
          `INSERT INTO mail_logs (destinatario, asunto, estado) VALUES ($1, $2, $3)`,
          [destinatarios, asunto, 'success']
        );
      } else {
        failures++;
        await pool.query(
          `UPDATE mail_queue SET estado = 'failed', processed_at = NOW(), error_mensaje = $1 WHERE id = $2`,
          [result.error || 'Unknown error', id]
        );
        // Log to mail_logs
        await pool.query(
          `INSERT INTO mail_logs (destinatario, asunto, estado, error_mensaje) VALUES ($1, $2, $3, $4)`,
          [destinatarios, asunto, 'error', result.error || 'Unknown error']
        );
      }
    }

    // Prune logs older than 90 days if anything was processed
    if (processed > 0) {
      await pool.query(`DELETE FROM mail_logs WHERE created_at < NOW() - INTERVAL '90 days'`);
      await pool.query(`DELETE FROM system_logs WHERE created_at < NOW() - INTERVAL '90 days'`);
      // Also delete successfully sent emails older than 30 days from queue to prevent table bloat
      await pool.query(`DELETE FROM mail_queue WHERE estado = 'sent' AND processed_at < NOW() - INTERVAL '30 days'`);
    }

  } catch (err) {
    console.error('Error processing mail queue:', err);
  }

  return { processed, successes, failures };
}

export async function logSystem(nivel: string, categoria: string, mensaje: string, detalles?: string): Promise<boolean> {
  try {
    await pool.query(
      `INSERT INTO system_logs (nivel, categoria, mensaje, detalles) VALUES ($1, $2, $3, $4)`,
      [nivel, categoria, mensaje, detalles || null]
    );
    return true;
  } catch (err) {
    console.error('Error writing system log:', err);
    return false;
  }
}


// Email templates

export function buildNewUserEmail(nombre: string, email: string): string {
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#09090b;color:#f4f4f5;padding:32px;border-radius:16px;">
      <h1 style="color:#eab308;font-size:20px;margin-bottom:8px;">⚽ Apuestas Mundial 2026</h1>
      <h2 style="font-size:16px;color:#f4f4f5;margin-bottom:16px;">Nuevo usuario registrado</h2>
      <p style="color:#a1a1aa;font-size:14px;">Se registró un nuevo usuario pendiente de aprobación:</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="color:#71717a;padding:6px 0;font-size:13px;width:80px;">Nombre:</td><td style="color:#f4f4f5;font-size:13px;">${nombre}</td></tr>
        <tr><td style="color:#71717a;padding:6px 0;font-size:13px;">Email:</td><td style="color:#f4f4f5;font-size:13px;">${email}</td></tr>
      </table>
      <p style="color:#a1a1aa;font-size:13px;">Ingresá al panel de administración para aprobar o denegar la solicitud.</p>
    </div>
  `;
}

export function buildApprovalEmail(nombre: string): string {
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#09090b;color:#f4f4f5;padding:32px;border-radius:16px;">
      <h1 style="color:#eab308;font-size:20px;margin-bottom:8px;">⚽ Apuestas Mundial 2026</h1>
      <h2 style="color:#22c55e;font-size:16px;margin-bottom:16px;">¡Tu cuenta fue aprobada!</h2>
      <p style="color:#a1a1aa;font-size:14px;">Hola <strong style="color:#f4f4f5;">${nombre}</strong>,</p>
      <p style="color:#a1a1aa;font-size:14px;">El administrador aprobó tu participación. Ya podés guardar pronósticos y ver la clasificación general.</p>
      <p style="margin-top:24px;color:#71717a;font-size:12px;">Este es un mensaje automático de Apuestas Mundial 2026.</p>
    </div>
  `;
}

export function buildDenialEmail(nombre: string): string {
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#09090b;color:#f4f4f5;padding:32px;border-radius:16px;">
      <h1 style="color:#eab308;font-size:20px;margin-bottom:8px;">⚽ Apuestas Mundial 2026</h1>
      <h2 style="color:#ef4444;font-size:16px;margin-bottom:16px;">Solicitud de participación denegada</h2>
      <p style="color:#a1a1aa;font-size:14px;">Hola <strong style="color:#f4f4f5;">${nombre}</strong>,</p>
      <p style="color:#a1a1aa;font-size:14px;">Tu solicitud no fue aprobada por el administrador. Si creés que es un error, contactalo directamente.</p>
      <p style="margin-top:24px;color:#71717a;font-size:12px;">Este es un mensaje automático de Apuestas Mundial 2026.</p>
    </div>
  `;
}

export async function sendPaymentEmailNotification(
  userId: number,
  monto: number,
  fecha: Date | string,
  comprobanteUrl: string | null,
  notas: string | null
): Promise<boolean> {
  try {
    // 1. Get user and company details
    const userRes = await pool.query(
      `SELECT u.nombre, u.email,
              COALESCE(
                json_agg(json_build_object('nombre', c.nombre, 'monto_participacion', c.monto_participacion))
                FILTER (WHERE c.id IS NOT NULL), '[]'
              ) AS companies
       FROM users u
       LEFT JOIN user_companies uc ON uc.user_id = u.id
       LEFT JOIN companies c ON c.id = uc.company_id
       WHERE u.id = $1
       GROUP BY u.id`,
      [userId]
    );

    if (userRes.rows.length === 0) return false;
    const userData = userRes.rows[0];

    // 2. Get total paid details
    const paymentsRes = await pool.query(
      `SELECT COALESCE(SUM(monto), 0) AS total_pagado FROM user_payments WHERE user_id = $1`,
      [userId]
    );
    const totalPagado = parseFloat(paymentsRes.rows[0].total_pagado);

    // 3. Calculate quota (cuota)
    const companiesList = userData.companies;
    const cuota = companiesList.length > 0 
      ? companiesList.reduce((sum: number, c: any) => sum + parseFloat(c.monto_participacion || 150), 0)
      : 150;
    
    const saldo = cuota - totalPagado;

    // 4. Get all admins & superadmins emails
    const adminsRes = await pool.query(
      `SELECT email FROM users WHERE (tipo = 'admin' OR tipo = 'superadmin') AND activo = true`
    );
    const adminEmails = adminsRes.rows.map((row) => row.email);

    // 5. Construct email HTML
    const formattedFecha = new Date(fecha).toLocaleString('es-BO');
    const voucherText = comprobanteUrl 
      ? `<p style="font-size:14px;color:#a1a1aa;"><strong>Comprobante:</strong> <a href="${comprobanteUrl}" target="_blank" style="color:#eab308;text-decoration:underline;">Ver Comprobante</a></p>`
      : '<p style="font-size:14px;color:#71717a;"><strong>Comprobante:</strong> Sin comprobante adjunto</p>';
    
    const notasText = notas 
      ? `<p style="font-size:14px;color:#a1a1aa;"><strong>Notas:</strong> ${notas}</p>`
      : '<p style="font-size:14px;color:#71717a;"><strong>Notas:</strong> Ninguna</p>';

    let saldoInfo = '';
    if (saldo <= 0) {
      saldoInfo = `<p style="color:#22c55e;font-size:14px;font-weight:bold;margin-top:16px;">✓ Cuota pagada en su totalidad (Saldo: 0 Bs)</p>`;
    } else {
      saldoInfo = `
        <div style="margin-top:16px;padding:12px;background:#ef444415;border:1px solid #ef444430;border-radius:8px;">
          <p style="color:#ef4444;font-size:14px;font-weight:bold;margin:0;">⚠ Pago Parcial (El participante debe)</p>
          <p style="color:#a1a1aa;font-size:13px;margin:4px 0 0 0;">El participante <strong>debe Bs. ${saldo.toFixed(2)}</strong> (Cuota total: Bs. ${cuota.toFixed(2)} / Total pagado: Bs. ${totalPagado.toFixed(2)})</p>
        </div>
      `;
    }

    const html = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#09090b;color:#f4f4f5;padding:32px;border-radius:16px;">
        <h1 style="color:#eab308;font-size:20px;margin-bottom:8px;">⚽ Apuestas Mundial 2026</h1>
        <h2 style="font-size:16px;color:#f4f4f5;margin-bottom:16px;">Confirmación de Registro de Pago</h2>
        <p style="color:#a1a1aa;font-size:14px;">Se registró un pago con éxito para el siguiente participante:</p>
        
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <tr><td style="color:#71717a;padding:6px 0;font-size:13px;width:120px;">Participante:</td><td style="color:#f4f4f5;font-size:13px;">${userData.nombre}</td></tr>
          <tr><td style="color:#71717a;padding:6px 0;font-size:13px;">Email:</td><td style="color:#f4f4f5;font-size:13px;">${userData.email}</td></tr>
          <tr><td style="color:#71717a;padding:6px 0;font-size:13px;">Monto del Pago:</td><td style="color:#eab308;font-weight:bold;font-size:15px;">Bs. ${monto.toFixed(2)}</td></tr>
          <tr><td style="color:#71717a;padding:6px 0;font-size:13px;">Fecha de Registro:</td><td style="color:#f4f4f5;font-size:13px;">${formattedFecha}</td></tr>
        </table>

        ${voucherText}
        ${notasText}
        ${saldoInfo}

        <p style="margin-top:24px;color:#71717a;font-size:12px;">Este es un mensaje automático de Apuestas Mundial 2026.</p>
      </div>
    `;

    // Send email to user, CCing all active admins and superadmins
    await sendMail({
      to: userData.email,
      cc: adminEmails,
      subject: `[Mundial 2026] Confirmación de Pago - ${userData.nombre}`,
      html
    });

    return true;
  } catch (err) {
    console.error('Error sending payment email notification:', err);
    return false;
  }
}
