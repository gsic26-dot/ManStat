'use client';

/**
 * ============================================================================
 * ManStat: View School Board (คณะกรรมการสถานศึกษาขั้นพื้นฐาน)
 * ============================================================================
 * - Ground-truth Basic Education School Board Members
 * - Order strictly by statutory position (ลำดับตามกฎกระทรวง พ.ศ. 2546)
 * - School Director is ex-officio ("โดยตำแหน่ง" นับแต่วันบรรจุแต่งตั้ง 10 ม.ค. 2555)
 * - Horizontal spacious row / table layout for optimal scanning & readability
 * - Zero emojis, pure Lucide SVG icons with strict 8px gap.
 * ============================================================================
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  Shield,
  ShieldCheck,
  Building,
  Briefcase,
  LayoutList,
  LayoutGrid,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import { BOARD_STATUTORY_ORDER, BoardMemberRecord } from '@/lib/data/schoolData';
import { formatServiceDuration } from '@/lib/regulations/fiscal-and-retirement';
import { formatStaffName } from '@/lib/regulations/staff-formatting';
import { PhoneShield } from '@/components/security/PhoneShield';

function formatBoardDate(dateStr?: string | null): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('th-TH-u-nu-latn', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const BOARD_POSITIONS_MAP: Record<string, string> = {
  CHAIR: 'ประธานกรรมการ',
  PARENT_REP: 'ผู้แทนผู้ปกครอง',
  TEACHER_REP: 'ผู้แทนครู',
  COMMUNITY_REP: 'ผู้แทนองค์กรชุมชน',
  LOCAL_ADMIN: 'ผู้แทนองค์กรปกครองส่วนท้องถิ่น',
  ALUMNI_REP: 'ผู้แทนศิษย์เก่า',
  RELIGION_REP: 'ผู้แทนพระภิกษุสงฆ์ / ศาสนา',
  EXPERT: 'กรรมการผู้ทรงคุณวุฒิ',
  DIRECTOR_SEC: 'กรรมการและเลขานุการ',
};

const normalizeMember = (b: any): BoardMemberRecord => {
  const position = b.position || b.board_position || 'EXPERT';
  const positionTitle =
    b.positionTitle ||
    BOARD_POSITIONS_MAP[position] ||
    'กรรมการสถานศึกษา';
  const rawFullName =
    b.fullName ||
    b.full_name ||
    `${b.prefix || ''}${b.first_name || ''} ${b.last_name || ''}`.trim() ||
    '-';
  const fullName = formatStaffName(rawFullName);

  return {
    id: b.id || b.member_id || `SBD-${Math.random()}`,
    fullName,
    position,
    positionTitle,
    occupation: b.occupation || '-',
    organization: b.organization || '-',
    phone: b.phone || '-',
    status: b.status || 'ดำรงตำแหน่ง',
    termNumber: b.termNumber ?? b.term_number ?? 1,
    isExOfficio: b.isExOfficio ?? b.is_ex_officio ?? position === 'DIRECTOR_SEC',
    appointmentDate: b.appointmentDate ?? b.appointment_date ?? undefined,
    endDate: b.endDate ?? b.end_date ?? undefined,
    endReason: b.endReason ?? b.end_reason ?? undefined,
  };
};

export const ViewSchoolBoard: React.FC = () => {
  const [boardList, setBoardList] = useState<BoardMemberRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);
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
    fetch('/api/admin/board', { cache: 'no-store' })
      .then((res) => res.json())
      .then((json) => {
        if (json?.success && Array.isArray(json.data) && isMounted) {
          setBoardList(json.data.map(normalizeMember));
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedMemberId((prev) => (prev === id ? null : id));
  };

  // Sort strictly by statutory hierarchy
  const sortedMembers = useMemo(() => {
    return [...boardList].sort((a, b) => {
      const orderA = BOARD_STATUTORY_ORDER[a.position] ?? 99;
      const orderB = BOARD_STATUTORY_ORDER[b.position] ?? 99;
      return orderA - orderB;
    });
  }, [boardList]);

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-white dark:bg-[#141b24] p-5 sm:p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-colors duration-200">
        <div className="flex items-center gap-2.5">
          <Shield className="w-5 h-5 text-sky-500 dark:text-sky-400 shrink-0" />
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
            คณะกรรมการสถานศึกษาขั้นพื้นฐาน
          </h2>
        </div>

        <div className="flex items-center shrink-0">
          {/* View Switcher */}
          <div className="inline-flex p-1 bg-slate-100 dark:bg-[#101822] border border-slate-200/90 dark:border-slate-800/80 rounded-lg">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors duration-200 ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/30'
              }`}
            >
              <LayoutList className="w-4 h-4 shrink-0" />
              <span>ตาราง</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors duration-200 ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/30'
              }`}
            >
              <LayoutGrid className="w-4 h-4 shrink-0" />
              <span>การ์ด</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content: Table / Horizontal Row View (Recommended) */}
      {viewMode === 'table' ? (
        <div className="bg-white dark:bg-[#111823] rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm dark:shadow-xl overflow-hidden transition-colors duration-200">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-sm text-slate-700 dark:text-slate-200">
              <thead className="bg-slate-100/80 dark:bg-[#16202d] text-xs uppercase text-slate-500 dark:text-slate-400 tracking-wider font-semibold border-b border-slate-200/90 dark:border-slate-800">
                <tr>
                  <th scope="col" className="w-14 px-3 py-3.5 text-center">ลำดับ</th>
                  <th scope="col" className="w-[32%] px-4 py-3.5">ชื่อ - สกุล</th>
                  <th scope="col" className="w-[28%] px-4 py-3.5">ตำแหน่งในคณะกรรมการ</th>
                  <th scope="col" className="w-[26%] px-4 py-3.5 text-center">วาระ / สถานะการดำรงตำแหน่ง</th>
                  <th scope="col" className="w-12 px-3 py-3.5 text-right">
                    <span className="sr-only">ขยายรายละเอียด</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 font-sans">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-slate-500 dark:text-slate-400">
                      <div className="inline-flex items-center gap-2 text-xs">
                        <Loader2 className="w-4 h-4 animate-spin text-sky-500" />
                        <span>กำลังโหลดข้อมูลคณะกรรมการสถานศึกษา...</span>
                      </div>
                    </td>
                  </tr>
                ) : sortedMembers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                      ยังไม่มีข้อมูลคณะกรรมการสถานศึกษา
                    </td>
                  </tr>
                ) : (
                  sortedMembers.map((member, index) => {
                    const isChair = member.position === 'CHAIR';
                    const isDirector = member.position === 'DIRECTOR_SEC';
                    const isExpanded = expandedMemberId === member.id;

                    return (
                      <React.Fragment key={member.id}>
                        <tr
                          onClick={() => toggleExpand(member.id)}
                          className={`hover:bg-slate-50 dark:hover:bg-[#182536]/60 transition-colors cursor-pointer ${
                            isExpanded ? 'bg-slate-50/90 dark:bg-[#182536]/40' : isDirector ? 'bg-sky-50/50 dark:bg-sky-950/20' : ''
                          }`}
                        >
                          {/* Statutory Sequence Number */}
                          <td className="w-14 px-3 py-3.5 text-center font-mono tabular-nums text-slate-400 dark:text-slate-500 text-xs whitespace-nowrap">
                            {index + 1}
                          </td>

                          {/* Full Name */}
                          <td className="px-4 py-3.5">
                            <div className="font-semibold text-slate-900 dark:text-white text-sm" title={formatStaffName(member.fullName)}>
                              {formatStaffName(member.fullName)}
                            </div>
                            {isDirector && (
                              <div className="text-xs text-slate-400 font-normal mt-0.5" title="ผู้อำนวยการสถานศึกษา">
                                ผู้อำนวยการสถานศึกษา
                              </div>
                            )}
                          </td>

                        {/* Position in Board */}
                        <td className="px-4 py-3.5">
                          {isChair ? (
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                              <span className="text-xs font-semibold text-slate-900 dark:text-white">
                                {member.positionTitle}
                              </span>
                            </div>
                          ) : isDirector ? (
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0" />
                              <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                                {member.positionTitle}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-700 dark:text-slate-300">
                              {member.positionTitle}
                            </span>
                          )}
                        </td>

                        {/* Term & Ex-officio Status */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          {isDirector ? (
                            <div className="inline-flex flex-col items-center gap-0.5">
                              <span className="text-xs text-sky-600 dark:text-sky-400 font-medium">
                                โดยตำแหน่ง
                              </span>
                              {member.appointmentDate && formatServiceDuration(member.appointmentDate) && (
                                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                                  {formatServiceDuration(member.appointmentDate)}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                              <span className="text-xs text-slate-700 dark:text-slate-300">
                                วาระที่ {member.termNumber}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Expand Arrow */}
                        <td className="w-12 px-3 py-3.5 text-right">
                          <ChevronDown
                            className={`w-4 h-4 ml-auto text-slate-400 transition-transform duration-200 ${
                              isExpanded ? 'rotate-180 text-sky-500 dark:text-sky-400' : ''
                            }`}
                          />
                        </td>
                      </tr>

                      {/* Detail Accordion Row */}
                      {isExpanded && (
                        <tr className="bg-slate-50/90 dark:bg-[#0b1016]/90 border-y border-slate-200/90 dark:border-slate-800/80">
                          <td colSpan={5} className="pl-14 pr-6 py-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                              <div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mb-1">
                                  อาชีพ / สายงาน
                                </div>
                                <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-medium">
                                  <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span>{member.occupation}</span>
                                </div>
                              </div>
                              <div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mb-1">
                                  สังกัดองค์กร / หน่วยงาน
                                </div>
                                <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-medium">
                                  <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span>{member.organization}</span>
                                </div>
                              </div>
                              <div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mb-1">
                                  ช่องทางการติดต่อ (PDPA)
                                </div>
                                <PhoneShield
                                  phone={member.phone}
                                  targetStaffId={member.id}
                                  currentUser={currentUser}
                                  currentRole={currentRole}
                                />
                              </div>
                              <div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mb-1">
                                  สถานะตามกฎกระทรวง พ.ศ. 2546
                                </div>
                                <div className="text-slate-700 dark:text-slate-300 space-y-0.5">
                                  <div>
                                    {isDirector || member.isExOfficio
                                      ? 'โดยตำแหน่ง (ผู้อำนวยการสถานศึกษา)'
                                      : `${member.status} (วาระที่ ${member.termNumber} · 4 ปี)`}
                                  </div>
                                  {member.appointmentDate && (
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                      แต่งตั้ง: {formatBoardDate(member.appointmentDate)}
                                      {member.endDate ? ` – ครบวาระ: ${formatBoardDate(member.endDate)}` : ''}
                                    </div>
                                  )}
                                  {member.endReason && (
                                    <div className="text-[11px] text-amber-600 dark:text-amber-400">
                                      หมายเหตุ: {member.endReason}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
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
      ) : isLoading ? (
        <div className="bg-white dark:bg-[#111823] p-12 rounded-2xl border border-slate-200/90 dark:border-slate-800 text-center text-slate-500 dark:text-slate-400">
          <div className="inline-flex items-center gap-2 text-xs">
            <Loader2 className="w-4 h-4 animate-spin text-sky-500" />
            <span>กำลังโหลดข้อมูลคณะกรรมการสถานศึกษา...</span>
          </div>
        </div>
      ) : sortedMembers.length === 0 ? (
        <div className="bg-white dark:bg-[#111823] p-12 rounded-2xl border border-slate-200/90 dark:border-slate-800 text-center text-slate-500">
          ยังไม่มีข้อมูลคณะกรรมการสถานศึกษา
        </div>
      ) : (
        /* Alternative Responsive Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedMembers.map((member) => {
            const isDirector = member.position === 'DIRECTOR_SEC' || Boolean(member.isExOfficio);
            const isChair = member.position === 'CHAIR';
            return (
              <div
                key={member.id}
                className="bg-white dark:bg-[#121822] p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800/80 hover:border-sky-500/40 shadow-sm dark:shadow-none transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      isChair
                        ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                        : isDirector
                        ? 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30'
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                    }`}>
                      {member.positionTitle}
                    </span>
                    <ShieldCheck className="w-4 h-4 text-sky-500 dark:text-sky-400 shrink-0" />
                  </div>

                  <div className="text-base font-bold text-slate-900 dark:text-white mb-0.5">
                    {formatStaffName(member.fullName)}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                    {member.organization}
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 pt-3 border-t border-slate-200/90 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{member.occupation}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {isDirector ? (
                        <span>
                          โดยตำแหน่ง
                          {member.appointmentDate && formatServiceDuration(member.appointmentDate)
                            ? ` (${formatServiceDuration(member.appointmentDate)})`
                            : ''}
                        </span>
                      ) : (
                        <span>
                          วาระที่ {member.termNumber} · {member.status}
                          {member.appointmentDate
                            ? ` (${formatBoardDate(member.appointmentDate)}${member.endDate ? ` – ${formatBoardDate(member.endDate)}` : ''})`
                            : ''}
                        </span>
                      )}
                    </div>
                    {member.phone && member.phone !== '-' && (
                      <div className="flex items-center gap-2">
                        <PhoneShield
                          phone={member.phone}
                          targetStaffId={member.id}
                          currentUser={currentUser}
                          currentRole={currentRole}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
