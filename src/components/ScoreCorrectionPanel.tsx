'use client';

import { useState } from 'react';
import { getTeamFlag } from '@/lib/constants';

interface ScoreCorrectionPanelProps {
  match: any;
  onCorrected?: (updated: any) => void;
  showToast: (msg: string) => void;
}

const GRACE_MS = 15 * 60 * 1000;

function isEditable(match: any): boolean {
  if (match.estado === 'live') return true;
  if (match.estado === 'finished' && match.updated_at) {
    return Date.now() - new Date(match.updated_at).getTime() <= GRACE_MS;
  }
  return false;
}

export default function ScoreCorrectionPanel({ match, onCorrected, showToast }: ScoreCorrectionPanelProps) {
  const [local, setLocal] = useState<number>(match.goles_local ?? 0);
  const [visitante, setVisitante] = useState<number>(match.goles_visitante ?? 0);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(false);

  if (!isEditable(match)) return null;

  const unchanged = local === (match.goles_local ?? 0) && visitante === (match.goles_visitante ?? 0);
  const isAnnulment = local < (match.goles_local ?? 0) || visitante < (match.goles_visitante ?? 0);

  const handleSave = async () => {
    if (unchanged) return;
    setSaving(true);
    try {
      const res = await fetch('/api/matches/score-correction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId: match.id, goles_local: local, goles_visitante: visitante }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(isAnnulment ? '🚫 Gol anulado — corrección aplicada' : '✅ Score corregido y notificación enviada');
        onCorrected?.(data.match);
        setConfirm(false);
      } else {
        showToast(`Error: ${data.error}`);
      }
    } catch {
      showToast('Error de red');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-2 rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-3 py-2.5">
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-[9px] font-black uppercase tracking-widest text-yellow-500/80">⚖️ Árbitro</span>
        {match.estado === 'finished' && (
          <span className="text-[8px] text-neutral-500 font-mono">
            {(() => {
              const mins = Math.floor((Date.now() - new Date(match.updated_at).getTime()) / 60000);
              const left = 15 - mins;
              return left > 0 ? `${left}m restantes` : '';
            })()}
          </span>
        )}
      </div>

      <div className="flex items-center justify-center gap-3">
        {/* Local */}
        <div className="flex flex-col items-center gap-1 min-w-0">
          <span className="text-[9px] text-neutral-400 truncate max-w-[70px] text-center">{getTeamFlag(match.local)} {match.local}</span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setLocal(v => Math.max(0, v - 1))}
              className="w-6 h-6 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-black flex items-center justify-center transition"
            >−</button>
            <span className="w-6 text-center font-black text-sm font-mono text-neutral-100">{local}</span>
            <button
              onClick={() => setLocal(v => v + 1)}
              className="w-6 h-6 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 text-sm font-black flex items-center justify-center transition"
            >+</button>
          </div>
        </div>

        <span className="text-neutral-600 font-mono text-xs">vs</span>

        {/* Visitante */}
        <div className="flex flex-col items-center gap-1 min-w-0">
          <span className="text-[9px] text-neutral-400 truncate max-w-[70px] text-center">{getTeamFlag(match.visitante)} {match.visitante}</span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setVisitante(v => Math.max(0, v - 1))}
              className="w-6 h-6 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-black flex items-center justify-center transition"
            >−</button>
            <span className="w-6 text-center font-black text-sm font-mono text-neutral-100">{visitante}</span>
            <button
              onClick={() => setVisitante(v => v + 1)}
              className="w-6 h-6 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 text-sm font-black flex items-center justify-center transition"
            >+</button>
          </div>
        </div>
      </div>

      {!unchanged && !confirm && (
        <button
          onClick={() => setConfirm(true)}
          className={`mt-2 w-full py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition ${
            isAnnulment
              ? 'bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/30'
              : 'bg-green-500/15 hover:bg-green-500/25 text-green-400 border border-green-500/30'
          }`}
        >
          {isAnnulment ? '🚫 Confirmar Gol Anulado' : '✅ Confirmar Score'}
        </button>
      )}

      {confirm && (
        <div className="mt-2 flex gap-1.5">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border border-yellow-500/30 transition disabled:opacity-50"
          >
            {saving ? '...' : '✓ Aplicar'}
          </button>
          <button
            onClick={() => { setConfirm(false); setLocal(match.goles_local ?? 0); setVisitante(match.goles_visitante ?? 0); }}
            className="flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-neutral-800 hover:bg-neutral-700 text-neutral-400 border border-neutral-700 transition"
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}
