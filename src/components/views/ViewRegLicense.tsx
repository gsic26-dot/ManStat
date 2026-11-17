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
} from 'lucide-react';
import { INITIAL_TEACHERS } from '@/lib/data/schoolData';
import { evaluateLicenseHealth } from '@/lib/regulations/khurusapha-and-pa';

export const ViewRegLicense: React.FC = () => {
  const [filterHealth, setFilterHealth] = useState<'ALL' | 'VALID' | 'EXPIRING_SOON' | 'EXPIRED'>('ALL');
  const [search, setSearch] = useState<string>('');

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-5 rounded-xl border border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-sky-400 shrink-0" />
            <span>ทะเบียนใบอนุญาตประกอบวิชาชีพครูและผู้บริหาร (คุรุสภา)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            ระบบเฝ้าระวังวันหมดอายุล่วงหน้า 90 วัน ตามข้อบังคับคุรุสภาว่าด้วยใบอนุญาตประกอบวิชาชีพ
          </p>
        </div>

        <a
          href="https://ksp-eservice.ksp.or.th/"
          target="_blank"
          rel="noopener noreferrer"
          className="h-10 inline-flex items-center gap-2 px-4 rounded-xl bg-[#1b2838] hover:bg-[#2a475e] text-sky-300 text-xs font-medium border border-slate-700/80 transition-all shadow-sm"
        >
          <ExternalLink className="w-4 h-4 shrink-0" />
          <span>ระบบ KSP e-Service (คุรุสภา)</span>
        </a>
      </div>

      {/* Stats Summary Cards (Equal 8pt Grid & Height) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div
          onClick={() => setFilterHealth('ALL')}
          className={`cursor-pointer p-5 rounded-2xl border transition-all ${
            filterHealth === 'ALL'
              ? 'border-sky-500 bg-sky-500/10 shadow-md shadow-sky-950/20'
              : 'border-slate-800 bg-[#111823]/80 hover:border-slate-700'
          }`}
        >
          <span className="text-xs text-slate-400 block mb-1">ใบอนุญาตทั้งหมด</span>
          <span className="text-2xl font-bold font-mono text-white">{stats.total}</span>
        </div>

        <div
          onClick={() => setFilterHealth('VALID')}
          className={`cursor-pointer p-5 rounded-2xl border transition-all ${
            filterHealth === 'VALID'
              ? 'border-emerald-500 bg-emerald-500/10 shadow-md shadow-emerald-950/20'
              : 'border-slate-800 bg-[#111823]/80 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400">สถานะปกติ</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          </div>
          <span className="text-2xl font-bold font-mono text-emerald-400">{stats.valid}</span>
        </div>

        <div
          onClick={() => setFilterHealth('EXPIRING_SOON')}
          className={`cursor-pointer p-5 rounded-2xl border transition-all ${
            filterHealth === 'EXPIRING_SOON'
              ? 'border-amber-500 bg-amber-500/10 shadow-md shadow-amber-950/20'
              : 'border-slate-800 bg-[#111823]/80 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400">ใกล้หมดอายุ (ใน 90 วัน)</span>
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          </div>
          <span className="text-2xl font-bold font-mono text-amber-400">{stats.expiringSoon}</span>
        </div>

        <div
          onClick={() => setFilterHealth('EXPIRED')}
          className={`cursor-pointer p-5 rounded-2xl border transition-all ${
            filterHealth === 'EXPIRED'
              ? 'border-rose-500 bg-rose-500/10 shadow-md shadow-rose-950/20'
              : 'border-slate-800 bg-[#111823]/80 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400">หมดอายุแล้ว</span>
            <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0" />
          </div>
          <span className="text-2xl font-bold font-mono text-rose-400">{stats.expired}</span>
        </div>
      </div>

      {/* Table List */}
      <div className="bg-[#111823]/80 p-5 rounded-2xl border border-slate-800/80 space-y-4">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อผู้ถือใบอนุญาต หรือเลขที่..."
            className="w-full h-10 bg-[#101822] border border-slate-700/80 rounded-xl pl-10 pr-3.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 transition-all"
          />
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-sm text-slate-200">
            <thead className="bg-[#101822] text-slate-400 uppercase tracking-wider font-semibold text-xs border-b border-slate-800">
              <tr>
                <th className="px-4 py-3.5 rounded-l-lg min-w-[200px]">ผู้ถือใบอนุญาต</th>
                <th className="px-4 py-3.5 min-w-[170px]">ประเภทใบอนุญาต</th>
                <th className="px-4 py-3.5 min-w-[160px]">เลขที่ใบอนุญาต</th>
                <th className="px-4 py-3.5 min-w-[130px]">วันออกใบอนุญาต</th>
                <th className="px-4 py-3.5 min-w-[130px]">วันหมดอายุ</th>
                <th className="px-4 py-3.5 text-center min-w-[110px]">วันคงเหลือ</th>
                <th className="px-4 py-3.5 rounded-r-lg text-right min-w-[125px]">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filtered.map((item, idx) => {
                const posDisplay = item.position.replace('ผู้อำนวยการสถานศึกษา', 'ผอ.สถานศึกษา');
                return (
                  <tr key={idx} className="hover:bg-[#1a2636]/50 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-white text-base truncate max-w-[180px]" title={item.teacherName}>
                        {item.teacherName}
                      </div>
                      <div className="text-xs text-slate-400 truncate max-w-[180px]" title={item.position}>
                        {posDisplay}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-sky-300 font-medium text-xs sm:text-sm">
                      <div className="truncate max-w-[160px]" title={item.type}>{item.type}</div>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-slate-200 text-xs sm:text-sm whitespace-nowrap" title={item.number}>
                      {item.number}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-slate-400 text-xs sm:text-sm whitespace-nowrap">
                      {item.issueDate}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-slate-200 text-xs sm:text-sm whitespace-nowrap">
                      {item.expiryDate}
                    </td>
                    <td className="px-4 py-3.5 font-mono font-bold text-center text-xs sm:text-sm whitespace-nowrap">
                      <span className={item.daysRemaining <= 0 ? 'text-rose-400' : item.daysRemaining <= 90 ? 'text-amber-400' : 'text-emerald-400'}>
                        {item.daysRemaining} วัน
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      {item.health === 'VALID' ? (
                        <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 min-w-[105px]">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          <span>ปกติ</span>
                        </span>
                      ) : item.health === 'EXPIRING_SOON' ? (
                        <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 min-w-[105px]">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>เตือนต่ออายุ</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30 min-w-[105px]">
                          <AlertOctagon className="w-3.5 h-3.5 shrink-0" />
                          <span>หมดอายุ</span>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
