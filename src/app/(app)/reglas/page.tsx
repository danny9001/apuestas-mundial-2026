'use client';

import { BookOpen } from 'lucide-react';

export default function ReglasPage() {
  return (
    <section className="space-y-6">
      <div className="flex items-center gap-2">
        <BookOpen className="w-5 h-5 text-yellow-500" />
        <h2 className="text-lg font-black tracking-wider text-neutral-100 uppercase">Reglas del Juego</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="glass-card border border-neutral-800/80 rounded-2xl p-5 space-y-2">
            <h3 className="text-xs font-black text-neutral-400 uppercase tracking-widest border-b border-neutral-800 pb-2">Sobre la Quiniela</h3>
            <p className="text-neutral-200 text-xs leading-relaxed pt-1 font-medium">
              Esta plataforma está diseñada para pronosticar los resultados de los partidos del Mundial 2026, competir amigablemente en clasificaciones generales o por empresas, y seguir todo el torneo en tiempo real.
            </p>
            <p className="text-neutral-500 text-[11px] leading-relaxed pt-1">
              Quiniela abierta a compañeros, familiares y amigos. Convocatoria oficial: 18 de mayo de 2026.
            </p>
          </div>

          <div className="glass-card border border-neutral-800/80 rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-black text-neutral-400 uppercase tracking-widest border-b border-neutral-800 pb-2">¿Cómo se ganan los puntos?</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
                <div>
                  <div className="text-yellow-400 font-black text-sm">Tinkazo — Campeón del Mundial</div>
                  <div className="text-neutral-400 text-xs mt-1">Elegiste al campeón antes de que arranque el torneo y acertaste. Estos 5 puntos se suman al final.</div>
                </div>
                <div className="text-yellow-400 font-black text-3xl font-mono shrink-0 ml-3">5 PTS</div>
              </div>
              <div className="flex items-center justify-between bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                <div>
                  <div className="text-green-400 font-black text-sm">Marcador exacto</div>
                  <div className="text-neutral-400 text-xs mt-1">Pusiste 2-1 y el partido terminó 2-1. Cada dígito correcto.</div>
                </div>
                <div className="text-green-400 font-black text-3xl font-mono shrink-0 ml-3">3 PTS</div>
              </div>
              <div className="flex items-center justify-between bg-neutral-800/50 border border-neutral-700/50 rounded-xl p-4">
                <div>
                  <div className="text-neutral-300 font-black text-sm">Acertaste quién gana (o que empataban)</div>
                  <div className="text-neutral-400 text-xs mt-1">Pusiste que ganaba Brasil (por cualquier marcador) y Brasil ganó. O pusiste empate y fue empate.</div>
                </div>
                <div className="text-neutral-300 font-black text-3xl font-mono shrink-0 ml-3">1 PTO</div>
              </div>
              <div className="flex items-center justify-between bg-neutral-900 border border-neutral-800 rounded-xl p-4">
                <div>
                  <div className="text-neutral-400 font-black text-sm">Fallaste</div>
                  <div className="text-neutral-500 text-xs mt-1">Pusiste que ganaba un equipo y perdió, o pusiste empate y hubo ganador.</div>
                </div>
                <div className="text-neutral-500 font-black text-3xl font-mono shrink-0 ml-3">0 PTS</div>
              </div>
            </div>
          </div>

          <div className="glass-card border border-orange-500/30 rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-black text-orange-400 uppercase tracking-widest border-b border-orange-500/20 pb-2">Partidos que van a penales (eliminatorias)</h3>
            <p className="text-neutral-300 text-xs leading-relaxed font-medium">
              Cuando un partido va a penales, <span className="text-white font-black">los goles de la tanda no cuentan</span>. Lo único que importa es cómo terminó el partido antes de los penales.
            </p>

            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3 space-y-1">
              <div className="text-neutral-500 text-[10px] uppercase tracking-widest">Ejemplo real: Países Bajos vs Marruecos</div>
              <div className="text-neutral-300 text-xs mt-1">El partido terminó <span className="text-white font-bold">1-1</span> al final del tiempo extra. Marruecos ganó en penales 3-2.</div>
            </div>

            <div className="space-y-2">
              <div className="flex items-start gap-3 bg-green-500/10 border border-green-500/20 rounded-xl p-3">
                <div className="text-green-400 font-black text-base font-mono mt-0.5 shrink-0">3</div>
                <div>
                  <div className="text-green-300 font-black text-xs">Pusiste exactamente 1-1 → 3 puntos</div>
                  <div className="text-neutral-500 text-xs mt-0.5">Acertaste el marcador exacto antes de penales.</div>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-neutral-800/60 border border-neutral-700/50 rounded-xl p-3">
                <div className="text-neutral-300 font-black text-base font-mono mt-0.5 shrink-0">1</div>
                <div>
                  <div className="text-neutral-200 font-black text-xs">Pusiste empate (cualquier marcador, ej. 0-0 o 2-2) → 1 punto</div>
                  <div className="text-neutral-500 text-xs mt-0.5">No acertaste el marcador exacto pero sí que iba a ser empate.</div>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-red-500/5 border border-red-500/20 rounded-xl p-3">
                <div className="text-red-400 font-black text-base font-mono mt-0.5 shrink-0">0</div>
                <div>
                  <div className="text-red-300 font-black text-xs">Pusiste que ganaba Marruecos o Países Bajos → 0 puntos</div>
                  <div className="text-neutral-500 text-xs mt-0.5">Aunque Marruecos pasó en penales, el partido terminó en empate. Los penales no puntúan.</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-card border border-neutral-800/80 rounded-2xl p-5 space-y-3">
            <h3 className="text-xs font-black text-neutral-400 uppercase tracking-widest border-b border-neutral-800 pb-2">Reglas Generales</h3>
            <ul className="space-y-3 text-sm">
              {[
                { icon: '🔒', text: 'Las apuestas se cierran automáticamente 15 minutos antes del inicio de cada partido (kickoff lock). No se pueden registrar ni modificar pronósticos pasado este límite.' },
                { icon: '🏆', text: 'Todos los partidos son apostables: Fase de Grupos, Ronda de 32, Octavos, Cuartos, Semifinales, Tercer Puesto y Gran Final.' },
                { icon: '📊', text: 'La clasificación general es visible para todos los participantes en tiempo real.' },
                { icon: '🔄', text: 'Los marcadores se actualizan automáticamente desde la API de football-data.org. La clasificación se recalcula al finalizar cada partido.' },
                { icon: '⚽', text: 'En caso de empate en puntos, se desempata por cantidad de resultados exactos (3 puntos). Si persiste el empate, gana quien se registró primero.' },
                { icon: '📱', text: 'Puedes realizar y modificar tus pronósticos desde cualquier dispositivo antes del cierre (15 minutos antes de cada partido).' },
              ].map((r, i) => (
                <li key={i} className="flex items-start gap-3 text-neutral-300">
                  <span className="text-lg flex-shrink-0">{r.icon}</span>
                  <span className="text-xs leading-relaxed text-neutral-400">{r.text}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="glass-card border border-neutral-800/80 rounded-2xl p-5 space-y-3">
            <h3 className="text-xs font-black text-neutral-400 uppercase tracking-widest border-b border-neutral-800 pb-2">Datos del Torneo</h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              {[
                { label: 'Inicio', value: '11 Junio 2026' },
                { label: 'Final', value: '19 Julio 2026' },
                { label: 'Equipos', value: '48 selecciones' },
                { label: 'Grupos', value: '12 grupos (A-L)' },
                { label: 'Partidos', value: '104 en total' },
                { label: 'Sede Final', value: 'MetLife Stadium, NJ' },
              ].map(d => (
                <div key={d.label} className="bg-neutral-950/60 border border-neutral-850 rounded-xl p-3">
                  <div className="text-neutral-500 text-[10px] uppercase tracking-widest">{d.label}</div>
                  <div className="text-neutral-200 font-bold mt-0.5">{d.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
