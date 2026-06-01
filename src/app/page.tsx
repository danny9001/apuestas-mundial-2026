'use strict';

'use client';

import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Calendar, 
  User, 
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

  // View Mode: Cards or Excel Planilla
  const [viewMode, setViewMode] = useState<'cards' | 'excel'>('cards');

  // Application Data States
  const [matches, setMatches] = useState<any[]>([]);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [myStats, setMyStats] = useState<any>(null);

  // Excel Spreadsheet changes state
  const [excelScores, setExcelScores] = useState<{ [key: string]: { local: number; visitante: number } }>({});
  const [excelSubmitting, setExcelSubmitting] = useState(false);

  // Live Goal Overlay & Success Notifications
  const [goalAlert, setGoalAlert] = useState<any | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Betting Form Modal
  const [betModalMatch, setBetModalMatch] = useState<any | null>(null);
  const [betPredLocal, setBetPredLocal] = useState<number>(0);
  const [betPredVisitante, setBetPredVisitante] = useState<number>(0);
  const [betSubmitting, setBetSubmitting] = useState(false);
  const [betError, setBetError] = useState('');

  // Admin Match Editor Modal
  const [adminMatchModal, setAdminMatchModal] = useState<any | null>(null);
  const [adminGolesLocal, setAdminGolesLocal] = useState<number>(0);
  const [adminGolesVisitante, setAdminGolesVisitante] = useState<number>(0);
  const [adminEstado, setAdminEstado] = useState<'upcoming' | 'live' | 'finished'>('upcoming');
  const [adminSubmitting, setAdminSubmitting] = useState(false);

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
    if (!user) return;
    setDataLoading(true);
    try {
      // Fetch Matches
      const mRes = await fetch(`/api/matches?t=${Date.now()}`);
      if (mRes.ok) {
        const mData = await mRes.json();
        setMatches(mData);
      }

      // Fetch Predictions
      const pRes = await fetch(`/api/predictions?t=${Date.now()}`);
      if (pRes.ok) {
        const pData = await pRes.json();
        setPredictions(pData);
        
        // Populate Excel Scores Map
        const scoresMap: { [key: string]: { local: number; visitante: number } } = {};
        pData.forEach((p: any) => {
          scoresMap[p.match_id] = { local: p.pred_local, visitante: p.pred_visitante };
        });
        setExcelScores(scoresMap);
      }

      // Fetch Leaderboard
      const lRes = await fetch(`/api/leaderboard?t=${Date.now()}`);
      if (lRes.ok) {
        const lData = await lRes.json();
        setLeaderboard(lData);
      }

      // Fetch Users if Admin
      if (user.tipo === 'admin') {
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

  // Load personal stats when profile tab is opened
  useEffect(() => {
    if (user && activeTab === 'perfil') fetchMyStats();
  }, [activeTab, user]);

  useEffect(() => {
    checkSession();
  }, []);

  useEffect(() => {
    if (user) {
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
    }
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
      setExcelScores({});
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
        setExcelScores((prev) => ({
          ...prev,
          [betModalMatch.id]: { local: betPredLocal, visitante: betPredVisitante }
        }));

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

  // Batch Save Excel Planilla
  const handleSaveExcelPlanilla = async () => {
    // Generate the array of modified predictions to submit
    const batchPayload: any[] = [];
    
    // We only submit upcoming matches that have differences compared to original predictions
    matches.forEach((m) => {
      const isClosed = m.estado !== 'upcoming' || new Date() >= new Date(m.fecha);
      if (isClosed) return; // skip closed games

      const origPred = predictions.find((p) => p.match_id === m.id);
      const currentExcelVal = excelScores[m.id];

      // If user typed values in Excel
      if (currentExcelVal) {
        const hasOrigVal = origPred !== undefined;
        const diffLocal = !hasOrigVal || origPred.pred_local !== currentExcelVal.local;
        const diffVisitante = !hasOrigVal || origPred.pred_visitante !== currentExcelVal.visitante;

        // If score is different, add to payload
        if (diffLocal || diffVisitante) {
          batchPayload.push({
            matchId: m.id,
            predLocal: currentExcelVal.local,
            predVisitante: currentExcelVal.visitante
          });
        }
      }
    });

    if (batchPayload.length === 0) {
      showToast('No hay cambios pendientes para guardar');
      return;
    }

    setExcelSubmitting(true);
    try {
      const res = await fetch('/api/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batchPayload)
      });

      if (res.ok) {
        showToast('📈 ¡Planilla guardada con éxito!');
        fetchAppData(); // reload original predictions to reset diff state
      } else {
        showToast('Error al guardar la planilla');
      }
    } catch (e) {
      showToast('Error de red');
    } finally {
      setExcelSubmitting(false);
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
          estado: adminEstado
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

  // Count pending unsaved Excel changes
  const getPendingExcelCount = (): number => {
    let count = 0;
    matches.forEach((m) => {
      const isClosed = m.estado !== 'upcoming' || new Date() >= new Date(m.fecha);
      if (isClosed) return;

      const origPred = predictions.find((p) => p.match_id === m.id);
      const currentExcelVal = excelScores[m.id];

      if (currentExcelVal) {
        const hasOrigVal = origPred !== undefined;
        const diffLocal = !hasOrigVal || origPred.pred_local !== currentExcelVal.local;
        const diffVisitante = !hasOrigVal || origPred.pred_visitante !== currentExcelVal.visitante;

        if (diffLocal || diffVisitante) {
          count++;
        }
      }
    });
    return count;
  };

  const pendingExcelCount = getPendingExcelCount();

  // Rendering Helpers
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
        <RefreshCw className="w-12 h-12 text-yellow-500 animate-spin" />
        <p className="text-zinc-500 text-sm mt-4 font-mono">Iniciando aplicación...</p>
      </div>
    );
  }

  // --- SPLASH LOGIN SCREEN ---
  if (!user) {
    return (
      <main className="min-h-screen bg-zinc-950 flex flex-col justify-center items-center px-6 py-12 relative overflow-hidden">
        {/* Decorative backdrop gradients */}
        <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] rounded-full bg-yellow-500/10 blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] rounded-full bg-amber-500/5 blur-[120px] pointer-events-none"></div>

        <div className="w-full max-w-md bg-zinc-900/55 backdrop-blur-md border border-zinc-800 rounded-3xl p-8 shadow-2xl relative z-10">
          
          {/* Logo Splash */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="h-16 w-16 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl flex items-center justify-center text-4xl mb-4 shadow-inner animate-pulse">
              🏆
            </div>
            <h1 className="text-2xl font-black tracking-wider text-zinc-100 uppercase">Mundial 2026</h1>
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

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsRegistering(true);
                    setLoginError('');
                  }}
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
      </main>
    );
  }

  // --- APP LAYOUT (AUTHENTICATED) ---
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col md:flex-row w-full pb-safe">
      
      {/* 💻 DESKTOP LAYOUT LEFT SIDEBAR NAVIGATION */}
      <aside className="hidden md:flex md:w-64 bg-zinc-900/40 border-r border-zinc-900/60 flex-col justify-between p-6">
        <div className="space-y-8">
          {/* Logo */}
          <div className="flex items-center gap-2 px-2">
            <span className="text-2xl">🏆</span>
            <span className="font-black tracking-wider text-sm uppercase text-zinc-100">MUNDIAL 2026</span>
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

            {user.tipo === 'admin' && (
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
          
          <div className="bg-zinc-950/60 border border-zinc-850 p-3 rounded-xl flex items-center gap-3">
            <img src={user.avatar} className="w-8 h-8 rounded-full border border-zinc-800 bg-zinc-900" alt="avatar" />
            <div className="truncate flex-1">
              <div className="text-xs font-bold text-zinc-300 truncate">{user.nombre}</div>
              <div className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono">{user.tipo}</div>
            </div>
            <button 
              onClick={handleLogout}
              className="text-zinc-500 hover:text-red-400 p-1.5 transition"
              title="Cerrar Sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
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

        {/* Floating Excel Saver Panel */}
        {activeTab === 'partidos' && viewMode === 'excel' && pendingExcelCount > 0 && (
          <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-80 z-40 animate-slide-in-up">
            <div className="glass-card border border-yellow-500/30 p-4 rounded-xl flex flex-col gap-3 shadow-[0_8px_30px_rgba(0,0,0,0.7)]">
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="text-zinc-400">Planilla de Cambios</span>
                <span className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-2 py-0.5 rounded text-[10px] font-black">
                  {pendingExcelCount} Modificados
                </span>
              </div>
              <button
                onClick={handleSaveExcelPlanilla}
                disabled={excelSubmitting}
                className="w-full btn-primary-stitch py-2.5 text-xs flex items-center justify-center gap-2 active:scale-95 shadow-md"
              >
                {excelSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Guardar Planilla</span>
                  </>
                )}
              </button>
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
          <div className="flex items-center gap-2">
            <span className="text-xl">🏆</span>
            <span className="font-black tracking-wider text-sm uppercase text-zinc-100">MUNDIAL 2026</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Direct link for TV screen */}
            <a
              href="/tv"
              target="_blank"
              className="bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-yellow-500 p-2 rounded-lg border border-zinc-800 transition flex items-center justify-center"
              title="Ver Modo TV Airport"
            >
              📺
            </a>
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
              
              {/* Stage, Group Filters & Layout Toggles */}
              <div className="flex flex-col gap-4 bg-zinc-900/40 border border-zinc-900/60 p-4 rounded-2xl md:p-6 md:rounded-3xl">
                <div className="flex justify-between items-center text-xs font-bold text-zinc-400 uppercase tracking-widest">
                  <span>Filtros de Cartelera</span>
                  
                  {/* View Toggles (Cards / Excel) */}
                  <div className="flex gap-1.5 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
                    <button
                      onClick={() => setViewMode('cards')}
                      className={`px-3 py-1.5 rounded-md text-[10px] uppercase font-black transition ${
                        viewMode === 'cards' 
                          ? 'bg-yellow-500 text-zinc-950' 
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      Tarjetas
                    </button>
                    <button
                      onClick={() => setViewMode('excel')}
                      className={`px-3 py-1.5 rounded-md text-[10px] uppercase font-black transition flex items-center gap-1 ${
                        viewMode === 'excel' 
                          ? 'bg-yellow-500 text-zinc-950' 
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      <Grid className="w-3 h-3" />
                      <span>Planilla (Excel)</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-4">
                  <select
                    value={filterFase}
                    onChange={(e) => {
                      setFilterFase(e.target.value);
                      if (e.target.value !== 'Fase de Grupos') {
                        setGroupRemaining(false);
                      }
                    }}
                    className="bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 rounded-lg p-2 md:p-3 outline-none"
                  >
                    <option value="ALL">Todas las Fases</option>
                    <option value="Fase de Grupos">Fase de Grupos</option>
                    <option value="Ronda de 32">Ronda de 32</option>
                    <option value="Octavos de Final">Octavos de Final</option>
                    <option value="Cuartos de Final">Cuartos de Final</option>
                    <option value="Semifinal">Semifinal</option>
                    <option value="Tercer Puesto">Tercer Puesto</option>
                    <option value="Final">Final</option>
                  </select>

                  <select
                    value={filterGrupo}
                    onChange={(e) => {
                      setFilterGrupo(e.target.value);
                      if (e.target.value !== 'ALL') {
                        setGroupRemaining(false);
                      }
                    }}
                    className="bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 rounded-lg p-2 md:p-3 outline-none"
                    disabled={groupRemaining}
                  >
                    <option value="ALL">Todos los Grupos</option>
                    <option value="A">Grupo A</option>
                    <option value="B">Grupo B</option>
                    <option value="C">Grupo C</option>
                    <option value="D">Grupo D</option>
                    <option value="E">Grupo E</option>
                    <option value="F">Grupo F</option>
                    <option value="G">Grupo G</option>
                    <option value="H">Grupo H</option>
                    <option value="I">Grupo I</option>
                    <option value="J">Grupo J</option>
                    <option value="K">Grupo K</option>
                    <option value="L">Grupo L</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => {
                      const newVal = !groupRemaining;
                      setGroupRemaining(newVal);
                      if (newVal) {
                        setFilterFase('Fase de Grupos');
                        setFilterGrupo('ALL');
                        setViewMode('cards');
                      }
                    }}
                    className={`text-xs font-bold p-2 md:p-3 rounded-lg border transition col-span-2 md:col-span-1 cursor-pointer select-none ${
                      groupRemaining
                        ? 'bg-yellow-500 text-zinc-950 border-yellow-600 shadow-[0_0_12px_rgba(255,209,101,0.25)]'
                        : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                    }`}
                  >
                    <span>{groupRemaining ? '📂 Restantes por Grupo' : '📂 Agrupar por Grupo'}</span>
                  </button>
                </div>
              </div>
              {/* VIEW MODE A: TRADITIONAL CARDS LAYOUT */}
              {viewMode === 'cards' && !groupRemaining && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {matches
                    .filter((m) => filterGrupo === 'ALL' || m.grupo === filterGrupo)
                    .filter((m) => filterFase === 'ALL' || m.fase === filterFase)
                    .map((m) => {
                      const myPred = predictions.find((p) => p.match_id === m.id);
                      const isClosed = m.estado !== 'upcoming' || new Date() >= new Date(m.fecha);
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
                                onClick={() => {
                                  setBetModalMatch(m);
                                  setBetPredLocal(0);
                                  setBetPredVisitante(0);
                                }}
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

              {viewMode === 'cards' && groupRemaining && (
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

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {grpMatches.map((m) => {
                              const myPred = predictions.find((p) => p.match_id === m.id);
                              const isClosed = m.estado !== 'upcoming' || new Date() >= new Date(m.fecha);
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
                                        onClick={() => {
                                          setBetModalMatch(m);
                                          setBetPredLocal(0);
                                          setBetPredVisitante(0);
                                        }}
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

              {/* VIEW MODE B: INTERACTIVE EXCEL PLANILLA SPREADSHEET */}
              {viewMode === 'excel' && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
                  
                  {/* Excel Sheet Container Scrollable */}
                  <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                      <thead>
                        <tr className="bg-zinc-950 border-b border-zinc-800 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center">
                          <th className="py-4 px-4 text-left w-24">GRUPO</th>
                          <th className="py-4 px-2 text-right">LOCAL</th>
                          <th className="py-4 w-20">PRONÓSTICO</th>
                          <th className="py-4 px-2 text-left">VISITANTE</th>
                          <th className="py-4 w-24">ESTADO</th>
                        </tr>
</thead>
                      <tbody className="divide-y divide-zinc-900 text-xs">
                        {matches
                          .filter((m) => filterGrupo === 'ALL' || m.grupo === filterGrupo)
                          .filter((m) => filterFase === 'ALL' || m.fase === filterFase)
                          .map((m) => {
                            const isClosed = m.estado !== 'upcoming' || new Date() >= new Date(m.fecha);
                            const origPred = predictions.find((p) => p.match_id === m.id);
                            const hasOrigVal = origPred !== undefined;
                            const currentScore = excelScores[m.id] || { local: 0, visitante: 0 };

                            return (
                              <tr 
                                key={m.id} 
                                className="hover:bg-zinc-950/30 transition text-center align-middle cursor-pointer"
                                onClick={() => {
                                  setSummaryModalMatch(m);
                                  fetchCommunityBets(m.id);
                                }}
                              >
                                {/* Group/Stage Cell */}
                                <td className="py-3 px-4 text-left font-mono font-bold text-zinc-500 uppercase tracking-wide">
                                  GRP {m.grupo}
                                </td>

                                {/* Local Country Cell */}
                                <td className="py-3 px-2 text-right font-extrabold text-zinc-200 uppercase tracking-wide">
                                  <span className="mr-2 text-base">{getTeamFlag(m.local)}</span>
                                  <span>{m.local}</span>
                                </td>

                                {/* Input Prediction cells (Spreadsheet style!) */}
                                <td className="py-3" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center gap-1 justify-center bg-zinc-950/80 border border-zinc-800 rounded-xl p-1 max-w-[90px] mx-auto">
                                    <input
                                      type="number"
                                      min="0"
                                      disabled={isClosed || hasOrigVal}
                                      value={currentScore.local}
                                      onChange={(e) => {
                                        const val = Math.max(0, parseInt(e.target.value) || 0);
                                        setExcelScores((prev) => ({
                                          ...prev,
                                          [m.id]: { ...prev[m.id], local: val }
                                        }));
                                      }}
                                      className="w-7 bg-zinc-900 text-center font-mono font-black text-xs py-1 rounded text-yellow-500 disabled:text-zinc-600 outline-none border border-transparent focus:border-yellow-500/20 disabled:bg-transparent"
                                    />
                                    <span className="text-zinc-700 font-bold">:</span>
                                    <input
                                      type="number"
                                      min="0"
                                      disabled={isClosed || hasOrigVal}
                                      value={currentScore.visitante}
                                      onChange={(e) => {
                                        const val = Math.max(0, parseInt(e.target.value) || 0);
                                        setExcelScores((prev) => ({
                                          ...prev,
                                          [m.id]: { ...prev[m.id], visitante: val }
                                        }));
                                      }}
                                      className="w-7 bg-zinc-900 text-center font-mono font-black text-xs py-1 rounded text-yellow-500 disabled:text-zinc-600 outline-none border border-transparent focus:border-yellow-500/20 disabled:bg-transparent"
                                    />
                                  </div>
                                </td>

                                {/* Visitante Country Cell */}
                                <td className="py-3 px-2 text-left font-extrabold text-zinc-200 uppercase tracking-wide">
                                  <span>{m.visitante}</span>
                                  <span className="ml-2 text-base">{getTeamFlag(m.visitante)}</span>
                                </td>

                                {/* Status Cell */}
                                <td className="py-3 text-center">
                                  {isClosed ? (
                                    <span className="text-zinc-650 text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1">
                                      <Lock className="w-3 h-3 flex-shrink-0" />
                                      <span>Cerrado</span>
                                    </span>
                                  ) : hasOrigVal ? (
                                    <span className="text-emerald-500 text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg max-w-[100px] mx-auto">
                                      <Check className="w-3.5 h-3.5" />
                                      <span>Confirmado</span>
                                    </span>
                                  ) : (
                                    <span className="text-yellow-500 text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1">
                                      <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 animate-pulse"></span>
                                      <span>Abierto</span>
                                    </span>
                                  )}
                                </td>

                              </tr>
                            );
                          })}

                        {matches.length === 0 && (
                          <tr>
                            <td colSpan={5} className="py-12 text-center text-zinc-600 italic">No hay partidos disponibles</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

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

          {/* --- VIEW 5: FIXTURE (WORLD CUP BRACKET) --- */}
          {activeTab === 'fixture' && (
            <section className="space-y-8 select-none">
              
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500 animate-pulse" />
                  <h2 className="text-lg font-black tracking-wider text-zinc-100 uppercase">Fixture del Mundial</h2>
                </div>
                <span className="text-[10px] bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-2.5 py-1 rounded-lg uppercase tracking-wider font-mono font-bold">
                  Quiniela Oficial 2026
                </span>
              </div>

              {/* Monospace info panel */}
              <div className="glass-card border border-zinc-800 p-5 rounded-xl text-xs flex flex-col md:flex-row gap-4 items-center justify-between shadow-lg animate-fade-in">
                <div className="space-y-1 text-center md:text-left">
                  <h4 className="font-extrabold text-sm text-zinc-200">Bracket Interactivo de Eliminatorias</h4>
                  <p className="text-zinc-500 max-w-lg leading-relaxed">
                    Sigue de cerca las etapas decisivas del torneo. Los equipos se cargarán dinámicamente y fluirán hacia la Gran Final a medida que concluyan los partidos de grupo.
                  </p>
                </div>
                <div className="flex items-center gap-3 bg-zinc-950 p-3 border border-zinc-850 rounded-lg">
                  <span className="h-2 w-2 rounded-full bg-red-500 live-dot"></span>
                  <span className="font-mono text-[9px] text-zinc-400 font-bold uppercase tracking-widest">Sincronización SSE Activa</span>
                </div>
              </div>

              {/* Tournament bracket structure container */}
              <div className="overflow-x-auto no-scrollbar pb-6 pt-4">
                <div className="flex flex-col md:flex-row md:justify-between items-stretch gap-6 min-w-[950px] md:min-w-0">
                  
                  {/* ROUND OF 16 (Octavos de Final) */}
                  <div className="flex-1 flex flex-col justify-around gap-6">
                    <h3 className="text-center font-black text-[10px] tracking-widest text-zinc-500 uppercase border-b border-zinc-900 pb-2">OCTAVOS DE FINAL</h3>
                    
                    {/* Octavos Match 1 */}
                    <div className="glass-card p-3 rounded-lg border border-zinc-800/80 space-y-2 relative shadow-md hover:border-yellow-500/20 transition">
                      <span className="absolute top-[-8px] left-3 bg-zinc-950 text-zinc-500 border border-zinc-850 text-[8px] font-mono font-bold px-1.5 rounded uppercase">Match #49</span>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-zinc-300 font-extrabold flex items-center gap-2">🇦🇷 Argentina (1°C)</span>
                        <span className="font-mono font-black text-yellow-500 bg-zinc-950 border border-zinc-850/60 px-1.5 py-0.5 rounded">--</span>
                      </div>
                      <div className="flex justify-between items-center text-xs border-t border-zinc-900/60 pt-1.5">
                        <span className="text-zinc-400 font-semibold flex items-center gap-2">🇺🇸 EE.UU. (2°D)</span>
                        <span className="font-mono font-black text-zinc-650 bg-zinc-950 border border-zinc-850/60 px-1.5 py-0.5 rounded">--</span>
                      </div>
                    </div>

                    {/* Octavos Match 2 */}
                    <div className="glass-card p-3 rounded-lg border border-zinc-800/80 space-y-2 relative shadow-md hover:border-yellow-500/20 transition">
                      <span className="absolute top-[-8px] left-3 bg-zinc-950 text-zinc-500 border border-zinc-850 text-[8px] font-mono font-bold px-1.5 rounded uppercase">Match #50</span>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-zinc-300 font-extrabold flex items-center gap-2">🇫🇷 Francia (1°D)</span>
                        <span className="font-mono font-black text-yellow-500 bg-zinc-950 border border-zinc-850/60 px-1.5 py-0.5 rounded">--</span>
                      </div>
                      <div className="flex justify-between items-center text-xs border-t border-zinc-900/60 pt-1.5">
                        <span className="text-zinc-400 font-semibold flex items-center gap-2">🇸🇦 Ar. Saudita (2°C)</span>
                        <span className="font-mono font-black text-zinc-650 bg-zinc-950 border border-zinc-850/60 px-1.5 py-0.5 rounded">--</span>
                      </div>
                    </div>
                  </div>

                  {/* CONNECTING LINE INDICATOR */}
                  <div className="hidden md:flex flex-col justify-center items-center text-zinc-700 text-lg">➔</div>

                  {/* QUARTER FINALS (Cuartos de Final) */}
                  <div className="flex-1 flex flex-col justify-around gap-6 py-8">
                    <h3 className="text-center font-black text-[10px] tracking-widest text-zinc-500 uppercase border-b border-zinc-900 pb-2">CUARTOS DE FINAL</h3>
                    
                    {/* Cuartos Match 1 */}
                    <div className="glass-card p-4 rounded-lg border border-zinc-800/80 space-y-2 relative shadow-lg hover:border-yellow-500/20 transition">
                      <span className="absolute top-[-8px] left-3 bg-zinc-950 text-zinc-550 border border-zinc-850 text-[8px] font-mono font-bold px-1.5 rounded uppercase">Match #57</span>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-zinc-400 font-semibold">Ganador Match #49</span>
                        <span className="font-mono font-black text-yellow-500 bg-zinc-950 border border-zinc-850/60 px-1.5 py-0.5 rounded">--</span>
                      </div>
                      <div className="flex justify-between items-center text-xs border-t border-zinc-900/60 pt-2">
                        <span className="text-zinc-400 font-semibold">Ganador Match #50</span>
                        <span className="font-mono font-black text-yellow-500 bg-zinc-950 border border-zinc-850/60 px-1.5 py-0.5 rounded">--</span>
                      </div>
                    </div>
                  </div>

                  {/* CONNECTING LINE INDICATOR */}
                  <div className="hidden md:flex flex-col justify-center items-center text-zinc-700 text-lg">➔</div>

                  {/* SEMI FINALS */}
                  <div className="flex-1 flex flex-col justify-around gap-6 py-16">
                    <h3 className="text-center font-black text-[10px] tracking-widest text-zinc-500 uppercase border-b border-zinc-900 pb-2">SEMIFINAL</h3>
                    
                    {/* Semis Match 1 */}
                    <div className="glass-card p-4 rounded-lg border border-yellow-500/25 space-y-2 relative shadow-[0_0_15px_rgba(234,179,8,0.05)] hover:border-yellow-500/40 transition">
                      <span className="absolute top-[-8px] left-3 bg-zinc-950 text-yellow-500 border border-yellow-500/20 text-[8px] font-mono font-bold px-1.5 rounded uppercase">Match #61</span>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-zinc-300 font-bold">Ganador Match #57</span>
                        <span className="font-mono font-black text-yellow-500 bg-zinc-950 border border-zinc-850/60 px-1.5 py-0.5 rounded">--</span>
                      </div>
                      <div className="flex justify-between items-center text-xs border-t border-zinc-900/60 pt-2">
                        <span className="text-zinc-300 font-bold">Ganador Match #58</span>
                        <span className="font-mono font-black text-yellow-500 bg-zinc-950 border border-zinc-850/60 px-1.5 py-0.5 rounded">--</span>
                      </div>
                    </div>
                  </div>

                  {/* CONNECTING LINE INDICATOR */}
                  <div className="hidden md:flex flex-col justify-center items-center text-zinc-700 text-lg">➔</div>

                  {/* GRAN FINAL */}
                  <div className="flex-1 flex flex-col justify-center gap-6 py-20">
                    <h3 className="text-center font-black text-[10px] tracking-widest text-yellow-500 uppercase border-b border-yellow-500/10 pb-2">GRAN FINAL</h3>
                    
                    {/* Final Match Card */}
                    <div className="glass-card p-5 border-2 border-yellow-500 rounded-xl space-y-3 relative shadow-[0_0_24px_rgba(255,209,101,0.15)] scale-105 transition hover:scale-[1.07]">
                      <span className="absolute top-[-10px] left-3 bg-yellow-500 text-zinc-950 text-[9px] font-black px-2 rounded-full uppercase tracking-widest shadow shadow-yellow-500/20">ESTADIO METLIFE</span>
                      <div className="flex justify-between items-center text-xs font-black">
                        <span className="text-zinc-100 flex items-center gap-2">🏆 Ganador Semis #61</span>
                        <span className="font-mono font-black text-yellow-500 bg-zinc-950 border border-zinc-800 px-1.5 py-0.5 rounded">--</span>
                      </div>
                      <div className="flex justify-between items-center text-xs font-black border-t border-zinc-800 pt-3">
                        <span className="text-zinc-100 flex items-center gap-2">🏆 Ganador Semis #62</span>
                        <span className="font-mono font-black text-yellow-500 bg-zinc-950 border border-zinc-800 px-1.5 py-0.5 rounded">--</span>
                      </div>
                      <div className="text-center text-[8px] text-zinc-500 font-bold uppercase tracking-widest pt-1">
                        Nueva York / Nueva Jersey - 19 de Julio
                      </div>
                    </div>
                  </div>

                </div>
              </div>

            </section>
          )}

          {/* --- VIEW 3: PROFILE --- */}
          {activeTab === 'perfil' && (
            <section className="space-y-6 max-w-4xl mx-auto">
              
              <div className="flex items-center gap-2 mb-4">
                <User className="w-5 h-5 text-yellow-500" />
                <h2 className="text-lg font-black tracking-wider text-zinc-100 uppercase">Mi Cuenta</h2>
              </div>

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
                        <button
                          onClick={() => handleToggleUserStatus(u.id, u.activo)}
                          className={`font-bold py-2 px-4 rounded-xl flex items-center gap-1.5 transition ${
                            u.activo 
                              ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20' 
                              : 'bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20'
                          }`}
                        >
                          {u.activo ? (
                            <>
                              <UserX className="w-4 h-4" /> Desactivar
                            </>
                          ) : (
                            <>
                              <UserCheck className="w-4 h-4" /> Activar
                            </>
                          )}
                        </button>
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
        <nav className="fixed bottom-0 left-4 right-4 z-30 max-w-lg mx-auto bottom-nav-glass rounded-2xl shadow-[0_-5px_30px_rgba(0,0,0,0.5)] mb-3 flex items-center justify-around py-3 md:hidden">
          
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
          {user.tipo === 'admin' && (
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

              {/* Match Statistics (ESPN Progress Bars style) */}
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

              {/* Community Predictions list */}
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b border-zinc-800 pb-1.5">
                  <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest">Apuestas de la Comunidad</h4>
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Pronósticos realizados</span>
                </div>

                {loadingSummaryBets ? (
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
