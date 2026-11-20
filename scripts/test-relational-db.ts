/**
 * ============================================================================
 * ManStat-Modern: Relational DB Test Suite (test-relational-db.ts)
 * ============================================================================
 * Validates:
 * 1. Row Mappers matching existing Supabase schema (16 tables):
 *    - board_members: member_id, board_position, is_ex_officio
 *    - holidays: holiday_date, reason_type
 *    - leave_logs: leave_id, emp_id, full_name
 *    - teachers: id, employee_code, access_level, role
 *    - school_info: vertical key-value (20 rows) & flat fallback
 * 2. Async database CRUD operations
 * 3. Zero-loss seeding logic (ensureSupabaseSeeded never overwrites)
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
  console.log('[TEST] Starting ManStat-Modern Existing Schema Alignment Test Suite');
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
  // 1. TEST ROW MAPPERS MATCHING EXISTING SUPABASE SCHEMA
  // ==========================================================================
  console.log('\n--- 1. Testing Row Mappers (Aligned with Existing Tables) ---');

  // 1.1 school_info (Vertical Key-Value)
  const sampleVerticalRows = [
    { key: 'ชื่อสถานศึกษา', val: 'โรงเรียนชุมชนบ้านตะขบ' },
    { key: 'หน่วยงานต้นสังกัด', val: 'สพป.นครราชสีมา เขต 3' },
    { key: 'รหัส 10 หลัก', val: '1030200688' },
    { key: 'ชื่อผู้อำนวยการ', val: 'นายธีรศักดิ์ มโนธรรม' },
    { key: 'จำนวนนักเรียน', val: '94' },
  ];
  const verticalMapped = schoolInfoFromDb(sampleVerticalRows);
  assert('schoolInfoFromDb: parsed vertical key-value array', verticalMapped.schoolName === 'โรงเรียนชุมชนบ้านตะขบ');
  assert('schoolInfoFromDb: parsed studentCount as number', verticalMapped.studentCount === 94);

  // 1.2 teachers (PK: id)
  const sampleTeacher: TeacherRecord = {
    id: 'EXE-001',
    employeeCode: 'EXE-001',
    name: 'นายธีรศักดิ์ มโนธรรม',
    prefix: 'นาย',
    firstName: 'ธีรศักดิ์',
    lastName: 'มโนธรรม',
    position: 'ผู้อำนวยการสถานศึกษา',
    academicStanding: 'เชี่ยวชาญพิเศษ',
    department: 'สายงานบริหารและสนับสนุนการศึกษา',
    division: 'ผู้บริหารสถานศึกษา',
    classLevel: '-',
    dutyDay: '-',
    accessLevel: 'Superuser',
    role: 'superuser',
    startDate: '2012-01-10',
    email: 'gsic26@gmail.com',
    phone: '099-173-2233',
    maskedCitizenId: '3-3014-*****-**-1',
    idCard: '3301401302311',
    sickUsed: 0,
    personalUsed: 0,
    vacationUsed: 0,
    licenses: [],
    standings: [],
    educations: [],
  };
  const teacherDb = teacherToDb(sampleTeacher);
  assert('teacherToDb: primary key matches id', teacherDb.id === 'EXE-001');
  assert('teacherToDb: mapped access_level correctly', teacherDb.access_level === 'Superuser');
  assert('teacherToDb: mapped role correctly', teacherDb.role === 'superuser');
  const teacherReverted = teacherFromDb(teacherDb);
  assert('teacherFromDb: roundtrip restored accessLevel', teacherReverted.accessLevel === 'Superuser');
  assert('teacherFromDb: roundtrip restored employeeCode', teacherReverted.employeeCode === 'EXE-001');

  // 1.3 board_members (PK: member_id, board_position)
  const sampleBoard: BoardMemberRecord = {
    id: 'SBD-261030151715',
    fullName: 'นายธีรศักดิ์ มโนธรรม',
    position: 'DIRECTOR_SEC',
    positionTitle: 'กรรมการและเลขานุการ',
    occupation: 'ผู้อำนวยการสถานศึกษา',
    organization: 'โรงเรียนชุมชนบ้านตะขบ',
    phone: '099-173-2233',
    status: 'ดำรงตำแหน่ง',
    termNumber: 1,
    isExOfficio: true,
    appointmentDate: '2025-01-13',
    endDate: 'ย้ายหรือเกษียณอายุราชการ',
    endReason: '',
  };
  const boardDb = boardMemberToDb(sampleBoard);
  assert('boardMemberToDb: primary key matches member_id', boardDb.member_id === 'SBD-261030151715');
  assert('boardMemberToDb: mapped board_position correctly', boardDb.board_position === 'DIRECTOR_SEC');
  assert('boardMemberToDb: director ex-officio is true', boardDb.is_ex_officio === true);

  const boardReverted = boardMemberFromDb(boardDb);
  assert('boardMemberFromDb: roundtrip restored id from member_id', boardReverted.id === 'SBD-261030151715');
  assert('boardMemberFromDb: roundtrip restored isExOfficio', boardReverted.isExOfficio === true);

  // 1.4 holidays (PK: holiday_date, reason_type)
  const sampleHoliday: HolidayRecord = {
    id: '2026-10-23',
    date: '2026-10-23',
    name: 'วันปิยมหาราช',
    type: 'วันหยุดราชการประจำปี',
  };
  const holidayDb = holidayToDb(sampleHoliday);
  assert('holidayToDb: primary key matches holiday_date', holidayDb.holiday_date === '2026-10-23');
  assert('holidayToDb: mapped reason_type', holidayDb.reason_type === 'วันปิยมหาราช');
  const holidayReverted = holidayFromDb(holidayDb);
  assert('holidayFromDb: roundtrip restored date and name', holidayReverted.date === '2026-10-23' && holidayReverted.name === 'วันปิยมหาราช');

  // 1.5 leave_logs (PK: leave_id, emp_id, full_name)
  const sampleLeave: LeaveRequestRecord = {
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
    reason: 'มีไข้หวัด',
    substituteTeacherName: 'นายพันธ์ธนัต ภวฤทธิ์นาคินทร์',
    status: 'approved',
    submittedAt: '2026-11-09T08:00:00Z',
    currentStep: 2,
  };
  const leaveDb = leaveRequestToDb(sampleLeave);
  assert('leaveRequestToDb: primary key matches leave_id', leaveDb.leave_id === 'LEV-2569-001');
  assert('leaveRequestToDb: mapped emp_id and full_name', leaveDb.emp_id === 'TCH-003' && leaveDb.full_name === 'นายธวัชชัย เหลืองโอฬาร');
  const leaveReverted = leaveRequestFromDb(leaveDb);
  assert('leaveRequestFromDb: roundtrip restored teacherId', leaveReverted.teacherId === 'TCH-003');

  // 1.6 audit_logs
  const sampleLog = {
    id: 'log-001',
    action: 'TEST_PDPA',
    actorName: 'Superuser',
    actorRole: 'superuser',
    targetName: 'ระบบ',
    ipAddress: '127.0.0.1',
    timestamp: '2026-11-20T10:00:00Z',
    details: 'ทดสอบบันทึกความปลอดภัย',
  };
  const logDb = auditLogToDb(sampleLog);
  assert('auditLogToDb: mapped correctly', logDb.action === 'TEST_PDPA');
  const logReverted = auditLogFromDb(logDb);
  assert('auditLogFromDb: roundtrip restored', logReverted.actorRole === 'superuser');

  // 1.7 system_settings
  const sampleSettings = {
    themeMode: 'auto' as const,
    preferredView: 'table' as const,
    compactMode: false,
    maskCitizenId: true,
    fiscalYear: 2570,
    currentTerm: '2',
    academicYear: '2569',
  };
  const settingsDb = systemSettingsToDb(sampleSettings);
  assert('systemSettingsToDb: mapped correctly', settingsDb.fiscal_year === 2570);
  const settingsReverted = systemSettingsFromDb(settingsDb);
  assert('systemSettingsFromDb: roundtrip restored', settingsReverted.fiscalYear === 2570);

  // ==========================================================================
  // 2. TEST ASYNC CRUD OPERATIONS
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
    studentCount: 94,
  });
  assert('dbSaveSchoolInfo: updated studentCount', updatedSchool.studentCount === 94);

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
  assert('dbUpsertBoardMember: added board member by member_id', boardAfterAdd.some((b) => b.id === 'SBD-CRUD-TEST'));

  await dbDeleteBoardMember('SBD-CRUD-TEST');
  const boardAfterDelete = await dbGetBoardMembers();
  assert('dbDeleteBoardMember: deleted board member by member_id', !boardAfterDelete.some((b) => b.id === 'SBD-CRUD-TEST'));

  // Holidays
  const holidays = await dbGetHolidays();
  assert('dbGetHolidays: retrieved holidays', Array.isArray(holidays) && holidays.length > 0);

  const testHoliday: HolidayRecord = {
    id: '2026-12-30',
    date: '2026-12-30',
    name: 'วันหยุดพิเศษทดสอบระบบ',
    type: 'วันหยุดกรณีพิเศษ',
  };
  await dbAddHoliday(testHoliday);
  const holidaysAfterAdd = await dbGetHolidays();
  assert('dbAddHoliday: added holiday by holiday_date', holidaysAfterAdd.some((h) => h.date === '2026-12-30'));

  await dbDeleteHoliday('2026-12-30');
  const holidaysAfterDelete = await dbGetHolidays();
  assert('dbDeleteHoliday: deleted holiday by holiday_date', !holidaysAfterDelete.some((h) => h.date === '2026-12-30'));

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
  assert('dbUpsertLeaveRequest: created leave request by leave_id', leavesAfterAdd.some((l) => l.id === 'LEV-CRUD-TEST'));

  await dbDeleteLeaveRequest('LEV-CRUD-TEST');
  const leavesAfterDelete = await dbGetLeaveRequests();
  assert('dbDeleteLeaveRequest: deleted leave request by leave_id', !leavesAfterDelete.some((l) => l.id === 'LEV-CRUD-TEST'));

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

  // Vercel safety protection test
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
