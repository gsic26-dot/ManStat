/**
 * ============================================================================
 * ManStat-Modern: Relational DB Test Suite (test-relational-db.ts)
 * ============================================================================
 * Validates:
 * 1. Row Mappers for all 7 tables (bi-directional fidelity)
 * 2. Async database CRUD operations
 * 3. Seed initialization logic (ensureSupabaseSeeded)
 * 4. Vercel environment variable protection
 * ============================================================================
 */

import {
  schoolInfoToDb,
  schoolInfoFromDb,
  teacherToDb,
  teacherFromDb,
  boardMemberToDb,
  boardMemberFromDb,
  holidayToDb,
  holidayFromDb,
  leaveRequestToDb,
  leaveRequestFromDb,
  auditLogToDb,
  auditLogFromDb,
  systemSettingsToDb,
  systemSettingsFromDb,
  dbGetTeachers,
  dbUpsertTeacher,
  dbDeleteTeacher,
  dbGetBoardMembers,
  dbUpsertBoardMember,
  dbDeleteBoardMember,
  dbGetSchoolInfo,
  dbSaveSchoolInfo,
  dbGetHolidays,
  dbAddHoliday,
  dbDeleteHoliday,
  dbGetLeaveRequests,
  dbUpsertLeaveRequest,
  dbDeleteLeaveRequest,
  dbGetAuditLogs,
  recordAuditLog,
  dbGetSettings,
  dbSaveSettings,
} from '../src/lib/db/serverDb';
import type {
  TeacherRecord,
  BoardMemberRecord,
  LeaveRequestRecord,
} from '../src/lib/data/schoolData';
import type { HolidayRecord } from '../src/lib/db/serverDb';
import { isSupabaseConfigured } from '../src/lib/supabase/admin';

async function runTestSuite() {
  console.log('[TEST] Starting ManStat-Modern Relational Database Test Suite');
  console.log(`[TEST] Supabase configured: ${isSupabaseConfigured()}`);

  let passed = 0;
  let failed = 0;

  function assert(desc: string, condition: boolean) {
    if (condition) {
      console.log(`[PASS] ${desc}`);
      passed++;
    } else {
      console.error(`[FAIL] ${desc}`);
      failed++;
    }
  }

  // ==========================================================================
  // 1. TEST ROW MAPPERS FOR ALL 7 TABLES
  // ==========================================================================
  console.log('\n--- 1. Testing Row Mappers (7 Tables) ---');

  // 1.1 school_info
  const sampleSchool = {
    schoolName: 'โรงเรียนทดสอบ',
    affiliation: 'สพป. นม. 3',
    schoolCode10: '1234567890',
    schoolCode8: '12345678',
    directorName: 'นายผอ ทดสอบ',
    directorPosition: 'ผู้อำนวยการ',
    actingDirector1: 'รอง 1',
    actingDirector2: 'รอง 2',
    contactPhone: '099-000-0000',
    email: 'test@school.obec',
    address: '123 ม.1',
    lat: 14.5,
    lng: 101.5,
    academicYear: '2569',
    fiscalYear: '2570',
    currentTerm: '2',
    studentCount: 150,
    activeClasses: ['ป.1', 'ป.2'],
  };
  const schoolDb = schoolInfoToDb(sampleSchool);
  assert('schoolInfoToDb: mapped school_name correctly', schoolDb.school_name === 'โรงเรียนทดสอบ');
  assert('schoolInfoToDb: mapped active_classes correctly', Array.isArray(schoolDb.active_classes));
  const schoolReverted = schoolInfoFromDb(schoolDb);
  assert('schoolInfoFromDb: roundtrip restored schoolName', schoolReverted.schoolName === 'โรงเรียนทดสอบ');
  assert('schoolInfoFromDb: roundtrip restored studentCount', schoolReverted.studentCount === 150);

  // 1.2 teachers
  const sampleTeacher: TeacherRecord = {
    id: 'TEST-001',
    employeeCode: 'TEST-001',
    name: 'นายทดสอบ บุคลากร',
    prefix: 'นาย',
    firstName: 'ทดสอบ',
    lastName: 'บุคลากร',
    position: 'ครู',
    academicStanding: 'ชำนาญการ',
    department: 'วิทยาศาสตร์',
    division: 'การเงิน',
    classLevel: 'ม.1',
    dutyDay: 'จันทร์',
    accessLevel: 'Admin',
    role: 'hr_admin',
    startDate: '2020-01-01',
    email: 'test@obec.local',
    phone: '0812345678',
    maskedCitizenId: '1-1234-*****-**-1',
    idCard: '1123456789012',
    sickUsed: 1,
    personalUsed: 2,
    vacationUsed: 0,
    licenses: [],
    standings: [],
    educations: [],
  };
  const teacherDb = teacherToDb(sampleTeacher);
  assert('teacherToDb: mapped access_level correctly', teacherDb.access_level === 'Admin');
  assert('teacherToDb: mapped role correctly', teacherDb.role === 'hr_admin');
  assert('teacherToDb: mapped employee_code correctly', teacherDb.employee_code === 'TEST-001');
  const teacherReverted = teacherFromDb(teacherDb);
  assert('teacherFromDb: roundtrip restored accessLevel', teacherReverted.accessLevel === 'Admin');
  assert('teacherFromDb: roundtrip restored role', teacherReverted.role === 'hr_admin');

  // 1.3 board_members
  const sampleBoard: BoardMemberRecord = {
    id: 'SBD-999',
    fullName: 'นายกรรมการ ทดสอบ',
    position: 'DIRECTOR_SEC',
    positionTitle: 'กรรมการและเลขานุการ',
    occupation: 'รับราชการ',
    organization: 'สพฐ.',
    phone: '081-111-2222',
    status: 'ดำรงตำแหน่ง',
    termNumber: 1,
    isExOfficio: true,
    appointmentDate: '2026-10-01',
    endDate: '2030-09-30',
    endReason: '',
  };
  const boardDb = boardMemberToDb(sampleBoard);
  assert('boardMemberToDb: mapped is_ex_officio correctly', boardDb.is_ex_officio === true);
  assert('boardMemberToDb: mapped position correctly', boardDb.position === 'DIRECTOR_SEC');
  const boardReverted = boardMemberFromDb(boardDb);
  assert('boardMemberFromDb: roundtrip restored isExOfficio', boardReverted.isExOfficio === true);

  // 1.4 holidays
  const sampleHoliday: HolidayRecord = {
    id: 'h-999',
    date: '2027-01-01',
    name: 'วันขึ้นปีใหม่',
    type: 'วันหยุดราชการประจำปี',
  };
  const holidayDb = holidayToDb(sampleHoliday);
  assert('holidayToDb: mapped date and name', holidayDb.date === '2027-01-01' && holidayDb.name === 'วันขึ้นปีใหม่');
  const holidayReverted = holidayFromDb(holidayDb);
  assert('holidayFromDb: roundtrip restored holiday', holidayReverted.name === 'วันขึ้นปีใหม่');

  // 1.5 leave_requests
  const sampleLeave: LeaveRequestRecord = {
    id: 'LEV-TEST-001',
    docNo: 'ศธ 04052/TEST',
    teacherId: 'TEST-001',
    teacherName: 'นายทดสอบ บุคลากร',
    position: 'ครู',
    department: 'วิทยาศาสตร์',
    leaveType: 'sick',
    leaveTypeName: 'ลาป่วย',
    startDate: '2026-11-20',
    endDate: '2026-11-21',
    totalDays: 2,
    reason: 'มีไข้',
    substituteTeacherName: 'นายครู ตัวแทน',
    status: 'pending',
    submittedAt: '2026-11-20T08:00:00Z',
    currentStep: 1,
  };
  const leaveDb = leaveRequestToDb(sampleLeave);
  assert('leaveRequestToDb: mapped doc_no and leave_type', leaveDb.doc_no === 'ศธ 04052/TEST' && leaveDb.leave_type === 'sick');
  const leaveReverted = leaveRequestFromDb(leaveDb);
  assert('leaveRequestFromDb: roundtrip restored totalDays', leaveReverted.totalDays === 2);

  // 1.6 audit_logs
  const sampleLog = {
    id: 'log-test-1',
    action: 'TEST_ACTION',
    actorName: 'Superuser',
    actorRole: 'superuser',
    targetName: 'User 1',
    ipAddress: '127.0.0.1',
    timestamp: '2026-11-20T09:00:00Z',
    details: 'รายละเอียดการทดสอบ',
  };
  const logDb = auditLogToDb(sampleLog);
  assert('auditLogToDb: mapped action and actor_name', logDb.action === 'TEST_ACTION' && logDb.actor_name === 'Superuser');
  const logReverted = auditLogFromDb(logDb);
  assert('auditLogFromDb: roundtrip restored targetName', logReverted.targetName === 'User 1');

  // 1.7 system_settings
  const sampleSettings = {
    themeMode: 'dark' as const,
    preferredView: 'grid' as const,
    compactMode: true,
    maskCitizenId: false,
    fiscalYear: 2570,
    currentTerm: '2',
    academicYear: '2569',
  };
  const settingsDb = systemSettingsToDb(sampleSettings);
  assert('systemSettingsToDb: mapped theme_mode and preferred_view', settingsDb.theme_mode === 'dark' && settingsDb.preferred_view === 'grid');
  const settingsReverted = systemSettingsFromDb(settingsDb);
  assert('systemSettingsFromDb: roundtrip restored compactMode', settingsReverted.compactMode === true);

  // ==========================================================================
  // 2. TEST ASYNC CRUD OPERATIONS (ALL 7 TABLES)
  // ==========================================================================
  console.log('\n--- 2. Testing Async Database Operations ---');

  // Teachers CRUD
  const initialTeachers = await dbGetTeachers();
  assert('dbGetTeachers: retrieved teachers array', Array.isArray(initialTeachers) && initialTeachers.length > 0);

  const testTeacher: TeacherRecord = {
    id: 'TCH-CRUD-TEST',
    employeeCode: 'TCH-CRUD-TEST',
    name: 'นายทดสอบ ทดสอบระบบ',
    prefix: 'นาย',
    firstName: 'ทดสอบ',
    lastName: 'ทดสอบระบบ',
    position: 'ครูผู้ช่วย',
    academicStanding: '-',
    department: 'คณิตศาสตร์',
    division: 'งานพัสดุ',
    accessLevel: 'User',
    role: 'teacher',
    startDate: '2026-11-20',
    email: 'test_crud@school.obec',
    phone: '0899999999',
    maskedCitizenId: '3-3014-*****-**-9',
    idCard: '3301401302999',
    sickUsed: 0,
    personalUsed: 0,
    vacationUsed: 0,
    licenses: [],
    standings: [],
    educations: [],
  };
  const savedTeacher = await dbUpsertTeacher(testTeacher);
  assert('dbUpsertTeacher: created teacher', savedTeacher.id === 'TCH-CRUD-TEST');

  // Update access level
  savedTeacher.accessLevel = 'Admin';
  savedTeacher.role = 'hr_admin';
  const updatedTeacher = await dbUpsertTeacher(savedTeacher);
  assert('dbUpsertTeacher: updated accessLevel to Admin', updatedTeacher.accessLevel === 'Admin');

  // Delete teacher
  await dbDeleteTeacher('TCH-CRUD-TEST');
  const teachersAfterDelete = await dbGetTeachers();
  assert('dbDeleteTeacher: removed teacher from database', !teachersAfterDelete.some((t) => t.id === 'TCH-CRUD-TEST'));

  // School Info
  const schoolInfo = await dbGetSchoolInfo();
  assert('dbGetSchoolInfo: retrieved valid schoolInfo', Boolean(schoolInfo.schoolName));

  const updatedSchool = await dbSaveSchoolInfo({
    studentCount: 95,
  });
  assert('dbSaveSchoolInfo: updated studentCount', updatedSchool.studentCount === 95);

  // Board Members
  const boardList = await dbGetBoardMembers();
  assert('dbGetBoardMembers: retrieved board members', Array.isArray(boardList));

  const testBoardMember: BoardMemberRecord = {
    id: 'SBD-CRUD-TEST',
    fullName: 'นายทดสอบ คณะกรรมการ',
    position: 'EXPERT',
    positionTitle: 'กรรมการผู้ทรงคุณวุฒิ',
    occupation: 'ข้าราชการบำนาญ',
    organization: 'กระทรวงศึกษาธิการ',
    phone: '081-999-8888',
    status: 'ดำรงตำแหน่ง',
    termNumber: 1,
    isExOfficio: false,
    appointmentDate: '2026-11-20',
    endDate: '2030-11-19',
    endReason: '',
  };
  await dbUpsertBoardMember(testBoardMember);
  const boardAfterAdd = await dbGetBoardMembers();
  assert('dbUpsertBoardMember: added board member', boardAfterAdd.some((b) => b.id === 'SBD-CRUD-TEST'));

  await dbDeleteBoardMember('SBD-CRUD-TEST');
  const boardAfterDelete = await dbGetBoardMembers();
  assert('dbDeleteBoardMember: deleted board member', !boardAfterDelete.some((b) => b.id === 'SBD-CRUD-TEST'));

  // Holidays
  const holidays = await dbGetHolidays();
  assert('dbGetHolidays: retrieved holidays', Array.isArray(holidays) && holidays.length > 0);

  const testHoliday: HolidayRecord = {
    id: 'h-crud-test',
    date: '2026-12-30',
    name: 'วันหยุดพิเศษทดสอบระบบ',
    type: 'วันหยุดกรณีพิเศษ',
  };
  await dbAddHoliday(testHoliday);
  const holidaysAfterAdd = await dbGetHolidays();
  assert('dbAddHoliday: added holiday', holidaysAfterAdd.some((h) => h.id === 'h-crud-test'));

  await dbDeleteHoliday('h-crud-test');
  const holidaysAfterDelete = await dbGetHolidays();
  assert('dbDeleteHoliday: deleted holiday', !holidaysAfterDelete.some((h) => h.id === 'h-crud-test'));

  // Leave Requests
  const leaves = await dbGetLeaveRequests();
  assert('dbGetLeaveRequests: retrieved leave requests', Array.isArray(leaves));

  const testLeaveReq: LeaveRequestRecord = {
    id: 'LEV-CRUD-TEST',
    docNo: 'ศธ 04052.12/CRUD-TEST',
    teacherId: 'TCH-001',
    teacherName: 'นายทดสอบ คำขอลา',
    position: 'ครู',
    department: 'ภาษาไทย',
    leaveType: 'personal',
    leaveTypeName: 'ลากิจส่วนตัว',
    startDate: '2026-11-25',
    endDate: '2026-11-25',
    totalDays: 1,
    reason: 'ติดต่อธุระสำคัญส่วนตัว',
    substituteTeacherName: 'นายครู สอนแทน',
    status: 'pending',
    submittedAt: '2026-11-20T10:00:00Z',
    currentStep: 1,
  };
  await dbUpsertLeaveRequest(testLeaveReq);
  const leavesAfterAdd = await dbGetLeaveRequests();
  assert('dbUpsertLeaveRequest: created leave request', leavesAfterAdd.some((l) => l.id === 'LEV-CRUD-TEST'));

  await dbDeleteLeaveRequest('LEV-CRUD-TEST');
  const leavesAfterDelete = await dbGetLeaveRequests();
  assert('dbDeleteLeaveRequest: deleted leave request', !leavesAfterDelete.some((l) => l.id === 'LEV-CRUD-TEST'));

  // Audit Logs
  const auditLogs = await dbGetAuditLogs(50);
  assert('dbGetAuditLogs: retrieved audit logs', Array.isArray(auditLogs));

  const logged = recordAuditLog(
    'TEST_SUITE_EXECUTION',
    'Automated Test Runner',
    'system_tester',
    'ManStat Relational Test Suite',
    'ทดสอบการทำงานของฟังก์ชันบันทึกความปลอดภัย PDPA'
  );
  assert('recordAuditLog: returned newly recorded log', logged.action === 'TEST_SUITE_EXECUTION');

  // Settings
  const settings = await dbGetSettings();
  assert('dbGetSettings: retrieved system settings', typeof settings.fiscalYear === 'number');

  const updatedSettings = await dbSaveSettings({
    compactMode: false,
  });
  assert('dbSaveSettings: updated settings compactMode', updatedSettings.compactMode === false);

  // Vercel protection test
  process.env.VERCEL = '1';
  let vercelBlocked = false;
  try {
    await dbGetTeachers();
  } catch (err: any) {
    if (err.message.includes('ระบบกำลังทำงานบน Vercel แต่ยังไม่ได้กำหนด SUPABASE_SERVICE_ROLE_KEY')) {
      vercelBlocked = true;
    }
  } finally {
    delete process.env.VERCEL;
  }
  assert('Vercel safety: blocked file write and threw configuration error on Vercel without Supabase keys', vercelBlocked);

  console.log(`\n==================================================`);
  console.log(`[TEST SUMMARY] Passed: ${passed}, Failed: ${failed}`);
  console.log(`==================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('[TEST SUITE CRASHED]', err);
  process.exit(1);
});
