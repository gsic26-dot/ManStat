'use client';

/**
 * ============================================================================
 * ManStat-Modern: ViewRegScout (ทะเบียนวุฒิทางการลูกเสือ)
 * ============================================================================
 * - Registry of National Scout Organization of Thailand leader qualifications
 * - Wood Badge (W.B. 2-4 Beads), B.T.C., A.T.C. courses
 * - Dual View: Spacious Table View (Default) & Responsive Cards
 * - Search by teacher name, filter by scout level & category
 * - Appointment orders and certificate numbers
 * - Zero Emojis, Pure Lucide SVG Icons, 8px Standard Spacing
 * ============================================================================
 */

import React, { useState } from 'react';
import {
  Award,
  Search,
  LayoutList,
  LayoutGrid,
  ChevronRight,
  Compass,
} from 'lucide-react';
import { INITIAL_SCOUTS, ScoutRecord } from '@/lib/data/schoolData';

export function ViewRegScout() {
  const [scouts] = useState<ScoutRecord[]>(INITIAL_SCOUTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const levels = Array.from(new Set(scouts.map((s) => s.badgeLevel)));

  const filteredScouts = scouts.filter((s) => {
    const matchesSearch =
      s.teacherName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.qualification.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.certificateNo.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLevel = levelFilter === 'ALL' || s.badgeLevel === levelFilter;
    return matchesSearch && matchesLevel;
  });

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#141b24] p-5 sm:p-6 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold uppercase tracking-wider">
            <Award className="w-4 h-4 shrink-0" />
            <span>Scout Leader Qualifications Registry</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-white mt-1">ทะเบียนวุฒิทางลูกเสือ</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            ฐานข้อมูลวุฒิบัตรและเครื่องหมายผู้บังคับบัญชาลูกเสือ สำนักงานลูกเสือแห่งชาติ (รวม {scouts.length} รายการ)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex p-1 bg-[#101822] border border-slate-800/80 rounded-lg">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors duration-200 ${
                viewMode === 'table'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/30'
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
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/30'
              }`}
            >
              <LayoutGrid className="w-4 h-4 shrink-0" />
              <span>การ์ด</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="ค้นหาชื่อครู, วุฒิการฝึกอบรม, เลขที่วุฒิบัตร..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 bg-[#111822] border border-slate-700/80 rounded-xl pl-10 pr-3.5 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 transition-all"
          />
        </div>

        <div className="h-10 flex items-center bg-[#111822] border border-slate-700/80 rounded-xl px-3 text-xs sm:text-sm text-slate-200 focus-within:border-amber-500 transition-all">
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="w-full bg-transparent text-slate-200 focus:outline-none cursor-pointer"
          >
            <option value="ALL" className="bg-[#171a21]">ระดับวุฒิทั้งหมด (All Levels)</option>
            {levels.map((lvl) => (
              <option key={lvl} value={lvl} className="bg-[#171a21]">
                {lvl}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main View: Table View */}
      {viewMode === 'table' ? (
        <div className="bg-[#111823] rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-sm text-slate-200">
              <thead className="bg-[#16202d] text-xs uppercase text-slate-400 tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th scope="col" className="w-10 px-3 py-3.5 text-center">
                    <span className="sr-only">ขยายรายละเอียด</span>
                  </th>
                  <th scope="col" className="px-4 py-3.5 text-center w-14 min-w-[56px] shrink-0">ลำดับ</th>
                  <th scope="col" className="px-5 py-3.5 min-w-[200px]">ผู้ถือวุฒิลูกเสือ</th>
                  <th scope="col" className="px-5 py-3.5 min-w-[140px]">ระดับวุฒิ</th>
                  <th scope="col" className="px-5 py-3.5 min-w-[240px]">หลักสูตร / วุฒิการฝึกอบรม</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 font-sans">
                {filteredScouts.map((s, index) => {
                  const posDisplay = s.position.replace('ผู้อำนวยการสถานศึกษา', 'ผอ.สถานศึกษา');
                  const isExpanded = expandedId === s.id;
                  return (
                    <React.Fragment key={s.id}>
                      <tr
                        onClick={() => toggleExpand(s.id)}
                        className={`hover:bg-[#182536]/60 transition-colors cursor-pointer ${
                          isExpanded ? 'bg-[#182536]/40' : ''
                        }`}
                      >
                        <td className="px-3 py-3.5 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpand(s.id);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
                            aria-label={isExpanded ? 'ย่อแถว' : 'ขยายแถว'}
                          >
                            <ChevronRight
                              className={`w-4 h-4 transition-transform duration-200 ${
                                isExpanded ? 'rotate-90 text-amber-400' : ''
                              }`}
                            />
                          </button>
                        </td>
                        <td className="px-4 py-3.5 text-center font-mono font-bold text-slate-400 whitespace-nowrap">
                          {index + 1}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="font-bold text-white text-sm truncate max-w-[200px]" title={s.teacherName}>{s.teacherName}</div>
                          <div className="text-xs text-slate-400 truncate max-w-[200px]" title={s.position}>{posDisplay}</div>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span
                            className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30"
                            title={s.badgeLevel}
                          >
                            <Award className="w-3.5 h-3.5 shrink-0" />
                            {s.badgeLevel}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-xs sm:text-sm text-slate-300 font-medium">
                          <div className="truncate max-w-[320px]" title={s.qualification}>
                            {s.qualification}
                          </div>
                        </td>
                      </tr>

                      {/* Detail Accordion Row */}
                      {isExpanded && (
                        <tr className="bg-[#0b1016]/90 border-y border-slate-800/80">
                          <td colSpan={5} className="px-6 py-4">
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                                <div>
                                  <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider mb-1">
                                    หลักสูตรและวุฒิเต็ม
                                  </div>
                                  <div className="text-slate-200 font-medium leading-relaxed">
                                    {s.qualification}
                                  </div>
                                  <div className="text-[11px] text-slate-400 mt-0.5">ประเภท: {s.category}</div>
                                </div>
                                <div>
                                  <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider mb-1">
                                    เลขที่วุฒิบัตร / ทะเบียน
                                  </div>
                                  <div className="font-mono text-sky-400 font-medium text-sm">
                                    {s.certificateNo}
                                  </div>
                                  {s.orderNumber && (
                                    <div className="font-mono text-[11px] text-slate-400 mt-0.5">
                                      อ้างอิง: {s.orderNumber}
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider mb-1">
                                    วันที่ได้รับวุฒิบัตร
                                  </div>
                                  <div className="text-slate-200 font-mono">
                                    {new Date(s.issueDate).toLocaleDateString('th-TH', {
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric',
                                    })}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider mb-1">
                                    หน่วยงานที่ออกวุฒิบัตร
                                  </div>
                                  <div className="text-slate-300 font-medium">
                                    {s.issuedBy}
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
        /* Scouts Grid Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredScouts.map((s) => (
            <div
              key={s.id}
              className="bg-[#111822] rounded-2xl border border-slate-800 p-5 hover:border-amber-500/40 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className="px-3 py-1 rounded-xl text-xs sm:text-sm font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    {s.badgeLevel}
                  </span>
                  <span className="text-xs font-mono text-slate-400">{s.category}</span>
                </div>

                <h3 className="font-bold text-white text-base group-hover:text-amber-300 transition-colors">
                  {s.teacherName}
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 mt-0.5">{s.position}</p>

                <div className="mt-4 p-3.5 rounded-xl bg-[#151e2b] border border-slate-800/80 space-y-2 text-xs sm:text-sm">
                  <div>
                    <span className="text-slate-400 block text-xs uppercase font-semibold">
                      หลักสูตรและวุฒิการฝึกอบรม
                    </span>
                    <p className="font-medium text-slate-200 mt-0.5">{s.qualification}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-xs">
                    <div>
                      <span className="text-slate-400 block">เลขที่วุฒิบัตร</span>
                      <span className="font-mono text-sky-400 font-medium">{s.certificateNo}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">วันที่ได้รับ</span>
                      <span className="text-slate-300">
                        {new Date(s.issueDate).toLocaleDateString('th-TH', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                <span className="truncate max-w-[200px]" title={s.issuedBy}>
                  {s.issuedBy}
                </span>
                <span className="font-mono text-xs text-slate-500">{s.orderNumber}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
