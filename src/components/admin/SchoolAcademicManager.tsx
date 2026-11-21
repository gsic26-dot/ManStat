'use client';

/**
 * ============================================================================
 * ManStat-Modern: School Academic Manager (Minimal & Clean Refactor)
 * ============================================================================
 * Strict Design Rules:
 * - Airy whitespace, subtle borders, high legibility, clear hierarchy
 * - No verbose parenthetical notes
 * - Emerald Green active state for current academic year (No stars)
 * - Distinct highlight when viewing non-active years
 * - Collapsible offered grades panel (defaults to collapsed)
 * - Parallel dual-column census cards (10 มิถุนายน / 10 พฤศจิกายน)
 * - Table header row: ระดับการศึกษา | นักเรียน | ห้องเรียน
 * - Clean input suffix: 'คน' on student input, 'ห้อง' on classroom input
 * - Minimal difference text: '+2 คน' / '-1 คน' (hidden if 0)
 * - Clean card-specific save buttons: 'บันทึกรอบ 10 มิ.ย.' / 'บันทึกรอบ 10 พ.ย.'
 * - Official ก.ค.ศ. ว 23/2563 manpower calculation (3 personnel lines)
 * ============================================================================
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Lock,
  Unlock,
  ChevronDown,
  ChevronUp,
  Plus,
  Check,
  Building,
  Loader2,
} from 'lucide-react';
import { useAcademicCensus } from '@/hooks/useAcademicCensus';
import { ACTIVE_CLASSES, type StudentCensusSnapshotRecord } from '@/lib/data/schoolData';
import { calculateManpowerV23 } from '@/lib/regulations/manpower-v23-2563';

interface SchoolAcademicManagerProps {
  schoolId?: string;
  currentActiveClasses?: string[];
  onSyncSchoolInfo?: (data: {
    academicYear: string;
    studentCount: number;
    activeClasses: string[];
  }) => void;
  showToast: (msg: string, type: 'success' | 'error') => void;
}

export function SchoolAcademicManager({
  schoolId = '30030099',
  currentActiveClasses,
  onSyncSchoolInfo,
  showToast,
}: SchoolAcademicManagerProps) {
  const {
    academicYears,
    activeAcademicYear,
    selectedYear,
    selectedYearId,
    setSelectedYearId,
    censusSnapshots,
    primarySnapshot,
    censusDiff,
    loading,
    setActiveYear,
    createYear,
    updateSnapshot,
    setPrimaryRound,
    toggleLock,
  } = useAcademicCensus(schoolId);

  // Collapsible panel state (Defaults to collapsed)
  const [gradesExpanded, setGradesExpanded] = useState<boolean>(false);

  // Local offered grades state for active editing
  const [offeredGrades, setOfferedGrades] = useState<string[]>(
    currentActiveClasses || ACTIVE_CLASSES
  );

  // Confirmation modal state for setting active year
  const [confirmModalYear, setConfirmModalYear] = useState<{ id: string; yearTh: number } | null>(
    null
  );
  const [isSettingActive, setIsSettingActive] = useState<boolean>(false);

  // Form states for the two snapshot cards
  const [junForm, setJunForm] = useState<Partial<StudentCensusSnapshotRecord>>({});
  const [novForm, setNovForm] = useState<Partial<StudentCensusSnapshotRecord>>({});
  const [savingCard, setSavingCard] = useState<'JUN_10' | 'NOV_10' | null>(null);

  // Find snapshots for June and November
  const junSnapshot = useMemo(() => {
    return censusSnapshots.find((s) => s.roundCode === 'JUN_10');
  }, [censusSnapshots]);

  const novSnapshot = useMemo(() => {
    return censusSnapshots.find((s) => s.roundCode === 'NOV_10');
  }, [censusSnapshots]);

  // Sync snapshot data to local form states when snapshots change
  useEffect(() => {
    if (junSnapshot) {
      setJunForm({
        id: junSnapshot.id,
        kindergartenStudents: junSnapshot.kindergartenStudents,
        kindergartenClassrooms: junSnapshot.kindergartenClassrooms,
        primaryStudents: junSnapshot.primaryStudents,
        primaryClassrooms: junSnapshot.primaryClassrooms,
        secondaryStudents: junSnapshot.secondaryStudents,
        secondaryClassrooms: junSnapshot.secondaryClassrooms,
      });
    } else {
      setJunForm({});
    }
  }, [junSnapshot]);

  useEffect(() => {
    if (novSnapshot) {
      setNovForm({
        id: novSnapshot.id,
        kindergartenStudents: novSnapshot.kindergartenStudents,
        kindergartenClassrooms: novSnapshot.kindergartenClassrooms,
        primaryStudents: novSnapshot.primaryStudents,
        primaryClassrooms: novSnapshot.primaryClassrooms,
        secondaryStudents: novSnapshot.secondaryStudents,
        secondaryClassrooms: novSnapshot.secondaryClassrooms,
      });
    } else {
      setNovForm({});
    }
  }, [novSnapshot]);

  // Sync offered grades when selected year changes
  useEffect(() => {
    if (selectedYear?.offeredGrades && Array.isArray(selectedYear.offeredGrades)) {
      setOfferedGrades(selectedYear.offeredGrades);
    }
  }, [selectedYear]);

  // Trigger parent onSyncSchoolInfo when active academic year or primary snapshot changes
  useEffect(() => {
    if (activeAcademicYear && primarySnapshot && onSyncSchoolInfo) {
      onSyncSchoolInfo({
        academicYear: String(activeAcademicYear.yearTh),
        studentCount: primarySnapshot.totalStudents,
        activeClasses: offeredGrades,
      });
    }
  }, [activeAcademicYear, primarySnapshot, offeredGrades, onSyncSchoolInfo]);

  // Helper to format 1-line grades summary
  const gradesSummary = useMemo(() => {
    if (!offeredGrades || offeredGrades.length === 0) {
      return 'ระดับชั้นที่เปิดสอน · ยังไม่ได้กำหนด';
    }
    const shortNames = offeredGrades.map((g) => {
      if (g.startsWith('อนุบาล')) return 'อ.' + g.replace('อนุบาล', '').trim();
      if (g.startsWith('ประถมศึกษาปีที่')) return 'ป.' + g.replace('ประถมศึกษาปีที่', '').trim();
      if (g.startsWith('มัธยมศึกษาปีที่')) return 'ม.' + g.replace('มัธยมศึกษาปีที่', '').trim();
      return g;
    });
    const first = shortNames[0];
    const last = shortNames[shortNames.length - 1];
    return `ระดับชั้นที่เปิดสอน · ${first} – ${last} · ${offeredGrades.length} ระดับชั้น`;
  }, [offeredGrades]);

  // Handle adding next academic year
  const handleAddYear = async () => {
    try {
      const nextYear =
        academicYears.length > 0
          ? Math.max(...academicYears.map((y) => y.yearTh)) + 1
          : 2570;

      const newId = await createYear(nextYear);
      setSelectedYearId(newId);
      showToast(`สร้างปีการศึกษา ${nextYear} สำเร็จ`, 'success');
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการสร้างปีการศึกษาใหม่', 'error');
    }
  };

  // Handle setting active year
  const handleConfirmSetActive = async () => {
    if (!confirmModalYear) return;
    try {
      setIsSettingActive(true);
      await setActiveYear(confirmModalYear.id);
      showToast(`ตั้งปีการศึกษา ${confirmModalYear.yearTh} เป็นปีปัจจุบันสำเร็จ`, 'success');
      setConfirmModalYear(null);
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการตั้งปีการศึกษาปัจจุบัน', 'error');
    } finally {
      setIsSettingActive(false);
    }
  };

  // Handle setting primary round
  const handleSetPrimary = async (snapshotId?: string) => {
    if (!snapshotId || !selectedYear) return;
    try {
      await setPrimaryRound(selectedYear.id, snapshotId);
      showToast('เปลี่ยนรอบหลักสำหรับคำนวณอัตรากำลังสำเร็จ', 'success');
    } catch (err: any) {
      showToast(err.message || 'ไม่สามารถเปลี่ยนรอบหลักได้', 'error');
    }
  };

  // Handle locking snapshot
  const handleToggleLock = async (snapshot?: StudentCensusSnapshotRecord) => {
    if (!snapshot) return;
    try {
      await toggleLock(snapshot.id, !snapshot.isLocked);
      showToast(snapshot.isLocked ? 'ปลดล็อกรอบสำเร็จ' : 'ล็อกรอบสำเร็จ', 'success');
    } catch (err: any) {
      showToast(err.message || 'ไม่สามารถเปลี่ยนสถานะล็อกได้', 'error');
    }
  };

  // Handle saving snapshot card
  const handleSaveSnapshot = async (roundCode: 'JUN_10' | 'NOV_10') => {
    const isJun = roundCode === 'JUN_10';
    const snapshot = isJun ? junSnapshot : novSnapshot;
    const form = isJun ? junForm : novForm;

    if (!snapshot) {
      showToast('ไม่พบข้อมูลรอบสถิตินักเรียน', 'error');
      return;
    }

    if (snapshot.isLocked) {
      showToast('รอบนี้ถูกล็อกแล้ว ไม่สามารถแก้ไขได้', 'error');
      return;
    }

    setSavingCard(roundCode);
    try {
      await updateSnapshot({
        id: snapshot.id,
        kindergartenStudents: Number(form.kindergartenStudents) || 0,
        kindergartenClassrooms: Number(form.kindergartenClassrooms) || 0,
        primaryStudents: Number(form.primaryStudents) || 0,
        primaryClassrooms: Number(form.primaryClassrooms) || 0,
        secondaryStudents: Number(form.secondaryStudents) || 0,
        secondaryClassrooms: Number(form.secondaryClassrooms) || 0,
      });
      showToast(`บันทึกข้อมูลรอบ ${isJun ? '10 มิถุนายน' : '10 พฤศจิกายน'} สำเร็จ`, 'success');
    } catch (err: any) {
      showToast(err.message || 'ไม่สามารถบันทึกข้อมูลได้', 'error');
    } finally {
      setSavingCard(null);
    }
  };

  // Official ว 23/2563 Manpower Calculation
  const junCalc = useMemo(() => {
    return calculateManpowerV23({
      kStudents: junForm.kindergartenStudents,
      kRooms: junForm.kindergartenClassrooms,
      pStudents: junForm.primaryStudents,
      pRooms: junForm.primaryClassrooms,
      mLowerStudents: junForm.secondaryStudents,
      mLowerRooms: junForm.secondaryClassrooms,
    });
  }, [junForm]);

  const novCalc = useMemo(() => {
    return calculateManpowerV23({
      kStudents: novForm.kindergartenStudents,
      kRooms: novForm.kindergartenClassrooms,
      pStudents: novForm.primaryStudents,
      pRooms: novForm.primaryClassrooms,
      mLowerStudents: novForm.secondaryStudents,
      mLowerRooms: novForm.secondaryClassrooms,
    });
  }, [novForm]);

  if (loading && academicYears.length === 0) {
    return (
      <div className="py-8 flex items-center justify-center gap-2 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">กำลังโหลดข้อมูลปีการศึกษา...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ------------------------------------------------------------------ */}
      {/* 1. Academic Year Selector (Green Active State & Clean Highlights)  */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mr-1">
            ปีการศึกษา
          </span>
          <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800/80 p-0.5 border border-slate-200/60 dark:border-slate-700/60 gap-1">
            {academicYears.map((year) => {
              const isViewing = year.id === (selectedYear?.id || selectedYearId);
              const isActive = Boolean(year.isActive);

              let btnClass = 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800';
              if (isActive) {
                if (isViewing) {
                  btnClass = 'bg-emerald-600 text-white font-semibold shadow-xs ring-2 ring-emerald-400/50 dark:ring-emerald-500/40';
                } else {
                  btnClass = 'bg-emerald-600/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/40 font-medium hover:bg-emerald-600/25';
                }
              } else if (isViewing) {
                btnClass = 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold ring-1 ring-sky-500 dark:ring-sky-400';
              }

              return (
                <button
                  key={year.id}
                  type="button"
                  onClick={() => setSelectedYearId(year.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-all ${btnClass}`}
                >
                  {year.yearTh}
                </button>
              );
            })}
          </div>

          {/* Active status badge or Activate button */}
          {selectedYear?.isActive ? (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium px-2 py-1">
              <Check className="w-3.5 h-3.5" />
              <span>ใช้งานอยู่</span>
            </span>
          ) : selectedYear ? (
            <button
              type="button"
              onClick={() =>
                setConfirmModalYear({ id: selectedYear.id, yearTh: selectedYear.yearTh })
              }
              className="inline-flex items-center gap-1 text-xs text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 hover:underline px-2 py-1 font-medium transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              <span>ตั้งเป็นปีปัจจุบัน</span>
            </button>
          ) : null}
        </div>

        <button
          type="button"
          onClick={handleAddYear}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-2.5 py-1.5 rounded-lg border border-slate-200/90 dark:border-slate-700/70 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>เพิ่มปีการศึกษา</span>
        </button>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 2. Collapsible Offered Grades Panel                                */}
      {/* ------------------------------------------------------------------ */}
      <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
        <button
          type="button"
          onClick={() => setGradesExpanded(!gradesExpanded)}
          className="w-full flex items-center justify-between p-3 bg-slate-50/50 dark:bg-slate-900/40 hover:bg-slate-100/60 dark:hover:bg-slate-800/50 transition-colors text-left"
        >
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-slate-400" />
            <span className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">
              {gradesSummary}
            </span>
          </div>
          {gradesExpanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
          )}
        </button>

        {gradesExpanded && (
          <div className="p-3.5 bg-white dark:bg-slate-900/80 border-t border-slate-200/80 dark:border-slate-800">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {ACTIVE_CLASSES.map((cls) => {
                const isOffered = offeredGrades.includes(cls);
                return (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => {
                      let nextGrades: string[];
                      if (isOffered) {
                        nextGrades = offeredGrades.filter((c) => c !== cls);
                      } else {
                        nextGrades = [...offeredGrades, cls];
                      }
                      setOfferedGrades(nextGrades);
                    }}
                    className={`py-2 px-2.5 rounded-lg border text-xs text-center font-medium transition-colors ${
                      isOffered
                        ? 'bg-sky-50 dark:bg-sky-950/30 border-sky-300 dark:border-sky-800 text-sky-700 dark:text-sky-300'
                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700/60 text-slate-400 dark:text-slate-500 line-through opacity-60'
                    }`}
                  >
                    {cls}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 3. Dual-column Student Census Cards: 10 มิ.ย. & 10 พ.ย.           */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-1">
        {/* CARD LEFT: 10 มิถุนายน */}
        <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-4 space-y-3.5 shadow-xs">
          {/* Card Header */}
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800/80">
            <span className="font-semibold text-sm text-slate-900 dark:text-white">
              10 มิถุนายน
            </span>

            <div className="flex items-center gap-2.5">
              <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                <input
                  type="radio"
                  name="primary_round"
                  checked={Boolean(junSnapshot?.isPrimaryForManpower)}
                  onChange={() => handleSetPrimary(junSnapshot?.id)}
                  className="w-3.5 h-3.5 text-sky-600 border-slate-300 dark:border-slate-600 focus:ring-0"
                />
                <span>รอบหลัก</span>
              </label>

              <button
                type="button"
                onClick={() => handleToggleLock(junSnapshot)}
                title={junSnapshot?.isLocked ? 'ปลดล็อก' : 'ล็อก'}
                className={`p-1.5 rounded-lg border transition-colors ${
                  junSnapshot?.isLocked
                    ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
                }`}
              >
                {junSnapshot?.isLocked ? (
                  <Lock className="w-3.5 h-3.5" />
                ) : (
                  <Unlock className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* Form Rows */}
          <div className="space-y-2 text-xs">
            {/* Header row */}
            <div className="grid grid-cols-3 items-center gap-2 pb-1 text-[11px] font-medium text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800/60">
              <span>ระดับการศึกษา</span>
              <span className="text-center">นักเรียน</span>
              <span className="text-center">ห้องเรียน</span>
            </div>

            {/* Kindergarten */}
            <div className="grid grid-cols-3 items-center gap-2">
              <span className="text-slate-600 dark:text-slate-400">ระดับอนุบาล</span>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  disabled={Boolean(junSnapshot?.isLocked)}
                  value={junForm.kindergartenStudents ?? ''}
                  onChange={(e) =>
                    setJunForm({
                      ...junForm,
                      kindergartenStudents: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg pl-2.5 pr-7 py-1.5 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-sky-500 disabled:opacity-60"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 dark:text-slate-500 pointer-events-none">
                  คน
                </span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  disabled={Boolean(junSnapshot?.isLocked)}
                  value={junForm.kindergartenClassrooms ?? ''}
                  onChange={(e) =>
                    setJunForm({
                      ...junForm,
                      kindergartenClassrooms: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg pl-2.5 pr-8 py-1.5 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-sky-500 disabled:opacity-60"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 dark:text-slate-500 pointer-events-none">
                  ห้อง
                </span>
              </div>
            </div>

            {/* Primary */}
            <div className="grid grid-cols-3 items-center gap-2">
              <span className="text-slate-600 dark:text-slate-400">ระดับประถม</span>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  disabled={Boolean(junSnapshot?.isLocked)}
                  value={junForm.primaryStudents ?? ''}
                  onChange={(e) =>
                    setJunForm({
                      ...junForm,
                      primaryStudents: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg pl-2.5 pr-7 py-1.5 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-sky-500 disabled:opacity-60"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 dark:text-slate-500 pointer-events-none">
                  คน
                </span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  disabled={Boolean(junSnapshot?.isLocked)}
                  value={junForm.primaryClassrooms ?? ''}
                  onChange={(e) =>
                    setJunForm({
                      ...junForm,
                      primaryClassrooms: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg pl-2.5 pr-8 py-1.5 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-sky-500 disabled:opacity-60"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 dark:text-slate-500 pointer-events-none">
                  ห้อง
                </span>
              </div>
            </div>

            {/* Secondary */}
            <div className="grid grid-cols-3 items-center gap-2">
              <span className="text-slate-600 dark:text-slate-400">ระดับมัธยม</span>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  disabled={Boolean(junSnapshot?.isLocked)}
                  value={junForm.secondaryStudents ?? ''}
                  onChange={(e) =>
                    setJunForm({
                      ...junForm,
                      secondaryStudents: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg pl-2.5 pr-7 py-1.5 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-sky-500 disabled:opacity-60"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 dark:text-slate-500 pointer-events-none">
                  คน
                </span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  disabled={Boolean(junSnapshot?.isLocked)}
                  value={junForm.secondaryClassrooms ?? ''}
                  onChange={(e) =>
                    setJunForm({
                      ...junForm,
                      secondaryClassrooms: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg pl-2.5 pr-8 py-1.5 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-sky-500 disabled:opacity-60"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 dark:text-slate-500 pointer-events-none">
                  ห้อง
                </span>
              </div>
            </div>
          </div>

          {/* Footer Summary & Action */}
          <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
            <div className="space-y-0.5 text-xs text-slate-600 dark:text-slate-400">
              <div className="font-medium text-slate-700 dark:text-slate-300">
                {junCalc.summaryStudentsAndRooms}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                {junCalc.summaryManpower}
              </div>
            </div>

            <button
              type="button"
              disabled={Boolean(junSnapshot?.isLocked) || savingCard === 'JUN_10'}
              onClick={() => handleSaveSnapshot('JUN_10')}
              className="text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 disabled:opacity-40 transition-colors shrink-0"
            >
              {savingCard === 'JUN_10' ? 'กำลังบันทึก...' : 'บันทึกรอบ 10 มิ.ย.'}
            </button>
          </div>
        </div>

        {/* CARD RIGHT: 10 พฤศจิกายน */}
        <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-4 space-y-3.5 shadow-xs">
          {/* Card Header */}
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-slate-900 dark:text-white">
                10 พฤศจิกายน
              </span>
              {/* Shortest Difference display: e.g. +2 คน, -1 คน (hidden if 0) */}
              {censusDiff && censusDiff.diffStudents !== 0 && (
                <span
                  className={`text-xs font-mono font-medium ${
                    censusDiff.diffStudents > 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {censusDiff.diffStudents > 0 ? `+${censusDiff.diffStudents}` : censusDiff.diffStudents} คน
                </span>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                <input
                  type="radio"
                  name="primary_round"
                  checked={Boolean(novSnapshot?.isPrimaryForManpower)}
                  onChange={() => handleSetPrimary(novSnapshot?.id)}
                  className="w-3.5 h-3.5 text-sky-600 border-slate-300 dark:border-slate-600 focus:ring-0"
                />
                <span>รอบหลัก</span>
              </label>

              <button
                type="button"
                onClick={() => handleToggleLock(novSnapshot)}
                title={novSnapshot?.isLocked ? 'ปลดล็อก' : 'ล็อก'}
                className={`p-1.5 rounded-lg border transition-colors ${
                  novSnapshot?.isLocked
                    ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
                }`}
              >
                {novSnapshot?.isLocked ? (
                  <Lock className="w-3.5 h-3.5" />
                ) : (
                  <Unlock className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* Form Rows */}
          <div className="space-y-2 text-xs">
            {/* Header row */}
            <div className="grid grid-cols-3 items-center gap-2 pb-1 text-[11px] font-medium text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800/60">
              <span>ระดับการศึกษา</span>
              <span className="text-center">นักเรียน</span>
              <span className="text-center">ห้องเรียน</span>
            </div>

            {/* Kindergarten */}
            <div className="grid grid-cols-3 items-center gap-2">
              <span className="text-slate-600 dark:text-slate-400">ระดับอนุบาล</span>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  disabled={Boolean(novSnapshot?.isLocked)}
                  value={novForm.kindergartenStudents ?? ''}
                  onChange={(e) =>
                    setNovForm({
                      ...novForm,
                      kindergartenStudents: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg pl-2.5 pr-7 py-1.5 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-sky-500 disabled:opacity-60"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 dark:text-slate-500 pointer-events-none">
                  คน
                </span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  disabled={Boolean(novSnapshot?.isLocked)}
                  value={novForm.kindergartenClassrooms ?? ''}
                  onChange={(e) =>
                    setNovForm({
                      ...novForm,
                      kindergartenClassrooms: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg pl-2.5 pr-8 py-1.5 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-sky-500 disabled:opacity-60"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 dark:text-slate-500 pointer-events-none">
                  ห้อง
                </span>
              </div>
            </div>

            {/* Primary */}
            <div className="grid grid-cols-3 items-center gap-2">
              <span className="text-slate-600 dark:text-slate-400">ระดับประถม</span>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  disabled={Boolean(novSnapshot?.isLocked)}
                  value={novForm.primaryStudents ?? ''}
                  onChange={(e) =>
                    setNovForm({
                      ...novForm,
                      primaryStudents: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg pl-2.5 pr-7 py-1.5 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-sky-500 disabled:opacity-60"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 dark:text-slate-500 pointer-events-none">
                  คน
                </span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  disabled={Boolean(novSnapshot?.isLocked)}
                  value={novForm.primaryClassrooms ?? ''}
                  onChange={(e) =>
                    setNovForm({
                      ...novForm,
                      primaryClassrooms: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg pl-2.5 pr-8 py-1.5 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-sky-500 disabled:opacity-60"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 dark:text-slate-500 pointer-events-none">
                  ห้อง
                </span>
              </div>
            </div>

            {/* Secondary */}
            <div className="grid grid-cols-3 items-center gap-2">
              <span className="text-slate-600 dark:text-slate-400">ระดับมัธยม</span>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  disabled={Boolean(novSnapshot?.isLocked)}
                  value={novForm.secondaryStudents ?? ''}
                  onChange={(e) =>
                    setNovForm({
                      ...novForm,
                      secondaryStudents: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg pl-2.5 pr-7 py-1.5 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-sky-500 disabled:opacity-60"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 dark:text-slate-500 pointer-events-none">
                  คน
                </span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  disabled={Boolean(novSnapshot?.isLocked)}
                  value={novForm.secondaryClassrooms ?? ''}
                  onChange={(e) =>
                    setNovForm({
                      ...novForm,
                      secondaryClassrooms: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg pl-2.5 pr-8 py-1.5 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-sky-500 disabled:opacity-60"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 dark:text-slate-500 pointer-events-none">
                  ห้อง
                </span>
              </div>
            </div>
          </div>

          {/* Footer Summary & Action */}
          <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
            <div className="space-y-0.5 text-xs text-slate-600 dark:text-slate-400">
              <div className="font-medium text-slate-700 dark:text-slate-300">
                {novCalc.summaryStudentsAndRooms}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                {novCalc.summaryManpower}
              </div>
            </div>

            <button
              type="button"
              disabled={Boolean(novSnapshot?.isLocked) || savingCard === 'NOV_10'}
              onClick={() => handleSaveSnapshot('NOV_10')}
              className="text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 disabled:opacity-40 transition-colors shrink-0"
            >
              {savingCard === 'NOV_10' ? 'กำลังบันทึก...' : 'บันทึกรอบ 10 พ.ย.'}
            </button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 4. Confirmation Modal for Setting Active Year                     */}
      {/* ------------------------------------------------------------------ */}
      {confirmModalYear && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-sm w-full p-5 space-y-4">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              ยืนยันการเปลี่ยนปีการศึกษา
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              ต้องการตั้งปีการศึกษา <strong className="text-slate-900 dark:text-white">{confirmModalYear.yearTh}</strong> เป็นปีปัจจุบันหรือไม่?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isSettingActive}
                onClick={() => setConfirmModalYear(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={isSettingActive}
                onClick={handleConfirmSetActive}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-sky-600 hover:bg-sky-500 text-white transition-colors"
              >
                {isSettingActive ? 'กำลังดำเนินการ...' : 'ยืนยัน'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
