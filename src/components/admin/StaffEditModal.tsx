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
  Medal,
  BadgeCheck,
  Compass,
  X,
  Save,
  Loader2,
  Trash2,
  Plus,
  Pencil,
  Check,
  ChevronRight,
  Lock,
  Unlock,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import type { ScoutRecord, TeacherRecord, WorkloadItem } from '@/lib/data/schoolData';
import { ThaiDatePicker, formatThaiDateDisplay } from '@/components/ui/ThaiDatePicker';
import { SearchableCombobox } from '@/components/ui/SearchableCombobox';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { formatStaffName, formatShortStanding } from '@/lib/regulations/staff-formatting';
import { calculateRetirementInfo } from '@/lib/regulations/fiscal-and-retirement';
import { evaluateLicenseHealth } from '@/lib/regulations/khurusapha-and-pa';
import {
  hydrateEducationsList,
  resolveHighestEducation,
  sortEducationsHighestFirst,
  inferEducationLevel,
  type EducationEntry,
} from '@/lib/regulations/education-ranking';
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

export type StaffModalTabKey =
  | 'personal'
  | 'position'
  | 'education'
  | 'standing'
  | 'license'
  | 'scout';
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
  onScoutSynced?: (staffId: string, highestScout: string, scoutCertNo: string) => void;
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
  { key: 'standing', label: 'วิทยฐานะ', icon: Medal },
  { key: 'license', label: 'ใบอนุญาตฯ', icon: BadgeCheck },
  { key: 'scout', label: 'วุฒิลูกเสือ', icon: Compass },
];

const STANDING_LEVEL_OPTIONS = [
  'ไม่มีวิทยฐานะ',
  'ครูผู้ช่วย',
  'ชำนาญการ',
  'ชำนาญการพิเศษ',
  'เชี่ยวชาญ',
  'เชี่ยวชาญพิเศษ',
];

const BASELINE_STANDING_LEVELS = new Set(['ไม่มีวิทยฐานะ', 'ครูผู้ช่วย']);

const LICENSE_TYPE_OPTIONS = [
  'ใบอนุญาตปฏิบัติหน้าที่ครู (P-License)',
  'ใบอนุญาตประกอบวิชาชีพครู (ชั้นต้น / B-License)',
  'ใบอนุญาตประกอบวิชาชีพครู (ชั้นสูง / A-License)',
  'ใบอนุญาตประกอบวิชาชีพครู',
  'ใบอนุญาตประกอบวิชาชีพผู้บริหารสถานศึกษา',
  'ใบอนุญาตประกอบวิชาชีพผู้บริหารการศึกษา',
  'ใบอนุญาตประกอบวิชาชีพศึกษานิเทศก์',
  'หนังสืออนุญาตให้ประกอบวิชาชีพโดยไม่มีใบอนุญาตฯ (ผ่อนผัน)',
];

const CUSTOM_LICENSE_VALUE = '__CUSTOM__';

const SCOUT_BADGE_LEVELS = [
  'วูดแบดจ์ 4 ท่อน (L.T.)',
  'วูดแบดจ์ 3 ท่อน (A.L.T.)',
  'วูดแบดจ์ 2 ท่อน (W.B.)',
  'ขั้นความรู้ชั้นสูง (A.T.C.)',
  'ขั้นความรู้เบื้องต้น (B.T.C.)',
];

const SCOUT_CATEGORIES = [
  'ลูกเสือสามัญ',
  'ลูกเสือสามัญรุ่นใหญ่',
  'ลูกเสือสำรอง',
  'ลูกเสือวิสามัญ',
];

function deriveLicenseCategory(type: string): string {
  if (type.includes('ผู้บริหาร')) return 'ผู้บริหาร';
  if (type.includes('ศึกษานิเทศก์')) return 'ศึกษานิเทศก์';
  return 'ครู';
}

function sortStandingsDesc(standings?: TeacherRecord['standings']) {
  if (!standings || standings.length === 0) return [];
  return [...standings].sort((a, b) =>
    String(b.effectiveDate || '').localeCompare(String(a.effectiveDate || ''))
  );
}

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
  onScoutSynced,
  onDeleteStaff,
  onSave,
  onClose,
}) => {
  // Khurusapha manual override unlock state (only applies when type === 'สมาชิกสามัญ')
  const [isKhurusaphaUnlocked, setIsKhurusaphaUnlocked] = useState(false);

  // Tab 3: Standardized ก.ค.ศ. Education List + Form state
  const [eduLevel, setEduLevel] = useState<string>('');
  const [eduProgramYears, setEduProgramYears] = useState<string>('');
  const [eduDegree, setEduDegree] = useState<string>('');
  const [eduMajor, setEduMajor] = useState<string>('');
  const [eduInstitution, setEduInstitution] = useState<string>('');
  const [eduGradYear, setEduGradYear] = useState<string>('');
  const [eduIsCustomYears, setEduIsCustomYears] = useState<boolean>(false);
  const [eduIsCustomDegree, setEduIsCustomDegree] = useState<boolean>(false);
  const [eduIsCustomMajor, setEduIsCustomMajor] = useState<boolean>(false);
  const [editingEduIdx, setEditingEduIdx] = useState<number | null>(null);
  const [deletingEduIdx, setDeletingEduIdx] = useState<number | null>(null);
  const [eduFormError, setEduFormError] = useState<string | null>(null);

  // Tab 4: Academic Standing inline CRUD state
  const [editingStandingIdx, setEditingStandingIdx] = useState<number | null>(null);
  const [stdLevel, setStdLevel] = useState<string>('ชำนาญการ');
  const [stdOrderNo, setStdOrderNo] = useState<string>('');
  const [stdOrderDate, setStdOrderDate] = useState<string>('');
  const [stdEffectiveDate, setStdEffectiveDate] = useState<string>('');
  const [stdFormError, setStdFormError] = useState<string | null>(null);
  const [deletingStandingIdx, setDeletingStandingIdx] = useState<number | null>(null);

  // Tab 5: License inline CRUD state
  const [editingLicenseIdx, setEditingLicenseIdx] = useState<number | null>(null);
  const [licTypeSelect, setLicTypeSelect] = useState<string>(LICENSE_TYPE_OPTIONS[0]);
  const [licCustomType, setLicCustomType] = useState<string>('');
  const [licNumber, setLicNumber] = useState<string>('');
  const [licIssueDate, setLicIssueDate] = useState<string>('');
  const [licExpiryDate, setLicExpiryDate] = useState<string>('');
  const [licFormError, setLicFormError] = useState<string | null>(null);
  const [deletingLicenseIdx, setDeletingLicenseIdx] = useState<number | null>(null);

  // Tab 6: Scout direct CRUD state (Single Source of Truth via /api/admin/scout)
  const [scoutRecords, setScoutRecords] = useState<ScoutRecord[]>([]);
  const [isScoutLoading, setIsScoutLoading] = useState<boolean>(false);
  const [isScoutSaving, setIsScoutSaving] = useState<boolean>(false);
  const [editingScoutId, setEditingScoutId] = useState<string | null>(null);
  const [scoutQualification, setScoutQualification] = useState<string>('');
  const [isScoutQualManual, setIsScoutQualManual] = useState<boolean>(false);
  const [scoutBadgeLevel, setScoutBadgeLevel] = useState<string>(SCOUT_BADGE_LEVELS[2]);
  const [scoutCategory, setScoutCategory] = useState<string>(SCOUT_CATEGORIES[0]);
  const [scoutCertNo, setScoutCertNo] = useState<string>('');
  const [scoutOrderNo, setScoutOrderNo] = useState<string>('');
  const [scoutIssueDate, setScoutIssueDate] = useState<string>('');
  const [scoutIssuedBy, setScoutIssuedBy] = useState<string>('สำนักงานลูกเสือแห่งชาติ');
  const [scoutNotice, setScoutNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [deletingScoutItem, setDeletingScoutItem] = useState<ScoutRecord | null>(null);

  const buildDefaultScoutTitle = (category: string, badgeLevel: string) => {
    const cleanLevel = badgeLevel.startsWith('ขั้น') ? badgeLevel : `ขั้น${badgeLevel}`;
    return `ผู้กำกับ${category} ${cleanLevel}`;
  };

  // Reset Tabs 3–6 inline sub-forms whenever modal opens/closes or staff changes
  useEffect(() => {
    setEduLevel('');
    setEduProgramYears('');
    setEduDegree('');
    setEduMajor('');
    setEduInstitution('');
    setEduGradYear('');
    setEduIsCustomYears(false);
    setEduIsCustomDegree(false);
    setEduIsCustomMajor(false);
    setEditingEduIdx(null);
    setDeletingEduIdx(null);
    setEduFormError(null);

    setEditingStandingIdx(null);
    setStdLevel('ชำนาญการ');
    setStdOrderNo('');
    setStdOrderDate('');
    setStdEffectiveDate('');
    setStdFormError(null);
    setDeletingStandingIdx(null);

    setEditingLicenseIdx(null);
    setLicTypeSelect(LICENSE_TYPE_OPTIONS[0]);
    setLicCustomType('');
    setLicNumber('');
    setLicIssueDate('');
    setLicExpiryDate('');
    setLicFormError(null);
    setDeletingLicenseIdx(null);

    setEditingScoutId(null);
    setScoutBadgeLevel(SCOUT_BADGE_LEVELS[2]);
    setScoutCategory(SCOUT_CATEGORIES[0]);
    setScoutQualification(buildDefaultScoutTitle(SCOUT_CATEGORIES[0], SCOUT_BADGE_LEVELS[2]));
    setIsScoutQualManual(false);
    setScoutCertNo('');
    setScoutOrderNo('');
    setScoutIssueDate('');
    setScoutIssuedBy('สำนักงานลูกเสือแห่งชาติ');
    setScoutNotice(null);
    setDeletingScoutItem(null);
  }, [staff?.id, isOpen]);

  // Load this staff member's scout records from /api/admin/scout
  const staffIdForScout = staff?.id || '';
  const staffCodeForScout = staff?.employeeCode || '';
  const staffFullNameForScout = staff ? formatStaffName(staff) : '';

  useEffect(() => {
    if (!isOpen || !staffIdForScout || isNewStaff) {
      setScoutRecords([]);
      return;
    }
    let isMounted = true;
    setIsScoutLoading(true);
    fetch('/api/admin/scout', { cache: 'no-store' })
      .then((res) => res.json())
      .then((json) => {
        if (!isMounted || !json?.success || !Array.isArray(json.data)) return;
        const matched = (json.data as ScoutRecord[]).filter(
          (s) =>
            (s.teacherId && (s.teacherId === staffIdForScout || s.teacherId === staffCodeForScout)) ||
            (s.teacherName && formatStaffName(s.teacherName) === staffFullNameForScout)
        );
        setScoutRecords(matched);
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsScoutLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [isOpen, staffIdForScout, staffCodeForScout, staffFullNameForScout, isNewStaff]);

  // Sync local helper flags when modal opens or switches staff
  useEffect(() => {
    if (!isOpen || !staff) {
      setIsKhurusaphaUnlocked(false);
      return;
    }

    const memberType = staff.khurusaphaMemberType || '';
    const memberNo = staff.khurusaphaMemberNo || staff.memberId || '';
    const idCard = staff.idCard || '';
    setIsKhurusaphaUnlocked(
      memberType === 'สมาชิกสามัญ' && Boolean(memberNo) && Boolean(idCard) && memberNo !== idCard
    );
  }, [isOpen, staff?.id]);

  // Note: Escape key & backdrop-click closing are intentionally disabled on StaffEditModal
  // to prevent accidental data loss (close explicitly via X or ยกเลิก).

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
  const displayedEducations = hydrateEducationsList(staff);
  const eduProgramYearsOptions = getProgramYearsForLevel(eduLevel);
  const eduDegreeOptions = getDegreesForLevel(eduLevel);
  const khurusaphaType = staff.khurusaphaMemberType || '';
  const isOrdinaryMember = khurusaphaType === 'สมาชิกสามัญ';
  const isNonMember = khurusaphaType === 'ไม่เป็นสมาชิก';
  void isCustomMajor;
  void onChangeCustomMajor;

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

  const resetEduForm = () => {
    setEditingEduIdx(null);
    setEduLevel('');
    setEduProgramYears('');
    setEduDegree('');
    setEduMajor('');
    setEduInstitution('');
    setEduGradYear('');
    setEduIsCustomYears(false);
    setEduIsCustomDegree(false);
    setEduIsCustomMajor(false);
    setEduFormError(null);
  };

  const handleEduFormLevelChange = (nextLevel: string) => {
    const validYears = getProgramYearsForLevel(nextLevel);
    const validDegrees = getDegreesForLevel(nextLevel);
    setEduLevel(nextLevel);
    setEduIsCustomYears(false);
    setEduIsCustomDegree(false);
    setEduProgramYears((prev) => (prev && validYears.includes(prev) ? prev : ''));
    setEduDegree((prev) => (prev && validDegrees.includes(prev) ? prev : ''));
    setEduFormError(null);
  };

  const applyEducationsUpdate = (nextEntries: EducationEntry[]) => {
    const sorted = sortEducationsHighestFirst(nextEntries);
    const highest = resolveHighestEducation(sorted);
    onChangeStaff({
      ...staff,
      educations: sorted,
      educationLevel: highest.educationLevel,
      educationProgramYears: highest.educationProgramYears,
      educationDegree: highest.educationDegree,
      major: highest.major,
      educationInstitution: highest.educationInstitution,
      educationGradYear: highest.educationGradYear,
    });
  };

  const handleSaveEducation = () => {
    if (!eduLevel.trim() && !eduDegree.trim()) {
      setEduFormError('กรุณาเลือกระดับวุฒิการศึกษาหรือชื่อคุณวุฒิ');
      return;
    }
    const entry: EducationEntry = {
      level: eduLevel.trim() || inferEducationLevel({ degree: eduDegree }),
      programYears: eduProgramYears.trim(),
      degree: eduDegree.trim() || eduLevel.trim(),
      major: eduMajor.trim(),
      institute: eduInstitution.trim(),
      gradYear: eduGradYear.trim(),
    };
    const nextList = [...displayedEducations];
    if (editingEduIdx !== null && editingEduIdx >= 0 && editingEduIdx < nextList.length) {
      nextList[editingEduIdx] = entry;
    } else {
      nextList.push(entry);
    }
    applyEducationsUpdate(nextList);
    resetEduForm();
  };

  const handleEditEducation = (idx: number) => {
    const item = displayedEducations[idx];
    if (!item) return;
    const resolvedLevel = inferEducationLevel(item) || item.level || '';
    const validYears = getProgramYearsForLevel(resolvedLevel);
    const validDegrees = getDegreesForLevel(resolvedLevel);

    setEditingEduIdx(idx);
    setEduLevel(resolvedLevel);
    setEduProgramYears(item.programYears || '');
    setEduIsCustomYears(Boolean(item.programYears && !validYears.includes(item.programYears)));
    setEduDegree(item.degree || '');
    setEduIsCustomDegree(Boolean(item.degree && !validDegrees.includes(item.degree)));
    setEduMajor(item.major || '');
    setEduIsCustomMajor(Boolean(item.major && !isStandardMajor(item.major)));
    setEduInstitution(item.institute || '');
    setEduGradYear(item.gradYear || '');
    setEduFormError(null);
  };

  const handleConfirmDeleteEducation = () => {
    if (deletingEduIdx === null) return;
    const nextList = displayedEducations.filter((_, i) => i !== deletingEduIdx);
    applyEducationsUpdate(nextList);
    if (editingEduIdx === deletingEduIdx) {
      resetEduForm();
    }
    setDeletingEduIdx(null);
  };

  // =========================================================================
  // Tab 4: Academic Standing Handlers (Synced with ViewRegStanding)
  // =========================================================================
  const orderedStandings = sortStandingsDesc(staff.standings);

  const resetStandingForm = () => {
    setEditingStandingIdx(null);
    setStdLevel('ชำนาญการ');
    setStdOrderNo('');
    setStdOrderDate('');
    setStdEffectiveDate('');
    setStdFormError(null);
  };

  const handleSaveStandingInline = () => {
    const levelClean = stdLevel.trim();
    const isBaseline = BASELINE_STANDING_LEVELS.has(levelClean);
    if (!levelClean) {
      setStdFormError('กรุณาเลือกระดับวิทยฐานะ');
      return;
    }
    if (!isBaseline && !stdOrderNo.trim()) {
      setStdFormError('กรุณาระบุเลขที่คำสั่งแต่งตั้ง');
      return;
    }
    if (!isBaseline && !stdEffectiveDate) {
      setStdFormError('กรุณาเลือกวันที่มีผลตามคำสั่ง');
      return;
    }

    const nextItem = {
      level: levelClean,
      orderNumber: stdOrderNo.trim() || '-',
      orderDate: stdOrderDate || undefined,
      effectiveDate: stdEffectiveDate || '',
    };

    const currentList = [...orderedStandings];
    if (editingStandingIdx !== null && editingStandingIdx >= 0 && editingStandingIdx < currentList.length) {
      currentList[editingStandingIdx] = nextItem;
    } else {
      currentList.push(nextItem);
    }

    const sortedNext = sortStandingsDesc(currentList);
    const nextAcademicStanding = sortedNext.length > 0 ? sortedNext[0].level : '-';

    onChangeStaff({
      ...staff,
      standings: sortedNext,
      academicStanding: nextAcademicStanding,
    });
    resetStandingForm();
  };

  const handleEditStandingInline = (idx: number) => {
    const item = orderedStandings[idx];
    if (!item) return;
    const normalized = formatShortStanding(item.level);
    setEditingStandingIdx(idx);
    setStdLevel(STANDING_LEVEL_OPTIONS.includes(normalized) ? normalized : item.level || 'ชำนาญการ');
    setStdOrderNo(item.orderNumber === '-' ? '' : item.orderNumber || '');
    setStdOrderDate(item.orderDate || '');
    setStdEffectiveDate(item.effectiveDate || '');
    setStdFormError(null);
  };

  const handleConfirmDeleteStandingInline = () => {
    if (deletingStandingIdx === null) return;
    const nextList = orderedStandings.filter((_, i) => i !== deletingStandingIdx);
    const sortedNext = sortStandingsDesc(nextList);
    const nextAcademicStanding = sortedNext.length > 0 ? sortedNext[0].level : '-';
    onChangeStaff({
      ...staff,
      standings: sortedNext,
      academicStanding: nextAcademicStanding,
    });
    if (editingStandingIdx === deletingStandingIdx) {
      resetStandingForm();
    }
    setDeletingStandingIdx(null);
  };

  // =========================================================================
  // Tab 5: License Handlers (Synced with ViewRegLicense)
  // =========================================================================
  const currentLicenses = Array.isArray(staff.licenses) ? staff.licenses : [];

  const resetLicenseForm = () => {
    setEditingLicenseIdx(null);
    setLicTypeSelect(LICENSE_TYPE_OPTIONS[0]);
    setLicCustomType('');
    setLicNumber('');
    setLicIssueDate('');
    setLicExpiryDate('');
    setLicFormError(null);
  };

  const handleSaveLicenseInline = () => {
    const resolvedType =
      licTypeSelect === CUSTOM_LICENSE_VALUE ? licCustomType.trim() : licTypeSelect.trim();
    if (!resolvedType) {
      setLicFormError('กรุณาระบุประเภทใบอนุญาตประกอบวิชาชีพ');
      return;
    }
    if (!licNumber.trim()) {
      setLicFormError('กรุณาระบุเลขที่ใบอนุญาต');
      return;
    }
    if (!licExpiryDate) {
      setLicFormError('กรุณาเลือกวันหมดอายุใบอนุญาต');
      return;
    }

    const nextLic = {
      category: deriveLicenseCategory(resolvedType),
      type: resolvedType,
      number: licNumber.trim(),
      issueDate: licIssueDate || '',
      expiryDate: licExpiryDate,
    };

    const nextList = [...currentLicenses];
    if (editingLicenseIdx !== null && editingLicenseIdx >= 0 && editingLicenseIdx < nextList.length) {
      nextList[editingLicenseIdx] = nextLic;
    } else {
      nextList.push(nextLic);
    }

    onChangeStaff({ ...staff, licenses: nextList });
    resetLicenseForm();
  };

  const handleEditLicenseInline = (idx: number) => {
    const item = currentLicenses[idx];
    if (!item) return;
    const isPreset = LICENSE_TYPE_OPTIONS.includes(item.type);
    setEditingLicenseIdx(idx);
    setLicTypeSelect(isPreset ? item.type : CUSTOM_LICENSE_VALUE);
    setLicCustomType(isPreset ? '' : item.type || '');
    setLicNumber(item.number || '');
    setLicIssueDate(item.issueDate || '');
    setLicExpiryDate(item.expiryDate || '');
    setLicFormError(null);
  };

  const handleConfirmDeleteLicenseInline = () => {
    if (deletingLicenseIdx === null) return;
    const nextList = currentLicenses.filter((_, i) => i !== deletingLicenseIdx);
    onChangeStaff({ ...staff, licenses: nextList });
    if (editingLicenseIdx === deletingLicenseIdx) {
      resetLicenseForm();
    }
    setDeletingLicenseIdx(null);
  };

  // =========================================================================
  // Tab 6: Scout Handlers (Direct Single Source of Truth via /api/admin/scout)
  // =========================================================================
  const showScoutNotice = (type: 'success' | 'error', text: string) => {
    setScoutNotice({ type, text });
    setTimeout(() => {
      setScoutNotice((prev) => (prev?.text === text ? null : prev));
    }, 4000);
  };

  const resetScoutForm = () => {
    setEditingScoutId(null);
    setScoutBadgeLevel(SCOUT_BADGE_LEVELS[2]);
    setScoutCategory(SCOUT_CATEGORIES[0]);
    setScoutQualification(buildDefaultScoutTitle(SCOUT_CATEGORIES[0], SCOUT_BADGE_LEVELS[2]));
    setIsScoutQualManual(false);
    setScoutCertNo('');
    setScoutOrderNo('');
    setScoutIssueDate('');
    setScoutIssuedBy('สำนักงานลูกเสือแห่งชาติ');
  };

  const handleEditScoutInline = (record: ScoutRecord) => {
    setEditingScoutId(record.id);
    setScoutQualification(record.qualification || '');
    setIsScoutQualManual(true);
    setScoutBadgeLevel(record.badgeLevel || SCOUT_BADGE_LEVELS[2]);
    setScoutCategory(record.category || SCOUT_CATEGORIES[0]);
    setScoutCertNo(record.certificateNo || '');
    setScoutOrderNo(record.orderNumber || '');
    setScoutIssueDate(record.issueDate || '');
    setScoutIssuedBy(record.issuedBy || 'สำนักงานลูกเสือแห่งชาติ');
  };

  const handleSaveScoutDirect = async () => {
    if (isNewStaff) return;
    if (!scoutQualification.trim()) {
      showScoutNotice('error', 'กรุณาระบุชื่อวุฒิทางลูกเสือ');
      return;
    }

    const payload: ScoutRecord = {
      id: editingScoutId || `SCT-${Date.now().toString().slice(-6)}`,
      teacherId: staff.id,
      teacherName: formatStaffName(staff),
      position: staff.position || 'ครู',
      qualification: scoutQualification.trim(),
      badgeLevel: scoutBadgeLevel,
      category: scoutCategory,
      certificateNo: scoutCertNo.trim() || '-',
      orderNumber: scoutOrderNo.trim() || '-',
      issueDate: scoutIssueDate || '',
      issuedBy: scoutIssuedBy.trim() || 'สำนักงานลูกเสือแห่งชาติ',
    };

    setIsScoutSaving(true);
    try {
      const res = await fetch('/api/admin/scout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'ไม่สามารถบันทึกวุฒิลูกเสือได้');
      }
      const savedRecord: ScoutRecord = json.data || payload;
      setScoutRecords((prev) =>
        editingScoutId
          ? prev.map((r) => (r.id === editingScoutId ? savedRecord : r))
          : [savedRecord, ...prev]
      );
      onScoutSynced?.(staff.id, savedRecord.qualification, savedRecord.certificateNo || '');
      resetScoutForm();
      showScoutNotice(
        'success',
        editingScoutId ? 'อัปเดตวุฒิลูกเสือในทะเบียนเรียบร้อยแล้ว' : 'เพิ่มวุฒิลูกเสือลงทะเบียนเรียบร้อยแล้ว'
      );
    } catch (err) {
      showScoutNotice('error', err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึกวุฒิลูกเสือ');
    } finally {
      setIsScoutSaving(false);
    }
  };

  const handleConfirmDeleteScoutDirect = async () => {
    if (!deletingScoutItem) return;
    const targetId = deletingScoutItem.id;
    setIsScoutSaving(true);
    try {
      const res = await fetch(`/api/admin/scout?id=${encodeURIComponent(targetId)}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'ไม่สามารถลบวุฒิลูกเสือได้');
      }
      const remaining = scoutRecords.filter((r) => r.id !== targetId);
      setScoutRecords(remaining);
      const nextHighest = remaining[0]?.qualification || 'ไม่มีวุฒิลูกเสือ';
      const nextCertNo = remaining[0]?.certificateNo || '';
      onScoutSynced?.(staff.id, nextHighest, nextCertNo);
      if (editingScoutId === targetId) resetScoutForm();
      setDeletingScoutItem(null);
      showScoutNotice('success', 'ลบข้อมูลวุฒิลูกเสือออกจากทะเบียนเรียบร้อยแล้ว');
    } catch (err) {
      showScoutNotice('error', err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการลบข้อมูล');
    } finally {
      setIsScoutSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="staff-edit-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto"
    >
      <div
        className="bg-white dark:bg-[#141d27] border border-slate-200/90 dark:border-slate-700 rounded-2xl max-w-4xl w-full p-5 sm:p-6 shadow-2xl space-y-4 text-xs flex flex-col text-slate-800 dark:text-slate-200"
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

        {/* 3×2 Equal-Width Core Tab Navigation (Fixed) */}
        <div
          role="tablist"
          className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-1.5 bg-slate-100 dark:bg-[#0d141d] rounded-xl border border-slate-200/80 dark:border-slate-800 shrink-0"
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

              {/* Relocated Sub-group: บัญชีและสิทธิ์ระบบ (2-Column) */}
              <div className="bg-slate-50 dark:bg-[#101822] p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 space-y-3">
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-200/80 dark:border-slate-800 pb-2">
                  บัญชีและสิทธิ์ระบบ
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 3: วุฒิการศึกษาและวิชาเอก (List Top + Standardized ก.ค.ศ. Form) */}
          {/* ============================================================== */}
          {activeTab === 'education' && (
            <div className="space-y-4">
              {/* Top Section: Saved Qualifications List (Sorted Highest-First) */}
              <div className="bg-slate-50 dark:bg-[#101822] p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 dark:border-slate-800 pb-2">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    วุฒิการศึกษาที่บันทึกไว้ ({displayedEducations.length} รายการ)
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

                {displayedEducations.length > 0 ? (
                  <div className="space-y-2">
                    {displayedEducations.map((edu, idx) => {
                      const resolvedLevel = inferEducationLevel(edu) || edu.level || '';
                      return (
                        <div
                          key={`${edu.degree}-${edu.major}-${edu.gradYear}-${idx}`}
                          className={`flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 rounded-lg bg-white dark:bg-[#16212e] border transition-colors ${
                            editingEduIdx === idx
                              ? 'border-sky-500 ring-1 ring-sky-500/30'
                              : 'border-slate-200/90 dark:border-slate-700/80'
                          }`}
                        >
                          <div className="min-w-0 space-y-0.5">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {idx === 0 && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/30">
                                  วุฒิสูงสุด
                                </span>
                              )}
                              {resolvedLevel && (
                                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                  {resolvedLevel}
                                </span>
                              )}
                              <span className="font-semibold text-slate-900 dark:text-white">
                                {edu.degree || '-'}
                              </span>
                              {edu.programYears && (
                                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                  ({edu.programYears})
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                              {edu.major ? `สาขา/วิชาเอก: ${edu.major}` : 'ไม่ระบุวิชาเอก'}
                              {edu.institute ? ` · ${edu.institute}` : ''}
                              {edu.gradYear ? ` · พ.ศ. ${edu.gradYear}` : ''}
                            </div>
                          </div>
                          <div className="inline-flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleEditEducation(idx)}
                              title="แก้ไขวุฒิการศึกษา"
                              className="p-1.5 rounded-md text-slate-500 hover:text-sky-600 hover:bg-sky-50 dark:text-slate-400 dark:hover:text-sky-400 dark:hover:bg-sky-500/10 transition-colors cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingEduIdx(idx)}
                              title="ลบวุฒิการศึกษา"
                              className="p-1.5 rounded-md text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:text-slate-400 dark:hover:text-rose-400 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 py-1">
                    ยังไม่มีวุฒิการศึกษาที่บันทึกไว้ สามารถเพิ่มได้จากแบบฟอร์มมาตรฐาน ก.ค.ศ. ด้านล่าง
                  </p>
                )}
              </div>

              {/* Bottom Section: Single Standardized ก.ค.ศ. Form */}
              <div className="bg-slate-50 dark:bg-[#101822] p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-2">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {editingEduIdx !== null ? 'แก้ไขวุฒิการศึกษา' : 'เพิ่มวุฒิการศึกษา (มาตรฐาน ก.ค.ศ.)'}
                  </span>
                  {editingEduIdx !== null && (
                    <button
                      type="button"
                      onClick={resetEduForm}
                      className="text-[11px] text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white cursor-pointer"
                    >
                      ยกเลิกการแก้ไข
                    </button>
                  )}
                </div>

                {eduFormError && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-[11px]">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{eduFormError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                  {/* 1. ระดับวุฒิการศึกษา */}
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                      ระดับวุฒิการศึกษา <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={eduLevel}
                      onChange={(e) => handleEduFormLevelChange(e.target.value)}
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
                      disabled={!eduLevel}
                      value={
                        eduIsCustomYears
                          ? CUSTOM_OPTION_LABEL
                          : eduProgramYears && eduProgramYearsOptions.includes(eduProgramYears)
                          ? eduProgramYears
                          : ''
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === CUSTOM_OPTION_LABEL) {
                          setEduIsCustomYears(true);
                          if (eduProgramYearsOptions.includes(eduProgramYears)) {
                            setEduProgramYears('');
                          }
                        } else {
                          setEduIsCustomYears(false);
                          setEduProgramYears(val);
                        }
                      }}
                      className="w-full h-10 bg-white dark:bg-[#16212e] disabled:bg-slate-100 dark:disabled:bg-slate-800/50 border border-slate-200/90 dark:border-slate-700 rounded-lg px-3 text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 disabled:cursor-not-allowed"
                    >
                      <option value="">
                        {eduLevel ? '- เลือกหลักสูตร -' : 'เลือกระดับวุฒิก่อน'}
                      </option>
                      {eduProgramYearsOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                      {eduLevel && (
                        <option value={CUSTOM_OPTION_LABEL}>{CUSTOM_OPTION_LABEL}</option>
                      )}
                    </select>
                    {eduIsCustomYears && (
                      <input
                        type="text"
                        value={eduProgramYears}
                        placeholder="ระบุหลักสูตร..."
                        onChange={(e) => setEduProgramYears(e.target.value)}
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
                      disabled={!eduLevel}
                      value={
                        eduIsCustomDegree
                          ? CUSTOM_OPTION_LABEL
                          : eduDegree && eduDegreeOptions.includes(eduDegree)
                          ? eduDegree
                          : ''
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === CUSTOM_OPTION_LABEL) {
                          setEduIsCustomDegree(true);
                          if (eduDegreeOptions.includes(eduDegree)) {
                            setEduDegree('');
                          }
                        } else {
                          setEduIsCustomDegree(false);
                          setEduDegree(val);
                        }
                      }}
                      className="w-full h-10 bg-white dark:bg-[#16212e] disabled:bg-slate-100 dark:disabled:bg-slate-800/50 border border-slate-200/90 dark:border-slate-700 rounded-lg px-3 text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 disabled:cursor-not-allowed"
                    >
                      <option value="">
                        {eduLevel ? '- เลือกชื่อคุณวุฒิ / ปริญญา -' : 'เลือกระดับวุฒิก่อน'}
                      </option>
                      {eduDegreeOptions.map((deg) => (
                        <option key={deg} value={deg}>
                          {deg}
                        </option>
                      ))}
                      {eduLevel && (
                        <option value={CUSTOM_OPTION_LABEL}>{CUSTOM_OPTION_LABEL}</option>
                      )}
                    </select>
                    {eduIsCustomDegree && (
                      <input
                        type="text"
                        value={eduDegree}
                        placeholder="ระบุชื่อคุณวุฒิ / ปริญญา..."
                        onChange={(e) => setEduDegree(e.target.value)}
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
                        eduIsCustomMajor
                          ? CUSTOM_MAJOR_OPTION
                          : eduMajor && isStandardMajor(eduMajor)
                          ? eduMajor
                          : ''
                      }
                      groups={MAJOR_GROUPS}
                      extraBottomOption={CUSTOM_MAJOR_OPTION}
                      placeholder="เลือกสาขา / วิชาเอก..."
                      searchPlaceholder="ค้นหาวิชาเอก (105+ สาขา)..."
                      allowClear
                      onChange={(val) => {
                        if (val === CUSTOM_MAJOR_OPTION) {
                          setEduIsCustomMajor(true);
                          if (isStandardMajor(eduMajor)) {
                            setEduMajor('');
                          }
                        } else {
                          setEduIsCustomMajor(false);
                          setEduMajor(val);
                        }
                      }}
                    />
                    {eduIsCustomMajor && (
                      <input
                        type="text"
                        value={eduMajor}
                        placeholder="ระบุสาขา / วิชาเอกเพิ่มเติม..."
                        onChange={(e) => setEduMajor(e.target.value)}
                        className="w-full h-9 bg-white dark:bg-[#16212e] border border-slate-200/90 dark:border-slate-700 rounded-lg px-3 text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                      />
                    )}
                  </div>
                </div>

                {/* 5 & 6: สถาบันการศึกษา & ปี พ.ศ. ที่จบ */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                      สถาบันการศึกษา (ถ้ามี)
                    </label>
                    <input
                      type="text"
                      value={eduInstitution}
                      placeholder="เช่น มหาวิทยาลัยราชภัฏนครราชสีมา"
                      onChange={(e) => setEduInstitution(e.target.value)}
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
                      value={eduGradYear}
                      placeholder="เช่น 2562"
                      onChange={(e) =>
                        setEduGradYear(e.target.value.replace(/[^\d]/g, '').slice(0, 4))
                      }
                      className="w-full h-10 bg-white dark:bg-[#16212e] border border-slate-200/90 dark:border-slate-700 rounded-lg px-3 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                {/* Bottom Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    ระบบจะซิงก์วุฒิสูงสุดอัตโนมัติ และบันทึกเมื่อกด &ldquo;บันทึกการเปลี่ยนแปลง&rdquo;
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    {editingEduIdx !== null && (
                      <button
                        type="button"
                        onClick={resetEduForm}
                        className="px-3 py-2 rounded-lg bg-slate-200/80 hover:bg-slate-300/80 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 text-xs font-medium cursor-pointer"
                      >
                        ยกเลิก
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleSaveEducation}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition-colors cursor-pointer"
                    >
                      {editingEduIdx !== null ? (
                        <>
                          <Check className="w-3.5 h-3.5 shrink-0" />
                          <span>บันทึกการแก้ไข</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5 shrink-0" />
                          <span>เพิ่มวุฒิการศึกษา</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 4: วิทยฐานะ (Full In-Modal CRUD, Synced w/ ViewRegStanding) */}
          {/* ============================================================== */}
          {activeTab === 'standing' && (
            <div className="space-y-4">
              {/* Current Academic Standing Summary */}
              <div className="bg-slate-50 dark:bg-[#101822] p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 dark:border-slate-800 pb-2">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    ประวัติคำสั่งแต่งตั้งวิทยฐานะ ({orderedStandings.length} รายการ)
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    วิทยฐานะปัจจุบัน:{' '}
                    <strong className="text-amber-600 dark:text-amber-400">
                      {formatShortStanding(staff.academicStanding)}
                    </strong>
                  </span>
                </div>

                {orderedStandings.length > 0 ? (
                  <div className="space-y-2">
                    {orderedStandings.map((ord, idx) => (
                      <div
                        key={`${ord.level}-${ord.orderNumber}-${ord.effectiveDate}-${idx}`}
                        className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 rounded-lg bg-white dark:bg-[#16212e] border border-slate-200/90 dark:border-slate-700/80"
                      >
                        <div className="min-w-0 space-y-0.5">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {formatShortStanding(ord.level)}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                            คำสั่ง: {ord.orderNumber || '-'}
                            {ord.orderDate ? ` · ลงวันที่: ${formatThaiDateDisplay(ord.orderDate)}` : ''}
                            {' · '}มีผล:{' '}
                            {ord.effectiveDate ? formatThaiDateDisplay(ord.effectiveDate) : '-'}
                          </div>
                        </div>
                        <div className="inline-flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleEditStandingInline(idx)}
                            title="แก้ไขคำสั่งวิทยฐานะ"
                            className="p-1.5 rounded-md text-slate-500 hover:text-sky-600 hover:bg-sky-50 dark:text-slate-400 dark:hover:text-sky-400 dark:hover:bg-sky-500/10 transition-colors cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingStandingIdx(idx)}
                            title="ลบคำสั่งวิทยฐานะ"
                            className="p-1.5 rounded-md text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:text-slate-400 dark:hover:text-rose-400 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 py-1">
                    ยังไม่มีรายการคำสั่งวิทยฐานะที่บันทึกไว้ สามารถเพิ่มได้จากแบบฟอร์มด้านล่าง
                  </p>
                )}
              </div>

              {/* Add / Edit Standing Sub-Form */}
              <div className="bg-slate-50 dark:bg-[#101822] p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-2">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {editingStandingIdx !== null ? 'แก้ไขรายการวิทยฐานะ' : 'เพิ่มรายการวิทยฐานะ / คำสั่งแต่งตั้ง'}
                  </span>
                  {editingStandingIdx !== null && (
                    <button
                      type="button"
                      onClick={resetStandingForm}
                      className="text-[11px] text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white cursor-pointer"
                    >
                      ยกเลิกการแก้ไข
                    </button>
                  )}
                </div>

                {stdFormError && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-[11px]">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{stdFormError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                      ระดับวิทยฐานะ <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={stdLevel}
                      onChange={(e) => {
                        setStdLevel(e.target.value);
                        setStdFormError(null);
                      }}
                      className="w-full h-10 bg-white dark:bg-[#16212e] border border-slate-200/90 dark:border-slate-700 rounded-lg px-3 text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                    >
                      {STANDING_LEVEL_OPTIONS.map((lvl) => (
                        <option key={lvl} value={lvl}>
                          {lvl}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                      เลขที่คำสั่งแต่งตั้ง{' '}
                      {!BASELINE_STANDING_LEVELS.has(stdLevel) && (
                        <span className="text-rose-500">*</span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={stdOrderNo}
                      onChange={(e) => {
                        setStdOrderNo(e.target.value);
                        setStdFormError(null);
                      }}
                      placeholder="เช่น คำสั่งที่ 123/2567"
                      className="w-full h-10 bg-white dark:bg-[#16212e] border border-slate-200/90 dark:border-slate-700 rounded-lg px-3 font-mono text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                      ลงวันที่คำสั่ง (ถ้ามี)
                    </label>
                    <ThaiDatePicker
                      value={stdOrderDate}
                      onChange={setStdOrderDate}
                      placeholder="เลือกวันที่ลงนามคำสั่ง"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                      วันที่มีผลตามคำสั่ง{' '}
                      {!BASELINE_STANDING_LEVELS.has(stdLevel) && (
                        <span className="text-rose-500">*</span>
                      )}
                    </label>
                    <ThaiDatePicker
                      value={stdEffectiveDate}
                      onChange={(val) => {
                        setStdEffectiveDate(val);
                        setStdFormError(null);
                      }}
                      placeholder="เลือกวันที่มีผล"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    ระบบจะปรับวิทยฐานะปัจจุบันตามคำสั่งล่าสุด และบันทึกเมื่อกด &ldquo;บันทึกการเปลี่ยนแปลง&rdquo;
                  </span>
                  <button
                    type="button"
                    onClick={handleSaveStandingInline}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition-colors cursor-pointer shrink-0"
                  >
                    {editingStandingIdx !== null ? (
                      <>
                        <Check className="w-3.5 h-3.5 shrink-0" />
                        <span>อัปเดตรายการ</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5 shrink-0" />
                        <span>เพิ่มวิทยฐานะ</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 5: ใบอนุญาตฯ (Full In-Modal CRUD, Synced w/ ViewRegLicense) */}
          {/* ============================================================== */}
          {activeTab === 'license' && (
            <div className="space-y-4">
              {/* Existing Licenses List */}
              <div className="bg-slate-50 dark:bg-[#101822] p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 space-y-3">
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-200/80 dark:border-slate-800 pb-2">
                  ใบอนุญาตประกอบวิชาชีพที่ถือครอง ({currentLicenses.length} ฉบับ)
                </div>

                {currentLicenses.length > 0 ? (
                  <div className="space-y-2">
                    {currentLicenses.map((lic, idx) => {
                      const healthEval = lic.expiryDate ? evaluateLicenseHealth(lic.expiryDate) : null;
                      const healthLabel =
                        healthEval?.health === 'EXPIRED'
                          ? 'หมดอายุ'
                          : healthEval?.health === 'EXPIRING_SOON'
                          ? 'ใกล้หมดอายุ'
                          : healthEval?.health === 'VALID'
                          ? 'ปกติ'
                          : null;
                      const healthBadgeClass =
                        healthEval?.health === 'EXPIRED'
                          ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30'
                          : healthEval?.health === 'EXPIRING_SOON'
                          ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30';
                      return (
                        <div
                          key={`${lic.number}-${idx}`}
                          className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 rounded-lg bg-white dark:bg-[#16212e] border border-slate-200/90 dark:border-slate-700/80"
                        >
                          <div className="min-w-0 space-y-0.5">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-semibold text-slate-900 dark:text-white">
                                {lic.type}
                              </span>
                              <span className="font-mono text-[11px] font-normal text-slate-500 dark:text-slate-400">
                                ({lic.number})
                              </span>
                              {healthLabel && (
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${healthBadgeClass}`}
                                >
                                  {healthLabel}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                              วันออก: {lic.issueDate ? formatThaiDateDisplay(lic.issueDate) : '-'} ·
                              วันหมดอายุ:{' '}
                              {lic.expiryDate ? formatThaiDateDisplay(lic.expiryDate) : '-'}
                            </div>
                          </div>
                          <div className="inline-flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleEditLicenseInline(idx)}
                              title="แก้ไขใบอนุญาต"
                              className="p-1.5 rounded-md text-slate-500 hover:text-sky-600 hover:bg-sky-50 dark:text-slate-400 dark:hover:text-sky-400 dark:hover:bg-sky-500/10 transition-colors cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingLicenseIdx(idx)}
                              title="ลบใบอนุญาต"
                              className="p-1.5 rounded-md text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:text-slate-400 dark:hover:text-rose-400 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 py-1">
                    ยังไม่มีข้อมูลใบอนุญาตประกอบวิชาชีพ สามารถเพิ่มได้จากแบบฟอร์มด้านล่าง
                  </p>
                )}
              </div>

              {/* Add / Edit License Sub-Form */}
              <div className="bg-slate-50 dark:bg-[#101822] p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-2">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {editingLicenseIdx !== null ? 'แก้ไขข้อมูลใบอนุญาตประกอบวิชาชีพ' : 'เพิ่มใบอนุญาตประกอบวิชาชีพ'}
                  </span>
                  {editingLicenseIdx !== null && (
                    <button
                      type="button"
                      onClick={resetLicenseForm}
                      className="text-[11px] text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white cursor-pointer"
                    >
                      ยกเลิกการแก้ไข
                    </button>
                  )}
                </div>

                {licFormError && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-[11px]">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{licFormError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                      ประเภทใบอนุญาต <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={licTypeSelect}
                      onChange={(e) => {
                        setLicTypeSelect(e.target.value);
                        setLicFormError(null);
                      }}
                      className="w-full h-10 bg-white dark:bg-[#16212e] border border-slate-200/90 dark:border-slate-700 rounded-lg px-3 text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                    >
                      {LICENSE_TYPE_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                      <option value={CUSTOM_LICENSE_VALUE}>อื่นๆ (ระบุเอง)...</option>
                    </select>
                    {licTypeSelect === CUSTOM_LICENSE_VALUE && (
                      <input
                        type="text"
                        value={licCustomType}
                        onChange={(e) => setLicCustomType(e.target.value)}
                        placeholder="ระบุประเภทใบอนุญาต..."
                        className="mt-2 w-full h-9 bg-white dark:bg-[#16212e] border border-slate-200/90 dark:border-slate-700 rounded-lg px-3 text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                      เลขที่ใบอนุญาต <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={licNumber}
                      onChange={(e) => {
                        setLicNumber(e.target.value);
                        setLicFormError(null);
                      }}
                      placeholder="เช่น 65109000123456"
                      className="w-full h-10 bg-white dark:bg-[#16212e] border border-slate-200/90 dark:border-slate-700 rounded-lg px-3 font-mono text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                      วันออกใบอนุญาต
                    </label>
                    <ThaiDatePicker
                      value={licIssueDate}
                      onChange={setLicIssueDate}
                      placeholder="เลือกวันออกใบอนุญาต"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                      วันหมดอายุ <span className="text-rose-500">*</span>
                    </label>
                    <ThaiDatePicker
                      value={licExpiryDate}
                      onChange={(val) => {
                        setLicExpiryDate(val);
                        setLicFormError(null);
                      }}
                      placeholder="เลือกวันหมดอายุ"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    ซิงก์ตรงกับทะเบียนใบอนุญาตฯ เมื่อกด &ldquo;บันทึกการเปลี่ยนแปลง&rdquo;
                  </span>
                  <button
                    type="button"
                    onClick={handleSaveLicenseInline}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition-colors cursor-pointer shrink-0"
                  >
                    {editingLicenseIdx !== null ? (
                      <>
                        <Check className="w-3.5 h-3.5 shrink-0" />
                        <span>อัปเดตใบอนุญาต</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5 shrink-0" />
                        <span>เพิ่มใบอนุญาต</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 6: วุฒิลูกเสือ (Direct Single Source of Truth /api/admin/scout) */}
          {/* ============================================================== */}
          {activeTab === 'scout' && (
            <div className="space-y-4">
              {scoutNotice && (
                <div
                  className={`flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border text-xs font-medium ${
                    scoutNotice.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                      : 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {scoutNotice.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0" />
                    )}
                    <span>{scoutNotice.text}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setScoutNotice(null)}
                    className="opacity-70 hover:opacity-100 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {isNewStaff ? (
                <div className="bg-slate-50 dark:bg-[#101822] p-5 rounded-xl border border-slate-200/90 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
                  กรุณาบันทึกข้อมูลบุคลากรใหม่ให้เรียบร้อยก่อน จึงจะสามารถเพิ่มประวัติวุฒิลูกเสือในทะเบียนวุฒิลูกเสือได้
                </div>
              ) : (
                <>
                  {/* Existing Scout Records */}
                  <div className="bg-slate-50 dark:bg-[#101822] p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 space-y-3">
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-200/80 dark:border-slate-800 pb-2">
                      ประวัติวุฒิทางลูกเสือ ({scoutRecords.length} รายการ)
                    </div>

                    {isScoutLoading ? (
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 py-2">
                        <Loader2 className="w-4 h-4 animate-spin text-sky-500" />
                        <span>กำลังโหลดข้อมูลวุฒิลูกเสือ...</span>
                      </div>
                    ) : scoutRecords.length > 0 ? (
                      <div className="space-y-2">
                        {scoutRecords.map((rec) => (
                          <div
                            key={rec.id}
                            className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 rounded-lg bg-white dark:bg-[#16212e] border border-slate-200/90 dark:border-slate-700/80"
                          >
                            <div className="min-w-0 space-y-0.5">
                              <div className="font-semibold text-slate-900 dark:text-white">
                                {rec.qualification}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                {rec.badgeLevel} · {rec.category} · วุฒิบัตร:{' '}
                                <span className="font-mono">{rec.certificateNo || '-'}</span>
                                {rec.issueDate
                                  ? ` · ${formatThaiDateDisplay(rec.issueDate)}`
                                  : ''}
                              </div>
                            </div>
                            <div className="inline-flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                disabled={isScoutSaving}
                                onClick={() => handleEditScoutInline(rec)}
                                title="แก้ไขวุฒิลูกเสือ"
                                className="p-1.5 rounded-md text-slate-500 hover:text-sky-600 hover:bg-sky-50 dark:text-slate-400 dark:hover:text-sky-400 dark:hover:bg-sky-500/10 transition-colors cursor-pointer"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={isScoutSaving}
                                onClick={() => setDeletingScoutItem(rec)}
                                title="ลบวุฒิลูกเสือ"
                                className="p-1.5 rounded-md text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:text-slate-400 dark:hover:text-rose-400 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 py-1">
                        ยังไม่มีบันทึกวุฒิทางลูกเสือในระบบ สามารถเพิ่มได้จากแบบฟอร์มด้านล่าง
                      </p>
                    )}
                  </div>

                  {/* Add / Edit Scout Sub-Form (Dropdowns Above Title w/ Smart Auto-Fill) */}
                  <div className="bg-slate-50 dark:bg-[#101822] p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-2">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {editingScoutId ? 'แก้ไขข้อมูลวุฒิลูกเสือ' : 'เพิ่มข้อมูลวุฒิลูกเสือ'}
                      </span>
                      {editingScoutId && (
                        <button
                          type="button"
                          onClick={resetScoutForm}
                          className="text-[11px] text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white cursor-pointer"
                        >
                          ยกเลิกการแก้ไข
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                          ระดับวุฒิ / เครื่องหมาย
                        </label>
                        <select
                          value={scoutBadgeLevel}
                          onChange={(e) => {
                            const nextLvl = e.target.value;
                            setScoutBadgeLevel(nextLvl);
                            if (!isScoutQualManual) {
                              setScoutQualification(buildDefaultScoutTitle(scoutCategory, nextLvl));
                            }
                          }}
                          className="w-full h-10 bg-white dark:bg-[#16212e] border border-slate-200/90 dark:border-slate-700 rounded-lg px-3 text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                        >
                          {SCOUT_BADGE_LEVELS.map((lvl) => (
                            <option key={lvl} value={lvl}>
                              {lvl}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                          ประเภทลูกเสือ
                        </label>
                        <select
                          value={scoutCategory}
                          onChange={(e) => {
                            const nextCat = e.target.value;
                            setScoutCategory(nextCat);
                            if (!isScoutQualManual) {
                              setScoutQualification(buildDefaultScoutTitle(nextCat, scoutBadgeLevel));
                            }
                          }}
                          className="w-full h-10 bg-white dark:bg-[#16212e] border border-slate-200/90 dark:border-slate-700 rounded-lg px-3 text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                        >
                          {SCOUT_CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                        ชื่อวุฒิทางลูกเสือ <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={scoutQualification}
                        onChange={(e) => {
                          setScoutQualification(e.target.value);
                          setIsScoutQualManual(e.target.value.trim().length > 0);
                        }}
                        placeholder="เช่น ผู้กำกับลูกเสือสามัญ ขั้นวูดแบดจ์ 2 ท่อน (W.B.)"
                        className="w-full h-10 bg-white dark:bg-[#16212e] border border-slate-200/90 dark:border-slate-700 rounded-lg px-3 text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                          เลขที่วุฒิบัตร
                        </label>
                        <input
                          type="text"
                          value={scoutCertNo}
                          onChange={(e) => setScoutCertNo(e.target.value)}
                          placeholder="เช่น ว.บ. 1234/2565"
                          className="w-full h-10 bg-white dark:bg-[#16212e] border border-slate-200/90 dark:border-slate-700 rounded-lg px-3 font-mono text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                          วันที่ได้รับวุฒิบัตร
                        </label>
                        <ThaiDatePicker
                          value={scoutIssueDate}
                          onChange={setScoutIssueDate}
                          placeholder="เลือกวันที่ได้รับวุฒิบัตร"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                          คำสั่งอ้างอิง (ถ้ามี)
                        </label>
                        <input
                          type="text"
                          value={scoutOrderNo}
                          onChange={(e) => setScoutOrderNo(e.target.value)}
                          placeholder="เช่น คำสั่งที่ 45/2565"
                          className="w-full h-10 bg-white dark:bg-[#16212e] border border-slate-200/90 dark:border-slate-700 rounded-lg px-3 text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                          หน่วยงานที่ออกวุฒิบัตร
                        </label>
                        <input
                          type="text"
                          value={scoutIssuedBy}
                          onChange={(e) => setScoutIssuedBy(e.target.value)}
                          placeholder="สำนักงานลูกเสือแห่งชาติ"
                          className="w-full h-10 bg-white dark:bg-[#16212e] border border-slate-200/90 dark:border-slate-700 rounded-lg px-3 text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        บันทึกตรงเข้าทะเบียนวุฒิลูกเสือทันที และซิงก์วุฒิสูงสุดอัตโนมัติ
                      </span>
                      <button
                        type="button"
                        disabled={isScoutSaving}
                        onClick={handleSaveScoutDirect}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                      >
                        {isScoutSaving ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                        ) : editingScoutId ? (
                          <Check className="w-3.5 h-3.5 shrink-0" />
                        ) : (
                          <Plus className="w-3.5 h-3.5 shrink-0" />
                        )}
                        <span>
                          {isScoutSaving
                            ? 'กำลังบันทึก...'
                            : editingScoutId
                            ? 'บันทึกการแก้ไขวุฒิลูกเสือ'
                            : 'เพิ่มวุฒิลูกเสือ'}
                        </span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Unified Modal Footer (Fixed): Delete on bottom-left, Cancel + Save on bottom-right */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200/90 dark:border-slate-800 shrink-0">
          <div>
            {!isNewStaff && (
              <button
                type="button"
                disabled={isSaving}
                onClick={() => onDeleteStaff(staff.id)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-rose-300/90 text-rose-600 hover:bg-rose-50 dark:border-rose-900/70 dark:text-rose-400 dark:hover:bg-rose-950/40 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                <span>ลบข้อมูลบุคลากร</span>
              </button>
            )}
          </div>
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

      {/* In-App Delete Confirmations for Tabs 3, 4, 5, 6 */}
      <ConfirmModal
        isOpen={deletingEduIdx !== null}
        title="ยืนยันการลบวุฒิการศึกษา"
        description="ต้องการลบวุฒิการศึกษารายการนี้ออกจากประวัติบุคลากรใช่หรือไม่? ระบบจะปรับวุฒิการศึกษาสูงสุดให้อัตโนมัติ"
        confirmLabel="ยืนยันการลบ"
        variant="danger"
        onConfirm={handleConfirmDeleteEducation}
        onCancel={() => setDeletingEduIdx(null)}
      />

      <ConfirmModal
        isOpen={deletingStandingIdx !== null}
        title="ยืนยันการลบรายการวิทยฐานะ"
        description="ต้องการลบคำสั่งวิทยฐานะรายการนี้ออกจากประวัติของบุคลากรใช่หรือไม่? ระบบจะปรับวิทยฐานะปัจจุบันให้ตรงกับคำสั่งล่าสุดโดยอัตโนมัติ"
        confirmLabel="ยืนยันการลบ"
        variant="danger"
        onConfirm={handleConfirmDeleteStandingInline}
        onCancel={() => setDeletingStandingIdx(null)}
      />

      <ConfirmModal
        isOpen={deletingLicenseIdx !== null}
        title="ยืนยันการลบใบอนุญาตประกอบวิชาชีพ"
        description="ต้องการลบใบอนุญาตประกอบวิชาชีพฉบับนี้ออกจากข้อมูลบุคลากรใช่หรือไม่?"
        confirmLabel="ยืนยันการลบ"
        variant="danger"
        onConfirm={handleConfirmDeleteLicenseInline}
        onCancel={() => setDeletingLicenseIdx(null)}
      />

      <ConfirmModal
        isOpen={Boolean(deletingScoutItem)}
        title="ยืนยันการลบวุฒิทางลูกเสือ"
        description={
          deletingScoutItem
            ? `ต้องการลบวุฒิลูกเสือ "${deletingScoutItem.qualification}" ออกจากทะเบียนวุฒิลูกเสือใช่หรือไม่?`
            : ''
        }
        confirmLabel="ยืนยันการลบ"
        variant="danger"
        isLoading={isScoutSaving}
        onConfirm={handleConfirmDeleteScoutDirect}
        onCancel={() => !isScoutSaving && setDeletingScoutItem(null)}
      />
    </div>
  );
};
