-- Migration to add login tracking to admin_users
ALTER TABLE public.admin_users 
ADD COLUMN IF NOT EXISTS last_seen timestamp with time zone,
ADD COLUMN IF NOT EXISTS daily_login_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_login_date date;

-- Update existing users to have a last_login_date
UPDATE public.admin_users SET last_login_date = CURRENT_DATE WHERE last_login_date IS NULL;
