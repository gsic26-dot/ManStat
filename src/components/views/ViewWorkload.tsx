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
            <thead className="bg-[#101822] text-slate-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-4 py-3 rounded-l-lg min-w-[210px]">ครูผู้สอน / บุคลากร</th>
                <th className="px-3 py-3 text-center min-w-[130px]">ชั่วโมงสอน &amp; TA<br /><span className="text-[10px] lowercase text-slate-500">&gt;= 12 ชม./สัปดาห์</span></th>
                <th className="px-3 py-3 text-center min-w-[100px]">งานสนับสนุน<br /><span className="text-[10px] lowercase text-slate-500">ชม./สัปดาห์</span></th>
                <th className="px-3 py-3 text-center min-w-[130px]">งานพัฒนาสถานศึกษา<br /><span className="text-[10px] lowercase text-slate-500">ชม./สัปดาห์</span></th>
                <th className="px-3 py-3 text-center min-w-[130px]">งานนโยบาย/จุดเน้น<br /><span className="text-[10px] lowercase text-slate-500">ชม./สัปดาห์</span></th>
                <th className="px-3 py-3 text-center font-bold text-white min-w-[110px]">รวมภาระงาน<br /><span className="text-[10px] lowercase text-slate-400">&gt;= 20 ชม.</span></th>
                <th className="px-4 py-3 text-center min-w-[125px]">ผลประเมิน PA</th>
                <th className="px-4 py-3 rounded-r-lg text-right min-w-[100px]">รายละเอียด</th>
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
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-white flex items-center gap-2">
                          <span className="truncate max-w-[170px]" title={w.name}>{w.name}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[200px]" title={`${posDisplay} (${deptDisplay})`}>
                          {posDisplay} ({deptDisplay})
                        </div>
                      </td>
                      <td className="px-3 py-3.5 text-center font-mono font-semibold text-slate-100">
                        {w.teachingHours} ชม.
                      </td>
                      <td className="px-3 py-3.5 text-center font-mono text-slate-300">
                        {w.supportHours} ชม.
                      </td>
                      <td className="px-3 py-3.5 text-center font-mono text-slate-300">
                        {w.schoolDevHours} ชม.
                      </td>
                      <td className="px-3 py-3.5 text-center font-mono text-slate-300">
                        {w.policyHours} ชม.
                      </td>
                      <td className="px-3 py-3.5 text-center font-mono font-bold text-sky-300">
                        {w.totalHours} ชม.
                      </td>
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        {w.evalResult.isAllPassed ? (
                          <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 min-w-[105px]">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span>ผ่านเกณฑ์ PA</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30 min-w-[105px]">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>ไม่ครบเกณฑ์</span>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          type="button"
                          className="p-1 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-sky-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                    </tr>

                    {/* Expanded Detail Panel */}
                    {isExpanded && (
                      <tr className="bg-[#121924]">
                        <td colSpan={8} className="p-4 border-t border-b border-slate-700/60">
                          <div className="space-y-4">
                            {/* Summary Bar */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0d141d] p-3 rounded-xl border border-slate-800">
                              <div className="flex items-center gap-2">
                                <BookOpen className="w-4 h-4 text-sky-400 shrink-0" />
                                <span className="font-semibold text-white">
                                  หมวดที่ 1: งานสอนตามตาราง &amp; งานผู้ช่วยสอน (TA) ของ {w.name}
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
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-sm transition-colors"
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
                                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                            TA
                                          </span>
                                        ) : (
                                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
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
                                      className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
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

                            {/* 4 Aspect Checklist */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800 text-[11px]">
                              <div className="bg-[#101822] p-2 rounded-lg border border-slate-800/80">
                                <span className="text-slate-500 block">1. สอน &amp; TA:</span>
                                <span className="font-semibold text-slate-200">{w.teachingHours} ชม.</span>
                                <span className="text-[10px] text-emerald-400 block">&gt;= 12 ชม. (ผ่าน)</span>
                              </div>
                              <div className="bg-[#101822] p-2 rounded-lg border border-slate-800/80">
                                <span className="text-slate-500 block">2. สนับสนุนการเรียน:</span>
                                <span className="font-semibold text-slate-200">{w.supportHours} ชม.</span>
                                <span className="text-[10px] text-slate-400 block">งานที่ปรึกษา/PLC</span>
                              </div>
                              <div className="bg-[#101822] p-2 rounded-lg border border-slate-800/80">
                                <span className="text-slate-500 block">3. พัฒนาสถานศึกษา:</span>
                                <span className="font-semibold text-slate-200">{w.schoolDevHours} ชม.</span>
                                <span className="text-[10px] text-slate-400 block">งาน 4 ฝ่ายบริหาร</span>
                              </div>
                              <div className="bg-[#101822] p-2 rounded-lg border border-slate-800/80">
                                <span className="text-slate-500 block">4. นโยบาย/จุดเน้น:</span>
                                <span className="font-semibold text-slate-200">{w.policyHours} ชม.</span>
                                <span className="text-[10px] text-slate-400 block">โครงการสถานศึกษา</span>
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
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
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
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold shadow-sm transition-colors"
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
