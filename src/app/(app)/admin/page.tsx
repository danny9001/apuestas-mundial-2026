'use client';

import { useEffect, useState } from 'react';
import {
  ShieldAlert, Building2, RefreshCw, Users, Settings,
  MessageSquare, Bell, Check, X, Trash2, Pencil, Send,
  KeyRound, BarChart3, DollarSign, Plus, Coins, Calendar as LucideCalendar,
} from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { getTeamFlag, PHASES_APUESTA, DEFAULT_MODOS_POR_FASE } from '@/lib/constants';

export default function AdminPage() {
  const { user, showToast, appName, appLogo, setAppName, setAppLogo } = useApp();

  // Sub-tab
  const [adminSubTab, setAdminSubTab] = useState<'usuarios' | 'empresa' | 'mensajes' | 'pagos'>('usuarios');

  // Payments state
  const [paymentsUsers, setPaymentsUsers] = useState<any[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentModalUser, setPaymentModalUser] = useState<any | null>(null);
  const [newPaymentMonto, setNewPaymentMonto] = useState('');
  const [newPaymentFecha, setNewPaymentFecha] = useState('');
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [managePaymentsUser, setManagePaymentsUser] = useState<any | null>(null);
  const [editingPaymentId, setEditingPaymentId] = useState<number | null>(null);
  const [editingPaymentMonto, setEditingPaymentMonto] = useState('');
  const [editingPaymentFecha, setEditingPaymentFecha] = useState('');
  const [paymentsSearch, setPaymentsSearch] = useState('');
  const [paymentsCompanyFilter, setPaymentsCompanyFilter] = useState<string>('all');
  const [paymentsStatusFilter, setPaymentsStatusFilter] = useState<'all' | 'pending' | 'partial' | 'paid'>('all');

  // Users list
  const [adminUsers, setAdminUsers] = useState<any[]>([]);

  // Companies & groups
  const [companies, setCompanies] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);

  // Sync
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [syncLoading, setSyncLoading] = useState(false);

  // Matches (for live editor)
  const [matches, setMatches] = useState<any[]>([]);

  // App settings
  const [editAppName, setEditAppName] = useState('');
  const [editLogoType, setEditLogoType] = useState<'emoji' | 'file'>('emoji');
  const [editLogoEmoji, setEditLogoEmoji] = useState('🏆');
  const [editLogoFile, setEditLogoFile] = useState<File | null>(null);
  const [editSubtitle, setEditSubtitle] = useState('');
  const [editContactWhatsapp, setEditContactWhatsapp] = useState('');
  const [editContactEmail, setEditContactEmail] = useState('');
  const [settingsSubmitting, setSettingsSubmitting] = useState(false);

  // Create user
  const [newUserNombre, setNewUserNombre] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserConfirmPassword, setNewUserConfirmPassword] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserTipo, setNewUserTipo] = useState<'externo' | 'interno' | 'admin' | 'superadmin'>('externo');
  const [newUserCompanyId, setNewUserCompanyId] = useState<number | ''>('');
  const [newUserCompanyIds, setNewUserCompanyIds] = useState<number[]>([]);
  const [newUserSubmitting, setNewUserSubmitting] = useState(false);

  // Edit user modal
  const [editUserModal, setEditUserModal] = useState<any | null>(null);
  const [editUserNombre, setEditUserNombre] = useState('');
  const [editUserEmail, setEditUserEmail] = useState('');
  const [editUserTelefono, setEditUserTelefono] = useState('');
  const [editUserTipo, setEditUserTipo] = useState('');
  const [editUserPassword, setEditUserPassword] = useState('');
  const [editUserSubmitting, setEditUserSubmitting] = useState(false);
  const [editUserError, setEditUserError] = useState('');
  const [editUserCompanyIds, setEditUserCompanyIds] = useState<number[]>([]);

  // Company
  const [newCompanyNombre, setNewCompanyNombre] = useState('');
  const [newCompanyColor, setNewCompanyColor] = useState('#6366f1');
  const [newCompanyMonto, setNewCompanyMonto] = useState('150');
  const [newCompanyModos, setNewCompanyModos] = useState<Record<string, string>>({ ...DEFAULT_MODOS_POR_FASE });
  const [companySubmitting, setCompanySubmitting] = useState(false);
  const [editingMontoId, setEditingMontoId] = useState<number | null>(null);
  const [editingMontoValue, setEditingMontoValue] = useState('');
  const [expandedCompanyModos, setExpandedCompanyModos] = useState<number | null>(null);

  // Groups
  const [newGroupNombre, setNewGroupNombre] = useState('');
  const [newGroupColor, setNewGroupColor] = useState('#10b981');
  const [groupSubmitting, setGroupSubmitting] = useState(false);
  const [groupMembersModal, setGroupMembersModal] = useState<any | null>(null);
  const [groupMembers, setGroupMembers] = useState<any[]>([]);

  // Invitations
  const [invitations, setInvitations] = useState<any[]>([]);
  const [invCreating, setInvCreating] = useState(false);
  const [invCompanyId, setInvCompanyId] = useState<number | null>(null);
  const [invCopied, setInvCopied] = useState<string | null>(null);

  // Admin match editor modal
  const [adminMatchModal, setAdminMatchModal] = useState<any | null>(null);
  const [adminGolesLocal, setAdminGolesLocal] = useState(0);
  const [adminGolesVisitante, setAdminGolesVisitante] = useState(0);
  const [adminEstado, setAdminEstado] = useState<'upcoming' | 'live' | 'finished'>('upcoming');
  const [adminTransmisionEnlaces, setAdminTransmisionEnlaces] = useState('');
  const [adminSubmitting, setAdminSubmitting] = useState(false);

  // Notifications
  const [notifTitulo, setNotifTitulo] = useState('');
  const [notifContenido, setNotifContenido] = useState('');
  const [notifTipo, setNotifTipo] = useState<'info' | 'warning' | 'success' | 'error'>('info');
  const [notifTargetType, setNotifTargetType] = useState<'all' | 'group' | 'user' | 'company'>('all');
  const [notifTargetId, setNotifTargetId] = useState<number | null>(null);
  const [notifExpiresAt, setNotifExpiresAt] = useState('');
  const [notifSubmitting, setNotifSubmitting] = useState(false);
  const [adminNotifications, setAdminNotifications] = useState<any[]>([]);
  const [editingNotif, setEditingNotif] = useState<any | null>(null);

  // ── Data fetchers ──

  const fetchAdminUsers = async () => {
    try {
      const res = await fetch(`/api/admin/users?t=${Date.now()}`);
      if (res.ok) setAdminUsers(await res.json());
    } catch {}
  };

  const fetchCompanies = async () => {
    try {
      const res = await fetch(`/api/companies?t=${Date.now()}`);
      if (res.ok) setCompanies(await res.json());
    } catch {}
  };

  const fetchGroups = async () => {
    try {
      const res = await fetch(`/api/groups?t=${Date.now()}`);
      if (res.ok) setGroups(await res.json());
    } catch {}
  };

  const fetchSyncStatus = async () => {
    try {
      const res = await fetch(`/api/admin/sync?t=${Date.now()}`);
      if (res.ok) setSyncStatus(await res.json());
    } catch {}
  };

  const fetchMatches = async () => {
    try {
      const res = await fetch(`/api/matches?t=${Date.now()}`);
      if (res.ok) setMatches(await res.json());
    } catch {}
  };

  const fetchAdminNotifications = async () => {
    try {
      const res = await fetch(`/api/notifications?admin=true&t=${Date.now()}`);
      if (res.ok) setAdminNotifications(await res.json());
    } catch {}
  };

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
      const res = await fetch('/api/admin/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          userId: paymentModalUser.id,
          monto,
          fecha: newPaymentFecha || undefined,
        }),
      });
      if (res.ok) {
        showToast('💰 Pago registrado con éxito');
        setPaymentModalUser(null);
        setNewPaymentMonto('');
        setNewPaymentFecha('');
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
      const res = await fetch('/api/admin/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          paymentId,
          monto,
          fecha: editingPaymentFecha || undefined,
        }),
      });
      if (res.ok) {
        showToast('✏️ Pago actualizado');
        setEditingPaymentId(null);
        if (managePaymentsUser) {
          const updatedPayments = managePaymentsUser.payments.map((p: any) =>
            p.id === paymentId ? { ...p, monto, fecha: editingPaymentFecha ? new Date(editingPaymentFecha).toISOString() : p.fecha } : p
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

  const fetchGroupMembers = async (groupId: number) => {
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'members', groupId }),
      });
      if (res.ok) setGroupMembers(await res.json());
    } catch {}
  };

  const loadInvitations = async () => {
    try {
      const res = await fetch(`/api/invitations?t=${Date.now()}`);
      if (res.ok) setInvitations(await res.json());
    } catch {}
  };

  // Initial load
  useEffect(() => {
    if (!user) return;
    fetchAdminUsers();
    fetchCompanies();
    fetchMatches();
    fetchAdminNotifications();
    if (user.tipo === 'superadmin') {
      fetchSyncStatus();
      fetchGroups();
    }
  }, [user]);

  // Load invitations or payments when respective tabs are active
  useEffect(() => {
    if (adminSubTab === 'empresa') loadInvitations();
    if (adminSubTab === 'pagos') fetchPaymentsUsers();
  }, [adminSubTab]);

  // Sync settings form with app values
  useEffect(() => {
    if (user?.tipo === 'superadmin') {
      setEditAppName(appName);
      if (appLogo.startsWith('/') || appLogo.startsWith('http')) {
        setEditLogoType('file');
      } else {
        setEditLogoType('emoji');
        setEditLogoEmoji(appLogo);
      }
    }
  }, [appName, appLogo, user]);

  // ── User handlers ──

  const handleApproveUser = async (userId: number) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', userId }),
      });
      if (res.ok) {
        const d = await res.json();
        setAdminUsers(prev => prev.map(u => u.id === userId ? { ...u, ...d.user } : u));
        showToast('✅ Usuario aprobado para participar');
      } else {
        const d = await res.json(); showToast(d.error || 'Error');
      }
    } catch { showToast('Error de red'); }
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
        }),
      });
      const d = await res.json();
      if (res.ok && d.success) {
        showToast('👤 ¡Usuario creado con éxito!');
        await fetchAdminUsers();
        setNewUserNombre(''); setNewUserEmail(''); setNewUserPassword('');
        setNewUserConfirmPassword(''); setNewUserPhone('');
        setNewUserTipo('externo'); setNewUserCompanyId(''); setNewUserCompanyIds([]);
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

  const handleRecalculateLeaderboard = async () => {
    try {
      const res = await fetch('/api/admin/recalculate', { method: 'POST' });
      if (res.ok) showToast('📊 ¡Clasificación recalculada!');
      else showToast('Error al recalcular');
    } catch { showToast('Error de red'); }
  };

  // ── Settings ──

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editAppName.trim()) { showToast('⚠️ El nombre es requerido'); return; }
    setSettingsSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('app_name', editAppName);
      fd.append('logo_type', editLogoType);
      if (editLogoType === 'emoji') fd.append('logo_emoji', editLogoEmoji);
      else if (editLogoFile) fd.append('logo_file', editLogoFile);
      fd.append('app_subtitle', editSubtitle);
      fd.append('contact_whatsapp', editContactWhatsapp);
      fd.append('contact_email', editContactEmail);
      const res = await fetch('/api/settings', { method: 'POST', body: fd });
      if (res.ok) {
        const d = await res.json();
        showToast('✅ Configuración guardada');
        if (d.settings?.app_name) setAppName(d.settings.app_name);
        if (d.settings?.app_logo) setAppLogo(d.settings.app_logo);
        setEditLogoFile(null);
      } else { const d = await res.json(); showToast(d.error || 'Error'); }
    } catch { showToast('Error de red'); }
    finally { setSettingsSubmitting(false); }
  };

  // ── Company handlers ──

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setCompanySubmitting(true);
    try {
      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', nombre: newCompanyNombre, color: newCompanyColor, monto_participacion: parseFloat(newCompanyMonto) || 150, modos_por_fase: newCompanyModos }),
      });
      if (res.ok) {
        showToast('🏢 Empresa creada');
        setNewCompanyNombre(''); setNewCompanyMonto('150'); setNewCompanyModos({ ...DEFAULT_MODOS_POR_FASE });
        await fetchCompanies();
      } else { const d = await res.json(); showToast(d.error || 'Error'); }
    } catch { showToast('Error de red'); }
    finally { setCompanySubmitting(false); }
  };

  const handleDeleteCompany = async (id: number) => {
    try {
      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id }),
      });
      if (res.ok) { showToast('Empresa eliminada'); await fetchCompanies(); }
      else { const d = await res.json(); showToast(d.error || 'Error'); }
    } catch { showToast('Error de red'); }
  };

  const handleSaveCompanyMonto = async (companyId: number) => {
    const monto = parseFloat(editingMontoValue);
    if (isNaN(monto) || monto <= 0) { showToast('Monto inválido'); return; }
    try {
      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', id: companyId, monto_participacion: monto }),
      });
      if (res.ok) { showToast('💰 Monto actualizado'); setEditingMontoId(null); await fetchCompanies(); }
      else { const d = await res.json(); showToast(d.error || 'Error'); }
    } catch { showToast('Error de red'); }
  };

  // ── Group handlers ──

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setGroupSubmitting(true);
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', nombre: newGroupNombre, color: newGroupColor }),
      });
      if (res.ok) { showToast('👥 Grupo creado'); setNewGroupNombre(''); await fetchGroups(); }
      else { const d = await res.json(); showToast(d.error || 'Error'); }
    } catch { showToast('Error de red'); }
    finally { setGroupSubmitting(false); }
  };

  const handleDeleteGroup = async (id: number) => {
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id }),
      });
      if (res.ok) { showToast('Grupo eliminado'); await fetchGroups(); }
      else { const d = await res.json(); showToast(d.error || 'Error'); }
    } catch { showToast('Error de red'); }
  };

  const handleGroupMembership = async (groupId: number, userId: number, action: 'addUser' | 'removeUser') => {
    try {
      await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, groupId, userId }),
      });
      await fetchGroupMembers(groupId);
      await fetchGroups();
    } catch { showToast('Error de red'); }
  };

  // ── Invitation handlers ──

  const handleCreateInvitation = async () => {
    if (!invCompanyId) { showToast('Seleccioná una empresa'); return; }
    setInvCreating(true);
    try {
      const res = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', company_id: invCompanyId }),
      });
      const d = await res.json();
      if (res.ok && d.success) { await loadInvitations(); showToast('🔗 Enlace generado'); }
      else showToast(d.error || 'Error');
    } catch { showToast('Error de red'); }
    finally { setInvCreating(false); }
  };

  const handleDeleteInvitation = async (id: string) => {
    try {
      await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id }),
      });
      setInvitations(prev => prev.filter(i => i.id !== id));
    } catch { showToast('Error al eliminar'); }
  };

  // ── Sync handler ──

  const handleForceSyncAdmin = async () => {
    setSyncLoading(true);
    try {
      const res = await fetch('/api/admin/sync', { method: 'POST' });
      if (res.ok) { showToast('🔄 Sincronización completada'); await fetchSyncStatus(); }
      else showToast('Error al sincronizar');
    } catch { showToast('Error de red'); }
    finally { setSyncLoading(false); }
  };

  // ── Match editor ──

  const handleAdminUpdateMatch = async () => {
    if (!adminMatchModal) return;
    setAdminSubmitting(true);
    try {
      const res = await fetch('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: adminMatchModal.id,
          goles_local: adminGolesLocal,
          goles_visitante: adminGolesVisitante,
          estado: adminEstado,
          transmision_enlaces: adminTransmisionEnlaces,
        }),
      });
      if (res.ok) { setAdminMatchModal(null); showToast('⚽ Marcador actualizado'); await fetchMatches(); }
      else { const d = await res.json(); showToast(d.error || 'Error'); }
    } catch { showToast('Error de red'); }
    finally { setAdminSubmitting(false); }
  };

  // ── Notification handlers ──

  const handleCreateNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotifSubmitting(true);
    try {
      const method = editingNotif ? 'PUT' : 'POST';
      const body = {
        id: editingNotif?.id,
        titulo: notifTitulo,
        contenido: notifContenido,
        tipo: notifTipo,
        target_type: notifTargetType,
        target_id: notifTargetId,
        expires_at: notifExpiresAt || null,
      };
      const res = await fetch('/api/notifications', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        showToast(editingNotif ? '🔔 Notificación actualizada' : '🔔 Notificación enviada');
        setNotifTitulo(''); setNotifContenido(''); setNotifTargetType('all');
        setNotifTargetId(null); setNotifExpiresAt(''); setEditingNotif(null);
        fetchAdminNotifications();
      } else {
        const d = await res.json(); showToast(d.error || 'Error');
      }
    } catch { showToast('Error de red'); }
    finally { setNotifSubmitting(false); }
  };

  const handleStartEditNotification = (n: any) => {
    setEditingNotif(n);
    setNotifTitulo(n.titulo);
    setNotifContenido(n.contenido);
    setNotifTipo(n.tipo);
    setNotifTargetType(n.target_type);
    setNotifTargetId(n.target_id);
    setNotifExpiresAt(n.expires_at ? new Date(n.expires_at).toISOString().slice(0, 16) : '');
  };

  const handleCancelEditNotification = () => {
    setEditingNotif(null);
    setNotifTitulo(''); setNotifContenido(''); setNotifTargetType('all');
    setNotifTargetId(null); setNotifExpiresAt('');
  };

  const handleDeleteNotificationAdmin = async (id: number) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este mensaje?')) return;
    try {
      const res = await fetch(`/api/notifications?id=${id}`, { method: 'DELETE' });
      if (res.ok) { showToast('🗑️ Mensaje eliminado'); fetchAdminNotifications(); }
      else { const d = await res.json(); showToast(d.error || 'Error'); }
    } catch { showToast('Error de red'); }
  };

  if (!user || (user.tipo !== 'admin' && user.tipo !== 'superadmin')) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-neutral-500 text-sm">Acceso restringido</p>
      </div>
    );
  }

  return (
    <>
      <section className="space-y-6">

        {/* ── Header ── */}
        <div className="flex justify-between items-center flex-wrap gap-3">
          <div className="flex items-center gap-2">
            {user.tipo === 'superadmin'
              ? <ShieldAlert className="w-5 h-5 text-yellow-500" />
              : <Building2 className="w-5 h-5 text-yellow-500" />}
            <div>
              <h2 className="text-lg font-black tracking-wider text-neutral-100 uppercase">
                {user.tipo === 'superadmin' ? 'Super Administrador' : 'Panel de Empresa'}
              </h2>
              <p className="text-[9px] text-neutral-500 uppercase tracking-widest font-mono">
                {user.tipo === 'superadmin' ? 'Control total del sistema' : 'Gestión de usuarios de tu empresa'}
              </p>
            </div>
          </div>
          {user.tipo === 'superadmin' && (
            <button
              onClick={handleRecalculateLeaderboard}
              className="bg-yellow-500 hover:bg-yellow-600 text-neutral-950 text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 transition active:scale-95 shadow"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Recalcular Clasificación</span>
            </button>
          )}
        </div>

        {/* ── Sub-tabs ── */}
        <div className="flex gap-1 border-b border-neutral-800 pb-0">
          {([
            { key: 'usuarios', label: 'Usuarios', icon: <Users className="w-3.5 h-3.5" /> },
            { key: 'empresa', label: 'Empresa', icon: <Building2 className="w-3.5 h-3.5" /> },
            { key: 'mensajes', label: 'Mensajes', icon: <MessageSquare className="w-3.5 h-3.5" /> },
            { key: 'pagos', label: 'Pagos 💰', icon: <Coins className="w-3.5 h-3.5" /> },
          ] as const).map(t => (
            <button
              key={t.key}
              onClick={() => setAdminSubTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-[11px] font-black uppercase tracking-wider border-b-2 transition -mb-px ${
                adminSubTab === t.key
                  ? 'border-yellow-500 text-yellow-500'
                  : 'border-transparent text-neutral-500 hover:text-neutral-300'
              }`}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* ── Stats (superadmin only) ── */}
        {user.tipo === 'superadmin' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Total Usuarios', value: adminUsers.length, color: 'text-yellow-500' },
              { label: 'Empresas', value: companies.length, color: 'text-neutral-300' },
              { label: 'Usuarios Activos', value: adminUsers.filter(u => u.activo).length, color: 'text-green-400' },
              { label: 'Partidos en Vivo', value: matches.filter(m => m.estado === 'live').length, color: 'text-red-400' },
            ].map(stat => (
              <div key={stat.label} className="bg-neutral-900/40 border border-neutral-800 rounded-2xl p-4 flex flex-col items-center gap-1">
                <span className={`text-2xl font-black ${stat.color}`}>{stat.value}</span>
                <span className="text-[9px] text-neutral-500 uppercase tracking-widest text-center">{stat.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* ══════════ TAB: USUARIOS ══════════ */}
        {adminSubTab === 'usuarios' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
              <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                <Users className="w-3.5 h-3.5" />
                {user.tipo === 'superadmin' ? 'Todos los Usuarios del Sistema' : 'Usuarios de Mi Empresa'}
              </h3>
              {user.tipo === 'superadmin' && (
                <a
                  href="/admin/predictions"
                  className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg border border-yellow-500/30 text-yellow-500 bg-yellow-500/10 hover:bg-yellow-500/20 transition"
                >
                  <BarChart3 className="w-3 h-3" /> Ver Pronósticos
                </a>
              )}
            </div>

            {/* Create user form */}
            <form onSubmit={handleCreateUser} className="bg-neutral-900/40 border border-neutral-900 rounded-2xl p-5 space-y-4 max-w-2xl shadow-lg">
              <div className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-yellow-500" />
                {user.tipo === 'superadmin' ? 'Crear Nuevo Usuario / Administrador' : 'Agregar Usuario a Mi Empresa'}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest">Nombre Completo *</label>
                  <input type="text" required value={newUserNombre} onChange={e => setNewUserNombre(e.target.value)} placeholder="ej: Diego Armando" className="w-full input-stitch px-3 py-2 text-xs" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest">Correo Electrónico *</label>
                  <input type="email" required value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} placeholder="usuario@empresa.com" className="w-full input-stitch px-3 py-2 text-xs" />
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
                    <input type="tel" value={newUserPhone} onChange={e => setNewUserPhone(e.target.value)} placeholder="+591 XXXXXXXX" className="w-full input-stitch px-3 py-2 text-xs" />
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
                <div className="space-y-2 max-w-4xl">
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
                            <div className="text-[8px] text-neutral-600 font-mono">{new Date(u.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
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
                          <button onClick={() => handleApproveUser(u.id)} className="font-bold py-1.5 px-3 rounded-xl flex items-center gap-1.5 transition text-[11px] bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20">
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
            <div className="bg-neutral-900/40 border border-neutral-900 divide-y divide-neutral-900 rounded-2xl overflow-hidden shadow-lg max-w-4xl">
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
                              <button onClick={() => handleApproveUser(u.id)} className="font-bold py-1.5 px-3 rounded-xl flex items-center gap-1.5 transition text-[11px] bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20">
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
          </div>
        )}

        {/* ══════════ TAB: EMPRESA ══════════ */}
        {adminSubTab === 'empresa' && (
          <div className="space-y-6">

            {/* Settings (superadmin only) */}
            {user.tipo === 'superadmin' && (
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest border-b border-neutral-800 pb-2 flex items-center gap-2">
                  <Settings className="w-3.5 h-3.5" /> Personalización del Sistema
                </h3>
                <form onSubmit={handleSaveSettings} className="bg-neutral-900/40 border border-neutral-900 rounded-2xl p-5 space-y-4 max-w-2xl">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest">Nombre del Sistema</label>
                      <input type="text" required value={editAppName} onChange={e => setEditAppName(e.target.value)} className="w-full input-stitch px-3 py-2 text-xs" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest">Tipo de Logo</label>
                      <select value={editLogoType} onChange={e => setEditLogoType(e.target.value as any)} className="w-full bg-neutral-950 border border-neutral-850 text-neutral-300 rounded-xl px-3 py-2 text-xs">
                        <option value="emoji">Emoji o Símbolo</option>
                        <option value="file">Imagen Personalizada</option>
                      </select>
                    </div>
                  </div>
                  {editLogoType === 'emoji' ? (
                    <div className="space-y-1.5 max-w-xs">
                      <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest">Emoji o Icono</label>
                      <div className="flex gap-2">
                        <input type="text" required value={editLogoEmoji} onChange={e => setEditLogoEmoji(e.target.value)} className="w-full input-stitch px-3 py-2 text-xs" />
                        <div className="w-9 h-9 bg-neutral-950 border border-neutral-850 rounded-xl flex items-center justify-center text-xl select-none flex-shrink-0">{editLogoEmoji}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest">Archivo de Logo</label>
                      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                        <input type="file" accept="image/*" onChange={e => { if (e.target.files?.[0]) setEditLogoFile(e.target.files[0]); }} className="text-xs text-neutral-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-neutral-950 file:text-yellow-500 hover:file:bg-neutral-900 file:cursor-pointer" />
                        {appLogo.startsWith('/') && (
                          <div className="flex items-center gap-2 bg-neutral-950/60 border border-neutral-850 p-2 rounded-xl">
                            <span className="text-[9px] text-neutral-500">Actual:</span>
                            <img src={appLogo} className="w-8 h-8 object-contain rounded" alt="logo" />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest">Subtítulo</label>
                      <input type="text" value={editSubtitle} onChange={e => setEditSubtitle(e.target.value)} placeholder="Ej: Quiniela Oficial del Mundial" className="w-full input-stitch px-3 py-2 text-xs" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest">WhatsApp de Contacto</label>
                      <input type="text" value={editContactWhatsapp} onChange={e => setEditContactWhatsapp(e.target.value)} placeholder="+591 XXXXXXXX" className="w-full input-stitch px-3 py-2 text-xs" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest">Email de Contacto</label>
                      <input type="email" value={editContactEmail} onChange={e => setEditContactEmail(e.target.value)} placeholder="info@empresa.com" className="w-full input-stitch px-3 py-2 text-xs" />
                    </div>
                  </div>
                  <div className="flex justify-end pt-2 border-t border-neutral-950">
                    <button type="submit" disabled={settingsSubmitting} className="bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-neutral-950 text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 transition active:scale-95 shadow">
                      <span>{settingsSubmitting ? 'Guardando...' : 'Guardar Cambios'}</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Gestión de Empresas (superadmin) */}
            {user.tipo === 'superadmin' && (
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest border-b border-neutral-800 pb-2 flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5" /> Gestión de Empresas
                </h3>
                <form onSubmit={handleCreateCompany} className="bg-neutral-900/40 border border-neutral-900 rounded-2xl p-5 space-y-4 max-w-2xl">
                  <div className="text-xs font-bold text-neutral-300 uppercase tracking-wider">Crear Empresa</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest">Nombre</label>
                      <input type="text" required value={newCompanyNombre} onChange={e => setNewCompanyNombre(e.target.value)} placeholder="Nombre de la empresa" className="w-full input-stitch px-3 py-2 text-xs" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest">Monto de Participación (Bs.)</label>
                      <input type="number" min="0" step="0.01" value={newCompanyMonto} onChange={e => setNewCompanyMonto(e.target.value)} placeholder="150" className="w-full input-stitch px-3 py-2 text-xs font-mono" />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest">Modo de Apuesta por Fase</label>
                      <div className="grid grid-cols-1 gap-1.5">
                        {PHASES_APUESTA.map(phase => (
                          <div key={phase.key} className="flex items-center gap-3 bg-neutral-950/60 border border-neutral-800 rounded-lg px-3 py-1.5">
                            <span className="text-[10px] font-bold text-neutral-300 w-28 flex-shrink-0">{phase.label}</span>
                            <select value={newCompanyModos[phase.key] ?? 'partido'}
                              onChange={e => setNewCompanyModos(prev => ({ ...prev, [phase.key]: e.target.value }))}
                              className="flex-1 bg-neutral-900 border border-neutral-800 text-neutral-300 rounded-lg px-2 py-1 text-[11px]">
                              <option value="partido">Por Partido</option>
                              <option value="bloque">En Bloque</option>
                              <option value="fase">Por Fase</option>
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button type="submit" disabled={companySubmitting} className="bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-neutral-950 text-xs font-bold px-4 py-2 rounded-lg transition active:scale-95">
                      <span>{companySubmitting ? 'Creando...' : 'Crear Empresa'}</span>
                    </button>
                  </div>
                </form>
                <div className="bg-neutral-900/40 border border-neutral-900 divide-y divide-neutral-900 rounded-2xl overflow-hidden max-w-2xl">
                  {companies.length === 0 && <div className="p-6 text-center text-neutral-500 text-xs">Sin empresas registradas</div>}
                  {companies.map(c => {
                    const cModos: Record<string, string> = (c.modos_por_fase && typeof c.modos_por_fase === 'object') ? c.modos_por_fase : {};
                    return (
                      <div key={c.id} className="flex flex-col">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-5 h-5 rounded-full border border-neutral-700 flex-shrink-0" style={{ backgroundColor: c.color }} />
                            <div className="min-w-0">
                              <span className="text-sm font-bold text-neutral-200 block truncate">{c.nombre}</span>
                              <span className={`text-[9px] font-black uppercase ${c.activo ? 'text-green-400' : 'text-neutral-500'}`}>{c.activo ? 'Activo' : 'Inactivo'}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {editingMontoId === c.id ? (
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-neutral-400 font-mono">Bs.</span>
                                <input type="number" min="0" step="0.01" value={editingMontoValue} onChange={e => setEditingMontoValue(e.target.value)}
                                  onKeyDown={e => { if (e.key === 'Enter') handleSaveCompanyMonto(c.id); if (e.key === 'Escape') setEditingMontoId(null); }}
                                  className="w-24 input-stitch px-2 py-1 text-xs font-mono" autoFocus />
                                <button onClick={() => handleSaveCompanyMonto(c.id)} className="text-green-400 hover:text-green-300 text-[10px] font-bold px-2 py-1 rounded-lg border border-green-500/20 transition">
                                  <Check className="w-3 h-3" />
                                </button>
                                <button onClick={() => setEditingMontoId(null)} className="text-neutral-500 hover:text-neutral-300 text-[10px] font-bold px-2 py-1 rounded-lg border border-neutral-700 transition">
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <button onClick={() => { setEditingMontoId(c.id); setEditingMontoValue(String(c.monto_participacion || 150)); }}
                                className="flex items-center gap-1.5 text-[10px] font-black text-yellow-500 px-2.5 py-1.5 rounded-lg border border-yellow-500/20 bg-yellow-500/5 hover:bg-yellow-500/10 transition">
                                💰 Bs. {parseFloat(c.monto_participacion || 150).toLocaleString('es-BO')}
                              </button>
                            )}
                            <button onClick={() => setExpandedCompanyModos(expandedCompanyModos === c.id ? null : c.id)}
                              className={`text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg border transition flex items-center gap-1.5 ${expandedCompanyModos === c.id ? 'text-cyan-300 border-cyan-500/40 bg-cyan-500/10' : 'text-neutral-400 border-neutral-700 hover:border-neutral-500'}`}>
                              🎯 Modos
                            </button>
                            <button onClick={() => handleDeleteCompany(c.id)} className="text-red-400 hover:text-red-300 text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg border border-red-500/20 hover:border-red-500/40 transition flex items-center gap-1.5">
                              <Trash2 className="w-3 h-3" /> Eliminar
                            </button>
                          </div>
                        </div>
                        {expandedCompanyModos === c.id && (
                          <div className="border-t border-neutral-800 px-4 pb-4 pt-3 grid grid-cols-1 gap-1.5">
                            <div className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1">Modo de Apuesta por Fase</div>
                            {PHASES_APUESTA.map(phase => (
                              <div key={phase.key} className="flex items-center gap-3 bg-neutral-950/60 border border-neutral-800 rounded-lg px-3 py-1.5">
                                <span className="text-[10px] font-bold text-neutral-300 w-32 flex-shrink-0">{phase.label}</span>
                                <select value={cModos[phase.key] ?? 'partido'}
                                  onChange={async e => {
                                    const updatedModos = { ...DEFAULT_MODOS_POR_FASE, ...cModos, [phase.key]: e.target.value };
                                    await fetch('/api/companies', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update', id: c.id, modos_por_fase: updatedModos }) });
                                    showToast('✅ Modo actualizado'); await fetchCompanies();
                                  }}
                                  className="flex-1 bg-neutral-900 border border-neutral-800 text-neutral-300 rounded-lg px-2 py-1 text-[11px]">
                                  <option value="partido">Por Partido</option>
                                  <option value="bloque">En Bloque</option>
                                  <option value="fase">Por Fase</option>
                                </select>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Admin (non-superadmin) company editor */}
            {user.tipo === 'admin' && (user.companies || []).map((c: any) => {
              const adminCModos: Record<string, string> = (c.modos_por_fase && typeof c.modos_por_fase === 'object') ? c.modos_por_fase : {};
              return (
                <div key={c.id} className="bg-neutral-900/40 border border-neutral-900 rounded-2xl p-5 space-y-4 max-w-2xl">
                  <div className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />
                    {c.nombre}
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest">Monto Participación (Bs.)</label>
                    <input type="number" min="0" step="0.01" defaultValue={c.monto_participacion || 150}
                      onBlur={async e => {
                        const monto = parseFloat(e.target.value);
                        if (!isNaN(monto) && monto > 0) {
                          await fetch('/api/companies', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update', id: c.id, monto_participacion: monto }) });
                          showToast('💰 Monto actualizado'); await fetchCompanies();
                        }
                      }}
                      className="w-full input-stitch px-3 py-2 text-xs font-mono" />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest">Modo de Apuesta por Fase</label>
                    <div className="grid grid-cols-1 gap-1.5">
                      {PHASES_APUESTA.map(phase => (
                        <div key={phase.key} className="flex items-center gap-3 bg-neutral-950/60 border border-neutral-800 rounded-lg px-3 py-1.5">
                          <span className="text-[10px] font-bold text-neutral-300 w-32 flex-shrink-0">{phase.label}</span>
                          <select defaultValue={adminCModos[phase.key] ?? 'partido'}
                            onChange={async e => {
                              const updatedModos = { ...DEFAULT_MODOS_POR_FASE, ...adminCModos, [phase.key]: e.target.value };
                              await fetch('/api/companies', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update', id: c.id, modos_por_fase: updatedModos }) });
                              showToast('✅ Modo actualizado'); await fetchCompanies();
                            }}
                            className="flex-1 bg-neutral-900 border border-neutral-800 text-neutral-300 rounded-lg px-2 py-1 text-[11px]">
                            <option value="partido">Por Partido</option>
                            <option value="bloque">En Bloque</option>
                            <option value="fase">Por Fase</option>
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Groups (superadmin) */}
            {user.tipo === 'superadmin' && (
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest border-b border-neutral-800 pb-2 flex items-center gap-2">
                  <Users className="w-3.5 h-3.5" /> Grupos de Usuarios
                </h3>
                <form onSubmit={handleCreateGroup} className="bg-neutral-900/40 border border-neutral-900 rounded-2xl p-5 space-y-4 max-w-2xl">
                  <div className="text-xs font-bold text-neutral-300 uppercase tracking-wider">Crear Grupo</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest">Nombre del Grupo</label>
                      <input type="text" required value={newGroupNombre} onChange={e => setNewGroupNombre(e.target.value)} placeholder="ej: Ventas, Producción..." className="w-full input-stitch px-3 py-2 text-xs" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest">Color</label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={newGroupColor} onChange={e => setNewGroupColor(e.target.value)} className="w-9 h-9 rounded-lg border border-neutral-850 bg-neutral-950 cursor-pointer" />
                        <input type="text" value={newGroupColor} onChange={e => setNewGroupColor(e.target.value)} className="w-24 input-stitch px-3 py-2 text-xs font-mono" />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button type="submit" disabled={groupSubmitting} className="bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-neutral-950 text-xs font-bold px-4 py-2 rounded-lg transition active:scale-95">
                      <span>{groupSubmitting ? 'Creando...' : 'Crear Grupo'}</span>
                    </button>
                  </div>
                </form>
                <div className="bg-neutral-900/40 border border-neutral-900 divide-y divide-neutral-900 rounded-2xl overflow-hidden max-w-2xl">
                  {groups.length === 0 && <div className="p-6 text-center text-neutral-500 text-xs">Sin grupos creados</div>}
                  {groups.map(g => (
                    <div key={g.id} className="flex justify-between items-center p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full border border-neutral-700" style={{ backgroundColor: g.color }} />
                        <div>
                          <div className="text-sm font-bold text-neutral-200">{g.nombre}</div>
                          <div className="text-[9px] text-neutral-500 font-mono">{g.member_count} miembro{g.member_count !== 1 ? 's' : ''}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => { setGroupMembersModal(g); fetchGroupMembers(g.id); }}
                          className="text-neutral-400 hover:text-neutral-200 text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg border border-neutral-800 hover:border-neutral-700 transition">
                          Miembros
                        </button>
                        <button onClick={() => handleDeleteGroup(g.id)} className="text-red-400 hover:text-red-300 text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg border border-red-500/20 hover:border-red-500/40 transition flex items-center gap-1.5">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Invitaciones */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest border-b border-neutral-800 pb-2">Invitaciones de Empresa</h3>
              <div className="bg-neutral-900/40 border border-neutral-900 rounded-2xl p-5 space-y-4">
                <p className="text-xs text-neutral-500 leading-relaxed">Generá un enlace de invitación para que nuevos usuarios se registren directamente en una empresa. El enlace expira en 7 días y es de uso único.</p>
                <div className="flex gap-2 flex-wrap">
                  <select value={invCompanyId ?? ''} onChange={e => setInvCompanyId(Number(e.target.value) || null)}
                    className="flex-1 min-w-[140px] bg-neutral-800 border border-neutral-700 text-neutral-200 rounded-xl px-3 py-2 text-xs focus:outline-none">
                    <option value="">Seleccionar empresa…</option>
                    {companies.map((c: any) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                  <button onClick={handleCreateInvitation} disabled={invCreating || !invCompanyId}
                    className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-neutral-900 font-black text-xs rounded-xl transition">
                    {invCreating ? 'Generando…' : '🔗 Generar enlace'}
                  </button>
                </div>
                {invitations.length > 0 && (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {invitations.map((inv: any) => {
                      const link = `${typeof window !== 'undefined' ? window.location.origin : ''}/invitacion?t=${inv.token}`;
                      const expired = new Date(inv.expires_at) < new Date();
                      return (
                        <div key={inv.id} className={`flex items-center gap-2 p-3 rounded-xl border text-xs ${inv.used || expired ? 'border-neutral-800 opacity-50' : 'border-neutral-700 bg-neutral-800/40'}`}>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-neutral-200 truncate">{inv.company_nombre}</div>
                            <div className="text-neutral-500 text-[10px]">
                              {inv.used ? `Usado por ${inv.email_usado}` : expired ? 'Expirado' : `Expira ${new Date(inv.expires_at).toLocaleDateString('es-BO')}`}
                            </div>
                          </div>
                          {!inv.used && !expired && (
                            <button onClick={() => { navigator.clipboard.writeText(link); setInvCopied(inv.id); setTimeout(() => setInvCopied(null), 2000); }}
                              className="px-2 py-1 bg-neutral-700 hover:bg-neutral-600 text-neutral-200 rounded-lg text-[10px] font-bold transition shrink-0">
                              {invCopied === inv.id ? '✅ Copiado' : '📋 Copiar'}
                            </button>
                          )}
                          <button onClick={() => handleDeleteInvitation(inv.id)} className="p-1 text-neutral-600 hover:text-red-400 transition shrink-0">✕</button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Sincronización en Vivo (superadmin) */}
            {user.tipo === 'superadmin' && (
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest border-b border-neutral-800 pb-2">Sincronización en Vivo</h3>
                <div className="bg-neutral-900/40 border border-neutral-900 rounded-2xl p-5 space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      {syncStatus?.last_synced ? (() => {
                        const secAgo = Math.floor((Date.now() - new Date(syncStatus.last_synced).getTime()) / 1000);
                        const color = secAgo < 120 ? 'bg-green-500' : secAgo < 600 ? 'bg-yellow-500' : 'bg-red-500';
                        const label = secAgo < 120 ? 'Activo' : secAgo < 600 ? 'Demorado' : 'Sin sync';
                        return (
                          <>
                            <span className={`h-2.5 w-2.5 rounded-full ${color} animate-pulse`} />
                            <span className="text-xs text-neutral-300 font-bold">{label}</span>
                            <span className="text-[10px] text-neutral-500">· hace {secAgo < 60 ? `${secAgo}s` : `${Math.floor(secAgo / 60)}min`}</span>
                          </>
                        );
                      })() : (
                        <><span className="h-2.5 w-2.5 rounded-full bg-neutral-600" /><span className="text-xs text-neutral-500">Sin datos de sync</span></>
                      )}
                    </div>
                    <button onClick={handleForceSyncAdmin} disabled={syncLoading} className="bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-neutral-950 text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 transition active:scale-95">
                      <RefreshCw className={`w-3.5 h-3.5 ${syncLoading ? 'animate-spin' : ''}`} />
                      <span>{syncLoading ? 'Sincronizando...' : 'Forzar Sync'}</span>
                    </button>
                  </div>
                  {!syncStatus?.sync_enabled && (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs p-3 rounded-lg font-bold">
                      ⚠️ Sincronización automática desactivada. Modo manual activo.
                    </div>
                  )}
                  {syncStatus?.logs && syncStatus.logs.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">Últimas sincronizaciones</div>
                      <div className="bg-neutral-950 border border-neutral-850 rounded-xl divide-y divide-neutral-900 max-h-48 overflow-y-auto">
                        {syncStatus.logs.map((log: any) => (
                          <div key={log.id} className="flex justify-between items-center p-3 text-[10px] font-mono">
                            <span className="text-neutral-500">{new Date(log.synced_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                            <div className="flex gap-3 text-neutral-400">
                              <span className="text-yellow-500">↑{log.matches_updated} upd</span>
                              <span className="text-green-400">⚽{log.goals_detected} goles</span>
                              <span className="text-neutral-300">✓{log.matches_finished} fin</span>
                              <span className="text-neutral-500">{log.duration_ms}ms</span>
                            </div>
                            {log.errors?.length > 0 && <span className="text-red-400 text-[9px]">ERR</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Marcadores en Vivo (superadmin) */}
            {user.tipo === 'superadmin' && (
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest border-b border-neutral-800 pb-2">Marcadores en Vivo</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {matches.map(m => (
                    <div key={m.id} className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl flex justify-between items-center text-xs shadow-md">
                      <div className="flex flex-col gap-1 w-[60%]">
                        <div className="flex items-center gap-2 text-sm text-neutral-200 font-black">
                          <span>{m.local} {m.goles_local} - {m.goles_visitante} {m.visitante}</span>
                        </div>
                        <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-bold">
                          {m.estado === 'live' ? '🔴 En juego' : m.estado === 'finished' ? '⚫ Finalizado' : '⚪ Programado'}
                        </span>
                      </div>
                      <button onClick={() => { setAdminMatchModal(m); setAdminGolesLocal(m.goles_local); setAdminGolesVisitante(m.goles_visitante); setAdminEstado(m.estado); setAdminTransmisionEnlaces(m.transmision_enlaces || ''); }}
                        className="bg-neutral-950 hover:bg-neutral-800 text-neutral-300 font-bold px-4 py-2 border border-neutral-800 hover:border-yellow-500/25 rounded-xl transition">
                        Editar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════ TAB: MENSAJES ══════════ */}
        {adminSubTab === 'mensajes' && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest border-b border-neutral-800 pb-2 flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5" /> Enviar Mensaje / Notificación
            </h3>
            <form onSubmit={handleCreateNotification} className="bg-neutral-900/40 border border-neutral-900 rounded-2xl p-5 space-y-4 max-w-2xl">
              <div className="text-xs font-bold text-neutral-300 uppercase tracking-wider">Enviar Notificación</div>
              <div className="space-y-1.5">
                <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest">Título</label>
                <input type="text" required value={notifTitulo} onChange={e => setNotifTitulo(e.target.value)} placeholder="Título de la notificación" className="w-full input-stitch px-3 py-2 text-xs" />
              </div>
              <div className="space-y-1.5">
                <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest">Contenido</label>
                <textarea required value={notifContenido} onChange={e => setNotifContenido(e.target.value)} placeholder="Escribe tu mensaje aquí..." rows={3} className="w-full input-stitch px-3 py-2 text-xs resize-none" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest">Tipo</label>
                  <select value={notifTipo} onChange={e => setNotifTipo(e.target.value as any)} className="w-full bg-neutral-950 border border-neutral-850 text-neutral-300 rounded-xl px-3 py-2 text-xs">
                    <option value="info">ℹ️ Info</option>
                    <option value="success">✅ Éxito</option>
                    <option value="warning">⚠️ Aviso</option>
                    <option value="error">❌ Error</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest">Destinatario</label>
                  <select value={notifTargetType} onChange={e => { setNotifTargetType(e.target.value as any); setNotifTargetId(null); }} className="w-full bg-neutral-950 border border-neutral-850 text-neutral-300 rounded-xl px-3 py-2 text-xs">
                    <option value="all">🌐 Todos</option>
                    <option value="company">🏢 Empresa</option>
                    <option value="group">👥 Grupo</option>
                    <option value="user">👤 Usuario</option>
                  </select>
                </div>
                {notifTargetType === 'company' && (
                  <div className="space-y-1.5">
                    <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest">Empresa</label>
                    <select value={notifTargetId || ''} onChange={e => setNotifTargetId(e.target.value ? parseInt(e.target.value) : null)} className="w-full bg-neutral-950 border border-neutral-850 text-neutral-300 rounded-xl px-3 py-2 text-xs">
                      <option value="">Seleccionar empresa...</option>
                      {companies.filter((c: any) => user.tipo === 'superadmin' || (user.companies || []).some((ac: any) => ac.id === c.id)).map((c: any) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                  </div>
                )}
                {notifTargetType === 'group' && (
                  <div className="space-y-1.5">
                    <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest">Grupo</label>
                    <select value={notifTargetId || ''} onChange={e => setNotifTargetId(e.target.value ? parseInt(e.target.value) : null)} className="w-full bg-neutral-950 border border-neutral-850 text-neutral-300 rounded-xl px-3 py-2 text-xs">
                      <option value="">Seleccionar...</option>
                      {groups.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
                    </select>
                  </div>
                )}
                {notifTargetType === 'user' && (
                  <div className="space-y-1.5">
                    <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest">Usuario</label>
                    <select value={notifTargetId || ''} onChange={e => setNotifTargetId(e.target.value ? parseInt(e.target.value) : null)} className="w-full bg-neutral-950 border border-neutral-850 text-neutral-300 rounded-xl px-3 py-2 text-xs">
                      <option value="">Seleccionar...</option>
                      {adminUsers.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                    </select>
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest">Expira (opcional)</label>
                <input type="datetime-local" value={notifExpiresAt} onChange={e => setNotifExpiresAt(e.target.value)} className="input-stitch px-3 py-2 text-xs" />
              </div>
              <div className="flex justify-end pt-2 gap-2">
                {editingNotif && (
                  <button type="button" onClick={handleCancelEditNotification} className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold px-4 py-2 rounded-lg transition active:scale-95">
                    Cancelar Edición
                  </button>
                )}
                <button type="submit" disabled={notifSubmitting} className="bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-neutral-950 text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 transition active:scale-95">
                  <Bell className="w-3.5 h-3.5" />
                  <span>{notifSubmitting ? 'Enviando...' : editingNotif ? 'Guardar Cambios' : 'Enviar Notificación'}</span>
                </button>
              </div>
            </form>

            {/* Historial */}
            <div className="space-y-3 max-w-2xl">
              <div className="text-xs font-bold text-neutral-400 uppercase tracking-widest border-b border-neutral-800 pb-2">
                Historial de Mensajes Enviados
              </div>
              <div className="bg-neutral-900/40 border border-neutral-900 divide-y divide-neutral-900 rounded-2xl overflow-hidden shadow-lg">
                {adminNotifications.length === 0 && (
                  <div className="p-6 text-center text-neutral-500 text-xs">No hay mensajes enviados registrados</div>
                )}
                {adminNotifications.map(n => {
                  const colorMap: Record<string, string> = { info: 'text-neutral-300 border-neutral-700/50 bg-neutral-500/5', warning: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/5', success: 'text-green-400 border-green-500/30 bg-green-500/5', error: 'text-red-400 border-red-500/30 bg-red-500/5' };
                  const cls = colorMap[n.tipo] || colorMap.info;
                  return (
                    <div key={n.id} className="p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-xs">
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex items-center text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${cls}`}>{n.tipo}</span>
                          <span className="text-[9px] bg-neutral-850 text-neutral-400 border border-neutral-800 px-1.5 py-0.5 rounded-full font-bold">Destino: {n.target_type} {n.target_id ? `(ID: ${n.target_id})` : ''}</span>
                        </div>
                        <div className="font-bold text-neutral-200">{n.titulo}</div>
                        <div className="text-neutral-500 leading-relaxed text-[11px] whitespace-pre-wrap">{n.contenido}</div>
                        <div className="text-[9px] text-neutral-600 font-mono pt-1">
                          Creado {new Date(n.created_at).toLocaleString('es-BO')}
                          {n.expires_at && ` · Expira ${new Date(n.expires_at).toLocaleString('es-BO')}`}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={() => handleStartEditNotification(n)} className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold px-2.5 py-1.5 rounded-lg border border-neutral-700 transition text-[10px]">
                          Editar
                        </button>
                        <button onClick={() => handleDeleteNotificationAdmin(n.id)} className="bg-red-950/20 hover:bg-red-950/40 text-red-400 font-bold px-2.5 py-1.5 rounded-lg border border-red-900/30 transition text-[10px]">
                          Eliminar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Notificaciones automáticas (superadmin) */}
            {user.tipo === 'superadmin' && (
              <div className="bg-neutral-900/40 border border-neutral-900 rounded-2xl p-5 space-y-3 max-w-2xl">
                <div className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
                  <Send className="w-3.5 h-3.5 text-neutral-300" /> Notificaciones Automáticas
                </div>
                <p className="text-[10px] text-neutral-500">El scheduler envía avisos de partidos cada hora y rankings semanales los lunes. También puedes dispararlo manualmente.</p>
                <div className="flex gap-2 flex-wrap">
                  <button type="button" onClick={async () => {
                    const r = await fetch('/api/admin/notify-scheduled', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'matches' }) });
                    const d = await r.json();
                    showToast(r.ok ? `✅ ${d.matches_notified ?? 0} avisos de partidos enviados` : d.error);
                  }} className="text-[10px] font-bold px-3 py-1.5 rounded-lg border border-neutral-700/50 bg-neutral-800/50 text-neutral-300 hover:bg-neutral-700/50 transition">
                    ⚽ Avisos de Partidos
                  </button>
                  <button type="button" onClick={async () => {
                    const r = await fetch('/api/admin/notify-scheduled', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'rankings' }) });
                    const d = await r.json();
                    showToast(r.ok ? `✅ Rankings enviados a ${d.companies_notified ?? 0} empresa(s)` : d.error);
                  }} className="text-[10px] font-bold px-3 py-1.5 rounded-lg border border-purple-500/30 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition">
                    📊 Rankings Semanales
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        {/* ══════════ TAB: PAGOS ══════════ */}
        {adminSubTab === 'pagos' && (() => {
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
                    className="bg-neutral-950 border border-neutral-850 text-neutral-300 rounded-xl px-3 py-2 text-xs"
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
                    className="bg-neutral-950 border border-neutral-850 text-neutral-300 rounded-xl px-3 py-2 text-xs"
                  >
                    <option value="all">💰 Todos los estados</option>
                    <option value="pending">🔴 Pendientes (Sin pagos)</option>
                    <option value="partial">🟡 Pago Parcial</option>
                    <option value="paid">🟢 Pagado Completo</option>
                  </select>
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
                              <td className="p-3 border-r border-neutral-850/50 font-bold text-neutral-200">
                                <div className="flex items-center gap-2">
                                  <img
                                    src={(u.avatar && u.avatar !== 'null' && u.avatar !== 'undefined') ? u.avatar : 'https://stg00vm.blob.core.windows.net/jet00/default.webp'}
                                    onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = 'https://stg00vm.blob.core.windows.net/jet00/default.webp'; }}
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
                                    <span className="text-[10px] text-neutral-600 italic">Ningún pago</span>
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
                            const cuota = u.companies.length > 0 ? u.companies.reduce((s: number, c: any) => s + parseFloat(c.monto_participacion || 150), 0) : 150;
                            return sum + cuota;
                          }, 0);
                          const totalPagadoTodos = filteredPaymentsUsers.reduce((sum, u) => {
                            const total = u.payments.reduce((s: number, p: any) => s + parseFloat(p.monto), 0);
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
            </div>
          );
        })()}
      </section>

      {/* ── MODAL: Group Members ── */}
      {groupMembersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[80vh]">
            <div className="flex justify-between items-center p-5 border-b border-neutral-900">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: groupMembersModal.color }} />
                <div>
                  <h3 className="text-sm font-black text-neutral-100">{groupMembersModal.nombre}</h3>
                  <p className="text-[10px] text-neutral-500 uppercase tracking-widest">Miembros del grupo</p>
                </div>
              </div>
              <button onClick={() => { setGroupMembersModal(null); setGroupMembers([]); }} className="text-neutral-500 hover:text-neutral-200 transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 divide-y divide-neutral-900">
              {adminUsers.filter(u => u.activo).map(u => {
                const isMember = groupMembers.some(m => m.id === u.id);
                return (
                  <div key={u.id} className="flex justify-between items-center p-4">
                    <div className="flex items-center gap-3">
                      <img src={(u.avatar && u.avatar !== 'null' && u.avatar !== 'undefined') ? u.avatar : 'https://stg00vm.blob.core.windows.net/jet00/default.webp'} onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = 'https://stg00vm.blob.core.windows.net/jet00/default.webp'; }} className={`w-8 h-8 rounded-full border border-neutral-800 object-cover ${(!u.avatar || u.avatar === 'null' || u.avatar === 'undefined' || u.avatar.includes('avatar_5.png') || u.avatar.includes('default.webp')) ? 'bg-white' : 'bg-neutral-900'}`} alt="avatar" />
                      <div>
                        <div className="text-xs font-bold text-neutral-200">{u.nombre}</div>
                        <div className="text-[9px] text-neutral-500 font-mono uppercase">{u.tipo}</div>
                      </div>
                    </div>
                    <button onClick={() => handleGroupMembership(groupMembersModal.id, u.id, isMember ? 'removeUser' : 'addUser')}
                      className={`text-[10px] font-bold px-3 py-1.5 rounded-xl border transition ${isMember ? 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20' : 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20'}`}>
                      {isMember ? 'Quitar' : 'Agregar'}
                    </button>
                  </div>
                );
              })}
            </div>
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
                  📱 Celular / WhatsApp <span className="text-neutral-600 normal-case font-medium">(opcional)</span>
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
                  <KeyRound className="w-3 h-3" /> Nueva Contraseña <span className="text-neutral-600 normal-case font-medium">(dejar vacío para no cambiar)</span>
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

      {/* ── MODAL: Admin Match Editor ── */}
      {adminMatchModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-md p-6 shadow-2xl animate-slide-in-up space-y-6">
            <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
              <div>
                <h3 className="text-sm font-black uppercase text-neutral-100">Actualizar Marcador</h3>
                <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-mono">Modo Administrador</span>
              </div>
              <button onClick={() => setAdminMatchModal(null)} className="bg-neutral-950 hover:bg-neutral-800 text-neutral-400 p-2 rounded-full border border-neutral-800 transition">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex justify-between items-center py-4 bg-neutral-950 border border-neutral-800/80 rounded-2xl px-6">
              <div className="flex flex-col items-center gap-2 w-1/3">
                <span className="text-3xl">{getTeamFlag(adminMatchModal.local)}</span>
                <span className="text-xs font-bold text-neutral-200 uppercase truncate w-full text-center">{adminMatchModal.local}</span>
                <input type="number" min="0" value={adminGolesLocal} onChange={e => setAdminGolesLocal(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-16 bg-neutral-900 border border-neutral-800 text-center py-2 text-yellow-500 font-mono font-black text-lg rounded-lg outline-none mt-2" />
              </div>
              <span className="text-2xl text-neutral-700 font-extrabold font-mono">:</span>
              <div className="flex flex-col items-center gap-2 w-1/3">
                <span className="text-3xl">{getTeamFlag(adminMatchModal.visitante)}</span>
                <span className="text-xs font-bold text-neutral-200 uppercase truncate w-full text-center">{adminMatchModal.visitante}</span>
                <input type="number" min="0" value={adminGolesVisitante} onChange={e => setAdminGolesVisitante(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-16 bg-neutral-900 border border-neutral-800 text-center py-2 text-yellow-500 font-mono font-black text-lg rounded-lg outline-none mt-2" />
              </div>
            </div>
            <div>
              <label className="block text-neutral-400 text-xs font-bold uppercase tracking-wide mb-2">Estado del Partido</label>
              <select value={adminEstado} onChange={e => setAdminEstado(e.target.value as any)} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-neutral-300 outline-none transition">
                <option value="upcoming">Programado (upcoming)</option>
                <option value="live">En Juego (live)</option>
                <option value="finished">Finalizado (finished)</option>
              </select>
            </div>
            <div>
              <label className="block text-neutral-400 text-xs font-bold uppercase tracking-wide mb-2">Enlaces de Transmisión (separados por coma)</label>
              <textarea value={adminTransmisionEnlaces} onChange={e => setAdminTransmisionEnlaces(e.target.value)}
                placeholder="ej: Bolivia TV: https://boliviatv.bo, Unitel: https://unitel.tv" rows={2}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-xs text-neutral-300 outline-none transition focus:border-yellow-500/35 resize-none placeholder-neutral-700 font-mono" />
            </div>
            <button onClick={handleAdminUpdateMatch} disabled={adminSubmitting}
              className="w-full bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-500/50 text-neutral-950 font-bold py-3.5 rounded-xl text-sm transition tracking-wider uppercase flex items-center justify-center gap-2 active:scale-[0.98]">
              <Check className="w-4 h-4" />
              <span>{adminSubmitting ? 'Guardando Marcador...' : 'Guardar Marcador'}</span>
            </button>
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

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setPaymentModalUser(null)} className="flex-1 btn-secondary-stitch py-2.5 text-xs font-black uppercase tracking-wider">Cancelar</button>
                <button type="submit" disabled={paymentSubmitting} className="flex-1 btn-primary-stitch py-2.5 text-xs font-black uppercase tracking-wider disabled:opacity-50">
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
                        <div className="flex-1 flex gap-2 items-center">
                          <input
                            type="number"
                            step="0.01"
                            value={editingPaymentMonto}
                            onChange={e => setEditingPaymentMonto(e.target.value)}
                            className="w-24 bg-neutral-950 border border-neutral-850 rounded-lg px-2 py-1 text-xs text-neutral-200"
                          />
                          <input
                            type="date"
                            value={editingPaymentFecha}
                            onChange={e => setEditingPaymentFecha(e.target.value)}
                            className="bg-neutral-950 border border-neutral-850 rounded-lg px-2 py-1 text-xs text-neutral-200"
                          />
                          <button
                            onClick={() => handleUpdatePayment(p.id)}
                            className="bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 px-2 py-1 rounded-lg font-bold"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => setEditingPaymentId(null)}
                            className="bg-neutral-800 hover:bg-neutral-750 text-neutral-400 px-2 py-1 rounded-lg"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <>
                          <div>
                            <div className="font-bold text-neutral-200">Bs. {parseFloat(p.monto).toLocaleString('es-BO', { minimumFractionDigits: 2 })}</div>
                            <div className="text-[10px] text-neutral-500">{new Date(p.fecha).toLocaleString('es-BO')}</div>
                          </div>
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => {
                                setEditingPaymentId(p.id);
                                setEditingPaymentMonto(String(p.monto));
                                setEditingPaymentFecha(p.fecha.split('T')[0]);
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
                className="btn-secondary-stitch px-4 py-2 text-xs font-black uppercase tracking-wider"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
