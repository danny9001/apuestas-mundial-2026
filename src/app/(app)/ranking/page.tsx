'use client';

import { useEffect, useState } from 'react';
import { Trophy, Building2, RefreshCw, ArrowUp, ArrowDown, Circle, X } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { getTeamFlag } from '@/lib/constants';

export default function RankingPage() {
  const { user, handleIdentityLogin } = useApp();
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rankingFilter, setRankingFilter] = useState<'participantes' | 'visores'>('participantes');
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [companySelectModal, setCompanySelectModal] = useState(false);
  const [tinkasoStatsModal, setTinkasoStatsModal] = useState(false);
  const [tinkasoStats, setTinkasoStats] = useState<any[]>([]);
  const [tinkasoLoading, setTinkasoLoading] = useState(false);
  const [winnersData, setWinnersData] = useState<{ champion: string | null; tinkasoWinners: any[] } | null>(null);

  const loadTinkasoData = async () => {
    setTinkasoLoading(true);
    try {
      const res = await fetch(`/api/tincaso/stats?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setTinkasoStats(data.stats || []);
      }
    } catch (e) {
      console.error('Error fetching tincaso stats:', e);
    } finally {
      setTinkasoLoading(false);
    }
  };

  const fetchTinkasoStats = async () => {
    setTinkasoStatsModal(true);
    await loadTinkasoData();
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [lRes, cRes, wRes] = await Promise.all([
          fetch(`/api/leaderboard?t=${Date.now()}`),
          fetch(`/api/companies?t=${Date.now()}`),
          fetch(`/api/winners?t=${Date.now()}`),
        ]);
        if (lRes.ok) setLeaderboard(await lRes.json());
        if (cRes.ok) setCompanies(await cRes.json());
        if (wRes.ok) setWinnersData(await wRes.json());
      } catch {}
      setLoading(false);
    })();
    // Pre-load Tinkaso stats silently (desktop panel, no modal)
    loadTinkasoData();
  }, []);

  const availableCompanies = !user ? [] : user.tipo === 'superadmin' ? companies : (user.companies || []);

  useEffect(() => {
    if (availableCompanies.length > 0 && !selectedCompanyId) setSelectedCompanyId(availableCompanies[0].id);
  }, [availableCompanies.length]);

  const filteredLeaderboard = leaderboard.filter(row => {
    if (rankingFilter === 'participantes' && row.participa === false) return false;
    if (rankingFilter === 'visores' && row.participa !== false) return false;
    if (rankingFilter === 'visores') return true;
    if (!selectedCompanyId) return false;
    return (row.companies || []).some((c: any) => c.id === selectedCompanyId);
  });

  const selectedCompany = availableCompanies.find((c: any) => c.id === selectedCompanyId);

  if (!user) {
    return (
      <div className="w-full max-w-md mx-auto bg-neutral-900/55 backdrop-blur-md border border-neutral-800 rounded-3xl p-8 shadow-2xl relative z-10 animate-fade-in my-8 text-center flex flex-col items-center">
        <div className="h-16 w-16 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl flex items-center justify-center text-4xl mb-4 shadow-inner animate-pulse">🔒</div>
        <h2 className="text-xl font-black text-neutral-100 uppercase tracking-wider">Acceso Restringido</h2>
        <p className="text-neutral-400 text-sm mt-2">La clasificación está reservada exclusivamente para participantes registrados.</p>
        <button onClick={handleIdentityLogin} className="w-full btn-primary-stitch py-3.5 text-sm transition tracking-wider uppercase mt-6">
          Ingresar con ElitePass Identity
        </button>
      </div>
    );
  }

  if (availableCompanies.length === 0) {
    return (
      <div className="text-center py-12 max-w-md mx-auto bg-neutral-900/20 border border-neutral-800/40 rounded-3xl p-8">
        <div className="text-4xl mb-4">🏢</div>
        <h3 className="text-base font-bold text-neutral-300">Sin Empresa Asignada</h3>
        <p className="text-neutral-500 text-xs mt-2">Tu usuario no tiene ninguna empresa asignada. Por favor, solicita a un administrador que te asigne a tu empresa para ver el ranking.</p>
      </div>
    );
  }

  const monto = parseFloat(selectedCompany?.monto_participacion) || 150;
  const participantesCount = leaderboard.filter(row => {
    if (row.participa === false) return false;
    if (!selectedCompanyId) return false;
    return (row.companies || []).some((c: any) => c.id === selectedCompanyId);
  }).length;

  return (
    <section className="space-y-6 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      <div className="lg:col-span-2 space-y-6">
      {/* Filter toggle */}
      <div className="flex justify-center">
        <div className="bg-neutral-900 border border-neutral-800 p-1 rounded-full flex gap-1">
          {(['participantes', 'visores'] as const).map(f => (
            <button key={f} onClick={() => setRankingFilter(f)}
              className={`px-6 py-2 rounded-full text-xs font-black uppercase tracking-wider transition ${rankingFilter === f ? 'bg-yellow-500 text-black' : 'text-neutral-500 hover:text-neutral-300'}`}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          <h2 className="text-lg font-black tracking-wider text-neutral-100 uppercase">Clasificación General</h2>
        </div>
        <span className="bg-neutral-900 border border-neutral-800 text-neutral-400 text-xs px-2.5 py-1 rounded-lg font-mono">
          {filteredLeaderboard.length} Jugadores
        </span>
      </div>

      {/* Company selector */}
      {availableCompanies.length > 0 && (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Building2 className="w-4 h-4 text-neutral-400 flex-shrink-0" />
            <span className="text-xs font-black uppercase tracking-wider text-neutral-400">Equipo:</span>
            {selectedCompany && <span className="text-xs font-black text-neutral-100 truncate">{selectedCompany.nombre}</span>}
          </div>
          {availableCompanies.length > 1 && (
            <button onClick={() => setCompanySelectModal(true)}
              className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl border border-yellow-500/30 text-yellow-500 bg-yellow-500/5 hover:bg-yellow-500/10 transition flex-shrink-0">
              <RefreshCw className="w-3 h-3" /> Cambiar
            </button>
          )}
        </div>
      )}

      {/* Pozo & Tinkaso Button */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {participantesCount > 0 && (
          <div className="bg-gradient-to-r from-yellow-500/10 to-amber-600/5 border border-yellow-500/25 rounded-2xl p-4 flex items-center justify-between shadow-[0_0_20px_rgba(255,209,101,0.05)]">
            <div>
              <div className="text-[10px] text-neutral-400 uppercase tracking-widest font-bold">Pozo Acumulado</div>
              <div className="text-2xl font-black text-yellow-500 font-mono mt-0.5">
                Bs. {(participantesCount * monto).toLocaleString('es-BO', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-neutral-500 mt-0.5">{participantesCount} participantes × Bs. {monto.toLocaleString('es-BO')}</div>
            </div>
            <div className="text-4xl">🏆</div>
          </div>
        )}
        <button onClick={() => fetchTinkasoStats()}
          className="lg:hidden bg-neutral-900/50 border border-neutral-800 hover:border-yellow-500/30 rounded-2xl p-4 flex items-center justify-between shadow-md transition group text-left">
          <div>
            <div className="text-[10px] text-neutral-400 uppercase tracking-widest font-bold">Tinkaso Stats</div>
            <div className="text-lg font-black text-neutral-100 mt-1 group-hover:text-yellow-500 transition">¿Quién ganará el Mundial?</div>
            <div className="text-[10px] text-neutral-500 mt-0.5">Estadísticas y equipos más votados</div>
          </div>
          <div className="text-3xl group-hover:scale-110 transition duration-300">📊</div>
        </button>
      </div>

      {/* Podium */}
      <div className="grid grid-cols-3 gap-4 pt-2">
        {filteredLeaderboard[1] && (
          <div className="glass-card rounded-xl p-4 text-center flex flex-col items-center justify-between order-1 shadow-md">
            <div className="text-3xl">🥈</div>
            <div className="text-xs font-bold text-neutral-300 truncate w-full mt-2">{filteredLeaderboard[1].nombre}</div>
            <div className="text-amber-500 font-extrabold text-base font-mono mt-1">{filteredLeaderboard[1].puntos_totales} pts</div>
            <div className="text-[10px] text-neutral-500 font-mono mt-0.5">{filteredLeaderboard[1].exactos} exactos</div>
          </div>
        )}
        {filteredLeaderboard[0] && (
          <div className="glass-card border-2 border-yellow-500/50 rounded-xl p-5 text-center flex flex-col items-center justify-between order-2 relative shadow-[0_0_24px_rgba(255,209,101,0.2)] scale-105">
            <span className="absolute top-[-10px] bg-yellow-500 text-[#0e0e10] text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow">Líder</span>
            <div className="text-4xl animate-bounce">🥇</div>
            <div className="text-sm font-black text-neutral-100 truncate w-full mt-2">{filteredLeaderboard[0].nombre}</div>
            <div className="text-yellow-500 font-black text-lg font-mono mt-1">{filteredLeaderboard[0].puntos_totales} pts</div>
            <div className="text-[10px] text-neutral-400 font-mono mt-0.5">{filteredLeaderboard[0].exactos} exactos</div>
          </div>
        )}
        {filteredLeaderboard[2] && (
          <div className="glass-card rounded-xl p-4 text-center flex flex-col items-center justify-between order-3 shadow-md">
            <div className="text-3xl">🥉</div>
            <div className="text-xs font-bold text-neutral-300 truncate w-full mt-2">{filteredLeaderboard[2].nombre}</div>
            <div className="text-amber-700 font-extrabold text-base font-mono mt-1">{filteredLeaderboard[2].puntos_totales} pts</div>
            <div className="text-[10px] text-neutral-500 font-mono mt-0.5">{filteredLeaderboard[2].exactos} exactos</div>
          </div>
        )}
      </div>

      {/* ── Panel Campeón Mundial ── */}
      {rankingFilter === 'participantes' && winnersData?.champion && (
        <div className="rounded-2xl border border-yellow-500/40 bg-gradient-to-br from-yellow-500/10 via-amber-500/5 to-transparent p-5 space-y-4 shadow-[0_0_30px_rgba(255,209,101,0.08)]">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏆</span>
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-yellow-500">Campeón Mundial 2026</div>
              <div className="text-xl font-black text-neutral-100 flex items-center gap-2">
                {getTeamFlag(winnersData.champion)} {winnersData.champion}
              </div>
            </div>
          </div>

          {winnersData.tinkasoWinners.length > 0 && (
            <div className="space-y-2">
              <div className="text-[9px] font-black uppercase tracking-widest text-neutral-400">
                Acertaron el Tinkaso ({winnersData.tinkasoWinners.length} jugador{winnersData.tinkasoWinners.length !== 1 ? 'es' : ''}) — +5 pts bonus
              </div>
              <div className="space-y-1.5">
                {winnersData.tinkasoWinners.map((w: any) => (
                  <div key={w.id} className="flex items-center justify-between bg-yellow-500/5 border border-yellow-500/15 rounded-xl px-3 py-2">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={(w.avatar && w.avatar !== 'null' && w.avatar !== 'undefined') ? w.avatar : 'https://stg00vm.blob.core.windows.net/jet00/default.webp'}
                        onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = 'https://stg00vm.blob.core.windows.net/jet00/default.webp'; }}
                        className="w-8 h-8 rounded-full border border-yellow-500/30 object-cover"
                        alt="avatar"
                      />
                      <div>
                        <div className="text-xs font-bold text-neutral-100">{w.nombre}</div>
                        <div className="text-[9px] text-neutral-500 font-mono">#{w.posicion} · {w.exactos} exactos</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-black text-yellow-500 font-mono">{w.puntos_totales} pts</div>
                      <div className="text-[9px] text-green-400 font-black">✅ +5 bonus</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {winnersData.tinkasoWinners.length === 0 && (
            <p className="text-xs text-neutral-500 text-center py-2">Ningún participante acertó el Tinkaso.</p>
          )}
        </div>
      )}

      {/* Full ranking table */}
      <div className="glass-card border border-neutral-800/40 rounded-xl overflow-hidden mt-6 shadow-2xl">
        <div className="divide-y divide-neutral-900 text-sm">
          {filteredLeaderboard.map((row, index) => {
            const isMe = user?.id === row.user_id;
            return (
              <div key={row.user_id} className={`flex items-center justify-between p-5 transition ${isMe ? 'bg-yellow-500/5 border-l-4 border-yellow-500 font-bold' : 'hover:bg-neutral-900/20'}`}>
                <div className="flex items-center gap-4">
                  <span className="font-bold text-neutral-400 w-6 font-mono text-center">#{index + 1}</span>
                  <div className="flex items-center gap-3">
                    <img src={(row.avatar && row.avatar !== 'null' && row.avatar !== 'undefined') ? row.avatar : 'https://stg00vm.blob.core.windows.net/jet00/default.webp'} onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = 'https://stg00vm.blob.core.windows.net/jet00/default.webp'; }}
                      className={`w-10 h-10 rounded-full border border-neutral-800 shadow object-cover ${(!row.avatar || row.avatar === 'null' || row.avatar === 'undefined' || row.avatar.includes('avatar_5.png') || row.avatar.includes('default.webp')) ? 'bg-white' : 'bg-neutral-950'}`} alt="avatar" />
                    <div className="text-neutral-200 text-sm flex items-center gap-2 flex-wrap">
                      <span>{row.nombre}</span>
                      {isMe && <span className="bg-yellow-500 text-[#0e0e10] font-black text-[9px] px-1 rounded uppercase">Yo</span>}
                      {(row.companies || []).map((c: any) => (
                        <span key={c.id} className="text-[9px] px-2 py-0.5 rounded-full border font-bold"
                          style={{ color: c.color, borderColor: c.color + '40', backgroundColor: c.color + '18' }}>{c.nombre}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="font-extrabold text-sm text-neutral-100 font-mono">{row.puntos_totales} pts</div>
                    <div className="text-[10px] text-neutral-500 font-mono">{row.exactos} exactos</div>
                  </div>
                  <div className="w-12 flex justify-center">
                    {row.tendencia === 'up' && <span className="flex items-center gap-0.5 text-green-500 text-xs font-black"><ArrowUp className="w-3.5 h-3.5" /> ▲</span>}
                    {row.tendencia === 'down' && <span className="flex items-center gap-0.5 text-red-500 text-xs font-black animate-pulse"><ArrowDown className="w-3.5 h-3.5" /> ▼</span>}
                    {row.tendencia === 'same' && <span className="text-neutral-400 text-[10px]"><Circle className="w-2.5 h-2.5" /></span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      </div>

      {/* Desktop: Tinkaso Panel — siempre visible, columna derecha */}
      <div className="hidden lg:flex flex-col sticky top-4">
        <div className="glass-card border border-neutral-800/40 rounded-2xl p-5 space-y-5">
          <div className="flex items-center gap-2 pb-2 border-b border-neutral-850">
            <span className="text-lg">📊</span>
            <h3 className="text-sm font-black uppercase tracking-wider text-neutral-100">Tinkaso Stats</h3>
          </div>

          {tinkasoLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-500"></div>
            </div>
          ) : (
            <div className="space-y-3.5 max-h-[60vh] overflow-y-auto pr-1">
              {tinkasoStats.length === 0 ? (
                <p className="text-center text-xs text-neutral-500 py-6">Aún no hay votos registrados para el Tinkaso.</p>
              ) : (
                tinkasoStats.map((stat, idx) => (
                  <div key={stat.team} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-neutral-500 w-5">#{idx + 1}</span>
                        <span className="text-sm">{getTeamFlag(stat.team)}</span>
                        <span className="font-bold text-neutral-200">{stat.team}</span>
                      </div>
                      <span className="font-mono font-bold text-yellow-500">{stat.percentage}%</span>
                    </div>
                    <div className="w-full bg-neutral-900 rounded-full h-2 overflow-hidden border border-neutral-850">
                      <div className="bg-gradient-to-r from-yellow-500 to-amber-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${stat.percentage}%` }} />
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          <div className="text-[10px] text-neutral-500 text-center pt-2">
            Los porcentajes se calculan en base a todos los usuarios con Tinkaso registrado.
          </div>
        </div>
      </div>

      {/* Company select modal */}
      {companySelectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setCompanySelectModal(false)}>
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-black uppercase text-neutral-100">Seleccionar Empresa</h3>
            <div className="space-y-2">
              {availableCompanies.map((c: any) => (
                <button key={c.id} onClick={() => { setSelectedCompanyId(c.id); setCompanySelectModal(false); }}
                  className={`w-full text-left px-4 py-3 rounded-xl border text-xs font-bold transition ${selectedCompanyId === c.id ? 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400' : 'border-neutral-800 hover:border-neutral-700 text-neutral-300'}`}>
                  {c.nombre}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tinkaso Stats Modal */}
      {tinkasoStatsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setTinkasoStatsModal(false)}>
          <div className="bg-neutral-950 border border-neutral-850 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center pb-2 border-b border-neutral-850">
              <div className="flex items-center gap-2">
                <span className="text-lg">📊</span>
                <h3 className="text-sm font-black uppercase tracking-wider text-neutral-100">Equipos más votados (Tinkaso)</h3>
              </div>
              <button onClick={() => setTinkasoStatsModal(false)} className="text-neutral-500 hover:text-neutral-300 p-1 transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            {tinkasoLoading ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-500"></div>
              </div>
            ) : (
              <div className="space-y-3.5 max-h-[60vh] overflow-y-auto pr-1">
                {tinkasoStats.length === 0 ? (
                  <p className="text-center text-xs text-neutral-500 py-6">Aún no hay votos registrados para el Tinkaso.</p>
                ) : (
                  tinkasoStats.map((stat, idx) => (
                    <div key={stat.team} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-neutral-500 w-5">#{idx + 1}</span>
                          <span className="text-sm">{getTeamFlag(stat.team)}</span>
                          <span className="font-bold text-neutral-200">{stat.team}</span>
                        </div>
                        <span className="font-mono font-bold text-yellow-500">{stat.percentage}%</span>
                      </div>
                      <div className="w-full bg-neutral-900 rounded-full h-2 overflow-hidden border border-neutral-850">
                        <div className="bg-gradient-to-r from-yellow-500 to-amber-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${stat.percentage}%` }} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
            
            <div className="text-[10px] text-neutral-500 text-center pt-2">
              Los porcentajes se calculan en base a todos los usuarios con Tinkaso registrado.
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
