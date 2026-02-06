-- Check trades for account 900909490084
SELECT 
    t.id,
    t.ticket_number,
    t.symbol,
    t.type,
    t.lots,
    t.open_price,
    t.close_price,
    t.open_time,
    t.close_time,
    t.profit_loss
FROM trades t
JOIN challenges c ON t.challenge_id = c.id
WHERE c.login = '900909490084'
ORDER BY t.open_time DESC
LIMIT 10;
