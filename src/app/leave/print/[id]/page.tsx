/**
 * ============================================================================
 * ManStat: Official Leave Print Page (/leave/print/[id])
 * ============================================================================
 * Server Component rendering OfficialLeavePrintView for official A4 printing.
 * Zero-GAS Document Engine replacing Google Docs/Sheets template generation.
 * Supports:
 *   1. แฟ้ม บค 4/1 (การลาตามระเบียบ 2555 - 11 ประเภท)
 *   2. แบบขออนุญาตออกนอกบริเวณโรงเรียน (ธุระส่วนตัว <= 3 ชม.)
 *   3. แบบขออนุญาตไปราชการ / ออกนอกสถานที่เพื่อไปราชการ
 * ============================================================================
 */

import { OfficialLeavePrintView, type LeavePrintData } from '@/components/print/OfficialLeavePrintView';
import { createClient } from '@/lib/supabase/server';
import { dbGetLeaveRequests, dbGetSchoolInfo } from '@/lib/db/serverDb';
import { formatStaffName, parseThaiName } from '@/lib/regulations/staff-formatting';
import { AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function LeavePrintPage({ params }: PageProps) {
  const { id } = await params;

  let printData: LeavePrintData | null = null;

  try {
    // 1. Check server database first
    const [allLeaveRequests, schoolInfo] = await Promise.all([
      dbGetLeaveRequests(),
      dbGetSchoolInfo(),
    ]);
    const localReq = allLeaveRequests.find(
      (r: any) => r.id === id || r.docNo === id
    );

    if (localReq) {
      const formattedStaffName = formatStaffName(localReq.teacherName);
      const parsedStaff = parseThaiName(formattedStaffName);

      printData = {
        id: localReq.id,
        documentNo: localReq.docNo || `ศธ 04052.12/${localReq.id.slice(-3)}`,
        createdAt: localReq.submittedAt || new Date().toISOString(),
        schoolName: schoolInfo.schoolName || 'โรงเรียนชุมชนบ้านตะขบ',
        staffName: formattedStaffName,
        prefix: parsedStaff.prefix || 'นาย',
        firstName: parsedStaff.firstName || formattedStaffName,
        lastName: parsedStaff.lastName || '',
        position: localReq.position || 'ครู',
        academicStanding: 'ครูชำนาญการพิเศษ',
        department: localReq.department || 'งานบุคคล',
        affiliation: schoolInfo.affiliation || 'โรงเรียนชุมชนบ้านตะขบ สำนักงานเขตพื้นที่การศึกษาประถมศึกษานครราชสีมา เขต 3',
        leaveType: localReq.leaveTypeName || localReq.leaveType,
        reason: localReq.reason || '',
        startDate: localReq.startDate,
        endDate: localReq.endDate,
        totalDays: localReq.totalDays ?? 1,
        contactAddress: localReq.contactInfo || 'โรงเรียนชุมชนบ้านตะขบ อ.ปักธงชัย จ.นครราชสีมา',
        substituteTeacher: formatStaffName(localReq.substituteTeacherName || 'ไม่ระบุ'),
        startTime: localReq.startTime || null,
        endTime: localReq.endTime || null,
        totalHours: localReq.totalHours || null,
        destination: localReq.destination || null,
        officialOrderNo: localReq.officialOrderNo || null,
        hasWorkload: localReq.hasWorkload || null,
        workloads: localReq.workloads || null,
        lastLeaveStartDate: null,
        lastLeaveEndDate: null,
        lastLeaveDays: null,
        stats: {
          sickUsedBefore: 2,
          sickCurrent: localReq.leaveType === 'sick' || localReq.leaveTypeName === 'ลาป่วย' ? localReq.totalDays : 0,
          personalUsedBefore: 1,
          personalCurrent: localReq.leaveType === 'personal' || localReq.leaveTypeName === 'ลากิจส่วนตัว' ? localReq.totalDays : 0,
          vacationUsedBefore: 0,
          vacationCurrent: 0,
          maternityUsedBefore: 0,
          maternityCurrent: 0,
        },
        status:
          localReq.status === 'approved'
            ? 'approved'
            : localReq.status === 'rejected'
            ? 'rejected'
            : 'pending',
        approverName: formatStaffName(schoolInfo.directorName || 'นายธีรศักดิ์ มโนธรรม'),
        approverPosition: schoolInfo.directorPosition || 'ผู้อำนวยการโรงเรียนชุมชนบ้านตะขบ',
        approvedAt: localReq.status === 'approved' ? new Date().toISOString() : null,
        signatureUrl: null,
        rejectionReason: localReq.directorRemark || null,
      };
    } else {
      // 2. Query Supabase
      const supabase = await createClient();

      const { data: request, error: reqError } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('id', id)
        .single();

      if (request && !reqError) {
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

        let approverName: string | null = null;
        let approverPosition: string | null = null;
        let signatureUrl: string | null = null;

        if (request.approver_id) {
          const { data: approver } = await supabase
            .from('staff')
            .select('*')
            .eq('id', request.approver_id)
            .single();

          if (approver) {
            approverName = formatStaffName({ prefix: approver.prefix, firstName: approver.first_name, lastName: approver.last_name });
            approverPosition = approver.position_name;
            signatureUrl = approver.signature_url;
          }
        }

        printData = {
          id: request.id,
          documentNo: request.document_no || `DOC-${request.fiscal_year}-${request.id.slice(0, 6).toUpperCase()}`,
          createdAt: request.created_at,
          schoolName: school?.school_name || 'โรงเรียนชุมชนบ้านตะขบ',
          staffName: staff ? formatStaffName({ prefix: staff.prefix, firstName: staff.first_name, lastName: staff.last_name }) : 'บุคลากรสถานศึกษา',
          prefix: staff?.prefix || '',
          firstName: staff?.first_name || 'บุคลากร',
          lastName: staff?.last_name || 'สถานศึกษา',
          position: staff?.position_name || 'ครูผู้สอน',
          academicStanding: staff?.academic_standing || '-',
          department: staff?.department || '-',
          affiliation: `${school?.school_name || 'สถานศึกษา'} ${school?.affiliation || ''}`.trim(),
          leaveType: request.leave_type,
          reason: request.reason,
          startDate: request.start_date,
          endDate: request.end_date,
          totalDays: request.total_days,
          contactAddress: request.contact_address || school?.school_name || '-',
          lastLeaveStartDate: null,
          lastLeaveEndDate: null,
          lastLeaveDays: null,
          stats: {
            sickUsedBefore: request.leave_type === 'ลาป่วย' ? 2 : 2,
            sickCurrent: request.leave_type === 'ลาป่วย' ? request.total_days : 0,
            personalUsedBefore: request.leave_type === 'ลากิจส่วนตัว' ? 1 : 1,
            personalCurrent: request.leave_type === 'ลากิจส่วนตัว' ? request.total_days : 0,
            vacationUsedBefore: 0,
            vacationCurrent: 0,
            maternityUsedBefore: 0,
            maternityCurrent: 0,
          },
          status: request.status,
          approverName: approverName || 'ผู้อำนวยการสถานศึกษา',
          approverPosition: approverPosition || 'ผู้อำนวยการสถานศึกษา',
          approvedAt: request.approved_at,
          signatureUrl,
          rejectionReason: request.rejection_reason,
        };
      }
    }
  } catch (err) {
    console.error('[LeavePrintPage Server Error]', err);
  }

  // Clean not found state if record is not found in database
  if (!printData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-[#0b1016]">
        <div className="max-w-md w-full bg-white dark:bg-[#121822] p-8 rounded-2xl border border-slate-200 dark:border-slate-800 text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6 shrink-0" />
          </div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">ไม่พบข้อมูลคำร้องขอลาในระบบ</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            ไม่พบเอกสารคำร้องขอลาตามรหัสอ้างอิงที่ระบุ หรือเอกสารอาจถูกลบออกจากฐานข้อมูลแล้ว
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition-colors"
            >
              กลับสู่หน้าหลัก
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <OfficialLeavePrintView data={printData} originUrl={process.env.NEXT_PUBLIC_APP_URL || ''} />;
}
