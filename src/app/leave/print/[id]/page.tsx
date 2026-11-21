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
      const parts = (localReq.teacherName || '').split(' ');
      const prefix = parts[0]?.startsWith('นางสาว')
        ? 'นางสาว'
        : parts[0]?.startsWith('นาง')
        ? 'นาง'
        : parts[0]?.startsWith('นาย')
        ? 'นาย'
        : '';
      const fullNameClean = prefix ? localReq.teacherName.replace(prefix, '').trim() : localReq.teacherName;
      const [firstName, ...lastNames] = fullNameClean.split(' ');

      printData = {
        id: localReq.id,
        documentNo: localReq.docNo || `ศธ 04052.12/${localReq.id.slice(-3)}`,
        createdAt: localReq.submittedAt || new Date().toISOString(),
        schoolName: schoolInfo.schoolName || 'โรงเรียนชุมชนบ้านตะขบ',
        staffName: localReq.teacherName,
        prefix: prefix || 'นาย/นางสาว',
        firstName: firstName || localReq.teacherName,
        lastName: lastNames.join(' ') || '',
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
        substituteTeacher: localReq.substituteTeacherName || 'ไม่ระบุ',
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
        approverName: schoolInfo.directorName || 'นายธีรศักดิ์ มโนธรรม',
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
            approverName = `${approver.prefix}${approver.first_name} ${approver.last_name}`;
            approverPosition = approver.position_name;
            signatureUrl = approver.signature_url;
          }
        }

        printData = {
          id: request.id,
          documentNo: request.document_no || `DOC-${request.fiscal_year}-${request.id.slice(0, 6).toUpperCase()}`,
          createdAt: request.created_at,
          schoolName: school?.school_name || 'โรงเรียนชุมชนบ้านตะขบ',
          staffName: staff ? `${staff.prefix}${staff.first_name} ${staff.last_name}` : 'นายข้าราชการ ตัวอย่าง',
          prefix: staff?.prefix || 'นาย',
          firstName: staff?.first_name || 'ข้าราชการ',
          lastName: staff?.last_name || 'ตัวอย่าง',
          position: staff?.position_name || 'ครู',
          academicStanding: staff?.academic_standing || 'ชำนาญการ',
          department: staff?.department || 'กลุ่มสาระการเรียนรู้คณิตศาสตร์',
          affiliation: `${school?.school_name || 'โรงเรียนชุมชนบ้านตะขบ'} ${school?.affiliation || 'สำนักงานเขตพื้นที่การศึกษาประถมศึกษานครราชสีมา เขต 3'}`,
          leaveType: request.leave_type,
          reason: request.reason,
          startDate: request.start_date,
          endDate: request.end_date,
          totalDays: request.total_days,
          contactAddress: request.contact_address || school?.school_name || 'โรงเรียนชุมชนบ้านตะขบ',
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
          approverName: approverName || 'นายธีรศักดิ์ มโนธรรม',
          approverPosition: approverPosition || 'ผู้อำนวยการโรงเรียนชุมชนบ้านตะขบ',
          approvedAt: request.approved_at,
          signatureUrl,
          rejectionReason: request.rejection_reason,
        };
      }
    }
  } catch (err) {
    console.error('[LeavePrintPage Server Error]', err);
  }

  // Fallback demo dataset if id is not found
  if (!printData) {
    printData = {
      id,
      documentNo: `DOC-2570-${id.slice(0, 6).toUpperCase() || 'K00201'}`,
      createdAt: '2026-11-16T08:30:00Z',
      schoolName: 'โรงเรียนชุมชนบ้านตะขบ',
      staffName: 'นางสาวกุสุมาลย์กมล พราหมณ์ตะขบ',
      prefix: 'นางสาว',
      firstName: 'กุสุมาลย์กมล',
      lastName: 'พราหมณ์ตะขบ',
      position: 'ครู',
      academicStanding: 'ครูชำนาญการพิเศษ',
      department: 'กลุ่มสาระการเรียนรู้ภาษาต่างประเทศ',
      affiliation: 'โรงเรียนชุมชนบ้านตะขบ สำนักงานเขตพื้นที่การศึกษาประถมศึกษานครราชสีมา เขต 3',
      leaveType: 'ลาป่วย',
      reason: 'มีอาการไข้หวัดใหญ่และแพทย์สั่งพักผ่อน',
      startDate: '2026-11-18',
      endDate: '2026-11-19',
      totalDays: 2,
      contactAddress: 'ม.1 โรงเรียนชุมชนบ้านตะขบ ต.ตะขบ อ.ปักธงชัย จ.นครราชสีมา 30150 โทร. 081-725-9258',
      lastLeaveStartDate: '2026-10-15',
      lastLeaveEndDate: '2026-10-15',
      lastLeaveDays: 1,
      stats: {
        sickUsedBefore: 1,
        sickCurrent: 2,
        personalUsedBefore: 0,
        personalCurrent: 0,
        vacationUsedBefore: 0,
        vacationCurrent: 0,
        maternityUsedBefore: 0,
        maternityCurrent: 0,
      },
      status: 'approved',
      approverName: 'นายธีรศักดิ์ มโนธรรม',
      approverPosition: 'ผู้อำนวยการโรงเรียนชุมชนบ้านตะขบ',
      approvedAt: '2026-11-16T10:00:00Z',
      signatureUrl: null,
      rejectionReason: null,
    };
  }

  return <OfficialLeavePrintView data={printData} originUrl={process.env.NEXT_PUBLIC_APP_URL || ''} />;
}
