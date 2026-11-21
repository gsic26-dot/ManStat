'use client';

/**
 * ============================================================================
 * ManStat: ViewRetroLeave (บันทึกการลาย้อนหลังตามระเบียบราชการ)
 * ============================================================================
 * - Form for HR Admins to record retroactive leave for school personnel
 * - Synchronized 100% with Master 13 Leave Types Config
 * - Dynamic form mode switching:
 *     * School Exit (ธุระส่วนตัว <= 3 ชม.): Time range, destination, teaching duties,
 *       enforced <= 3 hours validation, totalDays = 0.
 *     * Official Mission: Time/multi-day, destination, official order, totalDays = 0.
 *     * Statutory Leave (11 Types): Multi-day, half-day, reason, medical cert.
 * - Saves directly to server database (/api/admin/leave)
 * - Strict Zero-Emoji policy, pure Lucide SVG icons, 8px standard gap
 * ============================================================================
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  RotateCcw,
  Calendar,
  User,
  AlertTriangle,
  Save,
  Clock,
  ShieldAlert,
  MapPin,
  FileText,
  Briefcase,
  AlertCircle,
  Plus,
  Trash2,
  Info,
} from 'lucide-react';
import { INITIAL_TEACHERS, type TeacherRecord } from '@/lib/data/schoolData';
import {
  MASTER_LEAVE_TYPES,
  isZeroDayLeaveType,
  isSchoolExitPermit,
  isOfficialMission,
  getLeaveTypeDefinition,
} from '@/lib/regulations/leaveTypes';
import type { LeaveType } from '@/types/database.types';
import { ThaiDatePicker } from '@/components/ui/ThaiDatePicker';

interface TeachingWorkloadRow {
  cls: string;
  period: string;
  task: string;
  sub: string;
}

export function ViewRetroLeave() {
  const [teachersList, setTeachersList] = useState<TeacherRecord[]>(INITIAL_TEACHERS);
  const [selectedTeacherId, setSelectedTeacherId] = useState(INITIAL_TEACHERS[0].id);
  const [leaveType, setLeaveType] = useState<LeaveType>('ลาป่วย');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [totalDays, setTotalDays] = useState('1');
  const [reason, setReason] = useState('');
  const [retroReason, setRetroReason] = useState('');
  const [medicalCertNo, setMedicalCertNo] = useState('');
  const [substituteTeacher, setSubstituteTeacher] = useState(INITIAL_TEACHERS[1].name);

  useEffect(() => {
    let isMounted = true;
    fetch('/api/admin/staff', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.success && Array.isArray(data.data) && data.data.length > 0) {
          setTeachersList(data.data);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  // School Exit & Official Mission specific states
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('11:00');
  const [destination, setDestination] = useState('');
  const [missionMode, setMissionMode] = useState<'single_day_time' | 'multi_day_date'>('multi_day_date');
  const [officialOrderNo, setOfficialOrderNo] = useState('');
  const [hasWorkload, setHasWorkload] = useState<'ไม่มี' | 'มี'>('ไม่มี');
  const [workloads, setWorkloads] = useState<TeachingWorkloadRow[]>([
    { cls: '', period: '', task: '', sub: '' },
  ]);

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const selectedTeacher = teachersList.find((t) => t.id === selectedTeacherId) || teachersList[0];

  // Type categorizations
  const isExit = isSchoolExitPermit(leaveType);
  const isMission = isOfficialMission(leaveType);
  const isZeroDays = isZeroDayLeaveType(leaveType);

  // Calculate duration in hours
  const calculatedHours = useMemo(() => {
    if (!startTime || !endTime) return 0;
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return 0;
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;
    if (endMin <= startMin) return 0;
    return parseFloat(((endMin - startMin) / 60).toFixed(2));
  }, [startTime, endTime]);

  // Enforce <= 3 hours rule for School Exit (ธุระส่วนตัว)
  const isExitHoursExceeded = isExit && calculatedHours > 3;

  const handleAddWorkloadRow = () => {
    setWorkloads((prev) => [...prev, { cls: '', period: '', task: '', sub: '' }]);
  };

  const handleRemoveWorkloadRow = (index: number) => {
    setWorkloads((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  };

  const handleUpdateWorkloadRow = (index: number, field: keyof TeachingWorkloadRow, value: string) => {
    setWorkloads((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Validation per mode
    if (isExit) {
      if (calculatedHours <= 0) {
        setValidationError('กรุณาระบุเวลาออกและเวลากลับที่ถูกต้อง');
        return;
      }
      if (calculatedHours > 3) {
        setValidationError('ไม่อนุญาต: การขออนุญาตออกนอกบริเวณโรงเรียนต้องไม่เกิน 3 ชั่วโมง (หากเกินกรุณาเลือก "ลากิจส่วนตัว")');
        return;
      }
      if (!destination.trim()) {
        setValidationError('กรุณาระบุสถานที่ไป');
        return;
      }
      if (!reason.trim()) {
        setValidationError('กรุณาระบุเหตุผล / ธุระจำเป็น');
        return;
      }
    } else if (isMission) {
      if (!destination.trim()) {
        setValidationError('กรุณาระบุสถานที่ไปราชการ');
        return;
      }
      if (!reason.trim()) {
        setValidationError('กรุณาระบุเรื่อง / ภารกิจที่ไปราชการ');
        return;
      }
      if (missionMode === 'single_day_time' && calculatedHours <= 0) {
        setValidationError('กรุณาระบุเวลาออกและเวลากลับที่ถูกต้อง');
        return;
      }
    } else {
      if (!startDate || !reason) {
        setValidationError('กรุณากรอกวันที่และเหตุผลการลา');
        return;
      }
      if (!retroReason.trim()) {
        setValidationError('กรุณากรอกเหตุผลความจำเป็นในการยื่นใบลาย้อนหลัง');
        return;
      }
    }

    setIsSubmitted(true);

    try {
      const leaveDaysCount = isZeroDays ? 0 : parseFloat(totalDays) || 1;
      const effectiveStartDate = isExit ? startDate : missionMode === 'single_day_time' ? startDate : startDate;
      const effectiveEndDate = isExit ? startDate : missionMode === 'single_day_time' ? startDate : endDate || startDate;

      await fetch('/api/admin/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: selectedTeacherId,
          teacherName: selectedTeacher?.name || 'ไม่ระบุชื่อ',
          position: selectedTeacher?.position || 'ครู',
          department: selectedTeacher?.department || 'ทั่วไป',
          leaveType: isExit ? 'school_exit' : isMission ? 'official_mission' : leaveType,
          leaveTypeName: `${leaveType} (บันทึกย้อนหลัง)`,
          startDate: effectiveStartDate,
          endDate: effectiveEndDate,
          totalDays: leaveDaysCount,
          startTime: (isExit || (isMission && missionMode === 'single_day_time')) ? startTime : null,
          endTime: (isExit || (isMission && missionMode === 'single_day_time')) ? endTime : null,
          totalHours: (isExit || (isMission && missionMode === 'single_day_time')) ? calculatedHours : null,
          destination: (isExit || isMission) ? destination.trim() : null,
          officialOrderNo: isMission ? officialOrderNo.trim() : medicalCertNo.trim() || null,
          hasWorkload: (isExit || isMission) ? hasWorkload : null,
          workloads: (isExit || isMission) && hasWorkload === 'มี' ? workloads : [],
          reason: isZeroDays ? reason.trim() : `[ลาย้อนหลัง: ${retroReason}] ${reason.trim()}`,
          substituteTeacherName: substituteTeacher,
          status: 'pending',
          currentStep: 1,
          submittedAt: new Date().toISOString(),
        }),
      });
    } catch (err) {
      console.warn('[ViewRetroLeave] Save error:', err);
    }

    setTimeout(() => {
      setIsSubmitted(false);
      setReason('');
      setRetroReason('');
      setMedicalCertNo('');
      setDestination('');
      setOfficialOrderNo('');
      alert('บันทึกข้อมูลย้อนหลังเข้าสู่ระบบเรียบร้อยแล้ว');
    }, 1000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-[#141b24] p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 transition-colors duration-200">
        <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 text-xs font-semibold uppercase tracking-wider">
          <RotateCcw className="w-4 h-4 shrink-0" />
          <span>Retroactive Leave & Permission Logging</span>
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
          บันทึกการลาย้อนหลังและขออนุญาตราชการ
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          ระบบบันทึกคำร้องย้อนหลังสำหรับเจ้าหน้าที่ธุรการ/งานบุคคล ครอบคลุม 13 ประเภทการลาตามระเบียบ สพฐ. และการขออนุญาตออกนอกสถานที่
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Column */}
        <div className="lg:col-span-2">
          <form
            onSubmit={handleSubmit}
            className="bg-white dark:bg-[#111822] p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800 space-y-5 transition-colors duration-200"
          >
            {/* Regulatory Notice */}
            <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 p-4 rounded-xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                <p className="font-bold">ข้อกำหนดตามระเบียบว่าด้วยการลาของข้าราชการ พ.ศ. 2555</p>
                <p className="mt-0.5 text-amber-700 dark:text-amber-300/80">
                  การยื่นใบลาย้อนหลังกระทำได้เฉพาะกรณีป่วยฉุกเฉิน หรือมีเหตุจำเป็นยิ่งยวด โดยต้องระบุเหตุผลความจำเป็นในการยื่นล่าช้า และแนบหลักฐานทางการแพทย์หากลาป่วยติดต่อกัน
                </p>
              </div>
            </div>

            {/* Teacher Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                เลือกข้าราชการครู / บุคลากรผู้ขอลา <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 shrink-0" />
                <select
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  className="w-full h-10 bg-slate-50 dark:bg-[#16202c] border border-slate-200/90 dark:border-slate-700/80 rounded-xl pl-10 pr-3.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 transition-all cursor-pointer"
                >
                  {teachersList.map((t) => (
                    <option
                      key={t.id}
                      value={t.id}
                      className="bg-white dark:bg-[#171a21] text-slate-900 dark:text-slate-100"
                    >
                      {t.name} — {t.position} ({t.department})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Master 13 Leave Types Dropdown */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                ประเภทการลา / การขออนุญาต (Master Config 13 ประเภท) <span className="text-rose-500">*</span>
              </label>
              <select
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value as LeaveType)}
                className="w-full h-11 bg-slate-50 dark:bg-[#16202c] border border-slate-200/90 dark:border-slate-700/80 rounded-xl px-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 transition-all cursor-pointer font-medium"
              >
                <optgroup label="กลุ่มที่ 1: การลาตามระเบียบ 2555 (11 ประเภท)">
                  {MASTER_LEAVE_TYPES.filter((t) => t.category === 'statutory').map((lt) => (
                    <option
                      key={lt.id}
                      value={lt.value}
                      className="bg-white dark:bg-[#171a21] text-slate-900 dark:text-slate-100 py-1"
                    >
                      {lt.label} — {lt.description}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="กลุ่มที่ 2: การขออนุญาตออกนอกสถานศึกษาและไปราชการ (วันลา = 0 วัน)">
                  {MASTER_LEAVE_TYPES.filter((t) => t.category === 'special_permission').map((lt) => (
                    <option
                      key={lt.id}
                      value={lt.value}
                      className="bg-white dark:bg-[#171a21] text-slate-900 dark:text-slate-100 py-1 font-semibold"
                    >
                      {lt.label}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* =============================================================== */}
            {/* DYNAMIC MODE 1: ขออนุญาตออกนอกบริเวณโรงเรียน (<= 3 ชม.) */}
            {/* =============================================================== */}
            {isExit && (
              <div className="space-y-4 pt-1 border-t border-slate-200/80 dark:border-slate-800">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      วันที่ขออนุญาต <span className="text-rose-500">*</span>
                    </label>
                    <ThaiDatePicker
                      value={startDate}
                      onChange={(dateStr) => {
                        setStartDate(dateStr);
                        setEndDate(dateStr);
                      }}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      ระหว่างเวลา (น.) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full h-10 bg-slate-50 dark:bg-[#16202c] border border-slate-200/90 dark:border-slate-700/80 rounded-xl px-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      ถึงเวลา (น.) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full h-10 bg-slate-50 dark:bg-[#16202c] border border-slate-200/90 dark:border-slate-700/80 rounded-xl px-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 font-mono"
                    />
                  </div>
                </div>

                {/* Calculated Hours Banner */}
                <div
                  className={`p-3.5 rounded-xl border flex items-center justify-between ${
                    isExitHoursExceeded
                      ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-300 dark:border-rose-500/40 text-rose-700 dark:text-rose-300'
                      : 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs">
                    <Clock className="w-4 h-4 shrink-0" />
                    <span>
                      รวมระยะเวลา: <strong>{calculatedHours} ชั่วโมง</strong> (วันลา = 0 วัน / ไม่หักโควตา)
                    </span>
                  </div>
                  <span className="font-mono text-xs font-bold">
                    {calculatedHours <= 3 ? 'ผ่านเกณฑ์ (<= 3 ชม.)' : 'เกินเกณฑ์ (> 3 ชม.)'}
                  </span>
                </div>

                {isExitHoursExceeded && (
                  <div className="bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/40 rounded-xl p-3 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                    <span>
                      <strong>ไม่อนุญาต:</strong> ระยะเวลาออกนอกบริเวณสถานศึกษาเกิน 3 ชั่วโมง ({calculatedHours} ชม.) แนะนำให้ยื่นเป็น &quot;ลากิจส่วนตัว&quot;
                    </span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    สถานที่ไป <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      required
                      placeholder="เช่น ธนาคาร, ที่ว่าการอำเภอ..."
                      className="w-full h-10 bg-slate-50 dark:bg-[#16202c] border border-slate-200/90 dark:border-slate-700/80 rounded-xl pl-10 pr-3.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    เหตุผล / ธุระจำเป็น <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    required
                    placeholder="ระบุธุระจำเป็น..."
                    className="w-full bg-slate-50 dark:bg-[#16202c] border border-slate-200/90 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                {/* Workload Section */}
                <div className="bg-slate-50 dark:bg-[#16202c] border border-slate-200/90 dark:border-slate-700/80 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-900 dark:text-white">
                      ภาระงานสอน
                    </span>
                    <div className="flex items-center gap-4 text-xs">
                      <label className="inline-flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="retroWorkload"
                          value="ไม่มี"
                          checked={hasWorkload === 'ไม่มี'}
                          onChange={() => setHasWorkload('ไม่มี')}
                        />
                        <span>ไม่มีภาระงานสอน</span>
                      </label>
                      <label className="inline-flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="retroWorkload"
                          value="มี"
                          checked={hasWorkload === 'มี'}
                          onChange={() => setHasWorkload('มี')}
                        />
                        <span className="font-semibold text-sky-600 dark:text-sky-400">มีภาระงานสอน</span>
                      </label>
                    </div>
                  </div>

                  {hasWorkload === 'มี' && (
                    <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-700/80">
                      {workloads.map((wl, idx) => (
                        <div
                          key={idx}
                          className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center bg-white dark:bg-[#111822] p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs"
                        >
                          <input
                            type="text"
                            placeholder="ชั้น"
                            value={wl.cls}
                            onChange={(e) => handleUpdateWorkloadRow(idx, 'cls', e.target.value)}
                            className="h-8 bg-slate-50 dark:bg-[#16202c] border border-slate-200 dark:border-slate-700 rounded px-2"
                          />
                          <input
                            type="text"
                            placeholder="คาบที่"
                            value={wl.period}
                            onChange={(e) => handleUpdateWorkloadRow(idx, 'period', e.target.value)}
                            className="h-8 bg-slate-50 dark:bg-[#16202c] border border-slate-200 dark:border-slate-700 rounded px-2"
                          />
                          <input
                            type="text"
                            placeholder="งานที่มอบหมาย"
                            value={wl.task}
                            onChange={(e) => handleUpdateWorkloadRow(idx, 'task', e.target.value)}
                            className="h-8 bg-slate-50 dark:bg-[#16202c] border border-slate-200 dark:border-slate-700 rounded px-2"
                          />
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              placeholder="ผู้สอนแทน"
                              value={wl.sub}
                              onChange={(e) => handleUpdateWorkloadRow(idx, 'sub', e.target.value)}
                              className="h-8 flex-1 bg-slate-50 dark:bg-[#16202c] border border-slate-200 dark:border-slate-700 rounded px-2"
                            />
                            {workloads.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveWorkloadRow(idx)}
                                className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/20 rounded"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={handleAddWorkloadRow}
                        className="inline-flex items-center gap-1.5 text-xs text-sky-600 dark:text-sky-400 hover:underline pt-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>เพิ่มคาบที่มอบหมาย</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* =============================================================== */}
            {/* DYNAMIC MODE 2: ขออนุญาตไปราชการ (ไม่จำกัด 3 ชม.) */}
            {/* =============================================================== */}
            {isMission && (
              <div className="space-y-4 pt-1 border-t border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center gap-4 bg-slate-50 dark:bg-[#16202c] p-3 rounded-xl border border-slate-200/90 dark:border-slate-700/80 text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">รูปแบบ:</span>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="retroMissionMode"
                      value="multi_day_date"
                      checked={missionMode === 'multi_day_date'}
                      onChange={() => setMissionMode('multi_day_date')}
                    />
                    <span>เต็มวัน / หลายวัน</span>
                  </label>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="retroMissionMode"
                      value="single_day_time"
                      checked={missionMode === 'single_day_time'}
                      onChange={() => setMissionMode('single_day_time')}
                    />
                    <span>ช่วงเวลาในวันเดียว</span>
                  </label>
                </div>

                {missionMode === 'multi_day_date' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        ตั้งแต่วันที่ <span className="text-rose-500">*</span>
                      </label>
                      <ThaiDatePicker
                        value={startDate}
                        onChange={(dateStr) => setStartDate(dateStr)}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        ถึงวันที่ <span className="text-rose-500">*</span>
                      </label>
                      <ThaiDatePicker
                        value={endDate}
                        min={startDate}
                        onChange={(dateStr) => setEndDate(dateStr)}
                        required
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        วันที่ไปราชการ <span className="text-rose-500">*</span>
                      </label>
                      <ThaiDatePicker
                        value={startDate}
                        onChange={(dateStr) => {
                          setStartDate(dateStr);
                          setEndDate(dateStr);
                        }}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        เวลาออก (น.) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full h-10 bg-slate-50 dark:bg-[#16202c] border border-slate-200/90 dark:border-slate-700/80 rounded-xl px-3 text-xs text-slate-900 dark:text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        เวลากลับ (น.) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="w-full h-10 bg-slate-50 dark:bg-[#16202c] border border-slate-200/90 dark:border-slate-700/80 rounded-xl px-3 text-xs text-slate-900 dark:text-white font-mono"
                      />
                    </div>
                  </div>
                )}

                <div className="bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/30 p-3 rounded-xl flex items-center justify-between text-xs text-sky-700 dark:text-sky-300">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 shrink-0" />
                    <span>ไปราชการคิดวันลา = 0 วันทำการ (ไม่จำกัดเพดาน 3 ชั่วโมง)</span>
                  </div>
                  <span className="font-mono font-bold">ไม่ตัดโควตา</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    สถานที่ไปราชการ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    required
                    placeholder="เช่น สพป.นครราชสีมา เขต 3..."
                    className="w-full h-10 bg-slate-50 dark:bg-[#16202c] border border-slate-200/90 dark:border-slate-700/80 rounded-xl px-3.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    เรื่อง / ภารกิจที่ไปราชการ <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    required
                    placeholder="ระบุภารกิจไปราชการ..."
                    className="w-full bg-slate-50 dark:bg-[#16202c] border border-slate-200/90 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    เลขที่หนังสือ / คำสั่งไปราชการ (ถ้ามี)
                  </label>
                  <input
                    type="text"
                    value={officialOrderNo}
                    onChange={(e) => setOfficialOrderNo(e.target.value)}
                    placeholder="เช่น ศธ 04052/ว123"
                    className="w-full h-10 bg-slate-50 dark:bg-[#16202c] border border-slate-200/90 dark:border-slate-700/80 rounded-xl px-3.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>
            )}

            {/* =============================================================== */}
            {/* DYNAMIC MODE 3: การลาตามระเบียบ 2555 (11 ประเภท) */}
            {/* =============================================================== */}
            {!isZeroDays && (
              <div className="space-y-4 pt-1 border-t border-slate-200/80 dark:border-slate-800">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      จำนวนวันลา (วันทำการ)
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        step="0.5"
                        min="0.5"
                        value={totalDays}
                        onChange={(e) => setTotalDays(e.target.value)}
                        className="w-24 h-10 bg-slate-50 dark:bg-[#16202c] border border-slate-200/90 dark:border-slate-700/80 rounded-xl px-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 font-mono transition-all"
                      />
                      <label className="inline-flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isHalfDay}
                          onChange={(e) => {
                            setIsHalfDay(e.target.checked);
                            if (e.target.checked) setTotalDays('0.5');
                          }}
                          className="rounded border-slate-700 text-sky-500 focus:ring-sky-500"
                        />
                        <span>ลาครึ่งวัน (0.5 วัน)</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      เลขที่ใบรับรองแพทย์ / เอกสารแนบ
                    </label>
                    <input
                      type="text"
                      value={medicalCertNo}
                      onChange={(e) => setMedicalCertNo(e.target.value)}
                      placeholder="เช่น รพ.ปักธงชัย เล่ม 12 เลขที่ 450"
                      className="w-full h-10 bg-slate-50 dark:bg-[#16202c] border border-slate-200/90 dark:border-slate-700/80 rounded-xl px-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      ตั้งแต่วันที่ <span className="text-rose-500">*</span>
                    </label>
                    <ThaiDatePicker
                      value={startDate}
                      onChange={(dateStr) => setStartDate(dateStr)}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      ถึงวันที่ <span className="text-rose-500">*</span>
                    </label>
                    <ThaiDatePicker
                      value={endDate}
                      min={startDate}
                      onChange={(dateStr) => setEndDate(dateStr)}
                      required
                    />
                  </div>
                </div>

                {/* Reason */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    เหตุผลการลา <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="ระบุอาการเจ็บป่วย หรือธุระจำเป็น..."
                    className="w-full bg-slate-50 dark:bg-[#16202c] border border-slate-200/90 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
                  />
                </div>

                {/* Retroactive Reason */}
                <div>
                  <label className="block text-xs font-semibold text-amber-700 dark:text-amber-300 mb-1.5">
                    เหตุผลความจำเป็นในการยื่นใบลาย้อนหลัง <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    value={retroReason}
                    onChange={(e) => setRetroReason(e.target.value)}
                    placeholder="เช่น เกิดอุบัติเหตุกะทันหันขณะเดินทาง, อาการป่วยรุนแรงต้องเข้ารับการรักษาฉุกเฉิน..."
                    className="w-full bg-amber-50/50 dark:bg-[#16202c] border border-amber-300 dark:border-amber-500/40 rounded-xl p-3 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            )}

            {/* Substitute Teacher */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                ผู้ปฏิบัติหน้าที่แทน
              </label>
              <select
                value={substituteTeacher}
                onChange={(e) => setSubstituteTeacher(e.target.value)}
                className="w-full h-10 bg-slate-50 dark:bg-[#16202c] border border-slate-200/90 dark:border-slate-700 rounded-xl px-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
              >
                {teachersList.map((t) => (
                  <option key={t.id} value={t.name}>
                    {t.name} ({t.position})
                  </option>
                ))}
              </select>
            </div>

            {/* Validation Error Banner */}
            {validationError && (
              <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 rounded-xl p-3 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{validationError}</span>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isSubmitted || isExitHoursExceeded}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-medium text-white transition-all shadow-sm ${
                  isExitHoursExceeded
                    ? 'bg-slate-400 cursor-not-allowed opacity-60'
                    : 'bg-sky-600 hover:bg-sky-500 cursor-pointer active:scale-[0.98]'
                } disabled:opacity-50`}
              >
                {isSubmitted ? (
                  <>
                    <Clock className="w-4 h-4 animate-spin shrink-0" />
                    <span>กำลังบันทึกข้อมูล...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 shrink-0" />
                    <span>บันทึกข้อมูลย้อนหลัง</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right Info Column: Teacher Current Leave Quota */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-[#111822] p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 transition-colors duration-200">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">
              ข้อมูลสถิติวันลาปัจจุบันของผู้ขอ
            </h3>

            {selectedTeacher && (
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-slate-50 dark:bg-[#151d28] rounded-xl border border-slate-200/90 dark:border-slate-800">
                  <div
                    className="font-bold text-slate-900 dark:text-white text-sm truncate"
                    title={selectedTeacher.name}
                  >
                    {selectedTeacher.name}
                  </div>
                  <div
                    className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5 truncate"
                    title={selectedTeacher.position}
                  >
                    {selectedTeacher.position.replace('ผู้อำนวยการสถานศึกษา', 'ผอ.สถานศึกษา')}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-slate-300">
                  <div className="bg-slate-50 dark:bg-[#151d28] p-2.5 rounded-lg border border-slate-200/90 dark:border-slate-800">
                    <span className="text-slate-500 text-[11px]">ลาป่วยที่ใช้ไป</span>
                    <p className="font-mono font-bold text-rose-500 dark:text-rose-400 text-sm mt-0.5">
                      {selectedTeacher.sickUsed} / 60 วัน
                    </p>
                  </div>
                  <div className="bg-slate-50 dark:bg-[#151d28] p-2.5 rounded-lg border border-slate-200/90 dark:border-slate-800">
                    <span className="text-slate-500 text-[11px]">ลากิจที่ใช้ไป</span>
                    <p className="font-mono font-bold text-amber-500 dark:text-amber-400 text-sm mt-0.5">
                      {selectedTeacher.personalUsed} / 45 วัน
                    </p>
                  </div>
                  <div className="bg-slate-50 dark:bg-[#151d28] p-2.5 rounded-lg border border-slate-200/90 dark:border-slate-800 col-span-2">
                    <span className="text-slate-500 text-[11px]">ลาพักผ่อนสะสม</span>
                    <p className="font-mono font-bold text-emerald-500 dark:text-emerald-400 text-sm mt-0.5">
                      {selectedTeacher.vacationUsed} / 10 วัน
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-[#111822] p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-2 transition-colors duration-200">
            <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 font-semibold">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>ระบบตรวจสอบสิทธิและบันทึกสถิติ</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              การบันทึกย้อนหลังกรณีการลาป่วย/ลากิจ จะถูกนำไปคำนวณในสถิติประจำปีงบประมาณ 2570 สำหรับกรณีขออนุญาตออกนอกบริเวณโรงเรียน (ไม่เกิน 3 ชม.) และไปราชการ จะบันทึกเป็นวันลา 0 วัน และไม่ถูกนำไปหักโควตาวันลาหรือกระทบเกณฑ์การเลื่อนเงินเดือน
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
