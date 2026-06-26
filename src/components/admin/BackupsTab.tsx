'use client';

import { useState, useEffect } from 'react';
import {
  Database, Download, HardDrive, RefreshCw, AlertTriangle,
  CheckCircle, Clock, ShieldCheck, Layers, Zap,
} from 'lucide-react';

interface Backup {
  id: number;
  type: 'full' | 'incremental' | 'manual';
  blob_name: string;
  size_bytes: number | null;
  status: 'success' | 'failed';
  error_message: string | null;
  created_at: string;
}

interface BackupsTabProps {
  user: any;
  showToast: (msg: string) => void;
}

const TYPE_META = {
  full: {
    label: 'Completo',
    desc: 'Base de datos entera',
    icon: <Database className="w-5 h-5" />,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10 border-purple-500/20',
    btnClass: 'bg-purple-600 hover:bg-purple-500 text-white',
    badge: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  },
  incremental: {
    label: 'Incremental',
    desc: 'Solo tablas volátiles',
    icon: <Layers className="w-5 h-5" />,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20',
    btnClass: 'bg-blue-600 hover:bg-blue-500 text-white',
    badge: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  },
  manual: {
    label: 'Manual',
    desc: 'Base de datos entera',
    icon: <Zap className="w-5 h-5" />,
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10 border-yellow-500/20',
    btnClass: 'bg-yellow-500 hover:bg-yellow-400 text-neutral-950',
    badge: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
  },
} as const;

function formatSize(bytes: number | null) {
  if (bytes === null) return 'N/A';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es-ES', {
    year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  const d = Math.floor(diff / 86_400_000);
  if (d >= 1) return `hace ${d}d`;
  if (h >= 1) return `hace ${h}h`;
  return 'hace menos de 1h';
}

export default function BackupsTab({ user, showToast }: BackupsTabProps) {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<Record<string, boolean>>({});

  const fetchBackups = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/backups');
      if (res.ok) setBackups(await res.json());
      else showToast('Error al obtener historial de backups');
    } catch {
      showToast('Error de conexión al cargar backups');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBackups(); }, []);

  const handleBackup = async (type: 'full' | 'incremental' | 'manual') => {
    if (running[type]) return;
    setRunning(r => ({ ...r, [type]: true }));
    showToast(`Generando backup ${TYPE_META[type].label} en Azure...`);
    try {
      const res = await fetch('/api/admin/backups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Backup ${TYPE_META[type].label} creado (${formatSize(data.sizeBytes)})`);
        fetchBackups();
      } else {
        showToast(`Error: ${data.error || 'No se pudo crear el backup'}`);
      }
    } catch {
      showToast('Error de conexión al ejecutar el backup');
    } finally {
      setRunning(r => ({ ...r, [type]: false }));
    }
  };

  const handleDownload = (id: number, filename: string) => {
    showToast(`Descargando ${filename}...`);
    window.open(`/api/admin/backups/download?id=${id}`, '_blank');
  };

  // Last successful backup per type
  const lastOf = (type: Backup['type']) =>
    backups.find(b => b.type === type && b.status === 'success') ?? null;

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="bg-neutral-900/40 border border-neutral-800/60 p-5 rounded-2xl backdrop-blur-md">
        <div className="flex items-center gap-2 mb-1">
          <HardDrive className="w-5 h-5 text-yellow-500" />
          <h2 className="text-base font-black text-neutral-100 uppercase tracking-wider font-sans">
            Copias de Seguridad — Azure Storage
          </h2>
        </div>
        <p className="text-xs text-neutral-400 font-sans">
          Gestiona respaldos almacenados en Azure Blob. Completo = BD entera · Incremental = solo tablas volátiles.
        </p>
      </div>

      {/* ── Estado por tipo ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {(['full', 'incremental', 'manual'] as const).map(type => {
          const meta = TYPE_META[type];
          const last = lastOf(type);
          return (
            <div key={type} className={`rounded-2xl border p-5 space-y-3 ${meta.bg}`}>
              <div className="flex items-center justify-between">
                <div className={`flex items-center gap-2 font-black uppercase tracking-wider text-xs font-sans ${meta.color}`}>
                  {meta.icon} {meta.label}
                </div>
                {last
                  ? <ShieldCheck className="w-4 h-4 text-green-500" />
                  : <AlertTriangle className="w-4 h-4 text-neutral-600" />}
              </div>

              {last ? (
                <div className="space-y-1">
                  <p className="text-[10px] text-neutral-300 font-mono truncate" title={last.blob_name}>
                    {last.blob_name.split('/').pop()}
                  </p>
                  <p className="text-[10px] text-neutral-500 font-sans">
                    {formatSize(last.size_bytes)} · {timeAgo(last.created_at)}
                  </p>
                </div>
              ) : (
                <p className="text-[10px] text-neutral-500 font-sans italic">Sin backups registrados</p>
              )}

              <button
                onClick={() => handleBackup(type)}
                disabled={!!running[type] || loading}
                className={`w-full py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition active:scale-95 disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2 font-sans ${meta.btnClass}`}
              >
                {running[type]
                  ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Ejecutando...</>
                  : <><Database className="w-3.5 h-3.5" /> Crear {meta.label}</>}
              </button>
            </div>
          );
        })}
      </div>

      {/* ── Historial ── */}
      <div className="glass-card border border-neutral-800/80 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-5 border-b border-neutral-800/50 flex justify-between items-center bg-neutral-900/20">
          <h3 className="text-xs font-black uppercase text-neutral-300 tracking-widest font-sans flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-neutral-400" /> Historial Reciente (Últimos 50)
          </h3>
          <button
            onClick={fetchBackups}
            disabled={loading}
            className="text-neutral-400 hover:text-neutral-200 transition p-1 hover:bg-neutral-800 rounded-lg active:scale-90"
            title="Refrescar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loading && backups.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3">
            <RefreshCw className="w-8 h-8 text-yellow-500 animate-spin" />
            <p className="text-xs text-neutral-500 font-sans">Cargando historial...</p>
          </div>
        ) : backups.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3">
            <Database className="w-12 h-12 text-neutral-700" />
            <p className="text-xs text-neutral-400 font-bold font-sans">Sin backups registrados aún</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-neutral-800 text-[10px] uppercase font-black tracking-widest text-neutral-500 font-mono bg-neutral-950/20">
                    <th className="py-3.5 px-5">ID</th>
                    <th className="py-3.5 px-4">Tipo</th>
                    <th className="py-3.5 px-4">Archivo</th>
                    <th className="py-3.5 px-4">Tamaño</th>
                    <th className="py-3.5 px-4">Fecha</th>
                    <th className="py-3.5 px-4">Estado</th>
                    <th className="py-3.5 px-5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/40 text-xs font-sans">
                  {backups.map(b => {
                    const meta = TYPE_META[b.type];
                    const filename = b.blob_name.split('/').pop() || b.blob_name;
                    return (
                      <tr key={b.id} className="hover:bg-neutral-900/20 transition-colors">
                        <td className="py-4 px-5 font-mono text-[10px] text-neutral-500">#{b.id}</td>
                        <td className="py-4 px-4">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase font-mono ${meta.badge}`}>
                            {meta.label}
                          </span>
                        </td>
                        <td className="py-4 px-4 max-w-[200px] truncate font-mono text-[10px] text-neutral-300" title={b.blob_name}>
                          {filename}
                        </td>
                        <td className="py-4 px-4 text-neutral-400 font-mono text-[10px]">{formatSize(b.size_bytes)}</td>
                        <td className="py-4 px-4 text-neutral-400 text-[11px]">{formatDate(b.created_at)}</td>
                        <td className="py-4 px-4">
                          {b.status === 'success' ? (
                            <div className="flex items-center gap-1.5 text-green-400 text-[11px] font-bold">
                              <CheckCircle className="w-3.5 h-3.5 text-green-500" /> Completado
                            </div>
                          ) : (
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-1.5 text-red-400 text-[11px] font-bold">
                                <AlertTriangle className="w-3.5 h-3.5 text-red-500" /> Fallo
                              </div>
                              {b.error_message && (
                                <span className="text-[9px] text-red-500/70 font-mono truncate max-w-[160px]" title={b.error_message}>
                                  {b.error_message}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-5 text-right">
                          {b.status === 'success' && (
                            <button
                              onClick={() => handleDownload(b.id, filename)}
                              className="p-2 bg-neutral-800 hover:bg-yellow-500 hover:text-neutral-950 text-neutral-300 rounded-lg transition active:scale-95 flex items-center gap-1 ml-auto text-[10px] font-bold uppercase tracking-wider font-sans"
                            >
                              <Download className="w-3.5 h-3.5" /> Descargar
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-neutral-800/40">
              {backups.map(b => {
                const meta = TYPE_META[b.type];
                const filename = b.blob_name.split('/').pop() || b.blob_name;
                return (
                  <div key={b.id} className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase font-mono ${meta.badge}`}>
                        {meta.label}
                      </span>
                      {b.status === 'success' ? (
                        <div className="flex items-center gap-1 text-green-400 text-[11px] font-bold">
                          <CheckCircle className="w-3.5 h-3.5" /> OK
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-red-400 text-[11px] font-bold">
                          <AlertTriangle className="w-3.5 h-3.5" /> Fallo
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] font-mono text-neutral-400 truncate">{filename}</p>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <p className="text-[10px] text-neutral-500 font-sans">{formatDate(b.created_at)}</p>
                        <p className="text-[10px] text-neutral-600 font-mono">{formatSize(b.size_bytes)}</p>
                      </div>
                      {b.status === 'success' && (
                        <button
                          onClick={() => handleDownload(b.id, filename)}
                          className="p-2 bg-neutral-800 hover:bg-yellow-500 hover:text-neutral-950 text-neutral-300 rounded-lg transition active:scale-95 flex items-center gap-1 text-[10px] font-bold uppercase font-sans"
                        >
                          <Download className="w-3.5 h-3.5" /> Descargar
                        </button>
                      )}
                    </div>
                    {b.error_message && (
                      <p className="text-[9px] text-red-500/70 font-mono">{b.error_message}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
