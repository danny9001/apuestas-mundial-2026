-- Drop tables if they exist
DROP TABLE IF EXISTS leaderboard CASCADE;
DROP TABLE IF EXISTS predictions CASCADE;
DROP TABLE IF EXISTS matches CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 1. Create USERS table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  tipo VARCHAR(50) DEFAULT 'externo', -- 'interno', 'externo', 'admin'
  avatar TEXT,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create MATCHES table
CREATE TABLE matches (
  id SERIAL PRIMARY KEY,
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

-- 5. FUNCTION TO RECALCULATE LEADERBOARD
CREATE OR REPLACE FUNCTION recalculate_leaderboard() 
RETURNS void AS $$
DECLARE
  r RECORD;
  prev_pos INTEGER;
  new_pos INTEGER;
  new_tendencia VARCHAR(10);
BEGIN
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
      -- Note: lower rank number means higher position (e.g. 1st vs 3rd)
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

-- 6. SEED USERS
-- Password hash for 'mundial2026' (standard bcrypt hash)
-- Hash: $2b$10$aPOUgT9FX/pYSsXZ8KaTq.1o5Y.jaFSAtzYO0MzRTvTa9QexniUqi
INSERT INTO users (nombre, email, password_hash, tipo, avatar, activo) VALUES
('Daniel Admin', 'admin@mundial.com', '$2b$10$aPOUgT9FX/pYSsXZ8KaTq.1o5Y.jaFSAtzYO0MzRTvTa9QexniUqi', 'admin', 'https://api.dicebear.com/7.x/adventurer/svg?seed=admin', true);

-- 7. SEED MATCHES (Upcoming matches covering all groups A to L so all users can participate!)
INSERT INTO matches (fecha, local, visitante, logo_local, logo_visitante, estado, goles_local, goles_visitante, fase, grupo) VALUES
(CURRENT_TIMESTAMP + INTERVAL '1 day', 'México', 'Italia', '/uploads/flags/mex.png', '/uploads/flags/ita.png', 'upcoming', 0, 0, 'Fase de Grupos', 'A'),
(CURRENT_TIMESTAMP + INTERVAL '1 day 4 hours', 'Canadá', 'Nigeria', '/uploads/flags/can.png', '/uploads/flags/nga.png', 'upcoming', 0, 0, 'Fase de Grupos', 'A'),
(CURRENT_TIMESTAMP + INTERVAL '2 days', 'Inglaterra', 'Irán', '/uploads/flags/eng.png', '/uploads/flags/irn.png', 'upcoming', 0, 0, 'Fase de Grupos', 'B'),
(CURRENT_TIMESTAMP + INTERVAL '2 days 4 hours', 'Estados Unidos', 'Gales', '/uploads/flags/usa.png', '/uploads/flags/wal.png', 'upcoming', 0, 0, 'Fase de Grupos', 'B'),
(CURRENT_TIMESTAMP + INTERVAL '3 days', 'Argentina', 'Arabia Saudita', '/uploads/flags/arg.png', '/uploads/flags/ksa.png', 'upcoming', 0, 0, 'Fase de Grupos', 'C'),
(CURRENT_TIMESTAMP + INTERVAL '3 days 4 hours', 'Polonia', 'México', '/uploads/flags/pol.png', '/uploads/flags/mex.png', 'upcoming', 0, 0, 'Fase de Grupos', 'C'),
(CURRENT_TIMESTAMP + INTERVAL '4 days', 'Francia', 'Australia', '/uploads/flags/fra.png', '/uploads/flags/aus.png', 'upcoming', 0, 0, 'Fase de Grupos', 'D'),
(CURRENT_TIMESTAMP + INTERVAL '4 days 4 hours', 'Dinamarca', 'Túnez', '/uploads/flags/den.png', '/uploads/flags/tun.png', 'upcoming', 0, 0, 'Fase de Grupos', 'D'),
(CURRENT_TIMESTAMP + INTERVAL '5 days', 'España', 'Costa Rica', '/uploads/flags/esp.png', '/uploads/flags/crc.png', 'upcoming', 0, 0, 'Fase de Grupos', 'E'),
(CURRENT_TIMESTAMP + INTERVAL '5 days 4 hours', 'Alemania', 'Japón', '/uploads/flags/ger.png', '/uploads/flags/jpn.png', 'upcoming', 0, 0, 'Fase de Grupos', 'E'),
(CURRENT_TIMESTAMP + INTERVAL '6 days', 'Bélgica', 'Canadá', '/uploads/flags/bel.png', '/uploads/flags/can.png', 'upcoming', 0, 0, 'Fase de Grupos', 'F'),
(CURRENT_TIMESTAMP + INTERVAL '6 days 4 hours', 'Marruecos', 'Croacia', '/uploads/flags/mar.png', '/uploads/flags/cro.png', 'upcoming', 0, 0, 'Fase de Grupos', 'F'),
(CURRENT_TIMESTAMP + INTERVAL '7 days', 'Brasil', 'Camerún', '/uploads/flags/bra.png', '/uploads/flags/cmr.png', 'upcoming', 0, 0, 'Fase de Grupos', 'G'),
(CURRENT_TIMESTAMP + INTERVAL '7 days 4 hours', 'Suiza', 'Serbia', '/uploads/flags/sui.png', '/uploads/flags/srb.png', 'upcoming', 0, 0, 'Fase de Grupos', 'G'),
(CURRENT_TIMESTAMP + INTERVAL '8 days', 'Portugal', 'Ghana', '/uploads/flags/por.png', '/uploads/flags/gha.png', 'upcoming', 0, 0, 'Fase de Grupos', 'H'),
(CURRENT_TIMESTAMP + INTERVAL '8 days 4 hours', 'Uruguay', 'Corea del Sur', '/uploads/flags/uru.png', '/uploads/flags/kor.png', 'upcoming', 0, 0, 'Fase de Grupos', 'H'),
(CURRENT_TIMESTAMP + INTERVAL '9 days', 'Países Bajos', 'Ecuador', '/uploads/flags/ned.png', '/uploads/flags/ecu.png', 'upcoming', 0, 0, 'Fase de Grupos', 'I'),
(CURRENT_TIMESTAMP + INTERVAL '9 days 4 hours', 'Senegal', 'Qatar', '/uploads/flags/sen.png', '/uploads/flags/qat.png', 'upcoming', 0, 0, 'Fase de Grupos', 'I'),
(CURRENT_TIMESTAMP + INTERVAL '10 days', 'Colombia', 'Japón', '/uploads/flags/col.png', '/uploads/flags/jpn.png', 'upcoming', 0, 0, 'Fase de Grupos', 'J'),
(CURRENT_TIMESTAMP + INTERVAL '10 days 4 hours', 'Senegal', 'Polonia', '/uploads/flags/sen.png', '/uploads/flags/pol.png', 'upcoming', 0, 0, 'Fase de Grupos', 'J'),
(CURRENT_TIMESTAMP + INTERVAL '11 days', 'Italia', 'Suecia', '/uploads/flags/ita.png', '/uploads/flags/swe.png', 'upcoming', 0, 0, 'Fase de Grupos', 'K'),
(CURRENT_TIMESTAMP + INTERVAL '11 days 4 hours', 'Chile', 'Nigeria', '/uploads/flags/chi.png', '/uploads/flags/nga.png', 'upcoming', 0, 0, 'Fase de Grupos', 'K'),
(CURRENT_TIMESTAMP + INTERVAL '12 days', 'Uruguay', 'Ghana', '/uploads/flags/uru.png', '/uploads/flags/gha.png', 'upcoming', 0, 0, 'Fase de Grupos', 'L'),
(CURRENT_TIMESTAMP + INTERVAL '12 days 4 hours', 'Portugal', 'Corea del Sur', '/uploads/flags/por.png', '/uploads/flags/kor.png', 'upcoming', 0, 0, 'Fase de Grupos', 'L');

-- 8. EXECUTE INITIAL LEADERBOARD CALCULATION
SELECT recalculate_leaderboard();
