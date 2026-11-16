'use client';

/**
 * ============================================================================
 * ManStat-Modern: View Academic Standings (ทะเบียนวิทยฐานะและการเลื่อนวิทยฐานะ)
 * ============================================================================
 * - Academic Standing Tiers: ครูผู้ช่วย, ครู คศ.1, ครูชำนาญการ, ครูชำนาญการพิเศษ, ครูเชี่ยวชาญ
 * - Promotion Orders and Effective Dates
 * - Zero emojis, pure Lucide SVG icons with strict 8px gap.
 * ============================================================================
 */

import React, { useState } from 'react';
import { Award, Calendar, Search, Medal } from 'lucide-react';
import { INITIAL_TEACHERS } from '@/lib/data/schoolData';

export const ViewRegStanding: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState<string>('');

  const standingData = INITIAL_TEACHERS.map((t) => ({
    id: t.id,
    name: t.name,
    position: t.position,
    department: t.department,
    standing: t.academicStanding !== '-' ? t.academicStanding : t.position,
    startDate: t.startDate,
    orders: t.standings,
  }));

  const filtered = standingData.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.standing.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#141b24] p-5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Medal className="w-5 h-5 text-amber-400 shrink-0" />
            <span>ทะเบียนวิทยฐานะข้าราชการครูและบุคลากรทางการศึกษา</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            ข้อมูลวิทยฐานะและคำสั่งแต่งตั้งตาม พ.ร.บ. ระเบียบข้าราชการครูและบุคลากรทางการศึกษา พ.ศ. 2547
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 shrink-0" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ค้นหาชื่อ หรือวิทยฐานะ..."
            className="w-full h-10 bg-[#101822] border border-slate-700/80 rounded-xl pl-10 pr-3.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-all"
          />
        </div>
      </div>

      {/* Grid of Standings */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="bg-[#111823]/80 p-5 rounded-2xl border border-slate-800/80 hover:border-amber-500/40 hover:shadow-lg hover:shadow-black/20 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="inline-block px-3 py-1 rounded-xl text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  {item.standing}
                </span>
                <Award className="w-4 h-4 text-amber-400 shrink-0" />
              </div>

              <div className="text-sm font-bold text-white mb-0.5">{item.name}</div>
              <div className="text-xs text-slate-400 mb-3">{item.department}</div>

              <div className="space-y-2 text-xs text-slate-300 pt-3 border-t border-slate-800/80">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>วันบรรจุ: <strong className="text-slate-200">{item.startDate}</strong></span>
                </div>
                {item.orders.length > 0 && (
                  <div className="mt-2 bg-[#101822] p-3 rounded-xl border border-slate-800 space-y-1.5 text-[11px]">
                    <span className="text-amber-300/90 block font-semibold">คำสั่งแต่งตั้งล่าสุด:</span>
                    <div className="text-slate-200 font-mono">คำสั่งเลขที่: {item.orders[0].orderNumber}</div>
                    <div className="text-slate-400">มีผลตั้งแต่วันที่: {item.orders[0].effectiveDate}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
