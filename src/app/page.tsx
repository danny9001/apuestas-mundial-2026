'use strict';

'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  Activity,
  Bell,
  BellOff,
  Building2,
  Users,
  MessageSquare,
  Mail,
  Download,
  Trash2,
  LayoutDashboard,
  Home,
  Pencil,
  KeyRound,
  Send,
} from 'lucide-react';

const TEAM_CODES: { [key: string]: string } = {
  // Grupo A
  'México': 'mx',
  'Sudáfrica': 'za',
  'Corea del Sur': 'kr',
  'República Checa': 'cz',
  // Grupo B
  'Canadá': 'ca',
  'Bosnia y Herzegovina': 'ba',
  'Qatar': 'qa',
  'Suiza': 'ch',
  // Grupo C
  'Brasil': 'br',
  'Marruecos': 'ma',
  'Haití': 'ht',
  'Escocia': 'gb-sct',
  // Grupo D
  'Estados Unidos': 'us',
  'Paraguay': 'py',
  'Australia': 'au',
  'Turquía': 'tr',
  // Grupo E
  'Alemania': 'de',
  'Curazao': 'cw',
  'Costa de Marfil': 'ci',
  'Ecuador': 'ec',
  // Grupo F
  'Países Bajos': 'nl',
  'Japón': 'jp',
  'Suecia': 'se',
  'Túnez': 'tn',
  // Grupo G
  'Bélgica': 'be',
  'Egipto': 'eg',
  'Irán': 'ir',
  'Nueva Zelanda': 'nz',
  // Grupo H
  'España': 'es',
  'Cabo Verde': 'cv',
  'Arabia Saudita': 'sa',
  'Uruguay': 'uy',
  // Grupo I
  'Francia': 'fr',
  'Senegal': 'sn',
  'Irak': 'iq',
  'Noruega': 'no',
  // Grupo J
  'Argentina': 'ar',
  'Argelia': 'dz',
  'Austria': 'at',
  'Jordania': 'jo',
  // Grupo K
  'Portugal': 'pt',
  'RD Congo': 'cd',
  'Uzbekistán': 'uz',
  'Colombia': 'co',
  // Grupo L
  'Inglaterra': 'gb-eng',
  'Croacia': 'hr',
  'Ghana': 'gh',
  'Panamá': 'pa',
};

function getTeamFlag(name: string): React.ReactNode {
  if (!name) return '🏳️';
  const code = TEAM_CODES[name];
  if (code) {
    return (
      <img
        src={`https://flagcdn.com/w40/${code}.png`}
        alt={name}
        className="inline-block align-middle w-[1.3em] h-[0.9em] object-cover rounded-[0.15em] shadow-sm border border-neutral-850/60 flex-shrink-0"
      />
    );
  }
  return '🏳️';
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

const PHASES_APUESTA = [
  { key: 'Grupos',          label: 'Fase de Grupos',   short: 'Grupos' },
  { key: 'Ronda de 32',     label: 'Ronda de 32',       short: 'R32' },
  { key: 'Octavos de Final',label: 'Octavos de Final',  short: 'Octavos' },
  { key: 'Cuartos de Final',label: 'Cuartos de Final',  short: 'Cuartos' },
  { key: 'Semifinal',       label: 'Semifinal',          short: 'Semi' },
  { key: 'Tercer Puesto',   label: 'Tercer Puesto',      short: '3°' },
  { key: 'Final',           label: 'Gran Final',         short: 'Final' },
] as const;

const DEFAULT_MODOS_POR_FASE: Record<string, string> = Object.fromEntries(
  PHASES_APUESTA.map(p => [p.key, 'partido'])
);

export default function PWAAppPage() {
  // Session & Authentication
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState<any | null>(null);

  // Session idle timeout
  const [showIdleWarning, setShowIdleWarning] = useState(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const IDLE_WARNING_MS = 30 * 60 * 1000;
  const IDLE_LOGOUT_MS = 35 * 60 * 1000;

  // PWA Push
  const [pushSubscribed, setPushSubscribed] = useState(false);

  // PWA Install
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

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
  const [userPasskeys, setUserPasskeys] = useState<any[]>([]);
  const [registerNombre, setRegisterNombre] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [registerCompanyIds, setRegisterCompanyIds] = useState<number[]>([]);
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
  const [registerError, setRegisterError] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);

  // Active Bottom Tab
  const [activeTab, setActiveTab] = useState<'dashboard' | 'partidos' | 'ranking' | 'perfil' | 'admin' | 'fixture' | 'reglas'>('dashboard');
  const [groupDate, setGroupDate] = useState(true);
  const [fixtureGroupDate, setFixtureGroupDate] = useState(true);
  const [fixtureSubTab, setFixtureSubTab] = useState<'partidos' | 'posiciones' | 'eliminatoria'>('partidos');

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
      showToast(user.denegado
        ? '🚫 Tu solicitud fue denegada. Contacta al administrador.'
        : '⚠️ Tu cuenta está pendiente de aprobación por el administrador.');
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
  const [newUserTipo, setNewUserTipo] = useState<'user' | 'admin' | 'superadmin'>('user');
  const [newUserCompanyId, setNewUserCompanyId] = useState<number | ''>('');
  const [newUserSubmitting, setNewUserSubmitting] = useState(false);

  // Admin sub-tab
  const [adminSubTab, setAdminSubTab] = useState<'usuarios' | 'empresa' | 'mensajes'>('usuarios');

  // Admin Edit User Modal
  const [editUserModal, setEditUserModal] = useState<any | null>(null);
  const [editUserNombre, setEditUserNombre] = useState('');
  const [editUserEmail, setEditUserEmail] = useState('');
  const [editUserTelefono, setEditUserTelefono] = useState('');
  const [editUserTipo, setEditUserTipo] = useState('');
  const [editUserPassword, setEditUserPassword] = useState('');
  const [editUserSubmitting, setEditUserSubmitting] = useState(false);
  const [editUserError, setEditUserError] = useState('');
  const [editUserCompanyIds, setEditUserCompanyIds] = useState<number[]>([]);

  // Company edit modal (admin can edit their company)
  const [editCompanyModal, setEditCompanyModal] = useState<any | null>(null);
  const [editCompanyNombre, setEditCompanyNombre] = useState('');
  const [editCompanyColor, setEditCompanyColor] = useState('#6366f1');
  const [editCompanyMonto, setEditCompanyMonto] = useState('150');
  const [editCompanyModos, setEditCompanyModos] = useState<Record<string, string>>({ ...DEFAULT_MODOS_POR_FASE });
  const [editCompanySubmitting, setEditCompanySubmitting] = useState(false);
  const [expandedCompanyModos, setExpandedCompanyModos] = useState<number | null>(null);

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

  // Companies
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [newCompanyNombre, setNewCompanyNombre] = useState('');
  const [newCompanyColor, setNewCompanyColor] = useState('#6366f1');
  const [newCompanyMonto, setNewCompanyMonto] = useState<string>('150');
  const [newCompanyModos, setNewCompanyModos] = useState<Record<string, string>>({ ...DEFAULT_MODOS_POR_FASE });
  const [companySubmitting, setCompanySubmitting] = useState(false);
  const [companySelectModal, setCompanySelectModal] = useState(false);
  const [editingMontoId, setEditingMontoId] = useState<number | null>(null);
  const [editingMontoValue, setEditingMontoValue] = useState<string>('');

  // Groups
  const [groups, setGroups] = useState<any[]>([]);
  const [newGroupNombre, setNewGroupNombre] = useState('');
  const [newGroupColor, setNewGroupColor] = useState('#10b981');
  const [groupSubmitting, setGroupSubmitting] = useState(false);
  const [groupMembersModal, setGroupMembersModal] = useState<any | null>(null);
  const [groupMembers, setGroupMembers] = useState<any[]>([]);

  // Notifications — admin create form
  const [notifTitulo, setNotifTitulo] = useState('');
  const [notifContenido, setNotifContenido] = useState('');
  const [notifTipo, setNotifTipo] = useState<'info' | 'warning' | 'success' | 'error'>('info');
  const [notifTargetType, setNotifTargetType] = useState<'all' | 'group' | 'user' | 'company'>('all');
  const [notifTargetId, setNotifTargetId] = useState<number | null>(null);
  const [notifExpiresAt, setNotifExpiresAt] = useState('');
  const [notifSubmitting, setNotifSubmitting] = useState(false);

  // Notifications — user-facing
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notifPanelOpen, setNotifPanelOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Extended branding settings
  const [editPrimaryColor, setEditPrimaryColor] = useState('#eab308');
  const [editSubtitle, setEditSubtitle] = useState('');
  const [editContactWhatsapp, setEditContactWhatsapp] = useState('');
  const [editContactEmail, setEditContactEmail] = useState('');

  // Load App Settings
  const fetchSettings = async () => {
    try {
      const res = await fetch(`/api/settings?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.app_name) setAppName(data.app_name);
        if (data.app_logo) setAppLogo(data.app_logo);
        if (data.app_subtitle) setEditSubtitle(data.app_subtitle);
        if (data.contact_whatsapp) setEditContactWhatsapp(data.contact_whatsapp);
        if (data.contact_email) setEditContactEmail(data.contact_email);
      }
    } catch (e) {
      console.error('Failed to fetch settings:', e);
    }
  };


  const getStandings = (matchesList: any[]) => {
    const standings: Record<string, any[]> = {};
    const groupMatches = matchesList.filter((m) => m.fase === 'Fase de Grupos');
    
    ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'].forEach((g) => {
      standings[g] = [];
    });

    const ensureTeam = (grp: string, team: string) => {
      if (!team || team.includes('A confirmar') || team.startsWith('Ganador')) return null;
      if (!standings[grp]) return null;
      let s = standings[grp].find((x: any) => x.team === team);
      if (!s) {
        s = { team, pts: 0, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, dif: 0 };
        standings[grp].push(s);
      }
      return s;
    };

    groupMatches.forEach((m) => {
      if (!m.grupo) return;
      const s1 = ensureTeam(m.grupo, m.local);
      const s2 = ensureTeam(m.grupo, m.visitante);
      
      if (s1 && s2 && m.estado !== 'upcoming' && m.goles_local !== null && m.goles_visitante !== null) {
        const gl = m.goles_local;
        const gv = m.goles_visitante;
        
        s1.pj++; s2.pj++;
        s1.gf += gl; s2.gf += gv;
        s1.gc += gv; s2.gc += gl;
        s1.dif = s1.gf - s1.gc;
        s2.dif = s2.gf - s2.gc;
        
        if (gl > gv) {
          s1.pg++; s1.pts += 3;
          s2.pp++;
        } else if (gl < gv) {
          s2.pg++; s2.pts += 3;
          s1.pp++;
        } else {
          s1.pe++; s1.pts += 1;
          s2.pe++; s2.pts += 1;
        }
      }
    });

    Object.keys(standings).forEach((grp) => {
      standings[grp].sort((a: any, b: any) => {
        if (b.pts !== a.pts) return b.pts - a.pts;
        if (b.dif !== a.dif) return b.dif - a.dif;
        return b.gf - a.gf;
      });
    });

    return standings;
  };

  // Group matches by date helper
  const getMatchesByDate = (matchesList: any[]) => {
    const sorted = [...matchesList].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
    const groups: { dateStr: string; matches: any[] }[] = [];
    sorted.forEach((m) => {
      const d = new Date(m.fecha);
      const dateStr = d.toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      const capitalized = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
      
      const nowStr = new Date().toLocaleDateString('es-ES');
      const matchDayStr = d.toLocaleDateString('es-ES');
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toLocaleDateString('es-ES');
      
      let relativeLabel = '';
      if (matchDayStr === nowStr) {
        relativeLabel = ' (HOY)';
      } else if (matchDayStr === tomorrowStr) {
        relativeLabel = ' (MAÑANA)';
      }

      let group = groups.find((g) => g.dateStr === (capitalized + relativeLabel));
      if (!group) {
        group = { dateStr: capitalized + relativeLabel, matches: [] };
        groups.push(group);
      }
      group.matches.push(m);
    });
    return groups;
  };

  // Helper to render a single match card
  const renderMatchCard = (m: any) => {
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
          className={`bg-neutral-900/50 hover:bg-neutral-900 border ${m.estado === 'live' ? 'border-red-500/40 bg-red-950/5 shadow-[0_0_15px_rgba(239,68,68,0.08)]' : 'border-neutral-850 hover:border-neutral-700/60'} rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 transition cursor-pointer relative`}
        >
          {/* Left: Info badge + Time */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded font-mono flex-shrink-0 ${m.estado === 'live' ? 'bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse' : 'bg-neutral-800/80 text-neutral-400'}`}>
              {m.estado === 'live' ? 'VIVO' : `G${m.grupo}`}
            </span>
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-bold text-neutral-355 truncate">{m.fase}</span>
              <span className="text-[9px] text-neutral-500 font-mono truncate">
                {m.estado === 'upcoming' ? new Date(m.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : m.estado === 'live' ? 'Jugándose' : 'Finalizado'}
              </span>
            </div>
          </div>

          {/* Middle: Teams and Score */}
          <div className="flex items-center justify-center gap-2 flex-grow-[2] w-[45%] text-xs font-bold text-neutral-200">
            <div className="flex items-center gap-1.5 w-[42%] justify-end min-w-0">
              <span className="truncate uppercase text-xs font-black text-neutral-100 text-right">{m.local}</span>
              <span className="text-base select-none flex-shrink-0">{getTeamFlag(m.local)}</span>
            </div>
            
            <div className="px-2 py-0.5 bg-neutral-950/95 border border-neutral-850 rounded font-mono text-[11px] font-black text-center min-w-[38px] flex-shrink-0">
              {m.estado !== 'upcoming' ? `${m.goles_local}-${m.goles_visitante}` : 'VS'}
            </div>

            <div className="flex items-center gap-1.5 w-[42%] justify-start min-w-0">
              <span className="text-base select-none flex-shrink-0">{getTeamFlag(m.visitante)}</span>
              <span className="truncate uppercase text-xs font-black text-neutral-100 text-left">{m.visitante}</span>
            </div>
          </div>

          {/* Right: User bet / Button */}
          <div className="flex items-center justify-end gap-2 text-right min-w-0 flex-1" onClick={(e) => e.stopPropagation()}>
            {myPred ? (
              <div className="flex flex-col items-end">
                <span className="text-[9px] text-neutral-500 font-medium">Mi apuesta</span>
                <span className="font-bold text-neutral-200 text-xs font-mono">{myPred.pred_local} - {myPred.pred_visitante}</span>
              </div>
            ) : isClosed ? (
              <span className="text-[9px] text-neutral-500 italic">Sin apuesta</span>
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
        <div className="flex justify-between items-center border-b border-neutral-800/40 pb-3 text-[11px] font-bold tracking-wider text-neutral-400" onClick={(e) => e.stopPropagation()}>
          <span>{m.fase.toUpperCase()} - GRP {m.grupo}</span>
          
          {m.estado === 'live' && (
            <span className="text-red-500 font-extrabold flex items-center gap-1 text-[10px]">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500 live-dot"></span> EN VIVO
            </span>
          )}

          {m.estado === 'finished' && (
            <span className="text-neutral-550 font-semibold uppercase text-[10px]">FINALIZADO</span>
          )}

          {m.estado === 'upcoming' && (
            <span className="text-neutral-550 font-semibold text-[10px]">
              {new Date(m.fecha).toLocaleDateString('es-ES', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          )}
        </div>

        {/* Teams and Score rows */}
        <div className="flex flex-col gap-3 py-1">
          {/* Local */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-xl select-none flex-shrink-0">{getTeamFlag(m.local)}</span>
              <span className="font-extrabold text-neutral-100 uppercase truncate">{m.local}</span>
            </div>
            {m.estado !== 'upcoming' && (
              <span className="font-black text-base font-mono text-neutral-100">{m.goles_local}</span>
            )}
          </div>

          {/* Visitante */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-xl select-none flex-shrink-0">{getTeamFlag(m.visitante)}</span>
              <span className="font-extrabold text-neutral-100 uppercase truncate">{m.visitante}</span>
            </div>
            {m.estado !== 'upcoming' && (
              <span className="font-black text-base font-mono text-neutral-100">{m.goles_visitante}</span>
            )}
          </div>
        </div>

        {/* Footer Card action */}
        <div 
          className="flex justify-between items-center border-t border-neutral-800/40 pt-3 text-xs" 
          onClick={(e) => e.stopPropagation()}
        >
          {myPred ? (
            <div className="flex items-center justify-between w-full">
              <div className="flex flex-col">
                <span className="text-[9px] text-neutral-555 font-semibold uppercase tracking-wider">Mi apuesta</span>
                <span className="font-bold text-neutral-200 text-sm font-mono mt-0.5">{myPred.pred_local} - {myPred.pred_visitante}</span>
              </div>
              <div className="flex items-center gap-2">
                {isClosed ? (
                  <span className="text-[9px] text-neutral-555 font-semibold uppercase tracking-wider italic">Apuestas Cerradas</span>
                ) : (
                  <button 
                    onClick={() => openBetModalForMatch(m)}
                    className="text-[10px] font-black text-yellow-500 hover:text-yellow-400 uppercase tracking-wider"
                  >
                    Editar
                  </button>
                )}
                {isClosed && myPred.puntos !== null && (
                  <span className="bg-yellow-500 text-neutral-950 font-black px-2.5 py-1 rounded text-[10px] font-mono shadow-[0_0_12px_rgba(234,179,8,0.2)]">
                    +{myPred.puntos} PTS
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full">
              <span className="text-[9px] text-neutral-555 font-semibold uppercase tracking-wider">Sin apuesta registrada</span>
              {isClosed ? (
                <span className="text-[9px] text-red-500/80 font-black uppercase tracking-wider">Apuesta Cerrada</span>
              ) : (
                <button 
                  onClick={() => openBetModalForMatch(m)}
                  className="btn-primary-stitch px-3.5 py-1.5 text-[9.5px] tracking-wider uppercase font-black"
                >
                  Apostar
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Load Session on Mount
  const checkSession = async () => {
    try {
      const res = await fetch(`/api/auth?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setActiveTab('dashboard');
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

      // Fetch Users if Admin or SuperAdmin
      if (user && (user.tipo === 'admin' || user.tipo === 'superadmin')) {
        const uRes = await fetch(`/api/admin/users?t=${Date.now()}`);
        if (uRes.ok) {
          const uData = await uRes.json();
          setAdminUsers(uData);
        }
      }

      // Fetch companies, groups, and notifications in parallel
      const [companiesRes, groupsRes] = await Promise.all([
        fetch(`/api/companies?t=${Date.now()}`),
        fetch(`/api/groups?t=${Date.now()}`),
      ]);
      if (companiesRes.ok) setCompanies(await companiesRes.json());
      if (groupsRes.ok) setGroups(await groupsRes.json());

      if (user) {
        const nRes = await fetch(`/api/notifications?t=${Date.now()}`);
        if (nRes.ok) {
          const nData: any[] = await nRes.json();
          setNotifications(nData);
          setUnreadCount(nData.filter((n) => !n.leido).length);
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

  const fetchCompanies = async () => {
    try {
      const res = await fetch(`/api/companies?t=${Date.now()}`);
      if (res.ok) setCompanies(await res.json());
    } catch (e) {}
  };

  const fetchGroups = async () => {
    try {
      const res = await fetch(`/api/groups?t=${Date.now()}`);
      if (res.ok) setGroups(await res.json());
    } catch (e) {}
  };

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/notifications?t=${Date.now()}`);
      if (res.ok) {
        const data: any[] = await res.json();
        setNotifications(data);
        setUnreadCount(data.filter((n) => !n.leido).length);
      }
    } catch (e) {}
  };

  const fetchGroupMembers = async (groupId: number) => {
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'members', groupId }),
      });
      if (res.ok) setGroupMembers(await res.json());
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
    if (!email.trim()) {
      setPasskeyError('Ingresa tu correo electrónico primero para usar la llave FIDO');
      return;
    }
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

  // Available companies for selector
  const getAvailableCompanies = () => {
    if (!user) return [];
    if (user.tipo === 'superadmin') {
      return companies;
    }
    return user.companies || [];
  };

  // Synchronize selected company with available companies list
  useEffect(() => {
    const available = getAvailableCompanies();
    if (available.length > 0) {
      const isValidSelection = available.some((c: any) => c.id === selectedCompanyId);
      if (!isValidSelection) {
        setSelectedCompanyId(available[0].id);
      }
    } else {
      setSelectedCompanyId(null);
    }
  }, [user, companies]);

  // Load admin data when admin tab is opened
  useEffect(() => {
    if (user && activeTab === 'admin') {
      if (user.tipo === 'superadmin') {
        fetchSyncStatus();
        fetchGroups();
      }
      fetchCompanies();
    }
  }, [activeTab, user]);

  useEffect(() => {
    if (user && activeTab === 'admin' && user.tipo === 'superadmin') {
      setEditAppName(appName);
      if (appLogo.startsWith('/') || appLogo.startsWith('http')) {
        setEditLogoType('file');
      } else {
        setEditLogoType('emoji');
        setEditLogoEmoji(appLogo);
      }
    }
  }, [activeTab, appName, appLogo, user]);

  const fetchPasskeys = async () => {
    try {
      const res = await fetch(`/api/auth/webauthn/passkeys?t=${Date.now()}`);
      if (res.ok) setUserPasskeys(await res.json());
    } catch (e) {}
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

  // Load personal stats when profile tab is opened
  useEffect(() => {
    if (user && activeTab === 'perfil') { fetchMyStats(); fetchPasskeys(); }
  }, [activeTab, user]);

  // Kickoff Countdown Timer Effect
  useEffect(() => {
    const updateTimer = () => {
      const upcoming = matches
        .filter((m: any) => m.estado === 'upcoming' && new Date(m.fecha).getTime() > Date.now())
        .sort((a: any, b: any) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
      
      const nextMatch = upcoming[0];
      const targetDate = nextMatch ? new Date(nextMatch.fecha) : new Date('2026-06-11T16:00:00-04:00'); // Bolivia Time Kickoff
      
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
  }, [matches]);

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
        } else if (payload.type === 'notification') {
          fetchNotifications();
          showToast(`🔔 ${payload.data.titulo}`);
        }
      } catch (e) {
        // Ignored parsing errors
      }
    };

    return () => {
      sse.close();
    };
  }, [user, summaryModalMatch]);

  // PWA push subscription — runs after login
  useEffect(() => {
    if (!user) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) return;

    function urlBase64ToUint8Array(base64String: string): Uint8Array {
      const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
      const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
      const rawData = window.atob(base64);
      const output = new Uint8Array(rawData.length);
      for (let i = 0; i < rawData.length; ++i) output[i] = rawData.charCodeAt(i);
      return output;
    }

    async function subscribeToPush() {
      try {
        const registration = await navigator.serviceWorker.ready;
        const existing = await registration.pushManager.getSubscription();
        if (existing) { setPushSubscribed(true); return; }
        const sub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey!).buffer as ArrayBuffer,
        });
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(JSON.parse(JSON.stringify(sub))),
        });
        setPushSubscribed(true);
      } catch (err) {
        console.error('Push subscription failed:', err);
      }
    }

    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') subscribeToPush();
    });
  }, [user]);

  // PWA Install prompt
  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true;
    if (isStandalone) { setIsInstalled(true); return; }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler as EventListener);
    window.addEventListener('appinstalled', () => { setIsInstalled(true); setDeferredPrompt(null); });
    return () => window.removeEventListener('beforeinstallprompt', handler as EventListener);
  }, []);

  // Session idle timeout — 30min warning, 35min logout
  useEffect(() => {
    if (!user) return;

    const resetTimers = () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      setShowIdleWarning(false);
      idleTimerRef.current = setTimeout(() => {
        setShowIdleWarning(true);
        warningTimerRef.current = setTimeout(() => {
          handleLogout();
        }, IDLE_LOGOUT_MS - IDLE_WARNING_MS);
      }, IDLE_WARNING_MS);
    };

    const refreshInterval = setInterval(() => {
      fetch('/api/auth/refresh', { method: 'POST' }).catch(() => {});
    }, 10 * 60 * 1000);

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'] as const;
    events.forEach((e) => window.addEventListener(e, resetTimers, { passive: true }));
    resetTimers();

    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimers));
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      clearInterval(refreshInterval);
    };
  }, [user]);

  const handleInstallPWA = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') { setIsInstalled(true); setDeferredPrompt(null); }
  };

  function urlBase64ToUint8ArrayForToggle(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const output = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) output[i] = rawData.charCodeAt(i);
    return output;
  }

  const handleTogglePush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      showToast('Tu navegador no soporta notificaciones push');
      return;
    }
    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    if (existing) {
      await existing.unsubscribe();
      await fetch('/api/push/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: existing.endpoint }),
      });
      setPushSubscribed(false);
      showToast('🔕 Notificaciones desactivadas');
    } else {
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) { showToast('Notificaciones no configuradas'); return; }
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') { showToast('Permiso de notificaciones denegado'); return; }
      try {
        const sub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8ArrayForToggle(publicKey).buffer as ArrayBuffer,
        });
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(JSON.parse(JSON.stringify(sub))),
        });
        setPushSubscribed(true);
        showToast('🔔 Notificaciones activadas');
      } catch {
        showToast('Error al activar notificaciones');
      }
    }
  };

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
        setActiveTab('dashboard');
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
          password: registerPassword,
          telefono: registerPhone || undefined,
          company_ids: registerCompanyIds.length ? registerCompanyIds : undefined,
        })
      });

      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        setActiveTab('dashboard');
        showToast('¡Registro exitoso! Bienvenido.');
        // Clean form states
        setRegisterNombre('');
        setRegisterEmail('');
        setRegisterPassword('');
        setRegisterConfirmPassword('');
        setRegisterPhone('');
        setRegisterCompanyIds([]);
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

  const handleApproveUser = async (userId: number) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', userId }),
      });
      if (res.ok) {
        const d = await res.json();
        setAdminUsers((prev) => prev.map((u) => u.id === userId ? { ...u, ...d.user } : u));
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
        setAdminUsers((prev) => prev.map((u) => u.id === userId ? { ...u, ...d.user } : u));
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
        setAdminUsers((prev) => prev.map((u) => u.id === userId ? { ...u, ...d.user } : u));
        showToast('⏳ Usuario puesto en espera nuevamente');
      } else {
        const d = await res.json(); showToast(d.error || 'Error');
      }
    } catch { showToast('Error de red'); }
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

      formData.append('app_subtitle', editSubtitle);
      formData.append('contact_whatsapp', editContactWhatsapp);
      formData.append('contact_email', editContactEmail);

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
          tipo: newUserTipo,
          companyId: newUserCompanyId || undefined,
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
        setNewUserCompanyId('');
      } else {
        showToast(`Error: ${data.error || 'No se pudo crear el usuario'}`);
      }
    } catch (err: any) {
      showToast('Error de red al crear el usuario');
    } finally {
      setNewUserSubmitting(false);
    }
  };

  // --- Company handlers ---
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
        showToast('🏢 Empresa creada con éxito');
        setNewCompanyNombre('');
        setNewCompanyMonto('150');
        setNewCompanyModos({ ...DEFAULT_MODOS_POR_FASE });
        await fetchCompanies();
      } else {
        const d = await res.json();
        showToast(d.error || 'Error al crear empresa');
      }
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
      if (res.ok) {
        showToast('Empresa eliminada');
        await fetchCompanies();
        await fetchAppData();
      } else {
        const d = await res.json();
        showToast(d.error || 'Error');
      }
    } catch { showToast('Error de red'); }
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
        if (editUserTipo === 'admin' && user.tipo === 'superadmin') {
          await fetch('/api/admin/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'setCompanies', userId: editUserModal.id, companyIds: editUserCompanyIds }),
          });
        }
        setAdminUsers((prev) => prev.map((u) => u.id === editUserModal.id ? { ...u, ...d.user } : u));
        showToast('✅ Usuario actualizado');
        setEditUserModal(null);
        const uRes = await fetch(`/api/admin/users?t=${Date.now()}`);
        if (uRes.ok) setAdminUsers(await uRes.json());
      } else {
        setEditUserError(d.error || 'Error al guardar');
      }
    } catch { setEditUserError('Error de red'); }
    finally { setEditUserSubmitting(false); }
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
      if (res.ok) {
        showToast('💰 Monto actualizado');
        setEditingMontoId(null);
        await fetchCompanies();
      } else {
        const d = await res.json(); showToast(d.error || 'Error');
      }
    } catch { showToast('Error de red'); }
  };

  const handleSaveEditCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCompanyModal) return;
    setEditCompanySubmitting(true);
    try {
      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          id: editCompanyModal.id,
          nombre: editCompanyNombre.trim(),
          color: editCompanyColor,
          monto_participacion: parseFloat(editCompanyMonto) || 150,
          modos_por_fase: editCompanyModos,
        }),
      });
      if (res.ok) {
        showToast('✅ Empresa actualizada');
        setEditCompanyModal(null);
        await fetchCompanies();
      } else {
        const d = await res.json(); showToast(d.error || 'Error');
      }
    } catch { showToast('Error de red'); }
    finally { setEditCompanySubmitting(false); }
  };

  const handleToggleUserCompany = async (userId: number, companyId: number, currentlyMember: boolean) => {
    try {
      await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'assignCompany', userId, companyId, assign: !currentlyMember }),
      });
      setAdminUsers((prev) =>
        prev.map((u) => {
          if (u.id !== userId) return u;
          const updatedCompanies = currentlyMember
            ? u.companies.filter((c: any) => c.id !== companyId)
            : [...u.companies, companies.find((c) => c.id === companyId)].filter(Boolean);
          return { ...u, companies: updatedCompanies };
        })
      );
    } catch { showToast('Error de red'); }
  };

  // --- Group handlers ---
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setGroupSubmitting(true);
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', nombre: newGroupNombre, color: newGroupColor }),
      });
      if (res.ok) {
        showToast('👥 Grupo creado');
        setNewGroupNombre('');
        await fetchGroups();
      } else {
        const d = await res.json();
        showToast(d.error || 'Error');
      }
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

  // --- Notification handlers ---
  const handleCreateNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotifSubmitting(true);
    try {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo: notifTitulo,
          contenido: notifContenido,
          tipo: notifTipo,
          target_type: notifTargetType,
          target_id: notifTargetId,
          expires_at: notifExpiresAt || null,
        }),
      });
      if (res.ok) {
        showToast('🔔 Notificación enviada');
        setNotifTitulo('');
        setNotifContenido('');
        setNotifTargetType('all');
        setNotifTargetId(null);
        setNotifExpiresAt('');
      } else {
        const d = await res.json();
        showToast(d.error || 'Error');
      }
    } catch { showToast('Error de red'); }
    finally { setNotifSubmitting(false); }
  };

  const handleMarkNotificationRead = async (notificationId?: number) => {
    try {
      await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId }),
      });
      await fetchNotifications();
    } catch {}
  };

  // Rendering Helpers
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-4">
        <RefreshCw className="w-12 h-12 text-yellow-500 animate-spin" />
      </div>
    );
  }



  // --- APP LAYOUT (AUTHENTICATED) ---
  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col md:flex-row w-full pb-safe">
      
      {/* 💻 DESKTOP LAYOUT LEFT SIDEBAR NAVIGATION */}
      <aside className="hidden md:flex md:w-64 bg-neutral-900/40 border-r border-neutral-900/60 flex-col justify-between p-6 md:sticky md:top-0 md:h-screen">
        <div className="space-y-8">
          {/* Logo */}
          <div className="flex items-center gap-2.5 px-2">
            {appLogo.startsWith('/') || appLogo.startsWith('http') ? (
              <img src={appLogo} className="w-7 h-7 object-contain rounded-md flex-shrink-0" alt="logo" />
            ) : (
              <span className="text-2xl flex-shrink-0">{appLogo}</span>
            )}
            <span className="font-black tracking-wider text-sm uppercase text-neutral-100 truncate">{appName}</span>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-2">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
                activeTab === 'dashboard' 
                  ? 'btn-primary-stitch shadow-md' 
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/50 border border-transparent'
              }`}
            >
              <Home className="w-4 h-4" />
              <span>Inicio</span>
            </button>
            <button
              onClick={() => setActiveTab('partidos')}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
                activeTab === 'partidos' 
                  ? 'btn-primary-stitch shadow-md' 
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/50 border border-transparent rounded-lg'
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
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/50 border border-transparent rounded-lg'
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
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/50 border border-transparent rounded-lg'
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
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/50 border border-transparent rounded-lg'
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
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/50 border border-transparent rounded-lg'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Mi Perfil</span>
            </button>

            {user && (user.tipo === 'admin' || user.tipo === 'superadmin') && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
                  activeTab === 'admin'
                    ? 'btn-primary-stitch shadow-md'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/50 border border-transparent rounded-lg'
                }`}
              >
                {user.tipo === 'superadmin' ? <ShieldAlert className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                <span>{user.tipo === 'superadmin' ? 'Super Admin' : 'Mi Empresa'}</span>
              </button>
            )}
          </nav>
        </div>

        {/* Desktop Sidebar Footer */}
        <div className="space-y-4">
          {!isInstalled && deferredPrompt && (
            <button
              onClick={handleInstallPWA}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs font-bold hover:bg-yellow-500/20 transition"
              title="Instalar aplicación"
            >
              <Download className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Instalar aplicación</span>
            </button>
          )}
          {user ? (
            <div className="bg-neutral-950/60 border border-neutral-850 p-3 rounded-xl flex items-center gap-3">
              <img src={user.avatar} className="w-8 h-8 rounded-full border border-neutral-800 bg-neutral-900" alt="avatar" />
              <div className="truncate flex-1">
                <div className="text-xs font-bold text-neutral-300 truncate">{user.nombre}</div>
                <div className="text-[9px] text-neutral-500 uppercase tracking-widest font-mono">{user.tipo}</div>
              </div>
              {/* Bell: toggle push notifications */}
              <button
                onClick={handleTogglePush}
                className={`relative p-1.5 transition flex items-center justify-center flex-shrink-0 ${pushSubscribed ? 'text-yellow-500 hover:text-yellow-400' : 'text-neutral-500 hover:text-neutral-300'}`}
                title={pushSubscribed ? 'Desactivar notificaciones push' : 'Activar notificaciones push'}
              >
                {pushSubscribed ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
              </button>
              {/* Mail: open in-app messages panel */}
              <button
                onClick={() => setNotifPanelOpen(true)}
                className="relative text-neutral-400 hover:text-yellow-500 p-1.5 transition flex items-center justify-center flex-shrink-0"
                title="Mensajes"
              >
                <Mail className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 text-white text-[7px] font-black rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                className="text-neutral-555 hover:text-yellow-500 p-1.5 transition flex items-center justify-center flex-shrink-0"
                title={theme === 'light' ? 'Modo Oscuro' : 'Modo Claro'}
              >
                {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </button>
              <button
                onClick={handleLogout}
                className="text-neutral-555 hover:text-red-400 p-1.5 transition flex-shrink-0"
                title="Cerrar Sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="bg-neutral-950/60 border border-neutral-850 p-3 rounded-xl flex justify-between items-center gap-2">
              <button
                onClick={() => setActiveTab('perfil')}
                className="btn-primary-stitch w-full py-2.5 text-xs tracking-wider uppercase flex items-center justify-center gap-2"
              >
                <span>🔑 Iniciar Sesión</span>
              </button>
              <button 
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                className="text-neutral-555 hover:text-yellow-500 p-2 border border-neutral-850 bg-neutral-900/40 rounded-xl transition flex items-center justify-center flex-shrink-0"
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
            <div className="bg-yellow-500 text-neutral-950 p-4 rounded-2xl flex items-center justify-between shadow-[0_4px_30px_rgba(234,179,8,0.5)] border-2 border-neutral-950 goal-effect">
              <div className="flex items-center gap-3">
                <span className="text-2xl">⚽</span>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-neutral-800">¡GOL EN VIVO!</div>
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
            <div className="glass-card text-neutral-100 px-4 py-3 rounded-lg border border-neutral-800/80 text-xs flex items-center gap-2 shadow-2xl justify-center">
              <Trophy className="w-4 h-4 text-yellow-500 animate-pulse" />
              <span>{toastMessage}</span>
            </div>
          </div>
        )}

        {/* HEADER BAR FOR MOBILE (Hidden on desktop) */}
        <header className="sticky top-0 bg-neutral-950/80 backdrop-blur-md border-b border-neutral-900/60 px-4 py-4 flex justify-between items-center z-30 pt-safe md:hidden">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {appLogo.startsWith('/') || appLogo.startsWith('http') ? (
              <img src={appLogo} className="w-6 h-6 object-contain rounded-md flex-shrink-0" alt="logo" />
            ) : (
              <span className="text-xl flex-shrink-0">{appLogo}</span>
            )}
            <span className="font-black tracking-wider text-sm uppercase text-neutral-100 truncate">{appName}</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* PWA Install button (mobile) */}
            {!isInstalled && deferredPrompt && (
              <button
                onClick={handleInstallPWA}
                className="bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 p-2 rounded-lg border border-yellow-500/30 transition flex items-center justify-center"
                title="Instalar aplicación"
              >
                <Download className="w-4 h-4" />
              </button>
            )}
            {/* Theme Toggle Button */}
            <button
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-yellow-500 p-2 rounded-lg border border-neutral-800 transition flex items-center justify-center"
              title={theme === 'light' ? 'Modo Oscuro' : 'Modo Claro'}
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
            {user && (
              <>
                {/* Bell: toggle push notifications */}
                <button
                  onClick={handleTogglePush}
                  className={`p-2 rounded-lg border transition flex items-center justify-center ${pushSubscribed ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20' : 'bg-neutral-900 border-neutral-800 text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800'}`}
                  title={pushSubscribed ? 'Desactivar notificaciones push' : 'Activar notificaciones push'}
                >
                  {pushSubscribed ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                </button>
                {/* Mail: in-app messages */}
                <button
                  onClick={() => setNotifPanelOpen(true)}
                  className="relative bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-yellow-500 p-2 rounded-lg border border-neutral-800 transition flex items-center justify-center"
                  title="Mensajes"
                >
                  <Mail className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
                <div className="bg-neutral-900 border border-neutral-800 rounded-full px-3 py-1 flex items-center gap-1.5 text-xs text-neutral-300">
                  <img src={user.avatar} className="w-4 h-4 rounded-full" alt="avatar" />
                  <span className="font-bold max-w-[80px] truncate">{user.nombre.split(' ')[0]}</span>
                </div>
              </>
            )}
          </div>
        </header>

        {/* MAIN VIEW CONTROLLER */}
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8 overflow-y-auto pb-24 md:pb-8">
          
          {/* --- VIEW 0: DASHBOARD (INICIO) --- */}
          {activeTab === 'dashboard' && (() => {
            const myRank = user ? leaderboard.find(row => row.user_id === user.id) : null;
            const myCompanyId = user?.companies?.[0]?.id ?? null;
            const companyLeaderboard = myCompanyId
              ? leaderboard.filter(row => (row.companies || []).some((c: any) => c.id === myCompanyId))
              : [];
            const myCompanyRankIndex = companyLeaderboard.findIndex(row => row.user_id === user?.id);
            const myCompanyRank = myCompanyRankIndex >= 0 ? myCompanyRankIndex + 1 : null;
            const userPredictionsCount = user ? predictions.length : 0;
            const userExactsCount = user ? predictions.filter(p => p.puntos === 3).length : 0;
            const upcomingMatches = matches
              .filter((m) => m.estado === 'upcoming' || m.estado === 'live')
              .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
              .slice(0, 3);
            const countdownMatch = matches
              .filter((m) => m.estado === 'upcoming' && new Date(m.fecha).getTime() > Date.now())
              .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())[0];

            return (
              <section className="space-y-6 max-w-5xl mx-auto pb-8">
                
                {/* Welcome Card */}
                {user ? (
                  <div className="bg-gradient-to-r from-yellow-500/15 via-amber-500/5 to-transparent border border-yellow-500/20 rounded-3xl p-6 relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-lg animate-fade-in">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 rounded-full blur-2xl pointer-events-none"></div>
                    <div>
                      <div className="text-[10px] text-yellow-500 font-black uppercase tracking-widest">Resumen de Quiniela</div>
                      <h2 className="text-2xl font-black text-neutral-100 mt-1">¡Hola, {user.nombre}! 👋</h2>
                      <p className="text-neutral-400 text-xs mt-1">
                        Aquí tienes el estado actual de tus predicciones, tu ranking y las novedades del torneo.
                      </p>
                    </div>
                    {user.companies && user.companies.length > 0 && (
                      <div className="flex gap-2 flex-wrap">
                        {user.companies.map((c: any) => (
                          <span key={c.id} className="text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border"
                                style={{ color: c.color, borderColor: c.color + '40', backgroundColor: c.color + '15' }}>
                            🏢 {c.nombre}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-gradient-to-r from-yellow-500/15 via-amber-500/5 to-transparent border border-yellow-500/20 rounded-3xl p-6 relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-lg animate-fade-in">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 rounded-full blur-2xl pointer-events-none"></div>
                    <div>
                      <div className="text-[10px] text-yellow-500 font-black uppercase tracking-widest">Quiniela Oficial del Mundial 2026</div>
                      <h2 className="text-2xl font-black text-neutral-100 mt-1">¡Bienvenido a la Quiniela! 🏆</h2>
                      <p className="text-neutral-400 text-xs mt-1">
                        Únete hoy mismo para pronosticar los resultados de los partidos, acumular puntos y competir contra amigos y colegas de tu empresa.
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTab('perfil')}
                      className="btn-primary-stitch px-5 py-2.5 text-xs font-black tracking-wider uppercase flex-shrink-0 active:scale-[0.97] transition"
                    >
                      Ingresar / Registrarse
                    </button>
                  </div>
                )}

                {/* Stats cards grid (Only visible to authenticated users) */}
                {user && (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Card 1: Points */}
                    <div className="glass-card p-5 border border-neutral-800/80 rounded-2xl flex flex-col justify-between shadow-md">
                      <span className="text-[9px] font-black uppercase tracking-widest text-neutral-500">Puntos Totales</span>
                      <div className="mt-3 flex items-baseline gap-1.5">
                        <span className="text-3xl font-mono font-black text-yellow-500">{myRank ? myRank.puntos_totales : 0}</span>
                        <span className="text-[10px] font-bold text-neutral-550 uppercase tracking-wider">pts</span>
                      </div>
                      <span className="text-[9px] text-neutral-500 mt-2">Acumulados en todos los partidos</span>
                    </div>

                    {/* Card 2: Ranking Position */}
                    <div className="glass-card p-5 border border-neutral-800/80 rounded-2xl flex flex-col justify-between shadow-md">
                      <span className="text-[9px] font-black uppercase tracking-widest text-neutral-500">Posición General</span>
                      <div className="mt-3 flex items-baseline gap-1.5">
                        <span className="text-3xl font-mono font-black text-amber-500">
                          {myCompanyRank ? `#${myCompanyRank}` : '--'}
                        </span>
                      </div>
                      <span className="text-[9px] text-neutral-500 mt-2">
                        {myCompanyRank && myRank && myRank.tendencia === 'up' && '▲ Subiendo posiciones'}
                        {myCompanyRank && myRank && myRank.tendencia === 'down' && '▼ Bajando posiciones'}
                        {myCompanyRank && myRank && myRank.tendencia === 'same' && '● Manteniendo posición'}
                        {!myCompanyRank && 'Aún sin clasificar'}
                      </span>
                    </div>

                    {/* Card 3: Predictions Made */}
                    <div className="glass-card p-5 border border-neutral-800/80 rounded-2xl flex flex-col justify-between shadow-md">
                      <span className="text-[9px] font-black uppercase tracking-widest text-neutral-500">Predicciones Hechas</span>
                      <div className="mt-3 flex items-baseline gap-1.5">
                        <span className="text-3xl font-mono font-black text-neutral-100">{userPredictionsCount}</span>
                        <span className="text-[10px] font-bold text-neutral-550 uppercase tracking-wider">apuestas</span>
                      </div>
                      <span className="text-[9px] text-neutral-500 mt-2">Total de marcadores ingresados</span>
                    </div>

                    {/* Card 4: Exact scores */}
                    <div className="glass-card p-5 border border-neutral-800/80 rounded-2xl flex flex-col justify-between shadow-md">
                      <span className="text-[9px] font-black uppercase tracking-widest text-neutral-500">Aciertos Exactos</span>
                      <div className="mt-3 flex items-baseline gap-1.5">
                        <span className="text-3xl font-mono font-black text-emerald-500">
                          {myRank ? myRank.exactos : userExactsCount}
                        </span>
                        <span className="text-[10px] font-bold text-neutral-550 uppercase tracking-wider">marcas</span>
                      </div>
                      <span className="text-[9px] text-neutral-500 mt-2">Marcadores idénticos acertados (+3 pts)</span>
                    </div>
                  </div>
                )}

                {/* Animated countdown & where to watch wrapper */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Countdown Timer */}
                  <div className="countdown-scoreboard lg:col-span-5 flex flex-col justify-between border border-yellow-500/25 rounded-3xl p-5 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/3 via-transparent to-transparent pointer-events-none"></div>
                    <div className="countdown-header text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-red-500 animate-ping"></span>
                      <span className="h-2 w-2 rounded-full bg-red-500 absolute"></span>
                      {countdownMatch ? (
                        <span className="flex items-center gap-1.5 min-w-0">
                          <span>PRÓXIMO PARTIDO:</span>
                          <span className="countdown-match-name flex items-center gap-1 min-w-0 truncate">
                            {getTeamFlag(countdownMatch.local)} <span className="truncate">{countdownMatch.local}</span> vs {getTeamFlag(countdownMatch.visitante)} <span className="truncate">{countdownMatch.visitante}</span>
                          </span>
                        </span>
                      ) : (
                        'INICIO DEL MUNDIAL 2026'
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-3 py-2 relative z-10">
                      {[
                        { label: 'DÍAS', value: kickoffTimeLeft.days },
                        { label: 'HORAS', value: kickoffTimeLeft.hours },
                        { label: 'MINS', value: kickoffTimeLeft.minutes },
                        { label: 'SEGS', value: kickoffTimeLeft.seconds },
                      ].map((item, idx) => (
                        <React.Fragment key={item.label}>
                          <div className="flex flex-col items-center flex-1">
                            <div className="countdown-digit-block w-full h-16 rounded-xl flex items-center justify-center font-mono font-black text-2xl select-none relative overflow-hidden group-hover:scale-105 transition-all duration-300">
                              <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-black/80 z-10"></div>
                              <span className="countdown-digit-value font-extrabold">
                                {String(item.value).padStart(2, '0')}
                              </span>
                            </div>
                            <span className="countdown-label text-[8.5px] font-black uppercase tracking-widest mt-1.5">{item.label}</span>
                          </div>
                          {idx < 3 && (
                            <span className="countdown-separator font-mono font-black text-xl select-none animate-pulse -translate-y-2">:</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>

                  {/* Previews and Streams column */}
                  <div className="lg:col-span-7 flex flex-col justify-between bg-neutral-900/40 border border-neutral-850 rounded-3xl p-5">
                    <div className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-3.5 flex items-center justify-between">
                      <span>¿Dónde Ver? · Canales y Transmisiones</span>
                      <span className="text-yellow-500 font-mono">100% Legal</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="bg-neutral-950/40 border border-neutral-850 hover:border-yellow-500/25 rounded-2xl p-3.5 flex flex-col justify-between transition group">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-black text-neutral-100 uppercase tracking-wider">BOLIVIA</span>
                            <span className="px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-500 text-[7px] font-black tracking-widest uppercase">Televisión</span>
                          </div>
                          <p className="text-[9px] text-neutral-400 leading-relaxed">
                            Unitel transmitirá 30 partidos en señal abierta para todo el país, incluyendo inauguración, semis y final.
                          </p>
                        </div>
                        <a href="https://www.unitel.bo" target="_blank" rel="noopener noreferrer" className="text-[8.5px] font-black text-yellow-500 group-hover:text-yellow-400 flex items-center gap-1 mt-3 tracking-wider uppercase">
                          Sitio Web <span>→</span>
                        </a>
                      </div>

                      <div className="bg-neutral-950/40 border border-neutral-850 hover:border-yellow-500/25 rounded-2xl p-3.5 flex flex-col justify-between transition group">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-black text-neutral-100 uppercase tracking-wider">CABLE (TIGO)</span>
                            <span className="px-1.5 py-0.5 rounded bg-neutral-800/50 text-neutral-300 text-[7px] font-black tracking-widest uppercase">Completo</span>
                          </div>
                          <p className="text-[9px] text-neutral-400 leading-relaxed">
                            Tigo Sports transmitirá en exclusiva por cable los 104 partidos del Mundial con cobertura especial HD.
                          </p>
                        </div>
                        <a href="https://tigosports.com.bo" target="_blank" rel="noopener noreferrer" className="text-[8.5px] font-black text-yellow-500 group-hover:text-yellow-400 flex items-center gap-1 mt-3 tracking-wider uppercase">
                          Sitio Web <span>→</span>
                        </a>
                      </div>

                      <div className="bg-neutral-950/40 border border-neutral-850 hover:border-yellow-500/25 rounded-2xl p-3.5 flex flex-col justify-between transition group">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-black text-neutral-100 uppercase tracking-wider">MÓVIL / APP</span>
                            <span className="px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 text-[7px] font-black tracking-widest uppercase">Streaming</span>
                          </div>
                          <p className="text-[9px] text-neutral-400 leading-relaxed">
                            FIFA+ ofrecerá streams gratuitos en vivo de partidos seleccionados y resúmenes al instante de 5 minutos.
                          </p>
                        </div>
                        <a href="https://plus.fifa.com" target="_blank" rel="noopener noreferrer" className="text-[8.5px] font-black text-yellow-500 group-hover:text-yellow-400 flex items-center gap-1 mt-3 tracking-wider uppercase">
                          Abrir FIFA+ <span>→</span>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Partidos Cercanos Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-yellow-500" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-neutral-200">Próximos Partidos Cercanos</h3>
                  </div>
                  {upcomingMatches.length === 0 ? (
                    <div className="glass-card border border-neutral-850 p-6 rounded-2xl text-center text-neutral-500 text-xs italic">
                      No hay partidos próximos programados en este momento.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {upcomingMatches.map((m) => {
                        const isLive = m.estado === 'live';
                        const myPred = predictions.find((p) => p.match_id === m.id);
                        return (
                          <div 
                            key={m.id}
                            onClick={() => {
                              setSummaryModalMatch(m);
                              fetchCommunityBets(m.id);
                            }}
                            className={`glass-card p-4 border transition cursor-pointer flex flex-col justify-between gap-3 ${
                              isLive 
                                ? 'border-red-500/40 bg-red-950/5 shadow-[0_0_15px_rgba(239,68,68,0.08)]' 
                                : 'border-neutral-850 hover:border-yellow-500/35 hover:bg-neutral-900/40'
                            }`}
                          >
                            <div className="flex justify-between items-center text-[9px] font-black text-neutral-500 uppercase tracking-wider">
                              <span>{m.fase}</span>
                              <span className={isLive ? 'text-red-400 animate-pulse font-extrabold' : 'text-neutral-400 font-mono'}>
                                {isLive ? '🔴 EN VIVO' : new Date(m.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            
                            <div className="flex justify-between items-center py-1">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-base flex-shrink-0">{getTeamFlag(m.local)}</span>
                                <span className="font-extrabold text-xs text-neutral-200 truncate uppercase">{m.local}</span>
                              </div>
                              <span className="font-mono text-xs font-bold text-neutral-400 bg-neutral-950 px-2 py-0.5 rounded border border-neutral-850">
                                {isLive ? `${m.goles_local} - ${m.goles_visitante}` : 'VS'}
                              </span>
                              <div className="flex items-center gap-2 min-w-0 justify-end">
                                <span className="font-extrabold text-xs text-neutral-200 truncate uppercase">{m.visitante}</span>
                                <span className="text-base flex-shrink-0">{getTeamFlag(m.visitante)}</span>
                              </div>
                            </div>

                            <div className="flex justify-between items-center text-[9px] border-t border-neutral-900/50 pt-2 text-neutral-500">
                              <span className="truncate max-w-[65%]">📍 {m.estadio || 'Estadio por definir'}</span>
                              {user && myPred && (
                                <span className="font-mono text-[9px] text-neutral-400 font-bold bg-neutral-950/80 px-1.5 py-0.5 rounded border border-neutral-850">
                                  Mi apuesta: {myPred.pred_local}-{myPred.pred_visitante}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Sedes y Estadios Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-yellow-500" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-neutral-200">Sedes y Estadios Destacados</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                      { nombre: 'Estadio Azteca', ciudad: 'Ciudad de México, MEX', cap: '87,523', desc: 'Sede del partido inaugural. Histórico templo del fútbol mundial, el primero en hospedar tres mundiales.' },
                      { nombre: 'MetLife Stadium', ciudad: 'Nueva York / Nueva Jersey, USA', cap: '82,500', desc: 'Sede confirmada para la Gran Final del 19 de julio de 2026. Estadio ultra-moderno con tecnología de punta.' },
                      { nombre: 'BC Place', ciudad: 'Vancouver, CAN', cap: '54,500', desc: 'Estadio principal canadiense con techo retráctil. Hospedará múltiples partidos de fase de grupos y eliminatorias.' },
                    ].map((estadio) => (
                      <div key={estadio.nombre} className="glass-card border border-neutral-850 p-4 rounded-2xl flex flex-col justify-between gap-2">
                        <div>
                          <div className="flex justify-between items-start gap-2">
                            <h4 className="font-black text-xs text-neutral-100 uppercase">{estadio.nombre}</h4>
                            <span className="text-[8px] font-mono bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded font-black flex-shrink-0">
                              CAP. {estadio.cap}
                            </span>
                          </div>
                          <span className="text-[9px] text-neutral-500 font-semibold">{estadio.ciudad}</span>
                          <p className="text-[10px] text-neutral-400 mt-2 leading-relaxed">{estadio.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Curiosidades y Eventos Especiales Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Curiosidades */}
                  <div className="glass-card border border-neutral-850 p-5 rounded-2xl space-y-4">
                    <div className="flex items-center gap-2 border-b border-neutral-850 pb-3">
                      <BookOpen className="w-4 h-4 text-yellow-500" />
                      <h3 className="text-xs font-black uppercase tracking-wider text-neutral-100">Curiosidades del Torneo</h3>
                    </div>
                    <div className="space-y-3">
                      {[
                        { titulo: 'Expansión Histórica', desc: 'Será el primer Mundial de la historia con 48 selecciones clasificadas, disputando un total inédito de 104 partidos.' },
                        { titulo: 'Tres Países Anfitriones', desc: 'Por primera vez en la historia, el torneo será coorganizado por tres naciones de forma conjunta: México, EE. UU. y Canadá.' },
                        { titulo: '39 Días de Competencia', desc: 'El torneo se jugará desde el 11 de junio hasta el 19 de julio de 2026, convirtiéndose en uno de los mundiales más largos de todos.' },
                      ].map((item) => (
                        <div key={item.titulo} className="bg-neutral-950/20 border border-neutral-900 p-3 rounded-xl">
                          <h5 className="font-black text-[10.5px] text-yellow-500 uppercase">{item.titulo}</h5>
                          <p className="text-[9.5px] text-neutral-400 mt-1 leading-relaxed">{item.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Eventos Especiales */}
                  <div className="glass-card border border-neutral-850 p-5 rounded-2xl space-y-4">
                    <div className="flex items-center gap-2 border-b border-neutral-850 pb-3">
                      <Trophy className="w-4 h-4 text-yellow-500" />
                      <h3 className="text-xs font-black uppercase tracking-wider text-neutral-100">Eventos Especiales</h3>
                    </div>
                    <div className="space-y-3">
                      {[
                        { fecha: '11 JUN', titulo: 'Show de Inauguración', desc: 'Ceremonia de apertura artística de clase mundial y el partido inaugural en el colosal Estadio Azteca de la Ciudad de México.' },
                        { fecha: '19 JUL', titulo: 'La Gran Final', desc: 'El evento deportivo más visto del planeta coronará al nuevo campeón del mundo en el MetLife Stadium de Nueva York / Nueva Jersey.' },
                        { fecha: 'DEBUT', titulo: 'Fase de Eliminación Directa', desc: 'Hospedará por primera vez una ronda de dieciseisavos de final (Ronda de 32), duplicando la emoción de los partidos a matar o morir.' },
                      ].map((item) => (
                        <div key={item.titulo} className="bg-neutral-950/20 border border-neutral-900 p-3 rounded-xl flex gap-3">
                          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2 text-center flex flex-col justify-center items-center min-w-[50px] h-12">
                            <span className="font-black text-[11px] text-yellow-500 font-mono leading-none">{item.fecha.split(' ')[0]}</span>
                            <span className="font-black text-[8px] text-yellow-500 font-mono mt-0.5 leading-none">{item.fecha.split(' ')[1] || ''}</span>
                          </div>
                          <div>
                            <h5 className="font-black text-[10.5px] text-neutral-200 uppercase">{item.titulo}</h5>
                            <p className="text-[9.5px] text-neutral-400 mt-1 leading-relaxed">{item.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                {/* Notifications & Quick Links (Only visible if logged in) */}
                {user && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    {/* Notifications box */}
                    <div className="glass-card border border-neutral-850 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-4 border-b border-neutral-850 pb-3">
                          <Bell className="w-4 h-4 text-yellow-500" />
                          <h3 className="text-xs font-black uppercase tracking-wider text-neutral-100">Notificaciones Recientes</h3>
                        </div>
                        <div className="space-y-3">
                          {notifications.slice(0, 3).map((n) => (
                            <div 
                              key={n.id} 
                              onClick={() => handleMarkNotificationRead(n.id)}
                              className={`p-3 rounded-xl border transition cursor-pointer text-xs ${
                                !n.leido 
                                  ? 'bg-yellow-500/5 border-yellow-500/20 text-neutral-200' 
                                  : 'bg-neutral-950/20 border-neutral-850 text-neutral-400 hover:text-neutral-300'
                              }`}
                            >
                              <div className="flex justify-between items-center font-bold">
                                <span>{n.titulo}</span>
                                {!n.leido && <span className="h-1.5 w-1.5 rounded-full bg-yellow-500"></span>}
                              </div>
                              <p className="text-[10px] text-neutral-550 mt-1 leading-relaxed">{n.contenido}</p>
                            </div>
                          ))}
                          {notifications.length === 0 && (
                            <div className="py-8 text-center text-neutral-500 text-xs italic">
                              No tienes notificaciones pendientes.
                            </div>
                          )}
                        </div>
                      </div>
                      {notifications.length > 0 && (
                        <button 
                          onClick={() => setNotifPanelOpen(true)}
                          className="text-[9px] font-black text-yellow-500 hover:text-yellow-400 uppercase tracking-widest mt-4 text-left"
                        >
                          Ver todas las notificaciones ({notifications.length})
                        </button>
                      )}
                    </div>

                    {/* Quick links & tips box */}
                    <div className="glass-card border border-neutral-850 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-4 border-b border-neutral-850 pb-3">
                          <Activity className="w-4 h-4 text-yellow-500" />
                          <h3 className="text-xs font-black uppercase tracking-wider text-neutral-100">Enlaces Rápidos</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            onClick={() => setActiveTab('partidos')}
                            className="bg-neutral-950/30 hover:bg-neutral-950/60 border border-neutral-850 hover:border-neutral-700 p-4 rounded-xl text-left transition active:scale-[0.98] group"
                          >
                            <div className="text-xl mb-1">⚽</div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-neutral-200 block group-hover:text-yellow-500 transition">Ver Partidos</span>
                            <span className="text-[8px] text-neutral-500 block mt-0.5 leading-tight">Predice y haz apuestas de grupo o ronda.</span>
                          </button>

                          <button
                            onClick={() => setActiveTab('ranking')}
                            className="bg-neutral-950/30 hover:bg-neutral-950/60 border border-neutral-850 hover:border-neutral-700 p-4 rounded-xl text-left transition active:scale-[0.98] group"
                          >
                            <div className="text-xl mb-1">📊</div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-neutral-200 block group-hover:text-yellow-500 transition">Tabla de Posiciones</span>
                            <span className="text-[8px] text-neutral-500 block mt-0.5 leading-tight">Revisa el pozo acumulado y tu puesto.</span>
                          </button>

                          <button
                            onClick={() => setActiveTab('fixture')}
                            className="bg-neutral-950/30 hover:bg-neutral-950/60 border border-neutral-850 hover:border-neutral-700 p-4 rounded-xl text-left transition active:scale-[0.98] group"
                          >
                            <div className="text-xl mb-1">🌲</div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-neutral-200 block group-hover:text-yellow-500 transition">Fase Eliminatoria</span>
                            <span className="text-[8px] text-neutral-500 block mt-0.5 leading-tight">Bracket interactivo rumbo a la Copa.</span>
                          </button>

                          <button
                            onClick={() => setActiveTab('perfil')}
                            className="bg-neutral-950/30 hover:bg-neutral-950/60 border border-neutral-850 hover:border-neutral-700 p-4 rounded-xl text-left transition active:scale-[0.98] group"
                          >
                            <div className="text-xl mb-1">🔑</div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-neutral-200 block group-hover:text-yellow-500 transition">Ajustes & Passkeys</span>
                            <span className="text-[8px] text-neutral-500 block mt-0.5 leading-tight">Configura tu perfil y llaves de acceso.</span>
                          </button>
                        </div>
                      </div>
                      
                      <div className="bg-yellow-500/5 border border-yellow-500/15 rounded-xl p-3 mt-4 text-[9px] text-neutral-400 font-semibold leading-relaxed">
                        💡 **Consejo Táctico**: Las apuestas se cierran automáticamente al momento del kickoff oficial de cada partido. ¡No olvides ingresar tus marcadores a tiempo!
                      </div>
                    </div>
                  </div>
                )}
              </section>
            );
          })()}

          {/* --- VIEW 1: PARTIDOS (MATCHES & BETTING CARDS) --- */}
          {activeTab === 'partidos' && (
            <section className="space-y-6">
              
              {/* Header Bar — Filtros y Vistas */}
              <div className="flex justify-between items-center gap-4 border-b border-neutral-900 pb-2">
                <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Filtrar Partidos</div>
                <button
                  onClick={() => setCompactView(!compactView)}
                  className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition border ${
                    compactView 
                      ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40 shadow-[0_0_12px_rgba(234,179,8,0.1)]' 
                      : 'bg-neutral-900 text-neutral-500 border-neutral-800 hover:border-yellow-500/30 hover:text-neutral-300'
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
                      onClick={() => { setFilterFase(v); if (v !== 'Fase de Grupos') { setGroupRemaining(false); setGroupDate(false); } }}
                      className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wide transition ${
                        filterFase === v ? 'bg-yellow-500 text-neutral-950' : 'bg-neutral-900 text-neutral-400 border border-neutral-800 hover:border-yellow-500/40 hover:text-neutral-200'
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
                        onClick={() => { setFilterGrupo(g); if (g !== 'ALL') { setGroupRemaining(false); setGroupDate(false); } }}
                        disabled={groupRemaining || groupDate}
                        className={`flex-shrink-0 px-2.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wide transition disabled:opacity-40 ${
                          filterGrupo === g ? 'bg-yellow-500 text-neutral-950' : 'bg-neutral-900 text-neutral-400 border border-neutral-800 hover:border-yellow-500/40 hover:text-neutral-200'
                        }`}
                      >{g === 'ALL' ? 'Grp' : g}</button>
                    ))}
                    <button
                      onClick={() => { const v = !groupRemaining; setGroupRemaining(v); if (v) { setFilterFase('Fase de Grupos'); setFilterGrupo('ALL'); setGroupDate(false); } }}
                      className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wide transition border ${
                        groupRemaining ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40' : 'bg-neutral-900 text-neutral-555 border-neutral-800 hover:border-yellow-500/30'
                      }`}
                    >📂 Por Grupo</button>
                    <button
                      onClick={() => { const v = !groupDate; setGroupDate(v); if (v) { setGroupRemaining(false); } }}
                      className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wide transition border ${
                        groupDate ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40' : 'bg-neutral-900 text-neutral-555 border-neutral-800 hover:border-yellow-500/30'
                      }`}
                    >📅 Por Fecha</button>
                  </div>
                )}
              </div>
              
              {/* Cards de partidos */}
              {!groupRemaining && !groupDate && (
                <div className={compactView ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3" : "grid grid-cols-1 md:grid-cols-2 gap-4"}>
                  {matches
                    .filter((m) => filterGrupo === 'ALL' || m.grupo === filterGrupo)
                    .filter((m) => filterFase === 'ALL' || m.fase === filterFase)
                    .map((m) => renderMatchCard(m))}
                  {matches.length === 0 && (
                    <div className="py-20 text-center text-neutral-500 col-span-2">
                      <p>Cargando lista de partidos...</p>
                    </div>
                  )}
                </div>
              )}

              {groupDate && (
                <div className="space-y-8">
                  {(() => {
                    const filtered = matches
                      .filter((m) => filterGrupo === 'ALL' || m.grupo === filterGrupo)
                      .filter((m) => filterFase === 'ALL' || m.fase === filterFase);
                    const grouped = getMatchesByDate(filtered);
                    if (grouped.length === 0) {
                      return (
                        <div className="py-20 text-center text-neutral-500">
                          <p>No hay partidos que coincidan con los filtros.</p>
                        </div>
                      );
                    }
                    return grouped.map((g) => (
                      <div key={g.dateStr} className="space-y-4">
                        <div className="flex items-center gap-2 border-b border-neutral-850 pb-2">
                          <span className="text-yellow-500 font-extrabold text-[10px] font-mono bg-yellow-500/10 border border-yellow-500/20 px-2.5 py-1 rounded-lg uppercase tracking-wider">
                            {g.dateStr}
                          </span>
                          <span className="text-neutral-500 text-[10px] uppercase font-black tracking-wider">
                            ({g.matches.length} {g.matches.length === 1 ? 'partido' : 'partidos'})
                          </span>
                        </div>
                        <div className={compactView ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3" : "grid grid-cols-1 md:grid-cols-2 gap-4"}>
                          {g.matches.map((m) => renderMatchCard(m))}
                        </div>
                      </div>
                    ));
                  })()}
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
                          <div className="flex items-center gap-2 border-b border-neutral-850 pb-2">
                            <span className="text-yellow-500 font-extrabold text-[11px] font-mono bg-yellow-500/10 border border-yellow-500/20 px-2.5 py-0.5 rounded">
                              GRUPO {grp}
                            </span>
                            <span className="text-neutral-500 text-[10px] uppercase font-black tracking-wider">
                              ({grpMatches.length} partidos por jugar)
                            </span>
                          </div>

                          <div className={compactView ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3" : "grid grid-cols-1 md:grid-cols-2 gap-4"}>
                            {grpMatches.map((m) => renderMatchCard(m))}
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
                <h2 className="text-lg font-black tracking-wider text-neutral-100 uppercase">Reglas del Juego</h2>
              </div>

              {/* Organizers card */}
              <div className="glass-card border border-neutral-800/80 rounded-2xl p-5 space-y-2">
                <h3 className="text-xs font-black text-neutral-400 uppercase tracking-widest border-b border-neutral-800 pb-2">Sobre la Quiniela</h3>
                <p className="text-neutral-200 text-xs leading-relaxed pt-1 font-medium">
                  Esta plataforma está diseñada para pronosticar los resultados de los partidos del Mundial 2026, competir amigablemente en clasificaciones generales o por empresas, y seguir todo el torneo en tiempo real.
                </p>
                <p className="text-neutral-500 text-[11px] leading-relaxed pt-1">
                  Quiniela abierta a compañeros, familiares y amigos. Convocatoria oficial: 18 de mayo de 2026.
                </p>
              </div>

              {/* Points system */}
              <div className="glass-card border border-neutral-800/80 rounded-2xl p-5 space-y-4">
                <h3 className="text-xs font-black text-neutral-400 uppercase tracking-widest border-b border-neutral-800 pb-2">Sistema de Puntuación</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                    <div>
                      <div className="text-green-400 font-black text-sm">Resultado Exacto</div>
                      <div className="text-neutral-400 text-xs mt-0.5">Ej: predices 2-1 y el partido termina 2-1</div>
                    </div>
                    <div className="text-green-400 font-black text-3xl font-mono">3 PTS</div>
                  </div>

                  <div className="flex items-center justify-between bg-neutral-800/50 border border-neutral-700/50 rounded-xl p-4">
                    <div>
                      <div className="text-neutral-300 font-black text-sm">Aciertas Ganador o Empate</div>
                      <div className="text-neutral-400 text-xs mt-0.5">Ej: predices victoria local y el equipo local gana por cualquier marcador</div>
                    </div>
                    <div className="text-neutral-300 font-black text-3xl font-mono">1 PTO</div>
                  </div>

                  <div className="flex items-center justify-between bg-neutral-900 border border-neutral-800 rounded-xl p-4">
                    <div>
                      <div className="text-neutral-400 font-black text-sm">Fallo Total</div>
                      <div className="text-neutral-500 text-xs mt-0.5">El resultado va en contra de tu predicción</div>
                    </div>
                    <div className="text-neutral-500 font-black text-3xl font-mono">0 PTS</div>
                  </div>
                </div>
              </div>

              {/* Rules */}
              <div className="glass-card border border-neutral-800/80 rounded-2xl p-5 space-y-3">
                <h3 className="text-xs font-black text-neutral-400 uppercase tracking-widest border-b border-neutral-800 pb-2">Reglas Generales</h3>
                <ul className="space-y-3 text-sm">
                  {[
                    { icon: '🔒', text: 'Las apuestas se cierran automáticamente al inicio de cada partido (kickoff lock). No se pueden modificar una vez iniciado el partido.' },
                    { icon: '🏆', text: 'Todos los partidos son apostables: Fase de Grupos, Ronda de 32, Octavos, Cuartos, Semifinales, Tercer Puesto y Gran Final.' },
                    { icon: '📊', text: 'La clasificación general es visible para todos los participantes en tiempo real.' },
                    { icon: '🔄', text: 'Los marcadores se actualizan automáticamente desde la API de football-data.org. La clasificación se recalcula al finalizar cada partido.' },
                    { icon: '⚽', text: 'En caso de empate en puntos, se desempata por cantidad de resultados exactos (3 puntos). Si persiste el empate, gana quien se registró primero.' },
                    { icon: '📱', text: 'Puedes realizar y modificar tus pronósticos desde cualquier dispositivo antes del kickoff.' },
                  ].map((r, i) => (
                    <li key={i} className="flex items-start gap-3 text-neutral-300">
                      <span className="text-lg flex-shrink-0">{r.icon}</span>
                      <span className="text-xs leading-relaxed text-neutral-400">{r.text}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Tournament info */}
              <div className="glass-card border border-neutral-800/80 rounded-2xl p-5 space-y-3">
                <h3 className="text-xs font-black text-neutral-400 uppercase tracking-widest border-b border-neutral-800 pb-2">Datos del Torneo</h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {[
                    { label: 'Inicio', value: '11 Junio 2026' },
                    { label: 'Final', value: '19 Julio 2026' },
                    { label: 'Equipos', value: '48 selecciones' },
                    { label: 'Grupos', value: '12 grupos (A-L)' },
                    { label: 'Partidos', value: '104 en total' },
                    { label: 'Sede Final', value: 'MetLife Stadium, NJ' },
                  ].map((d) => (
                    <div key={d.label} className="bg-neutral-950/60 border border-neutral-850 rounded-xl p-3">
                      <div className="text-neutral-500 text-[10px] uppercase tracking-widest">{d.label}</div>
                      <div className="text-neutral-200 font-bold mt-0.5">{d.value}</div>
                    </div>
                  ))}
                </div>
              </div>

            </section>
          )}

          {/* --- VIEW 2: LEADERBOARD RANKINGS --- */}
          {activeTab === 'ranking' && (
            <section className="space-y-6">
              {!user ? (
                /* Inline Login Screen for Guests */
                <div className="w-full max-w-md mx-auto bg-neutral-900/55 backdrop-blur-md border border-neutral-800 rounded-3xl p-8 shadow-2xl relative z-10 animate-fade-in my-8 text-center flex flex-col items-center">
                  <div className="h-16 w-16 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl flex items-center justify-center text-4xl mb-4 shadow-inner animate-pulse">
                    🔒
                  </div>
                  <h2 className="text-xl font-black text-neutral-100 uppercase tracking-wider">Acceso Restringido</h2>
                  <p className="text-neutral-400 text-sm mt-2">
                    La clasificación general está reservada exclusivamente para participantes registrados de la quiniela.
                  </p>
                  <button
                    onClick={() => { setIsRegistering(false); setActiveTab('perfil'); }}
                    className="w-full btn-primary-stitch py-3.5 text-sm transition tracking-wider uppercase mt-6"
                  >
                    Iniciar Sesión
                  </button>
                  <button
                    onClick={() => { setIsRegistering(true); setActiveTab('perfil'); }}
                    className="w-full bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 hover:border-neutral-600 text-neutral-300 py-3 text-sm font-bold rounded-xl transition mt-3 active:scale-[0.99]"
                  >
                    Crear Cuenta
                  </button>
                </div>
              ) : user.tipo === 'externo' && !user.aprobado ? (
                /* Restricted access for unapproved external users */
                <div className="w-full max-w-md mx-auto bg-neutral-900/55 backdrop-blur-md border border-neutral-800 rounded-3xl p-8 shadow-2xl relative z-10 animate-fade-in my-8 text-center flex flex-col items-center">
                  <div className="h-16 w-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center text-4xl mb-4 shadow-inner">
                    🚫
                  </div>
                  <h2 className="text-xl font-black text-neutral-100 uppercase tracking-wider">Acceso Denegado</h2>
                  <p className="text-neutral-400 text-sm mt-2">
                    La clasificación general no está habilitada para usuarios externos.
                  </p>
                </div>
              ) : (() => {
                const availableCompanies = getAvailableCompanies();
                const filteredLeaderboard = leaderboard.filter(row => {
                  if (!selectedCompanyId) return false;
                  return (row.companies || []).some((c: any) => c.id === selectedCompanyId);
                });

                if (availableCompanies.length === 0) {
                  return (
                    <div className="text-center py-12 max-w-md mx-auto bg-neutral-900/20 border border-neutral-800/40 rounded-3xl p-8">
                      <div className="text-4xl mb-4">🏢</div>
                      <h3 className="text-base font-bold text-neutral-300">Sin Empresa Asignada</h3>
                      <p className="text-neutral-500 text-xs mt-2">
                        Tu usuario no tiene ninguna empresa asignada. Por favor, solicita a un administrador que te asigne a tu empresa para ver el ranking.
                      </p>
                    </div>
                  );
                }

                return (
                  <>
                    {/* Top Leaderboard Title */}
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-yellow-500" />
                        <h2 className="text-lg font-black tracking-wider text-neutral-100 uppercase">Clasificación General</h2>
                      </div>
                      <span className="bg-neutral-900 border border-neutral-800 text-neutral-400 text-xs px-2.5 py-1 rounded-lg font-mono">
                        {filteredLeaderboard.length} Jugadores
                      </span>
                    </div>

                    {/* Company selector pill */}
                    {availableCompanies.length > 0 && (() => {
                      const sel = availableCompanies.find((c: any) => c.id === selectedCompanyId);
                      return (
                        <div className="flex items-center justify-between gap-3 max-w-3xl mx-auto">
                          <div className="flex items-center gap-2 min-w-0">
                            <Building2 className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                            <span className="text-xs font-black uppercase tracking-wider text-neutral-400">Equipo:</span>
                            {sel && (
                              <span className="text-xs font-black text-neutral-100 truncate">{sel.nombre}</span>
                            )}
                          </div>
                          {availableCompanies.length > 1 && (
                            <button
                              onClick={() => setCompanySelectModal(true)}
                              className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl border border-yellow-500/30 text-yellow-500 bg-yellow-500/5 hover:bg-yellow-500/10 transition flex-shrink-0"
                            >
                              <RefreshCw className="w-3 h-3" /> Cambiar
                            </button>
                          )}
                        </div>
                      );
                    })()}

                    {/* Pozo Acumulado */}
                    {filteredLeaderboard.length > 0 && (() => {
                      const selectedCompany = availableCompanies.find((c: any) => c.id === selectedCompanyId);
                      const monto = parseFloat(selectedCompany?.monto_participacion) || 150;
                      const pozo = filteredLeaderboard.length * monto;
                      return (
                        <div className="bg-gradient-to-r from-yellow-500/10 to-amber-600/5 border border-yellow-500/25 rounded-2xl p-4 flex items-center justify-between shadow-[0_0_20px_rgba(255,209,101,0.05)]">
                          <div>
                            <div className="text-[10px] text-neutral-400 uppercase tracking-widest font-bold">Pozo Acumulado</div>
                            <div className="text-2xl font-black text-yellow-500 font-mono mt-0.5">
                              Bs. {pozo.toLocaleString('es-BO', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                            </div>
                            <div className="text-[10px] text-neutral-500 mt-0.5">{filteredLeaderboard.length} participantes × Bs. {monto.toLocaleString('es-BO')}</div>
                          </div>
                          <div className="text-4xl">🏆</div>
                        </div>
                      );
                    })()}

                    {/* Medals Podium Pods */}
                    <div className="grid grid-cols-3 gap-4 pt-2 max-w-xl mx-auto">
                      {/* 2nd place */}
                      {filteredLeaderboard[1] && (
                        <div className="glass-card rounded-xl p-4 text-center flex flex-col items-center justify-between order-1 shadow-md">
                          <div className="text-3xl">🥈</div>
                          <div className="text-xs font-bold text-neutral-300 truncate w-full mt-2">{filteredLeaderboard[1].nombre}</div>
                          <div className="text-amber-500 font-extrabold text-base font-mono mt-1">{filteredLeaderboard[1].puntos_totales} pts</div>
                          <div className="text-[10px] text-neutral-500 font-mono mt-0.5">{filteredLeaderboard[1].exactos} exactos</div>
                        </div>
                      )}

                      {/* 1st place */}
                      {filteredLeaderboard[0] && (
                        <div className="glass-card border-2 border-yellow-500/50 rounded-xl p-5 text-center flex flex-col items-center justify-between order-2 relative shadow-[0_0_24px_rgba(255,209,101,0.2)] scale-105">
                          <span className="absolute top-[-10px] bg-yellow-500 text-neutral-950 text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow">
                            Líder
                          </span>
                          <div className="text-4xl animate-bounce">🥇</div>
                          <div className="text-sm font-black text-neutral-100 truncate w-full mt-2">{filteredLeaderboard[0].nombre}</div>
                          <div className="text-yellow-500 font-black text-lg font-mono mt-1">{filteredLeaderboard[0].puntos_totales} pts</div>
                          <div className="text-[10px] text-neutral-400 font-mono mt-0.5">{filteredLeaderboard[0].exactos} exactos</div>
                        </div>
                      )}

                      {/* 3rd place */}
                      {filteredLeaderboard[2] && (
                        <div className="glass-card rounded-xl p-4 text-center flex flex-col items-center justify-between order-3 shadow-md">
                          <div className="text-3xl">🥉</div>
                          <div className="text-xs font-bold text-neutral-300 truncate w-full mt-2">{filteredLeaderboard[2].nombre}</div>
                          <div className="text-amber-700 font-extrabold text-base font-mono mt-1">{filteredLeaderboard[2].puntos_totales} pts</div>
                          <div className="text-[10px] text-neutral-500 font-mono mt-0.5">{filteredLeaderboard[2].exactos} exactos</div>
                        </div>
                      )}
                    </div>

                    {/* Ranking list table */}
                    <div className="glass-card border border-neutral-800/40 rounded-xl overflow-hidden mt-6 max-w-3xl mx-auto shadow-2xl">
                      <div className="divide-y divide-neutral-900 text-sm">
                        {filteredLeaderboard.map((row, index) => {
                          const isMe = user?.id === row.user_id;

                          return (
                            <div 
                              key={row.user_id} 
                              className={`flex items-center justify-between p-5 transition ${
                                isMe ? 'bg-yellow-500/5 border-l-4 border-yellow-500 font-bold' : 'hover:bg-neutral-900/20'
                              }`}
                            >
                              {/* Left Block Position & Name */}
                              <div className="flex items-center gap-4">
                                <span className="font-bold text-neutral-400 w-6 font-mono text-center">#{index + 1}</span>
                                <div className="flex items-center gap-3">
                                  <img src={row.avatar} className="w-10 h-10 rounded-full border border-neutral-800 bg-neutral-950 shadow" alt="avatar" />
                                  <div>
                                    <div className="text-neutral-200 text-sm flex items-center gap-2 flex-wrap">
                                      <span>{row.nombre}</span>
                                      {isMe && <span className="bg-yellow-500 text-neutral-950 font-black text-[9px] px-1 rounded uppercase">Yo</span>}
                                      {(row.companies || []).map((c: any) => (
                                        <span key={c.id} className="text-[9px] px-2 py-0.5 rounded-full border font-bold"
                                          style={{ color: c.color, borderColor: c.color + '40', backgroundColor: c.color + '18' }}>
                                          {c.nombre}
                                        </span>
                                      ))}
                                    </div>
                                    </div>
                                </div>
                              </div>

                              {/* Right Block Points and Trends */}
                              <div className="flex items-center gap-6">
                                <div className="text-right">
                                  <div className="font-extrabold text-sm text-neutral-100 font-mono">{row.puntos_totales} pts</div>
                                  <div className="text-[10px] text-neutral-500 font-mono">{row.exactos} exactos</div>
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
                                    <span className="text-neutral-600 text-[10px]">
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
                  </>
                );
              })()}
            </section>
          )}

          {/* --- VIEW: FIXTURE (GOOGLE STYLE) --- */}
          {activeTab === 'fixture' && (
            <section className="space-y-4">
              {/* Top Navigation inside Fixture */}
              <div className="flex bg-neutral-900/50 rounded-xl p-1 mb-4 border border-neutral-850">
                <button
                  onClick={() => setFixtureSubTab('partidos')}
                  className={`flex-1 py-2 text-[11px] font-black uppercase tracking-wider rounded-lg transition ${fixtureSubTab === 'partidos' ? 'bg-neutral-800 text-neutral-100 shadow' : 'text-neutral-500 hover:text-neutral-300'}`}
                >
                  Partidos
                </button>
                <button
                  onClick={() => setFixtureSubTab('posiciones')}
                  className={`flex-1 py-2 text-[11px] font-black uppercase tracking-wider rounded-lg transition ${fixtureSubTab === 'posiciones' ? 'bg-neutral-800 text-neutral-100 shadow' : 'text-neutral-500 hover:text-neutral-300'}`}
                >
                  Posiciones
                </button>
                <button
                  onClick={() => setFixtureSubTab('eliminatoria')}
                  className={`flex-1 py-2 text-[11px] font-black uppercase tracking-wider rounded-lg transition ${fixtureSubTab === 'eliminatoria' ? 'bg-neutral-800 text-neutral-100 shadow' : 'text-neutral-500 hover:text-neutral-300'}`}
                >
                  Eliminatoria
                </button>
              </div>

              {/* Sub Tab: Partidos */}
              {fixtureSubTab === 'partidos' && (
                <div className="space-y-4">
                  {(() => {
                    const grouped = getMatchesByDate(matches);
                    if (grouped.length === 0) return <div className="py-20 text-center text-neutral-500">Sin partidos.</div>;
                    return grouped.map((g) => (
                      <div key={g.dateStr} className="space-y-4">
                        <div className="flex items-center gap-2 border-b border-neutral-850 pb-2">
                          <span className="text-yellow-500 font-extrabold text-[10px] font-mono bg-yellow-500/10 border border-yellow-500/20 px-2.5 py-1 rounded-lg uppercase tracking-wider">
                            {g.dateStr}
                          </span>
                          <span className="text-neutral-500 text-[10px] uppercase font-black tracking-wider">
                            ({g.matches.length} {g.matches.length === 1 ? 'partido' : 'partidos'})
                          </span>
                        </div>
                        <div className={compactView ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3" : "grid grid-cols-1 md:grid-cols-2 gap-4"}>
                          {g.matches.map((m) => renderMatchCard(m))}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              )}

              {/* Sub Tab: Posiciones */}
              {fixtureSubTab === 'posiciones' && (
                <div className="space-y-6">
                  {(() => {
                    const standings = getStandings(matches);
                    const groups = Object.keys(standings).sort();
                    if (groups.length === 0) return <div className="py-20 text-center text-neutral-500">Sin clasificaciones.</div>;
                    return groups.map(grp => {
                      if (standings[grp].length === 0) return null;
                      return (
                        <div key={grp} className="bg-neutral-900/40 border border-neutral-850 rounded-xl overflow-hidden mb-6">
                          <div className="bg-neutral-800/80 px-4 py-2 border-b border-neutral-800 flex justify-between items-center">
                            <span className="font-black text-[12px] uppercase tracking-widest text-neutral-200">Grupo {grp}</span>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-[10px] sm:text-[11px] text-left">
                              <thead className="text-neutral-500 border-b border-neutral-800/50 bg-neutral-900/20">
                                <tr>
                                  <th className="px-3 py-2 font-bold w-full">Selección</th>
                                  <th className="px-2 py-2 font-bold text-center">PTS</th>
                                  <th className="px-2 py-2 font-bold text-center">PJ</th>
                                  <th className="px-2 py-2 font-bold text-center">PG</th>
                                  <th className="px-2 py-2 font-bold text-center">PE</th>
                                  <th className="px-2 py-2 font-bold text-center">PP</th>
                                  <th className="px-2 py-2 font-bold text-center">GF</th>
                                  <th className="px-2 py-2 font-bold text-center">GC</th>
                                  <th className="px-2 py-2 font-bold text-center">DIF</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-neutral-850">
                                {standings[grp].map((s: any, idx: number) => (
                                  <tr key={s.team} className="hover:bg-neutral-800/30 transition">
                                    <td className="px-3 py-2 flex items-center gap-2">
                                      <span className="font-mono text-neutral-600 text-[9px] w-3">{idx + 1}</span>
                                      <span className="text-lg">{getTeamFlag(s.team)}</span>
                                      <span className="font-bold text-neutral-300 whitespace-nowrap truncate max-w-[100px]">{s.team}</span>
                                    </td>
                                    <td className="px-2 py-2 text-center font-black text-neutral-100">{s.pts}</td>
                                    <td className="px-2 py-2 text-center text-neutral-400 font-mono">{s.pj}</td>
                                    <td className="px-2 py-2 text-center text-neutral-400 font-mono">{s.pg}</td>
                                    <td className="px-2 py-2 text-center text-neutral-400 font-mono">{s.pe}</td>
                                    <td className="px-2 py-2 text-center text-neutral-400 font-mono">{s.pp}</td>
                                    <td className="px-2 py-2 text-center text-neutral-400 font-mono">{s.gf}</td>
                                    <td className="px-2 py-2 text-center text-neutral-400 font-mono">{s.gc}</td>
                                    <td className="px-2 py-2 text-center text-neutral-400 font-mono">{s.dif > 0 ? `+${s.dif}` : s.dif}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}

              {/* Sub Tab: Eliminatoria */}
              {fixtureSubTab === 'eliminatoria' && (
                <div className="space-y-8">
                  {(() => {
                    const knockoutPhases = ['Ronda de 32', 'Octavos de Final', 'Cuartos de Final', 'Semifinal', 'Tercer Puesto', 'Final'];
                    const phasesWithMatches = knockoutPhases.filter((fase) => matches.some((m) => m.fase === fase));
                    if (phasesWithMatches.length === 0) return <div className="py-20 text-center text-neutral-500">Sin partidos eliminatorios programados.</div>;
                    
                    return phasesWithMatches.map((fase) => {
                      const faseMatches = matches.filter((m) => m.fase === fase);
                      return (
                        <div key={fase} className="space-y-4">
                          <div className="flex items-center gap-2 border-b border-neutral-850 pb-2">
                            <span className="text-yellow-500 font-extrabold text-[11px] font-mono bg-yellow-500/10 border border-yellow-500/20 px-2.5 py-0.5 rounded uppercase">
                              {fase}
                            </span>
                            <span className="text-neutral-500 text-[10px] uppercase font-black tracking-wider">
                              ({faseMatches.length} partidos)
                            </span>
                          </div>

                          <div className={compactView ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3" : "grid grid-cols-1 md:grid-cols-2 gap-4"}>
                            {faseMatches.map((m) => renderMatchCard(m))}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </section>
          )}

          {/* --- VIEW 3: PROFILE --- */}
          {activeTab === 'perfil' && (
            <section className="space-y-6 max-w-4xl mx-auto">
              {!user ? (
                /* Inline Login/Register Screen for Guests */
                <div className="w-full max-w-md mx-auto bg-neutral-900/55 backdrop-blur-md border border-neutral-800 rounded-3xl p-8 shadow-2xl relative z-10 animate-fade-in my-8">
                  {/* Logo Splash */}
                  <div className="flex flex-col items-center text-center mb-6">
                    <div className="h-16 w-16 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl flex items-center justify-center text-4xl mb-4 shadow-inner animate-pulse overflow-hidden p-1">
                      {appLogo.startsWith('/') || appLogo.startsWith('http') ? (
                        <img src={appLogo} className="h-full w-full object-contain rounded-xl" alt="logo" />
                      ) : (
                        <span>{appLogo}</span>
                      )}
                    </div>
                    <h1 className="text-2xl font-black tracking-wider text-neutral-100 uppercase">{appName}</h1>
                    <p className="text-neutral-400 text-xs tracking-widest uppercase mt-1">Plataforma de Apuestas y Quiniela</p>
                  </div>

                  {!isRegistering ? (
                    /* Login Form */
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div>
                        <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest mb-1.5">Correo Electrónico</label>
                        <input
                          type="email"
                          required
                          autoComplete="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="ej: diego@mundial.com"
                          className="w-full input-stitch px-4 py-3 text-sm placeholder-neutral-700 focus:ring-2 focus:ring-yellow-500/10"
                        />
                      </div>

                      <div>
                        <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest mb-1.5">Contraseña</label>
                        <input
                          type="password"
                          required
                          autoComplete="current-password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Contraseña de acceso"
                          className="w-full input-stitch px-4 py-3 text-sm placeholder-neutral-700 focus:ring-2 focus:ring-yellow-500/10"
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
                        <div className="flex-1 h-px bg-neutral-800"></div>
                        <span className="text-[10px] text-neutral-600 uppercase tracking-widest font-bold">o</span>
                        <div className="flex-1 h-px bg-neutral-800"></div>
                      </div>

                      <button
                        type="button"
                        onClick={handlePasskeyLogin}
                        disabled={passkeyLoading}
                        className="w-full bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 hover:border-neutral-600 text-neutral-300 py-3 text-sm font-bold rounded-xl transition flex items-center justify-center gap-2 active:scale-[0.99]"
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
                        <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest mb-1.5">Nombre Completo</label>
                        <input 
                          type="text"
                          required
                          value={registerNombre}
                          onChange={(e) => setRegisterNombre(e.target.value)}
                          placeholder="ej: Diego Armando"
                          className="w-full input-stitch px-4 py-3 text-sm placeholder-neutral-700 focus:ring-2 focus:ring-yellow-500/10"
                        />
                      </div>

                      <div>
                        <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest mb-1.5">Correo Electrónico</label>
                        <input 
                          type="email"
                          required
                          value={registerEmail}
                          onChange={(e) => setRegisterEmail(e.target.value)}
                          placeholder="ej: diego@mundial.com"
                          className="w-full input-stitch px-4 py-3 text-sm placeholder-neutral-700 focus:ring-2 focus:ring-yellow-500/10"
                        />
                      </div>

                      <div>
                        <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest mb-1.5">Contraseña (mín. 6 carac.)</label>
                        <input
                          type="password"
                          required
                          autoComplete="new-password"
                          value={registerPassword}
                          onChange={(e) => setRegisterPassword(e.target.value)}
                          placeholder="Elige tu contraseña"
                          className="w-full input-stitch px-4 py-3 text-sm placeholder-neutral-700 focus:ring-2 focus:ring-yellow-500/10"
                        />
                      </div>

                      <div>
                        <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest mb-1.5">Confirmar Contraseña</label>
                        <input
                          type="password"
                          required
                          autoComplete="new-password"
                          value={registerConfirmPassword}
                          onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                          placeholder="Confirma tu contraseña"
                          className="w-full input-stitch px-4 py-3 text-sm placeholder-neutral-700 focus:ring-2 focus:ring-yellow-500/10"
                        />
                      </div>

                      {/* Teléfono (opcional) */}
                      <div>
                        <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest mb-1.5">Celular / WhatsApp</label>
                        <div className="flex gap-2 items-center">
                          <span className="text-neutral-400 text-sm flex-shrink-0">📱</span>
                          <input
                            type="tel"
                            autoComplete="tel"
                            value={registerPhone}
                            onChange={(e) => setRegisterPhone(e.target.value)}
                            placeholder="+591 XXXXXXXX"
                            className="w-full input-stitch px-4 py-3 text-sm placeholder-neutral-700 focus:ring-2 focus:ring-yellow-500/10"
                          />
                        </div>
                        <p className="text-[10px] text-neutral-600 mt-1">Opcional · Para recibir avisos por WhatsApp</p>
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
                      <h2 className="text-lg font-black tracking-wider text-neutral-100 uppercase">Mi Cuenta</h2>
                    </div>
                    {user.tipo !== 'admin' && user.tipo !== 'superadmin' && (
                      <span className={`text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border ${
                        user.aprobado
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20 animate-pulse'
                      }`}>
                        {user.aprobado ? '✅ Cuenta Aprobada' : user.denegado ? '🚫 Solicitud Denegada' : '⏳ Pendiente de Aprobación'}
                      </span>
                    )}
                  </div>

                  {!user.aprobado && user.tipo !== 'admin' && user.tipo !== 'superadmin' && (
                    user.denegado ? (
                      <div className="bg-red-500/5 border border-red-500/25 rounded-2xl p-5 mb-6 flex gap-3 text-xs font-semibold shadow-lg border-dashed">
                        <span className="text-xl">🚫</span>
                        <div className="space-y-1 flex-1">
                          <p className="font-extrabold uppercase text-[10px] tracking-wider text-red-400">Solicitud Denegada</p>
                          <p className="text-neutral-400 leading-relaxed text-[11px] font-medium">
                            Tu solicitud de participación no fue aprobada. Si crees que es un error, contacta al administrador para que pueda revisar tu caso.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-yellow-500/5 border border-yellow-500/25 rounded-2xl p-5 mb-6 flex gap-3 text-xs text-yellow-400 font-semibold shadow-lg border-dashed">
                        <span className="text-xl animate-bounce">⚠️</span>
                        <div className="space-y-1 flex-1">
                          <p className="font-extrabold uppercase text-[10px] tracking-wider text-yellow-500">Participación Pendiente de Aprobación</p>
                          <p className="text-neutral-400 leading-relaxed text-[11px] font-medium">
                            Tu registro fue exitoso pero el administrador aún debe aprobar tu cuenta antes de que puedas guardar pronósticos. Mientras tanto, puedes explorar partidos, fixture y clasificaciones.
                          </p>
                        </div>
                      </div>
                    )
                  )}

              {/* Interactive Profile Editor Card */}
              <div className="glass-card rounded-3xl p-6 md:p-8 shadow-2xl border border-neutral-800/80">
                <form onSubmit={handleSaveProfile} className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8">
                  
                  {/* Avatar upload & preview section */}
                  <div className="md:col-span-4 flex flex-col items-center gap-6 justify-center border-b md:border-b-0 md:border-r border-neutral-850 pb-6 md:pb-0 md:pr-8">
                    <div className="relative group">
                      <img 
                        src={profileAvatarPreview || user.avatar} 
                        className="w-32 h-32 rounded-full border-2 border-yellow-500/50 bg-neutral-950 p-1 shadow-2xl object-cover transition duration-300 group-hover:opacity-85" 
                        alt="avatar" 
                      />
                      <label className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center text-[10px] text-neutral-350 font-extrabold uppercase opacity-0 group-hover:opacity-100 transition duration-300 cursor-pointer select-none">
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
                      <h3 className="text-xl font-black text-neutral-100">{user.nombre}</h3>
                      <p className="text-neutral-500 text-xs">{user.email}</p>
                      
                      <div className="flex justify-center gap-2 pt-2 flex-wrap">
                        <span className="bg-neutral-950 border border-neutral-800 text-[9px] text-neutral-400 font-mono tracking-widest px-2.5 py-1 rounded-full uppercase font-black">
                          Rol: {user.tipo}
                        </span>
                        <span className="bg-emerald-500/10 border border-emerald-500/20 text-[9px] text-emerald-400 font-mono px-2.5 py-1 rounded-full uppercase font-black">
                          En línea
                        </span>
                        {user.telefono && (
                          <a
                            href={`https://wa.me/${user.telefono.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-green-500/10 border border-green-500/20 text-[9px] text-green-400 font-bold px-2.5 py-1 rounded-full uppercase tracking-widest flex items-center gap-1 hover:bg-green-500/20 transition"
                          >
                            📱 WhatsApp
                          </a>
                        )}
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
                        <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest block">Nombre Completo</label>
                        <input 
                          type="text" 
                          required
                          value={profileNombre}
                          onChange={(e) => setProfileNombre(e.target.value)}
                          placeholder="Ingresa tu nombre"
                          className="w-full bg-neutral-950 border border-neutral-850 rounded-xl px-4 py-3 text-neutral-200 text-xs focus:border-yellow-500/35 outline-none transition font-semibold"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest block">Nueva Contraseña (Opcional)</label>
                        <input
                          type="password"
                          autoComplete="new-password"
                          value={profilePassword}
                          onChange={(e) => setProfilePassword(e.target.value)}
                          placeholder="Dejar en blanco para no cambiar"
                          className="w-full bg-neutral-950 border border-neutral-850 rounded-xl px-4 py-3 text-neutral-200 text-xs focus:border-yellow-500/35 outline-none transition font-semibold"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest block">Subir foto de perfil</label>
                        <div className="flex items-center gap-3">
                          <label className="flex-1 bg-neutral-950 border border-neutral-850 hover:border-neutral-700/80 rounded-xl px-4 py-3 text-neutral-400 text-xs transition cursor-pointer font-bold text-center border-dashed">
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
              <div className="glass-card border border-neutral-800/80 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                  <div>
                    <div className="text-xs font-black text-neutral-300 uppercase tracking-wider">Llaves FIDO / Passkeys</div>
                    <div className="text-[10px] text-neutral-500 mt-0.5">Inicia sesión con huella, Face ID o clave de seguridad — puedes agregar varias llaves</div>
                  </div>
                  <span className="text-2xl">🔑</span>
                </div>

                {/* Registered passkeys list */}
                {userPasskeys.length > 0 && (
                  <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl divide-y divide-neutral-800 overflow-hidden">
                    {userPasskeys.map((pk) => (
                      <div key={pk.id} className="flex justify-between items-center px-4 py-3">
                        <div>
                          <div className="text-xs font-bold text-neutral-300 flex items-center gap-2">
                            <span>{pk.device_type === 'multiDevice' ? '☁️' : '📱'}</span>
                            <span className="capitalize">{pk.device_type === 'multiDevice' ? 'Llave multi-dispositivo' : 'Llave de un dispositivo'}</span>
                            {pk.backed_up && <span className="text-[9px] bg-green-500/10 text-green-400 border border-green-500/20 px-1.5 rounded-full">backup</span>}
                          </div>
                          <div className="text-[9px] text-neutral-600 mt-0.5 font-mono">
                            Registrada {new Date(pk.created_at).toLocaleDateString('es-BO')}
                            {pk.last_used_at && ` · Usada ${new Date(pk.last_used_at).toLocaleDateString('es-BO')}`}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeletePasskey(pk.id)}
                          className="text-red-400 hover:text-red-300 p-2 rounded-lg hover:bg-red-500/10 transition"
                          title="Eliminar esta llave"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={handlePasskeyRegister}
                  disabled={passkeyRegistering}
                  className="w-full bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 hover:border-yellow-500/40 text-neutral-300 hover:text-neutral-100 py-3 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 active:scale-[0.99] uppercase tracking-wider"
                >
                  <span className="text-base">➕</span>
                  <span>{passkeyRegistering ? 'Registrando...' : userPasskeys.length > 0 ? 'Agregar otra llave FIDO' : 'Registrar llave FIDO / Passkey'}</span>
                </button>
                {passkeyError && (
                  <div className="bg-red-950/30 border border-red-800/40 text-red-400 text-xs p-3 rounded-lg">{passkeyError}</div>
                )}
                <p className="text-[10px] text-neutral-600 leading-relaxed">
                  Touch ID (Mac) · Windows Hello · YubiKey · Face ID (iPhone/Android) · Puedes agregar múltiples llaves para cada dispositivo.
                </p>
              </div>

              {/* Personal Stats Card */}
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

              {/* Logout actions */}
              <div className="glass-card border border-neutral-800/40 p-4 rounded-xl md:hidden">
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
          {activeTab === 'admin' && (user.tipo === 'admin' || user.tipo === 'superadmin') && (
            <section className="space-y-6">

              <div className="flex justify-between items-center flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  {user.tipo === 'superadmin'
                    ? <ShieldAlert className="w-5 h-5 text-yellow-500" />
                    : <Building2 className="w-5 h-5 text-yellow-500" />
                  }
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

              {/* ── SUB-TABS ── */}
              <div className="flex gap-1 border-b border-neutral-800 pb-0">
                {([
                  { key: 'usuarios', label: 'Usuarios', icon: <Users className="w-3.5 h-3.5" /> },
                  { key: 'empresa',  label: 'Empresa',  icon: <Building2 className="w-3.5 h-3.5" /> },
                  { key: 'mensajes', label: 'Mensajes', icon: <MessageSquare className="w-3.5 h-3.5" /> },
                ] as const).map((t) => (
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

              {/* ─── ESTADÍSTICAS DEL SISTEMA (solo superadmin) ─── */}
              {user.tipo === 'superadmin' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Total Usuarios', value: adminUsers.length, color: 'text-yellow-500' },
                    { label: 'Empresas', value: companies.length, color: 'text-neutral-300' },
                    { label: 'Usuarios Activos', value: adminUsers.filter(u => u.activo).length, color: 'text-green-400' },
                    { label: 'Partidos en Vivo', value: matches.filter(m => m.estado === 'live').length, color: 'text-red-400' },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-neutral-900/40 border border-neutral-800 rounded-2xl p-4 flex flex-col items-center gap-1">
                      <span className={`text-2xl font-black ${stat.color}`}>{stat.value}</span>
                      <span className="text-[9px] text-neutral-500 uppercase tracking-widest text-center">{stat.label}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* ══════════════ TAB: USUARIOS ══════════════ */}
              {adminSubTab === 'usuarios' && <div className="space-y-4">
                <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest border-b border-neutral-800 pb-2 flex items-center gap-2">
                  <Users className="w-3.5 h-3.5" />
                  {user.tipo === 'superadmin' ? 'Todos los Usuarios del Sistema' : 'Usuarios de Mi Empresa'}
                </h3>

                <form onSubmit={handleCreateUser} className="bg-neutral-900/40 border border-neutral-900 rounded-2xl p-5 space-y-4 max-w-2xl shadow-lg">
                  <div className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                    {user.tipo === 'superadmin' ? 'Crear Nuevo Usuario / Administrador' : 'Agregar Usuario a Mi Empresa'}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest">Nombre Completo</label>
                      <input type="text" required value={newUserNombre} onChange={(e) => setNewUserNombre(e.target.value)} placeholder="Nombre completo" className="w-full input-stitch px-3 py-2 text-xs" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest">Correo Electrónico</label>
                      <input type="email" required value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} placeholder="usuario@mundial.com" className="w-full input-stitch px-3 py-2 text-xs" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest">Contraseña</label>
                      <input type="password" required value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} placeholder="Mínimo 6 caracteres" className="w-full input-stitch px-3 py-2 text-xs" />
                    </div>
                    {user.tipo === 'superadmin' && (
                      <div className="space-y-1.5">
                        <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest">Rol</label>
                        <select value={newUserTipo} onChange={(e) => setNewUserTipo(e.target.value as 'user' | 'admin' | 'superadmin')} className="w-full bg-neutral-950 border border-neutral-850 text-neutral-300 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-yellow-500/30">
                          <option value="user">Usuario Común</option>
                          <option value="admin">Administrador de Empresa</option>
                          <option value="superadmin">Super Administrador</option>
                        </select>
                      </div>
                    )}
                    {user.tipo === 'superadmin' && (newUserTipo === 'admin') && (
                      <div className="space-y-1.5">
                        <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest">Empresa a Gestionar</label>
                        <select value={newUserCompanyId} onChange={(e) => setNewUserCompanyId(e.target.value ? parseInt(e.target.value) : '')} className="w-full bg-neutral-950 border border-neutral-850 text-neutral-300 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-yellow-500/30">
                          <option value="">Sin empresa asignada</option>
                          {companies.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end pt-2">
                    <button type="submit" disabled={newUserSubmitting} className="bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-neutral-950 text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 transition active:scale-95 shadow">
                      <span>{newUserSubmitting ? 'Creando...' : 'Crear Usuario'}</span>
                    </button>
                  </div>
                </form>

                {/* ── SOLICITUDES PENDIENTES ── */}
                {(() => {
                  const pendientes = adminUsers.filter(u => !u.aprobado && !u.denegado && u.tipo !== 'admin' && u.tipo !== 'superadmin' && u.id !== user.id);
                  if (pendientes.length === 0) return null;
                  return (
                    <div className="space-y-2 max-w-4xl">
                      <div className="flex items-center gap-2 text-[10px] font-black text-yellow-500 uppercase tracking-widest">
                        <span className="h-2 w-2 rounded-full bg-yellow-500 animate-ping inline-block"></span>
                        Solicitudes Pendientes ({pendientes.length})
                      </div>
                      <div className="border border-yellow-500/20 bg-yellow-500/3 divide-y divide-yellow-500/10 rounded-2xl overflow-hidden">
                        {pendientes.map((u) => (
                          <div key={u.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <img src={u.avatar} className="w-10 h-10 rounded-full bg-neutral-950 border border-neutral-800 flex-shrink-0" alt="avatar" />
                              <div className="min-w-0">
                                <div className="font-bold text-sm text-neutral-200 truncate">{u.nombre}</div>
                                <div className="text-[9px] text-neutral-500 font-mono">{u.email}{u.telefono && ` · 📱 ${u.telefono}`}</div>
                                <div className="text-[8px] text-neutral-600 font-mono">{new Date(u.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
                              {/* Asignar empresa antes de aprobar */}
                              {companies.length > 0 && (
                                <div className="flex gap-1 flex-wrap max-w-[180px]">
                                  {companies.filter((c) => user.tipo === 'superadmin' || (user.companies || []).some((ac: any) => ac.id === c.id)).map((c) => {
                                    const isMember = (u.companies || []).some((uc: any) => uc.id === c.id);
                                    return (
                                      <button key={c.id} onClick={() => handleToggleUserCompany(u.id, c.id, isMember)}
                                        className={`text-[9px] px-2 py-1 rounded-full border font-bold transition ${isMember ? 'opacity-100' : 'opacity-30 hover:opacity-70'}`}
                                        style={{ color: c.color, borderColor: c.color + '60', backgroundColor: isMember ? c.color + '20' : 'transparent' }}
                                        title={isMember ? `Quitar de ${c.nombre}` : `Agregar a ${c.nombre}`}>
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

                {/* ── TODOS LOS USUARIOS ── */}
                <div className="text-[10px] text-neutral-500 uppercase tracking-widest font-black pt-2">
                  {user.tipo === 'superadmin' ? `Todos los usuarios (${adminUsers.length})` : `Usuarios de mi empresa (${adminUsers.filter(u => u.id !== user.id).length})`}
                </div>
                <div className="bg-neutral-900/40 border border-neutral-900 divide-y divide-neutral-900 rounded-2xl overflow-hidden shadow-lg max-w-4xl">
                  {adminUsers.map((u) => (
                    <div key={u.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 text-xs gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <img src={u.avatar} className="w-10 h-10 rounded-full bg-neutral-950 border border-neutral-850 flex-shrink-0" alt="avatar" />
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
                        {(user.tipo === 'superadmin' || user.tipo === 'admin') && u.id !== user.id && companies.length > 0 && (
                          <div className="flex gap-1 flex-wrap max-w-[200px]">
                            {companies.filter((c) => user.tipo === 'superadmin' || (user.companies || []).some((ac: any) => ac.id === c.id)).map((c) => {
                              const isMember = (u.companies || []).some((uc: any) => uc.id === c.id);
                              return (
                                <button key={c.id} onClick={() => handleToggleUserCompany(u.id, c.id, isMember)}
                                  className={`text-[9px] px-2 py-1 rounded-full border font-bold transition ${isMember ? 'opacity-100' : 'opacity-30 hover:opacity-70'}`}
                                  style={{ color: c.color, borderColor: c.color + '60', backgroundColor: isMember ? c.color + '20' : 'transparent' }}
                                  title={isMember ? `Quitar de ${c.nombre}` : `Agregar a ${c.nombre}`}>
                                  {c.nombre}
                                </button>
                              );
                            })}
                          </div>
                        )}
                        {u.id !== user.id ? (
                          <>
                            <button onClick={() => openEditUserModal(u)} className="font-bold py-1.5 px-3 rounded-xl flex items-center gap-1.5 transition text-[11px] bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700">
                              <Pencil className="w-3 h-3" /> Editar
                            </button>
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
                            <button onClick={() => handleToggleUserStatus(u.id, u.activo)} className={`font-bold py-1.5 px-3 rounded-xl flex items-center gap-1.5 transition text-[11px] ${u.activo ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20' : 'bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20'}`}>
                              {u.activo ? <><UserX className="w-3.5 h-3.5" /> Desactivar</> : <><UserCheck className="w-3.5 h-3.5" /> Activar</>}
                            </button>
                          </>
                        ) : (
                          <span className="text-[10px] text-neutral-500 uppercase tracking-widest italic pr-4">
                            {user.tipo === 'superadmin' ? 'Tú (Super Admin)' : 'Tú (Admin)'}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>}

              {/* ══════════════ TAB: EMPRESA ══════════════ */}
              {adminSubTab === 'empresa' && <div className="space-y-6">

              {/* ─── PERSONALIZACIÓN DEL SISTEMA (solo superadmin) ─── */}
              {user.tipo === 'superadmin' && <div className="space-y-4">
                <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest border-b border-neutral-800 pb-2 flex items-center gap-2">
                  <Settings className="w-3.5 h-3.5" /> Personalización del Sistema
                </h3>
                <form onSubmit={handleSaveSettings} className="bg-neutral-900/40 border border-neutral-900 rounded-2xl p-5 space-y-4 max-w-2xl">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest">Nombre del Sistema</label>
                      <input type="text" required value={editAppName} onChange={(e) => setEditAppName(e.target.value)} placeholder="Nombre de la Quiniela" className="w-full input-stitch px-3 py-2 text-xs" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest">Tipo de Logo</label>
                      <select value={editLogoType} onChange={(e) => setEditLogoType(e.target.value as 'emoji' | 'file')} className="w-full bg-neutral-950 border border-neutral-850 text-neutral-300 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-yellow-500/30">
                        <option value="emoji">Emoji o Símbolo</option>
                        <option value="file">Imagen Personalizada</option>
                      </select>
                    </div>
                  </div>

                  {editLogoType === 'emoji' ? (
                    <div className="space-y-1.5 max-w-xs">
                      <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest">Emoji o Icono</label>
                      <div className="flex gap-2">
                        <input type="text" required value={editLogoEmoji} onChange={(e) => setEditLogoEmoji(e.target.value)} placeholder="🏆" className="w-full input-stitch px-3 py-2 text-xs" />
                        <div className="w-9 h-9 bg-neutral-950 border border-neutral-850 rounded-xl flex items-center justify-center text-xl select-none flex-shrink-0">{editLogoEmoji}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest">Archivo de Logo</label>
                      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                        <input type="file" accept="image/*" onChange={(e) => { if (e.target.files?.[0]) setEditLogoFile(e.target.files[0]); }} className="text-xs text-neutral-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-neutral-950 file:text-yellow-500 hover:file:bg-neutral-900 file:cursor-pointer" />
                        {appLogo.startsWith('/') && (
                          <div className="flex items-center gap-2 bg-neutral-950/60 border border-neutral-850 p-2 rounded-xl">
                            <span className="text-[9px] text-neutral-500">Actual:</span>
                            <img src={appLogo} className="w-8 h-8 object-contain rounded" alt="logo" />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Subtítulo y contacto */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest">Subtítulo</label>
                      <input type="text" value={editSubtitle} onChange={(e) => setEditSubtitle(e.target.value)} placeholder="Ej: Quiniela Oficial del Mundial" className="w-full input-stitch px-3 py-2 text-xs" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest">WhatsApp de Contacto</label>
                      <input type="text" value={editContactWhatsapp} onChange={(e) => setEditContactWhatsapp(e.target.value)} placeholder="+591 XXXXXXXX" className="w-full input-stitch px-3 py-2 text-xs" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest">Email de Contacto</label>
                      <input type="email" value={editContactEmail} onChange={(e) => setEditContactEmail(e.target.value)} placeholder="info@empresa.com" className="w-full input-stitch px-3 py-2 text-xs" />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2 border-t border-neutral-950">
                    <button type="submit" disabled={settingsSubmitting} className="bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-neutral-950 text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 transition active:scale-95 shadow">
                      <span>{settingsSubmitting ? 'Guardando...' : 'Guardar Cambios'}</span>
                    </button>
                  </div>
                </form>
              </div>}

              {/* ─── 3. GESTIÓN DE EMPRESAS (solo superadmin) ─── */}
              {user.tipo === 'superadmin' && <div className="space-y-4">
                <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest border-b border-neutral-800 pb-2 flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5" /> Gestión de Empresas
                </h3>
                <form onSubmit={handleCreateCompany} className="bg-neutral-900/40 border border-neutral-900 rounded-2xl p-5 space-y-4 max-w-2xl">
                  <div className="text-xs font-bold text-neutral-300 uppercase tracking-wider">Crear Empresa</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest">Nombre</label>
                      <input type="text" required value={newCompanyNombre} onChange={(e) => setNewCompanyNombre(e.target.value)} placeholder="Nombre de la empresa" className="w-full input-stitch px-3 py-2 text-xs" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest">Monto de Participación (Bs.)</label>
                      <input type="number" min="0" step="0.01" value={newCompanyMonto} onChange={(e) => setNewCompanyMonto(e.target.value)} placeholder="150" className="w-full input-stitch px-3 py-2 text-xs font-mono" />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest">Modo de Apuesta por Fase</label>
                      <div className="grid grid-cols-1 gap-1.5">
                        {PHASES_APUESTA.map((phase) => (
                          <div key={phase.key} className="flex items-center gap-3 bg-neutral-950/60 border border-neutral-800 rounded-lg px-3 py-1.5">
                            <span className="text-[10px] font-bold text-neutral-300 w-28 flex-shrink-0">{phase.label}</span>
                            <select
                              value={newCompanyModos[phase.key] ?? 'partido'}
                              onChange={(e) => setNewCompanyModos(prev => ({ ...prev, [phase.key]: e.target.value }))}
                              className="flex-1 bg-neutral-900 border border-neutral-800 text-neutral-300 rounded-lg px-2 py-1 text-[11px]"
                            >
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
                    <button type="submit" disabled={companySubmitting} className="bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-neutral-950 text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 transition active:scale-95">
                      <span>{companySubmitting ? 'Creando...' : 'Crear Empresa'}</span>
                    </button>
                  </div>
                </form>
                <div className="bg-neutral-900/40 border border-neutral-900 divide-y divide-neutral-900 rounded-2xl overflow-hidden max-w-2xl">
                  {companies.length === 0 && (
                    <div className="p-6 text-center text-neutral-500 text-xs">Sin empresas registradas</div>
                  )}
                  {companies.map((c) => {
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
                                <input
                                  type="number" min="0" step="0.01"
                                  value={editingMontoValue}
                                  onChange={(e) => setEditingMontoValue(e.target.value)}
                                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveCompanyMonto(c.id); if (e.key === 'Escape') setEditingMontoId(null); }}
                                  className="w-24 input-stitch px-2 py-1 text-xs font-mono"
                                  autoFocus
                                />
                                <button onClick={() => handleSaveCompanyMonto(c.id)} className="text-green-400 hover:text-green-300 text-[10px] font-bold px-2 py-1 rounded-lg border border-green-500/20 transition">
                                  <Check className="w-3 h-3" />
                                </button>
                                <button onClick={() => setEditingMontoId(null)} className="text-neutral-500 hover:text-neutral-300 text-[10px] font-bold px-2 py-1 rounded-lg border border-neutral-700 transition">
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => { setEditingMontoId(c.id); setEditingMontoValue(String(c.monto_participacion || 150)); }}
                                className="flex items-center gap-1.5 text-[10px] font-black text-yellow-500 px-2.5 py-1.5 rounded-lg border border-yellow-500/20 bg-yellow-500/5 hover:bg-yellow-500/10 transition"
                              >
                                💰 Bs. {parseFloat(c.monto_participacion || 150).toLocaleString('es-BO')}
                              </button>
                            )}
                            <button
                              onClick={() => setExpandedCompanyModos(expandedCompanyModos === c.id ? null : c.id)}
                              className={`text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg border transition flex items-center gap-1.5 ${expandedCompanyModos === c.id ? 'text-cyan-300 border-cyan-500/40 bg-cyan-500/10' : 'text-neutral-400 border-neutral-700 hover:border-neutral-500'}`}
                            >
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
                            {PHASES_APUESTA.map((phase) => (
                              <div key={phase.key} className="flex items-center gap-3 bg-neutral-950/60 border border-neutral-800 rounded-lg px-3 py-1.5">
                                <span className="text-[10px] font-bold text-neutral-300 w-32 flex-shrink-0">{phase.label}</span>
                                <select
                                  value={cModos[phase.key] ?? 'partido'}
                                  onChange={async (e) => {
                                    const updatedModos = { ...DEFAULT_MODOS_POR_FASE, ...cModos, [phase.key]: e.target.value };
                                    await fetch('/api/companies', { method: 'POST', headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ action: 'update', id: c.id, modos_por_fase: updatedModos }) });
                                    showToast('✅ Modo actualizado'); await fetchCompanies();
                                  }}
                                  className="flex-1 bg-neutral-900 border border-neutral-800 text-neutral-300 rounded-lg px-2 py-1 text-[11px]"
                                >
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
              </div>}

              {/* ─── Admin (no superadmin): editar su empresa ─── */}
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
                        onBlur={async (e) => {
                          const monto = parseFloat(e.target.value);
                          if (!isNaN(monto) && monto > 0) {
                            await fetch('/api/companies', { method: 'POST', headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ action: 'update', id: c.id, monto_participacion: monto }) });
                            showToast('💰 Monto actualizado'); await fetchCompanies();
                          }
                        }}
                        className="w-full input-stitch px-3 py-2 text-xs font-mono" />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest">Modo de Apuesta por Fase</label>
                      <div className="grid grid-cols-1 gap-1.5">
                        {PHASES_APUESTA.map((phase) => (
                          <div key={phase.key} className="flex items-center gap-3 bg-neutral-950/60 border border-neutral-800 rounded-lg px-3 py-1.5">
                            <span className="text-[10px] font-bold text-neutral-300 w-32 flex-shrink-0">{phase.label}</span>
                            <select
                              defaultValue={adminCModos[phase.key] ?? 'partido'}
                              onChange={async (e) => {
                                const updatedModos = { ...DEFAULT_MODOS_POR_FASE, ...adminCModos, [phase.key]: e.target.value };
                                await fetch('/api/companies', { method: 'POST', headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ action: 'update', id: c.id, modos_por_fase: updatedModos }) });
                                showToast('✅ Modo actualizado'); await fetchCompanies();
                              }}
                              className="flex-1 bg-neutral-900 border border-neutral-800 text-neutral-300 rounded-lg px-2 py-1 text-[11px]"
                            >
                              <option value="partido">Por Partido</option>
                              <option value="bloque">En Bloque</option>
                              <option value="fase">Por Fase</option>
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>
                    <p className="text-[10px] text-neutral-600">Los cambios se aplican inmediatamente al cambiar el selector.</p>
                  </div>
                );
              })}

              {/* ─── 4. GRUPOS DE USUARIOS (solo superadmin) ─── */}
              {user.tipo === 'superadmin' && <div className="space-y-4">
                <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest border-b border-neutral-800 pb-2 flex items-center gap-2">
                  <Users className="w-3.5 h-3.5" /> Grupos de Usuarios
                </h3>
                <form onSubmit={handleCreateGroup} className="bg-neutral-900/40 border border-neutral-900 rounded-2xl p-5 space-y-4 max-w-2xl">
                  <div className="text-xs font-bold text-neutral-300 uppercase tracking-wider">Crear Grupo</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest">Nombre del Grupo</label>
                      <input type="text" required value={newGroupNombre} onChange={(e) => setNewGroupNombre(e.target.value)} placeholder="ej: Ventas, Producción..." className="w-full input-stitch px-3 py-2 text-xs" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest">Color</label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={newGroupColor} onChange={(e) => setNewGroupColor(e.target.value)} className="w-9 h-9 rounded-lg border border-neutral-850 bg-neutral-950 cursor-pointer" />
                        <input type="text" value={newGroupColor} onChange={(e) => setNewGroupColor(e.target.value)} className="w-24 input-stitch px-3 py-2 text-xs font-mono" />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button type="submit" disabled={groupSubmitting} className="bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-neutral-950 text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 transition active:scale-95">
                      <span>{groupSubmitting ? 'Creando...' : 'Crear Grupo'}</span>
                    </button>
                  </div>
                </form>
                <div className="bg-neutral-900/40 border border-neutral-900 divide-y divide-neutral-900 rounded-2xl overflow-hidden max-w-2xl">
                  {groups.length === 0 && <div className="p-6 text-center text-neutral-500 text-xs">Sin grupos creados</div>}
                  {groups.map((g) => (
                    <div key={g.id} className="flex justify-between items-center p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full border border-neutral-700" style={{ backgroundColor: g.color }} />
                        <div>
                          <div className="text-sm font-bold text-neutral-200">{g.nombre}</div>
                          <div className="text-[9px] text-neutral-500 font-mono">{g.member_count} miembro{g.member_count !== 1 ? 's' : ''}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setGroupMembersModal(g); fetchGroupMembers(g.id); }}
                          className="text-neutral-400 hover:text-neutral-200 text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg border border-neutral-800 hover:border-neutral-700 transition"
                        >
                          Miembros
                        </button>
                        <button onClick={() => handleDeleteGroup(g.id)} className="text-red-400 hover:text-red-300 text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg border border-red-500/20 hover:border-red-500/40 transition flex items-center gap-1.5">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>}

              {/* ─── SINCRONIZACIÓN EN VIVO (solo superadmin, en tab empresa) ─── */}
              {user.tipo === 'superadmin' && <div className="space-y-4">
                <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest border-b border-neutral-800 pb-2">Sincronización en Vivo</h3>
                <div className="bg-neutral-900/40 border border-neutral-900 rounded-2xl p-5 space-y-4">
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
                              <span className="text-xs text-neutral-300 font-bold">{label}</span>
                              <span className="text-[10px] text-neutral-500">· hace {secAgo < 60 ? `${secAgo}s` : `${Math.floor(secAgo / 60)}min`}</span>
                            </>
                          );
                        })()
                      ) : (
                        <><span className="h-2.5 w-2.5 rounded-full bg-neutral-600"></span><span className="text-xs text-neutral-500">Sin datos de sync</span></>
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
              </div>}

              {/* ─── Marcadores en Vivo (solo superadmin, en tab empresa) ─── */}
              {user.tipo === 'superadmin' && <div className="space-y-4">
                <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest border-b border-neutral-800 pb-2">Marcadores en Vivo</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {matches.map((m) => (
                    <div key={m.id} className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl flex justify-between items-center text-xs shadow-md">
                      <div className="flex flex-col gap-1 w-[60%]">
                        <div className="flex items-center gap-2 text-sm text-neutral-200 font-black">
                          <span>{m.local} {m.goles_local} - {m.goles_visitante} {m.visitante}</span>
                        </div>
                        <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-bold">
                          {m.estado === 'live' ? '🔴 En juego' : m.estado === 'finished' ? '⚫ Finalizado' : '⚪ Programado'}
                        </span>
                      </div>
                      <button onClick={() => { setAdminMatchModal(m); setAdminGolesLocal(m.goles_local); setAdminGolesVisitante(m.goles_visitante); setAdminEstado(m.estado); setAdminTransmisionEnlaces(m.transmision_enlaces || ''); }} className="bg-neutral-950 hover:bg-neutral-800 text-neutral-300 font-bold px-4 py-2 border border-neutral-800 hover:border-yellow-500/25 rounded-xl transition">
                        Editar
                      </button>
                    </div>
                  ))}
                </div>
              </div>}

              </div>}

              {/* ══════════════ TAB: MENSAJES ══════════════ */}
              {adminSubTab === 'mensajes' && <div className="space-y-4">
                <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest border-b border-neutral-800 pb-2 flex items-center gap-2">
                  <MessageSquare className="w-3.5 h-3.5" /> Enviar Mensaje / Notificación
                </h3>
                <form onSubmit={handleCreateNotification} className="bg-neutral-900/40 border border-neutral-900 rounded-2xl p-5 space-y-4 max-w-2xl">
                  <div className="text-xs font-bold text-neutral-300 uppercase tracking-wider">Enviar Notificación</div>
                  <div className="space-y-1.5">
                    <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest">Título</label>
                    <input type="text" required value={notifTitulo} onChange={(e) => setNotifTitulo(e.target.value)} placeholder="Título de la notificación" className="w-full input-stitch px-3 py-2 text-xs" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest">Contenido</label>
                    <textarea required value={notifContenido} onChange={(e) => setNotifContenido(e.target.value)} placeholder="Escribe tu mensaje aquí..." rows={3} className="w-full input-stitch px-3 py-2 text-xs resize-none" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest">Tipo</label>
                      <select value={notifTipo} onChange={(e) => setNotifTipo(e.target.value as any)} className="w-full bg-neutral-950 border border-neutral-850 text-neutral-300 rounded-xl px-3 py-2 text-xs">
                        <option value="info">ℹ️ Info</option>
                        <option value="success">✅ Éxito</option>
                        <option value="warning">⚠️ Aviso</option>
                        <option value="error">❌ Error</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest">Destinatario</label>
                      <select value={notifTargetType} onChange={(e) => { setNotifTargetType(e.target.value as any); setNotifTargetId(null); }} className="w-full bg-neutral-950 border border-neutral-850 text-neutral-300 rounded-xl px-3 py-2 text-xs">
                        <option value="all">🌐 Todos</option>
                        <option value="company">🏢 Empresa</option>
                        <option value="group">👥 Grupo</option>
                        <option value="user">👤 Usuario</option>
                      </select>
                    </div>
                    {notifTargetType === 'company' && (
                      <div className="space-y-1.5">
                        <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest">Empresa</label>
                        <select value={notifTargetId || ''} onChange={(e) => setNotifTargetId(e.target.value ? parseInt(e.target.value) : null)} className="w-full bg-neutral-950 border border-neutral-850 text-neutral-300 rounded-xl px-3 py-2 text-xs">
                          <option value="">Seleccionar empresa...</option>
                          {companies
                            .filter((c: any) => user.tipo === 'superadmin' || (user.companies || []).some((ac: any) => ac.id === c.id))
                            .map((c: any) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                        </select>
                      </div>
                    )}
                    {notifTargetType === 'group' && (
                      <div className="space-y-1.5">
                        <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest">Grupo</label>
                        <select value={notifTargetId || ''} onChange={(e) => setNotifTargetId(e.target.value ? parseInt(e.target.value) : null)} className="w-full bg-neutral-950 border border-neutral-850 text-neutral-300 rounded-xl px-3 py-2 text-xs">
                          <option value="">Seleccionar...</option>
                          {groups.map((g) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
                        </select>
                      </div>
                    )}
                    {notifTargetType === 'user' && (
                      <div className="space-y-1.5">
                        <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest">Usuario</label>
                        <select value={notifTargetId || ''} onChange={(e) => setNotifTargetId(e.target.value ? parseInt(e.target.value) : null)} className="w-full bg-neutral-950 border border-neutral-850 text-neutral-300 rounded-xl px-3 py-2 text-xs">
                          <option value="">Seleccionar...</option>
                          {adminUsers.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest">Expira (opcional)</label>
                    <input type="datetime-local" value={notifExpiresAt} onChange={(e) => setNotifExpiresAt(e.target.value)} className="input-stitch px-3 py-2 text-xs" />
                  </div>
                  <div className="flex justify-end pt-2">
                    <button type="submit" disabled={notifSubmitting} className="bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-neutral-950 text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 transition active:scale-95">
                      <Bell className="w-3.5 h-3.5" />
                      <span>{notifSubmitting ? 'Enviando...' : 'Enviar Notificación'}</span>
                    </button>
                  </div>
                </form>

                {/* Notificaciones automáticas: disparador manual (superadmin) */}
                {user.tipo === 'superadmin' && (
                  <div className="bg-neutral-900/40 border border-neutral-900 rounded-2xl p-5 space-y-3 max-w-2xl">
                    <div className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
                      <Send className="w-3.5 h-3.5 text-neutral-300" /> Notificaciones Automáticas
                    </div>
                    <p className="text-[10px] text-neutral-500">El scheduler envía avisos de partidos cada hora y rankings semanales los lunes. También puedes dispararlo manualmente.</p>
                    <div className="flex gap-2 flex-wrap">
                      <button type="button" onClick={async () => {
                        const r = await fetch('/api/admin/notify-scheduled', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ tipo: 'matches' }) });
                        const d = await r.json();
                        showToast(r.ok ? `✅ ${d.matches_notified ?? 0} avisos de partidos enviados` : d.error);
                      }} className="text-[10px] font-bold px-3 py-1.5 rounded-lg border border-neutral-700/50 bg-neutral-800/50 text-neutral-300 hover:bg-neutral-700/50 transition">
                        ⚽ Avisos de Partidos
                      </button>
                      <button type="button" onClick={async () => {
                        const r = await fetch('/api/admin/notify-scheduled', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ tipo: 'rankings' }) });
                        const d = await r.json();
                        showToast(r.ok ? `✅ Rankings enviados a ${d.companies_notified ?? 0} empresa(s)` : d.error);
                      }} className="text-[10px] font-bold px-3 py-1.5 rounded-lg border border-purple-500/30 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition">
                        📊 Rankings Semanales
                      </button>
                    </div>
                  </div>
                )}
              </div>}

            </section>
          )}

        </main>

        {/* BOTTOM MOBILE APP NAVIGATION (Hidden on Desktop) */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 bottom-nav-glass shadow-[0_-2px_24px_rgba(0,0,0,0.6)] flex items-center justify-around py-3 px-2 md:hidden" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
          
          {/* Tab Inicio */}
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center gap-1 py-1 transition flex-1 text-center select-none ${
              activeTab === 'dashboard' ? 'bottom-nav-active-pill font-black scale-105' : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[9px] font-bold tracking-wide uppercase">Inicio</span>
          </button>

          {/* Tab Partidos */}
          <button
            onClick={() => setActiveTab('partidos')}
            className={`flex flex-col items-center gap-1 py-1 transition flex-1 text-center select-none ${
              activeTab === 'partidos' ? 'bottom-nav-active-pill font-black scale-105' : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <Calendar className="w-5 h-5" />
            <span className="text-[9px] font-bold tracking-wide uppercase">Partidos</span>
          </button>

          {/* Tab Fixture */}
          <button
            onClick={() => setActiveTab('fixture')}
            className={`flex flex-col items-center gap-1 py-1 transition flex-1 text-center select-none ${
              activeTab === 'fixture' ? 'bottom-nav-active-pill font-black scale-105' : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <Trophy className="w-5 h-5" />
            <span className="text-[9px] font-bold tracking-wide uppercase">Fixture</span>
          </button>

          {/* Tab Reglas */}
          <button
            onClick={() => setActiveTab('reglas')}
            className={`flex flex-col items-center gap-1 py-1 transition flex-1 text-center select-none ${
              activeTab === 'reglas' ? 'bottom-nav-active-pill font-black scale-105' : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <BookOpen className="w-5 h-5" />
            <span className="text-[9px] font-bold tracking-wide uppercase">Reglas</span>
          </button>

          {/* Tab Leaderboard */}
          <button
            onClick={() => setActiveTab('ranking')}
            className={`flex flex-col items-center gap-1 py-1 transition flex-1 text-center select-none ${
              activeTab === 'ranking' ? 'bottom-nav-active-pill font-black scale-105' : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            <span className="text-[9px] font-bold tracking-wide uppercase">Ranking</span>
          </button>

          {/* Tab Perfil */}
          <button
            onClick={() => setActiveTab('perfil')}
            className={`flex flex-col items-center gap-1 py-1 transition flex-1 text-center select-none ${
              activeTab === 'perfil' ? 'bottom-nav-active-pill font-black scale-105' : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <User className="w-5 h-5" />
            <span className="text-[9px] font-bold tracking-wide uppercase">Mi Perfil</span>
          </button>

          {/* Tab Admin (Visible to admin and superadmin!) */}
          {user && (user.tipo === 'admin' || user.tipo === 'superadmin') && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`flex flex-col items-center gap-1 py-1 transition flex-1 text-center select-none ${
                activeTab === 'admin' ? 'bottom-nav-active-pill font-black scale-105' : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              {user.tipo === 'superadmin' ? <ShieldAlert className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
              <span className="text-[9px] font-bold tracking-wide uppercase">
                {user.tipo === 'superadmin' ? 'Sistema' : 'Empresa'}
              </span>
            </button>
          )}
        </nav>

        {/* --- PANEL: NOTIFICACIONES --- */}
        {notifPanelOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setNotifPanelOpen(false)} />
            <div className="relative w-full max-w-sm bg-neutral-950 border-l border-neutral-900 h-full overflow-y-auto flex flex-col shadow-2xl">
              <div className="flex justify-between items-center p-4 border-b border-neutral-900 sticky top-0 bg-neutral-950 z-10">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-yellow-500" />
                  <h3 className="text-sm font-black text-neutral-100 uppercase tracking-wider">Notificaciones</h3>
                  {unreadCount > 0 && (
                    <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">{unreadCount}</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {unreadCount > 0 && (
                    <button onClick={() => handleMarkNotificationRead()} className="text-[10px] text-neutral-500 hover:text-yellow-500 font-bold uppercase transition">
                      Marcar todo leído
                    </button>
                  )}
                  <button onClick={() => setNotifPanelOpen(false)} className="text-neutral-500 hover:text-neutral-200 transition">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex-1 divide-y divide-neutral-900">
                {notifications.length === 0 && (
                  <div className="p-8 text-center text-neutral-500 text-xs">Sin notificaciones</div>
                )}
                {notifications.map((n) => {
                  const colorMap: Record<string, string> = { info: 'text-neutral-300 border-neutral-700/50 bg-neutral-500/5', warning: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/5', success: 'text-green-400 border-green-500/30 bg-green-500/5', error: 'text-red-400 border-red-500/30 bg-red-500/5' };
                  const cls = colorMap[n.tipo] || colorMap.info;
                  return (
                    <div
                      key={n.id}
                      className={`p-4 cursor-pointer hover:bg-neutral-900/50 transition ${!n.leido ? 'border-l-2 border-l-yellow-500' : ''}`}
                      onClick={() => { if (!n.leido) handleMarkNotificationRead(n.id); }}
                    >
                      <span className={`inline-flex items-center text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border mb-2 ${cls}`}>{n.tipo}</span>
                      <div className="text-xs font-bold text-neutral-200">{n.titulo}</div>
                      <div className="text-[11px] text-neutral-500 mt-1 leading-relaxed">{n.contenido}</div>
                      <div className="text-[9px] text-neutral-600 mt-2">{new Date(n.created_at).toLocaleString('es-BO')}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* --- MODAL: MIEMBROS DE GRUPO --- */}
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
                {adminUsers.filter((u) => u.activo).map((u) => {
                  const isMember = groupMembers.some((m) => m.id === u.id);
                  return (
                    <div key={u.id} className="flex justify-between items-center p-4">
                      <div className="flex items-center gap-3">
                        <img src={u.avatar} className="w-8 h-8 rounded-full border border-neutral-800 bg-neutral-900" alt="avatar" />
                        <div>
                          <div className="text-xs font-bold text-neutral-200">{u.nombre}</div>
                          <div className="text-[9px] text-neutral-500 font-mono uppercase">{u.tipo}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleGroupMembership(groupMembersModal.id, u.id, isMember ? 'removeUser' : 'addUser')}
                        className={`text-[10px] font-bold px-3 py-1.5 rounded-xl border transition ${isMember ? 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20' : 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20'}`}
                      >
                        {isMember ? 'Quitar' : 'Agregar'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* --- POPUP 1: BETTING / CHRONO PROG FORM MODAL --- */}
        {/* ── MODAL EDITAR USUARIO ── */}
        {editUserModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setEditUserModal(null)}>
            <div className="glass-card border border-neutral-800/80 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5" onClick={(e) => e.stopPropagation()}>
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
                  <input
                    type="text" required value={editUserNombre}
                    onChange={(e) => setEditUserNombre(e.target.value)}
                    className="w-full input-stitch px-3 py-2.5 text-sm"
                    placeholder="Nombre completo"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest">Correo Electrónico</label>
                  <input
                    type="email" required value={editUserEmail}
                    onChange={(e) => setEditUserEmail(e.target.value)}
                    className="w-full input-stitch px-3 py-2.5 text-sm"
                    placeholder="correo@ejemplo.com"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                    📱 Celular / WhatsApp
                    <span className="text-neutral-600 normal-case font-medium">(opcional)</span>
                  </label>
                  <input
                    type="tel" value={editUserTelefono}
                    onChange={(e) => setEditUserTelefono(e.target.value)}
                    className="w-full input-stitch px-3 py-2.5 text-sm"
                    placeholder="+591 7XXXXXXX"
                  />
                </div>

                {user.tipo === 'superadmin' && (
                  <div className="space-y-1.5">
                    <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest">Rol</label>
                    <select
                      value={editUserTipo}
                      onChange={(e) => setEditUserTipo(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-850 text-neutral-300 rounded-xl px-3 py-2.5 text-sm focus:ring-1 focus:ring-yellow-500/30"
                    >
                      <option value="externo">Usuario Externo</option>
                      <option value="interno">Usuario Interno</option>
                      <option value="admin">Administrador</option>
                      <option value="superadmin">Super Administrador</option>
                    </select>
                  </div>
                )}

                {user.tipo === 'superadmin' && editUserTipo === 'admin' && (
                  <div className="space-y-2">
                    <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest">
                      Empresas que administra
                    </label>
                    {companies.length === 0 ? (
                      <p className="text-neutral-500 text-xs">No hay empresas registradas.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {companies.map((c: any) => {
                          const selected = editUserCompanyIds.includes(c.id);
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() =>
                                setEditUserCompanyIds((prev) =>
                                  selected ? prev.filter((id) => id !== c.id) : [...prev, c.id]
                                )
                              }
                              className={`text-[11px] px-3 py-1.5 rounded-full border font-bold transition ${selected ? 'opacity-100' : 'opacity-30 hover:opacity-60'}`}
                              style={{
                                color: c.color,
                                borderColor: c.color + '60',
                                backgroundColor: selected ? c.color + '20' : 'transparent',
                              }}
                            >
                              {c.nombre}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    <p className="text-neutral-600 text-[10px]">Seleccioná las empresas que este administrador puede gestionar.</p>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                    <KeyRound className="w-3 h-3" /> Nueva Contraseña
                    <span className="text-neutral-600 normal-case font-medium">(dejar vacío para no cambiar)</span>
                  </label>
                  <input
                    type="password" value={editUserPassword}
                    onChange={(e) => setEditUserPassword(e.target.value)}
                    className="w-full input-stitch px-3 py-2.5 text-sm"
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                </div>

                {editUserError && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl font-semibold">
                    {editUserError}
                  </div>
                )}

                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setEditUserModal(null)} className="flex-1 btn-secondary-stitch py-2.5 text-xs font-black uppercase tracking-wider">
                    Cancelar
                  </button>
                  <button type="submit" disabled={editUserSubmitting} className="flex-1 btn-primary-stitch py-2.5 text-xs font-black uppercase tracking-wider disabled:opacity-50">
                    {editUserSubmitting ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── MODAL SELECCIÓN DE EMPRESA ── */}
        {companySelectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setCompanySelectModal(false)}>
            <div className="glass-card border border-neutral-800/80 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-black uppercase text-neutral-100 tracking-wider">Seleccionar Empresa</h3>
                  <p className="text-[10px] text-neutral-500 mt-0.5">Elige la empresa para ver su clasificación y pozo</p>
                </div>
                <button onClick={() => setCompanySelectModal(false)} className="text-neutral-500 hover:text-neutral-300 transition p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2">
                {getAvailableCompanies().map((c: any) => {
                  const isSelected = c.id === selectedCompanyId;
                  const participantes = leaderboard.filter((r: any) => (r.companies || []).some((rc: any) => rc.id === c.id)).length;
                  const monto = parseFloat(c.monto_participacion) || 150;
                  return (
                    <button
                      key={c.id}
                      onClick={() => { setSelectedCompanyId(c.id); setCompanySelectModal(false); }}
                      className={`w-full flex items-center justify-between p-4 rounded-xl border transition text-left ${isSelected ? 'border-yellow-500/50 bg-yellow-500/8' : 'border-neutral-800 bg-neutral-900/40 hover:border-neutral-700'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
                        <div>
                          <div className="text-sm font-black text-neutral-100">{c.nombre}</div>
                          <div className="text-[10px] text-neutral-500">{participantes} participante{participantes !== 1 ? 's' : ''}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-black text-yellow-500">Bs. {monto.toLocaleString('es-BO')}</div>
                        <div className="text-[9px] text-neutral-500 uppercase tracking-wider">por persona</div>
                        {isSelected && <div className="text-[9px] text-yellow-500 font-black mt-0.5">✓ Seleccionada</div>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {betModalMatch && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-sm p-4">
            <div className="glass-card border-t-2 border-t-yellow-500 border-x border-b border-neutral-800/80 rounded-xl w-full max-w-md p-6 shadow-2xl animate-slide-in-up space-y-6">
              
              {/* Modal Header */}
              <div className="flex justify-between items-center border-b border-neutral-800/40 pb-3">
                <div>
                  <h3 className="text-sm font-black uppercase text-neutral-100">Hacer Pronóstico</h3>
                  <span className="text-[9px] text-neutral-500 uppercase tracking-widest font-mono">Apuestas Cerradas al inicio del partido</span>
                </div>
                <button 
                  onClick={() => setBetModalMatch(null)}
                  className="bg-neutral-950 hover:bg-neutral-800 text-neutral-400 p-2 rounded-full border border-neutral-850 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Score Selector Controls */}
              <div className="flex justify-between items-center py-4 bg-neutral-950 border border-neutral-850 rounded-lg px-6 shadow-inner">
                
                {/* Local Input Selector */}
                <div className="flex flex-col items-center gap-2 w-1/3">
                  <div className="w-12 h-12 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-2xl shadow-inner select-none flex-shrink-0 animate-pulse">
                    {getTeamFlag(betModalMatch.local)}
                  </div>
                  <span className="text-[10px] font-black text-neutral-300 uppercase truncate w-full text-center tracking-wider">{betModalMatch.local}</span>
                  <div className="flex items-center gap-1.5 mt-2">
                    <button 
                      onClick={() => setBetPredLocal(Math.max(0, betPredLocal - 1))}
                      className="w-8 h-8 rounded-full border border-neutral-800 flex items-center justify-center font-bold text-sm bg-neutral-900 text-neutral-300 transition active:scale-90 hover:border-yellow-500/25"
                    >
                      -
                    </button>
                    <span className="text-lg font-black font-mono w-4 text-center text-yellow-500">{betPredLocal}</span>
                    <button 
                      onClick={() => setBetPredLocal(betPredLocal + 1)}
                      className="w-8 h-8 rounded-full border border-neutral-800 flex items-center justify-center font-bold text-sm bg-neutral-900 text-neutral-300 transition active:scale-90 hover:border-yellow-500/25"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Colon Separator */}
                <span className="text-2xl text-neutral-700 font-extrabold font-mono">:</span>

                {/* Visitante Input Selector */}
                <div className="flex flex-col items-center gap-2 w-1/3">
                  <div className="w-12 h-12 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-2xl shadow-inner select-none flex-shrink-0 animate-pulse">
                    {getTeamFlag(betModalMatch.visitante)}
                  </div>
                  <span className="text-[10px] font-black text-neutral-300 uppercase truncate w-full text-center tracking-wider">{betModalMatch.visitante}</span>
                  <div className="flex items-center gap-1.5 mt-2">
                    <button 
                      onClick={() => setBetPredVisitante(Math.max(0, betPredVisitante - 1))}
                      className="w-8 h-8 rounded-full border border-neutral-800 flex items-center justify-center font-bold text-sm bg-neutral-900 text-neutral-300 transition active:scale-90 hover:border-yellow-500/25"
                    >
                      -
                    </button>
                    <span className="text-lg font-black font-mono w-4 text-center text-yellow-500">{betPredVisitante}</span>
                    <button 
                      onClick={() => setBetPredVisitante(betPredVisitante + 1)}
                      className="w-8 h-8 rounded-full border border-neutral-800 flex items-center justify-center font-bold text-sm bg-neutral-900 text-neutral-300 transition active:scale-90 hover:border-yellow-500/25"
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
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-md p-6 shadow-2xl animate-slide-in-up space-y-6">
              
              <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
                <div>
                  <h3 className="text-sm font-black uppercase text-neutral-100">Actualizar Marcador</h3>
                  <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-mono">Modo Administrador</span>
                </div>
                <button 
                  onClick={() => setAdminMatchModal(null)}
                  className="bg-neutral-950 hover:bg-neutral-800 text-neutral-400 p-2 rounded-full border border-neutral-800 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Score inputs */}
              <div className="flex justify-between items-center py-4 bg-neutral-950 border border-neutral-800/80 rounded-2xl px-6">
                
                {/* Local Input Selector */}
                <div className="flex flex-col items-center gap-2 w-1/3">
                  <span className="text-3xl">{getTeamFlag(adminMatchModal.local)}</span>
                  <span className="text-xs font-bold text-neutral-200 uppercase truncate w-full text-center">{adminMatchModal.local}</span>
                  <input 
                    type="number"
                    min="0"
                    value={adminGolesLocal}
                    onChange={(e) => setAdminGolesLocal(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-16 bg-neutral-900 border border-neutral-800 text-center py-2 text-yellow-500 font-mono font-black text-lg rounded-lg outline-none mt-2"
                  />
                </div>

                {/* Colon Separator */}
                <span className="text-2xl text-neutral-700 font-extrabold font-mono">:</span>

                {/* Visitante Input Selector */}
                <div className="flex flex-col items-center gap-2 w-1/3">
                  <span className="text-3xl">{getTeamFlag(adminMatchModal.visitante)}</span>
                  <span className="text-xs font-bold text-neutral-200 uppercase truncate w-full text-center">{adminMatchModal.visitante}</span>
                  <input 
                    type="number"
                    min="0"
                    value={adminGolesVisitante}
                    onChange={(e) => setAdminGolesVisitante(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-16 bg-neutral-900 border border-neutral-800 text-center py-2 text-yellow-500 font-mono font-black text-lg rounded-lg outline-none mt-2"
                  />
                </div>

              </div>

              {/* Match State Selector */}
              <div>
                <label className="block text-neutral-400 text-xs font-bold uppercase tracking-wide mb-2">Estado del Partido</label>
                <select
                  value={adminEstado}
                  onChange={(e) => setAdminEstado(e.target.value as any)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-neutral-300 outline-none transition"
                >
                  <option value="upcoming">Programado (upcoming)</option>
                  <option value="live">En Juego (live)</option>
                  <option value="finished">Finalizado (finished)</option>
                </select>
              </div>

              {/* Streaming Links Input */}
              <div>
                <label className="block text-neutral-400 text-xs font-bold uppercase tracking-wide mb-2">Enlaces de Transmisión (separados por coma)</label>
                <textarea
                  value={adminTransmisionEnlaces}
                  onChange={(e) => setAdminTransmisionEnlaces(e.target.value)}
                  placeholder="ej: Bolivia TV: https://boliviatv.bo, Unitel: https://unitel.tv, Red Uno"
                  rows={2}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-xs text-neutral-300 outline-none transition focus:border-yellow-500/35 resize-none placeholder-neutral-700 font-mono"
                />
              </div>

              {/* Save action button */}
              <button
                onClick={handleAdminUpdateMatch}
                disabled={adminSubmitting}
                className="w-full bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-500/50 text-neutral-950 font-bold py-3.5 rounded-xl text-sm transition tracking-wider uppercase flex items-center justify-center gap-2 active:scale-[0.98]"
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
              className="bg-neutral-900 border border-neutral-800 rounded-t-3xl sm:rounded-3xl w-full max-w-2xl shadow-2xl animate-slide-in-up flex flex-col"
              style={{ maxHeight: '92vh' }}
            >

              {/* Header — no scrollea, siempre visible */}
              <div className="flex justify-between items-center border-b border-neutral-800 px-6 py-4 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-yellow-500" />
                  <h3 className="text-sm font-black uppercase text-neutral-100">Resumen del Partido</h3>
                </div>
                <button
                  onClick={() => {
                    setSummaryModalMatch(null);
                    setCommunityBets([]);
                  }}
                  className="bg-neutral-950 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-100 p-2.5 rounded-full border border-neutral-800 transition flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable body */}
              <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6 overscroll-contain">

              {/* Banner Head */}
              <div className="bg-neutral-950 border border-neutral-800 rounded-2xl overflow-hidden">

                {/* Fase + estado */}
                <div className="flex justify-between items-center px-4 pt-4 pb-2">
                  <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-mono font-bold">
                    {summaryModalMatch.fase}{summaryModalMatch.grupo ? ` · Grupo ${summaryModalMatch.grupo}` : ''}
                  </span>
                  <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                    summaryModalMatch.estado === 'live' ? 'bg-red-500/15 text-red-400 border border-red-500/30' :
                    summaryModalMatch.estado === 'finished' ? 'bg-neutral-800 text-neutral-500' :
                    'bg-neutral-800/50 text-neutral-300 border border-neutral-700/50'
                  }`}>
                    {summaryModalMatch.estado === 'live' ? '🔴 En juego' : summaryModalMatch.estado === 'finished' ? '⚫ Finalizado' : '🔵 Próximamente'}
                  </span>
                </div>

                {/* Teams + score */}
                <div className="flex justify-between items-center px-6 py-4">
                  <div className="flex flex-col items-center w-[38%] gap-1 text-center">
                    <span className="text-4xl">{getTeamFlag(summaryModalMatch.local)}</span>
                    <span className="text-xs font-black text-neutral-200 uppercase leading-tight">{summaryModalMatch.local}</span>
                  </div>

                  <div className="flex flex-col items-center justify-center w-[24%] gap-1">
                    {summaryModalMatch.estado !== 'upcoming' ? (
                      <span className="font-mono text-3xl font-black text-yellow-500 tracking-wider">
                        {summaryModalMatch.goles_local}–{summaryModalMatch.goles_visitante}
                      </span>
                    ) : (
                      <span className="text-neutral-500 font-black text-lg tracking-widest">VS</span>
                    )}
                  </div>

                  <div className="flex flex-col items-center w-[38%] gap-1 text-center">
                    <span className="text-4xl">{getTeamFlag(summaryModalMatch.visitante)}</span>
                    <span className="text-xs font-black text-neutral-200 uppercase leading-tight">{summaryModalMatch.visitante}</span>
                  </div>
                </div>

                {/* Fecha + hora + estadio + mapa */}
                <div className="border-t border-neutral-800/60 px-4 py-3 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-neutral-400">
                    <span className="text-base">📅</span>
                    <span className="font-bold">
                      {new Date(summaryModalMatch.fecha).toLocaleDateString('es-ES', {
                        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                      })}
                    </span>
                    <span className="text-neutral-600">·</span>
                    <span className="font-mono font-bold text-yellow-500">
                      {new Date(summaryModalMatch.fecha).toLocaleTimeString('es-ES', {
                        hour: '2-digit', minute: '2-digit'
                      })} (hora local)
                    </span>
                  </div>

                  {summaryModalMatch.estadio && (
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs text-neutral-400">
                        <span className="text-base">🏟️</span>
                        <span className="font-bold text-neutral-300">{summaryModalMatch.estadio}</span>
                      </div>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(summaryModalMatch.estadio)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 bg-neutral-800/50 hover:bg-neutral-700/50 border border-neutral-700/50 text-neutral-300 text-[10px] font-bold px-2 py-1 rounded-lg transition flex-shrink-0"
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
                  <div className="flex justify-between items-center border-b border-neutral-800 pb-1.5">
                    <h4 className="text-xs font-black text-neutral-400 uppercase tracking-widest">Dónde Ver el Partido</h4>
                    <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Enlaces Oficiales</span>
                  </div>
                  {!user ? (
                    <div className="bg-neutral-950/40 border border-dashed border-neutral-800 rounded-2xl p-4 text-center">
                      <p className="text-[11px] text-neutral-400 font-medium">
                        🔒 <span className="text-yellow-500">Inicia sesión</span> para acceder a los enlaces oficiales de transmisión de este partido.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-neutral-950 border border-neutral-850 p-4 rounded-2xl flex flex-wrap gap-2">
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
                              className="bg-neutral-900 hover:bg-yellow-500 hover:text-neutral-950 border border-neutral-850 hover:border-yellow-500 text-neutral-300 text-[10px] font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 active:scale-[0.98] select-none"
                              onClick={(e) => e.stopPropagation()}
                            >
                              🎥 <span>{name}</span>
                            </a>
                          );
                        }
                        return (
                          <span key={idx} className="bg-neutral-900 border border-neutral-850 text-neutral-400 text-[10px] px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 select-none">
                            📺 <span>{name}</span> {url ? <span className="text-neutral-550 font-normal">({url})</span> : ''}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Tactical News and Stadium Info Block in Spanish (Give Voice to Football API) */}
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-neutral-800 pb-1.5">
                  <h4 className="text-xs font-black text-neutral-400 uppercase tracking-widest">Información & Previa (GVTF API)</h4>
                  {matchStatsInfo && (
                    <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded uppercase font-bold tracking-wider font-mono">
                      Conexión GVTF Activa
                    </span>
                  )}
                </div>

                {loadingNews ? (
                  <div className="py-6 text-center text-xs text-neutral-500 flex items-center justify-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-yellow-500" />
                    <span>Cargando noticias y análisis táctico...</span>
                  </div>
                ) : (
                  <>
                    {/* Stadium & short preview metadata */}
                    {matchStatsInfo && (
                      <div className="bg-neutral-950/60 p-4 border border-neutral-850 rounded-2xl text-xs space-y-2">
                        <div className="grid grid-cols-2 gap-3 text-[11px]">
                          <div>
                            <span className="text-neutral-500 block">🏟️ Estadio</span>
                            <span className="font-extrabold text-neutral-300">{matchStatsInfo.estadio}</span>
                          </div>
                          <div>
                            <span className="text-neutral-500 block">⛅ Clima / Árbitro</span>
                            <span className="font-extrabold text-neutral-300">{matchStatsInfo.temperatura} | {matchStatsInfo.arbitro}</span>
                          </div>
                        </div>
                        <div className="pt-2 border-t border-neutral-900 text-neutral-400 leading-relaxed italic text-[11px]">
                          {matchStatsInfo.historialCorto}
                        </div>
                      </div>
                    )}

                    {/* Pre match news items in Spanish */}
                    <div className="space-y-3">
                      {matchNews.map((n) => (
                        <div key={n.id} className="bg-neutral-950/45 p-3.5 border border-neutral-850 rounded-2xl space-y-1.5 hover:border-neutral-800 transition">
                          <div className="flex justify-between items-center text-[9px] font-bold">
                            <span className="text-yellow-500 font-black tracking-widest">{n.categoria}</span>
                            <span className="text-neutral-500">{n.tiempo}</span>
                          </div>
                          <h5 className="font-extrabold text-[12px] text-neutral-200 leading-tight">{n.titulo}</h5>
                          <p className="text-neutral-500 text-[11px] leading-relaxed">{n.cuerpo}</p>
                          <div className="text-[8px] text-neutral-500 text-right uppercase tracking-wider font-semibold">
                            Redactor: {n.autor}
                          </div>
                        </div>
                      ))}
                      {matchNews.length === 0 && (
                        <div className="py-4 text-center text-xs text-neutral-600 italic">No hay noticias previas disponibles para este partido</div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Match Statistics — solo si el partido ya comenzó */}
              {summaryModalMatch.estado !== 'upcoming' && (
              <div className="space-y-4">
                <h4 className="text-xs font-black text-neutral-400 uppercase tracking-widest border-b border-neutral-800 pb-1.5">Estadísticas del Encuentro</h4>

                {/* Stat 1: Possession */}
                {(() => {
                  const posLocal = 45 + (summaryModalMatch.id % 3 === 0 ? 10 : summaryModalMatch.id % 2 === 0 ? -5 : 2);
                  const posVisitante = 100 - posLocal;
                  return (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-mono font-bold">
                        <span className="text-neutral-400">{posLocal}%</span>
                        <span className="text-neutral-500 uppercase tracking-wider text-[10px]">Posesión de Balón</span>
                        <span className="text-neutral-400">{posVisitante}%</span>
                      </div>
                      <div className="h-2 w-full bg-neutral-950 rounded-full flex overflow-hidden border border-neutral-800">
                        <div className="h-full bg-yellow-500" style={{ width: `${posLocal}%` }}></div>
                        <div className="h-full bg-neutral-800" style={{ width: `${posVisitante}%` }}></div>
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
                        <span className="text-neutral-400">{shotsLocal}</span>
                        <span className="text-neutral-500 uppercase tracking-wider text-[10px]">Remates Totales</span>
                        <span className="text-neutral-400">{shotsVisitante}</span>
                      </div>
                      <div className="h-2 w-full bg-neutral-950 rounded-full flex overflow-hidden border border-neutral-800">
                        <div className="h-full bg-yellow-500" style={{ width: `${localPercent}%` }}></div>
                        <div className="h-full bg-neutral-800" style={{ width: `${100 - localPercent}%` }}></div>
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
                        <span className="text-neutral-400">{foulsLocal}</span>
                        <span className="text-neutral-500 uppercase tracking-wider text-[10px]">Faltas Cometidas</span>
                        <span className="text-neutral-400">{foulsVisitante}</span>
                      </div>
                      <div className="h-2 w-full bg-neutral-950 rounded-full flex overflow-hidden border border-neutral-800">
                        <div className="h-full bg-yellow-500" style={{ width: `${localPercent}%` }}></div>
                        <div className="h-full bg-neutral-800" style={{ width: `${100 - localPercent}%` }}></div>
                      </div>
                    </div>
                  );
                })()}
              </div>
              )}

              {/* Community Predictions list */}
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b border-neutral-800 pb-1.5">
                  <h4 className="text-xs font-black text-neutral-400 uppercase tracking-widest">Apuestas de la Comunidad</h4>
                  <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Pronósticos realizados</span>
                </div>

                {!user ? (
                  <div className="bg-neutral-950/40 border border-dashed border-neutral-800 rounded-2xl p-6 text-center space-y-3">
                    <span className="text-2xl">🔒</span>
                    <p className="text-xs text-neutral-400 font-medium">
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
                  <div className="py-4 text-center text-xs text-neutral-500">Cargando pronósticos...</div>
                ) : (
                  <div className="bg-neutral-950 border border-neutral-850 rounded-2xl divide-y divide-neutral-900 max-h-48 overflow-y-auto">
                    {communityBets.map((bet) => (
                      <div key={bet.id} className="flex justify-between items-center p-3 text-xs">
                        <div className="flex items-center gap-2">
                          <img src={bet.avatar} className="w-7 h-7 rounded-full bg-neutral-900 border border-neutral-800" alt="avatar" />
                          <div>
                            <span className="font-bold text-neutral-300">{bet.nombre}</span>
                            <span className="text-[9px] text-neutral-500 uppercase font-mono tracking-widest ml-1">{bet.tipo}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-black text-neutral-200 font-mono">{bet.pred_local} - {bet.pred_visitante}</span>
                          {bet.puntos !== null && (
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black ${
                              bet.puntos === 3 ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                              bet.puntos === 1 ? 'bg-neutral-800/50 text-neutral-300 border border-neutral-700/50' :
                              'bg-neutral-900 text-neutral-500 border border-neutral-800/40'
                            }`}>
                              +{bet.puntos} PTS
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    {communityBets.length === 0 && (
                      <div className="py-6 text-center text-xs text-neutral-600 italic">Nadie ha realizado pronósticos para este partido aún</div>
                    )}
                  </div>
                )}
              </div>

              {/* Close button repeated at bottom for convenience on long content */}
              <div className="flex-shrink-0 border-t border-neutral-800 px-6 py-4">
                <button
                  onClick={() => {
                    setSummaryModalMatch(null);
                    setCommunityBets([]);
                  }}
                  className="w-full bg-neutral-950 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-100 py-2.5 rounded-xl border border-neutral-800 transition text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2"
                >
                  <X className="w-3.5 h-3.5" /> Cerrar
                </button>
              </div>

            </div>
          </div>
        </div>
        )}

      </div>

      {/* Idle session warning modal */}
      {showIdleWarning && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-neutral-950 border border-yellow-500/30 rounded-2xl p-8 max-w-sm w-full shadow-2xl text-center space-y-5">
            <div className="text-5xl">⏰</div>
            <h3 className="text-base font-black text-neutral-100 uppercase tracking-wider">
              Sesión por expirar
            </h3>
            <p className="text-neutral-400 text-sm leading-relaxed">
              Tu sesión expirará en <strong className="text-yellow-400">5 minutos</strong> por inactividad. ¿Querés continuar?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowIdleWarning(false);
                  if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
                  if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
                  idleTimerRef.current = setTimeout(() => {
                    setShowIdleWarning(true);
                    warningTimerRef.current = setTimeout(handleLogout, IDLE_LOGOUT_MS - IDLE_WARNING_MS);
                  }, IDLE_WARNING_MS);
                }}
                className="flex-1 btn-primary-stitch py-3 text-sm font-bold uppercase tracking-wider"
              >
                Continuar
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 py-3 text-sm font-bold rounded-xl transition uppercase tracking-wider"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
