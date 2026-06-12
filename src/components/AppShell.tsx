'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home, Calendar, Trophy, BookOpen, BarChart3, User, ShieldAlert,
  Building2, Bell, BellOff, Mail, Moon, Sun, LogOut, Download, X,
} from 'lucide-react';
import { useApp } from '@/contexts/AppContext';

interface AppShellProps {
  children: React.ReactNode;
  isInstalled?: boolean;
  deferredPrompt?: any;
  onInstallPWA?: () => void;
}

export default function AppShell({ children, isInstalled, deferredPrompt, onInstallPWA }: AppShellProps) {
  const pathname = usePathname();
  const {
    user, appName, appLogo, notifications, unreadCount,
    pushSubscribed, goalAlert, toastMessage,
    handleLogout, handleIdentityLogin, handleTogglePush,
    handleMarkNotificationRead,
  } = useApp();

  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Read saved preference on mount, then apply to <html> on every change
  useEffect(() => {
    const saved = (typeof window !== 'undefined' ? localStorage.getItem('theme') : null) as 'light' | 'dark' | null;
    if (saved && saved !== theme) setTheme(saved);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light');
    localStorage.setItem('theme', theme);
  }, [theme]);
  const [notifPanelOpen, setNotifPanelOpen] = useState(false);
  const [showAllNotifs, setShowAllNotifs] = useState(false);
  const [telegramSubmitting, setTelegramSubmitting] = useState(false);

  const navLinks = [
    { href: '/dashboard', label: 'Inicio', icon: <Home className="w-4 h-4" /> },
    { href: '/partidos', label: 'Partidos', icon: <Calendar className="w-4 h-4" /> },
    { href: '/fixture', label: 'Fixture', icon: <Trophy className="w-4 h-4" /> },
    { href: '/reglas', label: 'Reglas', icon: <BookOpen className="w-4 h-4" /> },
    { href: '/ranking', label: 'Ranking', icon: <BarChart3 className="w-4 h-4" /> },
    { href: '/perfil', label: 'Mi Perfil', icon: <User className="w-4 h-4" /> },
  ];

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  const handleTelegramSubscribe = async () => {
    setTelegramSubmitting(true);
    try {
      const res = await fetch('/api/telegram/subscribe', { method: 'POST' });
      const d = await res.json();
      if (d.url) window.open(d.url, '_blank');
    } catch {}
    setTelegramSubmitting(false);
  };

  const logoEl = appLogo.startsWith('/') || appLogo.startsWith('http')
    ? <img src={appLogo} className="w-7 h-7 object-contain rounded-md flex-shrink-0" alt="logo" />
    : <span className="w-7 h-7 flex items-center justify-center text-xl flex-shrink-0 leading-none">{appLogo}</span>;

  const logoElSm = appLogo.startsWith('/') || appLogo.startsWith('http')
    ? <img src={appLogo} className="w-6 h-6 object-contain rounded-md flex-shrink-0" alt="logo" />
    : <span className="w-6 h-6 flex items-center justify-center text-lg flex-shrink-0 leading-none">{appLogo}</span>;

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col md:flex-row w-full pb-safe">

      {/* ── DESKTOP LEFT SIDEBAR ── */}
      <aside className="hidden md:flex md:w-64 xl:w-72 bg-neutral-900/40 border-r border-neutral-900/60 flex-col justify-between p-6 md:sticky md:top-0 md:h-screen">
        <div className="space-y-8">
          <div className="flex items-center gap-2.5 px-2">
            {logoEl}
            <span className="font-black tracking-wider text-sm uppercase text-neutral-100 truncate">{appName}</span>
          </div>
          <nav className="flex flex-col gap-2">
            {navLinks.map(({ href, label, icon }) => (
              <Link key={href} href={href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
                  isActive(href) ? 'btn-primary-stitch shadow-md' : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/50 border border-transparent'
                }`}>
                {icon}<span>{label}</span>
              </Link>
            ))}
            {user && (user.tipo === 'admin' || user.tipo === 'superadmin') && (
              <Link href="/admin"
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
                  isActive('/admin') ? 'btn-primary-stitch shadow-md' : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/50 border border-transparent'
                }`}>
                {user.tipo === 'superadmin' ? <ShieldAlert className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                <span>{user.tipo === 'superadmin' ? 'Super Admin' : 'Mi Empresa'}</span>
              </Link>
            )}
          </nav>
        </div>

        <div className="space-y-4">
          {!isInstalled && deferredPrompt && (
            <button onClick={onInstallPWA}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs font-bold hover:bg-yellow-500/20 transition">
              <Download className="w-3.5 h-3.5 flex-shrink-0" /><span>Instalar aplicación</span>
            </button>
          )}
          {user ? (
            <div className="bg-neutral-950/60 border border-neutral-850 p-3 rounded-xl flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <img src={user.avatar} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(user.nombre)}`; }}
                  className="w-8 h-8 rounded-full border border-neutral-800 bg-neutral-900 flex-shrink-0" alt="avatar" />
                <div className="truncate">
                  <div className="text-xs font-bold text-neutral-300 truncate">{user.nombre}</div>
                  <div className="text-[9px] text-neutral-500 uppercase tracking-widest font-mono">{user.tipo}</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button onClick={handleTogglePush} className={`relative p-1.5 transition flex items-center justify-center flex-shrink-0 ${pushSubscribed ? 'text-yellow-500 hover:text-yellow-400' : 'text-neutral-500 hover:text-neutral-300'}`}>
                  {pushSubscribed ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                </button>
                <button onClick={() => setNotifPanelOpen(true)} className="relative text-neutral-400 hover:text-yellow-500 p-1.5 transition flex items-center justify-center flex-shrink-0">
                  <Mail className="w-4 h-4" />
                  {unreadCount > 0 && <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 text-white text-[7px] font-black rounded-full flex items-center justify-center">{unreadCount > 9 ? '9+' : unreadCount}</span>}
                </button>
                <button onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')} className="text-neutral-555 hover:text-yellow-500 p-1.5 transition flex items-center justify-center flex-shrink-0">
                  {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                </button>
                <button onClick={handleLogout} className="text-neutral-555 hover:text-red-400 p-1.5 transition flex-shrink-0">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-neutral-950/60 border border-neutral-850 p-3 rounded-xl flex justify-between items-center gap-2">
              <button onClick={handleIdentityLogin} className="btn-primary-stitch w-full py-2.5 text-xs tracking-wider uppercase flex items-center justify-center gap-2">
                🔑 Iniciar Sesión
              </button>
              <button onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')} className="text-neutral-555 hover:text-yellow-500 p-2 border border-neutral-850 bg-neutral-900/40 rounded-xl transition flex items-center justify-center flex-shrink-0">
                {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ── RIGHT CONTENT AREA ── */}
      <div className="flex-1 flex flex-col justify-between min-h-screen relative">

        {/* Full-Screen Goal Alert */}
        {goalAlert && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center pointer-events-none overflow-hidden">
            {/* Dark overlay */}
            <div className="absolute inset-0 bg-neutral-950/70 backdrop-blur-sm animate-fade-in" />
            {/* Animated confetti rings */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-96 h-96 rounded-full border-4 border-yellow-500/30 animate-ping" style={{ animationDuration: '1s' }} />
              <div className="absolute w-64 h-64 rounded-full border-4 border-yellow-500/50 animate-ping" style={{ animationDuration: '0.8s', animationDelay: '0.1s' }} />
              <div className="absolute w-32 h-32 rounded-full border-4 border-yellow-500/70 animate-ping" style={{ animationDuration: '0.6s', animationDelay: '0.2s' }} />
            </div>
            {/* Main card */}
            <div className="relative flex flex-col items-center gap-4 bg-gradient-to-b from-yellow-500 to-amber-600 text-neutral-950 px-10 py-8 rounded-3xl shadow-[0_0_80px_rgba(234,179,8,0.6)] border-4 border-neutral-950 animate-bounce max-w-sm mx-4 text-center">
              <div className="text-7xl animate-bounce" style={{ animationDuration: '0.5s' }}>⚽</div>
              <div className="text-xs font-black uppercase tracking-[0.3em] text-neutral-800 mt-1">
                {goalAlert.missed ? '¡Gol Reciente!' : '¡GOL EN VIVO!'}
              </div>
              <div className="text-3xl font-black tracking-tight leading-tight">
                {goalAlert.local}
                <span className="text-5xl mx-3 font-black font-mono text-neutral-950">
                  {goalAlert.goles_local} – {goalAlert.goles_visitante}
                </span>
                {goalAlert.visitante}
              </div>
            </div>
          </div>
        )}

        {/* Toast */}
        {toastMessage && !goalAlert && (
          <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-80 z-40 animate-fade-in-up pointer-events-none">
            <div className="glass-card text-neutral-100 px-4 py-3 rounded-lg border border-neutral-800/80 text-xs flex items-center gap-2 shadow-2xl justify-center">
              <Trophy className="w-4 h-4 text-yellow-500 animate-pulse" />
              <span>{toastMessage}</span>
            </div>
          </div>
        )}

        {/* Mobile Header */}
        <header className="sticky top-0 bg-neutral-950/80 backdrop-blur-md border-b border-neutral-900/60 px-4 py-4 flex justify-between items-center z-30 pt-safe md:hidden">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {logoElSm}
            <span className="font-black tracking-wider text-sm uppercase text-neutral-100 truncate">{appName}</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {!isInstalled && deferredPrompt && (
              <button onClick={onInstallPWA} className="bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 p-2 rounded-lg border border-yellow-500/30 transition flex items-center justify-center">
                <Download className="w-4 h-4" />
              </button>
            )}
            <button onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')} className="bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-yellow-500 p-2 rounded-lg border border-neutral-800 transition flex items-center justify-center">
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
            {user && (
              <>
                <button onClick={handleTogglePush} className={`p-2 rounded-lg border transition flex items-center justify-center ${pushSubscribed ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20' : 'bg-neutral-900 border-neutral-800 text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800'}`}>
                  {pushSubscribed ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                </button>
                <button onClick={() => setNotifPanelOpen(true)} className="relative bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-yellow-500 p-2 rounded-lg border border-neutral-800 transition flex items-center justify-center">
                  <Mail className="w-4 h-4" />
                  {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center">{unreadCount > 9 ? '9+' : unreadCount}</span>}
                </button>
                <div className="bg-neutral-900 border border-neutral-800 rounded-full px-3 py-1 flex items-center gap-1.5 text-xs text-neutral-300">
                  <img src={user.avatar} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(user.nombre)}`; }} className="w-4 h-4 rounded-full" alt="avatar" />
                  <span className="font-bold max-w-[80px] truncate">{user.nombre.split(' ')[0]}</span>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8 xl:px-12 xl:py-10 overflow-y-auto pb-24 md:pb-8">
          {children}
        </main>

        {/* Mobile Bottom Nav */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 bottom-nav-glass shadow-[0_-2px_24px_rgba(0,0,0,0.6)] flex items-center justify-around py-3 px-2 md:hidden" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
          {[
            { href: '/dashboard', icon: <Home className="w-5 h-5" />, label: 'Inicio' },
            { href: '/partidos', icon: <Calendar className="w-5 h-5" />, label: 'Partidos' },
            { href: '/fixture', icon: <Trophy className="w-5 h-5" />, label: 'Fixture' },
            { href: '/reglas', icon: <BookOpen className="w-5 h-5" />, label: 'Reglas' },
            { href: '/ranking', icon: <BarChart3 className="w-5 h-5" />, label: 'Ranking' },
            { href: '/perfil', icon: <User className="w-5 h-5" />, label: 'Mi Perfil' },
          ].map(({ href, icon, label }) => (
            <Link key={href} href={href}
              className={`flex flex-col items-center gap-1 py-1 transition flex-1 text-center select-none ${
                isActive(href) ? 'bottom-nav-active-pill font-black scale-105' : 'text-neutral-500 hover:text-neutral-300'
              }`}>
              {icon}
              <span className="text-[9px] font-bold tracking-wide uppercase">{label}</span>
            </Link>
          ))}
          {user && (user.tipo === 'admin' || user.tipo === 'superadmin') && (
            <Link href="/admin"
              className={`flex flex-col items-center gap-1 py-1 transition flex-1 text-center select-none ${
                isActive('/admin') ? 'bottom-nav-active-pill font-black scale-105' : 'text-neutral-500 hover:text-neutral-300'
              }`}>
              {user.tipo === 'superadmin' ? <ShieldAlert className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
              <span className="text-[9px] font-bold tracking-wide uppercase">{user.tipo === 'superadmin' ? 'Sistema' : 'Empresa'}</span>
            </Link>
          )}
        </nav>

        {/* Notification Panel */}
        {notifPanelOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setNotifPanelOpen(false)} />
            <div className="relative w-full max-w-sm bg-neutral-950 border-l border-neutral-900 h-full overflow-y-auto flex flex-col shadow-2xl">
              <div className="flex justify-between items-center p-4 border-b border-neutral-900 sticky top-0 bg-neutral-950 z-10">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-yellow-500" />
                  <h3 className="text-sm font-black text-neutral-100 uppercase tracking-wider">Notificaciones</h3>
                  {unreadCount > 0 && <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">{unreadCount}</span>}
                </div>
                <div className="flex items-center gap-3">
                  {unreadCount > 0 && (
                    <button onClick={() => handleMarkNotificationRead()} className="text-[10px] text-neutral-500 hover:text-yellow-500 font-bold uppercase transition">
                      Marcar todo leído
                    </button>
                  )}
                  <button onClick={() => setNotifPanelOpen(false)} className="text-neutral-500 hover:text-neutral-200 transition">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex-1 divide-y divide-neutral-900">
                {notifications.length === 0 && <div className="p-8 text-center text-neutral-500 text-xs">Sin notificaciones</div>}
                {(showAllNotifs ? notifications : notifications.slice(0, 5)).map(n => {
                  const colorMap: Record<string, string> = { info: 'text-neutral-300 border-neutral-700/50 bg-neutral-500/5', warning: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/5', success: 'text-green-400 border-green-500/30 bg-green-500/5', error: 'text-red-400 border-red-500/30 bg-red-500/5' };
                  const cls = colorMap[n.tipo] || colorMap.info;
                  return (
                    <div key={n.id} className={`p-4 cursor-pointer hover:bg-neutral-900/50 transition ${!n.leido ? 'border-l-2 border-l-yellow-500' : ''}`}
                      onClick={() => { if (!n.leido) handleMarkNotificationRead(n.id); }}>
                      <span className={`inline-flex items-center text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border mb-2 ${cls}`}>{n.tipo}</span>
                      <div className="text-xs font-bold text-neutral-200">{n.titulo}</div>
                      <div className="text-[11px] text-neutral-500 mt-1 leading-relaxed">{n.contenido}</div>
                      <div className="text-[9px] text-neutral-600 mt-2">{new Date(n.created_at).toLocaleString('es-BO')}</div>
                    </div>
                  );
                })}
              </div>
              {!showAllNotifs && notifications.length > 5 && (
                <button onClick={() => setShowAllNotifs(true)} className="p-4 text-xs font-black text-yellow-500 text-center uppercase tracking-wider bg-neutral-900/30 hover:bg-neutral-900 transition">
                  Ver historial completo ({notifications.length})
                </button>
              )}
              {showAllNotifs && (
                <button onClick={() => setShowAllNotifs(false)} className="p-4 text-xs font-black text-neutral-500 text-center uppercase tracking-wider bg-neutral-900/30 hover:bg-neutral-900 transition">
                  Mostrar menos
                </button>
              )}
              <div className="p-6 mt-auto bg-blue-900/20 border-t border-blue-900/30">
                <h4 className="text-sm font-black text-blue-400 uppercase tracking-widest mb-2 flex items-center gap-2">📱 Alertas por Telegram</h4>
                <p className="text-[10px] text-blue-300/70 mb-4">Recibe notificaciones instantáneas y el ganador del mundial en Telegram.</p>
                <button onClick={handleTelegramSubscribe} disabled={telegramSubmitting}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-3 rounded-xl transition uppercase tracking-wider">
                  {telegramSubmitting ? 'Conectando...' : 'Suscribirme a Telegram'}
                </button>
                {!user?.telefono && <p className="text-[9px] text-red-400 mt-2 text-center">* Requiere celular en tu perfil.</p>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
