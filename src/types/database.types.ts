/**
 * ============================================================================
 * ManStat: Database TypeScript Schema Types
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
export type UserRole = 'teacher' | 'hr_admin' | 'director' | 'superuser';

export type LeaveTypeEnum =
  | 'ลาป่วย'
  | 'ลากิจส่วนตัว'
  | 'ลาคลอดบุตร'
  | 'ลาไปช่วยเหลือภริยาที่คลอดบุตร'
  | 'ลาพักผ่อน'
  | 'ลาอุปสมบทหรือการลาไปประกอบพิธีฮัจย์'
  | 'ลาเข้ารับการตรวจเลือกหรือเข้ารับการเตรียมพล'
  | 'ลาไปศึกษา ฝึกอบรม ปฏิบัติการวิจัย หรือดูงาน'
  | 'ลาไปปฏิบัติงานในองค์การระหว่างประเทศ'
  | 'ลาติดตามคู่สมรส'
  | 'ลาไปฟื้นฟูสมรรถภาพด้านอาชีพ'
  | 'ขออนุญาตออกนอกบริเวณโรงเรียน'
  | 'ขออนุญาตไปราชการ';

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

export interface UserPreferences {
  theme_mode: 'light' | 'dark' | 'auto';
  preferred_view: 'table' | 'grid';
  compact_mode: boolean;
  mask_citizen_id: boolean;
}

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
          preferences?: Json | null;
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
          preferences?: Json | null;
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
          preferences?: Json | null;
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

      academic_years: {
        Row: {
          id: string;
          school_id: string;
          year_th: number;
          offered_grades: Json;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          school_id?: string;
          year_th: number;
          offered_grades?: Json;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          year_th?: number;
          offered_grades?: Json;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      student_census_snapshots: {
        Row: {
          id: string;
          academic_year_id: string;
          round_code: 'JUN_10' | 'NOV_10';
          snapshot_date: string;
          fiscal_year_th: number;
          kindergarten_students: number;
          kindergarten_classrooms: number;
          primary_students: number;
          primary_classrooms: number;
          secondary_students: number;
          secondary_classrooms: number;
          total_students: number;
          total_classrooms: number;
          is_primary_for_manpower: boolean;
          is_locked: boolean;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          academic_year_id: string;
          round_code: 'JUN_10' | 'NOV_10';
          snapshot_date: string;
          fiscal_year_th?: number;
          kindergarten_students?: number;
          kindergarten_classrooms?: number;
          primary_students?: number;
          primary_classrooms?: number;
          secondary_students?: number;
          secondary_classrooms?: number;
          total_students?: number;
          total_classrooms?: number;
          is_primary_for_manpower?: boolean;
          is_locked?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          academic_year_id?: string;
          round_code?: 'JUN_10' | 'NOV_10';
          snapshot_date?: string;
          fiscal_year_th?: number;
          kindergarten_students?: number;
          kindergarten_classrooms?: number;
          primary_students?: number;
          primary_classrooms?: number;
          secondary_students?: number;
          secondary_classrooms?: number;
          total_students?: number;
          total_classrooms?: number;
          is_primary_for_manpower?: boolean;
          is_locked?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'student_census_snapshots_academic_year_id_fkey';
            columns: ['academic_year_id'];
            isOneToOne: false;
            referencedRelation: 'academic_years';
            referencedColumns: ['id'];
          }
        ];
      };

      fiscal_periods: {
        Row: {
          id: string;
          school_id: string;
          fiscal_year_th: number;
          round_no: 1 | 2;
          eval_start: string;
          eval_end: string;
          ref_census_snapshot_id: string | null;
          is_active: boolean;
          is_locked: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          school_id?: string;
          fiscal_year_th: number;
          round_no: 1 | 2;
          eval_start: string;
          eval_end: string;
          ref_census_snapshot_id?: string | null;
          is_active?: boolean;
          is_locked?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          fiscal_year_th?: number;
          round_no?: 1 | 2;
          eval_start?: string;
          eval_end?: string;
          ref_census_snapshot_id?: string | null;
          is_active?: boolean;
          is_locked?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'fiscal_periods_ref_census_snapshot_id_fkey';
            columns: ['ref_census_snapshot_id'];
            isOneToOne: false;
            referencedRelation: 'student_census_snapshots';
            referencedColumns: ['id'];
          }
        ];
      };

      salary_promotion_records: {
        Row: {
          id: string;
          fiscal_period_id: string;
          staff_id: string;
          position_snapshot: string;
          standing_snapshot: string;
          salary_before: number;
          calculation_base: number;
          promotion_percent: number;
          salary_after: number;
          order_no: string | null;
          order_date: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          fiscal_period_id: string;
          staff_id: string;
          position_snapshot?: string;
          standing_snapshot?: string;
          salary_before?: number;
          calculation_base?: number;
          promotion_percent?: number;
          salary_after?: number;
          order_no?: string | null;
          order_date?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          fiscal_period_id?: string;
          staff_id?: string;
          position_snapshot?: string;
          standing_snapshot?: string;
          salary_before?: number;
          calculation_base?: number;
          promotion_percent?: number;
          salary_after?: number;
          order_no?: string | null;
          order_date?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'salary_promotion_records_fiscal_period_id_fkey';
            columns: ['fiscal_period_id'];
            isOneToOne: false;
            referencedRelation: 'fiscal_periods';
            referencedColumns: ['id'];
          }
        ];
      };
    };

    Views: {
      v_school_info_current: {
        Row: {
          schoolName: string;
          affiliation: string;
          schoolCode10: string;
          schoolCode8: string;
          appName: string;
          directorName: string;
          directorPosition: string;
          contactPhone: string;
          email: string;
          address: string;
          lat: number | null;
          lng: number | null;
          logoBase64: string | null;
          actingDirector1: string;
          actingDirector2: string;
          currentTerm: string;
          academicYear: string;
          studentCount: number;
          studentDataDate: string | null;
          fiscalYear: string;
          activeClasses: Json;
          activeAcademicYearId: string | null;
          primaryCensusId: string | null;
          censusRoundCode: string | null;
          activeFiscalPeriodId: string | null;
          fiscalRoundNo: number | null;
        };
        Relationships: [];
      };
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

      set_active_academic_year: {
        Args: {
          p_school_id: string;
          p_academic_year_id: string;
        };
        Returns: boolean;
      };

      create_academic_year_with_defaults: {
        Args: {
          p_school_id: string;
          p_year_th: number;
        };
        Returns: string;
      };

      set_primary_census_round: {
        Args: {
          p_academic_year_id: string;
          p_snapshot_id: string;
        };
        Returns: boolean;
      };

      set_active_fiscal_period: {
        Args: {
          p_school_id: string;
          p_fiscal_period_id: string;
        };
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

export type AcademicYear = Database['public']['Tables']['academic_years']['Row'];
export type StudentCensusSnapshot = Database['public']['Tables']['student_census_snapshots']['Row'];
export type FiscalPeriod = Database['public']['Tables']['fiscal_periods']['Row'];
export type SalaryPromotionRecord = Database['public']['Tables']['salary_promotion_records']['Row'];

export type StaffDirectoryView = Database['public']['Views']['v_staff_directory']['Row'];
export type LeavePromotionRadarView = Database['public']['Views']['v_leave_promotion_radar']['Row'];
export type LicenseStatusView = Database['public']['Views']['v_license_status']['Row'];
export type SchoolInfoCurrentView = Database['public']['Views']['v_school_info_current']['Row'];
