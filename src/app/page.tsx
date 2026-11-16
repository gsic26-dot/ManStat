'use client';

/**
 * ============================================================================
 * ManStat-Modern: Main Executive Dashboard (Next.js 100% Zero-GAS Architecture)
 * ============================================================================
 * - Personnel Status Summary Cards
 * - Circular Leave Progress Rings (PM Office Regulations 2555)
 * - Smart Promotion Radar (OPSC ว15/2561)
 * - Real-time Pending Approval Queue (HR Admin & Director)
 * - PDPA Citizen ID Shield with 15s Countdown
 * - Modal Trigger for SmartLeaveForm with Live Calculation
 * - Realtime Postgres Changes Subscription
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
} from 'lucide-react';
import { PersonnelSummaryCards } from '@/components/dashboard/PersonnelSummaryCards';
import { LeaveProgressRings } from '@/components/dashboard/LeaveProgressRings';
import { PromotionRadarCard } from '@/components/dashboard/PromotionRadarCard';
import { PendingApprovalQueue } from '@/components/dashboard/PendingApprovalQueue';
import { CitizenIdShield } from '@/components/security/CitizenIdShield';
import { SmartLeaveForm } from '@/components/leave/SmartLeaveForm';
import { useLeaveRealtime } from '@/hooks/useLeaveRealtime';

export default function DashboardPage() {
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState<boolean>(false);
  const [currentRole, setCurrentRole] = useState<'director' | 'hr_admin' | 'teacher'>('director');

  // Real-time toast notifications hook
  const { toasts, dismissToast } = useLeaveRealtime({ enableToasts: true });

  const currentDateThai = 'วันจันทร์ที่ 16 พฤศจิกายน 2569';
  const fiscalYearBE = 2570;

  return (
    <div className="min-h-screen bg-[#0e141b] text-slate-100 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-[#171a21]/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & School Branding */}
          <div className="flex items-center gap-3">
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
          </div>

          {/* Right Action Tools & Role Switcher */}
          <div className="flex items-center gap-4">
            {/* Role Switcher (For Demo & Verification) */}
            <div className="hidden md:flex items-center gap-1.5 bg-[#101822] px-2 py-1 rounded-lg border border-slate-700 text-xs text-slate-300">
              <Layers className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span>บทบาท:</span>
              <select
                value={currentRole}
                onChange={(e) => setCurrentRole(e.target.value as 'director' | 'hr_admin' | 'teacher')}
                className="bg-transparent text-sky-300 font-medium focus:outline-none cursor-pointer"
              >
                <option value="director" className="bg-[#171a21]">ผู้อำนวยการ (Director)</option>
                <option value="hr_admin" className="bg-[#171a21]">เจ้าหน้าที่บุคคล (HR Admin)</option>
                <option value="teacher" className="bg-[#171a21]">ครูผู้สอน (Teacher)</option>
              </select>
            </div>

            {/* Quick Submit Leave Button */}
            <button
              type="button"
              onClick={() => setIsLeaveModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-sky-400"
            >
              <PlusCircle className="w-4 h-4 shrink-0" />
              <span>ยื่นแบบฟอร์มขอลา</span>
            </button>

            {/* User Profile Pill */}
            <div className="flex items-center gap-2 pl-3 border-l border-slate-700">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
                <User className="w-4 h-4" />
              </div>
              <div className="hidden lg:block text-left">
                <div className="text-xs font-semibold text-slate-200">นายสุรชัย ใจซื่อ</div>
                <div className="text-[10px] text-slate-400">ผู้อำนวยการสถานศึกษา</div>
              </div>
            </div>

            {/* Logout Link */}
            <Link
              href="/login"
              title="ออกจากระบบ"
              className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-rose-300 transition-colors"
            >
              <LogOut className="w-4 h-4 shrink-0" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
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
                initialMaskedId="1-3001-00123-45-6"
              />
            </div>
          </div>
        </div>

        {/* 1. Personnel Summary Cards (School-wide Status Header) */}
        <section aria-label="Personnel Summary Statistics">
          <PersonnelSummaryCards
            stats={{
              totalStaff: 42,
              onDutyCount: 40,
              onLeaveCount: 2,
              expiringOrRetiringCount: 3,
            }}
          />
        </section>

        {/* 2. Grid Layout: Personal Quotas & Promotion Radar vs Management Approvals */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (5 Cols on Large Screen): Individual Leave Quotas & Promotion Radar */}
          <div className="lg:col-span-5 space-y-6">
            {/* Circular Leave Progress Rings */}
            <LeaveProgressRings
              sickLeaveUsed={3.5}
              sickLeaveMax={60}
              personalLeaveUsed={2}
              personalLeaveMax={45}
              isFirstYear={false}
            />

            {/* Smart Salary Promotion Radar (ก.ค.ศ. ว15/2561) */}
            <PromotionRadarCard
              fiscalYear={fiscalYearBE}
              evalRound={1}
              leaveCount={2}
              sickPersonalDays={5.5}
              isEligible={true}
            />
          </div>

          {/* Right Column (7 Cols on Large Screen): Approval Queue & System Health */}
          <div className="lg:col-span-7 space-y-6">
            {/* Pending Approvals Table (For hr_admin & director) */}
            {(currentRole === 'director' || currentRole === 'hr_admin') ? (
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
              <h4 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>การปฏิบัติตามมาตรฐานกฎหมายราชการไทย (Compliance Verification)</span>
              </h4>
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
      </main>

      {/* Modal: Smart Leave Form */}
      {isLeaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="my-8 w-full max-w-2xl animate-in fade-in zoom-in-95 duration-150">
            <SmartLeaveForm
              currentStaffId="c6e3d2a1-0000-0000-0000-000000000001"
              currentStaffName="นายสุรชัย ใจซื่อ"
              isFirstYearAppointee={false}
              onSuccess={() => setIsLeaveModalOpen(false)}
              onCancel={() => setIsLeaveModalOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Realtime Toasts Floating Overlay */}
      {toasts.length > 0 && (
        <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full">
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
