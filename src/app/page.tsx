'use client';

/**
 * ============================================================================
 * ManStat: Main Application & Legacy Multi-View Navigation Hub
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
import { isAdminRole, canManageSalaryPromotions, isCivilServantForSalary } from '@/lib/auth/roles';
import type { UserRole } from '@/types/database.types';
import {
  INITIAL_SCHOOL_INFO,
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
import { formatStaffName } from '@/lib/regulations/staff-formatting';
import { AppLogoIcon } from '@/components/brand/AppLogo';
import {
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
  Lock,
  Unlock,
} from 'lucide-react';
import { UserSettingsModal } from '@/components/settings/UserSettingsModal';

// Core Dashboard Components
import { PersonnelSummaryCards } from '@/components/dashboard/PersonnelSummaryCards';
import { LeaveProgressRings } from '@/components/dashboard/LeaveProgressRings';
import { PromotionRadarCard } from '@/components/dashboard/PromotionRadarCard';
import { PendingApprovalQueue } from '@/components/dashboard/PendingApprovalQueue';
import { MyRecentLeaveRequests } from '@/components/dashboard/MyRecentLeaveRequests';
import { useLeaveRealtime } from '@/hooks/useLeaveRealtime';
import { isZeroDayLeaveType } from '@/lib/regulations/leaveTypes';
import type { HolidayRecord } from '@/lib/db/serverDb';
import {
  resolveDashboardUser,
  isWeekendOrHoliday,
  calculateDutyMetric,
  calculateUserRoundLeaveStats,
  calculateUserFiscalLeaveQuota,
  getUserRecentLeaveRequests,
} from '@/lib/regulations/dashboard-helpers';

// View Components
import { ViewPersonnelHub, type PersonnelTab } from '@/components/views/ViewPersonnelHub';
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
import { ViewSalaryHistory } from '@/components/views/ViewSalaryHistory';

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
  | 'salary_history'
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
    fetch('/api/auth/me', { cache: 'no-store' })
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

  const [staffList, setStaffList] = useState<TeacherRecord[]>([]);
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfoRecord>(INITIAL_SCHOOL_INFO);
  const [leaveList, setLeaveList] = useState<LeaveRequestRecord[]>([]);
  const [holidays, setHolidays] = useState<HolidayRecord[]>([]);

  const loadLeaveList = useCallback(() => {
    fetch('/api/admin/leave', { cache: 'no-store' })
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
    fetch('/api/admin/staff', { cache: 'no-store' })
      .then((r) => r.json())
      .then((res) => {
        if (res.success && Array.isArray(res.data) && isMounted) {
          setStaffList(res.data);
        }
      })
      .catch(() => {});

    fetch('/api/admin/school', { cache: 'no-store' })
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data && isMounted) {
          setSchoolInfo(res.data);
        }
      })
      .catch(() => {});

    fetch('/api/admin/holidays', { cache: 'no-store' })
      .then((r) => r.json())
      .then((res) => {
        if (res.success && Array.isArray(res.data) && isMounted) {
          setHolidays(res.data);
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
  const currentDateThai = `${daysThai[now.getDay()]}ที่\u00A0${now.getDate()}\u00A0${monthsThai[now.getMonth()]}\u00A0${now.getFullYear() + 543}`;
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
  const pendingLeaveCount = leaveList.filter((r) => r.status === 'pending').length;
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
      ? staffRetiringThisYear.map((s) => formatStaffName(s)).join(', ')
      : `ปีงบฯ ${fiscalYearBE} ไม่มีผู้เกษียณ`;

  // 3. User resolution and regulatory calculations
  const activeUserIdentity = resolveDashboardUser(currentUser, staffList, fiscalYearBE);
  const holidayStatus = isWeekendOrHoliday(now, holidays);
  const dutyMetric = calculateDutyMetric(staffList.length, onLeaveCount, holidayStatus);

  // 4. Per-user scoped leave calculations (Round & Quota)
  const userRoundStats = calculateUserRoundLeaveStats(
    leaveList,
    activeUserIdentity,
    fiscalYearBE,
    currentRound
  );

  const userQuota = calculateUserFiscalLeaveQuota(
    leaveList,
    activeUserIdentity,
    fiscalYearBE,
    activeUserIdentity.isFirstYearAppointee,
    activeUserIdentity.isEligibleForVacation
  );

  const myRecentLeaves = getUserRecentLeaveRequests(leaveList, activeUserIdentity, 5);

  const handleSelectView = (view: ActiveView) => {
    setActiveView(view);
    setIsMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePersonnelTabChange = (tab: PersonnelTab) => {
    const tabToViewMap: Record<PersonnelTab, ActiveView> = {
      directory: 'staff_directory',
      standing: 'dir_standing',
      license: 'dir_license',
      scout: 'dir_scout',
    };
    const targetView = tabToViewMap[tab];
    if (targetView && activeView !== targetView) {
      setActiveView(targetView);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0b1016] text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#121822]/95 backdrop-blur-md border-b border-slate-200/90 dark:border-slate-800/80 print:hidden transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
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
              className="flex items-center gap-3 text-left focus:outline-none group"
              title={`${schoolInfo.schoolName}${schoolInfo.affiliation ? ` · ${schoolInfo.affiliation}` : ''}`}
            >
              <AppLogoIcon size={38} className="shrink-0 transition-transform group-hover:scale-105" />
              <div>
                <span className="font-bold text-base tracking-tight text-slate-900 dark:text-white block leading-tight">ManStat</span>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[200px] sm:max-w-xs md:max-w-md lg:max-w-lg mt-0.5">
                  <span>{schoolInfo.schoolName}</span>
                  {schoolInfo.affiliation && (
                    <span className="hidden md:inline text-slate-400 dark:text-slate-500 font-normal"> · {schoolInfo.affiliation}</span>
                  )}
                </p>
              </div>
            </button>
          </div>

          {/* Right Action Tools */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Compact 3-Mode Theme Switcher (Popover) */}
            <ThemeSwitcher />

            {/* Admin Management Link - Gear Icon Only */}
            {isAdminRole(currentRole) && (
              <Link
                href="/admin"
                className="inline-flex items-center justify-center p-2 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 border border-slate-200/90 dark:bg-[#121822] dark:hover:bg-slate-800/70 dark:text-slate-300 dark:hover:text-white dark:border-slate-800/80 transition-colors duration-200 cursor-pointer shadow-sm"
                title="ศูนย์ผู้ดูแลระบบ"
                aria-label="ศูนย์ผู้ดูแลระบบ"
              >
                <Settings className="w-4 h-4 text-sky-500 dark:text-sky-400 shrink-0" />
              </Link>
            )}

            {/* Consolidated User Profile Dropdown */}
            <UserProfileDropdown
              onOpenSettings={() => setIsSettingsModalOpen(true)}
              showAdminCenterLink={isAdminRole(currentRole)}
              currentUser={currentUser}
              currentRole={currentRole}
              schoolName={schoolInfo.schoolName}
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
                    {pendingLeaveCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-500/30 shrink-0">
                        {pendingLeaveCount}
                      </span>
                    )}
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

                  {/* เมนูการเลื่อนเงินเดือน */}
                  {(() => {
                    const isManager = canManageSalaryPromotions(currentRole, currentUser?.position, currentUser?.department);
                    const isCivil = currentUser ? isCivilServantForSalary(currentUser) : false;
                    const canAccess = isManager || isCivil;

                    if (!canAccess) {
                      return (
                        <div
                          className="w-full flex items-center justify-between py-2 px-3 text-sm rounded-md opacity-50 cursor-not-allowed text-slate-400 dark:text-slate-500"
                          title="สงวนสิทธิ์เฉพาะข้าราชการและงานบุคคล"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <TrendingUp className="w-4 h-4 shrink-0 text-slate-400" />
                            <span className="truncate">การเลื่อนเงินเดือน</span>
                          </div>
                          <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        </div>
                      );
                    }

                    return (
                      <button
                        type="button"
                        onClick={() => handleSelectView('salary_history')}
                        className={`w-full flex items-center justify-between py-2 px-3 text-sm rounded-md transition-all ${
                          activeView === 'salary_history'
                            ? 'bg-sky-50 text-sky-900 border-l-2 border-sky-600 font-semibold dark:bg-slate-800/70 dark:text-white dark:border-sky-500'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/30'
                        }`}
                        title="การเลื่อนเงินเดือน"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <TrendingUp className="w-4 h-4 shrink-0 text-emerald-500 dark:text-emerald-400" />
                          <span className="truncate">การเลื่อนเงินเดือน</span>
                        </div>
                        <Unlock className="w-3.5 h-3.5 text-emerald-600/70 dark:text-emerald-400/70 shrink-0" />
                      </button>
                    );
                  })()}
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
                  title="ศูนย์ผู้ดูแลระบบ"
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
                <div className="flex items-center gap-2.5">
                  <AppLogoIcon size={28} className="shrink-0" />
                  <span className="font-bold text-slate-900 dark:text-white text-sm">ManStat</span>
                </div>
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
                      {pendingLeaveCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 shrink-0">
                          {pendingLeaveCount}
                        </span>
                      )}
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

                    {/* เมนูการเลื่อนเงินเดือน (Mobile Drawer) */}
                    {(() => {
                      const isManager = canManageSalaryPromotions(currentRole, currentUser?.position, currentUser?.department);
                      const isCivil = currentUser ? isCivilServantForSalary(currentUser) : false;
                      const canAccess = isManager || isCivil;

                      if (!canAccess) {
                        return (
                          <div
                            className="w-full px-3 py-2 rounded-md flex items-center justify-between opacity-50 cursor-not-allowed text-slate-400 dark:text-slate-500 text-sm"
                            title="สงวนสิทธิ์เฉพาะข้าราชการและงานบุคคล"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <TrendingUp className="w-4 h-4 text-slate-400 shrink-0" />
                              <span className="truncate">การเลื่อนเงินเดือน</span>
                            </div>
                            <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          </div>
                        );
                      }

                      return (
                        <button
                          type="button"
                          onClick={() => handleSelectView('salary_history')}
                          className={`w-full text-left px-3 py-2 rounded-md flex items-center justify-between ${
                            activeView === 'salary_history'
                              ? 'bg-sky-50 text-sky-900 font-semibold dark:bg-slate-800 dark:text-white'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200'
                          }`}
                          title="การเลื่อนเงินเดือน"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <TrendingUp className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
                            <span className="truncate">การเลื่อนเงินเดือน</span>
                          </div>
                          <Unlock className="w-3.5 h-3.5 text-emerald-600/70 dark:text-emerald-400/70 shrink-0" />
                        </button>
                      );
                    })()}
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
              <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200/90 dark:border-slate-800/80">
                <div className="space-y-1">
                  <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                    ภาพรวมการบริหารงานบุคคล
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    ยินดีต้อนรับ, <span className="font-medium text-slate-800 dark:text-slate-200">{activeUserIdentity.name}</span> · {activeUserIdentity.position}
                  </p>
                </div>

                <div className="flex items-center gap-2.5 sm:gap-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap shrink-0">
                  <div className="inline-flex items-center gap-2 bg-slate-100 dark:bg-[#121822] px-3.5 py-1.5 rounded-lg border border-slate-200/90 dark:border-slate-800/80 whitespace-nowrap shrink-0 shadow-sm">
                    <Calendar className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                    <span className="font-mono tabular-nums text-slate-700 dark:text-slate-300 inline-block whitespace-nowrap shrink-0">{currentDateThai}</span>
                    <span className="text-slate-300 dark:text-slate-600 select-none shrink-0">|</span>
                    <span className="font-mono tabular-nums text-sky-600 dark:text-sky-400 font-medium inline-block whitespace-nowrap shrink-0">
                      ปีงบฯ {fiscalYearBE} · รอบที่ {currentRound}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsLegalModalOpen(true)}
                    className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 border border-slate-200/90 dark:bg-[#121822] dark:hover:bg-slate-800/70 dark:text-slate-300 dark:hover:text-white dark:border-slate-800/80 text-xs font-medium transition-colors duration-200 cursor-pointer whitespace-nowrap shrink-0 shadow-sm"
                  >
                    <Scale className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400 shrink-0" />
                    <span className="whitespace-nowrap">ระเบียบกฎหมาย</span>
                  </button>
                </div>
              </header>

              {/* 2. Minimalist Metric Strip */}
              <section aria-label="Personnel Summary Statistics">
                <PersonnelSummaryCards
                  stats={{
                    totalStaff: staffList.length,
                    onDutyCount: dutyMetric.value,
                    onLeaveCount,
                    expiringOrRetiringCount: retiringCount,
                    onLeaveDetail,
                    retiringDetail,
                    isHoliday: holidayStatus.isHoliday,
                    holidayName: holidayStatus.reason,
                  }}
                />
              </section>

              {/* 3. Asymmetric Action-First Grid (8 Columns : 4 Columns) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Primary Column (8 Cols): คิวคำขอรออนุมัติ (Approver) หรือ คำขอลาล่าสุดของฉัน (Teacher) */}
                <div className="lg:col-span-8">
                  {activeUserIdentity.isApprover ? (
                    <PendingApprovalQueue
                      requests={leaveList}
                      currentUserId={activeUserIdentity.id}
                      onActionComplete={loadLeaveList}
                      onViewAllHistory={() => handleSelectView('tracking_requests')}
                    />
                  ) : (
                    <MyRecentLeaveRequests
                      requests={myRecentLeaves}
                      onNewLeaveRequest={() => handleSelectView('leave')}
                      onViewAllHistory={() => handleSelectView('tracking_requests')}
                    />
                  )}
                </div>

                {/* Right Secondary Column (4 Cols): สิทธิวันลา & เรดาร์ ว15/2561 */}
                <aside className="lg:col-span-4 space-y-6">
                  {/* Subtle 1-line Owner Identification */}
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 px-1">
                    <User className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">ข้อมูลของ {activeUserIdentity.name}</span>
                  </div>

                  <LeaveProgressRings
                    fiscalYear={fiscalYearBE}
                    sickLeaveUsed={userQuota.sickLeaveUsed}
                    sickLeaveMax={userQuota.sickLeaveMax}
                    personalLeaveUsed={userQuota.personalLeaveUsed}
                    personalLeaveMax={userQuota.personalLeaveMax}
                    vacationLeaveUsed={userQuota.vacationLeaveUsed}
                    vacationLeaveMax={userQuota.vacationLeaveMax}
                    hasVacation={userQuota.hasVacation}
                    isFirstYear={activeUserIdentity.isFirstYearAppointee}
                  />

                  <PromotionRadarCard
                    fiscalYear={fiscalYearBE}
                    evalRound={currentRound}
                    leaveCount={userRoundStats.leaveCount}
                    sickPersonalDays={userRoundStats.sickPersonalDays}
                    isEligible={userRoundStats.isEligible}
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
            <ViewLeaveSubmit
              currentUser={currentUser}
              staffList={staffList}
              onSuccess={() => {
                loadLeaveList();
                handleSelectView('tracking_requests');
              }}
            />
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

          {/* View: Category 3 Personnel Registries Hub */}
          {activeView === 'staff_directory' && (
            <ViewPersonnelHub initialTab="directory" onTabChange={handlePersonnelTabChange} />
          )}
          {activeView === 'dir_standing' && (
            <ViewPersonnelHub initialTab="standing" onTabChange={handlePersonnelTabChange} />
          )}
          {activeView === 'dir_license' && (
            <ViewPersonnelHub initialTab="license" onTabChange={handlePersonnelTabChange} />
          )}
          {activeView === 'dir_scout' && (
            <ViewPersonnelHub initialTab="scout" onTabChange={handlePersonnelTabChange} />
          )}

          {/* View: Salary Promotion History (หมวด 3) */}
          {activeView === 'salary_history' && (
            <ViewSalaryHistory
              currentUser={currentUser}
              currentRole={currentRole}
              onBackToDashboard={() => handleSelectView('dashboard')}
            />
          )}

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
