'use client';

/**
 * ============================================================================
 * ManStat-Modern: ViewOrgChart (ผังโครงสร้างการบริหารงานสถานศึกษา)
 * ============================================================================
 * Standard: Thai OBEC (สพฐ.) School Administrative Structure
 * Pattern: Authentic Hierarchical Tree Diagram (ผังสายการบังคับบัญชา 4 กลุ่มงาน)
 *
 * Hierarchy Anatomy:
 * - Level 1: ผู้อำนวยการสถานศึกษา (Executive Top Node)
 *   * Lateral Advisory Branch: คณะกรรมการสถานศึกษาขั้นพื้นฐาน (9 ท่าน)
 * - Tree Connectors: Crisp CSS Stem & Horizontal Branching Lines
 * - Level 2: 4 Core Administrative Divisions (โรงเรียนชุมชนบ้านตะขบ):
 *   1. กลุ่มบริหารงานวิชาการ (17 ภารกิจ) — Sky
 *   2. กลุ่มบริหารงานงบประมาณ (22 ภารกิจ) — Emerald
 *   3. กลุ่มบริหารงานบุคคล (18 ภารกิจ) — Amber
 *   4. กลุ่มบริหารงานทั่วไป (21 ภารกิจ) — Indigo
 *
 * UI Cleanup & Single-Line Standards:
 * - Removed redundant headcount pills and teacher member lists to keep focus on governance.
 * - Single role badge for division heads, ensuring zero text truncation.
 * - Progressive disclosure (Accordion) for full mission lists with clean internal scrolling.
 * - Strict Zero-Emoji compliance, Pure Lucide SVG Icons, 8px standard gap.
 * - Dual-Theme Support: Clean Civil-Service Paper / Minimalist Obsidian Slate.
 * ============================================================================
 */

import React, { useState } from 'react';
import {
  School,
  BookOpen,
  DollarSign,
  Users,
  Shield,
  Layers,
  ChevronDown,
  ChevronUp,
  Award,
  UserCheck,
  CheckCircle2,
} from 'lucide-react';
import { INITIAL_BOARD_MEMBERS } from '@/lib/data/schoolData';

interface DivisionData {
  id: string;
  title: string;
  headName: string;
  headPosition: string;
  headStanding: string;
  icon: React.ElementType;
  accentBg: string;
  accentBorder: string;
  accentText: string;
  bulletColor: string;
  duties: string[];
}

export const ViewOrgChart: React.FC = () => {
  const [expandedDivision, setExpandedDivision] = useState<string | null>(null);

  const toggleDivision = (id: string) => {
    setExpandedDivision((prev) => (prev === id ? null : id));
  };

  // ดึงชื่อประธานกรรมการสถานศึกษาจริงจากฐานข้อมูล
  const boardChair =
    INITIAL_BOARD_MEMBERS.find((b) => b.position === 'CHAIR')?.fullName ||
    'นางเสาวนีย์ ศิริวรรณโยธา';
  const totalBoardMembers = INITIAL_BOARD_MEMBERS.length || 9;

  const divisions: DivisionData[] = [
    {
      id: 'academic',
      title: 'กลุ่มบริหารงานวิชาการ',
      headName: 'นายพันธ์ธนัต ภวฤทธิ์นาคินทร์',
      headPosition: 'ครู (คศ. 3)',
      headStanding: 'ชำนาญการพิเศษ',
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
      title: 'กลุ่มบริหารงานงบประมาณ',
      headName: 'นางสาวสุนิสา สุทธิวงศ์',
      headPosition: 'ครู (คศ. 3)',
      headStanding: 'ชำนาญการพิเศษ',
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
      title: 'กลุ่มบริหารงานบุคคล',
      headName: 'นางสาวทัชชกร ช่วยจังหรีด',
      headPosition: 'ครู (คศ. 3)',
      headStanding: 'ชำนาญการพิเศษ',
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
      title: 'กลุ่มบริหารงานทั่วไป',
      headName: 'นายธวัชชัย เหลืองโอฬาร',
      headPosition: 'ครู (คศ. 2)',
      headStanding: 'ชำนาญการ',
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

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Header Strip */}
      <div className="bg-white dark:bg-[#141b24] p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm transition-colors duration-200">
        <div>
          <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 text-xs font-semibold uppercase tracking-wider">
            <Layers className="w-4 h-4 shrink-0" />
            <span>โครงสร้างการบริหารงานและการบังคับบัญชา</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
            ผังโครงสร้างการบริหารงานสถานศึกษา
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            โครงสร้างการบริหาร 4 กลุ่มงาน ตามพระราชบัญญัติระเบียบบริหารราชการกระทรวงศึกษาธิการ และระเบียบ สพฐ.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-[#121822] text-slate-700 dark:text-slate-300 border border-slate-200/90 dark:border-slate-800/80">
            โครงสร้างบริหาร 4 กลุ่มงาน
          </span>
        </div>
      </div>

      {/* 2. Visual Hierarchy Tree Diagram */}
      <div className="bg-slate-50/70 dark:bg-[#0d141e] p-4 sm:p-8 rounded-2xl border border-slate-200/90 dark:border-slate-800/80 shadow-sm relative overflow-hidden transition-colors duration-200">
        
        {/* ================================================================= */}
        {/* LEVEL 1: TOP EXECUTIVE NODE & LATERAL ADVISORY NODE               */}
        {/* ================================================================= */}
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6 relative z-10">
          
          {/* Main Executive Node (Director) */}
          <div className="w-full md:w-[380px] bg-white dark:bg-[#121822] p-4 sm:p-5 rounded-2xl border-2 border-sky-500/70 shadow-lg relative text-left transition-colors duration-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-md shrink-0">
                <School className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30 whitespace-nowrap">
                    ผู้บังคับบัญชาสูงสุด
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-mono font-semibold rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 whitespace-nowrap">
                    คศ. 3
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-1 truncate" title="นายธีรศักดิ์ มโนธรรม">
                  นายธีรศักดิ์ มโนธรรม
                </h3>
                <div className="text-xs text-sky-600 dark:text-sky-400 font-medium truncate" title="ผู้อำนวยการสถานศึกษา (ชำนาญการพิเศษ)">
                  ผู้อำนวยการสถานศึกษา
                </div>
              </div>
            </div>
            
            <div className="mt-3 pt-2.5 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span className="truncate" title="โรงเรียนชุมชนบ้านตะขบ">โรงเรียนชุมชนบ้านตะขบ</span>
              <span className="font-mono text-slate-400 dark:text-slate-500 shrink-0">สพป.นม. 3</span>
            </div>
          </div>

          {/* Lateral Connector Link (Desktop Horizontal / Mobile Vertical) */}
          <div className="hidden md:flex items-center text-slate-400 dark:text-slate-600">
            <div className="w-8 border-t-2 border-dashed border-slate-300 dark:border-slate-700" />
          </div>

          {/* Lateral Advisory Node: School Board (คณะกรรมการสถานศึกษาขั้นพื้นฐาน) */}
          <div className="w-full md:w-[320px] bg-slate-50 dark:bg-[#101723] p-4 rounded-xl border border-dashed border-amber-500/40 shadow-sm relative text-left transition-colors duration-200">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
                <Award className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 whitespace-nowrap">
                    องค์กรกำกับดูแล
                  </span>
                </div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white mt-0.5 truncate" title={`คณะกรรมการสถานศึกษาขั้นพื้นฐาน (${totalBoardMembers} ท่าน)`}>
                  คณะกรรมการสถานศึกษาขั้นพื้นฐาน
                </h4>
                <div className="text-[11px] text-slate-600 dark:text-slate-400 truncate" title={`ประธาน: ${boardChair} (รวม ${totalBoardMembers} ท่าน)`}>
                  ประธาน: {boardChair}
                </div>
              </div>
            </div>
            <div className="mt-2 text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>ให้ความเห็นชอบแผนและงบประมาณ</span>
              <span className="text-amber-600 dark:text-amber-400 font-medium">รวม {totalBoardMembers} ท่าน</span>
            </div>
          </div>

        </div>

        {/* ================================================================= */}
        {/* CENTRAL STEM & HORIZONTAL TREE CONNECTOR LINES                     */}
        {/* ================================================================= */}
        <div className="hidden xl:block relative my-3">
          {/* Vertical stem from Director */}
          <div className="w-0.5 h-6 bg-slate-300 dark:bg-slate-700 mx-auto" />
          
          {/* Branching crossbar spanning across the 4 division columns */}
          {/* 4 columns: center of col 1 (12.5%) to center of col 4 (87.5%) = 75% width */}
          <div className="relative max-w-7xl mx-auto h-4">
            <div className="absolute left-[12.5%] right-[12.5%] top-0 border-t-2 border-slate-300 dark:border-slate-700" />
            
            {/* 4 Drop stems */}
            <div className="absolute left-[12.5%] top-0 w-0.5 h-4 bg-slate-300 dark:border-slate-700 -translate-x-1/2" />
            <div className="absolute left-[37.5%] top-0 w-0.5 h-4 bg-slate-300 dark:border-slate-700 -translate-x-1/2" />
            <div className="absolute left-[62.5%] top-0 w-0.5 h-4 bg-slate-300 dark:border-slate-700 -translate-x-1/2" />
            <div className="absolute left-[87.5%] top-0 w-0.5 h-4 bg-slate-300 dark:border-slate-700 -translate-x-1/2" />
          </div>
        </div>

        {/* Mobile / Tablet vertical connector spacer */}
        <div className="block xl:hidden h-6" />

        {/* ================================================================= */}
        {/* LEVEL 2: 4 CORE ADMINISTRATIVE DIVISIONS (4 กลุ่มบริหารงาน)        */}
        {/* ================================================================= */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 max-w-7xl mx-auto relative z-10">
          {divisions.map((div) => {
            const Icon = div.icon;
            const isExpanded = expandedDivision === div.id;

            return (
              <div
                key={div.id}
                className="bg-white dark:bg-[#121822] rounded-2xl border border-slate-200/90 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
              >
                {/* Node Top Section */}
                <div className="p-4 sm:p-5">
                  {/* Division Header (Clean title with zero truncation) */}
                  <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800/80">
                    <div className={`p-2 rounded-xl ${div.accentBg} ${div.accentText} shrink-0`}>
                      <Icon className="w-5 h-5 shrink-0" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight" title={div.title}>
                        {div.title}
                      </h4>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-0.5">
                        ขอบข่ายภารกิจ {div.duties.length} งาน
                      </span>
                    </div>
                  </div>

                  {/* Division Head Sub-Card (Clean Single Role Badge) */}
                  <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-[#101723] border border-slate-200/80 dark:border-slate-800/80 transition-colors duration-200">
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${div.accentBg} ${div.accentText} border ${div.accentBorder}`}>
                        หัวหน้ากลุ่มงาน
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                        {div.headPosition}
                      </span>
                    </div>
                    <div className="font-bold text-xs text-slate-900 dark:text-white truncate" title={div.headName}>
                      {div.headName}
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                      วิทยฐานะ: {div.headStanding}
                    </div>
                  </div>

                  {/* Core Scopes Preview (Collapsed State) */}
                  {!isExpanded && (
                    <div className="mt-3.5 space-y-1.5">
                      <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block">
                        ภารกิจหลัก:
                      </span>
                      <div className="space-y-1">
                        {div.duties.slice(0, 3).map((duty, idx) => (
                          <div
                            key={idx}
                            className="text-[11px] text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-[#101723] px-2.5 py-1.5 rounded-lg border border-slate-200/60 dark:border-slate-800/60 flex items-start gap-1.5 transition-colors duration-150"
                            title={duty}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${div.bulletColor}`} />
                            <span className="truncate leading-relaxed">{duty}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Expanded Section: Full Duties List with Internal Scrollbar */}
                  {isExpanded && (
                    <div className="mt-3.5 pt-3 border-t border-slate-200/80 dark:border-slate-800/80 space-y-2 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        <span>ขอบข่ายภารกิจทั้งหมด ({div.duties.length} รายการ):</span>
                      </div>
                      
                      <div className="max-h-72 overflow-y-auto pr-1 space-y-1.5">
                        {div.duties.map((duty, dIdx) => (
                          <div
                            key={dIdx}
                            className="p-2 rounded-lg bg-slate-50 dark:bg-[#101723] border border-slate-200/60 dark:border-slate-800/60 text-[11px] text-slate-700 dark:text-slate-300 flex items-start gap-2"
                          >
                            <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500 font-semibold shrink-0 mt-0.5 min-w-[18px]">
                              {dIdx + 1}.
                            </span>
                            <span className="leading-snug">{duty}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Node Footer Accordion Toggle Button */}
                <div className="p-3 bg-slate-50/80 dark:bg-[#0f1520] border-t border-slate-100 dark:border-slate-800/80 transition-colors duration-200">
                  <button
                    type="button"
                    onClick={() => toggleDivision(div.id)}
                    className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/50 transition-colors duration-200 cursor-pointer"
                  >
                    <span>{isExpanded ? 'ย่อรายละเอียด' : 'ดูขอบข่ายภารกิจทั้งหมด'}</span>
                    {isExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                    )}
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
    </div>
  );
};
