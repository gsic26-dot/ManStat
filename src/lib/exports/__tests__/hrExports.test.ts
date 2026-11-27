import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  UTF8_BOM,
  PDPA_MASKED_LABEL,
  escapeCsvCell,
  buildStaffDirectoryCsv,
  buildLicenseExpiryCsv,
} from '../hrExports';
import type { TeacherRecord, WorkloadItem } from '@/lib/data/schoolData';
import type { PersonLicenseRecord } from '@/lib/regulations/license-grouping';

describe('HR & License Expiry CSV Exports (hrExports.ts)', () => {
  const sampleTeacher: TeacherRecord = {
    id: 'TCH-002',
    employeeCode: 'TCH-002',
    name: 'นางสาวสมใจ ใจดี',
    prefix: 'นางสาว',
    firstName: 'สมใจ',
    lastName: 'ใจดี',
    position: 'ครู',
    academicStanding: 'ครูชำนาญการ (คศ. 2)',
    employmentType: 'civil_servant',
    department: 'กลุ่มสาระการเรียนรู้ภาษาไทย',
    division: 'ฝ่ายบริหารทั่วไป',
    major: 'ภาษาไทย',
    positionNo: '12345',
    startDate: '2015-05-01',
    birthDate: '1985-10-02', // Oct 2 -> 1985 + 60 + 1 + 543 = 2589
    educationLevel: 'ปริญญาโท',
    educationProgramYears: '2 ปี',
    educationDegree: 'ครุศาสตรมหาบัณฑิต (ค.ม.)',
    educationInstitution: 'จุฬาลงกรณ์มหาวิทยาลัย',
    educationGradYear: '2556',
    khurusaphaMemberType: 'สมาชิกสามัญ',
    khurusaphaMemberNo: 'KSP-998877',
    addressHouseNo: '12/3',
    addressMoo: '4',
    addressSoiRoad: 'ถ.มิตรภาพ',
    addressSubdistrict: 'ตะขบ',
    addressDistrict: 'ปักธงชัย',
    addressProvince: 'นครราชสีมา',
    addressPostalCode: '30150',
    email: 'somjai@school.ac.th',
    phone: '0891234567',
    maskedCitizenId: '1-xxxx-xxxxx-12-3',
    idCard: '1309900123456',
    emergencyContactName: 'นายสมชาย ใจดี',
    emergencyContactPhone: '0819998888',
    sickUsed: 0,
    personalUsed: 0,
    vacationUsed: 0,
    licenses: [],
    standings: [],
    educations: [],
  };

  const sampleWorkloads: WorkloadItem[] = [
    {
      id: 'WL-A',
      teacherId: 'TCH-002',
      category: 'งานบริหารและงานประจำฝ่าย/กลุ่มงาน',
      title: 'งานพัฒนาหลักสูตร',
      subGroupOrLevel: 'ฝ่ายบริหารวิชาการ',
      hoursPerWeek: 3,
      roleInTask: 'หัวหน้าฝ่าย',
      status: 'งานประจำต่อเนื่อง',
    },
    {
      id: 'WL-B',
      teacherId: 'TCH-002',
      category: 'งานบริหารและงานประจำฝ่าย/กลุ่มงาน',
      title: 'งานพัสดุ',
      subGroupOrLevel: 'ฝ่ายบริหารงบประมาณ',
      hoursPerWeek: 2,
      roleInTask: 'เจ้าหน้าที่พัสดุ',
      status: 'งานประจำต่อเนื่อง',
    },
  ];

  it('escapes commas, double quotes, newlines, and neutralizes Excel formula injection', () => {
    assert.equal(escapeCsvCell('ธรรมดา'), 'ธรรมดา');
    assert.equal(escapeCsvCell('ฝ่ายวิชาการ, ฝ่ายงบประมาณ'), '"ฝ่ายวิชาการ, ฝ่ายงบประมาณ"');
    assert.equal(escapeCsvCell('คำสั่ง "พิเศษ"'), '"คำสั่ง ""พิเศษ"""');
    assert.equal(escapeCsvCell('บรรทัด1\nบรรทัด2'), '"บรรทัด1\nบรรทัด2"');

    // Formula-injection neutralization
    assert.equal(escapeCsvCell('=SUM(A1:A5)'), "'=SUM(A1:A5)");
    assert.equal(escapeCsvCell('+1+2'), "'+1+2");
    assert.equal(escapeCsvCell('@SUM(A1)'), "'@SUM(A1)");
    assert.equal(escapeCsvCell('-CMD()'), "'-CMD()");

    // Legitimate dash and negative numbers remain intact
    assert.equal(escapeCsvCell('-'), '-');
    assert.equal(escapeCsvCell(-15), '-15');
    assert.equal(escapeCsvCell('-15'), '-15');
  });

  it('builds Staff Directory CSV with UTF-8 BOM, multi-division join, Thai address, retirement year, and NEVER leaks Citizen ID or emergency contact', () => {
    const csvAdmin = buildStaffDirectoryCsv([sampleTeacher], sampleWorkloads, { isAdmin: true });
    assert.ok(csvAdmin.startsWith(UTF8_BOM), 'Must start with UTF-8 BOM');
    assert.ok(csvAdmin.includes('"ฝ่ายบริหารวิชาการ, ฝ่ายบริหารงบประมาณ"'));
    assert.ok(csvAdmin.includes('2589')); // Oct 2 retirement year BE
    assert.ok(csvAdmin.includes('0891234567')); // Admin sees full phone
    assert.ok(csvAdmin.includes('12/3')); // Admin sees Thai address
    assert.ok(csvAdmin.includes('นครราชสีมา'));
    assert.ok(!csvAdmin.includes('1309900123456'), 'Must NEVER export raw 13-digit Citizen ID');
    assert.ok(!csvAdmin.includes('นายสมชาย ใจดี'), 'Must NEVER export emergency contact');
  });

  it('enforces PDPA masking on Staff Directory CSV for non-admin (Teacher) role', () => {
    const csvTeacher = buildStaffDirectoryCsv([sampleTeacher], sampleWorkloads, { isAdmin: false });
    assert.ok(csvTeacher.startsWith(UTF8_BOM));
    assert.ok(!csvTeacher.includes('0891234567'), 'Teacher export must mask raw phone number');
    assert.ok(csvTeacher.includes('089-***-4567'), 'Teacher export must include masked phone');
    assert.ok(!csvTeacher.includes('12/3'), 'Teacher export must mask residential address');
    assert.ok(csvTeacher.includes(PDPA_MASKED_LABEL), 'Teacher export must display PDPA masked label');
    assert.ok(csvTeacher.includes('2589'), 'Retirement fiscal year remains visible for planning');
  });

  it('builds License Expiry CSV sorted by urgency (EXPIRED -> EXPIRING_SOON -> MISSING -> VALID)', () => {
    const persons: PersonLicenseRecord[] = [
      {
        id: 'T1',
        employeeCode: 'TCH-001',
        name: 'นายปกติ ดีมาก',
        position: 'ครู',
        department: 'คณิตศาสตร์',
        branch: 'teaching',
        licensesCount: 1,
        licensesDisplay: 'ครู B-License',
        nearestExpiryDate: '2029-12-31',
        minDaysRemaining: 900,
        overallHealth: 'VALID',
        licenses: [
          {
            category: 'ครู',
            type: 'ใบอนุญาตประกอบวิชาชีพครู (ชั้นต้น / B-License)',
            shortType: 'ครู B-License',
            number: 'LIC-VALID-01',
            issueDate: '2024-01-01',
            expiryDate: '2029-12-31',
            daysRemaining: 900,
            health: 'VALID',
          },
        ],
      },
      {
        id: 'T2',
        employeeCode: 'TCH-002',
        name: 'นางสาวหมดอายุ เร่งด่วน',
        position: 'ครู',
        department: 'ภาษาไทย',
        branch: 'teaching',
        licensesCount: 2,
        licensesDisplay: 'ครู B-License',
        nearestExpiryDate: '2026-10-01',
        minDaysRemaining: -15,
        overallHealth: 'EXPIRED',
        licenses: [
          {
            category: 'ครู',
            type: 'ใบอนุญาตประกอบวิชาชีพครู',
            shortType: 'ใบอนุญาตครู',
            number: 'LIC-EXP-01',
            issueDate: '2021-10-01',
            expiryDate: '2026-10-01',
            daysRemaining: -15,
            health: 'EXPIRED',
          },
          {
            category: 'ผู้บริหาร',
            type: 'ใบอนุญาตประกอบวิชาชีพผู้บริหารสถานศึกษา',
            shortType: 'ใบอนุญาตผู้บริหาร',
            number: 'LIC-SOON-01',
            issueDate: '2022-01-01',
            expiryDate: '2027-01-15',
            daysRemaining: 45,
            health: 'EXPIRING_SOON',
          },
        ],
      },
      {
        id: 'T3',
        employeeCode: 'TCH-003',
        name: 'นายยังไม่มี ข้อมูล',
        position: 'ครูผู้ช่วย',
        department: 'วิทยาศาสตร์',
        branch: 'teaching',
        licensesCount: 0,
        licensesDisplay: '-',
        nearestExpiryDate: null,
        minDaysRemaining: null,
        overallHealth: 'MISSING',
        licenses: [],
      },
    ];

    const csv = buildLicenseExpiryCsv(persons);
    assert.ok(csv.startsWith(UTF8_BOM));
    const lines = csv.slice(1).split('\r\n');
    assert.equal(lines.length, 5); // 1 header + 4 rows

    // Row 1: EXPIRED (-15 days)
    assert.ok(lines[1].includes('LIC-EXP-01'));
    assert.ok(lines[1].includes('หมดอายุ'));
    assert.ok(lines[1].endsWith(',-15'));

    // Row 2: EXPIRING_SOON (45 days)
    assert.ok(lines[2].includes('LIC-SOON-01'));
    assert.ok(lines[2].includes('ใกล้หมดอายุ'));
    assert.ok(lines[2].endsWith(',45'));

    // Row 3: MISSING
    assert.ok(lines[3].includes('TCH-003'));
    assert.ok(lines[3].includes('ยังไม่มีข้อมูล'));

    // Row 4: VALID (900 days)
    assert.ok(lines[4].includes('LIC-VALID-01'));
    assert.ok(lines[4].includes('ปกติ'));
    assert.ok(lines[4].endsWith(',900'));
  });
});
