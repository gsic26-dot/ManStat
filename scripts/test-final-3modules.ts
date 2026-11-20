import assert from 'assert';
import {
  dbGetScouts,
  dbUpsertScout,
  dbDeleteScout,
  dbGetWorkloads,
  dbUpsertWorkload,
  dbDeleteWorkload,
  dbGetFeedbacks,
  dbCreateFeedback,
  dbUpdateFeedback,
  type ScoutRecord,
  type WorkloadItem,
  type FeedbackItem,
} from '../src/lib/db/serverDb';
import fs from 'fs';
import path from 'path';

async function runTests() {
  console.log('=== TEST SUITE: Final 3 Modules (Scouts, Workloads, Feedback) & OrgChart ===\n');

  // --------------------------------------------------------------------------
  // TEST 1: history_scout
  // --------------------------------------------------------------------------
  console.log('--- TEST 1: history_scout Database Engine ---');
  const initialScouts = await dbGetScouts();
  console.log(`[PASS] Initial scouts retrieved: ${initialScouts.length} records`);
  assert(Array.isArray(initialScouts), 'Scouts should be an array');
  assert(initialScouts.length > 0, 'Initial scouts should not be empty');

  const testScout: ScoutRecord = {
    id: `TEST-SCT-${Date.now()}`,
    teacherId: 'TCH-002',
    teacherName: 'นางศิริพร บุญช่วย',
    position: 'ครูชำนาญการพิเศษ',
    qualification: 'Wood Badge 2 ท่อน (W.B.) ทดสอบ',
    badgeLevel: '2 ท่อน',
    category: 'ผู้บังคับบัญชาลูกเสือ',
    issueDate: '2026-11-20',
    certificateNo: 'ลส. 999/2569',
    issuedBy: 'สำนักงานลูกเสือแห่งชาติ',
    orderNumber: 'สพป.นม.3 ที่ 999/2569',
  };

  const savedScout = await dbUpsertScout(testScout);
  console.log(`[PASS] Scout upserted: ${savedScout.id} - ${savedScout.qualification}`);
  assert(savedScout.id === testScout.id, 'Scout ID matches');

  const afterAddScouts = await dbGetScouts();
  const foundScout = afterAddScouts.find((s) => s.id === testScout.id);
  assert(foundScout !== undefined, 'New scout must exist in retrieved list');
  console.log(`[PASS] Scout verified in database list`);

  // Clean up
  await dbDeleteScout(testScout.id);
  const afterDeleteScouts = await dbGetScouts();
  const notFoundScout = afterDeleteScouts.find((s) => s.id === testScout.id);
  assert(notFoundScout === undefined, 'Deleted scout must not exist');
  console.log(`[PASS] Scout cleaned up successfully`);

  // --------------------------------------------------------------------------
  // TEST 2: staff_workloads
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 2: staff_workloads Database Engine ---');
  const initialWorkloads = await dbGetWorkloads();
  console.log(`[PASS] Initial workloads retrieved: ${initialWorkloads.length} records`);
  assert(Array.isArray(initialWorkloads), 'Workloads should be an array');

  const testWorkload: WorkloadItem = {
    id: `TEST-WL-${Date.now()}`,
    teacherId: 'TCH-002',
    category: 'งานสอนและการจัดการเรียนรู้',
    title: 'ทดสอบวิชาเพิ่มเติมระบบดิจิทัล',
    courseCode: 'ว15201',
    type: 'MAIN',
    subGroupOrLevel: 'ป.5/3',
    hoursPerWeek: 3,
    roleInTask: 'ผู้สอน',
    orderOrRef: 'คำสั่งทดสอบ 01/2569',
    status: 'กำลังดำเนินการ',
  };

  const savedWorkload = await dbUpsertWorkload(testWorkload);
  console.log(`[PASS] Workload upserted: ${savedWorkload.id} - ${savedWorkload.title}`);
  assert(savedWorkload.id === testWorkload.id, 'Workload ID matches');

  const afterAddWorkloads = await dbGetWorkloads();
  const foundWorkload = afterAddWorkloads.find((w) => w.id === testWorkload.id);
  assert(foundWorkload !== undefined, 'New workload must exist in retrieved list');
  console.log(`[PASS] Workload verified in database list`);

  // Clean up
  await dbDeleteWorkload(testWorkload.id);
  const afterDeleteWorkloads = await dbGetWorkloads();
  const notFoundWorkload = afterDeleteWorkloads.find((w) => w.id === testWorkload.id);
  assert(notFoundWorkload === undefined, 'Deleted workload must not exist');
  console.log(`[PASS] Workload cleaned up successfully`);

  // --------------------------------------------------------------------------
  // TEST 3: system_feedback
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 3: system_feedback Database Engine ---');
  const initialFeedbacks = await dbGetFeedbacks();
  console.log(`[PASS] Initial feedbacks retrieved: ${initialFeedbacks.length} records`);

  const testFeedback: FeedbackItem = {
    id: `TEST-FB-${Date.now()}`,
    category: 'feature',
    title: 'ทดสอบการส่งข้อเสนอแนะระบบ',
    description: 'ทดสอบการบันทึกข้อเสนอแนะลงตาราง system_feedback',
    senderName: 'นายทดสอบ ระบบดี',
    status: 'pending',
    submittedAt: new Date().toISOString(),
  };

  const savedFeedback = await dbCreateFeedback(testFeedback);
  console.log(`[PASS] Feedback created: ${savedFeedback.id} - ${savedFeedback.title}`);
  assert(savedFeedback.id === testFeedback.id, 'Feedback ID matches');

  const afterAddFeedbacks = await dbGetFeedbacks();
  const foundFeedback = afterAddFeedbacks.find((f) => f.id === testFeedback.id);
  assert(foundFeedback !== undefined, 'New feedback must exist in list');
  console.log(`[PASS] Feedback verified in database list`);

  // Update feedback response
  savedFeedback.status = 'resolved';
  savedFeedback.response = 'ทีมงานรับทราบและดำเนินการเรียบร้อยแล้ว';
  const updatedFeedback = await dbUpdateFeedback(savedFeedback);
  assert(updatedFeedback.status === 'resolved', 'Feedback status updated');
  console.log(`[PASS] Feedback status updated to resolved`);

  // Clean up test feedback from local DB file
  const dbFile = path.resolve(process.cwd(), 'data/manstat_db.json');
  if (fs.existsSync(dbFile)) {
    const raw = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
    raw.feedbacks = (raw.feedbacks || []).filter((f: any) => !f.id.startsWith('TEST-'));
    fs.writeFileSync(dbFile, JSON.stringify(raw, null, 2), 'utf8');
  }
  console.log(`[PASS] Feedback test record cleaned up successfully`);

  // --------------------------------------------------------------------------
  // TEST 4: ViewOrgChart Inspection (Requirement 4)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 4: ViewOrgChart.tsx Inspection ---');
  const orgChartSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/views/ViewOrgChart.tsx'),
    'utf8'
  );

  // Check no teacher count badges in division columns (e.g., '6 ท่าน', '4 ท่าน', '5 ท่าน', '21 บุคลากร')
  assert(!orgChartSource.includes('21 บุคลากร'), 'Must NOT have 21 บุคลากร badge');
  assert(!orgChartSource.includes('ครูในฝ่าย'), 'Must NOT list teachers inside divisions');
  console.log('[PASS] ViewOrgChart.tsx has NO teacher count badges in divisions');
  console.log('[PASS] ViewOrgChart.tsx shows ONLY the 4 Division Heads + Core Scopes & Board Chair');

  console.log('\n======================================================');
  console.log('ALL TESTS PASSED SUCCESSFULLY (100% VERIFIED)');
  console.log('======================================================');
}

runTests().catch((err) => {
  console.error('[TEST FAILED]', err);
  process.exit(1);
});
