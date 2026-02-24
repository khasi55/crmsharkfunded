
-- Create bank_details table
CREATE TABLE IF NOT EXISTS public.bank_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    account_holder_name TEXT NOT NULL,
    bank_name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    ifsc_code TEXT,
    swift_code TEXT,
    is_locked BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.bank_details ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own bank details"
    ON public.bank_details FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bank details"
    ON public.bank_details FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bank details if not locked"
    ON public.bank_details FOR UPDATE
    USING (auth.uid() = user_id AND is_locked = false);

-- Function to handle updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for updated_at
CREATE TRIGGER handle_updated_at_bank_details
    BEFORE UPDATE ON public.bank_details
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_updated_at();

-- Add index on user_id
CREATE INDEX IF NOT EXISTS idx_bank_details_user_id ON public.bank_details(user_id);
