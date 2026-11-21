/**
 * ============================================================================
 * ManStat: Dashboard Helper Functions & Regulations Compliance
 * ============================================================================
 * - Dynamic Current User identity resolution & per-user scoping
 * - Regulation 2555 & ก.ค.ศ. ว15/2561 evaluation round leave calculations
 * - Holiday & weekend status checks for daily on-duty metrics
 * - Role-based panel resolution (Approvers vs Regular Teachers/Staff)
 * ============================================================================
 */

import type { TeacherRecord, LeaveRequestRecord } from '@/lib/data/schoolData';
import type { HolidayRecord } from '@/lib/db/serverDb';
import { isAdminRole } from '@/lib/auth/roles';
import { getFiscalYearBE, getEvalRound } from './fiscal-and-retirement';
import { formatStaffName, parseThaiName } from './staff-formatting';

export interface DashboardUserIdentity {
  id: string;
  employeeCode: string;
  name: string;
  prefix: string;
  firstName: string;
  lastName: string;
  position: string;
  role: string;
  accessLevel: string;
  isApprover: boolean;
  isFirstYearAppointee: boolean;
  isEligibleForVacation: boolean;
}

/**
 * ตรวจสอบว่าตำแหน่งนี้มีสิทธิลาพักผ่อนตามระเบียบฯ 2555 ข้อ 22 หรือไม่
 * ข้าราชการครูผู้สอนปกติไม่มีสิทธิลาพักผ่อนเพราะมีวันปิดภาคเรียน
 * ผู้มีสิทธิคือ ผู้อำนวยการ, รองผู้อำนวยการ หรือบุคลากรสายสนับสนุนที่ปฏิบัติงานตลอดปี
 */
export function isEligibleForVacation(position?: string | null): boolean {
  if (!position) return false;
  const p = position.trim();

  // ผู้บริหารสถานศึกษา
  if (p.includes('ผู้อำนวยการ') || p.includes('รองผู้อำนวยการ')) {
    return true;
  }

  // บุคลากรสายสนับสนุน/บริการที่ปฏิบัติงานตลอดปี (ไม่มีปิดภาคเรียน)
  if (
    p.includes('ธุรการ') ||
    p.includes('ภารโรง') ||
    p.includes('สนับสนุน') ||
    p.includes('พนักงานราชการ') ||
    p.includes('พี่เลี้ยง')
  ) {
    return true;
  }

  // ครูผู้สอนไม่มีสิทธิลาพักผ่อน
  if (p.includes('ครู')) {
    return false;
  }

  return false;
}

/**
 * ค้นหาและแปลงข้อมูล currentUser ให้ตรงกับฐานข้อมูลบุคลากรจริง
 */
export function resolveDashboardUser(
  currentUser: any,
  staffList: TeacherRecord[],
  currentFiscalYearBE: number
): DashboardUserIdentity {
  let matched: TeacherRecord | undefined;

  if (currentUser) {
    matched = staffList.find(
      (s) =>
        (currentUser.id && s.id === currentUser.id) ||
        (currentUser.employeeCode && s.employeeCode === currentUser.employeeCode) ||
        (currentUser.name && s.name === currentUser.name)
    );
  }

  // หากยังไม่พบบุคลากร ให้พิจารณา fallback ไปยังคนแรก (เช่น ผอ.) หรือ safe user
  if (!matched && staffList.length > 0) {
    if (currentUser?.role === 'superuser' || currentUser?.role === 'director') {
      matched = staffList.find((s) => s.position.includes('ผู้อำนวยการ')) || staffList[0];
    }
  }

  const id = matched?.id || currentUser?.id || 'GUEST-001';
  const employeeCode = matched?.employeeCode || currentUser?.employeeCode || id;
  const formattedName = formatStaffName(matched || currentUser || { name: currentUser?.name || 'ผู้ใช้งาน' });
  let prefix = matched?.prefix || '';
  let firstName = matched?.firstName || '';
  let lastName = matched?.lastName || '';
  if (!prefix || !firstName) {
    const parsed = parseThaiName(formattedName, prefix);
    if (!prefix) prefix = parsed.prefix;
    if (!firstName) firstName = parsed.firstName;
    if (!lastName) lastName = parsed.lastName;
  }
  const name = formattedName;
  const position = matched?.position || currentUser?.position || 'บุคลากร';
  const role = currentUser?.role || matched?.role || 'teacher';
  const accessLevel = matched?.accessLevel || currentUser?.accessLevel || 'User';

  const isApprover = isAdminRole(role);

  // ข้าราชการบรรจุใหม่ในปีงบประมาณปัจจุบัน (นับจาก startDate)
  let isFirstYearAppointee = false;
  if (matched?.startDate) {
    try {
      const startFiscalYearBE = getFiscalYearBE(matched.startDate);
      isFirstYearAppointee = startFiscalYearBE === currentFiscalYearBE;
    } catch {
      isFirstYearAppointee = false;
    }
  }

  const vacationEntitled = isEligibleForVacation(position);

  return {
    id,
    employeeCode,
    name,
    prefix,
    firstName,
    lastName,
    position,
    role,
    accessLevel,
    isApprover,
    isFirstYearAppointee,
    isEligibleForVacation: vacationEntitled,
  };
}

export interface HolidayStatus {
  isHoliday: boolean;
  isWeekend: boolean;
  reason: string;
  label: string;
}

/**
 * ตรวจสอบว่าวันที่ระบุเป็นวันเสาร์-อาทิตย์ หรือวันหยุดราชการหรือไม่
 */
export function isWeekendOrHoliday(
  dateInput: Date | string,
  holidays: HolidayRecord[] = []
): HolidayStatus {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) {
    return {
      isHoliday: false,
      isWeekend: false,
      reason: 'วันทำการปกติ',
      label: 'วันทำการปกติ',
    };
  }

  const dayOfWeek = d.getDay(); // 0 = Sun, 6 = Sat
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return {
      isHoliday: true,
      isWeekend: true,
      reason: 'วันหยุดประจำสัปดาห์',
      label: 'วันหยุดราชการ',
    };
  }

  const isoDate = d.toISOString().split('T')[0];
  const matchedHoliday = holidays.find((h) => {
    const hDate = h.date?.includes('T') ? h.date.split('T')[0] : h.date;
    return hDate === isoDate;
  });

  if (matchedHoliday) {
    return {
      isHoliday: true,
      isWeekend: false,
      reason: matchedHoliday.name || 'วันหยุดราชการ',
      label: 'วันหยุดราชการ',
    };
  }

  return {
    isHoliday: false,
    isWeekend: false,
    reason: 'วันทำการปกติ',
    label: 'วันทำการปกติ',
  };
}

export interface DutyMetric {
  value: number | string;
  unit: string;
  subtext: string;
  isHoliday: boolean;
}

/**
 * คำนวณค่าตัวเลขและข้อความสำหรับการ์ด "ปฏิบัติหน้าที่วันนี้"
 */
export function calculateDutyMetric(
  totalStaff: number,
  onLeaveCount: number,
  holidayStatus: HolidayStatus
): DutyMetric {
  if (holidayStatus.isHoliday) {
    return {
      value: 'วันหยุดราชการ',
      unit: '',
      subtext: holidayStatus.reason,
      isHoliday: true,
    };
  }

  const activeStaff = Math.max(0, totalStaff - onLeaveCount);
  return {
    value: activeStaff,
    unit: 'คน',
    subtext: activeStaff === totalStaff ? 'มาปฏิบัติหน้าที่ครบทุกคน' : 'พร้อมปฏิบัติหน้าที่ในสถานศึกษา',
    isHoliday: false,
  };
}

/**
 * คำนวณช่วงวันที่ของรอบการประเมิน ก.ค.ศ. ว15/2561
 * รอบ 1: 1 ต.ค. - 31 มี.ค.
 * รอบ 2: 1 เม.ย. - 30 ก.ย.
 */
export function getEvaluationRoundDateRange(
  fiscalYearBE: number,
  round: 1 | 2
): { startDate: string; endDate: string } {
  const fiscalYearCE = fiscalYearBE - 543;
  if (round === 1) {
    const startYear = fiscalYearCE - 1;
    return {
      startDate: `${startYear}-10-01`,
      endDate: `${fiscalYearCE}-03-31`,
    };
  } else {
    return {
      startDate: `${fiscalYearCE}-04-01`,
      endDate: `${fiscalYearCE}-09-30`,
    };
  }
}

/**
 * ตรวจสอบว่าคำขอลาเป็นของผู้ใช้หรือไม่
 */
export function isLeaveRequestOfUser(
  request: LeaveRequestRecord,
  user: { id?: string; employeeCode?: string; name?: string }
): boolean {
  if (user.id && request.teacherId === user.id) {
    return true;
  }
  if (user.employeeCode && request.teacherId === user.employeeCode) {
    return true;
  }
  if (
    user.name &&
    (request.teacherName === user.name ||
      formatStaffName(request.teacherName) === formatStaffName(user.name))
  ) {
    return true;
  }
  return false;
}

export interface UserRoundLeaveStats {
  leaveCount: number;
  sickPersonalDays: number;
  isEligible: boolean;
  roundRequests: LeaveRequestRecord[];
}

/**
 * คำนวณยอดวันลาและจำนวนครั้งในรอบการประเมินปัจจุบันสำหรับผู้ใช้คนนั้นๆ
 * ตามเกณฑ์ ก.ค.ศ. ว15/2561 (เฉพาะลาป่วยและลากิจส่วนตัว ไม่เกิน 6 ครั้ง และไม่เกิน 23 วันทำการ)
 */
export function calculateUserRoundLeaveStats(
  leaveList: LeaveRequestRecord[],
  targetUser: { id?: string; employeeCode?: string; name?: string },
  fiscalYearBE: number,
  round: 1 | 2
): UserRoundLeaveStats {
  const { startDate: roundStart, endDate: roundEnd } = getEvaluationRoundDateRange(fiscalYearBE, round);

  const roundRequests = leaveList.filter((r) => {
    if (r.status !== 'approved') return false;
    if (!isLeaveRequestOfUser(r, targetUser)) return false;

    // ตรวจสอบว่าช่วงวันลาทับซ้อนหรืออยู่ในรอบประเมินนี้
    const reqStart = r.startDate;
    const reqEnd = r.endDate || r.startDate;
    const isWithinRound = reqStart <= roundEnd && reqEnd >= roundStart;
    if (!isWithinRound) return false;

    // เฉพาะประเภทลาที่นับตามเกณฑ์ ว15/2561 (ลาป่วย และ ลากิจส่วนตัว)
    const type = r.leaveTypeName || r.leaveType;
    return type === 'ลาป่วย' || type === 'ลากิจส่วนตัว';
  });

  const leaveCount = roundRequests.length;
  const sickPersonalDays = roundRequests.reduce((sum, r) => sum + (Number(r.totalDays) || 0), 0);
  const isEligible = leaveCount <= 6 && sickPersonalDays <= 23;

  return {
    leaveCount,
    sickPersonalDays,
    isEligible,
    roundRequests,
  };
}

export interface UserFiscalLeaveQuota {
  sickLeaveUsed: number;
  sickLeaveMax: number;
  personalLeaveUsed: number;
  personalLeaveMax: number;
  vacationLeaveUsed: number;
  vacationLeaveMax: number;
  hasVacation: boolean;
}

/**
 * คำนวณโควตาวันลาสะสมตลอดปีงบประมาณของผู้ใช้ (ระเบียบฯ 2555)
 */
export function calculateUserFiscalLeaveQuota(
  leaveList: LeaveRequestRecord[],
  targetUser: {
    id?: string;
    employeeCode?: string;
    name?: string;
    sickUsed?: number;
    personalUsed?: number;
    vacationUsed?: number;
  },
  fiscalYearBE: number,
  isFirstYearAppointee: boolean,
  isEligibleForVacation: boolean
): UserFiscalLeaveQuota {
  const fiscalYearCE = fiscalYearBE - 543;
  const fiscalStart = `${fiscalYearCE - 1}-10-01`;
  const fiscalEnd = `${fiscalYearCE}-09-30`;

  let sickDays = 0;
  let personalDays = 0;
  let vacationDays = 0;

  const userFiscalRequests = leaveList.filter((r) => {
    if (r.status !== 'approved') return false;
    if (!isLeaveRequestOfUser(r, targetUser)) return false;
    const reqStart = r.startDate;
    const reqEnd = r.endDate || r.startDate;
    return reqStart <= fiscalEnd && reqEnd >= fiscalStart;
  });

  if (userFiscalRequests.length > 0) {
    for (const r of userFiscalRequests) {
      const type = r.leaveTypeName || r.leaveType;
      const days = Number(r.totalDays) || 0;
      if (type === 'ลาป่วย') sickDays += days;
      else if (type === 'ลากิจส่วนตัว') personalDays += days;
      else if (type === 'ลาพักผ่อน') vacationDays += days;
    }
  } else {
    // ใช้ค่ายอดสะสมตั้งต้นจากโปรไฟล์ถ้ามี
    sickDays = targetUser.sickUsed || 0;
    personalDays = targetUser.personalUsed || 0;
    vacationDays = targetUser.vacationUsed || 0;
  }

  const personalLeaveMax = isFirstYearAppointee ? 15 : 45;

  return {
    sickLeaveUsed: sickDays,
    sickLeaveMax: 60,
    personalLeaveUsed: personalDays,
    personalLeaveMax,
    vacationLeaveUsed: vacationDays,
    vacationLeaveMax: 10,
    hasVacation: isEligibleForVacation,
  };
}

/**
 * ดึงรายการคำขอลาล่าสุดของผู้ใช้ (สำหรับแผงคำขอลาล่าสุดของฉัน)
 */
export function getUserRecentLeaveRequests(
  leaveList: LeaveRequestRecord[],
  targetUser: { id?: string; employeeCode?: string; name?: string },
  limit = 5
): LeaveRequestRecord[] {
  return leaveList
    .filter((r) => isLeaveRequestOfUser(r, targetUser))
    .sort((a, b) => {
      const dateA = a.submittedAt || a.startDate;
      const dateB = b.submittedAt || b.startDate;
      return dateB.localeCompare(dateA);
    })
    .slice(0, limit);
}
