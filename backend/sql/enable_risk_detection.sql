-- Enable Risk Engine Detection Rules
-- This updates the risk_rules_config table to enable:
-- 1. Martingale/Hedging detection (always enabled in code)
-- 2. Tick Scalping detection (minimum trade duration)

-- Enable tick scalping detection by setting minimum trade duration to 60 seconds
UPDATE risk_rules_config 
SET min_trade_duration_seconds = 60
WHERE min_trade_duration_seconds = 0 OR min_trade_duration_seconds IS NULL;

-- Verify the update
SELECT mt5_group_name, min_trade_duration_seconds, allow_ea_trading, allow_news_trading, allow_weekend_trading 
FROM risk_rules_config;
