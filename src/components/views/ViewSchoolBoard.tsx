'use client';

/**
 * ============================================================================
 * ManStat-Modern: View School Board (คณะกรรมการสถานศึกษาขั้นพื้นฐาน)
 * ============================================================================
 * - Ground-truth Basic Education School Board Members
 * - Positions: Chair, Teacher Rep, Parent Rep, Community Rep, Local Gov Rep, Director & Sec
 * - Zero emojis, pure Lucide SVG icons with strict 8px gap.
 * ============================================================================
 */

import React from 'react';
import { Award, UserCheck, Phone, Building, CheckCircle2, Shield } from 'lucide-react';
import { INITIAL_BOARD_MEMBERS } from '@/lib/data/schoolData';

export const ViewSchoolBoard: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel p-5 rounded-xl border border-slate-800">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Shield className="w-5 h-5 text-sky-400 shrink-0" />
          <span>คณะกรรมการสถานศึกษาขั้นพื้นฐาน โรงเรียนชุมชนบ้านตะขบ</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          ปฏิบัติหน้าที่ตามมาตรา 38 แห่งพระราชบัญญัติการศึกษาแห่งชาติ พ.ศ. 2542 (รวม {INITIAL_BOARD_MEMBERS.length} ท่าน)
        </p>
      </div>

      {/* Grid of Board Members */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {INITIAL_BOARD_MEMBERS.map((member) => (
          <div
            key={member.id}
            className="glass-panel p-5 rounded-xl border border-slate-800 hover:border-sky-500/40 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-3">
                <span className="inline-block px-2.5 py-1 rounded text-xs font-semibold bg-sky-500/15 text-sky-300 border border-sky-500/30">
                  {member.positionTitle}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{member.status}</span>
                </span>
              </div>

              <div className="text-base font-bold text-white mb-1">
                {member.fullName}
              </div>

              <div className="space-y-1.5 text-xs text-slate-300 mt-3 pt-2 border-t border-slate-800">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>อาชีพ: <strong className="text-slate-200">{member.occupation}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <Building className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="truncate">สังกัด/องค์กร: {member.organization}</span>
                </div>
                {member.phone && member.phone !== '-' && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="font-mono text-slate-400">{member.phone}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 pt-2 border-t border-slate-800/80 text-[11px] text-slate-500 flex justify-between items-center">
              <span>วาระการดำรงตำแหน่ง: ครั้งที่ {member.termNumber}</span>
              <span className="font-mono">{member.id}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
