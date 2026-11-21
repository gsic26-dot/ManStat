import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateCensusDiff } from '../queries.js';
import type { StudentCensusSnapshotRecord } from '@/lib/data/schoolData';

describe('Phase 2: Academic Census Calculations & Services', () => {
  it('correctly calculates positive difference when students increase in Nov round', () => {
    const snapshots: StudentCensusSnapshotRecord[] = [
      {
        id: 's-jun',
        academicYearId: 'ay-2569',
        roundCode: 'JUN_10',
        snapshotDate: '2026-06-10',
        fiscalYearTh: 2569,
        kindergartenStudents: 19,
        kindergartenClassrooms: 2,
        primaryStudents: 75,
        primaryClassrooms: 6,
        secondaryStudents: 0,
        secondaryClassrooms: 0,
        totalStudents: 94,
        totalClassrooms: 8,
        isPrimaryForManpower: true,
        isLocked: false,
      },
      {
        id: 's-nov',
        academicYearId: 'ay-2569',
        roundCode: 'NOV_10',
        snapshotDate: '2026-11-10',
        fiscalYearTh: 2570,
        kindergartenStudents: 20,
        kindergartenClassrooms: 2,
        primaryStudents: 76,
        primaryClassrooms: 6,
        secondaryStudents: 0,
        secondaryClassrooms: 0,
        totalStudents: 96,
        totalClassrooms: 8,
        isPrimaryForManpower: false,
        isLocked: false,
      },
    ];

    const result = calculateCensusDiff(snapshots);
    assert.equal(result.diffStudents, 2);
    assert.equal(result.diffText, '+2');
    assert.match(result.diffLongText, /เพิ่มขึ้น 2 คน/);
  });

  it('correctly calculates negative difference when students decrease in Nov round', () => {
    const snapshots: StudentCensusSnapshotRecord[] = [
      {
        id: 's-jun',
        academicYearId: 'ay-2569',
        roundCode: 'JUN_10',
        snapshotDate: '2026-06-10',
        fiscalYearTh: 2569,
        kindergartenStudents: 19,
        kindergartenClassrooms: 2,
        primaryStudents: 75,
        primaryClassrooms: 6,
        secondaryStudents: 0,
        secondaryClassrooms: 0,
        totalStudents: 94,
        totalClassrooms: 8,
        isPrimaryForManpower: true,
        isLocked: false,
      },
      {
        id: 's-nov',
        academicYearId: 'ay-2569',
        roundCode: 'NOV_10',
        snapshotDate: '2026-11-10',
        fiscalYearTh: 2570,
        kindergartenStudents: 18,
        kindergartenClassrooms: 2,
        primaryStudents: 75,
        primaryClassrooms: 6,
        secondaryStudents: 0,
        secondaryClassrooms: 0,
        totalStudents: 93,
        totalClassrooms: 8,
        isPrimaryForManpower: false,
        isLocked: false,
      },
    ];

    const result = calculateCensusDiff(snapshots);
    assert.equal(result.diffStudents, -1);
    assert.equal(result.diffText, '-1');
    assert.match(result.diffLongText, /ลดลง 1 คน/);
  });

  it('correctly handles equal students in both rounds', () => {
    const snapshots: StudentCensusSnapshotRecord[] = [
      {
        id: 's-jun',
        academicYearId: 'ay-2569',
        roundCode: 'JUN_10',
        snapshotDate: '2026-06-10',
        fiscalYearTh: 2569,
        kindergartenStudents: 19,
        kindergartenClassrooms: 2,
        primaryStudents: 75,
        primaryClassrooms: 6,
        secondaryStudents: 0,
        secondaryClassrooms: 0,
        totalStudents: 94,
        totalClassrooms: 8,
        isPrimaryForManpower: true,
        isLocked: false,
      },
      {
        id: 's-nov',
        academicYearId: 'ay-2569',
        roundCode: 'NOV_10',
        snapshotDate: '2026-11-10',
        fiscalYearTh: 2570,
        kindergartenStudents: 19,
        kindergartenClassrooms: 2,
        primaryStudents: 75,
        primaryClassrooms: 6,
        secondaryStudents: 0,
        secondaryClassrooms: 0,
        totalStudents: 94,
        totalClassrooms: 8,
        isPrimaryForManpower: false,
        isLocked: false,
      },
    ];

    const result = calculateCensusDiff(snapshots);
    assert.equal(result.diffStudents, 0);
    assert.equal(result.diffText, '0');
    assert.match(result.diffLongText, /เท่าเดิม/);
  });
});
