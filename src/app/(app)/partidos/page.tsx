'use client';

import { useEffect, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { getMatchesByDate } from '@/lib/match-utils';
import MatchCard from '@/components/MatchCard';
import BetModal from '@/components/BetModal';

export default function PartidosPage() {
  const { user, showToast, lastMatchUpdate } = useApp();
  const [matches, setMatches] = useState<any[]>([]);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [betModalMatch, setBetModalMatch] = useState<any | null>(null);
  const [compactView, setCompactView] = useState(true);
  const [filterFase, setFilterFase] = useState('ALL');
  const [filterGrupo, setFilterGrupo] = useState('ALL');
  const [groupDate, setGroupDate] = useState(true);
  const [groupRemaining, setGroupRemaining] = useState(false);

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

  const filtered = matches
    .filter(m => filterGrupo === 'ALL' || m.grupo === filterGrupo)
    .filter(m => filterFase === 'ALL' || m.fase === filterFase);

  const gridClass = compactView ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3' : 'grid grid-cols-1 md:grid-cols-2 gap-4';

  const renderCards = (list: any[]) => list.map(m => (
    <MatchCard key={m.id} match={m} prediction={predictions.find(p => p.match_id === m.id)}
      compact={compactView} onBet={() => setBetModalMatch(m)} />
  ));

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center gap-4 border-b border-neutral-900 pb-2">
        <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Filtrar Partidos</div>
        <button onClick={() => setCompactView(v => !v)}
          className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition border ${
            compactView ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40' : 'bg-neutral-900 text-neutral-500 border-neutral-800 hover:border-yellow-500/30 hover:text-neutral-300'
          }`}>
          {compactView ? '📱 Vista Normal' : '🔍 Vista Compacta'}
        </button>
      </div>

      {/* Fase filter */}
      <div className="space-y-3">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {[{ v: 'ALL', l: 'Todos' }, { v: 'Fase de Grupos', l: 'Grupos' }, { v: 'Ronda de 32', l: 'R32' },
            { v: 'Octavos de Final', l: 'Octavos' }, { v: 'Cuartos de Final', l: 'Cuartos' },
            { v: 'Semifinal', l: 'Semis' }, { v: 'Tercer Puesto', l: '3er Puesto' }, { v: 'Final', l: 'Final' },
          ].map(({ v, l }) => (
            <button key={v} onClick={() => { setFilterFase(v); if (v !== 'Fase de Grupos') setGroupRemaining(false); }}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wide transition ${
                filterFase === v ? 'bg-yellow-500 text-neutral-950' : 'bg-neutral-900 text-neutral-400 border border-neutral-800 hover:border-yellow-500/40 hover:text-neutral-200'
              }`}>{l}</button>
          ))}
        </div>

        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {(filterFase === 'ALL' || filterFase === 'Fase de Grupos') && (
            <>
              {['ALL', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'].map(g => (
                <button key={g} onClick={() => { setFilterGrupo(g); if (g !== 'ALL') { setGroupRemaining(false); setGroupDate(false); } }}
                  disabled={groupRemaining || groupDate}
                  className={`flex-shrink-0 px-2.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wide transition disabled:opacity-40 ${
                    filterGrupo === g ? 'bg-yellow-500 text-neutral-950' : 'bg-neutral-900 text-neutral-400 border border-neutral-800 hover:border-yellow-500/40 hover:text-neutral-200'
                  }`}>{g === 'ALL' ? 'Grp' : g}</button>
              ))}
              <button onClick={() => { const v = !groupRemaining; setGroupRemaining(v); if (v) { setFilterFase('Fase de Grupos'); setFilterGrupo('ALL'); setGroupDate(false); } }}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wide transition border ${
                  groupRemaining ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40' : 'bg-neutral-900 text-neutral-555 border-neutral-800'
                }`}>📂 Por Grupo</button>
            </>
          )}
          <button onClick={() => { const v = !groupDate; setGroupDate(v); if (v) setGroupRemaining(false); }}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wide transition border ${
              groupDate ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40' : 'bg-neutral-900 text-neutral-555 border-neutral-800'
            }`}>📅 Por Fecha</button>
        </div>
      </div>

      {/* Match list */}
      {!groupRemaining && !groupDate && (
        <div className={gridClass}>
          {renderCards(filtered)}
          {loading && <div className="py-20 text-center text-neutral-500 col-span-3">Cargando partidos...</div>}
        </div>
      )}

      {groupDate && (
        <div className="space-y-8">
          {getMatchesByDate(filtered).map(g => (
            <div key={g.dateStr} className="space-y-4">
              <div className="flex items-center gap-2 border-b border-neutral-850 pb-2">
                <span className="text-yellow-500 font-extrabold text-[10px] font-mono bg-yellow-500/10 border border-yellow-500/20 px-2.5 py-1 rounded-lg uppercase tracking-wider">{g.dateStr}</span>
                <span className="text-neutral-500 text-[10px] uppercase font-black tracking-wider">({g.matches.length} {g.matches.length === 1 ? 'partido' : 'partidos'})</span>
              </div>
              <div className={gridClass}>{renderCards(g.matches)}</div>
            </div>
          ))}
        </div>
      )}

      {groupRemaining && (
        <div className="space-y-8">
          {['A','B','C','D','E','F','G','H','I','J','K','L'].filter(grp => matches.some(m => m.grupo === grp && m.estado === 'upcoming')).map(grp => {
            const grpMatches = matches.filter(m => m.grupo === grp && m.estado === 'upcoming');
            return (
              <div key={grp} className="space-y-4">
                <div className="flex items-center gap-2 border-b border-neutral-850 pb-2">
                  <span className="text-yellow-500 font-extrabold text-[11px] font-mono bg-yellow-500/10 border border-yellow-500/20 px-2.5 py-0.5 rounded">GRUPO {grp}</span>
                  <span className="text-neutral-500 text-[10px] uppercase font-black tracking-wider">({grpMatches.length} partidos por jugar)</span>
                </div>
                <div className={gridClass}>{renderCards(grpMatches)}</div>
              </div>
            );
          })}
        </div>
      )}

      {betModalMatch && (
        <BetModal match={betModalMatch} user={user}
          existingPred={predictions.find(p => p.match_id === betModalMatch.id) ?? null}
          adminUsers={adminUsers} onSave={handleSavePrediction} onClose={() => setBetModalMatch(null)} />
      )}
    </section>
  );
}
