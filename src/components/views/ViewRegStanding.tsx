'use client';

/**
 * ============================================================================
 * ManStat-Modern: View Academic Standings (ทะเบียนวิทยฐานะและการเลื่อนวิทยฐานะ)
 * ============================================================================
 * - Academic Standing Tiers: ครูผู้ช่วย, ครู คศ.1, ครูชำนาญการ, ครูชำนาญการพิเศษ, ครูเชี่ยวชาญ
 * - Dual Views: Spacious Table View (Default) & Responsive Cards
 * - Promotion Orders and Effective Dates
 * - Zero emojis, pure Lucide SVG icons with strict 8px gap.
 * ============================================================================
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Award, Calendar, Search, Medal, LayoutList, LayoutGrid, FileText, ChevronRight } from 'lucide-react';
import { INITIAL_TEACHERS, type TeacherRecord } from '@/lib/data/schoolData';

export const ViewRegStanding: React.FC = () => {
  const [teachersList, setTeachersList] = useState<TeacherRecord[]>(INITIAL_TEACHERS);
  const [searchTerm, setSearchTerm] = useState<string>('');
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

  const standingData = useMemo(() => {
    return teachersList.map((t) => ({
      id: t.id,
      name: t.name,
      position: t.position,
      department: t.department,
      standing: t.academicStanding !== '-' ? t.academicStanding : t.position,
      startDate: t.startDate,
      orders: t.standings,
    }));
  }, [teachersList]);

  const filtered = useMemo(() => {
    return standingData.filter(
      (s) =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.standing.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.department.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [standingData, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-white dark:bg-[#141b24] p-5 sm:p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors duration-200">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Medal className="w-5 h-5 text-amber-500 dark:text-amber-400 shrink-0" />
            <span>ทะเบียนวิทยฐานะข้าราชการครูและบุคลากรทางการศึกษา</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            ข้อมูลวิทยฐานะและคำสั่งแต่งตั้งตาม พ.ร.บ. ระเบียบข้าราชการครูและบุคลากรทางการศึกษา พ.ศ. 2547
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 shrink-0" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาชื่อ หรือวิทยฐานะ..."
              className="h-10 bg-slate-50 dark:bg-[#101822] border border-slate-200 dark:border-slate-700/80 rounded-xl pl-10 pr-3.5 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-amber-500 w-52 sm:w-64 transition-all"
            />
          </div>

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
          <div className="w-full">
            <table className="w-full text-left text-sm text-slate-700 dark:text-slate-200">
              <thead className="bg-slate-100/80 dark:bg-[#16202d] text-xs uppercase text-slate-500 dark:text-slate-400 tracking-wider font-semibold border-b border-slate-200/90 dark:border-slate-800">
                <tr>
                  <th scope="col" className="w-10 px-3 py-3.5 text-center"></th>
                  <th scope="col" className="px-3 py-3.5 text-center w-12 font-mono shrink-0">ลำดับ</th>
                  <th scope="col" className="px-4 py-3.5">ชื่อ - สกุล</th>
                  <th scope="col" className="px-4 py-3.5">ตำแหน่ง</th>
                  <th scope="col" className="px-4 py-3.5 text-center min-w-[130px]">วิทยฐานะปัจจุบัน</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 font-sans">
                {filtered.map((item, index) => {
                  const latestOrder = item.orders[0];
                  const posDisplay = item.position.replace('ผู้อำนวยการสถานศึกษา', 'ผอ.สถานศึกษา');
                  const deptDisplay = item.department.replace('สายงานบริหารและสนับสนุนการศึกษา', 'บริหารและสนับสนุนฯ');
                  const isExpanded = expandedId === item.id;

                  return (
                    <React.Fragment key={item.id}>
                      <tr
                        onClick={() => toggleExpand(item.id)}
                        className={`hover:bg-slate-50 dark:hover:bg-[#182536]/60 transition-colors cursor-pointer ${
                          isExpanded ? 'bg-slate-50/90 dark:bg-[#15202e]' : ''
                        }`}
                      >
                        {/* Expand Button */}
                        <td className="w-10 px-3 py-3.5 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpand(item.id);
                            }}
                            className="p-1 rounded-md text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/50 transition-colors duration-200"
                            title={isExpanded ? 'ย่อรายละเอียด' : 'ดูรายละเอียดเพิ่มเติม'}
                          >
                            <ChevronRight
                              className={`w-4 h-4 transition-transform duration-200 ${
                                isExpanded ? 'rotate-90 text-sky-500 dark:text-sky-400' : ''
                              }`}
                            />
                          </button>
                        </td>

                        {/* Sequence */}
                        <td className="px-3 py-3.5 text-center font-mono font-bold text-slate-400 whitespace-nowrap">
                          {index + 1}
                        </td>

                        {/* Full Name */}
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-slate-900 dark:text-white text-base truncate max-w-[200px]" title={item.name}>
                            {item.name}
                          </div>
                        </td>

                        {/* Position */}
                        <td className="px-4 py-3.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                          <div className="truncate max-w-[200px]" title={item.position}>{posDisplay}</div>
                        </td>

                        {/* Standing Badge (Strictly zero-wrap) */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          <span
                            className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 px-2.5 py-0.5 text-xs font-medium rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                            title={item.standing}
                          >
                            <Medal className="w-3.5 h-3.5 shrink-0" />
                            <span>{item.standing}</span>
                          </span>
                        </td>
                      </tr>

                      {/* Expanded Detail Panel */}
                      {isExpanded && (
                        <tr className="bg-slate-50/90 dark:bg-[#0b1016]/90 border-y border-slate-200/90 dark:border-slate-800/80">
                          <td colSpan={5} className="px-6 py-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                              <div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-1 font-medium">กลุ่มสาระการเรียนรู้ / ฝ่าย</div>
                                <div className="text-slate-800 dark:text-slate-200 font-medium">{deptDisplay}</div>
                              </div>

                              <div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-1 font-medium">วันบรรจุรับราชการ</div>
                                <div className="font-mono text-slate-700 dark:text-slate-300">{item.startDate}</div>
                              </div>

                              <div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-1 font-medium">เลขที่คำสั่งแต่งตั้งล่าสุด</div>
                                <div className="font-mono text-amber-600 dark:text-amber-300 font-medium">
                                  {latestOrder ? latestOrder.orderNumber : 'ไม่มีข้อมูลคำสั่ง'}
                                </div>
                              </div>

                              <div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-1 font-medium">วันที่มีผลตามคำสั่ง</div>
                                <div className="font-mono text-sky-600 dark:text-sky-400">
                                  {latestOrder ? latestOrder.effectiveDate : '-'}
                                </div>
                              </div>
                            </div>

                            {item.orders.length > 1 && (
                              <div className="mt-3 pt-3 border-t border-slate-200/90 dark:border-slate-800/60 text-xs">
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-1.5 font-medium">
                                  ประวัติคำสั่งแต่งตั้งทั้งหมด ({item.orders.length} รายการ):
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {item.orders.map((ord, oIdx) => (
                                    <span
                                      key={oIdx}
                                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-100 dark:bg-[#101822] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 text-[11px] font-mono"
                                    >
                                      <FileText className="w-3 h-3 text-amber-500 dark:text-amber-400 shrink-0" />
                                      <span>{ord.level}: {ord.orderNumber} ({ord.effectiveDate})</span>
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
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Grid of Standings */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-[#111823]/90 p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 hover:border-amber-500/40 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="inline-block px-3 py-1 rounded-xl text-xs sm:text-sm font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                    {item.standing}
                  </span>
                  <Award className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
                </div>

                <div className="text-base font-bold text-slate-900 dark:text-white mb-0.5">{item.name}</div>
                <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-3">{item.department}</div>

                <div className="space-y-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 pt-3 border-t border-slate-200/90 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>วันบรรจุ: <strong className="text-slate-800 dark:text-slate-200">{item.startDate}</strong></span>
                  </div>
                  {item.orders.length > 0 && (
                    <div className="mt-2 bg-slate-50 dark:bg-[#101822] p-3 rounded-xl border border-slate-200/90 dark:border-slate-800 space-y-1.5 text-xs">
                      <span className="text-amber-700 dark:text-amber-300 font-semibold block">คำสั่งแต่งตั้งล่าสุด:</span>
                      <div className="text-slate-800 dark:text-slate-200 font-mono">คำสั่งเลขที่: {item.orders[0].orderNumber}</div>
                      <div className="text-slate-500 dark:text-slate-400">มีผลตั้งแต่วันที่: {item.orders[0].effectiveDate}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
