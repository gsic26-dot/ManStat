-- ============================================================================
-- Migration 013: Add major & current_position_date to Staff / Teachers Table
-- ============================================================================
-- 1. major (TEXT NULL): วิชาเอกที่บรรจุแต่งตั้งตามมาตรฐาน ก.ค.ศ. / สพฐ.
-- 2. current_position_date (DATE NULL): วันที่ดำรงตำแหน่งปัจจุบัน (แยกจากวันบรรจุรับราชการ)
--    Used for dynamic linkage to คณะกรรมการสถานศึกษา (กรรมการและเลขานุการโดยตำแหน่ง)
-- Idempotent and safe to re-run.
-- ============================================================================

DO $$
BEGIN
  -- 1. Update public.teachers table if present
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'teachers'
  ) THEN
    ALTER TABLE public.teachers
      ADD COLUMN IF NOT EXISTS major TEXT NULL;

    ALTER TABLE public.teachers
      ADD COLUMN IF NOT EXISTS current_position_date DATE NULL;

    COMMENT ON COLUMN public.teachers.major
      IS 'วิชาเอกที่บรรจุแต่งตั้งตามมาตรฐาน ก.ค.ศ. / สพฐ.';
    COMMENT ON COLUMN public.teachers.current_position_date
      IS 'วันที่ดำรงตำแหน่งปัจจุบัน (ใช้เชื่อมโยงวันเริ่มดำรงตำแหน่งกรรมการสถานศึกษาโดยตำแหน่งของผู้อำนวยการ)';
  END IF;

  -- 2. Update public.staff table if present
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'staff'
  ) THEN
    ALTER TABLE public.staff
      ADD COLUMN IF NOT EXISTS major TEXT NULL;

    ALTER TABLE public.staff
      ADD COLUMN IF NOT EXISTS current_position_date DATE NULL;

    COMMENT ON COLUMN public.staff.major
      IS 'วิชาเอกที่บรรจุแต่งตั้งตามมาตรฐาน ก.ค.ศ. / สพฐ.';
    COMMENT ON COLUMN public.staff.current_position_date
      IS 'วันที่ดำรงตำแหน่งปัจจุบัน';
  END IF;
END $$;
