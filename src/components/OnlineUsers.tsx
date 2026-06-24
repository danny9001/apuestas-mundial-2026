'use client';

import { useEffect, useState, useRef } from 'react';

interface OnlineUser {
  id: number;
  nombre: string;
  avatar: string;
  tipo: string;
  last_seen_at: string;
}

const DEFAULT_AVATAR = 'https://stg00vm.blob.core.windows.net/jet00/default.webp';

function Avatar({ u, size = 28 }: { u: OnlineUser; size?: number }) {
  const [tooltip, setTooltip] = useState(false);
  const src = u.avatar && u.avatar !== 'null' && u.avatar !== 'undefined' ? u.avatar : DEFAULT_AVATAR;
  const isDefault = !u.avatar || u.avatar === 'null' || u.avatar === 'undefined' || u.avatar.includes('default.webp') || u.avatar.includes('avatar_5.png');

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}
      onMouseEnter={() => setTooltip(true)} onMouseLeave={() => setTooltip(false)}>
      <img
        src={src}
        alt={u.nombre}
        onError={e => { e.currentTarget.src = DEFAULT_AVATAR; }}
        className={`rounded-full border-2 border-neutral-900 object-cover w-full h-full ${isDefault ? 'bg-white' : 'bg-neutral-900'}`}
      />
      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-neutral-950" />
      {tooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-neutral-900 border border-neutral-700 rounded-lg text-[10px] font-bold text-neutral-200 whitespace-nowrap z-50 pointer-events-none shadow-xl">
          {u.nombre}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-neutral-700" />
        </div>
      )}
    </div>
  );
}

export default function OnlineUsers({ currentUserId }: { currentUserId?: number }) {
  const [users, setUsers] = useState<OnlineUser[]>([]);
  const [expanded, setExpanded] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetch_ = () =>
    fetch(`/api/online-users?t=${Date.now()}`)
      .then(r => r.ok ? r.json() : [])
      .then(d => Array.isArray(d) ? setUsers(d) : null)
      .catch(() => {});

  useEffect(() => {
    fetch_();
    intervalRef.current = setInterval(fetch_, 30_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  if (users.length === 0) return null;

  const MAX_VISIBLE = 12;
  const visible = expanded ? users : users.slice(0, MAX_VISIBLE);
  const overflow = users.length - MAX_VISIBLE;

  return (
    <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
            En línea ahora
          </span>
          <span className="text-[9px] font-black text-green-500 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full font-mono">
            {users.length}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        {visible.map(u => (
          <Avatar key={u.id} u={u} size={32} />
        ))}
        {!expanded && overflow > 0 && (
          <button
            onClick={() => setExpanded(true)}
            className="w-8 h-8 rounded-full bg-neutral-800 border-2 border-neutral-700 text-[9px] font-black text-neutral-400 hover:bg-neutral-700 transition flex items-center justify-center"
          >
            +{overflow}
          </button>
        )}
      </div>
    </div>
  );
}
