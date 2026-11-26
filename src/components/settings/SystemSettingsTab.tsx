'use client';

/**
 * ============================================================================
 * ManStat: SystemSettingsTab (Admin Center Tab 6)
 * ============================================================================
 * Consolidated System Preferences & Configuration Tab in Admin Center.
 * Reuses shared PreferencesFormBody and adds explicit global defaults save
 * and system reset controls.
 * ============================================================================
 */

import React, { useState } from 'react';
import {
  Sliders,
  RotateCcw,
  Cloud,
  CheckCircle2,
  HardDrive,
  Loader2,
  RefreshCw,
  Save,
} from 'lucide-react';
import { useUserSettings } from '@/context/UserSettingsContext';
import { PreferencesFormBody } from './PreferencesFormBody';

export const SystemSettingsTab: React.FC = () => {
  const { preferences, updatePreferences, saveGlobalSettings, resetPreferences, syncStatus } = useUserSettings();
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const handleSaveGlobal = async () => {
    const ok = await saveGlobalSettings();
    setSaveMessage(ok ? 'บันทึกค่าเริ่มต้นทั้งระบบเรียบร้อยแล้ว' : 'ไม่สามารถบันทึกค่าเริ่มต้นทั้งระบบได้');
    setTimeout(() => setSaveMessage(null), 3500);
  };

  return (
    <div className="space-y-6">
      {/* Tab Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#141b24] p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 transition-colors duration-200">
        <div>
          <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 text-xs font-semibold uppercase tracking-wider">
            <Sliders className="w-4 h-4 shrink-0" />
            <span>System Preferences & Environment</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
            ตั้งค่าระบบและการแสดงผล (System Preferences)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            กำหนดค่าการแสดงผลส่วนบุคคล พฤติกรรมตาราง และการปกป้องข้อมูลส่วนบุคคล (PDPA) พร้อมบันทึกคลาวด์อัตโนมัติ
          </p>
        </div>

        {/* Sync Status & Explicit Global Save */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-[#101822] border border-slate-200/80 dark:border-slate-800 text-xs">
            <Cloud className="w-4 h-4 text-sky-500 shrink-0" />
            <span className="text-slate-500 dark:text-slate-400">สถานะ:</span>
            {syncStatus === 'synced' && (
              <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>ซิงค์ทั้งระบบแล้ว</span>
              </span>
            )}
            {syncStatus === 'syncing' && (
              <span className="inline-flex items-center gap-1 font-medium text-sky-600 dark:text-sky-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>กำลังบันทึก...</span>
              </span>
            )}
            {syncStatus === 'local_only' && (
              <span className="inline-flex items-center gap-1 font-medium text-slate-600 dark:text-slate-300">
                <HardDrive className="w-3.5 h-3.5" />
                <span>บันทึกในอุปกรณ์ (Local)</span>
              </span>
            )}
          </div>
          <button
            type="button"
            disabled={syncStatus === 'syncing'}
            onClick={handleSaveGlobal}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5 shrink-0" />
            <span>บันทึกค่าเริ่มต้นทั้งระบบ</span>
          </button>
        </div>
      </div>

      {saveMessage && (
        <div className="px-4 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-medium text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{saveMessage}</span>
        </div>
      )}

      {/* Shared Settings Sections Grid + Section 4 System Reset */}
      <PreferencesFormBody
        preferences={preferences}
        updatePreferences={updatePreferences}
        layout="cards"
        extraCard={
          <div className="bg-white dark:bg-[#111823] p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 space-y-4 transition-colors duration-200">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3">
              <RefreshCw className="w-4 h-4 text-slate-400 shrink-0" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                คืนค่าเริ่มต้นของระบบ (Reset System Defaults)
              </h3>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              หากต้องการรีเซ็ตการตั้งค่าการแสดงผลและแคชของเบราว์เซอร์ให้กลับเป็นค่ามาตรฐานของโรงเรียน
            </p>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#101822] border border-slate-200/90 dark:border-slate-800/80 flex items-center justify-between gap-3">
              <div className="text-xs text-slate-600 dark:text-slate-400">
                ล้างค่า UI Preferences และตั้งกลับเป็น Auto Theme + Standard View
              </div>
              <button
                type="button"
                onClick={resetPreferences}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium transition-colors shrink-0 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>คืนค่าเริ่มต้น</span>
              </button>
            </div>
          </div>
        }
      />
    </div>
  );
};
