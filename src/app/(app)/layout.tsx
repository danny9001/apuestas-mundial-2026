'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppProvider, useApp } from '@/contexts/AppContext';
import AppShell from '@/components/AppShell';
import { RefreshCw } from 'lucide-react';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { authChecked, user } = useApp();
  const router = useRouter();
  const [isInstalled, setIsInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) setIsInstalled(true);
    const handler = (e: Event) => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => { setIsInstalled(true); setDeferredPrompt(null); });
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
    if (authChecked && !user) router.replace('/');
  }, [authChecked, user, router]);

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-4">
        <RefreshCw className="w-12 h-12 text-yellow-500 animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const handleInstallPWA = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') { setIsInstalled(true); setDeferredPrompt(null); }
  };

  return (
    <AppShell isInstalled={isInstalled} deferredPrompt={deferredPrompt} onInstallPWA={handleInstallPWA}>
      {children}
    </AppShell>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <AuthGuard>{children}</AuthGuard>
    </AppProvider>
  );
}
