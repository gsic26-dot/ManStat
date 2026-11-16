'use client';

/**
 * ============================================================================
 * ManStat-Modern: Smart Salary Promotion Radar (ก.ค.ศ. ว15/2561)
 * ============================================================================
 * - Round 1 (1 Oct - 31 Mar) & Round 2 (1 Apr - 30 Sep)
 * - Criteria 1: Leave Occurrences <= 6 times / round
 * - Criteria 2: Sick + Personal Days <= 23 working days / round
 * - Real-time Risk Assessment: Warning alert when thresholds are breached.
 * - Zero emojis, pure Lucide SVG icons, strict 8px gap.
 * ============================================================================
 */

import React from 'react';
import { Award, CheckCircle2, AlertOctagon, TrendingUp, Info } from 'lucide-react';

export interface PromotionRadarCardProps {
  fiscalYear?: number;
  evalRound?: 1 | 2;
  leaveCount?: number;
  sickPersonalDays?: number;
  isEligible?: boolean;
}

export const PromotionRadarCard: React.FC<PromotionRadarCardProps> = ({
  fiscalYear = 2570,
  evalRound = 1,
  leaveCount = 2,
  sickPersonalDays = 4.5,
  isEligible,
}) => {
  const maxOccurrences = 6;
  const maxDays = 23;

  const occurrencePercent = Math.min(100, (leaveCount / maxOccurrences) * 100);
  const daysPercent = Math.min(100, (sickPersonalDays / maxDays) * 100);

  const isOccurrenceExceeded = leaveCount > maxOccurrences;
  const isDaysExceeded = sickPersonalDays > maxDays;
  const hasRisk = isOccurrenceExceeded || isDaysExceeded || (isEligible !== undefined && !isEligible);

  const roundName = evalRound === 1 ? 'รอบที่ 1 (1 ต.ค. - 31 มี.ค.)' : 'รอบที่ 2 (1 เม.ย. - 30 ก.ย.)';

  return (
    <div className="bg-[#111823]/80 p-5 rounded-2xl border border-slate-800/80 hover:shadow-xl hover:shadow-black/20 transition-all">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400">
            <Award className="w-5 h-5 shrink-0" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-100">
              เรดาร์ประเมินเลื่อนเงินเดือน (ก.ค.ศ. ว15/2561)
            </h3>
            <p className="text-xs text-slate-400">
              ปีงบประมาณ พ.ศ. {fiscalYear} {roundName}
            </p>
          </div>
        </div>

        {/* Global Status Badge */}
        <div>
          {hasRisk ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-medium">
              <AlertOctagon className="w-4 h-4 shrink-0 text-rose-400" />
              <span>มีความเสี่ยงงดเลื่อนเงินเดือน</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>อยู่ในเกณฑ์ปกติ มีสิทธิ์เลื่อนขั้น</span>
            </span>
          )}
        </div>
      </div>

      {/* Progress Bars */}
      <div className="space-y-4">
        {/* Metric 1: Leave Occurrences */}
        <div className="bg-[#1b2838]/60 p-4 rounded-lg border border-[#2a475e]/60">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
              <TrendingUp className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span>จำนวนครั้งที่ลา (ไม่เกิน 6 ครั้ง / รอบ)</span>
            </div>
            <span className={`font-mono text-sm font-bold ${isOccurrenceExceeded ? 'text-rose-400' : 'text-slate-100'}`}>
              {leaveCount} <span className="text-xs text-slate-400 font-normal">/ {maxOccurrences} ครั้ง</span>
            </span>
          </div>

          <div className="w-full bg-[#101822] rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                isOccurrenceExceeded
                  ? 'bg-rose-500'
                  : occurrencePercent > 70
                  ? 'bg-amber-500'
                  : 'bg-sky-400'
              }`}
              style={{ width: `${occurrencePercent}%` }}
            />
          </div>

          {isOccurrenceExceeded && (
            <p className="text-[11px] text-rose-400 mt-1.5 flex items-center gap-1">
              <AlertOctagon className="w-3 h-3 shrink-0" />
              <span>เกินเกณฑ์ที่กำหนดแล้ว ({leaveCount - maxOccurrences} ครั้ง)</span>
            </p>
          )}
        </div>

        {/* Metric 2: Sick + Personal Days */}
        <div className="bg-[#1b2838]/60 p-4 rounded-lg border border-[#2a475e]/60">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>วันลาป่วย + ลากิจส่วนตัว (ไม่เกิน 23 วันทำการ / รอบ)</span>
            </div>
            <span className={`font-mono text-sm font-bold ${isDaysExceeded ? 'text-rose-400' : 'text-slate-100'}`}>
              {sickPersonalDays} <span className="text-xs text-slate-400 font-normal">/ {maxDays} วันทำการ</span>
            </span>
          </div>

          <div className="w-full bg-[#101822] rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                isDaysExceeded
                  ? 'bg-rose-500'
                  : daysPercent > 70
                  ? 'bg-amber-500'
                  : 'bg-emerald-400'
              }`}
              style={{ width: `${daysPercent}%` }}
            />
          </div>

          {isDaysExceeded && (
            <p className="text-[11px] text-rose-400 mt-1.5 flex items-center gap-1">
              <AlertOctagon className="w-3 h-3 shrink-0" />
              <span>เกินเกณฑ์ที่กำหนดแล้ว ({sickPersonalDays - maxDays} วัน)</span>
            </p>
          )}
        </div>
      </div>

      {/* Regulatory Tip */}
      <div className="mt-4 p-3 rounded-lg bg-[#141f2d] border border-slate-700/60 flex items-start gap-2 text-xs text-slate-400">
        <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
        <span className="leading-relaxed">
          ตามหนังสือสำนักงาน ก.ค.ศ. ที่ ศธ 0206.7/ว 15 ลงวันที่ 19 กรกฎาคม 2561 ผู้ที่จะได้รับการพิจารณาเลื่อนเงินเดือนในแต่ละรอบการประเมิน ต้องมีวันลาไม่เกิน 23 วันทำการ และลาไม่เกิน 6 ครั้ง
        </span>
      </div>
    </div>
  );
};
