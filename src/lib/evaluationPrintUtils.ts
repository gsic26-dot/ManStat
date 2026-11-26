/**
 * Evaluation Print Utilities & Thai Numerals Formatter
 * แปลงตัวเลขอารบิกเป็นเลขไทย และจัดรูปแบบวันที่/ข้อความสำหรับเอกสารราชการขนาด A4
 */

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

const THAI_MONTH_NAMES = [
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
 * แปลงสตริงหรือตัวเลขใด ๆ ที่มีเลขอารบิก 0-9 ให้กลายเป็นเลขไทย ๐-๙
 */
export function toThaiDigits(val: number | string | null | undefined): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  return str.replace(/[0-9]/g, (ch) => THAI_DIGITS_MAP[ch] || ch);
}

/**
 * จัดรูปแบบตัวเลขพร้อมทศนิยม แล้วแปลงเป็นเลขไทย
 * @param num ตัวเลขที่ต้องการจัดรูปแบบ
 * @param decimals จำนวนตำแหน่งทศนิยม (ค่าเริ่มต้น 0)
 * @param padDecimals กำหนดให้คงเลขทศนิยมไว้เสมอหรือไม่
 */
export function formatThaiNumber(
  num: number | null | undefined,
  decimals: number = 0,
  padDecimals: boolean = true
): string {
  if (num === null || num === undefined || isNaN(num)) return '-';
  const formatted = padDecimals ? num.toFixed(decimals) : String(num);
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
  if (num === null || num === undefined || isNaN(num)) return '-';
  const formatted = num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return toThaiDigits(formatted);
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

  const monthName = THAI_MONTH_NAMES[monthIndex] || '';
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
