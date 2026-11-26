'use client';

/**
 * ============================================================================
 * ManStat: SystemSettingsTab (Admin Center Tab 6)
 * ============================================================================
 * Consolidated System Preferences & Configuration Tab in Admin Center.
 * Includes:
 * - Theme Mode Configuration (Light, Dark, Auto)
 * - Default View Preferences (Table vs Grid Cards)
 * - Compact Rows standard
 * - PDPA Citizen ID Masking Default
 * - Supabase Cloud Synchronization & Local Fallback
 * - Reset System Defaults
 *
 * Strict Zero-Emoji Policy, pure Lucide SVG icons with exact spacing.
 * ============================================================================
 */

import React, { useState } from 'react';
import {
  Sliders,
  Sun,
  Moon,
  Clock,
  Table,
  LayoutGrid,
  ShieldCheck,
  RotateCcw,
  Cloud,
  CheckCircle2,
  HardDrive,
  Loader2,
  RefreshCw,
  Save,
} from 'lucide-react';
import { useUserSettings } from '@/context/UserSettingsContext';

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

      {/* Main Settings Sections Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 1: Appearance & Theme Mode */}
        <div className="bg-white dark:bg-[#111823] p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 space-y-4 transition-colors duration-200">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3">
            <Sun className="w-4 h-4 text-amber-500 shrink-0" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              ธีมการแสดงผลทั้งระบบ (Global Theme Mode)
            </h3>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            เลือกระบบสีที่ต้องการใช้งาน หรือเปิดระบบเปลี่ยนตามเวลาธรรมชาติของท้องถิ่น
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => updatePreferences({ theme_mode: 'light' })}
              className={`flex flex-col items-start p-3.5 rounded-xl border text-left transition-all ${
                preferences.theme_mode === 'light'
                  ? 'bg-sky-50/80 border-sky-500 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300 font-semibold shadow-sm'
                  : 'bg-slate-50 dark:bg-[#101822] border-slate-200/90 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-2">
                <Sun className="w-5 h-5 text-amber-500" />
                {preferences.theme_mode === 'light' && (
                  <span className="w-2 h-2 rounded-full bg-sky-500" />
                )}
              </div>
              <div className="font-bold text-xs text-slate-900 dark:text-white">โหมดสว่าง</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Clean Paper</div>
            </button>

            <button
              type="button"
              onClick={() => updatePreferences({ theme_mode: 'dark' })}
              className={`flex flex-col items-start p-3.5 rounded-xl border text-left transition-all ${
                preferences.theme_mode === 'dark'
                  ? 'bg-sky-50/80 border-sky-500 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300 font-semibold shadow-sm'
                  : 'bg-slate-50 dark:bg-[#101822] border-slate-200/90 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-2">
                <Moon className="w-5 h-5 text-sky-400" />
                {preferences.theme_mode === 'dark' && (
                  <span className="w-2 h-2 rounded-full bg-sky-500" />
                )}
              </div>
              <div className="font-bold text-xs text-slate-900 dark:text-white">โหมดมืด</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Obsidian Slate</div>
            </button>

            <button
              type="button"
              onClick={() => updatePreferences({ theme_mode: 'auto' })}
              className={`flex flex-col items-start p-3.5 rounded-xl border text-left transition-all ${
                preferences.theme_mode === 'auto'
                  ? 'bg-sky-50/80 border-sky-500 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300 font-semibold shadow-sm'
                  : 'bg-slate-50 dark:bg-[#101822] border-slate-200/90 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-2">
                <Clock className="w-5 h-5 text-indigo-400" />
                {preferences.theme_mode === 'auto' && (
                  <span className="w-2 h-2 rounded-full bg-sky-500" />
                )}
              </div>
              <div className="font-bold text-xs text-slate-900 dark:text-white">ปรับตามเวลา</div>
              <div className="text-[10px] text-slate-400 mt-0.5">06:00-18:00 สว่าง</div>
            </button>
          </div>
        </div>

        {/* Section 2: Table & UI Density */}
        <div className="bg-white dark:bg-[#111823] p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 space-y-4 transition-colors duration-200">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3">
            <Table className="w-4 h-4 text-sky-500 shrink-0" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              พฤติกรรมการแสดงผลตาราง (Table Layout & Density)
            </h3>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            ปรับขนาดความหนาแน่นและมุมมองเริ่มต้นสำหรับหน้าบุคลากรและคณะกรรมการ
          </p>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => updatePreferences({ preferred_view: 'table' })}
              className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${
                preferences.preferred_view === 'table'
                  ? 'bg-sky-50/80 border-sky-500 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300 font-semibold shadow-sm'
                  : 'bg-slate-50 dark:bg-[#101822] border-slate-200/90 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
              }`}
            >
              <Table className="w-4 h-4 text-sky-500 shrink-0" />
              <div>
                <div className="font-semibold text-xs text-slate-900 dark:text-white">มุมมองตาราง (Table)</div>
                <div className="text-[10px] text-slate-400">แสดงผลแบบแถวข้อมูลมาตรฐาน</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => updatePreferences({ preferred_view: 'grid' })}
              className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${
                preferences.preferred_view === 'grid'
                  ? 'bg-sky-50/80 border-sky-500 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300 font-semibold shadow-sm'
                  : 'bg-slate-50 dark:bg-[#101822] border-slate-200/90 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
              }`}
            >
              <LayoutGrid className="w-4 h-4 text-sky-500 shrink-0" />
              <div>
                <div className="font-semibold text-xs text-slate-900 dark:text-white">มุมมองการ์ด (Grid)</div>
                <div className="text-[10px] text-slate-400">แสดงผลแบบการ์ด Bento</div>
              </div>
            </button>
          </div>

          {/* Compact Mode Switch */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-[#101822] border border-slate-200/90 dark:border-slate-800/80">
            <div>
              <div className="font-semibold text-xs text-slate-900 dark:text-white">
                โหมดแถวกะทัดรัด (Compact Table Rows)
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                ลด padding ของแถวข้อมูลเพื่อให้มองเห็นจำนวนเรคคอร์ดต่อหน้าจอได้มากขึ้น
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
        </div>

        {/* Section 3: Privacy & Security (PDPA) */}
        <div className="bg-white dark:bg-[#111823] p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 space-y-4 transition-colors duration-200">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              ความปลอดภัยและการคุ้มครองข้อมูล (PDPA Protection)
            </h3>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            การปกป้องข้อมูลส่วนบุคคลตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562
          </p>

          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-[#101822] border border-slate-200/90 dark:border-slate-800/80">
            <div>
              <div className="font-semibold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>ซ่อนเลขบัตรประชาชนเป็นค่าเริ่มต้น (Masking Default)</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                แสดงผลเลขบัตรเป็น •••••••••4210 จนกว่าผู้ดูแลระบบจะกดดูเฉพาะรายการพร้อมบันทึก Audit Log
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

        {/* Section 4: System Reset & Diagnostic */}
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

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#101822] border border-slate-200/90 dark:border-slate-800/80 flex items-center justify-between">
            <div className="text-xs text-slate-600 dark:text-slate-400">
              ล้างค่า UI Preferences และตั้งกลับเป็น Auto Theme + Standard View
            </div>
            <button
              type="button"
              onClick={resetPreferences}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>คืนค่าเริ่มต้น</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
