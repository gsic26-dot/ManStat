'use client';

/**
 * ============================================================================
 * ManStat: School Subject Catalog Modal (คลังรายวิชา อ.1–ม.3) — Phase 11.1
 * ============================================================================
 * - Persistent database-backed subject catalog across Kindergarten (อ.1–อ.3),
 *   Primary (ป.1–ป.6), and Lower Secondary (ม.1–ม.3).
 * - Close-locked modals (X or ปิด/ยกเลิก only; never dismiss on backdrop/Escape).
 * - Zero emojis: pure Lucide SVG icons, Arabic numerals (0-9), Light/Dark mode.
 * - Semantic <search>, <form>, <fieldset>/<legend>, responsive table region.
 * ============================================================================
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BookOpen,
  X,
  Plus,
  Search,
  Download,
  Pencil,
  Trash2,
  Power,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sun,
  Link2,
} from 'lucide-react';
import type {
  SchoolSubject,
  SchoolSubjectType,
  SubjectLevelGroup,
  SubjectSemesterScope,
} from '@/lib/data/timetableTypes';
import {
  ALL_SCHOOL_GRADE_LEVELS,
  DEFAULT_CURRICULUM_VERSION,
  GRADE_LEVELS_BY_GROUP,
  SCHOOL_SUBJECT_GROUPS,
  SCHOOL_SUBJECT_TYPES,
  SEMESTER_SCOPE_LABELS,
  SUBJECT_LEVEL_LABELS,
  calculatePrimaryHoursPerYear,
  calculateSecondaryCredits,
  filterSchoolSubjects,
} from '@/lib/regulations/school-curriculum-presets';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

export interface SubjectCatalogModalProps {
  isOpen: boolean;
  canManage: boolean;
  onClose: () => void;
}

interface SubjectFormState {
  id: string;
  subjectCode: string;
  subjectName: string;
  subjectGroup: string;
  subjectType: SchoolSubjectType;
  levelGroup: SubjectLevelGroup;
  gradeLevels: string[];
  semesterScope: SubjectSemesterScope;
  defaultHoursPerWeek: string;
  hoursPerYear: string;
  credits: string;
  preferMorning: boolean;
  defaultConsecutive: 1 | 2;
  curriculumVersion: string;
  description: string;
  isActive: boolean;
  sortOrder: number;
}

function createEmptyForm(levelGroup: SubjectLevelGroup = 'primary'): SubjectFormState {
  return {
    id: '',
    subjectCode: '',
    subjectName: '',
    subjectGroup: levelGroup === 'kindergarten' ? 'ปฐมวัย' : 'ภาษาไทย',
    subjectType: levelGroup === 'kindergarten' ? 'ประสบการณ์ปฐมวัย' : 'พื้นฐาน',
    levelGroup,
    gradeLevels: levelGroup === 'kindergarten' ? ['อ.1', 'อ.2', 'อ.3'] : [GRADE_LEVELS_BY_GROUP[levelGroup][0]],
    semesterScope: levelGroup === 'secondary' ? '1' : 'both',
    defaultHoursPerWeek: levelGroup === 'secondary' ? '3' : '2',
    hoursPerYear: levelGroup === 'secondary' ? '0' : String(calculatePrimaryHoursPerYear(2)),
    credits: levelGroup === 'secondary' ? String(calculateSecondaryCredits(3)) : '0',
    preferMorning: false,
    defaultConsecutive: 1,
    curriculumVersion: DEFAULT_CURRICULUM_VERSION,
    description: '',
    isActive: true,
    sortOrder: 100,
  };
}

export const SubjectCatalogModal: React.FC<SubjectCatalogModalProps> = ({
  isOpen,
  canManage,
  onClose,
}) => {
  const [subjects, setSubjects] = useState<SchoolSubject[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [levelFilter, setLevelFilter] = useState<SubjectLevelGroup | 'ALL'>('ALL');
  const [gradeFilter, setGradeFilter] = useState<string>('ALL');
  const [groupFilter, setGroupFilter] = useState<string>('ALL');
  const [semesterFilter, setSemesterFilter] = useState<SubjectSemesterScope | 'ALL'>('ALL');
  const [showInactive, setShowInactive] = useState<boolean>(false);

  // Sub-modals
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [formState, setFormState] = useState<SubjectFormState>(createEmptyForm('primary'));
  const [isSeedConfirmOpen, setIsSeedConfirmOpen] = useState<boolean>(false);
  const [deletingSubject, setDeletingSubject] = useState<SchoolSubject | null>(null);

  const showNotice = (type: 'success' | 'error', text: string) => {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 5000);
  };

  const loadSubjects = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/timetable/subjects', { cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success && Array.isArray(json.subjects)) {
        setSubjects(json.subjects);
      } else {
        throw new Error(json.error || 'ไม่สามารถโหลดคลังรายวิชาได้');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'ไม่สามารถโหลดคลังรายวิชาได้';
      showNotice('error', msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadSubjects();
    }
  }, [isOpen, loadSubjects]);

  const filteredSubjects = useMemo(() => {
    return filterSchoolSubjects(subjects, {
      search: searchQuery,
      levelGroup: levelFilter,
      gradeLevel: gradeFilter,
      subjectGroup: groupFilter,
      semesterScope: semesterFilter,
      activeOnly: !showInactive,
    });
  }, [subjects, searchQuery, levelFilter, gradeFilter, groupFilter, semesterFilter, showInactive]);

  const availableGradesForFilter = useMemo(() => {
    if (levelFilter === 'ALL') return ALL_SCHOOL_GRADE_LEVELS;
    return GRADE_LEVELS_BY_GROUP[levelFilter];
  }, [levelFilter]);

  const handleOpenAddForm = () => {
    if (!canManage) return;
    const initialLevel: SubjectLevelGroup = levelFilter === 'ALL' ? 'primary' : levelFilter;
    setFormState(createEmptyForm(initialLevel));
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (item: SchoolSubject) => {
    if (!canManage) return;
    setFormState({
      id: item.id,
      subjectCode: item.subjectCode || '',
      subjectName: item.subjectName || '',
      subjectGroup: item.subjectGroup || 'ภาษาไทย',
      subjectType: item.subjectType || 'พื้นฐาน',
      levelGroup: item.levelGroup || 'primary',
      gradeLevels: Array.isArray(item.gradeLevels) ? [...item.gradeLevels] : [],
      semesterScope: item.semesterScope || 'both',
      defaultHoursPerWeek: String(item.defaultHoursPerWeek ?? 1),
      hoursPerYear: String(item.hoursPerYear ?? 0),
      credits: String(item.credits ?? 0),
      preferMorning: Boolean(item.preferMorning),
      defaultConsecutive: item.defaultConsecutive === 2 ? 2 : 1,
      curriculumVersion: item.curriculumVersion || DEFAULT_CURRICULUM_VERSION,
      description: item.description || '',
      isActive: item.isActive !== false,
      sortOrder: item.sortOrder ?? 100,
    });
    setIsFormOpen(true);
  };

  const handleFormLevelChange = (nextLevel: SubjectLevelGroup) => {
    const hrs = Number(formState.defaultHoursPerWeek) || 1;
    const defaultGrades =
      nextLevel === 'kindergarten'
        ? ['อ.1', 'อ.2', 'อ.3']
        : [GRADE_LEVELS_BY_GROUP[nextLevel][0]];

    setFormState((prev) => ({
      ...prev,
      levelGroup: nextLevel,
      gradeLevels: defaultGrades,
      subjectGroup: nextLevel === 'kindergarten' ? 'ปฐมวัย' : prev.subjectGroup === 'ปฐมวัย' ? 'ภาษาไทย' : prev.subjectGroup,
      subjectType: nextLevel === 'kindergarten' ? 'ประสบการณ์ปฐมวัย' : prev.subjectType === 'ประสบการณ์ปฐมวัย' ? 'พื้นฐาน' : prev.subjectType,
      semesterScope: nextLevel === 'secondary' && prev.semesterScope === 'both' ? '1' : nextLevel !== 'secondary' ? 'both' : prev.semesterScope,
      hoursPerYear: nextLevel === 'secondary' ? '0' : String(calculatePrimaryHoursPerYear(hrs)),
      credits: nextLevel === 'secondary' ? String(calculateSecondaryCredits(hrs)) : '0',
    }));
  };

  const handleHoursPerWeekChange = (rawVal: string) => {
    const num = Number(rawVal);
    setFormState((prev) => {
      if (!Number.isFinite(num) || num <= 0) {
        return { ...prev, defaultHoursPerWeek: rawVal };
      }
      return {
        ...prev,
        defaultHoursPerWeek: rawVal,
        hoursPerYear: prev.levelGroup === 'secondary' ? '0' : String(calculatePrimaryHoursPerYear(num)),
        credits: prev.levelGroup === 'secondary' ? String(calculateSecondaryCredits(num)) : '0',
      };
    });
  };

  const toggleFormGrade = (grade: string) => {
    setFormState((prev) => {
      const exists = prev.gradeLevels.includes(grade);
      const next = exists
        ? prev.gradeLevels.filter((g) => g !== grade)
        : [...prev.gradeLevels, grade];
      return { ...prev, gradeLevels: next };
    });
  };

  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;
    if (!formState.subjectName.trim()) {
      showNotice('error', 'กรุณาระบุชื่อรายวิชา');
      return;
    }
    if (formState.gradeLevels.length === 0) {
      showNotice('error', 'กรุณาเลือกชั้นที่เปิดสอนอย่างน้อย 1 ระดับชั้น');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/timetable/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: formState.id || undefined,
          subjectCode: formState.subjectCode.trim(),
          subjectName: formState.subjectName.trim(),
          subjectGroup: formState.subjectGroup,
          subjectType: formState.subjectType,
          levelGroup: formState.levelGroup,
          gradeLevels: formState.gradeLevels,
          semesterScope: formState.semesterScope,
          defaultHoursPerWeek: Number(formState.defaultHoursPerWeek) || 1,
          hoursPerYear: Number(formState.hoursPerYear) || 0,
          credits: Number(formState.credits) || 0,
          preferMorning: formState.preferMorning,
          defaultConsecutive: formState.defaultConsecutive,
          curriculumVersion: formState.curriculumVersion.trim() || DEFAULT_CURRICULUM_VERSION,
          description: formState.description.trim(),
          isActive: formState.isActive,
          sortOrder: formState.sortOrder,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'ไม่สามารถบันทึกรายวิชาได้');
      }

      const saved: SchoolSubject = json.data;
      setSubjects((prev) => {
        const exists = prev.some((s) => s.id === saved.id);
        return exists ? prev.map((s) => (s.id === saved.id ? saved : s)) : [...prev, saved];
      });
      setIsFormOpen(false);
      showNotice(
        'success',
        formState.id ? `อัปเดตรายวิชา "${saved.subjectName}" เรียบร้อยแล้ว` : `เพิ่มรายวิชา "${saved.subjectName}" เรียบร้อยแล้ว`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึกรายวิชา';
      showNotice('error', msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (item: SchoolSubject) => {
    if (!canManage || isSaving) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/timetable/subjects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, isActive: !item.isActive }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'ไม่สามารถเปลี่ยนสถานะรายวิชาได้');
      }
      const updated: SchoolSubject = json.data;
      setSubjects((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      showNotice(
        'success',
        `${updated.isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}รายวิชา "${updated.subjectName}" แล้ว`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเปลี่ยนสถานะรายวิชา';
      showNotice('error', msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmSeed = async () => {
    if (!canManage) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/timetable/subjects/seed', { method: 'POST' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'ไม่สามารถนำเข้าโครงสร้างหลักสูตรได้');
      }
      if (Array.isArray(json.subjects)) {
        setSubjects(json.subjects);
      } else {
        await loadSubjects();
      }
      setIsSeedConfirmOpen(false);
      showNotice(
        'success',
        `นำเข้าโครงสร้างหลักสูตรมาตรฐาน (อ.1–ม.3) สำเร็จ: เพิ่มใหม่ ${json.insertedCount} รายวิชา (ข้ามรายการที่มีอยู่แล้ว ${json.skippedCount} รายวิชา)`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการนำเข้าหลักสูตร';
      showNotice('error', msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!canManage || !deletingSubject) return;
    const target = deletingSubject;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/admin/timetable/subjects?id=${encodeURIComponent(target.id)}`, {
        method: 'DELETE',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'ไม่สามารถลบรายวิชาได้');
      }
      setSubjects((prev) => prev.filter((s) => s.id !== target.id));
      setDeletingSubject(null);
      showNotice('success', `ลบรายวิชา "${target.subjectName}" ออกจากคลังเรียบร้อยแล้ว`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการลบรายวิชา';
      showNotice('error', msg);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="subject-catalog-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 dark:bg-black/75 backdrop-blur-xs p-3 sm:p-4"
    >
      <div className="bg-white dark:bg-[#121822] border border-slate-200/90 dark:border-slate-800 rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl text-slate-800 dark:text-slate-200 overflow-hidden">
        {/* Sticky Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-slate-200/90 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <BookOpen className="w-5 h-5 text-sky-500 shrink-0" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3
                  id="subject-catalog-modal-title"
                  className="text-base font-bold text-slate-900 dark:text-white"
                >
                  คลังรายวิชา (หลักสูตรสถานศึกษา อ.1–ม.3)
                </h3>
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-semibold bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800/80">
                  {filteredSubjects.length} / {subjects.length} รายวิชา
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                จัดการรายวิชา รหัสวิชา หน่วยกิต และเวลาเรียนมาตรฐานระดับปฐมวัย ประถมศึกษา และมัธยมศึกษาตอนต้น
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {canManage && (
              <>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => setIsSeedConfirmOpen(true)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-4 h-4 shrink-0" />
                  <span>นำเข้าหลักสูตรมาตรฐาน (อ.1–ม.3)</span>
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleOpenAddForm}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Plus className="w-4 h-4 shrink-0" />
                  <span>เพิ่มรายวิชา</span>
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="ปิดหน้าต่างคลังรายวิชา"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {notice && (
            <div
              role="status"
              aria-live="polite"
              className={`px-4 py-2.5 rounded-xl border text-xs font-medium flex items-center gap-2 ${
                notice.type === 'success'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                  : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
              }`}
            >
              {notice.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{notice.text}</span>
            </div>
          )}

          {/* Filter Bar */}
          <search aria-label="ค้นหาและกรองคลังรายวิชา" className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
              <div className="relative md:col-span-4">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 shrink-0" />
                <input
                  type="search"
                  name="subjectSearch"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหารหัสวิชา หรือชื่อรายวิชา..."
                  className="w-full h-9 bg-slate-50 dark:bg-[#101822] border border-slate-200 dark:border-slate-700/80 rounded-xl pl-9 pr-3 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="md:col-span-2">
                <select
                  aria-label="กรองตามระดับการศึกษา"
                  value={levelFilter}
                  onChange={(e) => {
                    const next = e.target.value as SubjectLevelGroup | 'ALL';
                    setLevelFilter(next);
                    setGradeFilter('ALL');
                  }}
                  className="w-full h-9 bg-slate-50 dark:bg-[#101822] border border-slate-200 dark:border-slate-700/80 rounded-xl px-2.5 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-sky-500 cursor-pointer"
                >
                  <option value="ALL">ระดับ: ทั้งหมด</option>
                  <option value="kindergarten">ปฐมวัย (อ.1–อ.3)</option>
                  <option value="primary">ประถม (ป.1–ป.6)</option>
                  <option value="secondary">ม.ต้น (ม.1–ม.3)</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <select
                  aria-label="กรองตามระดับชั้น"
                  value={gradeFilter}
                  onChange={(e) => setGradeFilter(e.target.value)}
                  className="w-full h-9 bg-slate-50 dark:bg-[#101822] border border-slate-200 dark:border-slate-700/80 rounded-xl px-2.5 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-sky-500 cursor-pointer"
                >
                  <option value="ALL">ชั้น: ทั้งหมด</option>
                  {availableGradesForFilter.map((g) => (
                    <option key={g} value={g}>
                      ชั้น {g}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <select
                  aria-label="กรองตามกลุ่มสาระการเรียนรู้"
                  value={groupFilter}
                  onChange={(e) => setGroupFilter(e.target.value)}
                  className="w-full h-9 bg-slate-50 dark:bg-[#101822] border border-slate-200 dark:border-slate-700/80 rounded-xl px-2.5 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-sky-500 cursor-pointer"
                >
                  <option value="ALL">กลุ่มสาระ: ทั้งหมด</option>
                  {SCHOOL_SUBJECT_GROUPS.map((grp) => (
                    <option key={grp} value={grp}>
                      {grp}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <select
                  aria-label="กรองตามภาคเรียน"
                  value={semesterFilter}
                  onChange={(e) => setSemesterFilter(e.target.value as SubjectSemesterScope | 'ALL')}
                  className="w-full h-9 bg-slate-50 dark:bg-[#101822] border border-slate-200 dark:border-slate-700/80 rounded-xl px-2.5 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-sky-500 cursor-pointer"
                >
                  <option value="ALL">ภาคเรียน: ทั้งหมด</option>
                  <option value="both">ทั้งปีการศึกษา</option>
                  <option value="1">ภาคเรียนที่ 1</option>
                  <option value="2">ภาคเรียนที่ 2</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 text-xs">
              <label className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                  className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                />
                <span>แสดงวิชาที่ปิดใช้งาน</span>
              </label>

              {!canManage && (
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  มุมมองอ่านอย่างเดียว (เฉพาะผู้ดูแลระบบและฝ่ายวิชาการสามารถแก้ไขได้)
                </span>
              )}
            </div>
          </search>

          {/* Responsive Table */}
          <div
            tabIndex={0}
            role="region"
            aria-label="ตารางคลังรายวิชาหลักสูตรสถานศึกษา"
            className="overflow-x-auto w-full rounded-xl border border-slate-200/90 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
          >
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-100/90 dark:bg-[#101822] text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200/90 dark:border-slate-800">
                <tr>
                  <th scope="col" className="px-3 py-3 whitespace-nowrap">
                    รหัสวิชา
                  </th>
                  <th scope="col" className="px-3 py-3">
                    ชื่อรายวิชา / กลุ่มสาระ
                  </th>
                  <th scope="col" className="px-3 py-3 whitespace-nowrap">
                    ประเภท
                  </th>
                  <th scope="col" className="px-3 py-3 whitespace-nowrap">
                    ชั้นที่เปิดสอน
                  </th>
                  <th scope="col" className="px-3 py-3 whitespace-nowrap">
                    ภาคเรียน
                  </th>
                  <th scope="col" className="px-3 py-3 text-center whitespace-nowrap">
                    เวลาเรียน (ชม./สัปดาห์)
                  </th>
                  <th scope="col" className="px-3 py-3 whitespace-nowrap">
                    เงื่อนไขจัดตาราง
                  </th>
                  <th scope="col" className="px-3 py-3 text-center whitespace-nowrap">
                    สถานะ
                  </th>
                  {canManage && (
                    <th scope="col" className="px-3 py-3 text-center whitespace-nowrap">
                      จัดการ
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {isLoading ? (
                  <tr>
                    <td colSpan={canManage ? 9 : 8} className="px-4 py-12 text-center text-slate-500">
                      <div className="inline-flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-sky-500" />
                        <span>กำลังโหลดคลังรายวิชา...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredSubjects.length === 0 ? (
                  <tr>
                    <td colSpan={canManage ? 9 : 8} className="px-4 py-12 text-center text-slate-500 dark:text-slate-400 space-y-2">
                      <div>ไม่พบรายวิชาที่ตรงกับเงื่อนไขการค้นหา</div>
                      {subjects.length === 0 && canManage && (
                        <button
                          type="button"
                          onClick={() => setIsSeedConfirmOpen(true)}
                          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium cursor-pointer"
                        >
                          <Download className="w-4 h-4 shrink-0" />
                          <span>นำเข้าหลักสูตรมาตรฐาน (อ.1–ม.3)</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredSubjects.map((item) => (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50 dark:hover:bg-[#1a2636]/50 transition-colors ${
                        !item.isActive ? 'opacity-60' : ''
                      }`}
                    >
                      <td className="px-3 py-2.5 whitespace-nowrap font-mono font-semibold text-slate-800 dark:text-slate-100">
                        {item.subjectCode || '-'}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {item.subjectName}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {item.subjectGroup}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {item.subjectType}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-wrap gap-1 max-w-[140px]">
                          {item.gradeLevels.map((g) => (
                            <span
                              key={g}
                              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800/70"
                            >
                              {g}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-slate-600 dark:text-slate-300">
                        {SEMESTER_SCOPE_LABELS[item.semesterScope]}
                      </td>
                      <td className="px-3 py-2.5 text-center whitespace-nowrap">
                        <div className="font-mono font-bold text-slate-900 dark:text-white">
                          {item.defaultHoursPerWeek} ชม.
                        </div>
                        <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                          {item.levelGroup === 'secondary'
                            ? item.credits > 0
                              ? `${item.credits} หน่วยกิต`
                              : 'กิจกรรม'
                            : item.hoursPerYear > 0
                              ? `${item.hoursPerYear} ชม./ปี`
                              : '-'}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <div className="flex flex-wrap items-center gap-1">
                          {item.preferMorning && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/70">
                              <Sun className="w-3 h-3 shrink-0" />
                              <span>ช่วงเช้า</span>
                            </span>
                          )}
                          {item.defaultConsecutive === 2 && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/70">
                              <Link2 className="w-3 h-3 shrink-0" />
                              <span>ติดกัน 2 ชม.</span>
                            </span>
                          )}
                          {!item.preferMorning && item.defaultConsecutive !== 2 && (
                            <span className="text-slate-400">-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                            item.isActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/70'
                              : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                          }`}
                        >
                          {item.isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                        </span>
                      </td>
                      {canManage && (
                        <td className="px-3 py-2.5 text-center whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditForm(item)}
                              title="แก้ไขรายวิชา"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-sky-600 hover:bg-sky-50 dark:text-slate-400 dark:hover:text-sky-400 dark:hover:bg-sky-950/40 transition-colors cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={isSaving}
                              onClick={() => handleToggleActive(item)}
                              title={item.isActive ? 'ปิดใช้งานรายวิชา' : 'เปิดใช้งานรายวิชา'}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50 ${
                                item.isActive
                                  ? 'text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:text-slate-400 dark:hover:text-amber-400 dark:hover:bg-amber-950/40'
                                  : 'text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40'
                              }`}
                            >
                              <Power className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={isSaving}
                              onClick={() => setDeletingSubject(item)}
                              title="ลบรายวิชา"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:text-slate-400 dark:hover:text-rose-400 dark:hover:bg-rose-950/40 transition-colors cursor-pointer disabled:opacity-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="flex items-center justify-between gap-2 px-6 py-3.5 border-t border-slate-200/90 dark:border-slate-800 shrink-0 text-xs text-slate-500 dark:text-slate-400">
          <span>{DEFAULT_CURRICULUM_VERSION}</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 text-xs font-medium transition-colors cursor-pointer"
          >
            ปิด
          </button>
        </div>
      </div>

      {/* Add / Edit Subject Sub-Modal (Close-Locked) */}
      {isFormOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="subject-form-modal-title"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-4"
        >
          <div className="bg-white dark:bg-[#141d27] border border-slate-200/90 dark:border-slate-700 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl text-slate-800 dark:text-slate-200 overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-slate-200/90 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-sky-500 shrink-0" />
                <h4 id="subject-form-modal-title" className="text-base font-bold text-slate-900 dark:text-white">
                  {formState.id ? 'แก้ไขรายวิชาในคลังหลักสูตร' : 'เพิ่มรายวิชาใหม่ในคลังหลักสูตร'}
                </h4>
              </div>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => setIsFormOpen(false)}
                aria-label="ปิดฟอร์มรายวิชา"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              id="school-subject-form"
              aria-labelledby="subject-form-modal-title"
              onSubmit={handleSaveSubject}
              className="flex-1 overflow-y-auto px-6 py-5 space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label htmlFor="sub-code" className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                    รหัสวิชา
                  </label>
                  <input
                    id="sub-code"
                    name="subjectCode"
                    type="text"
                    value={formState.subjectCode}
                    onChange={(e) => setFormState((prev) => ({ ...prev, subjectCode: e.target.value }))}
                    placeholder="เช่น ท11101, ค21101"
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    className="w-full h-10 bg-slate-50 dark:bg-[#101822] border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="sub-name" className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                    ชื่อรายวิชา <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="sub-name"
                    name="subjectName"
                    type="text"
                    required
                    value={formState.subjectName}
                    onChange={(e) => setFormState((prev) => ({ ...prev, subjectName: e.target.value }))}
                    placeholder="เช่น ภาษาไทย, คณิตศาสตร์ 1"
                    className="w-full h-10 bg-slate-50 dark:bg-[#101822] border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label htmlFor="sub-group" className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                    กลุ่มสาระการเรียนรู้ <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="sub-group"
                    name="subjectGroup"
                    required
                    value={formState.subjectGroup}
                    onChange={(e) => setFormState((prev) => ({ ...prev, subjectGroup: e.target.value }))}
                    className="w-full h-10 bg-slate-50 dark:bg-[#101822] border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500 cursor-pointer"
                  >
                    {SCHOOL_SUBJECT_GROUPS.map((grp) => (
                      <option key={grp} value={grp}>
                        {grp}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="sub-type" className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                    ประเภทวิชา <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="sub-type"
                    name="subjectType"
                    required
                    value={formState.subjectType}
                    onChange={(e) =>
                      setFormState((prev) => ({ ...prev, subjectType: e.target.value as SchoolSubjectType }))
                    }
                    className="w-full h-10 bg-slate-50 dark:bg-[#101822] border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500 cursor-pointer"
                  >
                    {SCHOOL_SUBJECT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label htmlFor="sub-level" className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                    ระดับชั้น <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="sub-level"
                    name="levelGroup"
                    required
                    value={formState.levelGroup}
                    onChange={(e) => handleFormLevelChange(e.target.value as SubjectLevelGroup)}
                    className="w-full h-10 bg-slate-50 dark:bg-[#101822] border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500 cursor-pointer"
                  >
                    <option value="kindergarten">{SUBJECT_LEVEL_LABELS.kindergarten}</option>
                    <option value="primary">{SUBJECT_LEVEL_LABELS.primary}</option>
                    <option value="secondary">{SUBJECT_LEVEL_LABELS.secondary}</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="sub-semester" className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                    ภาคเรียนที่เปิดสอน <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="sub-semester"
                    name="semesterScope"
                    required
                    value={formState.semesterScope}
                    onChange={(e) =>
                      setFormState((prev) => ({
                        ...prev,
                        semesterScope: e.target.value as SubjectSemesterScope,
                      }))
                    }
                    className="w-full h-10 bg-slate-50 dark:bg-[#101822] border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500 cursor-pointer"
                  >
                    <option value="both">ทั้งปีการศึกษา</option>
                    <option value="1">ภาคเรียนที่ 1</option>
                    <option value="2">ภาคเรียนที่ 2</option>
                  </select>
                </div>
              </div>

              {/* Grade Levels Multi-Select Pills */}
              <fieldset className="space-y-2">
                <legend className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  ชั้นที่เปิดสอน <span className="text-rose-500">*</span>
                </legend>
                <div className="flex flex-wrap gap-2">
                  {GRADE_LEVELS_BY_GROUP[formState.levelGroup].map((g) => {
                    const checked = formState.gradeLevels.includes(g);
                    return (
                      <label
                        key={g}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono font-medium cursor-pointer transition-colors ${
                          checked
                            ? 'bg-sky-600 text-white border-sky-600'
                            : 'bg-slate-50 dark:bg-[#101822] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-sky-400'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleFormGrade(g)}
                          className="sr-only"
                        />
                        <span>{g}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              {/* Hours / Annual Hours / Credits */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label htmlFor="sub-hours-week" className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                    ชั่วโมง/สัปดาห์ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="sub-hours-week"
                    name="defaultHoursPerWeek"
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="40"
                    required
                    value={formState.defaultHoursPerWeek}
                    onChange={(e) => handleHoursPerWeekChange(e.target.value)}
                    className="w-full h-10 bg-slate-50 dark:bg-[#101822] border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>

                {formState.levelGroup === 'secondary' ? (
                  <div>
                    <label htmlFor="sub-credits" className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                      หน่วยกิต (ม.ต้น)
                    </label>
                    <input
                      id="sub-credits"
                      name="credits"
                      type="number"
                      step="0.5"
                      min="0"
                      max="10"
                      value={formState.credits}
                      onChange={(e) => setFormState((prev) => ({ ...prev, credits: e.target.value }))}
                      className="w-full h-10 bg-slate-50 dark:bg-[#101822] border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                ) : (
                  <div>
                    <label htmlFor="sub-hours-year" className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                      ชั่วโมง/ปี (ปฐมวัย/ประถม)
                    </label>
                    <input
                      id="sub-hours-year"
                      name="hoursPerYear"
                      type="number"
                      step="1"
                      min="0"
                      max="1600"
                      value={formState.hoursPerYear}
                      onChange={(e) => setFormState((prev) => ({ ...prev, hoursPerYear: e.target.value }))}
                      className="w-full h-10 bg-slate-50 dark:bg-[#101822] border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                )}

                <div>
                  <label htmlFor="sub-version" className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                    รุ่นหลักสูตร
                  </label>
                  <input
                    id="sub-version"
                    name="curriculumVersion"
                    type="text"
                    value={formState.curriculumVersion}
                    onChange={(e) => setFormState((prev) => ({ ...prev, curriculumVersion: e.target.value }))}
                    className="w-full h-10 bg-slate-50 dark:bg-[#101822] border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Scheduling Defaults */}
              <fieldset className="flex flex-wrap items-center gap-4 pt-1">
                <legend className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-2">
                  เงื่อนไขการจัดตารางอัตโนมัติ
                </legend>
                <label className="inline-flex items-center gap-2 text-xs text-slate-700 dark:text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formState.preferMorning}
                    onChange={(e) =>
                      setFormState((prev) => ({ ...prev, preferMorning: e.target.checked }))
                    }
                    className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                  />
                  <span>เน้นช่วงเช้า (ชั่วโมงที่ 1–3)</span>
                </label>

                <label className="inline-flex items-center gap-2 text-xs text-slate-700 dark:text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formState.defaultConsecutive === 2}
                    onChange={(e) =>
                      setFormState((prev) => ({
                        ...prev,
                        defaultConsecutive: e.target.checked ? 2 : 1,
                      }))
                    }
                    className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                  />
                  <span>ลงติดกัน 2 ชั่วโมง</span>
                </label>
              </fieldset>

              <div>
                <label htmlFor="sub-desc" className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                  คำอธิบายสั้น / หมายเหตุ
                </label>
                <textarea
                  id="sub-desc"
                  name="description"
                  rows={2}
                  value={formState.description}
                  onChange={(e) => setFormState((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="ระบุคำอธิบายรายวิชาหรือหมายเหตุเพิ่มเติม (ถ้ามี)"
                  className="w-full bg-slate-50 dark:bg-[#101822] border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>
            </form>

            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-200/90 dark:border-slate-800 shrink-0">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                form="school-subject-form"
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />}
                <span>{formState.id ? 'บันทึกการเปลี่ยนแปลง' : 'บันทึกรายวิชา'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Seed Preset Modal */}
      <ConfirmModal
        isOpen={isSeedConfirmOpen}
        title="ยืนยันการนำเข้าหลักสูตรมาตรฐาน (อ.1–ม.3)"
        description="ระบบจะนำเข้าโครงสร้างรายวิชามาตรฐาน สพฐ. ระดับปฐมวัย ประถมศึกษา และมัธยมศึกษาตอนต้น โดยเพิ่มเฉพาะรายวิชาที่ยังไม่มีในระบบ และไม่เขียนทับรายวิชาที่คุณแก้ไขไว้แล้ว"
        confirmLabel="นำเข้าหลักสูตรมาตรฐาน"
        cancelLabel="ยกเลิก"
        isLoading={isSaving}
        onConfirm={handleConfirmSeed}
        onCancel={() => setIsSeedConfirmOpen(false)}
      />

      {/* Confirm Delete Subject Modal */}
      <ConfirmModal
        isOpen={Boolean(deletingSubject)}
        title="ยืนยันการลบรายวิชาออกจากคลัง"
        description={
          deletingSubject
            ? `ต้องการลบรายวิชา "${deletingSubject.subjectCode ? `${deletingSubject.subjectCode} ` : ''}${deletingSubject.subjectName}" ออกจากคลังรายวิชาหรือไม่?`
            : ''
        }
        confirmLabel="ยืนยันการลบ"
        cancelLabel="ยกเลิก"
        variant="danger"
        isLoading={isSaving}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingSubject(null)}
      />
    </div>
  );
};
