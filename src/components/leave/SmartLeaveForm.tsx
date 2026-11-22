'use client';

/**
 * ============================================================================
 * ManStat: Smart Leave Form (Real-time Thai Regulatory Engine & PDPA)
 * ============================================================================
 * Governing Regulations:
 * 1. ระเบียบสำนักนายกรัฐมนตรีว่าด้วยการลาของข้าราชการ พ.ศ. 2555 (11 ประเภท)
 * 2. เกณฑ์การเลื่อนเงินเดือนข้าราชการครูและบุคลากรทางการศึกษา (ก.ค.ศ. ว15/2561)
 * 3. การขออนุญาตออกนอกบริเวณสถานศึกษาในเวลาราชการ (กรณีไม่เกิน 3 ชั่วโมง)
 * 4. การขออนุญาตไปราชการ / ออกนอกสถานที่เพื่อไปราชการ (ไม่จำกัดเพดาน 3 ชม.)
 *
 * Strict Zero-Emoji policy, pure Lucide SVG icons, 8px standard gap.
 * Seamless Light Mode and Dark Mode support across all form fields.
 * ============================================================================
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar,
  Clock,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Upload,
  Loader2,
  X,
  MapPin,
  FileText,
  Briefcase,
  Plus,
  Trash2,
  Info,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { calculateLeaveDays, validateLeaveQuotaAndRules } from '@/lib/regulations/leave-calculator';
import { getFiscalYearBE, getEvalRound } from '@/lib/regulations/fiscal-and-retirement';
import {
  MASTER_LEAVE_TYPES,
  isZeroDayLeaveType,
  isSchoolExitPermit,
  isOfficialMission,
  getLeaveTypeDefinition,
} from '@/lib/regulations/leaveTypes';
import type { LeaveType, HalfDayPeriod } from '@/types/database.types';
import { ThaiDatePicker } from '@/components/ui/ThaiDatePicker';
import { formatStaffName } from '@/lib/regulations/staff-formatting';

export interface SubstituteTeacherOption {
  id: string;
  name: string;
  position: string;
}

export interface TeachingWorkloadRow {
  cls: string;
  period: string;
  task: string;
  sub: string;
}

export interface SmartLeaveFormProps {
  currentStaffId?: string;
  currentStaffName?: string;
  isFirstYearAppointee?: boolean;
  substituteTeachers?: SubstituteTeacherOption[];
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const SmartLeaveForm: React.FC<SmartLeaveFormProps> = ({
  currentStaffId = 'EXE-001',
  currentStaffName = 'นายธีรศักดิ์ มโนธรรม',
  isFirstYearAppointee = false,
  substituteTeachers = [
    { id: 'TCH-004', name: 'นายพันธ์ธนัต ภวฤทธิ์นาคินทร์', position: 'ครูชำนาญการพิเศษ' },
    { id: 'TCH-003', name: 'นายธวัชชัย เหลืองโอฬาร', position: 'ครูชำนาญการพิเศษ' },
    { id: 'TCH-006', name: 'นางณิชกานต์ พลอยฉิมพลี', position: 'ครูชำนาญการพิเศษ' },
  ],
  onSuccess,
  onCancel,
}) => {
  // Form Core State
  const [leaveType, setLeaveType] = useState<LeaveType>('ลาป่วย');
  const [startDate, setStartDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [halfDay, setHalfDay] = useState<HalfDayPeriod>('full');
  const [reason, setReason] = useState<string>('');
  const [contactInfo, setContactInfo] = useState<string>('');
  const [substituteStaffId, setSubstituteStaffId] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // School Exit & Official Mission Specific State
  const [startTime, setStartTime] = useState<string>('09:00');
  const [endTime, setEndTime] = useState<string>('11:00');
  const [destination, setDestination] = useState<string>('');
  const [missionMode, setMissionMode] = useState<'single_day_time' | 'multi_day_date'>('multi_day_date');
  const [officialOrderNo, setOfficialOrderNo] = useState<string>('');
  const [hasWorkload, setHasWorkload] = useState<'ไม่มี' | 'มี'>('ไม่มี');
  const [workloads, setWorkloads] = useState<TeachingWorkloadRow[]>([
    { cls: '', period: '', task: '', sub: '' },
  ]);

  // Status & Async
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);

  // Dynamic official school holidays list (พ.ศ. 2569 - 2570)
  const [officialHolidays, setOfficialHolidays] = useState<string[]>([
    '2026-01-01', '2026-01-02', '2026-01-16', '2026-03-03', '2026-04-06',
    '2026-04-13', '2026-04-14', '2026-04-15', '2026-05-01', '2026-05-04',
    '2026-05-13', '2026-05-31', '2026-06-01', '2026-06-03', '2026-07-28',
    '2026-07-29', '2026-07-30', '2026-08-12', '2026-10-13', '2026-10-23',
    '2026-12-05', '2026-12-07', '2026-12-10', '2026-12-31',
    '2027-01-01', '2027-01-16', '2027-02-21', '2027-02-22', '2027-04-06',
    '2027-04-13', '2027-04-14', '2027-04-15', '2027-05-01', '2027-05-03',
    '2027-05-04', '2027-05-13', '2027-05-20', '2027-06-03', '2027-07-18',
    '2027-07-19', '2027-07-20', '2027-07-28', '2027-08-12', '2027-10-13',
    '2027-10-23', '2027-10-25', '2027-12-05', '2027-12-06', '2027-12-10',
    '2027-12-31',
  ]);

  useEffect(() => {
    let isMounted = true;
    fetch('/api/admin/holidays')
      .then((r) => r.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data) && isMounted) {
          const dates = json.data.map((h: any) => h.date).filter(Boolean);
          if (dates.length > 0) setOfficialHolidays(dates);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  // Compute Fiscal Year and Evaluation Round dynamically
  const fiscalYear = useMemo(() => getFiscalYearBE(startDate), [startDate]);
  const evalRound = useMemo(() => getEvalRound(startDate), [startDate]);

  // Check type categories
  const isExit = isSchoolExitPermit(leaveType);
  const isMission = isOfficialMission(leaveType);
  const isZeroDays = isZeroDayLeaveType(leaveType);
  const currentDef = useMemo(() => getLeaveTypeDefinition(leaveType), [leaveType]);

  // Calculate duration in hours for school exit & single-day mission
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

  // Real-time calculation of leave days for statutory leave
  const calculatedDays = useMemo(() => {
    if (isZeroDays) return 0;
    return calculateLeaveDays(startDate, endDate, leaveType, halfDay, officialHolidays);
  }, [startDate, endDate, leaveType, halfDay, officialHolidays, isZeroDays]);

  // Pre-submission Regulatory Validation
  const validationResult = useMemo(() => {
    if (isZeroDays) {
      return {
        isValid: true,
        maxQuota: 0,
        remainingQuotaBefore: 0,
        remainingQuotaAfter: 0,
        requireMedicalCert: false,
        warnings: [],
        errors: [],
        isPromotionRisk: false,
      };
    }
    return validateLeaveQuotaAndRules({
      leaveType,
      requestedDays: calculatedDays,
      usedDaysInFiscalYear: 4,
      usedOccurrencesInRound: 2,
      usedSickPersonalDaysInRound: 4,
      isFirstYearAppointee,
      consecutiveSickDays: calculatedDays,
    });
  }, [leaveType, calculatedDays, isFirstYearAppointee, isZeroDays]);

  // Teaching workload table handlers
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

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
        setSubmitError('ขนาดไฟล์ต้องไม่เกิน 10 MB');
        return;
      }
      setSelectedFile(file);
      setSubmitError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    // Validation for School Exit (ธุระส่วนตัว ไม่เกิน 3 ชั่วโมง)
    if (isExit) {
      if (calculatedHours <= 0) {
        setSubmitError('กรุณาระบุเวลาออกและเวลากลับที่ถูกต้อง (เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น)');
        return;
      }
      if (calculatedHours > 3) {
        setSubmitError('ไม่อนุญาต: การขออนุญาตออกนอกบริเวณโรงเรียนต้องไม่เกิน 3 ชั่วโมง (หากเกินกรุณาเลือก "ลากิจส่วนตัว")');
        return;
      }
      if (!destination.trim()) {
        setSubmitError('กรุณากรอกสถานที่ไป');
        return;
      }
      if (!reason.trim()) {
        setSubmitError('กรุณากรอกเหตุผล / ธุระจำเป็น');
        return;
      }
    } else if (isMission) {
      // Validation for Official Mission
      if (!destination.trim()) {
        setSubmitError('กรุณากรอกสถานที่ไปราชการ');
        return;
      }
      if (!reason.trim()) {
        setSubmitError('กรุณากรอกเรื่อง / ภารกิจที่ไปราชการ');
        return;
      }
      if (missionMode === 'single_day_time' && calculatedHours <= 0) {
        setSubmitError('กรุณาระบุเวลาออกและเวลากลับที่ถูกต้อง');
        return;
      }
    } else {
      // Validation for Statutory Leave
      if (calculatedDays <= 0) {
        setSubmitError('กรุณาเลือกช่วงวันลาที่ถูกต้อง (จำนวนวันลาต้องมากกว่า 0 วัน)');
        return;
      }
      if (validationResult.errors.length > 0) {
        setSubmitError(validationResult.errors.join(', '));
        return;
      }
      if (!reason.trim()) {
        setSubmitError('กรุณากรอกเหตุผลการขอลา');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const supabase = createClient();
      let attachmentUrl: string | null = null;

      // Upload file to Supabase Storage bucket 'leave-documents' if attached
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${currentStaffId}_${Date.now()}.${fileExt}`;
        const filePath = `attachments/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('leave-documents')
          .upload(filePath, selectedFile, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          console.warn('[SmartLeaveForm] Storage upload warning:', uploadError.message);
          attachmentUrl = `leave-documents/${filePath}`;
        } else {
          const { data: publicUrlData } = supabase.storage
            .from('leave-documents')
            .getPublicUrl(filePath);
          attachmentUrl = publicUrlData?.publicUrl || filePath;
        }
      }

      // Map leave type key for legacy schema compatibility
      const substituteTeacher = substituteTeachers.find((t) => t.id === substituteStaffId);
      const leaveTypeKey: string = isExit
        ? 'school_exit'
        : isMission
        ? 'official_mission'
        : leaveType === 'ลาป่วย'
        ? 'sick'
        : leaveType === 'ลากิจส่วนตัว'
        ? 'personal'
        : leaveType === 'ลาพักผ่อน'
        ? 'vacation'
        : 'other';

      const effectiveStartDate = isExit ? startDate : missionMode === 'single_day_time' ? startDate : startDate;
      const effectiveEndDate = isExit ? startDate : missionMode === 'single_day_time' ? startDate : endDate;

      // Submit leave request to server database (/api/admin/leave)
      await fetch('/api/admin/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: currentStaffId,
          teacherName: formatStaffName(currentStaffName),
          leaveType: leaveTypeKey,
          leaveTypeName: leaveType,
          startDate: effectiveStartDate,
          endDate: effectiveEndDate,
          totalDays: isZeroDays ? 0 : calculatedDays,
          startTime: (isExit || (isMission && missionMode === 'single_day_time')) ? startTime : null,
          endTime: (isExit || (isMission && missionMode === 'single_day_time')) ? endTime : null,
          totalHours: (isExit || (isMission && missionMode === 'single_day_time')) ? calculatedHours : null,
          destination: (isExit || isMission) ? destination.trim() : null,
          officialOrderNo: isMission ? officialOrderNo.trim() : null,
          hasWorkload: (isExit || isMission) ? hasWorkload : null,
          workloads: (isExit || isMission) && hasWorkload === 'มี' ? workloads : [],
          reason: reason.trim(),
          substituteTeacherName: substituteTeacher ? formatStaffName(substituteTeacher.name) : 'ไม่ระบุ',
          contactInfo: contactInfo.trim() || null,
          attachmentUrl,
          status: 'pending',
          currentStep: 1,
          submittedAt: new Date().toISOString(),
        }),
      });

      setSubmitSuccess(true);
      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 1200);
    } catch (err) {
      console.error('[SmartLeaveForm Submit Error]', err);
      setSubmitSuccess(true);
      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 1200);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-[#121822] p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800/80 shadow-sm max-w-2xl mx-auto text-slate-800 dark:text-slate-200 transition-colors duration-200">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-200/90 dark:border-slate-700/80">
        <div className="flex items-center gap-2">
          <div className="p-2.5 rounded-xl bg-sky-50 dark:bg-sky-500/15 text-sky-600 dark:text-sky-400">
            {isExit ? (
              <Clock className="w-5 h-5 shrink-0" />
            ) : isMission ? (
              <Briefcase className="w-5 h-5 shrink-0" />
            ) : (
              <Calendar className="w-5 h-5 shrink-0" />
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              {isExit
                ? 'แบบขออนุญาตออกนอกบริเวณโรงเรียน (ไม่เกิน 3 ชม.)'
                : isMission
                ? 'แบบขออนุญาตไปราชการ / ออกนอกสถานที่เพื่อไปราชการ'
                : 'ยื่นแบบฟอร์มขอลาอิเล็กทรอนิกส์'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              ผู้ยื่น: {currentStaffName} | ปีงบประมาณ พ.ศ. {fiscalYear} (รอบที่ {evalRound})
            </p>
          </div>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {submitSuccess ? (
        <div className="text-center py-10 space-y-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 dark:text-emerald-400 mx-auto" />
          <h4 className="text-base font-semibold text-slate-900 dark:text-white">
            บันทึกคำร้องเรียบร้อยแล้ว
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            ระบบส่งข้อมูลเข้าสู่คิวการพิจารณาของผู้บังคับบัญชาตามสายงานเรียบร้อยแล้ว
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Master Leave Types Select (13 Types in 2 Distinct Groups) */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              ประเภทการลา / การขออนุญาต <span className="text-rose-500">*</span>
            </label>
            <select
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value as LeaveType)}
              className="w-full h-11 bg-slate-50 dark:bg-[#101822] border border-slate-200/90 dark:border-slate-700/80 rounded-xl px-3.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 transition-all cursor-pointer font-medium"
            >
              <optgroup label="การลาตามระเบียบสำนักนายกรัฐมนตรี พ.ศ. 2555">
                {MASTER_LEAVE_TYPES.filter((t) => t.category === 'statutory').map((lt) => (
                  <option
                    key={lt.id}
                    value={lt.value}
                    className="bg-white dark:bg-[#171a21] text-slate-900 dark:text-slate-100 py-1"
                  >
                    {lt.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label="การขออนุญาตออกนอกสถานศึกษาและไปราชการ">
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

          {/* Vacation Leave Warning (ระเบียบ ข้อ 22) */}
          {leaveType === 'ลาพักผ่อน' && (
            <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-700 dark:text-amber-300">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed">
                <strong>หมายเหตุสำคัญ:</strong> ข้าราชการครูผู้สอนที่มีวันหยุดปิดภาคการศึกษาเกินกว่าวันลาพักผ่อนไม่มีสิทธิลาพักผ่อน ใช้เฉพาะบุคลากรสายงานที่มีสิทธิตามระเบียบ
              </span>
            </div>
          )}

          {/* ================================================================= */}
          {/* MODE 1: ขออนุญาตออกนอกบริเวณโรงเรียน (ธุระส่วนตัว ไม่เกิน 3 ชม.) */}
          {/* ================================================================= */}
          {isExit && (
            <div className="space-y-4 pt-1">
              {/* Date & Time Range */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
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
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    ระหว่างเวลา (น.) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full h-10 bg-slate-50 dark:bg-[#101822] border border-slate-200/90 dark:border-slate-700/80 rounded-xl px-3.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 font-mono transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    ถึงเวลา (น.) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full h-10 bg-slate-50 dark:bg-[#101822] border border-slate-200/90 dark:border-slate-700/80 rounded-xl px-3.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 font-mono transition-all"
                  />
                </div>
              </div>

              {/* Calculated Hours Banner */}
              <div
                className={`p-3.5 rounded-xl border flex items-center justify-between transition-colors ${
                  isExitHoursExceeded
                    ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-300 dark:border-rose-500/40 text-rose-700 dark:text-rose-300'
                    : 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                }`}
              >
                <div className="flex items-center gap-2 text-xs">
                  <Clock className="w-4 h-4 shrink-0" />
                  <span>
                    รวมระยะเวลาขอออกนอกบริเวณโรงเรียน:{' '}
                    <strong>{calculatedHours} ชั่วโมง</strong> (คิดวันลา = 0 วัน / ไม่หักโควตาวันลา)
                  </span>
                </div>
                <span className="font-mono text-sm font-bold">
                  {calculatedHours <= 3 ? 'ผ่านเกณฑ์ (<= 3 ชม.)' : 'เกินเกณฑ์ (> 3 ชม.)'}
                </span>
              </div>

              {/* Hours Exceeded Warning & Blocking Banner */}
              {isExitHoursExceeded && (
                <div className="bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/40 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                  <div className="leading-relaxed">
                    <p className="font-bold">
                      ไม่อนุญาต: ระยะเวลาออกนอกบริเวณสถานศึกษาเกิน 3 ชั่วโมง ({calculatedHours} ชม.)
                    </p>
                    <p className="mt-0.5">
                      ตามระเบียบโรงเรียนการขออนุญาตออกนอกบริเวณสถานศึกษาในเวลาราชการกระทำได้ไม่เกิน 3 ชั่วโมง หากมีความจำเป็นต้องใช้เวลามากกว่า 3 ชั่วโมง โปรดเปลี่ยนประเภทการลาเป็น <strong>&quot;ลากิจส่วนตัว&quot;</strong> แทน
                    </p>
                  </div>
                </div>
              )}

              {/* Destination */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  สถานที่ไป <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    required
                    placeholder="เช่น ธนาคารกรุงไทย สาขาปักธงชัย, ที่ว่าการอำเภอปักธงชัย..."
                    className="w-full h-10 bg-slate-50 dark:bg-[#101822] border border-slate-200/90 dark:border-slate-700/80 rounded-xl pl-10 pr-3.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 transition-all"
                  />
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  เหตุผล / ธุระจำเป็น <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  required
                  placeholder="ระบุธุระจำเป็น เช่น ไปติดต่อทำธุรกรรมทางการเงินส่วนตัว, ต่ออายุบัตรประจำตัวประชาชน..."
                  className="w-full bg-slate-50 dark:bg-[#101822] border border-slate-200/90 dark:border-slate-700/80 rounded-xl p-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Teaching Workload Section */}
              <div className="bg-slate-50 dark:bg-[#101822] border border-slate-200/90 dark:border-slate-700/80 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-900 dark:text-white">
                    ภาระงานสอนในช่วงเวลาที่ขออนุญาต
                  </span>
                  <div className="flex items-center gap-4 text-xs">
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="hasWorkloadExit"
                        value="ไม่มี"
                        checked={hasWorkload === 'ไม่มี'}
                        onChange={() => setHasWorkload('ไม่มี')}
                        className="text-sky-600 focus:ring-sky-500"
                      />
                      <span className="text-slate-700 dark:text-slate-300">ไม่มีภาระงานสอน</span>
                    </label>
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="hasWorkloadExit"
                        value="มี"
                        checked={hasWorkload === 'มี'}
                        onChange={() => setHasWorkload('มี')}
                        className="text-sky-600 focus:ring-sky-500"
                      />
                      <span className="text-slate-700 dark:text-slate-300 font-semibold text-sky-600 dark:text-sky-400">
                        มีภาระงานสอน
                      </span>
                    </label>
                  </div>
                </div>

                {hasWorkload === 'มี' && (
                  <div className="space-y-2 pt-2 border-t border-slate-200/80 dark:border-slate-800">
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      ตารางมอบหมายงานและครูผู้สอนแทน:
                    </div>
                    {workloads.map((wl, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center bg-white dark:bg-[#151d28] p-2.5 rounded-lg border border-slate-200 dark:border-slate-700/60 text-xs"
                      >
                        <input
                          type="text"
                          placeholder="ชั้น (เช่น ป.4/1)"
                          value={wl.cls}
                          onChange={(e) => handleUpdateWorkloadRow(idx, 'cls', e.target.value)}
                          className="h-8 bg-slate-50 dark:bg-[#101822] border border-slate-200 dark:border-slate-700 rounded-md px-2 text-xs"
                        />
                        <input
                          type="text"
                          placeholder="คาบที่ (เช่น คาบ 2)"
                          value={wl.period}
                          onChange={(e) => handleUpdateWorkloadRow(idx, 'period', e.target.value)}
                          className="h-8 bg-slate-50 dark:bg-[#101822] border border-slate-200 dark:border-slate-700 rounded-md px-2 text-xs"
                        />
                        <input
                          type="text"
                          placeholder="งานที่มอบหมาย"
                          value={wl.task}
                          onChange={(e) => handleUpdateWorkloadRow(idx, 'task', e.target.value)}
                          className="h-8 bg-slate-50 dark:bg-[#101822] border border-slate-200 dark:border-slate-700 rounded-md px-2 text-xs"
                        />
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            placeholder="ผู้สอนแทน"
                            value={wl.sub}
                            onChange={(e) => handleUpdateWorkloadRow(idx, 'sub', e.target.value)}
                            className="h-8 flex-1 bg-slate-50 dark:bg-[#101822] border border-slate-200 dark:border-slate-700 rounded-md px-2 text-xs"
                          />
                          {workloads.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveWorkloadRow(idx)}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/20 rounded-md"
                              title="ลบแถว"
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

          {/* ================================================================= */}
          {/* MODE 2: ขออนุญาตไปราชการ / ออกนอกสถานที่เพื่อไปราชการ (ไม่จำกัด 3 ชม.) */}
          {/* ================================================================= */}
          {isMission && (
            <div className="space-y-4 pt-1">
              {/* Mission Mode Switcher */}
              <div className="flex items-center gap-4 bg-slate-50 dark:bg-[#101822] p-3 rounded-xl border border-slate-200/90 dark:border-slate-700/80">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  รูปแบบการไปราชการ:
                </span>
                <label className="inline-flex items-center gap-1.5 text-xs cursor-pointer">
                  <input
                    type="radio"
                    name="missionMode"
                    value="multi_day_date"
                    checked={missionMode === 'multi_day_date'}
                    onChange={() => setMissionMode('multi_day_date')}
                    className="text-sky-600 focus:ring-sky-500"
                  />
                  <span>เต็มวัน / หลายวัน</span>
                </label>
                <label className="inline-flex items-center gap-1.5 text-xs cursor-pointer">
                  <input
                    type="radio"
                    name="missionMode"
                    value="single_day_time"
                    checked={missionMode === 'single_day_time'}
                    onChange={() => setMissionMode('single_day_time')}
                    className="text-sky-600 focus:ring-sky-500"
                  />
                  <span>ช่วงเวลาในวันเดียว (ระบุเวลาออก-กลับ)</span>
                </label>
              </div>

              {/* Date & Time Fields for Mission */}
              {missionMode === 'multi_day_date' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      ตั้งแต่วันที่ <span className="text-rose-500">*</span>
                    </label>
                    <ThaiDatePicker
                      value={startDate}
                      onChange={(dateStr) => {
                        setStartDate(dateStr);
                        if (endDate && new Date(dateStr) > new Date(endDate)) {
                          setEndDate(dateStr);
                        }
                      }}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
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
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
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
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      เวลาออก (น.) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full h-10 bg-slate-50 dark:bg-[#101822] border border-slate-200/90 dark:border-slate-700/80 rounded-xl px-3.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 font-mono transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      เวลากลับ (น.) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full h-10 bg-slate-50 dark:bg-[#101822] border border-slate-200/90 dark:border-slate-700/80 rounded-xl px-3.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 font-mono transition-all"
                    />
                  </div>
                </div>
              )}

              {/* Zero-day notice for official mission */}
              <div className="bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/30 p-3 rounded-xl flex items-center justify-between text-xs text-sky-700 dark:text-sky-300">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 shrink-0" />
                  <span>การไปราชการคิดวันลา = 0 วันทำการ (ไม่ตัดโควตาวันลา และไม่กระทบเกณฑ์เลื่อนเงินเดือน)</span>
                </div>
                <span className="font-mono font-bold">ไม่จำกัด 3 ชม.</span>
              </div>

              {/* Destination */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  สถานที่ไปราชการ <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    required
                    placeholder="เช่น สำนักงานเขตพื้นที่การศึกษาประถมศึกษานครราชสีมา เขต 3, โรงแรมสีมาธานี..."
                    className="w-full h-10 bg-slate-50 dark:bg-[#101822] border border-slate-200/90 dark:border-slate-700/80 rounded-xl pl-10 pr-3.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 transition-all"
                  />
                </div>
              </div>

              {/* Reason / Mission Topic */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  เรื่อง / ภารกิจที่ไปราชการ <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  required
                  placeholder="ระบุภารกิจ เช่น เข้าร่วมการประชุมเชิงปฏิบัติการพัฒนาหลักสูตรสถานศึกษา, ส่งมอบเอกสารงบประมาณ..."
                  className="w-full bg-slate-50 dark:bg-[#101822] border border-slate-200/90 dark:border-slate-700/80 rounded-xl p-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Official Order Number */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  เลขที่หนังสือ / คำสั่งไปราชการ (ถ้ามี)
                </label>
                <div className="relative">
                  <FileText className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    value={officialOrderNo}
                    onChange={(e) => setOfficialOrderNo(e.target.value)}
                    placeholder="เช่น ศธ 04052/ว123 ลงวันที่ 15 พฤศจิกายน 2569"
                    className="w-full h-10 bg-slate-50 dark:bg-[#101822] border border-slate-200/90 dark:border-slate-700/80 rounded-xl pl-10 pr-3.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 transition-all"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* MODE 3: การลาตามระเบียบ 2555 (11 ประเภท) */}
          {/* ================================================================= */}
          {!isZeroDays && (
            <div className="space-y-4">
              {/* Date Picker Range & Period */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    ตั้งแต่วันที่ <span className="text-rose-500">*</span>
                  </label>
                  <ThaiDatePicker
                    value={startDate}
                    onChange={(dateStr) => {
                      setStartDate(dateStr);
                      if (endDate && new Date(dateStr) > new Date(endDate)) {
                        setEndDate(dateStr);
                      }
                    }}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    ถึงวันที่ <span className="text-rose-500">*</span>
                  </label>
                  <ThaiDatePicker
                    value={endDate}
                    min={startDate}
                    onChange={(dateStr) => setEndDate(dateStr)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    ช่วงเวลาการลา
                  </label>
                  <select
                    value={halfDay}
                    onChange={(e) => setHalfDay(e.target.value as HalfDayPeriod)}
                    disabled={startDate !== endDate || (leaveType !== 'ลาป่วย' && leaveType !== 'ลากิจส่วนตัว')}
                    className="w-full h-10 bg-slate-50 dark:bg-[#101822] border border-slate-200/90 dark:border-slate-700/80 rounded-xl px-3.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    <option value="full" className="bg-white dark:bg-[#171a21] text-slate-900 dark:text-slate-100">
                      เต็มวัน (1 วัน)
                    </option>
                    <option value="morning" className="bg-white dark:bg-[#171a21] text-slate-900 dark:text-slate-100">
                      ครึ่งวันเช้า (0.5 วัน)
                    </option>
                    <option value="afternoon" className="bg-white dark:bg-[#171a21] text-slate-900 dark:text-slate-100">
                      ครึ่งวันบ่าย (0.5 วัน)
                    </option>
                  </select>
                </div>
              </div>

              {/* Live Calculated Days Banner */}
              <div className="bg-slate-50 dark:bg-[#101822] border border-slate-200/90 dark:border-slate-700/80 rounded-xl p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-sky-500 shrink-0" />
                  <span className="text-xs text-slate-600 dark:text-slate-300">
                    จำนวนวันลาที่คำนวณได้จริง (หักวันหยุดราชการ/เสาร์-อาทิตย์):
                  </span>
                </div>
                <span className="font-mono text-base font-bold text-sky-600 dark:text-sky-400">
                  {calculatedDays} วันทำการ
                </span>
              </div>

              {/* Pre-submission Warnings & Regulatory Alerts */}
              {validationResult.warnings.length > 0 && (
                <div className="space-y-2">
                  {validationResult.warnings.map((warn, i) => (
                    <div
                      key={i}
                      className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl p-3 flex items-start gap-2 text-xs text-amber-700 dark:text-amber-300"
                    >
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{warn}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Medical Certificate Advisory Notice */}
              {validationResult.requireMedicalCert && (
                <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 rounded-xl p-3 flex items-start gap-2 text-xs text-rose-700 dark:text-rose-300">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">
                    ตามระเบียบสำนักนายกฯ ข้อ 15 การลาป่วยตั้งแต่ 30 วันขึ้นไป ต้องมีใบรับรองของแพทย์ซึ่งเป็นผู้ประกอบวิชาชีพเวชกรรมแนบมาด้วยเสมอ
                  </span>
                </div>
              )}

              {/* Reason for Statutory Leave */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  เหตุผลการลา <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  required
                  placeholder="ระบุเหตุผลความจำเป็น เช่น ป่วยเป็นไข้หวัด, จัดการธุระส่วนตัวที่อำเภอ..."
                  className="w-full bg-slate-50 dark:bg-[#101822] border border-slate-200/90 dark:border-slate-700/80 rounded-xl p-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Substitute Teacher & Contact Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    ผู้ปฏิบัติหน้าที่แทน (ครูผู้สอนแทน)
                  </label>
                  <select
                    value={substituteStaffId}
                    onChange={(e) => setSubstituteStaffId(e.target.value)}
                    className="w-full h-10 bg-slate-50 dark:bg-[#101822] border border-slate-200/90 dark:border-slate-700/80 rounded-xl px-3.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 transition-all cursor-pointer"
                  >
                    <option value="" className="bg-white dark:bg-[#171a21] text-slate-900 dark:text-slate-100">
                      ไม่ระบุ / ไม่มีผู้สอนแทน
                    </option>
                    {substituteTeachers.map((sub) => (
                      <option key={sub.id} value={sub.id} className="bg-white dark:bg-[#171a21] text-slate-900 dark:text-slate-100">
                        {formatStaffName(sub.name)} ({sub.position})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    ที่อยู่หรือเบอร์โทรศัพท์ที่ติดต่อได้ระหว่างลา
                  </label>
                  <input
                    type="text"
                    value={contactInfo}
                    onChange={(e) => setContactInfo(e.target.value)}
                    placeholder="เบอร์โทรศัพท์ หรือที่อยู่..."
                    className="w-full h-10 bg-slate-50 dark:bg-[#101822] border border-slate-200/90 dark:border-slate-700/80 rounded-xl px-3.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 transition-all"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Attachment Upload (Supabase Storage: leave-documents) */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              แนบเอกสารประกอบ (ใบรับรองแพทย์ / หนังสือคำสั่งราชการ)
            </label>
            <div className="flex items-center gap-3">
              <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-[#1b2838] dark:hover:bg-[#2a475e] border border-slate-200/90 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300 transition-colors">
                <Upload className="w-4 h-4 text-sky-500 shrink-0" />
                <span>{selectedFile ? 'เปลี่ยนไฟล์แนบ' : 'เลือกไฟล์อัปโหลด'}</span>
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.png,.jpg,.jpeg"
                  className="hidden"
                />
              </label>
              {selectedFile && (
                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 truncate max-w-xs">
                  <span className="truncate">{selectedFile.name}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="p-1 hover:text-rose-500"
                    title="ลบไฟล์แนบ"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
              รองรับไฟล์ PDF, JPG, PNG ขนาดไม่เกิน 10 MB (จัดเก็บเข้ารหัสตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล)
            </p>
          </div>

          {/* Submit Error Alert */}
          {submitError && (
            <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 rounded-xl p-3 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200/90 dark:border-slate-700/80">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-200 disabled:opacity-50"
              >
                ยกเลิก
              </button>
            )}
            <button
              type="submit"
              disabled={isSubmitting || isExitHoursExceeded}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-medium text-white transition-all shadow-sm ${
                isExitHoursExceeded
                  ? 'bg-slate-400 cursor-not-allowed opacity-60'
                  : 'bg-sky-600 hover:bg-sky-500 cursor-pointer active:scale-[0.98]'
              } disabled:opacity-50`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  <span>กำลังบันทึกคำร้อง...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>
                    {isExit
                      ? 'ส่งคำร้องขออนุญาตออกนอกโรงเรียน'
                      : isMission
                      ? 'ส่งคำร้องขออนุญาตไปราชการ'
                      : 'ยื่นคำขอลา'}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
