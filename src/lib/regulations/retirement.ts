/**
 * =========================================================================
 * THAI CIVIL SERVICE RETIREMENT REGULATORY ENGINE
 * =========================================================================
 * Governing Law: พ.ร.บ. บำเหน็จบำนาญข้าราชการ พ.ศ. 2494 และที่แก้ไขเพิ่มเติม (ม.19)
 * Official Rule:
 * - ข้าราชการที่เกิดวันที่ 1 ตุลาคม จะมีอายุครบ 60 ปีบริบูรณ์ในวันที่ 30 กันยายน
 *   จึงต้องเกษียณอายุราชการในสิ้นปีงบประมาณนั้นพอดี (ไม่ได้รับการบวกปีเพิ่ม)
 * - เฉพาะผู้ที่เกิดตั้งแต่วันที่ 2 ตุลาคม – 31 ธันวาคม เท่านั้นที่จะมีอายุครบ 60 ปี
 *   หลังสิ้นปีงบประมาณ จึงขยายปีเกษียณอายุราชการออกไปอีก 1 ปีงบประมาณ
 * =========================================================================
 */

export interface RetirementCalculationResult {
  birthDateISO: string;
  birthYearBE: number;
  birthYearCE: number;
  birthMonth: number;
  birthDay: number;
  retireFiscalYearCE: number;
  retireFiscalYearBE: number;
  retireDateISO: string;       // Always YYYY-09-30
  isRetireExtended: boolean;    // true if born Oct 2 - Dec 31
  remainingYears: number;
  remainingMonths: number;
  remainingDays: number;
  isAlreadyRetired: boolean;
}

export function calculateCivilServiceRetirement(
  birthDateInput: string | Date,
  referenceDateInput?: string | Date
): RetirementCalculationResult {
  const birthDate = typeof birthDateInput === 'string' ? new Date(birthDateInput) : birthDateInput;
  if (isNaN(birthDate.getTime())) {
    throw new Error(`Invalid birthDate provided: ${String(birthDateInput)}`);
  }

  const refDate = referenceDateInput
    ? (typeof referenceDateInput === 'string' ? new Date(referenceDateInput) : referenceDateInput)
    : new Date();

  const birthYearCE = birthDate.getFullYear();
  const birthYearBE = birthYearCE + 543;
  const birthMonth = birthDate.getMonth() + 1; // 1-12
  const birthDay = birthDate.getDate();       // 1-31

  // Strict Compliance with Sec. 19:
  // Only persons born between Oct 2 and Dec 31 get +1 fiscal year
  const isBornAfterOct1 = (birthMonth === 10 && birthDay >= 2) || birthMonth > 10;
  const retireFiscalYearCE = birthYearCE + 60 + (isBornAfterOct1 ? 1 : 0);
  const retireFiscalYearBE = retireFiscalYearCE + 543;

  // Official retirement date is always September 30 of the retirement fiscal year
  const retireDate = new Date(retireFiscalYearCE, 8, 30); // Month 8 is September (0-indexed)
  const retireDateISO = `${retireFiscalYearCE}-09-30`;

  // Calculate remaining time
  const isAlreadyRetired = refDate.getTime() >= retireDate.getTime();

  let remainingYears = 0;
  let remainingMonths = 0;
  let remainingDays = 0;

  if (!isAlreadyRetired) {
    let y = retireDate.getFullYear() - refDate.getFullYear();
    let m = retireDate.getMonth() - refDate.getMonth();
    let d = retireDate.getDate() - refDate.getDate();

    if (d < 0) {
      m -= 1;
      const prevMonthDays = new Date(retireDate.getFullYear(), retireDate.getMonth(), 0).getDate();
      d += prevMonthDays;
    }
    if (m < 0) {
      y -= 1;
      m += 12;
    }

    remainingYears = Math.max(0, y);
    remainingMonths = Math.max(0, m);
    remainingDays = Math.max(0, d);
  }

  const birthDateISO = birthDate.toISOString().split('T')[0];

  return {
    birthDateISO,
    birthYearBE,
    birthYearCE,
    birthMonth,
    birthDay,
    retireFiscalYearCE,
    retireFiscalYearBE,
    retireDateISO,
    isRetireExtended: isBornAfterOct1,
    remainingYears,
    remainingMonths,
    remainingDays,
    isAlreadyRetired
  };
}
