/**
 * ============================================================================
 * ManStat: Official Leave Verification Certificate Page
 * ============================================================================
 * Endpoint: /verify/leave/[docNo]
 * Target: Scanned by QR Code on official paper printout.
 * Standard: พ.ร.บ. การปฏิบัติราชการทางอิเล็กทรอนิกส์ พ.ศ. 2565
 * Security: PDPA Compliant (Sensitive personal data masked).
 * Icons: Pure Lucide SVG icons with strict 8px gap, Zero emojis.
 * ============================================================================
 */

import Link from 'next/link';
import {
  ShieldCheck,
  CheckCircle2,
  Calendar,
  FileText,
  School,
  Clock,
  User,
  ArrowLeft,
  AlertTriangle,
  AlertOctagon,
  XCircle,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { dbGetLeaveRequests, dbGetSchoolInfo, dbGetTeachers } from '@/lib/db/serverDb';
import { formatStaffName, parseThaiName } from '@/lib/regulations/staff-formatting';
import { formatOfficialThaiDate } from '@/lib/regulations/thai-numerals';

interface PageProps {
  params: Promise<{ docNo: string }>;
}

export default async function LeaveVerificationPage({ params }: PageProps) {
  const { docNo } = await params;
  const decodedDocNo = decodeURIComponent(docNo);

  let verifiedRecord: {
    documentNo: string;
    isValid: boolean;
    staffMaskedName: string;
    position: string;
    schoolName: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    totalDays: number;
    status: 'approved' | 'pending' | 'rejected';
    approvedAt: string | null;
    approverName: string;
  } | null = null;

  try {
    // 1. Check server database first (matches LeavePrintPage data source)
    const [allLeaveRequests, schoolInfo, allTeachers] = await Promise.all([
      dbGetLeaveRequests(),
      dbGetSchoolInfo(),
      dbGetTeachers(),
    ]);

    const localReq = allLeaveRequests.find(
      (r: any) => r.docNo === decodedDocNo || r.id === decodedDocNo
    );

    if (localReq) {
      const staffRecord = allTeachers.find(
        (t) => t.id === localReq.teacherId || t.employeeCode === localReq.teacherId
      );
      const parsed = parseThaiName(formatStaffName(localReq.teacherName || staffRecord?.name || ''));
      const firstInit = parsed.firstName ? parsed.firstName[0] : 'บ';
      const lastInit = parsed.lastName ? parsed.lastName[0] : 'ส';
      const maskedName = `${parsed.prefix || ''}${firstInit}**** ${lastInit}****`;

      verifiedRecord = {
        documentNo: localReq.docNo || decodedDocNo,
        isValid: true,
        staffMaskedName: maskedName,
        position: localReq.position || staffRecord?.position || 'ข้าราชการครู',
        schoolName: schoolInfo.schoolName || 'โรงเรียนชุมชนบ้านตะขบ',
        leaveType: localReq.leaveTypeName || localReq.leaveType,
        startDate: localReq.startDate,
        endDate: localReq.endDate,
        totalDays: localReq.totalDays ?? 0,
        status:
          localReq.status === 'approved'
            ? 'approved'
            : localReq.status === 'rejected'
            ? 'rejected'
            : 'pending',
        approvedAt: (localReq as any).approvedAt || null,
        approverName: formatStaffName(schoolInfo.directorName || 'ผู้อำนวยการสถานศึกษา'),
      };
    } else {
      // 2. Fallback to Supabase
      const supabase = await createClient();

      const { data: request } = await supabase
        .from('leave_requests')
        .select('*')
        .or(`document_no.eq.${decodedDocNo},id.eq.${decodedDocNo}`)
        .limit(1)
        .maybeSingle();

      if (request) {
        const { data: staff } = await supabase
          .from('staff')
          .select('*')
          .eq('id', request.staff_id)
          .single();

        const { data: school } = await supabase
          .from('school_settings')
          .select('*')
          .limit(1)
          .single();

        // PDPA Name Masking: e.g. "นางสาว ว**** ด****"
        const firstNameInitial = staff?.first_name ? staff.first_name[0] : 'บ';
        const lastNameInitial = staff?.last_name ? staff.last_name[0] : 'ส';
        const maskedName = `${staff?.prefix || ''}${firstNameInitial}**** ${lastNameInitial}****`;

        verifiedRecord = {
          documentNo: request.document_no || decodedDocNo,
          isValid: true,
          staffMaskedName: maskedName,
          position: staff?.position_name || 'ข้าราชการครู',
          schoolName: school?.school_name || 'โรงเรียนชุมชนบ้านตะขบ',
          leaveType: request.leave_type,
          startDate: request.start_date,
          endDate: request.end_date,
          totalDays: request.total_days,
          status:
            request.status === 'approved'
              ? 'approved'
              : request.status === 'rejected'
              ? 'rejected'
              : 'pending',
          approvedAt: request.approved_at,
          approverName: 'ผู้อำนวยการสถานศึกษา',
        };
      }
    }
  } catch (err) {
    console.error('[LeaveVerificationPage Error]', err);
  }

  // Not found or invalid document state
  if (!verifiedRecord || !verifiedRecord.isValid) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0e141b] text-slate-900 dark:text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <div className="bg-white dark:bg-[#121822] p-6 sm:p-8 rounded-2xl border border-rose-200 dark:border-rose-500/30 shadow-xl relative overflow-hidden text-center space-y-4">
            <div className="inline-flex p-3 rounded-full bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/40 text-rose-600 dark:text-rose-400 mx-auto">
              <AlertTriangle className="w-10 h-10 shrink-0" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              ไม่พบเอกสารในระบบสารสนเทศ
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              เลขที่เอกสารอ้างอิง: <span className="font-mono text-slate-800 dark:text-slate-200">{decodedDocNo}</span>
            </p>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/40 text-xs font-semibold">
              <AlertOctagon className="w-3.5 h-3.5 shrink-0" />
              <span>ไม่สามารถยืนยันความถูกต้องของเอกสารได้</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed pt-2">
              เอกสารนี้อาจยังไม่ได้รับการบันทึก หรือไม่มีอยู่ในฐานข้อมูลของสถานศึกษา กรุณาตรวจสอบกับกลุ่มบริหารงานบุคคลของโรงเรียน
            </p>
            <div className="pt-4 border-t border-slate-200 dark:border-slate-700/80">
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-[#121822] dark:hover:bg-slate-800/70 dark:text-slate-300 dark:hover:text-white border border-slate-200 dark:border-slate-800/80 text-xs font-medium transition-colors duration-200"
              >
                <ArrowLeft className="w-4 h-4 shrink-0" />
                <span>เข้าสู่หน้าหลักระบบ ManStat</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isApproved = verifiedRecord.status === 'approved';
  const isRejected = verifiedRecord.status === 'rejected';

  const statusConfig = isApproved
    ? {
        iconBg: 'bg-emerald-50 dark:bg-emerald-500/15 border-emerald-200 dark:border-emerald-500/40 text-emerald-600 dark:text-emerald-400',
        pill: 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/40',
        bannerText: 'เอกสารได้รับการรับรองและอนุมัติถูกต้องตามระเบียบ',
        badgeText: 'อนุมัติการลา',
      }
    : isRejected
    ? {
        iconBg: 'bg-rose-50 dark:bg-rose-500/15 border-rose-200 dark:border-rose-500/40 text-rose-600 dark:text-rose-400',
        pill: 'bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/40',
        bannerText: 'คำร้องขอลาไม่ได้รับการอนุมัติ',
        badgeText: 'ไม่อนุมัติการลา',
      }
    : {
        iconBg: 'bg-amber-50 dark:bg-amber-500/15 border-amber-200 dark:border-amber-500/40 text-amber-600 dark:text-amber-400',
        pill: 'bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/40',
        bannerText: 'เอกสารอยู่ระหว่างรอพิจารณาอนุมัติ',
        badgeText: 'รอพิจารณาอนุมัติ',
      };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0e141b] text-slate-900 dark:text-slate-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Verification Certificate Card */}
        <div className="bg-white dark:bg-[#121822] p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-[#2a475e] shadow-xl relative overflow-hidden">
          {/* Top Status Header */}
          <div className="text-center pb-6 border-b border-slate-200 dark:border-slate-700/80">
            <div className={`inline-flex p-3 rounded-full border mb-3 ${statusConfig.iconBg}`}>
              {isApproved ? (
                <ShieldCheck className="w-10 h-10 shrink-0" />
              ) : isRejected ? (
                <XCircle className="w-10 h-10 shrink-0" />
              ) : (
                <Clock className="w-10 h-10 shrink-0" />
              )}
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              หนังสือรับรองความถูกต้องของใบลาราชการ
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              ระบบสารสนเทศบริหารงานบุคคลอิเล็กทรอนิกส์ (ManStat)
            </p>
            <div className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold ${statusConfig.pill}`}>
              {isApproved ? (
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              ) : isRejected ? (
                <XCircle className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <Clock className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>{statusConfig.bannerText}</span>
            </div>
          </div>

          {/* Details Table */}
          <div className="py-6 space-y-3.5 text-xs text-slate-700 dark:text-slate-300">
            <div className="flex justify-between items-center py-1.5 border-b border-slate-200 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                <span>เลขที่เอกสารอ้างอิง:</span>
              </span>
              <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                {verifiedRecord.documentNo}
              </span>
            </div>

            <div className="flex justify-between items-center py-1.5 border-b border-slate-200 dark:border-slate-800 gap-2">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 shrink-0">
                <School className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                <span>หน่วยงานต้นสังกัด:</span>
              </span>
              <span className="font-medium text-slate-900 dark:text-slate-200 truncate max-w-[240px]" title={verifiedRecord.schoolName}>
                {verifiedRecord.schoolName}
              </span>
            </div>

            <div className="flex justify-between items-center py-1.5 border-b border-slate-200 dark:border-slate-800 gap-2">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 shrink-0">
                <User className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                <span>ผู้ขอลา (PDPA Masked):</span>
              </span>
              <span className="font-medium text-slate-900 dark:text-slate-200 truncate max-w-[240px]" title={`${verifiedRecord.staffMaskedName} (${verifiedRecord.position})`}>
                {verifiedRecord.staffMaskedName} ({verifiedRecord.position.replace('ผู้อำนวยการสถานศึกษา', 'ผอ.สถานศึกษา')})
              </span>
            </div>

            <div className="flex justify-between items-center py-1.5 border-b border-slate-200 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                <span>ประเภทการลา:</span>
              </span>
              <span className="font-semibold text-sky-700 dark:text-sky-300">
                {verifiedRecord.leaveType}
              </span>
            </div>

            <div className="flex justify-between items-center py-1.5 border-b border-slate-200 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                <span>ช่วงวันที่ลา:</span>
              </span>
              <span className="text-slate-900 dark:text-slate-200">
                {formatOfficialThaiDate(verifiedRecord.startDate)} ถึง {formatOfficialThaiDate(verifiedRecord.endDate)} ({verifiedRecord.totalDays} วันทำการ)
              </span>
            </div>

            <div className="flex justify-between items-center py-1.5 border-b border-slate-200 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400">สถานะคำสั่ง:</span>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold border ${statusConfig.pill}`}>
                {isApproved ? (
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                ) : isRejected ? (
                  <XCircle className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                )}
                <span>{statusConfig.badgeText}</span>
              </span>
            </div>

            <div className="flex justify-between items-center py-1.5 gap-2">
              <span className="text-slate-500 dark:text-slate-400 shrink-0">ผู้อนุมัติคำสั่ง:</span>
              <span className="text-slate-900 dark:text-slate-200 font-medium truncate max-w-[240px]" title={verifiedRecord.approverName}>
                {verifiedRecord.approverName}
              </span>
            </div>
          </div>

          {/* Legal Compliance Footer */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-700/80 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
            <p>
              * ข้อมูลส่วนบุคคลได้รับการคุ้มครองตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA)
            </p>
            <p>
              * ระบบออกและจัดเก็บเอกสารตามมาตรฐาน พ.ร.บ. การปฏิบัติราชการทางอิเล็กทรอนิกส์ พ.ศ. 2565
            </p>
          </div>

          <div className="mt-6 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-[#121822] dark:hover:bg-slate-800/70 dark:text-slate-300 dark:hover:text-white border border-slate-200 dark:border-slate-800/80 text-xs font-medium transition-colors duration-200"
            >
              <ArrowLeft className="w-4 h-4 shrink-0" />
              <span>เข้าสู่หน้าหลักระบบ ManStat</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
