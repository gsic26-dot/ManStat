/**
 * ============================================================================
 * ManStat-Modern: Fiscal Year & Civil Service Retirement Regulatory Engine
 * ============================================================================
 * Governing Law: พ.ร.บ. บำเหน็จบำนาญข้าราชการ พ.ศ. 2494 มาตรา 19
 * กฎเหล็ก 1 ตุลาคม:
 * - ผู้ที่เกิดวันที่ 1 ตุลาคม จะมีอายุครบ 60 ปีบริบูรณ์ในวันที่ 30 กันยายน 
 *   จึงต้องเกษียณอายุราชการในปีงบประมาณนั้นพอดี (ห้ามบวก 1)
 * - เฉพาะผู้ที่เกิดตั้งแต่วันที่ 2 ตุลาคม ถึง 31 ธันวาคม เท่านั้น 
 *   ((month === 10 && day >= 2) || month === 11 || month === 12) ที่บวกปีเกษียณเพิ่ม 1 ปี
 * ============================================================================
 */

export interface RetirementInfo {
  birthDateISO: string;
  birthYearBE: number;
  birthYearCE: number;
  retireFiscalYearBE: number;
  retireFiscalYearCE: number;
  retireDateCE: string; // YYYY-09-30
  remainingYears: number;
  remainingMonths: number;
  remainingDays: number;
  isRetireExtended: boolean;
  isRetired: boolean;
}

export interface TenureInfo {
  startDateISO: string;
  years: number;
  months: number;
  days: number;
  totalDays: number;
  formattedText: string;
}

/**
 * คำนวณปีงบประมาณ พ.ศ. (Fiscal Year BE)
 * ปีงบประมาณไทยเริ่มต้นวันที่ 1 ตุลาคม ของปีก่อนหน้า และสิ้นสุดวันที่ 30 กันยายน ของปีงบประมาณ
 * ตั้งแต่วันที่ 1 ตุลาคม เป็นต้นไป ให้บวกปี พ.ศ. เพิ่ม 1
 */
export function getFiscalYearBE(dateInput: Date | string): number {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) {
    throw new Error(`Invalid date input: ${String(dateInput)}`);
  }
  const yearCE = d.getFullYear();
  const month = d.getMonth() + 1; // 1-12
  const fiscalYearCE = month >= 10 ? yearCE + 1 : yearCE;
  return fiscalYearCE + 543;
}

/**
 * คำนวณรอบการประเมินผลการปฏิบัติงาน (ตาม ก.ค.ศ. ว15/2561)
 * รอบที่ 1: 1 ตุลาคม – 31 มีนาคม คืนค่า 1
 * รอบที่ 2: 1 เมษายน – 30 กันยายน คืนค่า 2
 */
export function getEvalRound(dateInput: Date | string): 1 | 2 {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) {
    throw new Error(`Invalid date input: ${String(dateInput)}`);
  }
  const month = d.getMonth() + 1; // 1-12
  if (month === 10 || month === 11 || month === 12 || month === 1 || month === 2 || month === 3) {
    return 1;
  }
  return 2;
}

/**
 * คำนวณวันเกษียณอายุราชการตาม พ.ร.บ. บำเหน็จบำนาญข้าราชการ พ.ศ. 2494 มาตรา 19
 */
export function calculateRetirementInfo(
  birthDateInput: Date | string,
  referenceDateInput?: Date | string
): RetirementInfo {
  const b = typeof birthDateInput === 'string' ? new Date(birthDateInput) : birthDateInput;
  if (isNaN(b.getTime())) {
    throw new Error(`Invalid birth date input: ${String(birthDateInput)}`);
  }

  const ref = referenceDateInput
    ? (typeof referenceDateInput === 'string' ? new Date(referenceDateInput) : referenceDateInput)
    : new Date();

  ref.setHours(0, 0, 0, 0);

  const birthYearCE = b.getFullYear();
  const birthYearBE = birthYearCE + 543;
  const month = b.getMonth() + 1; // 1-12
  const day = b.getDate();         // 1-31

  // กฎเหล็กวันที่ 1 ตุลาคม:
  // เกิดวันที่ 1 ต.ค. เกษียณในปีงบฯ ที่ครบ 60 ปีพอดี (isBornAfterOct1 = false)
  // เกิด 2 ต.ค. - 31 ธ.ค. ขยายปีเกษียณเพิ่ม 1 ปี (isBornAfterOct1 = true)
  const isBornAfterOct1 = (month === 10 && day >= 2) || month === 11 || month === 12;
  const retireFiscalYearCE = birthYearCE + 60 + (isBornAfterOct1 ? 1 : 0);
  const retireFiscalYearBE = retireFiscalYearCE + 543;
  const retireDateCE = `${retireFiscalYearCE}-09-30`;

  const retireDateObj = new Date(retireFiscalYearCE, 8, 30); // Month 8 = September (0-indexed)
  retireDateObj.setHours(0, 0, 0, 0);

  const isRetired = ref.getTime() >= retireDateObj.getTime();

  let remainingYears = 0;
  let remainingMonths = 0;
  let remainingDays = 0;

  if (!isRetired) {
    let y = retireDateObj.getFullYear() - ref.getFullYear();
    let m = retireDateObj.getMonth() - ref.getMonth();
    let d = retireDateObj.getDate() - ref.getDate();

    if (d < 0) {
      m -= 1;
      const prevMonthLastDay = new Date(retireDateObj.getFullYear(), retireDateObj.getMonth(), 0).getDate();
      d += prevMonthLastDay;
    }
    if (m < 0) {
      y -= 1;
      m += 12;
    }

    remainingYears = Math.max(0, y);
    remainingMonths = Math.max(0, m);
    remainingDays = Math.max(0, d);
  }

  return {
    birthDateISO: b.toISOString().split('T')[0],
    birthYearBE,
    birthYearCE,
    retireFiscalYearBE,
    retireFiscalYearCE,
    retireDateCE,
    remainingYears,
    remainingMonths,
    remainingDays,
    isRetireExtended: isBornAfterOct1,
    isRetired
  };
}

/**
 * คำนวณอายุราชการ (Tenure) นับจากวันบรรจุรับราชการถึงวันอ้างอิง
 */
export function calculateTenure(
  startServiceDateInput: Date | string,
  referenceDateInput?: Date | string
): TenureInfo {
  const start = typeof startServiceDateInput === 'string' ? new Date(startServiceDateInput) : startServiceDateInput;
  if (isNaN(start.getTime())) {
    throw new Error(`Invalid start service date input: ${String(startServiceDateInput)}`);
  }

  const ref = referenceDateInput
    ? (typeof referenceDateInput === 'string' ? new Date(referenceDateInput) : referenceDateInput)
    : new Date();

  start.setHours(0, 0, 0, 0);
  ref.setHours(0, 0, 0, 0);

  if (ref < start) {
    return {
      startDateISO: start.toISOString().split('T')[0],
      years: 0,
      months: 0,
      days: 0,
      totalDays: 0,
      formattedText: '0 ปี 0 เดือน 0 วัน'
    };
  }

  let y = ref.getFullYear() - start.getFullYear();
  let m = ref.getMonth() - start.getMonth();
  let d = ref.getDate() - start.getDate();

  if (d < 0) {
    m -= 1;
    const prevMonthDays = new Date(ref.getFullYear(), ref.getMonth(), 0).getDate();
    d += prevMonthDays;
  }
  if (m < 0) {
    y -= 1;
    m += 12;
  }

  const diffMs = ref.getTime() - start.getTime();
  const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  return {
    startDateISO: start.toISOString().split('T')[0],
    years: Math.max(0, y),
    months: Math.max(0, m),
    days: Math.max(0, d),
    totalDays,
    formattedText: `${Math.max(0, y)} ปี ${Math.max(0, m)} เดือน ${Math.max(0, d)} วัน`
  };
}

/**
 * คำนวณระยะเวลาปฏิบัติหน้าที่ (Service Duration)
 * รูปแบบ: "X ปี Y เดือน" หรือ "Y เดือน" กรณีไม่ถึง 1 ปี
 * หากระบุ endDateInput จะหยุดคำนวณที่วันสิ้นสุด
 */
export function formatServiceDuration(
  appointmentDateInput?: string | null,
  endDateInput?: string | null
): string {
  if (!appointmentDateInput || !appointmentDateInput.trim()) return '';
  const start = new Date(appointmentDateInput);
  if (isNaN(start.getTime())) return '';

  const end = endDateInput && endDateInput.trim() ? new Date(endDateInput) : new Date();
  if (isNaN(end.getTime()) || end < start) return '';

  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days = end.getDate() - start.getDate();

  if (days < 0) {
    months -= 1;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const y = Math.max(0, years);
  const m = Math.max(0, months);

  if (y > 0 && m > 0) {
    return `${y} ปี ${m} เดือน`;
  } else if (y > 0) {
    return `${y} ปี`;
  } else if (m > 0) {
    return `${m} เดือน`;
  } else {
    return 'ไม่ถึง 1 เดือน';
  }
}
