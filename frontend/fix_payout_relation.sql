-- Explicitly add the foreign key relationship to ensure PostgREST detects it
alter table public.payout_requests
drop constraint if exists payout_requests_user_id_fkey;

alter table public.payout_requests
add constraint payout_requests_user_id_fkey
foreign key (user_id)
references public.profiles (id)
on delete cascade;

-- Also verify/add for KYC requests just in case
alter table public.kyc_requests
drop constraint if exists kyc_requests_user_id_fkey;

alter table public.kyc_requests
add constraint kyc_requests_user_id_fkey
foreign key (user_id)
references public.profiles (id)
on delete cascade;

-- Reload the schema cache (Supabase specific helper if available, otherwise usually auto-reloads on DDL)
NOTIFY pgrst, 'reload config';
