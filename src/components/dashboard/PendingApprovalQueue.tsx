'use client';

/**
 * ============================================================================
 * ManStat: Pending Approval Queue (Actionable Inbox)
 * ============================================================================
 * - For HR Admins and School Directors (Role-based access).
 * - Action-First Executive Inbox: Decide within 2 seconds.
 * - Live Server Database connection (/api/admin/leave)
 * - 1-Click Approve / Reject with remark input.
 * - Permanent Delete Action with Trash2 button & confirmation.
 * - Single-layer rows, crisp tabular-nums, zero decorative blur.
 * - Zero emojis, pure Lucide SVG icons, strict 8px gap.
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Check,
  X,
  Clock,
  Printer,
  ChevronRight,
  CheckCircle2,
  Loader2,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import type { LeaveRequestRecord } from '@/lib/data/schoolData';
import { formatPDPAProtectedLeaveReason } from '@/lib/auth/roles';

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
  requests?: LeaveRequestRecord[];
  currentUserId?: string;
  currentRole?: string;
  onActionComplete?: () => void;
  onViewAllHistory?: () => void;
}

export const PendingApprovalQueue: React.FC<PendingApprovalQueueProps> = ({
  requests: parentRequests,
  currentUserId = 'director-001',
  currentRole: propRole,
  onActionComplete,
  onViewAllHistory,
}) => {
  const [items, setItems] = useState<LeaveRequestRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionError, setActionError] = useState<string | null>(null);

  // Modal states
  const [activeModal, setActiveModal] = useState<{
    request: LeaveRequestRecord;
    action: 'approve' | 'reject' | 'delete';
  } | null>(null);

  const [remarks, setRemarks] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [resolvedRole, setResolvedRole] = useState<string>(propRole || 'teacher');

  useEffect(() => {
    if (propRole) setResolvedRole(propRole);
  }, [propRole]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedUser = localStorage.getItem('manstat_auth_user');
        const storedRole = localStorage.getItem('manstat_auth_role');
        if (storedUser) setCurrentUser(JSON.parse(storedUser));
        if (!propRole && storedRole) setResolvedRole(storedRole);
      } catch {}
    }
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.user) {
          setCurrentUser(res.user);
          if (!propRole && res.user.role) setResolvedRole(res.user.role);
        }
      })
      .catch(() => {});
  }, [propRole]);

  // Sync or fetch pending requests
  const loadPendingRequests = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/leave?status=pending');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setItems(json.data);
      }
    } catch (err) {
      console.error('[PendingApprovalQueue] Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (parentRequests) {
      setItems(parentRequests.filter((r) => r.status === 'pending'));
      setIsLoading(false);
    } else {
      loadPendingRequests();
    }
  }, [parentRequests]);

  const handleOpenAction = (request: LeaveRequestRecord, action: 'approve' | 'reject' | 'delete') => {
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
    setActionError(null);
    const { request, action } = activeModal;

    try {
      if (action === 'delete') {
        const res = await fetch(`/api/admin/leave?id=${encodeURIComponent(request.id)}`, {
          method: 'DELETE',
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'ไม่สามารถลบคำขอลาได้');
        }
        setItems((prev) => prev.filter((r) => r.id !== request.id));
      } else {
        const newStatus = action === 'approve' ? 'approved' : 'rejected';
        const defaultRemark = action === 'approve' ? 'อนุมัติผ่านระบบ ManStat' : 'ไม่อนุมัติตามดุลยพินิจ';
        const res = await fetch('/api/admin/leave', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: request.id,
            status: newStatus,
            directorRemark: remarks.trim() || defaultRemark,
            currentStep: 3,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'ไม่สามารถบันทึกการพิจารณาได้');
        }
        setItems((prev) => prev.filter((r) => r.id !== request.id));
      }

      handleCloseModal();
      if (onActionComplete) onActionComplete();
    } catch (err: any) {
      console.error('[PendingApprovalQueue] Action error:', err);
      setActionError(err?.message || 'เกิดข้อผิดพลาดในการดำเนินการ');
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
            {items.length} รายการ
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

      {actionError && (
        <div className="mx-5 mt-3 px-3.5 py-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between gap-2">
          <span>{actionError}</span>
          <button type="button" onClick={() => setActionError(null)} className="text-rose-500 hover:text-rose-700 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Loading & Empty States */}
      {isLoading ? (
        <div className="text-center py-10 px-4">
          <Loader2 className="w-6 h-6 text-sky-500 animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-500 dark:text-slate-400">กำลังโหลดรายการคำขอลา...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 px-4">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 dark:text-emerald-400 mx-auto mb-2 opacity-80" />
          <p className="text-sm text-slate-700 dark:text-slate-200 font-medium">ไม่มีรายการคำขอลาค้างพิจารณา</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">คำขอทั้งหมดได้รับการดำเนินการเรียบร้อยแล้ว</p>
        </div>
      ) : (
        /* Single-Layer Row List */
        <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
          {items.map((req) => (
            <div
              key={req.id}
              className="p-4 sm:px-5 hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-sm font-semibold text-slate-900 dark:text-white truncate max-w-[200px]" title={req.teacherName}>
                    {req.teacherName}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[140px]" title={req.position}>
                    ({req.position.replace('ผู้อำนวยการสถานศึกษา', 'ผอ.สถานศึกษา')})
                  </span>
                  <span className="inline-flex items-center whitespace-nowrap shrink-0 px-2 py-0.5 text-[11px] font-medium rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60">
                    {req.leaveTypeName}
                  </span>
                </div>

                {req.reason && (() => {
                  const protectedReason = formatPDPAProtectedLeaveReason(req, currentUser, resolvedRole);
                  return (
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[420px]" title={`สาเหตุ: ${protectedReason}`}>
                      สาเหตุ: <span className="text-slate-700 dark:text-slate-300">{protectedReason}</span>
                    </p>
                  );
                })()}

                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 pt-0.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                  <span className="font-mono tabular-nums text-slate-700 dark:text-slate-300">
                    {req.startDate} – {req.endDate}
                  </span>
                  <span className="px-1.5 py-0.2 bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400 font-mono font-semibold tabular-nums rounded text-[11px]">
                    {req.totalDays} วันทำการ
                  </span>
                  {req.substituteTeacherName && (
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 truncate max-w-[180px]">
                      ผู้สอนแทน: {req.substituteTeacherName}
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <Link
                  href={`/leave/print/${req.id}`}
                  target="_blank"
                  title="พิมพ์แบบฟอร์ม A4"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 border border-slate-200/90 dark:bg-[#121822] dark:hover:bg-slate-800/70 dark:text-slate-300 dark:hover:text-white dark:border-slate-800/80 transition-colors duration-200"
                >
                  <Printer className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400 shrink-0" />
                  <span>พิมพ์ A4</span>
                </Link>

                <button
                  type="button"
                  onClick={() => handleOpenAction(req, 'approve')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white border border-transparent transition-colors duration-200 cursor-pointer shadow-sm"
                >
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  <span>อนุมัติ</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenAction(req, 'reject')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/20 transition-colors duration-200 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5 shrink-0" />
                  <span>ไม่อนุมัติ</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenAction(req, 'delete')}
                  title="ลบคำขอลาออกจากระบบ"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 border border-transparent transition-colors duration-200 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 shrink-0" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action Dialog Modal */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-white dark:bg-[#121822] border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl p-6 text-slate-900 dark:text-slate-100 animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                {activeModal.action === 'approve' && (
                  <Check className="w-5 h-5 text-emerald-500" />
                )}
                {activeModal.action === 'reject' && (
                  <X className="w-5 h-5 text-rose-500" />
                )}
                {activeModal.action === 'delete' && (
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                )}
                <h3 className="font-semibold text-base">
                  {activeModal.action === 'approve' && 'ยืนยันการอนุมัติคำขอลา'}
                  {activeModal.action === 'reject' && 'ยืนยันการไม่อนุมัติคำขอลา'}
                  {activeModal.action === 'delete' && 'ยืนยันการลบคำขอลา'}
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {activeModal.action === 'delete' ? (
              <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
                <p>
                  คุณแน่ใจหรือไม่ว่าต้องการลบคำขอลาเลขที่{' '}
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {activeModal.request.docNo}
                  </span>{' '}
                  ของ{' '}
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {activeModal.request.teacherName}
                  </span>{' '}
                  ออกจากฐานข้อมูลเซิร์ฟเวอร์อย่างถาวร?
                </p>
                <p className="text-rose-500 dark:text-rose-400 text-[11px]">
                  การลบนี้จะถูกบันทึกใน PDPA Audit Logs และไม่สามารถกู้คืนได้
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#0b1016] border border-slate-200/80 dark:border-slate-800/80 space-y-1">
                    <div>
                      <span className="font-medium text-slate-500 dark:text-slate-400">ผู้ขอลา: </span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {activeModal.request.teacherName} ({activeModal.request.position})
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-slate-500 dark:text-slate-400">ประเภทการลา: </span>
                      <span className="text-slate-900 dark:text-white">{activeModal.request.leaveTypeName}</span>
                      <span className="ml-2 font-mono tabular-nums text-slate-500">
                        ({activeModal.request.startDate} – {activeModal.request.endDate}) รวม {activeModal.request.totalDays} วันทำการ
                      </span>
                    </div>
                    {activeModal.request.reason && (
                      <div>
                        <span className="font-medium text-slate-500 dark:text-slate-400">เหตุผล: </span>
                        <span>{formatPDPAProtectedLeaveReason(activeModal.request, currentUser, 'director')}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block font-medium mb-1 text-slate-700 dark:text-slate-300">
                      ความเห็นหรือข้อสั่งการของผู้อำนวยการสถานศึกษา (ทางเลือก):
                    </label>
                    <textarea
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder={
                        activeModal.action === 'approve'
                          ? 'เช่น อนุมัติ มอบหมายครูสอนแทนปฏิบัติหน้าที่ให้เรียบร้อย'
                          : 'ระบุเหตุผลในการไม่อนุมัติคำขอ...'
                      }
                      rows={3}
                      className="w-full text-xs p-2.5 rounded-lg bg-white dark:bg-[#0b1016] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 transition-colors disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                disabled={isSubmitting}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium text-white transition-colors disabled:opacity-50 ${
                  activeModal.action === 'approve'
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                {isSubmitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <span>
                    {activeModal.action === 'approve' && 'ยืนยันการอนุมัติ'}
                    {activeModal.action === 'reject' && 'ยืนยันการไม่อนุมัติ'}
                    {activeModal.action === 'delete' && 'ยืนยันการลบ'}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
