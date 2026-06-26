'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home, Calendar, Trophy, BookOpen, BarChart3, User, ShieldAlert,
  Building2, Bell, BellOff, Moon, Sun, LogOut, Download, X,
} from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import AnnouncementPopup from '@/components/AnnouncementPopup';
import ChatWidget from '@/components/ChatWidget';

interface AppShellProps {
  children: React.ReactNode;
  isInstalled?: boolean;
  deferredPrompt?: any;
  onInstallPWA?: () => void;
}

export default function AppShell({ children, isInstalled, deferredPrompt, onInstallPWA }: AppShellProps) {
  const pathname = usePathname();
  const {
    user, appName, appLogo,
    pushSubscribed, goalAlert, toastMessage,
    handleLogout, handleIdentityLogin, handleTogglePush, setGoalAlert,
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
  const [pwaPromptMode, setPwaPromptMode] = useState<'install' | 'notify' | null>(null);

  useEffect(() => {
    const dismissed = localStorage.getItem('pwa-prompt-dismissed') === '1';
    if (dismissed) return;

    if (isInstalled) {
      if (user && !pushSubscribed) {
        setPwaPromptMode('notify');
      } else {
        setPwaPromptMode(null);
      }
    } else {
      if (deferredPrompt) {
        setPwaPromptMode('install');
      } else {
        setPwaPromptMode(null);
      }
    }
  }, [isInstalled, deferredPrompt, pushSubscribed, user]);

  const handleDismissPwaPrompt = () => {
    localStorage.setItem('pwa-prompt-dismissed', '1');
    setPwaPromptMode(null);
  };

  const handleInstallClick = async () => {
    if (onInstallPWA) {
      await onInstallPWA();
      localStorage.setItem('pwa-prompt-dismissed', '1');
      setPwaPromptMode(null);
    }
  };

  const handleEnableNotifications = async () => {
    if (handleTogglePush) {
      await handleTogglePush();
      localStorage.setItem('pwa-prompt-dismissed', '1');
      setPwaPromptMode(null);
    }
  };

  useEffect(() => {
    if (!user) return;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
    const key = `pwa_synced_${user.id}_${isStandalone}`;
    if (sessionStorage.getItem(key)) return;

    fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pwaInstalled: isStandalone }),
    })
      .then((res) => {
        if (res.ok) sessionStorage.setItem(key, 'true');
      })
      .catch(() => {});
  }, [user, isInstalled]);



  const navLinks = [
    { href: '/dashboard', label: 'Inicio', icon: <Home className="w-4 h-4" /> },
    { href: '/partidos', label: 'Partidos', icon: <Calendar className="w-4 h-4" /> },
    { href: '/reglas', label: 'Reglas', icon: <BookOpen className="w-4 h-4" /> },
    { href: '/ranking', label: 'Ranking', icon: <BarChart3 className="w-4 h-4" /> },
    { href: '/perfil', label: 'Mi Perfil', icon: <User className="w-4 h-4" /> },
  ];

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

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
                <img src={(user.avatar && user.avatar !== 'null' && user.avatar !== 'undefined') ? user.avatar : 'https://stg00vm.blob.core.windows.net/jet00/default.webp'} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = 'https://stg00vm.blob.core.windows.net/jet00/default.webp'; }}
                  className={`w-8 h-8 rounded-full border border-neutral-800 flex-shrink-0 object-cover ${(!user.avatar || user.avatar === 'null' || user.avatar === 'undefined' || user.avatar.includes('avatar_5.png') || user.avatar.includes('default.webp')) ? 'bg-white' : 'bg-neutral-900'}`} alt="avatar" />
                <div className="truncate">
                  <div className="text-xs font-bold text-neutral-300 truncate">{user.nombre}</div>
                  <div className="text-[9px] text-neutral-500 uppercase tracking-widest font-mono flex items-center gap-1.5">
                    {user.tipo}
                    {(user as any).arbitro_marcador && (
                      <span className="text-yellow-500/80" title="Árbitro del Marcador">⚖️</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button onClick={handleTogglePush} className={`relative p-1.5 transition flex items-center justify-center flex-shrink-0 ${pushSubscribed ? 'text-yellow-500 hover:text-yellow-400' : 'text-neutral-500 hover:text-neutral-300'}`}>
                  {pushSubscribed ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
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

        {/* Announcement popup — novedades y funcionalidades nuevas */}
        <AnnouncementPopup user={user} />

        {/* Global Chat Widget */}
        <ChatWidget />

        {/* Full-Screen Goal Alert */}
        {goalAlert && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center overflow-hidden">
            {/* Styles for fireworks and animations */}
            <style>{`
              @keyframes burst-firework {
                0% { transform: translate(0, 0) scale(1); opacity: 1; }
                80% { opacity: 1; }
                100% { transform: translate(var(--tx), var(--ty)) scale(0.1); opacity: 0; }
              }
              .firework-spark {
                position: absolute;
                width: 6px;
                height: 6px;
                border-radius: 50%;
                animation: burst-firework 1.8s cubic-bezier(0.1, 0.8, 0.3, 1) infinite;
                box-shadow: 0 0 10px currentColor;
              }
              .pulse-glow {
                animation: pulse-glow-keyframes 1.5s infinite alternate;
              }
              @keyframes pulse-glow-keyframes {
                0% { transform: scale(1); filter: drop-shadow(0 0 5px rgba(234,179,8,0.5)); }
                100% { transform: scale(1.15); filter: drop-shadow(0 0 25px rgba(234,179,8,0.95)); }
              }
            `}</style>

            {/* Dark overlay */}
            <div className="absolute inset-0 bg-neutral-950/80 backdrop-blur-sm animate-fade-in" />

            {/* Fireworks background */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {[
                { x: 25, y: 30, color: '#eab308' },
                { x: 75, y: 25, color: '#ec4899' },
                { x: 30, y: 70, color: '#06b6d4' },
                { x: 70, y: 75, color: '#10b981' },
                { x: 50, y: 15, color: '#f97316' }
              ].map((b, bIdx) => (
                <div key={bIdx} className="absolute" style={{ left: `${b.x}%`, top: `${b.y}%` }}>
                  {Array.from({ length: 16 }).map((_, i) => {
                    const angle = (i * 360) / 16;
                    const rad = (angle * Math.PI) / 180;
                    const velocity = 80 + Math.random() * 100;
                    const tx = Math.cos(rad) * velocity;
                    const ty = Math.sin(rad) * velocity;
                    return (
                      <div
                        key={i}
                        className="firework-spark"
                        style={{
                          '--tx': `${tx}px`,
                          '--ty': `${ty}px`,
                          color: b.color,
                          backgroundColor: b.color,
                          animationDelay: `${Math.random() * 0.3}s`,
                        } as any}
                      />
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Close Button X at the top of the overlay */}
            <button
              onClick={() => setGoalAlert(null)}
              className="absolute top-10 bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-800 hover:border-red-500/50 text-neutral-400 hover:text-white px-4 py-2.5 rounded-full transition pointer-events-auto shadow-2xl flex items-center gap-1.5 text-xs font-black uppercase tracking-wider z-50 animate-fade-in"
            >
              <X className="w-4 h-4" /> Cerrar
            </button>

            {/* Circular Soccer Ball Card */}
            <div className="relative w-80 h-80 sm:w-96 sm:h-96 rounded-full overflow-hidden flex flex-col items-center justify-between shadow-[0_0_80px_rgba(255,255,255,0.15)] border-4 border-neutral-900 bg-white pointer-events-auto animate-bounce z-10">
              
              {/* Soccer Ball Pattern Image (matching JD8031 design) */}
              <div 
                className="absolute inset-0 w-full h-full select-none pointer-events-none bg-cover bg-center bg-no-repeat"
                style={{ 
                  backgroundImage: "url('https://mexicofanshop.com/cdn/shop/files/JD8031_1_HARDWARE_Photography_Front-Center-View_transparent.png?v=1759434220&width=5000')",
                  backgroundColor: '#ffffff'
                }}
              />

              {/* Goal Title / Indicator */}
              <div className="mt-12 sm:mt-16 z-10 flex flex-col items-center">
                <span className="bg-red-500 text-white font-black text-[9px] sm:text-[10px] tracking-[0.2em] uppercase px-3 py-1 rounded-full shadow-lg border border-red-400/35 animate-pulse">
                  {goalAlert.missed ? 'GOL RECIENTE' : 'GOL EN VIVO'}
                </span>
                <h2 className="text-4xl sm:text-5xl font-black text-yellow-500 uppercase tracking-wide pulse-glow mt-3 select-none">
                  ¡GOL!
                </h2>
              </div>

              {/* Bottom Card Info: Who vs Who & Score */}
              <div className="w-full bg-neutral-950/90 border-t border-neutral-900 py-5 sm:py-6 text-center z-10 flex flex-col items-center justify-center">
                <div className="text-[10px] sm:text-xs font-black text-neutral-300 uppercase tracking-widest px-4 truncate max-w-full">
                  {goalAlert.local} <span className="text-yellow-500 mx-1">VS</span> {goalAlert.visitante}
                </div>
                <div className="text-3xl sm:text-4xl font-mono font-black text-white mt-1.5 tracking-wider select-none">
                  {goalAlert.goles_local} – {goalAlert.goles_visitante}
                </div>
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

        {/* PWA Onboarding Prompt */}
        {pwaPromptMode && (
          <div className="fixed bottom-24 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-96 z-40 animate-fade-in-up">
            <div className="relative bg-neutral-900/95 backdrop-blur-md border border-neutral-800 rounded-xl p-4 shadow-[0_8px_32px_rgba(0,0,0,0.5)] border-t-2 border-t-yellow-500 flex gap-3 items-start pr-8">
              <button
                onClick={handleDismissPwaPrompt}
                className="absolute right-3 top-3 text-neutral-500 hover:text-neutral-200 transition"
                aria-label="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>

              {pwaPromptMode === 'install' ? (
                <>
                  <div className="shrink-0 flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/10 text-yellow-500">
                    <Download className="h-5 w-5 animate-bounce" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-neutral-200">
                      Instalar Aplicación
                    </p>
                    <p className="text-[11px] text-neutral-400 leading-normal">
                      Instala la app para un acceso rápido y directo a tus apuestas y resultados del mundial.
                    </p>
                    <button
                      onClick={handleInstallClick}
                      className="btn-primary-stitch w-full py-2 text-[10px] font-bold uppercase tracking-wider mt-2"
                    >
                      Instalar
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="shrink-0 flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/10 text-yellow-500">
                    <Bell className="h-5 w-5 animate-pulse" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-neutral-200">
                      Activar Notificaciones
                    </p>
                    <p className="text-[11px] text-neutral-400 leading-normal">
                      Entérate al instante de goles en vivo, alertas de partidos y notificaciones del sistema.
                    </p>
                    <button
                      onClick={handleEnableNotifications}
                      className="btn-primary-stitch w-full py-2 text-[10px] font-bold uppercase tracking-wider mt-2"
                    >
                      Activar notificaciones
                    </button>
                  </div>
                </>
              )}
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
                <div className="bg-neutral-900 border border-neutral-800 rounded-full px-3 py-1 flex items-center gap-1.5 text-xs text-neutral-300">
                  <img src={(user.avatar && user.avatar !== 'null' && user.avatar !== 'undefined') ? user.avatar : 'https://stg00vm.blob.core.windows.net/jet00/default.webp'} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = 'https://stg00vm.blob.core.windows.net/jet00/default.webp'; }} className={`w-4 h-4 rounded-full object-cover ${(!user.avatar || user.avatar === 'null' || user.avatar === 'undefined' || user.avatar.includes('avatar_5.png') || user.avatar.includes('default.webp')) ? 'bg-white' : 'bg-neutral-900'}`} alt="avatar" />
                  <span className="font-bold max-w-[80px] truncate">{user.nombre.split(' ')[0]}</span>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8 xl:px-12 xl:py-10 pb-24 md:pb-8">
          {children}
        </main>

        {/* Mobile Bottom Nav */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 bottom-nav-glass shadow-[0_-2px_24px_rgba(0,0,0,0.6)] flex items-center justify-around py-3 px-2 md:hidden" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
          {[
            { href: '/dashboard', icon: <Home className="w-5 h-5" />, label: 'Inicio' },
            { href: '/partidos', icon: <Calendar className="w-5 h-5" />, label: 'Partidos' },
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

      </div>
    </div>
  );
}
