'use client';

/**
 * ============================================================================
 * ManStat: EvaluationAgreementModal (ข้อตกลงก่อนเริ่มการประเมินผลการปฏิบัติงาน)
 * ============================================================================
 * - Minimalist, scannable in ~10 seconds (4 concise bullet points)
 * - Appears ONCE per staff member per fiscal round when opening their own
 *   editable evaluation without a recorded terms_accepted_at timestamp.
 * - Strictly Arabic numerals (0-9), dual Light/Dark Mode, zero emojis.
 * - Accessible: role="dialog", aria-modal="true", Escape & backdrop cancel.
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import { ShieldCheck, X, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

export interface EvaluationAgreementModalProps {
  isOpen: boolean;
  fiscalYear: number;
  roundNumber: number;
  staffName?: string;
  isSubmitting?: boolean;
  errorMessage?: string | null;
  onAccept: () => void | Promise<void>;
  onCancel: () => void;
}

const AGREEMENT_POINTS = [
  {
    title: 'ความถูกต้องของข้อมูล',
    body: 'ข้าพเจ้ารับรองว่าข้อมูลผลการปฏิบัติงาน ภาระงาน และเอกสารหลักฐานที่บันทึกในระบบเป็นความจริงทุกประการ',
  },
  {
    title: 'หลักเกณฑ์และสถิติวันลา',
    body: 'ข้าพเจ้ารับทราบเกณฑ์การประเมินตามหลักเกณฑ์ ว 15/2561 และ พ.ร.บ. ระเบียบข้าราชการครูและบุคลากรทางการศึกษา (ฉบับที่ 5) พ.ศ. 2569 โดยระบบจะดึงสถิติวันลาที่ได้รับอนุมัติแล้วมาประกอบการพิจารณาโดยอัตโนมัติ',
  },
  {
    title: 'การล็อกข้อมูลหลังส่งผล',
    body: 'เมื่อยืนยันส่งแบบประเมินและผู้บังคับบัญชาพิจารณาผลแล้ว ระบบจะล็อกข้อมูลไม่ให้แก้ไขย้อนหลังเพื่อความโปร่งใสและตรวจสอบได้',
  },
  {
    title: 'การคุ้มครองข้อมูลส่วนบุคคล (PDPA)',
    body: 'ข้อมูลและผลคะแนนการประเมินจะถูกจัดเก็บและเข้าถึงได้เฉพาะผู้มีอำนาจตามสิทธิ์ของสถานศึกษาเท่านั้น',
  },
];

export const EvaluationAgreementModal: React.FC<EvaluationAgreementModalProps> = ({
  isOpen,
  fiscalYear,
  roundNumber,
  staffName,
  isSubmitting = false,
  errorMessage = null,
  onAccept,
  onCancel,
}) => {
  const [accepted, setAccepted] = useState(false);

  // Reset checkbox whenever modal opens for a new session
  useEffect(() => {
    if (isOpen) {
      setAccepted(false);
    }
  }, [isOpen]);

  // Escape key to cancel (disabled while submitting)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="evaluation-agreement-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          onCancel();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/75 backdrop-blur-xs p-4 overflow-y-auto print:hidden"
    >
      <div className="w-full max-w-lg bg-white dark:bg-[#121822] border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xl p-5 sm:p-6 space-y-5 text-slate-800 dark:text-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-200/80 dark:border-slate-800 pb-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 border border-sky-200/70 dark:border-sky-800/70 shrink-0 mt-0.5">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="evaluation-agreement-title"
                className="text-base font-bold text-slate-900 dark:text-white leading-snug"
              >
                ข้อตกลงก่อนเริ่มการประเมินผลการปฏิบัติงาน
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
                รอบการประเมินที่ {roundNumber} ประจำปีงบประมาณ {fiscalYear}
                {staffName ? ` · ${staffName}` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onCancel}
            aria-label="ปิดหน้าต่าง"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors disabled:opacity-40 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Concise 4-Point Agreement Body */}
        <ol className="space-y-3 text-xs sm:text-[13px] leading-relaxed">
          {AGREEMENT_POINTS.map((item, idx) => (
            <li
              key={item.title}
              className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50/90 dark:bg-[#0d131c] border border-slate-200/70 dark:border-slate-800/80"
            >
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 text-[11px] font-bold shrink-0 mt-0.5 tabular-nums">
                {idx + 1}
              </span>
              <p className="text-slate-700 dark:text-slate-300">
                <strong className="font-semibold text-slate-900 dark:text-white">
                  {item.title}:
                </strong>{' '}
                {item.body}
              </p>
            </li>
          ))}
        </ol>

        {/* Inline Error Alert (if save fails) */}
        {errorMessage && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 text-xs text-rose-700 dark:text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Required Consent Checkbox */}
        <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-[#101822] hover:border-sky-400 dark:hover:border-sky-600 transition-colors cursor-pointer select-none">
          <input
            type="checkbox"
            checked={accepted}
            disabled={isSubmitting}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-sky-600 focus:ring-sky-500 cursor-pointer shrink-0"
          />
          <span className="text-xs sm:text-[13px] font-medium text-slate-800 dark:text-slate-200 leading-snug">
            ข้าพเจ้าได้อ่าน เข้าใจ และยอมรับข้อตกลงการประเมินผลการปฏิบัติงานข้างต้น
          </span>
        </label>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200/80 dark:border-slate-800">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onCancel}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#101822] hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors disabled:opacity-50 cursor-pointer"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            disabled={!accepted || isSubmitting}
            onClick={onAccept}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:text-slate-500 dark:disabled:text-slate-400 text-white text-xs font-semibold shadow-sm transition-colors disabled:cursor-not-allowed cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span>กำลังบันทึกข้อตกลง...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>ยอมรับและเข้าสู่แบบประเมิน</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
