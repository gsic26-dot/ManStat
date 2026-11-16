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

import React, { useState } from 'react';
import Link from 'next/link';
import {
  School,
  Calendar,
  Clock,
  PlusCircle,
  ShieldCheck,
  Bell,
  LogOut,
  User,
  Settings,
  Layers,
  CheckCircle2,
  AlertTriangle,
  X,
  Printer,
  FileCheck,
  LayoutDashboard,
  FileText,
  RotateCcw,
  TrendingUp,
  FileSpreadsheet,
  Network,
  Users,
  Briefcase,
  GraduationCap,
  Award,
  BadgeCheck,
  MessageSquare,
  Menu,
  ChevronRight,
} from 'lucide-react';

// Core Dashboard Components
import { PersonnelSummaryCards } from '@/components/dashboard/PersonnelSummaryCards';
import { LeaveProgressRings } from '@/components/dashboard/LeaveProgressRings';
import { PromotionRadarCard } from '@/components/dashboard/PromotionRadarCard';
import { PendingApprovalQueue } from '@/components/dashboard/PendingApprovalQueue';
import { CitizenIdShield } from '@/components/security/CitizenIdShield';
import { SmartLeaveForm } from '@/components/leave/SmartLeaveForm';
import { ExcelExportButton } from '@/components/export/ExcelExportButton';
import { useLeaveRealtime } from '@/hooks/useLeaveRealtime';

// View Components
import { ViewStaffDirectory } from '@/components/views/ViewStaffDirectory';
import { ViewRegLicense } from '@/components/views/ViewRegLicense';
import { ViewRegStanding } from '@/components/views/ViewRegStanding';
import { ViewOrgChart } from '@/components/views/ViewOrgChart';
import { ViewSchoolBoard } from '@/components/views/ViewSchoolBoard';
import { ViewWorkload } from '@/components/views/ViewWorkload';
import { ViewLeaveRequests } from '@/components/views/ViewLeaveRequests';
import { ViewLeaveTracking } from '@/components/views/ViewLeaveTracking';
import { ViewRetroLeave } from '@/components/views/ViewRetroLeave';
import { ViewLeaveAnalytics } from '@/components/views/ViewLeaveAnalytics';
import { ViewOfficialReports } from '@/components/views/ViewOfficialReports';
import { ViewRegScout } from '@/components/views/ViewRegScout';
import { ViewFeedback } from '@/components/views/ViewFeedback';
import { ViewLeaveSubmit } from '@/components/views/ViewLeaveSubmit';

export type ActiveView =
  | 'dashboard'
  | 'leave'
  | 'requests'
  | 'tracking'
  | 'retro_leave'
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
  const [currentRole, setCurrentRole] = useState<'director' | 'hr_admin' | 'teacher'>('director');

  // Real-time toast notifications hook
  const { toasts, dismissToast } = useLeaveRealtime({ enableToasts: true });

  const currentDateThai = 'วันจันทร์ที่ 16 พฤศจิกายน 2569';
  const fiscalYearBE = 2570;

  const handleSelectView = (view: ActiveView) => {
    setActiveView(view);
    setIsMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#0e141b] text-slate-100 flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-[#171a21]/95 backdrop-blur-md border-b border-slate-800">
        <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Mobile Menu Trigger */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 focus:outline-none"
              title="เปิดเมนูนำทาง"
            >
              <Menu className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => handleSelectView('dashboard')}
              className="flex items-center gap-3 text-left focus:outline-none"
            >
              <div className="p-2 rounded-xl bg-gradient-to-br from-sky-500 to-blue-700 text-white shadow-md shadow-sky-900/30">
                <School className="w-5 h-5 shrink-0" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base tracking-tight text-white">ManStat-Modern</span>
                  <span className="px-2 py-0.5 text-[10px] uppercase font-mono font-semibold rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                    สพป.นม. 3
                  </span>
                </div>
                <p className="text-xs text-slate-400">โรงเรียนชุมชนบ้านตะขบ (Zero-GAS Cloud)</p>
              </div>
            </button>
          </div>

          {/* Right Action Tools & Switchers */}
          <div className="flex items-center gap-3">
            {/* Quick Submit Leave Button */}
            <button
              type="button"
              onClick={() => handleSelectView('leave')}
              className="hidden sm:inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-sm transition-all focus:outline-none"
            >
              <PlusCircle className="w-4 h-4 shrink-0" />
              <span>ยื่นคำร้องขอลา</span>
            </button>

            {/* Role Switcher */}
            <div className="hidden md:flex items-center gap-1.5 bg-[#101822] px-2.5 py-1.5 rounded-xl border border-slate-700 text-xs text-slate-300">
              <Layers className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span>บทบาท:</span>
              <select
                value={currentRole}
                onChange={(e) => setCurrentRole(e.target.value as 'director' | 'hr_admin' | 'teacher')}
                className="bg-transparent text-sky-300 font-semibold focus:outline-none cursor-pointer"
              >
                <option value="director" className="bg-[#171a21]">ผู้อำนวยการ (Director)</option>
                <option value="hr_admin" className="bg-[#171a21]">เจ้าหน้าที่บุคคล (HR Admin)</option>
                <option value="teacher" className="bg-[#171a21]">ครูผู้สอน (Teacher)</option>
              </select>
            </div>

            {/* Admin Management Link */}
            {(currentRole === 'director' || currentRole === 'hr_admin') && (
              <Link
                href="/admin"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1b2838] hover:bg-[#2a475e] text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition-colors"
                title="เข้าสู่ระบบจัดการผู้ดูแลระบบ (Admin Center)"
              >
                <Settings className="w-4 h-4 text-sky-400 shrink-0" />
                <span className="hidden sm:inline">ตั้งค่าระบบ</span>
              </Link>
            )}

            {/* User Profile Pill */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
                <User className="w-4 h-4" />
              </div>
              <div className="hidden lg:block text-left">
                <div className="text-xs font-semibold text-slate-200">นายธีรศักดิ์ มโนธรรม</div>
                <div className="text-[10px] text-slate-400">ผู้อำนวยการสถานศึกษา</div>
              </div>
            </div>

            {/* Logout Link */}
            <Link
              href="/login"
              title="ออกจากระบบ"
              className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-rose-300 transition-colors"
            >
              <LogOut className="w-4 h-4 shrink-0" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Layout Container (Sidebar + Content) */}
      <div className="flex-1 flex w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 gap-6">
        {/* Left Navigation Sidebar (Desktop) */}
        <aside className="hidden lg:block w-64 shrink-0 space-y-6">
          <div className="bg-[#111822] rounded-2xl border border-slate-800 p-4 sticky top-24 space-y-5">
            {/* Group 1: ระบบการลา */}
            <div>
              <div className="flex items-center gap-2 text-[11px] font-bold text-sky-400 uppercase tracking-wider mb-2 px-2">
                <FileText className="w-3.5 h-3.5 shrink-0" />
                <span>ระบบการลา</span>
              </div>
              <nav className="space-y-1">
                <button
                  type="button"
                  onClick={() => handleSelectView('dashboard')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    activeView === 'dashboard'
                      ? 'bg-sky-600 text-white shadow-md shadow-sky-950/40'
                      : 'text-slate-300 hover:bg-[#182332] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <LayoutDashboard className="w-4 h-4 shrink-0" />
                    <span>สถิติการลา</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectView('leave')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    activeView === 'leave'
                      ? 'bg-sky-600 text-white shadow-md shadow-sky-950/40'
                      : 'text-slate-300 hover:bg-[#182332] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <PlusCircle className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>ยื่นคำร้องขอลา</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectView('requests')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    activeView === 'requests'
                      ? 'bg-sky-600 text-white shadow-md shadow-sky-950/40'
                      : 'text-slate-300 hover:bg-[#182332] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 shrink-0 text-amber-400" />
                    <span>รายการคำร้อง</span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    2
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectView('tracking')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    activeView === 'tracking'
                      ? 'bg-sky-600 text-white shadow-md shadow-sky-950/40'
                      : 'text-slate-300 hover:bg-[#182332] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 shrink-0 text-sky-400" />
                    <span>ติดตามคำร้อง</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectView('retro_leave')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    activeView === 'retro_leave'
                      ? 'bg-sky-600 text-white shadow-md shadow-sky-950/40'
                      : 'text-slate-300 hover:bg-[#182332] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <RotateCcw className="w-4 h-4 shrink-0 text-cyan-400" />
                    <span>บันทึกการลาย้อนหลัง</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectView('analytics')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    activeView === 'analytics'
                      ? 'bg-sky-600 text-white shadow-md shadow-sky-950/40'
                      : 'text-slate-300 hover:bg-[#182332] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 shrink-0" />
                    <span>กราฟสถิติ</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectView('official_reports')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    activeView === 'official_reports'
                      ? 'bg-sky-600 text-white shadow-md shadow-sky-950/40'
                      : 'text-slate-300 hover:bg-[#182332] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>สรุปวันลา สพฐ.</span>
                  </div>
                </button>
              </nav>
            </div>

            {/* Group 2: การบริหารและภาระงาน */}
            <div className="pt-3 border-t border-slate-800">
              <div className="flex items-center gap-2 text-[11px] font-bold text-emerald-400 uppercase tracking-wider mb-2 px-2">
                <Briefcase className="w-3.5 h-3.5 shrink-0" />
                <span>การบริหารและภาระงาน</span>
              </div>
              <nav className="space-y-1">
                <button
                  type="button"
                  onClick={() => handleSelectView('org_chart')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    activeView === 'org_chart'
                      ? 'bg-sky-600 text-white shadow-md shadow-sky-950/40'
                      : 'text-slate-300 hover:bg-[#182332] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Network className="w-4 h-4 shrink-0 text-cyan-400" />
                    <span>แผนผังองค์กร 4 ฝ่าย</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectView('school_board')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    activeView === 'school_board'
                      ? 'bg-sky-600 text-white shadow-md shadow-sky-950/40'
                      : 'text-slate-300 hover:bg-[#182332] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 shrink-0 text-amber-400" />
                    <span>คณะกรรมการสถานศึกษา</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectView('workload')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    activeView === 'workload'
                      ? 'bg-sky-600 text-white shadow-md shadow-sky-950/40'
                      : 'text-slate-300 hover:bg-[#182332] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>ภาระงานสอนและ PA</span>
                  </div>
                </button>
              </nav>
            </div>

            {/* Group 3: ทะเบียนประวัติ */}
            <div className="pt-3 border-t border-slate-800">
              <div className="flex items-center gap-2 text-[11px] font-bold text-sky-400 uppercase tracking-wider mb-2 px-2">
                <GraduationCap className="w-3.5 h-3.5 shrink-0" />
                <span>ทะเบียนประวัติ</span>
              </div>
              <nav className="space-y-1">
                <button
                  type="button"
                  onClick={() => handleSelectView('staff_directory')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    activeView === 'staff_directory'
                      ? 'bg-sky-600 text-white shadow-md shadow-sky-950/40'
                      : 'text-slate-300 hover:bg-[#182332] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 shrink-0 text-sky-400" />
                    <span>ทะเบียนประวัติครู</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectView('dir_standing')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    activeView === 'dir_standing'
                      ? 'bg-sky-600 text-white shadow-md shadow-sky-950/40'
                      : 'text-slate-300 hover:bg-[#182332] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 shrink-0 text-cyan-400" />
                    <span>วิทยฐานะและคำสั่ง</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectView('dir_scout')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    activeView === 'dir_scout'
                      ? 'bg-sky-600 text-white shadow-md shadow-sky-950/40'
                      : 'text-slate-300 hover:bg-[#182332] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 shrink-0 text-amber-400" />
                    <span>วุฒิทางลูกเสือ</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectView('dir_license')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    activeView === 'dir_license'
                      ? 'bg-sky-600 text-white shadow-md shadow-sky-950/40'
                      : 'text-slate-300 hover:bg-[#182332] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <BadgeCheck className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>ใบอนุญาตประกอบวิชาชีพ</span>
                  </div>
                </button>
              </nav>
            </div>

            {/* Group 4: การตั้งค่า / ข้อเสนอแนะ */}
            <div className="pt-3 border-t border-slate-800">
              <div className="flex items-center gap-2 text-[11px] font-bold text-amber-400 uppercase tracking-wider mb-2 px-2">
                <Settings className="w-3.5 h-3.5 shrink-0" />
                <span>การตั้งค่าและระบบ</span>
              </div>
              <nav className="space-y-1">
                <Link
                  href="/admin"
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-[#182332] hover:text-white transition-all"
                >
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4 shrink-0 text-sky-400" />
                    <span>ศูนย์ผู้ดูแลระบบ</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                </Link>

                <button
                  type="button"
                  onClick={() => handleSelectView('feedback')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    activeView === 'feedback'
                      ? 'bg-sky-600 text-white shadow-md shadow-sky-950/40'
                      : 'text-slate-300 hover:bg-[#182332] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 shrink-0 text-cyan-400" />
                    <span>แจ้งปรับปรุงระบบ</span>
                  </div>
                </button>
              </nav>
            </div>
          </div>
        </aside>

        {/* Mobile Slide-Over Drawer Navigation */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <div className="relative w-72 max-w-[80vw] bg-[#111822] border-r border-slate-800 p-5 overflow-y-auto z-10 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="font-bold text-white text-sm">เมนูระบบ ManStat</span>
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Mobile Menu List */}
              <div className="space-y-4 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider block mb-2">
                    ระบบการลา
                  </span>
                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => handleSelectView('dashboard')}
                      className={`w-full text-left px-3 py-2 rounded-xl flex items-center gap-2 ${
                        activeView === 'dashboard' ? 'bg-sky-600 text-white' : 'text-slate-300'
                      }`}
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      <span>สถิติการลา</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectView('leave')}
                      className={`w-full text-left px-3 py-2 rounded-xl flex items-center gap-2 ${
                        activeView === 'leave' ? 'bg-sky-600 text-white' : 'text-slate-300'
                      }`}
                    >
                      <PlusCircle className="w-4 h-4 text-emerald-400" />
                      <span>ยื่นคำร้องขอลา</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectView('requests')}
                      className={`w-full text-left px-3 py-2 rounded-xl flex items-center gap-2 ${
                        activeView === 'requests' ? 'bg-sky-600 text-white' : 'text-slate-300'
                      }`}
                    >
                      <FileText className="w-4 h-4 text-amber-400" />
                      <span>รายการคำร้อง</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectView('tracking')}
                      className={`w-full text-left px-3 py-2 rounded-xl flex items-center gap-2 ${
                        activeView === 'tracking' ? 'bg-sky-600 text-white' : 'text-slate-300'
                      }`}
                    >
                      <Clock className="w-4 h-4 text-sky-400" />
                      <span>ติดตามคำร้อง</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectView('retro_leave')}
                      className={`w-full text-left px-3 py-2 rounded-xl flex items-center gap-2 ${
                        activeView === 'retro_leave' ? 'bg-sky-600 text-white' : 'text-slate-300'
                      }`}
                    >
                      <RotateCcw className="w-4 h-4 text-cyan-400" />
                      <span>บันทึกการลาย้อนหลัง</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectView('analytics')}
                      className={`w-full text-left px-3 py-2 rounded-xl flex items-center gap-2 ${
                        activeView === 'analytics' ? 'bg-sky-600 text-white' : 'text-slate-300'
                      }`}
                    >
                      <TrendingUp className="w-4 h-4" />
                      <span>กราฟสถิติ</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectView('official_reports')}
                      className={`w-full text-left px-3 py-2 rounded-xl flex items-center gap-2 ${
                        activeView === 'official_reports' ? 'bg-sky-600 text-white' : 'text-slate-300'
                      }`}
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                      <span>สรุปวันลา สพฐ.</span>
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-2">
                    การบริหารและภาระงาน
                  </span>
                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => handleSelectView('org_chart')}
                      className={`w-full text-left px-3 py-2 rounded-xl flex items-center gap-2 ${
                        activeView === 'org_chart' ? 'bg-sky-600 text-white' : 'text-slate-300'
                      }`}
                    >
                      <Network className="w-4 h-4 text-cyan-400" />
                      <span>แผนผังองค์กร 4 ฝ่าย</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectView('school_board')}
                      className={`w-full text-left px-3 py-2 rounded-xl flex items-center gap-2 ${
                        activeView === 'school_board' ? 'bg-sky-600 text-white' : 'text-slate-300'
                      }`}
                    >
                      <Users className="w-4 h-4 text-amber-400" />
                      <span>คณะกรรมการสถานศึกษา</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectView('workload')}
                      className={`w-full text-left px-3 py-2 rounded-xl flex items-center gap-2 ${
                        activeView === 'workload' ? 'bg-sky-600 text-white' : 'text-slate-300'
                      }`}
                    >
                      <Briefcase className="w-4 h-4 text-emerald-400" />
                      <span>ภาระงานสอนและ PA</span>
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800">
                  <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider block mb-2">
                    ทะเบียนประวัติ
                  </span>
                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => handleSelectView('staff_directory')}
                      className={`w-full text-left px-3 py-2 rounded-xl flex items-center gap-2 ${
                        activeView === 'staff_directory' ? 'bg-sky-600 text-white' : 'text-slate-300'
                      }`}
                    >
                      <User className="w-4 h-4 text-sky-400" />
                      <span>ทะเบียนประวัติครู</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectView('dir_standing')}
                      className={`w-full text-left px-3 py-2 rounded-xl flex items-center gap-2 ${
                        activeView === 'dir_standing' ? 'bg-sky-600 text-white' : 'text-slate-300'
                      }`}
                    >
                      <GraduationCap className="w-4 h-4 text-cyan-400" />
                      <span>วิทยฐานะและคำสั่ง</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectView('dir_scout')}
                      className={`w-full text-left px-3 py-2 rounded-xl flex items-center gap-2 ${
                        activeView === 'dir_scout' ? 'bg-sky-600 text-white' : 'text-slate-300'
                      }`}
                    >
                      <Award className="w-4 h-4 text-amber-400" />
                      <span>วุฒิทางลูกเสือ</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectView('dir_license')}
                      className={`w-full text-left px-3 py-2 rounded-xl flex items-center gap-2 ${
                        activeView === 'dir_license' ? 'bg-sky-600 text-white' : 'text-slate-300'
                      }`}
                    >
                      <BadgeCheck className="w-4 h-4 text-emerald-400" />
                      <span>ใบอนุญาตประกอบวิชาชีพ</span>
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800">
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block mb-2">
                    ระบบ
                  </span>
                  <div className="space-y-1">
                    <Link
                      href="/admin"
                      className="w-full text-left px-3 py-2 rounded-xl flex items-center gap-2 text-slate-300"
                    >
                      <Settings className="w-4 h-4 text-sky-400" />
                      <span>ศูนย์ผู้ดูแลระบบ (Admin)</span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleSelectView('feedback')}
                      className={`w-full text-left px-3 py-2 rounded-xl flex items-center gap-2 ${
                        activeView === 'feedback' ? 'bg-sky-600 text-white' : 'text-slate-300'
                      }`}
                    >
                      <MessageSquare className="w-4 h-4 text-cyan-400" />
                      <span>แจ้งปรับปรุงระบบ</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Pane */}
        <main className="flex-1 min-w-0 space-y-6">
          {/* View 1: Main Executive Dashboard */}
          {activeView === 'dashboard' && (
            <div className="space-y-6">
              {/* Banner Section */}
              <div className="glass-panel p-6 rounded-2xl border border-slate-800/80 bg-gradient-to-r from-[#172332]/90 via-[#1b2838]/80 to-[#121c27]/90 relative overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                  <div>
                    <div className="flex items-center gap-2 text-sky-400 text-xs font-medium mb-1">
                      <Calendar className="w-4 h-4 shrink-0" />
                      <span>{currentDateThai}</span>
                      <span className="text-slate-500">|</span>
                      <Clock className="w-4 h-4 shrink-0" />
                      <span>ปีงบประมาณ พ.ศ. {fiscalYearBE} (รอบการประเมินที่ 1)</span>
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-white">
                      ระบบสารสนเทศบริหารงานบุคคลและระเบียบราชการไทย
                    </h1>
                    <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                      ระบบคำนวณวันลา วันเกษียณ และเกณฑ์การประเมินเงินเดือนตาม พ.ร.บ. ข้าราชการครูฯ และระเบียบสำนักนายกรัฐมนตรี พ.ศ. 2555
                    </p>
                  </div>

                  {/* PDPA Demonstration Card */}
                  <div className="bg-[#101822]/80 border border-slate-700/80 p-3.5 rounded-xl self-start md:self-auto">
                    <span className="text-[11px] text-slate-400 block mb-1 font-medium">
                      เลขประจำตัวประชาชน (คุ้มครอง PDPA 100%):
                    </span>
                    <CitizenIdShield
                      targetStaffId="c6e3d2a1-0000-0000-0000-000000000001"
                      initialMaskedId="3-3014-*****-**-1"
                    />
                  </div>
                </div>
              </div>

              {/* 1. Personnel Summary Cards */}
              <section aria-label="Personnel Summary Statistics">
                <PersonnelSummaryCards
                  stats={{
                    totalStaff: 15,
                    onDutyCount: 14,
                    onLeaveCount: 1,
                    expiringOrRetiringCount: 2,
                  }}
                />
              </section>

              {/* 2. Grid Layout: Personal Quotas & Promotion Radar vs Management Approvals */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-5 space-y-6">
                  {/* Circular Leave Progress Rings */}
                  <LeaveProgressRings
                    sickLeaveUsed={0}
                    sickLeaveMax={60}
                    personalLeaveUsed={0}
                    personalLeaveMax={45}
                    isFirstYear={false}
                  />

                  {/* Smart Salary Promotion Radar (ก.ค.ศ. ว15/2561) */}
                  <PromotionRadarCard
                    fiscalYear={fiscalYearBE}
                    evalRound={1}
                    leaveCount={0}
                    sickPersonalDays={0}
                    isEligible={true}
                  />
                </div>

                <div className="lg:col-span-7 space-y-6">
                  {/* Pending Approvals Table */}
                  {currentRole === 'director' || currentRole === 'hr_admin' ? (
                    <PendingApprovalQueue currentUserId="director-001" />
                  ) : (
                    <div className="glass-panel p-6 rounded-xl border border-slate-800 text-center py-12">
                      <ShieldCheck className="w-12 h-12 text-sky-400 mx-auto mb-3 opacity-80" />
                      <h4 className="text-base font-semibold text-white">มุมมองบุคลากรทั่วไป (ครูผู้สอน)</h4>
                      <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                        คุณกำลังอยู่ในมุมมองของครูผู้สอน หากต้องการเข้าถึงคิวการอนุมัติคำขอลา โปรดสลับบทบาทเป็น ผู้อำนวยการ หรือ เจ้าหน้าที่บุคคล ที่มุมขวาบน
                      </p>
                    </div>
                  )}

                  {/* Legal References & Regulatory Note */}
                  <div className="glass-panel p-5 rounded-xl border border-slate-800 bg-[#131b26]/60">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>การปฏิบัติตามมาตรฐานกฎหมายราชการไทย (Zero-GAS Engine)</span>
                      </h4>
                      <div className="flex items-center gap-2">
                        <Link
                          href="/leave/print/LEV-2569-001"
                          target="_blank"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#1b2838] hover:bg-[#2a475e] text-[11px] text-sky-300 border border-slate-700 transition-colors"
                        >
                          <Printer className="w-3.5 h-3.5 shrink-0" />
                          <span>ตัวอย่างพิมพ์ A4</span>
                        </Link>
                        <Link
                          href="/verify/leave/%E0%B8%A8%E0%B8%98%2004052.12%2F045"
                          target="_blank"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#1b2838] hover:bg-[#2a475e] text-[11px] text-emerald-300 border border-slate-700 transition-colors"
                        >
                          <FileCheck className="w-3.5 h-3.5 shrink-0" />
                          <span>ตัวอย่างสแกน QR</span>
                        </Link>
                      </div>
                    </div>
                    <ul className="space-y-2 text-xs text-slate-400 font-sans">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>
                          <strong>พ.ร.บ. บำเหน็จบำนาญข้าราชการ พ.ศ. 2494 มาตรา 19:</strong> ผู้เกิดวันที่ 1 ตุลาคม เกษียณในปีงบประมาณที่อายุครบ 60 ปีพอดี (ไม่มีการบวกเพิ่ม 1 ปี)
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>
                          <strong>ระเบียบสำนักนายกรัฐมนตรีฯ พ.ศ. 2555 ข้อ 17:</strong> ข้าราชการบรรจุใหม่ในปีแรก มีสิทธิลากิจส่วนตัวได้ไม่เกิน 15 วันทำการ
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>
                          <strong>มาตรฐาน PDPA & ก.ร.ม.:</strong> จัดเก็บเลขประจำตัวประชาชนแบบ Masking และบันทึก Audit Log ทุกครั้งที่มีการเปิดเผยข้อมูลจริง
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* View 2: Leave Application Form */}
          {activeView === 'leave' && (
            <ViewLeaveSubmit onSuccess={() => handleSelectView('requests')} />
          )}

          {/* View 3: Leave Requests & History */}
          {activeView === 'requests' && (
            <ViewLeaveRequests onOpenSubmitModal={() => handleSelectView('leave')} />
          )}

          {/* View 4: Leave Workflow Tracker */}
          {activeView === 'tracking' && <ViewLeaveTracking />}

          {/* View 5: Retroactive Leave Logging */}
          {activeView === 'retro_leave' && <ViewRetroLeave />}

          {/* View 6: Leave Analytics & Charts */}
          {activeView === 'analytics' && <ViewLeaveAnalytics />}

          {/* View 7: Official OBEC Reports & Excel Exporter */}
          {activeView === 'official_reports' && <ViewOfficialReports />}

          {/* View 8: School 4 Divisions Organization Chart */}
          {activeView === 'org_chart' && <ViewOrgChart />}

          {/* View 9: Basic Education School Board */}
          {activeView === 'school_board' && <ViewSchoolBoard />}

          {/* View 10: Teacher Teaching Hours & PA Workload */}
          {activeView === 'workload' && <ViewWorkload />}

          {/* View 11: Teacher Directory & Portfolios */}
          {activeView === 'staff_directory' && <ViewStaffDirectory />}

          {/* View 12: Academic Standings & Appointment Orders */}
          {activeView === 'dir_standing' && <ViewRegStanding />}

          {/* View 13: Scout Qualifications Registry */}
          {activeView === 'dir_scout' && <ViewRegScout />}

          {/* View 14: Khurusapha Professional Licenses */}
          {activeView === 'dir_license' && <ViewRegLicense />}

          {/* View 15: System Feedback */}
          {activeView === 'feedback' && <ViewFeedback />}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="lg:hidden sticky bottom-0 z-40 bg-[#161f2b]/95 backdrop-blur-md border-t border-slate-800 px-2 py-1.5 flex items-center justify-around text-[10px]">
        <button
          type="button"
          onClick={() => handleSelectView('dashboard')}
          className={`flex flex-col items-center gap-1 p-1.5 rounded-lg transition-colors ${
            activeView === 'dashboard' ? 'text-sky-400 font-bold' : 'text-slate-400'
          }`}
        >
          <LayoutDashboard className="w-4 h-4 shrink-0" />
          <span>สถิติ</span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectView('leave')}
          className={`flex flex-col items-center gap-1 p-1.5 rounded-lg transition-colors ${
            activeView === 'leave' ? 'text-emerald-400 font-bold' : 'text-slate-400'
          }`}
        >
          <PlusCircle className="w-4 h-4 shrink-0" />
          <span>ยื่นใบลา</span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectView('requests')}
          className={`flex flex-col items-center gap-1 p-1.5 rounded-lg transition-colors ${
            activeView === 'requests' ? 'text-amber-400 font-bold' : 'text-slate-400'
          }`}
        >
          <FileText className="w-4 h-4 shrink-0" />
          <span>คำร้อง</span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectView('tracking')}
          className={`flex flex-col items-center gap-1 p-1.5 rounded-lg transition-colors ${
            activeView === 'tracking' ? 'text-sky-400 font-bold' : 'text-slate-400'
          }`}
        >
          <Clock className="w-4 h-4 shrink-0" />
          <span>ติดตาม</span>
        </button>

        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(true)}
          className="flex flex-col items-center gap-1 p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors"
        >
          <Menu className="w-4 h-4 shrink-0" />
          <span>เมนูอื่นๆ</span>
        </button>
      </nav>

      {/* Realtime Toasts Floating Overlay */}
      {toasts.length > 0 && (
        <div className="fixed bottom-16 lg:bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className="bg-[#1b2838] border border-sky-500/40 rounded-xl p-4 shadow-2xl text-slate-100 flex items-start gap-3 animate-in slide-in-from-bottom-2 duration-200"
            >
              <Bell className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-xs font-semibold text-white">{toast.title}</div>
                <div className="text-xs text-slate-300 mt-0.5">{toast.message}</div>
              </div>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
