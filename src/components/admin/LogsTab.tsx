'use client';

import { useState, useEffect } from 'react';
import {
  ShieldAlert, RefreshCw, Download
} from 'lucide-react';

interface LogsTabProps {
  user: any;
  showToast: (msg: string) => void;
}

export default function LogsTab({
  user,
  showToast,
}: LogsTabProps) {
  const [logsType, setLogsType] = useState<'mail' | 'system' | 'audit' | 'payment'>('mail');
  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, [logsType]);

  const handleExportChatLogs = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const res = await fetch(`/api/chat/export?t=${Date.now()}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al exportar los logs');
      }
      const data = await res.json();
      if (!Array.isArray(data)) {
        throw new Error('Formato de datos inválido');
      }

      const headers = ['ID Mensaje', 'ID Usuario', 'Nombre Usuario', 'Email Usuario', 'Mensaje', 'Es Sistema?', 'Fecha Creación', 'Fecha Eliminación', 'Eliminado Por ID', 'Eliminado Por Nombre'];
      const csvRows = [headers.join(',')];

      for (const row of data) {
        const values = [
          row.id,
          row.user_id || '',
          `"${(row.user_nombre || '').replace(/"/g, '""')}"`,
          `"${(row.user_email || '').replace(/"/g, '""')}"`,
          `"${(row.message || '').replace(/"/g, '""')}"`,
          row.is_system ? 'SI' : 'NO',
          row.created_at ? new Date(row.created_at).toLocaleString() : '',
          row.deleted_at ? new Date(row.deleted_at).toLocaleString() : '',
          row.deleted_by_id || '',
          `"${(row.deleted_by_nombre || '').replace(/"/g, '""')}"`
        ];
        csvRows.push(values.join(','));
      }

      const csvContent = '\uFEFF' + csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `moderacion_chat_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('✅ Log de chat descargado');
    } catch (err: any) {
      console.error('Error exporting logs:', err);
      showToast(`❌ ${err.message || 'Error al exportar logs'}`);
    } finally {
      setExporting(false);
    }
  };

  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      const res = await fetch(`/api/admin/logs?type=${logsType}&limit=100&t=${Date.now()}`);
      if (res.ok) {
        const d = await res.json();
        setLogs(d.logs || []);
      }
    } catch {
      showToast('❌ Error al cargar logs');
    } finally {
      setLogsLoading(false);
    }
  };

  if (user.tipo !== 'superadmin') return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
        <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-2">
          <ShieldAlert className="w-3.5 h-3.5 text-yellow-500" />
          Consola de Logs del Sistema (Máx. 90 días)
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportChatLogs}
            disabled={exporting}
            className="bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-yellow-500 text-[10px] font-bold px-2 py-1 rounded-lg transition flex items-center gap-1 disabled:opacity-50"
          >
            <Download className="w-3 h-3" />
            {exporting ? 'Descargando...' : 'Descargar Log Chat'}
          </button>
          <button
            onClick={fetchLogs}
            className="bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-300 text-[10px] font-bold px-2 py-1 rounded-lg transition"
          >
            Actualizar
          </button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'mail', label: 'Correos Enviados/Fallados' },
          { key: 'system', label: 'Logs de Eventos' },
          { key: 'audit', label: 'Auditoría Superadmin' },
          { key: 'payment', label: 'Confirmaciones de Pago 💰' }
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setLogsType(t.key as any)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
              logsType === t.key
                ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500'
                : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {logsLoading ? (
        <div className="flex justify-center items-center py-12">
          <RefreshCw className="w-8 h-8 text-yellow-500 animate-spin" />
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-neutral-900/40 border border-neutral-900 rounded-2xl p-12 text-center text-neutral-500 text-xs">
          No hay logs registrados en esta categoría para los últimos 90 días.
        </div>
      ) : (
        <div className="bg-neutral-900/40 border border-neutral-900 rounded-2xl overflow-hidden shadow-lg">

          {/* ── Desktop: tabla ── */}
          <div className="hidden sm:block overflow-x-auto">
            {logsType === 'mail' && (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-neutral-950 text-neutral-400 border-b border-neutral-850 uppercase tracking-wider font-black text-[10px]">
                    <th className="p-3">Destinatario</th>
                    <th className="p-3">Asunto</th>
                    <th className="p-3">Estado</th>
                    <th className="p-3">Mensaje Error / Detalle</th>
                    <th className="p-3 text-right">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-850">
                  {logs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-neutral-900/20 transition-colors">
                      <td className="p-3 font-medium text-neutral-200 font-mono">{log.destinatario}</td>
                      <td className="p-3 text-neutral-300">{log.asunto}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold border ${log.estado === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                          {log.estado === 'success' ? 'ENVIADO' : 'FALLÓ'}
                        </span>
                      </td>
                      <td className="p-3 text-neutral-400 font-mono text-[10px] max-w-xs truncate" title={log.error_mensaje}>{log.error_mensaje || '-'}</td>
                      <td className="p-3 text-right text-neutral-500 font-mono">{new Date(log.created_at).toLocaleString('es-BO')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {logsType === 'system' && (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-neutral-950 text-neutral-400 border-b border-neutral-850 uppercase tracking-wider font-black text-[10px]">
                    <th className="p-3">Nivel</th>
                    <th className="p-3">Categoría</th>
                    <th className="p-3">Mensaje</th>
                    <th className="p-3">Detalles</th>
                    <th className="p-3 text-right">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-850">
                  {logs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-neutral-900/20 transition-colors">
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold border ${log.nivel === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' : log.nivel === 'warn' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'}`}>
                          {(log.nivel || 'info').toUpperCase()}
                        </span>
                      </td>
                      <td className="p-3 text-neutral-300 font-mono">{log.categoria}</td>
                      <td className="p-3 font-medium text-neutral-200">{log.mensaje}</td>
                      <td className="p-3 text-neutral-400 font-mono text-[10px]" title={log.detalles}>{log.detalles || '-'}</td>
                      <td className="p-3 text-right text-neutral-500 font-mono">{new Date(log.created_at).toLocaleString('es-BO')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {logsType === 'payment' && (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-neutral-950 text-neutral-400 border-b border-neutral-850 uppercase tracking-wider font-black text-[10px]">
                    <th className="p-3">Usuario</th>
                    <th className="p-3">Email</th>
                    <th className="p-3 text-right">Monto</th>
                    <th className="p-3">Comprobante</th>
                    <th className="p-3">Notas</th>
                    <th className="p-3 text-right">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-850">
                  {logs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-neutral-900/20 transition-colors">
                      <td className="p-3 font-bold text-neutral-200">{log.nombre}</td>
                      <td className="p-3 text-neutral-400 font-mono text-[10px]">{log.email}</td>
                      <td className="p-3 text-right font-black text-green-400 font-mono">Bs. {parseFloat(log.monto).toLocaleString('es-BO')}</td>
                      <td className="p-3">
                        {log.comprobante_url
                          ? <a href={log.comprobante_url} target="_blank" rel="noopener noreferrer" className="text-yellow-500 hover:text-yellow-400 underline text-[10px] font-bold">Ver</a>
                          : <span className="text-neutral-500">—</span>}
                      </td>
                      <td className="p-3 text-neutral-400 text-[10px]">{log.notas || '—'}</td>
                      <td className="p-3 text-right text-neutral-500 font-mono">{new Date(log.fecha).toLocaleString('es-BO')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {logsType === 'audit' && (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-neutral-950 text-neutral-400 border-b border-neutral-850 uppercase tracking-wider font-black text-[10px]">
                    <th className="p-3">Superadmin</th>
                    <th className="p-3">Acción</th>
                    <th className="p-3">Detalles</th>
                    <th className="p-3 text-right">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-850">
                  {logs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-neutral-900/20 transition-colors">
                      <td className="p-3 text-neutral-200 font-bold">{log.user_nombre || `ID: ${log.user_id}`}</td>
                      <td className="p-3 text-neutral-300 font-mono text-[10px]">{log.action}</td>
                      <td className="p-3 text-neutral-400 leading-relaxed">{log.details}</td>
                      <td className="p-3 text-right text-neutral-500 font-mono">{new Date(log.created_at).toLocaleString('es-BO')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* ── Mobile: tarjetas ── */}
          <div className="sm:hidden divide-y divide-neutral-900">
            {logsType === 'mail' && logs.map((log: any) => (
              <div key={log.id} className="p-3 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-neutral-200 font-mono truncate">{log.destinatario}</span>
                  <span className={`flex-shrink-0 px-2 py-0.5 rounded-md text-[9px] font-bold border ${log.estado === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                    {log.estado === 'success' ? 'ENVIADO' : 'FALLÓ'}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-300">{log.asunto}</p>
                {log.error_mensaje && <p className="text-[10px] text-red-400 font-mono">{log.error_mensaje}</p>}
                <p className="text-[9px] text-neutral-500 font-mono">{new Date(log.created_at).toLocaleString('es-BO')}</p>
              </div>
            ))}

            {logsType === 'system' && logs.map((log: any) => (
              <div key={log.id} className="p-3 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold border ${log.nivel === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' : log.nivel === 'warn' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'}`}>
                    {(log.nivel || 'info').toUpperCase()}
                  </span>
                  <span className="text-[10px] font-bold text-neutral-400 font-mono">{log.categoria}</span>
                </div>
                <p className="text-[11px] font-medium text-neutral-200">{log.mensaje}</p>
                {log.detalles && <p className="text-[10px] text-neutral-500 font-mono">{log.detalles}</p>}
                <p className="text-[9px] text-neutral-500 font-mono">{new Date(log.created_at).toLocaleString('es-BO')}</p>
              </div>
            ))}

            {logsType === 'payment' && logs.map((log: any) => (
              <div key={log.id} className="p-3 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-neutral-200">{log.nombre}</span>
                  <span className="text-sm font-black text-green-400 font-mono">Bs. {parseFloat(log.monto).toLocaleString('es-BO')}</span>
                </div>
                <p className="text-[10px] text-neutral-400 font-mono">{log.email}</p>
                {log.notas && <p className="text-[10px] text-neutral-300">{log.notas}</p>}
                {log.comprobante_url && (
                  <a href={log.comprobante_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-yellow-500 hover:text-yellow-400 underline font-bold">
                    Ver comprobante
                  </a>
                )}
                <p className="text-[9px] text-neutral-500 font-mono">{new Date(log.fecha).toLocaleString('es-BO')}</p>
              </div>
            ))}

            {logsType === 'audit' && logs.map((log: any) => (
              <div key={log.id} className="p-3 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-neutral-200">{log.user_nombre || `ID: ${log.user_id}`}</span>
                  <span className="text-[9px] font-mono text-neutral-500 bg-neutral-900 border border-neutral-800 px-2 py-0.5 rounded">{log.action}</span>
                </div>
                <p className="text-[11px] text-neutral-400 leading-relaxed">{log.details}</p>
                <p className="text-[9px] text-neutral-500 font-mono">{new Date(log.created_at).toLocaleString('es-BO')}</p>
              </div>
            ))}
          </div>

        </div>
      )}
    </div>
  );
}
