-- ============================================================================
-- ManStat: Supabase Safe Prefix Migration Script
-- File: supabase/fix_missing_male_prefixes.sql
-- Description: Idempotently restores the Thai male title 'นาย' for male staff
--              records and school leadership in Supabase Cloud database.
-- ============================================================================

-- ============================================================================
-- 1. PRE-CHECK / AUDIT QUERY (Run this first to inspect current values)
-- ============================================================================
SELECT 
  id, 
  employee_code, 
  name, 
  prefix, 
  first_name, 
  last_name, 
  position
FROM public.teachers
WHERE 
  id IN ('EXE-001', 'TCH-003', 'TCH-004', 'TCH-009', 'TCH-013', 'STF-002')
  OR name NOT LIKE 'นาย%' 
     AND name NOT LIKE 'นาง%' 
     AND name NOT LIKE 'นางสาว%' 
     AND name NOT LIKE 'ว่าที่%' 
     AND name NOT LIKE 'ดร.%';

-- ============================================================================
-- 2. SAFE & IDEMPOTENT UPDATE: Specific Known Male Staff Records
--    (Guaranteed zero duplicates: only prepends or updates if missing 'นาย')
-- ============================================================================

-- 2.1 นายธีรศักดิ์ มโนธรรม (EXE-001)
UPDATE public.teachers
SET 
  name = CASE 
    WHEN name LIKE 'นาย%' THEN name 
    ELSE 'นาย' || TRIM(name) 
  END,
  prefix = 'นาย',
  first_name = CASE 
    WHEN first_name IS NOT NULL AND first_name != '' THEN first_name 
    ELSE 'ธีรศักดิ์' 
  END,
  last_name = CASE 
    WHEN last_name IS NOT NULL AND last_name != '' THEN last_name 
    ELSE 'มโนธรรม' 
  END
WHERE id = 'EXE-001' OR employee_code = 'EXE-001';

-- 2.2 นายธวัชชัย เหลืองโอฬาร (TCH-003)
UPDATE public.teachers
SET 
  name = CASE 
    WHEN name LIKE 'นาย%' THEN name 
    ELSE 'นาย' || TRIM(name) 
  END,
  prefix = 'นาย',
  first_name = CASE 
    WHEN first_name IS NOT NULL AND first_name != '' THEN first_name 
    ELSE 'ธวัชชัย' 
  END,
  last_name = CASE 
    WHEN last_name IS NOT NULL AND last_name != '' THEN last_name 
    ELSE 'เหลืองโอฬาร' 
  END
WHERE id = 'TCH-003' OR employee_code = 'TCH-003';

-- 2.3 นายพันธ์ธนัต ภวฤทธิ์นาคินทร์ (TCH-004)
UPDATE public.teachers
SET 
  name = CASE 
    WHEN name LIKE 'นาย%' THEN name 
    ELSE 'นาย' || TRIM(name) 
  END,
  prefix = 'นาย',
  first_name = CASE 
    WHEN first_name IS NOT NULL AND first_name != '' THEN first_name 
    ELSE 'พันธ์ธนัต' 
  END,
  last_name = CASE 
    WHEN last_name IS NOT NULL AND last_name != '' THEN last_name 
    ELSE 'ภวฤทธิ์นาคินทร์' 
  END
WHERE id = 'TCH-004' OR employee_code = 'TCH-004';

-- 2.4 นายกิตติพณ พรหมทอง (TCH-009)
UPDATE public.teachers
SET 
  name = CASE 
    WHEN name LIKE 'นาย%' THEN name 
    ELSE 'นาย' || TRIM(name) 
  END,
  prefix = 'นาย',
  first_name = CASE 
    WHEN first_name IS NOT NULL AND first_name != '' THEN first_name 
    ELSE 'กิตติพณ' 
  END,
  last_name = CASE 
    WHEN last_name IS NOT NULL AND last_name != '' THEN last_name 
    ELSE 'พรหมทอง' 
  END
WHERE id = 'TCH-009' OR employee_code = 'TCH-009';

-- 2.5 นายชินวัจน์ มาตย์นอก (TCH-013)
UPDATE public.teachers
SET 
  name = CASE 
    WHEN name LIKE 'นาย%' THEN name 
    ELSE 'นาย' || TRIM(name) 
  END,
  prefix = 'นาย',
  first_name = CASE 
    WHEN first_name IS NOT NULL AND first_name != '' THEN first_name 
    ELSE 'ชินวัจน์' 
  END,
  last_name = CASE 
    WHEN last_name IS NOT NULL AND last_name != '' THEN last_name 
    ELSE 'มาตย์นอก' 
  END
WHERE id = 'TCH-013' OR employee_code = 'TCH-013';

-- 2.6 นายกำพล กักหมื่นไวย (STF-002)
UPDATE public.teachers
SET 
  name = CASE 
    WHEN name LIKE 'นาย%' THEN name 
    ELSE 'นาย' || TRIM(name) 
  END,
  prefix = 'นาย',
  first_name = CASE 
    WHEN first_name IS NOT NULL AND first_name != '' THEN first_name 
    ELSE 'กำพล' 
  END,
  last_name = CASE 
    WHEN last_name IS NOT NULL AND last_name != '' THEN last_name 
    ELSE 'กักหมื่นไวย' 
  END
WHERE id = 'STF-002' OR employee_code = 'STF-002';

-- ============================================================================
-- 3. SAFE & IDEMPOTENT UPDATE: School Leadership Info (school_info table)
-- ============================================================================

-- 3.1 Flat format support (if table has director_name column)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'school_info' AND column_name = 'director_name'
  ) THEN
    UPDATE public.school_info
    SET 
      director_name = CASE 
        WHEN director_name IS NOT NULL AND director_name != '' AND director_name NOT LIKE 'นาย%' 
        THEN 'นาย' || TRIM(director_name) 
        ELSE director_name 
      END,
      acting_director_1 = CASE 
        WHEN acting_director_1 IS NOT NULL AND acting_director_1 != '' AND acting_director_1 NOT LIKE 'นาย%' 
        THEN 'นาย' || TRIM(acting_director_1) 
        ELSE acting_director_1 
      END,
      acting_director_2 = CASE 
        WHEN acting_director_2 IS NOT NULL AND acting_director_2 != '' AND acting_director_2 NOT LIKE 'นาย%' 
        THEN 'นาย' || TRIM(acting_director_2) 
        ELSE acting_director_2 
      END;
  END IF;
END $$;

-- 3.2 Key-Value format support (if table stores vertical key/val rows)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'school_info' AND column_name = 'key'
  ) THEN
    UPDATE public.school_info
    SET val = 'นาย' || TRIM(val)
    WHERE key = 'ชื่อผู้อำนวยการ' 
      AND val IS NOT NULL 
      AND val != '' 
      AND val NOT LIKE 'นาย%';

    UPDATE public.school_info
    SET val = 'นาย' || TRIM(val)
    WHERE key = 'รักษาการคนที่ 1' 
      AND val IS NOT NULL 
      AND val != '' 
      AND val NOT LIKE 'นาย%';

    UPDATE public.school_info
    SET val = 'นาย' || TRIM(val)
    WHERE key = 'รักษาการคนที่ 2' 
      AND val IS NOT NULL 
      AND val != '' 
      AND val NOT LIKE 'นาย%';
  END IF;
END $$;

-- ============================================================================
-- 4. POST-CHECK / VERIFICATION QUERY
-- ============================================================================
SELECT 
  id, 
  employee_code, 
  prefix, 
  name, 
  first_name, 
  last_name, 
  position
FROM public.teachers
WHERE id IN ('EXE-001', 'TCH-003', 'TCH-004', 'TCH-009', 'TCH-013', 'STF-002')
ORDER BY employee_code ASC;
