'use client';

/**
 * ============================================================================
 * ManStat-Modern: View Staff Directory (ทะเบียนประวัติบุคลากรทางการศึกษา)
 * ============================================================================
 * - Ground-truth 15 Teachers & Educational Personnel of Ban Takhob Community School
 * - Search by Name, Employee Code, Department
 * - CitizenIdShield for PDPA Compliance
 * - Personnel Portfolio & Education History
 * - Zero emojis, pure Lucide SVG icons with strict 8px gap.
 * ============================================================================
 */

import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Filter,
  GraduationCap,
  Calendar,
  Phone,
  Mail,
  Award,
  BookOpen,
  ChevronRight,
  X,
} from 'lucide-react';
import { INITIAL_TEACHERS, type TeacherRecord } from '@/lib/data/schoolData';
import { CitizenIdShield } from '@/components/security/CitizenIdShield';
import { calculateTenure } from '@/lib/regulations/fiscal-and-retirement';

export const ViewStaffDirectory: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherRecord | null>(null);

  // Unique departments
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
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-5 rounded-xl border border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-sky-400 shrink-0" />
            <span>ทะเบียนประวัติบุคลากร (Staff Directory)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            โรงเรียนชุมชนบ้านตะขบ สพป.นครราชสีมา เขต 3 (รวมบุคลากร {INITIAL_TEACHERS.length} คน)
          </p>
        </div>

        {/* Search & Filter Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาชื่อ, ตำแหน่ง, รหัส..."
              className="bg-[#101822] border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 w-48 sm:w-60"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-[#101822] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300">
            <Filter className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="bg-transparent text-sky-300 font-medium focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-[#171a21]">ทุกกลุ่มสาระ / ฝ่าย</option>
              {departments.map((dept) => (
                <option key={dept} value={dept} className="bg-[#171a21]">
                  {dept}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Teachers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTeachers.map((teacher) => {
          const tenure = calculateTenure(teacher.startDate);
          return (
            <div
              key={teacher.id}
              className="glass-panel p-5 rounded-xl border border-slate-800 hover:border-sky-500/40 transition-all flex flex-col justify-between"
            >
              <div>
                {/* Header with Avatar and Basic Info */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 border border-slate-700 flex items-center justify-center text-sky-400 font-bold text-base shrink-0 shadow">
                    {teacher.firstName ? teacher.firstName[0] : 'ค'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white truncate">
                      {teacher.name}
                    </div>
                    <div className="text-xs text-sky-300 truncate">
                      {teacher.position}
                    </div>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-medium bg-[#101822] text-slate-400 border border-slate-800">
                      {teacher.department}
                    </span>
                  </div>
                </div>

                {/* PDPA Citizen ID Shield */}
                <div className="mb-3 pt-2 border-t border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block mb-1">
                    เลขประจำตัวประชาชน (PDPA Shield):
                  </span>
                  <CitizenIdShield
                    targetStaffId={teacher.id}
                    initialMaskedId={teacher.maskedCitizenId}
                  />
                </div>

                {/* Meta details */}
                <div className="space-y-1.5 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>
                      อายุราชการ: <strong className="text-slate-100">{tenure.years} ปี {tenure.months} เดือน</strong>
                    </span>
                  </div>
                  {teacher.phone && teacher.phone !== '-' && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="font-mono text-slate-300">{teacher.phone}</span>
                    </div>
                  )}
                  {teacher.email && teacher.email !== '-' && (
                    <div className="flex items-center gap-2 truncate">
                      <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="font-mono text-slate-400 truncate">{teacher.email}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* View Portfolio Button */}
              <button
                type="button"
                onClick={() => setSelectedTeacher(teacher)}
                className="mt-4 w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1b2838] hover:bg-[#2a475e] text-slate-300 hover:text-white border border-slate-700 text-xs font-medium transition-colors"
              >
                <span>ดูประวัติ ก.พ.7 และพัฒนาวิชาชีพ</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Teacher Profile Modal */}
      {selectedTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-xl bg-[#171a21] border border-[#2a475e] rounded-xl shadow-2xl p-6 text-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700 mb-4">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-sky-400 shrink-0" />
                <h3 className="text-base font-semibold text-white">
                  แฟ้มประวัติ: {selectedTeacher.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTeacher(null)}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Basic Information */}
              <div className="bg-[#101822] p-4 rounded-lg border border-slate-800 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">ตำแหน่ง / วิทยฐานะ:</span>
                  <span className="text-sky-300 font-semibold">{selectedTeacher.position}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">กลุ่มสาระ / ฝ่าย:</span>
                  <span className="text-slate-200">{selectedTeacher.department}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">วันบรรจุเข้ารับราชการ:</span>
                  <span className="text-slate-200">{selectedTeacher.startDate}</span>
                </div>
                {selectedTeacher.division && selectedTeacher.division !== '-' && (
                  <div className="pt-2 border-t border-slate-800">
                    <span className="text-slate-400 block mb-1">งานฝ่ายที่ได้รับมอบหมาย:</span>
                    <span className="text-slate-300">{selectedTeacher.division}</span>
                  </div>
                )}
              </div>

              {/* Educations */}
              <div>
                <h4 className="font-semibold text-slate-200 mb-2 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>วุฒิการศึกษา</span>
                </h4>
                {selectedTeacher.educations.length === 0 ? (
                  <p className="text-slate-500 italic">ไม่มีข้อมูลวุฒิการศึกษาเพิ่มเติม</p>
                ) : (
                  <div className="space-y-2">
                    {selectedTeacher.educations.map((edu, idx) => (
                      <div key={idx} className="bg-[#101822] p-2.5 rounded-lg border border-slate-800">
                        <div className="font-medium text-slate-100">
                          {edu.degree} {edu.major}
                        </div>
                        <div className="text-slate-400 text-[11px]">
                          {edu.institute} (ปีสำเร็จการศึกษา: {edu.gradYear})
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Licenses */}
              <div>
                <h4 className="font-semibold text-slate-200 mb-2 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>ใบอนุญาตประกอบวิชาชีพ</span>
                </h4>
                {selectedTeacher.licenses.length === 0 ? (
                  <p className="text-slate-500 italic">ไม่มีข้อมูลใบอนุญาตประกอบวิชาชีพ</p>
                ) : (
                  <div className="space-y-2">
                    {selectedTeacher.licenses.map((lic, idx) => (
                      <div key={idx} className="bg-[#101822] p-2.5 rounded-lg border border-slate-800 flex justify-between items-center">
                        <div>
                          <div className="font-medium text-slate-100">{lic.type}</div>
                          <div className="text-slate-400 font-mono text-[11px]">เลขที่: {lic.number}</div>
                        </div>
                        <div className="text-right text-[11px] text-slate-400">
                          <div>หมดอายุ: {lic.expiryDate}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-800 text-right">
              <button
                type="button"
                onClick={() => setSelectedTeacher(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
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
