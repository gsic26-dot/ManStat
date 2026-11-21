/**
 * ============================================================================
 * ManStat: Khurusapha Licenses & PA Workload Regulatory Engine
 * ============================================================================
 * Governing Regulations:
 * 1. ข้อบังคับคุรุสภาว่าด้วยใบอนุญาตประกอบวิชาชีพ พ.ศ. 2565
 * 2. เกณฑ์การประเมินตำแหน่งและวิทยฐานะ (PA) ตาม ว9/2564 และ ว21/2564
 * ============================================================================
 */

import type { LicenseType, LicenseHealthStatus } from '@/types/database.types';

export interface LicenseHealthResult {
  expiryDateISO: string;
  daysRemaining: number;
  health: LicenseHealthStatus;
  statusColor: 'green' | 'yellow' | 'red';
  statusText: string;
  isExpiringSoon: boolean;
  isExpired: boolean;
}

export interface PAWorkloadInput {
  teachingHours: number;    // ด้านที่ 1 ชั่วโมงสอนตามตารางสอน
  supportHours: number;     // ด้านที่ 2 งานส่งเสริมและสนับสนุนการจัดการเรียนรู้
  developmentHours: number; // ด้านที่ 3 งานพัฒนาคุณภาพการจัดการศึกษา
  policyHours: number;      // ด้านที่ 4 งานตอบสนองนโยบายและจุดเน้น
  isAdministrator?: boolean; // ผู้บริหารสถานศึกษา (เกณฑ์สอนขั้นต่ำ 6 ชม./สัปดาห์)
}

export interface PAWorkloadEvaluationResult {
  totalHours: number;
  minimumRequiredHours: number;
  minimumTeachingHours: number;
  isTotalHoursPassed: boolean;
  isTeachingHoursPassed: boolean;
  isAllPassed: boolean;
  breakdown: {
    teachingHours: number;
    supportHours: number;
    developmentHours: number;
    policyHours: number;
  };
  warnings: string[];
}

/**
 * คืนค่าอายุใบอนุญาตประกอบวิชาชีพคุรุสภาตามข้อบังคับคุรุสภา พ.ศ. 2565
 */
export function getLicenseValidityYears(type: LicenseType): number {
  switch (type) {
    case 'P-License':
      return 2;
    case 'B-License':
      return 5;
    case 'A-License':
      return 7;
    case 'ผู้บริหารสถานศึกษา':
      return 5;
    case 'ผู้บริหารการศึกษา':
      return 5;
    case 'ศึกษานิเทศก์':
      return 5;
    default:
      return 5;
  }
}

/**
 * ตรวจสอบความสมบูรณ์และระยะเวลาหมดอายุของใบอนุญาตประกอบวิชาชีพ (แจ้งเตือนล่วงหน้า 90 วัน)
 */
export function evaluateLicenseHealth(
  expiryDateInput: string | Date,
  referenceDateInput?: string | Date
): LicenseHealthResult {
  const expiry = typeof expiryDateInput === 'string' ? new Date(expiryDateInput) : expiryDateInput;
  const ref = referenceDateInput
    ? (typeof referenceDateInput === 'string' ? new Date(referenceDateInput) : referenceDateInput)
    : new Date();

  expiry.setHours(0, 0, 0, 0);
  ref.setHours(0, 0, 0, 0);

  const diffTime = expiry.getTime() - ref.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const isExpired = daysRemaining <= 0;
  const isExpiringSoon = !isExpired && daysRemaining <= 90;

  let health: LicenseHealthStatus = 'VALID';
  let statusColor: 'green' | 'yellow' | 'red' = 'green';
  let statusText = 'ปกติ';

  if (isExpired) {
    health = 'EXPIRED';
    statusColor = 'red';
    statusText = `หมดอายุแล้ว (${Math.abs(daysRemaining)} วัน)`;
  } else if (isExpiringSoon) {
    health = 'EXPIRING_SOON';
    statusColor = 'yellow';
    statusText = `ใกล้หมดอายุ (เหลือ ${daysRemaining} วัน)`;
  } else {
    health = 'VALID';
    statusColor = 'green';
    statusText = `ปกติ (เหลือ ${daysRemaining} วัน)`;
  }

  return {
    expiryDateISO: expiry.toISOString().split('T')[0],
    daysRemaining,
    health,
    statusColor,
    statusText,
    isExpiringSoon,
    isExpired
  };
}

/**
 * ประเมินชั่วโมงภาระงานตามข้อตกลงในการพัฒนางาน (PA) ตามเกณฑ์ ว9/2564 และ ว21/2564
 * - รวมภาระงานทั้ง 4 ด้านต้องไม่น้อยกว่า 20 ชั่วโมง/สัปดาห์
 * - ชั่วโมงการจัดการเรียนรู้ (ด้านที่ 1) ต้องไม่น้อยกว่า 12 ชั่วโมง/สัปดาห์ (สำหรับครู) หรือ 6 ชั่วโมง/สัปดาห์ (สำหรับผู้บริหาร)
 */
export function evaluatePAWorkload(input: PAWorkloadInput): PAWorkloadEvaluationResult {
  const {
    teachingHours = 0,
    supportHours = 0,
    developmentHours = 0,
    policyHours = 0,
    isAdministrator = false
  } = input;

  const totalHours = Number((teachingHours + supportHours + developmentHours + policyHours).toFixed(2));
  const minimumRequiredHours = 20;
  const minimumTeachingHours = isAdministrator ? 6 : 12;

  const isTotalHoursPassed = totalHours >= minimumRequiredHours;
  const isTeachingHoursPassed = teachingHours >= minimumTeachingHours;
  const isAllPassed = isTotalHoursPassed && isTeachingHoursPassed;

  const warnings: string[] = [];

  if (!isTotalHoursPassed) {
    warnings.push(`ภาระงานรวมทั้ง 4 ด้านไม่ครบตามเกณฑ์ขั้นต่ำ (${totalHours}/${minimumRequiredHours} ชั่วโมง/สัปดาห์ ขาดอีก ${(minimumRequiredHours - totalHours).toFixed(2)} ชม.)`);
  }

  if (!isTeachingHoursPassed) {
    warnings.push(`ชั่วโมงการจัดการเรียนรู้ (ด้านที่ 1) ไม่ครบเกณฑ์ขั้นต่ำ (${teachingHours}/${minimumTeachingHours} ชั่วโมง/สัปดาห์)`);
  }

  return {
    totalHours,
    minimumRequiredHours,
    minimumTeachingHours,
    isTotalHoursPassed,
    isTeachingHoursPassed,
    isAllPassed,
    breakdown: {
      teachingHours,
      supportHours,
      developmentHours,
      policyHours
    },
    warnings
  };
}
