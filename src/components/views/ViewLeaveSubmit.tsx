'use client';

/**
 * ============================================================================
 * ManStat-Modern: ViewLeaveSubmit (หน้ายื่นคำร้องขอลาแบบเต็มหน้าจอ)
 * ============================================================================
 * - Full-page view container for SmartLeaveForm
 * - Thai regulatory checks (ว15/2561, 60/45/10 days limits, half-day count)
 * - Zero Emojis, Pure Lucide SVG Icons, 8px Standard Spacing
 * ============================================================================
 */

import React from 'react';
import { FilePlus, ShieldCheck, HelpCircle } from 'lucide-react';
import { SmartLeaveForm } from '@/components/leave/SmartLeaveForm';
import { INITIAL_TEACHERS } from '@/lib/data/schoolData';

interface ViewLeaveSubmitProps {
  onSuccess?: () => void;
}

export function ViewLeaveSubmit({ onSuccess }: ViewLeaveSubmitProps) {
  const substituteTeachers = INITIAL_TEACHERS.map((t) => ({
    id: t.id,
    name: t.name,
    position: t.position,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#141b24] p-5 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-2 text-sky-400 text-xs font-semibold uppercase tracking-wider">
          <FilePlus className="w-4 h-4 shrink-0" />
          <span>Official Leave Application</span>
        </div>
        <h2 className="text-xl font-bold text-white mt-1">ยื่นคำร้องขอลา</h2>
        <p className="text-xs text-slate-400 mt-1">
          กรอกรายละเอียดคำร้องขอลา พร้อมคำนวณวันลาจริงและประเมินสิทธิการเลื่อนขั้นเงินเดือนแบบอัตโนมัติ
        </p>
      </div>

      {/* SmartLeaveForm Container */}
      <div className="bg-[#111822] p-6 rounded-2xl border border-slate-800 shadow-sm">
        <SmartLeaveForm
          currentStaffId="TCH-002"
          currentStaffName="นายธวัชชัย เหลืองโอฬาร"
          substituteTeachers={substituteTeachers}
          onSuccess={onSuccess}
        />
      </div>
    </div>
  );
}
