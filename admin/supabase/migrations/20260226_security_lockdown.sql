-- 1. Profiles Lockdown: Prevent privilege escalation
-- Drop the old permissive policy
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;

-- Create a new restrictive policy
-- auth.uid() = id matches the owner
-- WITH CHECK ensures an update CANNOT change is_admin or user_type if you are not an admin
CREATE POLICY "Users can update own profile (restricted)" ON public.profiles
  FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND 
    (
      -- Either the user is NOT changing these columns
      (is_admin = (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) AND
       user_type = (SELECT user_type FROM public.profiles WHERE id = auth.uid()))
      OR
      -- Or the user is an admin (Service Role or already an admin)
      -- Note: Service role usually bypasses RLS, but for additional safety:
      (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (is_admin = true OR user_type = 'super_admin')))
    )
  );

-- 2. Enable PGCrypto for hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 3. Update Admin Credentials RPC
-- Re-defining the function with password hashing (Bcrypt)
CREATE OR REPLACE FUNCTION public.verify_admin_credentials(email_input text, password_input text)
RETURNS TABLE (id uuid, email text, full_name text, role text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT au.id, au.email, au.full_name, 'admin'::text as role
  FROM public.admin_users au
  WHERE au.email = email_input
  AND (
    -- Allow BOTH plain text (for existing) AND hashed (for new)
    -- This allows for a graceful migration
    au.password = password_input OR 
    au.password = crypt(password_input, au.password)
  );
END;
$$;

-- 4. Storage Lockdown (Bucket policy)
-- This normally requires UI or Storage API but we can try via SQL if the table exists
-- However, storage policies are usually on storage.objects

-- Users can upload documents to their own folder
CREATE POLICY "Users can upload own KYC documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'kyc-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Admins can view all KYC documents
CREATE POLICY "Admins can view all KYC documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'kyc-documents' AND 
  (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (is_admin = true OR user_type = 'super_admin')))
);

-- Deny public access (ensure bucket is private)
-- This is usually a bucket property, but ensuring SELECT is restricted handles it.
-- DROP POLICY IF EXISTS "Public Access" ON storage.objects;
