import { NextResponse } from 'next/server';
import {
  dbGetTeachers,
  dbGetWorkloads,
  dbGetLeaveRequests,
  dbGetPerformanceEvaluation,
  dbSavePerformanceEvaluation,
  dbGetPerformanceEvaluationsForRound,
  dbGetFiscalPeriods,
  dbGetSalaryPromotionRecords,
  recordAuditLog,
} from '@/lib/db/serverDb';
import { getSessionUser } from '@/lib/auth/serverAuth';
import { canManageSalaryPromotions } from '@/lib/auth/roles';
import { formatStaffName } from '@/lib/regulations/staff-formatting';
import {
  resolveEvaluationTemplate,
  calculateEvaluationTotals,
  type EvaluationScores,
} from '@/lib/evaluationEngine';
import type { EvaluationTemplateKey } from '@/data/evaluationTemplates';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * คำนวณช่วงวันที่ของรอบการประเมินตามปีงบประมาณ พ.ศ.
 * รอบที่ 1: 1 ต.ค. (ปีก่อนหน้า ค.ศ.) ถึง 31 มี.ค. (ปี ค.ศ.)
 * รอบที่ 2: 1 เม.ย. (ปี ค.ศ.) ถึง 30 ก.ย. (ปี ค.ศ.)
 */
function getRoundDateRange(fiscalYear: number, roundNumber: number) {
  const ceYear = fiscalYear - 543;
  if (roundNumber === 1) {
    return {
      startDate: `${ceYear - 1}-10-01`,
      endDate: `${ceYear}-03-31`,
      label: `ครั้งที่ 1 (1 ตุลาคม ${fiscalYear - 1} – 31 มีนาคม ${fiscalYear})`,
    };
  }
  return {
    startDate: `${ceYear}-04-01`,
    endDate: `${ceYear}-09-30`,
    label: `ครั้งที่ 2 (1 เมษายน ${fiscalYear} – 30 กันยายน ${fiscalYear})`,
  };
}

// ----------------------------------------------------------------------------
// GET: ดึงข้อมูลแบบประเมินพร้อม Auto-Fill ข้อมูลส่วนที่ ๑ จากฐานข้อมูล
// ----------------------------------------------------------------------------
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const staffId = searchParams.get('staffId');
    const fiscalYear = parseInt(searchParams.get('year') || '2570', 10);
    const roundNumber = parseInt(searchParams.get('round') || '1', 10);

    const sessionUser = await getSessionUser();
    const isManager = sessionUser
      ? canManageSalaryPromotions(sessionUser.role, sessionUser.position, sessionUser.department)
      : false;

    // หากไม่ระบุ staffId ให้ส่งรายการประเมินทั้งหมดในรอบนั้น (สำหรับ Admin/HR)
    if (!staffId) {
      if (!isManager) {
        return NextResponse.json(
          { success: false, error: 'สงวนสิทธิ์เฉพาะผู้บริหารและฝ่ายบุคคล' },
          { status: 403 }
        );
      }
      const list = await dbGetPerformanceEvaluationsForRound(fiscalYear, roundNumber);
      return NextResponse.json({ success: true, data: list });
    }

    // ตรวจสอบสิทธิ์การเข้าถึงข้อมูลของตนเอง
    const isSelf =
      sessionUser &&
      (sessionUser.id === staffId ||
        sessionUser.employeeCode === staffId ||
        sessionUser.email === staffId);

    if (!isManager && !isSelf) {
      return NextResponse.json(
        { success: false, error: 'ไม่อนุญาตให้เข้าถึงแบบประเมินของผู้อื่น (PDPA)' },
        { status: 403 }
      );
    }

    // 1. ดึงข้อมูลครู/บุคลากร
    const allTeachers = await dbGetTeachers();
    const teacher = allTeachers.find(
      (t) => t.id === staffId || t.employeeCode === staffId
    );

    if (!teacher) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบบุคลากรที่ระบุในระบบ' },
        { status: 404 }
      );
    }

    // 2. ดึงข้อมูลภาระงานสอน (Teaching Workload)
    const allWorkloads = await dbGetWorkloads();
    const teacherWorkloads = allWorkloads.filter(
      (w) => w.teacherId === teacher.id || w.teacherId === teacher.employeeCode
    );

    const teachingTasks = teacherWorkloads.filter(
      (w) => w.category === 'งานสอนและการจัดการเรียนรู้' || !w.category
    );

    const subjectsList = Array.from(
      new Set(teachingTasks.map((w) => w.title).filter(Boolean))
    );
    const gradesList = Array.from(
      new Set(teachingTasks.map((w) => w.subGroupOrLevel).filter(Boolean))
    );
    const totalTeachingHours = teachingTasks.reduce(
      (acc, w) => acc + (Number(w.hoursPerWeek) || 0),
      0
    );

    // 3. คำนวณสถิติวันลาในรอบการประเมิน (Live Query Approved Leaves)
    const allLeaves = await dbGetLeaveRequests();
    const { startDate, endDate } = getRoundDateRange(fiscalYear, roundNumber);

    const teacherLeaves = allLeaves.filter((l) => {
      const isOwner = l.teacherId === teacher.id || l.teacherId === teacher.employeeCode;
      const isApproved = l.status === 'approved' || l.status === 'supervisor_approved';
      if (!isOwner || !isApproved) return false;

      // ตรวจสอบช่วงวันที่
      const start = l.startDate;
      return start >= startDate && start <= endDate;
    });

    let sickLeaveCount = 0;
    let sickLeaveDays = 0;
    let businessLeaveCount = 0;
    let businessLeaveDays = 0;
    let otherLeaveCount = 0;
    let otherLeaveDays = 0;
    const otherLeaveTypes: string[] = [];

    teacherLeaves.forEach((l) => {
      const type = (l.leaveType || '').toLowerCase();
      const typeName = l.leaveTypeName || '';
      const days = Number(l.totalDays) || 0;

      if (type === 'sick' || typeName.includes('ป่วย')) {
        sickLeaveCount += 1;
        sickLeaveDays += days;
      } else if (type === 'business' || typeName.includes('กิจ')) {
        businessLeaveCount += 1;
        businessLeaveDays += days;
      } else {
        otherLeaveCount += 1;
        otherLeaveDays += days;
        if (typeName && !otherLeaveTypes.includes(typeName)) {
          otherLeaveTypes.push(typeName);
        }
      }
    });

    const totalLeaveDays = sickLeaveDays + businessLeaveDays + otherLeaveDays;

    // 4. ข้อมูลผู้ประเมิน
    const isEvaluateeDirector =
      teacher.position.includes('ผู้อำนวยการ') || teacher.employeeCode === 'EXE-001';

    const evaluatorName = isEvaluateeDirector
      ? ''
      : 'นายธีรศักดิ์ มโนธรรม';
    const evaluatorPosition = isEvaluateeDirector
      ? 'ผู้อำนวยการสำนักงานเขตพื้นที่การศึกษาประถมศึกษานครราชสีมา เขต 3'
      : 'ผู้อำนวยการโรงเรียน';

    // 5. หาแม่แบบประเมินที่ตรงสายงานและวิทยฐานะ
    const resolvedTemplateKey = resolveEvaluationTemplate(
      teacher.position,
      teacher.academicStanding
    );

    // 6. ดึงข้อมูลแบบประเมินที่บันทึกไว้ในฐานข้อมูล (ถ้ามี)
    const existingEval = await dbGetPerformanceEvaluation(
      teacher.id,
      fiscalYear,
      roundNumber
    );

    // คำนวณเงินเดือนปัจจุบัน (Unmasked Salary สำหรับพิมพ์แบบฟอร์ม A4 ทางราชการ)
    let currentSalary = (teacher as any).salary || (teacher as any).currentSalary || 0;
    if (existingEval?.part1_snapshot?.currentSalary) {
      currentSalary = existingEval.part1_snapshot.currentSalary;
    } else {
      try {
        const periods = await dbGetFiscalPeriods('30030099');
        const matchPeriod = periods.find(
          (p) => p.fiscalYearTh === fiscalYear && p.roundNo === roundNumber
        );
        if (matchPeriod) {
          const sRecords = await dbGetSalaryPromotionRecords(matchPeriod.id);
          const sMatch = sRecords.find(
            (r) => r.staffId === teacher.id || r.staffId === teacher.employeeCode
          );
          if (sMatch?.calculationBase || sMatch?.salaryBefore) {
            currentSalary = sMatch.calculationBase || sMatch.salaryBefore;
          }
        }
      } catch (err) {
        console.warn('[Auto-fill Salary] Could not query salary records:', err);
      }
    }

    // มาตรฐานเงินเดือนข้าราชการครูขั้นต่ำตามวิทยฐานะ (หากไม่มีบันทึกเดิม)
    if (!currentSalary || currentSalary <= 0) {
      const pos = teacher.position || '';
      const standing = teacher.academicStanding || '';
      if (pos.includes('ผู้อำนวยการ')) currentSalary = 54000;
      else if (standing.includes('ชำนาญการพิเศษ') || pos.includes('ชำนาญการพิเศษ')) currentSalary = 38500;
      else if (standing.includes('ชำนาญการ') || pos.includes('ชำนาญการ')) currentSalary = 28000;
      else if (pos.includes('ครูผู้ช่วย')) currentSalary = 15800;
      else currentSalary = 21500;
    }

    // ประกอบข้อมูลส่วนที่ ๑ (Auto-Fill Snapshot)
    const autoFilledPart1 = {
      roundNumber,
      fiscalYear,
      roundDateRange: getRoundDateRange(fiscalYear, roundNumber).label,
      evaluateeName: formatStaffName(teacher),
      position: teacher.position || 'ครูผู้สอน',
      academicStanding: teacher.academicStanding || '-',
      currentSalary,
      schoolName: 'โรงเรียนชุมชนบ้านตะขบ',
      affiliation: 'สำนักงานเขตพื้นที่การศึกษาประถมศึกษานครราชสีมา เขต 3',
      teachingGrade: gradesList.length > 0 ? gradesList.join(', ') : '',
      teachingSubject: subjectsList.length > 0 ? subjectsList.join(', ') : '',
      teachingHoursPerWeek: totalTeachingHours > 0 ? totalTeachingHours : '',
      leaveStats: {
        totalDays: totalLeaveDays,
        sickCount: sickLeaveCount,
        sickDays: sickLeaveDays,
        businessCount: businessLeaveCount,
        businessDays: businessLeaveDays,
        otherCount: otherLeaveCount,
        otherDays: otherLeaveDays,
        otherTypes: otherLeaveTypes.join(', '),
      },
      evaluatorName,
      evaluatorPosition,
    };

    return NextResponse.json({
      success: true,
      data: {
        staffId: teacher.id,
        employeeCode: teacher.employeeCode,
        teacher,
        fiscalYear,
        roundNumber,
        templateKey: existingEval?.template_key || resolvedTemplateKey,
        part1Snapshot: {
          ...autoFilledPart1,
          ...(existingEval?.part1_snapshot || {}),
        },
        selfScores: existingEval?.self_scores || {},
        supervisorScores: existingEval?.supervisor_scores || {},
        selfTotal: existingEval?.self_total ?? null,
        supervisorTotal: existingEval?.supervisor_total ?? null,
        ratingLevel: existingEval?.rating_level ?? null,
        supervisorComment: existingEval?.supervisor_comment ?? '',
        status: existingEval?.status || 'draft',
        selfSignedAt: existingEval?.self_signed_at ?? null,
        supervisorSignedAt: existingEval?.supervisor_signed_at ?? null,
        acknowledgedAt: existingEval?.acknowledged_at ?? null,
        createdAt: existingEval?.created_at ?? null,
        updatedAt: existingEval?.updated_at ?? null,
      },
    });
  } catch (err: any) {
    console.error('[API /api/admin/evaluations GET Error]', err);
    return NextResponse.json(
      { success: false, error: err.message || 'เกิดข้อผิดพลาดในการโหลดแบบประเมิน' },
      { status: 500 }
    );
  }
}

// ----------------------------------------------------------------------------
// POST: บันทึก อัปเดต หรือส่งแบบประเมินตนเอง / ผู้บังคับบัญชา
// ----------------------------------------------------------------------------
export async function POST(request: Request) {
  try {
    const sessionUser = await getSessionUser();
    const isManager = sessionUser
      ? canManageSalaryPromotions(sessionUser.role, sessionUser.position, sessionUser.department)
      : false;

    const body = await request.json();
    const {
      staffId,
      fiscalYear = 2570,
      roundNumber = 1,
      templateKey,
      part1Snapshot = {},
      selfScores = {},
      supervisorScores = {},
      supervisorComment = '',
      action = 'save_self', // 'save_self' | 'submit_self' | 'save_supervisor' | 'finalize_evaluation' | 'acknowledge'
    } = body;

    if (!staffId || !templateKey) {
      return NextResponse.json(
        { success: false, error: 'ข้อมูลไม่ครบถ้วน (staffId และ templateKey จำเป็น)' },
        { status: 400 }
      );
    }

    const isSelf =
      sessionUser &&
      (sessionUser.id === staffId ||
        sessionUser.employeeCode === staffId ||
        sessionUser.email === staffId);

    // ตรวจสอบสิทธิ์ตาม Action
    if (['save_supervisor', 'finalize_evaluation'].includes(action)) {
      if (!isManager) {
        return NextResponse.json(
          { success: false, error: 'สงวนสิทธิ์เฉพาะผู้บังคับบัญชาและผู้ดูแลระบบ' },
          { status: 403 }
        );
      }
    } else if (['save_self', 'submit_self', 'acknowledge'].includes(action)) {
      if (!isSelf && !isManager) {
        return NextResponse.json(
          { success: false, error: 'ไม่อนุญาตให้แก้ไขคะแนนประเมินตนเองของผู้อื่น' },
          { status: 403 }
        );
      }
    }

    // คำนวณผลคะแนนอัตโนมัติ
    let selfTotal: number | null = null;
    let supervisorTotal: number | null = null;
    let ratingLevel: string | null = null;

    if (selfScores && Object.keys(selfScores).length > 0) {
      const calcSelf = calculateEvaluationTotals(templateKey as EvaluationTemplateKey, selfScores);
      selfTotal = calcSelf.grandTotal;
      ratingLevel = calcSelf.ratingLevel;
    }

    if (supervisorScores && Object.keys(supervisorScores).length > 0) {
      const calcSuper = calculateEvaluationTotals(
        templateKey as EvaluationTemplateKey,
        supervisorScores
      );
      supervisorTotal = calcSuper.grandTotal;
      // หากผู้บังคับบัญชาประเมินแล้ว ให้ยึดระดับผลการประเมินของผู้บังคับบัญชาเป็นหลัก
      ratingLevel = calcSuper.ratingLevel;
    }

    // กำหนดสถานะและเวลาการลงนาม
    let newStatus: 'draft' | 'self_submitted' | 'evaluated' | 'acknowledged' = 'draft';
    let selfSignedAt: string | null = null;
    let supervisorSignedAt: string | null = null;
    let acknowledgedAt: string | null = null;

    const existing = await dbGetPerformanceEvaluation(staffId, fiscalYear, roundNumber);
    if (existing) {
      newStatus = existing.status;
      selfSignedAt = existing.self_signed_at;
      supervisorSignedAt = existing.supervisor_signed_at;
      acknowledgedAt = existing.acknowledged_at;
    }

    const now = new Date().toISOString();

    if (action === 'save_self') {
      if (newStatus === 'draft') newStatus = 'draft';
    } else if (action === 'submit_self') {
      newStatus = 'self_submitted';
      selfSignedAt = now;
    } else if (action === 'save_supervisor') {
      // บันทึกแบบร่างของผู้บังคับบัญชา
    } else if (action === 'finalize_evaluation') {
      newStatus = 'evaluated';
      supervisorSignedAt = now;
    } else if (action === 'acknowledge') {
      newStatus = 'acknowledged';
      acknowledgedAt = now;
    }

    const savedRecord = await dbSavePerformanceEvaluation({
      staff_id: staffId,
      fiscal_year: fiscalYear,
      round_number: roundNumber,
      template_key: templateKey,
      part1_snapshot: part1Snapshot,
      self_scores: selfScores,
      supervisor_scores: supervisorScores,
      self_total: selfTotal,
      supervisor_total: supervisorTotal,
      rating_level: ratingLevel,
      supervisor_comment: supervisorComment,
      status: newStatus,
      self_signed_at: selfSignedAt,
      supervisor_signed_at: supervisorSignedAt,
      acknowledged_at: acknowledgedAt,
    });

    // บันทึก Audit Log
    recordAuditLog(
      'UPDATE_PERFORMANCE_EVALUATION',
      sessionUser?.name || 'System',
      sessionUser?.role || 'user',
      staffId,
      `บันทึกผลการประเมิน ปีงบ ${fiscalYear} รอบที่ ${roundNumber} (${action}) สถานะ: ${newStatus} คะแนน: ${supervisorTotal ?? selfTotal ?? '-'}`
    );

    return NextResponse.json({
      success: true,
      data: savedRecord,
      message:
        action === 'submit_self'
          ? 'บันทึกและส่งผลการประเมินตนเองเรียบร้อยแล้ว'
          : action === 'finalize_evaluation'
          ? 'บันทึกและอนุมัติผลการประเมินของผู้บังคับบัญชาเรียบร้อยแล้ว'
          : 'บันทึกข้อมูลเรียบร้อยแล้ว',
    });
  } catch (err: any) {
    console.error('[API /api/admin/evaluations POST Error]', err);
    return NextResponse.json(
      { success: false, error: err.message || 'เกิดข้อผิดพลาดในการบันทึกแบบประเมิน' },
      { status: 500 }
    );
  }
}
