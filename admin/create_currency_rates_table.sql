-- Add currency conversion rates table
CREATE TABLE IF NOT EXISTS public.currency_rates (
    id SERIAL PRIMARY KEY,
    from_currency TEXT NOT NULL,
    to_currency TEXT NOT NULL,
    rate NUMERIC NOT NULL,
    is_active BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(from_currency, to_currency)
);

-- Insert default USD to INR rate
INSERT INTO public.currency_rates (from_currency, to_currency, rate)
VALUES ('USD', 'INR', 83.00)
ON CONFLICT (from_currency, to_currency) 
DO UPDATE SET rate = 83.00, updated_at = NOW();

-- Function to get conversion rate
CREATE OR REPLACE FUNCTION get_conversion_rate(from_curr TEXT, to_curr TEXT)
RETURNS NUMERIC AS $$
DECLARE
    conversion_rate NUMERIC;
BEGIN
    SELECT rate INTO conversion_rate
    FROM public.currency_rates
    WHERE from_currency = from_curr 
    AND to_currency = to_curr
    AND is_active = true;
    
    RETURN COALESCE(conversion_rate, 1);
END;
$$ LANGUAGE plpgsql;

-- Enable RLS
ALTER TABLE public.currency_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Currency rates are publicly readable"
    ON public.currency_rates FOR SELECT
    USING (true);

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Currency conversion table created!';
    RAISE NOTICE '💱 Default: 1 USD = 83 INR';
    RAISE NOTICE '📝 Update rate anytime: UPDATE currency_rates SET rate = 84 WHERE from_currency = ''USD'' AND to_currency = ''INR'';';
END $$;
