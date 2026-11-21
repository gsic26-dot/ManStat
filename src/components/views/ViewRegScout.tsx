'use client';

/**
 * ============================================================================
 * ManStat: ViewRegScout (ทะเบียนวุฒิทางการลูกเสือ)
 * ============================================================================
 * - Registry of National Scout Organization of Thailand leader qualifications
 * - Wood Badge (W.B. 2-4 Beads), B.T.C., A.T.C. courses
 * - Dual View: Spacious Table View (Default) & Responsive Cards
 * - Search by teacher name, filter by scout level & category
 * - Appointment orders and certificate numbers
 * - Zero Emojis, Pure Lucide SVG Icons, 8px Standard Spacing
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import {
  Award,
  Search,
  LayoutList,
  LayoutGrid,
  ChevronRight,
  ChevronDown,
  Compass,
} from 'lucide-react';
import { INITIAL_SCOUTS, ScoutRecord } from '@/lib/data/schoolData';
import { formatStaffName } from '@/lib/regulations/staff-formatting';

export function ViewRegScout() {
  const [scouts, setScouts] = useState<ScoutRecord[]>(INITIAL_SCOUTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    fetch('/api/admin/scout', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.success && Array.isArray(data.data)) {
          setScouts(data.data);
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#141b24] p-5 sm:p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm transition-colors duration-200">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500 dark:text-amber-400 shrink-0" />
            <span>ทะเบียนวุฒิทางลูกเสือ</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            ฐานข้อมูลวุฒิบัตรและเครื่องหมายผู้บังคับบัญชาลูกเสือ สำนักงานลูกเสือแห่งชาติ
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
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

      {/* Filter and Search */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="ค้นหาชื่อครู, วุฒิการฝึกอบรม, เลขที่วุฒิบัตร..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 bg-slate-50 dark:bg-[#111822] border border-slate-200 dark:border-slate-700/80 rounded-xl pl-10 pr-3.5 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-amber-500 transition-all"
          />
        </div>

        <div className="h-10 flex items-center bg-slate-50 dark:bg-[#111822] border border-slate-200 dark:border-slate-700/80 rounded-xl px-3 text-xs sm:text-sm text-slate-700 dark:text-slate-200 focus-within:border-amber-500 transition-all">
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="w-full bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
          >
            <option value="ALL" className="bg-white dark:bg-[#171a21] text-slate-900 dark:text-white">ระดับวุฒิทั้งหมด</option>
            {levels.map((lvl) => (
              <option key={lvl} value={lvl} className="bg-white dark:bg-[#171a21] text-slate-900 dark:text-white">
                {lvl}
              </option>
            ))}
          </select>
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
                  <th scope="col" className="w-[26%] px-4 py-3.5">ผู้ถือวุฒิลูกเสือ</th>
                  <th scope="col" className="w-[28%] px-4 py-3.5">หลักสูตร / วุฒิการฝึกอบรม</th>
                  <th scope="col" className="w-[20%] px-4 py-3.5 text-center">ระดับวุฒิ / เครื่องหมาย</th>
                  <th scope="col" className="w-[18%] px-4 py-3.5 text-center font-mono">เลขที่วุฒิบัตร</th>
                  <th scope="col" className="w-12 px-3 py-3.5 text-right">
                    <span className="sr-only">ขยายรายละเอียด</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 font-sans">
                {filteredScouts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
                        <Compass className="w-8 h-8 mb-2 opacity-40 shrink-0" />
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                          {searchQuery || levelFilter !== 'ALL'
                            ? 'ไม่พบข้อมูลวุฒิทางลูกเสือที่ตรงกับเงื่อนไข'
                            : 'ยังไม่มีข้อมูลวุฒิทางลูกเสือ'}
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                          {searchQuery || levelFilter !== 'ALL'
                            ? 'ลองเปลี่ยนคำค้นหาหรือตัวเลือกระดับวุฒิ'
                            : 'สามารถบันทึกข้อมูลวุฒิทางลูกเสือได้ที่เมนู จัดการบุคลากร ในระบบผู้ดูแลระบบ'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredScouts.map((s, index) => {
                  const posDisplay = s.position.replace('ผู้อำนวยการสถานศึกษา', 'ผอ.สถานศึกษา');
                  const isExpanded = expandedId === s.id;
                  return (
                    <React.Fragment key={s.id}>
                      <tr
                        onClick={() => toggleExpand(s.id)}
                        className={`hover:bg-slate-50 dark:hover:bg-[#182536]/60 transition-colors cursor-pointer ${
                          isExpanded ? 'bg-slate-50/90 dark:bg-[#182536]/40' : ''
                        }`}
                      >
                        {/* Sequence */}
                        <td className="w-14 px-3 py-3.5 text-center font-mono tabular-nums text-slate-400 dark:text-slate-500 text-xs whitespace-nowrap">
                          {index + 1}
                        </td>

                        {/* Name & Position */}
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-slate-900 dark:text-white text-sm" title={formatStaffName(s.teacherName)}>
                            {formatStaffName(s.teacherName)}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5" title={s.position}>
                            {posDisplay}
                          </div>
                        </td>

                        {/* Qualification Title */}
                        <td className="px-4 py-3.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium">
                          <div title={s.qualification}>
                            {s.qualification}
                          </div>
                        </td>

                        {/* Badge Level with Subtle Dot */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                            <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                              {s.badgeLevel}
                            </span>
                          </div>
                        </td>

                        {/* Certificate No */}
                        <td className="px-4 py-3.5 text-center font-mono text-xs text-sky-600 dark:text-sky-400 whitespace-nowrap">
                          {s.certificateNo}
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

                      {/* Detail Accordion Row */}
                      {isExpanded && (
                        <tr className="bg-slate-50/90 dark:bg-[#0b1016]/90 border-y border-slate-200/90 dark:border-slate-800/80">
                          <td colSpan={6} className="pl-14 pr-6 py-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                              <div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mb-1">
                                  หลักสูตรและวุฒิเต็ม
                                </div>
                                <div className="text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                                  {s.qualification}
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">ประเภท: {s.category}</div>
                              </div>

                              <div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mb-1">
                                  เลขที่วุฒิบัตร / ทะเบียน
                                </div>
                                <div className="font-mono text-sky-600 dark:text-sky-400 font-medium text-sm">
                                  {s.certificateNo}
                                </div>
                                {s.orderNumber && (
                                  <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                    อ้างอิง: {s.orderNumber}
                                  </div>
                                )}
                              </div>

                              <div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mb-1">
                                  วันที่ได้รับวุฒิบัตร
                                </div>
                                <div className="text-slate-800 dark:text-slate-200 font-mono">
                                  {new Date(s.issueDate).toLocaleDateString('th-TH', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                  })}
                                </div>
                              </div>

                              <div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mb-1">
                                  หน่วยงานที่ออกวุฒิบัตร
                                </div>
                                <div className="text-slate-700 dark:text-slate-300 font-medium">
                                  {s.issuedBy || 'สำนักงานลูกเสือแห่งชาติ'}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Responsive Grid / Cards View */
        filteredScouts.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-[#121822] rounded-2xl border border-slate-200/90 dark:border-slate-800">
            <div className="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
              <Compass className="w-8 h-8 mb-2 opacity-40 shrink-0" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                {searchQuery || levelFilter !== 'ALL'
                  ? 'ไม่พบข้อมูลวุฒิทางลูกเสือที่ตรงกับเงื่อนไข'
                  : 'ยังไม่มีข้อมูลวุฒิทางลูกเสือ'}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                {searchQuery || levelFilter !== 'ALL'
                  ? 'ลองเปลี่ยนคำค้นหาหรือตัวเลือกระดับวุฒิ'
                  : 'สามารถบันทึกข้อมูลวุฒิทางลูกเสือได้ที่เมนู จัดการบุคลากร ในระบบผู้ดูแลระบบ'}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredScouts.map((s) => (
              <div
                key={s.id}
                className="bg-white dark:bg-[#121822] p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800/80 hover:border-amber-500/40 shadow-sm dark:shadow-none transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs sm:text-sm font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                      <Award className="w-3.5 h-3.5 shrink-0" />
                      <span>{s.badgeLevel}</span>
                    </span>
                    <Compass className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
                  </div>

                  <div className="text-base font-bold text-slate-900 dark:text-white mb-0.5">{formatStaffName(s.teacherName)}</div>
                  <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-3">{s.position}</div>

                  <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium mb-3 bg-slate-50 dark:bg-[#101822] p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
                    {s.qualification}
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400 pt-3 border-t border-slate-200/90 dark:border-slate-800">
                    <div>
                      เลขที่วุฒิบัตร: <span className="font-mono text-sky-600 dark:text-sky-400 font-semibold">{s.certificateNo}</span>
                    </div>
                    <div>
                      วันที่ได้รับ: <span className="font-mono text-slate-700 dark:text-slate-300">{s.issueDate}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
