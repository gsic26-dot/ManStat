'use client';

/**
 * ============================================================================
 * ManStat: ViewLeaveAnalytics (กราฟและสถิติภาพรวมการลา)
 * ============================================================================
 * - Fiscal year leave trends (ตุลาคม - กันยายน)
 * - Leave type distribution (Sick, Personal, Vacation)
 * - Department-by-department comparisons
 * - High-risk personnel radar (approaching legal caps)
 * - Zero Emojis, Pure Lucide SVG Icons, 8px Standard Spacing
 * ============================================================================
 */

import { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  BarChart3,
  PieChart,
  Calendar,
  Award,
  CheckCircle2,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { TeacherRecord, LeaveRequestRecord } from '@/lib/data/schoolData';
import { getFiscalYearBE, getEvalRound } from '@/lib/regulations/fiscal-and-retirement';

export function ViewLeaveAnalytics() {
  const [fiscalYear, setFiscalYear] = useState('2570');
  const [selectedSemester, setSelectedSemester] = useState<'ALL' | 'H1' | 'H2'>('ALL');
  const [teachers, setTeachers] = useState<TeacherRecord[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestRecord[]>([]);

  useEffect(() => {
    let isMounted = true;
    fetch('/api/admin/staff', { cache: 'no-store' })
      .then((r) => r.json())
      .then((res) => {
        if (isMounted && res.success && Array.isArray(res.data) && res.data.length > 0) {
          setTeachers(res.data);
        }
      })
      .catch(() => {});

    fetch('/api/admin/leave', { cache: 'no-store' })
      .then((r) => r.json())
      .then((res) => {
        if (isMounted && res.success && Array.isArray(res.data)) {
          setLeaveRequests(res.data);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  // Filter approved leave requests by selected fiscalYear and selectedSemester
  const filteredApprovedLeaves = useMemo(() => {
    const targetFY = Number(fiscalYear);
    return leaveRequests.filter((r) => {
      if (r.status !== 'approved') return false;
      if (!r.startDate) return false;
      if (getFiscalYearBE(r.startDate) !== targetFY) return false;
      if (selectedSemester === 'H1' && getEvalRound(r.startDate) !== 1) return false;
      if (selectedSemester === 'H2' && getEvalRound(r.startDate) !== 2) return false;
      return true;
    });
  }, [leaveRequests, fiscalYear, selectedSemester]);

  const isSick = (r: LeaveRequestRecord) =>
    r.leaveType === 'sick' || String(r.leaveTypeName || r.leaveType || '').includes('ป่วย');
  const isPersonal = (r: LeaveRequestRecord) =>
    r.leaveType === 'personal' || String(r.leaveTypeName || r.leaveType || '').includes('กิจ');
  const isVacation = (r: LeaveRequestRecord) =>
    r.leaveType === 'vacation' || String(r.leaveTypeName || r.leaveType || '').includes('พักผ่อน');

  // Computed metrics strictly from filtered approved leaves
  const totalTeachers = teachers.length;
  const totalSickDays = filteredApprovedLeaves
    .filter(isSick)
    .reduce((acc, r) => acc + (Number(r.totalDays) || 0), 0);
  const totalPersonalDays = filteredApprovedLeaves
    .filter(isPersonal)
    .reduce((acc, r) => acc + (Number(r.totalDays) || 0), 0);
  const totalVacationDays = filteredApprovedLeaves
    .filter(isVacation)
    .reduce((acc, r) => acc + (Number(r.totalDays) || 0), 0);
  const totalAllDays = Number(
    filteredApprovedLeaves.reduce((acc, r) => acc + (Number(r.totalDays) || 0), 0).toFixed(1)
  );
  const avgLeavePerPerson = totalTeachers > 0 ? (totalAllDays / totalTeachers).toFixed(1) : '0.0';

  const zeroLeaveTeachers = teachers.filter((t) => {
    const staffDays = filteredApprovedLeaves
      .filter((r) => r.teacherId === t.id || r.teacherId === t.employeeCode)
      .reduce((acc, r) => acc + (Number(r.totalDays) || 0), 0);
    return staffDays === 0;
  }).length;

  // Monthly trends calculated from filtered approved leave requests
  const allMonthLabels = [
    { key: '10', month: 'ต.ค.', round: 'H1' },
    { key: '11', month: 'พ.ย.', round: 'H1' },
    { key: '12', month: 'ธ.ค.', round: 'H1' },
    { key: '01', month: 'ม.ค.', round: 'H1' },
    { key: '02', month: 'ก.พ.', round: 'H1' },
    { key: '03', month: 'มี.ค.', round: 'H1' },
    { key: '04', month: 'เม.ย.', round: 'H2' },
    { key: '05', month: 'พ.ค.', round: 'H2' },
    { key: '06', month: 'มิ.ย.', round: 'H2' },
    { key: '07', month: 'ก.ค.', round: 'H2' },
    { key: '08', month: 'ส.ค.', round: 'H2' },
    { key: '09', month: 'ก.ย.', round: 'H2' },
  ];

  const monthLabels =
    selectedSemester === 'ALL'
      ? allMonthLabels
      : allMonthLabels.filter((m) => m.round === selectedSemester);

  const rawMonthly = monthLabels.map(({ key, month }) => {
    const days = filteredApprovedLeaves
      .filter((r) => r.startDate && r.startDate.split('-')[1] === key)
      .reduce((acc, r) => acc + (Number(r.totalDays) || 0), 0);
    return { month, days: Number(days.toFixed(1)) };
  });
  const maxMonthDays = Math.max(...rawMonthly.map((m) => m.days), 1);
  const monthlyData = rawMonthly.map((m) => ({
    ...m,
    percent: m.days > 0 ? Math.max(Math.round((m.days / maxMonthDays) * 100), 6) : 0,
  }));

  // Department distribution calculated from filtered approved leaves
  const deptMap: Record<string, { count: number; days: number; hasWatchlist: boolean }> = {};
  teachers.forEach((t) => {
    const dept = t.department || 'สายงานบริหารและสนับสนุน';
    if (!deptMap[dept]) {
      deptMap[dept] = { count: 0, days: 0, hasWatchlist: false };
    }
    const staffReqs = filteredApprovedLeaves.filter(
      (r) => r.teacherId === t.id || r.teacherId === t.employeeCode
    );
    const staffDays = staffReqs.reduce((acc, r) => acc + (Number(r.totalDays) || 0), 0);
    const spReqs = staffReqs.filter((r) => isSick(r) || isPersonal(r));
    const spDays = spReqs.reduce((acc, r) => acc + (Number(r.totalDays) || 0), 0);

    deptMap[dept].count += 1;
    deptMap[dept].days += staffDays;
    if (spReqs.length > 6 || spDays > 23) {
      deptMap[dept].hasWatchlist = true;
    }
  });

  const departments = Object.entries(deptMap).map(([name, val]) => {
    const avg = val.count > 0 ? val.days / val.count : 0;
    return {
      name: name.startsWith('กลุ่มสาระ') || name.startsWith('สายงาน') ? name : `กลุ่มสาระฯ ${name}`,
      count: val.count,
      days: Number(val.days.toFixed(1)),
      isWatchlist: val.hasWatchlist || avg > 10,
    };
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white dark:bg-[#141b24] p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm transition-colors duration-200">
        <div className="space-y-1">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-sky-500 dark:text-sky-400 shrink-0" />
            <span>กราฟสถิติและบทวิเคราะห์การลา</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            ภาพรวมความสม่ำเสมอในการปฏิบัติงาน แนวโน้มการลา และเกณฑ์สำนักนายกรัฐมนตรี
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="h-10 flex items-center gap-2 bg-slate-50 dark:bg-[#101822] px-3.5 rounded-xl border border-slate-200/90 dark:border-slate-700/80 text-xs text-slate-700 dark:text-slate-300 shrink-0">
            <Calendar className="w-4 h-4 text-sky-400 shrink-0" />
            <span className="whitespace-nowrap">ปีงบประมาณ:</span>
            <select
              value={fiscalYear}
              onChange={(e) => setFiscalYear(e.target.value)}
              className="bg-transparent text-sky-600 dark:text-sky-300 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="2570" className="bg-white dark:bg-[#171a21] text-slate-900 dark:text-slate-100">2570</option>
              <option value="2569" className="bg-white dark:bg-[#171a21] text-slate-900 dark:text-slate-100">2569</option>
              <option value="2568" className="bg-white dark:bg-[#171a21] text-slate-900 dark:text-slate-100">2568</option>
            </select>
          </div>

          <div className="h-10 inline-flex items-center gap-1 bg-slate-50 dark:bg-[#101822] p-1 rounded-xl border border-slate-200/90 dark:border-slate-700/80 text-xs shrink-0">
            <button
              type="button"
              onClick={() => setSelectedSemester('ALL')}
              className={`h-8 px-3 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors duration-200 ${
                selectedSemester === 'ALL'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/50'
              }`}
            >
              ทั้งปี
            </button>
            <button
              type="button"
              onClick={() => setSelectedSemester('H1')}
              className={`h-8 px-3 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors duration-200 ${
                selectedSemester === 'H1'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/50'
              }`}
            >
              รอบที่ 1
            </button>
            <button
              type="button"
              onClick={() => setSelectedSemester('H2')}
              className={`h-8 px-3 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors duration-200 ${
                selectedSemester === 'H2'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/50'
              }`}
            >
              รอบที่ 2
            </button>
          </div>
        </div>
      </div>

      {/* KPI Highlight Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#111822] p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400">วันลารวมทั้งสถานศึกษา</span>
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
              <BarChart3 className="w-4 h-4 shrink-0" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white">{totalAllDays}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">วันทำการ</span>
          </div>
          <p className="text-[11px] text-emerald-400 mt-1">อยู่ในเกณฑ์ปกติ (เฉลี่ย {avgLeavePerPerson} วัน/คน)</p>
        </div>

        <div className="bg-white dark:bg-[#111822] p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400">สถิติมาปฏิบัติราชการ 100%</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Award className="w-4 h-4 shrink-0" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-400">{zeroLeaveTeachers}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">/ {totalTeachers} ท่าน</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            คิดเป็น {totalTeachers > 0 ? Math.round((zeroLeaveTeachers / totalTeachers) * 100) : 0}% ของบุคลากรทั้งหมด
          </p>
        </div>

        <div className="bg-white dark:bg-[#111822] p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400">ลาป่วยสะสม</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
              <Clock className="w-4 h-4 shrink-0" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-rose-400">{totalSickDays}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">วัน</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {totalSickDays === 0 ? 'ไม่มีประวัติการลาป่วยในรอบนี้' : 'สถิติการลาป่วยรวมทั้งสถานศึกษา'}
          </p>
        </div>

        <div className="bg-white dark:bg-[#111822] p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400">ลากิจส่วนตัวสะสม</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <PieChart className="w-4 h-4 shrink-0" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-amber-400">{totalPersonalDays}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">วัน</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {totalPersonalDays === 0 ? 'ไม่มีประวัติการลากิจส่วนตัวในรอบนี้' : 'สถิติการลากิจรวมทั้งสถานศึกษา'}
          </p>
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Trend Bars */}
        <div className="lg:col-span-2 bg-white dark:bg-[#111822] p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">แนวโน้มการลาในรอบปีงบประมาณ (รายเดือน)</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">เปรียบเทียบจำนวนวันลาในแต่ละเดือนของปีงบประมาณ</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5 text-slate-400">
                <span className="w-3 h-3 rounded bg-sky-500 inline-block" />
                <span>วันลา (วัน)</span>
              </div>
            </div>
          </div>

          {monthlyData.every((m) => m.days === 0) ? (
            <div className="h-56 flex flex-col items-center justify-center border-b border-slate-200/90 dark:border-slate-800 text-slate-400 dark:text-slate-500 space-y-2">
              <Calendar className="w-8 h-8 opacity-40 text-slate-400" />
              <p className="text-xs">ยังไม่มีข้อมูลการลาในรอบปีงบประมาณนี้</p>
            </div>
          ) : (
            <div className="h-56 flex items-end justify-between gap-2 pt-6 pb-2 px-2 border-b border-slate-200/90 dark:border-slate-800">
              {monthlyData.map((m) => (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  <span className="text-[10px] font-mono text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    {m.days}
                  </span>
                  <div
                    className="w-full bg-gradient-to-t from-sky-600 to-sky-400 rounded-t-md hover:brightness-125 transition-all"
                    style={{ height: `${m.percent}%` }}
                  />
                  <span className="text-[11px] text-slate-400 font-medium">{m.month}</span>
                </div>
              ))}
            </div>
          )}
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 px-1">
            <span>เริ่มต้นปีงบประมาณ: 1 ตุลาคม</span>
            <span>สิ้นสุดปีงบประมาณ: 30 กันยายน</span>
          </div>
        </div>

        {/* Leave Type Distribution */}
        <div className="bg-white dark:bg-[#111822] p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">สัดส่วนประเภทการลา</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-4">จำแนกตามระเบียบสำนักนายกรัฐมนตรีฯ</p>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-rose-300 font-medium">ลาป่วย</span>
                  <span className="text-slate-700 dark:text-slate-300 font-mono font-bold">
                    {totalSickDays} วัน ({Math.round((totalSickDays / (totalAllDays || 1)) * 100)}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-rose-500 h-full rounded-full"
                    style={{ width: `${Math.round((totalSickDays / (totalAllDays || 1)) * 100)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-amber-300 font-medium">ลากิจส่วนตัว</span>
                  <span className="text-slate-700 dark:text-slate-300 font-mono font-bold">
                    {totalPersonalDays} วัน ({Math.round((totalPersonalDays / (totalAllDays || 1)) * 100)}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-500 h-full rounded-full"
                    style={{ width: `${Math.round((totalPersonalDays / (totalAllDays || 1)) * 100)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-emerald-300 font-medium">ลาพักผ่อน</span>
                  <span className="text-slate-700 dark:text-slate-300 font-mono font-bold">
                    {totalVacationDays} วัน ({Math.round((totalVacationDays / (totalAllDays || 1)) * 100)}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full"
                    style={{ width: `${Math.round((totalVacationDays / (totalAllDays || 1)) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <span className="font-semibold text-slate-700 dark:text-slate-300">เกณฑ์ ว 15/2561:</span>
            <span>ลาไม่เกิน 6 ครั้ง หรือ 23 วันทำการต่อรอบ</span>
          </div>
        </div>
      </div>

      {/* Department Breakdown Table */}
      <div className="bg-white dark:bg-[#111822] p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">สรุปสถิติการลาแยกตามกลุ่มสาระการเรียนรู้ / สายงาน</h3>
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-[#16202c] text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200/90 dark:border-slate-800">
              <tr>
                <th className="px-4 py-2.5 min-w-[240px]">กลุ่มสาระการเรียนรู้ / สายงาน</th>
                <th className="px-4 py-2.5 text-center min-w-[120px]">จำนวนบุคลากร</th>
                <th className="px-4 py-2.5 text-center min-w-[120px]">วันลารวม (วัน)</th>
                <th className="px-4 py-2.5 text-center min-w-[110px]">ค่าเฉลี่ยต่อคน</th>
                <th className="px-4 py-2.5 min-w-[110px]">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/60 font-sans">
              {departments.map((d) => {
                const displayName = d.name.replace('สายงานบริหารและสนับสนุนการศึกษา', 'บริหารและสนับสนุนฯ');
                return (
                  <tr key={d.name} className="hover:bg-slate-50 dark:hover:bg-[#162231]/40 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                      <div className="truncate max-w-[220px]" title={d.name}>{displayName}</div>
                    </td>
                    <td className="px-4 py-3 text-center font-mono whitespace-nowrap">{d.count} ท่าน</td>
                    <td className="px-4 py-3 text-center font-mono font-bold text-sky-600 dark:text-sky-400 whitespace-nowrap">{d.days}</td>
                    <td className="px-4 py-3 text-center font-mono whitespace-nowrap">{(d.days / d.count).toFixed(1)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {d.isWatchlist ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30">
                          <AlertTriangle className="w-3 h-3 shrink-0" />
                          <span>เฝ้าระวัง</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3 shrink-0" />
                          <span>ปกติ</span>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
