/**
 * ============================================================================
 * ManStat-Modern: Ground-Truth School Data (โรงเรียนชุมชนบ้านตะขบ)
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
  startDate: string;
  email: string;
  phone: string;
  maskedCitizenId: string;
  idCard: string;
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

export const INITIAL_TEACHERS: TeacherRecord[] = [
  {
    "id": "EXE-001",
    "employeeCode": "EXE-001",
    "name": "นายธีรศักดิ์ มโนธรรม",
    "prefix": "นาย",
    "firstName": "ธีรศักดิ์",
    "lastName": "มโนธรรม",
    "position": "ผู้อำนวยการสถานศึกษา",
    "academicStanding": "-",
    "department": "สายงานบริหารและสนับสนุนการศึกษา",
    "division": "ผู้บริหารสถานศึกษา",
    "startDate": "2012-01-10",
    "email": "gsic26@gmail.com",
    "phone": "099-173-2233",
    "maskedCitizenId": "3-3014-*****-**-1",
    "idCard": "3301401302311",
    "sickUsed": 0,
    "personalUsed": 0,
    "vacationUsed": 0,
    "licenses": [
      {
        "category": "ครู",
        "type": "B License (ใบอนุญาตประกอบวิชาชีพครู ชั้นต้น)",
        "number": "B68400502383947",
        "issueDate": "2026-08-27",
        "expiryDate": "2030-08-25"
      },
      {
        "category": "ผู้บริหารสถานศึกษา",
        "type": "ใบอนุญาตประกอบวิชาชีพผู้บริหารสถานศึกษา",
        "number": "67229000036282",
        "issueDate": "2024-11-12",
        "expiryDate": "2029-11-11"
      }
    ],
    "standings": [],
    "educations": [
      {
        "degree": "ศศ.บ.",
        "major": "บรรณารักษศาสตร์และสารนิเทศศาสตร์",
        "institute": "มหาวิทยาลัยราชภัฏวไลยอลงกรณ์ ในพระบรมราชูปถัมภ์",
        "gradYear": "2548"
      }
    ]
  },
  {
    "id": "TCH-003",
    "employeeCode": "75362",
    "name": "นายธวัชชัย เหลืองโอฬาร",
    "prefix": "นาย",
    "firstName": "ธวัชชัย",
    "lastName": "เหลืองโอฬาร",
    "position": "ครูชำนาญการพิเศษ",
    "academicStanding": "ครูชำนาญการพิเศษ",
    "department": "ศิลปะ",
    "division": "ผู้รักษาราชการแทนผู้อำนวยการสถานศึกษา (ลำดับที่ 2), หัวหน้าฝ่ายบริหารทั่วไปและกิจการนักเรียน, หัวหน้ากลุ่มสาระการเรียนรู้ศิลปะ, [หลัก] งานกิจการนักเรียน การปกครอง และส่งเสริมวินัย, [หลัก] งานป้องกันและแก้ไขปัญหาพฤติกรรม ยาเสพติด การกลั่นแกล้ง และความรุนแรง",
    "startDate": "2004-11-25",
    "email": "musicdang1z2@gmail.com",
    "phone": "06-2032-9458",
    "maskedCitizenId": "5-3101-*****-**-0",
    "idCard": "5310190033680",
    "sickUsed": 0,
    "personalUsed": 0,
    "vacationUsed": 0,
    "licenses": [],
    "standings": [
      {
        "level": "ครูชำนาญการพิเศษ",
        "effectiveDate": "2016-11-02",
        "orderNumber": "XX/2559"
      }
    ],
    "educations": []
  },
  {
    "id": "TCH-004",
    "employeeCode": "61080",
    "name": "นายพันธ์ธนัต ภวฤทธิ์นาคินทร์",
    "prefix": "นาย",
    "firstName": "พันธ์ธนัต",
    "lastName": "ภวฤทธิ์นาคินทร์",
    "position": "ครูชำนาญการพิเศษ",
    "academicStanding": "ครูชำนาญการพิเศษ",
    "department": "คณิตศาสตร์",
    "division": "หัวหน้าฝ่ายบริหารวิชาการ, ผู้รักษาราชการแทนผู้อำนวยการสถานศึกษา (ลำดับที่ 1), หัวหน้าระดับชั้นมัธยมศึกษาตอนต้น (ม.1 - ม.3), [หลัก] ผู้ดูแลห้องปฏิบัติการคอมพิวเตอร์",
    "startDate": "1998-05-05",
    "email": "Dechap19@gmail.com",
    "phone": "086-867-9339",
    "maskedCitizenId": "3-3014-*****-**-4",
    "idCard": "3301400192724",
    "sickUsed": 0,
    "personalUsed": 0,
    "vacationUsed": 0,
    "licenses": [],
    "standings": [],
    "educations": []
  },
  {
    "id": "TCH-005",
    "employeeCode": "14095",
    "name": "นางสาวกุสุมาลย์กมล พราหมณ์ตะขบ",
    "prefix": "นางสาว",
    "firstName": "กุสุมาลย์กมล",
    "lastName": "พราหมณ์ตะขบ",
    "position": "ครูชำนาญการพิเศษ",
    "academicStanding": "ครูชำนาญการพิเศษ",
    "department": "ภาษาต่างประเทศ",
    "division": "งานประกันคุณภาพภายในสถานศึกษา",
    "startDate": "2003-02-28",
    "email": "kusumarnkamol@gmail.com",
    "phone": "093-495-7951",
    "maskedCitizenId": "3-3014-*****-**-1",
    "idCard": "3301401162101",
    "sickUsed": 0,
    "personalUsed": 0,
    "vacationUsed": 0,
    "licenses": [],
    "standings": [],
    "educations": []
  },
  {
    "id": "TCH-006",
    "employeeCode": "10133",
    "name": "นางณิชกานต์ พลอยฉิมพลี",
    "prefix": "นาง",
    "firstName": "ณิชกานต์",
    "lastName": "พลอยฉิมพลี",
    "position": "ครูชำนาญการพิเศษ",
    "academicStanding": "ครูชำนาญการพิเศษ",
    "department": "คณิตศาสตร์",
    "division": "เจ้าหน้าที่ฝ่ายบริหารทั่วไป",
    "startDate": "2008-05-26",
    "email": "123456@gmail.com",
    "phone": "081-725-9258",
    "maskedCitizenId": "3-3014-*****-**-4",
    "idCard": "3301400511714",
    "sickUsed": 0,
    "personalUsed": 0,
    "vacationUsed": 0,
    "licenses": [],
    "standings": [],
    "educations": []
  },
  {
    "id": "TCH-007",
    "employeeCode": "10354",
    "name": "นางสาวทัชชกร ช่วยจังหรีด",
    "prefix": "นางสาว",
    "firstName": "ทัชชกร",
    "lastName": "ช่วยจังหรีด",
    "position": "ครูชำนาญการพิเศษ",
    "academicStanding": "ครูชำนาญการพิเศษ",
    "department": "คณิตศาสตร์",
    "division": "หัวหน้าฝ่ายบริหารงานบุคคล",
    "startDate": "2011-05-19",
    "email": "bestpore@gmail.com",
    "phone": "-",
    "maskedCitizenId": "3-3014-*****-**-0",
    "idCard": "3301401235770",
    "sickUsed": 0,
    "personalUsed": 0,
    "vacationUsed": 0,
    "licenses": [],
    "standings": [],
    "educations": []
  },
  {
    "id": "TCH-008",
    "employeeCode": "24950",
    "name": "นางสาวสุนิสา สุทธิวงศ์",
    "prefix": "นางสาว",
    "firstName": "สุนิสา",
    "lastName": "สุทธิวงศ์",
    "position": "ครู คศ. 1",
    "academicStanding": "-",
    "department": "วิทยาศาสตร์และเทคโนโลยี",
    "division": "หัวหน้าฝ่ายบริหารงบประมาณและแผนงาน",
    "startDate": "2020-08-27",
    "email": "heureuxamp@gmail.com",
    "phone": "089-526-6705",
    "maskedCitizenId": "3-1409-*****-**-6",
    "idCard": "3140900049816",
    "sickUsed": 0,
    "personalUsed": 0,
    "vacationUsed": 0,
    "licenses": [],
    "standings": [],
    "educations": []
  },
  {
    "id": "TCH-009",
    "employeeCode": "1401",
    "name": "นายกิตติพณ พรหมทอง",
    "prefix": "นาย",
    "firstName": "กิตติพณ",
    "lastName": "พรหมทอง",
    "position": "ครู คศ. 1",
    "academicStanding": "-",
    "department": "สังคมศึกษา ศาสนาและวัฒนธรรม",
    "division": "งานระบบดูแลช่วยเหลือนักเรียน / กิจการนักเรียน",
    "startDate": "2020-06-01",
    "email": "xxxxxxxxxx@gmail.com",
    "phone": "093-383-4518",
    "maskedCitizenId": "1-3099-*****-**-5",
    "idCard": "1309900615625",
    "sickUsed": 0,
    "personalUsed": 0,
    "vacationUsed": 0,
    "licenses": [],
    "standings": [],
    "educations": []
  },
  {
    "id": "TCH-010",
    "employeeCode": "118902",
    "name": "นางสาวภัสราวดี ทองลาด",
    "prefix": "นางสาว",
    "firstName": "ภัสราวดี",
    "lastName": "ทองลาด",
    "position": "ครู คศ. 1",
    "academicStanding": "-",
    "department": "การศึกษาปฐมวัย",
    "division": "งานพัสดุและสินทรัพย์",
    "startDate": "2023-07-27",
    "email": "thepas2026@gmail.com",
    "phone": "090-294-9991",
    "maskedCitizenId": "1-3199-*****-**-5",
    "idCard": "1319900671495",
    "sickUsed": 0,
    "personalUsed": 0,
    "vacationUsed": 0,
    "licenses": [],
    "standings": [],
    "educations": []
  },
  {
    "id": "TCH-011",
    "employeeCode": "10356",
    "name": "นางสาวสิรินภา สินไชย",
    "prefix": "นางสาว",
    "firstName": "สิรินภา",
    "lastName": "สินไชย",
    "position": "ครู คศ. 1",
    "academicStanding": "-",
    "department": "การศึกษาปฐมวัย",
    "division": "งานการเงินและบัญชี",
    "startDate": "2023-07-27",
    "email": "Sirinapaff1802@gmail.com",
    "phone": "093-263-8983",
    "maskedCitizenId": "1-1999-*****-**-3",
    "idCard": "1199900744923",
    "sickUsed": 0,
    "personalUsed": 0,
    "vacationUsed": 0,
    "licenses": [],
    "standings": [],
    "educations": []
  },
  {
    "id": "TCH-012",
    "employeeCode": "TCH-012",
    "name": "นางสาวสุธิดา สิงขรอาจ",
    "prefix": "นางสาว",
    "firstName": "สุธิดา",
    "lastName": "สิงขรอาจ",
    "position": "ครู คศ. 1",
    "academicStanding": "-",
    "department": "ภาษาไทย",
    "division": "งานพัสดุและสินทรัพย์",
    "startDate": "2023-11-20",
    "email": "suthida.nooknook29@gmail.com",
    "phone": "098-194-4390",
    "maskedCitizenId": "1-3099-*****-**-1",
    "idCard": "1309902702711",
    "sickUsed": 0,
    "personalUsed": 0,
    "vacationUsed": 0,
    "licenses": [],
    "standings": [],
    "educations": []
  },
  {
    "id": "TCH-013",
    "employeeCode": "TCH-013",
    "name": "นายชินวัจน์ มาตย์นอก",
    "prefix": "นาย",
    "firstName": "ชินวัจน์",
    "lastName": "มาตย์นอก",
    "position": "ครูผู้ช่วย",
    "academicStanding": "-",
    "department": "ภาษาไทย",
    "division": "งานเทคโนโลยีสารสนเทศ (ICT / DMC)",
    "startDate": "2022-11-12",
    "email": "gielock7@gmail.com",
    "phone": "0870867389",
    "maskedCitizenId": "1-3001-xxxxx-12-3",
    "idCard": "1300100000000",
    "sickUsed": 0,
    "personalUsed": 0,
    "vacationUsed": 0,
    "licenses": [],
    "standings": [],
    "educations": []
  },
  {
    "id": "TCH-014",
    "employeeCode": "TCH-014",
    "name": "นางสาวอภิชญา พุสดีดอน",
    "prefix": "นางสาว",
    "firstName": "อภิชญา",
    "lastName": "พุสดีดอน",
    "position": "พี่เลี้ยงเด็กพิการโรงเรียนทั่วไปจัดการเรียนรวม",
    "academicStanding": "-",
    "department": "สังคมศึกษา ศาสนาและวัฒนธรรม",
    "division": "[รอง] งานระบบดูแลช่วยเหลือนักเรียน / กิจการนักเรียน",
    "startDate": "2022-11-13",
    "email": "kik123456@gmail.com",
    "phone": "094-478-1680",
    "maskedCitizenId": "1-3001-xxxxx-12-3",
    "idCard": "1300100000000",
    "sickUsed": 0,
    "personalUsed": 0,
    "vacationUsed": 0,
    "licenses": [],
    "standings": [],
    "educations": []
  },
  {
    "id": "STF-001",
    "employeeCode": "STF-001",
    "name": "นางสาวอุไรวรรณ อินแพง",
    "prefix": "นางสาว",
    "firstName": "อุไรวรรณ",
    "lastName": "อินแพง",
    "position": "เจ้าหน้าที่ธุรการโรงเรียน",
    "academicStanding": "-",
    "department": "สังคมศึกษา ศาสนาและวัฒนธรรม",
    "division": "งานธุรการและสารบรรณ",
    "startDate": "2022-11-14",
    "email": "uraiwan922@gmail.com",
    "phone": "083-382-5324",
    "maskedCitizenId": "1-3001-xxxxx-12-3",
    "idCard": "1300100000000",
    "sickUsed": 0,
    "personalUsed": 0,
    "vacationUsed": 0,
    "licenses": [],
    "standings": [],
    "educations": []
  },
  {
    "id": "STF-002",
    "employeeCode": "STF-002",
    "name": "นายกำพล กักหมื่นไวย",
    "prefix": "นาย",
    "firstName": "กำพล",
    "lastName": "กักหมื่นไวย",
    "position": "นักการภารโรง",
    "academicStanding": "-",
    "department": "ภาษาไทย",
    "division": "เจ้าหน้าที่ฝ่ายบริหารทั่วไป",
    "startDate": "2026-10-23",
    "email": "-",
    "phone": "098-736-8819",
    "maskedCitizenId": "1-3001-xxxxx-12-3",
    "idCard": "1300100000000",
    "sickUsed": 0,
    "personalUsed": 0,
    "vacationUsed": 0,
    "licenses": [],
    "standings": [],
    "educations": []
  }
];

export const INITIAL_BOARD_MEMBERS: BoardMemberRecord[] = [
  {
    "id": "SBD-261030151715",
    "fullName": "นายธีรศักดิ์ มโนธรรม",
    "position": "DIRECTOR_SEC",
    "positionTitle": "กรรมการและเลขานุการ",
    "occupation": "ผู้อำนวยการสถานศึกษา",
    "organization": "โรงเรียนชุมชนบ้านตะขบ",
    "phone": "099-173-2233",
    "status": "ดำรงตำแหน่ง",
    "termNumber": 1
  },
  {
    "id": "SBD-TCH-TCH-006",
    "fullName": "นางณิชกานต์ พลอยฉิมพลี",
    "position": "TEACHER_REP",
    "positionTitle": "กรรมการผู้แทนครู",
    "occupation": "ครูชำนาญการพิเศษ",
    "organization": "โรงเรียนชุมชนบ้านตะขบ",
    "phone": "081-725-9258",
    "status": "ดำรงตำแหน่ง",
    "termNumber": 1
  },
  {
    "id": "SBD-003",
    "fullName": "นางเสาวนีย์ ศิริวรรณโยธา",
    "position": "CHAIR",
    "positionTitle": "ประธานกรรมการ",
    "occupation": "ธุรกิจส่วนตัว",
    "organization": "โรงเรียนชุมชนบ้านตะขบ",
    "phone": "064-178-9789",
    "status": "ดำรงตำแหน่ง",
    "termNumber": 1
  },
  {
    "id": "SBD-004",
    "fullName": "นางปวิมล มะสิโกวา",
    "position": "PARENT_REP",
    "positionTitle": "กรรมการผู้แทนผู้ปกครอง",
    "occupation": "-",
    "organization": "โรงเรียนชุมชนบ้านตะขบ",
    "phone": "-",
    "status": "ดำรงตำแหน่ง",
    "termNumber": 1
  },
  {
    "id": "SBD-005",
    "fullName": "นางปัทมาพร ธงตะขบ",
    "position": "ALUMNI_REP",
    "positionTitle": "กรรมการผู้แทนศิษย์เก่า",
    "occupation": "-",
    "organization": "โรงเรียนชุมชนบ้านตะขบ",
    "phone": "-",
    "status": "ดำรงตำแหน่ง",
    "termNumber": 1
  },
  {
    "id": "SBD-006",
    "fullName": "พระครูธวัชชโยดม",
    "position": "RELIGION_REP",
    "positionTitle": "กรรมการผู้ทรงคุณวุฒิ",
    "occupation": "-",
    "organization": "โรงเรียนชุมชนบ้านตะขบ",
    "phone": "-",
    "status": "ดำรงตำแหน่ง",
    "termNumber": 1
  },
  {
    "id": "SBD-007",
    "fullName": "นางสาวปฐมา ควรตะขบ",
    "position": "COMMUNITY_REP",
    "positionTitle": "กรรมการผู้แทนองค์กรชุมชน",
    "occupation": "-",
    "organization": "โรงเรียนชุมชนบ้านตะขบ",
    "phone": "-",
    "status": "ดำรงตำแหน่ง",
    "termNumber": 1
  },
  {
    "id": "SBD-008",
    "fullName": "นางเกศรินทร์ ไชยหาญ",
    "position": "LOCAL_ADMIN",
    "positionTitle": "กรรมการผู้ทรงคุณวุฒิ",
    "occupation": "-",
    "organization": "โรงเรียนชุมชนบ้านตะขบ",
    "phone": "-",
    "status": "ดำรงตำแหน่ง",
    "termNumber": 1
  },
  {
    "id": "SBD-009",
    "fullName": "นายสวัสดิ์ งามตะขบ",
    "position": "EXPERT",
    "positionTitle": "กรรมการผู้ทรงคุณวุฒิ",
    "occupation": "-",
    "organization": "โรงเรียนชุมชนบ้านตะขบ",
    "phone": "-",
    "status": "ดำรงตำแหน่ง",
    "termNumber": 1
  }
];

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
    id: "LEV-2569-001",
    docNo: "ศธ 04052.12/045",
    teacherId: "TCH-002",
    teacherName: "นายธวัชชัย เหลืองโอฬาร",
    position: "ครู วิทยฐานะชำนาญการพิเศษ",
    department: "กลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี",
    leaveType: "sick",
    leaveTypeName: "ลาป่วย",
    startDate: "2026-11-10",
    endDate: "2026-11-11",
    totalDays: 2,
    reason: "มีไข้หวัด ปวดศีรษะและพบแพทย์เพื่อรับการรักษาตามคำสั่งแพทย์",
    substituteTeacherName: "นายพันธ์ธนัต ภวฤทธิ์นาคินทร์",
    status: "approved",
    submittedAt: "2026-11-09T08:30:00",
    supervisorRemark: "เห็นควรอนุญาต มอบหมายครูสอนแทนเรียบร้อยแล้ว",
    directorRemark: "อนุมัติ",
    currentStep: 3
  },
  {
    id: "LEV-2569-002",
    docNo: "ศธ 04052.12/051",
    teacherId: "TCH-006",
    teacherName: "นางสาวอาริยา ลี้ตะขบ",
    position: "ครูผู้ช่วย",
    department: "กลุ่มสาระการเรียนรู้ภาษาไทย",
    leaveType: "personal",
    leaveTypeName: "ลากิจส่วนตัว",
    startDate: "2026-11-17",
    endDate: "2026-11-17",
    totalDays: 1,
    reason: "ติดต่อธุรกรรมจัดการเอกสารที่ดินครอบครัว ณ สำนักงานที่ดินจังหวัดนครราชสีมา",
    substituteTeacherName: "นางสาวขวัญฤดี ชวนตะขบ",
    status: "pending",
    submittedAt: "2026-11-15T09:15:00",
    supervisorRemark: "รับทราบคำร้อง อยู่ระหว่างรอเสนอผู้อำนวยการพิจารณา",
    currentStep: 2
  },
  {
    id: "LEV-2569-003",
    docNo: "ศธ 04052.12/052",
    teacherId: "TCH-007",
    teacherName: "นายปฏิภาณ ศรีหาตา",
    position: "ครู",
    department: "กลุ่มสาระการเรียนรู้คณิตศาสตร์",
    leaveType: "vacation",
    leaveTypeName: "ลาพักผ่อน",
    startDate: "2026-11-20",
    endDate: "2026-11-21",
    totalDays: 2,
    reason: "เดินทางกลับภูมิลำเนาเพื่อดูแลบิดามารดา",
    substituteTeacherName: "นายสมโภช บัวพา",
    status: "pending",
    submittedAt: "2026-11-16T08:00:00",
    supervisorRemark: "ตรวจสอบภาระงานแล้ว ไม่กระทบตารางสอน",
    currentStep: 1
  },
  {
    id: "LEV-2569-004",
    docNo: "ศธ 04052.12/038",
    teacherId: "TCH-004",
    teacherName: "นางสาวกุสุมาลย์กมล พราหมณ์ตะขบ",
    position: "ครู วิทยฐานะชำนาญการ",
    department: "กลุ่มสาระการเรียนรู้ภาษาต่างประเทศ",
    leaveType: "sick",
    leaveTypeName: "ลาป่วย",
    startDate: "2026-10-28",
    endDate: "2026-10-28",
    totalDays: 0.5,
    reason: "พบแพทย์ตามนัดคลินิกเฉพาะทางช่วงบ่าย",
    substituteTeacherName: "นางณิชกานต์ พลอยฉิมพลี",
    status: "approved",
    submittedAt: "2026-10-27T14:20:00",
    supervisorRemark: "อนุญาตตามระเบียบ",
    directorRemark: "อนุมัติ",
    currentStep: 3
  },
  {
    id: "LEV-2569-005",
    docNo: "ศธ 04052.12/029",
    teacherId: "TCH-010",
    teacherName: "นางสาวชนิกานต์ ภูมิประโคน",
    position: "ครูผู้ช่วย",
    department: "กลุ่มสาระการเรียนรู้ศิลปะ",
    leaveType: "personal",
    leaveTypeName: "ลากิจส่วนตัว",
    startDate: "2026-10-15",
    endDate: "2026-10-16",
    totalDays: 2,
    reason: "เข้าร่วมพิธีพระราชทานปริญญาบัตรของน้องสาว",
    substituteTeacherName: "นางสาวศิริลักษณ์ อิ่มเอิบ",
    status: "approved",
    submittedAt: "2026-10-12T10:00:00",
    supervisorRemark: "อนุมัติให้ไปปฏิบัติธุระ",
    directorRemark: "อนุมัติ",
    currentStep: 3
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
    id: "SCT-001",
    teacherId: "EXE-001",
    teacherName: "นายธีรศักดิ์ มโนธรรม",
    position: "ผู้อำนวยการสถานศึกษา",
    qualification: "Wood Badge 3 ท่อน (W.B.)",
    badgeLevel: "3 ท่อน",
    category: "ผู้บังคับบัญชาลูกเสือ",
    issueDate: "2018-05-14",
    certificateNo: "ลส. 345/2561",
    issuedBy: "สำนักงานลูกเสือแห่งชาติ",
    orderNumber: "สพป.นม.3 ที่ 182/2561"
  },
  {
    id: "SCT-002",
    teacherId: "TCH-002",
    teacherName: "นายธวัชชัย เหลืองโอฬาร",
    position: "ครู วิทยฐานะชำนาญการพิเศษ",
    qualification: "Wood Badge 2 ท่อน (W.B.) ประเภทลูกเสือสามัญ",
    badgeLevel: "2 ท่อน",
    category: "ลูกเสือสามัญ",
    issueDate: "2019-11-20",
    certificateNo: "ลส. 892/2562",
    issuedBy: "สโมสรลูกเสือจังหวัดนครราชสีมา",
    orderNumber: "สพป.นม.3 ที่ 412/2562"
  },
  {
    id: "SCT-003",
    teacherId: "TCH-003",
    teacherName: "นายพันธ์ธนัต ภวฤทธิ์นาคินทร์",
    position: "ครู วิทยฐานะชำนาญการ",
    qualification: "A.T.C. (Advanced Unit Leader Training Course)",
    badgeLevel: "A.T.C.",
    category: "ลูกเสือสามัญรุ่นใหญ่",
    issueDate: "2022-03-18",
    certificateNo: "นม. 112/2565",
    issuedBy: "ค่ายลูกเสืออ่างห้วยยาง นครราชสีมา",
    orderNumber: "สพป.นม.3 ที่ 89/2565"
  },
  {
    id: "SCT-004",
    teacherId: "TCH-005",
    teacherName: "นางณิชกานต์ พลอยฉิมพลี",
    position: "ครู วิทยฐานะชำนาญการ",
    qualification: "Wood Badge 2 ท่อน (W.B.) ประเภทลูกเสือสำรอง",
    badgeLevel: "2 ท่อน",
    category: "ลูกเสือสำรอง",
    issueDate: "2021-09-05",
    certificateNo: "ลส. 540/2564",
    issuedBy: "สำนักงานลูกเสือแห่งชาติ",
    orderNumber: "สพป.นม.3 ที่ 220/2564"
  },
  {
    id: "SCT-005",
    teacherId: "TCH-007",
    teacherName: "นายปฏิภาณ ศรีหาตา",
    position: "ครู",
    qualification: "B.T.C. (Basic Unit Leader Training Course)",
    badgeLevel: "B.T.C.",
    category: "ลูกเสือสามัญ",
    issueDate: "2023-08-12",
    certificateNo: "นม. 304/2566",
    issuedBy: "สโมสรลูกเสือนครราชสีมา",
    orderNumber: "สพป.นม.3 ที่ 198/2566"
  },
  {
    id: "SCT-006",
    teacherId: "TCH-013",
    teacherName: "นายสมโภช บัวพา",
    position: "ครู",
    qualification: "B.T.C. (Basic Unit Leader Training Course)",
    badgeLevel: "B.T.C.",
    category: "ลูกเสือสำรอง",
    issueDate: "2024-02-24",
    certificateNo: "นม. 088/2567",
    issuedBy: "ค่ายลูกเสือจังหวัดนครราชสีมา",
    orderNumber: "สพป.นม.3 ที่ 45/2567"
  }
];

