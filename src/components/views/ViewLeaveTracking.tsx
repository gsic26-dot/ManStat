'use client';

/**
 * ============================================================================
 * ManStat: ViewLeaveTracking (ติดตามสถานะคำร้องขอลาแบบ Step-by-Step)
 * ============================================================================
 * - Visual step timeline (Submission -> Supervisor Review -> Director Decision)
 * - Real-time tracking with document number (เลขที่หนังสือราชการ)
 * - Timeline status checks, timestamps, and signature verifications
 * - Direct link to QR verification route
 * - Zero Emojis, Pure Lucide SVG Icons, 8px Standard Spacing
 * ============================================================================
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Clock,
  Search,
  CheckCircle2,
  XCircle,
  UserCheck,
  QrCode,
  ShieldCheck,
  Printer,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { LeaveRequestRecord } from '@/lib/data/schoolData';
import { formatStaffName } from '@/lib/regulations/staff-formatting';
import { isAdminRole } from '@/lib/auth/roles';

interface ViewLeaveTrackingProps {
  onLeaveMutated?: () => void;
}

export function ViewLeaveTracking({ onLeaveMutated }: ViewLeaveTrackingProps) {
  const [requests, setRequests] = useState<LeaveRequestRecord[]>([]);
  const [searchDoc, setSearchDoc] = useState('');
  const [selectedReq, setSelectedReq] = useState<LeaveRequestRecord | null>(null);
  const [currentRole, setCurrentRole] = useState<string>('teacher');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const canManage = isAdminRole(currentRole);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedRole = localStorage.getItem('manstat_auth_role');
        if (storedRole) setCurrentRole(storedRole);
      } catch {}
    }

    let isMounted = true;
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((r) => r.json())
      .then((res) => {
        if (isMounted && res.success && res.user?.role) {
          setCurrentRole(res.user.role);
        }
      })
      .catch(() => {});

    fetch('/api/admin/leave', { cache: 'no-store' })
      .then((r) => r.json())
      .then((res) => {
        if (res.success && Array.isArray(res.data) && isMounted) {
          setRequests(res.data);
          if (res.data.length > 0) {
            setSelectedReq(res.data[0]);
          } else {
            setSelectedReq(null);
          }
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSelectReq = (req: LeaveRequestRecord) => {
    setSelectedReq(req);
  };

  const handleConfirmDeleteCurrent = async () => {
    if (!canManage || !selectedReq) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/leave?id=${encodeURIComponent(selectedReq.id)}`, {
        method: 'DELETE',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) return;

      const remaining = requests.filter((r) => r.id !== selectedReq.id);
      setRequests(remaining);
      setSelectedReq(remaining.length > 0 ? remaining[0] : null);
      setIsDeleteModalOpen(false);
      onLeaveMutated?.();
    } catch {
      // ignore
    } finally {
      setIsDeleting(false);
    }
  };

  const isRejected = selectedReq?.status === 'rejected';
  const isApproved = selectedReq?.status === 'approved';

  const steps = [
    {
      step: 1,
      title: 'ยื่นคำร้องขอลาเข้าระบบ',
      desc: 'ครูผู้ขอยื่นคำร้องและระบุผู้ปฏิบัติหน้าที่สอนแทน',
      time: selectedReq?.submittedAt
        ? new Date(selectedReq.submittedAt).toLocaleDateString('th-TH-u-nu-latn', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })
        : '',
      actor: selectedReq ? formatStaffName(selectedReq.teacherName || '-') : '-',
      state: 'done' as 'done' | 'rejected' | 'pending',
    },
    {
      step: 2,
      title: 'ผู้บังคับบัญชาชั้นต้นตรวจสอบ',
      desc: selectedReq?.supervisorRemark || 'ตรวจสอบภาระงานสอนและการส่งมอบหมายงาน',
      time:
        (selectedReq?.currentStep || 0) >= 2 || isApproved || isRejected
          ? 'ตรวจสอบเรียบร้อยแล้ว'
          : 'อยู่ระหว่างดำเนินการ',
      actor: 'หัวหน้ากลุ่มบริหารงานบุคคล / รองผู้อำนวยการ',
      state:
        (selectedReq?.currentStep || 0) >= 2 || isApproved || isRejected
          ? ('done' as const)
          : ('pending' as const),
    },
    {
      step: 3,
      title: 'ผู้อำนวยการสถานศึกษาพิจารณา',
      desc: selectedReq?.directorRemark || 'พิจารณาอนุมัติตามระเบียบสำนักนายกรัฐมนตรี',
      time: isRejected
        ? 'ไม่อนุมัติคำร้อง'
        : isApproved || (selectedReq?.currentStep || 0) >= 3
        ? 'พิจารณาอนุมัติแล้ว'
        : 'รอการลงนาม',
      actor: 'ผู้อำนวยการสถานศึกษา',
      state: isRejected
        ? ('rejected' as const)
        : isApproved || (selectedReq?.currentStep || 0) >= 3
        ? ('done' as const)
        : ('pending' as const),
    },
    {
      step: 4,
      title: 'บันทึกสารสนเทศและตรวจสอบ QR Code',
      desc: 'ลงทะเบียนสถิติวันลาและออกรหัสยืนยันความถูกต้องทางดิจิทัล',
      time: isApproved ? 'มีผลสมบูรณ์' : isRejected ? 'ไม่ได้รับการอนุมัติ' : 'รอดำเนินการ',
      actor: 'ระบบสารสนเทศ ManStat',
      state: isApproved ? ('done' as const) : isRejected ? ('rejected' as const) : ('pending' as const),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-[#141b24] p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <Clock className="w-5 h-5 text-sky-500 shrink-0" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">ติดตามสถานะคำร้องขอลา</h2>
        </div>
      </div>

      {requests.length === 0 ? (
        <div className="bg-white dark:bg-[#111822] p-12 rounded-2xl border border-slate-200/90 dark:border-slate-800 text-center shadow-sm">
          <div className="flex flex-col items-center justify-center gap-3 max-w-sm mx-auto">
            <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400">
              <Clock className="w-8 h-8" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">ยังไม่มีประวัติคำร้องขอลาในระบบ</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              เมื่อครูหรือบุคลากรยื่นคำร้องขอลาเข้าระบบแล้ว ท่านจะสามารถติดตามลำดับขั้นตอนและประวัติการลงนามอนุมัติได้ที่นี่
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Requests List / Selector */}
        <div className="lg:col-span-1 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="ค้นหาเลขที่หนังสือ หรือชื่อครู..."
              value={searchDoc}
              onChange={(e) => setSearchDoc(e.target.value)}
              className="w-full h-10 bg-white dark:bg-[#111822] border border-slate-200/90 dark:border-slate-700/80 rounded-xl pl-10 pr-3.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 transition-all"
            />
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {requests
              .filter(
                (r) =>
                  (r.docNo || '').toLowerCase().includes(searchDoc.toLowerCase()) ||
                  (r.teacherName || '').toLowerCase().includes(searchDoc.toLowerCase())
              )
              .map((r) => {
                const isSelected = selectedReq?.id === r.id;
                return (
                  <div
                    key={r.id}
                    onClick={() => handleSelectReq(r)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-sky-50/70 border-sky-500 dark:bg-[#182332]'
                        : 'bg-white border-slate-200/90 hover:border-slate-300 dark:bg-[#111822] dark:border-slate-800 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-sky-400 truncate">{r.docNo}</span>
                      <span
                        className={`inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 px-2.5 py-0.5 text-xs font-medium rounded-full ${
                          r.status === 'approved'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : r.status === 'pending'
                            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {r.status === 'approved'
                          ? 'อนุมัติแล้ว'
                          : r.status === 'pending'
                          ? 'รอพิจารณา'
                          : 'ไม่อนุมัติ'}
                      </span>
                    </div>

                    <div className="mt-2 text-xs font-semibold text-slate-900 dark:text-white">{formatStaffName(r.teacherName)}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {r.leaveTypeName} ({r.totalDays} วัน) •{' '}
                      {new Date(r.startDate).toLocaleDateString('th-TH', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Right Column: Detailed Workflow Stepper */}
        {selectedReq && (
          <div className="lg:col-span-2 space-y-4">
            {/* Overview Card */}
            <div className="bg-white dark:bg-[#111822] p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/90 dark:border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sky-400 text-sm">{selectedReq.docNo}</span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-sky-500/15 text-sky-300 border border-sky-500/30">
                      {selectedReq.leaveTypeName}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1 truncate max-w-[280px]" title={formatStaffName(selectedReq.teacherName)}>{formatStaffName(selectedReq.teacherName)}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[320px]" title={`${selectedReq.position || ''} • ${selectedReq.department || ''}`}>
                    {(selectedReq.position || '-').replace('ผู้อำนวยการสถานศึกษา', 'ผอ.สถานศึกษา')} • {(selectedReq.department || '-').replace('สายงานบริหารและสนับสนุนการศึกษา', 'บริหารและสนับสนุนฯ')}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/leave/print/${selectedReq.id}`}
                    target="_blank"
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 border border-slate-200/90 dark:bg-[#121822] dark:hover:bg-slate-800/70 dark:text-slate-300 dark:hover:text-white dark:border-slate-800/80 text-xs font-medium transition-colors duration-200"
                  >
                    <Printer className="w-3.5 h-3.5 shrink-0" />
                    <span>พิมพ์ใบลา</span>
                  </Link>
                  <Link
                    href={`/verify/leave/${encodeURIComponent(selectedReq.docNo || selectedReq.id)}`}
                    target="_blank"
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white border border-transparent text-xs font-medium transition-colors duration-200"
                  >
                    <QrCode className="w-3.5 h-3.5 shrink-0" />
                    <span>สแกน QR</span>
                  </Link>
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => setIsDeleteModalOpen(true)}
                      title="ลบคำร้องนี้"
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 dark:text-rose-400 border border-rose-500/20 text-xs font-medium transition-colors duration-200 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 shrink-0" />
                      <span>ลบคำร้อง</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Stepper Timeline */}
              <div className="mt-6 space-y-6">
                {steps.map((s, idx) => (
                  <div key={s.step} className="flex items-start gap-4 relative">
                    {/* Connecting line */}
                    {idx < steps.length - 1 && (
                      <div
                        className={`absolute left-4 top-8 bottom-0 w-0.5 ${
                          s.state === 'done'
                            ? 'bg-sky-500'
                            : s.state === 'rejected'
                            ? 'bg-rose-500'
                            : 'bg-slate-200 dark:bg-slate-800'
                        }`}
                        style={{ height: 'calc(100% + 8px)' }}
                      />
                    )}

                    {/* Step Icon */}
                    <div
                      className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${
                        s.state === 'done'
                          ? 'bg-sky-500 text-white border-sky-400'
                          : s.state === 'rejected'
                          ? 'bg-rose-500 text-white border-rose-400'
                          : 'bg-slate-100 dark:bg-[#151c27] text-slate-400 dark:text-slate-500 border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {s.state === 'done' ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                      ) : s.state === 'rejected' ? (
                        <XCircle className="w-4 h-4 shrink-0" />
                      ) : (
                        <span className="text-xs font-mono font-bold">{s.step}</span>
                      )}
                    </div>

                    {/* Step Details */}
                    <div className="flex-1 bg-slate-50/90 dark:bg-[#141d28] p-3.5 rounded-xl border border-slate-200/90 dark:border-slate-800/80">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">{s.title}</h4>
                        <span
                          className={`text-[11px] font-mono ${
                            s.state === 'rejected'
                              ? 'text-rose-500 dark:text-rose-400 font-semibold'
                              : 'text-slate-400'
                          }`}
                        >
                          {s.time}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{s.desc}</p>
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-200/80 dark:border-slate-800/60 text-[11px] text-slate-500 dark:text-slate-400">
                        <UserCheck className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                        <span>ผู้ดำเนินการ: {s.actor}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Regulatory Notice Banner */}
            <div className="bg-sky-50 dark:bg-[#131b26] p-4 rounded-xl border border-sky-200 dark:border-slate-800 flex items-start gap-3 text-xs text-slate-700 dark:text-slate-300">
              <ShieldCheck className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">มาตรฐานความปลอดภัยและการตรวจสอบดิจิทัล</p>
                <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                  ทุกขั้นตอนการอนุมัติถูกบันทึกรหัสตรวจสอบพร้อมเวลาแบบ Real-time ลงในระบบ ไม่สามารถแก้ไขย้อนหลังโดยพลการตามระเบียบสำนักนายกรัฐมนตรีฯ
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
      )}

      {/* Delete Confirmation Modal (Admin Only) */}
      {isDeleteModalOpen && selectedReq && canManage && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={() => !isDeleting && setIsDeleteModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-[#141d27] border border-slate-200/90 dark:border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-slate-800 dark:text-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>ยืนยันการลบคำร้องขอลา</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              คุณแน่ใจหรือไม่ว่าต้องการลบคำร้องเลขที่ <span className="font-mono font-semibold text-slate-900 dark:text-white">{selectedReq.docNo}</span> ของ {formatStaffName(selectedReq.teacherName || '-')} ออกจากฐานข้อมูล?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/90 dark:border-slate-800">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 text-xs font-medium cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDeleteCurrent}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? 'กำลังลบ...' : 'ลบคำร้อง'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
