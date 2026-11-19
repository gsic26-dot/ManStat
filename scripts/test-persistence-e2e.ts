import { loadDatabase, saveDatabase, recordAuditLog } from '../src/lib/db/serverDb';
import fs from 'fs';
import path from 'path';

async function runTest() {
  console.log('--- START PERSISTENCE E2E TEST ---');

  // 1. Initial State
  const initialDb = loadDatabase();
  console.log('1. Initial DB loaded:');
  console.log(`   Teachers: ${initialDb.teachers.length}`);
  console.log(`   Board Members: ${initialDb.boardMembers.length}`);
  console.log(`   Holidays: ${initialDb.holidays.length}`);
  console.log(`   Audit Logs: ${initialDb.auditLogs.length}`);
  console.log(`   School Name: "${initialDb.schoolInfo.schoolName}"`);

  // 2. Staff Mutation
  console.log('\n2. Testing Staff Update & Audit Log...');
  const targetTeacher = initialDb.teachers[1];
  const oldStanding = targetTeacher.academicStanding;
  const updatedTeacher = {
    ...targetTeacher,
    academicStanding: 'ครูชำนาญการพิเศษ (คศ. 3)',
    accessLevel: 'Admin' as const,
    position: 'ครู',
  };
  
  // Upsert
  const dbAfterStaff = loadDatabase();
  const idx = dbAfterStaff.teachers.findIndex(t => t.id === targetTeacher.id);
  dbAfterStaff.teachers[idx] = updatedTeacher as any;
  saveDatabase(dbAfterStaff);
  recordAuditLog(
    'UPDATE_STAFF',
    'Superuser (ทดสอบ)',
    'superuser',
    targetTeacher.name,
    `อัปเดตข้อมูลบุคลากร: รหัส ${targetTeacher.employeeCode} เปลี่ยนวิทยฐานะจาก "${oldStanding}" เป็น "${updatedTeacher.academicStanding}"`
  );

  // Directly inspect JSON file from disk to ensure zero-in-memory-illusion
  const diskRaw1 = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', 'manstat_db.json'), 'utf8'));
  const diskTeacher = diskRaw1.teachers.find((t: any) => t.id === targetTeacher.id);
  if (diskTeacher?.academicStanding !== 'ครูชำนาญการพิเศษ (คศ. 3)' || diskTeacher?.accessLevel !== 'Admin') {
    throw new Error('Staff update failed to persist to disk JSON!');
  }
  console.log('   [SUCCESS] Staff persisted directly to manstat_db.json: academicStanding & accessLevel verified.');

  // Reset back to original state
  dbAfterStaff.teachers[idx] = targetTeacher;
  saveDatabase(dbAfterStaff);

  // 3. School Board Mutation
  console.log('\n3. Testing Board Member Add & Delete...');
  const newMember = {
    id: 'BM-TEST-999',
    fullName: 'นายทดสอบ ความคงอยู่ข้อมูล',
    position: 'กรรมการผู้ทรงคุณวุฒิ',
    positionTitle: 'ผู้ทรงคุณวุฒิด้านการศึกษา',
    occupation: 'ข้าราชการบำนาญ',
    organization: 'กระทรวงศึกษาธิการ',
    phone: '081-999-9999',
    status: 'ดำรงตำแหน่ง',
    termNumber: 1,
  };
  const dbBoard = loadDatabase();
  dbBoard.boardMembers.push(newMember);
  saveDatabase(dbBoard);
  recordAuditLog(
    'ADD_BOARD_MEMBER',
    'Superuser (ทดสอบ)',
    'superuser',
    newMember.fullName,
    `เพิ่มรายชื่อคณะกรรมการสถานศึกษา: ตำแหน่ง ${newMember.position}`
  );

  let diskRaw2 = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', 'manstat_db.json'), 'utf8'));
  if (!diskRaw2.boardMembers.some((b: any) => b.id === 'BM-TEST-999')) {
    throw new Error('Board member add failed to persist to disk JSON!');
  }
  console.log('   [SUCCESS] Board member add persisted to disk.');

  // Now delete the test member
  const dbBoardDelete = loadDatabase();
  dbBoardDelete.boardMembers = dbBoardDelete.boardMembers.filter(b => b.id !== 'BM-TEST-999');
  saveDatabase(dbBoardDelete);
  recordAuditLog(
    'DELETE_BOARD_MEMBER',
    'Superuser (ทดสอบ)',
    'superuser',
    newMember.fullName,
    `ลบรายชื่อคณะกรรมการสถานศึกษา รหัส BM-TEST-999`
  );

  diskRaw2 = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', 'manstat_db.json'), 'utf8'));
  if (diskRaw2.boardMembers.some((b: any) => b.id === 'BM-TEST-999')) {
    throw new Error('Board member delete failed to persist to disk JSON!');
  }
  console.log('   [SUCCESS] Board member delete persisted to disk.');

  // 4. School Profile Mutation
  console.log('\n4. Testing School Profile Update...');
  const dbSchool = loadDatabase();
  const originalDirector = dbSchool.schoolInfo.directorName;
  dbSchool.schoolInfo.directorName = 'นายสุภาพ ดีเลิศ (อัปเดตผู้อำนวยการ)';
  saveDatabase(dbSchool);
  recordAuditLog(
    'UPDATE_SCHOOL_INFO',
    'Superuser (ทดสอบ)',
    'superuser',
    dbSchool.schoolInfo.schoolName,
    `อัปเดตข้อมูลสถานศึกษา: เปลี่ยนชื่อผู้อำนวยการเป็น นายสุภาพ ดีเลิศ (อัปเดตผู้อำนวยการ)`
  );

  const diskRaw3 = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', 'manstat_db.json'), 'utf8'));
  if (diskRaw3.schoolInfo.directorName !== 'นายสุภาพ ดีเลิศ (อัปเดตผู้อำนวยการ)') {
    throw new Error('School profile update failed to persist to disk JSON!');
  }
  console.log('   [SUCCESS] School profile update persisted to disk.');

  // 5. Holidays Mutation
  console.log('\n5. Testing Holidays Add & Delete...');
  const newHoliday = {
    id: 'h-test-999',
    name: 'วันสถาปนาสถานศึกษา ManStat',
    date: '2026-12-31',
    type: 'วันหยุดพิเศษ',
  };
  const dbHolidays = loadDatabase();
  dbHolidays.holidays.push(newHoliday);
  saveDatabase(dbHolidays);
  recordAuditLog(
    'ADD_HOLIDAY',
    'Superuser (ทดสอบ)',
    'superuser',
    newHoliday.name,
    `เพิ่มวันหยุดราชการ/สถานศึกษา: วันที่ ${newHoliday.date}`
  );

  let diskRaw4 = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', 'manstat_db.json'), 'utf8'));
  if (!diskRaw4.holidays.some((h: any) => h.id === 'h-test-999')) {
    throw new Error('Holiday add failed to persist to disk JSON!');
  }
  console.log('   [SUCCESS] Holiday add persisted to disk.');

  // Delete test holiday
  const dbHolidaysDelete = loadDatabase();
  dbHolidaysDelete.holidays = dbHolidaysDelete.holidays.filter(h => h.id !== 'h-test-999');
  saveDatabase(dbHolidaysDelete);
  recordAuditLog(
    'DELETE_HOLIDAY',
    'Superuser (ทดสอบ)',
    'superuser',
    newHoliday.name,
    `ลบวันหยุดสถานศึกษา รหัส h-test-999`
  );

  diskRaw4 = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', 'manstat_db.json'), 'utf8'));
  if (diskRaw4.holidays.some((h: any) => h.id === 'h-test-999')) {
    throw new Error('Holiday delete failed to persist to disk JSON!');
  }
  console.log('   [SUCCESS] Holiday delete persisted to disk.');

  // 6. System Settings Mutation
  console.log('\n6. Testing Settings Persistence...');
  const dbSettings = loadDatabase();
  dbSettings.settings = {
    ...dbSettings.settings,
    themeMode: 'light',
    compactMode: true,
    preferredView: 'grid',
  };
  saveDatabase(dbSettings);
  recordAuditLog(
    'UPDATE_SETTINGS',
    'Superuser (ทดสอบ)',
    'superuser',
    'System Preferences',
    'ปรับแต่งการตั้งค่าระบบ: themeMode=light, compactMode=true, preferredView=grid'
  );

  const diskRaw5 = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', 'manstat_db.json'), 'utf8'));
  if (diskRaw5.settings.themeMode !== 'light' || !diskRaw5.settings.compactMode || diskRaw5.settings.preferredView !== 'grid') {
    throw new Error('Settings update failed to persist to disk JSON!');
  }
  console.log('   [SUCCESS] System settings persisted to disk.');

  // 7. Verify PDPA Audit Logs
  console.log('\n7. Verifying PDPA Audit Logs...');
  const diskRaw6 = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', 'manstat_db.json'), 'utf8'));
  console.log(`   Total Audit Logs in JSON: ${diskRaw6.auditLogs.length}`);
  const recentLogs = diskRaw6.auditLogs.slice(0, 7);
  recentLogs.forEach((l: any, i: number) => {
    console.log(`   [Log ${i + 1}] [${l.action}] [${l.actorName}] -> ${l.targetName}: ${l.details}`);
  });

  if (diskRaw6.auditLogs.length < 7) {
    throw new Error('Audit logs count is less than expected!');
  }
  console.log('   [SUCCESS] PDPA Audit Logs recorded and verified on disk.');

  // Restore Director Name to original
  const dbRestore = loadDatabase();
  dbRestore.schoolInfo.directorName = originalDirector;
  saveDatabase(dbRestore);

  console.log('\n=== ALL 7 ADMIN PERSISTENCE TESTS PASSED (100% DISK VERIFIED) ===');
}

runTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
