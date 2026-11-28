'use client';

/**
 * ============================================================================
 * ManStat: Official Thai OBEC Curriculum Structure A4 Portrait Print View
 * ============================================================================
 * Phase 12.1:
 * - @page { size: A4 portrait; margin: 12mm; }
 * - Primary (ป.1–ป.6): 1-column annual table (พื้นฐาน 840 + เพิ่มเติม 160 + กิจกรรม 120 = 1,120 ชม./ปี)
 * - Lower Secondary (ม.1–ม.3): Side-by-side 2-column Semester 1 & Semester 2 table
 *   (พื้นฐาน 11.0 นก./440 ชม. + เพิ่มเติม 2.5 นก./100 ชม. + กิจกรรม 60 ชม. = 600 ชม./ภาคเรียน)
 * ============================================================================
 */

import React, { useMemo } from 'react';
import { Printer, X } from 'lucide-react';
import type { SchoolSubject } from '@/lib/data/timetableTypes';
import {
  DEFAULT_CURRICULUM_VERSION,
  buildDefaultObecCurriculumPresets,
} from '@/lib/regulations/school-curriculum-presets';

export interface CurriculumPrintViewProps {
  grade: string; // 'ป.1'..'ป.6' or 'ม.1'..'ม.3'
  subjects: readonly SchoolSubject[];
  onClose: () => void;
}

const GRADE_FULL_TITLES: Readonly<Record<string, string>> = {
  'ป.1': 'ชั้นประถมศึกษาปีที่ 1',
  'ป.2': 'ชั้นประถมศึกษาปีที่ 2',
  'ป.3': 'ชั้นประถมศึกษาปีที่ 3',
  'ป.4': 'ชั้นประถมศึกษาปีที่ 4',
  'ป.5': 'ชั้นประถมศึกษาปีที่ 5',
  'ป.6': 'ชั้นประถมศึกษาปีที่ 6',
  'ม.1': 'ชั้นมัธยมศึกษาปีที่ 1',
  'ม.2': 'ชั้นมัธยมศึกษาปีที่ 2',
  'ม.3': 'ชั้นมัธยมศึกษาปีที่ 3',
};

export const CurriculumPrintView: React.FC<CurriculumPrintViewProps> = ({
  grade,
  subjects,
  onClose,
}) => {
  const isSecondary = grade.startsWith('ม.');
  const gradeTitle = GRADE_FULL_TITLES[grade] || `ระดับชั้น ${grade}`;

  const effectiveSubjects = useMemo(() => {
    const activeForGrade = subjects.filter((s) => s.isActive && s.gradeLevels.includes(grade));
    if (activeForGrade.length > 0) return activeForGrade;
    return buildDefaultObecCurriculumPresets().filter((s) => s.gradeLevels.includes(grade));
  }, [subjects, grade]);

  // Primary groupings
  const primaryCore = useMemo(
    () => effectiveSubjects.filter((s) => s.subjectType === 'พื้นฐาน'),
    [effectiveSubjects]
  );
  const primaryExtra = useMemo(
    () => effectiveSubjects.filter((s) => s.subjectType === 'เพิ่มเติม'),
    [effectiveSubjects]
  );
  const primaryCoreTotal = useMemo(
    () => primaryCore.reduce((sum, s) => sum + (s.hoursPerYear || Math.round(s.defaultHoursPerWeek * 40)), 0),
    [primaryCore]
  );
  const primaryExtraTotal = useMemo(
    () => primaryExtra.reduce((sum, s) => sum + (s.hoursPerYear || Math.round(s.defaultHoursPerWeek * 40)), 0),
    [primaryExtra]
  );

  // Secondary Semester 1 & Semester 2 groupings
  const secSem1Core = useMemo(
    () => effectiveSubjects.filter((s) => s.subjectType === 'พื้นฐาน' && s.semesterScope === '1'),
    [effectiveSubjects]
  );
  const secSem2Core = useMemo(
    () => effectiveSubjects.filter((s) => s.subjectType === 'พื้นฐาน' && s.semesterScope === '2'),
    [effectiveSubjects]
  );
  const secSem1Extra = useMemo(
    () => effectiveSubjects.filter((s) => s.subjectType === 'เพิ่มเติม' && s.semesterScope === '1'),
    [effectiveSubjects]
  );
  const secSem2Extra = useMemo(
    () => effectiveSubjects.filter((s) => s.subjectType === 'เพิ่มเติม' && s.semesterScope === '2'),
    [effectiveSubjects]
  );

  const sumCredits = (list: readonly SchoolSubject[]) =>
    Math.round(list.reduce((s, i) => s + (Number(i.credits) || 0), 0) * 10) / 10;
  const sumTermHours = (list: readonly SchoolSubject[]) =>
    list.reduce((s, i) => s + Math.round((Number(i.defaultHoursPerWeek) || 0) * 20), 0);

  const secSem1CoreCr = sumCredits(secSem1Core);
  const secSem2CoreCr = sumCredits(secSem2Core);
  const secSem1CoreHrs = sumTermHours(secSem1Core);
  const secSem2CoreHrs = sumTermHours(secSem2Core);

  const secSem1ExtraCr = sumCredits(secSem1Extra);
  const secSem2ExtraCr = sumCredits(secSem2Extra);
  const secSem1ExtraHrs = sumTermHours(secSem1Extra);
  const secSem2ExtraHrs = sumTermHours(secSem2Extra);

  const maxCoreRows = Math.max(secSem1Core.length, secSem2Core.length);
  const maxExtraRows = Math.max(secSem1Extra.length, secSem2Extra.length);

  return (
    <div className="fixed inset-0 z-[90] bg-slate-900/80 overflow-y-auto print:static print:bg-white print:overflow-visible">
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 12mm; }
          body * { visibility: hidden; }
          #curriculum-print-root, #curriculum-print-root * { visibility: visible; }
          #curriculum-print-root { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>

      {/* Non-printable preview toolbar */}
      <div className="sticky top-0 z-10 bg-slate-900 text-white px-5 py-3 flex items-center justify-between gap-3 border-b border-slate-700 print:hidden">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Printer className="w-4 h-4 text-sky-400 shrink-0" />
          <span>ตัวอย่างก่อนพิมพ์โครงสร้างหลักสูตร ({gradeTitle} — A4 แนวตั้ง)</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 shrink-0" />
            <span>สั่งพิมพ์ / บันทึก PDF</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer"
          >
            <X className="w-3.5 h-3.5 shrink-0" />
            <span>ปิด</span>
          </button>
        </div>
      </div>

      {/* Printable A4 Portrait Sheet */}
      <div
        id="curriculum-print-root"
        className="max-w-[794px] mx-auto my-6 print:my-0 print:max-w-none bg-white text-black p-8 print:p-0 shadow-2xl print:shadow-none"
      >
        <header className="text-center mb-4 space-y-0.5">
          <h1 className="text-base font-bold">
            โครงสร้างหลักสูตรสถานศึกษา โรงเรียนชุมชนบ้านตะขบ
          </h1>
          <p className="text-xs font-semibold">
            {gradeTitle} · {DEFAULT_CURRICULUM_VERSION}
          </p>
        </header>

        {!isSecondary ? (
          <table className="w-full border-collapse border border-black text-xs">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-black px-2 py-1.5 w-24 text-center">รหัสวิชา</th>
                <th className="border border-black px-2.5 py-1.5 text-left">รายวิชา / กิจกรรม</th>
                <th className="border border-black px-2 py-1.5 w-28 text-center">เวลาเรียน (ชม./ปี)</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-slate-50 font-bold">
                <td colSpan={3} className="border border-black px-2.5 py-1.5">
                  รายวิชาพื้นฐาน
                </td>
              </tr>
              {primaryCore.map((item) => (
                <tr key={item.id}>
                  <td className="border border-black px-2 py-1 text-center font-mono">
                    {item.subjectCode || '-'}
                  </td>
                  <td className="border border-black px-2.5 py-1">
                    <span>{item.subjectName}</span>
                    {item.assessmentRatio && (
                      <span className="ml-1.5 font-mono text-[10px] text-slate-700">
                        [{item.assessmentRatio}]
                      </span>
                    )}
                    {item.courseDescription && (
                      <div className="text-[10px] text-slate-700 mt-0.5 leading-snug">
                        {item.courseDescription}
                      </div>
                    )}
                  </td>
                  <td className="border border-black px-2 py-1 text-center font-mono">
                    {item.hoursPerYear || Math.round(item.defaultHoursPerWeek * 40)}
                  </td>
                </tr>
              ))}
              <tr className="font-bold bg-slate-50">
                <td colSpan={2} className="border border-black px-2.5 py-1 text-right">
                  รวมเวลาเรียนพื้นฐาน
                </td>
                <td className="border border-black px-2 py-1 text-center font-mono">
                  {primaryCoreTotal}
                </td>
              </tr>

              <tr className="bg-slate-50 font-bold">
                <td colSpan={3} className="border border-black px-2.5 py-1.5">
                  รายวิชาเพิ่มเติม
                </td>
              </tr>
              {primaryExtra.map((item) => (
                <tr key={item.id}>
                  <td className="border border-black px-2 py-1 text-center font-mono">
                    {item.subjectCode || '-'}
                  </td>
                  <td className="border border-black px-2.5 py-1">
                    <span>{item.subjectName}</span>
                    {item.assessmentRatio && (
                      <span className="ml-1.5 font-mono text-[10px] text-slate-700">
                        [{item.assessmentRatio}]
                      </span>
                    )}
                    {item.courseDescription && (
                      <div className="text-[10px] text-slate-700 mt-0.5 leading-snug">
                        {item.courseDescription}
                      </div>
                    )}
                  </td>
                  <td className="border border-black px-2 py-1 text-center font-mono">
                    {item.hoursPerYear || Math.round(item.defaultHoursPerWeek * 40)}
                  </td>
                </tr>
              ))}
              <tr className="font-bold bg-slate-50">
                <td colSpan={2} className="border border-black px-2.5 py-1 text-right">
                  รวมเวลาเรียนเพิ่มเติม
                </td>
                <td className="border border-black px-2 py-1 text-center font-mono">
                  {primaryExtraTotal}
                </td>
              </tr>

              <tr className="bg-slate-50 font-bold">
                <td colSpan={3} className="border border-black px-2.5 py-1.5">
                  กิจกรรมพัฒนาผู้เรียน
                </td>
              </tr>
              <tr>
                <td className="border border-black px-2 py-1 text-center">-</td>
                <td className="border border-black px-2.5 py-1">กิจกรรมแนะแนว</td>
                <td className="border border-black px-2 py-1 text-center font-mono">40</td>
              </tr>
              <tr>
                <td className="border border-black px-2 py-1 text-center">-</td>
                <td className="border border-black px-2.5 py-1">กิจกรรมลูกเสือ/เนตรนารี</td>
                <td className="border border-black px-2 py-1 text-center font-mono">30</td>
              </tr>
              <tr>
                <td className="border border-black px-2 py-1 text-center">-</td>
                <td className="border border-black px-2.5 py-1">กิจกรรมชมรม/ชุมนุม</td>
                <td className="border border-black px-2 py-1 text-center font-mono">40</td>
              </tr>
              <tr>
                <td className="border border-black px-2 py-1 text-center">-</td>
                <td className="border border-black px-2.5 py-1">
                  กิจกรรมเพื่อสังคมและสาธารณประโยชน์ *
                </td>
                <td className="border border-black px-2 py-1 text-center font-mono">10</td>
              </tr>
              <tr className="font-bold bg-slate-50">
                <td colSpan={2} className="border border-black px-2.5 py-1 text-right">
                  รวมเวลากิจกรรมพัฒนาผู้เรียน
                </td>
                <td className="border border-black px-2 py-1 text-center font-mono">120</td>
              </tr>

              <tr className="font-bold bg-slate-100">
                <td colSpan={2} className="border border-black px-2.5 py-1.5 text-right">
                  รวมเวลาเรียนทั้งสิ้น (ชม./ปี)
                </td>
                <td className="border border-black px-2 py-1.5 text-center font-mono">
                  {(primaryCoreTotal + primaryExtraTotal + 120).toLocaleString('en-US')}
                </td>
              </tr>
            </tbody>
          </table>
        ) : (
          <table className="w-full border-collapse border border-black text-[11px]">
            <thead>
              <tr className="bg-slate-100">
                <th colSpan={3} className="border border-black px-2 py-1.5 text-center">
                  ภาคเรียนที่ 1
                </th>
                <th colSpan={3} className="border border-black px-2 py-1.5 text-center">
                  ภาคเรียนที่ 2
                </th>
              </tr>
              <tr className="bg-slate-50">
                <th className="border border-black px-1.5 py-1 w-16 text-center">รหัสวิชา</th>
                <th className="border border-black px-2 py-1 text-left">รายวิชา / กิจกรรม</th>
                <th className="border border-black px-1.5 py-1 w-16 text-center">นก. (ชม.)</th>
                <th className="border border-black px-1.5 py-1 w-16 text-center">รหัสวิชา</th>
                <th className="border border-black px-2 py-1 text-left">รายวิชา / กิจกรรม</th>
                <th className="border border-black px-1.5 py-1 w-16 text-center">นก. (ชม.)</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-slate-50 font-bold">
                <td colSpan={3} className="border border-black px-2 py-1">
                  รายวิชาพื้นฐาน
                </td>
                <td colSpan={3} className="border border-black px-2 py-1">
                  รายวิชาพื้นฐาน
                </td>
              </tr>
              {Array.from({ length: maxCoreRows }).map((_, idx) => {
                const s1 = secSem1Core[idx];
                const s2 = secSem2Core[idx];
                return (
                  <tr key={`core-${idx}`}>
                    <td className="border border-black px-1.5 py-1 text-center font-mono">
                      {s1?.subjectCode || ''}
                    </td>
                    <td className="border border-black px-2 py-1">{s1?.subjectName || ''}</td>
                    <td className="border border-black px-1.5 py-1 text-center font-mono">
                      {s1 ? `${s1.credits.toFixed(1)} (${Math.round(s1.defaultHoursPerWeek * 20)})` : ''}
                    </td>
                    <td className="border border-black px-1.5 py-1 text-center font-mono">
                      {s2?.subjectCode || ''}
                    </td>
                    <td className="border border-black px-2 py-1">{s2?.subjectName || ''}</td>
                    <td className="border border-black px-1.5 py-1 text-center font-mono">
                      {s2 ? `${s2.credits.toFixed(1)} (${Math.round(s2.defaultHoursPerWeek * 20)})` : ''}
                    </td>
                  </tr>
                );
              })}
              <tr className="font-bold bg-slate-50">
                <td colSpan={2} className="border border-black px-2 py-1 text-right">
                  รวมรายวิชาพื้นฐาน
                </td>
                <td className="border border-black px-1.5 py-1 text-center font-mono">
                  {secSem1CoreCr.toFixed(1)} ({secSem1CoreHrs})
                </td>
                <td colSpan={2} className="border border-black px-2 py-1 text-right">
                  รวมรายวิชาพื้นฐาน
                </td>
                <td className="border border-black px-1.5 py-1 text-center font-mono">
                  {secSem2CoreCr.toFixed(1)} ({secSem2CoreHrs})
                </td>
              </tr>

              <tr className="bg-slate-50 font-bold">
                <td colSpan={3} className="border border-black px-2 py-1">
                  รายวิชาเพิ่มเติม
                </td>
                <td colSpan={3} className="border border-black px-2 py-1">
                  รายวิชาเพิ่มเติม
                </td>
              </tr>
              {Array.from({ length: maxExtraRows }).map((_, idx) => {
                const s1 = secSem1Extra[idx];
                const s2 = secSem2Extra[idx];
                return (
                  <tr key={`extra-${idx}`}>
                    <td className="border border-black px-1.5 py-1 text-center font-mono">
                      {s1?.subjectCode || ''}
                    </td>
                    <td className="border border-black px-2 py-1">{s1?.subjectName || ''}</td>
                    <td className="border border-black px-1.5 py-1 text-center font-mono">
                      {s1 ? `${s1.credits.toFixed(1)} (${Math.round(s1.defaultHoursPerWeek * 20)})` : ''}
                    </td>
                    <td className="border border-black px-1.5 py-1 text-center font-mono">
                      {s2?.subjectCode || ''}
                    </td>
                    <td className="border border-black px-2 py-1">{s2?.subjectName || ''}</td>
                    <td className="border border-black px-1.5 py-1 text-center font-mono">
                      {s2 ? `${s2.credits.toFixed(1)} (${Math.round(s2.defaultHoursPerWeek * 20)})` : ''}
                    </td>
                  </tr>
                );
              })}
              <tr className="font-bold bg-slate-50">
                <td colSpan={2} className="border border-black px-2 py-1 text-right">
                  รวมรายวิชาเพิ่มเติม
                </td>
                <td className="border border-black px-1.5 py-1 text-center font-mono">
                  {secSem1ExtraCr.toFixed(1)} ({secSem1ExtraHrs})
                </td>
                <td colSpan={2} className="border border-black px-2 py-1 text-right">
                  รวมรายวิชาเพิ่มเติม
                </td>
                <td className="border border-black px-1.5 py-1 text-center font-mono">
                  {secSem2ExtraCr.toFixed(1)} ({secSem2ExtraHrs})
                </td>
              </tr>

              <tr className="bg-slate-50 font-bold">
                <td colSpan={3} className="border border-black px-2 py-1">
                  กิจกรรมพัฒนาผู้เรียน
                </td>
                <td colSpan={3} className="border border-black px-2 py-1">
                  กิจกรรมพัฒนาผู้เรียน
                </td>
              </tr>
              <tr>
                <td className="border border-black px-1.5 py-1 text-center">-</td>
                <td className="border border-black px-2 py-1">กิจกรรมแนะแนว</td>
                <td className="border border-black px-1.5 py-1 text-center font-mono">20 ชม.</td>
                <td className="border border-black px-1.5 py-1 text-center">-</td>
                <td className="border border-black px-2 py-1">กิจกรรมแนะแนว</td>
                <td className="border border-black px-1.5 py-1 text-center font-mono">20 ชม.</td>
              </tr>
              <tr>
                <td className="border border-black px-1.5 py-1 text-center">-</td>
                <td className="border border-black px-2 py-1">ลูกเสือ/เนตรนารี</td>
                <td className="border border-black px-1.5 py-1 text-center font-mono">12 ชม.</td>
                <td className="border border-black px-1.5 py-1 text-center">-</td>
                <td className="border border-black px-2 py-1">ลูกเสือ/เนตรนารี</td>
                <td className="border border-black px-1.5 py-1 text-center font-mono">13 ชม.</td>
              </tr>
              <tr>
                <td className="border border-black px-1.5 py-1 text-center">-</td>
                <td className="border border-black px-2 py-1">ชมรม/ชุมนุม</td>
                <td className="border border-black px-1.5 py-1 text-center font-mono">20 ชม.</td>
                <td className="border border-black px-1.5 py-1 text-center">-</td>
                <td className="border border-black px-2 py-1">ชมรม/ชุมนุม</td>
                <td className="border border-black px-1.5 py-1 text-center font-mono">20 ชม.</td>
              </tr>
              <tr>
                <td className="border border-black px-1.5 py-1 text-center">-</td>
                <td className="border border-black px-2 py-1">เพื่อสังคมและสาธารณประโยชน์ *</td>
                <td className="border border-black px-1.5 py-1 text-center font-mono">8 ชม.</td>
                <td className="border border-black px-1.5 py-1 text-center">-</td>
                <td className="border border-black px-2 py-1">เพื่อสังคมและสาธารณประโยชน์ *</td>
                <td className="border border-black px-1.5 py-1 text-center font-mono">7 ชม.</td>
              </tr>
              <tr className="font-bold bg-slate-50">
                <td colSpan={2} className="border border-black px-2 py-1 text-right">
                  รวมกิจกรรมพัฒนาผู้เรียน
                </td>
                <td className="border border-black px-1.5 py-1 text-center font-mono">60 ชม.</td>
                <td colSpan={2} className="border border-black px-2 py-1 text-right">
                  รวมกิจกรรมพัฒนาผู้เรียน
                </td>
                <td className="border border-black px-1.5 py-1 text-center font-mono">60 ชม.</td>
              </tr>

              <tr className="font-bold bg-slate-100">
                <td colSpan={2} className="border border-black px-2 py-1.5 text-right">
                  รวมเวลาเรียนทั้งสิ้น
                </td>
                <td className="border border-black px-1.5 py-1.5 text-center font-mono">
                  {(secSem1CoreCr + secSem1ExtraCr).toFixed(1)} ({secSem1CoreHrs + secSem1ExtraHrs + 60})
                </td>
                <td colSpan={2} className="border border-black px-2 py-1.5 text-right">
                  รวมเวลาเรียนทั้งสิ้น
                </td>
                <td className="border border-black px-1.5 py-1.5 text-center font-mono">
                  {(secSem2CoreCr + secSem2ExtraCr).toFixed(1)} ({secSem2CoreHrs + secSem2ExtraHrs + 60})
                </td>
              </tr>
            </tbody>
          </table>
        )}

        <footer className="mt-4 space-y-5">
          <p className="text-[11px] leading-relaxed">
            <strong>* หมายเหตุ:</strong> กิจกรรมเพื่อสังคมและสาธารณประโยชน์จัดชั่วโมงบูรณาการไว้ในกิจกรรมลูกเสือ/เนตรนารี
          </p>
          <div className="flex justify-end pr-6 pt-2 text-xs text-center">
            <div className="space-y-1">
              <div>ลงชื่อ.......................................................................</div>
              <div>(.......................................................................)</div>
              <div>ผู้อำนวยการสถานศึกษา โรงเรียนชุมชนบ้านตะขบ</div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};
