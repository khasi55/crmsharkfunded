-- Function to update daily stats when a trade occurs
CREATE OR REPLACE FUNCTION update_daily_stats_on_trade()
RETURNS TRIGGER AS $$
DECLARE
    trade_date date;
    trade_pnl numeric;
    trade_challenge_id uuid;
BEGIN
    -- Determine operation type
    IF (TG_OP = 'INSERT') THEN
        trade_date := DATE(NEW.close_time);
        trade_pnl := NEW.profit_loss;
        trade_challenge_id := NEW.challenge_id;
    ELSIF (TG_OP = 'UPDATE') THEN
        trade_date := DATE(NEW.close_time);
        trade_pnl := NEW.profit_loss - OLD.profit_loss; -- Adjust difference
        trade_challenge_id := NEW.challenge_id;
    ELSIF (TG_OP = 'DELETE') THEN
        trade_date := DATE(OLD.close_time);
        trade_pnl := -OLD.profit_loss;
        trade_challenge_id := OLD.challenge_id;
    END IF;

    -- Only proceed if we have a valid date (closed trade)
    IF trade_date IS NULL THEN
        RETURN NULL;
    END IF;

    -- Update or Insert into daily_account_stats
    INSERT INTO public.daily_account_stats (challenge_id, date, daily_profit, trades_count, updated_at)
    VALUES (trade_challenge_id, trade_date, trade_pnl, 1, now())
    ON CONFLICT (challenge_id, date)
    DO UPDATE SET
        daily_profit = daily_account_stats.daily_profit + EXCLUDED.daily_profit,
        trades_count = daily_account_stats.trades_count + 1,
        updated_at = now();

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create Trigger
DROP TRIGGER IF EXISTS trg_update_daily_stats ON public.trades;
CREATE TRIGGER trg_update_daily_stats
AFTER INSERT OR UPDATE OR DELETE ON public.trades
FOR EACH ROW
EXECUTE FUNCTION update_daily_stats_on_trade();
