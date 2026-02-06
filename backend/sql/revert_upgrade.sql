-- Revert upgraded accounts back to "passed" status for testing
-- This is useful when testing the upgrade flow and need to retry

-- Option 1: Revert a specific account by ID
-- UPDATE challenges 
-- SET status = 'passed', upgraded_to = NULL
-- WHERE id = 'YOUR_ACCOUNT_ID_HERE';

-- Option 2: Revert all upgraded accounts (use with caution!)
UPDATE challenges 
SET status = 'passed', upgraded_to = NULL
WHERE status = 'upgraded';

-- Option 3: Revert and also delete the new account that was created
-- First find the upgraded account and its new account
-- SELECT id, challenge_type, status, upgraded_to 
-- FROM challenges 
-- WHERE status = 'upgraded' 
-- ORDER BY created_at DESC 
-- LIMIT 10;

-- Then delete the new account and revert the old one:
-- BEGIN;
-- DELETE FROM challenges WHERE id = 'NEW_ACCOUNT_ID_FROM_upgraded_to_FIELD';
-- UPDATE challenges SET status = 'passed', upgraded_to = NULL WHERE id = 'OLD_ACCOUNT_ID';
-- COMMIT;

-- Check the results
SELECT id, login, challenge_type, status, upgraded_to, created_at
FROM challenges 
WHERE status IN ('passed', 'upgraded')
ORDER BY created_at DESC 
LIMIT 20;
