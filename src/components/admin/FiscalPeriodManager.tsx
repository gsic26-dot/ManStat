'use client';

/**
 * ============================================================================
 * ManStat-Modern: Fiscal Period & Salary Promotion Manager
 * ============================================================================
 * Strict Minimal & Clean Standard:
 * - Clean selector: "ปีงบฯ 2570 · 1 ต.ค. – 31 มี.ค." or "ปีงบฯ 2570 · 1 เม.ย. – 30 ก.ย." (Emerald green active state)
 * - 1-line clean census snapshot reference: "อ้างอิงยอดนักเรียน: 10 มิ.ย. 2569"
 * - Round locking (is_locked) disables editing when orders are finalized
 * - Immutable salary snapshots per round (protecting historic data)
 * ============================================================================
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calendar,
  Lock,
  Unlock,
  Plus,
  Save,
  Users,
  Check,
  ChevronDown,
  Loader2,
  AlertCircle,
  FileText,
} from 'lucide-react';
import type {
  FiscalPeriodRecord,
  SalaryPromotionRecord,
  StudentCensusSnapshotRecord,
  TeacherRecord,
} from '@/lib/data/schoolData';
import { ThaiDatePicker } from '@/components/ui/ThaiDatePicker';

interface FiscalPeriodManagerProps {
  schoolId?: string;
  teachers?: TeacherRecord[];
  onPeriodChange?: (activeFiscalYear: number) => void;
  showToast: (msg: string, type: 'success' | 'error') => void;
}

export function FiscalPeriodManager({
  schoolId = '30030099',
  teachers = [],
  onPeriodChange,
  showToast,
}: FiscalPeriodManagerProps) {
  const [fiscalPeriods, setFiscalPeriods] = useState<FiscalPeriodRecord[]>([]);
  const [censusSnapshots, setCensusSnapshots] = useState<StudentCensusSnapshotRecord[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  const [salaryRecords, setSalaryRecords] = useState<SalaryPromotionRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingSalary, setLoadingSalary] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Modal / Confirm state for activating period
  const [confirmModalPeriod, setConfirmModalPeriod] = useState<FiscalPeriodRecord | null>(null);

  // Fetch fiscal periods & available census snapshots
  const fetchPeriods = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/academic?schoolId=${encodeURIComponent(schoolId)}`, {
        cache: 'no-store',
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'ไม่สามารถโหลดข้อมูลรอบปีงบประมาณได้');
      }

      const periods: FiscalPeriodRecord[] = json.data.fiscalPeriods || [];
      const snaps: StudentCensusSnapshotRecord[] = json.data.censusSnapshots || [];

      setFiscalPeriods(periods);
      setCensusSnapshots(snaps);

      // Select active period by default
      setSelectedPeriodId((prev) => {
        if (prev && periods.some((p) => p.id === prev)) return prev;
        const active = periods.find((p) => p.isActive);
        return active ? active.id : periods[0]?.id || null;
      });

      const activePeriod = periods.find((p) => p.isActive);
      if (activePeriod && onPeriodChange) {
        onPeriodChange(activePeriod.fiscalYearTh);
      }
    } catch (err: any) {
      console.error('[FiscalPeriodManager fetchPeriods Error]', err);
      showToast(err.message || 'เกิดข้อผิดพลาดในการโหลดรอบปีงบประมาณ', 'error');
    } finally {
      setLoading(false);
    }
  }, [schoolId, onPeriodChange, showToast]);

  useEffect(() => {
    fetchPeriods();
  }, [fetchPeriods]);

  // Selected period object
  const selectedPeriod = useMemo(() => {
    return fiscalPeriods.find((p) => p.id === selectedPeriodId) || fiscalPeriods[0] || null;
  }, [fiscalPeriods, selectedPeriodId]);

  // Fetch salary promotion records for the selected period
  const fetchSalaryRecords = useCallback(
    async (periodId: string) => {
      try {
        setLoadingSalary(true);
        const res = await fetch(
          `/api/admin/academic?schoolId=${encodeURIComponent(schoolId)}&fiscalPeriodId=${encodeURIComponent(periodId)}`,
          { cache: 'no-store' }
        );
        const json = await res.json();
        if (res.ok && json.success) {
          setSalaryRecords(json.data.salaryPromotionRecords || []);
        }
      } catch (err: any) {
        console.error('[fetchSalaryRecords Error]', err);
      } finally {
        setLoadingSalary(false);
      }
    },
    [schoolId]
  );

  useEffect(() => {
    if (selectedPeriod?.id) {
      fetchSalaryRecords(selectedPeriod.id);
    }
  }, [selectedPeriod?.id, fetchSalaryRecords]);

  // Handle switching active period
  const handleConfirmSetActive = async () => {
    if (!confirmModalPeriod) return;
    try {
      setIsSaving(true);
      const res = await fetch('/api/admin/academic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SET_ACTIVE_FISCAL_PERIOD',
          payload: { fiscalPeriodId: confirmModalPeriod.id, schoolId },
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'ไม่สามารถเปลี่ยนรอบปีงบประมาณได้');
      }
      showToast(
        `ตั้งรอบปีงบประมาณ ${confirmModalPeriod.fiscalYearTh} (รอบ ${confirmModalPeriod.roundNo}) เป็นรอบปัจจุบันแล้ว`,
        'success'
      );
      setConfirmModalPeriod(null);
      await fetchPeriods();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle creating next fiscal period
  const handleCreatePeriod = async () => {
    try {
      setIsSaving(true);
      const maxYear =
        fiscalPeriods.length > 0
          ? Math.max(...fiscalPeriods.map((p) => p.fiscalYearTh))
          : 2570;

      // Determine next period: if maxYear has round 1 only, create round 2, else nextYear round 1
      const periodsInMaxYear = fiscalPeriods.filter((p) => p.fiscalYearTh === maxYear);
      let nextYear = maxYear;
      let nextRound: 1 | 2 = 1;

      if (periodsInMaxYear.some((p) => p.roundNo === 1) && !periodsInMaxYear.some((p) => p.roundNo === 2)) {
        nextRound = 2;
      } else {
        nextYear = maxYear + 1;
        nextRound = 1;
      }

      const res = await fetch('/api/admin/academic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE_FISCAL_PERIOD',
          payload: {
            schoolId,
            fiscalYearTh: nextYear,
            roundNo: nextRound,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'ไม่สามารถสร้างรอบปีงบประมาณใหม่ได้');
      }
      showToast(`สร้างรอบปีงบฯ ${nextYear} (${nextRound === 1 ? '1 เม.ย.' : '1 ต.ค.'}) สำเร็จ`, 'success');
      await fetchPeriods();
      if (json.data?.id) {
        setSelectedPeriodId(json.data.id);
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle toggling lock on fiscal period
  const handleTogglePeriodLock = async () => {
    if (!selectedPeriod) return;
    try {
      setIsSaving(true);
      const newLockState = !selectedPeriod.isLocked;
      const res = await fetch('/api/admin/academic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_FISCAL_PERIOD',
          payload: {
            periodId: selectedPeriod.id,
            updates: { isLocked: newLockState },
          },
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'ไม่สามารถเปลี่ยนสถานะล็อกได้');
      }
      showToast(newLockState ? 'ล็อกรอบปีงบประมาณนี้แล้ว' : 'ปลดล็อกรอบปีงบประมาณแล้ว', 'success');
      await fetchPeriods();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle changing referenced student census snapshot
  const handleChangeRefCensus = async (censusId: string) => {
    if (!selectedPeriod) return;
    if (selectedPeriod.isLocked) {
      showToast('รอบนี้ถูกล็อกแล้ว ไม่สามารถเปลี่ยนการอ้างอิงข้อมูลนักเรียนได้', 'error');
      return;
    }
    try {
      const res = await fetch('/api/admin/academic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_FISCAL_PERIOD',
          payload: {
            periodId: selectedPeriod.id,
            updates: { refCensusSnapshotId: censusId || null },
          },
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'ไม่สามารถเปลี่ยนรอบอ้างอิงข้อมูลนักเรียนได้');
      }
      showToast('อัปเดตรอบข้อมูลนักเรียนอ้างอิงแล้ว', 'success');
      await fetchPeriods();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Handle snapshotting all staff for this period
  const handleSnapshotStaff = async () => {
    if (!selectedPeriod) return;
    if (selectedPeriod.isLocked) {
      showToast('รอบนี้ถูกล็อกแล้ว ไม่สามารถบันทึก Snapshot ได้', 'error');
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
      showToast(json.message || 'บันทึก Snapshot บุคลากรสำเร็จ', 'success');
      await fetchSalaryRecords(selectedPeriod.id);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle updating single salary promotion record
  const handleUpdateRecord = async (record: Partial<SalaryPromotionRecord> & { staffId: string }) => {
    if (!selectedPeriod) return;
    if (selectedPeriod.isLocked) {
      showToast('รอบนี้ถูกล็อกแล้ว ไม่สามารถแก้ไขได้', 'error');
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
      showToast('บันทึกข้อมูลสำเร็จ', 'success');
      await fetchSalaryRecords(selectedPeriod.id);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Census snapshot formatted display
  const currentRefCensusText = useMemo(() => {
    if (!selectedPeriod?.refCensusSnapshotId) return 'ยังไม่ได้ระบุ';
    const snap = censusSnapshots.find((s) => s.id === selectedPeriod.refCensusSnapshotId);
    if (!snap) return '10 มิ.ย. 2569';
    const roundName = snap.roundCode === 'JUN_10' ? '10 มิ.ย.' : '10 พ.ย.';
    return `${roundName} · นักเรียน ${snap.totalStudents} คน`;
  }, [selectedPeriod, censusSnapshots]);

  if (loading && fiscalPeriods.length === 0) {
    return (
      <div className="py-6 flex items-center justify-center gap-2 text-slate-400">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-xs">กำลังโหลดรอบปีงบประมาณ...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ------------------------------------------------------------------ */}
      {/* 1. Fiscal Period Selector Header                                   */}
      {/* ------------------------------------------------------------------ */}
      <div className="bg-white dark:bg-[#111822] p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 space-y-3 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2.5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mr-1">
              รอบปีงบประมาณ
            </span>
            {fiscalPeriods.length === 0 ? (
              <span className="text-xs text-slate-400 py-1 px-2">ยังไม่มีข้อมูลรอบปีงบประมาณ</span>
            ) : (
              <div className="inline-flex flex-wrap rounded-xl bg-slate-100 dark:bg-slate-800/80 p-0.5 border border-slate-200/60 dark:border-slate-700/60 gap-1">
                {fiscalPeriods.map((period) => {
                  const isViewing = period.id === selectedPeriod?.id;
                  const isActive = Boolean(period.isActive);
                  const roundDates = period.roundNo === 1 ? '1 ต.ค. – 31 มี.ค.' : '1 เม.ย. – 30 ก.ย.';

                  let btnClass = 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800';
                  if (isActive) {
                    if (isViewing) {
                      btnClass = 'bg-emerald-600 text-white font-semibold shadow-xs ring-2 ring-emerald-400/50 dark:ring-emerald-500/40';
                    } else {
                      btnClass = 'bg-emerald-600/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/40 font-medium hover:bg-emerald-600/25';
                    }
                  } else if (isViewing) {
                    btnClass = 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold ring-1 ring-sky-500 dark:ring-sky-400';
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

            {/* Active status or Activate button */}
            {selectedPeriod?.isActive ? (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium px-2 py-1">
                <Check className="w-3.5 h-3.5" />
                <span>ใช้งานอยู่</span>
              </span>
            ) : selectedPeriod ? (
              <button
                type="button"
                onClick={() => setConfirmModalPeriod(selectedPeriod)}
                className="inline-flex items-center gap-1 text-xs text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 hover:underline px-2 py-1 font-medium transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                <span>ตั้งเป็นรอบปัจจุบัน</span>
              </button>
            ) : null}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {selectedPeriod && (
              <button
                type="button"
                onClick={handleTogglePeriodLock}
                title={selectedPeriod.isLocked ? 'ปลดล็อกรอบ' : 'ล็อกรอบ'}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  selectedPeriod.isLocked
                    ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                }`}
              >
                {selectedPeriod.isLocked ? (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>ล็อกรอบแล้ว</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-3.5 h-3.5" />
                    <span>ล็อกรอบ</span>
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={handleCreatePeriod}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>เพิ่มรอบปีงบประมาณ</span>
            </button>
          </div>
        </div>

        {/* 1-Line Clean Referenced Census Snapshot Display & Selection */}
        {selectedPeriod && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">การประเมิน:</span>
              <span className="font-mono text-slate-800 dark:text-slate-200">
                {selectedPeriod.roundNo === 1
                  ? `1 ต.ค. ${selectedPeriod.fiscalYearTh - 1} – 31 มี.ค. ${selectedPeriod.fiscalYearTh}`
                  : `1 เม.ย. ${selectedPeriod.fiscalYearTh} – 30 ก.ย. ${selectedPeriod.fiscalYearTh}`}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400">อ้างอิงยอดนักเรียน:</span>
              <select
                disabled={Boolean(selectedPeriod.isLocked)}
                value={selectedPeriod.refCensusSnapshotId || ''}
                onChange={(e) => handleChangeRefCensus(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-slate-900 dark:text-white font-medium text-xs focus:outline-none disabled:opacity-60"
              >
                <option value="">- เลือกข้อมูลนักเรียนอ้างอิง -</option>
                {censusSnapshots.map((snap) => (
                  <option key={snap.id} value={snap.id}>
                    {snap.roundCode === 'JUN_10' ? '10 มิ.ย.' : '10 พ.ย.'} · นักเรียน {snap.totalStudents} คน
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 2. Staff Salary Promotion Records (Snapshot Per Period)            */}
      {/* ------------------------------------------------------------------ */}
      <div className="bg-white dark:bg-[#111822] rounded-xl border border-slate-200/90 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              บันทึกประวัติการเลื่อนเงินเดือนรายรอบ
            </span>
            <span className="text-xs text-slate-400 font-mono">
              · {salaryRecords.length} คน
            </span>
          </div>

          <div className="flex items-center gap-2">
            {salaryRecords.length === 0 && (
              <button
                type="button"
                disabled={Boolean(selectedPeriod?.isLocked) || isSaving}
                onClick={handleSnapshotStaff}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-sky-600 hover:bg-sky-500 text-white transition-colors disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>บันทึก Snapshot บุคลากรทั้งหมดในรอบนี้</span>
              </button>
            )}
          </div>
        </div>

        {loadingSalary ? (
          <div className="py-8 text-center text-xs text-slate-400">กำลังโหลดข้อมูล...</div>
        ) : salaryRecords.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              ยังไม่มีข้อมูลการเลื่อนเงินเดือนในรอบปีงบประมาณนี้
            </p>
            <p className="text-[11px] text-slate-400">
              คลิกปุ่ม &quot;บันทึก Snapshot บุคลากรทั้งหมดในรอบนี้&quot; ด้านบนเพื่อคัดลอกตำแหน่งและข้อมูลครูปัจจุบันเข้ามายังรอบนี้
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-slate-800/40 text-slate-500 border-b border-slate-200/80 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">ชื่อ - สกุล</th>
                  <th className="py-2.5 px-3 font-semibold">ตำแหน่ง ณ รอบนี้</th>
                  <th className="py-2.5 px-3 font-semibold">วิทยฐานะ ณ รอบนี้</th>
                  <th className="py-2.5 px-3 font-semibold">ฐานคำนวณ</th>
                  <th className="py-2.5 px-3 font-semibold">ร้อยละที่ได้เลื่อน</th>
                  <th className="py-2.5 px-3 font-semibold">เงินเดือนใหม่</th>
                  <th className="py-2.5 px-3 font-semibold">เลขที่คำสั่ง</th>
                  <th className="py-2.5 px-3 font-semibold text-right">ดำเนินการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                {salaryRecords.map((rec) => {
                  const teacher = teachers.find(
                    (t) => t.id === rec.staffId || t.employeeCode === rec.staffId
                  );
                  const displayName = teacher ? teacher.name : rec.staffId;

                  return (
                    <SalaryRowItem
                      key={rec.id || rec.staffId}
                      record={rec}
                      displayName={displayName}
                      isLocked={Boolean(selectedPeriod?.isLocked)}
                      onSave={handleUpdateRecord}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 3. Confirmation Modal for Activating Fiscal Period                 */}
      {/* ------------------------------------------------------------------ */}
      {confirmModalPeriod && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-sm w-full p-5 space-y-4">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              ยืนยันการเปลี่ยนรอบปีงบประมาณ
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              ต้องการตั้งรอบปีงบประมาณ{' '}
              <strong className="text-slate-900 dark:text-white">
                ปีงบฯ {confirmModalPeriod.fiscalYearTh} · {confirmModalPeriod.roundNo === 1 ? '1 ต.ค. – 31 มี.ค.' : '1 เม.ย. – 30 ก.ย.'}
              </strong>{' '}
              เป็นรอบปัจจุบันหรือไม่?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => setConfirmModalPeriod(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleConfirmSetActive}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-sky-600 hover:bg-sky-500 text-white transition-colors"
              >
                {isSaving ? 'กำลังดำเนินการ...' : 'ยืนยัน'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Subcomponent: SalaryRowItem (Inline editing per teacher record)
// ----------------------------------------------------------------------------
interface SalaryRowItemProps {
  record: SalaryPromotionRecord;
  displayName: string;
  isLocked: boolean;
  onSave: (record: Partial<SalaryPromotionRecord> & { staffId: string }) => void;
}

function SalaryRowItem({ record, displayName, isLocked, onSave }: SalaryRowItemProps) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    positionSnapshot: record.positionSnapshot || '',
    standingSnapshot: record.standingSnapshot || '-',
    calculationBase: record.calculationBase || 0,
    promotionPercent: record.promotionPercent || 0,
    salaryAfter: record.salaryAfter || 0,
    orderNo: record.orderNo || '',
  });

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

  if (editing && !isLocked) {
    return (
      <tr className="bg-sky-50/40 dark:bg-sky-950/20">
        <td className="py-2 px-3 font-sans font-medium text-slate-900 dark:text-white">
          {displayName}
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
        <td className="py-2 px-3">
          <input
            type="number"
            value={form.calculationBase || ''}
            onChange={(e) => setForm({ ...form, calculationBase: parseFloat(e.target.value) || 0 })}
            className="w-24 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs font-mono text-slate-900 dark:text-white"
          />
        </td>
        <td className="py-2 px-3">
          <input
            type="number"
            step="0.01"
            value={form.promotionPercent || ''}
            onChange={(e) => {
              const pct = parseFloat(e.target.value) || 0;
              const base = form.calculationBase || 0;
              const increase = (base * pct) / 100;
              setForm({
                ...form,
                promotionPercent: pct,
                salaryAfter: Math.round(base + increase),
              });
            }}
            className="w-20 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs font-mono text-slate-900 dark:text-white"
          />
        </td>
        <td className="py-2 px-3">
          <input
            type="number"
            value={form.salaryAfter || ''}
            onChange={(e) => setForm({ ...form, salaryAfter: parseFloat(e.target.value) || 0 })}
            className="w-28 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs font-mono text-slate-900 dark:text-white"
          />
        </td>
        <td className="py-2 px-3">
          <input
            type="text"
            value={form.orderNo}
            placeholder="เช่น 12/2570"
            onChange={(e) => setForm({ ...form, orderNo: e.target.value })}
            className="w-24 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs font-mono text-slate-900 dark:text-white"
          />
        </td>
        <td className="py-2 px-3 text-right">
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={handleSave}
              className="px-2 py-1 bg-sky-600 text-white rounded text-xs font-sans hover:bg-sky-500"
            >
              บันทึก
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="px-2 py-1 bg-slate-200 dark:bg-slate-700 rounded text-xs font-sans text-slate-700 dark:text-slate-300"
            >
              ยกเลิก
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-850/40 transition-colors">
      <td className="py-2.5 px-3 font-sans font-medium text-slate-900 dark:text-white">
        {displayName}
      </td>
      <td className="py-2.5 px-3 font-sans text-slate-600 dark:text-slate-300">
        {record.positionSnapshot || '-'}
      </td>
      <td className="py-2.5 px-3 font-sans text-slate-600 dark:text-slate-300">
        {record.standingSnapshot || '-'}
      </td>
      <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
        {record.calculationBase > 0 ? record.calculationBase.toLocaleString() : '-'}
      </td>
      <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
        {record.promotionPercent > 0 ? `${record.promotionPercent.toFixed(2)}%` : '-'}
      </td>
      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
        {record.salaryAfter > 0 ? record.salaryAfter.toLocaleString() : '-'}
      </td>
      <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">
        {record.orderNo || '-'}
      </td>
      <td className="py-2.5 px-3 text-right">
        {!isLocked && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs text-sky-600 dark:text-sky-400 hover:underline font-sans"
          >
            แก้ไข
          </button>
        )}
      </td>
    </tr>
  );
}
