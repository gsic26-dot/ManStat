'use client';

/**
 * ============================================================================
 * ManStat-Modern: ViewRegScout (ทะเบียนวุฒิทางการลูกเสือ)
 * ============================================================================
 * - Registry of National Scout Organization of Thailand leader qualifications
 * - Wood Badge (W.B. 2-4 Beads), B.T.C., A.T.C. courses
 * - Search by teacher name, filter by scout level & category
 * - Appointment orders and certificate numbers
 * - Zero Emojis, Pure Lucide SVG Icons, 8px Standard Spacing
 * ============================================================================
 */

import React, { useState } from 'react';
import {
  Award,
  Search,
  Filter,
  Medal,
  Calendar,
  FileText,
  Building,
  User,
  Shield,
} from 'lucide-react';
import { INITIAL_SCOUTS, ScoutRecord } from '@/lib/data/schoolData';

export function ViewRegScout() {
  const [scouts] = useState<ScoutRecord[]>(INITIAL_SCOUTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState('ALL');

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
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#141b24] p-5 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold uppercase tracking-wider">
            <Award className="w-4 h-4 shrink-0" />
            <span>Scout Leader Qualifications Registry</span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1">ทะเบียนวุฒิทางลูกเสือ</h2>
          <p className="text-xs text-slate-400 mt-1">
            ฐานข้อมูลวุฒิบัตรและเครื่องหมายผู้บังคับบัญชาลูกเสือ สำนักงานลูกเสือแห่งชาติ
          </p>
        </div>

        <div className="flex items-center gap-2 bg-[#101822] px-3 py-1.5 rounded-xl border border-slate-700 text-xs text-slate-300">
          <Medal className="w-4 h-4 text-amber-400 shrink-0" />
          <span>มีวุฒิลูกเสือ:</span>
          <span className="font-bold text-white font-mono">{scouts.length} รายการ</span>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            placeholder="ค้นหาชื่อครู, วุฒิการฝึกอบรม, เลขที่วุฒิบัตร..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#111822] border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div>
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="w-full bg-[#111822] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">ระดับวุฒิทั้งหมด (All Levels)</option>
            {levels.map((lvl) => (
              <option key={lvl} value={lvl}>
                {lvl}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Scouts Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredScouts.map((s) => (
          <div
            key={s.id}
            className="bg-[#111822] rounded-2xl border border-slate-800 p-5 hover:border-amber-500/40 transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-3">
                <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  {s.badgeLevel}
                </span>
                <span className="text-[11px] font-mono text-slate-500">{s.category}</span>
              </div>

              <h3 className="font-bold text-white text-sm group-hover:text-amber-300 transition-colors">
                {s.teacherName}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">{s.position}</p>

              <div className="mt-4 p-3 rounded-xl bg-[#151e2b] border border-slate-800/80 space-y-2 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                    หลักสูตรและวุฒิการฝึกอบรม
                  </span>
                  <p className="font-medium text-slate-200 mt-0.5">{s.qualification}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-[11px]">
                  <div>
                    <span className="text-slate-500 block text-[10px]">เลขที่วุฒิบัตร</span>
                    <span className="font-mono text-sky-400">{s.certificateNo}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">วันที่ได้รับ</span>
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

            <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
              <span className="truncate max-w-[200px]" title={s.issuedBy}>
                {s.issuedBy}
              </span>
              <span className="font-mono text-[10px] text-slate-500">{s.orderNumber}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
