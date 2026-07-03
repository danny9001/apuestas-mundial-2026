'use client';

import { X } from 'lucide-react';

interface QrCompany {
  id: number;
  nombre: string;
  color?: string;
  qr_url?: string | null;
}

interface PaymentQrModalProps {
  companies: QrCompany[];
  onClose: () => void;
}

export default function PaymentQrModal({ companies, onClose }: PaymentQrModalProps) {
  const withQr = companies.filter(c => c.qr_url);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto" onClick={onClose}>
      <div
        className="glass-card border border-neutral-800/80 rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto p-6 my-auto shadow-2xl space-y-5 animate-slide-in-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black tracking-wider text-neutral-100 uppercase flex items-center gap-2">
            💳 QR de Pago
          </h3>
          <button onClick={onClose} className="bg-neutral-950 hover:bg-neutral-800 text-neutral-400 p-2 rounded-full border border-neutral-850 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {withQr.length === 0 ? (
          <p className="text-neutral-400 text-xs leading-relaxed text-center py-6">
            Contacta al administrador de tu empresa para obtener el código QR de pago.
          </p>
        ) : (
          <div className="space-y-5">
            {withQr.map(c => (
              <div key={c.id} className="flex flex-col items-center gap-2 bg-neutral-950/60 border border-neutral-850 rounded-2xl p-4">
                <span className="text-xs font-black uppercase tracking-wider" style={{ color: c.color || '#eab308' }}>
                  🏢 {c.nombre}
                </span>
                <img src={c.qr_url as string} alt={`QR de pago de ${c.nombre}`} className="w-56 h-56 object-contain rounded-xl bg-white p-2" />
              </div>
            ))}
            <p className="text-neutral-500 text-[11px] leading-relaxed text-center">
              Escanea el código con tu app bancaria y luego sube tu comprobante para que el administrador registre el pago.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
