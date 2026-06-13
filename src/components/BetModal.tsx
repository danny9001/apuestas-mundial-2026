'use client';

import React, { useState } from 'react';
import { X, Check, ShieldAlert } from 'lucide-react';
import { getTeamFlag } from '@/lib/constants';

interface BetModalProps {
  match: any;
  user: any;
  existingPred: { pred_local: number; pred_visitante: number } | null;
  adminUsers?: any[];
  onSave: (matchId: number, predLocal: number, predVisitante: number, userId: number) => Promise<void>;
  onClose: () => void;
}

export default function BetModal({ match, user, existingPred, adminUsers = [], onSave, onClose }: BetModalProps) {
  const [predLocal, setPredLocal] = useState(existingPred?.pred_local ?? 0);
  const [predVisitante, setPredVisitante] = useState(existingPred?.pred_visitante ?? 0);
  const [targetUserId, setTargetUserId] = useState<number>(user?.id ?? 0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isMatchClosed = match.estado !== 'upcoming' || new Date().getTime() >= new Date(match.fecha).getTime() - 60 * 60 * 1000;
  const isLocked = isMatchClosed && targetUserId === user?.id;

  const handleSave = async () => {
    setSubmitting(true);
    setError('');
    try {
      await onSave(match.id, predLocal, predVisitante, targetUserId);
      onClose();
    } catch (e: any) {
      setError(e.message || 'Error al guardar el pronóstico');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="glass-card border-t-2 border-t-yellow-500 border-x border-b border-neutral-800/80 rounded-xl w-full max-w-md p-6 shadow-2xl animate-slide-in-up space-y-6">

        <div className="flex justify-between items-center border-b border-neutral-800/40 pb-3">
          <div>
            <h3 className="text-sm font-black uppercase text-neutral-100">Hacer Pronóstico</h3>
            <span className="text-[9px] text-neutral-500 uppercase tracking-widest font-mono">Apuestas Cerradas al inicio del partido</span>
          </div>
          <button onClick={onClose} className="bg-neutral-950 hover:bg-neutral-800 text-neutral-400 p-2 rounded-full border border-neutral-850 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {user?.tipo === 'superadmin' && adminUsers.length > 0 && (
          <div className="space-y-1.5 bg-neutral-950/60 border border-neutral-850 p-3.5 rounded-xl shadow-inner">
            <label className="block text-[9px] text-neutral-500 font-black uppercase tracking-widest">👤 Editar pronóstico de participante:</label>
            <select value={targetUserId} onChange={e => setTargetUserId(parseInt(e.target.value))}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-300 focus:outline-none focus:border-yellow-500/50 transition cursor-pointer">
              <option value={user.id}>Tú ({user.nombre})</option>
              {adminUsers.filter((u: any) => u.id !== user.id).map((u: any) => (
                <option key={u.id} value={u.id}>{u.nombre} ({u.email})</option>
              ))}
            </select>
          </div>
        )}

        <div className="flex justify-between items-center py-4 bg-neutral-950 border border-neutral-850 rounded-lg px-6 shadow-inner">
          {/* Local */}
          <div className="flex flex-col items-center gap-2 w-1/3">
            <div className="w-12 h-12 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-2xl shadow-inner select-none flex-shrink-0 animate-pulse">
              {getTeamFlag(match.local)}
            </div>
            <span className="text-[10px] font-black text-neutral-300 uppercase truncate w-full text-center tracking-wider">{match.local}</span>
            <div className="flex items-center gap-1.5 mt-2">
              <button onClick={() => setPredLocal(Math.max(0, predLocal - 1))} disabled={isLocked}
                className="w-8 h-8 rounded-full border border-neutral-800 flex items-center justify-center font-bold text-sm bg-neutral-900 text-neutral-300 transition active:scale-90 hover:border-yellow-500/25 disabled:opacity-30">-</button>
              <span className="text-lg font-black font-mono w-4 text-center text-yellow-500">{predLocal}</span>
              <button onClick={() => setPredLocal(predLocal + 1)} disabled={isLocked}
                className="w-8 h-8 rounded-full border border-neutral-800 flex items-center justify-center font-bold text-sm bg-neutral-900 text-neutral-300 transition active:scale-90 hover:border-yellow-500/25 disabled:opacity-30">+</button>
            </div>
          </div>

          <span className="text-2xl text-neutral-700 font-extrabold font-mono">:</span>

          {/* Visitante */}
          <div className="flex flex-col items-center gap-2 w-1/3">
            <div className="w-12 h-12 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-2xl shadow-inner select-none flex-shrink-0 animate-pulse">
              {getTeamFlag(match.visitante)}
            </div>
            <span className="text-[10px] font-black text-neutral-300 uppercase truncate w-full text-center tracking-wider">{match.visitante}</span>
            <div className="flex items-center gap-1.5 mt-2">
              <button onClick={() => setPredVisitante(Math.max(0, predVisitante - 1))} disabled={isLocked}
                className="w-8 h-8 rounded-full border border-neutral-800 flex items-center justify-center font-bold text-sm bg-neutral-900 text-neutral-300 transition active:scale-90 hover:border-yellow-500/25 disabled:opacity-30">-</button>
              <span className="text-lg font-black font-mono w-4 text-center text-yellow-500">{predVisitante}</span>
              <button onClick={() => setPredVisitante(predVisitante + 1)} disabled={isLocked}
                className="w-8 h-8 rounded-full border border-neutral-800 flex items-center justify-center font-bold text-sm bg-neutral-900 text-neutral-300 transition active:scale-90 hover:border-yellow-500/25 disabled:opacity-30">+</button>
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-950/30 border border-red-800/40 text-red-400 text-xs p-3 rounded-lg">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" /><span>{error}</span>
          </div>
        )}

        <button onClick={handleSave} disabled={submitting || isLocked}
          className="w-full btn-primary-stitch py-3.5 text-sm uppercase flex items-center justify-center gap-2 disabled:opacity-50">
          <Check className="w-4 h-4" />
          <span>{submitting ? 'Confirmando...' : isLocked ? 'Apuesta Realizada (No editable)' : 'Confirmar Apuesta'}</span>
        </button>
      </div>
    </div>
  );
}
