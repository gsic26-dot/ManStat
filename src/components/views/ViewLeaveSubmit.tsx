'use client';

/**
 * ============================================================================
 * ManStat: ViewLeaveSubmit (หน้ายื่นคำร้องขอลาแบบเต็มหน้าจอ)
 * ============================================================================
 * - Full-page view container for SmartLeaveForm
 * - Thai regulatory checks (ว15/2561, 60/45/10 days limits, half-day count)
 * - Zero Emojis, Pure Lucide SVG Icons, 8px Standard Spacing
 * ============================================================================
 */

import { FilePlus } from 'lucide-react';
import { SmartLeaveForm } from '@/components/leave/SmartLeaveForm';
import { INITIAL_TEACHERS } from '@/lib/data/schoolData';

interface ViewLeaveSubmitProps {
  currentUser?: any;
  staffList?: any[];
  onSuccess?: () => void;
}

export function ViewLeaveSubmit({ currentUser, staffList, onSuccess }: ViewLeaveSubmitProps) {
  const currentStaffId = currentUser?.employeeCode || currentUser?.id || (staffList && staffList[0]?.id) || 'TCH-003';
  const currentStaffName = currentUser?.fullName || currentUser?.name || (staffList && staffList[0]?.name) || 'บุคลากรสถานศึกษา';

  const listToUse = Array.isArray(staffList) && staffList.length > 0 ? staffList : INITIAL_TEACHERS;
  const substituteTeachers = listToUse
    .filter((t) => t.id !== currentStaffId)
    .map((t) => ({
      id: t.id,
      name: t.name,
      position: t.position,
    }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-[#141b24] p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800">
        <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 text-xs font-semibold uppercase tracking-wider">
          <FilePlus className="w-4 h-4 shrink-0" />
          <span>Official Leave Application</span>
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">ยื่นคำร้องขอลา</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          กรอกรายละเอียดคำร้องขอลา พร้อมคำนวณวันลาจริงและประเมินสิทธิการเลื่อนขั้นเงินเดือนแบบอัตโนมัติ
        </p>
      </div>

      {/* SmartLeaveForm Container */}
      <div className="bg-white dark:bg-[#111822] p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm">
        <SmartLeaveForm
          currentStaffId={currentStaffId}
          currentStaffName={currentStaffName}
          substituteTeachers={substituteTeachers}
          onSuccess={onSuccess}
        />
      </div>
    </div>
  );
}
