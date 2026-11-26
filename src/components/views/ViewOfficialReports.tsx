'use client';

/**
 * ============================================================================
 * ManStat: ViewOfficialReports (สรุปวันลาและรายงาน สพฐ. มาตรฐาน)
 * ============================================================================
 * - Official OBEC Summary Table of personnel leaves
 * - Strict 2-Group Hierarchy:
 *   * Group 1: ข้าราชการครูและบุคลากรทางการศึกษา (12 ท่าน)
 *     1. ผู้อำนวยการสถานศึกษา
 *     2. ครูชำนาญการพิเศษ
 *     3. ครูชำนาญการ
 *     4. ครู คศ. 1
 *     5. ครูผู้ช่วย
 *   * Group 2: ลูกจ้างชั่วคราว / สายสนับสนุน (3 ท่าน)
 *     - เจ้าหน้าที่ธุรการ, พี่เลี้ยงเด็กพิการฯ, นักการภารโรง
 * - Frequency (ครั้ง) + Duration (วัน) for legal threshold audit (ว 15/2561)
 * - Single-click Excel export (.xlsx) via ExcelExportButton
 * - Official A4 Landscape Print View (100% Pure White, Thai Numerals ๐-๙, Dynamic Signatures)
 * - Zero Emojis, Pure Lucide SVG Icons, 8px Standard Spacing
 * ============================================================================
 */

import { useState, useEffect, useMemo } from 'react';
import {
  FileSpreadsheet,
  Search,
  Printer,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { type TeacherRecord, type LeaveRequestRecord } from '@/lib/data/schoolData';
import { ExcelExportButton } from '@/components/export/ExcelExportButton';
import { getStaffBranch, groupAndSortTeachers } from '@/lib/regulations/staff-sorting';
import { getFiscalYearBE } from '@/lib/regulations/fiscal-and-retirement';
import { toThaiDigits } from '@/lib/regulations/thai-numerals';

export function ViewOfficialReports() {
  const [teachersList, setTeachersList] = useState<TeacherRecord[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestRecord[]>([]);
  const [schoolInfo, setSchoolInfo] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roundFilter, setRoundFilter] = useState<'FULL' | 'ROUND_1' | 'ROUND_2'>('FULL');
  const [deptFilter, setDeptFilter] = useState('ALL');

  useEffect(() => {
    let isMounted = true;
    fetch('/api/admin/staff', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.success && Array.isArray(data.data)) {
          setTeachersList(data.data);
        }
      })
      .catch(() => {});

    fetch('/api/admin/leave', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.success && Array.isArray(data.data)) {
          setLeaveRequests(data.data);
        }
      })
      .catch(() => {});

    fetch('/api/admin/school', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.success && data.data) {
          setSchoolInfo(data.data);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  const fiscalYearBE = Number(schoolInfo?.fiscalYear) || 2570;
  const prevFiscalYearBE = fiscalYearBE - 1;

  // Compute leave stats per teacher for the selected round (approved leaves in selected fiscal year only)
  const getTeacherLeaveStats = useMemo(() => {
    return (teacher: TeacherRecord) => {
      const id = teacher.id;
      const code = teacher.employeeCode;

      // Filter approved leave requests for this teacher in the active fiscal year
      const reqs = leaveRequests.filter((r) => {
        if (r.status !== 'approved') return false;
        const matchStaff = r.teacherId === id || r.teacherId === code || (r as any).staffId === id;
        if (!matchStaff) return false;
        if (!r.startDate) return true;
        if (getFiscalYearBE(r.startDate) !== fiscalYearBE) return false;

        const parts = r.startDate.split('-');
        const month = parts[1];
        if (roundFilter === 'ROUND_1') {
          // Round 1: Oct (10) - Mar (03)
          return ['10', '11', '12', '01', '02', '03'].includes(month);
        }
        if (roundFilter === 'ROUND_2') {
          // Round 2: Apr (04) - Sep (09)
          return ['04', '05', '06', '07', '08', '09'].includes(month);
        }
        return true;
      });

      const sickReqs = reqs.filter((r) => r.leaveType === 'sick' || r.leaveType?.includes('ป่วย') || r.leaveTypeName?.includes('ป่วย'));
      const personalReqs = reqs.filter((r) => r.leaveType === 'personal' || r.leaveType?.includes('กิจ') || r.leaveTypeName?.includes('กิจ'));
      const vacationReqs = reqs.filter((r) => r.leaveType === 'vacation' || r.leaveType?.includes('พักผ่อน') || r.leaveTypeName?.includes('พักผ่อน'));
      const ordinationReqs = reqs.filter((r) => r.leaveType === 'ordination' || r.leaveType?.includes('อุปสมบท') || r.leaveTypeName?.includes('อุปสมบท'));
      const maternityReqs = reqs.filter((r) => r.leaveType === 'maternity' || r.leaveType?.includes('คลอด') || r.leaveTypeName?.includes('คลอด'));
      const studyReqs = reqs.filter((r) => r.leaveType === 'study' || r.leaveType?.includes('ศึกษา') || r.leaveTypeName?.includes('ศึกษา'));

      const sickCount = sickReqs.length;
      const sickDays = sickReqs.reduce((sum, r) => sum + (Number(r.totalDays) || 0), 0);

      const personalCount = personalReqs.length;
      const personalDays = personalReqs.reduce((sum, r) => sum + (Number(r.totalDays) || 0), 0);

      const vacationCount = vacationReqs.length;
      const vacationDays = vacationReqs.reduce((sum, r) => sum + (Number(r.totalDays) || 0), 0);

      const ordinationDays = ordinationReqs.reduce((sum, r) => sum + (Number(r.totalDays) || 0), 0);
      const maternityDays = maternityReqs.reduce((sum, r) => sum + (Number(r.totalDays) || 0), 0);
      const studyDays = studyReqs.reduce((sum, r) => sum + (Number(r.totalDays) || 0), 0);

      // ว 15/2561 criteria counts ONLY sick + personal leaves (<= 6 times and <= 23 working days per round)
      const totalCount = sickCount + personalCount;
      const sickPersonalDays = sickDays + personalDays;
      const totalDays = sickDays + personalDays + vacationDays + ordinationDays + maternityDays + studyDays;

      const isEligible = totalCount <= 6 && sickPersonalDays <= 23;

      return {
        sickCount,
        sickDays,
        personalCount,
        personalDays,
        vacationCount,
        vacationDays,
        ordinationDays,
        maternityDays,
        studyDays,
        totalCount,
        totalDays,
        isEligible,
      };
    };
  }, [leaveRequests, roundFilter, fiscalYearBE]);

  // Strict hierarchical ordering: 12 civil servants (management + teaching) then 3 support staff
  const sortedTeachers = useMemo(() => {
    const groups = groupAndSortTeachers(teachersList);
    const civilServants = [
      ...(groups.find((g) => g.category === 'management')?.members || []),
      ...(groups.find((g) => g.category === 'teaching')?.members || []),
    ];
    const supportStaff = groups.find((g) => g.category === 'support')?.members || [];
    return { civilServants, supportStaff, all: [...civilServants, ...supportStaff] };
  }, [teachersList]);

  // Teaching departments for filter dropdown
  const departments = useMemo(() => {
    const depts = teachersList
      .filter((t) => getStaffBranch(t) !== 'support')
      .map((t) => t.department)
      .filter(Boolean);
    return Array.from(new Set(depts));
  }, [teachersList]);

  // Filtered lists per group
  const filteredCivilServants = useMemo(() => {
    return sortedTeachers.civilServants.filter((t) => {
      const matchesSearch =
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.position.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDept = deptFilter === 'ALL' || t.department === deptFilter;
      return matchesSearch && matchesDept;
    });
  }, [sortedTeachers.civilServants, searchQuery, deptFilter]);

  const filteredSupportStaff = useMemo(() => {
    return sortedTeachers.supportStaff.filter((t) => {
      const matchesSearch =
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.position.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDept = deptFilter === 'ALL';
      return matchesSearch && matchesDept;
    });
  }, [sortedTeachers.supportStaff, searchQuery, deptFilter]);

  const totalFilteredCount = filteredCivilServants.length + filteredSupportStaff.length;

  // Titles for Web View (Arabic Numerals)
  const roundTitlesWeb: Record<'FULL' | 'ROUND_1' | 'ROUND_2', { title: string; subtitle: string }> = {
    FULL: {
      title: `ทั้งปีงบประมาณ ${fiscalYearBE}`,
      subtitle: `( 1 ตุลาคม ${prevFiscalYearBE} – 30 กันยายน ${fiscalYearBE} )`,
    },
    ROUND_1: {
      title: `รอบที่ 1 ปีงบประมาณ ${fiscalYearBE}`,
      subtitle: `( 1 ตุลาคม ${prevFiscalYearBE} – 31 มีนาคม ${fiscalYearBE} )`,
    },
    ROUND_2: {
      title: `รอบที่ 2 ปีงบประมาณ ${fiscalYearBE}`,
      subtitle: `( 1 เมษายน ${fiscalYearBE} – 30 กันยายน ${fiscalYearBE} )`,
    },
  };

  // Titles for Print View (Strict Thai Numerals ๐-๙)
  const roundTitlesThai: Record<'FULL' | 'ROUND_1' | 'ROUND_2', { title: string; subtitle: string }> = {
    FULL: {
      title: toThaiDigits(`ทั้งปีงบประมาณ ${fiscalYearBE}`),
      subtitle: toThaiDigits(`( 1 ตุลาคม ${prevFiscalYearBE} – 30 กันยายน ${fiscalYearBE} )`),
    },
    ROUND_1: {
      title: toThaiDigits(`รอบที่ 1 ปีงบประมาณ ${fiscalYearBE}`),
      subtitle: toThaiDigits(`( 1 ตุลาคม ${prevFiscalYearBE} – 31 มีนาคม ${fiscalYearBE} )`),
    },
    ROUND_2: {
      title: toThaiDigits(`รอบที่ 2 ปีงบประมาณ ${fiscalYearBE}`),
      subtitle: toThaiDigits(`( 1 เมษายน ${fiscalYearBE} – 30 กันยายน ${fiscalYearBE} )`),
    },
  };

  // Dynamic names for signatures
  const schoolName = schoolInfo?.schoolName || 'โรงเรียนชุมชนบ้านตะขบ';
  const director = teachersList.find(
    (t) => getStaffBranch(t) === 'management' || t.employeeCode === 'EXE-001'
  );
  const directorName = schoolInfo?.directorName || director?.name || 'นายธีรศักดิ์ มโนธรรม';
  const directorTitle = schoolInfo?.directorPosition || director?.position || 'ผู้อำนวยการโรงเรียนชุมชนบ้านตะขบ';

  const hrHead = teachersList.find(
    (t) => t.division?.includes('บริหารงานบุคคล') || t.department?.includes('บุคคล') || t.role === 'hr_admin'
  );
  const hrHeadName = hrHead?.name || 'นางสาวทัชชกร ช่วยจังหรีด';
  const hrHeadTitle = hrHead?.division || 'หัวหน้าฝ่ายบริหารงานบุคคล';

  return (
    <div className="space-y-6">
      {/* ================================================================= */}
      {/* SCREEN VIEW (Hidden during Print)                                 */}
      {/* ================================================================= */}
      <div className="space-y-6 print:hidden">
        {/* Header & Export Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#141b24] p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border border-sky-200/60 dark:border-sky-800/60 shrink-0">
              <FileSpreadsheet className="w-5 h-5 shrink-0" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                สรุปวันลาและรายงาน สพฐ.
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {roundTitlesWeb[roundFilter].title} {roundTitlesWeb[roundFilter].subtitle}
              </p>
            </div>
          </div>

          {/* Action Buttons: Excel Export & Print */}
          <div className="flex items-center gap-2.5">
            <ExcelExportButton fiscalYear={fiscalYearBE} />
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-xs transition-colors duration-200 cursor-pointer"
              title="พิมพ์แบบสรุปวันลา A4 แนวนอน"
            >
              <Printer className="w-4 h-4 shrink-0" />
              <span>พิมพ์รายงาน A4</span>
            </button>
          </div>
        </div>

        {/* Filter Bar (Standard 40px Height) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="ค้นหาชื่อบุคลากร หรือตำแหน่ง..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 bg-white dark:bg-[#111822] border border-slate-200/90 dark:border-slate-700/80 rounded-xl pl-10 pr-3.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 transition-all"
            />
          </div>

          <div className="h-10 flex items-center bg-white dark:bg-[#111822] border border-slate-200/90 dark:border-slate-700/80 rounded-xl px-3 text-xs text-slate-800 dark:text-slate-200 focus-within:border-sky-500 transition-all">
            <select
              value={roundFilter}
              onChange={(e) => setRoundFilter(e.target.value as 'FULL' | 'ROUND_1' | 'ROUND_2')}
              className="w-full bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="FULL" className="bg-white dark:bg-[#171a21] text-slate-900 dark:text-slate-100">
                รอบการประเมิน: ทั้งปีงบประมาณ {fiscalYearBE}
              </option>
              <option value="ROUND_1" className="bg-white dark:bg-[#171a21] text-slate-900 dark:text-slate-100">
                รอบที่ 1: 1 ต.ค. {prevFiscalYearBE} – 31 มี.ค. {fiscalYearBE}
              </option>
              <option value="ROUND_2" className="bg-white dark:bg-[#171a21] text-slate-900 dark:text-slate-100">
                รอบที่ 2: 1 เม.ย. {fiscalYearBE} – 30 ก.ย. {fiscalYearBE}
              </option>
            </select>
          </div>

          <div className="h-10 flex items-center bg-white dark:bg-[#111822] border border-slate-200/90 dark:border-slate-700/80 rounded-xl px-3 text-xs text-slate-800 dark:text-slate-200 focus-within:border-sky-500 transition-all">
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="w-full bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-white dark:bg-[#171a21] text-slate-900 dark:text-slate-100">
                กลุ่มสาระ / ฝ่ายงานทั้งหมด
              </option>
              {departments.map((d) => (
                <option key={d} value={d} className="bg-white dark:bg-[#171a21] text-slate-900 dark:text-slate-100">
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Web Summary Table */}
        <div className="bg-white dark:bg-[#111822] rounded-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="p-3.5 sm:p-4 bg-slate-50 dark:bg-[#16202c] border-b border-slate-200/90 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
            <div className="text-xs text-slate-700 dark:text-slate-300">
              แสดงข้อมูลบุคลากร <span className="font-bold text-slate-900 dark:text-white font-mono">{totalFilteredCount}</span> ท่าน
              <span className="text-slate-400 ml-1">
                (ข้าราชการครู {filteredCivilServants.length} · สนับสนุน {filteredSupportStaff.length})
              </span>
            </div>
            <span className="text-[11px] text-sky-600 dark:text-sky-400 font-mono">
              เกณฑ์ ว 15/2561: ลาไม่เกิน 6 ครั้ง หรือ 23 วันทำการต่อรอบ
            </span>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-100/80 dark:bg-[#131b25] text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200/90 dark:border-slate-800 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3 text-center min-w-[50px] shrink-0">ลำดับ</th>
                  <th className="px-4 py-3 min-w-[240px]">ชื่อ - นามสกุล</th>
                  <th className="px-4 py-3 min-w-[200px]">ตำแหน่ง / กลุ่มสาระ</th>
                  <th className="px-4 py-3 text-center text-rose-600 dark:text-rose-400 min-w-[125px]">ลาป่วย (ครั้ง / วัน)</th>
                  <th className="px-4 py-3 text-center text-amber-600 dark:text-amber-400 min-w-[125px]">ลากิจ (ครั้ง / วัน)</th>
                  <th className="px-4 py-3 text-center text-emerald-600 dark:text-emerald-400 min-w-[90px]">พักผ่อน (วัน)</th>
                  <th className="px-4 py-3 text-center text-sky-600 dark:text-sky-400 font-bold min-w-[130px]">รวมวันลา (ครั้ง / วัน)</th>
                  <th className="px-4 py-3 text-center min-w-[125px]">สิทธิ์เลื่อนเงินเดือน</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/60 font-sans">
                {totalFilteredCount === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                      ไม่พบข้อมูลบุคลากรในรอบการประเมินนี้
                    </td>
                  </tr>
                ) : (
                  <>
                    {/* Group 1 Header: ข้าราชการครูและบุคลากรทางการศึกษา */}
                    {filteredCivilServants.length > 0 && (
                      <tr className="bg-slate-100/60 dark:bg-slate-800/50">
                        <td colSpan={8} className="px-4 py-2 font-bold text-slate-800 dark:text-slate-200 text-xs">
                          1. ข้าราชการครูและบุคลากรทางการศึกษา ({filteredCivilServants.length} ท่าน)
                        </td>
                      </tr>
                    )}
                    {filteredCivilServants.map((t, idx) => {
                      const stats = getTeacherLeaveStats(t);
                      return (
                        <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-[#162231]/50 transition-colors">
                          <td className="px-4 py-3 text-center font-mono text-slate-500 whitespace-nowrap">
                            {idx + 1}
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                            <div>{t.name}</div>
                            <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500 font-normal mt-0.5">
                              {t.employeeCode}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-800 dark:text-slate-200 whitespace-nowrap">
                            <div>{t.position}</div>
                            <div className="text-[11px] text-slate-400 dark:text-slate-500 font-normal">
                              {t.department || 'สายงานบริหารและสนับสนุนการศึกษา'}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center font-mono text-rose-600 dark:text-rose-400 font-medium whitespace-nowrap">
                            {stats.sickCount} ครั้ง / {stats.sickDays} วัน
                          </td>
                          <td className="px-4 py-3 text-center font-mono text-amber-600 dark:text-amber-400 font-medium whitespace-nowrap">
                            {stats.personalCount} ครั้ง / {stats.personalDays} วัน
                          </td>
                          <td className="px-4 py-3 text-center font-mono text-emerald-600 dark:text-emerald-400 font-medium whitespace-nowrap">
                            {stats.vacationDays} วัน
                          </td>
                          <td className="px-4 py-3 text-center font-mono font-bold text-sky-600 dark:text-sky-400 whitespace-nowrap">
                            {stats.totalCount} ครั้ง / {stats.totalDays} วัน
                          </td>
                          <td className="px-4 py-3 text-center whitespace-nowrap min-w-[125px]">
                            {stats.isEligible ? (
                              <span className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30 min-w-[95px]">
                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                <span>ผ่านเกณฑ์</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30 min-w-[95px]">
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                <span>เกินเกณฑ์</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}

                    {/* Group 2 Header: ลูกจ้างชั่วคราว / สายสนับสนุน */}
                    {filteredSupportStaff.length > 0 && (
                      <tr className="bg-slate-100/60 dark:bg-slate-800/50">
                        <td colSpan={8} className="px-4 py-2 font-bold text-slate-800 dark:text-slate-200 text-xs">
                          2. ลูกจ้างชั่วคราว / บุคลากรสายสนับสนุน ({filteredSupportStaff.length} ท่าน)
                        </td>
                      </tr>
                    )}
                    {filteredSupportStaff.map((t, idx) => {
                      const stats = getTeacherLeaveStats(t);
                      return (
                        <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-[#162231]/50 transition-colors">
                          <td className="px-4 py-3 text-center font-mono text-slate-500 whitespace-nowrap">
                            {filteredCivilServants.length + idx + 1}
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                            <div>{t.name}</div>
                            <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500 font-normal mt-0.5">
                              {t.employeeCode}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-800 dark:text-slate-200 whitespace-nowrap">
                            <div>{t.position}</div>
                            <div className="text-[11px] text-slate-400 dark:text-slate-500 font-normal">
                              สายสนับสนุน
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center font-mono text-rose-600 dark:text-rose-400 font-medium whitespace-nowrap">
                            {stats.sickCount} ครั้ง / {stats.sickDays} วัน
                          </td>
                          <td className="px-4 py-3 text-center font-mono text-amber-600 dark:text-amber-400 font-medium whitespace-nowrap">
                            {stats.personalCount} ครั้ง / {stats.personalDays} วัน
                          </td>
                          <td className="px-4 py-3 text-center font-mono text-emerald-600 dark:text-emerald-400 font-medium whitespace-nowrap">
                            {stats.vacationDays} วัน
                          </td>
                          <td className="px-4 py-3 text-center font-mono font-bold text-sky-600 dark:text-sky-400 whitespace-nowrap">
                            {stats.totalCount} ครั้ง / {stats.totalDays} วัน
                          </td>
                          <td className="px-4 py-3 text-center whitespace-nowrap min-w-[125px] text-slate-400 dark:text-slate-500 font-mono">
                            -
                          </td>
                        </tr>
                      );
                    })}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* PRINT-ONLY A4 LANDSCAPE OFFICIAL SUMMARY SHEET                    */}
      {/* Guarantee: Strict 1-Page A4 Landscape (100% Pure White Canvas)    */}
      {/* ================================================================= */}
      <div
        id="print-leave-summary"
        className="hidden print:block text-black font-sarabun bg-white w-full mx-auto my-0"
      >
        <style
          dangerouslySetInnerHTML={{
            __html: `
          @page {
            size: A4 landscape;
            margin: 14mm 16mm 14mm 16mm;
          }
          @media print {
            *, *::before, *::after {
              box-shadow: none !important;
              text-shadow: none !important;
            }
            html, body {
              background: #ffffff !important;
              background-color: #ffffff !important;
              color: #000000 !important;
              width: 100% !important;
              height: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              overflow: visible !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .print\\:hidden, nav, header, aside {
              display: none !important;
            }
            #print-leave-summary {
              display: block !important;
              background: #ffffff !important;
              background-color: #ffffff !important;
              color: #000000 !important;
              width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              font-family: 'Sarabun', 'TH Sarabun New', sans-serif !important;
            }
          }
        `,
          }}
        />

        <div className="flex flex-col justify-between w-full">
          <div>
            {/* Document Header (Thai Numerals) */}
            <div className="text-center mb-2 leading-tight">
              <div className="text-[14pt] font-bold text-black">{schoolName}</div>
              <div className="text-[12pt] font-bold text-black">แบบสรุปวันลาข้าราชการครูและบุคลากรทางการศึกษา</div>
              <div className="text-[10pt] font-medium text-black">
                {roundTitlesThai[roundFilter].title} {roundTitlesThai[roundFilter].subtitle}
              </div>
            </div>

            {/* Official 15-Column Table */}
            <table className="w-full border-collapse border border-black text-center text-[9.5pt] leading-tight text-black">
              <thead>
                <tr className="bg-gray-100 font-bold">
                  <th rowSpan={2} className="border border-black py-1 px-0.5 w-[3%]">ที่</th>
                  <th rowSpan={2} className="border border-black py-1 px-1.5 w-[25%] text-left">ชื่อ - ชื่อสกุล</th>
                  <th colSpan={2} className="border border-black py-1 px-0.5 w-[10%]">ลาป่วย</th>
                  <th colSpan={2} className="border border-black py-1 px-0.5 w-[10%]">ลากิจ</th>
                  <th colSpan={2} className="border border-black py-1 px-0.5 w-[9%]">มาสาย</th>
                  <th colSpan={2} className="border border-black py-1 px-0.5 w-[9%]">ขาดราชการ</th>
                  <th className="border border-black py-1 px-0.5 w-[6%]">ลาศึกษา</th>
                  <th className="border border-black py-1 px-0.5 w-[6%]">ลาคลอด</th>
                  <th className="border border-black py-1 px-0.5 w-[7%]">อุปสมบท</th>
                  <th colSpan={2} className="border border-black py-1 px-0.5 w-[14%]">รวมวันลา</th>
                </tr>
                <tr className="bg-gray-100 font-bold text-[9pt]">
                  <th className="border border-black py-0.5 px-0.5">ครั้ง</th>
                  <th className="border border-black py-0.5 px-0.5">วัน</th>
                  <th className="border border-black py-0.5 px-0.5">ครั้ง</th>
                  <th className="border border-black py-0.5 px-0.5">วัน</th>
                  <th className="border border-black py-0.5 px-0.5">ครั้ง</th>
                  <th className="border border-black py-0.5 px-0.5">วัน</th>
                  <th className="border border-black py-0.5 px-0.5">ครั้ง</th>
                  <th className="border border-black py-0.5 px-0.5">วัน</th>
                  <th className="border border-black py-0.5 px-0.5">วัน</th>
                  <th className="border border-black py-0.5 px-0.5">วัน</th>
                  <th className="border border-black py-0.5 px-0.5">วัน</th>
                  <th className="border border-black py-0.5 px-0.5">ครั้ง</th>
                  <th className="border border-black py-0.5 px-0.5">วัน</th>
                </tr>
              </thead>
              <tbody>
                {/* Section 1: ข้าราชการครูและบุคลากรทางการศึกษา */}
                <tr className="bg-gray-100 font-bold text-left">
                  <td colSpan={15} className="border border-black px-2 py-0.5 text-[10pt]">
                    ๑. ข้าราชการครูและบุคลากรทางการศึกษา
                  </td>
                </tr>
                {sortedTeachers.civilServants.map((t, idx) => {
                  const stats = getTeacherLeaveStats(t);
                  return (
                    <tr key={t.id} className="border-b border-black">
                      <td className="border border-black py-0.5 px-0.5 text-center font-normal">{toThaiDigits(idx + 1)}</td>
                      <td className="border border-black py-0.5 px-1.5 text-left font-medium whitespace-nowrap">
                        {t.name} ({t.position})
                      </td>
                      <td className="border border-black py-0.5 px-0.5">{stats.sickCount > 0 ? toThaiDigits(stats.sickCount) : '-'}</td>
                      <td className="border border-black py-0.5 px-0.5">{stats.sickDays > 0 ? toThaiDigits(stats.sickDays) : '-'}</td>
                      <td className="border border-black py-0.5 px-0.5">{stats.personalCount > 0 ? toThaiDigits(stats.personalCount) : '-'}</td>
                      <td className="border border-black py-0.5 px-0.5">{stats.personalDays > 0 ? toThaiDigits(stats.personalDays) : '-'}</td>
                      <td className="border border-black py-0.5 px-0.5">-</td>
                      <td className="border border-black py-0.5 px-0.5">-</td>
                      <td className="border border-black py-0.5 px-0.5">-</td>
                      <td className="border border-black py-0.5 px-0.5">-</td>
                      <td className="border border-black py-0.5 px-0.5">{stats.studyDays > 0 ? toThaiDigits(stats.studyDays) : '-'}</td>
                      <td className="border border-black py-0.5 px-0.5">{stats.maternityDays > 0 ? toThaiDigits(stats.maternityDays) : '-'}</td>
                      <td className="border border-black py-0.5 px-0.5">{stats.ordinationDays > 0 ? toThaiDigits(stats.ordinationDays) : '-'}</td>
                      <td className="border border-black py-0.5 px-0.5">{stats.totalCount > 0 ? toThaiDigits(stats.totalCount) : '-'}</td>
                      <td className="border border-black py-0.5 px-0.5 font-bold">{stats.totalDays > 0 ? toThaiDigits(stats.totalDays) : '-'}</td>
                    </tr>
                  );
                })}

                {/* Section 2: ลูกจ้างชั่วคราว / บุคลากรสายสนับสนุน */}
                <tr className="bg-gray-100 font-bold text-left">
                  <td colSpan={15} className="border border-black px-2 py-0.5 text-[10pt]">
                    ๒. ลูกจ้างชั่วคราว / บุคลากรสายสนับสนุน
                  </td>
                </tr>
                {sortedTeachers.supportStaff.map((t, idx) => {
                  const stats = getTeacherLeaveStats(t);
                  return (
                    <tr key={t.id} className="border-b border-black">
                      <td className="border border-black py-0.5 px-0.5 text-center font-normal">
                        {toThaiDigits(sortedTeachers.civilServants.length + idx + 1)}
                      </td>
                      <td className="border border-black py-0.5 px-1.5 text-left font-medium whitespace-nowrap">
                        {t.name} ({t.position})
                      </td>
                      <td className="border border-black py-0.5 px-0.5">{stats.sickCount > 0 ? toThaiDigits(stats.sickCount) : '-'}</td>
                      <td className="border border-black py-0.5 px-0.5">{stats.sickDays > 0 ? toThaiDigits(stats.sickDays) : '-'}</td>
                      <td className="border border-black py-0.5 px-0.5">{stats.personalCount > 0 ? toThaiDigits(stats.personalCount) : '-'}</td>
                      <td className="border border-black py-0.5 px-0.5">{stats.personalDays > 0 ? toThaiDigits(stats.personalDays) : '-'}</td>
                      <td className="border border-black py-0.5 px-0.5">-</td>
                      <td className="border border-black py-0.5 px-0.5">-</td>
                      <td className="border border-black py-0.5 px-0.5">-</td>
                      <td className="border border-black py-0.5 px-0.5">-</td>
                      <td className="border border-black py-0.5 px-0.5">{stats.studyDays > 0 ? toThaiDigits(stats.studyDays) : '-'}</td>
                      <td className="border border-black py-0.5 px-0.5">{stats.maternityDays > 0 ? toThaiDigits(stats.maternityDays) : '-'}</td>
                      <td className="border border-black py-0.5 px-0.5">{stats.ordinationDays > 0 ? toThaiDigits(stats.ordinationDays) : '-'}</td>
                      <td className="border border-black py-0.5 px-0.5">{stats.totalCount > 0 ? toThaiDigits(stats.totalCount) : '-'}</td>
                      <td className="border border-black py-0.5 px-0.5 font-bold">{stats.totalDays > 0 ? toThaiDigits(stats.totalDays) : '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Dynamic Signatures with mt-6 and Proper Breathing Room */}
          <div className="flex justify-between items-start text-center text-[10.5pt] leading-relaxed mt-6 pb-2 text-black">
            <div className="w-[45%]">
              <div>ลงชื่อ............................................................ผู้สรุป</div>
              <div className="mt-1 font-semibold">({hrHeadName})</div>
              <div className="mt-0.5">{hrHeadTitle}</div>
              <div className="mt-1">วันที่ .......... เดือน ........................ พ.ศ. {toThaiDigits(fiscalYearBE)}</div>
            </div>
            <div className="w-[45%]">
              <div>ลงชื่อ............................................................ผู้อำนวยการสถานศึกษา</div>
              <div className="mt-1 font-semibold">({directorName})</div>
              <div className="mt-0.5">{directorTitle}</div>
              <div className="mt-1">วันที่ .......... เดือน ........................ พ.ศ. {toThaiDigits(fiscalYearBE)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
