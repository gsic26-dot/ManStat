'use client';

/**
 * ============================================================================
 * ManStat: School-Wide Curriculum vs. Actual Timetable Audit Modal (Phase 12.2)
 * ============================================================================
 * - Compares official school curriculum vs. actual scheduled timetable_slots
 *   across all 9 rooms (ป.1–ม.3).
 * - Close-locked modal (X or ปิด only; never dismiss on backdrop/Escape).
 * - Zero emojis, Lucide SVG icons only, Arabic numerals (0-9), Light/Dark mode.
 * ============================================================================
 */

import React, { useMemo, useState } from 'react';
import {
  ClipboardCheck,
  X,
  Download,
  Printer,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  Layers,
  Info,
} from 'lucide-react';
import type {
  SchoolSubject,
  TimetableSemester,
  TimetableSlot,
} from '@/lib/data/timetableTypes';
import {
  AUDIT_STATUS_LABELS,
  evaluateSchoolCurriculumAudit,
  exportCurriculumAuditCsv,
  type AuditItemStatus,
} from '@/lib/regulations/curriculum-audit-utils';
import { CurriculumAuditPrintView } from '@/components/views/CurriculumAuditPrintView';

export interface CurriculumAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  academicYear: string;
  semester: TimetableSemester;
  slots: readonly TimetableSlot[];
  schoolSubjects: readonly SchoolSubject[];
}

function getAuditStatusBadgeClass(status: AuditItemStatus): string {
  switch (status) {
    case 'match':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/70';
    case 'under':
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/70';
    case 'over':
      return 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/70';
    case 'missing':
      return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/70';
  }
}

export const CurriculumAuditModal: React.FC<CurriculumAuditModalProps> = ({
  isOpen,
  onClose,
  academicYear,
  semester,
  slots,
  schoolSubjects,
}) => {
  const [selectedRoom, setSelectedRoom] = useState<string>('ป.1');
  const [issuesOnly, setIssuesOnly] = useState<boolean>(false);
  const [isPrintOpen, setIsPrintOpen] = useState<boolean>(false);

  const report = useMemo(
    () =>
      evaluateSchoolCurriculumAudit({
        academicYear,
        semester,
        slots,
        catalogSubjects: schoolSubjects,
      }),
    [academicYear, semester, slots, schoolSubjects]
  );

  const activeRoom = useMemo(
    () => report.rooms.find((r) => r.roomName === selectedRoom) || report.rooms[0],
    [report.rooms, selectedRoom]
  );

  const visibleSubjects = useMemo(() => {
    if (!activeRoom) return [];
    return issuesOnly
      ? activeRoom.subjects.filter((s) => s.status !== 'match')
      : activeRoom.subjects;
  }, [activeRoom, issuesOnly]);

  const handleExportCsv = () => {
    if (typeof window === 'undefined') return;
    const csv = exportCurriculumAuditCsv(report);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ManStat_Curriculum_Audit_${academicYear}_${semester}.csv`);
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
      aria-labelledby="curriculum-audit-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 dark:bg-black/75 backdrop-blur-xs p-3 sm:p-4"
    >
      <div className="bg-white dark:bg-[#121822] border border-slate-200/90 dark:border-slate-800 rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl text-slate-800 dark:text-slate-200 overflow-hidden">
        {/* Sticky Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-slate-200/90 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <ClipboardCheck className="w-5 h-5 text-sky-500 shrink-0" />
            <div className="min-w-0">
              <h3
                id="curriculum-audit-modal-title"
                className="text-base font-bold text-slate-900 dark:text-white"
              >
                ตรวจความสอดคล้องหลักสูตร vs ตารางสอน ({academicYear}/{semester})
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                เปรียบเทียบโครงสร้างหลักสูตรสถานศึกษา โรงเรียนชุมชนบ้านตะขบ กับคาบสอนจริงทั้ง 9 ห้อง (ป.1–ม.3)
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
              <span>พิมพ์รายงาน SAR (A4)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="ปิดหน้าต่างตรวจหลักสูตร"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* 4 School-Wide KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#101822] border border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>ห้องที่ครบตามหลักสูตร</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              </div>
              <div className="mt-2 text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {report.stats.compliantRooms}/{report.stats.totalRooms}{' '}
                <span className="text-xs font-sans font-normal text-slate-500">ห้อง</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#101822] border border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>ความสอดคล้องรวม</span>
                <Layers className="w-4 h-4 text-sky-500 shrink-0" />
              </div>
              <div className="mt-2 text-xl font-bold font-mono text-slate-900 dark:text-white">
                {report.stats.overallCompliancePercent}%
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#101822] border border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>รายวิชาตรงเกณฑ์</span>
                <BookOpen className="w-4 h-4 text-indigo-500 shrink-0" />
              </div>
              <div className="mt-2 text-xl font-bold font-mono text-slate-900 dark:text-white">
                {report.stats.totalMatchedSubjects}/{report.stats.totalRequiredSubjects}{' '}
                <span className="text-xs font-sans font-normal text-slate-500">วิชา</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#101822] border border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>รายการต้องตรวจสอบ</span>
                <AlertTriangle
                  className={`w-4 h-4 shrink-0 ${
                    report.stats.totalIssues === 0 ? 'text-emerald-500' : 'text-amber-500'
                  }`}
                />
              </div>
              <div
                className={`mt-2 text-xl font-bold font-mono ${
                  report.stats.totalIssues === 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-amber-600 dark:text-amber-400'
                }`}
              >
                {report.stats.totalIssues}{' '}
                <span className="text-xs font-sans font-normal text-slate-500">รายการ</span>
              </div>
            </div>
          </div>

          {/* 9-Room Overview Matrix Selector */}
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                เลือกห้องเรียนเพื่อดูรายละเอียดรายวิชา (9 ห้อง ป.1–ม.3)
              </h4>
              <label className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={issuesOnly}
                  onChange={(e) => setIssuesOnly(e.target.checked)}
                  className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                />
                <span>แสดงเฉพาะรายการที่ไม่ตรงเกณฑ์</span>
              </label>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
              {report.rooms.map((room) => {
                const isSelected = room.roomName === activeRoom?.roomName;
                return (
                  <button
                    key={room.roomName}
                    type="button"
                    onClick={() => setSelectedRoom(room.roomName)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-500 ring-1 ring-sky-500/40'
                        : 'bg-white dark:bg-[#101822] border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {room.roomName}
                      </span>
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          room.isCompliant ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                      />
                    </div>
                    <div className="mt-1 font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      {room.compliancePercent}%
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">
                      {room.matchedSubjectsCount}/{room.totalRequiredSubjects} วิชา
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Room Subject-by-Subject Variance Table */}
          {activeRoom && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="font-semibold text-slate-900 dark:text-white">
                  รายละเอียดการตรวจสอบห้อง {activeRoom.roomName} (
                  {activeRoom.level === 'secondary' ? 'มัธยมศึกษาตอนต้น' : 'ประถมศึกษา'})
                </div>
                <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                  <span>
                    เกณฑ์หลักสูตร: <strong>{activeRoom.requiredTotalHours}</strong> ชม./สัปดาห์
                  </span>
                  <span>·</span>
                  <span>
                    จัดตามหลักสูตร: <strong>{activeRoom.scheduledCurriculumHours}</strong> ชม./สัปดาห์
                  </span>
                </div>
              </div>

              <div
                tabIndex={0}
                role="region"
                aria-label={`ตารางตรวจหลักสูตรห้อง ${activeRoom.roomName}`}
                className="overflow-x-auto w-full rounded-xl border border-slate-200/90 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
              >
                <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                  <thead className="bg-slate-100/90 dark:bg-[#101822] text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200/90 dark:border-slate-800">
                    <tr>
                      <th scope="col" className="px-3 py-2.5 whitespace-nowrap">
                        รหัสวิชา
                      </th>
                      <th scope="col" className="px-3 py-2.5">
                        ชื่อรายวิชา
                      </th>
                      <th scope="col" className="px-3 py-2.5 whitespace-nowrap">
                        ประเภท
                      </th>
                      <th scope="col" className="px-3 py-2.5 text-center whitespace-nowrap">
                        เกณฑ์หลักสูตร (ชม./สัปดาห์)
                      </th>
                      <th scope="col" className="px-3 py-2.5 text-center whitespace-nowrap">
                        จัดในตารางจริง (ชม./สัปดาห์)
                      </th>
                      <th scope="col" className="px-3 py-2.5 text-center whitespace-nowrap">
                        ส่วนต่าง
                      </th>
                      <th scope="col" className="px-3 py-2.5 text-center whitespace-nowrap">
                        สถานะ
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {visibleSubjects.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-4 py-8 text-center text-emerald-600 dark:text-emerald-400 font-medium"
                        >
                          ห้อง {activeRoom.roomName} ทุกรายวิชาจัดตารางสอนตรงตามเกณฑ์หลักสูตรครบถ้วน 100%
                        </td>
                      </tr>
                    ) : (
                      visibleSubjects.map((sub, idx) => (
                        <tr
                          key={`${sub.subjectCode || sub.subjectName}-${idx}`}
                          className="hover:bg-slate-50 dark:hover:bg-[#1a2636]/50 transition-colors"
                        >
                          <td className="px-3 py-2 font-mono font-semibold whitespace-nowrap text-slate-800 dark:text-slate-100">
                            {sub.subjectCode || '-'}
                          </td>
                          <td className="px-3 py-2">
                            <div className="font-semibold text-slate-900 dark:text-white">
                              {sub.subjectName}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                              {sub.subjectGroup}
                            </div>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-slate-600 dark:text-slate-300">
                            {sub.subjectType}
                          </td>
                          <td className="px-3 py-2 text-center font-mono">
                            {sub.requiredHoursPerWeek}
                          </td>
                          <td className="px-3 py-2 text-center font-mono font-bold text-slate-900 dark:text-white">
                            {sub.scheduledHoursPerWeek}
                          </td>
                          <td className="px-3 py-2 text-center font-mono font-semibold">
                            {sub.diffHours === 0
                              ? '0'
                              : sub.diffHours > 0
                                ? `+${sub.diffHours}`
                                : String(sub.diffHours)}
                          </td>
                          <td className="px-3 py-2 text-center whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${getAuditStatusBadgeClass(
                                sub.status
                              )}`}
                            >
                              {AUDIT_STATUS_LABELS[sub.status]}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Clean Informational Strip: School Enrichment & Homeroom */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#101822] border border-slate-200/80 dark:border-slate-800 text-xs flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <Info className="w-4 h-4 text-sky-500 shrink-0" />
                  <span>
                    ชั่วโมงเสริมของโรงเรียน:{' '}
                    {activeRoom.enrichmentItems.length > 0
                      ? activeRoom.enrichmentItems
                          .map((e) => `${e.subjectName} (${e.hoursPerWeek} ชม.)`)
                          .join(', ')
                      : 'ไม่มี'}
                  </span>
                </div>
                <div className="font-mono text-[11px] text-slate-600 dark:text-slate-300">
                  พบครูประจำชั้น: <strong>{activeRoom.homeroomHours}</strong> ชม./สัปดาห์
                </div>
              </div>

              {activeRoom.unmatchedSlots.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 text-xs text-amber-800 dark:text-amber-200">
                  พบรายวิชาในตารางที่ไม่ตรงกับโครงสร้างคลังหลักสูตร:{' '}
                  {activeRoom.unmatchedSlots
                    .map((u) => `${u.subjectName} (${u.hoursPerWeek} ชม.)`)
                    .join(', ')}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sticky Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-3.5 border-t border-slate-200/90 dark:border-slate-800 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 text-xs font-medium transition-colors cursor-pointer"
          >
            ปิด
          </button>
        </div>
      </div>

      {/* SAR A4 Landscape Print Overlay */}
      {isPrintOpen && (
        <CurriculumAuditPrintView report={report} onClose={() => setIsPrintOpen(false)} />
      )}
    </div>
  );
};
