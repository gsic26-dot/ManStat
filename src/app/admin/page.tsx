'use client';

/**
 * ============================================================================
 * ManStat-Modern: Administrative Management Center (/admin)
 * ============================================================================
 * Master Management Center for Superuser and HR Administrators:
 * 1. จัดการข้อมูลบุคลากร (Staff Directory & Access Control)
 * 2. คณะกรรมการสถานศึกษา (Basic Education School Board)
 * 3. ข้อมูลสถานศึกษา (School Master Configuration)
 * 4. ปีงบประมาณและวันหยุด (Fiscal Year & Official Holidays)
 * 5. บันทึกความปลอดภัย PDPA (Immutable PDPA Access Audit Logs)
 *
 * Strict Zero-Emoji policy, pure Lucide SVG icons, 8px standard gap.
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
  Building,
  Calendar,
  PlusCircle,
  Search,
  Filter,
  Edit,
  Trash2,
  Save,
  AlertCircle,
  Award,
  Phone,
  Mail,
  MapPin,
  UserPlus,
} from 'lucide-react';
import {
  INITIAL_TEACHERS,
  INITIAL_BOARD_MEMBERS,
  INITIAL_SCHOOL_INFO,
  ACTIVE_CLASSES,
  TeacherRecord,
  BoardMemberRecord,
} from '@/lib/data/schoolData';
import { ExcelExportButton } from '@/components/export/ExcelExportButton';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<
    'staff' | 'board' | 'school' | 'fiscal' | 'audit'
  >('staff');

  // Staff State
  const [teachers, setTeachers] = useState<TeacherRecord[]>(INITIAL_TEACHERS);
  const [staffSearch, setStaffSearch] = useState('');
  const [selectedStaff, setSelectedStaff] = useState<TeacherRecord | null>(null);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);

  // School Board State
  const [boardMembers, setBoardMembers] = useState<BoardMemberRecord[]>(INITIAL_BOARD_MEMBERS);
  const [boardSearch, setBoardSearch] = useState('');
  const [selectedBoardMember, setSelectedBoardMember] = useState<BoardMemberRecord | null>(null);
  const [isBoardModalOpen, setIsBoardModalOpen] = useState(false);

  // School Info State
  const [schoolInfo, setSchoolInfo] = useState(INITIAL_SCHOOL_INFO);
  const [activeClasses, setActiveClasses] = useState<string[]>(ACTIVE_CLASSES);

  // Fiscal Year & Holidays State
  const [fiscalYearBE, setFiscalYearBE] = useState(2570);
  const [holidays, setHolidays] = useState([
    { id: 'h1', date: '2026-10-23', name: 'วันปิยมหาราช', type: 'วันหยุดราชการประจำปี' },
    { id: 'h2', date: '2026-12-05', name: 'วันคล้ายวันพระบรมราชสมภพ ร.9 / วันพ่อแห่งชาติ', type: 'วันหยุดราชการประจำปี' },
    { id: 'h3', date: '2026-12-10', name: 'วันรัฐธรรมนูญ', type: 'วันหยุดราชการประจำปี' },
    { id: 'h4', date: '2026-12-31', name: 'วันสิ้นปี', type: 'วันหยุดราชการประจำปี' },
    { id: 'h5', date: '2027-01-01', name: 'วันขึ้นปีใหม่', type: 'วันหยุดราชการประจำปี' },
    { id: 'h6', date: '2027-01-16', name: 'วันครูแห่งชาติ (วันหยุดสถานศึกษา)', type: 'วันหยุดเฉพาะสถานศึกษา' },
  ]);
  const [newHolidayName, setNewHolidayName] = useState('');
  const [newHolidayDate, setNewHolidayDate] = useState('');

  // Sample Immutable Audit Logs
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
      actorName: 'นายธวัชชัย เหลืองโอฬาร',
      actorRole: 'hr_admin',
      targetName: 'ระบบส่วนกลาง',
      ipAddress: '192.168.1.50',
      timestamp: '2026-11-15T14:20:00Z',
      details: 'ปรับปรุงปฏิทินวันหยุดราชการประจำปีงบประมาณ 2570',
    },
    {
      id: 'log-004',
      action: 'UPDATE_STAFF_RECORD',
      actorName: 'Superuser (นายธีรศักดิ์ มโนธรรม)',
      actorRole: 'superuser',
      targetName: 'นางสาวทัชชกร ช่วยจังหรีด',
      ipAddress: '192.168.1.45',
      timestamp: '2026-11-14T09:12:00Z',
      details: 'บันทึกใบอนุญาตประกอบวิชาชีพ B-License ฉบับใหม่',
    },
  ];

  const handleSaveSchoolInfo = (e: React.FormEvent) => {
    e.preventDefault();
    alert('บันทึกข้อมูลสถานศึกษาเรียบร้อยแล้ว');
  };

  const handleAddHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHolidayName || !newHolidayDate) return;
    setHolidays((prev) => [
      ...prev,
      {
        id: `h-${Date.now()}`,
        date: newHolidayDate,
        name: newHolidayName,
        type: 'วันหยุดพิเศษ / ตามมติ ครม.',
      },
    ]);
    setNewHolidayName('');
    setNewHolidayDate('');
  };

  const handleDeleteHoliday = (id: string) => {
    if (confirm('คุณต้องการลบวันหยุดนี้ใช่หรือไม่?')) {
      setHolidays((prev) => prev.filter((h) => h.id !== id));
    }
  };

  const filteredTeachers = teachers.filter(
    (t) =>
      t.name.toLowerCase().includes(staffSearch.toLowerCase()) ||
      t.employeeCode.toLowerCase().includes(staffSearch.toLowerCase()) ||
      t.position.toLowerCase().includes(staffSearch.toLowerCase()) ||
      t.department.toLowerCase().includes(staffSearch.toLowerCase())
  );

  const filteredBoard = boardMembers.filter(
    (b) =>
      b.fullName.toLowerCase().includes(boardSearch.toLowerCase()) ||
      b.positionTitle.toLowerCase().includes(boardSearch.toLowerCase()) ||
      b.organization.toLowerCase().includes(boardSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0e141b] text-slate-100 flex flex-col selection:bg-sky-500 selection:text-white">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-[#171a21]/95 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 shrink-0" />
              <span>กลับสู่หน้าหลัก</span>
            </Link>
            <div className="flex items-center gap-2 border-l border-slate-700 pl-3">
              <span className="font-bold text-base text-white">ศูนย์ผู้ดูแลระบบ (Admin Center)</span>
              <span className="px-2 py-0.5 text-[10px] uppercase font-mono font-bold rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Superuser / HR Admin
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ExcelExportButton fiscalYear={fiscalYearBE} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Navigation Tabs Bar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('staff')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'staff'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-950/40'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            <span>จัดการบุคลากร ({teachers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('board')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'board'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-950/40'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Award className="w-4 h-4 shrink-0" />
            <span>คณะกรรมการสถานศึกษา ({boardMembers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('school')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'school'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-950/40'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Building className="w-4 h-4 shrink-0" />
            <span>ข้อมูลสถานศึกษา</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('fiscal')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'fiscal'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-950/40'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Calendar className="w-4 h-4 shrink-0" />
            <span>ปีงบประมาณและวันหยุด ({holidays.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'audit'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-950/40'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>ตรวจสอบ PDPA Audit Logs</span>
          </button>
        </div>

        {/* =================================================================== */}
        {/* TAB 1: จัดการข้อมูลบุคลากร (Staff Directory Management) */}
        {/* =================================================================== */}
        {activeTab === 'staff' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#141b24] p-4 rounded-2xl border border-slate-800">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อครู, รหัสบุคลากร, หรือกลุ่มสาระ..."
                  value={staffSearch}
                  onChange={(e) => setStaffSearch(e.target.value)}
                  className="w-full bg-[#101822] border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-mono">
                  แสดง {filteredTeachers.length} จาก {teachers.length} ท่าน
                </span>
                <button
                  type="button"
                  onClick={() => alert('เปิดแบบฟอร์มเพิ่มข้าราชการครูใหม่')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-sm transition-all"
                >
                  <UserPlus className="w-4 h-4 shrink-0" />
                  <span>เพิ่มบุคลากร</span>
                </button>
              </div>
            </div>

            <div className="bg-[#111822] rounded-2xl border border-slate-800 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-[#16202c] text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3">รหัส / ชื่อ-สกุล</th>
                      <th className="px-4 py-3">ตำแหน่ง / วิทยฐานะ</th>
                      <th className="px-4 py-3">กลุ่มสาระฯ / สายงาน</th>
                      <th className="px-4 py-3 text-center">สิทธิ์การใช้งาน</th>
                      <th className="px-4 py-3 text-center">วันลาสะสม (ป/ก/พ)</th>
                      <th className="px-4 py-3 text-center">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {filteredTeachers.map((t) => (
                      <tr key={t.id} className="hover:bg-[#162231]/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-bold text-white">{t.name}</div>
                          <div className="text-[11px] font-mono text-sky-400 mt-0.5">
                            {t.employeeCode}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div>{t.position}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {t.academicStanding !== '-' ? t.academicStanding : 'ไม่มีวิทยฐานะ'}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          <div>{t.department}</div>
                          <div className="text-[10px] text-slate-500">{t.division}</div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {t.employeeCode === 'EXE-001' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              Superuser
                            </span>
                          ) : t.employeeCode === 'TCH-002' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                              HR Admin
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                              Teacher
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center font-mono">
                          <span className="text-rose-400 font-bold">{t.sickUsed}</span> /{' '}
                          <span className="text-amber-400 font-bold">{t.personalUsed}</span> /{' '}
                          <span className="text-emerald-400 font-bold">{t.vacationUsed}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedStaff(t);
                              setIsStaffModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors"
                            title="แก้ไขข้อมูลบุคลากร"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 2: คณะกรรมการสถานศึกษาขั้นพื้นฐาน (School Board Management) */}
        {/* =================================================================== */}
        {activeTab === 'board' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#141b24] p-4 rounded-2xl border border-slate-800">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อกรรมการ, ตำแหน่ง, หรือองค์กร..."
                  value={boardSearch}
                  onChange={(e) => setBoardSearch(e.target.value)}
                  className="w-full bg-[#101822] border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-mono">
                  ทั้งหมด {boardMembers.length} ท่าน (วาระที่ 1)
                </span>
                <button
                  type="button"
                  onClick={() => alert('เปิดแบบฟอร์มเพิ่มกรรมการสถานศึกษา')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-sm transition-all"
                >
                  <PlusCircle className="w-4 h-4 shrink-0" />
                  <span>เพิ่มกรรมการสถานศึกษา</span>
                </button>
              </div>
            </div>

            <div className="bg-[#111822] rounded-2xl border border-slate-800 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-[#16202c] text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3">ลำดับ</th>
                      <th className="px-4 py-3">ชื่อ - สกุล</th>
                      <th className="px-4 py-3">ตำแหน่งในคณะกรรมการ</th>
                      <th className="px-4 py-3">สังกัด / องค์กร</th>
                      <th className="px-4 py-3 text-center">วาระ</th>
                      <th className="px-4 py-3 text-center">สถานะ</th>
                      <th className="px-4 py-3 text-center">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {filteredBoard.map((b, idx) => (
                      <tr key={b.id} className="hover:bg-[#162231]/50 transition-colors">
                        <td className="px-4 py-3 font-mono text-slate-500">{idx + 1}</td>
                        <td className="px-4 py-3 font-bold text-white">{b.fullName}</td>
                        <td className="px-4 py-3">
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                            {b.positionTitle}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-400">{b.organization}</td>
                        <td className="px-4 py-3 text-center font-mono">วาระที่ {b.termNumber}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3 shrink-0" />
                            <span>{b.status}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedBoardMember(b);
                              setIsBoardModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors"
                            title="แก้ไขข้อมูลกรรมการ"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 3: ข้อมูลสถานศึกษา (School Master Information) */}
        {/* =================================================================== */}
        {activeTab === 'school' && (
          <div className="bg-[#111822] p-6 rounded-2xl border border-slate-800 max-w-4xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Building className="w-5 h-5 text-sky-400 shrink-0" />
                  <span>ข้อมูลพื้นฐานสถานศึกษา (School Profile Configuration)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  ข้อมูลนี้จะถูกนำไปใช้ในหัวกระดาษราชการ แบบฟอร์มใบลา A4 และรายงาน สพฐ. ทั้งระบบ
                </p>
              </div>

              <span className="px-2.5 py-1 rounded-xl text-xs font-mono font-bold bg-sky-500/10 text-sky-300 border border-sky-500/30">
                รหัส สพฐ: {schoolInfo.schoolCode8}
              </span>
            </div>

            <form onSubmit={handleSaveSchoolInfo} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">ชื่อสถานศึกษา</label>
                  <input
                    type="text"
                    value={schoolInfo.schoolName}
                    onChange={(e) => setSchoolInfo({ ...schoolInfo, schoolName: e.target.value })}
                    className="w-full bg-[#16202c] border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">หน่วยงานต้นสังกัด</label>
                  <input
                    type="text"
                    value={schoolInfo.affiliation}
                    onChange={(e) => setSchoolInfo({ ...schoolInfo, affiliation: e.target.value })}
                    className="w-full bg-[#16202c] border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    ผู้อำนวยการสถานศึกษา
                  </label>
                  <input
                    type="text"
                    value={schoolInfo.directorName}
                    onChange={(e) => setSchoolInfo({ ...schoolInfo, directorName: e.target.value })}
                    className="w-full bg-[#16202c] border border-slate-700 rounded-xl p-2.5 text-white font-bold focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">ตำแหน่งทางการบริหาร</label>
                  <input
                    type="text"
                    value={schoolInfo.directorPosition}
                    onChange={(e) =>
                      setSchoolInfo({ ...schoolInfo, directorPosition: e.target.value })
                    }
                    className="w-full bg-[#16202c] border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    ผู้รักษาการแทนลำดับที่ 1
                  </label>
                  <input
                    type="text"
                    value={schoolInfo.actingDirector1}
                    onChange={(e) =>
                      setSchoolInfo({ ...schoolInfo, actingDirector1: e.target.value })
                    }
                    className="w-full bg-[#16202c] border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    ผู้รักษาการแทนลำดับที่ 2
                  </label>
                  <input
                    type="text"
                    value={schoolInfo.actingDirector2}
                    onChange={(e) =>
                      setSchoolInfo({ ...schoolInfo, actingDirector2: e.target.value })
                    }
                    className="w-full bg-[#16202c] border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    หมายเลขโทรศัพท์ติดต่อ
                  </label>
                  <input
                    type="text"
                    value={schoolInfo.contactPhone}
                    onChange={(e) =>
                      setSchoolInfo({ ...schoolInfo, contactPhone: e.target.value })
                    }
                    className="w-full bg-[#16202c] border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">อีเมลทางการ</label>
                  <input
                    type="email"
                    value={schoolInfo.email}
                    onChange={(e) => setSchoolInfo({ ...schoolInfo, email: e.target.value })}
                    className="w-full bg-[#16202c] border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">รหัสสถานศึกษา 10 หลัก</label>
                  <input
                    type="text"
                    value={schoolInfo.schoolCode10}
                    onChange={(e) => setSchoolInfo({ ...schoolInfo, schoolCode10: e.target.value })}
                    className="w-full bg-[#16202c] border border-slate-700 rounded-xl p-2.5 text-white font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">รหัสสถานศึกษา 8 หลัก (สพฐ.)</label>
                  <input
                    type="text"
                    value={schoolInfo.schoolCode8}
                    onChange={(e) => setSchoolInfo({ ...schoolInfo, schoolCode8: e.target.value })}
                    className="w-full bg-[#16202c] border border-slate-700 rounded-xl p-2.5 text-white font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">ปีการศึกษา</label>
                  <input
                    type="text"
                    value={schoolInfo.academicYear}
                    onChange={(e) => setSchoolInfo({ ...schoolInfo, academicYear: e.target.value })}
                    className="w-full bg-[#16202c] border border-slate-700 rounded-xl p-2.5 text-white font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">ภาคเรียนที่</label>
                  <input
                    type="text"
                    value={schoolInfo.currentTerm}
                    onChange={(e) => setSchoolInfo({ ...schoolInfo, currentTerm: e.target.value })}
                    className="w-full bg-[#16202c] border border-slate-700 rounded-xl p-2.5 text-white font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-slate-300 font-semibold mb-1">จำนวนนักเรียนรวม (คน)</label>
                  <input
                    type="number"
                    value={schoolInfo.studentCount}
                    onChange={(e) => setSchoolInfo({ ...schoolInfo, studentCount: Number(e.target.value) || 0 })}
                    className="w-full bg-[#16202c] border border-slate-700 rounded-xl p-2.5 text-white font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-slate-300 font-semibold mb-1">ที่ตั้งสถานศึกษา</label>
                  <input
                    type="text"
                    value={schoolInfo.address}
                    onChange={(e) => setSchoolInfo({ ...schoolInfo, address: e.target.value })}
                    className="w-full bg-[#16202c] border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Active Classes Management */}
              <div className="pt-4 border-t border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Building className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>ระดับชั้นเรียนที่เปิดทำการสอน (Active Classes)</span>
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      คลิกเพื่อเปิดหรือปิดชั้นเรียนสำหรับปีการศึกษานี้ (ใช้งานในตารางภาระงานและครูประจำชั้น)
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-xl text-xs font-mono font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                    เปิดสอน {activeClasses.length} ชั้นเรียน
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 pt-2">
                  {ACTIVE_CLASSES.map((cls) => {
                    const isActive = activeClasses.includes(cls);
                    return (
                      <button
                        key={cls}
                        type="button"
                        onClick={() => {
                          if (isActive) {
                            setActiveClasses((prev) => prev.filter((c) => c !== cls));
                          } else {
                            setActiveClasses((prev) => [...prev, cls]);
                          }
                        }}
                        className={`p-2.5 rounded-xl border text-center font-medium text-xs transition-all ${
                          isActive
                            ? 'bg-sky-500/15 border-sky-500/40 text-sky-200 shadow-sm'
                            : 'bg-slate-800/40 border-slate-700/60 text-slate-400 line-through opacity-60 hover:opacity-90'
                        }`}
                      >
                        {cls}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold transition-all shadow-md shadow-sky-950/40"
                >
                  <Save className="w-4 h-4 shrink-0" />
                  <span>บันทึกการตั้งค่าสถานศึกษา</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 4: ปีงบประมาณและปฏิทินวันหยุด (Fiscal Year & Holidays) */}
        {/* =================================================================== */}
        {activeTab === 'fiscal' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Fiscal Year Overview */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-[#111822] p-5 rounded-2xl border border-slate-800 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-sky-400 shrink-0" />
                  <span>รอบปีงบประมาณราชการ</span>
                </h3>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1">ปีงบประมาณปัจจุบัน</label>
                    <input
                      type="number"
                      value={fiscalYearBE}
                      onChange={(e) => setFiscalYearBE(Number(e.target.value))}
                      className="w-full bg-[#16202c] border border-slate-700 rounded-xl p-2.5 text-white font-mono font-bold"
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-[#151e2b] border border-slate-800/80 space-y-2">
                    <div className="text-[11px] font-semibold text-sky-300">
                      รอบการประเมินที่ 1 (ก.ค.ศ. ว15/2561)
                    </div>
                    <div className="text-slate-300 font-mono text-[11px]">
                      1 ตุลาคม {fiscalYearBE - 1} - 31 มีนาคม {fiscalYearBE}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#151e2b] border border-slate-800/80 space-y-2">
                    <div className="text-[11px] font-semibold text-emerald-300">
                      รอบการประเมินที่ 2 (ก.ค.ศ. ว15/2561)
                    </div>
                    <div className="text-slate-300 font-mono text-[11px]">
                      1 เมษายน {fiscalYearBE} - 30 กันยายน {fiscalYearBE}
                    </div>
                  </div>
                </div>
              </div>

              {/* Add Holiday Box */}
              <form
                onSubmit={handleAddHoliday}
                className="bg-[#111822] p-5 rounded-2xl border border-slate-800 space-y-3 text-xs"
              >
                <h4 className="font-bold text-white flex items-center gap-2">
                  <PlusCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>เพิ่มวันหยุดราชการ</span>
                </h4>

                <div>
                  <label className="block text-slate-400 mb-1">ชื่อวันหยุด</label>
                  <input
                    type="text"
                    placeholder="เช่น วันหยุดราชการเป็นกรณีพิเศษ..."
                    value={newHolidayName}
                    onChange={(e) => setNewHolidayName(e.target.value)}
                    required
                    className="w-full bg-[#16202c] border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">วันที่</label>
                  <input
                    type="date"
                    value={newHolidayDate}
                    onChange={(e) => setNewHolidayDate(e.target.value)}
                    required
                    className="w-full bg-[#16202c] border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold transition-colors"
                >
                  <PlusCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>บันทึกวันหยุด</span>
                </button>
              </form>
            </div>

            {/* Holiday Calendar List */}
            <div className="lg:col-span-2 bg-[#111822] rounded-2xl border border-slate-800 overflow-hidden">
              <div className="p-4 bg-[#16202c] border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white">
                    ปฏิทินวันหยุดราชการประจำปีงบประมาณ {fiscalYearBE}
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    ระบบคำนวณวันลาจะนำวันหยุดเหล่านี้ไปหักลบออกจากวันลาจริงโดยอัตโนมัติ (Zero-GAS Engine)
                  </p>
                </div>
                <span className="font-mono text-xs text-amber-400 font-bold">
                  {holidays.length} วัน
                </span>
              </div>

              <div className="divide-y divide-slate-800/60 text-xs">
                {holidays.map((h) => (
                  <div
                    key={h.id}
                    className="p-3.5 flex items-center justify-between hover:bg-[#151f2c] transition-colors"
                  >
                    <div>
                      <div className="font-semibold text-white">{h.name}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{h.type}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-sky-400">
                        {new Date(h.date).toLocaleDateString('th-TH', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteHoliday(h.id)}
                        className="p-1 rounded-lg hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition-colors"
                        title="ลบวันหยุด"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 5: บันทึกความปลอดภัย PDPA (Immutable Audit Logs) */}
        {/* =================================================================== */}
        {activeTab === 'audit' && (
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
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
                      <td className="px-4 py-3 text-slate-300">{log.targetName}</td>
                      <td className="px-4 py-3 font-mono text-slate-400">{log.ipAddress}</td>
                      <td className="px-4 py-3 text-slate-400">{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Staff Edit Modal */}
      {isStaffModalOpen && selectedStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#141d27] border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm">
                แก้ไขข้อมูลบุคลากร: {selectedStaff.name} ({selectedStaff.employeeCode})
              </h3>
              <button
                type="button"
                onClick={() => setIsStaffModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-slate-400 mb-1">ตำแหน่ง</label>
                <input
                  type="text"
                  value={selectedStaff.position}
                  onChange={(e) =>
                    setSelectedStaff({ ...selectedStaff, position: e.target.value })
                  }
                  className="w-full bg-[#101822] border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">วิทยฐานะ</label>
                <input
                  type="text"
                  value={selectedStaff.academicStanding}
                  onChange={(e) =>
                    setSelectedStaff({ ...selectedStaff, academicStanding: e.target.value })
                  }
                  className="w-full bg-[#101822] border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">กลุ่มสาระการเรียนรู้</label>
                <input
                  type="text"
                  value={selectedStaff.department}
                  onChange={(e) =>
                    setSelectedStaff({ ...selectedStaff, department: e.target.value })
                  }
                  className="w-full bg-[#101822] border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">สิทธิ์การเข้าใช้งานระบบ</label>
                  <select
                    value={selectedStaff.accessLevel || 'User'}
                    onChange={(e) =>
                      setSelectedStaff({ ...selectedStaff, accessLevel: e.target.value })
                    }
                    className="w-full bg-[#101822] border border-slate-700 rounded-xl p-2.5 text-white"
                  >
                    <option value="Superuser">Superuser (สูงสุด)</option>
                    <option value="Admin">Admin (งานบุคคล/บริหาร)</option>
                    <option value="User">User (ครูและบุคลากรทั่วไป)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">เวรประจำวัน</label>
                  <select
                    value={selectedStaff.dutyDay || '-'}
                    onChange={(e) =>
                      setSelectedStaff({ ...selectedStaff, dutyDay: e.target.value })
                    }
                    className="w-full bg-[#101822] border border-slate-700 rounded-xl p-2.5 text-white"
                  >
                    <option value="-">- ไม่ระบุ -</option>
                    <option value="จันทร์">วันจันทร์</option>
                    <option value="อังคาร">วันอังคาร</option>
                    <option value="พุธ">วันพุธ</option>
                    <option value="พฤหัสบดี">วันพฤหัสบดี</option>
                    <option value="ศุกร์">วันศุกร์</option>
                    <option value="เสาร์">วันเสาร์</option>
                    <option value="อาทิตย์">วันอาทิตย์</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">ชั้นเรียนที่รับผิดชอบ</label>
                  <input
                    type="text"
                    value={selectedStaff.classLevel || '-'}
                    placeholder="เช่น ป.1, ม.2, -"
                    onChange={(e) =>
                      setSelectedStaff({ ...selectedStaff, classLevel: e.target.value })
                    }
                    className="w-full bg-[#101822] border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">เบอร์โทรศัพท์</label>
                  <input
                    type="text"
                    value={selectedStaff.phone || ''}
                    placeholder="เช่น 081-xxx-xxxx"
                    onChange={(e) =>
                      setSelectedStaff({ ...selectedStaff, phone: e.target.value })
                    }
                    className="w-full bg-[#101822] border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">อีเมลติดต่อ</label>
                <input
                  type="email"
                  value={selectedStaff.email || ''}
                  onChange={(e) =>
                    setSelectedStaff({ ...selectedStaff, email: e.target.value })
                  }
                  className="w-full bg-[#101822] border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">ลาป่วยที่ใช้</label>
                  <input
                    type="number"
                    value={selectedStaff.sickUsed}
                    onChange={(e) =>
                      setSelectedStaff({
                        ...selectedStaff,
                        sickUsed: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full bg-[#101822] border border-slate-700 rounded-xl p-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">ลากิจที่ใช้</label>
                  <input
                    type="number"
                    value={selectedStaff.personalUsed}
                    onChange={(e) =>
                      setSelectedStaff({
                        ...selectedStaff,
                        personalUsed: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full bg-[#101822] border border-slate-700 rounded-xl p-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">พักผ่อนที่ใช้</label>
                  <input
                    type="number"
                    value={selectedStaff.vacationUsed}
                    onChange={(e) =>
                      setSelectedStaff({
                        ...selectedStaff,
                        vacationUsed: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full bg-[#101822] border border-slate-700 rounded-xl p-2 text-white font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsStaffModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  setTeachers((prev) =>
                    prev.map((t) => (t.id === selectedStaff.id ? selectedStaff : t))
                  );
                  setIsStaffModalOpen(false);
                  alert('บันทึกข้อมูลบุคลากรเรียบร้อยแล้ว');
                }}
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold"
              >
                บันทึกการเปลี่ยนแปลง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Board Member Edit Modal */}
      {isBoardModalOpen && selectedBoardMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#141d27] border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm">
                แก้ไขข้อมูลกรรมการสถานศึกษา: {selectedBoardMember.fullName}
              </h3>
              <button
                type="button"
                onClick={() => setIsBoardModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-slate-400 mb-1">ชื่อ - สกุล</label>
                <input
                  type="text"
                  value={selectedBoardMember.fullName}
                  onChange={(e) =>
                    setSelectedBoardMember({
                      ...selectedBoardMember,
                      fullName: e.target.value,
                    })
                  }
                  className="w-full bg-[#101822] border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">ตำแหน่งในคณะกรรมการ</label>
                <input
                  type="text"
                  value={selectedBoardMember.positionTitle}
                  onChange={(e) =>
                    setSelectedBoardMember({
                      ...selectedBoardMember,
                      positionTitle: e.target.value,
                    })
                  }
                  className="w-full bg-[#101822] border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">สังกัด / องค์กร</label>
                <input
                  type="text"
                  value={selectedBoardMember.organization}
                  onChange={(e) =>
                    setSelectedBoardMember({
                      ...selectedBoardMember,
                      organization: e.target.value,
                    })
                  }
                  className="w-full bg-[#101822] border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">อาชีพหลัก</label>
                  <input
                    type="text"
                    value={selectedBoardMember.occupation}
                    onChange={(e) =>
                      setSelectedBoardMember({
                        ...selectedBoardMember,
                        occupation: e.target.value,
                      })
                    }
                    className="w-full bg-[#101822] border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">เบอร์โทรศัพท์ติดต่อ</label>
                  <input
                    type="text"
                    value={selectedBoardMember.phone}
                    onChange={(e) =>
                      setSelectedBoardMember({
                        ...selectedBoardMember,
                        phone: e.target.value,
                      })
                    }
                    className="w-full bg-[#101822] border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">วาระที่</label>
                  <input
                    type="number"
                    value={selectedBoardMember.termNumber}
                    onChange={(e) =>
                      setSelectedBoardMember({
                        ...selectedBoardMember,
                        termNumber: Number(e.target.value) || 1,
                      })
                    }
                    className="w-full bg-[#101822] border border-slate-700 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">สถานะ</label>
                  <select
                    value={selectedBoardMember.status}
                    onChange={(e) =>
                      setSelectedBoardMember({
                        ...selectedBoardMember,
                        status: e.target.value,
                      })
                    }
                    className="w-full bg-[#101822] border border-slate-700 rounded-xl p-2.5 text-white"
                  >
                    <option value="ดำรงตำแหน่ง">ดำรงตำแหน่ง</option>
                    <option value="พ้นจากตำแหน่ง">พ้นจากตำแหน่ง</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsBoardModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  setBoardMembers((prev) =>
                    prev.map((b) =>
                      b.id === selectedBoardMember.id ? selectedBoardMember : b
                    )
                  );
                  setIsBoardModalOpen(false);
                  alert('บันทึกข้อมูลกรรมการเรียบร้อยแล้ว');
                }}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold"
              >
                บันทึกการเปลี่ยนแปลง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
