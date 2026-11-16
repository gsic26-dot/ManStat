'use client';

/**
 * ============================================================================
 * ManStat-Modern: ViewLeaveTracking (ติดตามสถานะคำร้องขอลาแบบ Step-by-Step)
 * ============================================================================
 * - Visual step timeline (Submission -> Supervisor Review -> Director Decision)
 * - Real-time tracking with document number (เลขที่หนังสือราชการ)
 * - Timeline status checks, timestamps, and signature verifications
 * - Direct link to QR verification route
 * - Zero Emojis, Pure Lucide SVG Icons, 8px Standard Spacing
 * ============================================================================
 */

import { useState } from 'react';
import Link from 'next/link';
import {
  Clock,
  Search,
  CheckCircle2,
  UserCheck,
  QrCode,
  ShieldCheck,
  Printer,
  Trash2,
} from 'lucide-react';
import { INITIAL_LEAVE_REQUESTS, LeaveRequestRecord } from '@/lib/data/schoolData';

export function ViewLeaveTracking() {
  const [requests, setRequests] = useState<LeaveRequestRecord[]>(INITIAL_LEAVE_REQUESTS);
  const [searchDoc, setSearchDoc] = useState('');
  const [selectedReq, setSelectedReq] = useState<LeaveRequestRecord | null>(requests[1] || requests[0] || null);

  const handleSelectReq = (req: LeaveRequestRecord) => {
    setSelectedReq(req);
  };

  const handleDeleteCurrent = () => {
    if (!selectedReq) return;
    if (confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบคำร้องเลขที่ ${selectedReq.docNo} ของ ${selectedReq.teacherName}?`)) {
      const remaining = requests.filter((r) => r.id !== selectedReq.id);
      setRequests(remaining);
      setSelectedReq(remaining.length > 0 ? remaining[0] : null);
    }
  };

  const steps = [
    {
      step: 1,
      title: 'ยื่นคำร้องขอลาเข้าระบบ',
      desc: 'ครูผู้ขอยื่นคำร้องและระบุผู้ปฏิบัติหน้าที่สอนแทน',
      time: selectedReq ? selectedReq.submittedAt : '',
      actor: selectedReq ? selectedReq.teacherName : '-',
      done: true,
    },
    {
      step: 2,
      title: 'ผู้บังคับบัญชาชั้นต้นตรวจสอบ',
      desc: selectedReq?.supervisorRemark || 'ตรวจสอบภาระงานสอนและการส่งมอบหมายงาน',
      time: selectedReq?.currentStep && selectedReq.currentStep >= 2 ? 'ตรวจสอบเรียบร้อยแล้ว' : 'อยู่ระหว่างดำเนินการ',
      actor: 'หัวหน้ากลุ่มบริหารงานบุคคล / รองผู้อำนวยการ',
      done: (selectedReq?.currentStep || 0) >= 2,
    },
    {
      step: 3,
      title: 'ผู้อำนวยการสถานศึกษาพิจารณา',
      desc: selectedReq?.directorRemark || 'พิจารณาอนุมัติตามระเบียบสำนักนายกรัฐมนตรี',
      time: selectedReq?.currentStep && selectedReq.currentStep >= 3 ? 'พิจารณาอนุมัติแล้ว' : 'รอการลงนาม',
      actor: 'นายธีรศักดิ์ มโนธรรม (ผอ.สถานศึกษา)',
      done: (selectedReq?.currentStep || 0) >= 3,
    },
    {
      step: 4,
      title: 'บันทึกสารสนเทศและตรวจสอบ QR Code',
      desc: 'ลงทะเบียนสถิติวันลาและออกรหัสยืนยันความถูกต้องทางดิจิทัล',
      time: selectedReq?.status === 'approved' ? 'มีผลสมบูรณ์' : 'รอดำเนินการ',
      actor: 'ระบบสารสนเทศ ManStat-Modern',
      done: selectedReq?.status === 'approved',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#141b24] p-5 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-2 text-sky-400 text-xs font-semibold uppercase tracking-wider">
          <Clock className="w-4 h-4 shrink-0" />
          <span>Leave Request Workflow Tracker</span>
        </div>
        <h2 className="text-xl font-bold text-white mt-1">ติดตามสถานะคำร้องขอลา</h2>
        <p className="text-xs text-slate-400 mt-1">
          ระบบตรวจสอบเส้นทางเอกสารและขั้นตอนการอนุมัติแบบโปร่งใส (Workflow Transparency Engine)
        </p>
      </div>

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
              className="w-full h-10 bg-[#111822] border border-slate-700/80 rounded-xl pl-10 pr-3.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 transition-all"
            />
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {requests
              .filter(
                (r) =>
                  r.docNo.toLowerCase().includes(searchDoc.toLowerCase()) ||
                  r.teacherName.toLowerCase().includes(searchDoc.toLowerCase())
              )
              .map((r) => {
                const isSelected = selectedReq?.id === r.id;
                return (
                  <div
                    key={r.id}
                    onClick={() => handleSelectReq(r)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#182332] border-sky-500 shadow-md shadow-sky-950/40'
                        : 'bg-[#111822] border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-sky-400">{r.docNo}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                          r.status === 'approved'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : r.status === 'pending'
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-rose-500/20 text-rose-300'
                        }`}
                      >
                        {r.status === 'approved'
                          ? 'อนุมัติแล้ว'
                          : r.status === 'pending'
                          ? 'กำลังดำเนินการ'
                          : 'ไม่อนุมัติ'}
                      </span>
                    </div>

                    <div className="mt-2 text-xs font-semibold text-white">{r.teacherName}</div>
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
            <div className="bg-[#111822] p-5 rounded-2xl border border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sky-400 text-sm">{selectedReq.docNo}</span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-sky-500/15 text-sky-300 border border-sky-500/30">
                      {selectedReq.leaveTypeName}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-1">{selectedReq.teacherName}</h3>
                  <p className="text-xs text-slate-400">
                    {selectedReq.position} • {selectedReq.department}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/leave/print/${selectedReq.id}`}
                    target="_blank"
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5 shrink-0" />
                    <span>พิมพ์ใบลา</span>
                  </Link>
                  <Link
                    href={`/verify/leave/${encodeURIComponent(selectedReq.docNo)}`}
                    target="_blank"
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition-colors shadow-sm"
                  >
                    <QrCode className="w-3.5 h-3.5 shrink-0" />
                    <span>สแกน QR</span>
                  </Link>
                  <button
                    type="button"
                    onClick={handleDeleteCurrent}
                    title="ลบคำร้องนี้"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5 shrink-0" />
                    <span>ลบคำร้อง</span>
                  </button>
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
                          s.done ? 'bg-sky-500' : 'bg-slate-800'
                        }`}
                        style={{ height: 'calc(100% + 8px)' }}
                      />
                    )}

                    {/* Step Icon */}
                    <div
                      className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${
                        s.done
                          ? 'bg-sky-500 text-white border-sky-400 shadow-md shadow-sky-500/20'
                          : 'bg-[#151c27] text-slate-500 border-slate-700'
                      }`}
                    >
                      {s.done ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                      ) : (
                        <span className="text-xs font-mono font-bold">{s.step}</span>
                      )}
                    </div>

                    {/* Step Details */}
                    <div className="flex-1 bg-[#141d28] p-3.5 rounded-xl border border-slate-800/80">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-white">{s.title}</h4>
                        <span className="text-[11px] font-mono text-slate-400">{s.time}</span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1">{s.desc}</p>
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-800/60 text-[11px] text-slate-400">
                        <UserCheck className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                        <span>ผู้ดำเนินการ: {s.actor}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Regulatory Notice Banner */}
            <div className="bg-[#131b26] p-4 rounded-xl border border-slate-800 flex items-start gap-3 text-xs text-slate-300">
              <ShieldCheck className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-white">มาตรฐานความปลอดภัยและการตรวจสอบดิจิทัล</p>
                <p className="text-slate-400 mt-0.5">
                  ทุกขั้นตอนการอนุมัติถูกบันทึกรหัสตรวจสอบพร้อมเวลาแบบ Real-time ลงในระบบ ไม่สามารถแก้ไขย้อนหลังโดยพลการตามระเบียบสำนักนายกรัฐมนตรีฯ
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
