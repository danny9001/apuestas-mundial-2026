'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, X, Users, Trash2, Megaphone, Pencil, Download } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';

export default function ChatWidget() {
  const { user } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [messages, setMessages] = useState<any[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showUsersList, setShowUsersList] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const presencePollingRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch initial messages on mount to bootstrap chat state
  useEffect(() => {
    if (!user || !user.aprobado) return;
    fetchInitialMessages();
  }, [user]);

  // Reset unread count when chat is opened
  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
    }
  }, [isOpen]);
  const isSuperadmin = user?.tipo === 'superadmin';
  const isModerator =
    user?.tipo === 'superadmin' ||
    user?.tipo === 'admin' ||
    !!user?.is_moderador;

  // Scroll to bottom helper
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch online users
  const fetchOnlineUsers = async () => {
    try {
      const res = await fetch(`/api/online-users?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setOnlineUsers(data);
      }
    } catch (err) {
      console.error('Error fetching online users:', err);
    }
  };

  // Fetch initial/recent messages
  const fetchInitialMessages = async () => {
    try {
      const res = await fetch(`/api/chat?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
        setTimeout(scrollToBottom, 50);
      }
    } catch (err) {
      console.error('Error fetching chat messages:', err);
    }
  };

  // Fetch new messages since the last one
  const fetchNewMessages = async (sinceTime: string) => {
    try {
      const res = await fetch(`/api/chat?since=${encodeURIComponent(sinceTime)}&t=${Date.now()}`);
      if (res.ok) {
        const newMsgs: any[] = await res.json();
        if (newMsgs.length > 0) {
          setMessages((prev) => {
            // Filter duplicates by message ID
            const existingIds = new Set(prev.map((m) => m.id));
            const filteredNew = newMsgs.filter((m) => !existingIds.has(m.id));
            if (filteredNew.length === 0) return prev;
            return [...prev, ...filteredNew];
          });
          setTimeout(scrollToBottom, 50);
        }
      }
    } catch (err) {
      console.error('Error polling new messages:', err);
    }
  };

  // Setup periodic polling for online users when chat is open/closed
  useEffect(() => {
    if (!user || !user.aprobado) return;

    fetchOnlineUsers();
    presencePollingRef.current = setInterval(fetchOnlineUsers, 15000);

    return () => {
      if (presencePollingRef.current) clearInterval(presencePollingRef.current);
    };
  }, [user]);

  // Setup message polling when modal is open
  useEffect(() => {
    if (!isOpen) {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      return;
    }

    fetchInitialMessages();

    // Start polling every 3 seconds
    pollingRef.current = setInterval(() => {
      // Find the latest message timestamp
      setMessages((currentMessages) => {
        const latestMsg = currentMessages[currentMessages.length - 1];
        const sinceTime = latestMsg ? latestMsg.created_at : new Date(Date.now() - 30 * 60 * 1000).toISOString();
        fetchNewMessages(sinceTime);
        return currentMessages;
      });
    }, 3000);

    // Listen to ESC key to close modal
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Realtime updates listener (enhances polling for instant updates if on same process/SSE)
  useEffect(() => {
    if (!user || !user.aprobado) return;

    const sse = new EventSource('/api/realtime');
    sse.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'chat') {
          const chatData = payload.data;
          if (chatData.deleted) {
            setMessages((prev) => prev.filter((m) => m.id !== chatData.id));
          } else if (chatData.updated) {
            setMessages((prev) =>
              prev.map((m) => (m.id === chatData.id ? { ...m, message: chatData.message } : m))
            );
          } else {
            setMessages((prev) => {
              if (prev.some((m) => m.id === chatData.id)) return prev;
              return [...prev, chatData];
            });
            if (isOpen) {
              setTimeout(scrollToBottom, 50);
            } else {
              setUnreadCount((prev) => prev + 1);
            }
          }
        }
      } catch (err) {}
    };

    return () => sse.close();
  }, [user, isOpen]);

  // Send message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || sending) return;

    const textToSend = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: textToSend }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.message) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === data.message.id)) return prev;
            return [...prev, data.message];
          });
          setTimeout(scrollToBottom, 50);
        }
      } else {
        const errData = await res.json();
        alert(errData.error || 'Error al enviar el mensaje');
      }
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setSending(false);
    }
  };

  // Update message
  const handleUpdateMessage = async (msgId: number) => {
    if (!editingText.trim()) return;

    try {
      const res = await fetch(`/api/chat/${msgId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: editingText.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setMessages((prev) =>
            prev.map((m) => (m.id === msgId ? { ...m, message: data.message.message } : m))
          );
          setEditingId(null);
        }
      } else {
        const errData = await res.json();
        alert(errData.error || 'Error al actualizar el mensaje');
      }
    } catch (err) {
      console.error('Error updating message:', err);
    }
  };

  // Delete message
  const handleDeleteMessage = async (msgId: number) => {
    if (!confirm('¿Estás seguro de eliminar este mensaje?')) return;

    try {
      const res = await fetch(`/api/chat/${msgId}`, { method: 'DELETE' });
      if (res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== msgId));
      } else {
        const errData = await res.json();
        alert(errData.error || 'Error al eliminar');
      }
    } catch (err) {
      console.error('Error deleting message:', err);
    }
  };

  // Export chat logs as CSV
  const handleExportChatLogs = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const res = await fetch(`/api/chat/export?t=${Date.now()}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al exportar los logs');
      }
      const data = await res.json();
      if (!Array.isArray(data)) {
        throw new Error('Formato de datos inválido');
      }

      // Build CSV
      const headers = ['ID Mensaje', 'ID Usuario', 'Nombre Usuario', 'Email Usuario', 'Mensaje', 'Es Sistema?', 'Fecha Creación', 'Fecha Eliminación', 'Eliminado Por ID', 'Eliminado Por Nombre'];
      const csvRows = [headers.join(',')];

      for (const row of data) {
        const values = [
          row.id,
          row.user_id || '',
          `"${(row.user_nombre || '').replace(/"/g, '""')}"`,
          `"${(row.user_email || '').replace(/"/g, '""')}"`,
          `"${(row.message || '').replace(/"/g, '""')}"`,
          row.is_system ? 'SI' : 'NO',
          row.created_at ? new Date(row.created_at).toLocaleString() : '',
          row.deleted_at ? new Date(row.deleted_at).toLocaleString() : '',
          row.deleted_by_id || '',
          `"${(row.deleted_by_nombre || '').replace(/"/g, '""')}"`
        ];
        csvRows.push(values.join(','));
      }

      const csvContent = '\uFEFF' + csvRows.join('\n'); // Add UTF-8 BOM for Excel compliance
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `moderacion_chat_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      console.error('Error exporting logs:', err);
      alert(err.message || 'Error al exportar logs de moderación');
    } finally {
      setExporting(false);
    }
  };

  if (!user || !user.aprobado) return null;

  return (
    <>
      {unreadCount > 0 && !isOpen && (
        <div className="fixed bottom-24 right-20 md:bottom-6 md:right-24 z-40 flex items-center pointer-events-none animate-pulse">
          <div className="bg-yellow-500 text-neutral-950 text-[10px] font-black px-3 py-1.5 rounded-2xl shadow-[0_8px_24px_rgba(234,179,8,0.3)] border border-yellow-400 flex flex-col items-center">
            <span>Tienes mensajes pendientes</span>
            <span className="text-[8px] font-bold opacity-80 mt-0.5">¡Mandá un mensaje!</span>
          </div>
          <div className="w-2 h-2 bg-yellow-500 rotate-45 -ml-1 border-t border-r border-yellow-400"></div>
        </div>
      )}

      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-4 md:bottom-6 md:right-6 z-40 flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-neutral-950 font-black shadow-[0_8px_32px_rgba(234,179,8,0.4)] border border-yellow-400/40 hover:scale-105 active:scale-95 transition-all duration-300 group"
        aria-label="Abrir Chat Global"
      >
        <MessageSquare className="w-6 h-6 transition-transform duration-300 group-hover:rotate-6" />
        {onlineUsers.length > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 px-1.5 items-center justify-center text-[10px] font-bold text-white bg-green-600 border-2 border-neutral-950 rounded-full shadow-lg">
            {onlineUsers.length}
          </span>
        )}
      </button>

      {/* Chat Modal / Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-0 sm:p-4 md:p-6 bg-neutral-950/80 backdrop-blur-md animate-fade-in">
          {/* Backdrop click to close */}
          <div className="absolute inset-0" onClick={() => setIsOpen(false)} />

          {/* Chat Container */}
          <div className="relative w-full h-full sm:h-[80vh] sm:max-h-[700px] sm:max-w-4xl bg-neutral-900 border border-neutral-800 sm:rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col z-10">
            
            {/* Header */}
            <div className="bg-neutral-950 border-b border-neutral-800 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500/10 rounded-xl text-yellow-500">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-neutral-100">Chat Global</h3>
                  <button
                    onClick={() => setShowUsersList(!showUsersList)}
                    className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider flex items-center gap-1.5 hover:text-yellow-500 transition"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>{onlineUsers.length} en línea</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowUsersList(!showUsersList)}
                  className="hidden sm:flex items-center gap-1.5 bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 px-3 py-1.5 rounded-xl text-xs font-bold text-neutral-300 transition"
                >
                  <Users className="w-4 h-4" />
                  <span>Usuarios</span>
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-xl transition"
                  aria-label="Cerrar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content Area (Messages + Users Sidebar) */}
            <div className="flex-1 flex overflow-hidden relative">
              
              {/* Messages List */}
              <div className="flex-1 flex flex-col bg-neutral-900/50 overflow-y-auto px-6 py-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                    <div className="p-4 bg-neutral-950 border border-neutral-850 rounded-full text-neutral-500 mb-3">
                      <MessageSquare className="w-8 h-8" />
                    </div>
                    <p className="text-xs text-neutral-500 font-bold uppercase tracking-wider">No hay mensajes aún</p>
                    <p className="text-[11px] text-neutral-500 max-w-[240px] mt-1 leading-normal">
                      Escribe un mensaje abajo para comenzar la conversación con todos los participantes.
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isOwn = msg.user_id === user.id;
                    const isSys = msg.is_system;

                    if (isSys) {
                      return (
                        <div key={msg.id} className="relative flex flex-col w-full group">
                          <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 p-4 rounded-xl flex items-start gap-3 shadow-md max-w-full">
                            <Megaphone className="w-5 h-5 shrink-0 text-yellow-500 animate-pulse mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <div className="text-[9px] font-black tracking-wider uppercase text-yellow-500 mb-0.5">
                                Aviso Oficial
                              </div>
                              <p className="text-xs leading-relaxed font-semibold break-words whitespace-pre-wrap">
                                {msg.message}
                              </p>
                              <div className="text-[9px] text-neutral-500 mt-2 font-mono">
                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                            {isSuperadmin && (
                              <button
                                onClick={() => handleDeleteMessage(msg.id)}
                                className="opacity-0 group-hover:opacity-100 p-1.5 bg-neutral-950/60 hover:bg-red-500/20 border border-neutral-800 hover:border-red-500/30 text-neutral-500 hover:text-red-400 rounded-lg transition"
                                title="Eliminar anuncio"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={msg.id}
                        className={`flex gap-3 max-w-[85%] relative group ${isOwn ? 'self-end flex-row-reverse' : 'self-start'}`}
                      >
                        {/* Avatar */}
                        {!isOwn && (
                          <img
                            src={(msg.user_avatar && msg.user_avatar !== 'null' && msg.user_avatar !== 'undefined') ? msg.user_avatar : 'https://stg00vm.blob.core.windows.net/jet00/default.webp'}
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = 'https://stg00vm.blob.core.windows.net/jet00/default.webp';
                            }}
                            className="w-8 h-8 rounded-full border border-neutral-800 shrink-0 object-cover bg-neutral-950"
                            alt="Avatar"
                          />
                        )}

                        {/* Bubble content */}
                        <div className="flex flex-col">
                          {!isOwn && (
                            <span className="text-[10px] font-bold text-neutral-400 mb-1 px-1 flex items-center gap-1.5">
                              {msg.user_nombre}
                              {msg.user_tipo === 'superadmin' && (
                                <span className="bg-red-500/10 border border-red-500/20 text-red-500 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider scale-90">
                                  ADMIN
                                </span>
                              )}
                            </span>
                          )}
                          <div className="relative flex items-center gap-2">
                            <div
                              className={`px-4 py-2.5 rounded-2xl break-words whitespace-pre-wrap text-xs font-semibold leading-relaxed shadow-sm ${
                                isOwn
                                  ? 'bg-gradient-to-r from-yellow-500 to-amber-600 text-white rounded-tr-none'
                                  : 'bg-neutral-850 text-neutral-200 border border-neutral-800 rounded-tl-none'
                              }`}
                            >
                              {editingId === msg.id ? (
                                <div className="flex flex-col gap-2 min-w-[200px] text-neutral-950">
                                  <textarea
                                    value={editingText}
                                    onChange={(e) => setEditingText(e.target.value)}
                                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-2.5 text-xs text-neutral-200 focus:outline-none focus:border-yellow-500 resize-none font-semibold"
                                    rows={2}
                                    maxLength={500}
                                  />
                                  <div className="flex justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setEditingId(null)}
                                      className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-750 border border-neutral-750 rounded-lg text-[10px] font-bold text-neutral-400 transition"
                                    >
                                      Cancelar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateMessage(msg.id)}
                                      disabled={!editingText.trim()}
                                      className="px-2.5 py-1 bg-yellow-500 hover:bg-yellow-600 rounded-lg text-[10px] font-bold text-neutral-950 transition disabled:opacity-50"
                                    >
                                      Guardar
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  {msg.message}
                                  <div
                                    className={`text-[8px] mt-1.5 text-right font-mono ${
                                      isOwn ? 'text-neutral-200' : 'text-neutral-500'
                                    }`}
                                  >
                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                </>
                              )}
                            </div>
                            
                            {/* Action Buttons (Edit/Delete) */}
                            {editingId !== msg.id && (isOwn || isModerator) && (
                              <div className="flex flex-col gap-1.5">
                                {(isOwn || isModerator) && (
                                  <button
                                    onClick={() => {
                                      setEditingId(msg.id);
                                      setEditingText(msg.message);
                                    }}
                                    className="opacity-100 md:opacity-0 md:group-hover:opacity-100 p-1.5 bg-neutral-850 hover:bg-yellow-500/20 border border-neutral-800 hover:border-yellow-500/30 text-neutral-500 hover:text-yellow-500 rounded-lg transition"
                                    title="Editar mensaje"
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDeleteMessage(msg.id)}
                                  className="opacity-100 md:opacity-0 md:group-hover:opacity-100 p-1.5 bg-neutral-850 hover:bg-red-500/20 border border-neutral-800 hover:border-red-500/30 text-neutral-500 hover:text-red-400 rounded-lg transition"
                                  title="Eliminar mensaje"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Online Users List Pane */}
              {showUsersList && (
                <div className="absolute inset-y-0 right-0 w-64 bg-neutral-950 border-l border-neutral-800 flex flex-col z-20 sm:relative animate-slide-in-right">
                  <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-neutral-200">
                      Usuarios en Línea
                    </span>
                    <button
                      onClick={() => setShowUsersList(false)}
                      className="sm:hidden text-neutral-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {onlineUsers.length === 0 ? (
                      <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider text-center py-4">
                        Nadie más conectado
                      </p>
                    ) : (
                      onlineUsers.map((u) => (
                        <div key={u.id} className="flex items-center gap-3 p-2 hover:bg-neutral-900 rounded-xl transition">
                          <div className="relative shrink-0">
                            <img
                              src={(u.avatar && u.avatar !== 'null' && u.avatar !== 'undefined') ? u.avatar : 'https://stg00vm.blob.core.windows.net/jet00/default.webp'}
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = 'https://stg00vm.blob.core.windows.net/jet00/default.webp';
                              }}
                              className="w-7 h-7 rounded-full border border-neutral-800 object-cover bg-neutral-950"
                              alt="Avatar"
                            />
                            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-neutral-950 rounded-full" />
                          </div>
                          <div className="truncate">
                            <div className="text-xs font-bold text-neutral-300 truncate">
                              {u.nombre}
                            </div>
                            <div className="text-[8px] text-neutral-500 uppercase tracking-widest font-mono">
                              {u.tipo}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendMessage} className="bg-neutral-950 border-t border-neutral-800 p-4 pb-safe flex gap-3">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Escribe un mensaje..."
                maxLength={500}
                className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-xs font-semibold text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-yellow-500 transition"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || sending}
                className="btn-primary-stitch px-5 py-3 rounded-xl flex items-center justify-center gap-2 text-xs uppercase tracking-wider font-bold transition disabled:opacity-40"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Enviar</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
