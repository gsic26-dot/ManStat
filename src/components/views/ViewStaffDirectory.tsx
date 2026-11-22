'use client';

/**
 * ============================================================================
 * ManStat: View Staff Directory (ทะเบียนประวัติบุคลากรทางการศึกษา)
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

import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  GraduationCap,
  Calendar,
  Phone,
  Mail,
  Award,
  BookOpen,
  ChevronRight,
  ChevronDown,
  X,
  LayoutList,
  LayoutGrid,
} from 'lucide-react';
import { type TeacherRecord } from '@/lib/data/schoolData';
import { CitizenIdShield } from '@/components/security/CitizenIdShield';
import { calculateTenure } from '@/lib/regulations/fiscal-and-retirement';
import { useUserSettings } from '@/context/UserSettingsContext';
import { formatThaiDateDisplay } from '@/components/ui/ThaiDatePicker';
import {
  groupAndSortTeachers,
  formatAcademicStandingSubtext,
  getStaffBranch,
} from '@/lib/regulations/staff-sorting';
import { formatStaffName } from '@/lib/regulations/staff-formatting';

const getShortDeptName = (dept: string): string => {
  if (dept === 'ALL') return 'ทั้งหมด';
  if (dept.includes('บริหาร') || dept.includes('สนับสนุน')) return 'บริหารฯ';
  if (dept.includes('สังคม')) return 'สังคมฯ';
  if (dept.includes('วิทยาศาสตร์') || dept.includes('วิทย์')) return 'วิทย์ฯ';
  if (dept.includes('คณิต')) return 'คณิตฯ';
  if (dept.includes('ปฐมวัย')) return 'ปฐมวัย';
  if (dept.includes('ต่างประเทศ')) return 'ต่างประเทศ';
  if (dept.includes('ไทย')) return 'ภาษาไทย';
  if (dept.includes('ศิลปะ')) return 'ศิลปะ';
  if (dept.includes('สุข')) return 'สุขศึกษาฯ';
  return dept
    .replace(/^กลุ่มสาระการเรียนรู้/, '')
    .replace(/^กลุ่มสาระฯ\s*/, '')
    .trim();
};

export const ViewStaffDirectory: React.FC = () => {
  const { preferences, updatePreferences } = useUserSettings();
  const viewMode = preferences.preferred_view;
  const setViewMode = (mode: 'table' | 'grid') => updatePreferences({ preferred_view: mode });
  const isCompact = preferences.compact_mode;
  const cellPy = isCompact ? 'py-2' : 'py-3.5';

  const [teachersList, setTeachersList] = useState<TeacherRecord[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherRecord | null>(null);
  const [expandedTeacherId, setExpandedTeacherId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    fetch('/api/admin/staff', { cache: 'no-store' })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data) && isMounted) {
          setTeachersList(json.data);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedTeacherId((prev) => (prev === id ? null : id));
  };

  // Unique departments for filter pills
  const departments = useMemo(() => {
    const set = new Set<string>();
    teachersList.forEach((t) => {
      if (t.department) set.add(t.department);
    });
    return Array.from(set);
  }, [teachersList]);

  const filteredTeachers = useMemo(() => {
    if (selectedDept === 'ALL') return teachersList;
    return teachersList.filter((t) => t.department === selectedDept);
  }, [teachersList, selectedDept]);

  const groupedTeachers = useMemo(() => {
    return groupAndSortTeachers(filteredTeachers);
  }, [filteredTeachers]);

  return (
    <div className="space-y-6">
      {/* View Header & Controls */}
      <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800 space-y-4 shadow-sm transition-colors duration-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Users className="w-5 h-5 text-sky-500 dark:text-sky-400 shrink-0" />
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
              ทะเบียนประวัติบุคลากร
            </h2>
          </div>

          {/* View Switcher */}
          <div className="flex items-center shrink-0">
            <div className="inline-flex p-1 bg-slate-100 dark:bg-[#101822] border border-slate-200/90 dark:border-slate-800/80 rounded-lg">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors duration-200 ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/30'
                }`}
                title="มุมมองตาราง"
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
                title="มุมมองการ์ด"
              >
                <LayoutGrid className="w-4 h-4 shrink-0" />
                <span>การ์ด</span>
              </button>
            </div>
          </div>
        </div>

        {/* Quick Filter Segmented Pills for Department - Uniform Grid */}
        <div className="pt-2 border-t border-slate-200/90 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold shrink-0">
              กลุ่มสาระ / ฝ่าย:
            </span>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 truncate max-w-xs">
              {selectedDept === 'ALL' ? 'แสดงบุคลากรทั้งหมด' : selectedDept}
            </span>
          </div>

          <div className="p-1 bg-slate-100 dark:bg-[#0b1016] border border-slate-200/80 dark:border-slate-800/80 rounded-xl">
            <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-1.5 w-full">
              {/* ปุ่มทั้งหมด */}
              <button
                type="button"
                onClick={() => setSelectedDept('ALL')}
                className={`w-full inline-flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-medium transition-all duration-200 whitespace-nowrap ${
                  selectedDept === 'ALL'
                    ? 'bg-white text-slate-900 dark:bg-slate-800 dark:text-white shadow-sm font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/30'
                }`}
                title="บุคลากรทั้งหมด"
              >
                <span>ทั้งหมด</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                  selectedDept === 'ALL'
                    ? 'bg-sky-500/15 text-sky-700 dark:text-sky-300'
                    : 'bg-slate-200/80 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                }`}>
                  {teachersList.length}
                </span>
              </button>

              {/* ปุ่มแต่ละกลุ่มสาระ */}
              {departments.map((dept) => {
                const count = teachersList.filter((t) => t.department === dept).length;
                const isSelected = selectedDept === dept;
                const shortName = getShortDeptName(dept);
                return (
                  <button
                    key={dept}
                    type="button"
                    onClick={() => setSelectedDept(dept)}
                    className={`w-full inline-flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-medium transition-all duration-200 whitespace-nowrap ${
                      isSelected
                        ? 'bg-white text-slate-900 dark:bg-slate-800 dark:text-white shadow-sm font-semibold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/30'
                    }`}
                    title={dept}
                  >
                    <span>{shortName}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                      isSelected
                        ? 'bg-sky-500/15 text-sky-700 dark:text-sky-300'
                        : 'bg-slate-200/80 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Main View Mode: Table (Default & Recommended) */}
      {viewMode === 'table' ? (
        <div className="bg-white dark:bg-[#111823] rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm dark:shadow-xl overflow-hidden transition-colors duration-200">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-sm text-slate-700 dark:text-slate-200">
              <thead className="bg-slate-100/80 dark:bg-[#16202d] text-xs uppercase text-slate-500 dark:text-slate-400 tracking-wider font-semibold border-b border-slate-200/90 dark:border-slate-800">
                <tr>
                  <th scope="col" className="w-14 px-3 py-3.5 text-center">ลำดับ</th>
                  <th scope="col" className="w-[28%] px-4 py-3.5">ชื่อ-สกุล</th>
                  <th scope="col" className="w-[26%] px-4 py-3.5">ตำแหน่ง / วิทยฐานะ</th>
                  <th scope="col" className="w-[22%] px-4 py-3.5">กลุ่มสาระ / ฝ่าย</th>
                  <th scope="col" className="w-[16%] px-4 py-3.5 text-center whitespace-nowrap">อายุราชการ</th>
                  <th scope="col" className="w-12 px-3 py-3.5 text-right">
                    <span className="sr-only">ขยายรายละเอียด</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 font-sans">
                {filteredTeachers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                      ยังไม่มีข้อมูลบุคลากรในระบบ
                    </td>
                  </tr>
                ) : (
                  (() => {
                    let runningSeq = 0;
                    return groupedTeachers.map((group) => {
                    const isSupport = group.category === 'support';
                    return (
                      <React.Fragment key={group.category}>
                        {/* Group Header */}
                        <tr className="bg-slate-50/75 dark:bg-[#15202e] border-y border-slate-200/80 dark:border-slate-800">
                          <td colSpan={6} className="px-4 py-2 font-semibold text-xs text-slate-700 dark:text-slate-300">
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-2 h-2 rounded-full shrink-0 ${
                                  isSupport ? 'bg-amber-400' : 'bg-sky-400'
                                }`}
                              />
                              <span>{group.title}</span>
                            </div>
                          </td>
                        </tr>

                        {group.members.map((teacher) => {
                          runningSeq++;
                          const seq = runningSeq;
                          const tenure = calculateTenure(teacher.startDate);
                          const isDirector = teacher.position.includes('ผู้อำนวยการ');
                          const displayPosition = teacher.position.replace('ผู้อำนวยการสถานศึกษา', 'ผอ.สถานศึกษา');
                          const displayDept = teacher.department.replace('สายงานบริหารและสนับสนุนการศึกษา', 'บริหารและสนับสนุนฯ');
                          const isExpanded = expandedTeacherId === teacher.id;
                          const standingSubtext = formatAcademicStandingSubtext(
                            teacher.position,
                            teacher.academicStanding
                          );

                          return (
                            <React.Fragment key={teacher.id}>
                              <tr
                                onClick={() => toggleExpand(teacher.id)}
                                className={`hover:bg-slate-50 dark:hover:bg-[#182536]/60 transition-colors cursor-pointer ${
                                  isSupport ? 'border-l-4 border-l-amber-500/60' : ''
                                } ${isDirector ? 'bg-sky-50/50 dark:bg-sky-950/20' : ''} ${
                                  isExpanded ? 'bg-slate-50/90 dark:bg-[#15202e]' : ''
                                }`}
                              >
                                {/* Sequence */}
                                <td className={`w-14 px-3 ${cellPy} text-center font-mono tabular-nums text-slate-400 dark:text-slate-500 text-xs whitespace-nowrap`}>
                                  {seq}
                                </td>

                                {/* Staff Name */}
                                <td className={`px-4 ${cellPy}`}>
                                  <div className="font-bold text-slate-900 dark:text-white text-sm" title={formatStaffName(teacher)}>
                                    {formatStaffName(teacher)}
                                  </div>
                                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5" title={`รหัส: ${teacher.employeeCode}`}>
                                    รหัส: {teacher.employeeCode}
                                  </div>
                                </td>

                                {/* Position & Standing */}
                                <td className={`px-4 ${cellPy}`}>
                                  <div className="font-medium text-slate-800 dark:text-slate-200 text-xs sm:text-sm" title={teacher.position}>
                                    {displayPosition}
                                  </div>
                                  {standingSubtext && (
                                    <div className="text-xs text-slate-400 mt-0.5" title={standingSubtext}>
                                      {standingSubtext}
                                    </div>
                                  )}
                                </td>

                                {/* Department */}
                                <td className={`px-4 ${cellPy}`}>
                                  <div className="text-xs text-slate-600 dark:text-slate-300" title={teacher.department}>
                                    {displayDept}
                                  </div>
                                </td>

                                {/* Tenure */}
                                <td className={`px-4 ${cellPy} text-center whitespace-nowrap`}>
                                  <span className="font-mono font-medium text-slate-800 dark:text-slate-200 text-xs sm:text-sm">
                                    {tenure.years} ปี {tenure.months} เดือน
                                  </span>
                                  <span className="block text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                                    บรรจุ {formatThaiDateDisplay(teacher.startDate)}
                                  </span>
                                </td>

                                {/* Expand Arrow */}
                                <td className={`w-12 px-3 ${cellPy} text-right`}>
                                  <ChevronDown
                                    className={`w-4 h-4 ml-auto text-slate-400 transition-transform duration-200 ${
                                      isExpanded ? 'rotate-180 text-sky-500 dark:text-sky-400' : ''
                                    }`}
                                  />
                                </td>
                              </tr>

                              {/* Expanded Master-Detail Panel */}
                              {isExpanded && (
                                <tr className="bg-slate-50/90 dark:bg-[#0b1016]/90 border-y border-slate-200/90 dark:border-slate-800/80">
                                  <td colSpan={6} className="pl-14 pr-6 py-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                                      {/* 1. PDPA Citizen ID Shield */}
                                      <div>
                                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-1.5 font-medium">
                                          เลขประจำตัวประชาชน (PDPA Shield)
                                        </div>
                                        <CitizenIdShield
                                          targetStaffId={teacher.id}
                                          initialMaskedId={teacher.maskedCitizenId}
                                        />
                                      </div>

                                      {/* 2. Employment & Appointment */}
                                      <div>
                                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-1 font-medium">ข้อมูลตำแหน่งและสายงาน</div>
                                        <div className="text-slate-800 dark:text-slate-200 font-medium">{teacher.position}</div>
                                        <div className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                                          รหัสบุคลากร: <span className="font-mono text-sky-600 dark:text-sky-400">{teacher.employeeCode}</span>
                                        </div>
                                        <div className="text-slate-500 dark:text-slate-400 text-[11px]">
                                          วันบรรจุ: <span className="font-mono text-slate-700 dark:text-slate-300">{formatThaiDateDisplay(teacher.startDate)}</span>
                                        </div>
                                      </div>

                                      {/* 3. Contact Info */}
                                      <div>
                                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-1 font-medium">ช่องทางการติดต่อ</div>
                                        <div className="flex items-center gap-1.5 font-mono text-slate-700 dark:text-slate-300">
                                          <Phone className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400 shrink-0" />
                                          <span>{teacher.phone && teacher.phone !== '-' ? teacher.phone : 'ไม่ได้ระบุ'}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 font-mono text-slate-500 dark:text-slate-400 text-[11px] mt-1">
                                          <Mail className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                                          <span className="truncate max-w-[160px]">{teacher.email && teacher.email !== '-' ? teacher.email : 'ไม่ได้ระบุ'}</span>
                                        </div>
                                      </div>

                                      {/* 4. Action: Portfolio & Qualifications */}
                                      <div className="flex flex-col justify-between">
                                        <div>
                                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-1 font-medium">แฟ้มประวัติ ก.พ.7</div>
                                          <div className="text-slate-700 dark:text-slate-300 text-[11px]">
                                            วุฒิลูกเสือ: <span className="text-amber-600 dark:text-amber-300">{teacher.highestScout || '-'}</span>
                                          </div>
                                        </div>
                                        <div className="pt-2">
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSelectedTeacher(teacher);
                                            }}
                                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 border border-slate-200/90 dark:bg-[#121822] dark:hover:bg-slate-800/70 dark:text-slate-300 dark:hover:text-white dark:border-slate-800/80 text-xs font-medium transition-colors duration-200"
                                          >
                                            <BookOpen className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400 shrink-0" />
                                            <span>เปิดดูแฟ้ม ก.พ.7</span>
                                            <ChevronRight className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </React.Fragment>
                    );
                  });
                })()
              )}
              </tbody>
            </table>
          </div>
        </div>
      ) : filteredTeachers.length === 0 ? (
        <div className="bg-white dark:bg-[#111823] p-12 rounded-2xl border border-slate-200/90 dark:border-slate-800 text-center text-slate-500">
          ยังไม่มีข้อมูลบุคลากรในระบบ
        </div>
      ) : (
        /* Alternative Responsive Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTeachers.map((teacher) => {
            const tenure = calculateTenure(teacher.startDate);
            return (
              <div
                key={teacher.id}
                className="bg-white dark:bg-[#121822] p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800/80 hover:border-sky-500/40 shadow-sm dark:shadow-none transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-gradient-to-br dark:from-slate-700 dark:to-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-sky-600 dark:text-sky-400 font-bold text-base shrink-0 shadow-sm">
                      {teacher.firstName ? teacher.firstName[0] : 'ค'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-base font-bold text-slate-900 dark:text-white truncate" title={formatStaffName(teacher)}>
                        {formatStaffName(teacher)}
                      </div>
                      <div className="text-sm text-sky-600 dark:text-sky-300 truncate font-medium" title={teacher.position}>
                        {teacher.position.replace('ผู้อำนวยการสถานศึกษา', 'ผอ.สถานศึกษา')}
                      </div>
                      <span className="inline-block mt-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-slate-100 dark:bg-[#101822] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 truncate max-w-full" title={teacher.department}>
                        {teacher.department.replace('สายงานบริหารและสนับสนุนการศึกษา', 'บริหารและสนับสนุนฯ')}
                      </span>
                    </div>
                  </div>

                  {/* Citizen ID Shield */}
                  <div className="mb-3 pt-2 border-t border-slate-200/90 dark:border-slate-800/80">
                    <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">
                      เลขประจำตัวประชาชน (PDPA Shield):
                    </span>
                    <CitizenIdShield
                      targetStaffId={teacher.id}
                      initialMaskedId={teacher.maskedCitizenId}
                    />
                  </div>

                  {/* Meta details */}
                  <div className="space-y-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>
                        อายุราชการ: <strong className="text-slate-900 dark:text-slate-100">{tenure.years} ปี {tenure.months} เดือน</strong>
                      </span>
                    </div>
                    {teacher.phone && teacher.phone !== '-' && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-sky-500 dark:text-sky-400 shrink-0" />
                        <span className="font-mono text-slate-700 dark:text-slate-300">{teacher.phone}</span>
                      </div>
                    )}
                    {teacher.email && teacher.email !== '-' && (
                      <div className="flex items-center gap-2 truncate">
                        <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="font-mono text-slate-500 dark:text-slate-400 truncate">{teacher.email}</span>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedTeacher(teacher)}
                  className="mt-4 w-full inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 border border-slate-200/90 dark:bg-[#121822] dark:hover:bg-slate-800/70 dark:text-slate-300 dark:hover:text-white dark:border-slate-800/80 text-xs sm:text-sm font-medium transition-colors duration-200"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-xl bg-white dark:bg-[#171a21] border border-slate-200 dark:border-[#2a475e] rounded-2xl shadow-2xl p-6 text-slate-900 dark:text-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-slate-700 mb-4">
              <div className="flex items-center gap-2.5">
                <GraduationCap className="w-5 h-5 text-sky-500 dark:text-sky-400 shrink-0" />
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  แฟ้มประวัติ: {formatStaffName(selectedTeacher)}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTeacher(null)}
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/50 transition-colors duration-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs sm:text-sm">
              <div className="bg-slate-50 dark:bg-[#101822] p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">รหัสบุคลากร:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{selectedTeacher.employeeCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">ตำแหน่ง:</span>
                  <span className="text-sky-600 dark:text-sky-300 font-semibold">{selectedTeacher.position}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">วิทยฐานะ:</span>
                  <span className="text-slate-700 dark:text-slate-200">{selectedTeacher.academicStanding || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">สังกัดกลุ่มสาระ:</span>
                  <span className="text-slate-700 dark:text-slate-200">{selectedTeacher.department}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">วันที่เริ่มรับราชการ:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-200">{formatThaiDateDisplay(selectedTeacher.startDate)}</span>
                </div>
              </div>

              {/* Education history */}
              {selectedTeacher.educations && selectedTeacher.educations.length > 0 && (
                <div className="bg-slate-50 dark:bg-[#101822] p-4 rounded-xl border border-slate-200/90 dark:border-slate-800">
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-sky-500 dark:text-sky-400 shrink-0" />
                    <span>ประวัติการศึกษา</span>
                  </h4>
                  <div className="space-y-2">
                    {selectedTeacher.educations.map((edu, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 text-xs shadow-sm dark:shadow-none">
                        <div className="font-semibold text-slate-900 dark:text-white">{edu.degree} {edu.major}</div>
                        <div className="text-slate-500 dark:text-slate-400">{edu.institute} ({edu.gradYear})</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Scout Qualification */}
              {selectedTeacher.highestScout && selectedTeacher.highestScout !== '-' && (
                <div className="bg-slate-50 dark:bg-[#101822] p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
                    <span>วุฒิทางลูกเสือ:</span>
                  </span>
                  <span className="font-bold text-amber-600 dark:text-amber-300">{selectedTeacher.highestScout}</span>
                </div>
              )}
            </div>

            <div className="mt-6 pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedTeacher(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-[#121822] dark:hover:bg-slate-800/70 dark:text-slate-300 dark:hover:text-white border border-slate-200 dark:border-slate-800/80 text-xs sm:text-sm font-medium transition-colors duration-200"
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
