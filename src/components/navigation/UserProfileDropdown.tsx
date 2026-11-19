'use client';

/**
 * ============================================================================
 * ManStat-Modern: UserProfileDropdown Component
 * ============================================================================
 * Consolidated User Profile Dropdown:
 * - Trigger: Avatar + User Name + Role Badge (ROOT / Superuser) + Chevron
 * - Dropdown Panel:
 *   - User Profile Information (Name, Position, Code, Role)
 *   - Quick Theme Switcher (Light / Dark / Auto)
 *   - Personal Settings Modal Trigger ("ตั้งค่าการใช้งานส่วนบุคคล")
 *   - Admin Center Link (if authorized)
 *   - Secure Logout action ("ออกจากระบบ")
 *
 * Strict Zero-Emoji Policy, pure Lucide SVG icons with exact spacing.
 * ============================================================================
 */

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  User,
  Sliders,
  LogOut,
  Sun,
  Moon,
  Clock,
  ShieldCheck,
  ChevronDown,
  Building,
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

interface UserProfileDropdownProps {
  onOpenSettings?: () => void;
  showAdminCenterLink?: boolean;
}

export const UserProfileDropdown: React.FC<UserProfileDropdownProps> = ({
  onOpenSettings,
  showAdminCenterLink = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { mode, resolvedTheme, setMode } = useTheme();

  // Close on outside click & Escape
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

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        className="flex items-center gap-2 pl-2 pr-1.5 py-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-transparent hover:border-slate-200/80 dark:hover:border-slate-800/80 transition-colors duration-200 cursor-pointer focus:outline-none"
        title="เมนูบัญชีผู้ใช้และการตั้งค่า"
      >
        <div
          className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-600 dark:text-amber-300 font-bold font-mono text-sm shrink-0"
          title="ระดับสิทธิ์: Superuser"
        >
          S
        </div>

        <div className="hidden lg:block text-left min-w-0">
          <div className="flex items-center gap-1.5">
            <span
              className="text-xs font-semibold text-slate-900 dark:text-white truncate max-w-[100px]"
              title="Superuser"
            >
              Superuser
            </span>
            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 shrink-0">
              ROOT
            </span>
          </div>
          <div
            className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[110px]"
            title="นายธีรศักดิ์ มโนธรรม"
          >
            นายธีรศักดิ์ มโนธรรม
          </div>
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 dark:text-slate-500 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 top-full mt-2 w-72 rounded-2xl bg-white dark:bg-[#121822] border border-slate-200/90 dark:border-slate-800/80 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150 text-slate-800 dark:text-slate-200"
        >
          {/* User Header Profile Card */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#0b1016] border border-slate-200/80 dark:border-slate-800/80 mb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-600 dark:text-amber-300 font-bold font-mono text-base shrink-0">
                S
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    นายธีรศักดิ์ มโนธรรม
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 shrink-0">
                    ROOT
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  ผู้อำนวยการสถานศึกษา • EXE-001
                </div>
                <div className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                  <Building className="w-3 h-3 shrink-0" />
                  <span className="truncate">ร.ร. ชุมชนบ้านตะขบ (สพป.นม. 3)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Theme Switcher Inside Profile */}
          <div className="px-2 py-2 mb-1">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5 flex items-center justify-between">
              <span>ธีมการแสดงผล</span>
              <span className="text-[9px] font-normal lowercase text-slate-400">
                {resolvedTheme === 'dark' ? 'dark mode' : 'light mode'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 dark:bg-[#0b1016] rounded-xl border border-slate-200/80 dark:border-slate-800/80 text-xs">
              <button
                type="button"
                onClick={() => setMode('light')}
                className={`inline-flex items-center justify-center gap-1 py-1 px-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                  mode === 'light'
                    ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-sm font-semibold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="โหมดสว่าง"
              >
                <Sun className="w-3.5 h-3.5 shrink-0" />
                <span>สว่าง</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('dark')}
                className={`inline-flex items-center justify-center gap-1 py-1 px-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                  mode === 'dark'
                    ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-sm font-semibold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="โหมดมืด"
              >
                <Moon className="w-3.5 h-3.5 shrink-0" />
                <span>มืด</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('auto')}
                className={`inline-flex items-center justify-center gap-1 py-1 px-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                  mode === 'auto'
                    ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-sm font-semibold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="ปรับตามเวลาอัตโนมัติ"
              >
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>ออโต้</span>
              </button>
            </div>
          </div>

          <div className="h-px bg-slate-200/80 dark:border-slate-800/80 my-1" />

          {/* Menu Items */}
          <div className="space-y-0.5">
            {onOpenSettings && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenSettings();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors text-left"
              >
                <Sliders className="w-4 h-4 text-sky-500 shrink-0" />
                <span>ตั้งค่าการใช้งานส่วนบุคคล</span>
              </button>
            )}

            {showAdminCenterLink && (
              <Link
                href="/admin"
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
              >
                <ShieldCheck className="w-4 h-4 text-amber-500 shrink-0" />
                <span>ศูนย์ผู้ดูแลระบบ (Admin Center)</span>
              </Link>
            )}

            <Link
              href="/login"
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>ออกจากระบบ</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
