'use client';

import { useEffect, useState } from 'react';
import PaymentQrModal from './PaymentQrModal';

interface PaymentInfo {
  cuota: number;
  totalPagado: number;
  pagadoCompleto: boolean;
  participa: boolean;
  companies: { id: number; nombre: string; color?: string; qr_url?: string | null }[];
}

interface DebtBannerProps {
  user: { tipo: string } | null;
  className?: string;
}

export default function DebtBanner({ user, className = '' }: DebtBannerProps) {
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);

  useEffect(() => {
    if (!user || user.tipo === 'superadmin') return;
    (async () => {
      try {
        const res = await fetch(`/api/profile/payments?t=${Date.now()}`);
        if (res.ok) setPaymentInfo(await res.json());
      } catch {}
    })();
  }, [user]);

  if (!user || user.tipo === 'superadmin') return null;
  if (!paymentInfo || paymentInfo.participa === false || paymentInfo.pagadoCompleto) return null;

  const saldo = paymentInfo.cuota - paymentInfo.totalPagado;

  return (
    <>
      <button
        onClick={() => setQrModalOpen(true)}
        className={`w-full text-left bg-yellow-500/5 border border-yellow-500/25 rounded-2xl p-5 flex gap-3 text-xs font-semibold hover:bg-yellow-500/10 transition ${className}`}
      >
        <span className="text-xl animate-bounce">⚠️</span>
        <div className="space-y-1 flex-1">
          <p className="font-extrabold uppercase text-[10px] tracking-wider text-yellow-500">
            Tienes un pago pendiente
          </p>
          <p className="text-neutral-400 leading-relaxed text-[11px]">
            Saldo pendiente: Bs. {saldo.toLocaleString('es-BO')} de un total de Bs. {paymentInfo.cuota.toLocaleString('es-BO')}.{' '}
            <span className="text-yellow-500 font-bold">Toca aquí para ver el QR y pagar.</span>
          </p>
        </div>
      </button>
      {qrModalOpen && (
        <PaymentQrModal companies={paymentInfo.companies} onClose={() => setQrModalOpen(false)} />
      )}
    </>
  );
}
