'use client';

/**
 * ============================================================================
 * ManStat-Modern: ViewRetroLeave (บันทึกการลาย้อนหลังตามระเบียบราชการ)
 * ============================================================================
 * - Form for HR Admins to record retroactive leave for personnel
 * - Validation for valid reasons (medical emergencies, unexpected incidents)
 * - Supports half-day calculation (0.5 day)
 * - Reference to medical certificate or official order
 * - Zero Emojis, Pure Lucide SVG Icons, 8px Standard Spacing
 * ============================================================================
 */

import React, { useState } from 'react';
import {
  RotateCcw,
  Calendar,
  User,
  AlertTriangle,
  Save,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import { INITIAL_TEACHERS } from '@/lib/data/schoolData';

export function ViewRetroLeave() {
  const [selectedTeacherId, setSelectedTeacherId] = useState(INITIAL_TEACHERS[0].id);
  const [leaveType, setLeaveType] = useState<'sick' | 'personal'>('sick');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [totalDays, setTotalDays] = useState('1');
  const [reason, setReason] = useState('');
  const [retroReason, setRetroReason] = useState('');
  const [medicalCertNo, setMedicalCertNo] = useState('');
  const [substituteTeacher, setSubstituteTeacher] = useState(INITIAL_TEACHERS[1].name);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const selectedTeacher = INITIAL_TEACHERS.find((t) => t.id === selectedTeacherId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !reason || !retroReason) {
      alert('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน');
      return;
    }

    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
      // Reset form
      setReason('');
      setRetroReason('');
      setMedicalCertNo('');
      alert('บันทึกคำร้องขอลาย้อนหลังเข้าสู่ระบบเรียบร้อยแล้ว');
    }, 1500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#141b24] p-5 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-2 text-sky-400 text-xs font-semibold uppercase tracking-wider">
          <RotateCcw className="w-4 h-4 shrink-0" />
          <span>Retroactive Leave Logging</span>
        </div>
        <h2 className="text-xl font-bold text-white mt-1">บันทึกการลาย้อนหลัง</h2>
        <p className="text-xs text-slate-400 mt-1">
          ระบบบันทึกคำร้องขอลาย้อนหลังกรณีฉุกเฉิน เจ็บป่วยกะทันหัน หรือมีเหตุจำเป็นอันมิอาจก้าวล่วงได้ตามระเบียบสำนักนายกรัฐมนตรีฯ
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Column */}
        <div className="lg:col-span-2">
          <form
            onSubmit={handleSubmit}
            className="bg-[#111822] p-6 rounded-2xl border border-slate-800 space-y-5"
          >
            {/* Regulatory Notice */}
            <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-200 leading-relaxed">
                <p className="font-bold">ข้อกำหนดตามระเบียบว่าด้วยการลาของข้าราชการ พ.ศ. 2555</p>
                <p className="mt-0.5 text-amber-300/80">
                  การยื่นใบลาย้อนหลังกระทำได้เฉพาะกรณีป่วยฉุกเฉิน หรือมีเหตุจำเป็นยิ่งยวด โดยต้องระบุเหตุผลความจำเป็นในการยื่นล่าช้า และแนบหลักฐานทางการแพทย์หากลาป่วยเกิน 3 วันทำการ
                </p>
              </div>
            </div>

            {/* Teacher Selection (Standard 40px Height) */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                เลือกข้าราชการครู / บุคลากรผู้ขอลา <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 shrink-0" />
                <select
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  className="w-full h-10 bg-[#16202c] border border-slate-700/80 rounded-xl pl-10 pr-3.5 text-xs text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 transition-all cursor-pointer"
                >
                  {INITIAL_TEACHERS.map((t) => (
                    <option key={t.id} value={t.id} className="bg-[#171a21]">
                      {t.name} — {t.position} ({t.department})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Leave Type & Days */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  ประเภทการลา <span className="text-rose-400">*</span>
                </label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value as 'sick' | 'personal')}
                  className="w-full h-10 bg-[#16202c] border border-slate-700/80 rounded-xl px-3 text-xs text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 transition-all cursor-pointer"
                >
                  <option value="sick" className="bg-[#171a21]">ลาป่วย (Sick Leave)</option>
                  <option value="personal" className="bg-[#171a21]">ลากิจส่วนตัว (Personal Leave)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  จำนวนวันลา (วันทำการ)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={totalDays}
                    onChange={(e) => setTotalDays(e.target.value)}
                    className="w-24 h-10 bg-[#16202c] border border-slate-700/80 rounded-xl px-3 text-xs text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 font-mono transition-all"
                  />
                  <label className="inline-flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
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
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  ตั้งแต่วันที่ <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 shrink-0" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full h-10 bg-[#16202c] border border-slate-700/80 rounded-xl pl-10 pr-3.5 text-xs text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  ถึงวันที่ <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 shrink-0" />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full h-10 bg-[#16202c] border border-slate-700/80 rounded-xl pl-10 pr-3.5 text-xs text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                เหตุผลการลา <span className="text-rose-400">*</span>
              </label>
              <textarea
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="ระบุอาการเจ็บป่วย หรือธุระจำเป็น..."
                className="w-full bg-[#16202c] border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* Retroactive Reason */}
            <div>
              <label className="block text-xs font-semibold text-amber-300 mb-1.5">
                เหตุผลความจำเป็นในการยื่นใบลาย้อนหลัง <span className="text-rose-400">*</span>
              </label>
              <textarea
                rows={2}
                value={retroReason}
                onChange={(e) => setRetroReason(e.target.value)}
                placeholder="เช่น เกิดอุบัติเหตุกะทันหันขณะเดินทาง, อาการป่วยรุนแรงต้องเข้ารับการรักษาฉุกเฉินในโรงพยาบาล..."
                className="w-full bg-[#16202c] border border-amber-500/40 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Medical Cert and Substitute */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  เลขที่ใบรับรองแพทย์ / เอกสารแนบ
                </label>
                <input
                  type="text"
                  value={medicalCertNo}
                  onChange={(e) => setMedicalCertNo(e.target.value)}
                  placeholder="เช่น รพ.ปักธงชัย เล่ม 12 เลขที่ 450"
                  className="w-full bg-[#16202c] border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  ผู้ปฏิบัติหน้าที่แทน
                </label>
                <select
                  value={substituteTeacher}
                  onChange={(e) => setSubstituteTeacher(e.target.value)}
                  className="w-full bg-[#16202c] border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-sky-500"
                >
                  {INITIAL_TEACHERS.map((t) => (
                    <option key={t.id} value={t.name}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isSubmitted}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-md shadow-sky-900/30 transition-all disabled:opacity-50"
              >
                {isSubmitted ? (
                  <>
                    <Clock className="w-4 h-4 animate-spin shrink-0" />
                    <span>กำลังบันทึกข้อมูล...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 shrink-0" />
                    <span>บันทึกการลาย้อนหลัง</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right Info Column: Teacher Current Leave Quota */}
        <div className="space-y-4">
          <div className="bg-[#111822] p-5 rounded-2xl border border-slate-800">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
              ข้อมูลสถิติวันลาปัจจุบันของผู้ขอ
            </h3>

            {selectedTeacher && (
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-[#151d28] rounded-xl border border-slate-800">
                  <div className="font-bold text-white text-sm">{selectedTeacher.name}</div>
                  <div className="text-slate-400 text-[11px] mt-0.5">{selectedTeacher.position}</div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-slate-300">
                  <div className="bg-[#151d28] p-2.5 rounded-lg border border-slate-800">
                    <span className="text-slate-500 text-[11px]">ลาป่วยที่ใช้ไป</span>
                    <p className="font-mono font-bold text-rose-400 text-sm mt-0.5">
                      {selectedTeacher.sickUsed} / 60 วัน
                    </p>
                  </div>
                  <div className="bg-[#151d28] p-2.5 rounded-lg border border-slate-800">
                    <span className="text-slate-500 text-[11px]">ลากิจที่ใช้ไป</span>
                    <p className="font-mono font-bold text-amber-400 text-sm mt-0.5">
                      {selectedTeacher.personalUsed} / 45 วัน
                    </p>
                  </div>
                  <div className="bg-[#151d28] p-2.5 rounded-lg border border-slate-800 col-span-2">
                    <span className="text-slate-500 text-[11px]">ลาพักผ่อนสะสม</span>
                    <p className="font-mono font-bold text-emerald-400 text-sm mt-0.5">
                      {selectedTeacher.vacationUsed} / 10 วัน
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-[#111822] p-5 rounded-2xl border border-slate-800 text-xs text-slate-400 space-y-2">
            <div className="flex items-center gap-2 text-sky-400 font-semibold">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>ระบบตรวจสอบสิทธิ</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              การบันทึกย้อนหลังจะถูกนำไปรวมคำนวณในสถิติประจำปีงบประมาณ 2570 โดยอัตโนมัติ และจะแสดงเครื่องหมายหมายเหตุ &apos;บันทึกย้อนหลัง&apos; ในรายงาน สพฐ.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
