'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare, Bell, Send, X, AlertTriangle, Trash2, Pencil, RefreshCw
} from 'lucide-react';

interface NotificationsTabProps {
  user: any;
  companies: any[];
  groups: any[];
  adminUsers: any[];
  showToast: (msg: string) => void;
}

export default function NotificationsTab({
  user,
  companies,
  groups,
  adminUsers,
  showToast,
}: NotificationsTabProps) {
  const [notifTitulo, setNotifTitulo] = useState('');
  const [notifContenido, setNotifContenido] = useState('');
  const [notifTargetType, setNotifTargetType] = useState<'all' | 'group' | 'user' | 'company'>(
    user?.tipo === 'superadmin' ? 'all' : 'company'
  );
  const [notifTargetId, setNotifTargetId] = useState<number | null>(null);
  const [notifSubmitting, setNotifSubmitting] = useState(false);

  // Historial de mensajes enviados
  const [sentMessages, setSentMessages] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const [unbetMatches, setUnbetMatches] = useState<any[]>([]);
  const [loadingUnbet, setLoadingUnbet] = useState(false);
  const [showUnbetModal, setShowUnbetModal] = useState(false);

  const fetchSentMessages = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/chat?admin_history=true&t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setSentMessages(data);
      }
    } catch {
      // silently fail
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    fetchSentMessages();
  }, [fetchSentMessages]);

  const fetchUnbetUsers = async () => {
    setLoadingUnbet(true);
    try {
      const res = await fetch(`/api/admin/unbet?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setUnbetMatches(data);
        setShowUnbetModal(true);
      } else {
        showToast('Error al obtener lista de usuarios sin apuesta');
      }
    } catch {
      showToast('Error de red');
    } finally {
      setLoadingUnbet(false);
    }
  };

  const handleNotifyUnbetUsers = async (matchId: number, usersList: any[], local: string, visitante: string) => {
    try {
      const res = await fetch('/api/admin/unbet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'notify', matchId, usersList, local, visitante }),
      });
      if (res.ok) {
        const d = await res.json();
        showToast(`✅ Se enviaron ${d.notified_count} recordatorios`);
      } else {
        showToast('Error al enviar recordatorios');
      }
    } catch {
      showToast('Error de red');
    }
  };

  const handlePublishPublicUnbet = async (matchId: number, usersList: any[], local: string, visitante: string) => {
    try {
      const res = await fetch('/api/admin/unbet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'publish_public', matchId, usersList, local, visitante }),
      });
      if (res.ok) {
        showToast('✅ Aviso publicado en el chat');
      } else {
        showToast('Error al publicar aviso');
      }
    } catch {
      showToast('Error de red');
    }
  };

  const handleCreateNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotifSubmitting(true);
    try {
      const message = notifContenido.trim()
        ? `${notifTitulo.trim()}: ${notifContenido.trim()}`
        : notifTitulo.trim();
      const res = await fetch('/api/chat/system', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          target_type: notifTargetType,
          target_id: notifTargetId,
        }),
      });
      if (res.ok) {
        showToast('📣 Aviso publicado en el chat');
        setNotifTitulo('');
        setNotifContenido('');
        setNotifTargetType(user?.tipo === 'superadmin' ? 'all' : 'company');
        setNotifTargetId(null);
        fetchSentMessages();
      } else {
        const d = await res.json();
        showToast(d.error || 'Error al enviar aviso');
      }
    } catch {
      showToast('Error de red');
    } finally {
      setNotifSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest border-b border-neutral-800 pb-2 flex items-center gap-2">
        <MessageSquare className="w-3.5 h-3.5" /> Enviar Aviso al Chat
      </h3>
      <form onSubmit={handleCreateNotification} className="bg-neutral-900/40 border border-neutral-900 rounded-2xl p-5 space-y-4">
        <div className="text-xs font-bold text-neutral-300 uppercase tracking-wider">Publicar Aviso Oficial</div>
        <div className="space-y-1.5">
          <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest">Título</label>
          <input type="text" required value={notifTitulo} onChange={e => setNotifTitulo(e.target.value)} placeholder="Título del aviso" className="w-full input-stitch px-3 py-2 text-xs" />
        </div>
        <div className="space-y-1.5">
          <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest">Contenido (opcional)</label>
          <textarea value={notifContenido} onChange={e => setNotifContenido(e.target.value)} placeholder="Detalle adicional del aviso..." rows={3} className="w-full input-stitch px-3 py-2 text-xs resize-none" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest">Destinatario</label>
            <select value={notifTargetType} onChange={e => { setNotifTargetType(e.target.value as any); setNotifTargetId(null); }} className="w-full bg-neutral-950 border border-neutral-850 text-neutral-300 rounded-xl px-3 py-2 text-xs font-medium">
              {user.tipo === 'superadmin' ? (
                <>
                  <option value="all">🌐 Todos</option>
                  <option value="company">🏢 Empresa</option>
                  <option value="group">👥 Grupo</option>
                  <option value="user">👤 Usuario</option>
                </>
              ) : (
                <option value="company">🏢 Empresa</option>
              )}
            </select>
          </div>
          {notifTargetType === 'company' && (
            <div className="space-y-1.5">
              <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest">Empresa</label>
              <select value={notifTargetId || ''} onChange={e => setNotifTargetId(e.target.value ? parseInt(e.target.value) : null)} className="w-full bg-neutral-950 border border-neutral-850 text-neutral-300 rounded-xl px-3 py-2 text-xs font-medium">
                <option value="">Seleccionar empresa...</option>
                {companies.filter((c: any) => user.tipo === 'superadmin' || (user.companies || []).some((ac: any) => ac.id === c.id)).map((c: any) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
          )}
          {notifTargetType === 'group' && (
            <div className="space-y-1.5">
              <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest">Grupo</label>
              <select value={notifTargetId || ''} onChange={e => setNotifTargetId(e.target.value ? parseInt(e.target.value) : null)} className="w-full bg-neutral-950 border border-neutral-850 text-neutral-300 rounded-xl px-3 py-2 text-xs font-medium">
                <option value="">Seleccionar...</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
              </select>
            </div>
          )}
          {notifTargetType === 'user' && (
            <div className="space-y-1.5">
              <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest">Usuario</label>
              <select value={notifTargetId || ''} onChange={e => setNotifTargetId(e.target.value ? parseInt(e.target.value) : null)} className="w-full bg-neutral-950 border border-neutral-850 text-neutral-300 rounded-xl px-3 py-2 text-xs font-medium">
                <option value="">Seleccionar...</option>
                {adminUsers.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
              </select>
            </div>
          )}
        </div>
        <div className="flex justify-end pt-2">
          <button type="submit" disabled={notifSubmitting} className="bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-neutral-950 text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 transition active:scale-95">
            <Bell className="w-3.5 h-3.5" />
            <span>{notifSubmitting ? 'Enviando...' : 'Publicar en Chat'}</span>
          </button>
        </div>
      </form>

      {/* Automatics (admin & superadmin) */}
      {(user.tipo === 'superadmin' || user.tipo === 'admin') && (
        <div className="bg-neutral-900/40 border border-neutral-900 rounded-2xl p-5 space-y-3">
          <div className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
            <Send className="w-3.5 h-3.5 text-neutral-300" /> Notificaciones Automáticas
          </div>
          <p className="text-[10px] text-neutral-500">El scheduler envía avisos de partidos cada hora y rankings semanales los lunes. También puedes dispararlo manualmente.</p>
          <div className="flex gap-2 flex-wrap">
            <button type="button" onClick={async () => {
              const r = await fetch('/api/admin/notify-scheduled', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'matches', force: true }) });
              const d = await r.json();
              showToast(r.ok ? `✅ ${d.matches_notified ?? 0} avisos de partidos enviados` : d.error);
            }} className="text-[10px] font-bold px-3 py-1.5 rounded-lg border border-neutral-700/50 bg-neutral-800/50 text-neutral-300 hover:bg-neutral-700/50 transition">
              ⚽ Avisos de Partidos
            </button>
            <button type="button" onClick={async () => {
              const r = await fetch('/api/admin/notify-scheduled', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'rankings', force: true }) });
              const d = await r.json();
              showToast(r.ok ? `✅ Rankings enviados a ${d.companies_notified ?? 0} empresa(s)` : d.error);
            }} className="text-[10px] font-bold px-3 py-1.5 rounded-lg border border-purple-500/30 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition">
              📊 Rankings Semanales
            </button>
            <button type="button" onClick={fetchUnbetUsers} disabled={loadingUnbet} className="text-[10px] font-bold px-3 py-1.5 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition flex items-center gap-1.5 active:scale-95">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
              <span>{loadingUnbet ? 'Cargando...' : '🚫 Sin Apuesta (Próx. 12h)'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Historial de Mensajes Enviados ── */}
      <div className="bg-neutral-900/40 border border-neutral-900 rounded-2xl p-5 space-y-3">
        <div className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-3.5 h-3.5 text-neutral-400" />
            Mensajes Enviados
          </div>
          <button
            type="button"
            onClick={fetchSentMessages}
            disabled={loadingHistory}
            className="text-neutral-500 hover:text-neutral-300 transition disabled:opacity-40"
            title="Actualizar"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loadingHistory ? (
          <div className="text-[10px] text-neutral-500 py-4 text-center">Cargando...</div>
        ) : sentMessages.length === 0 ? (
          <div className="text-[10px] text-neutral-500 py-4 text-center">No hay mensajes enviados</div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {sentMessages.map((msg: any) => (
              <div key={msg.id} className="bg-neutral-950/60 border border-neutral-850 rounded-xl p-3 space-y-1.5">
                {editingId === msg.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={editingText}
                      onChange={e => setEditingText(e.target.value)}
                      rows={3}
                      className="w-full input-stitch px-3 py-2 text-xs resize-none"
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => { setEditingId(null); setEditingText(''); }}
                        className="text-[10px] font-bold px-3 py-1.5 rounded-lg border border-neutral-700/50 bg-neutral-800/50 text-neutral-400 hover:bg-neutral-700/50 transition"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        disabled={savingEdit}
                        onClick={async () => {
                          setSavingEdit(true);
                          try {
                            const r = await fetch(`/api/chat/${msg.id}`, {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ message: editingText }),
                            });
                            if (r.ok) {
                              showToast('✅ Mensaje actualizado');
                              setEditingId(null);
                              setEditingText('');
                              fetchSentMessages();
                            } else {
                              const d = await r.json();
                              showToast(d.error || 'Error al actualizar');
                            }
                          } catch {
                            showToast('Error de red');
                          } finally {
                            setSavingEdit(false);
                          }
                        }}
                        className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-yellow-500 hover:bg-yellow-600 text-neutral-950 transition disabled:opacity-50"
                      >
                        {savingEdit ? 'Guardando...' : 'Guardar'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="text-[11px] text-neutral-200 whitespace-pre-wrap break-words">{msg.message}</div>
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {msg.target_type && msg.target_type !== 'all' && (
                          <span className="text-[9px] bg-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide">
                            {msg.target_type === 'company' ? '🏢' : msg.target_type === 'group' ? '👥' : '👤'} {msg.target_nombre || msg.target_id}
                          </span>
                        )}
                        {msg.target_type === 'all' && (
                          <span className="text-[9px] bg-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide">🌐 Todos</span>
                        )}
                        <span className="text-[9px] text-neutral-600 font-mono">
                          {new Date(msg.created_at).toLocaleString('es-BO')}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => { setEditingId(msg.id); setEditingText(msg.message); }}
                          className="text-neutral-500 hover:text-yellow-400 transition"
                          title="Editar"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (!confirm('¿Eliminar este mensaje?')) return;
                            try {
                              const r = await fetch(`/api/chat/${msg.id}`, { method: 'DELETE' });
                              if (r.ok) {
                                showToast('Mensaje eliminado');
                                fetchSentMessages();
                              } else {
                                const d = await r.json();
                                showToast(d.error || 'Error al eliminar');
                              }
                            } catch {
                              showToast('Error de red');
                            }
                          }}
                          className="text-neutral-500 hover:text-red-400 transition"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── MODAL: Usuarios Sin Apuesta (Próx. 12h) ── */}
      {showUnbetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setShowUnbetModal(false)}>
          <div className="glass-card border border-neutral-800/80 rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-y-auto p-6 shadow-2xl space-y-5" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-neutral-800/50 pb-4">
              <div>
                <h3 className="text-sm font-black uppercase text-neutral-100 tracking-wider flex items-center gap-2 font-sans">
                  🚫 Usuarios Sin Apuesta (Próximas 12 horas)
                </h3>
                <p className="text-[10px] text-neutral-500 mt-0.5 font-mono">Participantes que no han registrado su pronóstico</p>
              </div>
              <button onClick={() => setShowUnbetModal(false)} className="text-neutral-500 hover:text-neutral-200 transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            {unbetMatches.length === 0 ? (
              <div className="p-12 text-center text-neutral-400 text-xs font-sans">
                🎉 ¡Todos los participantes han registrado sus apuestas para los partidos de las próximas 12 horas!
              </div>
            ) : (
              <div className="space-y-6">
                {unbetMatches.map((m: any) => (
                  <div key={m.match_id} className="bg-neutral-950/60 border border-neutral-850 rounded-xl p-4 space-y-3">
                    <div className="flex justify-between items-center flex-wrap gap-2 pb-2 border-b border-neutral-900">
                      <div>
                        <div className="text-xs font-bold text-neutral-200 font-sans">
                          ⚽ {m.local} vs {m.visitante}
                        </div>
                        <div className="text-[10px] text-neutral-500 font-mono">
                          {new Date(m.fecha).toLocaleString('es-BO')}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleNotifyUnbetUsers(m.match_id, m.users, m.local, m.visitante)}
                          className="bg-yellow-500 hover:bg-yellow-600 text-neutral-950 text-[10px] font-bold px-3 py-1.5 rounded-lg transition active:scale-95 font-sans"
                        >
                          ✉️ Recordar por Push
                        </button>
                        <button
                          onClick={() => handlePublishPublicUnbet(m.match_id, m.users, m.local, m.visitante)}
                          className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[10px] font-bold px-3 py-1.5 rounded-lg border border-neutral-700 transition active:scale-95 font-sans"
                        >
                          📢 Publicar en Chat
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                      {m.users.map((u: any) => (
                        <div key={u.id} className="bg-neutral-900/30 border border-neutral-900/60 rounded-lg p-2 flex items-center justify-between text-[11px] gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-neutral-300 truncate">{u.nombre}</div>
                            <div className="text-[9px] text-neutral-500 truncate">{u.email}</div>
                          </div>
                          <div className="flex flex-col items-end gap-0.5">
                            {u.companies && u.companies.length > 0 && (
                              <span className="text-[8px] bg-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded-full font-bold">
                                {u.companies[0].nombre}
                              </span>
                            )}
                            {u.telefono && (
                              <span className="text-[9px] text-neutral-500 font-mono">
                                📞 {u.telefono}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-neutral-800/50">
              <button
                onClick={() => setShowUnbetModal(false)}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold uppercase tracking-wider rounded-xl transition font-sans"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
