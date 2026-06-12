'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

interface AppUser {
  id: number;
  nombre: string;
  email: string;
  avatar: string;
  tipo: string;
  aprobado: boolean;
  denegado: boolean;
  telefono?: string;
  tincaso?: string;
  companies?: any[];
}

interface AppContextValue {
  user: AppUser | null;
  authChecked: boolean;
  appName: string;
  appLogo: string;
  notifications: any[];
  unreadCount: number;
  pushSubscribed: boolean;
  goalAlert: any | null;
  toastMessage: string | null;
  lastMatchUpdate: number;
  setUser: (u: AppUser | null) => void;
  setPushSubscribed: (v: boolean) => void;
  setGoalAlert: (v: any | null) => void;
  showToast: (msg: string) => void;
  fetchNotifications: () => Promise<void>;
  handleMarkNotificationRead: (id?: number) => Promise<void>;
  handleLogout: () => Promise<void>;
  handleIdentityLogin: () => void;
  handleTogglePush: () => Promise<void>;
  setAppName: (v: string) => void;
  setAppLogo: (v: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appName, setAppName] = useState('Mundial 2026');
  const [appLogo, setAppLogo] = useState('🏆');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [goalAlert, setGoalAlert] = useState<any | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [lastMatchUpdate, setLastMatchUpdate] = useState<number>(0);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMessage(null), 3500);
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch(`/api/notifications?t=${Date.now()}`);
      if (res.ok) {
        const data: any[] = await res.json();
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.leido).length);
      }
    } catch {}
  }, []);

  const handleMarkNotificationRead = useCallback(async (notificationId?: number) => {
    try {
      await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId }),
      });
      await fetchNotifications();
    } catch {}
  }, [fetchNotifications]);

  const handleLogout = useCallback(async () => {
    await fetch('/api/auth', { method: 'DELETE' });
    setUser(null);
    window.location.href = '/';
  }, []);

  const handleIdentityLogin = useCallback(() => {
    const callbackUrl = encodeURIComponent(`${window.location.origin}/api/auth/identity-callback?redirect=/dashboard`);
    window.location.href = `https://id.genial-it.net/login?redirect=${callbackUrl}&app=mundial`;
  }, []);

  function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const output = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) output[i] = rawData.charCodeAt(i);
    return output;
  }

  const handleTogglePush = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) return;
    try {
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      if (existing) {
        await existing.unsubscribe();
        await fetch('/api/push/subscribe', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: existing.endpoint }) });
        setPushSubscribed(false);
        showToast('Notificaciones push desactivadas');
      } else {
        const sub = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey).buffer as ArrayBuffer });
        await fetch('/api/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(JSON.parse(JSON.stringify(sub))) });
        setPushSubscribed(true);
        showToast('✅ Notificaciones push activadas');
      }
    } catch (e) {
      showToast('Error al gestionar notificaciones push');
    }
  }, [showToast]);

  // Initial bootstrap: auth check + settings + missed goal check
  useEffect(() => {
    (async () => {
      try {
        const [authRes, settingsRes, matchesRes] = await Promise.all([
          fetch(`/api/auth?t=${Date.now()}`),
          fetch(`/api/settings?t=${Date.now()}`),
          fetch(`/api/matches?t=${Date.now()}`),
        ]);
        if (authRes.ok) {
          const d = await authRes.json();
          setUser(d.user);
        }
        if (settingsRes.ok) {
          const s = await settingsRes.json();
          if (s.app_name) setAppName(s.app_name);
          if (s.app_logo) setAppLogo(s.app_logo);
        }
        if (matchesRes.ok) {
          const matches: any[] = await matchesRes.json();
          // Show goal alert for recent goals in live/finished matches (last 5 minutes)
          const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
          const recentGoalMatch = matches.find(m =>
            (m.estado === 'live' || m.estado === 'finished') &&
            (m.goles_local > 0 || m.goles_visitante > 0) &&
            m.updated_at && new Date(m.updated_at).getTime() > fiveMinutesAgo
          );
          if (recentGoalMatch) {
            const goalKey = `seen_goal_${recentGoalMatch.id}_${recentGoalMatch.goles_local}_${recentGoalMatch.goles_visitante}`;
            if (!localStorage.getItem(goalKey)) {
              localStorage.setItem(goalKey, 'true');
              setGoalAlert({
                matchId: recentGoalMatch.id,
                local: recentGoalMatch.local,
                visitante: recentGoalMatch.visitante,
                goles_local: recentGoalMatch.goles_local,
                goles_visitante: recentGoalMatch.goles_visitante,
                missed: true,
              });
              setTimeout(() => setGoalAlert(null), 10000);
            }
          }
        }
      } catch {}
      setAuthChecked(true);
    })();
  }, []);

  // Push subscription check after login
  useEffect(() => {
    if (!user) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    navigator.serviceWorker.ready.then(reg => reg.pushManager.getSubscription()).then(sub => {
      setPushSubscribed(!!sub);
    }).catch(() => {});
    fetchNotifications();
  }, [user, fetchNotifications]);

  // SSE realtime
  useEffect(() => {
    const sse = new EventSource('/api/realtime');
    sse.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'goal') {
          const goalKey = `seen_goal_${payload.data.matchId}_${payload.data.goles_local}_${payload.data.goles_visitante}`;
          localStorage.setItem(goalKey, 'true');
          setGoalAlert(payload.data);
          setTimeout(() => setGoalAlert(null), 10000);
        } else if (payload.type === 'notification') {
          fetchNotifications();
          showToast(`🔔 ${payload.data.titulo}`);
        } else if (payload.type === 'match') {
          setLastMatchUpdate(Date.now());
          showToast(`⚽ ${payload.data.local} ${payload.data.goles_local ?? ''} - ${payload.data.goles_visitante ?? ''} ${payload.data.visitante}`);
        } else if (payload.type === 'leaderboard') {
          showToast('¡La clasificación general ha cambiado!');
        }
      } catch {}
    };
    return () => sse.close();
  }, [fetchNotifications, showToast]);

  return (
    <AppContext.Provider value={{
      user, authChecked, appName, appLogo,
      notifications, unreadCount, pushSubscribed,
      goalAlert, toastMessage, lastMatchUpdate,
      setUser, setPushSubscribed, setGoalAlert, showToast,
      fetchNotifications, handleMarkNotificationRead,
      handleLogout, handleIdentityLogin, handleTogglePush,
      setAppName, setAppLogo,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
