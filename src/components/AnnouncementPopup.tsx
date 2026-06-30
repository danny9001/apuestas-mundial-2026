'use client';

import { useState, useEffect } from 'react';
import { X, Megaphone, Info, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

interface Popup {
  id: number;
  titulo: string;
  contenido: string;
  tipo: 'info' | 'success' | 'warning' | 'error';
}

interface AnnouncementPopupProps {
  user: any;
}

const TYPE_CONFIG = {
  info:    { icon: Info,          bg: 'bg-blue-500/10',    border: 'border-blue-500/30',   title: 'text-blue-300',   badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30',   btn: 'bg-blue-500 hover:bg-blue-400 text-white' },
  success: { icon: CheckCircle,   bg: 'bg-green-500/10',   border: 'border-green-500/30',  title: 'text-green-300',  badge: 'bg-green-500/20 text-green-300 border-green-500/30', btn: 'bg-green-500 hover:bg-green-400 text-white' },
  warning: { icon: AlertTriangle, bg: 'bg-yellow-500/10',  border: 'border-yellow-500/30', title: 'text-yellow-300', badge: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30', btn: 'bg-yellow-500 hover:bg-yellow-400 text-neutral-950 font-black' },
  error:   { icon: XCircle,       bg: 'bg-red-500/10',     border: 'border-red-500/30',    title: 'text-red-300',    badge: 'bg-red-500/20 text-red-300 border-red-500/30',       btn: 'bg-red-500 hover:bg-red-400 text-white' },
};

export default function AnnouncementPopup({ user }: AnnouncementPopupProps) {
  const [popups, setPopups] = useState<Popup[]>([]);
  const [current, setCurrent] = useState(0);
  const [visible, setVisible] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetch(`/api/notifications?popup=true&t=${Date.now()}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setPopups(data);
          setCurrent(0);
          setVisible(true);
        }
      })
      .catch(() => {});
  }, [user?.id]);

  const markRead = async (id: number) => {
    await fetch('/api/notifications/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationId: id }),
    }).catch(() => {});
  };

  const dismiss = async () => {
    if (dismissing) return;
    setDismissing(true);
    const popup = popups[current];
    if (popup) await markRead(popup.id);

    if (current + 1 < popups.length) {
      setCurrent(c => c + 1);
      setDismissing(false);
    } else {
      setVisible(false);
    }
  };

  if (!visible || popups.length === 0) return null;

  const popup = popups[current];
  const cfg = TYPE_CONFIG[popup.tipo] || TYPE_CONFIG.info;
  const Icon = cfg.icon;
  const total = popups.length;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      {/* Overlay */}
      <div className="absolute inset-0 bg-neutral-950/80 backdrop-blur-sm" />

      {/* Modal */}
      <div className={`relative w-full max-w-md rounded-2xl border shadow-2xl ${cfg.bg} ${cfg.border} animate-fade-in`}>
        {/* Header */}
        <div className={`flex items-start justify-between gap-3 px-5 pt-5 pb-4 border-b ${cfg.border}`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center border ${cfg.badge}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className={`font-black text-[13px] leading-tight ${cfg.title}`}>{popup.titulo}</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Megaphone className="w-2.5 h-2.5 text-neutral-500 flex-shrink-0" />
                <span className="text-[9px] text-neutral-500 font-bold uppercase tracking-widest">Novedades</span>
                {total > 1 && (
                  <span className="text-[9px] text-neutral-500 font-mono ml-1">{current + 1} / {total}</span>
                )}
              </div>
            </div>
          </div>
          <button onClick={dismiss} aria-label="Cerrar"
            className="flex-shrink-0 text-neutral-500 hover:text-neutral-200 transition p-1 rounded-lg hover:bg-neutral-800/50">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4">
          <p className="text-neutral-200 text-[13px] leading-relaxed whitespace-pre-wrap">{popup.contenido}</p>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex items-center justify-between gap-3">
          {total > 1 && (
            <div className="flex gap-1">
              {popups.map((_, i) => (
                <span key={i} className={`w-1.5 h-1.5 rounded-full transition ${i === current ? 'bg-neutral-300' : 'bg-neutral-700'}`} />
              ))}
            </div>
          )}
          <button onClick={dismiss} disabled={dismissing}
            className={`ml-auto px-5 py-2 rounded-xl text-[12px] font-black uppercase tracking-wider transition active:scale-95 disabled:opacity-60 ${cfg.btn}`}>
            {total > 1 && current + 1 < total ? 'Siguiente →' : '✓ Ya lo vi'}
          </button>
        </div>
      </div>
    </div>
  );
}
