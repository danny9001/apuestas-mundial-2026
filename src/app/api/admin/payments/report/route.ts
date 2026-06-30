import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { sendMail } from '@/lib/mail';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || (sessionUser.tipo !== 'admin' && sessionUser.tipo !== 'superadmin')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // 1. Fetch participants and their payments
    let queryText = `
      SELECT u.id, u.nombre, u.email, u.participa, u.activo, u.aprobado,
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

    const queryParams: any[] = [];

    if (sessionUser.tipo === 'admin') {
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
      GROUP BY u.id, u.nombre, u.email, u.participa, u.activo, u.aprobado
      ORDER BY u.nombre ASC
    `;

    const res = await pool.query(queryText, queryParams);
    const users = res.rows;

    // 2. Generate HTML Report Table
    let tableRows = '';
    let totalCuotas = 0;
    let totalPagadoTodos = 0;

    for (const u of users) {
      const cuota = u.companies.length > 0 
        ? u.companies.reduce((sum: number, c: any) => sum + parseFloat(c.monto_participacion || 150), 0)
        : 150;
      const totalPagado = u.payments.reduce((sum: number, p: any) => sum + parseFloat(p.monto), 0);
      const saldo = cuota - totalPagado;
      const companiesStr = u.companies.map((c: any) => c.nombre).join(', ');
      
      totalCuotas += cuota;
      totalPagadoTodos += totalPagado;

      const paymentsDetail = u.payments.length > 0
        ? u.payments.map((p: any) => `Bs. ${parseFloat(p.monto).toFixed(2)} (${new Date(p.fecha).toLocaleDateString('es-BO')}${p.notas ? ` - ${p.notas}` : ''})`).join('<br/>')
        : 'Ninguno';

      let statusColor = '#22c55e'; // Paid
      if (totalPagado === 0) statusColor = '#ef4444'; // Unpaid
      else if (saldo > 0) statusColor = '#eab308'; // Partial

      tableRows += `
        <tr style="border-bottom:1px solid #27272a;">
          <td style="padding:10px 8px;font-size:13px;color:#f4f4f5;">${u.nombre}</td>
          <td style="padding:10px 8px;font-size:12px;color:#a1a1aa;">${u.email}</td>
          <td style="padding:10px 8px;font-size:12px;color:#a1a1aa;">${companiesStr || 'Sin Empresa'}</td>
          <td style="padding:10px 8px;font-size:13px;text-align:right;color:#f4f4f5;">Bs. ${cuota.toFixed(2)}</td>
          <td style="padding:10px 8px;font-size:13px;text-align:right;color:#f4f4f5;">Bs. ${totalPagado.toFixed(2)}</td>
          <td style="padding:10px 8px;font-size:13px;text-align:right;font-weight:bold;color:${statusColor};">Bs. ${saldo.toFixed(2)}</td>
          <td style="padding:10px 8px;font-size:11px;color:#a1a1aa;">${paymentsDetail}</td>
        </tr>
      `;
    }

    const totalSaldo = totalCuotas - totalPagadoTodos;

    const html = `
      <div style="font-family:sans-serif;max-width:800px;margin:0 auto;background:#09090b;color:#f4f4f5;padding:32px;border-radius:16px;">
        <h1 style="color:#eab308;font-size:20px;margin-bottom:8px;">⚽ Apuestas Mundial 2026</h1>
        <h2 style="font-size:16px;color:#f4f4f5;margin-bottom:24px;">Reporte de Control de Pagos de Participantes</h2>
        
        <table style="width:100%;border-collapse:collapse;margin:16px 0;background:#18181b30;border:1px solid #27272a;">
          <thead>
            <tr style="background:#18181b;border-bottom:2px solid #3f3f46;text-align:left;">
              <th style="padding:12px 8px;font-size:12px;color:#a1a1aa;text-transform:uppercase;font-weight:bold;">Participante</th>
              <th style="padding:12px 8px;font-size:12px;color:#a1a1aa;text-transform:uppercase;font-weight:bold;">Email</th>
              <th style="padding:12px 8px;font-size:12px;color:#a1a1aa;text-transform:uppercase;font-weight:bold;">Empresa(s)</th>
              <th style="padding:12px 8px;font-size:12px;color:#a1a1aa;text-transform:uppercase;font-weight:bold;text-align:right;">Cuota</th>
              <th style="padding:12px 8px;font-size:12px;color:#a1a1aa;text-transform:uppercase;font-weight:bold;text-align:right;">Total Pagado</th>
              <th style="padding:12px 8px;font-size:12px;color:#a1a1aa;text-transform:uppercase;font-weight:bold;text-align:right;">Saldo</th>
              <th style="padding:12px 8px;font-size:12px;color:#a1a1aa;text-transform:uppercase;font-weight:bold;">Detalle Pagos</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
            <tr style="background:#18181b;font-weight:bold;border-top:2px solid #3f3f46;">
              <td colspan="3" style="padding:12px 8px;font-size:13px;color:#f4f4f5;">TOTAL GENERAL</td>
              <td style="padding:12px 8px;font-size:13px;text-align:right;color:#f4f4f5;">Bs. ${totalCuotas.toFixed(2)}</td>
              <td style="padding:12px 8px;font-size:13px;text-align:right;color:#f4f4f5;">Bs. ${totalPagadoTodos.toFixed(2)}</td>
              <td style="padding:12px 8px;font-size:13px;text-align:right;color:#eab308;">Bs. ${totalSaldo.toFixed(2)}</td>
              <td></td>
            </tr>
          </tbody>
        </table>

        <p style="margin-top:24px;color:#71717a;font-size:12px;">Reporte generado el ${new Date().toLocaleString('es-BO')} por ${sessionUser.nombre} (${sessionUser.email}).</p>
      </div>
    `;

    // Send email to session admin
    await sendMail({
      to: sessionUser.email,
      subject: `[Mundial 2026] Reporte de Control de Pagos - ${new Date().toLocaleDateString('es-BO')}`,
      html,
      bypassSetting: true
    });

    return NextResponse.json({ success: true, message: 'Reporte de pagos enviado por correo electrónico' });
  } catch (err: any) {
    console.error('Error sending payments report email:', err);
    return NextResponse.json({ error: 'Error interno del servidor', code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
