'use client';

/**
 * ============================================================================
 * ManStat-Modern: ViewPersonnelHub (ศูนย์งานทะเบียนประวัติบุคลากร)
 * ============================================================================
 * - Segmented Tab Switcher for Category 3 Registries:
 *   1. ทะเบียนประวัติฯ (Staff Directory)
 *   2. ทะเบียนวิทยฐานะ (Academic Standings)
 *   3. ทะเบียนใบอนุญาตฯ (Professional Licenses)
 *   4. ทะเบียนวุฒิลูกเสือ (Scout Qualifications)
 * - Equal width buttons, clean abbreviations, ellipsis truncate
 * - Zero emojis, pure Lucide SVG icons with strict 8px gap.
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import { User, GraduationCap, BadgeCheck, Award } from 'lucide-react';
import { ViewStaffDirectory } from './ViewStaffDirectory';
import { ViewRegStanding } from './ViewRegStanding';
import { ViewRegLicense } from './ViewRegLicense';
import { ViewRegScout } from './ViewRegScout';

export type PersonnelTab = 'directory' | 'standing' | 'license' | 'scout';

interface ViewPersonnelHubProps {
  initialTab?: PersonnelTab;
}

export const ViewPersonnelHub: React.FC<ViewPersonnelHubProps> = ({
  initialTab = 'directory',
}) => {
  const [activeTab, setActiveTab] = useState<PersonnelTab>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  return (
    <div className="space-y-5">
      {/* Top Segmented Tab Switcher - Exactly matching clean modern pill design */}
      <div className="bg-white dark:bg-[#121822] p-2 sm:p-2.5 rounded-xl border border-slate-200/90 dark:border-slate-800/80 shadow-sm">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5 p-1 bg-slate-100 dark:bg-[#0b1016] border border-slate-200/80 dark:border-slate-800/80 rounded-lg">
          {/* 1. ทะเบียนประวัติฯ */}
          <button
            type="button"
            onClick={() => setActiveTab('directory')}
            className={`w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 ${
              activeTab === 'directory'
                ? 'bg-white text-slate-900 dark:bg-slate-800 dark:text-white shadow-sm font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/30'
            }`}
            title="ทะเบียนประวัติบุคลากร (Staff Directory)"
          >
            <User className={`w-4 h-4 shrink-0 ${activeTab === 'directory' ? 'text-sky-500 dark:text-sky-400' : 'text-slate-400'}`} />
            <span className="truncate">ทะเบียนประวัติฯ</span>
          </button>

          {/* 2. ทะเบียนวิทยฐานะ */}
          <button
            type="button"
            onClick={() => setActiveTab('standing')}
            className={`w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 ${
              activeTab === 'standing'
                ? 'bg-white text-slate-900 dark:bg-slate-800 dark:text-white shadow-sm font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/30'
            }`}
            title="ทะเบียนวิทยฐานะ (Academic Standings)"
          >
            <GraduationCap className={`w-4 h-4 shrink-0 ${activeTab === 'standing' ? 'text-cyan-500 dark:text-cyan-400' : 'text-slate-400'}`} />
            <span className="truncate">ทะเบียนวิทยฐานะ</span>
          </button>

          {/* 3. ทะเบียนใบอนุญาตฯ */}
          <button
            type="button"
            onClick={() => setActiveTab('license')}
            className={`w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 ${
              activeTab === 'license'
                ? 'bg-white text-slate-900 dark:bg-slate-800 dark:text-white shadow-sm font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/30'
            }`}
            title="ทะเบียนใบอนุญาตประกอบวิชาชีพ"
          >
            <BadgeCheck className={`w-4 h-4 shrink-0 ${activeTab === 'license' ? 'text-emerald-500 dark:text-emerald-400' : 'text-slate-400'}`} />
            <span className="truncate">ทะเบียนใบอนุญาตฯ</span>
          </button>

          {/* 4. ทะเบียนวุฒิลูกเสือ */}
          <button
            type="button"
            onClick={() => setActiveTab('scout')}
            className={`w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 ${
              activeTab === 'scout'
                ? 'bg-white text-slate-900 dark:bg-slate-800 dark:text-white shadow-sm font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/30'
            }`}
            title="ทะเบียนวุฒิลูกเสือ"
          >
            <Award className={`w-4 h-4 shrink-0 ${activeTab === 'scout' ? 'text-amber-500 dark:text-amber-400' : 'text-slate-400'}`} />
            <span className="truncate">ทะเบียนวุฒิลูกเสือ</span>
          </button>
        </div>
      </div>

      {/* Tab Contents */}
      {activeTab === 'directory' && <ViewStaffDirectory />}
      {activeTab === 'standing' && <ViewRegStanding />}
      {activeTab === 'license' && <ViewRegLicense />}
      {activeTab === 'scout' && <ViewRegScout />}
    </div>
  );
};
