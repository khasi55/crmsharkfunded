-- 1. Make Didit-specific columns nullable for manual KYC support
ALTER TABLE kyc_sessions ALTER COLUMN didit_session_id DROP NOT NULL;
ALTER TABLE kyc_sessions ALTER COLUMN workflow_id DROP NOT NULL;
ALTER TABLE kyc_sessions ALTER COLUMN verification_url DROP NOT NULL;

-- 2. Fix the user_id foreign key constraint
-- It currently points to public.users, but should point to auth.users
ALTER TABLE kyc_sessions DROP CONSTRAINT IF EXISTS kyc_sessions_user_id_fkey;

ALTER TABLE kyc_sessions
ADD CONSTRAINT kyc_sessions_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES auth.users(id)
ON DELETE CASCADE;
