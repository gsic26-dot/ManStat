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

import React, { useState, useMemo } from 'react';
import { Award, Calendar, Search, Medal, LayoutList, LayoutGrid, FileText } from 'lucide-react';
import { INITIAL_TEACHERS } from '@/lib/data/schoolData';

export const ViewRegStanding: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  const standingData = useMemo(() => {
    return INITIAL_TEACHERS.map((t) => ({
      id: t.id,
      name: t.name,
      position: t.position,
      department: t.department,
      standing: t.academicStanding !== '-' ? t.academicStanding : t.position,
      startDate: t.startDate,
      orders: t.standings,
    }));
  }, []);

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
      <div className="bg-[#141b24] p-5 sm:p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <Medal className="w-5 h-5 text-amber-400 shrink-0" />
            <span>ทะเบียนวิทยฐานะข้าราชการครูและบุคลากรทางการศึกษา</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
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
              className="h-10 bg-[#101822] border border-slate-700/80 rounded-xl pl-10 pr-3.5 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 w-52 sm:w-64 transition-all"
            />
          </div>

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

      {/* Main View: Table View */}
      {viewMode === 'table' ? (
        <div className="bg-[#111823] rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-sm text-slate-200">
              <thead className="bg-[#16202d] text-xs sm:text-sm uppercase text-slate-400 tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th scope="col" className="px-4 py-3.5 text-center w-14 min-w-[56px] shrink-0">ลำดับ</th>
                  <th scope="col" className="px-5 py-3.5 min-w-[200px]">ชื่อ - สกุล</th>
                  <th scope="col" className="px-5 py-3.5 min-w-[210px]">ตำแหน่ง / กลุ่มสาระ</th>
                  <th scope="col" className="px-5 py-3.5 min-w-[190px]">วิทยฐานะปัจจุบัน</th>
                  <th scope="col" className="px-4 py-3.5 text-center min-w-[140px]">วันบรรจุรับราชการ</th>
                  <th scope="col" className="px-5 py-3.5 min-w-[200px]">คำสั่งแต่งตั้งล่าสุด</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 font-sans">
                {filtered.map((item, index) => {
                  const latestOrder = item.orders[0];
                  const posDisplay = item.position.replace('ผู้อำนวยการสถานศึกษา', 'ผอ.สถานศึกษา');
                  const deptDisplay = item.department.replace('สายงานบริหารและสนับสนุนการศึกษา', 'บริหารและสนับสนุนฯ');

                  return (
                    <tr key={item.id} className="hover:bg-[#182536]/60 transition-colors">
                      <td className="px-4 py-3.5 text-center font-mono font-bold text-slate-400 whitespace-nowrap">
                        {index + 1}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-white text-base truncate max-w-[180px]" title={item.name}>
                          {item.name}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-xs sm:text-sm text-slate-300">
                        <div className="truncate max-w-[190px]" title={item.position}>{posDisplay}</div>
                        <div className="text-slate-400 text-xs mt-0.5 truncate max-w-[190px]" title={item.department}>{deptDisplay}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-block px-3 py-1 rounded-xl text-xs sm:text-sm font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 truncate max-w-[170px]" title={item.standing}>
                          {item.standing}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center font-mono text-xs sm:text-sm text-slate-300 whitespace-nowrap">
                        {item.startDate}
                      </td>
                      <td className="px-5 py-3.5 text-xs sm:text-sm text-slate-300">
                        {latestOrder ? (
                          <div className="flex items-start gap-2">
                            <FileText className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                            <div className="min-w-0">
                              <div className="font-mono text-slate-200 font-medium truncate max-w-[170px]" title={`คำสั่งที่: ${latestOrder.orderNumber}`}>คำสั่งที่: {latestOrder.orderNumber}</div>
                              <div className="text-xs text-slate-400 truncate max-w-[170px]" title={`มีผลตั้งแต่: ${latestOrder.effectiveDate}`}>มีผลตั้งแต่: {latestOrder.effectiveDate}</div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>
                    </tr>
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
              className="bg-[#111823]/90 p-5 rounded-2xl border border-slate-800 hover:border-amber-500/40 hover:shadow-lg transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="inline-block px-3 py-1 rounded-xl text-xs sm:text-sm font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    {item.standing}
                  </span>
                  <Award className="w-4 h-4 text-amber-400 shrink-0" />
                </div>

                <div className="text-base font-bold text-white mb-0.5">{item.name}</div>
                <div className="text-xs sm:text-sm text-slate-400 mb-3">{item.department}</div>

                <div className="space-y-2 text-xs sm:text-sm text-slate-300 pt-3 border-t border-slate-800">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>วันบรรจุ: <strong className="text-slate-200">{item.startDate}</strong></span>
                  </div>
                  {item.orders.length > 0 && (
                    <div className="mt-2 bg-[#101822] p-3 rounded-xl border border-slate-800 space-y-1.5 text-xs">
                      <span className="text-amber-300 font-semibold block">คำสั่งแต่งตั้งล่าสุด:</span>
                      <div className="text-slate-200 font-mono">คำสั่งเลขที่: {item.orders[0].orderNumber}</div>
                      <div className="text-slate-400">มีผลตั้งแต่วันที่: {item.orders[0].effectiveDate}</div>
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
