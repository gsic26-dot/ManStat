'use client';

/**
 * ============================================================================
 * ManStat-Modern: ViewLeaveReportsHub (รายงานและสถิติวันลา)
 * ============================================================================
 * - Consolidates "กราฟและสถิติวันลา" (Analytics) & "รายงานวันลา สพฐ." (Official Reports)
 * - Minimalist top segmented tab switcher
 * - Zero emojis, pure Lucide SVG icons, strict 8px gap.
 * ============================================================================
 */

import React, { useState } from 'react';
import { TrendingUp, FileSpreadsheet } from 'lucide-react';
import { ViewLeaveAnalytics } from './ViewLeaveAnalytics';
import { ViewOfficialReports } from './ViewOfficialReports';

interface ViewLeaveReportsHubProps {
  initialTab?: 'analytics' | 'official';
}

export const ViewLeaveReportsHub: React.FC<ViewLeaveReportsHubProps> = ({
  initialTab = 'analytics',
}) => {
  const [activeTab, setActiveTab] = useState<'analytics' | 'official'>(initialTab);

  return (
    <div className="space-y-5">
      {/* Top Segmented Tab Switcher */}
      <div className="bg-white dark:bg-[#121822] p-2 sm:p-2.5 rounded-xl border border-slate-200/90 dark:border-slate-800/80 shadow-sm">
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-[#0b1016] border border-slate-200/80 dark:border-slate-800/80 rounded-lg w-full">
          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap ${
              activeTab === 'analytics'
                ? 'bg-white text-slate-900 dark:bg-slate-800 dark:text-white shadow-sm font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/30'
            }`}
            title="กราฟและสถิติภาพรวม"
          >
            <TrendingUp className={`w-4 h-4 shrink-0 ${activeTab === 'analytics' ? 'text-sky-500 dark:text-sky-400' : 'text-slate-400'}`} />
            <span className="truncate">กราฟและสถิติภาพรวม</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('official')}
            className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap ${
              activeTab === 'official'
                ? 'bg-white text-slate-900 dark:bg-slate-800 dark:text-white shadow-sm font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/30'
            }`}
            title="สรุปวันลา"
          >
            <FileSpreadsheet className={`w-4 h-4 shrink-0 ${activeTab === 'official' ? 'text-emerald-500 dark:text-emerald-400' : 'text-slate-400'}`} />
            <span className="truncate">สรุปวันลา</span>
          </button>
        </div>
      </div>

      {/* Tab Contents */}
      {activeTab === 'analytics' ? (
        <ViewLeaveAnalytics />
      ) : (
        <ViewOfficialReports />
      )}
    </div>
  );
};
