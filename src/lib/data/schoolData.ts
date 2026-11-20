/**
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
  role?: string;
  startDate: string;
  birthDate?: string;
  email: string;
  phone: string;
  maskedCitizenId: string;
  idCard: string;
  positionNo?: string;
  memberId?: string;
  highestScout?: string;
  scoutCertNo?: string;
  teachingHours?: number;
  taHours?: number;
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
  isExOfficio?: boolean;
  appointmentDate?: string;
  endDate?: string;
  endReason?: string;
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
  activeClasses?: string[];
}

export const ACTIVE_CLASSES: string[] = [
  'อนุบาล 1', 'อนุบาล 2', 'อนุบาล 3',
  'ประถมศึกษาปีที่ 1', 'ประถมศึกษาปีที่ 2', 'ประถมศึกษาปีที่ 3',
  'ประถมศึกษาปีที่ 4', 'ประถมศึกษาปีที่ 5', 'ประถมศึกษาปีที่ 6',
  'มัธยมศึกษาปีที่ 1', 'มัธยมศึกษาปีที่ 2', 'มัธยมศึกษาปีที่ 3'
];

export const INITIAL_SCHOOL_INFO: SchoolInfoRecord = {
  "schoolName": "โรงเรียนชุมชนบ้านตะขบ",
  "affiliation": "สำนักงานเขตพื้นที่การศึกษาประถมศึกษานครราชสีมา เขต 3",
  "schoolCode10": "1030200688",
  "schoolCode8": "30030099",
  "appName": "ManStat",
  "directorName": "นายธีรศักดิ์ มโนธรรม",
  "directorPosition": "ผู้อำนวยการโรงเรียนชุมชนบ้านตะขบ",
  "contactPhone": "099-173-2233",
  "email": "chumchonbantakhob2473@gmail.com",
  "address": "ม.1 โรงเรียนชุมชนบ้านตะขบ ต.ตะขบ อ.ปักธงชัย จ.นครราชสีมา 30150",
  "lat": 14.634629,
  "lng": 101.852567,
  "logoBase64": "",
  "actingDirector1": "นายพันธ์ธนัต ภวฤทธิ์นาคินทร์",
  "actingDirector2": "นายธวัชชัย เหลืองโอฬาร",
  "academicYear": "2569",
  "fiscalYear": "2570",
  "currentTerm": "2",
  "studentCount": 94,
  "studentDataDate": "",
  "activeClasses": [
    "อนุบาล 2", "อนุบาล 3",
    "ประถมศึกษาปีที่ 1", "ประถมศึกษาปีที่ 2", "ประถมศึกษาปีที่ 3",
    "ประถมศึกษาปีที่ 4", "ประถมศึกษาปีที่ 5", "ประถมศึกษาปีที่ 6"
  ]
};

export const INITIAL_TEACHERS: TeacherRecord[] = [
  {
    "id": "EXE-001",
    "employeeCode": "EXE-001",
    "name": "นายธีรศักดิ์ มโนธรรม",
    "prefix": "นาย",
    "firstName": "ธีรศักดิ์",
    "lastName": "มโนธรรม",
    "position": "ผู้อำนวยการโรงเรียน",
    "academicStanding": "-",
    "department": "สายงานบริหารและสนับสนุนการศึกษา",
    "division": "ผู้บริหารสถานศึกษา",
    "classLevel": "-",
    "dutyDay": "-",
    "accessLevel": "Superuser",
    "role": "superuser",
    "startDate": "2012-01-10",
    "email": "gsic26@gmail.com",
    "phone": "099-173-2233",
    "maskedCitizenId": "3-3014-*****-**-1",
    "idCard": "3301401302311",
    "positionNo": "",
    "memberId": "3301401302311",
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
    "employeeCode": "TCH-003",
    "name": "นายธวัชชัย เหลืองโอฬาร",
    "prefix": "นาย",
    "firstName": "ธวัชชัย",
    "lastName": "เหลืองโอฬาร",
    "position": "ครูชำนาญการพิเศษ",
    "academicStanding": "ครูชำนาญการพิเศษ",
    "department": "ศิลปะ",
    "division": "ผู้รักษาราชการแทนผู้อำนวยการสถานศึกษา (ลำดับที่ 2), หัวหน้าฝ่ายบริหารทั่วไปและกิจการนักเรียน, หัวหน้ากลุ่มสาระการเรียนรู้ศิลปะ, [หลัก] งานกิจการนักเรียน การปกครอง และส่งเสริมวินัย, [หลัก] งานป้องกันและแก้ไขปัญหาพฤติกรรม ยาเสพติด การกลั่นแกล้ง และความรุนแรง",
    "classLevel": "มัธยมศึกษาปีที่ 1",
    "dutyDay": "-",
    "accessLevel": "Admin",
    "startDate": "2004-11-25",
    "email": "musicdang1z2@gmail.com",
    "phone": "06-2032-9458",
    "maskedCitizenId": "5-3101-*****-**-0",
    "idCard": "5310190033680",
    "positionNo": "75362",
    "memberId": "5310190033680",
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
    "employeeCode": "TCH-004",
    "name": "นายพันธ์ธนัต ภวฤทธิ์นาคินทร์",
    "prefix": "นาย",
    "firstName": "พันธ์ธนัต",
    "lastName": "ภวฤทธิ์นาคินทร์",
    "position": "ครูชำนาญการพิเศษ",
    "academicStanding": "ครูชำนาญการพิเศษ",
    "department": "คณิตศาสตร์",
    "division": "หัวหน้าฝ่ายบริหารวิชาการ, ผู้รักษาราชการแทนผู้อำนวยการสถานศึกษา (ลำดับที่ 1), หัวหน้าระดับชั้นมัธยมศึกษาตอนต้น (ม.1 - ม.3), [หลัก] ผู้ดูแลห้องปฏิบัติการคอมพิวเตอร์",
    "classLevel": "มัธยมศึกษาปีที่ 3",
    "dutyDay": "-",
    "accessLevel": "Admin",
    "startDate": "1998-05-05",
    "email": "Dechap19@gmail.com",
    "phone": "086-867-9339",
    "maskedCitizenId": "3-3014-*****-**-4",
    "idCard": "3301400192724",
    "positionNo": "61080",
    "memberId": "3301400192724",
    "sickUsed": 0,
    "personalUsed": 0,
    "vacationUsed": 0,
    "licenses": [],
    "standings": [],
    "educations": []
  },
  {
    "id": "TCH-005",
    "employeeCode": "TCH-005",
    "name": "นางสาวกุสุมาลย์กมล พราหมณ์ตะขบ",
    "prefix": "นางสาว",
    "firstName": "กุสุมาลย์กมล",
    "lastName": "พราหมณ์ตะขบ",
    "position": "ครูชำนาญการพิเศษ",
    "academicStanding": "ครูชำนาญการพิเศษ",
    "department": "ภาษาต่างประเทศ",
    "division": "งานประกันคุณภาพภายในสถานศึกษา",
    "classLevel": "มัธยมศึกษาปีที่ 2",
    "dutyDay": "-",
    "accessLevel": "User",
    "startDate": "2003-02-28",
    "email": "kusumarnkamol@gmail.com",
    "phone": "093-495-7951",
    "maskedCitizenId": "3-3014-*****-**-1",
    "idCard": "3301401162101",
    "positionNo": "14095",
    "memberId": "3301401162101",
    "sickUsed": 0,
    "personalUsed": 0,
    "vacationUsed": 0,
    "licenses": [],
    "standings": [],
    "educations": []
  },
  {
    "id": "TCH-006",
    "employeeCode": "TCH-006",
    "name": "นางณิชกานต์ พลอยฉิมพลี",
    "prefix": "นาง",
    "firstName": "ณิชกานต์",
    "lastName": "พลอยฉิมพลี",
    "position": "ครูชำนาญการพิเศษ",
    "academicStanding": "ครูชำนาญการพิเศษ",
    "department": "คณิตศาสตร์",
    "division": "เจ้าหน้าที่ฝ่ายบริหารทั่วไป",
    "classLevel": "ประถมศึกษาปีที่ 4",
    "dutyDay": "-",
    "accessLevel": "User",
    "startDate": "2008-05-26",
    "email": "123456@gmail.com",
    "phone": "081-725-9258",
    "maskedCitizenId": "3-3014-*****-**-4",
    "idCard": "3301400511714",
    "positionNo": "10133",
    "memberId": "3301400511714",
    "sickUsed": 0,
    "personalUsed": 0,
    "vacationUsed": 0,
    "licenses": [],
    "standings": [],
    "educations": []
  },
  {
    "id": "TCH-007",
    "employeeCode": "TCH-007",
    "name": "นางสาวทัชชกร ช่วยจังหรีด",
    "prefix": "นางสาว",
    "firstName": "ทัชชกร",
    "lastName": "ช่วยจังหรีด",
    "position": "ครูชำนาญการพิเศษ",
    "academicStanding": "ครูชำนาญการพิเศษ",
    "department": "คณิตศาสตร์",
    "division": "หัวหน้าฝ่ายบริหารงานบุคคล",
    "classLevel": "ประถมศึกษาปีที่ 5",
    "dutyDay": "-",
    "accessLevel": "Admin",
    "startDate": "2011-05-19",
    "email": "bestpore@gmail.com",
    "phone": "",
    "maskedCitizenId": "3-3014-*****-**-0",
    "idCard": "3301401235770",
    "positionNo": "10354",
    "memberId": "3301401235770",
    "sickUsed": 0,
    "personalUsed": 0,
    "vacationUsed": 0,
    "licenses": [],
    "standings": [],
    "educations": []
  },
  {
    "id": "TCH-008",
    "employeeCode": "TCH-008",
    "name": "นางสาวสุนิสา สุทธิวงศ์",
    "prefix": "นางสาว",
    "firstName": "สุนิสา",
    "lastName": "สุทธิวงศ์",
    "position": "ครู คศ. 1",
    "academicStanding": "-",
    "department": "วิทยาศาสตร์และเทคโนโลยี",
    "division": "หัวหน้าฝ่ายบริหารงบประมาณและแผนงาน",
    "classLevel": "ประถมศึกษาปีที่ 6",
    "dutyDay": "-",
    "accessLevel": "User",
    "startDate": "2020-08-27",
    "email": "heureuxamp@gmail.com",
    "phone": "089-526-6705",
    "maskedCitizenId": "3-1409-*****-**-6",
    "idCard": "3140900049816",
    "positionNo": "24950",
    "memberId": "3140900049816",
    "sickUsed": 0,
    "personalUsed": 0,
    "vacationUsed": 0,
    "licenses": [],
    "standings": [],
    "educations": []
  },
  {
    "id": "TCH-009",
    "employeeCode": "TCH-009",
    "name": "นายกิตติพณ พรหมทอง",
    "prefix": "นาย",
    "firstName": "กิตติพณ",
    "lastName": "พรหมทอง",
    "position": "ครู คศ. 1",
    "academicStanding": "-",
    "department": "สังคมศึกษา ศาสนาและวัฒนธรรม",
    "division": "งานระบบดูแลช่วยเหลือนักเรียน / กิจการนักเรียน",
    "classLevel": "ประถมศึกษาปีที่ 3",
    "dutyDay": "-",
    "accessLevel": "User",
    "startDate": "2020-06-01",
    "email": "xxxxxxxxxx@gmail.com",
    "phone": "093-383-4518",
    "maskedCitizenId": "1-3099-*****-**-5",
    "idCard": "1309900615625",
    "positionNo": "1401",
    "memberId": "1309900615625",
    "sickUsed": 0,
    "personalUsed": 0,
    "vacationUsed": 0,
    "licenses": [],
    "standings": [],
    "educations": []
  },
  {
    "id": "TCH-010",
    "employeeCode": "TCH-010",
    "name": "นางสาวภัสราวดี ทองลาด",
    "prefix": "นางสาว",
    "firstName": "ภัสราวดี",
    "lastName": "ทองลาด",
    "position": "ครู คศ. 1",
    "academicStanding": "-",
    "department": "การศึกษาปฐมวัย",
    "division": "งานพัสดุและสินทรัพย์",
    "classLevel": "อนุบาล 2",
    "dutyDay": "-",
    "accessLevel": "User",
    "startDate": "2023-07-27",
    "email": "thepas2026@gmail.com",
    "phone": "090-294-9991",
    "maskedCitizenId": "1-3199-*****-**-5",
    "idCard": "1319900671495",
    "positionNo": "118902",
    "memberId": "1319900671495",
    "sickUsed": 0,
    "personalUsed": 0,
    "vacationUsed": 0,
    "licenses": [],
    "standings": [],
    "educations": []
  },
  {
    "id": "TCH-011",
    "employeeCode": "TCH-011",
    "name": "นางสาวสิรินภา สินไชย",
    "prefix": "นางสาว",
    "firstName": "สิรินภา",
    "lastName": "สินไชย",
    "position": "ครู คศ. 1",
    "academicStanding": "-",
    "department": "การศึกษาปฐมวัย",
    "division": "งานการเงินและบัญชี",
    "classLevel": "อนุบาล 3",
    "dutyDay": "-",
    "accessLevel": "User",
    "startDate": "2023-07-27",
    "email": "Sirinapaff1802@gmail.com",
    "phone": "093-263-8983",
    "maskedCitizenId": "1-1999-*****-**-3",
    "idCard": "1199900744923",
    "positionNo": "10356",
    "memberId": "1199900744923",
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
    "classLevel": "ประถมศึกษาปีที่ 1",
    "dutyDay": "-",
    "accessLevel": "User",
    "startDate": "2023-11-20",
    "email": "suthida.nooknook29@gmail.com",
    "phone": "098-194-4390",
    "maskedCitizenId": "1-3099-*****-**-1",
    "idCard": "1309902702711",
    "positionNo": "",
    "memberId": "1309902702711",
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
    "classLevel": "ประถมศึกษาปีที่ 2",
    "dutyDay": "-",
    "accessLevel": "User",
    "startDate": "2022-11-12",
    "email": "gielock7@gmail.com",
    "phone": "0870867389",
    "maskedCitizenId": "3-3014-*****-**-1",
    "idCard": "",
    "positionNo": "",
    "memberId": "",
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
    "classLevel": "อนุบาล 1",
    "dutyDay": "-",
    "accessLevel": "User",
    "startDate": "2022-11-13",
    "email": "kik123456@gmail.com",
    "phone": "094-478-1680",
    "maskedCitizenId": "3-3014-*****-**-1",
    "idCard": "",
    "positionNo": "",
    "memberId": "",
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
    "classLevel": "-",
    "dutyDay": "-",
    "accessLevel": "Admin",
    "startDate": "2022-11-14",
    "email": "uraiwan922@gmail.com",
    "phone": "083-382-5324",
    "maskedCitizenId": "3-3014-*****-**-1",
    "idCard": "",
    "positionNo": "",
    "memberId": "",
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
    "classLevel": "-",
    "dutyDay": "-",
    "accessLevel": "User",
    "startDate": "2026-10-23",
    "email": "",
    "phone": "098-736-8819",
    "maskedCitizenId": "3-3014-*****-**-1",
    "idCard": "",
    "positionNo": "",
    "memberId": "",
    "sickUsed": 0,
    "personalUsed": 0,
    "vacationUsed": 0,
    "licenses": [],
    "standings": [],
    "educations": []
  }
];

export const BOARD_STATUTORY_ORDER: Record<string, number> = {
  CHAIR: 1,
  PARENT_REP: 2,
  TEACHER_REP: 3,
  COMMUNITY_REP: 4,
  LOCAL_ADMIN: 5,
  ALUMNI_REP: 6,
  RELIGION_REP: 7,
  EXPERT: 8,
  DIRECTOR_SEC: 9,
};

export const INITIAL_BOARD_MEMBERS: BoardMemberRecord[] = [
  {
    "id": "SBD-001",
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
    "id": "SBD-002",
    "fullName": "นางปวิมล มะสิโกวา",
    "position": "PARENT_REP",
    "positionTitle": "ผู้แทนผู้ปกครอง",
    "occupation": "เกษตรกร",
    "organization": "ชุมชนบ้านตะขบ",
    "phone": "089-571-3342",
    "status": "ดำรงตำแหน่ง",
    "termNumber": 1
  },
  {
    "id": "SBD-003",
    "fullName": "นางณิชกานต์ พลอยฉิมพลี",
    "position": "TEACHER_REP",
    "positionTitle": "ผู้แทนครู",
    "occupation": "ครูชำนาญการพิเศษ",
    "organization": "โรงเรียนชุมชนบ้านตะขบ",
    "phone": "081-725-9258",
    "status": "ดำรงตำแหน่ง",
    "termNumber": 1
  },
  {
    "id": "SBD-004",
    "fullName": "นางสาวปฐมา ควรตะขบ",
    "position": "COMMUNITY_REP",
    "positionTitle": "ผู้แทนองค์กรชุมชน",
    "occupation": "ผู้นำชุมชน",
    "organization": "องค์กรชุมชนตำบลตะขบ",
    "phone": "084-332-1190",
    "status": "ดำรงตำแหน่ง",
    "termNumber": 1
  },
  {
    "id": "SBD-005",
    "fullName": "นางเกศรินทร์ ไชยหาญ",
    "position": "LOCAL_ADMIN",
    "positionTitle": "ผู้แทนองค์กรปกครองส่วนท้องถิ่น",
    "occupation": "เจ้าพนักงาน อปท.",
    "organization": "องค์การบริหารส่วนตำบลตะขบ",
    "phone": "087-991-4456",
    "status": "ดำรงตำแหน่ง",
    "termNumber": 1
  },
  {
    "id": "SBD-006",
    "fullName": "นางปัทมาพร ธงตะขบ",
    "position": "ALUMNI_REP",
    "positionTitle": "ผู้แทนศิษย์เก่า",
    "occupation": "ธุรกิจส่วนตัว",
    "organization": "ชมรมศิษย์เก่าโรงเรียนชุมชนบ้านตะขบ",
    "phone": "086-123-4567",
    "status": "ดำรงตำแหน่ง",
    "termNumber": 1
  },
  {
    "id": "SBD-007",
    "fullName": "พระครูธวัชชโยดม",
    "position": "RELIGION_REP",
    "positionTitle": "ผู้แทนพระภิกษุสงฆ์ / ศาสนา",
    "occupation": "เจ้าอาวาส / พระภิกษุสงฆ์",
    "organization": "วัดตะขบ",
    "phone": "-",
    "status": "ดำรงตำแหน่ง",
    "termNumber": 1
  },
  {
    "id": "SBD-008",
    "fullName": "นายสวัสดิ์ งามตะขบ",
    "position": "EXPERT",
    "positionTitle": "กรรมการผู้ทรงคุณวุฒิ",
    "occupation": "ข้าราชการบำนาญ",
    "organization": "ชุมชนบ้านตะขบ",
    "phone": "081-443-2211",
    "status": "ดำรงตำแหน่ง",
    "termNumber": 1
  },
  {
    "id": "SBD-009",
    "fullName": "นายธีรศักดิ์ มโนธรรม",
    "position": "DIRECTOR_SEC",
    "positionTitle": "กรรมการและเลขานุการ",
    "occupation": "ผู้อำนวยการสถานศึกษา",
    "organization": "โรงเรียนชุมชนบ้านตะขบ",
    "phone": "099-173-2233",
    "status": "ดำรงตำแหน่ง",
    "termNumber": 0
  }
];

export interface LeaveRequestRecord {
  id: string;
  docNo: string;
  teacherId: string;
  teacherName: string;
  position: string;
  department: string;
  leaveType: string;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  substituteTeacherName: string;
  status: 'pending' | 'supervisor_approved' | 'approved' | 'rejected';
  submittedAt: string;
  contactInfo?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  totalHours?: number | null;
  destination?: string | null;
  place?: string | null;
  workloadJson?: any;
  officialOrderNo?: string | null;
  hasWorkload?: 'มี' | 'ไม่มี' | null;
  workloads?: Array<{ cls?: string; period?: string; task?: string; sub?: string }> | null;
  supervisorRemark?: string;
  directorRemark?: string;
  currentStep: number;
}

export const INITIAL_LEAVE_REQUESTS: LeaveRequestRecord[] = [];

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

// ============================================================================
// WORKLOAD & PA TYPES & INITIAL ITEMS
// ============================================================================

export type WorkloadCategory =
  | 'งานสอนและการจัดการเรียนรู้'
  | 'งานบริหารและงานประจำฝ่าย/กลุ่มงาน'
  | 'งานโครงการ กิจกรรม และงานที่ได้รับมอบหมายพิเศษ'
  | 'งานดูแลช่วยเหลือนักเรียน งานครูที่ปรึกษา และเวรปฏิบัติหน้าที่';

export interface WorkloadItem {
  id: string;
  teacherId: string;
  category: WorkloadCategory;
  title: string;
  subGroupOrLevel?: string;
  hoursPerWeek: number;
  roleInTask: string;
  orderOrRef?: string;
  status: 'กำลังดำเนินการ' | 'เสร็จสิ้นแล้ว' | 'งานประจำต่อเนื่อง';
  coEmp?: string;
  courseCode?: string;
  type?: 'MAIN' | 'TA';
}

export const INITIAL_WORKLOAD_ITEMS: WorkloadItem[] = [
  {
    id: 'WL-001',
    teacherId: 'TCH-002',
    category: 'งานสอนและการจัดการเรียนรู้',
    title: 'ภาษาไทยพื้นฐาน',
    courseCode: 'ท15101',
    type: 'MAIN',
    subGroupOrLevel: 'ป.5/1',
    hoursPerWeek: 5,
    roleInTask: 'ผู้สอน',
    orderOrRef: 'คำสั่งที่ 12/2569',
    status: 'กำลังดำเนินการ',
  },
  {
    id: 'WL-002',
    teacherId: 'TCH-002',
    category: 'งานสอนและการจัดการเรียนรู้',
    title: 'ภาษาไทยเพิ่มเติม',
    courseCode: 'ท15201',
    type: 'MAIN',
    subGroupOrLevel: 'ป.5/2',
    hoursPerWeek: 4,
    roleInTask: 'ผู้สอน',
    orderOrRef: 'คำสั่งที่ 12/2569',
    status: 'กำลังดำเนินการ',
  },
  {
    id: 'WL-003',
    teacherId: 'TCH-002',
    category: 'งานสอนและการจัดการเรียนรู้',
    title: 'ผู้ช่วยสอน (TA) ทักษะภาษาและการอ่าน',
    type: 'TA',
    subGroupOrLevel: 'ป.4/1',
    hoursPerWeek: 3,
    roleInTask: 'ผู้ช่วยสอน',
    orderOrRef: 'คำสั่งที่ 15/2569',
    status: 'กำลังดำเนินการ',
  },
  {
    id: 'WL-004',
    teacherId: 'TCH-002',
    category: 'งานสอนและการจัดการเรียนรู้',
    title: 'กิจกรรมลูกเสือ - เนตรนารี',
    type: 'MAIN',
    subGroupOrLevel: 'ป.5',
    hoursPerWeek: 2,
    roleInTask: 'ผู้สอน',
    orderOrRef: 'คำสั่งที่ 18/2569',
    status: 'กำลังดำเนินการ',
  },
  {
    id: 'WL-005',
    teacherId: 'TCH-002',
    category: 'งานบริหารและงานประจำฝ่าย/กลุ่มงาน',
    title: 'งานบริหารวิชาการและเลขานุการฝ่าย',
    subGroupOrLevel: 'ฝ่ายบริหารวิชาการ',
    hoursPerWeek: 4,
    roleInTask: 'หัวหน้าฝ่าย',
    orderOrRef: 'คำสั่งที่ 05/2569',
    status: 'งานประจำต่อเนื่อง',
  },
  {
    id: 'WL-006',
    teacherId: 'TCH-002',
    category: 'งานโครงการ กิจกรรม และงานที่ได้รับมอบหมายพิเศษ',
    title: 'งานผู้รับผิดชอบโครงการตามแผนปฏิบัติการประจำปี',
    subGroupOrLevel: 'โครงการพัฒนาการอ่านออกเขียนได้',
    hoursPerWeek: 3,
    roleInTask: 'ผู้รับผิดชอบหลัก',
    orderOrRef: 'แผนปฏิบัติการ 2569',
    status: 'กำลังดำเนินการ',
  },
  {
    id: 'WL-007',
    teacherId: 'TCH-002',
    category: 'งานดูแลช่วยเหลือนักเรียน งานครูที่ปรึกษา และเวรปฏิบัติหน้าที่',
    title: 'งานครูประจำชั้น / ครูที่ปรึกษา',
    subGroupOrLevel: 'ประจำชั้น ป.5/1',
    hoursPerWeek: 3,
    roleInTask: 'ครูประจำชั้น',
    orderOrRef: 'คำสั่งที่ 07/2569',
    status: 'งานประจำต่อเนื่อง',
  },
  {
    id: 'WL-008',
    teacherId: 'TCH-002',
    category: 'งานดูแลช่วยเหลือนักเรียน งานครูที่ปรึกษา และเวรปฏิบัติหน้าที่',
    title: 'งานเวรประจำวัน / เวรหน้าประตูโรงเรียน',
    subGroupOrLevel: 'ตรวจเวรประจำวันอังคาร',
    hoursPerWeek: 2,
    roleInTask: 'ผู้ตรวจเวร',
    orderOrRef: 'คำสั่งที่ 08/2569',
    status: 'งานประจำต่อเนื่อง',
  },
  {
    id: 'WL-009',
    teacherId: 'TCH-003',
    category: 'งานสอนและการจัดการเรียนรู้',
    title: 'คณิตศาสตร์พื้นฐาน',
    courseCode: 'ค16101',
    type: 'MAIN',
    subGroupOrLevel: 'ป.6/1',
    hoursPerWeek: 5,
    roleInTask: 'ผู้สอน',
    orderOrRef: 'คำสั่งที่ 12/2569',
    status: 'กำลังดำเนินการ',
  },
  {
    id: 'WL-010',
    teacherId: 'TCH-003',
    category: 'งานสอนและการจัดการเรียนรู้',
    title: 'ผู้ช่วยสอน (TA) วิทยาการคำนวณ',
    type: 'TA',
    subGroupOrLevel: 'ม.1',
    hoursPerWeek: 4,
    roleInTask: 'ผู้ช่วยสอน',
    orderOrRef: 'คำสั่งที่ 15/2569',
    status: 'กำลังดำเนินการ',
  },
  {
    id: 'WL-011',
    teacherId: 'EXE-001',
    category: 'งานบริหารและงานประจำฝ่าย/กลุ่มงาน',
    title: 'งานบริหารสถานศึกษาและผู้อำนวยการสถานศึกษา',
    subGroupOrLevel: 'งานบริหาร 4 ฝ่าย',
    hoursPerWeek: 10,
    roleInTask: 'หัวหน้าสถานศึกษา',
    orderOrRef: 'พระราชบัญญัติระเบียบข้าราชการครูฯ',
    status: 'งานประจำต่อเนื่อง',
  }
];

// ============================================================================
// SYSTEM FEEDBACK TYPES
// ============================================================================

export interface FeedbackItem {
  id: string;
  category: 'bug' | 'feature' | 'inquiry';
  title: string;
  description: string;
  senderName: string;
  status: 'pending' | 'in_progress' | 'resolved';
  submittedAt: string;
  response?: string;
}

