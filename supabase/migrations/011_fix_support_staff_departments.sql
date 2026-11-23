-- ============================================================================
-- Migration 011: Fix Support Staff Departments & Clear Irrelevant Teaching Subjects
-- ============================================================================
-- Janitor (STF-002), Clerk (STF-001), and Special-Needs Aide (TCH-014)
-- are support staff and must not be assigned to teaching academic subject groups
-- (e.g. 'ภาษาไทย' or 'สังคมศึกษา ศาสนาและวัฒนธรรม').
-- Normalizes their department to 'สายงานบริหารและสนับสนุนการศึกษา'.
-- ============================================================================

UPDATE teachers
SET department = 'สายงานบริหารและสนับสนุนการศึกษา'
WHERE id IN ('TCH-014', 'STF-001', 'STF-002')
   OR position ILIKE '%พี่เลี้ยง%'
   OR position ILIKE '%ธุรการ%'
   OR position ILIKE '%นักการ%'
   OR position ILIKE '%ภารโรง%';
