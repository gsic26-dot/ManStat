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

import React, { useState } from 'react';
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
} from 'lucide-react';
import {
  INITIAL_TEACHERS,
  INITIAL_BOARD_MEMBERS,
  INITIAL_SCHOOL_INFO,
  ACTIVE_CLASSES,
  TeacherRecord,
  BoardMemberRecord,
  BOARD_STATUTORY_ORDER,
} from '@/lib/data/schoolData';
import { ExcelExportButton } from '@/components/export/ExcelExportButton';

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
  'ผู้อำนวยการสถานศึกษา',
  'รองผู้อำนวยการสถานศึกษา',
  'ครูเชี่ยวชาญพิเศษ',
  'ครูเชี่ยวชาญ',
  'ครูชำนาญการพิเศษ',
  'ครูชำนาญการ',
  'ครู',
  'ครูผู้ช่วย',
  'ศึกษานิเทศก์',
  'พนักงานราชการ',
  'ครูอัตราจ้าง',
  'ลูกจ้างประจำ',
  'เจ้าหน้าที่ธุรการ',
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

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<
    'staff' | 'board' | 'school' | 'fiscal' | 'audit'
  >('staff');

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

  const [newEduDegree, setNewEduDegree] = useState('ค.บ.');
  const [newEduMajor, setNewEduMajor] = useState('');
  const [newEduInst, setNewEduInst] = useState('');
  const [newEduYear, setNewEduYear] = useState('2565');

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
  const [holidays, setHolidays] = useState([
    { id: 'h1', date: '2026-10-23', name: 'วันปิยมหาราช', type: 'วันหยุดราชการประจำปี' },
    { id: 'h2', date: '2026-12-05', name: 'วันคล้ายวันพระบรมราชสมภพ ร.9 / วันพ่อแห่งชาติ', type: 'วันหยุดราชการประจำปี' },
    { id: 'h3', date: '2026-12-10', name: 'วันรัฐธรรมนูญ', type: 'วันหยุดราชการประจำปี' },
    { id: 'h4', date: '2026-12-31', name: 'วันสิ้นปี', type: 'วันหยุดราชการประจำปี' },
    { id: 'h5', date: '2027-01-01', name: 'วันขึ้นปีใหม่', type: 'วันหยุดราชการประจำปี' },
    { id: 'h6', date: '2027-01-16', name: 'วันครูแห่งชาติ (วันหยุดสถานศึกษา)', type: 'วันหยุดเฉพาะสถานศึกษา' },
  ]);
  const [newHolidayName, setNewHolidayName] = useState('');
  const [newHolidayDate, setNewHolidayDate] = useState('');

  // Sample Immutable Audit Logs
  const sampleAuditLogs = [
    {
      id: 'log-001',
      action: 'REVEAL_CITIZEN_ID',
      actorName: 'Superuser (นายธีรศักดิ์ มโนธรรม)',
      actorRole: 'superuser',
      targetName: 'นางสาวกุสุมาลย์กมล พราหมณ์ตะขบ',
      ipAddress: '192.168.1.45',
      timestamp: '2026-11-16T10:45:12Z',
      details: 'ตรวจสอบเพื่อประกอบการจัดทำทะเบียนประวัติ ก.พ.7',
    },
    {
      id: 'log-002',
      action: 'APPROVE_LEAVE',
      actorName: 'Superuser (นายธีรศักดิ์ มโนธรรม)',
      actorRole: 'superuser',
      targetName: 'นายธวัชชัย เหลืองโอฬาร',
      ipAddress: '192.168.1.45',
      timestamp: '2026-11-16T10:00:00Z',
      details: 'อนุมัติคำขอลาป่วย 2 วันทำการ',
    },
    {
      id: 'log-003',
      action: 'UPDATE_SETTINGS',
      actorName: 'นายธวัชชัย เหลืองโอฬาร',
      actorRole: 'hr_admin',
      targetName: 'ระบบส่วนกลาง',
      ipAddress: '192.168.1.50',
      timestamp: '2026-11-15T14:20:00Z',
      details: 'ปรับปรุงปฏิทินวันหยุดราชการประจำปีงบประมาณ 2570',
    },
    {
      id: 'log-004',
      action: 'UPDATE_STAFF_RECORD',
      actorName: 'Superuser (นายธีรศักดิ์ มโนธรรม)',
      actorRole: 'superuser',
      targetName: 'นางสาวทัชชกร ช่วยจังหรีด',
      ipAddress: '192.168.1.45',
      timestamp: '2026-11-14T09:12:00Z',
      details: 'บันทึกใบอนุญาตประกอบวิชาชีพ B-License ฉบับใหม่',
    },
  ];

  const handleSaveSchoolInfo = (e: React.FormEvent) => {
    e.preventDefault();
    alert('บันทึกข้อมูลสถานศึกษาเรียบร้อยแล้ว');
  };

  const handleAddHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHolidayName || !newHolidayDate) return;
    setHolidays((prev) => [
      ...prev,
      {
        id: `h-${Date.now()}`,
        date: newHolidayDate,
        name: newHolidayName,
        type: 'วันหยุดพิเศษ / ตามมติ ครม.',
      },
    ]);
    setNewHolidayName('');
    setNewHolidayDate('');
  };

  const handleDeleteHoliday = (id: string) => {
    if (confirm('คุณต้องการลบวันหยุดนี้ใช่หรือไม่?')) {
      setHolidays((prev) => prev.filter((h) => h.id !== id));
    }
  };

  // Staff Handlers
  const handleOpenAddStaff = () => {
    setIsNewStaff(true);
    const nextCode = `TCH-${String(teachers.length + 1).padStart(3, '0')}`;
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

  const handleSaveStaff = () => {
    if (!selectedStaff) return;
    const computedName =
      selectedStaff.name.trim() ||
      `${selectedStaff.prefix || ''}${selectedStaff.firstName || ''} ${selectedStaff.lastName || ''}`.trim();
    if (!computedName) {
      alert('กรุณาระบุชื่อ-นามสกุลบุคลากร');
      return;
    }

    const updatedStaff: TeacherRecord = {
      ...selectedStaff,
      name: computedName,
      maskedCitizenId: selectedStaff.idCard
        ? `${selectedStaff.idCard.slice(0, 1)}-${selectedStaff.idCard.slice(1, 5)}-*****-**-${selectedStaff.idCard.slice(-1)}`
        : selectedStaff.maskedCitizenId,
    };

    if (isNewStaff) {
      setTeachers((prev) => [updatedStaff, ...prev]);
    } else {
      setTeachers((prev) =>
        prev.map((t) => (t.id === updatedStaff.id ? updatedStaff : t))
      );
    }
    setIsStaffModalOpen(false);
  };

  const handleDeleteStaff = (staffId: string) => {
    const target = teachers.find((t) => t.id === staffId);
    if (!target) return;
    if (confirm(`คุณต้องการลบข้อมูลบุคลากร "${target.name}" ใช่หรือไม่?`)) {
      setTeachers((prev) => prev.filter((t) => t.id !== staffId));
      if (selectedStaff?.id === staffId) {
        setIsStaffModalOpen(false);
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

  const handleAddStandingToStaff = () => {
    if (!selectedStaff || !newStdLevel) return;
    const item = {
      level: newStdLevel,
      effectiveDate: newStdDate || new Date().toISOString().split('T')[0],
      orderNumber: newStdOrder || '-',
    };
    setSelectedStaff({
      ...selectedStaff,
      standings: [...(selectedStaff.standings || []), item],
    });
    setNewStdDate('');
    setNewStdOrder('');
  };

  const handleDeleteStandingFromStaff = (index: number) => {
    if (!selectedStaff) return;
    setSelectedStaff({
      ...selectedStaff,
      standings: selectedStaff.standings.filter((_, idx) => idx !== index),
    });
  };

  const handleAddEducationToStaff = () => {
    if (!selectedStaff || !newEduMajor.trim()) {
      alert('กรุณาระบุวิชาเอก/สาขา');
      return;
    }
    const item = {
      degree: newEduDegree,
      major: newEduMajor.trim(),
      institute: newEduInst.trim() || 'มหาวิทยาลัยราชภัฏนครราชสีมา',
      gradYear: newEduYear || '2565',
    };
    setSelectedStaff({
      ...selectedStaff,
      educations: [...(selectedStaff.educations || []), item],
    });
    setNewEduMajor('');
    setNewEduInst('');
  };

  const handleDeleteEducationFromStaff = (index: number) => {
    if (!selectedStaff) return;
    setSelectedStaff({
      ...selectedStaff,
      educations: selectedStaff.educations.filter((_, idx) => idx !== index),
    });
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

  const handleSaveBoardMember = () => {
    if (!selectedBoardMember || !selectedBoardMember.fullName.trim()) {
      alert('กรุณากรอกชื่อ-นามสกุลกรรมการสถานศึกษา');
      return;
    }
    if (isNewBoardMember) {
      setBoardMembers((prev) => [...prev, selectedBoardMember]);
    } else {
      setBoardMembers((prev) =>
        prev.map((b) => (b.id === selectedBoardMember.id ? selectedBoardMember : b))
      );
    }
    setIsBoardModalOpen(false);
  };

  const handleDeleteBoardMember = (id: string) => {
    const target = boardMembers.find((b) => b.id === id);
    if (!target) return;
    if (confirm(`คุณต้องการลบกรรมการสถานศึกษา "${target.fullName}" ใช่หรือไม่?`)) {
      setBoardMembers((prev) => prev.filter((b) => b.id !== id));
      if (selectedBoardMember?.id === id) {
        setIsBoardModalOpen(false);
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
    <div className="min-h-screen bg-[#0e141b] text-slate-100 flex flex-col selection:bg-sky-500 selection:text-white">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-[#171a21]/95 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#121822] hover:bg-slate-800/70 text-slate-300 hover:text-white border border-slate-800/80 text-xs font-medium transition-colors duration-200"
            >
              <ArrowLeft className="w-4 h-4 shrink-0" />
              <span>กลับสู่หน้าหลัก</span>
            </Link>
            <div className="flex items-center gap-2 border-l border-slate-700 pl-3">
              <span className="font-bold text-base text-white">ศูนย์ผู้ดูแลระบบ (Admin Center)</span>
              <span className="px-2 py-0.5 text-[10px] uppercase font-mono font-bold rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Superuser / HR Admin
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ExcelExportButton fiscalYear={fiscalYearBE} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Navigation Tabs Bar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('staff')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors duration-200 ${
              activeTab === 'staff'
                ? 'bg-sky-600 text-white border border-transparent'
                : 'bg-[#121822] text-slate-300 hover:bg-slate-800/70 hover:text-white border border-slate-800/80'
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            <span>จัดการบุคลากร ({teachers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('board')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors duration-200 ${
              activeTab === 'board'
                ? 'bg-sky-600 text-white border border-transparent'
                : 'bg-[#121822] text-slate-300 hover:bg-slate-800/70 hover:text-white border border-slate-800/80'
            }`}
          >
            <Award className="w-4 h-4 shrink-0" />
            <span>คณะกรรมการสถานศึกษา ({boardMembers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('school')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors duration-200 ${
              activeTab === 'school'
                ? 'bg-sky-600 text-white border border-transparent'
                : 'bg-[#121822] text-slate-300 hover:bg-slate-800/70 hover:text-white border border-slate-800/80'
            }`}
          >
            <Building className="w-4 h-4 shrink-0" />
            <span>ข้อมูลสถานศึกษา</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('fiscal')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors duration-200 ${
              activeTab === 'fiscal'
                ? 'bg-sky-600 text-white border border-transparent'
                : 'bg-[#121822] text-slate-300 hover:bg-slate-800/70 hover:text-white border border-slate-800/80'
            }`}
          >
            <Calendar className="w-4 h-4 shrink-0" />
            <span>ปีงบประมาณและวันหยุด ({holidays.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors duration-200 ${
              activeTab === 'audit'
                ? 'bg-sky-600 text-white border border-transparent'
                : 'bg-[#121822] text-slate-300 hover:bg-slate-800/70 hover:text-white border border-slate-800/80'
            }`}
          >
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>ตรวจสอบ PDPA Audit Logs</span>
          </button>
        </div>

        {/* =================================================================== */}
        {/* TAB 1: จัดการข้อมูลบุคลากร (Staff Directory Management) */}
        {/* =================================================================== */}
        {activeTab === 'staff' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#141b24] p-4 rounded-2xl border border-slate-800">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อครู, รหัสบุคลากร, หรือกลุ่มสาระ..."
                  value={staffSearch}
                  onChange={(e) => setStaffSearch(e.target.value)}
                  className="w-full bg-[#101822] border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
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

            <div className="bg-[#111822] rounded-2xl border border-slate-800 overflow-hidden shadow-sm">
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-[#16202c] text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
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
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {filteredTeachers.map((t) => {
                      const posDisplay = t.position.replace('ผู้อำนวยการสถานศึกษา', 'ผอ.สถานศึกษา');
                      const isExpanded = expandedStaffId === t.id;
                      return (
                        <React.Fragment key={t.id}>
                          <tr
                            onClick={() => setExpandedStaffId(isExpanded ? null : t.id)}
                            className={`hover:bg-[#162231]/50 transition-colors cursor-pointer ${
                              isExpanded ? 'bg-[#162231]/40' : ''
                            }`}
                          >
                            <td className="px-3 py-3 text-center">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedStaffId(isExpanded ? null : t.id);
                                }}
                                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
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
                              <div className="font-bold text-white truncate max-w-[180px]" title={t.name}>{t.name}</div>
                              <div className="text-[11px] font-mono text-sky-400 mt-0.5 truncate max-w-[180px]" title={`${t.employeeCode} ${t.positionNo ? `(ตำแหน่ง ${t.positionNo})` : ''}`}>
                                {t.employeeCode} {t.positionNo ? `(ตำแหน่ง ${t.positionNo})` : ''}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="truncate max-w-[180px]" title={t.position}>{posDisplay}</div>
                              <div className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[180px]" title={t.academicStanding !== '-' ? t.academicStanding : 'ไม่มีวิทยฐานะ'}>
                                {t.academicStanding !== '-' ? t.academicStanding : 'ไม่มีวิทยฐานะ'}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center whitespace-nowrap">
                              {t.employeeCode === 'EXE-001' ? (
                                <span className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  Superuser
                                </span>
                              ) : t.employeeCode === 'TCH-002' ? (
                                <span className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                                  HR Admin
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                                  Teacher
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditStaff(t)}
                                  className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors duration-200"
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
                            <tr className="bg-[#0b1016]/90 border-y border-slate-800/80">
                              <td colSpan={5} className="px-6 py-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                                  <div>
                                    <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider mb-1">
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
                                    <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider mb-1">
                                      ภาระงานสอนและ TA
                                    </div>
                                    <div className="text-slate-200 font-mono">
                                      <span className="text-sky-300 font-bold text-sm">{t.teachingHours ?? 18}</span>
                                      <span className="text-slate-500"> สอน + </span>
                                      <span className="text-amber-300 font-bold text-sm">{t.taHours ?? 0}</span>
                                      <span className="text-slate-400 text-xs"> TA ชม./สัปดาห์</span>
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider mb-1">
                                      วันลาสะสม (ป่วย / กิจ / พักผ่อน)
                                    </div>
                                    <div className="font-mono text-xs">
                                      <span className="text-rose-400 font-bold">{t.sickUsed}</span> วันป่วย /{' '}
                                      <span className="text-amber-400 font-bold">{t.personalUsed}</span> วันกิจ /{' '}
                                      <span className="text-emerald-400 font-bold">{t.vacationUsed}</span> วันพักผ่อน
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider mb-1">
                                      กลุ่มสาระ / ฝ่ายงาน
                                    </div>
                                    <div className="text-slate-200 font-medium">
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#141b24] p-4 rounded-2xl border border-slate-800">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อกรรมการ, ตำแหน่ง, หรือองค์กร..."
                  value={boardSearch}
                  onChange={(e) => setBoardSearch(e.target.value)}
                  className="w-full bg-[#101822] border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
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

            <div className="bg-[#111822] rounded-2xl border border-slate-800 overflow-hidden shadow-sm">
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left text-sm text-slate-200">
                  <thead className="bg-[#16202c] text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800 text-xs">
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
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {filteredBoard.map((b, idx) => {
                      const isDirector = b.position === 'DIRECTOR_SEC';
                      const isExpanded = expandedBoardId === b.id;
                      return (
                        <React.Fragment key={b.id}>
                          <tr
                            onClick={() => setExpandedBoardId(isExpanded ? null : b.id)}
                            className={`hover:bg-[#162231]/50 transition-colors cursor-pointer ${
                              isExpanded ? 'bg-[#162231]/40' : ''
                            }`}
                          >
                            <td className="px-3 py-3.5 text-center">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedBoardId(isExpanded ? null : b.id);
                                }}
                                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
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
                              <div className="font-bold text-white text-base truncate max-w-[200px]" title={b.fullName}>{b.fullName}</div>
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
                                  className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors duration-200"
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
                            <tr className="bg-[#0b1016]/90 border-y border-slate-800/80">
                              <td colSpan={5} className="px-6 py-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                                  <div>
                                    <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider mb-1">
                                      สังกัดองค์กร / หน่วยงาน
                                    </div>
                                    <div className="text-slate-200 font-medium leading-relaxed">
                                      {b.organization}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider mb-1">
                                      อาชีพ / บทบาท
                                    </div>
                                    <div className="text-slate-300 font-medium">
                                      {b.occupation || 'ไม่ได้ระบุ'}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider mb-1">
                                      วาระการดำรงตำแหน่ง
                                    </div>
                                    <div className="text-slate-200 font-medium">
                                      {isDirector ? (
                                        <span className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/40">
                                          โดยตำแหน่ง
                                        </span>
                                      ) : (
                                        <span>วาระที่ {b.termNumber} (วาระ 4 ปี)</span>
                                      )}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider mb-1">
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
          <div className="bg-[#111822] p-6 rounded-2xl border border-slate-800 max-w-4xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
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
                  <label className="block text-slate-300 font-semibold mb-1">ชื่อสถานศึกษา</label>
                  <input
                    type="text"
                    value={schoolInfo.schoolName}
                    onChange={(e) => setSchoolInfo({ ...schoolInfo, schoolName: e.target.value })}
                    className="w-full bg-[#16202c] border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">หน่วยงานต้นสังกัด</label>
                  <input
                    type="text"
                    value={schoolInfo.affiliation}
                    onChange={(e) => setSchoolInfo({ ...schoolInfo, affiliation: e.target.value })}
                    className="w-full bg-[#16202c] border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    ผู้อำนวยการสถานศึกษา
                  </label>
                  <input
                    type="text"
                    value={schoolInfo.directorName}
                    onChange={(e) => setSchoolInfo({ ...schoolInfo, directorName: e.target.value })}
                    className="w-full bg-[#16202c] border border-slate-700 rounded-xl p-2.5 text-white font-bold focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">ตำแหน่งทางการบริหาร</label>
                  <input
                    type="text"
                    value={schoolInfo.directorPosition}
                    onChange={(e) =>
                      setSchoolInfo({ ...schoolInfo, directorPosition: e.target.value })
                    }
                    className="w-full bg-[#16202c] border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    ผู้รักษาการแทนลำดับที่ 1
                  </label>
                  <input
                    type="text"
                    value={schoolInfo.actingDirector1}
                    onChange={(e) =>
                      setSchoolInfo({ ...schoolInfo, actingDirector1: e.target.value })
                    }
                    className="w-full bg-[#16202c] border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    ผู้รักษาการแทนลำดับที่ 2
                  </label>
                  <input
                    type="text"
                    value={schoolInfo.actingDirector2}
                    onChange={(e) =>
                      setSchoolInfo({ ...schoolInfo, actingDirector2: e.target.value })
                    }
                    className="w-full bg-[#16202c] border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    หมายเลขโทรศัพท์ติดต่อ
                  </label>
                  <input
                    type="text"
                    value={schoolInfo.contactPhone}
                    onChange={(e) =>
                      setSchoolInfo({ ...schoolInfo, contactPhone: e.target.value })
                    }
                    className="w-full bg-[#16202c] border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">อีเมลทางการ</label>
                  <input
                    type="email"
                    value={schoolInfo.email}
                    onChange={(e) => setSchoolInfo({ ...schoolInfo, email: e.target.value })}
                    className="w-full bg-[#16202c] border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">รหัสสถานศึกษา 10 หลัก</label>
                  <input
                    type="text"
                    value={schoolInfo.schoolCode10}
                    onChange={(e) => setSchoolInfo({ ...schoolInfo, schoolCode10: e.target.value })}
                    className="w-full bg-[#16202c] border border-slate-700 rounded-xl p-2.5 text-white font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">รหัสสถานศึกษา 8 หลัก (สพฐ.)</label>
                  <input
                    type="text"
                    value={schoolInfo.schoolCode8}
                    onChange={(e) => setSchoolInfo({ ...schoolInfo, schoolCode8: e.target.value })}
                    className="w-full bg-[#16202c] border border-slate-700 rounded-xl p-2.5 text-white font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">ปีการศึกษา</label>
                  <input
                    type="text"
                    value={schoolInfo.academicYear}
                    onChange={(e) => setSchoolInfo({ ...schoolInfo, academicYear: e.target.value })}
                    className="w-full bg-[#16202c] border border-slate-700 rounded-xl p-2.5 text-white font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">ภาคเรียนที่</label>
                  <input
                    type="text"
                    value={schoolInfo.currentTerm}
                    onChange={(e) => setSchoolInfo({ ...schoolInfo, currentTerm: e.target.value })}
                    className="w-full bg-[#16202c] border border-slate-700 rounded-xl p-2.5 text-white font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-slate-300 font-semibold mb-1">จำนวนนักเรียนรวม (คน)</label>
                  <input
                    type="number"
                    value={schoolInfo.studentCount}
                    onChange={(e) => setSchoolInfo({ ...schoolInfo, studentCount: Number(e.target.value) || 0 })}
                    className="w-full bg-[#16202c] border border-slate-700 rounded-xl p-2.5 text-white font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-slate-300 font-semibold mb-1">ที่ตั้งสถานศึกษา</label>
                  <input
                    type="text"
                    value={schoolInfo.address}
                    onChange={(e) => setSchoolInfo({ ...schoolInfo, address: e.target.value })}
                    className="w-full bg-[#16202c] border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Active Classes Management */}
              <div className="pt-4 border-t border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
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
              <div className="bg-[#111822] p-5 rounded-2xl border border-slate-800 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
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
                      className="w-full bg-[#16202c] border border-slate-700 rounded-xl p-2.5 text-white font-mono font-bold"
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-[#151e2b] border border-slate-800/80 space-y-2">
                    <div className="text-[11px] font-semibold text-sky-300">
                      รอบการประเมินที่ 1 (ก.ค.ศ. ว15/2561)
                    </div>
                    <div className="text-slate-300 font-mono text-[11px]">
                      1 ตุลาคม {fiscalYearBE - 1} - 31 มีนาคม {fiscalYearBE}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#151e2b] border border-slate-800/80 space-y-2">
                    <div className="text-[11px] font-semibold text-emerald-300">
                      รอบการประเมินที่ 2 (ก.ค.ศ. ว15/2561)
                    </div>
                    <div className="text-slate-300 font-mono text-[11px]">
                      1 เมษายน {fiscalYearBE} - 30 กันยายน {fiscalYearBE}
                    </div>
                  </div>
                </div>
              </div>

              {/* Add Holiday Box */}
              <form
                onSubmit={handleAddHoliday}
                className="bg-[#111822] p-5 rounded-2xl border border-slate-800 space-y-3 text-xs"
              >
                <h4 className="font-bold text-white flex items-center gap-2">
                  <PlusCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>เพิ่มวันหยุดราชการ</span>
                </h4>

                <div>
                  <label className="block text-slate-400 mb-1">ชื่อวันหยุด</label>
                  <input
                    type="text"
                    placeholder="เช่น วันหยุดราชการเป็นกรณีพิเศษ..."
                    value={newHolidayName}
                    onChange={(e) => setNewHolidayName(e.target.value)}
                    required
                    className="w-full bg-[#16202c] border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">วันที่</label>
                  <input
                    type="date"
                    value={newHolidayDate}
                    onChange={(e) => setNewHolidayDate(e.target.value)}
                    required
                    className="w-full bg-[#16202c] border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500"
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
            <div className="lg:col-span-2 bg-[#111822] rounded-2xl border border-slate-800 overflow-hidden">
              <div className="p-4 bg-[#16202c] border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white">
                    ปฏิทินวันหยุดราชการประจำปีงบประมาณ {fiscalYearBE}
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    ระบบคำนวณวันลาจะนำวันหยุดเหล่านี้ไปหักลบออกจากวันลาจริงโดยอัตโนมัติ (Zero-GAS Engine)
                  </p>
                </div>
                <span className="font-mono text-xs text-amber-400 font-bold">
                  {holidays.length} วัน
                </span>
              </div>

              <div className="divide-y divide-slate-800/60 text-xs">
                {holidays.map((h) => (
                  <div
                    key={h.id}
                    className="p-3.5 flex items-center justify-between hover:bg-[#151f2c] transition-colors"
                  >
                    <div>
                      <div className="font-semibold text-white">{h.name}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{h.type}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-sky-400">
                        {new Date(h.date).toLocaleDateString('th-TH', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
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
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>บันทึกประวัติการเข้าถึงข้อมูลอ่อนไหว (PDPA Audit Logs)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  ระบบบันทึก Log แบบไม่สามารถแก้ไขได้ (Append-only) ทุกครั้งที่มีการเปิดเผยเลขประจำตัวประชาชน 13 หลัก
                </p>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                ทั้งหมด {sampleAuditLogs.length} รายการล่าสุด
              </span>
            </div>

            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-[#101822] text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
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
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {sampleAuditLogs.map((log) => {
                    const isExpanded = expandedLogId === log.id;
                    return (
                      <React.Fragment key={log.id}>
                        <tr
                          onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                          className={`hover:bg-[#1a2636]/50 transition-colors cursor-pointer ${
                            isExpanded ? 'bg-[#1a2636]/40' : ''
                          }`}
                        >
                          <td className="px-3 py-3 text-center">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedLogId(isExpanded ? null : log.id);
                              }}
                              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
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
                            <div className="truncate max-w-[180px]" title={log.targetName}>
                              {log.targetName}
                            </div>
                          </td>
                        </tr>

                        {/* Expanded Detail Panel */}
                        {isExpanded && (
                          <tr className="bg-[#0b1016]/90 border-y border-slate-800/80">
                            <td colSpan={5} className="px-6 py-4">
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                                <div className="sm:col-span-2">
                                  <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider mb-1">
                                    รายละเอียดกิจกรรม (Audit Details)
                                  </div>
                                  <div className="text-slate-200 font-medium leading-relaxed bg-[#141d27] p-3 rounded-xl border border-slate-800">
                                    {log.details}
                                  </div>
                                </div>
                                <div className="space-y-3">
                                  <div>
                                    <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider mb-1">
                                      IP Address &amp; การเชื่อมต่อ
                                    </div>
                                    <div className="font-mono text-slate-300 font-medium">
                                      {log.ipAddress}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider mb-1">
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
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Staff Master Modal (Feature-complete legacy GAS restoration) */}
      {isStaffModalOpen && selectedStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-[#141d27] border border-slate-700 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-4 text-xs my-8 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-sky-500/15 text-sky-400">
                  <UserCheck className="w-5 h-5 shrink-0" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">
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
                className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors duration-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sub-Tabs Navigation (Google Segmented Control style) */}
            <div className="flex items-center gap-1.5 p-1 bg-[#0d141d] rounded-lg border border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setStaffModalTab('profile')}
                className={`flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition-colors duration-200 inline-flex items-center justify-center gap-2 ${
                  staffModalTab === 'profile'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
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
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
                }`}
              >
                <Award className="w-3.5 h-3.5 shrink-0" />
                <span>ใบอนุญาต & วุฒิลูกเสือ</span>
                <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-900 text-slate-300 font-mono">
                  {(selectedStaff.licenses || []).length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setStaffModalTab('workload')}
                className={`flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition-colors duration-200 inline-flex items-center justify-center gap-2 ${
                  staffModalTab === 'workload'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
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
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
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
                  <div className="bg-[#101822] p-4 rounded-xl border border-slate-800 space-y-3">
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
                          className="w-full bg-[#16212e] border border-slate-700 rounded-lg p-2 text-white font-mono"
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
                          className="w-full bg-[#16212e] border border-slate-700 rounded-lg p-2 text-white font-mono"
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
                          className="w-full bg-[#16212e] border border-slate-700 rounded-lg p-2 text-white font-mono"
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
                          className="w-full bg-[#16212e] border border-slate-700 rounded-lg p-2 text-white font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Name and Official Placement */}
                  <div className="bg-[#101822] p-4 rounded-xl border border-slate-800 space-y-3">
                    <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                      <Briefcase className="w-4 h-4 shrink-0" />
                      <span>ข้อมูลชื่อ ตำแหน่ง และสังกัดฝ่ายงาน</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-slate-400 mb-1">คำนำหน้า</label>
                        <select
                          value={selectedStaff.prefix || 'นาย'}
                          onChange={(e) =>
                            setSelectedStaff({ ...selectedStaff, prefix: e.target.value })
                          }
                          className="w-full bg-[#16212e] border border-slate-700 rounded-lg p-2 text-white"
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
                          className="w-full bg-[#16212e] border border-slate-700 rounded-lg p-2 text-white"
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
                          className="w-full bg-[#16212e] border border-slate-700 rounded-lg p-2 text-white"
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
                          className="w-full bg-[#16212e] border border-slate-700 rounded-lg p-2 text-white"
                        >
                          {TEACHER_ROLES.map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">วิทยฐานะ</label>
                        <input
                          type="text"
                          value={selectedStaff.academicStanding}
                          placeholder="เช่น ครูชำนาญการพิเศษ หรือ -"
                          onChange={(e) =>
                            setSelectedStaff({ ...selectedStaff, academicStanding: e.target.value })
                          }
                          className="w-full bg-[#16212e] border border-slate-700 rounded-lg p-2 text-white"
                        />
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
                          className="w-full bg-[#16212e] border border-slate-700 rounded-lg p-2 text-white"
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
                          className="w-full bg-[#16212e] border border-slate-700 rounded-lg p-2 text-white"
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
                          className="w-full bg-[#16212e] border border-slate-700 rounded-lg p-2 text-white"
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
                          className="w-full bg-[#16212e] border border-slate-700 rounded-lg p-2 text-white"
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
                        <input
                          type="date"
                          value={selectedStaff.startDate || ''}
                          onChange={(e) =>
                            setSelectedStaff({ ...selectedStaff, startDate: e.target.value })
                          }
                          className="w-full bg-[#16212e] border border-slate-700 rounded-lg p-2 text-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Contact & Access Card */}
                  <div className="bg-[#101822] p-4 rounded-xl border border-slate-800 space-y-3">
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
                          className="w-full bg-[#16212e] border border-slate-700 rounded-lg p-2 text-white font-semibold"
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
                          className="w-full bg-[#16212e] border border-slate-700 rounded-lg p-2 text-white font-mono"
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
                          className="w-full bg-[#16212e] border border-slate-700 rounded-lg p-2 text-white font-mono"
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
                          className="w-full bg-[#16212e] border border-slate-700 rounded-lg p-2 text-white font-mono"
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
                          className="w-full bg-[#16212e] border border-slate-700 rounded-lg p-2 text-white font-mono"
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
                          className="w-full bg-[#16212e] border border-slate-700 rounded-lg p-2 text-white font-mono"
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
                  <div className="bg-[#101822] p-4 rounded-xl border border-slate-800 space-y-3">
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
                        <div className="p-3 rounded-lg bg-[#16212e] text-slate-400 text-center">
                          ยังไม่มีข้อมูลใบอนุญาตประกอบวิชาชีพ
                        </div>
                      ) : (
                        selectedStaff.licenses.map((lic, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-lg bg-[#16212e] border border-slate-700 flex items-center justify-between gap-3"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white text-xs">{lic.type}</span>
                                <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                  {lic.category}
                                </span>
                              </div>
                              <div className="text-[11px] font-mono text-slate-400 flex items-center gap-3">
                                <span>เลขที่: <b className="text-sky-300">{lic.number}</b></span>
                                <span>ออกให้: {lic.issueDate}</span>
                                <span>หมดอายุ: <b className="text-amber-300">{lic.expiryDate}</b></span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteLicenseFromStaff(idx)}
                              className="p-1.5 rounded-md text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors duration-200"
                              title="ลบใบอนุญาตฉบับนี้"
                            >
                              <Trash2 className="w-4 h-4 shrink-0" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Add New License Form */}
                    <div className="p-3 rounded-lg bg-[#141d28] border border-dashed border-slate-700 space-y-3">
                      <div className="font-semibold text-slate-200 text-[11px] flex items-center gap-1">
                        <Plus className="w-3.5 h-3.5 text-emerald-400" />
                        <span>เพิ่มใบอนุญาตประกอบวิชาชีพใหม่</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-slate-400 mb-1">ประเภทใบอนุญาต</label>
                          <select
                            value={newLicType}
                            onChange={(e) => {
                              setNewLicType(e.target.value);
                              const match = LICENSE_TYPES.find((lt) => lt.type === e.target.value);
                              if (match) setNewLicCategory(match.category);
                            }}
                            className="w-full bg-[#101822] border border-slate-700 rounded-lg p-2 text-white"
                          >
                            {LICENSE_TYPES.map((lt) => (
                              <option key={lt.type} value={lt.type}>
                                {lt.type}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-slate-400 mb-1">เลขที่ใบอนุญาต</label>
                          <input
                            type="text"
                            value={newLicNumber}
                            placeholder="เช่น 6520112000000"
                            onChange={(e) => setNewLicNumber(e.target.value)}
                            className="w-full bg-[#101822] border border-slate-700 rounded-lg p-2 text-white font-mono"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-slate-400 mb-1">วันที่ออกเอกสาร</label>
                          <input
                            type="date"
                            value={newLicIssue}
                            onChange={(e) => setNewLicIssue(e.target.value)}
                            className="w-full bg-[#101822] border border-slate-700 rounded-lg p-2 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 mb-1">วันหมดอายุ</label>
                          <input
                            type="date"
                            value={newLicExpiry}
                            onChange={(e) => setNewLicExpiry(e.target.value)}
                            className="w-full bg-[#101822] border border-slate-700 rounded-lg p-2 text-white"
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
                  <div className="bg-[#101822] p-4 rounded-xl border border-slate-800 space-y-3">
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
                          className="w-full bg-[#16212e] border border-slate-700 rounded-lg p-2 text-white font-semibold"
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
                          className="w-full bg-[#16212e] border border-slate-700 rounded-lg p-2 text-white font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: ภาระงานสอน & TA */}
              {staffModalTab === 'workload' && (
                <div className="space-y-4">
                  <div className="bg-[#101822] p-4 rounded-xl border border-slate-800 space-y-4">
                    <div className="text-xs font-bold text-sky-400 flex items-center gap-1.5 border-b border-slate-800 pb-2">
                      <Briefcase className="w-4 h-4 shrink-0" />
                      <span>กำหนดภาระงานสอนและผู้ช่วยสอน (ก.ค.ศ. ว9/2564 & ว21/2564)</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl bg-[#16212e] border border-slate-700 space-y-2">
                        <label className="block font-semibold text-sky-300">
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
                          className="w-full bg-[#101822] border border-slate-700 rounded-lg p-3 text-white text-lg font-mono font-bold"
                        />
                        <span className="text-[11px] text-slate-400 block">
                          ตามเกณฑ์ ก.ค.ศ. ต้องมีชั่วโมงสอนตามตารางไม่น้อยกว่า 12 ชั่วโมง/สัปดาห์
                        </span>
                      </div>

                      <div className="p-4 rounded-xl bg-[#16212e] border border-slate-700 space-y-2">
                        <label className="block font-semibold text-amber-300">
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
                          className="w-full bg-[#101822] border border-slate-700 rounded-lg p-3 text-white text-lg font-mono font-bold"
                        />
                        <span className="text-[11px] text-slate-400 block">
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
                  <div className="bg-[#101822] p-4 rounded-xl border border-slate-800 space-y-3">
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
                        <div className="p-3 rounded-lg bg-[#16212e] text-slate-400 text-center">
                          ยังไม่มีข้อมูลประวัติวิทยฐานะ
                        </div>
                      ) : (
                        selectedStaff.standings.map((std, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-lg bg-[#16212e] border border-slate-700 flex items-center justify-between gap-3"
                          >
                            <div>
                              <div className="font-bold text-white text-xs">{std.level}</div>
                              <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                                วันที่มีผล: {std.effectiveDate} | คำสั่ง: {std.orderNumber}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteStandingFromStaff(idx)}
                              className="p-1.5 rounded-md text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors duration-200"
                            >
                              <Trash2 className="w-4 h-4 shrink-0" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="p-3 rounded-lg bg-[#141d28] border border-dashed border-slate-700 space-y-3">
                      <div className="font-semibold text-slate-200 text-[11px] flex items-center gap-1">
                        <Plus className="w-3.5 h-3.5 text-sky-400" />
                        <span>เพิ่มประวัติการดำรงตำแหน่ง/วิทยฐานะ</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className="sm:col-span-1">
                          <label className="block text-slate-400 mb-1">ตำแหน่ง/วิทยฐานะ</label>
                          <input
                            type="text"
                            value={newStdLevel}
                            onChange={(e) => setNewStdLevel(e.target.value)}
                            className="w-full bg-[#101822] border border-slate-700 rounded-lg p-2 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 mb-1">วันที่มีผล</label>
                          <input
                            type="date"
                            value={newStdDate}
                            onChange={(e) => setNewStdDate(e.target.value)}
                            className="w-full bg-[#101822] border border-slate-700 rounded-lg p-2 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 mb-1">เลขที่คำสั่ง</label>
                          <input
                            type="text"
                            value={newStdOrder}
                            placeholder="เช่น ศธ 04123/2565"
                            onChange={(e) => setNewStdOrder(e.target.value)}
                            className="w-full bg-[#101822] border border-slate-700 rounded-lg p-2 text-white"
                          />
                        </div>
                      </div>
                      <div className="text-right">
                        <button
                          type="button"
                          onClick={handleAddStandingToStaff}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs border border-transparent transition-colors duration-200"
                        >
                          <Plus className="w-3.5 h-3.5 shrink-0" />
                          <span>เพิ่มรายการวิทยฐานะ</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Education History Section */}
                  <div className="bg-[#101822] p-4 rounded-xl border border-slate-800 space-y-3">
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
                        <div className="p-3 rounded-lg bg-[#16212e] text-slate-400 text-center">
                          ยังไม่มีข้อมูลวุฒิการศึกษา
                        </div>
                      ) : (
                        selectedStaff.educations.map((edu, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-lg bg-[#16212e] border border-slate-700 flex items-center justify-between gap-3"
                          >
                            <div>
                              <div className="font-bold text-white text-xs">
                                {edu.degree} สาขา {edu.major}
                              </div>
                              <div className="text-[11px] text-slate-400 mt-0.5">
                                {edu.institute} (พ.ศ. {edu.gradYear})
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteEducationFromStaff(idx)}
                              className="p-1.5 rounded-md text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors duration-200"
                            >
                              <Trash2 className="w-4 h-4 shrink-0" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="p-3 rounded-lg bg-[#141d28] border border-dashed border-slate-700 space-y-3">
                      <div className="font-semibold text-slate-200 text-[11px] flex items-center gap-1">
                        <Plus className="w-3.5 h-3.5 text-amber-400" />
                        <span>เพิ่มวุฒิการศึกษา</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                        <div>
                          <label className="block text-slate-400 mb-1">วุฒิ (อักษรย่อ)</label>
                          <input
                            type="text"
                            value={newEduDegree}
                            placeholder="เช่น ค.บ., ศศ.บ."
                            onChange={(e) => setNewEduDegree(e.target.value)}
                            className="w-full bg-[#101822] border border-slate-700 rounded-lg p-2 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 mb-1">สาขาวิชาเอก</label>
                          <input
                            type="text"
                            value={newEduMajor}
                            placeholder="เช่น ภาษาไทย, คณิตศาสตร์"
                            onChange={(e) => setNewEduMajor(e.target.value)}
                            className="w-full bg-[#101822] border border-slate-700 rounded-lg p-2 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 mb-1">สถาบันการศึกษา</label>
                          <input
                            type="text"
                            value={newEduInst}
                            placeholder="ชื่อมหาวิทยาลัย"
                            onChange={(e) => setNewEduInst(e.target.value)}
                            className="w-full bg-[#101822] border border-slate-700 rounded-lg p-2 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 mb-1">ปี พ.ศ. ที่จบ</label>
                          <input
                            type="text"
                            value={newEduYear}
                            placeholder="เช่น 2565"
                            onChange={(e) => setNewEduYear(e.target.value)}
                            className="w-full bg-[#101822] border border-slate-700 rounded-lg p-2 text-white font-mono"
                          />
                        </div>
                      </div>
                      <div className="text-right">
                        <button
                          type="button"
                          onClick={handleAddEducationToStaff}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs border border-transparent transition-colors duration-200"
                        >
                          <Plus className="w-3.5 h-3.5 shrink-0" />
                          <span>เพิ่มวุฒิการศึกษา</span>
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
                  className="px-4 py-2 rounded-lg bg-[#121822] hover:bg-slate-800/70 text-slate-300 hover:text-white border border-slate-800/80 text-xs font-medium transition-colors duration-200"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleSaveStaff}
                  className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium border border-transparent inline-flex items-center gap-2 transition-colors duration-200"
                >
                  <Save className="w-4 h-4 shrink-0" />
                  <span>{isNewStaff ? 'บันทึกเพิ่มบุคลากรใหม่' : 'บันทึกการเปลี่ยนแปลง'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* School Board Modal (Feature-complete legacy GAS restoration) */}
      {isBoardModalOpen && selectedBoardMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-[#141d27] border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-xs my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400">
                  <Award className="w-5 h-5 shrink-0" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">
                    {isNewBoardMember ? 'เพิ่มกรรมการสถานศึกษาใหม่' : `แก้ไขข้อมูลกรรมการ: ${selectedBoardMember.fullName}`}
                  </h3>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    ตามกฎกระทรวงกำหนดจำนวนกรรมการ คุณสมบัติ และหลักเกณฑ์ พ.ศ. 2546
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBoardModalOpen(false)}
                className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors duration-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-slate-400 mb-1">
                  ชื่อ - นามสกุล <span className="text-amber-400">*</span>
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
                  className="w-full bg-[#101822] border border-slate-700 rounded-xl p-2.5 text-white font-semibold"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">
                  ตำแหน่งในคณะกรรมการสถานศึกษา <span className="text-amber-400">*</span>
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
                  className="w-full bg-[#101822] border border-slate-700 rounded-xl p-2.5 text-white"
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
                  <label className="block text-slate-400 mb-1">อาชีพหลัก / ตำแหน่งหน้าที่</label>
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
                    className="w-full bg-[#101822] border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">สังกัด / องค์กร</label>
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
                    className="w-full bg-[#101822] border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">เบอร์โทรศัพท์ (PDPA)</label>
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
                    className="w-full bg-[#101822] border border-slate-700 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">วาระที่ดำรงตำแหน่ง</label>
                  <select
                    value={selectedBoardMember.termNumber}
                    onChange={(e) =>
                      setSelectedBoardMember({
                        ...selectedBoardMember,
                        termNumber: Number(e.target.value) || 1,
                      })
                    }
                    className="w-full bg-[#101822] border border-slate-700 rounded-xl p-2.5 text-white font-mono"
                  >
                    <option value={1}>วาระที่ 1 (ครั้งแรก 4 ปี)</option>
                    <option value={2}>วาระที่ 2 (ต่อเนื่องครั้งที่ 2)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">สถานะภาพ</label>
                  <select
                    value={selectedBoardMember.status}
                    onChange={(e) =>
                      setSelectedBoardMember({
                        ...selectedBoardMember,
                        status: e.target.value,
                      })
                    }
                    className="w-full bg-[#101822] border border-slate-700 rounded-xl p-2.5 text-white font-semibold"
                  >
                    <option value="ดำรงตำแหน่ง">ดำรงตำแหน่ง</option>
                    <option value="ครบวาระ">ครบวาระ</option>
                    <option value="พ้นจากตำแหน่งก่อนครบวาระ">พ้นจากตำแหน่งก่อนครบวาระ</option>
                  </select>
                </div>
              </div>
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
                  className="px-4 py-2 rounded-lg bg-[#121822] hover:bg-slate-800/70 text-slate-300 hover:text-white border border-slate-800/80 text-xs font-medium transition-colors duration-200"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleSaveBoardMember}
                  className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium border border-transparent inline-flex items-center gap-2 transition-colors duration-200"
                >
                  <Save className="w-4 h-4 shrink-0" />
                  <span>{isNewBoardMember ? 'บันทึกเพิ่มกรรมการใหม่' : 'บันทึกการเปลี่ยนแปลง'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
