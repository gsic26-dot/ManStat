/**
 * ============================================================================
 * ManStat: Thai Numerals & Formatted Official Date Utilities
 * ============================================================================
 * Converts standard Arabic digits to Thai digits (0-9 -> ๐-๙)
 * and formats dates according to Thai Bureaucratic Form Standards (ระเบียบสารบรรณ).
 * ============================================================================
 */

const THAI_DIGITS = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙'];

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
