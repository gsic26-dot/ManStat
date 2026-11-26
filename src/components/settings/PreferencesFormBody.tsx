'use client';

/**
 * ============================================================================
 * ManStat: Shared Preferences Controls (Theme, View Mode, Compact, PDPA)
 * ============================================================================
 * Single source of truth for UI/UX preference controls shared between:
 * - UserSettingsModal (quick personal settings from navbar)
 * - SystemSettingsTab (Admin Center Tab 6 with global defaults save)
 * ============================================================================
 */

import React from 'react';
import {
  Sun,
  Moon,
  Clock,
  Table,
  LayoutGrid,
  ShieldCheck,
} from 'lucide-react';
import type { UserPreferences } from '@/types/database.types';
import type { ThemeMode } from '@/context/ThemeContext';

interface PreferencesFormBodyProps {
  preferences: UserPreferences;
  updatePreferences: (patch: Partial<UserPreferences>) => void;
  layout?: 'modal' | 'cards';
  extraCard?: React.ReactNode;
}

const THEME_OPTIONS: Array<{
  mode: ThemeMode;
  label: string;
  shortLabel: string;
  subtitle: string;
  icon: 'sun' | 'moon' | 'clock';
}> = [
  { mode: 'light', label: 'โหมดสว่าง', shortLabel: 'สว่าง (Light)', subtitle: 'Clean Paper', icon: 'sun' },
  { mode: 'dark', label: 'โหมดมืด', shortLabel: 'มืด (Dark)', subtitle: 'Obsidian Slate', icon: 'moon' },
  { mode: 'auto', label: 'ปรับตามเวลา', shortLabel: 'อัตโนมัติ (เวลา)', subtitle: '06:00-18:00 สว่าง', icon: 'clock' },
];

const VIEW_OPTIONS: Array<{
  view: 'table' | 'grid';
  label: string;
  subtitle: string;
}> = [
  { view: 'table', label: 'มุมมองตาราง (Table)', subtitle: 'แสดงผลแบบแถวข้อมูลมาตรฐาน' },
  { view: 'grid', label: 'มุมมองการ์ด (Grid)', subtitle: 'แสดงผลแบบการ์ด Bento' },
];

function renderThemeIcon(icon: 'sun' | 'moon' | 'clock', sizeClass: string) {
  if (icon === 'sun') return <Sun className={`${sizeClass} text-amber-500`} />;
  if (icon === 'moon') return <Moon className={`${sizeClass} text-sky-400`} />;
  return <Clock className={`${sizeClass} text-indigo-400`} />;
}

function ToggleSwitch({
  checked,
  activeColorClass,
  onToggle,
}: {
  checked: boolean;
  activeColorClass: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onToggle}
      className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 cursor-pointer shrink-0 ${
        checked ? activeColorClass : 'bg-slate-300 dark:bg-slate-700'
      }`}
    >
      <div
        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

export const PreferencesFormBody: React.FC<PreferencesFormBodyProps> = ({
  preferences,
  updatePreferences,
  layout = 'modal',
  extraCard,
}) => {
  if (layout === 'modal') {
    return (
      <div className="space-y-4 text-xs">
        {/* 1. Theme Mode */}
        <div>
          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-2">
            โหมดธีมการแสดงผล (Theme Mode)
          </label>
          <div className="grid grid-cols-3 gap-2">
            {THEME_OPTIONS.map((opt) => {
              const active = preferences.theme_mode === opt.mode;
              return (
                <button
                  key={opt.mode}
                  type="button"
                  onClick={() => updatePreferences({ theme_mode: opt.mode })}
                  className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border text-center transition-all cursor-pointer ${
                    active
                      ? 'bg-sky-50/80 border-sky-500 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 font-semibold'
                      : 'bg-slate-50 dark:bg-[#101822] border-slate-200/90 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  {renderThemeIcon(opt.icon, 'w-4 h-4')}
                  <span className="text-[11px]">{opt.shortLabel}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Default View Mode */}
        <div>
          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-2">
            มุมมองตารางเริ่มต้น (Default Registry View)
          </label>
          <div className="grid grid-cols-2 gap-2">
            {VIEW_OPTIONS.map((opt) => {
              const active = preferences.preferred_view === opt.view;
              return (
                <button
                  key={opt.view}
                  type="button"
                  onClick={() => updatePreferences({ preferred_view: opt.view })}
                  className={`inline-flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs transition-all cursor-pointer ${
                    active
                      ? 'bg-sky-50/80 border-sky-500 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 font-semibold'
                      : 'bg-slate-50 dark:bg-[#101822] border-slate-200/90 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  {opt.view === 'table' ? <Table className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Compact Mode Toggle */}
        <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-[#101822] border border-slate-200/90 dark:border-slate-800/80">
          <div>
            <div className="font-semibold text-slate-900 dark:text-white">
              โหมดแถวกะทัดรัด (Compact Table Rows)
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              ลดระยะห่างของแถวข้อมูลในตาราง เพื่อให้สามารถสแกนข้อมูลได้หนาแน่นขึ้น
            </p>
          </div>
          <ToggleSwitch
            checked={preferences.compact_mode}
            activeColorClass="bg-sky-600"
            onToggle={() => updatePreferences({ compact_mode: !preferences.compact_mode })}
          />
        </div>

        {/* 4. PDPA Masking Default */}
        <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-[#101822] border border-slate-200/90 dark:border-slate-800/80">
          <div>
            <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>ซ่อนเลขบัตรประชาชนเป็นค่าเริ่มต้น (PDPA Masking)</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              ปกปิดเลขบัตรประชาชน 13 หลักด้วยเครื่องหมายดอกจันตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล
            </p>
          </div>
          <ToggleSwitch
            checked={preferences.mask_citizen_id}
            activeColorClass="bg-emerald-600"
            onToggle={() => updatePreferences({ mask_citizen_id: !preferences.mask_citizen_id })}
          />
        </div>
      </div>
    );
  }

  return (
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
          {THEME_OPTIONS.map((opt) => {
            const active = preferences.theme_mode === opt.mode;
            return (
              <button
                key={opt.mode}
                type="button"
                onClick={() => updatePreferences({ theme_mode: opt.mode })}
                className={`flex flex-col items-start p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  active
                    ? 'bg-sky-50/80 border-sky-500 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300 font-semibold shadow-sm'
                    : 'bg-slate-50 dark:bg-[#101822] border-slate-200/90 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-2">
                  {renderThemeIcon(opt.icon, 'w-5 h-5')}
                  {active && <span className="w-2 h-2 rounded-full bg-sky-500" />}
                </div>
                <div className="font-bold text-xs text-slate-900 dark:text-white">{opt.label}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">{opt.subtitle}</div>
              </button>
            );
          })}
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
          {VIEW_OPTIONS.map((opt) => {
            const active = preferences.preferred_view === opt.view;
            return (
              <button
                key={opt.view}
                type="button"
                onClick={() => updatePreferences({ preferred_view: opt.view })}
                className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  active
                    ? 'bg-sky-50/80 border-sky-500 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300 font-semibold shadow-sm'
                    : 'bg-slate-50 dark:bg-[#101822] border-slate-200/90 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {opt.view === 'table' ? (
                  <Table className="w-4 h-4 text-sky-500 shrink-0" />
                ) : (
                  <LayoutGrid className="w-4 h-4 text-sky-500 shrink-0" />
                )}
                <div>
                  <div className="font-semibold text-xs text-slate-900 dark:text-white">{opt.label}</div>
                  <div className="text-[10px] text-slate-400">{opt.subtitle}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Compact Mode Switch */}
        <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-[#101822] border border-slate-200/90 dark:border-slate-800/80">
          <div>
            <div className="font-semibold text-xs text-slate-900 dark:text-white">
              โหมดแถวกะทัดรัด (Compact Table Rows)
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              ลด padding ของแถวข้อมูลเพื่อให้มองเห็นจำนวนเรคคอร์ดต่อหน้าจอได้มากขึ้น
            </p>
          </div>
          <ToggleSwitch
            checked={preferences.compact_mode}
            activeColorClass="bg-sky-600"
            onToggle={() => updatePreferences({ compact_mode: !preferences.compact_mode })}
          />
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

        <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-[#101822] border border-slate-200/90 dark:border-slate-800/80">
          <div>
            <div className="font-semibold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>ซ่อนเลขบัตรประชาชนเป็นค่าเริ่มต้น (Masking Default)</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              แสดงผลเลขบัตรเป็น •••••••••4210 จนกว่าผู้ดูแลระบบจะกดดูเฉพาะรายการพร้อมบันทึก Audit Log
            </p>
          </div>
          <ToggleSwitch
            checked={preferences.mask_citizen_id}
            activeColorClass="bg-emerald-600"
            onToggle={() => updatePreferences({ mask_citizen_id: !preferences.mask_citizen_id })}
          />
        </div>
      </div>

      {extraCard}
    </div>
  );
};
