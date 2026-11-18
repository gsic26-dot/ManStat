'use client';

/**
 * ============================================================================
 * ManStat-Modern: ThemeSwitcher Component
 * ============================================================================
 * 3-Way Segmented Control:
 * - Sun (สว่าง / Light)
 * - Moon (มืด / Dark)
 * - Clock (อัตโนมัติ / Auto - Time-Based 06:00-18:00 Light, 18:00-06:00 Dark)
 * Strict Zero-Emoji Policy, pure Lucide SVG icons with exact spacing.
 * ============================================================================
 */

import React from 'react';
import { Sun, Moon, Clock } from 'lucide-react';
import { useTheme, ThemeMode } from '@/context/ThemeContext';

interface ThemeSwitcherProps {
  className?: string;
  showLabels?: boolean;
}

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({
  className = '',
  showLabels = true,
}) => {
  const { mode, resolvedTheme, setMode } = useTheme();

  const options: Array<{
    value: ThemeMode;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    tooltip: string;
  }> = [
    {
      value: 'light',
      label: 'สว่าง',
      icon: Sun,
      tooltip: 'โหมดสว่าง (Clean Civil-Service Paper)',
    },
    {
      value: 'dark',
      label: 'มืด',
      icon: Moon,
      tooltip: 'โหมดมืด (Minimalist Obsidian Slate)',
    },
    {
      value: 'auto',
      label: 'อัตโนมัติ',
      icon: Clock,
      tooltip: `ปรับตามเวลาอัตโนมัติ (06:00-18:00 สว่าง / 18:00-06:00 มืด) — ปัจจุบัน: โหมด${
        resolvedTheme === 'dark' ? 'มืด' : 'สว่าง'
      }`,
    },
  ];

  return (
    <div
      role="group"
      aria-label="เลือกธีมการแสดงผล"
      className={`inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-[#101722] border border-slate-200 dark:border-slate-800/80 transition-colors duration-200 ${className}`}
    >
      {options.map((opt) => {
        const Icon = opt.icon;
        const isActive = mode === opt.value;

        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => setMode(opt.value)}
            title={opt.tooltip}
            aria-pressed={isActive}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-200 focus:outline-none ${
              isActive
                ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-sm border border-slate-200/80 dark:border-slate-700 font-semibold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/40 border border-transparent'
            }`}
          >
            <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-sky-600 dark:text-sky-400' : ''}`} />
            {showLabels && <span className="hidden sm:inline">{opt.label}</span>}
          </button>
        );
      })}
    </div>
  );
};
