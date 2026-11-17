'use client';

/**
 * ============================================================================
 * ManStat-Modern: View Staff Directory (ทะเบียนประวัติบุคลากรทางการศึกษา)
 * ============================================================================
 * - Ground-truth 15 Teachers & Educational Personnel of Ban Takhob Community School
 * - Dual View Modes: Spacious Horizontal Table (Default) & Responsive Cards
 * - Quick Filter Pills for Department/Learning Groups
 * - Search by Name, Employee Code, Department
 * - CitizenIdShield for PDPA Compliance
 * - Personnel Portfolio & Education History Modal
 * - Zero emojis, pure Lucide SVG icons with strict 8px gap.
 * ============================================================================
 */

import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  GraduationCap,
  Calendar,
  Phone,
  Mail,
  Award,
  BookOpen,
  ChevronRight,
  X,
  LayoutList,
  LayoutGrid,
} from 'lucide-react';
import { INITIAL_TEACHERS, type TeacherRecord } from '@/lib/data/schoolData';
import { CitizenIdShield } from '@/components/security/CitizenIdShield';
import { calculateTenure } from '@/lib/regulations/fiscal-and-retirement';

export const ViewStaffDirectory: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherRecord | null>(null);

  // Unique departments for filter pills
  const departments = useMemo(() => {
    const set = new Set<string>();
    INITIAL_TEACHERS.forEach((t) => {
      if (t.department) set.add(t.department);
    });
    return Array.from(set);
  }, []);

  const filteredTeachers = useMemo(() => {
    return INITIAL_TEACHERS.filter((t) => {
      const matchSearch =
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.department.toLowerCase().includes(searchTerm.toLowerCase());

      const matchDept = selectedDept === 'ALL' || t.department === selectedDept;

      return matchSearch && matchDept;
    });
  }, [searchTerm, selectedDept]);

  return (
    <div className="space-y-6">
      {/* View Header & Controls */}
      <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-sky-400 shrink-0" />
              <span>ทะเบียนประวัติบุคลากร (Staff Directory)</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              โรงเรียนชุมชนบ้านตะขบ สพป.นครราชสีมา เขต 3 (รวมบุคลากร {INITIAL_TEACHERS.length} คน)
            </p>
          </div>

          {/* Search & View Switcher */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 shrink-0" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ค้นหาชื่อ, ตำแหน่ง, รหัส..."
                className="h-10 bg-[#101822] border border-slate-700 rounded-xl pl-10 pr-3.5 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500 w-56 sm:w-64 transition-all"
              />
            </div>

            <div className="inline-flex p-1 bg-[#101822] border border-slate-700 rounded-xl">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                  viewMode === 'table'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="มุมมองตารางแนวยาว อ่านง่าย"
              >
                <LayoutList className="w-4 h-4 shrink-0" />
                <span>ตาราง</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                  viewMode === 'grid'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="มุมมองการ์ด"
              >
                <LayoutGrid className="w-4 h-4 shrink-0" />
                <span>การ์ด</span>
              </button>
            </div>
          </div>
        </div>

        {/* Quick Filter Pills for Department */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-2 border-t border-slate-800">
          <span className="text-xs text-slate-400 font-semibold shrink-0 mr-1">
            กลุ่มสาระ/ฝ่าย:
          </span>
          <button
            type="button"
            onClick={() => setSelectedDept('ALL')}
            className={`px-3 py-1 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0 ${
              selectedDept === 'ALL'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'bg-[#101822] text-slate-300 hover:bg-slate-800 border border-slate-700'
            }`}
          >
            ทั้งหมด ({INITIAL_TEACHERS.length})
          </button>
          {departments.map((dept) => {
            const count = INITIAL_TEACHERS.filter((t) => t.department === dept).length;
            const isSelected = selectedDept === dept;
            return (
              <button
                key={dept}
                type="button"
                onClick={() => setSelectedDept(dept)}
                className={`px-3 py-1 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0 ${
                  isSelected
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'bg-[#101822] text-slate-300 hover:bg-slate-800 border border-slate-700'
                }`}
              >
                {dept} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Main View Mode: Table (Default & Recommended) */}
      {viewMode === 'table' ? (
        <div className="bg-[#111823] rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-200">
              <thead className="bg-[#16202d] text-xs sm:text-sm uppercase text-slate-400 tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th scope="col" className="px-4 py-3.5 text-center w-14">ลำดับ</th>
                  <th scope="col" className="px-5 py-3.5">บุคลากร</th>
                  <th scope="col" className="px-5 py-3.5">ตำแหน่ง / วิทยฐานะ</th>
                  <th scope="col" className="px-5 py-3.5">กลุ่มสาระ / ฝ่าย</th>
                  <th scope="col" className="px-5 py-3.5">เลขประจำตัวประชาชน (PDPA)</th>
                  <th scope="col" className="px-4 py-3.5 text-center">อายุราชการ</th>
                  <th scope="col" className="px-4 py-3.5">ติดต่อ</th>
                  <th scope="col" className="px-4 py-3.5 text-center">แฟ้มประวัติ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 font-sans">
                {filteredTeachers.map((teacher, index) => {
                  const tenure = calculateTenure(teacher.startDate);
                  const isDirector = teacher.position.includes('ผู้อำนวยการ');
                  return (
                    <tr
                      key={teacher.id}
                      className={`hover:bg-[#182536]/60 transition-colors ${
                        isDirector ? 'bg-sky-950/20' : ''
                      }`}
                    >
                      {/* Sequence */}
                      <td className="px-4 py-4 text-center font-mono font-bold text-slate-400">
                        {index + 1}
                      </td>

                      {/* Staff Name & Initials */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 border border-slate-700 flex items-center justify-center text-sky-400 font-bold text-sm shrink-0 shadow-sm">
                            {teacher.firstName ? teacher.firstName[0] : 'ค'}
                          </div>
                          <div>
                            <div className="font-bold text-white text-base">
                              {teacher.name}
                            </div>
                            <div className="text-xs text-slate-400 font-mono">
                              รหัส: {teacher.employeeCode}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Position & Standing */}
                      <td className="px-5 py-4">
                        <div className="font-medium text-sky-300 text-sm">
                          {teacher.position}
                        </div>
                        {teacher.academicStanding && teacher.academicStanding !== '-' && (
                          <div className="text-xs text-slate-400 mt-0.5">
                            {teacher.academicStanding}
                          </div>
                        )}
                      </td>

                      {/* Department */}
                      <td className="px-5 py-4">
                        <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#101822] text-slate-300 border border-slate-700">
                          {teacher.department}
                        </span>
                      </td>

                      {/* Citizen ID Shield */}
                      <td className="px-5 py-4">
                        <CitizenIdShield
                          targetStaffId={teacher.id}
                          initialMaskedId={teacher.maskedCitizenId}
                        />
                      </td>

                      {/* Tenure */}
                      <td className="px-4 py-4 text-center whitespace-nowrap">
                        <span className="font-medium text-slate-200 text-xs sm:text-sm">
                          {tenure.years} ปี {tenure.months} เดือน
                        </span>
                        <span className="block text-[11px] text-slate-500 font-mono">
                          บรรจุ {teacher.startDate}
                        </span>
                      </td>

                      {/* Contact */}
                      <td className="px-4 py-4 text-xs sm:text-sm text-slate-300 whitespace-nowrap">
                        {teacher.phone && teacher.phone !== '-' && (
                          <div className="flex items-center gap-1.5 font-mono">
                            <Phone className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                            <span>{teacher.phone}</span>
                          </div>
                        )}
                        {teacher.email && teacher.email !== '-' && (
                          <div className="flex items-center gap-1.5 text-slate-400 font-mono mt-0.5">
                            <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span className="truncate max-w-[140px]">{teacher.email}</span>
                          </div>
                        )}
                      </td>

                      {/* Action: Open Portfolio */}
                      <td className="px-4 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedTeacher(teacher)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#1b2838] hover:bg-sky-600 text-slate-200 hover:text-white border border-slate-700 text-xs font-semibold transition-all shadow-sm"
                        >
                          <span>ก.พ.7</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Alternative Responsive Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTeachers.map((teacher) => {
            const tenure = calculateTenure(teacher.startDate);
            return (
              <div
                key={teacher.id}
                className="glass-panel p-5 rounded-2xl border border-slate-800 hover:border-sky-500/40 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 border border-slate-700 flex items-center justify-center text-sky-400 font-bold text-base shrink-0 shadow">
                      {teacher.firstName ? teacher.firstName[0] : 'ค'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-base font-bold text-white truncate">
                        {teacher.name}
                      </div>
                      <div className="text-sm text-sky-300 truncate font-medium">
                        {teacher.position}
                      </div>
                      <span className="inline-block mt-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#101822] text-slate-300 border border-slate-800">
                        {teacher.department}
                      </span>
                    </div>
                  </div>

                  {/* Citizen ID Shield */}
                  <div className="mb-3 pt-2 border-t border-slate-800/80">
                    <span className="text-xs text-slate-400 block mb-1">
                      เลขประจำตัวประชาชน (PDPA Shield):
                    </span>
                    <CitizenIdShield
                      targetStaffId={teacher.id}
                      initialMaskedId={teacher.maskedCitizenId}
                    />
                  </div>

                  {/* Meta details */}
                  <div className="space-y-2 text-xs sm:text-sm text-slate-300">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>
                        อายุราชการ: <strong className="text-slate-100">{tenure.years} ปี {tenure.months} เดือน</strong>
                      </span>
                    </div>
                    {teacher.phone && teacher.phone !== '-' && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-sky-400 shrink-0" />
                        <span className="font-mono text-slate-300">{teacher.phone}</span>
                      </div>
                    )}
                    {teacher.email && teacher.email !== '-' && (
                      <div className="flex items-center gap-2 truncate">
                        <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="font-mono text-slate-400 truncate">{teacher.email}</span>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedTeacher(teacher)}
                  className="mt-4 w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1b2838] hover:bg-[#2a475e] text-slate-200 hover:text-white border border-slate-700 text-xs sm:text-sm font-semibold transition-colors"
                >
                  <span>ดูประวัติ ก.พ.7 และพัฒนาวิชาชีพ</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Teacher Profile Portfolio Modal */}
      {selectedTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-xl bg-[#171a21] border border-[#2a475e] rounded-2xl shadow-2xl p-6 text-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-700 mb-4">
              <div className="flex items-center gap-2.5">
                <GraduationCap className="w-5 h-5 text-sky-400 shrink-0" />
                <h3 className="text-base sm:text-lg font-bold text-white">
                  แฟ้มประวัติ: {selectedTeacher.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTeacher(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs sm:text-sm">
              <div className="bg-[#101822] p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">รหัสบุคลากร:</span>
                  <span className="font-mono font-bold text-white">{selectedTeacher.employeeCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">ตำแหน่ง:</span>
                  <span className="text-sky-300 font-semibold">{selectedTeacher.position}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">วิทยฐานะ:</span>
                  <span className="text-slate-200">{selectedTeacher.academicStanding || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">สังกัดกลุ่มสาระ:</span>
                  <span className="text-slate-200">{selectedTeacher.department}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">วันที่เริ่มรับราชการ:</span>
                  <span className="font-mono text-slate-200">{selectedTeacher.startDate}</span>
                </div>
              </div>

              {/* Education history */}
              {selectedTeacher.educations && selectedTeacher.educations.length > 0 && (
                <div className="bg-[#101822] p-4 rounded-xl border border-slate-800">
                  <h4 className="font-semibold text-slate-200 mb-2 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-sky-400 shrink-0" />
                    <span>ประวัติการศึกษา</span>
                  </h4>
                  <div className="space-y-2">
                    {selectedTeacher.educations.map((edu, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-slate-800/40 border border-slate-700/60 text-xs">
                        <div className="font-semibold text-white">{edu.degree} {edu.major}</div>
                        <div className="text-slate-400">{edu.institute} ({edu.gradYear})</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Scout Qualification */}
              {selectedTeacher.highestScout && selectedTeacher.highestScout !== '-' && (
                <div className="bg-[#101822] p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>วุฒิทางลูกเสือ:</span>
                  </span>
                  <span className="font-bold text-amber-300">{selectedTeacher.highestScout}</span>
                </div>
              )}
            </div>

            <div className="mt-6 pt-3 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedTeacher(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-semibold transition-colors"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
