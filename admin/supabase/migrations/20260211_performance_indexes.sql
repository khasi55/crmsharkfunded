-- Performance Optimization: Add Composite Indexes
-- Target: Reduce query latency from 12.71s (P95) to <5s

-- 0. Enable trigram extension for text search (MUST BE FIRST)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1. Text search optimization for profiles table
CREATE INDEX IF NOT EXISTS idx_profiles_full_name_gin 
ON public.profiles USING gin(full_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_profiles_email_gin 
ON public.profiles USING gin(email gin_trgm_ops);

-- 2. Composite index for challenges filtering (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_challenges_composite_status_type_created 
ON public.challenges(challenge_type, status, created_at DESC);

-- 3. Composite index for user-specific queries
CREATE INDEX IF NOT EXISTS idx_challenges_composite_user_status_created 
ON public.challenges(user_id, status, created_at DESC);

-- 4. Index for initial_balance filtering
CREATE INDEX IF NOT EXISTS idx_challenges_initial_balance 
ON public.challenges(initial_balance);

-- 5. Index for login searches
CREATE INDEX IF NOT EXISTS idx_challenges_login_search 
ON public.challenges(login) WHERE login IS NOT NULL;

-- 6. Composite index for trades table (frequently joined)
CREATE INDEX IF NOT EXISTS idx_trades_composite_challenge_open_time 
ON public.trades(challenge_id, open_time DESC);

-- Analyze tables to update statistics
ANALYZE public.profiles;
ANALYZE public.challenges;
ANALYZE public.trades;
