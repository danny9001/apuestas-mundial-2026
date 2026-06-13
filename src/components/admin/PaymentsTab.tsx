'use client';

import { useState, useEffect } from 'react';
import {
  Coins, RefreshCw, Search, Plus, DollarSign, X, Check, Pencil, Trash2
} from 'lucide-react';

interface PaymentsTabProps {
  user: any;
  companies: any[];
  showToast: (msg: string) => void;
}

export default function PaymentsTab({
  user,
  companies,
  showToast,
}: PaymentsTabProps) {
  const [paymentsUsers, setPaymentsUsers] = useState<any[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentModalUser, setPaymentModalUser] = useState<any | null>(null);
  const [newPaymentMonto, setNewPaymentMonto] = useState('');
  const [newPaymentFecha, setNewPaymentFecha] = useState('');
  const [newPaymentFile, setNewPaymentFile] = useState<File | null>(null);
  const [newPaymentNotas, setNewPaymentNotas] = useState('');
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [managePaymentsUser, setManagePaymentsUser] = useState<any | null>(null);
  const [editingPaymentId, setEditingPaymentId] = useState<number | null>(null);
  const [editingPaymentMonto, setEditingPaymentMonto] = useState('');
  const [editingPaymentFecha, setEditingPaymentFecha] = useState('');
  const [editingPaymentFile, setEditingPaymentFile] = useState<File | null>(null);
  const [editingPaymentNotas, setEditingPaymentNotas] = useState('');
  const [paymentsSearch, setPaymentsSearch] = useState('');
  const [paymentsCompanyFilter, setPaymentsCompanyFilter] = useState<string>('all');
  const [paymentsStatusFilter, setPaymentsStatusFilter] = useState<'all' | 'pending' | 'partial' | 'paid'>('all');
  const [reportSubmitting, setReportSubmitting] = useState(false);

  useEffect(() => {
    fetchPaymentsUsers();
  }, []);

  const fetchPaymentsUsers = async () => {
    setPaymentsLoading(true);
    try {
      const res = await fetch(`/api/admin/payments?t=${Date.now()}`);
      if (res.ok) setPaymentsUsers(await res.json());
    } catch {}
    setPaymentsLoading(false);
  };

  const handleRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalUser) return;
    const monto = parseFloat(newPaymentMonto);
    if (isNaN(monto) || monto <= 0) {
      showToast('❌ Ingrese un monto válido mayor a 0');
      return;
    }
    setPaymentSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('action', 'add');
      formData.append('userId', String(paymentModalUser.id));
      formData.append('monto', String(monto));
      if (newPaymentFecha) formData.append('fecha', newPaymentFecha);
      if (newPaymentFile) formData.append('file', newPaymentFile);
      if (newPaymentNotas.trim()) formData.append('notas', newPaymentNotas.trim());

      const res = await fetch('/api/admin/payments', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        showToast('💰 Pago registrado con éxito');
        setPaymentModalUser(null);
        setNewPaymentMonto('');
        setNewPaymentFecha('');
        setNewPaymentFile(null);
        setNewPaymentNotas('');
        await fetchPaymentsUsers();
      } else {
        const data = await res.json();
        showToast(`❌ Error: ${data.error || 'No se pudo guardar el pago'}`);
      }
    } catch {
      showToast('❌ Error de red');
    }
    setPaymentSubmitting(false);
  };

  const handleDeletePayment = async (paymentId: number) => {
    if (!confirm('¿Seguro que desea eliminar este pago?')) return;
    try {
      const res = await fetch('/api/admin/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          paymentId,
        }),
      });
      if (res.ok) {
        showToast('🗑 Pago eliminado');
        if (managePaymentsUser) {
          const updatedPayments = managePaymentsUser.payments.filter((p: any) => p.id !== paymentId);
          const updatedUser = { ...managePaymentsUser, payments: updatedPayments };
          setManagePaymentsUser(updatedUser);
          setPaymentsUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
        }
        await fetchPaymentsUsers();
      } else {
        const data = await res.json();
        showToast(`❌ Error: ${data.error}`);
      }
    } catch {
      showToast('❌ Error de red');
    }
  };

  const handleUpdatePayment = async (paymentId: number) => {
    const monto = parseFloat(editingPaymentMonto);
    if (isNaN(monto) || monto <= 0) {
      showToast('❌ Ingrese un monto válido mayor a 0');
      return;
    }
    try {
      const formData = new FormData();
      formData.append('action', 'update');
      formData.append('paymentId', String(paymentId));
      formData.append('monto', String(monto));
      if (editingPaymentFecha) formData.append('fecha', editingPaymentFecha);
      if (editingPaymentFile) formData.append('file', editingPaymentFile);
      formData.append('notas', editingPaymentNotas.trim());

      const res = await fetch('/api/admin/payments', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        showToast('✏️ Pago actualizado');
        setEditingPaymentId(null);
        setEditingPaymentFile(null);
        setEditingPaymentNotas('');
        if (managePaymentsUser) {
          const updatedPayments = managePaymentsUser.payments.map((p: any) =>
            p.id === paymentId ? { ...p, monto, fecha: editingPaymentFecha ? new Date(editingPaymentFecha).toISOString() : p.fecha, notas: editingPaymentNotas.trim() } : p
          );
          const updatedUser = { ...managePaymentsUser, payments: updatedPayments };
          setManagePaymentsUser(updatedUser);
          setPaymentsUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
        }
        await fetchPaymentsUsers();
      } else {
        const data = await res.json();
        showToast(`❌ Error: ${data.error}`);
      }
    } catch {
      showToast('❌ Error de red');
    }
  };

  const handleSendPaymentsReport = async () => {
    setReportSubmitting(true);
    try {
      const res = await fetch('/api/admin/payments/report', {
        method: 'POST',
      });
      if (res.ok) {
        showToast('✉️ Reporte de pagos enviado por correo con éxito');
      } else {
        const d = await res.json();
        showToast(`❌ Error: ${d.error || 'No se pudo enviar el reporte'}`);
      }
    } catch {
      showToast('❌ Error de red');
    } finally {
      setReportSubmitting(false);
    }
  };

  const filteredPaymentsUsers = paymentsUsers.filter(u => {
    const matchesSearch = u.nombre.toLowerCase().includes(paymentsSearch.toLowerCase()) || 
                          u.email.toLowerCase().includes(paymentsSearch.toLowerCase());
    
    const matchesCompany = paymentsCompanyFilter === 'all' || 
                           (u.companies || []).some((c: any) => String(c.id) === paymentsCompanyFilter);

    const cuota = u.companies.length > 0 ? u.companies.reduce((sum: number, c: any) => sum + parseFloat(c.monto_participacion || 150), 0) : 150;
    const totalPagado = u.payments.reduce((sum: number, p: any) => sum + parseFloat(p.monto), 0);
    const saldo = cuota - totalPagado;

    let matchesStatus = true;
    if (paymentsStatusFilter === 'pending') {
      matchesStatus = totalPagado === 0;
    } else if (paymentsStatusFilter === 'partial') {
      matchesStatus = totalPagado > 0 && saldo > 0;
    } else if (paymentsStatusFilter === 'paid') {
      matchesStatus = saldo <= 0;
    }

    return matchesSearch && matchesCompany && matchesStatus;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
        <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-2">
          <Coins className="w-3.5 h-3.5" />
          Control de Pagos de Participantes
        </h3>
        <div className="text-[10px] text-neutral-500 uppercase tracking-widest font-mono">
          Solo visibles para Administradores
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-neutral-900/40 border border-neutral-900 rounded-2xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <input
          type="text"
          value={paymentsSearch}
          onChange={e => setPaymentsSearch(e.target.value)}
          placeholder="🔍 Buscar participante..."
          className="w-full md:w-64 input-stitch px-3 py-2 text-xs bg-neutral-950 border border-neutral-850 rounded-xl"
        />
        <div className="flex flex-wrap gap-2 w-full md:w-auto justify-end">
          {/* Company filter */}
          <select
            value={paymentsCompanyFilter}
            onChange={e => setPaymentsCompanyFilter(e.target.value)}
            className="bg-neutral-950 border border-neutral-850 text-neutral-300 rounded-xl px-3 py-2 text-xs font-medium"
          >
            <option value="all">🏢 Todas las empresas</option>
            {companies.map(c => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={paymentsStatusFilter}
            onChange={e => setPaymentsStatusFilter(e.target.value as any)}
            className="bg-neutral-950 border border-neutral-850 text-neutral-300 rounded-xl px-3 py-2 text-xs font-medium"
          >
            <option value="all">💰 Todos los estados</option>
            <option value="pending">🔴 Pendientes (Sin pagos)</option>
            <option value="partial">🟡 Pago Parcial</option>
            <option value="paid">🟢 Pagado Completo</option>
          </select>

          {/* Export button */}
          <button
            onClick={() => {
              const headers = ['Participante', 'Email', 'Empresa(s)', 'Cuota (Bs)', 'Total Pagado (Bs)', 'Saldo (Bs)', 'Pagos Realizados (Detalle)'];
              const rows = filteredPaymentsUsers.map(u => {
                const cuota = u.companies.length > 0 ? u.companies.reduce((sum: number, c: any) => sum + parseFloat(c.monto_participacion || 150), 0) : 150;
                const totalPagado = u.payments.reduce((sum: number, p: any) => sum + parseFloat(p.monto), 0);
                const saldo = cuota - totalPagado;
                const companiesStr = u.companies.map((c: any) => c.nombre).join('; ');
                const paymentsStr = u.payments.map((p: any) => `${p.monto} (${new Date(p.fecha).toLocaleDateString('es-BO')})`).join('; ');
                return [
                  u.nombre,
                  u.email,
                  companiesStr || 'Sin Empresa',
                  cuota,
                  totalPagado,
                  saldo,
                  paymentsStr || 'Ninguno'
                ];
              });

              // Calculate sums for the end of the sheet
              const totalCuotas = filteredPaymentsUsers.reduce((sum, u) => {
                const cuota = u.companies.length > 0 ? u.companies.reduce((s: number, c: any) => s + parseFloat(c.monto_participacion || 150), 0) : 150;
                return sum + cuota;
              }, 0);
              const totalPagadoTodos = filteredPaymentsUsers.reduce((sum, u) => {
                const total = u.payments.reduce((s: number, p: any) => s + parseFloat(p.monto), 0);
                return sum + total;
              }, 0);
              const totalSaldo = totalCuotas - totalPagadoTodos;

              rows.push([]);
              rows.push(['TOTAL GENERAL', '', '', totalCuotas, totalPagadoTodos, totalSaldo, '']);

              const csvContent = "\uFEFF" + [headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','), ...rows.map(r => r.map(val => {
                if (typeof val === 'number') return val;
                return `"${String(val).replace(/"/g, '""')}"`;
              }).join(','))].join('\n');

              const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
              const link = document.createElement('a');
              link.href = URL.createObjectURL(blob);
              link.setAttribute('download', `reporte_pagos_${new Date().toISOString().slice(0, 10)}.csv`);
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl px-3 py-2 text-xs transition flex items-center gap-1 cursor-pointer"
          >
            📥 Exportar Excel (CSV)
          </button>
          <button
            type="button"
            disabled={reportSubmitting}
            onClick={handleSendPaymentsReport}
            className="bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-neutral-950 font-bold rounded-xl px-3 py-2 text-xs transition flex items-center gap-1.5 cursor-pointer font-sans"
          >
            ✉️ {reportSubmitting ? 'Enviando...' : 'Enviar Reporte por Correo'}
          </button>
        </div>
      </div>

      {/* Excel-style table */}
      {paymentsLoading ? (
        <div className="flex justify-center items-center py-12">
          <RefreshCw className="w-8 h-8 text-yellow-500 animate-spin" />
        </div>
      ) : filteredPaymentsUsers.length === 0 ? (
        <div className="bg-neutral-900/40 border border-neutral-900 rounded-2xl p-12 text-center text-neutral-500 text-xs">
          No se encontraron participantes con los filtros seleccionados.
        </div>
      ) : (
        <div className="bg-neutral-900/40 border border-neutral-900 rounded-2xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-neutral-950 text-neutral-400 border-b border-neutral-850 uppercase tracking-wider font-black text-[10px]">
                  <th className="p-3 border-r border-neutral-850/50">Participante</th>
                  <th className="p-3 border-r border-neutral-850/50">Empresa</th>
                  <th className="p-3 border-r border-neutral-850/50 text-right">Cuota</th>
                  <th className="p-3 border-r border-neutral-850/50 text-right">Total Pagado</th>
                  <th className="p-3 border-r border-neutral-850/50 text-right">Saldo</th>
                  <th className="p-3 border-r border-neutral-850/50">Pagos Realizados</th>
                  <th className="p-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-850">
                {filteredPaymentsUsers.map(u => {
                  const cuota = u.companies.length > 0 ? u.companies.reduce((sum: number, c: any) => sum + parseFloat(c.monto_participacion || 150), 0) : 150;
                  const totalPagado = u.payments.reduce((sum: number, p: any) => sum + parseFloat(p.monto), 0);
                  const saldo = cuota - totalPagado;

                  let statusColor = "text-red-400";
                  let statusBg = "bg-red-500/10 border-red-500/20";
                  if (saldo <= 0) {
                    statusColor = "text-green-400";
                    statusBg = "bg-green-500/10 border-green-500/20";
                  } else if (totalPagado > 0) {
                    statusColor = "text-yellow-400";
                    statusBg = "bg-yellow-500/10 border-yellow-500/20";
                  }

                  return (
                    <tr key={u.id} className="hover:bg-neutral-900/20 transition-colors">
                      <td className="p-3 border-r border-neutral-850/50">
                        <div className="flex items-center gap-2 font-bold text-neutral-200">
                          <img
                            src={u.avatar || 'https://stg00vm.blob.core.windows.net/jet00/default.webp'}
                            className="w-6 h-6 rounded-full border border-neutral-800 object-cover bg-neutral-950"
                            alt="avatar"
                          />
                          <div>
                            <div>{u.nombre}</div>
                            <div className="text-[10px] text-neutral-500 font-mono font-normal">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 border-r border-neutral-850/50">
                        <div className="flex flex-wrap gap-1">
                          {u.companies.length > 0 ? (
                            u.companies.map((c: any) => (
                              <span key={c.id} className="text-[9px] px-2 py-0.5 rounded-full border font-bold"
                                style={{ color: c.color, borderColor: c.color + '40', backgroundColor: c.color + '15' }}>
                                {c.nombre}
                              </span>
                            ))
                          ) : (
                            <span className="text-[9px] px-2 py-0.5 rounded-full border border-neutral-800 text-neutral-500 bg-neutral-950 font-mono">Sin Empresa</span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 border-r border-neutral-850/50 text-right font-mono text-neutral-300">
                        Bs. {cuota.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 border-r border-neutral-850/50 text-right font-mono font-bold text-neutral-100">
                        Bs. {totalPagado.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 border-r border-neutral-850/50 text-right font-mono">
                        <span className={`px-2 py-0.5 rounded-lg border text-[10px] font-black ${statusBg} ${statusColor}`}>
                          Bs. {saldo.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="p-3 border-r border-neutral-850/50">
                        <div className="flex flex-wrap gap-1.5 items-center max-w-xs">
                          {u.payments.length === 0 ? (
                            <span className="text-[10px] text-neutral-600 italic font-sans font-medium">Ningún pago</span>
                          ) : (
                            u.payments.map((p: any) => (
                              <span key={p.id} className="inline-flex items-center text-[9px] font-bold bg-neutral-900 border border-neutral-800 rounded-md px-1.5 py-0.5 text-neutral-400">
                                Bs. {p.monto} <span className="text-neutral-600 ml-1 font-normal">({new Date(p.fecha).toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit' })})</span>
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex gap-1.5 justify-center">
                          <button
                            onClick={() => {
                              setPaymentModalUser(u);
                              setNewPaymentMonto('');
                              setNewPaymentFecha(new Date().toISOString().split('T')[0]);
                            }}
                            className="bg-yellow-500 hover:bg-yellow-600 text-neutral-950 font-bold px-2 py-1 rounded-lg transition text-[10px] flex items-center gap-1 cursor-pointer"
                            title="Registrar Pago"
                          >
                            <Plus className="w-3 h-3" /> Pago
                          </button>
                          <button
                            onClick={() => {
                              setManagePaymentsUser(u);
                              setEditingPaymentId(null);
                            }}
                            className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold px-2 py-1 rounded-lg border border-neutral-750 transition text-[10px] cursor-pointer"
                          >
                            Detalle
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {/* Total Summary Row */}
                {(() => {
                  const totalCuotas = filteredPaymentsUsers.reduce((sum, u) => {
                    const cuota = u.companies.length > 0 ? u.companies.reduce((s: number, c: any) => s + parseFloat(c.monto_participacion || '150'), 0) : 150;
                    return sum + cuota;
                  }, 0);
                  const totalPagadoTodos = filteredPaymentsUsers.reduce((sum, u) => {
                    const total = u.payments.reduce((s: number, p: any) => s + parseFloat(p.monto || '0'), 0);
                    return sum + total;
                  }, 0);
                  const totalSaldo = totalCuotas - totalPagadoTodos;

                  return (
                    <tr className="bg-neutral-950 font-black text-neutral-200 border-t-2 border-neutral-800">
                      <td className="p-3 border-r border-neutral-850/50 uppercase tracking-widest text-[9px]" colSpan={2}>
                        Total General ({filteredPaymentsUsers.length} Participantes)
                      </td>
                      <td className="p-3 border-r border-neutral-850/50 text-right font-mono text-neutral-300">
                        Bs. {totalCuotas.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 border-r border-neutral-850/50 text-right font-mono text-yellow-500">
                        Bs. {totalPagadoTodos.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 border-r border-neutral-850/50 text-right font-mono text-red-400">
                        Bs. {totalSaldo.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3" colSpan={2}></td>
                    </tr>
                  );
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── MODAL: Register Payment ── */}
      {paymentModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setPaymentModalUser(null)}>
          <div className="glass-card border border-neutral-800/80 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-neutral-800/50 pb-4">
              <div>
                <h3 className="text-sm font-black uppercase text-neutral-100 tracking-wider flex items-center gap-2">
                  <Coins className="w-4 h-4 text-yellow-500" /> Registrar Pago
                </h3>
                <p className="text-[10px] text-neutral-500 mt-0.5">{paymentModalUser.nombre}</p>
              </div>
              <button onClick={() => setPaymentModalUser(null)} className="text-neutral-500 hover:text-neutral-200 transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterPayment} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest">Monto (Bs.)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={newPaymentMonto}
                  onChange={e => setNewPaymentMonto(e.target.value)}
                  placeholder="Ej: 150"
                  className="w-full input-stitch px-3 py-2 text-xs bg-neutral-950 border border-neutral-850 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest">Fecha</label>
                <input
                  type="date"
                  required
                  value={newPaymentFecha}
                  onChange={e => setNewPaymentFecha(e.target.value)}
                  className="w-full input-stitch px-3 py-2 text-xs bg-neutral-950 border border-neutral-850 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest">Comprobante (Imagen o PDF - Opcional)</label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={e => setNewPaymentFile(e.target.files?.[0] || null)}
                  className="w-full bg-neutral-950 border border-neutral-850 rounded-xl px-3 py-2 text-xs text-neutral-400 file:mr-3 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-neutral-800 file:text-neutral-200 hover:file:bg-neutral-700 cursor-pointer"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest">Notas / Observaciones (Opcional)</label>
                <input
                  type="text"
                  value={newPaymentNotas}
                  onChange={e => setNewPaymentNotas(e.target.value)}
                  placeholder="Ej: Pago de cuota de inscripción"
                  className="w-full input-stitch px-3 py-2 text-xs bg-neutral-950 border border-neutral-850 rounded-xl"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setPaymentModalUser(null)} className="flex-1 btn-secondary-stitch py-2.5 text-xs font-black uppercase tracking-wider">Cancelar</button>
                <button type="submit" disabled={paymentSubmitting} className="flex-1 btn-primary-stitch py-2.5 text-xs font-black uppercase tracking-wider disabled:opacity-50 font-sans">
                  {paymentSubmitting ? 'Registrando...' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Manage Payments ── */}
      {managePaymentsUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setManagePaymentsUser(null)}>
          <div className="glass-card border border-neutral-800/80 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-neutral-800/50 pb-4">
              <div>
                <h3 className="text-sm font-black uppercase text-neutral-100 tracking-wider flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-yellow-500" /> Historial de Pagos
                </h3>
                <p className="text-[10px] text-neutral-500 mt-0.5">{managePaymentsUser.nombre} ({managePaymentsUser.email})</p>
              </div>
              <button onClick={() => setManagePaymentsUser(null)} className="text-neutral-500 hover:text-neutral-200 transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="max-h-[300px] overflow-y-auto divide-y divide-neutral-900 pr-1">
                {managePaymentsUser.payments.length === 0 ? (
                  <p className="text-xs text-neutral-500 italic py-4 text-center">Este participante no tiene pagos registrados.</p>
                ) : (
                  managePaymentsUser.payments.map((p: any) => (
                    <div key={p.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                      {editingPaymentId === p.id ? (
                        <div className="flex-1 flex flex-col gap-2 p-2 bg-neutral-950/60 border border-neutral-850 rounded-xl">
                          <div className="flex gap-2 items-center">
                            <span className="text-[10px] text-neutral-500 font-bold uppercase w-12 font-sans">Monto:</span>
                            <input
                              type="number"
                              step="0.01"
                              value={editingPaymentMonto}
                              onChange={e => setEditingPaymentMonto(e.target.value)}
                              className="w-24 bg-neutral-900 border border-neutral-800 rounded-lg px-2 py-1 text-xs text-neutral-200"
                            />
                            <span className="text-[10px] text-neutral-500 font-bold uppercase ml-2 font-sans">Fecha:</span>
                            <input
                              type="date"
                              value={editingPaymentFecha}
                              onChange={e => setEditingPaymentFecha(e.target.value)}
                              className="bg-neutral-900 border border-neutral-800 rounded-lg px-2 py-1 text-xs text-neutral-200"
                            />
                          </div>
                          
                          <div className="flex gap-2 items-center">
                            <span className="text-[10px] text-neutral-500 font-bold uppercase w-12 font-sans">Notas:</span>
                            <input
                              type="text"
                              value={editingPaymentNotas}
                              onChange={e => setEditingPaymentNotas(e.target.value)}
                              placeholder="Ej: Pago de cuota de inscripción"
                              className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-2 py-1 text-xs text-neutral-200"
                            />
                          </div>

                          <div className="flex gap-2 items-center justify-between">
                            <div className="flex gap-2 items-center flex-1">
                              <span className="text-[10px] text-neutral-500 font-bold uppercase w-12 font-sans">Voucher:</span>
                              <input
                                type="file"
                                accept="image/*,application/pdf"
                                onChange={e => setEditingPaymentFile(e.target.files?.[0] || null)}
                                className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-2 py-0.5 text-[10px] text-neutral-400 file:mr-2 file:py-0.5 file:px-1.5 file:rounded file:border-0 file:text-[9px] file:bg-neutral-800 file:text-neutral-200 cursor-pointer"
                              />
                            </div>
                            
                            <div className="flex gap-1.5 ml-2">
                              <button
                                onClick={() => handleUpdatePayment(p.id)}
                                className="bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 px-2.5 py-1 rounded-lg font-bold transition active:scale-95"
                                title="Guardar cambios"
                              >
                                Guardar
                              </button>
                              <button
                                onClick={() => {
                                  setEditingPaymentId(null);
                                  setEditingPaymentFile(null);
                                  setEditingPaymentNotas('');
                                }}
                                className="bg-neutral-850 hover:bg-neutral-750 text-neutral-400 px-2.5 py-1 rounded-lg border border-neutral-800 transition active:scale-95"
                                title="Cancelar"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <div>
                              <div className="font-bold text-neutral-200">Bs. {parseFloat(p.monto).toLocaleString('es-BO', { minimumFractionDigits: 2 })}</div>
                              <div className="text-[10px] text-neutral-500">{new Date(p.fecha).toLocaleString('es-BO')}</div>
                              {p.notes && <div className="text-[10px] text-neutral-400 italic mt-0.5">📝 {p.notes}</div>}
                              {p.notas && <div className="text-[10px] text-neutral-400 italic mt-0.5">📝 {p.notas}</div>}
                            </div>
                            {p.comprobante_url && (
                              <a
                                href={p.comprobante_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-yellow-500 hover:text-yellow-400 p-1 transition"
                                title="Ver comprobante"
                              >
                                <Search className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => {
                                setEditingPaymentId(p.id);
                                setEditingPaymentMonto(String(p.monto));
                                setEditingPaymentFecha(p.fecha.split('T')[0]);
                                setEditingPaymentNotas(p.notas || '');
                              }}
                              className="text-neutral-400 hover:text-neutral-200 p-1.5 transition"
                              title="Editar"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeletePayment(p.id)}
                              className="text-red-500 hover:text-red-400 p-1.5 transition"
                              title="Eliminar"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-neutral-900">
              <button
                onClick={() => setManagePaymentsUser(null)}
                className="btn-secondary-stitch px-4 py-2 text-xs font-black uppercase tracking-wider font-mono"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
