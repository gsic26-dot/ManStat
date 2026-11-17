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
      <div className="flex items-center justify-between bg-[#121822] p-2 sm:p-2.5 rounded-xl border border-slate-800/80">
        <div className="inline-flex p-1 bg-[#0b1016] border border-slate-800/80 rounded-lg">
          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${
              activeTab === 'analytics'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
            }`}
            title="กราฟและสถิติภาพรวม"
          >
            <TrendingUp className="w-4 h-4 shrink-0 text-sky-400" />
            <span className="truncate">กราฟและสถิติภาพรวม</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('official')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${
              activeTab === 'official'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
            }`}
            title="สรุปวันลา สพฐ. (รายงานทางการ)"
          >
            <FileSpreadsheet className="w-4 h-4 shrink-0 text-emerald-400" />
            <span className="truncate">สรุปวันลา สพฐ. (รายงานทางการ)</span>
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
