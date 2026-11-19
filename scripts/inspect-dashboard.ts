import fs from 'fs';
const db = JSON.parse(fs.readFileSync('data/manstat_db.json', 'utf8'));
console.log('Keys in db:', Object.keys(db));
if (db.leaveRequests) console.log('leaveRequests count:', db.leaveRequests.length);
else console.log('NO leaveRequests key in manstat_db.json');
