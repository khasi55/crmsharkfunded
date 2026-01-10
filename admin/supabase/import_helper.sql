-- 1. CLEAN START: Drop the staging table if it exists to remove any old constraints/data
DROP TABLE IF EXISTS public.users_staging_import;

-- 2. Create the staging table with NO RULES (No unique constraints)
CREATE TABLE public.users_staging_import (
    id bigint, -- Added optional ID column (if your CSV has IDs)
    name text,
    email text, 
    password text,
    phone text,
    user_type text
);

-- 3. INSTRUCTIONS FOR SUPABASE DASHBOARD:
--    a. Go to Table Editor
--    b. Click "Insert" -> "Import Data from CSV"
--    c. *** CRITICAL ***: Select 'users_staging_import' as the table. Do NOT select 'userslist'.
--    d. Import your CSV.

-- 4. AFTER IMPORT SUCCESS: Run this to move data to the real table
--    This ignores duplicates automatically.
INSERT INTO public.userslist (id, name, email, password, phone, user_type)
SELECT DISTINCT ON (email) 
    id,
    name, 
    email, 
    password, 
    phone, 
    COALESCE(user_type, 'client')
FROM public.users_staging_import
WHERE email IS NOT NULL AND email != ''
ON CONFLICT (email) DO NOTHING;

-- 4b. IMPORTANT: Reset the ID sequence so future new users don't clash with imported IDs
SELECT setval('public.userslist_id_seq', (SELECT MAX(id) FROM public.userslist));

-- 5. Validation Check
SELECT count(*) as total_users FROM public.userslist;

-- =========================================================
-- TROUBLESHOOTING: RUN THESE IF YOU GOT "0 ROWS"
-- =========================================================

-- Check A: Did the CSV import actually work? 
-- If this is 0, go back to Step 3 (Dashboard Import).
SELECT count(*) as staging_count FROM public.users_staging_import;

-- Check B: Are these users already in the main table?
-- If this is high, your "delete" didn't work previously.
SELECT count(*) as existing_users FROM public.userslist;

-- Check C: Show me emails that are in Staging but NOT in Main (The ones valid to insert)
SELECT DISTINCT ON (email) email 
FROM public.users_staging_import
WHERE email NOT IN (SELECT email FROM public.userslist);

-- Check D: VIEW THE RAW DATA (Are columns mapped correctly?)
SELECT * FROM public.users_staging_import LIMIT 5;

-- =========================================================
-- FINAL DIAGNOSTICS
-- =========================================================

-- Check E: DATA OVERLAP
-- This counts how many emails in staging ALREADY EXIST in main userslist.
-- If this number = your total rows, then the data is ALREADY IMPORTED.
SELECT count(*) as already_imported_count 
FROM public.userslist 
WHERE email IN (SELECT email FROM public.users_staging_import);

-- Check F: FORCE TEST ONE ROW
-- Try to insert just ONE row and see exactly what happens.
-- Replace 'missing@email.com' with a real email from your staging table.
INSERT INTO public.userslist (id, name, email, password, phone, user_type)
SELECT id, name, email, password, phone, COALESCE(user_type, 'client')
FROM public.users_staging_import
LIMIT 1;
