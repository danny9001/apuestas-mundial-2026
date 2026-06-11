-- Drop tables if they exist
DROP TABLE IF EXISTS leaderboard CASCADE;
DROP TABLE IF EXISTS predictions CASCADE;
DROP TABLE IF EXISTS matches CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS sync_log CASCADE;

-- 1. Create USERS table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  tipo VARCHAR(50) DEFAULT 'externo', -- 'interno', 'externo', 'admin'
  avatar TEXT,
  activo BOOLEAN DEFAULT TRUE,
  aprobado BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create MATCHES table
CREATE TABLE matches (
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
  stats JSONB DEFAULT '{}',
  transmision_enlaces TEXT DEFAULT '',
  last_synced_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create PREDICTIONS table
CREATE TABLE predictions (
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
CREATE TABLE leaderboard (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  puntos_totales INTEGER DEFAULT 0,
  exactos INTEGER DEFAULT 0,
  posicion INTEGER DEFAULT 1,
  posicion_anterior INTEGER DEFAULT 1,
  tendencia VARCHAR(10) DEFAULT 'same', -- 'up', 'down', 'same'
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Create PASSKEYS table (WebAuthn / FIDO2)
CREATE TABLE passkeys (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  credential_id TEXT UNIQUE NOT NULL,
  public_key BYTEA NOT NULL,
  counter BIGINT DEFAULT 0,
  device_type VARCHAR(32) DEFAULT 'singleDevice',
  backed_up BOOLEAN DEFAULT FALSE,
  transports TEXT[],
  label VARCHAR(120),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_used_at TIMESTAMP WITH TIME ZONE
);

-- WebAuthn challenge store (shared across all app replicas, TTL 5 min)
CREATE TABLE IF NOT EXISTS webauthn_challenges (
  challenge_key  VARCHAR(300) NOT NULL,
  challenge      TEXT         NOT NULL,
  expires_at     TIMESTAMPTZ  NOT NULL DEFAULT (NOW() + INTERVAL '5 minutes'),
  PRIMARY KEY (challenge_key)
);
CREATE INDEX IF NOT EXISTS idx_wac_expires ON webauthn_challenges(expires_at);

-- 6. Create SYNC_LOG table
CREATE TABLE sync_log (
  id SERIAL PRIMARY KEY,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  matches_updated INTEGER DEFAULT 0,
  goals_detected INTEGER DEFAULT 0,
  matches_finished INTEGER DEFAULT 0,
  errors TEXT[],
  duration_ms INTEGER
);

-- 6. FUNCTION TO RECALCULATE LEADERBOARD
CREATE OR REPLACE FUNCTION recalculate_leaderboard() 
RETURNS void AS $$
DECLARE
  r RECORD;
  prev_pos INTEGER;
  new_pos INTEGER;
  new_tendencia VARCHAR(10);
BEGIN
  -- Delete users from leaderboard who are no longer active or participating
  DELETE FROM leaderboard
  WHERE user_id NOT IN (
    SELECT id FROM users 
    WHERE activo = true 
      AND participa = true
      AND (tipo != 'superadmin' OR EXISTS (SELECT 1 FROM user_companies WHERE user_id = id))
  );

  -- First update all predictions points for finished matches
  UPDATE predictions p
  SET puntos = CASE
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
  WHERE p.match_id = m.id AND m.estado = 'finished';

  -- Loop through calculated ranked scores
  FOR r IN (
    WITH user_scores AS (
      SELECT 
        u.id AS u_id,
        COALESCE(SUM(p.puntos), 0) AS total_pts,
        COALESCE(SUM(CASE WHEN p.puntos = 3 THEN 1 ELSE 0 END), 0) AS exact_cnt
      FROM users u
      LEFT JOIN predictions p ON u.id = p.user_id
      WHERE u.activo = true
        AND u.participa = true
        AND (u.tipo != 'superadmin' OR EXISTS (SELECT 1 FROM user_companies WHERE user_id = u.id))
      GROUP BY u.id
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
INSERT INTO users (nombre, email, password_hash, tipo, avatar, activo) VALUES
('Daniel Admin', 'admin@mundial.com', '$2b$10$tS4j1b8mT9FZtZ/D8Cvr3eyJwGSAZTs327bkZfwrijzN5eZDEFGEi', 'admin', 'https://api.dicebear.com/7.x/adventurer/svg?seed=admin', true);


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
(2616, '2026-06-19 21:00:00-04', 'Brasil', 'Haití', '/uploads/flags/brasil.png', '/uploads/flags/haití.png', 'upcoming', 0, 0, 'Fase de Grupos', 'C', 'Kansas City'),
(2617, '2026-06-25 18:00:00-04', 'Marruecos', 'Haití', '/uploads/flags/marruecos.png', '/uploads/flags/haití.png', 'upcoming', 0, 0, 'Fase de Grupos', 'C', 'CDMX'),
(2618, '2026-06-25 18:00:00-04', 'Escocia', 'Brasil', '/uploads/flags/escocia.png', '/uploads/flags/brasil.png', 'upcoming', 0, 0, 'Fase de Grupos', 'C', 'Boston'),
(2619, '2026-06-12 21:00:00-04', 'Estados Unidos', 'Paraguay', '/uploads/flags/estados_unidos.png', '/uploads/flags/paraguay.png', 'upcoming', 0, 0, 'Fase de Grupos', 'D', 'Los Ángeles'),
(2620, '2026-06-14 00:00:00-04', 'Australia', 'Turquía', '/uploads/flags/australia.png', '/uploads/flags/turquía.png', 'upcoming', 0, 0, 'Fase de Grupos', 'D', 'Vancouver'),
(2621, '2026-06-19 15:00:00-04', 'Estados Unidos', 'Australia', '/uploads/flags/estados_unidos.png', '/uploads/flags/australia.png', 'upcoming', 0, 0, 'Fase de Grupos', 'D', 'Seattle'),
(2622, '2026-06-19 21:00:00-04', 'Turquía', 'Paraguay', '/uploads/flags/turquía.png', '/uploads/flags/paraguay.png', 'upcoming', 0, 0, 'Fase de Grupos', 'D', 'Filadelfia'),
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
