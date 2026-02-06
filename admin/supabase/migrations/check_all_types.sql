-- Get ALL challenge types including NULLs and see if there are more values
SELECT 
    COALESCE(challenge_type, 'NULL') as challenge_type, 
    COUNT(*) as count
FROM challenges
GROUP BY challenge_type
ORDER BY count DESC;
