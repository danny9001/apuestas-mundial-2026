const fs = require('fs');

const baseSchema = `-- Drop tables if they exist
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

-- 5. Create SYNC_LOG table
CREATE TABLE sync_log (
  id SERIAL PRIMARY KEY,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  matches_updated INTEGER DEFAULT 0,
  goals_detected INTEGER DEFAULT 0,
  matches_finished INTEGER DEFAULT 0,
  errors TEXT[],
  duration_ms INTEGER
);

-- 5b. Create COMPANIES table
CREATE TABLE companies (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5c. Create USER_COMPANIES junction table
CREATE TABLE user_companies (
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, company_id)
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
INSERT INTO users (nombre, email, password_hash, tipo, avatar, activo) VALUES
('Daniel Admin', 'admin@mundial.com', '$2b$10$aPOUgT9FX/pYSsXZ8KaTq.1o5Y.jaFSAtzYO0MzRTvTa9QexniUqi', 'admin', 'https://api.dicebear.com/7.x/adventurer/svg?seed=admin', true);
`;

const groupMatches = [
  // GRUPO A
  { fase: 'Fase de Grupos', grupo: 'A', fecha: '2026-06-11 15:00:00-04', local: 'México', visitante: 'Sudáfrica', estadio: 'Estadio Azteca, CDMX', extId: 2601 },
  { fase: 'Fase de Grupos', grupo: 'A', fecha: '2026-06-11 22:00:00-04', local: 'Corea del Sur', visitante: 'República Checa', estadio: 'Guadalajara', extId: 2602 },
  { fase: 'Fase de Grupos', grupo: 'A', fecha: '2026-06-18 12:00:00-04', local: 'República Checa', visitante: 'Sudáfrica', estadio: 'Atlanta', extId: 2603 },
  { fase: 'Fase de Grupos', grupo: 'A', fecha: '2026-06-18 22:00:00-04', local: 'México', visitante: 'Corea del Sur', estadio: 'Guadalajara', extId: 2604 },
  { fase: 'Fase de Grupos', grupo: 'A', fecha: '2026-06-24 22:00:00-04', local: 'República Checa', visitante: 'México', estadio: 'Estadio Azteca, CDMX', extId: 2605 },
  { fase: 'Fase de Grupos', grupo: 'A', fecha: '2026-06-24 22:00:00-04', local: 'Sudáfrica', visitante: 'Corea del Sur', estadio: 'Monterrey', extId: 2606 },

  // GRUPO B
  { fase: 'Fase de Grupos', grupo: 'B', fecha: '2026-06-12 15:00:00-04', local: 'Canadá', visitante: 'Bosnia y Herzegovina', estadio: 'Toronto', extId: 2607 },
  { fase: 'Fase de Grupos', grupo: 'B', fecha: '2026-06-13 15:00:00-04', local: 'Qatar', visitante: 'Suiza', estadio: 'San Francisco', extId: 2608 },
  { fase: 'Fase de Grupos', grupo: 'B', fecha: '2026-06-18 15:00:00-04', local: 'Suiza', visitante: 'Bosnia y Herzegovina', estadio: 'Los Ángeles', extId: 2609 },
  { fase: 'Fase de Grupos', grupo: 'B', fecha: '2026-06-18 18:00:00-04', local: 'Canadá', visitante: 'Qatar', estadio: 'Vancouver', extId: 2610 },
  { fase: 'Fase de Grupos', grupo: 'B', fecha: '2026-06-24 15:00:00-04', local: 'Suiza', visitante: 'Canadá', estadio: 'Vancouver', extId: 2611 },
  { fase: 'Fase de Grupos', grupo: 'B', fecha: '2026-06-24 15:00:00-04', local: 'Bosnia y Herzegovina', visitante: 'Qatar', estadio: 'Seattle', extId: 2612 },

  // GRUPO C
  { fase: 'Fase de Grupos', grupo: 'C', fecha: '2026-06-13 18:00:00-04', local: 'Brasil', visitante: 'Marruecos', estadio: 'Nueva York/NJ', extId: 2613 },
  { fase: 'Fase de Grupos', grupo: 'C', fecha: '2026-06-13 21:00:00-04', local: 'Haití', visitante: 'Escocia', estadio: 'Boston', extId: 2614 },
  { fase: 'Fase de Grupos', grupo: 'C', fecha: '2026-06-19 18:00:00-04', local: 'Escocia', visitante: 'Marruecos', estadio: 'Houston', extId: 2615 },
  { fase: 'Fase de Grupos', grupo: 'C', fecha: '2026-06-19 21:00:00-04', local: 'Brasil', visitante: 'Haití', estadio: 'Kansas City', extId: 2616 },
  { fase: 'Fase de Grupos', grupo: 'C', fecha: '2026-06-25 18:00:00-04', local: 'Marruecos', visitante: 'Haití', estadio: 'CDMX', extId: 2617 },
  { fase: 'Fase de Grupos', grupo: 'C', fecha: '2026-06-25 18:00:00-04', local: 'Escocia', visitante: 'Brasil', estadio: 'Boston', extId: 2618 },

  // GRUPO D
  { fase: 'Fase de Grupos', grupo: 'D', fecha: '2026-06-12 21:00:00-04', local: 'Estados Unidos', visitante: 'Paraguay', estadio: 'Los Ángeles', extId: 2619 },
  { fase: 'Fase de Grupos', grupo: 'D', fecha: '2026-06-14 00:00:00-04', local: 'Australia', visitante: 'Turquía', estadio: 'Vancouver', extId: 2620 },
  { fase: 'Fase de Grupos', grupo: 'D', fecha: '2026-06-19 15:00:00-04', local: 'Estados Unidos', visitante: 'Australia', estadio: 'Seattle', extId: 2621 },
  { fase: 'Fase de Grupos', grupo: 'D', fecha: '2026-06-19 21:00:00-04', local: 'Turquía', visitante: 'Paraguay', estadio: 'Filadelfia', extId: 2622 },
  { fase: 'Fase de Grupos', grupo: 'D', fecha: '2026-06-25 22:00:00-04', local: 'Turquía', visitante: 'Estados Unidos', estadio: 'Los Ángeles', extId: 2623 },
  { fase: 'Fase de Grupos', grupo: 'D', fecha: '2026-06-25 22:00:00-04', local: 'Paraguay', visitante: 'Australia', estadio: 'Vancouver', extId: 2624 },

  // GRUPO E
  { fase: 'Fase de Grupos', grupo: 'E', fecha: '2026-06-14 13:00:00-04', local: 'Alemania', visitante: 'Curazao', estadio: 'Houston', extId: 2625 },
  { fase: 'Fase de Grupos', grupo: 'E', fecha: '2026-06-14 19:00:00-04', local: 'Costa de Marfil', visitante: 'Ecuador', estadio: 'Filadelfia', extId: 2626 },
  { fase: 'Fase de Grupos', grupo: 'E', fecha: '2026-06-20 13:00:00-04', local: 'Ecuador', visitante: 'Curazao', estadio: 'Seattle', extId: 2627 },
  { fase: 'Fase de Grupos', grupo: 'E', fecha: '2026-06-20 19:00:00-04', local: 'Alemania', visitante: 'Costa de Marfil', estadio: 'Atlanta', extId: 2628 },
  { fase: 'Fase de Grupos', grupo: 'E', fecha: '2026-06-26 16:00:00-04', local: 'Curazao', visitante: 'Costa de Marfil', estadio: 'Houston', extId: 2629 },
  { fase: 'Fase de Grupos', grupo: 'E', fecha: '2026-06-26 16:00:00-04', local: 'Ecuador', visitante: 'Alemania', estadio: 'Filadelfia', extId: 2630 },

  // GRUPO F
  { fase: 'Fase de Grupos', grupo: 'F', fecha: '2026-06-14 16:00:00-04', local: 'Países Bajos', visitante: 'Japón', estadio: 'Dallas', extId: 2631 },
  { fase: 'Fase de Grupos', grupo: 'F', fecha: '2026-06-14 22:00:00-04', local: 'Suecia', visitante: 'Túnez', estadio: 'Monterrey', extId: 2632 },
  { fase: 'Fase de Grupos', grupo: 'F', fecha: '2026-06-20 16:00:00-04', local: 'Japón', visitante: 'Túnez', estadio: 'Dallas', extId: 2633 },
  { fase: 'Fase de Grupos', grupo: 'F', fecha: '2026-06-20 22:00:00-04', local: 'Países Bajos', visitante: 'Suecia', estadio: 'Monterrey', extId: 2634 },
  { fase: 'Fase de Grupos', grupo: 'F', fecha: '2026-06-26 19:00:00-04', local: 'Túnez', visitante: 'Países Bajos', estadio: 'CDMX', extId: 2635 },
  { fase: 'Fase de Grupos', grupo: 'F', fecha: '2026-06-26 19:00:00-04', local: 'Japón', visitante: 'Suecia', estadio: 'Dallas', extId: 2636 },

  // GRUPO G
  { fase: 'Fase de Grupos', grupo: 'G', fecha: '2026-06-15 15:00:00-04', local: 'Bélgica', visitante: 'Egipto', estadio: 'Seattle', extId: 2637 },
  { fase: 'Fase de Grupos', grupo: 'G', fecha: '2026-06-15 21:00:00-04', local: 'Irán', visitante: 'Nueva Zelanda', estadio: 'Los Ángeles', extId: 2638 },
  { fase: 'Fase de Grupos', grupo: 'G', fecha: '2026-06-21 15:00:00-04', local: 'Nueva Zelanda', visitante: 'Egipto', estadio: 'San Francisco', extId: 2639 },
  { fase: 'Fase de Grupos', grupo: 'G', fecha: '2026-06-21 21:00:00-04', local: 'Bélgica', visitante: 'Irán', estadio: 'Los Ángeles', extId: 2640 },
  { fase: 'Fase de Grupos', grupo: 'G', fecha: '2026-06-27 16:00:00-04', local: 'Egipto', visitante: 'Irán', estadio: 'Seattle', extId: 2641 },
  { fase: 'Fase de Grupos', grupo: 'G', fecha: '2026-06-27 16:00:00-04', local: 'Nueva Zelanda', visitante: 'Bélgica', estadio: 'San Francisco', extId: 2642 },

  // GRUPO H
  { fase: 'Fase de Grupos', grupo: 'H', fecha: '2026-06-15 12:00:00-04', local: 'España', visitante: 'Cabo Verde', estadio: 'Atlanta', extId: 2643 },
  { fase: 'Fase de Grupos', grupo: 'H', fecha: '2026-06-15 18:00:00-04', local: 'Arabia Saudita', visitante: 'Uruguay', estadio: 'Miami', extId: 2644 },
  { fase: 'Fase de Grupos', grupo: 'H', fecha: '2026-06-21 12:00:00-04', local: 'Uruguay', visitante: 'Cabo Verde', estadio: 'Miami', extId: 2645 },
  { fase: 'Fase de Grupos', grupo: 'H', fecha: '2026-06-21 18:00:00-04', local: 'España', visitante: 'Arabia Saudita', estadio: 'Atlanta', extId: 2646 },
  { fase: 'Fase de Grupos', grupo: 'H', fecha: '2026-06-27 19:00:00-04', local: 'Cabo Verde', visitante: 'Arabia Saudita', estadio: 'Dallas', extId: 2647 },
  { fase: 'Fase de Grupos', grupo: 'H', fecha: '2026-06-27 19:00:00-04', local: 'Uruguay', visitante: 'España', estadio: 'Miami', extId: 2648 },

  // GRUPO I
  { fase: 'Fase de Grupos', grupo: 'I', fecha: '2026-06-16 15:00:00-04', local: 'Francia', visitante: 'Senegal', estadio: 'Nueva York/NJ', extId: 2649 },
  { fase: 'Fase de Grupos', grupo: 'I', fecha: '2026-06-16 18:00:00-04', local: 'Irak', visitante: 'Noruega', estadio: 'Boston', extId: 2650 },
  { fase: 'Fase de Grupos', grupo: 'I', fecha: '2026-06-22 15:00:00-04', local: 'Noruega', visitante: 'Senegal', estadio: 'Toronto', extId: 2651 },
  { fase: 'Fase de Grupos', grupo: 'I', fecha: '2026-06-22 18:00:00-04', local: 'Francia', visitante: 'Irak', estadio: 'Nueva York/NJ', extId: 2652 },
  { fase: 'Fase de Grupos', grupo: 'I', fecha: '2026-06-28 16:00:00-04', local: 'Senegal', visitante: 'Irak', estadio: 'Boston', extId: 2653 },
  { fase: 'Fase de Grupos', grupo: 'I', fecha: '2026-06-28 16:00:00-04', local: 'Noruega', visitante: 'Francia', estadio: 'Toronto', extId: 2654 },

  // GRUPO J
  { fase: 'Fase de Grupos', grupo: 'J', fecha: '2026-06-16 21:00:00-04', local: 'Argentina', visitante: 'Argelia', estadio: 'Kansas City', extId: 2655 },
  { fase: 'Fase de Grupos', grupo: 'J', fecha: '2026-06-17 00:00:00-04', local: 'Austria', visitante: 'Jordania', estadio: 'San Francisco', extId: 2656 },
  { fase: 'Fase de Grupos', grupo: 'J', fecha: '2026-06-22 14:00:00-04', local: 'Argentina', visitante: 'Austria', estadio: 'Dallas', extId: 2657 },
  { fase: 'Fase de Grupos', grupo: 'J', fecha: '2026-06-22 21:00:00-04', local: 'Jordania', visitante: 'Argelia', estadio: 'Kansas City', extId: 2658 },
  { fase: 'Fase de Grupos', grupo: 'J', fecha: '2026-06-28 19:00:00-04', local: 'Argelia', visitante: 'Austria', estadio: 'San Francisco', extId: 2659 },
  { fase: 'Fase de Grupos', grupo: 'J', fecha: '2026-06-28 19:00:00-04', local: 'Jordania', visitante: 'Argentina', estadio: 'Dallas', extId: 2660 },

  // GRUPO K
  { fase: 'Fase de Grupos', grupo: 'K', fecha: '2026-06-17 13:00:00-04', local: 'Portugal', visitante: 'RD Congo', estadio: 'Houston', extId: 2661 },
  { fase: 'Fase de Grupos', grupo: 'K', fecha: '2026-06-17 22:00:00-04', local: 'Uzbekistán', visitante: 'Colombia', estadio: 'CDMX', extId: 2662 },
  { fase: 'Fase de Grupos', grupo: 'K', fecha: '2026-06-23 13:00:00-04', local: 'Colombia', visitante: 'RD Congo', estadio: 'Guadalajara', extId: 2663 },
  { fase: 'Fase de Grupos', grupo: 'K', fecha: '2026-06-23 22:00:00-04', local: 'Portugal', visitante: 'Uzbekistán', estadio: 'Houston', extId: 2664 },
  { fase: 'Fase de Grupos', grupo: 'K', fecha: '2026-06-27 22:00:00-04', local: 'RD Congo', visitante: 'Uzbekistán', estadio: 'Atlanta', extId: 2665 },
  { fase: 'Fase de Grupos', grupo: 'K', fecha: '2026-06-27 22:00:00-04', local: 'Colombia', visitante: 'Portugal', estadio: 'Guadalajara', extId: 2666 },

  // GRUPO L
  { fase: 'Fase de Grupos', grupo: 'L', fecha: '2026-06-17 16:00:00-04', local: 'Inglaterra', visitante: 'Croacia', estadio: 'Dallas', extId: 2667 },
  { fase: 'Fase de Grupos', grupo: 'L', fecha: '2026-06-17 19:00:00-04', local: 'Ghana', visitante: 'Panamá', estadio: 'Toronto', extId: 2668 },
  { fase: 'Fase de Grupos', grupo: 'L', fecha: '2026-06-23 16:00:00-04', local: 'Croacia', visitante: 'Panamá', estadio: 'Boston', extId: 2669 },
  { fase: 'Fase de Grupos', grupo: 'L', fecha: '2026-06-23 19:00:00-04', local: 'Inglaterra', visitante: 'Ghana', estadio: 'Filadelfia', extId: 2670 },
  { fase: 'Fase de Grupos', grupo: 'L', fecha: '2026-06-28 22:00:00-04', local: 'Panamá', visitante: 'Inglaterra', estadio: 'Toronto', extId: 2671 },
  { fase: 'Fase de Grupos', grupo: 'L', fecha: '2026-06-28 22:00:00-04', local: 'Croacia', visitante: 'Ghana', estadio: 'Filadelfia', extId: 2672 },
];

const knockouts = [];
let extIdBase = 2700;

// Ronda de 32 (16 partidos: Jun 29 - Jul 2)
const r32Matches = [
  { local: '1A', visitante: '3C/D/E', estadio: 'Dallas' },
  { local: '1B', visitante: '3A/C/D', estadio: 'Atlanta' },
  { local: '1C', visitante: '3B/F/G', estadio: 'Nueva York/NJ' },
  { local: '1D', visitante: '3A/B/H', estadio: 'Los Ángeles' },
  { local: '1E', visitante: '3D/F/I', estadio: 'Houston' },
  { local: '1F', visitante: '3E/G/J', estadio: 'Miami' },
  { local: '1G', visitante: '3F/H/K', estadio: 'Seattle' },
  { local: '1H', visitante: '3G/I/L', estadio: 'Boston' },
  { local: '2A', visitante: '2B', estadio: 'San Francisco' },
  { local: '2C', visitante: '2D', estadio: 'Guadalajara' },
  { local: '2E', visitante: '2F', estadio: 'Monterrey' },
  { local: '2G', visitante: '2H', estadio: 'Vancouver' },
  { local: '2I', visitante: '2J', estadio: 'Toronto' },
  { local: '2K', visitante: '2L', estadio: 'Filadelfia' },
  { local: '1I', visitante: '3J/K/L', estadio: 'Kansas City' },
  { local: '1J', visitante: '2K', estadio: 'CDMX' }
];

r32Matches.forEach((m, idx) => {
  const dayOffset = Math.floor(idx / 4);
  const hourOffset = (idx % 4) * 3;
  knockouts.push({
    fase: 'Ronda de 32',
    fecha: `2026-06-29 ${12 + hourOffset}:00:00-04`,
    local: m.local,
    visitante: m.visitante,
    estadio: m.estadio,
    extId: extIdBase++
  });
});

// Octavos de Final (8 partidos: Jul 3 - Jul 6)
for (let i = 0; i < 8; i++) {
  const dayOffset = Math.floor(i / 2);
  const hourOffset = (i % 2) * 4;
  knockouts.push({
    fase: 'Octavos de Final',
    fecha: `2026-07-03 ${14 + hourOffset}:00:00-04`,
    local: `Ganador R32-${i * 2 + 1}`,
    visitante: `Ganador R32-${i * 2 + 2}`,
    estadio: ['Miami', 'Dallas', 'Atlanta', 'Los Ángeles', 'Nueva York/NJ', 'Boston', 'San Francisco', 'Seattle'][i],
    extId: extIdBase++
  });
}

// Cuartos de Final (4 partidos: Jul 9 - Jul 10)
for (let i = 0; i < 4; i++) {
  const dayOffset = Math.floor(i / 2);
  const hourOffset = (i % 2) * 5;
  knockouts.push({
    fase: 'Cuartos de Final',
    fecha: `2026-07-09 ${15 + hourOffset}:00:00-04`,
    local: `Ganador Octavos-${i * 2 + 1}`,
    visitante: `Ganador Octavos-${i * 2 + 2}`,
    estadio: ['Los Ángeles', 'Kansas City', 'Miami', 'Boston'][i],
    extId: extIdBase++
  });
}

// Semifinales (2 partidos: Jul 14 - Jul 15)
knockouts.push({
  fase: 'Semifinal',
  fecha: '2026-07-14 20:00:00-04',
  local: 'Ganador Cuartos-1',
  visitante: 'Ganador Cuartos-2',
  estadio: 'Dallas',
  extId: extIdBase++
});
knockouts.push({
  fase: 'Semifinal',
  fecha: '2026-07-15 20:00:00-04',
  local: 'Ganador Cuartos-3',
  visitante: 'Ganador Cuartos-4',
  estadio: 'Atlanta',
  extId: extIdBase++
});

// Tercer Puesto (1 partido: Jul 18)
knockouts.push({
  fase: 'Tercer Puesto',
  fecha: '2026-07-18 16:00:00-04',
  local: 'Perdedor Semifinal-1',
  visitante: 'Perdedor Semifinal-2',
  estadio: 'Kansas City',
  extId: extIdBase++
});

// Final (1 partido: Jul 19)
knockouts.push({
  fase: 'Final',
  fecha: '2026-07-19 16:00:00-04',
  local: 'Ganador Semifinal-1',
  visitante: 'Ganador Semifinal-2',
  estadio: 'MetLife Stadium, Nueva York/NJ',
  extId: extIdBase++
});

// Format matches insert statements
let sqlContent = baseSchema + '\n\n-- 8. SEED ALL 104 MATCHES (48 Group Stage + 56 Knockout Stage)\nINSERT INTO matches (external_id, fecha, local, visitante, logo_local, logo_visitante, estado, goles_local, goles_visitante, fase, grupo, estadio) VALUES\n';

const allMatches = [...groupMatches, ...knockouts];
const matchStrings = allMatches.map(m => {
  const logoL = m.grupo ? `/uploads/flags/${m.local.toLowerCase().replace(/ /g, '_')}.png` : null;
  const logoV = m.grupo ? `/uploads/flags/${m.visitante.toLowerCase().replace(/ /g, '_')}.png` : null;
  const logoLStr = logoL ? `'${logoL}'` : 'NULL';
  const logoVStr = logoV ? `'${logoV}'` : 'NULL';
  const grupoStr = m.grupo ? `'${m.grupo}'` : 'NULL';
  return `(${m.extId}, '${m.fecha}', '${m.local}', '${m.visitante}', ${logoLStr}, ${logoVStr}, 'upcoming', 0, 0, '${m.fase}', ${grupoStr}, '${m.estadio}')`;
});

sqlContent += matchStrings.join(',\n') + ';\n\n-- 9. EXECUTE INITIAL LEADERBOARD CALCULATION\nSELECT recalculate_leaderboard();\n';

fs.writeFileSync('init.sql', sqlContent, 'utf8');
console.log('Successfully generated init.sql with 104 matches.');
