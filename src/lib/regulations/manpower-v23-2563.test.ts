import { describe, it } from 'node:test';
import assert from 'node:assert';
import { calculateManpowerV23 } from './manpower-v23-2563';

describe('เกณฑ์อัตรากำลัง ว 23/2563 (ก.ค.ศ.) ครบทั้ง 3 สายงาน', () => {
  it('1. เคสขยายโอกาสขนาดเล็ก (นร. 92 คน = อ.1–ป.6 75 คน + ม.ต้น 17 คน 3 ห้อง)', () => {
    // อ.1–ป.6 รวม 75 คน (อยู่ในช่วง 41-80 -> ครู 6 อัตรา)
    // ม.ต้น 3 ห้อง -> (3 * 30)/20 = 4.5 อัตรา
    // รวม 6 + 4.5 = 10.5 -> ปัดเศษเป็น 11 อัตรา
    // นร. 92 คน (ช่วง 41-119) -> ผอ. 1, รอง ผอ. 0
    // สนับสนุน -> 1 อัตรา (พนักงานราชการ/อัตราจ้าง)
    const result = calculateManpowerV23({
      kStudents: 15,
      kRooms: 2,
      pStudents: 60,
      pRooms: 6,
      mLowerStudents: 17,
      mLowerRooms: 3,
    });

    assert.strictEqual(result.totalStudents, 92);
    assert.strictEqual(result.totalRooms, 11);
    assert.strictEqual(result.director, 1, 'ผอ. ต้องได้ 1 อัตรา');
    assert.strictEqual(result.viceDirector, 0, 'รอง ผอ. ต้องได้ 0 อัตรา');
    assert.strictEqual(result.teachers, 11, 'ครูผู้สอนต้องได้ 11 อัตรา (6 + 4.5 = 10.5 -> 11)');
    assert.strictEqual(result.supportStaff, 1, 'สายสนับสนุนต้องได้ 1 อัตรา');
    assert.strictEqual(result.supportType, 'contract_staff');
    assert.strictEqual(result.summaryManpower, 'ผอ. 1 · ครู 11 · สนับสนุน 1');
  });

  it('2. เคสประถมขนาดเล็ก (นร. 94 คน = อนุบาล 19 + ประถม 75, ม.ต้น 0)', () => {
    // kpStudents = 94 คน (อยู่ในช่วง 81-119 -> ครู 8 อัตรา)
    // ผอ. 1, รอง ผอ. 0
    // สนับสนุน 1 (พนักงานราชการ/อัตราจ้าง)
    const result = calculateManpowerV23({
      kStudents: 19,
      kRooms: 2,
      pStudents: 75,
      pRooms: 6,
      mLowerStudents: 0,
      mLowerRooms: 0,
    });

    assert.strictEqual(result.totalStudents, 94);
    assert.strictEqual(result.totalRooms, 8);
    assert.strictEqual(result.director, 1);
    assert.strictEqual(result.viceDirector, 0);
    assert.strictEqual(result.teachers, 8);
    assert.strictEqual(result.supportStaff, 1);
    assert.strictEqual(result.summaryManpower, 'ผอ. 1 · ครู 8 · สนับสนุน 1');
  });

  it('3. เคสขนาดกลางล่าง (นร. 180 คน = อนุบาล 3 ห้อง + ประถม 6 ห้อง + ม.ต้น 3 ห้อง)', () => {
    // นร. 180 คน (>= 120 -> คำนวณชั่วโมงสอนทุกระดับชั้น)
    // ((3 * 20) + (6 * 25) + (3 * 30)) / 20 = (60 + 150 + 90) / 20 = 300 / 20 = 15 ครู
    // ผอ. 1, รอง ผอ. 1 (ช่วง 120-719)
    // สนับสนุน 1 (พนักงานราชการ/อัตราจ้าง ช่วง 1-359 คน)
    const result = calculateManpowerV23({
      kStudents: 30,
      kRooms: 3,
      pStudents: 90,
      pRooms: 6,
      mLowerStudents: 60,
      mLowerRooms: 3,
    });

    assert.strictEqual(result.totalStudents, 180);
    assert.strictEqual(result.totalRooms, 12);
    assert.strictEqual(result.director, 1);
    assert.strictEqual(result.viceDirector, 1);
    assert.strictEqual(result.teachers, 15);
    assert.strictEqual(result.supportStaff, 1);
    assert.strictEqual(result.supportType, 'contract_staff');
    assert.strictEqual(result.summaryManpower, 'ผอ. 1 · รอง ผอ. 1 · ครู 15 · สนับสนุน 1');
  });

  it('4. เคสขนาดกลางบน (นร. 520 คน = อนุบาล 4 ห้อง + ประถม 15 ห้อง)', () => {
    // นร. 520 คน (>= 120 -> คำนวณชั่วโมงสอน)
    // ((4 * 20) + (15 * 25)) / 20 = (80 + 375) / 20 = 455 / 20 = 22.75 -> ปัดเศษเป็น 23 ครู
    // ผอ. 1, รอง ผอ. 1 (ช่วง 120-719)
    // สนับสนุน 1 อัตรา ตำแหน่ง ม.38 ค.(2) (ช่วง 360-719 คน)
    const result = calculateManpowerV23({
      kStudents: 100,
      kRooms: 4,
      pStudents: 420,
      pRooms: 15,
    });

    assert.strictEqual(result.totalStudents, 520);
    assert.strictEqual(result.totalRooms, 19);
    assert.strictEqual(result.director, 1);
    assert.strictEqual(result.viceDirector, 1);
    assert.strictEqual(result.teachers, 23);
    assert.strictEqual(result.supportStaff, 1);
    assert.strictEqual(result.supportType, 'civil_service_38_c_2');
    assert.strictEqual(result.summaryManpower, 'ผอ. 1 · รอง ผอ. 1 · ครู 23 · สนับสนุน 1');
  });

  it('5. เคส 1–40 คน: เทียบพื้นที่ปกติ (ผอ. 0) กับพื้นที่พิเศษ (ผอ. 1)', () => {
    // พื้นที่ปกติ (isSpecialArea: false)
    const normalResult = calculateManpowerV23({
      kStudents: 10,
      kRooms: 1,
      pStudents: 20,
      pRooms: 2,
      isSpecialArea: false,
    });
    assert.strictEqual(normalResult.director, 0, 'พื้นที่ปกติไม่เกิน 40 คน ต้องไม่มี ผอ.');
    assert.strictEqual(normalResult.teachers, 3, 'ห้องเรียน 3 ห้อง ต้องได้ครู 3 อัตรา');

    // พื้นที่พิเศษ (isSpecialArea: true)
    const specialResult = calculateManpowerV23({
      kStudents: 10,
      kRooms: 1,
      pStudents: 20,
      pRooms: 2,
      isSpecialArea: true,
    });
    assert.strictEqual(specialResult.director, 1, 'พื้นที่พิเศษไม่เกิน 40 คน มี ผอ. ได้ 1 อัตรา');
    assert.strictEqual(specialResult.teachers, 3);
  });
});
