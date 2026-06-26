-- Global chat replacing per-match chat and notification inbox
CREATE TABLE IF NOT EXISTS global_messages (
    id            SERIAL PRIMARY KEY,
    user_id       INTEGER REFERENCES users(id) ON DELETE SET NULL,
    message       TEXT NOT NULL CHECK (char_length(message) BETWEEN 1 AND 500),
    is_system     BOOLEAN NOT NULL DEFAULT FALSE,
    target_type   VARCHAR(20) NOT NULL DEFAULT 'all',
    target_id     INTEGER,
    created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at    TIMESTAMP WITH TIME ZONE,
    deleted_by_id INTEGER REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_global_messages_created ON global_messages (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_global_messages_target  ON global_messages (target_type, target_id);
