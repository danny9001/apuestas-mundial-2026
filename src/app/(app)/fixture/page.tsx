'use client';

import { useEffect, useState, useRef } from 'react';
import { Trophy } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { getStandings, getMatchesByDate } from '@/lib/match-utils';
import { getTeamFlag } from '@/lib/constants';
import MatchCard from '@/components/MatchCard';
import BetModal from '@/components/BetModal';
import MatchInfoModal from '@/components/MatchInfoModal';

type SubTab = 'partidos' | 'posiciones' | 'eliminatoria';

export default function FixturePage() {
  const { user, showToast, lastMatchUpdate } = useApp();
  const [matches, setMatches] = useState<any[]>([]);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState<SubTab>('partidos');
  const [betModalMatch, setBetModalMatch] = useState<any | null>(null);
  const [infoModalMatch, setInfoModalMatch] = useState<any | null>(null);
  const [tincasoSelection, setTincasoSelection] = useState('');
  const [tincasoSubmitting, setTincasoSubmitting] = useState(false);
  const [filterTeam, setFilterTeam] = useState('');
  const todayRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (subTab === 'partidos' && matches.length > 0 && todayRef.current) {
      setTimeout(() => {
        todayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [subTab, matches.length]);

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

  const [tincasoModalOpen, setTincasoModalOpen] = useState(false);

  const handleTincasoSubmit = async () => {
    if (!tincasoSelection || user?.tincaso) return;
    setTincasoSubmitting(true);
    try {
      const res = await fetch('/api/tincaso', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team: tincasoSelection }),
      });
      if (res.ok) {
        showToast('✅ Tincaso guardado!');
        setTincasoModalOpen(false);
      }
      else { const d = await res.json(); showToast(d.error || 'Error'); }
    } catch {}
    setTincasoSubmitting(false);
  };

  const compactView = false; // Disable compact view to allow normal/expanded cards on desktop
  const gridClass = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4';
  const renderCards = (list: any[]) => list.map(m => (
    <MatchCard key={m.id} match={m} prediction={predictions.find(p => p.match_id === m.id)}
      compact={compactView} onBet={() => setBetModalMatch(m)} onClick={() => setInfoModalMatch(m)} />
  ));

  const standings = getStandings(matches);
  const knockoutPhases = ['Ronda de 32','Octavos de Final','Cuartos de Final','Semifinal','Tercer Puesto','Final'];

  const TinkasoContent = () => (
    <>
      <h3 className="text-xl font-black text-yellow-500 uppercase tracking-widest mb-2 flex items-center gap-2">
        <Trophy className="w-6 h-6" /> Tincaso Mundial
      </h3>
      <p className="text-sm text-neutral-400 mb-6">Selecciona tu equipo ganador del torneo. Si aciertas al final del campeonato, ganarás 5 puntos extra.</p>
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <select className="bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-neutral-100 font-bold focus:border-yellow-500 w-full sm:w-auto flex-1 disabled:opacity-50"
          value={tincasoSelection} onChange={e => setTincasoSelection(e.target.value)}
          disabled={tincasoSubmitting || !!user?.tincaso}>
          <option value="">Seleccionar Equipo...</option>
          {Array.from(new Set(matches.flatMap(m => [m.local, m.visitante])))
            .filter(t => t && !/\d/.test(t) && !/Ganador|Perdedor|definir/i.test(t)).sort()
            .map(team => <option key={team} value={team}>{team}</option>)}
        </select>
        <button onClick={handleTincasoSubmit} disabled={tincasoSubmitting || !tincasoSelection || !!user?.tincaso}
          className="btn-primary-stitch px-8 py-3 w-full sm:w-auto disabled:opacity-50">
          {tincasoSubmitting ? 'Guardando...' : user?.tincaso ? 'Apuesta Realizada' : 'Apostar (5 pts)'}
        </button>
      </div>
    </>
  );

  return (
    <section className="space-y-4 max-w-screen-xl mx-auto">
      {/* Tincaso: Deployed on Desktop, Button+Modal on Mobile */}
      <div className="hidden md:block bg-neutral-900/50 border border-neutral-800 rounded-3xl p-8">
        <TinkasoContent />
      </div>

      <div className="md:hidden flex justify-center py-2">
        <button onClick={() => setTincasoModalOpen(true)} className="btn-primary-stitch w-full py-3.5 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2">
          <Trophy className="w-4 h-4 text-yellow-500" />
          {user?.tincaso ? `Tinkaso: ${user.tincaso}` : 'Registrar Tinkaso'}
        </button>
      </div>

      {tincasoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setTincasoModalOpen(false)}>
          <div className="bg-neutral-950 border border-neutral-850 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center pb-2 border-b border-neutral-850">
              <span className="text-sm font-black uppercase text-neutral-100 flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-yellow-500" /> Tincaso Mundial
              </span>
              <button onClick={() => setTincasoModalOpen(false)} className="text-neutral-500 hover:text-neutral-300 font-bold">✕</button>
            </div>
            <TinkasoContent />
          </div>
        </div>
      )}

      {/* Sub-tabs */}
      <div className="flex bg-neutral-900/50 rounded-xl p-1 mb-4 border border-neutral-850">
        {(['partidos', 'posiciones', 'eliminatoria'] as SubTab[]).map(t => (
          <button key={t} onClick={() => setSubTab(t)}
            className={`flex-1 py-2 text-[11px] font-black uppercase tracking-wider rounded-lg transition ${subTab === t ? 'bg-neutral-800 text-neutral-100 shadow' : 'text-neutral-500 hover:text-neutral-300'}`}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Partidos */}
      {subTab === 'partidos' && (() => {
        const filteredMatches = matches.filter(m => !filterTeam || m.local === filterTeam || m.visitante === filterTeam);
        const matchesByDate = getMatchesByDate(filteredMatches);
        return (
          <div className="space-y-4">
            {filterTeam && (
              <div className="flex items-center justify-between bg-yellow-500/10 border border-yellow-500/20 px-4 py-3 rounded-2xl">
                <div className="text-xs text-neutral-300 font-bold">
                  Mostrando partidos de: <span className="text-yellow-500 font-black">{filterTeam}</span>
                </div>
                <button onClick={() => setFilterTeam('')} className="text-xs text-red-400 hover:text-red-300 font-black uppercase tracking-wider">
                  ✕ Mostrar Todos
                </button>
              </div>
            )}
            {loading ? <div className="py-20 text-center text-neutral-500">Cargando...</div>
            : matchesByDate.length === 0 ? <div className="py-20 text-center text-neutral-500">Sin partidos para este equipo.</div>
            : matchesByDate.map(g => (
              <div key={g.dateStr} className="space-y-4" ref={g.dateStr.includes('(HOY)') ? todayRef : null}>
                <div className="flex items-center gap-2 border-b border-neutral-850 pb-2">
                  <span className="text-yellow-500 font-extrabold text-[10px] font-mono bg-yellow-500/10 border border-yellow-500/20 px-2.5 py-1 rounded-lg uppercase tracking-wider">{g.dateStr}</span>
                  <span className="text-neutral-500 text-[10px] uppercase font-black tracking-wider">({g.matches.length} {g.matches.length === 1 ? 'partido' : 'partidos'})</span>
                </div>
                <div className={gridClass}>{renderCards(g.matches)}</div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Posiciones */}
      {subTab === 'posiciones' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Object.keys(standings).sort().map(grp => {
            if (standings[grp].length === 0) return null;
            return (
              <div key={grp} className="bg-neutral-900/40 border border-neutral-850 rounded-xl overflow-hidden">
                <div className="bg-neutral-800/80 px-4 py-2 border-b border-neutral-800 flex justify-between items-center">
                  <span className="font-black text-[12px] uppercase tracking-widest text-neutral-200">Grupo {grp}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[10px] text-left">
                    <thead className="text-neutral-500 border-b border-neutral-800/50 bg-neutral-900/20">
                      <tr>
                        <th className="px-3 py-2 font-bold">Selección</th>
                        {['PTS','PJ','PG','PE','PP','GF','GC','DIF'].map(h => (
                          <th key={h} className="px-1.5 py-2 font-bold text-center">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-850">
                      {standings[grp].map((s: any, idx: number) => (
                        <tr key={s.team} className="hover:bg-neutral-800/30 transition cursor-pointer" onClick={() => { setSubTab('partidos'); setFilterTeam(s.team); }}>
                          <td className="px-3 py-2 flex items-center gap-1.5">
                            <span className="font-mono text-neutral-600 text-[9px] w-3 flex-shrink-0">{idx + 1}</span>
                            <span className="text-base flex-shrink-0">{getTeamFlag(s.team)}</span>
                            <span className="font-bold text-neutral-350 hover:text-yellow-500 transition truncate max-w-[90px]">{s.team}</span>
                          </td>
                          <td className="px-1.5 py-2 text-center font-black text-neutral-100">{s.pts}</td>
                          {[s.pj,s.pg,s.pe,s.pp,s.gf,s.gc].map((v, i) => (
                            <td key={i} className="px-1.5 py-2 text-center text-neutral-400 font-mono">{v}</td>
                          ))}
                          <td className="px-1.5 py-2 text-center text-neutral-400 font-mono">{s.dif > 0 ? `+${s.dif}` : s.dif}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Eliminatoria */}
      {subTab === 'eliminatoria' && (
        <div className="space-y-8">
          {knockoutPhases.filter(fase => matches.some(m => m.fase === fase)).map(fase => {
            const faseMatches = matches.filter(m => m.fase === fase);
            return (
              <div key={fase} className="space-y-4">
                <div className="flex items-center gap-2 border-b border-neutral-850 pb-2">
                  <span className="text-yellow-500 font-extrabold text-[11px] font-mono bg-yellow-500/10 border border-yellow-500/20 px-2.5 py-0.5 rounded uppercase">{fase}</span>
                  <span className="text-neutral-500 text-[10px] uppercase font-black tracking-wider">({faseMatches.length} partidos)</span>
                </div>
                <div className={gridClass}>{renderCards(faseMatches)}</div>
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

      {infoModalMatch && (() => {
        const freshMatch = matches.find(m => m.id === infoModalMatch.id) || infoModalMatch;
        return (
          <MatchInfoModal
            match={freshMatch}
            prediction={predictions.find(p => p.match_id === freshMatch.id) ?? null}
            onBet={() => setBetModalMatch(freshMatch)}
            onClose={() => setInfoModalMatch(null)}
          />
        );
      })()}
    </section>
  );
}
