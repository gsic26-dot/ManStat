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

import React, { useState, useEffect, useMemo } from 'react';
import {
  Lock,
  Unlock,
  ChevronDown,
  ChevronUp,
  Plus,
  Minus,
  Check,
  Building,
  Loader2,
  Trash2,
} from 'lucide-react';
import { useAcademicCensus } from '@/hooks/useAcademicCensus';
import { ACTIVE_CLASSES, type StudentCensusSnapshotRecord } from '@/lib/data/schoolData';
import { calculateManpowerV23 } from '@/lib/regulations/manpower-v23-2563';

/**
 * Calculates current semester based on official OBEC / สพฐ. academic calendar:
 * - 16 May – 31 October -> Semester 1
 * - 1 November – 15 May -> Semester 2
 */
export function getAutoSemesterByCalendar(currentDate: Date = new Date()): 1 | 2 {
  const month = currentDate.getMonth() + 1; // 1-indexed (1..12)
  const day = currentDate.getDate();

  // 16 May to 31 October
  if ((month === 5 && day >= 16) || (month > 5 && month < 11) || (month === 10 && day <= 31)) {
    return 1;
  }
  // 1 November to 15 May
  return 2;
}

/**
 * Smart classroom sync between active grades count and classroom count
 * - When grade count is 0 -> 0 rooms
 * - Otherwise ensures at least 1 room per offered grade, preserving manual increases
 */
export function syncTierClassrooms(currentRooms: number, newGradeCount: number): number {
  if (newGradeCount === 0) return 0;
  return Math.max(currentRooms, newGradeCount);
}

/**
 * Counts selected active grades partitioned by education tier
 */
export function countGradesPerTier(grades: string[]): {
  kGrades: number;
  pGrades: number;
  mGrades: number;
} {
  const kList = ['อนุบาล 1', 'อนุบาล 2', 'อนุบาล 3'];
  const pList = [
    'ประถมศึกษาปีที่ 1',
    'ประถมศึกษาปีที่ 2',
    'ประถมศึกษาปีที่ 3',
    'ประถมศึกษาปีที่ 4',
    'ประถมศึกษาปีที่ 5',
    'ประถมศึกษาปีที่ 6',
  ];
  const mList = ['มัธยมศึกษาปีที่ 1', 'มัธยมศึกษาปีที่ 2', 'มัธยมศึกษาปีที่ 3'];

  return {
    kGrades: grades.filter((g) => kList.includes(g)).length,
    pGrades: grades.filter((g) => pList.includes(g)).length,
    mGrades: grades.filter((g) => mList.includes(g)).length,
  };
}

/**
 * Formats a clean 1-line summary of offered grades strictly following
 * standard pedagogical order (ACTIVE_CLASSES).
 */
export function formatOfferedGradesSummary(grades: string[]): string {
  if (!grades || grades.length === 0) {
    return 'ระดับชั้นที่เปิดสอน · ยังไม่ได้กำหนด';
  }
  // Sort strictly according to ACTIVE_CLASSES standard ordering
  const sorted = [...grades].sort(
    (a, b) => ACTIVE_CLASSES.indexOf(a) - ACTIVE_CLASSES.indexOf(b)
  );
  const shortNames = sorted.map((g) => {
    if (g.startsWith('อนุบาล')) return 'อ.' + g.replace('อนุบาล', '').trim();
    if (g.startsWith('ประถมศึกษาปีที่')) return 'ป.' + g.replace('ประถมศึกษาปีที่', '').trim();
    if (g.startsWith('มัธยมศึกษาปีที่')) return 'ม.' + g.replace('มัธยมศึกษาปีที่', '').trim();
    return g;
  });
  const first = shortNames[0];
  const last = shortNames[shortNames.length - 1];
  const range = first === last ? first : `${first} – ${last}`;
  return `ระดับชั้นที่เปิดสอน · ${range} · ${sorted.length} ระดับชั้น`;
}

/**
 * Calculates student difference between Nov 10 and Jun 10 rounds live in real time
 */
export function calculateLiveCensusDiff(novTotalStudents: number, junTotalStudents: number): number {
  return (novTotalStudents || 0) - (junTotalStudents || 0);
}

/**
 * Determines whether the primary census round should be June 10 or Nov 10
 * based on the official school calendar.
 * In a Thai academic year (e.g. 2569 / CE 2026):
 * - Prior to November 10 of that year: 'JUN_10' is active/primary.
 * - From November 10 onwards: 'NOV_10' is active/primary.
 */
export function getAutoPrimaryRoundByCalendar(
  yearTh: number,
  currentDate: Date = new Date()
): 'JUN_10' | 'NOV_10' {
  const yearCe = yearTh - 543;
  const nov10 = new Date(yearCe, 10, 10, 0, 0, 0); // Month 10 is November
  return currentDate >= nov10 ? 'NOV_10' : 'JUN_10';
}

/**
 * Stepper component for incrementing/decrementing classroom counts
 */
interface ClassroomStepperProps {
  value: number;
  disabled?: boolean;
  onChange: (val: number) => void;
}

export function ClassroomStepper({ value, disabled = false, onChange }: ClassroomStepperProps) {
  const numValue = Number(value) || 0;
  return (
    <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 overflow-hidden h-8">
      <button
        type="button"
        disabled={disabled || numValue <= 0}
        onClick={() => onChange(Math.max(0, numValue - 1))}
        className="px-2 h-full flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
        title="ลดจำนวนห้องเรียน"
        aria-label="ลดจำนวนห้องเรียน"
      >
        <Minus className="w-3.5 h-3.5" />
      </button>
      <div className="relative flex-1 h-full flex items-center justify-center">
        <input
          type="number"
          min="0"
          disabled={disabled}
          value={numValue === 0 ? '' : numValue}
          placeholder="0"
          onChange={(e) => onChange(Math.max(0, parseInt(e.target.value) || 0))}
          className="w-full h-full bg-transparent text-center text-xs font-mono font-semibold text-slate-900 dark:text-white focus:outline-none disabled:opacity-60 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <span className="text-[10px] text-slate-400 dark:text-slate-500 pr-1 pointer-events-none shrink-0">
          ห้อง
        </span>
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(numValue + 1)}
        className="px-2 h-full flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
        title="เพิ่มจำนวนห้องเรียน"
        aria-label="เพิ่มจำนวนห้องเรียน"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

interface SchoolAcademicManagerProps {
  schoolId?: string;
  currentActiveClasses?: string[];
  currentTerm?: string;
  onSemesterChange?: (term: string) => void;
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
  currentTerm,
  onSemesterChange,
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
    loading,
    setActiveYear,
    createYear,
    deleteYear,
    updateOfferedGrades,
    updateSnapshot,
    setPrimaryRound,
    toggleLock,
  } = useAcademicCensus(schoolId);

  // Semester state (1 or 2) - Defaults to calendar calculation, can be overridden by prop or user click
  const [selectedSemester, setSelectedSemester] = useState<1 | 2>(() => {
    if (currentTerm === '1' || currentTerm === '2') {
      return Number(currentTerm) as 1 | 2;
    }
    return getAutoSemesterByCalendar();
  });

  // Keep semester in sync if parent currentTerm changes
  useEffect(() => {
    if (currentTerm === '1' || currentTerm === '2') {
      setSelectedSemester(Number(currentTerm) as 1 | 2);
    }
  }, [currentTerm]);

  const handleSemesterChange = (term: 1 | 2) => {
    setSelectedSemester(term);
    if (onSemesterChange) {
      onSemesterChange(String(term));
    }
  };

  // Delete academic year modal state
  const [deleteModalYear, setDeleteModalYear] = useState<{ id: string; yearTh: number } | null>(
    null
  );
  const [deletePassword, setDeletePassword] = useState<string>('');
  const [isDeletingYear, setIsDeletingYear] = useState<boolean>(false);

  // Collapsible panel state (Defaults to collapsed)
  const [gradesExpanded, setGradesExpanded] = useState<boolean>(false);

  // Local offered grades state for active editing (sorted by standard order)
  const [offeredGrades, setOfferedGrades] = useState<string[]>(() => {
    const initial = currentActiveClasses || ACTIVE_CLASSES;
    return [...initial].sort((a, b) => ACTIVE_CLASSES.indexOf(a) - ACTIVE_CLASSES.indexOf(b));
  });

  // Track manual override for primary round if user explicitly clicks radio
  const [manualPrimaryRound, setManualPrimaryRound] = useState<'JUN_10' | 'NOV_10' | null>(null);

  // Confirmation modal state for setting active year
  const [confirmModalYear, setConfirmModalYear] = useState<{ id: string; yearTh: number } | null>(
    null
  );
  const [isSettingActive, setIsSettingActive] = useState<boolean>(false);

  // Reset manual override whenever selected year changes
  useEffect(() => {
    setManualPrimaryRound(null);
  }, [selectedYearId]);

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
      const { kGrades, pGrades, mGrades } = countGradesPerTier(offeredGrades);
      const isLocked = Boolean(junSnapshot.isLocked);
      const snapK = junSnapshot.kindergartenClassrooms;
      const snapP = junSnapshot.primaryClassrooms;
      const snapS = junSnapshot.secondaryClassrooms;

      setJunForm({
        id: junSnapshot.id,
        kindergartenStudents: junSnapshot.kindergartenStudents ?? 0,
        kindergartenClassrooms:
          !isLocked && (snapK === undefined || snapK === null || (snapK === 0 && kGrades > 0))
            ? kGrades
            : (snapK ?? kGrades),
        primaryStudents: junSnapshot.primaryStudents ?? 0,
        primaryClassrooms:
          !isLocked && (snapP === undefined || snapP === null || (snapP === 0 && pGrades > 0))
            ? pGrades
            : (snapP ?? pGrades),
        secondaryStudents: junSnapshot.secondaryStudents ?? 0,
        secondaryClassrooms:
          !isLocked && (snapS === undefined || snapS === null || (snapS === 0 && mGrades > 0))
            ? mGrades
            : (snapS ?? mGrades),
      });
    } else {
      setJunForm({});
    }
  }, [junSnapshot]);

  useEffect(() => {
    if (novSnapshot) {
      const { kGrades, pGrades, mGrades } = countGradesPerTier(offeredGrades);
      const isLocked = Boolean(novSnapshot.isLocked);
      const snapK = novSnapshot.kindergartenClassrooms;
      const snapP = novSnapshot.primaryClassrooms;
      const snapS = novSnapshot.secondaryClassrooms;

      setNovForm({
        id: novSnapshot.id,
        kindergartenStudents: novSnapshot.kindergartenStudents ?? 0,
        kindergartenClassrooms:
          !isLocked && (snapK === undefined || snapK === null || (snapK === 0 && kGrades > 0))
            ? kGrades
            : (snapK ?? kGrades),
        primaryStudents: novSnapshot.primaryStudents ?? 0,
        primaryClassrooms:
          !isLocked && (snapP === undefined || snapP === null || (snapP === 0 && pGrades > 0))
            ? pGrades
            : (snapP ?? pGrades),
        secondaryStudents: novSnapshot.secondaryStudents ?? 0,
        secondaryClassrooms:
          !isLocked && (snapS === undefined || snapS === null || (snapS === 0 && mGrades > 0))
            ? mGrades
            : (snapS ?? mGrades),
      });
    } else {
      setNovForm({});
    }
  }, [novSnapshot]);

  // Sync offered grades when selected year changes
  useEffect(() => {
    if (selectedYear?.offeredGrades && Array.isArray(selectedYear.offeredGrades)) {
      const sorted = [...selectedYear.offeredGrades].sort(
        (a, b) => ACTIVE_CLASSES.indexOf(a) - ACTIVE_CLASSES.indexOf(b)
      );
      setOfferedGrades(sorted);
    }
  }, [selectedYear]);

  // Helper to format 1-line grades summary
  const gradesSummary = useMemo(() => {
    return formatOfferedGradesSummary(offeredGrades);
  }, [offeredGrades]);

  // Toggle grade selection, smart sync classrooms and persist to database
  const handleToggleGrade = async (cls: string) => {
    let nextGrades: string[];
    if (offeredGrades.includes(cls)) {
      nextGrades = offeredGrades.filter((c) => c !== cls);
    } else {
      nextGrades = [...offeredGrades, cls];
    }
    // Maintain standard ordering
    nextGrades.sort((a, b) => ACTIVE_CLASSES.indexOf(a) - ACTIVE_CLASSES.indexOf(b));
    setOfferedGrades(nextGrades);

    const { kGrades, pGrades, mGrades } = countGradesPerTier(nextGrades);

    // Smart classroom sync for both June 10 and November 10 cards
    // Preserves manual additions while guaranteeing minimum of 1 room per active grade
    setJunForm((prev) => ({
      ...prev,
      kindergartenClassrooms: syncTierClassrooms(Number(prev.kindergartenClassrooms) || 0, kGrades),
      primaryClassrooms: syncTierClassrooms(Number(prev.primaryClassrooms) || 0, pGrades),
      secondaryClassrooms: syncTierClassrooms(Number(prev.secondaryClassrooms) || 0, mGrades),
    }));

    setNovForm((prev) => ({
      ...prev,
      kindergartenClassrooms: syncTierClassrooms(Number(prev.kindergartenClassrooms) || 0, kGrades),
      primaryClassrooms: syncTierClassrooms(Number(prev.primaryClassrooms) || 0, pGrades),
      secondaryClassrooms: syncTierClassrooms(Number(prev.secondaryClassrooms) || 0, mGrades),
    }));

    // Inform parent component immediately for full synchronization
    if (activeAcademicYear && onSyncSchoolInfo) {
      const effectiveSnapshot = effectivePrimaryRound === 'JUN_10' ? junSnapshot : novSnapshot;
      const effectiveCalc = effectivePrimaryRound === 'JUN_10' ? junCalc : novCalc;
      const studentCount = effectiveSnapshot?.totalStudents ?? effectiveCalc.totalStudents ?? 0;
      onSyncSchoolInfo({
        academicYear: String(activeAcademicYear.yearTh),
        studentCount,
        activeClasses: nextGrades,
      });
    }

    // Persist to backend academic_years table immediately
    if (selectedYear) {
      try {
        await updateOfferedGrades(selectedYear.id, nextGrades);
      } catch (err: any) {
        showToast(err.message || 'ไม่สามารถบันทึกระดับชั้นที่เปิดสอนได้', 'error');
      }
    }
  };

  // Handle deleting non-active academic year
  const handleConfirmDeleteYear = async () => {
    if (!deleteModalYear) return;
    try {
      setIsDeletingYear(true);
      await deleteYear(deleteModalYear.id, deletePassword);
      showToast(`ลบปีการศึกษา ${deleteModalYear.yearTh} สำเร็จ`, 'success');
      setDeleteModalYear(null);
      setDeletePassword('');
    } catch (err: any) {
      showToast(err.message || 'ไม่สามารถลบปีการศึกษาได้', 'error');
    } finally {
      setIsDeletingYear(false);
    }
  };

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

  // Derived: Active/Selected Academic Year Thai number for headers
  const currentYearTh =
    selectedYear?.yearTh ||
    activeAcademicYear?.yearTh ||
    (academicYears.length > 0 ? academicYears[0].yearTh : 2569);

  // Derived: Student difference between Nov 10 and Jun 10 computed live from active form values
  const liveDiffStudents = calculateLiveCensusDiff(
    novCalc.totalStudents || 0,
    junCalc.totalStudents || 0
  );

  // Auto-calculated primary round from official school calendar
  const calendarAutoRound = useMemo(() => {
    return getAutoPrimaryRoundByCalendar(currentYearTh);
  }, [currentYearTh]);

  // Effective primary round: User manual selection > Database explicit flag > Calendar automatic determination
  const effectivePrimaryRound = useMemo<'JUN_10' | 'NOV_10'>(() => {
    if (manualPrimaryRound) return manualPrimaryRound;
    if (junSnapshot?.isPrimaryForManpower) return 'JUN_10';
    if (novSnapshot?.isPrimaryForManpower) return 'NOV_10';
    return calendarAutoRound;
  }, [manualPrimaryRound, junSnapshot, novSnapshot, calendarAutoRound]);

  // Trigger parent onSyncSchoolInfo when active academic year or effective primary snapshot changes
  useEffect(() => {
    if (activeAcademicYear && onSyncSchoolInfo) {
      const effectiveSnapshot = effectivePrimaryRound === 'JUN_10' ? junSnapshot : novSnapshot;
      const effectiveCalc = effectivePrimaryRound === 'JUN_10' ? junCalc : novCalc;
      const studentCount = effectiveSnapshot?.totalStudents ?? effectiveCalc.totalStudents ?? 0;
      onSyncSchoolInfo({
        academicYear: String(activeAcademicYear.yearTh),
        studentCount,
        activeClasses: offeredGrades,
      });
    }
  }, [
    activeAcademicYear,
    effectivePrimaryRound,
    junSnapshot,
    novSnapshot,
    junCalc,
    novCalc,
    offeredGrades,
    onSyncSchoolInfo,
  ]);

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

          {/* Semester (ภาคเรียน) Segmented Control: [ 1 ] [ 2 ] */}
          <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-slate-200/80 dark:border-slate-700/80">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              ภาคเรียน
            </span>
            <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800/80 p-0.5 border border-slate-200/60 dark:border-slate-700/60 gap-0.5">
              <button
                type="button"
                onClick={() => handleSemesterChange(1)}
                className={`px-2.5 py-1 rounded-lg text-xs transition-all ${
                  selectedSemester === 1
                    ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                1
              </button>
              <button
                type="button"
                onClick={() => handleSemesterChange(2)}
                className={`px-2.5 py-1 rounded-lg text-xs transition-all ${
                  selectedSemester === 2
                    ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                2
              </button>
            </div>
          </div>

          {/* Delete non-active academic year button */}
          {selectedYear && !selectedYear.isActive && (
            <button
              type="button"
              onClick={() =>
                setDeleteModalYear({ id: selectedYear.id, yearTh: selectedYear.yearTh })
              }
              className="inline-flex items-center gap-1 text-xs text-rose-500 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30 px-2 py-1 rounded-lg transition-colors ml-1"
              title="ลบปีการศึกษา"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>ลบปีการศึกษา</span>
            </button>
          )}
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
                    onClick={() => handleToggleGrade(cls)}
                    className={`py-2 px-2.5 rounded-lg border text-xs text-center font-medium transition-all ${
                      isOffered
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-600 text-emerald-800 dark:text-emerald-200 font-semibold shadow-xs ring-1 ring-emerald-400/30'
                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700/60 text-slate-400 dark:text-slate-500 line-through opacity-60 hover:opacity-80'
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
              10 มิถุนายน {currentYearTh}
            </span>

            <div className="flex items-center gap-2.5">
              <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                <input
                  type="radio"
                  name="primary_round"
                  checked={effectivePrimaryRound === 'JUN_10'}
                  onChange={() => {
                    setManualPrimaryRound('JUN_10');
                    if (junSnapshot) handleSetPrimary(junSnapshot.id);
                  }}
                  className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-500 border-slate-300 dark:border-slate-600 focus:ring-0"
                />
                <span className={effectivePrimaryRound === 'JUN_10' ? 'font-semibold text-slate-800 dark:text-slate-200' : ''}>
                  รอบหลัก
                </span>
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
              <ClassroomStepper
                value={Number(junForm.kindergartenClassrooms) || 0}
                disabled={Boolean(junSnapshot?.isLocked)}
                onChange={(val) =>
                  setJunForm((prev) => ({
                    ...prev,
                    kindergartenClassrooms: val,
                  }))
                }
              />
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
              <ClassroomStepper
                value={Number(junForm.primaryClassrooms) || 0}
                disabled={Boolean(junSnapshot?.isLocked)}
                onChange={(val) =>
                  setJunForm((prev) => ({
                    ...prev,
                    primaryClassrooms: val,
                  }))
                }
              />
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
              <ClassroomStepper
                value={Number(junForm.secondaryClassrooms) || 0}
                disabled={Boolean(junSnapshot?.isLocked)}
                onChange={(val) =>
                  setJunForm((prev) => ({
                    ...prev,
                    secondaryClassrooms: val,
                  }))
                }
              />
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
                10 พฤศจิกายน {currentYearTh}
              </span>
              {/* Shortest Difference display computed live: e.g. +2 คน, -1 คน (hidden if 0) */}
              {liveDiffStudents !== 0 && (
                <span
                  className={`text-xs font-mono font-medium ${
                    liveDiffStudents > 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {liveDiffStudents > 0 ? `+${liveDiffStudents}` : liveDiffStudents} คน
                </span>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                <input
                  type="radio"
                  name="primary_round"
                  checked={effectivePrimaryRound === 'NOV_10'}
                  onChange={() => {
                    setManualPrimaryRound('NOV_10');
                    if (novSnapshot) handleSetPrimary(novSnapshot.id);
                  }}
                  className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-500 border-slate-300 dark:border-slate-600 focus:ring-0"
                />
                <span className={effectivePrimaryRound === 'NOV_10' ? 'font-semibold text-slate-800 dark:text-slate-200' : ''}>
                  รอบหลัก
                </span>
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
              <ClassroomStepper
                value={Number(novForm.kindergartenClassrooms) || 0}
                disabled={Boolean(novSnapshot?.isLocked)}
                onChange={(val) =>
                  setNovForm((prev) => ({
                    ...prev,
                    kindergartenClassrooms: val,
                  }))
                }
              />
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
              <ClassroomStepper
                value={Number(novForm.primaryClassrooms) || 0}
                disabled={Boolean(novSnapshot?.isLocked)}
                onChange={(val) =>
                  setNovForm((prev) => ({
                    ...prev,
                    primaryClassrooms: val,
                  }))
                }
              />
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
              <ClassroomStepper
                value={Number(novForm.secondaryClassrooms) || 0}
                disabled={Boolean(novSnapshot?.isLocked)}
                onChange={(val) =>
                  setNovForm((prev) => ({
                    ...prev,
                    secondaryClassrooms: val,
                  }))
                }
              />
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

      {/* ------------------------------------------------------------------ */}
      {/* 5. Password Confirmation Modal for Deleting Academic Year          */}
      {/* ------------------------------------------------------------------ */}
      {deleteModalYear && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-sm w-full p-5 space-y-4">
            <h4 className="text-sm font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
              <Trash2 className="w-4 h-4" />
              <span>ยืนยันการลบปีการศึกษา</span>
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              คุณกำลังจะลบข้อมูลปีการศึกษา <strong className="text-slate-900 dark:text-white">{deleteModalYear.yearTh}</strong> และรอบสถิตินักเรียนทั้งหมดที่เกี่ยวข้อง การดำเนินการนี้ไม่สามารถยกเลิกได้
            </p>
            <div>
              <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                กรุณากรอกรหัสผ่านเพื่อยืนยัน (123456)
              </label>
              <input
                type="password"
                value={deletePassword}
                placeholder="รหัสผ่านยืนยัน"
                onChange={(e) => setDeletePassword(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-rose-500 font-mono"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isDeletingYear}
                onClick={() => {
                  setDeleteModalYear(null);
                  setDeletePassword('');
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={isDeletingYear || deletePassword !== '123456'}
                onClick={handleConfirmDeleteYear}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white transition-colors"
              >
                {isDeletingYear ? 'กำลังลบ...' : 'ยืนยันการลบ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
