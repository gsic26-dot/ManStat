'use client';

/**
 * ============================================================================
 * ManStat: ThemeSwitcher Component (Compact Popover & Clean Header)
 * ============================================================================
 * Compact Single-Icon Button with Popover Menu:
 * - Sun: โหมดสว่าง (Clean Civil-Service Paper)
 * - Moon: โหมดมืด (Minimalist Obsidian Slate)
 * - Clock: ปรับตามเวลาอัตโนมัติ (06:00-18:00 สว่าง / 18:00-06:00 มืด)
 *
 * Strict Zero-Emoji Policy, pure Lucide SVG icons with exact spacing.
 * ============================================================================
 */

import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Clock, Check } from 'lucide-react';
import { useTheme, ThemeMode } from '@/context/ThemeContext';

interface ThemeSwitcherProps {
  className?: string;
}

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({ className = '' }) => {
  const { mode, resolvedTheme, setMode } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const CurrentIcon = mode === 'light' ? Sun : mode === 'dark' ? Moon : Clock;

  const options: Array<{
    value: ThemeMode;
    label: string;
    sublabel: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    {
      value: 'light',
      label: 'โหมดสว่าง',
      sublabel: 'Clean Civil-Service Paper',
      icon: Sun,
    },
    {
      value: 'dark',
      label: 'โหมดมืด',
      sublabel: 'Minimalist Obsidian Slate',
      icon: Moon,
    },
    {
      value: 'auto',
      label: 'ปรับตามเวลาอัตโนมัติ',
      sublabel: `06:00-18:00 สว่าง (ปัจจุบัน: ${resolvedTheme === 'dark' ? 'มืด' : 'สว่าง'})`,
      icon: Clock,
    },
  ];

  return (
    <div ref={containerRef} className={`relative inline-block text-left ${className}`}>
      {/* Compact Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        title={`สลับธีม (ปัจจุบัน: ${mode === 'light' ? 'โหมดสว่าง' : mode === 'dark' ? 'โหมดมืด' : 'ปรับอัตโนมัติ'})`}
        className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 border border-slate-200/90 dark:bg-[#121822] dark:hover:bg-slate-800/70 dark:text-slate-300 dark:hover:text-white dark:border-slate-800/80 transition-colors duration-200 focus:outline-none focus:ring-1 focus:ring-sky-500/40"
      >
        <CurrentIcon className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 top-full mt-2 w-64 rounded-xl bg-white dark:bg-[#121822] border border-slate-200/90 dark:border-slate-800/80 shadow-xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800/60 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              ธีมการแสดงผล (Theme)
            </span>
          </div>

          <div className="space-y-1">
            {options.map((opt) => {
              const Icon = opt.icon;
              const isSelected = mode === opt.value;

              return (
                <button
                  key={opt.value}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMode(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors duration-150 text-left ${
                    isSelected
                      ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 font-medium'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isSelected ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400 dark:text-slate-500'
                      }`}
                    />
                    <div className="min-w-0">
                      <div className="truncate font-medium">{opt.label}</div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                        {opt.sublabel}
                      </div>
                    </div>
                  </div>
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0 ml-2" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
