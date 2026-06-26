-- Chat en vivo y reacciones por partido (v1.1.104)

CREATE TABLE IF NOT EXISTS match_reactions (
    match_id   INTEGER                  NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    user_id    INTEGER                  NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
    reaction   VARCHAR(20)              NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY (match_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_match_reactions_match_id ON match_reactions (match_id);

CREATE TABLE IF NOT EXISTS match_messages (
    id             SERIAL                   PRIMARY KEY,
    match_id       INTEGER                  NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    user_id        INTEGER                  NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
    message        TEXT                     NOT NULL,
    created_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at     TIMESTAMP WITH TIME ZONE,
    deleted_by_id  INTEGER                  REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_match_messages_match_id  ON match_messages (match_id);
CREATE INDEX IF NOT EXISTS idx_match_messages_created_at ON match_messages (created_at);

-- Columna is_moderador en users (si aún no existe)
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_moderador BOOLEAN NOT NULL DEFAULT FALSE;
