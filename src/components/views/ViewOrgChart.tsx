'use client';

/**
 * ============================================================================
 * ManStat: ViewOrgChart (ผังโครงสร้างการบริหารงานสถานศึกษา)
 * ============================================================================
 * Standard: Thai OBEC (สพฐ.) School Administrative Structure
 * Pattern: Authentic Hierarchical Tree Diagram (ผังสายการบังคับบัญชา 4 กลุ่มงาน)
 *
 * Real Data Binding:
 * - ผู้อำนวยการสถานศึกษา (Executive Top Node) ผูกข้อมูลจริงจากฐานข้อมูลบุคลากร/สถานศึกษา
 * - คณะกรรมการสถานศึกษาขั้นพื้นฐาน ผูกข้อมูลประธานและจำนวนกรรมการจริง
 * - 4 กลุ่มบริหารงาน: วิชาการ, งบประมาณ, บุคคล, ทั่วไป ผูกข้อมูลหัวหน้ากลุ่มงานจริง
 *
 * Symmetry & Layout:
 * - Director node positioned exactly in the center of the hierarchy tree
 * - School Board connected laterally as an advisory/governance body via dashed line
 * - Vertical stem drops down from the center of Director node to horizontal branching crossbar
 * - 4 Division cards fixed height with top 3 core duties; full duties open in a clean Modal
 * - Zero Emojis, pure Lucide SVG icons, strict 8px standard gap.
 * ============================================================================
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  School,
  BookOpen,
  DollarSign,
  Users,
  Shield,
  Layers,
  Award,
  UserCheck,
  ChevronRight,
  X,
} from 'lucide-react';
import {
  INITIAL_SCHOOL_INFO,
  BoardMemberRecord,
  SchoolInfoRecord,
  TeacherRecord,
} from '@/lib/data/schoolData';
import {
  findDivisionHead,
  getDirectorInfo,
  type DivisionKey,
} from '@/lib/regulations/org-chart';
import { formatStaffName } from '@/lib/regulations/staff-formatting';

interface DivisionCardConfig {
  id: DivisionKey;
  shortName: string;
  title: string;
  icon: React.ElementType;
  accentBg: string;
  accentBorder: string;
  accentText: string;
  bulletColor: string;
  duties: string[];
}

const STATIC_DIVISIONS: DivisionCardConfig[] = [
  {
    id: 'academic',
    shortName: 'วิชาการ',
    title: 'กลุ่มบริหารงานวิชาการ',
    icon: BookOpen,
    accentBg: 'bg-sky-50 dark:bg-sky-500/10',
    accentBorder: 'border-sky-500/30',
    accentText: 'text-sky-600 dark:text-sky-400',
    bulletColor: 'bg-sky-500',
    duties: [
      'การพัฒนาหรือการดำเนินการเกี่ยวกับการให้ความเห็นการพัฒนาสาระหลักสูตรท้องถิ่น',
      'การวางแผนงานด้านวิชาการ',
      'การจัดการเรียนการสอนในสถานศึกษา',
      'การพัฒนาหลักสูตรของสถานศึกษา',
      'การพัฒนากระบวนการเรียนรู้',
      'การวัดผล ประเมินผล และดำเนินการเทียบโอนผลการเรียน',
      'การวิจัยเพื่อพัฒนาคุณภาพการศึกษาในสถานศึกษา',
      'การพัฒนาและส่งเสริมให้มีแหล่งเรียนรู้',
      'การนิเทศการศึกษา',
      'การแนะแนว',
      'การพัฒนาระบบประกันคุณภาพภายในและมาตรฐานการศึกษา',
      'การส่งเสริมชุมชนให้มีความเข้มแข็งทางวิชาการ',
      'การประสานความร่วมมือในการพัฒนาวิชาการกับสถานศึกษาและองค์กรอื่น',
      'การส่งเสริมและสนับสนุนงานวิชาการแก่บุคคล ครอบครัว องค์กร หน่วยงาน สถานประกอบการ และสถาบันอื่นที่จัดการศึกษา',
      'การจัดทำระเบียบและแนวปฏิบัติเกี่ยวกับงานด้านวิชาการของสถานศึกษา',
      'การคัดเลือกหนังสือ แบบเรียน เพื่อใช้ในสถานศึกษา',
      'การพัฒนาและใช้สื่อเทคโนโลยีเพื่อการศึกษา',
    ],
  },
  {
    id: 'budget',
    shortName: 'งบประมาณ',
    title: 'กลุ่มบริหารงานงบประมาณ',
    icon: DollarSign,
    accentBg: 'bg-emerald-50 dark:bg-emerald-500/10',
    accentBorder: 'border-emerald-500/30',
    accentText: 'text-emerald-600 dark:text-emerald-400',
    bulletColor: 'bg-emerald-500',
    duties: [
      'การจัดทำแผนงบประมาณ',
      'การจัดทำแผนปฏิบัติการใช้จ่ายเงินตามที่ได้รับจัดสรร',
      'การอนุมัติการใช้จ่ายงบประมาณที่ได้รับจัดสรร',
      'การขอโอนและการขอเปลี่ยนแปลงงบประมาณ',
      'การรายงานผลการเบิกจ่ายงบประมาณ',
      'การตรวจสอบติดตามและรายงานการใช้งบประมาณ',
      'การตรวจสอบติดตามและรายงานการใช้ผลผลิตจากงบประมาณ',
      'การระดมทรัพยากรและการลงทุนเพื่อการศึกษา',
      'การปฏิบัติงานอื่นใดตามที่ได้รับมอบหมายเกี่ยวกับกองทุนเพื่อการศึกษา',
      'การบริหารจัดการทรัพยากรเพื่อการศึกษา',
      'การวางแผนพัสดุ',
      'การกำหนดรูปแบบรายการ หรือคุณลักษณะเฉพาะของครุภัณฑ์หรือสิ่งก่อสร้าง',
      'การพัฒนาระบบข้อมูลและสารสนเทศเพื่อการจัดทำและจัดหาพัสดุ',
      'การจัดหาพัสดุ',
      'การควบคุมดูแล บำรุงรักษา และจำหน่ายพัสดุ',
      'การจัดหาผลประโยชน์จากทรัพย์สิน',
      'การเบิกเงินจากคลัง',
      'การรับเงิน การเก็บรักษาเงิน และการจ่ายเงิน',
      'การนำเงินส่งคลัง',
      'การจัดทำบัญชีการเงิน',
      'การจัดทำรายงานทางการเงินและงบการเงิน',
      'การจัดทำหรือจัดหาแบบพิมพ์บัญชี ทะเบียน และรายงาน',
    ],
  },
  {
    id: 'personnel',
    shortName: 'บุคคล',
    title: 'กลุ่มบริหารงานบุคคล',
    icon: Users,
    accentBg: 'bg-amber-50 dark:bg-amber-500/10',
    accentBorder: 'border-amber-500/30',
    accentText: 'text-amber-600 dark:text-amber-400',
    bulletColor: 'bg-amber-500',
    duties: [
      'การวางแผนอัตรากำลัง',
      'การจัดสรรอัตรากำลังข้าราชการครูและบุคลากรทางการศึกษา',
      'การสรรหาและบรรจุแต่งตั้ง',
      'การเปลี่ยนตำแหน่งให้สูงขึ้น การย้าย ข้าราชการครูและบุคลากรทางการศึกษา',
      'การดำเนินการเกี่ยวกับการเลื่อนขั้นเงินเดือน',
      'การลาทุกประเภท',
      'การประเมินผลการปฏิบัติงาน',
      'การดำเนินการทางวินัยและการลงโทษ',
      'การสั่งพักราชการและการสั่งให้ออกจากราชการไว้ก่อน',
      'การรายงานการดำเนินการทางวินัยและการลงโทษ การอุทธรณ์และการร้องทุกข์ การออกจากราชการ',
      'การจัดระบบและการจัดทำทะเบียนประวัติ',
      'การจัดทำบัญชีรายชื่อและให้ความเห็นเกี่ยวกับการเสนอขอพระราชทานเครื่องราชอิสริยาภรณ์',
      'การส่งเสริมการประเมินวิทยฐานะข้าราชการครูและบุคลากรทางการศึกษา',
      'การส่งเสริมและยกย่องเชิดชูเกียรติ',
      'การส่งเสริมมาตรฐานวิชาชีพและจรรยาบรรณวิชาชีพ',
      'การส่งเสริมวินัย คุณธรรม และจริยธรรมสำหรับข้าราชการครูและบุคลากรทางการศึกษา',
      'การริเริ่มส่งเสริมการขอรับใบอนุญาต',
      'การพัฒนาข้าราชการครูและบุคลากรทางการศึกษา ทางการเงินและงบการเงิน',
    ],
  },
  {
    id: 'general',
    shortName: 'ทั่วไป',
    title: 'กลุ่มบริหารงานทั่วไป',
    icon: Shield,
    accentBg: 'bg-indigo-50 dark:bg-indigo-500/10',
    accentBorder: 'border-indigo-500/30',
    accentText: 'text-indigo-600 dark:text-indigo-400',
    bulletColor: 'bg-indigo-500',
    duties: [
      'การพัฒนาระบบและเครือข่ายข้อมูลสารสนเทศ',
      'การประสานงานและพัฒนาเครือข่ายการศึกษา',
      'การวางแผนการบริหารงานการศึกษา',
      'งานวิจัยเพื่อพัฒนานโยบายและแผน',
      'การจัดระบบการบริหารและพัฒนาองค์กร',
      'การพัฒนามาตรฐานการปฏิบัติงาน',
      'งานเทคโนโลยีเพื่อการศึกษา',
      'การดำเนินงานธุรการ',
      'การดูแลอาคารสถานที่และสภาพแวดล้อม',
      'การจัดทำสำมะโนผู้เรียน',
      'การรับนักเรียน',
      'การเสนอความเห็นเกี่ยวกับเรื่องการจัดตั้ง ยุบรวม หรือเลิกสถานศึกษา',
      'การประสานการจัดการศึกษาในระบบ นอกระบบ และตามอัธยาศัย',
      'การระดมทรัพยากรเพื่อการศึกษา',
      'การทัศนศึกษา',
      'งานกิจการนักเรียน',
      'การประชาสัมพันธ์งานการศึกษา',
      'การส่งเสริม สนับสนุน และประสานการจัดการศึกษาของบุคคล ชุมชน องค์กร หน่วยงาน และสถาบันสังคมอื่น',
      'งานประสานราชการกับส่วนภูมิภาคและส่วนท้องถิ่น',
      'การจัดระบบการควบคุมภายในหน่วยงาน',
      'แนวทางการจัดกิจกรรมเพื่อปรับเปลี่ยนพฤติกรรมในการลงโทษนักเรียน',
    ],
  },
];

export interface ActiveDivisionModalData extends DivisionCardConfig {
  headName: string;
  headPositionFormatted: string;
}

export const ViewOrgChart: React.FC = () => {
  const [teachersList, setTeachersList] = useState<TeacherRecord[]>([]);
  const [boardList, setBoardList] = useState<BoardMemberRecord[]>([]);
  const [school, setSchool] = useState<SchoolInfoRecord>(INITIAL_SCHOOL_INFO);
  const [activeModalDivision, setActiveModalDivision] = useState<ActiveDivisionModalData | null>(null);

  useEffect(() => {
    let isMounted = true;

    // Load real staff data
    fetch('/api/admin/staff', { cache: 'no-store' })
      .then((r) => r.json())
      .then((res) => {
        if (res.success && Array.isArray(res.data) && isMounted) {
          setTeachersList(res.data);
        }
      })
      .catch(() => {});

    // Load real school board data
    fetch('/api/admin/board', { cache: 'no-store' })
      .then((r) => r.json())
      .then((res) => {
        if (res.success && Array.isArray(res.data) && isMounted) {
          setBoardList(res.data);
        }
      })
      .catch(() => {});

    // Load school metadata
    fetch('/api/admin/school', { cache: 'no-store' })
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data && isMounted) {
          setSchool(res.data);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  // 1. Resolve Director info from real staff database
  const directorInfo = useMemo(() => {
    return getDirectorInfo(teachersList, school.directorName, school.directorPosition);
  }, [teachersList, school.directorName, school.directorPosition]);

  // 2. Resolve Board Chair & Total Members
  const boardChair = useMemo(() => {
    return boardList.find((b) => b.position === 'CHAIR')?.fullName || 'นางเสาวนีย์ ศิริวรรณโยธา';
  }, [boardList]);

  const totalBoardMembers = boardList.length;

  // 3. Bind real division heads dynamically to 4 divisions
  const divisions = useMemo(() => {
    return STATIC_DIVISIONS.map((div) => {
      const head = findDivisionHead(teachersList, div.id);
      return {
        ...div,
        headName: head.name,
        headPositionFormatted: head.positionFormatted,
      };
    });
  }, [teachersList]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Header Strip (Minimal & Clean, no duplicate pill) */}
      <div className="bg-white dark:bg-[#141b24] p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm transition-colors duration-200">
        <div className="flex items-center gap-2.5">
          <Layers className="w-5 h-5 text-sky-500 shrink-0" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            ผังโครงสร้างการบริหารงานสถานศึกษา
          </h2>
        </div>
      </div>

      {/* 2. Visual Hierarchy Tree Diagram */}
      <div className="bg-slate-50/70 dark:bg-[#0d141e] p-4 sm:p-8 rounded-2xl border border-slate-200/90 dark:border-slate-800/80 shadow-sm relative overflow-hidden transition-colors duration-200">
        
        {/* ================================================================= */}
        {/* LEVEL 1: TOP EXECUTIVE NODE & LATERAL ADVISORY NODE               */}
        {/* ================================================================= */}
        <div className="relative max-w-5xl mx-auto z-10">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] items-center gap-4 lg:gap-0">
            
            {/* Left Column Spacer (balances right board card so Director is exactly centered) */}
            <div className="hidden lg:block" aria-hidden="true" />

            {/* Main Executive Node (Director - Dead Center) */}
            <div className="w-full max-w-sm mx-auto lg:w-[360px] bg-white dark:bg-[#121822] p-4 sm:p-5 rounded-2xl border-2 border-sky-500/70 shadow-lg relative text-left transition-colors duration-200 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-md shrink-0">
                  <School className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
                    ผู้บังคับบัญชาสูงสุด
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mt-0.5 truncate" title={formatStaffName(directorInfo.name)}>
                    {formatStaffName(directorInfo.name)}
                  </h3>
                  <div className="text-xs text-slate-600 dark:text-slate-300 font-medium truncate" title={directorInfo.positionFormatted}>
                    {directorInfo.positionFormatted}
                  </div>
                </div>
              </div>
              
              <div className="mt-3 pt-2.5 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span>การบริหารงานสถานศึกษาขั้นพื้นฐาน</span>
                <span className="font-mono text-slate-400 dark:text-slate-500 shrink-0">สพป.นครราชสีมา เขต 3</span>
              </div>
            </div>

            {/* Right Column: Lateral Connector Link & School Board Node (Desktop) */}
            <div className="hidden lg:flex items-center pl-2 xl:pl-4 min-w-0">
              <div className="w-4 xl:w-6 border-t-2 border-dashed border-amber-500/50 shrink-0" />
              <div className="flex-1 min-w-0 bg-slate-50 dark:bg-[#101723] p-3.5 sm:p-4 rounded-xl border border-dashed border-amber-500/40 shadow-sm text-left transition-colors duration-200">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
                    <Award className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                      องค์กรกำกับดูแล
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white mt-0.5 truncate" title="คณะกรรมการสถานศึกษาขั้นพื้นฐาน">
                      คณะกรรมการสถานศึกษาขั้นพื้นฐาน
                    </h4>
                    <div className="text-[11px] text-slate-600 dark:text-slate-400 truncate" title={`ประธาน: ${boardChair}`}>
                      ประธาน: {boardChair}
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-800/60 gap-1">
                  <span className="truncate">ให้ความเห็นชอบแผนและงบประมาณ</span>
                  <span className="text-amber-600 dark:text-amber-400 font-medium whitespace-nowrap shrink-0">
                    รวม {totalBoardMembers} ท่าน
                  </span>
                </div>
              </div>
            </div>

            {/* Mobile / Tablet School Board Node (< lg) */}
            <div className="lg:hidden w-full max-w-sm mx-auto bg-slate-50 dark:bg-[#101723] p-3.5 rounded-xl border border-dashed border-amber-500/40 shadow-sm text-left">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
                  <Award className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                    องค์กรกำกับดูแล
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                    คณะกรรมการสถานศึกษาขั้นพื้นฐาน
                  </h4>
                  <div className="text-[11px] text-slate-600 dark:text-slate-400">
                    ประธาน: {boardChair} · รวม {totalBoardMembers} ท่าน
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ================================================================= */}
        {/* CENTRAL STEM & HORIZONTAL TREE CONNECTOR LINES                     */}
        {/* ================================================================= */}
        <div className="hidden xl:block relative my-4">
          {/* Vertical stem from Director (mx-auto matches the mathematically centered Director box) */}
          <div className="w-0.5 h-6 bg-slate-300 dark:bg-slate-700 mx-auto" />
          
          {/* Branching crossbar spanning across the 4 division columns */}
          {/* 4 columns: center of col 1 (12.5%) to center of col 4 (87.5%) = 75% width */}
          <div className="relative max-w-7xl mx-auto h-4">
            <div className="absolute left-[12.5%] right-[12.5%] top-0 border-t-2 border-slate-300 dark:border-slate-700" />
            
            {/* 4 Drop stems into each card */}
            <div className="absolute left-[12.5%] top-0 w-0.5 h-4 bg-slate-300 dark:bg-slate-700 -translate-x-1/2" />
            <div className="absolute left-[37.5%] top-0 w-0.5 h-4 bg-slate-300 dark:bg-slate-700 -translate-x-1/2" />
            <div className="absolute left-[62.5%] top-0 w-0.5 h-4 bg-slate-300 dark:bg-slate-700 -translate-x-1/2" />
            <div className="absolute left-[87.5%] top-0 w-0.5 h-4 bg-slate-300 dark:bg-slate-700 -translate-x-1/2" />
          </div>
        </div>

        {/* Mobile / Tablet vertical connector spacer */}
        <div className="block xl:hidden h-6" />

        {/* ================================================================= */}
        {/* LEVEL 2: 4 CORE ADMINISTRATIVE DIVISIONS (4 กลุ่มบริหารงาน)        */}
        {/* ================================================================= */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 max-w-7xl mx-auto items-stretch relative z-10">
          {divisions.map((div) => {
            const Icon = div.icon;

            return (
              <div
                key={div.id}
                className="bg-white dark:bg-[#121822] rounded-2xl border border-slate-200/90 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-all flex flex-col h-full overflow-hidden"
              >
                {/* Node Top Section */}
                <div className="p-4 sm:p-5 flex-1 flex flex-col">
                  {/* Division Header */}
                  <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/80">
                    <div className={`p-2.5 rounded-xl ${div.accentBg} ${div.accentText} shrink-0`}>
                      <Icon className="w-5 h-5 shrink-0" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        กลุ่มบริหารงาน
                      </div>
                      <div className="text-base font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                        {div.shortName}
                      </div>
                    </div>
                  </div>

                  {/* Division Head Sub-Card (Equal min-h to prevent awkward word wrapping) */}
                  <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-[#101723] border border-slate-200/80 dark:border-slate-800/80 min-h-[76px] flex flex-col justify-center transition-colors duration-200">
                    <div className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white leading-snug break-words" title={formatStaffName(div.headName)}>
                      {formatStaffName(div.headName)}
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 truncate" title={div.headPositionFormatted}>
                      {div.headPositionFormatted}
                    </div>
                  </div>

                  {/* Core Scopes Preview (Fixed 3 items) */}
                  <div className="mt-3.5 space-y-1.5 flex-1">
                    <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      ขอบข่ายภารกิจ · {div.duties.length} งาน
                    </div>
                    <div className="space-y-1.5">
                      {div.duties.slice(0, 3).map((duty, idx) => (
                        <div
                          key={idx}
                          className="text-[11px] text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-[#101723] px-2.5 py-1.5 rounded-lg border border-slate-200/60 dark:border-slate-800/60 flex items-start gap-2 transition-colors duration-150"
                          title={duty}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${div.bulletColor}`} />
                          <span className="truncate leading-relaxed">{duty}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Node Footer Button: Pinned to bottom with mt-auto */}
                <div className="mt-auto p-3 bg-slate-50/80 dark:bg-[#0f1520] border-t border-slate-100 dark:border-slate-800/80 transition-colors duration-200">
                  <button
                    type="button"
                    onClick={() => setActiveModalDivision(div)}
                    className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-colors duration-200 cursor-pointer"
                  >
                    <span>ดูขอบข่ายภารกิจทั้งหมด</span>
                    <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* 3. Bureaucratic Legal Reference Note */}
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#111822] border border-slate-200/90 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm transition-colors duration-200">
        <div className="flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
          <span>
            สายการบังคับบัญชาอ้างอิงตามกรอบอัตรากำลังและโครงสร้าง 4 กลุ่มงานของ สพฐ. กระทรวงศึกษาธิการ
          </span>
        </div>
        <span className="font-medium text-[11px] text-slate-500 dark:text-slate-400">
          มาตรฐานการบริหารจัดการสถานศึกษาขั้นพื้นฐาน สพฐ.
        </span>
      </div>

      {/* ================================================================= */}
      {/* 4. MODAL: Full Scope of Duties (Clean, non-stretching viewer)      */}
      {/* ================================================================= */}
      {activeModalDivision && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setActiveModalDivision(null)}
        >
          <div
            className="bg-white dark:bg-[#121822] border border-slate-200/90 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col text-slate-900 dark:text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200/90 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${activeModalDivision.accentBg} ${activeModalDivision.accentText} shrink-0`}>
                  {React.createElement(activeModalDivision.icon, { className: 'w-6 h-6 shrink-0' })}
                </div>
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    กลุ่มบริหารงาน
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {activeModalDivision.title}
                  </h3>
                  <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    หัวหน้ากลุ่มงาน: <span className="font-semibold text-slate-800 dark:text-slate-200">{formatStaffName(activeModalDivision.headName)}</span> ({activeModalDivision.headPositionFormatted})
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveModalDivision(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="ปิดหน้าต่าง"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Subtitle / Count */}
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
              <span>ขอบข่ายภารกิจตามระเบียบ สพฐ.</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                ขอบข่ายภารกิจ · {activeModalDivision.duties.length} งาน
              </span>
            </div>

            {/* Modal Body: Scrollable Duties List */}
            <div className="overflow-y-auto pr-1 space-y-2 flex-1 max-h-[55vh]">
              {activeModalDivision.duties.map((duty, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-[#101723] border border-slate-200/80 dark:border-slate-800/80 text-xs text-slate-800 dark:text-slate-200 flex items-start gap-2.5 leading-relaxed"
                >
                  <span className="font-mono text-xs text-slate-400 dark:text-slate-500 font-semibold shrink-0 mt-0.5 min-w-[22px]">
                    {idx + 1}.
                  </span>
                  <span className="flex-1">{duty}</span>
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-200/90 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveModalDivision(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
