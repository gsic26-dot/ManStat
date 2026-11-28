'use client';

/**
 * ============================================================================
 * ManStat: Official A4 Leave & Permission Document Print Engine
 * ============================================================================
 * Standard:
 *   1. แฟ้ม บค 4/1: ระเบียบสำนักนายกรัฐมนตรีว่าด้วยการลาของข้าราชการ พ.ศ. 2555 (11 ประเภท)
 *   2. แบบขออนุญาตออกนอกบริเวณโรงเรียนในเวลาราชการ (กรณีไม่เกิน 3 ชั่วโมง)
 *   3. แบบขออนุญาตไปราชการ / ออกนอกสถานที่เพื่อไปราชการ (ไม่จำกัดเพดาน 3 ชม.)
 *
 * Typography: Sarabun font (Official Thai Bureaucratic Standards)
 * Layout: Strict A4 Portrait fit (210mm x 297mm, Single-page guarantee)
 * Features:
 *   - Auto-switches template layout based on leave type
 *   - Toggle Arabic <-> Thai Numerals (๑ ๒ ๓...)
 *   - QR Code Digital Verification Seal
 *   - Zero emojis, Pure Lucide SVG Icons, 8px standard gap
 * ============================================================================
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, ArrowLeft, Languages } from 'lucide-react';
import { formatNumberText, formatOfficialThaiDate } from '@/lib/regulations/thai-numerals';
import { isSchoolExitPermit, isOfficialMission } from '@/lib/regulations/leaveTypes';
import { getLeaveCountingRule } from '@/lib/regulations/leave-calculator';
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
  leaveType: LeaveType | string;
  reason: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  contactAddress?: string | null;
  substituteTeacher?: string | null;
  // Specific fields for permit / official mission
  startTime?: string | null;
  endTime?: string | null;
  totalHours?: number | null;
  destination?: string | null;
  officialOrderNo?: string | null;
  hasWorkload?: 'มี' | 'ไม่มี' | null;
  workloads?: Array<{ cls?: string; period?: string; task?: string; sub?: string }> | null;
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
  inspectorName?: string | null;
  inspectorPosition?: string | null;
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
  const [useThaiNumerals, setUseThaiNumerals] = useState<boolean>(true);

  const formatNum = (val: string | number) => formatNumberText(val, useThaiNumerals);
  const formatDate = (val: string | Date) => formatOfficialThaiDate(val, useThaiNumerals);

  const isExit = isSchoolExitPermit(data.leaveType);
  const isMission = isOfficialMission(data.leaveType);

  const isSick = data.leaveType === 'ลาป่วย';
  const isPersonal =
    (data.leaveType as string) === 'ลากิจส่วนตัว' ||
    (data.leaveType as string) === 'ลากิจ';
  const isMaternity = data.leaveType === 'ลาคลอดบุตร';

  const isApproved = data.status === 'approved';
  const isRejected = data.status === 'rejected';

  // Compute leave statistics
  const priorSick = data.stats.sickUsedBefore;
  const curSick = isSick ? data.totalDays : 0;
  const totSick = priorSick + curSick;

  const priorPers = data.stats.personalUsedBefore;
  const curPers = isPersonal ? data.totalDays : 0;
  const totPers = priorPers + curPers;

  const priorMat = data.stats.maternityUsedBefore || 0;
  const curMat = isMaternity ? data.totalDays : 0;
  const totMat = priorMat + curMat;

  const countingRule = getLeaveCountingRule(String(data.leaveType || ''));
  const dayUnitText =
    countingRule?.calculationCountingMode === 'continuous'
      ? 'วัน (นับต่อเนื่อง)'
      : 'วันทำการ';

  const schoolTitle = data.schoolName || 'โรงเรียนชุมชนบ้านตะขบ';
  const directorTitle = data.approverName || 'นายธีรศักดิ์ มโนธรรม';
  const directorPos = data.approverPosition || `ผู้อำนวยการ${schoolTitle}`;

  const BoxCheck: React.FC<{ checked?: boolean }> = ({ checked }) => (
    <span className="inline-block w-[13px] h-[13px] border border-black text-center leading-[12px] text-[11px] font-bold align-middle mx-1">
      {checked ? '✓' : '\u00A0'}
    </span>
  );

  return (
    <div className="bg-slate-100 dark:bg-slate-950 min-h-screen text-slate-900 font-sarabun antialiased print:bg-white print:p-0">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page {
                size: A4 portrait;
                margin: 0;
              }
              html, body {
                background: #ffffff !important;
                color: #000000 !important;
                margin: 0 !important;
                padding: 0 !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
          `,
        }}
      />
      {/* Top Controls Bar (Hidden during printing) */}
      <div className="print:hidden sticky top-0 z-50 bg-white dark:bg-[#141a24] border-b border-slate-200/90 dark:border-slate-800 text-slate-800 dark:text-white px-6 py-3 shadow-sm flex items-center justify-between transition-colors duration-200">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 border border-slate-200/90 dark:bg-[#121822] dark:hover:bg-slate-800/70 dark:text-slate-300 dark:hover:text-white dark:border-slate-800/80 text-xs font-medium transition-colors duration-200"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" />
            <span>กลับหน้าหลัก</span>
          </Link>
          <span className="text-slate-300 dark:text-slate-600">|</span>
          <span className="text-xs text-slate-500 dark:text-slate-300 font-mono">
            เลขที่เอกสาร: {data.documentNo}
          </span>
          <span className="text-xs text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/30 px-2 py-0.5 rounded border">
            {isExit
              ? 'แบบขออนุญาตออกนอกบริเวณโรงเรียน (<= 3 ชม.)'
              : isMission
              ? 'แบบขออนุญาตไปราชการ'
              : 'แฟ้ม บค 4/1 (A4 แนวตั้ง 1 หน้า)'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Toggle Thai / Arabic Numerals */}
          <button
            type="button"
            onClick={() => setUseThaiNumerals((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-[#1a2332] dark:hover:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-medium transition-colors"
            title="สลับการแสดงผลตัวเลขอารบิกและตัวเลขไทย (๑ ๒ ๓)"
          >
            <Languages className="w-4 h-4 shrink-0" />
            <span>{useThaiNumerals ? 'ใช้เลขอารบิก (1 2 3)' : 'ใช้เลขไทย (๑ ๒ ๓)'}</span>
          </button>

          {/* Print Trigger */}
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium border border-transparent transition-colors duration-200"
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
          className="w-[210mm] h-[297mm] max-h-[297mm] bg-white p-[10mm_14mm_10mm_14mm] shadow-2xl print:shadow-none print:w-[210mm] print:h-[297mm] print:p-[10mm_14mm_10mm_14mm] flex flex-col justify-between text-[13px] leading-[1.48] text-black box-border relative overflow-hidden"
          style={{
            fontFamily: '"Sarabun", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          }}
        >
          {/* ================================================================= */}
          {/* TEMPLATE 1: แบบขออนุญาตออกนอกบริเวณโรงเรียน (กรณีไม่เกิน 3 ชั่วโมง) */}
          {/* ================================================================= */}
          {isExit ? (
            <div>
              <div className="text-center font-bold text-[15px] leading-tight mb-2">
                แบบขออนุญาตออกนอกบริเวณโรงเรียนในเวลาราชการของข้าราชการครูและบุคลากรทางการศึกษา
                <br />
                (กรณีไม่เกิน 3 ชั่วโมง)
              </div>

              <div className="text-right text-[13px] leading-[1.45] mb-2">
                เขียนที่ &nbsp;<b>{schoolTitle}</b>
                <br />
                วันที่ <b>{formatDate(data.createdAt)}</b>
              </div>

              <div className="text-[13px] leading-[1.5] space-y-0.5 mb-2">
                <div>
                  <b>เรื่อง</b> &nbsp;ขออนุญาตออกนอกบริเวณโรงเรียน
                </div>
                <div>
                  <b>เรียน</b> &nbsp;ผู้อำนวยการ{schoolTitle}
                </div>
              </div>

              <div className="text-[13px] leading-[1.65] text-justify space-y-1">
                <div className="indent-10">
                  ข้าพเจ้า &nbsp;<b>{data.prefix}{data.firstName}&nbsp;&nbsp;{data.lastName}</b>
                  &nbsp;&nbsp;&nbsp;ตำแหน่ง &nbsp;<b>{data.position}</b>
                  {data.academicStanding && (
                    <>&nbsp;&nbsp;วิทยฐานะ &nbsp;<b>{data.academicStanding}</b></>
                  )}
                </div>
                <div>
                  ขออนุญาตออกนอกบริเวณโรงเรียน เพื่อ &nbsp;<u>{data.reason}</u>
                  <br />
                  ในวันที่ <b>{formatDate(data.startDate)}</b> &nbsp;ระหว่างเวลา{' '}
                  <b>{data.startTime ? formatNum(data.startTime) : '..........'}</b> น. ถึง เวลา{' '}
                  <b>{data.endTime ? formatNum(data.endTime) : '..........'}</b> น. &nbsp;รวม{' '}
                  <b>{data.totalHours ? formatNum(data.totalHours) : '...'}</b> ชั่วโมง &nbsp;สถานที่ไป{' '}
                  <u>{data.destination || '-'}</u>
                </div>

                <div className="mt-1">
                  <b>ภาระงาน</b> &nbsp;&nbsp;
                  <BoxCheck checked={data.hasWorkload === 'มี'} /> มี &nbsp;&nbsp;&nbsp;&nbsp;
                  <BoxCheck checked={data.hasWorkload !== 'มี'} /> ไม่มี
                </div>

                <div className="pl-3 text-[12px] leading-[1.75]">
                  <div>
                    1. ชั้น <u>&nbsp;{data.workloads?.[0]?.cls || '..........'}&nbsp;</u> คาบที่{' '}
                    <u>&nbsp;{data.workloads?.[0]?.period || '........'}&nbsp;</u> งานที่มอบหมาย{' '}
                    <u>&nbsp;{data.workloads?.[0]?.task || '...........................'}&nbsp;</u> ผู้สอนแทน{' '}
                    <u>&nbsp;{data.workloads?.[0]?.sub || '...........................'}&nbsp;</u> ลงชื่อผู้สอนแทน........................
                  </div>
                  <div>
                    2. ชั้น <u>&nbsp;{data.workloads?.[1]?.cls || '..........'}&nbsp;</u> คาบที่{' '}
                    <u>&nbsp;{data.workloads?.[1]?.period || '........'}&nbsp;</u> งานที่มอบหมาย{' '}
                    <u>&nbsp;{data.workloads?.[1]?.task || '...........................'}&nbsp;</u> ผู้สอนแทน{' '}
                    <u>&nbsp;{data.workloads?.[1]?.sub || '...........................'}&nbsp;</u> ลงชื่อผู้สอนแทน........................
                  </div>
                  <div>
                    3. ชั้น <u>&nbsp;{data.workloads?.[2]?.cls || '..........'}&nbsp;</u> คาบที่{' '}
                    <u>&nbsp;{data.workloads?.[2]?.period || '........'}&nbsp;</u> งานที่มอบหมาย{' '}
                    <u>&nbsp;{data.workloads?.[2]?.task || '...........................'}&nbsp;</u> ผู้สอนแทน{' '}
                    <u>&nbsp;{data.workloads?.[2]?.sub || '...........................'}&nbsp;</u> ลงชื่อผู้สอนแทน........................
                  </div>
                </div>

                <div className="indent-10 mt-1">จึงเรียนมาเพื่อโปรดทราบและพิจารณา</div>

                <div className="text-right pr-6 mt-2 leading-[1.45]">
                  <div>ลงชื่อ....................................................... ผู้ขออนุญาต</div>
                  <div>( <b>{data.prefix}{data.firstName}&nbsp;&nbsp;{data.lastName}</b> )</div>
                  <div>ตำแหน่ง <b>{data.position}</b></div>
                </div>
              </div>

              {/* Approval Table for School Exit */}
              <div className="mt-3 border border-black">
                <table className="w-full border-collapse">
                  <tbody>
                    <tr>
                      <td className="w-1/2 align-top p-2 border-r border-black text-[12px] leading-[1.5]">
                        <div className="font-bold text-center underline mb-1">
                          ตรวจเสนอเพื่อพิจารณา
                        </div>
                        <div>
                          เห็นควร &nbsp;<BoxCheck checked={isApproved} /> อนุญาต &nbsp;&nbsp;
                          <BoxCheck checked={false} /> ไม่อนุญาต เนื่องจาก.....................
                        </div>
                        <div className="text-center mt-3 leading-[1.4]">
                          <div>ลงชื่อ.......................................................</div>
                          <div>(นางสาวทัชชกร ช่วยจังหรีด)</div>
                          <div>ตำแหน่ง หัวหน้างานกลุ่มบริหารบุคคล</div>
                          <div>วันที่ ........../........../..........</div>
                        </div>
                        <div className="border-t border-dashed border-black my-2" />
                        <div>
                          เห็นควร &nbsp;<BoxCheck checked={isApproved} /> อนุญาต &nbsp;&nbsp;
                          <BoxCheck checked={false} /> ไม่อนุญาต เนื่องจาก.....................
                        </div>
                        <div className="text-center mt-3 leading-[1.4]">
                          <div>ลงชื่อ.......................................................</div>
                          <div>(นายพันธ์ธนัต ภวฤทธิ์นาคินทร์)</div>
                          <div>ตำแหน่ง หัวหน้างานกลุ่มบริหารวิชาการ</div>
                          <div>วันที่ ........../........../..........</div>
                        </div>
                      </td>

                      <td className="w-1/2 align-top p-2 text-[12px] leading-[1.5]">
                        <div className="font-bold text-center underline mb-1">
                          ความเห็นผู้อำนวยการโรงเรียน
                        </div>
                        <div className="font-bold mt-2">คำสั่ง</div>
                        <div className="pl-3 my-1">
                          <BoxCheck checked={isApproved} /> อนุญาต
                          <br />
                          <BoxCheck checked={isRejected} /> ไม่อนุญาต เนื่องจาก{' '}
                          <u>{data.rejectionReason || '...........................................'}</u>
                        </div>
                        <div className="text-center mt-12 leading-[1.4]">
                          <div>ลงชื่อ.......................................................</div>
                          <div>({directorTitle})</div>
                          <div>ตำแหน่ง {directorPos}</div>
                          <div>วันที่ ........../........../..........</div>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ) : isMission ? (
            /* =============================================================== */
            /* TEMPLATE 2: แบบขออนุญาตไปราชการ / ออกนอกสถานที่เพื่อไปราชการ   */
            /* =============================================================== */
            <div>
              <div className="text-center font-bold text-[16px] leading-tight mb-2">
                แบบขออนุญาตไปราชการ / ออกนอกสถานที่เพื่อไปราชการ
                <br />
                {schoolTitle}
              </div>

              <div className="text-right text-[13px] leading-[1.45] mb-2">
                เขียนที่ &nbsp;<b>{schoolTitle}</b>
                <br />
                วันที่ <b>{formatDate(data.createdAt)}</b>
              </div>

              <div className="text-[13px] leading-[1.5] space-y-0.5 mb-2">
                <div>
                  <b>เรื่อง</b> &nbsp;ขออนุมัติเดินทางไปราชการ
                </div>
                <div>
                  <b>เรียน</b> &nbsp;ผู้อำนวยการ{schoolTitle}
                </div>
              </div>

              <div className="text-[13px] leading-[1.65] text-justify space-y-1.5">
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
                <div>
                  มีความประสงค์ขออนุมัติเดินทางไปราชการ เพื่อ &nbsp;<u>{data.reason}</u>
                  <br />
                  สถานที่ไปราชการ ณ &nbsp;<u>{data.destination || schoolTitle}</u>
                  {data.officialOrderNo && (
                    <>
                      <br />
                      ตามหนังสือ / คำสั่ง: &nbsp;<b>{data.officialOrderNo}</b>
                    </>
                  )}
                </div>
                <div>
                  {data.startTime && data.endTime ? (
                    <>
                      กำหนดการในวันที่ <b>{formatDate(data.startDate)}</b> &nbsp;ระหว่างเวลา{' '}
                      <b>{formatNum(data.startTime)}</b> น. ถึง <b>{formatNum(data.endTime)}</b> น.
                      {data.totalHours ? <> (รวม <b>{formatNum(data.totalHours)}</b> ชั่วโมง)</> : null}
                    </>
                  ) : (
                    <>
                      ตั้งแต่วันที่ <b>{formatDate(data.startDate)}</b> &nbsp;ถึงวันที่{' '}
                      <b>{formatDate(data.endDate)}</b>
                    </>
                  )}
                  &nbsp;&nbsp;<i>(คิดวันลา = 0 วันทำการ ไม่กระทบโควตาวันลาและเกณฑ์เลื่อนเงินเดือน)</i>
                </div>
                <div>
                  ผู้ปฏิบัติหน้าที่แทนระหว่างไปราชการ: &nbsp;
                  <u>{data.substituteTeacher || '................................................................................'}</u>
                </div>
                <div className="indent-10 mt-1">จึงเรียนมาเพื่อโปรดพิจารณาอนุมัติ</div>

                <div className="text-right pr-6 mt-3 leading-[1.45]">
                  <div>ลงชื่อ....................................................... ผู้ขออนุญาต</div>
                  <div>( <b>{data.prefix}{data.firstName}&nbsp;&nbsp;{data.lastName}</b> )</div>
                  <div>ตำแหน่ง <b>{data.position}</b></div>
                </div>
              </div>

              {/* Approval Box for Mission */}
              <div className="mt-4 border border-black p-3 text-[12.5px] leading-[1.5]">
                <div className="font-bold underline mb-1">คำสั่ง / ความเห็นผู้อำนวยการโรงเรียน</div>
                <div className="pl-3 my-2">
                  <BoxCheck checked={isApproved} /> อนุมัติให้ไปราชการได้
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                  <BoxCheck checked={isRejected} /> ไม่อนุมัติ
                </div>
                <div className="text-center mt-8 leading-[1.4]">
                  <div>ลงชื่อ.......................................................</div>
                  <div>({directorTitle})</div>
                  <div>ตำแหน่ง {directorPos}</div>
                  <div>วันที่ ........../........../..........</div>
                </div>
              </div>
            </div>
          ) : (
            /* =============================================================== */
            /* TEMPLATE 3: แฟ้ม บค 4/1 (การลาตามระเบียบ 2555 - 11 ประเภท)       */
            /* =============================================================== */
            <div>
              {/* Top Row: แฟ้ม บค 4/1 & Receipt Box */}
              <div className="flex justify-between items-start mb-2">
                <div className="font-bold text-[13.5px] pt-1">แฟ้ม บค 4/1</div>
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
                เขียนที่ &nbsp;<b>{schoolTitle}</b>
                <br />
                วันที่ <b>{formatDate(data.createdAt)}</b>
              </div>

              {/* Subject and Salutation */}
              <div className="text-[13px] leading-[1.5] space-y-0.5 mb-2">
                <div>
                  <b>เรื่อง</b> &nbsp;ขอ{data.leaveType}
                </div>
                <div>
                  <b>เรียน</b> &nbsp;ผู้อำนวยการ{schoolTitle}
                </div>
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
                    ขอลา &nbsp;&nbsp;<BoxCheck checked={isSick} /> ป่วย &nbsp;เนื่องจาก{' '}
                    <u>{isSick ? data.reason : '...................................................................................................'}</u>
                  </div>
                  <div className="pl-9">
                    <BoxCheck checked={isPersonal} /> กิจส่วนตัว &nbsp;เนื่องจาก{' '}
                    <u>{isPersonal ? data.reason : '...................................................................................................'}</u>
                  </div>
                  <div className="pl-9">
                    <BoxCheck checked={isMaternity} /> คลอดบุตร
                  </div>
                </div>

                {/* Leave Range */}
                <div className="mt-1">
                  ตั้งแต่วันที่ <b>{formatDate(data.startDate)}</b> &nbsp;ถึงวันที่{' '}
                  <b>{formatDate(data.endDate)}</b> &nbsp;มีกำหนด{' '}
                  <b>{formatNum(data.totalDays)}</b> {dayUnitText}
                </div>

                {/* Prior Leave Record */}
                <div>
                  ข้าพเจ้าได้ลา &nbsp;<BoxCheck checked={data.lastLeaveDays ? isSick : false} /> ป่วย{' '}
                  &nbsp;<BoxCheck checked={data.lastLeaveDays ? isPersonal : false} /> กิจส่วนตัว{' '}
                  &nbsp;<BoxCheck checked={false} /> คลอดบุตร &nbsp;ครั้งสุดท้ายตั้งแต่วันที่{' '}
                  <b>{data.lastLeaveStartDate ? formatDate(data.lastLeaveStartDate) : '.......................................'}</b>{' '}
                  ถึงวันที่{' '}
                  <b>{data.lastLeaveEndDate ? formatDate(data.lastLeaveEndDate) : '.......................................'}</b>{' '}
                  มีกำหนด <b>{data.lastLeaveDays ? formatNum(data.lastLeaveDays) : '........'}</b> วัน
                </div>

                {/* Contact Information & Substitute Teacher */}
                <div className="mt-0.5">
                  ในระหว่างลาจะติดต่อข้าพเจ้าได้ที่ <u>{data.contactAddress || schoolTitle}</u>
                  <br />
                  (มอบหมายผู้สอนแทน: <u>{data.substituteTeacher || '................................................................................'}</u>)
                </div>
              </div>

              {/* Lower Section for Statutory Leave */}
              <div className="mt-2 pt-2 border-t border-black">
                <table className="w-full border-collapse border-none">
                  <tbody>
                    <tr>
                      {/* Left Column (48%): สถิติการลา & ผู้ตรวจสอบ */}
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
                              <td className="border border-black p-1">
                                {priorSick > 0 ? formatNum(priorSick) : '-'}
                              </td>
                              <td className="border border-black p-1">
                                {curSick > 0 ? formatNum(curSick) : '-'}
                              </td>
                              <td className="border border-black p-1 font-bold">
                                {totSick > 0 ? formatNum(totSick) : '-'}
                              </td>
                            </tr>
                            <tr>
                              <td className="border border-black p-1 text-center">กิจส่วนตัว</td>
                              <td className="border border-black p-1">
                                {priorPers > 0 ? formatNum(priorPers) : '-'}
                              </td>
                              <td className="border border-black p-1">
                                {curPers > 0 ? formatNum(curPers) : '-'}
                              </td>
                              <td className="border border-black p-1 font-bold">
                                {totPers > 0 ? formatNum(totPers) : '-'}
                              </td>
                            </tr>
                            <tr>
                              <td className="border border-black p-1 text-center">คลอดบุตร</td>
                              <td className="border border-black p-1">
                                {priorMat > 0 ? formatNum(priorMat) : '-'}
                              </td>
                              <td className="border border-black p-1">
                                {curMat > 0 ? formatNum(curMat) : '-'}
                              </td>
                              <td className="border border-black p-1 font-bold">
                                {totMat > 0 ? formatNum(totMat) : '-'}
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        {/* ผู้ตรวจสอบสถิติการลา */}
                        <div className="text-center mt-7 text-[12.5px] leading-[1.5]">
                          <div>ลงชื่อ....................................................... ผู้ตรวจสอบ</div>
                          <div className="mt-0.5">({data.inspectorName || 'เจ้าหน้าที่งานบุคคล'})</div>
                          <div>ตำแหน่ง {data.inspectorPosition || 'เจ้าหน้าที่งานบริหารงานบุคคล'}</div>
                          <div className="mt-0.5">
                            วันที่ .......... เดือน ........................ พ.ศ. .............
                          </div>
                        </div>
                      </td>

                      {/* Right Column (52%): ขอแสดงความนับถือ & คำสั่งผู้อำนวยการ */}
                      <td className="w-[52%] align-top pl-3 border-none text-center">
                        <div className="text-[13px] leading-[1.45]">
                          <div>ขอแสดงความนับถือ</div>
                          <div className="my-3">ลงชื่อ.......................................................</div>
                          <div>
                            ( <b>{data.prefix}{data.firstName}&nbsp;&nbsp;{data.lastName}</b> )
                          </div>
                          <div>
                            ตำแหน่ง <b>{data.position}</b>
                          </div>
                        </div>

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
                            <div className="mt-0.5">
                              วันที่ .......... เดือน ........................ พ.ศ. .............
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

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
                  รหัสเอกสาร: <b>{formatNum(data.documentNo)}</b> | ตรวจสอบผ่านระบบ ManStat {schoolTitle}
                </div>
                <div className="text-[9.5px] text-slate-500">
                  สังกัด{formatNum(data.affiliation)}
                </div>
              </div>
            </div>
            <div className="text-right text-[10px] text-slate-500">
              <div>เอกสารต้นฉบับทางราชการ</div>
              <div className="font-bold text-sky-700">หน้า {formatNum(1)} / {formatNum(1)} (A4)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
