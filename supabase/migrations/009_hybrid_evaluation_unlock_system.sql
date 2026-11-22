-- ============================================================================
-- Migration 009: Hybrid Evaluation Unlock System (Auto 15-Day Window + Global + Per-User)
-- ============================================================================
-- 1. Updates evaluation_status to default 'auto', migrates 'closed' to 'auto'
-- 2. Adds auto_unlock_days (default 15, range 1-60)
-- 3. Adds unlocked_staff_ids (TEXT[] DEFAULT '{}') for per-user manual overrides
-- ============================================================================

-- 1. Ensure columns exist on fiscal_periods
ALTER TABLE fiscal_periods
ADD COLUMN IF NOT EXISTS evaluation_status TEXT DEFAULT 'auto';

ALTER TABLE fiscal_periods
ADD COLUMN IF NOT EXISTS auto_unlock_days INTEGER NOT NULL DEFAULT 15;

ALTER TABLE fiscal_periods
ADD COLUMN IF NOT EXISTS unlocked_staff_ids TEXT[] NOT NULL DEFAULT '{}';

-- 2. Migrate existing 'closed' values to 'auto'
UPDATE fiscal_periods
SET evaluation_status = 'auto'
WHERE evaluation_status = 'closed' OR evaluation_status IS NULL;

-- 3. Set default for new rows to 'auto'
ALTER TABLE fiscal_periods
ALTER COLUMN evaluation_status SET DEFAULT 'auto';

-- 4. Update check constraint for evaluation_status
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_fiscal_periods_evaluation_status'
  ) THEN
    ALTER TABLE fiscal_periods DROP CONSTRAINT check_fiscal_periods_evaluation_status;
  END IF;

  ALTER TABLE fiscal_periods
  ADD CONSTRAINT check_fiscal_periods_evaluation_status
  CHECK (evaluation_status IN ('auto', 'open', 'locked'));
END $$;

-- 5. Add check constraint for auto_unlock_days (1-60 days)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_fiscal_periods_auto_unlock_days'
  ) THEN
    ALTER TABLE fiscal_periods DROP CONSTRAINT check_fiscal_periods_auto_unlock_days;
  END IF;

  ALTER TABLE fiscal_periods
  ADD CONSTRAINT check_fiscal_periods_auto_unlock_days
  CHECK (auto_unlock_days >= 1 AND auto_unlock_days <= 60);
END $$;

COMMENT ON COLUMN fiscal_periods.evaluation_status IS 'โหมดการเปิดระบบประเมินผลการปฏิบัติงาน: auto (เปิดอัตโนมัติตามระยะเวลาที่กำหนด), open (ปลดล็อกทั้งหมดทันที), locked (ปิดรอบถาวร)';
COMMENT ON COLUMN fiscal_periods.auto_unlock_days IS 'จำนวนวันก่อนสิ้นรอบที่จะเปิดระบบประเมินตนเองให้อัตโนมัติ (ค่าเริ่มต้น 15 วัน)';
COMMENT ON COLUMN fiscal_periods.unlocked_staff_ids IS 'รหัสบุคลากรที่ได้รับการปลดล็อกเฉพาะบุคคล (Per-User Manual Override)';
