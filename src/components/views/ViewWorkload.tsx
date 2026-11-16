'use client';

/**
 * ============================================================================
 * ManStat-Modern: View Teacher Workload (ภาระงานสอนและงานที่ได้รับมอบหมาย PA)
 * ============================================================================
 * - Criteria per OPSC Guidelines ว9/2564 & ว21/2564
 * - 4 Aspects of Teacher Workload:
 *   1. Teaching Hours (ชั่วโมงสอนตามตาราง) >= 12 hrs/week
 *   2. Support Hours (งานส่งเสริมและสนับสนุนการเรียนรู้)
 *   3. School Dev Hours (งานพัฒนาคุณภาพการจัดการศึกษา)
 *   4. Policy Hours (งานตอบสนองนโยบายและจุดเน้น)
 * - Total Workload >= 20 hrs/week
 * - Zero emojis, pure Lucide SVG icons with strict 8px gap.
 * ============================================================================
 */

import React, { useState, useMemo } from 'react';
import {
  Briefcase,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  BookOpen,
  HelpCircle,
} from 'lucide-react';
import { INITIAL_TEACHERS } from '@/lib/data/schoolData';
import { evaluatePAWorkload } from '@/lib/regulations/khurusapha-and-pa';

export const ViewWorkload: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState<string>('');

  const workloadData = useMemo(() => {
    return INITIAL_TEACHERS.map((teacher, idx) => {
      const isDirector = teacher.position.includes('ผู้อำนวยการ');
      const teachingHours = isDirector ? 6 : 14 + (idx % 4);
      const supportHours = 4;
      const schoolDevHours = 3;
      const policyHours = 2;
      const totalHours = teachingHours + supportHours + schoolDevHours + policyHours;

      const evalResult = evaluatePAWorkload({
        teachingHours,
        supportHours,
        developmentHours: schoolDevHours,
        policyHours,
        isAdministrator: isDirector,
      });

      return {
        id: teacher.id,
        name: teacher.name,
        position: teacher.position,
        department: teacher.department,
        division: teacher.division,
        teachingHours,
        supportHours,
        schoolDevHours,
        policyHours,
        totalHours,
        evalResult,
      };
    });
  }, []);

  const filtered = useMemo(() => {
    return workloadData.filter((w) =>
      w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.position.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [workloadData, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel p-5 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-sky-400 shrink-0" />
            <span>ภาระงานสอนและข้อตกลงในการพัฒนางาน (PA ว9/2564 & ว21/2564)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            เกณฑ์ภาระงานขั้นต่ำ: ครูผู้สอนสอนไม่ต่ำกว่า 12 ชม./สัปดาห์ และภาระงานรวมไม่ต่ำกว่า 20 ชม./สัปดาห์
          </p>
        </div>

        <div className="relative max-w-xs">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ค้นหาชื่อครู หรือฝ่าย..."
            className="bg-[#101822] border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 w-full"
          />
        </div>
      </div>

      {/* Workload Table */}
      <div className="glass-panel p-5 rounded-xl border border-slate-800 space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#101822] text-slate-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-4 py-3 rounded-l-lg">ครูผู้สอน / บุคลากร</th>
                <th className="px-3 py-3 text-center">ชั่วโมงสอน (ชม.)<br /><span className="text-[10px] lowercase text-slate-500">&gt;= 12 ชม.</span></th>
                <th className="px-3 py-3 text-center">งานสนับสนุน<br /><span className="text-[10px] lowercase text-slate-500">ชม./สัปดาห์</span></th>
                <th className="px-3 py-3 text-center">งานพัฒนาสถานศึกษา<br /><span className="text-[10px] lowercase text-slate-500">ชม./สัปดาห์</span></th>
                <th className="px-3 py-3 text-center">งานนโยบาย/จุดเน้น<br /><span className="text-[10px] lowercase text-slate-500">ชม./สัปดาห์</span></th>
                <th className="px-3 py-3 text-center font-bold text-white">รวมภาระงาน<br /><span className="text-[10px] lowercase text-slate-400">&gt;= 20 ชม.</span></th>
                <th className="px-4 py-3 rounded-r-lg text-right">ผลประเมิน PA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filtered.map((w) => (
                <tr key={w.id} className="hover:bg-[#1a2636]/50 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="font-semibold text-white">{w.name}</div>
                    <div className="text-[11px] text-slate-400">{w.position} ({w.department})</div>
                  </td>
                  <td className="px-3 py-3.5 text-center font-mono font-semibold text-slate-100">
                    {w.teachingHours}
                  </td>
                  <td className="px-3 py-3.5 text-center font-mono text-slate-300">
                    {w.supportHours}
                  </td>
                  <td className="px-3 py-3.5 text-center font-mono text-slate-300">
                    {w.schoolDevHours}
                  </td>
                  <td className="px-3 py-3.5 text-center font-mono text-slate-300">
                    {w.policyHours}
                  </td>
                  <td className="px-3 py-3.5 text-center font-mono font-bold text-sky-300">
                    {w.totalHours}
                  </td>
                  <td className="px-4 py-3.5 text-right whitespace-nowrap">
                    {w.evalResult.isAllPassed ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3 shrink-0" />
                        <span>ผ่านเกณฑ์ PA</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>ไม่ครบเกณฑ์</span>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
