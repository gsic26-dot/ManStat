'use client';

/**
 * ============================================================================
 * ManStat-Modern: View Khurusapha Professional Licenses (ทะเบียนใบอนุญาตฯ)
 * ============================================================================
 * - Professional License Health Tracking (P, B, A, Educational Administrator)
 * - 90-Day Early Warning Threshold per Khurusapha Standards
 * - Direct link to renewal guidance
 * - Zero emojis, pure Lucide SVG icons with strict 8px gap.
 * ============================================================================
 */

import React, { useState, useMemo } from 'react';
import {
  Award,
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  Search,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { INITIAL_TEACHERS } from '@/lib/data/schoolData';
import { evaluateLicenseHealth } from '@/lib/regulations/khurusapha-and-pa';

export const ViewRegLicense: React.FC = () => {
  const [filterHealth, setFilterHealth] = useState<'ALL' | 'VALID' | 'EXPIRING_SOON' | 'EXPIRED'>('ALL');
  const [search, setSearch] = useState<string>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  // Extract all licenses from teachers
  const allLicenses = useMemo(() => {
    const list: Array<{
      teacherName: string;
      position: string;
      department: string;
      category: string;
      type: string;
      number: string;
      issueDate: string;
      expiryDate: string;
      health: 'VALID' | 'EXPIRING_SOON' | 'EXPIRED';
      daysRemaining: number;
    }> = [];

    INITIAL_TEACHERS.forEach((t) => {
      (t.licenses || []).forEach((lic) => {
        const evalResult = evaluateLicenseHealth(lic.expiryDate);
        list.push({
          teacherName: t.name,
          position: t.position,
          department: t.department,
          category: lic.category,
          type: lic.type,
          number: lic.number,
          issueDate: lic.issueDate,
          expiryDate: lic.expiryDate,
          health: evalResult.health,
          daysRemaining: evalResult.daysRemaining,
        });
      });
    });

    return list;
  }, []);

  const stats = useMemo(() => {
    return {
      total: allLicenses.length,
      valid: allLicenses.filter((l) => l.health === 'VALID').length,
      expiringSoon: allLicenses.filter((l) => l.health === 'EXPIRING_SOON').length,
      expired: allLicenses.filter((l) => l.health === 'EXPIRED').length,
    };
  }, [allLicenses]);

  const filtered = useMemo(() => {
    return allLicenses.filter((l) => {
      const matchSearch =
        l.teacherName.toLowerCase().includes(search.toLowerCase()) ||
        l.number.toLowerCase().includes(search.toLowerCase()) ||
        l.type.toLowerCase().includes(search.toLowerCase());

      const matchHealth = filterHealth === 'ALL' || l.health === filterHealth;

      return matchSearch && matchHealth;
    });
  }, [allLicenses, search, filterHealth]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-5 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-sm transition-colors duration-200">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-sky-500 dark:text-sky-400 shrink-0" />
            <span>ทะเบียนใบอนุญาตประกอบวิชาชีพครูและผู้บริหาร (คุรุสภา)</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            ระบบเฝ้าระวังวันหมดอายุล่วงหน้า 90 วัน ตามข้อบังคับคุรุสภาว่าด้วยใบอนุญาตประกอบวิชาชีพ
          </p>
        </div>

        <a
          href="https://ksp-eservice.ksp.or.th/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 border border-slate-200/90 dark:bg-[#121822] dark:hover:bg-slate-800/70 dark:text-slate-300 dark:hover:text-white dark:border-slate-800/80 text-xs font-medium transition-colors duration-200"
        >
          <ExternalLink className="w-4 h-4 shrink-0 text-sky-500 dark:text-sky-400" />
          <span>ระบบ KSP e-Service (คุรุสภา)</span>
        </a>
      </div>

      {/* Stats Summary Cards (Equal 8pt Grid & Height) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div
          onClick={() => setFilterHealth('ALL')}
          className={`cursor-pointer p-5 rounded-2xl border transition-all ${
            filterHealth === 'ALL'
              ? 'border-sky-500 bg-sky-50 dark:bg-sky-500/10 shadow-sm'
              : 'border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#111823]/80 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">ใบอนุญาตทั้งหมด</span>
          <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white">{stats.total}</span>
        </div>

        <div
          onClick={() => setFilterHealth('VALID')}
          className={`cursor-pointer p-5 rounded-2xl border transition-all ${
            filterHealth === 'VALID'
              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 shadow-sm'
              : 'border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#111823]/80 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-500 dark:text-slate-400">สถานะปกติ</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
          </div>
          <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">{stats.valid}</span>
        </div>

        <div
          onClick={() => setFilterHealth('EXPIRING_SOON')}
          className={`cursor-pointer p-5 rounded-2xl border transition-all ${
            filterHealth === 'EXPIRING_SOON'
              ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/10 shadow-sm'
              : 'border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#111823]/80 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-500 dark:text-slate-400">ใกล้หมดอายุ (ใน 90 วัน)</span>
            <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
          </div>
          <span className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">{stats.expiringSoon}</span>
        </div>

        <div
          onClick={() => setFilterHealth('EXPIRED')}
          className={`cursor-pointer p-5 rounded-2xl border transition-all ${
            filterHealth === 'EXPIRED'
              ? 'border-rose-500 bg-rose-50 dark:bg-rose-500/10 shadow-sm'
              : 'border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#111823]/80 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-500 dark:text-slate-400">หมดอายุแล้ว</span>
            <AlertOctagon className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0" />
          </div>
          <span className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400">{stats.expired}</span>
        </div>
      </div>

      {/* Table List */}
      <div className="bg-white dark:bg-[#111823]/80 p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800/80 space-y-4 shadow-sm transition-colors duration-200">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อผู้ถือใบอนุญาต หรือเลขที่..."
            className="w-full h-10 bg-slate-50 dark:bg-[#101822] border border-slate-200 dark:border-slate-700/80 rounded-xl pl-10 pr-3.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 transition-all"
          />
        </div>

        <div className="w-full">
          <table className="w-full text-left text-sm text-slate-700 dark:text-slate-200">
            <thead className="bg-slate-100/80 dark:bg-[#101822] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold text-xs border-b border-slate-200/90 dark:border-slate-800">
              <tr>
                <th className="w-10 px-3 py-3.5 text-center"></th>
                <th className="px-4 py-3.5">ผู้ถือใบอนุญาต</th>
                <th className="px-4 py-3.5">ประเภทใบอนุญาต</th>
                <th className="px-4 py-3.5 font-mono whitespace-nowrap">วันหมดอายุ</th>
                <th className="px-4 py-3.5 text-center whitespace-nowrap">วันคงเหลือ</th>
                <th className="px-4 py-3.5 text-center min-w-[120px]">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
              {filtered.map((item, idx) => {
                const posDisplay = item.position.replace('ผู้อำนวยการสถานศึกษา', 'ผอ.สถานศึกษา');
                const rowKey = `${item.number}-${idx}`;
                const isExpanded = expandedId === rowKey;

                return (
                  <React.Fragment key={rowKey}>
                    <tr
                      onClick={() => toggleExpand(rowKey)}
                      className={`hover:bg-slate-50 dark:hover:bg-[#1a2636]/60 transition-colors cursor-pointer ${
                        isExpanded ? 'bg-slate-50/90 dark:bg-[#15202e]' : ''
                      }`}
                    >
                      {/* Expand Button */}
                      <td className="w-10 px-3 py-3.5 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(rowKey);
                          }}
                          className="p-1 rounded-md text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/50 transition-colors duration-200"
                          title={isExpanded ? 'ย่อรายละเอียด' : 'ดูรายละเอียดเพิ่มเติม'}
                        >
                          <ChevronRight
                            className={`w-4 h-4 transition-transform duration-200 ${
                              isExpanded ? 'rotate-90 text-sky-500 dark:text-sky-400' : ''
                            }`}
                          />
                        </button>
                      </td>

                      {/* License Holder */}
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900 dark:text-white text-base truncate max-w-[200px]" title={item.teacherName}>
                          {item.teacherName}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[200px]" title={item.position}>
                          {posDisplay}
                        </div>
                      </td>

                      {/* License Type */}
                      <td className="px-4 py-3.5 text-sky-600 dark:text-sky-300 font-medium text-xs sm:text-sm">
                        <div className="truncate max-w-[180px]" title={item.type}>{item.type}</div>
                      </td>

                      {/* Expiry Date */}
                      <td className="px-4 py-3.5 font-mono text-slate-700 dark:text-slate-200 text-xs sm:text-sm whitespace-nowrap">
                        {item.expiryDate}
                      </td>

                      {/* Remaining Days */}
                      <td className="px-4 py-3.5 font-mono font-bold text-center text-xs sm:text-sm whitespace-nowrap">
                        <span className={item.daysRemaining <= 0 ? 'text-rose-600 dark:text-rose-400' : item.daysRemaining <= 90 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}>
                          {item.daysRemaining} วัน
                        </span>
                      </td>

                      {/* Status Badge (Strict Zero Wrapping) */}
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        {item.health === 'VALID' ? (
                          <span className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 px-2.5 py-0.5 text-xs font-medium rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span>ปกติ</span>
                          </span>
                        ) : item.health === 'EXPIRING_SOON' ? (
                          <span className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 px-2.5 py-0.5 text-xs font-medium rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            <span>เตือนต่ออายุ</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 px-2.5 py-0.5 text-xs font-medium rounded-full bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30">
                            <AlertOctagon className="w-3.5 h-3.5 shrink-0" />
                            <span>หมดอายุ</span>
                          </span>
                        )}
                      </td>
                    </tr>

                    {/* Expanded Detail Panel */}
                    {isExpanded && (
                      <tr className="bg-slate-50/90 dark:bg-[#0b1016]/90 border-y border-slate-200/90 dark:border-slate-800/80">
                        <td colSpan={6} className="px-6 py-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                            <div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-1 font-medium">เลขที่ใบอนุญาตประกอบวิชาชีพ</div>
                              <div className="font-mono text-sky-600 dark:text-sky-400 font-semibold">{item.number}</div>
                              <div className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">หมวด: {item.category}</div>
                            </div>

                            <div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-1 font-medium">วันที่ออกเอกสารใบอนุญาต</div>
                              <div className="font-mono text-slate-700 dark:text-slate-300">{item.issueDate}</div>
                              <div className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">กลุ่มสาระ/ฝ่าย: {item.department}</div>
                            </div>

                            <div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-1 font-medium">สถานะอายุใบอนุญาต</div>
                              <div className="text-slate-700 dark:text-slate-200">
                                {item.daysRemaining > 0 ? (
                                  <span>ยังคงเหลือเวลาอีก <b className="font-mono text-amber-600 dark:text-amber-300">{item.daysRemaining}</b> วัน</span>
                                ) : (
                                  <span className="text-rose-600 dark:text-rose-400 font-medium">หมดอายุแล้ว ต้องดำเนินการต่ออายุทันที</span>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-col justify-between">
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-1 font-medium">ตรวจสอบฐานข้อมูลคุรุสภา</div>
                              <div className="pt-1">
                                <a
                                  href="https://ksp-eservice.ksp.or.th/"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 border border-slate-200/90 dark:bg-[#121822] dark:hover:bg-slate-800/70 dark:text-slate-300 dark:hover:text-white dark:border-slate-800/80 text-xs font-medium transition-colors duration-200"
                                >
                                  <ExternalLink className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400 shrink-0" />
                                  <span>ระบบ KSP e-Service</span>
                                </a>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
