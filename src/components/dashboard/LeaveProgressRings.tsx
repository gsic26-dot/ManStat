'use client';

/**
 * ============================================================================
 * ManStat-Modern: Leave Progress Rings (Circular SVG Progress Visualizer)
 * ============================================================================
 * - Circular SVG rings displaying personal leave quotas:
 *   * Sick Leave: X/60 days (ระเบียบสำนักนายกฯ 2555 ข้อ 15)
 *   * Personal Leave: X/45 days (ปกติ) หรือ X/15 days (บรรจุปีแรก ข้อ 17)
 * - Dynamic color transitions:
 *   * < 50%  -> Emerald Green (#10b981)
 *   * 50-80% -> Amber Yellow (#f59e0b)
 *   * > 80%  -> Rose Red (#ef4444)
 * - Zero emojis, pure Lucide SVG icons, strict 8px gap.
 * ============================================================================
 */

import React from 'react';
import { Stethoscope, Briefcase, Info, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';

interface CircularRingProps {
  label: string;
  used: number;
  max: number;
  unit?: string;
  icon: React.ComponentType<{ className?: string }>;
  subtext?: string;
}

const CircularRing: React.FC<CircularRingProps> = ({
  label,
  used,
  max,
  unit = 'วันทำการ',
  icon: Icon,
  subtext,
}) => {
  const percentage = Math.min(100, Math.max(0, (used / max) * 100));
  const remaining = Math.max(0, max - used);

  // SVG dimensions
  const size = 130;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // Dynamic color threshold
  let strokeColor = '#10b981'; // Green
  let textColor = 'text-emerald-400';
  let badgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
  let StatusIcon = CheckCircle2;

  if (percentage >= 80) {
    strokeColor = '#ef4444'; // Red
    textColor = 'text-rose-400';
    badgeColor = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
    StatusIcon = AlertCircle;
  } else if (percentage >= 50) {
    strokeColor = '#f59e0b'; // Amber
    textColor = 'text-amber-400';
    badgeColor = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    StatusIcon = AlertTriangle;
  }

  return (
    <div className="flex flex-col items-center bg-[#151e2b] border border-slate-700/80 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between w-full mb-3">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${textColor} shrink-0`} />
          <span className="text-sm font-medium text-slate-200">{label}</span>
        </div>
        <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border ${badgeColor}`}>
          <StatusIcon className="w-3 h-3 shrink-0" />
          <span>{percentage.toFixed(0)}%</span>
        </span>
      </div>

      {/* SVG Ring */}
      <div className="relative flex items-center justify-center my-2">
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#172332"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-700 ease-out"
          />
        </svg>

        {/* Center label */}
        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className="font-mono text-2xl font-bold text-white tracking-tight">
            {used}
          </span>
          <span className="text-[11px] text-slate-400 font-sans">
            / {max} วัน
          </span>
        </div>
      </div>

      {/* Footer stats */}
      <div className="mt-3 text-center w-full pt-2 border-t border-slate-700/50">
        <p className="text-xs text-slate-300">
          คงเหลือ <span className={`font-semibold ${textColor}`}>{remaining}</span> {unit}
        </p>
        {subtext && (
          <p className="text-[11px] text-slate-500 mt-0.5 truncate">{subtext}</p>
        )}
      </div>
    </div>
  );
};

export interface LeaveProgressRingsProps {
  sickLeaveUsed?: number;
  sickLeaveMax?: number;
  personalLeaveUsed?: number;
  personalLeaveMax?: number;
  isFirstYear?: boolean;
}

export const LeaveProgressRings: React.FC<LeaveProgressRingsProps> = ({
  sickLeaveUsed = 3.5,
  sickLeaveMax = 60,
  personalLeaveUsed = 2,
  personalLeaveMax,
  isFirstYear = false,
}) => {
  const actualPersonalMax = personalLeaveMax ?? (isFirstYear ? 15 : 45);

  return (
    <div className="bg-[#111823]/80 p-5 rounded-2xl border border-slate-800/80 hover:shadow-xl hover:shadow-black/20 transition-all">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <span>โควตาวันลาประจำปีงบประมาณ</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            คำนวณตามระเบียบสำนักนายกรัฐมนตรีว่าด้วยการลาของข้าราชการ พ.ศ. 2555
          </p>
        </div>
        {isFirstYear && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 text-xs font-medium">
            <Info className="w-3.5 h-3.5 shrink-0" />
            <span>บรรจุปีแรก (เพดาน 15 วัน)</span>
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CircularRing
          label="ลาป่วย (Sick Leave)"
          used={sickLeaveUsed}
          max={sickLeaveMax}
          icon={Stethoscope}
          subtext="รับเงินเดือนระหว่างลาได้ไม่เกิน 60 วัน"
        />

        <CircularRing
          label="ลากิจส่วนตัว (Personal Leave)"
          used={personalLeaveUsed}
          max={actualPersonalMax}
          icon={Briefcase}
          subtext={isFirstYear ? 'บรรจุปีแรกจำกัดสิทธิ์ไม่เกิน 15 วันทำการ' : 'สิทธิ์ปกติไม่เกิน 45 วันทำการต่อปีงบประมาณ'}
        />
      </div>
    </div>
  );
};
