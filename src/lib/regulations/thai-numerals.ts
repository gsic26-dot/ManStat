/**
 * ============================================================================
 * ManStat: Thai Numerals & Formatted Official Date Utilities
 * ============================================================================
 * Converts standard Arabic digits to Thai digits (0-9 -> ๐-๙)
 * and formats dates according to Thai Bureaucratic Form Standards (ระเบียบสารบรรณ).
 * ============================================================================
 */

const THAI_DIGITS = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙'];

export const THAI_DIGITS_MAP: Record<string, string> = {
  '0': '๐',
  '1': '๑',
  '2': '๒',
  '3': '๓',
  '4': '๔',
  '5': '๕',
  '6': '๖',
  '7': '๗',
  '8': '๘',
  '9': '๙',
};

export const THAI_MONTHS = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
];

/**
 * แปลงตัวเลขอารบิกในสตริงเป็นเลขไทย
 */
export function toThaiNumerals(value: string | number): string {
  const str = String(value);
  return str.replace(/[0-9]/g, (char) => THAI_DIGITS[parseInt(char, 10)]);
}

const THAI_TO_ARABIC_MAP: Record<string, string> = {
  '๐': '0',
  '๑': '1',
  '๒': '2',
  '๓': '3',
  '๔': '4',
  '๕': '5',
  '๖': '6',
  '๗': '7',
  '๘': '8',
  '๙': '9',
};

/**
 * แปลงตัวเลขไทยในสตริงเป็นเลขอารบิก (๐-๙ -> 0-9)
 */
export function toArabicNumerals(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  return str.replace(/[๐-๙]/g, (char) => THAI_TO_ARABIC_MAP[char] || char);
}

/**
 * ฟังก์ชันสลับการแสดงผลตัวเลข (เลขไทย หรือเลขอารบิก) ตามค่า useThaiNumerals
 */
export function formatNumberText(value: string | number, useThaiNumerals: boolean): string {
  const str = String(value);
  return useThaiNumerals ? toThaiNumerals(str) : str;
}

export interface ThaiDateParts {
  day: number;
  monthName: string;
  yearBE: number;
}

/**
 * ดึงส่วนประกอบของวันที่ไทย (วัน, ชื่อเดือน, ปี พ.ศ.)
 */
export function parseThaiDateParts(dateInput: Date | string): ThaiDateParts {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) {
    return { day: 1, monthName: 'ตุลาคม', yearBE: 2570 };
  }
  return {
    day: date.getDate(),
    monthName: THAI_MONTHS[date.getMonth()],
    yearBE: date.getFullYear() + 543,
  };
}

/**
 * จัดรูปแบบวันที่ทางการ เช่น "16 พฤศจิกายน 2569" หรือ "๑๖ พฤศจิกายน ๒๕๖๙"
 */
export function formatOfficialThaiDate(
  dateInput: Date | string,
  useThaiNumerals: boolean = false
): string {
  const { day, monthName, yearBE } = parseThaiDateParts(dateInput);
  const dayStr = formatNumberText(day, useThaiNumerals);
  const yearStr = formatNumberText(yearBE, useThaiNumerals);
  return `${dayStr} ${monthName} ${yearStr}`;
}

/**
 * แปลงสตริงหรือตัวเลขใด ๆ ที่มีเลขอารบิก 0-9 ให้กลายเป็นเลขไทย ๐-๙ (รองรับ null/undefined)
 */
export function toThaiDigits(val: number | string | null | undefined): string {
  if (val === null || val === undefined) return '';
  return toThaiNumerals(val);
}

/**
 * จัดรูปแบบตัวเลขพร้อมเครื่องหมายจุลภาค (comma) และทศนิยม แล้วแปลงเป็นเลขไทย
 * เช่น 54000 -> "๕๔,๐๐๐", 85.75 -> "๘๕.๗๕"
 */
export function formatThaiNumber(
  num: number | null | undefined,
  decimals: number = 0,
  padDecimals: boolean = true
): string {
  if (num === null || num === undefined || isNaN(num)) return '-';
  const formatted = padDecimals
    ? num.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })
    : num.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: decimals > 0 ? decimals : 20,
      });
  return toThaiDigits(formatted);
}

/**
 * จัดรูปแบบตัวเลขจำนวนเงินพร้อมเครื่องหมายจุลภาค (comma) แล้วแปลงเป็นเลขไทย
 * เช่น 54000 -> "๕๔,๐๐๐"
 */
export function formatThaiCurrency(
  num: number | null | undefined,
  decimals: number = 0
): string {
  return formatThaiNumber(num, decimals, true);
}

/**
 * แปลงวันที่ ISO (เช่น 2026-10-01 หรือ Date object) เป็นวันที่ภาษาไทยพร้อมเลขไทย
 * เช่น "๑ ตุลาคม ๒๕๖๙"
 */
export function formatThaiDateWithDigits(
  dateInput: string | Date | null | undefined,
  includeDay: boolean = true
): string {
  if (!dateInput) return '';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return String(dateInput);

  const day = date.getDate();
  const monthIndex = date.getMonth();
  const yearTh = date.getFullYear() + 543;

  const monthName = THAI_MONTHS[monthIndex] || '';
  if (!includeDay) {
    return `${monthName} ${toThaiDigits(yearTh)}`;
  }
  return `${toThaiDigits(day)} ${monthName} ${toThaiDigits(yearTh)}`;
}

/**
 * สร้างข้อความระบุช่วงเวลาของรอบการประเมินตามปีงบประมาณ พ.ศ.
 * รอบที่ 1: 1 ตุลาคม (ปีก่อนหน้า) ถึง 31 มีนาคม (ปีงบ)
 * รอบที่ 2: 1 เมษายน (ปีงบ) ถึง 30 กันยายน (ปีงบ)
 */
export function getEvaluationPeriodThaiRange(
  round: number,
  fiscalYearTh: number
): {
  roundLabel: string;
  startDateText: string;
  endDateText: string;
  fullRangeText: string;
  startYearShort: string;
  endYearShort: string;
} {
  const isRound1 = round === 1;
  const startYear = isRound1 ? fiscalYearTh - 1 : fiscalYearTh;
  const endYear = fiscalYearTh;

  const startYearShort = toThaiDigits(String(startYear).slice(-2));
  const endYearShort = toThaiDigits(String(endYear).slice(-2));

  const startDateText = isRound1
    ? `๑ ตุลาคม ${toThaiDigits(startYear)}`
    : `๑ เมษายน ${toThaiDigits(startYear)}`;
  const endDateText = isRound1
    ? `๓๑ มีนาคม ${toThaiDigits(endYear)}`
    : `๓๐ กันยายน ${toThaiDigits(endYear)}`;

  return {
    roundLabel: isRound1 ? 'ครั้งที่ ๑' : 'ครั้งที่ ๒',
    startDateText,
    endDateText,
    fullRangeText: `${startDateText} ถึง ${endDateText}`,
    startYearShort,
    endYearShort,
  };
}

/**
 * ตรวจสอบความถูกต้องของการแปลงเลขไทย
 */
export function isAllThaiDigits(str: string): boolean {
  return /^[๐-๙\s.,/-]+$/.test(str);
}
