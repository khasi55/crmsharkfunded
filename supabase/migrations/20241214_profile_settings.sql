-- Add profile detail columns for settings page
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS pincode TEXT,
ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Add comment
COMMENT ON COLUMN profiles.display_name IS 'User-set display name (separate from KYC verified name)';
COMMENT ON COLUMN profiles.address IS 'User address from settings';
COMMENT ON COLUMN profiles.pincode IS 'Postal/zip code';
