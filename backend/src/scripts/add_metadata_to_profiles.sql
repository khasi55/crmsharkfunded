-- Add metadata column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
