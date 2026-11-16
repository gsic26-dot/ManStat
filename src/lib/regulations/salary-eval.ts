/**
 * =========================================================================
 * OPSC SALARY EVALUATION REGULATORY ENGINE (ก.ค.ศ. ว15/2561)
 * =========================================================================
 * Governing Regulation: หลักเกณฑ์และวิธีการประเมินผลการปฏิบัติงานของข้าราชการครู
 * และบุคลากรทางการศึกษา เพื่อประกอบการเลื่อนเงินเดือน (ก.ค.ศ. ว15/2561)
 * =========================================================================
 */

export interface EvalRoundInfo {
  fiscalYear: number;
  evalRound: 1 | 2;
  periodStartISO: string;
  periodEndISO: string;
  periodTitle: string;
}

export interface PromotionRadarCheckResult {
  fiscalYear: number;
  evalRound: 1 | 2;
  leaveCount: number;
  sickPersonalDays: number;
  isLeaveCountExceeded: boolean;     // Flag: leave_count > 6
  isDaysExceeded: boolean;           // Flag: sick_personal_days > 23
  isDisqualifiedForMerit: boolean;   // Any threshold breached
  warnings: string[];
}

export function getEvaluationRoundForDate(dateInput: string | Date): EvalRoundInfo {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const yearCE = date.getFullYear();
  const month = date.getMonth() + 1; // 1-12

  // Civil service fiscal year runs from 1 Oct (year - 1) to 30 Sep (year)
  // Round 1: 1 October - 31 March
  // Round 2: 1 April - 30 September
  let fiscalYearCE: number;
  let evalRound: 1 | 2;
  let periodStartISO: string;
  let periodEndISO: string;

  if (month >= 10) {
    // October - December: Round 1 of next CE fiscal year
    fiscalYearCE = yearCE + 1;
    evalRound = 1;
    periodStartISO = `${yearCE}-10-01`;
    periodEndISO = `${fiscalYearCE}-03-31`;
  } else if (month <= 3) {
    // January - March: Round 1 of current CE fiscal year
    fiscalYearCE = yearCE;
    evalRound = 1;
    periodStartISO = `${yearCE - 1}-10-01`;
    periodEndISO = `${yearCE}-03-31`;
  } else {
    // April - September: Round 2 of current CE fiscal year
    fiscalYearCE = yearCE;
    evalRound = 2;
    periodStartISO = `${yearCE}-04-01`;
    periodEndISO = `${yearCE}-09-30`;
  }

  const fiscalYearBE = fiscalYearCE + 543;
  const periodTitle = evalRound === 1
    ? `รอบที่ 1 (1 ต.ค. - 31 มี.ค. ${fiscalYearBE})`
    : `รอบที่ 2 (1 เม.ย. - 30 ก.ย. ${fiscalYearBE})`;

  return {
    fiscalYear: fiscalYearBE,
    evalRound,
    periodStartISO,
    periodEndISO,
    periodTitle
  };
}

export function evaluatePromotionEligibility(
  leaveCount: number,
  sickPersonalDays: number,
  fiscalYear: number,
  evalRound: 1 | 2
): PromotionRadarCheckResult {
  const isLeaveCountExceeded = leaveCount > 6;
  const isDaysExceeded = sickPersonalDays > 23;
  const isDisqualifiedForMerit = isLeaveCountExceeded || isDaysExceeded;

  const warnings: string[] = [];

  if (isLeaveCountExceeded) {
    warnings.push(`จำนวนครั้งที่ลาในรอบการประเมินเกิน 6 ครั้ง (ปัจจุบันลา ${leaveCount} ครั้ง) ตามเกณฑ์ ก.ค.ศ. ว15/2561`);
  }

  if (isDaysExceeded) {
    warnings.push(`จำนวนวันลาป่วยและลากิจส่วนตัวรวมกันเกิน 23 วันทำการ (ปัจจุบันลา ${sickPersonalDays} วันทำการ) ตามเกณฑ์ ก.ค.ศ. ว15/2561`);
  }

  return {
    fiscalYear,
    evalRound,
    leaveCount,
    sickPersonalDays,
    isLeaveCountExceeded,
    isDaysExceeded,
    isDisqualifiedForMerit,
    warnings
  };
}
