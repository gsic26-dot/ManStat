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
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
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
      {/* Top Equal-Width Segmented Tab Switcher (50% / 50%) */}
      <div className="print:hidden">
        <SegmentedTabs
          ariaLabel="มุมมองรายงานและสถิติวันลา"
          activeId={activeTab}
          onChange={setActiveTab}
          className="w-full sm:max-w-[460px]"
          items={[
            { id: 'analytics', label: 'กราฟและสถิติภาพรวม', icon: TrendingUp },
            { id: 'official', label: 'สรุปวันลา', icon: FileSpreadsheet },
          ]}
        />
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
