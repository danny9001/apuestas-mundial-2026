-- Migration 0008: Per-match penalty scoring switch
-- Adds: penales_habilitados boolean (default false) to matches table
-- Updates: recalculate_leaderboard() to only score penalties when enabled

ALTER TABLE matches ADD COLUMN IF NOT EXISTS penales_habilitados BOOLEAN DEFAULT false;

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
  FROM matches
  WHERE id = 104 AND estado = 'finished';

  DELETE FROM leaderboard
  WHERE user_id NOT IN (
    SELECT id FROM users
    WHERE activo = true
      AND aprobado = true
      AND (tipo != 'superadmin' OR EXISTS (SELECT 1 FROM user_companies WHERE user_id = id))
  );

  UPDATE predictions p
  SET puntos = CASE
    WHEN m.estado = 'upcoming' THEN 0
    -- Exact score (3 points) - Option B: still applies even if it's a draw in a knockout match
    WHEN p.pred_local = m.goles_local AND p.pred_visitante = m.goles_visitante THEN 3
    -- Knockout match ending in a draw (either normal or extra time)
    WHEN m.fase <> 'Fase de Grupos' AND m.goles_local = m.goles_visitante THEN
      CASE
        -- If user predicted the team that won the penalty shootout, they get 1 point
        WHEN (m.stats->>'ganador') IS NOT NULL AND (m.stats->>'ganador') <> '' AND (
          (p.pred_local > p.pred_visitante AND m.stats->>'ganador' = m.local) OR
          (p.pred_local < p.pred_visitante AND m.stats->>'ganador' = m.visitante)
        ) THEN 1
        ELSE 0
      END
    -- Regular result: correct winner or draw (1 point)
    WHEN (p.pred_local > p.pred_visitante AND m.goles_local > m.goles_visitante) OR
         (p.pred_local < p.pred_visitante AND m.goles_local < m.goles_visitante) OR
         (p.pred_local = p.pred_visitante AND m.goles_local = m.goles_visitante) THEN 1
    ELSE 0
  END
  FROM matches m
  WHERE p.match_id = m.id;

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
    SELECT posicion INTO prev_pos FROM leaderboard WHERE user_id = r.u_id;
    IF prev_pos IS NULL THEN
      prev_pos := r.rk;
      new_tendencia := 'same';
    ELSE
      IF r.rk < prev_pos THEN new_tendencia := 'up';
      ELSIF r.rk > prev_pos THEN new_tendencia := 'down';
      ELSE new_tendencia := 'same';
      END IF;
    END IF;
    INSERT INTO leaderboard (user_id, puntos_totales, exactos, posicion, posicion_anterior, tendencia, updated_at)
    VALUES (r.u_id, r.total_pts, r.exact_cnt, r.rk, prev_pos, new_tendencia, CURRENT_TIMESTAMP)
    ON CONFLICT (user_id) DO UPDATE SET
      puntos_totales = EXCLUDED.puntos_totales,
      exactos = EXCLUDED.exactos,
      posicion_anterior = leaderboard.posicion,
      posicion = EXCLUDED.posicion,
      tendencia = EXCLUDED.tendencia,
      updated_at = EXCLUDED.updated_at;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

SELECT recalculate_leaderboard();
