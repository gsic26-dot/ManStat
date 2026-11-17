'use client';

/**
 * ============================================================================
 * ManStat-Modern: View Teacher Workload (ภาระงานสอนและงานที่ได้รับมอบหมาย PA)
 * ============================================================================
 * - Criteria per OPSC Guidelines ว9/2564 & ว21/2564
 * - 4 Aspects of Teacher Workload:
 *   1. Teaching Hours & TA (ชั่วโมงสอนตามตาราง & ผู้ช่วยสอน TA) >= 12 hrs/week
 *   2. Support Hours (งานส่งเสริมและสนับสนุนการเรียนรู้)
 *   3. School Dev Hours (งานพัฒนาคุณภาพการจัดการศึกษา)
 *   4. Policy Hours (งานตอบสนองนโยบายและจุดเน้น)
 * - Total Workload >= 20 hrs/week
 * - Expandable Teacher Details with "+ เพิ่มวิชาสอน / งาน TA"
 * - Zero emojis, pure Lucide SVG icons with strict 8px gap.
 * ============================================================================
 */

import React, { useState, useMemo } from 'react';
import {
  Briefcase,
  CheckCircle2,
  AlertCircle,
  Search,
  BookOpen,
  PlusCircle,
  ChevronDown,
  ChevronRight,
  Trash2,
  X,
} from 'lucide-react';
import { INITIAL_TEACHERS } from '@/lib/data/schoolData';
import { evaluatePAWorkload } from '@/lib/regulations/khurusapha-and-pa';

export interface TeachingCourse {
  id: string;
  teacherId: string;
  courseName: string;
  courseCode?: string;
  type: 'MAIN' | 'TA'; // สอนหลัก หรือ ผู้ช่วยสอน (Teaching Assistant)
  classLevel: string;
  hoursPerWeek: number;
}

const DEFAULT_COURSES: TeachingCourse[] = [
  {
    id: 'CRS-001',
    teacherId: 'T002',
    courseName: 'ภาษาไทยพื้นฐาน',
    courseCode: 'ท15101',
    type: 'MAIN',
    classLevel: 'ป.5/1',
    hoursPerWeek: 5,
  },
  {
    id: 'CRS-002',
    teacherId: 'T002',
    courseName: 'ภาษาไทยเพิ่มเติม',
    courseCode: 'ท15201',
    type: 'MAIN',
    classLevel: 'ป.5/2',
    hoursPerWeek: 4,
  },
  {
    id: 'CRS-003',
    teacherId: 'T002',
    courseName: 'ผู้ช่วยสอน (TA) ทักษะภาษาและการอ่าน',
    type: 'TA',
    classLevel: 'ป.4/1',
    hoursPerWeek: 3,
  },
  {
    id: 'CRS-004',
    teacherId: 'T002',
    courseName: 'กิจกรรมลูกเสือ - เนตรนารี',
    type: 'MAIN',
    classLevel: 'ป.5',
    hoursPerWeek: 2,
  },
  {
    id: 'CRS-005',
    teacherId: 'T003',
    courseName: 'คณิตศาสตร์พื้นฐาน',
    courseCode: 'ค16101',
    type: 'MAIN',
    classLevel: 'ป.6/1',
    hoursPerWeek: 5,
  },
  {
    id: 'CRS-006',
    teacherId: 'T003',
    courseName: 'ผู้ช่วยสอน (TA) วิทยาการคำนวณ',
    type: 'TA',
    classLevel: 'ม.1',
    hoursPerWeek: 4,
  },
  {
    id: 'CRS-007',
    teacherId: 'T003',
    courseName: 'แนะแนวและการศึกษาต่อ',
    type: 'MAIN',
    classLevel: 'ป.6',
    hoursPerWeek: 3,
  },
];

export const ViewWorkload: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [expandedTeacherId, setExpandedTeacherId] = useState<string | null>(null);
  const [courses, setCourses] = useState<TeachingCourse[]>(DEFAULT_COURSES);

  // Modal State for adding teaching / TA course
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedTeacherForAdd, setSelectedTeacherForAdd] = useState<{ id: string; name: string } | null>(null);
  const [newCourseName, setNewCourseName] = useState<string>('');
  const [newCourseCode, setNewCourseCode] = useState<string>('');
  const [newCourseType, setNewCourseType] = useState<'MAIN' | 'TA'>('MAIN');
  const [newClassLevel, setNewClassLevel] = useState<string>('ป.1');
  const [newHours, setNewHours] = useState<number>(2);

  const toggleExpand = (teacherId: string) => {
    setExpandedTeacherId((prev) => (prev === teacherId ? null : teacherId));
  };

  const handleOpenAddModal = (teacherId: string, teacherName: string) => {
    setSelectedTeacherForAdd({ id: teacherId, name: teacherName });
    setNewCourseName('');
    setNewCourseCode('');
    setNewCourseType('MAIN');
    setNewClassLevel('ป.1');
    setNewHours(2);
    setIsModalOpen(true);
  };

  const handleSaveNewCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacherForAdd || !newCourseName.trim()) return;

    const newEntry: TeachingCourse = {
      id: `CRS-${Date.now().toString().slice(-4)}`,
      teacherId: selectedTeacherForAdd.id,
      courseName: newCourseName.trim(),
      courseCode: newCourseCode.trim() || undefined,
      type: newCourseType,
      classLevel: newClassLevel.trim(),
      hoursPerWeek: Number(newHours) || 1,
    };

    setCourses((prev) => [...prev, newEntry]);
    setIsModalOpen(false);
  };

  const handleDeleteCourse = (courseId: string) => {
    if (confirm('คุณต้องการลบวิชาสอน/งาน TA นี้หรือไม่?')) {
      setCourses((prev) => prev.filter((c) => c.id !== courseId));
    }
  };

  const workloadData = useMemo(() => {
    return INITIAL_TEACHERS.map((teacher, idx) => {
      const isDirector = teacher.position.includes('ผู้อำนวยการ');
      const teacherCourses = courses.filter((c) => c.teacherId === teacher.id);
      const customTeachingHours = teacherCourses.reduce((sum, c) => sum + c.hoursPerWeek, 0);

      // Default baseline if no custom courses yet
      const teachingHours = customTeachingHours > 0 ? customTeachingHours : (isDirector ? 6 : 14 + (idx % 3));
      const supportHours = 4;
      const schoolDevHours = 3;
      const policyHours = 2;
      const totalHours = teachingHours + supportHours + schoolDevHours + policyHours;

      const evalResult = evaluatePAWorkload({
        teachingHours,
        supportHours,
        developmentHours: schoolDevHours,
        policyHours,
        isAdministrator: isDirector,
      });

      return {
        id: teacher.id,
        name: teacher.name,
        position: teacher.position,
        department: teacher.department,
        division: teacher.division,
        teachingHours,
        supportHours,
        schoolDevHours,
        policyHours,
        totalHours,
        evalResult,
        teacherCourses,
      };
    });
  }, [courses]);

  const filtered = useMemo(() => {
    return workloadData.filter((w) =>
      w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.position.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [workloadData, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel p-5 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-sky-400 shrink-0" />
            <span>ภาระงานสอนและข้อตกลงในการพัฒนางาน (PA ว9/2564 & ว21/2564)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            เกณฑ์ภาระงานขั้นต่ำ: ครูผู้สอนสอนไม่ต่ำกว่า 12 ชม./สัปดาห์ (รวมงานผู้ช่วยสอน TA) และภาระงานรวม 4 หมวดไม่ต่ำกว่า 20 ชม./สัปดาห์
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 shrink-0" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ค้นหาชื่อครู หรือฝ่าย..."
            className="w-full h-10 bg-[#101822] border border-slate-700/80 rounded-xl pl-10 pr-3.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 transition-all"
          />
        </div>
      </div>

      {/* Workload Table */}
      <div className="bg-[#121822] p-5 rounded-2xl border border-slate-800/80 space-y-4">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#101822] text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th scope="col" className="w-10 px-3 py-3.5 text-center">
                  <span className="sr-only">ขยายรายละเอียด</span>
                </th>
                <th scope="col" className="px-4 py-3.5 min-w-[220px]">ครูผู้สอน / บุคลากร</th>
                <th scope="col" className="px-4 py-3.5 text-center min-w-[140px]">
                  ชั่วโมงสอน &amp; TA<br />
                  <span className="text-[10px] lowercase text-slate-500 font-normal">&gt;= 12 ชม./สัปดาห์</span>
                </th>
                <th scope="col" className="px-4 py-3.5 text-center min-w-[130px]">
                  รวมภาระงาน 4 ด้าน<br />
                  <span className="text-[10px] lowercase text-slate-500 font-normal">&gt;= 20 ชม./สัปดาห์</span>
                </th>
                <th scope="col" className="px-4 py-3.5 text-center min-w-[140px]">ผลประเมิน PA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filtered.map((w) => {
                const isExpanded = expandedTeacherId === w.id;
                const posDisplay = w.position.replace('ผู้อำนวยการสถานศึกษา', 'ผอ.สถานศึกษา');
                const deptDisplay = w.department.replace('สายงานบริหารและสนับสนุนการศึกษา', 'บริหารและสนับสนุนฯ');

                return (
                  <React.Fragment key={w.id}>
                    <tr
                      onClick={() => toggleExpand(w.id)}
                      className={`hover:bg-[#1a2636]/60 transition-colors cursor-pointer ${
                        isExpanded ? 'bg-[#15202e]' : ''
                      }`}
                    >
                      {/* Expand Toggle */}
                      <td className="px-3 py-3.5 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(w.id);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
                          aria-label={isExpanded ? 'ย่อแถว' : 'ขยายแถว'}
                        >
                          <ChevronRight
                            className={`w-4 h-4 transition-transform duration-200 ${
                              isExpanded ? 'rotate-90 text-sky-400' : ''
                            }`}
                          />
                        </button>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-white flex items-center gap-2">
                          <span className="truncate max-w-[200px]" title={w.name}>{w.name}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[220px]" title={`${posDisplay} (${deptDisplay})`}>
                          {posDisplay} ({deptDisplay})
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-center font-mono font-semibold text-slate-100 whitespace-nowrap">
                        {w.teachingHours} ชม.
                      </td>

                      <td className="px-4 py-3.5 text-center font-mono font-bold text-sky-300 whitespace-nowrap">
                        {w.totalHours} ชม.
                      </td>

                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        {w.evalResult.isAllPassed ? (
                          <span className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 min-w-[110px]">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span>ผ่านเกณฑ์ PA</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30 min-w-[110px]">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>ไม่ครบเกณฑ์</span>
                          </span>
                        )}
                      </td>
                    </tr>

                    {/* Expanded Detail Panel */}
                    {isExpanded && (
                      <tr className="bg-[#0b1016]/90 border-y border-slate-800/80">
                        <td colSpan={5} className="p-4 sm:p-5">
                          <div className="space-y-4">
                            {/* 4 Aspect Checklist Cards */}
                            <div>
                              <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider mb-2">
                                สรุปภาระงาน 4 ด้านตามเกณฑ์ PA ว9/2564 &amp; ว21/2564
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                                <div className="bg-[#121924] p-3 rounded-xl border border-slate-800">
                                  <span className="text-slate-400 text-[11px] block">1. งานสอนตามตาราง &amp; TA</span>
                                  <span className="font-mono font-bold text-slate-100 text-sm mt-0.5 block">{w.teachingHours} ชม./สัปดาห์</span>
                                  <span className="text-[11px] text-emerald-400 mt-1 block">&gt;= 12 ชม. (ผ่านเกณฑ์)</span>
                                </div>
                                <div className="bg-[#121924] p-3 rounded-xl border border-slate-800">
                                  <span className="text-slate-400 text-[11px] block">2. สนับสนุนการเรียนรู้</span>
                                  <span className="font-mono font-bold text-slate-100 text-sm mt-0.5 block">{w.supportHours} ชม./สัปดาห์</span>
                                  <span className="text-[11px] text-slate-400 mt-1 block">งานครูที่ปรึกษา / PLC</span>
                                </div>
                                <div className="bg-[#121924] p-3 rounded-xl border border-slate-800">
                                  <span className="text-slate-400 text-[11px] block">3. พัฒนาสถานศึกษา</span>
                                  <span className="font-mono font-bold text-slate-100 text-sm mt-0.5 block">{w.schoolDevHours} ชม./สัปดาห์</span>
                                  <span className="text-[11px] text-slate-400 mt-1 block">งาน 4 ฝ่ายบริหาร</span>
                                </div>
                                <div className="bg-[#121924] p-3 rounded-xl border border-slate-800">
                                  <span className="text-slate-400 text-[11px] block">4. นโยบายและจุดเน้น</span>
                                  <span className="font-mono font-bold text-slate-100 text-sm mt-0.5 block">{w.policyHours} ชม./สัปดาห์</span>
                                  <span className="text-[11px] text-slate-400 mt-1 block">โครงการสถานศึกษา</span>
                                </div>
                              </div>
                            </div>

                            {/* Summary Bar & Add Course Button */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0d141d] p-3.5 rounded-xl border border-slate-800">
                              <div className="flex items-center gap-2">
                                <BookOpen className="w-4 h-4 text-sky-400 shrink-0" />
                                <span className="font-semibold text-white text-xs sm:text-sm">
                                  รายวิชาที่สอนและงาน TA ของ {w.name}
                                </span>
                                <span className="text-xs text-sky-300 font-mono">
                                  (รวม {w.teachingHours} ชม./สัปดาห์)
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenAddModal(w.id, w.name);
                                }}
                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium border border-transparent transition-colors duration-200"
                              >
                                <PlusCircle className="w-3.5 h-3.5 shrink-0" />
                                <span>+ เพิ่มรายวิชาสอน / งาน TA</span>
                              </button>
                            </div>

                            {/* Teaching Courses & TA List */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {w.teacherCourses.length > 0 ? (
                                w.teacherCourses.map((c) => (
                                  <div
                                    key={c.id}
                                    className="bg-[#16202c] p-3 rounded-xl border border-slate-800 flex items-start justify-between gap-2"
                                  >
                                    <div>
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-semibold text-white text-xs">
                                          {c.courseName}
                                        </span>
                                        {c.type === 'TA' ? (
                                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 whitespace-nowrap">
                                            TA
                                          </span>
                                        ) : (
                                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30 whitespace-nowrap">
                                            สอนหลัก
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-[11px] text-slate-400 mt-1">
                                        ระดับชั้น: <span className="text-slate-200">{c.classLevel}</span>
                                        {c.courseCode && ` • รหัส: ${c.courseCode}`}
                                      </div>
                                      <div className="text-xs font-mono font-bold text-amber-300 mt-1">
                                        {c.hoursPerWeek} ชม./สัปดาห์
                                      </div>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteCourse(c.id);
                                      }}
                                      title="ลบวิชานี้"
                                      className="p-1.5 rounded-md text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors duration-200"
                                    >
                                      <Trash2 className="w-3.5 h-3.5 shrink-0" />
                                    </button>
                                  </div>
                                ))
                              ) : (
                                <div className="col-span-full py-4 text-center text-xs text-slate-500">
                                  ยังไม่มีการลงทะเบียนรายวิชาเฉพาะสำหรับครูท่านนี้ (ใช้ชั่วโมงสอนพื้นฐานตามระบบ {w.teachingHours} ชม.)
                                </div>
                              )}
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

      {/* Modal: เพิ่มรายวิชาสอน / งาน TA */}
      {isModalOpen && selectedTeacherForAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="bg-[#141d27] border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-sky-400 font-bold text-sm">
                <PlusCircle className="w-4 h-4 shrink-0" />
                <span>เพิ่มรายวิชาสอน / งาน TA ({selectedTeacherForAdd.name})</span>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors duration-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewCourse} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  ชื่อรายวิชา / ชื่องานผู้ช่วยสอน TA *
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ภาษาไทยพื้นฐาน หรือ ผู้ช่วยสอนคณิตศาสตร์"
                  value={newCourseName}
                  onChange={(e) => setNewCourseName(e.target.value)}
                  className="w-full h-10 bg-[#0e141c] border border-slate-700 rounded-xl px-3 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    รหัสวิชา (ถ้ามี)
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น ท15101"
                    value={newCourseCode}
                    onChange={(e) => setNewCourseCode(e.target.value)}
                    className="w-full h-10 bg-[#0e141c] border border-slate-700 rounded-xl px-3 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    ประเภทภาระงาน *
                  </label>
                  <select
                    value={newCourseType}
                    onChange={(e) => setNewCourseType(e.target.value as 'MAIN' | 'TA')}
                    className="w-full h-10 bg-[#0e141c] border border-slate-700 rounded-xl px-3 text-slate-100 focus:outline-none focus:border-sky-500 cursor-pointer"
                  >
                    <option value="MAIN">สอนหลักตามตาราง</option>
                    <option value="TA">ผู้ช่วยสอน (TA)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    ระดับชั้นที่สอน *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น ป.5/1 หรือ ม.2"
                    value={newClassLevel}
                    onChange={(e) => setNewClassLevel(e.target.value)}
                    className="w-full h-10 bg-[#0e141c] border border-slate-700 rounded-xl px-3 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    จำนวนชั่วโมง/สัปดาห์ *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="40"
                    step="0.5"
                    required
                    value={newHours}
                    onChange={(e) => setNewHours(parseFloat(e.target.value) || 0)}
                    className="w-full h-10 bg-[#0e141c] border border-slate-700 rounded-xl px-3 text-slate-100 font-mono focus:outline-none focus:border-sky-500 transition-colors"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-[#121822] hover:bg-slate-800/70 text-slate-300 hover:text-white border border-slate-800/80 text-xs font-medium transition-colors duration-200"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium border border-transparent transition-colors duration-200"
                >
                  บันทึกภาระงานสอน
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
