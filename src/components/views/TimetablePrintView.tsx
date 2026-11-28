'use client';

/**
 * ============================================================================
 * ManStat: Landscape A4 Print View for Timetables (Phase 9.3)
 * ============================================================================
 * Clean, high-contrast black/gray print sheet on white paper (@page A4 landscape).
 * Supports:
 * - 'room_single'  : Single Room Timetable (ป.1–ม.3)
 * - 'room_all'     : All Rooms ป.1–ม.3 (with CSS break-after: page)
 * - 'teacher'      : Individual Teacher Timetable with total periods & weekly hours
 * - 'kindergarten' : Kindergarten Experience Schedule (อ.1–อ.3)
 * ============================================================================
 */

import React from 'react';
import { Printer, X } from 'lucide-react';
import type {
  KindergartenSchedule,
  PeriodConfigItem,
  SchoolSubject,
  TimetableSemester,
  TimetableSettings,
  TimetableSlot,
} from '@/lib/data/timetableTypes';
import { resolveSubjectCodeForDisplay } from '@/lib/regulations/school-curriculum-presets';
import {
  DAYS_OF_WEEK,
  DEFAULT_FOOTER_NOTE,
  DEFAULT_KINDERGARTEN_ACTIVITIES,
  DEFAULT_LUNCH_CONFIG,
  LUNCH_BREAK_LABEL,
  STANDARD_ROOMS,
  type TeacherWeeklyLoadSummary,
} from '@/lib/regulations/timetable-utils';

export type TimetablePrintMode = 'room_single' | 'room_all' | 'teacher' | 'kindergarten';

export interface TimetablePrintViewProps {
  mode: TimetablePrintMode;
  academicYear: string;
  semester: TimetableSemester;
  settings: TimetableSettings;
  periodsConfig: readonly PeriodConfigItem[];
  slots: readonly TimetableSlot[];
  kindergartenSchedules: readonly KindergartenSchedule[];
  selectedRoom: string;
  selectedTeacherId: string;
  selectedKindergartenRoom: string;
  teacherLoad?: TeacherWeeklyLoadSummary;
  getCleanName: (id?: string) => string;
  showSubjectCode?: boolean;
  schoolSubjects?: readonly SchoolSubject[];
  onClose: () => void;
}

export const TimetablePrintView: React.FC<TimetablePrintViewProps> = ({
  mode,
  academicYear,
  semester,
  settings,
  periodsConfig,
  slots,
  kindergartenSchedules,
  selectedRoom,
  selectedTeacherId,
  selectedKindergartenRoom,
  teacherLoad,
  getCleanName,
  showSubjectCode = true,
  schoolSubjects,
  onClose,
}) => {
  const getDisplayCode = (slot: TimetableSlot): string => {
    if (!showSubjectCode) return '';
    return resolveSubjectCodeForDisplay({
      subjectCode: slot.subjectCode,
      subjectName: slot.subjectName,
      roomName: slot.roomName,
      semester,
      catalogSubjects: schoolSubjects,
    });
  };
  const lunchCfg = settings.lunchConfig || DEFAULT_LUNCH_CONFIG;
  const lunchAfter = Math.max(2, Math.min(4, Number(lunchCfg.afterPeriod) || 3));
  const lunchTimeText = `${lunchCfg.startTime || '11.30'} - ${lunchCfg.endTime || '12.30'}`;
  const morningPeriods = periodsConfig.filter((p) => p.periodNo <= lunchAfter);
  const afternoonPeriods = periodsConfig.filter((p) => p.periodNo > lunchAfter);
  const footerNote = settings.footerNote || DEFAULT_FOOTER_NOTE;

  const roomsToPrint = mode === 'room_all' ? [...STANDARD_ROOMS] : [selectedRoom];

  const renderRoomSheet = (room: string, addPageBreak: boolean) => {
    const slotMap = new Map<string, TimetableSlot>();
    for (const s of slots) {
      if (s.roomName === room) slotMap.set(`${s.dayOfWeek}-${s.periodNo}`, s);
    }

    return (
      <section
        key={room}
        className={`bg-white text-black p-6 print:p-0 ${addPageBreak ? 'break-after-page mb-8 print:mb-0' : ''}`}
      >
        <header className="text-center mb-3">
          <h1 className="text-base font-bold">
            ตารางเรียน ชั้นประถมศึกษา / มัธยมศึกษา ({room})
          </h1>
          <p className="text-xs font-medium mt-0.5">
            โรงเรียนชุมชนบ้านตะขบ · ภาคเรียนที่ {semester} ปีการศึกษา {academicYear}
          </p>
        </header>

        <table className="w-full border-collapse border border-black text-[11px]">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-black px-2 py-1.5 w-20 text-center">วัน / ชั่วโมง</th>
              {morningPeriods.map((p) => (
                <th key={p.periodNo} className="border border-black px-1.5 py-1 text-center">
                  <div className="font-bold">{p.label}</div>
                  <div className="text-[10px] font-mono">
                    {p.startTime}-{p.endTime}
                  </div>
                </th>
              ))}
              <th aria-label="พักกลางวัน" className="border border-black px-1 py-1 w-8 bg-slate-50" />
              {afternoonPeriods.map((p) => (
                <th key={p.periodNo} className="border border-black px-1.5 py-1 text-center">
                  <div className="font-bold">{p.label}</div>
                  <div className="text-[10px] font-mono">
                    {p.startTime}-{p.endTime}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DAYS_OF_WEEK.map((day, dIdx) => (
              <tr key={day.dayOfWeek}>
                <th className="border border-black px-2 py-2 text-center font-bold bg-slate-50">
                  {day.fullLabel}
                </th>
                {morningPeriods.map((p) => {
                  const slot = slotMap.get(`${day.dayOfWeek}-${p.periodNo}`);
                  return (
                    <td key={p.periodNo} className="border border-black px-1.5 py-1.5 text-center align-middle h-14">
                      {slot ? (
                        <div>
                          {getDisplayCode(slot) && (
                            <div className="text-[9px] font-mono text-slate-700 leading-none mb-0.5">
                              {getDisplayCode(slot)}
                            </div>
                          )}
                          <div className="font-bold leading-tight">{slot.subjectName}</div>
                          <div className="text-[10px] mt-0.5">{getCleanName(slot.teacherId)}</div>
                          {slot.coTeacherId && (
                            <div className="text-[9px] text-slate-700">
                              ร่วม: {getCleanName(slot.coTeacherId)}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                  );
                })}
                {dIdx === 0 && (
                  <td rowSpan={5} className="border border-black text-center align-middle bg-slate-50">
                    <div className="[writing-mode:vertical-rl] rotate-180 mx-auto text-[10px] font-bold">
                      {LUNCH_BREAK_LABEL} {lunchTimeText}
                    </div>
                  </td>
                )}
                {afternoonPeriods.map((p) => {
                  const slot = slotMap.get(`${day.dayOfWeek}-${p.periodNo}`);
                  return (
                    <td key={p.periodNo} className="border border-black px-1.5 py-1.5 text-center align-middle h-14">
                      {slot ? (
                        <div>
                          {getDisplayCode(slot) && (
                            <div className="text-[9px] font-mono text-slate-700 leading-none mb-0.5">
                              {getDisplayCode(slot)}
                            </div>
                          )}
                          <div className="font-bold leading-tight">{slot.subjectName}</div>
                          <div className="text-[10px] mt-0.5">{getCleanName(slot.teacherId)}</div>
                          {slot.coTeacherId && (
                            <div className="text-[9px] text-slate-700">
                              ร่วม: {getCleanName(slot.coTeacherId)}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        <footer className="mt-3 space-y-4">
          <p className="text-[10px] leading-relaxed border border-slate-400 px-2.5 py-1.5 rounded">
            <strong>หมายเหตุ:</strong> {footerNote}
          </p>
          <div className="flex justify-end pr-8 pt-2 text-[11px] text-center">
            <div className="space-y-1">
              <div>ลงชื่อ.......................................................................</div>
              <div>(.......................................................................)</div>
              <div>ผู้อำนวยการสถานศึกษา โรงเรียนชุมชนบ้านตะขบ</div>
            </div>
          </div>
        </footer>
      </section>
    );
  };

  const renderTeacherSheet = () => {
    const slotMap = new Map<string, TimetableSlot[]>();
    for (const s of slots) {
      if (s.teacherId === selectedTeacherId || s.coTeacherId === selectedTeacherId) {
        const key = `${s.dayOfWeek}-${s.periodNo}`;
        const arr = slotMap.get(key) || [];
        arr.push(s);
        slotMap.set(key, arr);
      }
    }

    return (
      <section className="bg-white text-black p-6 print:p-0">
        <header className="text-center mb-3">
          <h1 className="text-base font-bold">ตารางสอนรายบุคคล — {getCleanName(selectedTeacherId)}</h1>
          <p className="text-xs font-medium mt-0.5">
            โรงเรียนชุมชนบ้านตะขบ · ภาคเรียนที่ {semester} ปีการศึกษา {academicYear}
            {teacherLoad
              ? ` · สอน ${teacherLoad.teachingHoursExclHomeroom} ชม./สัปดาห์${
                  teacherLoad.homeroomHours > 0
                    ? ` · พบครูประจำชั้น ${teacherLoad.homeroomHours} ชม.`
                    : ''
                }`
              : ''}
          </p>
        </header>

        <table className="w-full border-collapse border border-black text-[11px]">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-black px-2 py-1.5 w-20 text-center">วัน / ชั่วโมง</th>
              {morningPeriods.map((p) => (
                <th key={p.periodNo} className="border border-black px-1.5 py-1 text-center">
                  <div className="font-bold">{p.label}</div>
                  <div className="text-[10px] font-mono">
                    {p.startTime}-{p.endTime}
                  </div>
                </th>
              ))}
              <th aria-label="พักกลางวัน" className="border border-black px-1 py-1 w-8 bg-slate-50" />
              {afternoonPeriods.map((p) => (
                <th key={p.periodNo} className="border border-black px-1.5 py-1 text-center">
                  <div className="font-bold">{p.label}</div>
                  <div className="text-[10px] font-mono">
                    {p.startTime}-{p.endTime}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DAYS_OF_WEEK.map((day, dIdx) => (
              <tr key={day.dayOfWeek}>
                <th className="border border-black px-2 py-2 text-center font-bold bg-slate-50">
                  {day.fullLabel}
                </th>
                {morningPeriods.map((p) => {
                  const list = slotMap.get(`${day.dayOfWeek}-${p.periodNo}`) || [];
                  return (
                    <td key={p.periodNo} className="border border-black px-1.5 py-1.5 text-center align-middle h-14">
                      {list.length > 0 ? (
                        list.map((s) => {
                          const code = getDisplayCode(s);
                          return (
                            <div key={s.id}>
                              <div className="font-bold">
                                {s.roomName} · {code ? `${code} ` : ''}
                                {s.subjectName}
                              </div>
                              {s.coTeacherId === selectedTeacherId && (
                                <div className="text-[9px]">(ร่วมสอน)</div>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                  );
                })}
                {dIdx === 0 && (
                  <td rowSpan={5} className="border border-black text-center align-middle bg-slate-50">
                    <div className="[writing-mode:vertical-rl] rotate-180 mx-auto text-[10px] font-bold">
                      {LUNCH_BREAK_LABEL} {lunchTimeText}
                    </div>
                  </td>
                )}
                {afternoonPeriods.map((p) => {
                  const list = slotMap.get(`${day.dayOfWeek}-${p.periodNo}`) || [];
                  return (
                    <td key={p.periodNo} className="border border-black px-1.5 py-1.5 text-center align-middle h-14">
                      {list.length > 0 ? (
                        list.map((s) => {
                          const code = getDisplayCode(s);
                          return (
                            <div key={s.id}>
                              <div className="font-bold">
                                {s.roomName} · {code ? `${code} ` : ''}
                                {s.subjectName}
                              </div>
                              {s.coTeacherId === selectedTeacherId && (
                                <div className="text-[9px]">(ร่วมสอน)</div>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        <footer className="mt-3 space-y-4">
          <p className="text-[10px] leading-relaxed border border-slate-400 px-2.5 py-1.5 rounded">
            <strong>หมายเหตุ:</strong> {footerNote}
          </p>
          <div className="flex justify-end pr-8 pt-2 text-[11px] text-center">
            <div className="space-y-1">
              <div>ลงชื่อ.......................................................................</div>
              <div>(.......................................................................)</div>
              <div>ผู้อำนวยการสถานศึกษา โรงเรียนชุมชนบ้านตะขบ</div>
            </div>
          </div>
        </footer>
      </section>
    );
  };

  const renderKindergartenSheet = () => {
    const kg = kindergartenSchedules.find((k) => k.roomName === selectedKindergartenRoom);
    const activities =
      kg && kg.activitiesJson.length > 0
        ? kg.activitiesJson
        : DEFAULT_KINDERGARTEN_ACTIVITIES;

    return (
      <section className="bg-white text-black p-6 print:p-0">
        <header className="text-center mb-3">
          <h1 className="text-base font-bold">
            ตารางกิจกรรมประจำวัน ระดับปฐมวัย ({selectedKindergartenRoom})
          </h1>
          <p className="text-xs font-medium mt-0.5">
            โรงเรียนชุมชนบ้านตะขบ · ภาคเรียนที่ {semester} ปีการศึกษา {academicYear}
            {kg
              ? ` · ครูประจำชั้น: ${getCleanName(kg.homeroomTeacherId)}${
                  kg.assistantTeacherId ? ` · ผู้ช่วย: ${getCleanName(kg.assistantTeacherId)}` : ''
                } · ${kg.weeklyHours} ชม./สัปดาห์`
              : ''}
          </p>
        </header>

        <table className="w-full border-collapse border border-black text-xs">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-black px-3 py-2 w-36 text-center">เวลา</th>
              <th className="border border-black px-3 py-2 text-left">กิจกรรมหลักประจำวัน (จันทร์ – ศุกร์)</th>
              <th className="border border-black px-3 py-2 text-left">รายละเอียด / ขอบข่ายการจัดประสบการณ์</th>
            </tr>
          </thead>
          <tbody>
            {activities.map((act, idx) => (
              <tr key={idx} className={act.isBreak ? 'bg-slate-50 font-semibold' : ''}>
                <td className="border border-black px-3 py-2 text-center font-mono">{act.timeRange}</td>
                <td className="border border-black px-3 py-2 font-semibold">{act.activityName}</td>
                <td className="border border-black px-3 py-2">{act.note || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <footer className="mt-4 flex justify-end pr-8 pt-2 text-[11px] text-center">
          <div className="space-y-1">
            <div>ลงชื่อ.......................................................................</div>
            <div>(.......................................................................)</div>
            <div>ผู้อำนวยการสถานศึกษา โรงเรียนชุมชนบ้านตะขบ</div>
          </div>
        </footer>
      </section>
    );
  };

  return (
    <div className="fixed inset-0 z-[80] bg-slate-900/80 overflow-y-auto print:static print:bg-white print:overflow-visible">
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 10mm; }
          body * { visibility: hidden; }
          #timetable-print-root, #timetable-print-root * { visibility: visible; }
          #timetable-print-root { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>

      {/* Non-printable preview toolbar */}
      <div className="sticky top-0 z-10 bg-slate-900 text-white px-5 py-3 flex items-center justify-between gap-3 border-b border-slate-700 print:hidden">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Printer className="w-4 h-4 text-sky-400 shrink-0" />
          <span>ตัวอย่างก่อนพิมพ์ (กระดาษ A4 แนวนอน)</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 shrink-0" />
            <span>สั่งพิมพ์ / บันทึก PDF</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer"
          >
            <X className="w-3.5 h-3.5 shrink-0" />
            <span>ปิด</span>
          </button>
        </div>
      </div>

      {/* Printable sheet container */}
      <div id="timetable-print-root" className="max-w-[1120px] mx-auto my-6 print:my-0 print:max-w-none shadow-2xl print:shadow-none">
        {(mode === 'room_single' || mode === 'room_all') &&
          roomsToPrint.map((room, i) => renderRoomSheet(room, i < roomsToPrint.length - 1))}
        {mode === 'teacher' && renderTeacherSheet()}
        {mode === 'kindergarten' && renderKindergartenSheet()}
      </div>
    </div>
  );
};
