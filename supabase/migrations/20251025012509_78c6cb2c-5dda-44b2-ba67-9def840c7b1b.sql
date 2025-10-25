-- Make uploaded_by nullable for system-initiated document ingestion
ALTER TABLE public.documents 
ALTER COLUMN uploaded_by DROP NOT NULL;