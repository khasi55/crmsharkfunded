-- Add manual KYC columns to kyc_sessions table
ALTER TABLE kyc_sessions 
ADD COLUMN IF NOT EXISTS front_id_url TEXT,
ADD COLUMN IF NOT EXISTS back_id_url TEXT,
ADD COLUMN IF NOT EXISTS selfie_url TEXT,
ADD COLUMN IF NOT EXISTS kyc_mode TEXT DEFAULT 'didit';

-- Add comment to explain kyc_mode
COMMENT ON COLUMN kyc_sessions.kyc_mode IS 'Verification mode: "didit" for automated, "manual" for manual uploads';
