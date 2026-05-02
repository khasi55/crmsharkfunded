-- Optimizing dashboard stats queries
-- Measurements show filtering by challenge_id AND close_time (for Open/Closed statuses) is frequent

CREATE INDEX IF NOT EXISTS idx_trades_stats_composite 
ON public.trades (challenge_id, close_time);

CREATE INDEX IF NOT EXISTS idx_trades_user_date 
ON public.trades (user_id, open_time DESC);
