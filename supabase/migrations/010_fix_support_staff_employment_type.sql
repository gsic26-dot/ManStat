-- ============================================================================
-- Migration 010: Fix Support Staff Employment Type Categorization
-- ============================================================================
-- Ensures นางสาวอภิชญา พุสดีดอน (TCH-014), เจ้าหน้าที่ธุรการ (STF-001),
-- and นักการภารโรง (STF-002) are strictly classified as 'temporary_employee'
-- (ลูกจ้าง / สายสนับสนุน), maintaining exact system totals:
-- Total: 15 staff members (12 civil servants + 3 support/contract staff)
-- ============================================================================

UPDATE teachers
SET employment_type = 'temporary_employee'
WHERE id IN ('TCH-014', 'STF-001', 'STF-002')
   OR position ILIKE '%พี่เลี้ยง%'
   OR position ILIKE '%ธุรการ%'
   OR position ILIKE '%นักการ%'
   OR position ILIKE '%ภารโรง%'
   OR position ILIKE '%ลูกจ้าง%'
   OR position ILIKE '%จ้างเหมา%';

-- Ensure civil servants are correctly marked as civil_servant
UPDATE teachers
SET employment_type = 'civil_servant'
WHERE id NOT IN ('TCH-014', 'STF-001', 'STF-002')
  AND position NOT ILIKE '%พี่เลี้ยง%'
  AND position NOT ILIKE '%ธุรการ%'
  AND position NOT ILIKE '%นักการ%'
  AND position NOT ILIKE '%ภารโรง%'
  AND position NOT ILIKE '%ลูกจ้าง%'
  AND position NOT ILIKE '%จ้างเหมา%'
  AND (employment_type IS NULL OR employment_type = '');
