'use client';

/**
 * ============================================================================
 * ManStat-Modern: View Organization Chart (โครงสร้างการบริหารสถานศึกษา)
 * ============================================================================
 * - Ban Takhob Community School 4 Primary Divisions:
 *   1. ฝ่ายบริหารวิชาการ
 *   2. ฝ่ายบริหารงบประมาณ
 *   3. ฝ่ายบริหารงานบุคคล
 *   4. ฝ่ายบริหารทั่วไปและกิจการนักเรียน
 * - Zero emojis, pure Lucide SVG icons with strict 8px gap.
 * ============================================================================
 */

import React from 'react';
import { School, BookOpen, DollarSign, Users, Shield, Layers } from 'lucide-react';

export const ViewOrgChart: React.FC = () => {
  const divisions = [
    {
      title: 'ฝ่ายบริหารวิชาการ',
      head: 'นายพันธ์ธนัต ภวฤทธิ์นาคินทร์',
      role: 'ครูชำนาญการพิเศษ (หัวหน้าฝ่าย)',
      icon: BookOpen,
      iconColor: 'text-sky-400',
      bgColor: 'bg-sky-500/10',
      duties: [
        'การพัฒนาหลักสูตรสถานศึกษา',
        'การพัฒนากระบวนการเรียนรู้และการวัดผล',
        'การวิจัยเพื่อพัฒนาคุณภาพการศึกษา',
        'การพัฒนาสื่อนวัตกรรมและเทคโนโลยี',
      ],
    },
    {
      title: 'ฝ่ายบริหารงบประมาณ',
      head: 'นางสาวทัชชกร ช่วยจังหรีด',
      role: 'ครูชำนาญการพิเศษ (หัวหน้าฝ่าย/การเงิน)',
      icon: DollarSign,
      iconColor: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      duties: [
        'การจัดทำและเสนอของบประมาณ',
        'การบริหารการเงินและการเบิกจ่าย',
        'งานพัสดุ สินทรัพย์ และทะเบียนครุภัณฑ์',
        'การตรวจสอบและรายงานการเงิน',
      ],
    },
    {
      title: 'ฝ่ายบริหารงานบุคคล',
      head: 'นางสาวกุสุมาลย์กมล พราหมณ์ตะขบ',
      role: 'ครูชำนาญการพิเศษ (หัวหน้าฝ่าย)',
      icon: Users,
      iconColor: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      duties: [
        'การวางแผนอัตรากำลังและกำหนดตำแหน่ง',
        'ทะเบียนประวัติ ก.พ.7 และข้อมูลสารสนเทศ',
        'การลา วินัย และการรักษาวินัยของข้าราชการ',
        'การประเมินผลการปฏิบัติงานและการเลื่อนขั้น (ว15/2561)',
      ],
    },
    {
      title: 'ฝ่ายบริหารทั่วไปและกิจการนักเรียน',
      head: 'นายธวัชชัย เหลืองโอฬาร',
      role: 'ครูชำนาญการพิเศษ (หัวหน้าฝ่าย)',
      icon: Shield,
      iconColor: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      duties: [
        'งานสารบรรณและประชาสัมพันธ์',
        'งานอาคารสถานที่และสภาพแวดล้อม',
        'งานกิจการนักเรียนและส่งเสริมระเบียบวินัย',
        'ความปลอดภัยในสถานศึกษาและเครือข่ายชุมชน',
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#141b24] p-5 rounded-2xl border border-slate-800">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Layers className="w-5 h-5 text-sky-400 shrink-0" />
          <span>แผนผังโครงสร้างการบริหารงานโรงเรียนชุมชนบ้านตะขบ</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          โครงสร้างการบริหารสถานศึกษา 4 ฝ่าย ตามพระราชบัญญัติระเบียบบริหารราชการกระทรวงศึกษาธิการ
        </p>
      </div>

      {/* Top Director Card */}
      <div className="max-w-md mx-auto">
        <div className="bg-[#141b24] p-6 rounded-2xl border-2 border-sky-500/60 shadow-xl text-center bg-gradient-to-b from-[#1b2838] to-[#121c27]">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-sky-600 to-blue-800 border-2 border-sky-400 mx-auto flex items-center justify-center text-white mb-3 shadow-md">
            <School className="w-8 h-8" />
          </div>
          <div className="text-base font-bold text-white">นายธีรศักดิ์ มโนธรรม</div>
          <div className="text-xs text-sky-300 font-medium mt-0.5">ผู้อำนวยการสถานศึกษา</div>
          <p className="text-[11px] text-slate-400 mt-2">
            ผู้บริหารสถานศึกษา โรงเรียนชุมชนบ้านตะขบ สพป.นม. 3
          </p>
        </div>
      </div>

      {/* Connector line */}
      <div className="w-0.5 h-6 bg-sky-500/50 mx-auto" />

      {/* 4 Divisions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {divisions.map((div, idx) => {
          const Icon = div.icon;
          return (
            <div
              key={idx}
              className="bg-[#111823]/80 p-5 rounded-2xl border border-slate-800/80 hover:border-sky-500/40 hover:shadow-lg hover:shadow-black/20 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-2.5 mb-3">
                  <div className={`p-2 rounded-xl ${div.bgColor} ${div.iconColor}`}>
                    <Icon className="w-5 h-5 shrink-0" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white leading-tight">{div.title}</h3>
                  </div>
                </div>

                <div className="bg-[#101822] p-3 rounded-xl border border-slate-800/80 mb-3 text-xs">
                  <span className="text-[10px] text-slate-500 block">หัวหน้าฝ่าย:</span>
                  <div className="font-semibold text-slate-100 truncate" title={div.head}>{div.head}</div>
                  <div className="text-[11px] text-sky-300 mt-0.5 truncate" title={div.role}>{div.role}</div>
                </div>

                <div>
                  <span className="text-[11px] text-slate-400 block mb-1.5 font-medium">
                    ขอบข่ายภารกิจหลัก:
                  </span>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {div.duties.map((duty, dIdx) => (
                      <li key={dIdx} className="flex items-start gap-2">
                        <span className="text-sky-400 font-bold">•</span>
                        <span className="leading-relaxed">{duty}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
