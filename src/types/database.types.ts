/**
 * ============================================================================
 * ManStat-Modern: Database TypeScript Schema Types
 * ============================================================================
 * 100% Strict Mapping to /supabase/migrations/001_init_manstat_schema.sql
 * Conforms to Iron Law 2: Strict Typing, No Any.
 * ============================================================================
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ----------------------------------------------------------------------------
// Custom PostgreSQL Enums
// ----------------------------------------------------------------------------
export type UserRole = 'teacher' | 'hr_admin' | 'director';

export type LeaveTypeEnum =
  | 'ลาป่วย'
  | 'ลากิจส่วนตัว'
  | 'ลาคลอดบุตร'
  | 'ลาไปช่วยเหลือภริยาที่คลอดบุตร'
  | 'ลาพักผ่อน'
  | 'ลาอุปสมบทหรือการลาไปประกอบพิธีฮัจย์'
  | 'ลาเข้ารับการตรวจเลือกหรือเข้ารับการเตรียมพล'
  | 'ลาไปศึกษา ฝึกอบรม ปฏิบัติการวิจัย หรือดูงาน';

export type LeaveStatusEnum = 'pending' | 'reviewed' | 'approved' | 'rejected' | 'cancelled';

export type HalfDayEnum = 'full' | 'morning' | 'afternoon';

export type LicenseTypeEnum =
  | 'P-License'
  | 'B-License'
  | 'A-License'
  | 'ผู้บริหารสถานศึกษา'
  | 'ผู้บริหารการศึกษา'
  | 'ศึกษานิเทศก์';

export type LicenseHealthStatus = 'VALID' | 'EXPIRING_SOON' | 'EXPIRED';

// Aliases for regulatory engine compatibility
export type LeaveType = LeaveTypeEnum;
export type HalfDayPeriod = HalfDayEnum;
export type LicenseType = LicenseTypeEnum;
export type StaffRole = UserRole;

// ----------------------------------------------------------------------------
// Supabase Database Interface
// ----------------------------------------------------------------------------
export interface Database {
  public: {
    Tables: {
      school_settings: {
        Row: {
          id: string;
          school_code: string;
          school_name: string;
          affiliation: string;
          director_name: string | null;
          director_position: string | null;
          current_fiscal_year: number;
          student_count: number;
          classroom_count: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          school_code?: string;
          school_name?: string;
          affiliation?: string;
          director_name?: string | null;
          director_position?: string | null;
          current_fiscal_year?: number;
          student_count?: number;
          classroom_count?: number;
          updated_at?: string;
        };
        Update: {
          id?: string;
          school_code?: string;
          school_name?: string;
          affiliation?: string;
          director_name?: string | null;
          director_position?: string | null;
          current_fiscal_year?: number;
          student_count?: number;
          classroom_count?: number;
          updated_at?: string;
        };
        Relationships: [];
      };

      staff: {
        Row: {
          id: string; // References auth.users(id)
          employee_code: string | null;
          prefix: string;
          first_name: string;
          last_name: string;
          position_name: string;
          academic_standing: string | null;
          department: string | null;
          birth_date: string;
          start_service_date: string;
          is_year_round_staff: boolean;
          role: UserRole;
          signature_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          employee_code?: string | null;
          prefix: string;
          first_name: string;
          last_name: string;
          position_name?: string;
          academic_standing?: string | null;
          department?: string | null;
          birth_date: string;
          start_service_date: string;
          is_year_round_staff?: boolean;
          role?: UserRole;
          signature_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          employee_code?: string | null;
          prefix?: string;
          first_name?: string;
          last_name?: string;
          position_name?: string;
          academic_standing?: string | null;
          department?: string | null;
          birth_date?: string;
          start_service_date?: string;
          is_year_round_staff?: boolean;
          role?: UserRole;
          signature_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      staff_sensitive: {
        Row: {
          staff_id: string; // References staff(id)
          citizen_id: string;
          phone_number: string | null;
          current_salary: number;
          bank_account: string | null;
          updated_at: string;
        };
        Insert: {
          staff_id: string;
          citizen_id: string;
          phone_number?: string | null;
          current_salary?: number;
          bank_account?: string | null;
          updated_at?: string;
        };
        Update: {
          staff_id?: string;
          citizen_id?: string;
          phone_number?: string | null;
          current_salary?: number;
          bank_account?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "staff_sensitive_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: true;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          }
        ];
      };

      licenses: {
        Row: {
          id: string;
          staff_id: string;
          license_number: string;
          license_type: LicenseTypeEnum;
          issued_date: string;
          expiry_date: string;
          document_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          staff_id: string;
          license_number: string;
          license_type?: LicenseTypeEnum;
          issued_date: string;
          expiry_date: string;
          document_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          staff_id?: string;
          license_number?: string;
          license_type?: LicenseTypeEnum;
          issued_date?: string;
          expiry_date?: string;
          document_url?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "licenses_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          }
        ];
      };

      holidays: {
        Row: {
          id: string;
          holiday_date: string;
          holiday_name: string;
          fiscal_year: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          holiday_date: string;
          holiday_name: string;
          fiscal_year: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          holiday_date?: string;
          holiday_name?: string;
          fiscal_year?: number;
          created_at?: string;
        };
        Relationships: [];
      };

      leave_requests: {
        Row: {
          id: string;
          document_no: string | null;
          staff_id: string;
          leave_type: LeaveTypeEnum;
          start_date: string;
          end_date: string;
          half_day: HalfDayEnum;
          total_days: number;
          fiscal_year: number;
          eval_round: 1 | 2;
          reason: string;
          contact_address: string | null;
          medical_cert_required: boolean;
          medical_cert_url: string | null;
          substitute_staff_id: string | null;
          status: LeaveStatusEnum;
          reviewer_id: string | null;
          reviewed_at: string | null;
          approver_id: string | null;
          approved_at: string | null;
          rejection_reason: string | null;
          is_retroactive: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          document_no?: string | null;
          staff_id: string;
          leave_type: LeaveTypeEnum;
          start_date: string;
          end_date: string;
          half_day?: HalfDayEnum;
          total_days: number;
          fiscal_year: number;
          eval_round: 1 | 2;
          reason: string;
          contact_address?: string | null;
          medical_cert_required?: boolean;
          medical_cert_url?: string | null;
          substitute_staff_id?: string | null;
          status?: LeaveStatusEnum;
          reviewer_id?: string | null;
          reviewed_at?: string | null;
          approver_id?: string | null;
          approved_at?: string | null;
          rejection_reason?: string | null;
          is_retroactive?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          document_no?: string | null;
          staff_id?: string;
          leave_type?: LeaveTypeEnum;
          start_date?: string;
          end_date?: string;
          half_day?: HalfDayEnum;
          total_days?: number;
          fiscal_year?: number;
          eval_round?: 1 | 2;
          reason?: string;
          contact_address?: string | null;
          medical_cert_required?: boolean;
          medical_cert_url?: string | null;
          substitute_staff_id?: string | null;
          status?: LeaveStatusEnum;
          reviewer_id?: string | null;
          reviewed_at?: string | null;
          approver_id?: string | null;
          approved_at?: string | null;
          rejection_reason?: string | null;
          is_retroactive?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "leave_requests_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          }
        ];
      };

      workloads: {
        Row: {
          id: string;
          staff_id: string;
          fiscal_year: number;
          semester: 1 | 2;
          teaching_hours: number;
          support_hours: number;
          development_hours: number;
          policy_hours: number;
          admin_division: string | null;
          obec_systems: Json;
          updated_at: string;
        };
        Insert: {
          id?: string;
          staff_id: string;
          fiscal_year: number;
          semester: 1 | 2;
          teaching_hours?: number;
          support_hours?: number;
          development_hours?: number;
          policy_hours?: number;
          admin_division?: string | null;
          obec_systems?: Json;
          updated_at?: string;
        };
        Update: {
          id?: string;
          staff_id?: string;
          fiscal_year?: number;
          semester?: 1 | 2;
          teaching_hours?: number;
          support_hours?: number;
          development_hours?: number;
          policy_hours?: number;
          admin_division?: string | null;
          obec_systems?: Json;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workloads_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          }
        ];
      };

      audit_logs: {
        Row: {
          id: string;
          actor_id: string | null;
          action_type: string;
          target_staff_id: string | null;
          details: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id?: string | null;
          action_type: string;
          target_staff_id?: string | null;
          details?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          actor_id?: string | null;
          action_type?: string;
          target_staff_id?: string | null;
          details?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
    };

    Views: {
      v_staff_directory: {
        Row: {
          id: string;
          employee_code: string | null;
          prefix: string;
          first_name: string;
          last_name: string;
          full_name: string;
          position_name: string;
          academic_standing: string | null;
          department: string | null;
          birth_date: string;
          start_service_date: string;
          role: UserRole;
          is_active: boolean;
          retirement_fiscal_year_be: number;
          retirement_date_ce: string;
          masked_citizen_id: string;
        };
        Relationships: [];
      };

      v_leave_promotion_radar: {
        Row: {
          staff_id: string;
          full_name: string;
          position_name: string;
          fiscal_year: number | null;
          eval_round: 1 | 2 | null;
          leave_occurrences: number;
          sick_days: number;
          personal_days: number;
          combined_sick_personal_days: number;
          is_exceed_occurrences_limit: boolean;
          is_exceed_days_limit: boolean;
        };
        Relationships: [];
      };

      v_license_status: {
        Row: {
          id: string;
          staff_id: string;
          license_number: string;
          license_type: LicenseTypeEnum;
          issued_date: string;
          expiry_date: string;
          document_url: string | null;
          created_at: string;
          full_name: string;
          days_remaining: number;
          license_health: LicenseHealthStatus;
        };
        Relationships: [];
      };
    };

    Functions: {
      rpc_reveal_citizen_id: {
        Args: {
          p_target_staff_id: string;
        };
        Returns: string;
      };

      fn_calculate_leave_days: {
        Args: {
          p_start_date: string;
          p_end_date: string;
          p_leave_type: LeaveTypeEnum;
          p_half_day?: HalfDayEnum;
        };
        Returns: number;
      };

      fn_calculate_retirement_year_be: {
        Args: {
          b_date: string;
        };
        Returns: number;
      };

      fn_get_fiscal_year_be: {
        Args: {
          target_date: string;
        };
        Returns: number;
      };

      fn_get_eval_round: {
        Args: {
          target_date: string;
        };
        Returns: number;
      };

      fn_is_admin_or_director: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
  };
}

// ----------------------------------------------------------------------------
// Convenience Row Types for Application Code
// ----------------------------------------------------------------------------
export type SchoolSettings = Database['public']['Tables']['school_settings']['Row'];
export type Staff = Database['public']['Tables']['staff']['Row'];
export type StaffSensitive = Database['public']['Tables']['staff_sensitive']['Row'];
export type License = Database['public']['Tables']['licenses']['Row'];
export type Holiday = Database['public']['Tables']['holidays']['Row'];
export type LeaveRequest = Database['public']['Tables']['leave_requests']['Row'];
export type Workload = Database['public']['Tables']['workloads']['Row'];
export type AuditLog = Database['public']['Tables']['audit_logs']['Row'];

export type StaffDirectoryView = Database['public']['Views']['v_staff_directory']['Row'];
export type LeavePromotionRadarView = Database['public']['Views']['v_leave_promotion_radar']['Row'];
export type LicenseStatusView = Database['public']['Views']['v_license_status']['Row'];
