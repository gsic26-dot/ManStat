/**
 * ============================================================================
 * ManStat: Standardized HR & License Expiry CSV Export Builders (hrExports.ts)
 * ============================================================================
 * - Zero external dependencies; pure RFC-4180 CSV with UTF-8 BOM (\uFEFF)
 *   so Thai characters open cleanly in Microsoft Excel.
 * - Excel formula-injection neutralization for untrusted text cells.
 * - Strict PDPA protection:
 *   - NEVER exports 13-digit Citizen ID (idCard) or emergency contacts.
 *   - For non-admin (Teacher) roles: masks phone via maskPhoneNumber(),
 *     masks birthDate & full residential address as "สงวนสิทธิ์ (PDPA)".
 * ============================================================================
 */

import type { TeacherRecord, WorkloadItem } from '@/lib/data/schoolData';
import { getStaffDivisions } from '@/lib/staffDivisions';
import { calculateRetirementInfo } from '@/lib/regulations/fiscal-and-retirement';
import { formatThaiAddress } from '@/lib/constants/qualifications';
import { formatStaffName, formatShortStanding } from '@/lib/regulations/staff-formatting';
import { isCivilServantForSalary, maskPhoneNumber } from '@/lib/auth/roles';
import type { PersonLicenseRecord } from '@/lib/regulations/license-grouping';

export const UTF8_BOM = '\uFEFF';
export const PDPA_MASKED_LABEL = 'สงวนสิทธิ์ (PDPA)';

const THAI_MONTHS_SHORT = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
];

/**
 * Formats YYYY-MM-DD into concise Thai Buddhist Era date using Arabic numerals (0-9).
 */
export function formatExportThaiDate(dateStr?: string | null): string {
  if (!dateStr || !dateStr.trim()) return '-';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr.trim());
  if (!match) return dateStr.trim();
  const yearBE = Number(match[1]) + 543;
  const monthIdx = Number(match[2]) - 1;
  const day = Number(match[3]);
  if (monthIdx < 0 || monthIdx > 11 || day < 1 || day > 31) return dateStr.trim();
  return `${day} ${THAI_MONTHS_SHORT[monthIdx]} ${yearBE}`;
}

/**
 * Neutralizes Excel formula injection (CWE-1236) and applies RFC-4180 CSV quoting.
 * Preserves legitimate numeric values (including negative integers such as -15 days).
 */
export function escapeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';

  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : '';
  }

  let str = String(value);

  // Neutralize Excel formula prefixes (=, +, @, tab, CR, or '-' when not a plain dash or plain negative number)
  if (str.length > 0) {
    const first = str[0];
    const isPlainDashOrNegNumber = str === '-' || /^-\d+(\.\d+)?$/.test(str);
    if (
      first === '=' ||
      first === '+' ||
      first === '@' ||
      first === '\t' ||
      first === '\r' ||
      (first === '-' && !isPlainDashOrNegNumber)
    ) {
      str = `'${str}`;
    }
  }

  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildCsvContent(
  headers: string[],
  rows: Array<Array<string | number | null | undefined>>
): string {
  const lines = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((row) => row.map(escapeCsvCell).join(',')),
  ];
  return `${UTF8_BOM}${lines.join('\r\n')}`;
}

function getEmploymentTypeLabel(teacher: TeacherRecord): string {
  const emp = teacher.employmentType || teacher.employment_type;
  if (emp === 'government_employee') return 'พนักงานราชการ';
  if (emp === 'temporary_employee') return 'ลูกจ้างชั่วคราว/อัตราจ้าง';
  if (emp === 'civil_servant' || isCivilServantForSalary(teacher)) {
    return 'ข้าราชการครูและบุคลากรทางการศึกษา';
  }
  return 'ลูกจ้าง / สายสนับสนุน';
}

export const STAFF_DIRECTORY_CSV_HEADERS = [
  'รหัสประจำตัว',
  'คำนำหน้า',
  'ชื่อจริง',
  'นามสกุล',
  'เลขที่ตำแหน่ง',
  'ประเภทบุคลากร',
  'ตำแหน่ง',
  'วิทยฐานะ',
  'กลุ่มสาระการเรียนรู้',
  'สังกัดฝ่ายงาน',
  'ระดับวุฒิการศึกษา',
  'หลักสูตร (จำนวนปี)',
  'ชื่อคุณวุฒิ/ปริญญา',
  'สาขา/วิชาเอก',
  'สถาบันการศึกษา',
  'ปีที่จบ (พ.ศ.)',
  'ประเภทสมาชิกคุรุสภา',
  'เลขสมาชิกคุรุสภา',
  'วันเดือนปีเกิด',
  'ปีเกษียณอายุราชการ (พ.ศ.)',
  'เบอร์โทรศัพท์',
  'อีเมล',
  'ที่อยู่ปัจจุบัน',
];

/**
 * Builds an Excel-ready UTF-8 BOM CSV for the Staff Directory.
 * Enforces PDPA masking automatically based on `options.isAdmin`.
 */
export function buildStaffDirectoryCsv(
  teachers: TeacherRecord[],
  workloads: WorkloadItem[],
  options: { isAdmin: boolean }
): string {
  const rows = teachers.map((t) => {
    const divisions = getStaffDivisions(t, workloads);
    const divisionsText = divisions.length > 0 ? divisions.join(', ') : '-';

    let retireYearBE: string | number = '-';
    if (t.birthDate) {
      try {
        retireYearBE = calculateRetirementInfo(t.birthDate).retireFiscalYearBE;
      } catch {
        retireYearBE = '-';
      }
    }

    const rawAddress = formatThaiAddress(t);
    const exportBirthDate = t.birthDate
      ? options.isAdmin
        ? formatExportThaiDate(t.birthDate)
        : PDPA_MASKED_LABEL
      : '-';
    const exportPhone =
      t.phone && t.phone !== '-'
        ? options.isAdmin
          ? t.phone
          : maskPhoneNumber(t.phone)
        : '-';
    const exportAddress = rawAddress
      ? options.isAdmin
        ? rawAddress
        : PDPA_MASKED_LABEL
      : '-';

    const khurusaphaType = t.khurusaphaMemberType || '-';
    const khurusaphaNo =
      khurusaphaType === 'ไม่เป็นสมาชิก'
        ? '-'
        : t.khurusaphaMemberNo || t.memberId || '-';

    return [
      t.employeeCode || '-',
      t.prefix || '-',
      t.firstName || '-',
      t.lastName || '-',
      t.positionNo || '-',
      getEmploymentTypeLabel(t),
      t.position || '-',
      formatShortStanding(t.academicStanding),
      t.department || '-',
      divisionsText,
      t.educationLevel || '-',
      t.educationProgramYears || '-',
      t.educationDegree || '-',
      t.major || '-',
      t.educationInstitution || '-',
      t.educationGradYear || '-',
      khurusaphaType,
      khurusaphaNo,
      exportBirthDate,
      retireYearBE,
      exportPhone,
      t.email && t.email !== '-' ? t.email : '-',
      exportAddress,
    ];
  });

  return buildCsvContent(STAFF_DIRECTORY_CSV_HEADERS, rows);
}

export const LICENSE_EXPIRY_CSV_HEADERS = [
  'รหัสประจำตัว',
  'ชื่อ-สกุล',
  'ตำแหน่ง',
  'ประเภทใบอนุญาต',
  'เลขที่ใบอนุญาต',
  'วันที่ออกเอกสาร',
  'วันหมดอายุ',
  'สถานะ',
  'คงเหลือ (วัน)',
];

const HEALTH_PRIORITY: Record<'EXPIRED' | 'EXPIRING_SOON' | 'MISSING' | 'VALID', number> = {
  EXPIRED: 0,
  EXPIRING_SOON: 1,
  MISSING: 2,
  VALID: 3,
};

function formatLicenseHealthThai(
  health: 'EXPIRED' | 'EXPIRING_SOON' | 'MISSING' | 'VALID'
): string {
  switch (health) {
    case 'EXPIRED':
      return 'หมดอายุ';
    case 'EXPIRING_SOON':
      return 'ใกล้หมดอายุ';
    case 'MISSING':
      return 'ยังไม่มีข้อมูล';
    case 'VALID':
    default:
      return 'ปกติ';
  }
}

interface FlattenedLicenseRow {
  priority: number;
  daysSort: number;
  cells: Array<string | number>;
}

/**
 * Builds an Excel-ready UTF-8 BOM CSV for License Expiry monitoring.
 * Sorted by urgency: หมดอายุ -> ใกล้หมดอายุ -> ยังไม่มีข้อมูล -> ปกติ, then fewest days remaining.
 */
export function buildLicenseExpiryCsv(persons: PersonLicenseRecord[]): string {
  const flattened: FlattenedLicenseRow[] = [];

  for (const person of persons) {
    const fullName = formatStaffName(person.name);
    if (person.licenses.length === 0) {
      flattened.push({
        priority: HEALTH_PRIORITY.MISSING,
        daysSort: Number.MAX_SAFE_INTEGER,
        cells: [
          person.employeeCode || '-',
          fullName,
          person.position || '-',
          '-',
          '-',
          '-',
          '-',
          formatLicenseHealthThai('MISSING'),
          '-',
        ],
      });
      continue;
    }

    for (const lic of person.licenses) {
      flattened.push({
        priority: HEALTH_PRIORITY[lic.health],
        daysSort: lic.daysRemaining,
        cells: [
          person.employeeCode || '-',
          fullName,
          person.position || '-',
          lic.type || '-',
          lic.number || '-',
          formatExportThaiDate(lic.issueDate),
          formatExportThaiDate(lic.expiryDate),
          formatLicenseHealthThai(lic.health),
          lic.daysRemaining,
        ],
      });
    }
  }

  flattened.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.daysSort - b.daysSort;
  });

  return buildCsvContent(
    LICENSE_EXPIRY_CSV_HEADERS,
    flattened.map((r) => r.cells)
  );
}

/**
 * Triggers a client-side CSV file download in the browser.
 */
export function triggerCsvDownload(csvContent: string, filename: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
