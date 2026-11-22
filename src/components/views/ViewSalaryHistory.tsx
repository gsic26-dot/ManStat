'use client';

/**
 * ============================================================================
 * ManStat: View Salary Promotion History (ประวัติการเลื่อนเงินเดือนรายรอบ)
 * ============================================================================
 * Standards:
 * - Dedicated HR view under หมวด 3: งานทะเบียนประวัติ
 * - Filter Civil Servants Only: Exactly 12 eligible civil servants (1 Exec + 11 Teachers)
 *   Excludes support / contract staff (เจ้าหน้าที่ธุรการ, นักการภารโรง, พี่เลี้ยงเด็กพิการ)
 * - Strict RBAC: Accessible to superuser, director, hr_admin, and HR personnel.
 *   Access-denied fallback for unauthorized staff.
 * - PDPA Compliance: Financial numbers masked by default with audit-logged toggle.
 * - Single-line whitespace-nowrap table cells, zero emojis.
 * ============================================================================
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  TrendingUp,
  Lock,
  Unlock,
  Check,
  Eye,
  EyeOff,
  Plus,
  Loader2,
  ShieldAlert,
  ArrowLeft,
  Calendar,
  Users,
  Award,
  FileText,
  DollarSign,
  AlertCircle,
} from 'lucide-react';
import type {
  FiscalPeriodRecord,
  SalaryPromotionRecord,
  TeacherRecord,
} from '@/lib/data/schoolData';
import type { UserRole } from '@/types/database.types';
import { canManageSalaryPromotions, isCivilServantForSalary } from '@/lib/auth/roles';
import { sortTeachersByBranch, getStaffBranch } from '@/lib/regulations/staff-sorting';
import { formatStaffName } from '@/lib/regulations/staff-formatting';

interface ViewSalaryHistoryProps {
  currentUser?: any;
  currentRole?: UserRole;
  onBackToDashboard?: () => void;
  showToast?: (msg: string, type: 'success' | 'error') => void;
}

export function ViewSalaryHistory({
  currentUser,
  currentRole = 'teacher',
  onBackToDashboard,
  showToast,
}: ViewSalaryHistoryProps) {
  const [fiscalPeriods, setFiscalPeriods] = useState<FiscalPeriodRecord[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  const [teachers, setTeachers] = useState<TeacherRecord[]>([]);
  const [salaryRecords, setSalaryRecords] = useState<SalaryPromotionRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingSalary, setLoadingSalary] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isMasked, setIsMasked] = useState<boolean>(true);
  const remaskTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Clear auto-remasking timer on unmount
  useEffect(() => {
    return () => {
      if (remaskTimerRef.current) {
        clearTimeout(remaskTimerRef.current);
      }
    };
  }, []);

  // Check management authority
  const isAuthorizedManager = useMemo(() => {
    return canManageSalaryPromotions(
      currentRole,
      currentUser?.position,
      currentUser?.department || currentUser?.division
    );
  }, [currentRole, currentUser]);

  // Check if current user is an eligible civil servant (for self-view fallback)
  const isUserCivilServant = useMemo(() => {
    if (!currentUser) return false;
    const match = teachers.find(
      (t) => t.id === currentUser.id || t.employeeCode === currentUser.employeeCode
    );
    if (match) return isCivilServantForSalary(match);
    // If not in teachers list yet, inspect role / position directly
    const pos = currentUser.position || '';
    if (
      pos.includes('ธุรการ') ||
      pos.includes('นักการ') ||
      pos.includes('ภารโรง') ||
      pos.includes('พี่เลี้ยง') ||
      pos.includes('ลูกจ้าง')
    ) {
      return false;
    }
    return true;
  }, [currentUser, teachers]);

  // Load teachers list
  useEffect(() => {
    let isMounted = true;
    fetch('/api/admin/staff', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.success && Array.isArray(data.data)) {
          setTeachers(data.data);
        }
      })
      .catch((err) => console.error('[ViewSalaryHistory loadStaff Error]', err));
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch fiscal periods
  const fetchPeriods = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/academic?schoolId=30030099', {
        cache: 'no-store',
      });
      const json = await res.json();
      if (res.ok && json.success) {
        const periods: FiscalPeriodRecord[] = json.data.fiscalPeriods || [];
        setFiscalPeriods(periods);

        // Select active period by default
        setSelectedPeriodId((prev) => {
          if (prev && periods.some((p) => p.id === prev)) return prev;
          const active = periods.find((p) => p.isActive);
          return active ? active.id : periods[0]?.id || null;
        });
      }
    } catch (err: any) {
      console.error('[ViewSalaryHistory fetchPeriods Error]', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPeriods();
  }, [fetchPeriods]);

  // Selected period object
  const selectedPeriod = useMemo(() => {
    return fiscalPeriods.find((p) => p.id === selectedPeriodId) || fiscalPeriods[0] || null;
  }, [fiscalPeriods, selectedPeriodId]);

  // Fetch salary promotion records for selected period
  const fetchSalaryRecords = useCallback(async (periodId: string) => {
    try {
      setLoadingSalary(true);
      const res = await fetch(
        `/api/admin/academic?schoolId=30030099&fiscalPeriodId=${encodeURIComponent(periodId)}`,
        { cache: 'no-store' }
      );
      const json = await res.json();
      if (res.ok && json.success) {
        setSalaryRecords(json.data.salaryPromotionRecords || []);
      }
    } catch (err: any) {
      console.error('[ViewSalaryHistory fetchSalaryRecords Error]', err);
    } finally {
      setLoadingSalary(false);
    }
  }, []);

  useEffect(() => {
    if (selectedPeriod?.id) {
      fetchSalaryRecords(selectedPeriod.id);
    }
  }, [selectedPeriod?.id, fetchSalaryRecords]);

  // Filter civil servants strictly: 12 eligible members
  const civilServants = useMemo(() => {
    const filtered = teachers.filter((t) => isCivilServantForSalary(t));
    return sortTeachersByBranch(filtered);
  }, [teachers]);

  // Filter displayed rows based on role
  const displayCivilServants = useMemo(() => {
    if (isAuthorizedManager) {
      return civilServants;
    }
    // Regular civil servant: self-view only
    if (currentUser) {
      return civilServants.filter(
        (t) => t.id === currentUser.id || t.employeeCode === currentUser.employeeCode
      );
    }
    return [];
  }, [civilServants, isAuthorizedManager, currentUser]);

  // Toggle PDPA Masking with audit logging and 45-second auto-remasking
  const handleToggleMask = () => {
    if (remaskTimerRef.current) {
      clearTimeout(remaskTimerRef.current);
      remaskTimerRef.current = null;
    }

    const nextState = !isMasked;
    setIsMasked(nextState);

    // Audit logging and auto-remasking when unmasking financial data
    if (!nextState) {
      fetch('/api/admin/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'VIEW_FINANCIAL_SALARY_DATA',
          details: `ผู้ใช้เปิดดูข้อมูลตัวเลขทางการเงินในรอบปีงบฯ ID: ${selectedPeriod?.id || '-'}`,
          schoolId: '30030099',
        }),
      }).catch(() => {});

      // Auto-remask after 45 seconds (PDPA safety standard)
      remaskTimerRef.current = setTimeout(() => {
        setIsMasked(true);
      }, 45000);
    }
  };

  // Handle snapshotting staff
  const handleSnapshotStaff = async () => {
    if (!selectedPeriod) return;
    if (selectedPeriod.isLocked) {
      showToast?.('รอบปีงบประมาณนี้ถูกล็อกแล้ว ไม่สามารถบันทึก Snapshot ได้', 'error');
      return;
    }
    try {
      setIsSaving(true);
      const res = await fetch('/api/admin/academic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SNAPSHOT_STAFF_SALARY',
          payload: { fiscalPeriodId: selectedPeriod.id },
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'ไม่สามารถบันทึก Snapshot บุคลากรได้');
      }
      showToast?.(json.message || 'บันทึก Snapshot ข้าราชการครูสำเร็จ', 'success');
      await fetchSalaryRecords(selectedPeriod.id);
    } catch (err: any) {
      showToast?.(err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle saving an individual record
  const handleSaveRecord = async (
    record: Partial<SalaryPromotionRecord> & { staffId: string }
  ) => {
    if (!selectedPeriod) return;
    if (selectedPeriod.isLocked) {
      showToast?.('รอบนี้ถูกล็อกแล้ว ไม่สามารถแก้ไขข้อมูลได้', 'error');
      return;
    }
    try {
      const res = await fetch('/api/admin/academic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SAVE_SALARY_PROMOTION_RECORD',
          payload: {
            record: {
              ...record,
              fiscalPeriodId: selectedPeriod.id,
            },
          },
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'ไม่สามารถบันทึกข้อมูลเลื่อนเงินเดือนได้');
      }
      showToast?.('บันทึกข้อมูลการเลื่อนเงินเดือนสำเร็จ', 'success');
      await fetchSalaryRecords(selectedPeriod.id);
    } catch (err: any) {
      showToast?.(err.message, 'error');
    }
  };

  // --------------------------------------------------------------------------
  // Access Denied Fallback for Support & Non-HR Staff
  // --------------------------------------------------------------------------
  if (!isAuthorizedManager && !isUserCivilServant) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="bg-white dark:bg-[#141b24] p-8 rounded-2xl border border-rose-200/90 dark:border-rose-900/40 shadow-sm text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 flex items-center justify-center mx-auto text-rose-600 dark:text-rose-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              สงวนสิทธิ์เฉพาะผู้อำนวยการและเจ้าหน้าที่งานบุคคล
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-md mx-auto">
              ระบบประวัติการเลื่อนเงินเดือนข้าราชการครูสงวนสิทธิ์การเข้าถึงสำหรับผู้อำนวยการสถานศึกษาและเจ้าหน้าที่บริหารงานบุคคลเท่านั้น
              หากต้องการข้อมูลกรุณาติดต่อกลุ่มบริหารงานบุคคล
            </p>
          </div>
          {onBackToDashboard && (
            <div className="pt-2">
              <button
                type="button"
                onClick={onBackToDashboard}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>กลับสู่หน้าหลัก</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Round dates and effective date computation
  const roundDetails = selectedPeriod
    ? {
        label: `ปีงบฯ ${selectedPeriod.fiscalYearTh} · รอบที่ ${selectedPeriod.roundNo}`,
        evalDates:
          selectedPeriod.roundNo === 1
            ? `1 ต.ค. ${selectedPeriod.fiscalYearTh - 1} – 31 มี.ค. ${selectedPeriod.fiscalYearTh}`
            : `1 เม.ย. ${selectedPeriod.fiscalYearTh} – 30 ก.ย. ${selectedPeriod.fiscalYearTh}`,
        effectiveDate:
          selectedPeriod.roundNo === 1
            ? `1 เม.ย. ${selectedPeriod.fiscalYearTh}`
            : `1 ต.ค. ${selectedPeriod.fiscalYearTh}`,
        isLocked: Boolean(selectedPeriod.isLocked),
      }
    : null;

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------------ */}
      {/* 1. Header & Controls                                               */}
      {/* ------------------------------------------------------------------ */}
      <div className="bg-white dark:bg-[#141b24] p-5 sm:p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-colors duration-200">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60">
              <TrendingUp className="w-5 h-5 shrink-0" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                  ประวัติการเลื่อนเงินเดือน
                </h2>
                <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  ข้าราชการครู 12 ท่าน
                </span>
                {!isAuthorizedManager && (
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                    โหมดดูข้อมูลเฉพาะตนเอง
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                บันทึกประวัติการเลื่อนเงินเดือนรายรอบ ข้าราชการครูและบุคลากรทางการศึกษา ตามหลักเกณฑ์ ว 15/2561
              </p>
            </div>
          </div>
        </div>

        {/* PDPA Masking Button */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleToggleMask}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              isMasked
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200/60'
                : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
            }`}
            title="มาตรการคุ้มครองข้อมูลส่วนบุคคล (PDPA)"
          >
            {isMasked ? (
              <>
                <Eye className="w-3.5 h-3.5 text-slate-500" />
                <span>แสดงตัวเลข (PDPA)</span>
              </>
            ) : (
              <>
                <EyeOff className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>ซ่อนตัวเลข (PDPA)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 2. Fiscal Period Selection Bar                                     */}
      {/* ------------------------------------------------------------------ */}
      <div className="bg-white dark:bg-[#111822] p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 space-y-3 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mr-1">
              รอบปีงบประมาณ
            </span>
            {fiscalPeriods.length === 0 ? (
              <span className="text-xs text-slate-400 py-1 px-2">กำลังโหลดรอบปีงบประมาณ...</span>
            ) : (
              <div className="inline-flex flex-wrap rounded-xl bg-slate-100 dark:bg-slate-800/80 p-0.5 border border-slate-200/60 dark:border-slate-700/60 gap-1">
                {fiscalPeriods.map((period) => {
                  const isViewing = period.id === selectedPeriod?.id;
                  const isActive = Boolean(period.isActive);
                  const roundDates = period.roundNo === 1 ? '1 ต.ค. – 31 มี.ค.' : '1 เม.ย. – 30 ก.ย.';

                  let btnClass =
                    'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800';
                  if (isActive) {
                    if (isViewing) {
                      btnClass =
                        'bg-emerald-600 text-white font-semibold shadow-xs ring-2 ring-emerald-400/50 dark:ring-emerald-500/40';
                    } else {
                      btnClass =
                        'bg-emerald-600/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/40 font-medium hover:bg-emerald-600/25';
                    }
                  } else if (isViewing) {
                    btnClass =
                      'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold ring-1 ring-sky-500 dark:ring-sky-400';
                  }

                  return (
                    <button
                      key={period.id}
                      type="button"
                      onClick={() => setSelectedPeriodId(period.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-all ${btnClass}`}
                    >
                      ปีงบฯ {period.fiscalYearTh} · {roundDates}
                    </button>
                  );
                })}
              </div>
            )}

            {selectedPeriod?.isActive && (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium px-2 py-1">
                <Check className="w-3.5 h-3.5" />
                <span>รอบปัจจุบัน</span>
              </span>
            )}

            {selectedPeriod?.isLocked && (
              <span className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-300 font-medium px-2 py-1 bg-amber-50 dark:bg-amber-950/30 rounded-md border border-amber-200/60 dark:border-amber-800/60">
                <Lock className="w-3.5 h-3.5" />
                <span>ล็อกรอบประเมินแล้ว</span>
              </span>
            )}
          </div>

          {/* Snapshot Trigger if Authorized & Unlocked */}
          {isAuthorizedManager && (
            <div className="flex items-center gap-2">
              {salaryRecords.length === 0 && selectedPeriod && !selectedPeriod.isLocked && (
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleSnapshotStaff}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-sky-600 hover:bg-sky-500 text-white transition-colors disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>บันทึก Snapshot บุคลากรทั้งหมดในรอบนี้</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 3. Summary Metric Cards                                            */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-[#111822] p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 mb-1">
            <span className="text-[11px] font-medium">ข้าราชการครูผู้มีสิทธิ์</span>
            <Users className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
            {civilServants.length} <span className="text-xs font-normal text-slate-500">ท่าน</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5 truncate">
            สายบริหาร 1 · สายการสอน 11
          </p>
        </div>

        <div className="bg-white dark:bg-[#111822] p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 mb-1">
            <span className="text-[11px] font-medium">รอบการประเมิน</span>
            <Calendar className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
            {roundDetails?.label || '-'}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5 font-mono truncate">
            {roundDetails?.evalDates || '-'}
          </p>
        </div>

        <div className="bg-white dark:bg-[#111822] p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 mb-1">
            <span className="text-[11px] font-medium">วันที่มีผลบังคับใช้</span>
            <Award className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-sm font-semibold text-slate-900 dark:text-white font-mono">
            {roundDetails?.effectiveDate || '-'}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            ตามประกาศคำสั่งเลื่อนขั้น
          </p>
        </div>

        <div className="bg-white dark:bg-[#111822] p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 mb-1">
            <span className="text-[11px] font-medium">สถานะข้อมูลรอบ</span>
            {selectedPeriod?.isLocked ? (
              <Lock className="w-4 h-4 text-amber-500" />
            ) : (
              <Unlock className="w-4 h-4 text-emerald-500" />
            )}
          </div>
          <div className="text-sm font-semibold text-slate-900 dark:text-white">
            {selectedPeriod?.isLocked ? 'ล็อกแล้ว (สิ้นสุดรอบ)' : 'เปิดบันทึก/แก้ไขได้'}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {selectedPeriod?.isLocked ? 'ประวัติศาสตร์แบบอ่านอย่างเดียว' : 'ผู้ดูแลระบบสามารถปรับปรุงได้'}
          </p>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 4. Salary Promotion Table                                          */}
      {/* ------------------------------------------------------------------ */}
      <div className="bg-white dark:bg-[#111822] rounded-xl border border-slate-200/90 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              บัญชีรายชื่อข้าราชการครูและบุคลากรทางการศึกษาที่ได้รับการพิจารณาเลื่อนเงินเดือน
            </span>
            <span className="text-xs text-slate-400 font-mono">
              · {displayCivilServants.length} ท่าน
            </span>
          </div>

          {selectedPeriod?.isLocked && (
            <div className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-300">
              <Lock className="w-3.5 h-3.5" />
              <span>รอบนี้สิ้นสุดการประเมินแล้ว ไม่อนุญาตให้แก้ไข</span>
            </div>
          )}
        </div>

        {loadingSalary ? (
          <div className="py-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-sky-500" />
            <span>กำลังโหลดข้อมูลการเลื่อนเงินเดือน...</span>
          </div>
        ) : displayCivilServants.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              ไม่พบรายชื่อข้าราชการครูที่มีสิทธิ์ในมุมมองนี้
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-50/80 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 border-b border-slate-200/80 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-3 font-semibold w-12 text-center">ลำดับ</th>
                  <th className="py-2.5 px-3 font-semibold">ชื่อ - สกุล</th>
                  <th className="py-2.5 px-3 font-semibold">ตำแหน่ง ณ รอบนี้</th>
                  <th className="py-2.5 px-3 font-semibold">วิทยฐานะ ณ รอบนี้</th>
                  <th className="py-2.5 px-3 font-semibold text-right">ฐานคำนวณ (บาท)</th>
                  <th className="py-2.5 px-3 font-semibold text-center">ร้อยละที่ได้เลื่อน</th>
                  <th className="py-2.5 px-3 font-semibold text-right">จำนวนเงินที่ได้เลื่อน</th>
                  <th className="py-2.5 px-3 font-semibold text-right">เงินเดือนใหม่ (บาท)</th>
                  <th className="py-2.5 px-3 font-semibold text-center">เลขที่คำสั่ง</th>
                  {isAuthorizedManager && (
                    <th className="py-2.5 px-3 font-semibold text-right">ดำเนินการ</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                {displayCivilServants.map((teacher, idx) => {
                  const record = salaryRecords.find(
                    (r) => r.staffId === teacher.id || r.staffId === teacher.employeeCode
                  ) || {
                    staffId: teacher.id,
                    fiscalPeriodId: selectedPeriod?.id || '',
                    positionSnapshot: teacher.position || '',
                    standingSnapshot: teacher.academicStanding || '-',
                    salaryBefore: (teacher as any).salary || 0,
                    calculationBase: (teacher as any).salary || 0,
                    promotionPercent: 0,
                    salaryAfter: (teacher as any).salary || 0,
                    orderNo: '',
                  };

                  return (
                    <SalaryPromotionRow
                      key={teacher.id}
                      index={idx + 1}
                      teacher={teacher}
                      record={record}
                      isMasked={isMasked}
                      isLocked={Boolean(selectedPeriod?.isLocked)}
                      canEdit={isAuthorizedManager}
                      onSave={handleSaveRecord}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Subcomponent: SalaryPromotionRow (Inline row editing with real-time math)
// ----------------------------------------------------------------------------
interface SalaryPromotionRowProps {
  index: number;
  teacher: TeacherRecord;
  record: SalaryPromotionRecord | Partial<SalaryPromotionRecord> & { staffId: string };
  isMasked: boolean;
  isLocked: boolean;
  canEdit: boolean;
  onSave: (record: Partial<SalaryPromotionRecord> & { staffId: string }) => void;
}

function SalaryPromotionRow({
  index,
  teacher,
  record,
  isMasked,
  isLocked,
  canEdit,
  onSave,
}: SalaryPromotionRowProps) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    positionSnapshot: record.positionSnapshot || teacher.position || '',
    standingSnapshot: record.standingSnapshot || teacher.academicStanding || '-',
    calculationBase: Number(record.calculationBase || (teacher as any).salary || 0),
    promotionPercent: Number(record.promotionPercent || 0),
    salaryAfter: Number(record.salaryAfter || (teacher as any).salary || 0),
    orderNo: record.orderNo || '',
  });

  // Keep form in sync when record changes
  useEffect(() => {
    setForm({
      positionSnapshot: record.positionSnapshot || teacher.position || '',
      standingSnapshot: record.standingSnapshot || teacher.academicStanding || '-',
      calculationBase: Number(record.calculationBase || (teacher as any).salary || 0),
      promotionPercent: Number(record.promotionPercent || 0),
      salaryAfter: Number(record.salaryAfter || (teacher as any).salary || 0),
      orderNo: record.orderNo || '',
    });
  }, [record, teacher]);

  const handleSave = () => {
    onSave({
      staffId: record.staffId,
      positionSnapshot: form.positionSnapshot,
      standingSnapshot: form.standingSnapshot,
      calculationBase: Number(form.calculationBase),
      promotionPercent: Number(form.promotionPercent),
      salaryAfter: Number(form.salaryAfter),
      orderNo: form.orderNo,
    });
    setEditing(false);
  };

  const displayName = formatStaffName(teacher);
  const branch = getStaffBranch(teacher);

  // Computed values
  const currentBase = Number(record.calculationBase || (teacher as any).salary || 0);
  const currentPct = Number(record.promotionPercent || 0);
  const currentIncrease = Math.round((currentBase * currentPct) / 100);
  const currentNewSalary = Number(record.salaryAfter || currentBase + currentIncrease);

  if (editing && !isLocked && canEdit) {
    const editIncrease = Math.round((form.calculationBase * form.promotionPercent) / 100);

    return (
      <tr className="bg-sky-50/50 dark:bg-sky-950/25">
        <td className="py-2 px-3 text-center text-slate-400 font-sans">{index}</td>
        <td className="py-2 px-3 font-sans font-medium text-slate-900 dark:text-white">
          <div className="flex flex-col">
            <span>{displayName}</span>
            <span className="text-[10px] text-slate-400 font-mono">{teacher.employeeCode}</span>
          </div>
        </td>
        <td className="py-2 px-3">
          <input
            type="text"
            value={form.positionSnapshot}
            onChange={(e) => setForm({ ...form, positionSnapshot: e.target.value })}
            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs font-sans text-slate-900 dark:text-white"
          />
        </td>
        <td className="py-2 px-3">
          <input
            type="text"
            value={form.standingSnapshot}
            onChange={(e) => setForm({ ...form, standingSnapshot: e.target.value })}
            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs font-sans text-slate-900 dark:text-white"
          />
        </td>
        <td className="py-2 px-3 text-right">
          <input
            type="number"
            value={form.calculationBase || ''}
            onChange={(e) => {
              const base = parseFloat(e.target.value) || 0;
              const increase = Math.round((base * form.promotionPercent) / 100);
              setForm({
                ...form,
                calculationBase: base,
                salaryAfter: base + increase,
              });
            }}
            className="w-24 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs font-mono text-right text-slate-900 dark:text-white"
          />
        </td>
        <td className="py-2 px-3 text-center">
          <input
            type="number"
            step="0.01"
            value={form.promotionPercent || ''}
            onChange={(e) => {
              const pct = parseFloat(e.target.value) || 0;
              const base = form.calculationBase || 0;
              const increase = Math.round((base * pct) / 100);
              setForm({
                ...form,
                promotionPercent: pct,
                salaryAfter: base + increase,
              });
            }}
            className="w-20 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs font-mono text-center text-slate-900 dark:text-white"
          />
        </td>
        <td className="py-2 px-3 text-right text-slate-600 dark:text-slate-300">
          {editIncrease.toLocaleString()}
        </td>
        <td className="py-2 px-3 text-right">
          <input
            type="number"
            value={form.salaryAfter || ''}
            onChange={(e) => setForm({ ...form, salaryAfter: parseFloat(e.target.value) || 0 })}
            className="w-28 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs font-mono text-right text-slate-900 dark:text-white"
          />
        </td>
        <td className="py-2 px-3 text-center">
          <input
            type="text"
            value={form.orderNo}
            placeholder="เช่น 12/2570"
            onChange={(e) => setForm({ ...form, orderNo: e.target.value })}
            className="w-24 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs font-mono text-center text-slate-900 dark:text-white"
          />
        </td>
        <td className="py-2 px-3 text-right">
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={handleSave}
              className="px-2.5 py-1 bg-sky-600 text-white rounded text-xs font-sans hover:bg-sky-500 font-medium"
            >
              บันทึก
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="px-2 py-1 bg-slate-200 dark:bg-slate-700 rounded text-xs font-sans text-slate-700 dark:text-slate-300 hover:bg-slate-300"
            >
              ยกเลิก
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="hover:bg-slate-50/70 dark:hover:bg-slate-850/50 transition-colors">
      <td className="py-2.5 px-3 text-center text-slate-400 font-sans">{index}</td>
      <td className="py-2.5 px-3 font-sans">
        <div className="flex flex-col">
          <span className="font-medium text-slate-900 dark:text-white">{displayName}</span>
          <span className="text-[10px] text-slate-400 font-mono">{teacher.employeeCode}</span>
        </div>
      </td>
      <td className="py-2.5 px-3 font-sans text-slate-600 dark:text-slate-300">
        {record.positionSnapshot || teacher.position || '-'}
      </td>
      <td className="py-2.5 px-3 font-sans text-slate-600 dark:text-slate-300">
        <span
          className={`inline-block px-2 py-0.5 rounded text-[11px] font-sans ${
            branch === 'management'
              ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300'
              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
          }`}
        >
          {record.standingSnapshot || teacher.academicStanding || '-'}
        </span>
      </td>
      <td className="py-2.5 px-3 text-right text-slate-700 dark:text-slate-300">
        {isMasked ? (
          <span className="text-slate-400 tracking-wider">••••••</span>
        ) : currentBase > 0 ? (
          currentBase.toLocaleString()
        ) : (
          '-'
        )}
      </td>
      <td className="py-2.5 px-3 text-center text-slate-700 dark:text-slate-300">
        {isMasked ? (
          <span className="text-slate-400 tracking-wider">•••</span>
        ) : currentPct > 0 ? (
          <span className="font-medium text-emerald-600 dark:text-emerald-400">
            {currentPct.toFixed(2)}%
          </span>
        ) : (
          '-'
        )}
      </td>
      <td className="py-2.5 px-3 text-right text-slate-700 dark:text-slate-300">
        {isMasked ? (
          <span className="text-slate-400 tracking-wider">••••</span>
        ) : currentIncrease > 0 ? (
          `+${currentIncrease.toLocaleString()}`
        ) : (
          '-'
        )}
      </td>
      <td className="py-2.5 px-3 text-right font-semibold text-slate-900 dark:text-white">
        {isMasked ? (
          <span className="text-slate-400 tracking-wider">••••••</span>
        ) : currentNewSalary > 0 ? (
          currentNewSalary.toLocaleString()
        ) : (
          '-'
        )}
      </td>
      <td className="py-2.5 px-3 text-center text-slate-500 dark:text-slate-400">
        {record.orderNo || '-'}
      </td>
      {canEdit && (
        <td className="py-2.5 px-3 text-right">
          {!isLocked && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-xs text-sky-600 dark:text-sky-400 hover:underline font-sans font-medium"
            >
              แก้ไข
            </button>
          )}
        </td>
      )}
    </tr>
  );
}
