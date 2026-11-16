/**
 * =========================================================================
 * THAI CIVIL SERVICE LEAVE REGULATORY ENGINE
 * =========================================================================
 * Governing Regulation: ระเบียบสำนักนายกรัฐมนตรีว่าด้วยการลาของข้าราชการ พ.ศ. 2555
 * =========================================================================
 */

import type { LeaveType, HalfDayPeriod } from '@/types/database.types';

export interface LeaveCalculationOptions {
  startDate: string | Date;
  endDate: string | Date;
  leaveType: LeaveType;
  halfDayPeriod?: HalfDayPeriod;
  holidaysList?: (string | Date)[];
}

export interface LeaveQuotaCheckOptions {
  leaveType: LeaveType;
  requestedDays: number;
  usedDays: number;
  isFirstYearAppointee?: boolean; // ข้าราชการบรรจุใหม่ในปีงบประมาณแรก
  consecutiveSickDays?: number;
}

export interface LeaveQuotaValidationResult {
  isValid: boolean;
  maxQuota: number;
  remainingBefore: number;
  remainingAfter: number;
  exceededDays: number;
  warnings: string[];
  requiresMedicalCertificate: boolean;
}

export function isContinuousCalendarLeave(leaveType: LeaveType): boolean {
  return (
    leaveType === 'ลาคลอดบุตร' ||
    leaveType === 'ลาอุปสมบท/ฮัจย์' ||
    leaveType === 'ลาตรวจเลือก/เตรียมพล'
  );
}

export function calculateWorkingDays(options: LeaveCalculationOptions): number {
  const { startDate, endDate, leaveType, halfDayPeriod = 'FULL', holidaysList = [] } = options;

  const start = typeof startDate === 'string' ? new Date(startDate) : new Date(startDate.getTime());
  const end = typeof endDate === 'string' ? new Date(endDate) : new Date(endDate.getTime());

  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
    return 0;
  }

  // Short permit out of school premises is not counted as official leave days
  if (leaveType === 'ขออนุญาตออกนอกบริเวณสถานศึกษา' || leaveType === 'ไปราชการ') {
    return 0;
  }

  // Half-day support for single date requests
  if (start.getTime() === end.getTime() && (halfDayPeriod === 'MORNING' || halfDayPeriod === 'AFTERNOON')) {
    return 0.5;
  }

  // Calendar days: Continuous counting (includes weekends and holidays)
  if (isContinuousCalendarLeave(leaveType)) {
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }

  // Normalize holidays to YYYY-MM-DD set
  const holidaySet = new Set<string>();
  holidaysList.forEach(h => {
    if (typeof h === 'string') {
      holidaySet.add(h.split('T')[0]);
    } else if (h instanceof Date && !isNaN(h.getTime())) {
      holidaySet.add(h.toISOString().split('T')[0]);
    }
  });

  let workingDays = 0;
  const current = new Date(start.getTime());

  while (current <= end) {
    const dayOfWeek = current.getDay(); // 0 = Sun, 6 = Sat
    const isoDate = current.toISOString().split('T')[0];

    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidaySet.has(isoDate)) {
      workingDays++;
    }

    current.setDate(current.getDate() + 1);
  }

  return workingDays;
}

export function validateLeaveQuota(options: LeaveQuotaCheckOptions): LeaveQuotaValidationResult {
  const {
    leaveType,
    requestedDays,
    usedDays,
    isFirstYearAppointee = false,
    consecutiveSickDays = 0
  } = options;

  let maxQuota = 60; // Default sick leave
  const warnings: string[] = [];
  let requiresMedicalCertificate = false;

  switch (leaveType) {
    case 'ลาป่วย':
      maxQuota = 60;
      if (requestedDays + consecutiveSickDays >= 30) {
        requiresMedicalCertificate = true;
        warnings.push('การลาป่วยตั้งแต่ 30 วันขึ้นไป ต้องแนบใบรับรองแพทย์จากสถานพยาบาลตามระเบียบฯ');
      }
      break;

    case 'ลากิจส่วนตัว':
      // ระเบียบสำนักนายกฯ 2555: บรรจุใหม่ในปีงบประมาณแรก ลากิจได้ไม่เกิน 15 วันทำการ
      maxQuota = isFirstYearAppointee ? 15 : 45;
      if (isFirstYearAppointee) {
        warnings.push('ข้าราชการที่เริ่มบรรจุในปีงบประมาณนี้ ได้รับสิทธิ์ลากิจส่วนตัวไม่เกิน 15 วันทำการ');
      }
      break;

    case 'ลาพักผ่อน':
      maxQuota = 10;
      if (isFirstYearAppointee) {
        warnings.push('ข้าราชการบรรจุใหม่ที่ปฏิบัติราชการยังไม่ครบ 6 เดือน ไม่มีสิทธิ์ลาพักผ่อน');
      }
      break;

    case 'ลาคลอดบุตร':
      maxQuota = 90; // วันปฏิทิน
      break;

    case 'ลาช่วยภริยาคลอดบุตร':
      maxQuota = 15; // วันทำการ ภายใน 90 วัน
      break;

    default:
      maxQuota = 999;
      break;
  }

  const remainingBefore = Math.max(0, maxQuota - usedDays);
  const remainingAfter = remainingBefore - requestedDays;
  const isValid = remainingAfter >= 0;
  const exceededDays = isValid ? 0 : Math.abs(remainingAfter);

  if (!isValid) {
    warnings.push(`จำนวนวันลาเกินสิทธิ์ที่ได้รับตามระเบียบฯ (เกิน ${exceededDays} วัน)`);
  }

  return {
    isValid,
    maxQuota,
    remainingBefore,
    remainingAfter: Math.max(0, remainingAfter),
    exceededDays,
    warnings,
    requiresMedicalCertificate
  };
}
