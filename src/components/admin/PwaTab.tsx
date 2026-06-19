'use client';

import { useState } from 'react';
import {
  Download, Search
} from 'lucide-react';

interface PwaTabProps {
  adminUsers: any[];
}

export default function PwaTab({
  adminUsers,
}: PwaTabProps) {
  const [pwaSearch, setPwaSearch] = useState('');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
        <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-2">
          <Download className="w-3.5 h-3.5 text-yellow-500" />
          Reporte de Instalación PWA (Dispositivos)
        </h3>
      </div>

      {/* Stats Summary Card */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Participantes', value: adminUsers.length, color: 'text-neutral-200' },
          { label: 'Instalado como PWA', value: adminUsers.filter(u => u.pwa_installed).length, color: 'text-green-400' },
          { label: 'Uso en Navegador', value: adminUsers.filter(u => !u.pwa_installed).length, color: 'text-yellow-500/80' },
          {
            label: 'Tasa de Adopción',
            value: `${adminUsers.length > 0 ? Math.round((adminUsers.filter(u => u.pwa_installed).length / adminUsers.length) * 100) : 0}%`,
            color: 'text-yellow-500'
          },
        ].map(stat => (
          <div key={stat.label} className="bg-neutral-900/40 border border-neutral-800 rounded-2xl p-4 flex flex-col items-center gap-1">
            <span className={`text-xl font-mono font-black ${stat.color}`}>{stat.value}</span>
            <span className="text-[9px] text-neutral-500 uppercase tracking-widest text-center">{stat.label}</span>
          </div>
        ))}
      </div>

      {/* Search filter */}
      <div className="bg-neutral-900/40 border border-neutral-800 rounded-2xl p-4 flex gap-3 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-neutral-500" />
          <input
            type="text"
            placeholder="Buscar por nombre o correo..."
            value={pwaSearch}
            onChange={e => setPwaSearch(e.target.value)}
            className="w-full bg-neutral-950/80 border border-neutral-800 rounded-xl pl-9 pr-4 py-2 text-xs text-neutral-200 focus:outline-none focus:border-yellow-500 transition font-medium"
          />
        </div>
        {pwaSearch && (
          <button
            onClick={() => setPwaSearch('')}
            className="text-xs text-neutral-500 hover:text-neutral-300 font-bold uppercase transition"
          >
            Limpiar
          </button>
        )}
      </div>

      {/* Table / Cards */}
      {(() => {
        const filtered = adminUsers.filter(u => {
          const term = pwaSearch.toLowerCase().trim();
          if (!term) return true;
          return u.nombre.toLowerCase().includes(term) || u.email.toLowerCase().includes(term);
        });
        return (
          <div className="bg-neutral-900/40 border border-neutral-800 rounded-2xl overflow-hidden shadow-lg">

            {/* Desktop: tabla */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-neutral-950 text-neutral-400 border-b border-neutral-800 uppercase tracking-wider font-black text-[10px]">
                    <th className="p-3">Usuario</th>
                    <th className="p-3">Correo</th>
                    <th className="p-3">Empresa</th>
                    <th className="p-3">Estado PWA</th>
                    <th className="p-3 text-right">Último Reporte</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-850">
                  {filtered.map(u => {
                    const companyNames = Array.isArray(u.companies) ? u.companies.map((c: any) => c.nombre).join(', ') : '';
                    return (
                      <tr key={u.id} className="hover:bg-neutral-900/20 transition-colors">
                        <td className="p-3 flex items-center gap-2 font-bold text-neutral-200">
                          <img src={u.avatar || 'https://stg00vm.blob.core.windows.net/jet00/default.webp'} className="w-6 h-6 rounded-full object-cover bg-white" alt="avatar" onError={e => { e.currentTarget.src = 'https://stg00vm.blob.core.windows.net/jet00/default.webp'; }} />
                          <span>{u.nombre}</span>
                        </td>
                        <td className="p-3 text-neutral-400 font-mono">{u.email}</td>
                        <td className="p-3 text-neutral-300">{companyNames || <span className="text-neutral-600">-</span>}</td>
                        <td className="p-3">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold border ${u.pwa_installed ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-neutral-800 border-neutral-750 text-neutral-400'}`}>
                            {u.pwa_installed ? '📱 PWA Instalada' : '🌐 Navegador'}
                          </span>
                        </td>
                        <td className="p-3 text-right text-neutral-500 font-mono">{u.pwa_updated_at ? new Date(u.pwa_updated_at).toLocaleString('es-BO') : '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile: tarjetas */}
            <div className="sm:hidden divide-y divide-neutral-850">
              {filtered.map(u => {
                const companyNames = Array.isArray(u.companies) ? u.companies.map((c: any) => c.nombre).join(', ') : '';
                return (
                  <div key={u.id} className="p-3 flex items-center gap-3">
                    <img src={u.avatar || 'https://stg00vm.blob.core.windows.net/jet00/default.webp'} className="w-9 h-9 rounded-full object-cover bg-white flex-shrink-0" alt="avatar" onError={e => { e.currentTarget.src = 'https://stg00vm.blob.core.windows.net/jet00/default.webp'; }} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[12px] font-bold text-neutral-200 truncate">{u.nombre}</span>
                        <span className={`flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border ${u.pwa_installed ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-neutral-800 border-neutral-750 text-neutral-400'}`}>
                          {u.pwa_installed ? '📱 PWA' : '🌐 Web'}
                        </span>
                      </div>
                      <p className="text-[10px] text-neutral-500 font-mono truncate">{u.email}</p>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-[10px] text-neutral-500">{companyNames || '-'}</span>
                        <span className="text-[9px] text-neutral-600 font-mono">{u.pwa_updated_at ? new Date(u.pwa_updated_at).toLocaleDateString('es-BO') : '-'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        );
      })()}
    </div>
  );
}
