/**
 * ============================================================================
 * ManStat: Verified Timetable Seed Dataset — Academic Year 2569, Semester 2
 * ============================================================================
 * Source: ตารางเรียน2-2569-17-10-2569.pdf (โรงเรียนชุมชนบ้านตะขบ)
 * - 9 Rooms (ป.1–ม.3) × 35 slots/room = 315 primary slots
 * - 11 Staff: 9 Homeroom Teachers (33 slots each) + ครูอุไรวรรณ (18 slots)
 *   + ผอ.ธีรศักดิ์ (6 co-teaching slots on ภาษาไทย in ป.1, ป.2, ป.3)
 * - 100% normalized subject names, 0 room clashes, 0 teacher clashes.
 * ============================================================================
 */

import type { TimetableSubjectType } from '@/lib/data/timetableTypes';

export interface SeedSlot2569_2 {
  roomName: string;
  dayOfWeek: number; // 1 = จันทร์ .. 5 = ศุกร์
  periodNo: number; // 1..7
  subjectName: string;
  subjectGroup: string;
  subjectType: TimetableSubjectType;
  teacherFirstName: string;
  coTeacherFirstName: string; // '' if none; 'ธีรศักดิ์' on the 6 co-teaching slots
  isLocked: boolean;
}

export interface DerivedAllocation2569_2 {
  id: string;
  roomName: string;
  subjectName: string;
  subjectGroup: string;
  subjectType: TimetableSubjectType;
  teacherFirstName: string;
  coTeacherFirstName: string;
  periodsPerWeek: number;
  preferMorning: boolean;
  consecutivePeriods: 1 | 2;
}

export const SEED_ACADEMIC_YEAR = '2569';
export const SEED_SEMESTER = '2' as const;

export const SEED_FOOTER_NOTE_2569_2 =
  'เวลา 07.00-08.05 น. กิจกรรม 5ส | เวลา 08.05-08.30 น. กิจกรรมหน้าเสาธง | เวลา 11.30-12.30 น. พักกลางวัน | เวลา 15.30-15.50 น. พบครูประจำชั้น เพื่อท่องสูตรคูณ บทอาขยาน ทำความสะอาดห้องเรียน ฯลฯ | เวลา 15.30-16.00 น. ทุกวันพุธและวันพฤหัสบดี PLC | เวลา 15.50-16.00 น. เข้าแถวกลับบ้าน';

export const SEED_STAFF_EXPECTED_COUNTS: Readonly<Record<string, { primary: number; coTeach: number }>> = {
  สุธิดา: { primary: 33, coTeach: 0 },
  ชินวัจน์: { primary: 33, coTeach: 0 },
  กิตติพณ: { primary: 33, coTeach: 0 },
  ณิชกานต์: { primary: 33, coTeach: 0 },
  ทัชชกร: { primary: 33, coTeach: 0 },
  สุนิสา: { primary: 33, coTeach: 0 },
  ธวัชชัย: { primary: 33, coTeach: 0 },
  กุสุมาลย์กมล: { primary: 33, coTeach: 0 },
  พันธ์ธนัต: { primary: 33, coTeach: 0 },
  อุไรวรรณ: { primary: 18, coTeach: 0 },
  ธีรศักดิ์: { primary: 0, coTeach: 6 },
};

function classifySubject(subjectName: string): {
  subjectGroup: string;
  subjectType: TimetableSubjectType;
  isLocked: boolean;
} {
  const n = subjectName.trim();

  if (n === 'พบครูประจำชั้น') {
    return { subjectGroup: 'กิจกรรมพัฒนาผู้เรียน', subjectType: 'ประจำชั้น', isLocked: true };
  }
  if (n === 'ชุมนุม' || n.startsWith('ลูกเสือ') || n === 'สวดมนต์') {
    return { subjectGroup: 'กิจกรรมพัฒนาผู้เรียน', subjectType: 'กิจกรรมพัฒนาผู้เรียน', isLocked: true };
  }
  if (n === 'แนะแนว') {
    return { subjectGroup: 'กิจกรรมพัฒนาผู้เรียน', subjectType: 'กิจกรรมพัฒนาผู้เรียน', isLocked: false };
  }

  // Electives / school-specific additional subjects
  if (
    n === 'ส่งเสริมอ่านเขียน' ||
    n.startsWith('หน้าที่พลเมือง') ||
    n.startsWith('ป้องกันการทุจริต') ||
    n.startsWith('ปัญญาประดิษฐ์') ||
    n === 'ภาษาอังกฤษเพื่อการสื่อสาร' ||
    n === 'ผูกผ้าประดับอาคาร' ||
    n === 'การเลี้ยงปลาดุกในบ่อซีเมนต์' ||
    n === 'การเดินสายไฟภายในอาคาร' ||
    /^ภาษาอังกฤษ \d+$/.test(n)
  ) {
    let group = 'วิชาเฉพาะโรงเรียน';
    if (n === 'ส่งเสริมอ่านเขียน') group = 'ภาษาไทย';
    else if (n.startsWith('หน้าที่พลเมือง') || n.startsWith('ป้องกันการทุจริต')) {
      group = 'สังคมศึกษา ศาสนา และวัฒนธรรม';
    } else if (n.startsWith('ปัญญาประดิษฐ์')) group = 'วิทยาศาสตร์และเทคโนโลยี';
    else if (n === 'ภาษาอังกฤษเพื่อการสื่อสาร' || /^ภาษาอังกฤษ \d+$/.test(n)) {
      group = 'ภาษาต่างประเทศ';
    } else if (
      n === 'ผูกผ้าประดับอาคาร' ||
      n === 'การเลี้ยงปลาดุกในบ่อซีเมนต์' ||
      n === 'การเดินสายไฟภายในอาคาร'
    ) {
      group = 'การงานอาชีพ';
    }
    return { subjectGroup: group, subjectType: 'เพิ่มเติม', isLocked: false };
  }

  // Core subjects
  if (n === 'ภาษาไทย') return { subjectGroup: 'ภาษาไทย', subjectType: 'พื้นฐาน', isLocked: false };
  if (n === 'คณิตศาสตร์') return { subjectGroup: 'คณิตศาสตร์', subjectType: 'พื้นฐาน', isLocked: false };
  if (n === 'วิทยาศาสตร์' || n.startsWith('วิทยาการคำนวณ')) {
    return { subjectGroup: 'วิทยาศาสตร์และเทคโนโลยี', subjectType: 'พื้นฐาน', isLocked: false };
  }
  if (n === 'สังคมศึกษา' || n === 'ประวัติศาสตร์') {
    return { subjectGroup: 'สังคมศึกษา ศาสนา และวัฒนธรรม', subjectType: 'พื้นฐาน', isLocked: false };
  }
  if (n === 'สุขศึกษา' || n === 'พลศึกษา' || n === 'สุขศึกษา/พละ') {
    return { subjectGroup: 'สุขศึกษาและพลศึกษา', subjectType: 'พื้นฐาน', isLocked: false };
  }
  if (n === 'ศิลปะ/ดนตรี') return { subjectGroup: 'ศิลปะ', subjectType: 'พื้นฐาน', isLocked: false };
  if (n === 'การงานอาชีพ') return { subjectGroup: 'การงานอาชีพ', subjectType: 'พื้นฐาน', isLocked: false };
  if (n === 'ภาษาอังกฤษ') return { subjectGroup: 'ภาษาต่างประเทศ', subjectType: 'พื้นฐาน', isLocked: false };

  return { subjectGroup: 'วิชาเฉพาะโรงเรียน', subjectType: 'เพิ่มเติม', isLocked: false };
}

type RawCell = [string, string, string?]; // [subjectName, teacherFirstName, coTeacherFirstName?]

const RAW_ROOMS_2569_2: Record<string, RawCell[][]> = {
  'ป.1': [
    // จันทร์
    [
      ['ภาษาไทย', 'สุธิดา'],
      ['คณิตศาสตร์', 'สุธิดา'],
      ['วิทยาศาสตร์', 'สุธิดา'],
      ['สังคมศึกษา', 'ชินวัจน์'],
      ['ประวัติศาสตร์', 'ชินวัจน์'],
      ['ภาษาอังกฤษ 1', 'ณิชกานต์'],
      ['พบครูประจำชั้น', 'สุธิดา'],
    ],
    // อังคาร
    [
      ['ภาษาไทย', 'สุธิดา'],
      ['คณิตศาสตร์', 'สุธิดา'],
      ['ภาษาอังกฤษ 1', 'ณิชกานต์'],
      ['วิทยาศาสตร์', 'สุธิดา'],
      ['หน้าที่พลเมือง', 'ชินวัจน์'],
      ['ศิลปะ/ดนตรี', 'ธวัชชัย'],
      ['พบครูประจำชั้น', 'สุธิดา'],
    ],
    // พุธ
    [
      ['สังคมศึกษา', 'ชินวัจน์'],
      ['ภาษาไทย', 'สุธิดา'],
      ['คณิตศาสตร์', 'สุธิดา'],
      ['ภาษาอังกฤษ', 'กุสุมาลย์กมล'],
      ['สุขศึกษา/พละ', 'อุไรวรรณ'],
      ['ชุมนุม', 'สุธิดา'],
      ['พบครูประจำชั้น', 'สุธิดา'],
    ],
    // พฤหัสบดี
    [
      ['คณิตศาสตร์', 'สุธิดา'],
      ['แนะแนว', 'กิตติพณ'],
      ['ภาษาไทย', 'สุธิดา', 'ธีรศักดิ์'],
      ['ภาษาอังกฤษ', 'กุสุมาลย์กมล'],
      ['ส่งเสริมอ่านเขียน', 'อุไรวรรณ'],
      ['ลูกเสือสำรอง', 'สุธิดา'],
      ['พบครูประจำชั้น', 'สุธิดา'],
    ],
    // ศุกร์
    [
      ['ภาษาไทย', 'สุธิดา', 'ธีรศักดิ์'],
      ['คณิตศาสตร์', 'สุธิดา'],
      ['ภาษาอังกฤษ', 'กุสุมาลย์กมล'],
      ['ป้องกันการทุจริต', 'อุไรวรรณ'],
      ['การงานอาชีพ', 'ชินวัจน์'],
      ['สวดมนต์', 'สุธิดา'],
      ['พบครูประจำชั้น', 'สุธิดา'],
    ],
  ],

  'ป.2': [
    // จันทร์
    [
      ['ภาษาไทย', 'ชินวัจน์'],
      ['คณิตศาสตร์', 'ณิชกานต์'],
      ['ประวัติศาสตร์', 'อุไรวรรณ'],
      ['สุขศึกษา/พละ', 'กิตติพณ'],
      ['ศิลปะ/ดนตรี', 'ธวัชชัย'],
      ['ภาษาอังกฤษ 2', 'ชินวัจน์'],
      ['พบครูประจำชั้น', 'ชินวัจน์'],
    ],
    // อังคาร
    [
      ['ภาษาไทย', 'ชินวัจน์'],
      ['คณิตศาสตร์', 'ณิชกานต์'],
      ['สังคมศึกษา', 'ชินวัจน์'],
      ['ภาษาอังกฤษ', 'ชินวัจน์'],
      ['วิทยาศาสตร์', 'พันธ์ธนัต'],
      ['แนะแนว', 'ชินวัจน์'],
      ['พบครูประจำชั้น', 'ชินวัจน์'],
    ],
    // พุธ
    [
      ['คณิตศาสตร์', 'ณิชกานต์'],
      ['ภาษาไทย', 'ชินวัจน์'],
      ['สังคมศึกษา', 'ชินวัจน์'],
      ['วิทยาศาสตร์', 'พันธ์ธนัต'],
      ['ภาษาอังกฤษ 2', 'ชินวัจน์'],
      ['ชุมนุม', 'ชินวัจน์'],
      ['พบครูประจำชั้น', 'ชินวัจน์'],
    ],
    // พฤหัสบดี
    [
      ['คณิตศาสตร์', 'ณิชกานต์'],
      ['ภาษาไทย', 'ชินวัจน์', 'ธีรศักดิ์'],
      ['การงานอาชีพ', 'อุไรวรรณ'],
      ['ภาษาอังกฤษ', 'ชินวัจน์'],
      ['ส่งเสริมอ่านเขียน', 'ชินวัจน์'],
      ['ลูกเสือสำรอง', 'ชินวัจน์'],
      ['พบครูประจำชั้น', 'ชินวัจน์'],
    ],
    // ศุกร์
    [
      ['คณิตศาสตร์', 'ณิชกานต์'],
      ['ภาษาไทย', 'ชินวัจน์', 'ธีรศักดิ์'],
      ['ภาษาอังกฤษ', 'ชินวัจน์'],
      ['หน้าที่พลเมือง', 'ชินวัจน์'],
      ['ป้องกันการทุจริต', 'อุไรวรรณ'],
      ['สวดมนต์', 'ชินวัจน์'],
      ['พบครูประจำชั้น', 'ชินวัจน์'],
    ],
  ],

  'ป.3': [
    // จันทร์
    [
      ['ภาษาไทย', 'กิตติพณ'],
      ['วิทยาศาสตร์', 'สุนิสา'],
      ['คณิตศาสตร์', 'ณิชกานต์'],
      ['ศิลปะ/ดนตรี', 'ธวัชชัย'],
      ['สังคมศึกษา', 'กิตติพณ'],
      ['การงานอาชีพ', 'กิตติพณ'],
      ['พบครูประจำชั้น', 'กิตติพณ'],
    ],
    // อังคาร
    [
      ['ภาษาไทย', 'กิตติพณ'],
      ['วิทยาศาสตร์', 'สุนิสา'],
      ['สังคมศึกษา', 'กิตติพณ'],
      ['คณิตศาสตร์', 'ณิชกานต์'],
      ['สุขศึกษา/พละ', 'กิตติพณ'],
      ['ป้องกันการทุจริต', 'กิตติพณ'],
      ['พบครูประจำชั้น', 'กิตติพณ'],
    ],
    // พุธ
    [
      ['ประวัติศาสตร์', 'อุไรวรรณ'],
      ['คณิตศาสตร์', 'ณิชกานต์'],
      ['ภาษาไทย', 'กิตติพณ', 'ธีรศักดิ์'],
      ['ภาษาอังกฤษ', 'กิตติพณ'],
      ['ส่งเสริมอ่านเขียน', 'กิตติพณ'],
      ['ชุมนุม', 'กิตติพณ'],
      ['พบครูประจำชั้น', 'กิตติพณ'],
    ],
    // พฤหัสบดี
    [
      ['ภาษาไทย', 'กิตติพณ', 'ธีรศักดิ์'],
      ['คณิตศาสตร์', 'ณิชกานต์'],
      ['หน้าที่พลเมือง', 'ชินวัจน์'],
      ['แนะแนว', 'อุไรวรรณ'],
      ['ภาษาอังกฤษ', 'กิตติพณ'],
      ['ลูกเสือสำรอง', 'กิตติพณ'],
      ['พบครูประจำชั้น', 'กิตติพณ'],
    ],
    // ศุกร์
    [
      ['ภาษาไทย', 'กิตติพณ'],
      ['คณิตศาสตร์', 'ณิชกานต์'],
      ['ภาษาอังกฤษ', 'กิตติพณ'],
      ['ภาษาอังกฤษ 3', 'กิตติพณ'],
      ['ภาษาอังกฤษ 3', 'กิตติพณ'],
      ['สวดมนต์', 'กิตติพณ'],
      ['พบครูประจำชั้น', 'กิตติพณ'],
    ],
  ],

  'ป.4': [
    // จันทร์
    [
      ['ภาษาไทย', 'ณิชกานต์'],
      ['สังคมศึกษา', 'กิตติพณ'],
      ['วิทยาศาสตร์', 'สุนิสา'],
      ['คณิตศาสตร์', 'ณิชกานต์'],
      ['การงานอาชีพ', 'ณิชกานต์'],
      ['ศิลปะ/ดนตรี', 'ธวัชชัย'],
      ['พบครูประจำชั้น', 'ณิชกานต์'],
    ],
    // อังคาร
    [
      ['คณิตศาสตร์', 'ณิชกานต์'],
      ['สังคมศึกษา', 'กิตติพณ'],
      ['วิทยาศาสตร์', 'สุนิสา'],
      ['พลศึกษา', 'กิตติพณ'],
      ['ภาษาไทย', 'ณิชกานต์'],
      ['หน้าที่พลเมือง', 'อุไรวรรณ'],
      ['พบครูประจำชั้น', 'ณิชกานต์'],
    ],
    // พุธ
    [
      ['ศิลปะ/ดนตรี', 'ธวัชชัย'],
      ['สุขศึกษา', 'กิตติพณ'],
      ['คณิตศาสตร์', 'ณิชกานต์'],
      ['ภาษาไทย', 'ณิชกานต์'],
      ['ภาษาอังกฤษ 4', 'ณิชกานต์'],
      ['ชุมนุม', 'ณิชกานต์'],
      ['พบครูประจำชั้น', 'ณิชกานต์'],
    ],
    // พฤหัสบดี
    [
      ['วิทยาศาสตร์', 'สุนิสา'],
      ['ภาษาอังกฤษ', 'กุสุมาลย์กมล'],
      ['คณิตศาสตร์', 'ณิชกานต์'],
      ['ภาษาไทย', 'ณิชกานต์'],
      ['ส่งเสริมอ่านเขียน', 'ณิชกานต์'],
      ['ลูกเสือสามัญ', 'ณิชกานต์'],
      ['พบครูประจำชั้น', 'ณิชกานต์'],
    ],
    // ศุกร์
    [
      ['ประวัติศาสตร์', 'ชินวัจน์'],
      ['ภาษาอังกฤษ', 'กุสุมาลย์กมล'],
      ['ป้องกันการทุจริต', 'อุไรวรรณ'],
      ['แนะแนว', 'ณิชกานต์'],
      ['ภาษาอังกฤษ 4', 'ณิชกานต์'],
      ['สวดมนต์', 'ณิชกานต์'],
      ['พบครูประจำชั้น', 'ณิชกานต์'],
    ],
  ],

  'ป.5': [
    // จันทร์
    [
      ['ภาษาไทย', 'ทัชชกร'],
      ['คณิตศาสตร์', 'ทัชชกร'],
      ['สังคมศึกษา', 'ทัชชกร'],
      ['วิทยาศาสตร์', 'สุนิสา'],
      ['ส่งเสริมอ่านเขียน', 'ทัชชกร'],
      ['ประวัติศาสตร์', 'อุไรวรรณ'],
      ['พบครูประจำชั้น', 'ทัชชกร'],
    ],
    // อังคาร
    [
      ['ภาษาไทย', 'ทัชชกร'],
      ['คณิตศาสตร์', 'ทัชชกร'],
      ['ป้องกันการทุจริต', 'อุไรวรรณ'],
      ['พลศึกษา', 'ทัชชกร'],
      ['การงานอาชีพ', 'ทัชชกร'],
      ['แนะแนว', 'ทัชชกร'],
      ['พบครูประจำชั้น', 'ทัชชกร'],
    ],
    // พุธ
    [
      ['ภาษาไทย', 'ทัชชกร'],
      ['คณิตศาสตร์', 'ทัชชกร'],
      ['ศิลปะ/ดนตรี', 'ธวัชชัย'],
      ['หน้าที่พลเมือง', 'ทัชชกร'],
      ['ภาษาอังกฤษ 5', 'กุสุมาลย์กมล'],
      ['ชุมนุม', 'ทัชชกร'],
      ['พบครูประจำชั้น', 'ทัชชกร'],
    ],
    // พฤหัสบดี
    [
      ['ศิลปะ/ดนตรี', 'ธวัชชัย'],
      ['วิทยาศาสตร์', 'สุนิสา'],
      ['ภาษาอังกฤษ', 'กุสุมาลย์กมล'],
      ['สุขศึกษา', 'ทัชชกร'],
      ['สังคมศึกษา', 'ทัชชกร'],
      ['ลูกเสือสามัญ', 'ทัชชกร'],
      ['พบครูประจำชั้น', 'ทัชชกร'],
    ],
    // ศุกร์
    [
      ['ภาษาอังกฤษ 5', 'กุสุมาลย์กมล'],
      ['คณิตศาสตร์', 'ทัชชกร'],
      ['วิทยาศาสตร์', 'สุนิสา'],
      ['ภาษาอังกฤษ', 'กุสุมาลย์กมล'],
      ['ภาษาไทย', 'ทัชชกร'],
      ['สวดมนต์', 'ทัชชกร'],
      ['พบครูประจำชั้น', 'ทัชชกร'],
    ],
  ],

  'ป.6': [
    // จันทร์
    [
      ['วิทยาศาสตร์', 'สุนิสา'],
      ['สุขศึกษา', 'ธวัชชัย'],
      ['ภาษาอังกฤษ', 'กุสุมาลย์กมล'],
      ['สังคมศึกษา', 'ทัชชกร'],
      ['การงานอาชีพ', 'อุไรวรรณ'],
      ['ปัญญาประดิษฐ์', 'พันธ์ธนัต'],
      ['พบครูประจำชั้น', 'สุนิสา'],
    ],
    // อังคาร
    [
      ['วิทยาศาสตร์', 'สุนิสา'],
      ['ศิลปะ/ดนตรี', 'ธวัชชัย'],
      ['ภาษาไทย', 'สุธิดา'],
      ['พลศึกษา', 'ธวัชชัย'],
      ['แนะแนว', 'อุไรวรรณ'],
      ['ภาษาอังกฤษ', 'กุสุมาลย์กมล'],
      ['พบครูประจำชั้น', 'สุนิสา'],
    ],
    // พุธ
    [
      ['ปัญญาประดิษฐ์', 'พันธ์ธนัต'],
      ['ศิลปะ/ดนตรี', 'ธวัชชัย'],
      ['คณิตศาสตร์', 'ทัชชกร'],
      ['ภาษาไทย', 'สุธิดา'],
      ['วิทยาศาสตร์', 'สุนิสา'],
      ['ชุมนุม', 'สุนิสา'],
      ['พบครูประจำชั้น', 'สุนิสา'],
    ],
    // พฤหัสบดี
    [
      ['ป้องกันการทุจริต', 'ทัชชกร'],
      ['คณิตศาสตร์', 'ทัชชกร'],
      ['สังคมศึกษา', 'ทัชชกร'],
      ['ภาษาไทย', 'สุธิดา'],
      ['ส่งเสริมอ่านเขียน', 'สุนิสา'],
      ['ลูกเสือสามัญ', 'สุนิสา'],
      ['พบครูประจำชั้น', 'สุนิสา'],
    ],
    // ศุกร์
    [
      ['หน้าที่พลเมือง', 'ทัชชกร'],
      ['ประวัติศาสตร์', 'ธวัชชัย'],
      ['คณิตศาสตร์', 'ทัชชกร'],
      ['คณิตศาสตร์', 'ทัชชกร'],
      ['ภาษาไทย', 'สุธิดา'],
      ['สวดมนต์', 'สุนิสา'],
      ['พบครูประจำชั้น', 'สุนิสา'],
    ],
  ],

  'ม.1': [
    // จันทร์
    [
      ['คณิตศาสตร์', 'พันธ์ธนัต'],
      ['ภาษาอังกฤษ', 'กุสุมาลย์กมล'],
      ['สุขศึกษา', 'ธวัชชัย'],
      ['ภาษาไทย', 'สุธิดา'],
      ['ภาษาอังกฤษเพื่อการสื่อสาร', 'กุสุมาลย์กมล'],
      ['แนะแนว', 'ทัชชกร'],
      ['พบครูประจำชั้น', 'ธวัชชัย'],
    ],
    // อังคาร
    [
      ['คณิตศาสตร์', 'พันธ์ธนัต'],
      ['ภาษาอังกฤษ', 'กุสุมาลย์กมล'],
      ['พลศึกษา', 'ธวัชชัย'],
      ['วิทยาศาสตร์', 'สุนิสา'],
      ['ภาษาไทย', 'สุธิดา'],
      ['หน้าที่พลเมือง 2', 'สุนิสา'],
      ['พบครูประจำชั้น', 'ธวัชชัย'],
    ],
    // พุธ
    [
      ['ผูกผ้าประดับอาคาร', 'สุนิสา'],
      ['การงานอาชีพ', 'สุนิสา'],
      ['การงานอาชีพ', 'สุนิสา'],
      ['ประวัติศาสตร์', 'อุไรวรรณ'],
      ['ภาษาไทย', 'สุธิดา'],
      ['ชุมนุม', 'ธวัชชัย'],
      ['พบครูประจำชั้น', 'ธวัชชัย'],
    ],
    // พฤหัสบดี
    [
      ['คณิตศาสตร์', 'พันธ์ธนัต'],
      ['สังคมศึกษา', 'ธวัชชัย'],
      ['วิทยาศาสตร์', 'สุนิสา'],
      ['ศิลปะ/ดนตรี', 'ธวัชชัย'],
      ['ภาษาอังกฤษ', 'กุสุมาลย์กมล'],
      ['ลูกเสือสามัญรุ่นใหญ่', 'ธวัชชัย'],
      ['พบครูประจำชั้น', 'ธวัชชัย'],
    ],
    // ศุกร์
    [
      ['วิทยาศาสตร์', 'สุนิสา'],
      ['ป้องกันการทุจริต 2', 'อุไรวรรณ'],
      ['สังคมศึกษา', 'ธวัชชัย'],
      ['วิทยาการคำนวณ 2', 'พันธ์ธนัต'],
      ['ศิลปะ/ดนตรี', 'ธวัชชัย'],
      ['สังคมศึกษา', 'ธวัชชัย'],
      ['พบครูประจำชั้น', 'ธวัชชัย'],
    ],
  ],

  'ม.2': [
    // จันทร์
    [
      ['สุขศึกษา', 'ธวัชชัย'],
      ['คณิตศาสตร์', 'พันธ์ธนัต'],
      ['สังคมศึกษา', 'กิตติพณ'],
      ['ภาษาอังกฤษ', 'กุสุมาลย์กมล'],
      ['ภาษาไทย', 'สุธิดา'],
      ['แนะแนว', 'กุสุมาลย์กมล'],
      ['พบครูประจำชั้น', 'กุสุมาลย์กมล'],
    ],
    // อังคาร
    [
      ['ภาษาอังกฤษ', 'กุสุมาลย์กมล'],
      ['คณิตศาสตร์', 'พันธ์ธนัต'],
      ['ประวัติศาสตร์', 'กุสุมาลย์กมล'],
      ['วิทยาการคำนวณ 4', 'พันธ์ธนัต'],
      ['ภาษาอังกฤษเพื่อการสื่อสาร', 'กุสุมาลย์กมล'],
      ['ป้องกันการทุจริต 4', 'พันธ์ธนัต'],
      ['พบครูประจำชั้น', 'กุสุมาลย์กมล'],
    ],
    // พุธ
    [
      ['ภาษาไทย', 'สุธิดา'],
      ['การงานอาชีพ', 'อุไรวรรณ'],
      ['การงานอาชีพ', 'อุไรวรรณ'],
      ['วิทยาศาสตร์', 'สุนิสา'],
      ['พลศึกษา', 'ธวัชชัย'],
      ['ชุมนุม', 'กุสุมาลย์กมล'],
      ['พบครูประจำชั้น', 'กุสุมาลย์กมล'],
    ],
    // พฤหัสบดี
    [
      ['ภาษาอังกฤษ', 'กุสุมาลย์กมล'],
      ['คณิตศาสตร์', 'พันธ์ธนัต'],
      ['สังคมศึกษา', 'กิตติพณ'],
      ['วิทยาศาสตร์', 'สุนิสา'],
      ['ศิลปะ/ดนตรี', 'ธวัชชัย'],
      ['ลูกเสือสามัญรุ่นใหญ่', 'กุสุมาลย์กมล'],
      ['พบครูประจำชั้น', 'กุสุมาลย์กมล'],
    ],
    // ศุกร์
    [
      ['ศิลปะ/ดนตรี', 'ธวัชชัย'],
      ['สังคมศึกษา', 'กิตติพณ'],
      ['ภาษาไทย', 'สุธิดา'],
      ['วิทยาศาสตร์', 'สุนิสา'],
      ['การเลี้ยงปลาดุกในบ่อซีเมนต์', 'พันธ์ธนัต'],
      ['หน้าที่พลเมือง 4', 'กุสุมาลย์กมล'],
      ['พบครูประจำชั้น', 'กุสุมาลย์กมล'],
    ],
  ],

  'ม.3': [
    // จันทร์
    [
      ['ภาษาอังกฤษ', 'กุสุมาลย์กมล'],
      ['ประวัติศาสตร์', 'ชินวัจน์'],
      ['สังคมศึกษา', 'พันธ์ธนัต'],
      ['ป้องกันการทุจริต 6', 'พันธ์ธนัต'],
      ['ปัญญาประดิษฐ์ 2', 'พันธ์ธนัต'],
      ['วิทยาศาสตร์', 'สุนิสา'],
      ['พบครูประจำชั้น', 'พันธ์ธนัต'],
    ],
    // อังคาร
    [
      ['ศิลปะ/ดนตรี', 'ธวัชชัย'],
      ['แนะแนว', 'ชินวัจน์'],
      ['พลศึกษา', 'พันธ์ธนัต'],
      ['ภาษาอังกฤษเพื่อการสื่อสาร', 'กุสุมาลย์กมล'],
      ['วิทยาศาสตร์', 'สุนิสา'],
      ['ภาษาไทย', 'สุธิดา'],
      ['พบครูประจำชั้น', 'พันธ์ธนัต'],
    ],
    // พุธ
    [
      ['ภาษาอังกฤษ', 'กุสุมาลย์กมล'],
      ['การงานอาชีพ', 'พันธ์ธนัต'],
      ['การงานอาชีพ', 'พันธ์ธนัต'],
      ['การเดินสายไฟภายในอาคาร', 'ธวัชชัย'],
      ['คณิตศาสตร์', 'พันธ์ธนัต'],
      ['ชุมนุม', 'พันธ์ธนัต'],
      ['พบครูประจำชั้น', 'พันธ์ธนัต'],
    ],
    // พฤหัสบดี
    [
      ['หน้าที่พลเมือง 6', 'ชินวัจน์'],
      ['ภาษาไทย', 'สุธิดา'],
      ['ศิลปะ/ดนตรี', 'ธวัชชัย'],
      ['คณิตศาสตร์', 'พันธ์ธนัต'],
      ['สังคมศึกษา', 'พันธ์ธนัต'],
      ['ลูกเสือสามัญรุ่นใหญ่', 'พันธ์ธนัต'],
      ['พบครูประจำชั้น', 'พันธ์ธนัต'],
    ],
    // ศุกร์
    [
      ['คณิตศาสตร์', 'พันธ์ธนัต'],
      ['วิทยาศาสตร์', 'สุนิสา'],
      ['สุขศึกษา', 'พันธ์ธนัต'],
      ['ภาษาไทย', 'สุธิดา'],
      ['ภาษาอังกฤษ', 'กุสุมาลย์กมล'],
      ['สังคมศึกษา', 'พันธ์ธนัต'],
      ['พบครูประจำชั้น', 'พันธ์ธนัต'],
    ],
  ],
};

export const TIMETABLE_SEED_2569_2_SLOTS: readonly SeedSlot2569_2[] = (() => {
  const result: SeedSlot2569_2[] = [];
  for (const [roomName, days] of Object.entries(RAW_ROOMS_2569_2)) {
    days.forEach((periods, dIdx) => {
      periods.forEach(([subjectName, teacherFirstName, coTeacherFirstName], pIdx) => {
        const meta = classifySubject(subjectName);
        result.push({
          roomName,
          dayOfWeek: dIdx + 1,
          periodNo: pIdx + 1,
          subjectName,
          subjectGroup: meta.subjectGroup,
          subjectType: meta.subjectType,
          teacherFirstName,
          coTeacherFirstName: coTeacherFirstName || '',
          isLocked: meta.isLocked,
        });
      });
    });
  }
  return result;
})();

/**
 * Derives unique timetable_allocations by grouping (roomName, subjectName, teacherFirstName, coTeacherFirstName).
 */
export function deriveAllocationsFromSeed2569_2(
  slots: readonly SeedSlot2569_2[] = TIMETABLE_SEED_2569_2_SLOTS
): DerivedAllocation2569_2[] {
  const map = new Map<string, { slot: SeedSlot2569_2; count: number; morningCount: number; hasConsecutive: boolean }>();
  const roomDayMap = new Map<string, SeedSlot2569_2[]>();

  for (const s of slots) {
    const rdKey = `${s.roomName}|${s.dayOfWeek}`;
    const arr = roomDayMap.get(rdKey) || [];
    arr.push(s);
    roomDayMap.set(rdKey, arr);
  }

  for (const s of slots) {
    const key = `${s.roomName}|${s.subjectName}|${s.teacherFirstName}|${s.coTeacherFirstName}`;
    const existing = map.get(key);
    const isMorning = s.periodNo <= 3;

    // Detect if same allocation appears in back-to-back periods on same day
    const sameDay = roomDayMap.get(`${s.roomName}|${s.dayOfWeek}`) || [];
    const consecutive = sameDay.some(
      (other) =>
        other !== s &&
        other.subjectName === s.subjectName &&
        other.teacherFirstName === s.teacherFirstName &&
        Math.abs(other.periodNo - s.periodNo) === 1
    );

    if (existing) {
      existing.count += 1;
      if (isMorning) existing.morningCount += 1;
      if (consecutive) existing.hasConsecutive = true;
    } else {
      map.set(key, {
        slot: s,
        count: 1,
        morningCount: isMorning ? 1 : 0,
        hasConsecutive: consecutive,
      });
    }
  }

  let seq = 1;
  return Array.from(map.values()).map((entry) => {
    const id = `ALLOC-2569-2-${String(seq).padStart(3, '0')}`;
    seq += 1;
    return {
      id,
      roomName: entry.slot.roomName,
      subjectName: entry.slot.subjectName,
      subjectGroup: entry.slot.subjectGroup,
      subjectType: entry.slot.subjectType,
      teacherFirstName: entry.slot.teacherFirstName,
      coTeacherFirstName: entry.slot.coTeacherFirstName,
      periodsPerWeek: entry.count,
      preferMorning: entry.morningCount > entry.count / 2,
      consecutivePeriods: entry.hasConsecutive ? 2 : 1,
    };
  });
}

/**
 * Generates the transaction-safe, idempotent SQL seed script (Migration 021)
 * directly from the verified TypeScript dataset so there is zero drift.
 */
export function generateSeed2569_2Sql(): string {
  const esc = (s: string) => s.replace(/'/g, "''");
  const allocations = deriveAllocationsFromSeed2569_2();
  const allocMap = new Map<string, string>();
  for (const a of allocations) {
    allocMap.set([a.roomName, a.subjectName, a.teacherFirstName, a.coTeacherFirstName].join('|'), a.id);
  }

  const periodsConfig = JSON.stringify([
    { periodNo: 1, label: 'ชั่วโมงที่ 1', startTime: '08.30', endTime: '09.30', durationMinutes: 60, durationHours: 1.0 },
    { periodNo: 2, label: 'ชั่วโมงที่ 2', startTime: '09.30', endTime: '10.30', durationMinutes: 60, durationHours: 1.0 },
    { periodNo: 3, label: 'ชั่วโมงที่ 3', startTime: '10.30', endTime: '11.30', durationMinutes: 60, durationHours: 1.0 },
    { periodNo: 4, label: 'ชั่วโมงที่ 4', startTime: '12.30', endTime: '13.30', durationMinutes: 60, durationHours: 1.0 },
    { periodNo: 5, label: 'ชั่วโมงที่ 5', startTime: '13.30', endTime: '14.30', durationMinutes: 60, durationHours: 1.0 },
    { periodNo: 6, label: 'ชั่วโมงที่ 6', startTime: '14.30', endTime: '15.30', durationMinutes: 60, durationHours: 1.0 },
    { periodNo: 7, label: 'พบครูประจำชั้น', startTime: '15.30', endTime: '16.00', durationMinutes: 30, durationHours: 0.5, isHomeroom: true },
  ]);
  const lunchConfig = JSON.stringify({ afterPeriod: 3, startTime: '11.30', endTime: '12.30', durationMinutes: 60 });
  const staffNames = Object.keys(SEED_STAFF_EXPECTED_COUNTS);

  const lines: string[] = [
    '-- ============================================================================',
    '-- Migration 021: Seed Verified Timetable — Academic Year 2569, Semester 2',
    '-- ============================================================================',
    '-- Source: ตารางเรียน2-2569-17-10-2569.pdf (โรงเรียนชุมชนบ้านตะขบ)',
    '-- Verified by automated unit test (timetableSeed2569_2.test.ts):',
    '--   * 9 rooms (ป.1–ม.3) x 35 slots = 315 timetable_slots',
    `--   * ${allocations.length} grouped timetable_allocations (sum periods_per_week = 315)`,
    '--   * 11 staff resolved dynamically from public.teachers (zero hardcoded IDs)',
    '--   * 6 co-teaching slots for ผอ.ธีรศักดิ์ (ภาษาไทย ป.1, ป.2, ป.3)',
    '--   * Transaction-wrapped with post-insert SQL assertions before COMMIT',
    '-- ============================================================================',
    '',
    'BEGIN;',
    '',
    'DO $$',
    'DECLARE',
    "  v_staff_ids JSONB := '{}'::jsonb;",
    '  v_name TEXT;',
    '  v_cnt INTEGER;',
    '  v_id TEXT;',
    '  v_director_id TEXT;',
    '  v_slot_count INTEGER;',
    '  v_coteach_count INTEGER;',
    '  v_conflict_count INTEGER;',
    `  v_required_names TEXT[] := ARRAY[${staffNames.map((n) => `'${esc(n)}'`).join(', ')}];`,
    'BEGIN',
    '  -- 1. Dynamic Staff ID Resolution (Fail-Fast if any staff is missing or ambiguous)',
    '  FOREACH v_name IN ARRAY v_required_names LOOP',
    '    SELECT COUNT(*), MIN(id)',
    '      INTO v_cnt, v_id',
    '      FROM public.teachers',
    "     WHERE TRIM(COALESCE(first_name, '')) = v_name",
    "        OR COALESCE(name, '') LIKE '%' || v_name || '%';",
    '',
    '    IF v_cnt <> 1 OR v_id IS NULL THEN',
    "      RAISE EXCEPTION 'Staff lookup failed for: % (matched % rows)', v_name, v_cnt;",
    '    END IF;',
    '',
    '    v_staff_ids := jsonb_set(v_staff_ids, ARRAY[v_name], to_jsonb(v_id));',
    '  END LOOP;',
    '',
    "  v_director_id := v_staff_ids->>'ธีรศักดิ์';",
    '',
    '  -- 2. Idempotent Cleanup Scoped STRICTLY to 2569 / Semester 2',
    '  DELETE FROM public.timetable_slots',
    "   WHERE academic_year = '2569' AND semester = '2';",
    '  DELETE FROM public.timetable_allocations',
    "   WHERE academic_year = '2569' AND semester = '2';",
    '',
    '  -- 3. Upsert timetable_settings for 2569 / Semester 2',
    '  INSERT INTO public.timetable_settings (',
    '    id, academic_year, semester, periods_config, fixed_slots_config, footer_note, is_locked, lunch_config, updated_at',
    '  ) VALUES (',
    "    '2569-2', '2569', '2',",
    `    '${esc(periodsConfig)}'::jsonb,`,
    "    '[]'::jsonb,",
    `    '${esc(SEED_FOOTER_NOTE_2569_2)}',`,
    '    FALSE,',
    `    '${esc(lunchConfig)}'::jsonb,`,
    '    NOW()',
    '  )',
    '  ON CONFLICT (id) DO UPDATE SET',
    '    periods_config = EXCLUDED.periods_config,',
    '    footer_note = EXCLUDED.footer_note,',
    '    lunch_config = EXCLUDED.lunch_config,',
    '    updated_at = NOW();',
    '',
    `  -- 4. Insert timetable_allocations (${allocations.length} grouped rows, sum periods_per_week = 315)`,
    '  INSERT INTO public.timetable_allocations (',
    '    id, academic_year, semester, room_name, subject_code, subject_name, subject_group,',
    '    subject_type, teacher_id, co_teacher_id, periods_per_week, prefer_morning, consecutive_periods',
    '  ) VALUES',
  ];

  allocations.forEach((a, idx) => {
    const comma = idx === allocations.length - 1 ? ';' : ',';
    const teacherExpr = `v_staff_ids->>'${esc(a.teacherFirstName)}'`;
    const coExpr = a.coTeacherFirstName ? `v_staff_ids->>'${esc(a.coTeacherFirstName)}'` : "''";
    lines.push(
      `    ('${esc(a.id)}', '${SEED_ACADEMIC_YEAR}', '${SEED_SEMESTER}', '${esc(a.roomName)}', '', '${esc(a.subjectName)}', '${esc(a.subjectGroup)}', '${esc(a.subjectType)}', ${teacherExpr}, ${coExpr}, ${a.periodsPerWeek}, ${a.preferMorning ? 'TRUE' : 'FALSE'}, ${a.consecutivePeriods})${comma}`
    );
  });

  lines.push(
    '',
    '  -- 5. Insert timetable_slots (315 exact slots across ป.1–ม.3)',
    '  INSERT INTO public.timetable_slots (',
    '    id, academic_year, semester, room_name, day_of_week, period_no, allocation_id,',
    '    subject_code, subject_name, subject_group, subject_type, teacher_id, co_teacher_id, is_locked, updated_at',
    '  ) VALUES'
  );

  TIMETABLE_SEED_2569_2_SLOTS.forEach((s, idx) => {
    const comma = idx === TIMETABLE_SEED_2569_2_SLOTS.length - 1 ? ';' : ',';
    const allocId =
      allocMap.get([s.roomName, s.subjectName, s.teacherFirstName, s.coTeacherFirstName].join('|')) || '';
    const slotId = `SLOT-2569-2-${String(idx + 1).padStart(3, '0')}`;
    const teacherExpr = `v_staff_ids->>'${esc(s.teacherFirstName)}'`;
    const coExpr = s.coTeacherFirstName ? `v_staff_ids->>'${esc(s.coTeacherFirstName)}'` : "''";
    lines.push(
      `    ('${slotId}', '${SEED_ACADEMIC_YEAR}', '${SEED_SEMESTER}', '${esc(s.roomName)}', ${s.dayOfWeek}, ${s.periodNo}, '${esc(allocId)}', '', '${esc(s.subjectName)}', '${esc(s.subjectGroup)}', '${esc(s.subjectType)}', ${teacherExpr}, ${coExpr}, ${s.isLocked ? 'TRUE' : 'FALSE'}, NOW())${comma}`
    );
  });

  lines.push(
    '',
    '  -- 6. Optional Idempotent Upsert of School-Specific Elective Subjects into public.school_subjects',
    "  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'school_subjects') THEN",
    '    INSERT INTO public.school_subjects (',
    '      id, subject_code, subject_name, subject_group, subject_type, level_group, grade_levels,',
    '      semester_scope, default_hours_per_week, hours_per_year, credits, prefer_morning, default_consecutive, description, is_active, sort_order',
    '    ) VALUES',
    `      ('SUB-ELEC-CATFISH', '', 'การเลี้ยงปลาดุกในบ่อซีเมนต์', 'การงานอาชีพ', 'เพิ่มเติม', 'secondary', '["ม.2"]'::jsonb, '2', 1.0, 0, 0.5, FALSE, 1, 'รายวิชาเพิ่มเติมอาชีพ โรงเรียนชุมชนบ้านตะขบ', TRUE, 901),`,
    `      ('SUB-ELEC-WIRING', '', 'การเดินสายไฟภายในอาคาร', 'การงานอาชีพ', 'เพิ่มเติม', 'secondary', '["ม.3"]'::jsonb, '2', 1.0, 0, 0.5, FALSE, 1, 'รายวิชาเพิ่มเติมอาชีพ โรงเรียนชุมชนบ้านตะขบ', TRUE, 902),`,
    `      ('SUB-ELEC-DRAPING', '', 'ผูกผ้าประดับอาคาร', 'การงานอาชีพ', 'เพิ่มเติม', 'secondary', '["ม.1"]'::jsonb, '2', 1.0, 0, 0.5, FALSE, 1, 'รายวิชาเพิ่มเติมอาชีพ โรงเรียนชุมชนบ้านตะขบ', TRUE, 903),`,
    `      ('SUB-ELEC-READING', '', 'ส่งเสริมอ่านเขียน', 'ภาษาไทย', 'เพิ่มเติม', 'primary', '["ป.1","ป.2","ป.3","ป.4","ป.5","ป.6"]'::jsonb, 'both', 1.0, 40, 0, FALSE, 1, 'รายวิชาเพิ่มเติมส่งเสริมทักษะการอ่านเขียน', TRUE, 904),`,
    `      ('SUB-ELEC-AI', '', 'ปัญญาประดิษฐ์', 'วิทยาศาสตร์และเทคโนโลยี', 'เพิ่มเติม', 'primary', '["ป.6"]'::jsonb, 'both', 2.0, 80, 0, FALSE, 1, 'รายวิชาเพิ่มเติมปัญญาประดิษฐ์ระดับประถมศึกษา', TRUE, 905),`,
    `      ('SUB-ELEC-ENG-COMM', '', 'ภาษาอังกฤษเพื่อการสื่อสาร', 'ภาษาต่างประเทศ', 'เพิ่มเติม', 'secondary', '["ม.1","ม.2","ม.3"]'::jsonb, 'both', 1.0, 0, 0.5, FALSE, 1, 'รายวิชาเพิ่มเติมภาษาอังกฤษเพื่อการสื่อสาร', TRUE, 906),`,
    `      ('SUB-ELEC-ANTICORRUPT', '', 'ป้องกันการทุจริต', 'สังคมศึกษา ศาสนา และวัฒนธรรม', 'เพิ่มเติม', 'primary', '["ป.1","ป.2","ป.3","ป.4","ป.5","ป.6"]'::jsonb, 'both', 1.0, 40, 0, FALSE, 1, 'รายวิชาเพิ่มเติมการป้องกันการทุจริต', TRUE, 907),`,
    `      ('SUB-ELEC-CIVIC', '', 'หน้าที่พลเมือง', 'สังคมศึกษา ศาสนา และวัฒนธรรม', 'เพิ่มเติม', 'primary', '["ป.1","ป.2","ป.3","ป.4","ป.5","ป.6"]'::jsonb, 'both', 1.0, 40, 0, FALSE, 1, 'รายวิชาเพิ่มเติมหน้าที่พลเมือง', TRUE, 908),`,
    `      ('SUB-ACT-PRAYER', '', 'สวดมนต์', 'กิจกรรมพัฒนาผู้เรียน', 'กิจกรรมพัฒนาผู้เรียน', 'primary', '["ป.1","ป.2","ป.3","ป.4","ป.5","ป.6"]'::jsonb, 'both', 1.0, 40, 0, FALSE, 1, 'กิจกรรมสวดมนต์สุดสัปดาห์', TRUE, 909)`,
    '    ON CONFLICT (id) DO NOTHING;',
    '  END IF;',
    '',
    '  -- 7. Post-Insert SQL Integrity Assertions (Rollback entire transaction if any fail)',
    '  SELECT COUNT(*) INTO v_slot_count',
    '    FROM public.timetable_slots',
    "   WHERE academic_year = '2569' AND semester = '2';",
    '  IF v_slot_count <> 315 THEN',
    "    RAISE EXCEPTION 'Assertion failed: expected 315 timetable_slots for 2569/2, got %', v_slot_count;",
    '  END IF;',
    '',
    '  SELECT COUNT(*) INTO v_coteach_count',
    '    FROM public.timetable_slots',
    "   WHERE academic_year = '2569' AND semester = '2' AND co_teacher_id = v_director_id;",
    '  IF v_coteach_count <> 6 THEN',
    "    RAISE EXCEPTION 'Assertion failed: expected 6 co-teaching slots for ผอ.ธีรศักดิ์, got %', v_coteach_count;",
    '  END IF;',
    '',
    '  WITH teacher_busy AS (',
    '    SELECT teacher_id AS tid, day_of_week, period_no, room_name',
    '      FROM public.timetable_slots',
    "     WHERE academic_year = '2569' AND semester = '2'",
    '    UNION ALL',
    '    SELECT co_teacher_id AS tid, day_of_week, period_no, room_name',
    '      FROM public.timetable_slots',
    "     WHERE academic_year = '2569' AND semester = '2' AND COALESCE(co_teacher_id, '') <> ''",
    '  )',
    '  SELECT COUNT(*) INTO v_conflict_count',
    '    FROM (',
    '      SELECT tid, day_of_week, period_no',
    '        FROM teacher_busy',
    '       GROUP BY tid, day_of_week, period_no',
    '      HAVING COUNT(*) > 1',
    '    ) clashes;',
    '  IF v_conflict_count > 0 THEN',
    "    RAISE EXCEPTION 'Assertion failed: detected % teacher time conflict(s) in 2569/2', v_conflict_count;",
    '  END IF;',
    'END $$;',
    '',
    'COMMIT;',
    '',
    "NOTIFY pgrst, 'reload schema';",
    ''
  );

  return lines.join('\n');
}
