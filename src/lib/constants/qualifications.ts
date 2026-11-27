/**
 * ============================================================================
 * ManStat: Official ก.ค.ศ. / สพฐ. Qualification Constants & Formatting
 * ============================================================================
 * Provides structured dropdown options for:
 * 1. Education Level (ระดับวุฒิการศึกษา)
 * 2. Program Duration / Years (หลักสูตร จำนวนปี) — filtered by level
 * 3. Official Degree Name (ชื่อคุณวุฒิ / ปริญญา) — filtered by level
 * 4. Khurusapha Membership Types (ประเภทสมาชิกคุรุสภา)
 * ============================================================================
 */

export const CUSTOM_OPTION_LABEL = 'อื่นๆ (ระบุเอง)' as const;

export const KHURUSAPHA_MEMBER_TYPES = [
  'สมาชิกสามัญ',
  'สมาชิกวิสามัญ',
  'สมาชิกกิตติมศักดิ์',
  'ไม่เป็นสมาชิก',
] as const;

export const EDUCATION_LEVELS = [
  'ต่ำกว่าปริญญาตรี',
  'ปริญญาตรี',
  'ประกาศนียบัตรบัณฑิต (ป.บัณฑิต)',
  'ปริญญาโท',
  'ปริญญาเอก',
] as const;

export type EducationLevel = (typeof EDUCATION_LEVELS)[number];

export const PROGRAM_YEARS_BY_LEVEL: Record<EducationLevel, readonly string[]> = {
  'ต่ำกว่าปริญญาตรี': [
    'ม.6 / เทียบเท่า',
    'ปวช. (3 ปี)',
    'ปวส. / อนุปริญญา (2 ปี)',
  ],
  'ปริญญาตรี': [
    'หลักสูตร 4 ปี',
    'หลักสูตร 5 ปี',
    'หลักสูตร 4 ปี + ป.บัณฑิต',
    'หลักสูตรต่อเนื่อง 2 ปี',
    'หลักสูตร 6 ปี',
  ],
  'ประกาศนียบัตรบัณฑิต (ป.บัณฑิต)': [
    'หลักสูตร 1 ปี',
    'หลักสูตร 1.5 ปี',
  ],
  'ปริญญาโท': [
    'หลักสูตร 2 ปี',
    'หลักสูตร 2.5–3 ปี',
  ],
  'ปริญญาเอก': [
    'หลักสูตร 3 ปี',
    'หลักสูตร 4 ปี',
  ],
};

export const DEGREES_BY_LEVEL: Record<EducationLevel, readonly string[]> = {
  'ต่ำกว่าปริญญาตรี': [
    'มัธยมศึกษาตอนปลาย (ม.6)',
    'ประกาศนียบัตรวิชาชีพ (ปวช.)',
    'ประกาศนียบัตรวิชาชีพชั้นสูง (ปวส.)',
    'อนุปริญญา',
  ],
  'ปริญญาตรี': [
    'ครุศาสตรบัณฑิต (ค.บ.)',
    'ศึกษาศาสตรบัณฑิต (ศษ.บ.)',
    'การศึกษาบัณฑิต (กศ.บ.)',
    'ครุศาสตร์อุตสาหกรรมบัณฑิต (ค.อ.บ.)',
    'วิทยาศาสตรบัณฑิต (วท.บ.)',
    'ศิลปศาสตรบัณฑิต (ศศ.บ.)',
    'ศิลปกรรมศาสตรบัณฑิต (ศป.บ.)',
    'ดุริยางคศาสตรบัณฑิต (ดศ.บ.)',
    'บริหารธุรกิจบัณฑิต (บธ.บ.)',
    'บัญชีบัณฑิต (บช.บ.)',
    'เศรษฐศาสตรบัณฑิต (ศ.บ.)',
    'รัฐศาสตรบัณฑิต (ร.บ.)',
    'รัฐประศาสนศาสตรบัณฑิต (รป.บ.)',
    'นิติศาสตรบัณฑิต (น.บ.)',
    'วิศวกรรมศาสตรบัณฑิต (วศ.บ.)',
    'เทคโนโลยีบัณฑิต (ทล.บ.)',
    'พุทธศาสตรบัณฑิต (พธ.บ.)',
    'พยาบาลศาสตรบัณฑิต (พย.บ.)',
    'สาธารณสุขศาสตรบัณฑิต (ส.บ.)',
  ],
  'ประกาศนียบัตรบัณฑิต (ป.บัณฑิต)': [
    'ประกาศนียบัตรบัณฑิต (ป.บัณฑิต) สาขาวิชาชีพครู',
    'ประกาศนียบัตรบัณฑิต (ป.บัณฑิต) สาขาการบริหารการศึกษา',
  ],
  'ปริญญาโท': [
    'ครุศาสตรมหาบัณฑิต (ค.ม.)',
    'ศึกษาศาสตรมหาบัณฑิต (ศษ.ม.)',
    'การศึกษามหาบัณฑิต (กศ.ม.)',
    'ครุศาสตร์อุตสาหกรรมมหาบัณฑิต (ค.อ.ม.)',
    'วิทยาศาสตรมหาบัณฑิต (วท.ม.)',
    'ศิลปศาสตรมหาบัณฑิต (ศศ.ม.)',
    'ศิลปกรรมศาสตรมหาบัณฑิต (ศป.ม.)',
    'บริหารธุรกิจมหาบัณฑิต (บธ.ม.)',
    'รัฐประศาสนศาสตรมหาบัณฑิต (รป.ม.)',
    'นิติศาสตรมหาบัณฑิต (น.ม.)',
    'วิศวกรรมศาสตรมหาบัณฑิต (วศ.ม.)',
    'พุทธศาสตรมหาบัณฑิต (พธ.ม.)',
  ],
  'ปริญญาเอก': [
    'ปรัชญาดุษฎีบัณฑิต (ปร.ด.)',
    'ครุศาสตรดุษฎีบัณฑิต (ค.ด.)',
    'ศึกษาศาสตรดุษฎีบัณฑิต (ศษ.ด.)',
    'การศึกษาดุษฎีบัณฑิต (กศ.ด.)',
    'ครุศาสตร์อุตสาหกรรมดุษฎีบัณฑิต (ค.อ.ด.)',
    'วิทยาศาสตรดุษฎีบัณฑิต (วท.ด.)',
    'พุทธศาสตรดุษฎีบัณฑิต (พธ.ด.)',
  ],
};

export function getProgramYearsForLevel(level?: string | null): readonly string[] {
  if (!level) return [];
  return PROGRAM_YEARS_BY_LEVEL[level as EducationLevel] || [];
}

export function getDegreesForLevel(level?: string | null): readonly string[] {
  if (!level) return [];
  return DEGREES_BY_LEVEL[level as EducationLevel] || [];
}

/**
 * Formats highest qualification cleanly for read-only HR profiles, e.g.:
 * "ครุศาสตรบัณฑิต (ค.บ.) หลักสูตร 5 ปี • วิชาเอกคณิตศาสตร์"
 */
export function formatHighestQualification(input: {
  educationLevel?: string | null;
  educationProgramYears?: string | null;
  educationDegree?: string | null;
  major?: string | null;
  educationInstitution?: string | null;
  educationGradYear?: string | null;
}): string {
  const parts: string[] = [];
  const degreeBase = input.educationDegree?.trim() || input.educationLevel?.trim() || '';
  const years = input.educationProgramYears?.trim() || '';

  if (degreeBase) {
    parts.push(years ? `${degreeBase} ${years}` : degreeBase);
  } else if (years) {
    parts.push(years);
  }

  if (input.major?.trim()) {
    parts.push(`วิชาเอก${input.major.trim()}`);
  }

  return parts.join(' • ');
}

/**
 * Formats a complete standard Thai address string from individual address fields.
 */
export function formatThaiAddress(input: {
  addressHouseNo?: string | null;
  addressMoo?: string | null;
  addressSoiRoad?: string | null;
  addressSubdistrict?: string | null;
  addressDistrict?: string | null;
  addressProvince?: string | null;
  addressPostalCode?: string | null;
}): string {
  const isBangkok = input.addressProvince?.trim() === 'กรุงเทพมหานคร';
  const chunks: string[] = [];

  if (input.addressHouseNo?.trim()) chunks.push(input.addressHouseNo.trim());
  if (input.addressMoo?.trim()) chunks.push(`หมู่ ${input.addressMoo.trim()}`);
  if (input.addressSoiRoad?.trim()) chunks.push(input.addressSoiRoad.trim());
  if (input.addressSubdistrict?.trim()) {
    chunks.push(`${isBangkok ? 'แขวง' : 'ต.'}${input.addressSubdistrict.trim()}`);
  }
  if (input.addressDistrict?.trim()) {
    chunks.push(`${isBangkok ? 'เขต' : 'อ.'}${input.addressDistrict.trim()}`);
  }
  if (input.addressProvince?.trim()) {
    chunks.push(isBangkok ? 'กรุงเทพมหานคร' : `จ.${input.addressProvince.trim()}`);
  }
  if (input.addressPostalCode?.trim()) {
    chunks.push(input.addressPostalCode.trim());
  }

  return chunks.join(' ');
}
