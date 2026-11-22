-- ============================================================================
-- Migration 008: Add 3-State evaluation_status to fiscal_periods
-- ============================================================================
-- Adds evaluation_status ('closed' | 'open' | 'locked') to manage the 3-state
-- round lifecycle for OBEC evaluation and salary promotions.
-- Defaults to 'closed' for new rounds to prevent premature submissions.
-- ============================================================================

-- 1. Add evaluation_status column if not already present
ALTER TABLE fiscal_periods
ADD COLUMN IF NOT EXISTS evaluation_status TEXT DEFAULT 'closed';

-- 2. Backfill existing records based on is_locked and is_active
UPDATE fiscal_periods
SET evaluation_status = CASE
  WHEN is_locked = true THEN 'locked'
  WHEN is_active = true THEN 'open'
  ELSE 'closed'
END
WHERE evaluation_status IS NULL;

-- 3. Add constraint for 3 valid states
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_fiscal_periods_evaluation_status'
  ) THEN
    ALTER TABLE fiscal_periods
    ADD CONSTRAINT check_fiscal_periods_evaluation_status
    CHECK (evaluation_status IN ('closed', 'open', 'locked'));
  END IF;
END $$;
