import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { deriveEmploymentType, formatEmploymentTypeLabel } from '../staff-sorting';
import { isCivilServantForSalary } from '@/lib/auth/roles';
import { INITIAL_TEACHERS } from '@/lib/data/schoolData';
import fs from 'fs';
import path from 'path';

describe('Employment Type Schema & Civil Servant Separation Engine', () => {
  describe('1. deriveEmploymentType Helper', () => {
    it('respects explicit employment_type field when present', () => {
      assert.equal(deriveEmploymentType({ employment_type: 'civil_servant' }), 'civil_servant');
      assert.equal(deriveEmploymentType({ employment_type: 'government_employee' }), 'government_employee');
      assert.equal(deriveEmploymentType({ employment_type: 'temporary_employee' }), 'temporary_employee');
    });

    it('respects camelCase employmentType fallback when present', () => {
      assert.equal(deriveEmploymentType({ employmentType: 'civil_servant' } as any), 'civil_servant');
      assert.equal(deriveEmploymentType({ employmentType: 'temporary_employee' } as any), 'temporary_employee');
    });

    it('infers temporary_employee from legacy position keywords when employment_type is missing', () => {
      assert.equal(deriveEmploymentType({ position: 'เจ้าหน้าที่ธุรการโรงเรียน' }), 'temporary_employee');
      assert.equal(deriveEmploymentType({ position: 'นักการภารโรง' }), 'temporary_employee');
      assert.equal(deriveEmploymentType({ position: 'พี่เลี้ยงเด็กพิการ' }), 'temporary_employee');
      assert.equal(deriveEmploymentType({ position: 'ลูกจ้างชั่วคราว' }), 'temporary_employee');
      assert.equal(deriveEmploymentType({ position: 'จ้างเหมาบริการ' }), 'temporary_employee');
    });

    it('infers government_employee from legacy position keywords', () => {
      assert.equal(deriveEmploymentType({ position: 'พนักงานราชการทั่วไป' }), 'government_employee');
    });

    it('defaults standard teachers and directors to civil_servant', () => {
      assert.equal(deriveEmploymentType({ position: 'ผู้อำนวยการโรงเรียน' }), 'civil_servant');
      assert.equal(deriveEmploymentType({ position: 'ครูชำนาญการพิเศษ' }), 'civil_servant');
      assert.equal(deriveEmploymentType({ position: 'ครู คศ. 1' }), 'civil_servant');
      assert.equal(deriveEmploymentType({ position: 'ครูผู้ช่วย' }), 'civil_servant');
    });
  });

  describe('2. isCivilServantForSalary Data-Driven Verification', () => {
    it('strictly permits civil_servant staff', () => {
      const teacher = {
        id: 'TCH-001',
        employeeCode: 'TCH-001',
        name: 'ครูทดสอบ',
        position: 'ครูชำนาญการพิเศษ',
        employment_type: 'civil_servant',
      } as any;
      assert.equal(isCivilServantForSalary(teacher), true);
    });

    it('strictly rejects temporary_employee and government_employee staff', () => {
      const contractStaff = {
        id: 'STF-001',
        employeeCode: 'STF-001',
        name: 'เจ้าหน้าที่ธุรการ',
        position: 'เจ้าหน้าที่ธุรการโรงเรียน',
        employment_type: 'temporary_employee',
      } as any;
      assert.equal(isCivilServantForSalary(contractStaff), false);

      const govEmployee = {
        id: 'STF-099',
        employeeCode: 'STF-099',
        name: 'พนักงานราชการ',
        position: 'พนักงานราชการ',
        employment_type: 'government_employee',
      } as any;
      assert.equal(isCivilServantForSalary(govEmployee), false);
    });
  });

  describe('3. Ground-Truth Data Integrity (INITIAL_TEACHERS & manstat_db.json)', () => {
    it('verifies INITIAL_TEACHERS has exact 12 civil servants and 3 temporary employees', () => {
      assert.equal(INITIAL_TEACHERS.length, 15);

      const civilServants = INITIAL_TEACHERS.filter((t) => t.employment_type === 'civil_servant');
      const tempEmployees = INITIAL_TEACHERS.filter((t) => t.employment_type === 'temporary_employee');

      assert.equal(civilServants.length, 12, 'Must have exactly 12 civil servants');
      assert.equal(tempEmployees.length, 3, 'Must have exactly 3 temporary/contract employees');

      // Verify specific expected IDs
      const tempIds = tempEmployees.map((t) => t.id).sort();
      assert.deepEqual(tempIds, ['STF-001', 'STF-002', 'TCH-014']);
    });

    it('verifies manstat_db.json has exact 12 civil servants and 3 temporary employees', () => {
      const dbPath = path.resolve(process.cwd(), 'data/manstat_db.json');
      const raw = fs.readFileSync(dbPath, 'utf8');
      const db = JSON.parse(raw);

      assert.equal(db.teachers.length, 15);

      const civilServants = db.teachers.filter((t: any) => t.employment_type === 'civil_servant');
      const tempEmployees = db.teachers.filter((t: any) => t.employment_type === 'temporary_employee');

      assert.equal(civilServants.length, 12, 'manstat_db.json must have exactly 12 civil servants');
      assert.equal(tempEmployees.length, 3, 'manstat_db.json must have exactly 3 temporary employees');
    });
  });

  describe('4. Official Thai Labeling (formatEmploymentTypeLabel)', () => {
    it('formats correct Thai terminology without emojis', () => {
      assert.equal(formatEmploymentTypeLabel('civil_servant'), 'ข้าราชการครูและบุคลากรทางการศึกษา');
      assert.equal(formatEmploymentTypeLabel('government_employee'), 'พนักงานราชการ');
      assert.equal(formatEmploymentTypeLabel('temporary_employee'), 'ลูกจ้างชั่วคราว / จ้างเหมาบริการ');
    });
  });
});
