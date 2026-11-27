import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getEducationLevelScore,
  sortEducationsHighestFirst,
  resolveHighestEducation,
  hydrateEducationsList,
  type EducationEntry,
} from '../education-ranking';
import { scoutToDb } from '@/lib/db/serverDb';

describe('Education Qualification Ranking & Backward Compatibility (education-ranking.ts)', () => {
  const belowBachelor: EducationEntry = {
    level: 'ต่ำกว่าปริญญาตรี',
    programYears: 'ปวส. / อนุปริญญา (2 ปี)',
    degree: 'ประกาศนียบัตรวิชาชีพชั้นสูง (ปวส.)',
    major: 'คอมพิวเตอร์ธุรกิจ',
    institute: 'วิทยาลัยเทคนิค',
    gradYear: '2550',
  };

  const bachelor: EducationEntry = {
    level: 'ปริญญาตรี',
    programYears: 'หลักสูตร 5 ปี',
    degree: 'ครุศาสตรบัณฑิต (ค.บ.)',
    major: 'คณิตศาสตร์',
    institute: 'มหาวิทยาลัยราชภัฏนครราชสีมา',
    gradYear: '2555',
  };

  const gradDip: EducationEntry = {
    level: 'ประกาศนียบัตรบัณฑิต (ป.บัณฑิต)',
    programYears: 'หลักสูตร 1 ปี',
    degree: 'ประกาศนียบัตรบัณฑิต (ป.บัณฑิต) สาขาวิชาชีพครู',
    major: 'วิชาชีพครู',
    institute: 'มหาวิทยาลัยราชภัฏนครราชสีมา',
    gradYear: '2557',
  };

  const master: EducationEntry = {
    level: 'ปริญญาโท',
    programYears: 'หลักสูตร 2 ปี',
    degree: 'ครุศาสตรมหาบัณฑิต (ค.ม.)',
    major: 'การบริหารการศึกษา',
    institute: 'มหาวิทยาลัยขอนแก่น',
    gradYear: '2562',
  };

  const doctorate: EducationEntry = {
    level: 'ปริญญาเอก',
    programYears: 'หลักสูตร 3 ปี',
    degree: 'ปรัชญาดุษฎีบัณฑิต (ปร.ด.)',
    major: 'การบริหารการศึกษา',
    institute: 'จุฬาลงกรณ์มหาวิทยาลัย',
    gradYear: '2567',
  };

  it('orders education levels strictly: ปริญญาเอก > ปริญญาโท > ป.บัณฑิต > ปริญญาตรี > ต่ำกว่าปริญญาตรี', () => {
    assert.ok(getEducationLevelScore(doctorate) > getEducationLevelScore(master));
    assert.ok(getEducationLevelScore(master) > getEducationLevelScore(gradDip));
    assert.ok(getEducationLevelScore(gradDip) > getEducationLevelScore(bachelor));
    assert.ok(getEducationLevelScore(bachelor) > getEducationLevelScore(belowBachelor));
  });

  it('sorts highest level first and breaks ties by latest graduation year', () => {
    const masterOlder: EducationEntry = { ...master, major: 'หลักสูตรและการสอน', gradYear: '2559' };
    const sorted = sortEducationsHighestFirst([bachelor, masterOlder, master]);
    assert.equal(sorted[0].gradYear, '2562');
    assert.equal(sorted[1].gradYear, '2559');
    assert.equal(sorted[2].level, 'ปริญญาตรี');
  });

  it('syncs primary fields from the highest qualification and clears cleanly when empty', () => {
    const resolved = resolveHighestEducation([bachelor, master]);
    assert.deepEqual(resolved, {
      educationLevel: 'ปริญญาโท',
      educationProgramYears: 'หลักสูตร 2 ปี',
      educationDegree: 'ครุศาสตรมหาบัณฑิต (ค.ม.)',
      major: 'การบริหารการศึกษา',
      educationInstitution: 'มหาวิทยาลัยขอนแก่น',
      educationGradYear: '2562',
    });

    assert.deepEqual(resolveHighestEducation([]), {
      educationLevel: '',
      educationProgramYears: '',
      educationDegree: '',
      major: '',
      educationInstitution: '',
      educationGradYear: '',
    });
  });

  it('hydrates legacy primary education fields when educations[] is empty', () => {
    const hydrated = hydrateEducationsList({
      educations: [],
      educationLevel: 'ปริญญาโท',
      educationProgramYears: 'หลักสูตร 2 ปี',
      educationDegree: 'ศิลปศาสตรมหาบัณฑิต (ศศ.ม.)',
      major: 'บรรณารักษศาสตร์และสารสนเทศศาสตร์',
      educationInstitution: 'มหาวิทยาลัยขอนแก่น',
      educationGradYear: '2560',
    });

    assert.equal(hydrated.length, 1);
    assert.equal(hydrated[0].level, 'ปริญญาโท');
    assert.equal(hydrated[0].major, 'บรรณารักษศาสตร์และสารสนเทศศาสตร์');
  });

  it('infers education level cleanly for legacy free-text entries without explicit level', () => {
    const legacyEntries: EducationEntry[] = [
      { degree: 'ค.บ.', major: 'ภาษาไทย', institute: 'มรภ.', gradYear: '2554' },
      { degree: 'ศษ.ม.', major: 'การบริหารการศึกษา', institute: 'มข.', gradYear: '2561' },
    ];
    const resolved = resolveHighestEducation(legacyEntries);
    assert.equal(resolved.educationLevel, 'ปริญญาโท');
    assert.equal(resolved.major, 'การบริหารการศึกษา');
  });

  it('persists order_number and issued_by in scoutToDb (Phase 7 DB Audit fix)', () => {
    const dbRow = scoutToDb({
      id: 'SCT-99',
      teacherId: 'TCH-001',
      teacherName: 'นายทดสอบ',
      position: 'ครู',
      qualification: 'วูดแบดจ์ 2 ท่อน (W.B.)',
      badgeLevel: 'วูดแบดจ์ 2 ท่อน (W.B.)',
      category: 'ลูกเสือสามัญ',
      certificateNo: 'ว.บ. 99/2568',
      orderNumber: 'คำสั่งที่ 12/2568',
      issueDate: '2025-05-01',
      issuedBy: 'สำนักงานลูกเสือแห่งชาติ',
    });
    assert.equal(dbRow.order_number, 'คำสั่งที่ 12/2568');
    assert.equal(dbRow.issued_by, 'สำนักงานลูกเสือแห่งชาติ');
  });
});
