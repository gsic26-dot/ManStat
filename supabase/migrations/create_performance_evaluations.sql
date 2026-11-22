-- ============================================================================
-- Migration: Create Performance Evaluations Table & Strict RLS Policies
-- Table: performance_evaluations (แบบประเมินผลการปฏิบัติงาน ก.ค.ศ. สพฐ.)
-- ============================================================================

-- Ensure pgcrypto / uuid-ossp extension is enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. Table: performance_evaluations
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.performance_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id TEXT NOT NULL,                                       -- ID หรือ Employee Code ของผู้รับการประเมิน
    fiscal_year INTEGER NOT NULL,                                 -- ปีงบประมาณ พ.ศ. เช่น 2567, 2568
    round_number INTEGER NOT NULL CHECK (round_number IN (1, 2)), -- รอบการประเมิน: 1 (1 ต.ค. - 31 มี.ค.) หรือ 2 (1 เม.ย. - 30 ก.ย.)
    template_key TEXT NOT NULL CHECK (
        template_key IN (
            'teacher_assistant',
            'teacher_no_standing',
            'teacher_expert',
            'teacher_special_expert',
            'director_expert',
            'director_special_expert'
        )
    ),
    part1_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,            -- ข้อมูลส่วนที่ 1: ชม.สอน, วันลา, วิทยฐานะ, เงินเดือน ณ วันประเมิน
    self_scores JSONB NOT NULL DEFAULT '{}'::jsonb,               -- ผลการประเมินตนเอง: { part1: {}, part2: {}, comp2Level: 5, comp3: {} }
    supervisor_scores JSONB NOT NULL DEFAULT '{}'::jsonb,         -- ผลการประเมินของผู้บังคับบัญชา (ผอ.)
    self_total NUMERIC(5,2) DEFAULT NULL,                         -- คะแนนรวมประเมินตนเอง (เต็ม 100)
    supervisor_total NUMERIC(5,2) DEFAULT NULL,                   -- คะแนนรวมผู้บังคับบัญชา (เต็ม 100)
    rating_level TEXT CHECK (rating_level IN ('ดีเด่น', 'ดีมาก', 'ดี', 'พอใช้', 'ปรับปรุง')),
    supervisor_comment TEXT DEFAULT NULL,                         -- ความเห็นและข้อเสนอแนะของผู้บังคับบัญชา
    status TEXT NOT NULL DEFAULT 'draft' CHECK (
        status IN ('draft', 'self_submitted', 'evaluated', 'acknowledged')
    ),
    self_signed_at TIMESTAMPTZ DEFAULT NULL,                      -- วันที่ผู้รับการประเมินลงนามรับรองตนเอง
    supervisor_signed_at TIMESTAMPTZ DEFAULT NULL,                -- วันที่ผู้บังคับบัญชาลงนาม
    acknowledged_at TIMESTAMPTZ DEFAULT NULL,                     -- วันที่ผู้รับการประเมินลงนามรับทราบผล
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- บุคลากร 1 ท่าน มีแบบประเมินได้ 1 ฉบับ ต่อ 1 รอบปีงบประมาณ
    CONSTRAINT uq_performance_eval_staff_fiscal_round UNIQUE (staff_id, fiscal_year, round_number)
);

-- ----------------------------------------------------------------------------
-- 2. Indexes for Query Performance
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_perf_eval_staff_id ON public.performance_evaluations (staff_id);
CREATE INDEX IF NOT EXISTS idx_perf_eval_fiscal_round ON public.performance_evaluations (fiscal_year, round_number);
CREATE INDEX IF NOT EXISTS idx_perf_eval_status ON public.performance_evaluations (status);
CREATE INDEX IF NOT EXISTS idx_perf_eval_template ON public.performance_evaluations (template_key);

-- ----------------------------------------------------------------------------
-- 3. Automatic Updated_At Trigger
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_performance_evaluations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_perf_eval_updated_at ON public.performance_evaluations;
CREATE TRIGGER trg_perf_eval_updated_at
    BEFORE UPDATE ON public.performance_evaluations
    FOR EACH ROW
    EXECUTE FUNCTION public.set_performance_evaluations_updated_at();

-- ----------------------------------------------------------------------------
-- 4. Row Level Security (RLS) & Confidentiality Policies
-- ----------------------------------------------------------------------------
ALTER TABLE public.performance_evaluations ENABLE ROW LEVEL SECURITY;

-- Helper check if current user is an authorized evaluation administrator (Director / HR Admin / Superuser)
CREATE OR REPLACE FUNCTION public.is_eval_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        auth.jwt() ->> 'role' IN ('director', 'hr_admin', 'superuser')
        OR current_setting('request.jwt.claims', true)::jsonb ->> 'role' IN ('director', 'hr_admin', 'superuser')
        OR current_setting('request.jwt.claims', true)::jsonb -> 'user_metadata' ->> 'role' IN ('director', 'hr_admin', 'superuser')
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4.1 SELECT Policy:
-- - Staff members can ONLY view their own evaluation records
-- - Directors, HR Admins, and Superusers can view all evaluation records
DROP POLICY IF EXISTS "perf_eval_select_policy" ON public.performance_evaluations;
CREATE POLICY "perf_eval_select_policy"
    ON public.performance_evaluations
    FOR SELECT
    USING (
        public.is_eval_admin()
        OR staff_id = auth.uid()::text
        OR staff_id = (auth.jwt() ->> 'sub')::text
        OR staff_id = (auth.jwt() -> 'user_metadata' ->> 'employee_code')::text
    );

-- 4.2 INSERT Policy:
-- - Staff members can insert their own draft evaluation
-- - Evaluation Admins can insert records
DROP POLICY IF EXISTS "perf_eval_insert_policy" ON public.performance_evaluations;
CREATE POLICY "perf_eval_insert_policy"
    ON public.performance_evaluations
    FOR INSERT
    WITH CHECK (
        public.is_eval_admin()
        OR staff_id = auth.uid()::text
        OR staff_id = (auth.jwt() ->> 'sub')::text
        OR staff_id = (auth.jwt() -> 'user_metadata' ->> 'employee_code')::text
    );

-- 4.3 UPDATE Policy:
-- - Staff members can update their own self-scores only while in draft or self_submitted status
-- - Evaluation Admins can update all evaluation fields, scores, and status
DROP POLICY IF EXISTS "perf_eval_update_policy" ON public.performance_evaluations;
CREATE POLICY "perf_eval_update_policy"
    ON public.performance_evaluations
    FOR UPDATE
    USING (
        public.is_eval_admin()
        OR (
            (staff_id = auth.uid()::text
             OR staff_id = (auth.jwt() ->> 'sub')::text
             OR staff_id = (auth.jwt() -> 'user_metadata' ->> 'employee_code')::text)
            AND status IN ('draft', 'self_submitted', 'evaluated')
        )
    )
    WITH CHECK (
        public.is_eval_admin()
        OR (
            (staff_id = auth.uid()::text
             OR staff_id = (auth.jwt() ->> 'sub')::text
             OR staff_id = (auth.jwt() -> 'user_metadata' ->> 'employee_code')::text)
        )
    );

-- 4.4 DELETE Policy:
-- - Strictly restricted to Evaluation Admins (Superuser / HR Admin)
DROP POLICY IF EXISTS "perf_eval_delete_policy" ON public.performance_evaluations;
CREATE POLICY "perf_eval_delete_policy"
    ON public.performance_evaluations
    FOR DELETE
    USING (public.is_eval_admin());
