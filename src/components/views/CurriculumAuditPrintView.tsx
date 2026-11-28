'use client';

/**
 * ============================================================================
 * ManStat: SAR Landscape A4 Print View — Curriculum vs. Actual Timetable Audit
 * ============================================================================
 * Phase 12.2:
 * - @page { size: A4 landscape; margin: 10mm; }
 * - Official supervision / SAR report for โรงเรียนชุมชนบ้านตะขบ
 * - Includes 9-room compliance summary table, variance detail table (if any),
 *   and dual signature blocks (หัวหน้าฝ่ายบริหารวิชาการ & ผู้อำนวยการสถานศึกษา).
 * ============================================================================
 */

import React from 'react';
import { Printer, X } from 'lucide-react';
import {
  AUDIT_STATUS_LABELS,
  type SchoolCurriculumAuditReport,
} from '@/lib/regulations/curriculum-audit-utils';

export interface CurriculumAuditPrintViewProps {
  report: SchoolCurriculumAuditReport;
  onClose: () => void;
}

export const CurriculumAuditPrintView: React.FC<CurriculumAuditPrintViewProps> = ({
  report,
  onClose,
}) => {
  const varianceRows = report.rooms.flatMap((room) =>
    room.subjects
      .filter((s) => s.status !== 'match')
      .map((s) => ({ roomName: room.roomName, ...s }))
  );

  return (
    <div className="fixed inset-0 z-[90] bg-slate-900/80 overflow-y-auto print:static print:bg-white print:overflow-visible">
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 10mm; }
          body * { visibility: hidden; }
          #curriculum-audit-print-root, #curriculum-audit-print-root * { visibility: visible; }
          #curriculum-audit-print-root { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>

      {/* Non-printable preview toolbar */}
      <div className="sticky top-0 z-10 bg-slate-900 text-white px-5 py-3 flex items-center justify-between gap-3 border-b border-slate-700 print:hidden">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Printer className="w-4 h-4 text-sky-400 shrink-0" />
          <span>ตัวอย่างก่อนพิมพ์รายงาน SAR ตรวจหลักสูตร vs ตารางสอน (A4 แนวนอน)</span>
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
        id="curriculum-audit-print-root"
        className="max-w-[1120px] mx-auto my-6 print:my-0 print:max-w-none bg-white text-black p-6 print:p-0 shadow-2xl print:shadow-none space-y-5"
      >
        <header className="text-center space-y-0.5">
          <h1 className="text-base font-bold">
            รายงานการตรวจสอบความสอดคล้องโครงสร้างหลักสูตรสถานศึกษากับตารางสอนจริง (SAR)
          </h1>
          <p className="text-xs font-medium">
            โรงเรียนชุมชนบ้านตะขบ · ภาคเรียนที่ {report.semester} ปีการศึกษา {report.academicYear} · ห้องที่ครบตามหลักสูตร{' '}
            {report.stats.compliantRooms}/{report.stats.totalRooms} ห้อง · ความสอดคล้องรวม{' '}
            {report.stats.overallCompliancePercent}% ({report.stats.totalMatchedSubjects}/
            {report.stats.totalRequiredSubjects} รายวิชา)
          </p>
        </header>

        {/* 9-Room Overview Table */}
        <section>
          <h2 className="text-xs font-bold mb-1.5">
            1. สรุปภาพรวมความสอดคล้องรายห้องเรียน (ป.1–ม.3)
          </h2>
          <table className="w-full border-collapse border border-black text-[11px]">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-black px-2 py-1.5 w-16 text-center">ห้องเรียน</th>
                <th className="border border-black px-2 py-1.5 text-center">ระดับการศึกษา</th>
                <th className="border border-black px-2 py-1.5 text-center">เกณฑ์หลักสูตร (ชม./สัปดาห์)</th>
                <th className="border border-black px-2 py-1.5 text-center">จัดตามหลักสูตร (ชม./สัปดาห์)</th>
                <th className="border border-black px-2 py-1.5 text-center">ชั่วโมงเสริมโรงเรียน (ชม.)</th>
                <th className="border border-black px-2 py-1.5 text-center">พบครูประจำชั้น (ชม.)</th>
                <th className="border border-black px-2 py-1.5 text-center">ตรงเกณฑ์ (วิชา)</th>
                <th className="border border-black px-2 py-1.5 text-center">ความสอดคล้อง</th>
                <th className="border border-black px-2 py-1.5 text-center">ผลการตรวจสอบ</th>
              </tr>
            </thead>
            <tbody>
              {report.rooms.map((room) => (
                <tr key={room.roomName}>
                  <td className="border border-black px-2 py-1 text-center font-bold">
                    {room.roomName}
                  </td>
                  <td className="border border-black px-2 py-1 text-center">
                    {room.level === 'secondary' ? 'มัธยมศึกษาตอนต้น' : 'ประถมศึกษา'}
                  </td>
                  <td className="border border-black px-2 py-1 text-center font-mono">
                    {room.requiredTotalHours}
                  </td>
                  <td className="border border-black px-2 py-1 text-center font-mono font-bold">
                    {room.scheduledCurriculumHours}
                  </td>
                  <td className="border border-black px-2 py-1 text-center font-mono">
                    {room.enrichmentHours > 0 ? room.enrichmentHours : '-'}
                  </td>
                  <td className="border border-black px-2 py-1 text-center font-mono">
                    {room.homeroomHours}
                  </td>
                  <td className="border border-black px-2 py-1 text-center font-mono">
                    {room.matchedSubjectsCount}/{room.totalRequiredSubjects}
                  </td>
                  <td className="border border-black px-2 py-1 text-center font-mono font-bold">
                    {room.compliancePercent}%
                  </td>
                  <td className="border border-black px-2 py-1 text-center font-semibold">
                    {room.isCompliant
                      ? 'ครบถ้วนตามหลักสูตร'
                      : `ต้องตรวจสอบ ${room.issueCount + room.unmatchedSlots.length} รายการ`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Variance Details Table (only if issues exist, else clean certification note) */}
        <section>
          <h2 className="text-xs font-bold mb-1.5">
            2. รายละเอียดรายการที่ไม่ตรงเกณฑ์หลักสูตร
          </h2>
          {varianceRows.length === 0 ? (
            <div className="border border-black px-3 py-2 text-xs">
              ไม่พบรายการที่ชั่วโมงไม่ครบ ชั่วโมงเกินเกณฑ์ หรือยังไม่ลงตาราง — ทุกระดับชั้น ป.1–ม.3 จัดตารางสอนสอดคล้องตามโครงสร้างหลักสูตรสถานศึกษาครบถ้วน 100%
            </div>
          ) : (
            <table className="w-full border-collapse border border-black text-[10px]">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-black px-2 py-1 text-center w-14">ห้อง</th>
                  <th className="border border-black px-2 py-1 text-center w-20">รหัสวิชา</th>
                  <th className="border border-black px-2 py-1 text-left">ชื่อรายวิชา</th>
                  <th className="border border-black px-2 py-1 text-center w-20">เกณฑ์ (ชม.)</th>
                  <th className="border border-black px-2 py-1 text-center w-20">จัดจริง (ชม.)</th>
                  <th className="border border-black px-2 py-1 text-center w-16">ส่วนต่าง</th>
                  <th className="border border-black px-2 py-1 text-center w-28">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {varianceRows.map((row, idx) => (
                  <tr key={`${row.roomName}-${row.subjectCode || row.subjectName}-${idx}`}>
                    <td className="border border-black px-2 py-1 text-center font-bold">
                      {row.roomName}
                    </td>
                    <td className="border border-black px-2 py-1 text-center font-mono">
                      {row.subjectCode || '-'}
                    </td>
                    <td className="border border-black px-2 py-1">{row.subjectName}</td>
                    <td className="border border-black px-2 py-1 text-center font-mono">
                      {row.requiredHoursPerWeek}
                    </td>
                    <td className="border border-black px-2 py-1 text-center font-mono">
                      {row.scheduledHoursPerWeek}
                    </td>
                    <td className="border border-black px-2 py-1 text-center font-mono font-bold">
                      {row.diffHours > 0 ? `+${row.diffHours}` : row.diffHours}
                    </td>
                    <td className="border border-black px-2 py-1 text-center">
                      {AUDIT_STATUS_LABELS[row.status]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* Dual Signature Blocks */}
        <footer className="mt-8 grid grid-cols-2 gap-8 pt-4 text-[11px] text-center">
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
