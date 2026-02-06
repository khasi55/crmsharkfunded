-- Step 1: Identify all unique challenge_type values currently in the database
SELECT challenge_type, COUNT(*) as count
FROM challenges
GROUP BY challenge_type
ORDER BY count DESC;
