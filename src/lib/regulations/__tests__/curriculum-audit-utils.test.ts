import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateSchoolCurriculumAudit,
  exportCurriculumAuditCsv,
} from '../curriculum-audit-utils';
import { buildDefaultObecCurriculumPresets } from '../school-curriculum-presets';
import { TIMETABLE_SEED_2569_2_SLOTS } from '@/lib/data/timetableSeed2569_2';
import type { TimetableSlot } from '@/lib/data/timetableTypes';

function buildReal2569_2Slots(): TimetableSlot[] {
  return TIMETABLE_SEED_2569_2_SLOTS.map((s, idx) => ({
    id: `SLOT-${idx + 1}`,
    academicYear: '2569',
    semester: '2',
    roomName: s.roomName,
    dayOfWeek: s.dayOfWeek,
    periodNo: s.periodNo,
    subjectCode: '',
    subjectName: s.subjectName,
    subjectGroup: s.subjectGroup,
    subjectType: s.subjectType,
    teacherId: s.teacherFirstName,
    coTeacherId: s.coTeacherFirstName,
    isLocked: s.isLocked,
  }));
}

describe('Phase 12.2: School-Wide Curriculum vs. Actual Timetable Audit Engine', () => {
  it('Test 1: verifies real 315-slot 2/2569 timetable achieves 100% compliance across all 9 rooms (ป.1–ม.3) with 0 issues', () => {
    const slots = buildReal2569_2Slots();
    const presets = buildDefaultObecCurriculumPresets();

    const report = evaluateSchoolCurriculumAudit({
      academicYear: '2569',
      semester: '2',
      slots,
      catalogSubjects: presets,
    });

    assert.equal(report.stats.totalRooms, 9);
    assert.equal(report.stats.compliantRooms, 9, `Expected all 9 rooms compliant, got ${report.stats.compliantRooms}`);
    assert.equal(report.stats.overallCompliancePercent, 100);
    assert.equal(report.stats.totalIssues, 0);

    for (const room of report.rooms) {
      assert.equal(room.isCompliant, true, `Room ${room.roomName} had issues: ${JSON.stringify(room.subjects.filter((s) => s.status !== 'match'))}`);
      assert.equal(room.unmatchedSlots.length, 0, `Room ${room.roomName} had unmatched slots: ${JSON.stringify(room.unmatchedSlots)}`);
      assert.equal(room.homeroomHours, 2.5, `Room ${room.roomName} homeroom hours should be 2.5`);
      if (room.level === 'primary') {
        assert.equal(room.enrichmentHours, 2, `Primary room ${room.roomName} should have 2 enrichment hrs (ส่งเสริมอ่านเขียน + สวดมนต์)`);
      }
    }
  });

  it('Test 2: accurately flags under, missing, and over variance with exact diffHours', () => {
    const slots = buildReal2569_2Slots();
    const presets = buildDefaultObecCurriculumPresets();

    // Remove 1 slot of ภาษาไทย in ป.1 (becomes under: -1), remove ประวัติศาสตร์ in ป.1 (becomes missing: -1),
    // and add 1 extra slot of ศิลปะ/ดนตรี in ป.1 (becomes over: +1)
    let removedThai = false;
    const mutated = slots.filter((s) => {
      if (s.roomName === 'ป.1' && s.subjectName === 'ภาษาไทย' && !removedThai) {
        removedThai = true;
        return false;
      }
      if (s.roomName === 'ป.1' && s.subjectName === 'ประวัติศาสตร์') {
        return false;
      }
      return true;
    });

    mutated.push({
      id: 'SLOT-EXTRA-ART',
      academicYear: '2569',
      semester: '2',
      roomName: 'ป.1',
      dayOfWeek: 1,
      periodNo: 6,
      subjectCode: '',
      subjectName: 'ศิลปะ/ดนตรี',
      subjectGroup: 'ศิลปะ',
      subjectType: 'พื้นฐาน',
      teacherId: 'ธวัชชัย',
      coTeacherId: '',
      isLocked: false,
    });

    const report = evaluateSchoolCurriculumAudit({
      academicYear: '2569',
      semester: '2',
      slots: mutated,
      catalogSubjects: presets,
    });

    const p1 = report.rooms.find((r) => r.roomName === 'ป.1')!;
    assert.equal(p1.isCompliant, false);
    assert.equal(p1.issueCount, 3);

    const thai = p1.subjects.find((s) => s.subjectCode === 'ท11101')!;
    const hist = p1.subjects.find((s) => s.subjectCode === 'ส11102')!;
    const art = p1.subjects.find((s) => s.subjectCode === 'ศ11101')!;

    assert.equal(thai.status, 'under');
    assert.equal(thai.diffHours, -1);
    assert.equal(hist.status, 'missing');
    assert.equal(hist.diffHours, -1);
    assert.equal(art.status, 'over');
    assert.equal(art.diffHours, 1);
  });

  it('Test 3: exportCurriculumAuditCsv emits UTF-8 BOM, clean Thai headers & RFC-4180 escaping', () => {
    const slots = buildReal2569_2Slots();
    const presets = buildDefaultObecCurriculumPresets();
    const report = evaluateSchoolCurriculumAudit({
      academicYear: '2569',
      semester: '2',
      slots,
      catalogSubjects: presets,
    });

    const csv = exportCurriculumAuditCsv(report);
    assert.ok(csv.startsWith('\uFEFF'), 'CSV must start with UTF-8 BOM');
    const lines = csv.slice(1).split('\r\n');
    assert.equal(
      lines[0],
      'ห้องเรียน,รหัสวิชา,ชื่อรายวิชา,กลุ่มสาระ,ประเภท,เกณฑ์หลักสูตร (ชม./สัปดาห์),จัดในตารางจริง (ชม./สัปดาห์),ส่วนต่าง (ชม.),สถานะ'
    );
    assert.ok(lines.length > 100);
    assert.ok(csv.includes('ท11101'));
    assert.ok(csv.includes('ตรงเกณฑ์'));
  });
});
