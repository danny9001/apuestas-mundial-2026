'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, ArrowLeft } from 'lucide-react';

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/notifications')
      .then(res => res.json())
      .then(data => {
        setNotifications(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-black text-neutral-200 p-6 md:p-12 font-sans selection:bg-yellow-500/30">
      <div className="max-w-3xl mx-auto space-y-6">
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-2 text-neutral-400 hover:text-neutral-100 transition text-sm font-bold uppercase tracking-wider"
        >
          <ArrowLeft className="w-4 h-4" /> Volver
        </button>

        <div className="flex items-center gap-3 border-b border-neutral-800 pb-4">
          <Bell className="w-6 h-6 text-yellow-500" />
          <h1 className="text-2xl font-black uppercase tracking-widest text-neutral-100">
            Historial de Notificaciones
          </h1>
        </div>

        {loading ? (
          <div className="py-12 text-center text-neutral-500 animate-pulse font-mono uppercase tracking-widest text-sm">
            Cargando historial...
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-12 text-center text-neutral-500 italic">
            No tienes notificaciones en tu historial.
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map(n => (
              <div 
                key={n.id} 
                className={`p-5 rounded-2xl border transition ${
                  !n.leido 
                    ? 'bg-yellow-500/5 border-yellow-500/20 text-neutral-200' 
                    : 'bg-neutral-950 border-neutral-850 text-neutral-400'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg">{n.titulo}</h3>
                  <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-500">
                    {new Date(n.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm leading-relaxed">{n.contenido}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
