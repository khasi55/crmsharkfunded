-- Add trade_id column to advanced_risk_flags table
ALTER TABLE advanced_risk_flags
ADD COLUMN IF NOT EXISTS trade_id uuid REFERENCES trades(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_advanced_risk_flags_trade_id ON advanced_risk_flags(trade_id);
