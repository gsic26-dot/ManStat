-- ============================================================================
-- Migration 017: Phase 8 Administrative Roles, Job Descriptions & OBEC Systems
-- ============================================================================
-- Adds structured administrative role fields on `public.staff_workloads`:
--   1. academic_year       TEXT   (e.g. '2569')
--   2. scope_description   TEXT   (Job Description / ขอบข่ายภาระงาน)
--   3. obec_systems        JSONB  (OBEC reporting system codes, e.g. ['DMC','EMIS'])
--   4. co_responsible_ids  JSONB  (Array of co-responsible staff IDs/codes)
-- Idempotent and safe to re-run. Forces PostgREST schema reload.
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'staff_workloads'
  ) THEN
    ALTER TABLE public.staff_workloads
      ADD COLUMN IF NOT EXISTS academic_year TEXT DEFAULT '',
      ADD COLUMN IF NOT EXISTS scope_description TEXT DEFAULT '',
      ADD COLUMN IF NOT EXISTS obec_systems JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS co_responsible_ids JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
