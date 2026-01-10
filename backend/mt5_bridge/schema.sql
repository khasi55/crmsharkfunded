-- Supabase Database Schema for MT5 Bridge
-- Run these SQL commands in Supabase SQL Editor

-- 1. Account Groups Configuration
CREATE TABLE IF NOT EXISTS account_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_name TEXT NOT NULL UNIQUE,
    initial_balance NUMERIC NOT NULL DEFAULT 10000,
    max_drawdown_percent NUMERIC NOT NULL DEFAULT 10.0,
    leverage INTEGER NOT NULL DEFAULT 100,
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default groups
INSERT INTO account_groups (group_name, initial_balance, max_drawdown_percent, leverage) VALUES
    ('demo\\10K', 10000, 10.0, 100),
    ('demo\\25K', 25000, 10.0, 100),
    ('demo\\Pro-Platinum', 10000, 10.0, 200)
ON CONFLICT (group_name) DO NOTHING;

-- 2. System Logs
CREATE TABLE IF NOT EXISTS system_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bridge_id INTEGER NOT NULL,
    level TEXT NOT NULL CHECK (level IN ('INFO', 'WARN', 'ERROR')),
    message TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_system_logs_bridge_id ON system_logs(bridge_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);

-- 3. Stop-Out History
CREATE TABLE IF NOT EXISTS stopout_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bridge_id INTEGER NOT NULL,
    login BIGINT NOT NULL,
    equity NUMERIC NOT NULL,
    latency_ms NUMERIC NOT NULL,
    success BOOLEAN NOT NULL,
    positions_closed INTEGER DEFAULT 0,
    account_disabled BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_stopout_history_login ON stopout_history(login);
CREATE INDEX IF NOT EXISTS idx_stopout_history_created_at ON stopout_history(created_at DESC);

-- 4. Trade Sync Log
CREATE TABLE IF NOT EXISTS trade_sync_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bridge_id INTEGER NOT NULL,
    login BIGINT NOT NULL,
    new_deals_count INTEGER NOT NULL,
    webhook_success BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_trade_sync_log_login ON trade_sync_log(login);
CREATE INDEX IF NOT EXISTS idx_trade_sync_log_created_at ON trade_sync_log(created_at DESC);

-- 5. Bridge Metrics
CREATE TABLE IF NOT EXISTS bridge_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bridge_id INTEGER NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    accounts_monitored INTEGER,
    stopouts_executed INTEGER,
    deals_synced INTEGER,
    webhook_success_rate NUMERIC,
    avg_stopout_latency_ms NUMERIC,
    pump_updates_count INTEGER,
    redis_connected BOOLEAN,
    mt5_connected BOOLEAN
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_bridge_metrics_bridge_id ON bridge_metrics(bridge_id);
CREATE INDEX IF NOT EXISTS idx_bridge_metrics_timestamp ON bridge_metrics(timestamp DESC);

-- 6. Account Configuration
CREATE TABLE IF NOT EXISTS account_config (
    login BIGINT PRIMARY KEY,
    group_name TEXT NOT NULL,
    initial_balance NUMERIC NOT NULL,
    current_equity NUMERIC,
    is_active BOOLEAN DEFAULT true,
    stop_out_limit NUMERIC,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_account_config_group_name ON account_config(group_name);
CREATE INDEX IF NOT EXISTS idx_account_config_is_active ON account_config(is_active);

-- 7. Enable Row Level Security (RLS) - Optional but recommended
ALTER TABLE account_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE stopout_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE bridge_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_config ENABLE ROW LEVEL SECURITY;

-- Create policies (allow service role to do everything)
CREATE POLICY "Service role has full access to account_groups" ON account_groups
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to system_logs" ON system_logs
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to stopout_history" ON stopout_history
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to trade_sync_log" ON trade_sync_log
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to bridge_metrics" ON bridge_metrics
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to account_config" ON account_config
    FOR ALL USING (auth.role() = 'service_role');

-- 8. Create views for easy querying

-- Recent stop-outs (last 24 hours)
CREATE OR REPLACE VIEW recent_stopouts AS
SELECT 
    login,
    equity,
    latency_ms,
    success,
    created_at
FROM stopout_history
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- Bridge health summary
CREATE OR REPLACE VIEW bridge_health AS
SELECT 
    bridge_id,
    MAX(timestamp) as last_update,
    AVG(webhook_success_rate) as avg_webhook_success,
    AVG(avg_stopout_latency_ms) as avg_latency,
    SUM(stopouts_executed) as total_stopouts,
    SUM(deals_synced) as total_deals
FROM bridge_metrics
WHERE timestamp > NOW() - INTERVAL '1 hour'
GROUP BY bridge_id;

-- Active accounts summary
CREATE OR REPLACE VIEW active_accounts_summary AS
SELECT 
    group_name,
    COUNT(*) as account_count,
    AVG(current_equity) as avg_equity,
    SUM(CASE WHEN current_equity < stop_out_limit THEN 1 ELSE 0 END) as at_risk_count
FROM account_config
WHERE is_active = true
GROUP BY group_name;
