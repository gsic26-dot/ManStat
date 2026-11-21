'use client';

/**
 * ============================================================================
 * ManStat: Personnel Summary Cards (Minimalist Metric Strip)
 * ============================================================================
 * - Sleek 4-column horizontal strip
 * - Single border-slate-800/80 container, crisp font-mono tabular-nums
 * - Displays authentic real-time data with contextual subtitles
 * - Displays "วันหยุดราชการ" when current date is weekend or official holiday
 * - Zero emojis, pure Lucide SVG icons, strict 8px gap.
 * ============================================================================
 */

import React from 'react';

export interface PersonnelSummaryStats {
  totalStaff: number;
  onDutyCount: number | string;
  onLeaveCount: number;
  expiringOrRetiringCount: number;
  onLeaveDetail?: string;
  retiringDetail?: string;
  isHoliday?: boolean;
  holidayName?: string;
}

interface PersonnelSummaryCardsProps {
  stats?: PersonnelSummaryStats;
  isLoading?: boolean;
}

export const PersonnelSummaryCards: React.FC<PersonnelSummaryCardsProps> = ({
  stats = {
    totalStaff: 15,
    onDutyCount: 15,
    onLeaveCount: 0,
    expiringOrRetiringCount: 0,
  },
  isLoading = false,
}) => {
  const isHoliday = Boolean(stats.isHoliday);

  const items = [
    {
      label: 'บุคลากรทั้งหมด',
      value: stats.totalStaff,
      unit: 'คน',
      dotColor: 'bg-sky-500',
      subtext: 'ข้าราชการครูและบุคลากร',
    },
    {
      label: 'ปฏิบัติหน้าที่วันนี้',
      value: isHoliday ? 'วันหยุดราชการ' : stats.onDutyCount,
      unit: isHoliday ? '' : 'คน',
      dotColor: isHoliday ? 'bg-slate-400' : 'bg-emerald-500',
      subtext: isHoliday
        ? (stats.holidayName || 'วันหยุดประจำสัปดาห์')
        : (stats.onDutyCount === stats.totalStaff ? 'มาปฏิบัติหน้าที่ครบทุกคน' : 'พร้อมปฏิบัติหน้าที่ในสถานศึกษา'),
    },
    {
      label: 'อยู่ระหว่างการลา',
      value: stats.onLeaveCount,
      unit: 'คน',
      dotColor: 'bg-amber-500',
      subtext: stats.onLeaveDetail || (stats.onLeaveCount === 0 ? 'ไม่มีบุคลากรลาในวันนี้' : `${stats.onLeaveCount} คนได้รับอนุมัติลา`),
    },
    {
      label: 'เกษียณอายุราชการปีนี้',
      value: stats.expiringOrRetiringCount,
      unit: 'คน',
      dotColor: 'bg-rose-500',
      subtext: stats.retiringDetail || (stats.expiringOrRetiringCount === 0 ? 'ปีงบฯ 2570 ไม่มีผู้เกษียณ' : `${stats.expiringOrRetiringCount} คนครบวาระ`),
    },
  ];

  return (
    <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((item, idx) => (
        <div
          key={idx}
          className="bg-white dark:bg-[#121822] border border-slate-200/90 dark:border-slate-800/80 rounded-xl p-4 flex flex-col justify-between shadow-sm dark:shadow-none transition-colors duration-200"
        >
          <div className="flex items-center justify-between gap-2 min-w-0">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate" title={item.label}>
              {item.label}
            </span>
            <span className={`w-2 h-2 rounded-full shrink-0 ${item.dotColor}`} />
          </div>
          <div className="mt-2.5">
            <div className="flex items-baseline gap-1.5">
              {isLoading ? (
                <div className="h-8 w-14 bg-slate-200 dark:bg-slate-800 animate-pulse rounded" />
              ) : (
                <span
                  className={`${
                    typeof item.value === 'string' && item.value.length > 5
                      ? 'text-lg sm:text-xl font-bold tracking-tight'
                      : 'text-2xl font-mono font-bold tabular-nums'
                  } text-slate-900 dark:text-white`}
                >
                  {item.value}
                </span>
              )}
              {item.unit && (
                <span className="text-xs text-slate-400 dark:text-slate-500">{item.unit}</span>
              )}
            </div>
            {item.subtext && (
              <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-1" title={item.subtext}>
                {item.subtext}
              </p>
            )}
          </div>
        </div>
      ))}
    </section>
  );
};
