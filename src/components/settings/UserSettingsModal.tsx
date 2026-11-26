'use client';

/**
 * ============================================================================
 * ManStat: UserSettingsModal
 * ============================================================================
 * Modal for user UI/UX preferences customization & cloud persistence.
 * Uses shared PreferencesFormBody with Escape & backdrop close support.
 * ============================================================================
 */

import React, { useEffect } from 'react';
import {
  Sliders,
  RotateCcw,
  X,
  Cloud,
  CheckCircle2,
  HardDrive,
  Loader2,
  Check,
} from 'lucide-react';
import { useUserSettings } from '@/context/UserSettingsContext';
import { PreferencesFormBody } from './PreferencesFormBody';

interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserSettingsModal: React.FC<UserSettingsModalProps> = ({ isOpen, onClose }) => {
  const { preferences, updatePreferences, resetPreferences, syncStatus } = useUserSettings();

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
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
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors duration-200 cursor-pointer"
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

        {/* Shared Settings Form Body */}
        <PreferencesFormBody
          preferences={preferences}
          updatePreferences={updatePreferences}
          layout="modal"
        />

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-200/90 dark:border-slate-800/80 pt-4">
          <button
            type="button"
            onClick={resetPreferences}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>คืนค่าเริ่มต้น</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium border border-transparent shadow-sm transition-colors duration-200 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>เสร็จสิ้น</span>
          </button>
        </div>
      </div>
    </div>
  );
};
