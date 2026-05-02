-- =====================================================
-- KYC Sessions Table
-- Tracks Didit KYC verification sessions for users
-- =====================================================

-- Create the kyc_sessions table
CREATE TABLE IF NOT EXISTS kyc_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Didit session data
    didit_session_id TEXT NOT NULL UNIQUE,
    workflow_id TEXT NOT NULL,
    verification_url TEXT,
    
    -- Status tracking
    status TEXT NOT NULL DEFAULT 'pending',
    -- Status values: pending, in_progress, approved, declined, expired, requires_review
    
    -- Extracted KYC data (optional, based on what Didit returns)
    first_name TEXT,
    last_name TEXT,
    date_of_birth DATE,
    nationality TEXT,
    document_type TEXT,
    document_number TEXT,
    document_country TEXT,
    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT,
    state TEXT,
    postal_code TEXT,
    country TEXT,
    
    -- Risk and compliance data
    aml_status TEXT,  -- clear, hit, pending
    face_match_score NUMERIC,
    liveness_score NUMERIC,
    
    -- Metadata from Didit
    raw_response JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT valid_status CHECK (status IN ('pending', 'in_progress', 'approved', 'declined', 'expired', 'requires_review'))
);

-- Create indexes for fast lookups
CREATE INDEX idx_kyc_sessions_user ON kyc_sessions(user_id);
CREATE INDEX idx_kyc_sessions_status ON kyc_sessions(status);
CREATE INDEX idx_kyc_sessions_didit ON kyc_sessions(didit_session_id);
CREATE INDEX idx_kyc_sessions_created ON kyc_sessions(created_at DESC);

-- Add kyc_status column to profiles if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'kyc_status'
    ) THEN
        ALTER TABLE profiles ADD COLUMN kyc_status TEXT DEFAULT 'not_started';
        -- Values: not_started, pending, in_progress, approved, declined
    END IF;
END $$;

-- =====================================================
-- Row Level Security
-- =====================================================

-- Enable RLS
ALTER TABLE kyc_sessions ENABLE ROW LEVEL SECURITY;

-- Users can view their own KYC sessions
CREATE POLICY "Users can view own KYC sessions"
    ON kyc_sessions FOR SELECT
    USING (auth.uid() = user_id);

-- Users can create their own KYC sessions
CREATE POLICY "Users can create own KYC sessions"
    ON kyc_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Only service role can update (for webhook handler)
CREATE POLICY "Service role can update KYC sessions"
    ON kyc_sessions FOR UPDATE
    USING (true);

-- =====================================================
-- Trigger to update updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_kyc_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_kyc_sessions_updated_at
    BEFORE UPDATE ON kyc_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_kyc_sessions_updated_at();

-- =====================================================
-- Function to sync KYC status to profiles
-- =====================================================

CREATE OR REPLACE FUNCTION sync_kyc_status_to_profile()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE profiles 
    SET kyc_status = NEW.status
    WHERE id = NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_sync_kyc_status
    AFTER INSERT OR UPDATE OF status ON kyc_sessions
    FOR EACH ROW
    EXECUTE FUNCTION sync_kyc_status_to_profile();

-- =====================================================
-- Comments
-- =====================================================

COMMENT ON TABLE kyc_sessions IS 'Tracks Didit KYC verification sessions and results';
COMMENT ON COLUMN kyc_sessions.didit_session_id IS 'Unique session ID from Didit API';
COMMENT ON COLUMN kyc_sessions.workflow_id IS 'Didit workflow ID used for this verification';
COMMENT ON COLUMN kyc_sessions.raw_response IS 'Full JSON response from Didit webhook';
