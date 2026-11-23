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

import React, { useState } from 'react';
import { FilePlus, BookOpen } from 'lucide-react';
import { SmartLeaveForm } from '@/components/leave/SmartLeaveForm';
import { LeaveCriteriaModal } from '@/components/leave/LeaveCriteriaModal';
import { formatStaffName } from '@/lib/regulations/staff-formatting';

interface ViewLeaveSubmitProps {
  currentUser?: any;
  staffList?: any[];
  onSuccess?: () => void;
}

export function ViewLeaveSubmit({ currentUser, staffList, onSuccess }: ViewLeaveSubmitProps) {
  const [isCriteriaModalOpen, setIsCriteriaModalOpen] = useState(false);
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
      <div className="bg-white dark:bg-[#141b24] p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 transition-colors duration-200">
        <div className="flex items-center gap-2.5">
          <FilePlus className="w-5 h-5 text-sky-500 shrink-0" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">ยื่นคำร้องขอลา</h2>
        </div>
        <button
          type="button"
          onClick={() => setIsCriteriaModalOpen(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer shrink-0"
        >
          <BookOpen className="w-4 h-4 text-sky-500 shrink-0" />
          <span>เกณฑ์และประเภทการลา</span>
        </button>
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

      {/* Leave Criteria Modal */}
      <LeaveCriteriaModal
        isOpen={isCriteriaModalOpen}
        onClose={() => setIsCriteriaModalOpen(false)}
      />
    </div>
  );
}
