'use client';

/**
 * ============================================================================
 * ManStat-Modern: Leave Quota Widget (Clean Health Quota)
 * ============================================================================
 * - Sleek minimal quota bars for personal and sick leave
 * - Tabular nums with clear ratios (0/60, 0/45 or 0/15 for first-year)
 * - Zero emojis, pure Lucide SVG icons, strict 8px gap.
 * ============================================================================
 */

import React from 'react';

export interface LeaveProgressRingsProps {
  sickLeaveUsed?: number;
  sickLeaveMax?: number;
  personalLeaveUsed?: number;
  personalLeaveMax?: number;
  isFirstYear?: boolean;
}

export const LeaveProgressRings: React.FC<LeaveProgressRingsProps> = ({
  sickLeaveUsed = 0,
  sickLeaveMax = 60,
  personalLeaveUsed = 0,
  personalLeaveMax,
  isFirstYear = false,
}) => {
  const actualPersonalMax = personalLeaveMax ?? (isFirstYear ? 15 : 45);

  const sickPercent = Math.min(100, Math.max(0, (sickLeaveUsed / sickLeaveMax) * 100));
  const personalPercent = Math.min(100, Math.max(0, (personalLeaveUsed / actualPersonalMax) * 100));

  return (
    <div className="bg-white dark:bg-[#121822] border border-slate-200/90 dark:border-slate-800/80 rounded-xl p-5 space-y-4 shadow-sm dark:shadow-none transition-colors duration-200">
      <div className="flex items-center justify-between gap-2 min-w-0">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white truncate" title="สิทธิวันลาของฉัน (ปีงบฯ 2570)">
          สิทธิวันลาของฉัน (ปีงบฯ 2570)
        </h2>
        <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 shrink-0">
          ระเบียบฯ 2555
        </span>
      </div>

      <div className="space-y-3.5">
        {/* ลาป่วย */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-slate-700 dark:text-slate-300">ลาป่วย</span>
            <span className="font-mono font-semibold tabular-nums text-slate-900 dark:text-white">
              {sickLeaveUsed} / {sickLeaveMax} <span className="text-slate-400 dark:text-slate-500 font-normal">วัน</span>
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                sickPercent > 80 ? 'bg-rose-500' : sickPercent > 50 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${sickPercent}%` }}
            />
          </div>
        </div>

        {/* ลากิจส่วนตัว */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-slate-700 dark:text-slate-300">
              ลากิจส่วนตัว {isFirstYear ? '(บรรจุปีแรก)' : ''}
            </span>
            <span className="font-mono font-semibold tabular-nums text-slate-900 dark:text-white">
              {personalLeaveUsed} / {actualPersonalMax} <span className="text-slate-400 dark:text-slate-500 font-normal">วัน</span>
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                personalPercent > 80 ? 'bg-rose-500' : personalPercent > 50 ? 'bg-amber-500' : 'bg-sky-500'
              }`}
              style={{ width: `${personalPercent}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
