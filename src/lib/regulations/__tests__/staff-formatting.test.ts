import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatStaffName,
  parseThaiName,
  extractThaiPrefix,
  KNOWN_MALE_STAFF_CODES,
} from '../staff-formatting';

describe('Staff Name Formatting Engine (Single Source of Truth)', () => {
  describe('Requirement 1: Male Personnel Prefix Handling', () => {
    it('correctly formats male staff from separate prefix, firstName, lastName', () => {
      const formatted = formatStaffName({
        id: 'EXE-001',
        prefix: 'นาย',
        firstName: 'ธีรศักดิ์',
        lastName: 'มโนธรรม',
      });
      assert.equal(formatted, 'นายธีรศักดิ์ มโนธรรม');
    });

    it('infers missing prefix "นาย" for known male staff codes when prefix and name lack prefix', () => {
      const formatted = formatStaffName({
        id: 'TCH-003',
        employeeCode: 'TCH-003',
        name: 'ธวัชชัย เหลืองโอฬาร',
      });
      assert.equal(formatted, 'นายธวัชชัย เหลืองโอฬาร');
    });

    it('infers "นาย" for TCH-004, TCH-009, TCH-013, and STF-002', () => {
      assert.equal(
        formatStaffName({ id: 'TCH-004', name: 'พันธ์ธนัต ภวฤทธิ์นาคินทร์' }),
        'นายพันธ์ธนัต ภวฤทธิ์นาคินทร์'
      );
      assert.equal(
        formatStaffName({ id: 'TCH-009', name: 'กิตติพณ พรหมทอง' }),
        'นายกิตติพณ พรหมทอง'
      );
      assert.equal(
        formatStaffName({ id: 'TCH-013', name: 'ชินวัจน์ มาตย์นอก' }),
        'นายชินวัจน์ มาตย์นอก'
      );
      assert.equal(
        formatStaffName({ id: 'STF-002', name: 'กำพล กักหมื่นไวย' }),
        'นายกำพล กักหมื่นไวย'
      );
    });

    it('attaches "นาย" to raw string matching known male names', () => {
      assert.equal(formatStaffName('ธีรศักดิ์ มโนธรรม'), 'นายธีรศักดิ์ มโนธรรม');
      assert.equal(formatStaffName('ธวัชชัย เหลืองโอฬาร'), 'นายธวัชชัย เหลืองโอฬาร');
    });
  });

  describe('Requirement 2: No Double Prefix (Idempotency)', () => {
    it('does not duplicate "นาย" when name already starts with "นาย"', () => {
      const formatted = formatStaffName({
        id: 'EXE-001',
        prefix: 'นาย',
        name: 'นายธีรศักดิ์ มโนธรรม',
      });
      assert.equal(formatted, 'นายธีรศักดิ์ มโนธรรม');
      assert.notEqual(formatted, 'นายนายธีรศักดิ์ มโนธรรม');
    });

    it('does not duplicate "นางสาว" for female staff having prefix in name', () => {
      const formatted = formatStaffName({
        id: 'TCH-005',
        prefix: 'นางสาว',
        name: 'นางสาวกุสุมาลย์กมล พราหมณ์ตะขบ',
      });
      assert.equal(formatted, 'นางสาวกุสุมาลย์กมล พราหมณ์ตะขบ');
      assert.notEqual(formatted, 'นางสาวนางสาวกุสุมาลย์กมล พราหมณ์ตะขบ');
    });

    it('does not duplicate "นาง" for female staff having prefix in name', () => {
      const formatted = formatStaffName({
        id: 'TCH-006',
        prefix: 'นาง',
        name: 'นางณิชกานต์ พลอยฉิมพลี',
      });
      assert.equal(formatted, 'นางณิชกานต์ พลอยฉิมพลี');
    });

    it('is strictly idempotent on repeated calls', () => {
      const once = formatStaffName('นายธีรศักดิ์ มโนธรรม');
      const twice = formatStaffName(once);
      const thrice = formatStaffName(twice);
      assert.equal(once, 'นายธีรศักดิ์ มโนธรรม');
      assert.equal(twice, 'นายธีรศักดิ์ มโนธรรม');
      assert.equal(thrice, 'นายธีรศักดิ์ มโนธรรม');
    });
  });

  describe('Requirement 3: Proper Spacing for Academic & Military Prefixes', () => {
    it('formats "ว่าที่ร้อยตรี" with 1 space separation', () => {
      const formatted = formatStaffName({
        prefix: 'ว่าที่ร้อยตรี',
        firstName: 'สมชาย',
        lastName: 'ชาญศึก',
      });
      assert.equal(formatted, 'ว่าที่ร้อยตรี สมชาย ชาญศึก');
    });

    it('formats "ว่าที่ ร.ต." with 1 space separation', () => {
      const formatted = formatStaffName({
        prefix: 'ว่าที่ ร.ต.',
        firstName: 'ประเสริฐ',
        lastName: 'กล้าหาญ',
      });
      assert.equal(formatted, 'ว่าที่ ร.ต. ประเสริฐ กล้าหาญ');
    });

    it('formats "ดร." with 1 space separation', () => {
      const formatted = formatStaffName({
        prefix: 'ดร.',
        firstName: 'สมบัติ',
        lastName: 'ว่องไว',
      });
      assert.equal(formatted, 'ดร. สมบัติ ว่องไว');
    });
  });

  describe('Requirement 4: Null, Undefined & Empty Safe Handling', () => {
    it('returns empty string for null and undefined without throwing or printing "null"', () => {
      assert.equal(formatStaffName(null), '');
      assert.equal(formatStaffName(undefined), '');
      assert.equal(formatStaffName(''), '');
    });

    it('safely handles object with null/undefined fields', () => {
      const formatted = formatStaffName({
        name: undefined,
        prefix: null as any,
        firstName: undefined,
        lastName: undefined,
      });
      assert.equal(formatted, '');
    });
  });

  describe('Helper: parseThaiName', () => {
    it('splits full name with attached prefix into prefix, firstName, lastName', () => {
      const parsed = parseThaiName('นายธีรศักดิ์ มโนธรรม');
      assert.equal(parsed.prefix, 'นาย');
      assert.equal(parsed.firstName, 'ธีรศักดิ์');
      assert.equal(parsed.lastName, 'มโนธรรม');
      assert.equal(parsed.fullName, 'นายธีรศักดิ์ มโนธรรม');
    });

    it('splits female name with "นางสาว"', () => {
      const parsed = parseThaiName('นางสาวกุสุมาลย์กมล พราหมณ์ตะขบ');
      assert.equal(parsed.prefix, 'นางสาว');
      assert.equal(parsed.firstName, 'กุสุมาลย์กมล');
      assert.equal(parsed.lastName, 'พราหมณ์ตะขบ');
      assert.equal(parsed.fullName, 'นางสาวกุสุมาลย์กมล พราหมณ์ตะขบ');
    });

    it('splits known male name lacking prefix and automatically infers "นาย"', () => {
      const parsed = parseThaiName('ธีรศักดิ์ มโนธรรม');
      assert.equal(parsed.prefix, 'นาย');
      assert.equal(parsed.firstName, 'ธีรศักดิ์');
      assert.equal(parsed.lastName, 'มโนธรรม');
      assert.equal(parsed.fullName, 'นายธีรศักดิ์ มโนธรรม');
    });
  });
});
