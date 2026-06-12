'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/auth?t=${Date.now()}`);
        if (res.ok) {
          const d = await res.json();
          if (d.user) {
            router.replace('/dashboard');
            return;
          }
        }
      } catch {}
      // Not authenticated → redirect to ElitePass Identity SSO
      const callbackUrl = encodeURIComponent(
        `${window.location.origin}/api/auth/identity-callback?redirect=/dashboard`
      );
      window.location.href = `https://id.genial-it.net/login?redirect=${callbackUrl}&app=mundial`;
    })();
  }, [router]);

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
      <RefreshCw className="w-10 h-10 text-yellow-500 animate-spin" />
    </div>
  );
}
