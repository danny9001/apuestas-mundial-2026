'use client';

import { useState, useEffect } from 'react';
import {
  Settings, Building2, Trash2, Check, X, Users, RefreshCw
} from 'lucide-react';
import { getTeamFlag, PHASES_APUESTA, DEFAULT_MODOS_POR_FASE } from '@/lib/constants';

interface CompaniesTabProps {
  user: any;
  appName: string;
  appLogo: string;
  setAppName: (name: string) => void;
  setAppLogo: (logo: string) => void;
  companies: any[];
  setCompanies: React.Dispatch<React.SetStateAction<any[]>>;
  groups: any[];
  setGroups: React.Dispatch<React.SetStateAction<any[]>>;
  adminUsers: any[];
  matches: any[];
  setMatches: React.Dispatch<React.SetStateAction<any[]>>;
  fetchCompanies: () => Promise<void>;
  fetchGroups: () => Promise<void>;
  fetchMatches: () => Promise<void>;
  showToast: (msg: string) => void;
  showMailConfigModal: boolean;
  setShowMailConfigModal: (show: boolean) => void;
  mailConfigEnabled: boolean;
  setMailConfigEnabled: (enabled: boolean) => void;
  syncStatus: any;
  fetchSyncStatus: () => Promise<void>;
}

export default function CompaniesTab({
  user,
  appName,
  appLogo,
  setAppName,
  setAppLogo,
  companies,
  setCompanies,
  groups,
  setGroups,
  adminUsers,
  matches,
  setMatches,
  fetchCompanies,
  fetchGroups,
  fetchMatches,
  showToast,
  setShowMailConfigModal,
  mailConfigEnabled,
  setMailConfigEnabled,
  syncStatus,
  fetchSyncStatus,
}: CompaniesTabProps) {
  // App settings state
  const [editAppName, setEditAppName] = useState('');
  const [editLogoType, setEditLogoType] = useState<'emoji' | 'file'>('emoji');
  const [editLogoEmoji, setEditLogoEmoji] = useState('🏆');
  const [editLogoFile, setEditLogoFile] = useState<File | null>(null);
  const [editSubtitle, setEditSubtitle] = useState('');
  const [editContactWhatsapp, setEditContactWhatsapp] = useState('');
  const [editContactEmail, setEditContactEmail] = useState('');
  const [settingsSubmitting, setSettingsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>('');

  // Company creation state
  const [newCompanyNombre, setNewCompanyNombre] = useState('');
  const [newCompanyColor, setNewCompanyColor] = useState('#6366f1');
  const [newCompanyMonto, setNewCompanyMonto] = useState('150');
  const [newCompanyModos, setNewCompanyModos] = useState<Record<string, string>>({ ...DEFAULT_MODOS_POR_FASE });
  const [companySubmitting, setCompanySubmitting] = useState(false);
  const [editingMontoId, setEditingMontoId] = useState<number | null>(null);
  const [editingMontoValue, setEditingMontoValue] = useState('');
  const [expandedCompanyModos, setExpandedCompanyModos] = useState<number | null>(null);

  // Groups state
  const [newGroupNombre, setNewGroupNombre] = useState('');
  const [newGroupColor, setNewGroupColor] = useState('#10b981');
  const [groupSubmitting, setGroupSubmitting] = useState(false);
  const [groupMembersModal, setGroupMembersModal] = useState<any | null>(null);
  const [groupMembers, setGroupMembers] = useState<any[]>([]);

  // Invitations state
  const [invitations, setInvitations] = useState<any[]>([]);
  const [invCreating, setInvCreating] = useState(false);
  const [invCompanyId, setInvCompanyId] = useState<number | null>(null);
  const [invCopied, setInvCopied] = useState<string | null>(null);

  // Sync state
  const [syncLoading, setSyncLoading] = useState(false);

  // Admin match editor modal state
  const [adminMatchModal, setAdminMatchModal] = useState<any | null>(null);
  const [adminGolesLocal, setAdminGolesLocal] = useState(0);
  const [adminGolesVisitante, setAdminGolesVisitante] = useState(0);
  const [adminEstado, setAdminEstado] = useState<'upcoming' | 'live' | 'finished'>('upcoming');
  const [adminTransmisionEnlaces, setAdminTransmisionEnlaces] = useState('');
  const [adminSubmitting, setAdminSubmitting] = useState(false);

  // Live stats states
  const [adminStatsTime, setAdminStatsTime] = useState('');
  const [adminStatsExtraTime, setAdminStatsExtraTime] = useState('');
  const [adminStatsPossessionLocal, setAdminStatsPossessionLocal] = useState(50);
  const [adminStatsPossessionVisitante, setAdminStatsPossessionVisitante] = useState(50);
  const [adminStatsShotsLocal, setAdminStatsShotsLocal] = useState(0);
  const [adminStatsShotsVisitante, setAdminStatsShotsVisitante] = useState(0);
  const [adminStatsFoulsLocal, setAdminStatsFoulsLocal] = useState(0);
  const [adminStatsFoulsVisitante, setAdminStatsFoulsVisitante] = useState(0);
  const [adminStatsYellowLocal, setAdminStatsYellowLocal] = useState(0);
  const [adminStatsYellowVisitante, setAdminStatsYellowVisitante] = useState(0);
  const [adminStatsRedLocal, setAdminStatsRedLocal] = useState(0);
  const [adminStatsRedVisitante, setAdminStatsRedVisitante] = useState(0);
  const [adminStatsCornersLocal, setAdminStatsCornersLocal] = useState(0);
  const [adminStatsCornersVisitante, setAdminStatsCornersVisitante] = useState(0);
  const [adminStatsArbitro, setAdminStatsArbitro] = useState('');
  const [adminStatsTemperatura, setAdminStatsTemperatura] = useState('');
  const [adminStatsEvents, setAdminStatsEvents] = useState<any[]>([]);
  const [adminStatsShotsOnTargetLocal, setAdminStatsShotsOnTargetLocal] = useState(0);
  const [adminStatsShotsOnTargetVisitante, setAdminStatsShotsOnTargetVisitante] = useState(0);
  const [adminStatsAssistsLocal, setAdminStatsAssistsLocal] = useState(0);
  const [adminStatsAssistsVisitante, setAdminStatsAssistsVisitante] = useState(0);
  const [adminStatsShotAssistsLocal, setAdminStatsShotAssistsLocal] = useState(0);
  const [adminStatsShotAssistsVisitante, setAdminStatsShotAssistsVisitante] = useState(0);

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
      fetch('/api/settings')
        .then(res => res.json())
        .then(s => {
          if (s.app_subtitle) setEditSubtitle(s.app_subtitle);
          if (s.contact_whatsapp) setEditContactWhatsapp(s.contact_whatsapp);
          if (s.contact_email) setEditContactEmail(s.contact_email);
          if (s.mail_notifications_enabled) setMailConfigEnabled(s.mail_notifications_enabled === 'true');
        })
        .catch(() => {});
    }
  }, [appName, appLogo, user]);

  useEffect(() => {
    loadInvitations();
  }, []);

  const loadInvitations = async () => {
    try {
      const res = await fetch(`/api/invitations?t=${Date.now()}`);
      if (res.ok) setInvitations(await res.json());
    } catch {}
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editAppName.trim()) { showToast('⚠️ El nombre es requerido'); return; }
    setSettingsSubmitting(true);
    setUploadProgress(0);
    setUploadStatus('Preparando archivos...');

    try {
      const fd = new FormData();
      fd.append('app_name', editAppName);
      fd.append('logo_type', editLogoType);
      if (editLogoType === 'emoji') fd.append('logo_emoji', editLogoEmoji);
      else if (editLogoFile) fd.append('logo_file', editLogoFile);
      fd.append('app_subtitle', editSubtitle);
      fd.append('contact_whatsapp', editContactWhatsapp);
      fd.append('contact_email', editContactEmail);
      fd.append('mail_notifications_enabled', mailConfigEnabled ? 'true' : 'false');

      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/settings', true);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(percentComplete);
          if (percentComplete < 100) {
            setUploadStatus(`Subiendo archivo... ${percentComplete}%`);
          } else {
            setUploadStatus('Procesando imágenes (conversión a WebP y optimización de PWA)...');
          }
        }
      };

      xhr.onload = () => {
        setSettingsSubmitting(false);
        setUploadProgress(null);
        setUploadStatus('');

        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const d = JSON.parse(xhr.responseText);
            showToast('✅ Configuración guardada');
            if (d.settings?.app_name) setAppName(d.settings.app_name);
            if (d.settings?.app_logo) setAppLogo(d.settings.app_logo);
            setEditLogoFile(null);
          } catch {
            showToast('Error al procesar respuesta del servidor');
          }
        } else {
          try {
            const d = JSON.parse(xhr.responseText);
            showToast(d.error || 'Error en el servidor');
          } catch {
            showToast(`Error ${xhr.status}: No se pudo guardar`);
          }
        }
      };

      xhr.onerror = () => {
        setSettingsSubmitting(false);
        setUploadProgress(null);
        setUploadStatus('');
        showToast('❌ Error de red al subir archivo');
      };

      xhr.send(fd);
    } catch (err) {
      setSettingsSubmitting(false);
      setUploadProgress(null);
      setUploadStatus('');
      showToast('❌ Error al subir');
    }
  };

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

  const handleForceSyncAdmin = async () => {
    setSyncLoading(true);
    try {
      const res = await fetch('/api/admin/sync', { method: 'POST' });
      if (res.ok) { showToast('🔄 Sincronización completada'); await fetchSyncStatus(); }
      else showToast('Error al sincronizar');
    } catch { showToast('Error de red'); }
    finally { setSyncLoading(false); }
  };

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
          stats: {
            time: adminStatsTime,
            extra_time: adminStatsExtraTime,
            possession_local: adminStatsPossessionLocal,
            possession_visitante: adminStatsPossessionVisitante,
            shots_local: adminStatsShotsLocal,
            shots_visitante: adminStatsShotsVisitante,
            fouls_local: adminStatsFoulsLocal,
            fouls_visitante: adminStatsFoulsVisitante,
            yellow_cards_local: adminStatsYellowLocal,
            yellow_cards_visitante: adminStatsYellowVisitante,
            red_cards_local: adminStatsRedLocal,
            red_cards_visitante: adminStatsRedVisitante,
            corners_local: adminStatsCornersLocal,
            corners_visitante: adminStatsCornersVisitante,
            arbitro: adminStatsArbitro,
            temperatura: adminStatsTemperatura,
            events: adminStatsEvents,
            shots_on_target_local: adminStatsShotsOnTargetLocal,
            shots_on_target_visitante: adminStatsShotsOnTargetVisitante,
            assists_local: adminStatsAssistsLocal,
            assists_visitante: adminStatsAssistsVisitante,
            shot_assists_local: adminStatsShotAssistsLocal,
            shot_assists_visitante: adminStatsShotAssistsVisitante
          }
        }),
      });
      if (res.ok) { setAdminMatchModal(null); showToast('⚽ Marcador actualizado'); await fetchMatches(); }
      else { const d = await res.json(); showToast(d.error || 'Error'); }
    } catch { showToast('Error de red'); }
    finally { setAdminSubmitting(false); }
  };

  return (
    <div className="space-y-6">
      {/* Settings (superadmin only) */}
      {user.tipo === 'superadmin' && (
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest border-b border-neutral-800 pb-2 flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <Settings className="w-3.5 h-3.5" /> Personalización del Sistema
            </span>
            <button type="button" onClick={() => setShowMailConfigModal(true)}
              className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg border border-yellow-500/30 text-yellow-500 bg-yellow-500/10 hover:bg-yellow-500/20 transition">
              ✉️ Configurar Correos
            </button>
          </h3>
          <form onSubmit={handleSaveSettings} className="bg-neutral-900/40 border border-neutral-900 rounded-2xl p-5 space-y-4">
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
              <div className="space-y-1.5">
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
            {uploadProgress !== null && (
              <div className="space-y-1.5 w-full bg-neutral-950/40 border border-neutral-850 p-3.5 rounded-xl">
                <div className="flex justify-between text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
                  <span>{uploadStatus}</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="h-2 w-full bg-neutral-900 border border-neutral-800 rounded-full overflow-hidden mt-1.5">
                  <div 
                    className="h-full bg-yellow-500 rounded-full transition-all duration-300" 
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
            <div className="flex justify-end pt-2 border-t border-neutral-950">
              <button type="submit" disabled={settingsSubmitting} className="bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-neutral-950 text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 transition active:scale-95 shadow cursor-pointer">
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
          <form onSubmit={handleCreateCompany} className="bg-neutral-900/40 border border-neutral-900 rounded-2xl p-5 space-y-4">
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
          <div className="bg-neutral-900/40 border border-neutral-900 divide-y divide-neutral-900 rounded-2xl overflow-hidden">
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
          <div key={c.id} className="bg-neutral-900/40 border border-neutral-900 rounded-2xl p-5 space-y-4">
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
          <form onSubmit={handleCreateGroup} className="bg-neutral-900/40 border border-neutral-900 rounded-2xl p-5 space-y-4">
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
          <div className="bg-neutral-900/40 border border-neutral-900 divide-y divide-neutral-900 rounded-2xl overflow-hidden">
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
              className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-neutral-900 font-black text-xs rounded-xl transition font-sans">
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
                <button onClick={() => {
                  setAdminMatchModal(m);
                  setAdminGolesLocal(m.goles_local);
                  setAdminGolesVisitante(m.goles_visitante);
                  setAdminEstado(m.estado);
                  setAdminTransmisionEnlaces(m.transmision_enlaces || '');
                  
                  const stats = m.stats || {};
                  setAdminStatsTime(stats.time || '');
                  setAdminStatsExtraTime(stats.extra_time || '');
                  setAdminStatsPossessionLocal(stats.possession_local !== undefined ? stats.possession_local : 50);
                  setAdminStatsPossessionVisitante(stats.possession_visitante !== undefined ? stats.possession_visitante : 50);
                  setAdminStatsShotsLocal(stats.shots_local || 0);
                  setAdminStatsShotsVisitante(stats.shots_visitante || 0);
                  setAdminStatsFoulsLocal(stats.fouls_local || 0);
                  setAdminStatsFoulsVisitante(stats.fouls_visitante || 0);
                  setAdminStatsYellowLocal(stats.yellow_cards_local || 0);
                  setAdminStatsYellowVisitante(stats.yellow_cards_visitante || 0);
                  setAdminStatsRedLocal(stats.red_cards_local || 0);
                  setAdminStatsRedVisitante(stats.red_cards_visitante || 0);
                  setAdminStatsCornersLocal(stats.corners_local || 0);
                  setAdminStatsCornersVisitante(stats.corners_visitante || 0);
                  setAdminStatsArbitro(stats.arbitro || '');
                  setAdminStatsTemperatura(stats.temperatura || '');
                  setAdminStatsEvents(stats.events || []);
                  setAdminStatsShotsOnTargetLocal(stats.shots_on_target_local || 0);
                  setAdminStatsShotsOnTargetVisitante(stats.shots_on_target_visitante || 0);
                  setAdminStatsAssistsLocal(stats.assists_local || 0);
                  setAdminStatsAssistsVisitante(stats.assists_visitante || 0);
                  setAdminStatsShotAssistsLocal(stats.shot_assists_local || 0);
                  setAdminStatsShotAssistsVisitante(stats.shot_assists_visitante || 0);
                }}
                  className="bg-neutral-950 hover:bg-neutral-800 text-neutral-300 font-bold px-4 py-2 border border-neutral-800 hover:border-yellow-500/25 rounded-xl transition">
                  Editar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

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
                  <div key={u.id} className="flex justify-between items-center p-4 text-xs">
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

      {/* ── MODAL: Admin Match Editor ── */}
      {adminMatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl animate-slide-in-up space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
              <div>
                <h3 className="text-sm font-black uppercase text-neutral-100">Actualizar Partido y Estadísticas</h3>
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
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-neutral-400 text-xs font-bold uppercase tracking-wide mb-1.5">Estado del Partido</label>
                <select value={adminEstado} onChange={e => setAdminEstado(e.target.value as any)} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-neutral-300 outline-none transition">
                  <option value="upcoming">Programado (upcoming)</option>
                  <option value="live">En Juego (live)</option>
                  <option value="finished">Finalizado (finished)</option>
                </select>
              </div>
              <div>
                <label className="block text-neutral-400 text-xs font-bold uppercase tracking-wide mb-1.5">Tiempo de Juego (Minuto)</label>
                <input type="text" value={adminStatsTime} onChange={e => setAdminStatsTime(e.target.value)} placeholder="ej: 45', HT, 82'"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-300 outline-none transition font-mono" />
              </div>
            </div>

            {/* SECCIÓN DE ESTADÍSTICAS EN VIVO */}
            <div className="border-t border-neutral-800 pt-4 space-y-4">
              <h4 className="text-[10px] font-black uppercase text-yellow-500 tracking-wider">Estadísticas del Partido</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-neutral-400 text-[10px] font-bold uppercase tracking-wide mb-1">Tiempo Extra (minutos)</label>
                  <input type="text" value={adminStatsExtraTime} onChange={e => setAdminStatsExtraTime(e.target.value)} placeholder="ej: +3, +5"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-300 outline-none transition font-mono" />
                </div>
                <div>
                  <label className="block text-neutral-400 text-[10px] font-bold uppercase tracking-wide mb-1">Posesión (Local % / Vis %)</label>
                  <div className="flex gap-2">
                    <input type="number" min="0" max="100" value={adminStatsPossessionLocal} 
                      onChange={e => {
                        const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                        setAdminStatsPossessionLocal(val);
                        setAdminStatsPossessionVisitante(100 - val);
                      }} 
                      className="w-1/2 bg-neutral-950 border border-neutral-800 text-center py-2 text-xs text-neutral-300 rounded-lg outline-none font-mono" />
                    <input type="number" min="0" max="100" value={adminStatsPossessionVisitante} 
                      onChange={e => {
                        const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                        setAdminStatsPossessionVisitante(val);
                        setAdminStatsPossessionLocal(100 - val);
                      }} 
                      className="w-1/2 bg-neutral-950 border border-neutral-800 text-center py-2 text-xs text-neutral-300 rounded-lg outline-none font-mono" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-neutral-400 text-[9px] font-bold uppercase tracking-wider mb-1 text-center">Tiros (L / V)</label>
                  <div className="flex gap-1">
                    <input type="number" min="0" value={adminStatsShotsLocal} onChange={e => setAdminStatsShotsLocal(Math.max(0, parseInt(e.target.value) || 0))} className="w-1/2 bg-neutral-950 border border-neutral-850 text-center py-1 text-xs text-neutral-300 rounded-lg font-mono" />
                    <input type="number" min="0" value={adminStatsShotsVisitante} onChange={e => setAdminStatsShotsVisitante(Math.max(0, parseInt(e.target.value) || 0))} className="w-1/2 bg-neutral-950 border border-neutral-850 text-center py-1 text-xs text-neutral-300 rounded-lg font-mono" />
                  </div>
                </div>
                <div>
                  <label className="block text-neutral-400 text-[9px] font-bold uppercase tracking-wider mb-1 text-center">Faltas (L / V)</label>
                  <div className="flex gap-1">
                    <input type="number" min="0" value={adminStatsFoulsLocal} onChange={e => setAdminStatsFoulsLocal(Math.max(0, parseInt(e.target.value) || 0))} className="w-1/2 bg-neutral-950 border border-neutral-850 text-center py-1 text-xs text-neutral-300 rounded-lg font-mono" />
                    <input type="number" min="0" value={adminStatsFoulsVisitante} onChange={e => setAdminStatsFoulsVisitante(Math.max(0, parseInt(e.target.value) || 0))} className="w-1/2 bg-neutral-950 border border-neutral-850 text-center py-1 text-xs text-neutral-300 rounded-lg font-mono" />
                  </div>
                </div>
                <div>
                  <label className="block text-neutral-400 text-[9px] font-bold uppercase tracking-wider mb-1 text-center">Esquinas (L / V)</label>
                  <div className="flex gap-1">
                    <input type="number" min="0" value={adminStatsCornersLocal} onChange={e => setAdminStatsCornersLocal(Math.max(0, parseInt(e.target.value) || 0))} className="w-1/2 bg-neutral-950 border border-neutral-850 text-center py-1 text-xs text-neutral-300 rounded-lg font-mono" />
                    <input type="number" min="0" value={adminStatsCornersVisitante} onChange={e => setAdminStatsCornersVisitante(Math.max(0, parseInt(e.target.value) || 0))} className="w-1/2 bg-neutral-950 border border-neutral-850 text-center py-1 text-xs text-neutral-300 rounded-lg font-mono" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-neutral-400 text-[9px] font-bold uppercase tracking-wider mb-1 text-center">Al Arco (L / V)</label>
                  <div className="flex gap-1">
                    <input type="number" min="0" value={adminStatsShotsOnTargetLocal} onChange={e => setAdminStatsShotsOnTargetLocal(Math.max(0, parseInt(e.target.value) || 0))} className="w-1/2 bg-neutral-950 border border-neutral-850 text-center py-1 text-xs text-neutral-300 rounded-lg font-mono" />
                    <input type="number" min="0" value={adminStatsShotsOnTargetVisitante} onChange={e => setAdminStatsShotsOnTargetVisitante(Math.max(0, parseInt(e.target.value) || 0))} className="w-1/2 bg-neutral-950 border border-neutral-850 text-center py-1 text-xs text-neutral-300 rounded-lg font-mono" />
                  </div>
                </div>
                <div>
                  <label className="block text-neutral-400 text-[9px] font-bold uppercase tracking-wider mb-1 text-center">Asistencias (L / V)</label>
                  <div className="flex gap-1">
                    <input type="number" min="0" value={adminStatsAssistsLocal} onChange={e => setAdminStatsAssistsLocal(Math.max(0, parseInt(e.target.value) || 0))} className="w-1/2 bg-neutral-950 border border-neutral-850 text-center py-1 text-xs text-neutral-300 rounded-lg font-mono" />
                    <input type="number" min="0" value={adminStatsAssistsVisitante} onChange={e => setAdminStatsAssistsVisitante(Math.max(0, parseInt(e.target.value) || 0))} className="w-1/2 bg-neutral-950 border border-neutral-850 text-center py-1 text-xs text-neutral-300 rounded-lg font-mono" />
                  </div>
                </div>
                <div>
                  <label className="block text-neutral-400 text-[9px] font-bold uppercase tracking-wider mb-1 text-center">Ocasiones (L / V)</label>
                  <div className="flex gap-1">
                    <input type="number" min="0" value={adminStatsShotAssistsLocal} onChange={e => setAdminStatsShotAssistsLocal(Math.max(0, parseInt(e.target.value) || 0))} className="w-1/2 bg-neutral-950 border border-neutral-850 text-center py-1 text-xs text-neutral-300 rounded-lg font-mono" />
                    <input type="number" min="0" value={adminStatsShotAssistsVisitante} onChange={e => setAdminStatsShotAssistsVisitante(Math.max(0, parseInt(e.target.value) || 0))} className="w-1/2 bg-neutral-950 border border-neutral-850 text-center py-1 text-xs text-neutral-300 rounded-lg font-mono" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-neutral-400 text-[10px] font-bold uppercase tracking-wide mb-1 text-center">Tarjetas Amarillas (L / V)</label>
                  <div className="flex gap-2">
                    <input type="number" min="0" value={adminStatsYellowLocal} onChange={e => setAdminStatsYellowLocal(Math.max(0, parseInt(e.target.value) || 0))} className="w-1/2 bg-neutral-950 border border-neutral-800 text-center py-1.5 text-xs text-neutral-300 rounded-lg font-mono" />
                    <input type="number" min="0" value={adminStatsYellowVisitante} onChange={e => setAdminStatsYellowVisitante(Math.max(0, parseInt(e.target.value) || 0))} className="w-1/2 bg-neutral-950 border border-neutral-800 text-center py-1.5 text-xs text-neutral-300 rounded-lg font-mono" />
                  </div>
                </div>
                <div>
                  <label className="block text-neutral-400 text-[10px] font-bold uppercase tracking-wide mb-1 text-center">Tarjetas Rojas (L / V)</label>
                  <div className="flex gap-2">
                    <input type="number" min="0" value={adminStatsRedLocal} onChange={e => setAdminStatsRedLocal(Math.max(0, parseInt(e.target.value) || 0))} className="w-1/2 bg-neutral-950 border border-neutral-800 text-center py-1.5 text-xs text-neutral-300 rounded-lg font-mono" />
                    <input type="number" min="0" value={adminStatsRedVisitante} onChange={e => setAdminStatsRedVisitante(Math.max(0, parseInt(e.target.value) || 0))} className="w-1/2 bg-neutral-950 border border-neutral-800 text-center py-1.5 text-xs text-neutral-300 rounded-lg font-mono" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-neutral-400 text-[10px] font-bold uppercase tracking-wide mb-1">Árbitro</label>
                  <input type="text" value={adminStatsArbitro} onChange={e => setAdminStatsArbitro(e.target.value)} placeholder="Nombre del árbitro"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-300 outline-none transition" />
                </div>
                <div>
                  <label className="block text-neutral-400 text-[10px] font-bold uppercase tracking-wide mb-1">Clima / Temp</label>
                  <input type="text" value={adminStatsTemperatura} onChange={e => setAdminStatsTemperatura(e.target.value)} placeholder="ej: 18°C, Lluvia"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-300 outline-none transition" />
                </div>
              </div>
            </div>

            {/* SECCIÓN DE EVENTOS/INCIDENCIAS */}
            <div className="border-t border-neutral-800 pt-4 space-y-3">
              <h4 className="text-[10px] font-black uppercase text-yellow-500 tracking-wider">Incidencias / Eventos del Partido</h4>
              
              <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1">
                {adminStatsEvents.length === 0 ? (
                  <p className="text-[10px] text-neutral-600 italic text-center py-2">Sin incidencias registradas</p>
                ) : (
                  adminStatsEvents.map((ev, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-neutral-950 p-2 rounded-lg border border-neutral-850 text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-neutral-500">[{ev.clock}]</span>
                        <span>{ev.type === 'goals' ? '⚽' : ev.type === 'yellow_cards' ? '🟨' : '🟥'}</span>
                        <span className="font-bold text-neutral-350">{ev.player}</span>
                        <span className="text-[9px] text-neutral-500 uppercase">({ev.team === 'local' ? 'L' : 'V'})</span>
                      </div>
                      <button type="button" onClick={() => {
                        const newEvs = adminStatsEvents.filter((_, i) => i !== idx);
                        setAdminStatsEvents(newEvs);
                        
                        // Auto-decrement cards counter
                        if (ev.type === 'yellow_cards') {
                          if (ev.team === 'local') setAdminStatsYellowLocal(prev => Math.max(0, prev - 1));
                          else setAdminStatsYellowVisitante(prev => Math.max(0, prev - 1));
                        } else if (ev.type === 'red_cards') {
                          if (ev.team === 'local') setAdminStatsRedLocal(prev => Math.max(0, prev - 1));
                          else setAdminStatsRedVisitante(prev => Math.max(0, prev - 1));
                        }
                      }} className="text-red-400 hover:text-red-300 font-bold px-1 py-0.5 rounded text-[10px]">
                        Eliminar
                      </button>
                    </div>
                  ))
                )}
              </div>
              
              <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-850 space-y-2">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <input type="text" id="newEventPlayer" placeholder="Nombre jugador" className="bg-neutral-900 border border-neutral-800 rounded px-2.5 py-1.5 text-neutral-300 placeholder-neutral-600 outline-none" />
                  <input type="text" id="newEventClock" placeholder="Minuto (ej: 16')" className="bg-neutral-900 border border-neutral-800 rounded px-2.5 py-1.5 text-neutral-300 placeholder-neutral-600 outline-none" />
                </div>
                <div className="grid grid-cols-3 gap-2 text-[10px]">
                  <select id="newEventType" className="bg-neutral-900 border border-neutral-800 rounded px-1.5 py-1 text-neutral-300 outline-none">
                    <option value="yellow_cards">🟨 Tarjeta Amarilla</option>
                    <option value="red_cards">🟥 Tarjeta Roja</option>
                    <option value="goals">⚽ Gol</option>
                  </select>
                  <select id="newEventTeam" className="bg-neutral-900 border border-neutral-800 rounded px-1.5 py-1 text-neutral-300 outline-none">
                    <option value="local">Local</option>
                    <option value="visitante">Visitante</option>
                  </select>
                  <button type="button" onClick={() => {
                    const pInput = document.getElementById('newEventPlayer') as HTMLInputElement;
                    const cInput = document.getElementById('newEventClock') as HTMLInputElement;
                    const tSelect = document.getElementById('newEventType') as HTMLSelectElement;
                    const teamSelect = document.getElementById('newEventTeam') as HTMLSelectElement;
                    if (!pInput.value || !cInput.value) return;
                    
                    const newEv = {
                      player: pInput.value,
                      clock: cInput.value,
                      type: tSelect.value,
                      team: teamSelect.value
                    };
                    
                    setAdminStatsEvents(prev => [...prev, newEv]);
                    
                    // Auto-increment cards counter
                    if (newEv.type === 'yellow_cards') {
                      if (newEv.team === 'local') setAdminStatsYellowLocal(prev => prev + 1);
                      else setAdminStatsYellowVisitante(prev => prev + 1);
                    } else if (newEv.type === 'red_cards') {
                      if (newEv.team === 'local') setAdminStatsRedLocal(prev => prev + 1);
                      else setAdminStatsRedVisitante(prev => prev + 1);
                    }
                    
                    pInput.value = '';
                    cInput.value = '';
                  }} className="bg-yellow-500 hover:bg-yellow-600 text-neutral-950 font-bold rounded px-2.5 py-1 uppercase tracking-wide">
                    Agregar
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-neutral-400 text-xs font-bold uppercase tracking-wide mb-2">Enlaces de Transmisión (separados por coma)</label>
              <textarea value={adminTransmisionEnlaces} onChange={e => setAdminTransmisionEnlaces(e.target.value)}
                placeholder="ej: Bolivia TV: https://boliviatv.bo, Unitel: https://unitel.tv" rows={2}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-xs text-neutral-300 outline-none transition focus:border-yellow-500/35 resize-none placeholder-neutral-700 font-mono" />
            </div>
            
            <button onClick={handleAdminUpdateMatch} disabled={adminSubmitting}
              className="w-full bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-500/50 text-neutral-950 font-bold py-3.5 rounded-xl text-sm transition tracking-wider uppercase flex items-center justify-center gap-2 active:scale-[0.98] mt-2">
              <Check className="w-4 h-4" />
              <span>{adminSubmitting ? 'Guardando Partido...' : 'Guardar Partido'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
