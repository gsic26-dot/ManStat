import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  SEED_STAFF_EXPECTED_COUNTS,
  TIMETABLE_SEED_2569_2_SLOTS,
  deriveAllocationsFromSeed2569_2,
} from '../timetableSeed2569_2';

describe('Data Import 2/2569: 315-Slot + 6 Co-Teaching Checksum & Conflict Verification', () => {
  it('Test 1: has exactly 315 slots (9 rooms x 35 slots each) with 0 room overlaps', () => {
    assert.equal(TIMETABLE_SEED_2569_2_SLOTS.length, 315);

    const rooms = ['ป.1', 'ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6', 'ม.1', 'ม.2', 'ม.3'];
    const seenRoomSlots = new Set<string>();

    for (const room of rooms) {
      const roomSlots = TIMETABLE_SEED_2569_2_SLOTS.filter((s) => s.roomName === room);
      assert.equal(roomSlots.length, 35, `Expected 35 slots for ${room}, got ${roomSlots.length}`);
      for (const s of roomSlots) {
        const key = `${s.roomName}-${s.dayOfWeek}-${s.periodNo}`;
        assert.ok(!seenRoomSlots.has(key), `Duplicate room slot at ${key}`);
        seenRoomSlots.add(key);
      }
    }
    assert.equal(seenRoomSlots.size, 315);
  });

  it('Test 2: matches exact PDF slot counts for all 11 staff (33x9 + 18 + 6 co-teach) with 0 teacher time conflicts', () => {
    const primaryCounts: Record<string, number> = {};
    const coCounts: Record<string, number> = {};
    const teacherTimeSlots = new Map<string, string>(); // `${teacher}|${day}|${period}` -> roomName

    for (const s of TIMETABLE_SEED_2569_2_SLOTS) {
      primaryCounts[s.teacherFirstName] = (primaryCounts[s.teacherFirstName] || 0) + 1;

      const pKey = `${s.teacherFirstName}|${s.dayOfWeek}|${s.periodNo}`;
      const existingPrimaryRoom = teacherTimeSlots.get(pKey);
      assert.equal(
        existingPrimaryRoom,
        undefined,
        `Teacher conflict for ${s.teacherFirstName} on day ${s.dayOfWeek} period ${s.periodNo}: ${existingPrimaryRoom} vs ${s.roomName}`
      );
      teacherTimeSlots.set(pKey, s.roomName);

      if (s.coTeacherFirstName) {
        coCounts[s.coTeacherFirstName] = (coCounts[s.coTeacherFirstName] || 0) + 1;
        const cKey = `${s.coTeacherFirstName}|${s.dayOfWeek}|${s.periodNo}`;
        const existingCoRoom = teacherTimeSlots.get(cKey);
        assert.equal(
          existingCoRoom,
          undefined,
          `Co-teacher conflict for ${s.coTeacherFirstName} on day ${s.dayOfWeek} period ${s.periodNo}: ${existingCoRoom} vs ${s.roomName}`
        );
        teacherTimeSlots.set(cKey, s.roomName);
      }
    }

    for (const [name, expected] of Object.entries(SEED_STAFF_EXPECTED_COUNTS)) {
      assert.equal(
        primaryCounts[name] || 0,
        expected.primary,
        `Primary count mismatch for ${name}: expected ${expected.primary}, got ${primaryCounts[name] || 0}`
      );
      assert.equal(
        coCounts[name] || 0,
        expected.coTeach,
        `Co-teach count mismatch for ${name}: expected ${expected.coTeach}, got ${coCounts[name] || 0}`
      );
    }
  });

  it('Test 3: has zero truncated PDF subject names or trailing dots, and derived allocations sum to 315', () => {
    const forbiddenExactOrPrefix = [
      'กฤษเพื่อการสื่อสา',
      'ฤษเพื่อการสื่อสาร',
      'กฤษเพื่อการสื่อสาร',
      'ยงปลาดุกในบ่อซีเมา',
      'นสายไฟภายในอาค',
      'วิทยาการคำนวณ2',
      'ปัญญาประดิษฐ์2',
    ];

    for (const s of TIMETABLE_SEED_2569_2_SLOTS) {
      assert.ok(!s.subjectName.endsWith('.'), `Trailing dot found in subjectName: "${s.subjectName}"`);
      for (const bad of forbiddenExactOrPrefix) {
        assert.ok(
          s.subjectName !== bad && !s.subjectName.startsWith(bad),
          `Truncated/unnormalized subject found: "${s.subjectName}"`
        );
      }
    }

    const allocations = deriveAllocationsFromSeed2569_2();
    const totalPeriods = allocations.reduce((sum, a) => sum + a.periodsPerWeek, 0);
    assert.equal(totalPeriods, 315, `Derived allocations must sum to 315, got ${totalPeriods}`);
  });
});
