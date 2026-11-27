'use client';

/**
 * ============================================================================
 * ManStat: ViewRegScout (ทะเบียนวุฒิทางการลูกเสือ)
 * ============================================================================
 * - Registry of National Scout Organization of Thailand leader qualifications
 * - Wood Badge (W.B. 2-4 Beads), B.T.C., A.T.C. courses
 * - Dual View: Spacious Table View (Default) & Responsive Cards
 * - Search by teacher name, filter by scout level & category
 * - Appointment orders and certificate numbers
 * - Zero Emojis, Pure Lucide SVG Icons, 8px Standard Spacing
 * ============================================================================
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Award,
  Search,
  LayoutList,
  LayoutGrid,
  ChevronDown,
  Compass,
  PlusCircle,
  Pencil,
  Trash2,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { ScoutRecord, TeacherRecord } from '@/lib/data/schoolData';
import { formatStaffName } from '@/lib/regulations/staff-formatting';
import { sortTeachersByBranch } from '@/lib/regulations/staff-sorting';
import { isAdminRole } from '@/lib/auth/roles';
import { ThaiDatePicker } from '@/components/ui/ThaiDatePicker';

function formatScoutDate(dateStr?: string | null): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('th-TH-u-nu-latn', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

const SCOUT_BADGE_LEVELS = [
  'วูดแบดจ์ 4 ท่อน (L.T.)',
  'วูดแบดจ์ 3 ท่อน (A.L.T.)',
  'วูดแบดจ์ 2 ท่อน (W.B.)',
  'ขั้นความรู้ชั้นสูง (A.T.C.)',
  'ขั้นความรู้เบื้องต้น (B.T.C.)',
];

const SCOUT_CATEGORIES = [
  'ลูกเสือสามัญ',
  'ลูกเสือสามัญรุ่นใหญ่',
  'ลูกเสือสำรอง',
  'ลูกเสือวิสามัญ',
  'เนตรนารี',
  'ผู้บังคับบัญชาลูกเสือ',
];

export function ViewRegScout() {
  const [scouts, setScouts] = useState<ScoutRecord[]>([]);
  const [teachers, setTeachers] = useState<TeacherRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentRole, setCurrentRole] = useState<string>('teacher');
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // CRUD Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingScoutId, setEditingScoutId] = useState<string | null>(null);
  const [deletingScout, setDeletingScout] = useState<ScoutRecord | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formTeacherId, setFormTeacherId] = useState('');
  const [formQualification, setFormQualification] = useState('');
  const [formBadgeLevel, setFormBadgeLevel] = useState(SCOUT_BADGE_LEVELS[2]);
  const [formCategory, setFormCategory] = useState(SCOUT_CATEGORIES[0]);
  const [formCertificateNo, setFormCertificateNo] = useState('');
  const [formOrderNumber, setFormOrderNumber] = useState('');
  const [formIssueDate, setFormIssueDate] = useState('');
  const [formIssuedBy, setFormIssuedBy] = useState('สำนักงานลูกเสือแห่งชาติ');

  const canManage = isAdminRole(currentRole);

  const showNotice = (type: 'success' | 'error', text: string) => {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 3500);
  };

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
      fetch('/api/admin/scout', { cache: 'no-store' })
        .then((res) => res.json())
        .then((data) => {
          if (isMounted && data.success && Array.isArray(data.data)) {
            setScouts(data.data);
          }
        })
        .catch(() => {}),
      fetch('/api/admin/staff', { cache: 'no-store' })
        .then((res) => res.json())
        .then((data) => {
          if (isMounted && data.success && Array.isArray(data.data)) {
            const list: TeacherRecord[] = data.data;
            setTeachers(list);
            if (typeof window !== 'undefined') {
              const staffParam = new URLSearchParams(window.location.search).get('staff');
              if (staffParam) {
                const matched = list.find(
                  (t) => t.id === staffParam || t.employeeCode === staffParam
                );
                if (matched) {
                  setSearchQuery(formatStaffName(matched));
                }
              }
            }
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

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const sortedTeachers = useMemo(() => sortTeachersByBranch(teachers), [teachers]);

  // Rank map from branch hierarchy (สายบริหาร -> สายการสอน -> สายสนับสนุน)
  const teacherOrderMap = useMemo(() => {
    const map = new Map<string, number>();
    sortedTeachers.forEach((t, idx) => {
      map.set(t.id, idx);
      if (t.employeeCode) map.set(t.employeeCode, idx);
      if (t.name) map.set(formatStaffName(t.name), idx);
    });
    return map;
  }, [sortedTeachers]);

  const levels = useMemo(
    () => Array.from(new Set(scouts.map((s) => s.badgeLevel).filter(Boolean))),
    [scouts]
  );

  const filteredScouts = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return [...scouts]
      .filter((s) => {
        const matchesSearch =
          (s.teacherName || '').toLowerCase().includes(q) ||
          (s.qualification || '').toLowerCase().includes(q) ||
          (s.certificateNo || '').toLowerCase().includes(q);
        const matchesLevel = levelFilter === 'ALL' || s.badgeLevel === levelFilter;
        return matchesSearch && matchesLevel;
      })
      .sort((a, b) => {
        const rankA =
          teacherOrderMap.get(a.teacherId) ??
          teacherOrderMap.get(formatStaffName(a.teacherName || '')) ??
          999;
        const rankB =
          teacherOrderMap.get(b.teacherId) ??
          teacherOrderMap.get(formatStaffName(b.teacherName || '')) ??
          999;
        if (rankA !== rankB) return rankA - rankB;
        return (a.teacherName || '').localeCompare(b.teacherName || '', 'th');
      });
  }, [scouts, searchQuery, levelFilter, teacherOrderMap]);

  const handleOpenCreateModal = () => {
    if (!canManage) return;
    setEditingScoutId(null);
    setFormTeacherId(sortedTeachers[0]?.id || '');
    setFormQualification('');
    setFormBadgeLevel(SCOUT_BADGE_LEVELS[2]);
    setFormCategory(SCOUT_CATEGORIES[0]);
    setFormCertificateNo('');
    setFormOrderNumber('');
    setFormIssueDate('');
    setFormIssuedBy('สำนักงานลูกเสือแห่งชาติ');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (record: ScoutRecord) => {
    if (!canManage) return;
    setEditingScoutId(record.id);
    setFormTeacherId(record.teacherId || '');
    setFormQualification(record.qualification || '');
    setFormBadgeLevel(record.badgeLevel || SCOUT_BADGE_LEVELS[2]);
    setFormCategory(record.category || SCOUT_CATEGORIES[0]);
    setFormCertificateNo(record.certificateNo || '');
    setFormOrderNumber(record.orderNumber || '');
    setFormIssueDate(record.issueDate ? String(record.issueDate).slice(0, 10) : '');
    setFormIssuedBy(record.issuedBy || 'สำนักงานลูกเสือแห่งชาติ');
    setIsModalOpen(true);
  };

  const handleSaveScout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage || !formTeacherId || !formQualification.trim()) return;

    const selectedTeacher = sortedTeachers.find((t) => t.id === formTeacherId);
    const payload: ScoutRecord = {
      id: editingScoutId || `SCT-${Date.now().toString().slice(-6)}`,
      teacherId: formTeacherId,
      teacherName: selectedTeacher ? formatStaffName(selectedTeacher) : '',
      position: selectedTeacher?.position || 'ครู',
      qualification: formQualification.trim(),
      badgeLevel: formBadgeLevel,
      category: formCategory,
      certificateNo: formCertificateNo.trim() || '-',
      orderNumber: formOrderNumber.trim() || '',
      issueDate: formIssueDate || new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date()),
      issuedBy: formIssuedBy.trim() || 'สำนักงานลูกเสือแห่งชาติ',
    };

    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/scout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'ไม่สามารถบันทึกวุฒิลูกเสือได้');
      }
      const saved: ScoutRecord = json.data || payload;
      setScouts((prev) =>
        editingScoutId
          ? prev.map((s) => (s.id === editingScoutId ? saved : s))
          : [...prev, saved]
      );
      setIsModalOpen(false);
      setEditingScoutId(null);
      showNotice('success', editingScoutId ? 'อัปเดตข้อมูลวุฒิลูกเสือเรียบร้อยแล้ว' : 'เพิ่มข้อมูลวุฒิลูกเสือเรียบร้อยแล้ว');
    } catch (err: any) {
      showNotice('error', err?.message || 'เกิดข้อผิดพลาดในการบันทึกวุฒิลูกเสือ');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!canManage || !deletingScout) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/admin/scout?id=${encodeURIComponent(deletingScout.id)}`, {
        method: 'DELETE',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'ไม่สามารถลบข้อมูลวุฒิลูกเสือได้');
      }
      setScouts((prev) => prev.filter((s) => s.id !== deletingScout.id));
      setDeletingScout(null);
      showNotice('success', 'ลบข้อมูลวุฒิลูกเสือเรียบร้อยแล้ว');
    } catch (err: any) {
      showNotice('error', err?.message || 'เกิดข้อผิดพลาดในการลบข้อมูลวุฒิลูกเสือ');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#141b24] p-5 sm:p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm transition-colors duration-200">
        <div className="flex items-center gap-2.5">
          <Award className="w-5 h-5 text-amber-500 dark:text-amber-400 shrink-0" />
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
            ทะเบียนวุฒิทางลูกเสือ
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {canManage && (
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition-colors duration-200 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 shrink-0" />
              <span>เพิ่มวุฒิลูกเสือ</span>
            </button>
          )}
          <div className="inline-flex p-1 bg-slate-100 dark:bg-[#101822] border border-slate-200/90 dark:border-slate-800/80 rounded-lg">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors duration-200 cursor-pointer ${
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
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors duration-200 cursor-pointer ${
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

      {notice && (
        <div
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

      {/* Filter and Search */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="ค้นหาชื่อครู, วุฒิการฝึกอบรม, เลขที่วุฒิบัตร..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 bg-slate-50 dark:bg-[#111822] border border-slate-200 dark:border-slate-700/80 rounded-xl pl-10 pr-3.5 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-amber-500 transition-all"
          />
        </div>

        <div className="h-10 flex items-center bg-slate-50 dark:bg-[#111822] border border-slate-200 dark:border-slate-700/80 rounded-xl px-3 text-xs sm:text-sm text-slate-700 dark:text-slate-200 focus-within:border-amber-500 transition-all">
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="w-full bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
          >
            <option value="ALL" className="bg-white dark:bg-[#171a21] text-slate-900 dark:text-white">ระดับวุฒิทั้งหมด</option>
            {levels.map((lvl) => (
              <option key={lvl} value={lvl} className="bg-white dark:bg-[#171a21] text-slate-900 dark:text-white">
                {lvl}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main View: Table View */}
      {viewMode === 'table' ? (
        <div className="bg-white dark:bg-[#111823] rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm dark:shadow-xl overflow-hidden transition-colors duration-200">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-sm text-slate-700 dark:text-slate-200">
              <thead className="bg-slate-100/80 dark:bg-[#16202d] text-xs uppercase text-slate-500 dark:text-slate-400 tracking-wider font-semibold border-b border-slate-200/90 dark:border-slate-800">
                <tr>
                  <th scope="col" className="w-14 px-3 py-3.5 text-center">ลำดับ</th>
                  <th scope="col" className="w-[26%] px-4 py-3.5">ผู้ถือวุฒิลูกเสือ</th>
                  <th scope="col" className="w-[28%] px-4 py-3.5">หลักสูตร / วุฒิการฝึกอบรม</th>
                  <th scope="col" className="w-[20%] px-4 py-3.5 text-center">ระดับวุฒิ / เครื่องหมาย</th>
                  <th scope="col" className="w-[18%] px-4 py-3.5 text-center font-mono">เลขที่วุฒิบัตร</th>
                  <th scope="col" className="w-12 px-3 py-3.5 text-right">
                    <span className="sr-only">ขยายรายละเอียด</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 font-sans">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                      <div className="inline-flex items-center gap-2 text-xs">
                        <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                        <span>กำลังโหลดข้อมูลทะเบียนวุฒิทางลูกเสือ...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredScouts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
                        <Compass className="w-8 h-8 mb-2 opacity-40 shrink-0" />
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                          {searchQuery || levelFilter !== 'ALL'
                            ? 'ไม่พบข้อมูลวุฒิทางลูกเสือที่ตรงกับเงื่อนไข'
                            : 'ยังไม่มีข้อมูลวุฒิทางลูกเสือ'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredScouts.map((s, index) => {
                  const posDisplay = (s.position || '-').replace('ผู้อำนวยการสถานศึกษา', 'ผอ.สถานศึกษา');
                  const isExpanded = expandedId === s.id;
                  return (
                    <React.Fragment key={s.id}>
                      <tr
                        onClick={() => toggleExpand(s.id)}
                        className={`hover:bg-slate-50 dark:hover:bg-[#182536]/60 transition-colors cursor-pointer ${
                          isExpanded ? 'bg-slate-50/90 dark:bg-[#182536]/40' : ''
                        }`}
                      >
                        {/* Sequence */}
                        <td className="w-14 px-3 py-3.5 text-center font-mono tabular-nums text-slate-400 dark:text-slate-500 text-xs whitespace-nowrap">
                          {index + 1}
                        </td>

                        {/* Name & Position */}
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-slate-900 dark:text-white text-sm" title={formatStaffName(s.teacherName || '')}>
                            {formatStaffName(s.teacherName || '-')}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5" title={s.position || ''}>
                            {posDisplay}
                          </div>
                        </td>

                        {/* Qualification Title */}
                        <td className="px-4 py-3.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium">
                          <div title={s.qualification || ''}>
                            {s.qualification || '-'}
                          </div>
                        </td>

                        {/* Badge Level with Subtle Dot */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                            <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                              {s.badgeLevel || '-'}
                            </span>
                          </div>
                        </td>

                        {/* Certificate No */}
                        <td className="px-4 py-3.5 text-center font-mono text-xs text-sky-600 dark:text-sky-400 whitespace-nowrap">
                          {s.certificateNo || '-'}
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

                      {/* Detail Accordion Row */}
                      {isExpanded && (
                        <tr className="bg-slate-50/90 dark:bg-[#0b1016]/90 border-y border-slate-200/90 dark:border-slate-800/80">
                          <td colSpan={6} className="pl-14 pr-6 py-4">
                            <div className="space-y-3">
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                                <div>
                                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mb-1">
                                    หลักสูตรและวุฒิเต็ม
                                  </div>
                                  <div className="text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                                    {s.qualification || '-'}
                                  </div>
                                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">ประเภท: {s.category || '-'}</div>
                                </div>

                                <div>
                                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mb-1">
                                    เลขที่วุฒิบัตร / ทะเบียน
                                  </div>
                                  <div className="font-mono text-sky-600 dark:text-sky-400 font-medium text-sm">
                                    {s.certificateNo || '-'}
                                  </div>
                                  {s.orderNumber && (
                                    <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                      อ้างอิง: {s.orderNumber}
                                    </div>
                                  )}
                                </div>

                                <div>
                                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mb-1">
                                    วันที่ได้รับวุฒิบัตร
                                  </div>
                                  <div className="text-slate-800 dark:text-slate-200 font-mono">
                                    {formatScoutDate(s.issueDate)}
                                  </div>
                                </div>

                                <div>
                                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mb-1">
                                    หน่วยงานที่ออกวุฒิบัตร
                                  </div>
                                  <div className="text-slate-700 dark:text-slate-300 font-medium">
                                    {s.issuedBy || 'สำนักงานลูกเสือแห่งชาติ'}
                                  </div>
                                </div>
                              </div>

                              {canManage && (
                                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/80 dark:border-slate-800/80">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenEditModal(s);
                                    }}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 text-xs font-medium transition-colors cursor-pointer"
                                  >
                                    <Pencil className="w-3.5 h-3.5 shrink-0" />
                                    <span>แก้ไข</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeletingScout(s);
                                    }}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:hover:bg-rose-500/25 dark:text-rose-400 text-xs font-medium transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 shrink-0" />
                                    <span>ลบ</span>
                                  </button>
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
      ) : isLoading ? (
        <div className="p-12 text-center bg-white dark:bg-[#121822] rounded-2xl border border-slate-200/90 dark:border-slate-800 text-slate-500 dark:text-slate-400">
          <div className="inline-flex items-center gap-2 text-xs">
            <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
            <span>กำลังโหลดข้อมูลทะเบียนวุฒิทางลูกเสือ...</span>
          </div>
        </div>
      ) : (
        /* Responsive Grid / Cards View */
        filteredScouts.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-[#121822] rounded-2xl border border-slate-200/90 dark:border-slate-800">
            <div className="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
              <Compass className="w-8 h-8 mb-2 opacity-40 shrink-0" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                {searchQuery || levelFilter !== 'ALL'
                  ? 'ไม่พบข้อมูลวุฒิทางลูกเสือที่ตรงกับเงื่อนไข'
                  : 'ยังไม่มีข้อมูลวุฒิทางลูกเสือ'}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredScouts.map((s) => (
              <div
                key={s.id}
                className="bg-white dark:bg-[#121822] p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800/80 hover:border-amber-500/40 shadow-sm dark:shadow-none transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs sm:text-sm font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                      <Award className="w-3.5 h-3.5 shrink-0" />
                      <span>{s.badgeLevel || '-'}</span>
                    </span>
                    <div className="flex items-center gap-1">
                      {canManage && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(s)}
                            title="แก้ไข"
                            className="p-1.5 rounded-md text-slate-400 hover:text-sky-600 dark:hover:text-sky-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5 shrink-0" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingScout(s)}
                            title="ลบ"
                            className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5 shrink-0" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="text-base font-bold text-slate-900 dark:text-white mb-0.5">{formatStaffName(s.teacherName || '-')}</div>
                  <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-3">{s.position || '-'}</div>

                  <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium mb-3 bg-slate-50 dark:bg-[#101822] p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
                    {s.qualification || '-'}
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400 pt-3 border-t border-slate-200/90 dark:border-slate-800">
                    <div>
                      เลขที่วุฒิบัตร: <span className="font-mono text-sky-600 dark:text-sky-400 font-semibold">{s.certificateNo || '-'}</span>
                    </div>
                    <div>
                      วันที่ได้รับ: <span className="font-mono text-slate-700 dark:text-slate-300">{formatScoutDate(s.issueDate)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Create / Edit Scout Credential Modal */}
      {isModalOpen && canManage && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm overflow-y-auto"
          onClick={() => !isSaving && setIsModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-[#141d27] border border-slate-200/90 dark:border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-slate-800 dark:text-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200/90 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-sm">
                <Award className="w-4 h-4 shrink-0" />
                <span>{editingScoutId ? 'แก้ไขข้อมูลวุฒิทางลูกเสือ' : 'เพิ่มข้อมูลวุฒิทางลูกเสือ'}</span>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveScout} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">บุคลากรผู้ถือวุฒิ *</label>
                <select
                  required
                  value={formTeacherId}
                  onChange={(e) => setFormTeacherId(e.target.value)}
                  className="w-full h-10 bg-slate-50 dark:bg-[#0e141c] border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500 cursor-pointer"
                >
                  {sortedTeachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {formatStaffName(t)} ({(t.position || '').replace('ผู้อำนวยการสถานศึกษา', 'ผอ.สถานศึกษา')})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">หลักสูตร / วุฒิการฝึกอบรม *</label>
                <input
                  type="text"
                  required
                  value={formQualification}
                  onChange={(e) => setFormQualification(e.target.value)}
                  placeholder="เช่น ผู้กำกับลูกเสือสามัญ ขั้นความรู้ชั้นสูง (A.T.C.)"
                  className="w-full h-10 bg-slate-50 dark:bg-[#0e141c] border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">ระดับวุฒิ / เครื่องหมาย</label>
                  <select
                    value={formBadgeLevel}
                    onChange={(e) => setFormBadgeLevel(e.target.value)}
                    className="w-full h-10 bg-slate-50 dark:bg-[#0e141c] border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500 cursor-pointer"
                  >
                    {SCOUT_BADGE_LEVELS.map((lvl) => (
                      <option key={lvl} value={lvl}>{lvl}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">ประเภทลูกเสือ</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full h-10 bg-slate-50 dark:bg-[#0e141c] border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500 cursor-pointer"
                  >
                    {SCOUT_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">เลขที่วุฒิบัตร</label>
                  <input
                    type="text"
                    value={formCertificateNo}
                    onChange={(e) => setFormCertificateNo(e.target.value)}
                    placeholder="เช่น ว.บ. 1234/2565"
                    className="w-full h-10 bg-slate-50 dark:bg-[#0e141c] border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">วันที่ได้รับวุฒิบัตร</label>
                  <ThaiDatePicker
                    value={formIssueDate}
                    onChange={setFormIssueDate}
                    placeholder="เลือกวันที่ได้รับวุฒิบัตร"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">คำสั่งอ้างอิง (ถ้ามี)</label>
                  <input
                    type="text"
                    value={formOrderNumber}
                    onChange={(e) => setFormOrderNumber(e.target.value)}
                    placeholder="เช่น คำสั่งที่ 45/2565"
                    className="w-full h-10 bg-slate-50 dark:bg-[#0e141c] border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">หน่วยงานที่ออกวุฒิบัตร</label>
                  <input
                    type="text"
                    value={formIssuedBy}
                    onChange={(e) => setFormIssuedBy(e.target.value)}
                    placeholder="สำนักงานลูกเสือแห่งชาติ"
                    className="w-full h-10 bg-slate-50 dark:bg-[#0e141c] border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500"
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
                  {isSaving ? 'กำลังบันทึก...' : editingScoutId ? 'บันทึกการแก้ไข' : 'บันทึกข้อมูล'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom In-App Delete Confirmation Modal */}
      {deletingScout && canManage && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={() => !isSaving && setDeletingScout(null)}
        >
          <div
            className="bg-white dark:bg-[#141d27] border border-slate-200/90 dark:border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-slate-800 dark:text-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400 font-bold text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>ยืนยันการลบข้อมูลวุฒิทางลูกเสือ</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              คุณต้องการลบข้อมูลวุฒิ <span className="font-semibold text-slate-900 dark:text-white">&ldquo;{deletingScout.qualification}&rdquo;</span> ของ {formatStaffName(deletingScout.teacherName || '-')} ใช่หรือไม่?
            </p>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200/90 dark:border-slate-800">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => setDeletingScout(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 text-xs font-medium cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? 'กำลังลบ...' : 'ลบข้อมูล'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
