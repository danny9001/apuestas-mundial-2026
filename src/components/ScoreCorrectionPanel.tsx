'use client';

import { useState } from 'react';
import { getTeamFlag } from '@/lib/constants';
import { PHASES_APUESTA } from '@/lib/constants';

interface ScoreCorrectionPanelProps {
  match: any;
  onCorrected?: (updated: any) => void;
  showToast: (msg: string) => void;
  isSuperAdmin?: boolean;
}

const GRACE_MS = 15 * 60 * 1000;
const KNOCKOUT_PHASES = ['Ronda de 32', 'Octavos de Final', 'Cuartos de Final', 'Semifinal', 'Tercer Puesto', 'Final'];

function isEditable(match: any): boolean {
  if (match.estado === 'live') return true;
  if (match.estado === 'finished' && match.updated_at) {
    return Date.now() - new Date(match.updated_at).getTime() <= GRACE_MS;
  }
  return false;
}

type EventForm = { jugador: string; minuto: string } | null;

export default function ScoreCorrectionPanel({ match, onCorrected, showToast, isSuperAdmin = false }: ScoreCorrectionPanelProps) {
  // ── Score correction ──
  const [local, setLocal] = useState<number>(match.goles_local ?? 0);
  const [visitante, setVisitante] = useState<number>(match.goles_visitante ?? 0);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(false);

  // ── Event registration ──
  const [pendingEvent, setPendingEvent] = useState<{ tipo: string; equipo: string } | null>(null);
  const [eventForm, setEventForm] = useState<EventForm>({ jugador: '', minuto: '' });
  const [savingEvent, setSavingEvent] = useState(false);

  // ── Penalties ──
  const [showPenales, setShowPenales] = useState(false);
  const [penalesLocal, setPenalesLocal] = useState<number>(match.stats?.penales_local ?? 0);
  const [penalesVisitante, setPenalesVisitante] = useState<number>(match.stats?.penales_visitante ?? 0);
  const [ganador, setGanador] = useState<string>(match.stats?.ganador ?? '');
  const [savingPenales, setSavingPenales] = useState(false);
  const [penalesHabilitados, setPenalesHabilitados] = useState<boolean>(match.penales_habilitados ?? false);
  const [savingSwitch, setSavingSwitch] = useState(false);

  if (!isEditable(match)) return null;

  const isKnockout = KNOCKOUT_PHASES.includes(match.fase);
  const hasExistingPenales = !!match.stats?.ganador;

  const unchanged = local === (match.goles_local ?? 0) && visitante === (match.goles_visitante ?? 0);
  const isAnnulment = local < (match.goles_local ?? 0) || visitante < (match.goles_visitante ?? 0);

  const handleSaveScore = async () => {
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
        showToast(isAnnulment ? '🚫 Gol anulado — corrección aplicada' : '✅ Score corregido');
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

  const handleSaveEvent = async () => {
    if (!pendingEvent) return;
    setSavingEvent(true);
    try {
      const res = await fetch('/api/matches/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: match.id,
          tipo: pendingEvent.tipo,
          equipo: pendingEvent.equipo,
          jugador: eventForm?.jugador?.trim() || '',
          minuto: eventForm?.minuto?.trim() || '',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        const labels: Record<string, string> = {
          gol: '⚽ Gol registrado',
          gol_penal: '⚽ Gol penal registrado',
          tarjeta_amarilla: '🟨 Tarjeta amarilla registrada',
          tarjeta_roja: '🟥 Tarjeta roja registrada',
          sustitucion: '🔄 Sustitución registrada',
        };
        showToast(labels[pendingEvent.tipo] || '✅ Evento registrado');
        onCorrected?.(data.match);
        setPendingEvent(null);
        setEventForm({ jugador: '', minuto: '' });
        // Sync local score after goal event
        if (pendingEvent.tipo === 'gol' || pendingEvent.tipo === 'gol_penal') {
          setLocal(data.match.goles_local);
          setVisitante(data.match.goles_visitante);
        }
      } else {
        showToast(`Error: ${data.error}`);
      }
    } catch {
      showToast('Error de red');
    } finally {
      setSavingEvent(false);
    }
  };

  const handleDeleteLastEvent = async () => {
    const eventos = Array.isArray(match.stats?.eventos) ? match.stats.eventos : [];
    if (eventos.length === 0) { showToast('Sin eventos para deshacer'); return; }
    setSavingEvent(true);
    try {
      const res = await fetch('/api/matches/events', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId: match.id }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('↩️ Último evento deshecho');
        onCorrected?.(data.match);
        setLocal(data.match.goles_local);
        setVisitante(data.match.goles_visitante);
      } else {
        showToast(`Error: ${data.error}`);
      }
    } catch {
      showToast('Error de red');
    } finally {
      setSavingEvent(false);
    }
  };

  const handleSavePenales = async () => {
    if (!ganador) { showToast('Selecciona el ganador en penales'); return; }
    setSavingPenales(true);
    try {
      const res = await fetch('/api/matches/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: match.id,
          tipo: 'penales',
          ganador,
          penales_local: penalesLocal,
          penales_visitante: penalesVisitante,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`🎯 ${ganador} avanza en penales`);
        onCorrected?.(data.match);
        setShowPenales(false); // Auto-close after registering
      } else {
        showToast(`Error: ${data.error}`);
      }
    } catch {
      showToast('Error de red');
    } finally {
      setSavingPenales(false);
    }
  };

  const handleTogglePenalesSwitch = async (newValue: boolean) => {
    setSavingSwitch(true);
    try {
      const res = await fetch('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: match.id, penales_habilitados: newValue }),
      });
      const data = await res.json();
      if (res.ok) {
        setPenalesHabilitados(newValue);
        onCorrected?.(data.match);
      } else {
        showToast(`Error: ${data.error}`);
      }
    } catch {
      showToast('Error de red');
    } finally {
      setSavingSwitch(false);
    }
  };

  const EventButton = ({ tipo, equipo, label }: { tipo: string; equipo: string; label: string }) => (
    <button
      onClick={() => { setPendingEvent({ tipo, equipo }); setEventForm({ jugador: '', minuto: '' }); }}
      className={`flex-1 min-w-[calc(50%-4px)] py-1.5 px-2 rounded-lg text-[9px] font-black uppercase tracking-wider border transition
        ${tipo === 'tarjeta_roja' ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
        : tipo === 'tarjeta_amarilla' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20'
        : tipo === 'gol_penal' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20'
        : 'bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20'}`}
    >
      {label}
    </button>
  );

  const eventos: any[] = Array.isArray(match.stats?.eventos) ? match.stats.eventos : [];

  return (
    <div className="mt-2 rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-3 py-2.5 space-y-3">

      {/* ── Score Correction ── */}
      <div>
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
          <div className="flex flex-col items-center gap-1 min-w-0">
            <span className="text-[9px] text-neutral-400 truncate max-w-[70px] text-center">{getTeamFlag(match.local)} {match.local}</span>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setLocal(v => Math.max(0, v - 1))} className="w-6 h-6 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-black flex items-center justify-center transition">−</button>
              <span className="w-6 text-center font-black text-sm font-mono text-neutral-100">{local}</span>
              <button onClick={() => setLocal(v => v + 1)} className="w-6 h-6 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 text-sm font-black flex items-center justify-center transition">+</button>
            </div>
          </div>
          <span className="text-neutral-600 font-mono text-xs">vs</span>
          <div className="flex flex-col items-center gap-1 min-w-0">
            <span className="text-[9px] text-neutral-400 truncate max-w-[70px] text-center">{getTeamFlag(match.visitante)} {match.visitante}</span>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setVisitante(v => Math.max(0, v - 1))} className="w-6 h-6 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-black flex items-center justify-center transition">−</button>
              <span className="w-6 text-center font-black text-sm font-mono text-neutral-100">{visitante}</span>
              <button onClick={() => setVisitante(v => v + 1)} className="w-6 h-6 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 text-sm font-black flex items-center justify-center transition">+</button>
            </div>
          </div>
        </div>

        {!unchanged && !confirm && (
          <button onClick={() => setConfirm(true)} className={`mt-2 w-full py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition ${isAnnulment ? 'bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/30' : 'bg-green-500/15 hover:bg-green-500/25 text-green-400 border border-green-500/30'}`}>
            {isAnnulment ? '🚫 Confirmar Gol Anulado' : '✅ Confirmar Score'}
          </button>
        )}
        {confirm && (
          <div className="mt-2 flex gap-1.5">
            <button onClick={handleSaveScore} disabled={saving} className="flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border border-yellow-500/30 transition disabled:opacity-50">
              {saving ? '...' : '✓ Aplicar'}
            </button>
            <button onClick={() => { setConfirm(false); setLocal(match.goles_local ?? 0); setVisitante(match.goles_visitante ?? 0); }} className="flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-neutral-800 hover:bg-neutral-700 text-neutral-400 border border-neutral-700 transition">
              Cancelar
            </button>
          </div>
        )}
      </div>

      {/* ── Eventos del Partido (solo superadmin) ── */}
      {isSuperAdmin && <div className="border-t border-yellow-500/10 pt-2.5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[9px] font-black uppercase tracking-widest text-neutral-400">Registrar Evento</span>
          {eventos.length > 0 && (
            <button onClick={handleDeleteLastEvent} disabled={savingEvent} className="text-[8px] text-orange-400 hover:text-orange-300 font-black uppercase tracking-wider disabled:opacity-50">
              ↩ Deshacer último
            </button>
          )}
        </div>

        {/* Event buttons grid */}
        {!pendingEvent && (
          <div className="flex flex-wrap gap-1">
            <EventButton tipo="gol" equipo={match.local} label={`⚽ Gol ${match.local.split(' ')[0]}`} />
            <EventButton tipo="gol" equipo={match.visitante} label={`⚽ Gol ${match.visitante.split(' ')[0]}`} />
            <EventButton tipo="gol_penal" equipo={match.local} label={`⚽P ${match.local.split(' ')[0]}`} />
            <EventButton tipo="gol_penal" equipo={match.visitante} label={`⚽P ${match.visitante.split(' ')[0]}`} />
            <EventButton tipo="tarjeta_amarilla" equipo={match.local} label={`🟨 ${match.local.split(' ')[0]}`} />
            <EventButton tipo="tarjeta_amarilla" equipo={match.visitante} label={`🟨 ${match.visitante.split(' ')[0]}`} />
            <EventButton tipo="tarjeta_roja" equipo={match.local} label={`🟥 ${match.local.split(' ')[0]}`} />
            <EventButton tipo="tarjeta_roja" equipo={match.visitante} label={`🟥 ${match.visitante.split(' ')[0]}`} />
          </div>
        )}

        {/* Event form */}
        {pendingEvent && (
          <div className="space-y-1.5">
            <div className="text-[9px] font-black uppercase tracking-widest text-neutral-300 text-center">
              {pendingEvent.tipo === 'gol' ? '⚽ Gol' : pendingEvent.tipo === 'gol_penal' ? '⚽ Penal' : pendingEvent.tipo === 'tarjeta_amarilla' ? '🟨 Amarilla' : '🟥 Roja'} — {pendingEvent.equipo}
            </div>
            <div className="flex gap-1.5">
              <input
                type="text"
                placeholder="Jugador (opcional)"
                value={eventForm?.jugador || ''}
                onChange={e => setEventForm(f => ({ ...f!, jugador: e.target.value }))}
                className="flex-1 bg-neutral-900 border border-neutral-700 rounded-lg px-2 py-1 text-[10px] text-neutral-100 placeholder-neutral-600 focus:border-yellow-500 outline-none"
                maxLength={50}
                autoFocus
              />
              <input
                type="text"
                placeholder="Min."
                value={eventForm?.minuto || ''}
                onChange={e => setEventForm(f => ({ ...f!, minuto: e.target.value }))}
                className="w-14 bg-neutral-900 border border-neutral-700 rounded-lg px-2 py-1 text-[10px] text-neutral-100 placeholder-neutral-600 focus:border-yellow-500 outline-none"
                maxLength={5}
              />
            </div>
            <div className="flex gap-1.5">
              <button onClick={handleSaveEvent} disabled={savingEvent} className="flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-green-500/15 hover:bg-green-500/25 text-green-400 border border-green-500/30 transition disabled:opacity-50">
                {savingEvent ? '...' : '✓ Registrar'}
              </button>
              <button onClick={() => setPendingEvent(null)} className="flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase bg-neutral-800 hover:bg-neutral-700 text-neutral-400 border border-neutral-700 transition">
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Events log */}
        {eventos.length > 0 && (
          <div className="mt-2 space-y-0.5 max-h-24 overflow-y-auto">
            {[...eventos].reverse().map((e: any, i: number) => (
              <div key={i} className="flex items-center gap-1.5 text-[8px] text-neutral-500">
                <span>{e.tipo === 'gol' ? '⚽' : e.tipo === 'gol_penal' ? '⚽P' : e.tipo === 'tarjeta_amarilla' ? '🟨' : e.tipo === 'tarjeta_roja' ? '🟥' : '🔄'}</span>
                {e.minuto && <span className="font-mono text-neutral-600">{e.minuto}'</span>}
                <span className="text-neutral-400 font-medium">{e.jugador || '—'}</span>
                <span className="text-neutral-600">({e.equipo})</span>
              </div>
            ))}
          </div>
        )}
      </div>}

      {/* ── Penales (knockout only, solo superadmin) ── */}
      {isSuperAdmin && isKnockout && (
        <div className="border-t border-yellow-500/10 pt-2.5">

          {/* Switch: ¿Contar penales para puntos? */}
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[9px] font-black uppercase tracking-widest text-neutral-400">
              ⚡ Penales cuentan para puntos
            </span>
            <button
              onClick={() => !savingSwitch && handleTogglePenalesSwitch(!penalesHabilitados)}
              disabled={savingSwitch}
              className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50 ${penalesHabilitados ? 'bg-blue-500' : 'bg-neutral-700'}`}
              title={penalesHabilitados ? 'Desactivar scoring de penales' : 'Activar scoring de penales'}
            >
              <span className={`inline-block h-3 w-3 rounded-full bg-white shadow transition-transform duration-200 ${penalesHabilitados ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </button>
          </div>

          {hasExistingPenales ? (
            /* Already registered — show summary + option to edit */
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black uppercase tracking-widest text-blue-400">
                  🎯 Penales: {match.stats.ganador}
                  {match.stats.penales_local != null
                    ? ` (${match.stats.penales_local}–${match.stats.penales_visitante})`
                    : ''}
                </span>
                <button
                  onClick={() => setShowPenales(v => !v)}
                  className="text-[8px] text-neutral-500 hover:text-neutral-300 font-black uppercase tracking-wider"
                >
                  {showPenales ? 'Cerrar' : 'Editar'}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowPenales(v => !v)}
              className="w-full text-[9px] font-black uppercase tracking-widest text-blue-400 hover:text-blue-300 transition text-left flex items-center justify-between"
            >
              <span>🎯 Registrar Penales</span>
              <span>{showPenales ? '▲' : '▼'}</span>
            </button>
          )}

          {showPenales && (
            <div className="mt-2 space-y-2">
              {/* Penalty scores */}
              <div className="flex items-center justify-center gap-3">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[9px] text-neutral-400 truncate max-w-[70px] text-center">{getTeamFlag(match.local)} {match.local}</span>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setPenalesLocal(v => Math.max(0, v - 1))} className="w-6 h-6 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-black flex items-center justify-center">−</button>
                    <span className="w-6 text-center font-black text-sm font-mono text-blue-300">{penalesLocal}</span>
                    <button onClick={() => setPenalesLocal(v => v + 1)} className="w-6 h-6 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 text-sm font-black flex items-center justify-center">+</button>
                  </div>
                </div>
                <span className="text-neutral-600 font-mono text-xs">pen.</span>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[9px] text-neutral-400 truncate max-w-[70px] text-center">{getTeamFlag(match.visitante)} {match.visitante}</span>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setPenalesVisitante(v => Math.max(0, v - 1))} className="w-6 h-6 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-black flex items-center justify-center">−</button>
                    <span className="w-6 text-center font-black text-sm font-mono text-blue-300">{penalesVisitante}</span>
                    <button onClick={() => setPenalesVisitante(v => v + 1)} className="w-6 h-6 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 text-sm font-black flex items-center justify-center">+</button>
                  </div>
                </div>
              </div>

              {/* Winner selector */}
              <div className="flex gap-1.5">
                <button
                  onClick={() => setGanador(match.local)}
                  className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider border transition ${ganador === match.local ? 'bg-blue-500/20 border-blue-400 text-blue-300' : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-blue-500/40'}`}
                >
                  {getTeamFlag(match.local)} {match.local}
                </button>
                <button
                  onClick={() => setGanador(match.visitante)}
                  className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider border transition ${ganador === match.visitante ? 'bg-blue-500/20 border-blue-400 text-blue-300' : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-blue-500/40'}`}
                >
                  {getTeamFlag(match.visitante)} {match.visitante}
                </button>
              </div>

              <button
                onClick={handleSavePenales}
                disabled={savingPenales || !ganador}
                className="w-full py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 border border-blue-500/30 transition disabled:opacity-40"
              >
                {savingPenales ? '...' : `🎯 Confirmar: ${ganador || 'selecciona ganador'}`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
