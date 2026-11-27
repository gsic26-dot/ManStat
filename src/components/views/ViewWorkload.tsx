'use client';

/**
 * ============================================================================
 * ManStat: View School Administration Roles & Special Duties (งานบริหาร 4 ฝ่ายและหน้าที่พิเศษ)
 * ============================================================================
 * Phase 8 Architecture:
 * - Separates School Administration (4 Standard OBEC Divisions) & Ad-hoc Projects/Committees
 *   from Teaching Schedules (upcoming Phase 9).
 * - Preserves `workload` route/view key and `WORKLOAD_ADMIN_CATEGORY` so `getStaffDivisions()`
 *   and `ViewOrgChart` remain 100% synchronized.
 * - Non-destructive: Legacy Category 1 (teaching) records are preserved and shown read-only.
 * - Zero emojis: pure Lucide SVG icons, dual Light/Dark mode, Arabic numerals (0-9).
 * - Modal close lock: Form modal closes ONLY via X or ยกเลิก (no backdrop click / Escape close).
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
} from 'lucide-react';
import {
  type TeacherRecord,
  type WorkloadItem,
  type WorkloadCategory,
} from '@/lib/data/schoolData';
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

const ADMIN_DIVISION_CATEGORY: WorkloadCategory = WORKLOAD_ADMIN_CATEGORY;
const ADHOC_PROJECT_CATEGORY: WorkloadCategory = 'งานโครงการ กิจกรรม และงานที่ได้รับมอบหมายพิเศษ';
const LEGACY_TEACHING_CATEGORY: WorkloadCategory = 'งานสอนและการจัดการเรียนรู้';
const LEGACY_CARE_CATEGORY: WorkloadCategory = 'งานดูแลช่วยเหลือนักเรียน งานครูที่ปรึกษา และเวรปฏิบัติหน้าที่';

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

  // Filters & Accordion
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [academicYearFilter, setAcademicYearFilter] = useState<string>('ALL');
  const [divisionFilter, setDivisionFilter] = useState<string>('ALL');
  const [expandedTeacherId, setExpandedTeacherId] = useState<string | null>(null);

  // Modal & CRUD State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingWorkloadId, setEditingWorkloadId] = useState<string | null>(null);
  const [deletingWorkload, setDeletingWorkload] = useState<WorkloadItem | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Form State
  const [formTeacherId, setFormTeacherId] = useState<string>('');
  const [formAcademicYear, setFormAcademicYear] = useState<string>(defaultAcademicYear);
  const [formCategory, setFormCategory] = useState<WorkloadCategory>(ADMIN_DIVISION_CATEGORY);
  const [formSelectedPresetId, setFormSelectedPresetId] = useState<string>('');
  const [formSubGroup, setFormSubGroup] = useState<string>(STANDARD_DIVISIONS[0]);
  const [formTitle, setFormTitle] = useState<string>('');
  const [formScopeDescription, setFormScopeDescription] = useState<string>('');
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

  // Academic years available for filter & form
  const academicYearOptions = useMemo(() => {
    const set = new Set<string>([defaultAcademicYear]);
    const currentNum = Number(defaultAcademicYear);
    if (!Number.isNaN(currentNum)) {
      set.add(String(currentNum + 1));
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

  // Workloads filtered by academic year (when a specific year is selected, keep records matching that year)
  const yearFilteredWorkloads = useMemo(() => {
    if (academicYearFilter === 'ALL') return workloads;
    return workloads.filter((w) => (w.academicYear || '').trim() === academicYearFilter);
  }, [workloads, academicYearFilter]);

  const showNotice = (type: 'success' | 'error', text: string) => {
    setStatusNotice({ type, text });
    setTimeout(() => setStatusNotice(null), 4000);
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
    setFormSelectedPresetId('');
    setFormSubGroup(targetCat === ADMIN_DIVISION_CATEGORY ? STANDARD_DIVISIONS[0] : '');
    setFormTitle('');
    setFormScopeDescription('');
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

  // Open Edit Modal
  const handleOpenEditModal = (item: WorkloadItem) => {
    if (!canManage) return;
    const normalizedCat: WorkloadCategory =
      item.category === ADMIN_DIVISION_CATEGORY ? ADMIN_DIVISION_CATEGORY : ADHOC_PROJECT_CATEGORY;

    setEditingWorkloadId(item.id);
    setFormTeacherId(item.teacherId);
    setFormAcademicYear((item.academicYear || '').trim() || defaultAcademicYear);
    setFormCategory(normalizedCat);
    setFormSelectedPresetId('');
    setFormSubGroup(
      normalizedCat === ADMIN_DIVISION_CATEGORY
        ? normalizeDivisionName(item.subGroupOrLevel) || item.subGroupOrLevel || STANDARD_DIVISIONS[0]
        : item.subGroupOrLevel || ''
    );
    setFormTitle(item.title || '');
    setFormScopeDescription(item.scopeDescription || '');
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
    setFormCategory(newCat);
    setFormSelectedPresetId('');
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
    }
  };

  const handlePresetChange = (presetId: string) => {
    setFormSelectedPresetId(presetId);
    if (!presetId || presetId === '__CUSTOM__') {
      if (presetId === '__CUSTOM__') {
        setFormTitle('');
        setFormScopeDescription('');
        setFormObecSystems([]);
      }
      return;
    }

    if (formCategory === ADMIN_DIVISION_CATEGORY) {
      const found = OBEC_ADMIN_ROLE_PRESETS.find((p) => p.id === presetId);
      if (found) {
        setFormSubGroup(found.division);
        setFormTitle(found.roleTitle);
        setFormRole(found.defaultRoleInTask);
        setFormScopeDescription(found.defaultScope);
        setFormObecSystems([...found.obecSystems]);
      }
    } else {
      const found = ADHOC_PROJECT_PRESETS.find((p) => p.id === presetId);
      if (found) {
        setFormSubGroup(found.defaultSubGroup);
        setFormTitle(found.roleTitle);
        setFormRole(found.defaultRoleInTask);
        setFormScopeDescription(found.defaultScope);
        setFormObecSystems([...found.obecSystems]);
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

      // Divisions derived from standardized admin workloads (fallback to teacher.division when yearFilter === ALL)
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

      // Unique OBEC reporting systems handled by this staff member
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

  // Division KPI counts across current year filter
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

  // OBEC Systems displayed in modal picker
  const visibleObecSystems = useMemo(() => {
    if (showAllObecSystems || formCategory !== ADMIN_DIVISION_CATEGORY) {
      return OBEC_SYSTEM_CATALOG;
    }
    const normalizedDiv = normalizeDivisionName(formSubGroup);
    if (!normalizedDiv) return OBEC_SYSTEM_CATALOG;
    const divMatched = OBEC_SYSTEM_CATALOG.filter((s) => s.division === normalizedDiv);
    return divMatched.length > 0 ? divMatched : OBEC_SYSTEM_CATALOG;
  }, [showAllObecSystems, formCategory, formSubGroup]);

  // Co-responsible candidates (exclude main assignee)
  const coResponsibleCandidates = useMemo(() => {
    const q = coSearchTerm.trim().toLowerCase();
    return sortedTeachers.filter((t) => {
      if (t.id === formTeacherId) return false;
      if (!q) return true;
      const fullName = formatStaffName(t).toLowerCase();
      return (
        fullName.includes(q) ||
        (t.position || '').toLowerCase().includes(q) ||
        (t.department || '').toLowerCase().includes(q)
      );
    });
  }, [sortedTeachers, formTeacherId, coSearchTerm]);

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
                  รายการเดิม (หมวดดูแลนักเรียน/เวร)
                </span>
              )}
            </div>

            <h5 className="text-sm font-semibold text-slate-900 dark:text-white leading-snug">
              {item.title}
            </h5>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
              <span>บทบาท: <strong className="font-medium text-slate-700 dark:text-slate-200">{item.roleInTask || '-'}</strong></span>
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

        {/* Job Description / Scope */}
        {item.scopeDescription && (
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50/90 dark:bg-[#0e151f] px-3 py-2 rounded-lg border border-slate-100 dark:border-slate-800/80">
            {item.scopeDescription}
          </p>
        )}

        {/* OBEC Reporting Systems */}
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

        {/* Co-Responsibles */}
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
      {/* Header & Primary Action */}
      <div className="bg-white dark:bg-[#121822] p-5 sm:p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors duration-200">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-sky-500 dark:text-sky-400 shrink-0" />
            <span>งานบริหาร 4 ฝ่ายและหน้าที่พิเศษ</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            บริหารจัดการโครงสร้างงาน 4 ฝ่ายมาตรฐาน สพฐ. ขอบข่ายภาระงาน ระบบรายงานอิเล็กทรอนิกส์ (DMC, SET, e-GP, e-SAR ฯลฯ) และคำสั่งคณะกรรมการเฉพาะกิจ
          </p>
        </div>

        {canManage && (
          <div className="flex flex-wrap items-center gap-3">
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

      {/* Filter Bar: Search + Academic Year + Division */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="relative md:col-span-6">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 shrink-0" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ค้นหาชื่อบุคลากร, ตำแหน่งหน้าที่, ระบบรายงาน สพฐ. (DMC, e-GP...), ฝ่ายงาน..."
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
            <option value="ALL">สังกัดฝ่ายงาน: ทั้งหมด (4 ฝ่าย)</option>
            {STANDARD_DIVISIONS.map((div) => (
              <option key={div} value={div}>
                {div}
              </option>
            ))}
          </select>
        </div>
      </div>

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
                  สังกัดฝ่ายงาน (4 ฝ่าย)
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
                              {/* Expanded Header */}
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
                                    สังกัดฝ่าย: {row.derivedDivisions.length > 0 ? row.derivedDivisions.join(', ') : 'ยังไม่ระบุ'}
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
                                  <span>งานบริหารและงานประจำฝ่าย (4 ฝ่ายมาตรฐาน สพฐ.)</span>
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
                                      แสดงแบบอ่านอย่างเดียว (ไม่ลบข้อมูลเดิม)
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
              onSubmit={handleSaveWorkload}
              className="flex-1 overflow-y-auto px-6 py-5 space-y-5"
            >
              {/* Row 1: Main Assignee + Academic Year */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                    บุคลากรผู้รับผิดชอบหลัก <span className="text-rose-500">*</span>
                  </label>
                  <select
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
                        {formatStaffName(t)} ({t.position || '-'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                    ปีการศึกษา <span className="text-rose-500">*</span>
                  </label>
                  <select
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

              {/* Row 2: Workload Type (2 choices) */}
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                  ประเภทภาระงาน <span className="text-rose-500">*</span>
                </label>
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
                    <span>งานบริหารและงานประจำฝ่าย (4 ฝ่ายมาตรฐาน สพฐ.)</span>
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

              {/* Row 3: Standardized OBEC Role Preset Picker */}
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                  เลือกจากแม่แบบตำแหน่งงานมาตรฐาน สพฐ. (เติมข้อมูลอัตโนมัติ)
                </label>
                <select
                  value={formSelectedPresetId}
                  onChange={(e) => handlePresetChange(e.target.value)}
                  className="w-full h-10 bg-slate-50 dark:bg-[#101822] border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500 cursor-pointer"
                >
                  <option value="">-- เลือกแม่แบบเพื่อกรอกฝ่ายงาน ขอบข่าย และระบบรายงานอัตโนมัติ --</option>
                  {formCategory === ADMIN_DIVISION_CATEGORY ? (
                    STANDARD_DIVISIONS.map((div) => (
                      <optgroup key={div} label={div}>
                        {OBEC_ADMIN_ROLE_PRESETS.filter((p) => p.division === div).map((preset) => (
                          <option key={preset.id} value={preset.id}>
                            {preset.roleTitle}
                            {preset.obecSystems.length > 0
                              ? ` [${preset.obecSystems.slice(0, 3).join(', ')}]`
                              : ''}
                          </option>
                        ))}
                      </optgroup>
                    ))
                  ) : (
                    ADHOC_PROJECT_PRESETS.map((preset) => (
                      <option key={preset.id} value={preset.id}>
                        {preset.roleTitle}
                      </option>
                    ))
                  )}
                  <option value="__CUSTOM__">กำหนดตำแหน่ง / หน้าที่งานเอง (Custom)</option>
                </select>
              </div>

              {/* Row 4: Division + Role Title */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                    {formCategory === ADMIN_DIVISION_CATEGORY
                      ? 'สังกัดฝ่ายงาน (4 ฝ่ายมาตรฐาน สพฐ.)'
                      : 'กลุ่มงาน / คณะทำงาน / โครงการ'}{' '}
                    <span className="text-rose-500">*</span>
                  </label>
                  {formCategory === ADMIN_DIVISION_CATEGORY ? (
                    <select
                      required
                      value={formSubGroup}
                      onChange={(e) => setFormSubGroup(e.target.value)}
                      className="w-full h-10 bg-slate-50 dark:bg-[#101822] border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500 cursor-pointer"
                    >
                      {STANDARD_DIVISIONS.map((div) => (
                        <option key={div} value={div}>
                          {div}
                        </option>
                      ))}
                      {formSubGroup &&
                        !(STANDARD_DIVISIONS as readonly string[]).includes(formSubGroup) && (
                          <option value={formSubGroup}>{formSubGroup} (ข้อมูลเดิม)</option>
                        )}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={formSubGroup}
                      onChange={(e) => setFormSubGroup(e.target.value)}
                      placeholder="เช่น งานพัสดุ, กิจกรรมวันสำคัญ, กีฬาสี"
                      className="w-full h-10 bg-slate-50 dark:bg-[#101822] border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-sky-500"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                    ตำแหน่ง / หน้าที่รับผิดชอบ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="เช่น หัวหน้าเจ้าหน้าที่พัสดุ, งานสารสนเทศ DMC"
                    className="w-full h-10 bg-slate-50 dark:bg-[#101822] border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Row 5: Scope Description (Job Description) */}
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                  ขอบข่ายภาระงาน (Job Description)
                </label>
                <textarea
                  rows={3}
                  value={formScopeDescription}
                  onChange={(e) => setFormScopeDescription(e.target.value)}
                  placeholder="ระบุขอบข่ายหน้าที่ความรับผิดชอบหลัก งานที่ต้องดำเนินการ และผลลัพธ์ที่คาดหวัง..."
                  className="w-full bg-slate-50 dark:bg-[#101822] border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-sky-500 leading-relaxed"
                />
              </div>

              {/* Row 6: OBEC Reporting Systems Multi-Select Pills + Custom Tag */}
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                    <span>ระบบรายงาน สพฐ. ที่รับผิดชอบ ({formObecSystems.length} ระบบ)</span>
                  </label>
                  {formCategory === ADMIN_DIVISION_CATEGORY && (
                    <button
                      type="button"
                      onClick={() => setShowAllObecSystems((prev) => !prev)}
                      className="text-[11px] font-medium text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                    >
                      {showAllObecSystems
                        ? 'แสดงเฉพาะระบบของฝ่ายที่เลือก'
                        : `แสดงระบบทั้งหมด (${OBEC_SYSTEM_CATALOG.length} ระบบ)`}
                    </button>
                  )}
                </div>

                {/* Selected Tags */}
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

                {/* Quick Toggle Pills */}
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

                {/* Add Custom OBEC System */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={formCustomSystem}
                    onChange={(e) => setFormCustomSystem(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomSystem();
                      }
                    }}
                    placeholder="เพิ่มชื่อระบบรายงานอื่นเพิ่มเติม (เช่น ระบบเฉพาะของเขตพื้นที่ฯ)"
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

              {/* Row 7: Role in Task + Order/Ref + Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                    บทบาทในงาน
                  </label>
                  <select
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
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                    คำสั่งที่ / หนังสืออ้างอิง
                  </label>
                  <input
                    type="text"
                    value={formOrderRef}
                    onChange={(e) => setFormOrderRef(e.target.value)}
                    placeholder="เช่น คำสั่ง รร. ที่ 15/2569"
                    className="w-full h-10 bg-slate-50 dark:bg-[#101822] border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                    สถานะการดำเนินงาน
                  </label>
                  <select
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

              {/* Row 8: Co-Responsibles Multi-Select Staff Picker */}
              <div className="space-y-2.5">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                  <span>ผู้ร่วมรับผิดชอบ (เลือกได้หลายคน · {formCoResponsibleIds.length} คน)</span>
                </label>

                {/* Selected Co-Responsibles Chips */}
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
                    <span>ผู้ร่วมเดิม (ข้อความอิสระ): {formCoEmpLegacy}</span>
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
                      type="text"
                      value={coSearchTerm}
                      onChange={(e) => setCoSearchTerm(e.target.value)}
                      placeholder="ค้นหาชื่อบุคลากรเพื่อเพิ่มเป็นผู้ร่วมรับผิดชอบ..."
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
                            className="flex items-center justify-between gap-2 px-3 py-2 text-xs hover:bg-slate-100/80 dark:hover:bg-slate-800/60 cursor-pointer"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleCoResponsible(staff.id)}
                                className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                              />
                              <span className="font-medium text-slate-800 dark:text-slate-100 truncate">
                                {formatStaffName(staff)}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[45%]">
                              {staff.position || '-'}
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
                disabled={isSaving || !formTeacherId || !formTitle.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />}
                <span>{editingWorkloadId ? 'บันทึกการเปลี่ยนแปลง' : 'บันทึกการมอบหมายงาน'}</span>
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
