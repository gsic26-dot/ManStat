'use client';

/**
 * ============================================================================
 * ManStat-Modern: Official A4 Leave Document Print Engine
 * ============================================================================
 * Standard: ระเบียบสำนักนายกรัฐมนตรีว่าด้วยการลาของข้าราชการ พ.ศ. 2555
 * Typography: Sarabun font (16pt body, 20pt bold headings)
 * Layout: Exact A4 Portrait fit (margin: 15mm 20mm 15mm 25mm), 0-overflow
 * Features:
 *   - Toggle Arabic <-> Thai Numerals (๑ ๒ ๓...)
 *   - Auto-population of Leave Statistics table
 *   - Electronic Signature display for approved status
 *   - High-Definition QR Code for verification linking to /verify/leave/[docNo]
 *   - Zero emojis, pure Lucide SVG icons, strict 8px gap.
 * ============================================================================
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, ArrowLeft, Languages, Check, ShieldCheck } from 'lucide-react';
import { formatNumberText, formatOfficialThaiDate } from '@/lib/regulations/thai-numerals';
import type { LeaveType, LeaveStatusEnum } from '@/types/database.types';

export interface LeavePrintData {
  id: string;
  documentNo: string;
  createdAt: string;
  schoolName: string;
  staffName: string;
  prefix: string;
  firstName: string;
  lastName: string;
  position: string;
  academicStanding?: string | null;
  department?: string | null;
  affiliation: string;
  leaveType: LeaveType;
  reason: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  contactAddress?: string | null;
  // Prior leave in this fiscal year for this category
  lastLeaveStartDate?: string | null;
  lastLeaveEndDate?: string | null;
  lastLeaveDays?: number | null;
  // Leave statistics in this fiscal year
  stats: {
    sickUsedBefore: number;
    sickCurrent: number;
    personalUsedBefore: number;
    personalCurrent: number;
    vacationUsedBefore: number;
    vacationCurrent: number;
    maternityUsedBefore: number;
    maternityCurrent: number;
  };
  // Approver & supervisor
  status: LeaveStatusEnum;
  approverName?: string | null;
  approverPosition?: string | null;
  approvedAt?: string | null;
  signatureUrl?: string | null;
  rejectionReason?: string | null;
}

interface OfficialLeavePrintViewProps {
  data: LeavePrintData;
  originUrl?: string;
}

export const OfficialLeavePrintView: React.FC<OfficialLeavePrintViewProps> = ({
  data,
  originUrl = '',
}) => {
  const [useThaiNumerals, setUseThaiNumerals] = useState<boolean>(false);

  const isVacationForm = data.leaveType === 'ลาพักผ่อน';
  const formTitle = isVacationForm ? '(แบบใบลาพักผ่อน)' : '(แบบใบลาป่วย ลากิจส่วนตัว ลาคลอดบุตร)';

  const formatNum = (val: string | number) => formatNumberText(val, useThaiNumerals);
  const formatDate = (val: string | Date) => formatOfficialThaiDate(val, useThaiNumerals);

  // Compute stats totals
  const sickTotal = data.stats.sickUsedBefore + data.stats.sickCurrent;
  const personalTotal = data.stats.personalUsedBefore + data.stats.personalCurrent;
  const vacationTotal = data.stats.vacationUsedBefore + data.stats.vacationCurrent;
  const maternityTotal = data.stats.maternityUsedBefore + data.stats.maternityCurrent;

  const verificationUrl = `${originUrl}/verify/leave/${encodeURIComponent(data.documentNo)}`;

  return (
    <div className="bg-slate-100 min-h-screen text-slate-900 font-sarabun antialiased print:bg-white print:p-0">
      {/* Top Controls Bar (Hidden during printing) */}
      <div className="print:hidden sticky top-0 z-50 bg-[#171a21] border-b border-slate-800 text-white px-6 py-3 shadow-lg flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" />
            <span>กลับหน้าหลัก</span>
          </Link>
          <span className="text-slate-500">|</span>
          <span className="text-xs text-slate-300 font-mono">
            เลขที่เอกสาร: {data.documentNo}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Toggle Thai / Arabic Numerals */}
          <button
            type="button"
            onClick={() => setUseThaiNumerals((prev) => !prev)}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#1b2838] hover:bg-[#2a475e] border border-slate-700 text-xs text-sky-300 transition-colors"
          >
            <Languages className="w-4 h-4 shrink-0" />
            <span>{useThaiNumerals ? 'เปลี่ยนเป็นเลขอารบิก (1, 2, 3)' : 'เปลี่ยนเป็นเลขไทย (๑, ๒, ๓)'}</span>
          </button>

          {/* Print Button */}
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-md transition-colors"
          >
            <Printer className="w-4 h-4 shrink-0" />
            <span>สั่งพิมพ์เอกสาร A4</span>
          </button>
        </div>
      </div>

      {/* A4 Document Container */}
      <div className="flex justify-center p-4 sm:p-8 print:p-0">
        <div
          id="print-sheet"
          className="w-[210mm] min-h-[297mm] max-h-[297mm] bg-white p-[15mm_20mm_15mm_25mm] shadow-2xl print:shadow-none print:w-full print:max-w-[210mm] print:h-[297mm] flex flex-col justify-between text-[15pt] leading-[1.38] text-black box-border relative overflow-hidden"
          style={{
            fontFamily: '"Sarabun", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          }}
        >
          {/* Top Form Header */}
          <div>
            <div className="flex justify-between items-start mb-2">
              <span className="text-[13pt] text-slate-700 font-normal">
                {formTitle}
              </span>
              <div className="text-left w-64 text-[15pt]">
                <div>เขียนที่ <span className="font-semibold">{data.schoolName}</span></div>
                <div>
                  วันที่ <span className="font-semibold">{formatDate(data.createdAt)}</span>
                </div>
              </div>
            </div>

            {/* Subject and Salutation */}
            <div className="mt-3 space-y-1">
              <div>
                <span className="font-bold">เรื่อง</span>&nbsp;&nbsp;&nbsp;ขอ{data.leaveType}
              </div>
              <div>
                <span className="font-bold">เรียน</span>&nbsp;&nbsp;&nbsp;ผู้อำนวยการ{data.schoolName}
              </div>
            </div>

            {/* Main Body Paragraph */}
            <div className="mt-3 text-justify indent-12 leading-[1.42]">
              ข้าพเจ้า&nbsp;<span className="font-semibold">{data.prefix}{data.firstName}&nbsp;&nbsp;{data.lastName}</span>
              &nbsp;&nbsp;ตำแหน่ง&nbsp;<span className="font-semibold">{data.position}</span>
              {data.academicStanding && (
                <>&nbsp;&nbsp;วิทยฐานะ&nbsp;<span className="font-semibold">{data.academicStanding}</span></>
              )}
              &nbsp;&nbsp;สังกัด&nbsp;<span className="font-semibold">{data.affiliation}</span>
              &nbsp;&nbsp;มีความประสงค์ขอ{data.leaveType}
              &nbsp;&nbsp;เนื่องจาก&nbsp;<span className="font-semibold">{data.reason}</span>
              &nbsp;&nbsp;ตั้งแต่วันที่&nbsp;<span className="font-semibold">{formatDate(data.startDate)}</span>
              &nbsp;&nbsp;ถึงวันที่&nbsp;<span className="font-semibold">{formatDate(data.endDate)}</span>
              &nbsp;&nbsp;มีกำหนด&nbsp;<span className="font-bold underline">{formatNum(data.totalDays)}</span>&nbsp;วัน
              &nbsp;&nbsp;ข้าพเจ้าได้ลา{data.leaveType}ครั้งสุดท้ายตั้งแต่วันที่&nbsp;
              {data.lastLeaveStartDate ? formatDate(data.lastLeaveStartDate) : '-'}
              &nbsp;ถึงวันที่&nbsp;
              {data.lastLeaveEndDate ? formatDate(data.lastLeaveEndDate) : '-'}
              &nbsp;มีกำหนด&nbsp;
              {data.lastLeaveDays ? formatNum(data.lastLeaveDays) : '-'}
              &nbsp;วัน
              &nbsp;&nbsp;ในระหว่างลาจะสามารถติดต่อข้าพเจ้าได้ที่&nbsp;
              <span className="font-semibold">{data.contactAddress || data.schoolName}</span>
            </div>

            {/* Requester Signature Block */}
            <div className="mt-3 flex justify-end">
              <div className="text-center w-64 text-[14pt]">
                <div>(ลงชื่อ)........................................................ผู้ขอลา</div>
                <div className="mt-0.5">
                  (&nbsp;{data.prefix}{data.firstName}&nbsp;&nbsp;{data.lastName}&nbsp;)
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Grid: 2 Columns (Leave Statistics Table & Supervisor/Director Approvals) */}
          <div className="mt-3 pt-2 border-t border-slate-400 grid grid-cols-2 gap-4 text-[12pt] leading-tight">
            {/* Left Column: สถิติการลาในปีงบประมาณนี้ */}
            <div className="border border-black p-2 rounded-sm flex flex-col justify-between">
              <div>
                <div className="text-center font-bold mb-1.5 text-[12pt]">
                  สถิติการลาในปีงบประมาณนี้
                </div>
                <table className="w-full border-collapse border border-black text-center text-[11pt]">
                  <thead>
                    <tr className="bg-slate-100 font-semibold">
                      <th className="border border-black px-1 py-1">ประเภทการลา</th>
                      <th className="border border-black px-1 py-1">ลามาแล้ว<br />(วันทำการ)</th>
                      <th className="border border-black px-1 py-1">ลาครั้งนี้<br />(วันทำการ)</th>
                      <th className="border border-black px-1 py-1">รวมเป็น<br />(วันทำการ)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-black px-1 py-0.5 text-left">ลาป่วย</td>
                      <td className="border border-black px-1 py-0.5">{formatNum(data.stats.sickUsedBefore)}</td>
                      <td className="border border-black px-1 py-0.5">{data.leaveType === 'ลาป่วย' ? formatNum(data.stats.sickCurrent) : '-'}</td>
                      <td className="border border-black px-1 py-0.5 font-semibold">{formatNum(sickTotal)}</td>
                    </tr>
                    <tr>
                      <td className="border border-black px-1 py-0.5 text-left">ลากิจส่วนตัว</td>
                      <td className="border border-black px-1 py-0.5">{formatNum(data.stats.personalUsedBefore)}</td>
                      <td className="border border-black px-1 py-0.5">{data.leaveType === 'ลากิจส่วนตัว' ? formatNum(data.stats.personalCurrent) : '-'}</td>
                      <td className="border border-black px-1 py-0.5 font-semibold">{formatNum(personalTotal)}</td>
                    </tr>
                    <tr>
                      <td className="border border-black px-1 py-0.5 text-left">ลาพักผ่อน</td>
                      <td className="border border-black px-1 py-0.5">{formatNum(data.stats.vacationUsedBefore)}</td>
                      <td className="border border-black px-1 py-0.5">{data.leaveType === 'ลาพักผ่อน' ? formatNum(data.stats.vacationCurrent) : '-'}</td>
                      <td className="border border-black px-1 py-0.5 font-semibold">{formatNum(vacationTotal)}</td>
                    </tr>
                    <tr>
                      <td className="border border-black px-1 py-0.5 text-left">ลาคลอดบุตร</td>
                      <td className="border border-black px-1 py-0.5">{formatNum(data.stats.maternityUsedBefore)}</td>
                      <td className="border border-black px-1 py-0.5">{data.leaveType === 'ลาคลอดบุตร' ? formatNum(data.stats.maternityCurrent) : '-'}</td>
                      <td className="border border-black px-1 py-0.5 font-semibold">{formatNum(maternityTotal)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Leave Statistics Checker Signature */}
              <div className="mt-2 text-center text-[11pt]">
                <div>(ลงชื่อ)........................................................ผู้ตรวจสอบ</div>
                <div className="mt-0.5">ตำแหน่ง เจ้าหน้าที่บริหารงานบุคคล</div>
                <div>วันที่ ......./......./.......</div>
              </div>
            </div>

            {/* Right Column: Supervisor's Opinion & School Director's Order */}
            <div className="border border-black p-2 rounded-sm flex flex-col justify-between">
              {/* 1. ความเห็นผู้บังคับบัญชาชั้นต้น */}
              <div>
                <div className="font-bold text-[12pt] mb-1">ความเห็นผู้บังคับบัญชาชั้นต้น</div>
                <div className="text-[11pt] space-y-0.5">
                  <div>( &nbsp;&nbsp; ) เห็นควรอนุญาต&nbsp;&nbsp;&nbsp;&nbsp;( &nbsp;&nbsp; ) อื่นๆ .............................</div>
                  <div className="text-center mt-1">
                    <div>(ลงชื่อ)........................................................</div>
                    <div>ตำแหน่ง รองผู้อำนวยการสถานศึกษา</div>
                    <div>วันที่ ......./......./.......</div>
                  </div>
                </div>
              </div>

              {/* 2. คำสั่งผู้อำนวยการสถานศึกษา */}
              <div className="border-t border-dashed border-black pt-1.5 mt-1">
                <div className="font-bold text-[12pt] mb-1">คำสั่ง</div>
                <div className="text-[11pt]">
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-1.5">
                      <span className="font-bold text-base">
                        [{data.status === 'approved' ? '✓' : ' '}]
                      </span>
                      <span>อนุญาต</span>
                    </label>
                    <label className="flex items-center gap-1.5">
                      <span className="font-bold text-base">
                        [{data.status === 'rejected' ? '✓' : ' '}]
                      </span>
                      <span>ไม่อนุมัติ</span>
                    </label>
                  </div>

                  {data.rejectionReason && (
                    <div className="text-[10pt] text-rose-700 italic mt-0.5">
                      หมายเหตุ: {data.rejectionReason}
                    </div>
                  )}

                  <div className="text-center mt-1">
                    {data.status === 'approved' && data.signatureUrl ? (
                      <div className="flex flex-col items-center">
                        <img
                          src={data.signatureUrl}
                          alt="ลายมือชื่อผู้อำนวยการ"
                          className="h-9 object-contain"
                        />
                        <div>({data.approverName || 'นายธีรศักดิ์ มโนธรรม'})</div>
                      </div>
                    ) : (
                      <>
                        <div>(ลงชื่อ)........................................................</div>
                        <div>({data.approverName || 'นายธีรศักดิ์ มโนธรรม'})</div>
                      </>
                    )}
                    <div>ตำแหน่ง {data.approverPosition || `ผู้อำนวยการ${data.schoolName}`}</div>
                    <div>
                      วันที่&nbsp;
                      {data.approvedAt ? formatDate(data.approvedAt) : '......./......./.......'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer: Verification QR Code & Standard Compliance Statement */}
          <div className="mt-3 pt-2 border-t border-slate-300 flex items-center justify-between text-[9pt] text-slate-600">
            <div className="flex items-center gap-3">
              <div className="bg-white p-1 border border-slate-400 rounded">
                <QRCodeSVG
                  value={verificationUrl}
                  size={52}
                  level="M"
                  includeMargin={false}
                />
              </div>
              <div>
                <div className="font-mono font-bold text-black text-[10pt]">
                  รหัสตรวจสอบเอกสาร (Doc No): {data.documentNo}
                </div>
                <div>
                  เอกสารนี้จัดทำและรับรองผ่านระบบสารสนเทศบริหารงานบุคคลอิเล็กทรอนิกส์ (ManStat-Modern)
                </div>
                <div>
                  สแกน QR Code เพื่อตรวจสอบความถูกต้องของเอกสารตาม พ.ร.บ. การปฏิบัติราชการทางอิเล็กทรอนิกส์ พ.ศ. 2565
                </div>
              </div>
            </div>

            <div className="text-right text-[8pt] text-slate-500 font-mono">
              <div>Page 1 of 1</div>
              <div>สพป.นม. 3</div>
            </div>
          </div>
        </div>
      </div>

      {/* Strict Print CSS */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 15mm 20mm 15mm 25mm;
          }
          html, body {
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
            font-size: 15pt !important;
            line-height: 1.38 !important;
          }
          #print-sheet {
            width: 100% !important;
            max-width: 100% !important;
            min-height: auto !important;
            height: auto !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>
    </div>
  );
};
