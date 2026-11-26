'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Printer,
  X,
  ArrowLeft,
  Loader2,
  FileText,
  AlertCircle,
} from 'lucide-react';
import {
  EVALUATION_TEMPLATES,
  EvaluationTemplateKey,
  EvaluationTemplate,
  COMPONENT_2_CONFIG,
  COMPONENT_3_CONFIG,
} from '@/data/evaluationTemplates';
import {
  calculateEvaluationTotals,
  resolveEvaluationTemplate,
} from '@/lib/evaluationEngine';
import {
  toThaiDigits,
  formatThaiNumber,
  formatThaiCurrency,
  formatThaiDateWithDigits,
  getEvaluationPeriodThaiRange,
} from '@/lib/evaluationPrintUtils';

export interface EvaluationA4PrintDocumentProps {
  staffId: string;
  fiscalYear: number;
  roundNumber: number;
  onClose?: () => void;
  autoPrint?: boolean;
}

export function EvaluationA4PrintDocument({
  staffId,
  fiscalYear,
  roundNumber,
  onClose,
  autoPrint = false,
}: EvaluationA4PrintDocumentProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  // Fetch evaluation and staff info
  const fetchDocData = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMsg(null);
      const res = await fetch(
        `/api/admin/evaluations?staffId=${encodeURIComponent(staffId)}&year=${fiscalYear}&round=${roundNumber}`
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'ไม่สามารถโหลดข้อมูลแบบประเมินได้');
      }
      setData(json.data);
    } catch (err: any) {
      setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูลเอกสาร');
    } finally {
      setIsLoading(false);
    }
  }, [staffId, fiscalYear, roundNumber]);

  useEffect(() => {
    fetchDocData();
  }, [fetchDocData]);

  // Handle autoPrint trigger once data loaded
  useEffect(() => {
    if (!isLoading && data && autoPrint) {
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isLoading, data, autoPrint]);

  // Calculations & Template Setup
  const templateKey = useMemo<EvaluationTemplateKey>(() => {
    if (data?.templateKey && EVALUATION_TEMPLATES[data.templateKey as EvaluationTemplateKey]) {
      return data.templateKey as EvaluationTemplateKey;
    }
    if (data?.teacher) {
      return resolveEvaluationTemplate(
        data.teacher.position,
        data.teacher.academicStanding
      );
    }
    return 'teacher_no_standing';
  }, [data]);

  const template = EVALUATION_TEMPLATES[templateKey];

  const selfScores = data?.selfScores || {};
  const supervisorScores = data?.supervisorScores || {};
  const part1Snapshot = data?.part1Snapshot || {};
  const supervisorComment = data?.supervisorComment || '';
  const status = data?.status || 'draft';

  const totalsSelf = useMemo(() => {
    return calculateEvaluationTotals(templateKey, selfScores);
  }, [templateKey, selfScores]);

  const totalsSupervisor = useMemo(() => {
    return calculateEvaluationTotals(templateKey, supervisorScores);
  }, [templateKey, supervisorScores]);

  const periodRange = useMemo(() => {
    return getEvaluationPeriodThaiRange(roundNumber, fiscalYear);
  }, [roundNumber, fiscalYear]);

  // Is supervisor evaluation finalized? Support 'evaluated', 'acknowledged', and legacy 'completed'
  const selfSignedDate = data?.selfSignedAt || data?.selfEvaluationDate || null;
  const supervisorSignedDate = data?.supervisorSignedAt || data?.supervisorEvaluationDate || null;
  const acknowledgedDateVal = data?.acknowledgedAt || data?.acknowledgedDate || null;
  const isSupervisorDone =
    status === 'evaluated' ||
    status === 'acknowledged' ||
    status === 'completed' ||
    Boolean(supervisorSignedDate);
  const isAcknowledged =
    status === 'acknowledged' ||
    status === 'completed' ||
    Boolean(acknowledgedDateVal);

  // Print trigger
  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-sm text-white">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-400 mb-3" />
        <p className="text-sm font-medium">กำลังจัดเตรียมเอกสาร A4 ตามระเบียบ ก.ค.ศ. ...</p>
      </div>
    );
  }

  if (errorMsg || !template) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 text-white">
        <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl max-w-md w-full text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
          <h3 className="font-bold text-base">ไม่พบข้อมูลแบบประเมิน</h3>
          <p className="text-xs text-slate-300">{errorMsg || 'รูปแบบแบบประเมินไม่ถูกต้อง'}</p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-semibold"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    );
  }

  // Determine Form Type
  const isTeacherAssistant = templateKey === 'teacher_assistant';
  const isDirector = templateKey.startsWith('director_');

  // Breakdown indicators for paged display
  // Form 1 (Teacher Assistant, 14 items): Page 4 has items 1.1-1.5, Page 5 has items 1.6-1.7, 2.1-2.4, 3.1-3.3
  // Forms 2-4 (Teachers, 15 items): Page 4 has items 1.1-1.4, Page 5 has items 1.5-1.8, 2.1-2.4, 3.1-3.2, Page 6 has item 3.3
  // Forms 5-6 (Directors, 15 items): Page 4 has items 1.1-1.2, Page 5 has items 1.3-1.6, 2.1-2.3, Page 6 has items 3.1-3.2, 4.1-4.2, 5.1, Page 7 has item 5.2
  const allPart1Indicators = template.component1.part1.domains.flatMap((d) =>
    d.indicators.map((ind) => ({ ...ind, domainName: d.name, domainNumber: d.domainNumber }))
  );

  let page4Indicators: typeof allPart1Indicators = [];
  let page5Indicators: typeof allPart1Indicators = [];
  let page6Indicators: typeof allPart1Indicators = [];
  let page7Indicators: typeof allPart1Indicators = [];

  if (isTeacherAssistant) {
    page4Indicators = allPart1Indicators.slice(0, 5); // 1.1 - 1.5
    page5Indicators = allPart1Indicators.slice(5);     // 1.6 - 3.3 (9 items)
  } else if (!isDirector) {
    page4Indicators = allPart1Indicators.slice(0, 4); // 1.1 - 1.4
    page5Indicators = allPart1Indicators.slice(4, 14); // 1.5 - 3.2 (10 items)
    page6Indicators = allPart1Indicators.slice(14);    // 3.3 (1 item)
  } else {
    // Director (5 domains, 15 items)
    page4Indicators = allPart1Indicators.slice(0, 2);  // 1.1 - 1.2
    page5Indicators = allPart1Indicators.slice(2, 9);  // 1.3 - 2.3 (7 items)
    page6Indicators = allPart1Indicators.slice(9, 14); // 3.1 - 5.1 (5 items)
    page7Indicators = allPart1Indicators.slice(14);    // 5.2 (1 item)
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-300 dark:bg-slate-900 text-black print:static print:bg-white print:overflow-visible font-['Sarabun',sans-serif]">
      {/* ------------------------------------------------------------------ */}
      {/* Sticky Screen Navigation Bar (Hidden during Print)                 */}
      {/* ------------------------------------------------------------------ */}
      <div className="sticky top-0 z-20 flex items-center justify-between px-6 py-3 bg-slate-900 text-white shadow-md print:hidden">
        <div className="flex items-center gap-3">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="ย้อนกลับ"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-sm font-bold leading-tight">
                {template.title} ({template.officialFormNumber})
              </h2>
              <p className="text-[11px] text-slate-400">
                {part1Snapshot.evaluateeName || '-'} · รอบที่ {roundNumber}/{fiscalYear} ({isTeacherAssistant ? '7 หน้า' : isDirector ? '10 หน้า' : '9 หน้า'})
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-lg shadow-emerald-900/30 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>พิมพ์เอกสาร A4 (Print)</span>
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              title="ปิด"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Print Document Container                                           */}
      {/* ------------------------------------------------------------------ */}
      <div className="py-8 print:py-0 print:m-0 flex flex-col items-center">
        {/* ================================================================ */}
        {/* PAGE 1: ส่วนที่ ๑ ข้อมูลของผู้ขอรับการประเมิน + คำชี้แจง          */}
        {/* ================================================================ */}
        <div className="a4-sheet bg-white text-black w-[210mm] min-h-[297mm] p-[15mm_15mm_15mm_18mm] shadow-xl print:shadow-none mb-8 print:mb-0 print:p-0 page-break-after">
          {/* Header */}
          <div className="text-center font-bold text-[14pt] leading-relaxed mb-4">
            <div>แบบประเมินผลการปฏิบัติงานของข้าราชการครูและบุคลากรทางการศึกษา</div>
            <div>{template.targetPosition} {template.targetStanding ? `วิทยฐานะ${template.targetStanding}` : ''}</div>
            <div className="font-normal text-[13pt]">(ทุกสังกัด)</div>
          </div>

          {/* Section 1 Header */}
          <div className="text-[13pt] font-bold mb-1">
            ส่วนที่ ๑ : ข้อมูลของผู้ขอรับการประเมิน
          </div>

          <div className="space-y-1 text-[12.5pt] leading-normal mb-3">
            <div className="font-bold">รอบการประเมิน</div>
            <div className="flex items-center gap-8 pl-4">
              <div className="flex items-center gap-2">
                <span className="text-[14pt]">{roundNumber === 1 ? '☑' : '☐'}</span>
                <span>ครั้งที่ ๑ ( ๑ ตุลาคม {periodRange.startYearShort} - ๓๑ มีนาคม {periodRange.endYearShort} )</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[14pt]">{roundNumber === 2 ? '☑' : '☐'}</span>
                <span>ครั้งที่ ๒ ( ๑ เมษายน {periodRange.startYearShort} - ๓๐ กันยายน {periodRange.endYearShort} )</span>
              </div>
            </div>

            <div className="pt-1">
              ชื่อผู้รับการประเมิน <span className="font-bold underline decoration-dotted underline-offset-4">{part1Snapshot.evaluateeName || '................................................................................'}</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                ตำแหน่ง <span className="underline decoration-dotted underline-offset-4">{part1Snapshot.position ? toThaiDigits(part1Snapshot.position) : '................................................'}</span>
              </div>
              <div>
                เงินเดือน <span className="font-bold underline decoration-dotted underline-offset-4">{part1Snapshot.currentSalary > 0 ? `${formatThaiCurrency(part1Snapshot.currentSalary)} บาท` : '.................................. บาท'}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                สถานศึกษา <span className="underline decoration-dotted underline-offset-4">{toThaiDigits(part1Snapshot.schoolName || 'โรงเรียนชุมชนบ้านตะขบ')}</span>
              </div>
              <div>
                สังกัด <span className="underline decoration-dotted underline-offset-4">{toThaiDigits(part1Snapshot.affiliation || 'สำนักงานเขตพื้นที่การศึกษาประถมศึกษานครราชสีมา เขต 3')}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                สอนระดับชั้น <span className="underline decoration-dotted underline-offset-4">{part1Snapshot.teachingGrade ? toThaiDigits(part1Snapshot.teachingGrade) : '-'}</span>
              </div>
              <div>
                วิชา <span className="underline decoration-dotted underline-offset-4">{part1Snapshot.teachingSubject ? toThaiDigits(part1Snapshot.teachingSubject) : '-'}</span>
              </div>
            </div>

            <div>
              ชั่วโมงการสอน <span className="font-bold underline decoration-dotted underline-offset-4">{part1Snapshot.teachingHoursPerWeek ? toThaiDigits(part1Snapshot.teachingHoursPerWeek) : '-'}</span> ชั่วโมง/สัปดาห์
            </div>

            <div>
              จำนวนวันลาในรอบการประเมิน <span className="font-bold underline decoration-dotted underline-offset-4">{toThaiDigits(part1Snapshot.leaveStats?.totalDays || 0)}</span> วัน ประกอบด้วย
            </div>

            <div className="grid grid-cols-2 gap-2 pl-4">
              <div>
                ๑) ลาป่วย จำนวน <span className="underline decoration-dotted underline-offset-4">{toThaiDigits(part1Snapshot.leaveStats?.sickCount || 0)}</span> ครั้ง <span className="underline decoration-dotted underline-offset-4">{toThaiDigits(part1Snapshot.leaveStats?.sickDays || 0)}</span> วัน
              </div>
              <div>
                ๒) ลากิจ จำนวน <span className="underline decoration-dotted underline-offset-4">{toThaiDigits(part1Snapshot.leaveStats?.businessCount || 0)}</span> ครั้ง <span className="underline decoration-dotted underline-offset-4">{toThaiDigits(part1Snapshot.leaveStats?.businessDays || 0)}</span> วัน
              </div>
            </div>

            <div className="pl-4">
              ๓) ลาอื่น ๆ (โปรดระบุ) <span className="underline decoration-dotted underline-offset-4">{part1Snapshot.leaveStats?.otherTypes || '-'}</span> จำนวน <span className="underline decoration-dotted underline-offset-4">{toThaiDigits(part1Snapshot.leaveStats?.otherCount || 0)}</span> ครั้ง <span className="underline decoration-dotted underline-offset-4">{toThaiDigits(part1Snapshot.leaveStats?.otherDays || 0)}</span> วัน
            </div>

            <div className="pt-2">
              ชื่อผู้ประเมิน <span className="font-bold underline decoration-dotted underline-offset-4">{part1Snapshot.evaluatorName || '................................................................................'}</span>
            </div>
            <div>
              ตำแหน่ง <span className="underline decoration-dotted underline-offset-4">{part1Snapshot.evaluatorPosition || '................................................................................'}</span>
            </div>
          </div>

          {/* Explanation Box (คำชี้แจง) */}
          <div className="border border-black p-3.5 text-[11pt] leading-relaxed mt-4 rounded-none">
            <div className="font-bold underline mb-1">คำชี้แจง</div>
            <div>แบบสรุปการประเมินผลการปฏิบัติงานนี้มี ๓ หน้า ประกอบด้วย</div>
            <div className="pl-3 space-y-0.5">
              <div><span className="font-bold">ส่วนที่ ๑ :</span> ข้อมูลของผู้รับการประเมิน เพื่อระบุรายละเอียดต่าง ๆ ที่เกี่ยวข้องกับตัวผู้รับการประเมิน</div>
              <div><span className="font-bold">ส่วนที่ ๒ :</span> สรุปผลการประเมิน ใช้เพื่อกรอกค่าคะแนนการประเมินในองค์ประกอบที่ ๑ การประเมินประสิทธิภาพและประสิทธิผลการปฏิบัติงานตามมาตรฐานตำแหน่ง องค์ประกอบที่ ๒ การประเมินการมีส่วนร่วมในการพัฒนาการศึกษา และองค์ประกอบที่ ๓ การประเมินการปฏิบัติตนในการรักษาวินัย คุณธรรม จริยธรรม และจรรยาบรรณวิชาชีพ</div>
              <div className="pl-4 text-[10.5pt]">
                <div>- สำหรับคะแนนองค์ประกอบที่ ๑ ให้นำมาจากแบบประเมินองค์ประกอบที่ ๑ โดยนำคะแนนจาก{template.hasChallengePart ? 'สรุปคะแนนรวมแบบประเมินองค์ประกอบที่ ๑' : 'ระดับความสำเร็จในการพัฒนางานตามมาตรฐานตำแหน่ง'} และให้แนบท้ายแบบสรุปฉบับนี้</div>
                <div>- สำหรับคะแนนองค์ประกอบที่ ๒ ให้นำมาจากแบบประเมินองค์ประกอบที่ ๒ โดยนำคะแนนจากระดับความสำเร็จการมีส่วนร่วมในการพัฒนาการศึกษา และให้แนบท้ายแบบสรุปฉบับนี้</div>
                <div>- สำหรับคะแนนองค์ประกอบที่ ๓ ให้นำมาจากแบบประเมินองค์ประกอบที่ ๓ โดยนำคะแนนจากการประเมินการปฏิบัติตนในการรักษาวินัย คุณธรรม จริยธรรม และจรรยาบรรณวิชาชีพ และให้แนบท้ายแบบสรุปฉบับนี้</div>
              </div>
              <div><span className="font-bold">ส่วนที่ ๓ :</span> ผลการประเมิน ผู้รับการประเมินลงนามรับรองการประเมินตนเอง และผู้บังคับบัญชาประเมินและลงความเห็นของการประเมิน</div>
              <div><span className="font-bold">ส่วนที่ ๔ :</span> การรับทราบผลการประเมิน ผู้บังคับบัญชาแจ้งผลการประเมิน และผู้รับการประเมินลงนามรับทราบผลการประเมิน</div>
            </div>
          </div>
        </div>

        {/* ================================================================ */}
        {/* PAGE 2: ส่วนที่ ๒ สรุปผลการประเมิน + ส่วนที่ ๓ ผลการประเมิน       */}
        {/* ================================================================ */}
        <div className="a4-sheet bg-white text-black w-[210mm] min-h-[297mm] p-[15mm_15mm_15mm_18mm] shadow-xl print:shadow-none mb-8 print:mb-0 print:p-0 page-break-after">
          <div className="text-center font-bold text-[12pt] mb-3">- ๒ -</div>

          {/* Section 2 Header & Table */}
          <div className="text-[13pt] font-bold mb-2">
            ส่วนที่ ๒ : สรุปผลการประเมิน
          </div>

          <table className="w-full border-collapse border border-black text-[11.5pt] mb-4">
            <thead>
              <tr className="bg-slate-100 print:bg-transparent">
                <th className="border border-black px-2 py-2 text-center font-bold">องค์ประกอบการประเมิน</th>
                <th className="border border-black px-2 py-2 text-center font-bold w-20">คะแนนเต็ม</th>
                <th className="border border-black px-2 py-2 text-center font-bold w-24">คะแนนประเมิน ตนเอง</th>
                <th className="border border-black px-2 py-2 text-center font-bold w-28">คะแนนประเมิน ของผู้บังคับบัญชา</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-black px-2 py-1.5">
                  องค์ประกอบที่ ๑ การประเมินประสิทธิภาพและประสิทธิผลการปฏิบัติงานตามมาตรฐานตำแหน่ง
                </td>
                <td className="border border-black px-2 py-1.5 text-center font-bold">{toThaiDigits(80)}</td>
                <td className="border border-black px-2 py-1.5 text-center font-bold">
                  {formatThaiNumber(totalsSelf.component1.totalComponent1, 2)}
                </td>
                <td className="border border-black px-2 py-1.5 text-center font-bold">
                  {isSupervisorDone ? formatThaiNumber(totalsSupervisor.component1.totalComponent1, 2) : '-'}
                </td>
              </tr>
              <tr>
                <td className="border border-black px-2 py-1.5">
                  องค์ประกอบที่ ๒ การประเมินการมีส่วนร่วมในการพัฒนาการศึกษา
                </td>
                <td className="border border-black px-2 py-1.5 text-center font-bold">{toThaiDigits(10)}</td>
                <td className="border border-black px-2 py-1.5 text-center font-bold">
                  {formatThaiNumber(totalsSelf.component2.score, 2)}
                </td>
                <td className="border border-black px-2 py-1.5 text-center font-bold">
                  {isSupervisorDone ? formatThaiNumber(totalsSupervisor.component2.score, 2) : '-'}
                </td>
              </tr>
              <tr>
                <td className="border border-black px-2 py-1.5">
                  องค์ประกอบที่ ๓ การประเมินการปฏิบัติตนในการรักษาวินัย คุณธรรม จริยธรรม และจรรยาบรรณวิชาชีพ
                </td>
                <td className="border border-black px-2 py-1.5 text-center font-bold">{toThaiDigits(10)}</td>
                <td className="border border-black px-2 py-1.5 text-center font-bold">
                  {formatThaiNumber(totalsSelf.component3.score, 2)}
                </td>
                <td className="border border-black px-2 py-1.5 text-center font-bold">
                  {isSupervisorDone ? formatThaiNumber(totalsSupervisor.component3.score, 2) : '-'}
                </td>
              </tr>
              <tr className="font-bold bg-slate-50 print:bg-transparent">
                <td className="border border-black px-2 py-2 text-center">คะแนนรวม</td>
                <td className="border border-black px-2 py-2 text-center">{toThaiDigits(100)}</td>
                <td className="border border-black px-2 py-2 text-center text-emerald-800 print:text-black">
                  {formatThaiNumber(totalsSelf.grandTotal, 2)}
                </td>
                <td className="border border-black px-2 py-2 text-center text-indigo-900 print:text-black">
                  {isSupervisorDone ? formatThaiNumber(totalsSupervisor.grandTotal, 2) : '-'}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Section 3 Header */}
          <div className="text-[13pt] font-bold mb-1">
            ส่วนที่ ๓ : ผลการประเมิน
          </div>

          {/* 3.1 Self Certification */}
          <div className="text-[12pt] leading-normal pl-2 mb-3">
            <div className="font-bold">๓.๑ ผลการประเมินตนเอง</div>
            <div className="pl-4">ข้าพเจ้าขอรับรองว่าได้ประเมินตนเองตรงตามความเป็นจริง</div>
            <div className="mt-3 flex flex-col items-center ml-auto max-w-[280px] text-center text-[11.5pt] space-y-1">
              <div>(ลงชื่อ)........................................................ ผู้รับการประเมิน</div>
              <div>({part1Snapshot.evaluateeName || '........................................................'})</div>
              <div>ตำแหน่ง {part1Snapshot.position || '........................................................'}</div>
              <div>วันที่ {selfSignedDate ? formatThaiDateWithDigits(selfSignedDate) : '......... เดือน .................... พ.ศ. ............'}</div>
            </div>
          </div>

          {/* 3.2 Supervisor Certification & Rating Level */}
          <div className="text-[12pt] leading-normal pl-2 space-y-2">
            <div className="font-bold">๓.๒ ผลการประเมิน และความเห็นของผู้บังคับบัญชา</div>
            <div className="font-semibold pl-4">๓.๒.๑ ผลการประเมิน มี ๕ ระดับ ดังนี้</div>

            <div className="pl-8 space-y-1 text-[11.5pt]">
              <div className="flex items-center gap-2">
                <span className="text-[14pt]">{isSupervisorDone && totalsSupervisor.ratingLevel === 'ดีเด่น' ? '☑' : '☐'}</span>
                <span className="w-20 font-medium">ดีเด่น</span>
                <span>(ร้อยละ ๙๐.๐๐ ขึ้นไป)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[14pt]">{isSupervisorDone && totalsSupervisor.ratingLevel === 'ดีมาก' ? '☑' : '☐'}</span>
                <span className="w-20 font-medium">ดีมาก</span>
                <span>(ร้อยละ ๘๐.๐๐ - ๘๙.๙๙)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[14pt]">{isSupervisorDone && totalsSupervisor.ratingLevel === 'ดี' ? '☑' : '☐'}</span>
                <span className="w-20 font-medium">ดี</span>
                <span>(ร้อยละ ๗๐.๐๐ - ๗๙.๙๙)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[14pt]">{isSupervisorDone && totalsSupervisor.ratingLevel === 'พอใช้' ? '☑' : '☐'}</span>
                <span className="w-20 font-medium">พอใช้</span>
                <span>(ร้อยละ ๖๐.๐๐ - ๖๙.๙๙)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[14pt]">{isSupervisorDone && totalsSupervisor.ratingLevel === 'ปรับปรุง' ? '☑' : '☐'}</span>
                <span className="w-20 font-medium">ปรับปรุง</span>
                <span>(ร้อยละ ๕๙.๙๙ ลงมา)</span>
              </div>
            </div>

            <div className="font-semibold pl-4 pt-1">๓.๒.๒ ความเห็นของผู้บังคับบัญชา</div>
            <div className="pl-4 min-h-[38px] border-b border-black text-[11.5pt] leading-relaxed">
              {supervisorComment ? toThaiDigits(supervisorComment) : '....................................................................................................................................................'}
            </div>
            <div className="pl-4 min-h-[22px] border-b border-black text-[11.5pt]">
              {supervisorComment && supervisorComment.length > 80 ? '' : ''}
            </div>

            <div className="mt-4 flex flex-col items-center ml-auto max-w-[280px] text-center text-[11.5pt] space-y-1 pt-2">
              <div>(ลงชื่อ)........................................................ ผู้บังคับบัญชา</div>
              <div>({part1Snapshot.evaluatorName || '........................................................'})</div>
              <div>ตำแหน่ง {part1Snapshot.evaluatorPosition ? toThaiDigits(part1Snapshot.evaluatorPosition) : '........................................................'}</div>
              <div>วันที่ {supervisorSignedDate ? formatThaiDateWithDigits(supervisorSignedDate) : '......... เดือน .................... พ.ศ. ............'}</div>
            </div>
          </div>
        </div>

        {/* ================================================================ */}
        {/* PAGE 3: ส่วนที่ ๔ การรับทราบผลการประเมิน                          */}
        {/* ================================================================ */}
        <div className="a4-sheet bg-white text-black w-[210mm] min-h-[297mm] p-[15mm_15mm_15mm_18mm] shadow-xl print:shadow-none mb-8 print:mb-0 print:p-0 page-break-after">
          <div className="text-center font-bold text-[12pt] mb-3">- ๓ -</div>

          <div className="border border-black p-5 text-[12pt] leading-normal h-[245mm] flex flex-col justify-between">
            <div>
              <div className="text-[13pt] font-bold mb-3">
                ส่วนที่ ๔ : การรับทราบผลการประเมิน
              </div>

              {/* Evaluatee Acknowledgment */}
              <div className="mb-6">
                <div className="font-bold mb-1">ผู้รับการประเมิน :</div>
                <div className="flex items-center gap-2 pl-4 mb-4">
                  <span className="text-[14pt]">{isAcknowledged ? '☑' : '☐'}</span>
                  <span>ได้รับทราบผลการประเมินและความเห็นของผู้บังคับบัญชาแล้ว</span>
                </div>

                <div className="flex flex-col items-center ml-auto max-w-[280px] text-center text-[11.5pt] space-y-1">
                  <div>(ลงชื่อ)........................................................</div>
                  <div>({part1Snapshot.evaluateeName || '........................................................'})</div>
                  <div>ตำแหน่ง : {part1Snapshot.position ? toThaiDigits(part1Snapshot.position) : '....................................................'}</div>
                  <div>วันที่ : {acknowledgedDateVal ? formatThaiDateWithDigits(acknowledgedDateVal) : '......... เดือน .................... พ.ศ. ............'}</div>
                </div>
              </div>

              <div className="border-t border-black my-4" />

              {/* Evaluator Notification */}
              <div>
                <div className="font-bold mb-1">ผู้ประเมิน :</div>
                <div className="space-y-1 pl-4 mb-4 text-[11.5pt]">
                  <div className="flex items-center gap-2">
                    <span className="text-[14pt]">{isAcknowledged ? '☑' : '☐'}</span>
                    <span>ได้แจ้งผลการประเมินและผู้รับการประเมินได้ลงนามรับทราบแล้ว</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[14pt]">☐</span>
                    <span>ได้แจ้งผลการประเมินเมื่อวันที่.......................................แล้ว แต่ผู้รับการประเมินไม่ลงนามรับทราบ</span>
                  </div>
                </div>

                <div className="flex flex-col items-center ml-auto max-w-[280px] text-center text-[11.5pt] space-y-1">
                  <div>(ลงชื่อ) : ........................................................</div>
                  <div>({part1Snapshot.evaluatorName || '........................................................'})</div>
                  <div>ตำแหน่ง : {part1Snapshot.evaluatorPosition ? toThaiDigits(part1Snapshot.evaluatorPosition) : '....................................................'}</div>
                  <div>วันที่ : {supervisorSignedDate ? formatThaiDateWithDigits(supervisorSignedDate) : '......... เดือน .................... พ.ศ. ............'}</div>
                </div>
              </div>
            </div>

            {/* Witness Block */}
            <div className="pt-4 border-t border-dotted border-black/40">
              <div className="flex flex-col items-center ml-auto max-w-[280px] text-center text-[11.5pt] space-y-1">
                <div>(ลงชื่อ) : ........................................................ พยาน</div>
                <div>(........................................................)</div>
                <div>ตำแหน่ง : ....................................................</div>
                <div>วันที่ : ......... เดือน .................... พ.ศ. ............</div>
              </div>
            </div>
          </div>
        </div>

        {/* ================================================================ */}
        {/* COMPONENT 1: ATTACHED PAGES (PAGES 4 TO 7 OR 8)                  */}
        {/* ================================================================ */}

        {/* Page 4: Attached Component 1 - Part 1 Header & First Slice */}
        <div className="a4-sheet bg-white text-black w-[210mm] min-h-[297mm] p-[15mm_15mm_15mm_18mm] shadow-xl print:shadow-none mb-8 print:mb-0 print:p-0 page-break-after">
          <div className="text-center font-bold text-[13.5pt] leading-relaxed mb-3">
            <div>แบบประเมินองค์ประกอบที่ ๑</div>
            <div>การประเมินประสิทธิภาพและประสิทธิผลการปฏิบัติงานตามมาตรฐานตำแหน่ง</div>
            <div>{template.targetPosition} {template.targetStanding ? `วิทยฐานะ${template.targetStanding}` : ''}</div>
            <div className="font-normal text-[12pt]">(ทุกสังกัด)</div>
          </div>

          {/* Evaluatee Details Snippet */}
          <div className="text-[11.5pt] space-y-0.5 mb-2 border-b border-black pb-2">
            <div className="grid grid-cols-2 gap-2">
              <div>ชื่อผู้รับการประเมิน <span className="underline decoration-dotted">{part1Snapshot.evaluateeName || '-'}</span></div>
              <div>ตำแหน่ง <span className="underline decoration-dotted">{toThaiDigits(part1Snapshot.position || '-')}</span> สังกัด <span className="underline decoration-dotted">{toThaiDigits(part1Snapshot.affiliation || '-')}</span></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>ชื่อผู้ประเมิน <span className="underline decoration-dotted">{part1Snapshot.evaluatorName || '-'}</span></div>
              <div>ตำแหน่ง <span className="underline decoration-dotted">{toThaiDigits(part1Snapshot.evaluatorPosition || '-')}</span> สังกัด <span className="underline decoration-dotted">{toThaiDigits(part1Snapshot.affiliation || '-')}</span></div>
            </div>
            <div className="flex items-center gap-6 pt-0.5">
              <div className="flex items-center gap-1.5">
                <span>{roundNumber === 1 ? '☑' : '☐'}</span>
                <span>รอบการประเมิน ครั้งที่ ๑ {roundNumber === 1 ? `(${periodRange.startDateText} ถึง ${periodRange.endDateText})` : ''}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span>{roundNumber === 2 ? '☑' : '☐'}</span>
                <span>ครั้งที่ ๒ {roundNumber === 2 ? `(${periodRange.startDateText} ถึง ${periodRange.endDateText})` : ''}</span>
              </div>
            </div>
          </div>

          {/* Component 1 Part 1 Instructions */}
          <div className="text-[11pt] leading-snug mb-2 space-y-1">
            <div className="font-bold text-[11.5pt]">
              {template.hasChallengePart ? 'ตอนที่ ๑ : ' : ''}ระดับความสำเร็จในการพัฒนางานตามมาตรฐานตำแหน่ง ({toThaiDigits(template.component1.part1.maxScore)} คะแนน)
            </div>
            <div className="text-[10pt] leading-tight">
              คำชี้แจง การประเมินองค์ประกอบที่ ๑ มีด้วยกัน {toThaiDigits(template.component1.part1.domains.length)} ด้าน {toThaiDigits(allPart1Indicators.length)} ตัวชี้วัด รวมคะแนนทั้งหมด {toThaiDigits(template.component1.part1.maxScore)} คะแนน โดยมีระดับการประเมินและเกณฑ์การให้คะแนน ดังนี้ ให้ผู้รับการประเมิน ประเมินตนเอง และให้ผู้บังคับบัญชาประเมิน โดยใช้เครื่องหมาย ✓ ในช่องระดับ และให้ใส่คะแนนในช่องคะแนน
            </div>
            <div className="text-[9.5pt] grid grid-cols-2 gap-x-2 pl-2 text-slate-800 print:text-black">
              <div>๑) ระดับ ๑ หมายถึง ต่ำกว่าระดับที่คาดหวังมาก (๑ คะแนน)</div>
              <div>๒) ระดับ ๒ หมายถึง ต่ำกว่าระดับที่คาดหวัง (๒ คะแนน)</div>
              <div>๓) ระดับ ๓ หมายถึง ได้ตามระดับที่คาดหวัง (๓ คะแนน)</div>
              <div>๔) ระดับ ๔ หมายถึง สูงกว่าระดับที่คาดหวัง (๔ คะแนน)</div>
            </div>
            {isTeacherAssistant && (
              <div className="border border-black p-1 text-center font-bold text-[10pt] bg-slate-50 print:bg-transparent">
                คะแนนประเมิน = (คะแนนรวม x ๘๐) / ๕๖
              </div>
            )}
          </div>

          {/* Indicators Table (Slice 1) */}
          <table className="w-full border-collapse border border-black text-[10pt]">
            <thead>
              <tr className="bg-slate-100 print:bg-transparent text-center font-bold">
                <th className="border border-black px-1.5 py-1 w-[28%]">การปฏิบัติงาน</th>
                <th className="border border-black px-1.5 py-1">รายละเอียด</th>
                <th className="border border-black px-1 py-1 w-[18%]">
                  <div>ผลการประเมินตนเอง</div>
                  <div className="grid grid-cols-5 text-[8.5pt] border-t border-black font-normal mt-0.5">
                    <span>๑</span><span>๒</span><span>๓</span><span>๔</span><span className="font-bold">คะแนน</span>
                  </div>
                </th>
                <th className="border border-black px-1 py-1 w-[18%]">
                  <div>ผลการประเมินผู้บังคับบัญชา</div>
                  <div className="grid grid-cols-5 text-[8.5pt] border-t border-black font-normal mt-0.5">
                    <span>๑</span><span>๒</span><span>๓</span><span>๔</span><span className="font-bold">คะแนน</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {renderIndicatorRows(page4Indicators, selfScores?.part1, supervisorScores?.part1, isSupervisorDone)}
            </tbody>
          </table>
        </div>

        {/* Page 5: Attached Component 1 - Part 1 Continued */}
        <div className="a4-sheet bg-white text-black w-[210mm] min-h-[297mm] p-[15mm_15mm_15mm_18mm] shadow-xl print:shadow-none mb-8 print:mb-0 print:p-0 page-break-after">
          <div className="text-center font-bold text-[12pt] mb-2">- ๒ -</div>

          <table className="w-full border-collapse border border-black text-[10pt]">
            <thead>
              <tr className="bg-slate-100 print:bg-transparent text-center font-bold">
                <th className="border border-black px-1.5 py-1 w-[28%]">การปฏิบัติงาน</th>
                <th className="border border-black px-1.5 py-1">รายละเอียด</th>
                <th className="border border-black px-1 py-1 w-[18%]">
                  <div>ผลการประเมินตนเอง</div>
                  <div className="grid grid-cols-5 text-[8.5pt] border-t border-black font-normal mt-0.5">
                    <span>๑</span><span>๒</span><span>๓</span><span>๔</span><span className="font-bold">คะแนน</span>
                  </div>
                </th>
                <th className="border border-black px-1 py-1 w-[18%]">
                  <div>ผลการประเมินผู้บังคับบัญชา</div>
                  <div className="grid grid-cols-5 text-[8.5pt] border-t border-black font-normal mt-0.5">
                    <span>๑</span><span>๒</span><span>๓</span><span>๔</span><span className="font-bold">คะแนน</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {renderIndicatorRows(page5Indicators, selfScores?.part1, supervisorScores?.part1, isSupervisorDone)}
              {isTeacherAssistant && (
                <>
                  <tr className="font-bold bg-slate-50 print:bg-transparent">
                    <td colSpan={2} className="border border-black px-2 py-1.5 text-center">คะแนนรวม</td>
                    <td className="border border-black px-1 py-1.5 text-center">
                      {toThaiDigits(totalsSelf.component1.rawPart1)}
                    </td>
                    <td className="border border-black px-1 py-1.5 text-center">
                      {isSupervisorDone ? toThaiDigits(totalsSupervisor.component1.rawPart1) : '-'}
                    </td>
                  </tr>
                  <tr className="font-bold text-[9.5pt]">
                    <td colSpan={2} className="border border-black px-2 py-1.5">
                      แปลงคะแนนรวมเป็นคะแนนการประเมินประสิทธิภาพและประสิทธิผลการปฏิบัติงานตามมาตรฐานตำแหน่งที่มีฐานเป็นคะแนนเต็ม ๘๐ คะแนน (นำคะแนนรวมคูณ ๘๐ หาร ๕๖)
                    </td>
                    <td className="border border-black px-1 py-1.5 text-center text-[10.5pt]">
                      {formatThaiNumber(totalsSelf.component1.part1Score, 2)}
                    </td>
                    <td className="border border-black px-1 py-1.5 text-center text-[10.5pt]">
                      {isSupervisorDone ? formatThaiNumber(totalsSupervisor.component1.part1Score, 2) : '-'}
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>

        {/* Page 6: For Forms 2-6 (Teachers & Directors) */}
        {!isTeacherAssistant && (
          <div className="a4-sheet bg-white text-black w-[210mm] min-h-[297mm] p-[15mm_15mm_15mm_18mm] shadow-xl print:shadow-none mb-8 print:mb-0 print:p-0 page-break-after">
            <div className="text-center font-bold text-[12pt] mb-2">- ๓ -</div>

            <table className="w-full border-collapse border border-black text-[10pt] mb-3">
              <thead>
                <tr className="bg-slate-100 print:bg-transparent text-center font-bold">
                  <th className="border border-black px-1.5 py-1 w-[28%]">การปฏิบัติงาน</th>
                  <th className="border border-black px-1.5 py-1">รายละเอียด</th>
                  <th className="border border-black px-1 py-1 w-[18%]">
                    <div>ผลประเมินตนเอง</div>
                    <div className="grid grid-cols-5 text-[8.5pt] border-t border-black font-normal mt-0.5">
                      <span>๑</span><span>๒</span><span>๓</span><span>๔</span><span className="font-bold">คะแนน</span>
                    </div>
                  </th>
                  <th className="border border-black px-1 py-1 w-[18%]">
                    <div>ผลประเมินผู้บังคับบัญชา</div>
                    <div className="grid grid-cols-5 text-[8.5pt] border-t border-black font-normal mt-0.5">
                      <span>๑</span><span>๒</span><span>๓</span><span>๔</span><span className="font-bold">คะแนน</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {renderIndicatorRows(page6Indicators, selfScores?.part1, supervisorScores?.part1, isSupervisorDone)}
                {!isDirector && (
                  <>
                    <tr className="font-bold bg-slate-50 print:bg-transparent">
                      <td colSpan={2} className="border border-black px-2 py-1 text-center">คะแนนรวม</td>
                      <td className="border border-black px-1 py-1 text-center">
                        {toThaiDigits(totalsSelf.component1.rawPart1)}
                      </td>
                      <td className="border border-black px-1 py-1 text-center">
                        {isSupervisorDone ? toThaiDigits(totalsSupervisor.component1.rawPart1) : '-'}
                      </td>
                    </tr>
                    <tr className="font-bold text-[9pt]">
                      <td colSpan={2} className="border border-black px-2 py-1">
                        แปลงคะแนนรวมเป็นคะแนนระดับความสำเร็จในการพัฒนางานตามมาตรฐานตำแหน่งเต็ม ๖๐ คะแนน (นำคะแนนรวมคูณ ๖๐ หาร ๖๐)
                      </td>
                      <td className="border border-black px-1 py-1 text-center text-[10pt]">
                        {formatThaiNumber(totalsSelf.component1.part1Score, 2)}
                      </td>
                      <td className="border border-black px-1 py-1 text-center text-[10pt]">
                        {isSupervisorDone ? formatThaiNumber(totalsSupervisor.component1.part1Score, 2) : '-'}
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>

            {/* If Teacher (Forms 2-4), Page 6 also contains Part 2 Challenge Instructions */}
            {!isDirector && (
              <div className="border-t-2 border-black pt-2 text-[10.5pt] space-y-1.5">
                <div className="font-bold text-[11.5pt]">
                  ตอนที่ ๒ : ระดับความสำเร็จในการพัฒนางานที่เสนอเป็นประเด็นท้าทายในการพัฒนาผลลัพธ์การเรียนรู้ของผู้เรียน (๒๐ คะแนน)
                </div>
                <div className="text-[9.5pt] leading-tight">
                  คำชี้แจง การประเมินองค์ประกอบที่ ๑ ตอนที่ ๒ คะแนนรวม ๒๐ คะแนน ซึ่งมีรายการประเมิน ๒ รายการ รายการละ ๑๐ คะแนน โดยมีระดับการประเมิน ๔ ระดับ ได้แก่ ระดับ ๑ (ต่ำกว่าคาดหวังมาก), ระดับ ๒ (ต่ำกว่าคาดหวัง), ระดับ ๓ (ได้ตามคาดหวัง), ระดับ ๔ (สูงกว่าคาดหวัง)
                </div>
                <div className="border border-black p-1 text-center font-bold text-[9.5pt] bg-slate-50 print:bg-transparent">
                  คะแนนประเมิน = (คะแนนรวม x ๒๐) / ๔๐
                </div>
              </div>
            )}
          </div>
        )}

        {/* Page 7: For Directors (Form 5 & 6) Page 7 has item 5.2 + Part 2 Challenge Instructions */}
        {isDirector && (
          <div className="a4-sheet bg-white text-black w-[210mm] min-h-[297mm] p-[15mm_15mm_15mm_18mm] shadow-xl print:shadow-none mb-8 print:mb-0 print:p-0 page-break-after">
            <div className="text-center font-bold text-[12pt] mb-2">- ๔ -</div>

            <table className="w-full border-collapse border border-black text-[10pt] mb-3">
              <thead>
                <tr className="bg-slate-100 print:bg-transparent text-center font-bold">
                  <th className="border border-black px-1.5 py-1 w-[28%]">การปฏิบัติงาน</th>
                  <th className="border border-black px-1.5 py-1">รายละเอียด</th>
                  <th className="border border-black px-1 py-1 w-[18%]">
                    <div>ผลประเมินตนเอง</div>
                    <div className="grid grid-cols-5 text-[8.5pt] border-t border-black font-normal mt-0.5">
                      <span>๑</span><span>๒</span><span>๓</span><span>๔</span><span className="font-bold">คะแนน</span>
                    </div>
                  </th>
                  <th className="border border-black px-1 py-1 w-[18%]">
                    <div>ผลประเมินผู้บังคับบัญชา</div>
                    <div className="grid grid-cols-5 text-[8.5pt] border-t border-black font-normal mt-0.5">
                      <span>๑</span><span>๒</span><span>๓</span><span>๔</span><span className="font-bold">คะแนน</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {renderIndicatorRows(page7Indicators, selfScores?.part1, supervisorScores?.part1, isSupervisorDone)}
                <tr className="font-bold bg-slate-50 print:bg-transparent">
                  <td colSpan={2} className="border border-black px-2 py-1 text-center">คะแนนรวม</td>
                  <td className="border border-black px-1 py-1 text-center">
                    {toThaiDigits(totalsSelf.component1.rawPart1)}
                  </td>
                  <td className="border border-black px-1 py-1 text-center">
                    {isSupervisorDone ? toThaiDigits(totalsSupervisor.component1.rawPart1) : '-'}
                  </td>
                </tr>
                <tr className="font-bold text-[9pt]">
                  <td colSpan={2} className="border border-black px-2 py-1">
                    แปลงคะแนนรวมเป็นคะแนนระดับความสำเร็จในการพัฒนางานตามมาตรฐานตำแหน่งเต็ม ๖๐ คะแนน (นำคะแนนรวมคูณ ๖๐ หาร ๖๐)
                  </td>
                  <td className="border border-black px-1 py-1 text-center text-[10pt]">
                    {formatThaiNumber(totalsSelf.component1.part1Score, 2)}
                  </td>
                  <td className="border border-black px-1 py-1 text-center text-[10pt]">
                    {isSupervisorDone ? formatThaiNumber(totalsSupervisor.component1.part1Score, 2) : '-'}
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="border-t-2 border-black pt-2 text-[10.5pt] space-y-1.5">
              <div className="font-bold text-[11.5pt]">
                ตอนที่ ๒ : ระดับความสำเร็จในการพัฒนางานที่เสนอเป็นประเด็นท้าทายในการพัฒนาคุณภาพผู้เรียน ครู และสถานศึกษา (๒๐ คะแนน)
              </div>
              <div className="text-[9.5pt] leading-tight">
                คำชี้แจง การประเมินองค์ประกอบที่ ๑ ตอนที่ ๒ คะแนนรวม ๒๐ คะแนน ซึ่งมีรายการประเมิน ๒ รายการ รายการละ ๑๐ คะแนน โดยมีเกณฑ์การให้คะแนนระดับคุณภาพ ๔ ระดับ
              </div>
              <div className="border border-black p-1 text-center font-bold text-[9.5pt] bg-slate-50 print:bg-transparent">
                คะแนนประเมิน = (คะแนนรวม x ๒๐) / ๔๐
              </div>
            </div>
          </div>
        )}

        {/* Challenge Part Table & Summary (Page 7 for Teachers, Page 8 for Directors) */}
        {!isTeacherAssistant && (
          <div className="a4-sheet bg-white text-black w-[210mm] min-h-[297mm] p-[15mm_15mm_15mm_18mm] shadow-xl print:shadow-none mb-8 print:mb-0 print:p-0 page-break-after">
            <div className="text-center font-bold text-[12pt] mb-2">{isDirector ? '- ๕ -' : '- ๔ -'}</div>

            <div className="font-bold text-[11.5pt] mb-1">
              ตารางประเมิน ตอนที่ ๒ ประเด็นท้าทาย (๒๐ คะแนน)
            </div>

            <table className="w-full border-collapse border border-black text-[10.5pt] mb-4">
              <thead>
                <tr className="bg-slate-100 print:bg-transparent text-center font-bold">
                  <th className="border border-black px-2 py-1.5">รายการประเมิน</th>
                  <th className="border border-black px-1 py-1.5 w-[22%]">
                    <div>ผลการประเมินตนเอง</div>
                    <div className="grid grid-cols-5 text-[8.5pt] border-t border-black font-normal mt-0.5">
                      <span>๑</span><span>๒</span><span>๓</span><span>๔</span><span className="font-bold">คะแนน</span>
                    </div>
                  </th>
                  <th className="border border-black px-1 py-1.5 w-[22%]">
                    <div>ผลประเมินผู้บังคับบัญชา</div>
                    <div className="grid grid-cols-5 text-[8.5pt] border-t border-black font-normal mt-0.5">
                      <span>๑</span><span>๒</span><span>๓</span><span>๔</span><span className="font-bold">คะแนน</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* Challenge Item 1 */}
                <tr>
                  <td className="border border-black px-2 py-1.5 font-medium">
                    ๑. วิธีดำเนินการ (๒๐ คะแนน)
                    <div className="text-[9pt] font-normal text-slate-700 print:text-black">
                      พิจารณาจากการดำเนินการที่ถูกต้อง ครบถ้วน เป็นไปตามระยะเวลาที่กำหนดไว้ในข้อตกลง และสะท้อนให้เห็นถึงระดับการปฏิบัติที่คาดหวังตามตำแหน่งและวิทยฐานะ
                    </div>
                  </td>
                  <td className="border border-black px-0.5 py-1 text-center align-middle">
                    {renderLevelCells(selfScores?.part2?.challenge_method, 20)}
                  </td>
                  <td className="border border-black px-0.5 py-1 text-center align-middle">
                    {isSupervisorDone
                      ? renderLevelCells(supervisorScores?.part2?.challenge_method, 20)
                      : renderEmptyLevelCells()}
                  </td>
                </tr>

                {/* Challenge Item 2.1 (เชิงปริมาณ) */}
                <tr>
                  <td className="border border-black px-2 py-1.5 font-medium">
                    ๒. ผลลัพธ์การเรียนรู้ของผู้เรียนที่คาดหวัง (๒๐ คะแนน)
                    <div className="text-[9pt] font-normal pl-2 text-slate-700 print:text-black mt-1">
                      ๒.๑ เชิงปริมาณ (๑๐ คะแนน)
                    </div>
                  </td>
                  <td className="border border-black px-0.5 py-1 text-center align-middle">
                    {renderLevelCells(selfScores?.part2?.challenge_quantity, 10)}
                  </td>
                  <td className="border border-black px-0.5 py-1 text-center align-middle">
                    {isSupervisorDone
                      ? renderLevelCells(supervisorScores?.part2?.challenge_quantity, 10)
                      : renderEmptyLevelCells()}
                  </td>
                </tr>

                {/* Challenge Item 2.2 (เชิงคุณภาพ) */}
                <tr>
                  <td className="border border-black px-2 py-1.5 font-normal">
                    <div className="text-[9pt] pl-2 text-slate-700 print:text-black">
                      ๒.๒ เชิงคุณภาพ (๑๐ คะแนน)
                    </div>
                  </td>
                  <td className="border border-black px-0.5 py-1 text-center align-middle">
                    {renderLevelCells(selfScores?.part2?.challenge_quality, 10)}
                  </td>
                  <td className="border border-black px-0.5 py-1 text-center align-middle">
                    {isSupervisorDone
                      ? renderLevelCells(supervisorScores?.part2?.challenge_quality, 10)
                      : renderEmptyLevelCells()}
                  </td>
                </tr>

                {/* Challenge Sum */}
                <tr className="font-bold bg-slate-50 print:bg-transparent">
                  <td className="border border-black px-2 py-1.5 text-center">คะแนนรวม ตอนที่ ๒</td>
                  <td className="border border-black px-1 py-1.5 text-center">
                    {toThaiDigits(totalsSelf.component1.rawPart2)}
                  </td>
                  <td className="border border-black px-1 py-1.5 text-center">
                    {isSupervisorDone ? toThaiDigits(totalsSupervisor.component1.rawPart2) : '-'}
                  </td>
                </tr>

                <tr className="font-bold text-[9.5pt]">
                  <td className="border border-black px-2 py-1.5">
                    แปลงคะแนนรวมตอนที่ ๒ เต็ม ๒๐ คะแนน (นำคะแนนรวมคูณ ๒๐ หาร ๔๐)
                  </td>
                  <td className="border border-black px-1 py-1.5 text-center text-[10.5pt]">
                    {formatThaiNumber(totalsSelf.component1.part2Score, 2)}
                  </td>
                  <td className="border border-black px-1 py-1.5 text-center text-[10.5pt]">
                    {isSupervisorDone ? formatThaiNumber(totalsSupervisor.component1.part2Score, 2) : '-'}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Summary Table for Component 1 */}
            <div className="font-bold text-[11.5pt] mb-1">
              สรุปคะแนนรวมแบบประเมินองค์ประกอบที่ ๑ การประเมินประสิทธิภาพและประสิทธิผลการปฏิบัติงานตามมาตรฐานตำแหน่ง
            </div>

            <table className="w-full border-collapse border border-black text-[11pt]">
              <thead>
                <tr className="bg-slate-100 print:bg-transparent text-center font-bold">
                  <th className="border border-black px-2 py-2">รายการประเมิน</th>
                  <th className="border border-black px-2 py-2 w-20">คะแนนเต็ม</th>
                  <th className="border border-black px-2 py-2 w-28">คะแนนประเมิน ตนเอง</th>
                  <th className="border border-black px-2 py-2 w-32">คะแนนประเมิน ของผู้บังคับบัญชา</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-black px-2 py-1.5">
                    ตอนที่ ๑ ระดับความสำเร็จในการพัฒนางานตามมาตรฐานตำแหน่ง
                  </td>
                  <td className="border border-black px-2 py-1.5 text-center font-bold">{toThaiDigits(60)}</td>
                  <td className="border border-black px-2 py-1.5 text-center font-bold">
                    {formatThaiNumber(totalsSelf.component1.part1Score, 2)}
                  </td>
                  <td className="border border-black px-2 py-1.5 text-center font-bold">
                    {isSupervisorDone ? formatThaiNumber(totalsSupervisor.component1.part1Score, 2) : '-'}
                  </td>
                </tr>
                <tr>
                  <td className="border border-black px-2 py-1.5">
                    ตอนที่ ๒ ระดับความสำเร็จในการพัฒนางานที่เสนอเป็นประเด็นท้าทายฯ
                  </td>
                  <td className="border border-black px-2 py-1.5 text-center font-bold">{toThaiDigits(20)}</td>
                  <td className="border border-black px-2 py-1.5 text-center font-bold">
                    {formatThaiNumber(totalsSelf.component1.part2Score, 2)}
                  </td>
                  <td className="border border-black px-2 py-1.5 text-center font-bold">
                    {isSupervisorDone ? formatThaiNumber(totalsSupervisor.component1.part2Score, 2) : '-'}
                  </td>
                </tr>
                <tr className="font-bold bg-slate-50 print:bg-transparent text-[11.5pt]">
                  <td className="border border-black px-2 py-2 text-center">คะแนนรวม องค์ประกอบที่ ๑</td>
                  <td className="border border-black px-2 py-2 text-center">{toThaiDigits(80)}</td>
                  <td className="border border-black px-2 py-2 text-center text-emerald-800 print:text-black">
                    {formatThaiNumber(totalsSelf.component1.totalComponent1, 2)}
                  </td>
                  <td className="border border-black px-2 py-2 text-center text-indigo-900 print:text-black">
                    {isSupervisorDone ? formatThaiNumber(totalsSupervisor.component1.totalComponent1, 2) : '-'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* ================================================================ */}
        {/* COMPONENT 2: แบบประเมินองค์ประกอบที่ ๒                             */}
        {/* ================================================================ */}
        <div className="a4-sheet bg-white text-black w-[210mm] min-h-[297mm] p-[15mm_15mm_15mm_18mm] shadow-xl print:shadow-none mb-8 print:mb-0 print:p-0 page-break-after">
          <div className="text-center font-bold text-[13.5pt] leading-relaxed mb-3">
            <div>แบบประเมินองค์ประกอบที่ ๒</div>
            <div>การประเมินการมีส่วนร่วมในการพัฒนาการศึกษา</div>
            <div>{template.targetPosition} {template.targetStanding ? `วิทยฐานะ${template.targetStanding}` : ''}</div>
            <div className="font-normal text-[12pt]">(ทุกสังกัด)</div>
          </div>

          <div className="text-[11.5pt] space-y-0.5 mb-3 border-b border-black pb-2">
            <div className="grid grid-cols-2 gap-2">
              <div>ชื่อผู้รับการประเมิน <span className="underline decoration-dotted">{part1Snapshot.evaluateeName || '-'}</span></div>
              <div>ตำแหน่ง <span className="underline decoration-dotted">{toThaiDigits(part1Snapshot.position || '-')}</span> สังกัด <span className="underline decoration-dotted">{toThaiDigits(part1Snapshot.affiliation || '-')}</span></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>ชื่อผู้ประเมิน <span className="underline decoration-dotted">{part1Snapshot.evaluatorName || '-'}</span></div>
              <div>ตำแหน่ง <span className="underline decoration-dotted">{toThaiDigits(part1Snapshot.evaluatorPosition || '-')}</span> สังกัด <span className="underline decoration-dotted">{toThaiDigits(part1Snapshot.affiliation || '-')}</span></div>
            </div>
            <div className="flex items-center gap-6 pt-0.5">
              <div className="flex items-center gap-1.5">
                <span>{roundNumber === 1 ? '☑' : '☐'}</span>
                <span>รอบการประเมิน ครั้งที่ ๑ {roundNumber === 1 ? `(${periodRange.startDateText} ถึง ${periodRange.endDateText})` : ''}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span>{roundNumber === 2 ? '☑' : '☐'}</span>
                <span>ครั้งที่ ๒ {roundNumber === 2 ? `(${periodRange.startDateText} ถึง ${periodRange.endDateText})` : ''}</span>
              </div>
            </div>
          </div>

          <div className="text-[11pt] leading-snug mb-3 space-y-1">
            <div className="font-bold text-[12pt]">
              ระดับความสำเร็จการมีส่วนร่วมในการพัฒนาการศึกษา (๑๐ คะแนน)
            </div>
            <div className="text-[10pt] leading-relaxed">
              คำชี้แจง การประเมินระดับความสำเร็จการมีส่วนร่วมในการพัฒนาการศึกษา คะแนนรวม ๑๐ คะแนน โดยพิจารณาจากปริมาณงานที่ได้รับมอบหมายจากผู้บังคับบัญชาแล้วเสร็จ โดยมีระดับการประเมินและเกณฑ์การให้คะแนน ดังนี้
            </div>
            <div className="text-[9.5pt] pl-3 space-y-0.5 text-slate-800 print:text-black">
              <div>๑) ระดับ ๑ หมายถึง ปฏิบัติงานที่ผู้บังคับบัญชามอบหมายแล้วเสร็จ ร้อยละ ๑๙.๙๙ ลงมา</div>
              <div>๒) ระดับ ๒ หมายถึง ปฏิบัติงานที่ผู้บังคับบัญชามอบหมายแล้วเสร็จ ร้อยละ ๒๐.๐๐ - ๓๙.๙๙</div>
              <div>๓) ระดับ ๓ หมายถึง ปฏิบัติงานที่ผู้บังคับบัญชามอบหมายแล้วเสร็จ ร้อยละ ๔๐.๐๐ - ๕๙.๙๙</div>
              <div>๔) ระดับ ๔ หมายถึง ปฏิบัติงานที่ผู้บังคับบัญชามอบหมายแล้วเสร็จ ร้อยละ ๖๐.๐๐ - ๗๙.๙๙</div>
              <div>๕) ระดับ ๕ หมายถึง ปฏิบัติงานที่ผู้บังคับบัญชามอบหมายแล้วเสร็จ ร้อยละ ๘๐.๐๐ ขึ้นไป</div>
            </div>
            <div className="border border-black p-1 text-center font-bold text-[10pt] bg-slate-50 print:bg-transparent mt-2">
              คะแนนที่ได้ = ระดับการประเมิน x ค่าน้ำหนัก
            </div>
          </div>

          <table className="w-full border-collapse border border-black text-[10.5pt] mb-4">
            <thead>
              <tr className="bg-slate-100 print:bg-transparent text-center font-bold">
                <th rowSpan={2} className="border border-black px-2 py-2">รายการประเมิน</th>
                <th colSpan={3} className="border border-black px-1 py-1 w-[38%]">ผลการประเมินตนเอง</th>
                <th colSpan={3} className="border border-black px-1 py-1 w-[38%]">ผลการประเมินของผู้บังคับบัญชา</th>
              </tr>
              <tr className="bg-slate-50 print:bg-transparent text-center text-[9pt] font-semibold">
                <th className="border border-black px-1 py-1">
                  <div>ระดับการประเมิน (ก)</div>
                  <div className="grid grid-cols-5 text-[8.5pt] mt-0.5">
                    <span>๑</span><span>๒</span><span>๓</span><span>๔</span><span>๕</span>
                  </div>
                </th>
                <th className="border border-black px-1 py-1 w-14">ค่าน้ำหนัก (ข)</th>
                <th className="border border-black px-1 py-1 w-16">คะแนนที่ได้ (ก x ข)</th>
                <th className="border border-black px-1 py-1">
                  <div>ระดับการประเมิน (ก)</div>
                  <div className="grid grid-cols-5 text-[8.5pt] mt-0.5">
                    <span>๑</span><span>๒</span><span>๓</span><span>๔</span><span>๕</span>
                  </div>
                </th>
                <th className="border border-black px-1 py-1 w-14">ค่าน้ำหนัก (ข)</th>
                <th className="border border-black px-1 py-1 w-16">คะแนนที่ได้ (ก x ข)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-black px-2 py-3 font-medium">
                  {COMPONENT_2_CONFIG.indicator.name}
                </td>
                <td className="border border-black px-1 py-2 text-center align-middle">
                  <div className="grid grid-cols-5 text-[10.5pt]">
                    <span>{selfScores?.comp2Level === 1 ? '✓' : ''}</span>
                    <span>{selfScores?.comp2Level === 2 ? '✓' : ''}</span>
                    <span>{selfScores?.comp2Level === 3 ? '✓' : ''}</span>
                    <span>{selfScores?.comp2Level === 4 ? '✓' : ''}</span>
                    <span>{selfScores?.comp2Level === 5 ? '✓' : ''}</span>
                  </div>
                </td>
                <td className="border border-black px-1 py-2 text-center font-bold">
                  {toThaiDigits(COMPONENT_2_CONFIG.weight)}
                </td>
                <td className="border border-black px-1 py-2 text-center font-bold">
                  {formatThaiNumber(totalsSelf.component2.score, 2)}
                </td>
                <td className="border border-black px-1 py-2 text-center align-middle">
                  <div className="grid grid-cols-5 text-[10.5pt]">
                    <span>{isSupervisorDone && supervisorScores?.comp2Level === 1 ? '✓' : ''}</span>
                    <span>{isSupervisorDone && supervisorScores?.comp2Level === 2 ? '✓' : ''}</span>
                    <span>{isSupervisorDone && supervisorScores?.comp2Level === 3 ? '✓' : ''}</span>
                    <span>{isSupervisorDone && supervisorScores?.comp2Level === 4 ? '✓' : ''}</span>
                    <span>{isSupervisorDone && supervisorScores?.comp2Level === 5 ? '✓' : ''}</span>
                  </div>
                </td>
                <td className="border border-black px-1 py-2 text-center font-bold">
                  {toThaiDigits(COMPONENT_2_CONFIG.weight)}
                </td>
                <td className="border border-black px-1 py-2 text-center font-bold">
                  {isSupervisorDone ? formatThaiNumber(totalsSupervisor.component2.score, 2) : '-'}
                </td>
              </tr>
              <tr className="font-bold bg-slate-50 print:bg-transparent">
                <td className="border border-black px-2 py-2 text-center">คะแนนรวม</td>
                <td colSpan={2} className="border border-black px-2 py-2 text-right">คะแนนรวม</td>
                <td className="border border-black px-1 py-2 text-center text-emerald-800 print:text-black font-bold">
                  {formatThaiNumber(totalsSelf.component2.score, 2)}
                </td>
                <td colSpan={2} className="border border-black px-2 py-2 text-right">คะแนนรวม</td>
                <td className="border border-black px-1 py-2 text-center text-indigo-900 print:text-black font-bold">
                  {isSupervisorDone ? formatThaiNumber(totalsSupervisor.component2.score, 2) : '-'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ================================================================ */}
        {/* COMPONENT 3: แบบประเมินองค์ประกอบที่ ๓                             */}
        {/* ================================================================ */}
        <div className="a4-sheet bg-white text-black w-[210mm] min-h-[297mm] p-[15mm_15mm_15mm_18mm] shadow-xl print:shadow-none mb-8 print:mb-0 print:p-0 print:break-after-avoid">
          <div className="text-center font-bold text-[13.5pt] leading-relaxed mb-3">
            <div>แบบประเมินองค์ประกอบที่ ๓</div>
            <div>การประเมินการปฏิบัติตนในการรักษาวินัย คุณธรรม จริยธรรม และจรรยาบรรณวิชาชีพ</div>
            <div>{template.targetPosition} {template.targetStanding ? `วิทยฐานะ${template.targetStanding}` : ''}</div>
            <div className="font-normal text-[12pt]">(ทุกสังกัด)</div>
          </div>

          <div className="text-[11.5pt] space-y-0.5 mb-3 border-b border-black pb-2">
            <div className="grid grid-cols-2 gap-2">
              <div>ชื่อผู้รับการประเมิน <span className="underline decoration-dotted">{part1Snapshot.evaluateeName || '-'}</span></div>
              <div>ตำแหน่ง <span className="underline decoration-dotted">{toThaiDigits(part1Snapshot.position || '-')}</span> สังกัด <span className="underline decoration-dotted">{toThaiDigits(part1Snapshot.affiliation || '-')}</span></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>ชื่อผู้ประเมิน <span className="underline decoration-dotted">{part1Snapshot.evaluatorName || '-'}</span></div>
              <div>ตำแหน่ง <span className="underline decoration-dotted">{toThaiDigits(part1Snapshot.evaluatorPosition || '-')}</span> สังกัด <span className="underline decoration-dotted">{toThaiDigits(part1Snapshot.affiliation || '-')}</span></div>
            </div>
            <div className="flex items-center gap-6 pt-0.5">
              <div className="flex items-center gap-1.5">
                <span>{roundNumber === 1 ? '☑' : '☐'}</span>
                <span>รอบการประเมิน ครั้งที่ ๑ {roundNumber === 1 ? `(${periodRange.startDateText} ถึง ${periodRange.endDateText})` : ''}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span>{roundNumber === 2 ? '☑' : '☐'}</span>
                <span>ครั้งที่ ๒ {roundNumber === 2 ? `(${periodRange.startDateText} ถึง ${periodRange.endDateText})` : ''}</span>
              </div>
            </div>
          </div>

          <div className="text-[11pt] leading-snug mb-3 space-y-1">
            <div className="font-bold text-[12pt]">
              การประเมินการปฏิบัติตนในการรักษาวินัย คุณธรรม จริยธรรม และจรรยาบรรณวิชาชีพ (๑๐ คะแนน)
            </div>
            <div className="text-[9.5pt] leading-relaxed">
              คำชี้แจง การประเมินการปฏิบัติตนในการรักษาวินัย คุณธรรม จริยธรรม และจรรยาบรรณวิชาชีพ มีรายการประเมิน ๑๐ รายการ โดยพิจารณาจากพฤติกรรมในการปฏิบัติตนในการรักษาวินัย โดยมีเกณฑ์การให้คะแนน ๑ = ต่ำกว่าคาดหวังมาก, ๒ = ต่ำกว่าคาดหวัง, ๓ = ได้ตามคาดหวัง, ๔ = สูงกว่าคาดหวัง
            </div>
            <div className="border border-black p-1 text-center font-bold text-[10pt] bg-slate-50 print:bg-transparent mt-1">
              คะแนนประเมิน = คะแนนรวม / ๔
            </div>
          </div>

          <table className="w-full border-collapse border border-black text-[9.5pt] mb-3">
            <thead>
              <tr className="bg-slate-100 print:bg-transparent text-center font-bold">
                <th className="border border-black px-1.5 py-1 w-8">ที่</th>
                <th className="border border-black px-2 py-1">รายการประเมิน</th>
                <th className="border border-black px-1 py-1 w-[20%]">
                  <div>ผลการประเมินตนเอง</div>
                  <div className="grid grid-cols-4 text-[8.5pt] border-t border-black font-normal mt-0.5">
                    <span>๑</span><span>๒</span><span>๓</span><span>๔</span>
                  </div>
                </th>
                <th className="border border-black px-1 py-1 w-[20%]">
                  <div>ผลการประเมินผู้บังคับบัญชา</div>
                  <div className="grid grid-cols-4 text-[8.5pt] border-t border-black font-normal mt-0.5">
                    <span>๑</span><span>๒</span><span>๓</span><span>๔</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPONENT_3_CONFIG.items.map((item, idx) => {
                const selfVal = selfScores?.comp3?.[item.id];
                const superVal = supervisorScores?.comp3?.[item.id];
                return (
                  <tr key={item.id}>
                    <td className="border border-black px-1 py-1 text-center font-bold">
                      {toThaiDigits(idx + 1)}
                    </td>
                    <td className="border border-black px-2 py-1 leading-tight">
                      {item.name}
                    </td>
                    <td className="border border-black px-1 py-1 text-center align-middle">
                      <div className="grid grid-cols-4 text-[10pt]">
                        <span>{selfVal === 1 ? '✓' : ''}</span>
                        <span>{selfVal === 2 ? '✓' : ''}</span>
                        <span>{selfVal === 3 ? '✓' : ''}</span>
                        <span>{selfVal === 4 ? '✓' : ''}</span>
                      </div>
                    </td>
                    <td className="border border-black px-1 py-1 text-center align-middle">
                      <div className="grid grid-cols-4 text-[10pt]">
                        <span>{isSupervisorDone && superVal === 1 ? '✓' : ''}</span>
                        <span>{isSupervisorDone && superVal === 2 ? '✓' : ''}</span>
                        <span>{isSupervisorDone && superVal === 3 ? '✓' : ''}</span>
                        <span>{isSupervisorDone && superVal === 4 ? '✓' : ''}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              <tr className="font-bold bg-slate-50 print:bg-transparent">
                <td colSpan={2} className="border border-black px-2 py-1.5 text-center">คะแนนรวม</td>
                <td className="border border-black px-1 py-1.5 text-center font-bold">
                  {toThaiDigits(totalsSelf.component3.rawSum)}
                </td>
                <td className="border border-black px-1 py-1.5 text-center font-bold">
                  {isSupervisorDone ? toThaiDigits(totalsSupervisor.component3.rawSum) : '-'}
                </td>
              </tr>
              <tr className="font-bold text-[9pt]">
                <td colSpan={2} className="border border-black px-2 py-1.5">
                  แปลงคะแนนรวมเป็นคะแนนการประเมินการปฏิบัติตนในการรักษาวินัย คุณธรรม จริยธรรม และจรรยาบรรณวิชาชีพที่มีฐานเป็นคะแนนเต็ม ๑๐ คะแนน (นำคะแนนรวมหารด้วย ๔)
                </td>
                <td className="border border-black px-1 py-1.5 text-center text-[10.5pt] text-emerald-800 print:text-black">
                  {formatThaiNumber(totalsSelf.component3.score, 2)}
                </td>
                <td className="border border-black px-1 py-1.5 text-center text-[10.5pt] text-indigo-900 print:text-black">
                  {isSupervisorDone ? formatThaiNumber(totalsSupervisor.component3.score, 2) : '-'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// HELPER RENDERERS
// ============================================================================

function renderIndicatorRows(
  indicators: any[],
  selfPart1: Record<string, number> | undefined,
  superPart1: Record<string, number> | undefined,
  isSupervisorDone: boolean
) {
  let lastDomainNumber: number | null = null;

  return indicators.map((ind) => {
    const showDomainHeader = ind.domainNumber !== lastDomainNumber;
    lastDomainNumber = ind.domainNumber;

    const selfVal = selfPart1?.[ind.id];
    const superVal = superPart1?.[ind.id];

    return (
      <React.Fragment key={ind.id}>
        {showDomainHeader && (
          <tr className="bg-slate-200/60 print:bg-slate-100 font-bold">
            <td colSpan={4} className="border border-black px-2 py-1 text-[10pt]">
              {toThaiDigits(ind.domainName)}
            </td>
          </tr>
        )}
        <tr>
          <td className="border border-black px-1.5 py-1 align-top font-medium leading-tight">
            {toThaiDigits(ind.code)} {ind.name}
          </td>
          <td className="border border-black px-1.5 py-1 align-top text-[9pt] leading-tight text-slate-700 print:text-black">
            {ind.description}
          </td>
          {/* Self Level Checkmarks */}
          <td className="border border-black px-0.5 py-1 align-top text-center">
            <div className="grid grid-cols-5 text-[8.5pt]">
              <span>{selfVal === 1 ? '✓' : ''}</span>
              <span>{selfVal === 2 ? '✓' : ''}</span>
              <span>{selfVal === 3 ? '✓' : ''}</span>
              <span>{selfVal === 4 ? '✓' : ''}</span>
              <span className="font-bold border-l border-black/40">
                {selfVal ? toThaiDigits(selfVal) : '-'}
              </span>
            </div>
          </td>
          {/* Supervisor Level Checkmarks */}
          <td className="border border-black px-0.5 py-1 align-top text-center">
            <div className="grid grid-cols-5 text-[8.5pt]">
              <span>{isSupervisorDone && superVal === 1 ? '✓' : ''}</span>
              <span>{isSupervisorDone && superVal === 2 ? '✓' : ''}</span>
              <span>{isSupervisorDone && superVal === 3 ? '✓' : ''}</span>
              <span>{isSupervisorDone && superVal === 4 ? '✓' : ''}</span>
              <span className="font-bold border-l border-black/40">
                {isSupervisorDone && superVal ? toThaiDigits(superVal) : '-'}
              </span>
            </div>
          </td>
        </tr>
      </React.Fragment>
    );
  });
}

function renderLevelCells(level: number | undefined, maxScore: number) {
  const scoreTable: Record<number, number> = maxScore === 20
    ? { 1: 5.0, 2: 10.0, 3: 15.0, 4: 20.0 }
    : { 1: 2.5, 2: 5.0, 3: 7.5, 4: 10.0 };

  const scoreVal = level ? scoreTable[level] : null;

  return (
    <div className="grid grid-cols-5 text-[9pt]">
      <span>{level === 1 ? '✓' : ''}</span>
      <span>{level === 2 ? '✓' : ''}</span>
      <span>{level === 3 ? '✓' : ''}</span>
      <span>{level === 4 ? '✓' : ''}</span>
      <span className="font-bold border-l border-black/40">
        {scoreVal ? formatThaiNumber(scoreVal, 2, false) : '-'}
      </span>
    </div>
  );
}

function renderCombinedChallengeCells(
  qtyLevel: number | undefined,
  qualLevel: number | undefined
) {
  const qtyScoreTable: Record<number, number> = { 1: 2.5, 2: 5.0, 3: 7.5, 4: 10.0 };
  const qualScoreTable: Record<number, number> = { 1: 2.5, 2: 5.0, 3: 7.5, 4: 10.0 };

  const qtyScore = qtyLevel ? qtyScoreTable[qtyLevel] : 0;
  const qualScore = qualLevel ? qualScoreTable[qualLevel] : 0;
  const total = (qtyLevel || qualLevel) ? qtyScore + qualScore : null;

  // Primary checkmark uses average or qtyLevel
  const displayLevel = qtyLevel || qualLevel;

  return (
    <div className="grid grid-cols-5 text-[9pt]">
      <span>{displayLevel === 1 ? '✓' : ''}</span>
      <span>{displayLevel === 2 ? '✓' : ''}</span>
      <span>{displayLevel === 3 ? '✓' : ''}</span>
      <span>{displayLevel === 4 ? '✓' : ''}</span>
      <span className="font-bold border-l border-black/40">
        {total !== null ? formatThaiNumber(total, 2, false) : '-'}
      </span>
    </div>
  );
}

function renderEmptyLevelCells() {
  return (
    <div className="grid grid-cols-5 text-[9pt]">
      <span></span>
      <span></span>
      <span></span>
      <span></span>
      <span className="font-bold border-l border-black/40">-</span>
    </div>
  );
}
