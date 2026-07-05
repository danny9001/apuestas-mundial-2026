'use client';

import { useEffect, useState, useRef } from 'react';
import { X, Trophy } from 'lucide-react';

interface RankRow {
  user_id: number;
  nombre: string;
  avatar?: string | null;
  puntos_totales: number;
  exactos?: number;
}

interface Props {
  leaderboard: RankRow[];
  currentUserId?: number;
}

const DEFAULT_AVATAR = 'https://stg00vm.blob.core.windows.net/jet00/default.webp';

function safeAvatar(url?: string | null) {
  if (!url || url === 'null' || url === 'undefined' || url.includes('avatar_5.png') || url.includes('default.webp')) return DEFAULT_AVATAR;
  return url;
}

const MEDAL = ['🥇', '🥈', '🥉', '', ''];
const GLOW = [
  'shadow-[0_0_28px_rgba(255,209,101,0.55)]',
  'shadow-[0_0_18px_rgba(203,213,225,0.4)]',
  'shadow-[0_0_16px_rgba(180,120,60,0.45)]',
  '',
  '',
];
const RING = [
  'ring-2 ring-yellow-400',
  'ring-2 ring-slate-300',
  'ring-2 ring-amber-600',
  'ring-1 ring-neutral-700',
  'ring-1 ring-neutral-700',
];
const PODIUM_H = ['h-24', 'h-16', 'h-12'];

export default function Top5Podium3D({ leaderboard, currentUserId }: Props) {
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const top5 = leaderboard.filter(r => r.puntos_totales > 0).slice(0, 5);

  useEffect(() => {
    if (top5.length === 0) return;
    const seen = sessionStorage.getItem('ep_podium_seen');
    if (seen) return;
    // pequeño delay para que el dashboard cargue primero
    const t = setTimeout(() => setVisible(true), 600);
    return () => clearTimeout(t);
  }, [top5.length]);

  useEffect(() => {
    if (!visible) return;
    timerRef.current = setTimeout(() => handleClose(), 8000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [visible]);

  function handleClose() {
    setClosing(true);
    setTimeout(() => {
      setVisible(false);
      setClosing(false);
      sessionStorage.setItem('ep_podium_seen', '1');
    }, 350);
  }

  if (!visible || top5.length === 0) return null;

  const [first, second, third] = top5;
  // orden visual del podio: 2-1-3
  const podiumOrder = [second, first, third].filter(Boolean);
  const podiumHeights = second && third ? [PODIUM_H[1], PODIUM_H[0], PODIUM_H[2]] : [PODIUM_H[0]];
  const podiumRanks = second && third ? [1, 0, 2] : [0];

  return (
    <div
      className={`fixed inset-0 z-[999] flex items-center justify-center p-4 transition-all duration-350 ${closing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
      style={{ background: 'rgba(10,10,12,0.88)', backdropFilter: 'blur(8px)' }}
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-sm bg-[#0e0e10] border border-yellow-500/20 rounded-3xl overflow-hidden shadow-2xl"
        style={{ boxShadow: '0 0 60px rgba(255,209,101,0.12)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative px-6 pt-6 pb-2 text-center">
          <div className="absolute inset-0 bg-gradient-to-b from-yellow-500/8 to-transparent pointer-events-none" />
          <div className="flex items-center justify-center gap-2 mb-1">
            <Trophy className="w-4 h-4 text-yellow-400" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-yellow-400">Ranking Mundial 2026</span>
            <Trophy className="w-4 h-4 text-yellow-400" />
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">Top 5</h2>
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-neutral-600 hover:text-neutral-300 transition p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 3D Podium — posiciones 1-2-3 */}
        <div className="px-6 pt-4 pb-2" style={{ perspective: '700px' }}>
          <div
            className="flex items-end justify-center gap-3"
            style={{ transform: 'rotateX(6deg)', transformStyle: 'preserve-3d' }}
          >
            {podiumOrder.map((row, i) => {
              const rank = podiumRanks[i] ?? i;
              const isMe = row?.user_id === currentUserId;
              if (!row) return null;
              return (
                <div key={row.user_id} className="flex flex-col items-center gap-2" style={{ transformStyle: 'preserve-3d' }}>
                  {/* Avatar */}
                  <div className={`relative ${rank === 0 ? 'w-16 h-16' : 'w-12 h-12'}`}>
                    <img
                      src={safeAvatar(row.avatar)}
                      onError={e => { e.currentTarget.src = DEFAULT_AVATAR; }}
                      alt={row.nombre}
                      className={`w-full h-full rounded-full object-cover border border-neutral-800 ${RING[rank]} ${GLOW[rank]} transition-all`}
                    />
                    <span className="absolute -top-1 -right-1 text-base leading-none">{MEDAL[rank]}</span>
                    {isMe && (
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[7px] font-black bg-yellow-400 text-neutral-950 px-1.5 py-0.5 rounded-full uppercase whitespace-nowrap">Tú</span>
                    )}
                  </div>

                  {/* Name + points */}
                  <div className="text-center">
                    <p className={`font-black text-white truncate max-w-[80px] ${rank === 0 ? 'text-sm' : 'text-xs'}`}>{row.nombre.split(' ')[0]}</p>
                    <p className={`font-mono font-black ${rank === 0 ? 'text-yellow-400 text-base' : 'text-neutral-400 text-xs'}`}>{row.puntos_totales}<span className="text-[9px] font-normal text-neutral-500 ml-0.5">pts</span></p>
                  </div>

                  {/* Podium block */}
                  <div
                    className={`w-full min-w-[70px] ${podiumHeights[i] ?? 'h-12'} rounded-t-xl flex items-center justify-center ${rank === 0 ? 'bg-gradient-to-b from-yellow-500/30 to-yellow-500/10 border border-yellow-500/30' : rank === 1 ? 'bg-gradient-to-b from-slate-400/20 to-slate-400/5 border border-slate-400/20' : 'bg-gradient-to-b from-amber-700/20 to-amber-700/5 border border-amber-700/20'}`}
                    style={{
                      boxShadow: rank === 0 ? '0 -4px 20px rgba(255,209,101,0.25)' : 'none',
                      transform: 'translateZ(4px)',
                    }}
                  >
                    <span className={`text-2xl font-black font-mono ${rank === 0 ? 'text-yellow-400/40' : 'text-neutral-600/50'}`}>#{rank + 1}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Posiciones 4 y 5 — fila horizontal compacta */}
        {top5.length > 3 && (
          <div className="mx-5 mb-5 mt-1 rounded-2xl border border-neutral-800/60 overflow-hidden divide-y divide-neutral-800/60 bg-neutral-950/60">
            {top5.slice(3).map((row, i) => {
              const rank = i + 3;
              const isMe = row.user_id === currentUserId;
              return (
                <div key={row.user_id} className={`flex items-center justify-between px-4 py-2.5 ${isMe ? 'bg-yellow-500/5' : ''}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-black font-mono text-neutral-500 w-5">#{rank + 1}</span>
                    <img
                      src={safeAvatar(row.avatar)}
                      onError={e => { e.currentTarget.src = DEFAULT_AVATAR; }}
                      alt={row.nombre}
                      className="w-7 h-7 rounded-full object-cover border border-neutral-800"
                    />
                    <span className="text-xs font-bold text-neutral-300 truncate max-w-[120px]">
                      {row.nombre}
                      {isMe && <span className="ml-1.5 text-[8px] font-black bg-yellow-400 text-neutral-950 px-1 py-0.5 rounded-full uppercase">Tú</span>}
                    </span>
                  </div>
                  <span className="text-xs font-black font-mono text-neutral-400">{row.puntos_totales} <span className="text-[9px] font-normal text-neutral-600">pts</span></span>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="px-6 pb-5 text-center">
          <p className="text-[10px] text-neutral-600">Toca en cualquier lugar para cerrar</p>
          <div className="mt-2 h-0.5 bg-neutral-900 rounded-full overflow-hidden">
            <div
              className="h-full bg-yellow-500/50 rounded-full"
              style={{ animation: 'shrink-bar 8s linear forwards' }}
            />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shrink-bar {
          from { width: 100%; }
          to   { width: 0%; }
        }
        .duration-350 { transition-duration: 350ms; }
      `}</style>
    </div>
  );
}
