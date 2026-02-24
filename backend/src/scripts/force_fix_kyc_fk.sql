-- 1. Check if the user exists in auth.users (To verify identity)
SELECT id, email FROM auth.users WHERE id = '69d47096-96e2-4235-b2e0-fb5dc06cbe1d';

-- 2. Dynamically find and drop ANY foreign key constraints on kyc_sessions.user_id
DO $$ 
DECLARE 
    constraint_record RECORD;
BEGIN
    FOR constraint_record IN (
        SELECT tc.constraint_name 
        FROM information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        WHERE tc.table_schema = 'public' 
          AND tc.table_name = 'kyc_sessions' 
          AND kcu.column_name = 'user_id'
          AND tc.constraint_type = 'FOREIGN KEY'
    ) 
    LOOP
        EXECUTE 'ALTER TABLE public.kyc_sessions DROP CONSTRAINT ' || quote_ident(constraint_record.constraint_name);
        RAISE NOTICE 'Dropped constraint: %', constraint_record.constraint_name;
    END LOOP;
END $$;

-- 3. Add the correct constraint pointing to auth.users
ALTER TABLE public.kyc_sessions
ADD CONSTRAINT kyc_sessions_user_id_auth_fkey
FOREIGN KEY (user_id)
REFERENCES auth.users(id)
ON DELETE CASCADE;

-- 4. Verify the new constraint
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.table_name = 'kyc_sessions' AND kcu.column_name = 'user_id';
