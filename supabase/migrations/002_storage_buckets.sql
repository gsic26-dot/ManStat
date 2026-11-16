-- ============================================================================
-- ManStat-Modern: Migration 002 - Automated Storage Buckets & Storage RLS
-- ============================================================================
-- สร้าง Bucket 'leave-documents' และ 'signatures' อัตโนมัติผ่าน SQL
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('leave-documents', 'leave-documents', FALSE, 5242880, ARRAY['application/pdf', 'image/jpeg', 'image/png']),
  ('signatures', 'signatures', FALSE, 2097152, ARRAY['image/png', 'image/jpeg'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- RLS สำหรับอัปโหลดและดูเอกสารใบลา
DROP POLICY IF EXISTS "allow_auth_upload_leave_docs" ON storage.objects;
CREATE POLICY "allow_auth_upload_leave_docs" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id IN ('leave-documents', 'signatures'));

DROP POLICY IF EXISTS "allow_auth_read_leave_docs" ON storage.objects;
CREATE POLICY "allow_auth_read_leave_docs" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id IN ('leave-documents', 'signatures'));

DROP POLICY IF EXISTS "allow_auth_delete_leave_docs" ON storage.objects;
CREATE POLICY "allow_auth_delete_leave_docs" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id IN ('leave-documents', 'signatures') AND (auth.uid() = owner OR public.fn_is_admin_or_director()));
