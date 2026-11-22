-- ============================================================================
-- Migration 009: Hybrid Evaluation Unlock System (Auto 15-Day Window + Global + Per-User)
-- ============================================================================
-- 1. Drops old check constraint first so updating to 'auto' does not violate it
-- 2. Ensures columns evaluation_status, auto_unlock_days, and unlocked_staff_ids exist
-- 3. Migrates existing 'closed' values to 'auto'
-- 4. Re-adds new check constraints for evaluation_status and auto_unlock_days
-- ============================================================================

-- Step 1: Drop old constraint FIRST (if exists) so 'auto' values can be written
ALTER TABLE fiscal_periods
DROP CONSTRAINT IF EXISTS check_fiscal_periods_evaluation_status;

ALTER TABLE fiscal_periods
DROP CONSTRAINT IF EXISTS check_fiscal_periods_auto_unlock_days;

-- Step 2: Ensure columns exist on fiscal_periods
ALTER TABLE fiscal_periods
ADD COLUMN IF NOT EXISTS evaluation_status TEXT DEFAULT 'auto';

ALTER TABLE fiscal_periods
ADD COLUMN IF NOT EXISTS auto_unlock_days INTEGER NOT NULL DEFAULT 15;

ALTER TABLE fiscal_periods
ADD COLUMN IF NOT EXISTS unlocked_staff_ids TEXT[] NOT NULL DEFAULT '{}';

-- Step 3: Migrate existing 'closed' or null values to 'auto'
UPDATE fiscal_periods
SET evaluation_status = 'auto'
WHERE evaluation_status = 'closed' OR evaluation_status IS NULL;

-- Step 4: Set default for evaluation_status to 'auto'
ALTER TABLE fiscal_periods
ALTER COLUMN evaluation_status SET DEFAULT 'auto';

-- Step 5: Add updated check constraint for evaluation_status ('auto', 'open', 'locked')
ALTER TABLE fiscal_periods
ADD CONSTRAINT check_fiscal_periods_evaluation_status
CHECK (evaluation_status IN ('auto', 'open', 'locked'));

-- Step 6: Add check constraint for auto_unlock_days (1-60 days)
ALTER TABLE fiscal_periods
ADD CONSTRAINT check_fiscal_periods_auto_unlock_days
CHECK (auto_unlock_days >= 1 AND auto_unlock_days <= 60);

-- Step 7: Add column comments
COMMENT ON COLUMN fiscal_periods.evaluation_status IS 'โหมดการเปิดระบบประเมินผลการปฏิบัติงาน: auto (เปิดอัตโนมัติตามระยะเวลาที่กำหนด), open (ปลดล็อกทั้งหมดทันที), locked (ปิดรอบถาวร)';
COMMENT ON COLUMN fiscal_periods.auto_unlock_days IS 'จำนวนวันก่อนสิ้นรอบที่จะเปิดระบบประเมินตนเองให้อัตโนมัติ (ค่าเริ่มต้น 15 วัน)';
COMMENT ON COLUMN fiscal_periods.unlocked_staff_ids IS 'รหัสบุคลากรที่ได้รับการปลดล็อกเฉพาะบุคคล (Per-User Manual Override)';
