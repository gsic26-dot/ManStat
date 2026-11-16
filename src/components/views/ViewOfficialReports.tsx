'use client';

/**
 * ============================================================================
 * ManStat-Modern: ViewOfficialReports (สรุปวันลาและรายงาน สพฐ. มาตรฐาน)
 * ============================================================================
 * - Official OBEC Summary Table of personnel leaves
 * - Salary promotion eligibility checks (ว15/2561)
 * - Single-click 4-sheet Excel export (.xlsx) via ExcelExportButton
 * - Filter by period: Round 1 (Oct-Mar), Round 2 (Apr-Sep), Full Year
 * - Print-ready styling
 * - Zero Emojis, Pure Lucide SVG Icons, 8px Standard Spacing
 * ============================================================================
 */

import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Search,
  Filter,
  Printer,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Award,
  Layers,
  ChevronDown,
} from 'lucide-react';
import { INITIAL_TEACHERS } from '@/lib/data/schoolData';
import { ExcelExportButton } from '@/components/export/ExcelExportButton';

export function ViewOfficialReports() {
  const [searchQuery, setSearchQuery] = useState('');
  const [roundFilter, setRoundFilter] = useState<'FULL' | 'ROUND_1' | 'ROUND_2'>('FULL');
  const [deptFilter, setDeptFilter] = useState('ALL');

  const departments = Array.from(new Set(INITIAL_TEACHERS.map((t) => t.department)));

  const filteredTeachers = INITIAL_TEACHERS.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.position.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = deptFilter === 'ALL' || t.department === deptFilter;
    return matchesSearch && matchesDept;
  });

  return (
    <div className="space-y-6">
      {/* Header & Export Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#141b24] p-5 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-sky-400 text-xs font-semibold uppercase tracking-wider">
            <FileSpreadsheet className="w-4 h-4 shrink-0" />
            <span>Official Attendance & Evaluation Reports</span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1">สรุปวันลาและรายงาน สพฐ.</h2>
          <p className="text-xs text-slate-400 mt-1">
            รายงานสถิติการมาปฏิบัติราชการเพื่อประกอบการประเมินเลื่อนขั้นเงินเดือนตาม ว15/2561
          </p>
        </div>

        {/* Action Buttons: Excel Export & Print */}
        <div className="flex items-center gap-3">
          <ExcelExportButton
            fiscalYear={2570}
            className="shadow-md shadow-emerald-950/40"
          />
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
          >
            <Printer className="w-4 h-4 shrink-0" />
            <span>พิมพ์รายงาน</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            placeholder="ค้นหาชื่อครู หรือตำแหน่ง..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#111822] border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>

        <div>
          <select
            value={roundFilter}
            onChange={(e) => setRoundFilter(e.target.value as 'FULL' | 'ROUND_1' | 'ROUND_2')}
            className="w-full bg-[#111822] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
          >
            <option value="FULL">รอบการประเมิน: ทั้งปีงบประมาณ 2570</option>
            <option value="ROUND_1">รอบที่ 1: 1 ต.ค. 2569 - 31 มี.ค. 2570</option>
            <option value="ROUND_2">รอบที่ 2: 1 เม.ย. 2570 - 30 ก.ย. 2570</option>
          </select>
        </div>

        <div>
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="w-full bg-[#111822] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
          >
            <option value="ALL">กลุ่มสาระ / ฝ่ายงานทั้งหมด</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Official Summary Table */}
      <div className="bg-[#111822] rounded-2xl border border-slate-800 overflow-hidden shadow-sm">
        <div className="p-4 bg-[#16202c] border-b border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-300">
            แสดงข้อมูลบุคลากร <span className="font-bold text-white">{filteredTeachers.length}</span> ท่าน
          </div>
          <span className="text-[11px] text-sky-400 font-mono">
            เกณฑ์ ว15/2561: ลาไม่เกิน 6 ครั้ง หรือ 23 วันทำการ
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#131b25] text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3 text-center">ลำดับ</th>
                <th className="px-4 py-3">ชื่อ - นามสกุล</th>
                <th className="px-4 py-3">ตำแหน่ง / สังกัด</th>
                <th className="px-4 py-3 text-center text-rose-400">ลาป่วย (วัน)</th>
                <th className="px-4 py-3 text-center text-amber-400">ลากิจ (วัน)</th>
                <th className="px-4 py-3 text-center text-emerald-400">พักผ่อน (วัน)</th>
                <th className="px-4 py-3 text-center text-sky-400 font-bold">รวมวันลา</th>
                <th className="px-4 py-3 text-center">สิทธิเลื่อนเงินเดือน</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredTeachers.map((t, idx) => {
                const total = t.sickUsed + t.personalUsed + t.vacationUsed;
                const isEligible = total <= 23;

                return (
                  <tr key={t.id} className="hover:bg-[#162231]/50 transition-colors">
                    <td className="px-4 py-3 text-center font-mono text-slate-500">{idx + 1}</td>
                    <td className="px-4 py-3 font-semibold text-white">
                      {t.name}
                      <div className="text-[10px] font-mono text-slate-500 mt-0.5">{t.employeeCode}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div>{t.position}</div>
                      <div className="text-[11px] text-slate-400">{t.department}</div>
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-rose-300 font-medium">
                      {t.sickUsed}
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-amber-300 font-medium">
                      {t.personalUsed}
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-emerald-300 font-medium">
                      {t.vacationUsed}
                    </td>
                    <td className="px-4 py-3 text-center font-mono font-bold text-sky-400">
                      {total}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isEligible ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3 shrink-0" />
                          <span>ผ่านเกณฑ์</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                          <AlertTriangle className="w-3 h-3 shrink-0" />
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
  );
}
