'use client';

/**
 * ============================================================================
 * ManStat: View Khurusapha Professional Licenses (ทะเบียนใบอนุญาตฯ)
 * ============================================================================
 * - Group by Person: 1 row = 1 staff member (no duplicates)
 * - Symmetrical 6-column unified table layout
 * - Earliest expiration and most urgent status displayed on main row
 * - Clickable summary filter cards (ฉบับ / ท่าน)
 * - Zero emojis, pure Lucide SVG icons with strict Minimal & Clean standard
 * ============================================================================
 */

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
  Award,
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  ExternalLink,
  ChevronDown,
} from 'lucide-react';
import { INITIAL_TEACHERS, type TeacherRecord } from '@/lib/data/schoolData';
import { formatThaiDateDisplay } from '@/components/ui/ThaiDatePicker';
import {
  groupAndSortLicenseRegistry,
  matchesHealthFilter,
} from '@/lib/regulations/license-grouping';
import { formatStaffName } from '@/lib/regulations/staff-formatting';

export const ViewRegLicense: React.FC = () => {
  const [teachersList, setTeachersList] = useState<TeacherRecord[]>(INITIAL_TEACHERS);
  const [filterHealth, setFilterHealth] = useState<'ALL' | 'VALID' | 'EXPIRING_SOON' | 'EXPIRED' | 'MISSING'>('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    fetch('/api/admin/staff', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.success && Array.isArray(data.data)) {
          setTeachersList(data.data);
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

  // Build grouped registry and statistics
  const { groups, allEligiblePersons, stats } = useMemo(() => {
    return groupAndSortLicenseRegistry(teachersList);
  }, [teachersList]);

  // Filter groups according to active status card
  const filteredGroups = useMemo(() => {
    if (filterHealth === 'ALL') return groups;
    return groups
      .map((g) => ({
        ...g,
        members: g.members.filter((m) => matchesHealthFilter(m, filterHealth)),
      }))
      .filter((g) => g.members.length > 0);
  }, [groups, filterHealth]);

  const totalFilteredCount = useMemo(() => {
    return filteredGroups.reduce((acc, g) => acc + g.members.length, 0);
  }, [filteredGroups]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#141b24] p-5 sm:p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm transition-colors duration-200">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-sky-500 dark:text-sky-400 shrink-0" />
            <span>ทะเบียนใบอนุญาตประกอบวิชาชีพครูและผู้บริหาร</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 whitespace-nowrap">
            ระบบเฝ้าระวังวันหมดอายุล่วงหน้า 90 วัน ตามข้อบังคับคุรุสภาว่าด้วยใบอนุญาตประกอบวิชาชีพ
          </p>
        </div>

        <a
          href="https://ksp-eservice.ksp.or.th/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 border border-slate-200/90 dark:bg-[#121822] dark:hover:bg-slate-800/70 dark:text-slate-300 dark:hover:text-white dark:border-slate-800/80 text-xs font-medium transition-colors duration-200 whitespace-nowrap shrink-0"
        >
          <ExternalLink className="w-4 h-4 shrink-0 text-sky-500 dark:text-sky-400" />
          <span>ระบบ KSP e-Service</span>
        </a>
      </div>

      {/* Stats Summary Cards (5 Clickable Filter Cards — grid-cols-2 lg:grid-cols-5) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Card 1: ทั้งหมด */}
        <div
          onClick={() => setFilterHealth('ALL')}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            filterHealth === 'ALL'
              ? 'border-sky-500 bg-sky-50/80 dark:bg-sky-500/10 shadow-sm'
              : 'border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#111823]/80 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">ใบอนุญาตทั้งหมด</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white">{stats.totalLicenses}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">ฉบับ</span>
          </div>
        </div>

        {/* Card 2: สถานะปกติ */}
        <div
          onClick={() => setFilterHealth('VALID')}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            filterHealth === 'VALID'
              ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-500/10 shadow-sm'
              : 'border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#111823]/80 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-500 dark:text-slate-400">สถานะปกติ</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">{stats.validLicenses}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">ฉบับ</span>
          </div>
        </div>

        {/* Card 3: ใกล้หมดอายุ 90 วัน */}
        <div
          onClick={() => setFilterHealth('EXPIRING_SOON')}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            filterHealth === 'EXPIRING_SOON'
              ? 'border-amber-500 bg-amber-50/80 dark:bg-amber-500/10 shadow-sm'
              : 'border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#111823]/80 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-500 dark:text-slate-400">ใกล้หมดอายุ 90 วัน</span>
            <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">{stats.expiringSoonLicenses}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">ฉบับ</span>
          </div>
        </div>

        {/* Card 4: หมดอายุแล้ว */}
        <div
          onClick={() => setFilterHealth('EXPIRED')}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            filterHealth === 'EXPIRED'
              ? 'border-rose-500 bg-rose-50/80 dark:bg-rose-500/10 shadow-sm'
              : 'border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#111823]/80 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-500 dark:text-slate-400">หมดอายุแล้ว</span>
            <AlertOctagon className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400">{stats.expiredLicenses}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">ฉบับ</span>
          </div>
        </div>

        {/* Card 5: ยังไม่บันทึกข้อมูล (นับเป็น ท่าน) */}
        <div
          onClick={() => setFilterHealth('MISSING')}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            filterHealth === 'MISSING'
              ? 'border-slate-400 dark:border-slate-500 bg-slate-100 dark:bg-slate-800/40 shadow-sm'
              : 'border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#111823]/80 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-500 dark:text-slate-400">ยังไม่บันทึกข้อมูล</span>
            <span className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500 shrink-0" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-slate-700 dark:text-slate-300">{stats.missingStaffCount}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">ท่าน</span>
          </div>
        </div>
      </div>

      {/* Table List */}
      <div className="bg-white dark:bg-[#111823]/80 rounded-2xl border border-slate-200/90 dark:border-slate-800/80 shadow-sm overflow-hidden transition-colors duration-200">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-sm text-slate-700 dark:text-slate-200">
            <thead className="bg-slate-50 dark:bg-[#101822] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold text-xs border-b border-slate-200/90 dark:border-slate-800">
              <tr>
                <th className="w-14 px-3 py-3.5 text-center">ลำดับ</th>
                <th className="px-4 py-3.5">ผู้ถือใบอนุญาต</th>
                <th className="px-4 py-3.5">ใบอนุญาตที่ถือครอง</th>
                <th className="px-4 py-3.5 font-mono whitespace-nowrap">หมดอายุใกล้สุด</th>
                <th className="px-4 py-3.5 text-center whitespace-nowrap">วันคงเหลือ</th>
                <th className="px-4 py-3.5 text-center min-w-[120px]">สถานะ</th>
                <th className="w-12 px-3 py-3.5 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
              {totalFilteredCount === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
                      <Award className="w-8 h-8 mb-2 opacity-40 shrink-0" />
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                        ไม่พบข้อมูลตามเงื่อนไขที่เลือก
                      </p>
                      <button
                        type="button"
                        onClick={() => setFilterHealth('ALL')}
                        className="mt-2 text-xs text-sky-600 dark:text-sky-400 hover:underline"
                      >
                        แสดงทั้งหมด
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                (() => {
                  let runningSeq = 0;
                  return filteredGroups.map((group) => (
                    <React.Fragment key={group.category}>
                      {/* Branch Header */}
                      <tr className="bg-slate-50/80 dark:bg-[#0d131b] border-y border-slate-200/80 dark:border-slate-800/70">
                        <td colSpan={7} className="px-4 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                group.category === 'management'
                                  ? 'bg-purple-400'
                                  : group.category === 'teaching'
                                  ? 'bg-sky-400'
                                  : 'bg-amber-400'
                              }`}
                            />
                            <span>{group.title}</span>
                          </div>
                        </td>
                      </tr>

                      {/* Person Rows */}
                      {group.members.map((person) => {
                        runningSeq++;
                        const seq = runningSeq;
                        const posDisplay = person.position.replace('ผู้อำนวยการสถานศึกษา', 'ผอ.สถานศึกษา');
                        const isExpanded = expandedId === person.id;

                        return (
                          <React.Fragment key={person.id}>
                            <tr
                              onClick={() => toggleExpand(person.id)}
                              className={`hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors cursor-pointer ${
                                isExpanded ? 'bg-slate-50/90 dark:bg-[#15202e]' : ''
                              }`}
                            >
                              {/* Sequence */}
                              <td className="w-14 px-3 py-3.5 text-center font-mono tabular-nums text-slate-400 dark:text-slate-500 text-xs whitespace-nowrap">
                                {seq}
                              </td>

                              {/* License Holder */}
                              <td className="px-4 py-3.5">
                                <div className="font-semibold text-slate-900 dark:text-white text-sm" title={formatStaffName(person.name)}>
                                  {formatStaffName(person.name)}
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5" title={person.position}>
                                  {posDisplay}
                                </div>
                              </td>

                              {/* Licenses Held */}
                              <td className="px-4 py-3.5">
                                {person.licensesCount > 0 ? (
                                  <div>
                                    <div className="text-slate-800 dark:text-slate-200 text-sm font-medium">
                                      {person.licensesDisplay}
                                    </div>
                                    {person.licensesCount > 1 && (
                                      <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                                        {person.licensesCount} ฉบับ
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-slate-400 dark:text-slate-500 text-sm font-mono">-</span>
                                )}
                              </td>

                              {/* Nearest Expiry Date */}
                              <td className="px-4 py-3.5 font-mono text-slate-700 dark:text-slate-300 text-xs sm:text-sm whitespace-nowrap">
                                {person.nearestExpiryDate ? (
                                  formatThaiDateDisplay(person.nearestExpiryDate)
                                ) : (
                                  <span className="text-slate-400 dark:text-slate-500">-</span>
                                )}
                              </td>

                              {/* Days Remaining */}
                              <td className="px-4 py-3.5 font-mono font-bold text-center text-xs sm:text-sm whitespace-nowrap">
                                {person.minDaysRemaining !== null ? (
                                  <span
                                    className={
                                      person.minDaysRemaining <= 0
                                        ? 'text-rose-600 dark:text-rose-400'
                                        : person.minDaysRemaining <= 90
                                        ? 'text-amber-600 dark:text-amber-400'
                                        : 'text-emerald-600 dark:text-emerald-400'
                                    }
                                  >
                                    {person.minDaysRemaining.toLocaleString('th-TH')} วัน
                                  </span>
                                ) : (
                                  <span className="text-slate-400 dark:text-slate-500 font-normal">-</span>
                                )}
                              </td>

                              {/* Status (Minimal & Clean Dot + Text) */}
                              <td className="px-4 py-3.5 text-center whitespace-nowrap">
                                {person.overallHealth === 'VALID' ? (
                                  <div className="inline-flex items-center justify-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400/90">ปกติ</span>
                                  </div>
                                ) : person.overallHealth === 'EXPIRING_SOON' ? (
                                  <div className="inline-flex items-center justify-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                                    <span className="text-xs font-medium text-amber-600 dark:text-amber-300">ใกล้หมดอายุ</span>
                                  </div>
                                ) : person.overallHealth === 'EXPIRED' ? (
                                  <div className="inline-flex items-center justify-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                                    <span className="text-xs font-medium text-rose-600 dark:text-rose-400">หมดอายุแล้ว</span>
                                  </div>
                                ) : (
                                  <div className="inline-flex items-center justify-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500 shrink-0" />
                                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">ยังไม่บันทึกข้อมูล</span>
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

                            {/* Expanded Detail Panel */}
                            {isExpanded && (
                              <tr className="bg-slate-50/90 dark:bg-white/[0.02] border-y border-slate-200/90 dark:border-slate-800/80">
                                <td colSpan={7} className="pl-14 pr-6 py-4">
                                  {person.licensesCount > 0 ? (
                                    <div className="space-y-3">
                                      <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                        ใบอนุญาตที่ถือครองทั้งหมด ({person.licensesCount} ฉบับ)
                                      </div>
                                      <div className="space-y-2">
                                        {person.licenses.map((lic, licIdx) => (
                                          <div
                                            key={`${lic.number}-${licIdx}`}
                                            className="p-3.5 rounded-xl bg-white dark:bg-[#121924] border border-slate-200/90 dark:border-slate-800/80 shadow-xs space-y-2"
                                          >
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-100 dark:border-slate-800 pb-2">
                                              <div>
                                                <span className="text-xs font-semibold text-slate-900 dark:text-white">
                                                  {lic.type}
                                                </span>
                                                <span className="text-[11px] text-slate-400 dark:text-slate-500 ml-2 font-mono">
                                                  ({lic.number})
                                                </span>
                                              </div>
                                              <div className="flex items-center gap-1.5 shrink-0">
                                                <span
                                                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                                    lic.health === 'VALID'
                                                      ? 'bg-emerald-400'
                                                      : lic.health === 'EXPIRING_SOON'
                                                      ? 'bg-amber-400'
                                                      : 'bg-rose-400'
                                                  }`}
                                                />
                                                <span
                                                  className={`text-[11px] font-medium ${
                                                    lic.health === 'VALID'
                                                      ? 'text-emerald-600 dark:text-emerald-400/90'
                                                      : lic.health === 'EXPIRING_SOON'
                                                      ? 'text-amber-600 dark:text-amber-300'
                                                      : 'text-rose-600 dark:text-rose-400'
                                                  }`}
                                                >
                                                  {lic.health === 'VALID'
                                                    ? 'ปกติ'
                                                    : lic.health === 'EXPIRING_SOON'
                                                    ? 'ใกล้หมดอายุ'
                                                    : 'หมดอายุแล้ว'}
                                                </span>
                                              </div>
                                            </div>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                                              <div>
                                                <span className="text-[11px] text-slate-400 dark:text-slate-500 block">
                                                  วันออกใบอนุญาต
                                                </span>
                                                <span className="font-mono text-slate-700 dark:text-slate-300">
                                                  {formatThaiDateDisplay(lic.issueDate)}
                                                </span>
                                              </div>
                                              <div>
                                                <span className="text-[11px] text-slate-400 dark:text-slate-500 block">
                                                  วันหมดอายุ
                                                </span>
                                                <span className="font-mono text-slate-700 dark:text-slate-300">
                                                  {formatThaiDateDisplay(lic.expiryDate)}
                                                </span>
                                              </div>
                                              <div>
                                                <span className="text-[11px] text-slate-400 dark:text-slate-500 block">
                                                  วันคงเหลือ
                                                </span>
                                                <span
                                                  className={`font-mono font-semibold ${
                                                    lic.daysRemaining <= 0
                                                      ? 'text-rose-600 dark:text-rose-400'
                                                      : lic.daysRemaining <= 90
                                                      ? 'text-amber-600 dark:text-amber-400'
                                                      : 'text-emerald-600 dark:text-emerald-400'
                                                  }`}
                                                >
                                                  {lic.daysRemaining.toLocaleString('th-TH')} วัน
                                                </span>
                                              </div>
                                              <div className="flex items-end justify-start sm:justify-end">
                                                <a
                                                  href="https://ksp-eservice.ksp.or.th/"
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  onClick={(e) => e.stopPropagation()}
                                                  className="inline-flex items-center gap-1 text-[11px] text-sky-600 dark:text-sky-400 hover:underline"
                                                >
                                                  <span>ตรวจสอบคุรุสภา</span>
                                                  <ExternalLink className="w-3 h-3" />
                                                </a>
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                                      <span>ยังไม่มีข้อมูลใบอนุญาตประกอบวิชาชีพในระบบ</span>
                                      <Link
                                        href="/admin"
                                        onClick={(e) => e.stopPropagation()}
                                        className="inline-flex items-center gap-1 text-sky-600 dark:text-sky-400 hover:underline font-medium"
                                      >
                                        <span>จัดการข้อมูลบุคลากรในศูนย์ผู้ดูแลระบบ</span>
                                        <ExternalLink className="w-3 h-3" />
                                      </Link>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </React.Fragment>
                  ));
                })()
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
