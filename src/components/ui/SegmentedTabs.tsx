'use client';

/**
 * ============================================================================
 * ManStat: SegmentedTabs (Shared Equal-Width Segmented Tab Bar Component)
 * ============================================================================
 * Phase 10.1:
 * - Single source of truth for tab navigation across Reports, Workload & Timetable
 * - Equal-width CSS Grid columns (2 / 3 / 6 tabs) with zero wrapping on desktop
 * - Recessed track + elevated active button (Light & Dark Mode balanced)
 * - Strict zero-emoji policy: Lucide SVG icons only (w-4 h-4 shrink-0, gap-2)
 * - Accessible ARIA roles (tablist / tab / aria-selected) & constant border width
 * ============================================================================
 */

import React from 'react';
import type { LucideIcon } from 'lucide-react';

export interface SegmentedTabItem<T extends string = string> {
  id: T;
  label: string;
  icon: LucideIcon;
  badge?: string | number;
}

export interface SegmentedTabsProps<T extends string = string> {
  items: readonly SegmentedTabItem<T>[];
  activeId: T;
  onChange: (id: T) => void;
  ariaLabel: string;
  columnsClassName?: string;
  className?: string;
}

function getDefaultColumnsClass(count: number): string {
  switch (count) {
    case 2:
      return 'grid-cols-2';
    case 3:
      return 'grid-cols-1 sm:grid-cols-3';
    case 6:
      return 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6';
    default:
      return 'grid-cols-1 sm:grid-cols-2';
  }
}

export function SegmentedTabs<T extends string = string>({
  items,
  activeId,
  onChange,
  ariaLabel,
  columnsClassName,
  className = 'w-full',
}: SegmentedTabsProps<T>) {
  const colsClass = columnsClassName ?? getDefaultColumnsClass(items.length);

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`grid ${colsClass} gap-1.5 p-1.5 rounded-2xl border bg-slate-100/90 border-slate-200/90 dark:bg-[#0B1220] dark:border-slate-800/90 ${className}`}
    >
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = item.id === activeId;

        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(item.id)}
            title={item.label}
            className={`w-full min-h-[42px] px-3 py-2 rounded-xl flex items-center justify-center gap-2 text-sm whitespace-nowrap transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60 ${
              isActive
                ? 'bg-white text-slate-900 font-semibold border border-slate-200/90 shadow-sm dark:bg-[#1E293B] dark:text-white dark:border-slate-700/80'
                : 'bg-transparent text-slate-600 font-medium border border-transparent hover:text-slate-900 hover:bg-white/60 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/40'
            }`}
          >
            <Icon
              className={`w-4 h-4 shrink-0 ${
                isActive
                  ? 'text-sky-600 dark:text-sky-400'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            />
            <span className="truncate">{item.label}</span>
            {item.badge !== undefined && item.badge !== '' && (
              <span
                className={`px-1.5 py-0.5 rounded-md text-[11px] font-mono font-medium shrink-0 ${
                  isActive
                    ? 'bg-slate-200/80 text-slate-700 dark:bg-slate-700/80 dark:text-slate-200'
                    : 'bg-slate-200/60 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
