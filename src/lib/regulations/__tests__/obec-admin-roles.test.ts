import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  OBEC_ADMIN_ROLE_PRESETS,
  ADHOC_PROJECT_PRESETS,
  OBEC_SYSTEM_CATALOG,
} from '../obec-admin-roles';
import { STANDARD_DIVISIONS } from '@/lib/staffDivisions';
import { workloadToDb, workloadFromDb } from '@/lib/db/serverDb';

describe('OBEC Administrative Roles & Reporting Systems Catalog (obec-admin-roles.ts)', () => {
  it('covers all 4 official OBEC divisions with presets and non-empty defaultScope', () => {
    for (const div of STANDARD_DIVISIONS) {
      const divPresets = OBEC_ADMIN_ROLE_PRESETS.filter((p) => p.division === div);
      assert.ok(divPresets.length >= 5, `Division ${div} should have standardized presets`);
    }

    for (const preset of [...OBEC_ADMIN_ROLE_PRESETS, ...ADHOC_PROJECT_PRESETS]) {
      assert.ok(preset.roleTitle.trim().length > 0, `Preset ${preset.id} must have roleTitle`);
      assert.ok(preset.defaultScope.trim().length >= 10, `Preset ${preset.id} must have non-empty defaultScope`);
    }
  });

  it('strictly excludes illegal day/night teacher guard duty per Cabinet Resolution Jan 23, 2024', () => {
    const allTexts = [...OBEC_ADMIN_ROLE_PRESETS, ...ADHOC_PROJECT_PRESETS].map(
      (p) => `${p.roleTitle} ${p.defaultScope}`
    );
    for (const text of allTexts) {
      assert.ok(!text.includes('เวรรักษาการณ์'), `Illegal guard duty found: ${text}`);
      assert.ok(!text.includes('กลางวัน/กลางคืน'), `Illegal day/night duty found: ${text}`);
    }
  });

  it('contains no duplicated parenthetical labels such as (งานแนะแนว) (งานแนะแนว)', () => {
    for (const preset of [...OBEC_ADMIN_ROLE_PRESETS, ...ADHOC_PROJECT_PRESETS]) {
      assert.ok(
        !/\([^)]+\)\s*\([^)]+\)/.test(preset.roleTitle),
        `Potential duplicate parenthetical in: ${preset.roleTitle}`
      );
      assert.ok(
        !preset.roleTitle.includes('(งานแนะแนว) (งานแนะแนว)'),
        `Duplicate guidance text in: ${preset.roleTitle}`
      );
    }
  });

  it('ensures every system tag referenced by a preset exists in OBEC_SYSTEM_CATALOG', () => {
    const validCodes = new Set(OBEC_SYSTEM_CATALOG.map((s) => s.code));
    for (const preset of [...OBEC_ADMIN_ROLE_PRESETS, ...ADHOC_PROJECT_PRESETS]) {
      for (const sysCode of preset.obecSystems) {
        assert.ok(
          validCodes.has(sysCode),
          `Unknown OBEC system code "${sysCode}" in preset ${preset.id}`
        );
      }
    }
  });

  it('maps Phase 8 workload fields (academicYear, scopeDescription, obecSystems, coResponsibleIds) round-trip in serverDb', () => {
    const dbRow = workloadToDb({
      id: 'WL-P8-01',
      teacherId: 'TCH-002',
      category: 'งานบริหารและงานประจำฝ่าย/กลุ่มงาน',
      title: 'งานสารสนเทศ ข้อมูลนักเรียนรายบุคคล และเทคโนโลยี (ICT)',
      subGroupOrLevel: 'ฝ่ายบริหารทั่วไป',
      hoursPerWeek: 3,
      roleInTask: 'ผู้รับผิดชอบหลัก / เจ้าหน้าที่',
      orderOrRef: 'คำสั่งที่ 15/2569',
      status: 'กำลังดำเนินการ',
      academicYear: '2569',
      scopeDescription: 'จัดเก็บและยืนยันข้อมูล DMC 10 มิ.ย. / 10 พ.ย.',
      obecSystems: ['DMC', 'EMIS', 'OBECict'],
      coResponsibleIds: ['TCH-003', 'TCH-004'],
    });

    assert.equal(dbRow.academic_year, '2569');
    assert.equal(dbRow.scope_description, 'จัดเก็บและยืนยันข้อมูล DMC 10 มิ.ย. / 10 พ.ย.');
    assert.deepEqual(dbRow.obec_systems, ['DMC', 'EMIS', 'OBECict']);
    assert.deepEqual(dbRow.co_responsible_ids, ['TCH-003', 'TCH-004']);

    const restored = workloadFromDb(dbRow);
    assert.equal(restored.academicYear, '2569');
    assert.equal(restored.scopeDescription, 'จัดเก็บและยืนยันข้อมูล DMC 10 มิ.ย. / 10 พ.ย.');
    assert.deepEqual(restored.obecSystems, ['DMC', 'EMIS', 'OBECict']);
    assert.deepEqual(restored.coResponsibleIds, ['TCH-003', 'TCH-004']);
  });
});
