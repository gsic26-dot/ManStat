'use client';

/**
 * ============================================================================
 * ManStat: View School Administration Roles & Special Duties (งานบริหาร 4 ฝ่ายและหน้าที่พิเศษ)
 * ============================================================================
 * Phase 8.1 Refinements:
 * - Clean labels & staff names (zero redundant parenthetical clutter).
 * - 2-Step Cascading Selection (สังกัดฝ่ายงาน -> ตำแหน่ง/หน้าที่รับผิดชอบ -> auto-fill).
 * - Smart Academic Year Rollover (คัดลอกโครงสร้างงานข้ามปีการศึกษา) with history preservation,
 *   fresh-year reset, active staff filtering, and idempotent deduplication.
 * - Non-destructive: Legacy Category 1 (teaching) records are preserved and shown read-only.
 * - Zero emojis: pure Lucide SVG icons, dual Light/Dark mode, Arabic numerals (0-9).
 * - Modal close lock: Form & Rollover modals close ONLY via X or ยกเลิก.
 * ============================================================================
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  Briefcase,
  CheckCircle2,
  AlertCircle,
  Search,
  Building2,
  Layers,
  PlusCircle,
  ChevronDown,
  Trash2,
  Pencil,
  X,
  Plus,
  Loader2,
  Users,
  Database,
  FileText,
  Calendar,
  Archive,
  Check,
  Copy,
  Sparkles,
  Info,
  Download,
  Printer,
  ClipboardList,
  Award,
} from 'lucide-react';
import {
  type TeacherRecord,
  type WorkloadItem,
  type WorkloadCategory,
} from '@/lib/data/schoolData';
import type {
  KindergartenSchedule,
  PeriodConfigItem,
  TeachingSubstitution,
  TimetableSemester,
  TimetableSlot,
} from '@/lib/data/timetableTypes';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { sortTeachersByBranch, getStaffBranch } from '@/lib/regulations/staff-sorting';
import { formatStaffName } from '@/lib/regulations/staff-formatting';
import { isAdminRole } from '@/lib/auth/roles';
import {
  STANDARD_DIVISIONS,
  WORKLOAD_ADMIN_CATEGORY,
  normalizeDivisionName,
  getStaffDivisions,
  type StandardDivisionName,
} from '@/lib/staffDivisions';
import {
  OBEC_ADMIN_ROLE_PRESETS,
  ADHOC_PROJECT_PRESETS,
  OBEC_SYSTEM_CATALOG,
  ADMIN_TASK_ROLES,
  getCurrentThaiAcademicYear,
} from '@/lib/regulations/obec-admin-roles';
import {
  buildObecSystemDirectory,
  buildPaStaffSummary,
  exportObecDirectoryCsv,
  exportPaSummaryCsv,
} from '@/lib/regulations/pa-summary-utils';
import {
  PaReportPrintView,
  type PaReportPrintMode,
} from '@/components/views/PaReportPrintView';

const ADMIN_DIVISION_CATEGORY: WorkloadCategory = WORKLOAD_ADMIN_CATEGORY;
const ADHOC_PROJECT_CATEGORY: WorkloadCategory = 'งานโครงการ กิจกรรม และงานที่ได้รับมอบหมายพิเศษ';
const LEGACY_TEACHING_CATEGORY: WorkloadCategory = 'งานสอนและการจัดการเรียนรู้';
const LEGACY_CARE_CATEGORY: WorkloadCategory = 'งานดูแลช่วยเหลือนักเรียน งานครูที่ปรึกษา และเวรปฏิบัติหน้าที่';

const CUSTOM_ROLE_OPTION = '__CUSTOM__';

const PRIMARY_STATUS_OPTIONS: WorkloadItem['status'][] = [
  'กำลังดำเนินการ',
  'ดำเนินการแล้วเสร็จ',
  'รอดำเนินการ',
];

function getDivisionBadgeStyle(division: string): string {
  const normalized = normalizeDivisionName(division) || division;
  switch (normalized) {
    case 'ฝ่ายบริหารวิชาการ':
      return 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800/80';
    case 'ฝ่ายบริหารงบประมาณ':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/80';
    case 'ฝ่ายบริหารงานบุคคล':
      return 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-800/80';
    case 'ฝ่ายบริหารทั่วไป':
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/80';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/70 dark:text-slate-300 dark:border-slate-700';
  }
}

function getStatusBadgeStyle(status: string): string {
  switch (status) {
    case 'ดำเนินการแล้วเสร็จ':
    case 'เสร็จสิ้นแล้ว':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/70';
    case 'รอดำเนินการ':
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/70';
    default:
      return 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/70';
  }
}

export const ViewWorkload: React.FC = () => {
  const defaultAcademicYear = useMemo(() => getCurrentThaiAcademicYear(), []);

  const [teachersList, setTeachersList] = useState<TeacherRecord[]>([]);
  const [workloads, setWorkloads] = useState<WorkloadItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentRole, setCurrentRole] = useState<string>('teacher');
  const [statusNotice, setStatusNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sub-tabs & Phase 10 OBEC Directory / PA Summary State
  const [activeTab, setActiveTab] = useState<'list' | 'obec_directory' | 'pa_summary'>('list');
  const [obecSearchTerm, setObecSearchTerm] = useState<string>('');
  const [obecDivisionFilter, setObecDivisionFilter] = useState<string>('ALL');
  const [obecStatusFilter, setObecStatusFilter] = useState<'ALL' | 'ASSIGNED' | 'UNASSIGNED'>('ALL');

  const [paSemester, setPaSemester] = useState<TimetableSemester>('1');
  const [paSlots, setPaSlots] = useState<TimetableSlot[]>([]);
  const [paKindergarten, setPaKindergarten] = useState<KindergartenSchedule[]>([]);
  const [paSubstitutions, setPaSubstitutions] = useState<TeachingSubstitution[]>([]);
  const [paPeriodsConfig, setPaPeriodsConfig] = useState<PeriodConfigItem[] | undefined>(undefined);
  const [isLoadingPaData, setIsLoadingPaData] = useState<boolean>(false);
  const [printMode, setPrintMode] = useState<PaReportPrintMode | null>(null);

  // Filters & Accordion
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [academicYearFilter, setAcademicYearFilter] = useState<string>('ALL');
  const [divisionFilter, setDivisionFilter] = useState<string>('ALL');
  const [expandedTeacherId, setExpandedTeacherId] = useState<string | null>(null);

  // Add/Edit Modal & CRUD State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingWorkloadId, setEditingWorkloadId] = useState<string | null>(null);
  const [deletingWorkload, setDeletingWorkload] = useState<WorkloadItem | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Add/Edit Form State
  const [formTeacherId, setFormTeacherId] = useState<string>('');
  const [formAcademicYear, setFormAcademicYear] = useState<string>(defaultAcademicYear);
  const [formCategory, setFormCategory] = useState<WorkloadCategory>(ADMIN_DIVISION_CATEGORY);
  const [formSubGroup, setFormSubGroup] = useState<string>(STANDARD_DIVISIONS[0]);
  const [formRoleDropdownValue, setFormRoleDropdownValue] = useState<string>('');
  const [formTitle, setFormTitle] = useState<string>('');
  const [formScopeDescription, setFormScopeDescription] = useState<string>('');
  const [isScopeAutoFilled, setIsScopeAutoFilled] = useState<boolean>(false);
  const [formObecSystems, setFormObecSystems] = useState<string[]>([]);
  const [formCustomSystem, setFormCustomSystem] = useState<string>('');
  const [showAllObecSystems, setShowAllObecSystems] = useState<boolean>(false);
  const [formRole, setFormRole] = useState<string>('ผู้รับผิดชอบหลัก / เจ้าหน้าที่');
  const [formOrderRef, setFormOrderRef] = useState<string>('');
  const [formStatus, setFormStatus] = useState<WorkloadItem['status']>('กำลังดำเนินการ');
  const [formHoursPerWeek, setFormHoursPerWeek] = useState<number>(2);
  const [formCoResponsibleIds, setFormCoResponsibleIds] = useState<string[]>([]);
  const [formCoEmpLegacy, setFormCoEmpLegacy] = useState<string>('');
  const [coSearchTerm, setCoSearchTerm] = useState<string>('');

  // Academic Year Rollover Modal State
  const [isRolloverModalOpen, setIsRolloverModalOpen] = useState<boolean>(false);
  const [rolloverSourceYear, setRolloverSourceYear] = useState<string>(defaultAcademicYear);
  const [rolloverTargetYear, setRolloverTargetYear] = useState<string>(
    String((Number(defaultAcademicYear) || 2569) + 1)
  );
  const [rolloverIncludeAdmin, setRolloverIncludeAdmin] = useState<boolean>(true);
  const [rolloverIncludeAdhoc, setRolloverIncludeAdhoc] = useState<boolean>(false);
  const [isRollingOver, setIsRollingOver] = useState<boolean>(false);

  const canManage = isAdminRole(currentRole);

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
        .then((res) => res.json())
        .then((data) => {
          if (isMounted && data.success && Array.isArray(data.data)) {
            setTeachersList(data.data);
          }
        })
        .catch(() => {}),
      fetch('/api/admin/workload', { cache: 'no-store' })
        .then((res) => res.json())
        .then((data) => {
          if (isMounted && data.success && Array.isArray(data.data)) {
            setWorkloads(data.data);
          }
        })
        .catch(() => {}),
    ]).finally(() => {
      if (isMounted) setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const sortedTeachers = useMemo(() => sortTeachersByBranch(teachersList), [teachersList]);

  const teacherMap = useMemo(() => {
    const map = new Map<string, TeacherRecord>();
    for (const t of teachersList) {
      map.set(t.id, t);
    }
    return map;
  }, [teachersList]);

  const obecSystemMetaMap = useMemo(() => {
    const map = new Map<string, { name: string; cycle: string; division: StandardDivisionName }>();
    for (const sys of OBEC_SYSTEM_CATALOG) {
      map.set(sys.code, { name: sys.name, cycle: sys.cycle, division: sys.division });
    }
    return map;
  }, []);

  // Effective year for PA Summary & quick assign
  const effectivePaYear = academicYearFilter !== 'ALL' ? academicYearFilter : defaultAcademicYear;

  // Phase 10: Fetch Timetable + Kindergarten + Substitutions when viewing PA Summary tab
  useEffect(() => {
    if (activeTab !== 'pa_summary') return;
    let isMounted = true;
    setIsLoadingPaData(true);

    Promise.all([
      fetch(
        `/api/timetable?academicYear=${encodeURIComponent(effectivePaYear)}&semester=${encodeURIComponent(paSemester)}`,
        { cache: 'no-store' }
      )
        .then((r) => r.json())
        .then((res) => {
          if (isMounted && res.success && res.data) {
            setPaSlots(Array.isArray(res.data.slots) ? res.data.slots : []);
            setPaKindergarten(
              Array.isArray(res.data.kindergartenSchedules) ? res.data.kindergartenSchedules : []
            );
            if (Array.isArray(res.data.settings?.periodsConfig)) {
              setPaPeriodsConfig(res.data.settings.periodsConfig);
            }
          }
        })
        .catch(() => {}),
      fetch(
        `/api/timetable/substitutions?academicYear=${encodeURIComponent(effectivePaYear)}&semester=${encodeURIComponent(paSemester)}`,
        { cache: 'no-store' }
      )
        .then((r) => r.json())
        .then((res) => {
          if (isMounted && res.success && Array.isArray(res.data)) {
            setPaSubstitutions(res.data);
          }
        })
        .catch(() => {}),
    ]).finally(() => {
      if (isMounted) setIsLoadingPaData(false);
    });

    return () => {
      isMounted = false;
    };
  }, [activeTab, effectivePaYear, paSemester]);

  // Phase 10: OBEC 38-System Directory
  const obecDirectory = useMemo(() => {
    return buildObecSystemDirectory({
      workloads,
      teachers: sortedTeachers,
      academicYear: academicYearFilter,
    });
  }, [workloads, sortedTeachers, academicYearFilter]);

  const filteredObecDirectoryItems = useMemo(() => {
    const q = obecSearchTerm.trim().toLowerCase();
    return obecDirectory.items.filter((item) => {
      if (obecDivisionFilter !== 'ALL' && item.division !== obecDivisionFilter) return false;
      if (obecStatusFilter === 'ASSIGNED' && !item.isAssigned) return false;
      if (obecStatusFilter === 'UNASSIGNED' && item.isAssigned) return false;
      if (!q) return true;
      return (
        item.code.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q) ||
        item.division.toLowerCase().includes(q) ||
        item.primaryStaff.some((s) => s.name.toLowerCase().includes(q)) ||
        item.coStaff.some((s) => s.name.toLowerCase().includes(q))
      );
    });
  }, [obecDirectory.items, obecSearchTerm, obecDivisionFilter, obecStatusFilter]);

  // Phase 10: Unified PA Assessment Summary
  const paSummary = useMemo(() => {
    return buildPaStaffSummary({
      teachers: sortedTeachers,
      workloads,
      slots: paSlots,
      kindergartenSchedules: paKindergarten,
      substitutions: paSubstitutions,
      periodsConfig: paPeriodsConfig,
      academicYear: effectivePaYear,
      semester: paSemester,
    });
  }, [
    sortedTeachers,
    workloads,
    paSlots,
    paKindergarten,
    paSubstitutions,
    paPeriodsConfig,
    effectivePaYear,
    paSemester,
  ]);

  const downloadCsvFile = (csvContent: string, filename: string) => {
    if (typeof window === 'undefined') return;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportObecDirectoryCsv = () => {
    const yearTag = academicYearFilter === 'ALL' ? 'ALL' : academicYearFilter;
    const csv = exportObecDirectoryCsv(obecDirectory, yearTag);
    downloadCsvFile(csv, `ManStat_OBEC_38_Systems_${yearTag}.csv`);
  };

  const handleExportPaSummaryCsv = () => {
    const csv = exportPaSummaryCsv(paSummary, effectivePaYear, paSemester);
    downloadCsvFile(csv, `ManStat_PA_Summary_${effectivePaYear}_${paSemester}.csv`);
  };

  // Phase 10: 1-Click Quick Assign from Unassigned OBEC System row
  const handleQuickAssignObecSystem = (division: StandardDivisionName, systemCode: string) => {
    if (!canManage) return;
    setEditingWorkloadId(null);
    setFormTeacherId(sortedTeachers[0]?.id || '');
    setFormAcademicYear(effectivePaYear);
    setFormCategory(ADMIN_DIVISION_CATEGORY);
    setFormSubGroup(division);
    setFormRoleDropdownValue('');
    setFormTitle('');
    setFormScopeDescription('');
    setIsScopeAutoFilled(false);
    setFormObecSystems([systemCode]);
    setFormCustomSystem('');
    setShowAllObecSystems(false);
    setFormRole('ผู้รับผิดชอบหลัก / เจ้าหน้าที่');
    setFormOrderRef('');
    setFormStatus('กำลังดำเนินการ');
    setFormHoursPerWeek(2);
    setFormCoResponsibleIds([]);
    setFormCoEmpLegacy('');
    setCoSearchTerm('');
    setIsModalOpen(true);
  };

  // Years with existing admin or ad-hoc records (for rollover source dropdown)
  const yearsWithData = useMemo(() => {
    const set = new Set<string>();
    for (const w of workloads) {
      if (
        (w.category === ADMIN_DIVISION_CATEGORY || w.category === ADHOC_PROJECT_CATEGORY) &&
        w.academicYear &&
        w.academicYear.trim()
      ) {
        set.add(w.academicYear.trim());
      }
    }
    return Array.from(set).sort((a, b) => b.localeCompare(a, 'en'));
  }, [workloads]);

  // Academic years available for filter & forms
  const academicYearOptions = useMemo(() => {
    const set = new Set<string>([defaultAcademicYear]);
    const currentNum = Number(defaultAcademicYear);
    if (!Number.isNaN(currentNum)) {
      set.add(String(currentNum + 1));
      set.add(String(currentNum + 2));
      set.add(String(currentNum - 1));
      set.add(String(currentNum - 2));
    }
    for (const w of workloads) {
      if (w.academicYear && w.academicYear.trim()) {
        set.add(w.academicYear.trim());
      }
    }
    return Array.from(set).sort((a, b) => b.localeCompare(a, 'en'));
  }, [workloads, defaultAcademicYear]);

  // Workloads filtered by academic year
  const yearFilteredWorkloads = useMemo(() => {
    if (academicYearFilter === 'ALL') return workloads;
    return workloads.filter((w) => (w.academicYear || '').trim() === academicYearFilter);
  }, [workloads, academicYearFilter]);

  // Active division presets filtered strictly for cascading dropdown
  const divisionRolePresets = useMemo(() => {
    const normalizedDiv = normalizeDivisionName(formSubGroup);
    if (!normalizedDiv) return [];
    return OBEC_ADMIN_ROLE_PRESETS.filter((p) => p.division === normalizedDiv);
  }, [formSubGroup]);

  // Rollover live counts for selected sourceYear
  const rolloverSourceCounts = useMemo(() => {
    let adminCount = 0;
    let adhocCount = 0;
    for (const w of workloads) {
      if ((w.academicYear || '').trim() !== rolloverSourceYear) continue;
      if (w.category === ADMIN_DIVISION_CATEGORY) adminCount += 1;
      else if (w.category === ADHOC_PROJECT_CATEGORY) adhocCount += 1;
    }
    return { adminCount, adhocCount };
  }, [workloads, rolloverSourceYear]);

  const showNotice = (type: 'success' | 'error', text: string) => {
    setStatusNotice({ type, text });
    setTimeout(() => setStatusNotice(null), 5000);
  };

  const toggleExpand = (teacherId: string) => {
    setExpandedTeacherId((prev) => (prev === teacherId ? null : teacherId));
  };

  // Open Create Modal
  const handleOpenAssignModal = (teacherId?: string, category?: WorkloadCategory) => {
    if (!canManage) return;
    const targetTeacherId = teacherId || sortedTeachers[0]?.id || '';
    const targetCat: WorkloadCategory =
      category === ADHOC_PROJECT_CATEGORY ? ADHOC_PROJECT_CATEGORY : ADMIN_DIVISION_CATEGORY;

    setEditingWorkloadId(null);
    setFormTeacherId(targetTeacherId);
    setFormAcademicYear(academicYearFilter !== 'ALL' ? academicYearFilter : defaultAcademicYear);
    setFormCategory(targetCat);
    setFormSubGroup(targetCat === ADMIN_DIVISION_CATEGORY ? STANDARD_DIVISIONS[0] : '');
    setFormRoleDropdownValue('');
    setFormTitle('');
    setFormScopeDescription('');
    setIsScopeAutoFilled(false);
    setFormObecSystems([]);
    setFormCustomSystem('');
    setShowAllObecSystems(false);
    setFormRole(
      targetCat === ADMIN_DIVISION_CATEGORY
        ? 'ผู้รับผิดชอบหลัก / เจ้าหน้าที่'
        : 'กรรมการ / ผู้ปฏิบัติงาน'
    );
    setFormOrderRef('');
    setFormStatus('กำลังดำเนินการ');
    setFormHoursPerWeek(2);
    setFormCoResponsibleIds([]);
    setFormCoEmpLegacy('');
    setCoSearchTerm('');
    setIsModalOpen(true);
  };

  // Open Edit Modal (preserves exact saved roleTitle, scopeDescription, obecSystems)
  const handleOpenEditModal = (item: WorkloadItem) => {
    if (!canManage) return;
    const normalizedCat: WorkloadCategory =
      item.category === ADMIN_DIVISION_CATEGORY ? ADMIN_DIVISION_CATEGORY : ADHOC_PROJECT_CATEGORY;
    const resolvedSub =
      normalizedCat === ADMIN_DIVISION_CATEGORY
        ? normalizeDivisionName(item.subGroupOrLevel) || item.subGroupOrLevel || STANDARD_DIVISIONS[0]
        : item.subGroupOrLevel || '';

    let matchedDropdownValue = CUSTOM_ROLE_OPTION;
    const trimmedTitle = (item.title || '').trim();
    if (normalizedCat === ADMIN_DIVISION_CATEGORY) {
      const normalizedDiv = normalizeDivisionName(resolvedSub);
      const found = OBEC_ADMIN_ROLE_PRESETS.find(
        (p) => p.division === normalizedDiv && p.roleTitle === trimmedTitle
      );
      if (found) matchedDropdownValue = found.id;
    } else {
      const found = ADHOC_PROJECT_PRESETS.find((p) => p.roleTitle === trimmedTitle);
      if (found) matchedDropdownValue = found.id;
    }

    setEditingWorkloadId(item.id);
    setFormTeacherId(item.teacherId);
    setFormAcademicYear((item.academicYear || '').trim() || defaultAcademicYear);
    setFormCategory(normalizedCat);
    setFormSubGroup(resolvedSub);
    setFormRoleDropdownValue(matchedDropdownValue);
    setFormTitle(trimmedTitle);
    setFormScopeDescription(item.scopeDescription || '');
    setIsScopeAutoFilled(false);
    setFormObecSystems(Array.isArray(item.obecSystems) ? [...item.obecSystems] : []);
    setFormCustomSystem('');
    setShowAllObecSystems(false);
    setFormRole(item.roleInTask || 'ผู้รับผิดชอบหลัก / เจ้าหน้าที่');
    setFormOrderRef(item.orderOrRef || '');
    setFormStatus(item.status || 'กำลังดำเนินการ');
    setFormHoursPerWeek(Number(item.hoursPerWeek) >= 0 ? Number(item.hoursPerWeek) : 2);
    setFormCoResponsibleIds(Array.isArray(item.coResponsibleIds) ? [...item.coResponsibleIds] : []);
    setFormCoEmpLegacy(item.coEmp || '');
    setCoSearchTerm('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (isSaving) return;
    setIsModalOpen(false);
    setEditingWorkloadId(null);
  };

  const handleCategorySwitch = (newCat: WorkloadCategory) => {
    if (newCat === formCategory) return;
    setFormCategory(newCat);
    setFormRoleDropdownValue('');
    setIsScopeAutoFilled(false);
    if (!editingWorkloadId) {
      setFormTitle('');
      setFormScopeDescription('');
      setFormObecSystems([]);
      setFormSubGroup(newCat === ADMIN_DIVISION_CATEGORY ? STANDARD_DIVISIONS[0] : '');
      setFormRole(
        newCat === ADMIN_DIVISION_CATEGORY
          ? 'ผู้รับผิดชอบหลัก / เจ้าหน้าที่'
          : 'กรรมการ / ผู้ปฏิบัติงาน'
      );
    } else if (newCat === ADMIN_DIVISION_CATEGORY) {
      const normalized = normalizeDivisionName(formSubGroup);
      if (!normalized) {
        setFormSubGroup(STANDARD_DIVISIONS[0]);
      }
      setFormRoleDropdownValue(CUSTOM_ROLE_OPTION);
    } else {
      setFormRoleDropdownValue(CUSTOM_ROLE_OPTION);
    }
  };

  const handleDivisionChange = (newDivision: string) => {
    setFormSubGroup(newDivision);
    setFormRoleDropdownValue('');
    setFormTitle('');
    setIsScopeAutoFilled(false);
  };

  const handleRoleDropdownChange = (selectedValue: string) => {
    setFormRoleDropdownValue(selectedValue);

    if (!selectedValue) {
      setFormTitle('');
      setIsScopeAutoFilled(false);
      return;
    }

    if (selectedValue === CUSTOM_ROLE_OPTION) {
      setFormTitle('');
      setIsScopeAutoFilled(false);
      return;
    }

    if (formCategory === ADMIN_DIVISION_CATEGORY) {
      const found = OBEC_ADMIN_ROLE_PRESETS.find((p) => p.id === selectedValue);
      if (found) {
        setFormSubGroup(found.division);
        setFormTitle(found.roleTitle);
        setFormRole(found.defaultRoleInTask);
        setFormScopeDescription(found.defaultScope);
        setFormObecSystems([...found.obecSystems]);
        setIsScopeAutoFilled(true);
      }
    } else {
      const found = ADHOC_PROJECT_PRESETS.find((p) => p.id === selectedValue);
      if (found) {
        setFormSubGroup(found.defaultSubGroup);
        setFormTitle(found.roleTitle);
        setFormRole(found.defaultRoleInTask);
        setFormScopeDescription(found.defaultScope);
        setFormObecSystems([...found.obecSystems]);
        setIsScopeAutoFilled(true);
      }
    }
  };

  const toggleObecSystem = (code: string) => {
    setFormObecSystems((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const handleAddCustomSystem = () => {
    const trimmed = formCustomSystem.trim();
    if (!trimmed) return;
    if (!formObecSystems.includes(trimmed)) {
      setFormObecSystems((prev) => [...prev, trimmed]);
    }
    setFormCustomSystem('');
  };

  const toggleCoResponsible = (empId: string) => {
    setFormCoResponsibleIds((prev) =>
      prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId]
    );
  };

  const handleSaveWorkload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage || !formTeacherId || !formTitle.trim()) return;

    const cleanedCoIds = formCoResponsibleIds.filter((id) => id !== formTeacherId);
    const resolvedSubGroup =
      formCategory === ADMIN_DIVISION_CATEGORY
        ? normalizeDivisionName(formSubGroup) || formSubGroup.trim() || STANDARD_DIVISIONS[0]
        : formSubGroup.trim() || undefined;

    const entry: WorkloadItem = {
      id: editingWorkloadId || `WL-${Date.now().toString().slice(-6)}`,
      teacherId: formTeacherId,
      category: formCategory,
      title: formTitle.trim(),
      subGroupOrLevel: resolvedSubGroup,
      hoursPerWeek: Number(formHoursPerWeek) >= 0 ? Number(formHoursPerWeek) : 2,
      roleInTask: formRole || 'ผู้รับผิดชอบหลัก / เจ้าหน้าที่',
      orderOrRef: formOrderRef.trim() || undefined,
      status: formStatus,
      coEmp: formCoEmpLegacy.trim() || undefined,
      academicYear: formAcademicYear.trim() || defaultAcademicYear,
      scopeDescription: formScopeDescription.trim() || undefined,
      obecSystems: formObecSystems,
      coResponsibleIds: cleanedCoIds,
    };

    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/workload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'ไม่สามารถบันทึกข้อมูลหน้าที่ความรับผิดชอบได้');
      }

      const savedItem: WorkloadItem = json.data || entry;
      setWorkloads((prev) =>
        editingWorkloadId
          ? prev.map((w) => (w.id === editingWorkloadId ? savedItem : w))
          : [...prev, savedItem]
      );
      setIsModalOpen(false);
      setEditingWorkloadId(null);
      setExpandedTeacherId(formTeacherId);
      showNotice(
        'success',
        editingWorkloadId
          ? 'อัปเดตข้อมูลงานบริหารและหน้าที่พิเศษเรียบร้อยแล้ว'
          : 'มอบหมายงานบริหารและหน้าที่พิเศษเรียบร้อยแล้ว'
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึกข้อมูล';
      console.error('Failed to save workload to DB:', err);
      showNotice('error', message);
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDeleteWorkload = async () => {
    if (!canManage || !deletingWorkload) return;
    const targetId = deletingWorkload.id;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/admin/workload?id=${encodeURIComponent(targetId)}`, {
        method: 'DELETE',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'ไม่สามารถลบรายการภาระงานได้');
      }
      setWorkloads((prev) => prev.filter((w) => w.id !== targetId));
      setDeletingWorkload(null);
      showNotice('success', 'ลบรายการหน้าที่ความรับผิดชอบเรียบร้อยแล้ว');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการลบข้อมูล';
      console.error('Failed to delete workload from DB:', err);
      showNotice('error', message);
    } finally {
      setIsSaving(false);
    }
  };

  // Open Academic Year Rollover Modal
  const handleOpenRolloverModal = (preferredTargetYear?: string) => {
    if (!canManage) return;
    const latestSource = yearsWithData[0] || defaultAcademicYear;
    const computedTarget =
      preferredTargetYear && preferredTargetYear !== latestSource
        ? preferredTargetYear
        : String((Number(latestSource) || Number(defaultAcademicYear) || 2569) + 1);

    setRolloverSourceYear(latestSource);
    setRolloverTargetYear(computedTarget);
    setRolloverIncludeAdmin(true);
    setRolloverIncludeAdhoc(false);
    setIsRolloverModalOpen(true);
  };

  const handleCloseRolloverModal = () => {
    if (isRollingOver) return;
    setIsRolloverModalOpen(false);
  };

  const handleExecuteRollover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !canManage ||
      !rolloverSourceYear ||
      !rolloverTargetYear ||
      rolloverSourceYear === rolloverTargetYear ||
      (!rolloverIncludeAdmin && !rolloverIncludeAdhoc)
    ) {
      return;
    }

    setIsRollingOver(true);
    try {
      const res = await fetch('/api/admin/workload/rollover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceYear: rolloverSourceYear,
          targetYear: rolloverTargetYear,
          includeAdminRoles: rolloverIncludeAdmin,
          includeAdhocProjects: rolloverIncludeAdhoc,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'ไม่สามารถคัดลอกโครงสร้างงานข้ามปีการศึกษาได้');
      }

      // Refresh workloads from server so client state is 100% synced
      const refreshRes = await fetch('/api/admin/workload', { cache: 'no-store' });
      const refreshJson = await refreshRes.json().catch(() => ({}));
      if (refreshRes.ok && refreshJson.success && Array.isArray(refreshJson.data)) {
        setWorkloads(refreshJson.data);
      } else if (Array.isArray(json.data?.created)) {
        setWorkloads((prev) => [...prev, ...json.data.created]);
      }

      const createdCount = Number(json.data?.createdCount ?? 0);
      const skippedDuplicates = Number(json.data?.skippedDuplicates ?? 0);
      const skippedInactiveStaff = Number(json.data?.skippedInactiveStaff ?? 0);

      const skippedParts: string[] = [];
      if (skippedDuplicates > 0) skippedParts.push(`ข้ามรายการซ้ำ ${skippedDuplicates} รายการ`);
      if (skippedInactiveStaff > 0) skippedParts.push(`ข้ามบุคลากรพ้นสภาพ ${skippedInactiveStaff} รายการ`);

      setAcademicYearFilter(rolloverTargetYear);
      setIsRolloverModalOpen(false);
      showNotice(
        'success',
        skippedParts.length > 0
          ? `คัดลอกโครงสร้างงานไปยังปีการศึกษา ${rolloverTargetYear} สำเร็จ ${createdCount} รายการ (${skippedParts.join(', ')})`
          : `คัดลอกโครงสร้างงานไปยังปีการศึกษา ${rolloverTargetYear} สำเร็จ ${createdCount} รายการ`
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการคัดลอกโครงสร้างงาน';
      console.error('Failed to rollover workloads:', err);
      showNotice('error', message);
    } finally {
      setIsRollingOver(false);
    }
  };

  // Aggregate per teacher
  const staffRows = useMemo(() => {
    return sortedTeachers.map((teacher) => {
      const branch = getStaffBranch(teacher);
      const isSupport = branch === 'support';
      const teacherWorkloads = yearFilteredWorkloads.filter((w) => w.teacherId === teacher.id);

      const adminItems = teacherWorkloads.filter((w) => w.category === ADMIN_DIVISION_CATEGORY);
      const adhocItems = teacherWorkloads.filter(
        (w) => w.category === ADHOC_PROJECT_CATEGORY || w.category === LEGACY_CARE_CATEGORY
      );
      const legacyTeachingItems = teacherWorkloads.filter(
        (w) => w.category === LEGACY_TEACHING_CATEGORY
      );

      const derivedDivisions =
        academicYearFilter === 'ALL'
          ? getStaffDivisions(teacher, workloads)
          : Array.from(
              new Set(
                adminItems
                  .map((item) => normalizeDivisionName(item.subGroupOrLevel))
                  .filter((d): d is StandardDivisionName => Boolean(d))
              )
            );

      const obecSystems = Array.from(
        new Set(
          [...adminItems, ...adhocItems].flatMap((item) =>
            Array.isArray(item.obecSystems) ? item.obecSystems : []
          )
        )
      );

      return {
        teacher,
        id: teacher.id,
        branch,
        isSupport,
        name: formatStaffName(teacher),
        position: teacher.position || '-',
        department: teacher.department || '-',
        derivedDivisions,
        adminItems,
        adhocItems,
        legacyTeachingItems,
        obecSystems,
      };
    });
  }, [sortedTeachers, yearFilteredWorkloads, workloads, academicYearFilter]);

  const divisionSummary = useMemo(() => {
    return STANDARD_DIVISIONS.map((div) => {
      const roleCount = yearFilteredWorkloads.filter(
        (w) =>
          w.category === ADMIN_DIVISION_CATEGORY &&
          normalizeDivisionName(w.subGroupOrLevel) === div
      ).length;
      const staffCount = staffRows.filter((row) => row.derivedDivisions.includes(div)).length;
      return { division: div, roleCount, staffCount };
    });
  }, [yearFilteredWorkloads, staffRows]);

  const filteredRows = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return staffRows.filter((row) => {
      const matchesDivision =
        divisionFilter === 'ALL' || row.derivedDivisions.includes(divisionFilter);

      if (!matchesDivision) return false;
      if (!q) return true;

      return (
        row.name.toLowerCase().includes(q) ||
        row.position.toLowerCase().includes(q) ||
        row.department.toLowerCase().includes(q) ||
        row.derivedDivisions.some((d) => d.toLowerCase().includes(q)) ||
        row.obecSystems.some((s) => s.toLowerCase().includes(q)) ||
        row.adminItems.some(
          (item) =>
            (item.title || '').toLowerCase().includes(q) ||
            (item.scopeDescription || '').toLowerCase().includes(q) ||
            (item.orderOrRef || '').toLowerCase().includes(q)
        ) ||
        row.adhocItems.some(
          (item) =>
            (item.title || '').toLowerCase().includes(q) ||
            (item.scopeDescription || '').toLowerCase().includes(q) ||
            (item.orderOrRef || '').toLowerCase().includes(q)
        )
      );
    });
  }, [staffRows, searchTerm, divisionFilter]);

  const visibleObecSystems = useMemo(() => {
    if (showAllObecSystems || formCategory !== ADMIN_DIVISION_CATEGORY) {
      return OBEC_SYSTEM_CATALOG;
    }
    const normalizedDiv = normalizeDivisionName(formSubGroup);
    if (!normalizedDiv) return OBEC_SYSTEM_CATALOG;
    const divMatched = OBEC_SYSTEM_CATALOG.filter((s) => s.division === normalizedDiv);
    return divMatched.length > 0 ? divMatched : OBEC_SYSTEM_CATALOG;
  }, [showAllObecSystems, formCategory, formSubGroup]);

  const coResponsibleCandidates = useMemo(() => {
    const q = coSearchTerm.trim().toLowerCase();
    return sortedTeachers.filter((t) => {
      if (t.id === formTeacherId) return false;
      if (!q) return true;
      return formatStaffName(t).toLowerCase().includes(q);
    });
  }, [sortedTeachers, formTeacherId, coSearchTerm]);

  const isSelectedYearEmpty =
    !isLoading &&
    academicYearFilter !== 'ALL' &&
    yearFilteredWorkloads.filter(
      (w) => w.category === ADMIN_DIVISION_CATEGORY || w.category === ADHOC_PROJECT_CATEGORY
    ).length === 0;

  const resolveCoResponsibleNames = (item: WorkloadItem): string[] => {
    const names: string[] = [];
    if (Array.isArray(item.coResponsibleIds)) {
      for (const id of item.coResponsibleIds) {
        const found = teacherMap.get(id);
        names.push(found ? formatStaffName(found) : id);
      }
    }
    if (item.coEmp && item.coEmp.trim()) {
      names.push(item.coEmp.trim());
    }
    return names;
  };

  const renderRoleCard = (item: WorkloadItem, isLegacyCat4 = false) => {
    const divisionLabel =
      item.category === ADMIN_DIVISION_CATEGORY
        ? normalizeDivisionName(item.subGroupOrLevel) || item.subGroupOrLevel || 'ไม่ระบุฝ่าย'
        : item.subGroupOrLevel || 'งานโครงการ / คณะกรรมการ';
    const systems = Array.isArray(item.obecSystems) ? item.obecSystems : [];
    const coNames = resolveCoResponsibleNames(item);

    return (
      <div
        key={item.id}
        className="bg-white dark:bg-[#121a24] border border-slate-200/90 dark:border-slate-800 rounded-xl p-4 space-y-2.5 shadow-xs"
      >
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${getDivisionBadgeStyle(
                  divisionLabel
                )}`}
              >
                {divisionLabel}
              </span>
              {item.academicYear && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  <Calendar className="w-3 h-3 shrink-0" />
                  <span>ปีการศึกษา {item.academicYear}</span>
                </span>
              )}
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${getStatusBadgeStyle(
                  item.status
                )}`}
              >
                {item.status}
              </span>
              {isLegacyCat4 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  รายการเดิม
                </span>
              )}
            </div>

            <h5 className="text-sm font-semibold text-slate-900 dark:text-white leading-snug">
              {item.title}
            </h5>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
              <span>
                บทบาท:{' '}
                <strong className="font-medium text-slate-700 dark:text-slate-200">
                  {item.roleInTask || '-'}
                </strong>
              </span>
              {item.orderOrRef && (
                <span className="inline-flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                  <span>{item.orderOrRef}</span>
                </span>
              )}
            </div>
          </div>

          {canManage && (
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenEditModal(item);
                }}
                title="แก้ไขหน้าที่ความรับผิดชอบ"
                className="p-1.5 rounded-lg text-slate-500 hover:text-sky-600 hover:bg-sky-50 dark:text-slate-400 dark:hover:text-sky-400 dark:hover:bg-sky-950/40 transition-colors cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeletingWorkload(item);
                }}
                title="ลบรายการ"
                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:text-slate-400 dark:hover:text-rose-400 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {item.scopeDescription && (
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50/90 dark:bg-[#0e151f] px-3 py-2 rounded-lg border border-slate-100 dark:border-slate-800/80">
            {item.scopeDescription}
          </p>
        )}

        {systems.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 mr-1">
              <Database className="w-3.5 h-3.5 shrink-0 text-sky-500" />
              <span>ระบบรายงาน สพฐ.:</span>
            </span>
            {systems.map((code) => {
              const meta = obecSystemMetaMap.get(code);
              return (
                <span
                  key={code}
                  title={meta ? `${meta.name} (${meta.cycle})` : code}
                  className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800/80"
                >
                  {code}
                </span>
              );
            })}
          </div>
        )}

        {coNames.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-xs text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1 font-medium">
              <Users className="w-3.5 h-3.5 shrink-0 text-slate-400" />
              <span>ผู้ร่วมรับผิดชอบ:</span>
            </span>
            <span className="text-slate-700 dark:text-slate-200">{coNames.join(', ')}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header & Primary Actions */}
      <div className="bg-white dark:bg-[#121822] p-5 sm:p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors duration-200">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-sky-500 dark:text-sky-400 shrink-0" />
            <span>งานบริหาร 4 ฝ่ายและหน้าที่พิเศษ</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            บริหารจัดการโครงสร้างงาน 4 ฝ่ายมาตรฐาน สพฐ. ขอบข่ายภาระงาน ระบบรายงานอิเล็กทรอนิกส์ และคำสั่งคณะกรรมการเฉพาะกิจ
          </p>
        </div>

        {canManage && (
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => handleOpenRolloverModal()}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium border border-slate-200 dark:border-slate-700 transition-colors duration-200 cursor-pointer"
            >
              <Copy className="w-4 h-4 shrink-0" />
              <span>คัดลอกโครงสร้างข้ามปี</span>
            </button>
            <button
              type="button"
              onClick={() => handleOpenAssignModal()}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium border border-transparent transition-colors duration-200 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 shrink-0" />
              <span>มอบหมายงานบริหารและหน้าที่พิเศษ</span>
            </button>
          </div>
        )}
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

      {/* Sub-Tabs Navigation (Phase 10: 3-in-1 Executive Workload Suite) */}
      <div
        role="tablist"
        aria-label="มุมมองจัดการภาระงานและรายงาน"
        className="flex flex-wrap items-center gap-1.5 bg-white dark:bg-[#121822] p-1.5 rounded-2xl border border-slate-200/90 dark:border-slate-800/80 shadow-xs"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'list'}
          onClick={() => setActiveTab('list')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'list'
              ? 'bg-sky-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70'
          }`}
        >
          <Briefcase className="w-4 h-4 shrink-0" />
          <span>รายการภาระงาน</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'obec_directory'}
          onClick={() => setActiveTab('obec_directory')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'obec_directory'
              ? 'bg-sky-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70'
          }`}
        >
          <Database className="w-4 h-4 shrink-0" />
          <span>ทำเนียบระบบ สพฐ. (38 ระบบ)</span>
          <span
            className={`font-mono text-[10px] px-1.5 py-0.5 rounded-md ${
              activeTab === 'obec_directory'
                ? 'bg-white/20 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            {obecDirectory.assignedCount}/{obecDirectory.totalSystems}
          </span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'pa_summary'}
          onClick={() => setActiveTab('pa_summary')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'pa_summary'
              ? 'bg-sky-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70'
          }`}
        >
          <ClipboardList className="w-4 h-4 shrink-0" />
          <span>สรุปภาระงานรวม (PA)</span>
        </button>
      </div>

      {activeTab === 'list' && (
        <>
      {/* 4 Standard Divisions Quick Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {divisionSummary.map((item) => {
          const isActive = divisionFilter === item.division;
          return (
            <button
              key={item.division}
              type="button"
              onClick={() =>
                setDivisionFilter((prev) => (prev === item.division ? 'ALL' : item.division))
              }
              className={`text-left p-4 rounded-xl border transition-all cursor-pointer ${
                isActive
                  ? 'bg-sky-50/90 dark:bg-sky-950/40 border-sky-400 dark:border-sky-600 ring-1 ring-sky-400/40'
                  : 'bg-white dark:bg-[#121822] border-slate-200/90 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                  {item.division}
                </span>
                <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
              </div>
              <div className="mt-2 flex items-baseline gap-3">
                <span className="text-lg font-bold font-mono text-slate-900 dark:text-white">
                  {item.roleCount}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  หน้าที่ · {item.staffCount} บุคลากร
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="relative md:col-span-6">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 shrink-0" />
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ค้นหาชื่อบุคลากร, ตำแหน่งหน้าที่, ระบบรายงาน สพฐ., ฝ่ายงาน..."
            className="w-full h-10 bg-slate-50 dark:bg-[#101822] border border-slate-200 dark:border-slate-700/80 rounded-xl pl-10 pr-3.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-sky-500 transition-all"
          />
        </div>

        <div className="md:col-span-3">
          <select
            aria-label="กรองตามปีการศึกษา"
            value={academicYearFilter}
            onChange={(e) => setAcademicYearFilter(e.target.value)}
            className="w-full h-10 bg-slate-50 dark:bg-[#101822] border border-slate-200 dark:border-slate-700/80 rounded-xl px-3 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-sky-500 cursor-pointer"
          >
            <option value="ALL">ปีการศึกษา: ทั้งหมด</option>
            {academicYearOptions.map((yr) => (
              <option key={yr} value={yr}>
                ปีการศึกษา {yr}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-3">
          <select
            aria-label="กรองตามสังกัดฝ่ายงาน"
            value={divisionFilter}
            onChange={(e) => setDivisionFilter(e.target.value)}
            className="w-full h-10 bg-slate-50 dark:bg-[#101822] border border-slate-200 dark:border-slate-700/80 rounded-xl px-3 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-sky-500 cursor-pointer"
          >
            <option value="ALL">สังกัดฝ่ายงาน: ทั้งหมด</option>
            {STANDARD_DIVISIONS.map((div) => (
              <option key={div} value={div}>
                {div}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Empty Selected Academic Year CTA Banner */}
      {isSelectedYearEmpty && (
        <div className="bg-sky-50/70 dark:bg-sky-950/30 border border-dashed border-sky-300 dark:border-sky-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-sky-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                ยังไม่มีโครงสร้างงานบริหารในปีการศึกษา {academicYearFilter}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                สามารถคัดลอกโครงสร้างงาน 4 ฝ่ายจากปีการศึกษาก่อนหน้ามาตั้งต้นได้ทันที โดยไม่กระทบข้อมูลประวัติปีเดิม
              </p>
            </div>
          </div>
          {canManage && yearsWithData.length > 0 && (
            <button
              type="button"
              onClick={() => handleOpenRolloverModal(academicYearFilter)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition-colors cursor-pointer shrink-0"
            >
              <Copy className="w-4 h-4 shrink-0" />
              <span>คัดลอกโครงสร้างจากปีก่อนหน้า</span>
            </button>
          )}
        </div>
      )}

      {/* Staff Administration Table (Master-Detail Accordion) */}
      <div className="bg-white dark:bg-[#121822] p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800/80 space-y-4 shadow-sm transition-colors duration-200">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-100/80 dark:bg-[#101822] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-200/90 dark:border-slate-800">
              <tr>
                <th scope="col" className="w-12 px-3 py-3.5 text-center font-mono">
                  ลำดับ
                </th>
                <th scope="col" className="w-[28%] px-4 py-3.5">
                  บุคลากร / ตำแหน่ง
                </th>
                <th scope="col" className="w-[24%] px-4 py-3.5">
                  สังกัดฝ่ายงาน
                </th>
                <th scope="col" className="w-[16%] px-4 py-3.5 text-center">
                  งานบริหาร / โครงการ
                </th>
                <th scope="col" className="w-[24%] px-4 py-3.5">
                  ระบบรายงาน สพฐ.
                </th>
                <th scope="col" className="w-10 px-3 py-3.5 text-right">
                  <span className="sr-only">ขยายรายละเอียด</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500 dark:text-slate-400">
                    <div className="inline-flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-sky-500" />
                      <span>กำลังโหลดข้อมูลงานบริหาร 4 ฝ่ายและหน้าที่พิเศษ...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500 dark:text-slate-400">
                    ไม่พบข้อมูลบุคลากรที่ตรงกับเงื่อนไขการค้นหา
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, index) => {
                  const isExpanded = expandedTeacherId === row.id;
                  const posDisplay = row.position.replace('ผู้อำนวยการสถานศึกษา', 'ผอ.สถานศึกษา');
                  const deptDisplay = row.department.replace(
                    'สายงานบริหารและสนับสนุนการศึกษา',
                    'บริหารและสนับสนุนฯ'
                  );
                  const visibleSystems = row.obecSystems.slice(0, 4);
                  const overflowSystemsCount = Math.max(0, row.obecSystems.length - 4);

                  return (
                    <React.Fragment key={row.id}>
                      <tr
                        onClick={() => toggleExpand(row.id)}
                        className={`hover:bg-slate-50 dark:hover:bg-[#1a2636]/60 transition-colors cursor-pointer ${
                          row.isSupport ? 'border-l-4 border-l-amber-500/60' : ''
                        } ${isExpanded ? 'bg-slate-50/90 dark:bg-[#15202e]' : ''}`}
                      >
                        <td className="w-12 px-3 py-3.5 text-center font-mono tabular-nums text-slate-400 dark:text-slate-500 text-xs whitespace-nowrap">
                          {index + 1}
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-slate-900 dark:text-white text-sm">
                            {row.name}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {posDisplay} · {deptDisplay}
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          {row.derivedDivisions.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {row.derivedDivisions.map((div) => (
                                <span
                                  key={div}
                                  className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${getDivisionBadgeStyle(
                                    div
                                  )}`}
                                >
                                  {div.replace('ฝ่ายบริหาร', '')}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 dark:text-slate-500">
                              ยังไม่ระบุฝ่ายงาน
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          <div className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-100">
                            {row.adminItems.length} งานฝ่าย
                          </div>
                          {row.adhocItems.length > 0 && (
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              {row.adhocItems.length} โครงการ/กรรมการ
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3.5">
                          {row.obecSystems.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {visibleSystems.map((code) => (
                                <span
                                  key={code}
                                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800/80"
                                >
                                  {code}
                                </span>
                              ))}
                              {overflowSystemsCount > 0 && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                  +{overflowSystemsCount}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 dark:text-slate-500">-</span>
                          )}
                        </td>

                        <td className="w-10 px-3 py-3.5 text-right">
                          <ChevronDown
                            className={`w-4 h-4 ml-auto text-slate-400 transition-transform duration-200 ${
                              isExpanded ? 'rotate-180 text-sky-500 dark:text-sky-400' : ''
                            }`}
                          />
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-slate-50/90 dark:bg-[#0b1016]/90 border-y border-slate-200/90 dark:border-slate-800/80">
                          <td colSpan={6} className="p-4 sm:p-6">
                            <div className="space-y-6">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                    รายละเอียดหน้าที่ความรับผิดชอบของ {row.name}
                                  </h4>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    {academicYearFilter === 'ALL'
                                      ? 'แสดงทุกปีการศึกษา'
                                      : `ปีการศึกษา ${academicYearFilter}`}
                                    {' · '}
                                    สังกัดฝ่าย:{' '}
                                    {row.derivedDivisions.length > 0
                                      ? row.derivedDivisions.join(', ')
                                      : 'ยังไม่ระบุ'}
                                  </p>
                                </div>
                                {canManage && (
                                  <div className="flex flex-wrap items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenAssignModal(row.id, ADMIN_DIVISION_CATEGORY);
                                      }}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition-colors cursor-pointer"
                                    >
                                      <Plus className="w-3.5 h-3.5 shrink-0" />
                                      <span>เพิ่มงานฝ่าย</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenAssignModal(row.id, ADHOC_PROJECT_CATEGORY);
                                      }}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-medium transition-colors cursor-pointer"
                                    >
                                      <Plus className="w-3.5 h-3.5 shrink-0" />
                                      <span>เพิ่มงานโครงการ / กรรมการ</span>
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* Section 1: 4 Standard OBEC Divisions */}
                              <div className="space-y-3">
                                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                                  <Building2 className="w-4 h-4 text-sky-500 shrink-0" />
                                  <span>งานบริหารและงานประจำฝ่าย</span>
                                  <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                    {row.adminItems.length}
                                  </span>
                                </div>

                                {row.adminItems.length === 0 ? (
                                  <div className="text-xs text-slate-400 dark:text-slate-500 italic bg-white/70 dark:bg-[#121a24]/60 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl px-4 py-4">
                                    ยังไม่มีรายการงานบริหารประจำฝ่ายที่ได้รับมอบหมาย
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                    {row.adminItems.map((item) => renderRoleCard(item))}
                                  </div>
                                )}
                              </div>

                              {/* Section 2: Ad-hoc Projects & Committees */}
                              <div className="space-y-3">
                                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                                  <Layers className="w-4 h-4 text-violet-500 shrink-0" />
                                  <span>งานโครงการและคณะกรรมการเฉพาะกิจ</span>
                                  <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                    {row.adhocItems.length}
                                  </span>
                                </div>

                                {row.adhocItems.length === 0 ? (
                                  <div className="text-xs text-slate-400 dark:text-slate-500 italic bg-white/70 dark:bg-[#121a24]/60 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl px-4 py-4">
                                    ยังไม่มีรายการงานโครงการหรือคณะกรรมการเฉพาะกิจ
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                    {row.adhocItems.map((item) =>
                                      renderRoleCard(item, item.category === LEGACY_CARE_CATEGORY)
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Section 3: Non-destructive Read-Only Legacy Teaching Records */}
                              {row.legacyTeachingItems.length > 0 && (
                                <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-100/70 dark:bg-slate-900/40 p-4 space-y-2.5">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                                      <Archive className="w-4 h-4 text-slate-400 shrink-0" />
                                      <span>รายการงานสอนเดิม — รอโอนย้ายสู่เมนูตารางสอนในเฟส 9</span>
                                      <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                        {row.legacyTeachingItems.length}
                                      </span>
                                    </div>
                                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                      แสดงแบบอ่านอย่างเดียว
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {row.legacyTeachingItems.map((tItem) => (
                                      <div
                                        key={tItem.id}
                                        className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white/80 dark:bg-[#121a24]/80 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300"
                                      >
                                        <span className="truncate">
                                          {tItem.courseCode ? `[${tItem.courseCode}] ` : ''}
                                          {tItem.title}
                                          {tItem.subGroupOrLevel ? ` (${tItem.subGroupOrLevel})` : ''}
                                        </span>
                                        <span className="font-mono text-[11px] text-slate-500 shrink-0">
                                          {tItem.hoursPerWeek} ชม./สัปดาห์
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}

      {/* ================================================================= */}
      {/* TAB 2: ทำเนียบระบบ สพฐ. (38 ระบบ)                                 */}
      {/* ================================================================= */}
      {activeTab === 'obec_directory' && (
        <div className="space-y-4">
          {/* Top KPI & Export Bar */}
          <div className="bg-white dark:bg-[#121822] p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/70 font-semibold">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>
                  มอบหมายแล้ว{' '}
                  <span className="font-mono">
                    {obecDirectory.assignedCount} / {obecDirectory.totalSystems}
                  </span>{' '}
                  ระบบ ({obecDirectory.coveragePercent}%)
                </span>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/70 font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>
                  ยังไม่มีผู้รับผิดชอบ <span className="font-mono">{obecDirectory.unassignedCount}</span> ระบบ
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label="เลือกปีการศึกษาทำเนียบระบบ สพฐ."
                value={academicYearFilter}
                onChange={(e) => setAcademicYearFilter(e.target.value)}
                className="h-9 bg-slate-50 dark:bg-[#101822] border border-slate-200 dark:border-slate-700/80 rounded-xl px-3 text-xs font-mono text-slate-700 dark:text-slate-200 focus:outline-none focus:border-sky-500 cursor-pointer"
              >
                <option value="ALL">ปีการศึกษา: ทั้งหมด</option>
                {academicYearOptions.map((yr) => (
                  <option key={yr} value={yr}>
                    ปีการศึกษา {yr}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleExportObecDirectoryCsv}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 shrink-0" />
                <span>ส่งออก CSV (Excel)</span>
              </button>

              <button
                type="button"
                onClick={() => setPrintMode('obec_directory')}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-medium transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 shrink-0" />
                <span>พิมพ์ A4</span>
              </button>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="relative md:col-span-6">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 shrink-0" />
              <input
                type="search"
                value={obecSearchTerm}
                onChange={(e) => setObecSearchTerm(e.target.value)}
                placeholder="ค้นหารหัสระบบ, ชื่อระบบ สพฐ., ชื่อผู้รับผิดชอบ..."
                className="w-full h-10 bg-slate-50 dark:bg-[#101822] border border-slate-200 dark:border-slate-700/80 rounded-xl pl-10 pr-3.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="md:col-span-3">
              <select
                aria-label="กรองระบบ สพฐ. ตามฝ่ายงาน"
                value={obecDivisionFilter}
                onChange={(e) => setObecDivisionFilter(e.target.value)}
                className="w-full h-10 bg-slate-50 dark:bg-[#101822] border border-slate-200 dark:border-slate-700/80 rounded-xl px-3 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-sky-500 cursor-pointer"
              >
                <option value="ALL">ฝ่ายที่เกี่ยวข้อง: ทั้งหมด</option>
                {STANDARD_DIVISIONS.map((div) => (
                  <option key={div} value={div}>
                    {div}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3">
              <select
                aria-label="กรองระบบ สพฐ. ตามสถานะการมอบหมาย"
                value={obecStatusFilter}
                onChange={(e) =>
                  setObecStatusFilter(e.target.value as 'ALL' | 'ASSIGNED' | 'UNASSIGNED')
                }
                className="w-full h-10 bg-slate-50 dark:bg-[#101822] border border-slate-200 dark:border-slate-700/80 rounded-xl px-3 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-sky-500 cursor-pointer"
              >
                <option value="ALL">สถานะ: ทั้งหมด</option>
                <option value="ASSIGNED">มอบหมายแล้ว</option>
                <option value="UNASSIGNED">ยังไม่มีผู้รับผิดชอบ</option>
              </select>
            </div>
          </div>

          {/* 38-System Responsive Table */}
          <div className="bg-white dark:bg-[#121822] p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800/80 shadow-sm">
            <div
              tabIndex={0}
              role="region"
              aria-label="ตารางทำเนียบระบบรายงาน สพฐ. 38 ระบบ"
              className="overflow-x-auto w-full focus:outline-none focus:ring-2 focus:ring-sky-500/40 rounded-xl"
            >
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-100/80 dark:bg-[#101822] text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200/90 dark:border-slate-800">
                  <tr>
                    <th scope="col" className="w-12 px-3 py-3 text-center font-mono">
                      ลำดับ
                    </th>
                    <th scope="col" className="px-3 py-3 whitespace-nowrap">
                      รหัสระบบ
                    </th>
                    <th scope="col" className="px-3 py-3">
                      ชื่อระบบรายงาน สพฐ.
                    </th>
                    <th scope="col" className="px-3 py-3 whitespace-nowrap">
                      ฝ่ายที่เกี่ยวข้อง
                    </th>
                    <th scope="col" className="px-3 py-3">
                      ผู้รับผิดชอบหลัก
                    </th>
                    <th scope="col" className="px-3 py-3">
                      ผู้ร่วมรับผิดชอบ
                    </th>
                    <th scope="col" className="px-3 py-3 text-center whitespace-nowrap">
                      สถานะ / จัดการ
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredObecDirectoryItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-slate-500 dark:text-slate-400">
                        ไม่พบระบบรายงาน สพฐ. ที่ตรงกับเงื่อนไขการค้นหา
                      </td>
                    </tr>
                  ) : (
                    filteredObecDirectoryItems.map((item, idx) => (
                      <tr
                        key={item.code}
                        className="hover:bg-slate-50 dark:hover:bg-[#1a2636]/50 transition-colors"
                      >
                        <td className="px-3 py-3 text-center font-mono tabular-nums text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md font-mono font-semibold text-[11px] bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800/80">
                            {item.code}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="font-medium text-slate-900 dark:text-white">{item.name}</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            รอบการรายงาน: {item.cycle}
                          </div>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${getDivisionBadgeStyle(
                              item.division
                            )}`}
                          >
                            {item.division.replace('ฝ่ายบริหาร', '')}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          {item.primaryStaff.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {item.primaryStaff.map((s) => (
                                <span
                                  key={s.id}
                                  className="inline-block font-medium text-slate-800 dark:text-slate-100 whitespace-nowrap"
                                >
                                  {s.name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500">-</span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {item.coStaff.length > 0 ? (
                            <span className="text-slate-600 dark:text-slate-300">
                              {item.coStaff.map((s) => s.name).join(', ')}
                            </span>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500">-</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-center whitespace-nowrap">
                          {item.isAssigned ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/70">
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                              <span>มอบหมายแล้ว</span>
                            </span>
                          ) : canManage ? (
                            <button
                              type="button"
                              onClick={() => handleQuickAssignObecSystem(item.division, item.code)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-sky-600 hover:bg-sky-500 text-white transition-colors cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5 shrink-0" />
                              <span>มอบหมายทันที</span>
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/70">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              <span>ยังไม่มีผู้รับผิดชอบ</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 3: สรุปภาระงานรวมเพื่อประเมิน PA (Unified PA Summary)         */}
      {/* ================================================================= */}
      {activeTab === 'pa_summary' && (
        <div className="space-y-4">
          {/* Controls & Export Toolbar */}
          <div className="bg-white dark:bg-[#121822] p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-sky-500 shrink-0" />
                <select
                  aria-label="เลือกปีการศึกษาสรุป PA"
                  value={effectivePaYear}
                  onChange={(e) => setAcademicYearFilter(e.target.value)}
                  className="h-9 bg-slate-50 dark:bg-[#101822] border border-slate-200 dark:border-slate-700/80 rounded-xl px-3 text-xs font-mono text-slate-700 dark:text-slate-200 focus:outline-none focus:border-sky-500 cursor-pointer"
                >
                  {academicYearOptions.map((yr) => (
                    <option key={yr} value={yr}>
                      ปีการศึกษา {yr}
                    </option>
                  ))}
                </select>
              </div>

              <select
                aria-label="เลือกภาคเรียนสรุป PA"
                value={paSemester}
                onChange={(e) => setPaSemester(e.target.value as TimetableSemester)}
                className="h-9 bg-slate-50 dark:bg-[#101822] border border-slate-200 dark:border-slate-700/80 rounded-xl px-3 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-sky-500 cursor-pointer"
              >
                <option value="1">ภาคเรียนที่ 1</option>
                <option value="2">ภาคเรียนที่ 2</option>
              </select>

              {isLoadingPaData && (
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-500 shrink-0" />
                  <span>กำลังซิงก์ข้อมูลตารางสอนและสอนแทน...</span>
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleExportPaSummaryCsv}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 shrink-0" />
                <span>ส่งออก CSV (Excel)</span>
              </button>

              <button
                type="button"
                onClick={() => setPrintMode('pa_summary')}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-medium transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 shrink-0" />
                <span>พิมพ์สรุป PA (A4 แนวนอน)</span>
              </button>
            </div>
          </div>

          {/* 4 KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-[#121822] p-4 rounded-xl border border-slate-200/90 dark:border-slate-800/80">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>บุคลากรปฏิบัติงาน</span>
                <Users className="w-4 h-4 text-sky-500 shrink-0" />
              </div>
              <div className="mt-2 text-xl font-bold font-mono text-slate-900 dark:text-white">
                {paSummary.stats.totalActiveStaff} <span className="text-xs font-sans font-normal text-slate-500">คน</span>
              </div>
            </div>

            <div className="bg-white dark:bg-[#121822] p-4 rounded-xl border border-slate-200/90 dark:border-slate-800/80">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>ครูผ่านเกณฑ์ ว 9/2564</span>
                <Award className="w-4 h-4 text-emerald-500 shrink-0" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {paSummary.stats.teachersPassingW9}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  คน (ต่ำกว่าเกณฑ์ {paSummary.stats.teachersBelowW9} คน)
                </span>
              </div>
            </div>

            <div className="bg-white dark:bg-[#121822] p-4 rounded-xl border border-slate-200/90 dark:border-slate-800/80">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>ชั่วโมงสอนแทนสะสม</span>
                <ClipboardList className="w-4 h-4 text-amber-500 shrink-0" />
              </div>
              <div className="mt-2 text-xl font-bold font-mono text-slate-900 dark:text-white">
                {paSummary.stats.totalSubstituteHours}{' '}
                <span className="text-xs font-sans font-normal text-slate-500">ชั่วโมง</span>
              </div>
            </div>

            <div className="bg-white dark:bg-[#121822] p-4 rounded-xl border border-slate-200/90 dark:border-slate-800/80">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>ความครอบคลุมระบบ สพฐ.</span>
                <Database className="w-4 h-4 text-indigo-500 shrink-0" />
              </div>
              <div className="mt-2 text-xl font-bold font-mono text-indigo-600 dark:text-indigo-400">
                {paSummary.stats.totalObecAssigned}/{paSummary.stats.totalObecSystems}{' '}
                <span className="text-xs font-sans font-normal text-slate-500">ระบบ</span>
              </div>
            </div>
          </div>

          {/* Unified PA Table */}
          <div className="bg-white dark:bg-[#121822] p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800/80 shadow-sm">
            <div
              tabIndex={0}
              role="region"
              aria-label="ตารางสรุปภาระงานรวมเพื่อประเมิน PA"
              className="overflow-x-auto w-full focus:outline-none focus:ring-2 focus:ring-sky-500/40 rounded-xl"
            >
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-100/80 dark:bg-[#101822] text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200/90 dark:border-slate-800">
                  <tr>
                    <th scope="col" className="w-12 px-3 py-3 text-center font-mono">
                      ลำดับ
                    </th>
                    <th scope="col" className="px-3 py-3 whitespace-nowrap">
                      ชื่อ-สกุล
                    </th>
                    <th scope="col" className="px-3 py-3 text-center whitespace-nowrap">
                      สถานะ ว 9/2564
                    </th>
                    <th scope="col" className="px-3 py-3 text-center whitespace-nowrap">
                      สอน/สัปดาห์ (ชม.)
                    </th>
                    <th scope="col" className="px-3 py-3 text-center whitespace-nowrap">
                      สอนแทนสะสม (ชม.)
                    </th>
                    <th scope="col" className="px-3 py-3 whitespace-nowrap">
                      สังกัดฝ่ายงาน
                    </th>
                    <th scope="col" className="px-3 py-3">
                      งานบริหาร / โครงการ
                    </th>
                    <th scope="col" className="px-3 py-3">
                      ระบบ สพฐ.
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {paSummary.rows.map((row, idx) => {
                    const statusBadgeClass =
                      row.w9StatusLabel === 'ผ่านเกณฑ์'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/70'
                        : row.w9StatusLabel === 'ต่ำกว่าเกณฑ์'
                        ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/70'
                        : row.w9StatusLabel === 'ผู้บริหารสถานศึกษา'
                        ? 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/70'
                        : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';

                    return (
                      <tr
                        key={row.teacherId}
                        className="hover:bg-slate-50 dark:hover:bg-[#1a2636]/50 transition-colors"
                      >
                        <td className="px-3 py-3 text-center font-mono tabular-nums text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {row.name}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {row.position}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${statusBadgeClass}`}
                          >
                            {row.w9StatusLabel}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                          {row.teachingHoursExclHomeroom > 0 ? row.teachingHoursExclHomeroom : '-'}
                        </td>
                        <td className="px-3 py-3 text-center font-mono text-slate-700 dark:text-slate-200 whitespace-nowrap">
                          {row.substituteHours > 0 ? (
                            <span title={`สอนแทน ${row.substituteCount} ครั้ง`}>
                              {row.substituteHours}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {row.divisions.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {row.divisions.map((div) => (
                                <span
                                  key={div}
                                  className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${getDivisionBadgeStyle(
                                    div
                                  )}`}
                                >
                                  {div.replace('ฝ่ายบริหาร', '')}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500">-</span>
                          )}
                        </td>
                        <td className="px-3 py-3 max-w-xs">
                          {row.adminRoles.length + row.projects.length > 0 ? (
                            <div className="text-[11px] text-slate-700 dark:text-slate-200 leading-relaxed">
                              {[...row.adminRoles, ...row.projects].slice(0, 3).join(' · ')}
                              {row.adminRoles.length + row.projects.length > 3 && (
                                <span className="ml-1 font-mono text-slate-400">
                                  +{row.adminRoles.length + row.projects.length - 3}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500">-</span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {row.obecSystems.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {row.obecSystems.slice(0, 3).map((code) => (
                                <span
                                  key={code}
                                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800/80"
                                >
                                  {code}
                                </span>
                              ))}
                              {row.obecSystems.length > 3 && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                  +{row.obecSystems.length - 3}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Landscape A4 Print Overlay */}
      {printMode && (
        <PaReportPrintView
          mode={printMode}
          academicYear={printMode === 'obec_directory' ? academicYearFilter : effectivePaYear}
          semester={paSemester}
          directory={obecDirectory}
          paSummary={paSummary}
          onClose={() => setPrintMode(null)}
        />
      )}

      {/* Add / Edit Modal (Locked against backdrop click & Escape key) */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="workload-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 dark:bg-black/75 backdrop-blur-xs p-3 sm:p-4"
        >
          <div className="bg-white dark:bg-[#141d27] border border-slate-200/90 dark:border-slate-700 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl text-slate-800 dark:text-slate-200">
            {/* Sticky Header */}
            <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-slate-200/90 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-sky-500 shrink-0" />
                <h3 id="workload-modal-title" className="text-base font-bold text-slate-900 dark:text-white">
                  {editingWorkloadId
                    ? 'แก้ไขงานบริหารและหน้าที่พิเศษ'
                    : 'มอบหมายงานบริหารและหน้าที่พิเศษ'}
                </h3>
              </div>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleCloseModal}
                aria-label="ปิดหน้าต่าง"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Body */}
            <form
              id="admin-workload-form"
              aria-labelledby="workload-modal-title"
              onSubmit={handleSaveWorkload}
              className="flex-1 overflow-y-auto px-6 py-5 space-y-5"
            >
              {/* Row 1: Main Assignee (Clean Full Name) + Academic Year */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label
                    htmlFor="wl-teacher-id"
                    className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5"
                  >
                    บุคลากรผู้รับผิดชอบหลัก <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="wl-teacher-id"
                    name="teacherId"
                    required
                    value={formTeacherId}
                    onChange={(e) => {
                      const nextId = e.target.value;
                      setFormTeacherId(nextId);
                      setFormCoResponsibleIds((prev) => prev.filter((id) => id !== nextId));
                    }}
                    className="w-full h-10 bg-slate-50 dark:bg-[#101822] border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500 cursor-pointer"
                  >
                    <option value="">-- เลือกบุคลากร --</option>
                    {sortedTeachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {formatStaffName(t)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="wl-academic-year"
                    className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5"
                  >
                    ปีการศึกษา <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="wl-academic-year"
                    name="academicYear"
                    required
                    value={formAcademicYear}
                    onChange={(e) => setFormAcademicYear(e.target.value)}
                    className="w-full h-10 bg-slate-50 dark:bg-[#101822] border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500 cursor-pointer"
                  >
                    {academicYearOptions.map((yr) => (
                      <option key={yr} value={yr}>
                        ปีการศึกษา {yr}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Workload Type (2 clean choices) */}
              <div>
                <span className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                  ประเภทภาระงาน <span className="text-rose-500">*</span>
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleCategorySwitch(ADMIN_DIVISION_CATEGORY)}
                    className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-left text-xs font-medium transition-all cursor-pointer ${
                      formCategory === ADMIN_DIVISION_CATEGORY
                        ? 'bg-sky-50 dark:bg-sky-950/50 border-sky-500 text-sky-700 dark:text-sky-300'
                        : 'bg-slate-50 dark:bg-[#101822] border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <Building2 className="w-4 h-4 shrink-0" />
                    <span>งานบริหารและงานประจำฝ่าย</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCategorySwitch(ADHOC_PROJECT_CATEGORY)}
                    className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-left text-xs font-medium transition-all cursor-pointer ${
                      formCategory === ADHOC_PROJECT_CATEGORY
                        ? 'bg-violet-50 dark:bg-violet-950/50 border-violet-500 text-violet-700 dark:text-violet-300'
                        : 'bg-slate-50 dark:bg-[#101822] border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <Layers className="w-4 h-4 shrink-0" />
                    <span>งานโครงการและคณะกรรมการเฉพาะกิจ</span>
                  </button>
                </div>
              </div>

              {/* Row 3: 2-Step Cascading Selection */}
              {formCategory === ADMIN_DIVISION_CATEGORY ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Step 1: Division */}
                    <div>
                      <label
                        htmlFor="wl-division"
                        className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5"
                      >
                        สังกัดฝ่ายงาน <span className="text-rose-500">*</span>
                      </label>
                      <select
                        id="wl-division"
                        name="division"
                        required
                        value={formSubGroup}
                        onChange={(e) => handleDivisionChange(e.target.value)}
                        className="w-full h-10 bg-slate-50 dark:bg-[#101822] border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500 cursor-pointer"
                      >
                        {STANDARD_DIVISIONS.map((div) => (
                          <option key={div} value={div}>
                            {div}
                          </option>
                        ))}
                        {formSubGroup &&
                          !(STANDARD_DIVISIONS as readonly string[]).includes(formSubGroup) && (
                            <option value={formSubGroup}>{formSubGroup}</option>
                          )}
                      </select>
                    </div>

                    {/* Step 2: Role filtered strictly to chosen Division */}
                    <div>
                      <label
                        htmlFor="wl-role-select"
                        className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5"
                      >
                        ตำแหน่ง / หน้าที่รับผิดชอบ <span className="text-rose-500">*</span>
                      </label>
                      <select
                        id="wl-role-select"
                        name="roleSelect"
                        required
                        value={formRoleDropdownValue}
                        onChange={(e) => handleRoleDropdownChange(e.target.value)}
                        className="w-full h-10 bg-slate-50 dark:bg-[#101822] border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500 cursor-pointer"
                      >
                        <option value="">-- เลือกตำแหน่ง / หน้าที่ในฝ่าย --</option>
                        {divisionRolePresets.map((preset) => (
                          <option key={preset.id} value={preset.id}>
                            {preset.roleTitle}
                          </option>
                        ))}
                        <option value={CUSTOM_ROLE_OPTION}>+ ระบุตำแหน่ง / หน้าที่เอง...</option>
                      </select>
                    </div>
                  </div>

                  {/* Custom Role Title Input (revealed only when Custom option is active) */}
                  {formRoleDropdownValue === CUSTOM_ROLE_OPTION && (
                    <div>
                      <label
                        htmlFor="wl-custom-title"
                        className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5"
                      >
                        ระบุชื่อตำแหน่ง / หน้าที่รับผิดชอบ <span className="text-rose-500">*</span>
                      </label>
                      <input
                        id="wl-custom-title"
                        name="customTitle"
                        type="text"
                        required
                        value={formTitle}
                        onChange={(e) => setFormTitle(e.target.value)}
                        placeholder="กรอกชื่อตำแหน่งหรือหน้าที่รับผิดชอบ..."
                        className="w-full h-10 bg-slate-50 dark:bg-[#101822] border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label
                      htmlFor="wl-project-select"
                      className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5"
                    >
                      ชื่อโครงการ / คณะกรรมการ <span className="text-rose-500">*</span>
                    </label>
                    <select
                      id="wl-project-select"
                      name="projectSelect"
                      required
                      value={formRoleDropdownValue}
                      onChange={(e) => handleRoleDropdownChange(e.target.value)}
                      className="w-full h-10 bg-slate-50 dark:bg-[#101822] border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500 cursor-pointer"
                    >
                      <option value="">-- เลือกโครงการ / คณะกรรมการ --</option>
                      {ADHOC_PROJECT_PRESETS.map((preset) => (
                        <option key={preset.id} value={preset.id}>
                          {preset.roleTitle}
                        </option>
                      ))}
                      <option value={CUSTOM_ROLE_OPTION}>+ ระบุชื่อโครงการ / คณะกรรมการเอง...</option>
                    </select>
                  </div>

                  {formRoleDropdownValue === CUSTOM_ROLE_OPTION && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="wl-custom-project-title"
                          className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5"
                        >
                          ระบุชื่อโครงการ / คณะกรรมการ <span className="text-rose-500">*</span>
                        </label>
                        <input
                          id="wl-custom-project-title"
                          name="customProjectTitle"
                          type="text"
                          required
                          value={formTitle}
                          onChange={(e) => setFormTitle(e.target.value)}
                          placeholder="กรอกชื่อโครงการหรือคณะกรรมการ..."
                          className="w-full h-10 bg-slate-50 dark:bg-[#101822] border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-sky-500"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="wl-custom-project-subgroup"
                          className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5"
                        >
                          กลุ่มงาน / คณะทำงาน
                        </label>
                        <input
                          id="wl-custom-project-subgroup"
                          name="customProjectSubGroup"
                          type="text"
                          value={formSubGroup}
                          onChange={(e) => setFormSubGroup(e.target.value)}
                          placeholder="เช่น กิจกรรมวันสำคัญ, กีฬาสี"
                          className="w-full h-10 bg-slate-50 dark:bg-[#101822] border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-sky-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Row 4: Scope Description */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <label
                    htmlFor="wl-scope"
                    className="text-xs font-medium text-slate-600 dark:text-slate-300"
                  >
                    ขอบข่ายภาระงาน
                  </label>
                  {isScopeAutoFilled && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800/70">
                      <Sparkles className="w-3 h-3 shrink-0" />
                      <span>เติมข้อมูลอัตโนมัติ</span>
                    </span>
                  )}
                </div>
                <textarea
                  id="wl-scope"
                  name="scopeDescription"
                  rows={3}
                  value={formScopeDescription}
                  onChange={(e) => {
                    setFormScopeDescription(e.target.value);
                    if (isScopeAutoFilled) setIsScopeAutoFilled(false);
                  }}
                  placeholder="ระบุขอบข่ายหน้าที่ความรับผิดชอบหลัก งานที่ต้องดำเนินการ และผลลัพธ์ที่คาดหวัง..."
                  className="w-full bg-slate-50 dark:bg-[#101822] border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-sky-500 leading-relaxed"
                />
              </div>

              {/* Row 5: OBEC Reporting Systems Multi-Select Pills + Custom Tag */}
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                    <span>ระบบรายงาน สพฐ. ที่รับผิดชอบ</span>
                    <span className="font-mono text-[11px] text-slate-400">
                      ({formObecSystems.length})
                    </span>
                  </span>
                  {formCategory === ADMIN_DIVISION_CATEGORY && (
                    <button
                      type="button"
                      onClick={() => setShowAllObecSystems((prev) => !prev)}
                      className="text-[11px] font-medium text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                    >
                      {showAllObecSystems
                        ? 'แสดงเฉพาะระบบของฝ่ายที่เลือก'
                        : `แสดงระบบทั้งหมด (${OBEC_SYSTEM_CATALOG.length})`}
                    </button>
                  )}
                </div>

                {formObecSystems.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 p-2.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/60">
                    {formObecSystems.map((code) => (
                      <span
                        key={code}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-indigo-600 text-white"
                      >
                        <span>{code}</span>
                        <button
                          type="button"
                          onClick={() => toggleObecSystem(code)}
                          aria-label={`ลบระบบ ${code}`}
                          className="hover:text-indigo-200 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2.5 rounded-xl bg-slate-50 dark:bg-[#101822] border border-slate-200 dark:border-slate-700/80">
                  {visibleObecSystems.map((sys) => {
                    const selected = formObecSystems.includes(sys.code);
                    return (
                      <button
                        key={sys.code}
                        type="button"
                        onClick={() => toggleObecSystem(sys.code)}
                        title={`${sys.name} (${sys.cycle})`}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-mono transition-colors cursor-pointer border ${
                          selected
                            ? 'bg-sky-600 text-white border-sky-600'
                            : 'bg-white dark:bg-[#16202c] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-sky-400'
                        }`}
                      >
                        {selected && <Check className="w-3 h-3 shrink-0" />}
                        <span>{sys.code}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={formCustomSystem}
                    onChange={(e) => setFormCustomSystem(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                        e.preventDefault();
                        handleAddCustomSystem();
                      }
                    }}
                    placeholder="เพิ่มชื่อระบบรายงานอื่นเพิ่มเติม..."
                    className="flex-1 h-9 bg-slate-50 dark:bg-[#101822] border border-slate-200 dark:border-slate-700 rounded-lg px-3 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-sky-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomSystem}
                    className="inline-flex items-center gap-1 h-9 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 shrink-0" />
                    <span>เพิ่ม</span>
                  </button>
                </div>
              </div>

              {/* Row 6: Role in Task + Order/Ref + Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label
                    htmlFor="wl-role-in-task"
                    className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5"
                  >
                    บทบาทในงาน
                  </label>
                  <select
                    id="wl-role-in-task"
                    name="roleInTask"
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value)}
                    className="w-full h-10 bg-slate-50 dark:bg-[#101822] border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500 cursor-pointer"
                  >
                    {ADMIN_TASK_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                    {formRole && !(ADMIN_TASK_ROLES as readonly string[]).includes(formRole) && (
                      <option value={formRole}>{formRole}</option>
                    )}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="wl-order-ref"
                    className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5"
                  >
                    คำสั่งที่ / หนังสืออ้างอิง
                  </label>
                  <input
                    id="wl-order-ref"
                    name="orderOrRef"
                    type="text"
                    value={formOrderRef}
                    onChange={(e) => setFormOrderRef(e.target.value)}
                    placeholder="เช่น คำสั่ง รร. ที่ 15/2569"
                    className="w-full h-10 bg-slate-50 dark:bg-[#101822] border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="wl-status"
                    className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5"
                  >
                    สถานะการดำเนินงาน
                  </label>
                  <select
                    id="wl-status"
                    name="status"
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as WorkloadItem['status'])}
                    className="w-full h-10 bg-slate-50 dark:bg-[#101822] border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500 cursor-pointer"
                  >
                    {PRIMARY_STATUS_OPTIONS.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                    {!PRIMARY_STATUS_OPTIONS.includes(formStatus) && (
                      <option value={formStatus}>{formStatus}</option>
                    )}
                  </select>
                </div>
              </div>

              {/* Row 7: Co-Responsibles Multi-Select Staff Picker (Clean Full Names Only) */}
              <div className="space-y-2.5">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                  <span>ผู้ร่วมรับผิดชอบ</span>
                  {formCoResponsibleIds.length > 0 && (
                    <span className="font-mono text-[11px] text-sky-600 dark:text-sky-400">
                      ({formCoResponsibleIds.length})
                    </span>
                  )}
                </span>

                {formCoResponsibleIds.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200/80 dark:border-sky-800/60">
                    {formCoResponsibleIds.map((id) => {
                      const staff = teacherMap.get(id);
                      const label = staff ? formatStaffName(staff) : id;
                      return (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-sky-600 text-white"
                        >
                          <span>{label}</span>
                          <button
                            type="button"
                            onClick={() => toggleCoResponsible(id)}
                            aria-label={`นำ ${label} ออก`}
                            className="hover:text-sky-200 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}

                {formCoEmpLegacy && (
                  <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-[11px] text-amber-800 dark:text-amber-200">
                    <span>ผู้ร่วมเดิม: {formCoEmpLegacy}</span>
                    <button
                      type="button"
                      onClick={() => setFormCoEmpLegacy('')}
                      className="text-amber-700 dark:text-amber-300 hover:underline shrink-0 cursor-pointer"
                    >
                      ล้างข้อความเดิม
                    </button>
                  </div>
                )}

                <div className="rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-[#101822] overflow-hidden">
                  <div className="relative border-b border-slate-200 dark:border-slate-700/80">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 shrink-0" />
                    <input
                      type="search"
                      value={coSearchTerm}
                      onChange={(e) => setCoSearchTerm(e.target.value)}
                      placeholder="ค้นหาชื่อบุคลากร..."
                      className="w-full h-9 bg-transparent pl-8 pr-3 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
                    />
                  </div>
                  <div className="max-h-36 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/70">
                    {coResponsibleCandidates.length === 0 ? (
                      <div className="px-3 py-3 text-center text-xs text-slate-400">
                        ไม่พบรายชื่อบุคลากร
                      </div>
                    ) : (
                      coResponsibleCandidates.map((staff) => {
                        const checked = formCoResponsibleIds.includes(staff.id);
                        return (
                          <label
                            key={staff.id}
                            className="flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-slate-100/80 dark:hover:bg-slate-800/60 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleCoResponsible(staff.id)}
                              className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                            />
                            <span className="font-medium text-slate-800 dark:text-slate-100 truncate">
                              {formatStaffName(staff)}
                            </span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </form>

            {/* Sticky Footer */}
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-200/90 dark:border-slate-800 shrink-0">
              <button
                type="button"
                disabled={isSaving}
                onClick={handleCloseModal}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                form="admin-workload-form"
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />}
                <span>{editingWorkloadId ? 'บันทึกการเปลี่ยนแปลง' : 'บันทึกการมอบหมายงาน'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Academic Year Rollover Modal (Locked against backdrop click & Escape key) */}
      {isRolloverModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="rollover-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 dark:bg-black/75 backdrop-blur-xs p-3 sm:p-4"
        >
          <div className="bg-white dark:bg-[#141d27] border border-slate-200/90 dark:border-slate-700 rounded-2xl max-w-lg w-full shadow-2xl text-slate-800 dark:text-slate-200 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-slate-200/90 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Copy className="w-5 h-5 text-sky-500 shrink-0" />
                <h3 id="rollover-modal-title" className="text-base font-bold text-slate-900 dark:text-white">
                  คัดลอกโครงสร้างงานข้ามปีการศึกษา
                </h3>
              </div>
              <button
                type="button"
                disabled={isRollingOver}
                onClick={handleCloseRolloverModal}
                aria-label="ปิดหน้าต่าง"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <form
              id="workload-rollover-form"
              aria-labelledby="rollover-modal-title"
              onSubmit={handleExecuteRollover}
              className="px-6 py-5 space-y-5"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="rollover-source-year"
                    className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5"
                  >
                    คัดลอกจากปีการศึกษา <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="rollover-source-year"
                    name="sourceYear"
                    required
                    value={rolloverSourceYear}
                    onChange={(e) => {
                      const nextSource = e.target.value;
                      setRolloverSourceYear(nextSource);
                      if (nextSource === rolloverTargetYear) {
                        const num = Number(nextSource);
                        if (!Number.isNaN(num)) {
                          setRolloverTargetYear(String(num + 1));
                        }
                      }
                    }}
                    className="w-full h-10 bg-slate-50 dark:bg-[#101822] border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500 cursor-pointer"
                  >
                    {(yearsWithData.length > 0 ? yearsWithData : academicYearOptions).map((yr) => (
                      <option key={yr} value={yr}>
                        ปีการศึกษา {yr}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="rollover-target-year"
                    className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5"
                  >
                    ไปยังปีการศึกษา <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="rollover-target-year"
                    name="targetYear"
                    required
                    value={rolloverTargetYear}
                    onChange={(e) => setRolloverTargetYear(e.target.value)}
                    className="w-full h-10 bg-slate-50 dark:bg-[#101822] border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500 cursor-pointer"
                  >
                    {academicYearOptions.map((yr) => (
                      <option key={yr} value={yr} disabled={yr === rolloverSourceYear}>
                        ปีการศึกษา {yr}
                        {yr === rolloverSourceYear ? ' (ปีต้นทาง)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Category Checkboxes */}
              <fieldset className="space-y-2.5">
                <legend className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  เลือกประเภทภาระงานที่ต้องการคัดลอก
                </legend>

                <label className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-[#101822] cursor-pointer">
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={rolloverIncludeAdmin}
                      onChange={(e) => setRolloverIncludeAdmin(e.target.checked)}
                      className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                    />
                    <span className="text-xs font-medium text-slate-800 dark:text-slate-100">
                      คัดลอกงานบริหารและงานประจำฝ่าย
                    </span>
                  </div>
                  <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/70">
                    {rolloverSourceCounts.adminCount} รายการ
                  </span>
                </label>

                <label className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-[#101822] cursor-pointer">
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={rolloverIncludeAdhoc}
                      onChange={(e) => setRolloverIncludeAdhoc(e.target.checked)}
                      className="rounded border-slate-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
                    />
                    <span className="text-xs font-medium text-slate-800 dark:text-slate-100">
                      คัดลอกงานโครงการและคณะกรรมการเฉพาะกิจ
                    </span>
                  </div>
                  <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800/70">
                    {rolloverSourceCounts.adhocCount} รายการ
                  </span>
                </label>
              </fieldset>

              {/* Safety Summary Note */}
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                <Info className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                <span>
                  ระบบจะเก็บข้อมูลปีการศึกษา {rolloverSourceYear} ไว้ครบถ้วนสำหรับตรวจย้อนหลัง PA/SAR, ล้างเลขที่คำสั่งเดิมออกอัตโนมัติ, รีเซ็ตสถานะเป็นกำลังดำเนินการ, คัดกรองเฉพาะบุคลากรที่ยังปฏิบัติงานอยู่ และข้ามรายการที่มีอยู่แล้วในปีการศึกษา {rolloverTargetYear}
                </span>
              </div>

              {rolloverSourceYear === rolloverTargetYear && (
                <p className="text-xs text-rose-600 dark:text-rose-400">
                  กรุณาเลือกปีการศึกษาปลายทางที่แตกต่างจากปีต้นทาง
                </p>
              )}
              {!rolloverIncludeAdmin && !rolloverIncludeAdhoc && (
                <p className="text-xs text-rose-600 dark:text-rose-400">
                  กรุณาเลือกประเภทภาระงานอย่างน้อย 1 ประเภท
                </p>
              )}
            </form>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-200/90 dark:border-slate-800">
              <button
                type="button"
                disabled={isRollingOver}
                onClick={handleCloseRolloverModal}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                form="workload-rollover-form"
                disabled={
                  isRollingOver ||
                  rolloverSourceYear === rolloverTargetYear ||
                  (!rolloverIncludeAdmin && !rolloverIncludeAdhoc)
                }
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
              >
                {isRollingOver && <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />}
                <span>คัดลอกโครงสร้างงาน</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shared Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deletingWorkload)}
        title="ยืนยันการลบรายการหน้าที่ความรับผิดชอบ"
        description={
          deletingWorkload
            ? `ต้องการลบรายการ "${deletingWorkload.title}" ออกจากฐานข้อมูลหรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้`
            : ''
        }
        confirmLabel="ยืนยันการลบ"
        cancelLabel="ยกเลิก"
        variant="danger"
        isLoading={isSaving}
        onConfirm={confirmDeleteWorkload}
        onCancel={() => setDeletingWorkload(null)}
      />
    </div>
  );
};
