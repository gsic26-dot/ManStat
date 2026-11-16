'use client';

/**
 * ============================================================================
 * ManStat-Modern: Official A4 Leave Document Print Engine (แฟ้ม บค 4/1)
 * ============================================================================
 * Standard: ระเบียบสำนักนายกรัฐมนตรีว่าด้วยการลาของข้าราชการ พ.ศ. 2555
 * Template: แฟ้ม บค 4/1 (Exact Restoration from Legacy GAS System)
 * Typography: Sarabun font (Official Thai Bureaucratic Standards)
 * Layout: Exact A4 Portrait fit (210mm x 297mm, Safe bounds: 190mm x 272mm)
 * Guarantee: STRICT SINGLE PAGE (Zero-Overflow, No 2nd page spill)
 * Features:
 *   - แฟ้ม บค 4/1 Header with Official School Receipt Box (เลขที่รับ/วันที่/เวลา/ผู้รับ)
 *   - Structured Checkbox options: [ ] ป่วย [ ] กิจส่วนตัว [ ] คลอดบุตร
 *   - Prior Leave Records & Substitute Teacher Assignment
 *   - Split Bottom Grid:
 *       • Left: สถิติการลาในปีงบประมาณนี้ + ลายมือชื่อผู้ตรวจสอบ (นางสาวทัชชกร ช่วยจังหรีด)
 *       • Right: ขอแสดงความนับถือ (ผู้ขอลา) + ความเห็นผู้บังคับบัญชา + คำสั่ง ผอ. ([ ] อนุญาต / [ ] ไม่อนุญาต)
 *   - Toggle Arabic <-> Thai Numerals (๑ ๒ ๓...)
 *   - Zero emojis, Pure Lucide SVG Icons, 8px standard gap
 * ============================================================================
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, ArrowLeft, Languages } from 'lucide-react';
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
  substituteTeacher?: string | null;
  // Prior leave in this fiscal year
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

  const formatNum = (val: string | number) => formatNumberText(val, useThaiNumerals);
  const formatDate = (val: string | Date) => formatOfficialThaiDate(val, useThaiNumerals);

  const isSick = data.leaveType === 'ลาป่วย';
  const isPersonal = (data.leaveType as string) === 'ลากิจส่วนตัว' || (data.leaveType as string) === 'ลากิจ';
  const isMaternity = data.leaveType === 'ลาคลอดบุตร';
  const isVacation = data.leaveType === 'ลาพักผ่อน';

  const isApproved = data.status === 'approved';
  const isRejected = data.status === 'rejected';

  // Compute leave statistics
  const priorSick = data.stats.sickUsedBefore;
  const curSick = isSick ? data.totalDays : 0;
  const totSick = priorSick + curSick;

  const priorPers = data.stats.personalUsedBefore;
  const curPers = isPersonal ? data.totalDays : 0;
  const totPers = priorPers + curPers;

  const schoolTitle = data.schoolName || 'โรงเรียนชุมชนบ้านตะขบ';
  const directorTitle = data.approverName || 'นายธีรศักดิ์ มโนธรรม';
  const directorPos = data.approverPosition || `ผู้อำนวยการ${schoolTitle}`;

  const BoxCheck: React.FC<{ checked?: boolean }> = ({ checked }) => (
    <span className="inline-block w-[13px] h-[13px] border border-black text-center leading-[12px] text-[11px] font-bold align-middle mx-1">
      {checked ? '✓' : '\u00A0'}
    </span>
  );

  return (
    <div className="bg-slate-100 min-h-screen text-slate-900 font-sarabun antialiased print:bg-white print:p-0">
      {/* Top Controls Bar (Hidden during printing) */}
      <div className="print:hidden sticky top-0 z-50 bg-[#141a24] border-b border-slate-800 text-white px-6 py-3 shadow-lg flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" />
            <span>กลับหน้าหลัก</span>
          </Link>
          <span className="text-slate-600">|</span>
          <span className="text-xs text-slate-300 font-mono">
            เลขที่เอกสาร: {data.documentNo}
          </span>
          <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
            แฟ้ม บค 4/1 (A4 แนวตั้ง 1 หน้าพอดี)
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
            <span>สั่งพิมพ์ A4</span>
          </button>
        </div>
      </div>

      {/* A4 Document Viewport */}
      <div className="flex justify-center p-4 sm:p-8 print:p-0">
        <div
          id="print-sheet"
          className="w-[210mm] h-[297mm] max-h-[297mm] bg-white p-[12mm_14mm_10mm_14mm] shadow-2xl print:shadow-none print:w-[210mm] print:h-[297mm] print:p-[12mm_14mm_10mm_14mm] flex flex-col justify-between text-[13px] leading-[1.48] text-black box-border relative overflow-hidden"
          style={{
            fontFamily: '"Sarabun", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          }}
        >
          {/* ================================================================= */}
          {/* UPPER SECTION: HEADER, TITLE, SUBJECT, BODY                      */}
          {/* ================================================================= */}
          <div>
            {/* Top Row: แฟ้ม บค 4/1 & Receipt Box */}
            <div className="flex justify-between items-start mb-2">
              <div className="font-bold text-[13.5px] pt-1">
                แฟ้ม บค 4/1
              </div>
              <div className="border border-black p-2 w-[235px] text-[11.5px] leading-[1.45]">
                <div className="text-center font-bold border-b border-black pb-0.5 mb-1">
                  {schoolTitle}
                </div>
                <div>เลขที่รับ ....................................................</div>
                <div>วันที่ ............ / ........................ / .............</div>
                <div>เวลา ................. น. ผู้รับ .......................</div>
              </div>
            </div>

            {/* Document Title */}
            <div className="text-center font-bold text-[16.5px] my-1">
              ใบลาป่วย ลาคลอดบุตร ลากิจส่วนตัว
            </div>

            {/* Location & Date */}
            <div className="text-right text-[13px] leading-[1.45] mb-2">
              เขียนที่ &nbsp;<b>{schoolTitle}</b><br />
              วันที่ <b>{formatDate(data.createdAt)}</b>
            </div>

            {/* Subject and Salutation */}
            <div className="text-[13px] leading-[1.5] space-y-0.5 mb-2">
              <div><b>เรื่อง</b> &nbsp;ขอ{data.leaveType}</div>
              <div><b>เรียน</b> &nbsp;ผู้อำนวยการ{schoolTitle}</div>
            </div>

            {/* Main Body Paragraph */}
            <div className="text-[13px] leading-[1.58] text-justify space-y-1">
              <div className="indent-10">
                ข้าพเจ้า &nbsp;<b>{data.prefix}{data.firstName}&nbsp;&nbsp;{data.lastName}</b>
                &nbsp;&nbsp;&nbsp;ตำแหน่ง &nbsp;<b>{data.position}</b>
                {data.academicStanding && (
                  <>&nbsp;&nbsp;วิทยฐานะ &nbsp;<b>{data.academicStanding}</b></>
                )}
              </div>
              <div>
                สังกัด &nbsp;<b>{data.affiliation}</b>
              </div>

              {/* Checkboxes for Leave Type */}
              <div className="mt-1 pl-5">
                <div>
                  ขอลา &nbsp;&nbsp;<BoxCheck checked={isSick} /> ป่วย &nbsp;เนื่องจาก <u>{isSick ? data.reason : '...................................................................................................'}</u>
                </div>
                <div className="pl-9">
                  <BoxCheck checked={isPersonal} /> กิจส่วนตัว &nbsp;เนื่องจาก <u>{isPersonal ? data.reason : '...................................................................................................'}</u>
                </div>
                <div className="pl-9">
                  <BoxCheck checked={isMaternity} /> คลอดบุตร
                </div>
              </div>

              {/* Leave Range */}
              <div className="mt-1">
                ตั้งแต่วันที่ <b>{formatDate(data.startDate)}</b> &nbsp;ถึงวันที่ <b>{formatDate(data.endDate)}</b> &nbsp;มีกำหนด <b>{formatNum(data.totalDays)}</b> วัน
              </div>

              {/* Prior Leave Record */}
              <div>
                ข้าพเจ้าได้ลา &nbsp;<BoxCheck checked={data.lastLeaveDays ? isSick : false} /> ป่วย &nbsp;<BoxCheck checked={data.lastLeaveDays ? isPersonal : false} /> กิจส่วนตัว &nbsp;<BoxCheck checked={false} /> คลอดบุตร &nbsp;ครั้งสุดท้ายตั้งแต่วันที่ <b>{data.lastLeaveStartDate ? formatDate(data.lastLeaveStartDate) : '.......................................'}</b> ถึงวันที่ <b>{data.lastLeaveEndDate ? formatDate(data.lastLeaveEndDate) : '.......................................'}</b> มีกำหนด <b>{data.lastLeaveDays ? formatNum(data.lastLeaveDays) : '........'}</b> วัน
              </div>

              {/* Contact Information & Substitute Teacher */}
              <div className="mt-0.5">
                ในระหว่างลาจะติดต่อข้าพเจ้าได้ที่ <u>{data.contactAddress || schoolTitle}</u><br />
                (มอบหมายผู้สอนแทน: <u>{data.substituteTeacher || '................................................................................'}</u>)
              </div>
            </div>
          </div>

          {/* ================================================================= */}
          {/* LOWER SECTION: 2 COLUMNS (LEAVE STATS & APPROVALS)                */}
          {/* ================================================================= */}
          <div className="mt-2 pt-2 border-t border-black">
            <table className="w-full border-collapse border-none">
              <tbody>
                <tr>
                  {/* Left Column (48%): สถิติการลาในปีงบประมาณนี้ & ผู้ตรวจสอบ */}
                  <td className="w-[48%] align-top pr-3 border-none text-left">
                    <div className="font-bold text-center mb-1 text-[13px]">
                      สถิติการลาในปีงบประมาณนี้
                    </div>
                    <table className="w-full border-collapse border border-black text-center text-[12px]">
                      <thead>
                        <tr className="bg-slate-50 font-bold">
                          <th className="border border-black p-1">ประเภทลา</th>
                          <th className="border border-black p-1">ลามาแล้ว</th>
                          <th className="border border-black p-1">ลาครั้งนี้</th>
                          <th className="border border-black p-1">รวมเป็น</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-black p-1 text-center">ป่วย</td>
                          <td className="border border-black p-1">{priorSick > 0 ? formatNum(priorSick) : '-'}</td>
                          <td className="border border-black p-1">{curSick > 0 ? formatNum(curSick) : '-'}</td>
                          <td className="border border-black p-1 font-bold">{totSick > 0 ? formatNum(totSick) : '-'}</td>
                        </tr>
                        <tr>
                          <td className="border border-black p-1 text-center">กิจส่วนตัว</td>
                          <td className="border border-black p-1">{priorPers > 0 ? formatNum(priorPers) : '-'}</td>
                          <td className="border border-black p-1">{curPers > 0 ? formatNum(curPers) : '-'}</td>
                          <td className="border border-black p-1 font-bold">{totPers > 0 ? formatNum(totPers) : '-'}</td>
                        </tr>
                        <tr>
                          <td className="border border-black p-1 text-center">คลอดบุตร</td>
                          <td className="border border-black p-1">-</td>
                          <td className="border border-black p-1">-</td>
                          <td className="border border-black p-1">-</td>
                        </tr>
                      </tbody>
                    </table>

                    {/* ผู้ตรวจสอบสถิติการลา (นางสาวทัชชกร ช่วยจังหรีด) */}
                    <div className="text-center mt-7 text-[12.5px] leading-[1.5]">
                      <div>ลงชื่อ....................................................... ผู้ตรวจสอบ</div>
                      <div className="mt-0.5">(นางสาวทัชชกร ช่วยจังหรีด)</div>
                      <div>ตำแหน่ง ครูชำนาญการพิเศษ</div>
                      <div className="mt-0.5">วันที่ .......... เดือน ........................ พ.ศ. .............</div>
                    </div>
                  </td>

                  {/* Right Column (52%): ขอแสดงความนับถือ & คำสั่งผู้อำนวยการ */}
                  <td className="w-[52%] align-top pl-3 border-none text-center">
                    {/* ขอแสดงความนับถือ (ผู้ขอลา) */}
                    <div className="text-[13px] leading-[1.45]">
                      <div>ขอแสดงความนับถือ</div>
                      <div className="my-3">ลงชื่อ.......................................................</div>
                      <div>( <b>{data.prefix}{data.firstName}&nbsp;&nbsp;{data.lastName}</b> )</div>
                      <div>ตำแหน่ง <b>{data.position}</b></div>
                    </div>

                    {/* ความเห็นของผู้บังคับบัญชา */}
                    <div className="mt-2.5 text-left border-t border-dashed border-black pt-1.5 text-[12.5px]">
                      <div className="font-bold underline">ความเห็นของผู้บังคับบัญชา</div>
                      <div className="border-b border-dotted border-black h-[18px] mt-1 text-center text-[12px]">
                        {isApproved ? 'อนุญาตให้ลาได้ตามสิทธิ์' : ''}
                      </div>
                      <div className="text-center mt-2 leading-[1.4]">
                        <div>ลงชื่อ.......................................................</div>
                        <div>({directorTitle})</div>
                        <div>ตำแหน่ง {directorPos}</div>
                      </div>
                    </div>

                    {/* คำสั่งผู้อำนวยการ */}
                    <div className="mt-2 text-left border-t border-dashed border-black pt-1.5 text-[12.5px]">
                      <div className="font-bold underline">คำสั่ง</div>
                      <div className="text-center my-1">
                        <BoxCheck checked={isApproved} /> อนุญาต &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                        <BoxCheck checked={isRejected} /> ไม่อนุญาต
                      </div>
                      <div className="text-center mt-2 leading-[1.4]">
                        <div>ลงชื่อ.......................................................</div>
                        <div>({directorTitle})</div>
                        <div>ตำแหน่ง {directorPos}</div>
                        <div className="mt-0.5">วันที่ .......... เดือน ........................ พ.ศ. .............</div>
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* =============================================================== */}
          {/* FOOTER: QR CODE VERIFICATION SEAL (ตรวจสอบเอกสารดิจิทัล)       */}
          {/* =============================================================== */}
          <div className="border-t border-dashed border-slate-600 pt-1.5 mt-1 flex items-center justify-between text-[11px] leading-[1.35] text-slate-700">
            <div className="flex items-center gap-2.5">
              <div className="bg-white p-0.5 border border-black inline-block">
                <QRCodeSVG
                  value={`${originUrl}/verify/leave/${encodeURIComponent(data.documentNo)}`}
                  size={46}
                  level="M"
                />
              </div>
              <div>
                <div className="font-bold text-black text-[11.5px]">
                  สแกนเพื่อตรวจสอบความถูกต้องของเอกสารราชการ (Digital Verification)
                </div>
                <div className="text-[10px] text-slate-600 font-mono">
                  รหัสเอกสาร: <b>{data.documentNo}</b> | ตรวจสอบผ่านระบบ ManStat โรงเรียนชุมชนบ้านตะขบ
                </div>
                <div className="text-[9.5px] text-slate-500">
                  สังกัดสำนักงานเขตพื้นที่การศึกษาประถมศึกษานครราชสีมา เขต 3
                </div>
              </div>
            </div>
            <div className="text-right text-[10px] text-slate-500">
              <div>เอกสารต้นฉบับทางราชการ</div>
              <div className="font-bold text-sky-700">หน้า 1 / 1 (A4)</div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
