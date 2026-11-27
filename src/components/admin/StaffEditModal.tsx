'use client';

/**
 * ============================================================================
 * ManStat: StaffEditModal (ตั้งค่าและแก้ไขบุคลากร — Fixed-Height 2×2 Core Tabs)
 * ============================================================================
 * Official Thai Civil-Service HR Standard:
 * - Fixed middle container height (h-[460px] sm:h-[500px]) -> ZERO UI jumping
 * - 4 equal-width tabs in a 2×2 grid with dirty-tab indicators:
 *   1. ข้อมูลส่วนตัว (Identity + Birth Date/Age/Retirement + Contact/Emergency + Thai Address)
 *   2. ตำแหน่งและสังกัด (Position + Position No + Multi-Division + Smart Khurusapha + Dates)
 *   3. วุฒิการศึกษาและวิชาเอก (ก.ค.ศ. 4-field Highest Qualification + 105+ Majors Combobox + History)
 *   4. บัญชีและสิทธิ์ระบบ (Employee Code + Access Level + Danger Zone)
 * - Portal ThaiDatePicker & Portal SearchableCombobox (zero clipping).
 * - PDPA compliant (no religion / blood type). Arabic numerals (0-9). Dual Theme.
 * ============================================================================
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  UserCheck,
  Users,
  Briefcase,
  GraduationCap,
  ShieldCheck,
  X,
  Save,
  Loader2,
  Trash2,
  Plus,
  Pencil,
  Check,
  ChevronRight,
  AlertTriangle,
  Lock,
  Unlock,
  ExternalLink,
} from 'lucide-react';
import type { TeacherRecord, WorkloadItem } from '@/lib/data/schoolData';
import { ThaiDatePicker } from '@/components/ui/ThaiDatePicker';
import { SearchableCombobox } from '@/components/ui/SearchableCombobox';
import { formatStaffName } from '@/lib/regulations/staff-formatting';
import { calculateRetirementInfo } from '@/lib/regulations/fiscal-and-retirement';
import {
  MAJOR_GROUPS,
  CUSTOM_MAJOR_OPTION,
  isStandardMajor,
} from '@/lib/constants/majors';
import {
  CUSTOM_OPTION_LABEL,
  KHURUSAPHA_MEMBER_TYPES,
  EDUCATION_LEVELS,
  getProgramYearsForLevel,
  getDegreesForLevel,
} from '@/lib/constants/qualifications';
import {
  getThaiProvinces,
  getDistrictsByProvince,
  getSubdistrictsByDistrict,
  getPostalCode,
} from '@/lib/constants/thaiAddress';
import { getStaffDivisions } from '@/lib/staffDivisions';

export type StaffModalTabKey = 'personal' | 'position' | 'education' | 'account';
export type StaffQuickJumpView = 'workload' | 'dir_standing' | 'dir_license' | 'dir_scout';

export interface StaffEditModalProps {
  isOpen: boolean;
  isNewStaff: boolean;
  isSaving: boolean;
  staff: TeacherRecord | null;
  workloads: WorkloadItem[];
  activeTab: StaffModalTabKey;
  dirtyTabs: Record<StaffModalTabKey, boolean>;
  isCustomMajor: boolean;
  teacherRoles: string[];
  departments: string[];
  activeClasses: string[];
  deriveEmploymentType: (t: TeacherRecord) => 'civil_servant' | 'government_employee' | 'temporary_employee';
  onTabChange: (tab: StaffModalTabKey) => void;
  onChangeStaff: (updated: TeacherRecord) => void;
  onChangeCustomMajor: (isCustom: boolean) => void;
  onNavigateToView: (view: StaffQuickJumpView, staffKey?: string) => void;
  onDeleteStaff: (staffId: string) => void;
  onSave: () => void;
  onClose: () => void;
}

const MODAL_TABS: Array<{
  key: StaffModalTabKey;
  label: string;
  icon: React.ElementType;
}> = [
  { key: 'personal', label: 'ข้อมูลส่วนตัว', icon: Users },
  { key: 'position', label: 'ตำแหน่งและสังกัด', icon: Briefcase },
  { key: 'education', label: 'วุฒิการศึกษาและวิชาเอก', icon: GraduationCap },
  { key: 'account', label: 'บัญชีและสิทธิ์ระบบ', icon: ShieldCheck },
];

function computeAgeYears(birthDateStr?: string | null): number | null {
  if (!birthDateStr || !/^\d{4}-\d{2}-\d{2}$/.test(birthDateStr)) return null;
  const [y, m, d] = birthDateStr.split('-').map((n) => parseInt(n, 10));
  const today = new Date();
  let age = today.getFullYear() - y;
  const monthDiff = today.getMonth() + 1 - m;
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < d)) {
    age -= 1;
  }
  return age >= 0 ? age : null;
}

export const StaffEditModal: React.FC<StaffEditModalProps> = ({
  isOpen,
  isNewStaff,
  isSaving,
  staff,
  workloads,
  activeTab,
  dirtyTabs,
  isCustomMajor,
  teacherRoles,
  departments,
  activeClasses,
  deriveEmploymentType,
  onTabChange,
  onChangeStaff,
  onChangeCustomMajor,
  onNavigateToView,
  onDeleteStaff,
  onSave,
  onClose,
}) => {
  // Khurusapha manual override unlock state (only applies when type === 'สมาชิกสามัญ')
  const [isKhurusaphaUnlocked, setIsKhurusaphaUnlocked] = useState(false);

  // Custom-input flags for Tab 3 Program Years & Degree
  const [isCustomProgramYears, setIsCustomProgramYears] = useState(false);
  const [isCustomDegree, setIsCustomDegree] = useState(false);

  // Local state for education history add/edit sub-form inside Tab 3
  const [newEduDegree, setNewEduDegree] = useState('ค.บ.');
  const [newEduMajor, setNewEduMajor] = useState('');
  const [newEduInst, setNewEduInst] = useState('');
  const [newEduYear, setNewEduYear] = useState('');
  const [editingEduIdx, setEditingEduIdx] = useState<number | null>(null);

  // Sync local helper flags when modal opens or switches staff
  useEffect(() => {
    if (!isOpen || !staff) {
      setIsKhurusaphaUnlocked(false);
      setIsCustomProgramYears(false);
      setIsCustomDegree(false);
      setEditingEduIdx(null);
      setNewEduDegree('ค.บ.');
      setNewEduMajor('');
      setNewEduInst('');
      setNewEduYear('');
      return;
    }

    const memberType = staff.khurusaphaMemberType || '';
    const memberNo = staff.khurusaphaMemberNo || staff.memberId || '';
    const idCard = staff.idCard || '';
    setIsKhurusaphaUnlocked(
      memberType === 'สมาชิกสามัญ' && Boolean(memberNo) && Boolean(idCard) && memberNo !== idCard
    );

    const yearsOptions = getProgramYearsForLevel(staff.educationLevel);
    setIsCustomProgramYears(
      Boolean(staff.educationProgramYears && !yearsOptions.includes(staff.educationProgramYears))
    );

    const degreeOptions = getDegreesForLevel(staff.educationLevel);
    setIsCustomDegree(
      Boolean(staff.educationDegree && !degreeOptions.includes(staff.educationDegree))
    );
  }, [isOpen, staff?.id]);

  // Escape key to close (disabled while saving)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSaving) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSaving, onClose]);

  // Cascading Thai Geography Lists (100% offline)
  const provinces = useMemo(() => getThaiProvinces(), []);
  const districts = useMemo(
    () => getDistrictsByProvince(staff?.addressProvince),
    [staff?.addressProvince]
  );
  const subdistricts = useMemo(
    () => getSubdistrictsByDistrict(staff?.addressProvince, staff?.addressDistrict),
    [staff?.addressProvince, staff?.addressDistrict]
  );

  // Birth date -> Age + Official Retirement Year badge
  const birthSummary = useMemo(() => {
    if (!staff?.birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(staff.birthDate)) return null;
    try {
      const age = computeAgeYears(staff.birthDate);
      const ret = calculateRetirementInfo(staff.birthDate);
      if (age === null) return null;
      return `อายุ ${age} ปี • เกษียณ 30 ก.ย. พ.ศ. ${ret.retireFiscalYearBE}`;
    } catch {
      return null;
    }
  }, [staff?.birthDate]);

  if (!isOpen || !staff) return null;

  const derivedDivisions = getStaffDivisions(staff, workloads);
  const programYearsOptions = getProgramYearsForLevel(staff.educationLevel);
  const degreeOptions = getDegreesForLevel(staff.educationLevel);
  const khurusaphaType = staff.khurusaphaMemberType || '';
  const isOrdinaryMember = khurusaphaType === 'สมาชิกสามัญ';
  const isNonMember = khurusaphaType === 'ไม่เป็นสมาชิก';

  const handleCitizenIdChange = (nextIdCard: string) => {
    const cleaned = nextIdCard.replace(/[^\d]/g, '').slice(0, 13);
    const next: TeacherRecord = { ...staff, idCard: cleaned };
    // Live-sync Khurusapha number when สมาชิกสามัญ and not manually unlocked
    if (isOrdinaryMember && !isKhurusaphaUnlocked) {
      next.khurusaphaMemberNo = cleaned;
      next.memberId = cleaned;
    }
    onChangeStaff(next);
  };

  const handleKhurusaphaTypeChange = (nextType: string) => {
    if (nextType === 'สมาชิกสามัญ') {
      setIsKhurusaphaUnlocked(false);
      onChangeStaff({
        ...staff,
        khurusaphaMemberType: nextType,
        khurusaphaMemberNo: staff.idCard || '',
        memberId: staff.idCard || '',
      });
    } else if (nextType === 'ไม่เป็นสมาชิก') {
      setIsKhurusaphaUnlocked(false);
      onChangeStaff({
        ...staff,
        khurusaphaMemberType: nextType,
        khurusaphaMemberNo: '',
        memberId: '',
      });
    } else {
      setIsKhurusaphaUnlocked(false);
      onChangeStaff({
        ...staff,
        khurusaphaMemberType: nextType,
      });
    }
  };

  const handleEducationLevelChange = (nextLevel: string) => {
    const validYears = getProgramYearsForLevel(nextLevel);
    const validDegrees = getDegreesForLevel(nextLevel);
    setIsCustomProgramYears(false);
    setIsCustomDegree(false);
    onChangeStaff({
      ...staff,
      educationLevel: nextLevel,
      educationProgramYears:
        staff.educationProgramYears && validYears.includes(staff.educationProgramYears)
          ? staff.educationProgramYears
          : '',
      educationDegree:
        staff.educationDegree && validDegrees.includes(staff.educationDegree)
          ? staff.educationDegree
          : '',
    });
  };

  const handleSaveEducation = () => {
    if (!newEduDegree.trim() && !newEduMajor.trim()) return;
    const entry = {
      degree: newEduDegree.trim() || '-',
      major: newEduMajor.trim() || '-',
      institute: newEduInst.trim() || '-',
      gradYear: newEduYear.trim() || '-',
    };
    const list = [...(staff.educations || [])];
    if (editingEduIdx !== null && editingEduIdx >= 0 && editingEduIdx < list.length) {
      list[editingEduIdx] = entry;
    } else {
      list.push(entry);
    }
    onChangeStaff({ ...staff, educations: list });
    setEditingEduIdx(null);
    setNewEduDegree('ค.บ.');
    setNewEduMajor('');
    setNewEduInst('');
    setNewEduYear('');
  };

  const handleEditEducation = (idx: number) => {
    const item = (staff.educations || [])[idx];
    if (!item) return;
    setEditingEduIdx(idx);
    setNewEduDegree(item.degree || '');
    setNewEduMajor(item.major || '');
    setNewEduInst(item.institute || '');
    setNewEduYear(item.gradYear || '');
  };

  const handleDeleteEducation = (idx: number) => {
    const list = (staff.educations || []).filter((_, i) => i !== idx);
    onChangeStaff({ ...staff, educations: list });
    if (editingEduIdx === idx) {
      setEditingEduIdx(null);
      setNewEduDegree('ค.บ.');
      setNewEduMajor('');
      setNewEduInst('');
      setNewEduYear('');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="staff-edit-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={() => {
        if (!isSaving) onClose();
      }}
    >
      <div
        className="bg-white dark:bg-[#141d27] border border-slate-200/90 dark:border-slate-700 rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl space-y-4 text-xs flex flex-col text-slate-800 dark:text-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header (Fixed) */}
        <div className="flex items-center justify-between border-b border-slate-200/90 dark:border-slate-800 pb-3.5 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 shrink-0">
              <UserCheck className="w-5 h-5 shrink-0" />
            </div>
            <div className="min-w-0">
              <h3
                id="staff-edit-modal-title"
                className="font-bold text-slate-900 dark:text-white text-sm sm:text-base truncate"
              >
                {isNewStaff
                  ? 'เพิ่มข้อมูลบุคลากรใหม่'
                  : `ตั้งค่าและแก้ไขบุคลากร: ${formatStaffName(staff) || 'ไม่ระบุชื่อ'}`}
              </h3>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono truncate">
                รหัสประจำตัว: {staff.employeeCode}
                {staff.positionNo ? ` · เลขที่ตำแหน่ง: ${staff.positionNo}` : ''}
              </div>
            </div>
          </div>
          <button
            type="button"
            disabled={isSaving}
            onClick={onClose}
            aria-label="ปิดหน้าต่าง"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors shrink-0 cursor-pointer disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2×2 Equal-Width Core Tab Navigation (Fixed) */}
        <div
          role="tablist"
          className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 dark:bg-[#0d141d] rounded-xl border border-slate-200/80 dark:border-slate-800 shrink-0"
        >
          {MODAL_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            const isDirty = dirtyTabs[tab.key];
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onTabChange(tab.key)}
                className={`h-9 px-3 rounded-lg text-xs font-medium transition-all inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-white text-slate-900 dark:bg-slate-800 dark:text-white shadow-xs ring-1 ring-slate-200/80 dark:ring-slate-700'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/40'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{tab.label}</span>
                {isDirty && (
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0"
                    title="มีข้อมูลที่แก้ไขและยังไม่ได้บันทึก"
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Fixed-Height Scrollable Middle Container (ZERO UI Jumping Across Tabs) */}
        <div className="h-[460px] sm:h-[500px] overflow-y-auto px-1 space-y-4">
          {/* ============================================================== */}
          {/* TAB 1: ข้อมูลส่วนตัว (3 Clean Sub-Groups)                       */}
          {/* ============================================================== */}
          {activeTab === 'personal' && (
            <div className="space-y-4">
              {/* Sub-group 1: ข้อมูลระบุตัวตน */}
              <div className="bg-slate-50 dark:bg-[#101822] p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 space-y-3">
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-200/80 dark:border-slate-800 pb-2">
                  ข้อมูลระบุตัวตน
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                      คำนำหน้า
                    </label>
                    <select
                      value={staff.prefix || 'นาย'}
                      onChange={(e) => {
                        const newPrefix = e.target.value;
                        onChangeStaff({
                          ...staff,
                          prefix: newPrefix,
                          name: formatStaffName({
                            id: staff.id,
                            employeeCode: staff.employeeCode,
                            prefix: newPrefix,
                            firstName: staff.firstName,
                            lastName: staff.lastName,
                          }),
                        });
                      }}
                      className="w-full h-10 bg-white dark:bg-[#16212e] border border-slate-200/90 dark:border-slate-700 rounded-lg px-3 text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                    >
                      <option value="นาย">นาย</option>
                      <option value="นาง">นาง</option>
                      <option value="นางสาว">นางสาว</option>
                      <option value="ว่าที่ ร.ต.">ว่าที่ ร.ต.</option>
                      <option value="ดร.">ดร.</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                      ชื่อจริง
                    </label>
                    <input
                      type="text"
                      value={staff.firstName || ''}
                      placeholder="ชื่อจริง"
                      onChange={(e) =>
                        onChangeStaff({
                          ...staff,
                          firstName: e.target.value,
                          name: formatStaffName({
                            id: staff.id,
                            employeeCode: staff.employeeCode,
                            prefix: staff.prefix,
                            firstName: e.target.value,
                            lastName: staff.lastName,
                          }),
                        })
                      }
                      className="w-full h-10 bg-white dark:bg-[#16212e] border border-slate-200/90 dark:border-slate-700 rounded-lg px-3 text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                      นามสกุล
                    </label>
                    <input
                      type="text"
                      value={staff.lastName || ''}
                      placeholder="นามสกุล"
                      onChange={(e) =>
                        onChangeStaff({
                          ...staff,
                          lastName: e.target.value,
                          name: formatStaffName({
                            id: staff.id,
                            employeeCode: staff.employeeCode,
                            prefix: staff.prefix,
                            firstName: staff.firstName,
                            lastName: e.target.value,
                          }),
                        })
                      }
                      className="w-full h-10 bg-white dark:bg-[#16212e] border border-slate-200/90 dark:border-slate-700 rounded-lg px-3 text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                      เลขประจำตัวประชาชน (13 หลัก)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={13}
                      value={staff.idCard || ''}
                      placeholder="กรอกเลข 13 หลัก"
                      onChange={(e) => handleCitizenIdChange(e.target.value)}
                      className="w-full h-10 bg-white dark:bg-[#16212e] border border-slate-200/90 dark:border-slate-700 rounded-lg px-3 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                      วันเดือนปีเกิด
                    </label>
                    <ThaiDatePicker
                      value={staff.birthDate || ''}
                      onChange={(dateStr) => onChangeStaff({ ...staff, birthDate: dateStr })}
                      placeholder="เลือกวันเดือนปีเกิด"
                    />
                    {birthSummary && (
                      <div className="mt-1.5 inline-flex items-center px-2 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200/80 dark:border-sky-800/70 text-[11px] font-medium tabular-nums">
                        {birthSummary}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Sub-group 2: ข้อมูลติดต่อและกรณีฉุกเฉิน */}
              <div className="bg-slate-50 dark:bg-[#101822] p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 space-y-3">
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-200/80 dark:border-slate-800 pb-2">
                  ข้อมูลติดต่อและกรณีฉุกเฉิน
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                      เบอร์โทรศัพท์
                    </label>
                    <input
                      type="text"
                      value={staff.phone || ''}
                      placeholder="เช่น 081-xxx-xxxx"
                      onChange={(e) => onChangeStaff({ ...staff, phone: e.target.value })}
                      className="w-full h-10 bg-white dark:bg-[#16212e] border border-slate-200/90 dark:border-slate-700 rounded-lg px-3 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                      อีเมลติดต่อ
                    </label>
                    <input
                      type="email"
                      value={staff.email || ''}
                      placeholder="name@school.ac.th"
                      onChange={(e) => onChangeStaff({ ...staff, email: e.target.value })}
                      className="w-full h-10 bg-white dark:bg-[#16212e] border border-slate-200/90 dark:border-slate-700 rounded-lg px-3 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                {/* Emergency Contact: 1 compact 3-column row */}
                <div className="pt-2 border-t border-slate-200/70 dark:border-slate-800/80">
                  <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-2">
                    ผู้ติดต่อกรณีฉุกเฉิน (ไม่บังคับ)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <input
                      type="text"
                      value={staff.emergencyContactName || ''}
                      placeholder="ชื่อผู้ติดต่อ"
                      onChange={(e) =>
                        onChangeStaff({ ...staff, emergencyContactName: e.target.value })
                      }
                      className="w-full h-9 bg-white dark:bg-[#16212e] border border-slate-200/90 dark:border-slate-700 rounded-lg px-3 text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                    />
                    <input
                      type="text"
                      value={staff.emergencyContactRelation || ''}
                      placeholder="ความสัมพันธ์ (เช่น คู่สมรส, บิดา)"
                      onChange={(e) =>
                        onChangeStaff({ ...staff, emergencyContactRelation: e.target.value })
                      }
                      className="w-full h-9 bg-white dark:bg-[#16212e] border border-slate-200/90 dark:border-slate-700 rounded-lg px-3 text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                    />
                    <input
                      type="text"
                      value={staff.emergencyContactPhone || ''}
                      placeholder="เบอร์โทรฉุกเฉิน"
                      onChange={(e) =>
                        onChangeStaff({ ...staff, emergencyContactPhone: e.target.value })
                      }
                      className="w-full h-9 bg-white dark:bg-[#16212e] border border-slate-200/90 dark:border-slate-700 rounded-lg px-3 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>
              </div>

              {/* Sub-group 3: ที่อยู่ปัจจุบัน (มาตรฐานไทย) */}
              <div className="bg-slate-50 dark:bg-[#101822] p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 space-y-3">
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-200/80 dark:border-slate-800 pb-2">
                  ที่อยู่ปัจจุบัน (มาตรฐานไทย)
                </div>

                {/* Row 1: บ้านเลขที่, หมู่ที่, ซอย / ถนน */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                      บ้านเลขที่
                    </label>
                    <input
                      type="text"
                      value={staff.addressHouseNo || ''}
                      placeholder="เช่น 123/4"
                      onChange={(e) => onChangeStaff({ ...staff, addressHouseNo: e.target.value })}
                      className="w-full h-10 bg-white dark:bg-[#16212e] border border-slate-200/90 dark:border-slate-700 rounded-lg px-3 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                      หมู่ที่
                    </label>
                    <input
                      type="text"
                      value={staff.addressMoo || ''}
                      placeholder="เช่น 5"
                      onChange={(e) => onChangeStaff({ ...staff, addressMoo: e.target.value })}
                      className="w-full h-10 bg-white dark:bg-[#16212e] border border-slate-200/90 dark:border-slate-700 rounded-lg px-3 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                      ซอย / ถนน (ถ้ามี)
                    </label>
                    <input
                      type="text"
                      value={staff.addressSoiRoad || ''}
                      placeholder="เช่น ถ.ราชสีมา-ปักธงชัย"
                      onChange={(e) => onChangeStaff({ ...staff, addressSoiRoad: e.target.value })}
                      className="w-full h-10 bg-white dark:bg-[#16212e] border border-slate-200/90 dark:border-slate-700 rounded-lg px-3 text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                {/* Row 2: Cascading Searchable Dropdowns (จังหวัด -> อำเภอ -> ตำบล -> รหัสไปรษณีย์) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                      จังหวัด
                    </label>
                    <SearchableCombobox
                      value={staff.addressProvince || ''}
                      options={provinces}
                      placeholder="เลือกจังหวัด"
                      searchPlaceholder="ค้นหาจังหวัด..."
                      allowClear
                      onChange={(nextProv) =>
                        onChangeStaff({
                          ...staff,
                          addressProvince: nextProv,
                          addressDistrict: '',
                          addressSubdistrict: '',
                          addressPostalCode: '',
                        })
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                      อำเภอ / เขต
                    </label>
                    <SearchableCombobox
                      value={staff.addressDistrict || ''}
                      options={districts}
                      disabled={!staff.addressProvince}
                      placeholder={staff.addressProvince ? 'เลือกอำเภอ / เขต' : 'เลือกจังหวัดก่อน'}
                      searchPlaceholder="ค้นหาอำเภอ / เขต..."
                      allowClear
                      onChange={(nextDist) =>
                        onChangeStaff({
                          ...staff,
                          addressDistrict: nextDist,
                          addressSubdistrict: '',
                          addressPostalCode: '',
                        })
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                      ตำบล / แขวง
                    </label>
                    <SearchableCombobox
                      value={staff.addressSubdistrict || ''}
                      options={subdistricts}
                      disabled={!staff.addressDistrict}
                      placeholder={staff.addressDistrict ? 'เลือกตำบล / แขวง' : 'เลือกอำเภอก่อน'}
                      searchPlaceholder="ค้นหาตำบล / แขวง..."
                      allowClear
                      onChange={(nextSub) => {
                        const autoZip = getPostalCode(
                          staff.addressProvince,
                          staff.addressDistrict,
                          nextSub
                        );
                        onChangeStaff({
                          ...staff,
                          addressSubdistrict: nextSub,
                          addressPostalCode: autoZip || staff.addressPostalCode || '',
                        });
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                      รหัสไปรษณีย์
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={5}
                      value={staff.addressPostalCode || ''}
                      placeholder="เช่น 30150"
                      onChange={(e) =>
                        onChangeStaff({
                          ...staff,
                          addressPostalCode: e.target.value.replace(/[^\d]/g, '').slice(0, 5),
                        })
                      }
                      className="w-full h-10 bg-white dark:bg-[#16212e] border border-slate-200/90 dark:border-slate-700 rounded-lg px-3 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 2: ตำแหน่งและสังกัด (Position No + Smart Khurusapha + Dates) */}
          {/* ============================================================== */}
          {activeTab === 'position' && (
            <div className="space-y-3.5">
              <div className="bg-slate-50 dark:bg-[#101822] p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
                  <div className="sm:col-span-2">
                    <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                      ประเภทบุคลากร <span className="text-sky-500 font-semibold">*</span>
                    </label>
                    <select
                      value={staff.employment_type || deriveEmploymentType(staff)}
                      onChange={(e) => {
                        const newType = e.target.value as
                          | 'civil_servant'
                          | 'government_employee'
                          | 'temporary_employee';
                        onChangeStaff({
                          ...staff,
                          employment_type: newType,
                          academicStanding:
                            newType === 'temporary_employee' ? '-' : staff.academicStanding,
                        });
                      }}
                      className="w-full h-10 bg-white dark:bg-[#16212e] border border-slate-200/90 dark:border-slate-700 rounded-lg px-3 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:border-sky-500"
                    >
                      <option value="civil_servant">ข้าราชการครูและบุคลากรทางการศึกษา</option>
                      <option value="government_employee">พนักงานราชการ</option>
                      <option value="temporary_employee">ลูกจ้างชั่วคราว / จ้างเหมาบริการ</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                      เลขที่ตำแหน่ง
                    </label>
                    <input
                      type="text"
                      value={staff.positionNo || ''}
                      placeholder="เช่น 75362"
                      onChange={(e) => onChangeStaff({ ...staff, positionNo: e.target.value })}
                      className="w-full h-10 bg-white dark:bg-[#16212e] border border-slate-200/90 dark:border-slate-700 rounded-lg px-3 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                      ตำแหน่งมาตรฐาน สพฐ.
                    </label>
                    <select
                      value={staff.position}
                      onChange={(e) => onChangeStaff({ ...staff, position: e.target.value })}
                      className="w-full h-10 bg-white dark:bg-[#16212e] border border-slate-200/90 dark:border-slate-700 rounded-lg px-3 text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                    >
                      {teacherRoles.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                      กลุ่มสาระการเรียนรู้
                    </label>
                    <select
                      value={staff.department}
                      onChange={(e) => onChangeStaff({ ...staff, department: e.target.value })}
                      className="w-full h-10 bg-white dark:bg-[#16212e] border border-slate-200/90 dark:border-slate-700 rounded-lg px-3 text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                    >
                      {departments.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Read-only Auto-Derived Multi-Division from Workload Category 2 */}
                <div className="p-3 rounded-xl bg-white dark:bg-[#141d27] border border-slate-200/90 dark:border-slate-700/80 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      สังกัดฝ่ายงาน (ดึงอัตโนมัติจากภาระงานหมวด 2)
                    </span>
                    <button
                      type="button"
                      onClick={() => onNavigateToView('workload')}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 transition-colors cursor-pointer"
                    >
                      <span>จัดการในตารางสอนและภาระงาน</span>
                      <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {derivedDivisions.length > 0 ? (
                      derivedDivisions.map((divName) => (
                        <span
                          key={divName}
                          className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200/80 dark:border-sky-800/70"
                        >
                          {divName}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400 dark:text-slate-500">
                        ยังไม่ระบุภาระงานฝ่าย
                      </span>
                    )}
                  </div>
                </div>

                {/* Smart Khurusapha Membership (2-column row) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                      ประเภทสมาชิกคุรุสภา
                    </label>
                    <select
                      value={khurusaphaType}
                      onChange={(e) => handleKhurusaphaTypeChange(e.target.value)}
                      className="w-full h-10 bg-white dark:bg-[#16212e] border border-slate-200/90 dark:border-slate-700 rounded-lg px-3 text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                    >
                      <option value="">- เลือกประเภทสมาชิก -</option>
                      {KHURUSAPHA_MEMBER_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-slate-600 dark:text-slate-400 font-medium">
                        เลขสมาชิกคุรุสภา
                      </label>
                      {isOrdinaryMember && (
                        <button
                          type="button"
                          onClick={() => {
                            if (isKhurusaphaUnlocked) {
                              setIsKhurusaphaUnlocked(false);
                              onChangeStaff({
                                ...staff,
                                khurusaphaMemberNo: staff.idCard || '',
                                memberId: staff.idCard || '',
                              });
                            } else {
                              setIsKhurusaphaUnlocked(true);
                            }
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 cursor-pointer"
                        >
                          {isKhurusaphaUnlocked ? (
                            <>
                              <Lock className="w-3 h-3 shrink-0" />
                              <span>ซิงก์เลข ปชช.</span>
                            </>
                          ) : (
                            <>
                              <Unlock className="w-3 h-3 shrink-0" />
                              <span>แก้ไขเอง</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      disabled={isNonMember || (isOrdinaryMember && !isKhurusaphaUnlocked)}
                      value={
                        isNonMember
                          ? ''
                          : isOrdinaryMember && !isKhurusaphaUnlocked
                          ? staff.idCard || ''
                          : staff.khurusaphaMemberNo || ''
                      }
                      placeholder={
                        isNonMember
                          ? 'ไม่เป็นสมาชิกคุรุสภา'
                          : isOrdinaryMember
                          ? 'ซิงก์อัตโนมัติจากเลข ปชช.'
                          : 'ระบุเลขสมาชิกคุรุสภา'
                      }
                      onChange={(e) =>
                        onChangeStaff({
                          ...staff,
                          khurusaphaMemberNo: e.target.value,
                          memberId: e.target.value,
                        })
                      }
                      className="w-full h-10 bg-white dark:bg-[#16212e] disabled:bg-slate-100 dark:disabled:bg-slate-800/50 disabled:text-slate-500 border border-slate-200/90 dark:border-slate-700 rounded-lg px-3 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-sky-500 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                      ชั้นที่ปรึกษา / ประจำชั้น
                    </label>
                    <select
                      value={staff.classLevel || '-'}
                      onChange={(e) => onChangeStaff({ ...staff, classLevel: e.target.value })}
                      className="w-full h-10 bg-white dark:bg-[#16212e] border border-slate-200/90 dark:border-slate-700 rounded-lg px-3 text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                    >
                      <option value="-">- ไม่ระบุ / ไม่มี -</option>
                      {activeClasses.map((cls) => (
                        <option key={cls} value={cls}>
                          {cls}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                      เวรประจำวัน
                    </label>
                    <select
                      value={staff.dutyDay || '-'}
                      onChange={(e) => onChangeStaff({ ...staff, dutyDay: e.target.value })}
                      className="w-full h-10 bg-white dark:bg-[#16212e] border border-slate-200/90 dark:border-slate-700 rounded-lg px-3 text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                    >
                      <option value="-">- ไม่ระบุ -</option>
                      <option value="จันทร์">วันจันทร์</option>
                      <option value="อังคาร">วันอังคาร</option>
                      <option value="พุธ">วันพุธ</option>
                      <option value="พฤหัสบดี">วันพฤหัสบดี</option>
                      <option value="ศุกร์">วันศุกร์</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                      วันที่บรรจุรับราชการ
                    </label>
                    <ThaiDatePicker
                      value={staff.startDate || ''}
                      onChange={(dateStr) => onChangeStaff({ ...staff, startDate: dateStr })}
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                      วันที่ดำรงตำแหน่งปัจจุบัน
                    </label>
                    <ThaiDatePicker
                      value={staff.currentPositionDate || ''}
                      onChange={(dateStr) =>
                        onChangeStaff({ ...staff, currentPositionDate: dateStr })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400 px-1">
                <span>จัดการ</span>
                <button
                  type="button"
                  onClick={() => onNavigateToView('dir_standing', staff.employeeCode || staff.id)}
                  className="font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 hover:underline transition-colors cursor-pointer"
                >
                  วิทยฐานะ
                </button>
                <span aria-hidden="true">/</span>
                <button
                  type="button"
                  onClick={() => onNavigateToView('dir_license', staff.employeeCode || staff.id)}
                  className="font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 hover:underline transition-colors cursor-pointer"
                >
                  ใบอนุญาตฯ
                </button>
                <span aria-hidden="true">/</span>
                <button
                  type="button"
                  onClick={() => onNavigateToView('dir_scout', staff.employeeCode || staff.id)}
                  className="font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 hover:underline transition-colors cursor-pointer"
                >
                  วุฒิลูกเสือ
                </button>
                <span>ได้ที่เมนูหมวดงานทะเบียนประวัติ</span>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 3: วุฒิการศึกษาและวิชาเอก (ก.ค.ศ. 2×2 + 105+ Majors)         */}
          {/* ============================================================== */}
          {activeTab === 'education' && (
            <div className="space-y-4">
              {/* Highest Qualification — 2×2 Grid */}
              <div className="bg-slate-50 dark:bg-[#101822] p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 dark:border-slate-800 pb-2">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    วุฒิการศึกษาสูงสุด (มาตรฐาน ก.ค.ศ.)
                  </span>
                  <a
                    href="https://qualification.otepc.go.th"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 transition-colors"
                  >
                    <span>ตรวจสอบคุณวุฒิที่ ก.ค.ศ. รับรอง</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                  {/* 1. ระดับวุฒิการศึกษา */}
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                      ระดับวุฒิการศึกษา
                    </label>
                    <select
                      value={staff.educationLevel || ''}
                      onChange={(e) => handleEducationLevelChange(e.target.value)}
                      className="w-full h-10 bg-white dark:bg-[#16212e] border border-slate-200/90 dark:border-slate-700 rounded-lg px-3 text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                    >
                      <option value="">- เลือกระดับวุฒิการศึกษา -</option>
                      {EDUCATION_LEVELS.map((lvl) => (
                        <option key={lvl} value={lvl}>
                          {lvl}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 2. หลักสูตร (จำนวนปี) */}
                  <div className="space-y-1.5">
                    <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                      หลักสูตร (จำนวนปี)
                    </label>
                    <select
                      disabled={!staff.educationLevel}
                      value={
                        isCustomProgramYears
                          ? CUSTOM_OPTION_LABEL
                          : staff.educationProgramYears &&
                            programYearsOptions.includes(staff.educationProgramYears)
                          ? staff.educationProgramYears
                          : ''
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === CUSTOM_OPTION_LABEL) {
                          setIsCustomProgramYears(true);
                          if (programYearsOptions.includes(staff.educationProgramYears || '')) {
                            onChangeStaff({ ...staff, educationProgramYears: '' });
                          }
                        } else {
                          setIsCustomProgramYears(false);
                          onChangeStaff({ ...staff, educationProgramYears: val });
                        }
                      }}
                      className="w-full h-10 bg-white dark:bg-[#16212e] disabled:bg-slate-100 dark:disabled:bg-slate-800/50 border border-slate-200/90 dark:border-slate-700 rounded-lg px-3 text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 disabled:cursor-not-allowed"
                    >
                      <option value="">
                        {staff.educationLevel ? '- เลือกหลักสูตร -' : 'เลือกระดับวุฒิก่อน'}
                      </option>
                      {programYearsOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                      {staff.educationLevel && (
                        <option value={CUSTOM_OPTION_LABEL}>{CUSTOM_OPTION_LABEL}</option>
                      )}
                    </select>
                    {isCustomProgramYears && (
                      <input
                        type="text"
                        value={staff.educationProgramYears || ''}
                        placeholder="ระบุหลักสูตร..."
                        onChange={(e) =>
                          onChangeStaff({ ...staff, educationProgramYears: e.target.value })
                        }
                        className="w-full h-9 bg-white dark:bg-[#16212e] border border-slate-200/90 dark:border-slate-700 rounded-lg px-3 text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                      />
                    )}
                  </div>

                  {/* 3. ชื่อคุณวุฒิ / ปริญญา */}
                  <div className="space-y-1.5">
                    <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                      ชื่อคุณวุฒิ / ปริญญา
                    </label>
                    <select
                      disabled={!staff.educationLevel}
                      value={
                        isCustomDegree
                          ? CUSTOM_OPTION_LABEL
                          : staff.educationDegree && degreeOptions.includes(staff.educationDegree)
                          ? staff.educationDegree
                          : ''
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === CUSTOM_OPTION_LABEL) {
                          setIsCustomDegree(true);
                          if (degreeOptions.includes(staff.educationDegree || '')) {
                            onChangeStaff({ ...staff, educationDegree: '' });
                          }
                        } else {
                          setIsCustomDegree(false);
                          onChangeStaff({ ...staff, educationDegree: val });
                        }
                      }}
                      className="w-full h-10 bg-white dark:bg-[#16212e] disabled:bg-slate-100 dark:disabled:bg-slate-800/50 border border-slate-200/90 dark:border-slate-700 rounded-lg px-3 text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 disabled:cursor-not-allowed"
                    >
                      <option value="">
                        {staff.educationLevel ? '- เลือกชื่อคุณวุฒิ / ปริญญา -' : 'เลือกระดับวุฒิก่อน'}
                      </option>
                      {degreeOptions.map((deg) => (
                        <option key={deg} value={deg}>
                          {deg}
                        </option>
                      ))}
                      {staff.educationLevel && (
                        <option value={CUSTOM_OPTION_LABEL}>{CUSTOM_OPTION_LABEL}</option>
                      )}
                    </select>
                    {isCustomDegree && (
                      <input
                        type="text"
                        value={staff.educationDegree || ''}
                        placeholder="ระบุชื่อคุณวุฒิ / ปริญญา..."
                        onChange={(e) =>
                          onChangeStaff({ ...staff, educationDegree: e.target.value })
                        }
                        className="w-full h-9 bg-white dark:bg-[#16212e] border border-slate-200/90 dark:border-slate-700 rounded-lg px-3 text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                      />
                    )}
                  </div>

                  {/* 4. สาขา / วิชาเอก (Grouped Searchable Combobox — 105+ Majors) */}
                  <div className="space-y-1.5">
                    <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                      สาขา / วิชาเอก
                    </label>
                    <SearchableCombobox
                      value={
                        isCustomMajor
                          ? CUSTOM_MAJOR_OPTION
                          : staff.major && isStandardMajor(staff.major)
                          ? staff.major
                          : ''
                      }
                      groups={MAJOR_GROUPS}
                      extraBottomOption={CUSTOM_MAJOR_OPTION}
                      placeholder="เลือกสาขา / วิชาเอก..."
                      searchPlaceholder="ค้นหาวิชาเอก (105+ สาขา)..."
                      allowClear
                      onChange={(val) => {
                        if (val === CUSTOM_MAJOR_OPTION) {
                          onChangeCustomMajor(true);
                          if (isStandardMajor(staff.major)) {
                            onChangeStaff({ ...staff, major: '' });
                          }
                        } else {
                          onChangeCustomMajor(false);
                          onChangeStaff({ ...staff, major: val });
                        }
                      }}
                    />
                    {isCustomMajor && (
                      <input
                        type="text"
                        value={staff.major || ''}
                        placeholder="ระบุสาขา / วิชาเอกเพิ่มเติม..."
                        onChange={(e) => onChangeStaff({ ...staff, major: e.target.value })}
                        className="w-full h-9 bg-white dark:bg-[#16212e] border border-slate-200/90 dark:border-slate-700 rounded-lg px-3 text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                      />
                    )}
                  </div>
                </div>

                {/* Optional Institution & Graduation Year */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div className="sm:col-span-2">
                    <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                      สถาบันการศึกษา (ถ้ามี)
                    </label>
                    <input
                      type="text"
                      value={staff.educationInstitution || ''}
                      placeholder="เช่น มหาวิทยาลัยราชภัฏนครราชสีมา"
                      onChange={(e) =>
                        onChangeStaff({ ...staff, educationInstitution: e.target.value })
                      }
                      className="w-full h-10 bg-white dark:bg-[#16212e] border border-slate-200/90 dark:border-slate-700 rounded-lg px-3 text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                      ปี พ.ศ. ที่จบ (ถ้ามี)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      value={staff.educationGradYear || ''}
                      placeholder="เช่น 2562"
                      onChange={(e) =>
                        onChangeStaff({
                          ...staff,
                          educationGradYear: e.target.value.replace(/[^\d]/g, '').slice(0, 4),
                        })
                      }
                      className="w-full h-10 bg-white dark:bg-[#16212e] border border-slate-200/90 dark:border-slate-700 rounded-lg px-3 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>
              </div>

              {/* Additional Education History */}
              <div className="bg-slate-50 dark:bg-[#101822] p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-2">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    ประวัติการศึกษาเพิ่มเติม
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    {(staff.educations || []).length} รายการ
                  </span>
                </div>

                <div className="space-y-2">
                  {!staff.educations || staff.educations.length === 0 ? (
                    <div className="p-3 rounded-lg bg-white dark:bg-[#16212e] border border-slate-200/70 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-center">
                      ยังไม่มีประวัติการศึกษาเพิ่มเติม
                    </div>
                  ) : (
                    staff.educations.map((edu, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg bg-white dark:bg-[#16212e] border transition-colors flex items-center justify-between gap-3 ${
                          editingEduIdx === idx
                            ? 'border-sky-500 ring-1 ring-sky-500/30'
                            : 'border-slate-200/90 dark:border-slate-700'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {edu.degree} สาขา {edu.major}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {edu.institute} (พ.ศ. {edu.gradYear})
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleEditEducation(idx)}
                            className="p-1.5 rounded-md text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="แก้ไขวุฒินี้"
                          >
                            <Pencil className="w-3.5 h-3.5 shrink-0" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteEducation(idx)}
                            className="p-1.5 rounded-md text-rose-500 hover:text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="ลบวุฒินี้"
                          >
                            <Trash2 className="w-3.5 h-3.5 shrink-0" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Add / Edit Education Inline Sub-Form */}
                <div className="p-3 rounded-lg bg-white dark:bg-[#141d28] border border-dashed border-slate-300 dark:border-slate-700 space-y-2.5">
                  <div className="font-medium text-slate-700 dark:text-slate-300 text-[11px] flex items-center justify-between">
                    <span>
                      {editingEduIdx !== null
                        ? `แก้ไขวุฒิการศึกษา (รายการที่ ${editingEduIdx + 1})`
                        : 'เพิ่มประวัติการศึกษา'}
                    </span>
                    {editingEduIdx !== null && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingEduIdx(null);
                          setNewEduDegree('ค.บ.');
                          setNewEduMajor('');
                          setNewEduInst('');
                          setNewEduYear('');
                        }}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 underline cursor-pointer"
                      >
                        ยกเลิกการแก้ไข
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <input
                      type="text"
                      value={newEduDegree}
                      placeholder="วุฒิ (เช่น ค.บ., กศ.ม.)"
                      onChange={(e) => setNewEduDegree(e.target.value)}
                      className="w-full h-9 bg-slate-50 dark:bg-[#101822] border border-slate-200/90 dark:border-slate-700 rounded-lg px-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                    />
                    <input
                      type="text"
                      value={newEduMajor}
                      placeholder="สาขาวิชา"
                      onChange={(e) => setNewEduMajor(e.target.value)}
                      className="w-full h-9 bg-slate-50 dark:bg-[#101822] border border-slate-200/90 dark:border-slate-700 rounded-lg px-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                    />
                    <input
                      type="text"
                      value={newEduInst}
                      placeholder="สถาบันการศึกษา"
                      onChange={(e) => setNewEduInst(e.target.value)}
                      className="w-full h-9 bg-slate-50 dark:bg-[#101822] border border-slate-200/90 dark:border-slate-700 rounded-lg px-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                    />
                    <input
                      type="text"
                      value={newEduYear}
                      placeholder="ปี พ.ศ. ที่จบ"
                      onChange={(e) => setNewEduYear(e.target.value)}
                      className="w-full h-9 bg-slate-50 dark:bg-[#101822] border border-slate-200/90 dark:border-slate-700 rounded-lg px-2.5 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleSaveEducation}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-medium transition-colors cursor-pointer"
                    >
                      {editingEduIdx !== null ? (
                        <>
                          <Check className="w-3.5 h-3.5 shrink-0" />
                          <span>อัปเดตรายการวุฒิ</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5 shrink-0" />
                          <span>เพิ่มประวัติการศึกษา</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 4: บัญชีและสิทธิ์ระบบ (Focused Access Control + Danger Zone) */}
          {/* ============================================================== */}
          {activeTab === 'account' && (
            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-[#101822] p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 space-y-3.5">
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-200/80 dark:border-slate-800 pb-2">
                  บัญชีผู้ใช้งานและสิทธิ์การเข้าถึงระบบ
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                    รหัสประจำตัวบุคลากร
                  </label>
                  <input
                    type="text"
                    value={staff.employeeCode}
                    onChange={(e) => onChangeStaff({ ...staff, employeeCode: e.target.value })}
                    className="w-full h-10 bg-white dark:bg-[#16212e] border border-slate-200/90 dark:border-slate-700 rounded-lg px-3 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                    ระดับสิทธิ์การใช้งานระบบ
                  </label>
                  <select
                    value={staff.accessLevel || 'User'}
                    onChange={(e) => onChangeStaff({ ...staff, accessLevel: e.target.value })}
                    className="w-full h-10 bg-white dark:bg-[#16212e] border border-slate-200/90 dark:border-slate-700 rounded-lg px-3 text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-sky-500"
                  >
                    <option value="Superuser">Superuser (สิทธิ์ผู้ดูแลสูงสุด)</option>
                    <option value="Admin">Admin (ฝ่ายบริหาร / งานบุคคล)</option>
                    <option value="User">User (ครูและบุคลากรทั่วไป)</option>
                  </select>
                </div>
              </div>

              {/* Danger Zone */}
              {!isNewStaff && (
                <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/60 dark:bg-rose-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 font-semibold text-rose-700 dark:text-rose-400">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>พื้นที่อันตราย (Danger Zone)</span>
                    </div>
                    <p className="text-[11px] text-rose-600/90 dark:text-rose-300/80">
                      ลบข้อมูลบุคลากรนี้ออกจากระบบอย่างถาวร (ไม่สามารถกู้คืนได้)
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => onDeleteStaff(staff.id)}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium transition-colors shrink-0 cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5 shrink-0" />
                    <span>ลบข้อมูลบุคลากรนี้</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Unified Modal Footer (Fixed) with always-visible registry quick-jump links */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200/90 dark:border-slate-800 shrink-0">
          {!isNewStaff ? (
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
              <span>ทะเบียน:</span>
              <button
                type="button"
                onClick={() => onNavigateToView('dir_standing', staff.employeeCode || staff.id)}
                className="font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 hover:underline cursor-pointer"
              >
                วิทยฐานะ
              </button>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                onClick={() => onNavigateToView('dir_license', staff.employeeCode || staff.id)}
                className="font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 hover:underline cursor-pointer"
              >
                ใบอนุญาตฯ
              </button>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                onClick={() => onNavigateToView('dir_scout', staff.employeeCode || staff.id)}
                className="font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 hover:underline cursor-pointer"
              >
                วุฒิลูกเสือ
              </button>
            </div>
          ) : (
            <div />
          )}
          <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 border border-slate-200/90 dark:bg-[#121822] dark:hover:bg-slate-800/70 dark:text-slate-300 dark:hover:text-white dark:border-slate-800/80 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold border border-transparent inline-flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
            ) : (
              <Save className="w-4 h-4 shrink-0" />
            )}
            <span>
              {isSaving
                ? 'กำลังบันทึก...'
                : isNewStaff
                ? 'บันทึกเพิ่มบุคลากรใหม่'
                : 'บันทึกการเปลี่ยนแปลง'}
            </span>
          </button>
          </div>
        </div>
      </div>
    </div>
  );
};
