import { loadDatabase, saveDatabase, recordAuditLog } from '../src/lib/db/serverDb';
import fs from 'fs';
import path from 'path';

console.log('================================================================');
console.log(' MANSTAT-MODERN: ADMIN 5 TABS PERSISTENCE & CACHING VERIFICATION');
console.log('================================================================\n');

const dbPath = path.join(process.cwd(), 'data', 'manstat_db.json');

// 1. คณะกรรมการสถานศึกษา (Board)
console.log('--- TEST 1: คณะกรรมการสถานศึกษา (School Board) ---');
const db1 = loadDatabase(true);
const initialBoardCount = db1.boardMembers.length;
console.log(`Initial Board count: ${initialBoardCount}`);

const testMember = {
  id: `SBD-TEST-${Date.now()}`,
  fullName: 'นายทดสอบ คณะกรรมการ',
  position: 'EXPERT',
  positionTitle: 'กรรมการผู้ทรงคุณวุฒิ',
  occupation: 'ข้าราชการบำนาญ',
  organization: 'ชุมชนบ้านตะขบ',
  phone: '081-999-8888',
  status: 'ดำรงตำแหน่ง',
  termNumber: 1
};

db1.boardMembers.push(testMember);
saveDatabase(db1);

// Direct disk check
const diskDb1 = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
const foundMember = diskDb1.boardMembers.find((b: any) => b.id === testMember.id);
if (!foundMember) throw new Error('TEST 1 FAILED: Member was not persisted to disk!');
console.log(`[PASS] Added member persisted to disk: ${foundMember.fullName}`);

// Remove test member to keep db clean
diskDb1.boardMembers = diskDb1.boardMembers.filter((b: any) => b.id !== testMember.id);
fs.writeFileSync(dbPath, JSON.stringify(diskDb1, null, 2), 'utf8');
const reloadedDb1 = loadDatabase(true);
console.log(`[PASS] Cleaned test member. Board count restored: ${reloadedDb1.boardMembers.length}`);


// 2. ข้อมูลสถานศึกษา (School & activeClasses)
console.log('\n--- TEST 2: ข้อมูลสถานศึกษา & activeClasses ---');
const db2 = loadDatabase(true);
const originalClasses = [...(db2.schoolInfo.activeClasses || [])];
const testClasses = ['อนุบาล 2', 'อนุบาล 3', 'ประถมศึกษาปีที่ 1', 'มัธยมศึกษาปีที่ 1'];

db2.schoolInfo.activeClasses = testClasses;
saveDatabase(db2);

const diskDb2 = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
console.log('Direct Disk activeClasses:', diskDb2.schoolInfo.activeClasses);
if (diskDb2.schoolInfo.activeClasses?.length !== 4) throw new Error('TEST 2 FAILED: activeClasses not saved properly!');
console.log('[PASS] activeClasses successfully persisted to disk');

// Restore original
db2.schoolInfo.activeClasses = originalClasses;
saveDatabase(db2);


// 3. ปีงบประมาณและวันหยุด (Fiscal Year & Holidays)
console.log('\n--- TEST 3: ปีงบประมาณและวันหยุด (Fiscal Year & Holidays) ---');
const db3 = loadDatabase(true);
const originalFiscal = db3.schoolInfo.fiscalYear;

db3.schoolInfo.fiscalYear = '2571';
const testHoliday = {
  id: `h-test-${Date.now()}`,
  date: '2027-01-01',
  name: 'วันหยุดทดสอบระบบ',
  type: 'วันหยุดพิเศษ'
};
db3.holidays.push(testHoliday);
saveDatabase(db3);

const diskDb3 = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
console.log('Direct Disk fiscalYear:', diskDb3.schoolInfo.fiscalYear);
const foundHoliday = diskDb3.holidays.find((h: any) => h.id === testHoliday.id);
if (diskDb3.schoolInfo.fiscalYear !== '2571' || !foundHoliday) {
  throw new Error('TEST 3 FAILED: Fiscal year or Holiday not persisted!');
}
console.log(`[PASS] Fiscal year and holiday persisted. Holiday name: ${foundHoliday.name}`);

// Restore original
db3.schoolInfo.fiscalYear = originalFiscal;
db3.holidays = db3.holidays.filter(h => h.id !== testHoliday.id);
saveDatabase(db3);


// 4. PDPA Audit Logs
console.log('\n--- TEST 4: PDPA Audit Logs ---');
const logEntry = recordAuditLog(
  'TEST_AUDIT_ACTION',
  'นายชินวัจน์ มาตย์นอก (Admin)',
  'hr_admin',
  'ข้อมูลสถานศึกษา',
  'ทดสอบการบันทึก Audit Log โดยไม่มี hardcode'
);

const diskDb4 = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
const foundLog = diskDb4.auditLogs.find((l: any) => l.id === logEntry.id);
if (!foundLog || foundLog.actorName.includes('Superuser (นายธีรศักดิ์ มโนธรรม)')) {
  throw new Error('TEST 4 FAILED: Audit Log was not persisted or has hardcoded actorName!');
}
console.log(`[PASS] Audit Log persisted correctly: Actor = ${foundLog.actorName}, Action = ${foundLog.action}`);

// Clean up test log
diskDb4.auditLogs = diskDb4.auditLogs.filter((l: any) => l.id !== logEntry.id);
fs.writeFileSync(dbPath, JSON.stringify(diskDb4, null, 2), 'utf8');


// 5. ตั้งค่าระบบ (Settings)
console.log('\n--- TEST 5: ตั้งค่าระบบ (System Settings) ---');
const db5 = loadDatabase(true);
const originalTheme = db5.settings.themeMode;
const originalView = db5.settings.preferredView;

db5.settings.themeMode = 'dark';
db5.settings.preferredView = 'grid';
db5.settings.maskCitizenId = true;
saveDatabase(db5);

const diskDb5 = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
console.log('Direct Disk settings:', { theme: diskDb5.settings.themeMode, view: diskDb5.settings.preferredView, mask: diskDb5.settings.maskCitizenId });
if (diskDb5.settings.themeMode !== 'dark' || diskDb5.settings.preferredView !== 'grid') {
  throw new Error('TEST 5 FAILED: Settings not persisted properly!');
}
console.log('[PASS] Settings successfully persisted to disk');

// Restore original
db5.settings.themeMode = originalTheme;
db5.settings.preferredView = originalView;
saveDatabase(db5);

console.log('\n================================================================');
console.log(' ALL 5 ADMIN TABS PASSED PERSISTENCE & DATA INTEGRITY TESTS! ');
console.log('================================================================');
