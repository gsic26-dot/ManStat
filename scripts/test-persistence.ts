import { loadDatabase, saveDatabase } from '../src/lib/db/serverDb';
import { mapAccessLevelToRole } from '../src/lib/auth/roles';
import fs from 'fs';
import path from 'path';

console.log('--- 1. Testing DB Persistence and Reload ---');
const db1 = loadDatabase();
const targetStaff = db1.teachers.find(t => t.id === 'TCH-013');
if (!targetStaff) throw new Error('TCH-013 not found');

const originalAccess = targetStaff.accessLevel;
const originalStanding = targetStaff.academicStanding;
console.log('Original TCH-013:', { accessLevel: originalAccess, academicStanding: originalStanding });

// Modify and save
targetStaff.accessLevel = 'Superuser';
targetStaff.role = mapAccessLevelToRole('Superuser');
targetStaff.academicStanding = 'ชำนาญการ';
saveDatabase(db1);

// Read raw file on disk directly
const filePath = path.join(process.cwd(), 'data', 'manstat_db.json');
const rawOnDisk = JSON.parse(fs.readFileSync(filePath, 'utf8'));
const onDiskStaff = rawOnDisk.teachers.find((t: any) => t.id === 'TCH-013');
console.log('Direct Disk Check:', { accessLevel: onDiskStaff.accessLevel, academicStanding: onDiskStaff.academicStanding });
if (onDiskStaff.accessLevel !== 'Superuser') throw new Error('Persistence to disk failed!');

// Reload database via loadDatabase
const db2 = loadDatabase();
const reloadedStaff = db2.teachers.find(t => t.id === 'TCH-013');
console.log('Reloaded via loadDatabase:', { accessLevel: reloadedStaff?.accessLevel, role: reloadedStaff?.role });
if (reloadedStaff?.accessLevel !== 'Superuser') throw new Error('loadDatabase did not return updated state!');

console.log('--- 2. Testing Identity and Role Mapping ---');
// When looking up TCH-013 who has Superuser accessLevel:
const teacherLookup = db2.teachers.find(t => t.id === 'TCH-013');
const realRole = mapAccessLevelToRole(teacherLookup?.accessLevel);
console.log('TCH-013 Identity Check:', { id: teacherLookup?.id, name: teacherLookup?.name, role: realRole });
if (teacherLookup?.id !== 'TCH-013') throw new Error('Wrong identity for TCH-013!');
if (realRole !== 'superuser') throw new Error('Wrong role mapped for TCH-013 Superuser!');

// Restore original
targetStaff.accessLevel = originalAccess;
targetStaff.role = mapAccessLevelToRole(originalAccess);
targetStaff.academicStanding = originalStanding;
saveDatabase(db1);

const restoredDb = loadDatabase();
const restoredStaff = restoredDb.teachers.find(t => t.id === 'TCH-013');
console.log('Restored state:', { accessLevel: restoredStaff?.accessLevel, academicStanding: restoredStaff?.academicStanding });
console.log('SUCCESS: All persistence, reload, and identity checks passed!');
