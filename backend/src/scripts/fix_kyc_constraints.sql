-- Make Didit-specific columns nullable for manual KYC support
ALTER TABLE kyc_sessions ALTER COLUMN didit_session_id DROP NOT NULL;
ALTER TABLE kyc_sessions ALTER COLUMN workflow_id DROP NOT NULL;
ALTER TABLE kyc_sessions ALTER COLUMN verification_url DROP NOT NULL;
