'use client';

/**
 * ============================================================================
 * ManStat-Modern: View School Board (คณะกรรมการสถานศึกษาขั้นพื้นฐาน)
 * ============================================================================
 * - Ground-truth Basic Education School Board Members
 * - Order strictly by statutory position (ลำดับตามกฎกระทรวง พ.ศ. 2546)
 * - School Director is ex-officio ("โดยตำแหน่ง" นับแต่วันบรรจุแต่งตั้ง 10 ม.ค. 2555)
 * - Horizontal spacious row / table layout for optimal scanning & readability
 * - Zero emojis, pure Lucide SVG icons with strict 8px gap.
 * ============================================================================
 */

import React, { useState, useMemo } from 'react';
import {
  Shield,
  Phone,
  Building,
  CheckCircle2,
  Briefcase,
  LayoutList,
  LayoutGrid,
  Search,
  Award,
  ChevronRight,
} from 'lucide-react';
import { INITIAL_BOARD_MEMBERS, BOARD_STATUTORY_ORDER } from '@/lib/data/schoolData';

export const ViewSchoolBoard: React.FC = () => {
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedMemberId((prev) => (prev === id ? null : id));
  };

  // Sort strictly by statutory hierarchy
  const sortedMembers = useMemo(() => {
    return [...INITIAL_BOARD_MEMBERS]
      .sort((a, b) => {
        const orderA = BOARD_STATUTORY_ORDER[a.position] ?? 99;
        const orderB = BOARD_STATUTORY_ORDER[b.position] ?? 99;
        return orderA - orderB;
      })
      .filter((m) => {
        if (!searchTerm.trim()) return true;
        const q = searchTerm.toLowerCase();
        return (
          m.fullName.toLowerCase().includes(q) ||
          m.positionTitle.toLowerCase().includes(q) ||
          m.organization.toLowerCase().includes(q) ||
          m.occupation.toLowerCase().includes(q)
        );
      });
  }, [searchTerm]);

  const getPositionBadgeStyle = (position: string) => {
    switch (position) {
      case 'CHAIR':
        return 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40';
      case 'DIRECTOR_SEC':
        return 'bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-500/40';
      case 'EXPERT':
        return 'bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/40';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-white dark:bg-[#141b24] p-5 sm:p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors duration-200">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-sky-500 dark:text-sky-400 shrink-0" />
            <span>คณะกรรมการสถานศึกษาขั้นพื้นฐาน โรงเรียนชุมชนบ้านตะขบ</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            เรียงลำดับตามตำแหน่งตามกฎกระทรวง พ.ศ. 2546 (รวม {INITIAL_BOARD_MEMBERS.length} ท่าน)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 shrink-0" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาชื่อ, ตำแหน่ง, องค์กร..."
              className="h-10 bg-slate-50 dark:bg-[#101822] border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-sky-500 w-52 sm:w-64 transition-all"
            />
          </div>

          {/* View Switcher */}
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
              <span>แถวตาราง</span>
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

      {/* Main Content: Table / Horizontal Row View (Recommended) */}
      {viewMode === 'table' ? (
        <div className="bg-white dark:bg-[#111823] rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm dark:shadow-xl overflow-hidden transition-colors duration-200">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-sm text-slate-700 dark:text-slate-200">
              <thead className="bg-slate-100/80 dark:bg-[#16202d] text-xs uppercase text-slate-500 dark:text-slate-400 tracking-wider font-semibold border-b border-slate-200/90 dark:border-slate-800">
                <tr>
                  <th scope="col" className="w-10 px-3 py-3.5 text-center">
                    <span className="sr-only">ขยายรายละเอียด</span>
                  </th>
                  <th scope="col" className="px-4 py-3.5 text-center w-16 min-w-[64px] shrink-0">ลำดับ</th>
                  <th scope="col" className="px-5 py-3.5 min-w-[220px]">ชื่อ - สกุล</th>
                  <th scope="col" className="px-5 py-3.5 min-w-[200px]">ตำแหน่งในคณะกรรมการ</th>
                  <th scope="col" className="px-5 py-3.5 text-center min-w-[170px]">วาระ / สถานะการดำรงตำแหน่ง</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 font-sans">
                {sortedMembers.map((member, index) => {
                  const isDirector = member.position === 'DIRECTOR_SEC';
                  const isExpanded = expandedMemberId === member.id;
                  return (
                    <React.Fragment key={member.id}>
                      <tr
                        onClick={() => toggleExpand(member.id)}
                        className={`hover:bg-slate-50 dark:hover:bg-[#182536]/60 transition-colors cursor-pointer ${
                          isExpanded ? 'bg-slate-50/90 dark:bg-[#182536]/40' : isDirector ? 'bg-sky-50/50 dark:bg-sky-950/20' : ''
                        }`}
                      >
                        {/* Expand toggle */}
                        <td className="px-3 py-3.5 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpand(member.id);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-colors"
                            aria-label={isExpanded ? 'ย่อแถว' : 'ขยายแถว'}
                          >
                            <ChevronRight
                              className={`w-4 h-4 transition-transform duration-200 ${
                                isExpanded ? 'rotate-90 text-sky-500 dark:text-sky-400' : ''
                              }`}
                            />
                          </button>
                        </td>

                        {/* Statutory Sequence Number */}
                        <td className="px-4 py-3.5 text-center font-mono font-bold text-slate-400 whitespace-nowrap">
                          {index + 1}
                        </td>

                        {/* Full Name */}
                        <td className="px-5 py-3.5">
                          <div className="font-bold text-slate-900 dark:text-white text-base truncate max-w-[240px]" title={member.fullName}>
                            {member.fullName}
                          </div>
                          {isDirector && (
                            <div className="text-xs text-sky-600 dark:text-sky-400 font-medium mt-0.5 truncate max-w-[240px]" title="ผอ.สถานศึกษา โรงเรียนชุมชนบ้านตะขบ">
                              ผอ.สถานศึกษา โรงเรียนชุมชนบ้านตะขบ
                            </div>
                          )}
                        </td>

                        {/* Position in Board */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getPositionBadgeStyle(
                              member.position
                            )}`}
                            title={member.positionTitle}
                          >
                            {member.positionTitle}
                          </span>
                        </td>

                        {/* Term & Ex-officio Status */}
                        <td className="px-5 py-3.5 text-center whitespace-nowrap">
                          {isDirector ? (
                            <span className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/15 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300 border border-sky-500/30">
                              <Award className="w-3.5 h-3.5 shrink-0" />
                              <span>โดยตำแหน่ง</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                              <span>วาระที่ {member.termNumber}</span>
                            </span>
                          )}
                        </td>
                      </tr>

                      {/* Detail Accordion Row */}
                      {isExpanded && (
                        <tr className="bg-slate-50/90 dark:bg-[#0b1016]/90 border-y border-slate-200/90 dark:border-slate-800/80">
                          <td colSpan={5} className="px-6 py-4">
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                                <div>
                                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mb-1">
                                    อาชีพ / สายงาน
                                  </div>
                                  <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-medium">
                                    <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span>{member.occupation}</span>
                                  </div>
                                </div>
                                <div>
                                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mb-1">
                                    สังกัดองค์กร / หน่วยงาน
                                  </div>
                                  <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-medium">
                                    <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span>{member.organization}</span>
                                  </div>
                                </div>
                                <div>
                                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mb-1">
                                    ช่องทางการติดต่อ
                                  </div>
                                  {member.phone && member.phone !== '-' ? (
                                    <a
                                      href={`tel:${member.phone.replace(/[^0-9]/g, '')}`}
                                      className="inline-flex items-center gap-2 font-mono text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 font-medium"
                                    >
                                      <Phone className="w-3.5 h-3.5 shrink-0" />
                                      <span>{member.phone}</span>
                                    </a>
                                  ) : (
                                    <span className="text-slate-400 dark:text-slate-500">-</span>
                                  )}
                                </div>
                                <div>
                                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mb-1">
                                    สถานะตามกฎกระทรวง พ.ศ. 2546
                                  </div>
                                  <div className="text-slate-700 dark:text-slate-300">
                                    {isDirector
                                      ? 'ดำรงตำแหน่งโดยตำแหน่งนับแต่วันบรรจุแต่งตั้ง (10 ม.ค. 2555)'
                                      : `${member.status} (วาระการดำรงตำแหน่ง 4 ปี)`}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Alternative Responsive Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedMembers.map((member, index) => {
            const isDirector = member.position === 'DIRECTOR_SEC';
            return (
              <div
                key={member.id}
                className="bg-white dark:bg-[#111823]/90 p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 hover:border-sky-500/40 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span
                      className={`inline-block px-3 py-1 rounded-xl text-xs sm:text-sm font-semibold border truncate max-w-[190px] ${getPositionBadgeStyle(
                        member.position
                      )}`}
                      title={member.positionTitle}
                    >
                      {member.positionTitle}
                    </span>
                    <span className="font-mono text-xs text-slate-400 dark:text-slate-500 font-bold">
                      #{index + 1}
                    </span>
                  </div>

                  <div className="text-base font-bold text-slate-900 dark:text-white mb-2 truncate" title={member.fullName}>
                    {member.fullName}
                  </div>

                  <div className="space-y-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-3 pt-3 border-t border-slate-200/90 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="truncate" title={`อาชีพ: ${member.occupation}`}>อาชีพ: <strong className="text-slate-800 dark:text-slate-200">{member.occupation}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="truncate" title={`สังกัด: ${member.organization}`}>สังกัด: {member.organization}</span>
                    </div>
                    {member.phone && member.phone !== '-' && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="font-mono text-slate-700 dark:text-slate-300">{member.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/90 dark:border-slate-800 text-xs sm:text-sm text-slate-500 dark:text-slate-400 flex justify-between items-center">
                  {isDirector ? (
                    <span className="text-sky-600 dark:text-sky-300 font-semibold">
                      โดยตำแหน่ง (ตั้งแต่ 10 ม.ค. 2555)
                    </span>
                  ) : (
                    <span>วาระที่ {member.termNumber} ({member.status})</span>
                  )}
                  <span className="font-mono text-slate-400 dark:text-slate-500 text-xs">{member.id}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
