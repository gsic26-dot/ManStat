-- ============================================================================
-- Migration 005: Khurusapha Teaching Licenses & Scout Registry Real Data Sync
-- ============================================================================
-- 1. Ensure columns licenses JSONB, highest_scout TEXT, and scout_cert_no TEXT exist on teachers table.
-- 2. Populate licenses column on teachers from history_licenses or authentic seed data.
-- 3. Clean legacy mock scout data from history_scout table.
-- ============================================================================

-- Step 1: Add columns if they do not exist
ALTER TABLE public.teachers
  ADD COLUMN IF NOT EXISTS licenses JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS highest_scout TEXT DEFAULT 'ไม่มีวุฒิลูกเสือ',
  ADD COLUMN IF NOT EXISTS scout_cert_no TEXT DEFAULT '';

-- Step 2: Migrate data from history_licenses into teachers.licenses if licenses is currently empty
DO $$
BEGIN
  -- Aggregate licenses from history_licenses into teachers.licenses
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'history_licenses') THEN
    UPDATE public.teachers t
    SET licenses = sub.lic_arr
    FROM (
      SELECT
        emp_id,
        jsonb_agg(
          jsonb_build_object(
            'category', COALESCE(license_category, 'ครู'),
            'type', COALESCE(license_type, 'ใบอนุญาตประกอบวิชาชีพครู'),
            'number', COALESCE(license_number, ''),
            'issueDate', COALESCE(issue_date, ''),
            'expiryDate', COALESCE(expiry_date, '')
          )
        ) AS lic_arr
      FROM public.history_licenses
      GROUP BY emp_id
    ) sub
    WHERE (t.id = sub.emp_id OR t.employee_code = sub.emp_id)
      AND (t.licenses IS NULL OR t.licenses = '[]'::jsonb);
  END IF;
END $$;

-- Step 3: Ensure Director (EXE-001) has authentic Khurusapha licenses
UPDATE public.teachers
SET licenses = '[
  {
    "category": "ครู",
    "type": "B License (ใบอนุญาตประกอบวิชาชีพครู ชั้นต้น)",
    "number": "B68400502383947",
    "issueDate": "2026-08-27",
    "expiryDate": "2030-08-25"
  },
  {
    "category": "ผู้บริหารสถานศึกษา",
    "type": "ใบอนุญาตประกอบวิชาชีพผู้บริหารสถานศึกษา",
    "number": "67229000036282",
    "issueDate": "2024-11-12",
    "expiryDate": "2029-11-11"
  }
]'::jsonb
WHERE (id = 'EXE-001' OR employee_code = 'EXE-001')
  AND (licenses IS NULL OR licenses = '[]'::jsonb);

-- Step 4: Clean up legacy mock scout records from history_scout if present
DELETE FROM public.history_scout
WHERE cert_number IN ('ลส. 345/2561', 'ลส. 892/2562', 'นม. 112/2565', 'ลส. 540/2564')
   OR record_id IN ('REC-1792836354319', 'SCT-001', 'SCT-002', 'SCT-003', 'SCT-004');
