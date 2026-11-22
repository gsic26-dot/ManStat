'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FileText,
  User,
  Calendar,
  CheckCircle2,
  Clock,
  Save,
  Send,
  ChevronRight,
  ChevronLeft,
  Award,
  Lock,
  Unlock,
  Printer,
  FileCheck,
  AlertCircle,
  HelpCircle,
  Info,
  Copy,
  Edit3,
} from 'lucide-react';
import {
  EVALUATION_TEMPLATES,
  COMPONENT_2_CONFIG,
  COMPONENT_3_CONFIG,
  type EvaluationTemplateKey,
  type EvaluationTemplate,
} from '@/data/evaluationTemplates';
import {
  calculateEvaluationTotals,
  calculateComponent1Score,
  calculateComponent2Score,
  calculateComponent3Score,
  getRatingLevel,
  round2Decimals,
  type EvaluationScores,
  type RatingLevel,
} from '@/lib/evaluationEngine';
import type { TeacherRecord } from '@/lib/data/schoolData';

export interface EvaluationWorkspaceProps {
  staffId: string;
  fiscalYear: number;
  roundNumber: number;
  currentUser?: {
    id?: string;
    employeeCode?: string;
    role?: string;
    position?: string;
    department?: string;
    name?: string;
  } | null;
  onClose?: () => void;
  onSaved?: (updatedStatus: string, grandTotal: number, rating: string) => void;
}

export function EvaluationWorkspace({
  staffId,
  fiscalYear,
  roundNumber,
  currentUser,
  onClose,
  onSaved,
}: EvaluationWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Template and Form Data
  const [templateKey, setTemplateKey] = useState<EvaluationTemplateKey>('teacher_special_expert');
  const [teacher, setTeacher] = useState<TeacherRecord | null>(null);
  const [status, setStatus] = useState<string>('draft');
  const [part1Snapshot, setPart1Snapshot] = useState<any>({});
  const [selfScores, setSelfScores] = useState<EvaluationScores>({
    part1: {},
    part2: {},
    comp2Level: 5,
    comp3: {},
  });
  const [supervisorScores, setSupervisorScores] = useState<EvaluationScores>({
    part1: {},
    part2: {},
    comp2Level: 5,
    comp3: {},
  });
  const [supervisorComment, setSupervisorComment] = useState<string>('');

  // Determine User Permissions
  const isManager = useMemo(() => {
    if (!currentUser) return false;
    const r = (currentUser.role || '').toLowerCase();
    const pos = currentUser.position || '';
    const dept = currentUser.department || '';
    return (
      r === 'superuser' ||
      r === 'director' ||
      r === 'hr_admin' ||
      pos.includes('ผู้อำนวยการ') ||
      dept.includes('บุคคล')
    );
  }, [currentUser]);

  const isSelf = useMemo(() => {
    if (!currentUser) return false;
    return (
      currentUser.id === staffId ||
      currentUser.employeeCode === staffId ||
      (teacher && (currentUser.id === teacher.id || currentUser.employeeCode === teacher.employeeCode))
    );
  }, [currentUser, staffId, teacher]);

  const canEditSelf = isSelf || isManager;
  const canEditSupervisor = isManager;

  // Active Template definition
  const template: EvaluationTemplate = EVALUATION_TEMPLATES[templateKey] || EVALUATION_TEMPLATES.teacher_special_expert;

  // Fetch Data from API
  const fetchEvaluationData = useCallback(async () => {
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

      const data = json.data;
      setTemplateKey(data.templateKey as EvaluationTemplateKey);
      setTeacher(data.teacher || null);
      setStatus(data.status || 'draft');
      setPart1Snapshot(data.part1Snapshot || {});
      setSupervisorComment(data.supervisorComment || '');

      // Initialize self scores
      const p1Self = data.selfScores?.part1 || {};
      const p2Self = data.selfScores?.part2 || {};
      const c2Self = data.selfScores?.comp2Level || 5;
      const c3Self = data.selfScores?.comp3 || {};

      setSelfScores({
        part1: p1Self,
        part2: p2Self,
        comp2Level: c2Self,
        comp3: c3Self,
      });

      // Initialize supervisor scores
      const p1Super = data.supervisorScores?.part1 || {};
      const p2Super = data.supervisorScores?.part2 || {};
      const c2Super = data.supervisorScores?.comp2Level || 5;
      const c3Super = data.supervisorScores?.comp3 || {};

      setSupervisorScores({
        part1: p1Super,
        part2: p2Super,
        comp2Level: c2Super,
        comp3: c3Super,
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setIsLoading(false);
    }
  }, [staffId, fiscalYear, roundNumber]);

  useEffect(() => {
    fetchEvaluationData();
  }, [fetchEvaluationData]);

  // Live Score Calculations
  const liveSelfCalc = useMemo(() => {
    return calculateEvaluationTotals(templateKey, selfScores);
  }, [templateKey, selfScores]);

  const liveSupervisorCalc = useMemo(() => {
    return calculateEvaluationTotals(templateKey, supervisorScores);
  }, [templateKey, supervisorScores]);

  // Handle Score Updates
  const updateSelfScore = (section: 'part1' | 'part2' | 'comp3', id: string, val: number) => {
    if (!canEditSelf) return;
    setSelfScores((prev) => ({
      ...prev,
      [section]: {
        ...(prev[section] || {}),
        [id]: val,
      },
    }));
  };

  const updateSupervisorScore = (section: 'part1' | 'part2' | 'comp3', id: string, val: number) => {
    if (!canEditSupervisor) return;
    setSupervisorScores((prev) => ({
      ...prev,
      [section]: {
        ...(prev[section] || {}),
        [id]: val,
      },
    }));
  };

  // Quick fill helper for supervisor: copy self scores to supervisor scores
  const handleCopySelfToSupervisor = () => {
    if (!canEditSupervisor) return;
    setSupervisorScores({
      part1: { ...(selfScores.part1 || {}) },
      part2: { ...(selfScores.part2 || {}) },
      comp2Level: selfScores.comp2Level || 5,
      comp3: { ...(selfScores.comp3 || {}) },
    });
    setSuccessMsg('คัดลอกคะแนนจากการประเมินตนเองมายังช่องผู้บังคับบัญชาเรียบร้อยแล้ว');
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  // Quick fill helper: set all to level 4
  const handleSetAllLevel4 = (target: 'self' | 'supervisor') => {
    const p1: Record<string, number> = {};
    template.component1.part1.domains.forEach((d) => {
      d.indicators.forEach((ind) => {
        p1[ind.id] = 4;
      });
    });

    const p2: Record<string, number> = {};
    if (template.component1.part2) {
      template.component1.part2.items.forEach((item) => {
        p2[item.id] = 4;
      });
    }

    const c3: Record<string, number> = {};
    COMPONENT_3_CONFIG.items.forEach((item) => {
      c3[item.id] = 4;
    });

    if (target === 'self' && canEditSelf) {
      setSelfScores({
        part1: p1,
        part2: p2,
        comp2Level: 5,
        comp3: c3,
      });
    } else if (target === 'supervisor' && canEditSupervisor) {
      setSupervisorScores({
        part1: p1,
        part2: p2,
        comp2Level: 5,
        comp3: c3,
      });
    }
  };

  // Save / Submit Handlers
  const handleSave = async (action: 'save_self' | 'submit_self' | 'save_supervisor' | 'finalize_evaluation' | 'acknowledge') => {
    try {
      setIsSaving(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const payload = {
        staffId,
        fiscalYear,
        roundNumber,
        templateKey,
        part1Snapshot,
        selfScores,
        supervisorScores,
        supervisorComment,
        action,
      };

      const res = await fetch('/api/admin/evaluations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      }

      setStatus(json.data.status);
      setSuccessMsg(json.message || 'บันทึกสำเร็จ');

      const finalGrand = json.data.supervisor_total || json.data.self_total || liveSupervisorCalc.grandTotal;
      const finalRating = json.data.rating_level || liveSupervisorCalc.ratingLevel;

      if (onSaved) {
        onSaved(json.data.status, finalGrand, finalRating);
      }

      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'บันทึกข้อมูลไม่สำเร็จ');
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'evaluated':
      case 'acknowledged':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>ผอ.ประเมินแล้ว</span>
          </span>
        );
      case 'self_submitted':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
            <Send className="w-3.5 h-3.5" />
            <span>ประเมินตนเองแล้ว</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <Clock className="w-3.5 h-3.5" />
            <span>แบบร่าง (ยังไม่ประเมิน)</span>
          </span>
        );
    }
  };

  const getRatingBadge = (rating: RatingLevel) => {
    switch (rating) {
      case 'ดีเด่น':
        return 'bg-emerald-600 text-white';
      case 'ดีมาก':
        return 'bg-sky-600 text-white';
      case 'ดี':
        return 'bg-teal-600 text-white';
      case 'พอใช้':
        return 'bg-amber-500 text-white';
      default:
        return 'bg-rose-500 text-white';
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[480px] p-8 text-center space-y-3">
        <div className="w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-600 dark:text-slate-400">
          กำลังเตรียมข้อมูลและเชื่อมโยงสถิติวันลา/ภาระงานสอน...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col bg-slate-50 dark:bg-[#0f172a] text-slate-900 dark:text-slate-100 min-h-screen">
      {/* ------------------------------------------------------------------ */}
      {/* 1. TOP HEADER & WORKSPACE TITLE                                   */}
      {/* ------------------------------------------------------------------ */}
      <div className="sticky top-0 z-30 bg-white/95 dark:bg-[#141d27]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3.5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400">
              <FileCheck className="w-5 h-5 shrink-0" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
                  {template.title}
                </h1>
                {getStatusBadge(status)}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                <span>ผู้รับการประเมิน: <strong>{part1Snapshot.evaluateeName || '-'}</strong></span>
                <span>·</span>
                <span>ตำแหน่ง: {part1Snapshot.position || '-'} ({part1Snapshot.academicStanding || '-'})</span>
                <span>·</span>
                <span>ปีงบประมาณ {fiscalYear} รอบที่ {roundNumber}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                ปิดหน้าต่าง
              </button>
            )}
          </div>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="mt-3 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mt-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* 2. TAB STEPPER NAVIGATION                                         */}
        {/* ------------------------------------------------------------------ */}
        <div className="flex items-center gap-1 mt-3 overflow-x-auto pb-1 text-xs no-scrollbar border-t border-slate-100 dark:border-slate-800/60 pt-2">
          {[
            { id: 1, label: '๑. ข้อมูลทั่วไปและวันลา' },
            { id: 2, label: '๒. องค์ประกอบที่ ๑ (มาตรฐานตำแหน่ง ๘๐)' },
            { id: 3, label: '๓. องค์ประกอบที่ ๒ (การมีส่วนร่วม ๑๐)' },
            { id: 4, label: '๔. องค์ประกอบที่ ๓ (วินัย/จรรยาบรรณ ๑๐)' },
            { id: 5, label: '๕. สรุปผลและการลงนาม' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 3. STICKY LIVE SCORE SUMMARY BAR                                  */}
      {/* ------------------------------------------------------------------ */}
      <div className="bg-slate-100 dark:bg-[#182330] border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-2.5 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 sm:gap-6 flex-wrap">
            <div className="flex items-center gap-1.5 font-medium">
              <span className="text-slate-500 dark:text-slate-400">องค์ประกอบ ๑:</span>
              <span className="font-mono text-slate-900 dark:text-white">
                {liveSelfCalc.component1.totalComponent1} / 80
              </span>
              {canEditSupervisor && (
                <span className="font-mono text-sky-600 dark:text-sky-400 text-[11px]">
                  (ผอ: {liveSupervisorCalc.component1.totalComponent1})
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 font-medium">
              <span className="text-slate-500 dark:text-slate-400">องค์ประกอบ ๒:</span>
              <span className="font-mono text-slate-900 dark:text-white">
                {liveSelfCalc.component2.score} / 10
              </span>
              {canEditSupervisor && (
                <span className="font-mono text-sky-600 dark:text-sky-400 text-[11px]">
                  (ผอ: {liveSupervisorCalc.component2.score})
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 font-medium">
              <span className="text-slate-500 dark:text-slate-400">องค์ประกอบ ๓:</span>
              <span className="font-mono text-slate-900 dark:text-white">
                {liveSelfCalc.component3.score} / 10
              </span>
              {canEditSupervisor && (
                <span className="font-mono text-sky-600 dark:text-sky-400 text-[11px]">
                  (ผอ: {liveSupervisorCalc.component3.score})
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 dark:text-slate-400 font-medium">คะแนนรวมสุทธิ:</span>
              <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                {canEditSupervisor ? liveSupervisorCalc.grandTotal : liveSelfCalc.grandTotal} / 100
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-semibold ${getRatingBadge(
                  canEditSupervisor ? liveSupervisorCalc.ratingLevel : liveSelfCalc.ratingLevel
                )}`}
              >
                {canEditSupervisor ? liveSupervisorCalc.ratingLevel : liveSelfCalc.ratingLevel}
              </span>
            </div>

            {canEditSupervisor && (
              <div className="hidden sm:flex items-center gap-1.5 pl-3 border-l border-slate-300 dark:border-slate-700">
                <button
                  type="button"
                  onClick={handleCopySelfToSupervisor}
                  className="px-2 py-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[11px] hover:bg-slate-50 flex items-center gap-1"
                  title="คัดลอกคะแนนประเมินตนเองมายังช่องผู้บังคับบัญชา"
                >
                  <Copy className="w-3 h-3" />
                  <span>คัดลอกคะแนนตนเอง</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSetAllLevel4('supervisor')}
                  className="px-2 py-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[11px] hover:bg-slate-50"
                  title="กำหนดระดับ 4 ทุกข้อ"
                >
                  เต็ม 4 ทุกข้อ
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 4. MAIN TAB CONTENT AREA                                           */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 space-y-6 pb-24">
        {/* ================================================================ */}
        {/* TAB 1: ส่วนที่ ๑ ข้อมูลของผู้ขอรับการประเมิน (AUTO-FILLED)       */}
        {/* ================================================================ */}
        {activeTab === 1 && (
          <div className="bg-white dark:bg-[#141d27] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <User className="w-4 h-4 text-sky-600" />
                <span>ส่วนที่ ๑ : ข้อมูลของผู้ขอรับการประเมิน</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                ระบบดึงข้อมูลพื้นฐานจากทะเบียนประวัติครู ภาระงานสอน และสถิติวันลาในรอบการประเมินให้อัตโนมัติ
              </p>
            </div>

            {/* รอบการประเมิน */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                รอบการประเมิน
              </label>
              <div className="flex flex-wrap items-center gap-6 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="roundSelection"
                    checked={roundNumber === 1}
                    disabled
                    className="accent-sky-600"
                  />
                  <span>ครั้งที่ ๑ (๑ ตุลาคม {fiscalYear - 1} – ๓๑ มีนาคม {fiscalYear})</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="roundSelection"
                    checked={roundNumber === 2}
                    disabled
                    className="accent-sky-600"
                  />
                  <span>ครั้งที่ ๒ (๑ เมษายน {fiscalYear} – ๓๐ กันยายน {fiscalYear})</span>
                </label>
              </div>
            </div>

            {/* ข้อมูลทั่วไป */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1">ชื่อผู้รับการประเมิน</label>
                <input
                  type="text"
                  value={part1Snapshot.evaluateeName || ''}
                  onChange={(e) => setPart1Snapshot({ ...part1Snapshot, evaluateeName: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1">ตำแหน่ง</label>
                <input
                  type="text"
                  value={part1Snapshot.position || ''}
                  onChange={(e) => setPart1Snapshot({ ...part1Snapshot, position: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1">วิทยฐานะ</label>
                <input
                  type="text"
                  value={part1Snapshot.academicStanding || ''}
                  onChange={(e) => setPart1Snapshot({ ...part1Snapshot, academicStanding: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1">เงินเดือนปัจจุบัน (บาท)</label>
                <input
                  type="number"
                  value={part1Snapshot.currentSalary || ''}
                  onChange={(e) =>
                    setPart1Snapshot({ ...part1Snapshot, currentSalary: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 font-mono text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1">สถานศึกษา</label>
                <input
                  type="text"
                  value={part1Snapshot.schoolName || 'โรงเรียนชุมชนบ้านตะขบ'}
                  onChange={(e) => setPart1Snapshot({ ...part1Snapshot, schoolName: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1">สังกัด</label>
                <input
                  type="text"
                  value={part1Snapshot.affiliation || 'สำนักงานเขตพื้นที่การศึกษาประถมศึกษานครราชสีมา เขต 3'}
                  onChange={(e) => setPart1Snapshot({ ...part1Snapshot, affiliation: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* ภาระงานสอน */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-3">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                ภาระงานสอนตามตารางสอน (ดึงจากระบบภาระงานสอน)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-slate-500 mb-1">สอนระดับชั้น</label>
                  <input
                    type="text"
                    value={part1Snapshot.teachingGrade || ''}
                    onChange={(e) => setPart1Snapshot({ ...part1Snapshot, teachingGrade: e.target.value })}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">รายวิชา</label>
                  <input
                    type="text"
                    value={part1Snapshot.teachingSubject || ''}
                    onChange={(e) => setPart1Snapshot({ ...part1Snapshot, teachingSubject: e.target.value })}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">ชั่วโมงการสอน/สัปดาห์</label>
                  <input
                    type="number"
                    value={part1Snapshot.teachingHoursPerWeek || ''}
                    onChange={(e) =>
                      setPart1Snapshot({
                        ...part1Snapshot,
                        teachingHoursPerWeek: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* สถิติวันลาในรอบการประเมิน (LIVE LEAVE STATS) */}
            <div className="p-4 rounded-xl bg-sky-50/50 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-sky-900 dark:text-sky-300">
                  จำนวนวันลาในรอบการประเมิน (คำนวณจากระบบใบลาที่อนุมัติแล้ว)
                </span>
                <span className="text-xs font-mono font-bold text-sky-700 dark:text-sky-400">
                  รวมวันลาทั้งหมด: {part1Snapshot.leaveStats?.totalDays ?? 0} วัน
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500 block mb-1">๑) ลาป่วย</span>
                  <div className="flex items-center justify-between font-mono">
                    <span>{part1Snapshot.leaveStats?.sickCount ?? 0} ครั้ง</span>
                    <span className="font-bold">{part1Snapshot.leaveStats?.sickDays ?? 0} วัน</span>
                  </div>
                </div>

                <div className="p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500 block mb-1">๒) ลากิจ</span>
                  <div className="flex items-center justify-between font-mono">
                    <span>{part1Snapshot.leaveStats?.businessCount ?? 0} ครั้ง</span>
                    <span className="font-bold">{part1Snapshot.leaveStats?.businessDays ?? 0} วัน</span>
                  </div>
                </div>

                <div className="p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500 block mb-1">
                    ๓) ลาอื่น ๆ {part1Snapshot.leaveStats?.otherTypes ? `(${part1Snapshot.leaveStats.otherTypes})` : ''}
                  </span>
                  <div className="flex items-center justify-between font-mono">
                    <span>{part1Snapshot.leaveStats?.otherCount ?? 0} ครั้ง</span>
                    <span className="font-bold">{part1Snapshot.leaveStats?.otherDays ?? 0} วัน</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ข้อมูลผู้ประเมิน */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2 border-t border-slate-200 dark:border-slate-800">
              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1">ชื่อผู้ประเมิน (ผู้บังคับบัญชา)</label>
                <input
                  type="text"
                  value={part1Snapshot.evaluatorName || ''}
                  onChange={(e) => setPart1Snapshot({ ...part1Snapshot, evaluatorName: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1">ตำแหน่งผู้ประเมิน</label>
                <input
                  type="text"
                  value={part1Snapshot.evaluatorPosition || ''}
                  onChange={(e) => setPart1Snapshot({ ...part1Snapshot, evaluatorPosition: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end pt-3">
              <button
                type="button"
                onClick={() => setActiveTab(2)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs transition-colors"
              >
                <span>ถัดไป: องค์ประกอบที่ ๑</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* TAB 2: องค์ประกอบที่ ๑ มาตรฐานตำแหน่ง (& ประเด็นท้าทาย)            */}
        {/* ================================================================ */}
        {activeTab === 2 && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-[#141d27] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Award className="w-4 h-4 text-sky-600" />
                    <span>{template.component1.title}</span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {template.component1.part1.title}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-mono">
                    คะแนนตอนที่ ๑: <strong>{liveSelfCalc.component1.part1Score}</strong> /{' '}
                    {template.component1.part1.maxScore}
                  </span>
                </div>
              </div>

              {/* วนลูปแสดงแต่ละด้าน (Domains) และตัวชี้วัด (Indicators) */}
              <div className="space-y-6">
                {template.component1.part1.domains.map((domain) => (
                  <div key={domain.id} className="space-y-3">
                    <div className="bg-slate-100/80 dark:bg-slate-800/80 px-3.5 py-2 rounded-lg font-semibold text-xs text-slate-800 dark:text-slate-200">
                      {domain.name}
                    </div>

                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {domain.indicators.map((ind) => {
                        const selfVal = selfScores.part1?.[ind.id] || 0;
                        const superVal = supervisorScores.part1?.[ind.id] || 0;

                        return (
                          <div
                            key={ind.id}
                            className="py-3 px-1 sm:px-2 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 rounded-xl transition-colors"
                          >
                            <div className="space-y-1 max-w-xl">
                              <div className="font-semibold text-xs text-slate-900 dark:text-white">
                                {ind.code} {ind.name}
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                {ind.description}
                              </p>
                            </div>

                            <div className="flex items-center gap-4 shrink-0 self-end md:self-center">
                              {/* ช่องคะแนนตนเอง */}
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-[10px] font-medium text-slate-500">ประเมินตนเอง</span>
                                <div className="flex items-center gap-1">
                                  {[1, 2, 3, 4].map((score) => (
                                    <button
                                      key={score}
                                      type="button"
                                      disabled={!canEditSelf}
                                      onClick={() => updateSelfScore('part1', ind.id, score)}
                                      className={`w-7 h-7 rounded-md font-mono text-xs font-semibold transition-all ${
                                        selfVal === score
                                          ? 'bg-sky-600 text-white shadow-xs'
                                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                      } ${!canEditSelf ? 'opacity-70 cursor-not-allowed' : ''}`}
                                    >
                                      {score}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* ช่องคะแนนผู้บังคับบัญชา */}
                              <div className="flex flex-col items-center gap-1 pl-3 border-l border-slate-200 dark:border-slate-800">
                                <span className="text-[10px] font-medium text-sky-600 dark:text-sky-400 flex items-center gap-1">
                                  {!canEditSupervisor && <Lock className="w-2.5 h-2.5" />}
                                  <span>ผอ. ประเมิน</span>
                                </span>
                                <div className="flex items-center gap-1">
                                  {[1, 2, 3, 4].map((score) => (
                                    <button
                                      key={score}
                                      type="button"
                                      disabled={!canEditSupervisor}
                                      onClick={() => updateSupervisorScore('part1', ind.id, score)}
                                      className={`w-7 h-7 rounded-md font-mono text-xs font-semibold transition-all ${
                                        superVal === score
                                          ? 'bg-emerald-600 text-white shadow-xs'
                                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                      } ${!canEditSupervisor ? 'opacity-60 cursor-not-allowed' : ''}`}
                                    >
                                      {score}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ตอนที่ ๒ : ประเด็นท้าทาย (สำหรับแบบ 2, 3, 4, 5, 6) */}
            {template.hasChallengePart && template.component1.part2 && (
              <div className="bg-white dark:bg-[#141d27] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Award className="w-4 h-4 text-emerald-600" />
                      <span>{template.component1.part2.title}</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      เกณฑ์การให้คะแนน: ระดับ ๑=๒๕%, ระดับ ๒=๕๐%, ระดับ ๓=๗๕%, ระดับ ๔=๑๐๐% (สูตร: คะแนนรวม × ๒๐ / ๔๐)
                    </p>
                  </div>
                  <span className="text-xs font-mono font-medium text-slate-600 dark:text-slate-300">
                    คะแนนตอนที่ ๒: <strong>{liveSelfCalc.component1.part2Score}</strong> / 20
                  </span>
                </div>

                <div className="space-y-4">
                  {template.component1.part2.items.map((item) => {
                    const selfLvl = (selfScores.part2?.[item.id] as 1 | 2 | 3 | 4 | undefined) || 0;
                    const superLvl = (supervisorScores.part2?.[item.id] as 1 | 2 | 3 | 4 | undefined) || 0;

                    return (
                      <div
                        key={item.id}
                        className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3"
                      >
                        <div className="space-y-1 max-w-xl">
                          <div className="font-semibold text-xs text-slate-900 dark:text-white">
                            ข้อ {item.code} {item.name} (เต็ม {item.maxScore} คะแนน)
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {item.description}
                          </p>
                        </div>

                        <div className="flex items-center gap-4 shrink-0 self-end md:self-center">
                          {/* ตนเอง */}
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-[10px] text-slate-500">
                              ตนเอง ({selfLvl > 0 ? `${item.levelScores[selfLvl as 1 | 2 | 3 | 4]} คะแนน` : '-'})
                            </span>
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4].map((lvl) => (
                                <button
                                  key={lvl}
                                  type="button"
                                  disabled={!canEditSelf}
                                  onClick={() => updateSelfScore('part2', item.id, lvl)}
                                  className={`w-7 h-7 rounded-md font-mono text-xs font-semibold ${
                                    selfLvl === lvl
                                      ? 'bg-sky-600 text-white'
                                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                                  }`}
                                >
                                  {lvl}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* ผู้บังคับบัญชา */}
                          <div className="flex flex-col items-center gap-1 pl-3 border-l border-slate-200 dark:border-slate-800">
                            <span className="text-[10px] text-sky-600 dark:text-sky-400">
                              ผอ. ({superLvl > 0 ? `${item.levelScores[superLvl as 1 | 2 | 3 | 4]} คะแนน` : '-'})
                            </span>
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4].map((lvl) => (
                                <button
                                  key={lvl}
                                  type="button"
                                  disabled={!canEditSupervisor}
                                  onClick={() => updateSupervisorScore('part2', item.id, lvl)}
                                  className={`w-7 h-7 rounded-md font-mono text-xs font-semibold ${
                                    superLvl === lvl
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                                  }`}
                                >
                                  {lvl}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setActiveTab(1)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-xs transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>ย้อนกลับ: ส่วนที่ ๑</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab(3)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs transition-colors"
              >
                <span>ถัดไป: องค์ประกอบที่ ๒</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* TAB 3: องค์ประกอบที่ ๒ การมีส่วนร่วมในการพัฒนาการศึกษา (10 คะแนน)  */}
        {/* ================================================================ */}
        {activeTab === 3 && (
          <div className="bg-white dark:bg-[#141d27] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-6">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-sky-600" />
                <span>{COMPONENT_2_CONFIG.title} (๑๐ คะแนน)</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                พิจารณาจากปริมาณงานที่ได้รับมอบหมายจากผู้บังคับบัญชาแล้วเสร็จ (คะแนนที่ได้ = ระดับการประเมิน × ค่าน้ำหนัก ๒)
              </p>
            </div>

            <div className="space-y-4">
              <div className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                {COMPONENT_2_CONFIG.indicator.name} (ค่าน้ำหนัก ๒)
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {COMPONENT_2_CONFIG.indicator.levels.map((lvl) => {
                  const isSelfSelected = (selfScores.comp2Level || 0) === lvl.level;
                  const isSuperSelected = (supervisorScores.comp2Level || 0) === lvl.level;

                  return (
                    <div
                      key={lvl.level}
                      className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-4 ${
                        isSelfSelected || isSuperSelected
                          ? 'border-sky-300 dark:border-sky-800 bg-sky-50/40 dark:bg-sky-950/20'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="text-xs font-semibold text-slate-900 dark:text-white">
                          ระดับ {lvl.level} : {lvl.label} (คิดเป็น {lvl.score} คะแนน)
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {lvl.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                          <input
                            type="radio"
                            name="comp2SelfLevel"
                            checked={isSelfSelected}
                            disabled={!canEditSelf}
                            onChange={() => setSelfScores({ ...selfScores, comp2Level: lvl.level })}
                            className="accent-sky-600"
                          />
                          <span className="text-[11px] text-slate-600 dark:text-slate-400">ตนเอง</span>
                        </label>

                        <label className="flex items-center gap-1.5 text-xs cursor-pointer pl-2 border-l border-slate-200 dark:border-slate-800">
                          <input
                            type="radio"
                            name="comp2SuperLevel"
                            checked={isSuperSelected}
                            disabled={!canEditSupervisor}
                            onChange={() =>
                              setSupervisorScores({ ...supervisorScores, comp2Level: lvl.level })
                            }
                            className="accent-emerald-600"
                          />
                          <span className="text-[11px] text-sky-600 dark:text-sky-400">ผอ.</span>
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab(2)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-xs transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>ย้อนกลับ: องค์ประกอบที่ ๑</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab(4)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs transition-colors"
              >
                <span>ถัดไป: องค์ประกอบที่ ๓</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* TAB 4: องค์ประกอบที่ ๓ วินัย คุณธรรม จริยธรรม (10 คะแนน)           */}
        {/* ================================================================ */}
        {activeTab === 4 && (
          <div className="bg-white dark:bg-[#141d27] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-sky-600" />
                  <span>{COMPONENT_3_CONFIG.title} (๑๐ คะแนน)</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  ประเมิน ๑๐ รายการ (คะแนนเต็ม ๔๐ แปลงเป็น ๑๐ คะแนน โดยนำคะแนนรวมหารด้วย ๔)
                </p>
              </div>

              <span className="text-xs font-mono font-medium text-slate-600 dark:text-slate-300">
                คะแนนรวม: <strong>{liveSelfCalc.component3.score}</strong> / 10
              </span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {COMPONENT_3_CONFIG.items.map((item) => {
                const selfVal = selfScores.comp3?.[item.id] || 0;
                const superVal = supervisorScores.comp3?.[item.id] || 0;

                return (
                  <div
                    key={item.id}
                    className="py-3 px-1 sm:px-2 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 rounded-xl transition-colors"
                  >
                    <div className="max-w-xl">
                      <span className="font-semibold text-slate-900 dark:text-white block">
                        ข้อ {item.no}. {item.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 shrink-0 self-end md:self-center">
                      {/* ตนเอง */}
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-[10px] text-slate-500">ประเมินตนเอง</span>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4].map((score) => (
                            <button
                              key={score}
                              type="button"
                              disabled={!canEditSelf}
                              onClick={() => updateSelfScore('comp3', item.id, score)}
                              className={`w-7 h-7 rounded-md font-mono text-xs font-semibold ${
                                selfVal === score
                                  ? 'bg-sky-600 text-white'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              {score}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* ผู้บังคับบัญชา */}
                      <div className="flex flex-col items-center gap-1 pl-3 border-l border-slate-200 dark:border-slate-800">
                        <span className="text-[10px] text-sky-600 dark:text-sky-400">ผอ.</span>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4].map((score) => (
                            <button
                              key={score}
                              type="button"
                              disabled={!canEditSupervisor}
                              onClick={() => updateSupervisorScore('comp3', item.id, score)}
                              className={`w-7 h-7 rounded-md font-mono text-xs font-semibold ${
                                superVal === score
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              {score}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab(3)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-xs transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>ย้อนกลับ: องค์ประกอบที่ ๒</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab(5)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs transition-colors"
              >
                <span>ถัดไป: สรุปผลการประเมิน</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* TAB 5: สรุปผลการประเมิน (ส่วนที่ ๒–๔) และการลงนาม                  */}
        {/* ================================================================ */}
        {activeTab === 5 && (
          <div className="bg-white dark:bg-[#141d27] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-sky-600" />
                <span>ส่วนที่ ๒ : สรุปผลการประเมิน</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                เปรียบเทียบคะแนนเต็ม คะแนนประเมินตนเอง และคะแนนของผู้บังคับบัญชา
              </p>
            </div>

            {/* ตารางสรุป 3 องค์ประกอบ */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">องค์ประกอบการประเมิน</th>
                    <th className="py-2.5 px-3 font-semibold text-center w-24">คะแนนเต็ม</th>
                    <th className="py-2.5 px-3 font-semibold text-center w-32">คะแนนประเมินตนเอง</th>
                    <th className="py-2.5 px-3 font-semibold text-center w-32">คะแนนประเมิน ผอ.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  <tr>
                    <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                      องค์ประกอบที่ ๑ การประเมินประสิทธิภาพและประสิทธิผลการปฏิบัติงานตามมาตรฐานตำแหน่ง
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-slate-500">๘๐</td>
                    <td className="py-3 px-3 text-center font-mono font-semibold text-slate-900 dark:text-white">
                      {liveSelfCalc.component1.totalComponent1}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-semibold text-sky-600 dark:text-sky-400">
                      {liveSupervisorCalc.component1.totalComponent1}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                      องค์ประกอบที่ ๒ การประเมินการมีส่วนร่วมในการพัฒนาการศึกษา
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-slate-500">๑๐</td>
                    <td className="py-3 px-3 text-center font-mono font-semibold text-slate-900 dark:text-white">
                      {liveSelfCalc.component2.score}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-semibold text-sky-600 dark:text-sky-400">
                      {liveSupervisorCalc.component2.score}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                      องค์ประกอบที่ ๓ การประเมินการปฏิบัติตนในการรักษาวินัย คุณธรรม จริยธรรม และจรรยาบรรณวิชาชีพ
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-slate-500">๑๐</td>
                    <td className="py-3 px-3 text-center font-mono font-semibold text-slate-900 dark:text-white">
                      {liveSelfCalc.component3.score}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-semibold text-sky-600 dark:text-sky-400">
                      {liveSupervisorCalc.component3.score}
                    </td>
                  </tr>
                  <tr className="bg-slate-50/80 dark:bg-slate-900/60 font-bold">
                    <td className="py-3 px-4 text-slate-900 dark:text-white">คะแนนรวมสุทธิ</td>
                    <td className="py-3 px-3 text-center font-mono text-slate-500">๑๐๐</td>
                    <td className="py-3 px-3 text-center font-mono text-base text-slate-900 dark:text-white">
                      {liveSelfCalc.grandTotal}
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-base text-sky-600 dark:text-sky-400">
                      {liveSupervisorCalc.grandTotal}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* ส่วนที่ ๓ : ผลการประเมินและความเห็นของผู้บังคับบัญชา */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
              <h3 className="font-bold text-xs text-slate-900 dark:text-white">
                ส่วนที่ ๓ : ผลการประเมินและความเห็นของผู้บังคับบัญชา
              </h3>

              {/* 5 ระดับเกณฑ์ ก.ค.ศ. */}
              <div className="space-y-1.5 text-xs">
                <span className="text-slate-500 block mb-1">ระดับผลการประเมิน (๕ ระดับ):</span>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { label: 'ดีเด่น', range: 'ร้อยละ ๙๐.๐๐ ขึ้นไป', active: liveSupervisorCalc.grandTotal >= 90 },
                    { label: 'ดีมาก', range: 'ร้อยละ ๘๐.๐๐ – ๘๙.๙๙', active: liveSupervisorCalc.grandTotal >= 80 && liveSupervisorCalc.grandTotal < 90 },
                    { label: 'ดี', range: 'ร้อยละ ๗๐.๐๐ – ๗๙.๙๙', active: liveSupervisorCalc.grandTotal >= 70 && liveSupervisorCalc.grandTotal < 80 },
                    { label: 'พอใช้', range: 'ร้อยละ ๖๐.๐๐ – ๖๙.๙๙', active: liveSupervisorCalc.grandTotal >= 60 && liveSupervisorCalc.grandTotal < 70 },
                    { label: 'ปรับปรุง', range: 'ร้อยละ ๕๙.๙๙ ลงมา', active: liveSupervisorCalc.grandTotal < 60 },
                  ].map((tier) => (
                    <div
                      key={tier.label}
                      className={`p-2.5 rounded-lg border text-center transition-all ${
                        tier.active
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 font-bold shadow-xs'
                          : 'border-slate-200 dark:border-slate-800 text-slate-400 opacity-60'
                      }`}
                    >
                      <div className="text-xs">{tier.label}</div>
                      <div className="text-[10px] opacity-80">{tier.range}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ความเห็นของผู้บังคับบัญชา */}
              <div className="space-y-1 text-xs">
                <label className="block text-slate-600 dark:text-slate-400 font-medium">
                  ๓.๒ ความเห็นของผู้บังคับบัญชา
                </label>
                <textarea
                  rows={3}
                  disabled={!canEditSupervisor}
                  value={supervisorComment}
                  onChange={(e) => setSupervisorComment(e.target.value)}
                  placeholder={
                    canEditSupervisor
                      ? 'ระบุความเห็นและข้อเสนอแนะในการปฏิบัติงานเพื่อประกอบการเลื่อนขั้นเงินเดือน...'
                      : 'ผู้บังคับบัญชายังไม่ได้ระบุความเห็น'
                  }
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            {/* ส่วนที่ ๔ : การรับทราบผลการประเมินและการลงนาม */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 bg-slate-50/50 dark:bg-slate-900/30">
                <span className="font-semibold text-slate-700 dark:text-slate-300 block">
                  ๓.๑ การลงนามประเมินตนเอง
                </span>
                <p className="text-[11px] text-slate-500">
                  ข้าพเจ้าขอรับรองว่าได้ประเมินตนเองตรงตามความเป็นจริง
                </p>
                <div className="pt-2 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                  <div>ลงชื่อ: <strong>{part1Snapshot.evaluateeName || '-'}</strong> (ผู้รับการประเมิน)</div>
                  <div>วันที่: {part1Snapshot.selfSignedAt ? new Date(part1Snapshot.selfSignedAt).toLocaleDateString('th-TH') : 'ยังไม่ได้ลงนาม'}</div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 bg-slate-50/50 dark:bg-slate-900/30">
                <span className="font-semibold text-slate-700 dark:text-slate-300 block">
                  ๓.๒ การลงนามของผู้บังคับบัญชา
                </span>
                <p className="text-[11px] text-slate-500">
                  ผลการประเมินและข้อคิดเห็นได้รับการกลั่นกรองตามระเบียบ
                </p>
                <div className="pt-2 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                  <div>ลงชื่อ: <strong>{part1Snapshot.evaluatorName || '-'}</strong> (ผู้ประเมิน)</div>
                  <div>ตำแหน่ง: {part1Snapshot.evaluatorPosition || '-'}</div>
                </div>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab(4)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-xs transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>ย้อนกลับ: องค์ประกอบที่ ๓</span>
              </button>

              <div className="flex items-center gap-2 flex-wrap">
                {/* ครู: บันทึกแบบร่างประเมินตนเอง */}
                {canEditSelf && status === 'draft' && (
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => handleSave('save_self')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 text-xs font-medium transition-colors"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>บันทึกแบบร่างตนเอง</span>
                  </button>
                )}

                {/* ครู: บันทึกและส่งแบบประเมินตนเอง */}
                {canEditSelf && (status === 'draft' || status === 'self_submitted') && (
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => handleSave('submit_self')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium shadow-xs transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{status === 'self_submitted' ? 'อัปเดตและยืนยันส่งประเมินตนเอง' : 'บันทึกและส่งแบบประเมินตนเอง'}</span>
                  </button>
                )}

                {/* ผอ./Admin: บันทึกและอนุมัติผลประเมินอย่างเป็นทางการ */}
                {canEditSupervisor && (
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => handleSave('finalize_evaluation')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium shadow-xs transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>บันทึกและอนุมัติผลประเมิน (ผอ.)</span>
                  </button>
                )}

                {/* รับทราบผลการประเมิน */}
                {isSelf && status === 'evaluated' && (
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => handleSave('acknowledge')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-medium shadow-xs transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>ลงนามรับทราบผลการประเมิน</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
