'use client';

/**
 * ============================================================================
 * ManStat: Fiscal Period & Evaluation Round Manager (Admin Center)
 * ============================================================================
 * Strict Minimal & Clean Standard:
 * - Clean selector: "ปีงบฯ 2570 · 1 ต.ค. – 31 มี.ค." or "ปีงบฯ 2570 · 1 เม.ย. – 30 ก.ย." (Emerald green active state)
 * - 1-line clean census snapshot reference: "อ้างอิงยอดนักเรียน: 10 มิ.ย. 2569"
 * - Round locking (is_locked) disables editing when orders are finalized
 * - Zero salary promotion bloat (salary history extracted to dedicated HR module)
 * ============================================================================
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Lock,
  Unlock,
  Plus,
  Check,
  Loader2,
} from 'lucide-react';
import type {
  FiscalPeriodRecord,
  StudentCensusSnapshotRecord,
  TeacherRecord,
} from '@/lib/data/schoolData';

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
  const [loading, setLoading] = useState<boolean>(true);
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
      {/* 2. Confirmation Modal for Activating Fiscal Period                 */}
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
