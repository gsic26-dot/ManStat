/**
 * =========================================================================
 * MANSTAT MODERN - PURE JAVASCRIPT PERSISTENCE STORE (store.js)
 * =========================================================================
 * Robust, zero-dependency, JSON-file-backed data store.
 * Fully compatible with Windows Application Control (Zero C++ .node binaries).
 * Seamlessly migratable to Supabase / PostgreSQL in Cloud Deployment.
 * =========================================================================
 */
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../../data');
const dbFilePath = path.join(dataDir, 'manstat_db.json');

// Initial baseline template if db does not exist yet
const defaultDatabase = {
  schoolInfo: {
    schoolName: 'โรงเรียนมโนธรรมวิทยาคาร',
    schoolCode10: '1030010001',
    schoolCode8: '30010001',
    directorName: 'นายธีรศักดิ์ มโนธรรม',
    contactPhone: '044-123456',
    address: 'ต.ในเมือง อ.เมือง จ.นครราชสีมา 30000',
    fiscalYear: '2570',
    logoBase64: ''
  },
  activeClasses: [
    'มัธยมศึกษาปีที่ 1',
    'มัธยมศึกษาปีที่ 2',
    'มัธยมศึกษาปีที่ 3',
    'มัธยมศึกษาปีที่ 4',
    'มัธยมศึกษาปีที่ 5',
    'มัธยมศึกษาปีที่ 6'
  ],
  fiscalData: {
    active: {
      yearBE: 2570,
      yearCE: 2027,
      periodMode: 'PERIOD_1',
      status: 'Active',
      updatedAt: '2026-11-14 19:00:00'
    },
    all: [
      {
        yearBE: 2570,
        yearCE: 2027,
        periodMode: 'PERIOD_1',
        status: 'Active',
        updatedAt: '2026-11-14 19:00:00'
      },
      {
        yearBE: 2569,
        yearCE: 2026,
        periodMode: 'FULL',
        status: 'Inactive',
        updatedAt: '2025-10-01 08:00:00'
      }
    ]
  },
  teachers: [
    {
      id: 'EXE-001',
      EmpID: 'EXE-001',
      rowNumber: 2,
      positionNo: '10001',
      PositionNo: '10001',
      memberId: '10001',
      MemberID: '10001',
      name: 'นายธีรศักดิ์ มโนธรรม',
      FullName: 'นายธีรศักดิ์ มโนธรรม',
      email: 'director@school.ac.th',
      phone: '081-234-5678',
      classLevel: '',
      role: 'ผู้อำนวยการสถานศึกษา',
      Position: 'ผู้อำนวยการสถานศึกษา',
      dutyDay: 'จันทร์',
      password: 'sha256$a1b2c3d4e5f67890$c733e45e381a93bce9d310a83bc85acf992d412b62739137ff5c0dd20c19a6a3',
      isPasswordHashed: true,
      accessLevel: 'Superuser',
      status: 'ปกติ',
      startDate: '2015-05-16',
      department: 'บริหารสถานศึกษา',
      division: 'ผู้บริหารสถานศึกษา',
      empType: 'ข้าราชการครูและบุคลากรทางการศึกษา',
      idCard: '1309900123456',
      IDCardMasked: '1-3099-*****-**-6',
      SickCount: 0,
      SickDays: 0,
      SickMax: 60,
      PersonalCount: 0,
      PersonalDays: 0,
      PersonalMax: 45,
      PermitCount: 0,
      PermitHours: 0,
      ActiveLicenses: [],
      StandingsHistory: [],
      EducationsHistory: [],
      ScoutsHistory: [],
      TimelineEvents: []
    },
    {
      id: 'TCH-001',
      EmpID: 'TCH-001',
      rowNumber: 3,
      positionNo: '20001',
      PositionNo: '20001',
      memberId: '20001',
      MemberID: '20001',
      name: 'นางสาวสมใจ นามสมมุติ',
      FullName: 'นางสาวสมใจ นามสมมุติ',
      email: 'somjai@school.ac.th',
      phone: '089-876-5432',
      classLevel: 'มัธยมศึกษาปีที่ 1/1',
      role: 'ครู ชำนาญการพิเศษ',
      Position: 'ครู ชำนาญการพิเศษ',
      dutyDay: 'อังคาร',
      password: 'sha256$a1b2c3d4e5f67890$c733e45e381a93bce9d310a83bc85acf992d412b62739137ff5c0dd20c19a6a3',
      isPasswordHashed: true,
      accessLevel: 'Admin',
      status: 'ปกติ',
      startDate: '2018-10-01',
      department: 'ภาษาไทย',
      division: 'ฝ่ายบริหารงานบุคคล',
      empType: 'ข้าราชการครูและบุคลากรทางการศึกษา',
      idCard: '3309900987654',
      IDCardMasked: '3-3099-*****-**-4',
      SickCount: 1,
      SickDays: 1,
      SickMax: 60,
      PersonalCount: 0,
      PersonalDays: 0,
      PersonalMax: 45,
      PermitCount: 0,
      PermitHours: 0,
      ActiveLicenses: [],
      StandingsHistory: [],
      EducationsHistory: [],
      ScoutsHistory: [],
      TimelineEvents: []
    }
  ],
  logs: [
    {
      leaveId: 'LV-1731600000000',
      empId: 'TCH-001',
      fullName: 'นางสาวสมใจ นามสมมุติ',
      leaveType: 'ลาป่วย',
      startDate: '2026-11-10',
      endDate: '2026-11-10',
      startTime: '-',
      endTime: '-',
      totalDays: 1,
      totalHours: 0,
      reason: 'มีอาการไข้หวัด ปวดศีรษะ',
      substituteInfo: 'ไม่มีคาบสอน',
      attachUrl: '-',
      status: 'อนุมัติ',
      stepHr: 'อนุมัติแล้ว',
      stepAcademic: 'อนุมัติแล้ว',
      stepDirector: 'อนุมัติแล้ว',
      signerName: 'นายธีรศักดิ์ มโนธรรม',
      formMetaJson: '',
      timestamp: '10/11/2569 08:30:00'
    }
  ],
  feedbacks: [],
  workloads: [],
  boardMembers: [],
  boardMeetings: []
};

let inMemoryDb = null;

function ensureDataDirectory() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function loadDatabase() {
  if (inMemoryDb) return inMemoryDb;
  ensureDataDirectory();
  if (fs.existsSync(dbFilePath)) {
    try {
      const raw = fs.readFileSync(dbFilePath, 'utf8');
      inMemoryDb = JSON.parse(raw);
      return inMemoryDb;
    } catch (e) {
      console.error('[Store Error] Failed to parse db file, initializing default:', e);
    }
  }
  inMemoryDb = JSON.parse(JSON.stringify(defaultDatabase));
  saveDatabase();
  return inMemoryDb;
}

function saveDatabase() {
  ensureDataDirectory();
  if (!inMemoryDb) inMemoryDb = JSON.parse(JSON.stringify(defaultDatabase));
  fs.writeFileSync(dbFilePath, JSON.stringify(inMemoryDb, null, 2), 'utf8');
}

function getDatabase() {
  return loadDatabase();
}

module.exports = {
  getDatabase,
  saveDatabase
};
