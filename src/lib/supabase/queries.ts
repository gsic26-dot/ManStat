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
  LeaveStatusEnum
} from '@/types/database.types';

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
