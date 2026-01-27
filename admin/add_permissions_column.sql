-- Add permissions column to admin_users table
ALTER TABLE public.admin_users 
ADD COLUMN IF NOT EXISTS permissions text[] DEFAULT '{}';

-- Create an index for faster lookups (optional but good practice)
CREATE INDEX IF NOT EXISTS idx_admin_users_permissions ON public.admin_users USING GIN (permissions);
