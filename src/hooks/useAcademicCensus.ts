'use client';

/**
 * ============================================================================
 * ManStat: Academic Years & Student Census Custom Hook
 * ============================================================================
 * Hook for managing:
 * - Academic Years (ปีการศึกษา)
 * - Student Census Snapshots (รอบ 10 มิ.ย. และ 10 พ.ย.)
 * - Fiscal Periods (รอบปีงบประมาณ 1 เม.ย. และ 1 ต.ค.)
 * - Difference calculation between rounds (+2, -1, 0)
 * - Strict Lock Guard enforcement
 * ============================================================================
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import type {
  AcademicYearRecord,
  StudentCensusSnapshotRecord,
  FiscalPeriodRecord,
  CensusDiffResult,
} from '@/lib/data/schoolData';
import { calculateCensusDiff } from '@/lib/supabase/queries';

export interface UseAcademicCensusReturn {
  academicYears: AcademicYearRecord[];
  activeAcademicYear: AcademicYearRecord | null;
  selectedYear: AcademicYearRecord | null;
  selectedYearId: string | null;
  setSelectedYearId: (id: string) => void;
  censusSnapshots: StudentCensusSnapshotRecord[];
  primarySnapshot: StudentCensusSnapshotRecord | null;
  fiscalPeriods: FiscalPeriodRecord[];
  activeFiscalPeriod: FiscalPeriodRecord | null;
  censusDiff: CensusDiffResult;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  setActiveYear: (yearId: string) => Promise<boolean>;
  createYear: (yearTh: number) => Promise<string>;
  deleteYear: (yearId: string, password: string) => Promise<boolean>;
  updateOfferedGrades: (yearId: string, offeredGrades: string[]) => Promise<boolean>;
  updateSnapshot: (
    snapshot: Partial<StudentCensusSnapshotRecord> & { id: string }
  ) => Promise<boolean>;
  setPrimaryRound: (academicYearId: string, snapshotId: string) => Promise<boolean>;
  toggleLock: (snapshotId: string, isLocked: boolean) => Promise<boolean>;
  setActiveFiscalPeriod: (fiscalPeriodId: string) => Promise<boolean>;
}

export function useAcademicCensus(schoolId: string = '30030099'): UseAcademicCensusReturn {
  const [academicYears, setAcademicYears] = useState<AcademicYearRecord[]>([]);
  const [allSnapshots, setAllSnapshots] = useState<StudentCensusSnapshotRecord[]>([]);
  const [fiscalPeriods, setFiscalPeriods] = useState<FiscalPeriodRecord[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/admin/academic?schoolId=${encodeURIComponent(schoolId)}`, {
        cache: 'no-store',
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'ไม่สามารถโหลดข้อมูลปีการศึกษาและรอบนักเรียนได้');
      }

      const years: AcademicYearRecord[] = json.data.academicYears || [];
      const snaps: StudentCensusSnapshotRecord[] = json.data.censusSnapshots || [];
      const periods: FiscalPeriodRecord[] = json.data.fiscalPeriods || [];

      setAcademicYears(years);
      setAllSnapshots(snaps);
      setFiscalPeriods(periods);

      // Default selectedYearId to the active year if not yet set
      setSelectedYearId((prev) => {
        if (prev && years.some((y) => y.id === prev)) return prev;
        const active = years.find((y) => y.isActive);
        return active ? active.id : years[0]?.id || null;
      });
    } catch (err: any) {
      console.error('[useAcademicCensus Error]', err);
      setError(err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Derived: Active Academic Year
  const activeAcademicYear = useMemo(() => {
    return academicYears.find((y) => y.isActive) || null;
  }, [academicYears]);

  // Derived: Selected Academic Year
  const selectedYear = useMemo(() => {
    return academicYears.find((y) => y.id === selectedYearId) || activeAcademicYear;
  }, [academicYears, selectedYearId, activeAcademicYear]);

  // Derived: Snapshots for the currently selected academic year
  const censusSnapshots = useMemo(() => {
    if (!selectedYear) return [];
    return allSnapshots.filter((s) => s.academicYearId === selectedYear.id);
  }, [allSnapshots, selectedYear]);

  // Derived: Primary snapshot for manpower calculation
  const primarySnapshot = useMemo(() => {
    return censusSnapshots.find((s) => s.isPrimaryForManpower) || censusSnapshots[0] || null;
  }, [censusSnapshots]);

  // Derived: Active Fiscal Period
  const activeFiscalPeriod = useMemo(() => {
    return fiscalPeriods.find((p) => p.isActive) || null;
  }, [fiscalPeriods]);

  // Derived: Difference between Nov 10 and Jun 10
  const censusDiff = useMemo(() => {
    return calculateCensusDiff(censusSnapshots);
  }, [censusSnapshots]);

  // Action: Set Active Academic Year
  const setActiveYear = useCallback(
    async (yearId: string): Promise<boolean> => {
      try {
        setError(null);
        const res = await fetch('/api/admin/academic', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'SET_ACTIVE_YEAR',
            payload: { yearId, schoolId },
          }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'ไม่สามารถตั้งปีการศึกษาที่ใช้งานได้');
        }
        await fetchData();
        return true;
      } catch (err: any) {
        setError(err.message);
        throw err;
      }
    },
    [schoolId, fetchData]
  );

  // Action: Create Academic Year With Defaults
  const createYear = useCallback(
    async (yearTh: number): Promise<string> => {
      try {
        setError(null);
        const res = await fetch('/api/admin/academic', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'CREATE_YEAR',
            payload: { yearTh, schoolId },
          }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'ไม่สามารถสร้างปีการศึกษาใหม่ได้');
        }
        await fetchData();
        const newId = json.data?.id || `ay-${yearTh}`;
        setSelectedYearId(newId);
        return newId;
      } catch (err: any) {
        setError(err.message);
        throw err;
      }
    },
    [schoolId, fetchData]
  );

  // Action: Delete Academic Year (Requires typing the exact Buddhist year to confirm)
  const deleteYear = useCallback(
    async (yearId: string, confirmYearTh: string): Promise<boolean> => {
      try {
        setError(null);
        const res = await fetch('/api/admin/academic', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'DELETE_YEAR',
            payload: { yearId, confirmYearTh, schoolId },
          }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'ไม่สามารถลบปีการศึกษาได้');
        }
        await fetchData();
        // Switch to active year
        const active = academicYears.find((y) => y.isActive && y.id !== yearId);
        if (active) {
          setSelectedYearId(active.id);
        }
        return true;
      } catch (err: any) {
        setError(err.message);
        throw err;
      }
    },
    [schoolId, academicYears, fetchData]
  );

  // Action: Update Offered Grades for Academic Year
  const updateOfferedGrades = useCallback(
    async (yearId: string, offeredGrades: string[]): Promise<boolean> => {
      try {
        setError(null);
        // Optimistically update local academicYears state
        setAcademicYears((prev) =>
          prev.map((y) => (y.id === yearId ? { ...y, offeredGrades } : y))
        );

        const res = await fetch('/api/admin/academic', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'UPDATE_OFFERED_GRADES',
            payload: { yearId, offeredGrades, schoolId },
          }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'ไม่สามารถบันทึกระดับชั้นที่เปิดสอนได้');
        }
        return true;
      } catch (err: any) {
        setError(err.message);
        throw err;
      }
    },
    [schoolId]
  );

  // Action: Update Census Snapshot (Subject to Lock Guard)
  const updateSnapshot = useCallback(
    async (
      snapshot: Partial<StudentCensusSnapshotRecord> & { id: string }
    ): Promise<boolean> => {
      try {
        setError(null);
        const target = allSnapshots.find((s) => s.id === snapshot.id);
        if (target?.isLocked && snapshot.isLocked === undefined) {
          throw new Error('ข้อมูลรอบนี้ถูกล็อกไว้แล้ว ไม่สามารถแก้ไขได้ กรุณาปลดล็อกก่อนดำเนินการ (Data is locked)');
        }

        const res = await fetch('/api/admin/academic', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'UPDATE_SNAPSHOT',
            payload: { snapshot },
          }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'ไม่สามารถบันทึกข้อมูลรอบนักเรียนได้');
        }
        await fetchData();
        return true;
      } catch (err: any) {
        setError(err.message);
        throw err;
      }
    },
    [allSnapshots, fetchData]
  );

  // Action: Set Primary Census Round
  const setPrimaryRound = useCallback(
    async (academicYearId: string, snapshotId: string): Promise<boolean> => {
      try {
        setError(null);
        const res = await fetch('/api/admin/academic', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'SET_PRIMARY_ROUND',
            payload: { academicYearId, snapshotId },
          }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'ไม่สามารถตั้งรอบหลักได้');
        }
        await fetchData();
        return true;
      } catch (err: any) {
        setError(err.message);
        throw err;
      }
    },
    [fetchData]
  );

  // Action: Toggle Lock
  const toggleLock = useCallback(
    async (snapshotId: string, isLocked: boolean): Promise<boolean> => {
      try {
        setError(null);
        const res = await fetch('/api/admin/academic', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'TOGGLE_LOCK',
            payload: { snapshotId, isLocked },
          }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'ไม่สามารถเปลี่ยนสถานะล็อกได้');
        }
        await fetchData();
        return true;
      } catch (err: any) {
        setError(err.message);
        throw err;
      }
    },
    [fetchData]
  );

  // Action: Set Active Fiscal Period
  const setActiveFiscalPeriod = useCallback(
    async (fiscalPeriodId: string): Promise<boolean> => {
      try {
        setError(null);
        const res = await fetch('/api/admin/academic', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'SET_ACTIVE_FISCAL_PERIOD',
            payload: { fiscalPeriodId, schoolId },
          }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'ไม่สามารถเปลี่ยนรอบปีงบประมาณได้');
        }
        await fetchData();
        return true;
      } catch (err: any) {
        setError(err.message);
        throw err;
      }
    },
    [schoolId, fetchData]
  );

  return {
    academicYears,
    activeAcademicYear,
    selectedYear,
    selectedYearId,
    setSelectedYearId,
    censusSnapshots,
    primarySnapshot,
    fiscalPeriods,
    activeFiscalPeriod,
    censusDiff,
    loading,
    error,
    refresh: fetchData,
    setActiveYear,
    createYear,
    deleteYear,
    updateOfferedGrades,
    updateSnapshot,
    setPrimaryRound,
    toggleLock,
    setActiveFiscalPeriod,
  };
}
