-- Fix affiliate_earnings table
ALTER TABLE public.affiliate_earnings 
ADD COLUMN IF NOT EXISTS commission_type text,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS metadata jsonb;

-- Ensure affiliate_withdrawals table exists
CREATE TABLE IF NOT EXISTS public.affiliate_withdrawals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  amount numeric not null,
  payout_method text not null,
  payout_details jsonb,
  status text default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  processed_at timestamp with time zone,
  notes text
);

-- Enable RLS for withdrawals
ALTER TABLE public.affiliate_withdrawals ENABLE ROW LEVEL SECURITY;

-- Policies for withdrawals
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies WHERE tablename = 'affiliate_withdrawals' AND policyname = 'Users can view own withdrawals'
    ) THEN
        CREATE POLICY "Users can view own withdrawals" ON public.affiliate_withdrawals
          FOR SELECT USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (
        SELECT FROM pg_policies WHERE tablename = 'affiliate_withdrawals' AND policyname = 'Users can request withdrawals'
    ) THEN
        CREATE POLICY "Users can request withdrawals" ON public.affiliate_withdrawals
          FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Create increment_affiliate_commission RPC
CREATE OR REPLACE FUNCTION public.increment_affiliate_commission(p_user_id uuid, p_amount numeric)
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET total_commission = COALESCE(total_commission, 0) + p_amount
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
