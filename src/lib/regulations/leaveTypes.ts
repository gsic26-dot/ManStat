/**
 * ============================================================================
 * ManStat: Master Leave Types & Special Permissions Config
 * Single Source of Truth for Statutory Leave & School Exit Permissions
 * ============================================================================
 * Governing Regulations:
 * 1. ระเบียบสำนักนายกรัฐมนตรีว่าด้วยการลาของข้าราชการ พ.ศ. 2555 (11 ประเภท)
 * 2. หลักเกณฑ์การเลื่อนเงินเดือนข้าราชการครูและบุคลากรทางการศึกษา (ก.ค.ศ. ว15/2561)
 * 3. ระเบียบสถานศึกษาว่าด้วยการขออนุญาตออกนอกบริเวณโรงเรียนในเวลาราชการ (ไม่เกิน 3 ชั่วโมง)
 * 4. ระเบียบการไปปฏิบัติราชการภายนอกสถานศึกษา
 *
 * Strict Zero-Emoji UI Standard, Pure Thai Civil-Service Compliance
 * ============================================================================
 */

import type { LeaveTypeEnum } from '@/types/database.types';

export interface LeaveTypeDefinition {
  id: string;
  value: LeaveTypeEnum;
  label: string;
  category: 'statutory' | 'special_permission';
  groupLabel: string;
  description: string;
  maxDays?: number;
  maxHours?: number;
  isZeroDays: boolean;
  affectsSalaryPromotion: boolean;
  warningNote?: string;
  requiresMedicalCertThreshold?: number;
}

export const MASTER_LEAVE_TYPES: LeaveTypeDefinition[] = [
  // --------------------------------------------------------------------------
  // กลุ่มที่ 1: การลาตามระเบียบสำนักนายกรัฐมนตรีว่าด้วยการลาของข้าราชการ พ.ศ. 2555 (11 ประเภท)
  // --------------------------------------------------------------------------
  {
    id: 'sick',
    value: 'ลาป่วย',
    label: '1. ลาป่วย',
    category: 'statutory',
    groupLabel: 'กลุ่มที่ 1: การลาตามระเบียบ 2555 (11 ประเภท)',
    description: 'มีอาการเจ็บป่วย ไม่สามารถปฏิบัติราชการได้ (ได้รับเงินเดือนไม่เกิน 60 วันทำการ/ปี; >= 30 วันต้องมีใบรับรองแพทย์)',
    maxDays: 60,
    isZeroDays: false,
    affectsSalaryPromotion: true,
    requiresMedicalCertThreshold: 30,
  },
  {
    id: 'personal',
    value: 'ลากิจส่วนตัว',
    label: '2. ลากิจส่วนตัว',
    category: 'statutory',
    groupLabel: 'กลุ่มที่ 1: การลาตามระเบียบ 2555 (11 ประเภท)',
    description: 'มีกิจจำเป็นอันมิอาจหลีกเลี่ยงได้ (ไม่เกิน 45 วันทำการ/ปี; บรรจุใหม่ไม่เกิน 15 วันทำการ)',
    maxDays: 45,
    isZeroDays: false,
    affectsSalaryPromotion: true,
  },
  {
    id: 'maternity',
    value: 'ลาคลอดบุตร',
    label: '3. ลาคลอดบุตร',
    category: 'statutory',
    groupLabel: 'กลุ่มที่ 1: การลาตามระเบียบ 2555 (11 ประเภท)',
    description: 'ไม่เกิน 90 วันปฏิทิน นับต่อเนื่องรวมวันหยุดราชการ โดยไม่ต้องมีใบรับรองแพทย์',
    maxDays: 90,
    isZeroDays: false,
    affectsSalaryPromotion: false,
  },
  {
    id: 'paternity',
    value: 'ลาไปช่วยเหลือภริยาที่คลอดบุตร',
    label: '4. ลาไปช่วยเหลือภริยาที่คลอดบุตร',
    category: 'statutory',
    groupLabel: 'กลุ่มที่ 1: การลาตามระเบียบ 2555 (11 ประเภท)',
    description: 'ข้าราชการชายช่วยเหลือภริยาโดยชอบด้วยกฎหมาย ไม่เกิน 15 วันทำการติดต่อกัน ภายใน 90 วัน',
    maxDays: 15,
    isZeroDays: false,
    affectsSalaryPromotion: false,
  },
  {
    id: 'vacation',
    value: 'ลาพักผ่อน',
    label: '5. ลาพักผ่อน',
    category: 'statutory',
    groupLabel: 'กลุ่มที่ 1: การลาตามระเบียบ 2555 (11 ประเภท)',
    description: 'สำหรับบุคลากรสายงานที่มีสิทธิ (ข้าราชการครูผู้สอนไม่มีสิทธิลาพักผ่อนประจำปี)',
    maxDays: 10,
    isZeroDays: false,
    affectsSalaryPromotion: false,
    warningNote: 'ข้าราชการครูผู้สอนที่มีวันหยุดปิดภาคการศึกษาเกินกว่าวันลาพักผ่อนไม่มีสิทธิลาพักผ่อน ใช้เฉพาะบุคลากรสายงานที่มีสิทธิตามระเบียบ',
  },
  {
    id: 'ordination',
    value: 'ลาอุปสมบทหรือการลาไปประกอบพิธีฮัจย์',
    label: '6. ลาอุปสมบทหรือการลาไปประกอบพิธีฮัจย์',
    category: 'statutory',
    groupLabel: 'กลุ่มที่ 1: การลาตามระเบียบ 2555 (11 ประเภท)',
    description: 'ข้าราชการรับราชการครบ 1 ปีขึ้นไป ไม่เกิน 120 วัน ยื่นใบลาล่วงหน้าไม่น้อยกว่า 60 วัน',
    maxDays: 120,
    isZeroDays: false,
    affectsSalaryPromotion: false,
  },
  {
    id: 'military',
    value: 'ลาเข้ารับการตรวจเลือกหรือเข้ารับการเตรียมพล',
    label: '7. ลาเข้ารับการตรวจเลือกหรือเข้ารับการเตรียมพล',
    category: 'statutory',
    groupLabel: 'กลุ่มที่ 1: การลาตามระเบียบ 2555 (11 ประเภท)',
    description: 'สำหรับการรับราชการทหาร ตรวจเลือก หรือระดมพลตามหมายเรียกของทางราชการ',
    isZeroDays: false,
    affectsSalaryPromotion: false,
  },
  {
    id: 'study',
    value: 'ลาไปศึกษา ฝึกอบรม ปฏิบัติการวิจัย หรือดูงาน',
    label: '8. ลาไปศึกษา ฝึกอบรม ปฏิบัติการวิจัย หรือดูงาน',
    category: 'statutory',
    groupLabel: 'กลุ่มที่ 1: การลาตามระเบียบ 2555 (11 ประเภท)',
    description: 'พัฒนาความรู้และวิชาชีพตามระเบียบ ก.พ./ก.ค.ศ. โดยอนุมัติของผู้มีอำนาจ',
    isZeroDays: false,
    affectsSalaryPromotion: false,
  },
  {
    id: 'intl_org',
    value: 'ลาไปปฏิบัติงานในองค์การระหว่างประเทศ',
    label: '9. ลาไปปฏิบัติงานในองค์การระหว่างประเทศ',
    category: 'statutory',
    groupLabel: 'กลุ่มที่ 1: การลาตามระเบียบ 2555 (11 ประเภท)',
    description: 'ปฏิบัติงานตามข้อตกลงระหว่างประเทศ หรือองค์การที่รัฐบาลไทยเป็นสมาชิก',
    isZeroDays: false,
    affectsSalaryPromotion: false,
  },
  {
    id: 'spouse',
    value: 'ลาติดตามคู่สมรส',
    label: '10. ลาติดตามคู่สมรส',
    category: 'statutory',
    groupLabel: 'กลุ่มที่ 1: การลาตามระเบียบ 2555 (11 ประเภท)',
    description: 'ติดตามคู่สมรสที่เป็นข้าราชการไปปฏิบัติหน้าที่ต่างประเทศ ไม่เกิน 2 ปี (ไม่ได้รับเงินเดือน)',
    maxDays: 730,
    isZeroDays: false,
    affectsSalaryPromotion: false,
  },
  {
    id: 'rehab',
    value: 'ลาไปฟื้นฟูสมรรถภาพด้านอาชีพ',
    label: '11. ลาไปฟื้นฟูสมรรถภาพด้านอาชีพ',
    category: 'statutory',
    groupLabel: 'กลุ่มที่ 1: การลาตามระเบียบ 2555 (11 ประเภท)',
    description: 'ฟื้นฟูสมรรถภาพจากการเจ็บป่วยหรือประสบอันตรายเนื่องจากการปฏิบัติหน้าที่ราชการ',
    isZeroDays: false,
    affectsSalaryPromotion: false,
  },

  // --------------------------------------------------------------------------
  // กลุ่มที่ 2: การขออนุญาตออกนอกบริเวณสถานศึกษาและการไปราชการ (คิดวันลา = 0 วัน / ไม่ตัดโควตา)
  // --------------------------------------------------------------------------
  {
    id: 'school_exit',
    value: 'ขออนุญาตออกนอกบริเวณโรงเรียน',
    label: '12. ขออนุญาตออกนอกบริเวณโรงเรียน (ธุระส่วนตัว ไม่เกิน 3 ชั่วโมง)',
    category: 'special_permission',
    groupLabel: 'กลุ่มที่ 2: การขออนุญาตออกนอกสถานศึกษาและไปราชการ (วันลา = 0 วัน)',
    description: 'ธุระส่วนตัวจำเป็นในเวลาราชการ ไม่เกิน 3 ชั่วโมง (คิดวันลา = 0 วันทำการ / ไม่หักโควตาวันลา)',
    maxHours: 3,
    isZeroDays: true,
    affectsSalaryPromotion: false,
  },
  {
    id: 'official_mission',
    value: 'ขออนุญาตไปราชการ',
    label: '13. ขออนุญาตไปราชการ / ออกนอกสถานที่เพื่อไปราชการ',
    category: 'special_permission',
    groupLabel: 'กลุ่มที่ 2: การขออนุญาตออกนอกสถานศึกษาและไปราชการ (วันลา = 0 วัน)',
    description: 'ปฏิบัติหน้าที่ราชการ อบรม สัมมนา หรือติดต่องานราชการภายนอก (คิดวันลา = 0 วันทำการ / ไม่หักโควตาวันลา)',
    isZeroDays: true,
    affectsSalaryPromotion: false,
  },
];

/**
 * Helper to check if a leave type is zero days (school exit or official mission)
 */
export function isZeroDayLeaveType(leaveType: string | undefined | null): boolean {
  if (!leaveType) return false;
  return (
    leaveType === 'ขออนุญาตออกนอกบริเวณโรงเรียน' ||
    leaveType === 'ขออนุญาตไปราชการ' ||
    leaveType.includes('ไม่เกิน 3 ชม.') ||
    leaveType.includes('ไม่เกิน 3 ชั่วโมง') ||
    leaveType.includes('ออกนอกบริเวณ') ||
    leaveType.includes('ไปราชการ')
  );
}

/**
 * Check if the type is school exit permit (<= 3 hours cap)
 */
export function isSchoolExitPermit(leaveType: string | undefined | null): boolean {
  if (!leaveType) return false;
  return (
    leaveType === 'ขออนุญาตออกนอกบริเวณโรงเรียน' ||
    leaveType.includes('ไม่เกิน 3 ชม.') ||
    leaveType.includes('ไม่เกิน 3 ชั่วโมง') ||
    leaveType.includes('ออกนอกบริเวณโรงเรียน')
  );
}

/**
 * Check if the type is official mission
 */
export function isOfficialMission(leaveType: string | undefined | null): boolean {
  if (!leaveType) return false;
  return leaveType === 'ขออนุญาตไปราชการ' || leaveType.includes('ไปราชการ');
}

/**
 * Get definition by value or fallback
 */
export function getLeaveTypeDefinition(value: string): LeaveTypeDefinition | undefined {
  return MASTER_LEAVE_TYPES.find((item) => item.value === value || item.label.includes(value));
}
