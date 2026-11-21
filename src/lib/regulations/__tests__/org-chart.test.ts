import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_TEACHERS } from '@/lib/data/schoolData';
import {
  findDivisionHead,
  formatStaffPositionAndStanding,
  getDirectorInfo,
} from '../org-chart';

describe('School Organization Chart & Division Heads Data Binding', () => {
  it('correctly binds academic division head (TCH-004) with คศ. 3 standing', () => {
    const head = findDivisionHead(INITIAL_TEACHERS, 'academic');
    assert.equal(head.name, 'นายพันธ์ธนัต ภวฤทธิ์นาคินทร์');
    assert.equal(head.positionFormatted, 'ครูชำนาญการพิเศษ · คศ. 3');
  });

  it('CRITICAL: correctly binds budget division head (TCH-008) as ครู คศ. 1 without false standing badge', () => {
    const head = findDivisionHead(INITIAL_TEACHERS, 'budget');
    assert.equal(head.name, 'นางสาวสุนิสา สุทธิวงศ์');
    // Must NOT state ชำนาญการพิเศษ or คศ. 3!
    assert.equal(head.positionFormatted, 'ครู คศ. 1');
  });

  it('correctly binds personnel division head (TCH-007) with คศ. 3 standing', () => {
    const head = findDivisionHead(INITIAL_TEACHERS, 'personnel');
    assert.equal(head.name, 'นางสาวทัชชกร ช่วยจังหรีด');
    assert.equal(head.positionFormatted, 'ครูชำนาญการพิเศษ · คศ. 3');
  });

  it('correctly binds general division head (TCH-003) with คศ. 3 standing', () => {
    const head = findDivisionHead(INITIAL_TEACHERS, 'general');
    assert.equal(head.name, 'นายธวัชชัย เหลืองโอฬาร');
    assert.equal(head.positionFormatted, 'ครูชำนาญการพิเศษ · คศ. 3');
  });

  it('correctly formats staff position and standing cleanly without parentheses', () => {
    const teacher1 = INITIAL_TEACHERS.find((t) => t.id === 'TCH-003')!;
    assert.equal(formatStaffPositionAndStanding(teacher1), 'ครูชำนาญการพิเศษ · คศ. 3');

    const teacher2 = INITIAL_TEACHERS.find((t) => t.id === 'TCH-008')!;
    assert.equal(formatStaffPositionAndStanding(teacher2), 'ครู คศ. 1');

    const assistant = INITIAL_TEACHERS.find((t) => t.id === 'TCH-013')!;
    assert.equal(formatStaffPositionAndStanding(assistant), 'ครูผู้ช่วย');
  });

  it('correctly resolves Director info from real teacher records', () => {
    const directorInfo = getDirectorInfo(INITIAL_TEACHERS);
    assert.equal(directorInfo.name, 'นายธีรศักดิ์ มโนธรรม');
    assert.equal(directorInfo.positionFormatted, 'ผู้อำนวยการสถานศึกษา');
  });
});
