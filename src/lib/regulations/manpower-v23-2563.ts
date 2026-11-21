/**
 * ============================================================================
 * ManStat: เกณฑ์อัตรากำลัง ว 23/2563 (ก.ค.ศ.)
 * ============================================================================
 * การกำหนดเกณฑ์อัตรากำลังข้าราชการครูและบุคลากรทางการศึกษาในสถานศึกษา
 * สังกัดสำนักงานคณะกรรมการการศึกษาขั้นพื้นฐาน (สพฐ.)
 * ครอบคลุมทั้ง 3 สายงาน:
 * 1. สายงานการสอน (ครูผู้สอน)
 * 2. สายงานบริหารสถานศึกษา (ผู้อำนวยการ และรองผู้อำนวยการ)
 * 3. สายงานสนับสนุนการศึกษา (พนักงานราชการ/อัตราจ้าง และ ม.38 ค.(2))
 * ============================================================================
 */

export interface ManpowerInput {
  kStudents?: number;      // ปฐมวัย (อนุบาล)
  kRooms?: number;
  pStudents?: number;      // ประถม
  pRooms?: number;
  mLowerStudents?: number; // ม.ต้น
  mLowerRooms?: number;
  mUpperStudents?: number; // ม.ปลาย (ถ้ามี)
  mUpperRooms?: number;
  isSpecialArea?: boolean; // สถานศึกษาในพื้นที่พิเศษ (เกาะ/ภูเขาสูง)
}

export type SupportStaffType = 'none' | 'contract_staff' | 'civil_service_38_c_2';

export interface ManpowerResult {
  totalStudents: number;
  totalRooms: number;
  // 1. สายงานบริหารสถานศึกษา
  director: number;
  viceDirector: number;
  // 2. สายงานการสอน
  teachers: number;
  teacherDetails: {
    kpStudents: number;
    kpRooms: number;
    kpTeachers: number;
    mLowerTeachers: number;
    mUpperTeachers: number;
    rawTotalTeachers: number;
    isSmallSchoolFormula: boolean;
  };
  // 3. สายงานสนับสนุนการศึกษา
  supportStaff: number;
  supportType: SupportStaffType;
  supportLabel: string;
  // สรุปสั้น Minimal & Clean
  summaryStudentsAndRooms: string; // เช่น 'นักเรียน 92 คน · ห้องเรียน 12 ห้อง'
  summaryManpower: string;         // เช่น 'ผอ. 1 · ครู 11 · สนับสนุน 1'
}

/**
 * คำนวณกรอบอัตรากำลังตามหลักเกณฑ์ ก.ค.ศ. ว 23/2563 ครบทั้ง 3 สายงาน
 */
export function calculateManpowerV23(input: ManpowerInput): ManpowerResult {
  const kStudents = Math.max(0, Number(input.kStudents) || 0);
  const kRooms = Math.max(0, Number(input.kRooms) || 0);
  const pStudents = Math.max(0, Number(input.pStudents) || 0);
  const pRooms = Math.max(0, Number(input.pRooms) || 0);
  const mLowerStudents = Math.max(0, Number(input.mLowerStudents) || 0);
  const mLowerRooms = Math.max(0, Number(input.mLowerRooms) || 0);
  const mUpperStudents = Math.max(0, Number(input.mUpperStudents) || 0);
  const mUpperRooms = Math.max(0, Number(input.mUpperRooms) || 0);
  const isSpecialArea = Boolean(input.isSpecialArea);

  const totalStudents = kStudents + pStudents + mLowerStudents + mUpperStudents;
  const totalRooms = kRooms + pRooms + mLowerRooms + mUpperRooms;

  // --------------------------------------------------------------------------
  // 1. สายงานการสอน (ครูผู้สอน)
  // --------------------------------------------------------------------------
  const kpStudents = kStudents + pStudents;
  const kpRooms = kRooms + pRooms;

  let kpTeachers = 0;
  let mLowerTeachers = 0;
  let mUpperTeachers = 0;
  let rawTotalTeachers = 0;
  let isSmallSchoolFormula = false;

  if (totalStudents === 0) {
    kpTeachers = 0;
    rawTotalTeachers = 0;
  } else if (totalStudents <= 119) {
    // กรณีโรงเรียนขนาดเล็ก หรือขยายโอกาสที่ยอดรวมนักเรียนไม่เกิน 119 คน
    isSmallSchoolFormula = true;

    // ส่วนปฐมวัย + ประถม
    if (kpStudents === 0) {
      kpTeachers = 0;
    } else if (kpStudents <= 40) {
      kpTeachers = Math.min(4, Math.max(1, kpRooms > 0 ? kpRooms : 4));
    } else if (kpStudents <= 80) {
      kpTeachers = 6;
    } else {
      // 81 - 119 คน
      kpTeachers = 8;
    }

    // ส่วนมัธยมศึกษา (คิดตามชั่วโมงสอนของจำนวนห้องเรียน)
    mLowerTeachers = (mLowerRooms * 30) / 20;
    mUpperTeachers = (mUpperRooms * 35) / 20;

    rawTotalTeachers = kpTeachers + mLowerTeachers + mUpperTeachers;
  } else {
    // กรณีโรงเรียนขนาดกลางขึ้นไป (totalStudents >= 120 คน)
    // คิดตามสูตรชั่วโมงสอนทุกระดับชั้น
    // ปฐมวัยห้องละ 20 ชม., ประถมห้องละ 25 ชม., ม.ต้นห้องละ 30 ชม., ม.ปลายห้องละ 35 ชม.
    // หารด้วยภาระงานสอน 20 ชม./สัปดาห์
    isSmallSchoolFormula = false;
    const kLoad = kRooms * 20;
    const pLoad = pRooms * 25;
    const mLowerLoad = mLowerRooms * 30;
    const mUpperLoad = mUpperRooms * 35;

    rawTotalTeachers = (kLoad + pLoad + mLowerLoad + mUpperLoad) / 20;
  }

  // ปัดเศษตามเกณฑ์ ก.ค.ศ. (เศษ >= 0.50 ปัดขึ้นเป็น 1 อัตรา)
  const teachers = Math.round(rawTotalTeachers);

  // --------------------------------------------------------------------------
  // 2. สายงานบริหารสถานศึกษา (ผู้อำนวยการ และรองผู้อำนวยการ)
  // --------------------------------------------------------------------------
  let director = 0;
  let viceDirector = 0;

  if (totalStudents === 0) {
    director = 0;
    viceDirector = 0;
  } else if (totalStudents <= 40) {
    director = isSpecialArea ? 1 : 0;
    viceDirector = 0;
  } else if (totalStudents <= 119) {
    director = 1;
    viceDirector = 0;
  } else if (totalStudents <= 719) {
    director = 1;
    viceDirector = 1;
  } else if (totalStudents <= 1079) {
    director = 1;
    viceDirector = 2;
  } else if (totalStudents <= 1679) {
    director = 1;
    viceDirector = 3;
  } else {
    // >= 1,680 คน
    director = 1;
    viceDirector = 4;
  }

  // --------------------------------------------------------------------------
  // 3. สายงานสนับสนุนการศึกษา
  // --------------------------------------------------------------------------
  let supportStaff = 0;
  let supportType: SupportStaffType = 'none';
  let supportLabel = 'ไม่มีอัตรากำลังสนับสนุน';

  if (totalStudents === 0) {
    supportStaff = 0;
    supportType = 'none';
    supportLabel = 'ไม่มีอัตรากำลังสนับสนุน';
  } else if (totalStudents <= 359) {
    supportStaff = 1;
    supportType = 'contract_staff';
    supportLabel = 'พนักงานราชการ/อัตราจ้าง 1 อัตรา';
  } else if (totalStudents <= 719) {
    supportStaff = 1;
    supportType = 'civil_service_38_c_2';
    supportLabel = 'ม.38 ค.(2) 1 อัตรา';
  } else if (totalStudents <= 1079) {
    supportStaff = 2;
    supportType = 'civil_service_38_c_2';
    supportLabel = 'ม.38 ค.(2) 2 อัตรา';
  } else if (totalStudents <= 1679) {
    supportStaff = 3;
    supportType = 'civil_service_38_c_2';
    supportLabel = 'ม.38 ค.(2) 3 อัตรา';
  } else {
    // >= 1,680 คน
    supportStaff = 4;
    supportType = 'civil_service_38_c_2';
    supportLabel = 'ม.38 ค.(2) 4 อัตรา';
  }

  // --------------------------------------------------------------------------
  // 4. สรุปผลแบบ Minimal & Clean
  // --------------------------------------------------------------------------
  const summaryStudentsAndRooms = `นักเรียน ${totalStudents.toLocaleString()} คน · ห้องเรียน ${totalRooms} ห้อง`;

  const parts: string[] = [];
  if (director > 0) parts.push(`ผอ. ${director}`);
  if (viceDirector > 0) parts.push(`รอง ผอ. ${viceDirector}`);
  parts.push(`ครู ${teachers}`);
  if (supportStaff > 0) parts.push(`สนับสนุน ${supportStaff}`);

  const summaryManpower = parts.join(' · ');

  return {
    totalStudents,
    totalRooms,
    director,
    viceDirector,
    teachers,
    teacherDetails: {
      kpStudents,
      kpRooms,
      kpTeachers,
      mLowerTeachers,
      mUpperTeachers,
      rawTotalTeachers,
      isSmallSchoolFormula,
    },
    supportStaff,
    supportType,
    supportLabel,
    summaryStudentsAndRooms,
    summaryManpower,
  };
}
