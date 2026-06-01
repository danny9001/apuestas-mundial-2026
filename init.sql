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
-- Hash: $2a$10$UoWp7664Q0Wd9mF5Q.hA/.oUa4rM7hP7.hQ7FhZ0WJ9vXy7vJ5V8G
INSERT INTO users (nombre, email, password_hash, tipo, avatar, activo) VALUES
('Daniel Admin', 'admin@mundial.com', '$2a$10$UoWp7664Q0Wd9mF5Q.hA/.oUa4rM7hP7.hQ7FhZ0WJ9vXy7vJ5V8G', 'admin', 'https://api.dicebear.com/7.x/adventurer/svg?seed=admin', true),
('Diego Messi', 'diego@mundial.com', '$2a$10$UoWp7664Q0Wd9mF5Q.hA/.oUa4rM7hP7.hQ7FhZ0WJ9vXy7vJ5V8G', 'interno', 'https://api.dicebear.com/7.x/adventurer/svg?seed=diego', true),
('Juan Neymar', 'juan@mundial.com', '$2a$10$UoWp7664Q0Wd9mF5Q.hA/.oUa4rM7hP7.hQ7FhZ0WJ9vXy7vJ5V8G', 'interno', 'https://api.dicebear.com/7.x/adventurer/svg?seed=juan', true),
('María Mbappé', 'maria@mundial.com', '$2a$10$UoWp7664Q0Wd9mF5Q.hA/.oUa4rM7hP7.hQ7FhZ0WJ9vXy7vJ5V8G', 'externo', 'https://api.dicebear.com/7.x/adventurer/svg?seed=maria', true),
('Pedro Haaland', 'pedro@mundial.com', '$2a$10$UoWp7664Q0Wd9mF5Q.hA/.oUa4rM7hP7.hQ7FhZ0WJ9vXy7vJ5V8G', 'externo', 'https://api.dicebear.com/7.x/adventurer/svg?seed=pedro', true);

-- 7. SEED MATCHES
INSERT INTO matches (fecha, local, visitante, logo_local, logo_visitante, estado, goles_local, goles_visitante, fase, grupo) VALUES
(CURRENT_TIMESTAMP - INTERVAL '2 days', 'Argentina', 'Arabia Saudita', '/uploads/flags/arg.png', '/uploads/flags/ksa.png', 'finished', 1, 2, 'Fase de Grupos', 'C'),
(CURRENT_TIMESTAMP - INTERVAL '1 day', 'Francia', 'Australia', '/uploads/flags/fra.png', '/uploads/flags/aus.png', 'finished', 4, 1, 'Fase de Grupos', 'D'),
(CURRENT_TIMESTAMP - INTERVAL '12 hours', 'España', 'Costa Rica', '/uploads/flags/esp.png', '/uploads/flags/crc.png', 'finished', 7, 0, 'Fase de Grupos', 'E'),
(CURRENT_TIMESTAMP - INTERVAL '5 minutes', 'Estados Unidos', 'México', '/uploads/flags/usa.png', '/uploads/flags/mex.png', 'live', 1, 1, 'Fase de Grupos', 'B'),
(CURRENT_TIMESTAMP + INTERVAL '1 day', 'Brasil', 'Camerún', '/uploads/flags/bra.png', '/uploads/flags/cmr.png', 'upcoming', 0, 0, 'Fase de Grupos', 'G'),
(CURRENT_TIMESTAMP + INTERVAL '2 days', 'Alemania', 'Japón', '/uploads/flags/ger.png', '/uploads/flags/jpn.png', 'upcoming', 0, 0, 'Fase de Grupos', 'E');

-- 8. SEED PREDICTIONS
-- Diego's Predictions
INSERT INTO predictions (user_id, match_id, pred_local, pred_visitante) VALUES
(2, 1, 2, 1), -- ARG vs KSA (Finished 1-2) -> Correct: None (0 pts)
(2, 2, 3, 1), -- FRA vs AUS (Finished 4-1) -> Correct: Winner (1 pt)
(2, 3, 2, 0), -- ESP vs CRC (Finished 7-0) -> Correct: Winner (1 pt)
(2, 4, 2, 1); -- USA vs MEX (Live 1-1) -> Points pending

-- Juan's Predictions
INSERT INTO predictions (user_id, match_id, pred_local, pred_visitante) VALUES
(3, 1, 1, 2), -- ARG vs KSA (Finished 1-2) -> Correct: Exact! (3 pts)
(3, 2, 4, 1), -- FRA vs AUS (Finished 4-1) -> Correct: Exact! (3 pts)
(3, 3, 3, 0), -- ESP vs CRC (Finished 7-0) -> Correct: Winner (1 pt)
(3, 4, 1, 1); -- USA vs MEX (Live 1-1) -> Points pending

-- María's Predictions
INSERT INTO predictions (user_id, match_id, pred_local, pred_visitante) VALUES
(4, 1, 1, 1), -- ARG vs KSA (Finished 1-2) -> Correct: None (0 pts)
(4, 2, 2, 0), -- FRA vs AUS (Finished 4-1) -> Correct: Winner (1 pt)
(4, 3, 7, 0), -- ESP vs CRC (Finished 7-0) -> Correct: Exact! (3 pts)
(4, 4, 0, 2); -- USA vs MEX (Live 1-1) -> Points pending

-- Pedro's Predictions
INSERT INTO predictions (user_id, match_id, pred_local, pred_visitante) VALUES
(5, 1, 2, 0), -- ARG vs KSA (Finished 1-2) -> Correct: None (0 pts)
(5, 2, 4, 1), -- FRA vs AUS (Finished 4-1) -> Correct: Exact! (3 pts)
(5, 3, 4, 0), -- ESP vs CRC (Finished 7-0) -> Correct: Winner (1 pt)
(5, 4, 1, 2); -- USA vs MEX (Live 1-1) -> Points pending

-- Admin Predictions
INSERT INTO predictions (user_id, match_id, pred_local, pred_visitante) VALUES
(1, 1, 3, 1), -- ARG vs KSA -> 0 pts
(1, 2, 5, 0), -- FRA vs AUS -> 1 pt
(1, 3, 3, 0), -- ESP vs CRC -> 1 pt
(1, 4, 2, 2); -- USA vs MEX -> Points pending

-- 9. EXECUTE INITIAL LEADERBOARD CALCULATION
SELECT recalculate_leaderboard();
