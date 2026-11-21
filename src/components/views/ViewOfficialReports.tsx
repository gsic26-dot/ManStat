'use client';

/**
 * ============================================================================
 * ManStat: ViewOfficialReports (สรุปวันลาและรายงาน สพฐ. มาตรฐาน)
 * ============================================================================
 * - Official OBEC Summary Table of personnel leaves
 * - Salary promotion eligibility checks (ว15/2561)
 * - Single-click 4-sheet Excel export (.xlsx) via ExcelExportButton
 * - Filter by period: Round 1 (Oct-Mar), Round 2 (Apr-Sep), Full Year
 * - Print-Ready: Dedicated A4 Landscape Official Sheet with Zero-Overflow
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
import { INITIAL_TEACHERS, type TeacherRecord } from '@/lib/data/schoolData';
import { ExcelExportButton } from '@/components/export/ExcelExportButton';

export function ViewOfficialReports() {
  const [teachersList, setTeachersList] = useState<TeacherRecord[]>(INITIAL_TEACHERS);
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
    return () => {
      isMounted = false;
    };
  }, []);

  const departments = useMemo(
    () => Array.from(new Set(teachersList.map((t) => t.department))),
    [teachersList]
  );

  const filteredTeachers = useMemo(
    () =>
      teachersList.filter((t) => {
        const matchesSearch =
          t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.position.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesDept = deptFilter === 'ALL' || t.department === deptFilter;
        return matchesSearch && matchesDept;
      }),
    [teachersList, searchQuery, deptFilter]
  );

  const roundTitles: Record<'FULL' | 'ROUND_1' | 'ROUND_2', { title: string; subtitle: string }> = {
    FULL: {
      title: 'ทั้งปีงบประมาณ 2570',
      subtitle: '( 1 ตุลาคม 2569 – 30 กันยายน 2570 )',
    },
    ROUND_1: {
      title: 'รอบที่ 1 ปีงบประมาณ 2570',
      subtitle: '( 1 ตุลาคม 2569 – 31 มีนาคม 2570 )',
    },
    ROUND_2: {
      title: 'รอบที่ 2 ปีงบประมาณ 2570',
      subtitle: '( 1 เมษายน 2570 – 30 กันยายน 2570 )',
    },
  };

  return (
    <div className="space-y-6">
      {/* ================================================================= */}
      {/* SCREEN VIEW (Hidden during Print)                                 */}
      {/* ================================================================= */}
      <div className="space-y-6 print:hidden">
        {/* Header & Export Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#141b24] p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 text-xs font-semibold uppercase tracking-wider">
              <FileSpreadsheet className="w-4 h-4 shrink-0" />
              <span>Official Attendance & Evaluation Reports</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">สรุปวันลาและรายงาน สพฐ.</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              รายงานสถิติการมาปฏิบัติราชการเพื่อประกอบการประเมินเลื่อนขั้นเงินเดือนตาม ว15/2561
            </p>
          </div>

          {/* Action Buttons: Excel Export & Print */}
          <div className="flex items-center gap-3">
            <ExcelExportButton
              fiscalYear={2570}
            />
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium border border-transparent transition-colors duration-200"
            >
              <Printer className="w-4 h-4 shrink-0" />
              <span>พิมพ์รายงาน (A4 แนวนอน)</span>
            </button>
          </div>
        </div>

        {/* Filter Bar (Standard 40px Height) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="ค้นหาชื่อครู หรือตำแหน่ง..."
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
              <option value="FULL" className="bg-white dark:bg-[#171a21] text-slate-900 dark:text-slate-100">รอบการประเมิน: ทั้งปีงบประมาณ 2570</option>
              <option value="ROUND_1" className="bg-white dark:bg-[#171a21] text-slate-900 dark:text-slate-100">รอบที่ 1: 1 ต.ค. 2569 - 31 มี.ค. 2570</option>
              <option value="ROUND_2" className="bg-white dark:bg-[#171a21] text-slate-900 dark:text-slate-100">รอบที่ 2: 1 เม.ย. 2570 - 30 ก.ย. 2570</option>
            </select>
          </div>

          <div className="h-10 flex items-center bg-white dark:bg-[#111822] border border-slate-200/90 dark:border-slate-700/80 rounded-xl px-3 text-xs text-slate-800 dark:text-slate-200 focus-within:border-sky-500 transition-all">
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="w-full bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-white dark:bg-[#171a21] text-slate-900 dark:text-slate-100">กลุ่มสาระ / ฝ่ายงานทั้งหมด</option>
              {departments.map((d) => (
                <option key={d} value={d} className="bg-white dark:bg-[#171a21] text-slate-900 dark:text-slate-100">
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Web Summary Table */}
        <div className="bg-white dark:bg-[#111822] rounded-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="p-4 bg-slate-50 dark:bg-[#16202c] border-b border-slate-200/90 dark:border-slate-800 flex items-center justify-between">
            <div className="text-xs text-slate-700 dark:text-slate-300">
              แสดงข้อมูลบุคลากร <span className="font-bold text-slate-900 dark:text-white">{filteredTeachers.length}</span> ท่าน
            </div>
            <span className="text-[11px] text-sky-400 font-mono">
              เกณฑ์ ว15/2561: ลาไม่เกิน 6 ครั้ง หรือ 23 วันทำการ
            </span>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-100/80 dark:bg-[#131b25] text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200/90 dark:border-slate-800 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3 text-center min-w-[50px] shrink-0">ลำดับ</th>
                  <th className="px-4 py-3 min-w-[200px]">ชื่อ - นามสกุล</th>
                  <th className="px-4 py-3 min-w-[190px]">ตำแหน่ง / สังกัด</th>
                  <th className="px-4 py-3 text-center text-rose-600 dark:text-rose-400 min-w-[110px]">ลาป่วย (วัน)</th>
                  <th className="px-4 py-3 text-center text-amber-600 dark:text-amber-400 min-w-[110px]">ลากิจ (วัน)</th>
                  <th className="px-4 py-3 text-center text-emerald-600 dark:text-emerald-400 min-w-[110px]">พักผ่อน (วัน)</th>
                  <th className="px-4 py-3 text-center text-sky-600 dark:text-sky-400 font-bold min-w-[110px]">รวมวันลา</th>
                  <th className="px-4 py-3 text-center min-w-[125px]">สิทธิ์เลื่อนเงินเดือน</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/60 font-sans">
                {filteredTeachers.map((t, idx) => {
                  const total = t.sickUsed + t.personalUsed + t.vacationUsed;
                  const isEligible = total <= 23;
                  const posDisplay = t.position.replace('ผู้อำนวยการสถานศึกษา', 'ผอ.สถานศึกษา');
                  const deptDisplay = t.department.replace('สายงานบริหารและสนับสนุนการศึกษา', 'บริหารและสนับสนุนฯ');

                  return (
                    <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-[#162231]/50 transition-colors">
                      <td className="px-4 py-3 text-center font-mono text-slate-500 whitespace-nowrap">{idx + 1}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                        <div className="truncate max-w-[180px]" title={t.name}>{t.name}</div>
                        <div className="text-[10px] font-mono text-slate-500 mt-0.5 truncate max-w-[180px]" title={`รหัส: ${t.employeeCode}`}>{t.employeeCode}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-800 dark:text-slate-200">
                        <div className="truncate max-w-[180px]" title={t.position}>{posDisplay}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[180px]" title={t.department}>{deptDisplay}</div>
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-rose-600 dark:text-rose-300 font-medium whitespace-nowrap">
                        {t.sickUsed}
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-amber-600 dark:text-amber-300 font-medium whitespace-nowrap">
                        {t.personalUsed}
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-emerald-600 dark:text-emerald-300 font-medium whitespace-nowrap">
                        {t.vacationUsed}
                      </td>
                      <td className="px-4 py-3 text-center font-mono font-bold text-sky-600 dark:text-sky-400 whitespace-nowrap">
                        {total}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap min-w-[125px]">
                        {isEligible ? (
                          <span className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30 min-w-[95px]">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span>ผ่านเกณฑ์</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30 min-w-[95px]">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            <span>เกินเกณฑ์</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* PRINT-ONLY A4 LANDSCAPE OFFICIAL SUMMARY SHEET                    */}
      {/* Guarantee: Strict 1-Page A4 Landscape (No Overflow)               */}
      {/* ================================================================= */}
      <div className="hidden print:block text-black font-sarabun bg-white w-[287mm] h-[200mm] max-h-[200mm] box-border overflow-hidden mx-auto my-0">
        <style dangerouslySetInnerHTML={{ __html: `
          @page { size: landscape; margin: 4mm 5mm; }
          @media print {
            html, body {
              width: 297mm !important;
              height: 210mm !important;
              max-height: 210mm !important;
              margin: 0 !important;
              padding: 0 !important;
              overflow: hidden !important;
              background: #fff !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
        ` }} />

        <div className="flex flex-col justify-between h-full w-full">
          <div>
            {/* Header */}
            <div className="text-center mb-1 leading-tight">
              <div className="text-[14px] font-bold">โรงเรียนชุมชนบ้านตะขบ</div>
              <div className="text-[13px] font-bold">แบบสรุปวันลาข้าราชการครูและบุคลากรทางการศึกษา</div>
              <div className="text-[11.5px] font-bold text-slate-800">
                {roundTitles[roundFilter].title} {roundTitles[roundFilter].subtitle}
              </div>
            </div>

            {/* Official 15-Column Table */}
            <table className="w-full border-collapse border border-black text-center text-[9.5px] leading-tight">
              <thead>
                <tr className="bg-slate-100 font-bold">
                  <th rowSpan={2} className="border border-black p-0.5 w-[3%]">ที่</th>
                  <th rowSpan={2} className="border border-black p-0.5 w-[25%] text-left pl-1.5">ชื่อ - ชื่อสกุล</th>
                  <th colSpan={2} className="border border-black p-0.5 w-[10%]">ลาป่วย</th>
                  <th colSpan={2} className="border border-black p-0.5 w-[10%]">ลากิจ</th>
                  <th colSpan={2} className="border border-black p-0.5 w-[9%]">มาสาย</th>
                  <th colSpan={2} className="border border-black p-0.5 w-[9%]">ขาดราชการ</th>
                  <th className="border border-black p-0.5 w-[6%]">ลาศึกษา</th>
                  <th className="border border-black p-0.5 w-[6%]">ลาคลอด</th>
                  <th className="border border-black p-0.5 w-[7%]">อุปสมบท</th>
                  <th colSpan={2} className="border border-black p-0.5 w-[14%]">รวมวันลา</th>
                </tr>
                <tr className="bg-slate-100 font-bold">
                  <th className="border border-black p-0.5">ครั้ง</th>
                  <th className="border border-black p-0.5">วัน</th>
                  <th className="border border-black p-0.5">ครั้ง</th>
                  <th className="border border-black p-0.5">วัน</th>
                  <th className="border border-black p-0.5">ครั้ง</th>
                  <th className="border border-black p-0.5">วัน</th>
                  <th className="border border-black p-0.5">ครั้ง</th>
                  <th className="border border-black p-0.5">วัน</th>
                  <th className="border border-black p-0.5">วัน</th>
                  <th className="border border-black p-0.5">วัน</th>
                  <th className="border border-black p-0.5">วัน</th>
                  <th className="border border-black p-0.5">ครั้ง</th>
                  <th className="border border-black p-0.5">วัน</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-slate-200 font-bold text-left">
                  <td colSpan={15} className="border border-black px-1.5 py-0.5 text-[10px]">
                    ข้าราชการครูและบุคลากรทางการศึกษา
                  </td>
                </tr>
                {filteredTeachers.map((t, idx) => {
                  const totalDays = t.sickUsed + t.personalUsed + t.vacationUsed;
                  const totalCount = (t.sickUsed > 0 ? 1 : 0) + (t.personalUsed > 0 ? 1 : 0);

                  return (
                    <tr key={t.id} className="border-b border-black">
                      <td className="border border-black p-0.5 text-center">{idx + 1}</td>
                      <td className="border border-black p-0.5 text-left pl-1.5 font-medium whitespace-nowrap">
                        {t.name} ({t.position})
                      </td>
                      <td className="border border-black p-0.5">{t.sickUsed > 0 ? '1' : '-'}</td>
                      <td className="border border-black p-0.5">{t.sickUsed > 0 ? t.sickUsed : '-'}</td>
                      <td className="border border-black p-0.5">{t.personalUsed > 0 ? '1' : '-'}</td>
                      <td className="border border-black p-0.5">{t.personalUsed > 0 ? t.personalUsed : '-'}</td>
                      <td className="border border-black p-0.5">-</td>
                      <td className="border border-black p-0.5">-</td>
                      <td className="border border-black p-0.5">-</td>
                      <td className="border border-black p-0.5">-</td>
                      <td className="border border-black p-0.5">-</td>
                      <td className="border border-black p-0.5">-</td>
                      <td className="border border-black p-0.5">-</td>
                      <td className="border border-black p-0.5">{totalCount > 0 ? totalCount : '-'}</td>
                      <td className="border border-black p-0.5 font-bold">{totalDays > 0 ? totalDays : '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Signatures at the bottom */}
          <div className="flex justify-between items-center text-center text-[11px] leading-tight pt-1">
            <div className="w-[45%]">
              <div>ลงชื่อ............................................................ผู้สรุป</div>
              <div className="mt-0.5">(นางสาวทัชชกร ช่วยจังหรีด)</div>
              <div>หัวหน้างานกลุ่มบริหารงานบุคคล</div>
              <div>วันที่ .......... เดือน ........................ พ.ศ. 2570</div>
            </div>
            <div className="w-[45%]">
              <div>ลงชื่อ............................................................ผู้อำนวยการสถานศึกษา</div>
              <div className="mt-0.5">(นายธีรศักดิ์ มโนธรรม)</div>
              <div>ผู้อำนวยการโรงเรียนชุมชนบ้านตะขบ</div>
              <div>วันที่ .......... เดือน ........................ พ.ศ. 2570</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
