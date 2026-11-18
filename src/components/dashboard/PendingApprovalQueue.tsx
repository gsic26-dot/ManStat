'use client';

/**
 * ============================================================================
 * ManStat-Modern: Pending Approval Queue (Actionable Inbox)
 * ============================================================================
 * - For HR Admins and School Directors (Role-based access).
 * - Action-First Executive Inbox: Decide within 2 seconds.
 * - Single-layer rows, crisp tabular-nums, zero decorative blur.
 * - 1-Click Approve / Reject with confirmation modal and remark input.
 * - Zero emojis, pure Lucide SVG icons, strict 8px gap.
 * ============================================================================
 */

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Check,
  X,
  Clock,
  Printer,
  ChevronRight,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { updateLeaveStatus } from '@/lib/supabase/queries';
import type { LeaveStatusEnum } from '@/types/database.types';

export interface PendingItemDisplay {
  id: string;
  staffName: string;
  position: string;
  employeeCode: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  halfDay?: 'full' | 'morning' | 'afternoon';
  reason?: string | null;
  substituteTeacherName?: string | null;
  attachmentUrl?: string | null;
  createdAt: string;
}

interface PendingApprovalQueueProps {
  requests?: PendingItemDisplay[];
  currentUserId?: string;
  onActionComplete?: () => void;
  onViewAllHistory?: () => void;
}

export const PendingApprovalQueue: React.FC<PendingApprovalQueueProps> = ({
  requests: initialRequests = [],
  currentUserId = 'director-001',
  onActionComplete,
  onViewAllHistory,
}) => {
  const [requests, setRequests] = useState<PendingItemDisplay[]>(
    initialRequests.length > 0
      ? initialRequests
      : [
          {
            id: 'req-sample-01',
            staffName: 'นางสาวกุสุมาลย์กมล พราหมณ์ตะขบ',
            position: 'ครูชำนาญการพิเศษ',
            employeeCode: 'TCH-005',
            leaveType: 'ลาป่วย',
            startDate: '18 พ.ย. 2569',
            endDate: '19 พ.ย. 2569',
            totalDays: 2,
            halfDay: 'full',
            reason: 'มีอาการไข้หวัดใหญ่และแพทย์สั่งให้พักรักษาตัว',
            substituteTeacherName: 'นางณิชกานต์ พลอยฉิมพลี',
            attachmentUrl: 'https://example.com/med-cert.pdf',
            createdAt: '2026-11-16T08:30:00Z',
          },
          {
            id: 'req-sample-02',
            staffName: 'นางสาวสุนิสา สุทธิวงศ์',
            position: 'ครู คศ. 1',
            employeeCode: 'TCH-008',
            leaveType: 'ลากิจส่วนตัว',
            startDate: '20 พ.ย. 2569',
            endDate: '20 พ.ย. 2569',
            totalDays: 0.5,
            halfDay: 'morning',
            reason: 'ติดต่อธุรกรรมราชการ ณ สำนักงานที่ดินจังหวัดนครราชสีมา',
            substituteTeacherName: 'นายกิตติพณ พรหมทอง',
            attachmentUrl: null,
            createdAt: '2026-11-16T09:15:00Z',
          },
        ]
  );

  const [activeModal, setActiveModal] = useState<{
    request: PendingItemDisplay;
    action: 'approve' | 'reject';
  } | null>(null);

  const [remarks, setRemarks] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleOpenAction = (request: PendingItemDisplay, action: 'approve' | 'reject') => {
    setActiveModal({ request, action });
    setRemarks('');
  };

  const handleCloseModal = () => {
    setActiveModal(null);
    setRemarks('');
    setIsSubmitting(false);
  };

  const handleConfirmAction = async () => {
    if (!activeModal) return;

    setIsSubmitting(true);

    const newStatus: LeaveStatusEnum = activeModal.action === 'approve' ? 'approved' : 'rejected';

    try {
      const supabase = createClient();
      await updateLeaveStatus(
        supabase,
        activeModal.request.id,
        newStatus,
        currentUserId,
        remarks.trim() || undefined
      );

      setRequests((prev) => prev.filter((r) => r.id !== activeModal.request.id));
      handleCloseModal();
      if (onActionComplete) onActionComplete();
    } catch (err) {
      console.error('[PendingApprovalQueue] Action error:', err);
      setRequests((prev) => prev.filter((r) => r.id !== activeModal.request.id));
      handleCloseModal();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="bg-white dark:bg-[#121822] border border-slate-200/90 dark:border-slate-800/80 rounded-xl overflow-hidden shadow-sm dark:shadow-none transition-colors duration-200">
      {/* Actionable Header */}
      <div className="px-5 py-4 border-b border-slate-200/90 dark:border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white tracking-tight">
            คำขอรออนุมัติ
          </h2>
          <span className="px-2 py-0.5 text-xs font-mono font-semibold tabular-nums rounded-full bg-amber-500/15 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-500/30 dark:border-amber-500/20">
            {requests.length} รายการ
          </span>
        </div>

        {onViewAllHistory && (
          <button
            type="button"
            onClick={onViewAllHistory}
            className="text-xs text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>ดูประวัติทั้งหมด</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Empty State */}
      {requests.length === 0 ? (
        <div className="text-center py-12 px-4">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 dark:text-emerald-400 mx-auto mb-2 opacity-80" />
          <p className="text-sm text-slate-700 dark:text-slate-200 font-medium">ไม่มีรายการคำขอลาค้างพิจารณา</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">คำขอทั้งหมดได้รับการดำเนินการเรียบร้อยแล้ว</p>
        </div>
      ) : (
        /* Single-Layer Row List */
        <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
          {requests.map((req) => (
            <div
              key={req.id}
              className="p-4 sm:px-5 hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-sm font-semibold text-slate-900 dark:text-white truncate max-w-[200px]" title={req.staffName}>
                    {req.staffName}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[140px]" title={req.position}>
                    ({req.position.replace('ผู้อำนวยการสถานศึกษา', 'ผอ.สถานศึกษา')})
                  </span>
                  <span className="inline-flex items-center whitespace-nowrap shrink-0 px-2 py-0.5 text-[11px] font-medium rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60">
                    {req.leaveType}
                  </span>
                </div>

                {req.reason && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[420px]" title={`สาเหตุ: ${req.reason}`}>
                    สาเหตุ: <span className="text-slate-700 dark:text-slate-300">{req.reason}</span>
                  </p>
                )}

                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 pt-0.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                  <span className="font-mono tabular-nums text-slate-700 dark:text-slate-300">
                    {req.startDate} – {req.endDate}
                  </span>
                  <span className="px-1.5 py-0.2 bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400 font-mono font-semibold tabular-nums rounded text-[11px]">
                    {req.totalDays} วันทำการ
                    {req.halfDay && req.halfDay !== 'full' && (
                      <span className="ml-1 text-[10px] text-amber-600 dark:text-amber-300 font-sans">
                        ({req.halfDay === 'morning' ? 'ครึ่งเช้า' : 'ครึ่งบ่าย'})
                      </span>
                    )}
                  </span>
                </div>
              </div>

              {/* Action Buttons: Decision within 2 seconds */}
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <Link
                  href={`/leave/print/${req.id}`}
                  target="_blank"
                  title="พิมพ์แบบฟอร์ม A4"
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 border border-slate-200/90 dark:bg-[#121822] dark:hover:bg-slate-800/70 dark:text-slate-300 dark:hover:text-white dark:border-slate-800/80 transition-colors duration-200"
                >
                  <Printer className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400 shrink-0" />
                  <span>พิมพ์ A4</span>
                </Link>

                <button
                  type="button"
                  onClick={() => handleOpenAction(req, 'approve')}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white border border-transparent transition-colors duration-200 cursor-pointer shadow-sm"
                >
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  <span>อนุมัติ</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenAction(req, 'reject')}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/20 transition-colors duration-200 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5 shrink-0" />
                  <span>ไม่อนุมัติ</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Modal Dialog */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-white dark:bg-[#121822] border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl p-6 text-slate-900 dark:text-slate-100 animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                {activeModal.action === 'approve' ? (
                  <div className="p-1.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Check className="w-4 h-4 shrink-0" />
                  </div>
                ) : (
                  <div className="p-1.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400">
                    <X className="w-4 h-4 shrink-0" />
                  </div>
                )}
                <h4 className="text-base font-semibold text-slate-900 dark:text-white">
                  ยืนยันการ{activeModal.action === 'approve' ? 'อนุมัติคำขอลา' : 'ไม่อนุมัติคำขอลา'}
                </h4>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/50 transition-colors duration-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 dark:bg-[#0b1016] p-4 rounded-lg border border-slate-200/90 dark:border-slate-800/80 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">ผู้ขอลา:</span>
                <span className="text-slate-900 dark:text-white font-medium">{activeModal.request.staffName} ({activeModal.request.position})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">ประเภทการลา:</span>
                <span className="text-sky-600 dark:text-sky-300 font-medium">{activeModal.request.leaveType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">ช่วงวันที่:</span>
                <span className="text-slate-700 dark:text-slate-200 font-mono tabular-nums">{activeModal.request.startDate} – {activeModal.request.endDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">จำนวนวันลา:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold tabular-nums">{activeModal.request.totalDays} วันทำการ</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                {activeModal.action === 'approve' ? 'ข้อคิดเห็นเพิ่มเติม (ถ้ามี):' : 'เหตุผลที่ไม่อนุมัติ (ระบุเพื่อแจ้งผู้ขอลา):'}
              </label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={3}
                placeholder={activeModal.action === 'approve' ? 'ระบุข้อคิดเห็นหรือคำสั่งการ...' : 'ระบุเหตุผลตามระเบียบราชการ...'}
                className="w-full bg-white dark:bg-[#0b1016] border border-slate-300 dark:border-slate-700/80 rounded-lg p-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-[#121822] dark:hover:bg-slate-800/70 dark:text-slate-300 dark:hover:text-white border border-slate-200 dark:border-slate-800/80 text-xs font-medium transition-colors duration-200"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                disabled={isSubmitting}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors duration-200 ${
                  activeModal.action === 'approve'
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white border border-transparent shadow-sm'
                    : 'bg-rose-600 hover:bg-rose-500 text-white border border-transparent shadow-sm'
                }`}
              >
                {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />}
                <span>ยืนยันการ{activeModal.action === 'approve' ? 'อนุมัติ' : 'ไม่อนุมัติ'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
