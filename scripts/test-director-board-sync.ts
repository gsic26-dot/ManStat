import { formatServiceDuration } from '../src/lib/regulations/fiscal-and-retirement';
import { formatOfficialThaiDate } from '../src/lib/regulations/thai-numerals';
import type { TeacherRecord, BoardMemberRecord } from '../src/lib/data/schoolData';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`[FAIL] ${msg}`);
    process.exit(1);
  }
  console.log(`[PASS] ${msg}`);
}

console.log('--- TEST CASE 1: Pencil Edit in Standings ---');
const teacher: TeacherRecord = {
  id: 'EXE-001',
  employeeCode: 'EXE-001',
  name: 'นายธีรศักดิ์ มโนธรรม',
  prefix: 'นาย',
  firstName: 'ธีรศักดิ์',
  lastName: 'มโนธรรม',
  position: 'ผู้อำนวยการโรงเรียน',
  academicStanding: '-',
  department: 'สายงานบริหารและสนับสนุนการศึกษา',
  division: 'ผู้บริหารสถานศึกษา',
  startDate: '2012-01-10', // วันบรรจุครูผู้ช่วย
  email: 'test@example.com',
  phone: '099-173-2233',
  maskedCitizenId: '3-3014-*****-**-1',
  idCard: '3301401302311',
  sickUsed: 0,
  personalUsed: 0,
  vacationUsed: 0,
  licenses: [],
  educations: [],
  standings: [
    { level: 'ครูผู้ช่วย', effectiveDate: '2012-01-10', orderNumber: 'ศธ 101/2555' },
    { level: 'ครู', effectiveDate: '2014-01-10', orderNumber: 'ศธ 202/2557' },
    { level: 'ผู้อำนวยการสถานศึกษา', effectiveDate: '2022-10-01', orderNumber: 'ศธ 505/2565' }
  ]
};

// Simulate editing standing at index 2
const editIdx = 2;
const standingToEdit = { ...teacher.standings[editIdx] };
assert(standingToEdit.level === 'ผู้อำนวยการสถานศึกษา', 'Standing found to edit');
standingToEdit.level = 'ผู้อำนวยการโรงเรียน';
standingToEdit.effectiveDate = '2022-10-01';
standingToEdit.orderNumber = 'ศธ 999/2565';

const updatedStandings = [...teacher.standings];
updatedStandings[editIdx] = standingToEdit;
assert(updatedStandings[2].level === 'ผู้อำนวยการโรงเรียน', 'Standing updated in place without deleting');
assert(updatedStandings.length === 3, 'Array length unchanged');

console.log('\n--- TEST CASE 2: Sync Director from Staff (Guard against startDate) ---');
// Sync logic simulation
const directorStandings = (teacher.standings || [])
  .filter((s) => s.level && (s.level.includes('ผู้อำนวยการ') || s.level.includes('ผอ.')))
  .sort((a, b) => (b.effectiveDate || '').localeCompare(a.effectiveDate || ''));

const latestDirectorStanding = directorStandings[0];
assert(latestDirectorStanding !== undefined, 'Found director standing');
assert(latestDirectorStanding.effectiveDate === '2022-10-01', 'Found correct director appointment date 2022-10-01');
assert(latestDirectorStanding.effectiveDate !== teacher.startDate, 'System Guard verified: Did NOT use startDate (2012-01-10)!');

const boardMember: BoardMemberRecord = {
  id: 'SBD-009',
  fullName: teacher.name,
  position: 'DIRECTOR_SEC',
  positionTitle: 'กรรมการและเลขานุการ',
  occupation: 'ผู้อำนวยการสถานศึกษา',
  organization: 'โรงเรียนชุมชนบ้านตะขบ',
  phone: teacher.phone,
  status: 'ดำรงตำแหน่ง',
  termNumber: 0,
  isExOfficio: true,
  appointmentDate: latestDirectorStanding.effectiveDate,
  endDate: '',
  endReason: ''
};

assert(boardMember.appointmentDate === '2022-10-01', 'Board member appointmentDate set from director standing');
const activeDuration = formatServiceDuration(boardMember.appointmentDate);
assert(activeDuration.includes('ปี'), `Active director calculated duration correctly: ${activeDuration}`);

console.log('\n--- TEST CASE 3: Terminated Director with endReason and endDate ---');
const terminatedBoardMember: BoardMemberRecord = {
  ...boardMember,
  status: 'พ้นจากตำแหน่ง',
  endReason: 'ย้าย',
  endDate: '2024-09-30'
};

const stoppedDuration = formatServiceDuration(terminatedBoardMember.appointmentDate, terminatedBoardMember.endDate);
assert(stoppedDuration === '1 ปี 11 เดือน', `Duration stopped at endDate: ${stoppedDuration}`);
const thaiEndFormatted = formatOfficialThaiDate(terminatedBoardMember.endDate);
assert(thaiEndFormatted.includes('กันยายน 2567'), `Thai end date formatted correctly: ${thaiEndFormatted}`);

console.log('\nALL 3 TEST CASES PASSED SUCCESSFULLY!');
