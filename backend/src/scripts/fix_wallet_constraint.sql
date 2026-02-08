-- Add UNIQUE constraint to user_id in wallet_addresses table
-- This is required for .upsert() to work correctly
ALTER TABLE wallet_addresses
ADD CONSTRAINT wallet_addresses_user_id_key UNIQUE (user_id);
