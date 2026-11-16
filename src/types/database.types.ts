/**
 * =========================================================================
 * MANSTAT MODERN - SUPABASE DATABASE TYPE DEFINITIONS
 * =========================================================================
 * Strict TypeScript representation of 001_init_manstat_schema.sql
 * Conforms to Iron Law 2 (Strict Typing, No Any)
 * =========================================================================
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type StaffRole = 'teacher' | 'hr_admin' | 'director';
export type StaffStatus = 'ปกติ' | 'ช่วยราชการ' | 'ไปราชการ' | 'ลาออก' | 'ย้าย/เกษียณ';
export type LicenseType = 'P-License' | 'B-License' | 'A-License' | 'ผู้บริหารสถานศึกษา' | 'ศึกษานิเทศก์';
export type LeaveType =
  | 'ลาป่วย'
  | 'ลากิจส่วนตัว'
  | 'ลาพักผ่อน'
  | 'ลาคลอดบุตร'
  | 'ลาช่วยภริยาคลอดบุตร'
  | 'ลาอุปสมบท/ฮัจย์'
  | 'ลาตรวจเลือก/เตรียมพล'
  | 'ขออนุญาตออกนอกบริเวณสถานศึกษา'
  | 'ไปราชการ';
export type HalfDayPeriod = 'FULL' | 'MORNING' | 'AFTERNOON';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type WorkloadCategory =
  | 'ด้านที่ 1 การจัดการเรียนรู้'
  | 'ด้านที่ 2 การส่งเสริมสนับสนุน'
  | 'ด้านที่ 3 การพัฒนาตนเองและวิชาชีพ'
  | 'ด้านที่ 4 ภาระงานตามที่ ก.ค.ศ. กำหนด'
  | 'งานบริหาร 4 ฝ่าย';

export interface Database {
  public: {
    Tables: {
      school_settings: {
        Row: {
          id: string;
          school_name: string;
          affiliation: string;
          school_code_10: string;
          school_code_8: string;
          director_name: string;
          director_position: string;
          current_fiscal_year: number;
          current_academic_year: number;
          current_term: number;
          student_count: number;
          student_data_date: string | null;
          contact_phone: string | null;
          address: string | null;
          logo_base64: string | null;
          alert_settings: {
            leave_count_threshold: number;
            sick_personal_days_threshold: number;
            license_expiry_warning_days: number;
            retirement_warning_years: number;
          };
          updated_at: string;
        };
        Insert: {
          id?: string;
          school_name?: string;
          affiliation?: string;
          school_code_10?: string;
          school_code_8?: string;
          director_name?: string;
          director_position?: string;
          current_fiscal_year?: number;
          current_academic_year?: number;
          current_term?: number;
          student_count?: number;
          student_data_date?: string | null;
          contact_phone?: string | null;
          address?: string | null;
          logo_base64?: string | null;
          alert_settings?: {
            leave_count_threshold?: number;
            sick_personal_days_threshold?: number;
            license_expiry_warning_days?: number;
            retirement_warning_years?: number;
          };
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['school_settings']['Insert']>;
      };

      staff: {
        Row: {
          id: string;
          user_id: string | null;
          emp_id: string;
          email: string;
          full_name: string;
          role: StaffRole;
          position: string;
          standing: string | null;
          department: string;
          division: string | null;
          position_no: string | null;
          member_id: string | null;
          birth_date: string;
          start_date: string;
          duty_day: string | null;
          phone: string | null;
          status: StaffStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          emp_id: string;
          email: string;
          full_name: string;
          role?: StaffRole;
          position?: string;
          standing?: string | null;
          department?: string;
          division?: string | null;
          position_no?: string | null;
          member_id?: string | null;
          birth_date: string;
          start_date: string;
          duty_day?: string | null;
          phone?: string | null;
          status?: StaffStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['staff']['Insert']>;
      };

      staff_sensitive: {
        Row: {
          emp_id: string;
          citizen_id: string;
          salary: number;
          bank_account: string | null;
          blood_group: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          emp_id: string;
          citizen_id: string;
          salary?: number;
          bank_account?: string | null;
          blood_group?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['staff_sensitive']['Insert']>;
      };

      licenses: {
        Row: {
          id: string;
          emp_id: string;
          license_type: LicenseType;
          license_number: string;
          issue_date: string;
          expiry_date: string;
          doc_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          emp_id: string;
          license_type: LicenseType;
          license_number: string;
          issue_date: string;
          expiry_date: string;
          doc_url?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['licenses']['Insert']>;
      };

      holidays: {
        Row: {
          holiday_date: string;
          title: string;
          holiday_type: string;
          created_at: string;
        };
        Insert: {
          holiday_date: string;
          title: string;
          holiday_type?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['holidays']['Insert']>;
      };

      leave_requests: {
        Row: {
          id: string;
          leave_code: string;
          emp_id: string;
          leave_type: LeaveType;
          start_date: string;
          end_date: string;
          half_day_period: HalfDayPeriod;
          total_days: number;
          fiscal_year: number;
          eval_round: 1 | 2;
          reason: string;
          contact_address: string | null;
          contact_phone: string | null;
          medical_cert_url: string | null;
          status: ApprovalStatus;
          step_hr: 'pending' | 'approved' | 'rejected';
          step_director: 'pending' | 'approved' | 'rejected';
          approver_id: string | null;
          approved_at: string | null;
          rejection_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          leave_code: string;
          emp_id: string;
          leave_type: LeaveType;
          start_date: string;
          end_date: string;
          half_day_period?: HalfDayPeriod;
          total_days: number;
          fiscal_year: number;
          eval_round: 1 | 2;
          reason: string;
          contact_address?: string | null;
          contact_phone?: string | null;
          medical_cert_url?: string | null;
          status?: ApprovalStatus;
          step_hr?: 'pending' | 'approved' | 'rejected';
          step_director?: 'pending' | 'approved' | 'rejected';
          approver_id?: string | null;
          approved_at?: string | null;
          rejection_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['leave_requests']['Insert']>;
      };

      workloads: {
        Row: {
          id: string;
          emp_id: string;
          category: WorkloadCategory;
          title: string;
          hours_per_week: number;
          role_in_task: string;
          academic_term: string;
          fiscal_year: number;
          order_reference: string | null;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          emp_id: string;
          category: WorkloadCategory;
          title: string;
          hours_per_week?: number;
          role_in_task?: string;
          academic_term?: string;
          fiscal_year?: number;
          order_reference?: string | null;
          status?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['workloads']['Insert']>;
      };

      audit_logs: {
        Row: {
          id: string;
          user_id: string | null;
          emp_id: string | null;
          action: string;
          target_type: string;
          target_id: string | null;
          details: Json;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          emp_id?: string | null;
          action: string;
          target_type: string;
          target_id?: string | null;
          details?: Json;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['audit_logs']['Insert']>;
      };
    };

    Views: {
      v_leave_promotion_radar: {
        Row: {
          emp_id: string;
          full_name: string;
          position: string;
          department: string;
          fiscal_year: number;
          eval_round: number;
          leave_count: number;
          sick_personal_days: number;
          sick_days: number;
          personal_days: number;
          vacation_days: number;
          total_leave_days: number;
          is_leave_count_exceeded: boolean;
          is_days_exceeded: boolean;
        };
      };
    };

    Functions: {
      fn_calculate_working_days: {
        Args: {
          p_start_date: string;
          p_end_date: string;
          p_leave_type: string;
          p_half_day_period?: string;
        };
        Returns: number;
      };
      auth_user_role: {
        Args: Record<string, never>;
        Returns: string;
      };
    };
  };
}
