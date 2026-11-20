'use client';

/**
 * ============================================================================
 * ManStat-Modern: ViewLeaveHub (ติดตามและประวัติการลา)
 * ============================================================================
 * - Consolidates "รายการคำร้อง" (Leave Requests) & "ติดตามสถานะ" (Workflow Tracking)
 * - Minimalist top segmented tab switcher
 * - Zero emojis, pure Lucide SVG icons, strict 8px gap.
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import { FileText, Clock, PlusCircle } from 'lucide-react';
import { ViewLeaveRequests } from './ViewLeaveRequests';
import { ViewLeaveTracking } from './ViewLeaveTracking';

interface ViewLeaveHubProps {
  initialTab?: 'requests' | 'tracking';
  onOpenSubmitModal?: () => void;
  currentUser?: any;
}

export const ViewLeaveHub: React.FC<ViewLeaveHubProps> = ({
  initialTab = 'requests',
  onOpenSubmitModal,
}) => {
  const [activeTab, setActiveTab] = useState<'requests' | 'tracking'>(initialTab);
  const [pendingCount, setPendingCount] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;
    fetch('/api/admin/leave', { cache: 'no-store' })
      .then((r) => r.json())
      .then((res) => {
        if (isMounted && res.success && Array.isArray(res.data)) {
          const pending = res.data.filter((r: any) => r.status === 'pending').length;
          setPendingCount(pending);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-5">
      {/* Top Segmented Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#121822] p-2 sm:p-2.5 rounded-xl border border-slate-200/90 dark:border-slate-800/80">
        <div className="inline-flex p-1 bg-slate-100 dark:bg-[#0b1016] border border-slate-200/80 dark:border-slate-800/80 rounded-lg">
          <button
            type="button"
            onClick={() => setActiveTab('requests')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors duration-200 ${
              activeTab === 'requests'
                ? 'bg-white text-slate-900 dark:bg-slate-800 dark:text-white shadow-sm font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/30'
            }`}
            title="รายการคำร้องขอลา"
          >
            <FileText className="w-4 h-4 shrink-0 text-amber-500 dark:text-amber-400" />
            <span className="truncate">รายการคำร้องขอลา</span>
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 shrink-0">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tracking')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors duration-200 ${
              activeTab === 'tracking'
                ? 'bg-white text-slate-900 dark:bg-slate-800 dark:text-white shadow-sm font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/30'
            }`}
            title="ติดตามสถานะคำร้อง"
          >
            <Clock className="w-4 h-4 shrink-0 text-sky-500 dark:text-sky-400" />
            <span className="truncate">ติดตามสถานะคำร้อง</span>
          </button>
        </div>

        {onOpenSubmitModal && (
          <button
            type="button"
            onClick={onOpenSubmitModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs sm:text-sm font-medium border border-transparent transition-colors duration-200 self-start sm:self-auto"
          >
            <PlusCircle className="w-4 h-4 shrink-0" />
            <span>ยื่นคำร้องขอลาใหม่</span>
          </button>
        )}
      </div>

      {/* Tab Contents */}
      {activeTab === 'requests' ? (
        <ViewLeaveRequests onOpenSubmitModal={onOpenSubmitModal} />
      ) : (
        <ViewLeaveTracking />
      )}
    </div>
  );
};
