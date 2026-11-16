-- ============================================================================
-- ManStat-Modern: Seed Data (supabase/seed.sql)
-- School Settings & Official Thai Government Holidays for Fiscal Year 2570
-- ============================================================================

-- 1. SCHOOL SETTINGS
INSERT INTO public.school_settings (
    school_code,
    school_name,
    affiliation,
    director_name,
    director_position,
    current_fiscal_year,
    student_count,
    classroom_count
) VALUES (
    '1030200688',
    'โรงเรียนชุมชนบ้านตะขบ',
    'สำนักงานเขตพื้นที่การศึกษาประถมศึกษานครราชสีมา เขต 3',
    'นายธีรศักดิ์ มโนธรรม',
    'ผู้อำนวยการโรงเรียนชุมชนบ้านตะขบ',
    2570,
    94,
    8
) ON CONFLICT (school_code) DO UPDATE SET
    school_name = EXCLUDED.school_name,
    affiliation = EXCLUDED.affiliation,
    director_name = EXCLUDED.director_name,
    director_position = EXCLUDED.director_position,
    current_fiscal_year = EXCLUDED.current_fiscal_year,
    student_count = EXCLUDED.student_count,
    classroom_count = EXCLUDED.classroom_count,
    updated_at = NOW();

-- 2. OFFICIAL THAI GOVERNMENT HOLIDAYS (Fiscal Year 2570: 1 Oct 2026 - 30 Sep 2027)
INSERT INTO public.holidays (holiday_date, holiday_name, fiscal_year) VALUES
    ('2026-10-13', 'วันนวมินทรมหาราช', 2570),
    ('2026-10-23', 'วันปิยมหาราช', 2570),
    ('2026-12-05', 'วันคล้ายวันพระบรมราชสมภพ ร.9 / วันพ่อแห่งชาติ', 2570),
    ('2026-12-07', 'วันหยุดชดเชยวันคล้ายวันพระบรมราชสมภพ ร.9', 2570),
    ('2026-12-10', 'วันรัฐธรรมนูญ', 2570),
    ('2026-12-31', 'วันสิ้นปี', 2570),
    ('2027-01-01', 'วันขึ้นปีใหม่', 2570),
    ('2027-02-21', 'วันมาฆบูชา', 2570),
    ('2027-02-22', 'วันหยุดชดเชยวันมาฆบูชา', 2570),
    ('2027-04-06', 'วันพระบาทสมเด็จพระพุทธยอดฟ้าจุฬาโลกมหาราช (วันจักรี)', 2570),
    ('2027-04-13', 'วันสงกรานต์', 2570),
    ('2027-04-14', 'วันสงกรานต์', 2570),
    ('2027-04-15', 'วันสงกรานต์', 2570),
    ('2027-05-03', 'วันหยุดชดเชยวันแรงงานแห่งชาติ', 2570),
    ('2027-05-04', 'วันฉัตรมงคล', 2570),
    ('2027-05-20', 'วันวิสาขบูชา', 2570),
    ('2027-06-03', 'วันเฉลิมพระชนมพรรษาสมเด็จพระนางเจ้าฯ พระบรมราชินี', 2570),
    ('2027-07-19', 'วันอาสาฬหบูชา', 2570),
    ('2027-07-20', 'วันเข้าพรรษา', 2570),
    ('2027-07-28', 'วันเฉลิมพระชนมพรรษาพระบาทสมเด็จพระวชิรเกล้าเจ้าอยู่หัว', 2570),
    ('2027-08-12', 'วันเฉลิมพระชนมพรรษาสมเด็จพระบรมราชชนนีพันปีหลวง / วันแม่แห่งชาติ', 2570)
ON CONFLICT (holiday_date) DO UPDATE SET
    holiday_name = EXCLUDED.holiday_name,
    fiscal_year = EXCLUDED.fiscal_year;
