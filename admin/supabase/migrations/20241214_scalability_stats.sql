-- 1. Create Aggregation Table for Fast Dashboard Loading
CREATE TABLE IF NOT EXISTS public.daily_account_stats (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
    date date NOT NULL,
    balance numeric NOT NULL DEFAULT 0,
    equity numeric NOT NULL DEFAULT 0,
    daily_profit numeric NOT NULL DEFAULT 0,
    total_profit numeric NOT NULL DEFAULT 0,
    trades_count integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(challenge_id, date)
);

-- 2. Create Indexes for Performance
-- Essential for querying stats by account
CREATE INDEX IF NOT EXISTS idx_daily_stats_challenge_date ON public.daily_account_stats(challenge_id, date);

-- 3. Optimization for Trades Table (Assuming it exists, if not create safely)
CREATE TABLE IF NOT EXISTS public.trades (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_id uuid REFERENCES public.challenges(id),
    user_id uuid REFERENCES auth.users(id),
    ticket text,
    symbol text,
    type text,
    lots numeric,
    open_price numeric,
    close_price numeric,
    open_time timestamptz,
    close_time timestamptz,
    profit_loss numeric,
    commission numeric,
    swap numeric,
    comment text
);

-- Crucial indexes for large-scale efficient querying
CREATE INDEX IF NOT EXISTS idx_trades_challenge_id ON public.trades(challenge_id);
CREATE INDEX IF NOT EXISTS idx_trades_open_time ON public.trades(open_time);
CREATE INDEX IF NOT EXISTS idx_trades_client_id ON public.trades(user_id);

-- 4. Enable RLS
ALTER TABLE public.daily_account_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own stats"
    ON public.daily_account_stats FOR SELECT
    USING (challenge_id IN (
        SELECT id FROM public.challenges WHERE user_id = auth.uid()
    ));
