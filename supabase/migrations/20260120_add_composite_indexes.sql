-- ============================================
-- OPTIMIZATION: COMPOSITE INDEXES
-- ============================================
-- Adds composite indexes to speed up dashboard queries that filter by
-- challenge_id/user_id AND sort by time.

-- Index for Trade History (Filter by Challenge + Sort by Close Time)
create index if not exists idx_trades_challenge_close_time 
on public.trades(challenge_id, close_time DESC);

-- Index for Dashboard Stats (Filter by User + Sort by Open Time)
create index if not exists idx_trades_user_open_time 
on public.trades(user_id, open_time DESC);

-- Index for Ledger/Analysis (Filter by Challenge + Sort by Open Time)
create index if not exists idx_trades_challenge_open_time
on public.trades(challenge_id, open_time DESC);
