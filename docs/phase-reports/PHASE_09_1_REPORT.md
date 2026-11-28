# รายงานผลการดำเนินงาน Phase 9.1 — ระบบตารางสอนและชั่วโมงสอน (`ตารางสอนและชั่วโมงสอน`), Migration 018, ตรวจคาบชน (Co-Teaching) & คำนวณชั่วโมงสอน ว 9/2564

## 1. ข้อมูลทั่วไปของเฟส
- **ชื่อเฟส:** Phase 9.1 — Timetable & Weekly Teaching Hours Module (`ตารางสอนและชั่วโมงสอน`)
- **วันที่ดำเนินการ:** 2026-11-28
- **Branch / Base Commit:** `main` (ต่อยอดจาก Commit `17a70a0` ของ Phase 8.1)
- **สถานะภาพรวม:** เสร็จสมบูรณ์ (ผ่าน `tsc --noEmit`, `npm run lint`, `npm test` 261/261 เทสต์ และ `npm run build` 0 errors)

---

## 2. สกิลที่ค้นพบและนำมาใช้งาน (Skills Discovered & Applied)
จากการตรวจสอบสภาพแวดล้อมและพื้นที่ทำงาน (`D:\ManStat-Modern\.agents` ไม่พบโฟลเดอร์) ได้ค้นพบและนำสกิลที่ตรงเงื่อนไขมาใช้งานจริง 3 สกิล:
1. **`no-emoji-ui-standard`** — บังคับปลอด Emoji 100% ใช้เฉพาะ Lucide SVG พร้อมระยะห่างไอคอนกับข้อความมาตรฐาน
2. **`modern-web-guidance` (ดึงคู่มือ `responsive-table` และ `forms`)** — ใช้กำกับตาราง 5×7 และฟอร์มใน `ViewTimetable.tsx`: หุ้มตารางด้วย `tabIndex={0} role="region" aria-label="..."` พร้อม sticky row header `th` ด้านซ้าย (`position: sticky`), ผูก `<label htmlFor>` + `id` และ `aria-labelledby`, ใช้ `role="status"` / `aria-live="polite"` บนแถบแจ้งเตือนผลลัพธ์
3. **`ponytail`** — คงโครงสร้างให้กระชับ ตรงขอบเขต Phase 9.1 โดยไม่สร้างโค้ดล้ำหน้าไปเฟส 9.2 (Auto-Scheduler) หรือ 9.3 (อนุบาล / พิมพ์ A4 / โอนย้ายหมวด 1 เดิม)

---

## 3. สรุปการแก้ไขจริง (Exact Changes Made)

### 3.1 โครงสร้างฐานข้อมูล Migration 018 และ Server DB / API Layer
- สร้างไฟล์ SQL Migration แบบ Idempotent **`supabase/migrations/018_phase9_timetable_schema.sql`** ครบทั้ง 4 ตาราง (พร้อมรองรับเฟส 9.2–9.3 โดยไม่ต้องเพิ่ม Migration ใหม่):
  1. `public.timetable_settings` — ตั้งค่าเวลาคาบเรียน 7 คาบ, คาบล็อกตายตัว และหมายเหตุท้ายตาราง
  2. `public.timetable_allocations` — แผนการสอนรายห้อง (รายวิชา, กลุ่มสาระ, ประเภทวิชา, ครูหลัก/ครูร่วมสอน, คาบ/สัปดาห์, เน้นช่วงเช้า, ลงติดกัน 2 คาบ)
  3. `public.timetable_slots` — คาบเรียนในตาราง 5 วัน × 7 คาบ พร้อม `UNIQUE (academic_year, semester, room_name, day_of_week, period_no)` ป้องกันซ้ำในห้องเดียวกัน
  4. `public.kindergarten_schedules` — โครงสร้างตารางประสบการณ์อนุบาล `อ.1–อ.3` เตรียมพร้อมสำหรับเฟส 9.3
  - เปิด RLS + นโยบายอ่าน + ดัชนี `(academic_year, semester)` และปิดท้ายด้วย `NOTIFY pgrst, 'reload schema';`
- สร้าง **`src/lib/data/timetableTypes.ts`** และเพิ่มฟังก์ชัน DB CRUD ใน **`src/lib/db/serverDb.ts`** รองรับทั้งโหมด **Supabase** และ **Local JSON Fallback**:
  - `dbGetTimetableBundle`, `dbUpsertTimetableSettings`, `dbUpsertTimetableAllocation`, `dbDeleteTimetableAllocation`, `dbUpsertTimetableSlot`, `dbDeleteTimetableSlot`
- สร้าง API Endpoints 4 เส้นทาง (ป้องกันทุกเส้นทางที่แก้ไขข้อมูลด้วย `verifyAdminSession()` และบันทึก Audit Log):
  - `GET /api/timetable?academicYear=...&semester=...`
  - `POST /api/admin/timetable/settings`
  - `POST / DELETE /api/admin/timetable/allocations`
  - `POST / DELETE /api/admin/timetable/slots`

### 3.2 กฎโรงเรียนชุมชนบ้านตะขบ, ตรวจคาบชน (รองรับ Co-Teaching) & คำนวณชั่วโมงสอน ว 9/2564
- สร้าง **`src/lib/regulations/timetable-utils.ts`**:
  - ค่าเริ่มต้นครบตามบริบทโรงเรียน: `STANDARD_ROOMS` (`ป.1–ม.3`), `DEFAULT_PERIODS_CONFIG` (คาบ 1–6 = 60 นาที/1.0 ชม., พักกลางวัน 11.30–12.30, คาบ 7 พบครูประจำชั้น 15.30–16.00 = 30 นาที/0.5 ชม.), `DEFAULT_FOOTER_NOTE`, กลุ่มสาระมาตรฐาน และรายวิชา Preset 23 วิชา
  - **`detectTimetableConflicts(slots)`**: ตรวจจับครูชนคาบทั้งกรณีเป็น `teacherId` และ `coTeacherId` เมื่อปรากฏในห้องต่างกันที่วันและคาบเดียวกัน โดยอนุญาต Co-teaching ในห้องเดียวกันได้ 100% ไม่ถือเป็นคาบชน
  - **`calculateTeacherWeeklyLoads(slots, teachers, periodsConfig)`**: คำนวณชั่วโมงสอนรายสัปดาห์แยก `พื้นฐาน/เพิ่มเติม`, `กิจกรรมพัฒนาผู้เรียน`, `พบครูประจำชั้น (0.5 ชม./คาบ)`, นับรวมคาบสอนร่วม และตรวจเกณฑ์ ก.ค.ศ. ว 9/2564 (`>= 12 ชม./สัปดาห์`)
- สร้างชุด Unit Test **`src/lib/regulations/__tests__/timetable-utils.test.ts`** 3 เคสครอบคลุม Co-teaching, ครูชนคาบ และตัวคำนวณ ว 9/2564

### 3.3 เมนู Sidebar ใหม่ & หน้าจอ `ViewTimetable.tsx` (4 แท็บย่อย)
- เพิ่มเมนู **`ตารางสอนและชั่วโมงสอน`** (`activeView === 'timetable'`, ไอคอน `CalendarRange`) ใต้เมนู `งานบริหาร 4 ฝ่ายและหน้าที่พิเศษ` ทั้ง Desktop Sidebar และ Mobile Drawer ใน **`src/app/page.tsx`**
- สร้าง **`src/components/views/ViewTimetable.tsx`** ครบทั้ง 4 แท็บย่อย:
  1. **`ตารางเรียนรายห้อง` (`ป.1–ม.3`):** ปุ่มเลือกห้องพร้อมตัวนับ `X/35`, ตาราง 5×7 คาบพร้อมคอลัมน์แนวตั้ง `พักกลางวัน (11.30 - 12.30)`, แสดงครูหลัก + แท็ก `ร่วมสอน` + ไอคอนล็อก + กรอบแดงเมื่อชนคาบ; คลิกช่องเพื่อเปิด Slot Editor Modal (เลือกด่วนจากแผนการสอนได้)
  2. **`ตารางสอนรายบุคคล`:** ดรอปดาวน์รายชื่อบุคลากรเต็มแบบสะอาด (ไม่มีวงเล็บตำแหน่ง), สรุปจำนวนคาบและชั่วโมงสอนด้านบน, ตาราง 5×7 อัตโนมัติพร้อมป้ายห้อง (`ป.1`, `ม.2` ฯลฯ), ป้าย `ร่วมสอน` และแสดงคาบชนซ้อนกันทันทีหากชนคาบ
  3. **`แผนการสอน`:** ตัวนับตรวจล่วงหน้า (`X / 30 คาบเรียน + Y คาบประจำชั้น`, เตือนเมื่อรวมเกิน 35 คาบ), แสดงความคืบหน้า `ลงตารางแล้ว P/T คาบ`, ปุ่มเพิ่ม/แก้ไข/ลบ พร้อมเงื่อนไข `เน้นช่วงเช้า` และ `ลงติดกัน 2 คาบ` (พร้อมสำหรับเฟส 9.2)
  4. **`สรุปชั่วโมงสอน (ว 9/2564)`:** ตารางสรุปทั้งโรงเรียน แยกชั่วโมงพื้นฐาน/เพิ่มเติม, กิจกรรมพัฒนาผู้เรียน, พบครูประจำชั้น, รวมคาบ, ชั่วโมงสอน/สัปดาห์, ป้ายสถานะเกณฑ์ ว 9/2564 และปุ่ม `ดูตารางสอน` กระโดดไปยังตารางสอนรายบุคคลทันที
- Modal ทั้ง 3 ตัว (`Slot Editor`, `Allocation Modal`, `Settings Modal`) **ล็อกการปิด** (ปิดได้เฉพาะปุ่ม `X` หรือ `ยกเลิก`), ใช้ `ConfirmModal` สำหรับการลบทั้งหมด, แสดงรายชื่อบุคลากรแบบสะอาดไม่มีวงเล็บตำแหน่ง และเลือกบุคลากรที่ปฏิบัติงานอยู่ได้ทุกคน

### 3.4 รายการไฟล์ที่สร้างใหม่และแก้ไข (และยืนยันขอบเขต)
| ไฟล์ | ประเภท | รายละเอียด |
| :--- | :--- | :--- |
| `supabase/migrations/018_phase9_timetable_schema.sql` | สร้างใหม่ | SQL Migration สร้าง 4 ตารางระบบตารางสอน + Indexes + RLS |
| `src/lib/data/timetableTypes.ts` | สร้างใหม่ | TypeScript Interfaces ของระบบตารางสอน |
| `src/lib/regulations/timetable-utils.ts` | สร้างใหม่ | ค่าเริ่มต้นโรงเรียน, ตรวจคาบชน (Co-teaching) & ตัวคำนวณ ว 9/2564 |
| `src/lib/regulations/__tests__/timetable-utils.test.ts` | สร้างใหม่ | Unit Tests 3 เคสสำหรับ `timetable-utils.ts` |
| `src/lib/db/serverDb.ts` | แก้ไข | เพิ่ม DB Engine ส่วนที่ 15 (`dbGetTimetableBundle`, Settings/Allocations/Slots CRUD) |
| `src/app/api/timetable/route.ts` | สร้างใหม่ | `GET /api/timetable` ดึงชุดข้อมูลตารางสอนตามปีการศึกษา/ภาคเรียน |
| `src/app/api/admin/timetable/settings/route.ts` | สร้างใหม่ | `POST /api/admin/timetable/settings` (Admin Guard + Audit Log) |
| `src/app/api/admin/timetable/allocations/route.ts` | สร้างใหม่ | `POST / DELETE /api/admin/timetable/allocations` (Admin Guard + Audit Log) |
| `src/app/api/admin/timetable/slots/route.ts` | สร้างใหม่ | `POST / DELETE /api/admin/timetable/slots` (Admin Guard + Audit Log) |
| `src/components/views/ViewTimetable.tsx` | สร้างใหม่ | หน้าจอ `ตารางสอนและชั่วโมงสอน` ครบทั้ง 4 แท็บและ 3 Modal |
| `src/app/page.tsx` | แก้ไข | เพิ่มเมนู `ตารางสอนและชั่วโมงสอน` ใน Sidebar (Desktop + Mobile) และเส้นทาง `'timetable'` |
| `docs/phase-reports/PHASE_09_1_REPORT.md` | สร้างใหม่ | รายงานสรุปผลการดำเนินงาน Phase 9.1 |
| `docs/phase-reports/README.md` | แก้ไข | เพิ่มแถวดัชนีรายงาน Phase 9.1 |

- **ยืนยันขอบเขต:** ไม่ได้แก้ไข `ViewWorkload.tsx`, `StaffEditModal.tsx`, ทะเบียนเฉพาะทาง, `ViewOrgChart.tsx`, ไม่ได้ลบรายการงานสอนหมวด 1 เดิม และไม่ได้แก้ไขรายงานเฟสก่อนหน้า

---

## 4. ผลการทดสอบระบบ (Verification Results)
| รายการตรวจ | คำสั่ง | ผลลัพธ์ |
| :--- | :--- | :--- |
| TypeScript Type Check | `npx tsc --noEmit` | ผ่าน (0 errors) |
| ESLint | `npm run lint` | ผ่าน (0 errors, 0 warnings) |
| Unit Tests | `npm test` (`tsx --test src/**/*.test.ts`) | ผ่าน **261 / 261** เทสต์ (86 suites, เพิ่มใหม่ 3 เทสต์ใน `timetable-utils.test.ts`) |
| Production Build | `npm run build` (Next.js 16.4.6 Turbopack) | ผ่าน (0 errors, สร้าง 4 API routes ใหม่ครบสมบูรณ์) |

---

## 5. สิ่งที่ไม่สามารถทำได้ / ข้อจำกัด (Cannot Do / Unknowns)
- ยังไม่ได้รัน `supabase/migrations/018_phase9_timetable_schema.sql` กับฐานข้อมูล Supabase Production จริง
- ยังไม่ได้ทดสอบคลิกผ่านเว็บเบราว์เซอร์จริง (Live UI / E2E Test) ทั้งโหมด Light/Dark และการบันทึกข้อมูลจริงลง Supabase หลังรัน Migration 018

---

## 6. สิ่งที่ผู้ใช้ต้องดำเนินการเองและเช็กลิสต์ตรวจสอบ (Manual Steps & QA Checklist)
1. **รัน SQL Migration 018 บน Supabase (จำเป็น):**
   - เปิด **Supabase SQL Editor** แล้วรันไฟล์ `supabase/migrations/018_phase9_timetable_schema.sql` (เป็นแบบ `CREATE TABLE IF NOT EXISTS` + `NOTIFY pgrst, 'reload schema'` ปลอดภัยต่อการรันซ้ำ)
2. **เช็กลิสต์ทดสอบบนหน้าเว็บ (`/?view=timetable`):**
   - เปิดเมนู **`ตารางสอนและชั่วโมงสอน`** ใต้เมนู `งานบริหาร 4 ฝ่ายและหน้าที่พิเศษ`
   - ทดสอบแท็บ **`แผนการสอน`**: เพิ่มรายวิชาในห้อง `ป.1` พร้อมระบุครูผู้สอนหลัก + ครูร่วมสอน (ตรวจว่ารายชื่อสะอาดไม่มีวงเล็บตำแหน่ง)
   - ทดสอบแท็บ **`ตารางเรียนรายห้อง`**: คลิกช่องคาบ 1–7 (ตรวจแถบ `พักกลางวัน 11.30 - 12.30` ระหว่างคาบ 3 และ 4), เลือกด่วนจากแผนการสอน, ลองลงครูคนเดียวกันในห้อง `ป.1` และ `ป.2` เวลาเดียวกันเพื่อยืนยันว่าแบนเนอร์และกรอบสีแดงแจ้งเตือนคาบชนขึ้นทันที
   - ทดสอบแท็บ **`ตารางสอนรายบุคคล`** และ **`สรุปชั่วโมงสอน (ว 9/2564)`**: ตรวจการคำนวณคาบ 1–6 = `1.0` ชม. และคาบ 7 = `0.5` ชม. รวมถึงปุ่ม `ดูตารางสอน`
   - ทดสอบ **Modal Close Lock**: คลิกนอกกรอบ Modal และกด `Escape` ใน Slot Editor / Allocation / Settings Modal ต้องไม่ปิด
