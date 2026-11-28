'use client';

/**
 * ============================================================================
 * ManStat: Automated Academic Deliverable Tracker Modal (Phase 12.3)
 * ============================================================================
 * - Automatically derives each teacher's actual (room, subject, code, hours)
 *   assignments from `timetable_slots` (including co-teaching slots).
 * - Tracks แผนการจัดการเรียนรู้ & ปพ.5 statuses with inline save for managers.
 * - Close-locked modal (X / ปิด only), zero emojis, Arabic numerals (0-9).
 * ============================================================================
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FileCheck2,
  X,
  Download,
  Printer,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  BookOpen,
  ClipboardCheck,
  Award,
  Save,
} from 'lucide-react';
import type { TeacherRecord } from '@/lib/data/schoolData';
import type {
  AcademicDeliverableRecord,
  DeliverableStatus,
  SchoolSubject,
  TimetableSemester,
  TimetableSlot,
} from '@/lib/data/timetableTypes';
import {
  DELIVERABLE_STATUS_LABELS,
  buildTeacherDeliverableRows,
  exportDeliverablesCsv,
  type TeacherDeliverableRow,
} from '@/lib/regulations/academic-deliverables-utils';
import { AcademicDeliverablesPrintView } from '@/components/views/AcademicDeliverablesPrintView';

export interface AcademicDeliverablesModalProps {
  isOpen: boolean;
  onClose: () => void;
  canManage: boolean;
  academicYear: string;
  semester: TimetableSemester;
  slots: readonly TimetableSlot[];
  teachers: readonly TeacherRecord[];
  schoolSubjects: readonly SchoolSubject[];
}

function getStatusSelectClass(status: DeliverableStatus): string {
  switch (status) {
    case 'submitted':
      return 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800';
    case 'reviewing':
      return 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800';
    default:
      return 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-[#101822] dark:text-slate-300 dark:border-slate-700';
  }
}

export const AcademicDeliverablesModal: React.FC<AcademicDeliverablesModalProps> = ({
  isOpen,
  onClose,
  canManage,
  academicYear,
  semester,
  slots,
  teachers,
  schoolSubjects,
}) => {
  const [savedRecords, setSavedRecords] = useState<AcademicDeliverableRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'INCOMPLETE' | 'COMPLETE'>('ALL');
  const [remarkDrafts, setRemarkDrafts] = useState<Record<string, string>>({});
  const [isPrintOpen, setIsPrintOpen] = useState<boolean>(false);

  const showNotice = (type: 'success' | 'error', text: string) => {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 4000);
  };

  const loadDeliverables = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/timetable/deliverables?academicYear=${encodeURIComponent(academicYear)}&semester=${encodeURIComponent(semester)}`,
        { cache: 'no-store' }
      );
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success && Array.isArray(json.data)) {
        setSavedRecords(json.data);
      }
    } catch {
      // keep existing state
    } finally {
      setIsLoading(false);
    }
  }, [academicYear, semester]);

  useEffect(() => {
    if (isOpen) {
      loadDeliverables();
      setRemarkDrafts({});
    }
  }, [isOpen, loadDeliverables]);

  const summary = useMemo(
    () =>
      buildTeacherDeliverableRows({
        academicYear,
        semester,
        slots,
        teachers,
        catalogSubjects: schoolSubjects,
        savedRecords,
      }),
    [academicYear, semester, slots, teachers, schoolSubjects, savedRecords]
  );

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return summary.rows.filter((row) => {
      const isComplete =
        row.lessonPlanStatus === 'submitted' && row.gradebookStatus === 'submitted';
      if (statusFilter === 'COMPLETE' && !isComplete) return false;
      if (statusFilter === 'INCOMPLETE' && isComplete) return false;
      if (!q) return true;
      return (
        row.teacherName.toLowerCase().includes(q) ||
        row.roomName.toLowerCase().includes(q) ||
        row.subjectName.toLowerCase().includes(q) ||
        row.subjectCode.toLowerCase().includes(q)
      );
    });
  }, [summary.rows, searchQuery, statusFilter]);

  const saveRowUpdate = async (
    row: TeacherDeliverableRow,
    patch: Partial<{
      lessonPlanStatus: DeliverableStatus;
      gradebookStatus: DeliverableStatus;
      remarks: string;
    }>
  ) => {
    if (!canManage) return;
    setSavingKey(row.key);
    try {
      const payload = {
        academicYear,
        semester,
        teacherId: row.teacherId,
        roomName: row.roomName,
        subjectName: row.subjectName,
        subjectCode: row.subjectCode,
        lessonPlanStatus: patch.lessonPlanStatus ?? row.lessonPlanStatus,
        gradebookStatus: patch.gradebookStatus ?? row.gradebookStatus,
        remarks: patch.remarks !== undefined ? patch.remarks : row.remarks,
      };
      const res = await fetch('/api/admin/timetable/deliverables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'ไม่สามารถบันทึกสถานะได้');
      }
      const saved: AcademicDeliverableRecord = json.data;
      setSavedRecords((prev) => {
        const idx = prev.findIndex(
          (r) =>
            r.teacherId === saved.teacherId &&
            r.roomName === saved.roomName &&
            r.subjectName.trim().toLowerCase() === saved.subjectName.trim().toLowerCase()
        );
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = saved;
          return copy;
        }
        return [...prev, saved];
      });
      showNotice('success', `บันทึกสถานะวิชา ${row.subjectName} (${row.roomName}) เรียบร้อยแล้ว`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึกสถานะ';
      showNotice('error', msg);
    } finally {
      setSavingKey(null);
    }
  };

  const handleExportCsv = () => {
    if (typeof window === 'undefined') return;
    const csv = exportDeliverablesCsv(summary.rows, academicYear, semester);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ManStat_Academic_Deliverables_${academicYear}_${semester}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="academic-deliverables-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 dark:bg-black/75 backdrop-blur-xs p-3 sm:p-4"
    >
      <div className="bg-white dark:bg-[#121822] border border-slate-200/90 dark:border-slate-800 rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl text-slate-800 dark:text-slate-200 overflow-hidden">
        {/* Sticky Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-slate-200/90 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <FileCheck2 className="w-5 h-5 text-sky-500 shrink-0" />
            <div className="min-w-0">
              <h3
                id="academic-deliverables-modal-title"
                className="text-base font-bold text-slate-900 dark:text-white"
              >
                ติดตามงานวิชาการ: แผนการสอน / ปพ.5 ({academicYear}/{semester})
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                ดึงรายการสอนของบุคลากรอัตโนมัติจากตารางสอนจริง (รวมคาบสอนร่วม) เพื่อติดตามการส่งแผนการจัดการเรียนรู้และ ปพ.5
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 shrink-0" />
              <span>ส่งออก CSV (Excel)</span>
            </button>
            <button
              type="button"
              onClick={() => setIsPrintOpen(true)}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-medium transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4 shrink-0" />
              <span>พิมพ์รายงาน (A4)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="ปิดหน้าต่างติดตามงานวิชาการ"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
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

          {/* 4 KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#101822] border border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>รายการสอนทั้งหมด</span>
                <BookOpen className="w-4 h-4 text-sky-500 shrink-0" />
              </div>
              <div className="mt-2 text-xl font-bold font-mono text-slate-900 dark:text-white">
                {summary.stats.totalAssignments}{' '}
                <span className="text-xs font-sans font-normal text-slate-500">รายการ</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#101822] border border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>ส่งแผนการสอนแล้ว</span>
                <ClipboardCheck className="w-4 h-4 text-indigo-500 shrink-0" />
              </div>
              <div className="mt-2 text-xl font-bold font-mono text-indigo-600 dark:text-indigo-400">
                {summary.stats.lessonPlanSubmitted}/{summary.stats.totalAssignments}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#101822] border border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>ส่ง ปพ.5 แล้ว</span>
                <FileCheck2 className="w-4 h-4 text-emerald-500 shrink-0" />
              </div>
              <div className="mt-2 text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {summary.stats.gradebookSubmitted}/{summary.stats.totalAssignments}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#101822] border border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>ครบถ้วนทั้ง 2 รายการ</span>
                <Award className="w-4 h-4 text-amber-500 shrink-0" />
              </div>
              <div className="mt-2 text-xl font-bold font-mono text-slate-900 dark:text-white">
                {summary.stats.completionRatePercent}%{' '}
                <span className="text-xs font-sans font-normal text-slate-500">
                  ({summary.stats.fullyCompletedCount} รายการ)
                </span>
              </div>
            </div>
          </div>

          {/* Search & Status Filter */}
          <search aria-label="ค้นหาและกรองรายการติดตามงานวิชาการ" className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="relative md:col-span-8">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 shrink-0" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาชื่อครูผู้สอน, ห้องเรียน, รหัสวิชา หรือชื่อรายวิชา..."
                className="w-full h-9 bg-slate-50 dark:bg-[#101822] border border-slate-200 dark:border-slate-700/80 rounded-xl pl-9 pr-3 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-sky-500"
              />
            </div>
            <div className="md:col-span-4">
              <select
                aria-label="กรองตามสถานะการส่งงาน"
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as 'ALL' | 'INCOMPLETE' | 'COMPLETE')
                }
                className="w-full h-9 bg-slate-50 dark:bg-[#101822] border border-slate-200 dark:border-slate-700/80 rounded-xl px-3 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-sky-500 cursor-pointer"
              >
                <option value="ALL">สถานะ: ทั้งหมด ({summary.rows.length})</option>
                <option value="INCOMPLETE">ยังไม่ครบทั้ง 2 รายการ</option>
                <option value="COMPLETE">ส่งครบถ้วนแล้วทั้ง 2 รายการ</option>
              </select>
            </div>
          </search>

          {/* Responsive Table */}
          <div
            tabIndex={0}
            role="region"
            aria-label="ตารางติดตามการส่งแผนการสอนและ ปพ.5"
            className="overflow-x-auto w-full rounded-xl border border-slate-200/90 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
          >
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-100/90 dark:bg-[#101822] text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200/90 dark:border-slate-800">
                <tr>
                  <th scope="col" className="w-10 px-3 py-3 text-center font-mono">
                    ที่
                  </th>
                  <th scope="col" className="px-3 py-3 whitespace-nowrap">
                    ชื่อ-สกุล
                  </th>
                  <th scope="col" className="px-2.5 py-3 text-center whitespace-nowrap">
                    ชั้น
                  </th>
                  <th scope="col" className="px-3 py-3">
                    รหัส / รายวิชา
                  </th>
                  <th scope="col" className="px-2.5 py-3 text-center whitespace-nowrap">
                    ชม./สัปดาห์
                  </th>
                  <th scope="col" className="px-3 py-3 text-center whitespace-nowrap">
                    แผนการสอน
                  </th>
                  <th scope="col" className="px-3 py-3 text-center whitespace-nowrap">
                    ปพ.5
                  </th>
                  <th scope="col" className="px-3 py-3 min-w-[180px]">
                    หมายเหตุ
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                      <div className="inline-flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-sky-500" />
                        <span>กำลังโหลดสถานะการส่งงานวิชาการ...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-slate-500 dark:text-slate-400">
                      ไม่พบรายการสอนที่ตรงกับเงื่อนไขการค้นหา
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row, idx) => {
                    const isRowSaving = savingKey === row.key;
                    const draftRemark =
                      remarkDrafts[row.key] !== undefined ? remarkDrafts[row.key] : row.remarks;
                    const remarkDirty = draftRemark !== row.remarks;

                    return (
                      <tr
                        key={row.key}
                        className="hover:bg-slate-50 dark:hover:bg-[#1a2636]/50 transition-colors"
                      >
                        <td className="px-3 py-2.5 text-center font-mono text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="px-3 py-2.5 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                          {row.teacherName}
                        </td>
                        <td className="px-2.5 py-2.5 text-center whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md font-bold text-[11px] bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800/70">
                            {row.roomName}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {row.subjectCode && (
                              <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                                {row.subjectCode}
                              </span>
                            )}
                            <span className="font-medium text-slate-900 dark:text-white">
                              {row.subjectName}
                            </span>
                            {row.isCoTeaching && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">
                                สอนร่วม
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-2.5 py-2.5 text-center font-mono">
                          {row.weeklyHours}
                        </td>
                        <td className="px-3 py-2.5 text-center whitespace-nowrap">
                          {canManage ? (
                            <select
                              aria-label={`สถานะแผนการสอน ${row.subjectName} ${row.roomName}`}
                              disabled={isRowSaving}
                              value={row.lessonPlanStatus}
                              onChange={(e) =>
                                saveRowUpdate(row, {
                                  lessonPlanStatus: e.target.value as DeliverableStatus,
                                })
                              }
                              className={`h-8 px-2 rounded-lg border text-[11px] font-medium cursor-pointer focus:outline-none focus:border-sky-500 ${getStatusSelectClass(
                                row.lessonPlanStatus
                              )}`}
                            >
                              <option value="pending">{DELIVERABLE_STATUS_LABELS.pending}</option>
                              <option value="reviewing">{DELIVERABLE_STATUS_LABELS.reviewing}</option>
                              <option value="submitted">{DELIVERABLE_STATUS_LABELS.submitted}</option>
                            </select>
                          ) : (
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-medium ${getStatusSelectClass(
                                row.lessonPlanStatus
                              )}`}
                            >
                              {DELIVERABLE_STATUS_LABELS[row.lessonPlanStatus]}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-center whitespace-nowrap">
                          {canManage ? (
                            <select
                              aria-label={`สถานะ ปพ.5 ${row.subjectName} ${row.roomName}`}
                              disabled={isRowSaving}
                              value={row.gradebookStatus}
                              onChange={(e) =>
                                saveRowUpdate(row, {
                                  gradebookStatus: e.target.value as DeliverableStatus,
                                })
                              }
                              className={`h-8 px-2 rounded-lg border text-[11px] font-medium cursor-pointer focus:outline-none focus:border-sky-500 ${getStatusSelectClass(
                                row.gradebookStatus
                              )}`}
                            >
                              <option value="pending">{DELIVERABLE_STATUS_LABELS.pending}</option>
                              <option value="reviewing">{DELIVERABLE_STATUS_LABELS.reviewing}</option>
                              <option value="submitted">{DELIVERABLE_STATUS_LABELS.submitted}</option>
                            </select>
                          ) : (
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-medium ${getStatusSelectClass(
                                row.gradebookStatus
                              )}`}
                            >
                              {DELIVERABLE_STATUS_LABELS[row.gradebookStatus]}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          {canManage ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                aria-label={`หมายเหตุ ${row.subjectName} ${row.roomName}`}
                                value={draftRemark}
                                onChange={(e) =>
                                  setRemarkDrafts((prev) => ({
                                    ...prev,
                                    [row.key]: e.target.value,
                                  }))
                                }
                                placeholder="หมายเหตุสั้น..."
                                className="flex-1 h-8 px-2.5 rounded-lg bg-slate-50 dark:bg-[#101822] border border-slate-200 dark:border-slate-700 text-[11px] text-slate-800 dark:text-slate-100 focus:outline-none focus:border-sky-500"
                              />
                              {remarkDirty && (
                                <button
                                  type="button"
                                  disabled={isRowSaving}
                                  onClick={() => saveRowUpdate(row, { remarks: draftRemark })}
                                  title="บันทึกหมายเหตุ"
                                  className="p-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white cursor-pointer disabled:opacity-50"
                                >
                                  <Save className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                              {row.remarks || '-'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="flex items-center justify-between gap-2 px-6 py-3.5 border-t border-slate-200/90 dark:border-slate-800 shrink-0 text-xs text-slate-500 dark:text-slate-400">
          <span>
            {canManage
              ? 'สามารถเปลี่ยนสถานะแผนการสอน / ปพ.5 ได้ทันที ระบบจะบันทึกอัตโนมัติ'
              : 'มุมมองอ่านอย่างเดียว (เฉพาะผู้ดูแลระบบและฝ่ายวิชาการสามารถอัปเดตสถานะได้)'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 text-xs font-medium transition-colors cursor-pointer"
          >
            ปิด
          </button>
        </div>
      </div>

      {/* Landscape A4 Print Overlay */}
      {isPrintOpen && (
        <AcademicDeliverablesPrintView
          academicYear={academicYear}
          semester={semester}
          summary={summary}
          onClose={() => setIsPrintOpen(false)}
        />
      )}
    </div>
  );
};
