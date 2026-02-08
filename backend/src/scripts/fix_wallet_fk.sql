-- Fix Foreign Key Constraint on wallet_addresses
-- 1. Drop the incorrect constraint pointing to non-existent 'users' table
ALTER TABLE wallet_addresses
DROP CONSTRAINT IF EXISTS wallet_addresses_user_id_fkey;

-- 2. Add correct constraint pointing to Supabase Auth Users
ALTER TABLE wallet_addresses
ADD CONSTRAINT wallet_addresses_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
