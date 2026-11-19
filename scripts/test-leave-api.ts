import { loadDatabase, saveDatabase } from '../src/lib/db/serverDb';

const db = loadDatabase();
console.log('Database Loaded Successfully:');
console.log('- School:', db.schoolInfo.schoolName);
console.log('- Teachers count:', db.teachers.length);
console.log('- Leave Requests count:', db.leaveRequests.length);

db.leaveRequests.forEach((req, idx) => {
  console.log(`  [${idx + 1}] (${req.id}) ${req.docNo} - ${req.teacherName}: ${req.leaveTypeName} [${req.status}]`);
});

const pending = db.leaveRequests.filter(r => r.status === 'pending');
console.log('Pending requests for Director queue:', pending.length);
