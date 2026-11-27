-- ============================================================================
-- Migration 015: Standard Thai Civil-Service HR Fields on teachers / staff
-- ============================================================================
-- Adds:
-- 1. Personal & Emergency Contact (birth_date, emergency_contact_*)
-- 2. Standard Thai Address (house_no, moo, soi_road, subdistrict, district, province, postal_code)
-- 3. Smart Khurusapha Membership (khurusapha_member_type, khurusapha_member_no)
-- 4. ก.ค.ศ. Standard Highest Qualification (education_level, program_years, degree, major, institution, grad_year)
-- Idempotent and safe to re-run. Forces PostgREST schema reload.
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'teachers'
  ) THEN
    ALTER TABLE public.teachers
      ADD COLUMN IF NOT EXISTS birth_date DATE NULL,
      ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT NULL,
      ADD COLUMN IF NOT EXISTS emergency_contact_relation TEXT NULL,
      ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT NULL,
      ADD COLUMN IF NOT EXISTS address_house_no TEXT NULL,
      ADD COLUMN IF NOT EXISTS address_moo TEXT NULL,
      ADD COLUMN IF NOT EXISTS address_soi_road TEXT NULL,
      ADD COLUMN IF NOT EXISTS address_subdistrict TEXT NULL,
      ADD COLUMN IF NOT EXISTS address_district TEXT NULL,
      ADD COLUMN IF NOT EXISTS address_province TEXT NULL,
      ADD COLUMN IF NOT EXISTS address_postal_code TEXT NULL,
      ADD COLUMN IF NOT EXISTS khurusapha_member_type TEXT NULL,
      ADD COLUMN IF NOT EXISTS khurusapha_member_no TEXT NULL,
      ADD COLUMN IF NOT EXISTS education_level TEXT NULL,
      ADD COLUMN IF NOT EXISTS education_program_years TEXT NULL,
      ADD COLUMN IF NOT EXISTS education_degree TEXT NULL,
      ADD COLUMN IF NOT EXISTS major TEXT NULL,
      ADD COLUMN IF NOT EXISTS education_institution TEXT NULL,
      ADD COLUMN IF NOT EXISTS education_grad_year TEXT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'staff'
  ) THEN
    ALTER TABLE public.staff
      ADD COLUMN IF NOT EXISTS birth_date DATE NULL,
      ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT NULL,
      ADD COLUMN IF NOT EXISTS emergency_contact_relation TEXT NULL,
      ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT NULL,
      ADD COLUMN IF NOT EXISTS address_house_no TEXT NULL,
      ADD COLUMN IF NOT EXISTS address_moo TEXT NULL,
      ADD COLUMN IF NOT EXISTS address_soi_road TEXT NULL,
      ADD COLUMN IF NOT EXISTS address_subdistrict TEXT NULL,
      ADD COLUMN IF NOT EXISTS address_district TEXT NULL,
      ADD COLUMN IF NOT EXISTS address_province TEXT NULL,
      ADD COLUMN IF NOT EXISTS address_postal_code TEXT NULL,
      ADD COLUMN IF NOT EXISTS khurusapha_member_type TEXT NULL,
      ADD COLUMN IF NOT EXISTS khurusapha_member_no TEXT NULL,
      ADD COLUMN IF NOT EXISTS education_level TEXT NULL,
      ADD COLUMN IF NOT EXISTS education_program_years TEXT NULL,
      ADD COLUMN IF NOT EXISTS education_degree TEXT NULL,
      ADD COLUMN IF NOT EXISTS major TEXT NULL,
      ADD COLUMN IF NOT EXISTS education_institution TEXT NULL,
      ADD COLUMN IF NOT EXISTS education_grad_year TEXT NULL;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
