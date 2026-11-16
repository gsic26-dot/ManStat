/**
 * ============================================================================
 * ManStat-Modern: Migration 002 - Automated Storage Buckets & Storage RLS
 * ============================================================================
 * - Provisions 'leave-documents' and 'signatures' buckets directly in storage.buckets
 * - Configures fine-grained RLS on storage.objects (Owner upload, Admin review)
 * - Zero-Manual Configuration: Fully idempotent execution
 * ============================================================================
 */

-- 1. Provision Storage Buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  (
    'leave-documents',
    'leave-documents',
    false,
    5242880, -- 5 MB
    ARRAY['application/pdf', 'image/jpeg', 'image/png']
  ),
  (
    'signatures',
    'signatures',
    false,
    2097152, -- 2 MB
    ARRAY['image/png', 'image/jpeg']
  )
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Storage Objects Row-Level Security (RLS)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Clean existing policies for idempotency
DROP POLICY IF EXISTS "Authenticated users can upload leave docs" ON storage.objects;
DROP POLICY IF EXISTS "Authorized users can read leave docs" ON storage.objects;
DROP POLICY IF EXISTS "Users can update delete their own leave docs" ON storage.objects;

DROP POLICY IF EXISTS "Authenticated users can upload signatures" ON storage.objects;
DROP POLICY IF EXISTS "Authorized users can read signatures" ON storage.objects;
DROP POLICY IF EXISTS "Users can update delete their own signatures" ON storage.objects;

-- 2.1 Policies for 'leave-documents'
CREATE POLICY "Authenticated users can upload leave docs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'leave-documents'
);

CREATE POLICY "Authorized users can read leave docs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'leave-documents' AND (
    auth.uid() = owner OR
    EXISTS (
      SELECT 1 FROM public.staff s
      WHERE s.id = auth.uid()
        AND s.role IN ('hr_admin', 'director')
    )
  )
);

CREATE POLICY "Users can update delete their own leave docs"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'leave-documents' AND (
    auth.uid() = owner OR
    EXISTS (
      SELECT 1 FROM public.staff s
      WHERE s.id = auth.uid()
        AND s.role IN ('hr_admin', 'director')
    )
  )
);

-- 2.2 Policies for 'signatures'
CREATE POLICY "Authenticated users can upload signatures"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'signatures'
);

CREATE POLICY "Authorized users can read signatures"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'signatures'
);

CREATE POLICY "Users can update delete their own signatures"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'signatures' AND auth.uid() = owner
);
