-- Add 2FA and WebAuthn columns to admin_users table

ALTER TABLE public.admin_users
ADD COLUMN IF NOT EXISTS two_factor_secret text,
ADD COLUMN IF NOT EXISTS is_two_factor_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS webauthn_credentials jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS is_webauthn_enabled boolean DEFAULT false;

-- Comment on columns
COMMENT ON COLUMN public.admin_users.two_factor_secret IS 'Secret key for TOTP 2FA';
COMMENT ON COLUMN public.admin_users.webauthn_credentials IS 'Array of WebAuthn credentials (FaceID/TouchID)';
