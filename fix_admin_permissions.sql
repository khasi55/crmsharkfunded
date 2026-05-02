-- 1. Check if ANY users exist in profiles
select count(*) as total_profiles from public.profiles;

-- 2. Check if the specific user exists (replace email with the user's email if known, or check by ID)
-- Finding user by ID 'f79f6ada-a98d-4bad-acd0-6c47efcc5710'
select * from public.profiles where id = 'f79f6ada-a98d-4bad-acd0-6c47efcc5710';

-- 3. Grant Admin Permissions to a specific user (Replace with your actual email or ID)
-- Update by ID
update public.profiles
set is_admin = true
where id = 'f79f6ada-a98d-4bad-acd0-6c47efcc5710';

-- OR Update by Email (if email backfill was successful)
-- update public.profiles
-- set is_admin = true
-- where email = 'yashraj.gaikwad@example.com'; -- Replace with actual email

-- 4. Verify RLS policies exist
select * from pg_policies where schemaname = 'public' and tablename = 'payout_requests';

-- 5. Check if Payout Requests exist
select count(*) as total_payouts from public.payout_requests;
