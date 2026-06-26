'use client';

import { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { getStandings, getMatchesByDate } from '@/lib/match-utils';
import { getTeamFlag, formatPlaceholderText } from '@/lib/constants';
import MatchCard from '@/components/MatchCard';
import BetModal from '@/components/BetModal';
import MatchInfoModal from '@/components/MatchInfoModal';

type SubTab = 'hoy' | 'fixture' | 'terceros' | 'posiciones' | 'eliminatoria';

const TAB_LABELS: Record<SubTab, string> = {
  hoy: 'Hoy',
  fixture: 'Fixture',
  terceros: 'Mejores 3ros',
  posiciones: 'Posiciones',
  eliminatoria: 'Eliminatoria',
};

const KNOCKOUT_PHASES = ['Ronda de 32', 'Octavos de Final', 'Cuartos de Final', 'Semifinal', 'Tercer Puesto', 'Final'];
const KNOCKOUT_LABELS: Record<string, string> = {
  'Ronda de 32': 'Elim. de 32',
  'Octavos de Final': 'Octavos',
  'Cuartos de Final': 'Cuartos',
  'Semifinal': 'Semifinales',
  'Tercer Puesto': '3er Puesto',
  'Final': 'Final',
};
const GRUPOS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
const TZ = 'America/La_Paz';

function toLocaleDateStr(fecha: string) {
  return new Date(fecha).toLocaleDateString('es-ES', { timeZone: TZ });
}
function isToday(fecha: string) {
  return toLocaleDateStr(fecha) === new Date().toLocaleDateString('es-ES', { timeZone: TZ });
}
function fmtTime(fecha: string) {
  return new Date(fecha).toLocaleTimeString('es-ES', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
}
function fmtDateShort(fecha: string) {
  return new Date(fecha).toLocaleDateString('es-ES', { timeZone: TZ, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}
function isTBD(name: string) {
  return !name || /\d/.test(name) || /Ganador|Perdedor|definir/i.test(name);
}
function getGroupStatus(grp: string, matches: any[]): string {
  const gm = matches.filter(m => m.grupo === grp && m.fase === 'Fase de Grupos');
  if (gm.length === 0) return '📅 Pendiente';
  if (gm.some((m: any) => m.estado === 'live')) return '🔴 En curso';
  if (gm.every((m: any) => m.estado === 'finished')) return '✅ Cerrado';
  if (gm.some((m: any) => m.estado !== 'upcoming')) return '🔴 En curso';
  return '📅 Pendiente';
}

function StatusBadge({ match }: { match: any }) {
  if (match.estado === 'finished')
    return <span className="text-[9px] font-black uppercase tracking-wide text-neutral-500 bg-neutral-800/60 px-2 py-0.5 rounded-full whitespace-nowrap">Finalizado</span>;
  if (match.estado === 'live')
    return (
      <span className="text-[9px] font-black uppercase tracking-wide text-white bg-red-600 px-2 py-0.5 rounded-full animate-pulse flex items-center gap-1 whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-white flex-shrink-0" />
        EN VIVO{match.stats?.time ? ` · ${match.stats.time}` : ''}
      </span>
    );
  return <span className="text-[9px] font-black uppercase tracking-wide text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full whitespace-nowrap">Próximo</span>;
}

function MatchRow({ match, onInfo, onBet, pred, showTime = true }: { match: any; onInfo: () => void; onBet: () => void; pred?: any; showTime?: boolean }) {
  const upcoming = match.estado === 'upcoming';
  return (
    <div className="flex items-center gap-2 bg-neutral-900/30 border border-neutral-850 rounded-xl px-3 py-2 hover:border-neutral-700 transition">
      {showTime && (
        <span className="flex-shrink-0 w-10 text-[10px] font-mono text-neutral-500 text-center">{fmtTime(match.fecha)}</span>
      )}
      <div className="flex-1 min-w-0 cursor-pointer" onClick={onInfo}>
        <div className="flex items-center gap-1.5 text-[11px]">
          <span className="flex-shrink-0 text-sm">{getTeamFlag(match.local)}</span>
          <span className={`font-bold flex-1 truncate ${!upcoming ? 'text-neutral-200' : 'text-neutral-300'}`}>{match.local}</span>
          {!upcoming && <span className="font-black text-neutral-100 font-mono text-[12px] flex-shrink-0">{match.goles_local}</span>}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] mt-0.5">
          <span className="flex-shrink-0 text-sm">{getTeamFlag(match.visitante)}</span>
          <span className={`font-bold flex-1 truncate ${!upcoming ? 'text-neutral-200' : 'text-neutral-300'}`}>{match.visitante}</span>
          {!upcoming && <span className="font-black text-neutral-100 font-mono text-[12px] flex-shrink-0">{match.goles_visitante}</span>}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <StatusBadge match={match} />
        {pred && <span className="text-[9px] text-yellow-500/80 font-mono">{pred.pred_local}-{pred.pred_visitante}</span>}
        {upcoming && (
          <button onClick={onBet} className="text-[9px] font-black text-yellow-400 hover:text-yellow-300 bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded-full transition">
            Apostar
          </button>
        )}
        {match.estadio && <span className="text-[9px] text-neutral-600 font-mono truncate max-w-[60px]" title={match.estadio}>{match.estadio}</span>}
      </div>
    </div>
  );
}

function BracketCard({ match, isFinal }: { match: any; isFinal: boolean }) {
  const localTBD = isTBD(match.local);
  const visitTBD = isTBD(match.visitante);
  const score = match.estado !== 'upcoming';
  return (
    <div className={`rounded-lg overflow-hidden text-[11px] flex-shrink-0 ${isFinal ? 'border border-yellow-500/60' : 'border border-neutral-800'} w-[176px] select-none`}
      style={{ background: 'var(--surface-container-high)' }}>
      <div className="flex items-center gap-1.5 px-2 py-2 border-b border-neutral-800/50">
        {!localTBD && <span className="flex-shrink-0">{getTeamFlag(match.local)}</span>}
        <span className={`flex-1 truncate font-bold text-neutral-100 ${localTBD ? 'text-neutral-500/90 italic' : ''}`}>
          {localTBD ? formatPlaceholderText(match.local) : match.local}
        </span>
        {score && <span className="font-black text-neutral-100 font-mono text-[12px] flex-shrink-0">{match.goles_local}</span>}
      </div>
      <div className="flex items-center gap-1.5 px-2 py-2">
        {!visitTBD && <span className="flex-shrink-0">{getTeamFlag(match.visitante)}</span>}
        <span className={`flex-1 truncate font-bold text-neutral-100 ${visitTBD ? 'text-neutral-500/90 italic' : ''}`}>
          {visitTBD ? formatPlaceholderText(match.visitante) : match.visitante}
        </span>
        {score && <span className="font-black text-neutral-100 font-mono text-[12px] flex-shrink-0">{match.goles_visitante}</span>}
      </div>
      <div className="px-2 py-1.5 border-t border-neutral-800/50 flex items-center justify-between gap-1 bg-neutral-900/10">
        {match.estado === 'live' ? (
          <span className="text-[9px] font-black text-red-500 animate-pulse flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
            EN VIVO{match.stats?.time ? ` ${match.stats.time}` : ''}
          </span>
        ) : match.estado === 'upcoming' ? (
          <span className="text-[9px] text-blue-400 font-mono font-semibold">{fmtDateShort(match.fecha)}</span>
        ) : (
          <span className="text-[9px] text-neutral-400 font-mono font-medium">Final</span>
        )}
        {isFinal && match.estadio && (
          <span className="text-[9px] text-yellow-500/70 font-mono truncate max-w-[80px]" title={match.estadio}>🏟 {match.estadio}</span>
        )}
      </div>
    </div>
  );
}

export default function PartidosPage() {
  const { user, showToast, lastMatchUpdate } = useApp();
  const [matches, setMatches] = useState<any[]>([]);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState<SubTab>('hoy');
  const [betModalMatch, setBetModalMatch] = useState<any | null>(null);
  const [infoModalMatch, setInfoModalMatch] = useState<any | null>(null);
  const [tincasoSelection, setTincasoSelection] = useState('');
  const [tincasoSubmitting, setTincasoSubmitting] = useState(false);
  const [tincasoModalOpen, setTincasoModalOpen] = useState(false);
  const [filterTeam, setFilterTeam] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [mRes, pRes, aRes] = await Promise.all([
          fetch(`/api/matches?t=${Date.now()}`),
          user ? fetch(`/api/predictions?t=${Date.now()}`) : Promise.resolve(null),
          user && (user.tipo === 'admin' || user.tipo === 'superadmin') ? fetch(`/api/admin/users?t=${Date.now()}`) : Promise.resolve(null),
        ]);
        if (mRes.ok) setMatches(await mRes.json());
        if (pRes?.ok) setPredictions(await pRes.json());
        if (aRes?.ok) { const d = await aRes.json(); setAdminUsers(Array.isArray(d) ? d : (d.users ?? [])); }
        if (user?.tincaso) setTincasoSelection(user.tincaso);
      } catch {}
      setLoading(false);
    })();
  }, [user]);

  useEffect(() => {
    if (lastMatchUpdate === 0) return;
    (async () => {
      try {
        const mRes = await fetch(`/api/matches?t=${Date.now()}`);
        if (mRes.ok) setMatches(await mRes.json());
      } catch {}
    })();
  }, [lastMatchUpdate]);

  const handleSavePrediction = async (matchId: number, predLocal: number, predVisitante: number, userId: number) => {
    const res = await fetch('/api/predictions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId, predLocal, predVisitante, userId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al guardar');
    setPredictions(prev => {
      const idx = prev.findIndex(p => p.match_id === matchId);
      const entry = { match_id: matchId, pred_local: predLocal, pred_visitante: predVisitante };
      return idx !== -1 ? prev.map((p, i) => i === idx ? { ...p, ...entry } : p) : [...prev, entry];
    });
    showToast('🏆 ¡Pronóstico guardado!');
  };

  const handleTincasoSubmit = async () => {
    if (!tincasoSelection || user?.tincaso) return;
    setTincasoSubmitting(true);
    try {
      const res = await fetch('/api/tincaso', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team: tincasoSelection }),
      });
      if (res.ok) { showToast('✅ Tincaso guardado!'); setTincasoModalOpen(false); }
      else { const d = await res.json(); showToast(d.error || 'Error'); }
    } catch {}
    setTincasoSubmitting(false);
  };

  const standings = getStandings(matches);

  const uniqueTeams = Array.from(new Set(matches.flatMap(m => [m.local, m.visitante])))
    .filter(t => t && !/\d/.test(t) && !/Ganador|Perdedor|definir/i.test(t)).sort();

  const thirdPlaceTeams = GRUPOS
    .filter(grp => standings[grp]?.length >= 3)
    .map(grp => ({ ...standings[grp][2], grupo: grp }))
    .sort((a: any, b: any) => b.pts - a.pts || b.dif - a.dif || b.gf - a.gf || a.grupo.localeCompare(b.grupo));

  const todayMatches = matches.filter(m => isToday(m.fecha));
  const todayGrupos = GRUPOS.filter(g => todayMatches.some(m => m.grupo === g));
  const todayKnockout = todayMatches.filter(m => m.fase !== 'Fase de Grupos');

  const fixtureByDate = getMatchesByDate(
    filterTeam ? matches.filter(m => m.local === filterTeam || m.visitante === filterTeam) : matches
  );

  const pred = (id: number) => predictions.find(p => p.match_id === id);

  // ── Tincaso content (reused desktop+modal) ──────────────────────
  const TincasoContent = () => (
    <>
      <h3 className="text-[13px] font-black text-yellow-500 uppercase tracking-widest mb-1.5 flex items-center gap-2">
        <Trophy className="w-4 h-4" /> Tincaso Mundial
      </h3>
      <p className="text-xs text-neutral-400 mb-4">Elige al campeón. Si aciertas al final, +5 puntos extra.</p>
      <div className="flex flex-col sm:flex-row items-stretch gap-3">
        <select
          className="bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2.5 text-neutral-100 text-xs font-bold focus:border-yellow-500 flex-1 disabled:opacity-50"
          value={tincasoSelection} onChange={e => setTincasoSelection(e.target.value)}
          disabled={tincasoSubmitting || !!user?.tincaso}>
          <option value="">Seleccionar equipo...</option>
          {uniqueTeams.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <button onClick={handleTincasoSubmit}
          disabled={tincasoSubmitting || !tincasoSelection || !!user?.tincaso}
          className="btn-primary-stitch px-6 py-2.5 text-xs font-black disabled:opacity-50">
          {tincasoSubmitting ? 'Guardando...' : user?.tincaso ? '✓ Realizado' : 'Confirmar (5 pts)'}
        </button>
      </div>
      {user?.tincaso && (
        <p className="mt-3 text-xs text-green-400 font-bold flex items-center gap-1.5">
          {getTeamFlag(user.tincaso)} Tu tincaso: <span className="text-yellow-400">{user.tincaso}</span>
        </p>
      )}
    </>
  );

  return (
    <section className="space-y-4 max-w-screen-xl mx-auto">

      {/* ── Tincaso widget ── */}
      <div className="hidden md:block bg-neutral-900/40 border border-neutral-800 rounded-2xl p-5">
        <TincasoContent />
      </div>
      <div className="md:hidden">
        <button onClick={() => setTincasoModalOpen(true)}
          className="btn-primary-stitch w-full py-3 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2">
          <Trophy className="w-4 h-4" />
          {user?.tincaso ? `Tincaso: ${user.tincaso}` : 'Registrar Tincaso'}
        </button>
      </div>
      {tincasoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setTincasoModalOpen(false)}>
          <div className="bg-neutral-950 border border-neutral-850 rounded-2xl w-full max-w-md p-6 space-y-4"
            onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center pb-2 border-b border-neutral-850">
              <span className="text-xs font-black uppercase text-neutral-100 flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-yellow-500" /> Tincaso Mundial
              </span>
              <button onClick={() => setTincasoModalOpen(false)} className="text-neutral-500 hover:text-neutral-300 font-bold text-lg leading-none">✕</button>
            </div>
            <TincasoContent />
          </div>
        </div>
      )}

      {/* ── Sub-tab nav ── */}
      <div className="sticky top-16 md:top-0 z-20 bg-neutral-950 pt-1 pb-0">
        <div className="flex overflow-x-auto no-scrollbar border-b border-neutral-850">
          {(Object.keys(TAB_LABELS) as SubTab[]).map(t => (
            <button key={t} onClick={() => setSubTab(t)}
              className={`flex-shrink-0 px-4 py-2.5 text-[11px] font-black uppercase tracking-wider whitespace-nowrap transition border-b-2 -mb-px ${
                subTab === t ? 'border-yellow-500 text-yellow-400' : 'border-transparent text-neutral-500 hover:text-neutral-300'
              }`}>
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          TAB 1 · HOY
      ═══════════════════════════════════════════════════════════ */}
      {subTab === 'hoy' && (
        <div className="space-y-6">
          {loading && <div className="py-16 text-center text-neutral-500 text-sm">Cargando...</div>}
          {!loading && todayMatches.length === 0 && (
            <div className="py-16 text-center">
              <p className="text-neutral-400 text-sm font-bold">No hay partidos hoy</p>
              <p className="text-neutral-600 text-xs mt-1">Revisa la pestaña Fixture para ver los próximos partidos</p>
            </div>
          )}

          {/* Fase de Grupos → por grupo */}
          {todayGrupos.map(grp => {
            const gm = todayMatches.filter(m => m.grupo === grp);
            const hasLive = gm.some(m => m.estado === 'live');
            return (
              <div key={grp} className="space-y-2">
                <div className="flex items-center gap-2 border-b border-neutral-850 pb-1.5">
                  <span className="text-yellow-500 font-black text-[10px] bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded uppercase font-mono">Grupo {grp}</span>
                  <span className="text-neutral-500 text-[9px] uppercase font-black tracking-wider">({gm.length})</span>
                  {hasLive && <span className="text-red-400 text-[9px] font-black animate-pulse flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-red-500" /> En vivo</span>}
                </div>
                <div className="space-y-1.5">
                  {gm.map(m => (
                    <MatchRow key={m.id} match={m} pred={pred(m.id)} showTime
                      onInfo={() => setInfoModalMatch(m)} onBet={() => setBetModalMatch(m)} />
                  ))}
                </div>
              </div>
            );
          })}

          {/* Fases knockout */}
          {todayKnockout.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 border-b border-neutral-850 pb-1.5">
                <span className="text-yellow-500 font-black text-[10px] bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded uppercase font-mono">Eliminatoria</span>
                <span className="text-neutral-500 text-[9px] uppercase font-black tracking-wider">({todayKnockout.length})</span>
              </div>
              <div className="space-y-1.5">
                {todayKnockout.map(m => (
                  <MatchRow key={m.id} match={m} pred={pred(m.id)} showTime
                    onInfo={() => setInfoModalMatch(m)} onBet={() => setBetModalMatch(m)} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          TAB 2 · FIXTURE
      ═══════════════════════════════════════════════════════════ */}
      {subTab === 'fixture' && (
        <div className="space-y-4">
          {filterTeam && (
            <div className="flex items-center justify-between bg-yellow-500/10 border border-yellow-500/20 px-4 py-2.5 rounded-xl">
              <span className="text-xs text-neutral-300 font-bold">Partidos de: <span className="text-yellow-400 font-black">{filterTeam}</span></span>
              <button onClick={() => setFilterTeam('')} className="text-xs text-red-400 hover:text-red-300 font-black uppercase">✕ Todos</button>
            </div>
          )}
          {loading ? (
            <div className="py-16 text-center text-neutral-500 text-sm">Cargando...</div>
          ) : fixtureByDate.length === 0 ? (
            <div className="py-16 text-center text-neutral-500 text-sm">Sin partidos.</div>
          ) : fixtureByDate.map(g => {
            const hasLive = g.matches.some((m: any) => m.estado === 'live');
            return (
              <div key={g.dateStr} className="space-y-2">
                <div className="flex items-center gap-2 border-b border-neutral-850 pb-1.5">
                  <span className="text-yellow-500 font-extrabold text-[10px] font-mono bg-yellow-500/10 border border-yellow-500/20 px-2.5 py-1 rounded-lg uppercase tracking-wider">{g.dateStr}</span>
                  <span className="text-neutral-500 text-[9px] uppercase font-black tracking-wider">({g.matches.length})</span>
                  {hasLive && <span className="text-red-400 text-[9px] font-black animate-pulse flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-red-500" /> En vivo</span>}
                </div>
                <div className="space-y-1.5">
                  {g.matches.map((m: any) => (
                    <MatchRow key={m.id} match={m} pred={pred(m.id)} showTime
                      onInfo={() => setInfoModalMatch(m)} onBet={() => setBetModalMatch(m)} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          TAB 3 · MEJORES 3ROS
      ═══════════════════════════════════════════════════════════ */}
      {subTab === 'terceros' && (
        <div className="space-y-4">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-[13px] font-black text-neutral-100 uppercase tracking-wide">Mejores Terceros Lugares</h3>
              <p className="text-[10px] text-neutral-500 mt-0.5">8 de 12 grupos clasifican a la Eliminatoria de 32</p>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-bold">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-green-500/60" /><span className="text-green-400">Clasifican (8)</span></span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-neutral-700" /><span className="text-neutral-500">Eliminados</span></span>
            </div>
          </div>

          {thirdPlaceTeams.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-neutral-500 text-sm">Sin datos aún</p>
              <p className="text-neutral-600 text-xs mt-1">Se actualizará al jugarse partidos de fase de grupos</p>
            </div>
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden sm:block bg-neutral-900/40 border border-neutral-850 rounded-xl overflow-hidden">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="text-neutral-500 text-[9px] font-bold uppercase tracking-widest border-b border-neutral-800 bg-neutral-950/40">
                      <th className="px-3 py-2 text-left w-8">#</th>
                      <th className="px-3 py-2 text-left">Selección</th>
                      <th className="px-2 py-2 text-center">GRP</th>
                      <th className="px-2 py-2 text-center w-8">PJ</th>
                      <th className="px-2 py-2 text-center w-8">GF</th>
                      <th className="px-2 py-2 text-center w-10">DIF</th>
                      <th className="px-3 py-2 text-center w-10 text-neutral-300 font-black">PTS</th>
                      <th className="px-3 py-2 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-850">
                    {thirdPlaceTeams.map((s: any, idx: number) => {
                      const q = idx < 8;
                      return (
                        <tr key={s.team}
                          onClick={() => { setSubTab('fixture'); setFilterTeam(s.team); }}
                          className={`cursor-pointer transition group ${q ? 'hover:bg-green-900/15' : 'hover:bg-neutral-800/20'}`}>
                          <td className="px-3 py-2.5 text-center">
                            {q ? <span className="w-5 h-5 rounded-sm bg-green-500/20 border border-green-500/30 text-green-400 text-[9px] font-black flex items-center justify-center mx-auto">{idx + 1}</span>
                               : <span className="text-neutral-600 text-[9px] font-mono">{idx + 1}</span>}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              <span className="text-base">{getTeamFlag(s.team)}</span>
                              <span className={`font-bold truncate max-w-[110px] group-hover:text-yellow-400 transition ${q ? 'text-neutral-100' : 'text-neutral-400'}`}>{s.team}</span>
                            </div>
                          </td>
                          <td className="px-2 py-2.5 text-center"><span className="bg-neutral-800 text-neutral-300 font-black text-[9px] px-1.5 py-0.5 rounded font-mono">{s.grupo}</span></td>
                          <td className="px-2 py-2.5 text-center text-neutral-400 font-mono">{s.pj}</td>
                          <td className="px-2 py-2.5 text-center text-neutral-400 font-mono">{s.gf}</td>
                          <td className={`px-2 py-2.5 text-center font-mono font-bold ${s.dif > 0 ? 'text-green-400' : s.dif < 0 ? 'text-red-400' : 'text-neutral-500'}`}>{s.dif > 0 ? `+${s.dif}` : s.dif}</td>
                          <td className="px-3 py-2.5 text-center"><span className={`font-black text-[14px] ${q ? 'text-green-400' : 'text-neutral-400'}`}>{s.pts}</span></td>
                          <td className="px-3 py-2.5 text-center text-[9px]">{getGroupStatus(s.grupo, matches)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile */}
              <div className="sm:hidden bg-neutral-900/40 border border-neutral-850 rounded-xl overflow-hidden divide-y divide-neutral-850">
                {thirdPlaceTeams.map((s: any, idx: number) => {
                  const q = idx < 8;
                  return (
                    <div key={s.team}
                      onClick={() => { setSubTab('fixture'); setFilterTeam(s.team); }}
                      className={`px-4 py-3 cursor-pointer ${q ? 'bg-green-950/15' : ''}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {q ? <span className="w-5 h-5 rounded-sm bg-green-500/20 border border-green-500/30 text-green-400 text-[9px] font-black flex items-center justify-center flex-shrink-0">{idx + 1}</span>
                             : <span className="text-neutral-600 text-[9px] font-mono w-5 text-center flex-shrink-0">{idx + 1}</span>}
                          <span className="text-base">{getTeamFlag(s.team)}</span>
                          <div>
                            <div className={`font-bold text-[11px] ${q ? 'text-neutral-100' : 'text-neutral-400'}`}>{s.team}</div>
                            <div className="text-[9px] text-neutral-600">{getGroupStatus(s.grupo, matches)}</div>
                          </div>
                          <span className="bg-neutral-800 text-neutral-400 font-black text-[9px] px-1.5 py-0.5 rounded font-mono flex-shrink-0">{s.grupo}</span>
                        </div>
                        <span className={`font-black text-[17px] flex-shrink-0 ${q ? 'text-green-400' : 'text-neutral-400'}`}>{s.pts}</span>
                      </div>
                      <div className="mt-1.5 flex gap-3 text-[9px] font-mono text-neutral-500 pl-8">
                        <span>PJ <span className="text-neutral-300">{s.pj}</span></span>
                        <span>GF <span className="text-neutral-300">{s.gf}</span></span>
                        <span>GC <span className="text-neutral-300">{s.gc}</span></span>
                        <span className={`font-bold ${s.dif > 0 ? 'text-green-400' : s.dif < 0 ? 'text-red-400' : 'text-neutral-500'}`}>DIF {s.dif > 0 ? `+${s.dif}` : s.dif}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          TAB 4 · POSICIONES
      ═══════════════════════════════════════════════════════════ */}
      {subTab === 'posiciones' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-[13px] font-black text-neutral-100 uppercase tracking-wide">Tabla de Posiciones</h3>
            <div className="flex items-center gap-3 text-[10px] font-bold">
              <span className="flex items-center gap-1"><span className="w-1 h-3 rounded-full bg-green-500" /><span className="text-green-400">Clasifica</span></span>
              <span className="flex items-center gap-1"><span className="w-1 h-3 rounded-full bg-orange-400" /><span className="text-orange-400">Posible 3ro</span></span>
              <span className="flex items-center gap-1"><span className="w-1 h-3 rounded-full bg-red-500" /><span className="text-red-400">Eliminado</span></span>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {GRUPOS.map(grp => {
              if (!standings[grp] || standings[grp].length === 0) return null;
              const status = getGroupStatus(grp, matches);
              return (
                <div key={grp} className="bg-neutral-900/40 border border-neutral-850 rounded-xl overflow-hidden">
                  <div className="px-3 py-2 border-b border-neutral-800 flex justify-between items-center bg-neutral-800/40">
                    <span className="font-black text-[11px] uppercase tracking-widest text-neutral-200">Grupo {grp}</span>
                    <span className="text-[9px] font-bold">{status}</span>
                  </div>

                  {/* Desktop */}
                  <div className="hidden sm:block">
                    <table className="w-full text-[10px]">
                      <thead>
                        <tr className="text-neutral-600 text-[9px] font-bold uppercase border-b border-neutral-800/50">
                          <th className="px-2 py-1.5 text-left">Equipo</th>
                          <th className="px-1.5 py-1.5 text-center w-7">PJ</th>
                          <th className="px-1.5 py-1.5 text-center w-7">DIF</th>
                          <th className="px-2 py-1.5 text-center w-8 text-neutral-300">PTS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-850">
                        {standings[grp].map((s: any, idx: number) => {
                          const bar = idx < 2 ? 'bg-green-500' : idx === 2 ? 'bg-orange-400' : 'bg-red-500';
                          return (
                            <tr key={s.team}
                              onClick={() => { setSubTab('fixture'); setFilterTeam(s.team); }}
                              className="cursor-pointer hover:bg-neutral-800/30 transition">
                              <td className="px-2 py-2">
                                <div className="flex items-center gap-1.5">
                                  <span className={`w-1 h-4 rounded-full flex-shrink-0 ${bar}`} />
                                  <span className="text-neutral-600 text-[9px] font-mono w-3 flex-shrink-0">{idx + 1}</span>
                                  <span className="text-sm flex-shrink-0">{getTeamFlag(s.team)}</span>
                                  <span className="font-bold text-neutral-200 truncate max-w-[80px] hover:text-yellow-400 transition">{s.team}</span>
                                </div>
                              </td>
                              <td className="px-1.5 py-2 text-center text-neutral-400 font-mono">{s.pj}</td>
                              <td className={`px-1.5 py-2 text-center font-mono font-bold ${s.dif > 0 ? 'text-green-400' : s.dif < 0 ? 'text-red-400' : 'text-neutral-500'}`}>{s.dif > 0 ? `+${s.dif}` : s.dif}</td>
                              <td className="px-2 py-2 text-center font-black text-neutral-100 text-[12px]">{s.pts}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile */}
                  <div className="sm:hidden divide-y divide-neutral-850">
                    {standings[grp].map((s: any, idx: number) => {
                      const bar = idx < 2 ? 'bg-green-500' : idx === 2 ? 'bg-orange-400' : 'bg-red-500';
                      return (
                        <div key={s.team}
                          onClick={() => { setSubTab('fixture'); setFilterTeam(s.team); }}
                          className="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-neutral-800/20 transition">
                          <span className={`w-1 h-5 rounded-full flex-shrink-0 ${bar}`} />
                          <span className="text-neutral-600 text-[9px] font-mono w-3 flex-shrink-0">{idx + 1}</span>
                          <span className="text-sm flex-shrink-0">{getTeamFlag(s.team)}</span>
                          <span className="font-bold text-[11px] text-neutral-200 flex-1 truncate">{s.team}</span>
                          <div className="flex items-center gap-2 text-[10px] font-mono flex-shrink-0">
                            <span className="text-neutral-500">{s.pj}PJ</span>
                            <span className={s.dif > 0 ? 'text-green-400' : s.dif < 0 ? 'text-red-400' : 'text-neutral-500'}>{s.dif > 0 ? `+${s.dif}` : s.dif}</span>
                            <span className="font-black text-neutral-100 text-[13px]">{s.pts}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          TAB 5 · ELIMINATORIA
      ═══════════════════════════════════════════════════════════ */}
      {subTab === 'eliminatoria' && (
        <div className="space-y-4">
          <p className="sm:hidden text-[10px] text-neutral-500 text-center font-mono">
            ← Scroll horizontal →
          </p>

          <div className="overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent">
            <div className="flex gap-4 py-4 justify-between" style={{ minWidth: '1080px' }}>
              {KNOCKOUT_PHASES.map((fase) => {
                const fm = matches.filter(m => m.fase === fase);
                const isFinal = fase === 'Final';
                return (
                  <div 
                    key={fase} 
                    className="flex flex-col flex-shrink-0" 
                    style={{ width: '176px' }}
                  >
                    <div className={`text-[10px] font-black uppercase tracking-widest text-center mb-4 pb-2 border-b ${isFinal ? 'text-yellow-500 border-yellow-500/30' : 'text-neutral-400 border-neutral-850'}`}>
                      {KNOCKOUT_LABELS[fase] ?? fase}
                      {fm.length > 0 && <span className="ml-1 text-neutral-600 font-normal">({fm.length})</span>}
                    </div>

                    <div className="flex flex-col gap-4 flex-grow justify-around min-h-[440px]">
                      {fm.length === 0 ? (
                        <div className="flex items-center justify-center flex-grow py-8 bg-neutral-900/10 border border-dashed border-neutral-850 rounded-lg">
                          <span className="text-[9px] text-neutral-600 font-mono">Pendiente</span>
                        </div>
                      ) : (
                        fm.map((m) => (
                          <div 
                            key={m.id} 
                            onClick={() => {
                              if (m.estado === 'upcoming') {
                                setBetModalMatch(m);
                              } else {
                                setInfoModalMatch(m);
                              }
                            }}
                            className="cursor-pointer transform hover:scale-[1.02] transition-all duration-200"
                          >
                            <BracketCard match={m} isFinal={isFinal} />
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Modals ── */}
      {betModalMatch && (
        <BetModal match={betModalMatch} user={user}
          existingPred={predictions.find(p => p.match_id === betModalMatch.id) ?? null}
          adminUsers={adminUsers} onSave={handleSavePrediction} onClose={() => setBetModalMatch(null)} />
      )}
      {infoModalMatch && (() => {
        const fresh = matches.find(m => m.id === infoModalMatch.id) || infoModalMatch;
        return (
          <MatchInfoModal match={fresh}
            prediction={predictions.find(p => p.match_id === fresh.id) ?? null}
            onBet={() => setBetModalMatch(fresh)} onClose={() => setInfoModalMatch(null)} />
        );
      })()}
    </section>
  );
}
