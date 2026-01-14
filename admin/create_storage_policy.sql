
-- Enable RLS on objects if not already (storage schema)
-- allow inserts to proofs bucket for everyone (or authenticated)

create policy "Allow public uploads to proofs bucket"
on storage.objects for insert
with check ( bucket_id = 'proofs' );

create policy "Allow public updates to proofs bucket"
on storage.objects for update
with check ( bucket_id = 'proofs' );

create policy "Allow public select to proofs bucket"
on storage.objects for select
using ( bucket_id = 'proofs' );
