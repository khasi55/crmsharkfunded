-- Add columns for manual KYC document upload and approval
-- Run this in Supabase SQL Editor

ALTER TABLE kyc_sessions
ADD COLUMN IF NOT EXISTS manual_document_url TEXT,
ADD COLUMN IF NOT EXISTS manual_document_type TEXT,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

-- Add index for admin queries
CREATE INDEX IF NOT EXISTS idx_kyc_sessions_status ON kyc_sessions(status);
CREATE INDEX IF NOT EXISTS idx_kyc_sessions_approved_by ON kyc_sessions(approved_by);

-- Comment the columns
COMMENT ON COLUMN kyc_sessions.manual_document_url IS 'URL to manually uploaded KYC document (bypassing Didit)';
COMMENT ON COLUMN kyc_sessions.manual_document_type IS 'Type of manual document: passport, drivers_license, utility_bill, etc.';
COMMENT ON COLUMN kyc_sessions.rejection_reason IS 'Admin reason for rejecting KYC';
COMMENT ON COLUMN kyc_sessions.approved_by IS 'Admin user who manually approved this KYC';
COMMENT ON COLUMN kyc_sessions.approved_at IS 'Timestamp when KYC was manually approved';
