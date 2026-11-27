'use client';

/**
 * ============================================================================
 * ManStat: View Academic Standings (ทะเบียนวิทยฐานะและการเลื่อนวิทยฐานะ)
 * ============================================================================
 * - Academic Standing Tiers: ชำนาญการ, ชำนาญการพิเศษ, เชี่ยวชาญ, เชี่ยวชาญพิเศษ
 * - Dual Views: Spacious Table View (Default) & Responsive Cards
 * - Promotion Orders and Effective Dates
 * - 3-Branch Hierarchy: สายบริหาร -> สายการสอน
 * - Admin-only inline Add / Edit / Delete CRUD backed by /api/admin/staff
 * - Portal ThaiDatePicker for effectiveDate, ConfirmModal for delete
 * - Zero emojis, pure Lucide SVG icons with strict 8px gap.
 * ============================================================================
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Award,
  Calendar,
  Medal,
  LayoutList,
  LayoutGrid,
  FileText,
  ChevronDown,
  Search,
  Loader2,
  PlusCircle,
  Pencil,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { type TeacherRecord } from '@/lib/data/schoolData';
import { ThaiDatePicker, formatThaiDateDisplay } from '@/components/ui/ThaiDatePicker';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { groupAndSortTeachers } from '@/lib/regulations/staff-sorting';
import {
  formatStaffName,
  formatOfficialPosition,
  formatShortStanding,
} from '@/lib/regulations/staff-formatting';
import { isCivilServantForSalary, isAdminRole } from '@/lib/auth/roles';
import { useUserSettings } from '@/context/UserSettingsContext';

const STANDING_LEVEL_OPTIONS = [
  'ชำนาญการ',
  'ชำนาญการพิเศษ',
  'เชี่ยวชาญ',
  'เชี่ยวชาญพิเศษ',
];

type StandingOrderItem = NonNullable<TeacherRecord['standings']>[number];

function sortStandingsDesc(standings?: TeacherRecord['standings']) {
  if (!standings || standings.length === 0) return [];
  return [...standings].sort((a, b) =>
    String(b.effectiveDate || '').localeCompare(String(a.effectiveDate || ''))
  );
}

function findMatchingStandingIndex(
  rawStandings: StandingOrderItem[],
  target: StandingOrderItem
): number {
  const exactIdx = rawStandings.findIndex(
    (s) =>
      (s.level || '') === (target.level || '') &&
      (s.orderNumber || '') === (target.orderNumber || '') &&
      (s.effectiveDate || '') === (target.effectiveDate || '')
  );
  if (exactIdx >= 0) return exactIdx;
  return rawStandings.findIndex(
    (s) => (s.orderNumber || '') === (target.orderNumber || '') && (s.level || '') === (target.level || '')
  );
}

export const ViewRegStanding: React.FC = () => {
  const { preferences, updatePreferences } = useUserSettings();
  const viewMode = preferences.preferred_view;
  const setViewMode = (mode: 'table' | 'grid') => updatePreferences({ preferred_view: mode });

  const [teachersList, setTeachersList] = useState<TeacherRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [currentRole, setCurrentRole] = useState<string>('teacher');

  // Admin CRUD state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingContext, setEditingContext] = useState<{
    teacherId: string;
    standingIndex: number;
  } | null>(null);
  const [formTeacherId, setFormTeacherId] = useState<string>('');
  const [formLevel, setFormLevel] = useState<string>(STANDING_LEVEL_OPTIONS[0]);
  const [formOrderNumber, setFormOrderNumber] = useState<string>('');
  const [formEffectiveDate, setFormEffectiveDate] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const [deletingTarget, setDeletingTarget] = useState<{
    teacherId: string;
    teacherName: string;
    standingIndex: number;
    level: string;
    orderNumber: string;
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

  // Filter strictly by civil servants (Khurusapha & Civil Service Standards)
  const civilServants = useMemo(() => {
    return teachersList.filter((t) => isCivilServantForSalary(t));
  }, [teachersList]);

  const sortedCivilServantsAll = useMemo(() => {
    return groupAndSortTeachers(civilServants)
      .filter((g) => g.category !== 'support')
      .flatMap((g) => g.members);
  }, [civilServants]);

  const filteredCivilServants = useMemo(() => {
    if (!searchQuery.trim()) return civilServants;
    const q = searchQuery.toLowerCase().trim();
    return civilServants.filter((t) => {
      const officialPos = formatOfficialPosition(t).toLowerCase();
      const shortStanding = formatShortStanding(t.academicStanding).toLowerCase();
      return (
        formatStaffName(t).toLowerCase().includes(q) ||
        (t.employeeCode || '').toLowerCase().includes(q) ||
        officialPos.includes(q) ||
        shortStanding.includes(q) ||
        (t.academicStanding || '').toLowerCase().includes(q) ||
        (t.position || '').toLowerCase().includes(q)
      );
    });
  }, [civilServants, searchQuery]);

  const groupedTeachers = useMemo(() => {
    return groupAndSortTeachers(filteredCivilServants).filter((g) => g.category !== 'support');
  }, [filteredCivilServants]);

  const sortedTeachers = useMemo(() => {
    return groupedTeachers.flatMap((g) => g.members);
  }, [groupedTeachers]);

  const openAddModal = (preselectTeacherId?: string) => {
    setEditingContext(null);
    setFormTeacherId(preselectTeacherId || sortedCivilServantsAll[0]?.id || '');
    setFormLevel(STANDING_LEVEL_OPTIONS[0]);
    setFormOrderNumber('');
    setFormEffectiveDate('');
    setIsModalOpen(true);
  };

  const openEditModal = (teacherId: string, order: StandingOrderItem) => {
    const teacher = teachersList.find((t) => t.id === teacherId);
    if (!teacher) return;
    const rawStandings = Array.isArray(teacher.standings) ? teacher.standings : [];
    const idx = findMatchingStandingIndex(rawStandings, order);
    if (idx < 0) return;

    const current = rawStandings[idx];
    const normalizedLevel = formatShortStanding(current.level);
    setEditingContext({ teacherId, standingIndex: idx });
    setFormTeacherId(teacherId);
    setFormLevel(
      STANDING_LEVEL_OPTIONS.includes(normalizedLevel)
        ? normalizedLevel
        : current.level || STANDING_LEVEL_OPTIONS[0]
    );
    setFormOrderNumber(current.orderNumber || '');
    setFormEffectiveDate(current.effectiveDate || '');
    setIsModalOpen(true);
  };

  const persistTeacherStandings = async (
    teacher: TeacherRecord,
    nextStandings: StandingOrderItem[]
  ): Promise<boolean> => {
    const sortedNext = sortStandingsDesc(nextStandings);
    const nextAcademicStanding = sortedNext.length > 0 ? sortedNext[0].level : '-';
    const payload: TeacherRecord = {
      ...teacher,
      standings: sortedNext,
      academicStanding: nextAcademicStanding,
    };

    const res = await fetch('/api/admin/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'ไม่สามารถบันทึกข้อมูลวิทยฐานะได้');
    }
    const savedTeacher: TeacherRecord = data.data || payload;
    setTeachersList((prev) =>
      prev.map((t) => (t.id === savedTeacher.id ? savedTeacher : t))
    );
    return true;
  };

  const handleSaveStanding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;

    const targetTeacher = teachersList.find((t) => t.id === formTeacherId);
    if (!targetTeacher) {
      showNotice('error', 'กรุณาเลือกข้าราชการครู / ผู้บริหาร');
      return;
    }
    if (!formLevel.trim()) {
      showNotice('error', 'กรุณาเลือกระดับวิทยฐานะ');
      return;
    }
    if (!formOrderNumber.trim()) {
      showNotice('error', 'กรุณาระบุเลขที่คำสั่งแต่งตั้ง');
      return;
    }
    if (!formEffectiveDate) {
      showNotice('error', 'กรุณาเลือกวันที่มีผลตามคำสั่ง');
      return;
    }

    const nextOrder: StandingOrderItem = {
      level: formLevel.trim(),
      orderNumber: formOrderNumber.trim(),
      effectiveDate: formEffectiveDate,
    };

    const currentStandings = Array.isArray(targetTeacher.standings) ? [...targetTeacher.standings] : [];
    if (editingContext && editingContext.teacherId === targetTeacher.id) {
      currentStandings[editingContext.standingIndex] = nextOrder;
    } else {
      currentStandings.push(nextOrder);
    }

    setIsSaving(true);
    try {
      await persistTeacherStandings(targetTeacher, currentStandings);
      setIsModalOpen(false);
      setExpandedId(targetTeacher.id);
      showNotice(
        'success',
        editingContext ? 'อัปเดตคำสั่งวิทยฐานะเรียบร้อยแล้ว' : 'เพิ่มคำสั่งวิทยฐานะเรียบร้อยแล้ว'
      );
    } catch (err) {
      showNotice('error', err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setIsSaving(false);
    }
  };

  const requestDeleteStanding = (teacher: TeacherRecord, order: StandingOrderItem) => {
    const rawStandings = Array.isArray(teacher.standings) ? teacher.standings : [];
    const idx = findMatchingStandingIndex(rawStandings, order);
    if (idx < 0) return;

    setDeletingTarget({
      teacherId: teacher.id,
      teacherName: formatStaffName(teacher),
      standingIndex: idx,
      level: formatShortStanding(order.level),
      orderNumber: order.orderNumber,
    });
  };

  const handleConfirmDelete = async () => {
    if (!deletingTarget || !canManage) return;
    const targetTeacher = teachersList.find((t) => t.id === deletingTarget.teacherId);
    if (!targetTeacher) {
      setDeletingTarget(null);
      return;
    }

    const currentStandings = Array.isArray(targetTeacher.standings) ? [...targetTeacher.standings] : [];
    currentStandings.splice(deletingTarget.standingIndex, 1);

    setIsSaving(true);
    try {
      await persistTeacherStandings(targetTeacher, currentStandings);
      setDeletingTarget(null);
      showNotice('success', 'ลบคำสั่งวิทยฐานะเรียบร้อยแล้ว');
    } catch (err) {
      showNotice('error', err instanceof Error ? err.message : 'ไม่สามารถลบข้อมูลได้');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-white dark:bg-[#141b24] p-5 sm:p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-colors duration-200">
        <div className="flex items-center gap-2.5">
          <Medal className="w-5 h-5 text-amber-500 dark:text-amber-400 shrink-0" />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                ทะเบียนวิทยฐานะ
              </h2>
              <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                เฉพาะข้าราชการครู {civilServants.length} ท่าน
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              ทะเบียนวิทยฐานะและการแต่งตั้งให้มีหรือเลื่อนวิทยฐานะตามมาตรฐานตำแหน่ง ก.ค.ศ.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อ, รหัส, วิทยฐานะ..."
              className="w-full h-9 bg-slate-50 dark:bg-[#101822] border border-slate-200/90 dark:border-slate-700/80 rounded-lg pl-8 pr-3 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          {canManage && (
            <button
              type="button"
              onClick={() => openAddModal()}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer shadow-sm"
            >
              <PlusCircle className="w-3.5 h-3.5 shrink-0" />
              <span>เพิ่มวิทยฐานะ</span>
            </button>
          )}

          <div className="inline-flex p-1 bg-slate-100 dark:bg-[#101822] border border-slate-200/90 dark:border-slate-800/80 rounded-lg">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors duration-200 ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/30'
              }`}
            >
              <LayoutList className="w-4 h-4 shrink-0" />
              <span>ตาราง</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors duration-200 ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/30'
              }`}
            >
              <LayoutGrid className="w-4 h-4 shrink-0" />
              <span>การ์ด</span>
            </button>
          </div>
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

      {/* Main View: Table View */}
      {viewMode === 'table' ? (
        <div className="bg-white dark:bg-[#111823] rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm dark:shadow-xl overflow-hidden transition-colors duration-200">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-sm text-slate-700 dark:text-slate-200">
              <thead className="bg-slate-100/80 dark:bg-[#16202d] text-xs uppercase text-slate-500 dark:text-slate-400 tracking-wider font-semibold border-b border-slate-200/90 dark:border-slate-800">
                <tr>
                  <th scope="col" className="w-14 px-3 py-3.5 text-center">ลำดับ</th>
                  <th scope="col" className="w-[32%] px-4 py-3.5">ชื่อ - สกุล</th>
                  <th scope="col" className="w-[28%] px-4 py-3.5">ตำแหน่ง</th>
                  <th scope="col" className="w-[26%] px-4 py-3.5 text-center">วิทยฐานะปัจจุบัน</th>
                  <th scope="col" className="w-12 px-3 py-3.5 text-right">
                    <span className="sr-only">ขยายรายละเอียด</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 font-sans">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-slate-500 dark:text-slate-400">
                      <div className="inline-flex items-center gap-2 text-xs">
                        <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                        <span>กำลังโหลดทะเบียนวิทยฐานะ...</span>
                      </div>
                    </td>
                  </tr>
                ) : sortedTeachers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                      {searchQuery.trim() ? 'ไม่พบข้อมูลวิทยฐานะที่ตรงกับคำค้นหา' : 'ยังไม่มีข้อมูลทะเบียนวิทยฐานะ'}
                    </td>
                  </tr>
                ) : (
                  (() => {
                    let runningSeq = 0;
                    return groupedTeachers.map((group) => {
                    return (
                      <React.Fragment key={group.category}>
                        {/* Group Header */}
                        <tr className="bg-slate-50/75 dark:bg-[#15202e] border-y border-slate-200/80 dark:border-slate-800">
                          <td colSpan={5} className="px-4 py-2 font-semibold text-xs text-slate-700 dark:text-slate-300">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full shrink-0 bg-sky-400" />
                              <span>{group.title}</span>
                            </div>
                          </td>
                        </tr>

                        {group.members.map((teacher) => {
                          runningSeq++;
                          const seq = runningSeq;
                          const posDisplay = formatOfficialPosition(teacher);
                          const standingDisplay = formatShortStanding(teacher.academicStanding);
                          const hasStanding = standingDisplay !== 'ไม่มีวิทยฐานะ';
                          const orderedStandings = sortStandingsDesc(teacher.standings);
                          const latestOrder = orderedStandings[0];
                          const deptDisplay = (teacher.department || '-').replace('สายงานบริหารและสนับสนุนการศึกษา', 'บริหารและสนับสนุนฯ');
                          const isExpanded = expandedId === teacher.id;

                          return (
                            <React.Fragment key={teacher.id}>
                              <tr
                                onClick={() => toggleExpand(teacher.id)}
                                className={`hover:bg-slate-50 dark:hover:bg-[#182536]/60 transition-colors cursor-pointer ${
                                  isExpanded ? 'bg-slate-50/90 dark:bg-[#15202e]' : ''
                                }`}
                              >
                                {/* Sequence */}
                                <td className="w-14 px-3 py-3.5 text-center font-mono tabular-nums text-slate-400 dark:text-slate-500 text-xs whitespace-nowrap">
                                  {seq}
                                </td>

                                {/* Full Name */}
                                <td className="px-4 py-3.5 whitespace-nowrap">
                                  <div className="font-semibold text-slate-900 dark:text-white text-sm whitespace-nowrap" title={formatStaffName(teacher)}>
                                    {formatStaffName(teacher)}
                                  </div>
                                  <div className="text-xs text-slate-400 font-mono mt-0.5 whitespace-nowrap">
                                    {teacher.employeeCode}
                                  </div>
                                </td>

                                {/* Position */}
                                <td className="px-4 py-3.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                  <div title={posDisplay} className="whitespace-nowrap">{posDisplay}</div>
                                </td>

                                {/* Standing (Clean text + subtle rank dot; muted text without dot when none) */}
                                <td className="px-4 py-3.5 text-center whitespace-nowrap">
                                  {hasStanding ? (
                                    <div className="inline-flex items-center gap-1.5">
                                      <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                                      <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                                        {standingDisplay}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-slate-400 dark:text-slate-500">
                                      ไม่มีวิทยฐานะ
                                    </span>
                                  )}
                                </td>

                                {/* Expand Arrow */}
                                <td className="w-12 px-3 py-3.5 text-right">
                                  <ChevronDown
                                    className={`w-4 h-4 ml-auto text-slate-400 transition-transform duration-200 ${
                                      isExpanded ? 'rotate-180 text-amber-500 dark:text-amber-400' : ''
                                    }`}
                                  />
                                </td>
                              </tr>

                              {/* Expanded Detail Panel */}
                              {isExpanded && (
                                <tr className="bg-slate-50/90 dark:bg-[#0b1016]/90 border-y border-slate-200/90 dark:border-slate-800/80">
                                  <td colSpan={5} className="pl-14 pr-6 py-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                                      <div>
                                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-1 font-medium">กลุ่มสาระการเรียนรู้ / ฝ่าย</div>
                                        <div className="text-slate-800 dark:text-slate-200 font-medium">{deptDisplay}</div>
                                      </div>

                                      <div>
                                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-1 font-medium">วันบรรจุรับราชการ</div>
                                        <div className="font-mono text-slate-700 dark:text-slate-300">{formatThaiDateDisplay(teacher.startDate)}</div>
                                      </div>

                                      <div>
                                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-1 font-medium">เลขที่คำสั่งแต่งตั้งล่าสุด</div>
                                        <div className="font-mono text-amber-600 dark:text-amber-400 font-medium">
                                          {latestOrder ? latestOrder.orderNumber : '-'}
                                        </div>
                                      </div>

                                      <div>
                                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-1 font-medium">วันที่มีผลตามคำสั่ง</div>
                                        <div className="font-mono text-sky-600 dark:text-sky-400">
                                          {latestOrder ? formatThaiDateDisplay(latestOrder.effectiveDate) : '-'}
                                        </div>
                                      </div>
                                    </div>

                                    <div className="mt-3 pt-3 border-t border-slate-200/90 dark:border-slate-800/60 text-xs space-y-2">
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                                          ประวัติคำสั่งแต่งตั้งวิทยฐานะ ({orderedStandings.length} รายการ)
                                        </div>
                                        {canManage && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              openAddModal(teacher.id);
                                            }}
                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 dark:bg-sky-500/10 dark:hover:bg-sky-500/20 dark:text-sky-300 dark:border-sky-500/30 text-[11px] font-medium transition-colors cursor-pointer"
                                          >
                                            <PlusCircle className="w-3.5 h-3.5 shrink-0" />
                                            <span>เพิ่มคำสั่งวิทยฐานะ</span>
                                          </button>
                                        )}
                                      </div>

                                      {orderedStandings.length > 0 ? (
                                        <div className="space-y-1.5">
                                          {orderedStandings.map((ord, oIdx) => (
                                            <div
                                              key={`${ord.orderNumber}-${ord.effectiveDate}-${oIdx}`}
                                              className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white dark:bg-[#121924] border border-slate-200/90 dark:border-slate-800"
                                            >
                                              <div className="inline-flex items-center gap-2 text-xs text-slate-700 dark:text-slate-200">
                                                <FileText className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
                                                <span className="font-semibold">{formatShortStanding(ord.level)}</span>
                                                <span className="text-slate-400 dark:text-slate-500">·</span>
                                                <span className="font-mono">{ord.orderNumber}</span>
                                                <span className="text-slate-400 dark:text-slate-500">·</span>
                                                <span className="font-mono text-slate-500 dark:text-slate-400">
                                                  มีผล {formatThaiDateDisplay(ord.effectiveDate)}
                                                </span>
                                              </div>
                                              {canManage && (
                                                <div className="inline-flex items-center gap-1">
                                                  <button
                                                    type="button"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      openEditModal(teacher.id, ord);
                                                    }}
                                                    title="แก้ไขคำสั่งวิทยฐานะ"
                                                    className="p-1.5 rounded-md text-slate-500 hover:text-sky-600 hover:bg-sky-50 dark:text-slate-400 dark:hover:text-sky-400 dark:hover:bg-sky-500/10 transition-colors cursor-pointer"
                                                  >
                                                    <Pencil className="w-3.5 h-3.5" />
                                                  </button>
                                                  <button
                                                    type="button"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      requestDeleteStanding(teacher, ord);
                                                    }}
                                                    title="ลบคำสั่งวิทยฐานะ"
                                                    className="p-1.5 rounded-md text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:text-slate-400 dark:hover:text-rose-400 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
                                                  >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                  </button>
                                                </div>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <p className="text-[11px] text-slate-400 dark:text-slate-500">
                                          ยังไม่มีบันทึกคำสั่งแต่งตั้งวิทยฐานะ
                                        </p>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </React.Fragment>
                    );
                  });
                })()
              )}
              </tbody>
            </table>
          </div>
        </div>
      ) : isLoading ? (
        <div className="bg-white dark:bg-[#111823] p-12 rounded-2xl border border-slate-200/90 dark:border-slate-800 text-center text-slate-500 dark:text-slate-400">
          <div className="inline-flex items-center gap-2 text-xs">
            <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
            <span>กำลังโหลดทะเบียนวิทยฐานะ...</span>
          </div>
        </div>
      ) : sortedTeachers.length === 0 ? (
        <div className="bg-white dark:bg-[#111823] p-12 rounded-2xl border border-slate-200/90 dark:border-slate-800 text-center text-slate-500">
          {searchQuery.trim() ? 'ไม่พบข้อมูลวิทยฐานะที่ตรงกับคำค้นหา' : 'ยังไม่มีข้อมูลทะเบียนวิทยฐานะ'}
        </div>
      ) : (
        /* Grid of Standings */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedTeachers.map((teacher) => {
            const posDisplay = formatOfficialPosition(teacher);
            const standingDisplay = formatShortStanding(teacher.academicStanding);
            const hasStanding = standingDisplay !== 'ไม่มีวิทยฐานะ';
            const latestOrder = sortStandingsDesc(teacher.standings)[0];

            return (
              <div
                key={teacher.id}
                className="bg-white dark:bg-[#111823]/90 p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 hover:border-amber-500/40 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    {hasStanding ? (
                      <div className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100">
                        <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                        <span>{standingDisplay}</span>
                      </div>
                    ) : (
                      <span className="text-xs sm:text-sm text-slate-400 dark:text-slate-500">
                        ไม่มีวิทยฐานะ
                      </span>
                    )}
                    <Award
                      className={`w-4 h-4 shrink-0 ${
                        hasStanding
                          ? 'text-amber-500 dark:text-amber-400'
                          : 'text-slate-300 dark:text-slate-600'
                      }`}
                    />
                  </div>

                  <div className="text-base font-bold text-slate-900 dark:text-white mb-0.5">{formatStaffName(teacher)}</div>
                  <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">{posDisplay}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-3">{teacher.department}</div>

                  <div className="space-y-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 pt-3 border-t border-slate-200/90 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>วันบรรจุ: <strong className="text-slate-800 dark:text-slate-200">{formatThaiDateDisplay(teacher.startDate)}</strong></span>
                    </div>
                    {latestOrder && (
                      <div className="mt-2 bg-slate-50 dark:bg-[#101822] p-3 rounded-xl border border-slate-200/90 dark:border-slate-800 space-y-1.5 text-xs">
                        <span className="text-amber-700 dark:text-amber-300 font-semibold block">คำสั่งแต่งตั้งล่าสุด:</span>
                        <div className="text-slate-800 dark:text-slate-200 font-mono">คำสั่งเลขที่: {latestOrder.orderNumber}</div>
                        <div className="text-slate-500 dark:text-slate-400">มีผลตั้งแต่วันที่: {formatThaiDateDisplay(latestOrder.effectiveDate)}</div>
                      </div>
                    )}
                  </div>
                </div>

                {canManage && (
                  <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => openAddModal(teacher.id)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 text-xs font-medium transition-colors cursor-pointer"
                    >
                      <PlusCircle className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                      <span>เพิ่มคำสั่ง</span>
                    </button>
                    {latestOrder && (
                      <>
                        <button
                          type="button"
                          onClick={() => openEditModal(teacher.id, latestOrder)}
                          title="แก้ไขคำสั่งล่าสุด"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-sky-600 hover:bg-sky-50 dark:text-slate-400 dark:hover:text-sky-400 dark:hover:bg-sky-500/10 transition-colors cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => requestDeleteStanding(teacher, latestOrder)}
                          title="ลบคำสั่งล่าสุด"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:text-slate-400 dark:hover:text-rose-400 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Standing Order Modal (Admin Only) */}
      {isModalOpen && canManage && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="standing-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs"
          onClick={() => !isSaving && setIsModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-[#141d27] border border-slate-200/90 dark:border-slate-700 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden text-slate-800 dark:text-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200/90 dark:border-slate-800 bg-slate-50 dark:bg-[#111923]">
              <div className="flex items-center gap-2">
                <Medal className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
                <h3 id="standing-modal-title" className="font-bold text-sm text-slate-900 dark:text-white">
                  {editingContext ? 'แก้ไขคำสั่งแต่งตั้งวิทยฐานะ' : 'เพิ่มคำสั่งแต่งตั้งวิทยฐานะ'}
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

            <form onSubmit={handleSaveStanding} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  ข้าราชการครู / ผู้บริหารสถานศึกษา <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  disabled={Boolean(editingContext)}
                  value={formTeacherId}
                  onChange={(e) => setFormTeacherId(e.target.value)}
                  className="w-full h-10 bg-slate-50 dark:bg-[#0e141c] disabled:opacity-65 border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500 cursor-pointer disabled:cursor-not-allowed"
                >
                  <option value="">-- เลือกข้าราชการ --</option>
                  {sortedCivilServantsAll.map((t) => (
                    <option key={t.id} value={t.id}>
                      {formatStaffName(t)} ({formatOfficialPosition(t)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  ระดับวิทยฐานะ (มาตรฐาน ก.ค.ศ.) <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={formLevel}
                  onChange={(e) => setFormLevel(e.target.value)}
                  className="w-full h-10 bg-slate-50 dark:bg-[#0e141c] border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500 cursor-pointer"
                >
                  {STANDING_LEVEL_OPTIONS.map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {lvl}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    เลขที่คำสั่งแต่งตั้ง <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formOrderNumber}
                    onChange={(e) => setFormOrderNumber(e.target.value)}
                    placeholder="เช่น คำสั่งที่ 123/2567"
                    className="w-full h-10 bg-slate-50 dark:bg-[#0e141c] border border-slate-200 dark:border-slate-700 rounded-xl px-3 font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    วันที่มีผลตามคำสั่ง <span className="text-rose-500">*</span>
                  </label>
                  <ThaiDatePicker
                    value={formEffectiveDate}
                    onChange={setFormEffectiveDate}
                    placeholder="เลือกวันที่มีผลตามคำสั่ง"
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
        title="ยืนยันการลบคำสั่งวิทยฐานะ"
        description={
          deletingTarget
            ? `ต้องการลบคำสั่งวิทยฐานะ "${deletingTarget.level}" (เลขที่ ${deletingTarget.orderNumber}) ของ ${deletingTarget.teacherName} ใช่หรือไม่? ระบบจะปรับวิทยฐานะปัจจุบันให้ตรงกับคำสั่งล่าสุดที่เหลือโดยอัตโนมัติ`
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
