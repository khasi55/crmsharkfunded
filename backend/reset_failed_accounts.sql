-- 🚨 RESET SCRIPT FOR MOCK BRIDGE ERROR 🚨
-- This script fixes accounts that were accidentally marked as 'failed' 
-- because the Mock Bridge reported 0 Equity/Balance.

-- 1. Restore status to 'active' for failed accounts with 0 equity
UPDATE public.challenges
SET 
  status = 'active', 
  current_equity = initial_balance,
  current_balance = initial_balance
WHERE 
  status = 'failed' 
  AND (current_equity = 0 OR current_balance = 0);

-- 2. Optional: Clean up the violation logs created by this error
DELETE FROM public.risk_violations
WHERE 
  violation_type = 'max_loss_breach' 
  AND (details->>'equity')::numeric = 0;

-- 3. Verify the fix
SELECT id, login, status, initial_balance, current_equity 
FROM public.challenges 
WHERE status = 'active';
