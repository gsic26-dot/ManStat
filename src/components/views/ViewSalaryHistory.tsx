'use client';

/**
 * ============================================================================
 * ManStat: View Salary Promotion (การเลื่อนเงินเดือน)
 * ============================================================================
 * Standards:
 * - Dedicated HR workspace under หมวด 3: งานทะเบียนประวัติ
 * - Filter Civil Servants Only: Exactly 12 eligible civil servants (1 Exec + 11 Teachers)
 *   Excludes support / contract staff (เจ้าหน้าที่ธุรการ, นักการภารโรง, พี่เลี้ยงเด็กพิการ)
 * - Strict RBAC:
 *   * Director / Superuser / HR Admin: Full access to all 12 civil servants
 *   * Civil-Servant Teachers: Self-view row ONLY (Confidentiality Guard)
 *   * Support Staff: Access Denied guard
 * - Expandable Master-Detail Table: Eliminates horizontal scroll, zero-wrapping master row
 * - PDPA Compliance: Financial numbers masked by default with 45s auto-remasking timer
 * - Zero emojis, pure Lucide SVG icons with strict 8px gap.
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
  ChevronRight,
  ChevronDown,
  Printer,
  FileEdit,
  Pencil,
  X,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import type {
  FiscalPeriodRecord,
  SalaryPromotionRecord,
  TeacherRecord,
  EvaluationRoundStatus,
} from '@/lib/data/schoolData';
import type { UserRole } from '@/types/database.types';
import { canManageSalaryPromotions, isCivilServantForSalary } from '@/lib/auth/roles';
import { sortTeachersByBranch, getStaffBranch } from '@/lib/regulations/staff-sorting';
import { formatStaffName } from '@/lib/regulations/staff-formatting';
import { EvaluationWorkspace } from '@/components/evaluation/EvaluationWorkspace';
import { EvaluationA4PrintDocument } from '@/components/evaluation/EvaluationA4PrintDocument';

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
  const [expandedStaffId, setExpandedStaffId] = useState<string | null>(null);
  const [selfEvalTeacher, setSelfEvalTeacher] = useState<TeacherRecord | null>(null);
  const [printRecordData, setPrintRecordData] = useState<{ teacher: TeacherRecord; record: any } | null>(null);
  const [evalStatusMap, setEvalStatusMap] = useState<Record<string, string>>({});

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
    const pos = currentUser.position || '';
    if (
      pos.includes('ธุรการ') ||
      pos.includes('นักการ') ||
      pos.includes('ภารโรง') ||
      pos.includes('พี่เลี้ยง') ||
      pos.includes('ลูกจ้าง') ||
      pos.includes('จ้างเหมา')
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
      .catch((err) => console.error('[ViewSalaryHistory fetchStaff Error]', err));

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
      if (json.success && Array.isArray(json.data.fiscalPeriods)) {
        const sorted = [...json.data.fiscalPeriods].sort((a, b) => {
          if (b.fiscalYearTh !== a.fiscalYearTh) return b.fiscalYearTh - a.fiscalYearTh;
          return b.roundNo - a.roundNo;
        });
        setFiscalPeriods(sorted);

        // Auto select active or most recent
        const active = sorted.find((p) => p.isActive);
        if (active) {
          setSelectedPeriodId(active.id);
        } else if (sorted.length > 0 && !selectedPeriodId) {
          setSelectedPeriodId(sorted[0].id);
        }
      }
    } catch (err: any) {
      console.error('[ViewSalaryHistory fetchPeriods Error]', err);
    } finally {
      setLoading(false);
    }
  }, [selectedPeriodId]);

  useEffect(() => {
    fetchPeriods();
  }, [fetchPeriods]);

  // Currently selected fiscal period
  const selectedPeriod = useMemo(() => {
    if (!selectedPeriodId) return fiscalPeriods[0] || null;
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
      if (json.success && json.data) {
        setSalaryRecords(json.data.salaryPromotionRecords || []);
      }
    } catch (err: any) {
      console.error('[ViewSalaryHistory fetchSalaryRecords Error]', err);
    } finally {
      setLoadingSalary(false);
    }
  }, []);

  // Fetch evaluation statuses for selected period
  const fetchEvaluations = useCallback(async (yearTh: number, roundNum: number) => {
    try {
      const res = await fetch(`/api/admin/evaluations?year=${yearTh}&round=${roundNum}`, {
        cache: 'no-store',
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        const map: Record<string, string> = {};
        json.data.forEach((e: any) => {
          map[e.staff_id] = e.status;
        });
        setEvalStatusMap(map);
      }
    } catch (err) {
      console.warn('[fetchEvaluations] error:', err);
    }
  }, []);

  useEffect(() => {
    if (selectedPeriod?.id) {
      fetchSalaryRecords(selectedPeriod.id);
      fetchEvaluations(selectedPeriod.fiscalYearTh, selectedPeriod.roundNo);
    }
  }, [selectedPeriod?.id, selectedPeriod?.fiscalYearTh, selectedPeriod?.roundNo, fetchSalaryRecords, fetchEvaluations]);

  // Filter civil servants strictly: 12 eligible members
  const civilServants = useMemo(() => {
    const filtered = teachers.filter((t) => isCivilServantForSalary(t));
    return sortTeachersByBranch(filtered);
  }, [teachers]);

  // Filter displayed rows based on role (Managers get all, Teachers get ONLY their own row)
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
      setIsSaving(true);
      const res = await fetch('/api/admin/academic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SAVE_SALARY_PROMOTION_RECORD',
          payload: {
            fiscalPeriodId: selectedPeriod.id,
            staffId: record.staffId,
            positionSnapshot: record.positionSnapshot,
            standingSnapshot: record.standingSnapshot,
            salaryBefore: record.calculationBase,
            calculationBase: record.calculationBase,
            promotionPercent: record.promotionPercent,
            salaryAfter: record.salaryAfter,
            orderNo: record.orderNo,
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
    } finally {
      setIsSaving(false);
    }
  };

  // 3-State Round Status evaluation
  const roundStatus: EvaluationRoundStatus = useMemo(() => {
    if (!selectedPeriod) return 'closed';
    if (selectedPeriod.evaluationStatus) return selectedPeriod.evaluationStatus;
    if (selectedPeriod.isLocked) return 'locked';
    if (selectedPeriod.isActive) return 'open';
    return 'closed';
  }, [selectedPeriod]);

  // Handle 3-state round control toggle by Manager
  const handleUpdateRoundStatus = async (newStatus: EvaluationRoundStatus) => {
    if (!selectedPeriod) return;
    try {
      setIsSaving(true);
      const isLocked = newStatus === 'locked';
      const res = await fetch('/api/admin/academic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_FISCAL_PERIOD',
          periodId: selectedPeriod.id,
          updates: {
            evaluationStatus: newStatus,
            isLocked,
          },
        }),
      });
      const json = await res.json();
      if (json.success) {
        setFiscalPeriods((prev) =>
          prev.map((p) =>
            p.id === selectedPeriod.id
              ? { ...p, evaluationStatus: newStatus, isLocked }
              : p
          )
        );
        showToast?.(
          `เปลี่ยนสถานะรอบเป็น "${
            newStatus === 'closed'
              ? 'ปิดรับการประเมิน'
              : newStatus === 'open'
              ? 'เปิดให้ประเมินตนเอง'
              : 'ปิดรอบถาวร'
          }" เรียบร้อยแล้ว`,
          'success'
        );
      } else {
        showToast?.(json.error || 'เกิดข้อผิดพลาดในการอัปเดตสถานะรอบ', 'error');
      }
    } catch (err: any) {
      console.error('[handleUpdateRoundStatus Error]', err);
      showToast?.(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleExpandStaff = (staffId: string) => {
    setExpandedStaffId((prev) => (prev === staffId ? null : staffId));
  };

  // --------------------------------------------------------------------------
  // Access Guard: Block non-eligible support staff
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
              สงวนสิทธิ์เฉพาะข้าราชการและงานบุคคล
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-md mx-auto">
              ระบบการประเมินและเลื่อนเงินเดือนสงวนสิทธิ์เฉพาะตำแหน่งข้าราชการครูและบุคลากรทางการศึกษาตามมาตรฐาน ก.ค.ศ.
              บุคลากรประเภทลูกจ้างชั่วคราวและจ้างเหมาบริการไม่อยู่ในข่ายได้รับการประเมินในระบบนี้
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
                  การเลื่อนเงินเดือน
                </h2>
                <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  ข้าราชการครู {civilServants.length} ท่าน
                </span>
                {!isAuthorizedManager && (
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                    โหมดดูข้อมูลเฉพาะตนเอง
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                การประเมินผลการปฏิบัติงานและเลื่อนเงินเดือนข้าราชการครูและบุคลากรทางการศึกษา ตามหลักเกณฑ์ ว 15/2561
              </p>
            </div>
          </div>
        </div>

        {/* Right side controls: 3-State Round Control + PDPA Masking */}
        <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap shrink-0">
          {/* 3-State Evaluation Round Control */}
          {isAuthorizedManager ? (
            <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
              <button
                type="button"
                disabled={isSaving || !selectedPeriod}
                onClick={() => handleUpdateRoundStatus('closed')}
                className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                  roundStatus === 'closed'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                title="ปิดรับการประเมิน (ครูยังประเมินไม่ได้)"
              >
                ปิดรับการประเมิน
              </button>
              <button
                type="button"
                disabled={isSaving || !selectedPeriod}
                onClick={() => handleUpdateRoundStatus('open')}
                className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                  roundStatus === 'open'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400'
                }`}
                title="เปิดให้ประเมินตนเอง (ครูสามารถเข้าประเมินตนเองได้)"
              >
                เปิดให้ประเมินตนเอง
              </button>
              <button
                type="button"
                disabled={isSaving || !selectedPeriod}
                onClick={() => handleUpdateRoundStatus('locked')}
                className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                  roundStatus === 'locked'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400'
                }`}
                title="ปิดรอบถาวร (อ่านอย่างเดียว)"
              >
                ปิดรอบถาวร
              </button>
            </div>
          ) : (
            <span className="text-xs px-2.5 py-1 rounded-md font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              {roundStatus === 'open'
                ? 'เปิดให้ประเมินตนเอง'
                : roundStatus === 'locked'
                ? 'ปิดรอบแล้ว'
                : 'รอเปิดรอบประเมิน'}
            </span>
          )}

          {/* PDPA Masking Button */}
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
            <span className="text-[11px] font-medium">สถานะรอบประเมิน</span>
            {roundStatus === 'locked' ? (
              <Lock className="w-4 h-4 text-amber-500" />
            ) : roundStatus === 'open' ? (
              <Unlock className="w-4 h-4 text-emerald-500" />
            ) : (
              <Lock className="w-4 h-4 text-slate-400" />
            )}
          </div>
          <div className="text-sm font-semibold text-slate-900 dark:text-white">
            {roundStatus === 'open'
              ? 'เปิดให้ประเมินตนเอง'
              : roundStatus === 'locked'
              ? 'ปิดรอบถาวร'
              : 'ปิดรับการประเมิน'}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {roundStatus === 'open'
              ? 'ครูสามารถบันทึกแบบประเมินตนเองได้'
              : roundStatus === 'locked'
              ? 'ประวัติศาสตร์แบบอ่านอย่างเดียว'
              : 'รอผู้บริหารเปิดรอบประเมิน'}
          </p>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 4. Expandable Master-Detail Salary Promotion Table                  */}
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
                  <th className="py-2.5 px-3 font-semibold min-w-[200px]">ชื่อ - สกุล</th>
                  <th className="py-2.5 px-3 font-semibold min-w-[200px]">ตำแหน่ง / วิทยฐานะ</th>
                  <th className="py-2.5 px-3 font-semibold text-center w-28">สถานะ</th>
                  <th className="py-2.5 px-3 font-semibold text-right w-44">ดำเนินการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
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

                  const isExpanded = expandedStaffId === teacher.id;

                  return (
                    <SalaryPromotionMasterRow
                      key={teacher.id}
                      index={idx + 1}
                      teacher={teacher}
                      record={record}
                      isExpanded={isExpanded}
                      isMasked={isMasked}
                      isLocked={Boolean(selectedPeriod?.isLocked)}
                      canEdit={isAuthorizedManager}
                      roundStatus={roundStatus}
                      onToggleExpand={() => toggleExpandStaff(teacher.id)}
                      onSave={handleSaveRecord}
                      onOpenSelfEval={() => setSelfEvalTeacher(teacher)}
                      onPrintA4={() => setPrintRecordData({ teacher, record })}
                      evaluationStatus={evalStatusMap[teacher.id] || evalStatusMap[teacher.employeeCode]}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 5. Modal: แบบประเมินตนเองและผู้บังคับบัญชา (Evaluation Workspace)     */}
      {/* ------------------------------------------------------------------ */}
      {selfEvalTeacher && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-50 dark:bg-[#0f172a] overflow-y-auto">
          <EvaluationWorkspace
            staffId={selfEvalTeacher.id}
            fiscalYear={selectedPeriod?.fiscalYearTh || 2570}
            roundNumber={selectedPeriod?.roundNo || 1}
            currentUser={currentUser}
            onClose={() => setSelfEvalTeacher(null)}
            onSaved={(updatedStatus) => {
              setEvalStatusMap((prev) => ({
                ...prev,
                [selfEvalTeacher.id]: updatedStatus,
                [selfEvalTeacher.employeeCode]: updatedStatus,
              }));
              showToast?.('บันทึกผลการประเมินเรียบร้อยแล้ว', 'success');
            }}
          />
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 6. Modal: พิมพ์รายงานผลการประเมิน A4                                 */}
      {/* ------------------------------------------------------------------ */}
      {printRecordData && selectedPeriod && (
        <EvaluationA4PrintDocument
          staffId={printRecordData.teacher.id}
          fiscalYear={selectedPeriod.fiscalYearTh}
          roundNumber={selectedPeriod.roundNo}
          onClose={() => setPrintRecordData(null)}
        />
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Subcomponent: SalaryPromotionMasterRow (Expandable Master-Detail)
// ----------------------------------------------------------------------------
interface SalaryPromotionMasterRowProps {
  index: number;
  teacher: TeacherRecord;
  record: SalaryPromotionRecord | Partial<SalaryPromotionRecord> & { staffId: string };
  isExpanded: boolean;
  isMasked: boolean;
  isLocked: boolean;
  canEdit: boolean;
  roundStatus: EvaluationRoundStatus;
  onToggleExpand: () => void;
  onSave: (record: Partial<SalaryPromotionRecord> & { staffId: string }) => void;
  onOpenSelfEval: () => void;
  onPrintA4: () => void;
  evaluationStatus?: string;
}

function SalaryPromotionMasterRow({
  index,
  teacher,
  record,
  isExpanded,
  isMasked,
  isLocked,
  canEdit,
  roundStatus,
  onToggleExpand,
  onSave,
  onOpenSelfEval,
  onPrintA4,
  evaluationStatus,
}: SalaryPromotionMasterRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    positionSnapshot: record.positionSnapshot || teacher.position || '',
    standingSnapshot: record.standingSnapshot || teacher.academicStanding || '-',
    calculationBase: Number(record.calculationBase || (teacher as any).salary || 0),
    promotionPercent: Number(record.promotionPercent || 0),
    salaryAfter: Number(record.salaryAfter || (teacher as any).salary || 0),
    orderNo: record.orderNo || '',
  });

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

  const displayName = formatStaffName(teacher);

  // Status Check
  const pct = Number(record.promotionPercent || 0);
  const hasOrder = Boolean(record.orderNo && record.orderNo.trim() !== '');
  const currentStatus = evaluationStatus || (record as any).evalStatus;
  const isEvaluated =
    currentStatus === 'evaluated' ||
    currentStatus === 'acknowledged' ||
    currentStatus === 'self_submitted' ||
    pct > 0 ||
    hasOrder;

  // RBAC for Evaluation Button:
  // - Authorized Managers: Always enabled (preview/evaluate)
  // - Teachers: Disabled with tooltip when closed or locked
  const isTeacher = !canEdit;
  const isEvalDisabled = isTeacher && (roundStatus === 'closed' || roundStatus === 'locked');
  const evalTooltip =
    isTeacher && roundStatus === 'closed'
      ? 'รอผู้บริหารเปิดรอบประเมิน'
      : isTeacher && roundStatus === 'locked'
      ? 'ปิดรอบแล้ว'
      : 'ประเมิน';

  // Computed financial figures
  const currentBase = Number(record.calculationBase || (teacher as any).salary || 0);
  const currentPct = Number(record.promotionPercent || 0);
  const currentIncrease = Math.round((currentBase * currentPct) / 100);
  const currentNewSalary = Number(record.salaryAfter || currentBase + currentIncrease);

  const handleSaveEdit = () => {
    onSave({
      staffId: record.staffId,
      positionSnapshot: form.positionSnapshot,
      standingSnapshot: form.standingSnapshot,
      calculationBase: Number(form.calculationBase),
      promotionPercent: Number(form.promotionPercent),
      salaryAfter: Number(form.salaryAfter),
      orderNo: form.orderNo,
    });
    setIsEditing(false);
  };

  const editIncrease = Math.round((Number(form.calculationBase) * Number(form.promotionPercent)) / 100);

  return (
    <>
      {/* ------------------------------------------------------------------ */}
      {/* MASTER ROW (Always Visible — Single-Line, Zero-Clutter)           */}
      {/* ------------------------------------------------------------------ */}
      <tr
        onClick={onToggleExpand}
        className={`cursor-pointer transition-colors ${
          isExpanded
            ? 'bg-sky-50/60 dark:bg-sky-950/20'
            : 'hover:bg-slate-100/70 dark:hover:bg-slate-800/40'
        }`}
      >
        {/* 1. Chevron + Sequence */}
        <td className="py-2.5 px-3 text-center text-slate-400 font-mono">
          <div className="flex items-center justify-center gap-1">
            <span className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </span>
            <span>{index}</span>
          </div>
        </td>

        {/* 2. Full Name ONLY (No pills, no floating locks) */}
        <td className="py-2.5 px-3">
          <span className="font-medium text-slate-900 dark:text-white whitespace-nowrap">
            {displayName}
          </span>
        </td>

        {/* 3. Position & Academic Standing (Clean single line, no background pills) */}
        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 truncate whitespace-nowrap">
          <span>{record.positionSnapshot || teacher.position || '-'}</span>
          {(record.standingSnapshot || teacher.academicStanding) &&
            (record.standingSnapshot || teacher.academicStanding) !== '-' && (
              <span className="text-slate-400 dark:text-slate-500 ml-1.5">
                · {record.standingSnapshot || teacher.academicStanding}
              </span>
            )}
        </td>

        {/* 4. Evaluation Status (Icon Only) */}
        <td className="py-2.5 px-3 text-center whitespace-nowrap">
          {isEvaluated ? (
            <span title="ประเมินแล้ว" className="inline-flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </span>
          ) : (
            <span title="ยังไม่ประเมิน" className="inline-flex items-center justify-center">
              <XCircle className="w-4 h-4 text-slate-400/60 dark:text-slate-500/60" />
            </span>
          )}
        </td>

        {/* 5. Action Buttons (Single Right-Aligned Row) */}
        <td
          className="py-2.5 px-3 text-right whitespace-nowrap"
          onClick={(e) => e.stopPropagation()} // Prevent row expand toggle when clicking buttons
        >
          <div className="flex items-center justify-end gap-2 whitespace-nowrap shrink-0">
            {/* Aligned Lock/Unlock icon */}
            <span
              title={
                isLocked || roundStatus === 'locked'
                  ? 'ปิดรอบถาวร'
                  : roundStatus === 'closed'
                  ? 'ปิดรับการประเมิน'
                  : 'เปิดให้ประเมินตนเอง'
              }
              className="text-slate-400 dark:text-slate-500 shrink-0"
            >
              {isLocked || roundStatus === 'locked' || roundStatus === 'closed' ? (
                <Lock className="w-3.5 h-3.5" />
              ) : (
                <Unlock className="w-3.5 h-3.5" />
              )}
            </span>

            {/* Compact flat button: "ประเมิน" */}
            <button
              type="button"
              disabled={isEvalDisabled}
              onClick={onOpenSelfEval}
              title={evalTooltip}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                isEvalDisabled
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-60'
                  : 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/50 border border-sky-200 dark:border-sky-800 cursor-pointer'
              }`}
            >
              ประเมิน
            </button>

            {/* Icon-only Print A4 button */}
            <button
              type="button"
              onClick={onPrintA4}
              title="พิมพ์แบบประเมิน A4"
              className="p-1.5 rounded-md border transition-colors bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 whitespace-nowrap cursor-pointer shrink-0"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </td>
      </tr>

      {/* ------------------------------------------------------------------ */}
      {/* EXPANDED DETAIL PANEL (Revealed on Row Click)                      */}
      {/* ------------------------------------------------------------------ */}
      {isExpanded && (
        <tr className="bg-slate-50/70 dark:bg-slate-900/50 border-b border-slate-200/80 dark:border-slate-800">
          <td colSpan={5} className="p-4 sm:p-5">
            <div className="space-y-4">
              {/* Detail Header with Staff Code & Info */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {displayName}
                  </span>
                  <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-slate-200/70 dark:bg-slate-800 px-2 py-0.5 rounded">
                    รหัสบุคลากร: {teacher.employeeCode || teacher.id}
                  </span>
                </div>
              </div>
              {/* Financial & Order 5-Column Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {/* 1. Calculation Base */}
                <div className="bg-white dark:bg-[#121822] p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 block mb-1">
                    ฐานคำนวณ (บาท)
                  </span>
                  <div className="text-sm font-bold font-mono text-slate-900 dark:text-white">
                    {isMasked ? (
                      <span className="text-slate-400 tracking-wider">••••••</span>
                    ) : currentBase > 0 ? (
                      `${currentBase.toLocaleString()} บาท`
                    ) : (
                      '-'
                    )}
                  </div>
                </div>

                {/* 2. Promotion Percent */}
                <div className="bg-white dark:bg-[#121822] p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 block mb-1">
                    ร้อยละที่ได้เลื่อน
                  </span>
                  <div className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    {isMasked ? (
                      <span className="text-slate-400 tracking-wider">•••</span>
                    ) : currentPct > 0 ? (
                      `${currentPct.toFixed(2)}%`
                    ) : (
                      '-'
                    )}
                  </div>
                </div>

                {/* 3. Increase Amount */}
                <div className="bg-white dark:bg-[#121822] p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 block mb-1">
                    จำนวนเงินที่ได้เลื่อน
                  </span>
                  <div className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    {isMasked ? (
                      <span className="text-slate-400 tracking-wider">••••</span>
                    ) : currentIncrease > 0 ? (
                      `+${currentIncrease.toLocaleString()} บาท`
                    ) : (
                      '-'
                    )}
                  </div>
                </div>

                {/* 4. New Salary */}
                <div className="bg-white dark:bg-[#121822] p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 block mb-1">
                    เงินเดือนใหม่ (บาท)
                  </span>
                  <div className="text-sm font-bold font-mono text-slate-900 dark:text-white">
                    {isMasked ? (
                      <span className="text-slate-400 tracking-wider">••••••</span>
                    ) : currentNewSalary > 0 ? (
                      `${currentNewSalary.toLocaleString()} บาท`
                    ) : (
                      '-'
                    )}
                  </div>
                </div>

                {/* 5. Order Number */}
                <div className="bg-white dark:bg-[#121822] p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 block mb-1">
                    เลขที่คำสั่ง
                  </span>
                  <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 truncate">
                    {record.orderNo || '-'}
                  </div>
                </div>
              </div>

              {/* Action Bar & Inline Edit Controls */}
              {isEditing && !isLocked && canEdit ? (
                <div className="bg-white dark:bg-[#121822] p-4 rounded-xl border border-sky-300 dark:border-sky-800/80 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                    <span className="font-semibold text-xs text-sky-700 dark:text-sky-300 flex items-center gap-1.5">
                      <Pencil className="w-3.5 h-3.5" />
                      <span>แก้ไขข้อมูลเลื่อนเงินเดือน: {displayName}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-slate-500 dark:text-slate-400 text-[11px] mb-1">
                        ฐานคำนวณ (บาท)
                      </label>
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
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-500 dark:text-slate-400 text-[11px] mb-1">
                        ร้อยละที่ได้เลื่อน (%)
                      </label>
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
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-500 dark:text-slate-400 text-[11px] mb-1">
                        เงินเดือนใหม่ (บาท)
                      </label>
                      <input
                        type="number"
                        value={form.salaryAfter || ''}
                        onChange={(e) =>
                          setForm({ ...form, salaryAfter: parseFloat(e.target.value) || 0 })
                        }
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-500 dark:text-slate-400 text-[11px] mb-1">
                        เลขที่คำสั่ง
                      </label>
                      <input
                        type="text"
                        value={form.orderNo}
                        placeholder="เช่น ศธ 04123/2570"
                        onChange={(e) => setForm({ ...form, orderNo: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
                    <span className="text-[11px] text-slate-500 font-mono">
                      จำนวนเงินที่ได้เลื่อนโดยประมาณ: +{editIncrease.toLocaleString()} บาท
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium"
                      >
                        ยกเลิก
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveEdit}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>บันทึกการแก้ไข</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between text-xs pt-1">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                    <span>ฝ่ายงาน: {teacher.department || '-'}</span>
                    <span>·</span>
                    <span>ตำแหน่งทางการ: {record.positionSnapshot || teacher.position}</span>
                  </div>

                  {canEdit && (
                    <button
                      type="button"
                      disabled={isLocked}
                      onClick={() => setIsEditing(true)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        isLocked
                          ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
                          : 'bg-white dark:bg-slate-800 text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/40 border-slate-200 dark:border-slate-700 shadow-xs'
                      }`}
                      title={isLocked ? 'รอบนี้ถูกล็อกแล้ว ไม่สามารถแก้ไขได้' : 'แก้ไขข้อมูลเลื่อนเงินเดือน'}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>แก้ไขข้อมูลเลื่อนเงินเดือน</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
