-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Risk Groups Table
CREATE TABLE IF NOT EXISTS mt5_risk_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_name VARCHAR(100) NOT NULL UNIQUE, -- e.g., 'demo\pro', 'demo\starter'
    max_drawdown_percent DECIMAL(5, 2) DEFAULT 10.0,
    daily_drawdown_percent DECIMAL(5, 2) DEFAULT 5.0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Server Configuration Table (Single Row expected usually)
CREATE TABLE IF NOT EXISTS mt5_server_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    server_name VARCHAR(100) DEFAULT 'Primary MT5',
    server_ip VARCHAR(100) NOT NULL,
    manager_login INTEGER NOT NULL,
    manager_password VARCHAR(255) NOT NULL, -- Will store plain for now (User ack), intended for vault
    api_port INTEGER DEFAULT 443,
    callback_url VARCHAR(255) DEFAULT 'https://b1cee60c5e70.ngrok-free.app/api/mt5/trades',
    monitored_groups JSONB DEFAULT '["demo\\Pro-Platinum", "demo\\10K", "demo\\25K"]'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. System Logs Table
CREATE TABLE IF NOT EXISTS system_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source VARCHAR(50) NOT NULL, -- e.g., 'PythonBridge', 'RiskScheduler'
    level VARCHAR(20) DEFAULT 'INFO', -- INFO, WARN, ERROR
    message TEXT NOT NULL,
    details JSONB, -- Extra data
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add Indexes
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON system_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_level ON system_logs(level);

-- Seed Default Risk Groups
INSERT INTO mt5_risk_groups (group_name, max_drawdown_percent, daily_drawdown_percent)
VALUES 
    ('demo\pro', 10.0, 5.0),
    ('demo\starter', 8.0, 4.0)
ON CONFLICT (group_name) DO NOTHING;

-- Seed Default Config (Placeholder)
INSERT INTO mt5_server_config (server_ip, manager_login, manager_password)
VALUES ('127.0.0.1', 1000, 'password')
ON CONFLICT DO NOTHING; -- No unique constraint on IP, but this is a seed check
