-- Performance indexes (item 17)
-- Partial index for leaderboard recalculation: only non-upcoming matches need scoring
CREATE INDEX IF NOT EXISTS idx_matches_estado_active ON matches(estado) WHERE estado != 'upcoming';

-- Retention: faster log cleanup queries
CREATE INDEX IF NOT EXISTS idx_sync_log_synced_at ON sync_log (synced_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mail_logs_created_at ON mail_queue (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_reads_created_at ON notification_reads (read_at DESC);
