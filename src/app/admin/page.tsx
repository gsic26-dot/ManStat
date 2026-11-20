'use client';

/**
 * ============================================================================
 * ManStat-Modern: Administrative Management Center (/admin)
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

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
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
import { UserSettingsModal } from '@/components/settings/UserSettingsModal';
import { SystemSettingsTab } from '@/components/settings/SystemSettingsTab';
import { UserProfileDropdown } from '@/components/navigation/UserProfileDropdown';
import { isAdminRole } from '@/lib/auth/roles';
import {
  INITIAL_TEACHERS,
  INITIAL_BOARD_MEMBERS,
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
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'staff' | 'board' | 'school' | 'fiscal' | 'audit' | 'preferences'
  >('staff');

  // Loading & Feedback State
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Authenticated User & RBAC State
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentRole, setCurrentRole] = useState<string>('superuser');

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((current) => (current?.message === message ? null : current));
    }, 4000);
  };

  // Staff State
  const [teachers, setTeachers] = useState<TeacherRecord[]>(INITIAL_TEACHERS);
  const [staffSearch, setStaffSearch] = useState('');
  const [expandedStaffId, setExpandedStaffId] = useState<string | null>(null);
  const [expandedBoardId, setExpandedBoardId] = useState<string | null>(null);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<TeacherRecord | null>(null);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [staffModalTab, setStaffModalTab] = useState<
    'profile' | 'licenses' | 'workload' | 'history'
  >('profile');
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
  const [boardMembers, setBoardMembers] = useState<BoardMemberRecord[]>(INITIAL_BOARD_MEMBERS);
  const [boardSearch, setBoardSearch] = useState('');
  const [selectedBoardMember, setSelectedBoardMember] = useState<BoardMemberRecord | null>(null);
  const [isBoardModalOpen, setIsBoardModalOpen] = useState(false);
  const [isNewBoardMember, setIsNewBoardMember] = useState(false);

  // School Info State
  const [schoolInfo, setSchoolInfo] = useState(INITIAL_SCHOOL_INFO);
  const [activeClasses, setActiveClasses] = useState<string[]>(ACTIVE_CLASSES);

  // Fiscal Year & Holidays State
  const [fiscalYearBE, setFiscalYearBE] = useState(2570);
  const [holidays, setHolidays] = useState<HolidayRecord[]>([
    { id: 'h1', date: '2026-10-23', name: 'วันปิยมหาราช', type: 'วันหยุดราชการประจำปี' },
    { id: 'h2', date: '2026-12-05', name: 'วันคล้ายวันพระบรมราชสมภพ ร.9 / วันพ่อแห่งชาติ', type: 'วันหยุดราชการประจำปี' },
    { id: 'h3', date: '2026-12-10', name: 'วันรัฐธรรมนูญ', type: 'วันหยุดราชการประจำปี' },
    { id: 'h4', date: '2026-12-31', name: 'วันสิ้นปี', type: 'วันหยุดราชการประจำปี' },
    { id: 'h5', date: '2027-01-01', name: 'วันขึ้นปีใหม่', type: 'วันหยุดราชการประจำปี' },
    { id: 'h6', date: '2027-01-16', name: 'วันครูแห่งชาติ (วันหยุดสถานศึกษา)', type: 'วันหยุดเฉพาะสถานศึกษา' },
  ]);
  const [newHolidayName, setNewHolidayName] = useState('');
  const [newHolidayDate, setNewHolidayDate] = useState('');

  // Real Immutable Audit Logs from Database
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);

  // Function to refresh audit logs
  const refreshAuditLogs = async () => {
    try {
      const res = await fetch('/api/admin/audit', { cache: 'no-store' });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setAuditLogs(data.data);
      }
    } catch {
      // silent
    }
  };

  // Initial Load from Persistent Database
  useEffect(() => {
    let isMounted = true;
    async function loadAllAdminData() {
      setIsLoading(true);
      try {
        const [staffRes, boardRes, schoolRes, holRes, auditRes] = await Promise.all([
          fetch('/api/admin/staff', { cache: 'no-store' }).then((r) => r.json()).catch(() => null),
          fetch('/api/admin/board', { cache: 'no-store' }).then((r) => r.json()).catch(() => null),
          fetch('/api/admin/school', { cache: 'no-store' }).then((r) => r.json()).catch(() => null),
          fetch('/api/admin/holidays', { cache: 'no-store' }).then((r) => r.json()).catch(() => null),
          fetch('/api/admin/audit', { cache: 'no-store' }).then((r) => r.json()).catch(() => null),
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

          if (staffRes?.success && Array.isArray(staffRes.data)) {
            setTeachers(staffRes.data);
            try {
              localStorage.setItem('manstat_admin_teachers', JSON.stringify(staffRes.data));
            } catch {
              // ignore
            }
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
      if (data.success) {
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
      if (data.success) {
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

  const handleDeleteHoliday = async (id: string) => {
    const target = holidays.find((h) => h.id === id);
    if (!confirm(`คุณต้องการลบวันหยุด "${target?.name || id}" ใช่หรือไม่?`)) return;
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
    }
  };

  const handleSaveFiscalYear = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/school', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...schoolInfo, fiscalYear: String(fiscalYearBE), activeClasses }),
      });
      const data = await res.json();
      if (data.success) {
        setSchoolInfo(data.data);
        showToast(`บันทึกปีงบประมาณ ${fiscalYearBE} เรียบร้อยแล้ว`, 'success');
        refreshAuditLogs();
      } else {
        showToast(data.error || 'บันทึกปีงบประมาณไม่สำเร็จ', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
    } finally {
      setIsSaving(false);
    }
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
    setSelectedStaff({
      id: nextCode,
      employeeCode: nextCode,
      name: '',
      prefix: 'นาย',
      firstName: '',
      lastName: '',
      position: 'ครู',
      academicStanding: '-',
      department: 'ภาษาไทย',
      division: 'ครูผู้สอน',
      classLevel: '-',
      dutyDay: '-',
      accessLevel: 'User',
      startDate: new Date().toISOString().split('T')[0],
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
    });
    setStaffModalTab('profile');
    setIsStaffModalOpen(true);
  };

  const handleOpenEditStaff = (t: TeacherRecord) => {
    setIsNewStaff(false);
    setSelectedStaff({
      ...t,
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
    });
    setStaffModalTab('profile');
    setIsStaffModalOpen(true);
  };

  const handleSaveStaff = async () => {
    if (!selectedStaff) return;
    const computedName =
      (selectedStaff.firstName || selectedStaff.lastName)
        ? `${selectedStaff.prefix || ''}${selectedStaff.firstName || ''} ${selectedStaff.lastName || ''}`.trim()
        : selectedStaff.name.trim();
    if (!computedName) {
      showToast('กรุณาระบุชื่อ-นามสกุลบุคลากร', 'error');
      return;
    }

    const updatedStaff: TeacherRecord = {
      ...selectedStaff,
      name: computedName,
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
      if (data.success) {
        const savedItem: TeacherRecord = data.data;
        if (isNewStaff) {
          setTeachers((prev) => {
            const next = [savedItem, ...prev];
            try { localStorage.setItem('manstat_admin_teachers', JSON.stringify(next)); } catch {}
            return next;
          });
        } else {
          setTeachers((prev) => {
            const next = prev.map((t) =>
              t.id === savedItem.id || (savedItem.employeeCode && t.employeeCode === savedItem.employeeCode)
                ? savedItem
                : t
            );
            try { localStorage.setItem('manstat_admin_teachers', JSON.stringify(next)); } catch {}
            return next;
          });
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
              try { localStorage.setItem('manstat_admin_teachers', JSON.stringify(sRes.data)); } catch {}
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
            // If the current logged-in user was demoted to 'teacher' (User), kick them back to /
            if (!isAdminRole(authMeRes.user.role)) {
              alert('ระดับสิทธิ์ของท่านถูกปรับเป็นผู้ใช้งานทั่วไป (User) ระบบจะนำท่านกลับสู่หน้าหลัก');
              window.location.href = '/';
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

  const handleDeleteStaff = async (staffId: string) => {
    const target = teachers.find((t) => t.id === staffId);
    if (!target) return;
    if (confirm(`คุณต้องการลบข้อมูลบุคลากร "${target.name}" ใช่หรือไม่?`)) {
      setIsSaving(true);
      try {
        const res = await fetch(`/api/admin/staff?id=${encodeURIComponent(staffId)}`, {
          method: 'DELETE',
        });
        const data = await res.json();
        if (data.success) {
          setTeachers((prev) => {
            const next = prev.filter((t) => t.id !== staffId);
            try { localStorage.setItem('manstat_admin_teachers', JSON.stringify(next)); } catch {}
            return next;
          });
          if (selectedStaff?.id === staffId) {
            setIsStaffModalOpen(false);
          }
          showToast(`ลบข้อมูลบุคลากร ${target.name} เรียบร้อยแล้ว`, 'success');
          refreshAuditLogs();
        } else {
          showToast(data.error || 'ลบไม่สำเร็จ', 'error');
        }
      } catch (err: any) {
        showToast(err.message || 'เกิดข้อผิดพลาดในการลบข้อมูล', 'error');
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleAddLicenseToStaff = () => {
    if (!selectedStaff || !newLicNumber.trim()) {
      alert('กรุณากรอกเลขที่ใบอนุญาต');
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
        t.id === 'EXE-001'
    );

    if (!directorTeacher) {
      showToast('ไม่พบบุคลากรตำแหน่งผู้อำนวยการในระบบ', 'error');
      return;
    }

    // 2. ค้นหาใน standings ของ ผอ. เฉพาะรายการที่ level มีคำว่า ผู้อำนวยการ หรือ ผอ. เรียงตาม effectiveDate ล่าสุด
    const directorStandings = (directorTeacher.standings || [])
      .filter((s) => s.level && (s.level.includes('ผู้อำนวยการ') || s.level.includes('ผอ.')))
      .sort((a, b) => (b.effectiveDate || '').localeCompare(a.effectiveDate || ''));

    const latestDirectorStanding = directorStandings[0];

    // 3. System Guard: ห้ามดึง startDate (วันบรรจุรับราชการ/ครูผู้ช่วย) มาใส่ใน appointmentDate เด็ดขาด!
    if (!latestDirectorStanding || !latestDirectorStanding.effectiveDate) {
      showToast('ไม่พบวันที่แต่งตั้ง ผอ. ในประวัติ กรุณาเลือกวันที่ด้วยตนเอง', 'info');
      setSelectedBoardMember((prev) =>
        prev
          ? {
              ...prev,
              fullName: directorTeacher.name,
              organization: prev.organization || schoolInfo.schoolName || 'โรงเรียนชุมชนบ้านตะขบ',
              occupation: 'ผู้อำนวยการสถานศึกษา',
              phone: directorTeacher.phone || prev.phone,
            }
          : null
      );
      return;
    }

    // เติมค่าจากรายการแต่งตั้ง ผอ. ล่าสุด
    setSelectedBoardMember((prev) =>
      prev
        ? {
            ...prev,
            fullName: directorTeacher.name,
            appointmentDate: latestDirectorStanding.effectiveDate,
            organization: prev.organization || schoolInfo.schoolName || 'โรงเรียนชุมชนบ้านตะขบ',
            occupation: 'ผู้อำนวยการสถานศึกษา',
            phone: directorTeacher.phone || prev.phone,
          }
        : null
    );
    showToast(`ซิงก์ข้อมูล ผอ. สำเร็จ (วันดำรงตำแหน่ง: ${latestDirectorStanding.effectiveDate})`, 'success');
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
      if (data.success) {
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

  const handleDeleteBoardMember = async (id: string) => {
    const target = boardMembers.find((b) => b.id === id);
    if (!target) return;
    if (confirm(`คุณต้องการลบกรรมการสถานศึกษา "${target.fullName}" ใช่หรือไม่?`)) {
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
      }
    }
  };

  const filteredTeachers = teachers.filter(
    (t) =>
      t.name.toLowerCase().includes(staffSearch.toLowerCase()) ||
      t.employeeCode.toLowerCase().includes(staffSearch.toLowerCase()) ||
      t.position.toLowerCase().includes(staffSearch.toLowerCase()) ||
      t.department.toLowerCase().includes(staffSearch.toLowerCase())
  );

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
            <div className="flex items-center gap-2 border-l border-slate-200 dark:border-slate-700 pl-3">
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
        <div className="bg-white dark:bg-[#121822] p-2 sm:p-2.5 rounded-xl border border-slate-200/90 dark:border-slate-800/80 shadow-sm">
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-[#0b1016] border border-slate-200/80 dark:border-slate-800/80 rounded-lg">
            {/* 1. จัดการบุคลากร */}
            <button
              type="button"
              onClick={() => setActiveTab('staff')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 ${
                activeTab === 'staff'
                  ? 'bg-white text-slate-900 dark:bg-slate-800 dark:text-white shadow-sm font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/30'
              }`}
              title="จัดการข้อมูลบุคลากร"
            >
              <Users className={`w-4 h-4 shrink-0 ${activeTab === 'staff' ? 'text-sky-500 dark:text-sky-400' : 'text-slate-400'}`} />
              <span className="truncate">จัดการบุคลากร</span>
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
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 ${
                activeTab === 'board'
                  ? 'bg-white text-slate-900 dark:bg-slate-800 dark:text-white shadow-sm font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/30'
              }`}
              title="คณะกรรมการสถานศึกษา"
            >
              <Award className={`w-4 h-4 shrink-0 ${activeTab === 'board' ? 'text-purple-500 dark:text-purple-400' : 'text-slate-400'}`} />
              <span className="truncate">คณะกรรมการสถานศึกษา</span>
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
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 ${
                activeTab === 'school'
                  ? 'bg-white text-slate-900 dark:bg-slate-800 dark:text-white shadow-sm font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/30'
              }`}
              title="ข้อมูลสถานศึกษา"
            >
              <Building className={`w-4 h-4 shrink-0 ${activeTab === 'school' ? 'text-emerald-500 dark:text-emerald-400' : 'text-slate-400'}`} />
              <span className="truncate">ข้อมูลสถานศึกษา</span>
            </button>

            {/* 4. ปีงบประมาณและวันหยุด */}
            <button
              type="button"
              onClick={() => setActiveTab('fiscal')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 ${
                activeTab === 'fiscal'
                  ? 'bg-white text-slate-900 dark:bg-slate-800 dark:text-white shadow-sm font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/30'
              }`}
              title="ปีงบประมาณและวันหยุด"
            >
              <Calendar className={`w-4 h-4 shrink-0 ${activeTab === 'fiscal' ? 'text-amber-500 dark:text-amber-400' : 'text-slate-400'}`} />
              <span className="truncate">ปีงบประมาณและวันหยุด</span>
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
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 ${
                activeTab === 'audit'
                  ? 'bg-white text-slate-900 dark:bg-slate-800 dark:text-white shadow-sm font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/30'
              }`}
              title="ตรวจสอบ PDPA Audit Logs"
            >
              <ShieldAlert className={`w-4 h-4 shrink-0 ${activeTab === 'audit' ? 'text-rose-500 dark:text-rose-400' : 'text-slate-400'}`} />
              <span className="truncate">บันทึก PDPA</span>
            </button>

            {/* 6. ตั้งค่าระบบ */}
            <button
              type="button"
              onClick={() => setActiveTab('preferences')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 ${
                activeTab === 'preferences'
                  ? 'bg-white text-slate-900 dark:bg-slate-800 dark:text-white shadow-sm font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/30'
              }`}
              title="ตั้งค่าระบบ"
            >
              <Sliders className={`w-4 h-4 shrink-0 ${activeTab === 'preferences' ? 'text-sky-500 dark:text-sky-400' : 'text-slate-400'}`} />
              <span className="truncate">ตั้งค่าระบบ</span>
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
                  แสดง {filteredTeachers.length} จาก {teachers.length} ท่าน
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
                      <th scope="col" className="w-10 px-3 py-3 text-center">
                        <span className="sr-only">ขยายรายละเอียด</span>
                      </th>
                      <th scope="col" className="px-4 py-3 min-w-[200px]">รหัส / ชื่อ-สกุล</th>
                      <th scope="col" className="px-4 py-3 min-w-[190px]">ตำแหน่ง / วิทยฐานะ</th>
                      <th scope="col" className="px-4 py-3 text-center min-w-[120px]">สิทธิ์การใช้งาน</th>
                      <th scope="col" className="px-4 py-3 text-center min-w-[100px]">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/60 font-sans">
                    {filteredTeachers.map((t) => {
                      const posDisplay = t.position
                        .replace('ผู้อำนวยการสถานศึกษา', 'ผอ.สถานศึกษา')
                        .replace('ผู้อำนวยการโรงเรียน', 'ผอ.โรงเรียน');
                      const isExpanded = expandedStaffId === t.id;
                      return (
                        <React.Fragment key={t.id}>
                          <tr
                            onClick={() => setExpandedStaffId(isExpanded ? null : t.id)}
                            className={`hover:bg-slate-50 dark:hover:bg-[#162231]/50 transition-colors cursor-pointer ${
                              isExpanded ? 'bg-slate-100/70 dark:bg-[#162231]/40' : ''
                            }`}
                          >
                            <td className="px-3 py-3 text-center">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedStaffId(isExpanded ? null : t.id);
                                }}
                                className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
                                aria-label={isExpanded ? 'ย่อแถว' : 'ขยายแถว'}
                              >
                                <ChevronRight
                                  className={`w-4 h-4 transition-transform duration-200 ${
                                    isExpanded ? 'rotate-90 text-sky-400' : ''
                                  }`}
                                />
                              </button>
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-bold text-slate-900 dark:text-white truncate max-w-[180px]" title={t.name}>{t.name}</div>
                              <div className="text-[11px] font-mono text-sky-400 mt-0.5 truncate max-w-[180px]" title={`${t.employeeCode} ${t.positionNo ? `(ตำแหน่ง ${t.positionNo})` : ''}`}>
                                {t.employeeCode} {t.positionNo ? `(ตำแหน่ง ${t.positionNo})` : ''}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-slate-800 dark:text-slate-200 truncate max-w-[180px]" title={t.position}>{posDisplay}</div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-[180px]" title={t.academicStanding !== '-' ? t.academicStanding : 'ไม่มีวิทยฐานะ'}>
                                {t.academicStanding !== '-' ? t.academicStanding : 'ไม่มีวิทยฐานะ'}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center whitespace-nowrap">
                              {t.accessLevel === 'Superuser' || t.role === 'superuser' ? (
                                <span className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30">
                                  Superuser
                                </span>
                              ) : t.accessLevel === 'Admin' || t.role === 'hr_admin' ? (
                                <span className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-800 border border-sky-200 dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-500/30">
                                  Admin
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                                  Teacher
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditStaff(t)}
                                  className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors duration-200"
                                  title="ตั้งค่าและแก้ไขข้อมูลบุคลากร"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteStaff(t.id)}
                                  className="p-1.5 rounded-md text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors duration-200"
                                  title="ลบข้อมูลบุคลากร"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Expanded Detail Panel */}
                          {isExpanded && (
                            <tr className="bg-slate-50/90 dark:bg-[#0b1016]/90 border-y border-slate-200/90 dark:border-slate-800/80">
                              <td colSpan={5} className="px-6 py-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                                  <div>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mb-1">
                                      วุฒิลูกเสือ &amp; ใบอนุญาต
                                    </div>
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-1.5 text-amber-300">
                                        <Compass className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                        <span className="font-medium">{t.highestScout || 'ไม่มีวุฒิลูกเสือ'}</span>
                                      </div>
                                      <div className="flex items-center gap-1.5 text-emerald-300">
                                        <Award className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                        <span className="font-medium">
                                          {t.licenses && t.licenses.length > 0 ? t.licenses[0].type : 'ไม่มีข้อมูลใบอนุญาต'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mb-1">
                                      ภาระงานสอนและ TA
                                    </div>
                                    <div className="text-slate-800 dark:text-slate-200 font-mono">
                                      <span className="text-sky-300 font-bold text-sm">{t.teachingHours ?? 18}</span>
                                      <span className="text-slate-500"> สอน + </span>
                                      <span className="text-amber-300 font-bold text-sm">{t.taHours ?? 0}</span>
                                      <span className="text-slate-400 text-xs"> TA ชม./สัปดาห์</span>
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mb-1">
                                      วันลาสะสม (ป่วย / กิจ / พักผ่อน)
                                    </div>
                                    <div className="font-mono text-xs">
                                      <span className="text-rose-400 font-bold">{t.sickUsed}</span> วันป่วย /{' '}
                                      <span className="text-amber-400 font-bold">{t.personalUsed}</span> วันกิจ /{' '}
                                      <span className="text-emerald-400 font-bold">{t.vacationUsed}</span> วันพักผ่อน
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mb-1">
                                      กลุ่มสาระ / ฝ่ายงาน
                                    </div>
                                    <div className="text-slate-800 dark:text-slate-200 font-medium">
                                      {t.department}
                                    </div>
                                    <div className="text-[11px] text-slate-400 mt-0.5">
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
                  ทั้งหมด {boardMembers.length} ท่าน (ตามลำดับกฎกระทรวง)
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
                      <th scope="col" className="w-10 px-3 py-3.5 text-center">
                        <span className="sr-only">ขยายรายละเอียด</span>
                      </th>
                      <th scope="col" className="px-4 py-3 text-center min-w-[56px] shrink-0">ลำดับ</th>
                      <th scope="col" className="px-4 py-3 min-w-[200px]">ชื่อ - สกุล</th>
                      <th scope="col" className="px-4 py-3 min-w-[190px]">ตำแหน่งในคณะกรรมการ</th>
                      <th scope="col" className="px-4 py-3 text-center min-w-[100px]">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/60 font-sans">
                    {filteredBoard.map((b, idx) => {
                      const isDirector = b.position === 'DIRECTOR_SEC';
                      const isExpanded = expandedBoardId === b.id;
                      return (
                        <React.Fragment key={b.id}>
                          <tr
                            onClick={() => setExpandedBoardId(isExpanded ? null : b.id)}
                            className={`hover:bg-slate-50 dark:hover:bg-[#162231]/50 transition-colors cursor-pointer ${
                              isExpanded ? 'bg-slate-100/70 dark:bg-[#162231]/40' : ''
                            }`}
                          >
                            <td className="px-3 py-3.5 text-center">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedBoardId(isExpanded ? null : b.id);
                                }}
                                className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
                                aria-label={isExpanded ? 'ย่อแถว' : 'ขยายแถว'}
                              >
                                <ChevronRight
                                  className={`w-4 h-4 transition-transform duration-200 ${
                                    isExpanded ? 'rotate-90 text-sky-400' : ''
                                  }`}
                                />
                              </button>
                            </td>
                            <td className="px-4 py-3.5 font-mono text-slate-400 text-center font-bold whitespace-nowrap">{idx + 1}</td>
                            <td className="px-4 py-3.5">
                              <div className="font-bold text-slate-900 dark:text-white text-base truncate max-w-[200px]" title={b.fullName}>{b.fullName}</div>
                              {isDirector && (
                                <span className="block text-xs text-sky-400 font-normal mt-0.5 truncate max-w-[200px]" title="ผอ.สถานศึกษา โรงเรียนชุมชนบ้านตะขบ">
                                  ผอ.สถานศึกษา โรงเรียนชุมชนบ้านตะขบ
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30" title={b.positionTitle}>
                                {b.positionTitle}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              <div className="inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditBoardMember(b)}
                                  className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors duration-200"
                                  title="แก้ไขข้อมูลกรรมการ"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteBoardMember(b.id)}
                                  className="p-1.5 rounded-md text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors duration-200"
                                  title="ลบกรรมการสถานศึกษา"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Expanded Detail Panel */}
                          {isExpanded && (
                            <tr className="bg-slate-50/90 dark:bg-[#0b1016]/90 border-y border-slate-200/90 dark:border-slate-800/80">
                              <td colSpan={5} className="px-6 py-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                                  <div>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mb-1">
                                      สังกัดองค์กร / หน่วยงาน
                                    </div>
                                    <div className="text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                                      {b.organization}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mb-1">
                                      อาชีพ / บทบาท
                                    </div>
                                    <div className="text-slate-700 dark:text-slate-300 font-medium">
                                      {b.occupation || 'ไม่ได้ระบุ'}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mb-1">
                                      วาระการดำรงตำแหน่ง
                                    </div>
                                    <div className="text-slate-800 dark:text-slate-200 font-medium">
                                      {isDirector ? (
                                        <div className="flex flex-col gap-1 items-start">
                                          <span className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/15 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300 border border-sky-500/30">
                                            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                                            <span>โดยตำแหน่ง</span>
                                          </span>
                                          {b.endReason && b.endDate ? (
                                            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                                              สิ้นสุด {formatOfficialThaiDate(b.endDate)} ({b.endReason})
                                            </span>
                                          ) : b.appointmentDate && formatServiceDuration(b.appointmentDate) ? (
                                            <span className="text-[11px] text-sky-600 dark:text-sky-400 font-medium font-mono">
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
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mb-1">
                                      สถานะการดำรงตำแหน่ง
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                        <span>{b.status}</span>
                                      </span>
                                    </div>
                                    <div className="text-[11px] text-slate-400 mt-1">
                                      ตามกฎกระทรวง พ.ศ. 2546
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
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
                  <span>ข้อมูลพื้นฐานสถานศึกษา (School Profile Configuration)</span>
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
                    ผู้รักษาการแทนลำดับที่ 1
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
                    ผู้รักษาการแทนลำดับที่ 2
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

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">ปีการศึกษา</label>
                  <input
                    type="text"
                    value={schoolInfo.academicYear}
                    onChange={(e) => setSchoolInfo({ ...schoolInfo, academicYear: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-[#16202c] border border-slate-200/90 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">ภาคเรียนที่</label>
                  <input
                    type="text"
                    value={schoolInfo.currentTerm}
                    onChange={(e) => setSchoolInfo({ ...schoolInfo, currentTerm: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-[#16202c] border border-slate-200/90 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">จำนวนนักเรียนรวม (คน)</label>
                  <input
                    type="number"
                    value={schoolInfo.studentCount}
                    onChange={(e) => setSchoolInfo({ ...schoolInfo, studentCount: Number(e.target.value) || 0 })}
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

              {/* Active Classes Management */}
              <div className="pt-4 border-t border-slate-200/90 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Building className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>ระดับชั้นเรียนที่เปิดทำการสอน (Active Classes)</span>
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      คลิกเพื่อเปิดหรือปิดชั้นเรียนสำหรับปีการศึกษานี้ (ใช้งานในตารางภาระงานและครูประจำชั้น)
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-xl text-xs font-mono font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                    เปิดสอน {activeClasses.length} ชั้นเรียน
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 pt-2">
                  {ACTIVE_CLASSES.map((cls) => {
                    const isActive = activeClasses.includes(cls);
                    return (
                      <button
                        key={cls}
                        type="button"
                        onClick={() => {
                          if (isActive) {
                            setActiveClasses((prev) => prev.filter((c) => c !== cls));
                          } else {
                            setActiveClasses((prev) => [...prev, cls]);
                          }
                        }}
                        className={`p-2.5 rounded-lg border text-center font-medium text-xs transition-colors duration-200 ${
                          isActive
                            ? 'bg-sky-500/15 border-sky-500/40 text-sky-200'
                            : 'bg-slate-800/40 border-slate-700/60 text-slate-400 line-through opacity-60 hover:opacity-90'
                        }`}
                      >
                        {cls}
                      </button>
                    );
                  })}
                </div>
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Fiscal Year Overview */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white dark:bg-[#111822] p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-sky-400 shrink-0" />
                  <span>รอบปีงบประมาณราชการ</span>
                </h3>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1">ปีงบประมาณปัจจุบัน</label>
                    <input
                      type="number"
                      value={fiscalYearBE}
                      onChange={(e) => setFiscalYearBE(Number(e.target.value))}
                      className="w-full bg-slate-50 dark:bg-[#16202c] border border-slate-200/90 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-mono font-bold"
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#151e2b] border border-slate-200/90 dark:border-slate-800/80 space-y-2">
                    <div className="text-[11px] font-semibold text-sky-300">
                      รอบการประเมินที่ 1 (ก.ค.ศ. ว15/2561)
                    </div>
                    <div className="text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                      1 ตุลาคม {fiscalYearBE - 1} - 31 มีนาคม {fiscalYearBE}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#151e2b] border border-slate-200/90 dark:border-slate-800/80 space-y-2">
                    <div className="text-[11px] font-semibold text-emerald-300">
                      รอบการประเมินที่ 2 (ก.ค.ศ. ว15/2561)
                    </div>
                    <div className="text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                      1 เมษายน {fiscalYearBE} - 30 กันยายน {fiscalYearBE}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveFiscalYear}
                    disabled={isSaving}
                    className="w-full py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs inline-flex items-center justify-center gap-2 transition-colors duration-200 disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5 shrink-0" />
                    <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกปีงบประมาณ'}</span>
                  </button>
                </div>
              </div>

              {/* Add Holiday Box */}
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
            <div className="lg:col-span-2 bg-white dark:bg-[#111822] rounded-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden">
              <div className="p-4 bg-slate-50 dark:bg-[#16202c] border-b border-slate-200/90 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    ปฏิทินวันหยุดราชการประจำปีงบประมาณ {fiscalYearBE}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    ระบบคำนวณวันลาจะนำวันหยุดเหล่านี้ไปหักลบออกจากวันลาจริงโดยอัตโนมัติ (Zero-GAS Engine)
                  </p>
                </div>
                <span className="font-mono text-xs text-amber-600 dark:text-amber-400 font-bold">
                  {holidays.length} วัน
                </span>
              </div>

              <div className="divide-y divide-slate-200/80 dark:divide-slate-800/60 text-xs">
                {holidays.map((h) => (
                  <div
                    key={h.id}
                    className="p-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-[#151f2c] transition-colors"
                  >
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">{h.name}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{h.type}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-sky-400">
                        {formatThaiDateDisplay(h.date)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteHoliday(h.id)}
                        className="p-1.5 rounded-md text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors duration-200"
                        title="ลบวันหยุด"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 5: บันทึกความปลอดภัย PDPA (Immutable Audit Logs) */}
        {/* =================================================================== */}
        {activeTab === 'audit' && (
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>บันทึกประวัติการเข้าถึงข้อมูลอ่อนไหว (PDPA Audit Logs)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  ระบบบันทึก Log แบบไม่สามารถแก้ไขได้ (Append-only) ทุกครั้งที่มีการเปิดเผยเลขประจำตัวประชาชน 13 หลัก
                </p>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                ทั้งหมด {auditLogs.length} รายการล่าสุด
              </span>
            </div>

            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-100/80 dark:bg-[#101822] text-slate-600 dark:text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-200/90 dark:border-slate-800">
                  <tr>
                    <th scope="col" className="w-10 px-3 py-3 text-center">
                      <span className="sr-only">ขยายรายละเอียด</span>
                    </th>
                    <th scope="col" className="px-4 py-3 min-w-[170px]">วันและเวลา</th>
                    <th scope="col" className="px-4 py-3 min-w-[160px]">ประเภทกิจกรรม</th>
                    <th scope="col" className="px-4 py-3 min-w-[190px]">ผู้ดำเนินการ</th>
                    <th scope="col" className="px-4 py-3 min-w-[170px]">เป้าหมายข้อมูล</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/60 font-sans">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-10 text-slate-400 dark:text-slate-500 font-medium">
                        ยังไม่มีประวัติการบันทึก Audit Logs ในระบบ
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => {
                    const isExpanded = expandedLogId === log.id;
                    return (
                      <React.Fragment key={log.id}>
                        <tr
                          onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                          className={`hover:bg-slate-50 dark:hover:bg-[#1a2636]/50 transition-colors cursor-pointer ${
                            isExpanded ? 'bg-slate-100/70 dark:bg-[#1a2636]/40' : ''
                          }`}
                        >
                          <td className="px-3 py-3 text-center">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedLogId(isExpanded ? null : log.id);
                              }}
                              className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
                              aria-label={isExpanded ? 'ย่อแถว' : 'ขยายแถว'}
                            >
                              <ChevronRight
                                className={`w-4 h-4 transition-transform duration-200 ${
                                  isExpanded ? 'rotate-90 text-amber-400' : ''
                                }`}
                              />
                            </button>
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-400 whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleString('th-TH')}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30">
                              {log.action}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-200">
                            <div className="truncate max-w-[200px]" title={`${log.actorName} (${log.actorRole})`}>
                              {log.actorName} ({log.actorRole})
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-300">
                            <div className="text-slate-800 dark:text-slate-200 truncate max-w-[180px]" title={log.targetName}>
                              {log.targetName}
                            </div>
                          </td>
                        </tr>

                        {/* Expanded Detail Panel */}
                        {isExpanded && (
                          <tr className="bg-slate-50/90 dark:bg-[#0b1016]/90 border-y border-slate-200/90 dark:border-slate-800/80">
                            <td colSpan={5} className="px-6 py-4">
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                                <div className="sm:col-span-2">
                                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mb-1">
                                    รายละเอียดกิจกรรม (Audit Details)
                                  </div>
                                  <div className="text-slate-800 dark:text-slate-200 font-medium leading-relaxed bg-white dark:bg-[#141d27] p-3 rounded-xl border border-slate-200/90 dark:border-slate-800">
                                    {log.details}
                                  </div>
                                </div>
                                <div className="space-y-3">
                                  <div>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mb-1">
                                      IP Address &amp; การเชื่อมต่อ
                                    </div>
                                    <div className="font-mono text-slate-300 font-medium">
                                      {log.ipAddress}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mb-1">
                                      มาตรฐานการคุ้มครองข้อมูล
                                    </div>
                                    <div className="text-emerald-400 text-[11px] flex items-center gap-1.5">
                                      <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                                      <span>พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA)</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  }))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 6: ตั้งค่าระบบ (System Preferences & Configuration) */}
        {/* =================================================================== */}
        {activeTab === 'preferences' && <SystemSettingsTab />}
      </main>

      {/* Staff Master Modal (Feature-complete legacy GAS restoration) */}
      {isStaffModalOpen && selectedStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#141d27] border border-slate-200/90 dark:border-slate-700 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-4 text-xs my-8 max-h-[90vh] flex flex-col text-slate-800 dark:text-slate-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200/90 dark:border-slate-800 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-sky-500/15 text-sky-400">
                  <UserCheck className="w-5 h-5 shrink-0" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                    {isNewStaff ? 'เพิ่มข้อมูลบุคลากรใหม่' : `ตั้งค่าและแก้ไขบุคลากร: ${selectedStaff.name || 'ไม่ระบุชื่อ'}`}
                  </h3>
                  <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                    รหัสประจำตัว: {selectedStaff.employeeCode} {selectedStaff.positionNo ? `| เลขที่ตำแหน่ง: ${selectedStaff.positionNo}` : ''}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsStaffModalOpen(false)}
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors duration-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sub-Tabs Navigation (Google Segmented Control style) */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-[#0d141d] rounded-lg border border-slate-200/80 dark:border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setStaffModalTab('profile')}
                className={`flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition-colors duration-200 inline-flex items-center justify-center gap-2 ${
                  staffModalTab === 'profile'
                    ? 'bg-white text-slate-900 dark:bg-slate-800 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/30'
                }`}
              >
                <Users className="w-3.5 h-3.5 shrink-0" />
                <span>ข้อมูลผู้ใช้ & ตำแหน่ง</span>
              </button>
              <button
                type="button"
                onClick={() => setStaffModalTab('licenses')}
                className={`flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition-colors duration-200 inline-flex items-center justify-center gap-2 ${
                  staffModalTab === 'licenses'
                    ? 'bg-white text-slate-900 dark:bg-slate-800 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/30'
                }`}
              >
                <Award className="w-3.5 h-3.5 shrink-0" />
                <span>ใบอนุญาต & วุฒิลูกเสือ</span>
                <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-200 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-mono">
                  {(selectedStaff.licenses || []).length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setStaffModalTab('workload')}
                className={`flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition-colors duration-200 inline-flex items-center justify-center gap-2 ${
                  staffModalTab === 'workload'
                    ? 'bg-white text-slate-900 dark:bg-slate-800 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/30'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5 shrink-0" />
                <span>ภาระงานสอน & TA</span>
              </button>
              <button
                type="button"
                onClick={() => setStaffModalTab('history')}
                className={`flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition-colors duration-200 inline-flex items-center justify-center gap-2 ${
                  staffModalTab === 'history'
                    ? 'bg-white text-slate-900 dark:bg-slate-800 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/30'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5 shrink-0" />
                <span>วิทยฐานะ & วุฒิการศึกษา</span>
              </button>
            </div>

            {/* Modal Body - Tab Panes */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-4">
              {/* TAB 1: ข้อมูลผู้ใช้ & ตำแหน่ง */}
              {staffModalTab === 'profile' && (
                <div className="space-y-4">
                  {/* Identification Card */}
                  <div className="bg-slate-50 dark:bg-[#101822] p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 space-y-3">
                    <div className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 shrink-0" />
                      <span>ข้อมูลระบุตัวตนและเลขทะเบียนทางราชการ</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-slate-400 mb-1">รหัสบุคลากร</label>
                        <input
                          type="text"
                          value={selectedStaff.employeeCode}
                          onChange={(e) =>
                            setSelectedStaff({ ...selectedStaff, employeeCode: e.target.value })
                          }
                          className="w-full bg-white dark:bg-[#16212e] border border-slate-200/90 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">เลขที่ตำแหน่ง</label>
                        <input
                          type="text"
                          value={selectedStaff.positionNo || ''}
                          placeholder="เช่น 75362"
                          onChange={(e) =>
                            setSelectedStaff({ ...selectedStaff, positionNo: e.target.value })
                          }
                          className="w-full bg-white dark:bg-[#16212e] border border-slate-200/90 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">สมาชิกประเภทสามัญ เลขที่</label>
                        <input
                          type="text"
                          value={selectedStaff.memberId || ''}
                          placeholder="เลขสมาชิกสามัญ"
                          onChange={(e) =>
                            setSelectedStaff({ ...selectedStaff, memberId: e.target.value })
                          }
                          className="w-full bg-white dark:bg-[#16212e] border border-slate-200/90 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">เลขประจำตัว ปชช. (13 หลัก)</label>
                        <input
                          type="text"
                          maxLength={13}
                          value={selectedStaff.idCard || ''}
                          placeholder="เลขบัตร 13 หลัก"
                          onChange={(e) =>
                            setSelectedStaff({ ...selectedStaff, idCard: e.target.value })
                          }
                          className="w-full bg-white dark:bg-[#16212e] border border-slate-200/90 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Name and Official Placement */}
                  <div className="bg-slate-50 dark:bg-[#101822] p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 space-y-3">
                    <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                      <Briefcase className="w-4 h-4 shrink-0" />
                      <span>ข้อมูลชื่อ ตำแหน่ง และสังกัดฝ่ายงาน</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-slate-400 mb-1">คำนำหน้า</label>
                        <select
                          value={selectedStaff.prefix || 'นาย'}
                          onChange={(e) => {
                            const newPrefix = e.target.value;
                            setSelectedStaff({
                              ...selectedStaff,
                              prefix: newPrefix,
                              name: `${newPrefix}${selectedStaff.firstName || ''} ${selectedStaff.lastName || ''}`.trim(),
                            });
                          }}
                          className="w-full bg-white dark:bg-[#16212e] border border-slate-200/90 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white"
                        >
                          <option value="นาย">นาย</option>
                          <option value="นาง">นาง</option>
                          <option value="นางสาว">นางสาว</option>
                          <option value="ว่าที่ ร.ต.">ว่าที่ ร.ต.</option>
                          <option value="ดร.">ดร.</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">ชื่อจริง</label>
                        <input
                          type="text"
                          value={selectedStaff.firstName || ''}
                          placeholder="ชื่อจริง"
                          onChange={(e) =>
                            setSelectedStaff({
                              ...selectedStaff,
                              firstName: e.target.value,
                              name: `${selectedStaff.prefix || ''}${e.target.value} ${selectedStaff.lastName || ''}`.trim(),
                            })
                          }
                          className="w-full bg-white dark:bg-[#16212e] border border-slate-200/90 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">นามสกุล</label>
                        <input
                          type="text"
                          value={selectedStaff.lastName || ''}
                          placeholder="นามสกุล"
                          onChange={(e) =>
                            setSelectedStaff({
                              ...selectedStaff,
                              lastName: e.target.value,
                              name: `${selectedStaff.prefix || ''}${selectedStaff.firstName || ''} ${e.target.value}`.trim(),
                            })
                          }
                          className="w-full bg-white dark:bg-[#16212e] border border-slate-200/90 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-400 mb-1">ตำแหน่งมาตรฐาน สพฐ.</label>
                        <select
                          value={selectedStaff.position}
                          onChange={(e) =>
                            setSelectedStaff({ ...selectedStaff, position: e.target.value })
                          }
                          className="w-full bg-white dark:bg-[#16212e] border border-slate-200/90 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white"
                        >
                          {TEACHER_ROLES.map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-slate-400">วิทยฐานะ</label>
                          <button
                            type="button"
                            onClick={() => setSelectedStaff({ ...selectedStaff, academicStanding: '-' })}
                            className="text-[10px] text-sky-500 hover:text-sky-400 font-medium underline"
                            title="ตั้งค่าเป็นไม่มีวิทยฐานะ (-)"
                          >
                            ไม่มีวิทยฐานะ
                          </button>
                        </div>
                        <div className="space-y-1.5">
                          <select
                            value={
                              STANDARD_STANDINGS.includes(selectedStaff.academicStanding)
                                ? selectedStaff.academicStanding
                                : selectedStaff.academicStanding === ''
                                ? '-'
                                : 'custom'
                            }
                            onChange={(e) => {
                              if (e.target.value !== 'custom') {
                                setSelectedStaff({ ...selectedStaff, academicStanding: e.target.value });
                              }
                            }}
                            className="w-full bg-white dark:bg-[#16212e] border border-slate-200/90 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white text-xs"
                          >
                            <option value="-">- ไม่มีวิทยฐานะ -</option>
                            <option value="ครูชำนาญการ (คศ. 2)">ครูชำนาญการ (คศ. 2)</option>
                            <option value="ครูชำนาญการพิเศษ (คศ. 3)">ครูชำนาญการพิเศษ (คศ. 3)</option>
                            <option value="ครูเชี่ยวชาญ (คศ. 4)">ครูเชี่ยวชาญ (คศ. 4)</option>
                            <option value="ครูเชี่ยวชาญพิเศษ (คศ. 5)">ครูเชี่ยวชาญพิเศษ (คศ. 5)</option>
                            <option value="ผู้อำนวยการชำนาญการพิเศษ (คศ. 3)">ผู้อำนวยการชำนาญการพิเศษ (คศ. 3)</option>
                            <option value="ผู้อำนวยการเชี่ยวชาญ (คศ. 4)">ผู้อำนวยการเชี่ยวชาญ (คศ. 4)</option>
                            <option value="ผู้อำนวยการเชี่ยวชาญพิเศษ (คศ. 5)">ผู้อำนวยการเชี่ยวชาญพิเศษ (คศ. 5)</option>
                            <option value="custom">ระบุเอง...</option>
                          </select>
                          {(!STANDARD_STANDINGS.includes(selectedStaff.academicStanding) || selectedStaff.academicStanding === 'custom') && (
                            <input
                              type="text"
                              value={selectedStaff.academicStanding === 'custom' ? '' : selectedStaff.academicStanding}
                              placeholder="ระบุวิทยฐานะ หรือพิมพ์ -"
                              onChange={(e) =>
                                setSelectedStaff({ ...selectedStaff, academicStanding: e.target.value })
                              }
                              className="w-full bg-white dark:bg-[#16212e] border border-slate-200/90 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white text-xs"
                            />
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-400 mb-1">กลุ่มสาระการเรียนรู้</label>
                        <select
                          value={selectedStaff.department}
                          onChange={(e) =>
                            setSelectedStaff({ ...selectedStaff, department: e.target.value })
                          }
                          className="w-full bg-white dark:bg-[#16212e] border border-slate-200/90 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white"
                        >
                          {DEPARTMENTS.map((dept) => (
                            <option key={dept} value={dept}>
                              {dept}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">ฝ่ายงาน / หน้าที่รับผิดชอบ</label>
                        <input
                          type="text"
                          value={selectedStaff.division}
                          placeholder="เช่น หัวหน้าฝ่ายบริหารงานวิชาการ, ครูประจำชั้น"
                          onChange={(e) =>
                            setSelectedStaff({ ...selectedStaff, division: e.target.value })
                          }
                          className="w-full bg-white dark:bg-[#16212e] border border-slate-200/90 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-slate-400 mb-1">ชั้นที่ปรึกษา / ประจำชั้น</label>
                        <select
                          value={selectedStaff.classLevel || '-'}
                          onChange={(e) =>
                            setSelectedStaff({ ...selectedStaff, classLevel: e.target.value })
                          }
                          className="w-full bg-white dark:bg-[#16212e] border border-slate-200/90 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white"
                        >
                          <option value="-">- ไม่ระบุ / ไม่มี -</option>
                          {ACTIVE_CLASSES.map((cls) => (
                            <option key={cls} value={cls}>
                              {cls}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">เวรประจำวัน</label>
                        <select
                          value={selectedStaff.dutyDay || '-'}
                          onChange={(e) =>
                            setSelectedStaff({ ...selectedStaff, dutyDay: e.target.value })
                          }
                          className="w-full bg-white dark:bg-[#16212e] border border-slate-200/90 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white"
                        >
                          <option value="-">- ไม่ระบุ -</option>
                          <option value="จันทร์">วันจันทร์</option>
                          <option value="อังคาร">วันอังคาร</option>
                          <option value="พุธ">วันพุธ</option>
                          <option value="พฤหัสบดี">วันพฤหัสบดี</option>
                          <option value="ศุกร์">วันศุกร์</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">วันที่บรรจุเข้ารับราชการ</label>
                        <ThaiDatePicker
                          value={selectedStaff.startDate || ''}
                          onChange={(dateStr) =>
                            setSelectedStaff({ ...selectedStaff, startDate: dateStr })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* Contact & Access Card */}
                  <div className="bg-slate-50 dark:bg-[#101822] p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 space-y-3">
                    <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <Lock className="w-4 h-4 shrink-0" />
                      <span>สิทธิ์การใช้งานระบบ และการติดต่อ</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-slate-400 mb-1">ระดับสิทธิ์</label>
                        <select
                          value={selectedStaff.accessLevel || 'User'}
                          onChange={(e) =>
                            setSelectedStaff({ ...selectedStaff, accessLevel: e.target.value })
                          }
                          className="w-full bg-white dark:bg-[#16212e] border border-slate-200/90 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white font-semibold"
                        >
                          <option value="Superuser">Superuser (สูงสุด)</option>
                          <option value="Admin">Admin (ฝ่ายบริหาร/งานบุคคล)</option>
                          <option value="User">User (ครูและบุคลากรทั่วไป)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">เบอร์โทรศัพท์</label>
                        <input
                          type="text"
                          value={selectedStaff.phone || ''}
                          placeholder="เช่น 081-xxx-xxxx"
                          onChange={(e) =>
                            setSelectedStaff({ ...selectedStaff, phone: e.target.value })
                          }
                          className="w-full bg-white dark:bg-[#16212e] border border-slate-200/90 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">อีเมลติดต่อ</label>
                        <input
                          type="email"
                          value={selectedStaff.email || ''}
                          placeholder="name@school.ac.th"
                          onChange={(e) =>
                            setSelectedStaff({ ...selectedStaff, email: e.target.value })
                          }
                          className="w-full bg-white dark:bg-[#16212e] border border-slate-200/90 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-800">
                      <div>
                        <label className="block text-slate-400 mb-1">ลาป่วยที่ใช้ (วัน)</label>
                        <input
                          type="number"
                          value={selectedStaff.sickUsed}
                          onChange={(e) =>
                            setSelectedStaff({
                              ...selectedStaff,
                              sickUsed: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-full bg-white dark:bg-[#16212e] border border-slate-200/90 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">ลากิจที่ใช้ (วัน)</label>
                        <input
                          type="number"
                          value={selectedStaff.personalUsed}
                          onChange={(e) =>
                            setSelectedStaff({
                              ...selectedStaff,
                              personalUsed: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-full bg-white dark:bg-[#16212e] border border-slate-200/90 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">พักผ่อนที่ใช้ (วัน)</label>
                        <input
                          type="number"
                          value={selectedStaff.vacationUsed}
                          onChange={(e) =>
                            setSelectedStaff({
                              ...selectedStaff,
                              vacationUsed: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-full bg-white dark:bg-[#16212e] border border-slate-200/90 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: ใบอนุญาตประกอบวิชาชีพ & วุฒิลูกเสือ */}
              {staffModalTab === 'licenses' && (
                <div className="space-y-4">
                  {/* Khurusapha Licenses Section */}
                  <div className="bg-slate-50 dark:bg-[#101822] p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                        <Award className="w-4 h-4 shrink-0" />
                        <span>ทะเบียนใบอนุญาตประกอบวิชาชีพ (คุรุสภา)</span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        มีทั้งหมด {(selectedStaff.licenses || []).length} ฉบับ
                      </span>
                    </div>

                    {/* Current Licenses List */}
                    <div className="space-y-2">
                      {(!selectedStaff.licenses || selectedStaff.licenses.length === 0) ? (
                        <div className="p-3 rounded-lg bg-slate-100 dark:bg-[#16212e] text-slate-500 dark:text-slate-400 text-center">
                          ยังไม่มีข้อมูลใบอนุญาตประกอบวิชาชีพ
                        </div>
                      ) : (
                        selectedStaff.licenses.map((lic, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-lg bg-white dark:bg-[#16212e] border border-slate-200/90 dark:border-slate-700 flex items-center justify-between gap-3"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 dark:text-white text-xs">{lic.type}</span>
                                <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                                  {lic.category}
                                </span>
                              </div>
                              <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-3">
                                <span>เลขที่: <b className="text-sky-600 dark:text-sky-300">{lic.number}</b></span>
                                <span>ออกให้: {lic.issueDate}</span>
                                <span>หมดอายุ: <b className="text-amber-600 dark:text-amber-300">{lic.expiryDate}</b></span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteLicenseFromStaff(idx)}
                              className="p-1.5 rounded-md text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors duration-200"
                              title="ลบใบอนุญาตฉบับนี้"
                            >
                              <Trash2 className="w-4 h-4 shrink-0" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Add New License Form */}
                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#141d28] border border-dashed border-slate-300 dark:border-slate-700 space-y-3">
                      <div className="font-semibold text-slate-700 dark:text-slate-200 text-[11px] flex items-center gap-1">
                        <Plus className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                        <span>เพิ่มใบอนุญาตประกอบวิชาชีพใหม่</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-slate-700 dark:text-slate-400 font-semibold mb-1">ประเภทใบอนุญาต</label>
                          <select
                            value={newLicType}
                            onChange={(e) => {
                              setNewLicType(e.target.value);
                              const match = LICENSE_TYPES.find((lt) => lt.type === e.target.value);
                              if (match) setNewLicCategory(match.category);
                            }}
                            className="w-full bg-white dark:bg-[#101822] border border-slate-200/90 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white"
                          >
                            {LICENSE_TYPES.map((lt) => (
                              <option key={lt.type} value={lt.type}>
                                {lt.type}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-slate-700 dark:text-slate-400 font-semibold mb-1">เลขที่ใบอนุญาต</label>
                          <input
                            type="text"
                            value={newLicNumber}
                            placeholder="เช่น 6520112000000"
                            onChange={(e) => setNewLicNumber(e.target.value)}
                            className="w-full bg-white dark:bg-[#101822] border border-slate-200/90 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white font-mono"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-slate-700 dark:text-slate-400 font-semibold mb-1">วันที่ออกเอกสาร</label>
                          <ThaiDatePicker
                            value={newLicIssue}
                            onChange={(dateStr) => setNewLicIssue(dateStr)}
                          />
                        </div>
                        <div>
                          <label className="block text-slate-700 dark:text-slate-400 font-semibold mb-1">วันหมดอายุ</label>
                          <ThaiDatePicker
                            value={newLicExpiry}
                            onChange={(dateStr) => setNewLicExpiry(dateStr)}
                          />
                        </div>
                      </div>
                      <div className="text-right">
                        <button
                          type="button"
                          onClick={handleAddLicenseToStaff}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-600/90 hover:bg-emerald-500 text-white font-medium text-xs border border-transparent transition-colors duration-200"
                        >
                          <Plus className="w-3.5 h-3.5 shrink-0" />
                          <span>เพิ่มใบอนุญาตลงทะเบียน</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Scout Qualifications Section */}
                  <div className="bg-slate-50 dark:bg-[#101822] p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 space-y-3">
                    <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5 border-b border-slate-800 pb-2">
                      <Compass className="w-4 h-4 shrink-0" />
                      <span>วุฒิทางลูกเสือ (Scout Qualifications)</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-400 mb-1">วุฒิทางลูกเสือสูงสุด</label>
                        <select
                          value={selectedStaff.highestScout || 'ไม่มีวุฒิลูกเสือ'}
                          onChange={(e) =>
                            setSelectedStaff({ ...selectedStaff, highestScout: e.target.value })
                          }
                          className="w-full bg-white dark:bg-[#16212e] border border-slate-200/90 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white font-semibold"
                        >
                          {SCOUT_QUALIFICATIONS.map((scout) => (
                            <option key={scout} value={scout}>
                              {scout}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">เลขที่วุฒิบัตรลูกเสือ</label>
                        <input
                          type="text"
                          value={selectedStaff.scoutCertNo || ''}
                          placeholder="เช่น สพฐ. 142/2565 หรือ -"
                          onChange={(e) =>
                            setSelectedStaff({ ...selectedStaff, scoutCertNo: e.target.value })
                          }
                          className="w-full bg-white dark:bg-[#16212e] border border-slate-200/90 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: ภาระงานสอน & TA */}
              {staffModalTab === 'workload' && (
                <div className="space-y-4">
                  <div className="bg-slate-50 dark:bg-[#101822] p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 space-y-4">
                    <div className="text-xs font-bold text-sky-600 dark:text-sky-400 flex items-center gap-1.5 border-b border-slate-200/80 dark:border-slate-800 pb-2">
                      <Briefcase className="w-4 h-4 shrink-0" />
                      <span>กำหนดภาระงานสอนและผู้ช่วยสอน (ก.ค.ศ. ว9/2564 & ว21/2564)</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl bg-white dark:bg-[#16212e] border border-slate-200/90 dark:border-slate-700 space-y-2">
                        <label className="block font-semibold text-sky-700 dark:text-sky-300">
                          ภาระงานสอนตามตาราง (ชั่วโมง/สัปดาห์)
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={50}
                          value={selectedStaff.teachingHours ?? 18}
                          onChange={(e) =>
                            setSelectedStaff({
                              ...selectedStaff,
                              teachingHours: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-full bg-slate-50 dark:bg-[#101822] border border-slate-200/90 dark:border-slate-700 rounded-lg p-3 text-slate-900 dark:text-white text-lg font-mono font-bold focus:outline-none focus:border-sky-500"
                        />
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                          ตามเกณฑ์ ก.ค.ศ. ต้องมีชั่วโมงสอนตามตารางไม่น้อยกว่า 12 ชั่วโมง/สัปดาห์
                        </span>
                      </div>

                      <div className="p-4 rounded-xl bg-white dark:bg-[#16212e] border border-slate-200/90 dark:border-slate-700 space-y-2">
                        <label className="block font-semibold text-amber-700 dark:text-amber-300">
                          ชั่วโมงผู้ช่วยสอน TA (ชั่วโมง/สัปดาห์)
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={30}
                          value={selectedStaff.taHours ?? 0}
                          onChange={(e) =>
                            setSelectedStaff({
                              ...selectedStaff,
                              taHours: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-full bg-slate-50 dark:bg-[#101822] border border-slate-200/90 dark:border-slate-700 rounded-lg p-3 text-slate-900 dark:text-white text-lg font-mono font-bold focus:outline-none focus:border-amber-500"
                        />
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                          ชั่วโมงสนับสนุนการจัดการเรียนรู้ / ผู้ช่วยสอนในห้องเรียน
                        </span>
                      </div>
                    </div>

                    {/* Live Evaluation Card */}
                    {(() => {
                      const total = (selectedStaff.teachingHours ?? 0) + (selectedStaff.taHours ?? 0);
                      const isTeacher = selectedStaff.position.includes('ครู');
                      const passCriteria = isTeacher
                        ? total >= 20 && (selectedStaff.teachingHours ?? 0) >= 12
                        : total >= 15;

                      return (
                        <div
                          className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${
                            passCriteria
                              ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                              : 'bg-amber-950/20 border-amber-500/30 text-amber-300'
                          }`}
                        >
                          <div>
                            <div className="font-bold text-sm flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 shrink-0" />
                              <span>
                                รวมภาระงานปฏิบัติการสอน: {total} ชั่วโมง/สัปดาห์
                              </span>
                            </div>
                            <div className="text-[11px] opacity-80 mt-1">
                              {passCriteria
                                ? 'ผ่านเกณฑ์ภาระงานขั้นต่ำตามมาตรฐานวิชาชีพ ก.ค.ศ. พร้อมประเมิน PA'
                                : 'ภาระงานสอนต่ำกว่าเกณฑ์ขั้นต่ำ 20 ชม./สัปดาห์ โปรดตรวจสอบการจัดชั่วโมงสอน'}
                            </div>
                          </div>
                          <span
                            className={`px-3 py-1 rounded-xl text-xs font-bold shrink-0 border ${
                              passCriteria
                                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-200'
                                : 'bg-amber-500/20 border-amber-500/40 text-amber-200'
                            }`}
                          >
                            {passCriteria ? 'ผ่านเกณฑ์ PA' : 'ต้องปรับปรุง'}
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* TAB 4: วิทยฐานะ & วุฒิการศึกษา */}
              {staffModalTab === 'history' && (
                <div className="space-y-4">
                  {/* Standings Section */}
                  <div className="bg-slate-50 dark:bg-[#101822] p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                        <Award className="w-4 h-4 shrink-0" />
                        <span>ประวัติการบรรจุ การดำรงตำแหน่ง และวิทยฐานะ</span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {(selectedStaff.standings || []).length} รายการ
                      </span>
                    </div>

                    <div className="space-y-2">
                      {(!selectedStaff.standings || selectedStaff.standings.length === 0) ? (
                        <div className="p-3 rounded-lg bg-slate-100 dark:bg-[#16212e] text-slate-500 dark:text-slate-400 text-center">
                          ยังไม่มีข้อมูลประวัติวิทยฐานะ
                        </div>
                      ) : (
                        selectedStaff.standings.map((std, idx) => (
                          <div
                            key={idx}
                            className={`p-3 rounded-lg bg-white dark:bg-[#16212e] border transition-colors flex items-center justify-between gap-3 ${
                              editingStandingIndex === idx
                                ? 'border-sky-500 ring-1 ring-sky-500/30 bg-sky-50/50 dark:bg-sky-950/20'
                                : 'border-slate-200/90 dark:border-slate-700'
                            }`}
                          >
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white text-xs">{std.level}</div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                                วันที่มีผล: {std.effectiveDate} | คำสั่ง: {std.orderNumber}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleEditStanding(idx)}
                                className="p-1.5 rounded-md text-slate-400 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-200"
                                title="แก้ไขรายการนี้"
                              >
                                <Pencil className="w-3.5 h-3.5 shrink-0" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteStandingFromStaff(idx)}
                                className="p-1.5 rounded-md text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors duration-200"
                                title="ลบรายการนี้"
                              >
                                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#141d28] border border-dashed border-slate-300 dark:border-slate-700 space-y-3">
                      <div className="font-semibold text-slate-700 dark:text-slate-200 text-[11px] flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          {editingStandingIndex !== null ? (
                            <>
                              <Pencil className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
                              <span>แก้ไขประวัติการดำรงตำแหน่ง/วิทยฐานะ (รายการที่ {editingStandingIndex + 1})</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
                              <span>เพิ่มประวัติการดำรงตำแหน่ง/วิทยฐานะ</span>
                            </>
                          )}
                        </div>
                        {editingStandingIndex !== null && (
                          <button
                            type="button"
                            onClick={handleCancelEditStanding}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-[10px] underline"
                          >
                            ยกเลิกการแก้ไข
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className="sm:col-span-1">
                          <label className="block text-slate-700 dark:text-slate-400 font-semibold mb-1">ตำแหน่ง/วิทยฐานะ</label>
                          <input
                            type="text"
                            value={newStdLevel}
                            onChange={(e) => setNewStdLevel(e.target.value)}
                            className="w-full bg-white dark:bg-[#101822] border border-slate-200/90 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-700 dark:text-slate-400 font-semibold mb-1">วันที่มีผล</label>
                          <ThaiDatePicker
                            value={newStdDate}
                            onChange={(dateStr) => setNewStdDate(dateStr)}
                          />
                        </div>
                        <div>
                          <label className="block text-slate-700 dark:text-slate-400 font-semibold mb-1">เลขที่คำสั่ง</label>
                          <input
                            type="text"
                            value={newStdOrder}
                            placeholder="เช่น ศธ 04123/2565"
                            onChange={(e) => setNewStdOrder(e.target.value)}
                            className="w-full bg-white dark:bg-[#101822] border border-slate-200/90 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white"
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        {editingStandingIndex !== null && (
                          <button
                            type="button"
                            onClick={handleCancelEditStanding}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-xs transition-colors duration-200"
                          >
                            <X className="w-3.5 h-3.5 shrink-0" />
                            <span>ยกเลิก</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleSaveStanding}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs border border-transparent transition-colors duration-200"
                        >
                          {editingStandingIndex !== null ? (
                            <>
                              <Check className="w-3.5 h-3.5 shrink-0" />
                              <span>บันทึกการแก้ไข</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5 shrink-0" />
                              <span>เพิ่มรายการวิทยฐานะ</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Education History Section */}
                  <div className="bg-slate-50 dark:bg-[#101822] p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                        <GraduationCap className="w-4 h-4 shrink-0" />
                        <span>วุฒิการศึกษา (Degrees & Majors)</span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {(selectedStaff.educations || []).length} รายการ
                      </span>
                    </div>

                    <div className="space-y-2">
                      {(!selectedStaff.educations || selectedStaff.educations.length === 0) ? (
                        <div className="p-3 rounded-lg bg-slate-100 dark:bg-[#16212e] text-slate-500 dark:text-slate-400 text-center">
                          ยังไม่มีข้อมูลวุฒิการศึกษา
                        </div>
                      ) : (
                        selectedStaff.educations.map((edu, idx) => (
                          <div
                            key={idx}
                            className={`p-3 rounded-lg bg-white dark:bg-[#16212e] border transition-colors flex items-center justify-between gap-3 ${
                              editingEducationIndex === idx
                                ? 'border-amber-500 ring-1 ring-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20'
                                : 'border-slate-200/90 dark:border-slate-700'
                            }`}
                          >
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white text-xs">
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
                                className="p-1.5 rounded-md text-slate-400 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-200"
                                title="แก้ไขวุฒินี้"
                              >
                                <Pencil className="w-3.5 h-3.5 shrink-0" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteEducationFromStaff(idx)}
                                className="p-1.5 rounded-md text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors duration-200"
                                title="ลบวุฒินี้"
                              >
                                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#141d28] border border-dashed border-slate-300 dark:border-slate-700 space-y-3">
                      <div className="font-semibold text-slate-700 dark:text-slate-200 text-[11px] flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          {editingEducationIndex !== null ? (
                            <>
                              <Pencil className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                              <span>แก้ไขวุฒิการศึกษา (รายการที่ {editingEducationIndex + 1})</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                              <span>เพิ่มวุฒิการศึกษา</span>
                            </>
                          )}
                        </div>
                        {editingEducationIndex !== null && (
                          <button
                            type="button"
                            onClick={handleCancelEditEducation}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-[10px] underline"
                          >
                            ยกเลิกการแก้ไข
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                        <div>
                          <label className="block text-slate-700 dark:text-slate-400 font-semibold mb-1">วุฒิ (อักษรย่อ)</label>
                          <input
                            type="text"
                            value={newEduDegree}
                            placeholder="เช่น ค.บ., ศศ.บ."
                            onChange={(e) => setNewEduDegree(e.target.value)}
                            className="w-full bg-white dark:bg-[#101822] border border-slate-200/90 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-700 dark:text-slate-400 font-semibold mb-1">สาขาวิชาเอก</label>
                          <input
                            type="text"
                            value={newEduMajor}
                            placeholder="เช่น ภาษาไทย, คณิตศาสตร์"
                            onChange={(e) => setNewEduMajor(e.target.value)}
                            className="w-full bg-white dark:bg-[#101822] border border-slate-200/90 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-700 dark:text-slate-400 font-semibold mb-1">สถาบันการศึกษา</label>
                          <input
                            type="text"
                            value={newEduInst}
                            placeholder="ชื่อมหาวิทยาลัย"
                            onChange={(e) => setNewEduInst(e.target.value)}
                            className="w-full bg-white dark:bg-[#101822] border border-slate-200/90 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-700 dark:text-slate-400 font-semibold mb-1">ปี พ.ศ. ที่จบ</label>
                          <input
                            type="text"
                            value={newEduYear}
                            placeholder="เช่น 2565"
                            onChange={(e) => setNewEduYear(e.target.value)}
                            className="w-full bg-white dark:bg-[#101822] border border-slate-200/90 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white font-mono"
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        {editingEducationIndex !== null && (
                          <button
                            type="button"
                            onClick={handleCancelEditEducation}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-xs transition-colors duration-200"
                          >
                            <X className="w-3.5 h-3.5 shrink-0" />
                            <span>ยกเลิก</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleSaveEducation}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs border border-transparent transition-colors duration-200"
                        >
                          {editingEducationIndex !== null ? (
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
            </div>

            {/* Modal Actions Footer */}
            <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-800 shrink-0">
              {!isNewStaff ? (
                <button
                  type="button"
                  onClick={() => handleDeleteStaff(selectedStaff.id)}
                  className="px-4 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-medium text-xs inline-flex items-center gap-2 transition-colors duration-200"
                >
                  <Trash2 className="w-4 h-4 shrink-0" />
                  <span>ลบข้อมูลบุคลากรนี้</span>
                </button>
              ) : (
                <div />
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsStaffModalOpen(false)}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 border border-slate-200/90 dark:bg-[#121822] dark:hover:bg-slate-800/70 dark:text-slate-300 dark:hover:text-white dark:border-slate-800/80 text-xs font-medium transition-colors duration-200 disabled:opacity-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleSaveStaff}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium border border-transparent inline-flex items-center gap-2 transition-colors duration-200 disabled:opacity-50"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 shrink-0" />
                  )}
                  <span>{isSaving ? 'กำลังบันทึกลงฐานข้อมูล...' : isNewStaff ? 'บันทึกเพิ่มบุคลากรใหม่' : 'บันทึกการเปลี่ยนแปลง'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                        className="w-full bg-white dark:bg-[#101822] border border-slate-200/90 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-sky-500"
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
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                        ใช้นับระยะเวลาปฏิบัติหน้าที่
                      </div>
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
                        className="w-full bg-white dark:bg-[#101822] border border-slate-200/90 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-sky-500"
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
      {/* User Preferences Modal */}
      <UserSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
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
