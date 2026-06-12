'use client';

import { BookOpen } from 'lucide-react';

export default function ReglasPage() {
  return (
    <section className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-2">
        <BookOpen className="w-5 h-5 text-yellow-500" />
        <h2 className="text-lg font-black tracking-wider text-neutral-100 uppercase">Reglas del Juego</h2>
      </div>

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
        <h3 className="text-xs font-black text-neutral-400 uppercase tracking-widest border-b border-neutral-800 pb-2">Sistema de Puntuación</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-green-500/10 border border-green-500/20 rounded-xl p-4">
            <div>
              <div className="text-green-400 font-black text-sm">Resultado Exacto</div>
              <div className="text-neutral-400 text-xs mt-0.5">Ej: predices 2-1 y el partido termina 2-1</div>
            </div>
            <div className="text-green-400 font-black text-3xl font-mono">3 PTS</div>
          </div>
          <div className="flex items-center justify-between bg-neutral-800/50 border border-neutral-700/50 rounded-xl p-4">
            <div>
              <div className="text-neutral-300 font-black text-sm">Aciertas Ganador o Empate</div>
              <div className="text-neutral-400 text-xs mt-0.5">Ej: predices victoria local y el equipo local gana por cualquier marcador</div>
            </div>
            <div className="text-neutral-300 font-black text-3xl font-mono">1 PTO</div>
          </div>
          <div className="flex items-center justify-between bg-neutral-900 border border-neutral-800 rounded-xl p-4">
            <div>
              <div className="text-neutral-400 font-black text-sm">Fallo Total</div>
              <div className="text-neutral-500 text-xs mt-0.5">El resultado va en contra de tu predicción</div>
            </div>
            <div className="text-neutral-500 font-black text-3xl font-mono">0 PTS</div>
          </div>
        </div>
      </div>

      <div className="glass-card border border-neutral-800/80 rounded-2xl p-5 space-y-3">
        <h3 className="text-xs font-black text-neutral-400 uppercase tracking-widest border-b border-neutral-800 pb-2">Reglas Generales</h3>
        <ul className="space-y-3 text-sm">
          {[
            { icon: '🔒', text: 'Las apuestas se cierran automáticamente 1 hora antes del inicio de cada partido (kickoff lock). No se pueden registrar ni modificar pronósticos pasado este límite.' },
            { icon: '🏆', text: 'Todos los partidos son apostables: Fase de Grupos, Ronda de 32, Octavos, Cuartos, Semifinales, Tercer Puesto y Gran Final.' },
            { icon: '📊', text: 'La clasificación general es visible para todos los participantes en tiempo real.' },
            { icon: '🔄', text: 'Los marcadores se actualizan automáticamente desde la API de football-data.org. La clasificación se recalcula al finalizar cada partido.' },
            { icon: '⚽', text: 'En caso de empate en puntos, se desempata por cantidad de resultados exactos (3 puntos). Si persiste el empate, gana quien se registró primero.' },
            { icon: '📱', text: 'Puedes realizar y modificar tus pronósticos desde cualquier dispositivo antes del cierre (1 hora antes de cada partido).' },
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
    </section>
  );
}
