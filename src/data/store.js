/**
 * =========================================================================
 * MANSTAT MODERN - PURE JAVASCRIPT PERSISTENCE STORE (store.js)
 * =========================================================================
 * Robust, zero-dependency, JSON-file-backed data store.
 * Fully compatible with Vercel Serverless (read-only filesystem safe).
 * =========================================================================
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

// In Serverless (Vercel / AWS Lambda), the deployment root is read-only.
// Only os.tmpdir() (/tmp) is writable.
const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT);
const dataDir = isServerless ? os.tmpdir() : path.join(__dirname, '../../data');
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
      password: 'sha256$a1b2c3d4e5f67890$4b5be9f5f054aa62af0c63019b93c47284df267a970edcb6b0f8f15a263f713c',
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
      password: 'sha256$a1b2c3d4e5f67890$4b5be9f5f054aa62af0c63019b93c47284df267a970edcb6b0f8f15a263f713c',
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
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  } catch (err) {
    // Read-only filesystem warning
    console.warn('[Store Warning] Directory creation skipped/failed:', err.message);
  }
}

function loadDatabase() {
  if (inMemoryDb) return inMemoryDb;
  
  try {
    ensureDataDirectory();
    if (fs.existsSync(dbFilePath)) {
      const raw = fs.readFileSync(dbFilePath, 'utf8');
      inMemoryDb = JSON.parse(raw);
      return inMemoryDb;
    }
  } catch (e) {
    console.warn('[Store Notice] Read/init db file fallback:', e.message);
  }

  inMemoryDb = JSON.parse(JSON.stringify(defaultDatabase));
  saveDatabase();
  return inMemoryDb;
}

function saveDatabase() {
  if (!inMemoryDb) inMemoryDb = JSON.parse(JSON.stringify(defaultDatabase));
  try {
    ensureDataDirectory();
    fs.writeFileSync(dbFilePath, JSON.stringify(inMemoryDb, null, 2), 'utf8');
  } catch (err) {
    console.warn('[Store Notice] Disk write skipped in serverless/read-only environment:', err.message);
  }
}

function getDatabase() {
  return loadDatabase();
}

module.exports = {
  getDatabase,
  saveDatabase
};
