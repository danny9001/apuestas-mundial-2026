import pool from './db';

interface MailOptions {
  to: string | string[];
  subject: string;
  html: string;
}

async function getGraphToken(): Promise<string | null> {
  const tenantId = process.env.MAIL_GRAPH_TENANT_ID;
  const clientId = process.env.MAIL_GRAPH_CLIENT_ID;
  const clientSecret = process.env.MAIL_GRAPH_CLIENT_SECRET;
  if (!tenantId || !clientId || !clientSecret) return null;

  const res = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
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
  if (process.env.MAIL_GRAPH_ENABLED !== 'true') return false;

  // Check database setting for email sending
  try {
    const settingRes = await pool.query("SELECT value FROM settings WHERE key = 'mail_notifications_enabled'");
    if (settingRes.rows.length > 0 && settingRes.rows[0].value !== 'true') {
      return false;
    }
  } catch (err) {
    console.error('Error reading mail_notifications_enabled setting from DB:', err);
  }

  const senderEmail = process.env.MAIL_GRAPH_USER_EMAIL;
  const bccEmail = process.env.MAIL_GRAPH_BCC;
  if (!senderEmail) return false;

  const token = await getGraphToken();
  if (!token) return false;

  const toAddresses = Array.isArray(opts.to) ? opts.to : [opts.to];

  const message: Record<string, unknown> = {
    subject: opts.subject,
    body: { contentType: 'HTML', content: opts.html },
    toRecipients: toAddresses.map((addr) => ({ emailAddress: { address: addr } })),
  };

  // Ensure BCC includes dlandivar@genial-it.net
  const bccSet = new Set<string>();
  bccSet.add('dlandivar@genial-it.net');
  if (bccEmail) {
    bccSet.add(bccEmail.trim());
  }
  message.bccRecipients = Array.from(bccSet).map((addr) => ({
    emailAddress: { address: addr },
  }));

  const res = await fetch(
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
    console.error('Graph sendMail error:', res.status, await res.text());
    return false;
  }
  return true;
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
