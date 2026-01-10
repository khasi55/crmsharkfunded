-- =====================================================
-- KYC Verification Details - Additional Columns
-- Stores detailed verification data from Didit webhook
-- =====================================================

-- Add verification-specific columns to kyc_sessions
ALTER TABLE kyc_sessions 
ADD COLUMN IF NOT EXISTS id_verification_status TEXT,
ADD COLUMN IF NOT EXISTS liveness_status TEXT,
ADD COLUMN IF NOT EXISTS liveness_method TEXT,
ADD COLUMN IF NOT EXISTS face_match_status TEXT,
ADD COLUMN IF NOT EXISTS aml_score NUMERIC,
ADD COLUMN IF NOT EXISTS aml_total_hits INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS phone_status TEXT,
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS email_status TEXT,
ADD COLUMN IF NOT EXISTS email_address TEXT,
ADD COLUMN IF NOT EXISTS poa_status TEXT,
ADD COLUMN IF NOT EXISTS nfc_status TEXT,
ADD COLUMN IF NOT EXISTS database_validation_status TEXT,
ADD COLUMN IF NOT EXISTS ip_country TEXT,
ADD COLUMN IF NOT EXISTS ip_country_code TEXT,
ADD COLUMN IF NOT EXISTS is_vpn_or_tor BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS gender TEXT,
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS formatted_address TEXT;

-- Add comments
COMMENT ON COLUMN kyc_sessions.id_verification_status IS 'Status from ID document verification (Approved, Declined, In Review)';
COMMENT ON COLUMN kyc_sessions.liveness_status IS 'Status from liveness check';
COMMENT ON COLUMN kyc_sessions.liveness_method IS 'Liveness method used (ACTIVE_3D, PASSIVE, etc.)';
COMMENT ON COLUMN kyc_sessions.face_match_status IS 'Status from face matching between selfie and document';
COMMENT ON COLUMN kyc_sessions.aml_score IS 'AML risk score (0-100)';
COMMENT ON COLUMN kyc_sessions.aml_total_hits IS 'Number of AML screening hits';
COMMENT ON COLUMN kyc_sessions.phone_status IS 'Phone verification status';
COMMENT ON COLUMN kyc_sessions.phone_number IS 'Verified phone number';
COMMENT ON COLUMN kyc_sessions.email_status IS 'Email verification status';
COMMENT ON COLUMN kyc_sessions.email_address IS 'Verified email address';
COMMENT ON COLUMN kyc_sessions.poa_status IS 'Proof of Address verification status';
COMMENT ON COLUMN kyc_sessions.nfc_status IS 'NFC chip reading status';
COMMENT ON COLUMN kyc_sessions.database_validation_status IS 'Government database validation status';
COMMENT ON COLUMN kyc_sessions.ip_country IS 'Country detected from IP address';
COMMENT ON COLUMN kyc_sessions.ip_country_code IS 'ISO country code from IP';
COMMENT ON COLUMN kyc_sessions.is_vpn_or_tor IS 'Whether user is using VPN or Tor';
COMMENT ON COLUMN kyc_sessions.full_name IS 'Full name from ID document';
COMMENT ON COLUMN kyc_sessions.formatted_address IS 'Formatted address from ID document';
