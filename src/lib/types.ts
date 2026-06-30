export interface MatchStats {
  time?: string;
  extra_time?: string;
  status?: string;
  manual_control?: boolean;
  penales_local?: number | null;
  penales_visitante?: number | null;
  penales_habilitados?: boolean;
  ganador?: string;
  eventos?: MatchEvent[];
  [key: string]: unknown;
}

export interface MatchEvent {
  tipo: string;
  minuto?: string;
  jugador?: string;
  equipo?: string;
}

export interface Match {
  id: number;
  local: string;
  visitante: string;
  fecha: string;
  estado: 'upcoming' | 'live' | 'finished';
  goles_local: number | null;
  goles_visitante: number | null;
  fase: string;
  grupo: string | null;
  stats: MatchStats | null;
  penales_habilitados?: boolean;
  finished_at?: string | null;
  updated_at?: string;
}

export interface Prediction {
  id: number;
  user_id: number;
  match_id: number;
  pred_local: number;
  pred_visitante: number;
  puntos: number | null;
  created_at: string;
}

export interface UserRow {
  id: number;
  nombre: string;
  email: string;
  avatar: string;
  tipo: string;
  aprobado: boolean;
  denegado: boolean;
  activo: boolean;
  telefono?: string | null;
  tincaso?: string | null;
  notif_prefs?: unknown;
  arbitro_marcador?: boolean;
  is_moderador?: boolean;
}

export interface StandingEntry {
  team: string;
  pts: number;
  pj: number;
  pg: number;
  pe: number;
  pp: number;
  gf: number;
  gc: number;
  dif: number;
}
