'use strict';

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Trophy, Clock, Play, Calendar } from 'lucide-react';

// SplitFlap Character Animator Component
function SplitFlapChar({ char, delay }: { char: string; delay: number }) {
  const [displayChar, setDisplayChar] = useState(char);
  const [isFlipping, setIsFlipping] = useState(false);
  const prevCharRef = useRef(char);

  useEffect(() => {
    if (char !== prevCharRef.current) {
      setIsFlipping(true);
      const timer = setTimeout(() => {
        setDisplayChar(char);
        setIsFlipping(false);
        prevCharRef.current = char;
      }, 300); // match flip animation time
      return () => clearTimeout(timer);
    }
  }, [char]);

  return (
    <span
      className={`split-flap-cell w-[24px] h-[36px] text-lg text-amber-500 border border-zinc-800 bg-zinc-950 flex items-center justify-center font-mono select-none ${
        isFlipping ? 'split-flap-char' : ''
      }`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {displayChar}
    </span>
  );
}

// SplitFlap Text Component
function SplitFlapText({ text, length = 15 }: { text: string; length?: number }) {
  const paddedText = text.toUpperCase().padEnd(length, ' ').slice(0, length);
  
  return (
    <div className="flex gap-[2px]">
      {paddedText.split('').map((char, index) => (
        <SplitFlapChar key={index} char={char} delay={index * 30} />
      ))}
    </div>
  );
}

// Full mechanical Airport TV display
export default function AirportTVPage() {
  const [currentScreen, setCurrentScreen] = useState<'ranking' | 'live' | 'upcoming'>('ranking');
  const [time, setTime] = useState('');
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [goalAlert, setGoalAlert] = useState<any | null>(null);

  // Load Initial Data
  const fetchData = async () => {
    try {
      const lbRes = await fetch('/api/leaderboard');
      if (lbRes.ok) {
        const lbData = await lbRes.json();
        setLeaderboard(lbData);
      }

      const matchRes = await fetch('/api/matches');
      if (matchRes.ok) {
        const mData = await matchRes.json();
        setMatches(mData);
      }
    } catch (e) {
      console.error('Error fetching TV data:', e);
    }
  };

  useEffect(() => {
    fetchData();

    // Clock
    const timer = setInterval(() => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('es-ES', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    }, 1000);

    // Auto-cycling screens every 10 seconds
    const cycle = setInterval(() => {
      setCurrentScreen((prev) => {
        if (prev === 'ranking') return 'live';
        if (prev === 'live') return 'upcoming';
        return 'ranking';
      });
    }, 10000);

    // SSE Realtime Listening
    const sse = new EventSource('/api/realtime');
    
    sse.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'match') {
          // Update matches list
          setMatches((prev) =>
            prev.map((m) => (m.id === payload.data.id ? { ...m, ...payload.data } : m))
          );
        } else if (payload.type === 'leaderboard') {
          // Refetch rankings
          fetchData();
        } else if (payload.type === 'goal') {
          // Goal alert trigger
          setGoalAlert(payload.data);
          setTimeout(() => setGoalAlert(null), 6000); // 6s duration
        }
      } catch (err) {
        // Ignored parsed errors
      }
    };

    return () => {
      clearInterval(timer);
      clearInterval(cycle);
      sse.close();
    };
  }, []);

  const liveMatches = matches.filter((m) => m.estado === 'live');
  const upcomingMatches = matches.filter((m) => m.estado === 'upcoming');

  return (
    <main className="min-h-screen bg-black text-zinc-100 flex flex-col p-8 font-mono select-none overflow-hidden relative">
      
      {/* 1. ESPN Goal Alert Overlay */}
      {goalAlert && (
        <div className="absolute inset-0 bg-yellow-500/10 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-zinc-950 border-4 border-amber-500 p-8 rounded-2xl flex flex-col items-center gap-4 text-center max-w-lg shadow-[0_0_80px_rgba(234,179,8,0.8)] animate-bounce goal-effect">
            <span className="text-amber-500 text-7xl animate-pulse font-extrabold uppercase tracking-widest">¡GOOOL!</span>
            <div className="flex justify-between items-center gap-6 text-3xl font-black mt-2">
              <span className="text-zinc-100">{goalAlert.local}</span>
              <span className="bg-amber-500 text-zinc-950 px-4 py-2 rounded-lg font-mono">
                {goalAlert.goles_local} - {goalAlert.goles_visitante}
              </span>
              <span className="text-zinc-100">{goalAlert.visitante}</span>
            </div>
            <p className="text-zinc-400 text-lg uppercase tracking-wide mt-2">Marcador actualizado en vivo</p>
          </div>
        </div>
      )}

      {/* 2. HEADER */}
      <header className="border-b-4 border-zinc-800 pb-4 mb-6 flex justify-between items-end">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏆</span>
            <h1 className="text-3xl font-black text-amber-500 tracking-wider">APUESTAS MUNDIAL 2026</h1>
          </div>
          <div className="text-zinc-500 text-sm tracking-widest mt-1">TERMINAL INFORMATIVA - CICLO FLAP</div>
        </div>
        <div className="flex items-center gap-6">
          {/* Active Screen Indicator */}
          <div className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 px-4 py-2 rounded">
            <span className="text-zinc-500 text-xs uppercase tracking-widest">PANTALLA:</span>
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${currentScreen === 'ranking' ? 'bg-amber-500' : 'bg-zinc-800'}`}></span>
              <span className={`text-xs ${currentScreen === 'ranking' ? 'text-amber-500 font-bold' : 'text-zinc-500'}`}>LEADERBOARD</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${currentScreen === 'live' ? 'bg-red-500 animate-pulse' : 'bg-zinc-800'}`}></span>
              <span className={`text-xs ${currentScreen === 'live' ? 'text-red-500 font-bold' : 'text-zinc-500'}`}>LIVE GAMES</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${currentScreen === 'upcoming' ? 'bg-blue-500' : 'bg-zinc-800'}`}></span>
              <span className={`text-xs ${currentScreen === 'upcoming' ? 'text-blue-500 font-bold' : 'text-zinc-500'}`}>UPCOMING</span>
            </div>
          </div>

          {/* Time Clock */}
          <div className="flex items-center gap-3 bg-zinc-950 border border-zinc-800 px-5 py-2 rounded text-zinc-300 font-mono text-2xl font-bold tracking-widest text-amber-500">
            <Clock className="w-6 h-6 text-zinc-400" />
            <span>{time || '--:--:--'}</span>
          </div>
        </div>
      </header>

      {/* 3. SCREEN CONTENT */}
      <div className="flex-1 flex flex-col justify-start">
        
        {/* SCREEN A: GLOBAL RANKINGS (LEADERBOARD) */}
        {currentScreen === 'ranking' && (
          <div className="flex-1 flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <Trophy className="w-8 h-8 text-amber-500" />
              <h2 className="text-2xl font-black tracking-widest text-zinc-100">POSICIONES GENERALES (TOP 20)</h2>
            </div>

            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500 text-lg font-bold tracking-widest pb-3">
                  <th className="py-3 w-16">POS</th>
                  <th className="py-3 w-1/3">NOMBRE</th>
                  <th className="py-3 text-center w-24">PTS</th>
                  <th className="py-3 text-center w-32">EXACTOS</th>
                  <th className="py-3 text-center w-28">TENDENCIA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900 text-xl font-bold">
                {leaderboard.slice(0, 20).map((row, index) => (
                  <tr key={row.user_id} className="hover:bg-zinc-950/40">
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        {index === 0 && <span className="text-amber-500">🥇</span>}
                        {index === 1 && <span className="text-zinc-400">🥈</span>}
                        {index === 2 && <span className="text-amber-700">🥉</span>}
                        {index > 2 && <span className="text-zinc-500">#{index + 1}</span>}
                      </div>
                    </td>
                    <td className="py-4 font-mono">
                      <SplitFlapText text={row.nombre} length={20} />
                    </td>
                    <td className="py-4 text-center font-mono">
                      <div className="inline-block">
                        <SplitFlapText text={String(row.puntos_totales)} length={3} />
                      </div>
                    </td>
                    <td className="py-4 text-center font-mono">
                      <div className="inline-block">
                        <SplitFlapText text={String(row.exactos)} length={2} />
                      </div>
                    </td>
                    <td className="py-4 text-center font-mono">
                      <span className={`inline-flex items-center gap-1 text-lg ${
                        row.tendencia === 'up' ? 'text-green-500' : 
                        row.tendencia === 'down' ? 'text-red-500' : 'text-zinc-600'
                      }`}>
                        {row.tendencia === 'up' && '▲ SUBIÓ'}
                        {row.tendencia === 'down' && '▼ BAJÓ'}
                        {row.tendencia === 'same' && '● IGUAL'}
                      </span>
                    </td>
                  </tr>
                ))}
                {leaderboard.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-zinc-500 tracking-wider">Cargando clasificación...</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* SCREEN B: LIVE GAMES */}
        {currentScreen === 'live' && (
          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Play className="w-8 h-8 text-red-500 animate-pulse" />
                <h2 className="text-2xl font-black tracking-widest text-zinc-100">PARTIDOS EN VIVO (LIVE STREAM)</h2>
              </div>
              <div className="flex items-center gap-2 bg-red-950/30 border border-red-800/40 text-red-500 text-xs px-3 py-1 rounded tracking-widest font-black">
                <span className="h-2 w-2 rounded-full bg-red-500 live-dot"></span>
                <span>ESPN LIVESCORE</span>
              </div>
            </div>

            {liveMatches.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                {liveMatches.map((m) => (
                  <div key={m.id} className="bg-zinc-950 border border-zinc-800 rounded-xl p-8 flex flex-col justify-between hover:border-zinc-700 transition">
                    <div className="flex justify-between items-center text-zinc-400 text-sm tracking-widest pb-4 border-b border-zinc-900">
                      <span>{m.fase.toUpperCase()} - GRUPO {m.grupo}</span>
                      <span className="text-red-500 font-extrabold flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-red-500 live-dot"></span> EN JUEGO
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-8">
                      {/* Local */}
                      <div className="flex flex-col items-center gap-4 w-1/3">
                        <span className="text-6xl">⚽</span>
                        <div className="text-2xl font-black tracking-wider text-center">{m.local.toUpperCase()}</div>
                      </div>

                      {/* Score Flap */}
                      <div className="flex items-center gap-4 justify-center w-1/3">
                        <SplitFlapText text={String(m.goles_local)} length={1} />
                        <span className="text-3xl text-zinc-700 font-black font-sans">:</span>
                        <SplitFlapText text={String(m.goles_visitante)} length={1} />
                      </div>

                      {/* Visitante */}
                      <div className="flex flex-col items-center gap-4 w-1/3">
                        <span className="text-6xl">⚽</span>
                        <div className="text-2xl font-black tracking-wider text-center">{m.visitante.toUpperCase()}</div>
                      </div>
                    </div>

                    <div className="text-center text-zinc-500 text-xs tracking-wider">
                      RETRANSMITIENDO EN VIVO DESDE EL ESTADIO
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center py-20 border-2 border-dashed border-zinc-800 rounded-xl bg-zinc-950/20">
                <span className="text-5xl mb-4">🏟️</span>
                <p className="text-zinc-500 text-xl tracking-wider">NO HAY PARTIDOS EN JUEGO EN ESTE MOMENTO</p>
                <p className="text-zinc-600 text-sm mt-2">Consulta los próximos encuentros en el ciclo automático</p>
              </div>
            )}
          </div>
        )}

        {/* SCREEN C: UPCOMING MEETINGS */}
        {currentScreen === 'upcoming' && (
          <div className="flex-1 flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <Calendar className="w-8 h-8 text-blue-500" />
              <h2 className="text-2xl font-black tracking-widest text-zinc-100">PRÓXIMOS PARTIDOS DEL TORNEO</h2>
            </div>

            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500 text-lg font-bold tracking-widest pb-3">
                  <th className="py-3 w-1/4">FECHA Y HORA</th>
                  <th className="py-3 text-center">LOCAL</th>
                  <th className="py-3 text-center w-24">VS</th>
                  <th className="py-3 text-center">VISITANTE</th>
                  <th className="py-3 text-right">GRUPO / FASE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900 text-xl font-bold">
                {upcomingMatches.slice(0, 10).map((m) => (
                  <tr key={m.id} className="hover:bg-zinc-950/40">
                    <td className="py-5 text-zinc-400 font-mono">
                      {new Date(m.fecha).toLocaleString('es-ES', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-5 text-center uppercase tracking-wider text-zinc-100">
                      {m.local}
                    </td>
                    <td className="py-5 text-center text-zinc-600">
                      VS
                    </td>
                    <td className="py-5 text-center uppercase tracking-wider text-zinc-100">
                      {m.visitante}
                    </td>
                    <td className="py-5 text-right text-zinc-500 uppercase tracking-widest text-sm">
                      {m.fase} - GRP {m.grupo}
                    </td>
                  </tr>
                ))}
                {upcomingMatches.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-zinc-500 tracking-wider">NO HAY PRÓXIMOS PARTIDOS PROGRAMADOS</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* 4. FOOTER */}
      <footer className="border-t border-zinc-900 pt-4 mt-6 flex justify-between items-center text-zinc-600 text-xs">
        <div>APUESTAS MUNDIAL 2026 - MODO PANTALLA COMPLETA ESTILO AEROPUERTO</div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-green-500">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500"></span> REALTIME ONLINE
          </span>
          <span>ACTUALIZACIÓN AUTOMÁTICA EN DIRECTO (SSE)</span>
        </div>
      </footer>
    </main>
  );
}
