import fs from 'fs';
const d = JSON.parse(fs.readFileSync('D:/ManStat-Modern/data/manstat_db.json', 'utf8'));

const teachers = d.teachers.map((t) => {
  const parts = t.name.split(' ');
  const prefix = parts[0].startsWith('นางสาว') ? 'นางสาว' : parts[0].startsWith('นาง') ? 'นาง' : 'นาย';
  const firstName = parts[0].replace(prefix, '');
  const lastName = parts.slice(1).join(' ');
  return {
    id: t.id || t.EmpID,
    employeeCode: t.EmpID || t.id,
    name: t.name,
    prefix,
    firstName,
    lastName,
    position: t.Position || t.role || 'ครู',
    academicStanding: (t.StandingsHistory && t.StandingsHistory.length > 0) ? t.StandingsHistory[0].standing_level : (t.role && t.role.includes('ชำนาญการ') ? t.role : '-'),
    department: t.department || 'สายงานบริหารและสนับสนุนการศึกษา',
    division: t.division || '-',
    classLevel: t.classLevel || '-',
    dutyDay: t.dutyDay || '-',
    accessLevel: t.accessLevel || 'User',
    startDate: t.startDate || '2020-01-01',
    email: t.email || '',
    phone: t.phone || '',
    maskedCitizenId: t.IDCardMasked || (t.idCard && t.idCard.length === 13 ? t.idCard.slice(0, 1) + '-' + t.idCard.slice(1, 5) + '-*****-**-' + t.idCard.slice(-1) : '3-3014-*****-**-1'),
    idCard: t.idCard || '',
    positionNo: t.positionNo || '',
    memberId: t.memberId || '',
    sickUsed: t.SickDays || 0,
    personalUsed: t.PersonalDays || 0,
    vacationUsed: t.VacationDays || 0,
    licenses: (t.ActiveLicenses || []).map(l => ({
      category: l.license_category || 'ครู',
      type: l.license_type || '',
      number: l.license_number || '',
      issueDate: l.issue_date || '',
      expiryDate: l.expiry_date || ''
    })),
    standings: (t.StandingsHistory || []).map(s => ({
      level: s.standing_level || '',
      effectiveDate: s.effective_date || '',
      orderNumber: s.order_number || ''
    })),
    educations: (t.EducationsHistory || []).map(e => ({
      degree: e.degree_short || e.degree_level || '',
      major: e.major || '',
      institute: e.institute || '',
      gradYear: e.grad_year || ''
    }))
  };
});

const boardMembers = d.boardMembers.map((b, idx) => ({
  id: b.member_id || ('SBD-00' + (idx + 1)),
  fullName: b.full_name || (b.prefix + b.first_name + ' ' + b.last_name),
  position: b.board_position || 'MEMBER',
  positionTitle: b.board_position === 'CHAIR' ? 'ประธานกรรมการ' :
                 b.board_position === 'TEACHER_REP' ? 'ผู้แทนครู' :
                 b.board_position === 'PARENT_REP' ? 'ผู้แทนผู้ปกครอง' :
                 b.board_position === 'ALUMNI_REP' ? 'ผู้แทนศิษย์เก่า' :
                 b.board_position === 'RELIGION_REP' ? 'ผู้แทนพระภิกษุสงฆ์ / ศาสนา' :
                 b.board_position === 'COMMUNITY_REP' ? 'ผู้แทนองค์กรชุมชน' :
                 b.board_position === 'LOCAL_ADMIN' ? 'ผู้แทนองค์กรปกครองส่วนท้องถิ่น' :
                 b.board_position === 'EXPERT' ? 'กรรมการผู้ทรงคุณวุฒิ' :
                 b.board_position === 'DIRECTOR_SEC' ? 'กรรมการและเลขานุการ' : 'กรรมการสถานศึกษา',
  occupation: b.occupation || '-',
  organization: b.organization || 'โรงเรียนชุมชนบ้านตะขบ',
  phone: b.phone || '-',
  status: b.status || 'ดำรงตำแหน่ง',
  termNumber: b.term_number || 1
}));

const tsContent = `/**
 * ============================================================================
 * ManStat-Modern: Ground-Truth School Data (โรงเรียนชุมชนบ้านตะขบ)
 * Synchronized directly with legacy ManStat database
 * ============================================================================
 */

export interface TeacherRecord {
  id: string;
  employeeCode: string;
  name: string;
  prefix: string;
  firstName: string;
  lastName: string;
  position: string;
  academicStanding: string;
  department: string;
  division: string;
  classLevel?: string;
  dutyDay?: string;
  accessLevel?: string;
  startDate: string;
  email: string;
  phone: string;
  maskedCitizenId: string;
  idCard: string;
  positionNo?: string;
  memberId?: string;
  sickUsed: number;
  personalUsed: number;
  vacationUsed: number;
  licenses: Array<{
    category: string;
    type: string;
    number: string;
    issueDate: string;
    expiryDate: string;
  }>;
  standings: Array<{
    level: string;
    effectiveDate: string;
    orderNumber: string;
  }>;
  educations: Array<{
    degree: string;
    major: string;
    institute: string;
    gradYear: string;
  }>;
}

export interface BoardMemberRecord {
  id: string;
  fullName: string;
  position: string;
  positionTitle: string;
  occupation: string;
  organization: string;
  phone: string;
  status: string;
  termNumber: number;
}

export interface SchoolInfoRecord {
  schoolName: string;
  affiliation: string;
  schoolCode10: string;
  schoolCode8: string;
  appName?: string;
  directorName: string;
  directorPosition: string;
  contactPhone: string;
  email: string;
  address: string;
  lat?: number;
  lng?: number;
  logoBase64?: string;
  actingDirector1: string;
  actingDirector2: string;
  academicYear: string;
  fiscalYear: string;
  currentTerm: string;
  studentCount: number;
  studentDataDate?: string;
}

export const ACTIVE_CLASSES: string[] = [
  'อนุบาล 1', 'อนุบาล 2', 'อนุบาล 3',
  'ประถมศึกษาปีที่ 1', 'ประถมศึกษาปีที่ 2', 'ประถมศึกษาปีที่ 3',
  'ประถมศึกษาปีที่ 4', 'ประถมศึกษาปีที่ 5', 'ประถมศึกษาปีที่ 6',
  'มัธยมศึกษาปีที่ 1', 'มัธยมศึกษาปีที่ 2', 'มัธยมศึกษาปีที่ 3'
];

export const INITIAL_SCHOOL_INFO: SchoolInfoRecord = ${JSON.stringify(d.schoolInfo, null, 2)};

export const INITIAL_TEACHERS: TeacherRecord[] = ${JSON.stringify(teachers, null, 2)};

export const INITIAL_BOARD_MEMBERS: BoardMemberRecord[] = ${JSON.stringify(boardMembers, null, 2)};

export interface LeaveRequestRecord {
  id: string;
  docNo: string;
  teacherId: string;
  teacherName: string;
  position: string;
  department: string;
  leaveType: 'sick' | 'personal' | 'vacation' | 'maternity' | 'ordination';
  leaveTypeName: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  substituteTeacherName: string;
  status: 'pending' | 'supervisor_approved' | 'approved' | 'rejected';
  submittedAt: string;
  supervisorRemark?: string;
  directorRemark?: string;
  currentStep: number;
}

export const INITIAL_LEAVE_REQUESTS: LeaveRequestRecord[] = [
  {
    id: 'LEV-2569-001',
    docNo: 'ศธ 04052.12/045',
    teacherId: 'TCH-003',
    teacherName: 'นายธวัชชัย เหลืองโอฬาร',
    position: 'ครูชำนาญการพิเศษ',
    department: 'ศิลปะ',
    leaveType: 'sick',
    leaveTypeName: 'ลาป่วย',
    startDate: '2026-11-10',
    endDate: '2026-11-11',
    totalDays: 2,
    reason: 'มีไข้หวัด ปวดศีรษะและพบแพทย์เพื่อรับการรักษาตามคำสั่งแพทย์',
    substituteTeacherName: 'นายพันธ์ธนัต ภวฤทธิ์นาคินทร์',
    status: 'approved',
    submittedAt: '2026-11-09T08:30:00',
    supervisorRemark: 'เห็นควรอนุญาต มอบหมายครูสอนแทนเรียบร้อยแล้ว',
    directorRemark: 'อนุมัติ',
    currentStep: 3
  },
  {
    id: 'LEV-2569-002',
    docNo: 'ศธ 04052.12/051',
    teacherId: 'TCH-005',
    teacherName: 'นางสาวกุสุมาลย์กมล พราหมณ์ตะขบ',
    position: 'ครูชำนาญการพิเศษ',
    department: 'ภาษาต่างประเทศ',
    leaveType: 'personal',
    leaveTypeName: 'ลากิจส่วนตัว',
    startDate: '2026-11-17',
    endDate: '2026-11-17',
    totalDays: 1,
    reason: 'ติดต่อธุรกรรมทางราชการ ณ สำนักงานที่ดินจังหวัดนครราชสีมา',
    substituteTeacherName: 'นางณิชกานต์ พลอยฉิมพลี',
    status: 'pending',
    submittedAt: '2026-11-15T09:15:00',
    supervisorRemark: 'รับทราบคำร้อง อยู่ระหว่างรอเสนอผู้อำนวยการพิจารณา',
    currentStep: 2
  },
  {
    id: 'LEV-2569-003',
    docNo: 'ศธ 04052.12/052',
    teacherId: 'TCH-008',
    teacherName: 'นางสาวสุนิสา สุทธิวงศ์',
    position: 'ครู คศ. 1',
    department: 'วิทยาศาสตร์และเทคโนโลยี',
    leaveType: 'sick',
    leaveTypeName: 'ลาป่วย',
    startDate: '2026-11-20',
    endDate: '2026-11-20',
    totalDays: 1,
    reason: 'มีอาการวิงเวียนศีรษะและเข้ารับการตรวจรักษาที่คลินิก',
    substituteTeacherName: 'นายกิตติพณ พรหมทอง',
    status: 'pending',
    submittedAt: '2026-11-16T08:00:00',
    supervisorRemark: 'ตรวจสอบภาระงานแล้ว ไม่กระทบตารางสอน',
    currentStep: 1
  }
];

export interface ScoutRecord {
  id: string;
  teacherId: string;
  teacherName: string;
  position: string;
  qualification: string;
  badgeLevel: string;
  category: string;
  issueDate: string;
  certificateNo: string;
  issuedBy: string;
  orderNumber: string;
}

export const INITIAL_SCOUTS: ScoutRecord[] = [
  {
    id: 'SCT-001',
    teacherId: 'EXE-001',
    teacherName: 'นายธีรศักดิ์ มโนธรรม',
    position: 'ผู้อำนวยการสถานศึกษา',
    qualification: 'Wood Badge 3 ท่อน (W.B.)',
    badgeLevel: '3 ท่อน',
    category: 'ผู้บังคับบัญชาลูกเสือ',
    issueDate: '2018-05-14',
    certificateNo: 'ลส. 345/2561',
    issuedBy: 'สำนักงานลูกเสือแห่งชาติ',
    orderNumber: 'สพป.นม.3 ที่ 182/2561'
  },
  {
    id: 'SCT-002',
    teacherId: 'TCH-003',
    teacherName: 'นายธวัชชัย เหลืองโอฬาร',
    position: 'ครูชำนาญการพิเศษ',
    qualification: 'Wood Badge 2 ท่อน (W.B.) ประเภทลูกเสือสามัญ',
    badgeLevel: '2 ท่อน',
    category: 'ลูกเสือสามัญ',
    issueDate: '2019-11-20',
    certificateNo: 'ลส. 892/2562',
    issuedBy: 'สโมสรลูกเสือจังหวัดนครราชสีมา',
    orderNumber: 'สพป.นม.3 ที่ 412/2562'
  },
  {
    id: 'SCT-003',
    teacherId: 'TCH-004',
    teacherName: 'นายพันธ์ธนัต ภวฤทธิ์นาคินทร์',
    position: 'ครูชำนาญการพิเศษ',
    qualification: 'A.T.C. (Advanced Unit Leader Training Course)',
    badgeLevel: 'A.T.C.',
    category: 'ลูกเสือสามัญรุ่นใหญ่',
    issueDate: '2022-03-18',
    certificateNo: 'นม. 112/2565',
    issuedBy: 'ค่ายลูกเสืออ่างห้วยยาง นครราชสีมา',
    orderNumber: 'สพป.นม.3 ที่ 89/2565'
  },
  {
    id: 'SCT-004',
    teacherId: 'TCH-006',
    teacherName: 'นางณิชกานต์ พลอยฉิมพลี',
    position: 'ครูชำนาญการพิเศษ',
    qualification: 'Wood Badge 2 ท่อน (W.B.) ประเภทลูกเสือสำรอง',
    badgeLevel: '2 ท่อน',
    category: 'ลูกเสือสำรอง',
    issueDate: '2021-09-05',
    certificateNo: 'ลส. 540/2564',
    issuedBy: 'สำนักงานลูกเสือแห่งชาติ',
    orderNumber: 'สพป.นม.3 ที่ 220/2564'
  }
];
`;

fs.writeFileSync('D:/ManStat-Modern/src/lib/data/schoolData.ts', tsContent);
console.log('Successfully generated D:/ManStat-Modern/src/lib/data/schoolData.ts');
