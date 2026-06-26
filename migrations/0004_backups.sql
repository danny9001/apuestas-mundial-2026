CREATE TABLE IF NOT EXISTS database_backups (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL, -- 'full' | 'incremental' | 'manual'
    blob_name VARCHAR(255) NOT NULL,
    size_bytes BIGINT,
    status VARCHAR(50) NOT NULL, -- 'success' | 'failed'
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
