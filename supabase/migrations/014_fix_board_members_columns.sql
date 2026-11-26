-- ============================================================================
-- Migration 014: Ensure all required columns exist on public.board_members
-- ============================================================================
-- Fixes PostgREST schema cache error:
-- "Could not find the 'appointment_date' column of 'board_members' in the schema cache"
-- Safe, idempotent, and forces PostgREST to reload its schema cache.
-- ============================================================================

ALTER TABLE public.board_members
  ADD COLUMN IF NOT EXISTS appointment_date DATE NULL,
  ADD COLUMN IF NOT EXISTS start_date DATE NULL,
  ADD COLUMN IF NOT EXISTS end_date DATE NULL,
  ADD COLUMN IF NOT EXISTS end_reason TEXT NULL,
  ADD COLUMN IF NOT EXISTS is_ex_officio BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS position_title TEXT NULL,
  ADD COLUMN IF NOT EXISTS term_number INTEGER NOT NULL DEFAULT 1;

COMMENT ON COLUMN public.board_members.appointment_date
  IS 'วันเริ่มดำรงตำแหน่งกรรมการสถานศึกษา (หรือวันที่มาดำรงตำแหน่ง ผอ. สำหรับกรรมการโดยตำแหน่ง)';
COMMENT ON COLUMN public.board_members.is_ex_officio
  IS 'TRUE สำหรับกรรมการและเลขานุการโดยตำแหน่ง (ผู้อำนวยการสถานศึกษา)';

NOTIFY pgrst, 'reload schema';
