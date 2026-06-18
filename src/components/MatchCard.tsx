'use client';

import React from 'react';
import { getTeamFlag } from '@/lib/constants';
import { useApp } from '@/contexts/AppContext';

interface MatchCardProps {
  match: any;
  prediction?: { pred_local: number; pred_visitante: number; puntos?: number | null } | null;
  compact?: boolean;
  onBet?: (match: any) => void;
  onClick?: (match: any) => void;
}

export default function MatchCard({ match: m, prediction: myPred, compact = true, onBet, onClick }: MatchCardProps) {
  const { predictionCloseMinutes } = useApp();
  const isClosed = m.estado !== 'upcoming' || new Date().getTime() >= new Date(m.fecha).getTime() - predictionCloseMinutes * 60 * 1000;

  if (compact) {
    return (
      <div
        onClick={() => onClick?.(m)}
        className={`bg-neutral-900 border ${m.estado === 'live' ? 'border-red-500 bg-red-500/5 shadow-[0_0_15px_rgba(239,68,68,0.12)]' : 'border-neutral-800 hover:border-neutral-600'} rounded-xl px-4 py-2 flex flex-col justify-between transition cursor-pointer relative`}
      >
        {/* Top Header Row */}
        <div className="flex items-center justify-between w-full border-b border-neutral-800/40 pb-1.5 mb-1.5 text-[9px] font-semibold text-neutral-400">
          <div className="flex items-center gap-1.5 min-w-0 truncate">
            <span className={`text-[8px] font-extrabold uppercase px-1 py-0.2 rounded font-mono flex-shrink-0 ${m.estado === 'live' ? 'bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse' : 'bg-neutral-800 text-neutral-350'}`}>
              {m.estado === 'live' ? 'VIVO' : `G${m.grupo}`}
            </span>
            <span className="truncate">{m.fase}</span>
            <span className="text-neutral-500 font-mono flex-shrink-0">•</span>
            <span className="text-neutral-500 font-mono flex-shrink-0">
              {m.estado === 'upcoming'
                ? new Date(m.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                : m.estado === 'live'
                  ? (m.stats?.time ? `⏱️ ${m.stats.time}${m.stats.extra_time ? ` (${m.stats.extra_time})` : ''}` : 'Jugándose')
                  : 'Finalizado'}
            </span>
          </div>
          {m.estado === 'live' && (
            <span className="text-red-500 font-black flex items-center gap-0.5 animate-pulse text-[8px]">
              <span className="h-1 w-1 rounded-full bg-red-500 live-dot"></span> EN VIVO
            </span>
          )}
        </div>

        {/* Bottom Body Row */}
        <div className="flex items-center justify-between w-full gap-3">
          <div className="flex items-center justify-center gap-1.5 flex-grow min-w-0 text-xs font-bold text-neutral-100">
            <div className="flex items-center gap-1 min-w-0 flex-1 justify-end">
              <span className="uppercase text-[9px] sm:text-[10px] font-black text-neutral-100 text-right leading-none truncate">{m.local}</span>
              <span className="text-base select-none flex-shrink-0">{getTeamFlag(m.local)}</span>
            </div>
            <div className="px-1.5 py-0.5 bg-neutral-950 border border-neutral-800 rounded font-mono text-[10px] sm:text-[11px] font-black text-center min-w-[36px] sm:min-w-[42px] flex-shrink-0 text-neutral-100">
              {m.estado !== 'upcoming' ? `${m.goles_local}-${m.goles_visitante}` : 'VS'}
            </div>
            <div className="flex items-center gap-1 min-w-0 flex-1 justify-start">
              <span className="text-base select-none flex-shrink-0">{getTeamFlag(m.visitante)}</span>
              <span className="uppercase text-[9px] sm:text-[10px] font-black text-neutral-100 text-left leading-none truncate">{m.visitante}</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 text-right flex-shrink-0" onClick={e => e.stopPropagation()}>
            {myPred ? (
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <div className="flex flex-col items-end flex-shrink-0">
                  <span className="text-[8px] text-neutral-500 font-semibold leading-none mb-0.5">Mi apuesta</span>
                  <span className="font-extrabold text-neutral-100 text-xs font-mono leading-none">{myPred.pred_local} - {myPred.pred_visitante}</span>
                </div>
                {!isClosed && (
                  <button onClick={() => onBet?.(m)} className="text-[9px] font-black text-yellow-500 hover:text-yellow-400 uppercase tracking-wider ml-1">
                    Editar
                  </button>
                )}
              </div>
            ) : isClosed ? (
              <span className="text-[9px] text-neutral-500 font-medium italic">Sin apuesta</span>
            ) : (
              <button onClick={() => onBet?.(m)} className="btn-primary-stitch px-2.5 py-1 text-[9px] tracking-wider uppercase flex-shrink-0">
                Apostar
              </button>
            )}
            {isClosed && myPred && myPred.puntos !== null && myPred.puntos !== undefined && (
              <span className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-1 py-0.5 rounded text-[8px] font-black font-mono flex-shrink-0">
                +{myPred.puntos}P
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`match-card-stitch p-5 shadow-lg flex flex-col justify-between gap-4 cursor-pointer relative transition-all duration-300 hover:scale-[1.02] ${m.estado === 'live' ? 'match-card-live-stitch border-2 border-red-500 bg-red-500/5 shadow-[0_0_25px_rgba(239,68,68,0.25)]' : ''}`}
      onClick={() => onClick?.(m)}
    >
      <div className="flex justify-between items-center border-b border-neutral-800/40 pb-3 text-[11px] font-bold tracking-wider text-neutral-400" onClick={e => e.stopPropagation()}>
        <span className="font-extrabold">{m.fase.toUpperCase()} - GRP {m.grupo}</span>
        {m.estado === 'live' && (
          <span className="text-red-500 font-black flex items-center gap-1 text-[10px] animate-pulse">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500 live-dot"></span>
            <span>EN VIVO {m.stats?.time ? `(${m.stats.time}${m.stats.extra_time ? ` ${m.stats.extra_time}` : ''})` : ''}</span>
          </span>
        )}
        {m.estado === 'finished' && <span className="text-neutral-500 font-semibold uppercase text-[10px]">FINALIZADO</span>}
        {m.estado === 'upcoming' && <span className="text-neutral-500 font-semibold text-[10px]">{new Date(m.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>}
      </div>

      <div className="flex flex-col gap-3 py-1">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xl select-none flex-shrink-0">{getTeamFlag(m.local)}</span>
            <span className={`font-black text-neutral-100 uppercase truncate ${m.estado === 'live' ? 'text-base' : 'text-sm'}`}>{m.local}</span>
          </div>
          {m.estado !== 'upcoming' && <span className={`font-black font-mono text-neutral-100 ${m.estado === 'live' ? 'text-xl text-red-500' : 'text-base'}`}>{m.goles_local}</span>}
        </div>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xl select-none flex-shrink-0">{getTeamFlag(m.visitante)}</span>
            <span className={`font-black text-neutral-100 uppercase truncate ${m.estado === 'live' ? 'text-base' : 'text-sm'}`}>{m.visitante}</span>
          </div>
          {m.estado !== 'upcoming' && <span className={`font-black font-mono text-neutral-100 ${m.estado === 'live' ? 'text-xl text-red-500' : 'text-base'}`}>{m.goles_visitante}</span>}
        </div>
      </div>

      <div className="flex justify-between items-center border-t border-neutral-800/40 pt-3 text-xs" onClick={e => e.stopPropagation()}>
        {myPred ? (
          <div className="flex items-center justify-between w-full">
            <div className="flex flex-col">
              <span className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider">Mi apuesta</span>
              <span className="font-black text-neutral-150 text-sm font-mono mt-0.5">{myPred.pred_local} - {myPred.pred_visitante}</span>
            </div>
            <div className="flex items-center gap-2">
              {isClosed ? (
                <span className="text-[9px] text-neutral-500 font-semibold uppercase tracking-wider italic">Apuestas Cerradas</span>
              ) : (
                <button onClick={() => onBet?.(m)} className="text-[10px] font-black text-yellow-500 hover:text-yellow-400 uppercase tracking-wider">Editar</button>
              )}
              {isClosed && myPred.puntos !== null && myPred.puntos !== undefined && (
                <span className="bg-yellow-500 text-neutral-950 font-black px-2.5 py-1 rounded text-[10px] font-mono shadow-[0_0_12px_rgba(234,179,8,0.2)]">+{myPred.puntos} PTS</span>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full">
            <span className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider">Sin apuesta registrada</span>
            {isClosed
              ? <span className="text-[9px] text-red-500/80 font-black uppercase tracking-wider">Apuesta Cerrada</span>
              : <button onClick={() => onBet?.(m)} className="btn-primary-stitch px-3.5 py-1.5 text-[9.5px] tracking-wider uppercase font-black">Apostar</button>
            }
          </div>
        )}
      </div>
    </div>
  );
}
