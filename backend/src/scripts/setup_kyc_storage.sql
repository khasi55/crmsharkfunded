-- Create kyc-documents bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('kyc-documents', 'kyc-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Allow users to upload their own KYC documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to view their own KYC documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow admins to view all KYC documents" ON storage.objects;

-- Policy: Allow users to upload their own KYC documents
CREATE POLICY "Allow users to upload their own KYC documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'kyc-documents' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Allow users to view their own KYC documents
CREATE POLICY "Allow users to view their own KYC documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'kyc-documents' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Allow admins to view all KYC documents
CREATE POLICY "Allow admins to view all KYC documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'kyc-documents' AND 
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND is_admin = true
    )
);
