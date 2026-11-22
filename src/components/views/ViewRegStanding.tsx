'use client';

/**
 * ============================================================================
 * ManStat: View Academic Standings (ทะเบียนวิทยฐานะและการเลื่อนวิทยฐานะ)
 * ============================================================================
 * - Academic Standing Tiers: ครูผู้ช่วย, ครู คศ.1, ครูชำนาญการ, ครูชำนาญการพิเศษ, ครูเชี่ยวชาญ
 * - Dual Views: Spacious Table View (Default) & Responsive Cards
 * - Promotion Orders and Effective Dates
 * - 3-Branch Hierarchy: สายบริหาร -> สายการสอน -> สายสนับสนุน
 * - Zero emojis, pure Lucide SVG icons with strict 8px gap.
 * ============================================================================
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  Award,
  Calendar,
  Medal,
  LayoutList,
  LayoutGrid,
  FileText,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { type TeacherRecord } from '@/lib/data/schoolData';
import { formatThaiDateDisplay } from '@/components/ui/ThaiDatePicker';
import { groupAndSortTeachers, getStaffBranch } from '@/lib/regulations/staff-sorting';
import { formatStaffName } from '@/lib/regulations/staff-formatting';
import { isCivilServantForSalary } from '@/lib/auth/roles';

export const ViewRegStanding: React.FC = () => {
  const [teachersList, setTeachersList] = useState<TeacherRecord[]>([]);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  // Filter strictly by civil servants: exact 12 members (Khurusapha & Civil Service Standards)
  const civilServants = useMemo(() => {
    return teachersList.filter((t) => {
      const empType = t.employment_type || (t as any).employmentType;
      if (empType) return empType === 'civil_servant';
      return isCivilServantForSalary(t);
    });
  }, [teachersList]);

  const groupedTeachers = useMemo(() => {
    return groupAndSortTeachers(civilServants);
  }, [civilServants]);

  const sortedTeachers = useMemo(() => {
    return groupedTeachers.flatMap((g) => g.members);
  }, [groupedTeachers]);

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-white dark:bg-[#141b24] p-5 sm:p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-colors duration-200">
        <div className="flex items-center gap-2.5">
          <Medal className="w-5 h-5 text-amber-500 dark:text-amber-400 shrink-0" />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                ทะเบียนวิทยฐานะ
              </h2>
              <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                เฉพาะข้าราชการครู {civilServants.length} ท่าน
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              ทะเบียนวิทยฐานะและการแต่งตั้งให้มีหรือเลื่อนวิทยฐานะตามมาตรฐานตำแหน่ง ก.ค.ศ.
            </p>
          </div>
        </div>

        <div className="flex items-center shrink-0">
          <div className="inline-flex p-1 bg-slate-100 dark:bg-[#101822] border border-slate-200/90 dark:border-slate-800/80 rounded-lg">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors duration-200 ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/30'
              }`}
            >
              <LayoutList className="w-4 h-4 shrink-0" />
              <span>ตาราง</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors duration-200 ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/30'
              }`}
            >
              <LayoutGrid className="w-4 h-4 shrink-0" />
              <span>การ์ด</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main View: Table View */}
      {viewMode === 'table' ? (
        <div className="bg-white dark:bg-[#111823] rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm dark:shadow-xl overflow-hidden transition-colors duration-200">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-sm text-slate-700 dark:text-slate-200">
              <thead className="bg-slate-100/80 dark:bg-[#16202d] text-xs uppercase text-slate-500 dark:text-slate-400 tracking-wider font-semibold border-b border-slate-200/90 dark:border-slate-800">
                <tr>
                  <th scope="col" className="w-14 px-3 py-3.5 text-center">ลำดับ</th>
                  <th scope="col" className="w-[32%] px-4 py-3.5">ชื่อ - สกุล</th>
                  <th scope="col" className="w-[28%] px-4 py-3.5">ตำแหน่ง</th>
                  <th scope="col" className="w-[26%] px-4 py-3.5 text-center">วิทยฐานะปัจจุบัน</th>
                  <th scope="col" className="w-12 px-3 py-3.5 text-right">
                    <span className="sr-only">ขยายรายละเอียด</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 font-sans">
                {sortedTeachers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                      ยังไม่มีข้อมูลทะเบียนวิทยฐานะ
                    </td>
                  </tr>
                ) : (
                  (() => {
                    let runningSeq = 0;
                    return groupedTeachers.map((group) => {
                    const isSupportGroup = group.category === 'support';
                    return (
                      <React.Fragment key={group.category}>
                        {/* Group Header */}
                        <tr className="bg-slate-50/75 dark:bg-[#15202e] border-y border-slate-200/80 dark:border-slate-800">
                          <td colSpan={5} className="px-4 py-2 font-semibold text-xs text-slate-700 dark:text-slate-300">
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-2 h-2 rounded-full shrink-0 ${
                                  isSupportGroup ? 'bg-amber-400' : 'bg-sky-400'
                                }`}
                              />
                              <span>{group.title}</span>
                            </div>
                          </td>
                        </tr>

                        {group.members.map((teacher) => {
                          runningSeq++;
                          const seq = runningSeq;
                          const isSupport = getStaffBranch(teacher) === 'support';
                          const hasStanding =
                            !isSupport &&
                            teacher.academicStanding &&
                            teacher.academicStanding !== '-' &&
                            teacher.academicStanding !== 'ไม่มีวิทยฐานะ';
                          const standingDisplay = hasStanding ? teacher.academicStanding : '-';
                          const latestOrder = teacher.standings && teacher.standings[0];
                          const posDisplay = teacher.position.replace('ผู้อำนวยการสถานศึกษา', 'ผอ.สถานศึกษา');
                          const deptDisplay = teacher.department.replace('สายงานบริหารและสนับสนุนการศึกษา', 'บริหารและสนับสนุนฯ');
                          const isExpanded = expandedId === teacher.id;

                          return (
                            <React.Fragment key={teacher.id}>
                              <tr
                                onClick={() => toggleExpand(teacher.id)}
                                className={`hover:bg-slate-50 dark:hover:bg-[#182536]/60 transition-colors cursor-pointer ${
                                  isSupport ? 'border-l-4 border-l-amber-500/60' : ''
                                } ${isExpanded ? 'bg-slate-50/90 dark:bg-[#15202e]' : ''}`}
                              >
                                {/* Sequence */}
                                <td className="w-14 px-3 py-3.5 text-center font-mono tabular-nums text-slate-400 dark:text-slate-500 text-xs whitespace-nowrap">
                                  {seq}
                                </td>

                                {/* Full Name */}
                                <td className="px-4 py-3.5">
                                  <div className="font-semibold text-slate-900 dark:text-white text-sm" title={formatStaffName(teacher)}>
                                    {formatStaffName(teacher)}
                                  </div>
                                  <div className="text-xs text-slate-400 font-mono mt-0.5">
                                    {teacher.employeeCode}
                                  </div>
                                </td>

                                {/* Position */}
                                <td className="px-4 py-3.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                                  <div title={teacher.position}>{posDisplay}</div>
                                </td>

                                {/* Standing (Clean text + subtle rank dot) */}
                                <td className="px-4 py-3.5 text-center whitespace-nowrap">
                                  {hasStanding ? (
                                    <div className="inline-flex items-center gap-1.5">
                                      <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                                      <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                                        {standingDisplay}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 dark:text-slate-500 font-mono text-xs">
                                      -
                                    </span>
                                  )}
                                </td>

                                {/* Expand Arrow */}
                                <td className="w-12 px-3 py-3.5 text-right">
                                  <ChevronDown
                                    className={`w-4 h-4 ml-auto text-slate-400 transition-transform duration-200 ${
                                      isExpanded ? 'rotate-180 text-amber-500 dark:text-amber-400' : ''
                                    }`}
                                  />
                                </td>
                              </tr>

                              {/* Expanded Detail Panel */}
                              {isExpanded && (
                                <tr className="bg-slate-50/90 dark:bg-[#0b1016]/90 border-y border-slate-200/90 dark:border-slate-800/80">
                                  <td colSpan={5} className="pl-14 pr-6 py-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                                      <div>
                                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-1 font-medium">กลุ่มสาระการเรียนรู้ / ฝ่าย</div>
                                        <div className="text-slate-800 dark:text-slate-200 font-medium">{deptDisplay}</div>
                                      </div>

                                      <div>
                                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-1 font-medium">วันบรรจุรับราชการ</div>
                                        <div className="font-mono text-slate-700 dark:text-slate-300">{formatThaiDateDisplay(teacher.startDate)}</div>
                                      </div>

                                      <div>
                                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-1 font-medium">เลขที่คำสั่งแต่งตั้งล่าสุด</div>
                                        <div className="font-mono text-amber-600 dark:text-amber-400 font-medium">
                                          {latestOrder ? latestOrder.orderNumber : '-'}
                                        </div>
                                      </div>

                                      <div>
                                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-1 font-medium">วันที่มีผลตามคำสั่ง</div>
                                        <div className="font-mono text-sky-600 dark:text-sky-400">
                                          {latestOrder ? formatThaiDateDisplay(latestOrder.effectiveDate) : '-'}
                                        </div>
                                      </div>
                                    </div>

                                    {teacher.standings && teacher.standings.length > 1 && (
                                      <div className="mt-3 pt-3 border-t border-slate-200/90 dark:border-slate-800/60 text-xs">
                                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-1.5 font-medium">
                                          ประวัติคำสั่งแต่งตั้งทั้งหมด ({teacher.standings.length} รายการ):
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                          {teacher.standings.map((ord, oIdx) => (
                                            <span
                                              key={oIdx}
                                              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-100 dark:bg-[#101822] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 text-[11px] font-mono"
                                            >
                                              <FileText className="w-3 h-3 text-amber-500 dark:text-amber-400 shrink-0" />
                                              <span>{ord.level}: {ord.orderNumber} ({formatThaiDateDisplay(ord.effectiveDate)})</span>
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </React.Fragment>
                    );
                  });
                })()
              )}
              </tbody>
            </table>
          </div>
        </div>
      ) : sortedTeachers.length === 0 ? (
        <div className="bg-white dark:bg-[#111823] p-12 rounded-2xl border border-slate-200/90 dark:border-slate-800 text-center text-slate-500">
          ยังไม่มีข้อมูลทะเบียนวิทยฐานะ
        </div>
      ) : (
        /* Grid of Standings */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedTeachers.map((teacher) => {
            const isSupport = getStaffBranch(teacher) === 'support';
            const hasStanding =
              !isSupport &&
              teacher.academicStanding &&
              teacher.academicStanding !== '-' &&
              teacher.academicStanding !== 'ไม่มีวิทยฐานะ';
            const standingDisplay = hasStanding ? teacher.academicStanding : '-';

            return (
              <div
                key={teacher.id}
                className="bg-white dark:bg-[#111823]/90 p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 hover:border-amber-500/40 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    {hasStanding ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs sm:text-sm font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                        <Medal className="w-3.5 h-3.5 shrink-0" />
                        <span>{standingDisplay}</span>
                      </span>
                    ) : (
                      <span className="inline-block px-3 py-1 rounded-xl text-xs sm:text-sm font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        ไม่มีวิทยฐานะ
                      </span>
                    )}
                    <Award className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
                  </div>

                  <div className="text-base font-bold text-slate-900 dark:text-white mb-0.5">{formatStaffName(teacher)}</div>
                  <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-3">{teacher.department}</div>

                  <div className="space-y-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 pt-3 border-t border-slate-200/90 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>วันบรรจุ: <strong className="text-slate-800 dark:text-slate-200">{formatThaiDateDisplay(teacher.startDate)}</strong></span>
                    </div>
                    {teacher.standings && teacher.standings.length > 0 && (
                      <div className="mt-2 bg-slate-50 dark:bg-[#101822] p-3 rounded-xl border border-slate-200/90 dark:border-slate-800 space-y-1.5 text-xs">
                        <span className="text-amber-700 dark:text-amber-300 font-semibold block">คำสั่งแต่งตั้งล่าสุด:</span>
                        <div className="text-slate-800 dark:text-slate-200 font-mono">คำสั่งเลขที่: {teacher.standings[0].orderNumber}</div>
                        <div className="text-slate-500 dark:text-slate-400">มีผลตั้งแต่วันที่: {formatThaiDateDisplay(teacher.standings[0].effectiveDate)}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
