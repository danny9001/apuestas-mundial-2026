'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { KeyRound, Building2, Loader2, AlertTriangle } from 'lucide-react';

interface Invitation {
  token: string;
  company_nombre: string;
  company_color: string;
  expired: boolean;
  expires_at: string;
}

export default function InvitacionPage() {
  const params = useSearchParams();
  const token = params.get('t') ?? '';
  const [inv, setInv] = useState<Invitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) { setError('Token de invitación inválido'); setLoading(false); return; }
    fetch(`/api/invitations?token=${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else setInv(d);
      })
      .catch(() => setError('Error de red'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleJoin = () => {
    const callbackUrl = encodeURIComponent(
      `${window.location.origin}/api/auth/identity-callback?redirect=/&invite_token=${token}`
    );
    window.location.href = `https://id.genial-it.net/login?redirect=${callbackUrl}&app=mundial`;
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-2xl p-7 shadow-2xl">
        <div className="flex justify-center mb-5">
          <div className="w-16 h-16 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
            <span className="text-3xl">⚽</span>
          </div>
        </div>
        <h1 className="text-xl font-black text-white text-center mb-1">Mundial 2026</h1>
        <p className="text-sm text-neutral-400 text-center mb-6">Quiniela corporativa</p>

        {loading && (
          <div className="flex justify-center py-6">
            <Loader2 className="w-6 h-6 animate-spin text-yellow-500" />
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <AlertTriangle className="w-8 h-8 text-red-400" />
            <p className="text-sm text-red-400">{error}</p>
            <a href="/" className="text-xs text-neutral-500 hover:text-neutral-300 transition">Ir al inicio</a>
          </div>
        )}

        {inv?.expired && (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <AlertTriangle className="w-8 h-8 text-amber-400" />
            <p className="text-sm text-amber-400 font-semibold">Esta invitación ha expirado.</p>
            <a href="/" className="text-xs text-neutral-500 hover:text-neutral-300 transition">Ir al inicio</a>
          </div>
        )}

        {inv && !inv.expired && (
          <>
            <div className="mb-5 p-4 rounded-xl border text-center"
              style={{ backgroundColor: (inv.company_color || '#eab308') + '15', borderColor: (inv.company_color || '#eab308') + '40' }}>
              <Building2 className="w-5 h-5 mx-auto mb-1" style={{ color: inv.company_color || '#eab308' }} />
              <p className="text-xs text-neutral-400 mb-0.5">Fuiste invitado/a a unirte a</p>
              <p className="text-base font-black text-white">{inv.company_nombre}</p>
            </div>
            <p className="text-xs text-neutral-400 text-center mb-5 leading-relaxed">
              Registrate o ingresá con tu cuenta de <strong className="text-white">ElitePass Identity</strong> para unirte a la quiniela de tu empresa.
            </p>
            <button onClick={handleJoin}
              className="w-full bg-yellow-500 hover:bg-yellow-400 text-neutral-900 font-black py-3.5 rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-yellow-500/20">
              <KeyRound className="w-4 h-4" />
              Ingresar con ElitePass Identity
            </button>
            <p className="text-[10px] text-neutral-600 text-center mt-4">
              Válido hasta el {new Date(inv.expires_at).toLocaleDateString('es-BO', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
