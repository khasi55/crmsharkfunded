-- Check total payouts
select count(*) as total_payouts from public.payout_requests;

-- Check payouts with their user_ids
select id, user_id, amount, status from public.payout_requests limit 5;

-- Check if those user_ids exist in profiles
select * from public.profiles where id in (select user_id from public.payout_requests limit 5);

-- Check foreign key constraint
select
    tc.table_schema, 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
from 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
where tc.constraint_type = 'FOREIGN KEY' AND tc.table_name='payout_requests';
