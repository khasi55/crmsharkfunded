-- Add initial_balance column to competitions table
ALTER TABLE competitions 
ADD COLUMN IF NOT EXISTS initial_balance DECIMAL(15, 2) DEFAULT 100000;
