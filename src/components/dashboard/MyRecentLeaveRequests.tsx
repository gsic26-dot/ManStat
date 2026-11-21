'use client';

/**
 * ============================================================================
 * ManStat-Modern: My Recent Leave Requests (มุมมองคำขอลาล่าสุดของฉัน)
 * ============================================================================
 * - For regular teachers and educational personnel (without approver rights)
 * - Clean personal leave tracking: View latest requests & quick-submit new leave
 * - Status pills: รออนุมัติ (Pending), อนุมัติแล้ว (Approved), ไม่อนุมัติ (Rejected)
 * - Zero emojis, pure Lucide SVG icons, strict 8px gap.
 * ============================================================================
 */

import React from 'react';
import { PlusCircle, FileText, ChevronRight, Clock, CheckCircle2, XCircle } from 'lucide-react';
import type { LeaveRequestRecord } from '@/lib/data/schoolData';

interface MyRecentLeaveRequestsProps {
  requests: LeaveRequestRecord[];
  onNewLeaveRequest: () => void;
  onViewAllHistory: () => void;
}

export const MyRecentLeaveRequests: React.FC<MyRecentLeaveRequestsProps> = ({
  requests,
  onNewLeaveRequest,
  onViewAllHistory,
}) => {
  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>อนุมัติแล้ว</span>
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20">
            <XCircle className="w-3 h-3 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>ไม่อนุมัติ</span>
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
            <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>รออนุมัติ</span>
          </span>
        );
    }
  };

  return (
    <section className="bg-white dark:bg-[#121822] border border-slate-200/90 dark:border-slate-800/80 rounded-xl p-5 space-y-4 shadow-sm dark:shadow-none transition-colors duration-200">
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-sky-500 dark:text-sky-400 shrink-0" />
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            คำขอลาล่าสุดของฉัน
          </h2>
        </div>

        <button
          type="button"
          onClick={onNewLeaveRequest}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-sm"
        >
          <PlusCircle className="w-3.5 h-3.5 shrink-0" />
          <span>ยื่นคำร้องขอลา</span>
        </button>
      </div>

      {/* Content List */}
      {requests.length === 0 ? (
        <div className="py-10 text-center space-y-2 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
          <FileText className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
            ยังไม่มีประวัติการยื่นคำร้องขอลาในปีงบประมาณนี้
          </p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            ท่านสามารถสร้างและส่งใบลาอิเล็กทรอนิกส์ได้สะดวกรวดเร็ว
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {requests.map((req) => (
              <div
                key={req.id}
                className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-slate-900 dark:text-white">
                      {req.leaveTypeName || req.leaveType}
                    </span>
                    <span className="text-xs font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                      {req.totalDays} วันทำการ
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                    {req.startDate} {req.endDate && req.endDate !== req.startDate ? `– ${req.endDate}` : ''}
                    {req.reason ? ` · ${req.reason}` : ''}
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  {getStatusBadge(req.status)}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800/60 flex justify-end">
            <button
              type="button"
              onClick={onViewAllHistory}
              className="inline-flex items-center gap-1 text-xs text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 font-medium transition-colors"
            >
              <span>ดูประวัติทั้งหมด</span>
              <ChevronRight className="w-3.5 h-3.5 shrink-0" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
