'use client';

/**
 * ============================================================================
 * ManStat-Modern: Personnel Summary Cards (School-wide Status Header)
 * ============================================================================
 * - Total Staff (จำนวนบุคลากรทั้งหมด)
 * - On-Duty (มาปฏิบัติหน้าที่)
 * - On-Leave Today (ลางานวันนี้)
 * - Retirement / License Expiring Soon (เกษียณ/ใบอนุญาตใกล้หมดอายุ)
 * - Zero emojis, Lucide SVG icons with strict 8px gap.
 * ============================================================================
 */

import React from 'react';
import { Users, UserCheck, CalendarOff, AlertTriangle, ArrowRight } from 'lucide-react';

export interface PersonnelSummaryStats {
  totalStaff: number;
  onDutyCount: number;
  onLeaveCount: number;
  expiringOrRetiringCount: number;
}

interface PersonnelSummaryCardsProps {
  stats?: PersonnelSummaryStats;
  isLoading?: boolean;
}

export const PersonnelSummaryCards: React.FC<PersonnelSummaryCardsProps> = ({
  stats = {
    totalStaff: 15,
    onDutyCount: 14,
    onLeaveCount: 1,
    expiringOrRetiringCount: 1,
  },
  isLoading = false,
}) => {
  const cards = [
    {
      title: 'บุคลากรทั้งหมด',
      value: stats.totalStaff,
      unit: 'คน',
      subtitle: 'ข้าราชการครูและบุคลากร',
      icon: Users,
      iconColor: 'text-sky-400',
      borderColor: 'hover:border-sky-500/40',
      bgColor: 'bg-sky-500/10',
    },
    {
      title: 'มาปฏิบัติหน้าที่',
      value: stats.onDutyCount,
      unit: 'คน',
      subtitle: 'พร้อมปฏิบัติการสอน/งานราชการ',
      icon: UserCheck,
      iconColor: 'text-emerald-400',
      borderColor: 'hover:border-emerald-500/40',
      bgColor: 'bg-emerald-500/10',
    },
    {
      title: 'ลางานวันนี้',
      value: stats.onLeaveCount,
      unit: 'คน',
      subtitle: 'มีใบลาถูกต้องตามระเบียบ',
      icon: CalendarOff,
      iconColor: 'text-amber-400',
      borderColor: 'hover:border-amber-500/40',
      bgColor: 'bg-amber-500/10',
    },
    {
      title: 'เกษียณ / ใบอนุญาตใกล้หมดอายุ',
      value: stats.expiringOrRetiringCount,
      unit: 'คน',
      subtitle: 'ต้องดำเนินการต่ออายุใน 90 วัน',
      icon: AlertTriangle,
      iconColor: 'text-rose-400',
      borderColor: 'hover:border-rose-500/40',
      bgColor: 'bg-rose-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => {
        const IconComponent = card.icon;
        return (
          <div
            key={idx}
            className={`bg-[#111823]/80 p-5 rounded-2xl transition-all duration-200 border border-slate-800/80 hover:shadow-lg hover:shadow-black/20 ${card.borderColor}`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-slate-300">{card.title}</span>
              <div className={`p-2.5 rounded-xl ${card.bgColor} ${card.iconColor}`}>
                <IconComponent className="w-5 h-5 shrink-0" />
              </div>
            </div>

            <div className="flex items-baseline gap-2 mb-1">
              {isLoading ? (
                <div className="h-8 w-16 bg-slate-800 animate-pulse rounded" />
              ) : (
                <span className="text-3xl font-bold tracking-tight text-white font-mono">
                  {card.value}
                </span>
              )}
              <span className="text-sm text-slate-400">{card.unit}</span>
            </div>

            <p className="text-xs text-slate-400 truncate">{card.subtitle}</p>
          </div>
        );
      })}
    </div>
  );
};
