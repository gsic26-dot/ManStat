'use client';

/**
 * ============================================================================
 * ManStat-Modern: Personnel Summary Cards (Minimalist Metric Strip)
 * ============================================================================
 * - Sleek 4-column horizontal strip
 * - Single border-slate-800/80 container, crisp font-mono tabular-nums
 * - Zero emojis, pure Lucide SVG icons, strict 8px gap.
 * ============================================================================
 */

import React from 'react';

export interface PersonnelSummaryStats {
  totalStaff: number;
  onDutyCount: number;
  onLeaveCount: number;
  expiringOrRetiringCount: number;
}

interface PersonnelSummaryCardsProps {
  stats?: PersonnelSummaryStats;
  isLoading?: boolean;
}

export const PersonnelSummaryCards: React.FC<PersonnelSummaryCardsProps> = ({
  stats = {
    totalStaff: 15,
    onDutyCount: 14,
    onLeaveCount: 1,
    expiringOrRetiringCount: 2,
  },
  isLoading = false,
}) => {
  const items = [
    { label: 'บุคลากรทั้งหมด', value: stats.totalStaff, unit: 'คน', dotColor: 'bg-sky-500' },
    { label: 'ปฏิบัติหน้าที่วันนี้', value: stats.onDutyCount, unit: 'คน', dotColor: 'bg-emerald-500' },
    { label: 'อยู่ระหว่างการลา', value: stats.onLeaveCount, unit: 'คน', dotColor: 'bg-amber-500' },
    { label: 'เกษียณอายุราชการปีนี้', value: stats.expiringOrRetiringCount, unit: 'คน', dotColor: 'bg-rose-500' },
  ];

  return (
    <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((item, idx) => (
        <div
          key={idx}
          className="bg-[#121822] border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between gap-2 min-w-0">
            <span className="text-xs font-medium text-slate-400 truncate" title={item.label}>
              {item.label}
            </span>
            <span className={`w-2 h-2 rounded-full shrink-0 ${item.dotColor}`} />
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            {isLoading ? (
              <div className="h-8 w-14 bg-slate-800 animate-pulse rounded" />
            ) : (
              <span className="text-2xl font-mono font-bold tabular-nums text-white">
                {item.value}
              </span>
            )}
            <span className="text-xs text-slate-500">{item.unit}</span>
          </div>
        </div>
      ))}
    </section>
  );
};
