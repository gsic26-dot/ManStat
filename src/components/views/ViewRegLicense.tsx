'use client';

/**
 * ============================================================================
 * ManStat: View Khurusapha Professional Licenses (ทะเบียนใบอนุญาตฯ)
 * ============================================================================
 * - Group by Person: 1 row = 1 staff member (no duplicates)
 * - Symmetrical 6-column unified table layout
 * - Earliest expiration and most urgent status displayed on main row
 * - Clickable summary filter cards (ฉบับ / ท่าน)
 * - Admin-only inline Add / Edit / Delete CRUD backed by /api/admin/staff
 * - Portal ThaiDatePicker for issueDate & expiryDate, ConfirmModal for delete
 * - Zero emojis, pure Lucide SVG icons with strict Minimal & Clean standard
 * ============================================================================
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Award,
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  Search,
  Loader2,
  PlusCircle,
  Pencil,
  Trash2,
  X,
  Download,
} from 'lucide-react';
import { type TeacherRecord } from '@/lib/data/schoolData';
import { ThaiDatePicker, formatThaiDateDisplay } from '@/components/ui/ThaiDatePicker';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import {
  groupAndSortLicenseRegistry,
  matchesHealthFilter,
  type EvaluatedLicense,
} from '@/lib/regulations/license-grouping';
import { formatStaffName } from '@/lib/regulations/staff-formatting';
import { sortTeachersByBranch } from '@/lib/regulations/staff-sorting';
import { isAdminRole } from '@/lib/auth/roles';
import { buildLicenseExpiryCsv, triggerCsvDownload } from '@/lib/exports/hrExports';

const LICENSE_TYPE_OPTIONS = [
  'ใบอนุญาตประกอบวิชาชีพครู (ชั้นต้น / B-License)',
  'ใบอนุญาตประกอบวิชาชีพครู (ชั้นสูง / A-License)',
  'ใบอนุญาตปฏิบัติหน้าที่ครู (P-License)',
  'ใบอนุญาตประกอบวิชาชีพครู',
  'ใบอนุญาตประกอบวิชาชีพผู้บริหารสถานศึกษา',
  'ใบอนุญาตประกอบวิชาชีพผู้บริหารการศึกษา',
  'ใบอนุญาตประกอบวิชาชีพศึกษานิเทศก์',
];

const CUSTOM_LICENSE_VALUE = '__CUSTOM__';

type TeacherLicenseItem = TeacherRecord['licenses'][number];

function deriveLicenseCategory(type: string): string {
  if (type.includes('ผู้บริหาร')) return 'ผู้บริหาร';
  if (type.includes('ศึกษานิเทศก์')) return 'ศึกษานิเทศก์';
  return 'ครู';
}

function findMatchingLicenseIndex(
  rawLicenses: TeacherLicenseItem[],
  target: Pick<EvaluatedLicense, 'number' | 'type' | 'issueDate' | 'expiryDate'>
): number {
  const exactIdx = rawLicenses.findIndex(
    (l) =>
      (l.number || '') === (target.number || '') &&
      (l.type || '') === (target.type || '') &&
      (l.issueDate || '') === (target.issueDate || '') &&
      (l.expiryDate || '') === (target.expiryDate || '')
  );
  if (exactIdx >= 0) return exactIdx;
  return rawLicenses.findIndex(
    (l) => (l.number || '') === (target.number || '') && (l.type || '') === (target.type || '')
  );
}

export const ViewRegLicense: React.FC = () => {
  const [teachersList, setTeachersList] = useState<TeacherRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterHealth, setFilterHealth] = useState<'ALL' | 'VALID' | 'EXPIRING_SOON' | 'EXPIRED' | 'MISSING'>('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [currentRole, setCurrentRole] = useState<string>('teacher');

  // Admin CRUD state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingContext, setEditingContext] = useState<{
    teacherId: string;
    licenseIndex: number;
  } | null>(null);
  const [formTeacherId, setFormTeacherId] = useState<string>('');
  const [formTypeSelect, setFormTypeSelect] = useState<string>(LICENSE_TYPE_OPTIONS[0]);
  const [formCustomType, setFormCustomType] = useState<string>('');
  const [formNumber, setFormNumber] = useState<string>('');
  const [formIssueDate, setFormIssueDate] = useState<string>('');
  const [formExpiryDate, setFormExpiryDate] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const [deletingTarget, setDeletingTarget] = useState<{
    teacherId: string;
    teacherName: string;
    licenseIndex: number;
    licenseType: string;
    licenseNumber: string;
  } | null>(null);

  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const canManage = isAdminRole(currentRole);

  const showNotice = useCallback((type: 'success' | 'error', text: string) => {
    setNotice({ type, text });
    setTimeout(() => {
      setNotice((prev) => (prev?.text === text ? null : prev));
    }, 4000);
  }, []);

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
        .then((res) => res.json())
        .then((data) => {
          if (isMounted && data.success && data.user?.role) {
            setCurrentRole(data.user.role);
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
    ]).finally(() => {
      if (isMounted) setIsLoading(false);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSaving) {
        setIsModalOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isModalOpen, isSaving]);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  // Sorted staff options for dropdown
  const sortedStaffOptions = useMemo(() => {
    return sortTeachersByBranch(teachersList);
  }, [teachersList]);

  // Build grouped registry and statistics
  const { groups, stats } = useMemo(() => {
    return groupAndSortLicenseRegistry(teachersList);
  }, [teachersList]);

  // Filter groups according to active status card and search query
  const filteredGroups = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return groups
      .map((g) => ({
        ...g,
        members: g.members.filter((m) => {
          const matchesHealth = filterHealth === 'ALL' || matchesHealthFilter(m, filterHealth);
          if (!matchesHealth) return false;
          if (!q) return true;
          return (
            formatStaffName(m.name).toLowerCase().includes(q) ||
            (m.position || '').toLowerCase().includes(q) ||
            (m.licensesDisplay || '').toLowerCase().includes(q) ||
            m.licenses.some((lic) => (lic.number || '').toLowerCase().includes(q))
          );
        }),
      }))
      .filter((g) => g.members.length > 0);
  }, [groups, filterHealth, searchQuery]);

  const totalFilteredCount = useMemo(() => {
    return filteredGroups.reduce((acc, g) => acc + g.members.length, 0);
  }, [filteredGroups]);

  const handleExportLicenseCsv = () => {
    const orderedPersons = filteredGroups.flatMap((g) => g.members);
    const csv = buildLicenseExpiryCsv(orderedPersons);
    const todayIso = new Date().toISOString().slice(0, 10);
    triggerCsvDownload(csv, `ManStat_License_Expiry_${todayIso}.csv`);
  };

  const openAddModal = (preselectTeacherId?: string) => {
    setEditingContext(null);
    setFormTeacherId(preselectTeacherId || sortedStaffOptions[0]?.id || '');
    setFormTypeSelect(LICENSE_TYPE_OPTIONS[0]);
    setFormCustomType('');
    setFormNumber('');
    setFormIssueDate('');
    setFormExpiryDate('');
    setIsModalOpen(true);
  };

  const openEditModal = (teacherId: string, lic: EvaluatedLicense) => {
    const teacher = teachersList.find((t) => t.id === teacherId);
    if (!teacher) return;
    const rawLicenses = Array.isArray(teacher.licenses) ? teacher.licenses : [];
    const idx = findMatchingLicenseIndex(rawLicenses, lic);
    if (idx < 0) return;

    const current = rawLicenses[idx];
    const isPreset = LICENSE_TYPE_OPTIONS.includes(current.type);
    setEditingContext({ teacherId, licenseIndex: idx });
    setFormTeacherId(teacherId);
    setFormTypeSelect(isPreset ? current.type : CUSTOM_LICENSE_VALUE);
    setFormCustomType(isPreset ? '' : current.type || '');
    setFormNumber(current.number || '');
    setFormIssueDate(current.issueDate || '');
    setFormExpiryDate(current.expiryDate || '');
    setIsModalOpen(true);
  };

  const persistTeacherLicenses = async (
    teacher: TeacherRecord,
    nextLicenses: TeacherLicenseItem[]
  ): Promise<boolean> => {
    const payload: TeacherRecord = {
      ...teacher,
      licenses: nextLicenses,
    };
    const res = await fetch('/api/admin/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'ไม่สามารถบันทึกข้อมูลใบอนุญาตได้');
    }
    const savedTeacher: TeacherRecord = data.data || payload;
    setTeachersList((prev) =>
      prev.map((t) => (t.id === savedTeacher.id ? savedTeacher : t))
    );
    return true;
  };

  const handleSaveLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;

    const targetTeacher = teachersList.find((t) => t.id === formTeacherId);
    if (!targetTeacher) {
      showNotice('error', 'กรุณาเลือกบุคลากรผู้ถือใบอนุญาต');
      return;
    }

    const resolvedType =
      formTypeSelect === CUSTOM_LICENSE_VALUE ? formCustomType.trim() : formTypeSelect.trim();
    if (!resolvedType) {
      showNotice('error', 'กรุณาระบุประเภทใบอนุญาตประกอบวิชาชีพ');
      return;
    }
    if (!formNumber.trim()) {
      showNotice('error', 'กรุณาระบุเลขที่ใบอนุญาต');
      return;
    }
    if (!formExpiryDate) {
      showNotice('error', 'กรุณาเลือกวันหมดอายุใบอนุญาต');
      return;
    }

    const nextItem: TeacherLicenseItem = {
      category: deriveLicenseCategory(resolvedType),
      type: resolvedType,
      number: formNumber.trim(),
      issueDate: formIssueDate || '',
      expiryDate: formExpiryDate,
    };

    const currentLicenses = Array.isArray(targetTeacher.licenses) ? [...targetTeacher.licenses] : [];
    if (editingContext && editingContext.teacherId === targetTeacher.id) {
      currentLicenses[editingContext.licenseIndex] = nextItem;
    } else {
      currentLicenses.push(nextItem);
    }

    setIsSaving(true);
    try {
      await persistTeacherLicenses(targetTeacher, currentLicenses);
      setIsModalOpen(false);
      setExpandedId(targetTeacher.id);
      showNotice(
        'success',
        editingContext ? 'อัปเดตข้อมูลใบอนุญาตประกอบวิชาชีพเรียบร้อยแล้ว' : 'เพิ่มข้อมูลใบอนุญาตประกอบวิชาชีพเรียบร้อยแล้ว'
      );
    } catch (err) {
      showNotice('error', err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setIsSaving(false);
    }
  };

  const requestDeleteLicense = (teacherId: string, teacherName: string, lic: EvaluatedLicense) => {
    const teacher = teachersList.find((t) => t.id === teacherId);
    if (!teacher) return;
    const rawLicenses = Array.isArray(teacher.licenses) ? teacher.licenses : [];
    const idx = findMatchingLicenseIndex(rawLicenses, lic);
    if (idx < 0) return;

    setDeletingTarget({
      teacherId,
      teacherName,
      licenseIndex: idx,
      licenseType: lic.type,
      licenseNumber: lic.number,
    });
  };

  const handleConfirmDelete = async () => {
    if (!deletingTarget || !canManage) return;
    const targetTeacher = teachersList.find((t) => t.id === deletingTarget.teacherId);
    if (!targetTeacher) {
      setDeletingTarget(null);
      return;
    }

    const currentLicenses = Array.isArray(targetTeacher.licenses) ? [...targetTeacher.licenses] : [];
    currentLicenses.splice(deletingTarget.licenseIndex, 1);

    setIsSaving(true);
    try {
      await persistTeacherLicenses(targetTeacher, currentLicenses);
      setDeletingTarget(null);
      showNotice('success', 'ลบข้อมูลใบอนุญาตประกอบวิชาชีพเรียบร้อยแล้ว');
    } catch (err) {
      showNotice('error', err instanceof Error ? err.message : 'ไม่สามารถลบข้อมูลได้');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#141b24] p-5 sm:p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm transition-colors duration-200">
        <div className="flex items-center gap-2.5">
          <Award className="w-5 h-5 text-sky-500 dark:text-sky-400 shrink-0" />
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
            ทะเบียนใบอนุญาตประกอบวิชาชีพครูและผู้บริหาร
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อ, เลขที่ใบอนุญาต..."
              className="w-full h-9 bg-slate-50 dark:bg-[#101822] border border-slate-200/90 dark:border-slate-700/80 rounded-lg pl-8 pr-3 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
            />
          </div>

          {canManage && (
            <button
              type="button"
              onClick={() => openAddModal()}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer shadow-sm"
            >
              <PlusCircle className="w-3.5 h-3.5 shrink-0" />
              <span>เพิ่มใบอนุญาต</span>
            </button>
          )}

          <button
            type="button"
            disabled={isLoading || totalFilteredCount === 0}
            onClick={handleExportLicenseCsv}
            aria-label="ส่งออกรายงานใบอนุญาตประกอบวิชาชีพเป็นไฟล์ CSV"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 border border-slate-200/90 dark:bg-[#121822] dark:hover:bg-slate-800/70 dark:text-slate-200 dark:hover:text-white dark:border-slate-800/80 text-xs font-medium transition-colors duration-200 whitespace-nowrap shrink-0 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            <Download className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>ส่งออกรายงานใบอนุญาตฯ</span>
          </button>

          <a
            href="https://ksp-eservice.ksp.or.th/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 border border-slate-200/90 dark:bg-[#121822] dark:hover:bg-slate-800/70 dark:text-slate-300 dark:hover:text-white dark:border-slate-800/80 text-xs font-medium transition-colors duration-200 whitespace-nowrap shrink-0"
          >
            <ExternalLink className="w-3.5 h-3.5 shrink-0 text-sky-500 dark:text-sky-400" />
            <span>KSP e-Service</span>
          </a>
        </div>
      </div>

      {/* Feedback Notice Banner */}
      {notice && (
        <div
          className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-xs font-medium ${
            notice.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {notice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{notice.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotice(null)}
            aria-label="ปิดการแจ้งเตือน"
            className="opacity-70 hover:opacity-100 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Stats Summary Cards (5 Clickable Filter Cards — grid-cols-2 lg:grid-cols-5) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Card 1: ทั้งหมด */}
        <div
          onClick={() => setFilterHealth('ALL')}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            filterHealth === 'ALL'
              ? 'border-sky-500 bg-sky-50/80 dark:bg-sky-500/10 shadow-sm'
              : 'border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#111823]/80 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">ใบอนุญาตทั้งหมด</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white">{stats.totalLicenses}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">ฉบับ</span>
          </div>
        </div>

        {/* Card 2: สถานะปกติ */}
        <div
          onClick={() => setFilterHealth('VALID')}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            filterHealth === 'VALID'
              ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-500/10 shadow-sm'
              : 'border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#111823]/80 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-500 dark:text-slate-400">สถานะปกติ</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">{stats.validLicenses}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">ฉบับ</span>
          </div>
        </div>

        {/* Card 3: ใกล้หมดอายุ 90 วัน */}
        <div
          onClick={() => setFilterHealth('EXPIRING_SOON')}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            filterHealth === 'EXPIRING_SOON'
              ? 'border-amber-500 bg-amber-50/80 dark:bg-amber-500/10 shadow-sm'
              : 'border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#111823]/80 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-500 dark:text-slate-400">ใกล้หมดอายุ 90 วัน</span>
            <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">{stats.expiringSoonLicenses}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">ฉบับ</span>
          </div>
        </div>

        {/* Card 4: หมดอายุแล้ว */}
        <div
          onClick={() => setFilterHealth('EXPIRED')}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            filterHealth === 'EXPIRED'
              ? 'border-rose-500 bg-rose-50/80 dark:bg-rose-500/10 shadow-sm'
              : 'border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#111823]/80 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-500 dark:text-slate-400">หมดอายุแล้ว</span>
            <AlertOctagon className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400">{stats.expiredLicenses}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">ฉบับ</span>
          </div>
        </div>

        {/* Card 5: ยังไม่บันทึกข้อมูล (นับเป็น ท่าน) */}
        <div
          onClick={() => setFilterHealth('MISSING')}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            filterHealth === 'MISSING'
              ? 'border-slate-400 dark:border-slate-500 bg-slate-100 dark:bg-slate-800/40 shadow-sm'
              : 'border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#111823]/80 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-500 dark:text-slate-400">ยังไม่บันทึกข้อมูล</span>
            <span className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500 shrink-0" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-slate-700 dark:text-slate-300">{stats.missingStaffCount}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">ท่าน</span>
          </div>
        </div>
      </div>

      {/* Table List */}
      <div className="bg-white dark:bg-[#111823]/80 rounded-2xl border border-slate-200/90 dark:border-slate-800/80 shadow-sm overflow-hidden transition-colors duration-200">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-sm text-slate-700 dark:text-slate-200">
            <thead className="bg-slate-50 dark:bg-[#101822] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold text-xs border-b border-slate-200/90 dark:border-slate-800">
              <tr>
                <th className="w-14 px-3 py-3.5 text-center">ลำดับ</th>
                <th className="px-4 py-3.5">ผู้ถือใบอนุญาต</th>
                <th className="px-4 py-3.5">ใบอนุญาตที่ถือครอง</th>
                <th className="px-4 py-3.5 font-mono whitespace-nowrap">หมดอายุใกล้สุด</th>
                <th className="px-4 py-3.5 text-center whitespace-nowrap">วันคงเหลือ</th>
                <th className="px-4 py-3.5 text-center min-w-[120px]">สถานะ</th>
                <th className="w-12 px-3 py-3.5 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                    <div className="inline-flex items-center gap-2 text-xs">
                      <Loader2 className="w-4 h-4 animate-spin text-sky-500" />
                      <span>กำลังโหลดทะเบียนใบอนุญาตประกอบวิชาชีพ...</span>
                    </div>
                  </td>
                </tr>
              ) : totalFilteredCount === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
                      <Award className="w-8 h-8 mb-2 opacity-40 shrink-0" />
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                        {filterHealth !== 'ALL' || searchQuery.trim() !== ''
                          ? 'ไม่พบข้อมูลตามเงื่อนไขที่เลือก'
                          : 'ยังไม่มีข้อมูลทะเบียนใบอนุญาตประกอบวิชาชีพ'}
                      </p>
                      {(filterHealth !== 'ALL' || searchQuery.trim() !== '') && (
                        <button
                          type="button"
                          onClick={() => {
                            setFilterHealth('ALL');
                            setSearchQuery('');
                          }}
                          className="mt-2 text-xs text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                        >
                          แสดงทั้งหมด
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                (() => {
                  let runningSeq = 0;
                  return filteredGroups.map((group) => (
                    <React.Fragment key={group.category}>
                      {/* Branch Header */}
                      <tr className="bg-slate-50/80 dark:bg-[#0d131b] border-y border-slate-200/80 dark:border-slate-800/70">
                        <td colSpan={7} className="px-4 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                group.category === 'management'
                                  ? 'bg-purple-400'
                                  : group.category === 'teaching'
                                  ? 'bg-sky-400'
                                  : 'bg-amber-400'
                              }`}
                            />
                            <span>{group.title}</span>
                          </div>
                        </td>
                      </tr>

                      {/* Person Rows */}
                      {group.members.map((person) => {
                        runningSeq++;
                        const seq = runningSeq;
                        const posDisplay = person.position.replace('ผู้อำนวยการสถานศึกษา', 'ผอ.สถานศึกษา');
                        const isExpanded = expandedId === person.id;

                        return (
                          <React.Fragment key={person.id}>
                            <tr
                              onClick={() => toggleExpand(person.id)}
                              className={`hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors cursor-pointer ${
                                isExpanded ? 'bg-slate-50/90 dark:bg-[#15202e]' : ''
                              }`}
                            >
                              {/* Sequence */}
                              <td className="w-14 px-3 py-3.5 text-center font-mono tabular-nums text-slate-400 dark:text-slate-500 text-xs whitespace-nowrap">
                                {seq}
                              </td>

                              {/* License Holder */}
                              <td className="px-4 py-3.5 whitespace-nowrap">
                                <div className="font-semibold text-slate-900 dark:text-white text-sm whitespace-nowrap" title={formatStaffName(person.name)}>
                                  {formatStaffName(person.name)}
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 whitespace-nowrap" title={person.position}>
                                  {posDisplay}
                                </div>
                              </td>

                              {/* Licenses Held */}
                              <td className="px-4 py-3.5 whitespace-nowrap">
                                {person.licensesCount > 0 ? (
                                  <div>
                                    <div className="text-slate-800 dark:text-slate-200 text-sm font-medium whitespace-nowrap">
                                      {person.licensesDisplay}
                                    </div>
                                    {person.licensesCount > 1 && (
                                      <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 whitespace-nowrap">
                                        {person.licensesCount} ฉบับ
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-slate-400 dark:text-slate-500 text-sm font-mono">-</span>
                                )}
                              </td>

                              {/* Nearest Expiry Date */}
                              <td className="px-4 py-3.5 font-mono text-slate-700 dark:text-slate-300 text-xs sm:text-sm whitespace-nowrap">
                                {person.nearestExpiryDate ? (
                                  formatThaiDateDisplay(person.nearestExpiryDate)
                                ) : (
                                  <span className="text-slate-400 dark:text-slate-500">-</span>
                                )}
                              </td>

                              {/* Days Remaining */}
                              <td className="px-4 py-3.5 font-mono font-bold text-center text-xs sm:text-sm whitespace-nowrap">
                                {person.minDaysRemaining !== null ? (
                                  <span
                                    className={
                                      person.minDaysRemaining <= 0
                                        ? 'text-rose-600 dark:text-rose-400'
                                        : person.minDaysRemaining <= 90
                                        ? 'text-amber-600 dark:text-amber-400'
                                        : 'text-emerald-600 dark:text-emerald-400'
                                    }
                                  >
                                    {person.minDaysRemaining.toLocaleString('en-US')} วัน
                                  </span>
                                ) : (
                                  <span className="text-slate-400 dark:text-slate-500 font-normal">-</span>
                                )}
                              </td>

                              {/* Status (Minimal & Clean Dot + Text) */}
                              <td className="px-4 py-3.5 text-center whitespace-nowrap">
                                {person.overallHealth === 'VALID' ? (
                                  <div className="inline-flex items-center justify-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400/90">ปกติ</span>
                                  </div>
                                ) : person.overallHealth === 'EXPIRING_SOON' ? (
                                  <div className="inline-flex items-center justify-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                                    <span className="text-xs font-medium text-amber-600 dark:text-amber-300">ใกล้หมดอายุ</span>
                                  </div>
                                ) : person.overallHealth === 'EXPIRED' ? (
                                  <div className="inline-flex items-center justify-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                                    <span className="text-xs font-medium text-rose-600 dark:text-rose-400">หมดอายุแล้ว</span>
                                  </div>
                                ) : (
                                  <div className="inline-flex items-center justify-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500 shrink-0" />
                                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">ยังไม่บันทึกข้อมูล</span>
                                  </div>
                                )}
                              </td>

                              {/* Expand Arrow */}
                              <td className="w-12 px-3 py-3.5 text-right">
                                <ChevronDown
                                  className={`w-4 h-4 ml-auto text-slate-400 transition-transform duration-200 ${
                                    isExpanded ? 'rotate-180 text-sky-500 dark:text-sky-400' : ''
                                  }`}
                                />
                              </td>
                            </tr>

                            {/* Expanded Detail Panel */}
                            {isExpanded && (
                              <tr className="bg-slate-50/90 dark:bg-white/[0.02] border-y border-slate-200/90 dark:border-slate-800/80">
                                <td colSpan={7} className="pl-14 pr-6 py-4">
                                  {person.licensesCount > 0 ? (
                                    <div className="space-y-3">
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                          ใบอนุญาตที่ถือครองทั้งหมด ({person.licensesCount} ฉบับ)
                                        </div>
                                        {canManage && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              openAddModal(person.id);
                                            }}
                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 dark:bg-sky-500/10 dark:hover:bg-sky-500/20 dark:text-sky-300 dark:border-sky-500/30 text-[11px] font-medium transition-colors cursor-pointer"
                                          >
                                            <PlusCircle className="w-3.5 h-3.5 shrink-0" />
                                            <span>เพิ่มใบอนุญาต</span>
                                          </button>
                                        )}
                                      </div>
                                      <div className="space-y-2">
                                        {person.licenses.map((lic, licIdx) => (
                                          <div
                                            key={`${lic.number}-${licIdx}`}
                                            className="p-3.5 rounded-xl bg-white dark:bg-[#121924] border border-slate-200/90 dark:border-slate-800/80 shadow-xs space-y-2"
                                          >
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                                              <div>
                                                <span className="text-xs font-semibold text-slate-900 dark:text-white">
                                                  {lic.type}
                                                </span>
                                                <span className="text-[11px] text-slate-400 dark:text-slate-500 ml-2 font-mono">
                                                  ({lic.number})
                                                </span>
                                              </div>
                                              <div className="flex items-center gap-2 shrink-0">
                                                <div className="flex items-center gap-1.5">
                                                  <span
                                                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                                      lic.health === 'VALID'
                                                        ? 'bg-emerald-400'
                                                        : lic.health === 'EXPIRING_SOON'
                                                        ? 'bg-amber-400'
                                                        : 'bg-rose-400'
                                                    }`}
                                                  />
                                                  <span
                                                    className={`text-[11px] font-medium ${
                                                      lic.health === 'VALID'
                                                        ? 'text-emerald-600 dark:text-emerald-400/90'
                                                        : lic.health === 'EXPIRING_SOON'
                                                        ? 'text-amber-600 dark:text-amber-300'
                                                        : 'text-rose-600 dark:text-rose-400'
                                                    }`}
                                                  >
                                                    {lic.health === 'VALID'
                                                      ? 'ปกติ'
                                                      : lic.health === 'EXPIRING_SOON'
                                                      ? 'ใกล้หมดอายุ'
                                                      : 'หมดอายุแล้ว'}
                                                  </span>
                                                </div>
                                                {canManage && (
                                                  <div className="inline-flex items-center gap-1 pl-2 border-l border-slate-200 dark:border-slate-800">
                                                    <button
                                                      type="button"
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        openEditModal(person.id, lic);
                                                      }}
                                                      title="แก้ไขใบอนุญาต"
                                                      className="p-1.5 rounded-md text-slate-500 hover:text-sky-600 hover:bg-sky-50 dark:text-slate-400 dark:hover:text-sky-400 dark:hover:bg-sky-500/10 transition-colors cursor-pointer"
                                                    >
                                                      <Pencil className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                      type="button"
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        requestDeleteLicense(person.id, person.name, lic);
                                                      }}
                                                      title="ลบใบอนุญาต"
                                                      className="p-1.5 rounded-md text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:text-slate-400 dark:hover:text-rose-400 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
                                                    >
                                                      <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                                              <div>
                                                <span className="text-[11px] text-slate-400 dark:text-slate-500 block">
                                                  วันออกใบอนุญาต
                                                </span>
                                                <span className="font-mono text-slate-700 dark:text-slate-300">
                                                  {formatThaiDateDisplay(lic.issueDate)}
                                                </span>
                                              </div>
                                              <div>
                                                <span className="text-[11px] text-slate-400 dark:text-slate-500 block">
                                                  วันหมดอายุ
                                                </span>
                                                <span className="font-mono text-slate-700 dark:text-slate-300">
                                                  {formatThaiDateDisplay(lic.expiryDate)}
                                                </span>
                                              </div>
                                              <div>
                                                <span className="text-[11px] text-slate-400 dark:text-slate-500 block">
                                                  วันคงเหลือ
                                                </span>
                                                <span
                                                  className={`font-mono font-semibold ${
                                                    lic.daysRemaining <= 0
                                                      ? 'text-rose-600 dark:text-rose-400'
                                                      : lic.daysRemaining <= 90
                                                      ? 'text-amber-600 dark:text-amber-400'
                                                      : 'text-emerald-600 dark:text-emerald-400'
                                                  }`}
                                                >
                                                  {lic.daysRemaining.toLocaleString('en-US')} วัน
                                                </span>
                                              </div>
                                              <div className="flex items-end justify-start sm:justify-end">
                                                <a
                                                  href="https://ksp-eservice.ksp.or.th/"
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  onClick={(e) => e.stopPropagation()}
                                                  className="inline-flex items-center gap-1 text-[11px] text-sky-600 dark:text-sky-400 hover:underline"
                                                >
                                                  <span>ตรวจสอบคุรุสภา</span>
                                                  <ExternalLink className="w-3 h-3" />
                                                </a>
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                                      <span>ยังไม่มีข้อมูลใบอนุญาตประกอบวิชาชีพในระบบ</span>
                                      {canManage && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            openAddModal(person.id);
                                          }}
                                          className="inline-flex items-center gap-1.5 text-sky-600 dark:text-sky-400 hover:underline font-medium cursor-pointer"
                                        >
                                          <PlusCircle className="w-3.5 h-3.5 shrink-0" />
                                          <span>เพิ่มใบอนุญาตให้บุคลากรนี้</span>
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </React.Fragment>
                  ));
                })()
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit License Modal (Admin Only) */}
      {isModalOpen && canManage && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="license-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs"
          onClick={() => !isSaving && setIsModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-[#141d27] border border-slate-200/90 dark:border-slate-700 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden text-slate-800 dark:text-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200/90 dark:border-slate-800 bg-slate-50 dark:bg-[#111923]">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-sky-500 dark:text-sky-400 shrink-0" />
                <h3 id="license-modal-title" className="font-bold text-sm text-slate-900 dark:text-white">
                  {editingContext ? 'แก้ไขข้อมูลใบอนุญาตประกอบวิชาชีพ' : 'เพิ่มข้อมูลใบอนุญาตประกอบวิชาชีพ'}
                </h3>
              </div>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => setIsModalOpen(false)}
                aria-label="ปิดหน้าต่าง"
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveLicense} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  บุคลากรผู้ถือใบอนุญาต <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  disabled={Boolean(editingContext)}
                  value={formTeacherId}
                  onChange={(e) => setFormTeacherId(e.target.value)}
                  className="w-full h-10 bg-slate-50 dark:bg-[#0e141c] disabled:opacity-65 border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500 cursor-pointer disabled:cursor-not-allowed"
                >
                  <option value="">-- เลือกบุคลากร --</option>
                  {sortedStaffOptions.map((t) => (
                    <option key={t.id} value={t.id}>
                      {formatStaffName(t)} ({t.position})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  ประเภทใบอนุญาตประกอบวิชาชีพ <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formTypeSelect}
                  onChange={(e) => setFormTypeSelect(e.target.value)}
                  className="w-full h-10 bg-slate-50 dark:bg-[#0e141c] border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500 cursor-pointer"
                >
                  {LICENSE_TYPE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                  <option value={CUSTOM_LICENSE_VALUE}>อื่นๆ (ระบุเอง)...</option>
                </select>
                {formTypeSelect === CUSTOM_LICENSE_VALUE && (
                  <input
                    type="text"
                    required
                    value={formCustomType}
                    onChange={(e) => setFormCustomType(e.target.value)}
                    placeholder="ระบุชื่อประเภทใบอนุญาต..."
                    className="mt-2 w-full h-10 bg-slate-50 dark:bg-[#0e141c] border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                )}
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  เลขที่ใบอนุญาต <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formNumber}
                  onChange={(e) => setFormNumber(e.target.value)}
                  placeholder="เช่น 65109000123456"
                  className="w-full h-10 bg-slate-50 dark:bg-[#0e141c] border border-slate-200 dark:border-slate-700 rounded-xl px-3 font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    วันออกใบอนุญาต
                  </label>
                  <ThaiDatePicker
                    value={formIssueDate}
                    onChange={setFormIssueDate}
                    placeholder="เลือกวันออกใบอนุญาต"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    วันหมดอายุ <span className="text-rose-500">*</span>
                  </label>
                  <ThaiDatePicker
                    value={formExpiryDate}
                    onChange={setFormExpiryDate}
                    placeholder="เลือกวันหมดอายุ"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200/90 dark:border-slate-800">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 text-xs font-medium cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? 'กำลังบันทึก...' : editingContext ? 'บันทึกการแก้ไข' : 'บันทึกข้อมูล'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* In-App Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deletingTarget) && canManage}
        title="ยืนยันการลบใบอนุญาตประกอบวิชาชีพ"
        description={
          deletingTarget
            ? `ต้องการลบ "${deletingTarget.licenseType}" (เลขที่ ${deletingTarget.licenseNumber}) ของ ${formatStaffName(deletingTarget.teacherName)} ออกจากทะเบียนใช่หรือไม่?`
            : ''
        }
        confirmLabel="ยืนยันการลบ"
        variant="danger"
        isLoading={isSaving}
        onConfirm={handleConfirmDelete}
        onCancel={() => !isSaving && setDeletingTarget(null)}
      />
    </div>
  );
};
