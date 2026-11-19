'use client';

/**
 * ============================================================================
 * ManStat-Modern: Main Application & Legacy Multi-View Navigation Hub
 * ============================================================================
 * - Full restoration of all 14 legacy ManStat views and features
 * - Steam Dark Theme responsive navigation sidebar
 * - 4 Functional Groupings:
 *   1. ระบบการลา (Leave Management)
 *   2. การบริหารและภาระงาน (School Governance & Duties)
 *   3. ทะเบียนประวัติ (Personnel & Professional Registry)
 *   4. การตั้งค่า / อื่นๆ (System Settings & Feedback)
 * - Seamless view switching with zero page reloads
 * - Zero Emojis, Pure Lucide SVG Icons, 8px Standard Spacing
 * ============================================================================
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ThemeSwitcher } from '@/components/theme/ThemeSwitcher';
import { UserProfileDropdown } from '@/components/navigation/UserProfileDropdown';
import { isAdminRole } from '@/lib/auth/roles';
import type { UserRole } from '@/types/database.types';
import {
  INITIAL_SCHOOL_INFO,
  INITIAL_TEACHERS,
  INITIAL_LEAVE_REQUESTS,
  SchoolInfoRecord,
  TeacherRecord,
  LeaveRequestRecord,
} from '@/lib/data/schoolData';
import {
  calculateRetirementInfo,
  getFiscalYearBE,
  getEvalRound,
} from '@/lib/regulations/fiscal-and-retirement';
import {
  School,
  Calendar,
  PlusCircle,
  ShieldCheck,
  Bell,
  LogOut,
  User,
  Settings,
  X,
  LayoutDashboard,
  FileText,
  RotateCcw,
  TrendingUp,
  Network,
  Users,
  Briefcase,
  GraduationCap,
  Award,
  BadgeCheck,
  MessageSquare,
  Menu,
  Scale,
  Sliders,
} from 'lucide-react';
import { UserSettingsModal } from '@/components/settings/UserSettingsModal';

// Core Dashboard Components
import { PersonnelSummaryCards } from '@/components/dashboard/PersonnelSummaryCards';
import { LeaveProgressRings } from '@/components/dashboard/LeaveProgressRings';
import { PromotionRadarCard } from '@/components/dashboard/PromotionRadarCard';
import { PendingApprovalQueue } from '@/components/dashboard/PendingApprovalQueue';
import { useLeaveRealtime } from '@/hooks/useLeaveRealtime';
import { isZeroDayLeaveType } from '@/lib/regulations/leaveTypes';

// View Components
import { ViewStaffDirectory } from '@/components/views/ViewStaffDirectory';
import { ViewRegLicense } from '@/components/views/ViewRegLicense';
import { ViewRegStanding } from '@/components/views/ViewRegStanding';
import { ViewOrgChart } from '@/components/views/ViewOrgChart';
import { ViewSchoolBoard } from '@/components/views/ViewSchoolBoard';
import { ViewWorkload } from '@/components/views/ViewWorkload';
import { ViewLeaveHub } from '@/components/views/ViewLeaveHub';
import { ViewLeaveReportsHub } from '@/components/views/ViewLeaveReportsHub';
import { ViewRetroLeave } from '@/components/views/ViewRetroLeave';
import { ViewRegScout } from '@/components/views/ViewRegScout';
import { ViewFeedback } from '@/components/views/ViewFeedback';
import { ViewLeaveSubmit } from '@/components/views/ViewLeaveSubmit';

export type ActiveView =
  | 'dashboard'
  | 'leave'
  | 'tracking_requests'
  | 'requests'
  | 'tracking'
  | 'retro_leave'
  | 'leave_reports'
  | 'analytics'
  | 'official_reports'
  | 'org_chart'
  | 'school_board'
  | 'workload'
  | 'staff_directory'
  | 'dir_standing'
  | 'dir_scout'
  | 'dir_license'
  | 'feedback';

export default function DashboardPage() {
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isLegalModalOpen, setIsLegalModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  // Default to safe 'teacher' role - NEVER default to superuser
  const [currentRole, setCurrentRole] = useState<UserRole>('teacher');
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Synchronize authenticated user and real role from Server Auth & localStorage
  useEffect(() => {
    // 1. Initial 0ms hydration from localStorage
    if (typeof window !== 'undefined') {
      const storedRole = localStorage.getItem('manstat_auth_role') as UserRole;
      if (storedRole) {
        setCurrentRole(storedRole);
      }
      const storedUser = localStorage.getItem('manstat_auth_user');
      if (storedUser) {
        try {
          setCurrentUser(JSON.parse(storedUser));
        } catch {
          // ignore
        }
      }
    }

    // 2. Real-time verification from /api/auth/me
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.user) {
          setCurrentUser(res.user);
          setCurrentRole(res.user.role || 'teacher');
          if (typeof window !== 'undefined') {
            localStorage.setItem('manstat_auth_role', res.user.role || 'teacher');
            localStorage.setItem('manstat_auth_user', JSON.stringify(res.user));
          }
        }
      })
      .catch((err) => console.warn('[Auth Me Error]', err));
  }, []);

  // Real-time toast notifications hook
  const { toasts, dismissToast } = useLeaveRealtime({ enableToasts: true });

  const [staffList, setStaffList] = useState<TeacherRecord[]>(INITIAL_TEACHERS);
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfoRecord>(INITIAL_SCHOOL_INFO);
  const [leaveList, setLeaveList] = useState<LeaveRequestRecord[]>(INITIAL_LEAVE_REQUESTS);

  const loadLeaveList = useCallback(() => {
    fetch('/api/admin/leave')
      .then((r) => r.json())
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setLeaveList(res.data);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let isMounted = true;
    fetch('/api/admin/staff')
      .then((r) => r.json())
      .then((res) => {
        if (res.success && Array.isArray(res.data) && isMounted) {
          setStaffList(res.data);
        }
      })
      .catch(() => {});

    fetch('/api/admin/school')
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data && isMounted) {
          setSchoolInfo(res.data);
        }
      })
      .catch(() => {});

    loadLeaveList();

    return () => {
      isMounted = false;
    };
  }, [loadLeaveList]);

  // Dynamic real-time Thai Date & Regulations
  const now = new Date();
  const daysThai = ['วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'];
  const monthsThai = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  const currentDateThai = `${daysThai[now.getDay()]}ที่ ${now.getDate()} ${monthsThai[now.getMonth()]} ${now.getFullYear() + 543}`;
  const fiscalYearBE = parseInt(schoolInfo.fiscalYear) || getFiscalYearBE(now);
  const currentRound = getEvalRound(now);

  // Live Metrics Calculations
  const todayISO = now.toISOString().split('T')[0];

  // 1. Staff on leave today (approved requests whose range covers today; excluding 0-day school exit / official mission)
  const staffOnLeaveToday = leaveList.filter((r) => {
    if (r.status !== 'approved') return false;
    if (r.totalDays === 0 || isZeroDayLeaveType(r.leaveTypeName) || isZeroDayLeaveType(r.leaveType)) return false;
    return r.startDate <= todayISO && todayISO <= r.endDate;
  });
  const onLeaveCount = staffOnLeaveToday.length;
  const onDutyCount = Math.max(0, staffList.length - onLeaveCount);
  const onLeaveDetail =
    staffOnLeaveToday.length > 0
      ? staffOnLeaveToday.map((s) => `${s.teacherName} (${s.leaveTypeName})`).join(', ')
      : 'ไม่มีบุคลากรลาในวันนี้';

  // 2. Staff retiring in current fiscal year (Civil service retirement calculation)
  const staffRetiringThisYear = staffList.filter((t) => {
    if (!t.birthDate) return false;
    try {
      const ret = calculateRetirementInfo(t.birthDate, now);
      return ret.retireFiscalYearBE === fiscalYearBE && !ret.isRetired;
    } catch {
      return false;
    }
  });
  const retiringCount = staffRetiringThisYear.length;
  const retiringDetail =
    retiringCount > 0
      ? staffRetiringThisYear.map((s) => s.name).join(', ')
      : `ปีงบฯ ${fiscalYearBE} ไม่มีผู้เกษียณ`;

  const handleSelectView = (view: ActiveView) => {
    setActiveView(view);
    setIsMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0b1016] text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white dark:bg-[#121822] border-b border-slate-200/90 dark:border-slate-800/80 print:hidden transition-colors duration-200">
        <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Mobile Menu Trigger */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/50 transition-colors duration-200 focus:outline-none"
              title="เปิดเมนูนำทาง"
            >
              <Menu className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => handleSelectView('dashboard')}
              className="flex items-center gap-3 text-left focus:outline-none"
            >
              <div className="p-2 rounded-lg bg-sky-600 text-white">
                <School className="w-5 h-5 shrink-0" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base tracking-tight text-slate-900 dark:text-white">ManStat-Modern</span>
                  <span className="px-2 py-0.5 text-[10px] uppercase font-mono font-semibold rounded bg-sky-500/15 text-sky-600 dark:text-sky-300 border border-sky-500/30">
                    สพป.นม. 3
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{schoolInfo.schoolName} (Zero-GAS Cloud)</p>
              </div>
            </button>
          </div>

          {/* Right Action Tools */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Compact 3-Mode Theme Switcher (Popover) */}
            <ThemeSwitcher />

            {/* Admin Management Link */}
            {isAdminRole(currentRole) && (
              <Link
                href="/admin"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 border border-slate-200/90 dark:bg-[#121822] dark:hover:bg-slate-800/70 dark:text-slate-300 dark:hover:text-white dark:border-slate-800/80 text-xs font-medium transition-colors duration-200 cursor-pointer"
                title="เข้าสู่ระบบจัดการผู้ดูแลระบบ (Admin Center)"
              >
                <Settings className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400 shrink-0" />
                <span className="text-xs font-semibold">ศูนย์ผู้ดูแลระบบ</span>
              </Link>
            )}

            {/* Consolidated User Profile Dropdown */}
            <UserProfileDropdown
              onOpenSettings={() => setIsSettingsModalOpen(true)}
              showAdminCenterLink={isAdminRole(currentRole)}
              currentUser={currentUser}
              currentRole={currentRole}
            />
          </div>
        </div>
      </header>

      {/* Main Layout Container (Sidebar + Content) */}
      <div className="flex-1 flex w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 gap-6 print:max-w-none print:p-0 print:m-0 print:w-full print:block">
        {/* Left Navigation Sidebar (Desktop) */}
        <aside className="hidden lg:block w-64 shrink-0 print:hidden">
          <div className="bg-white dark:bg-[#121822] rounded-xl border border-slate-200/90 dark:border-slate-800/80 p-2.5 sticky top-20 flex flex-col justify-between shadow-sm dark:shadow-xl transition-colors duration-200">
            <div className="space-y-1">
              {/* หมวด 1: ภาพรวม (Overview) */}
              <div>
                <div className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  หมวด 1: ภาพรวม
                </div>
                <button
                  type="button"
                  onClick={() => handleSelectView('dashboard')}
                  className={`w-full flex items-center justify-between py-2 px-3 text-sm rounded-md transition-all ${
                    activeView === 'dashboard'
                      ? 'bg-sky-50 text-sky-900 border-l-2 border-sky-600 font-semibold dark:bg-slate-800/70 dark:text-white dark:border-sky-500'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/30'
                  }`}
                  title="สถิติและภาพรวม"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <LayoutDashboard className="w-4 h-4 shrink-0 text-sky-500 dark:text-sky-400" />
                    <span className="truncate">สถิติและภาพรวม</span>
                  </div>
                </button>
              </div>

              {/* หมวด 2: งานวันลา (Leave Services) */}
              <div>
                <div className="px-3 pt-3.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate" title="หมวด 2: งานวันลา">
                  หมวด 2: งานวันลา
                </div>
                <div className="space-y-0.5">
                  <button
                    type="button"
                    onClick={() => handleSelectView('leave')}
                    className={`w-full flex items-center justify-between py-2 px-3 text-sm rounded-md transition-all ${
                      activeView === 'leave'
                        ? 'bg-sky-50 text-sky-900 border-l-2 border-sky-600 font-semibold dark:bg-slate-800/70 dark:text-white dark:border-sky-500'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/30'
                    }`}
                    title="ยื่นคำร้องขอลา"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <PlusCircle className="w-4 h-4 shrink-0 text-emerald-500 dark:text-emerald-400" />
                      <span className="truncate">ยื่นคำร้องขอลา</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectView('tracking_requests')}
                    className={`w-full flex items-center justify-between py-2 px-3 text-sm rounded-md transition-all ${
                      activeView === 'tracking_requests' || activeView === 'requests' || activeView === 'tracking'
                        ? 'bg-sky-50 text-sky-900 border-l-2 border-sky-600 font-semibold dark:bg-slate-800/70 dark:text-white dark:border-sky-500'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/30'
                    }`}
                    title="ติดตามและประวัติการลา"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className="w-4 h-4 shrink-0 text-amber-500 dark:text-amber-400" />
                      <span className="truncate">ติดตามและประวัติการลา</span>
                    </div>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-500/30 shrink-0">
                      2
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectView('retro_leave')}
                    className={`w-full flex items-center justify-between py-2 px-3 text-sm rounded-md transition-all ${
                      activeView === 'retro_leave'
                        ? 'bg-sky-50 text-sky-900 border-l-2 border-sky-600 font-semibold dark:bg-slate-800/70 dark:text-white dark:border-sky-500'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/30'
                    }`}
                    title="บันทึกการลาย้อนหลัง"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <RotateCcw className="w-4 h-4 shrink-0 text-cyan-500 dark:text-cyan-400" />
                      <span className="truncate">บันทึกการลาย้อนหลัง</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectView('leave_reports')}
                    className={`w-full flex items-center justify-between py-2 px-3 text-sm rounded-md transition-all ${
                      activeView === 'leave_reports' || activeView === 'analytics' || activeView === 'official_reports'
                        ? 'bg-sky-50 text-sky-900 border-l-2 border-sky-600 font-semibold dark:bg-slate-800/70 dark:text-white dark:border-sky-500'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/30'
                    }`}
                    title="รายงานและสถิติวันลา"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <TrendingUp className="w-4 h-4 shrink-0 text-sky-500 dark:text-sky-400" />
                      <span className="truncate">รายงานและสถิติวันลา</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* หมวด 3: งานทะเบียนประวัติ (Personnel Registries) */}
              <div>
                <div className="px-3 pt-3.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate" title="หมวด 3: งานทะเบียนประวัติ">
                  หมวด 3: งานทะเบียนประวัติ
                </div>
                <div className="space-y-0.5">
                  <button
                    type="button"
                    onClick={() => handleSelectView('staff_directory')}
                    className={`w-full flex items-center justify-between py-2 px-3 text-sm rounded-md transition-all ${
                      activeView === 'staff_directory'
                        ? 'bg-sky-50 text-sky-900 border-l-2 border-sky-600 font-semibold dark:bg-slate-800/70 dark:text-white dark:border-sky-500'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/30'
                    }`}
                    title="ทะเบียนประวัติบุคลากร"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <User className="w-4 h-4 shrink-0 text-sky-500 dark:text-sky-400" />
                      <span className="truncate">ทะเบียนประวัติบุคลากร</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectView('dir_standing')}
                    className={`w-full flex items-center justify-between py-2 px-3 text-sm rounded-md transition-all ${
                      activeView === 'dir_standing'
                        ? 'bg-sky-50 text-sky-900 border-l-2 border-sky-600 font-semibold dark:bg-slate-800/70 dark:text-white dark:border-sky-500'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/30'
                    }`}
                    title="ทะเบียนวิทยฐานะ"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <GraduationCap className="w-4 h-4 shrink-0 text-cyan-500 dark:text-cyan-400" />
                      <span className="truncate">ทะเบียนวิทยฐานะ</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectView('dir_license')}
                    className={`w-full flex items-center justify-between py-2 px-3 text-sm rounded-md transition-all ${
                      activeView === 'dir_license'
                        ? 'bg-sky-50 text-sky-900 border-l-2 border-sky-600 font-semibold dark:bg-slate-800/70 dark:text-white dark:border-sky-500'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/30'
                    }`}
                    title="ทะเบียนใบอนุญาตฯ"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <BadgeCheck className="w-4 h-4 shrink-0 text-emerald-500 dark:text-emerald-400" />
                      <span className="truncate">ทะเบียนใบอนุญาตฯ</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectView('dir_scout')}
                    className={`w-full flex items-center justify-between py-2 px-3 text-sm rounded-md transition-all ${
                      activeView === 'dir_scout'
                        ? 'bg-sky-50 text-sky-900 border-l-2 border-sky-600 font-semibold dark:bg-slate-800/70 dark:text-white dark:border-sky-500'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/30'
                    }`}
                    title="ทะเบียนวุฒิลูกเสือ"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Award className="w-4 h-4 shrink-0 text-amber-500 dark:text-amber-400" />
                      <span className="truncate">ทะเบียนวุฒิลูกเสือ</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* หมวด 4: ข้อมูลสถานศึกษา (School Governance) */}
              <div>
                <div className="px-3 pt-3.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate" title="หมวด 4: ข้อมูลสถานศึกษา">
                  หมวด 4: ข้อมูลสถานศึกษา
                </div>
                <div className="space-y-0.5">
                  <button
                    type="button"
                    onClick={() => handleSelectView('school_board')}
                    className={`w-full flex items-center justify-between py-2 px-3 text-sm rounded-md transition-all ${
                      activeView === 'school_board'
                        ? 'bg-sky-50 text-sky-900 border-l-2 border-sky-600 font-semibold dark:bg-slate-800/70 dark:text-white dark:border-sky-500'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/30'
                    }`}
                    title="คณะกรรมการสถานศึกษา"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Users className="w-4 h-4 shrink-0 text-amber-500 dark:text-amber-400" />
                      <span className="truncate">คณะกรรมการสถานศึกษา</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectView('org_chart')}
                    className={`w-full flex items-center justify-between py-2 px-3 text-sm rounded-md transition-all ${
                      activeView === 'org_chart'
                        ? 'bg-sky-50 text-sky-900 border-l-2 border-sky-600 font-semibold dark:bg-slate-800/70 dark:text-white dark:border-sky-500'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/30'
                    }`}
                    title="โครงสร้างองค์กร"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Network className="w-4 h-4 shrink-0 text-cyan-500 dark:text-cyan-400" />
                      <span className="truncate">โครงสร้างองค์กร</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectView('workload')}
                    className={`w-full flex items-center justify-between py-2 px-3 text-sm rounded-md transition-all ${
                      activeView === 'workload'
                        ? 'bg-sky-50 text-sky-900 border-l-2 border-sky-600 font-semibold dark:bg-slate-800/70 dark:text-white dark:border-sky-500'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/30'
                    }`}
                    title="ตารางสอนและภาระงาน"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Briefcase className="w-4 h-4 shrink-0 text-emerald-500 dark:text-emerald-400" />
                      <span className="truncate">ตารางสอนและภาระงาน</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Footer Utility Link: แจ้งปรับปรุงระบบ & ศูนย์ผู้ดูแลระบบ */}
            <div className="pt-2.5 mt-2.5 border-t border-slate-200/90 dark:border-slate-800/80 space-y-1">
              {isAdminRole(currentRole) && (
                <Link
                  href="/admin"
                  className="w-full flex items-center justify-between py-1.5 px-3 text-xs rounded-md transition-all text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/30"
                  title="เข้าสู่ศูนย์ผู้ดูแลระบบ (Admin Center)"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-sky-500 dark:text-sky-400" />
                    <span className="truncate font-medium">ศูนย์ผู้ดูแลระบบ</span>
                  </div>
                  <span className="text-[10px] bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300 px-1.5 py-0.5 rounded font-semibold font-mono">
                    ADMIN
                  </span>
                </Link>
              )}
              <button
                type="button"
                onClick={() => handleSelectView('feedback')}
                className={`w-full flex items-center justify-between py-1.5 px-3 text-xs rounded-md transition-all ${
                  activeView === 'feedback'
                    ? 'bg-slate-100 text-slate-900 dark:bg-slate-800/70 dark:text-white font-medium'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/30'
                }`}
                title="แจ้งปรับปรุงระบบ"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <MessageSquare className="w-3.5 h-3.5 shrink-0 text-sky-500 dark:text-sky-400" />
                  <span className="truncate">แจ้งปรับปรุงระบบ</span>
                </div>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">v2.0</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Mobile Slide-Over Drawer Navigation */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex print:hidden">
            <div
              className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <div className="relative w-72 max-w-[80vw] bg-white dark:bg-[#121822] border-r border-slate-200/90 dark:border-slate-800/80 p-5 overflow-y-auto z-10 space-y-4 shadow-xl transition-colors duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <span className="font-bold text-slate-900 dark:text-white text-sm">เมนูระบบ ManStat-Modern</span>
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/50 transition-colors duration-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Mobile Menu List with 4 Groups */}
              <div className="space-y-4 text-xs">
                {/* หมวด 1 */}
                <div>
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5 px-2">
                    หมวด 1: ภาพรวม
                  </span>
                  <button
                    type="button"
                    onClick={() => handleSelectView('dashboard')}
                    className={`w-full text-left px-3 py-2 rounded-md flex items-center gap-2 ${
                      activeView === 'dashboard'
                        ? 'bg-sky-50 text-sky-900 font-semibold dark:bg-slate-800 dark:text-white'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    <LayoutDashboard className="w-4 h-4 text-sky-500 dark:text-sky-400" />
                    <span>สถิติและภาพรวม</span>
                  </button>
                </div>

                {/* หมวด 2 */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80">
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5 px-2 truncate" title="หมวด 2: งานวันลา">
                    หมวด 2: งานวันลา
                  </span>
                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => handleSelectView('leave')}
                      className={`w-full text-left px-3 py-2 rounded-md flex items-center gap-2 ${
                        activeView === 'leave'
                          ? 'bg-sky-50 text-sky-900 font-semibold dark:bg-slate-800 dark:text-white'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200'
                      }`}
                      title="ยื่นคำร้องขอลา"
                    >
                      <PlusCircle className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
                      <span className="truncate">ยื่นคำร้องขอลา</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectView('tracking_requests')}
                      className={`w-full text-left px-3 py-2 rounded-md flex items-center justify-between ${
                        activeView === 'tracking_requests' || activeView === 'requests' || activeView === 'tracking'
                          ? 'bg-sky-50 text-sky-900 font-semibold dark:bg-slate-800 dark:text-white'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200'
                      }`}
                      title="ติดตามและประวัติการลา"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
                        <span className="truncate">ติดตามและประวัติการลา</span>
                      </div>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 shrink-0">
                        2
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectView('retro_leave')}
                      className={`w-full text-left px-3 py-2 rounded-md flex items-center gap-2 ${
                        activeView === 'retro_leave'
                          ? 'bg-sky-50 text-sky-900 font-semibold dark:bg-slate-800 dark:text-white'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200'
                      }`}
                      title="บันทึกการลาย้อนหลัง"
                    >
                      <RotateCcw className="w-4 h-4 text-cyan-500 dark:text-cyan-400 shrink-0" />
                      <span className="truncate">บันทึกการลาย้อนหลัง</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectView('leave_reports')}
                      className={`w-full text-left px-3 py-2 rounded-md flex items-center gap-2 ${
                        activeView === 'leave_reports' || activeView === 'analytics' || activeView === 'official_reports'
                          ? 'bg-sky-50 text-sky-900 font-semibold dark:bg-slate-800 dark:text-white'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200'
                      }`}
                      title="รายงานและสถิติวันลา"
                    >
                      <TrendingUp className="w-4 h-4 text-sky-500 dark:text-sky-400 shrink-0" />
                      <span className="truncate">รายงานและสถิติวันลา</span>
                    </button>
                  </div>
                </div>

                {/* หมวด 3 */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80">
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5 px-2 truncate" title="หมวด 3: งานทะเบียนประวัติ">
                    หมวด 3: งานทะเบียนประวัติ
                  </span>
                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => handleSelectView('staff_directory')}
                      className={`w-full text-left px-3 py-2 rounded-md flex items-center gap-2 ${
                        activeView === 'staff_directory'
                          ? 'bg-sky-50 text-sky-900 font-semibold dark:bg-slate-800 dark:text-white'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200'
                      }`}
                      title="ทะเบียนประวัติบุคลากร"
                    >
                      <User className="w-4 h-4 text-sky-500 dark:text-sky-400 shrink-0" />
                      <span className="truncate">ทะเบียนประวัติบุคลากร</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectView('dir_standing')}
                      className={`w-full text-left px-3 py-2 rounded-md flex items-center gap-2 ${
                        activeView === 'dir_standing'
                          ? 'bg-sky-50 text-sky-900 font-semibold dark:bg-slate-800 dark:text-white'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200'
                      }`}
                      title="ทะเบียนวิทยฐานะ"
                    >
                      <GraduationCap className="w-4 h-4 text-cyan-500 dark:text-cyan-400 shrink-0" />
                      <span className="truncate">ทะเบียนวิทยฐานะ</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectView('dir_license')}
                      className={`w-full text-left px-3 py-2 rounded-md flex items-center gap-2 ${
                        activeView === 'dir_license'
                          ? 'bg-sky-50 text-sky-900 font-semibold dark:bg-slate-800 dark:text-white'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200'
                      }`}
                      title="ทะเบียนใบอนุญาตฯ"
                    >
                      <BadgeCheck className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
                      <span className="truncate">ทะเบียนใบอนุญาตฯ</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectView('dir_scout')}
                      className={`w-full text-left px-3 py-2 rounded-md flex items-center gap-2 ${
                        activeView === 'dir_scout'
                          ? 'bg-sky-50 text-sky-900 font-semibold dark:bg-slate-800 dark:text-white'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200'
                      }`}
                      title="ทะเบียนวุฒิลูกเสือ"
                    >
                      <Award className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
                      <span className="truncate">ทะเบียนวุฒิลูกเสือ</span>
                    </button>
                  </div>
                </div>

                {/* หมวด 4 */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80">
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5 px-2 truncate" title="หมวด 4: ข้อมูลสถานศึกษา">
                    หมวด 4: ข้อมูลสถานศึกษา
                  </span>
                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => handleSelectView('school_board')}
                      className={`w-full text-left px-3 py-2 rounded-md flex items-center gap-2 ${
                        activeView === 'school_board'
                          ? 'bg-sky-50 text-sky-900 font-semibold dark:bg-slate-800 dark:text-white'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200'
                      }`}
                      title="คณะกรรมการสถานศึกษา"
                    >
                      <Users className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
                      <span className="truncate">คณะกรรมการสถานศึกษา</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectView('org_chart')}
                      className={`w-full text-left px-3 py-2 rounded-md flex items-center gap-2 ${
                        activeView === 'org_chart'
                          ? 'bg-sky-50 text-sky-900 font-semibold dark:bg-slate-800 dark:text-white'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200'
                      }`}
                      title="โครงสร้างองค์กร"
                    >
                      <Network className="w-4 h-4 text-cyan-500 dark:text-cyan-400 shrink-0" />
                      <span className="truncate">โครงสร้างองค์กร</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectView('workload')}
                      className={`w-full text-left px-3 py-2 rounded-md flex items-center gap-2 ${
                        activeView === 'workload'
                          ? 'bg-sky-50 text-sky-900 font-semibold dark:bg-slate-800 dark:text-white'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200'
                      }`}
                      title="ตารางสอนและภาระงาน"
                    >
                      <Briefcase className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
                      <span className="truncate">ตารางสอนและภาระงาน</span>
                    </button>
                  </div>
                </div>

                {/* Mobile Secondary Utility */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 space-y-1">
                  {isAdminRole(currentRole) && (
                    <Link
                      href="/admin"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="w-full text-left px-3 py-2 rounded-md flex items-center justify-between text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200"
                    >
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-sky-500 dark:text-sky-400" />
                        <span className="font-medium">ศูนย์ผู้ดูแลระบบ</span>
                      </div>
                      <span className="text-[10px] bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300 px-1.5 py-0.5 rounded font-semibold font-mono">
                        ADMIN
                      </span>
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => handleSelectView('feedback')}
                    className={`w-full text-left px-3 py-2 rounded-md flex items-center gap-2 ${
                      activeView === 'feedback'
                        ? 'bg-slate-100 text-slate-900 font-semibold dark:bg-slate-800 dark:text-white'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    <MessageSquare className="w-4 h-4 text-sky-500 dark:text-sky-400" />
                    <span>แจ้งปรับปรุงระบบ</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Pane */}
        <main className="flex-1 min-w-0 space-y-6 print:p-0 print:m-0 print:space-y-0 print:w-full">
          {/* View 1: Main Executive Dashboard */}
          {activeView === 'dashboard' && (
            <div className="space-y-6">
              {/* 1. Compact Executive Header Bar */}
              <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200/90 dark:border-slate-800/80">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                    ภาพรวมการบริหารงานบุคคล
                  </h1>
                  <span className="px-2.5 py-0.5 text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200/90 dark:bg-[#121822] dark:text-slate-300 dark:border-slate-800/80 rounded-md">
                    โรงเรียนชุมชนบ้านตะขบ · สพป.นม. 3
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-[#121822] px-3 py-1.5 rounded-lg border border-slate-200/90 dark:border-slate-800/80">
                    <Calendar className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                    <span className="font-mono tabular-nums text-slate-700 dark:text-slate-300">{currentDateThai}</span>
                    <span className="text-slate-300 dark:text-slate-600">|</span>
                    <span className="font-mono tabular-nums text-sky-600 dark:text-sky-400 font-medium">
                      ปีงบฯ {fiscalYearBE} (รอบที่ {currentRound})
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsLegalModalOpen(true)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 border border-slate-200/90 dark:bg-[#121822] dark:hover:bg-slate-800/70 dark:text-slate-300 dark:hover:text-white dark:border-slate-800/80 text-xs font-medium transition-colors duration-200 cursor-pointer"
                  >
                    <Scale className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
                    <span>ระเบียบกฎหมาย</span>
                  </button>
                </div>
              </header>

              {/* 2. Minimalist Metric Strip */}
              <section aria-label="Personnel Summary Statistics">
                <PersonnelSummaryCards
                  stats={{
                    totalStaff: staffList.length,
                    onDutyCount,
                    onLeaveCount,
                    expiringOrRetiringCount: retiringCount,
                    onLeaveDetail,
                    retiringDetail,
                  }}
                />
              </section>

              {/* 3. Asymmetric Action-First Grid (8 Columns : 4 Columns) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Primary Column (8 Cols): คิวคำขอรออนุมัติ (Actionable Inbox) */}
                <div className="lg:col-span-8">
                  {isAdminRole(currentRole) ? (
                    <PendingApprovalQueue
                      requests={leaveList}
                      currentUserId="director-001"
                      onActionComplete={loadLeaveList}
                      onViewAllHistory={() => handleSelectView('tracking_requests')}
                    />
                  ) : (
                    <div className="bg-white dark:bg-[#121822] border border-slate-200/90 dark:border-slate-800/80 rounded-xl p-8 text-center shadow-sm">
                      <ShieldCheck className="w-10 h-10 text-sky-500 dark:text-sky-400 mx-auto mb-2 opacity-80" />
                      <h4 className="text-base font-semibold text-slate-900 dark:text-white">มุมมองบุคลากรทั่วไป (ครูผู้สอน)</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                        เข้าถึงคิวการอนุมัติคำขอลาสำหรับผู้บริหารและเจ้าหน้าที่บุคคล โปรดตรวจสอบสิทธิการเข้าถึงของท่าน
                      </p>
                    </div>
                  )}
                </div>

                {/* Right Secondary Column (4 Cols): สิทธิวันลา & เรดาร์ ว15/2561 */}
                <aside className="lg:col-span-4 space-y-6">
                  <LeaveProgressRings
                    sickLeaveUsed={0}
                    sickLeaveMax={60}
                    personalLeaveUsed={0}
                    personalLeaveMax={45}
                    isFirstYear={false}
                  />

                  <PromotionRadarCard
                    fiscalYear={fiscalYearBE}
                    evalRound={1}
                    leaveCount={0}
                    sickPersonalDays={0}
                    isEligible={true}
                  />
                </aside>
              </div>

              {/* 4. Progressive Disclosure: Legal Reference Modal */}
              {isLegalModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/70 p-4">
                  <div className="bg-white dark:bg-[#121822] border border-slate-200 dark:border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <Scale className="w-4 h-4 text-sky-500 dark:text-sky-400" />
                        <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                          ระเบียบและข้อกฎหมายอ้างอิงในระบบ
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsLegalModalOpen(false)}
                        className="p-1.5 rounded-md text-slate-400 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/50 transition-colors duration-200"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#0b1016] border border-slate-200/90 dark:border-slate-800/80">
                        <p className="font-semibold text-slate-900 dark:text-white mb-1">
                          1. ระเบียบสำนักนายกรัฐมนตรีว่าด้วยการลาของข้าราชการ พ.ศ. 2555
                        </p>
                        <p className="text-slate-600 dark:text-slate-400">
                          ข้อ 17 คำนวณวันลาตามปีงบประมาณ (1 ต.ค. – 30 ก.ย.) ลาป่วยไม่เกิน 60 วันทำการ และลากิจส่วนตัวไม่เกิน 45 วันทำการ (บรรจุใหม่ปีแรกไม่เกิน 15 วันทำการ)
                        </p>
                      </div>

                      <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#0b1016] border border-slate-200/90 dark:border-slate-800/80">
                        <p className="font-semibold text-slate-900 dark:text-white mb-1">
                          2. หลักเกณฑ์ ก.ค.ศ. ว15/2561 (การเลื่อนเงินเดือนข้าราชการครูฯ)
                        </p>
                        <p className="text-slate-600 dark:text-slate-400">
                          ในรอบการประเมินครึ่งปี ต้องลาป่วยและลากิจส่วนตัวรวมกันไม่เกิน 6 ครั้ง และมีจำนวนวันลาไม่เกิน 23 วันทำการ
                        </p>
                      </div>

                      <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#0b1016] border border-slate-200/90 dark:border-slate-800/80">
                        <p className="font-semibold text-slate-900 dark:text-white mb-1">
                          3. พ.ร.บ. บำเหน็จบำนาญข้าราชการ พ.ศ. 2494 (มาตรา 19) & PDPA
                        </p>
                        <p className="text-slate-600 dark:text-slate-400">
                          ผู้เกิดวันที่ 1 ตุลาคม เกษียณในปีงบประมาณที่อายุครบ 60 ปีบริบูรณ์ และจัดเก็บเลขประจำตัวประชาชนแบบ Masking 13 หลักพร้อมบันทึก Audit Log ตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setIsLegalModalOpen(false)}
                        className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 border border-slate-200/90 dark:bg-[#121822] dark:hover:bg-slate-800/70 dark:text-slate-300 dark:hover:text-white dark:border-slate-800/80 text-xs font-medium transition-colors duration-200"
                      >
                        ปิดหน้าต่าง
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* View: Leave Application Form */}
          {activeView === 'leave' && (
            <ViewLeaveSubmit onSuccess={() => handleSelectView('tracking_requests')} />
          )}

          {/* View: Combined Leave Requests & Workflow Tracker */}
          {(activeView === 'tracking_requests' || activeView === 'requests' || activeView === 'tracking') && (
            <ViewLeaveHub
              initialTab={activeView === 'tracking' ? 'tracking' : 'requests'}
              onOpenSubmitModal={() => handleSelectView('leave')}
            />
          )}

          {/* View: Retroactive Leave Logging */}
          {activeView === 'retro_leave' && <ViewRetroLeave />}

          {/* View: Combined Leave Reports & Analytics */}
          {(activeView === 'leave_reports' || activeView === 'analytics' || activeView === 'official_reports') && (
            <ViewLeaveReportsHub
              initialTab={activeView === 'official_reports' ? 'official' : 'analytics'}
            />
          )}

          {/* View: School 4 Divisions Organization Chart */}
          {activeView === 'org_chart' && <ViewOrgChart />}

          {/* View: Basic Education School Board */}
          {activeView === 'school_board' && <ViewSchoolBoard />}

          {/* View: Teacher Teaching Hours & PA Workload */}
          {activeView === 'workload' && <ViewWorkload />}

          {/* View: Teacher Directory & Portfolios */}
          {activeView === 'staff_directory' && <ViewStaffDirectory />}

          {/* View: Academic Standings & Appointment Orders */}
          {activeView === 'dir_standing' && <ViewRegStanding />}

          {/* View: Scout Qualifications Registry */}
          {activeView === 'dir_scout' && <ViewRegScout />}

          {/* View: Khurusapha Professional Licenses */}
          {activeView === 'dir_license' && <ViewRegLicense />}

          {/* View: System Feedback */}
          {activeView === 'feedback' && <ViewFeedback />}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="lg:hidden sticky bottom-0 z-40 bg-white dark:bg-[#121822] border-t border-slate-200/90 dark:border-slate-800/80 px-2 py-1.5 flex items-center justify-around text-[10px] print:hidden transition-colors duration-200">
        <button
          type="button"
          onClick={() => handleSelectView('dashboard')}
          className={`flex flex-col items-center gap-1 p-1.5 rounded-lg transition-colors ${
            activeView === 'dashboard' ? 'text-sky-600 dark:text-sky-400 font-bold' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <LayoutDashboard className="w-4 h-4 shrink-0" />
          <span>ภาพรวม</span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectView('leave')}
          className={`flex flex-col items-center gap-1 p-1.5 rounded-lg transition-colors ${
            activeView === 'leave' ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <PlusCircle className="w-4 h-4 shrink-0" />
          <span>ยื่นใบลา</span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectView('tracking_requests')}
          className={`flex flex-col items-center gap-1 p-1.5 rounded-lg transition-colors ${
            activeView === 'tracking_requests' || activeView === 'requests' || activeView === 'tracking'
              ? 'text-amber-600 dark:text-amber-400 font-bold'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <FileText className="w-4 h-4 shrink-0" />
          <span>ติดตาม/คำร้อง</span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectView('staff_directory')}
          className={`flex flex-col items-center gap-1 p-1.5 rounded-lg transition-colors ${
            activeView === 'staff_directory' ? 'text-sky-600 dark:text-sky-400 font-bold' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <User className="w-4 h-4 shrink-0" />
          <span>ครู/บุคลากร</span>
        </button>

        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(true)}
          className="flex flex-col items-center gap-1 p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <Menu className="w-4 h-4 shrink-0" />
          <span>เมนูทั้งหมด</span>
        </button>
      </nav>

      {/* Realtime Toasts Floating Overlay */}
      {toasts.length > 0 && (
        <div className="fixed bottom-16 lg:bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full print:hidden">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className="bg-white dark:bg-[#1b2838] border border-sky-500/30 dark:border-sky-500/40 rounded-xl p-4 shadow-xl dark:shadow-2xl text-slate-900 dark:text-slate-100 flex items-start gap-3 animate-in slide-in-from-bottom-2 duration-200"
            >
              <Bell className="w-5 h-5 text-sky-500 dark:text-sky-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-xs font-semibold text-slate-900 dark:text-white">{toast.title}</div>
                <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">{toast.message}</div>
              </div>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/50 transition-colors duration-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
      {/* User Preferences Modal */}
      <UserSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />
    </div>
  );
}
