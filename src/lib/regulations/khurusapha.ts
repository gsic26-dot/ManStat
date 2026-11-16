/**
 * =========================================================================
 * KHURUSAPHA PROFESSIONAL LICENSE REGULATORY ENGINE
 * =========================================================================
 * Governing Standards: พระราชบัญญัติสภาครูและบุคลากรทางการศึกษา พ.ศ. 2546
 * และข้อบังคับคุรุสภาว่าด้วยใบอนุญาตประกอบวิชาชีพ พ.ศ. 2565
 * =========================================================================
 */

import type { LicenseType } from '@/types/database.types';

export interface LicenseStandardSpec {
  type: LicenseType;
  title: string;
  validityYears: number;
  description: string;
}

export const KHURUSAPHA_SPECS: Record<LicenseType, LicenseStandardSpec> = {
  'P-License': {
    type: 'P-License',
    title: 'ใบอนุญาตประกอบวิชาชีพครู (Provisional)',
    validityYears: 2,
    description: 'สำหรับผู้มีคุณวุฒิที่ยังไม่ผ่านเกณฑ์ทดสอบครบตามเกณฑ์ อายุ 2 ปี'
  },
  'B-License': {
    type: 'B-License',
    title: 'ใบอนุญาตประกอบวิชาชีพครูชั้นต้น (Basic)',
    validityYears: 5,
    description: 'ใบอนุญาตประกอบวิชาชีพครูมาตรฐาน อายุ 5 ปี'
  },
  'A-License': {
    type: 'A-License',
    title: 'ใบอนุญาตประกอบวิชาชีพครูชั้นสูง (Advanced)',
    validityYears: 7,
    description: 'สำหรับผู้มีวิทยฐานะตั้งแต่ชำนาญการพิเศษขึ้นไป อายุ 7 ปี'
  },
  'ผู้บริหารสถานศึกษา': {
    type: 'ผู้บริหารสถานศึกษา',
    title: 'ใบอนุญาตประกอบวิชาชีพผู้บริหารสถานศึกษา',
    validityYears: 5,
    description: 'สำหรับผู้อำนวยการและรองผู้อำนวยการสถานศึกษา อายุ 5 ปี'
  },
  'ศึกษานิเทศก์': {
    type: 'ศึกษานิเทศก์',
    title: 'ใบอนุญาตประกอบวิชาชีพศึกษานิเทศก์',
    validityYears: 5,
    description: 'สำหรับศึกษานิเทศก์ อายุ 5 ปี'
  }
};

export type LicenseStatusColor = 'green' | 'yellow' | 'red';

export interface LicenseStatusResult {
  licenseType: LicenseType;
  licenseNumber: string;
  issueDateISO: string;
  expiryDateISO: string;
  daysRemaining: number;
  statusText: string;
  statusColor: LicenseStatusColor;
  isExpired: boolean;
  isExpiringSoon: boolean; // within 90 days
}

export function evaluateLicenseStatus(
  licenseType: LicenseType,
  licenseNumber: string,
  issueDateInput: string | Date,
  expiryDateInput: string | Date,
  referenceDateInput?: string | Date
): LicenseStatusResult {
  const issueDate = typeof issueDateInput === 'string' ? new Date(issueDateInput) : issueDateInput;
  const expiryDate = typeof expiryDateInput === 'string' ? new Date(expiryDateInput) : expiryDateInput;
  const refDate = referenceDateInput
    ? (typeof referenceDateInput === 'string' ? new Date(referenceDateInput) : referenceDateInput)
    : new Date();

  expiryDate.setHours(0, 0, 0, 0);
  refDate.setHours(0, 0, 0, 0);

  const diffTime = expiryDate.getTime() - refDate.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const isExpired = daysRemaining <= 0;
  const isExpiringSoon = !isExpired && daysRemaining <= 90;

  let statusText = 'ปกติ';
  let statusColor: LicenseStatusColor = 'green';

  if (isExpired) {
    statusText = `หมดอายุแล้ว (เกินกำหนด ${Math.abs(daysRemaining)} วัน)`;
    statusColor = 'red';
  } else if (isExpiringSoon) {
    statusText = `ใกล้หมดอายุ (เหลือ ${daysRemaining} วัน)`;
    statusColor = 'yellow';
  } else {
    statusText = `ปกติ (เหลือ ${daysRemaining} วัน)`;
    statusColor = 'green';
  }

  return {
    licenseType,
    licenseNumber,
    issueDateISO: issueDate.toISOString().split('T')[0],
    expiryDateISO: expiryDate.toISOString().split('T')[0],
    daysRemaining,
    statusText,
    statusColor,
    isExpired,
    isExpiringSoon
  };
}
