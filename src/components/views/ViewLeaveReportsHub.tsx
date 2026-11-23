'use client';

/**
 * ============================================================================
 * ManStat: ViewLeaveReportsHub (รายงานและสถิติวันลา)
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
      {/* Top Segmented Tab Switcher (Compact w-fit) */}
      <div className="bg-white dark:bg-[#121822] p-1.5 rounded-xl border border-slate-200/90 dark:border-slate-800/80 shadow-xs w-fit">
        <div className="inline-flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-[#0b1016] border border-slate-200/80 dark:border-slate-800/80 rounded-lg">
          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            className={`inline-flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap cursor-pointer ${
              activeTab === 'analytics'
                ? 'bg-white text-slate-900 dark:bg-slate-800 dark:text-white shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/30'
            }`}
            title="กราฟและสถิติภาพรวม"
          >
            <TrendingUp className={`w-4 h-4 shrink-0 ${activeTab === 'analytics' ? 'text-sky-500 dark:text-sky-400' : 'text-slate-400'}`} />
            <span>กราฟและสถิติภาพรวม</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('official')}
            className={`inline-flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap cursor-pointer ${
              activeTab === 'official'
                ? 'bg-white text-slate-900 dark:bg-slate-800 dark:text-white shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/30'
            }`}
            title="สรุปวันลา"
          >
            <FileSpreadsheet className={`w-4 h-4 shrink-0 ${activeTab === 'official' ? 'text-emerald-500 dark:text-emerald-400' : 'text-slate-400'}`} />
            <span>สรุปวันลา</span>
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
