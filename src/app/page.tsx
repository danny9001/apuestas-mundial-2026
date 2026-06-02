'use strict';

'use client';

import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Calendar, 
  User, 
  Sun,
  Moon,
  Settings, 
  LogOut, 
  Lock, 
  Plus, 
  Check, 
  RefreshCw, 
  ShieldAlert,
  ArrowUp,
  ArrowDown,
  Circle,
  Play,
  X,
  UserCheck,
  UserX,
  ChevronRight,
  BarChart3,
  Grid,
  BookOpen,
  Activity
} from 'lucide-react';

// Team flags helper map — 48 equipos Mundial 2026
const TEAM_FLAGS: { [key: string]: string } = {
  // Grupo A
  'México': '🇲🇽',
  'Sudáfrica': '🇿🇦',
  'Corea del Sur': '🇰🇷',
  'República Checa': '🇨🇿',
  // Grupo B
  'Canadá': '🇨🇦',
  'Bosnia y Herzegovina': '🇧🇦',
  'Qatar': '🇶🇦',
  'Suiza': '🇨🇭',
  // Grupo C
  'Brasil': '🇧🇷',
  'Marruecos': '🇲🇦',
  'Haití': '🇭🇹',
  'Escocia': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  // Grupo D
  'Estados Unidos': '🇺🇸',
  'Paraguay': '🇵🇾',
  'Australia': '🇦🇺',
  'Turquía': '🇹🇷',
  // Grupo E
  'Alemania': '🇩🇪',
  'Curazao': '🇨🇼',
  'Costa de Marfil': '🇨🇮',
  'Ecuador': '🇪🇨',
  // Grupo F
  'Países Bajos': '🇳🇱',
  'Japón': '🇯🇵',
  'Suecia': '🇸🇪',
  'Túnez': '🇹🇳',
  // Grupo G
  'Bélgica': '🇧🇪',
  'Egipto': '🇪🇬',
  'Irán': '🇮🇷',
  'Nueva Zelanda': '🇳🇿',
  // Grupo H
  'España': '🇪🇸',
  'Cabo Verde': '🇨🇻',
  'Arabia Saudita': '🇸🇦',
  'Uruguay': '🇺🇾',
  // Grupo I
  'Francia': '🇫🇷',
  'Senegal': '🇸🇳',
  'Irak': '🇮🇶',
  'Noruega': '🇳🇴',
  // Grupo J
  'Argentina': '🇦🇷',
  'Argelia': '🇩🇿',
  'Austria': '🇦🇹',
  'Jordania': '🇯🇴',
  // Grupo K
  'Portugal': '🇵🇹',
  'RD Congo': '🇨🇩',
  'Uzbekistán': '🇺🇿',
  'Colombia': '🇨🇴',
  // Grupo L
  'Inglaterra': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'Croacia': '🇭🇷',
  'Ghana': '🇬🇭',
  'Panamá': '🇵🇦',
};

function getTeamFlag(name: string): string {
  return TEAM_FLAGS[name] || '🏳️';
}

function formatPlaceholderText(name: string): string {
  if (!name) return '';
  const clean = name.trim();
  if (/^[1-3][A-L]$/.test(clean)) {
    return `${clean[0]}° del Grupo ${clean[1]}`;
  }
  if (clean.startsWith('3') && clean.includes('/')) {
    return `Mejor 3° Grupo ${clean.substring(1)}`;
  }
  if (/^[G][0-9]+$/.test(clean)) {
    return `Ganador Partido ${clean.substring(1)}`;
  }
  if (/^[P][0-9]+$/.test(clean)) {
    return `Perdedor Partido ${clean.substring(1)}`;
  }
  return '';
}

export default function PWAAppPage() {
  // Session & Authentication
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState<any | null>(null);
  
  // Login Form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // User Registration Form
  const [isRegistering, setIsRegistering] = useState(false);

  // WebAuthn / Passkeys
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [passkeyError, setPasskeyError] = useState('');
  const [passkeyRegistering, setPasskeyRegistering] = useState(false);
  const [registerNombre, setRegisterNombre] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
  const [registerError, setRegisterError] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);

  // Active Bottom Tab
  const [activeTab, setActiveTab] = useState<'partidos' | 'ranking' | 'perfil' | 'admin' | 'fixture' | 'reglas'>('partidos');

  // Group remaining matches toggle
  const [groupRemaining, setGroupRemaining] = useState(false);
  const [compactView, setCompactView] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Application Data States
  const [matches, setMatches] = useState<any[]>([]);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [myStats, setMyStats] = useState<any>(null);

  // Application settings states
  const [appName, setAppName] = useState('Mundial 2026');
  const [appLogo, setAppLogo] = useState('🏆');


  // Live Goal Overlay & Success Notifications
  const [goalAlert, setGoalAlert] = useState<any | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Betting Form Modal
  const [betModalMatch, setBetModalMatch] = useState<any | null>(null);
  const [betPredLocal, setBetPredLocal] = useState<number>(0);
  const [betPredVisitante, setBetPredVisitante] = useState<number>(0);
  const [betSubmitting, setBetSubmitting] = useState(false);
  const [betError, setBetError] = useState('');

  const openBetModalForMatch = (m: any) => {
    if (!user) {
      setActiveTab('perfil');
      showToast('🔑 Por favor, inicia sesión para realizar tu apuesta.');
      return;
    }
    if (!user.aprobado) {
      showToast('⚠️ Tu cuenta está pendiente de aprobación por el administrador para participar.');
      return;
    }
    setBetModalMatch(m);
    setBetPredLocal(0);
    setBetPredVisitante(0);
  };

  // Admin Match Editor Modal
  const [adminMatchModal, setAdminMatchModal] = useState<any | null>(null);
  const [adminGolesLocal, setAdminGolesLocal] = useState<number>(0);
  const [adminGolesVisitante, setAdminGolesVisitante] = useState<number>(0);
  const [adminEstado, setAdminEstado] = useState<'upcoming' | 'live' | 'finished'>('upcoming');
  const [adminTransmisionEnlaces, setAdminTransmisionEnlaces] = useState<string>('');
  const [adminSubmitting, setAdminSubmitting] = useState(false);

  // Admin App Settings Form
  const [editAppName, setEditAppName] = useState('');
  const [editLogoType, setEditLogoType] = useState<'emoji' | 'file'>('emoji');
  const [editLogoEmoji, setEditLogoEmoji] = useState('🏆');
  const [editLogoFile, setEditLogoFile] = useState<File | null>(null);
  const [settingsSubmitting, setSettingsSubmitting] = useState(false);

  // Admin User Creator Form
  const [newUserNombre, setNewUserNombre] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserTipo, setNewUserTipo] = useState<'user' | 'admin'>('user');
  const [newUserSubmitting, setNewUserSubmitting] = useState(false);

  // Match Summary & Statistics Modal
  const [summaryModalMatch, setSummaryModalMatch] = useState<any | null>(null);
  const [communityBets, setCommunityBets] = useState<any[]>([]);
  const [loadingSummaryBets, setLoadingSummaryBets] = useState(false);

  // Pre-match news and stats states
  const [matchNews, setMatchNews] = useState<any[]>([]);
  const [matchStatsInfo, setMatchStatsInfo] = useState<any>(null);
  const [loadingNews, setLoadingNews] = useState(false);

  // Profile edit states
  const [profileNombre, setProfileNombre] = useState('');
  const [profilePassword, setProfilePassword] = useState('');
  const [profileAvatarFile, setProfileAvatarFile] = useState<File | null>(null);
  const [profileAvatarPreview, setProfileAvatarPreview] = useState<string | null>(null);
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  // Filters for Matches
  const [filterGrupo, setFilterGrupo] = useState<string>('ALL');
  const [filterFase, setFilterFase] = useState<string>('ALL');

  // Kickoff Countdown State (Kickoff June 11, 2026 16:00:00 Bolivia Time - UTC-4)
  const [kickoffTimeLeft, setKickoffTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  // Load App Settings
  const fetchSettings = async () => {
    try {
      const res = await fetch(`/api/settings?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.app_name) setAppName(data.app_name);
        if (data.app_logo) setAppLogo(data.app_logo);
      }
    } catch (e) {
      console.error('Failed to fetch settings:', e);
    }
  };

  // Load Session on Mount
  const checkSession = async () => {
    try {
      const res = await fetch(`/api/auth?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } catch (e) {
      console.error('Session check failed:', e);
    } finally {
      setAuthChecked(true);
    }
  };

  // Fetch App Data
  const fetchAppData = async () => {
    setDataLoading(true);
    try {
      // Fetch Matches
      const mRes = await fetch(`/api/matches?t=${Date.now()}`);
      if (mRes.ok) {
        const mData = await mRes.json();
        setMatches(mData);
      }

      // Fetch Predictions (only if logged in)
      if (user) {
        const pRes = await fetch(`/api/predictions?t=${Date.now()}`);
        if (pRes.ok) {
          const pData = await pRes.json();
          setPredictions(pData);
        }
      } else {
        setPredictions([]);
      }

      // Fetch Leaderboard
      const lRes = await fetch(`/api/leaderboard?t=${Date.now()}`);
      if (lRes.ok) {
        const lData = await lRes.json();
        setLeaderboard(lData);
      }

      // Fetch Users if Admin
      if (user && user.tipo === 'admin') {
        const uRes = await fetch(`/api/admin/users?t=${Date.now()}`);
        if (uRes.ok) {
          const uData = await uRes.json();
          setAdminUsers(uData);
        }
      }
    } catch (error) {
      console.error('Error fetching application data:', error);
    } finally {
      setDataLoading(false);
    }
  };

  // Fetch Community Bets for Match Summary
  const fetchCommunityBets = async (matchId: number) => {
    setLoadingSummaryBets(true);
    try {
      const res = await fetch(`/api/predictions?matchId=${matchId}&t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setCommunityBets(data);
      }
    } catch (e) {
      console.error('Error fetching community bets:', e);
    } finally {
      setLoadingSummaryBets(false);
    }
  };

  // Fetch Pre-match News & Tactical Previews in Spanish from /api/news (backed by GVTF check)
  const fetchPreMatchNews = async (local: string, visitante: string) => {
    setLoadingNews(true);
    setMatchNews([]);
    setMatchStatsInfo(null);
    try {
      const res = await fetch(`/api/news?local=${encodeURIComponent(local)}&visitante=${encodeURIComponent(visitante)}&t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setMatchNews(data.news || []);
        setMatchStatsInfo(data.matchInfo || null);
      }
    } catch (e) {
      console.error('Error fetching pre-match news:', e);
    } finally {
      setLoadingNews(false);
    }
  };

  // Fetch sync status for admin panel
  const fetchSyncStatus = async () => {
    try {
      const res = await fetch(`/api/admin/sync?t=${Date.now()}`);
      if (res.ok) setSyncStatus(await res.json());
    } catch (e) {}
  };

  // Fetch personal prediction stats for profile
  const fetchMyStats = async () => {
    try {
      const res = await fetch(`/api/stats/me?t=${Date.now()}`);
      if (res.ok) setMyStats(await res.json());
    } catch (e) {}
  };

  // Admin force sync
  const handleForceSyncAdmin = async () => {
    setSyncLoading(true);
    try {
      const res = await fetch('/api/admin/sync', { method: 'POST' });
      if (res.ok) {
        showToast('🔄 Sincronización completada');
        await fetchSyncStatus();
      } else {
        showToast('Error al sincronizar');
      }
    } catch (e) {
      showToast('Error de red al sincronizar');
    } finally {
      setSyncLoading(false);
    }
  };

  // WebAuthn: autenticar con passkey (login sin contraseña)
  const handlePasskeyLogin = async () => {
    setPasskeyLoading(true);
    setPasskeyError('');
    try {
      const { startAuthentication } = await import('@simplewebauthn/browser');
      const optRes = await fetch('/api/auth/webauthn/authenticate?step=options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email || '' }),
      });
      if (!optRes.ok) {
        const d = await optRes.json();
        setPasskeyError(d.error || 'No se encontró passkey para este usuario');
        return;
      }
      const options = await optRes.json();
      const assertion = await startAuthentication({ optionsJSON: options });
      const verRes = await fetch('/api/auth/webauthn/authenticate?step=verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...assertion, email: email || '' }),
      });
      const verData = await verRes.json();
      if (verRes.ok && verData.verified) {
        setUser(verData.user);
      } else {
        setPasskeyError(verData.error || 'Autenticación con passkey fallida');
      }
    } catch (e: any) {
      if (e?.name === 'NotAllowedError') {
        setPasskeyError('Autenticación cancelada o no permitida');
      } else {
        setPasskeyError(e?.message || 'Error al usar la llave FIDO');
      }
    } finally {
      setPasskeyLoading(false);
    }
  };

  // WebAuthn: registrar nueva passkey (desde perfil)
  const handlePasskeyRegister = async () => {
    setPasskeyRegistering(true);
    setPasskeyError('');
    try {
      const { startRegistration } = await import('@simplewebauthn/browser');
      const optRes = await fetch('/api/auth/webauthn/register?step=options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!optRes.ok) {
        const d = await optRes.json();
        setPasskeyError(d.error || 'Error al obtener opciones de registro');
        return;
      }
      const options = await optRes.json();
      const attestation = await startRegistration({ optionsJSON: options });
      const verRes = await fetch('/api/auth/webauthn/register?step=verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attestation),
      });
      const verData = await verRes.json();
      if (verRes.ok && verData.verified) {
        showToast('🔑 ¡Passkey registrada con éxito!');
        setPasskeyError('');
      } else {
        setPasskeyError(verData.error || 'Error al registrar passkey');
      }
    } catch (e: any) {
      if (e?.name === 'NotAllowedError') {
        setPasskeyError('Registro cancelado o no permitido');
      } else {
        setPasskeyError(e?.message || 'Error al registrar la llave FIDO');
      }
    } finally {
      setPasskeyRegistering(false);
    }
  };

  // Handle Profile Update & Avatar Photo Upload
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileNombre.trim()) {
      setProfileError('El nombre no puede estar vacío');
      return;
    }

    setProfileSubmitting(true);
    setProfileError('');
    setProfileSuccess('');

    try {
      const formData = new FormData();
      formData.append('nombre', profileNombre.trim());
      if (profilePassword.trim()) {
        formData.append('password', profilePassword);
      }
      if (profileAvatarFile) {
        formData.append('avatarFile', profileAvatarFile);
      }

      const res = await fetch('/api/profile', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();

      if (res.ok) {
        setProfileSuccess('¡Perfil actualizado con éxito!');
        setUser(data.user);
        setProfilePassword('');
        setProfileAvatarFile(null);
        setProfileAvatarPreview(null);
        showToast('👤 ¡Perfil actualizado con éxito!');
      } else {
        setProfileError(data.error || 'Error al actualizar el perfil');
      }
    } catch (err) {
      setProfileError('Error al conectar con el servidor');
    } finally {
      setProfileSubmitting(false);
    }
  };

  // Auto-fetch bets and tactical news whenever match modal state transitions
  useEffect(() => {
    if (summaryModalMatch) {
      fetchCommunityBets(summaryModalMatch.id);
      fetchPreMatchNews(summaryModalMatch.local, summaryModalMatch.visitante);
    } else {
      setCommunityBets([]);
      setMatchNews([]);
      setMatchStatsInfo(null);
    }
  }, [summaryModalMatch]);

  // Synchronize profile inputs with logged-in user session
  useEffect(() => {
    if (user) {
      setProfileNombre(user.nombre);
    }
  }, [user]);

  // Load sync status when admin tab is opened
  useEffect(() => {
    if (user && activeTab === 'admin') fetchSyncStatus();
  }, [activeTab, user]);

  useEffect(() => {
    if (user && activeTab === 'admin') {
      setEditAppName(appName);
      if (appLogo.startsWith('/') || appLogo.startsWith('http')) {
        setEditLogoType('file');
      } else {
        setEditLogoType('emoji');
        setEditLogoEmoji(appLogo);
      }
    }
  }, [activeTab, appName, appLogo, user]);

  // Load personal stats when profile tab is opened
  useEffect(() => {
    if (user && activeTab === 'perfil') fetchMyStats();
  }, [activeTab, user]);

  // Kickoff Countdown Timer Effect
  useEffect(() => {
    const targetDate = new Date('2026-06-11T16:00:00-04:00'); // Bolivia Time Kickoff
    
    const updateTimer = () => {
      const diff = targetDate.getTime() - Date.now();
      if (diff <= 0) {
        setKickoffTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setKickoffTimeLeft({ days, hours, minutes, seconds });
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    checkSession();
    fetchSettings();
  }, []);

  // Theme Sync and Persistence
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
    } else {
      setTheme('light');
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('theme', theme);
    const root = window.document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
    } else {
      root.classList.remove('light');
    }
  }, [theme]);

  useEffect(() => {
    fetchAppData();

    // Realtime Listening via SSE
    const sse = new EventSource('/api/realtime');

    sse.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        
        if (payload.type === 'match') {
          // Update matches state instantly
          setMatches((prev) =>
            prev.map((m) => (m.id === payload.data.id ? { ...m, ...payload.data } : m))
          );
          showToast(`Partido actualizado: ${payload.data.local} vs ${payload.data.visitante}`);
          
          // Re-fetch community bets if this match is currently opened in summary
          if (summaryModalMatch && summaryModalMatch.id === payload.data.id) {
            setSummaryModalMatch(payload.data);
            fetchCommunityBets(payload.data.id);
          }
        } else if (payload.type === 'leaderboard') {
          // Refetch leaderboard
          fetch(`/api/leaderboard?t=${Date.now()}`)
            .then((res) => res.json())
            .then((lData) => setLeaderboard(lData));
          showToast('¡La clasificación general ha cambiado!');
        } else if (payload.type === 'goal') {
          // ESPN live goal strobe
          setGoalAlert(payload.data);
          setTimeout(() => setGoalAlert(null), 5000);
        }
      } catch (e) {
        // Ignored parsing errors
      }
    };

    return () => {
      sse.close();
    };
  }, [user, summaryModalMatch]);

  // Actions
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
      } else {
        setLoginError(data.error || 'Credenciales inválidas');
      }
    } catch (err) {
      setLoginError('Error de red al intentar iniciar sesión');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError('');

    if (registerPassword !== registerConfirmPassword) {
      setRegisterError('Las contraseñas no coinciden');
      return;
    }

    setRegisterLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: registerNombre,
          email: registerEmail,
          password: registerPassword
        })
      });

      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        showToast('¡Registro exitoso! Bienvenido.');
        // Clean form states
        setRegisterNombre('');
        setRegisterEmail('');
        setRegisterPassword('');
        setRegisterConfirmPassword('');
        setIsRegistering(false);
      } else {
        setRegisterError(data.error || 'Error al intentar registrarse');
      }
    } catch (err) {
      setRegisterError('Error de red al intentar registrarse');
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth', { method: 'DELETE' });
      setUser(null);
      setMatches([]);
      setPredictions([]);
      setLeaderboard([]);
      setAdminUsers([]);
    } catch (e) {
      console.error('Logout failed:', e);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Submit Prediction
  const handleSavePrediction = async () => {
    if (!betModalMatch) return;
    setBetSubmitting(true);
    setBetError('');

    try {
      const res = await fetch('/api/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: betModalMatch.id,
          predLocal: betPredLocal,
          predVisitante: betPredVisitante
        })
      });

      const data = await res.json();

      if (res.ok) {
        // Update predictions list state
        setPredictions((prev) => {
          const index = prev.findIndex((p) => p.match_id === betModalMatch.id);
          if (index !== -1) {
            return prev.map((p, idx) => (idx === index ? { ...p, pred_local: betPredLocal, pred_visitante: betPredVisitante } : p));
          } else {
            return [...prev, { match_id: betModalMatch.id, pred_local: betPredLocal, pred_visitante: betPredVisitante }];
          }
        });

        // Update Excel scores state to keep in sync
        setBetModalMatch(null);
        showToast('🏆 ¡Pronóstico guardado con éxito!');
      } else {
        setBetError(data.error || 'Error al guardar el pronóstico');
      }
    } catch (err) {
      setBetError('Error al conectar con el servidor');
    } finally {
      setBetSubmitting(false);
    }
  };

  // Admin Match Update
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
          transmision_enlaces: adminTransmisionEnlaces
        })
      });

      if (res.ok) {
        setAdminMatchModal(null);
        showToast('⚽ Marcador y estado actualizados!');
        fetchAppData();
      } else {
        const d = await res.json();
        showToast(d.error || 'Error al actualizar el partido');
      }
    } catch (e) {
      showToast('Error de red');
    } finally {
      setAdminSubmitting(false);
    }
  };

  // Admin Toggle User Approval
  const handleToggleUserApproval = async (userId: number, currentApproved: boolean) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, aprobado: !currentApproved })
      });

      if (res.ok) {
        setAdminUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, aprobado: !currentApproved } : u))
        );
        showToast(`Usuario ${!currentApproved ? 'aprobado' : 'desaprobado'} para participar`);
      } else {
        const data = await res.json();
        showToast(data.error || 'Error al cambiar aprobación del usuario');
      }
    } catch (e) {
      showToast('Error de red');
    }
  };

  // Admin Recalculate Leaderboard
  const handleRecalculateLeaderboard = async () => {
    try {
      const res = await fetch('/api/admin/recalculate', { method: 'POST' });
      if (res.ok) {
        showToast('📊 ¡Clasificación general recalculada con éxito!');
        fetchAppData();
      } else {
        showToast('Error al recalcular clasificación');
      }
    } catch (e) {
      showToast('Error de red');
    }
  };

  // Admin Toggle User Status
  const handleToggleUserStatus = async (userId: number, currentActive: boolean) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, activo: !currentActive })
      });

      if (res.ok) {
        setAdminUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, activo: !currentActive } : u))
        );
        showToast(`Usuario ${!currentActive ? 'activado' : 'desactivado'} con éxito`);
      } else {
        const data = await res.json();
        showToast(data.error || 'Error al cambiar estado del usuario');
      }
    } catch (e) {
      showToast('Error de red');
    }
  };

  // Save App Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editAppName.trim()) {
      showToast('⚠️ El nombre de la aplicación es requerido');
      return;
    }
    
    setSettingsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('app_name', editAppName);
      formData.append('logo_type', editLogoType);
      
      if (editLogoType === 'emoji') {
        formData.append('logo_emoji', editLogoEmoji);
      } else if (editLogoFile) {
        formData.append('logo_file', editLogoFile);
      }

      const res = await fetch('/api/settings', {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setAppName(data.settings.app_name);
          setAppLogo(data.settings.app_logo);
          showToast('✅ Configuración de la aplicación guardada con éxito');
        } else {
          showToast(`Error: ${data.error}`);
        }
      } else {
        const data = await res.json();
        showToast(`Error: ${data.error || 'No se pudo guardar la configuración'}`);
      }
    } catch (err: any) {
      showToast('Error de red al guardar la configuración');
    } finally {
      setSettingsSubmitting(false);
    }
  };

  // Create New User (Admin only)
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserNombre.trim() || !newUserEmail.trim() || !newUserPassword.trim()) {
      showToast('⚠️ Todos los campos son obligatorios');
      return;
    }

    setNewUserSubmitting(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          nombre: newUserNombre,
          email: newUserEmail,
          password: newUserPassword,
          tipo: newUserTipo
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast('👤 ¡Usuario creado con éxito!');
        // Refresh the users list
        const uRes = await fetch(`/api/admin/users?t=${Date.now()}`);
        if (uRes.ok) {
          const uData = await uRes.json();
          setAdminUsers(uData);
        }
        // Reset form
        setNewUserNombre('');
        setNewUserEmail('');
        setNewUserPassword('');
        setNewUserTipo('user');
      } else {
        showToast(`Error: ${data.error || 'No se pudo crear el usuario'}`);
      }
    } catch (err: any) {
      showToast('Error de red al crear el usuario');
    } finally {
      setNewUserSubmitting(false);
    }
  };

  // Rendering Helpers
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
        <RefreshCw className="w-12 h-12 text-yellow-500 animate-spin" />
        <p className="text-zinc-500 text-sm mt-4 font-mono">Iniciando aplicación...</p>
      </div>
    );
  }



  // --- APP LAYOUT (AUTHENTICATED) ---
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col md:flex-row w-full pb-safe">
      
      {/* 💻 DESKTOP LAYOUT LEFT SIDEBAR NAVIGATION */}
      <aside className="hidden md:flex md:w-64 bg-zinc-900/40 border-r border-zinc-900/60 flex-col justify-between p-6 md:sticky md:top-0 md:h-screen">
        <div className="space-y-8">
          {/* Logo */}
          <div className="flex items-center gap-2.5 px-2">
            {appLogo.startsWith('/') || appLogo.startsWith('http') ? (
              <img src={appLogo} className="w-7 h-7 object-contain rounded-md flex-shrink-0" alt="logo" />
            ) : (
              <span className="text-2xl flex-shrink-0">{appLogo}</span>
            )}
            <span className="font-black tracking-wider text-sm uppercase text-zinc-100 truncate">{appName}</span>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-2">
            <button
              onClick={() => setActiveTab('partidos')}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
                activeTab === 'partidos' 
                  ? 'btn-primary-stitch shadow-md' 
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50 border border-transparent rounded-lg'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Partidos</span>
            </button>

            <button
              onClick={() => setActiveTab('fixture')}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
                activeTab === 'fixture'
                  ? 'btn-primary-stitch shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50 border border-transparent rounded-lg'
              }`}
            >
              <Trophy className="w-4 h-4" />
              <span>Fixture</span>
            </button>

            <button
              onClick={() => setActiveTab('reglas')}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
                activeTab === 'reglas'
                  ? 'btn-primary-stitch shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50 border border-transparent rounded-lg'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Reglas</span>
            </button>

            <button
              onClick={() => setActiveTab('ranking')}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
                activeTab === 'ranking' 
                  ? 'btn-primary-stitch shadow-md' 
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50 border border-transparent rounded-lg'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Ranking</span>
            </button>

            <button
              onClick={() => setActiveTab('perfil')}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
                activeTab === 'perfil' 
                  ? 'btn-primary-stitch shadow-md' 
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50 border border-transparent rounded-lg'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Mi Perfil</span>
            </button>

            {user && user.tipo === 'admin' && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
                  activeTab === 'admin' 
                    ? 'btn-primary-stitch shadow-md' 
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50 border border-transparent rounded-lg'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span>Administrador</span>
              </button>
            )}
          </nav>
        </div>

        {/* Desktop Sidebar Footer */}
        <div className="space-y-4">
          <a
            href="/tv"
            target="_blank"
            className="w-full btn-secondary-stitch py-3 px-4 text-xs font-bold flex items-center justify-center gap-2"
          >
            <span>📺 Pantalla TV Airport</span>
          </a>
          
          {user ? (
            <div className="bg-zinc-950/60 border border-zinc-850 p-3 rounded-xl flex items-center gap-3">
              <img src={user.avatar} className="w-8 h-8 rounded-full border border-zinc-800 bg-zinc-900" alt="avatar" />
              <div className="truncate flex-1">
                <div className="text-xs font-bold text-zinc-300 truncate">{user.nombre}</div>
                <div className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono">{user.tipo}</div>
              </div>
              <button 
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                className="text-zinc-555 hover:text-yellow-500 p-1.5 transition flex items-center justify-center flex-shrink-0"
                title={theme === 'light' ? 'Modo Oscuro' : 'Modo Claro'}
              >
                {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </button>
              <button 
                onClick={handleLogout}
                className="text-zinc-555 hover:text-red-400 p-1.5 transition flex-shrink-0"
                title="Cerrar Sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="bg-zinc-950/60 border border-zinc-850 p-3 rounded-xl flex justify-between items-center gap-2">
              <button
                onClick={() => setActiveTab('perfil')}
                className="btn-primary-stitch w-full py-2.5 text-xs tracking-wider uppercase flex items-center justify-center gap-2"
              >
                <span>🔑 Iniciar Sesión</span>
              </button>
              <button 
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                className="text-zinc-555 hover:text-yellow-500 p-2 border border-zinc-850 bg-zinc-900/40 rounded-xl transition flex items-center justify-center flex-shrink-0"
                title={theme === 'light' ? 'Modo Oscuro' : 'Modo Claro'}
              >
                {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* RIGHT SIDE MAIN CONTAINER FOR PAGES */}
      <div className="flex-1 flex flex-col justify-between min-h-screen relative">
        
        {/* ESPN Livescore goal alert widget */}
        {goalAlert && (
          <div className="fixed top-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-bounce">
            <div className="bg-yellow-500 text-zinc-950 p-4 rounded-2xl flex items-center justify-between shadow-[0_4px_30px_rgba(234,179,8,0.5)] border-2 border-zinc-950 goal-effect">
              <div className="flex items-center gap-3">
                <span className="text-2xl">⚽</span>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-zinc-800">¡GOL EN VIVO!</div>
                  <div className="text-sm font-bold tracking-tight">
                    {goalAlert.local} <span className="font-black">{goalAlert.goles_local} - {goalAlert.goles_visitante}</span> {goalAlert.visitante}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}


        {/* Internal Notification Toast */}
        {toastMessage && !goalAlert && (
          <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-80 z-40 animate-fade-in-up pointer-events-none">
            <div className="glass-card text-zinc-100 px-4 py-3 rounded-lg border border-zinc-800/80 text-xs flex items-center gap-2 shadow-2xl justify-center">
              <Trophy className="w-4 h-4 text-yellow-500 animate-pulse" />
              <span>{toastMessage}</span>
            </div>
          </div>
        )}

        {/* HEADER BAR FOR MOBILE (Hidden on desktop) */}
        <header className="sticky top-0 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-900/60 px-4 py-4 flex justify-between items-center z-30 pt-safe md:hidden">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {appLogo.startsWith('/') || appLogo.startsWith('http') ? (
              <img src={appLogo} className="w-6 h-6 object-contain rounded-md flex-shrink-0" alt="logo" />
            ) : (
              <span className="text-xl flex-shrink-0">{appLogo}</span>
            )}
            <span className="font-black tracking-wider text-sm uppercase text-zinc-100 truncate">{appName}</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Direct link for TV screen */}
            <a
              href="/tv"
              target="_blank"
              className="bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-yellow-500 p-2 rounded-lg border border-zinc-800 transition flex items-center justify-center"
              title="Ver Modo TV Airport"
            >
              📺
            </a>
            {/* Theme Toggle Button */}
            <button 
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-yellow-500 p-2 rounded-lg border border-zinc-800 transition flex items-center justify-center"
              title={theme === 'light' ? 'Modo Oscuro' : 'Modo Claro'}
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
            <div className="bg-zinc-900 border border-zinc-800 rounded-full px-3 py-1 flex items-center gap-1.5 text-xs text-zinc-300">
              <img src={user.avatar} className="w-4 h-4 rounded-full" alt="avatar" />
              <span className="font-bold max-w-[80px] truncate">{user.nombre.split(' ')[0]}</span>
            </div>
          </div>
        </header>

        {/* MAIN VIEW CONTROLLER */}
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8 overflow-y-auto pb-24 md:pb-8">
          
          {/* --- VIEW 1: PARTIDOS (MATCHES & BETTING CARDS) --- */}
          {activeTab === 'partidos' && (
            <section className="space-y-6">
              
              {/* --- STUNNING KICKOFF DASHBOARD & TRANSMISSION NEWS PANEL --- */}
              <div className="glass-card rounded-3xl p-5 md:p-6 border border-zinc-800/80 shadow-2xl relative overflow-hidden space-y-5 animate-fade-in">
                {/* Ambient decorative background glow */}
                <div className="absolute top-0 right-0 w-48 h-48 bg-yellow-500/5 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-red-500/5 rounded-full blur-3xl pointer-events-none"></div>

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-zinc-850">
                  <div className="flex items-center gap-2.5">
                    <div className="relative">
                      <Trophy className="w-6 h-6 text-yellow-500 animate-bounce" />
                      <span className="absolute -top-1 -right-1 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                      </span>
                    </div>
                    <div>
                      <h2 className="text-sm md:text-base font-black uppercase tracking-wider text-zinc-100">
                        Dashboard Mundial 2026 · Bolivia
                      </h2>
                      <p className="text-[10px] text-zinc-500 font-semibold">
                        Transmisiones oficiales, noticias clave y estado del portal
                      </p>
                    </div>
                  </div>
                  
                  {/* Portal Link */}
                  <a 
                    href="/tv" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 hover:text-red-400 border border-red-500/20 text-[10px] font-black uppercase tracking-wider transition duration-300 shadow-[0_0_15px_rgba(239,68,68,0.08)] group"
                  >
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                    <span>Ver Portal en Vivo (TV Aeropuerto)</span>
                    <span className="transition-transform group-hover:translate-x-0.5">→</span>
                  </a>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                  
                  {/* Left Column: Countdown Widget */}
                  <div className="lg:col-span-5 flex flex-col justify-between bg-zinc-950/40 border border-zinc-900 rounded-2xl p-4 relative">
                    <div className="text-[9px] font-black text-yellow-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-yellow-500 animate-pulse"></span>
                      Cronómetro de Inicio Oficial (Bolivia)
                    </div>
                    
                    {/* Countdown Digits */}
                    <div className="flex items-center justify-between gap-2 py-2">
                      {[
                        { label: 'DÍAS', value: kickoffTimeLeft.days },
                        { label: 'HORAS', value: kickoffTimeLeft.hours },
                        { label: 'MINUTOS', value: kickoffTimeLeft.minutes },
                        { label: 'SEGUNDOS', value: kickoffTimeLeft.seconds },
                      ].map((item, idx) => (
                        <React.Fragment key={item.label}>
                          <div className="flex flex-col items-center flex-1">
                            <div className="w-full h-14 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center font-mono font-black text-2xl text-yellow-500 shadow-inner select-none relative overflow-hidden">
                              {/* Horizontal line simulating split flap */}
                              <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-black/60 z-10"></div>
                              <span className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] animate-pulse">
                                {String(item.value).padStart(2, '0')}
                              </span>
                            </div>
                            <span className="text-[8px] font-black text-zinc-500 tracking-widest mt-1.5">
                              {item.label}
                            </span>
                          </div>
                          {idx < 3 && (
                            <span className="text-yellow-500/40 font-mono font-black text-xl mb-3 animate-pulse">
                              :
                            </span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>

                    <div className="mt-3 text-[8.5px] text-zinc-500 font-bold bg-zinc-950/90 border border-zinc-900 rounded-lg p-2 text-center">
                      📍 Kickoff: <span className="text-zinc-350">11 de Junio, 2026 · 16:00 (Hora Bolivia)</span>
                    </div>
                  </div>

                  {/* Right Column: Transmission & News Panel */}
                  <div className="lg:col-span-7 flex flex-col justify-between gap-3">
                    <div className="text-[9px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-zinc-400"></span>
                      ¿Dónde ver los partidos en Bolivia?
                    </div>
                    
                    {/* Broadcast Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                      
                      {/* Card 1: Unitel */}
                      <div className="bg-zinc-950/20 border border-zinc-850 hover:border-yellow-500/20 rounded-xl p-3 flex flex-col justify-between transition group">
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-black text-zinc-100 uppercase tracking-wider">UNITEL</span>
                            <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[7px] font-black tracking-widest uppercase">Gratis</span>
                          </div>
                          <p className="text-[8.5px] text-zinc-500 font-semibold leading-relaxed">
                            Señal abierta de TV pública. Transmite el partido inaugural, partidos clave, semifinales y la gran final.
                          </p>
                        </div>
                        <a 
                          href="https://www.unitel.bo" 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-[8px] font-black text-yellow-500 group-hover:text-yellow-400 flex items-center gap-1 mt-2 tracking-wider uppercase"
                        >
                          Ir a Unitel.bo <span>→</span>
                        </a>
                      </div>

                      {/* Card 2: Tigo Sports */}
                      <div className="bg-zinc-950/20 border border-zinc-850 hover:border-yellow-500/20 rounded-xl p-3 flex flex-col justify-between transition group">
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-black text-zinc-100 uppercase tracking-wider">TIGO SPORTS</span>
                            <span className="px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400 text-[7px] font-black tracking-widest uppercase">Premium</span>
                          </div>
                          <p className="text-[8.5px] text-zinc-500 font-semibold leading-relaxed">
                            Televisión de pago / cable. Cobertura completa de los 64 partidos en vivo, análisis tácticos y alta definición.
                          </p>
                        </div>
                        <a 
                          href="https://www.tigosports.com.bo" 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-[8px] font-black text-yellow-500 group-hover:text-yellow-400 flex items-center gap-1 mt-2 tracking-wider uppercase"
                        >
                          Sitio Web <span>→</span>
                        </a>
                      </div>

                      {/* Card 3: Online / Streams */}
                      <div className="bg-zinc-950/20 border border-zinc-850 hover:border-yellow-500/20 rounded-xl p-3 flex flex-col justify-between transition group">
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-black text-zinc-100 uppercase tracking-wider">EN LÍNEA</span>
                            <span className="px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 text-[7px] font-black tracking-widest uppercase">Streaming</span>
                          </div>
                          <p className="text-[8.5px] text-zinc-500 font-semibold leading-relaxed">
                            FIFA+ para transmisiones móviles gratuitas, Unitel App y Tigo Sports App para celulares y tabletas.
                          </p>
                        </div>
                        <a 
                          href="https://plus.fifa.com" 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-[8px] font-black text-yellow-500 group-hover:text-yellow-400 flex items-center gap-1 mt-2 tracking-wider uppercase"
                        >
                          Abrir FIFA+ <span>→</span>
                        </a>
                      </div>
                      
                    </div>
                  </div>

                </div>
              </div>

              {/* Header Bar — Filtros y Vistas */}
              <div className="flex justify-between items-center gap-4 border-b border-zinc-900 pb-2">
                <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Filtrar Partidos</div>
                <button
                  onClick={() => setCompactView(!compactView)}
                  className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition border ${
                    compactView 
                      ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40 shadow-[0_0_12px_rgba(234,179,8,0.1)]' 
                      : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-yellow-500/30 hover:text-zinc-300'
                  }`}
                >
                  {compactView ? '📱 Vista Normal' : '🔍 Vista Compacta'}
                </button>
              </div>

              {/* Filtros pill — Fases */}
              <div className="space-y-3">
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                  {[
                    { v: 'ALL', l: 'Todos' },
                    { v: 'Fase de Grupos', l: 'Grupos' },
                    { v: 'Ronda de 32', l: 'R32' },
                    { v: 'Octavos de Final', l: 'Octavos' },
                    { v: 'Cuartos de Final', l: 'Cuartos' },
                    { v: 'Semifinal', l: 'Semis' },
                    { v: 'Tercer Puesto', l: '3er Puesto' },
                    { v: 'Final', l: 'Final' },
                  ].map(({ v, l }) => (
                    <button
                      key={v}
                      onClick={() => { setFilterFase(v); if (v !== 'Fase de Grupos') setGroupRemaining(false); }}
                      className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wide transition ${
                        filterFase === v ? 'bg-yellow-500 text-zinc-950' : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-yellow-500/40 hover:text-zinc-200'
                      }`}
                    >{l}</button>
                  ))}
                </div>

                {/* Filtros pill — Grupos (solo visibles en Fase de Grupos o Todos) */}
                {(filterFase === 'ALL' || filterFase === 'Fase de Grupos') && (
                  <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                    {['ALL', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'].map(g => (
                      <button
                        key={g}
                        onClick={() => { setFilterGrupo(g); if (g !== 'ALL') setGroupRemaining(false); }}
                        disabled={groupRemaining}
                        className={`flex-shrink-0 px-2.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wide transition disabled:opacity-40 ${
                          filterGrupo === g ? 'bg-yellow-500 text-zinc-950' : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-yellow-500/40 hover:text-zinc-200'
                        }`}
                      >{g === 'ALL' ? 'Grp' : g}</button>
                    ))}
                    <button
                      onClick={() => { const v = !groupRemaining; setGroupRemaining(v); if (v) { setFilterFase('Fase de Grupos'); setFilterGrupo('ALL'); } }}
                      className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wide transition border ${
                        groupRemaining ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40' : 'bg-zinc-900 text-zinc-555 border-zinc-800 hover:border-yellow-500/30'
                      }`}
                    >📂 Agrupar</button>
                  </div>
                )}
              </div>
              {/* Cards de partidos */}
              {!groupRemaining && (
                <div className={compactView ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3" : "grid grid-cols-1 md:grid-cols-2 gap-4"}>
                  {matches
                    .filter((m) => filterGrupo === 'ALL' || m.grupo === filterGrupo)
                    .filter((m) => filterFase === 'ALL' || m.fase === filterFase)
                    .map((m) => {
                      const myPred = predictions.find((p) => p.match_id === m.id);
                      const isClosed = m.estado !== 'upcoming' || new Date() >= new Date(m.fecha);
                      if (compactView) {
                        return (
                          <div 
                            key={m.id}
                            onClick={() => {
                              setSummaryModalMatch(m);
                              fetchCommunityBets(m.id);
                            }}
                            className={`bg-zinc-900/50 hover:bg-zinc-900 border ${m.estado === 'live' ? 'border-red-500/40 bg-red-950/5 shadow-[0_0_15px_rgba(239,68,68,0.08)]' : 'border-zinc-850 hover:border-zinc-700/60'} rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 transition cursor-pointer relative`}
                          >
                            {/* Left: Info badge + Time */}
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded font-mono flex-shrink-0 ${m.estado === 'live' ? 'bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse' : 'bg-zinc-800/80 text-zinc-400'}`}>
                                {m.estado === 'live' ? 'VIVO' : `G${m.grupo}`}
                              </span>
                              <div className="flex flex-col min-w-0">
                                <span className="text-[10px] font-bold text-zinc-355 truncate">{m.fase}</span>
                                <span className="text-[9px] text-zinc-500 font-mono truncate">
                                  {m.estado === 'upcoming' ? new Date(m.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : m.estado === 'live' ? 'Jugándose' : 'Finalizado'}
                                </span>
                              </div>
                            </div>

                            {/* Middle: Teams and Score */}
                            <div className="flex items-center justify-center gap-2 flex-grow-[2] w-[45%] text-xs font-bold text-zinc-200">
                              <div className="flex items-center gap-1.5 w-[42%] justify-end min-w-0">
                                <span className="truncate uppercase text-xs font-black text-zinc-100 text-right">{m.local}</span>
                                <span className="text-base select-none flex-shrink-0">{getTeamFlag(m.local)}</span>
                              </div>
                              
                              <div className="px-2 py-0.5 bg-zinc-950/95 border border-zinc-850 rounded font-mono text-[11px] font-black text-center min-w-[38px] flex-shrink-0">
                                {m.estado !== 'upcoming' ? `${m.goles_local}-${m.goles_visitante}` : 'VS'}
                              </div>

                              <div className="flex items-center gap-1.5 w-[42%] justify-start min-w-0">
                                <span className="text-base select-none flex-shrink-0">{getTeamFlag(m.visitante)}</span>
                                <span className="truncate uppercase text-xs font-black text-zinc-100 text-left">{m.visitante}</span>
                              </div>
                            </div>

                            {/* Right: User bet / Button */}
                            <div className="flex items-center justify-end gap-2 text-right min-w-0 flex-1" onClick={(e) => e.stopPropagation()}>
                              {myPred ? (
                                <div className="flex flex-col items-end">
                                  <span className="text-[9px] text-zinc-500 font-medium">Mi apuesta</span>
                                  <span className="font-bold text-zinc-200 text-xs font-mono">{myPred.pred_local} - {myPred.pred_visitante}</span>
                                </div>
                              ) : isClosed ? (
                                <span className="text-[9px] text-zinc-500 italic">Sin apuesta</span>
                              ) : (
                                <button
                                  onClick={() => openBetModalForMatch(m)}
                                  className="btn-primary-stitch px-2.5 py-1 text-[9px] tracking-wider uppercase"
                                >
                                  Apostar
                                </button>
                              )}

                              {isClosed && myPred && myPred.puntos !== null && (
                                <span className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-1 py-0.5 rounded text-[8px] font-black font-mono flex-shrink-0">
                                  +{myPred.puntos}P
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div 
                          key={m.id} 
                          className={`match-card-stitch p-5 shadow-lg flex flex-col justify-between gap-4 cursor-pointer relative ${
                            m.estado === 'live' 
                              ? 'match-card-live-stitch shadow-[0_0_18px_rgba(239,68,68,0.15)]' 
                              : ''
                          }`}
                          onClick={() => {
                            setSummaryModalMatch(m);
                            fetchCommunityBets(m.id);
                          }}
                        >
                          {/* Top Header Card */}
                          <div className="flex justify-between items-center border-b border-zinc-800/40 pb-3 text-[11px] font-bold tracking-wider text-zinc-400" onClick={(e) => e.stopPropagation()}>
                            <span>{m.fase.toUpperCase()} - GRP {m.grupo}</span>
                            
                            {m.estado === 'live' && (
                              <span className="text-red-500 font-extrabold flex items-center gap-1 text-[10px]">
                                <span className="h-1.5 w-1.5 rounded-full bg-red-500 live-dot"></span> EN VIVO
                              </span>
                            )}

                            {m.estado === 'finished' && (
                              <span className="text-zinc-500 font-semibold uppercase text-[10px]">FINALIZADO</span>
                            )}

                            {m.estado === 'upcoming' && (
                              <span className="text-zinc-550 font-semibold text-[10px]">
                                {new Date(m.fecha).toLocaleDateString('es-ES', {
                                  day: '2-digit',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            )}
                          </div>

                          {/* Scores and Country Details */}
                          <div className="flex justify-between items-center py-2 px-1">
                            {/* Local Team */}
                            <div className="flex items-center gap-3 w-[40%]">
                              <div className="w-9 h-9 rounded-full bg-zinc-950/80 border border-zinc-800 flex items-center justify-center text-xl shadow-inner select-none flex-shrink-0">
                                {getTeamFlag(m.local)}
                              </div>
                              <span className="font-extrabold text-xs text-zinc-200 uppercase truncate">{m.local}</span>
                            </div>

                            {/* Scores displays */}
                            <div className="flex items-center justify-center bg-zinc-950/70 border border-zinc-800 rounded-lg px-3 py-1.5 font-mono font-black text-lg gap-2 min-w-[70px] shadow-inner select-none">
                              {m.estado !== 'upcoming' ? (
                                <>
                                  <span className={m.estado === 'live' ? 'text-red-500 animate-pulse' : 'text-zinc-200'}>{m.goles_local}</span>
                                  <span className="text-zinc-700 font-mono">:</span>
                                  <span className={m.estado === 'live' ? 'text-red-500 animate-pulse' : 'text-zinc-200'}>{m.goles_visitante}</span>
                                </>
                              ) : (
                                <span className="text-zinc-650 text-[10px] tracking-widest uppercase font-mono font-bold">VS</span>
                              )}
                            </div>

                            {/* Visitante Team */}
                            <div className="flex items-center justify-end gap-3 w-[40%] text-right">
                              <span className="font-extrabold text-xs text-zinc-200 uppercase truncate">{m.visitante}</span>
                              <div className="w-9 h-9 rounded-full bg-zinc-950/80 border border-zinc-800 flex items-center justify-center text-xl shadow-inner select-none flex-shrink-0">
                                {getTeamFlag(m.visitante)}
                              </div>
                            </div>
                          </div>

                          {/* User's Prediction Footer Card */}
                          <div className="bg-zinc-950/40 rounded-xl border border-zinc-800/40 p-3 mt-1 flex justify-between items-center text-xs" onClick={(e) => e.stopPropagation()}>
                            <div>
                              <span className="text-zinc-500">Mi apuesta: </span>
                              {myPred ? (
                                <span className="font-bold text-zinc-200 font-mono">
                                  {myPred.pred_local} - {myPred.pred_visitante}
                                </span>
                              ) : (
                                <span className="text-zinc-650 italic">Sin pronóstico</span>
                              )}
                            </div>

                            {/* Bet Action Trigger button */}
                            {isClosed ? (
                              <div className="flex items-center gap-1.5">
                                {myPred && myPred.puntos !== null && (
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                                    myPred.puntos === 3 ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                                    myPred.puntos === 1 ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                    'bg-zinc-800 text-zinc-400'
                                  }`}>
                                    +{myPred.puntos} PTS
                                  </span>
                                )}
                                <span className="text-zinc-600 text-[10px] uppercase font-bold flex items-center gap-1">
                                  <Lock className="w-3 h-3" /> Cerrado
                                </span>
                              </div>
                            ) : myPred ? (
                              <span className="text-emerald-500 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-lg">
                                <Check className="w-3.5 h-3.5" /> Confirmado
                              </span>
                            ) : (
                              <button
                                onClick={() => openBetModalForMatch(m)}
                                className="btn-primary-stitch px-3 py-1.5 text-[10px] tracking-wider uppercase z-10"
                              >
                                Pronosticar
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  {matches.length === 0 && (
                    <div className="py-20 text-center text-zinc-500 col-span-2">
                      <p>Cargando lista de partidos...</p>
                    </div>
                  )}
                </div>
              )}

              {groupRemaining && (
                <div className="space-y-8">
                  {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']
                    .filter((grp) => {
                      const grpMatches = matches.filter(
                        (m) => m.grupo === grp && m.estado === 'upcoming'
                      );
                      return grpMatches.length > 0;
                    })
                    .map((grp) => {
                      const grpMatches = matches.filter(
                        (m) => m.grupo === grp && m.estado === 'upcoming'
                      );
                      return (
                        <div key={grp} className="space-y-4">
                          <div className="flex items-center gap-2 border-b border-zinc-850 pb-2">
                            <span className="text-yellow-500 font-extrabold text-[11px] font-mono bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded">
                              GRUPO {grp}
                            </span>
                            <span className="text-zinc-500 text-[10px] uppercase font-black tracking-wider">
                              ({grpMatches.length} partidos por jugar)
                            </span>
                          </div>

                          <div className={compactView ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3" : "grid grid-cols-1 md:grid-cols-2 gap-4"}>
                            {grpMatches.map((m) => {
                              const myPred = predictions.find((p) => p.match_id === m.id);
                              const isClosed = m.estado !== 'upcoming' || new Date() >= new Date(m.fecha);
                              
                              if (compactView) {
                                return (
                                  <div 
                                    key={m.id}
                                    onClick={() => {
                                      setSummaryModalMatch(m);
                                      fetchCommunityBets(m.id);
                                    }}
                                    className={`bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-850 hover:border-zinc-700/60 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 transition cursor-pointer relative`}
                                  >
                                    {/* Left: Info badge + Time */}
                                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                      <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded font-mono flex-shrink-0 bg-zinc-800/80 text-zinc-400`}>
                                        G{m.grupo}
                                      </span>
                                      <div className="flex flex-col min-w-0">
                                        <span className="text-[10px] font-bold text-zinc-355 truncate">{m.fase}</span>
                                        <span className="text-[9px] text-zinc-500 font-mono truncate">
                                          {new Date(m.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Middle: Teams and Score */}
                                    <div className="flex items-center justify-center gap-2 flex-grow-[2] w-[45%] text-xs font-bold text-zinc-200">
                                      <div className="flex items-center gap-1.5 w-[42%] justify-end min-w-0">
                                        <span className="truncate uppercase text-xs font-black text-zinc-100 text-right">{m.local}</span>
                                        <span className="text-base select-none flex-shrink-0">{getTeamFlag(m.local)}</span>
                                      </div>
                                      
                                      <div className="px-2 py-0.5 bg-zinc-950/95 border border-zinc-850 rounded font-mono text-[11px] font-black text-center min-w-[38px] flex-shrink-0">
                                        VS
                                      </div>

                                      <div className="flex items-center gap-1.5 w-[42%] justify-start min-w-0">
                                        <span className="text-base select-none flex-shrink-0">{getTeamFlag(m.visitante)}</span>
                                        <span className="truncate uppercase text-xs font-black text-zinc-100 text-left">{m.visitante}</span>
                                      </div>
                                    </div>

                                    {/* Right: User bet / Button */}
                                    <div className="flex items-center justify-end gap-2 text-right min-w-0 flex-1" onClick={(e) => e.stopPropagation()}>
                                      {myPred ? (
                                        <div className="flex flex-col items-end">
                                          <span className="text-[9px] text-zinc-500 font-medium">Mi apuesta</span>
                                          <span className="font-bold text-zinc-200 text-xs font-mono">{myPred.pred_local} - {myPred.pred_visitante}</span>
                                        </div>
                                      ) : isClosed ? (
                                        <span className="text-[9px] text-zinc-550 italic">Sin apuesta</span>
                                      ) : (
                                        <button
                                          onClick={() => openBetModalForMatch(m)}
                                          className="btn-primary-stitch px-2.5 py-1 text-[9px] tracking-wider uppercase"
                                        >
                                          Apostar
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              }

                              return (
                                <div 
                                  key={m.id} 
                                  className="match-card-stitch p-5 shadow-lg flex flex-col justify-between gap-4 cursor-pointer relative"
                                  onClick={() => {
                                    setSummaryModalMatch(m);
                                    fetchCommunityBets(m.id);
                                  }}
                                >
                                  {/* Top Header Card */}
                                  <div className="flex justify-between items-center border-b border-zinc-800/40 pb-3 text-[11px] font-bold tracking-wider text-zinc-400" onClick={(e) => e.stopPropagation()}>
                                    <span>{m.fase.toUpperCase()} - GRP {m.grupo}</span>
                                    <span className="text-zinc-550 font-semibold text-[10px]">
                                      {new Date(m.fecha).toLocaleDateString('es-ES', {
                                        day: '2-digit',
                                        month: 'short',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </span>
                                  </div>

                                  {/* Scores and Country Details */}
                                  <div className="flex justify-between items-center py-2 px-1">
                                    <div className="flex items-center gap-3 w-[40%]">
                                      <div className="w-9 h-9 rounded-full bg-zinc-950/80 border border-zinc-800 flex items-center justify-center text-xl shadow-inner select-none flex-shrink-0">
                                        {getTeamFlag(m.local)}
                                      </div>
                                      <span className="font-extrabold text-xs text-zinc-200 uppercase truncate">{m.local}</span>
                                    </div>
                                    <div className="flex items-center justify-center bg-zinc-950/70 border border-zinc-800 rounded-lg px-3 py-1.5 font-mono font-black text-lg gap-2 min-w-[70px] shadow-inner select-none">
                                      <span className="text-zinc-650 text-[10px] tracking-widest uppercase font-mono font-bold">VS</span>
                                    </div>
                                    <div className="flex items-center justify-end gap-3 w-[40%] text-right">
                                      <span className="font-extrabold text-xs text-zinc-200 uppercase truncate">{m.visitante}</span>
                                      <div className="w-9 h-9 rounded-full bg-zinc-950/80 border border-zinc-800 flex items-center justify-center text-xl shadow-inner select-none flex-shrink-0">
                                        {getTeamFlag(m.visitante)}
                                      </div>
                                    </div>
                                  </div>

                                  {/* User's Prediction Footer Card */}
                                  <div className="bg-zinc-950/40 rounded-xl border border-zinc-800/40 p-3 mt-1 flex justify-between items-center text-xs" onClick={(e) => e.stopPropagation()}>
                                    <div>
                                      <span className="text-zinc-500">Mi apuesta: </span>
                                      {myPred ? (
                                        <span className="font-bold text-zinc-200 font-mono">
                                          {myPred.pred_local} - {myPred.pred_visitante}
                                        </span>
                                      ) : (
                                        <span className="text-zinc-650 italic">Sin pronóstico</span>
                                      )}
                                    </div>

                                    {isClosed ? (
                                      <span className="text-zinc-650 text-[10px] uppercase font-bold flex items-center gap-1">
                                        <Lock className="w-3 h-3" /> Cerrado
                                      </span>
                                    ) : myPred ? (
                                      <span className="text-emerald-500 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-lg">
                                        <Check className="w-3.5 h-3.5" /> Confirmado
                                      </span>
                                    ) : (
                                      <button
                                        onClick={() => openBetModalForMatch(m)}
                                        className="btn-primary-stitch px-3 py-1.5 text-[10px] tracking-wider uppercase z-10"
                                      >
                                        Pronosticar
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}


            </section>
          )}

          {/* --- VIEW: REGLAS DEL JUEGO --- */}
          {activeTab === 'reglas' && (
            <section className="space-y-6 max-w-3xl mx-auto">

              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-yellow-500" />
                <h2 className="text-lg font-black tracking-wider text-zinc-100 uppercase">Reglas del Juego</h2>
              </div>

              {/* Organizers card */}
              <div className="glass-card border border-zinc-800/80 rounded-2xl p-5 space-y-2">
                <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-800 pb-2">Organizadores</h3>
                <div className="flex flex-wrap gap-3 pt-1">
                  {['Marco Pabon', 'Wilber Calle', 'Daniel Landivar'].map((name) => (
                    <span key={name} className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs font-bold px-3 py-1.5 rounded-lg">
                      {name}
                    </span>
                  ))}
                </div>
                <p className="text-zinc-500 text-xs leading-relaxed pt-1">
                  Quiniela abierta a compañeros, familiares y amigos. Convocatoria oficial: 18 mayo 2026.
                </p>
              </div>

              {/* Points system */}
              <div className="glass-card border border-zinc-800/80 rounded-2xl p-5 space-y-4">
                <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-800 pb-2">Sistema de Puntuación</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                    <div>
                      <div className="text-green-400 font-black text-sm">Resultado Exacto</div>
                      <div className="text-zinc-400 text-xs mt-0.5">Ej: predices 2-1 y el partido termina 2-1</div>
                    </div>
                    <div className="text-green-400 font-black text-3xl font-mono">3 PTS</div>
                  </div>

                  <div className="flex items-center justify-between bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                    <div>
                      <div className="text-blue-400 font-black text-sm">Aciertas Ganador o Empate</div>
                      <div className="text-zinc-400 text-xs mt-0.5">Ej: predices victoria local y el equipo local gana por cualquier marcador</div>
                    </div>
                    <div className="text-blue-400 font-black text-3xl font-mono">1 PTO</div>
                  </div>

                  <div className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <div>
                      <div className="text-zinc-400 font-black text-sm">Fallo Total</div>
                      <div className="text-zinc-500 text-xs mt-0.5">El resultado va en contra de tu predicción</div>
                    </div>
                    <div className="text-zinc-500 font-black text-3xl font-mono">0 PTS</div>
                  </div>
                </div>
              </div>

              {/* Rules */}
              <div className="glass-card border border-zinc-800/80 rounded-2xl p-5 space-y-3">
                <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-800 pb-2">Reglas Generales</h3>
                <ul className="space-y-3 text-sm">
                  {[
                    { icon: '🔒', text: 'Las apuestas se cierran automáticamente al inicio de cada partido (kickoff lock). No se pueden modificar una vez iniciado el partido.' },
                    { icon: '🏆', text: 'Todos los partidos son apostables: Fase de Grupos, Ronda de 32, Octavos, Cuartos, Semifinales, Tercer Puesto y Gran Final.' },
                    { icon: '📊', text: 'La clasificación general es visible para todos los participantes en tiempo real.' },
                    { icon: '🔄', text: 'Los marcadores se actualizan automáticamente desde la API de football-data.org. La clasificación se recalcula al finalizar cada partido.' },
                    { icon: '⚽', text: 'En caso de empate en puntos, se desempata por cantidad de resultados exactos (3 puntos). Si persiste el empate, gana quien se registró primero.' },
                    { icon: '📱', text: 'Puedes realizar y modificar tus pronósticos desde cualquier dispositivo antes del kickoff.' },
                  ].map((r, i) => (
                    <li key={i} className="flex items-start gap-3 text-zinc-300">
                      <span className="text-lg flex-shrink-0">{r.icon}</span>
                      <span className="text-xs leading-relaxed text-zinc-400">{r.text}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Tournament info */}
              <div className="glass-card border border-zinc-800/80 rounded-2xl p-5 space-y-3">
                <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-800 pb-2">Datos del Torneo</h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {[
                    { label: 'Inicio', value: '11 Junio 2026' },
                    { label: 'Final', value: '19 Julio 2026' },
                    { label: 'Equipos', value: '48 selecciones' },
                    { label: 'Grupos', value: '12 grupos (A-L)' },
                    { label: 'Partidos', value: '104 en total' },
                    { label: 'Sede Final', value: 'MetLife Stadium, NJ' },
                  ].map((d) => (
                    <div key={d.label} className="bg-zinc-950/60 border border-zinc-850 rounded-xl p-3">
                      <div className="text-zinc-500 text-[10px] uppercase tracking-widest">{d.label}</div>
                      <div className="text-zinc-200 font-bold mt-0.5">{d.value}</div>
                    </div>
                  ))}
                </div>
              </div>

            </section>
          )}

          {/* --- VIEW 2: LEADERBOARD RANKINGS --- */}
          {activeTab === 'ranking' && (
            <section className="space-y-6">
              
              {/* Top Leaderboard Title */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  <h2 className="text-lg font-black tracking-wider text-zinc-100 uppercase">Clasificación General</h2>
                </div>
                <span className="bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs px-2.5 py-1 rounded-lg font-mono">
                  {leaderboard.length} Jugadores
                </span>
              </div>

              {/* Pozo Acumulado */}
              {leaderboard.length > 0 && (
                <div className="bg-gradient-to-r from-yellow-500/10 to-amber-600/5 border border-yellow-500/25 rounded-2xl p-4 flex items-center justify-between shadow-[0_0_20px_rgba(255,209,101,0.05)]">
                  <div>
                    <div className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Pozo Acumulado</div>
                    <div className="text-2xl font-black text-yellow-500 font-mono mt-0.5">
                      Bs. {(leaderboard.length * 150).toLocaleString('es-BO')}
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">{leaderboard.length} participantes × Bs. 150</div>
                  </div>
                  <div className="text-4xl">🏆</div>
                </div>
              )}

              {/* Medals Podium Pods */}
              <div className="grid grid-cols-3 gap-4 pt-2 max-w-xl mx-auto">
                {/* 2nd place */}
                {leaderboard[1] && (
                  <div className="glass-card rounded-xl p-4 text-center flex flex-col items-center justify-between order-1 shadow-md">
                    <div className="text-3xl">🥈</div>
                    <div className="text-xs font-bold text-zinc-300 truncate w-full mt-2">{leaderboard[1].nombre}</div>
                    <div className="text-amber-500 font-extrabold text-base font-mono mt-1">{leaderboard[1].puntos_totales} pts</div>
                    <div className="text-[10px] text-zinc-500 font-mono mt-0.5">{leaderboard[1].exactos} exactos</div>
                  </div>
                )}

                {/* 1st place */}
                {leaderboard[0] && (
                  <div className="glass-card border-2 border-yellow-500/50 rounded-xl p-5 text-center flex flex-col items-center justify-between order-2 relative shadow-[0_0_24px_rgba(255,209,101,0.2)] scale-105">
                    <span className="absolute top-[-10px] bg-yellow-500 text-zinc-950 text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow">
                      Líder
                    </span>
                    <div className="text-4xl animate-bounce">🥇</div>
                    <div className="text-sm font-black text-zinc-100 truncate w-full mt-2">{leaderboard[0].nombre}</div>
                    <div className="text-yellow-500 font-black text-lg font-mono mt-1">{leaderboard[0].puntos_totales} pts</div>
                    <div className="text-[10px] text-zinc-400 font-mono mt-0.5">{leaderboard[0].exactos} exactos</div>
                  </div>
                )}

                {/* 3rd place */}
                {leaderboard[2] && (
                  <div className="glass-card rounded-xl p-4 text-center flex flex-col items-center justify-between order-3 shadow-md">
                    <div className="text-3xl">🥉</div>
                    <div className="text-xs font-bold text-zinc-300 truncate w-full mt-2">{leaderboard[2].nombre}</div>
                    <div className="text-amber-700 font-extrabold text-base font-mono mt-1">{leaderboard[2].puntos_totales} pts</div>
                    <div className="text-[10px] text-zinc-500 font-mono mt-0.5">{leaderboard[2].exactos} exactos</div>
                  </div>
                )}
              </div>

              {/* Ranking list table */}
              <div className="glass-card border border-zinc-800/40 rounded-xl overflow-hidden mt-6 max-w-3xl mx-auto shadow-2xl">
                <div className="divide-y divide-zinc-900 text-sm">
                  {leaderboard.map((row, index) => {
                    const isMe = row.user_id === user.id;

                    return (
                      <div 
                        key={row.user_id} 
                        className={`flex items-center justify-between p-5 transition ${
                          isMe ? 'bg-yellow-500/5 border-l-4 border-yellow-500 font-bold' : 'hover:bg-zinc-900/20'
                        }`}
                      >
                        {/* Left Block Position & Name */}
                        <div className="flex items-center gap-4">
                          <span className="font-bold text-zinc-400 w-6 font-mono text-center">#{index + 1}</span>
                          <div className="flex items-center gap-3">
                            <img src={row.avatar} className="w-10 h-10 rounded-full border border-zinc-800 bg-zinc-950 shadow" alt="avatar" />
                            <div>
                              <div className="text-zinc-200 text-sm flex items-center gap-2">
                                <span>{row.nombre}</span>
                                {isMe && <span className="bg-yellow-500 text-zinc-950 font-black text-[9px] px-1 rounded uppercase">Yo</span>}
                              </div>
                              <div className="text-[10px] text-zinc-500 tracking-wider uppercase font-mono">{row.tipo}</div>
                            </div>
                          </div>
                        </div>

                        {/* Right Block Points and Trends */}
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <div className="font-extrabold text-sm text-zinc-100 font-mono">{row.puntos_totales} pts</div>
                            <div className="text-[10px] text-zinc-500 font-mono">{row.exactos} exactos</div>
                          </div>

                          {/* Trend arrows */}
                          <div className="w-12 flex justify-center">
                            {row.tendencia === 'up' && (
                              <span className="flex items-center gap-0.5 text-green-500 text-xs font-black">
                                <ArrowUp className="w-3.5 h-3.5" /> ▲
                              </span>
                            )}
                            {row.tendencia === 'down' && (
                              <span className="flex items-center gap-0.5 text-red-500 text-xs font-black animate-pulse">
                                <ArrowDown className="w-3.5 h-3.5" /> ▼
                              </span>
                            )}
                            {row.tendencia === 'same' && (
                              <span className="text-zinc-600 text-[10px]">
                                <Circle className="w-2.5 h-2.5" />
                              </span>
                            )}
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {/* --- VIEW 5: FIXTURE — EMBUDO DE ELIMINATORIAS --- */}
          {activeTab === 'fixture' && (
            <section className="space-y-1 select-none pb-4">

              {/* Header */}
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500 animate-pulse" />
                  <h2 className="text-lg font-black tracking-wider text-zinc-100 uppercase">Bracket Eliminatorias</h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCompactView(!compactView)}
                    className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition border ${
                      compactView 
                        ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40 shadow-[0_0_12px_rgba(234,179,8,0.1)]' 
                        : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-yellow-500/30 hover:text-zinc-300'
                    }`}
                  >
                    {compactView ? '📱 Vista Normal' : '🔍 Vista Compacta'}
                  </button>
                  <span className="text-[10px] bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-2.5 py-1 rounded-lg uppercase tracking-wider font-mono font-bold">
                    FIFA 2026
                  </span>
                </div>
              </div>

              {/* FUNNEL — cada etapa más estrecha */}
              {([
                { fase: 'Ronda de 32',     label: 'RONDA DE 32',     cols: 4, border: 'border-zinc-700/60',        badge: 'text-zinc-500', pct: '100%' },
                { fase: 'Octavos de Final',label: 'OCTAVOS DE FINAL',cols: 4, border: 'border-zinc-600/60',        badge: 'text-zinc-400', pct: '88%'  },
                { fase: 'Cuartos de Final',label: 'CUARTOS DE FINAL',cols: 2, border: 'border-amber-600/40',       badge: 'text-amber-400', pct: '68%'  },
                { fase: 'Semifinal',       label: 'SEMIFINAL',       cols: 2, border: 'border-orange-500/50',      badge: 'text-orange-400', pct: '50%'  },
              ] as const).map(({ fase, label, cols, border, badge, pct }) => {
                const faseMatches = matches.filter(m => m.fase === fase);
                if (faseMatches.length === 0) return null;
                return (
                  <div key={fase} className="flex flex-col items-center gap-0">
                    {/* Stage label pill */}
                    <div className={`text-[9px] font-black uppercase tracking-widest ${badge} bg-zinc-950 border border-zinc-800 px-3 py-1 rounded-full mb-2 z-10`}>
                      {label} · {faseMatches.length} partidos
                    </div>
                    {/* Match grid — width narrows to simulate funnel */}
                    <div className="w-full transition-all duration-300" style={{ maxWidth: pct === '100%' ? '100%' : pct }}>
                      <div className={`grid ${compactView ? 'gap-1.5' : 'gap-2'}`} style={{ gridTemplateColumns: `repeat(${cols > 2 ? 2 : cols}, 1fr)` }}>
                        {/* On md+ screens show all cols */}
                        {faseMatches.map((m) => (
                          <div
                            key={m.id}
                            onClick={() => { setSummaryModalMatch(m); fetchCommunityBets(m.id); }}
                            className={`bg-zinc-900 border ${border} ${compactView ? 'p-1.5 rounded-lg' : 'p-2.5 rounded-xl'} cursor-pointer hover:bg-zinc-800/80 transition group`}
                          >
                            {/* Team 1 */}
                            <div className="flex items-center justify-between gap-1 text-[11px]">
                              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                {!compactView && <span className="text-base flex-shrink-0">{getTeamFlag(m.local)}</span>}
                                <div className="flex flex-col min-w-0">
                                  <span className={`font-black text-zinc-100 truncate uppercase ${compactView ? 'text-[10px]' : 'text-[11px]'}`}>{m.local}</span>
                                  {formatPlaceholderText(m.local) && (
                                    <span className="text-[7.5px] text-zinc-500 font-bold truncate">
                                      ({formatPlaceholderText(m.local)})
                                    </span>
                                  )}
                                </div>
                              </div>
                              <span className={`font-black font-mono flex-shrink-0 ${compactView ? 'text-[10px]' : 'text-[11px]'} ${m.estado === 'live' ? 'text-red-400 animate-pulse' : m.estado === 'finished' ? 'text-zinc-200' : 'text-zinc-600'}`}>
                                {m.estado !== 'upcoming' ? m.goles_local : '-'}
                              </span>
                            </div>
                            {/* Team 2 */}
                            <div className={`flex items-center justify-between gap-1 text-[11px] ${compactView ? 'mt-0.5 pt-0.5 border-t border-zinc-850' : 'mt-1.5 pt-1.5 border-t border-zinc-800/60'}`}>
                              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                {!compactView && <span className="text-base flex-shrink-0">{getTeamFlag(m.visitante)}</span>}
                                <div className="flex flex-col min-w-0">
                                  <span className={`font-black text-zinc-100 truncate uppercase ${compactView ? 'text-[10px]' : 'text-[11px]'}`}>{m.visitante}</span>
                                  {formatPlaceholderText(m.visitante) && (
                                    <span className="text-[7.5px] text-zinc-500 font-bold truncate">
                                      ({formatPlaceholderText(m.visitante)})
                                    </span>
                                  )}
                                </div>
                              </div>
                              <span className={`font-black font-mono flex-shrink-0 ${compactView ? 'text-[10px]' : 'text-[11px]'} ${m.estado === 'live' ? 'text-red-400 animate-pulse' : m.estado === 'finished' ? 'text-zinc-200' : 'text-zinc-600'}`}>
                                {m.estado !== 'upcoming' ? m.goles_visitante : '-'}
                              </span>
                            </div>
                            {/* Date + Venue Footer (Always visible for maximum details) */}
                            <div className="flex justify-between items-center mt-1.5 pt-1 border-t border-zinc-800/40">
                              <span className="text-[8px] text-zinc-500 font-semibold truncate max-w-[65%]">
                                📍 {m.estadio || 'Por definir'}
                              </span>
                              <span className="text-[8px] text-zinc-500 font-mono flex-shrink-0">
                                {new Date(m.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Funnel connector arrow */}
                    <div className="flex flex-col items-center py-1 text-zinc-700">
                      <div className="w-px h-3 bg-zinc-700"></div>
                      <div className="text-zinc-600 text-xs">▼</div>
                    </div>
                  </div>
                );
              })}

              {/* Bottom: 3er Puesto + Gran Final */}
              <div className="flex flex-col items-center gap-1">
                <div className="text-[9px] font-black uppercase tracking-widest text-zinc-500 bg-zinc-950 border border-zinc-800 px-3 py-1 rounded-full mb-2">FINAL</div>
                <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3" style={{ maxWidth: '42%' }}>

                  {/* Tercer Puesto */}
                  {matches.filter(m => m.fase === 'Tercer Puesto').map(m => (
                    <div
                      key={m.id}
                      onClick={() => { setSummaryModalMatch(m); fetchCommunityBets(m.id); }}
                      className="bg-zinc-900 border border-zinc-700/50 rounded-xl p-3 cursor-pointer hover:bg-zinc-800/80 transition"
                    >
                      <div className="text-[8px] text-zinc-500 font-black uppercase tracking-widest mb-2 text-center">🥉 Tercer Puesto · 18 Jul</div>
                      <div className="flex items-center justify-between gap-1 text-[11px]">
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                          <span className="text-base">{getTeamFlag(m.local)}</span>
                          <div className="flex flex-col min-w-0">
                            <span className="font-black text-zinc-100 truncate uppercase text-[10px]">{m.local}</span>
                            {formatPlaceholderText(m.local) && (
                              <span className="text-[7.5px] text-zinc-500 font-bold truncate">
                                ({formatPlaceholderText(m.local)})
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="font-black font-mono text-zinc-500 mx-2">{m.estado !== 'upcoming' ? `${m.goles_local}-${m.goles_visitante}` : 'VS'}</span>
                        <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                          <div className="flex flex-col min-w-0 items-end">
                            <span className="font-black text-zinc-100 truncate uppercase text-[10px] text-right">{m.visitante}</span>
                            {formatPlaceholderText(m.visitante) && (
                              <span className="text-[7.5px] text-zinc-500 font-bold truncate">
                                ({formatPlaceholderText(m.visitante)})
                              </span>
                            )}
                          </div>
                          <span className="text-base">{getTeamFlag(m.visitante)}</span>
                        </div>
                      </div>
                      {/* Venue Footer */}
                      <div className="flex justify-between items-center mt-2.5 pt-1.5 border-t border-zinc-800/40">
                        <span className="text-[8px] text-zinc-500 font-semibold truncate max-w-[65%]">
                          📍 {m.estadio || 'Sede por definir'}
                        </span>
                        <span className={`text-[8px] font-black uppercase ${m.estado === 'live' ? 'text-red-400' : 'text-zinc-500'}`}>
                          {m.estado === 'live' ? '● EN VIVO' : m.estado === 'finished' ? 'FINAL' : 'PRÓX'}
                        </span>
                      </div>
                    </div>
                  ))}

                  {/* Gran Final */}
                  {matches.filter(m => m.fase === 'Final').map(m => (
                    <div
                      key={m.id}
                      onClick={() => { setSummaryModalMatch(m); fetchCommunityBets(m.id); }}
                      className="bg-zinc-950 border-2 border-yellow-500 rounded-xl p-3 cursor-pointer hover:shadow-[0_0_20px_rgba(234,179,8,0.2)] transition relative"
                    >
                      <div className="text-[8px] text-yellow-500 font-black uppercase tracking-widest mb-2 text-center">🏆 GRAN FINAL · 19 Jul</div>
                      <div className="flex items-center justify-between gap-1 text-[11px]">
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                          <span className="text-base">{getTeamFlag(m.local)}</span>
                          <div className="flex flex-col min-w-0">
                            <span className="font-black text-zinc-100 truncate uppercase text-[10px]">{m.local}</span>
                            {formatPlaceholderText(m.local) && (
                              <span className="text-[7.5px] text-zinc-500 font-bold truncate">
                                ({formatPlaceholderText(m.local)})
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="font-black font-mono text-yellow-500 text-sm mx-2">{m.estado !== 'upcoming' ? `${m.goles_local}-${m.goles_visitante}` : 'VS'}</span>
                        <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                          <div className="flex flex-col min-w-0 items-end">
                            <span className="font-black text-zinc-100 truncate uppercase text-[10px] text-right">{m.visitante}</span>
                            {formatPlaceholderText(m.visitante) && (
                              <span className="text-[7.5px] text-zinc-500 font-bold truncate">
                                ({formatPlaceholderText(m.visitante)})
                              </span>
                            )}
                          </div>
                          <span className="text-base">{getTeamFlag(m.visitante)}</span>
                        </div>
                      </div>
                      {/* Venue Footer */}
                      <div className="flex justify-between items-center mt-2.5 pt-1.5 border-t border-zinc-800/40">
                        <span className="text-[8px] text-yellow-500/80 font-semibold truncate max-w-[65%]">
                          📍 {m.estadio || 'MetLife Stadium'}
                        </span>
                        <span className={`text-[8px] font-black uppercase ${m.estado === 'live' ? 'text-red-400 animate-pulse' : 'text-yellow-500'}`}>
                          {m.estado === 'live' ? '● EN VIVO' : m.estado === 'finished' ? 'FINAL' : 'PRÓX'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </section>
          )}

          {/* --- VIEW 3: PROFILE --- */}
          {activeTab === 'perfil' && (
            <section className="space-y-6 max-w-4xl mx-auto">
              {!user ? (
                /* Inline Login/Register Screen for Guests */
                <div className="w-full max-w-md mx-auto bg-zinc-900/55 backdrop-blur-md border border-zinc-800 rounded-3xl p-8 shadow-2xl relative z-10 animate-fade-in my-8">
                  {/* Logo Splash */}
                  <div className="flex flex-col items-center text-center mb-6">
                    <div className="h-16 w-16 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl flex items-center justify-center text-4xl mb-4 shadow-inner animate-pulse overflow-hidden p-1">
                      {appLogo.startsWith('/') || appLogo.startsWith('http') ? (
                        <img src={appLogo} className="h-full w-full object-contain rounded-xl" alt="logo" />
                      ) : (
                        <span>{appLogo}</span>
                      )}
                    </div>
                    <h1 className="text-2xl font-black tracking-wider text-zinc-100 uppercase">{appName}</h1>
                    <p className="text-zinc-400 text-xs tracking-widest uppercase mt-1">Plataforma de Apuestas y Quiniela</p>
                  </div>

                  {!isRegistering ? (
                    /* Login Form */
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div>
                        <label className="block text-zinc-400 text-[10px] font-black uppercase tracking-widest mb-1.5">Correo Electrónico</label>
                        <input 
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="ej: diego@mundial.com"
                          className="w-full input-stitch px-4 py-3 text-sm placeholder-zinc-700 focus:ring-2 focus:ring-yellow-500/10"
                        />
                      </div>

                      <div>
                        <label className="block text-zinc-400 text-[10px] font-black uppercase tracking-widest mb-1.5">Contraseña</label>
                        <input 
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Contraseña de acceso"
                          className="w-full input-stitch px-4 py-3 text-sm placeholder-zinc-700 focus:ring-2 focus:ring-yellow-500/10"
                        />
                      </div>

                      {loginError && (
                        <div className="flex items-center gap-2 bg-red-950/30 border border-red-800/40 text-red-400 text-xs p-3 rounded-lg">
                          <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                          <span>{loginError}</span>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={loginLoading}
                        className="w-full btn-primary-stitch py-3.5 text-sm transition tracking-wider uppercase"
                      >
                        {loginLoading ? 'Iniciando Sesión...' : 'Entrar a la Quiniela'}
                      </button>

                      {/* Passkey login button */}
                      <div className="relative flex items-center gap-2 my-1">
                        <div className="flex-1 h-px bg-zinc-800"></div>
                        <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold">o</span>
                        <div className="flex-1 h-px bg-zinc-800"></div>
                      </div>

                      <button
                        type="button"
                        onClick={handlePasskeyLogin}
                        disabled={passkeyLoading}
                        className="w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-600 text-zinc-300 py-3 text-sm font-bold rounded-xl transition flex items-center justify-center gap-2 active:scale-[0.99]"
                      >
                        <span className="text-lg">🔑</span>
                        <span>{passkeyLoading ? 'Verificando...' : 'Entrar con Llave FIDO / Passkey'}</span>
                      </button>

                      {passkeyError && (
                        <div className="flex items-center gap-2 bg-red-950/30 border border-red-800/40 text-red-400 text-xs p-3 rounded-lg">
                          <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                          <span>{passkeyError}</span>
                        </div>
                      )}

                      <div className="text-center pt-1">
                        <button
                          type="button"
                          onClick={() => { setIsRegistering(true); setLoginError(''); }}
                          className="text-yellow-500 hover:text-yellow-400 text-xs font-bold transition hover:underline"
                        >
                          ¿No tienes cuenta? Regístrate aquí
                        </button>
                      </div>
                    </form>
                  ) : (
                    /* Register Form */
                    <form onSubmit={handleRegister} className="space-y-4">
                      <div>
                        <label className="block text-zinc-400 text-[10px] font-black uppercase tracking-widest mb-1.5">Nombre Completo</label>
                        <input 
                          type="text"
                          required
                          value={registerNombre}
                          onChange={(e) => setRegisterNombre(e.target.value)}
                          placeholder="ej: Diego Armando"
                          className="w-full input-stitch px-4 py-3 text-sm placeholder-zinc-700 focus:ring-2 focus:ring-yellow-500/10"
                        />
                      </div>

                      <div>
                        <label className="block text-zinc-400 text-[10px] font-black uppercase tracking-widest mb-1.5">Correo Electrónico</label>
                        <input 
                          type="email"
                          required
                          value={registerEmail}
                          onChange={(e) => setRegisterEmail(e.target.value)}
                          placeholder="ej: diego@mundial.com"
                          className="w-full input-stitch px-4 py-3 text-sm placeholder-zinc-700 focus:ring-2 focus:ring-yellow-500/10"
                        />
                      </div>

                      <div>
                        <label className="block text-zinc-400 text-[10px] font-black uppercase tracking-widest mb-1.5">Contraseña (mín. 6 carac.)</label>
                        <input 
                          type="password"
                          required
                          value={registerPassword}
                          onChange={(e) => setRegisterPassword(e.target.value)}
                          placeholder="Elige tu contraseña"
                          className="w-full input-stitch px-4 py-3 text-sm placeholder-zinc-700 focus:ring-2 focus:ring-yellow-500/10"
                        />
                      </div>

                      <div>
                        <label className="block text-zinc-400 text-[10px] font-black uppercase tracking-widest mb-1.5">Confirmar Contraseña</label>
                        <input 
                          type="password"
                          required
                          value={registerConfirmPassword}
                          onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                          placeholder="Confirma tu contraseña"
                          className="w-full input-stitch px-4 py-3 text-sm placeholder-zinc-700 focus:ring-2 focus:ring-yellow-500/10"
                        />
                      </div>

                      {registerError && (
                        <div className="flex items-center gap-2 bg-red-950/30 border border-red-800/40 text-red-400 text-xs p-3 rounded-lg">
                          <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                          <span>{registerError}</span>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={registerLoading}
                        className="w-full btn-primary-stitch py-3.5 text-sm transition tracking-wider uppercase"
                      >
                        {registerLoading ? 'Creando Cuenta...' : 'Registrarme ahora'}
                      </button>

                      <div className="text-center pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setIsRegistering(false);
                            setRegisterError('');
                          }}
                          className="text-yellow-500 hover:text-yellow-400 text-xs font-bold transition hover:underline"
                        >
                          ¿Ya tienes cuenta? Inicia sesión aquí
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <User className="w-5 h-5 text-yellow-500" />
                      <h2 className="text-lg font-black tracking-wider text-zinc-100 uppercase">Mi Cuenta</h2>
                    </div>
                    {user.tipo !== 'admin' && (
                      <span className={`text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border ${
                        user.aprobado
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20 animate-pulse'
                      }`}>
                        {user.aprobado ? '✅ Cuenta Aprobada' : '⏳ Pendiente de Aprobación'}
                      </span>
                    )}
                  </div>

                  {!user.aprobado && user.tipo !== 'admin' && (
                    <div className="bg-yellow-500/5 border border-yellow-500/25 rounded-2xl p-5 mb-6 flex gap-3 text-xs text-yellow-400 font-semibold shadow-lg border-dashed">
                      <span className="text-xl animate-bounce">⚠️</span>
                      <div className="space-y-1 flex-1">
                        <p className="font-extrabold uppercase text-[10px] tracking-wider text-yellow-500">Participación Pendiente de Aprobación</p>
                        <p className="text-zinc-400 leading-relaxed text-[11px] font-medium">
                          Tu registro fue exitoso pero el administrador aún debe aprobar tu cuenta antes de que puedas guardar pronósticos (apuestas). Mientras tanto, eres libre de explorar partidos, fixture y clasificaciones públicas.
                        </p>
                      </div>
                    </div>
                  )}

              {/* Interactive Profile Editor Card */}
              <div className="glass-card rounded-3xl p-6 md:p-8 shadow-2xl border border-zinc-800/80">
                <form onSubmit={handleSaveProfile} className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8">
                  
                  {/* Avatar upload & preview section */}
                  <div className="md:col-span-4 flex flex-col items-center gap-6 justify-center border-b md:border-b-0 md:border-r border-zinc-850 pb-6 md:pb-0 md:pr-8">
                    <div className="relative group">
                      <img 
                        src={profileAvatarPreview || user.avatar} 
                        className="w-32 h-32 rounded-full border-2 border-yellow-500/50 bg-zinc-950 p-1 shadow-2xl object-cover transition duration-300 group-hover:opacity-85" 
                        alt="avatar" 
                      />
                      <label className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center text-[10px] text-zinc-350 font-extrabold uppercase opacity-0 group-hover:opacity-100 transition duration-300 cursor-pointer select-none">
                        <span>Subir</span>
                        <span>Foto</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setProfileAvatarFile(file);
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setProfileAvatarPreview(reader.result as string);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    </div>

                    <div className="text-center space-y-1">
                      <h3 className="text-xl font-black text-zinc-100">{user.nombre}</h3>
                      <p className="text-zinc-500 text-xs">{user.email}</p>
                      
                      <div className="flex justify-center gap-2 pt-2">
                        <span className="bg-zinc-950 border border-zinc-800 text-[9px] text-zinc-400 font-mono tracking-widest px-2.5 py-1 rounded-full uppercase font-black">
                          Rol: {user.tipo}
                        </span>
                        <span className="bg-emerald-500/10 border border-emerald-500/20 text-[9px] text-emerald-400 font-mono px-2.5 py-1 rounded-full uppercase font-black">
                          En línea
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Form fields & action area */}
                  <div className="md:col-span-8 flex flex-col justify-between space-y-6">
                    <div className="space-y-4">
                      {profileSuccess && (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3.5 rounded-xl text-xs font-bold text-center">
                          {profileSuccess}
                        </div>
                      )}
                      {profileError && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3.5 rounded-xl text-xs font-bold text-center">
                          {profileError}
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block">Nombre Completo</label>
                        <input 
                          type="text" 
                          required
                          value={profileNombre}
                          onChange={(e) => setProfileNombre(e.target.value)}
                          placeholder="Ingresa tu nombre"
                          className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-3 text-zinc-200 text-xs focus:border-yellow-500/35 outline-none transition font-semibold"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block">Nueva Contraseña (Opcional)</label>
                        <input 
                          type="password" 
                          value={profilePassword}
                          onChange={(e) => setProfilePassword(e.target.value)}
                          placeholder="Dejar en blanco para no cambiar"
                          className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-3 text-zinc-200 text-xs focus:border-yellow-500/35 outline-none transition font-semibold"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block">Subir foto de perfil</label>
                        <div className="flex items-center gap-3">
                          <label className="flex-1 bg-zinc-950 border border-zinc-850 hover:border-zinc-700/80 rounded-xl px-4 py-3 text-zinc-400 text-xs transition cursor-pointer font-bold text-center border-dashed">
                            {profileAvatarFile ? `📸 Seleccionado: ${profileAvatarFile.name.substring(0, 20)}...` : '📂 Seleccionar archivo de imagen'}
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  setProfileAvatarFile(file);
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setProfileAvatarPreview(reader.result as string);
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={profileSubmitting}
                      className="w-full btn-primary-stitch py-3.5 rounded-xl text-xs font-black tracking-widest uppercase flex items-center justify-center gap-2 active:scale-[0.99] transition duration-150 disabled:opacity-50"
                    >
                      {profileSubmitting ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Guardando Cambios...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Actualizar Perfil</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Passkeys / FIDO card */}
              <div className="glass-card border border-zinc-800/80 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <div>
                    <div className="text-xs font-black text-zinc-300 uppercase tracking-wider">Llaves FIDO / Passkeys</div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">Inicia sesión con huella, Face ID o clave de seguridad</div>
                  </div>
                  <span className="text-2xl">🔑</span>
                </div>
                <button
                  onClick={handlePasskeyRegister}
                  disabled={passkeyRegistering}
                  className="w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-yellow-500/40 text-zinc-300 hover:text-zinc-100 py-3 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 active:scale-[0.99] uppercase tracking-wider"
                >
                  <span className="text-base">➕</span>
                  <span>{passkeyRegistering ? 'Registrando...' : 'Registrar nueva passkey / llave FIDO'}</span>
                </button>
                {passkeyError && (
                  <div className="bg-red-950/30 border border-red-800/40 text-red-400 text-xs p-3 rounded-lg">{passkeyError}</div>
                )}
                <p className="text-[10px] text-zinc-600 leading-relaxed">
                  Compatible con: Touch ID (Mac), Windows Hello, YubiKey, Face ID (iPhone/Android). Requiere HTTPS en producción.
                </p>
              </div>

              {/* Personal Stats Card */}
              {myStats && (
                <div className="glass-card border border-zinc-800/80 rounded-3xl p-6 shadow-xl space-y-4">
                  <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
                    <Activity className="w-4 h-4 text-yellow-500" />
                    <h3 className="text-xs font-black text-zinc-300 uppercase tracking-widest">Mis Estadísticas</h3>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3">
                      <div className="text-green-400 font-black text-xl font-mono">{myStats.exactos}</div>
                      <div className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">Exactos</div>
                    </div>
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
                      <div className="text-blue-400 font-black text-xl font-mono">{myStats.aciertos}</div>
                      <div className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">Aciertos</div>
                    </div>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                      <div className="text-zinc-400 font-black text-xl font-mono">{myStats.fallos}</div>
                      <div className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">Fallos</div>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    {[
                      { label: 'Resultados exactos', pct: myStats.pct_exacto, color: 'bg-green-500' },
                      { label: 'Acertaste ganador', pct: myStats.pct_acierto, color: 'bg-blue-500' },
                      { label: 'Fallos totales', pct: myStats.pct_fallo, color: 'bg-zinc-600' },
                    ].map((stat) => (
                      <div key={stat.label} className="space-y-1">
                        <div className="flex justify-between text-[10px] text-zinc-500">
                          <span>{stat.label}</span>
                          <span className="font-mono font-bold text-zinc-400">{stat.pct}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                          <div className={`h-full ${stat.color} rounded-full transition-all duration-700`} style={{ width: `${stat.pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-zinc-800 text-xs">
                    <span className="text-zinc-500">{myStats.total} predicciones en partidos finalizados</span>
                    <span className="text-yellow-500 font-black font-mono">{myStats.puntos_totales} pts</span>
                  </div>
                </div>
              )}

              {/* Logout actions */}
              <div className="glass-card border border-zinc-800/40 p-4 rounded-xl md:hidden">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 bg-red-950/20 hover:bg-red-950/40 text-red-400 font-bold py-3.5 rounded-lg text-sm border border-red-900/30 transition active:scale-[0.98]"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Cerrar Sesión</span>
                </button>
              </div>
                </>
              )}
            </section>
          )}

          {/* --- VIEW 4: ADMIN PANEL --- */}
          {activeTab === 'admin' && user.tipo === 'admin' && (
            <section className="space-y-6">
              
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-yellow-500" />
                  <h2 className="text-lg font-black tracking-wider text-zinc-100 uppercase">Panel de Control</h2>
                </div>
                <button
                  onClick={handleRecalculateLeaderboard}
                  className="bg-yellow-500 hover:bg-yellow-600 text-zinc-950 text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 transition active:scale-95 shadow"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Recalcular Clasificación</span>
                </button>
              </div>

              {/* Configuración de la Aplicación */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-800 pb-2">Personalización de la Aplicación</h3>
                <form onSubmit={handleSaveSettings} className="bg-zinc-900/40 border border-zinc-900 rounded-2xl p-5 space-y-4 max-w-2xl">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* App Name */}
                    <div className="space-y-1.5">
                      <label className="block text-zinc-400 text-[10px] font-black uppercase tracking-widest">Nombre de la Quiniela</label>
                      <input 
                        type="text"
                        required
                        value={editAppName}
                        onChange={(e) => setEditAppName(e.target.value)}
                        placeholder="Nombre de la Quiniela"
                        className="w-full input-stitch px-3 py-2 text-xs"
                      />
                    </div>

                    {/* Logo Type */}
                    <div className="space-y-1.5">
                      <label className="block text-zinc-400 text-[10px] font-black uppercase tracking-widest">Tipo de Logo</label>
                      <select 
                        value={editLogoType}
                        onChange={(e) => setEditLogoType(e.target.value as 'emoji' | 'file')}
                        className="w-full bg-zinc-950 border border-zinc-850 text-zinc-300 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-yellow-500/30"
                      >
                        <option value="emoji">Emoji o Símbolo</option>
                        <option value="file">Imagen Personalizada (Subir)</option>
                      </select>
                    </div>
                  </div>

                  {editLogoType === 'emoji' ? (
                    <div className="space-y-1.5 max-w-xs">
                      <label className="block text-zinc-400 text-[10px] font-black uppercase tracking-widest">Emoji o Icono Texto</label>
                      <div className="flex gap-2">
                        <input 
                          type="text"
                          required
                          value={editLogoEmoji}
                          onChange={(e) => setEditLogoEmoji(e.target.value)}
                          placeholder="ej: 🏆 o ⚽ o 🎫"
                          className="w-full input-stitch px-3 py-2 text-xs"
                        />
                        <div className="w-9 h-9 bg-zinc-950 border border-zinc-850 rounded-xl flex items-center justify-center text-xl select-none flex-shrink-0">
                          {editLogoEmoji}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <label className="block text-zinc-400 text-[10px] font-black uppercase tracking-widest">Archivo de Logo (PNG / JPG / SVG)</label>
                      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                        <input 
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setEditLogoFile(e.target.files[0]);
                            }
                          }}
                          className="text-xs text-zinc-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-zinc-950 file:text-yellow-500 hover:file:bg-zinc-900 file:cursor-pointer"
                        />
                        {appLogo.startsWith('/') && (
                          <div className="flex items-center gap-2 bg-zinc-950/60 border border-zinc-850 p-2 rounded-xl">
                            <span className="text-[9px] text-zinc-500">Logo actual:</span>
                            <img src={appLogo} className="w-8 h-8 object-contain rounded" alt="logo actual" />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end pt-2 border-t border-zinc-950">
                    <button
                      type="submit"
                      disabled={settingsSubmitting}
                      className="bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-zinc-950 text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 transition active:scale-95 shadow"
                    >
                      <span>{settingsSubmitting ? 'Guardando...' : 'Guardar Cambios'}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Sync Dashboard */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-800 pb-2">Sincronización en Vivo</h3>
                <div className="bg-zinc-900/40 border border-zinc-900 rounded-2xl p-5 space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      {syncStatus?.last_synced ? (
                        (() => {
                          const secAgo = Math.floor((Date.now() - new Date(syncStatus.last_synced).getTime()) / 1000);
                          const color = secAgo < 120 ? 'bg-green-500' : secAgo < 600 ? 'bg-yellow-500' : 'bg-red-500';
                          const label = secAgo < 120 ? 'Activo' : secAgo < 600 ? 'Demorado' : 'Sin sync';
                          return (
                            <>
                              <span className={`h-2.5 w-2.5 rounded-full ${color} animate-pulse`}></span>
                              <span className="text-xs text-zinc-300 font-bold">{label}</span>
                              <span className="text-[10px] text-zinc-500">· hace {secAgo < 60 ? `${secAgo}s` : `${Math.floor(secAgo / 60)}min`}</span>
                            </>
                          );
                        })()
                      ) : (
                        <>
                          <span className="h-2.5 w-2.5 rounded-full bg-zinc-600"></span>
                          <span className="text-xs text-zinc-500">Sin datos de sync</span>
                        </>
                      )}
                    </div>
                    <button
                      onClick={handleForceSyncAdmin}
                      disabled={syncLoading}
                      className="bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-zinc-950 text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 transition active:scale-95"
                    >
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
                      <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Últimas sincronizaciones</div>
                      <div className="bg-zinc-950 border border-zinc-850 rounded-xl divide-y divide-zinc-900 max-h-48 overflow-y-auto">
                        {syncStatus.logs.map((log: any) => (
                          <div key={log.id} className="flex justify-between items-center p-3 text-[10px] font-mono">
                            <span className="text-zinc-500">
                              {new Date(log.synced_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                            <div className="flex gap-3 text-zinc-400">
                              <span className="text-yellow-500">↑{log.matches_updated} upd</span>
                              <span className="text-green-400">⚽{log.goals_detected} goles</span>
                              <span className="text-blue-400">✓{log.matches_finished} fin</span>
                              <span className="text-zinc-500">{log.duration_ms}ms</span>
                            </div>
                            {log.errors && log.errors.length > 0 && (
                              <span className="text-red-400 text-[9px]">ERR</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Admin match live updater list */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-800 pb-2">Marcadores en vivo</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {matches.map((m) => (
                    <div key={m.id} className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl flex justify-between items-center text-xs shadow-md">
                      <div className="flex flex-col gap-1 w-[60%]">
                        <div className="flex items-center gap-2 text-sm text-zinc-200 font-black">
                          <span>{m.local} {m.goles_local} - {m.goles_visitante} {m.visitante}</span>
                        </div>
                        <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">
                          {m.estado === 'live' ? '🔴 En juego' : m.estado === 'finished' ? '⚫ Finalizado' : '⚪ Programado'}
                        </span>
                      </div>

                      <button
                        onClick={() => {
                          setAdminMatchModal(m);
                          setAdminGolesLocal(m.goles_local);
                          setAdminGolesVisitante(m.goles_visitante);
                          setAdminEstado(m.estado);
                          setAdminTransmisionEnlaces(m.transmision_enlaces || '');
                        }}
                        className="bg-zinc-950 hover:bg-zinc-800 text-zinc-300 font-bold px-4 py-2 border border-zinc-800 hover:border-yellow-500/25 rounded-xl transition"
                      >
                        Editar
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Admin User Activation Manager list */}
              <div className="space-y-4 max-w-2xl">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-800 pb-2">Gestión de Usuarios</h3>

                {/* Formulario de creación de usuario */}
                <form onSubmit={handleCreateUser} className="bg-zinc-900/40 border border-zinc-900 rounded-2xl p-5 space-y-4 shadow-lg">
                  <div className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Crear Nuevo Usuario</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Nombre */}
                    <div className="space-y-1.5">
                      <label className="block text-zinc-400 text-[10px] font-black uppercase tracking-widest">Nombre Completo</label>
                      <input 
                        type="text"
                        required
                        value={newUserNombre}
                        onChange={(e) => setNewUserNombre(e.target.value)}
                        placeholder="Nombre completo"
                        className="w-full input-stitch px-3 py-2 text-xs"
                      />
                    </div>

                    {/* Email */}
                    <div className="space-y-1.5">
                      <label className="block text-zinc-400 text-[10px] font-black uppercase tracking-widest">Correo Electrónico</label>
                      <input 
                        type="email"
                        required
                        value={newUserEmail}
                        onChange={(e) => setNewUserEmail(e.target.value)}
                        placeholder="ej: usuario@mundial.com"
                        className="w-full input-stitch px-3 py-2 text-xs"
                      />
                    </div>

                    {/* Password */}
                    <div className="space-y-1.5">
                      <label className="block text-zinc-400 text-[10px] font-black uppercase tracking-widest">Contraseña</label>
                      <input 
                        type="password"
                        required
                        value={newUserPassword}
                        onChange={(e) => setNewUserPassword(e.target.value)}
                        placeholder="Contraseña (mín. 6 caracteres)"
                        className="w-full input-stitch px-3 py-2 text-xs"
                      />
                    </div>

                    {/* Role / Tipo */}
                    <div className="space-y-1.5">
                      <label className="block text-zinc-400 text-[10px] font-black uppercase tracking-widest">Rol del Usuario</label>
                      <select 
                        value={newUserTipo}
                        onChange={(e) => setNewUserTipo(e.target.value as 'user' | 'admin')}
                        className="w-full bg-zinc-950 border border-zinc-850 text-zinc-300 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-yellow-500/30"
                      >
                        <option value="user">Usuario Común</option>
                        <option value="admin">Administrador</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={newUserSubmitting}
                      className="bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-zinc-950 text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 transition active:scale-95 shadow"
                    >
                      <span>{newUserSubmitting ? 'Creando...' : 'Crear Usuario'}</span>
                    </button>
                  </div>
                </form>

                <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-black pt-2">Lista de Usuarios</div>

                <div className="bg-zinc-900/40 border border-zinc-900 divide-y divide-zinc-900 rounded-2xl overflow-hidden shadow-lg">
                  {adminUsers.map((u) => (
                    <div key={u.id} className="flex justify-between items-center p-4 text-xs">
                      <div className="flex items-center gap-3">
                        <img src={u.avatar} className="w-10 h-10 rounded-full bg-zinc-950 border border-zinc-850" alt="avatar" />
                        <div>
                          <div className="font-bold text-sm text-zinc-200">{u.nombre}</div>
                          <div className="text-[9px] text-zinc-500 font-mono tracking-widest uppercase">{u.tipo}</div>
                        </div>
                      </div>

                      {u.id !== user.id ? (
                        <div className="flex items-center gap-2">
                          {/* Approval Status Toggle */}
                          {u.tipo !== 'admin' && (
                            <button
                              onClick={() => handleToggleUserApproval(u.id, u.aprobado)}
                              className={`font-bold py-1.5 px-3 rounded-xl flex items-center gap-1.5 transition text-[11px] ${
                                u.aprobado
                                  ? 'bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 border border-yellow-500/20'
                                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 border border-zinc-700'
                              }`}
                              title={u.aprobado ? 'Aprobado para participar en quinielas' : 'Pendiente de aprobación'}
                            >
                              {u.aprobado ? (
                                <>
                                  <Check className="w-3.5 h-3.5" /> Aprobado
                                </>
                              ) : (
                                <>
                                  <Lock className="w-3.5 h-3.5 text-zinc-500 animate-pulse" /> Aprobar
                                </>
                              )}
                            </button>
                          )}

                          {/* Active Status Toggle */}
                          <button
                            onClick={() => handleToggleUserStatus(u.id, u.activo)}
                            className={`font-bold py-1.5 px-3 rounded-xl flex items-center gap-1.5 transition text-[11px] ${
                              u.activo 
                                ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20' 
                                : 'bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20'
                            }`}
                          >
                            {u.activo ? (
                              <>
                                <UserX className="w-3.5 h-3.5" /> Desactivar
                              </>
                            ) : (
                              <>
                                <UserCheck className="w-3.5 h-3.5" /> Activar
                              </>
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-zinc-500 uppercase tracking-widest italic pr-4">Tú (Admin)</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

            </section>
          )}

        </main>

        {/* BOTTOM MOBILE APP NAVIGATION (Hidden on Desktop) */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 bottom-nav-glass shadow-[0_-2px_24px_rgba(0,0,0,0.6)] flex items-center justify-around py-3 px-2 md:hidden" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
          
          {/* Tab Partidos */}
          <button
            onClick={() => setActiveTab('partidos')}
            className={`flex flex-col items-center gap-1 py-1 transition flex-1 text-center select-none ${
              activeTab === 'partidos' ? 'bottom-nav-active-pill font-black scale-105' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Calendar className="w-5 h-5" />
            <span className="text-[9px] font-bold tracking-wide uppercase">Partidos</span>
          </button>

          {/* Tab Fixture */}
          <button
            onClick={() => setActiveTab('fixture')}
            className={`flex flex-col items-center gap-1 py-1 transition flex-1 text-center select-none ${
              activeTab === 'fixture' ? 'bottom-nav-active-pill font-black scale-105' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Trophy className="w-5 h-5" />
            <span className="text-[9px] font-bold tracking-wide uppercase">Fixture</span>
          </button>

          {/* Tab Reglas */}
          <button
            onClick={() => setActiveTab('reglas')}
            className={`flex flex-col items-center gap-1 py-1 transition flex-1 text-center select-none ${
              activeTab === 'reglas' ? 'bottom-nav-active-pill font-black scale-105' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <BookOpen className="w-5 h-5" />
            <span className="text-[9px] font-bold tracking-wide uppercase">Reglas</span>
          </button>

          {/* Tab Leaderboard */}
          <button
            onClick={() => setActiveTab('ranking')}
            className={`flex flex-col items-center gap-1 py-1 transition flex-1 text-center select-none ${
              activeTab === 'ranking' ? 'bottom-nav-active-pill font-black scale-105' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            <span className="text-[9px] font-bold tracking-wide uppercase">Ranking</span>
          </button>

          {/* Tab Perfil */}
          <button
            onClick={() => setActiveTab('perfil')}
            className={`flex flex-col items-center gap-1 py-1 transition flex-1 text-center select-none ${
              activeTab === 'perfil' ? 'bottom-nav-active-pill font-black scale-105' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <User className="w-5 h-5" />
            <span className="text-[9px] font-bold tracking-wide uppercase">Mi Perfil</span>
          </button>

          {/* Tab Admin (Visible to admin only!) */}
          {user && user.tipo === 'admin' && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`flex flex-col items-center gap-1 py-1 transition flex-1 text-center select-none ${
                activeTab === 'admin' ? 'bottom-nav-active-pill font-black scale-105' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Settings className="w-5 h-5" />
              <span className="text-[9px] font-bold tracking-wide uppercase">Admin</span>
            </button>
          )}
        </nav>

        {/* --- POPUP 1: BETTING / CHRONO PROG FORM MODAL --- */}
        {betModalMatch && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-sm p-4">
            <div className="glass-card border-t-2 border-t-yellow-500 border-x border-b border-zinc-800/80 rounded-xl w-full max-w-md p-6 shadow-2xl animate-slide-in-up space-y-6">
              
              {/* Modal Header */}
              <div className="flex justify-between items-center border-b border-zinc-800/40 pb-3">
                <div>
                  <h3 className="text-sm font-black uppercase text-zinc-100">Hacer Pronóstico</h3>
                  <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono">Apuestas Cerradas al inicio del partido</span>
                </div>
                <button 
                  onClick={() => setBetModalMatch(null)}
                  className="bg-zinc-950 hover:bg-zinc-800 text-zinc-400 p-2 rounded-full border border-zinc-850 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Score Selector Controls */}
              <div className="flex justify-between items-center py-4 bg-zinc-950 border border-zinc-850 rounded-lg px-6 shadow-inner">
                
                {/* Local Input Selector */}
                <div className="flex flex-col items-center gap-2 w-1/3">
                  <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-2xl shadow-inner select-none flex-shrink-0 animate-pulse">
                    {getTeamFlag(betModalMatch.local)}
                  </div>
                  <span className="text-[10px] font-black text-zinc-300 uppercase truncate w-full text-center tracking-wider">{betModalMatch.local}</span>
                  <div className="flex items-center gap-1.5 mt-2">
                    <button 
                      onClick={() => setBetPredLocal(Math.max(0, betPredLocal - 1))}
                      className="w-8 h-8 rounded-full border border-zinc-800 flex items-center justify-center font-bold text-sm bg-zinc-900 text-zinc-300 transition active:scale-90 hover:border-yellow-500/25"
                    >
                      -
                    </button>
                    <span className="text-lg font-black font-mono w-4 text-center text-yellow-500">{betPredLocal}</span>
                    <button 
                      onClick={() => setBetPredLocal(betPredLocal + 1)}
                      className="w-8 h-8 rounded-full border border-zinc-800 flex items-center justify-center font-bold text-sm bg-zinc-900 text-zinc-300 transition active:scale-90 hover:border-yellow-500/25"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Colon Separator */}
                <span className="text-2xl text-zinc-700 font-extrabold font-mono">:</span>

                {/* Visitante Input Selector */}
                <div className="flex flex-col items-center gap-2 w-1/3">
                  <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-2xl shadow-inner select-none flex-shrink-0 animate-pulse">
                    {getTeamFlag(betModalMatch.visitante)}
                  </div>
                  <span className="text-[10px] font-black text-zinc-300 uppercase truncate w-full text-center tracking-wider">{betModalMatch.visitante}</span>
                  <div className="flex items-center gap-1.5 mt-2">
                    <button 
                      onClick={() => setBetPredVisitante(Math.max(0, betPredVisitante - 1))}
                      className="w-8 h-8 rounded-full border border-zinc-800 flex items-center justify-center font-bold text-sm bg-zinc-900 text-zinc-300 transition active:scale-90 hover:border-yellow-500/25"
                    >
                      -
                    </button>
                    <span className="text-lg font-black font-mono w-4 text-center text-yellow-500">{betPredVisitante}</span>
                    <button 
                      onClick={() => setBetPredVisitante(betPredVisitante + 1)}
                      className="w-8 h-8 rounded-full border border-zinc-800 flex items-center justify-center font-bold text-sm bg-zinc-900 text-zinc-300 transition active:scale-90 hover:border-yellow-500/25"
                    >
                      +
                    </button>
                  </div>
                </div>

              </div>

              {betError && (
                <div className="flex items-center gap-2 bg-red-950/30 border border-red-800/40 text-red-400 text-xs p-3 rounded-lg">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                  <span>{betError}</span>
                </div>
              )}

              {/* Confirm Submit action button */}
              <button
                onClick={handleSavePrediction}
                disabled={betSubmitting}
                className="w-full btn-primary-stitch py-3.5 text-sm uppercase flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>{betSubmitting ? 'Confirmando...' : 'Confirmar Apuesta'}</span>
              </button>

            </div>
          </div>
        )}

        {/* --- POPUP 2: ADMIN MATCH SCORES UPDATE MODAL --- */}
        {adminMatchModal && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-md p-6 shadow-2xl animate-slide-in-up space-y-6">
              
              <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                <div>
                  <h3 className="text-sm font-black uppercase text-zinc-100">Actualizar Marcador</h3>
                  <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">Modo Administrador</span>
                </div>
                <button 
                  onClick={() => setAdminMatchModal(null)}
                  className="bg-zinc-950 hover:bg-zinc-800 text-zinc-400 p-2 rounded-full border border-zinc-800 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Score inputs */}
              <div className="flex justify-between items-center py-4 bg-zinc-950 border border-zinc-800/80 rounded-2xl px-6">
                
                {/* Local Input Selector */}
                <div className="flex flex-col items-center gap-2 w-1/3">
                  <span className="text-3xl">{getTeamFlag(adminMatchModal.local)}</span>
                  <span className="text-xs font-bold text-zinc-200 uppercase truncate w-full text-center">{adminMatchModal.local}</span>
                  <input 
                    type="number"
                    min="0"
                    value={adminGolesLocal}
                    onChange={(e) => setAdminGolesLocal(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-16 bg-zinc-900 border border-zinc-800 text-center py-2 text-yellow-500 font-mono font-black text-lg rounded-lg outline-none mt-2"
                  />
                </div>

                {/* Colon Separator */}
                <span className="text-2xl text-zinc-700 font-extrabold font-mono">:</span>

                {/* Visitante Input Selector */}
                <div className="flex flex-col items-center gap-2 w-1/3">
                  <span className="text-3xl">{getTeamFlag(adminMatchModal.visitante)}</span>
                  <span className="text-xs font-bold text-zinc-200 uppercase truncate w-full text-center">{adminMatchModal.visitante}</span>
                  <input 
                    type="number"
                    min="0"
                    value={adminGolesVisitante}
                    onChange={(e) => setAdminGolesVisitante(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-16 bg-zinc-900 border border-zinc-800 text-center py-2 text-yellow-500 font-mono font-black text-lg rounded-lg outline-none mt-2"
                  />
                </div>

              </div>

              {/* Match State Selector */}
              <div>
                <label className="block text-zinc-400 text-xs font-bold uppercase tracking-wide mb-2">Estado del Partido</label>
                <select
                  value={adminEstado}
                  onChange={(e) => setAdminEstado(e.target.value as any)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-300 outline-none transition"
                >
                  <option value="upcoming">Programado (upcoming)</option>
                  <option value="live">En Juego (live)</option>
                  <option value="finished">Finalizado (finished)</option>
                </select>
              </div>

              {/* Streaming Links Input */}
              <div>
                <label className="block text-zinc-400 text-xs font-bold uppercase tracking-wide mb-2">Enlaces de Transmisión (separados por coma)</label>
                <textarea
                  value={adminTransmisionEnlaces}
                  onChange={(e) => setAdminTransmisionEnlaces(e.target.value)}
                  placeholder="ej: Bolivia TV: https://boliviatv.bo, Unitel: https://unitel.tv, Red Uno"
                  rows={2}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-xs text-zinc-300 outline-none transition focus:border-yellow-500/35 resize-none placeholder-zinc-700 font-mono"
                />
              </div>

              {/* Save action button */}
              <button
                onClick={handleAdminUpdateMatch}
                disabled={adminSubmitting}
                className="w-full bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-500/50 text-zinc-950 font-bold py-3.5 rounded-xl text-sm transition tracking-wider uppercase flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <Check className="w-4 h-4" />
                <span>{adminSubmitting ? 'Guardando Marcador...' : 'Guardar Marcador'}</span>
              </button>

            </div>
          </div>
        )}

        {/* --- POPUP 3: MATCH SUMMARY & STATISTICS OVERLAY --- */}
        {summaryModalMatch && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-md p-0 sm:p-4">
            <div
              className="bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-3xl w-full max-w-2xl shadow-2xl animate-slide-in-up flex flex-col"
              style={{ maxHeight: '92vh' }}
            >

              {/* Header — no scrollea, siempre visible */}
              <div className="flex justify-between items-center border-b border-zinc-800 px-6 py-4 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-yellow-500" />
                  <h3 className="text-sm font-black uppercase text-zinc-100">Resumen del Partido</h3>
                </div>
                <button
                  onClick={() => {
                    setSummaryModalMatch(null);
                    setCommunityBets([]);
                  }}
                  className="bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 p-2.5 rounded-full border border-zinc-800 transition flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable body */}
              <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6 overscroll-contain">

              {/* Banner Head */}
              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden">

                {/* Fase + estado */}
                <div className="flex justify-between items-center px-4 pt-4 pb-2">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono font-bold">
                    {summaryModalMatch.fase}{summaryModalMatch.grupo ? ` · Grupo ${summaryModalMatch.grupo}` : ''}
                  </span>
                  <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                    summaryModalMatch.estado === 'live' ? 'bg-red-500/15 text-red-400 border border-red-500/30' :
                    summaryModalMatch.estado === 'finished' ? 'bg-zinc-800 text-zinc-500' :
                    'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                  }`}>
                    {summaryModalMatch.estado === 'live' ? '🔴 En juego' : summaryModalMatch.estado === 'finished' ? '⚫ Finalizado' : '🔵 Próximamente'}
                  </span>
                </div>

                {/* Teams + score */}
                <div className="flex justify-between items-center px-6 py-4">
                  <div className="flex flex-col items-center w-[38%] gap-1 text-center">
                    <span className="text-4xl">{getTeamFlag(summaryModalMatch.local)}</span>
                    <span className="text-xs font-black text-zinc-200 uppercase leading-tight">{summaryModalMatch.local}</span>
                  </div>

                  <div className="flex flex-col items-center justify-center w-[24%] gap-1">
                    {summaryModalMatch.estado !== 'upcoming' ? (
                      <span className="font-mono text-3xl font-black text-yellow-500 tracking-wider">
                        {summaryModalMatch.goles_local}–{summaryModalMatch.goles_visitante}
                      </span>
                    ) : (
                      <span className="text-zinc-500 font-black text-lg tracking-widest">VS</span>
                    )}
                  </div>

                  <div className="flex flex-col items-center w-[38%] gap-1 text-center">
                    <span className="text-4xl">{getTeamFlag(summaryModalMatch.visitante)}</span>
                    <span className="text-xs font-black text-zinc-200 uppercase leading-tight">{summaryModalMatch.visitante}</span>
                  </div>
                </div>

                {/* Fecha + hora + estadio + mapa */}
                <div className="border-t border-zinc-800/60 px-4 py-3 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <span className="text-base">📅</span>
                    <span className="font-bold">
                      {new Date(summaryModalMatch.fecha).toLocaleDateString('es-ES', {
                        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                      })}
                    </span>
                    <span className="text-zinc-600">·</span>
                    <span className="font-mono font-bold text-yellow-500">
                      {new Date(summaryModalMatch.fecha).toLocaleTimeString('es-ES', {
                        hour: '2-digit', minute: '2-digit'
                      })} (hora local)
                    </span>
                  </div>

                  {summaryModalMatch.estadio && (
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs text-zinc-400">
                        <span className="text-base">🏟️</span>
                        <span className="font-bold text-zinc-300">{summaryModalMatch.estadio}</span>
                      </div>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(summaryModalMatch.estadio)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 text-[10px] font-bold px-2 py-1 rounded-lg transition flex-shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        📍 Ver mapa
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Transmission Links - Only for registered users! */}
              {summaryModalMatch.transmision_enlaces && summaryModalMatch.transmision_enlaces.trim() !== '' && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center border-b border-zinc-800 pb-1.5">
                    <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest">Dónde Ver el Partido</h4>
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Enlaces Oficiales</span>
                  </div>
                  {!user ? (
                    <div className="bg-zinc-950/40 border border-dashed border-zinc-800 rounded-2xl p-4 text-center">
                      <p className="text-[11px] text-zinc-400 font-medium">
                        🔒 <span className="text-yellow-500">Inicia sesión</span> para acceder a los enlaces oficiales de transmisión de este partido.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-zinc-950 border border-zinc-850 p-4 rounded-2xl flex flex-wrap gap-2">
                      {summaryModalMatch.transmision_enlaces.split(',').map((linkPair: string, idx: number) => {
                        const parts = linkPair.split(':');
                        const name = parts[0]?.trim();
                        const url = parts.slice(1).join(':')?.trim();
                        if (!name) return null;
                        if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
                          return (
                            <a
                              key={idx}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-zinc-900 hover:bg-yellow-500 hover:text-zinc-950 border border-zinc-850 hover:border-yellow-500 text-zinc-300 text-[10px] font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 active:scale-[0.98] select-none"
                              onClick={(e) => e.stopPropagation()}
                            >
                              🎥 <span>{name}</span>
                            </a>
                          );
                        }
                        return (
                          <span key={idx} className="bg-zinc-900 border border-zinc-850 text-zinc-400 text-[10px] px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 select-none">
                            📺 <span>{name}</span> {url ? <span className="text-zinc-550 font-normal">({url})</span> : ''}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Tactical News and Stadium Info Block in Spanish (Give Voice to Football API) */}
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-zinc-800 pb-1.5">
                  <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest">Información & Previa (GVTF API)</h4>
                  {matchStatsInfo && (
                    <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded uppercase font-bold tracking-wider font-mono">
                      Conexión GVTF Activa
                    </span>
                  )}
                </div>

                {loadingNews ? (
                  <div className="py-6 text-center text-xs text-zinc-500 flex items-center justify-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-yellow-500" />
                    <span>Cargando noticias y análisis táctico...</span>
                  </div>
                ) : (
                  <>
                    {/* Stadium & short preview metadata */}
                    {matchStatsInfo && (
                      <div className="bg-zinc-950/60 p-4 border border-zinc-850 rounded-2xl text-xs space-y-2">
                        <div className="grid grid-cols-2 gap-3 text-[11px]">
                          <div>
                            <span className="text-zinc-500 block">🏟️ Estadio</span>
                            <span className="font-extrabold text-zinc-300">{matchStatsInfo.estadio}</span>
                          </div>
                          <div>
                            <span className="text-zinc-500 block">⛅ Clima / Árbitro</span>
                            <span className="font-extrabold text-zinc-300">{matchStatsInfo.temperatura} | {matchStatsInfo.arbitro}</span>
                          </div>
                        </div>
                        <div className="pt-2 border-t border-zinc-900 text-zinc-400 leading-relaxed italic text-[11px]">
                          {matchStatsInfo.historialCorto}
                        </div>
                      </div>
                    )}

                    {/* Pre match news items in Spanish */}
                    <div className="space-y-3">
                      {matchNews.map((n) => (
                        <div key={n.id} className="bg-zinc-950/45 p-3.5 border border-zinc-850 rounded-2xl space-y-1.5 hover:border-zinc-800 transition">
                          <div className="flex justify-between items-center text-[9px] font-bold">
                            <span className="text-yellow-500 font-black tracking-widest">{n.categoria}</span>
                            <span className="text-zinc-500">{n.tiempo}</span>
                          </div>
                          <h5 className="font-extrabold text-[12px] text-zinc-200 leading-tight">{n.titulo}</h5>
                          <p className="text-zinc-500 text-[11px] leading-relaxed">{n.cuerpo}</p>
                          <div className="text-[8px] text-zinc-500 text-right uppercase tracking-wider font-semibold">
                            Redactor: {n.autor}
                          </div>
                        </div>
                      ))}
                      {matchNews.length === 0 && (
                        <div className="py-4 text-center text-xs text-zinc-600 italic">No hay noticias previas disponibles para este partido</div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Match Statistics — solo si el partido ya comenzó */}
              {summaryModalMatch.estado !== 'upcoming' && (
              <div className="space-y-4">
                <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-800 pb-1.5">Estadísticas del Encuentro</h4>

                {/* Stat 1: Possession */}
                {(() => {
                  const posLocal = 45 + (summaryModalMatch.id % 3 === 0 ? 10 : summaryModalMatch.id % 2 === 0 ? -5 : 2);
                  const posVisitante = 100 - posLocal;
                  return (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-mono font-bold">
                        <span className="text-zinc-400">{posLocal}%</span>
                        <span className="text-zinc-500 uppercase tracking-wider text-[10px]">Posesión de Balón</span>
                        <span className="text-zinc-400">{posVisitante}%</span>
                      </div>
                      <div className="h-2 w-full bg-zinc-950 rounded-full flex overflow-hidden border border-zinc-800">
                        <div className="h-full bg-yellow-500" style={{ width: `${posLocal}%` }}></div>
                        <div className="h-full bg-zinc-800" style={{ width: `${posVisitante}%` }}></div>
                      </div>
                    </div>
                  );
                })()}

                {/* Stat 2: Shots */}
                {(() => {
                  const shotsLocal = 8 + (summaryModalMatch.id % 5);
                  const shotsVisitante = 6 + (summaryModalMatch.id % 7);
                  const totalShots = shotsLocal + shotsVisitante;
                  const localPercent = (shotsLocal / totalShots) * 100;
                  return (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-mono font-bold">
                        <span className="text-zinc-400">{shotsLocal}</span>
                        <span className="text-zinc-500 uppercase tracking-wider text-[10px]">Remates Totales</span>
                        <span className="text-zinc-400">{shotsVisitante}</span>
                      </div>
                      <div className="h-2 w-full bg-zinc-950 rounded-full flex overflow-hidden border border-zinc-800">
                        <div className="h-full bg-yellow-500" style={{ width: `${localPercent}%` }}></div>
                        <div className="h-full bg-zinc-800" style={{ width: `${100 - localPercent}%` }}></div>
                      </div>
                    </div>
                  );
                })()}

                {/* Stat 3: Fouls */}
                {(() => {
                  const foulsLocal = 10 + (summaryModalMatch.id % 4);
                  const foulsVisitante = 9 + (summaryModalMatch.id % 6);
                  const totalFouls = foulsLocal + foulsVisitante;
                  const localPercent = (foulsLocal / totalFouls) * 100;
                  return (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-mono font-bold">
                        <span className="text-zinc-400">{foulsLocal}</span>
                        <span className="text-zinc-500 uppercase tracking-wider text-[10px]">Faltas Cometidas</span>
                        <span className="text-zinc-400">{foulsVisitante}</span>
                      </div>
                      <div className="h-2 w-full bg-zinc-950 rounded-full flex overflow-hidden border border-zinc-800">
                        <div className="h-full bg-yellow-500" style={{ width: `${localPercent}%` }}></div>
                        <div className="h-full bg-zinc-800" style={{ width: `${100 - localPercent}%` }}></div>
                      </div>
                    </div>
                  );
                })()}
              </div>
              )}

              {/* Community Predictions list */}
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b border-zinc-800 pb-1.5">
                  <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest">Apuestas de la Comunidad</h4>
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Pronósticos realizados</span>
                </div>

                {!user ? (
                  <div className="bg-zinc-950/40 border border-dashed border-zinc-800 rounded-2xl p-6 text-center space-y-3">
                    <span className="text-2xl">🔒</span>
                    <p className="text-xs text-zinc-400 font-medium">
                      Debes iniciar sesión para ver las apuestas de la comunidad y comparar tus resultados.
                    </p>
                    <button
                      onClick={() => {
                        setSummaryModalMatch(null);
                        setActiveTab('perfil');
                        showToast('🔑 Inicia sesión o regístrate para participar.');
                      }}
                      className="btn-primary-stitch px-4 py-2 text-[10px] tracking-wider uppercase mx-auto block"
                    >
                      Iniciar Sesión / Registro
                    </button>
                  </div>
                ) : loadingSummaryBets ? (
                  <div className="py-4 text-center text-xs text-zinc-500">Cargando pronósticos...</div>
                ) : (
                  <div className="bg-zinc-950 border border-zinc-850 rounded-2xl divide-y divide-zinc-900 max-h-48 overflow-y-auto">
                    {communityBets.map((bet) => (
                      <div key={bet.id} className="flex justify-between items-center p-3 text-xs">
                        <div className="flex items-center gap-2">
                          <img src={bet.avatar} className="w-7 h-7 rounded-full bg-zinc-900 border border-zinc-800" alt="avatar" />
                          <div>
                            <span className="font-bold text-zinc-300">{bet.nombre}</span>
                            <span className="text-[9px] text-zinc-500 uppercase font-mono tracking-widest ml-1">{bet.tipo}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-black text-zinc-200 font-mono">{bet.pred_local} - {bet.pred_visitante}</span>
                          {bet.puntos !== null && (
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black ${
                              bet.puntos === 3 ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                              bet.puntos === 1 ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                              'bg-zinc-900 text-zinc-500 border border-zinc-800/40'
                            }`}>
                              +{bet.puntos} PTS
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    {communityBets.length === 0 && (
                      <div className="py-6 text-center text-xs text-zinc-600 italic">Nadie ha realizado pronósticos para este partido aún</div>
                    )}
                  </div>
                )}
              </div>

              {/* Close button repeated at bottom for convenience on long content */}
              <div className="flex-shrink-0 border-t border-zinc-800 px-6 py-4">
                <button
                  onClick={() => {
                    setSummaryModalMatch(null);
                    setCommunityBets([]);
                  }}
                  className="w-full bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 py-2.5 rounded-xl border border-zinc-800 transition text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2"
                >
                  <X className="w-3.5 h-3.5" /> Cerrar
                </button>
              </div>

            </div>
          </div>
        </div>
        )}

      </div>
    </div>
  );
}
