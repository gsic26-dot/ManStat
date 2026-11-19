'use client';

/**
 * ============================================================================
 * ManStat-Modern: View Teacher Workload (ภาระงานบุคลากรและข้อตกลง PA 4 หมวด)
 * ============================================================================
 * - Criteria per OPSC Guidelines ว9/2564 & ว21/2564
 * - Full 4 Categories restored from legacy ManStat (d:\GAS-Projects\ManStat):
 *   1. งานสอนและการจัดการเรียนรู้ (Teaching & Learning Management)
 *   2. งานบริหารและงานประจำฝ่าย/กลุ่มงาน (Department & Administration Duties)
 *   3. งานโครงการ กิจกรรม และงานที่ได้รับมอบหมายพิเศษ (Projects & Special Assignments)
 *   4. งานดูแลช่วยเหลือนักเรียน งานครูที่ปรึกษา และเวรปฏิบัติหน้าที่ (Student Care & Duty Shifts)
 * - Complete Standard Preset Dropdowns (40+ tasks with autofill for Title, SubGroup, Role, and Hours)
 * - Fully customizable: Add, edit, delete tasks across all 4 categories
 * - Master-Detail Accordion Rows (Zero Horizontal Overflow, Single-line Scannability)
 * - Zero emojis, pure Lucide SVG icons with strict 8px standard gap.
 * ============================================================================
 */

import React, { useState, useMemo } from 'react';
import {
  Briefcase,
  CheckCircle2,
  AlertCircle,
  Search,
  BookOpen,
  Building,
  Calendar,
  Shield,
  PlusCircle,
  ChevronRight,
  Trash2,
  X,
  Plus,
  Clock,
  Layers,
} from 'lucide-react';
import { INITIAL_TEACHERS } from '@/lib/data/schoolData';
import { evaluatePAWorkload } from '@/lib/regulations/khurusapha-and-pa';

export type WorkloadCategory =
  | 'งานสอนและการจัดการเรียนรู้'
  | 'งานบริหารและงานประจำฝ่าย/กลุ่มงาน'
  | 'งานโครงการ กิจกรรม และงานที่ได้รับมอบหมายพิเศษ'
  | 'งานดูแลช่วยเหลือนักเรียน งานครูที่ปรึกษา และเวรปฏิบัติหน้าที่';

export interface WorkloadItem {
  id: string;
  teacherId: string;
  category: WorkloadCategory;
  title: string;
  subGroupOrLevel?: string;
  hoursPerWeek: number;
  roleInTask: string;
  orderOrRef?: string;
  status: 'กำลังดำเนินการ' | 'เสร็จสิ้นแล้ว' | 'งานประจำต่อเนื่อง';
  coEmp?: string;
  courseCode?: string;
  type?: 'MAIN' | 'TA';
}

export const WORKLOAD_CATEGORY_PRESETS: Record<
  WorkloadCategory,
  Array<{ title: string; sub: string; role: string; suggestedHours: number }>
> = {
  'งานสอนและการจัดการเรียนรู้': [
    { title: 'งานจัดการเรียนการสอนตามกลุ่มสาระการเรียนรู้', sub: 'กลุ่มสาระฯ', role: 'ผู้สอน', suggestedHours: 5 },
    { title: 'งานจัดทำแผนการจัดการเรียนรู้และบันทึกหลังสอน', sub: 'แผนการสอน', role: 'ผู้สอน', suggestedHours: 2 },
    { title: 'งานวัดผลและประเมินผลการเรียนรู้ในชั้นเรียน', sub: 'วัดผลประเมินผล', role: 'ผู้สอน', suggestedHours: 2 },
    { title: 'งานพัฒนาหลักสูตรกลุ่มสาระและการจัดการเรียนรู้', sub: 'หลักสูตรกลุ่มสาระฯ', role: 'ผู้รับผิดชอบหลัก', suggestedHours: 2 },
    { title: 'งานผลิตและพัฒนาสื่อ นวัตกรรม และเทคโนโลยีการศึกษา', sub: 'สื่อนวัตกรรม', role: 'ผู้รับผิดชอบหลัก', suggestedHours: 2 },
    { title: 'งานวิจัยในชั้นเรียนเพื่อพัฒนาคุณภาพการเรียนรู้', sub: 'วิจัยในชั้นเรียน', role: 'ผู้สอน', suggestedHours: 2 },
    { title: 'งานนิเทศการสอนภายในกลุ่มสาระการเรียนรู้', sub: 'นิเทศการสอน', role: 'ผู้รับผิดชอบหลัก', suggestedHours: 2 },
    { title: 'งานการสอนกิจกรรมพัฒนาผู้เรียน (ลูกเสือ/ชุมนุม)', sub: 'กิจกรรมพัฒนาผู้เรียน', role: 'ผู้สอน', suggestedHours: 2 },
    { title: 'งานผู้ช่วยสอน (Teaching Assistant - TA)', sub: 'ผู้ช่วยสอน TA', role: 'ผู้ช่วยสอน', suggestedHours: 3 },
  ],
  'งานบริหารและงานประจำฝ่าย/กลุ่มงาน': [
    { title: 'งานบริหารวิชาการและเลขานุการฝ่าย', sub: 'ฝ่ายบริหารวิชาการ', role: 'หัวหน้าฝ่าย', suggestedHours: 4 },
    { title: 'งานพัฒนาหลักสูตรสถานศึกษา', sub: 'ฝ่ายบริหารวิชาการ', role: 'ผู้รับผิดชอบหลัก', suggestedHours: 2 },
    { title: 'งานทะเบียนนักเรียนและเอกสารหลักฐานทางการศึกษา', sub: 'งานทะเบียน', role: 'นายทะเบียน', suggestedHours: 3 },
    { title: 'งานวัดผล ประเมินผล และทดสอบทางการศึกษา', sub: 'งานวัดผล', role: 'หัวหน้างานวัดผล', suggestedHours: 3 },
    { title: 'งานห้องสมุดและแหล่งเรียนรู้', sub: 'งานห้องสมุด', role: 'ผู้รับผิดชอบห้องสมุด', suggestedHours: 2 },
    { title: 'งานจัดการเรียนรวมและดูแลเด็กพิเศษ', sub: 'งานเรียนรวม', role: 'ผู้รับผิดชอบหลัก', suggestedHours: 2 },
    { title: 'งานบริหารงบประมาณและแผนปฏิบัติการ', sub: 'ฝ่ายบริหารงบประมาณ', role: 'หัวหน้าฝ่าย', suggestedHours: 4 },
    { title: 'งานการเงินและบัญชีสถานศึกษา', sub: 'งานการเงิน', role: 'เจ้าหน้าที่การเงิน', suggestedHours: 4 },
    { title: 'งานพัสดุและสินทรัพย์สถานศึกษา', sub: 'งานพัสดุ', role: 'เจ้าหน้าที่พัสดุ', suggestedHours: 4 },
    { title: 'งานจัดซื้อจัดจ้างภาครัฐ (e-GP)', sub: 'งานพัสดุ', role: 'เจ้าหน้าที่พัสดุ', suggestedHours: 3 },
    { title: 'งานบริหารงบประมาณอาหารกลางวันและสวัสดิการ', sub: 'งานสวัสดิการ', role: 'ผู้รับผิดชอบหลัก', suggestedHours: 2 },
    { title: 'งานบริหารงานบุคคลและอัตรากำลัง', sub: 'ฝ่ายบริหารงานบุคคล', role: 'หัวหน้าฝ่าย', suggestedHours: 4 },
    { title: 'งานวิทยฐานะและการประเมินผลการปฏิบัติงาน (PA/DPA)', sub: 'งานวิทยฐานะ', role: 'ผู้รับผิดชอบหลัก', suggestedHours: 3 },
    { title: 'งานพัฒนาบุคลากร อบรม และยกย่องเชิดชูเกียรติ', sub: 'งานพัฒนาบุคลากร', role: 'ผู้รับผิดชอบหลัก', suggestedHours: 2 },
    { title: 'งานสิทธิประโยชน์ เครื่องราชอิสริยาภรณ์ และใบอนุญาตประกอบวิชาชีพ', sub: 'งานสิทธิประโยชน์', role: 'ผู้รับผิดชอบหลัก', suggestedHours: 2 },
    { title: 'งานวินัย จรรยาบรรณ และการรักษาวินัย', sub: 'งานวินัย', role: 'ผู้รับผิดชอบหลัก', suggestedHours: 2 },
    { title: 'งานสารบรรณและธุรการโรงเรียน', sub: 'ฝ่ายบริหารทั่วไป', role: 'เจ้าหน้าที่สารบรรณ', suggestedHours: 4 },
    { title: 'งานอาคารสถานที่ ภูมิทัศน์ และสิ่งแวดล้อม', sub: 'งานอาคารสถานที่', role: 'ผู้รับผิดชอบหลัก', suggestedHours: 3 },
    { title: 'งานเทคโนโลยีสารสนเทศ เครือข่าย และความปลอดภัยข้อมูล (ICT)', sub: 'งาน ICT', role: 'ผู้ดูแลระบบเครือข่าย', suggestedHours: 3 },
    { title: 'งานยานพาหนะและการเดินทางไปราชการ', sub: 'งานยานพาหนะ', role: 'ผู้รับผิดชอบหลัก', suggestedHours: 2 },
    { title: 'งานประชาสัมพันธ์และชุมชนสัมพันธ์', sub: 'งานประชาสัมพันธ์', role: 'ผู้รับผิดชอบหลัก', suggestedHours: 2 },
    { title: 'งานอนามัยโรงเรียนและประกันอุบัติเหตุ', sub: 'งานอนามัย', role: 'ครูอนามัย', suggestedHours: 2 },
    { title: 'งานประกันคุณภาพการศึกษาและจัดทำรายงาน SAR', sub: 'งานประกันคุณภาพ', role: 'ผู้รับผิดชอบหลัก', suggestedHours: 3 },
    { title: 'งานควบคุมภายในและประเมินความเสี่ยง', sub: 'งานควบคุมภายใน', role: 'ผู้รับผิดชอบหลัก', suggestedHours: 2 },
    { title: 'งานส่งเสริมระเบียบวินัยและสภานักเรียน', sub: 'งานกิจการนักเรียน', role: 'ที่ปรึกษาสภานักเรียน', suggestedHours: 2 },
  ],
  'งานโครงการ กิจกรรม และงานที่ได้รับมอบหมายพิเศษ': [
    { title: 'งานผู้รับผิดชอบโครงการตามแผนปฏิบัติการประจำปี', sub: 'โครงการตามแผนฯ', role: 'ผู้รับผิดชอบหลัก', suggestedHours: 3 },
    { title: 'งานคณะกรรมการดำเนินงานจัดกิจกรรมวันสำคัญของสถานศึกษา', sub: 'กิจกรรมสถานศึกษา', role: 'กรรมการ / ผู้ร่วมงาน', suggestedHours: 2 },
    { title: 'งานคณะกรรมการจัดแข่งขันกีฬาภายใน (กีฬาสี)', sub: 'กีฬาสี / กีฬาภายใน', role: 'กรรมการ / ผู้ร่วมงาน', suggestedHours: 2 },
    { title: 'งานฝึกซ้อมและควบคุมนักเรียนเข้าแข่งขันวิชาการ', sub: 'แข่งขันทักษะวิชาการ', role: 'ผู้ฝึกสอน', suggestedHours: 3 },
    { title: 'งานคณะกรรมการจัดกิจกรรมค่ายพักแรมลูกเสือ-เนตรนารี', sub: 'ค่ายลูกเสือ', role: 'กรรมการ / ผู้ร่วมงาน', suggestedHours: 2 },
    { title: 'งานคณะกรรมการตรวจรับพัสดุและตรวจนับพัสดุประจำปี', sub: 'ตรวจรับ/ตรวจนับพัสดุ', role: 'กรรมการ', suggestedHours: 2 },
    { title: 'งานคณะกรรมการสอบคัดเลือกหรือสอบบรรจุ', sub: 'การสอบคัดเลือก', role: 'กรรมการ', suggestedHours: 2 },
    { title: 'งานสนองนโยบายเร่งด่วนของกระทรวงศึกษาธิการ / สพฐ.', sub: 'นโยบายเร่งด่วน', role: 'ผู้รับผิดชอบหลัก', suggestedHours: 3 },
    { title: 'งานประสานงานและบริการชุมชนเป็นกรณีพิเศษ', sub: 'บริการชุมชน', role: 'ผู้ร่วมงาน', suggestedHours: 2 },
  ],
  'งานดูแลช่วยเหลือนักเรียน งานครูที่ปรึกษา และเวรปฏิบัติหน้าที่': [
    { title: 'งานครูที่ปรึกษาและดูแลนักเรียนประจำชั้น', sub: 'ระดับชั้นประจำห้อง', role: 'ครูที่ปรึกษา', suggestedHours: 2 },
    { title: 'งานระบบดูแลช่วยเหลือนักเรียนและการคัดกรอง', sub: 'ระบบดูแลฯ', role: 'ผู้รับผิดชอบหลัก', suggestedHours: 2 },
    { title: 'งานเยี่ยมบ้านนักเรียนและประสานงานผู้ปกครอง (100%)', sub: 'เยี่ยมบ้าน 100%', role: 'ครูที่ปรึกษา', suggestedHours: 2 },
    { title: 'งานติดตามพฤติกรรมและการมาเรียนของนักเรียน', sub: 'งานกิจการนักเรียน', role: 'ผู้รับผิดชอบหลัก', suggestedHours: 2 },
    { title: 'งานคัดกรองและบริหารทุนการศึกษานักเรียนยากจน (กสศ. CCT)', sub: 'ทุน กสศ. CCT', role: 'ผู้รับผิดชอบหลัก', suggestedHours: 2 },
    { title: 'งานให้คำปรึกษาและช่วยเหลือนักเรียน (งานแนะแนว)', sub: 'งานแนะแนว', role: 'ผู้ให้คำปรึกษา', suggestedHours: 2 },
    { title: 'งานเวรประจำวันหน้าประตูโรงเรียน', sub: 'เวรประจำวัน', role: 'ครูเวร', suggestedHours: 2 },
    { title: 'งานเวรรักษาการณ์สถานศึกษา (กลางวัน/กลางคืน)', sub: 'เวรรักษาการณ์', role: 'ครูเวร', suggestedHours: 2 },
    { title: 'งานเวรประจำจุดและเวรดูแลความปลอดภัยนักเรียน', sub: 'เวรจุดเสี่ยง', role: 'ครูเวร', suggestedHours: 2 },
    { title: 'งานผู้ตรวจเวรประจำวัน', sub: 'ตรวจเวรประจำวัน', role: 'ผู้ตรวจเวร', suggestedHours: 2 },
  ],
};

const INITIAL_WORKLOAD_ITEMS: WorkloadItem[] = [
  // T002 - นางศิริพร บุญช่วย
  {
    id: 'WL-001',
    teacherId: 'T002',
    category: 'งานสอนและการจัดการเรียนรู้',
    title: 'ภาษาไทยพื้นฐาน',
    courseCode: 'ท15101',
    type: 'MAIN',
    subGroupOrLevel: 'ป.5/1',
    hoursPerWeek: 5,
    roleInTask: 'ผู้สอน',
    orderOrRef: 'คำสั่งที่ 12/2569',
    status: 'กำลังดำเนินการ',
  },
  {
    id: 'WL-002',
    teacherId: 'T002',
    category: 'งานสอนและการจัดการเรียนรู้',
    title: 'ภาษาไทยเพิ่มเติม',
    courseCode: 'ท15201',
    type: 'MAIN',
    subGroupOrLevel: 'ป.5/2',
    hoursPerWeek: 4,
    roleInTask: 'ผู้สอน',
    orderOrRef: 'คำสั่งที่ 12/2569',
    status: 'กำลังดำเนินการ',
  },
  {
    id: 'WL-003',
    teacherId: 'T002',
    category: 'งานสอนและการจัดการเรียนรู้',
    title: 'ผู้ช่วยสอน (TA) ทักษะภาษาและการอ่าน',
    type: 'TA',
    subGroupOrLevel: 'ป.4/1',
    hoursPerWeek: 3,
    roleInTask: 'ผู้ช่วยสอน',
    orderOrRef: 'คำสั่งที่ 15/2569',
    status: 'กำลังดำเนินการ',
  },
  {
    id: 'WL-004',
    teacherId: 'T002',
    category: 'งานสอนและการจัดการเรียนรู้',
    title: 'กิจกรรมลูกเสือ - เนตรนารี',
    type: 'MAIN',
    subGroupOrLevel: 'ป.5',
    hoursPerWeek: 2,
    roleInTask: 'ผู้สอน',
    orderOrRef: 'คำสั่งที่ 18/2569',
    status: 'กำลังดำเนินการ',
  },
  {
    id: 'WL-005',
    teacherId: 'T002',
    category: 'งานบริหารและงานประจำฝ่าย/กลุ่มงาน',
    title: 'งานบริหารวิชาการและเลขานุการฝ่าย',
    subGroupOrLevel: 'ฝ่ายบริหารวิชาการ',
    hoursPerWeek: 4,
    roleInTask: 'หัวหน้าฝ่าย',
    orderOrRef: 'คำสั่งที่ 05/2569',
    status: 'งานประจำต่อเนื่อง',
  },
  {
    id: 'WL-006',
    teacherId: 'T002',
    category: 'งานโครงการ กิจกรรม และงานที่ได้รับมอบหมายพิเศษ',
    title: 'งานผู้รับผิดชอบโครงการตามแผนปฏิบัติการประจำปี',
    subGroupOrLevel: 'โครงการพัฒนาการอ่านออกเขียนได้',
    hoursPerWeek: 3,
    roleInTask: 'ผู้รับผิดชอบหลัก',
    orderOrRef: 'คำสั่งที่ 22/2569',
    status: 'กำลังดำเนินการ',
  },
  {
    id: 'WL-007',
    teacherId: 'T002',
    category: 'งานดูแลช่วยเหลือนักเรียน งานครูที่ปรึกษา และเวรปฏิบัติหน้าที่',
    title: 'งานครูที่ปรึกษาและดูแลนักเรียนประจำชั้น',
    subGroupOrLevel: 'ป.5/1',
    hoursPerWeek: 2,
    roleInTask: 'ครูที่ปรึกษา',
    orderOrRef: 'คำสั่งที่ 02/2569',
    status: 'งานประจำต่อเนื่อง',
  },
  {
    id: 'WL-008',
    teacherId: 'T002',
    category: 'งานดูแลช่วยเหลือนักเรียน งานครูที่ปรึกษา และเวรปฏิบัติหน้าที่',
    title: 'งานเวรประจำวันหน้าประตูโรงเรียน',
    subGroupOrLevel: 'เวรวันจันทร์',
    hoursPerWeek: 2,
    roleInTask: 'ครูเวร',
    orderOrRef: 'คำสั่งที่ 08/2569',
    status: 'งานประจำต่อเนื่อง',
  },

  // T003 - นายสมพงษ์ ใจดี
  {
    id: 'WL-009',
    teacherId: 'T003',
    category: 'งานสอนและการจัดการเรียนรู้',
    title: 'คณิตศาสตร์พื้นฐาน',
    courseCode: 'ค16101',
    type: 'MAIN',
    subGroupOrLevel: 'ป.6/1',
    hoursPerWeek: 5,
    roleInTask: 'ผู้สอน',
    orderOrRef: 'คำสั่งที่ 12/2569',
    status: 'กำลังดำเนินการ',
  },
  {
    id: 'WL-010',
    teacherId: 'T003',
    category: 'งานสอนและการจัดการเรียนรู้',
    title: 'ผู้ช่วยสอน (TA) วิทยาการคำนวณ',
    type: 'TA',
    subGroupOrLevel: 'ม.1',
    hoursPerWeek: 4,
    roleInTask: 'ผู้ช่วยสอน',
    orderOrRef: 'คำสั่งที่ 15/2569',
    status: 'กำลังดำเนินการ',
  },
  {
    id: 'WL-011',
    teacherId: 'T003',
    category: 'งานสอนและการจัดการเรียนรู้',
    title: 'แนะแนวและการศึกษาต่อ',
    type: 'MAIN',
    subGroupOrLevel: 'ป.6',
    hoursPerWeek: 3,
    roleInTask: 'ผู้สอน',
    orderOrRef: 'คำสั่งที่ 12/2569',
    status: 'กำลังดำเนินการ',
  },
  {
    id: 'WL-012',
    teacherId: 'T003',
    category: 'งานบริหารและงานประจำฝ่าย/กลุ่มงาน',
    title: 'งานบริหารงานบุคคลและอัตรากำลัง',
    subGroupOrLevel: 'ฝ่ายบริหารงานบุคคล',
    hoursPerWeek: 4,
    roleInTask: 'หัวหน้าฝ่าย',
    orderOrRef: 'คำสั่งที่ 05/2569',
    status: 'งานประจำต่อเนื่อง',
  },
  {
    id: 'WL-013',
    teacherId: 'T003',
    category: 'งานโครงการ กิจกรรม และงานที่ได้รับมอบหมายพิเศษ',
    title: 'งานคณะกรรมการจัดกิจกรรมค่ายพักแรมลูกเสือ-เนตรนารี',
    subGroupOrLevel: 'ค่ายลูกเสือระดับอำเภอ',
    hoursPerWeek: 2,
    roleInTask: 'กรรมการ / ผู้ร่วมงาน',
    orderOrRef: 'คำสั่งที่ 31/2569',
    status: 'กำลังดำเนินการ',
  },
  {
    id: 'WL-014',
    teacherId: 'T003',
    category: 'งานดูแลช่วยเหลือนักเรียน งานครูที่ปรึกษา และเวรปฏิบัติหน้าที่',
    title: 'งานครูที่ปรึกษาและดูแลนักเรียนประจำชั้น',
    subGroupOrLevel: 'ป.6/1',
    hoursPerWeek: 2,
    roleInTask: 'ครูที่ปรึกษา',
    orderOrRef: 'คำสั่งที่ 02/2569',
    status: 'งานประจำต่อเนื่อง',
  },
  {
    id: 'WL-015',
    teacherId: 'T003',
    category: 'งานดูแลช่วยเหลือนักเรียน งานครูที่ปรึกษา และเวรปฏิบัติหน้าที่',
    title: 'งานเวรรักษาการณ์สถานศึกษา (กลางวัน/กลางคืน)',
    subGroupOrLevel: 'เวรผลัด 2',
    hoursPerWeek: 2,
    roleInTask: 'ครูเวร',
    orderOrRef: 'คำสั่งที่ 09/2569',
    status: 'งานประจำต่อเนื่อง',
  },

  // EXE-001 - นายธีรศักดิ์ มโนธรรม (ผอ.สถานศึกษา)
  {
    id: 'WL-016',
    teacherId: 'EXE-001',
    category: 'งานสอนและการจัดการเรียนรู้',
    title: 'งานการสอนกิจกรรมพัฒนาผู้เรียน (ลูกเสือ)',
    type: 'MAIN',
    subGroupOrLevel: 'ป.4-6',
    hoursPerWeek: 2,
    roleInTask: 'ผู้สอน',
    orderOrRef: 'คำสั่งที่ 18/2569',
    status: 'กำลังดำเนินการ',
  },
  {
    id: 'WL-017',
    teacherId: 'EXE-001',
    category: 'งานสอนและการจัดการเรียนรู้',
    title: 'งานนิเทศการสอนภายในกลุ่มสาระการเรียนรู้',
    type: 'MAIN',
    subGroupOrLevel: 'นิเทศทุกกลุ่มสาระ',
    hoursPerWeek: 4,
    roleInTask: 'ผู้รับผิดชอบหลัก',
    orderOrRef: 'คำสั่งที่ 14/2569',
    status: 'กำลังดำเนินการ',
  },
  {
    id: 'WL-018',
    teacherId: 'EXE-001',
    category: 'งานบริหารและงานประจำฝ่าย/กลุ่มงาน',
    title: 'งานบริหารสถานศึกษาและผู้อำนวยการสถานศึกษา',
    subGroupOrLevel: 'งานบริหาร 4 ฝ่าย',
    hoursPerWeek: 10,
    roleInTask: 'หัวหน้าสถานศึกษา',
    orderOrRef: 'พระราชบัญญัติระเบียบข้าราชการครูฯ',
    status: 'งานประจำต่อเนื่อง',
  },
  {
    id: 'WL-019',
    teacherId: 'EXE-001',
    category: 'งานโครงการ กิจกรรม และงานที่ได้รับมอบหมายพิเศษ',
    title: 'งานสนองนโยบายเร่งด่วนของกระทรวงศึกษาธิการ / สพฐ.',
    subGroupOrLevel: 'นโยบายเรียนดี มีความสุข',
    hoursPerWeek: 4,
    roleInTask: 'ผู้รับผิดชอบหลัก',
    orderOrRef: 'หนังสือ สพฐ. ด่วนที่สุด',
    status: 'กำลังดำเนินการ',
  },
  {
    id: 'WL-020',
    teacherId: 'EXE-001',
    category: 'งานดูแลช่วยเหลือนักเรียน งานครูที่ปรึกษา และเวรปฏิบัติหน้าที่',
    title: 'งานผู้ตรวจเวรประจำวัน',
    subGroupOrLevel: 'ตรวจเวรประจำสัปดาห์',
    hoursPerWeek: 2,
    roleInTask: 'ผู้ตรวจเวร',
    orderOrRef: 'คำสั่งที่ 08/2569',
    status: 'งานประจำต่อเนื่อง',
  },
];

export const ViewWorkload: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [tierFilter, setTierFilter] = useState<'ALL' | 'PASSED' | 'FAILED'>('ALL');
  const [expandedTeacherId, setExpandedTeacherId] = useState<string | null>(null);
  const [workloads, setWorkloads] = useState<WorkloadItem[]>(INITIAL_WORKLOAD_ITEMS);

  // Modal State for Workload Assignment Form
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [formTeacherId, setFormTeacherId] = useState<string>('');
  const [formCategory, setFormCategory] = useState<WorkloadCategory>('งานสอนและการจัดการเรียนรู้');
  const [formSelectedPreset, setFormSelectedPreset] = useState<string>('');
  const [formTitle, setFormTitle] = useState<string>('');
  const [formSubGroup, setFormSubGroup] = useState<string>('');
  const [formHours, setFormHours] = useState<number>(2);
  const [formRole, setFormRole] = useState<string>('ผู้รับผิดชอบหลัก');
  const [formOrderRef, setFormOrderRef] = useState<string>('');
  const [formStatus, setFormStatus] = useState<'กำลังดำเนินการ' | 'เสร็จสิ้นแล้ว' | 'งานประจำต่อเนื่อง'>('กำลังดำเนินการ');
  const [formCoEmp, setFormCoEmp] = useState<string>('');
  const [formCourseCode, setFormCourseCode] = useState<string>('');
  const [formType, setFormType] = useState<'MAIN' | 'TA'>('MAIN');

  const toggleExpand = (teacherId: string) => {
    setExpandedTeacherId((prev) => (prev === teacherId ? null : teacherId));
  };

  // Open Modal (Global or for specific teacher/category)
  const handleOpenAssignModal = (teacherId?: string, category?: WorkloadCategory) => {
    const targetTeacherId = teacherId || INITIAL_TEACHERS[0].id;
    const targetCat = category || 'งานสอนและการจัดการเรียนรู้';

    setFormTeacherId(targetTeacherId);
    setFormCategory(targetCat);
    setFormSelectedPreset('');
    setFormTitle('');
    setFormSubGroup('');
    setFormHours(2);
    setFormRole(targetCat === 'งานสอนและการจัดการเรียนรู้' ? 'ผู้สอน' : 'ผู้รับผิดชอบหลัก');
    setFormOrderRef('');
    setFormStatus('กำลังดำเนินการ');
    setFormCoEmp('');
    setFormCourseCode('');
    setFormType('MAIN');
    setIsModalOpen(true);
  };

  // When Category changes in modal, reset preset
  const handleCategoryChange = (newCat: WorkloadCategory) => {
    setFormCategory(newCat);
    setFormSelectedPreset('');
    setFormTitle('');
    setFormSubGroup('');
    setFormRole(newCat === 'งานสอนและการจัดการเรียนรู้' ? 'ผู้สอน' : 'ผู้รับผิดชอบหลัก');
    setFormHours(2);
  };

  // When Preset changes in modal, autofill
  const handlePresetChange = (presetTitle: string) => {
    setFormSelectedPreset(presetTitle);
    if (!presetTitle || presetTitle === '__CUSTOM__') {
      if (presetTitle === '__CUSTOM__') {
        setFormTitle('');
        setFormSubGroup('');
      }
      return;
    }

    const presets = WORKLOAD_CATEGORY_PRESETS[formCategory] || [];
    const found = presets.find((p) => p.title === presetTitle);
    if (found) {
      setFormTitle(found.title);
      setFormSubGroup(found.sub);
      setFormRole(found.role);
      setFormHours(found.suggestedHours);
    }
  };

  const handleSaveWorkload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTeacherId || !formTitle.trim()) return;

    const newEntry: WorkloadItem = {
      id: `WL-${Date.now().toString().slice(-5)}`,
      teacherId: formTeacherId,
      category: formCategory,
      title: formTitle.trim(),
      subGroupOrLevel: formSubGroup.trim() || undefined,
      hoursPerWeek: Number(formHours) || 1,
      roleInTask: formRole,
      orderOrRef: formOrderRef.trim() || undefined,
      status: formStatus,
      coEmp: formCoEmp.trim() || undefined,
      courseCode: formCategory === 'งานสอนและการจัดการเรียนรู้' ? formCourseCode.trim() || undefined : undefined,
      type: formCategory === 'งานสอนและการจัดการเรียนรู้' ? formType : undefined,
    };

    setWorkloads((prev) => [...prev, newEntry]);
    setIsModalOpen(false);
  };

  const handleDeleteWorkload = (workloadId: string) => {
    if (confirm('คุณต้องการลบรายการภาระงานนี้หรือไม่?')) {
      setWorkloads((prev) => prev.filter((w) => w.id !== workloadId));
    }
  };

  // Dynamic calculations across all 4 categories per teacher
  const workloadData = useMemo(() => {
    return INITIAL_TEACHERS.map((teacher, idx) => {
      const isDirector = teacher.position.includes('ผู้อำนวยการ');
      const teacherWorkloads = workloads.filter((w) => w.teacherId === teacher.id);

      const m1Items = teacherWorkloads.filter((w) => w.category === 'งานสอนและการจัดการเรียนรู้');
      const m2Items = teacherWorkloads.filter((w) => w.category === 'งานบริหารและงานประจำฝ่าย/กลุ่มงาน');
      const m3Items = teacherWorkloads.filter((w) => w.category === 'งานโครงการ กิจกรรม และงานที่ได้รับมอบหมายพิเศษ');
      const m4Items = teacherWorkloads.filter((w) => w.category === 'งานดูแลช่วยเหลือนักเรียน งานครูที่ปรึกษา และเวรปฏิบัติหน้าที่');

      // Calculate actual hours if records exist; otherwise sensible baseline
      const teachingHours =
        m1Items.length > 0
          ? m1Items.reduce((sum, w) => sum + w.hoursPerWeek, 0)
          : isDirector
          ? 6
          : 14 + (idx % 3);

      const supportHours =
        m2Items.length > 0 ? m2Items.reduce((sum, w) => sum + w.hoursPerWeek, 0) : 4;

      const schoolDevHours =
        m3Items.length > 0 ? m3Items.reduce((sum, w) => sum + w.hoursPerWeek, 0) : 3;

      const policyHours =
        m4Items.length > 0 ? m4Items.reduce((sum, w) => sum + w.hoursPerWeek, 0) : 2;

      const totalHours = teachingHours + supportHours + schoolDevHours + policyHours;

      const evalResult = evaluatePAWorkload({
        teachingHours,
        supportHours,
        developmentHours: schoolDevHours,
        policyHours,
        isAdministrator: isDirector,
      });

      return {
        id: teacher.id,
        name: teacher.name,
        position: teacher.position,
        department: teacher.department,
        division: teacher.division,
        classLevel: teacher.classLevel,
        dutyDay: teacher.dutyDay,
        teachingHours,
        supportHours,
        schoolDevHours,
        policyHours,
        totalHours,
        evalResult,
        teacherWorkloads,
        m1Items,
        m2Items,
        m3Items,
        m4Items,
      };
    });
  }, [workloads]);

  const filtered = useMemo(() => {
    return workloadData.filter((w) => {
      const matchesSearch =
        w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        w.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
        w.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
        w.teacherWorkloads.some((t) => t.title.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesTier =
        tierFilter === 'ALL'
          ? true
          : tierFilter === 'PASSED'
          ? w.evalResult.isAllPassed
          : !w.evalResult.isAllPassed;

      return matchesSearch && matchesTier;
    });
  }, [workloadData, searchTerm, tierFilter]);

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-white dark:bg-[#121822] p-5 sm:p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors duration-200">
        <div>
          <div className="flex items-center gap-2 text-sky-400 text-xs font-semibold uppercase tracking-wider">
            <Briefcase className="w-4 h-4 shrink-0" />
            <span>Personnel Workload &amp; Performance Agreement (PA)</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-1">
            ภาระงานบุคลากรและข้อตกลงในการพัฒนางาน (PA 4 หมวด)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            เกณฑ์ ว9/2564 &amp; ว21/2564: ชั่วโมงการจัดการเรียนรู้ไม่ต่ำกว่า 12 ชม./สัปดาห์ (ผู้บริหาร 6 ชม.) และรวมภาระงาน 4 หมวดไม่ต่ำกว่า 20 ชม./สัปดาห์
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Global Assign Workload Button */}
          <button
            type="button"
            onClick={() => handleOpenAssignModal()}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium border border-transparent transition-colors duration-200"
          >
            <PlusCircle className="w-4 h-4 shrink-0" />
            <span>+ มอบหมายภาระงาน</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative sm:col-span-2">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 shrink-0" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ค้นหาชื่อครู, ฝ่ายงาน, หรือชื่องาน..."
            className="w-full h-10 bg-slate-50 dark:bg-[#101822] border border-slate-200 dark:border-slate-700/80 rounded-xl pl-10 pr-3.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-sky-500 transition-all"
          />
        </div>

        <div>
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value as 'ALL' | 'PASSED' | 'FAILED')}
            className="w-full h-10 bg-slate-50 dark:bg-[#101822] border border-slate-200 dark:border-slate-700/80 rounded-xl px-3 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-sky-500 cursor-pointer"
          >
            <option value="ALL">สถานะผลประเมิน PA: ทั้งหมด</option>
            <option value="PASSED">ผ่านเกณฑ์ PA (&gt;= 20 ชม. และสอนครบ)</option>
            <option value="FAILED">ไม่ครบเกณฑ์ PA</option>
          </select>
        </div>
      </div>

      {/* Workload Table (Master-Detail Accordion) */}
      <div className="bg-white dark:bg-[#121822] p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800/80 space-y-4 shadow-sm transition-colors duration-200">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-100/80 dark:bg-[#101822] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-200/90 dark:border-slate-800">
              <tr>
                <th scope="col" className="w-10 px-3 py-3.5 text-center">
                  <span className="sr-only">ขยายรายละเอียด</span>
                </th>
                <th scope="col" className="px-4 py-3.5 min-w-[220px]">ครูผู้สอน / บุคลากร</th>
                <th scope="col" className="px-4 py-3.5 text-center min-w-[140px]">
                  ชั่วโมงสอน &amp; TA<br />
                  <span className="text-[10px] lowercase text-slate-500 font-normal">&gt;= 12 ชม./สัปดาห์</span>
                </th>
                <th scope="col" className="px-4 py-3.5 text-center min-w-[130px]">
                  รวมภาระงาน 4 ด้าน<br />
                  <span className="text-[10px] lowercase text-slate-500 font-normal">&gt;= 20 ชม./สัปดาห์</span>
                </th>
                <th scope="col" className="px-4 py-3.5 text-center min-w-[140px]">ผลประเมิน PA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
              {filtered.map((w) => {
                const isExpanded = expandedTeacherId === w.id;
                const posDisplay = w.position.replace('ผู้อำนวยการสถานศึกษา', 'ผอ.สถานศึกษา');
                const deptDisplay = w.department.replace('สายงานบริหารและสนับสนุนการศึกษา', 'บริหารและสนับสนุนฯ');

                return (
                  <React.Fragment key={w.id}>
                    <tr
                      onClick={() => toggleExpand(w.id)}
                      className={`hover:bg-slate-50 dark:hover:bg-[#1a2636]/60 transition-colors cursor-pointer ${
                        isExpanded ? 'bg-slate-50/90 dark:bg-[#15202e]' : ''
                      }`}
                    >
                      {/* Expand Toggle */}
                      <td className="px-3 py-3.5 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(w.id);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
                          aria-label={isExpanded ? 'ย่อแถว' : 'ขยายแถว'}
                        >
                          <ChevronRight
                            className={`w-4 h-4 transition-transform duration-200 ${
                              isExpanded ? 'rotate-90 text-sky-400' : ''
                            }`}
                          />
                        </button>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                          <span className="truncate max-w-[200px]" title={w.name}>{w.name}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[220px]" title={`${posDisplay} (${deptDisplay})`}>
                          {posDisplay} ({deptDisplay})
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-center font-mono font-semibold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                        {w.teachingHours} ชม.
                      </td>

                      <td className="px-4 py-3.5 text-center font-mono font-bold text-sky-600 dark:text-sky-300 whitespace-nowrap">
                        {w.totalHours} ชม.
                      </td>

                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        {w.evalResult.isAllPassed ? (
                          <span className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 min-w-[110px]">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span>ผ่านเกณฑ์ PA</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 min-w-[110px]">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>ไม่ครบเกณฑ์</span>
                          </span>
                        )}
                      </td>
                    </tr>

                    {/* Expanded Detail Panel (4 Comprehensive Workload Categories) */}
                    {isExpanded && (
                      <tr className="bg-slate-50/90 dark:bg-[#0b1016]/90 border-y border-slate-200/90 dark:border-slate-800/80">
                        <td colSpan={5} className="p-4 sm:p-6">
                          <div className="space-y-6">
                            {/* 1. Summary Bar across 4 Aspects */}
                            <div>
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2.5">
                                <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">
                                  สรุปภาระงาน 4 ด้านตามเกณฑ์ PA ว9/2564 &amp; ว21/2564 ของ {w.name}
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenAssignModal(w.id);
                                  }}
                                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium border border-transparent transition-colors duration-200 shrink-0 self-start sm:self-auto"
                                >
                                  <PlusCircle className="w-3.5 h-3.5 shrink-0" />
                                  <span>+ มอบหมายภาระงานให้ครูท่านนี้</span>
                                </button>
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                                <div className="bg-white dark:bg-[#121924] p-3 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-sm">
                                  <span className="text-slate-400 text-[11px] block">1. จัดการเรียนรู้ &amp; TA</span>
                                  <span className="font-mono font-bold text-slate-100 text-sm mt-0.5 block">{w.teachingHours} ชม./สัปดาห์</span>
                                  <span className="text-[11px] text-emerald-400 mt-1 block">เกณฑ์ &gt;= 12 ชม.</span>
                                </div>
                                <div className="bg-white dark:bg-[#121924] p-3 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-sm">
                                  <span className="text-slate-400 text-[11px] block">2. บริหารและงานฝ่าย</span>
                                  <span className="font-mono font-bold text-slate-100 text-sm mt-0.5 block">{w.supportHours} ชม./สัปดาห์</span>
                                  <span className="text-[11px] text-amber-300 mt-1 block">{w.division || 'งานประจำฝ่าย'}</span>
                                </div>
                                <div className="bg-white dark:bg-[#121924] p-3 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-sm">
                                  <span className="text-slate-400 text-[11px] block">3. พัฒนาสถานศึกษา</span>
                                  <span className="font-mono font-bold text-slate-100 text-sm mt-0.5 block">{w.schoolDevHours} ชม./สัปดาห์</span>
                                  <span className="text-[11px] text-slate-400 mt-1 block">โครงการตามแผนฯ</span>
                                </div>
                                <div className="bg-white dark:bg-[#121924] p-3 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-sm">
                                  <span className="text-slate-400 text-[11px] block">4. ดูแลนักเรียน &amp; เวร</span>
                                  <span className="font-mono font-bold text-slate-100 text-sm mt-0.5 block">{w.policyHours} ชม./สัปดาห์</span>
                                  <span className="text-[11px] text-slate-400 mt-1 block">เวร: {w.dutyDay || '-'} / ที่ปรึกษา: {w.classLevel || '-'}</span>
                                </div>
                              </div>
                            </div>

                            {/* 2. Four Individual Workload Category Cards */}
                            <div className="space-y-4">
                              {/* หมวดที่ 1: งานสอนและการจัดการเรียนรู้ */}
                              <div className="bg-white dark:bg-[#121924] p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 space-y-3 shadow-sm">
                                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                                  <div className="flex items-center gap-2 text-sky-400 font-semibold text-xs sm:text-sm">
                                    <BookOpen className="w-4 h-4 shrink-0" />
                                    <span>หมวดที่ 1: งานสอนและการจัดการเรียนรู้ ({w.teachingHours} ชม./สัปดาห์)</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenAssignModal(w.id, 'งานสอนและการจัดการเรียนรู้');
                                    }}
                                    className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 font-medium transition-colors"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>เพิ่มวิชาสอน / TA</span>
                                  </button>
                                </div>

                                {w.m1Items.length > 0 ? (
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {w.m1Items.map((item) => (
                                      <div
                                        key={item.id}
                                        className="bg-slate-50 dark:bg-[#16202c] p-3 rounded-xl border border-slate-200/90 dark:border-slate-800 flex items-start justify-between gap-2"
                                      >
                                        <div>
                                          <div className="flex items-center gap-1.5">
                                            <span className="font-semibold text-white text-xs">{item.title}</span>
                                            {item.type === 'TA' ? (
                                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 whitespace-nowrap">
                                                TA
                                              </span>
                                            ) : (
                                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30 whitespace-nowrap">
                                                สอนหลัก
                                              </span>
                                            )}
                                          </div>
                                          <div className="text-[11px] text-slate-400 mt-1">
                                            ระดับชั้น: <span className="text-slate-200">{item.subGroupOrLevel || '-'}</span>
                                            {item.courseCode && ` • รหัส: ${item.courseCode}`}
                                          </div>
                                          <div className="text-xs font-mono font-bold text-amber-300 mt-1">
                                            {item.hoursPerWeek} ชม./สัปดาห์
                                          </div>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteWorkload(item.id);
                                          }}
                                          title="ลบภาระงานนี้"
                                          className="p-1.5 rounded-md text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                                        >
                                          <Trash2 className="w-3.5 h-3.5 shrink-0" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-xs text-slate-500 py-1">
                                    ใช้ชั่วโมงสอนพื้นฐานตามกลุ่มสาระการเรียนรู้ ({w.teachingHours} ชม./สัปดาห์)
                                  </div>
                                )}
                              </div>

                              {/* หมวดที่ 2: งานบริหารและงานประจำฝ่าย/กลุ่มงาน */}
                              <div className="bg-white dark:bg-[#121924] p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 space-y-3 shadow-sm">
                                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                                  <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs sm:text-sm">
                                    <Building className="w-4 h-4 shrink-0" />
                                    <span>หมวดที่ 2: งานบริหารและงานประจำฝ่าย/กลุ่มงาน ({w.supportHours} ชม./สัปดาห์)</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenAssignModal(w.id, 'งานบริหารและงานประจำฝ่าย/กลุ่มงาน');
                                    }}
                                    className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-medium transition-colors"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>เพิ่มงานฝ่าย</span>
                                  </button>
                                </div>

                                {w.m2Items.length > 0 ? (
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {w.m2Items.map((item) => (
                                      <div
                                        key={item.id}
                                        className="bg-slate-50 dark:bg-[#16202c] p-3 rounded-xl border border-slate-200/90 dark:border-slate-800 flex items-start justify-between gap-2"
                                      >
                                        <div>
                                          <div className="flex items-center gap-1.5">
                                            <span className="font-semibold text-white text-xs">{item.title}</span>
                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 whitespace-nowrap">
                                              {item.roleInTask}
                                            </span>
                                          </div>
                                          <div className="text-[11px] text-slate-400 mt-1">
                                            สังกัด: <span className="text-slate-200">{item.subGroupOrLevel || '-'}</span>
                                            {item.orderOrRef && ` • ${item.orderOrRef}`}
                                          </div>
                                          <div className="text-xs font-mono font-bold text-amber-300 mt-1">
                                            {item.hoursPerWeek} ชม./สัปดาห์
                                          </div>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteWorkload(item.id);
                                          }}
                                          title="ลบภาระงานนี้"
                                          className="p-1.5 rounded-md text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                                        >
                                          <Trash2 className="w-3.5 h-3.5 shrink-0" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-xs text-slate-400 py-1">
                                    งานฝ่ายตามคำสั่งโรงเรียน: <span className="text-slate-200 font-medium">{w.division || 'งานประจำฝ่าย'}</span> ({w.supportHours} ชม./สัปดาห์)
                                  </div>
                                )}
                              </div>

                              {/* หมวดที่ 3: งานโครงการ กิจกรรม และงานที่ได้รับมอบหมายพิเศษ */}
                              <div className="bg-white dark:bg-[#121924] p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 space-y-3 shadow-sm">
                                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                                  <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs sm:text-sm">
                                    <Layers className="w-4 h-4 shrink-0" />
                                    <span>หมวดที่ 3: งานโครงการ กิจกรรม และงานที่ได้รับมอบหมายพิเศษ ({w.schoolDevHours} ชม./สัปดาห์)</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenAssignModal(w.id, 'งานโครงการ กิจกรรม และงานที่ได้รับมอบหมายพิเศษ');
                                    }}
                                    className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>เพิ่มงานโครงการ</span>
                                  </button>
                                </div>

                                {w.m3Items.length > 0 ? (
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {w.m3Items.map((item) => (
                                      <div
                                        key={item.id}
                                        className="bg-slate-50 dark:bg-[#16202c] p-3 rounded-xl border border-slate-200/90 dark:border-slate-800 flex items-start justify-between gap-2"
                                      >
                                        <div>
                                          <div className="flex items-center gap-1.5">
                                            <span className="font-semibold text-white text-xs">{item.title}</span>
                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 whitespace-nowrap">
                                              {item.roleInTask}
                                            </span>
                                          </div>
                                          <div className="text-[11px] text-slate-400 mt-1">
                                            {item.subGroupOrLevel && `กิจกรรม: ${item.subGroupOrLevel}`}
                                            {item.orderOrRef && ` • คำสั่ง: ${item.orderOrRef}`}
                                          </div>
                                          <div className="text-xs font-mono font-bold text-emerald-400 mt-1">
                                            {item.hoursPerWeek} ชม./สัปดาห์
                                          </div>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteWorkload(item.id);
                                          }}
                                          title="ลบภาระงานนี้"
                                          className="p-1.5 rounded-md text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                                        >
                                          <Trash2 className="w-3.5 h-3.5 shrink-0" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-xs text-slate-500 py-1">
                                    งานโครงการและกิจกรรมตามแผนปฏิบัติการประจำปี ({w.schoolDevHours} ชม./สัปดาห์)
                                  </div>
                                )}
                              </div>

                              {/* หมวดที่ 4: งานดูแลช่วยเหลือนักเรียน งานครูที่ปรึกษา และเวรปฏิบัติหน้าที่ */}
                              <div className="bg-white dark:bg-[#121924] p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 space-y-3 shadow-sm">
                                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                                  <div className="flex items-center gap-2 text-purple-400 font-semibold text-xs sm:text-sm">
                                    <Shield className="w-4 h-4 shrink-0" />
                                    <span>หมวดที่ 4: งานดูแลช่วยเหลือนักเรียน งานครูที่ปรึกษา และเวรปฏิบัติหน้าที่ ({w.policyHours} ชม./สัปดาห์)</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenAssignModal(w.id, 'งานดูแลช่วยเหลือนักเรียน งานครูที่ปรึกษา และเวรปฏิบัติหน้าที่');
                                    }}
                                    className="inline-flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 font-medium transition-colors"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>เพิ่มงานดูแล/เวร</span>
                                  </button>
                                </div>

                                {w.m4Items.length > 0 ? (
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {w.m4Items.map((item) => (
                                      <div
                                        key={item.id}
                                        className="bg-slate-50 dark:bg-[#16202c] p-3 rounded-xl border border-slate-200/90 dark:border-slate-800 flex items-start justify-between gap-2"
                                      >
                                        <div>
                                          <div className="flex items-center gap-1.5">
                                            <span className="font-semibold text-white text-xs">{item.title}</span>
                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 whitespace-nowrap">
                                              {item.roleInTask}
                                            </span>
                                          </div>
                                          <div className="text-[11px] text-slate-400 mt-1">
                                            {item.subGroupOrLevel && `ระดับชั้น/จุดเวร: ${item.subGroupOrLevel}`}
                                            {item.orderOrRef && ` • คำสั่ง: ${item.orderOrRef}`}
                                          </div>
                                          <div className="text-xs font-mono font-bold text-purple-300 mt-1">
                                            {item.hoursPerWeek} ชม./สัปดาห์
                                          </div>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteWorkload(item.id);
                                          }}
                                          title="ลบภาระงานนี้"
                                          className="p-1.5 rounded-md text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                                        >
                                          <Trash2 className="w-3.5 h-3.5 shrink-0" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-xs text-slate-400 py-1 flex flex-wrap gap-4">
                                    <span>ชั้นที่ปรึกษา: <b className="text-slate-200">{w.classLevel || '-'}</b></span>
                                    <span>เวรปฏิบัติหน้าที่: <b className="text-purple-300">{w.dutyDay ? `วัน${w.dutyDay}` : '-'}</b></span>
                                    <span>({w.policyHours} ชม./สัปดาห์)</span>
                                  </div>
                                )}
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

      {/* =================================================================== */}
      {/* Comprehensive Workload Assignment Modal (with Standard Presets)      */}
      {/* =================================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-[#141d27] border border-slate-200/90 dark:border-slate-700 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 my-8 text-slate-800 dark:text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200/90 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 font-bold text-sm">
                <Briefcase className="w-4 h-4 shrink-0" />
                <span>มอบหมายภาระงานบุคลากร (Staff Workload Assignment)</span>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveWorkload} className="space-y-4 text-xs">
              {/* Field 1: เลือกผู้รับผิดชอบหลัก */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  บุคลากรผู้รับผิดชอบหลัก *
                </label>
                <select
                  required
                  value={formTeacherId}
                  onChange={(e) => setFormTeacherId(e.target.value)}
                  className="w-full h-10 bg-slate-50 dark:bg-[#0e141c] border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500 cursor-pointer"
                >
                  {INITIAL_TEACHERS.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.position.replace('ผู้อำนวยการสถานศึกษา', 'ผอ.สถานศึกษา')}) · {t.employeeCode}
                    </option>
                  ))}
                </select>
              </div>

              {/* Field 2: หมวดหมู่ภาระงาน */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  หมวดหมู่ภาระงาน (4 หมวดตามเกณฑ์ สพฐ. และ ว9/2564) *
                </label>
                <select
                  required
                  value={formCategory}
                  onChange={(e) => handleCategoryChange(e.target.value as WorkloadCategory)}
                  className="w-full h-10 bg-slate-50 dark:bg-[#0e141c] border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500 cursor-pointer"
                >
                  <option value="งานสอนและการจัดการเรียนรู้">หมวดที่ 1: งานสอนและการจัดการเรียนรู้</option>
                  <option value="งานบริหารและงานประจำฝ่าย/กลุ่มงาน">หมวดที่ 2: งานบริหารและงานประจำฝ่าย/กลุ่มงาน</option>
                  <option value="งานโครงการ กิจกรรม และงานที่ได้รับมอบหมายพิเศษ">หมวดที่ 3: งานโครงการ กิจกรรม และงานที่ได้รับมอบหมายพิเศษ</option>
                  <option value="งานดูแลช่วยเหลือนักเรียน งานครูที่ปรึกษา และเวรปฏิบัติหน้าที่">หมวดที่ 4: งานดูแลช่วยเหลือนักเรียน งานครูที่ปรึกษา และเวรปฏิบัติหน้าที่</option>
                </select>
              </div>

              {/* Field 3: ดรอปดาวน์เลือกภาระงานมาตรฐาน (Preset Dropdown) */}
              <div className="bg-sky-50/70 dark:bg-[#101824] p-3 rounded-xl border border-sky-100 dark:border-sky-950/70 space-y-1">
                <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 font-medium">
                  <span>เลือกรายการภาระงานมาตรฐานในหมวดนี้</span>
                  <span className="text-[11px] text-sky-600 dark:text-sky-400 font-normal">เลือกเพื่อเติมข้อมูลอัตโนมัติ</span>
                </div>
                <select
                  value={formSelectedPreset}
                  onChange={(e) => handlePresetChange(e.target.value)}
                  className="w-full h-10 bg-slate-50 dark:bg-[#0e141c] border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500 cursor-pointer"
                >
                  <option value="">+ คลิกเลือกรายการภาระงานมาตรฐาน หรือเลือกพิมพ์เองด้านล่าง...</option>
                  {(WORKLOAD_CATEGORY_PRESETS[formCategory] || []).map((preset, pIdx) => (
                    <option key={pIdx} value={preset.title}>
                      {preset.title} ({preset.sub})
                    </option>
                  ))}
                  <option value="__CUSTOM__">+ พิมพ์ระบุชื่องานเอง (กำหนดเอง)...</option>
                </select>
              </div>

              {/* Field 4 & 5: ชื่องาน และ ฝ่ายงาน/ระดับชั้น */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    ชื่องาน / รายวิชา / หน้าที่ความรับผิดชอบ *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="พิมพ์ชื่อภาระงาน หรือเลือกจากรายการมาตรฐานด้านบน"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full h-10 bg-slate-50 dark:bg-[#0e141c] border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    ฝ่ายงาน / กลุ่มสาระ / ระดับชั้น
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น ฝ่ายบริหารวิชาการ หรือ ป.5/1"
                    value={formSubGroup}
                    onChange={(e) => setFormSubGroup(e.target.value)}
                    className="w-full h-10 bg-slate-50 dark:bg-[#0e141c] border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    จำนวนชั่วโมง / สัปดาห์ *
                  </label>
                  <input
                    type="number"
                    min="0.5"
                    max="40"
                    step="0.5"
                    required
                    value={formHours}
                    onChange={(e) => setFormHours(parseFloat(e.target.value) || 0)}
                    className="w-full h-10 bg-slate-50 dark:bg-[#0e141c] border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-sky-500 transition-colors"
                  />
                </div>
              </div>

              {/* เฉพาะหมวดที่ 1 (งานสอน): ตัวเลือกรหัสวิชา และประเภทสอนหลัก/TA */}
              {formCategory === 'งานสอนและการจัดการเรียนรู้' && (
                <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-[#0d141d] p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                      รหัสวิชา (ถ้ามี)
                    </label>
                    <input
                      type="text"
                      placeholder="เช่น ท15101 หรือ ค16101"
                      value={formCourseCode}
                      onChange={(e) => setFormCourseCode(e.target.value)}
                      className="w-full h-9 bg-white dark:bg-[#0e141c] border border-slate-200 dark:border-slate-700 rounded-lg px-3 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                      ประเภทภาระงานสอน
                    </label>
                    <select
                      value={formType}
                      onChange={(e) => setFormType(e.target.value as 'MAIN' | 'TA')}
                      className="w-full h-9 bg-slate-50 dark:bg-[#0e141c] border border-slate-200 dark:border-slate-700 rounded-lg px-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500 cursor-pointer"
                    >
                      <option value="MAIN">สอนหลักตามตาราง</option>
                      <option value="TA">ผู้ช่วยสอน (TA)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Field 8, 9, 10: บทบาท, คำสั่งอ้างอิง, สถานะ */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    บทบาทในงาน
                  </label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value)}
                    className="w-full h-10 bg-slate-50 dark:bg-[#0e141c] border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500 cursor-pointer"
                  >
                    <option value="ผู้รับผิดชอบหลัก">ผู้รับผิดชอบหลัก</option>
                    <option value="หัวหน้าฝ่าย">หัวหน้าฝ่าย</option>
                    <option value="กรรมการ / ผู้ร่วมงาน">กรรมการ / ผู้ร่วมงาน</option>
                    <option value="ผู้สอน">ผู้สอน</option>
                    <option value="ผู้ช่วยสอน">ผู้ช่วยสอน</option>
                    <option value="ครูที่ปรึกษา">ครูที่ปรึกษา</option>
                    <option value="ครูเวร">ครูเวร</option>
                    <option value="ผู้ตรวจเวร">ผู้ตรวจเวร</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    คำสั่งที่ / หนังสืออ้างอิง
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น คำสั่งที่ 15/2569"
                    value={formOrderRef}
                    onChange={(e) => setFormOrderRef(e.target.value)}
                    className="w-full h-10 bg-slate-50 dark:bg-[#0e141c] border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    สถานะการดำเนินงาน
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) =>
                      setFormStatus(e.target.value as 'กำลังดำเนินการ' | 'เสร็จสิ้นแล้ว' | 'งานประจำต่อเนื่อง')
                    }
                    className="w-full h-10 bg-slate-50 dark:bg-[#0e141c] border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500 cursor-pointer"
                  >
                    <option value="กำลังดำเนินการ">กำลังดำเนินการ</option>
                    <option value="งานประจำต่อเนื่อง">งานประจำต่อเนื่อง</option>
                    <option value="เสร็จสิ้นแล้ว">เสร็จสิ้นแล้ว</option>
                  </select>
                </div>
              </div>

              {/* Field 11: ผู้ร่วมรับผิดชอบ */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  ผู้ร่วมรับผิดชอบ (ถ้ามี)
                </label>
                <input
                  type="text"
                  placeholder="เช่น TCH-002, TCH-004 หรือระบุชื่อคณะทำงาน"
                  value={formCoEmp}
                  onChange={(e) => setFormCoEmp(e.target.value)}
                  className="w-full h-10 bg-slate-50 dark:bg-[#0e141c] border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200/90 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 border border-slate-200/90 dark:bg-[#121822] dark:hover:bg-slate-800/70 dark:text-slate-300 dark:hover:text-white dark:border-slate-800/80 text-xs font-medium transition-colors duration-200"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium border border-transparent transition-colors duration-200"
                >
                  บันทึกภาระงาน
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
