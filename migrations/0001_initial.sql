-- Initial schema — mirrors init.sql (idempotent)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  tipo VARCHAR(50) DEFAULT 'externo',
  avatar TEXT,
  telefono VARCHAR(30),
  tincaso VARCHAR(255),
  notif_prefs JSONB DEFAULT '{"email": true, "push": true}'::jsonb,
  pwa_installed BOOLEAN DEFAULT FALSE,
  pwa_updated_at TIMESTAMP WITH TIME ZONE,
  activo BOOLEAN DEFAULT TRUE,
  aprobado BOOLEAN DEFAULT FALSE,
  denegado BOOLEAN DEFAULT FALSE,
  arbitro_marcador BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS matches (
  id SERIAL PRIMARY KEY,
  external_id INTEGER UNIQUE,
  fecha TIMESTAMP WITH TIME ZONE NOT NULL,
  local VARCHAR(255) NOT NULL,
  visitante VARCHAR(255) NOT NULL,
  logo_local TEXT,
  logo_visitante TEXT,
  estado VARCHAR(50) DEFAULT 'upcoming',
  goles_local INTEGER DEFAULT 0,
  goles_visitante INTEGER DEFAULT 0,
  fase VARCHAR(100) DEFAULT 'Fase de Grupos',
  grupo VARCHAR(10),
  estadio VARCHAR(255),
  transmision_enlaces TEXT DEFAULT '',
  stats JSONB DEFAULT '{}',
  last_synced_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS predictions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  match_id INTEGER REFERENCES matches(id) ON DELETE CASCADE,
  pred_local INTEGER NOT NULL,
  pred_visitante INTEGER NOT NULL,
  puntos INTEGER DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_user_match UNIQUE(user_id, match_id)
);
CREATE TABLE IF NOT EXISTS leaderboard (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  puntos_totales INTEGER DEFAULT 0,
  exactos INTEGER DEFAULT 0,
  posicion INTEGER DEFAULT 1,
  posicion_anterior INTEGER DEFAULT 1,
  tendencia VARCHAR(10) DEFAULT 'same',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS sync_log (
  id SERIAL PRIMARY KEY,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  matches_updated INTEGER DEFAULT 0,
  goals_detected INTEGER DEFAULT 0,
  matches_finished INTEGER DEFAULT 0,
  errors TEXT[],
  duration_ms INTEGER
);
CREATE TABLE IF NOT EXISTS companies (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  logo TEXT,
  color VARCHAR(20) DEFAULT '#6366f1',
  activo BOOLEAN DEFAULT TRUE,
  monto_participacion NUMERIC DEFAULT 150,
  modo_apuesta VARCHAR(20) DEFAULT 'partido',
  modos_por_fase JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS user_companies (
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, company_id)
);
CREATE TABLE IF NOT EXISTS system_logs (
  id SERIAL PRIMARY KEY,
  nivel VARCHAR(20) DEFAULT 'info' NOT NULL,
  categoria VARCHAR(50) NOT NULL,
  mensaje TEXT NOT NULL,
  detalles TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS score_change_log (
  id SERIAL PRIMARY KEY,
  match_id INTEGER REFERENCES matches(id) ON DELETE CASCADE,
  source VARCHAR(50) NOT NULL,
  old_goles_local INTEGER,
  old_goles_visitante INTEGER,
  new_goles_local INTEGER NOT NULL,
  new_goles_visitante INTEGER NOT NULL,
  estado VARCHAR(20) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_scl_created_at ON score_change_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scl_match_id ON score_change_log (match_id);
CREATE TABLE IF NOT EXISTS pending_downgrades (
  id SERIAL PRIMARY KEY,
  match_id INTEGER UNIQUE REFERENCES matches(id) ON DELETE CASCADE,
  proposed_local INTEGER NOT NULL,
  proposed_visitante INTEGER NOT NULL,
  sources_agreed INTEGER DEFAULT 0 NOT NULL,
  total_sources INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  applied BOOLEAN DEFAULT FALSE
);
CREATE TABLE IF NOT EXISTS user_presence (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_user_presence_seen ON user_presence (last_seen_at DESC);
CREATE TABLE IF NOT EXISTS match_notif_log (
  match_id INTEGER NOT NULL,
  event VARCHAR(30) NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (match_id, event)
);
CREATE TABLE IF NOT EXISTS mail_queue (
  id SERIAL PRIMARY KEY,
  destinatarios TEXT NOT NULL,
  asunto TEXT NOT NULL,
  html TEXT NOT NULL,
  cc TEXT,
  bcc TEXT,
  intentos INTEGER DEFAULT 0 NOT NULL,
  estado VARCHAR(20) DEFAULT 'pending' NOT NULL,
  error_mensaje TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP WITH TIME ZONE
);
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(255) NOT NULL,
  details TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS rate_limits (
  key VARCHAR(255) PRIMARY KEY,
  points INTEGER DEFAULT 0,
  expire_at TIMESTAMP WITH TIME ZONE NOT NULL
);
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  titulo VARCHAR(255) NOT NULL,
  contenido TEXT NOT NULL,
  tipo VARCHAR(20) DEFAULT 'info',
  target_type VARCHAR(20) DEFAULT 'all',
  target_id INTEGER,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS notification_reads (
  notification_id INTEGER REFERENCES notifications(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (notification_id, user_id)
);
CREATE TABLE IF NOT EXISTS user_payments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  monto NUMERIC NOT NULL DEFAULT 0,
  fecha TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  comprobante_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, endpoint)
);
CREATE TABLE IF NOT EXISTS settings (
  key VARCHAR(50) PRIMARY KEY,
  value TEXT
);
INSERT INTO settings (key, value) VALUES
('app_name', 'Mundial 2026'),
('app_logo', '🏆'),
('mail_notifications_enabled', 'true'),
('prediction_close_minutes', '15')
ON CONFLICT (key) DO NOTHING;
CREATE TABLE IF NOT EXISTS groups (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  color VARCHAR(20) DEFAULT '#10b981',
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS user_groups (
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, group_id)
);
CREATE TABLE IF NOT EXISTS scheduled_notify_log (
  id SERIAL PRIMARY KEY,
  tipo VARCHAR(50) NOT NULL,
  referencia_id INTEGER,
  enviado_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS passkeys (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  credential_id VARCHAR(512) UNIQUE NOT NULL,
  public_key BYTEA NOT NULL,
  counter BIGINT DEFAULT 0 NOT NULL,
  device_type VARCHAR(32) NOT NULL,
  backed_up BOOLEAN DEFAULT FALSE NOT NULL,
  transports VARCHAR(64)[],
  label VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_used_at TIMESTAMP WITH TIME ZONE
);
CREATE TABLE IF NOT EXISTS invitations (
  id SERIAL PRIMARY KEY,
  token VARCHAR(255) UNIQUE NOT NULL,
  company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
  created_by INTEGER REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  email_usado VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE OR REPLACE FUNCTION recalculate_leaderboard()
RETURNS void AS $$
DECLARE
  r RECORD;
  prev_pos INTEGER;
  new_tendencia VARCHAR(10);
  final_winner VARCHAR(100) := NULL;
BEGIN
  SELECT CASE
    WHEN goles_local > goles_visitante THEN local
    WHEN goles_local < goles_visitante THEN visitante
    ELSE COALESCE(stats->>'ganador', stats->>'winner', '')
  END INTO final_winner
  FROM matches WHERE id = 104 AND estado = 'finished';

  DELETE FROM leaderboard
  WHERE user_id NOT IN (
    SELECT id FROM users WHERE activo = true AND aprobado = true
      AND (tipo != 'superadmin' OR EXISTS (SELECT 1 FROM user_companies WHERE user_id = id))
  );

  UPDATE predictions p
  SET puntos = CASE
    WHEN m.estado = 'upcoming' THEN 0
    WHEN p.pred_local = m.goles_local AND p.pred_visitante = m.goles_visitante THEN 3
    WHEN (p.pred_local > p.pred_visitante AND m.goles_local > m.goles_visitante) OR
         (p.pred_local < p.pred_visitante AND m.goles_local < m.goles_visitante) OR
         (p.pred_local = p.pred_visitante AND m.goles_local = m.goles_visitante) THEN 1
    ELSE 0
  END
  FROM matches m WHERE p.match_id = m.id;

  FOR r IN (
    WITH user_scores AS (
      SELECT u.id AS u_id,
        COALESCE(SUM(p.puntos), 0) + (CASE WHEN final_winner IS NOT NULL AND final_winner <> '' AND u.tincaso = final_winner THEN 5 ELSE 0 END) AS total_pts,
        COALESCE(SUM(CASE WHEN p.puntos = 3 THEN 1 ELSE 0 END), 0) AS exact_cnt
      FROM users u LEFT JOIN predictions p ON u.id = p.user_id
      WHERE u.activo = true AND u.aprobado = true
        AND (u.tipo != 'superadmin' OR EXISTS (SELECT 1 FROM user_companies WHERE user_id = u.id))
      GROUP BY u.id, u.tincaso
    ), ranked AS (
      SELECT u_id, total_pts, exact_cnt,
        ROW_NUMBER() OVER (ORDER BY total_pts DESC, exact_cnt DESC, u_id ASC) as rk
      FROM user_scores
    )
    SELECT * FROM ranked
  ) LOOP
    SELECT posicion INTO prev_pos FROM leaderboard WHERE user_id = r.u_id;
    IF prev_pos IS NULL THEN prev_pos := r.rk; new_tendencia := 'same';
    ELSIF r.rk < prev_pos THEN new_tendencia := 'up';
    ELSIF r.rk > prev_pos THEN new_tendencia := 'down';
    ELSE new_tendencia := 'same';
    END IF;
    INSERT INTO leaderboard (user_id, puntos_totales, exactos, posicion, posicion_anterior, tendencia, updated_at)
    VALUES (r.u_id, r.total_pts, r.exact_cnt, r.rk, prev_pos, new_tendencia, CURRENT_TIMESTAMP)
    ON CONFLICT (user_id) DO UPDATE SET
      puntos_totales = EXCLUDED.puntos_totales, exactos = EXCLUDED.exactos,
      posicion_anterior = EXCLUDED.posicion_anterior, posicion = EXCLUDED.posicion,
      tendencia = EXCLUDED.tendencia, updated_at = CURRENT_TIMESTAMP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
