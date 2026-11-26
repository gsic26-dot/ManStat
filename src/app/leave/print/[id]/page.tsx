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
import { dbGetLeaveRequests, dbGetSchoolInfo, dbGetTeachers } from '@/lib/db/serverDb';
import { formatStaffName, parseThaiName } from '@/lib/regulations/staff-formatting';
import { getFiscalYearBE } from '@/lib/regulations/fiscal-and-retirement';
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
    const [allLeaveRequests, schoolInfo, allTeachers] = await Promise.all([
      dbGetLeaveRequests(),
      dbGetSchoolInfo(),
      dbGetTeachers(),
    ]);
    const localReq = allLeaveRequests.find(
      (r: any) => r.id === id || r.docNo === id
    );

    if (localReq) {
      const formattedStaffName = formatStaffName(localReq.teacherName);
      const parsedStaff = parseThaiName(formattedStaffName);
      const staffRecord = allTeachers.find(
        (t) => t.id === localReq.teacherId || t.employeeCode === localReq.teacherId
      );
      const hrHead = allTeachers.find(
        (t) =>
          t.division?.includes('บริหารงานบุคคล') ||
          t.department?.includes('บุคคล') ||
          t.role === 'hr_admin'
      );

      // Compute real prior approved leave statistics in the same fiscal year before this leave
      const reqFY = localReq.startDate ? getFiscalYearBE(localReq.startDate) : null;
      const priorApproved = allLeaveRequests.filter((r: any) => {
        if (r.id === localReq.id) return false;
        if (r.status !== 'approved') return false;
        const sameTeacher =
          r.teacherId === localReq.teacherId ||
          (staffRecord && (r.teacherId === staffRecord.id || r.teacherId === staffRecord.employeeCode));
        if (!sameTeacher) return false;
        if (reqFY && r.startDate && getFiscalYearBE(r.startDate) !== reqFY) return false;
        if (localReq.startDate && r.startDate && r.startDate >= localReq.startDate) return false;
        return true;
      });

      const sumPrior = (matcher: (r: any) => boolean) =>
        priorApproved.filter(matcher).reduce((acc: number, r: any) => acc + (Number(r.totalDays) || 0), 0);

      const isSickReq = (r: any) => r.leaveType === 'sick' || String(r.leaveTypeName || r.leaveType || '').includes('ป่วย');
      const isPersonalReq = (r: any) => r.leaveType === 'personal' || String(r.leaveTypeName || r.leaveType || '').includes('กิจ');
      const isVacationReq = (r: any) => r.leaveType === 'vacation' || String(r.leaveTypeName || r.leaveType || '').includes('พักผ่อน');
      const isMaternityReq = (r: any) => r.leaveType === 'maternity' || String(r.leaveTypeName || r.leaveType || '').includes('คลอด');

      const sortedPriorSameType = [...priorApproved]
        .filter((r: any) => (r.leaveTypeName || r.leaveType) === (localReq.leaveTypeName || localReq.leaveType))
        .sort((a: any, b: any) => String(b.startDate || '').localeCompare(String(a.startDate || '')));
      const lastLeave = sortedPriorSameType[0] || null;

      printData = {
        id: localReq.id,
        documentNo: localReq.docNo || `ศธ 04052.12/${localReq.id.slice(-3)}`,
        createdAt: localReq.submittedAt || new Date().toISOString(),
        schoolName: schoolInfo.schoolName || 'โรงเรียนชุมชนบ้านตะขบ',
        staffName: formattedStaffName,
        prefix: parsedStaff.prefix || 'นาย',
        firstName: parsedStaff.firstName || formattedStaffName,
        lastName: parsedStaff.lastName || '',
        position: localReq.position || staffRecord?.position || 'ครู',
        academicStanding: staffRecord?.academicStanding || '-',
        department: localReq.department || staffRecord?.department || 'งานบุคคล',
        affiliation: schoolInfo.affiliation || 'โรงเรียนชุมชนบ้านตะขบ สำนักงานเขตพื้นที่การศึกษาประถมศึกษานครราชสีมา เขต 3',
        leaveType: localReq.leaveTypeName || localReq.leaveType,
        reason: localReq.reason || '',
        startDate: localReq.startDate,
        endDate: localReq.endDate,
        totalDays: localReq.totalDays ?? 1,
        contactAddress: localReq.contactInfo || `${schoolInfo.schoolName || 'โรงเรียนชุมชนบ้านตะขบ'} อ.ปักธงชัย จ.นครราชสีมา`,
        substituteTeacher: formatStaffName(localReq.substituteTeacherName || 'ไม่ระบุ'),
        startTime: localReq.startTime || null,
        endTime: localReq.endTime || null,
        totalHours: localReq.totalHours || null,
        destination: localReq.destination || null,
        officialOrderNo: localReq.officialOrderNo || null,
        hasWorkload: localReq.hasWorkload || null,
        workloads: localReq.workloads || null,
        lastLeaveStartDate: lastLeave?.startDate || null,
        lastLeaveEndDate: lastLeave?.endDate || null,
        lastLeaveDays: lastLeave?.totalDays ?? null,
        stats: {
          sickUsedBefore: sumPrior(isSickReq),
          sickCurrent: isSickReq(localReq) ? (Number(localReq.totalDays) || 0) : 0,
          personalUsedBefore: sumPrior(isPersonalReq),
          personalCurrent: isPersonalReq(localReq) ? (Number(localReq.totalDays) || 0) : 0,
          vacationUsedBefore: sumPrior(isVacationReq),
          vacationCurrent: isVacationReq(localReq) ? (Number(localReq.totalDays) || 0) : 0,
          maternityUsedBefore: sumPrior(isMaternityReq),
          maternityCurrent: isMaternityReq(localReq) ? (Number(localReq.totalDays) || 0) : 0,
        },
        status:
          localReq.status === 'approved'
            ? 'approved'
            : localReq.status === 'rejected'
            ? 'rejected'
            : 'pending',
        approverName: formatStaffName(schoolInfo.directorName || 'นายธีรศักดิ์ มโนธรรม'),
        approverPosition: schoolInfo.directorPosition || 'ผู้อำนวยการโรงเรียนชุมชนบ้านตะขบ',
        inspectorName: hrHead ? formatStaffName(hrHead.name) : null,
        inspectorPosition: hrHead?.academicStanding || hrHead?.position || null,
        approvedAt: localReq.status === 'approved' ? ((localReq as any).approvedAt || (localReq as any).updatedAt || null) : null,
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
        const [{ data: staff }, { data: school }, { data: priorRows }] = await Promise.all([
          supabase.from('staff').select('*').eq('id', request.staff_id).single(),
          supabase.from('school_settings').select('*').limit(1).single(),
          supabase
            .from('leave_requests')
            .select('id, leave_type, start_date, end_date, total_days')
            .eq('staff_id', request.staff_id)
            .eq('fiscal_year', request.fiscal_year)
            .eq('status', 'approved')
            .neq('id', request.id)
            .lt('start_date', request.start_date),
        ]);

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

        const safePrior = Array.isArray(priorRows) ? priorRows : [];
        const sumSupPrior = (keyword: string) =>
          safePrior
            .filter((r: any) => String(r.leave_type || '').includes(keyword))
            .reduce((acc: number, r: any) => acc + (Number(r.total_days) || 0), 0);

        const lastSame = [...safePrior]
          .filter((r: any) => r.leave_type === request.leave_type)
          .sort((a: any, b: any) => String(b.start_date || '').localeCompare(String(a.start_date || '')))[0];

        const hrHead = allTeachers.find(
          (t) =>
            t.division?.includes('บริหารงานบุคคล') ||
            t.department?.includes('บุคคล') ||
            t.role === 'hr_admin'
        );

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
          lastLeaveStartDate: lastSame?.start_date || null,
          lastLeaveEndDate: lastSame?.end_date || null,
          lastLeaveDays: lastSame?.total_days ?? null,
          stats: {
            sickUsedBefore: sumSupPrior('ป่วย'),
            sickCurrent: String(request.leave_type || '').includes('ป่วย') ? (Number(request.total_days) || 0) : 0,
            personalUsedBefore: sumSupPrior('กิจ'),
            personalCurrent: String(request.leave_type || '').includes('กิจ') ? (Number(request.total_days) || 0) : 0,
            vacationUsedBefore: sumSupPrior('พักผ่อน'),
            vacationCurrent: String(request.leave_type || '').includes('พักผ่อน') ? (Number(request.total_days) || 0) : 0,
            maternityUsedBefore: sumSupPrior('คลอด'),
            maternityCurrent: String(request.leave_type || '').includes('คลอด') ? (Number(request.total_days) || 0) : 0,
          },
          status: request.status,
          approverName: approverName || 'ผู้อำนวยการสถานศึกษา',
          approverPosition: approverPosition || 'ผู้อำนวยการสถานศึกษา',
          inspectorName: hrHead ? formatStaffName(hrHead.name) : null,
          inspectorPosition: hrHead?.academicStanding || hrHead?.position || null,
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
