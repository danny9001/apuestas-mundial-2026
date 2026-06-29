'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Users, BarChart3, ChevronRight, Download, FileSpreadsheet, RefreshCw } from 'lucide-react';
import { TEAM_CODES, getTeamFlag } from '@/lib/constants';

interface UserOption {
  id: number;
  nombre: string;
  email: string;
  tipo: string;
  participa?: boolean | null;
  companies?: { id: number; nombre: string; color: string }[];
  tincaso?: string | null;
}

interface PredRow {
  id: number | null;
  pred_local: number | null;
  pred_visitante: number | null;
  puntos: number | null;
  local: string;
  visitante: string;
  fecha: string;
  estado: string;
  fase: string;
  grupo: string | null;
  goles_local: number | null;
  goles_visitante: number | null;
  match_id: number;
}

export default function AdminPredictionsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<{ id: number; tipo: string; nombre: string } | null>(null);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [companies, setCompanies] = useState<{ id: number; nombre: string }[]>([]);
  
  // Filter States
  const [filterCompany, setFilterCompany] = useState<string>('all');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterParticipa, setFilterParticipa] = useState<string>('all');
  const [predDateFilter, setPredDateFilter] = useState<string>(() => new Date().toISOString().slice(0, 10));

  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [preds, setPreds] = useState<PredRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [exportingAll, setExportingAll] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [error, setError] = useState('');

  // Editing predictions
  const [editingMatchId, setEditingMatchId] = useState<number | null>(null);
  const [editLocal, setEditLocal] = useState<string>('');
  const [editVisitante, setEditVisitante] = useState<string>('');

  useEffect(() => {
    const saved = (typeof window !== 'undefined' ? localStorage.getItem('theme') : null) as 'light' | 'dark' | null;
    if (saved) {
      document.documentElement.classList.toggle('light', saved === 'light');
    }

    fetch('/api/auth')
      .then(r => r.json())
      .then(data => {
        if (data.authenticated) {
          setCurrentUser(data.user);
        }
      })
      .catch(() => {});

    fetch('/api/companies')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setCompanies(data);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/api/admin/users')
      .then(r => {
        if (r.status === 401 || r.status === 403) { router.replace('/'); return null; }
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

  // User List Filters
  const filteredUsersList = users.filter(u => {
    if (filterCompany !== 'all') {
      const belongs = (u.companies || []).some((c: any) => String(c.id) === filterCompany);
      if (!belongs) return false;
    }
    if (filterRole !== 'all' && u.tipo !== filterRole) {
      return false;
    }
    if (filterParticipa !== 'all') {
      const isParticipante = u.participa !== false;
      if (filterParticipa === 'participante' && !isParticipante) return false;
      if (filterParticipa === 'visor' && isParticipante) return false;
    }
    return true;
  });

  // Predictions List Filters
  const filteredPreds = preds.filter(p => {
    if (!predDateFilter) return true;
    const matchDateStr = new Date(p.fecha).toISOString().slice(0, 10);
    return (
      matchDateStr.includes(predDateFilter) ||
      p.fase.toLowerCase().includes(predDateFilter.toLowerCase()) ||
      p.local.toLowerCase().includes(predDateFilter.toLowerCase()) ||
      p.visitante.toLowerCase().includes(predDateFilter.toLowerCase())
    );
  });

  const totalPuntos = filteredPreds.reduce((s, p) => s + (p.puntos ?? 0), 0);
  const exactos = filteredPreds.filter(p => p.puntos === 3).length;
  const aciertos = filteredPreds.filter(p => p.puntos === 1).length;

  const handleForceRecalculate = async () => {
    setRecalculating(true);
    try {
      const res = await fetch('/api/admin/recalculate', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        alert('🎉 ' + (data.message || 'Clasificación recalculada con éxito.'));
        if (selectedUserId) {
          const r = await fetch(`/api/admin/user-predictions?userId=${selectedUserId}`);
          const d = await r.json();
          if (Array.isArray(d)) setPreds(d);
        }
      } else {
        alert('❌ Error: ' + (data.error || 'No se pudo recalcular.'));
      }
    } catch {
      alert('❌ Error de red al recalcular.');
    } finally {
      setRecalculating(false);
    }
  };

  const handleSaveEditPrediction = async (matchId: number) => {
    if (editLocal === '' || editVisitante === '') {
      alert('Ambos campos de goles local y visitante son requeridos.');
      return;
    }
    try {
      const res = await fetch('/api/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId,
          predLocal: parseInt(editLocal),
          predVisitante: parseInt(editVisitante),
          userId: selectedUserId
        })
      });
      if (res.ok) {
        // Refresh list
        fetch(`/api/admin/user-predictions?userId=${selectedUserId}`)
          .then(r => r.json())
          .then(data => {
            if (Array.isArray(data)) setPreds(data);
          });
        setEditingMatchId(null);
      } else {
        const d = await res.json();
        alert(d.error || 'Error al guardar pronóstico');
      }
    } catch {
      alert('Error de red');
    }
  };

  const exportSelectedUserToExcel = () => {
    if (!selectedUser || filteredPreds.length === 0) return;
    
    const headers = ['Participante', 'Correo', 'Partido', 'Pronóstico Local', 'Pronóstico Visitante', 'Fase', 'Fecha Partido', 'Puntos', 'Goles Local', 'Goles Visitante', 'Estado'];
    
    const rows = filteredPreds.map(p => [
      selectedUser.nombre,
      selectedUser.email,
      `${p.local} vs ${p.visitante}`,
      p.pred_local !== null ? p.pred_local : '',
      p.pred_visitante !== null ? p.pred_visitante : '',
      p.fase + (p.grupo ? ` - Grupo ${p.grupo}` : ''),
      formatFecha(p.fecha),
      p.puntos !== null ? p.puntos : 'Pendiente',
      p.goles_local !== null ? p.goles_local : '',
      p.goles_visitante !== null ? p.goles_visitante : '',
      p.estado === 'finished' ? 'Finalizado' : p.estado === 'live' ? 'En vivo' : 'Pendiente'
    ]);
    
    const csvContent = "\uFEFF" + [headers.join(';'), ...rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(';'))].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `pronosticos_${selectedUser.nombre.toLowerCase().replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportAllCompanyToExcel = async () => {
    setExportingAll(true);
    try {
      const res = await fetch('/api/admin/company-predictions');
      const data = await res.json();
      if (!Array.isArray(data)) {
        alert(data.error || 'Error al exportar');
        setExportingAll(false);
        return;
      }

      let filteredData = data;

      // Apply Filters to Exported Data
      if (filterCompany !== 'all') {
        filteredData = filteredData.filter((p: any) => String(p.company_id) === filterCompany);
      }
      if (filterRole !== 'all') {
        filteredData = filteredData.filter((p: any) => p.usuario_tipo === filterRole);
      }
      if (filterParticipa !== 'all') {
        filteredData = filteredData.filter((p: any) => {
          const isParticipante = p.usuario_participa !== false;
          return filterParticipa === 'participante' ? isParticipante : !isParticipante;
        });
      }
      if (predDateFilter) {
        filteredData = filteredData.filter((p: any) => {
          const matchDateStr = new Date(p.fecha).toISOString().slice(0, 10);
          return (
            matchDateStr.includes(predDateFilter) ||
            p.fase.toLowerCase().includes(predDateFilter.toLowerCase()) ||
            p.local.toLowerCase().includes(predDateFilter.toLowerCase()) ||
            p.visitante.toLowerCase().includes(predDateFilter.toLowerCase())
          );
        });
      }

      if (filteredData.length === 0) {
        alert('No hay pronósticos que coincidan con los filtros seleccionados para exportar.');
        setExportingAll(false);
        return;
      }

      const headers = ['Empresa', 'Participante', 'Correo', 'Rol', 'Tipo Participación', 'Partido', 'Pronóstico Local', 'Pronóstico Visitante', 'Fase', 'Fecha Partido', 'Puntos', 'Goles Local', 'Goles Visitante', 'Estado'];
      
      const rows = filteredData.map((p: any) => [
        p.empresa_nombre,
        p.usuario_nombre,
        p.usuario_email,
        p.usuario_tipo,
        p.usuario_participa !== false ? 'Participante' : 'Visor',
        `${p.local} vs ${p.visitante}`,
        p.pred_local !== null ? p.pred_local : '',
        p.pred_visitante !== null ? p.pred_visitante : '',
        p.fase,
        formatFecha(p.fecha),
        p.puntos !== null ? p.puntos : 'Pendiente',
        p.goles_local !== null ? p.goles_local : '',
        p.goles_visitante !== null ? p.goles_visitante : '',
        p.estado === 'finished' ? 'Finalizado' : p.estado === 'live' ? 'En vivo' : 'Pendiente'
      ]);

      const csvContent = "\uFEFF" + [headers.join(';'), ...rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(';'))].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `pronosticos_export_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
      alert('Error de conexión al exportar');
    } finally {
      setExportingAll(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 font-sans selection:bg-yellow-500/30">
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

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 border-b border-neutral-800 pb-4">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-6 h-6 text-yellow-500" />
            <h1 className="text-xl font-black uppercase tracking-widest text-neutral-100">
              Pronósticos por Usuario
            </h1>
                <div className="flex flex-wrap gap-2 sm:ml-auto items-center">
            {currentUser && (
              <button
                onClick={handleForceRecalculate}
                disabled={recalculating}
                className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-neutral-950 font-bold px-3 py-1.5 rounded-xl text-xs transition shadow-lg"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${recalculating ? 'animate-spin' : ''}`} />
                {recalculating ? 'Recalculando...' : 'Recalcular Tabla'}
              </button>
            )}
            {currentUser && (
              <button
                onClick={exportAllCompanyToExcel}
                disabled={exportingAll}
                className="flex items-center gap-2 bg-neutral-900 border border-neutral-850 hover:bg-neutral-850 hover:border-neutral-700 disabled:opacity-50 text-neutral-200 font-bold px-3 py-1.5 rounded-xl text-xs transition shadow-lg"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-green-500" />
                {exportingAll ? 'Exportando...' : currentUser?.tipo === 'superadmin' ? 'Exportar Todos los Pronósticos (Filtrados)' : 'Exportar Pronósticos de la Empresa (Filtrados)'}
              </button>
            )}
            <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded border border-yellow-500/30 text-yellow-500 bg-yellow-500/10">
              {currentUser?.tipo === 'superadmin' ? 'SuperAdmin' : 'Admin Empresa'}
            </span>
          </div>       </div>
        </div>

        {/* Filtros y Selector de usuario */}
        <div className="bg-neutral-900/40 border border-neutral-800 rounded-2xl p-5 space-y-4">
          <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-2">
            <Users className="w-3.5 h-3.5" /> Filtrar y Seleccionar Usuario
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Filtro Empresa */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-neutral-500 uppercase tracking-wider font-bold">Empresa</label>
              <select
                value={filterCompany}
                onChange={e => { setFilterCompany(e.target.value); setSelectedUserId(''); }}
                className="bg-neutral-950 border border-neutral-800 text-neutral-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-yellow-500/50"
              >
                <option value="all">🏢 Todas las empresas</option>
                {companies.map(c => (
                  <option key={c.id} value={String(c.id)}>{c.nombre}</option>
                ))}
              </select>
            </div>

            {/* Filtro Rol */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-neutral-500 uppercase tracking-wider font-bold">Rol / Tipo</label>
              <select
                value={filterRole}
                onChange={e => { setFilterRole(e.target.value); setSelectedUserId(''); }}
                className="bg-neutral-950 border border-neutral-800 text-neutral-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-yellow-500/50"
              >
                <option value="all">🔑 Todos los roles</option>
                <option value="externo">Externo</option>
                <option value="interno">Interno</option>
                <option value="admin">Admin</option>
                <option value="superadmin">SuperAdmin</option>
              </select>
            </div>

            {/* Filtro Participación */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-neutral-500 uppercase tracking-wider font-bold">Participación</label>
              <select
                value={filterParticipa}
                onChange={e => { setFilterParticipa(e.target.value); setSelectedUserId(''); }}
                className="bg-neutral-950 border border-neutral-800 text-neutral-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-yellow-500/50"
              >
                <option value="all">⚽ Todos (Visores y Participantes)</option>
                <option value="participante">Participantes</option>
                <option value="visor">Visores</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1 pt-2 border-t border-neutral-800/50">
            <label className="text-[10px] text-neutral-500 uppercase tracking-wider font-bold">Seleccionar Usuario ({filteredUsersList.length} encontrados)</label>
            {loadingUsers ? (
              <div className="text-xs text-neutral-500 animate-pulse">Cargando usuarios...</div>
            ) : (
              <select
                value={selectedUserId}
                onChange={e => setSelectedUserId(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 text-neutral-300 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-yellow-500/50"
              >
                <option value="">— Elegir usuario —</option>
                {filteredUsersList.map(u => (
                  <option key={u.id} value={String(u.id)}>
                    {u.nombre} ({u.email}) · {u.tipo} {u.participa === false ? '· [Visor]' : '· [Participante]'}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Resumen estadístico */}
        {selectedUser && filteredPreds.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Pronósticos', value: filteredPreds.filter(p => p.pred_local !== null).length, color: 'text-neutral-300' },
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

        {/* Tinkaso Section */}
        {selectedUser && (
          <div className="bg-neutral-900/40 border border-neutral-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-black">Tinkaso (Campeón del Mundo)</span>
              <div className="text-sm font-bold text-neutral-100 mt-1 flex items-center gap-2">
                {selectedUser.tincaso ? (
                  <>
                    <span>🏆 {selectedUser.tincaso}</span>
                    {getTeamFlag(selectedUser.tincaso)}
                  </>
                ) : (
                  <span className="text-neutral-500 italic">No registrado</span>
                )}
              </div>
            </div>
            {currentUser?.tipo === 'superadmin' && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-neutral-400 font-bold uppercase mr-1">Editar:</span>
                <select
                  value={selectedUser.tincaso || ''}
                  onChange={async (e) => {
                    const newTeam = e.target.value;
                    if (!confirm(`¿Seguro que deseas cambiar el Tinkaso de ${selectedUser.nombre} a "${newTeam || 'Ninguno'}"?`)) return;
                    try {
                      const res = await fetch('/api/admin/users', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          action: 'editUser',
                          userId: selectedUser.id,
                          nombre: selectedUser.nombre,
                          email: selectedUser.email,
                          tipo: selectedUser.tipo,
                          tincaso: newTeam || null,
                        })
                      });
                      if (res.ok) {
                        setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, tincaso: newTeam || null } : u));
                        alert('🏆 Tinkaso actualizado con éxito');
                      } else {
                        const d = await res.json();
                        alert(d.error || 'Error al actualizar Tinkaso');
                      }
                    } catch {
                      alert('Error de red');
                    }
                  }}
                  className="bg-neutral-950 border border-neutral-800 text-xs text-neutral-300 rounded-xl px-3 py-1.5 focus:outline-none focus:border-yellow-500/50 cursor-pointer"
                >
                  <option value="">— Sin Tinkaso / Elegir equipo —</option>
                  {Object.keys(TEAM_CODES).sort().map(team => (
                    <option key={team} value={team}>{team}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Tabla de pronósticos */}
        {selectedUser && (
          <div className="space-y-3">
            <div className="text-xs font-bold text-neutral-400 uppercase tracking-widest border-b border-neutral-800 pb-2 flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="flex items-center gap-2">
                <ChevronRight className="w-3.5 h-3.5 text-yellow-500" />
                {selectedUser.nombre} — {selectedUser.email}
              </div>
              <div className="flex gap-2 w-full sm:w-auto items-center">
                <input
                  type="text"
                  value={predDateFilter}
                  onChange={e => setPredDateFilter(e.target.value)}
                  placeholder="🔍 Buscar partido, fecha (YYYY-MM-DD) o fase..."
                  className="w-full sm:w-64 bg-neutral-950 border border-neutral-800 text-neutral-300 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-yellow-500/50"
                />
                <button
                  onClick={() => setPredDateFilter(new Date().toISOString().slice(0, 10))}
                  title="Ir a hoy"
                  className="flex-shrink-0 text-[10px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-lg border border-yellow-500/30 text-yellow-500 bg-yellow-500/10 hover:bg-yellow-500/20 transition"
                >
                  Hoy
                </button>
                {predDateFilter && (
                  <button
                    onClick={() => setPredDateFilter('')}
                    title="Ver todos"
                    className="flex-shrink-0 text-[10px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-lg border border-neutral-700 text-neutral-400 bg-neutral-900 hover:bg-neutral-800 transition"
                  >
                    ×
                  </button>
                )}
                {filteredPreds.length > 0 && !loading && (
                  <button
                    onClick={exportSelectedUserToExcel}
                    className="flex items-center gap-1.5 text-neutral-400 hover:text-green-400 transition text-[10px] font-bold uppercase tracking-wider whitespace-nowrap"
                  >
                    <Download className="w-3.5 h-3.5" /> Exportar Excel
                  </button>
                )}
              </div>
            </div>

            {loading && (
              <div className="py-12 text-center text-neutral-500 animate-pulse text-xs uppercase tracking-widest">
                Cargando pronósticos...
              </div>
            )}

            {error && (
              <div className="py-6 text-center text-red-400 text-xs">{error}</div>
            )}

            {!loading && !error && filteredPreds.length === 0 && (
              <div className="py-12 text-center text-neutral-500 text-xs italic">
                No se encontraron partidos o pronósticos.
              </div>
            )}

            {!loading && filteredPreds.length > 0 && (
              <div className="bg-neutral-900/40 border border-neutral-800 rounded-2xl overflow-hidden">
                {/* Encabezado tabla */}
                <div className="hidden sm:grid grid-cols-[1fr_120px_100px_160px_80px_120px] gap-4 px-4 py-2.5 text-[9px] font-black uppercase tracking-widest text-neutral-500 border-b border-neutral-800 bg-neutral-900/60">
                  <span>Partido</span>
                  <span className="text-center">Pronóstico</span>
                  <span className="text-center">Fase</span>
                  <span className="text-center">Fecha</span>
                  <span className="text-center">Puntos</span>
                  <span className="text-center">Acciones</span>
                </div>

                <div className="divide-y divide-neutral-800/60">
                  {filteredPreds.map(p => (
                    <div
                      key={p.match_id}
                      className="grid grid-cols-1 sm:grid-cols-[1fr_120px_100px_160px_80px_120px] gap-2 sm:gap-4 px-4 py-3 text-xs items-center hover:bg-neutral-800/20 transition"
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
                        {editingMatchId === p.match_id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={editLocal}
                              onChange={e => setEditLocal(e.target.value)}
                              className="w-10 bg-neutral-950 border border-neutral-800 text-yellow-400 font-black text-center text-sm p-1 rounded focus:outline-none"
                              min="0"
                            />
                            <span className="text-neutral-550 font-black">-</span>
                            <input
                              type="number"
                              value={editVisitante}
                              onChange={e => setEditVisitante(e.target.value)}
                              className="w-10 bg-neutral-950 border border-neutral-800 text-yellow-400 font-black text-center text-sm p-1 rounded focus:outline-none"
                              min="0"
                            />
                          </div>
                        ) : (
                          <span className="font-black text-yellow-400 text-base tabular-nums">
                            {p.pred_local !== null && p.pred_local !== undefined ? `${p.pred_local} – ${p.pred_visitante}` : '—'}
                          </span>
                        )}
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

                      {/* Acciones */}
                      <div className="flex justify-center">
                        {currentUser?.tipo === 'superadmin' && (
                          editingMatchId === p.match_id ? (
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleSaveEditPrediction(p.match_id)}
                                className="px-2 py-1 bg-green-600 hover:bg-green-550 text-white rounded text-[10px] font-bold uppercase transition"
                              >
                                OK
                              </button>
                              <button
                                onClick={() => setEditingMatchId(null)}
                                className="px-2 py-1 bg-neutral-800 hover:bg-neutral-750 text-neutral-400 rounded text-[10px] font-bold uppercase transition"
                              >
                                X
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingMatchId(p.match_id);
                                setEditLocal(p.pred_local !== null ? String(p.pred_local) : '');
                                setEditVisitante(p.pred_visitante !== null ? String(p.pred_visitante) : '');
                              }}
                              className="px-2.5 py-1 bg-neutral-900 hover:bg-neutral-850 hover:border-neutral-700 text-neutral-350 hover:text-white rounded border border-neutral-800 text-[10px] font-bold uppercase tracking-wider transition"
                            >
                              {p.pred_local !== null && p.pred_local !== undefined ? 'Editar' : 'Agregar'}
                            </button>
                          )
                        )}
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
