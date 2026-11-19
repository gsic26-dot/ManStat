/**
 * ============================================================================
 * ManStat-Modern: Leave Calculator & Quota Validation Regulatory Engine
 * ============================================================================
 * Governing Regulations:
 * 1. ระเบียบสำนักนายกรัฐมนตรีว่าด้วยการลาของข้าราชการ พ.ศ. 2555
 * 2. หลักเกณฑ์การเลื่อนเงินเดือนข้าราชการครู (ก.ค.ศ. ว15/2561)
 * ============================================================================
 */

import type { LeaveType, HalfDayPeriod } from '@/types/database.types';
import { isZeroDayLeaveType } from './leaveTypes';

export interface LeaveRuleValidationParams {
  leaveType: LeaveType;
  requestedDays: number;
  usedDaysInFiscalYear: number;
  usedOccurrencesInRound: number;
  usedSickPersonalDaysInRound: number;
  isFirstYearAppointee?: boolean;
  isYearRoundStaff?: boolean;
  tenureMonths?: number;
  consecutiveSickDays?: number;
  deliveryDate?: string | Date;
  leaveStartDate?: string | Date;
}

export interface LeaveRuleValidationResult {
  isValid: boolean;
  maxQuota: number;
  remainingQuotaBefore: number;
  remainingQuotaAfter: number;
  requireMedicalCert: boolean;
  warnings: string[];
  errors: string[];
  isPromotionRisk: boolean;
}

/**
 * คำนวณจำนวนวันลาตามระเบียบสำนักนายกรัฐมนตรีว่าด้วยการลา พ.ศ. 2555
 */
export function calculateLeaveDays(
  startDate: string,
  endDate: string,
  leaveType: LeaveType,
  halfDay: HalfDayPeriod = 'full',
  holidays: string[] = []
): number {
  const start = new Date(startDate);
  const end = new Date(endDate);

  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
    return 0;
  }

  // การขออนุญาตออกนอกบริเวณสถานศึกษาและการไปราชการ ไม่นับเป็นวันลา (0 วันทำการ)
  if (isZeroDayLeaveType(leaveType)) {
    return 0;
  }

  // รองรับการลาครึ่งวัน (ระเบียบ ข้อ 10 วรรค 6: เฉพาะลาป่วยและลากิจส่วนตัวในวันเดียวกัน)
  const isHalfDay = halfDay === 'morning' || halfDay === 'afternoon';
  if (isHalfDay && start.getTime() === end.getTime()) {
    if (leaveType === 'ลาป่วย' || leaveType === 'ลากิจส่วนตัว') {
      return 0.5;
    }
  }

  // ประเภทการลาที่นับตาม "วันปฏิทิน" (นับต่อเนื่องรวมวันเสาร์-อาทิตย์และวันหยุดนักขัตฤกษ์)
  const isCalendarDayLeave =
    leaveType === 'ลาคลอดบุตร' ||
    leaveType === 'ลาอุปสมบทหรือการลาไปประกอบพิธีฮัจย์' ||
    leaveType === 'ลาเข้ารับการตรวจเลือกหรือเข้ารับการเตรียมพล' ||
    leaveType === 'ลาไปศึกษา ฝึกอบรม ปฏิบัติการวิจัย หรือดูงาน';

  if (isCalendarDayLeave) {
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }

  // ประเภทการลาที่นับเฉพาะ "วันทำการ" (หักเสาร์-อาทิตย์ และหักวันหยุดใน holidays)
  // ได้แก่: ลาป่วย, ลากิจส่วนตัว, ลาไปช่วยเหลือภริยาที่คลอดบุตร, ลาพักผ่อน
  const holidaySet = new Set(holidays.map(h => h.split('T')[0]));
  let workingDays = 0;
  const curr = new Date(start.getTime());

  while (curr <= end) {
    const dayOfWeek = curr.getDay(); // 0 = Sun, 6 = Sat
    const isoDate = curr.toISOString().split('T')[0];

    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidaySet.has(isoDate)) {
      workingDays++;
    }

    curr.setDate(curr.getDate() + 1);
  }

  return workingDays;
}

/**
 * ตรวจสอบโควตาและเงื่อนไขการลาตามกฎหมายราชการไทย พร้อมระบบเรดาร์เตือนเกณฑ์เลื่อนเงินเดือน ว15/2561
 */
export function validateLeaveQuotaAndRules(
  params: LeaveRuleValidationParams
): LeaveRuleValidationResult {
  const {
    leaveType,
    requestedDays,
    usedDaysInFiscalYear,
    usedOccurrencesInRound,
    usedSickPersonalDaysInRound,
    isFirstYearAppointee = false,
    isYearRoundStaff = false,
    tenureMonths = 0,
    consecutiveSickDays = 0,
    deliveryDate,
    leaveStartDate
  } = params;

  let maxQuota = 60;
  let requireMedicalCert = false;
  const warnings: string[] = [];
  const errors: string[] = [];
  let isPromotionRisk = false;

  // การขออนุญาตออกนอกบริเวณสถานศึกษา และการไปราชการ (ไม่นับเป็นวันลา ไม่ตัดโควตา ไม่กระทบเงินเดือน)
  if (isZeroDayLeaveType(leaveType)) {
    return {
      isValid: true,
      maxQuota: 0,
      remainingQuotaBefore: 0,
      remainingQuotaAfter: 0,
      requireMedicalCert: false,
      warnings: [],
      errors: [],
      isPromotionRisk: false,
    };
  }

  switch (leaveType) {
    case 'ลาป่วย': {
      maxQuota = 60; // 60 วันทำการต่อปีงบประมาณที่ได้รับเงินเดือนปกติ
      const totalConsecutive = requestedDays + consecutiveSickDays;

      if (totalConsecutive >= 30) {
        requireMedicalCert = true;
        warnings.push('การลาป่วยตั้งแต่ 30 วันขึ้นไป ต้องแนบใบรับรองแพทย์จากสถานพยาบาลที่ได้รับอนุญาต');
      } else if (totalConsecutive >= 3) {
        warnings.push('การลาป่วยติดต่อกันตั้งแต่ 3 วันทำการขึ้นไป ผู้บังคับบัญชาอาจสั่งให้แสดงใบรับรองแพทย์ตามดุลยพินิจ');
      }

      if (usedDaysInFiscalYear + requestedDays > maxQuota) {
        warnings.push(`วันลาป่วยสะสมเกิน 60 วันทำการต่อปีงบประมาณ (${usedDaysInFiscalYear + requestedDays}/${maxQuota} วัน) ซึ่งเกินสิทธิได้รับเงินเดือนตามระเบียบฯ เว้นแต่ได้รับอนุมัติเป็นกรณีพิเศษ`);
      }
      break;
    }

    case 'ลากิจส่วนตัว': {
      // ระเบียบฯ 2555 ข้อ 17: บรรจุใหม่ในปีงบประมาณแรก ลากิจส่วนตัวได้ไม่เกิน 15 วันทำการ
      maxQuota = isFirstYearAppointee ? 15 : 45;

      if (isFirstYearAppointee && (usedDaysInFiscalYear + requestedDays > maxQuota)) {
        errors.push(`ข้าราชการบรรจุใหม่ในปีงบประมาณปัจจุบัน ได้รับสิทธิลากิจส่วนตัวไม่เกิน 15 วันทำการ (ปัจจุบันขอใช้รวม ${usedDaysInFiscalYear + requestedDays} วัน)`);
      } else if (usedDaysInFiscalYear + requestedDays > maxQuota) {
        errors.push(`วันลากิจส่วนตัวเกินโควตาสูงสุด 45 วันทำการต่อปีงบประมาณ (ปัจจุบันขอใช้รวม ${usedDaysInFiscalYear + requestedDays} วัน)`);
      }
      break;
    }

    case 'ลาคลอดบุตร': {
      maxQuota = 90; // 90 วันปฏิทิน
      if (requestedDays > 90) {
        errors.push('การลาคลอดบุตรมีสิทธิลาได้ไม่เกิน 90 วันปฏิทินต่อครั้ง');
      }
      break;
    }

    case 'ลาไปช่วยเหลือภริยาที่คลอดบุตร': {
      maxQuota = 15; // 15 วันทำการ
      if (requestedDays > 15) {
        errors.push('การลาไปช่วยเหลือภริยาที่คลอดบุตรมีสิทธิลาได้ไม่เกิน 15 วันทำการติดต่อกัน');
      }

      if (deliveryDate && leaveStartDate) {
        const dDate = typeof deliveryDate === 'string' ? new Date(deliveryDate) : deliveryDate;
        const lDate = typeof leaveStartDate === 'string' ? new Date(leaveStartDate) : leaveStartDate;
        const diffDays = Math.floor((lDate.getTime() - dDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays > 90) {
          errors.push('การลาไปช่วยเหลือภริยาที่คลอดบุตรต้องใช้สิทธิภายใน 90 วันนับแต่วันที่ภริยาคลอดบุตร');
        }
      }
      break;
    }

    case 'ลาพักผ่อน': {
      // ครูผู้สอนปกติไม่มีสิทธิลาพักผ่อนเพราะมีวันปิดภาคเรียนตามระเบียบ ข้อ 22
      if (!isYearRoundStaff) {
        errors.push('ข้าราชการครูผู้สอนไม่มีสิทธิลาพักผ่อนประจำปี เนื่องจากมีวันหยุดตามประเพณีและวันปิดภาคเรียนแล้ว (ยกเว้นผู้บริหารหรือเจ้าหน้าที่ที่ได้รับคำสั่งให้ปฏิบัติงานตลอดปี)');
        maxQuota = 0;
      } else if (tenureMonths < 6) {
        errors.push('ข้าราชการที่เริ่มบรรจุรับราชการยังไม่ครบ 6 เดือน ไม่มีสิทธิลาพักผ่อนประจำปี');
        maxQuota = 0;
      } else {
        // รับราชการ >= 10 ปี สะสมได้ไม่เกิน 30 วัน, น้อยกว่า 10 ปี สะสมไม่เกิน 20 วัน
        maxQuota = tenureMonths >= 120 ? 30 : 20;
        if (usedDaysInFiscalYear + requestedDays > maxQuota) {
          errors.push(`วันลาพักผ่อนสะสมเกินสิทธิสูงสุดตามอายุราชการ (${maxQuota} วันทำการ)`);
        }
      }
      break;
    }

    default:
      maxQuota = 999;
      break;
  }

  // --------------------------------------------------------------------------
  // เรดาร์เฝ้าระวังเกณฑ์การเลื่อนเงินเดือน (ก.ค.ศ. ว15/2561)
  // --------------------------------------------------------------------------
  if (leaveType === 'ลาป่วย' || leaveType === 'ลากิจส่วนตัว') {
    const newOccurrences = usedOccurrencesInRound + 1;
    const newSickPersonalDays = usedSickPersonalDaysInRound + requestedDays;

    if (newOccurrences > 6) {
      isPromotionRisk = true;
      warnings.push(`การลาครั้งนี้จะทำให้มีจำนวนครั้งการลาในรอบการประเมินปัจจุบันรวมเป็น ${newOccurrences} ครั้ง (เกิน 6 ครั้ง) เสี่ยงต่อการไม่ได้รับการพิจารณาเลื่อนเงินเดือนตามเกณฑ์ ก.ค.ศ. ว15/2561`);
    }

    if (newSickPersonalDays > 23) {
      isPromotionRisk = true;
      warnings.push(`การลาครั้งนี้จะทำให้มีวันลาป่วยและลากิจส่วนตัวรวมเป็น ${newSickPersonalDays} วันทำการ (เกิน 23 วันทำการ) เสี่ยงต่อการไม่ได้รับการพิจารณาเลื่อนเงินเดือนตามเกณฑ์ ก.ค.ศ. ว15/2561`);
    }
  }

  const remainingQuotaBefore = Math.max(0, maxQuota - usedDaysInFiscalYear);
  const remainingQuotaAfter = Math.max(0, remainingQuotaBefore - requestedDays);
  const isValid = errors.length === 0;

  return {
    isValid,
    maxQuota,
    remainingQuotaBefore,
    remainingQuotaAfter,
    requireMedicalCert,
    warnings,
    errors,
    isPromotionRisk
  };
}
