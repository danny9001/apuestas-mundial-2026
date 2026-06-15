'use client';

import { useEffect, useState } from 'react';
import { User, Check, RefreshCw, LogOut, Activity, Trash2, KeyRound } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';

export default function PerfilPage() {
  const { user, setUser, handleLogout, handleTogglePush, pushSubscribed, showToast } = useApp();

  const [profileNombre, setProfileNombre] = useState('');
  const [profileTelefono, setProfileTelefono] = useState('');
  const [profilePassword, setProfilePassword] = useState('');
  const [profileAvatarFile, setProfileAvatarFile] = useState<File | null>(null);
  const [profileAvatarPreview, setProfileAvatarPreview] = useState<string | null>(null);
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  const [userPasskeys, setUserPasskeys] = useState<any[]>([]);
  const [myStats, setMyStats] = useState<any>(null);
  const [paymentInfo, setPaymentInfo] = useState<any>(null);

  useEffect(() => {
    if (user) {
      setProfileNombre(user.nombre);
      setProfileTelefono(user.telefono || '');
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchPasskeys();
    fetchMyStats();
    fetchPaymentInfo();
  }, [user]);

  const fetchPaymentInfo = async () => {
    try {
      const res = await fetch(`/api/profile/payments?t=${Date.now()}`);
      if (res.ok) setPaymentInfo(await res.json());
    } catch {}
  };

  const fetchPasskeys = async () => {
    try {
      const res = await fetch(`/api/auth/webauthn/passkeys?t=${Date.now()}`);
      if (res.ok) setUserPasskeys(await res.json());
    } catch {}
  };

  const fetchMyStats = async () => {
    try {
      const res = await fetch(`/api/stats/me?t=${Date.now()}`);
      if (res.ok) setMyStats(await res.json());
    } catch {}
  };

  const handleDeletePasskey = async (id: number) => {
    try {
      const res = await fetch('/api/auth/webauthn/passkeys', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) { showToast('🔑 Llave eliminada'); await fetchPasskeys(); }
      else { const d = await res.json(); showToast(d.error || 'Error'); }
    } catch { showToast('Error de red'); }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileNombre.trim()) { setProfileError('El nombre no puede estar vacío'); return; }
    setProfileSubmitting(true);
    setProfileError('');
    setProfileSuccess('');
    try {
      const formData = new FormData();
      formData.append('nombre', profileNombre.trim());
      if (profilePassword.trim()) formData.append('password', profilePassword);
      if (profileTelefono.trim()) formData.append('telefono', profileTelefono.trim());
      if (profileAvatarFile) formData.append('avatarFile', profileAvatarFile);
      const res = await fetch('/api/profile', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok) {
        setProfileSuccess('¡Perfil actualizado con éxito!');
        setUser(data.user);
        setProfilePassword('');
        setProfileAvatarFile(null);
        setProfileAvatarPreview(null);
        showToast('👤 ¡Perfil actualizado!');
      } else {
        setProfileError(data.error || 'Error al actualizar el perfil');
      }
    } catch { setProfileError('Error al conectar con el servidor'); }
    finally { setProfileSubmitting(false); }
  };

  if (!user) return null;

  const avatarSrc = profileAvatarPreview || ((user.avatar && user.avatar !== 'null' && user.avatar !== 'undefined') ? user.avatar : 'https://stg00vm.blob.core.windows.net/jet00/default.webp');

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <User className="w-5 h-5 text-yellow-500" />
          <h2 className="text-lg font-black tracking-wider text-neutral-100 uppercase">Mi Cuenta</h2>
        </div>
        {user.tipo !== 'admin' && user.tipo !== 'superadmin' && (
          <span className={`text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border ${
            user.aprobado ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20 animate-pulse'
          }`}>
            {user.aprobado ? '✅ Cuenta Aprobada' : user.denegado ? '🚫 Solicitud Denegada' : '⏳ Pendiente de Aprobación'}
          </span>
        )}
      </div>

      {!user.aprobado && user.tipo !== 'admin' && user.tipo !== 'superadmin' && (
        user.denegado ? (
          <div className="bg-red-500/5 border border-red-500/25 rounded-2xl p-5 flex gap-3 text-xs font-semibold">
            <span className="text-xl">🚫</span>
            <div className="space-y-1 flex-1">
              <p className="font-extrabold uppercase text-[10px] tracking-wider text-red-400">Solicitud Denegada</p>
              <p className="text-neutral-400 leading-relaxed text-[11px]">Tu solicitud de participación no fue aprobada. Contacta al administrador para revisar tu caso.</p>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-500/5 border border-yellow-500/25 rounded-2xl p-5 flex gap-3 text-xs font-semibold">
            <span className="text-xl animate-bounce">⚠️</span>
            <div className="space-y-1 flex-1">
              <p className="font-extrabold uppercase text-[10px] tracking-wider text-yellow-500">Participación Pendiente</p>
              <p className="text-neutral-400 leading-relaxed text-[11px]">El administrador debe aprobar tu cuenta. Mientras tanto puedes explorar partidos, fixture y clasificaciones.</p>
            </div>
          </div>
        )
      )}

      {/* Payment Status Card */}
      {paymentInfo && user.tipo !== 'superadmin' && (
        <div className={`border rounded-2xl p-5 flex gap-3 text-xs font-semibold ${
          paymentInfo.pagadoCompleto 
            ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' 
            : 'bg-yellow-500/5 border-yellow-500/20 text-yellow-500'
        }`}>
          <span className="text-xl">💰</span>
          <div className="space-y-1 flex-1">
            <p className="font-extrabold uppercase text-[10px] tracking-wider">
              Estado de Pago: {paymentInfo.pagadoCompleto ? '🟢 Pago Completado' : '🔴 Pago Incompleto / Pendiente'}
            </p>
            <p className="text-neutral-400 leading-relaxed text-[11px]">
              {paymentInfo.pagadoCompleto 
                ? `¡Gracias! Has cubierto la totalidad de tu cuota de Bs. ${paymentInfo.cuota.toLocaleString('es-BO')}.`
                : `Has pagado Bs. ${paymentInfo.totalPagado.toLocaleString('es-BO')} de un total de Bs. ${paymentInfo.cuota.toLocaleString('es-BO')}. Saldo pendiente: Bs. ${(paymentInfo.cuota - paymentInfo.totalPagado).toLocaleString('es-BO')}.`
              }
            </p>
            {paymentInfo.payments.length > 0 && (
              <div className="pt-2 flex flex-wrap gap-1.5">
                {paymentInfo.payments.map((p: any) => (
                  <span key={p.id} className="inline-flex items-center gap-1 text-[9px] font-mono font-bold bg-neutral-900 border border-neutral-800 rounded-md px-1.5 py-0.5 text-neutral-400">
                    <span>Bs. {parseFloat(p.monto).toLocaleString('es-BO')} ({new Date(p.fecha).toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit' })})</span>
                    {p.comprobante_url && (
                      <a href={p.comprobante_url} target="_blank" rel="noopener noreferrer" className="text-yellow-500 hover:text-yellow-400 ml-0.5" title="Ver comprobante">🔍</a>
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Grid wrapper for desktop layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

      {/* Left Column: Profile Editor */}
      <div className="glass-card rounded-3xl p-6 md:p-8 shadow-2xl border border-neutral-800/80">
        <form onSubmit={handleSaveProfile} className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8">
          {/* Avatar */}
          <div className="md:col-span-4 flex flex-col items-center gap-6 justify-center border-b md:border-b-0 md:border-r border-neutral-850 pb-6 md:pb-0 md:pr-8">
            <div className="relative group">
              <img
                src={avatarSrc}
                onError={(e) => { const img = e.target as HTMLImageElement; if (!img.src.includes('default.webp')) img.src = 'https://stg00vm.blob.core.windows.net/jet00/default.webp'; }}
                className={`w-32 h-32 rounded-full border-2 border-yellow-500/50 p-1 shadow-2xl object-cover transition duration-300 group-hover:opacity-85 ${(!avatarSrc || avatarSrc === 'null' || avatarSrc === 'undefined' || avatarSrc.includes('avatar_5.png') || avatarSrc.includes('default.webp')) ? 'bg-white' : 'bg-neutral-950'}`}
                alt="avatar"
              />
              <label className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center text-[10px] text-white font-extrabold uppercase opacity-0 group-hover:opacity-100 transition cursor-pointer select-none">
                <span>Subir</span><span>Foto</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setProfileAvatarFile(file);
                    const reader = new FileReader();
                    reader.onloadend = () => setProfileAvatarPreview(reader.result as string);
                    reader.readAsDataURL(file);
                  }
                }} />
              </label>
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-xl font-black text-neutral-100">{user.nombre}</h3>
              <p className="text-neutral-500 text-xs">{user.email}</p>
              <div className="flex justify-center gap-2 pt-2 flex-wrap">
                <span className="bg-neutral-950 border border-neutral-800 text-[9px] text-neutral-400 font-mono tracking-widest px-2.5 py-1 rounded-full uppercase font-black">Rol: {user.tipo}</span>
                <span className="bg-emerald-500/10 border border-emerald-500/20 text-[9px] text-emerald-400 font-mono px-2.5 py-1 rounded-full uppercase font-black">En línea</span>
              </div>
            </div>
          </div>

          {/* Fields */}
          <div className="md:col-span-8 flex flex-col justify-between space-y-5">
            <div className="space-y-4">
              {profileSuccess && <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3.5 rounded-xl text-xs font-bold text-center">{profileSuccess}</div>}
              {profileError && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3.5 rounded-xl text-xs font-bold text-center">{profileError}</div>}

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest block">Nombre Completo</label>
                <input type="text" required value={profileNombre} onChange={(e) => setProfileNombre(e.target.value)} autoComplete="name"
                  className="w-full bg-neutral-950 border border-neutral-850 rounded-xl px-4 py-3 text-neutral-200 text-xs focus:border-yellow-500/35 outline-none transition font-semibold" />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest block">Correo (No editable)</label>
                <input type="email" disabled value={user.email} autoComplete="email"
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-neutral-500 text-xs cursor-not-allowed opacity-60 font-semibold" />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest block">Celular / WhatsApp</label>
                <input type="tel" value={profileTelefono} onChange={(e) => setProfileTelefono(e.target.value)} autoComplete="tel"
                  placeholder="+591 XXXXXXXX"
                  className="w-full bg-neutral-950 border border-neutral-850 rounded-xl px-4 py-3 text-neutral-200 text-xs focus:border-yellow-500/35 outline-none transition font-semibold" />
              </div>

              {(user.companies || []).length > 0 && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest block">Mis Empresas</label>
                  <div className="flex flex-wrap gap-2">
                    {(user.companies || []).map((c: any) => (
                      <span key={c.id} className="px-3 py-1.5 rounded-full text-[10px] font-bold border"
                        style={{ color: c.color, borderColor: c.color, backgroundColor: c.color + '15' }}>{c.nombre}</span>
                    ))}
                  </div>
                  <p className="text-[9px] text-neutral-600">Solo lectura · El administrador asigna empresas</p>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest block">Nueva Contraseña (Opcional)</label>
                <input type="password" autoComplete="new-password" value={profilePassword} onChange={(e) => setProfilePassword(e.target.value)}
                  placeholder="Dejar en blanco para no cambiar"
                  className="w-full bg-neutral-950 border border-neutral-850 rounded-xl px-4 py-3 text-neutral-200 text-xs focus:border-yellow-500/35 outline-none transition font-semibold" />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest block">Subir foto de perfil</label>
                <label className="flex-1 bg-neutral-950 border border-neutral-850 hover:border-neutral-700/80 rounded-xl px-4 py-3 text-neutral-400 text-xs transition cursor-pointer font-bold text-center border-dashed block">
                  {profileAvatarFile ? `📸 ${profileAvatarFile.name.substring(0, 30)}` : '📂 Seleccionar archivo de imagen'}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setProfileAvatarFile(file);
                      const reader = new FileReader();
                      reader.onloadend = () => setProfileAvatarPreview(reader.result as string);
                      reader.readAsDataURL(file);
                    }
                  }} />
                </label>
              </div>
            </div>

            <button type="submit" disabled={profileSubmitting}
              className="w-full btn-primary-stitch py-3.5 rounded-xl text-xs font-black tracking-widest uppercase flex items-center justify-center gap-2 active:scale-[0.99] transition disabled:opacity-50">
              {profileSubmitting ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Guardando...</>
                : <><Check className="w-3.5 h-3.5" /> Actualizar Perfil</>}
            </button>
          </div>
        </form>
      </div>

      {/* Right Column: Push + Passkeys + Stats */}
      <div className="space-y-6">

      {/* Push Notifications */}
      <div className="glass-card border border-neutral-800/80 rounded-2xl p-5 flex items-center justify-between gap-4">
        <div>
          <div className="text-xs font-black text-neutral-300 uppercase tracking-wider">Notificaciones Push</div>
          <div className="text-[10px] text-neutral-500 mt-0.5">Recibe alertas de goles, resultados y recordatorios</div>
        </div>
        <button onClick={handleTogglePush}
          className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider border transition ${
            pushSubscribed ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20'
              : 'bg-neutral-900 border-neutral-700 text-neutral-400 hover:border-yellow-500/30 hover:text-yellow-400'
          }`}>
          {pushSubscribed ? '🔔 Activado' : '🔕 Activar'}
        </button>
      </div>

      {/* Passkeys */}
      <div className="glass-card border border-neutral-800/80 rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div>
            <div className="text-xs font-black text-neutral-300 uppercase tracking-wider">Llaves FIDO / Passkeys</div>
            <div className="text-[10px] text-neutral-500 mt-0.5">Inicia sesión con huella, Face ID o clave de seguridad</div>
          </div>
          <span className="text-2xl">🔑</span>
        </div>
        {userPasskeys.length > 0 && (
          <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl divide-y divide-neutral-800 overflow-hidden">
            {userPasskeys.map((pk) => (
              <div key={pk.id} className="flex justify-between items-center px-4 py-3">
                <div>
                  <div className="text-xs font-bold text-neutral-300 flex items-center gap-2">
                    <span>{(pk.transports ?? []).includes('usb') || (pk.transports ?? []).includes('nfc') ? '🔐' : (pk.transports ?? []).includes('hybrid') ? '📲' : pk.device_type === 'multiDevice' ? '☁️' : '📱'}</span>
                    <span>{pk.label || (pk.device_type === 'multiDevice' ? 'Passkey en la nube' : 'Passkey en este dispositivo')}</span>
                    {pk.backed_up && <span className="text-[9px] bg-green-500/10 text-green-400 border border-green-500/20 px-1.5 rounded-full">backup</span>}
                  </div>
                  <div className="text-[9px] text-neutral-600 mt-0.5 font-mono">
                    Registrada {new Date(pk.created_at).toLocaleDateString('es-BO')}
                    {pk.last_used_at && ` · Usada ${new Date(pk.last_used_at).toLocaleDateString('es-BO')}`}
                  </div>
                </div>
                <button onClick={() => handleDeletePasskey(pk.id)} className="text-red-400 hover:text-red-300 p-2 rounded-lg hover:bg-red-500/10 transition">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
        <a href="https://id.genial-it.net/dashboard/perfil" target="_blank" rel="noopener noreferrer"
          className="w-full bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 hover:border-yellow-500/40 text-neutral-300 hover:text-neutral-100 py-3 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 uppercase tracking-wider">
          <KeyRound className="w-4 h-4" /> Gestionar Passkeys en ElitePass Identity
        </a>
        <p className="text-[10px] text-neutral-600 leading-relaxed">Las passkeys se gestionan en ElitePass Identity y funcionan en todas las apps del ecosistema.</p>
      </div>

      {/* Personal Stats */}
      {myStats && (
        <div className="glass-card border border-neutral-800/80 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2 border-b border-neutral-800 pb-3">
            <Activity className="w-4 h-4 text-yellow-500" />
            <h3 className="text-xs font-black text-neutral-300 uppercase tracking-widest">Mis Estadísticas</h3>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3">
              <div className="text-green-400 font-black text-xl font-mono">{myStats.exactos}</div>
              <div className="text-[10px] text-neutral-500 uppercase tracking-widest mt-0.5">Exactos</div>
            </div>
            <div className="bg-neutral-800/50 border border-neutral-700/50 rounded-xl p-3">
              <div className="text-neutral-300 font-black text-xl font-mono">{myStats.aciertos}</div>
              <div className="text-[10px] text-neutral-500 uppercase tracking-widest mt-0.5">Aciertos</div>
            </div>
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3">
              <div className="text-neutral-400 font-black text-xl font-mono">{myStats.fallos}</div>
              <div className="text-[10px] text-neutral-500 uppercase tracking-widest mt-0.5">Fallos</div>
            </div>
          </div>
          <div className="space-y-2 text-xs">
            {[
              { label: 'Resultados exactos', pct: myStats.pct_exacto, color: 'bg-green-500' },
              { label: 'Acertaste ganador', pct: myStats.pct_acierto, color: 'bg-neutral-500' },
              { label: 'Fallos totales', pct: myStats.pct_fallo, color: 'bg-neutral-600' },
            ].map((stat) => (
              <div key={stat.label} className="space-y-1">
                <div className="flex justify-between text-[10px] text-neutral-500">
                  <span>{stat.label}</span>
                  <span className="font-mono font-bold text-neutral-400">{stat.pct}%</span>
                </div>
                <div className="h-1.5 w-full bg-neutral-900 rounded-full overflow-hidden border border-neutral-800">
                  <div className={`h-full ${stat.color} rounded-full transition-all duration-700`} style={{ width: `${stat.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-neutral-800 text-xs">
            <span className="text-neutral-500">{myStats.total} predicciones en partidos finalizados</span>
            <span className="text-yellow-500 font-black font-mono">{myStats.puntos_totales} pts</span>
          </div>
        </div>
      )}
      </div>
      </div>

      {/* Logout */}
      <div className="glass-card border border-neutral-800/40 p-4 rounded-xl md:hidden">
        <button onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 bg-red-950/20 hover:bg-red-950/40 text-red-400 font-bold py-3.5 rounded-lg text-sm border border-red-900/30 transition">
          <LogOut className="w-4 h-4" /> Cerrar Sesión
        </button>
      </div>
    </section>
  );
}
