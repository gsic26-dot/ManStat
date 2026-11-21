/**
 * ============================================================================
 * ManStat-Modern: Supabase Service Layer (queries.ts)
 * ============================================================================
 * 100% Zero-GAS Native Supabase Queries & RPC Calls
 * Typesafe service functions consuming Views, Tables, and Stored Procedures.
 * ============================================================================
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Database,
  SchoolSettings,
  StaffDirectoryView,
  LeavePromotionRadarView,
  LicenseStatusView,
  LeaveRequest,
  Holiday,
  Workload,
  LeaveTypeEnum,
  HalfDayEnum,
  LeaveStatusEnum,
  AcademicYear,
  StudentCensusSnapshot,
  FiscalPeriod,
  SalaryPromotionRecord,
  SchoolInfoCurrentView
} from '@/types/database.types';
import type { CensusDiffResult, StudentCensusSnapshotRecord } from '@/lib/data/schoolData';

export type TypedSupabaseClient = SupabaseClient<Database>;

// ----------------------------------------------------------------------------
// 1. School Settings Queries
// ----------------------------------------------------------------------------
export async function getSchoolSettings(supabase: TypedSupabaseClient): Promise<SchoolSettings | null> {
  const { data, error } = await supabase
    .from('school_settings')
    .select('*')
    .limit(1)
    .single();

  if (error) {
    console.error('[getSchoolSettings Error]', error.message);
    return null;
  }
  return data;
}

// ----------------------------------------------------------------------------
// 2. Staff Directory Views (PDPA Masked)
// ----------------------------------------------------------------------------
export async function getStaffDirectory(supabase: TypedSupabaseClient): Promise<StaffDirectoryView[]> {
  const { data, error } = await supabase
    .from('v_staff_directory')
    .select('*')
    .order('employee_code', { ascending: true });

  if (error) {
    console.error('[getStaffDirectory Error]', error.message);
    throw new Error(`Failed to load staff directory: ${error.message}`);
  }
  return data || [];
}

export async function getStaffMemberById(
  supabase: TypedSupabaseClient,
  staffId: string
): Promise<StaffDirectoryView | null> {
  const { data, error } = await supabase
    .from('v_staff_directory')
    .select('*')
    .eq('id', staffId)
    .single();

  if (error) {
    console.error('[getStaffMemberById Error]', error.message);
    return null;
  }
  return data;
}

// ----------------------------------------------------------------------------
// 3. OPSC Promotion Radar View (ก.ค.ศ. ว15/2561)
// ----------------------------------------------------------------------------
export async function getLeavePromotionRadar(
  supabase: TypedSupabaseClient,
  fiscalYear?: number,
  evalRound?: 1 | 2
): Promise<LeavePromotionRadarView[]> {
  let query = supabase.from('v_leave_promotion_radar').select('*');

  if (fiscalYear) {
    query = query.eq('fiscal_year', fiscalYear);
  }
  if (evalRound) {
    query = query.eq('eval_round', evalRound);
  }

  const { data, error } = await query.order('sick_personal_days', { ascending: false });

  if (error) {
    console.error('[getLeavePromotionRadar Error]', error.message);
    throw new Error(`Failed to load leave promotion radar: ${error.message}`);
  }
  return data || [];
}

// ----------------------------------------------------------------------------
// 4. Khurusapha License Status View (90-Day Warning)
// ----------------------------------------------------------------------------
export async function getLicenseStatusList(
  supabase: TypedSupabaseClient,
  healthFilter?: 'VALID' | 'EXPIRING_SOON' | 'EXPIRED'
): Promise<LicenseStatusView[]> {
  let query = supabase.from('v_license_status').select('*');

  if (healthFilter) {
    query = query.eq('license_health', healthFilter);
  }

  const { data, error } = await query.order('days_remaining', { ascending: true });

  if (error) {
    console.error('[getLicenseStatusList Error]', error.message);
    throw new Error(`Failed to load license status list: ${error.message}`);
  }
  return data || [];
}

// ----------------------------------------------------------------------------
// 5. Leave Requests CRUD
// ----------------------------------------------------------------------------
export interface LeaveFilterParams {
  staffId?: string;
  fiscalYear?: number;
  evalRound?: 1 | 2;
  status?: LeaveStatusEnum;
}

export async function getLeaveRequests(
  supabase: TypedSupabaseClient,
  filters: LeaveFilterParams = {}
): Promise<LeaveRequest[]> {
  let query = supabase.from('leave_requests').select('*');

  if (filters.staffId) {
    query = query.eq('staff_id', filters.staffId);
  }
  if (filters.fiscalYear) {
    query = query.eq('fiscal_year', filters.fiscalYear);
  }
  if (filters.evalRound) {
    query = query.eq('eval_round', filters.evalRound);
  }
  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('[getLeaveRequests Error]', error.message);
    throw new Error(`Failed to fetch leave requests: ${error.message}`);
  }
  return data || [];
}

export type NewLeaveRequestInput = Database['public']['Tables']['leave_requests']['Insert'];

export async function submitLeaveRequest(
  supabase: TypedSupabaseClient,
  leaveInput: NewLeaveRequestInput
): Promise<LeaveRequest> {
  const { data, error } = await supabase
    .from('leave_requests')
    .insert(leaveInput)
    .select()
    .single();

  if (error) {
    console.error('[submitLeaveRequest Error]', error.message);
    throw new Error(`Failed to submit leave request: ${error.message}`);
  }
  return data;
}

export async function updateLeaveStatus(
  supabase: TypedSupabaseClient,
  requestId: string,
  newStatus: LeaveStatusEnum,
  approverId: string,
  rejectionReason?: string
): Promise<LeaveRequest> {
  const updatePayload: Database['public']['Tables']['leave_requests']['Update'] = {
    status: newStatus,
    approver_id: approverId,
    approved_at: newStatus === 'approved' ? new Date().toISOString() : null,
    rejection_reason: rejectionReason || null
  };

  const { data, error } = await supabase
    .from('leave_requests')
    .update(updatePayload)
    .eq('id', requestId)
    .select()
    .single();

  if (error) {
    console.error('[updateLeaveStatus Error]', error.message);
    throw new Error(`Failed to update leave request status: ${error.message}`);
  }
  return data;
}

// ----------------------------------------------------------------------------
// 6. Holidays Queries
// ----------------------------------------------------------------------------
export async function getHolidays(
  supabase: TypedSupabaseClient,
  fiscalYear?: number
): Promise<Holiday[]> {
  let query = supabase.from('holidays').select('*');

  if (fiscalYear) {
    query = query.eq('fiscal_year', fiscalYear);
  }

  const { data, error } = await query.order('holiday_date', { ascending: true });

  if (error) {
    console.error('[getHolidays Error]', error.message);
    return [];
  }
  return data || [];
}

// ----------------------------------------------------------------------------
// 7. Workloads Queries (PA ว9/2564 & ว21/2564)
// ----------------------------------------------------------------------------
export async function getStaffWorkloads(
  supabase: TypedSupabaseClient,
  staffId: string,
  fiscalYear?: number,
  semester?: 1 | 2
): Promise<Workload[]> {
  let query = supabase.from('workloads').select('*').eq('staff_id', staffId);

  if (fiscalYear) {
    query = query.eq('fiscal_year', fiscalYear);
  }
  if (semester) {
    query = query.eq('semester', semester);
  }

  const { data, error } = await query.order('created_at', { ascending: true });

  if (error) {
    console.error('[getStaffWorkloads Error]', error.message);
    return [];
  }
  return data || [];
}

// ----------------------------------------------------------------------------
// 8. Remote Procedure Calls (RPC)
// ----------------------------------------------------------------------------

/**
 * PDPA Unmask RPC: Reveals 13-digit citizen ID and logs action in audit_logs
 */
export async function rpcRevealCitizenId(
  supabase: TypedSupabaseClient,
  targetStaffId: string
): Promise<string> {
  const { data, error } = await supabase.rpc('rpc_reveal_citizen_id', {
    p_target_staff_id: targetStaffId
  });

  if (error) {
    console.error('[rpcRevealCitizenId Error]', error.message);
    throw new Error(`PDPA Access Denied: ${error.message}`);
  }
  return data;
}

/**
 * DB-Side Leave Working Days Calculation RPC
 */
export async function rpcCalculateLeaveDays(
  supabase: TypedSupabaseClient,
  startDateISO: string,
  endDateISO: string,
  leaveType: LeaveTypeEnum,
  halfDay: HalfDayEnum = 'full'
): Promise<number> {
  const { data, error } = await supabase.rpc('fn_calculate_leave_days', {
    p_start_date: startDateISO,
    p_end_date: endDateISO,
    p_leave_type: leaveType,
    p_half_day: halfDay
  });

  if (error) {
    console.error('[rpcCalculateLeaveDays Error]', error.message);
    throw new Error(`Failed to calculate leave days via database RPC: ${error.message}`);
  }
  return data;
}

// ============================================================================
// 9. Academic Years, Student Census & Fiscal Periods Service Layer
// ============================================================================

/**
 * Calculates student & classroom differences between NOV_10 and JUN_10 rounds.
 */
export function calculateCensusDiff(
  snapshots: Array<StudentCensusSnapshotRecord | StudentCensusSnapshot>
): CensusDiffResult {
  const junRound = snapshots.find((s) => (s as any).roundCode === 'JUN_10' || (s as any).round_code === 'JUN_10');
  const novRound = snapshots.find((s) => (s as any).roundCode === 'NOV_10' || (s as any).round_code === 'NOV_10');

  const junStudents = junRound ? Number((junRound as any).totalStudents ?? (junRound as any).total_students ?? 0) : 0;
  const novStudents = novRound ? Number((novRound as any).totalStudents ?? (novRound as any).total_students ?? 0) : 0;

  const junRooms = junRound ? Number((junRound as any).totalClassrooms ?? (junRound as any).total_classrooms ?? 0) : 0;
  const novRooms = novRound ? Number((novRound as any).totalClassrooms ?? (novRound as any).total_classrooms ?? 0) : 0;

  const diffStudents = novStudents - junStudents;
  const diffClassrooms = novRooms - junRooms;

  let diffText = '0';
  if (diffStudents > 0) {
    diffText = `+${diffStudents}`;
  } else if (diffStudents < 0) {
    diffText = `${diffStudents}`;
  }

  let diffLongText = 'เท่าเดิม (ไม่มีการเปลี่ยนแปลง)';
  if (diffStudents > 0) {
    diffLongText = `เพิ่มขึ้น ${diffStudents} คน${diffClassrooms !== 0 ? ` (${diffClassrooms > 0 ? `+${diffClassrooms}` : diffClassrooms} ห้อง)` : ''}`;
  } else if (diffStudents < 0) {
    diffLongText = `ลดลง ${Math.abs(diffStudents)} คน${diffClassrooms !== 0 ? ` (${diffClassrooms > 0 ? `+${diffClassrooms}` : diffClassrooms} ห้อง)` : ''}`;
  } else if (diffClassrooms !== 0) {
    diffLongText = `นักเรียนเท่าเดิม (${diffClassrooms > 0 ? `+${diffClassrooms}` : diffClassrooms} ห้อง)`;
  }

  return {
    diffStudents,
    diffClassrooms,
    diffText,
    diffLongText,
    junRound: junRound as StudentCensusSnapshotRecord | undefined,
    novRound: novRound as StudentCensusSnapshotRecord | undefined,
  };
}

// ----------------------------------------------------------------------------
// 9.1 Academic Years
// ----------------------------------------------------------------------------

export async function getAcademicYears(
  supabase: TypedSupabaseClient,
  schoolId: string = '30030099'
): Promise<AcademicYear[]> {
  const { data, error } = await supabase
    .from('academic_years')
    .select('*')
    .eq('school_id', schoolId)
    .order('year_th', { ascending: false });

  if (error) {
    console.error('[getAcademicYears Error]', error.message);
    throw new Error(`Failed to load academic years: ${error.message}`);
  }
  return data || [];
}

export async function setActiveAcademicYear(
  supabase: TypedSupabaseClient,
  schoolId: string,
  academicYearId: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc('set_active_academic_year', {
    p_school_id: schoolId,
    p_academic_year_id: academicYearId,
  });

  if (error) {
    console.error('[setActiveAcademicYear Error]', error.message);
    throw new Error(`Failed to set active academic year: ${error.message}`);
  }
  return Boolean(data);
}

export async function createAcademicYearWithDefaults(
  supabase: TypedSupabaseClient,
  schoolId: string,
  yearTh: number
): Promise<string> {
  const { data, error } = await supabase.rpc('create_academic_year_with_defaults', {
    p_school_id: schoolId,
    p_year_th: yearTh,
  });

  if (error) {
    console.error('[createAcademicYearWithDefaults Error]', error.message);
    throw new Error(`Failed to create academic year: ${error.message}`);
  }
  return data as string;
}

// ----------------------------------------------------------------------------
// 9.2 Student Census Snapshots (With Strict Lock Guard)
// ----------------------------------------------------------------------------

export async function getCensusSnapshots(
  supabase: TypedSupabaseClient,
  academicYearId?: string
): Promise<StudentCensusSnapshot[]> {
  let query = supabase.from('student_census_snapshots').select('*');
  if (academicYearId) {
    query = query.eq('academic_year_id', academicYearId);
  }
  const { data, error } = await query.order('snapshot_date', { ascending: true });

  if (error) {
    console.error('[getCensusSnapshots Error]', error.message);
    throw new Error(`Failed to load student census snapshots: ${error.message}`);
  }
  return data || [];
}

export async function updateCensusSnapshot(
  supabase: TypedSupabaseClient,
  snapshotId: string,
  updates: Partial<Database['public']['Tables']['student_census_snapshots']['Update']>
): Promise<StudentCensusSnapshot> {
  // Lock Guard Check: If snapshot is locked, reject data modifications
  const { data: existing, error: checkError } = await supabase
    .from('student_census_snapshots')
    .select('is_locked')
    .eq('id', snapshotId)
    .single();

  if (checkError) {
    console.error('[updateCensusSnapshot Lock Check Error]', checkError.message);
    throw new Error(`Failed to verify snapshot lock status: ${checkError.message}`);
  }

  const isChangingLockStatusOnly =
    updates.is_locked !== undefined &&
    Object.keys(updates).every((key) => key === 'is_locked' || key === 'updated_at');

  if (existing?.is_locked && !isChangingLockStatusOnly) {
    throw new Error('ข้อมูลรอบนี้ถูกล็อกไว้แล้ว ไม่สามารถแก้ไขได้ กรุณาปลดล็อกก่อนดำเนินการ (Data is locked)');
  }

  // Calculate totals automatically if breakdown items are provided
  const updatePayload = { ...updates, updated_at: new Date().toISOString() };
  if (
    updates.kindergarten_students !== undefined ||
    updates.primary_students !== undefined ||
    updates.secondary_students !== undefined
  ) {
    const k = updates.kindergarten_students ?? 0;
    const p = updates.primary_students ?? 0;
    const s = updates.secondary_students ?? 0;
    updatePayload.total_students = k + p + s;
  }

  if (
    updates.kindergarten_classrooms !== undefined ||
    updates.primary_classrooms !== undefined ||
    updates.secondary_classrooms !== undefined
  ) {
    const kr = updates.kindergarten_classrooms ?? 0;
    const pr = updates.primary_classrooms ?? 0;
    const sr = updates.secondary_classrooms ?? 0;
    updatePayload.total_classrooms = kr + pr + sr;
  }

  const { data, error } = await supabase
    .from('student_census_snapshots')
    .update(updatePayload)
    .eq('id', snapshotId)
    .select()
    .single();

  if (error) {
    console.error('[updateCensusSnapshot Error]', error.message);
    throw new Error(`Failed to update student census snapshot: ${error.message}`);
  }
  return data;
}

export async function setPrimaryCensusRound(
  supabase: TypedSupabaseClient,
  academicYearId: string,
  snapshotId: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc('set_primary_census_round', {
    p_academic_year_id: academicYearId,
    p_snapshot_id: snapshotId,
  });

  if (error) {
    console.error('[setPrimaryCensusRound Error]', error.message);
    throw new Error(`Failed to set primary census round: ${error.message}`);
  }
  return Boolean(data);
}

export async function toggleCensusSnapshotLock(
  supabase: TypedSupabaseClient,
  snapshotId: string,
  isLocked: boolean
): Promise<StudentCensusSnapshot> {
  const { data, error } = await supabase
    .from('student_census_snapshots')
    .update({ is_locked: isLocked, updated_at: new Date().toISOString() })
    .eq('id', snapshotId)
    .select()
    .single();

  if (error) {
    console.error('[toggleCensusSnapshotLock Error]', error.message);
    throw new Error(`Failed to toggle lock on census snapshot: ${error.message}`);
  }
  return data;
}

// ----------------------------------------------------------------------------
// 9.3 Fiscal Periods
// ----------------------------------------------------------------------------

export async function getFiscalPeriods(
  supabase: TypedSupabaseClient,
  schoolId: string = '30030099'
): Promise<FiscalPeriod[]> {
  const { data, error } = await supabase
    .from('fiscal_periods')
    .select('*')
    .eq('school_id', schoolId)
    .order('fiscal_year_th', { ascending: false })
    .order('round_no', { ascending: true });

  if (error) {
    console.error('[getFiscalPeriods Error]', error.message);
    throw new Error(`Failed to load fiscal periods: ${error.message}`);
  }
  return data || [];
}

export async function createFiscalPeriod(
  supabase: TypedSupabaseClient,
  periodData: Database['public']['Tables']['fiscal_periods']['Insert']
): Promise<FiscalPeriod> {
  const { data, error } = await supabase
    .from('fiscal_periods')
    .insert(periodData)
    .select()
    .single();

  if (error) {
    console.error('[createFiscalPeriod Error]', error.message);
    throw new Error(`Failed to create fiscal period: ${error.message}`);
  }
  return data;
}

export async function setActiveFiscalPeriod(
  supabase: TypedSupabaseClient,
  schoolId: string,
  fiscalPeriodId: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc('set_active_fiscal_period', {
    p_school_id: schoolId,
    p_fiscal_period_id: fiscalPeriodId,
  });

  if (error) {
    console.error('[setActiveFiscalPeriod Error]', error.message);
    throw new Error(`Failed to set active fiscal period: ${error.message}`);
  }
  return Boolean(data);
}

export async function updateFiscalPeriodRefCensus(
  supabase: TypedSupabaseClient,
  fiscalPeriodId: string,
  refCensusSnapshotId: string | null
): Promise<FiscalPeriod> {
  const { data, error } = await supabase
    .from('fiscal_periods')
    .update({ ref_census_snapshot_id: refCensusSnapshotId, updated_at: new Date().toISOString() })
    .eq('id', fiscalPeriodId)
    .select()
    .single();

  if (error) {
    console.error('[updateFiscalPeriodRefCensus Error]', error.message);
    throw new Error(`Failed to update fiscal period ref census: ${error.message}`);
  }
  return data;
}

// ----------------------------------------------------------------------------
// 9.4 Backward-Compatible School Info Current View
// ----------------------------------------------------------------------------

export async function getSchoolInfoCurrent(
  supabase: TypedSupabaseClient
): Promise<SchoolInfoCurrentView | null> {
  const { data, error } = await supabase
    .from('v_school_info_current')
    .select('*')
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[getSchoolInfoCurrent Error]', error.message);
    return null;
  }
  return data;
}

// ----------------------------------------------------------------------------
// 9.5 Salary Promotion Records (Snapshot Per Period)
// ----------------------------------------------------------------------------

export async function getSalaryPromotionRecords(
  supabase: TypedSupabaseClient,
  fiscalPeriodId: string
): Promise<SalaryPromotionRecord[]> {
  const { data, error } = await supabase
    .from('salary_promotion_records')
    .select('*')
    .eq('fiscal_period_id', fiscalPeriodId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[getSalaryPromotionRecords Error]', error.message);
    throw new Error(`Failed to load salary promotion records: ${error.message}`);
  }
  return data || [];
}

export async function saveSalaryPromotionRecord(
  supabase: TypedSupabaseClient,
  record: any
): Promise<SalaryPromotionRecord> {
  const fiscalPeriodId = record.fiscal_period_id || record.fiscalPeriodId || '';
  const staffId = record.staff_id || record.staffId || '';

  // Check if target fiscal period is locked
  const { data: period, error: periodErr } = await supabase
    .from('fiscal_periods')
    .select('is_locked')
    .eq('id', fiscalPeriodId)
    .single();

  if (!periodErr && period?.is_locked) {
    throw new Error('รอบปีงบประมาณนี้ถูกล็อกแล้ว ไม่สามารถแก้ไขข้อมูลการเลื่อนเงินเดือนได้');
  }

  const payload: any = {
    fiscal_period_id: fiscalPeriodId,
    staff_id: staffId,
    position_snapshot: record.position_snapshot || record.positionSnapshot || '',
    standing_snapshot: record.standing_snapshot || record.standingSnapshot || '-',
    salary_before: Number(record.salary_before ?? record.salaryBefore ?? 0),
    calculation_base: Number(record.calculation_base ?? record.calculationBase ?? 0),
    promotion_percent: Number(record.promotion_percent ?? record.promotionPercent ?? 0),
    salary_after: Number(record.salary_after ?? record.salaryAfter ?? 0),
    order_no: record.order_no ?? record.orderNo ?? '',
    order_date: record.order_date ?? record.orderDate ?? null,
    notes: record.notes ?? '',
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('salary_promotion_records')
    .upsert(payload, { onConflict: 'fiscal_period_id,staff_id' })
    .select()
    .single();

  if (error) {
    console.error('[saveSalaryPromotionRecord Error]', error.message);
    throw new Error(`Failed to save salary promotion record: ${error.message}`);
  }
  return data;
}

export async function snapshotStaffForFiscalPeriod(
  supabase: TypedSupabaseClient,
  fiscalPeriodId: string,
  staffList: Array<{ id: string; position?: string; academicStanding?: string }>
): Promise<SalaryPromotionRecord[]> {
  const rows = staffList.map((s) => ({
    fiscal_period_id: fiscalPeriodId,
    staff_id: s.id,
    position_snapshot: s.position || 'ครูผู้สอน',
    standing_snapshot: s.academicStanding || '-',
    salary_before: 0,
    calculation_base: 0,
    promotion_percent: 0,
    salary_after: 0,
    order_no: '',
    notes: '',
  }));

  const { data, error } = await supabase
    .from('salary_promotion_records')
    .upsert(rows, { onConflict: 'fiscal_period_id,staff_id' })
    .select();

  if (error) {
    console.error('[snapshotStaffForFiscalPeriod Error]', error.message);
    throw new Error(`Failed to snapshot staff for fiscal period: ${error.message}`);
  }
  return data || [];
}
