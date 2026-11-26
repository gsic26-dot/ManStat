/**
 * ============================================================================
 * ManStat: Standard Teacher Appointment Majors (ก.ค.ศ. / สพฐ.)
 * ============================================================================
 * Canonical list of academic majors used for Thai public school teacher
 * appointments and HR records, plus a custom-entry option.
 * ============================================================================
 */

export const STANDARD_APPOINTMENT_MAJORS = [
  'ภาษาไทย',
  'คณิตศาสตร์',
  'วิทยาศาสตร์ทั่วไป',
  'ฟิสิกส์',
  'เคมี',
  'ชีววิทยา',
  'สังคมศึกษา',
  'ภาษาอังกฤษ',
  'ภาษาจีน',
  'ภาษาญี่ปุ่น',
  'คอมพิวเตอร์',
  'ปฐมวัย / อนุบาลศึกษา',
  'การประถมศึกษา',
  'พลศึกษา',
  'สุขศึกษา',
  'ศิลปศึกษา',
  'ดนตรีศึกษา',
  'ดนตรีไทย',
  'ดนตรีสากล',
  'นาฏศิลป์',
  'เกษตรกรรม',
  'คหกรรม',
  'อุตสาหกรรมศิลป์',
  'การศึกษาพิเศษ',
  'จิตวิทยาและการแนะแนว',
  'เทคโนโลยีและสื่อสารการศึกษา',
  'วัดผลและประเมินผล',
  'บรรณารักษศาสตร์',
  'บริหารการศึกษา',
  'การเงินและการบัญชี',
  'บริหารธุรกิจ',
  'นิติศาสตร์',
] as const;

export const CUSTOM_MAJOR_OPTION = 'อื่นๆ (ระบุเอง)' as const;

export function isStandardMajor(major?: string | null): boolean {
  if (!major) return false;
  return (STANDARD_APPOINTMENT_MAJORS as readonly string[]).includes(major.trim());
}
