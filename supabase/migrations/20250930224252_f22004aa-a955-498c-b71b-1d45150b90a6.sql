-- Create storage bucket for Navy Diving Manual PDFs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'manuals',
  'manuals',
  true,
  104857600, -- 100MB limit
  ARRAY['application/pdf']
);

-- Create RLS policies for the manuals bucket
CREATE POLICY "Public read access to manuals"
ON storage.objects FOR SELECT
USING (bucket_id = 'manuals');

-- Allow authenticated users with admin role to upload manuals
CREATE POLICY "Admin upload access to manuals"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'manuals' 
  AND auth.role() = 'authenticated'
);