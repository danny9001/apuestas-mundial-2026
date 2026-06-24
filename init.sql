-- 1. Create USERS table
-- init.sql is 100% idempotent. For destructive reset use reset.sql (non-production only).
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  tipo VARCHAR(50) DEFAULT 'externo', -- 'interno', 'externo', 'admin', 'superadmin'
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

-- 2. Create MATCHES table
CREATE TABLE IF NOT EXISTS matches (
  id SERIAL PRIMARY KEY,
  external_id INTEGER UNIQUE,
  fecha TIMESTAMP WITH TIME ZONE NOT NULL,
  local VARCHAR(255) NOT NULL,
  visitante VARCHAR(255) NOT NULL,
  logo_local TEXT,
  logo_visitante TEXT,
  estado VARCHAR(50) DEFAULT 'upcoming', -- 'upcoming', 'live', 'finished'
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

-- 3. Create PREDICTIONS table
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

-- 4. Create LEADERBOARD table
CREATE TABLE IF NOT EXISTS leaderboard (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  puntos_totales INTEGER DEFAULT 0,
  exactos INTEGER DEFAULT 0,
  posicion INTEGER DEFAULT 1,
  posicion_anterior INTEGER DEFAULT 1,
  tendencia VARCHAR(10) DEFAULT 'same', -- 'up', 'down', 'same'
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Create SYNC_LOG table
CREATE TABLE IF NOT EXISTS sync_log (
  id SERIAL PRIMARY KEY,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  matches_updated INTEGER DEFAULT 0,
  goals_detected INTEGER DEFAULT 0,
  matches_finished INTEGER DEFAULT 0,
  errors TEXT[],
  duration_ms INTEGER
);

-- 5b. Create COMPANIES table
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

-- 5c. Create USER_COMPANIES junction table
CREATE TABLE IF NOT EXISTS user_companies (
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, company_id)
);

-- 5d. Create SYSTEM_LOGS table
CREATE TABLE IF NOT EXISTS system_logs (
  id SERIAL PRIMARY KEY,
  nivel VARCHAR(20) DEFAULT 'info' NOT NULL,
  categoria VARCHAR(50) NOT NULL,
  mensaje TEXT NOT NULL,
  detalles TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5e. Create SCORE_CHANGE_LOG table
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

-- 5f. Create PENDING_DOWNGRADES table
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

-- 5g. Create USER_PRESENCE table
CREATE TABLE IF NOT EXISTS user_presence (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_user_presence_seen ON user_presence (last_seen_at DESC);

-- 5h. Create MATCH_NOTIF_LOG table
CREATE TABLE IF NOT EXISTS match_notif_log (
  match_id INTEGER NOT NULL,
  event VARCHAR(30) NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (match_id, event)
);

-- 5i. Create MAIL_QUEUE table
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

-- 5j. Create AUDIT_LOGS table
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(255) NOT NULL,
  details TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5k. Create RATE_LIMITS table
CREATE TABLE IF NOT EXISTS rate_limits (
  key VARCHAR(255) PRIMARY KEY,
  points INTEGER DEFAULT 0,
  expire_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- 5l. Create NOTIFICATIONS table
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

-- 5m. Create NOTIFICATION_READS table
CREATE TABLE IF NOT EXISTS notification_reads (
  notification_id INTEGER REFERENCES notifications(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (notification_id, user_id)
);

-- 5n. Create USER_PAYMENTS table
CREATE TABLE IF NOT EXISTS user_payments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  monto NUMERIC NOT NULL DEFAULT 0,
  fecha TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  comprobante_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5o. Create PUSH_SUBSCRIPTIONS table
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

-- 5p. Create SETTINGS table
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

-- 5q. Create GROUPS table
CREATE TABLE IF NOT EXISTS groups (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  color VARCHAR(20) DEFAULT '#10b981',
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5r. Create USER_GROUPS junction table
CREATE TABLE IF NOT EXISTS user_groups (
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, group_id)
);

-- 5s. Create SCHEDULED_NOTIFY_LOG table
CREATE TABLE IF NOT EXISTS scheduled_notify_log (
  id SERIAL PRIMARY KEY,
  tipo VARCHAR(50) NOT NULL,
  referencia_id INTEGER,
  enviado_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5t. Create PASSKEYS table
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

-- 5u. Create INVITATIONS table
CREATE TABLE IF NOT EXISTS invitations (
  id SERIAL PRIMARY KEY,
  token VARCHAR(255) UNIQUE NOT NULL,
  company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
  created_by INTEGER REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  email_usado VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. FUNCTION TO RECALCULATE LEADERBOARD
CREATE OR REPLACE FUNCTION recalculate_leaderboard() 
RETURNS void AS $$
DECLARE
  r RECORD;
  prev_pos INTEGER;
  new_pos INTEGER;
  new_tendencia VARCHAR(10);
  final_winner VARCHAR(100) := NULL;
BEGIN
  -- Get the winner of the final match (ID 104)
  SELECT CASE 
    WHEN goles_local > goles_visitante THEN local
    WHEN goles_local < goles_visitante THEN visitante
    ELSE COALESCE(stats->>'ganador', stats->>'winner', '')
  END INTO final_winner
  FROM matches
  WHERE id = 104 AND estado = 'finished';

  -- Delete users from leaderboard who are no longer active or participating
  DELETE FROM leaderboard
  WHERE user_id NOT IN (
    SELECT id FROM users 
    WHERE activo = true 
      AND aprobado = true
      AND (tipo != 'superadmin' OR EXISTS (SELECT 1 FROM user_companies WHERE user_id = id))
  );

  -- First update all predictions points for matches (finished, live, or upcoming)
  UPDATE predictions p
  SET puntos = CASE
    -- If upcoming, reset to 0
    WHEN m.estado = 'upcoming' THEN 0
    -- Exact match (3 points)
    WHEN p.pred_local = m.goles_local AND p.pred_visitante = m.goles_visitante THEN 3
    -- Correct winner/draw (1 point)
    WHEN (p.pred_local > p.pred_visitante AND m.goles_local > m.goles_visitante) OR
         (p.pred_local < p.pred_visitante AND m.goles_local < m.goles_visitante) OR
         (p.pred_local = p.pred_visitante AND m.goles_local = m.goles_visitante) THEN 1
    -- Fail (0 points)
    ELSE 0
  END
  FROM matches m
  WHERE p.match_id = m.id;

  -- Loop through calculated ranked scores
  FOR r IN (
    WITH user_scores AS (
      SELECT 
        u.id AS u_id,
        COALESCE(SUM(p.puntos), 0) + (CASE WHEN final_winner IS NOT NULL AND final_winner <> '' AND u.tincaso = final_winner THEN 5 ELSE 0 END) AS total_pts,
        COALESCE(SUM(CASE WHEN p.puntos = 3 THEN 1 ELSE 0 END), 0) AS exact_cnt
      FROM users u
      LEFT JOIN predictions p ON u.id = p.user_id
      WHERE u.activo = true
        AND u.aprobado = true
        AND (u.tipo != 'superadmin' OR EXISTS (SELECT 1 FROM user_companies WHERE user_id = u.id))
      GROUP BY u.id, u.tincaso
    ),
    ranked AS (
      SELECT 
        u_id,
        total_pts,
        exact_cnt,
        ROW_NUMBER() OVER (ORDER BY total_pts DESC, exact_cnt DESC, u_id ASC) as rk
      FROM user_scores
    )
    SELECT * FROM ranked
  ) LOOP
    -- Get previous rank for this user
    SELECT posicion INTO prev_pos FROM leaderboard WHERE user_id = r.u_id;
    
    IF prev_pos IS NULL THEN
      -- If they didn't exist in leaderboard yet
      prev_pos := r.rk;
      new_tendencia := 'same';
    ELSE
      -- Compare new rank (r.rk) with previous rank (prev_pos)
      IF r.rk < prev_pos THEN
        new_tendencia := 'up';
      ELSIF r.rk > prev_pos THEN
        new_tendencia := 'down';
      ELSE
        new_tendencia := 'same';
      END IF;
    END IF;

    -- Upsert the leaderboard row
    INSERT INTO leaderboard (user_id, puntos_totales, exactos, posicion, posicion_anterior, tendencia, updated_at)
    VALUES (r.u_id, r.total_pts, r.exact_cnt, r.rk, prev_pos, new_tendencia, CURRENT_TIMESTAMP)
    ON CONFLICT (user_id) DO UPDATE SET
      puntos_totales = EXCLUDED.puntos_totales,
      exactos = EXCLUDED.exactos,
      posicion_anterior = EXCLUDED.posicion_anterior,
      posicion = EXCLUDED.posicion,
      tendencia = EXCLUDED.tendencia,
      updated_at = CURRENT_TIMESTAMP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 7. SEED USERS
-- Admin user is seeded via: node scripts/seed-admin.js
-- Requires env vars: ADMIN_EMAIL, ADMIN_PASSWORD


-- 8. SEED ALL 104 MATCHES (48 Group Stage + 56 Knockout Stage)
INSERT INTO matches (external_id, fecha, local, visitante, logo_local, logo_visitante, estado, goles_local, goles_visitante, fase, grupo, estadio) VALUES
(2601, '2026-06-11 15:00:00-04', 'México', 'Sudáfrica', '/uploads/flags/méxico.png', '/uploads/flags/sudáfrica.png', 'upcoming', 0, 0, 'Fase de Grupos', 'A', 'Estadio Azteca, CDMX'),
(2602, '2026-06-11 22:00:00-04', 'Corea del Sur', 'República Checa', '/uploads/flags/corea_del_sur.png', '/uploads/flags/república_checa.png', 'upcoming', 0, 0, 'Fase de Grupos', 'A', 'Guadalajara'),
(2603, '2026-06-18 12:00:00-04', 'República Checa', 'Sudáfrica', '/uploads/flags/república_checa.png', '/uploads/flags/sudáfrica.png', 'upcoming', 0, 0, 'Fase de Grupos', 'A', 'Atlanta'),
(2604, '2026-06-18 22:00:00-04', 'México', 'Corea del Sur', '/uploads/flags/méxico.png', '/uploads/flags/corea_del_sur.png', 'upcoming', 0, 0, 'Fase de Grupos', 'A', 'Guadalajara'),
(2605, '2026-06-24 22:00:00-04', 'República Checa', 'México', '/uploads/flags/república_checa.png', '/uploads/flags/méxico.png', 'upcoming', 0, 0, 'Fase de Grupos', 'A', 'Estadio Azteca, CDMX'),
(2606, '2026-06-24 22:00:00-04', 'Sudáfrica', 'Corea del Sur', '/uploads/flags/sudáfrica.png', '/uploads/flags/corea_del_sur.png', 'upcoming', 0, 0, 'Fase de Grupos', 'A', 'Monterrey'),
(2607, '2026-06-12 15:00:00-04', 'Canadá', 'Bosnia y Herzegovina', '/uploads/flags/canadá.png', '/uploads/flags/bosnia_y_herzegovina.png', 'upcoming', 0, 0, 'Fase de Grupos', 'B', 'Toronto'),
(2608, '2026-06-13 15:00:00-04', 'Qatar', 'Suiza', '/uploads/flags/qatar.png', '/uploads/flags/suiza.png', 'upcoming', 0, 0, 'Fase de Grupos', 'B', 'San Francisco'),
(2609, '2026-06-18 15:00:00-04', 'Suiza', 'Bosnia y Herzegovina', '/uploads/flags/suiza.png', '/uploads/flags/bosnia_y_herzegovina.png', 'upcoming', 0, 0, 'Fase de Grupos', 'B', 'Los Ángeles'),
(2610, '2026-06-18 18:00:00-04', 'Canadá', 'Qatar', '/uploads/flags/canadá.png', '/uploads/flags/qatar.png', 'upcoming', 0, 0, 'Fase de Grupos', 'B', 'Vancouver'),
(2611, '2026-06-24 15:00:00-04', 'Suiza', 'Canadá', '/uploads/flags/suiza.png', '/uploads/flags/canadá.png', 'upcoming', 0, 0, 'Fase de Grupos', 'B', 'Vancouver'),
(2612, '2026-06-24 15:00:00-04', 'Bosnia y Herzegovina', 'Qatar', '/uploads/flags/bosnia_y_herzegovina.png', '/uploads/flags/qatar.png', 'upcoming', 0, 0, 'Fase de Grupos', 'B', 'Seattle'),
(2613, '2026-06-13 18:00:00-04', 'Brasil', 'Marruecos', '/uploads/flags/brasil.png', '/uploads/flags/marruecos.png', 'upcoming', 0, 0, 'Fase de Grupos', 'C', 'Nueva York/NJ'),
(2614, '2026-06-13 21:00:00-04', 'Haití', 'Escocia', '/uploads/flags/haití.png', '/uploads/flags/escocia.png', 'upcoming', 0, 0, 'Fase de Grupos', 'C', 'Boston'),
(2615, '2026-06-19 18:00:00-04', 'Escocia', 'Marruecos', '/uploads/flags/escocia.png', '/uploads/flags/marruecos.png', 'upcoming', 0, 0, 'Fase de Grupos', 'C', 'Houston'),
(2616, '2026-06-19 20:30:00-04', 'Brasil', 'Haití', '/uploads/flags/brasil.png', '/uploads/flags/haití.png', 'upcoming', 0, 0, 'Fase de Grupos', 'C', 'Kansas City'),
(2617, '2026-06-25 18:00:00-04', 'Marruecos', 'Haití', '/uploads/flags/marruecos.png', '/uploads/flags/haití.png', 'upcoming', 0, 0, 'Fase de Grupos', 'C', 'CDMX'),
(2618, '2026-06-25 18:00:00-04', 'Escocia', 'Brasil', '/uploads/flags/escocia.png', '/uploads/flags/brasil.png', 'upcoming', 0, 0, 'Fase de Grupos', 'C', 'Boston'),
(2619, '2026-06-12 21:00:00-04', 'Estados Unidos', 'Paraguay', '/uploads/flags/estados_unidos.png', '/uploads/flags/paraguay.png', 'upcoming', 0, 0, 'Fase de Grupos', 'D', 'Los Ángeles'),
(2620, '2026-06-14 00:00:00-04', 'Australia', 'Turquía', '/uploads/flags/australia.png', '/uploads/flags/turquía.png', 'upcoming', 0, 0, 'Fase de Grupos', 'D', 'Vancouver'),
(2621, '2026-06-19 15:00:00-04', 'Estados Unidos', 'Australia', '/uploads/flags/estados_unidos.png', '/uploads/flags/australia.png', 'upcoming', 0, 0, 'Fase de Grupos', 'D', 'Seattle'),
(2622, '2026-06-19 23:00:00-04', 'Turquía', 'Paraguay', '/uploads/flags/turquía.png', '/uploads/flags/paraguay.png', 'upcoming', 0, 0, 'Fase de Grupos', 'D', 'Filadelfia'),
(2623, '2026-06-25 22:00:00-04', 'Turquía', 'Estados Unidos', '/uploads/flags/turquía.png', '/uploads/flags/estados_unidos.png', 'upcoming', 0, 0, 'Fase de Grupos', 'D', 'Los Ángeles'),
(2624, '2026-06-25 22:00:00-04', 'Paraguay', 'Australia', '/uploads/flags/paraguay.png', '/uploads/flags/australia.png', 'upcoming', 0, 0, 'Fase de Grupos', 'D', 'Vancouver'),
(2625, '2026-06-14 13:00:00-04', 'Alemania', 'Curazao', '/uploads/flags/alemania.png', '/uploads/flags/curazao.png', 'upcoming', 0, 0, 'Fase de Grupos', 'E', 'Houston'),
(2626, '2026-06-14 19:00:00-04', 'Costa de Marfil', 'Ecuador', '/uploads/flags/costa_de_marfil.png', '/uploads/flags/ecuador.png', 'upcoming', 0, 0, 'Fase de Grupos', 'E', 'Filadelfia'),
(2627, '2026-06-20 13:00:00-04', 'Ecuador', 'Curazao', '/uploads/flags/ecuador.png', '/uploads/flags/curazao.png', 'upcoming', 0, 0, 'Fase de Grupos', 'E', 'Seattle'),
(2628, '2026-06-20 19:00:00-04', 'Alemania', 'Costa de Marfil', '/uploads/flags/alemania.png', '/uploads/flags/costa_de_marfil.png', 'upcoming', 0, 0, 'Fase de Grupos', 'E', 'Atlanta'),
(2629, '2026-06-26 16:00:00-04', 'Curazao', 'Costa de Marfil', '/uploads/flags/curazao.png', '/uploads/flags/costa_de_marfil.png', 'upcoming', 0, 0, 'Fase de Grupos', 'E', 'Houston'),
(2630, '2026-06-26 16:00:00-04', 'Ecuador', 'Alemania', '/uploads/flags/ecuador.png', '/uploads/flags/alemania.png', 'upcoming', 0, 0, 'Fase de Grupos', 'E', 'Filadelfia'),
(2631, '2026-06-14 16:00:00-04', 'Países Bajos', 'Japón', '/uploads/flags/países_bajos.png', '/uploads/flags/japón.png', 'upcoming', 0, 0, 'Fase de Grupos', 'F', 'Dallas'),
(2632, '2026-06-14 22:00:00-04', 'Suecia', 'Túnez', '/uploads/flags/suecia.png', '/uploads/flags/túnez.png', 'upcoming', 0, 0, 'Fase de Grupos', 'F', 'Monterrey'),
(2633, '2026-06-20 16:00:00-04', 'Japón', 'Túnez', '/uploads/flags/japón.png', '/uploads/flags/túnez.png', 'upcoming', 0, 0, 'Fase de Grupos', 'F', 'Dallas'),
(2634, '2026-06-20 22:00:00-04', 'Países Bajos', 'Suecia', '/uploads/flags/países_bajos.png', '/uploads/flags/suecia.png', 'upcoming', 0, 0, 'Fase de Grupos', 'F', 'Monterrey'),
(2635, '2026-06-26 19:00:00-04', 'Túnez', 'Países Bajos', '/uploads/flags/túnez.png', '/uploads/flags/países_bajos.png', 'upcoming', 0, 0, 'Fase de Grupos', 'F', 'CDMX'),
(2636, '2026-06-26 19:00:00-04', 'Japón', 'Suecia', '/uploads/flags/japón.png', '/uploads/flags/suecia.png', 'upcoming', 0, 0, 'Fase de Grupos', 'F', 'Dallas'),
(2637, '2026-06-15 15:00:00-04', 'Bélgica', 'Egipto', '/uploads/flags/bélgica.png', '/uploads/flags/egipto.png', 'upcoming', 0, 0, 'Fase de Grupos', 'G', 'Seattle'),
(2638, '2026-06-15 21:00:00-04', 'Irán', 'Nueva Zelanda', '/uploads/flags/irán.png', '/uploads/flags/nueva_zelanda.png', 'upcoming', 0, 0, 'Fase de Grupos', 'G', 'Los Ángeles'),
(2639, '2026-06-21 15:00:00-04', 'Nueva Zelanda', 'Egipto', '/uploads/flags/nueva_zelanda.png', '/uploads/flags/egipto.png', 'upcoming', 0, 0, 'Fase de Grupos', 'G', 'San Francisco'),
(2640, '2026-06-21 21:00:00-04', 'Bélgica', 'Irán', '/uploads/flags/bélgica.png', '/uploads/flags/irán.png', 'upcoming', 0, 0, 'Fase de Grupos', 'G', 'Los Ángeles'),
(2641, '2026-06-27 16:00:00-04', 'Egipto', 'Irán', '/uploads/flags/egipto.png', '/uploads/flags/irán.png', 'upcoming', 0, 0, 'Fase de Grupos', 'G', 'Seattle'),
(2642, '2026-06-27 16:00:00-04', 'Nueva Zelanda', 'Bélgica', '/uploads/flags/nueva_zelanda.png', '/uploads/flags/bélgica.png', 'upcoming', 0, 0, 'Fase de Grupos', 'G', 'San Francisco'),
(2643, '2026-06-15 12:00:00-04', 'España', 'Cabo Verde', '/uploads/flags/españa.png', '/uploads/flags/cabo_verde.png', 'upcoming', 0, 0, 'Fase de Grupos', 'H', 'Atlanta'),
(2644, '2026-06-15 18:00:00-04', 'Arabia Saudita', 'Uruguay', '/uploads/flags/arabia_saudita.png', '/uploads/flags/uruguay.png', 'upcoming', 0, 0, 'Fase de Grupos', 'H', 'Miami'),
(2645, '2026-06-21 12:00:00-04', 'Uruguay', 'Cabo Verde', '/uploads/flags/uruguay.png', '/uploads/flags/cabo_verde.png', 'upcoming', 0, 0, 'Fase de Grupos', 'H', 'Miami'),
(2646, '2026-06-21 18:00:00-04', 'España', 'Arabia Saudita', '/uploads/flags/españa.png', '/uploads/flags/arabia_saudita.png', 'upcoming', 0, 0, 'Fase de Grupos', 'H', 'Atlanta'),
(2647, '2026-06-27 19:00:00-04', 'Cabo Verde', 'Arabia Saudita', '/uploads/flags/cabo_verde.png', '/uploads/flags/arabia_saudita.png', 'upcoming', 0, 0, 'Fase de Grupos', 'H', 'Dallas'),
(2648, '2026-06-27 19:00:00-04', 'Uruguay', 'España', '/uploads/flags/uruguay.png', '/uploads/flags/españa.png', 'upcoming', 0, 0, 'Fase de Grupos', 'H', 'Miami'),
(2649, '2026-06-16 15:00:00-04', 'Francia', 'Senegal', '/uploads/flags/francia.png', '/uploads/flags/senegal.png', 'upcoming', 0, 0, 'Fase de Grupos', 'I', 'Nueva York/NJ'),
(2650, '2026-06-16 18:00:00-04', 'Irak', 'Noruega', '/uploads/flags/irak.png', '/uploads/flags/noruega.png', 'upcoming', 0, 0, 'Fase de Grupos', 'I', 'Boston'),
(2651, '2026-06-22 15:00:00-04', 'Noruega', 'Senegal', '/uploads/flags/noruega.png', '/uploads/flags/senegal.png', 'upcoming', 0, 0, 'Fase de Grupos', 'I', 'Toronto'),
(2652, '2026-06-22 18:00:00-04', 'Francia', 'Irak', '/uploads/flags/francia.png', '/uploads/flags/irak.png', 'upcoming', 0, 0, 'Fase de Grupos', 'I', 'Nueva York/NJ'),
(2653, '2026-06-28 16:00:00-04', 'Senegal', 'Irak', '/uploads/flags/senegal.png', '/uploads/flags/irak.png', 'upcoming', 0, 0, 'Fase de Grupos', 'I', 'Boston'),
(2654, '2026-06-28 16:00:00-04', 'Noruega', 'Francia', '/uploads/flags/noruega.png', '/uploads/flags/francia.png', 'upcoming', 0, 0, 'Fase de Grupos', 'I', 'Toronto'),
(2655, '2026-06-16 21:00:00-04', 'Argentina', 'Argelia', '/uploads/flags/argentina.png', '/uploads/flags/argelia.png', 'upcoming', 0, 0, 'Fase de Grupos', 'J', 'Kansas City'),
(2656, '2026-06-17 00:00:00-04', 'Austria', 'Jordania', '/uploads/flags/austria.png', '/uploads/flags/jordania.png', 'upcoming', 0, 0, 'Fase de Grupos', 'J', 'San Francisco'),
(2657, '2026-06-22 14:00:00-04', 'Argentina', 'Austria', '/uploads/flags/argentina.png', '/uploads/flags/austria.png', 'upcoming', 0, 0, 'Fase de Grupos', 'J', 'Dallas'),
(2658, '2026-06-22 21:00:00-04', 'Jordania', 'Argelia', '/uploads/flags/jordania.png', '/uploads/flags/argelia.png', 'upcoming', 0, 0, 'Fase de Grupos', 'J', 'Kansas City'),
(2659, '2026-06-28 19:00:00-04', 'Argelia', 'Austria', '/uploads/flags/argelia.png', '/uploads/flags/austria.png', 'upcoming', 0, 0, 'Fase de Grupos', 'J', 'San Francisco'),
(2660, '2026-06-28 19:00:00-04', 'Jordania', 'Argentina', '/uploads/flags/jordania.png', '/uploads/flags/argentina.png', 'upcoming', 0, 0, 'Fase de Grupos', 'J', 'Dallas'),
(2661, '2026-06-17 13:00:00-04', 'Portugal', 'RD Congo', '/uploads/flags/portugal.png', '/uploads/flags/rd_congo.png', 'upcoming', 0, 0, 'Fase de Grupos', 'K', 'Houston'),
(2662, '2026-06-17 22:00:00-04', 'Uzbekistán', 'Colombia', '/uploads/flags/uzbekistán.png', '/uploads/flags/colombia.png', 'upcoming', 0, 0, 'Fase de Grupos', 'K', 'CDMX'),
(2663, '2026-06-23 13:00:00-04', 'Colombia', 'RD Congo', '/uploads/flags/colombia.png', '/uploads/flags/rd_congo.png', 'upcoming', 0, 0, 'Fase de Grupos', 'K', 'Guadalajara'),
(2664, '2026-06-23 22:00:00-04', 'Portugal', 'Uzbekistán', '/uploads/flags/portugal.png', '/uploads/flags/uzbekistán.png', 'upcoming', 0, 0, 'Fase de Grupos', 'K', 'Houston'),
(2665, '2026-06-27 22:00:00-04', 'RD Congo', 'Uzbekistán', '/uploads/flags/rd_congo.png', '/uploads/flags/uzbekistán.png', 'upcoming', 0, 0, 'Fase de Grupos', 'K', 'Atlanta'),
(2666, '2026-06-27 22:00:00-04', 'Colombia', 'Portugal', '/uploads/flags/colombia.png', '/uploads/flags/portugal.png', 'upcoming', 0, 0, 'Fase de Grupos', 'K', 'Guadalajara'),
(2667, '2026-06-17 16:00:00-04', 'Inglaterra', 'Croacia', '/uploads/flags/inglaterra.png', '/uploads/flags/croacia.png', 'upcoming', 0, 0, 'Fase de Grupos', 'L', 'Dallas'),
(2668, '2026-06-17 19:00:00-04', 'Ghana', 'Panamá', '/uploads/flags/ghana.png', '/uploads/flags/panamá.png', 'upcoming', 0, 0, 'Fase de Grupos', 'L', 'Toronto'),
(2669, '2026-06-23 16:00:00-04', 'Croacia', 'Panamá', '/uploads/flags/croacia.png', '/uploads/flags/panamá.png', 'upcoming', 0, 0, 'Fase de Grupos', 'L', 'Boston'),
(2670, '2026-06-23 19:00:00-04', 'Inglaterra', 'Ghana', '/uploads/flags/inglaterra.png', '/uploads/flags/ghana.png', 'upcoming', 0, 0, 'Fase de Grupos', 'L', 'Filadelfia'),
(2671, '2026-06-28 22:00:00-04', 'Panamá', 'Inglaterra', '/uploads/flags/panamá.png', '/uploads/flags/inglaterra.png', 'upcoming', 0, 0, 'Fase de Grupos', 'L', 'Toronto'),
(2672, '2026-06-28 22:00:00-04', 'Croacia', 'Ghana', '/uploads/flags/croacia.png', '/uploads/flags/ghana.png', 'upcoming', 0, 0, 'Fase de Grupos', 'L', 'Filadelfia'),
(2700, '2026-06-29 12:00:00-04', '1A', '3C/D/E', NULL, NULL, 'upcoming', 0, 0, 'Ronda de 32', NULL, 'Dallas'),
(2701, '2026-06-29 15:00:00-04', '1B', '3A/C/D', NULL, NULL, 'upcoming', 0, 0, 'Ronda de 32', NULL, 'Atlanta'),
(2702, '2026-06-29 18:00:00-04', '1C', '3B/F/G', NULL, NULL, 'upcoming', 0, 0, 'Ronda de 32', NULL, 'Nueva York/NJ'),
(2703, '2026-06-29 21:00:00-04', '1D', '3A/B/H', NULL, NULL, 'upcoming', 0, 0, 'Ronda de 32', NULL, 'Los Ángeles'),
(2704, '2026-06-29 12:00:00-04', '1E', '3D/F/I', NULL, NULL, 'upcoming', 0, 0, 'Ronda de 32', NULL, 'Houston'),
(2705, '2026-06-29 15:00:00-04', '1F', '3E/G/J', NULL, NULL, 'upcoming', 0, 0, 'Ronda de 32', NULL, 'Miami'),
(2706, '2026-06-29 18:00:00-04', '1G', '3F/H/K', NULL, NULL, 'upcoming', 0, 0, 'Ronda de 32', NULL, 'Seattle'),
(2707, '2026-06-29 21:00:00-04', '1H', '3G/I/L', NULL, NULL, 'upcoming', 0, 0, 'Ronda de 32', NULL, 'Boston'),
(2708, '2026-06-29 12:00:00-04', '2A', '2B', NULL, NULL, 'upcoming', 0, 0, 'Ronda de 32', NULL, 'San Francisco'),
(2709, '2026-06-29 15:00:00-04', '2C', '2D', NULL, NULL, 'upcoming', 0, 0, 'Ronda de 32', NULL, 'Guadalajara'),
(2710, '2026-06-29 18:00:00-04', '2E', '2F', NULL, NULL, 'upcoming', 0, 0, 'Ronda de 32', NULL, 'Monterrey'),
(2711, '2026-06-29 21:00:00-04', '2G', '2H', NULL, NULL, 'upcoming', 0, 0, 'Ronda de 32', NULL, 'Vancouver'),
(2712, '2026-06-29 12:00:00-04', '2I', '2J', NULL, NULL, 'upcoming', 0, 0, 'Ronda de 32', NULL, 'Toronto'),
(2713, '2026-06-29 15:00:00-04', '2K', '2L', NULL, NULL, 'upcoming', 0, 0, 'Ronda de 32', NULL, 'Filadelfia'),
(2714, '2026-06-29 18:00:00-04', '1I', '3J/K/L', NULL, NULL, 'upcoming', 0, 0, 'Ronda de 32', NULL, 'Kansas City'),
(2715, '2026-06-29 21:00:00-04', '1J', '2K', NULL, NULL, 'upcoming', 0, 0, 'Ronda de 32', NULL, 'CDMX'),
(2716, '2026-07-03 14:00:00-04', 'Ganador R32-1', 'Ganador R32-2', NULL, NULL, 'upcoming', 0, 0, 'Octavos de Final', NULL, 'Miami'),
(2717, '2026-07-03 18:00:00-04', 'Ganador R32-3', 'Ganador R32-4', NULL, NULL, 'upcoming', 0, 0, 'Octavos de Final', NULL, 'Dallas'),
(2718, '2026-07-03 14:00:00-04', 'Ganador R32-5', 'Ganador R32-6', NULL, NULL, 'upcoming', 0, 0, 'Octavos de Final', NULL, 'Atlanta'),
(2719, '2026-07-03 18:00:00-04', 'Ganador R32-7', 'Ganador R32-8', NULL, NULL, 'upcoming', 0, 0, 'Octavos de Final', NULL, 'Los Ángeles'),
(2720, '2026-07-03 14:00:00-04', 'Ganador R32-9', 'Ganador R32-10', NULL, NULL, 'upcoming', 0, 0, 'Octavos de Final', NULL, 'Nueva York/NJ'),
(2721, '2026-07-03 18:00:00-04', 'Ganador R32-11', 'Ganador R32-12', NULL, NULL, 'upcoming', 0, 0, 'Octavos de Final', NULL, 'Boston'),
(2722, '2026-07-03 14:00:00-04', 'Ganador R32-13', 'Ganador R32-14', NULL, NULL, 'upcoming', 0, 0, 'Octavos de Final', NULL, 'San Francisco'),
(2723, '2026-07-03 18:00:00-04', 'Ganador R32-15', 'Ganador R32-16', NULL, NULL, 'upcoming', 0, 0, 'Octavos de Final', NULL, 'Seattle'),
(2724, '2026-07-09 15:00:00-04', 'Ganador Octavos-1', 'Ganador Octavos-2', NULL, NULL, 'upcoming', 0, 0, 'Cuartos de Final', NULL, 'Los Ángeles'),
(2725, '2026-07-09 20:00:00-04', 'Ganador Octavos-3', 'Ganador Octavos-4', NULL, NULL, 'upcoming', 0, 0, 'Cuartos de Final', NULL, 'Kansas City'),
(2726, '2026-07-09 15:00:00-04', 'Ganador Octavos-5', 'Ganador Octavos-6', NULL, NULL, 'upcoming', 0, 0, 'Cuartos de Final', NULL, 'Miami'),
(2727, '2026-07-09 20:00:00-04', 'Ganador Octavos-7', 'Ganador Octavos-8', NULL, NULL, 'upcoming', 0, 0, 'Cuartos de Final', NULL, 'Boston'),
(2728, '2026-07-14 20:00:00-04', 'Ganador Cuartos-1', 'Ganador Cuartos-2', NULL, NULL, 'upcoming', 0, 0, 'Semifinal', NULL, 'Dallas'),
(2729, '2026-07-15 20:00:00-04', 'Ganador Cuartos-3', 'Ganador Cuartos-4', NULL, NULL, 'upcoming', 0, 0, 'Semifinal', NULL, 'Atlanta'),
(2730, '2026-07-18 16:00:00-04', 'Perdedor Semifinal-1', 'Perdedor Semifinal-2', NULL, NULL, 'upcoming', 0, 0, 'Tercer Puesto', NULL, 'Kansas City'),
(2731, '2026-07-19 16:00:00-04', 'Ganador Semifinal-1', 'Ganador Semifinal-2', NULL, NULL, 'upcoming', 0, 0, 'Final', NULL, 'MetLife Stadium, Nueva York/NJ');

-- 9. EXECUTE INITIAL LEADERBOARD CALCULATION
SELECT recalculate_leaderboard();
