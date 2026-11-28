'use client';

/**
 * ============================================================================
 * ManStat: Landscape A4 Print View for OBEC 38-System Directory & PA Summary
 * ============================================================================
 * Phase 10:
 * - Clean, high-contrast black-on-white Landscape A4 print sheets
 * - Supports:
 *   1. 'obec_directory' — ทำเนียบผู้รับผิดชอบระบบรายงาน สพฐ. 38 ระบบ
 *   2. 'pa_summary'     — รายงานสรุปภาระงานรวมเพื่อประเมินผลการปฏิบัติงาน (PA)
 * ============================================================================
 */

import React from 'react';
import { Printer, X } from 'lucide-react';
import type {
  ObecSystemDirectoryResult,
  PaStaffSummaryResult,
} from '@/lib/regulations/pa-summary-utils';
import type { TimetableSemester } from '@/lib/data/timetableTypes';

export type PaReportPrintMode = 'obec_directory' | 'pa_summary';

export interface PaReportPrintViewProps {
  mode: PaReportPrintMode;
  academicYear: string;
  semester: TimetableSemester;
  directory?: ObecSystemDirectoryResult;
  paSummary?: PaStaffSummaryResult;
  onClose: () => void;
}

export const PaReportPrintView: React.FC<PaReportPrintViewProps> = ({
  mode,
  academicYear,
  semester,
  directory,
  paSummary,
  onClose,
}) => {
  const yearLabel = academicYear === 'ALL' ? 'ทุกปีการศึกษา' : `ปีการศึกษา ${academicYear}`;

  return (
    <div className="fixed inset-0 z-[80] bg-slate-900/80 overflow-y-auto print:static print:bg-white print:overflow-visible">
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 10mm; }
          body * { visibility: hidden; }
          #pa-report-print-root, #pa-report-print-root * { visibility: visible; }
          #pa-report-print-root { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>

      {/* Non-printable preview toolbar */}
      <div className="sticky top-0 z-10 bg-slate-900 text-white px-5 py-3 flex items-center justify-between gap-3 border-b border-slate-700 print:hidden">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Printer className="w-4 h-4 text-sky-400 shrink-0" />
          <span>ตัวอย่างก่อนพิมพ์ (กระดาษ A4 แนวนอน)</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 shrink-0" />
            <span>สั่งพิมพ์ / บันทึก PDF</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer"
          >
            <X className="w-3.5 h-3.5 shrink-0" />
            <span>ปิด</span>
          </button>
        </div>
      </div>

      <div
        id="pa-report-print-root"
        className="max-w-[1120px] mx-auto my-6 print:my-0 print:max-w-none bg-white text-black p-6 print:p-0 shadow-2xl print:shadow-none"
      >
        {mode === 'obec_directory' && directory && (
          <section>
            <header className="text-center mb-4">
              <h1 className="text-base font-bold">
                ทำเนียบผู้รับผิดชอบระบบรายงานสารสนเทศ สพฐ. (38 ระบบ)
              </h1>
              <p className="text-xs font-medium mt-0.5">
                โรงเรียนชุมชนบ้านตะขบ · {yearLabel} · มอบหมายแล้ว {directory.assignedCount}/
                {directory.totalSystems} ระบบ ({directory.coveragePercent}%)
              </p>
            </header>

            <table className="w-full border-collapse border border-black text-[10px]">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-black px-1.5 py-1.5 w-8 text-center">ที่</th>
                  <th className="border border-black px-2 py-1.5 w-28 text-left">รหัสระบบ</th>
                  <th className="border border-black px-2 py-1.5 text-left">ชื่อระบบรายงาน สพฐ.</th>
                  <th className="border border-black px-2 py-1.5 w-32 text-left">ฝ่ายงาน</th>
                  <th className="border border-black px-2 py-1.5 w-44 text-left">ผู้รับผิดชอบหลัก</th>
                  <th className="border border-black px-2 py-1.5 w-40 text-left">ผู้ร่วมรับผิดชอบ</th>
                  <th className="border border-black px-1.5 py-1.5 w-24 text-center">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {directory.items.map((item, idx) => (
                  <tr key={item.code}>
                    <td className="border border-black px-1.5 py-1 text-center font-mono">{idx + 1}</td>
                    <td className="border border-black px-2 py-1 font-mono font-bold">{item.code}</td>
                    <td className="border border-black px-2 py-1">{item.name}</td>
                    <td className="border border-black px-2 py-1">{item.division}</td>
                    <td className="border border-black px-2 py-1 font-medium">
                      {item.primaryStaff.map((s) => s.name).join(', ') || '-'}
                    </td>
                    <td className="border border-black px-2 py-1">
                      {item.coStaff.map((s) => s.name).join(', ') || '-'}
                    </td>
                    <td className="border border-black px-1.5 py-1 text-center">
                      {item.isAssigned ? 'มอบหมายแล้ว' : 'ยังไม่ระบุ'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {mode === 'pa_summary' && paSummary && (
          <section>
            <header className="text-center mb-4">
              <h1 className="text-base font-bold">
                รายงานสรุปภาระงานรวมเพื่อประเมินผลการปฏิบัติงาน (PA) ตามเกณฑ์ ก.ค.ศ. ว 9/2564
              </h1>
              <p className="text-xs font-medium mt-0.5">
                โรงเรียนชุมชนบ้านตะขบ · ภาคเรียนที่ {semester} {yearLabel} · บุคลากรทั้งหมด{' '}
                {paSummary.stats.totalActiveStaff} คน · ผ่านเกณฑ์ ว 9/2564{' '}
                {paSummary.stats.teachersPassingW9} คน · สอนแทนสะสม{' '}
                {paSummary.stats.totalSubstituteHours} ชม.
              </p>
            </header>

            <table className="w-full border-collapse border border-black text-[10px]">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-black px-1.5 py-1.5 w-8 text-center">ที่</th>
                  <th className="border border-black px-2 py-1.5 w-40 text-left">ชื่อ-สกุล</th>
                  <th className="border border-black px-1.5 py-1.5 w-24 text-center">สถานะ ว 9/2564</th>
                  <th className="border border-black px-1.5 py-1.5 w-16 text-center">สอน/สัปดาห์ (ชม.)</th>
                  <th className="border border-black px-1.5 py-1.5 w-16 text-center">สอนแทน (ชม.)</th>
                  <th className="border border-black px-2 py-1.5 w-28 text-left">สังกัดฝ่ายงาน</th>
                  <th className="border border-black px-2 py-1.5 text-left">งานบริหารและโครงการ</th>
                  <th className="border border-black px-2 py-1.5 w-32 text-left">ระบบ สพฐ.</th>
                </tr>
              </thead>
              <tbody>
                {paSummary.rows.map((row, idx) => (
                  <tr key={row.teacherId}>
                    <td className="border border-black px-1.5 py-1 text-center font-mono">{idx + 1}</td>
                    <td className="border border-black px-2 py-1 font-semibold whitespace-nowrap">
                      {row.name}
                    </td>
                    <td className="border border-black px-1.5 py-1 text-center">{row.w9StatusLabel}</td>
                    <td className="border border-black px-1.5 py-1 text-center font-mono font-bold">
                      {row.teachingHoursExclHomeroom}
                    </td>
                    <td className="border border-black px-1.5 py-1 text-center font-mono">
                      {row.substituteHours > 0 ? row.substituteHours : '-'}
                    </td>
                    <td className="border border-black px-2 py-1">
                      {row.divisions.map((d) => d.replace('ฝ่ายบริหาร', '')).join(', ') || '-'}
                    </td>
                    <td className="border border-black px-2 py-1">
                      {[...row.adminRoles, ...row.projects].join(' · ') || '-'}
                    </td>
                    <td className="border border-black px-2 py-1 font-mono">
                      {row.obecSystems.join(', ') || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        <footer className="mt-6 flex justify-end pr-8 pt-2 text-[11px] text-center">
          <div className="space-y-1">
            <div>ลงชื่อ.......................................................................</div>
            <div>(.......................................................................)</div>
            <div>ผู้อำนวยการสถานศึกษา โรงเรียนชุมชนบ้านตะขบ</div>
          </div>
        </footer>
      </div>
    </div>
  );
};
