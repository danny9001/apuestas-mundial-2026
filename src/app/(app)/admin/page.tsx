'use client';

import { useEffect, useState } from 'react';
import {
  ShieldAlert, Building2, RefreshCw, Users, MessageSquare, Coins, Download, X, Timer, BarChart3, Database
} from 'lucide-react';
import { useApp } from '@/contexts/AppContext';

// Import modular components
import UsersTab from '@/components/admin/UsersTab';
import CompaniesTab from '@/components/admin/CompaniesTab';
import NotificationsTab from '@/components/admin/NotificationsTab';
import PaymentsTab from '@/components/admin/PaymentsTab';
import LogsTab from '@/components/admin/LogsTab';
import PwaTab from '@/components/admin/PwaTab';
import StatsTab from '@/components/admin/StatsTab';
import BackupsTab from '@/components/admin/BackupsTab';

export default function AdminPage() {
  const { user, showToast, appName, appLogo, setAppName, setAppLogo, predictionCloseMinutes, setPredictionCloseMinutes } = useApp();

  // Sub-tab selector state
  const [adminSubTab, setAdminSubTab] = useState<'usuarios' | 'empresa' | 'mensajes' | 'pagos' | 'logs' | 'pwa' | 'stats' | 'backups'>('usuarios');

  // Shared Data States
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [syncStatus, setSyncStatus] = useState<any>(null);

  // Mail notification config modal states (maintained in page.tsx as it is triggered from header)
  const [showMailConfigModal, setShowMailConfigModal] = useState(false);
  const [mailConfigEnabled, setMailConfigEnabled] = useState(true);

  // Bet close config modal
  const [showBetConfigModal, setShowBetConfigModal] = useState(false);
  const [betCloseInput, setBetCloseInput] = useState(predictionCloseMinutes);

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

  // Initial load
  useEffect(() => {
    if (!user) return;
    fetchAdminUsers();
    fetchCompanies();
    fetchMatches();
    if (user.tipo === 'superadmin') {
      fetchSyncStatus();
      fetchGroups();
    }
  }, [user]);

  // Sync settings configuration on mount / change
  useEffect(() => {
    if (user?.tipo === 'superadmin') {
      fetch('/api/settings')
        .then(res => res.json())
        .then(s => {
          if (s.mail_notifications_enabled) setMailConfigEnabled(s.mail_notifications_enabled === 'true');
        })
        .catch(() => {});
    }
  }, [appName, appLogo, user]);

  const handleRecalculateLeaderboard = async () => {
    try {
      const res = await fetch('/api/admin/recalculate', { method: 'POST' });
      if (res.ok) showToast('📊 ¡Clasificación recalculada!');
      else showToast('Error al recalcular');
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
              <h2 className="text-lg font-black tracking-wider text-neutral-100 uppercase font-sans">
                {user.tipo === 'superadmin' ? 'Super Administrador' : 'Panel de Empresa'}
              </h2>
              <p className="text-[9px] text-neutral-500 uppercase tracking-widest font-mono">
                {user.tipo === 'superadmin' ? 'Control total del sistema' : 'Gestión de usuarios de tu empresa'}
              </p>
            </div>
          </div>
          {user.tipo === 'superadmin' && (
            <div className="flex gap-2">
              <button
                onClick={() => { setBetCloseInput(predictionCloseMinutes); setShowBetConfigModal(true); }}
                className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-750 text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 transition active:scale-95 shadow font-sans"
              >
                <Timer className="w-3.5 h-3.5" />
                <span>Cierre Apuestas</span>
              </button>
              <button
                onClick={() => setShowMailConfigModal(true)}
                className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-750 text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 transition active:scale-95 shadow font-sans"
              >
                <span>✉️ Configurar Correo</span>
              </button>
              <button
                onClick={handleRecalculateLeaderboard}
                className="bg-yellow-500 hover:bg-yellow-600 text-neutral-950 text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 transition active:scale-95 shadow font-sans"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Recalcular Clasificación</span>
              </button>
            </div>
          )}
        </div>

        {/* ── Main layout: flex-row with sidebar ── */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">

          {/* ── Sub-tabs Mobile ── */}
          <div className="lg:hidden flex gap-1 border-b border-neutral-800 pb-0 overflow-x-auto w-full">
            {([
              { key: 'usuarios', label: 'Usuarios', icon: <Users className="w-3.5 h-3.5" /> },
              { key: 'empresa', label: 'Empresa', icon: <Building2 className="w-3.5 h-3.5" /> },
              { key: 'mensajes', label: 'Mensajes', icon: <MessageSquare className="w-3.5 h-3.5" /> },
              { key: 'pagos', label: 'Pagos 💰', icon: <Coins className="w-3.5 h-3.5" /> },
              { key: 'pwa', label: 'PWA 📱', icon: <Download className="w-3.5 h-3.5" /> },
              ...(user.tipo === 'superadmin' ? [
                { key: 'stats', label: 'Estadísticas', icon: <BarChart3 className="w-3.5 h-3.5" /> },
                { key: 'logs', label: 'Logs 📋', icon: <ShieldAlert className="w-3.5 h-3.5" /> },
                { key: 'backups', label: 'Backups 💾', icon: <Database className="w-3.5 h-3.5" /> },
              ] : []),
            ] as const).map(t => (
              <button
                key={t.key}
                onClick={() => setAdminSubTab(t.key as any)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-[11px] font-black uppercase tracking-wider border-b-2 transition -mb-px font-sans ${
                  adminSubTab === t.key
                    ? 'border-yellow-500 text-yellow-500'
                    : 'border-transparent text-neutral-500 hover:text-neutral-300'
                }`}
              >
                {t.icon}{t.label}
              </button>
            ))}
          </div>

          {/* ── Sub-tabs Desktop Sidebar ── */}
          <aside className="hidden lg:flex flex-col w-52 flex-shrink-0 gap-1 sticky top-4">
            {([
              { key: 'usuarios', label: 'Usuarios', icon: <Users className="w-3.5 h-3.5" /> },
              { key: 'empresa', label: 'Empresa', icon: <Building2 className="w-3.5 h-3.5" /> },
              { key: 'mensajes', label: 'Mensajes', icon: <MessageSquare className="w-3.5 h-3.5" /> },
              { key: 'pagos', label: 'Pagos 💰', icon: <Coins className="w-3.5 h-3.5" /> },
              { key: 'pwa', label: 'PWA 📱', icon: <Download className="w-3.5 h-3.5" /> },
              ...(user.tipo === 'superadmin' ? [
                { key: 'stats', label: 'Estadísticas', icon: <BarChart3 className="w-3.5 h-3.5" /> },
                { key: 'logs', label: 'Logs 📋', icon: <ShieldAlert className="w-3.5 h-3.5" /> },
                { key: 'backups', label: 'Backups 💾', icon: <Database className="w-3.5 h-3.5" /> },
              ] : []),
            ] as const).map(t => (
              <button
                key={t.key}
                onClick={() => setAdminSubTab(t.key as any)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition text-left font-sans ${
                  adminSubTab === t.key
                    ? 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-500'
                    : 'text-neutral-500 hover:bg-neutral-900/50 border border-transparent hover:text-neutral-300'
                }`}
              >
                {t.icon}{t.label}
              </button>
            ))}
          </aside>

          {/* ── Main content wrapper ── */}
          <div className="lg:flex-1 w-full space-y-6">

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
                    <span className="text-[9px] text-neutral-500 uppercase tracking-widest text-center font-sans">{stat.label}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Render Tab Contents */}
            {adminSubTab === 'usuarios' && (
              <UsersTab
                user={user}
                adminUsers={adminUsers}
                setAdminUsers={setAdminUsers}
                companies={companies}
                fetchAdminUsers={fetchAdminUsers}
                showToast={showToast}
              />
            )}

            {adminSubTab === 'empresa' && (
              <CompaniesTab
                user={user}
                appName={appName}
                appLogo={appLogo}
                setAppName={setAppName}
                setAppLogo={setAppLogo}
                companies={companies}
                setCompanies={setCompanies}
                groups={groups}
                setGroups={setGroups}
                adminUsers={adminUsers}
                matches={matches}
                setMatches={setMatches}
                fetchCompanies={fetchCompanies}
                fetchGroups={fetchGroups}
                fetchMatches={fetchMatches}
                showToast={showToast}
                showMailConfigModal={showMailConfigModal}
                setShowMailConfigModal={setShowMailConfigModal}
                mailConfigEnabled={mailConfigEnabled}
                setMailConfigEnabled={setMailConfigEnabled}
                syncStatus={syncStatus}
                fetchSyncStatus={fetchSyncStatus}
              />
            )}

            {adminSubTab === 'mensajes' && (
              <NotificationsTab
                user={user}
                companies={companies}
                groups={groups}
                adminUsers={adminUsers}
                showToast={showToast}
              />
            )}

            {adminSubTab === 'pagos' && (
              <PaymentsTab
                user={user}
                companies={companies}
                showToast={showToast}
              />
            )}

            {adminSubTab === 'stats' && user.tipo === 'superadmin' && (
              <StatsTab user={user} />
            )}

            {adminSubTab === 'logs' && user.tipo === 'superadmin' && (
              <LogsTab
                user={user}
                showToast={showToast}
              />
            )}

            {adminSubTab === 'backups' && user.tipo === 'superadmin' && (
              <BackupsTab
                user={user}
                showToast={showToast}
              />
            )}

            {adminSubTab === 'pwa' && (
              <PwaTab
                adminUsers={adminUsers}
              />
            )}

          </div>

        </div>
      </section>

      {/* ── MODAL: Bet Close Configuration (Super Admin Only) ── */}
      {showBetConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setShowBetConfigModal(false)}>
          <div className="glass-card border border-neutral-800/80 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-neutral-800/50 pb-4">
              <div>
                <h3 className="text-sm font-black uppercase text-neutral-100 tracking-wider flex items-center gap-2 font-sans">
                  <Timer className="w-4 h-4 text-yellow-500" /> Cierre de Apuestas
                </h3>
                <p className="text-[10px] text-neutral-500 mt-0.5 font-mono">Minutos antes del partido en que se bloquean los pronósticos</p>
              </div>
              <button onClick={() => setShowBetConfigModal(false)} className="text-neutral-500 hover:text-neutral-200 transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-neutral-400 leading-relaxed font-sans">
                Define cuántos minutos antes de cada partido se cierran los pronósticos. El valor por defecto es <strong className="text-yellow-500">15 minutos</strong>.
              </p>

              <div className="space-y-2">
                <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest">Minutos antes del partido</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={1}
                    max={240}
                    value={betCloseInput}
                    onChange={e => setBetCloseInput(Math.max(1, Math.min(240, parseInt(e.target.value) || 15)))}
                    className="w-32 input-stitch px-3 py-2 text-sm font-mono text-center"
                  />
                  <span className="text-xs text-neutral-500 font-sans">min (1–240)</span>
                </div>
                <div className="flex gap-2 flex-wrap mt-2">
                  {[5, 10, 15, 30, 45, 60].map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setBetCloseInput(v)}
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition ${betCloseInput === v ? 'bg-yellow-500 border-yellow-500 text-neutral-950' : 'border-neutral-700 bg-neutral-800 text-neutral-400 hover:bg-neutral-700'}`}
                    >
                      {v} min
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  onClick={() => setShowBetConfigModal(false)}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold uppercase tracking-wider rounded-xl transition font-sans"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    try {
                      const res = await fetch('/api/settings', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ prediction_close_minutes: betCloseInput }),
                      });
                      if (res.ok) {
                        setPredictionCloseMinutes(betCloseInput);
                        showToast(`✅ Cierre de apuestas: ${betCloseInput} minutos antes`);
                        setShowBetConfigModal(false);
                      } else {
                        showToast('❌ Error al guardar configuración');
                      }
                    } catch {
                      showToast('❌ Error de red');
                    }
                  }}
                  className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-neutral-950 text-xs font-bold uppercase tracking-wider rounded-xl transition font-sans"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Configure Email Notifications (Super Admin Only) ── */}
      {showMailConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setShowMailConfigModal(false)}>
          <div className="glass-card border border-neutral-800/80 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-neutral-800/50 pb-4">
              <div>
                <h3 className="text-sm font-black uppercase text-neutral-100 tracking-wider flex items-center gap-2 font-sans">
                  ✉️ Configurar Notificaciones de Correo
                </h3>
                <p className="text-[10px] text-neutral-500 mt-0.5 font-mono">Gestión de alertas vía Microsoft Graph</p>
              </div>
              <button onClick={() => setShowMailConfigModal(false)} className="text-neutral-500 hover:text-neutral-200 transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-neutral-400 leading-relaxed font-sans">
                Controla si el sistema debe enviar correos electrónicos automáticos (como aprobaciones de cuentas) a los participantes y administradores.
              </p>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-850">
                <div>
                  <div className="text-xs font-bold text-neutral-200 font-sans">Envío de Correos Activo</div>
                  <div className="text-[9px] text-neutral-500 font-sans">Notificaciones automáticas a usuarios</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mailConfigEnabled}
                    onChange={e => setMailConfigEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-neutral-400 after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-yellow-500 peer-checked:after:bg-neutral-950"></div>
                </label>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  onClick={() => setShowMailConfigModal(false)}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold uppercase tracking-wider rounded-xl transition font-sans"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    try {
                      const fd = new FormData();
                      fd.append('app_name', appName);
                      fd.append('logo_type', appLogo.startsWith('/') || appLogo.startsWith('http') ? 'file' : 'emoji');
                      if (!(appLogo.startsWith('/') || appLogo.startsWith('http'))) {
                        fd.append('logo_emoji', appLogo);
                      }
                      fd.append('mail_notifications_enabled', mailConfigEnabled ? 'true' : 'false');
                      
                      const res = await fetch('/api/settings', {
                        method: 'POST',
                        body: fd
                      });
                      if (res.ok) {
                        showToast('✅ Configuración de correo guardada');
                        setShowMailConfigModal(false);
                      } else {
                        showToast('❌ Error al guardar configuración');
                      }
                    } catch {
                      showToast('❌ Error de red');
                    }
                  }}
                  className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-neutral-950 text-xs font-bold uppercase tracking-wider rounded-xl transition font-sans"
                >
                  Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
