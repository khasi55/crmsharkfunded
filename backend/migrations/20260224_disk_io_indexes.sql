-- IO Optimization Indexes for Background Schedulers
-- The advanced_risk_scheduler and trade_sync_scheduler heavily query active challenges.
CREATE INDEX IF NOT EXISTS idx_challenges_status ON public.challenges(status);

-- The risk_scheduler queries active challenges and joins them with groups if possible, 
-- but filtering by status alone is very common.
-- The advanced risk also joins active challenges based on group checks.
CREATE INDEX IF NOT EXISTS idx_challenges_status_group ON public.challenges(status, "group");

-- Auth Middleware optimization (sessions and profiles are queried constantly)
CREATE INDEX IF NOT EXISTS idx_api_sessions_user_id ON public.api_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_api_sessions_active ON public.api_sessions(is_active);

-- Trades Table Filtering
-- The advanced_risk_scheduler was modified to search by open/close time and challenge_id
CREATE INDEX IF NOT EXISTS idx_trades_open_time_composite ON public.trades(challenge_id, open_time);
CREATE INDEX IF NOT EXISTS idx_trades_close_time_composite ON public.trades(challenge_id, close_time);
