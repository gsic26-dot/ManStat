'use client';

/**
 * ============================================================================
 * ManStat-Modern: Promotion Radar Widget (สถานะเกณฑ์เลื่อนเงินเดือน ว15/2561)
 * ============================================================================
 * - Minimalist criteria rows with crisp tabular nums
 * - Clear criteria indicators (<= 6 occurrences, <= 23 days)
 * - Zero emojis, pure Lucide SVG icons, strict 8px gap.
 * ============================================================================
 */

import React from 'react';

export interface PromotionRadarCardProps {
  fiscalYear?: number;
  evalRound?: 1 | 2;
  leaveCount?: number;
  sickPersonalDays?: number;
  isEligible?: boolean;
}

export const PromotionRadarCard: React.FC<PromotionRadarCardProps> = ({
  leaveCount = 0,
  sickPersonalDays = 0,
  isEligible = true,
}) => {
  const maxOccurrences = 6;
  const maxDays = 23;

  const isExceeded = leaveCount > maxOccurrences || sickPersonalDays > maxDays || !isEligible;

  return (
    <div className="bg-white dark:bg-[#121822] border border-slate-200/90 dark:border-slate-800/80 rounded-xl p-5 space-y-4 shadow-sm dark:shadow-none transition-colors duration-200">
      <div className="flex items-center justify-between gap-2 min-w-0">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white truncate" title="สถานะเกณฑ์เลื่อนเงินเดือน">
          สถานะเกณฑ์เลื่อนเงินเดือน
        </h2>
        {isExceeded ? (
          <span className="px-2 py-0.5 text-[11px] font-mono font-medium rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 shrink-0">
            เกินเกณฑ์ที่กำหนด
          </span>
        ) : (
          <span className="px-2 py-0.5 text-[11px] font-mono font-medium rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
            ผ่านเกณฑ์ปกติ
          </span>
        )}
      </div>

      <div className="space-y-2.5 text-xs">
        <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/60">
          <span className="text-slate-600 dark:text-slate-400">จำนวนครั้งที่ลา</span>
          <span
            className={`font-mono font-semibold tabular-nums ${
              leaveCount > maxOccurrences ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {leaveCount} / {maxOccurrences} ครั้ง
          </span>
        </div>

        <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/60">
          <span className="text-slate-600 dark:text-slate-400">วันลาป่วยและลากิจรวม</span>
          <span
            className={`font-mono font-semibold tabular-nums ${
              sickPersonalDays > maxDays ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {sickPersonalDays} / {maxDays} วัน
          </span>
        </div>

        <div className="flex items-center justify-between py-1.5">
          <span className="text-slate-600 dark:text-slate-400">การมาสาย / ขาดราชการ</span>
          <span className="font-mono font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
            0 ครั้ง
          </span>
        </div>
      </div>
    </div>
  );
};
