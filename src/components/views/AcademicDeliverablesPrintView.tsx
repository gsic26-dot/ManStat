'use client';

/**
 * ============================================================================
 * ManStat: Landscape A4 Print View — Academic Deliverables Tracker (Phase 12.3)
 * ============================================================================
 * - @page { size: A4 landscape; margin: 10mm; }
 * - Official supervision report for แผนการจัดการเรียนรู้ & ปพ.5 (โรงเรียนชุมชนบ้านตะขบ)
 * - Includes dual signature blocks (หัวหน้าฝ่ายบริหารวิชาการ & ผู้อำนวยการสถานศึกษา).
 * ============================================================================
 */

import React from 'react';
import { Printer, X } from 'lucide-react';
import type { TimetableSemester } from '@/lib/data/timetableTypes';
import {
  DELIVERABLE_STATUS_LABELS,
  type AcademicDeliverableSummary,
} from '@/lib/regulations/academic-deliverables-utils';

export interface AcademicDeliverablesPrintViewProps {
  academicYear: string;
  semester: TimetableSemester;
  summary: AcademicDeliverableSummary;
  onClose: () => void;
}

export const AcademicDeliverablesPrintView: React.FC<AcademicDeliverablesPrintViewProps> = ({
  academicYear,
  semester,
  summary,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-[90] bg-slate-900/80 overflow-y-auto print:static print:bg-white print:overflow-visible">
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 10mm; }
          body * { visibility: hidden; }
          #deliverables-print-root, #deliverables-print-root * { visibility: visible; }
          #deliverables-print-root { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>

      {/* Non-printable preview toolbar */}
      <div className="sticky top-0 z-10 bg-slate-900 text-white px-5 py-3 flex items-center justify-between gap-3 border-b border-slate-700 print:hidden">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Printer className="w-4 h-4 text-sky-400 shrink-0" />
          <span>ตัวอย่างก่อนพิมพ์รายงานติดตามการส่งแผนการสอน / ปพ.5 (A4 แนวนอน)</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 shrink-0" />
            <span>สั่งพิมพ์ / บันทึก PDF</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer"
          >
            <X className="w-3.5 h-3.5 shrink-0" />
            <span>ปิด</span>
          </button>
        </div>
      </div>

      {/* Printable A4 Landscape Sheet */}
      <div
        id="deliverables-print-root"
        className="max-w-[1120px] mx-auto my-6 print:my-0 print:max-w-none bg-white text-black p-6 print:p-0 shadow-2xl print:shadow-none space-y-4"
      >
        <header className="text-center space-y-0.5">
          <h1 className="text-base font-bold">
            รายงานติดตามการส่งแผนการจัดการเรียนรู้ และสมุดบันทึกผลการเรียน (ปพ.5)
          </h1>
          <p className="text-xs font-medium">
            โรงเรียนชุมชนบ้านตะขบ · ภาคเรียนที่ {semester} ปีการศึกษา {academicYear} · รายการสอนทั้งหมด{' '}
            {summary.stats.totalAssignments} รายการ · ส่งแผนแล้ว {summary.stats.lessonPlanSubmitted} · ส่ง ปพ.5 แล้ว{' '}
            {summary.stats.gradebookSubmitted} · ครบถ้วน {summary.stats.fullyCompletedCount} รายการ (
            {summary.stats.completionRatePercent}%)
          </p>
        </header>

        <table className="w-full border-collapse border border-black text-[10px]">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-black px-1.5 py-1.5 w-8 text-center">ที่</th>
              <th className="border border-black px-2 py-1.5 w-44 text-left">ชื่อ-สกุล</th>
              <th className="border border-black px-1.5 py-1.5 w-14 text-center">ชั้น</th>
              <th className="border border-black px-2 py-1.5 w-20 text-center">รหัสวิชา</th>
              <th className="border border-black px-2 py-1.5 text-left">รายวิชา</th>
              <th className="border border-black px-1.5 py-1.5 w-14 text-center">ชม./สัปดาห์</th>
              <th className="border border-black px-2 py-1.5 w-24 text-center">แผนการสอน</th>
              <th className="border border-black px-2 py-1.5 w-24 text-center">ปพ.5</th>
              <th className="border border-black px-2 py-1.5 w-40 text-left">หมายเหตุ</th>
            </tr>
          </thead>
          <tbody>
            {summary.rows.map((row, idx) => (
              <tr key={row.key}>
                <td className="border border-black px-1.5 py-1 text-center font-mono">{idx + 1}</td>
                <td className="border border-black px-2 py-1 font-semibold whitespace-nowrap">
                  {row.teacherName}
                </td>
                <td className="border border-black px-1.5 py-1 text-center font-bold">
                  {row.roomName}
                </td>
                <td className="border border-black px-2 py-1 text-center font-mono">
                  {row.subjectCode || '-'}
                </td>
                <td className="border border-black px-2 py-1">
                  {row.subjectName}
                  {row.isCoTeaching ? ' (สอนร่วม)' : ''}
                </td>
                <td className="border border-black px-1.5 py-1 text-center font-mono">
                  {row.weeklyHours}
                </td>
                <td className="border border-black px-2 py-1 text-center">
                  {DELIVERABLE_STATUS_LABELS[row.lessonPlanStatus]}
                </td>
                <td className="border border-black px-2 py-1 text-center">
                  {DELIVERABLE_STATUS_LABELS[row.gradebookStatus]}
                </td>
                <td className="border border-black px-2 py-1">{row.remarks || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Dual Signature Blocks */}
        <footer className="mt-6 grid grid-cols-2 gap-8 pt-4 text-[11px] text-center">
          <div className="space-y-1">
            <div>ลงชื่อ....................................................................... ผู้ตรวจสอบ</div>
            <div>(.......................................................................)</div>
            <div>หัวหน้าฝ่ายบริหารวิชาการ โรงเรียนชุมชนบ้านตะขบ</div>
          </div>
          <div className="space-y-1">
            <div>ลงชื่อ....................................................................... ผู้รับรอง</div>
            <div>(.......................................................................)</div>
            <div>ผู้อำนวยการสถานศึกษา โรงเรียนชุมชนบ้านตะขบ</div>
          </div>
        </footer>
      </div>
    </div>
  );
};
