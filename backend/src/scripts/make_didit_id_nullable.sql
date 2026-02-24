-- Make didit_session_id nullable for manual KYC support
ALTER TABLE kyc_sessions ALTER COLUMN didit_session_id DROP NOT NULL;
