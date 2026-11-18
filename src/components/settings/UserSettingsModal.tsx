'use client';

/**
 * ============================================================================
 * ManStat-Modern: UserSettingsModal
 * ============================================================================
 * Modal for user UI/UX preferences customization & cloud persistence.
 *
 * Capabilities:
 * - Theme Mode Selection: Light | Dark | Time-based Auto
 * - Default View Selection: Table | Grid Cards
 * - Compact Table Mode Toggle
 * - PDPA Citizen ID Masking Default Toggle
 * - Real-time Supabase Cloud Sync Status
 * - Strict Zero-Emoji compliance, Pure Lucide SVG Icons, 8px standard gap.
 * ============================================================================
 */

import React from 'react';
import {
  Sliders,
  Sun,
  Moon,
  Clock,
  Table,
  LayoutGrid,
  ShieldCheck,
  RotateCcw,
  X,
  Cloud,
  CheckCircle2,
  HardDrive,
  Loader2,
  Check,
} from 'lucide-react';
import { useUserSettings } from '@/context/UserSettingsContext';
import type { ThemeMode } from '@/context/ThemeContext';

interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserSettingsModal: React.FC<UserSettingsModalProps> = ({ isOpen, onClose }) => {
  const { preferences, updatePreferences, resetPreferences, syncStatus } = useUserSettings();

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-sm p-4 overflow-y-auto"
    >
      <div className="bg-white dark:bg-[#121822] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-slate-800 dark:text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200/90 dark:border-slate-800/80 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <Sliders className="w-5 h-5 shrink-0" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                ตั้งค่าการใช้งานส่วนบุคคล
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                ปรับแต่งมุมมองและซิงค์การตั้งค่าลงโปรไฟล์อัตโนมัติ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors duration-200"
            title="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sync Status Badge */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#0b1016] border border-slate-200/80 dark:border-slate-800/80 text-xs">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <Cloud className="w-4 h-4 text-sky-500 shrink-0" />
            <span>สถานะการบันทึก:</span>
          </div>
          <div>
            {syncStatus === 'synced' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>ซิงค์กับ Supabase เรียบร้อย</span>
              </span>
            )}
            {syncStatus === 'syncing' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30">
                <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                <span>กำลังบันทึกข้อมูล...</span>
              </span>
            )}
            {syncStatus === 'local_only' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                <HardDrive className="w-3.5 h-3.5 shrink-0" />
                <span>บันทึกในอุปกรณ์ (Local Storage)</span>
              </span>
            )}
          </div>
        </div>

        {/* Settings Form Body */}
        <div className="space-y-4 text-xs">
          {/* 1. Theme Mode */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-2">
              โหมดธีมการแสดงผล (Theme Mode)
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => updatePreferences({ theme_mode: 'light' })}
                className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border text-center transition-all ${
                  preferences.theme_mode === 'light'
                    ? 'bg-sky-50/80 border-sky-500 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 font-semibold'
                    : 'bg-slate-50 dark:bg-[#101822] border-slate-200/90 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <Sun className="w-4 h-4 text-amber-500" />
                <span className="text-[11px]">สว่าง (Light)</span>
              </button>

              <button
                type="button"
                onClick={() => updatePreferences({ theme_mode: 'dark' })}
                className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border text-center transition-all ${
                  preferences.theme_mode === 'dark'
                    ? 'bg-sky-50/80 border-sky-500 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 font-semibold'
                    : 'bg-slate-50 dark:bg-[#101822] border-slate-200/90 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <Moon className="w-4 h-4 text-sky-400" />
                <span className="text-[11px]">มืด (Dark)</span>
              </button>

              <button
                type="button"
                onClick={() => updatePreferences({ theme_mode: 'auto' })}
                className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border text-center transition-all ${
                  preferences.theme_mode === 'auto'
                    ? 'bg-sky-50/80 border-sky-500 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 font-semibold'
                    : 'bg-slate-50 dark:bg-[#101822] border-slate-200/90 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <Clock className="w-4 h-4 text-indigo-400" />
                <span className="text-[11px]">อัตโนมัติ (เวลา)</span>
              </button>
            </div>
          </div>

          {/* 2. Default View Mode */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-2">
              มุมมองตารางเริ่มต้น (Default Registry View)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => updatePreferences({ preferred_view: 'table' })}
                className={`inline-flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs transition-all ${
                  preferences.preferred_view === 'table'
                    ? 'bg-sky-50/80 border-sky-500 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 font-semibold'
                    : 'bg-slate-50 dark:bg-[#101822] border-slate-200/90 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                <Table className="w-4 h-4" />
                <span>มุมมองตาราง (Table)</span>
              </button>

              <button
                type="button"
                onClick={() => updatePreferences({ preferred_view: 'grid' })}
                className={`inline-flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs transition-all ${
                  preferences.preferred_view === 'grid'
                    ? 'bg-sky-50/80 border-sky-500 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 font-semibold'
                    : 'bg-slate-50 dark:bg-[#101822] border-slate-200/90 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                <span>มุมมองการ์ด (Grid)</span>
              </button>
            </div>
          </div>

          {/* 3. Compact Mode Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-[#101822] border border-slate-200/90 dark:border-slate-800/80">
            <div>
              <div className="font-semibold text-slate-900 dark:text-white">
                โหมดแถวกะทัดรัด (Compact Table Rows)
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                ลดระยะห่างของแถวข้อมูลในตาราง เพื่อให้สามารถสแกนข้อมูลได้หนาแน่นขึ้น
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={preferences.compact_mode}
              onClick={() => updatePreferences({ compact_mode: !preferences.compact_mode })}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 cursor-pointer shrink-0 ${
                preferences.compact_mode ? 'bg-sky-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                  preferences.compact_mode ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* 4. PDPA Masking Default */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-[#101822] border border-slate-200/90 dark:border-slate-800/80">
            <div>
              <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>ซ่อนเลขบัตรประชาชนเป็นค่าเริ่มต้น (PDPA Masking)</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                ปกปิดเลขบัตรประชาชน 13 หลักด้วยเครื่องหมายดอกจันตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={preferences.mask_citizen_id}
              onClick={() => updatePreferences({ mask_citizen_id: !preferences.mask_citizen_id })}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 cursor-pointer shrink-0 ${
                preferences.mask_citizen_id ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                  preferences.mask_citizen_id ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-200/90 dark:border-slate-800/80 pt-4">
          <button
            type="button"
            onClick={resetPreferences}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>คืนค่าเริ่มต้น</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium border border-transparent shadow-sm transition-colors duration-200"
          >
            <Check className="w-4 h-4" />
            <span>เสร็จสิ้น</span>
          </button>
        </div>
      </div>
    </div>
  );
};
