-- Add start_of_day_equity column if it doesn't exist
ALTER TABLE challenges 
ADD COLUMN IF NOT EXISTS start_of_day_equity DECIMAL(15, 2) DEFAULT NULL;

-- Initialize it with current equity for existing active challenges
UPDATE challenges 
SET start_of_day_equity = current_equity 
WHERE status = 'active' AND start_of_day_equity IS NULL;
