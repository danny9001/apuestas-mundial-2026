'use client';

import { useState } from 'react';
import {
  Users, BarChart3, Check, X, Pencil, Trash2, KeyRound, RefreshCw
} from 'lucide-react';

interface UsersTabProps {
  user: any;
  adminUsers: any[];
  setAdminUsers: React.Dispatch<React.SetStateAction<any[]>>;
  companies: any[];
  fetchAdminUsers: () => Promise<void>;
  showToast: (msg: string) => void;
}

export default function UsersTab({
  user,
  adminUsers,
  setAdminUsers,
  companies,
  fetchAdminUsers,
  showToast,
}: UsersTabProps) {
  // Create user state
  const [newUserNombre, setNewUserNombre] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserConfirmPassword, setNewUserConfirmPassword] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserTipo, setNewUserTipo] = useState<'externo' | 'interno' | 'admin' | 'superadmin'>('externo');
  const [newUserCompanyId, setNewUserCompanyId] = useState<number | ''>('');
  const [newUserCompanyIds, setNewUserCompanyIds] = useState<number[]>([]);
  const [newUserSubmitting, setNewUserSubmitting] = useState(false);
  const [newUserPagoMonto, setNewUserPagoMonto] = useState('');
  const [newUserNotas, setNewUserNotas] = useState('');

  // Approve user state
  const [approveUserModal, setApproveUserModal] = useState<any | null>(null);
  const [approveUserPagoMonto, setApproveUserPagoMonto] = useState('');
  const [approveUserNotas, setApproveUserNotas] = useState('');
  const [approveUserSubmitting, setApproveUserSubmitting] = useState(false);

  // Edit user modal state
  const [editUserModal, setEditUserModal] = useState<any | null>(null);
  const [editUserNombre, setEditUserNombre] = useState('');
  const [editUserEmail, setEditUserEmail] = useState('');
  const [editUserTelefono, setEditUserTelefono] = useState('');
  const [editUserTipo, setEditUserTipo] = useState('');
  const [editUserPassword, setEditUserPassword] = useState('');
  const [editUserSubmitting, setEditUserSubmitting] = useState(false);
  const [editUserError, setEditUserError] = useState('');
  const [editUserCompanyIds, setEditUserCompanyIds] = useState<number[]>([]);

  // Handlers
  const handleApproveUserClick = (u: any) => {
    setApproveUserModal(u);
    setApproveUserPagoMonto('');
    setApproveUserNotas('');
  };

  const handleConfirmApproveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approveUserModal) return;
    setApproveUserSubmitting(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          userId: approveUserModal.id,
          pagoMonto: approveUserPagoMonto ? parseFloat(approveUserPagoMonto) : 0,
          notas: approveUserNotas.trim() || undefined
        }),
      });
      if (res.ok) {
        const d = await res.json();
        setAdminUsers(prev => prev.map(u => u.id === approveUserModal.id ? { ...u, ...d.user } : u));
        showToast('✅ Usuario aprobado para participar');
        setApproveUserModal(null);
      } else {
        const d = await res.json(); showToast(d.error || 'Error');
      }
    } catch { showToast('Error de red'); }
    finally { setApproveUserSubmitting(false); }
  };

  const handleDenyUser = async (userId: number) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deny', userId }),
      });
      if (res.ok) {
        const d = await res.json();
        setAdminUsers(prev => prev.map(u => u.id === userId ? { ...u, ...d.user } : u));
        showToast('🚫 Solicitud denegada');
      } else {
        const d = await res.json(); showToast(d.error || 'Error');
      }
    } catch { showToast('Error de red'); }
  };

  const handleSetPending = async (userId: number) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_pending', userId }),
      });
      if (res.ok) {
        const d = await res.json();
        setAdminUsers(prev => prev.map(u => u.id === userId ? { ...u, ...d.user } : u));
        showToast('⏳ Usuario puesto en espera nuevamente');
      } else {
        const d = await res.json(); showToast(d.error || 'Error');
      }
    } catch { showToast('Error de red'); }
  };

  const handleToggleUserStatus = async (userId: number, currentActive: boolean) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, activo: !currentActive }),
      });
      if (res.ok) {
        setAdminUsers(prev => prev.map(u => u.id === userId ? { ...u, activo: !currentActive } : u));
        showToast(`Usuario ${!currentActive ? 'activado' : 'desactivado'}`);
      } else {
        const d = await res.json(); showToast(d.error || 'Error');
      }
    } catch { showToast('Error de red'); }
  };

  const handleToggleParticipa = async (userId: number, current: boolean) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggleParticipa', userId }),
      });
      if (!res.ok) { showToast('Error al cambiar participación'); return; }
      const d = await res.json();
      setAdminUsers(prev => prev.map(u => u.id === userId ? { ...u, participa: d.participa } : u));
      showToast(d.participa ? '✅ Usuario marcado como participante' : '👁 Usuario marcado como visor');
    } catch { showToast('Error de red'); }
  };

  const handleToggleArbitro = async (userId: number) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggleArbitroMarcador', userId }),
      });
      if (!res.ok) { const d = await res.json(); showToast(d.error || 'Error'); return; }
      const d = await res.json();
      setAdminUsers(prev => prev.map(u => u.id === userId ? { ...u, arbitro_marcador: d.arbitro_marcador } : u));
      showToast(d.arbitro_marcador ? '⚖️ Árbitro del Marcador asignado' : '⚖️ Rol de árbitro removido');
    } catch { showToast('Error de red'); }
  };

  const handleToggleModerador = async (userId: number) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggleModerador', userId }),
      });
      if (!res.ok) { const d = await res.json(); showToast(d.error || 'Error'); return; }
      const d = await res.json();
      setAdminUsers(prev => prev.map(u => u.id === userId ? { ...u, is_moderador: d.is_moderador } : u));
      showToast(d.is_moderador ? '🟨 Juez de Línea asignado' : '🟨 Rol de Juez removido');
    } catch { showToast('Error de red'); }
  };

  const handleToggleUserCompany = async (userId: number, companyId: number, currentlyMember: boolean) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'assignCompany', userId, companyId, assign: !currentlyMember }),
      });
      if (!res.ok) { const d = await res.json(); showToast(d.error || 'Error'); return; }
      setAdminUsers(prev => prev.map(u => {
        if (u.id !== userId) return u;
        const updated = currentlyMember
          ? u.companies.filter((c: any) => c.id !== companyId)
          : [...u.companies, companies.find(c => c.id === companyId)].filter(Boolean);
        return { ...u, companies: updated };
      }));
      showToast(currentlyMember ? '🏢 Removido de empresa' : '🏢 Asignado a empresa');
    } catch { showToast('Error de red'); }
  };

  const handleDeleteUser = async (userId: number, nombre: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar permanentemente al usuario "${nombre}"? Esta acción borrará todos sus pronósticos y no se puede deshacer.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/users?userId=${userId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setAdminUsers(prev => prev.filter(u => u.id !== userId));
        showToast('🗑️ Usuario eliminado con éxito');
      } else {
        const d = await res.json();
        showToast(d.error || 'Error al eliminar usuario');
      }
    } catch {
      showToast('Error de red');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserNombre.trim() || !newUserEmail.trim() || !newUserPassword.trim()) {
      showToast('⚠️ Nombre, correo y contraseña son obligatorios'); return;
    }
    if (newUserPassword.length < 8) { showToast('⚠️ La contraseña debe tener al menos 8 caracteres'); return; }
    if (newUserPassword !== newUserConfirmPassword) { showToast('⚠️ Las contraseñas no coinciden'); return; }
    const companyIds = newUserTipo === 'admin' && newUserCompanyId
      ? [newUserCompanyId as number]
      : newUserCompanyIds.length > 0 ? newUserCompanyIds : undefined;
    setNewUserSubmitting(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          nombre: newUserNombre.trim(),
          email: newUserEmail.trim(),
          password: newUserPassword.trim(),
          tipo: newUserTipo,
          telefono: newUserPhone.trim() || undefined,
          companyId: newUserTipo === 'admin' ? (newUserCompanyId || undefined) : undefined,
          companyIds: newUserTipo !== 'admin' ? companyIds : undefined,
          pagoMonto: newUserPagoMonto ? parseFloat(newUserPagoMonto) : undefined,
          notas: newUserNotas.trim() || undefined,
        }),
      });
      const d = await res.json();
      if (res.ok && d.success) {
        showToast('👤 ¡Usuario creado con éxito!');
        await fetchAdminUsers();
        setNewUserNombre(''); setNewUserEmail(''); setNewUserPassword('');
        setNewUserConfirmPassword(''); setNewUserPhone('');
        setNewUserTipo('externo'); setNewUserCompanyId(''); setNewUserCompanyIds([]);
        setNewUserPagoMonto(''); setNewUserNotas('');
      } else {
        showToast(`Error: ${d.error || 'No se pudo crear el usuario'}`);
      }
    } catch { showToast('Error de red'); }
    finally { setNewUserSubmitting(false); }
  };

  const openEditUserModal = (u: any) => {
    setEditUserModal(u);
    setEditUserNombre(u.nombre);
    setEditUserEmail(u.email);
    setEditUserTelefono(u.telefono || '');
    setEditUserTipo(u.tipo);
    setEditUserPassword('');
    setEditUserError('');
    setEditUserCompanyIds((u.companies || []).map((c: any) => c.id));
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUserModal) return;
    if (!editUserNombre.trim()) { setEditUserError('El nombre es requerido'); return; }
    if (!editUserEmail.trim()) { setEditUserError('El email es requerido'); return; }
    setEditUserSubmitting(true);
    setEditUserError('');
    try {
      const body: any = {
        action: 'editUser',
        userId: editUserModal.id,
        nombre: editUserNombre.trim(),
        email: editUserEmail.trim().toLowerCase(),
        tipo: editUserTipo,
        telefono: editUserTelefono.trim(),
      };
      if (editUserPassword.trim()) body.password = editUserPassword.trim();
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (res.ok) {
        if (user?.tipo === 'superadmin' && companies.length > 0) {
          await fetch('/api/admin/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'setCompanies', userId: editUserModal.id, companyIds: editUserCompanyIds }),
          });
        }
        setAdminUsers(prev => prev.map(u => u.id === editUserModal.id ? { ...u, ...d.user } : u));
        showToast('✅ Usuario actualizado');
        setEditUserModal(null);
        await fetchAdminUsers();
      } else {
        setEditUserError(d.error || 'Error al guardar');
      }
    } catch { setEditUserError('Error de red'); }
    finally { setEditUserSubmitting(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
        <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-2">
          <Users className="w-3.5 h-3.5" />
          {user.tipo === 'superadmin' ? 'Todos los Usuarios del Sistema' : 'Usuarios de Mi Empresa'}
        </h3>
        {(user.tipo === 'superadmin' || user.tipo === 'admin') && (
          <a
            href="/admin/predictions"
            className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg border border-yellow-500/30 text-yellow-500 bg-yellow-500/10 hover:bg-yellow-500/20 transition"
          >
            <BarChart3 className="w-3 h-3" /> Ver Pronósticos
          </a>
        )}
      </div>

      {/* Create user form */}
      <form onSubmit={handleCreateUser} className="bg-neutral-900/40 border border-neutral-900 rounded-2xl p-5 space-y-4 shadow-lg">
        <div className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
          <Users className="w-3.5 h-3.5 text-yellow-500" />
          {user.tipo === 'superadmin' ? 'Crear Nuevo Usuario / Administrador' : 'Agregar Usuario a Mi Empresa'}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest">Nombre Completo *</label>
            <input type="text" required value={newUserNombre} onChange={e => setNewUserNombre(e.target.value)} placeholder="ej: Diego Armando" className="w-full input-stitch px-3 py-2 text-xs" autoComplete="name" />
          </div>
          <div className="space-y-1.5">
            <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest">Correo Electrónico *</label>
            <input type="email" required value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} placeholder="usuario@empresa.com" className="w-full input-stitch px-3 py-2 text-xs" autoComplete="username" />
          </div>
          <div className="space-y-1.5">
            <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest">Contraseña (mín. 8) *</label>
            <input type="password" required autoComplete="new-password" value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} placeholder="Mínimo 8 caracteres" className="w-full input-stitch px-3 py-2 text-xs" />
          </div>
          <div className="space-y-1.5">
            <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest">Confirmar Contraseña *</label>
            <input type="password" required autoComplete="new-password" value={newUserConfirmPassword} onChange={e => setNewUserConfirmPassword(e.target.value)} placeholder="Repite la contraseña"
              className={`w-full input-stitch px-3 py-2 text-xs ${newUserConfirmPassword && newUserPassword !== newUserConfirmPassword ? 'border-red-600/60' : ''}`} />
            {newUserConfirmPassword && newUserPassword !== newUserConfirmPassword && (
              <p className="text-[9px] text-red-400 font-bold">Las contraseñas no coinciden</p>
            )}
          </div>
          <div className="space-y-1.5">
            <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest">Celular / WhatsApp</label>
            <div className="flex gap-2 items-center">
              <span className="text-neutral-400 text-sm flex-shrink-0">📱</span>
              <input type="tel" value={newUserPhone} onChange={e => setNewUserPhone(e.target.value)} placeholder="+591 XXXXXXXX" className="w-full input-stitch px-3 py-2 text-xs" autoComplete="tel" />
            </div>
          </div>
          {user.tipo === 'superadmin' && (
            <div className="space-y-1.5">
              <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest">Rol</label>
              <select value={newUserTipo} onChange={e => { setNewUserTipo(e.target.value as any); setNewUserCompanyIds([]); setNewUserCompanyId(''); }}
                className="w-full bg-neutral-950 border border-neutral-850 text-neutral-300 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-yellow-500/30">
                <option value="externo">Usuario Externo</option>
                <option value="interno">Usuario Interno</option>
                <option value="admin">Administrador de Empresa</option>
                <option value="superadmin">Super Administrador</option>
              </select>
            </div>
          )}
          {user.tipo === 'superadmin' && newUserTipo === 'admin' && (
            <div className="space-y-1.5">
              <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest">Empresa a Gestionar</label>
              <select value={newUserCompanyId} onChange={e => setNewUserCompanyId(e.target.value ? parseInt(e.target.value) : '')}
                className="w-full bg-neutral-950 border border-neutral-850 text-neutral-300 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-yellow-500/30">
                <option value="">Sin empresa asignada</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
          )}
          <div className="space-y-1.5">
            <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest">Pago Inicial (Bs. - Opcional)</label>
            <input type="number" step="0.01" value={newUserPagoMonto} onChange={e => setNewUserPagoMonto(e.target.value)} placeholder="Ej: 150" className="w-full input-stitch px-3 py-2 text-xs" />
          </div>
          <div className="space-y-1.5">
            <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest">Notas / Observaciones</label>
            <input type="text" value={newUserNotas} onChange={e => setNewUserNotas(e.target.value)} placeholder="Ej: Pago de cuota de inscripción" className="w-full input-stitch px-3 py-2 text-xs" />
          </div>
        </div>
        {user.tipo === 'superadmin' && (newUserTipo === 'externo' || newUserTipo === 'interno') && companies.length > 0 && (
          <div className="space-y-2">
            <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest">Asignar a Empresa(s)</label>
            <div className="flex flex-wrap gap-2">
              {companies.map(c => {
                const sel = newUserCompanyIds.includes(c.id);
                return (
                  <button key={c.id} type="button"
                    onClick={() => setNewUserCompanyIds(sel ? newUserCompanyIds.filter(id => id !== c.id) : [...newUserCompanyIds, c.id])}
                    className="px-3 py-1.5 rounded-full text-[10px] font-bold border transition"
                    style={{ color: sel ? '#0a0a0a' : c.color, borderColor: c.color, backgroundColor: sel ? c.color : c.color + '15' }}>
                    {c.nombre}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <div className="flex justify-end pt-2">
          <button type="submit" disabled={newUserSubmitting || (!!newUserConfirmPassword && newUserPassword !== newUserConfirmPassword)}
            className="bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-neutral-950 text-xs font-bold px-5 py-2.5 rounded-lg flex items-center gap-1.5 transition active:scale-95 shadow">
            <Users className="w-3.5 h-3.5" />
            <span>{newUserSubmitting ? 'Creando...' : 'Crear Usuario'}</span>
          </button>
        </div>
      </form>

      {/* Pending requests */}
      {(() => {
        const pendientes = adminUsers.filter(u => !u.aprobado && !u.denegado && u.tipo !== 'admin' && u.tipo !== 'superadmin' && u.id !== user.id);
        if (!pendientes.length) return null;
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[10px] font-black text-yellow-500 uppercase tracking-widest">
              <span className="h-2 w-2 rounded-full bg-yellow-500 animate-ping inline-block" />
              Solicitudes Pendientes ({pendientes.length})
            </div>
            <div className="border border-yellow-500/20 bg-yellow-500/3 divide-y divide-yellow-500/10 rounded-2xl overflow-hidden">
              {pendientes.map(u => (
                <div key={u.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img src={(u.avatar && u.avatar !== 'null' && u.avatar !== 'undefined') ? u.avatar : 'https://stg00vm.blob.core.windows.net/jet00/default.webp'} onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = 'https://stg00vm.blob.core.windows.net/jet00/default.webp'; }} className={`w-10 h-10 rounded-full border border-neutral-800 flex-shrink-0 object-cover ${(!u.avatar || u.avatar === 'null' || u.avatar === 'undefined' || u.avatar.includes('avatar_5.png') || u.avatar.includes('default.webp')) ? 'bg-white' : 'bg-neutral-950'}`} alt="avatar" />
                    <div className="min-w-0">
                      <div className="font-bold text-sm text-neutral-200 truncate">{u.nombre}</div>
                      <div className="text-[9px] text-neutral-500 font-mono">{u.email}{u.telefono && ` · 📱 ${u.telefono}`}</div>
                      <div className="text-[8px] text-neutral-500 font-mono">{new Date(u.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
                    {user.tipo === 'superadmin' && companies.length > 0 && (
                      <div className="flex gap-1 flex-wrap max-w-[180px]">
                        {companies.map(c => {
                          const isMember = (u.companies || []).some((uc: any) => uc.id === c.id);
                          return (
                            <button key={c.id} onClick={() => handleToggleUserCompany(u.id, c.id, isMember)}
                              className={`text-[9px] px-2 py-1 rounded-full border font-bold transition ${isMember ? 'opacity-100' : 'opacity-30 hover:opacity-70'}`}
                              style={{ color: c.color, borderColor: c.color + '60', backgroundColor: isMember ? c.color + '20' : 'transparent' }}>
                              {c.nombre}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    <button onClick={() => handleApproveUserClick(u)} className="font-bold py-1.5 px-3 rounded-xl flex items-center gap-1.5 transition text-[11px] bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20">
                      <Check className="w-3.5 h-3.5" /> Aprobar
                    </button>
                    <button onClick={() => handleDenyUser(u.id)} className="font-bold py-1.5 px-3 rounded-xl flex items-center gap-1.5 transition text-[11px] bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20">
                      <X className="w-3.5 h-3.5" /> Denegar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* All users list */}
      <div className="text-[10px] text-neutral-500 uppercase tracking-widest font-black pt-2">
        {user.tipo === 'superadmin' ? `Todos los usuarios (${adminUsers.length})` : `Usuarios de mi empresa (${adminUsers.filter(u => u.id !== user.id).length})`}
      </div>
      <div className="bg-neutral-900/40 border border-neutral-900 divide-y divide-neutral-900 rounded-2xl overflow-hidden shadow-lg">
        {adminUsers.map(u => (
          <div key={u.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 text-xs gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <img src={(u.avatar && u.avatar !== 'null' && u.avatar !== 'undefined') ? u.avatar : 'https://stg00vm.blob.core.windows.net/jet00/default.webp'} onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = 'https://stg00vm.blob.core.windows.net/jet00/default.webp'; }} className={`w-10 h-10 rounded-full border border-neutral-850 flex-shrink-0 object-cover ${(!u.avatar || u.avatar === 'null' || u.avatar === 'undefined' || u.avatar.includes('avatar_5.png') || u.avatar.includes('default.webp')) ? 'bg-white' : 'bg-neutral-950'}`} alt="avatar" />
              <div className="min-w-0">
                <div className="font-bold text-sm text-neutral-200 flex items-center gap-2 flex-wrap">
                  <span className="truncate">{u.nombre}</span>
                  {u.denegado && <span className="text-[8px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 font-black uppercase flex-shrink-0">Denegado</span>}
                  {(u.companies || []).map((c: any) => (
                    <span key={c.id} className="text-[9px] px-2 py-0.5 rounded-full border font-bold flex-shrink-0"
                      style={{ color: c.color, borderColor: c.color + '40', backgroundColor: c.color + '18' }}>
                      {c.nombre}
                    </span>
                  ))}
                </div>
                <div className="text-[9px] text-neutral-500 font-mono tracking-widest uppercase">
                  {u.tipo}{u.telefono && ` · 📱 ${u.telefono}`}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
              {user.tipo === 'superadmin' && companies.length > 0 && (
                <div className="flex gap-1 flex-wrap max-w-[200px]">
                  {companies.map(c => {
                    const isMember = (u.companies || []).some((uc: any) => uc.id === c.id);
                    return (
                      <button key={c.id} onClick={() => handleToggleUserCompany(u.id, c.id, isMember)}
                        className={`text-[9px] px-2 py-1 rounded-full border font-bold transition ${isMember ? 'opacity-100' : 'opacity-30 hover:opacity-70'}`}
                        style={{ color: c.color, borderColor: c.color + '60', backgroundColor: isMember ? c.color + '20' : 'transparent' }}>
                        {c.nombre}
                      </button>
                    );
                  })}
                </div>
              )}
              {u.id !== user.id ? (
                <>
                  {!(user.tipo === 'admin' && (u.tipo === 'superadmin' || u.tipo === 'admin')) && (
                    <button onClick={() => openEditUserModal(u)} className="font-bold py-1.5 px-3 rounded-xl flex items-center gap-1.5 transition text-[11px] bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700">
                      <Pencil className="w-3 h-3" /> Editar
                    </button>
                  )}
                  {u.tipo !== 'admin' && u.tipo !== 'superadmin' && (
                    u.denegado ? (
                      <button onClick={() => handleSetPending(u.id)} className="font-bold py-1.5 px-3 rounded-xl flex items-center gap-1.5 transition text-[11px] bg-neutral-800 hover:bg-neutral-700 text-neutral-400 border border-neutral-700">
                        <RefreshCw className="w-3.5 h-3.5" /> Poner en Espera
                      </button>
                    ) : u.aprobado ? (
                      <button onClick={() => handleSetPending(u.id)} className="font-bold py-1.5 px-3 rounded-xl flex items-center gap-1.5 transition text-[11px] bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 border border-yellow-500/20">
                        <Check className="w-3.5 h-3.5" /> Aprobado
                      </button>
                    ) : (
                      <>
                        <button onClick={() => handleApproveUserClick(u)} className="font-bold py-1.5 px-3 rounded-xl flex items-center gap-1.5 transition text-[11px] bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20">
                          <Check className="w-3.5 h-3.5" /> Aprobar
                        </button>
                        <button onClick={() => handleDenyUser(u.id)} className="font-bold py-1.5 px-3 rounded-xl flex items-center gap-1.5 transition text-[11px] bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20">
                          <X className="w-3.5 h-3.5" /> Denegar
                        </button>
                      </>
                    )
                  )}
                  <button onClick={() => handleToggleUserStatus(u.id, u.activo)}
                    className={`font-bold py-1.5 px-3 rounded-xl flex items-center gap-1.5 transition text-[11px] ${u.activo ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20' : 'bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20'}`}>
                    {u.activo ? 'Desactivar' : 'Activar'}
                  </button>
                  {u.aprobado && (
                    <button onClick={() => handleToggleParticipa(u.id, u.participa !== false)}
                      className={`font-bold py-1.5 px-3 rounded-xl flex items-center gap-1.5 transition text-[11px] ${u.participa !== false ? 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20' : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-400 border border-neutral-700'}`}>
                      {u.participa !== false ? '⚽ Participa' : '👁 Visor'}
                    </button>
                  )}
                  {user.tipo === 'superadmin' && u.aprobado && (
                    <button onClick={() => handleToggleArbitro(u.id)}
                      title={u.arbitro_marcador ? 'Quitar rol de Árbitro del Marcador' : 'Asignar como Árbitro del Marcador'}
                      className={`font-bold py-1.5 px-3 rounded-xl flex items-center gap-1.5 transition text-[11px] ${u.arbitro_marcador ? 'bg-yellow-500/15 hover:bg-yellow-500/25 text-yellow-400 border border-yellow-500/30' : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-500 border border-neutral-700'}`}>
                      ⚖️ {u.arbitro_marcador ? 'Árbitro' : 'Árbitro?'}
                    </button>
                  )}
                  {u.aprobado && (
                    <button onClick={() => handleToggleModerador(u.id)}
                      title={u.is_moderador ? 'Quitar rol de Juez de Línea (chat)' : 'Asignar como Juez de Línea (moderador chat)'}
                      className={`font-bold py-1.5 px-3 rounded-xl flex items-center gap-1.5 transition text-[11px] ${u.is_moderador ? 'bg-orange-500/15 hover:bg-orange-500/25 text-orange-400 border border-orange-500/30' : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-500 border border-neutral-700'}`}>
                      🟨 {u.is_moderador ? 'Juez Línea' : 'Juez?'}
                    </button>
                  )}
                  {user.tipo === 'superadmin' && (
                    <button onClick={() => handleDeleteUser(u.id, u.nombre)}
                      className="font-bold py-1.5 px-3 rounded-xl flex items-center gap-1.5 transition text-[11px] bg-red-600/10 hover:bg-red-600/20 text-red-500 border border-red-600/20"
                      title="Eliminar usuario permanentemente"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Borrar
                    </button>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-neutral-500 uppercase tracking-widest italic">Tú</span>
                  <button onClick={() => handleToggleParticipa(u.id, u.participa !== false)}
                    className={`font-bold py-1.5 px-3 rounded-xl flex items-center gap-1.5 transition text-[11px] ${u.participa !== false ? 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20' : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-400 border border-neutral-700'}`}>
                    {u.participa !== false ? '⚽ Participa' : '👁 Visor'}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── MODAL: Approve User with Payment/Notes ── */}
      {approveUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setApproveUserModal(null)}>
          <div className="glass-card border border-neutral-800/80 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-neutral-800/50 pb-4">
              <div>
                <h3 className="text-sm font-black uppercase text-neutral-100 tracking-wider flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" /> Aprobar Usuario
                </h3>
                <p className="text-[10px] text-neutral-500 mt-0.5">{approveUserModal.nombre}</p>
              </div>
              <button onClick={() => setApproveUserModal(null)} className="text-neutral-500 hover:text-neutral-200 transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmApproveUser} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest">Pago Inicial (Bs. - Opcional)</label>
                <input
                  type="number"
                  step="0.01"
                  value={approveUserPagoMonto}
                  onChange={e => setApproveUserPagoMonto(e.target.value)}
                  placeholder="Ej: 150"
                  className="w-full input-stitch px-3 py-2 text-xs bg-neutral-950 border border-neutral-850 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest">Notas / Observaciones (Opcional)</label>
                <input
                  type="text"
                  value={approveUserNotas}
                  onChange={e => setApproveUserNotas(e.target.value)}
                  placeholder="Ej: Pago de cuota de inscripción"
                  className="w-full input-stitch px-3 py-2 text-xs bg-neutral-950 border border-neutral-850 rounded-xl"
                />
              </div>

              <button type="submit" disabled={approveUserSubmitting}
                className="w-full bg-green-500 hover:bg-green-600 disabled:bg-green-500/50 text-neutral-950 font-bold py-3.5 rounded-xl text-sm transition tracking-wider uppercase flex items-center justify-center gap-2 active:scale-[0.98]">
                <Check className="w-4 h-4" />
                <span>{approveUserSubmitting ? 'Aprobando...' : 'Confirmar y Aprobar'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Edit User ── */}
      {editUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setEditUserModal(null)}>
          <div className="glass-card border border-neutral-800/80 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-neutral-800/50 pb-4">
              <div>
                <h3 className="text-sm font-black uppercase text-neutral-100 tracking-wider flex items-center gap-2">
                  <Pencil className="w-4 h-4 text-yellow-500" /> Editar Usuario
                </h3>
                <p className="text-[10px] text-neutral-500 mt-0.5">{editUserModal.email}</p>
              </div>
              <button onClick={() => setEditUserModal(null)} className="text-neutral-500 hover:text-neutral-300 transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveEditUser} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest">Nombre</label>
                <input type="text" required value={editUserNombre} onChange={e => setEditUserNombre(e.target.value)} className="w-full input-stitch px-3 py-2.5 text-sm" placeholder="Nombre completo" />
              </div>
              <div className="space-y-1.5">
                <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest">Correo Electrónico</label>
                <input type="email" required value={editUserEmail} onChange={e => setEditUserEmail(e.target.value)} className="w-full input-stitch px-3 py-2.5 text-sm" placeholder="correo@ejemplo.com" />
              </div>
              <div className="space-y-1.5">
                <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                  📱 Celular / WhatsApp <span className="text-neutral-500 normal-case font-medium">(opcional)</span>
                </label>
                <input type="tel" value={editUserTelefono} onChange={e => setEditUserTelefono(e.target.value)} className="w-full input-stitch px-3 py-2.5 text-sm" placeholder="+591 7XXXXXXX" />
              </div>
              {(user.tipo === 'superadmin' || user.tipo === 'admin') && (
                <div className="space-y-1.5">
                  <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest">Rol</label>
                  <select value={editUserTipo} onChange={e => setEditUserTipo(e.target.value)} className="w-full bg-neutral-950 border border-neutral-850 text-neutral-300 rounded-xl px-3 py-2.5 text-sm focus:ring-1 focus:ring-yellow-500/30">
                    <option value="externo">Usuario Externo</option>
                    <option value="interno">Usuario Interno</option>
                    {user.tipo === 'superadmin' && (
                      <>
                        <option value="admin">Administrador</option>
                        <option value="superadmin">Super Administrador</option>
                      </>
                    )}
                  </select>
                </div>
              )}
              {user.tipo === 'superadmin' && companies.length > 0 && (
                <div className="space-y-2">
                  <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest">
                    {editUserTipo === 'admin' ? 'Empresas que administra' : 'Asignar a Empresa(s)'}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {companies.map((c: any) => {
                      const selected = editUserCompanyIds.includes(c.id);
                      return (
                        <button key={c.id} type="button"
                          onClick={() => setEditUserCompanyIds(prev => selected ? prev.filter(id => id !== c.id) : [...prev, c.id])}
                          className={`text-[11px] px-3 py-1.5 rounded-full border font-bold transition ${selected ? 'opacity-100' : 'opacity-30 hover:opacity-60'}`}
                          style={{ color: selected ? '#0a0a0a' : c.color, borderColor: c.color, backgroundColor: selected ? c.color : c.color + '15' }}>
                          {c.nombre}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="space-y-1.5">
                <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                  <KeyRound className="w-3 h-3" /> Nueva Contraseña <span className="text-neutral-500 normal-case font-medium">(dejar vacío para no cambiar)</span>
                </label>
                <input type="password" value={editUserPassword} onChange={e => setEditUserPassword(e.target.value)} className="w-full input-stitch px-3 py-2.5 text-sm" placeholder="••••••••" autoComplete="new-password" />
              </div>
              {editUserError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl font-semibold">{editUserError}</div>
              )}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setEditUserModal(null)} className="flex-1 btn-secondary-stitch py-2.5 text-xs font-black uppercase tracking-wider">Cancelar</button>
                <button type="submit" disabled={editUserSubmitting} className="flex-1 btn-primary-stitch py-2.5 text-xs font-black uppercase tracking-wider disabled:opacity-50">
                  {editUserSubmitting ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
