'use client';

/**
 * ============================================================================
 * ManStat-Modern: ViewLeaveRequests (รายการคำร้องและประวัติการลา)
 * ============================================================================
 * - Tabular view of all leave requests (Pending, Approved, Rejected)
 * - Filtering by status, leave type, and teacher name search
 * - Direct link to print official A4 with QR code (/leave/print/[id])
 * - Direct approval / rejection actions for Supervisor / Director
 * - Zero Emojis, Pure Lucide SVG Icons, 8px Standard Spacing
 * ============================================================================
 */

import { useState } from 'react';
import Link from 'next/link';
import {
  FileText,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  Printer,
  Eye,
  AlertCircle,
  FileCheck,
  Trash2,
  X,
} from 'lucide-react';
import { INITIAL_LEAVE_REQUESTS, LeaveRequestRecord } from '@/lib/data/schoolData';

interface ViewLeaveRequestsProps {
  onOpenSubmitModal?: () => void;
}

export function ViewLeaveRequests({ onOpenSubmitModal }: ViewLeaveRequestsProps) {
  const [requests, setRequests] = useState<LeaveRequestRecord[]>(INITIAL_LEAVE_REQUESTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'pending' | 'approved' | 'rejected'>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'sick' | 'personal' | 'vacation'>('ALL');
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequestRecord | null>(null);

  const filteredRequests = requests.filter((req) => {
    const matchesSearch =
      req.teacherName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.docNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.reason.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || req.status === statusFilter;
    const matchesType = typeFilter === 'ALL' || req.leaveType === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const handleApprove = (id: string) => {
    setRequests((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status: 'approved',
              currentStep: 3,
              directorRemark: 'อนุมัติผ่านระบบ ManStat-Modern',
            }
          : r
      )
    );
    if (selectedRequest?.id === id) {
      setSelectedRequest((prev) =>
        prev
          ? {
              ...prev,
              status: 'approved',
              currentStep: 3,
              directorRemark: 'อนุมัติผ่านระบบ ManStat-Modern',
            }
          : null
      );
    }
  };

  const handleReject = (id: string) => {
    const reason = prompt('กรุณาระบุเหตุผลการไม่อนุมัติ:');
    if (reason === null) return;
    setRequests((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status: 'rejected',
              directorRemark: `ไม่อนุมัติ: ${reason || 'ภาระงานไม่เอื้ออำนวย'}`,
            }
          : r
      )
    );
    if (selectedRequest?.id === id) {
      setSelectedRequest((prev) =>
        prev
          ? {
              ...prev,
              status: 'rejected',
              directorRemark: `ไม่อนุมัติ: ${reason || 'ภาระงานไม่เอื้ออำนวย'}`,
            }
          : null
      );
    }
  };

  const handleDelete = (id: string, docNo: string) => {
    if (confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบคำร้องเลขที่ ${docNo} ออกจากระบบ?`)) {
      setRequests((prev) => prev.filter((r) => r.id !== id));
      if (selectedRequest?.id === id) {
        setSelectedRequest(null);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#141b24] p-5 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-sky-400 text-xs font-semibold uppercase tracking-wider">
            <FileText className="w-4 h-4 shrink-0" />
            <span>Leave Request Management</span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1">รายการคำร้องและประวัติการลา</h2>
          <p className="text-xs text-slate-400 mt-1">
            ตรวจสอบ อนุมัติ และพิมพ์แบบฟอร์มใบลาราชการมาตรฐาน A4 พร้อมระบบตรวจสอบ QR Code
          </p>
        </div>

        {onOpenSubmitModal && (
          <button
            type="button"
            onClick={onOpenSubmitModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium border border-transparent transition-colors duration-200"
          >
            <FileCheck className="w-4 h-4 shrink-0" />
            <span>ยื่นคำร้องขอลาใหม่</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar (Standard 40px Height) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="ค้นหาชื่อครู, เลขที่หนังสือ, เหตุผลการลา..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 bg-[#111822] border border-slate-700/80 rounded-xl pl-10 pr-3.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 transition-all"
          />
        </div>

        <div className="h-10 flex items-center gap-2 bg-[#111822] border border-slate-700/80 rounded-xl px-3 text-xs text-slate-200 focus-within:border-sky-500 transition-all">
          <Filter className="w-4 h-4 text-sky-400 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'pending' | 'approved' | 'rejected')}
            className="w-full bg-transparent text-slate-200 focus:outline-none cursor-pointer"
          >
            <option value="ALL" className="bg-[#171a21]">สถานะทั้งหมด</option>
            <option value="pending" className="bg-[#171a21]">รอการอนุมัติ (Pending)</option>
            <option value="approved" className="bg-[#171a21]">อนุมัติแล้ว (Approved)</option>
            <option value="rejected" className="bg-[#171a21]">ไม่อนุมัติ (Rejected)</option>
          </select>
        </div>

        <div className="h-10 flex items-center bg-[#111822] border border-slate-700/80 rounded-xl px-3 text-xs text-slate-200 focus-within:border-sky-500 transition-all">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as 'ALL' | 'sick' | 'personal' | 'vacation')}
            className="w-full bg-transparent text-slate-200 focus:outline-none cursor-pointer"
          >
            <option value="ALL" className="bg-[#171a21]">ประเภทการลาทั้งหมด</option>
            <option value="sick" className="bg-[#171a21]">ลาป่วย</option>
            <option value="personal" className="bg-[#171a21]">ลากิจส่วนตัว</option>
            <option value="vacation" className="bg-[#171a21]">ลาพักผ่อน</option>
          </select>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-[#111822] rounded-2xl border border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#16202c] text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 min-w-[160px]">เลขที่หนังสือ / วันที่ยื่น</th>
                <th className="px-4 py-3 min-w-[190px]">ผู้ขอลา / ตำแหน่ง</th>
                <th className="px-4 py-3 min-w-[140px]">ประเภท / จำนวนวัน</th>
                <th className="px-4 py-3 min-w-[140px]">ช่วงเวลาการลา</th>
                <th className="px-4 py-3 min-w-[160px]">ครูผู้สอนแทน</th>
                <th className="px-4 py-3 text-center min-w-[125px]">สถานะ</th>
                <th className="px-4 py-3 text-center min-w-[110px]">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle className="w-6 h-6 text-slate-600" />
                      <span>ไม่พบข้อมูลรายการคำร้องขอลา</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => {
                  const posDisplay = req.position.replace('ผู้อำนวยการสถานศึกษา', 'ผอ.สถานศึกษา');
                  return (
                    <tr key={req.id} className="hover:bg-[#162231]/50 transition-colors">
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="font-mono font-medium text-sky-400">{req.docNo}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {new Date(req.submittedAt).toLocaleDateString('th-TH', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-white truncate max-w-[170px]" title={req.teacherName}>{req.teacherName}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[170px]" title={req.position}>{posDisplay}</div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium border ${
                            req.leaveType === 'sick'
                              ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                              : req.leaveType === 'personal'
                              ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                              : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                          }`}
                        >
                          {req.leaveTypeName}
                        </span>
                        <div className="text-[11px] font-semibold text-slate-300 mt-1 font-mono">
                          {req.totalDays} วันทำการ
                        </div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap font-mono text-[11px]">
                        <div className="text-slate-200">
                          {new Date(req.startDate).toLocaleDateString('th-TH', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                        <div className="text-slate-500">
                          ถึง{' '}
                          {new Date(req.endDate).toLocaleDateString('th-TH', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-300">
                        <div className="truncate max-w-[150px]" title={req.substituteTeacherName || '-'}>
                          {req.substituteTeacherName || '-'}
                        </div>
                      </td>
                    <td className="px-4 py-3.5 text-center">
                      {req.status === 'approved' && (
                        <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 min-w-[100px]">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          <span>อนุมัติแล้ว</span>
                        </span>
                      )}
                      {req.status === 'pending' && (
                        <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 min-w-[100px]">
                          <Clock className="w-3.5 h-3.5 shrink-0" />
                          <span>รอพิจารณา</span>
                        </span>
                      )}
                      {req.status === 'rejected' && (
                        <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30 min-w-[100px]">
                          <XCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>ไม่อนุมัติ</span>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedRequest(req)}
                          title="ดูรายละเอียด"
                          className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors duration-200"
                        >
                          <Eye className="w-4 h-4 shrink-0" />
                        </button>
                        <Link
                          href={`/leave/print/${req.id}`}
                          target="_blank"
                          title="พิมพ์แบบฟอร์ม A4"
                          className="p-1.5 rounded-md text-slate-400 hover:text-sky-300 hover:bg-slate-800/50 transition-colors duration-200"
                        >
                          <Printer className="w-4 h-4 shrink-0" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDelete(req.id, req.docNo)}
                          title="ลบคำร้อง"
                          className="p-1.5 rounded-md text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors duration-200"
                        >
                          <Trash2 className="w-4 h-4 shrink-0" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details & Action Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="bg-[#141d27] border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-sky-400 font-bold text-sm">
                <FileText className="w-4 h-4 shrink-0" />
                <span>รายละเอียดคำร้องขอลา ({selectedRequest.docNo})</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors duration-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="grid grid-cols-2 gap-2 bg-[#0e141c] p-3 rounded-lg border border-slate-800">
                <div>
                  <span className="text-slate-500">ผู้ขอลา:</span>
                  <p className="font-semibold text-white mt-0.5">{selectedRequest.teacherName}</p>
                </div>
                <div>
                  <span className="text-slate-500">สังกัด / กลุ่มสาระ:</span>
                  <p className="font-medium text-slate-200 mt-0.5">{selectedRequest.department}</p>
                </div>
                <div>
                  <span className="text-slate-500">ประเภทการลา:</span>
                  <p className="font-medium text-sky-300 mt-0.5">
                    {selectedRequest.leaveTypeName} ({selectedRequest.totalDays} วัน)
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">ผู้ปฏิบัติหน้าที่แทน:</span>
                  <p className="font-medium text-slate-200 mt-0.5">{selectedRequest.substituteTeacherName}</p>
                </div>
              </div>

              <div>
                <span className="text-slate-500 block mb-1">เหตุผลและความจำเป็น:</span>
                <p className="bg-[#0e141c] p-3 rounded-lg border border-slate-800 text-slate-200">
                  {selectedRequest.reason}
                </p>
              </div>

              {selectedRequest.supervisorRemark && (
                <div>
                  <span className="text-slate-500 block mb-1">ความเห็นผู้บังคับบัญชาชั้นต้น:</span>
                  <p className="bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-lg text-amber-200">
                    {selectedRequest.supervisorRemark}
                  </p>
                </div>
              )}

              {selectedRequest.directorRemark && (
                <div>
                  <span className="text-slate-500 block mb-1">คำสั่งผู้อำนวยการ:</span>
                  <p className="bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-lg text-emerald-200">
                    {selectedRequest.directorRemark}
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <div className="flex items-center gap-2">
                <Link
                  href={`/leave/print/${selectedRequest.id}`}
                  target="_blank"
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#121822] hover:bg-slate-800/70 text-slate-300 hover:text-white border border-slate-800/80 text-xs font-medium transition-colors duration-200"
                >
                  <Printer className="w-3.5 h-3.5 shrink-0" />
                  <span>พิมพ์ใบลา A4</span>
                </Link>
                <button
                  type="button"
                  onClick={() => handleDelete(selectedRequest.id, selectedRequest.docNo)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-medium transition-colors duration-200"
                >
                  <Trash2 className="w-3.5 h-3.5 shrink-0" />
                  <span>ลบคำร้อง</span>
                </button>
              </div>

              {selectedRequest.status === 'pending' ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleReject(selectedRequest.id)}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-medium transition-colors duration-200"
                  >
                    <XCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>ไม่อนุมัติ</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApprove(selectedRequest.id)}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-600/90 hover:bg-emerald-500 text-white border border-transparent text-xs font-medium transition-colors duration-200"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>อนุมัติคำร้อง</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setSelectedRequest(null)}
                  className="px-4 py-2 rounded-lg bg-[#121822] hover:bg-slate-800/70 text-slate-300 hover:text-white border border-slate-800/80 text-xs font-medium transition-colors duration-200"
                >
                  ปิดหน้าต่าง
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
