'use client';

/**
 * ============================================================================
 * ManStat-Modern: Administrative Management Center (/admin)
 * ============================================================================
 * Protected route: Restricted strictly to 'hr_admin' and 'director' roles.
 * Features:
 *   - School Settings Management (Master Configuration)
 *   - Personnel Record Administration
 *   - PDPA Audit Log Inspector (Tracks every Citizen ID decryption & access)
 *   - Zero emojis, pure Lucide SVG icons with strict 8px gap.
 * ============================================================================
 */

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  ShieldCheck,
  Settings,
  Users,
  Database,
  ArrowLeft,
  FileSpreadsheet,
  Clock,
  UserCheck,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { ExcelExportButton } from '@/components/export/ExcelExportButton';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'audit' | 'settings' | 'staff'>('audit');

  const sampleAuditLogs = [
    {
      id: 'log-001',
      action: 'REVEAL_CITIZEN_ID',
      actorName: 'Superuser (นายธีรศักดิ์ มโนธรรม)',
      actorRole: 'superuser',
      targetName: 'นางสาวกุสุมาลย์กมล พราหมณ์ตะขบ',
      ipAddress: '192.168.1.45',
      timestamp: '2026-11-16T10:45:12Z',
      details: 'ตรวจสอบเพื่อประกอบการจัดทำทะเบียนประวัติ ก.พ.7',
    },
    {
      id: 'log-002',
      action: 'APPROVE_LEAVE',
      actorName: 'Superuser (นายธีรศักดิ์ มโนธรรม)',
      actorRole: 'superuser',
      targetName: 'นายธวัชชัย เหลืองโอฬาร',
      ipAddress: '192.168.1.45',
      timestamp: '2026-11-16T10:00:00Z',
      details: 'อนุมัติคำขอลาป่วย 2 วันทำการ',
    },
    {
      id: 'log-003',
      action: 'UPDATE_SETTINGS',
      actorName: 'นายสมเกียรติ สิทธิพรหม',
      actorRole: 'hr_admin',
      targetName: 'ระบบส่วนกลาง',
      ipAddress: '192.168.1.50',
      timestamp: '2026-11-15T14:20:00Z',
      details: 'ปรับปรุงปฏิทินวันหยุดราชการประจำปีงบประมาณ 2570',
    },
  ];

  return (
    <div className="min-h-screen bg-[#0e141b] text-slate-100 flex flex-col selection:bg-sky-500 selection:text-white">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-[#171a21]/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 shrink-0" />
              <span>กลับสู่หน้าหลัก</span>
            </Link>
            <div className="flex items-center gap-2 border-l border-slate-700 pl-3">
              <span className="font-bold text-base text-white">ระบบจัดการผู้ดูแลระบบ (Admin Center)</span>
              <span className="px-2 py-0.5 text-[10px] uppercase font-mono font-semibold rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                สิทธิ์ระดับสูง
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ExcelExportButton fiscalYear={2570} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'audit'
                ? 'bg-sky-600 text-white'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>ประวัติการตรวจสอบ PDPA (Audit Logs)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'settings'
                ? 'bg-sky-600 text-white'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Settings className="w-4 h-4 shrink-0" />
            <span>ตั้งค่าสถานศึกษา (School Settings)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('staff')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'staff'
                ? 'bg-sky-600 text-white'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            <span>จัดการข้อมูลบุคลากร (Staff Directory)</span>
          </button>
        </div>

        {/* Tab 1: PDPA Audit Logs */}
        {activeTab === 'audit' && (
          <div className="glass-panel p-6 rounded-xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>บันทึกประวัติการเข้าถึงข้อมูลอ่อนไหว (PDPA Audit Logs)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  ระบบบันทึก Log แบบไม่สามารถแก้ไขได้ (Append-only) ทุกครั้งที่มีการเปิดเผยเลขประจำตัวประชาชน 13 หลัก
                </p>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                ทั้งหมด {sampleAuditLogs.length} รายการล่าสุด
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-[#101822] text-slate-400 uppercase tracking-wider font-semibold">
                  <tr>
                    <th scope="col" className="px-4 py-3 rounded-l-lg">วันและเวลา</th>
                    <th scope="col" className="px-4 py-3">ประเภทกิจกรรม</th>
                    <th scope="col" className="px-4 py-3">ผู้ดำเนินการ</th>
                    <th scope="col" className="px-4 py-3">เป้าหมายข้อมูล</th>
                    <th scope="col" className="px-4 py-3">IP Address</th>
                    <th scope="col" className="px-4 py-3 rounded-r-lg">รายละเอียด</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {sampleAuditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#1a2636]/50 transition-colors">
                      <td className="px-4 py-3 font-mono text-slate-400 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString('th-TH')}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-200">
                        {log.actorName} ({log.actorRole})
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {log.targetName}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-400">
                        {log.ipAddress}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {log.details}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: School Settings */}
        {activeTab === 'settings' && (
          <div className="glass-panel p-6 rounded-xl border border-slate-800 max-w-2xl space-y-4">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-sky-400 shrink-0" />
              <span>ข้อมูลสถานศึกษาและปีงบประมาณ</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">ชื่อสถานศึกษา:</label>
                <input
                  type="text"
                  readOnly
                  value="โรงเรียนชุมชนบ้านตะขบ"
                  className="w-full bg-[#101822] border border-slate-700 rounded-lg p-2.5 text-slate-200 font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">หน่วยงานต้นสังกัด:</label>
                <input
                  type="text"
                  readOnly
                  value="สำนักงานเขตพื้นที่การศึกษาประถมศึกษานครราชสีมา เขต 3"
                  className="w-full bg-[#101822] border border-slate-700 rounded-lg p-2.5 text-slate-200 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1">ปีงบประมาณปัจจุบัน:</label>
                  <input
                    type="text"
                    readOnly
                    value="พ.ศ. 2570"
                    className="w-full bg-[#101822] border border-slate-700 rounded-lg p-2.5 text-slate-200 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">ผู้อำนวยการสถานศึกษา:</label>
                  <input
                    type="text"
                    readOnly
                    value="นายสุรชัย ใจซื่อ"
                    className="w-full bg-[#101822] border border-slate-700 rounded-lg p-2.5 text-slate-200 font-medium"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Staff Directory Quick Summary */}
        {activeTab === 'staff' && (
          <div className="glass-panel p-6 rounded-xl border border-slate-800 space-y-4">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-sky-400 shrink-0" />
              <span>สรุปทะเบียนประวัติบุคลากร</span>
            </h3>
            <p className="text-xs text-slate-400">
              ข้อมูลบุคลากรได้รับการเชื่อมโยงกับฐานข้อมูล Supabase โดยตรงแบบ 100% Zero-GAS สามารถส่งออกรายงาน Excel สพฐ. ฉบับสมบูรณ์ได้จากปุ่มด้านบน
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
