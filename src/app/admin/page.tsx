'use client';

/**
 * ============================================================================
 * ManStat: Administrative Management Center (/admin)
 * ============================================================================
 * Master Management Center for Superuser and HR Administrators:
 * 1. จัดการข้อมูลบุคลากร (Staff Directory & Access Control)
 * 2. คณะกรรมการสถานศึกษา (Basic Education School Board)
 * 3. ข้อมูลสถานศึกษา (School Master Configuration)
 * 4. ปีงบประมาณและวันหยุด (Fiscal Year & Official Holidays)
 * 5. บันทึกความปลอดภัย PDPA (Immutable PDPA Access Audit Logs)
 *
 * Strict Zero-Emoji policy, pure Lucide SVG icons, 8px standard gap.
 * ============================================================================
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { AppLogoIcon } from '@/components/brand/AppLogo';
import { isStandardMajor } from '@/lib/constants/majors';
import {
  StaffEditModal,
  type StaffModalTabKey,
  type StaffQuickJumpView,
} from '@/components/admin/StaffEditModal';
import type { WorkloadItem } from '@/lib/data/schoolData';
import {
  ShieldAlert,
  ShieldCheck,
  Users,
  ArrowLeft,
  UserCheck,
  CheckCircle2,
  Lock,
  Building,
  Calendar,
  PlusCircle,
  Search,
  Edit,
  Trash2,
  Save,
  Award,
  UserPlus,
  GraduationCap,
  Briefcase,
  Compass,
  X,
  Plus,
  ChevronRight,
  ChevronDown,
  Sliders,
  Loader2,
  AlertCircle,
  Pencil,
  RefreshCw,
  Check,
} from 'lucide-react';
import { formatServiceDuration } from '@/lib/regulations/fiscal-and-retirement';
import { formatOfficialThaiDate } from '@/lib/regulations/thai-numerals';
import { ThaiDatePicker, formatThaiDateDisplay } from '@/components/ui/ThaiDatePicker';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { SystemSettingsTab } from '@/components/settings/SystemSettingsTab';
import { UserProfileDropdown } from '@/components/navigation/UserProfileDropdown';
import { SchoolAcademicManager } from '@/components/admin/SchoolAcademicManager';
import { FiscalPeriodManager } from '@/components/admin/FiscalPeriodManager';
import { isAdminRole } from '@/lib/auth/roles';
import {
  groupAndSortTeachers,
  formatAcademicStandingSubtext,
  deriveEmploymentType,
  formatEmploymentTypeLabel,
} from '@/lib/regulations/staff-sorting';
import { formatStaffName, parseThaiName } from '@/lib/regulations/staff-formatting';
import {
  translateAuditAction,
  cleanAuditTargetName,
  cleanAuditActor,
  filterAndSortAuditLogs,
  type AuditCategory,
} from '@/lib/regulations/audit-translation';
import {
  INITIAL_SCHOOL_INFO,
  ACTIVE_CLASSES,
  TeacherRecord,
  BoardMemberRecord,
  BOARD_STATUTORY_ORDER,
} from '@/lib/data/schoolData';
import { ThemeSwitcher } from '@/components/theme/ThemeSwitcher';

const BOARD_POSITIONS = [
  { value: 'CHAIR', title: 'ประธานกรรมการ' },
  { value: 'PARENT_REP', title: 'ผู้แทนผู้ปกครอง' },
  { value: 'TEACHER_REP', title: 'ผู้แทนครู' },
  { value: 'COMMUNITY_REP', title: 'ผู้แทนองค์กรชุมชน' },
  { value: 'LOCAL_ADMIN', title: 'ผู้แทนองค์กรปกครองส่วนท้องถิ่น' },
  { value: 'ALUMNI_REP', title: 'ผู้แทนศิษย์เก่า' },
  { value: 'RELIGION_REP', title: 'ผู้แทนพระภิกษุสงฆ์หรือผู้แทนองค์กรศาสนาอื่น' },
  { value: 'EXPERT', title: 'ผู้ทรงคุณวุฒิ' },
  { value: 'DIRECTOR_SEC', title: 'กรรมการและเลขานุการ' },
];

const SCOUT_QUALIFICATIONS = [
  'ไม่มีวุฒิลูกเสือ',
  'B.T.C.',
  'A.T.C.',
  'W.B.',
  'W.B. (3 ท่อน)',
  'W.B. (4 ท่อน)',
  'A.L.T.',
  'L.T.',
];

const LICENSE_TYPES = [
  { category: 'ครู', type: 'ใบอนุญาตประกอบวิชาชีพครู ชั้นต้น (B-License)' },
  { category: 'ครู', type: 'ใบอนุญาตประกอบวิชาชีพครู ชั้นสูง (A-License)' },
  { category: 'ครู', type: 'ใบอนุญาตปฏิบัติหน้าที่ครู (P-License)' },
  { category: 'ครู', type: 'ใบอนุญาตประกอบวิชาชีพครู (รูปแบบเดิม)' },
  { category: 'ผู้บริหารสถานศึกษา', type: 'ใบอนุญาตประกอบวิชาชีพผู้บริหารสถานศึกษา' },
  { category: 'ผู้บริหารการศึกษา', type: 'ใบอนุญาตประกอบวิชาชีพผู้บริหารการศึกษา' },
  { category: 'ศึกษานิเทศก์', type: 'ใบอนุญาตประกอบวิชาชีพศึกษานิเทศก์' },
];

const TEACHER_ROLES = [
  'ผู้อำนวยการโรงเรียน',
  'ผู้อำนวยการสถานศึกษา',
  'รองผู้อำนวยการโรงเรียน',
  'รองผู้อำนวยการสถานศึกษา',
  'ครู',
  'ครูผู้ช่วย',
  'พนักงานราชการ',
  'ครูอัตราจ้าง',
  'ลูกจ้างประจำ',
  'เจ้าหน้าที่ธุรการ',
  'ศึกษานิเทศก์',
];

const STANDARD_STANDINGS = [
  '-',
  'ไม่มีวิทยฐานะ',
  'ครูชำนาญการ (คศ. 2)',
  'ครูชำนาญการพิเศษ (คศ. 3)',
  'ครูเชี่ยวชาญ (คศ. 4)',
  'ครูเชี่ยวชาญพิเศษ (คศ. 5)',
  'ผู้อำนวยการชำนาญการพิเศษ (คศ. 3)',
  'ผู้อำนวยการเชี่ยวชาญ (คศ. 4)',
  'ผู้อำนวยการเชี่ยวชาญพิเศษ (คศ. 5)',
];

const DEPARTMENTS = [
  'ภาษาไทย',
  'คณิตศาสตร์',
  'วิทยาศาสตร์และเทคโนโลยี',
  'สังคมศึกษา ศาสนาและวัฒนธรรม',
  'สุขศึกษาและพลศึกษา',
  'ศิลปะ',
  'การงานอาชีพ',
  'ภาษาต่างประเทศ',
  'การศึกษาปฐมวัย',
  'กิจกรรมพัฒนาผู้เรียน',
  'สายงานบริหารและสนับสนุนการศึกษา',
];

export interface HolidayRecord {
  id: string;
  date: string;
  name: string;
  type: string;
}

export interface AuditLogRecord {
  id: string;
  action: string;
  actorName: string;
  actorRole: string;
  targetName: string;
  ipAddress: string;
  timestamp: string;
  details: string;
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<
    'staff' | 'board' | 'school' | 'fiscal' | 'audit' | 'preferences'
  >('staff');

  // Loading & Feedback State
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    description: string;
    confirmLabel: string;
    onConfirm: () => Promise<void> | void;
  } | null>(null);

  // Authenticated User & RBAC State
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentRole, setCurrentRole] = useState<string>('superuser');

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((current) => (current?.message === message ? null : current));
    }, 4000);
  }, []);

  // Staff State
  const [teachers, setTeachers] = useState<TeacherRecord[]>([]);
  const [workloads, setWorkloads] = useState<WorkloadItem[]>([]);
  const [staffSearch, setStaffSearch] = useState('');
  const [expandedStaffId, setExpandedStaffId] = useState<string | null>(null);
  const [expandedBoardId, setExpandedBoardId] = useState<string | null>(null);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<TeacherRecord | null>(null);
  const [initialStaffSnapshot, setInitialStaffSnapshot] = useState<TeacherRecord | null>(null);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [isCustomMajor, setIsCustomMajor] = useState(false);
  const [staffModalTab, setStaffModalTab] = useState<StaffModalTabKey>('personal');
  const [isNewStaff, setIsNewStaff] = useState(false);

  // Sub-items for Staff Modal
  const [newLicCategory, setNewLicCategory] = useState('ครู');
  const [newLicType, setNewLicType] = useState('ใบอนุญาตประกอบวิชาชีพครู ชั้นต้น (B-License)');
  const [newLicNumber, setNewLicNumber] = useState('');
  const [newLicIssue, setNewLicIssue] = useState('');
  const [newLicExpiry, setNewLicExpiry] = useState('');

  const [newStdLevel, setNewStdLevel] = useState('ครูชำนาญการ (คศ. 2)');
  const [newStdDate, setNewStdDate] = useState('');
  const [newStdOrder, setNewStdOrder] = useState('');
  const [editingStandingIndex, setEditingStandingIndex] = useState<number | null>(null);

  const [newEduDegree, setNewEduDegree] = useState('ค.บ.');
  const [newEduMajor, setNewEduMajor] = useState('');
  const [newEduInst, setNewEduInst] = useState('');
  const [newEduYear, setNewEduYear] = useState('2565');
  const [editingEducationIndex, setEditingEducationIndex] = useState<number | null>(null);

  // School Board State
  const [boardMembers, setBoardMembers] = useState<BoardMemberRecord[]>([]);
  const [boardSearch, setBoardSearch] = useState('');
  const [selectedBoardMember, setSelectedBoardMember] = useState<BoardMemberRecord | null>(null);
  const [isBoardModalOpen, setIsBoardModalOpen] = useState(false);
  const [isNewBoardMember, setIsNewBoardMember] = useState(false);

  // School Info State
  const [schoolInfo, setSchoolInfo] = useState(INITIAL_SCHOOL_INFO);
  const [activeClasses, setActiveClasses] = useState<string[]>(ACTIVE_CLASSES);

  // Fiscal Year & Holidays State
  const [fiscalYearBE, setFiscalYearBE] = useState(2570);
  const [holidays, setHolidays] = useState<HolidayRecord[]>([]);
  const [newHolidayName, setNewHolidayName] = useState('');
  const [newHolidayDate, setNewHolidayDate] = useState('');
  const [holidayYearFilter, setHolidayYearFilter] = useState<string>('ALL');
  const [holidaySearch, setHolidaySearch] = useState('');

  // Real Immutable Audit Logs from Database
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditCategory, setAuditCategory] = useState<AuditCategory | 'all'>('all');
  const [auditCurrentPage, setAuditCurrentPage] = useState(1);
  const AUDIT_PAGE_SIZE = 25;

  const filteredAndSortedAuditLogs = useMemo(() => {
    return filterAndSortAuditLogs(auditLogs, auditSearch, auditCategory);
  }, [auditLogs, auditSearch, auditCategory]);

  const totalAuditPages = Math.max(1, Math.ceil(filteredAndSortedAuditLogs.length / AUDIT_PAGE_SIZE));
  const paginatedAuditLogs = useMemo(() => {
    const start = (auditCurrentPage - 1) * AUDIT_PAGE_SIZE;
    return filteredAndSortedAuditLogs.slice(start, start + AUDIT_PAGE_SIZE);
  }, [filteredAndSortedAuditLogs, auditCurrentPage]);

  // Function to refresh audit logs (stabilized with useCallback)
  const refreshAuditLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/audit', { cache: 'no-store' });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setAuditLogs(data.data);
      }
    } catch {
      // silent
    }
  }, []);

  const handleSemesterChange = useCallback((term: string) => {
    setSchoolInfo((prev) => ({ ...prev, currentTerm: term }));
  }, []);

  const handleSyncSchoolInfo = useCallback(
    ({
      academicYear,
      studentCount,
      activeClasses: syncedClasses,
    }: {
      academicYear: string;
      studentCount: number;
      activeClasses: string[];
    }) => {
      setSchoolInfo((prev) => ({
        ...prev,
        academicYear,
        studentCount,
        activeClasses: syncedClasses,
      }));
      setActiveClasses(syncedClasses);
    },
    []
  );

  const handlePeriodChange = useCallback((activeYear: number) => {
    setFiscalYearBE(activeYear);
  }, []);

  // Initial Load from Persistent Database
  useEffect(() => {
    let isMounted = true;
    async function loadAllAdminData() {
      setIsLoading(true);
      try {
        const [staffRes, boardRes, schoolRes, holRes, auditRes, workloadRes] = await Promise.all([
          fetch('/api/admin/staff', { cache: 'no-store' }).then((r) => r.json()).catch(() => null),
          fetch('/api/admin/board', { cache: 'no-store' }).then((r) => r.json()).catch(() => null),
          fetch('/api/admin/school', { cache: 'no-store' }).then((r) => r.json()).catch(() => null),
          fetch('/api/admin/holidays', { cache: 'no-store' }).then((r) => r.json()).catch(() => null),
          fetch('/api/admin/audit', { cache: 'no-store' }).then((r) => r.json()).catch(() => null),
          fetch('/api/admin/workload', { cache: 'no-store' }).then((r) => r.json()).catch(() => null),
        ]);

        if (isMounted) {
          fetch('/api/auth/me', { cache: 'no-store' })
            .then((r) => r.json())
            .then((authRes) => {
              if (isMounted && authRes?.success && authRes.user) {
                setCurrentUser(authRes.user);
                setCurrentRole(authRes.user.role || 'superuser');
              }
            })
            .catch(() => {});

          // Purge any legacy PDPA-risk localStorage teacher PII cache
          try {
            localStorage.removeItem('manstat_admin_teachers');
          } catch {
            // ignore
          }

          if (staffRes?.success && Array.isArray(staffRes.data)) {
            setTeachers(staffRes.data);
          }
          if (boardRes?.success && Array.isArray(boardRes.data)) {
            setBoardMembers(boardRes.data);
          }
          if (schoolRes?.success && schoolRes.data) {
            setSchoolInfo(schoolRes.data);
            if (schoolRes.data.fiscalYear) {
              setFiscalYearBE(parseInt(schoolRes.data.fiscalYear) || 2570);
            }
            if (Array.isArray(schoolRes.data.activeClasses)) {
              setActiveClasses(schoolRes.data.activeClasses);
            }
          }
          if (holRes?.success && Array.isArray(holRes.data)) {
            setHolidays(holRes.data);
          }
          if (auditRes?.success && Array.isArray(auditRes.data)) {
            setAuditLogs(auditRes.data);
          }
          if (workloadRes?.success && Array.isArray(workloadRes.data)) {
            setWorkloads(workloadRes.data);
          }
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadAllAdminData();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSaveSchoolInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/school', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...schoolInfo, activeClasses }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSchoolInfo(data.data);
        if (Array.isArray(data.data.activeClasses)) {
          setActiveClasses(data.data.activeClasses);
        }
        showToast('บันทึกข้อมูลสถานศึกษาลงฐานข้อมูลเรียบร้อยแล้ว', 'success');
        refreshAuditLogs();
      } else {
        showToast(data.error || 'บันทึกข้อมูลไม่สำเร็จ', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHolidayName || !newHolidayDate) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/holidays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newHolidayName, date: newHolidayDate }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setHolidays(data.data);
        setNewHolidayName('');
        setNewHolidayDate('');
        showToast('เพิ่มวันหยุดราชการลงฐานข้อมูลเรียบร้อยแล้ว', 'success');
        refreshAuditLogs();
      } else {
        showToast(data.error || 'เพิ่มวันหยุดไม่สำเร็จ', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการบันทึกวันหยุด', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteHoliday = (id: string) => {
    const target = holidays.find((h) => h.id === id);
    setConfirmDialog({
      title: 'ยืนยันการลบวันหยุดราชการ',
      description: `คุณต้องการลบวันหยุด "${target?.name || id}" ออกจากปฏิทินวันหยุดราชการใช่หรือไม่?`,
      confirmLabel: 'ลบวันหยุด',
      onConfirm: async () => {
        setIsSaving(true);
        try {
          const res = await fetch(`/api/admin/holidays?id=${encodeURIComponent(id)}`, {
            method: 'DELETE',
          });
          const data = await res.json();
          if (data.success) {
            setHolidays(data.data);
            showToast('ลบวันหยุดราชการเรียบร้อยแล้ว', 'success');
            refreshAuditLogs();
          } else {
            showToast(data.error || 'ลบไม่สำเร็จ', 'error');
          }
        } catch (err: any) {
          showToast(err.message || 'เกิดข้อผิดพลาดในการลบวันหยุด', 'error');
        } finally {
          setIsSaving(false);
          setConfirmDialog(null);
        }
      },
    });
  };

  // Dynamic holiday years derived from holiday records + active fiscal year
  const holidayYearOptions = useMemo(() => {
    const yearSet = new Set<number>();
    const currentYearBE = new Date().getFullYear() + 543;
    yearSet.add(currentYearBE);
    if (fiscalYearBE) yearSet.add(fiscalYearBE);
    holidays.forEach((h) => {
      if (h.date && h.date.length >= 4) {
        const ce = parseInt(h.date.slice(0, 4), 10);
        if (!Number.isNaN(ce)) yearSet.add(ce + 543);
      }
    });
    return Array.from(yearSet)
      .sort((a, b) => a - b)
      .map((yearBE) => {
        const cePrefix = String(yearBE - 543);
        const count = holidays.filter((h) => h.date.startsWith(cePrefix)).length;
        return { yearBE: String(yearBE), cePrefix, count };
      });
  }, [holidays, fiscalYearBE]);

  const holidayYearRangeLabel = useMemo(() => {
    if (holidayYearOptions.length === 0) return `พ.ศ. ${fiscalYearBE}`;
    if (holidayYearOptions.length === 1) return `พ.ศ. ${holidayYearOptions[0].yearBE}`;
    return `พ.ศ. ${holidayYearOptions[0].yearBE} - ${holidayYearOptions[holidayYearOptions.length - 1].yearBE}`;
  }, [holidayYearOptions, fiscalYearBE]);

  const filteredHolidays = useMemo(() => {
    return holidays.filter((h) => {
      if (holidayYearFilter !== 'ALL') {
        const targetCE = String(Number(holidayYearFilter) - 543);
        if (!h.date.startsWith(targetCE)) return false;
      }
      if (holidaySearch.trim()) {
        const q = holidaySearch.toLowerCase().trim();
        const matchesName = h.name.toLowerCase().includes(q);
        const matchesType = (h.type || '').toLowerCase().includes(q);
        const matchesDate = h.date.includes(q) || formatThaiDateDisplay(h.date).includes(q);
        return matchesName || matchesType || matchesDate;
      }
      return true;
    });
  }, [holidays, holidayYearFilter, holidaySearch]);

  const getThaiDayOfWeek = (dateStr: string) => {
    if (!dateStr || !dateStr.includes('-')) return '';
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const days = ['วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'];
    return days[date.getDay()] || '';
  };

  // Staff Handlers
  const handleOpenAddStaff = () => {
    setIsNewStaff(true);
    const existingNums = teachers.map((t) => {
      const match = (t.employeeCode || t.id || '').match(/TCH-(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    });
    const maxNum = existingNums.length > 0 ? Math.max(...existingNums, 0) : 0;
    const nextCode = `TCH-${String(maxNum + 1).padStart(3, '0')}`;
    const nextStaff: TeacherRecord = {
      id: nextCode,
      employeeCode: nextCode,
      name: '',
      prefix: 'นาย',
      firstName: '',
      lastName: '',
      position: 'ครู',
      academicStanding: '-',
      employment_type: 'civil_servant',
      department: 'ภาษาไทย',
      division: 'ครูผู้สอน',
      major: '',
      classLevel: '-',
      dutyDay: '-',
      accessLevel: 'User',
      startDate: new Date().toISOString().split('T')[0],
      currentPositionDate: '',
      email: '',
      phone: '',
      maskedCitizenId: '',
      idCard: '',
      positionNo: '',
      memberId: '',
      highestScout: 'ไม่มีวุฒิลูกเสือ',
      scoutCertNo: '',
      teachingHours: 18,
      taHours: 2,
      sickUsed: 0,
      personalUsed: 0,
      vacationUsed: 0,
      licenses: [],
      standings: [],
      educations: [],
    };
    setSelectedStaff(nextStaff);
    setInitialStaffSnapshot(nextStaff);
    setIsCustomMajor(false);
    setStaffModalTab('personal');
    setIsStaffModalOpen(true);
  };

  const handleOpenEditStaff = (t: TeacherRecord) => {
    setIsNewStaff(false);
    const formatted = formatStaffName(t);
    let prefix = t.prefix || '';
    let firstName = t.firstName || '';
    let lastName = t.lastName || '';
    if (!prefix || !firstName) {
      const parsed = parseThaiName(formatted, prefix);
      if (!prefix) prefix = parsed.prefix;
      if (!firstName) firstName = parsed.firstName;
      if (!lastName) lastName = parsed.lastName;
    }

    const hydrated: TeacherRecord = {
      ...t,
      name: formatted,
      prefix: prefix || 'นาย',
      firstName,
      lastName,
      major: t.major || '',
      currentPositionDate: t.currentPositionDate || '',
      employment_type: t.employment_type || (t as any).employmentType || deriveEmploymentType(t),
      accessLevel: t.accessLevel || (t.role === 'superuser' ? 'Superuser' : t.role === 'hr_admin' ? 'Admin' : 'User'),
      licenses: t.licenses || [],
      standings: t.standings || [],
      educations: t.educations || [],
      teachingHours: t.teachingHours ?? 18,
      taHours: t.taHours ?? 0,
      highestScout: t.highestScout || 'ไม่มีวุฒิลูกเสือ',
      scoutCertNo: t.scoutCertNo || '',
      positionNo: t.positionNo || '',
      memberId: t.memberId || '',
    };
    setSelectedStaff(hydrated);
    setInitialStaffSnapshot(hydrated);
    setIsCustomMajor(Boolean(t.major && !isStandardMajor(t.major)));
    setStaffModalTab('personal');
    setIsStaffModalOpen(true);
  };

  // Dirty-tab indicators comparing current edited staff against initial loaded snapshot
  const staffTabDirty = useMemo(() => {
    if (!selectedStaff || !initialStaffSnapshot) {
      return { personal: false, position: false, education: false, account: false };
    }
    const personal =
      (selectedStaff.prefix || '') !== (initialStaffSnapshot.prefix || '') ||
      (selectedStaff.firstName || '') !== (initialStaffSnapshot.firstName || '') ||
      (selectedStaff.lastName || '') !== (initialStaffSnapshot.lastName || '') ||
      (selectedStaff.idCard || '') !== (initialStaffSnapshot.idCard || '') ||
      (selectedStaff.birthDate || '') !== (initialStaffSnapshot.birthDate || '') ||
      (selectedStaff.phone || '') !== (initialStaffSnapshot.phone || '') ||
      (selectedStaff.email || '') !== (initialStaffSnapshot.email || '') ||
      (selectedStaff.emergencyContactName || '') !== (initialStaffSnapshot.emergencyContactName || '') ||
      (selectedStaff.emergencyContactRelation || '') !== (initialStaffSnapshot.emergencyContactRelation || '') ||
      (selectedStaff.emergencyContactPhone || '') !== (initialStaffSnapshot.emergencyContactPhone || '') ||
      (selectedStaff.addressHouseNo || '') !== (initialStaffSnapshot.addressHouseNo || '') ||
      (selectedStaff.addressMoo || '') !== (initialStaffSnapshot.addressMoo || '') ||
      (selectedStaff.addressSoiRoad || '') !== (initialStaffSnapshot.addressSoiRoad || '') ||
      (selectedStaff.addressSubdistrict || '') !== (initialStaffSnapshot.addressSubdistrict || '') ||
      (selectedStaff.addressDistrict || '') !== (initialStaffSnapshot.addressDistrict || '') ||
      (selectedStaff.addressProvince || '') !== (initialStaffSnapshot.addressProvince || '') ||
      (selectedStaff.addressPostalCode || '') !== (initialStaffSnapshot.addressPostalCode || '');

    const position =
      (selectedStaff.employment_type || '') !== (initialStaffSnapshot.employment_type || '') ||
      (selectedStaff.position || '') !== (initialStaffSnapshot.position || '') ||
      (selectedStaff.positionNo || '') !== (initialStaffSnapshot.positionNo || '') ||
      (selectedStaff.department || '') !== (initialStaffSnapshot.department || '') ||
      (selectedStaff.khurusaphaMemberType || '') !== (initialStaffSnapshot.khurusaphaMemberType || '') ||
      (selectedStaff.khurusaphaMemberNo || '') !== (initialStaffSnapshot.khurusaphaMemberNo || '') ||
      (selectedStaff.classLevel || '-') !== (initialStaffSnapshot.classLevel || '-') ||
      (selectedStaff.dutyDay || '-') !== (initialStaffSnapshot.dutyDay || '-') ||
      (selectedStaff.startDate || '') !== (initialStaffSnapshot.startDate || '') ||
      (selectedStaff.currentPositionDate || '') !== (initialStaffSnapshot.currentPositionDate || '');

    const education =
      (selectedStaff.educationLevel || '') !== (initialStaffSnapshot.educationLevel || '') ||
      (selectedStaff.educationProgramYears || '') !== (initialStaffSnapshot.educationProgramYears || '') ||
      (selectedStaff.educationDegree || '') !== (initialStaffSnapshot.educationDegree || '') ||
      (selectedStaff.major || '') !== (initialStaffSnapshot.major || '') ||
      (selectedStaff.educationInstitution || '') !== (initialStaffSnapshot.educationInstitution || '') ||
      (selectedStaff.educationGradYear || '') !== (initialStaffSnapshot.educationGradYear || '') ||
      JSON.stringify(selectedStaff.educations || []) !==
        JSON.stringify(initialStaffSnapshot.educations || []);

    const account =
      (selectedStaff.employeeCode || '') !== (initialStaffSnapshot.employeeCode || '') ||
      (selectedStaff.accessLevel || 'User') !== (initialStaffSnapshot.accessLevel || 'User');

    return { personal, position, education, account };
  }, [selectedStaff, initialStaffSnapshot]);

  const hasStaffUnsavedChanges =
    staffTabDirty.personal ||
    staffTabDirty.position ||
    staffTabDirty.education ||
    staffTabDirty.account;

  const handleNavigateToView = (view: StaffQuickJumpView) => {
    const viewLabels: Record<StaffQuickJumpView, string> = {
      workload: 'ตารางสอนและภาระงาน',
      dir_standing: 'ทะเบียนวิทยฐานะ',
      dir_license: 'ทะเบียนใบอนุญาตประกอบวิชาชีพ',
      dir_scout: 'ทะเบียนวุฒิลูกเสือ',
    };
    const targetLabel = viewLabels[view];
    const go = () => {
      setIsStaffModalOpen(false);
      window.location.href = `/?view=${view}`;
    };
    if (!hasStaffUnsavedChanges) {
      go();
      return;
    }
    setConfirmDialog({
      title: 'ยังไม่ได้บันทึกการเปลี่ยนแปลง',
      description: `คุณมีการแก้ไขข้อมูลบุคลากรที่ยังไม่ได้บันทึก ต้องการออกจากหน้านี้เพื่อไปที่เมนู${targetLabel}ใช่หรือไม่?`,
      confirmLabel: `ไปที่${targetLabel}`,
      onConfirm: () => {
        setConfirmDialog(null);
        go();
      },
    });
  };

  const handleSaveStaff = async () => {
    if (!selectedStaff) return;
    const computedName = formatStaffName(selectedStaff);
    if (!computedName) {
      showToast('กรุณาระบุชื่อ-นามสกุลบุคลากร', 'error');
      return;
    }
    const parsed = parseThaiName(computedName, selectedStaff.prefix);

    const updatedStaff: TeacherRecord = {
      ...selectedStaff,
      name: computedName,
      prefix: selectedStaff.prefix || parsed.prefix,
      firstName: selectedStaff.firstName || parsed.firstName,
      lastName: selectedStaff.lastName || parsed.lastName,
      maskedCitizenId: selectedStaff.idCard
        ? `${selectedStaff.idCard.slice(0, 1)}-${selectedStaff.idCard.slice(1, 5)}-*****-**-${selectedStaff.idCard.slice(-1)}`
        : selectedStaff.maskedCitizenId,
    };

    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedStaff),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const savedItem: TeacherRecord = data.data;
        if (isNewStaff) {
          setTeachers((prev) => [savedItem, ...prev]);
        } else {
          setTeachers((prev) =>
            prev.map((t) =>
              t.id === savedItem.id || (savedItem.employeeCode && t.employeeCode === savedItem.employeeCode)
                ? savedItem
                : t
            )
          );
        }
        showToast('บันทึกข้อมูลบุคลากรลงฐานข้อมูลเรียบร้อยแล้ว', 'success');
        refreshAuditLogs();
        setIsStaffModalOpen(false);

        // Immediate re-fetch from server to guarantee 100% database persistence
        fetch('/api/admin/staff', { cache: 'no-store' })
          .then((r) => r.json())
          .then((sRes) => {
            if (sRes?.success && Array.isArray(sRes.data)) {
              setTeachers(sRes.data);
            }
          })
          .catch(() => {});

        // Immediate Real-Time Session & RBAC Re-Sync
        try {
          const authMeRes = await fetch('/api/auth/me', { cache: 'no-store' }).then((r) => r.json());
          if (authMeRes?.success && authMeRes.user) {
            if (typeof window !== 'undefined') {
              localStorage.setItem('manstat_auth_role', authMeRes.user.role);
              localStorage.setItem('manstat_auth_user', JSON.stringify(authMeRes.user));
            }
            // If the current logged-in user was demoted to 'teacher' (User), redirect cleanly back to /
            if (!isAdminRole(authMeRes.user.role)) {
              showToast('ระดับสิทธิ์ของท่านถูกปรับเป็นผู้ใช้งานทั่วไป ระบบกำลังนำท่านกลับสู่หน้าหลัก', 'info');
              setTimeout(() => {
                window.location.href = '/';
              }, 1200);
              return;
            }
          }
        } catch {
          // ignore
        }
      } else {
        showToast(data.error || 'บันทึกข้อมูลบุคลากรไม่สำเร็จ', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteStaff = (staffId: string) => {
    const target = teachers.find((t) => t.id === staffId);
    if (!target) return;
    setConfirmDialog({
      title: 'ยืนยันการลบข้อมูลบุคลากร',
      description: `คุณต้องการลบข้อมูลบุคลากร "${formatStaffName(target)}" ออกจากฐานข้อมูลใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้`,
      confirmLabel: 'ลบข้อมูลบุคลากร',
      onConfirm: async () => {
        setIsSaving(true);
        try {
          const res = await fetch(`/api/admin/staff?id=${encodeURIComponent(staffId)}`, {
            method: 'DELETE',
          });
          const data = await res.json();
          if (data.success) {
            setTeachers((prev) => prev.filter((t) => t.id !== staffId));
            if (selectedStaff?.id === staffId) {
              setIsStaffModalOpen(false);
            }
            showToast(`ลบข้อมูลบุคลากร ${formatStaffName(target)} เรียบร้อยแล้ว`, 'success');
            refreshAuditLogs();
          } else {
            showToast(data.error || 'ลบไม่สำเร็จ', 'error');
          }
        } catch (err: any) {
          showToast(err.message || 'เกิดข้อผิดพลาดในการลบข้อมูล', 'error');
        } finally {
          setIsSaving(false);
          setConfirmDialog(null);
        }
      },
    });
  };

  const handleAddLicenseToStaff = () => {
    if (!selectedStaff || !newLicNumber.trim()) {
      showToast('กรุณากรอกเลขที่ใบอนุญาต', 'error');
      return;
    }
    const newLic = {
      category: newLicCategory,
      type: newLicType,
      number: newLicNumber.trim(),
      issueDate: newLicIssue || new Date().toISOString().split('T')[0],
      expiryDate: newLicExpiry || '2031-12-31',
    };
    setSelectedStaff({
      ...selectedStaff,
      licenses: [...(selectedStaff.licenses || []), newLic],
    });
    setNewLicNumber('');
    setNewLicIssue('');
    setNewLicExpiry('');
  };

  const handleDeleteLicenseFromStaff = (index: number) => {
    if (!selectedStaff) return;
    setSelectedStaff({
      ...selectedStaff,
      licenses: selectedStaff.licenses.filter((_, idx) => idx !== index),
    });
  };

  const handleEditStanding = (index: number) => {
    if (!selectedStaff?.standings?.[index]) return;
    const item = selectedStaff.standings[index];
    setNewStdLevel(item.level || '');
    setNewStdDate(item.effectiveDate || '');
    setNewStdOrder(item.orderNumber || '');
    setEditingStandingIndex(index);
  };

  const handleCancelEditStanding = () => {
    setNewStdLevel('ครูชำนาญการ (คศ. 2)');
    setNewStdDate('');
    setNewStdOrder('');
    setEditingStandingIndex(null);
  };

  const handleSaveStanding = () => {
    if (!selectedStaff || !newStdLevel.trim()) {
      showToast('กรุณาระบุตำแหน่ง/วิทยฐานะ', 'error');
      return;
    }
    const item = {
      level: newStdLevel.trim(),
      effectiveDate: newStdDate || new Date().toISOString().split('T')[0],
      orderNumber: newStdOrder.trim() || '-',
    };

    if (editingStandingIndex !== null) {
      const updated = [...(selectedStaff.standings || [])];
      updated[editingStandingIndex] = item;
      setSelectedStaff({
        ...selectedStaff,
        standings: updated,
      });
      handleCancelEditStanding();
      showToast('แก้ไขข้อมูลประวัติวิทยฐานะสำเร็จ', 'success');
    } else {
      setSelectedStaff({
        ...selectedStaff,
        standings: [...(selectedStaff.standings || []), item],
      });
      setNewStdDate('');
      setNewStdOrder('');
      showToast('เพิ่มรายการประวัติวิทยฐานะสำเร็จ', 'success');
    }
  };

  const handleDeleteStandingFromStaff = (index: number) => {
    if (!selectedStaff) return;
    if (editingStandingIndex === index) {
      handleCancelEditStanding();
    }
    setSelectedStaff({
      ...selectedStaff,
      standings: selectedStaff.standings.filter((_, idx) => idx !== index),
    });
    showToast('ลบรายการเรียบร้อยแล้ว', 'info');
  };

  const handleEditEducation = (index: number) => {
    if (!selectedStaff?.educations?.[index]) return;
    const item = selectedStaff.educations[index];
    setNewEduDegree(item.degree || 'ค.บ.');
    setNewEduMajor(item.major || '');
    setNewEduInst(item.institute || '');
    setNewEduYear(item.gradYear || '2565');
    setEditingEducationIndex(index);
  };

  const handleCancelEditEducation = () => {
    setNewEduDegree('ค.บ.');
    setNewEduMajor('');
    setNewEduInst('');
    setNewEduYear('2565');
    setEditingEducationIndex(null);
  };

  const handleSaveEducation = () => {
    if (!selectedStaff || !newEduMajor.trim()) {
      showToast('กรุณาระบุวิชาเอก/สาขา', 'error');
      return;
    }
    const item = {
      degree: newEduDegree.trim() || 'ค.บ.',
      major: newEduMajor.trim(),
      institute: newEduInst.trim() || 'มหาวิทยาลัยราชภัฏนครราชสีมา',
      gradYear: newEduYear.trim() || (new Date().getFullYear() + 543).toString(),
    };

    if (editingEducationIndex !== null) {
      const updated = [...(selectedStaff.educations || [])];
      updated[editingEducationIndex] = item;
      setSelectedStaff({
        ...selectedStaff,
        educations: updated,
      });
      handleCancelEditEducation();
      showToast('แก้ไขข้อมูลวุฒิการศึกษาสำเร็จ', 'success');
    } else {
      setSelectedStaff({
        ...selectedStaff,
        educations: [...(selectedStaff.educations || []), item],
      });
      setNewEduMajor('');
      setNewEduInst('');
      showToast('เพิ่มวุฒิการศึกษาสำเร็จ', 'success');
    }
  };

  const handleDeleteEducationFromStaff = (index: number) => {
    if (!selectedStaff) return;
    if (editingEducationIndex === index) {
      handleCancelEditEducation();
    }
    setSelectedStaff({
      ...selectedStaff,
      educations: selectedStaff.educations.filter((_, idx) => idx !== index),
    });
    showToast('ลบวุฒิการศึกษาเรียบร้อยแล้ว', 'info');
  };

  const handleSyncDirectorFromStaff = () => {
    // 1. ค้นหาบุคลากรที่เป็นผู้อำนวยการจาก teachers
    const directorTeacher = teachers.find(
      (t) =>
        (t.position && (t.position.includes('ผู้อำนวยการ') || t.position.includes('ผอ.'))) ||
        (t.role && (t.role.includes('ผู้อำนวยการ') || t.role.includes('ผอ.'))) ||
        t.id === 'EXE-001' ||
        t.employeeCode === 'EXE-001'
    );

    if (!directorTeacher) {
      showToast('ไม่พบบุคลากรตำแหน่งผู้อำนวยการในระบบ', 'error');
      return;
    }

    // 2. ใช้ currentPositionDate เป็นหลัก และ fallback ไปที่ startDate (วันบรรจุ) เฉพาะเมื่อ currentPositionDate ว่าง
    const syncedDate =
      (directorTeacher.currentPositionDate && directorTeacher.currentPositionDate.trim() !== ''
        ? directorTeacher.currentPositionDate.trim()
        : '') ||
      (directorTeacher.startDate && directorTeacher.startDate.trim() !== ''
        ? directorTeacher.startDate.trim()
        : '');

    const isFromCurrentPosDate = Boolean(
      directorTeacher.currentPositionDate && directorTeacher.currentPositionDate.trim() !== ''
    );

    setSelectedBoardMember((prev) =>
      prev
        ? {
            ...prev,
            fullName: formatStaffName(directorTeacher),
            appointmentDate: syncedDate || prev.appointmentDate || '',
            organization: prev.organization || schoolInfo.schoolName || 'โรงเรียนชุมชนบ้านตะขบ',
            occupation: 'ผู้อำนวยการสถานศึกษา',
            phone: directorTeacher.phone || prev.phone,
          }
        : null
    );

    if (syncedDate) {
      showToast(
        `ซิงก์ข้อมูล ผอ. เรียบร้อย (${
          isFromCurrentPosDate ? 'วันที่ดำรงตำแหน่งปัจจุบัน' : 'วันบรรจุ'
        }: ${formatThaiDateDisplay(syncedDate)}) — ตรวจสอบและกดบันทึกเพื่อยืนยัน`,
        'success'
      );
    } else {
      showToast('ซิงก์ชื่อและเบอร์โทร ผอ. แล้ว (ไม่พบวันที่ในทะเบียนบุคลากร กรุณาเลือกวันที่เอง)', 'info');
    }
  };

  // School Board Handlers
  const handleOpenAddBoardMember = () => {
    setIsNewBoardMember(true);
    setSelectedBoardMember({
      id: `SBD-${Date.now().toString().slice(-4)}`,
      fullName: '',
      position: 'EXPERT',
      positionTitle: 'ผู้ทรงคุณวุฒิ',
      occupation: '',
      organization: 'โรงเรียนชุมชนบ้านตะขบ',
      phone: '',
      status: 'ดำรงตำแหน่ง',
      termNumber: 1,
    });
    setIsBoardModalOpen(true);
  };

  const handleOpenEditBoardMember = (b: BoardMemberRecord) => {
    setIsNewBoardMember(false);
    setSelectedBoardMember({ ...b });
    setIsBoardModalOpen(true);
  };

  const handleSaveBoardMember = async () => {
    if (!selectedBoardMember || !selectedBoardMember.fullName.trim()) {
      showToast('กรุณากรอกชื่อ-นามสกุลกรรมการสถานศึกษา', 'error');
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/board', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selectedBoardMember),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const savedMember: BoardMemberRecord = data.data;
        if (isNewBoardMember) {
          setBoardMembers((prev) => [...prev, savedMember]);
        } else {
          setBoardMembers((prev) =>
            prev.map((b) => (b.id === savedMember.id ? savedMember : b))
          );
        }
        showToast('บันทึกข้อมูลคณะกรรมการสถานศึกษาเรียบร้อยแล้ว', 'success');
        refreshAuditLogs();
        setIsBoardModalOpen(false);

        // Immediate re-fetch from server to guarantee 100% database persistence
        fetch('/api/admin/board', { cache: 'no-store' })
          .then((r) => r.json())
          .then((bRes) => {
            if (bRes?.success && Array.isArray(bRes.data)) {
              setBoardMembers(bRes.data);
            }
          })
          .catch(() => {});
      } else {
        showToast(data.error || 'บันทึกไม่สำเร็จ', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteBoardMember = (id: string) => {
    const target = boardMembers.find((b) => b.id === id);
    if (!target) return;
    setConfirmDialog({
      title: 'ยืนยันการลบกรรมการสถานศึกษา',
      description: `คุณต้องการลบกรรมการสถานศึกษา "${target.fullName}" ออกจากระบบใช่หรือไม่?`,
      confirmLabel: 'ลบกรรมการ',
      onConfirm: async () => {
        setIsSaving(true);
        try {
          const res = await fetch(`/api/admin/board?id=${encodeURIComponent(id)}`, {
            method: 'DELETE',
          });
          const data = await res.json();
          if (data.success) {
            setBoardMembers((prev) => prev.filter((b) => b.id !== id));
            if (selectedBoardMember?.id === id) {
              setIsBoardModalOpen(false);
            }
            showToast(`ลบกรรมการสถานศึกษา ${target.fullName} เรียบร้อยแล้ว`, 'success');
            refreshAuditLogs();

            // Immediate re-fetch from server to guarantee 100% database persistence
            fetch('/api/admin/board', { cache: 'no-store' })
              .then((r) => r.json())
              .then((bRes) => {
                if (bRes?.success && Array.isArray(bRes.data)) {
                  setBoardMembers(bRes.data);
                }
              })
              .catch(() => {});
          } else {
            showToast(data.error || 'ลบไม่สำเร็จ', 'error');
          }
        } catch (err: any) {
          showToast(err.message || 'เกิดข้อผิดพลาดในการลบข้อมูล', 'error');
        } finally {
          setIsSaving(false);
          setConfirmDialog(null);
        }
      },
    });
  };

  const filteredTeachers = teachers.filter(
    (t) =>
      t.name.toLowerCase().includes(staffSearch.toLowerCase()) ||
      t.employeeCode.toLowerCase().includes(staffSearch.toLowerCase()) ||
      t.position.toLowerCase().includes(staffSearch.toLowerCase()) ||
      t.department.toLowerCase().includes(staffSearch.toLowerCase())
  );

  const sortedTeacherGroups = useMemo(() => {
    return groupAndSortTeachers(filteredTeachers);
  }, [filteredTeachers]);

  const filteredBoard = boardMembers
    .filter(
      (b) =>
        b.fullName.toLowerCase().includes(boardSearch.toLowerCase()) ||
        b.positionTitle.toLowerCase().includes(boardSearch.toLowerCase()) ||
        b.organization.toLowerCase().includes(boardSearch.toLowerCase())
    )
    .sort(
      (a, b) =>
        (BOARD_STATUTORY_ORDER[a.position] ?? 99) -
        (BOARD_STATUTORY_ORDER[b.position] ?? 99)
    );

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0b1016] text-slate-900 dark:text-slate-100 flex flex-col selection:bg-sky-500 selection:text-white transition-colors duration-200">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#121822]/95 backdrop-blur-md border-b border-slate-200/90 dark:border-slate-800/80 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 border border-slate-200/90 dark:bg-[#121822] dark:hover:bg-slate-800/70 dark:text-slate-300 dark:hover:text-white dark:border-slate-800/80 text-xs font-medium transition-colors duration-200"
            >
              <ArrowLeft className="w-4 h-4 shrink-0" />
              <span>กลับสู่หน้าหลัก</span>
            </Link>
            <div className="flex items-center gap-2.5 border-l border-slate-200 dark:border-slate-700 pl-3">
              <AppLogoIcon size={26} className="shrink-0" />
              <span className="font-bold text-base text-slate-900 dark:text-white">ศูนย์ผู้ดูแลระบบ</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5">
            <ThemeSwitcher />
            <UserProfileDropdown
              currentUser={currentUser}
              currentRole={currentRole}
              onOpenSettings={() => setActiveTab('preferences')}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Navigation Tabs Bar - Modern Segmented Control */}
        <div className="bg-white dark:bg-[#121822] p-1.5 sm:p-2 rounded-xl border border-slate-200/90 dark:border-slate-800/80 shadow-sm">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5 p-1 bg-slate-100 dark:bg-[#0b1016] border border-slate-200/80 dark:border-slate-800/80 rounded-lg w-full">
            {/* 1. จัดการบุคลากร */}
            <button
              type="button"
              onClick={() => setActiveTab('staff')}
              className={`w-full inline-flex items-center justify-center gap-1.5 px-2 py-2 sm:px-2.5 sm:py-2.5 rounded-md text-xs xl:text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                activeTab === 'staff'
                  ? 'bg-white text-slate-900 dark:bg-slate-800 dark:text-white shadow-sm font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/30'
              }`}
              title="จัดการข้อมูลบุคลากร"
            >
              <Users className={`w-4 h-4 shrink-0 ${activeTab === 'staff' ? 'text-sky-500 dark:text-sky-400' : 'text-slate-400'}`} />
              <span>จัดการบุคลากร</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                activeTab === 'staff'
                  ? 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/20'
                  : 'bg-slate-200/80 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              }`}>
                {teachers.length}
              </span>
            </button>

            {/* 2. คณะกรรมการสถานศึกษา */}
            <button
              type="button"
              onClick={() => setActiveTab('board')}
              className={`w-full inline-flex items-center justify-center gap-1.5 px-2 py-2 sm:px-2.5 sm:py-2.5 rounded-md text-xs xl:text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                activeTab === 'board'
                  ? 'bg-white text-slate-900 dark:bg-slate-800 dark:text-white shadow-sm font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/30'
              }`}
              title="คณะกรรมการสถานศึกษา"
            >
              <Award className={`w-4 h-4 shrink-0 ${activeTab === 'board' ? 'text-purple-500 dark:text-purple-400' : 'text-slate-400'}`} />
              <span className="lg:hidden xl:inline">คณะกรรมการสถานศึกษา</span>
              <span className="hidden lg:inline xl:hidden">คณะกรรมการฯ</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                activeTab === 'board'
                  ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/20'
                  : 'bg-slate-200/80 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              }`}>
                {boardMembers.length}
              </span>
            </button>

            {/* 3. ข้อมูลสถานศึกษา */}
            <button
              type="button"
              onClick={() => setActiveTab('school')}
              className={`w-full inline-flex items-center justify-center gap-1.5 px-2 py-2 sm:px-2.5 sm:py-2.5 rounded-md text-xs xl:text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                activeTab === 'school'
                  ? 'bg-white text-slate-900 dark:bg-slate-800 dark:text-white shadow-sm font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/30'
              }`}
              title="ข้อมูลสถานศึกษา"
            >
              <Building className={`w-4 h-4 shrink-0 ${activeTab === 'school' ? 'text-emerald-500 dark:text-emerald-400' : 'text-slate-400'}`} />
              <span>ข้อมูลสถานศึกษา</span>
            </button>

            {/* 4. ปีงบประมาณและวันหยุด */}
            <button
              type="button"
              onClick={() => setActiveTab('fiscal')}
              className={`w-full inline-flex items-center justify-center gap-1.5 px-2 py-2 sm:px-2.5 sm:py-2.5 rounded-md text-xs xl:text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                activeTab === 'fiscal'
                  ? 'bg-white text-slate-900 dark:bg-slate-800 dark:text-white shadow-sm font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/30'
              }`}
              title="ปีงบประมาณและวันหยุด"
            >
              <Calendar className={`w-4 h-4 shrink-0 ${activeTab === 'fiscal' ? 'text-amber-500 dark:text-amber-400' : 'text-slate-400'}`} />
              <span className="lg:hidden xl:inline">ปีงบประมาณและวันหยุด</span>
              <span className="hidden lg:inline xl:hidden">ปีงบประมาณ</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                activeTab === 'fiscal'
                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/20'
                  : 'bg-slate-200/80 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              }`}>
                {holidays.length}
              </span>
            </button>

            {/* 5. บันทึก PDPA */}
            <button
              type="button"
              onClick={() => setActiveTab('audit')}
              className={`w-full inline-flex items-center justify-center gap-1.5 px-2 py-2 sm:px-2.5 sm:py-2.5 rounded-md text-xs xl:text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                activeTab === 'audit'
                  ? 'bg-white text-slate-900 dark:bg-slate-800 dark:text-white shadow-sm font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/30'
              }`}
              title="ตรวจสอบ PDPA Audit Logs"
            >
              <ShieldAlert className={`w-4 h-4 shrink-0 ${activeTab === 'audit' ? 'text-rose-500 dark:text-rose-400' : 'text-slate-400'}`} />
              <span>บันทึก PDPA</span>
            </button>

            {/* 6. ตั้งค่าระบบ */}
            <button
              type="button"
              onClick={() => setActiveTab('preferences')}
              className={`w-full inline-flex items-center justify-center gap-1.5 px-2 py-2 sm:px-2.5 sm:py-2.5 rounded-md text-xs xl:text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                activeTab === 'preferences'
                  ? 'bg-white text-slate-900 dark:bg-slate-800 dark:text-white shadow-sm font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/30'
              }`}
              title="ตั้งค่าระบบ"
            >
              <Sliders className={`w-4 h-4 shrink-0 ${activeTab === 'preferences' ? 'text-sky-500 dark:text-sky-400' : 'text-slate-400'}`} />
              <span>ตั้งค่าระบบ</span>
            </button>
          </div>
        </div>

        {/* =================================================================== */}
        {/* TAB 1: จัดการข้อมูลบุคลากร (Staff Directory Management) */}
        {/* =================================================================== */}
        {activeTab === 'staff' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#141b24] p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อครู, รหัสบุคลากร, หรือกลุ่มสาระ..."
                  value={staffSearch}
                  onChange={(e) => setStaffSearch(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#101822] border border-slate-200/90 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-mono">
                  {staffSearch.trim()
                    ? `แสดง ${filteredTeachers.length} จาก ${teachers.length} ท่าน`
                    : `ทั้งหมด ${teachers.length} ท่าน`}
                </span>
                <button
                  type="button"
                  onClick={handleOpenAddStaff}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium border border-transparent transition-colors duration-200"
                >
                  <UserPlus className="w-4 h-4 shrink-0" />
                  <span>เพิ่มบุคลากร</span>
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-[#111822] rounded-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden shadow-sm">
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-50 dark:bg-[#16202c] text-slate-600 dark:text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-200/90 dark:border-slate-800">
                    <tr>
                      <th scope="col" className="w-14 px-3 py-3 text-center shrink-0">ลำดับ</th>
                      <th scope="col" className="px-4 py-3 min-w-[200px] w-[36%]">รหัส / ชื่อ-สกุล</th>
                      <th scope="col" className="px-4 py-3 min-w-[190px] w-[28%]">ตำแหน่ง / วิทยฐานะ</th>
                      <th scope="col" className="px-4 py-3 text-center min-w-[120px] w-[16%]">สิทธิ์การใช้งาน</th>
                      <th scope="col" className="px-4 py-3 text-right w-36 shrink-0">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/60 font-sans">
                    {filteredTeachers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                          ยังไม่มีข้อมูลบุคลากรในระบบ
                        </td>
                      </tr>
                    ) : (
                      (() => {
                        let staffRowIdx = 0;
                        return sortedTeacherGroups.map((group) => {
                        return (
                          <React.Fragment key={group.category}>
                            {/* Group Section Header */}
                            <tr
                              className={
                                group.category === 'support'
                                  ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300/90 font-semibold text-[11px] tracking-wider uppercase border-y border-amber-500/20'
                                  : 'bg-slate-100/60 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 font-semibold text-[11px] tracking-wider uppercase border-y border-slate-200/80 dark:border-slate-800'
                              }
                            >
                              <td colSpan={5} className="py-1.5 px-4">
                                {group.title}
                              </td>
                            </tr>

                            {/* Group Members */}
                            {group.members.map((t) => {
                              const seq = ++staffRowIdx;
                              const isSupport = group.category === 'support';
                              const posDisplay = t.position
                                .replace('ผู้อำนวยการสถานศึกษา', 'ผอ.สถานศึกษา')
                                .replace('ผู้อำนวยการโรงเรียน', 'ผอ.โรงเรียน');
                              const isExpanded = expandedStaffId === t.id;
                              const standingSubtext = formatAcademicStandingSubtext(t.position, t.academicStanding);

                              return (
                                <React.Fragment key={t.id}>
                                  <tr
                                    onClick={() => setExpandedStaffId(isExpanded ? null : t.id)}
                                    className={`group cursor-pointer transition-colors ${
                                      isSupport
                                        ? 'border-l-2 border-amber-400/80 bg-amber-400/[0.03] hover:bg-amber-400/[0.06]'
                                        : 'hover:bg-slate-50/80 dark:hover:bg-white/[0.03]'
                                    } ${
                                      isExpanded
                                        ? isSupport
                                          ? 'bg-amber-400/[0.08]'
                                          : 'bg-slate-100/70 dark:bg-[#162231]/40'
                                        : ''
                                    }`}
                                  >
                                    <td className="w-14 px-3 py-3.5 text-center font-mono tabular-nums text-slate-400 dark:text-slate-500 text-xs whitespace-nowrap">
                                      {seq}
                                    </td>
                                    <td className="px-4 py-3.5">
                                      <div className="font-semibold text-slate-900 dark:text-white text-sm" title={formatStaffName(t)}>
                                        {formatStaffName(t)}
                                      </div>
                                      <div className="text-xs text-slate-400 font-mono mt-0.5">
                                        {t.employeeCode}{t.positionNo ? ` · เลขที่ ${t.positionNo}` : ''}
                                      </div>
                                    </td>
                                    <td className="px-4 py-3.5">
                                      {isSupport ? (
                                        <div className="flex items-center gap-1.5">
                                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                                          <span className="text-slate-800 dark:text-slate-200 text-sm font-medium" title={t.position}>
                                            {posDisplay}
                                          </span>
                                        </div>
                                      ) : (
                                        <div className="text-slate-800 dark:text-slate-200 text-sm" title={t.position}>
                                          {posDisplay}
                                        </div>
                                      )}
                                      {standingSubtext && (
                                        <div className="text-xs text-slate-400 mt-0.5" title={standingSubtext}>
                                          {standingSubtext}
                                        </div>
                                      )}
                                    </td>
                                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                                      {t.accessLevel === 'Superuser' || t.role === 'superuser' ? (
                                        <div className="inline-flex items-center gap-1.5">
                                          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
                                          <span className="text-violet-600 dark:text-violet-300 font-medium text-sm">
                                            Superuser
                                          </span>
                                        </div>
                                      ) : t.accessLevel === 'Admin' || t.role === 'hr_admin' ? (
                                        <div className="inline-flex items-center gap-1.5">
                                          <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />
                                          <span className="text-sky-600 dark:text-sky-300 font-medium text-sm">
                                            Admin
                                          </span>
                                        </div>
                                      ) : (
                                        <span className="text-slate-400 text-sm">
                                          Teacher
                                        </span>
                                      )}
                                    </td>
                                    <td className="w-36 px-4 py-3.5 text-right whitespace-nowrap">
                                      <div className="inline-flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                        <button
                                          type="button"
                                          onClick={() => handleOpenEditStaff(t)}
                                          className="p-1.5 rounded-md text-slate-400 dark:text-slate-500 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors duration-200"
                                          title="ตั้งค่าและแก้ไขข้อมูลบุคลากร"
                                        >
                                          <Edit className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteStaff(t.id)}
                                          className="p-1.5 rounded-md text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors duration-200"
                                          title="ลบข้อมูลบุคลากร"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>

                                        <span className="h-4 w-px bg-slate-200 dark:bg-white/10 mx-1 shrink-0" />

                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setExpandedStaffId(isExpanded ? null : t.id);
                                          }}
                                          className="p-1.5 rounded-md text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors duration-200"
                                          title={isExpanded ? 'ย่อรายละเอียด' : 'ขยายรายละเอียด'}
                                          aria-label={isExpanded ? 'ย่อรายละเอียด' : 'ขยายรายละเอียด'}
                                        >
                                          <ChevronDown
                                            className={`w-3.5 h-3.5 transition-transform duration-200 ${
                                              isExpanded ? 'rotate-180 text-sky-500 dark:text-sky-400' : ''
                                            }`}
                                          />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>

                                  {/* Expanded Detail Panel */}
                                  {isExpanded && (
                                    <tr className="bg-slate-50/70 dark:bg-white/[0.02] border-t border-slate-200/80 dark:border-white/[0.04]">
                                      <td colSpan={5} className="px-4 sm:pl-14 sm:pr-6 py-4">
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4">
                                          <div>
                                            <div className="text-xs text-slate-400 font-medium">
                                              วุฒิลูกเสือ &amp; ใบอนุญาต
                                            </div>
                                            <div className="text-sm text-slate-800 dark:text-slate-200 mt-1 space-y-1">
                                              <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-300">
                                                <Compass className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
                                                <span className="font-medium text-xs">
                                                  {t.highestScout || 'ไม่มีวุฒิลูกเสือ'}
                                                </span>
                                              </div>
                                              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-300">
                                                <Award className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 shrink-0" />
                                                <span
                                                  className="font-medium text-xs truncate max-w-[200px]"
                                                  title={
                                                    t.licenses && t.licenses.length > 0
                                                      ? t.licenses[0].type
                                                      : 'ไม่มีข้อมูลใบอนุญาต'
                                                  }
                                                >
                                                  {t.licenses && t.licenses.length > 0
                                                    ? t.licenses[0].type
                                                    : 'ไม่มีข้อมูลใบอนุญาต'}
                                                </span>
                                              </div>
                                            </div>
                                          </div>
                                          <div>
                                            <div className="text-xs text-slate-400 font-medium">
                                              ภาระงานสอนและ TA
                                            </div>
                                            <div className="text-sm text-slate-800 dark:text-slate-200 mt-1 font-mono">
                                              <span className="text-sky-600 dark:text-sky-300 font-bold">
                                                {t.teachingHours ?? 18}
                                              </span>
                                              <span className="text-slate-500"> สอน + </span>
                                              <span className="text-amber-600 dark:text-amber-300 font-bold">
                                                {t.taHours ?? 0}
                                              </span>
                                              <span className="text-slate-400 text-xs"> TA ชม./สัปดาห์</span>
                                            </div>
                                          </div>
                                          <div>
                                            <div className="text-xs text-slate-400 font-medium">
                                              วันลาสะสม (ป่วย / กิจ / พักผ่อน)
                                            </div>
                                            <div className="text-sm text-slate-800 dark:text-slate-200 mt-1 font-mono text-xs">
                                              <span className="text-rose-500 dark:text-rose-400 font-bold">
                                                {t.sickUsed}
                                              </span>{' '}
                                              ป่วย /{' '}
                                              <span className="text-amber-500 dark:text-amber-400 font-bold">
                                                {t.personalUsed}
                                              </span>{' '}
                                              กิจ /{' '}
                                              <span className="text-emerald-500 dark:text-emerald-400 font-bold">
                                                {t.vacationUsed}
                                              </span>{' '}
                                              พักผ่อน
                                            </div>
                                          </div>
                                          <div>
                                            <div className="text-xs text-slate-400 font-medium">
                                              กลุ่มสาระ / วันบรรจุ
                                            </div>
                                            <div className="text-sm text-slate-800 dark:text-slate-200 mt-1 font-medium">
                                              {t.department}
                                            </div>
                                            <div className="text-xs text-slate-400 mt-0.5">
                                              บรรจุ: {t.startDate}
                                            </div>
                                          </div>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </React.Fragment>
                        );
                      });
                    })()
                  )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 2: คณะกรรมการสถานศึกษาขั้นพื้นฐาน (School Board Management) */}
        {/* =================================================================== */}
        {activeTab === 'board' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#141b24] p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อกรรมการ, ตำแหน่ง, หรือองค์กร..."
                  value={boardSearch}
                  onChange={(e) => setBoardSearch(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#101822] border border-slate-200/90 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-mono">
                  ทั้งหมด {boardMembers.length} ท่าน
                </span>
                <button
                  type="button"
                  onClick={handleOpenAddBoardMember}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium border border-transparent transition-colors duration-200"
                >
                  <PlusCircle className="w-4 h-4 shrink-0" />
                  <span>เพิ่มกรรมการสถานศึกษา</span>
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-[#111822] rounded-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden shadow-sm">
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left text-sm text-slate-200">
                  <thead className="bg-slate-50 dark:bg-[#16202c] text-slate-600 dark:text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-200/90 dark:border-slate-800 text-xs">
                    <tr>
                      <th scope="col" className="w-14 px-3 py-3 text-center shrink-0">ลำดับ</th>
                      <th scope="col" className="px-4 py-3 min-w-[200px] w-[40%]">ชื่อ - สกุล</th>
                      <th scope="col" className="px-4 py-3 min-w-[200px] w-[36%]">ตำแหน่งในคณะกรรมการ</th>
                      <th scope="col" className="px-4 py-3 text-right w-36 shrink-0">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/60 font-sans">
                    {filteredBoard.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-12 text-center text-slate-500">
                          ยังไม่มีข้อมูลคณะกรรมการสถานศึกษา
                        </td>
                      </tr>
                    ) : (
                      filteredBoard.map((b, idx) => {
                        const isDirector = b.position === 'DIRECTOR_SEC' || b.positionTitle.includes('เลขานุการ');
                        const isChair = b.position === 'CHAIR' || b.positionTitle.includes('ประธาน');
                        const isExpanded = expandedBoardId === b.id;
                        return (
                          <React.Fragment key={b.id}>
                            <tr
                              onClick={() => setExpandedBoardId(isExpanded ? null : b.id)}
                              className={`group cursor-pointer transition-colors hover:bg-slate-50/80 dark:hover:bg-white/[0.03] ${
                                isExpanded ? 'bg-slate-100/70 dark:bg-[#162231]/40' : ''
                              }`}
                            >
                              <td className="w-14 px-3 py-3.5 text-center font-mono tabular-nums text-slate-400 dark:text-slate-500 text-xs whitespace-nowrap">
                                {idx + 1}
                              </td>
                              <td className="px-4 py-3.5">
                                <div className="font-semibold text-slate-900 dark:text-white text-sm truncate max-w-[240px]" title={b.fullName}>
                                  {b.fullName}
                                </div>
                                {isDirector && (
                                  <span className="block text-xs text-slate-400 mt-0.5 truncate max-w-[240px]" title="ผู้อำนวยการสถานศึกษา">
                                    ผู้อำนวยการสถานศึกษา
                                  </span>
                                )}
                              </td>
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              {isChair ? (
                                <div className="inline-flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                                  <span className="text-sm font-medium text-amber-300">
                                    {b.positionTitle}
                                  </span>
                                </div>
                              ) : isDirector ? (
                                <span className="text-sm font-medium text-slate-200">
                                  {b.positionTitle}
                                </span>
                              ) : (
                                <span className="text-sm text-slate-300 font-normal">
                                  {b.positionTitle}
                                </span>
                              )}
                            </td>
                            <td className="w-36 px-4 py-3.5 text-right whitespace-nowrap">
                              <div className="inline-flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditBoardMember(b)}
                                  className="p-1.5 rounded-md text-slate-400 dark:text-slate-500 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors duration-200"
                                  title="แก้ไขข้อมูลกรรมการ"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteBoardMember(b.id)}
                                  className="p-1.5 rounded-md text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors duration-200"
                                  title="ลบกรรมการสถานศึกษา"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>

                                <span className="h-4 w-px bg-slate-200 dark:bg-white/10 mx-1 shrink-0" />

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedBoardId(isExpanded ? null : b.id);
                                  }}
                                  className="p-1.5 rounded-md text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors duration-200"
                                  title={isExpanded ? 'ย่อรายละเอียด' : 'ขยายรายละเอียด'}
                                  aria-label={isExpanded ? 'ย่อรายละเอียด' : 'ขยายรายละเอียด'}
                                >
                                  <ChevronDown
                                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                                      isExpanded ? 'rotate-180 text-sky-500 dark:text-sky-400' : ''
                                    }`}
                                  />
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Expanded Detail Panel */}
                          {isExpanded && (
                            <tr className="bg-slate-50/70 dark:bg-white/[0.02] border-t border-slate-200/80 dark:border-white/[0.04]">
                              <td colSpan={4} className="px-4 sm:pl-14 sm:pr-6 py-4">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4">
                                  <div>
                                    <div className="text-xs text-slate-400 font-medium">
                                      สังกัดองค์กร / หน่วยงาน
                                    </div>
                                    <div className="text-sm text-slate-800 dark:text-slate-200 mt-1 leading-relaxed">
                                      {b.organization}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-slate-400 font-medium">
                                      อาชีพ / บทบาท
                                    </div>
                                    <div className="text-sm text-slate-700 dark:text-slate-300 mt-1 font-medium">
                                      {b.occupation || 'ไม่ได้ระบุ'}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-slate-400 font-medium">
                                      วาระการดำรงตำแหน่ง
                                    </div>
                                    <div className="text-sm text-slate-800 dark:text-slate-200 mt-1 font-medium">
                                      {isDirector ? (
                                        <div className="flex flex-col gap-1 items-start">
                                          <span className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/10 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-500/25">
                                            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                                            <span>โดยตำแหน่ง</span>
                                          </span>
                                          {b.endReason && b.endDate ? (
                                            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                                              สิ้นสุด {formatOfficialThaiDate(b.endDate)} ({b.endReason})
                                            </span>
                                          ) : b.appointmentDate && formatServiceDuration(b.appointmentDate) ? (
                                            <span className="text-xs text-sky-600 dark:text-sky-400 font-medium font-mono mt-0.5">
                                              ปฏิบัติหน้าที่มาแล้ว {formatServiceDuration(b.appointmentDate)}
                                            </span>
                                          ) : null}
                                        </div>
                                      ) : (
                                        <span>วาระที่ {b.termNumber} (วาระ 4 ปี)</span>
                                      )}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-slate-400 font-medium">
                                      สถานะการดำรงตำแหน่ง
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-1">
                                      <span className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                        <span>{b.status}</span>
                                      </span>
                                    </div>
                                    <div className="text-xs text-slate-400 mt-1">
                                      ตามกฎกระทรวง พ.ศ. 2546
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 3: ข้อมูลสถานศึกษา (School Master Information) */}
        {/* =================================================================== */}
        {activeTab === 'school' && (
          <div className="bg-white dark:bg-[#111822] p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800 max-w-4xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200/90 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Building className="w-5 h-5 text-sky-400 shrink-0" />
                  <span>ข้อมูลพื้นฐานสถานศึกษา</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  ข้อมูลนี้จะถูกนำไปใช้ในหัวกระดาษราชการ แบบฟอร์มใบลา A4 และรายงาน สพฐ. ทั้งระบบ
                </p>
              </div>

              <span className="px-2.5 py-1 rounded-xl text-xs font-mono font-bold bg-sky-500/10 text-sky-300 border border-sky-500/30">
                รหัส สพฐ: {schoolInfo.schoolCode8}
              </span>
            </div>

            <form onSubmit={handleSaveSchoolInfo} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">ชื่อสถานศึกษา</label>
                  <input
                    type="text"
                    value={schoolInfo.schoolName}
                    onChange={(e) => setSchoolInfo({ ...schoolInfo, schoolName: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-[#16202c] border border-slate-200/90 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">หน่วยงานต้นสังกัด</label>
                  <input
                    type="text"
                    value={schoolInfo.affiliation}
                    onChange={(e) => setSchoolInfo({ ...schoolInfo, affiliation: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-[#16202c] border border-slate-200/90 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    ผู้อำนวยการสถานศึกษา
                  </label>
                  <input
                    type="text"
                    value={schoolInfo.directorName}
                    onChange={(e) => setSchoolInfo({ ...schoolInfo, directorName: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-[#16202c] border border-slate-200/90 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-bold focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">ตำแหน่งทางการบริหาร</label>
                  <input
                    type="text"
                    value={schoolInfo.directorPosition}
                    onChange={(e) =>
                      setSchoolInfo({ ...schoolInfo, directorPosition: e.target.value })
                    }
                    className="w-full bg-slate-50 dark:bg-[#16202c] border border-slate-200/90 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    ผู้รักษาการในตำแหน่งผู้อำนวยการสถานศึกษา (ลำดับที่ 1)
                  </label>
                  <input
                    type="text"
                    value={schoolInfo.actingDirector1}
                    onChange={(e) =>
                      setSchoolInfo({ ...schoolInfo, actingDirector1: e.target.value })
                    }
                    className="w-full bg-slate-50 dark:bg-[#16202c] border border-slate-200/90 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    ผู้รักษาการในตำแหน่งผู้อำนวยการสถานศึกษา (ลำดับที่ 2)
                  </label>
                  <input
                    type="text"
                    value={schoolInfo.actingDirector2}
                    onChange={(e) =>
                      setSchoolInfo({ ...schoolInfo, actingDirector2: e.target.value })
                    }
                    className="w-full bg-slate-50 dark:bg-[#16202c] border border-slate-200/90 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    หมายเลขโทรศัพท์ติดต่อ
                  </label>
                  <input
                    type="text"
                    value={schoolInfo.contactPhone}
                    onChange={(e) =>
                      setSchoolInfo({ ...schoolInfo, contactPhone: e.target.value })
                    }
                    className="w-full bg-slate-50 dark:bg-[#16202c] border border-slate-200/90 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">อีเมลทางการ</label>
                  <input
                    type="email"
                    value={schoolInfo.email}
                    onChange={(e) => setSchoolInfo({ ...schoolInfo, email: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-[#16202c] border border-slate-200/90 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">รหัสสถานศึกษา 10 หลัก</label>
                  <input
                    type="text"
                    value={schoolInfo.schoolCode10}
                    onChange={(e) => setSchoolInfo({ ...schoolInfo, schoolCode10: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-[#16202c] border border-slate-200/90 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">รหัสสถานศึกษา 8 หลัก (สพฐ.)</label>
                  <input
                    type="text"
                    value={schoolInfo.schoolCode8}
                    onChange={(e) => setSchoolInfo({ ...schoolInfo, schoolCode8: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-[#16202c] border border-slate-200/90 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">ที่ตั้งสถานศึกษา</label>
                  <input
                    type="text"
                    value={schoolInfo.address}
                    onChange={(e) => setSchoolInfo({ ...schoolInfo, address: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-[#16202c] border border-slate-200/90 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Minimal & Clean School Academic Years, Census Snapshots & Offered Grades */}
              <div className="pt-4 border-t border-slate-200/90 dark:border-slate-800">
                <SchoolAcademicManager
                  schoolId={schoolInfo.schoolCode8 || '30030099'}
                  currentActiveClasses={activeClasses}
                  currentTerm={schoolInfo.currentTerm}
                  onSemesterChange={handleSemesterChange}
                  onSyncSchoolInfo={handleSyncSchoolInfo}
                  onMutated={refreshAuditLogs}
                  showToast={showToast}
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium border border-transparent transition-colors duration-200"
                >
                  <Save className="w-4 h-4 shrink-0" />
                  <span>บันทึกการตั้งค่าสถานศึกษา</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 4: ปีงบประมาณและปฏิทินวันหยุด (Fiscal Year & Holidays) */}
        {/* =================================================================== */}
        {activeTab === 'fiscal' && (
          <div className="space-y-6">
            {/* Minimal & Clean Fiscal Period & Salary Promotion Snapshot Manager */}
            <FiscalPeriodManager
              schoolId={schoolInfo.schoolCode8 || '30030099'}
              teachers={teachers}
              onPeriodChange={handlePeriodChange}
              onMutated={refreshAuditLogs}
              showToast={showToast}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Add Holiday Box */}
              <div className="lg:col-span-1 space-y-4">
                <form
                onSubmit={handleAddHoliday}
                className="bg-white dark:bg-[#111822] p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 space-y-3 text-xs"
              >
                <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <PlusCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>เพิ่มวันหยุดราชการ</span>
                </h4>

                <div>
                  <label className="block text-slate-700 dark:text-slate-400 font-semibold mb-1">ชื่อวันหยุด</label>
                  <input
                    type="text"
                    placeholder="เช่น วันหยุดราชการเป็นกรณีพิเศษ..."
                    value={newHolidayName}
                    onChange={(e) => setNewHolidayName(e.target.value)}
                    required
                    className="w-full bg-slate-50 dark:bg-[#16202c] border border-slate-200/90 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-400 font-semibold mb-1">วันที่</label>
                  <ThaiDatePicker
                    value={newHolidayDate}
                    onChange={(dateStr) => setNewHolidayDate(dateStr)}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium border border-transparent transition-colors duration-200"
                >
                  <PlusCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>บันทึกวันหยุด</span>
                </button>
              </form>
            </div>

            {/* Holiday Calendar List */}
            <div className="lg:col-span-2 bg-white dark:bg-[#111822] rounded-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden shadow-sm flex flex-col">
              {/* Header */}
              <div className="p-4 bg-slate-50 dark:bg-[#16202c] border-b border-slate-200/90 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-sky-500 dark:text-sky-400 shrink-0" />
                    <span>ปฏิทินวันหยุดราชการ ({holidayYearRangeLabel})</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    นำไปหักลบออกจากวันลาทำการจริงโดยอัตโนมัติ ตามระเบียบสำนักนายกรัฐมนตรี
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-mono">
                    {filteredHolidays.length} / {holidays.length} วัน
                  </span>
                </div>
              </div>

              {/* Filter Toolbar (Segmented Year Pills + Search) */}
              <div className="p-3 bg-white dark:bg-[#111822] border-b border-slate-200/80 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                {/* Year Filter Pills */}
                <div className="inline-flex flex-wrap p-1 bg-slate-100 dark:bg-[#0b1016] border border-slate-200/80 dark:border-slate-800/80 rounded-lg shrink-0 gap-0.5">
                  <button
                    type="button"
                    onClick={() => setHolidayYearFilter('ALL')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                      holidayYearFilter === 'ALL'
                        ? 'bg-white text-slate-900 dark:bg-slate-800 dark:text-white shadow-sm font-semibold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    ทั้งหมด ({holidays.length})
                  </button>
                  {holidayYearOptions.map((opt) => (
                    <button
                      key={opt.yearBE}
                      type="button"
                      onClick={() => setHolidayYearFilter(opt.yearBE)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                        holidayYearFilter === opt.yearBE
                          ? 'bg-white text-slate-900 dark:bg-slate-800 dark:text-white shadow-sm font-semibold'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      ปี {opt.yearBE} ({opt.count})
                    </button>
                  ))}
                </div>

                {/* Search Box */}
                <div className="relative flex-1 sm:max-w-xs">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    value={holidaySearch}
                    onChange={(e) => setHolidaySearch(e.target.value)}
                    placeholder="ค้นหาชื่อหรือวันที่..."
                    className="w-full h-8 pl-8 pr-3 text-xs bg-slate-50 dark:bg-[#16202c] border border-slate-200/90 dark:border-slate-700/80 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                  />
                  {holidaySearch && (
                    <button
                      type="button"
                      onClick={() => setHolidaySearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Holiday List */}
              <div className="divide-y divide-slate-200/80 dark:divide-slate-800/60 text-xs overflow-y-auto max-h-[600px]">
                {filteredHolidays.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 dark:text-slate-500 space-y-2">
                    <Calendar className="w-8 h-8 mx-auto opacity-40 text-slate-400" />
                    <p>ไม่พบรายการวันหยุดที่ตรงกับเงื่อนไข</p>
                  </div>
                ) : (
                  filteredHolidays.map((h: HolidayRecord) => {
                    const dayOfWeek = getThaiDayOfWeek(h.date);
                    const is2569 = h.date.startsWith('2026');

                    let badgeColor = 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20';
                    if (h.type?.includes('ชดเชย')) {
                      badgeColor = 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20';
                    } else if (h.type?.includes('ครม') || h.type?.includes('พิเศษ')) {
                      badgeColor = 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20';
                    } else if (h.type?.includes('สถานศึกษา')) {
                      badgeColor = 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20';
                    }

                    return (
                      <div
                        key={h.id}
                        className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-[#151f2c] transition-colors"
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-slate-900 dark:text-white truncate">
                              {h.name}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-medium border shrink-0 ${badgeColor}`}>
                              {h.type}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                            <span>{dayOfWeek}</span>
                            <span>•</span>
                            <span className="font-mono">{h.date}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-mono text-xs font-semibold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 px-2.5 py-1 rounded-md border border-sky-200/60 dark:border-sky-800/50">
                            {formatThaiDateDisplay(h.date, 'full')}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteHoliday(h.id)}
                            className="p-1.5 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title="ลบวันหยุด"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
        )}

        {/* =================================================================== */}
        {/* TAB 5: บันทึกความปลอดภัย PDPA (Immutable Audit Logs) */}
        {/* =================================================================== */}
        {activeTab === 'audit' && (
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/90 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>บันทึกประวัติระบบและข้อมูลอ่อนไหว</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  ประวัติการเข้าถึงข้อมูลอ่อนไหวและการเปลี่ยนแปลงข้อมูลสำคัญในระบบ
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                  ทั้งหมด {filteredAndSortedAuditLogs.length} รายการ
                </span>
                <button
                  type="button"
                  onClick={refreshAuditLogs}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="รีเฟรชประวัติ"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Search & Category Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="ค้นหากิจกรรม, ผู้ดำเนินการ, ข้อมูล..."
                  value={auditSearch}
                  onChange={(e) => {
                    setAuditSearch(e.target.value);
                    setAuditCurrentPage(1);
                  }}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-[#141d27] border border-slate-200/90 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="flex bg-slate-100 dark:bg-[#101822] p-1 rounded-xl border border-slate-200/90 dark:border-slate-800 text-xs w-full sm:w-auto overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setAuditCategory('all');
                      setAuditCurrentPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
                      auditCategory === 'all'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    ทั้งหมด
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuditCategory('delete');
                      setAuditCurrentPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
                      auditCategory === 'delete'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    ลบข้อมูล
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuditCategory('sensitive');
                      setAuditCurrentPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
                      auditCategory === 'sensitive'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    ข้อมูลอ่อนไหว PDPA
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuditCategory('update');
                      setAuditCurrentPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
                      auditCategory === 'update'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    แก้ไขระบบและข้อมูล
                  </button>
                </div>
              </div>
            </div>

            {/* Symmetrical Table */}
            <div className="overflow-x-auto w-full rounded-xl border border-slate-200/90 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/80 dark:bg-[#101822] text-slate-600 dark:text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-200/90 dark:border-slate-800">
                  <tr>
                    <th scope="col" className="w-14 px-3 py-3 text-center">ลำดับ</th>
                    <th scope="col" className="w-44 px-4 py-3 font-mono">วันและเวลา</th>
                    <th scope="col" className="w-[22%] px-4 py-3">ประเภทกิจกรรม</th>
                    <th scope="col" className="w-[24%] px-4 py-3">ผู้ดำเนินการ</th>
                    <th scope="col" className="flex-1 px-4 py-3">เป้าหมายข้อมูล</th>
                    <th scope="col" className="w-12 px-3 py-3 text-right">
                      <span className="sr-only">ขยายรายละเอียด</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/60 font-sans">
                  {paginatedAuditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-slate-400 dark:text-slate-500 font-medium">
                        ไม่พบประวัติการบันทึก Audit Logs ในระบบ
                      </td>
                    </tr>
                  ) : (
                    paginatedAuditLogs.map((log, idx) => {
                      const isExpanded = expandedLogId === log.id;
                      const meta = translateAuditAction(log.action);
                      const cleanTarget = cleanAuditTargetName(log.targetName);
                      const actorInfo = cleanAuditActor(log.actorName, log.actorRole);
                      const itemNumber = (auditCurrentPage - 1) * AUDIT_PAGE_SIZE + idx + 1;

                      return (
                        <React.Fragment key={log.id}>
                          <tr
                            onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                            className={`hover:bg-slate-50 dark:hover:bg-[#1a2636]/50 transition-colors cursor-pointer ${
                              isExpanded ? 'bg-slate-100/70 dark:bg-[#1a2636]/40' : ''
                            }`}
                          >
                            <td className="w-14 px-3 py-3 text-center tabular-nums text-xs text-slate-400 dark:text-slate-500 font-mono">
                              {itemNumber}
                            </td>
                            <td className="w-44 px-4 py-3 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap tabular-nums">
                              {new Date(log.timestamp).toLocaleString('th-TH')}
                            </td>
                            <td className="w-[22%] px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full shrink-0 ${meta.dotClass}`} />
                                <span className={`text-xs font-medium ${meta.textClass}`}>{meta.title}</span>
                              </div>
                            </td>
                            <td className="w-[24%] px-4 py-3">
                              <div className="truncate max-w-[200px] font-medium text-slate-800 dark:text-slate-200" title={actorInfo.name}>
                                {actorInfo.name}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                {actorInfo.roleLabel}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                              <div className="truncate max-w-[220px]" title={log.targetName}>
                                {cleanTarget}
                              </div>
                            </td>
                            <td className="w-12 px-3 py-3 text-right">
                              <ChevronDown
                                className={`w-4 h-4 ml-auto text-slate-400 transition-transform duration-200 ${
                                  isExpanded ? 'rotate-180 text-emerald-400' : ''
                                }`}
                              />
                            </td>
                          </tr>

                          {/* Expanded Detail Panel */}
                          {isExpanded && (
                            <tr className="bg-slate-50/90 dark:bg-[#0b1016]/90 border-y border-slate-200/90 dark:border-slate-800/80">
                              <td colSpan={6} className="pl-14 pr-6 py-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                                  <div>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mb-1">
                                      วันและเวลา / หมายเลข IP
                                    </div>
                                    <div className="font-mono text-slate-800 dark:text-slate-200 font-medium">
                                      {new Date(log.timestamp).toLocaleString('th-TH')}
                                    </div>
                                    <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                      IP: {log.ipAddress}
                                    </div>
                                  </div>

                                  <div>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mb-1">
                                      กิจกรรม / รหัสระบบ
                                    </div>
                                    <div className="text-slate-800 dark:text-slate-200 font-medium">
                                      {meta.title}
                                    </div>
                                    <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                      {log.action}
                                    </div>
                                  </div>

                                  <div>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mb-1">
                                      ผู้ดำเนินการ / รหัสอ้างอิง
                                    </div>
                                    <div className="text-slate-800 dark:text-slate-200 font-medium">
                                      {actorInfo.name}
                                    </div>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                      {actorInfo.roleLabel} · {log.id}
                                    </div>
                                  </div>

                                  <div>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mb-1">
                                      รายละเอียดการดำเนินการ
                                    </div>
                                    <div className="text-slate-800 dark:text-slate-200 font-medium leading-relaxed bg-white dark:bg-[#141d27] p-2.5 rounded-lg border border-slate-200/90 dark:border-slate-800">
                                      {log.details || '-'}
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalAuditPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs">
                <div className="text-slate-500 dark:text-slate-400">
                  แสดงหน้า {auditCurrentPage} จาก {totalAuditPages} หน้า (รวม {filteredAndSortedAuditLogs.length} รายการ)
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={auditCurrentPage <= 1}
                    onClick={() => setAuditCurrentPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 rounded-lg border border-slate-200/90 dark:border-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    ก่อนหน้า
                  </button>
                  <div className="px-2 font-mono text-slate-600 dark:text-slate-400">
                    {auditCurrentPage} / {totalAuditPages}
                  </div>
                  <button
                    type="button"
                    disabled={auditCurrentPage >= totalAuditPages}
                    onClick={() => setAuditCurrentPage((p) => Math.min(totalAuditPages, p + 1))}
                    className="px-3 py-1.5 rounded-lg border border-slate-200/90 dark:border-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    ถัดไป
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 6: ตั้งค่าระบบ (System Preferences & Configuration) */}
        {/* =================================================================== */}
        {activeTab === 'preferences' && <SystemSettingsTab />}
      </main>

      {/* Staff Edit Modal (Clean 2x2 Core Tabs — Single Source of Truth) */}
      <StaffEditModal
        isOpen={isStaffModalOpen}
        isNewStaff={isNewStaff}
        isSaving={isSaving}
        staff={selectedStaff}
        workloads={workloads}
        activeTab={staffModalTab}
        dirtyTabs={staffTabDirty}
        isCustomMajor={isCustomMajor}
        teacherRoles={TEACHER_ROLES}
        departments={DEPARTMENTS}
        activeClasses={ACTIVE_CLASSES}
        deriveEmploymentType={deriveEmploymentType}
        onTabChange={setStaffModalTab}
        onChangeStaff={setSelectedStaff}
        onChangeCustomMajor={setIsCustomMajor}
        onNavigateToView={handleNavigateToView}
        onDeleteStaff={handleDeleteStaff}
        onSave={handleSaveStaff}
        onClose={() => setIsStaffModalOpen(false)}
      />

      {/* School Board Modal (Feature-complete legacy GAS restoration) */}
      {isBoardModalOpen && selectedBoardMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#141d27] border border-slate-200/90 dark:border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-xs my-8 text-slate-800 dark:text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200/90 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                  <Award className="w-5 h-5 shrink-0" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                    {isNewBoardMember ? 'เพิ่มกรรมการสถานศึกษาใหม่' : `แก้ไขข้อมูลกรรมการ: ${selectedBoardMember.fullName}`}
                  </h3>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    ตามกฎกระทรวงกำหนดจำนวนกรรมการ คุณสมบัติ และหลักเกณฑ์ พ.ศ. 2546
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBoardModalOpen(false)}
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors duration-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-slate-700 dark:text-slate-400 font-semibold mb-1">
                  ชื่อ - นามสกุล <span className="text-amber-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น นายประเสริฐ ชุมชนดี (หรือ พระครู...)"
                  value={selectedBoardMember.fullName}
                  onChange={(e) =>
                    setSelectedBoardMember({
                      ...selectedBoardMember,
                      fullName: e.target.value,
                    })
                  }
                  className="w-full bg-slate-50 dark:bg-[#101822] border border-slate-200/90 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-400 font-semibold mb-1">
                  ตำแหน่งในคณะกรรมการสถานศึกษา <span className="text-amber-500">*</span>
                </label>
                <select
                  value={selectedBoardMember.position}
                  onChange={(e) => {
                    const found = BOARD_POSITIONS.find((p) => p.value === e.target.value);
                    setSelectedBoardMember({
                      ...selectedBoardMember,
                      position: e.target.value,
                      positionTitle: found ? found.title : e.target.value,
                    });
                  }}
                  className="w-full bg-slate-50 dark:bg-[#101822] border border-slate-200/90 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                >
                  {BOARD_POSITIONS.map((pos) => (
                    <option key={pos.value} value={pos.value}>
                      {pos.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-400 font-semibold mb-1">อาชีพหลัก / ตำแหน่งหน้าที่</label>
                  <input
                    type="text"
                    placeholder="เช่น ข้าราชการบำนาญ, ธุรกิจส่วนตัว"
                    value={selectedBoardMember.occupation}
                    onChange={(e) =>
                      setSelectedBoardMember({
                        ...selectedBoardMember,
                        occupation: e.target.value,
                      })
                    }
                    className="w-full bg-slate-50 dark:bg-[#101822] border border-slate-200/90 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-400 font-semibold mb-1">สังกัด / องค์กร</label>
                  <input
                    type="text"
                    placeholder="เช่น ชุมชนบ้านตะขบ, อบต.ตะขบ"
                    value={selectedBoardMember.organization}
                    onChange={(e) =>
                      setSelectedBoardMember({
                        ...selectedBoardMember,
                        organization: e.target.value,
                      })
                    }
                    className="w-full bg-slate-50 dark:bg-[#101822] border border-slate-200/90 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* If DIRECTOR_SEC (ผอ. กรรมการและเลขานุการโดยตำแหน่ง) */}
              {selectedBoardMember.position === 'DIRECTOR_SEC' ? (
                <div className="p-3.5 rounded-xl bg-sky-50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800/60 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-sky-700 dark:text-sky-300">
                      <ShieldCheck className="w-4 h-4 shrink-0" />
                      <span>สถานะ: กรรมการและเลขานุการโดยตำแหน่ง (Ex-officio)</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleSyncDirectorFromStaff}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-sky-600 hover:bg-sky-500 text-white transition-colors duration-200 shadow-sm cursor-pointer"
                      title="ซิงก์ชื่อ ผอ. และวันที่แต่งตั้ง ผอ. ล่าสุดจากทะเบียนบุคลากร"
                    >
                      <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                      <span>ซิงก์จากทะเบียนบุคลากร</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                        เบอร์โทรศัพท์ (PDPA)
                      </label>
                      <input
                        type="text"
                        placeholder="08x-xxx-xxxx"
                        value={selectedBoardMember.phone}
                        onChange={(e) =>
                          setSelectedBoardMember({
                            ...selectedBoardMember,
                            phone: e.target.value,
                          })
                        }
                        className="w-full h-10 bg-white dark:bg-[#101822] border border-slate-200/90 dark:border-slate-700 rounded-xl px-3 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-sky-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                        วันที่มาดำรงตำแหน่ง ผอ.
                      </label>
                      <ThaiDatePicker
                        value={selectedBoardMember.appointmentDate || ''}
                        onChange={(dateStr) =>
                          setSelectedBoardMember({
                            ...selectedBoardMember,
                            appointmentDate: dateStr,
                          })
                        }
                      />
                      <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400 mt-1.5 break-words">
                        ใช้นับระยะเวลาปฏิบัติหน้าที่กรรมการโดยตำแหน่ง
                      </p>
                    </div>

                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                        สถานะการดำรงตำแหน่ง
                      </label>
                      <select
                        value={selectedBoardMember.status || 'ดำรงตำแหน่ง'}
                        onChange={(e) =>
                          setSelectedBoardMember({
                            ...selectedBoardMember,
                            status: e.target.value,
                          })
                        }
                        className="w-full h-10 bg-white dark:bg-[#101822] border border-slate-200/90 dark:border-slate-700 rounded-xl px-3 text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-sky-500"
                      >
                        <option value="ดำรงตำแหน่ง">ดำรงตำแหน่ง</option>
                        <option value="พ้นจากตำแหน่ง">พ้นจากตำแหน่ง</option>
                      </select>
                    </div>
                  </div>

                  {/* หากพ้นจากตำแหน่ง: เหตุผลและวันที่สิ้นสุด */}
                  {selectedBoardMember.status === 'พ้นจากตำแหน่ง' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2.5 border-t border-sky-200 dark:border-sky-800/40">
                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                          เหตุผลที่พ้นจากตำแหน่ง
                        </label>
                        <select
                          value={selectedBoardMember.endReason || ''}
                          onChange={(e) =>
                            setSelectedBoardMember({
                              ...selectedBoardMember,
                              endReason: e.target.value,
                            })
                          }
                          className="w-full bg-white dark:bg-[#101822] border border-slate-200/90 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                        >
                          <option value="">-- เลือกเหตุผล --</option>
                          <option value="ย้าย">ย้าย</option>
                          <option value="ลาออก">ลาออก</option>
                          <option value="เกษียณอายุราชการ">เกษียณอายุราชการ</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                          วันที่พ้นจากตำแหน่ง (สิ้นสุด)
                        </label>
                        <ThaiDatePicker
                          value={selectedBoardMember.endDate || ''}
                          onChange={(dateStr) =>
                            setSelectedBoardMember({
                              ...selectedBoardMember,
                              endDate: dateStr,
                            })
                          }
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-400 font-semibold mb-1">เบอร์โทรศัพท์ (PDPA)</label>
                    <input
                      type="text"
                      placeholder="08x-xxx-xxxx"
                      value={selectedBoardMember.phone}
                      onChange={(e) =>
                        setSelectedBoardMember({
                          ...selectedBoardMember,
                          phone: e.target.value,
                        })
                      }
                      className="w-full bg-slate-50 dark:bg-[#101822] border border-slate-200/90 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 dark:text-slate-400 font-semibold mb-1">วาระที่ดำรงตำแหน่ง</label>
                    <select
                      value={selectedBoardMember.termNumber}
                      onChange={(e) =>
                        setSelectedBoardMember({
                          ...selectedBoardMember,
                          termNumber: Number(e.target.value) || 1,
                        })
                      }
                      className="w-full bg-slate-50 dark:bg-[#101822] border border-slate-200/90 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-amber-500"
                    >
                      <option value={1}>วาระที่ 1 (ครั้งแรก 4 ปี)</option>
                      <option value={2}>วาระที่ 2 (ต่อเนื่องครั้งที่ 2)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-700 dark:text-slate-400 font-semibold mb-1">สถานะภาพ</label>
                    <select
                      value={selectedBoardMember.status}
                      onChange={(e) =>
                        setSelectedBoardMember({
                          ...selectedBoardMember,
                          status: e.target.value,
                        })
                      }
                      className="w-full bg-slate-50 dark:bg-[#101822] border border-slate-200/90 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-amber-500"
                    >
                      <option value="ดำรงตำแหน่ง">ดำรงตำแหน่ง</option>
                      <option value="ครบวาระ">ครบวาระ</option>
                      <option value="พ้นจากตำแหน่งก่อนครบวาระ">พ้นจากตำแหน่งก่อนครบวาระ</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-800">
              {!isNewBoardMember ? (
                <button
                  type="button"
                  onClick={() => handleDeleteBoardMember(selectedBoardMember.id)}
                  className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-medium text-xs inline-flex items-center gap-2 transition-colors duration-200"
                >
                  <Trash2 className="w-3.5 h-3.5 shrink-0" />
                  <span>ลบกรรมการ</span>
                </button>
              ) : (
                <div />
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsBoardModalOpen(false)}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 border border-slate-200/90 dark:bg-[#121822] dark:hover:bg-slate-800/70 dark:text-slate-300 dark:hover:text-white dark:border-slate-800/80 text-xs font-medium transition-colors duration-200 disabled:opacity-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleSaveBoardMember}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium border border-transparent inline-flex items-center gap-2 transition-colors duration-200 disabled:opacity-50"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 shrink-0" />
                  )}
                  <span>{isSaving ? 'กำลังบันทึกลงฐานข้อมูล...' : isNewBoardMember ? 'บันทึกเพิ่มกรรมการใหม่' : 'บันทึกการเปลี่ยนแปลง'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Reusable In-App Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(confirmDialog)}
        title={confirmDialog?.title || ''}
        description={confirmDialog?.description || ''}
        confirmLabel={confirmDialog?.confirmLabel || 'ยืนยัน'}
        isLoading={isSaving}
        onConfirm={() => confirmDialog?.onConfirm()}
        onCancel={() => setConfirmDialog(null)}
      />

      {/* Real-time Toast Notification Overlay */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl border text-xs font-medium animate-in slide-in-from-bottom-2 duration-200 bg-white dark:bg-[#121a24] text-slate-900 dark:text-white border-slate-200 dark:border-slate-700">
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          ) : toast.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-sky-500 shrink-0" />
          )}
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors ml-2"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
