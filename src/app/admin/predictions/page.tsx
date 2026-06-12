'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Users, BarChart3, ChevronRight } from 'lucide-react';

interface UserOption {
  id: number;
  nombre: string;
  email: string;
  tipo: string;
}

interface PredRow {
  id: number;
  pred_local: number;
  pred_visitante: number;
  puntos: number | null;
  local: string;
  visitante: string;
  fecha: string;
  estado: string;
  fase: string;
  grupo: string | null;
  goles_local: number | null;
  goles_visitante: number | null;
}

export default function AdminPredictionsPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserOption[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [preds, setPreds] = useState<PredRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/users')
      .then(r => {
        if (r.status === 401) { router.replace('/'); return null; }
        return r.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          setUsers(data.sort((a: UserOption, b: UserOption) => a.nombre.localeCompare(b.nombre)));
        }
        setLoadingUsers(false);
      })
      .catch(() => setLoadingUsers(false));
  }, [router]);

  useEffect(() => {
    if (!selectedUserId) { setPreds([]); return; }
    setLoading(true);
    setError('');
    fetch(`/api/admin/user-predictions?userId=${selectedUserId}`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setPreds(data);
        } else {
          setError(data.error || 'Error al cargar pronósticos');
          setPreds([]);
        }
        setLoading(false);
      })
      .catch(() => { setError('Error de conexión'); setLoading(false); });
  }, [selectedUserId]);

  const selectedUser = users.find(u => String(u.id) === selectedUserId);

  function puntosBadge(puntos: number | null, estado: string) {
    if (estado === 'upcoming' || estado === 'live' || puntos === null) {
      return <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border border-neutral-700 text-neutral-500 bg-neutral-900">Pendiente</span>;
    }
    if (puntos === 3) return <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border border-green-500/40 text-green-400 bg-green-500/10">3 pts</span>;
    if (puntos === 1) return <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border border-yellow-500/40 text-yellow-400 bg-yellow-500/10">1 pt</span>;
    return <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border border-red-500/30 text-red-400 bg-red-500/10">0 pts</span>;
  }

  function formatFecha(iso: string) {
    return new Date(iso).toLocaleString('es-BO', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  const totalPuntos = preds.reduce((s, p) => s + (p.puntos ?? 0), 0);
  const exactos = preds.filter(p => p.puntos === 3).length;
  const aciertos = preds.filter(p => p.puntos === 1).length;

  return (
    <div className="min-h-screen bg-black text-neutral-200 font-sans selection:bg-yellow-500/30">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-neutral-400 hover:text-neutral-100 transition text-xs font-bold uppercase tracking-wider"
          >
            <ArrowLeft className="w-4 h-4" /> Volver
          </button>
        </div>

        <div className="flex items-center gap-3 border-b border-neutral-800 pb-4">
          <BarChart3 className="w-6 h-6 text-yellow-500" />
          <h1 className="text-xl font-black uppercase tracking-widest text-neutral-100">
            Pronósticos por Usuario
          </h1>
          <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border border-yellow-500/30 text-yellow-500 bg-yellow-500/10 ml-auto">
            Solo SuperAdmin
          </span>
        </div>

        {/* Selector de usuario */}
        <div className="bg-neutral-900/40 border border-neutral-800 rounded-2xl p-5 space-y-3 max-w-lg">
          <div className="flex items-center gap-2 text-xs font-bold text-neutral-400 uppercase tracking-widest">
            <Users className="w-3.5 h-3.5" /> Seleccionar Usuario
          </div>
          {loadingUsers ? (
            <div className="text-xs text-neutral-500 animate-pulse">Cargando usuarios...</div>
          ) : (
            <select
              value={selectedUserId}
              onChange={e => setSelectedUserId(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 text-neutral-300 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-yellow-500/50"
            >
              <option value="">— Elegir usuario —</option>
              {users.map(u => (
                <option key={u.id} value={String(u.id)}>
                  {u.nombre} ({u.email}) · {u.tipo}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Resumen estadístico */}
        {selectedUser && preds.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Pronósticos', value: preds.length, color: 'text-neutral-300' },
              { label: 'Exactos', value: exactos, color: 'text-green-400' },
              { label: 'Aciertos', value: aciertos, color: 'text-yellow-400' },
              { label: 'Puntos totales', value: totalPuntos, color: 'text-yellow-500' },
            ].map(s => (
              <div key={s.label} className="bg-neutral-900/40 border border-neutral-800 rounded-2xl p-4 flex flex-col items-center gap-1">
                <span className={`text-2xl font-black ${s.color}`}>{s.value}</span>
                <span className="text-[9px] text-neutral-500 uppercase tracking-widest text-center">{s.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Tabla de pronósticos */}
        {selectedUser && (
          <div className="space-y-3">
            <div className="text-xs font-bold text-neutral-400 uppercase tracking-widest border-b border-neutral-800 pb-2 flex items-center gap-2">
              <ChevronRight className="w-3.5 h-3.5 text-yellow-500" />
              {selectedUser.nombre} — {selectedUser.email}
            </div>

            {loading && (
              <div className="py-12 text-center text-neutral-500 animate-pulse text-xs uppercase tracking-widest">
                Cargando pronósticos...
              </div>
            )}

            {error && (
              <div className="py-6 text-center text-red-400 text-xs">{error}</div>
            )}

            {!loading && !error && preds.length === 0 && (
              <div className="py-12 text-center text-neutral-500 text-xs italic">
                Este usuario no tiene pronósticos registrados.
              </div>
            )}

            {!loading && preds.length > 0 && (
              <div className="bg-neutral-900/40 border border-neutral-800 rounded-2xl overflow-hidden">
                {/* Encabezado tabla */}
                <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-4 py-2.5 text-[9px] font-black uppercase tracking-widest text-neutral-500 border-b border-neutral-800 bg-neutral-900/60">
                  <span>Partido</span>
                  <span className="text-center">Pronóstico</span>
                  <span className="text-center">Fase</span>
                  <span className="text-center">Fecha</span>
                  <span className="text-center">Puntos</span>
                </div>

                <div className="divide-y divide-neutral-800/60">
                  {preds.map(p => (
                    <div
                      key={p.id}
                      className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto_auto] gap-2 sm:gap-4 px-4 py-3 text-xs items-center hover:bg-neutral-800/20 transition"
                    >
                      {/* Partido */}
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-neutral-200 text-[11px]">
                          {p.local} <span className="text-neutral-500">vs</span> {p.visitante}
                        </span>
                        {p.goles_local !== null && p.goles_visitante !== null && p.estado === 'finished' && (
                          <span className="text-[9px] text-neutral-500">
                            Resultado: {p.goles_local} - {p.goles_visitante}
                          </span>
                        )}
                      </div>

                      {/* Pronóstico */}
                      <div className="flex items-center justify-center">
                        <span className="font-black text-yellow-400 text-base tabular-nums">
                          {p.pred_local} – {p.pred_visitante}
                        </span>
                      </div>

                      {/* Fase */}
                      <div className="flex justify-center">
                        <span className="text-[9px] font-bold text-neutral-400 bg-neutral-800 px-2 py-0.5 rounded-full whitespace-nowrap">
                          {p.fase}{p.grupo ? ` · Grupo ${p.grupo}` : ''}
                        </span>
                      </div>

                      {/* Fecha */}
                      <div className="text-[9px] text-neutral-500 text-center whitespace-nowrap font-mono">
                        {formatFecha(p.fecha)}
                      </div>

                      {/* Puntos */}
                      <div className="flex justify-center">
                        {puntosBadge(p.puntos, p.estado)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
