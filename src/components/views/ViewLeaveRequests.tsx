'use client';

/**
 * ============================================================================
 * ManStat: ViewLeaveRequests (รายการคำร้องและประวัติการลา)
 * ============================================================================
 * - Tabular view of all leave requests (Pending, Approved, Rejected)
 * - Filtering by status, leave type, and teacher name search
 * - Direct link to print official A4 with QR code (/leave/print/[id])
 * - Direct approval / rejection actions for Supervisor / Director
 * - Zero Emojis, Pure Lucide SVG Icons, 8px Standard Spacing
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
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
  ChevronRight,
  QrCode,
} from 'lucide-react';
import { LeaveRequestRecord, TeacherRecord } from '@/lib/data/schoolData';
import { formatStaffName } from '@/lib/regulations/staff-formatting';
import { formatPDPAProtectedLeaveReason, isCivilServantForSalary } from '@/lib/auth/roles';

interface ViewLeaveRequestsProps {
  onOpenSubmitModal?: () => void;
}

export function ViewLeaveRequests({ onOpenSubmitModal }: ViewLeaveRequestsProps) {
  const [requests, setRequests] = useState<LeaveRequestRecord[]>([]);
  const [teachersList, setTeachersList] = useState<TeacherRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'pending' | 'approved' | 'rejected'>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'sick' | 'personal' | 'vacation'>('ALL');
  const [employmentFilter, setEmploymentFilter] = useState<'ALL' | 'civil_servant' | 'temporary_employee'>('ALL');
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequestRecord | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentRole, setCurrentRole] = useState<string>('teacher');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedRole = localStorage.getItem('manstat_auth_role');
        const storedUser = localStorage.getItem('manstat_auth_user');
        if (storedRole) setCurrentRole(storedRole);
        if (storedUser) setCurrentUser(JSON.parse(storedUser));
      } catch {}
    }
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.user) {
          setCurrentUser(res.user);
          setCurrentRole(res.user.role || 'teacher');
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let isMounted = true;
    fetch('/api/admin/leave')
      .then((r) => r.json())
      .then((res) => {
        if (res.success && Array.isArray(res.data) && isMounted) {
          setRequests(res.data);
        }
      })
      .catch(() => {});

    fetch('/api/admin/staff', { cache: 'no-store' })
      .then((r) => r.json())
      .then((res) => {
        if (res.success && Array.isArray(res.data) && isMounted) {
          setTeachersList(res.data);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const filteredRequests = requests.filter((req) => {
    const matchesSearch =
      req.teacherName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.docNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.reason.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || req.status === statusFilter;
    const matchesType = typeFilter === 'ALL' || req.leaveType === typeFilter;

    let matchesEmployment = true;
    if (employmentFilter !== 'ALL') {
      const matchStaff = teachersList.find((t) => t.id === req.teacherId || t.employeeCode === req.teacherId);
      const isCivil = matchStaff
        ? ((matchStaff.employment_type || (matchStaff as any).employmentType) ? (matchStaff.employment_type || (matchStaff as any).employmentType) === 'civil_servant' : isCivilServantForSalary(matchStaff))
        : !['STF-001', 'STF-002', 'STF-003', 'TCH-014'].includes(req.teacherId);
      matchesEmployment = employmentFilter === 'civil_servant' ? isCivil : !isCivil;
    }

    return matchesSearch && matchesStatus && matchesType && matchesEmployment;
  });

  const handleApprove = async (id: string) => {
    try {
      await fetch('/api/admin/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          status: 'approved',
          currentStep: 3,
          directorRemark: 'อนุมัติผ่านระบบ ManStat',
        }),
      });
    } catch {}
    setRequests((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status: 'approved',
              currentStep: 3,
              directorRemark: 'อนุมัติผ่านระบบ ManStat',
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
              directorRemark: 'อนุมัติผ่านระบบ ManStat',
            }
          : null
      );
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('กรุณาระบุเหตุผลการไม่อนุมัติ:');
    if (reason === null) return;
    const remark = `ไม่อนุมัติ: ${reason || 'ภาระงานไม่เอื้ออำนวย'}`;
    try {
      await fetch('/api/admin/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          status: 'rejected',
          currentStep: 3,
          directorRemark: remark,
        }),
      });
    } catch {}
    setRequests((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status: 'rejected',
              directorRemark: remark,
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
              directorRemark: remark,
            }
          : null
      );
    }
  };

  const handleDelete = async (id: string, docNo: string) => {
    if (confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบคำร้องเลขที่ ${docNo} ออกจากระบบฐานข้อมูล?`)) {
      try {
        await fetch(`/api/admin/leave?id=${id}`, {
          method: 'DELETE',
        });
      } catch {}
      setRequests((prev) => prev.filter((r) => r.id !== id));
      if (selectedRequest?.id === id) {
        setSelectedRequest(null);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#141b24] p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <FileText className="w-5 h-5 text-sky-500 shrink-0" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">รายการคำร้องและประวัติการลา</h2>
        </div>
      </div>

      {/* Filter and Search Bar (Standard 40px Height) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="ค้นหาชื่อครู, เลขที่หนังสือ, เหตุผลการลา..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 bg-white dark:bg-[#111822] border border-slate-200/90 dark:border-slate-700/80 rounded-xl pl-10 pr-3.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 transition-all"
          />
        </div>

        <div className="h-10 flex items-center bg-white dark:bg-[#111822] border border-slate-200/90 dark:border-slate-700/80 rounded-xl px-3 text-xs text-slate-800 dark:text-slate-200 focus-within:border-sky-500 transition-all">
          <select
            value={employmentFilter}
            onChange={(e) => setEmploymentFilter(e.target.value as 'ALL' | 'civil_servant' | 'temporary_employee')}
            className="w-full bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer font-medium"
          >
            <option value="ALL" className="bg-white dark:bg-[#171a21] text-slate-900 dark:text-slate-100">บุคลากรทุกประเภท</option>
            <option value="civil_servant" className="bg-white dark:bg-[#171a21] text-slate-900 dark:text-slate-100">ข้าราชการครู</option>
            <option value="temporary_employee" className="bg-white dark:bg-[#171a21] text-slate-900 dark:text-slate-100">ลูกจ้าง / สายสนับสนุน</option>
          </select>
        </div>

        <div className="h-10 flex items-center gap-2 bg-white dark:bg-[#111822] border border-slate-200/90 dark:border-slate-700/80 rounded-xl px-3 text-xs text-slate-800 dark:text-slate-200 focus-within:border-sky-500 transition-all">
          <Filter className="w-4 h-4 text-slate-400 dark:text-sky-400 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'pending' | 'approved' | 'rejected')}
            className="w-full bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
          >
            <option value="ALL" className="bg-white dark:bg-[#171a21] text-slate-900 dark:text-slate-100">สถานะทั้งหมด</option>
            <option value="pending" className="bg-white dark:bg-[#171a21] text-slate-900 dark:text-slate-100">รออนุมัติ</option>
            <option value="approved" className="bg-white dark:bg-[#171a21] text-slate-900 dark:text-slate-100">อนุมัติแล้ว</option>
            <option value="rejected" className="bg-white dark:bg-[#171a21] text-slate-900 dark:text-slate-100">ไม่อนุมัติ</option>
          </select>
        </div>

        <div className="h-10 flex items-center bg-white dark:bg-[#111822] border border-slate-200/90 dark:border-slate-700/80 rounded-xl px-3 text-xs text-slate-800 dark:text-slate-200 focus-within:border-sky-500 transition-all">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as 'ALL' | 'sick' | 'personal' | 'vacation')}
            className="w-full bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
          >
            <option value="ALL" className="bg-white dark:bg-[#171a21] text-slate-900 dark:text-slate-100">ทุกประเภทการลา</option>
            <option value="sick" className="bg-white dark:bg-[#171a21] text-slate-900 dark:text-slate-100">ลาป่วย</option>
            <option value="personal" className="bg-white dark:bg-[#171a21] text-slate-900 dark:text-slate-100">ลากิจส่วนตัว</option>
            <option value="vacation" className="bg-white dark:bg-[#171a21] text-slate-900 dark:text-slate-100">ลาพักผ่อน</option>
          </select>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white dark:bg-[#111822] rounded-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="w-full">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-[#16202c] text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200/90 dark:border-slate-800 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="w-10 px-3 py-3 text-center"></th>
                <th className="px-4 py-3">ผู้ขอลา / ตำแหน่ง</th>
                <th className="px-4 py-3">ประเภทการลา</th>
                <th className="px-4 py-3">ช่วงวันที่ลา &amp; จำนวน</th>
                <th className="px-4 py-3 text-center min-w-[120px]">สถานะ</th>
                <th className="px-4 py-3 text-center min-w-[110px]">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/60 font-sans">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle className="w-6 h-6 text-slate-600" />
                      <span>ไม่พบข้อมูลรายการคำร้องขอลา</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => {
                  const isExpanded = expandedId === req.id;
                  const posDisplay = req.position.replace('ผู้อำนวยการสถานศึกษา', 'ผอ.สถานศึกษา');
                  return (
                    <React.Fragment key={req.id}>
                      <tr
                        onClick={() => toggleExpand(req.id)}
                        className={`hover:bg-slate-50 dark:hover:bg-[#162231]/60 transition-colors cursor-pointer ${
                          isExpanded ? 'bg-slate-100/70 dark:bg-[#15202e]' : ''
                        }`}
                      >
                        <td className="w-10 px-3 py-3.5 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpand(req.id);
                            }}
                            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors duration-200"
                            title={isExpanded ? 'ย่อรายละเอียด' : 'ดูรายละเอียดเพิ่มเติม'}
                          >
                            <ChevronRight
                              className={`w-4 h-4 transition-transform duration-200 ${
                                isExpanded ? 'rotate-90 text-sky-400' : ''
                              }`}
                            />
                          </button>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-slate-900 dark:text-white truncate max-w-[200px]" title={formatStaffName(req.teacherName)}>{formatStaffName(req.teacherName)}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[200px]" title={req.position}>{posDisplay}</div>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 px-2.5 py-0.5 text-xs font-medium rounded-full ${
                              req.leaveType === 'sick'
                                ? 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                                : req.leaveType === 'personal'
                                ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                                : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                            }`}
                          >
                            {req.leaveTypeName}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap font-mono text-xs">
                          <div className="text-slate-800 dark:text-slate-200">
                            {new Date(req.startDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} – {new Date(req.endDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
                          </div>
                          <div className="text-sky-400 font-semibold mt-0.5 text-[11px]">
                            {req.totalDays} วันทำการ
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          {req.status === 'approved' && (
                            <span className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 px-2.5 py-0.5 text-xs font-medium rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                              <span>อนุมัติแล้ว</span>
                            </span>
                          )}
                          {req.status === 'pending' && (
                            <span className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 px-2.5 py-0.5 text-xs font-medium rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                              <Clock className="w-3.5 h-3.5 shrink-0" />
                              <span>รอพิจารณา</span>
                            </span>
                          )}
                          {req.status === 'rejected' && (
                            <span className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 px-2.5 py-0.5 text-xs font-medium rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30">
                              <XCircle className="w-3.5 h-3.5 shrink-0" />
                              <span>ไม่อนุมัติ</span>
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedRequest(req)}
                              title="ดูรายละเอียดฉบับเต็ม"
                              className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors duration-200"
                            >
                              <Eye className="w-4 h-4 shrink-0" />
                            </button>
                            <Link
                              href={`/leave/print/${req.id}`}
                              target="_blank"
                              title="พิมพ์แบบฟอร์ม A4"
                              className="p-1.5 rounded-md text-slate-400 hover:text-sky-600 dark:hover:text-sky-300 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors duration-200"
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

                      {/* Expanded Detail Panel */}
                      {isExpanded && (
                        <tr className="bg-slate-50/90 dark:bg-[#0b1016]/90 border-y border-slate-200/90 dark:border-slate-800/80">
                          <td colSpan={6} className="px-6 py-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                              <div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-1">เลขที่เอกสาร &amp; วันที่ยื่น</div>
                                <div className="font-mono text-sky-400 font-medium">{req.docNo}</div>
                                <div className="text-slate-400 text-[11px] mt-0.5">
                                  ยื่นเมื่อ: {new Date(req.submittedAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </div>
                              </div>

                              <div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-1">ครูผู้ปฏิบัติหน้าที่แทน</div>
                                <div className="text-slate-800 dark:text-slate-200 font-medium">{formatStaffName(req.substituteTeacherName || 'ไม่มีการระบุ')}</div>
                                <div className="text-slate-400 text-[11px] mt-0.5">กลุ่มสาระ: {req.department}</div>
                              </div>

                              <div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-1">คำสั่ง/ความเห็นผู้อำนวยการ</div>
                                <div className="text-slate-800 dark:text-slate-200">{req.directorRemark || req.supervisorRemark || 'ยังไม่มีความเห็นเพิ่มเติม'}</div>
                              </div>

                              <div className="flex flex-col justify-between">
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-1">ลิงก์และเอกสารทางการ</div>
                                <div className="flex items-center gap-2">
                                  <Link
                                    href={`/verify/leave/${encodeURIComponent(req.docNo)}`}
                                    target="_blank"
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 border border-slate-200/90 dark:bg-[#121822] dark:hover:bg-slate-800/70 dark:text-slate-300 dark:hover:text-white dark:border-slate-800/80 text-xs transition-colors duration-200"
                                  >
                                    <QrCode className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                                    <span>ตรวจสอบ QR</span>
                                  </Link>
                                  <Link
                                    href={`/leave/print/${req.id}`}
                                    target="_blank"
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 border border-slate-200/90 dark:bg-[#121822] dark:hover:bg-slate-800/70 dark:text-slate-300 dark:hover:text-white dark:border-slate-800/80 text-xs transition-colors duration-200"
                                  >
                                    <Printer className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                    <span>พิมพ์ A4</span>
                                  </Link>
                                </div>
                              </div>
                            </div>

                            {req.reason && (
                              <div className="mt-3 pt-3 border-t border-slate-200/80 dark:border-slate-800/60 text-xs">
                                <span className="text-[11px] text-slate-400">เหตุผลความจำเป็น: </span>
                                <span className="text-slate-800 dark:text-slate-200">
                                  {formatPDPAProtectedLeaveReason(req, currentUser, currentRole)}
                                </span>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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
          <div className="bg-white dark:bg-[#141d27] border border-slate-200/90 dark:border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-slate-800 dark:text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200/90 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-sky-400 font-bold text-sm">
                <FileText className="w-4 h-4 shrink-0" />
                <span>รายละเอียดคำร้องขอลา ({selectedRequest.docNo})</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors duration-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700 dark:text-slate-300">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-[#0e141c] p-3 rounded-lg border border-slate-200/80 dark:border-slate-800">
                <div>
                  <span className="text-slate-500">ผู้ขอลา:</span>
                  <p className="font-semibold text-slate-900 dark:text-white mt-0.5">{formatStaffName(selectedRequest.teacherName)}</p>
                </div>
                <div>
                  <span className="text-slate-500">สังกัด / กลุ่มสาระ:</span>
                  <p className="font-medium text-slate-700 dark:text-slate-200 mt-0.5">{selectedRequest.department}</p>
                </div>
                <div>
                  <span className="text-slate-500">ประเภทการลา:</span>
                  <p className="font-medium text-sky-600 dark:text-sky-300 mt-0.5">
                    {selectedRequest.leaveTypeName} ({selectedRequest.totalDays} วัน)
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">ผู้ปฏิบัติหน้าที่แทน:</span>
                  <p className="font-medium text-slate-700 dark:text-slate-200 mt-0.5">{formatStaffName(selectedRequest.substituteTeacherName)}</p>
                </div>
              </div>

              <div>
                <span className="text-slate-500 block mb-1">เหตุผลและความจำเป็น:</span>
                <p className="bg-slate-50 dark:bg-[#0e141c] p-3 rounded-lg border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-200">
                  {formatPDPAProtectedLeaveReason(selectedRequest, currentUser, currentRole)}
                </p>
              </div>

              {selectedRequest.supervisorRemark && (
                <div>
                  <span className="text-slate-500 block mb-1">ความเห็นผู้บังคับบัญชาชั้นต้น:</span>
                  <p className="bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-lg text-amber-800 dark:text-amber-200">
                    {selectedRequest.supervisorRemark}
                  </p>
                </div>
              )}

              {selectedRequest.directorRemark && (
                <div>
                  <span className="text-slate-500 block mb-1">คำสั่งผู้อำนวยการ:</span>
                  <p className="bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-lg text-emerald-800 dark:text-emerald-200">
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
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 border border-slate-200/90 dark:bg-[#121822] dark:hover:bg-slate-800/70 dark:text-slate-300 dark:hover:text-white dark:border-slate-800/80 text-xs font-medium transition-colors duration-200"
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
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 border border-slate-200/90 dark:bg-[#121822] dark:hover:bg-slate-800/70 dark:text-slate-300 dark:hover:text-white dark:border-slate-800/80 text-xs font-medium transition-colors duration-200"
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
