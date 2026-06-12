'use client';

import React from 'react';
import { getTeamFlag } from '@/lib/constants';

interface MatchCardProps {
  match: any;
  prediction?: { pred_local: number; pred_visitante: number; puntos?: number | null } | null;
  compact?: boolean;
  onBet?: (match: any) => void;
  onClick?: (match: any) => void;
}

export default function MatchCard({ match: m, prediction: myPred, compact = true, onBet, onClick }: MatchCardProps) {
  const isClosed = m.estado !== 'upcoming' || new Date().getTime() >= new Date(m.fecha).getTime() - 60 * 60 * 1000;

  if (compact) {
    return (
      <div
        onClick={() => onClick?.(m)}
        className={`bg-neutral-900/50 hover:bg-neutral-900 border ${m.estado === 'live' ? 'border-red-500/40 bg-red-950/5 shadow-[0_0_15px_rgba(239,68,68,0.08)]' : 'border-neutral-850 hover:border-neutral-700/60'} rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 transition cursor-pointer relative`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded font-mono flex-shrink-0 ${m.estado === 'live' ? 'bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse' : 'bg-neutral-800/80 text-neutral-400'}`}>
            {m.estado === 'live' ? 'VIVO' : `G${m.grupo}`}
          </span>
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-bold text-neutral-355 truncate">{m.fase}</span>
            <span className="text-[9px] text-neutral-500 font-mono truncate">
              {m.estado === 'upcoming' ? new Date(m.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : m.estado === 'live' ? 'Jugándose' : 'Finalizado'}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-1.5 flex-grow-[2] min-w-0 text-xs font-bold text-neutral-200">
          <div className="flex items-center gap-1 min-w-0 flex-1 justify-end">
            <span className="uppercase text-[9px] sm:text-[10px] font-black text-neutral-100 text-right leading-tight break-words">{m.local}</span>
            <span className="text-base select-none flex-shrink-0">{getTeamFlag(m.local)}</span>
          </div>
          <div className="px-2 py-0.5 bg-neutral-950/95 border border-neutral-850 rounded font-mono text-[11px] font-black text-center min-w-[38px] flex-shrink-0">
            {m.estado !== 'upcoming' ? `${m.goles_local}-${m.goles_visitante}` : 'VS'}
          </div>
          <div className="flex items-center gap-1 min-w-0 flex-1 justify-start">
            <span className="text-base select-none flex-shrink-0">{getTeamFlag(m.visitante)}</span>
            <span className="uppercase text-[9px] sm:text-[10px] font-black text-neutral-100 text-left leading-tight break-words">{m.visitante}</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 text-right flex-shrink-0" onClick={e => e.stopPropagation()}>
          {myPred ? (
            <div className="flex flex-col items-end flex-shrink-0">
              <span className="text-[9px] text-neutral-500 font-medium">Mi apuesta</span>
              <span className="font-bold text-neutral-200 text-xs font-mono">{myPred.pred_local} - {myPred.pred_visitante}</span>
            </div>
          ) : isClosed ? (
            <span className="text-[9px] text-neutral-500 italic">Sin apuesta</span>
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
    );
  }

  return (
    <div
      className={`match-card-stitch p-5 shadow-lg flex flex-col justify-between gap-4 cursor-pointer relative ${m.estado === 'live' ? 'match-card-live-stitch shadow-[0_0_18px_rgba(239,68,68,0.15)]' : ''}`}
      onClick={() => onClick?.(m)}
    >
      <div className="flex justify-between items-center border-b border-neutral-800/40 pb-3 text-[11px] font-bold tracking-wider text-neutral-400" onClick={e => e.stopPropagation()}>
        <span>{m.fase.toUpperCase()} - GRP {m.grupo}</span>
        {m.estado === 'live' && <span className="text-red-500 font-extrabold flex items-center gap-1 text-[10px]"><span className="h-1.5 w-1.5 rounded-full bg-red-500 live-dot"></span> EN VIVO</span>}
        {m.estado === 'finished' && <span className="text-neutral-550 font-semibold uppercase text-[10px]">FINALIZADO</span>}
        {m.estado === 'upcoming' && <span className="text-neutral-550 font-semibold text-[10px]">{new Date(m.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>}
      </div>

      <div className="flex flex-col gap-3 py-1">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xl select-none flex-shrink-0">{getTeamFlag(m.local)}</span>
            <span className="font-extrabold text-neutral-100 uppercase truncate">{m.local}</span>
          </div>
          {m.estado !== 'upcoming' && <span className="font-black text-base font-mono text-neutral-100">{m.goles_local}</span>}
        </div>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xl select-none flex-shrink-0">{getTeamFlag(m.visitante)}</span>
            <span className="font-extrabold text-neutral-100 uppercase truncate">{m.visitante}</span>
          </div>
          {m.estado !== 'upcoming' && <span className="font-black text-base font-mono text-neutral-100">{m.goles_visitante}</span>}
        </div>
      </div>

      <div className="flex justify-between items-center border-t border-neutral-800/40 pt-3 text-xs" onClick={e => e.stopPropagation()}>
        {myPred ? (
          <div className="flex items-center justify-between w-full">
            <div className="flex flex-col">
              <span className="text-[9px] text-neutral-555 font-semibold uppercase tracking-wider">Mi apuesta</span>
              <span className="font-bold text-neutral-200 text-sm font-mono mt-0.5">{myPred.pred_local} - {myPred.pred_visitante}</span>
            </div>
            <div className="flex items-center gap-2">
              {isClosed ? (
                <span className="text-[9px] text-neutral-555 font-semibold uppercase tracking-wider italic">Apuestas Cerradas</span>
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
            <span className="text-[9px] text-neutral-555 font-semibold uppercase tracking-wider">Sin apuesta registrada</span>
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
