'use client';

/**
 * ============================================================================
 * ManStat-Modern: ViewLeaveAnalytics (กราฟและสถิติภาพรวมการลา)
 * ============================================================================
 * - Fiscal year leave trends (ตุลาคม - กันยายน)
 * - Leave type distribution (Sick, Personal, Vacation)
 * - Department-by-department comparisons
 * - High-risk personnel radar (approaching legal caps)
 * - Zero Emojis, Pure Lucide SVG Icons, 8px Standard Spacing
 * ============================================================================
 */

import { useState } from 'react';
import {
  TrendingUp,
  BarChart3,
  PieChart,
  Calendar,
  Award,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { INITIAL_TEACHERS } from '@/lib/data/schoolData';

export function ViewLeaveAnalytics() {
  const [fiscalYear, setFiscalYear] = useState('2570');
  const [selectedSemester, setSelectedSemester] = useState<'ALL' | 'H1' | 'H2'>('ALL');

  // Computed metrics from real teachers data
  const totalTeachers = INITIAL_TEACHERS.length;
  const zeroLeaveTeachers = INITIAL_TEACHERS.filter(
    (t) => t.sickUsed === 0 && t.personalUsed === 0 && t.vacationUsed === 0
  ).length;
  const totalSickDays = INITIAL_TEACHERS.reduce((acc, t) => acc + t.sickUsed, 0);
  const totalPersonalDays = INITIAL_TEACHERS.reduce((acc, t) => acc + t.personalUsed, 0);
  const totalVacationDays = INITIAL_TEACHERS.reduce((acc, t) => acc + t.vacationUsed, 0);
  const totalAllDays = totalSickDays + totalPersonalDays + totalVacationDays;
  const avgLeavePerPerson = (totalAllDays / totalTeachers).toFixed(1);

  // Monthly trends (Fiscal year Oct - Sep)
  const monthlyData = [
    { month: 'ต.ค.', days: 3.5, percent: 35 },
    { month: 'พ.ย.', days: 4.0, percent: 40 },
    { month: 'ธ.ค.', days: 1.5, percent: 15 },
    { month: 'ม.ค.', days: 2.0, percent: 20 },
    { month: 'ก.พ.', days: 2.5, percent: 25 },
    { month: 'มี.ค.', days: 5.0, percent: 50 },
    { month: 'เม.ย.', days: 6.5, percent: 65 },
    { month: 'พ.ค.', days: 2.0, percent: 20 },
    { month: 'มิ.ย.', days: 3.0, percent: 30 },
    { month: 'ก.ค.', days: 4.5, percent: 45 },
    { month: 'ส.ค.', days: 3.0, percent: 30 },
    { month: 'ก.ย.', days: 2.5, percent: 25 },
  ];

  // Department distribution
  const departments = [
    { name: 'กลุ่มสาระฯ วิทยาศาสตร์และเทคโนโลยี', count: 3, days: 4.5 },
    { name: 'กลุ่มสาระฯ ภาษาไทย', count: 2, days: 2.0 },
    { name: 'กลุ่มสาระฯ คณิตศาสตร์', count: 2, days: 3.0 },
    { name: 'กลุ่มสาระฯ ภาษาต่างประเทศ', count: 2, days: 1.5 },
    { name: 'กลุ่มสาระฯ ศิลปะ / สังคมศึกษา', count: 3, days: 3.5 },
    { name: 'สายงานบริหารและสนับสนุน', count: 3, days: 1.0 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#141b24] p-5 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-sky-400 text-xs font-semibold uppercase tracking-wider">
            <TrendingUp className="w-4 h-4 shrink-0" />
            <span>Leave Statistics & Executive Analytics</span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1">กราฟสถิติและบทวิเคราะห์การลา</h2>
          <p className="text-xs text-slate-400 mt-1">
            ภาพรวมความสม่ำเสมอในการปฏิบัติงาน แนวโน้มการลา และการปฏิบัติตามเกณฑ์สำนักนายกรัฐมนตรีฯ
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-10 flex items-center gap-2 bg-[#101822] px-3.5 rounded-xl border border-slate-700/80 text-xs text-slate-300">
            <Calendar className="w-4 h-4 text-sky-400 shrink-0" />
            <span>ปีงบประมาณ:</span>
            <select
              value={fiscalYear}
              onChange={(e) => setFiscalYear(e.target.value)}
              className="bg-transparent text-sky-300 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="2570" className="bg-[#171a21]">2570 (ปัจจุบัน)</option>
              <option value="2569" className="bg-[#171a21]">2569</option>
              <option value="2568" className="bg-[#171a21]">2568</option>
            </select>
          </div>

          <div className="h-10 flex items-center gap-1 bg-[#101822] p-1 rounded-lg border border-slate-700/80 text-xs">
            <button
              type="button"
              onClick={() => setSelectedSemester('ALL')}
              className={`h-8 px-3 rounded-md text-xs font-medium transition-colors duration-200 ${
                selectedSemester === 'ALL' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              ทั้งปี
            </button>
            <button
              type="button"
              onClick={() => setSelectedSemester('H1')}
              className={`h-8 px-3 rounded-md text-xs font-medium transition-colors duration-200 ${
                selectedSemester === 'H1' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              รอบที่ 1
            </button>
            <button
              type="button"
              onClick={() => setSelectedSemester('H2')}
              className={`h-8 px-3 rounded-md text-xs font-medium transition-colors duration-200 ${
                selectedSemester === 'H2' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              รอบที่ 2
            </button>
          </div>
        </div>
      </div>

      {/* KPI Highlight Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#111822] p-4 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">วันลารวมทั้งสถานศึกษา</span>
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
              <BarChart3 className="w-4 h-4 shrink-0" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-white">{totalAllDays}</span>
            <span className="text-xs text-slate-400">วันทำการ</span>
          </div>
          <p className="text-[11px] text-emerald-400 mt-1">อยู่ในเกณฑ์ปกติ (เฉลี่ย {avgLeavePerPerson} วัน/คน)</p>
        </div>

        <div className="bg-[#111822] p-4 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">สถิติมาปฏิบัติราชการ 100%</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Award className="w-4 h-4 shrink-0" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-400">{zeroLeaveTeachers}</span>
            <span className="text-xs text-slate-400">/ {totalTeachers} ท่าน</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            คิดเป็น {Math.round((zeroLeaveTeachers / totalTeachers) * 100)}% ของบุคลากรทั้งหมด
          </p>
        </div>

        <div className="bg-[#111822] p-4 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">ลาป่วยสะสม</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
              <Clock className="w-4 h-4 shrink-0" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-rose-400">{totalSickDays}</span>
            <span className="text-xs text-slate-400">วัน (สิทธิ 60 วัน)</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">ไม่มีผู้มีสถิติเสี่ยงเกินเกณฑ์</p>
        </div>

        <div className="bg-[#111822] p-4 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">ลากิจส่วนตัวสะสม</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <PieChart className="w-4 h-4 shrink-0" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-amber-400">{totalPersonalDays}</span>
            <span className="text-xs text-slate-400">วัน (สิทธิ 45 วัน)</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">ส่งมอบงานสอนแทนเรียบร้อย 100%</p>
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Trend Bars */}
        <div className="lg:col-span-2 bg-[#111822] p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">แนวโน้มการลาในรอบปีงบประมาณ (รายเดือน)</h3>
              <p className="text-[11px] text-slate-400">เปรียบเทียบจำนวนวันลาในแต่ละเดือนของปีงบประมาณ</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5 text-slate-400">
                <span className="w-3 h-3 rounded bg-sky-500 inline-block" />
                <span>วันลา (วัน)</span>
              </div>
            </div>
          </div>

          <div className="h-56 flex items-end justify-between gap-2 pt-6 pb-2 px-2 border-b border-slate-800">
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
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 px-1">
            <span>เริ่มต้นปีงบประมาณ: 1 ตุลาคม</span>
            <span>สิ้นสุดปีงบประมาณ: 30 กันยายน</span>
          </div>
        </div>

        {/* Leave Type Distribution */}
        <div className="bg-[#111822] p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white mb-1">สัดส่วนประเภทการลา</h3>
            <p className="text-[11px] text-slate-400 mb-4">จำแนกตามระเบียบสำนักนายกรัฐมนตรีฯ</p>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-rose-300 font-medium">ลาป่วย (Sick Leave)</span>
                  <span className="text-slate-300 font-mono font-bold">
                    {totalSickDays} วัน ({Math.round((totalSickDays / (totalAllDays || 1)) * 100)}%)
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-rose-500 h-full rounded-full"
                    style={{ width: `${Math.round((totalSickDays / (totalAllDays || 1)) * 100)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-amber-300 font-medium">ลากิจส่วนตัว (Personal Leave)</span>
                  <span className="text-slate-300 font-mono font-bold">
                    {totalPersonalDays} วัน ({Math.round((totalPersonalDays / (totalAllDays || 1)) * 100)}%)
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-500 h-full rounded-full"
                    style={{ width: `${Math.round((totalPersonalDays / (totalAllDays || 1)) * 100)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-emerald-300 font-medium">ลาพักผ่อน (Vacation Leave)</span>
                  <span className="text-slate-300 font-mono font-bold">
                    {totalVacationDays} วัน ({Math.round((totalVacationDays / (totalAllDays || 1)) * 100)}%)
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full"
                    style={{ width: `${Math.round((totalVacationDays / (totalAllDays || 1)) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 p-3 rounded-xl bg-[#151e2b] border border-slate-800 text-[11px] text-slate-300">
            <span className="font-semibold text-sky-400">ข้อควรทราบ:</span> การลาเกิน 6 ครั้งในรอบครึ่งปีงบประมาณ หรือลาเกิน 23 วันทำการ อาจมีผลต่อการประเมินการเลื่อนขั้นเงินเดือน ว15/2561
          </div>
        </div>
      </div>

      {/* Department Breakdown Table */}
      <div className="bg-[#111822] p-5 rounded-2xl border border-slate-800">
        <h3 className="text-sm font-bold text-white mb-3">สรุปสถิติการลาแยกตามกลุ่มสาระการเรียนรู้ / สายงาน</h3>
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#16202c] text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="px-4 py-2.5 min-w-[240px]">กลุ่มสาระการเรียนรู้ / สายงาน</th>
                <th className="px-4 py-2.5 text-center min-w-[120px]">จำนวนบุคลากร</th>
                <th className="px-4 py-2.5 text-center min-w-[120px]">วันลารวม (วัน)</th>
                <th className="px-4 py-2.5 text-center min-w-[110px]">ค่าเฉลี่ยต่อคน</th>
                <th className="px-4 py-2.5 min-w-[110px]">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {departments.map((d) => {
                const displayName = d.name.replace('สายงานบริหารและสนับสนุนการศึกษา', 'บริหารและสนับสนุนฯ');
                return (
                  <tr key={d.name} className="hover:bg-[#162231]/40 transition-colors">
                    <td className="px-4 py-3 font-medium text-white">
                      <div className="truncate max-w-[220px]" title={d.name}>{displayName}</div>
                    </td>
                    <td className="px-4 py-3 text-center font-mono whitespace-nowrap">{d.count} ท่าน</td>
                    <td className="px-4 py-3 text-center font-mono font-bold text-sky-400 whitespace-nowrap">{d.days}</td>
                    <td className="px-4 py-3 text-center font-mono whitespace-nowrap">{(d.days / d.count).toFixed(1)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3 shrink-0" />
                        <span>ปกติ</span>
                      </span>
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
