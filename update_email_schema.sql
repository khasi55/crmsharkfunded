-- 1. Add email column to profiles if it doesn't exist
alter table public.profiles 
add column if not exists email text;

-- 2. Update the handle_new_user function to include email
create or replace function public.handle_new_user()
returns trigger as $$
declare
  referrer_id uuid;
begin
  -- Try to find referrer if code is provided
  if new.raw_user_meta_data->>'referral_code' is not null then
    select id into referrer_id from public.profiles 
    where referral_code = new.raw_user_meta_data->>'referral_code';
  end if;

  insert into public.profiles (id, full_name, email, referral_code, referred_by)
  values (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    new.email,
    substring(md5(random()::text) from 0 for 8), -- Generate a random 7-char code
    referrer_id -- Save the referrer's ID
  );
  
  -- Increment referral count for the referrer
  if referrer_id is not null then
    update public.profiles 
    set total_referrals = total_referrals + 1 
    where id = referrer_id;
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- 3. Backfill emails from auth.users to public.profiles
update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id
and p.email is null;
