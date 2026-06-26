'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, MapPin, Sparkles, Newspaper, Calendar, MessageCircle, Send, Flag } from 'lucide-react';
import { getTeamFlag } from '@/lib/constants';
import { useApp } from '@/contexts/AppContext';

const REACTIONS = ['⚽', '🔥', '😱', '😂', '😢', '😡', '👏', '💔'];

interface MatchInfoModalProps {
  match: any;
  prediction?: { pred_local: number; pred_visitante: number } | null;
  onBet?: () => void;
  onClose: () => void;
}

const TEAM_TRIVIA: Record<string, { trivia: string; news: string }> = {
  'México': {
    trivia: 'México es el primer país en albergar tres Copas del Mundo de la FIFA (1970, 1986 y 2026). El Estadio Azteca ha sido escenario de momentos históricos como la "Mano de Dios" de Maradona y el "Partido del Siglo".',
    news: 'La Selección Mexicana entrena a puerta cerrada preparando la alineación táctica para el partido de debut.'
  },
  'Sudáfrica': {
    trivia: 'Sudáfrica fue el primer país africano en albergar una Copa del Mundo de la FIFA, en el inolvidable torneo de 2010 famoso por las vuvuzelas y el "Waka Waka".',
    news: 'Los bafana bafana llegan motivados tras una racha invicta en partidos de preparación.'
  },
  'Corea del Sur': {
    trivia: 'Corea del Sur es la selección asiática con más participaciones en la historia de los mundiales y logró un histórico cuarto lugar como co-organizador en 2002.',
    news: 'Corea del Sur confía en su juego rápido y contragolpes letales para desestabilizar la defensa rival.'
  },
  'República Checa': {
    trivia: 'Como Checoslovaquia, fueron subcampeones del mundo en dos ocasiones (1934 y 1962). Son conocidos por su juego físico y orden táctico.',
    news: 'República Checa reporta plantel completo tras la recuperación de su mediocampista estrella.'
  },
  'Brasil': {
    trivia: 'Brasil es la única selección que ha jugado todos los mundiales de la historia y es el máximo ganador del torneo con 5 estrellas (1958, 1962, 1970, 1994, 2002).',
    news: 'El seleccionador brasileño promete un fútbol ofensivo y el tradicional "jogo bonito" desde el primer minuto.'
  },
  'Marruecos': {
    trivia: 'En Qatar 2022, Marruecos hizo historia al convertirse en la primera selección africana y del mundo árabe en alcanzar las semifinales de un mundial.',
    news: 'Los Leones del Atlas se declaran listos con un bloque defensivo sumamente ordenado.'
  },
  'Estados Unidos': {
    trivia: 'Estados Unidos obtuvo el tercer lugar en el primer mundial de la historia (Uruguay 1930), el cual sigue siendo su mejor resultado histórico en el torneo.',
    news: 'La selección norteamericana busca aprovechar la localía para sumar sus primeros tres puntos.'
  },
  'Argentina': {
    trivia: 'Argentina cuenta con 3 títulos mundiales (1978, 1986 y 2022). Dos de los más grandes jugadores de la historia, Diego Maradona y Lionel Messi, vistieron su mítica camiseta número 10.',
    news: 'Expectativa total en la concentración albiceleste; afición realiza un banderazo en los alrededores del hotel.'
  },
  'España': {
    trivia: 'España conquistó el mundo en Sudáfrica 2010 desplegando el famoso estilo de juego "Tiki-Taka", caracterizado por la posesión paciente del balón y pases precisos.',
    news: 'La Furia Roja afina los últimos detalles de posesión de balón y presión alta.'
  },
  'Alemania': {
    trivia: 'Alemania ha ganado 4 Copas del Mundo y es la selección que más finales ha disputado en la historia del torneo, con un total de 8 apariciones finales.',
    news: 'Alemania destaca la disciplina de su plantel y la mentalidad ganadora previa al pitazo inicial.'
  },
  'Francia': {
    trivia: 'Francia ha ganado la Copa del Mundo en dos ocasiones (1998 en casa y 2018 en Rusia), además de llegar a la final en el torneo de 2022.',
    news: 'La prensa destaca la velocidad del ataque francés y la solidez en el mediocampo.'
  },
  'Portugal': {
    trivia: 'Portugal tuvo su mejor participación en Inglaterra 1966 al quedar en tercer lugar, liderados por la leyenda Eusébio, conocido como la "Pantera Negra".',
    news: 'Portugal entrena tiros libres y jugadas a balón parado como factor clave para abrir el marcador.'
  },
  'Colombia': {
    trivia: 'Colombia maravilló al mundo en Brasil 2014 al llegar a cuartos de final con James Rodríguez como goleador absoluto de aquel torneo.',
    news: 'La selección cafetera confía en la creatividad de sus atacantes para romper la zaga contraria.'
  },
  'Inglaterra': {
    trivia: 'Inglaterra ganó su única Copa del Mundo en 1966 jugando en casa, venciendo a Alemania Federal en una de las finales más discutidas e históricas del fútbol.',
    news: 'Inglaterra entrena con gran intensidad; los medios elogian el gran ambiente del grupo.'
  },
  'Croacia': {
    trivia: 'Croacia es una de las selecciones más consistentes de la era moderna, logrando el subcampeonato en Rusia 2018 y el tercer puesto en Francia 1998 y Qatar 2022.',
    news: 'El mediocampo croata se perfila como la clave táctica del encuentro.'
  },
  'Uruguay': {
    trivia: 'Uruguay fue el primer campeón del mundo en 1930 y protagonizó la hazaña más grande del fútbol al ganar el mundial de 1950 en Brasil, conocida como el "Maracanazo".',
    news: 'La garra charrúa entrena a doble sesión enfocada en la presión en zona media.'
  }
};

const STADIUM_MAPPING: Record<string, string> = {
  'Estadio Azteca, CDMX': 'Estadio Azteca, CDMX',
  'CDMX': 'Estadio Azteca, CDMX',
  'Guadalajara': 'Estadio Akron, Guadalajara',
  'Monterrey': 'Estadio BBVA, Monterrey',
  'Atlanta': 'Mercedes-Benz Stadium, Atlanta',
  'Toronto': 'BMO Field, Toronto',
  'San Francisco': "Levi's Stadium, Santa Clara",
  'Los Ángeles': 'SoFi Stadium, Inglewood',
  'Vancouver': 'BC Place, Vancouver',
  'Seattle': 'Lumen Field, Seattle',
  'Nueva York/NJ': 'MetLife Stadium, East Rutherford',
  'Boston': 'Gillette Stadium, Foxborough',
  'Houston': 'NRG Stadium, Houston',
  'Kansas City': 'Arrowhead Stadium, Kansas City',
  'Filadelfia': 'Lincoln Financial Field, Philadelphia',
  'Miami': 'Hard Rock Stadium, Miami',
  'Dallas': 'AT&T Stadium, Arlington',
  'La Paz': 'Estadio Hernando Siles, La Paz',
  'Potosí': 'Estadio Víctor Agustín Ugarte, Potosí',
  'Santa Cruz': 'Estadio Ramón Tahuichi Aguilera, Santa Cruz',
  'Sucre': 'Estadio Patria, Sucre',
  'Oruro': 'Estadio Jesús Bermúdez, Oruro',
  'Cochabamba': 'Estadio Félix Capriles, Cochabamba',
  'Beni': 'Estadio Gran Mamoré, Trinidad',
  'Pando': 'Estadio Roberto Jordán Cuéllar, Cobija',
  'Tarija': 'Estadio IV Centenario, Tarija'
};

function isChatOpen(match: any): boolean {
  if (match.estado === 'live') return true;
  if (match.estado === 'finished' && match.updated_at) {
    return Date.now() - new Date(match.updated_at).getTime() < 30 * 60 * 1000;
  }
  return false;
}

export default function MatchInfoModal({ match, prediction, onBet, onClose }: MatchInfoModalProps) {
  const { predictionCloseMinutes, user } = useApp();
  const chatOpen = isChatOpen(match);
  const showChatSection = match.estado === 'live' || match.estado === 'finished';
  const isArbitro = user && (user.tipo === 'admin' || user.tipo === 'superadmin' || (user as any).is_moderador === true);

  const [messages, setMessages] = useState<any[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [reactions, setReactions] = useState<Record<string, number>>({});
  const [myReaction, setMyReaction] = useState<string | null>(null);
  const [chatTab, setChatTab] = useState<'chat' | 'info'>(showChatSection ? 'chat' : 'info');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  const fetchChat = async () => {
    try {
      const res = await fetch(`/api/matches/${match.id}/chat?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch {}
  };

  const fetchReactions = async () => {
    try {
      const res = await fetch(`/api/matches/${match.id}/reactions?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setReactions(data.counts || {});
        setMyReaction(data.myReaction || null);
      }
    } catch {}
  };

  useEffect(() => {
    if (!showChatSection) return;
    setChatLoading(true);
    Promise.all([fetchChat(), fetchReactions()]).finally(() => setChatLoading(false));
    // Auto-refresh solo cuando el chat está abierto (partido en vivo o 30 min post)
    if (!chatOpen) return;
    const interval = setInterval(() => { fetchChat(); fetchReactions(); }, 5000);
    return () => clearInterval(interval);
  }, [match.id, showChatSection, chatOpen]);

  useEffect(() => {
    if (chatTab === 'chat') scrollToBottom();
  }, [messages, chatTab]);

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/matches/${match.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: newMessage.trim() }),
      });
      if (res.ok) {
        const msg = await res.json();
        setMessages(prev => [...prev, msg]);
        setNewMessage('');
        setTimeout(scrollToBottom, 50);
      }
    } catch {}
    setSending(false);
  };

  const handleReaction = async (emoji: string) => {
    if (!user) return;
    try {
      const res = await fetch(`/api/matches/${match.id}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reaction: emoji }),
      });
      if (res.ok) {
        const data = await res.json();
        setReactions(data.counts || {});
        setMyReaction(data.myReaction || null);
      }
    } catch {}
  };

  const handleDeleteMessage = async (msgId: number) => {
    try {
      const res = await fetch(`/api/matches/${match.id}/chat/${msgId}`, { method: 'DELETE' });
      if (res.ok) {
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, deleted_at: new Date().toISOString(), message: null } : m));
      }
    } catch {}
  };
  const localTrivia = TEAM_TRIVIA[match.local] || {
    trivia: `${match.local} busca hacer historia en esta edición de la Copa del Mundo y consolidarse como una potencia de su confederación.`,
    news: `La delegación de ${match.local} se muestra concentrada y enfocada en los entrenamientos diarios.`
  };
  const visitanteTrivia = TEAM_TRIVIA[match.visitante] || {
    trivia: `${match.visitante} viene con una generación de futbolistas talentosos dispuestos a sorprender a los favoritos y avanzar a la fase eliminatoria.`,
    news: `Los seleccionados de ${match.visitante} destacan la importancia del orden táctico y el compañerismo.`
  };

  const stadiumName = STADIUM_MAPPING[match.estadio] || match.estadio || 'Estadio de Futbol';
  const stadiumQuery = stadiumName;
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stadiumQuery)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto" onClick={onClose}>
      <div 
        className="glass-card border border-neutral-800/80 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6 my-auto shadow-2xl space-y-6 animate-slide-in-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center border-b border-neutral-800/50 pb-4">
          <div>
            <h3 className="text-sm font-black uppercase text-neutral-100 tracking-wider flex items-center gap-2 font-sans">
              ℹ️ Novedades del Partido
            </h3>
            <p className="text-[10px] text-neutral-500 mt-0.5 font-mono">Detalles, estadio, curiosidades y noticias</p>
          </div>
          <button onClick={onClose} className="bg-neutral-950 hover:bg-neutral-800 text-neutral-400 p-2 rounded-full border border-neutral-850 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Match Matchup Row */}
        <div className="bg-neutral-950/40 border border-neutral-900 rounded-xl p-4 sm:p-5 flex items-center justify-center gap-2 sm:gap-6 shadow-inner w-full">
          {/* Local */}
          <div className="flex flex-col items-center justify-center flex-1 min-w-0 text-center">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-2xl sm:text-3xl shadow-inner select-none flex-shrink-0">
              {getTeamFlag(match.local)}
            </div>
            <span className="text-[10px] sm:text-xs font-black text-neutral-100 uppercase mt-1.5 w-full block truncate tracking-wider leading-tight">
              {match.local}
            </span>
          </div>

          {/* VS / Score */}
          <div className="flex flex-col items-center justify-center flex-shrink-0 px-2 min-w-[60px] sm:min-w-[80px]">
            <span className="bg-neutral-900 border border-neutral-800 px-3 py-1.5 rounded font-mono text-xs sm:text-sm font-black text-neutral-300">
              {match.estado !== 'upcoming' ? `${match.goles_local} - ${match.goles_visitante}` : 'VS'}
            </span>
            <span className="text-[8px] sm:text-[9px] text-neutral-500 uppercase tracking-widest mt-2 font-mono whitespace-nowrap">
              {match.estado === 'live' ? 'En Vivo' : match.estado === 'finished' ? 'Finalizado' : 'Próximamente'}
            </span>
          </div>

          {/* Visitante */}
          <div className="flex flex-col items-center justify-center flex-1 min-w-0 text-center">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-2xl sm:text-3xl shadow-inner select-none flex-shrink-0">
              {getTeamFlag(match.visitante)}
            </div>
            <span className="text-[10px] sm:text-xs font-black text-neutral-100 uppercase mt-1.5 w-full block truncate tracking-wider leading-tight">
              {match.visitante}
            </span>
          </div>
        </div>

        {/* Chat / Info tabs — live y finalizado (lectura siempre; escritura solo cuando chatOpen) */}
        {showChatSection && (
          <div className="space-y-3">
            {/* Tab selector */}
            <div className="flex bg-neutral-900/50 rounded-xl p-1 border border-neutral-850">
              <button onClick={() => setChatTab('chat')}
                className={`flex-1 py-1.5 text-[11px] font-black uppercase tracking-wider rounded-lg transition flex items-center justify-center gap-1.5 ${chatTab === 'chat' ? 'bg-neutral-800 text-neutral-100 shadow' : 'text-neutral-500 hover:text-neutral-300'}`}>
                <MessageCircle className="w-3.5 h-3.5" />
                Chat en Vivo
                {messages.length > 0 && <span className="bg-yellow-500 text-neutral-950 text-[9px] font-black px-1.5 py-0.5 rounded-full">{messages.length}</span>}
              </button>
              <button onClick={() => setChatTab('info')}
                className={`flex-1 py-1.5 text-[11px] font-black uppercase tracking-wider rounded-lg transition ${chatTab === 'info' ? 'bg-neutral-800 text-neutral-100 shadow' : 'text-neutral-500 hover:text-neutral-300'}`}>
                Info del Partido
              </button>
            </div>

            {/* Reacciones */}
            <div className="flex flex-wrap gap-1.5 justify-center">
              {REACTIONS.map(emoji => {
                const count = reactions[emoji] || 0;
                const isMe = myReaction === emoji;
                return (
                  <button key={emoji} onClick={() => handleReaction(emoji)}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-sm font-bold border transition active:scale-95 ${
                      isMe ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400' : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:border-yellow-500/30 hover:bg-neutral-800'
                    } ${!user ? 'cursor-default opacity-60' : ''}`}
                    disabled={!user}>
                    <span>{emoji}</span>
                    {count > 0 && <span className="text-[10px] font-mono text-neutral-400">{count}</span>}
                  </button>
                );
              })}
            </div>

            {/* Chat messages */}
            {chatTab === 'chat' && (
              <div className="bg-neutral-950/60 border border-neutral-850 rounded-xl overflow-hidden">
                <div className="flex flex-col h-64 overflow-y-auto p-3 space-y-2 scroll-smooth">
                  {chatLoading && messages.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-neutral-500 text-xs">Cargando mensajes...</div>
                  ) : messages.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-neutral-600 text-xs gap-2">
                      <MessageCircle className="w-8 h-8 opacity-30" />
                      <span>Sé el primero en comentar este partido</span>
                    </div>
                  ) : (
                    messages.map(msg => (
                      <div key={msg.id} className="flex gap-2 group">
                        <img src={msg.avatar && msg.avatar !== 'null' ? msg.avatar : 'https://stg00vm.blob.core.windows.net/jet00/default.webp'}
                          onError={e => { e.currentTarget.src = 'https://stg00vm.blob.core.windows.net/jet00/default.webp'; }}
                          className="w-7 h-7 rounded-full border border-neutral-800 object-cover flex-shrink-0 mt-0.5 bg-neutral-900" alt="" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-1.5 flex-wrap">
                            <span className="text-[10px] font-black text-neutral-300">{msg.nombre}</span>
                            <span className="text-[9px] text-neutral-600 font-mono">{new Date(msg.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                            {isArbitro && !msg.deleted_at && (
                              <button onClick={() => handleDeleteMessage(msg.id)}
                                className="opacity-0 group-hover:opacity-100 text-red-500/70 hover:text-red-400 transition ml-auto flex-shrink-0"
                                title="Eliminar mensaje (árbitro)">
                                <Flag className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          {msg.deleted_at ? (
                            <p className="text-[11px] text-neutral-600 italic">Mensaje eliminado por árbitro 🚩</p>
                          ) : (
                            <p className="text-[12px] text-neutral-200 break-words leading-relaxed">{msg.message}</p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>
                {chatOpen && user && user.aprobado ? (
                  <div className="border-t border-neutral-850 p-2 flex gap-2">
                    <input
                      type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                      placeholder="Escribe un mensaje..." maxLength={300}
                      className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 placeholder-neutral-600 focus:border-yellow-500/50 focus:outline-none"
                    />
                    <button onClick={handleSend} disabled={sending || !newMessage.trim()}
                      className="bg-yellow-500 hover:bg-yellow-400 text-neutral-950 px-3 py-2 rounded-lg transition disabled:opacity-40 flex-shrink-0">
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="border-t border-neutral-850 px-3 py-2 text-[10px] text-neutral-600 text-center">
                    {!chatOpen ? '🔒 Chat cerrado — solo lectura del historial' : !user ? 'Inicia sesión para chatear' : 'Tu cuenta está pendiente de aprobación'}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Quick Bet / Prediction Info */}
        {(() => {
          const isClosed = match.estado !== 'upcoming' || new Date().getTime() >= new Date(match.fecha).getTime() - predictionCloseMinutes * 60 * 1000;
          if (prediction) {
            return (
              <div className="w-full bg-neutral-950 border border-neutral-850 rounded-xl p-5 flex flex-col items-center justify-center text-center gap-3 shadow-inner">
                <div>
                  <span className="text-[9px] font-black uppercase text-yellow-500 block tracking-widest">Tu Pronóstico Registrado</span>
                  <span className="text-2xl font-black text-neutral-100 font-mono mt-1.5 inline-block">
                    {prediction.pred_local} – {prediction.pred_visitante}
                  </span>
                </div>
                {!isClosed && onBet && (
                  <button
                    onClick={() => {
                      onClose();
                      onBet();
                    }}
                    className="bg-yellow-500 hover:bg-yellow-600 text-neutral-950 text-xs font-bold px-5 py-2.5 rounded-xl transition active:scale-95 uppercase tracking-wider font-sans shadow-[0_0_12px_rgba(234,179,8,0.2)]"
                  >
                    Editar Pronóstico ✏️
                  </button>
                )}
              </div>
            );
          } else if (!isClosed && onBet) {
            return (
              <button
                onClick={() => {
                  onClose();
                  onBet();
                }}
                className="w-full py-3.5 bg-yellow-500 hover:bg-yellow-600 text-neutral-950 text-xs font-black uppercase tracking-wider rounded-xl transition active:scale-[0.98] flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(234,179,8,0.2)] animate-pulse"
              >
                <span>⚽ Registrar Pronóstico Ahora</span>
              </button>
            );
          }
          return null;
        })()}

        {/* Info sections — ocultas cuando el tab chat está activo */}
        {(!showChatSection || chatTab === 'info') && <>

        {/* Live Match Statistics */}
        {(match.estado === 'live' || match.estado === 'finished' || (match.stats && Object.keys(match.stats).length > 0)) && (() => {
          const stats = match.stats || {};
          const hasStats = stats.possession_local !== undefined || stats.shots_local !== undefined || stats.fouls_local !== undefined || stats.yellow_cards_local !== undefined || stats.red_cards_local !== undefined || stats.corners_local !== undefined;
          
          if (!hasStats && !stats.time) return null;

          const possL = parseInt(stats.possession_local) || 50;
          const possV = parseInt(stats.possession_visitante) || 50;

          return (
            <div className="bg-neutral-900/40 border border-neutral-900 rounded-xl p-5 space-y-4">
              <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center justify-between border-b border-neutral-850 pb-2">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                  <span>Estadísticas del Partido {match.estado === 'live' && 'En Vivo'}</span>
                </span>
                {stats.time && (
                  <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded font-mono text-[10px] font-black uppercase tracking-wider animate-pulse">
                    ⏱️ {stats.time} {stats.extra_time ? `(${stats.extra_time})` : ''}
                  </span>
                )}
              </div>

              {/* Posesión bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold text-neutral-300">
                  <span>{possL}% Posesión</span>
                  <span>{possV}% Posesión</span>
                </div>
                <div className="w-full h-2.5 bg-neutral-950 rounded-full overflow-hidden flex border border-neutral-850">
                  <div className="h-full bg-yellow-500 transition-all duration-500" style={{ width: `${possL}%` }}></div>
                  <div className="h-full bg-neutral-700 transition-all duration-500" style={{ width: `${possV}%` }}></div>
                </div>
              </div>

              {/* Detailed metrics */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 pt-2 text-xs">
                {/* Tiros */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-[10px] text-neutral-500 uppercase font-black">
                    <span>{stats.shots_local ?? 0}</span>
                    <span>Tiros Totales</span>
                    <span>{stats.shots_visitante ?? 0}</span>
                  </div>
                  <div className="w-full h-1 bg-neutral-950 rounded-full overflow-hidden flex">
                    <div className="h-full bg-yellow-500" style={{ width: `${((parseInt(stats.shots_local) || 0) / ((parseInt(stats.shots_local) || 0) + (parseInt(stats.shots_visitante) || 0) || 1)) * 100}%` }}></div>
                    <div className="h-full bg-neutral-700" style={{ width: `${((parseInt(stats.shots_visitante) || 0) / ((parseInt(stats.shots_local) || 0) + (parseInt(stats.shots_visitante) || 0) || 1)) * 100}%` }}></div>
                  </div>
                </div>

                {/* Tiros de esquina */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-[10px] text-neutral-500 uppercase font-black">
                    <span>{stats.corners_local ?? 0}</span>
                    <span>Tiros de Esquina</span>
                    <span>{stats.corners_visitante ?? 0}</span>
                  </div>
                  <div className="w-full h-1 bg-neutral-950 rounded-full overflow-hidden flex">
                    <div className="h-full bg-yellow-500" style={{ width: `${((parseInt(stats.corners_local) || 0) / ((parseInt(stats.corners_local) || 0) + (parseInt(stats.corners_visitante) || 0) || 1)) * 100}%` }}></div>
                    <div className="h-full bg-neutral-700" style={{ width: `${((parseInt(stats.corners_visitante) || 0) / ((parseInt(stats.corners_local) || 0) + (parseInt(stats.corners_visitante) || 0) || 1)) * 100}%` }}></div>
                  </div>
                </div>

                {/* Faltas */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-[10px] text-neutral-500 uppercase font-black">
                    <span>{stats.fouls_local ?? 0}</span>
                    <span>Faltas</span>
                    <span>{stats.fouls_visitante ?? 0}</span>
                  </div>
                  <div className="w-full h-1 bg-neutral-950 rounded-full overflow-hidden flex">
                    <div className="h-full bg-yellow-500" style={{ width: `${((parseInt(stats.fouls_local) || 0) / ((parseInt(stats.fouls_local) || 0) + (parseInt(stats.fouls_visitante) || 0) || 1)) * 100}%` }}></div>
                    <div className="h-full bg-neutral-700" style={{ width: `${((parseInt(stats.fouls_visitante) || 0) / ((parseInt(stats.fouls_local) || 0) + (parseInt(stats.fouls_visitante) || 0) || 1)) * 100}%` }}></div>
                  </div>
                </div>

                {/* Tarjetas Amarillas */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-[10px] text-neutral-500 uppercase font-black">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-3.5 bg-yellow-450 rounded-sm border border-yellow-400 bg-yellow-500"></span>
                      <span>{stats.yellow_cards_local ?? 0}</span>
                    </span>
                    <span>Tarjetas Amarillas</span>
                    <span className="flex items-center gap-1">
                      <span>{stats.yellow_cards_visitante ?? 0}</span>
                      <span className="w-2.5 h-3.5 bg-yellow-450 rounded-sm border border-yellow-400 bg-yellow-500"></span>
                    </span>
                  </div>
                  <div className="w-full h-1 bg-neutral-950 rounded-full overflow-hidden flex">
                    <div className="h-full bg-yellow-500" style={{ width: `${((parseInt(stats.yellow_cards_local) || 0) / ((parseInt(stats.yellow_cards_local) || 0) + (parseInt(stats.yellow_cards_visitante) || 0) || 1)) * 100}%` }}></div>
                    <div className="h-full bg-neutral-700" style={{ width: `${((parseInt(stats.yellow_cards_visitante) || 0) / ((parseInt(stats.yellow_cards_local) || 0) + (parseInt(stats.yellow_cards_visitante) || 0) || 1)) * 100}%` }}></div>
                  </div>
                </div>

                {/* Tarjetas Rojas */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-[10px] text-neutral-500 uppercase font-black">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-3.5 bg-red-650 rounded-sm border border-red-500 bg-red-600"></span>
                      <span>{stats.red_cards_local ?? 0}</span>
                    </span>
                    <span>Tarjetas Rojas</span>
                    <span className="flex items-center gap-1">
                      <span>{stats.red_cards_visitante ?? 0}</span>
                      <span className="w-2.5 h-3.5 bg-red-650 rounded-sm border border-red-500 bg-red-600"></span>
                    </span>
                  </div>
                  <div className="w-full h-1 bg-neutral-950 rounded-full overflow-hidden flex">
                    <div className="h-full bg-yellow-500" style={{ width: `${((parseInt(stats.red_cards_local) || 0) / ((parseInt(stats.red_cards_local) || 0) + (parseInt(stats.red_cards_visitante) || 0) || 1)) * 100}%` }}></div>
                    <div className="h-full bg-neutral-700" style={{ width: `${((parseInt(stats.red_cards_visitante) || 0) / ((parseInt(stats.red_cards_local) || 0) + (parseInt(stats.red_cards_visitante) || 0) || 1)) * 100}%` }}></div>
                  </div>
                </div>

                {/* Tiros al Arco */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-[10px] text-neutral-500 uppercase font-black">
                    <span>{stats.shots_on_target_local ?? 0}</span>
                    <span>Tiros al Arco</span>
                    <span>{stats.shots_on_target_visitante ?? 0}</span>
                  </div>
                  <div className="w-full h-1 bg-neutral-950 rounded-full overflow-hidden flex">
                    <div className="h-full bg-yellow-500" style={{ width: `${((parseInt(stats.shots_on_target_local) || 0) / ((parseInt(stats.shots_on_target_local) || 0) + (parseInt(stats.shots_on_target_visitante) || 0) || 1)) * 100}%` }}></div>
                    <div className="h-full bg-neutral-700" style={{ width: `${((parseInt(stats.shots_on_target_visitante) || 0) / ((parseInt(stats.shots_on_target_local) || 0) + (parseInt(stats.shots_on_target_visitante) || 0) || 1)) * 100}%` }}></div>
                  </div>
                </div>

                {/* Asistencias */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-[10px] text-neutral-500 uppercase font-black">
                    <span>{stats.assists_local ?? 0}</span>
                    <span>Asistencias</span>
                    <span>{stats.assists_visitante ?? 0}</span>
                  </div>
                  <div className="w-full h-1 bg-neutral-950 rounded-full overflow-hidden flex">
                    <div className="h-full bg-yellow-500" style={{ width: `${((parseInt(stats.assists_local) || 0) / ((parseInt(stats.assists_local) || 0) + (parseInt(stats.assists_visitante) || 0) || 1)) * 100}%` }}></div>
                    <div className="h-full bg-neutral-700" style={{ width: `${((parseInt(stats.assists_visitante) || 0) / ((parseInt(stats.assists_local) || 0) + (parseInt(stats.assists_visitante) || 0) || 1)) * 100}%` }}></div>
                  </div>
                </div>

                {/* Ocasiones Creadas */}
                <div className="flex flex-col gap-1.5 col-span-2 md:col-span-1">
                  <div className="flex justify-between text-[10px] text-neutral-500 uppercase font-black">
                    <span>{stats.shot_assists_local ?? 0}</span>
                    <span>Ocasiones Creadas</span>
                    <span>{stats.shot_assists_visitante ?? 0}</span>
                  </div>
                  <div className="w-full h-1 bg-neutral-950 rounded-full overflow-hidden flex">
                    <div className="h-full bg-yellow-500" style={{ width: `${((parseInt(stats.shot_assists_local) || 0) / ((parseInt(stats.shot_assists_local) || 0) + (parseInt(stats.shot_assists_visitante) || 0) || 1)) * 100}%` }}></div>
                    <div className="h-full bg-neutral-700" style={{ width: `${((parseInt(stats.shot_assists_visitante) || 0) / ((parseInt(stats.shot_assists_local) || 0) + (parseInt(stats.shot_assists_visitante) || 0) || 1)) * 100}%` }}></div>
                  </div>
                </div>
              </div>

              {/* Referee / Temperature info */}
              {(stats.arbitro || stats.temperatura) && (
                <div className="flex gap-4 border-t border-neutral-850 pt-3 text-[10px] text-neutral-500 uppercase font-mono justify-between">
                  {stats.arbitro && <span>👤 Árbitro: <strong className="text-neutral-300 font-sans">{stats.arbitro}</strong></span>}
                  {stats.temperatura && <span>🌡️ Clima/Temp: <strong className="text-neutral-300 font-sans">{stats.temperatura}</strong></span>}
                </div>
              )}
            </div>
          );
        })()}

        {/* Live Match Events Timeline */}
        {match.stats?.events && match.stats.events.length > 0 && (() => {
          // Sort events by clock/minute
          const sortedEvents = [...match.stats.events].sort((a, b) => {
            const minA = parseInt(a.clock) || 0;
            const minB = parseInt(b.clock) || 0;
            return minA - minB;
          });

          return (
            <div className="bg-neutral-900/40 border border-neutral-900 rounded-xl p-5 space-y-4">
              <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-neutral-850 pb-2">
                <span>⚡ Incidencias del Partido</span>
              </div>
              <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1">
                {sortedEvents.map((ev: any, idx: number) => {
                  const isLocal = ev.team === 'local';
                  const icon = ev.type === 'goals' ? '⚽' : ev.type === 'yellow_cards' ? '🟨' : '🟥';
                  return (
                    <div key={idx} className={`flex items-center gap-3 text-xs ${isLocal ? 'justify-start' : 'justify-end text-right'}`}>
                      {isLocal ? (
                        <>
                          <span className="font-mono text-neutral-500 font-bold bg-neutral-950 px-1.5 py-0.5 rounded border border-neutral-850 text-[10px]">{ev.clock}</span>
                          <span className="text-[14px] leading-none select-none">{icon}</span>
                          <span className="text-neutral-250 font-black tracking-wide">{ev.player}</span>
                        </>
                      ) : (
                        <>
                          <span className="text-neutral-250 font-black tracking-wide">{ev.player}</span>
                          <span className="text-[14px] leading-none select-none">{icon}</span>
                          <span className="font-mono text-neutral-500 font-bold bg-neutral-950 px-1.5 py-0.5 rounded border border-neutral-850 text-[10px]">{ev.clock}</span>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Match metadata & Stadium map */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-neutral-900/40 border border-neutral-900 rounded-xl p-4 space-y-3">
            <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-neutral-850 pb-1.5">
              <Calendar className="w-3.5 h-3.5 text-yellow-500" />
              <span>Datos del Partido</span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-neutral-500">Fecha y Hora:</span>
                <span className="font-semibold text-neutral-300 font-mono">
                  {new Date(match.fecha).toLocaleString('es-ES', { timeZone: 'America/La_Paz', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Fase del Torneo:</span>
                <span className="font-semibold text-neutral-300">{match.fase}</span>
              </div>
              {match.grupo && (
                <div className="flex justify-between">
                  <span className="text-neutral-500">Grupo:</span>
                  <span className="font-semibold text-neutral-300">Grupo {match.grupo}</span>
                </div>
              )}
              {match.estadio && (
                <div className="flex justify-between">
                  <span className="text-neutral-500">Sede:</span>
                  <span className="font-semibold text-neutral-300 text-right">{match.estadio}</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-neutral-900/40 border border-neutral-900 rounded-xl p-4 flex flex-col justify-between space-y-3">
            <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-neutral-850 pb-1.5">
              <MapPin className="w-3.5 h-3.5 text-yellow-500" />
              <span>Mapa y Ubicación</span>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center p-2 text-center bg-neutral-950 rounded-lg border border-neutral-850 overflow-hidden min-h-[180px]">
              <p className="text-[10px] text-neutral-400 font-semibold mb-2">{stadiumName}</p>
              {match.estadio ? (
                <div className="w-full flex-1 rounded overflow-hidden mb-2 border border-neutral-800">
                  <iframe
                    title="Mapa del Estadio"
                    width="100%"
                    height="120"
                    style={{ border: 0, filter: 'invert(90%) hue-rotate(180deg)' }}
                    loading="lazy"
                    src={`https://maps.google.com/maps?q=${encodeURIComponent(stadiumQuery)}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                  ></iframe>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-neutral-600 text-[10px] italic py-6">
                  Ubicación no disponible
                </div>
              )}
              <a 
                href={googleMapsUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-yellow-500 hover:bg-yellow-600 text-neutral-950 text-[10px] font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-lg transition active:scale-95 inline-flex items-center gap-1 font-sans mt-auto"
              >
                <MapPin className="w-3 h-3" />
                <span>Ver en Google Maps</span>
              </a>
            </div>
          </div>
        </div>

        {/* Curiosities & Trivia */}
        <div className="bg-neutral-900/40 border border-neutral-900 rounded-xl p-4 space-y-3.5">
          <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-neutral-850 pb-1.5">
            <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
            <span>Curiosidades e Historial</span>
          </div>
          <div className="space-y-3 text-xs leading-relaxed">
            <div className="bg-neutral-950/50 border border-neutral-850/60 p-3 rounded-lg">
              <span className="inline-block text-[9px] font-bold uppercase bg-neutral-800 text-neutral-300 px-1.5 py-0.5 rounded mb-1.5">{match.local}</span>
              <p className="text-neutral-400">{localTrivia.trivia}</p>
            </div>
            <div className="bg-neutral-950/50 border border-neutral-850/60 p-3 rounded-lg">
              <span className="inline-block text-[9px] font-bold uppercase bg-neutral-800 text-neutral-300 px-1.5 py-0.5 rounded mb-1.5">{match.visitante}</span>
              <p className="text-neutral-400">{visitanteTrivia.trivia}</p>
            </div>
          </div>
        </div>

        {/* Team News */}
        <div className="bg-neutral-900/40 border border-neutral-900 rounded-xl p-4 space-y-3.5">
          <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-neutral-850 pb-1.5">
            <Newspaper className="w-3.5 h-3.5 text-yellow-500" />
            <span>Noticias de los Equipos</span>
          </div>
          <div className="space-y-3 text-xs leading-relaxed">
            <div className="p-3 bg-neutral-950/50 border border-neutral-850/60 rounded-lg flex items-start gap-2.5">
              <div className="text-lg mt-0.5">{getTeamFlag(match.local)}</div>
              <div>
                <span className="text-[9px] font-mono text-neutral-500 block">NOTICIA RECIENTE</span>
                <p className="text-neutral-300 font-semibold">{localTrivia.news}</p>
              </div>
            </div>
            <div className="p-3 bg-neutral-950/50 border border-neutral-850/60 rounded-lg flex items-start gap-2.5">
              <div className="text-lg mt-0.5">{getTeamFlag(match.visitante)}</div>
              <div>
                <span className="text-[9px] font-mono text-neutral-500 block">NOTICIA RECIENTE</span>
                <p className="text-neutral-300 font-semibold">{visitanteTrivia.news}</p>
              </div>
            </div>
          </div>
        </div>

        </> /* end info sections */}

        <div className="flex justify-end pt-2 border-t border-neutral-800/50">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold uppercase tracking-wider rounded-xl transition font-sans"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
