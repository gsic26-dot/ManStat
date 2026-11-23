import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatLicenseShortName,
  isEligibleForLicenseRegistry,
  buildPersonLicenseRecord,
  groupAndSortLicenseRegistry,
  matchesHealthFilter,
} from './license-grouping';
import type { TeacherRecord } from '@/lib/data/schoolData';
import { INITIAL_TEACHERS } from '@/lib/data/schoolData';

describe('License Grouping & Registry Engine (Khurusapha Standards)', () => {
  const fixedReferenceDate = '2026-11-21';

  describe('formatLicenseShortName', () => {
    it('formats administrator licenses to concise title', () => {
      assert.equal(
        formatLicenseShortName('ใบอนุญาตประกอบวิชาชีพผู้บริหารสถานศึกษา'),
        'ใบอนุญาตผู้บริหาร'
      );
      assert.equal(
        formatLicenseShortName('ใบอนุญาตประกอบวิชาชีพผู้บริหารการศึกษา'),
        'ใบอนุญาตผู้บริหาร'
      );
    });

    it('formats teaching licenses by class tier without parentheses', () => {
      assert.equal(
        formatLicenseShortName('B License (ใบอนุญาตประกอบวิชาชีพครู ชั้นต้น)'),
        'ครู B-License'
      );
      assert.equal(
        formatLicenseShortName('ใบอนุญาตประกอบวิชาชีพครู ชั้นต้น (B-License)'),
        'ครู B-License'
      );
      assert.equal(
        formatLicenseShortName('ใบอนุญาตปฏิบัติหน้าที่ครู (P-License)'),
        'ครู P-License'
      );
      assert.equal(
        formatLicenseShortName('ใบอนุญาตประกอบวิชาชีพครู ชั้นสูง (A-License)'),
        'ครู A-License'
      );
      assert.equal(
        formatLicenseShortName('ใบอนุญาตประกอบวิชาชีพครู (รูปแบบเดิม)'),
        'ใบอนุญาตครู'
      );
    });

    it('formats education supervisor license', () => {
      assert.equal(
        formatLicenseShortName('ใบอนุญาตประกอบวิชาชีพศึกษานิเทศก์'),
        'ใบอนุญาต ศน.'
      );
    });
  });

  describe('Case 1: Multiple Licenses Grouped into 1 Row with Nearest Expiry & Most Urgent Status', () => {
    it('groups staff with 2 licenses into 1 row, selecting nearest expiry and most urgent status', () => {
      // EXE-001 has 2 licenses:
      // 1. B-License expiring 2030-08-25
      // 2. Administrator expiring 2029-11-11 (nearest!)
      const exeTeacher = INITIAL_TEACHERS.find((t) => t.id === 'EXE-001');
      assert.ok(exeTeacher, 'EXE-001 must exist in seed teachers');

      const record = buildPersonLicenseRecord(exeTeacher, fixedReferenceDate);

      // Verify 1 row represents 2 licenses
      assert.equal(record.licensesCount, 2);
      assert.equal(record.licenses.length, 2);

      // Verify concise combined display joined with ' · '
      assert.equal(record.licensesDisplay, 'ใบอนุญาตผู้บริหาร · ครู B-License');

      // Verify nearest expiry is 2029-11-11 with exactly 1,086 days remaining
      assert.equal(record.nearestExpiryDate, '2029-11-11');
      assert.equal(record.minDaysRemaining, 1086);

      // Both licenses are > 90 days, so overall health is VALID
      assert.equal(record.overallHealth, 'VALID');
    });

    it('prioritizes most urgent status (EXPIRED > EXPIRING_SOON > VALID)', () => {
      const mockTeacher: TeacherRecord = {
        id: 'TEST-001',
        employeeCode: 'TCH-TEST',
        name: 'นายทดสอบ ว่องไว',
        prefix: 'นาย',
        firstName: 'ทดสอบ',
        lastName: 'ว่องไว',
        position: 'ครู',
        academicStanding: 'ครูชำนาญการ',
        department: 'คณิตศาสตร์',
        division: 'กลุ่มสาระการเรียนรู้',
        startDate: '2020-01-01',
        email: 'test@school.ac.th',
        phone: '0812345678',
        maskedCitizenId: '1-1001-*****-**-1',
        idCard: '1100100123456',
        sickUsed: 0,
        personalUsed: 0,
        vacationUsed: 0,
        standings: [],
        educations: [],
        licenses: [
          {
            category: 'ครู',
            type: 'ใบอนุญาตประกอบวิชาชีพครู ชั้นต้น (B-License)',
            number: 'B001',
            issueDate: '2021-01-01',
            expiryDate: '2026-12-01', // Expiring in 10 days! (EXPIRING_SOON)
          },
          {
            category: 'ครู',
            type: 'ใบอนุญาตปฏิบัติหน้าที่ครู (P-License)',
            number: 'P001',
            issueDate: '2019-01-01',
            expiryDate: '2025-01-01', // Already expired! (EXPIRED)
          },
        ],
      };

      const record = buildPersonLicenseRecord(mockTeacher, fixedReferenceDate);
      // Because P001 is expired, overallHealth must be EXPIRED
      assert.equal(record.overallHealth, 'EXPIRED');
      assert.equal(record.nearestExpiryDate, '2025-01-01');
      assert.ok(record.minDaysRemaining! < 0);
    });
  });

  describe('Case 2: Teaching Staff with 0 Licenses', () => {
    it('includes teaching staff without licenses with status MISSING (ยังไม่บันทึกข้อมูล)', () => {
      const tch004 = INITIAL_TEACHERS.find((t) => t.id === 'TCH-004');
      assert.ok(tch004, 'TCH-004 must exist');

      assert.equal(isEligibleForLicenseRegistry(tch004), true);

      const record = buildPersonLicenseRecord(tch004, fixedReferenceDate);
      assert.equal(record.licensesCount, 0);
      assert.equal(record.licensesDisplay, '-');
      assert.equal(record.nearestExpiryDate, null);
      assert.equal(record.minDaysRemaining, null);
      assert.equal(record.overallHealth, 'MISSING');
    });
  });

  describe('Case 3: Support Staff Inclusion & Exclusion', () => {
    it('includes eligible support staff (clerk and special-needs aide) and strictly excludes janitor', () => {
      const stf001 = INITIAL_TEACHERS.find((t) => t.id === 'STF-001');
      assert.ok(stf001, 'STF-001 (ธุรการ) must exist');
      // STF-001 is included in the registry for education license tracking
      assert.equal(isEligibleForLicenseRegistry(stf001), true);

      const tch014 = INITIAL_TEACHERS.find((t) => t.id === 'TCH-014');
      assert.ok(tch014, 'TCH-014 (พี่เลี้ยงเด็กพิการ) must exist');
      // TCH-014 is included in the registry for education license tracking
      assert.equal(isEligibleForLicenseRegistry(tch014), true);

      const stf002 = INITIAL_TEACHERS.find((t) => t.id === 'STF-002');
      assert.ok(stf002, 'STF-002 (ภารโรง) must exist');
      // STF-002 (ภารโรง) is strictly excluded from education license registry
      assert.equal(isEligibleForLicenseRegistry(stf002), false);
    });

    it('includes support staff if they actually have a recorded license', () => {
      const supportWithLicense: TeacherRecord = {
        id: 'STF-999',
        employeeCode: 'STF-999',
        name: 'นายสมบัติ ใจดี',
        prefix: 'นาย',
        firstName: 'สมบัติ',
        lastName: 'ใจดี',
        position: 'พนักงานขับรถ',
        academicStanding: '-',
        department: 'สายงานบริหารและสนับสนุนการศึกษา',
        division: 'สนับสนุน',
        startDate: '2020-01-01',
        email: 'sombat@school.ac.th',
        phone: '0812345678',
        maskedCitizenId: '1-1001-*****-**-1',
        idCard: '1100100123456',
        sickUsed: 0,
        personalUsed: 0,
        vacationUsed: 0,
        standings: [],
        educations: [],
        licenses: [
          {
            category: 'ครู',
            type: 'ใบอนุญาตประกอบวิชาชีพครู ชั้นต้น (B-License)',
            number: 'B999',
            issueDate: '2024-01-01',
            expiryDate: '2029-01-01',
          },
        ],
      };

      assert.equal(isEligibleForLicenseRegistry(supportWithLicense), true);
    });
  });

  describe('Case 4: Registry Statistics & Filter Card Functionality', () => {
    it('computes stats correctly: counts licenses in ฉบับ and missing staff in ท่าน', () => {
      const { allEligiblePersons, stats } = groupAndSortLicenseRegistry(
        INITIAL_TEACHERS,
        fixedReferenceDate
      );

      // EXE-001 has 2 licenses, others currently have 0 in seed
      assert.equal(stats.totalLicenses, 2);
      assert.equal(stats.validLicenses, 2);
      assert.equal(stats.expiringSoonLicenses, 0);
      assert.equal(stats.expiredLicenses, 0);

      // Total INITIAL_TEACHERS = 15 (1 EXE, 11 Teaching, 3 Support)
      // Eligible = 1 EXE + 11 Teaching + 2 Support (STF-001, TCH-014) = 14 persons (STF-002 janitor excluded).
      // EXE has 2 licenses, remaining 13 have 0 licenses in seed.
      assert.equal(allEligiblePersons.length, 14);
      assert.equal(stats.missingStaffCount, 13);
    });

    it('filters records properly using matchesHealthFilter', () => {
      const { allEligiblePersons } = groupAndSortLicenseRegistry(
        INITIAL_TEACHERS,
        fixedReferenceDate
      );

      const exe = allEligiblePersons.find((p) => p.id === 'EXE-001')!;
      const tch = allEligiblePersons.find((p) => p.id === 'TCH-004')!;

      // Filter ALL: both match
      assert.equal(matchesHealthFilter(exe, 'ALL'), true);
      assert.equal(matchesHealthFilter(tch, 'ALL'), true);

      // Filter VALID: EXE matches, TCH does not
      assert.equal(matchesHealthFilter(exe, 'VALID'), true);
      assert.equal(matchesHealthFilter(tch, 'VALID'), false);

      // Filter MISSING: TCH matches, EXE does not
      assert.equal(matchesHealthFilter(exe, 'MISSING'), false);
      assert.equal(matchesHealthFilter(tch, 'MISSING'), true);
    });
  });
});
