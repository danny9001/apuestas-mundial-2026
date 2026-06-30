'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { Trophy, X } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { getTeamFlag } from '@/lib/constants';
import MatchCard from '@/components/MatchCard';
import BetModal from '@/components/BetModal';
import MatchInfoModal from '@/components/MatchInfoModal';
import ScoreCorrectionPanel from '@/components/ScoreCorrectionPanel';
import OnlineUsers from '@/components/OnlineUsers';

export default function DashboardPage() {
  const { user, showToast, lastMatchUpdate } = useApp();
  const [matches, setMatches] = useState<any[]>([]);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [betModalMatch, setBetModalMatch] = useState<any | null>(null);
  const [infoModalMatch, setInfoModalMatch] = useState<any | null>(null);
  const [summaryMatch, setSummaryMatch] = useState<any | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [kickoffTimeLeft, setKickoffTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [mRes, lRes] = await Promise.all([
        fetch(`/api/matches?t=${Date.now()}`),
        fetch(`/api/leaderboard?t=${Date.now()}`),
      ]);
      const [mData, lData] = await Promise.all([
        mRes.ok ? mRes.json() : [],
        lRes.ok ? lRes.json() : [],
      ]);
      setMatches(mData);
      setLeaderboard(lData);

      if (user) {
        const [pRes, aRes] = await Promise.all([
          fetch(`/api/predictions?t=${Date.now()}`),
          (user.tipo === 'admin' || user.tipo === 'superadmin') ? fetch(`/api/admin/users?t=${Date.now()}`) : Promise.resolve(null),
        ]);
        if (pRes?.ok) setPredictions(await pRes.json());
        if (aRes?.ok) { const d = await aRes.json(); setAdminUsers(Array.isArray(d) ? d : (d.users ?? [])); }
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  // Re-fetch matches when a live update arrives via SSE
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
    if (user?.companies?.length) {
      setSelectedCompanyId(user.companies[0].id);
    }
  }, [user]);

  // Countdown timer
  useEffect(() => {
    const countdownMatch = matches
      .filter(m => m.estado === 'upcoming' && new Date(m.fecha).getTime() > Date.now())
      .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())[0];
    const target = countdownMatch ? new Date(countdownMatch.fecha).getTime() : new Date('2026-06-11T19:00:00Z').getTime();

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const diff = Math.max(0, target - Date.now());
      setKickoffTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [matches]);

  const handleSavePrediction = async (matchId: number, predLocal: number, predVisitante: number, userId: number) => {
    const res = await fetch('/api/predictions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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

  const myRank = user ? leaderboard.find(r => r.user_id === user.id) : null;
  const activeCompanyId = selectedCompanyId ?? user?.companies?.[0]?.id ?? null;
  // Solo participantes (participa !== false), filtrados por empresa activa
  const companyLeaderboard = leaderboard.filter(r =>
    r.participa !== false &&
    (activeCompanyId ? (r.companies || []).some((c: any) => c.id === activeCompanyId) : true)
  );
  const myCompanyRankIndex = companyLeaderboard.findIndex(r => r.user_id === user?.id);
  const myCompanyRank = myCompanyRankIndex >= 0 ? myCompanyRankIndex + 1 : null;
  const isTodayBolivia = (dateStr: string) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const boliviaTime = new Date(d.getTime() - 4 * 60 * 60 * 1000);
    const nowBolivia = new Date(Date.now() - 4 * 60 * 60 * 1000);
    return boliviaTime.getUTCDate() === nowBolivia.getUTCDate() &&
           boliviaTime.getUTCMonth() === nowBolivia.getUTCMonth() &&
           boliviaTime.getUTCFullYear() === nowBolivia.getUTCFullYear();
  };

  const GRACE_MS = 15 * 60 * 1000;
  const canEditMatches = !!(user && ((user as any).arbitro_marcador || user.tipo === 'admin' || user.tipo === 'superadmin'));
  const todayMatches = matches.filter(m => isTodayBolivia(m.fecha)).sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
  const countdownMatch = matches.filter(m => m.estado === 'upcoming' && new Date(m.fecha).getTime() > Date.now()).sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())[0];

  return (
    <section className="space-y-6 pb-8">

      {/* Welcome Card */}
      <div className="bg-gradient-to-r from-yellow-500/15 via-amber-500/5 to-transparent border border-yellow-500/20 rounded-2xl p-6 xl:p-8 relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-lg animate-fade-in">
        <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 rounded-full blur-2xl pointer-events-none" />
        {user ? (
          <>
            <div>
              <div className="text-[10px] text-yellow-500 font-black uppercase tracking-widest">Resumen de Quiniela</div>
              <h2 className="text-2xl font-black text-neutral-100 mt-1">¡Hola, {user.nombre}! 👋</h2>
              <p className="text-neutral-400 text-xs mt-1">Aquí tienes el estado actual de tus predicciones, tu ranking y las novedades del torneo.</p>
            </div>
            {user.companies && user.companies.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {user.companies.map((c: any) => (
                  <span key={c.id} className="text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border"
                    style={{ color: c.color, borderColor: c.color + '40', backgroundColor: c.color + '15' }}>🏢 {c.nombre}</span>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div>
              <div className="text-[10px] text-yellow-500 font-black uppercase tracking-widest">Quiniela Oficial del Mundial 2026</div>
              <h2 className="text-2xl font-black text-neutral-100 mt-1">¡Bienvenido a la Quiniela! 🏆</h2>
              <p className="text-neutral-400 text-xs mt-1">Únete hoy mismo para pronosticar los resultados y competir.</p>
            </div>
            <Link href="/" className="btn-primary-stitch px-5 py-2.5 text-xs font-black tracking-wider uppercase flex-shrink-0">
              Ingresar / Registrarse
            </Link>
          </>
        )}
      </div>

      {/* Tinkaso Missing Notice */}
      {user && !user.tincaso && (
        <div className="bg-gradient-to-r from-red-500/15 via-orange-500/5 to-transparent border border-red-500/30 rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-lg animate-pulse">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-red-400">
              <span>⚠️</span> ¡Falta registrar tu Tinkaso!
            </div>
            <p className="text-neutral-300 text-xs mt-1.5 leading-relaxed">
              Aún no has pronosticado al campeón del torneo en el <strong>Tinkaso</strong>. ¡No te quedes sin esos puntos extra!
            </p>
          </div>
          <Link href="/fixture" className="btn-primary-stitch px-5 py-2.5 text-xs font-black tracking-wider uppercase bg-red-600 hover:bg-red-500 border-red-500 text-white flex-shrink-0">
            Registrar Tinkaso
          </Link>
        </div>
      )}

      {/* Stats cards - Desktop/Tablet */}
      {user && (
        <div className="hidden sm:grid grid-cols-2 xl:grid-cols-4 2xl:grid-cols-4 gap-3 xl:gap-4">
          {[
            { label: 'Puntos Totales', value: myRank?.puntos_totales ?? 0, sub: 'Acumulados en todos los partidos', color: 'text-yellow-500' },
            { label: 'Posición General', value: myCompanyRank ? `#${myCompanyRank}` : '--', sub: myCompanyRank ? (myRank?.tendencia === 'up' ? '▲ Subiendo' : myRank?.tendencia === 'down' ? '▼ Bajando' : '● Estable') : 'Aún sin clasificar', color: 'text-amber-500' },
            { label: 'Predicciones Hechas', value: predictions.length, sub: 'Total de marcadores ingresados', color: 'text-neutral-100' },
            { label: 'Aciertos Exactos', value: myRank?.exactos ?? predictions.filter(p => p.puntos === 3).length, sub: 'Marcadores idénticos (+3 pts)', color: 'text-emerald-500' },
          ].map(s => (
            <div key={s.label} className="glass-card p-5 xl:p-6 border border-neutral-800/80 rounded-2xl flex flex-col justify-between shadow-md">
              <span className="text-[10px] xl:text-xs font-black uppercase tracking-widest text-neutral-500">{s.label}</span>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className={`text-3xl xl:text-4xl font-mono font-black ${s.color}`}>{s.value}</span>
              </div>
              <span className="text-[10px] xl:text-xs text-neutral-500 mt-2">{s.sub}</span>
            </div>
          ))}
        </div>
      )}

      {/* Stats cards - Mobile Compact */}
      {user && (
        <div className="sm:hidden grid grid-cols-4 gap-1 bg-neutral-900/60 border border-neutral-850 p-3 rounded-2xl text-center shadow-md">
          {[
            { label: 'Pred', value: predictions.length, color: 'text-neutral-100' },
            { label: 'Pts', value: myRank?.puntos_totales ?? 0, color: 'text-yellow-500' },
            { label: 'Aciertos', value: myRank?.exactos ?? predictions.filter(p => p.puntos === 3).length, color: 'text-emerald-500' },
            { label: 'Posición', value: myCompanyRank ? `#${myCompanyRank}` : '--', color: 'text-amber-500' },
          ].map(s => (
            <div key={s.label} className="flex flex-col justify-center py-1">
              <span className="text-[9px] font-black uppercase tracking-wider text-neutral-500">{s.label}</span>
              <span className={`text-sm font-mono font-black mt-1 ${s.color}`}>{s.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Countdown */}
      <div className="countdown-scoreboard flex flex-col justify-between border border-yellow-500/25 rounded-3xl p-6 relative overflow-hidden group shadow-lg">
        <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/3 via-transparent to-transparent pointer-events-none" />
        <div className="countdown-header text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
          {countdownMatch ? (
            <span className="flex items-center gap-1.5 min-w-0">
              <span>PRÓXIMO PARTIDO:</span>
              <span className="flex items-center gap-1 min-w-0 truncate">
                {getTeamFlag(countdownMatch.local)} <span className="truncate">{countdownMatch.local}</span> vs {getTeamFlag(countdownMatch.visitante)} <span className="truncate">{countdownMatch.visitante}</span>
              </span>
            </span>
          ) : 'INICIO DEL MUNDIAL 2026'}
        </div>
        <div className="flex items-center justify-between gap-3 py-2 relative z-10">
          {[
            { label: 'DÍAS', value: kickoffTimeLeft.days },
            { label: 'HORAS', value: kickoffTimeLeft.hours },
            { label: 'MINS', value: kickoffTimeLeft.minutes },
            { label: 'SEGS', value: kickoffTimeLeft.seconds },
          ].map((item, idx) => (
            <div key={item.label} className="flex items-center gap-1 flex-1">
              <div className="flex flex-col items-center flex-1">
                <div className="countdown-digit-block w-full h-16 rounded-xl flex items-center justify-center font-mono font-black text-2xl select-none relative overflow-hidden group-hover:scale-105 transition-all duration-300">
                  <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-black/80 z-10" />
                  <span className="countdown-digit-value font-extrabold">{String(item.value).padStart(2, '0')}</span>
                </div>
                <span className="countdown-label text-[8.5px] font-black uppercase tracking-widest mt-1.5">{item.label}</span>
              </div>
              {idx < 3 && <span className="countdown-separator font-mono font-black text-xl select-none animate-pulse -translate-y-2">:</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Online Users */}
      {user && <OnlineUsers currentUserId={user.id} />}

      {/* Partidos de Hoy */}
      {todayMatches.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-yellow-500 animate-pulse" />
              <h3 className="text-sm xl:text-base font-black text-yellow-500 uppercase tracking-widest">
                Partidos de Hoy
              </h3>
              <span className="text-[9px] bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded-full font-mono font-black">
                {todayMatches.length} {todayMatches.length === 1 ? 'partido' : 'partidos'}
              </span>
            </div>
            <Link href="/partidos" className="text-[10px] xl:text-xs text-yellow-500 hover:text-yellow-400 font-bold uppercase tracking-wider transition">Ver todos →</Link>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {todayMatches.map(m => {
              const isEditableMatch = m.estado === 'live' || (m.estado === 'finished' && (() => {
                const finishedTime = m.stats?.finished_at 
                  ? new Date(m.stats.finished_at).getTime() 
                  : (m.updated_at ? new Date(m.updated_at).getTime() : 0);
                return finishedTime > 0 && (Date.now() - finishedTime <= GRACE_MS);
              })());

              return (
                <div key={m.id} className="flex flex-col gap-2">
                  <MatchCard match={m} prediction={predictions.find(p => p.match_id === m.id)}
                    compact={false} onBet={() => setBetModalMatch(m)} onClick={() => setInfoModalMatch(m)} />
                  {canEditMatches && isEditableMatch && (
                    <ScoreCorrectionPanel
                      match={m}
                      showToast={showToast}
                      onCorrected={updated => setMatches(prev => prev.map(x => x.id === updated.id ? updated : x))}
                      isSuperAdmin={user?.tipo === 'superadmin'}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Top 5 Leaderboard — filtered by company */}
      {leaderboard.length > 0 && user && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-black text-neutral-400 uppercase tracking-widest flex items-center gap-2">
              <Trophy className="w-3.5 h-3.5 text-yellow-500" /> Top 5 Ranking
              {activeCompanyId && (user.companies ?? []).length > 0 && (
                <span className="text-[9px] font-normal text-neutral-500 normal-case tracking-normal">
                  — {(user.companies ?? []).find((c: any) => c.id === activeCompanyId)?.nombre}
                </span>
              )}
            </h3>
            <div className="flex items-center gap-3">
              {user.companies && user.companies.length > 1 && (
                <select
                  value={selectedCompanyId ?? ''}
                  onChange={e => setSelectedCompanyId(Number(e.target.value))}
                  className="text-[10px] bg-neutral-900 border border-neutral-800 rounded-lg px-2 py-1 text-neutral-300 focus:border-yellow-500 outline-none">
                  {user.companies.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              )}
              <Link href="/ranking" className="text-[10px] text-yellow-500 hover:text-yellow-400 font-bold uppercase tracking-wider transition">Ver completo →</Link>
            </div>
          </div>
          <div className="glass-card border border-neutral-800/40 rounded-xl overflow-hidden shadow-xl">
            <div className="divide-y divide-neutral-900 text-sm">
              {companyLeaderboard.slice(0, 5).map((row, idx) => {
                const isMe = user?.id === row.user_id;
                return (
                  <div key={row.user_id} className={`flex items-center justify-between px-4 py-3 xl:px-6 xl:py-4 transition ${isMe ? 'bg-yellow-500/5 border-l-4 border-yellow-500 font-bold' : 'hover:bg-neutral-900/20'}`}>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-neutral-400 w-6 font-mono text-center text-xs xl:text-sm">#{idx + 1}</span>
                      <img src={(row.avatar && row.avatar !== 'null' && row.avatar !== 'undefined') ? row.avatar : 'https://stg00vm.blob.core.windows.net/jet00/default.webp'} onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = 'https://stg00vm.blob.core.windows.net/jet00/default.webp'; }}
                        className={`w-9 h-9 xl:w-11 xl:h-11 rounded-full border border-neutral-800 shadow object-cover ${(!row.avatar || row.avatar === 'null' || row.avatar === 'undefined' || row.avatar.includes('avatar_5.png') || row.avatar.includes('default.webp')) ? 'bg-white' : 'bg-neutral-950'}`} alt="avatar" />
                      <div className="text-neutral-200 text-xs xl:text-sm flex items-center gap-2 flex-wrap">
                        <span>{row.nombre}</span>
                        {isMe && <span className="bg-yellow-500 text-neutral-950 font-black text-[9px] px-1.5 py-0.5 rounded uppercase">Yo</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-extrabold text-sm xl:text-base text-neutral-100 font-mono">{row.puntos_totales} pts</div>
                      <div className="text-[10px] xl:text-xs text-neutral-500 font-mono">{row.exactos} exactos</div>
                    </div>
                  </div>
                );
              })}
              {companyLeaderboard.length === 0 && (
                <div className="p-6 text-center text-neutral-500 text-xs">Sin participantes en esta empresa.</div>
              )}
            </div>
          </div>
        </div>
      )}



      {/* Match Summary Modal (Bug 6) */}
      {summaryMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4" onClick={() => setSummaryMatch(null)}>
          <div className="glass-card border border-neutral-800/80 border-t-2 border-t-yellow-500 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5 animate-slide-in-up" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-yellow-500">{summaryMatch.fase}{summaryMatch.grupo ? ` · Grupo ${summaryMatch.grupo}` : ''}</span>
                <p className="text-[10px] text-neutral-500 mt-0.5">{new Date(summaryMatch.fecha).toLocaleString('es-BO', { timeZone: 'America/La_Paz', weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</p>
              </div>
              <button onClick={() => setSummaryMatch(null)} className="text-neutral-500 hover:text-neutral-300 p-1 transition">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center justify-around gap-4">
              <div className="flex flex-col items-center gap-2 flex-1">
                <span className="text-4xl">{getTeamFlag(summaryMatch.local)}</span>
                <span className="text-sm font-black text-neutral-100 text-center">{summaryMatch.local}</span>
                <span className="text-[9px] text-neutral-500 uppercase">Local</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="text-xl font-black text-neutral-600">VS</span>
                {summaryMatch.estado === 'live' && <span className="text-[9px] bg-red-500 text-white font-black px-2 py-0.5 rounded-full animate-pulse">EN VIVO</span>}
              </div>
              <div className="flex flex-col items-center gap-2 flex-1">
                <span className="text-4xl">{getTeamFlag(summaryMatch.visitante)}</span>
                <span className="text-sm font-black text-neutral-100 text-center">{summaryMatch.visitante}</span>
                <span className="text-[9px] text-neutral-500 uppercase">Visitante</span>
              </div>
            </div>
            {summaryMatch.transmision_enlaces && (
              <div className="bg-neutral-950/50 border border-neutral-850 rounded-xl p-3">
                <p className="text-[9px] font-black uppercase tracking-widest text-neutral-500 mb-1">¿Dónde ver?</p>
                <p className="text-xs text-neutral-300">{summaryMatch.transmision_enlaces}</p>
              </div>
            )}
            {predictions.find(p => p.match_id === summaryMatch.id) ? (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center">
                <p className="text-[10px] font-black text-emerald-400 uppercase">Tu pronóstico</p>
                <p className="text-lg font-black text-neutral-100 mt-1">
                  {predictions.find(p => p.match_id === summaryMatch.id)?.pred_local} – {predictions.find(p => p.match_id === summaryMatch.id)?.pred_visitante}
                </p>
              </div>
            ) : null}
            <button onClick={() => { setSummaryMatch(null); setBetModalMatch(summaryMatch); }}
              className="btn-primary-stitch w-full py-3 text-sm font-black tracking-wider uppercase">
              {predictions.find(p => p.match_id === summaryMatch.id) ? 'Ver / Editar Pronóstico' : 'Hacer Pronóstico'}
            </button>
          </div>
        </div>
      )}

      {betModalMatch && (
        <BetModal
          match={betModalMatch}
          user={user}
          existingPred={predictions.find(p => p.match_id === betModalMatch.id) ?? null}
          adminUsers={adminUsers}
          onSave={handleSavePrediction}
          onClose={() => setBetModalMatch(null)}
        />
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
