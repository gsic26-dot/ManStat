-- ============================================================================
-- Migration 016: Phase 7 HR Schema Verification & Missing history_scout Columns
-- ============================================================================
-- 1. Adds missing columns `order_number` and `issued_by` to `public.history_scout`
--    (previously dropped silently on save in serverDb.ts `scoutToDb`).
-- 2. Ensures JSONB registry columns (`licenses`, `standings`, `educations`) and
--    summary columns exist on `public.teachers` (idempotent safety check).
-- 3. Forces PostgREST schema cache reload.
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'history_scout'
  ) THEN
    ALTER TABLE public.history_scout
      ADD COLUMN IF NOT EXISTS order_number TEXT DEFAULT '',
      ADD COLUMN IF NOT EXISTS issued_by TEXT DEFAULT 'สำนักงานลูกเสือแห่งชาติ';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'teachers'
  ) THEN
    ALTER TABLE public.teachers
      ADD COLUMN IF NOT EXISTS academic_standing TEXT DEFAULT '-',
      ADD COLUMN IF NOT EXISTS licenses JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS standings JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS educations JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS highest_scout TEXT DEFAULT 'ไม่มีวุฒิลูกเสือ',
      ADD COLUMN IF NOT EXISTS scout_cert_no TEXT DEFAULT '';
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
