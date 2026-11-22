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
import { formatStaffName } from '@/lib/regulations/staff-formatting';

interface ViewLeaveSubmitProps {
  currentUser?: any;
  staffList?: any[];
  onSuccess?: () => void;
}

export function ViewLeaveSubmit({ currentUser, staffList, onSuccess }: ViewLeaveSubmitProps) {
  const currentStaffId = currentUser?.employeeCode || currentUser?.id || (staffList && staffList[0]?.id) || '';
  const currentStaffName = formatStaffName(currentUser?.fullName || currentUser?.name || (staffList && staffList[0]?.name) || 'บุคลากรสถานศึกษา');

  const listToUse = Array.isArray(staffList) ? staffList : [];
  const substituteTeachers = listToUse
    .filter((t) => t.id !== currentStaffId)
    .map((t) => ({
      id: t.id,
      name: formatStaffName(t),
      position: t.position,
    }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-[#141b24] p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <FilePlus className="w-5 h-5 text-sky-500 shrink-0" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">ยื่นคำร้องขอลา</h2>
        </div>
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
