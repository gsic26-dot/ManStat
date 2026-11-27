import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MAJOR_GROUPS, STANDARD_APPOINTMENT_MAJORS, isStandardMajor } from '../constants/majors';
import {
  formatHighestQualification,
  formatThaiAddress,
  getProgramYearsForLevel,
  getDegreesForLevel,
} from '../constants/qualifications';
import {
  getThaiProvinces,
  getDistrictsByProvince,
  getSubdistrictsByDistrict,
  getPostalCode,
} from '../constants/thaiAddress';

describe('Phase 1 HR Standards: Majors, Qualifications & Offline Thai Geography', () => {
  it('provides 8 standard major groups covering 95+ official ก.ค.ศ. majors', () => {
    assert.equal(MAJOR_GROUPS.length, 8);
    assert.ok(
      STANDARD_APPOINTMENT_MAJORS.length >= 95,
      `Expected >= 95 majors, got ${STANDARD_APPOINTMENT_MAJORS.length}`
    );
    assert.equal(isStandardMajor('การบริหารการศึกษา'), true);
    assert.equal(isStandardMajor('คณิตศาสตร์'), true);
    assert.equal(isStandardMajor('สาขาเฉพาะทางที่ไม่มีในรายการ'), false);
  });

  it('filters program years and degrees accurately by education level', () => {
    assert.ok(getProgramYearsForLevel('ปริญญาตรี').includes('หลักสูตร 5 ปี'));
    assert.ok(getDegreesForLevel('ปริญญาตรี').includes('ครุศาสตรบัณฑิต (ค.บ.)'));
    assert.ok(getDegreesForLevel('ปริญญาโท').includes('ครุศาสตรมหาบัณฑิต (ค.ม.)'));
  });

  it('formats highest qualification cleanly for Staff Directory display', () => {
    const text = formatHighestQualification({
      educationLevel: 'ปริญญาตรี',
      educationProgramYears: 'หลักสูตร 5 ปี',
      educationDegree: 'ครุศาสตรบัณฑิต (ค.บ.)',
      major: 'คณิตศาสตร์',
    });
    assert.equal(text, 'ครุศาสตรบัณฑิต (ค.บ.) หลักสูตร 5 ปี • วิชาเอกคณิตศาสตร์');
  });

  it('loads all 77 Thai provinces offline and cascades Nakhon Ratchasima -> Pak Thong Chai -> Takhob -> 30150', () => {
    const provinces = getThaiProvinces();
    assert.equal(provinces.length, 77);
    assert.ok(provinces.includes('นครราชสีมา'));
    assert.ok(provinces.includes('กรุงเทพมหานคร'));

    const districts = getDistrictsByProvince('นครราชสีมา');
    assert.ok(districts.includes('ปักธงชัย'));

    const subdistricts = getSubdistrictsByDistrict('นครราชสีมา', 'ปักธงชัย');
    assert.ok(subdistricts.includes('ตะขบ'));

    const zip = getPostalCode('นครราชสีมา', 'ปักธงชัย', 'ตะขบ');
    assert.equal(zip, '30150');
  });

  it('formats standard Thai addresses correctly for provincial and Bangkok addresses', () => {
    assert.equal(
      formatThaiAddress({
        addressHouseNo: '99/1',
        addressMoo: '3',
        addressSubdistrict: 'ตะขบ',
        addressDistrict: 'ปักธงชัย',
        addressProvince: 'นครราชสีมา',
        addressPostalCode: '30150',
      }),
      '99/1 หมู่ 3 ต.ตะขบ อ.ปักธงชัย จ.นครราชสีมา 30150'
    );

    assert.equal(
      formatThaiAddress({
        addressHouseNo: '10',
        addressSoiRoad: 'ถ.สุขุมวิท',
        addressSubdistrict: 'คลองเตย',
        addressDistrict: 'คลองเตย',
        addressProvince: 'กรุงเทพมหานคร',
        addressPostalCode: '10110',
      }),
      '10 ถ.สุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพมหานคร 10110'
    );
  });
});
