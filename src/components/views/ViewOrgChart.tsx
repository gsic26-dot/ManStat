'use client';

/**
 * ============================================================================
 * ManStat-Modern: ViewOrgChart (ผังโครงสร้างการบริหารงานสถานศึกษา)
 * ============================================================================
 * Standard: Thai OBEC (สพฐ.) School Administrative Structure
 * Pattern: Authentic Hierarchical Tree Diagram (ผังสายการบังคับบัญชา 4 ฝ่าย)
 *
 * Hierarchy Anatomy:
 * - Level 1: ผู้อำนวยการสถานศึกษา (Executive Top Node)
 *   * Lateral Advisory Branch: คณะกรรมการสถานศึกษาขั้นพื้นฐาน (9 ท่าน)
 * - Tree Connectors: Crisp CSS Stem & Horizontal Branching Lines
 * - Level 2: 4 Core Administrative Divisions:
 *   1. ฝ่ายบริหารวิชาการ (Academic Affairs) — Sky
 *   2. ฝ่ายบริหารงบประมาณ (Budget & Finance) — Emerald
 *   3. ฝ่ายบริหารงานบุคคล (Personnel / HR) — Amber
 *   4. ฝ่ายบริหารทั่วไปและกิจการนักเรียน (General Admin) — Indigo
 *
 * Single-Line Discipline:
 * - Uniform node heights, zero-wrap badges, truncate with native tooltips.
 * - Interactive progressive disclosure (Accordion) for duties & personnel.
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

interface DivisionMember {
  name: string;
  position: string;
}

interface DivisionData {
  id: string;
  title: string;
  titleEn: string;
  headName: string;
  headPosition: string;
  headStanding: string;
  icon: React.ElementType;
  accentColor: string;
  accentBg: string;
  accentBorder: string;
  accentText: string;
  staffCount: number;
  duties: string[];
  members: DivisionMember[];
}

export const ViewOrgChart: React.FC = () => {
  const [expandedDivision, setExpandedDivision] = useState<string | null>(null);

  const toggleDivision = (id: string) => {
    setExpandedDivision((prev) => (prev === id ? null : id));
  };

  const divisions: DivisionData[] = [
    {
      id: 'academic',
      title: 'ฝ่ายบริหารวิชาการ',
      titleEn: 'Academic Affairs Division',
      headName: 'นายพันธ์ธนัต ภวฤทธิ์นาคินทร์',
      headPosition: 'ครู (คศ. 3)',
      headStanding: 'ชำนาญการพิเศษ',
      icon: BookOpen,
      accentColor: 'sky-500',
      accentBg: 'bg-sky-50 dark:bg-sky-500/10',
      accentBorder: 'border-sky-500/30',
      accentText: 'text-sky-600 dark:text-sky-400',
      staffCount: 6,
      duties: [
        'การพัฒนาหลักสูตรสถานศึกษาและการจัดการเรียนรู้เชิงรุก',
        'การวัดผล ประเมินผล และเทียบโอนผลการเรียน',
        'การวิจัยพัฒนาคุณภาพการศึกษาและสื่อนวัตกรรมเทคโนโลยี',
        'การพัฒนาระบบการประกันคุณภาพภายในและมาตรฐานการศึกษา',
      ],
      members: [
        { name: 'นายวัชรินทร์ วิทยาสาร', position: 'ครูชำนาญการ (คศ. 2)' },
        { name: 'นางสาวพรทิพย์ ส่องแสง', position: 'ครู (คศ. 1)' },
        { name: 'นางสาวกัลยาณี นครินทร์', position: 'ครูผู้ช่วย' },
        { name: 'นางรัตนาภรณ์ จิตแจ่มใส', position: 'ครูอัตราจ้าง' },
      ],
    },
    {
      id: 'budget',
      title: 'ฝ่ายบริหารงบประมาณ',
      titleEn: 'Budget & Finance Division',
      headName: 'นางสาวทัชชกร ช่วยจังหรีด',
      headPosition: 'ครู (คศ. 3)',
      headStanding: 'ชำนาญการพิเศษ',
      icon: DollarSign,
      accentColor: 'emerald-500',
      accentBg: 'bg-emerald-50 dark:bg-emerald-500/10',
      accentBorder: 'border-emerald-500/30',
      accentText: 'text-emerald-600 dark:text-emerald-400',
      staffCount: 4,
      duties: [
        'การจัดทำแผนปฏิบัติการประจำปีและคำของบประมาณ',
        'การบริหารการเงิน การบัญชี และการเบิกจ่ายตามระเบียบ',
        'งานบริหารพัสดุ สินทรัพย์ และทะเบียนควบคุมครุภัณฑ์',
        'การตรวจสอบ ติดตาม รายงาน และการควบคุมภายในสถานศึกษา',
      ],
      members: [
        { name: 'นายเอกชัย สมบูรณ์', position: 'ครูชำนาญการ (คศ. 2)' },
        { name: 'นางปราณี มีทรัพย์', position: 'เจ้าหน้าที่การเงินและพัสดุ' },
        { name: 'นางสาวสุภาวดี ชัยชนะ', position: 'เจ้าหน้าที่ธุรการการเงิน' },
      ],
    },
    {
      id: 'personnel',
      title: 'ฝ่ายบริหารงานบุคคล',
      titleEn: 'Personnel & HR Division',
      headName: 'นางสาวกุสุมาลย์กมล พราหมณ์ตะขบ',
      headPosition: 'ครู (คศ. 3)',
      headStanding: 'ชำนาญการพิเศษ',
      icon: Users,
      accentColor: 'amber-500',
      accentBg: 'bg-amber-50 dark:bg-amber-500/10',
      accentBorder: 'border-amber-500/30',
      accentText: 'text-amber-600 dark:text-amber-400',
      staffCount: 5,
      duties: [
        'การวางแผนอัตรากำลังและกำหนดตำแหน่งข้าราชการครู',
        'การรักษาวินัย จรรยาบรรณวิชาชีพ และการเสริมสร้างขวัญกำลังใจ',
        'การประเมินผลการปฏิบัติงานและการเลื่อนขั้นเงินเดือน (ว15/2561)',
        'การพัฒนาบุคลากรและการประเมินวิทยฐานะ (PA ว9/2564)',
      ],
      members: [
        { name: 'นายธวัชชัย เหลืองโอฬาร', position: 'ครูชำนาญการ (คศ. 2)' },
        { name: 'นางสาวศิริพร บุญรักษา', position: 'ครูผู้ช่วย' },
        { name: 'นางวิมลรัตน์ สุขประเสริฐ', position: 'ครูชำนาญการ (คศ. 2)' },
      ],
    },
    {
      id: 'general',
      title: 'ฝ่ายบริหารทั่วไป',
      titleEn: 'General & Student Affairs',
      headName: 'นายธวัชชัย เหลืองโอฬาร',
      headPosition: 'ครู (คศ. 2)',
      headStanding: 'ชำนาญการ',
      icon: Shield,
      accentColor: 'indigo-500',
      accentBg: 'bg-indigo-50 dark:bg-indigo-500/10',
      accentBorder: 'border-indigo-500/30',
      accentText: 'text-indigo-600 dark:text-indigo-400',
      staffCount: 6,
      duties: [
        'การบริหารอาคารสถานที่ สภาพแวดล้อม และสุขาภิบาลโรงเรียน',
        'ระบบดูแลช่วยเหลือนักเรียน ส่งเสริมวินัย และประชาธิปไตย',
        'งานสารบรรณ ธุรการกลาง ยานพาหนะ และความปลอดภัย',
        'การระดมทรัพยากรเพื่อการศึกษาและสัมพันธ์ชุมชนเครือข่าย',
      ],
      members: [
        { name: 'นายสมศักดิ์ รักถิ่น', position: 'ครูชำนาญการ (คศ. 2)' },
        { name: 'นางสาวปวีณา พรหมมา', position: 'ครู (คศ. 1)' },
        { name: 'นายไพโรจน์ ช่างไม้', position: 'พนักงานบริการ/นักการภารโรง' },
      ],
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Header Strip */}
      <div className="bg-white dark:bg-[#141b24] p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 text-xs font-semibold uppercase tracking-wider">
            <Layers className="w-4 h-4 shrink-0" />
            <span>School Governance & Command Structure</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
            ผังโครงสร้างการบริหารงานสถานศึกษา
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            โครงสร้างการบริหาร 4 ฝ่าย ตามพระราชบัญญัติระเบียบบริหารราชการกระทรวงศึกษาธิการ และระเบียบ สพฐ.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="px-3 py-1 rounded-full text-xs font-mono font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80">
            รวม 4 ฝ่ายบริหาร • 21 บุคลากร
          </span>
        </div>
      </div>

      {/* 2. Visual Hierarchy Tree Diagram */}
      <div className="bg-slate-50/70 dark:bg-[#0d141e] p-4 sm:p-8 rounded-2xl border border-slate-200/90 dark:border-slate-800/80 shadow-sm relative overflow-hidden">
        
        {/* ================================================================= */}
        {/* LEVEL 1: TOP EXECUTIVE NODE & LATERAL ADVISORY NODE               */}
        {/* ================================================================= */}
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6 relative z-10">
          
          {/* Main Executive Node (Director) */}
          <div className="w-full md:w-[380px] bg-white dark:bg-[#121822] p-4 sm:p-5 rounded-2xl border-2 border-sky-500/70 shadow-lg relative text-left">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-md shrink-0">
                <School className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30 whitespace-nowrap">
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
              <span className="truncate" title="โรงเรียนชุมชนบ้านตะขบ สพป.นม. 3">โรงเรียนชุมชนบ้านตะขบ</span>
              <span className="font-mono text-slate-400 dark:text-slate-500 shrink-0">สพป.นม. 3</span>
            </div>
          </div>

          {/* Lateral Connector Link (Desktop Horizontal / Mobile Vertical) */}
          <div className="hidden md:flex items-center text-slate-400 dark:text-slate-600">
            <div className="w-8 border-t-2 border-dashed border-slate-300 dark:border-slate-700" />
          </div>

          {/* Lateral Advisory Node: School Board (คณะกรรมการสถานศึกษาขั้นพื้นฐาน) */}
          <div className="w-full md:w-[320px] bg-slate-50 dark:bg-[#101723] p-4 rounded-xl border border-dashed border-amber-500/40 shadow-sm relative text-left">
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
                <h4 className="text-xs font-bold text-slate-900 dark:text-white mt-0.5 truncate" title="คณะกรรมการสถานศึกษาขั้นพื้นฐาน (9 ท่าน)">
                  คณะกรรมการสถานศึกษาฯ
                </h4>
                <div className="text-[11px] text-slate-600 dark:text-slate-400 truncate" title="ประธาน: นายสมควร มีชัย">
                  ประธาน: นายสมควร มีชัย (รวม 9 ท่าน)
                </div>
              </div>
            </div>
            <div className="mt-2 text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>ให้ความเห็นชอบแผนและงบประมาณ</span>
              <span className="text-amber-600 dark:text-amber-400 font-medium">กฎกระทรวง 2546</span>
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
        {/* LEVEL 2: 4 CORE ADMINISTRATIVE DIVISIONS (4 ฝ่ายบริหารงาน)        */}
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
                  {/* Division Header */}
                  <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`p-2 rounded-xl ${div.accentBg} ${div.accentText} shrink-0`}>
                        <Icon className="w-5 h-5 shrink-0" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate" title={div.title}>
                          {div.title}
                        </h4>
                        <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 block truncate" title={div.titleEn}>
                          {div.titleEn}
                        </span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/90 dark:border-slate-700 shrink-0">
                      {div.staffCount} ท่าน
                    </span>
                  </div>

                  {/* Division Head Sub-Card */}
                  <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-[#101723] border border-slate-200/80 dark:border-slate-800/80">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        หัวหน้าฝ่ายบริหาร
                      </span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${div.accentBg} ${div.accentText} border ${div.accentBorder}`}>
                        หัวหน้าฝ่าย
                      </span>
                    </div>
                    <div className="font-bold text-xs text-slate-900 dark:text-white truncate" title={div.headName}>
                      {div.headName}
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 flex items-center justify-between">
                      <span className="truncate" title={div.headPosition}>{div.headPosition}</span>
                      <span className="font-medium text-slate-500 dark:text-slate-400 shrink-0">
                        {div.headStanding}
                      </span>
                    </div>
                  </div>

                  {/* Core Scopes Preview (Single-line chips for uniform height) */}
                  <div className="mt-3.5 space-y-1.5">
                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block">
                      ภารกิจหลัก (Core Scopes):
                    </span>
                    <div className="space-y-1">
                      {div.duties.slice(0, 2).map((duty, idx) => (
                        <div
                          key={idx}
                          className="text-[11px] text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-[#101723] px-2.5 py-1 rounded-lg border border-slate-200/60 dark:border-slate-800/60 truncate flex items-center gap-1.5"
                          title={duty}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${div.accentText.includes('sky') ? 'bg-sky-500' : div.accentText.includes('emerald') ? 'bg-emerald-500' : div.accentText.includes('amber') ? 'bg-amber-500' : 'bg-indigo-500'}`} />
                          <span className="truncate">{duty}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Expanded Section (Progressive Disclosure) */}
                  {isExpanded && (
                    <div className="mt-3.5 pt-3 border-t border-slate-200/80 dark:border-slate-800/80 space-y-3 animate-in fade-in duration-150">
                      {/* Full Duties List */}
                      <div>
                        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                          ขอบข่ายภารกิจทั้งหมด:
                        </span>
                        <ul className="space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
                          {div.duties.map((duty, dIdx) => (
                            <li key={dIdx} className="flex items-start gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                              <span className="leading-snug">{duty}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Division Personnel */}
                      <div>
                        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                          บุคลากรในฝ่าย ({div.members.length + 1} ท่าน):
                        </span>
                        <div className="space-y-1">
                          <div className="p-1.5 rounded bg-slate-100 dark:bg-slate-800/60 text-[11px] flex items-center justify-between">
                            <span className="font-semibold text-slate-900 dark:text-white truncate" title={div.headName}>
                              {div.headName}
                            </span>
                            <span className="text-[10px] text-sky-600 dark:text-sky-400 font-medium shrink-0">
                              (หัวหน้าฝ่าย)
                            </span>
                          </div>
                          {div.members.map((mem, mIdx) => (
                            <div
                              key={mIdx}
                              className="p-1.5 rounded bg-slate-50 dark:bg-[#101723] text-[11px] flex items-center justify-between text-slate-700 dark:text-slate-300"
                            >
                              <span className="truncate" title={mem.name}>{mem.name}</span>
                              <span className="text-[10px] text-slate-500 shrink-0 ml-1">
                                {mem.position}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Node Footer Accordion Toggle Button */}
                <div className="p-3 bg-slate-50/80 dark:bg-[#0f1520] border-t border-slate-100 dark:border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => toggleDivision(div.id)}
                    className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/50 transition-colors duration-200 cursor-pointer"
                  >
                    <span>{isExpanded ? 'ย่อรายละเอียด' : 'ดูขอบข่ายภารกิจและบุคลากร'}</span>
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
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#111822] border border-slate-200/90 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm">
        <div className="flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
          <span>
            สายการบังคับบัญชาอ้างอิงตามกรอบอัตรากำลังและโครงสร้าง 4 ฝ่ายของ สพฐ. กระทรวงศึกษาธิการ
          </span>
        </div>
        <span className="font-mono text-[11px] text-slate-500">
          OBEC Administrative Standard 2569-2570
        </span>
      </div>
    </div>
  );
};
