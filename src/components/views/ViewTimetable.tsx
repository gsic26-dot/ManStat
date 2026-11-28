'use client';

/**
 * ============================================================================
 * ManStat: View Timetable & Weekly Teaching Hours (ตารางสอนและชั่วโมงสอน)
 * ============================================================================
 * Phase 9.1:
 * - 4 Sub-tabs: ตารางเรียนรายห้อง (ป.1–ม.3), ตารางสอนรายบุคคล, แผนการสอน, สรุปชั่วโมงสอน (ว 9/2564)
 * - Interactive 5x7 Grid with vertical lunch break (11.30–12.30) between Period 3 and 4
 * - Co-teaching support & real-time teacher double-booking conflict detection
 * - Clean full staff names (no parenthetical positions), all active staff selectable
 * - Close-locked modals (X or ยกเลิก only), ConfirmModal for deletes, zero emojis
 * ============================================================================
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  CalendarRange,
  Settings,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Lock,
  Unlock,
  Plus,
  PlusCircle,
  Pencil,
  Trash2,
  X,
  Loader2,
  Users,
  BookOpen,
  User,
  BarChart3,
  Clock,
  ArrowUpRight,
  Sun,
  Link2,
  Sparkles,
  ArrowLeftRight,
  ChevronDown,
  Printer,
  Copy,
  Baby,
  Archive,
  RotateCcw,
} from 'lucide-react';
import type { TeacherRecord, WorkloadItem } from '@/lib/data/schoolData';
import type {
  KindergartenActivityItem,
  KindergartenSchedule,
  PeriodConfigItem,
  TimetableAllocation,
  TimetableSemester,
  TimetableSettings,
  TimetableSlot,
  TimetableSubjectType,
} from '@/lib/data/timetableTypes';
import {
  TimetablePrintView,
  type TimetablePrintMode,
} from '@/components/views/TimetablePrintView';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { sortTeachersByBranch } from '@/lib/regulations/staff-sorting';
import { formatStaffName } from '@/lib/regulations/staff-formatting';
import { isAdminRole } from '@/lib/auth/roles';
import { getCurrentThaiAcademicYear } from '@/lib/regulations/obec-admin-roles';
import {
  STANDARD_ROOMS,
  KINDERGARTEN_ROOMS,
  DEFAULT_KINDERGARTEN_ACTIVITIES,
  DAYS_OF_WEEK,
  LUNCH_BREAK_LABEL,
  LUNCH_BREAK_TIME,
  STANDARD_SUBJECT_GROUPS,
  SUBJECT_TYPES,
  COMMON_SUBJECT_PRESETS,
  getDefaultTimetableSettings,
  detectTimetableConflicts,
  calculateTeacherWeeklyLoads,
} from '@/lib/regulations/timetable-utils';
import {
  evaluateSmartSwapTargets,
  type SlotCoord,
  type UnplacedAllocationItem,
} from '@/lib/regulations/auto-scheduler';
import {
  mapLegacyWorkloadToAllocation,
  type TimetableRolloverMode,
} from '@/lib/regulations/timetable-rollover';

type TimetableTab = 'room' | 'teacher' | 'allocations' | 'kindergarten' | 'summary';

function getSubjectTypeBadgeStyle(type: TimetableSubjectType): string {
  switch (type) {
    case 'พื้นฐาน':
      return 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800/80';
    case 'เพิ่มเติม':
      return 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-800/80';
    case 'กิจกรรมพัฒนาผู้เรียน':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/80';
    case 'ประจำชั้น':
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/80';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
  }
}

export const ViewTimetable: React.FC = () => {
  const defaultAcademicYear = useMemo(() => getCurrentThaiAcademicYear(), []);

  const [academicYear, setAcademicYear] = useState<string>(defaultAcademicYear);
  const [semester, setSemester] = useState<TimetableSemester>('1');
  const [activeTab, setActiveTab] = useState<TimetableTab>('room');

  const [teachersList, setTeachersList] = useState<TeacherRecord[]>([]);
  const [settings, setSettings] = useState<TimetableSettings>(() =>
    getDefaultTimetableSettings(defaultAcademicYear, '1')
  );
  const [allocations, setAllocations] = useState<TimetableAllocation[]>([]);
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [kindergartenSchedules, setKindergartenSchedules] = useState<KindergartenSchedule[]>([]);
  const [legacyTeachingWorkloads, setLegacyTeachingWorkloads] = useState<WorkloadItem[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [currentRole, setCurrentRole] = useState<string>('teacher');
  const [statusNotice, setStatusNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // View selections
  const [selectedRoom, setSelectedRoom] = useState<string>(STANDARD_ROOMS[0]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [showAllStaffInSummary, setShowAllStaffInSummary] = useState<boolean>(true);
  const [isConflictListExpanded, setIsConflictListExpanded] = useState<boolean>(false);

  // Slot Editor Modal State
  const [isSlotModalOpen, setIsSlotModalOpen] = useState<boolean>(false);
  const [slotEditingId, setSlotEditingId] = useState<string | null>(null);
  const [slotRoom, setSlotRoom] = useState<string>(STANDARD_ROOMS[0]);
  const [slotDay, setSlotDay] = useState<number>(1);
  const [slotPeriod, setSlotPeriod] = useState<number>(1);
  const [slotAllocationId, setSlotAllocationId] = useState<string>('');
  const [slotSubjectCode, setSlotSubjectCode] = useState<string>('');
  const [slotSubjectName, setSlotSubjectName] = useState<string>('');
  const [slotSubjectGroup, setSlotSubjectGroup] = useState<string>(STANDARD_SUBJECT_GROUPS[0]);
  const [slotSubjectType, setSlotSubjectType] = useState<TimetableSubjectType>('พื้นฐาน');
  const [slotTeacherId, setSlotTeacherId] = useState<string>('');
  const [slotCoTeacherId, setSlotCoTeacherId] = useState<string>('');
  const [slotIsLocked, setSlotIsLocked] = useState<boolean>(false);
  const [deletingSlot, setDeletingSlot] = useState<TimetableSlot | null>(null);

  // Allocation Modal State
  const [isAllocModalOpen, setIsAllocModalOpen] = useState<boolean>(false);
  const [allocEditingId, setAllocEditingId] = useState<string | null>(null);
  const [allocRoom, setAllocRoom] = useState<string>(STANDARD_ROOMS[0]);
  const [allocSubjectGroup, setAllocSubjectGroup] = useState<string>(STANDARD_SUBJECT_GROUPS[0]);
  const [allocSubjectName, setAllocSubjectName] = useState<string>('');
  const [allocSubjectCode, setAllocSubjectCode] = useState<string>('');
  const [allocSubjectType, setAllocSubjectType] = useState<TimetableSubjectType>('พื้นฐาน');
  const [allocTeacherId, setAllocTeacherId] = useState<string>('');
  const [allocCoTeacherId, setAllocCoTeacherId] = useState<string>('');
  const [allocPeriodsPerWeek, setAllocPeriodsPerWeek] = useState<number>(2);
  const [allocPreferMorning, setAllocPreferMorning] = useState<boolean>(false);
  const [allocConsecutive, setAllocConsecutive] = useState<1 | 2>(1);
  const [deletingAlloc, setDeletingAlloc] = useState<TimetableAllocation | null>(null);

  // Settings Modal State
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [draftPeriods, setDraftPeriods] = useState<PeriodConfigItem[]>([]);
  const [draftFooterNote, setDraftFooterNote] = useState<string>('');

  // Phase 9.2: Auto-Schedule, Smart Swap, Unplaced Queue & Quick Pin/Lock State
  const [isAutoModalOpen, setIsAutoModalOpen] = useState<boolean>(false);
  const [autoScopeMode, setAutoScopeMode] = useState<'all' | 'room'>('all');
  const [autoRespectLocked, setAutoRespectLocked] = useState<boolean>(true);
  const [isAutoScheduling, setIsAutoScheduling] = useState<boolean>(false);
  const [lastUnplacedItems, setLastUnplacedItems] = useState<UnplacedAllocationItem[]>([]);
  const [isUnplacedExpanded, setIsUnplacedExpanded] = useState<boolean>(true);

  const [isSmartSwapMode, setIsSmartSwapMode] = useState<boolean>(false);
  const [swapSource, setSwapSource] = useState<SlotCoord | null>(null);
  const [isSwapping, setIsSwapping] = useState<boolean>(false);
  const [togglingLockId, setTogglingLockId] = useState<string | null>(null);

  // Phase 9.3: Kindergarten, Cross-Term Rollover, Print A4 & Legacy Migration State
  const [selectedKgRoom, setSelectedKgRoom] = useState<string>(KINDERGARTEN_ROOMS[0]);
  const [isKgModalOpen, setIsKgModalOpen] = useState<boolean>(false);
  const [kgHomeroomTeacherId, setKgHomeroomTeacherId] = useState<string>('');
  const [kgAssistantTeacherId, setKgAssistantTeacherId] = useState<string>('');
  const [kgWeeklyHours, setKgWeeklyHours] = useState<number>(25);
  const [kgActivities, setKgActivities] = useState<KindergartenActivityItem[]>([]);

  const [isRolloverModalOpen, setIsRolloverModalOpen] = useState<boolean>(false);
  const [rolloverSourceYear, setRolloverSourceYear] = useState<string>(defaultAcademicYear);
  const [rolloverSourceSem, setRolloverSourceSem] = useState<TimetableSemester>('1');
  const [rolloverTargetYear, setRolloverTargetYear] = useState<string>(defaultAcademicYear);
  const [rolloverTargetSem, setRolloverTargetSem] = useState<TimetableSemester>('2');
  const [rolloverMode, setRolloverMode] = useState<TimetableRolloverMode>('all');
  const [isRollingOver, setIsRollingOver] = useState<boolean>(false);

  const [printMode, setPrintMode] = useState<TimetablePrintMode | null>(null);

  const [isMigrateModalOpen, setIsMigrateModalOpen] = useState<boolean>(false);
  const [migrateDrafts, setMigrateDrafts] = useState<
    Array<{
      legacyWorkloadId: string;
      selected: boolean;
      subjectName: string;
      subjectCode: string;
      subjectGroup: string;
      subjectType: TimetableSubjectType;
      roomName: string;
      teacherId: string;
      periodsPerWeek: number;
      preferMorning: boolean;
    }>
  >([]);
  const [removeLegacyAfterMigrate, setRemoveLegacyAfterMigrate] = useState<boolean>(false);
  const [isMigratingLegacy, setIsMigratingLegacy] = useState<boolean>(false);

  const canManage = isAdminRole(currentRole);

  const showNotice = (type: 'success' | 'error', text: string) => {
    setStatusNotice({ type, text });
    setTimeout(() => setStatusNotice(null), 4500);
  };

  // Load role & staff once
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedRole = localStorage.getItem('manstat_auth_role');
        if (storedRole) setCurrentRole(storedRole);
      } catch {}
    }
    let isMounted = true;
    Promise.all([
      fetch('/api/auth/me', { cache: 'no-store' })
        .then((r) => r.json())
        .then((res) => {
          if (isMounted && res.success && res.user?.role) {
            setCurrentRole(res.user.role);
          }
        })
        .catch(() => {}),
      fetch('/api/admin/staff', { cache: 'no-store' })
        .then((r) => r.json())
        .then((res) => {
          if (isMounted && res.success && Array.isArray(res.data)) {
            setTeachersList(res.data);
          }
        })
        .catch(() => {}),
      fetch('/api/admin/workload', { cache: 'no-store' })
        .then((r) => r.json())
        .then((res) => {
          if (isMounted && res.success && Array.isArray(res.data)) {
            setLegacyTeachingWorkloads(
              res.data.filter((w: WorkloadItem) => w.category === 'งานสอนและการจัดการเรียนรู้')
            );
          }
        })
        .catch(() => {}),
    ]);
    return () => {
      isMounted = false;
    };
  }, []);

  // Load timetable bundle whenever academicYear or semester changes
  const loadBundle = useCallback(async (yr: string, sem: TimetableSemester) => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/timetable?academicYear=${encodeURIComponent(yr)}&semester=${encodeURIComponent(sem)}`,
        { cache: 'no-store' }
      );
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success && json.data) {
        setSettings(json.data.settings || getDefaultTimetableSettings(yr, sem));
        setAllocations(Array.isArray(json.data.allocations) ? json.data.allocations : []);
        setSlots(Array.isArray(json.data.slots) ? json.data.slots : []);
        setKindergartenSchedules(
          Array.isArray(json.data.kindergartenSchedules) ? json.data.kindergartenSchedules : []
        );
      } else {
        setSettings(getDefaultTimetableSettings(yr, sem));
        setAllocations([]);
        setSlots([]);
        setKindergartenSchedules([]);
      }
    } catch {
      setSettings(getDefaultTimetableSettings(yr, sem));
      setAllocations([]);
      setSlots([]);
      setKindergartenSchedules([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBundle(academicYear, semester);
    setLastUnplacedItems([]);
    setSwapSource(null);
  }, [academicYear, semester, loadBundle]);

  useEffect(() => {
    setSwapSource(null);
  }, [selectedRoom, activeTab, isSmartSwapMode]);

  const sortedTeachers = useMemo(() => sortTeachersByBranch(teachersList), [teachersList]);

  useEffect(() => {
    if (!selectedTeacherId && sortedTeachers.length > 0) {
      setSelectedTeacherId(sortedTeachers[0].id);
    }
  }, [selectedTeacherId, sortedTeachers]);

  const teacherMap = useMemo(() => {
    const map = new Map<string, TeacherRecord>();
    for (const t of teachersList) map.set(t.id, t);
    return map;
  }, [teachersList]);

  const getCleanName = useCallback(
    (id?: string): string => {
      if (!id) return '-';
      const found = teacherMap.get(id);
      return found ? formatStaffName(found) : id;
    },
    [teacherMap]
  );

  const academicYearOptions = useMemo(() => {
    const base = Number(defaultAcademicYear) || 2569;
    return [String(base + 1), String(base), String(base - 1), String(base - 2)];
  }, [defaultAcademicYear]);

  const periodsConfig = useMemo(() => {
    return settings.periodsConfig.length === 7
      ? settings.periodsConfig
      : getDefaultTimetableSettings(academicYear, semester).periodsConfig;
  }, [settings, academicYear, semester]);

  const morningPeriods = useMemo(() => periodsConfig.filter((p) => p.periodNo <= 3), [periodsConfig]);
  const afternoonPeriods = useMemo(() => periodsConfig.filter((p) => p.periodNo >= 4), [periodsConfig]);

  // Real-time Conflict Detection & ว 9/2564 Loads
  const conflictResult = useMemo(() => detectTimetableConflicts(slots), [slots]);
  const teacherLoads = useMemo(
    () => calculateTeacherWeeklyLoads(slots, sortedTeachers, periodsConfig, kindergartenSchedules),
    [slots, sortedTeachers, periodsConfig, kindergartenSchedules]
  );
  const teacherLoadMap = useMemo(() => {
    const map = new Map(teacherLoads.map((l) => [l.teacherId, l]));
    return map;
  }, [teacherLoads]);

  // Room counts for pills
  const roomSlotCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of slots) {
      counts.set(s.roomName, (counts.get(s.roomName) || 0) + 1);
    }
    return counts;
  }, [slots]);

  // Selected room lookup: `${day}-${period}` -> TimetableSlot
  const selectedRoomSlotMap = useMemo(() => {
    const map = new Map<string, TimetableSlot>();
    for (const s of slots) {
      if (s.roomName === selectedRoom) {
        map.set(`${s.dayOfWeek}-${s.periodNo}`, s);
      }
    }
    return map;
  }, [slots, selectedRoom]);

  // Selected teacher lookup: `${day}-${period}` -> TimetableSlot[] (array so double-booking is visible!)
  const selectedTeacherSlotMap = useMemo(() => {
    const map = new Map<string, TimetableSlot[]>();
    if (!selectedTeacherId) return map;
    for (const s of slots) {
      if (s.teacherId === selectedTeacherId || s.coTeacherId === selectedTeacherId) {
        const key = `${s.dayOfWeek}-${s.periodNo}`;
        const list = map.get(key) || [];
        list.push(s);
        map.set(key, list);
      }
    }
    return map;
  }, [slots, selectedTeacherId]);

  // Room allocations & placed counts
  const selectedRoomAllocations = useMemo(
    () => allocations.filter((a) => a.roomName === selectedRoom),
    [allocations, selectedRoom]
  );

  const allocPlacedCountMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const alloc of allocations) {
      const placed = slots.filter(
        (s) =>
          s.roomName === alloc.roomName &&
          (s.allocationId === alloc.id ||
            (!s.allocationId &&
              s.subjectName.trim() === alloc.subjectName.trim() &&
              s.teacherId === alloc.teacherId))
      ).length;
      map.set(alloc.id, placed);
    }
    return map;
  }, [allocations, slots]);

  const roomAllocationTotals = useMemo(() => {
    let learningPeriods = 0;
    let homeroomPeriods = 0;
    for (const a of selectedRoomAllocations) {
      if (a.subjectType === 'ประจำชั้น') homeroomPeriods += a.periodsPerWeek;
      else learningPeriods += a.periodsPerWeek;
    }
    return { learningPeriods, homeroomPeriods, total: learningPeriods + homeroomPeriods };
  }, [selectedRoomAllocations]);

  // Slot Modal handlers
  const handleOpenSlotEditor = (roomName: string, dayOfWeek: number, periodNo: number, existing?: TimetableSlot) => {
    if (!canManage) return;
    setSlotRoom(roomName);
    setSlotDay(dayOfWeek);
    setSlotPeriod(periodNo);

    if (existing) {
      setSlotEditingId(existing.id);
      setSlotAllocationId(existing.allocationId || '');
      setSlotSubjectCode(existing.subjectCode || '');
      setSlotSubjectName(existing.subjectName || '');
      setSlotSubjectGroup(existing.subjectGroup || STANDARD_SUBJECT_GROUPS[0]);
      setSlotSubjectType(existing.subjectType || 'พื้นฐาน');
      setSlotTeacherId(existing.teacherId || '');
      setSlotCoTeacherId(existing.coTeacherId || '');
      setSlotIsLocked(Boolean(existing.isLocked));
    } else {
      setSlotEditingId(null);
      setSlotAllocationId('');
      setSlotSubjectCode('');
      setSlotSubjectName(periodNo === 7 ? 'พบครูประจำชั้น' : '');
      setSlotSubjectGroup(periodNo === 7 ? 'เพิ่มเติม / ประจำชั้น' : STANDARD_SUBJECT_GROUPS[0]);
      setSlotSubjectType(periodNo === 7 ? 'ประจำชั้น' : 'พื้นฐาน');
      setSlotTeacherId(selectedTeacherId || sortedTeachers[0]?.id || '');
      setSlotCoTeacherId('');
      setSlotIsLocked(false);
    }
    setIsSlotModalOpen(true);
  };

  const handleSlotAllocationQuickPick = (allocId: string) => {
    setSlotAllocationId(allocId);
    if (!allocId) return;
    const found = allocations.find((a) => a.id === allocId);
    if (found) {
      setSlotSubjectCode(found.subjectCode || '');
      setSlotSubjectName(found.subjectName);
      setSlotSubjectGroup(found.subjectGroup);
      setSlotSubjectType(found.subjectType);
      setSlotTeacherId(found.teacherId);
      setSlotCoTeacherId(found.coTeacherId || '');
    }
  };

  const handleSlotSubjectNameChange = (value: string) => {
    setSlotSubjectName(value);
    const matched = COMMON_SUBJECT_PRESETS.find((p) => p.name === value.trim());
    if (matched) {
      setSlotSubjectGroup(matched.group);
      setSlotSubjectType(matched.type);
    }
  };

  const handleSaveSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage || !slotSubjectName.trim() || !slotTeacherId) return;

    setIsSaving(true);
    try {
      const payload = {
        id: slotEditingId || undefined,
        academicYear,
        semester,
        roomName: slotRoom,
        dayOfWeek: slotDay,
        periodNo: slotPeriod,
        allocationId: slotAllocationId || '',
        subjectCode: slotSubjectCode.trim(),
        subjectName: slotSubjectName.trim(),
        subjectGroup: slotSubjectGroup,
        subjectType: slotSubjectType,
        teacherId: slotTeacherId,
        coTeacherId: slotCoTeacherId === slotTeacherId ? '' : slotCoTeacherId,
        isLocked: slotIsLocked,
      };

      const res = await fetch('/api/admin/timetable/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'ไม่สามารถบันทึกคาบเรียนได้');
      }

      const saved: TimetableSlot = json.data;
      setSlots((prev) => {
        const filtered = prev.filter(
          (s) =>
            s.id !== saved.id &&
            !(
              s.roomName === saved.roomName &&
              s.dayOfWeek === saved.dayOfWeek &&
              s.periodNo === saved.periodNo
            )
        );
        return [...filtered, saved];
      });
      setIsSlotModalOpen(false);
      showNotice('success', `บันทึกคาบเรียนห้อง ${slotRoom} เรียบร้อยแล้ว`);
    } catch (err: unknown) {
      showNotice('error', err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึกคาบเรียน');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDeleteSlot = async () => {
    if (!canManage || !deletingSlot) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/admin/timetable/slots?id=${encodeURIComponent(deletingSlot.id)}`, {
        method: 'DELETE',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'ไม่สามารถลบคาบเรียนได้');
      }
      setSlots((prev) => prev.filter((s) => s.id !== deletingSlot.id));
      setDeletingSlot(null);
      setIsSlotModalOpen(false);
      showNotice('success', 'ลบคาบเรียนเรียบร้อยแล้ว');
    } catch (err: unknown) {
      showNotice('error', err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการลบคาบเรียน');
    } finally {
      setIsSaving(false);
    }
  };

  // Allocation Modal handlers
  const handleOpenAllocModal = (existing?: TimetableAllocation) => {
    if (!canManage) return;
    if (existing) {
      setAllocEditingId(existing.id);
      setAllocRoom(existing.roomName);
      setAllocSubjectGroup(existing.subjectGroup);
      setAllocSubjectName(existing.subjectName);
      setAllocSubjectCode(existing.subjectCode || '');
      setAllocSubjectType(existing.subjectType);
      setAllocTeacherId(existing.teacherId);
      setAllocCoTeacherId(existing.coTeacherId || '');
      setAllocPeriodsPerWeek(existing.periodsPerWeek);
      setAllocPreferMorning(Boolean(existing.preferMorning));
      setAllocConsecutive(existing.consecutivePeriods === 2 ? 2 : 1);
    } else {
      setAllocEditingId(null);
      setAllocRoom(selectedRoom);
      setAllocSubjectGroup(STANDARD_SUBJECT_GROUPS[0]);
      setAllocSubjectName('');
      setAllocSubjectCode('');
      setAllocSubjectType('พื้นฐาน');
      setAllocTeacherId(sortedTeachers[0]?.id || '');
      setAllocCoTeacherId('');
      setAllocPeriodsPerWeek(2);
      setAllocPreferMorning(false);
      setAllocConsecutive(1);
    }
    setIsAllocModalOpen(true);
  };

  const handleAllocSubjectNameChange = (value: string) => {
    setAllocSubjectName(value);
    const matched = COMMON_SUBJECT_PRESETS.find((p) => p.name === value.trim());
    if (matched) {
      setAllocSubjectGroup(matched.group);
      setAllocSubjectType(matched.type);
      if (matched.defaultPreferMorning !== undefined) {
        setAllocPreferMorning(matched.defaultPreferMorning);
      }
    }
  };

  const handleSaveAllocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage || !allocSubjectName.trim() || !allocTeacherId) return;

    setIsSaving(true);
    try {
      const payload = {
        id: allocEditingId || undefined,
        academicYear,
        semester,
        roomName: allocRoom,
        subjectCode: allocSubjectCode.trim(),
        subjectName: allocSubjectName.trim(),
        subjectGroup: allocSubjectGroup,
        subjectType: allocSubjectType,
        teacherId: allocTeacherId,
        coTeacherId: allocCoTeacherId === allocTeacherId ? '' : allocCoTeacherId,
        periodsPerWeek: Number(allocPeriodsPerWeek) || 1,
        preferMorning: allocPreferMorning,
        consecutivePeriods: allocConsecutive,
      };

      const res = await fetch('/api/admin/timetable/allocations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'ไม่สามารถบันทึกแผนการสอนได้');
      }

      const saved: TimetableAllocation = json.data;
      setAllocations((prev) =>
        allocEditingId ? prev.map((a) => (a.id === allocEditingId ? saved : a)) : [...prev, saved]
      );
      setIsAllocModalOpen(false);
      showNotice('success', allocEditingId ? 'อัปเดตแผนการสอนเรียบร้อยแล้ว' : 'เพิ่มรายวิชาในแผนการสอนเรียบร้อยแล้ว');
    } catch (err: unknown) {
      showNotice('error', err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึกแผนการสอน');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDeleteAllocation = async () => {
    if (!canManage || !deletingAlloc) return;
    setIsSaving(true);
    try {
      const res = await fetch(
        `/api/admin/timetable/allocations?id=${encodeURIComponent(deletingAlloc.id)}`,
        { method: 'DELETE' }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'ไม่สามารถลบแผนการสอนได้');
      }
      setAllocations((prev) => prev.filter((a) => a.id !== deletingAlloc.id));
      setDeletingAlloc(null);
      showNotice('success', 'ลบรายวิชาออกจากแผนการสอนเรียบร้อยแล้ว');
    } catch (err: unknown) {
      showNotice('error', err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการลบแผนการสอน');
    } finally {
      setIsSaving(false);
    }
  };

  // Settings Modal handlers
  const handleOpenSettingsModal = () => {
    if (!canManage) return;
    setDraftPeriods(periodsConfig.map((p) => ({ ...p })));
    setDraftFooterNote(settings.footerNote || '');
    setIsSettingsModalOpen(true);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;
    setIsSaving(true);
    try {
      const normalizedPeriods = draftPeriods.map((p) => ({
        ...p,
        durationMinutes: Math.max(15, Number(p.durationMinutes) || 60),
        durationHours: Math.round(((Math.max(15, Number(p.durationMinutes) || 60)) / 60) * 100) / 100,
      }));
      const res = await fetch('/api/admin/timetable/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          academicYear,
          semester,
          periodsConfig: normalizedPeriods,
          fixedSlotsConfig: settings.fixedSlotsConfig || [],
          footerNote: draftFooterNote,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'ไม่สามารถบันทึกตั้งค่าคาบเรียนได้');
      }
      setSettings(json.data);
      setIsSettingsModalOpen(false);
      showNotice('success', 'บันทึกตั้งค่าคาบเรียนเรียบร้อยแล้ว');
    } catch (err: unknown) {
      showNotice('error', err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึกตั้งค่า');
    } finally {
      setIsSaving(false);
    }
  };

  const activeTeacherLoad = selectedTeacherId ? teacherLoadMap.get(selectedTeacherId) : undefined;
  const slotRoomAllocations = useMemo(
    () => allocations.filter((a) => a.roomName === slotRoom),
    [allocations, slotRoom]
  );

  const summaryRows = useMemo(() => {
    return teacherLoads.filter((load) => showAllStaffInSummary || load.totalPeriods > 0);
  }, [teacherLoads, showAllStaffInSummary]);

  // Phase 9.2: Teacher name map & Smart Swap evaluation map
  const teacherNamesMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of teachersList) map.set(t.id, formatStaffName(t));
    return map;
  }, [teachersList]);

  const smartSwapEvalMap = useMemo(() => {
    if (!isSmartSwapMode || !swapSource) return new Map();
    return evaluateSmartSwapTargets({
      roomName: selectedRoom,
      source: swapSource,
      slots,
      teacherNames: teacherNamesMap,
    });
  }, [isSmartSwapMode, swapSource, selectedRoom, slots, teacherNamesMap]);

  // Phase 9.2: Auto-Schedule Modal preview counts
  const autoScopeSummary = useMemo(() => {
    const targetRooms =
      autoScopeMode === 'room'
        ? [selectedRoom]
        : Array.from(new Set(allocations.map((a) => a.roomName)));
    const roomSet = new Set(targetRooms);
    const scopedAllocs = allocations.filter((a) => roomSet.has(a.roomName));
    const totalTargetPeriods = scopedAllocs.reduce((sum, a) => sum + a.periodsPerWeek, 0);
    const lockedInScope = slots.filter((s) => roomSet.has(s.roomName) && s.isLocked).length;
    return {
      roomCount: targetRooms.length,
      allocCount: scopedAllocs.length,
      totalTargetPeriods,
      lockedInScope,
    };
  }, [autoScopeMode, selectedRoom, allocations, slots]);

  // Phase 9.2: Unplaced Queue (shows latest auto-schedule diagnostics OR remaining unplaced allocations in selected room)
  const displayedUnplacedItems = useMemo<UnplacedAllocationItem[]>(() => {
    if (lastUnplacedItems.length > 0) return lastUnplacedItems;
    const derived: UnplacedAllocationItem[] = [];
    for (const alloc of selectedRoomAllocations) {
      const placed = allocPlacedCountMap.get(alloc.id) || 0;
      const remaining = alloc.periodsPerWeek - placed;
      if (remaining > 0) {
        derived.push({
          allocationId: alloc.id,
          roomName: alloc.roomName,
          subjectName: alloc.subjectName,
          teacherId: alloc.teacherId,
          coTeacherId: alloc.coTeacherId || undefined,
          remainingPeriods: remaining,
          reason: 'ยังลงตารางไม่ครบตามแผนการสอน',
        });
      }
    }
    return derived;
  }, [lastUnplacedItems, selectedRoomAllocations, allocPlacedCountMap]);

  // Phase 9.2: 1-Click Quick Pin / Lock Toggle
  const handleQuickToggleLock = async (slot: TimetableSlot) => {
    if (!canManage || togglingLockId) return;
    setTogglingLockId(slot.id);
    try {
      const nextLocked = !slot.isLocked;
      const res = await fetch('/api/admin/timetable/slots', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: slot.id, isLocked: nextLocked }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'ไม่สามารถเปลี่ยนสถานะล็อกคาบเรียนได้');
      }
      setSlots((prev) =>
        prev.map((s) => (s.id === slot.id ? { ...s, isLocked: nextLocked } : s))
      );
      showNotice(
        'success',
        nextLocked
          ? `ปักหมุดล็อกวิชา "${slot.subjectName}" แล้ว`
          : `ปลดล็อกวิชา "${slot.subjectName}" แล้ว`
      );
    } catch (err: unknown) {
      showNotice('error', err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเปลี่ยนสถานะล็อก');
    } finally {
      setTogglingLockId(null);
    }
  };

  // Phase 9.2: Run Auto-Scheduler
  const handleRunAutoSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage || isAutoScheduling) return;

    setIsAutoScheduling(true);
    try {
      const res = await fetch('/api/admin/timetable/auto-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          academicYear,
          semester,
          scopeRooms: autoScopeMode === 'room' ? [selectedRoom] : undefined,
          respectLockedSlots: autoRespectLocked,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'ไม่สามารถจัดตารางสอนอัตโนมัติได้');
      }

      if (Array.isArray(json.data?.slots)) {
        setSlots(json.data.slots);
      } else {
        await loadBundle(academicYear, semester);
      }

      const unplacedList: UnplacedAllocationItem[] = Array.isArray(json.data?.unplaced)
        ? json.data.unplaced
        : [];
      setLastUnplacedItems(unplacedList);
      if (unplacedList.length > 0) setIsUnplacedExpanded(true);
      setIsAutoModalOpen(false);
      setActiveTab('room');

      const placedCount = Number(json.data?.placedCount ?? 0);
      const lockedKeptCount = Number(json.data?.lockedKeptCount ?? 0);
      showNotice(
        'success',
        unplacedList.length > 0
          ? `จัดตารางสอนอัตโนมัติสำเร็จ: ลงใหม่ ${placedCount} คาบ, คงคาบล็อก ${lockedKeptCount} คาบ, รอจัดเพิ่ม ${unplacedList.length} รายการ`
          : `จัดตารางสอนอัตโนมัติสำเร็จครบถ้วน: ลงใหม่ ${placedCount} คาบ, คงคาบล็อก ${lockedKeptCount} คาบ (0 คาบชน)`
      );
    } catch (err: unknown) {
      showNotice('error', err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการจัดตารางสอนอัตโนมัติ');
    } finally {
      setIsAutoScheduling(false);
    }
  };

  // Phase 9.2: Room Grid Cell Click (handles normal Slot Editor OR Smart Swap)
  const handleRoomCellClick = async (
    roomName: string,
    dayOfWeek: number,
    periodNo: number,
    slot?: TimetableSlot
  ) => {
    if (!canManage) return;

    if (!isSmartSwapMode) {
      handleOpenSlotEditor(roomName, dayOfWeek, periodNo, slot);
      return;
    }

    if (isSwapping) return;

    // Step 1: Pick source cell
    if (!swapSource) {
      if (!slot) {
        showNotice('error', 'กรุณาคลิกเลือกคาบเรียนที่มีรายวิชาเป็นคาบต้นทาง');
        return;
      }
      if (slot.isLocked) {
        showNotice('error', 'คาบนี้ถูกล็อกอยู่ กรุณาปลดล็อกก่อนสลับคาบ');
        return;
      }
      setSwapSource({ dayOfWeek, periodNo });
      return;
    }

    // Clicking the same source cell cancels selection
    if (swapSource.dayOfWeek === dayOfWeek && swapSource.periodNo === periodNo) {
      setSwapSource(null);
      return;
    }

    // Step 2: Validate target cell & execute atomic swap
    const evalItem = smartSwapEvalMap.get(`${dayOfWeek}-${periodNo}`);
    if (!evalItem || evalItem.status !== 'valid') {
      showNotice('error', evalItem?.reason || 'ไม่สามารถสลับไปยังคาบเรียนนี้ได้');
      return;
    }

    setIsSwapping(true);
    try {
      const res = await fetch('/api/admin/timetable/slots/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          academicYear,
          semester,
          roomName,
          source: swapSource,
          target: { dayOfWeek, periodNo },
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'ไม่สามารถสลับคาบเรียนได้');
      }

      if (Array.isArray(json.data?.slots)) {
        setSlots(json.data.slots);
      } else {
        await loadBundle(academicYear, semester);
      }
      setSwapSource(null);
      showNotice('success', `สลับคาบเรียนห้อง ${roomName} เรียบร้อยแล้ว`);
    } catch (err: unknown) {
      showNotice('error', err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการสลับคาบเรียน');
    } finally {
      setIsSwapping(false);
    }
  };

  // Phase 9.3: Kindergarten Schedule Handlers
  const selectedKgSchedule = useMemo(
    () => kindergartenSchedules.find((k) => k.roomName === selectedKgRoom),
    [kindergartenSchedules, selectedKgRoom]
  );

  const handleOpenKgModal = () => {
    if (!canManage) return;
    if (selectedKgSchedule) {
      setKgHomeroomTeacherId(selectedKgSchedule.homeroomTeacherId);
      setKgAssistantTeacherId(selectedKgSchedule.assistantTeacherId || '');
      setKgWeeklyHours(selectedKgSchedule.weeklyHours || 25);
      setKgActivities(
        selectedKgSchedule.activitiesJson.length > 0
          ? selectedKgSchedule.activitiesJson.map((a) => ({ ...a }))
          : DEFAULT_KINDERGARTEN_ACTIVITIES.map((a) => ({ ...a }))
      );
    } else {
      setKgHomeroomTeacherId(sortedTeachers[0]?.id || '');
      setKgAssistantTeacherId('');
      setKgWeeklyHours(25);
      setKgActivities(DEFAULT_KINDERGARTEN_ACTIVITIES.map((a) => ({ ...a })));
    }
    setIsKgModalOpen(true);
  };

  const handleSaveKindergarten = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage || !kgHomeroomTeacherId) return;

    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/timetable/kindergarten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          academicYear,
          semester,
          roomName: selectedKgRoom,
          homeroomTeacherId: kgHomeroomTeacherId,
          assistantTeacherId: kgAssistantTeacherId === kgHomeroomTeacherId ? '' : kgAssistantTeacherId,
          weeklyHours: Number(kgWeeklyHours) || 25,
          activitiesJson: kgActivities,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'ไม่สามารถบันทึกตารางจัดประสบการณ์ปฐมวัยได้');
      }
      const saved: KindergartenSchedule = json.data;
      setKindergartenSchedules((prev) => {
        const filtered = prev.filter((k) => k.roomName !== saved.roomName);
        return [...filtered, saved];
      });
      setIsKgModalOpen(false);
      showNotice('success', `บันทึกตารางปฐมวัยห้อง ${selectedKgRoom} เรียบร้อยแล้ว`);
    } catch (err: unknown) {
      showNotice('error', err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึกตารางปฐมวัย');
    } finally {
      setIsSaving(false);
    }
  };

  // Phase 9.3: Cross-Term Rollover Handlers
  const handleOpenRolloverModal = () => {
    if (!canManage) return;
    setRolloverSourceYear(academicYear);
    setRolloverSourceSem(semester);
    if (semester === '1') {
      setRolloverTargetYear(academicYear);
      setRolloverTargetSem('2');
      setRolloverMode('all');
    } else {
      setRolloverTargetYear(String((Number(academicYear) || 2569) + 1));
      setRolloverTargetSem('1');
      setRolloverMode('fixed_only');
    }
    setIsRolloverModalOpen(true);
  };

  const handleExecuteTimetableRollover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !canManage ||
      isRollingOver ||
      (rolloverSourceYear === rolloverTargetYear && rolloverSourceSem === rolloverTargetSem)
    ) {
      return;
    }

    setIsRollingOver(true);
    try {
      const res = await fetch('/api/admin/timetable/rollover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceYear: rolloverSourceYear,
          sourceSemester: rolloverSourceSem,
          targetYear: rolloverTargetYear,
          targetSemester: rolloverTargetSem,
          mode: rolloverMode,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'ไม่สามารถคัดลอกตารางสอนข้ามเทอม/ข้ามปีได้');
      }

      const d = json.data || {};
      setIsRolloverModalOpen(false);
      setAcademicYear(rolloverTargetYear);
      setSemester(rolloverTargetSem);
      await loadBundle(rolloverTargetYear, rolloverTargetSem);

      const parts = [
        `คาบเรียน ${Number(d.slotsCreated || 0)} คาบ`,
        d.allocationsCreated ? `แผนการสอน ${d.allocationsCreated} วิชา` : '',
        d.kindergartenCreated ? `ปฐมวัย ${d.kindergartenCreated} ห้อง` : '',
        d.skippedDuplicates ? `ข้ามซ้ำ ${d.skippedDuplicates}` : '',
      ].filter(Boolean);

      showNotice(
        'success',
        `คัดลอกตารางสอนไปยัง ${rolloverTargetYear}/${rolloverTargetSem} สำเร็จ (${parts.join(' · ')})`
      );
    } catch (err: unknown) {
      showNotice('error', err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการคัดลอกตารางสอน');
    } finally {
      setIsRollingOver(false);
    }
  };

  // Phase 9.3: Legacy Category 1 Migration Handlers
  const handleOpenMigrateModal = () => {
    if (!canManage || legacyTeachingWorkloads.length === 0) return;
    const drafts = legacyTeachingWorkloads.map((w) => {
      const mapped = mapLegacyWorkloadToAllocation(w, academicYear, semester);
      return {
        legacyWorkloadId: w.id,
        selected: true,
        subjectName: mapped.subjectName,
        subjectCode: mapped.subjectCode || '',
        subjectGroup: mapped.subjectGroup,
        subjectType: mapped.subjectType,
        roomName: mapped.roomName,
        teacherId: mapped.teacherId,
        periodsPerWeek: mapped.periodsPerWeek,
        preferMorning: mapped.preferMorning,
      };
    });
    setMigrateDrafts(drafts);
    setRemoveLegacyAfterMigrate(false);
    setIsMigrateModalOpen(true);
  };

  const handleExecuteLegacyMigration = async (e: React.FormEvent) => {
    e.preventDefault();
    const chosen = migrateDrafts.filter((d) => d.selected);
    if (!canManage || isMigratingLegacy || chosen.length === 0) return;

    setIsMigratingLegacy(true);
    try {
      const res = await fetch('/api/admin/timetable/migrate-legacy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          academicYear,
          semester,
          items: chosen,
          removeLegacyAfterMigrate,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'ไม่สามารถโอนย้ายรายการงานสอนเดิมได้');
      }

      if (Array.isArray(json.data?.createdAllocations)) {
        setAllocations((prev) => [...prev, ...json.data.createdAllocations]);
      }
      if (removeLegacyAfterMigrate) {
        const deletedIds = new Set(chosen.map((c) => c.legacyWorkloadId));
        setLegacyTeachingWorkloads((prev) => prev.filter((w) => !deletedIds.has(w.id)));
      }
      setIsMigrateModalOpen(false);
      showNotice(
        'success',
        `โอนย้ายรายการงานสอนเดิมเข้าสู่แผนการสอนสำเร็จ ${Number(json.data?.migratedCount || chosen.length)} รายการ`
      );
    } catch (err: unknown) {
      showNotice('error', err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการโอนย้ายรายการงานสอนเดิม');
    } finally {
      setIsMigratingLegacy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="bg-white dark:bg-[#121822] p-5 sm:p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800/80 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-colors duration-200">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CalendarRange className="w-5 h-5 text-sky-500 dark:text-sky-400 shrink-0" />
            <span>ตารางสอนและชั่วโมงสอน</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            บริหารจัดการตารางเรียนรายห้อง ป.1–ม.3, ตารางสอนรายบุคคล, แผนการสอน และสรุปชั่วโมงสอนตามเกณฑ์ ว 9/2564
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            aria-label="เลือกปีการศึกษา"
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            className="h-9 bg-slate-50 dark:bg-[#101822] border border-slate-200 dark:border-slate-700 rounded-lg px-3 text-xs font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:border-sky-500 cursor-pointer"
          >
            {academicYearOptions.map((yr) => (
              <option key={yr} value={yr}>
                ปีการศึกษา {yr}
              </option>
            ))}
          </select>

          <select
            aria-label="เลือกภาคเรียน"
            value={semester}
            onChange={(e) => setSemester(e.target.value === '2' ? '2' : '1')}
            className="h-9 bg-slate-50 dark:bg-[#101822] border border-slate-200 dark:border-slate-700 rounded-lg px-3 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-sky-500 cursor-pointer"
          >
            <option value="1">ภาคเรียนที่ 1</option>
            <option value="2">ภาคเรียนที่ 2</option>
          </select>

          {canManage && (
            <>
              <button
                type="button"
                onClick={handleOpenRolloverModal}
                className="inline-flex items-center gap-2 h-9 px-3.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
              >
                <Copy className="w-4 h-4 shrink-0" />
                <span>คัดลอกข้ามเทอม/ข้ามปี</span>
              </button>
              <button
                type="button"
                onClick={handleOpenSettingsModal}
                className="inline-flex items-center gap-2 h-9 px-3.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
              >
                <Settings className="w-4 h-4 shrink-0" />
                <span>ตั้งค่าคาบเรียน</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Status Notice */}
      {statusNotice && (
        <div
          role="status"
          aria-live="polite"
          className={`px-4 py-2.5 rounded-xl border text-xs font-medium flex items-center gap-2 ${
            statusNotice.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
          }`}
        >
          {statusNotice.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{statusNotice.text}</span>
        </div>
      )}

      {/* Real-Time Conflict Alert Banner */}
      {conflictResult.conflicts.length > 0 && (
        <div className="bg-rose-50/90 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 rounded-2xl p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 text-xs font-semibold">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>พบคาบสอนชนกัน {conflictResult.conflicts.length} รายการ (ครูผู้สอนลงสอนพร้อมกันมากกว่า 1 ห้อง)</span>
            </div>
            <button
              type="button"
              onClick={() => setIsConflictListExpanded((prev) => !prev)}
              className="text-xs font-medium text-rose-700 dark:text-rose-300 hover:underline cursor-pointer"
            >
              {isConflictListExpanded ? 'ซ่อนรายละเอียด' : 'ดูรายการคาบชน'}
            </button>
          </div>

          {isConflictListExpanded && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
              {conflictResult.conflicts.map((c, idx) => {
                const dayObj = DAYS_OF_WEEK.find((d) => d.dayOfWeek === c.dayOfWeek);
                return (
                  <div
                    key={`${c.teacherId}-${c.dayOfWeek}-${c.periodNo}-${idx}`}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-white dark:bg-[#141d27] border border-rose-200/80 dark:border-rose-800/60 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 dark:text-white truncate">
                        {getCleanName(c.teacherId)}
                      </div>
                      <div className="text-[11px] text-rose-600 dark:text-rose-400">
                        {dayObj?.fullLabel || `วัน ${c.dayOfWeek}`} คาบที่ {c.periodNo} · ห้อง {c.rooms.join(', ')}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTeacherId(c.teacherId);
                        setActiveTab('teacher');
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-100 hover:bg-rose-200 dark:bg-rose-900/50 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-200 text-[11px] font-medium shrink-0 cursor-pointer"
                    >
                      <span>ตรวจสอบ</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 4 Sub-Tabs Bar */}
      <div
        role="tablist"
        aria-label="มุมมองตารางสอนและชั่วโมงสอน"
        className="flex flex-wrap gap-2 bg-white dark:bg-[#121822] p-2 rounded-2xl border border-slate-200/90 dark:border-slate-800/80 shadow-xs"
      >
        {(
          [
            { id: 'room', label: 'ตารางเรียนรายห้อง', icon: CalendarRange },
            { id: 'teacher', label: 'ตารางสอนรายบุคคล', icon: User },
            { id: 'allocations', label: 'แผนการสอน', icon: BookOpen },
            { id: 'kindergarten', label: 'ระดับปฐมวัย (อ.1–อ.3)', icon: Baby },
            { id: 'summary', label: 'สรุปชั่วโมงสอน (ว 9/2564)', icon: BarChart3 },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                active
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="bg-white dark:bg-[#121822] p-12 rounded-2xl border border-slate-200/90 dark:border-slate-800/80 text-center text-xs text-slate-500 dark:text-slate-400">
          <div className="inline-flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-sky-500" />
            <span>กำลังโหลดข้อมูลตารางสอนปีการศึกษา {academicYear} ภาคเรียนที่ {semester}...</span>
          </div>
        </div>
      ) : (
        <>
          {/* =============================================================== */}
          {/* TAB 1: ตารางเรียนรายห้อง (ป.1–ม.3)                                */}
          {/* =============================================================== */}
          {activeTab === 'room' && (
            <div className="space-y-4">
              {/* Room Selector Pills */}
              <div className="flex flex-wrap items-center gap-2">
                {STANDARD_ROOMS.map((room) => {
                  const count = roomSlotCounts.get(room) || 0;
                  const active = selectedRoom === room;
                  return (
                    <button
                      key={room}
                      type="button"
                      onClick={() => setSelectedRoom(room)}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        active
                          ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                          : 'bg-white dark:bg-[#121822] text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:border-sky-400'
                      }`}
                    >
                      <span>{room}</span>
                      <span
                        className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${
                          active
                            ? 'bg-sky-500/80 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {count}/35
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* 5x7 Room Grid */}
              <div className="bg-white dark:bg-[#121822] p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800/80 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      ตารางเรียนชั้น {selectedRoom} · ปีการศึกษา {academicYear} ภาคเรียนที่ {semester}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {canManage
                        ? isSmartSwapMode
                          ? 'โหมดสลับคาบอัจฉริยะกำลังเปิดใช้งาน'
                          : 'คลิกที่ช่องคาบเรียนเพื่อเพิ่มหรือแก้ไข หรือคลิกไอคอนแม่กุญแจเพื่อปักหมุดล็อกคาบ'
                        : 'มุมมองอ่านอย่างเดียว'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPrintMode('room_single')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-medium transition-colors cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5 shrink-0" />
                      <span>พิมพ์ห้องนี้ A4</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrintMode('room_all')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-medium transition-colors cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5 shrink-0" />
                      <span>พิมพ์ทุกห้อง A4</span>
                    </button>

                    {canManage && (
                      <>
                        <button
                          type="button"
                          onClick={() => setIsSmartSwapMode((prev) => !prev)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                            isSmartSwapMode
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-600'
                              : 'bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          <ArrowLeftRight className="w-3.5 h-3.5 shrink-0" />
                          <span>{isSmartSwapMode ? 'กำลังใช้โหมดสลับคาบ' : 'โหมดสลับคาบ'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setAutoScopeMode('all');
                            setAutoRespectLocked(true);
                            setIsAutoModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition-colors cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5 shrink-0" />
                          <span>จัดตารางสอนอัตโนมัติ</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Smart Swap Inline Instruction Bar */}
                {isSmartSwapMode && (
                  <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-sky-50/90 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/80 text-xs text-sky-800 dark:text-sky-200">
                    <div className="flex items-center gap-2">
                      <ArrowLeftRight className="w-4 h-4 text-sky-500 shrink-0" />
                      <span>
                        {!swapSource
                          ? 'คลิกเลือกคาบต้นทางที่ต้องการย้าย/สลับ (ห้ามเป็นคาบที่ล็อกอยู่)'
                          : 'เลือกคาบต้นทางแล้ว — คลิกช่องสีเขียวเพื่อสลับหรือย้ายคาบโดยไม่ชนตารางครู (สีแดงคือชนตารางครู)'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {swapSource && (
                        <button
                          type="button"
                          onClick={() => setSwapSource(null)}
                          className="text-xs font-medium text-sky-700 dark:text-sky-300 hover:underline cursor-pointer"
                        >
                          ยกเลิกคาบต้นทาง
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsSmartSwapMode(false)}
                        className="px-2.5 py-1 rounded-md bg-white dark:bg-slate-800 border border-sky-200 dark:border-slate-700 text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 cursor-pointer"
                      >
                        ออกจากโหมดสลับคาบ
                      </button>
                    </div>
                  </div>
                )}

                <div
                  tabIndex={0}
                  role="region"
                  aria-label={`ตารางเรียนชั้น ${selectedRoom}`}
                  className="overflow-x-auto w-full"
                >
                  <table className="w-full min-w-[920px] border-separate border-spacing-0 text-xs">
                    <thead>
                      <tr className="bg-slate-100/90 dark:bg-[#101822] text-slate-600 dark:text-slate-300">
                        <th
                          scope="col"
                          className="sticky left-0 z-10 bg-slate-100 dark:bg-[#101822] w-24 px-3 py-3 text-center font-semibold border border-slate-200 dark:border-slate-800 rounded-tl-xl"
                        >
                          วัน / คาบ
                        </th>
                        {morningPeriods.map((p) => (
                          <th
                            key={p.periodNo}
                            scope="col"
                            className="px-2 py-2.5 text-center border border-slate-200 dark:border-slate-800"
                          >
                            <div className="font-semibold text-slate-800 dark:text-slate-100">
                              {p.label}
                            </div>
                            <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                              {p.startTime} - {p.endTime}
                            </div>
                          </th>
                        ))}
                        <th
                          scope="col"
                          className="w-12 px-1 py-2.5 text-center bg-amber-50/80 dark:bg-amber-950/30 border border-slate-200 dark:border-slate-800 text-amber-700 dark:text-amber-300"
                        >
                          <div className="text-[10px] font-semibold">พัก</div>
                          <div className="text-[9px] font-mono">11.30</div>
                        </th>
                        {afternoonPeriods.map((p, idx) => (
                          <th
                            key={p.periodNo}
                            scope="col"
                            className={`px-2 py-2.5 text-center border border-slate-200 dark:border-slate-800 ${
                              idx === afternoonPeriods.length - 1 ? 'rounded-tr-xl' : ''
                            }`}
                          >
                            <div className="font-semibold text-slate-800 dark:text-slate-100">
                              {p.label}
                            </div>
                            <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                              {p.startTime} - {p.endTime}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {DAYS_OF_WEEK.map((day, dayIdx) => (
                        <tr key={day.dayOfWeek}>
                          <th
                            scope="row"
                            className="sticky left-0 z-10 bg-slate-50 dark:bg-[#101822] px-3 py-3 text-center font-semibold text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-800"
                          >
                            <div>{day.fullLabel}</div>
                          </th>

                          {morningPeriods.map((p) => {
                            const slot = selectedRoomSlotMap.get(`${day.dayOfWeek}-${p.periodNo}`);
                            const isConflict = slot ? conflictResult.conflictingSlotIds.has(slot.id) : false;
                            const reasons = slot ? conflictResult.slotReasons.get(slot.id) : undefined;
                            const swapEval = isSmartSwapMode && swapSource
                              ? smartSwapEvalMap.get(`${day.dayOfWeek}-${p.periodNo}`)
                              : undefined;
                            const cellTooltip =
                              swapEval?.reason || (reasons ? reasons.join(' | ') : undefined);

                            let cellClass =
                              'border border-dashed border-slate-200 dark:border-slate-800 hover:border-sky-400 hover:bg-sky-50/40 dark:hover:bg-sky-950/20';
                            if (swapEval?.status === 'source') {
                              cellClass =
                                'bg-sky-50 dark:bg-sky-950/50 border-2 border-sky-500 ring-2 ring-sky-400/40';
                            } else if (swapEval?.status === 'valid') {
                              cellClass =
                                'bg-emerald-50/90 dark:bg-emerald-950/40 border-2 border-emerald-500 hover:bg-emerald-100/80 dark:hover:bg-emerald-900/50';
                            } else if (swapEval?.status === 'conflict') {
                              cellClass =
                                'bg-rose-50/90 dark:bg-rose-950/50 border-2 border-rose-400/90 opacity-90';
                            } else if (swapEval?.status === 'locked') {
                              cellClass =
                                'bg-slate-100/80 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-700 opacity-60';
                            } else if (slot) {
                              cellClass = isConflict
                                ? 'bg-rose-50 dark:bg-rose-950/50 border-2 border-rose-500 text-rose-900 dark:text-rose-100'
                                : 'bg-slate-50/90 dark:bg-[#16202c] border border-slate-200/90 dark:border-slate-700/80 hover:border-sky-400';
                            }

                            return (
                              <td
                                key={p.periodNo}
                                className="p-1.5 border border-slate-200 dark:border-slate-800 align-top h-24 w-[12%]"
                              >
                                <div className="relative h-full">
                                  <button
                                    type="button"
                                    disabled={!canManage || isSwapping}
                                    onClick={() =>
                                      handleRoomCellClick(selectedRoom, day.dayOfWeek, p.periodNo, slot)
                                    }
                                    title={cellTooltip}
                                    className={`w-full h-full min-h-[82px] rounded-lg p-2 text-left flex flex-col justify-between transition-all ${cellClass} ${
                                      canManage ? 'cursor-pointer' : 'cursor-default'
                                    }`}
                                  >
                                    {slot ? (
                                      <>
                                        <div className="space-y-0.5 pr-5">
                                          <div className="flex items-start justify-between gap-1">
                                            <span className="font-semibold text-slate-900 dark:text-white leading-tight line-clamp-2">
                                              {slot.subjectName}
                                            </span>
                                            {isConflict && (
                                              <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                            )}
                                          </div>
                                          {slot.subjectCode && (
                                            <div className="text-[10px] font-mono text-slate-400">
                                              {slot.subjectCode}
                                            </div>
                                          )}
                                        </div>
                                        <div className="pt-1.5 space-y-0.5">
                                          <div className="text-[11px] text-slate-600 dark:text-slate-300 truncate">
                                            {getCleanName(slot.teacherId)}
                                          </div>
                                          {slot.coTeacherId && (
                                            <div className="text-[10px] text-sky-600 dark:text-sky-400 truncate">
                                              ร่วมสอน: {getCleanName(slot.coTeacherId)}
                                            </div>
                                          )}
                                        </div>
                                      </>
                                    ) : (
                                      <div className="m-auto text-[11px] text-slate-400 dark:text-slate-600 flex items-center gap-1">
                                        {swapEval?.status === 'valid' ? (
                                          <span className="font-medium text-emerald-700 dark:text-emerald-300">
                                            ย้ายมาที่นี่
                                          </span>
                                        ) : (
                                          <>
                                            {canManage && !isSmartSwapMode && <Plus className="w-3 h-3" />}
                                            <span>{canManage && !isSmartSwapMode ? 'เพิ่มคาบ' : '-'}</span>
                                          </>
                                        )}
                                      </div>
                                    )}
                                  </button>

                                  {/* Quick 1-click Pin / Lock Toggle (Admin, non-swap mode) */}
                                  {slot && canManage && !isSmartSwapMode && (
                                    <button
                                      type="button"
                                      disabled={togglingLockId === slot.id}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleQuickToggleLock(slot);
                                      }}
                                      title={slot.isLocked ? 'คลิกเพื่อปลดล็อกคาบ' : 'คลิกเพื่อปักหมุดล็อกคาบ'}
                                      aria-label={slot.isLocked ? 'ปลดล็อกคาบเรียน' : 'ปักหมุดล็อกคาบเรียน'}
                                      className={`absolute top-1.5 right-1.5 z-10 p-1 rounded-md transition-colors cursor-pointer ${
                                        slot.isLocked
                                          ? 'text-amber-600 dark:text-amber-400 bg-amber-100/90 dark:bg-amber-950/70'
                                          : 'text-slate-400 hover:text-amber-600 hover:bg-slate-200/70 dark:hover:bg-slate-800'
                                      }`}
                                    >
                                      {slot.isLocked ? (
                                        <Lock className="w-3 h-3" />
                                      ) : (
                                        <Unlock className="w-3 h-3" />
                                      )}
                                    </button>
                                  )}
                                  {slot && slot.isLocked && (!canManage || isSmartSwapMode) && (
                                    <Lock className="w-3 h-3 text-amber-500 absolute top-2 right-2 pointer-events-none" />
                                  )}
                                </div>
                              </td>
                            );
                          })}

                          {/* Vertical Lunch Break Column (rendered once with rowSpan=5) */}
                          {dayIdx === 0 && (
                            <td
                              rowSpan={5}
                              className="bg-amber-50/70 dark:bg-amber-950/20 border border-slate-200 dark:border-slate-800 text-center align-middle px-1"
                            >
                              <div className="[writing-mode:vertical-rl] rotate-180 mx-auto text-xs font-semibold text-amber-700 dark:text-amber-300 tracking-wider">
                                {LUNCH_BREAK_LABEL} ({LUNCH_BREAK_TIME})
                              </div>
                            </td>
                          )}

                          {afternoonPeriods.map((p) => {
                            const slot = selectedRoomSlotMap.get(`${day.dayOfWeek}-${p.periodNo}`);
                            const isConflict = slot ? conflictResult.conflictingSlotIds.has(slot.id) : false;
                            const reasons = slot ? conflictResult.slotReasons.get(slot.id) : undefined;
                            const swapEval = isSmartSwapMode && swapSource
                              ? smartSwapEvalMap.get(`${day.dayOfWeek}-${p.periodNo}`)
                              : undefined;
                            const cellTooltip =
                              swapEval?.reason || (reasons ? reasons.join(' | ') : undefined);

                            let cellClass =
                              'border border-dashed border-slate-200 dark:border-slate-800 hover:border-sky-400 hover:bg-sky-50/40 dark:hover:bg-sky-950/20';
                            if (swapEval?.status === 'source') {
                              cellClass =
                                'bg-sky-50 dark:bg-sky-950/50 border-2 border-sky-500 ring-2 ring-sky-400/40';
                            } else if (swapEval?.status === 'valid') {
                              cellClass =
                                'bg-emerald-50/90 dark:bg-emerald-950/40 border-2 border-emerald-500 hover:bg-emerald-100/80 dark:hover:bg-emerald-900/50';
                            } else if (swapEval?.status === 'conflict') {
                              cellClass =
                                'bg-rose-50/90 dark:bg-rose-950/50 border-2 border-rose-400/90 opacity-90';
                            } else if (swapEval?.status === 'locked') {
                              cellClass =
                                'bg-slate-100/80 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-700 opacity-60';
                            } else if (slot) {
                              cellClass = isConflict
                                ? 'bg-rose-50 dark:bg-rose-950/50 border-2 border-rose-500 text-rose-900 dark:text-rose-100'
                                : p.isHomeroom
                                ? 'bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/70 hover:border-amber-400'
                                : 'bg-slate-50/90 dark:bg-[#16202c] border border-slate-200/90 dark:border-slate-700/80 hover:border-sky-400';
                            }

                            return (
                              <td
                                key={p.periodNo}
                                className="p-1.5 border border-slate-200 dark:border-slate-800 align-top h-24 w-[12%]"
                              >
                                <div className="relative h-full">
                                  <button
                                    type="button"
                                    disabled={!canManage || isSwapping}
                                    onClick={() =>
                                      handleRoomCellClick(selectedRoom, day.dayOfWeek, p.periodNo, slot)
                                    }
                                    title={cellTooltip}
                                    className={`w-full h-full min-h-[82px] rounded-lg p-2 text-left flex flex-col justify-between transition-all ${cellClass} ${
                                      canManage ? 'cursor-pointer' : 'cursor-default'
                                    }`}
                                  >
                                    {slot ? (
                                      <>
                                        <div className="space-y-0.5 pr-5">
                                          <div className="flex items-start justify-between gap-1">
                                            <span className="font-semibold text-slate-900 dark:text-white leading-tight line-clamp-2">
                                              {slot.subjectName}
                                            </span>
                                            {isConflict && (
                                              <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                            )}
                                          </div>
                                          {slot.subjectCode && (
                                            <div className="text-[10px] font-mono text-slate-400">
                                              {slot.subjectCode}
                                            </div>
                                          )}
                                        </div>
                                        <div className="pt-1.5 space-y-0.5">
                                          <div className="text-[11px] text-slate-600 dark:text-slate-300 truncate">
                                            {getCleanName(slot.teacherId)}
                                          </div>
                                          {slot.coTeacherId && (
                                            <div className="text-[10px] text-sky-600 dark:text-sky-400 truncate">
                                              ร่วมสอน: {getCleanName(slot.coTeacherId)}
                                            </div>
                                          )}
                                        </div>
                                      </>
                                    ) : (
                                      <div className="m-auto text-[11px] text-slate-400 dark:text-slate-600 flex items-center gap-1">
                                        {swapEval?.status === 'valid' ? (
                                          <span className="font-medium text-emerald-700 dark:text-emerald-300">
                                            ย้ายมาที่นี่
                                          </span>
                                        ) : (
                                          <>
                                            {canManage && !isSmartSwapMode && <Plus className="w-3 h-3" />}
                                            <span>{canManage && !isSmartSwapMode ? 'เพิ่มคาบ' : '-'}</span>
                                          </>
                                        )}
                                      </div>
                                    )}
                                  </button>

                                  {slot && canManage && !isSmartSwapMode && (
                                    <button
                                      type="button"
                                      disabled={togglingLockId === slot.id}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleQuickToggleLock(slot);
                                      }}
                                      title={slot.isLocked ? 'คลิกเพื่อปลดล็อกคาบ' : 'คลิกเพื่อปักหมุดล็อกคาบ'}
                                      aria-label={slot.isLocked ? 'ปลดล็อกคาบเรียน' : 'ปักหมุดล็อกคาบเรียน'}
                                      className={`absolute top-1.5 right-1.5 z-10 p-1 rounded-md transition-colors cursor-pointer ${
                                        slot.isLocked
                                          ? 'text-amber-600 dark:text-amber-400 bg-amber-100/90 dark:bg-amber-950/70'
                                          : 'text-slate-400 hover:text-amber-600 hover:bg-slate-200/70 dark:hover:bg-slate-800'
                                      }`}
                                    >
                                      {slot.isLocked ? (
                                        <Lock className="w-3 h-3" />
                                      ) : (
                                        <Unlock className="w-3 h-3" />
                                      )}
                                    </button>
                                  )}
                                  {slot && slot.isLocked && (!canManage || isSmartSwapMode) && (
                                    <Lock className="w-3 h-3 text-amber-500 absolute top-2 right-2 pointer-events-none" />
                                  )}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Footer Note */}
                {settings.footerNote && (
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-[#0e151f] px-3.5 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800/80 leading-relaxed">
                    {settings.footerNote}
                  </div>
                )}
              </div>

              {/* Phase 9.2: Unplaced Queue Panel */}
              {displayedUnplacedItems.length > 0 && (
                <div className="bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 rounded-2xl p-4 space-y-3">
                  <button
                    type="button"
                    onClick={() => setIsUnplacedExpanded((prev) => !prev)}
                    className="w-full flex items-center justify-between gap-2 text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-amber-200">
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>
                        รายการที่ยังจัดลงตารางไม่ได้ / คาบคงเหลือ ({displayedUnplacedItems.length} รายการ)
                      </span>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-amber-600 transition-transform ${
                        isUnplacedExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {isUnplacedExpanded && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {displayedUnplacedItems.map((u) => (
                        <div
                          key={`${u.allocationId}-${u.roomName}`}
                          className="flex items-start justify-between gap-3 p-3 rounded-xl bg-white dark:bg-[#141d27] border border-amber-200/80 dark:border-amber-800/60 text-xs"
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-600 text-white">
                                {u.roomName}
                              </span>
                              <span className="font-semibold text-slate-900 dark:text-white truncate">
                                {u.subjectName}
                              </span>
                              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
                                เหลือ {u.remainingPeriods} คาบ
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-600 dark:text-slate-300">
                              ผู้สอน: {getCleanName(u.teacherId)}
                              {u.coTeacherId ? ` · ร่วมสอน: ${getCleanName(u.coTeacherId)}` : ''}
                            </div>
                            <div className="text-[11px] text-amber-700 dark:text-amber-300">
                              สาเหตุ: {u.reason}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setSelectedRoom(u.roomName)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-sky-50 dark:bg-slate-800 dark:hover:bg-sky-950/50 text-slate-700 dark:text-slate-200 text-[11px] font-medium shrink-0 cursor-pointer"
                          >
                            <span>ไปห้อง {u.roomName}</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* =============================================================== */}
          {/* TAB 2: ตารางสอนรายบุคคล (รายครู)                                 */}
          {/* =============================================================== */}
          {activeTab === 'teacher' && (
            <div className="bg-white dark:bg-[#121822] p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800/80 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <label
                    htmlFor="tt-teacher-select"
                    className="text-xs font-medium text-slate-600 dark:text-slate-300"
                  >
                    เลือกบุคลากร:
                  </label>
                  <select
                    id="tt-teacher-select"
                    value={selectedTeacherId}
                    onChange={(e) => setSelectedTeacherId(e.target.value)}
                    className="h-9 min-w-[240px] bg-slate-50 dark:bg-[#101822] border border-slate-200 dark:border-slate-700 rounded-lg px-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500 cursor-pointer"
                  >
                    {sortedTeachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {formatStaffName(t)}
                      </option>
                    ))}
                  </select>
                </div>

                {activeTeacherLoad && (
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-mono">
                      <Clock className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                      <span>
                        จำนวน {activeTeacherLoad.totalPeriods} คาบ • สอน{' '}
                        {activeTeacherLoad.teachingHoursExclHomeroom} ชม./สัปดาห์
                      </span>
                    </span>
                    {activeTeacherLoad.homeroomHours > 0 && (
                      <span className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-mono border border-amber-200 dark:border-amber-800/70">
                        ประจำชั้น {activeTeacherLoad.homeroomHours} ชม.
                      </span>
                    )}
                    {!activeTeacherLoad.isDirector && !activeTeacherLoad.isSupport && (
                      <span
                        className={`px-2.5 py-1 rounded-lg font-medium border ${
                          activeTeacherLoad.meetsW9Threshold
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/70'
                            : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/70'
                        }`}
                      >
                        {activeTeacherLoad.meetsW9Threshold
                          ? 'ผ่านเกณฑ์ ว 9/2564'
                          : 'ต่ำกว่า 12 ชม./สัปดาห์'}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setPrintMode('teacher')}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-medium cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5 shrink-0" />
                      <span>พิมพ์ตารางสอน A4</span>
                    </button>
                  </div>
                )}
              </div>

              <div
                tabIndex={0}
                role="region"
                aria-label={`ตารางสอนของ ${getCleanName(selectedTeacherId)}`}
                className="overflow-x-auto w-full"
              >
                <table className="w-full min-w-[920px] border-separate border-spacing-0 text-xs">
                  <thead>
                    <tr className="bg-slate-100/90 dark:bg-[#101822] text-slate-600 dark:text-slate-300">
                      <th
                        scope="col"
                        className="sticky left-0 z-10 bg-slate-100 dark:bg-[#101822] w-24 px-3 py-3 text-center font-semibold border border-slate-200 dark:border-slate-800 rounded-tl-xl"
                      >
                        วัน / คาบ
                      </th>
                      {morningPeriods.map((p) => (
                        <th
                          key={p.periodNo}
                          scope="col"
                          className="px-2 py-2.5 text-center border border-slate-200 dark:border-slate-800"
                        >
                          <div className="font-semibold text-slate-800 dark:text-slate-100">
                            {p.label}
                          </div>
                          <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                            {p.startTime} - {p.endTime}
                          </div>
                        </th>
                      ))}
                      <th
                        scope="col"
                        className="w-12 px-1 py-2.5 text-center bg-amber-50/80 dark:bg-amber-950/30 border border-slate-200 dark:border-slate-800 text-amber-700 dark:text-amber-300"
                      >
                        <div className="text-[10px] font-semibold">พัก</div>
                        <div className="text-[9px] font-mono">11.30</div>
                      </th>
                      {afternoonPeriods.map((p, idx) => (
                        <th
                          key={p.periodNo}
                          scope="col"
                          className={`px-2 py-2.5 text-center border border-slate-200 dark:border-slate-800 ${
                            idx === afternoonPeriods.length - 1 ? 'rounded-tr-xl' : ''
                          }`}
                        >
                          <div className="font-semibold text-slate-800 dark:text-slate-100">
                            {p.label}
                          </div>
                          <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                            {p.startTime} - {p.endTime}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {DAYS_OF_WEEK.map((day, dayIdx) => {
                      const renderTeacherCell = (p: PeriodConfigItem) => {
                        const cellSlots =
                          selectedTeacherSlotMap.get(`${day.dayOfWeek}-${p.periodNo}`) || [];
                        const isDoubleBooked = cellSlots.length > 1;
                        return (
                          <td
                            key={p.periodNo}
                            className="p-1.5 border border-slate-200 dark:border-slate-800 align-top h-24 w-[12%]"
                          >
                            {cellSlots.length === 0 ? (
                              <div className="w-full h-full min-h-[82px] rounded-lg border border-dashed border-slate-200/70 dark:border-slate-800/70 flex items-center justify-center text-[11px] text-slate-400 dark:text-slate-600">
                                ว่าง
                              </div>
                            ) : (
                              <div className="space-y-1">
                                {cellSlots.map((slot) => {
                                  const isCo = slot.coTeacherId === selectedTeacherId;
                                  const isConflict =
                                    isDoubleBooked || conflictResult.conflictingSlotIds.has(slot.id);
                                  return (
                                    <button
                                      key={slot.id}
                                      type="button"
                                      disabled={!canManage}
                                      onClick={() =>
                                        handleOpenSlotEditor(
                                          slot.roomName,
                                          slot.dayOfWeek,
                                          slot.periodNo,
                                          slot
                                        )
                                      }
                                      className={`w-full rounded-lg p-2 text-left transition-all ${
                                        isConflict
                                          ? 'bg-rose-50 dark:bg-rose-950/50 border-2 border-rose-500'
                                          : 'bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200/90 dark:border-sky-800/70 hover:border-sky-400'
                                      } ${canManage ? 'cursor-pointer' : 'cursor-default'}`}
                                    >
                                      <div className="flex items-center justify-between gap-1">
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-600 text-white">
                                          {slot.roomName}
                                        </span>
                                        <div className="flex items-center gap-1">
                                          {isCo && (
                                            <span className="text-[10px] font-medium text-violet-600 dark:text-violet-300">
                                              ร่วมสอน
                                            </span>
                                          )}
                                          {isConflict && (
                                            <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                          )}
                                        </div>
                                      </div>
                                      <div className="font-semibold text-slate-900 dark:text-white mt-1 line-clamp-2 leading-tight">
                                        {slot.subjectName}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </td>
                        );
                      };

                      return (
                        <tr key={day.dayOfWeek}>
                          <th
                            scope="row"
                            className="sticky left-0 z-10 bg-slate-50 dark:bg-[#101822] px-3 py-3 text-center font-semibold text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-800"
                          >
                            {day.fullLabel}
                          </th>
                          {morningPeriods.map(renderTeacherCell)}
                          {dayIdx === 0 && (
                            <td
                              rowSpan={5}
                              className="bg-amber-50/70 dark:bg-amber-950/20 border border-slate-200 dark:border-slate-800 text-center align-middle px-1"
                            >
                              <div className="[writing-mode:vertical-rl] rotate-180 mx-auto text-xs font-semibold text-amber-700 dark:text-amber-300 tracking-wider">
                                {LUNCH_BREAK_LABEL} ({LUNCH_BREAK_TIME})
                              </div>
                            </td>
                          )}
                          {afternoonPeriods.map(renderTeacherCell)}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* TAB 3: แผนการสอน (Course Allocations)                            */}
          {/* =============================================================== */}
          {activeTab === 'allocations' && (
            <div className="space-y-4">
              {/* Room selector + Add button */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  {STANDARD_ROOMS.map((room) => {
                    const active = selectedRoom === room;
                    return (
                      <button
                        key={room}
                        type="button"
                        onClick={() => setSelectedRoom(room)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                          active
                            ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                            : 'bg-white dark:bg-[#121822] text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:border-sky-400'
                        }`}
                      >
                        {room}
                      </button>
                    );
                  })}
                </div>

                {canManage && (
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setAutoScopeMode('all');
                        setAutoRespectLocked(true);
                        setIsAutoModalOpen(true);
                      }}
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 shrink-0 text-sky-500" />
                      <span>จัดตารางสอนอัตโนมัติ</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenAllocModal()}
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition-colors cursor-pointer"
                    >
                      <PlusCircle className="w-4 h-4 shrink-0" />
                      <span>เพิ่มรายวิชาในแผนการสอน</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Pre-check Counter Bar */}
              {canManage && legacyTeachingWorkloads.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 font-medium">
                    <Archive className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>
                      พบรายการงานสอนเดิม (หมวด 1) จำนวน{' '}
                      <strong className="font-mono">{legacyTeachingWorkloads.length}</strong> รายการ — สามารถโอนย้ายเข้าสู่แผนการสอนภาคเรียนนี้ได้
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenMigrateModal}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium transition-colors cursor-pointer shrink-0"
                  >
                    <Archive className="w-3.5 h-3.5 shrink-0" />
                    <span>โอนย้ายรายการงานสอนเดิม</span>
                  </button>
                </div>
              )}

              <div
                className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3 text-xs ${
                  roomAllocationTotals.total > 35
                    ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                    : 'bg-white dark:bg-[#121822] border-slate-200/90 dark:border-slate-800/80 text-slate-700 dark:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 font-medium">
                  <BookOpen className="w-4 h-4 text-sky-500 shrink-0" />
                  <span>
                    แผนการสอนห้อง <strong>{selectedRoom}</strong>: จัดสรรแล้ว{' '}
                    <span className="font-mono font-bold">{roomAllocationTotals.learningPeriods}</span> / 30 คาบเรียน +{' '}
                    <span className="font-mono font-bold">{roomAllocationTotals.homeroomPeriods}</span> คาบประจำชั้น (รวม{' '}
                    <span className="font-mono font-bold">{roomAllocationTotals.total}</span> / 35 คาบ)
                  </span>
                </div>
                {roomAllocationTotals.total > 35 && (
                  <span className="inline-flex items-center gap-1 font-semibold text-rose-600 dark:text-rose-400">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>จำนวนคาบรวมเกิน 35 คาบ/สัปดาห์</span>
                  </span>
                )}
              </div>

              {/* Allocations Table */}
              <div className="bg-white dark:bg-[#121822] p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800/80 shadow-sm">
                <div tabIndex={0} role="region" aria-label={`รายการแผนการสอนห้อง ${selectedRoom}`} className="overflow-x-auto w-full">
                  <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                    <thead className="bg-slate-100/80 dark:bg-[#101822] text-slate-500 dark:text-slate-400 uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th scope="col" className="px-4 py-3">รายวิชา / กลุ่มสาระ</th>
                        <th scope="col" className="px-4 py-3">ประเภท</th>
                        <th scope="col" className="px-4 py-3">ครูผู้สอน / ครูร่วมสอน</th>
                        <th scope="col" className="px-4 py-3 text-center">เงื่อนไขการจัด</th>
                        <th scope="col" className="px-4 py-3 text-center">ลงตารางแล้ว</th>
                        {canManage && <th scope="col" className="px-4 py-3 text-right">จัดการ</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                      {selectedRoomAllocations.length === 0 ? (
                        <tr>
                          <td
                            colSpan={canManage ? 6 : 5}
                            className="px-4 py-10 text-center text-slate-400 dark:text-slate-500"
                          >
                            ยังไม่มีรายวิชาในแผนการสอนของห้อง {selectedRoom}
                          </td>
                        </tr>
                      ) : (
                        selectedRoomAllocations.map((alloc) => {
                          const placed = allocPlacedCountMap.get(alloc.id) || 0;
                          const isComplete = placed === alloc.periodsPerWeek;
                          const isOver = placed > alloc.periodsPerWeek;
                          return (
                            <tr
                              key={alloc.id}
                              className="hover:bg-slate-50 dark:hover:bg-[#1a2636]/50 transition-colors"
                            >
                              <td className="px-4 py-3">
                                <div className="font-semibold text-slate-900 dark:text-white">
                                  {alloc.subjectCode ? `${alloc.subjectCode} ` : ''}
                                  {alloc.subjectName}
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                  {alloc.subjectGroup}
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${getSubjectTypeBadgeStyle(
                                    alloc.subjectType
                                  )}`}
                                >
                                  {alloc.subjectType}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="font-medium text-slate-800 dark:text-slate-100">
                                  {getCleanName(alloc.teacherId)}
                                </div>
                                {alloc.coTeacherId && (
                                  <div className="text-[11px] text-sky-600 dark:text-sky-400 mt-0.5 flex items-center gap-1">
                                    <Users className="w-3 h-3 shrink-0" />
                                    <span>ร่วมสอน: {getCleanName(alloc.coTeacherId)}</span>
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <div className="flex flex-wrap items-center justify-center gap-1">
                                  {alloc.preferMorning && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/70">
                                      <Sun className="w-3 h-3" />
                                      <span>ช่วงเช้า</span>
                                    </span>
                                  )}
                                  {alloc.consecutivePeriods === 2 && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/70">
                                      <Link2 className="w-3 h-3" />
                                      <span>ติดกัน 2 คาบ</span>
                                    </span>
                                  )}
                                  {!alloc.preferMorning && alloc.consecutivePeriods !== 2 && (
                                    <span className="text-slate-400">-</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-center whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-md font-mono text-[11px] font-semibold border ${
                                    isComplete
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/70'
                                      : isOver
                                      ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/70'
                                      : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/70'
                                  }`}
                                >
                                  {placed}/{alloc.periodsPerWeek} คาบ
                                </span>
                              </td>
                              {canManage && (
                                <td className="px-4 py-3 text-right whitespace-nowrap">
                                  <div className="inline-flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenAllocModal(alloc)}
                                      title="แก้ไขแผนการสอน"
                                      className="p-1.5 rounded-lg text-slate-500 hover:text-sky-600 hover:bg-sky-50 dark:text-slate-400 dark:hover:text-sky-400 dark:hover:bg-sky-950/40 transition-colors cursor-pointer"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setDeletingAlloc(alloc)}
                                      title="ลบแผนการสอน"
                                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:text-slate-400 dark:hover:text-rose-400 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* TAB 4: ระดับปฐมวัย (อ.1–อ.3)                                      */}
          {/* =============================================================== */}
          {activeTab === 'kindergarten' && (
            <div className="space-y-4">
              {/* Kindergarten Room Selector Pills */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  {KINDERGARTEN_ROOMS.map((room) => {
                    const found = kindergartenSchedules.find((k) => k.roomName === room);
                    const active = selectedKgRoom === room;
                    return (
                      <button
                        key={room}
                        type="button"
                        onClick={() => setSelectedKgRoom(room)}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                          active
                            ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                            : 'bg-white dark:bg-[#121822] text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:border-sky-400'
                        }`}
                      >
                        <span>{room}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                            active
                              ? 'bg-sky-500/80 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {found ? `${found.weeklyHours} ชม.` : 'ยังไม่ตั้งค่า'}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPrintMode('kindergarten')}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-medium cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 shrink-0" />
                    <span>พิมพ์ตารางปฐมวัย A4</span>
                  </button>
                  {canManage && (
                    <button
                      type="button"
                      onClick={handleOpenKgModal}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition-colors cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5 shrink-0" />
                      <span>ตั้งค่า / แก้ไขตารางปฐมวัย</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Homeroom & Assistant Summary Card */}
              <div className="bg-white dark:bg-[#121822] p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800/80 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-800">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      ตารางการจัดประสบการณ์ระดับปฐมวัย ห้อง {selectedKgRoom} · ปีการศึกษา {academicYear} ภาคเรียนที่ {semester}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-300 mt-1">
                      <span>
                        ครูประจำชั้น:{' '}
                        <strong>
                          {selectedKgSchedule
                            ? getCleanName(selectedKgSchedule.homeroomTeacherId)
                            : 'ยังไม่ระบุ'}
                        </strong>
                      </span>
                      {selectedKgSchedule?.assistantTeacherId && (
                        <span>
                          ผู้ช่วย/พี่เลี้ยง:{' '}
                          <strong>{getCleanName(selectedKgSchedule.assistantTeacherId)}</strong>
                        </span>
                      )}
                      <span className="font-mono text-sky-600 dark:text-sky-400 font-semibold">
                        ชั่วโมงจัดประสบการณ์: {selectedKgSchedule?.weeklyHours ?? 25} ชม./สัปดาห์
                      </span>
                    </div>
                  </div>
                </div>

                {/* Daily 6 Core Experience Activities Table */}
                <div tabIndex={0} role="region" aria-label={`ตารางกิจกรรมปฐมวัย ${selectedKgRoom}`} className="overflow-x-auto w-full">
                  <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                    <thead className="bg-slate-100/80 dark:bg-[#101822] text-slate-500 dark:text-slate-400 uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th scope="col" className="w-36 px-4 py-3 text-center">เวลา</th>
                        <th scope="col" className="px-4 py-3">กิจกรรมหลักประจำวัน (จันทร์ – ศุกร์)</th>
                        <th scope="col" className="px-4 py-3">รายละเอียด / หมายเหตุ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                      {(selectedKgSchedule && selectedKgSchedule.activitiesJson.length > 0
                        ? selectedKgSchedule.activitiesJson
                        : DEFAULT_KINDERGARTEN_ACTIVITIES
                      ).map((act, idx) => (
                        <tr
                          key={idx}
                          className={
                            act.isBreak
                              ? 'bg-amber-50/70 dark:bg-amber-950/25 font-medium text-amber-900 dark:text-amber-200'
                              : 'hover:bg-slate-50 dark:hover:bg-[#1a2636]/40'
                          }
                        >
                          <td className="px-4 py-3 text-center font-mono whitespace-nowrap">
                            {act.timeRange}
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                            {act.activityName}
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                            {act.note || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* TAB 5: สรุปชั่วโมงสอน (ว 9/2564)                                 */}
          {/* =============================================================== */}
          {activeTab === 'summary' && (
            <div className="bg-white dark:bg-[#121822] p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800/80 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    สรุปชั่วโมงสอนรายสัปดาห์ตามเกณฑ์ ก.ค.ศ. ว 9/2564
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    คำนวณจากตารางสอนจริง (รวมคาบสอนร่วม และชั่วโมงจัดประสบการณ์ปฐมวัย อ.1–อ.3 • คาบ 1–6 = 1 ชม., คาบ 7 = 0.5 ชม.)
                  </p>
                </div>

                <label className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showAllStaffInSummary}
                    onChange={(e) => setShowAllStaffInSummary(e.target.checked)}
                    className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                  />
                  <span>แสดงบุคลากรทั้งหมด</span>
                </label>
              </div>

              <div tabIndex={0} role="region" aria-label="ตารางสรุปชั่วโมงสอน ว 9/2564" className="overflow-x-auto w-full">
                <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                  <thead className="bg-slate-100/80 dark:bg-[#101822] text-slate-500 dark:text-slate-400 uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th scope="col" className="w-12 px-3 py-3 text-center font-mono">ลำดับ</th>
                      <th scope="col" className="px-4 py-3">ชื่อ-สกุล</th>
                      <th scope="col" className="px-3 py-3 text-center">พื้นฐาน/เพิ่มเติม (ชม.)</th>
                      <th scope="col" className="px-3 py-3 text-center">กิจกรรม (ชม.)</th>
                      <th scope="col" className="px-3 py-3 text-center">ปฐมวัย (ชม.)</th>
                      <th scope="col" className="px-3 py-3 text-center">ประจำชั้น (ชม.)</th>
                      <th scope="col" className="px-3 py-3 text-center">รวมคาบ</th>
                      <th scope="col" className="px-3 py-3 text-center">ชั่วโมงสอน/สัปดาห์</th>
                      <th scope="col" className="px-4 py-3 text-center">เกณฑ์ ว 9/2564 (&gt;= 12 ชม.)</th>
                      <th scope="col" className="px-3 py-3 text-right">ตารางสอน</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                    {summaryRows.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-4 py-10 text-center text-slate-400">
                          ยังไม่มีข้อมูลชั่วโมงสอนในภาคเรียนนี้
                        </td>
                      </tr>
                    ) : (
                      summaryRows.map((load, idx) => (
                        <tr
                          key={load.teacherId}
                          className="hover:bg-slate-50 dark:hover:bg-[#1a2636]/50 transition-colors"
                        >
                          <td className="px-3 py-3 text-center font-mono text-slate-400">{idx + 1}</td>
                          <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                            {getCleanName(load.teacherId)}
                          </td>
                          <td className="px-3 py-3 text-center font-mono">{load.coreAndElectiveHours}</td>
                          <td className="px-3 py-3 text-center font-mono">{load.activityHours}</td>
                          <td className="px-3 py-3 text-center font-mono">
                            {load.kindergartenHours > 0 ? load.kindergartenHours : '-'}
                          </td>
                          <td className="px-3 py-3 text-center font-mono">{load.homeroomHours}</td>
                          <td className="px-3 py-3 text-center font-mono font-semibold">
                            {load.totalPeriods}
                          </td>
                          <td className="px-3 py-3 text-center font-mono font-bold text-sky-600 dark:text-sky-400">
                            {load.teachingHoursExclHomeroom} ชม.
                          </td>
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            {load.isDirector || load.isSupport ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                ผู้บริหาร/สายสนับสนุน
                              </span>
                            ) : load.meetsW9Threshold ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/70">
                                <CheckCircle2 className="w-3 h-3 shrink-0" />
                                <span>ผ่านเกณฑ์</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800/70">
                                <AlertCircle className="w-3 h-3 shrink-0" />
                                <span>ต่ำกว่าเกณฑ์</span>
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedTeacherId(load.teacherId);
                                setActiveTab('teacher');
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-sky-50 dark:bg-slate-800 dark:hover:bg-sky-950/50 text-slate-700 dark:text-slate-200 hover:text-sky-600 dark:hover:text-sky-300 text-[11px] font-medium transition-colors cursor-pointer"
                            >
                              <span>ดูตารางสอน</span>
                              <ArrowUpRight className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* =================================================================== */}
      {/* MODAL 1: Slot Editor Modal (Close-Locked)                           */}
      {/* =================================================================== */}
      {isSlotModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="slot-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 dark:bg-black/75 backdrop-blur-xs p-3 sm:p-4"
        >
          <div className="bg-white dark:bg-[#141d27] border border-slate-200/90 dark:border-slate-700 rounded-2xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl text-slate-800 dark:text-slate-200">
            <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-slate-200/90 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <CalendarRange className="w-5 h-5 text-sky-500 shrink-0" />
                <h3 id="slot-modal-title" className="text-base font-bold text-slate-900 dark:text-white">
                  จัดการคาบเรียนห้อง {slotRoom} ·{' '}
                  {DAYS_OF_WEEK.find((d) => d.dayOfWeek === slotDay)?.fullLabel} คาบที่ {slotPeriod}
                </h3>
              </div>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => setIsSlotModalOpen(false)}
                aria-label="ปิดหน้าต่าง"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              id="timetable-slot-form"
              aria-labelledby="slot-modal-title"
              onSubmit={handleSaveSlot}
              className="flex-1 overflow-y-auto px-6 py-5 space-y-4"
            >
              {/* Quick-pick from Room Allocations */}
              {slotRoomAllocations.length > 0 && (
                <div>
                  <label
                    htmlFor="slot-alloc-pick"
                    className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5"
                  >
                    เลือกด่วนจากแผนการสอนของห้อง {slotRoom}
                  </label>
                  <select
                    id="slot-alloc-pick"
                    value={slotAllocationId}
                    onChange={(e) => handleSlotAllocationQuickPick(e.target.value)}
                    className="w-full h-10 bg-sky-50/60 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/80 rounded-xl px-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500 cursor-pointer"
                  >
                    <option value="">-- เลือกรายวิชาจากแผนการสอน (เติมข้อมูลอัตโนมัติ) --</option>
                    {slotRoomAllocations.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.subjectName} — {getCleanName(a.teacherId)} ({allocPlacedCountMap.get(a.id) || 0}/
                        {a.periodsPerWeek} คาบ)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label
                    htmlFor="slot-subject-name"
                    className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5"
                  >
                    ชื่อรายวิชา <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="slot-subject-name"
                    list="common-subject-presets"
                    type="text"
                    required
                    value={slotSubjectName}
                    onChange={(e) => handleSlotSubjectNameChange(e.target.value)}
                    placeholder="เช่น ภาษาไทย, คณิตศาสตร์, ลูกเสือสามัญ"
                    className="w-full h-10 bg-slate-50 dark:bg-[#101822] border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label
                    htmlFor="slot-subject-code"
                    className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5"
                  >
                    รหัสวิชา
                  </label>
                  <input
                    id="slot-subject-code"
                    type="text"
                    value={slotSubjectCode}
                    onChange={(e) => setSlotSubjectCode(e.target.value)}
                    placeholder="เช่น ท11101"
                    className="w-full h-10 bg-slate-50 dark:bg-[#101822] border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="slot-subject-group"
                    className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5"
                  >
                    กลุ่มสาระ / หมวดวิชา
                  </label>
                  <select
                    id="slot-subject-group"
                    value={slotSubjectGroup}
                    onChange={(e) => setSlotSubjectGroup(e.target.value)}
                    className="w-full h-10 bg-slate-50 dark:bg-[#101822] border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500 cursor-pointer"
                  >
                    {STANDARD_SUBJECT_GROUPS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="slot-subject-type"
                    className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5"
                  >
                    ประเภทวิชา
                  </label>
                  <select
                    id="slot-subject-type"
                    value={slotSubjectType}
                    onChange={(e) => setSlotSubjectType(e.target.value as TimetableSubjectType)}
                    className="w-full h-10 bg-slate-50 dark:bg-[#101822] border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500 cursor-pointer"
                  >
                    {SUBJECT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="slot-teacher"
                    className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5"
                  >
                    ครูผู้สอนหลัก <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="slot-teacher"
                    required
                    value={slotTeacherId}
                    onChange={(e) => setSlotTeacherId(e.target.value)}
                    className="w-full h-10 bg-slate-50 dark:bg-[#101822] border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500 cursor-pointer"
                  >
                    <option value="">-- เลือกครูผู้สอนหลัก --</option>
                    {sortedTeachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {formatStaffName(t)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="slot-coteacher"
                    className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5"
                  >
                    ครูร่วมสอน
                  </label>
                  <select
                    id="slot-coteacher"
                    value={slotCoTeacherId}
                    onChange={(e) => setSlotCoTeacherId(e.target.value)}
                    className="w-full h-10 bg-slate-50 dark:bg-[#101822] border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500 cursor-pointer"
                  >
                    <option value="">-- ไม่มีครูร่วมสอน --</option>
                    {sortedTeachers
                      .filter((t) => t.id !== slotTeacherId)
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {formatStaffName(t)}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-[#101822] border border-slate-200 dark:border-slate-700/80 cursor-pointer">
                <input
                  type="checkbox"
                  checked={slotIsLocked}
                  onChange={(e) => setSlotIsLocked(e.target.checked)}
                  className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
                <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span className="text-xs text-slate-700 dark:text-slate-200">
                  ล็อกคาบนี้ (ป้องกันการจัดตารางอัตโนมัติในเฟส 9.2)
                </span>
              </label>
            </form>

            <div className="flex items-center justify-between gap-2 px-6 py-4 border-t border-slate-200/90 dark:border-slate-800 shrink-0">
              <div>
                {slotEditingId && (
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => {
                      const found = slots.find((s) => s.id === slotEditingId);
                      if (found) setDeletingSlot(found);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5 shrink-0" />
                    <span>ลบคาบนี้</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => setIsSlotModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  form="timetable-slot-form"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />}
                  <span>บันทึกคาบเรียน</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 2: Allocation Add/Edit Modal (Close-Locked)                   */}
      {/* =================================================================== */}
      {isAllocModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="alloc-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 dark:bg-black/75 backdrop-blur-xs p-3 sm:p-4"
        >
          <div className="bg-white dark:bg-[#141d27] border border-slate-200/90 dark:border-slate-700 rounded-2xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl text-slate-800 dark:text-slate-200">
            <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-slate-200/90 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-sky-500 shrink-0" />
                <h3 id="alloc-modal-title" className="text-base font-bold text-slate-900 dark:text-white">
                  {allocEditingId ? `แก้ไขแผนการสอนห้อง ${allocRoom}` : `เพิ่มรายวิชาในแผนการสอนห้อง ${allocRoom}`}
                </h3>
              </div>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => setIsAllocModalOpen(false)}
                aria-label="ปิดหน้าต่าง"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              id="timetable-alloc-form"
              aria-labelledby="alloc-modal-title"
              onSubmit={handleSaveAllocation}
              className="flex-1 overflow-y-auto px-6 py-5 space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="alloc-group"
                    className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5"
                  >
                    กลุ่มสาระ / หมวดวิชา
                  </label>
                  <select
                    id="alloc-group"
                    value={allocSubjectGroup}
                    onChange={(e) => setAllocSubjectGroup(e.target.value)}
                    className="w-full h-10 bg-slate-50 dark:bg-[#101822] border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500 cursor-pointer"
                  >
                    {STANDARD_SUBJECT_GROUPS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="alloc-type"
                    className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5"
                  >
                    ประเภทวิชา
                  </label>
                  <select
                    id="alloc-type"
                    value={allocSubjectType}
                    onChange={(e) => setAllocSubjectType(e.target.value as TimetableSubjectType)}
                    className="w-full h-10 bg-slate-50 dark:bg-[#101822] border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500 cursor-pointer"
                  >
                    {SUBJECT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label
                    htmlFor="alloc-name"
                    className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5"
                  >
                    ชื่อรายวิชา <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="alloc-name"
                    list="common-subject-presets"
                    type="text"
                    required
                    value={allocSubjectName}
                    onChange={(e) => handleAllocSubjectNameChange(e.target.value)}
                    placeholder="พิมพ์หรือเลือกชื่อรายวิชา..."
                    className="w-full h-10 bg-slate-50 dark:bg-[#101822] border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label
                    htmlFor="alloc-code"
                    className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5"
                  >
                    รหัสวิชา
                  </label>
                  <input
                    id="alloc-code"
                    type="text"
                    value={allocSubjectCode}
                    onChange={(e) => setAllocSubjectCode(e.target.value)}
                    placeholder="เช่น ค11101"
                    className="w-full h-10 bg-slate-50 dark:bg-[#101822] border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="alloc-teacher"
                    className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5"
                  >
                    ครูผู้สอนหลัก <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="alloc-teacher"
                    required
                    value={allocTeacherId}
                    onChange={(e) => setAllocTeacherId(e.target.value)}
                    className="w-full h-10 bg-slate-50 dark:bg-[#101822] border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500 cursor-pointer"
                  >
                    <option value="">-- เลือกครูผู้สอนหลัก --</option>
                    {sortedTeachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {formatStaffName(t)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="alloc-coteacher"
                    className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5"
                  >
                    ครูร่วมสอน
                  </label>
                  <select
                    id="alloc-coteacher"
                    value={allocCoTeacherId}
                    onChange={(e) => setAllocCoTeacherId(e.target.value)}
                    className="w-full h-10 bg-slate-50 dark:bg-[#101822] border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500 cursor-pointer"
                  >
                    <option value="">-- ไม่มีครูร่วมสอน --</option>
                    {sortedTeachers
                      .filter((t) => t.id !== allocTeacherId)
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {formatStaffName(t)}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                <div>
                  <label
                    htmlFor="alloc-periods"
                    className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5"
                  >
                    จำนวนคาบ / สัปดาห์ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="alloc-periods"
                    type="number"
                    min={1}
                    max={35}
                    required
                    value={allocPeriodsPerWeek}
                    onChange={(e) => setAllocPeriodsPerWeek(Math.max(1, Number(e.target.value) || 1))}
                    className="w-full h-10 bg-slate-50 dark:bg-[#101822] border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <label className="flex items-center gap-2 pt-5 text-xs text-slate-700 dark:text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allocPreferMorning}
                    onChange={(e) => setAllocPreferMorning(e.target.checked)}
                    className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                  />
                  <span>เน้นช่วงเช้า (คาบ 1–4)</span>
                </label>

                <label className="flex items-center gap-2 pt-5 text-xs text-slate-700 dark:text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allocConsecutive === 2}
                    onChange={(e) => setAllocConsecutive(e.target.checked ? 2 : 1)}
                    className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                  />
                  <span>ลงติดกัน 2 คาบ</span>
                </label>
              </div>
            </form>

            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-200/90 dark:border-slate-800 shrink-0">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => setIsAllocModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                form="timetable-alloc-form"
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />}
                <span>{allocEditingId ? 'บันทึกการเปลี่ยนแปลง' : 'เพิ่มรายวิชา'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 3: Timetable Settings Modal (Close-Locked)                    */}
      {/* =================================================================== */}
      {isSettingsModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 dark:bg-black/75 backdrop-blur-xs p-3 sm:p-4"
        >
          <div className="bg-white dark:bg-[#141d27] border border-slate-200/90 dark:border-slate-700 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl text-slate-800 dark:text-slate-200">
            <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-slate-200/90 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-sky-500 shrink-0" />
                <h3 id="settings-modal-title" className="text-base font-bold text-slate-900 dark:text-white">
                  ตั้งค่าคาบเรียนและหมายเหตุตารางสอน ({academicYear}/{semester})
                </h3>
              </div>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => setIsSettingsModalOpen(false)}
                aria-label="ปิดหน้าต่าง"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              id="timetable-settings-form"
              aria-labelledby="settings-modal-title"
              onSubmit={handleSaveSettings}
              className="flex-1 overflow-y-auto px-6 py-5 space-y-5"
            >
              <div className="space-y-2.5">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  โครงสร้างเวลาคาบเรียน (7 คาบ)
                </span>
                <div className="space-y-2">
                  {draftPeriods.map((p, idx) => (
                    <div
                      key={p.periodNo}
                      className="grid grid-cols-12 gap-2 items-center bg-slate-50 dark:bg-[#101822] p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800"
                    >
                      <div className="col-span-4">
                        <input
                          type="text"
                          aria-label={`ชื่อคาบที่ ${p.periodNo}`}
                          value={p.label}
                          onChange={(e) =>
                            setDraftPeriods((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, label: e.target.value } : item))
                            )
                          }
                          className="w-full h-8 bg-white dark:bg-[#141d27] border border-slate-200 dark:border-slate-700 rounded-lg px-2 text-xs"
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="text"
                          aria-label={`เวลาเริ่มคาบที่ ${p.periodNo}`}
                          value={p.startTime}
                          onChange={(e) =>
                            setDraftPeriods((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, startTime: e.target.value } : item))
                            )
                          }
                          className="w-full h-8 bg-white dark:bg-[#141d27] border border-slate-200 dark:border-slate-700 rounded-lg px-2 text-xs font-mono text-center"
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="text"
                          aria-label={`เวลาสิ้นสุดคาบที่ ${p.periodNo}`}
                          value={p.endTime}
                          onChange={(e) =>
                            setDraftPeriods((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, endTime: e.target.value } : item))
                            )
                          }
                          className="w-full h-8 bg-white dark:bg-[#141d27] border border-slate-200 dark:border-slate-700 rounded-lg px-2 text-xs font-mono text-center"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          min={15}
                          max={120}
                          aria-label={`ระยะเวลานาทีคาบที่ ${p.periodNo}`}
                          value={p.durationMinutes}
                          onChange={(e) =>
                            setDraftPeriods((prev) =>
                              prev.map((item, i) =>
                                i === idx ? { ...item, durationMinutes: Number(e.target.value) || 60 } : item
                              )
                            )
                          }
                          className="w-full h-8 bg-white dark:bg-[#141d27] border border-slate-200 dark:border-slate-700 rounded-lg px-2 text-xs font-mono text-center"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label
                  htmlFor="settings-footer-note"
                  className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5"
                >
                  หมายเหตุท้ายตารางเรียน
                </label>
                <textarea
                  id="settings-footer-note"
                  rows={3}
                  value={draftFooterNote}
                  onChange={(e) => setDraftFooterNote(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#101822] border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs leading-relaxed focus:outline-none focus:border-sky-500"
                />
              </div>
            </form>

            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-200/90 dark:border-slate-800 shrink-0">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => setIsSettingsModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                form="timetable-settings-form"
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />}
                <span>บันทึกการตั้งค่า</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 4: Auto-Schedule Confirmation Modal (Close-Locked)            */}
      {/* =================================================================== */}
      {isAutoModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="auto-schedule-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 dark:bg-black/75 backdrop-blur-xs p-3 sm:p-4"
        >
          <div className="bg-white dark:bg-[#141d27] border border-slate-200/90 dark:border-slate-700 rounded-2xl max-w-lg w-full shadow-2xl text-slate-800 dark:text-slate-200 overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-slate-200/90 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-sky-500 shrink-0" />
                <h3
                  id="auto-schedule-modal-title"
                  className="text-base font-bold text-slate-900 dark:text-white"
                >
                  จัดตารางสอนอัตโนมัติ ({academicYear}/{semester})
                </h3>
              </div>
              <button
                type="button"
                disabled={isAutoScheduling}
                onClick={() => setIsAutoModalOpen(false)}
                aria-label="ปิดหน้าต่าง"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              id="auto-schedule-form"
              aria-labelledby="auto-schedule-modal-title"
              onSubmit={handleRunAutoSchedule}
              className="px-6 py-5 space-y-4"
            >
              <fieldset className="space-y-2">
                <legend className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  ขอบเขตการจัดตารางสอน
                </legend>
                <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/80 dark:bg-[#101822] cursor-pointer">
                  <input
                    type="radio"
                    name="autoScope"
                    checked={autoScopeMode === 'all'}
                    onChange={() => setAutoScopeMode('all')}
                    className="text-sky-600 focus:ring-sky-500 cursor-pointer"
                  />
                  <span className="text-xs font-medium text-slate-800 dark:text-slate-100">
                    จัดตารางทุกห้อง (ป.1–ม.3)
                  </span>
                </label>
                <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/80 dark:bg-[#101822] cursor-pointer">
                  <input
                    type="radio"
                    name="autoScope"
                    checked={autoScopeMode === 'room'}
                    onChange={() => setAutoScopeMode('room')}
                    className="text-sky-600 focus:ring-sky-500 cursor-pointer"
                  />
                  <span className="text-xs font-medium text-slate-800 dark:text-slate-100">
                    จัดเฉพาะห้อง {selectedRoom} (ยึดตารางห้องอื่นไว้กันครูชนคาบ)
                  </span>
                </label>
              </fieldset>

              <label className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/80 dark:bg-[#101822] cursor-pointer">
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={autoRespectLocked}
                    onChange={(e) => setAutoRespectLocked(e.target.checked)}
                    className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                  />
                  <span className="text-xs font-medium text-slate-800 dark:text-slate-100">
                    คงคาบที่ปักหมุดล็อกไว้ทั้งหมด
                  </span>
                </div>
                <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/70">
                  {autoScopeSummary.lockedInScope} คาบล็อก
                </span>
              </label>

              <div className="p-3.5 rounded-xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200/80 dark:border-sky-800/70 text-xs text-slate-700 dark:text-slate-200 space-y-1">
                <div>
                  จำนวนแผนการสอนในขอบเขต:{' '}
                  <strong className="font-mono">{autoScopeSummary.allocCount}</strong> รายวิชา (รวม{' '}
                  <strong className="font-mono">{autoScopeSummary.totalTargetPeriods}</strong> คาบ/สัปดาห์ ใน{' '}
                  <strong className="font-mono">{autoScopeSummary.roomCount}</strong> ห้อง)
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  ระบบจะจัดวิชาคู่ 2 คาบติดกัน, ครูสอนเวียนหลายห้อง, คาบสอนร่วม และวิชาเน้นช่วงเช้าให้โดยไม่ชนตารางครู หากมีคาบที่ไม่สามารถลงได้จะแสดงในกล่องรายการรอจัดพร้อมระบุสาเหตุ
                </div>
              </div>
            </form>

            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-200/90 dark:border-slate-800">
              <button
                type="button"
                disabled={isAutoScheduling}
                onClick={() => setIsAutoModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                form="auto-schedule-form"
                disabled={isAutoScheduling || autoScopeSummary.allocCount === 0}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
              >
                {isAutoScheduling && <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />}
                <span>เริ่มจัดตารางอัตโนมัติ</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 5: Kindergarten Experience Editor Modal (Close-Locked)        */}
      {/* =================================================================== */}
      {isKgModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="kg-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 dark:bg-black/75 backdrop-blur-xs p-3 sm:p-4"
        >
          <div className="bg-white dark:bg-[#141d27] border border-slate-200/90 dark:border-slate-700 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl text-slate-800 dark:text-slate-200">
            <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-slate-200/90 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <Baby className="w-5 h-5 text-sky-500 shrink-0" />
                <h3 id="kg-modal-title" className="text-base font-bold text-slate-900 dark:text-white">
                  ตั้งค่าตารางจัดประสบการณ์ปฐมวัย ห้อง {selectedKgRoom} ({academicYear}/{semester})
                </h3>
              </div>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => setIsKgModalOpen(false)}
                aria-label="ปิดหน้าต่าง"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              id="kg-schedule-form"
              aria-labelledby="kg-modal-title"
              onSubmit={handleSaveKindergarten}
              className="flex-1 overflow-y-auto px-6 py-5 space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label
                    htmlFor="kg-homeroom-teacher"
                    className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5"
                  >
                    ครูประจำชั้น <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="kg-homeroom-teacher"
                    required
                    value={kgHomeroomTeacherId}
                    onChange={(e) => setKgHomeroomTeacherId(e.target.value)}
                    className="w-full h-10 bg-slate-50 dark:bg-[#101822] border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500 cursor-pointer"
                  >
                    <option value="">-- เลือกครูประจำชั้น --</option>
                    {sortedTeachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {formatStaffName(t)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="kg-assistant-teacher"
                    className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5"
                  >
                    ผู้ช่วย / พี่เลี้ยง
                  </label>
                  <select
                    id="kg-assistant-teacher"
                    value={kgAssistantTeacherId}
                    onChange={(e) => setKgAssistantTeacherId(e.target.value)}
                    className="w-full h-10 bg-slate-50 dark:bg-[#101822] border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500 cursor-pointer"
                  >
                    <option value="">-- ไม่มี --</option>
                    {sortedTeachers
                      .filter((t) => t.id !== kgHomeroomTeacherId)
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {formatStaffName(t)}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="kg-weekly-hours"
                    className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5"
                  >
                    ชั่วโมงจัดประสบการณ์ / สัปดาห์ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="kg-weekly-hours"
                    type="number"
                    min={1}
                    max={40}
                    step="0.5"
                    required
                    value={kgWeeklyHours}
                    onChange={(e) => setKgWeeklyHours(Number(e.target.value) || 25)}
                    className="w-full h-10 bg-slate-50 dark:bg-[#101822] border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    รายการกิจกรรมหลักประจำวัน
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setKgActivities(DEFAULT_KINDERGARTEN_ACTIVITIES.map((a) => ({ ...a })))
                    }
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>คืนค่ากิจกรรมมาตรฐานปฐมวัย</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {kgActivities.map((act, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-12 gap-2 items-center bg-slate-50 dark:bg-[#101822] p-2 rounded-xl border border-slate-200/80 dark:border-slate-800"
                    >
                      <input
                        type="text"
                        aria-label={`เวลาแถวที่ ${idx + 1}`}
                        value={act.timeRange}
                        onChange={(e) =>
                          setKgActivities((prev) =>
                            prev.map((item, i) =>
                              i === idx ? { ...item, timeRange: e.target.value } : item
                            )
                          )
                        }
                        className="col-span-3 h-8 bg-white dark:bg-[#141d27] border border-slate-200 dark:border-slate-700 rounded-lg px-2 text-xs font-mono text-center"
                      />
                      <input
                        type="text"
                        aria-label={`ชื่อกิจกรรมแถวที่ ${idx + 1}`}
                        value={act.activityName}
                        onChange={(e) =>
                          setKgActivities((prev) =>
                            prev.map((item, i) =>
                              i === idx ? { ...item, activityName: e.target.value } : item
                            )
                          )
                        }
                        className="col-span-4 h-8 bg-white dark:bg-[#141d27] border border-slate-200 dark:border-slate-700 rounded-lg px-2 text-xs"
                      />
                      <input
                        type="text"
                        aria-label={`หมายเหตุแถวที่ ${idx + 1}`}
                        value={act.note || ''}
                        onChange={(e) =>
                          setKgActivities((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, note: e.target.value } : item))
                          )
                        }
                        placeholder="รายละเอียด..."
                        className="col-span-5 h-8 bg-white dark:bg-[#141d27] border border-slate-200 dark:border-slate-700 rounded-lg px-2 text-xs"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </form>

            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-200/90 dark:border-slate-800 shrink-0">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => setIsKgModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                form="kg-schedule-form"
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />}
                <span>บันทึกตารางปฐมวัย</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 6: Cross-Term Timetable Rollover Modal (Close-Locked)         */}
      {/* =================================================================== */}
      {isRolloverModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="tt-rollover-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 dark:bg-black/75 backdrop-blur-xs p-3 sm:p-4"
        >
          <div className="bg-white dark:bg-[#141d27] border border-slate-200/90 dark:border-slate-700 rounded-2xl max-w-lg w-full shadow-2xl text-slate-800 dark:text-slate-200 overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-slate-200/90 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Copy className="w-5 h-5 text-sky-500 shrink-0" />
                <h3 id="tt-rollover-modal-title" className="text-base font-bold text-slate-900 dark:text-white">
                  คัดลอกตารางสอนข้ามเทอม / ข้ามปีการศึกษา
                </h3>
              </div>
              <button
                type="button"
                disabled={isRollingOver}
                onClick={() => setIsRolloverModalOpen(false)}
                aria-label="ปิดหน้าต่าง"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              id="tt-rollover-form"
              aria-labelledby="tt-rollover-modal-title"
              onSubmit={handleExecuteTimetableRollover}
              className="px-6 py-5 space-y-4"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="tt-roll-src-yr"
                    className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1"
                  >
                    ต้นทาง: ปีการศึกษา
                  </label>
                  <select
                    id="tt-roll-src-yr"
                    value={rolloverSourceYear}
                    onChange={(e) => setRolloverSourceYear(e.target.value)}
                    className="w-full h-9 bg-slate-50 dark:bg-[#101822] border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 text-xs font-mono cursor-pointer"
                  >
                    {academicYearOptions.map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="tt-roll-src-sem"
                    className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1"
                  >
                    ต้นทาง: ภาคเรียน
                  </label>
                  <select
                    id="tt-roll-src-sem"
                    value={rolloverSourceSem}
                    onChange={(e) => setRolloverSourceSem(e.target.value === '2' ? '2' : '1')}
                    className="w-full h-9 bg-slate-50 dark:bg-[#101822] border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 text-xs cursor-pointer"
                  >
                    <option value="1">ภาคเรียนที่ 1</option>
                    <option value="2">ภาคเรียนที่ 2</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="tt-roll-tgt-yr"
                    className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1"
                  >
                    ปลายทาง: ปีการศึกษา
                  </label>
                  <select
                    id="tt-roll-tgt-yr"
                    value={rolloverTargetYear}
                    onChange={(e) => setRolloverTargetYear(e.target.value)}
                    className="w-full h-9 bg-slate-50 dark:bg-[#101822] border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 text-xs font-mono cursor-pointer"
                  >
                    {academicYearOptions.map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="tt-roll-tgt-sem"
                    className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1"
                  >
                    ปลายทาง: ภาคเรียน
                  </label>
                  <select
                    id="tt-roll-tgt-sem"
                    value={rolloverTargetSem}
                    onChange={(e) => setRolloverTargetSem(e.target.value === '2' ? '2' : '1')}
                    className="w-full h-9 bg-slate-50 dark:bg-[#101822] border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 text-xs cursor-pointer"
                  >
                    <option value="1">ภาคเรียนที่ 1</option>
                    <option value="2">ภาคเรียนที่ 2</option>
                  </select>
                </div>
              </div>

              <fieldset className="space-y-2">
                <legend className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  เลือกรูปแบบการคัดลอก
                </legend>
                <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/80 dark:bg-[#101822] cursor-pointer">
                  <input
                    type="radio"
                    name="ttRolloverMode"
                    checked={rolloverMode === 'all'}
                    onChange={() => setRolloverMode('all')}
                    className="mt-0.5 text-sky-600 focus:ring-sky-500 cursor-pointer"
                  />
                  <div className="text-xs">
                    <div className="font-semibold text-slate-900 dark:text-white">
                      โหมด 1: คัดลอกทั้งหมด (แนะนำสำหรับ เทอม 1 → เทอม 2)
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      คัดลอกตั้งค่าคาบเรียน แผนการสอน ตารางเรียนทั้งหมด (คงสถานะล็อก) และตารางปฐมวัย อ.1–อ.3
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/80 dark:bg-[#101822] cursor-pointer">
                  <input
                    type="radio"
                    name="ttRolloverMode"
                    checked={rolloverMode === 'fixed_only'}
                    onChange={() => setRolloverMode('fixed_only')}
                    className="mt-0.5 text-sky-600 focus:ring-sky-500 cursor-pointer"
                  />
                  <div className="text-xs">
                    <div className="font-semibold text-slate-900 dark:text-white">
                      โหมด 2: คัดลอกเฉพาะคาบประจำโรงเรียน (แนะนำสำหรับขึ้นปีการศึกษาใหม่)
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      คัดลอกเฉพาะตั้งค่าคาบเรียนและคาบประจำ (ชุมนุม, ลูกเสือ, สวดมนต์, พบครูประจำชั้น หรือคาบที่ล็อกไว้)
                    </div>
                  </div>
                </label>
              </fieldset>

              {rolloverSourceYear === rolloverTargetYear && rolloverSourceSem === rolloverTargetSem && (
                <p className="text-xs text-rose-600 dark:text-rose-400">
                  กรุณาเลือกภาคเรียนปลายทางที่แตกต่างจากภาคเรียนต้นทาง
                </p>
              )}
            </form>

            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-200/90 dark:border-slate-800">
              <button
                type="button"
                disabled={isRollingOver}
                onClick={() => setIsRolloverModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 text-xs font-medium cursor-pointer disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                form="tt-rollover-form"
                disabled={
                  isRollingOver ||
                  (rolloverSourceYear === rolloverTargetYear && rolloverSourceSem === rolloverTargetSem)
                }
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium cursor-pointer disabled:opacity-50"
              >
                {isRollingOver && <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />}
                <span>เริ่มคัดลอกตารางสอน</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 7: Legacy Category 1 Migration Modal (Close-Locked)           */}
      {/* =================================================================== */}
      {isMigrateModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="migrate-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 dark:bg-black/75 backdrop-blur-xs p-3 sm:p-4"
        >
          <div className="bg-white dark:bg-[#141d27] border border-slate-200/90 dark:border-slate-700 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl text-slate-800 dark:text-slate-200">
            <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-slate-200/90 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <Archive className="w-5 h-5 text-amber-500 shrink-0" />
                <h3 id="migrate-modal-title" className="text-base font-bold text-slate-900 dark:text-white">
                  โอนย้ายรายการงานสอนเดิมเข้าสู่แผนการสอน ({academicYear}/{semester})
                </h3>
              </div>
              <button
                type="button"
                disabled={isMigratingLegacy}
                onClick={() => setIsMigrateModalOpen(false)}
                aria-label="ปิดหน้าต่าง"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              id="migrate-legacy-form"
              aria-labelledby="migrate-modal-title"
              onSubmit={handleExecuteLegacyMigration}
              className="flex-1 overflow-y-auto px-6 py-5 space-y-4"
            >
              <div className="space-y-2">
                {migrateDrafts.map((item, idx) => (
                  <div
                    key={item.legacyWorkloadId}
                    className="grid grid-cols-12 gap-2 items-center p-2.5 rounded-xl bg-slate-50 dark:bg-[#101822] border border-slate-200 dark:border-slate-800 text-xs"
                  >
                    <div className="col-span-1 text-center">
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={(e) =>
                          setMigrateDrafts((prev) =>
                            prev.map((d, i) => (i === idx ? { ...d, selected: e.target.checked } : d))
                          )
                        }
                        className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                      />
                    </div>
                    <div className="col-span-5 min-w-0">
                      <div className="font-semibold text-slate-900 dark:text-white truncate">
                        {item.subjectName}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {getCleanName(item.teacherId)}
                      </div>
                    </div>
                    <div className="col-span-3">
                      <select
                        aria-label={`ห้องเรียนสำหรับ ${item.subjectName}`}
                        value={item.roomName}
                        onChange={(e) =>
                          setMigrateDrafts((prev) =>
                            prev.map((d, i) => (i === idx ? { ...d, roomName: e.target.value } : d))
                          )
                        }
                        className="w-full h-8 bg-white dark:bg-[#141d27] border border-slate-200 dark:border-slate-700 rounded-lg px-2 text-xs cursor-pointer"
                      >
                        {STANDARD_ROOMS.map((r) => (
                          <option key={r} value={r}>
                            ห้อง {r}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-3 flex items-center gap-1.5">
                      <input
                        type="number"
                        min={1}
                        max={35}
                        aria-label={`จำนวนคาบต่อสัปดาห์สำหรับ ${item.subjectName}`}
                        value={item.periodsPerWeek}
                        onChange={(e) =>
                          setMigrateDrafts((prev) =>
                            prev.map((d, i) =>
                              i === idx
                                ? { ...d, periodsPerWeek: Math.max(1, Number(e.target.value) || 1) }
                                : d
                            )
                          )
                        }
                        className="w-16 h-8 bg-white dark:bg-[#141d27] border border-slate-200 dark:border-slate-700 rounded-lg px-2 text-xs font-mono text-center"
                      />
                      <span className="text-[11px] text-slate-500">คาบ/สัปดาห์</span>
                    </div>
                  </div>
                ))}
              </div>

              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/70 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={removeLegacyAfterMigrate}
                  onChange={(e) => setRemoveLegacyAfterMigrate(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                />
                <span className="text-amber-900 dark:text-amber-200">
                  ลบรายการงานสอนเดิมที่เลือกออกจากตารางภาระงานเดิมหลังโอนย้ายสำเร็จ (หากไม่ติ๊ก ระบบจะคงรายการเดิมไว้ปลอดภัย)
                </span>
              </label>
            </form>

            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-200/90 dark:border-slate-800 shrink-0">
              <button
                type="button"
                disabled={isMigratingLegacy}
                onClick={() => setIsMigrateModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 text-xs font-medium cursor-pointer disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                form="migrate-legacy-form"
                disabled={isMigratingLegacy || !migrateDrafts.some((d) => d.selected)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium cursor-pointer disabled:opacity-50"
              >
                {isMigratingLegacy && <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />}
                <span>โอนย้ายเข้าสู่แผนการสอน</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Landscape A4 Print Overlay */}
      {printMode && (
        <TimetablePrintView
          mode={printMode}
          academicYear={academicYear}
          semester={semester}
          settings={settings}
          periodsConfig={periodsConfig}
          slots={slots}
          kindergartenSchedules={kindergartenSchedules}
          selectedRoom={selectedRoom}
          selectedTeacherId={selectedTeacherId}
          selectedKindergartenRoom={selectedKgRoom}
          teacherLoad={activeTeacherLoad}
          getCleanName={getCleanName}
          onClose={() => setPrintMode(null)}
        />
      )}

      {/* Shared Subject Presets Datalist */}
      <datalist id="common-subject-presets">
        {COMMON_SUBJECT_PRESETS.map((p) => (
          <option key={p.name} value={p.name} />
        ))}
      </datalist>

      {/* Delete Slot Confirm Modal */}
      <ConfirmModal
        isOpen={Boolean(deletingSlot)}
        title="ยืนยันการลบคาบเรียน"
        description={
          deletingSlot
            ? `ต้องการลบวิชา "${deletingSlot.subjectName}" ออกจากตารางเรียนห้อง ${deletingSlot.roomName} หรือไม่?`
            : ''
        }
        confirmLabel="ยืนยันการลบ"
        cancelLabel="ยกเลิก"
        variant="danger"
        isLoading={isSaving}
        onConfirm={handleConfirmDeleteSlot}
        onCancel={() => setDeletingSlot(null)}
      />

      {/* Delete Allocation Confirm Modal */}
      <ConfirmModal
        isOpen={Boolean(deletingAlloc)}
        title="ยืนยันการลบรายวิชาออกจากแผนการสอน"
        description={
          deletingAlloc
            ? `ต้องการลบ "${deletingAlloc.subjectName}" ออกจากแผนการสอนห้อง ${deletingAlloc.roomName} หรือไม่?`
            : ''
        }
        confirmLabel="ยืนยันการลบ"
        cancelLabel="ยกเลิก"
        variant="danger"
        isLoading={isSaving}
        onConfirm={handleConfirmDeleteAllocation}
        onCancel={() => setDeletingAlloc(null)}
      />
    </div>
  );
};
