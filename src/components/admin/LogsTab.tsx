'use client';

import { useState, useEffect } from 'react';
import {
  ShieldAlert, RefreshCw
} from 'lucide-react';

interface LogsTabProps {
  user: any;
  showToast: (msg: string) => void;
}

export default function LogsTab({
  user,
  showToast,
}: LogsTabProps) {
  const [logsType, setLogsType] = useState<'mail' | 'system' | 'audit'>('mail');
  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, [logsType]);

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
        <button
          onClick={fetchLogs}
          className="bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-300 text-[10px] font-bold px-2 py-1 rounded-lg transition"
        >
          Actualizar
        </button>
      </div>

      <div className="flex gap-2">
        {[
          { key: 'mail', label: 'Correos Enviados/Fallados' },
          { key: 'system', label: 'Logs de Eventos' },
          { key: 'audit', label: 'Auditoría Superadmin' }
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
          <div className="overflow-x-auto">
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
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold border ${
                          log.estado === 'success'
                            ? 'bg-green-500/10 border-green-500/20 text-green-400'
                            : 'bg-red-500/10 border-red-500/20 text-red-400'
                        }`}>
                          {log.estado === 'success' ? 'ENVIADO' : 'FALLÓ'}
                        </span>
                      </td>
                      <td className="p-3 text-neutral-400 font-mono text-[10px] max-w-xs truncate" title={log.error_mensaje}>
                        {log.error_mensaje || '-'}
                      </td>
                      <td className="p-3 text-right text-neutral-500 font-mono">
                        {new Date(log.created_at).toLocaleString('es-BO')}
                      </td>
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
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold border ${
                          log.nivel === 'error'
                            ? 'bg-red-500/10 border-red-500/20 text-red-400'
                            : log.nivel === 'warn'
                            ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
                            : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                        }`}>
                          {(log.nivel || 'info').toUpperCase()}
                        </span>
                      </td>
                      <td className="p-3 text-neutral-300 font-mono">{log.categoria}</td>
                      <td className="p-3 font-medium text-neutral-200">{log.mensaje}</td>
                      <td className="p-3 text-neutral-400 font-mono text-[10px]" title={log.detalles}>
                        {log.detalles || '-'}
                      </td>
                      <td className="p-3 text-right text-neutral-500 font-mono">
                        {new Date(log.created_at).toLocaleString('es-BO')}
                      </td>
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
                      <td className="p-3 text-right text-neutral-500 font-mono">
                        {new Date(log.created_at).toLocaleString('es-BO')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
