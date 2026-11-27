# รายงานผลการดำเนินงาน Phase 7 — ตรวจสอบฐานข้อมูลครบ 6 แท็บ, ล็อกการปิด Modal, ยกเครื่องแท็บ 3 (List+Form ก.ค.ศ.) และปรับแต่งแท็บ 4–6 (ManStat-Modern)

## 1. ข้อมูลทั่วไปของเฟส
- **ชื่อเฟส:** Phase 7 — Full End-to-End DB Schema & Persistence Audit, Lock Modal Closing, Refactor Tab 3 to Standardized List+Form Pattern & Polish Tabs 4–6
- **วันที่ดำเนินการ:** 2026-11-27
- **Branch / Base Commit:** `main` (ต่อยอดจาก Phase 6.1 commit `edd3e48`)
- **สถานะภาพรวม:** เสร็จสมบูรณ์ (ผ่าน `tsc --noEmit`, `eslint`, `npm test` 249/249 เคส และ `next build`)

---

## 2. สกิลที่ค้นพบและนำมาใช้งาน (Skills Discovered & Applied)
- ตรวจสอบโฟลเดอร์ `.agents/` ในโปรเจกต์ `D:\ManStat-Modern`: **ไม่พบโฟลเดอร์ `.agents/`**
- สกิลที่ค้นพบและนำมาใช้งานจากสกิลที่ติดตั้งในระบบ:
  1. **`no-emoji-ui-standard`** (`C:\Users\sic26\.gemini\config\skills\no-emoji-ui-standard\SKILL.md`) — บังคับใช้มาตรฐาน Zero-Emoji, ไอคอน Lucide SVG ล้วน, ตัวเลขอารบิก (`0-9`) บนหน้าเว็บทั้งหมด และรองรับ Light / Dark Mode
  2. **`ponytail`** (`C:\Users\sic26\.gemini\config\skills\ponytail\SKILL.md`) — แยก pure helper `education-ranking.ts` สำหรับจัดอันดับวุฒิการศึกษาและ backward-compatibility hydration พร้อมนำ `ThaiDatePicker`, `ConfirmModal`, `evaluateLicenseHealth` กลับมาใช้ซ้ำ
  3. **`modern-web-guidance`** (`C:\Users\sic26\.gemini\config\plugins\modern-web-guidance-plugin\skills\modern-web-guidance\SKILL.md`) — เรียกตรวจสอบผ่าน `npx modern-web-guidance@latest search "prevent modal close unsaved form"` เพื่อยืนยันแนวทางป้องกันการปิดฟอร์ม Modal โดยไม่ตั้งใจ

---

## 3. รายงานตรวจสอบการเชื่อมโยงฐานข้อมูล (End-to-End DB Schema & Persistence Audit Matrix)

| แท็บ / ฟิลด์ | TypeScript Key (`TeacherRecord` / `ScoutRecord`) | API Route | ตาราง / คอลัมน์ Supabase | สถานะ |
| :--- | :--- | :--- | :--- | :--- |
| **Tab 1:** คำนำหน้า, ชื่อ, นามสกุล, เลข ปชช., วันเกิด, โทรศัพท์, อีเมล | `prefix`, `firstName`, `lastName`, `idCard`, `birthDate`, `phone`, `email` | `/api/admin/staff` | `public.teachers`: `prefix`, `first_name`, `last_name`, `id_card`, `birth_date`, `phone`, `email` | พร้อมบันทึก (Migration 015 + `teacherToDb`/`teacherFromDb` ครบ) |
| **Tab 1:** ผู้ติดต่อฉุกเฉิน (ชื่อ/ความสัมพันธ์/โทร) | `emergencyContactName`, `emergencyContactRelation`, `emergencyContactPhone` | `/api/admin/staff` | `public.teachers`: `emergency_contact_name`, `emergency_contact_relation`, `emergency_contact_phone` | พร้อมบันทึก (Migration 015) |
| **Tab 1:** ที่อยู่มาตรฐานไทย 4 ระดับ | `addressHouseNo`, `addressMoo`, `addressSoiRoad`, `addressSubdistrict`, `addressDistrict`, `addressProvince`, `addressPostalCode` | `/api/admin/staff` | `public.teachers`: `address_house_no`, `address_moo`, `address_soi_road`, `address_subdistrict`, `address_district`, `address_province`, `address_postal_code` | พร้อมบันทึก (Migration 015) |
| **Tab 2:** ประเภทบุคลากร, เลขที่ตำแหน่ง, ตำแหน่ง, กลุ่มสาระ, ชั้นที่ปรึกษา, เวร, วันบรรจุ, วันดำรงตำแหน่ง | `employment_type`, `positionNo`, `position`, `department`, `classLevel`, `dutyDay`, `startDate`, `currentPositionDate` | `/api/admin/staff` | `public.teachers`: `employment_type`, `position_no`, `position`, `department`, `class_level`, `duty_day`, `start_date`, `current_position_date` | พร้อมบันทึก (Migration 006, 013) |
| **Tab 2:** สมาชิกคุรุสภา + บัญชีและสิทธิ์ระบบ | `khurusaphaMemberType`, `khurusaphaMemberNo`, `memberId`, `employeeCode`, `accessLevel`, `role` | `/api/admin/staff` | `public.teachers`: `khurusapha_member_type`, `khurusapha_member_no`, `member_id`, `employee_code`, `access_level`, `system_role` | พร้อมบันทึก (Migration 015) |
| **Tab 3:** วุฒิการศึกษาสูงสุด (6 ฟิลด์หลัก) + ประวัติวุฒิทั้งหมด | `educationLevel`, `educationProgramYears`, `educationDegree`, `major`, `educationInstitution`, `educationGradYear`, `educations` (`level`, `programYears`, `degree`, `major`, `institute`, `gradYear`) | `/api/admin/staff` | `public.teachers`: `education_level`, `education_program_years`, `education_degree`, `major`, `education_institution`, `education_grad_year`, `educations` (JSONB) | พร้อมบันทึก (Migration 015 + 016 idempotent check) |
| **Tab 4:** วิทยฐานะปัจจุบัน + ประวัติคำสั่ง (รวม `ลงวันที่คำสั่ง` ใหม่) | `academicStanding`, `standings` (`level`, `orderNumber`, `orderDate`, `effectiveDate`) | `/api/admin/staff` | `public.teachers`: `academic_standing`, `standings` (JSONB) | พร้อมบันทึก (เพิ่ม `orderDate?` ใน JSONB + Migration 016 safety check) |
| **Tab 5:** ใบอนุญาตประกอบวิชาชีพ | `licenses` (`category`, `type`, `number`, `issueDate`, `expiryDate`) | `/api/admin/staff` | `public.teachers`: `licenses` (JSONB) | พร้อมบันทึก (Migration 005 + 016) |
| **Tab 6:** วุฒิทางลูกเสือ (`คำสั่งอ้างอิง`, `หน่วยงานที่ออก`) | `qualification`, `badgeLevel`, `category`, `certificateNo`, `issueDate`, `orderNumber`, `issuedBy` | `/api/admin/scout` | `public.history_scout`: `scout_qualification`, `scout_type`, `scout_position`, `cert_number`, `approved_year`, **`order_number`**, **`issued_by`** + ซิงก์ `teachers.highest_scout` / `scout_cert_no` | **พบช่องโหว่และแก้ไขแล้ว:** `scoutToDb` เดิมไม่ได้บันทึก `order_number` และ `issued_by` และไม่มี 2 คอลัมน์นี้ใน SQL เดิม -> แก้ `scoutToDb` + สร้าง **Migration 016** |

> **สรุป SQL Migration:** **ต้องรัน** ไฟล์ [`supabase/migrations/016_phase7_hr_schema_and_scout_columns.sql`](file:///D:/ManStat-Modern/supabase/migrations/016_phase7_hr_schema_and_scout_columns.sql) ใน Supabase SQL Editor เพื่อเพิ่มคอลัมน์ `order_number` และ `issued_by` บน `public.history_scout` และยืนยันคอลัมน์ JSONB บน `public.teachers` พร้อม `NOTIFY pgrst, 'reload schema';`

---

## 4. สรุปการแก้ไข UI/UX และโครงสร้างโค้ด (Exact Changes Made)
- **ล็อกการปิด Form Modals ป้องกันปิดพลาด:**
  - `StaffEditModal.tsx`: ถอด backdrop click close และถอด `Escape` key close ออก ให้ปิดได้เฉพาะปุ่ม `X` มุมขวาบนหรือปุ่ม `ยกเลิก` (และผูก `handleRequestCloseStaffModal` ใน `admin/page.tsx` ให้แสดง `ConfirmModal` เตือนหากมีข้อมูลแก้ไขค้างไว้)
  - `ViewRegLicense.tsx`, `ViewRegStanding.tsx`, `ViewRegScout.tsx`: ถอด backdrop click close ออกจาก Add/Edit Form Modal (ส่วน `ViewWorkload.tsx` ไม่มี backdrop click close อยู่แล้ว)
- **ยกเครื่องแท็บ 3 (`วุฒิการศึกษาและวิชาเอก`) เป็นรูปแบบ Saved List (บน) + Standardized ก.ค.ศ. Form (ล่าง):**
  - สร้าง pure helper `src/lib/regulations/education-ranking.ts` (`resolveHighestEducation`, `hydrateEducationsList`, `sortEducationsHighestFirst`, `inferEducationLevel`) จัดลำดับ `ปริญญาเอก > ปริญญาโท > ป.บัณฑิต > ปริญญาตรี > ต่ำกว่าปริญญาตรี` (tie-break ด้วยปี พ.ศ. ที่จบ)
  - ด้านบนแสดงการ์ดวุฒิการศึกษาทั้งหมดพร้อมป้าย **`วุฒิสูงสุด`** อัตโนมัติ, ปุ่มแก้ไข (`Pencil`) และลบ (`Trash2` + `ConfirmModal`) พร้อม **Backward Compatibility Hydration** ดึงฟิลด์วุฒิหลักเดิมมาแสดงเป็นการ์ดรายการที่ 1 หาก `educations[]` ยังว่าง
  - ด้านล่างใช้แบบฟอร์ม ก.ค.ศ. 6 ช่องมาตรฐานเพียงชุดเดียว (ถอดกล่อง free-text `ประวัติการศึกษาเพิ่มเติม` เดิมออก) และซิงก์วุฒิสูงสุดกลับฟิลด์หลักอัตโนมัติ
- **ปรับแต่งแท็บ 4, 5, 6 และความสอดคล้องในทะเบียนเฉพาะทาง:**
  - **แท็บ 4 (`วิทยฐานะ`) & `ViewRegStanding.tsx`:** เพิ่มช่อง **`ลงวันที่คำสั่ง (ถ้ามี)`** (`orderDate`) ด้วย `ThaiDatePicker` และแสดง `ลงวันที่ ...` บนการ์ดเมื่อมีข้อมูล
  - **แท็บ 5 (`ใบอนุญาตฯ`) & `ViewRegLicense.tsx`:** แสดงป้ายสถานะ (`ปกติ`, `ใกล้หมดอายุ`, `หมดอายุ`) จาก `evaluateLicenseHealth()` บนการ์ดใบอนุญาตในแท็บ 5 และเพิ่มตัวเลือก **`หนังสืออนุญาตให้ประกอบวิชาชีพโดยไม่มีใบอนุญาตฯ (ผ่อนผัน)`** ครบชุดคุรุสภา
  - **แท็บ 6 (`วุฒิลูกเสือ`):** ถอดกล่องแจ้งเตือนสีฟ้าด้านบนออกและย้ายข้อความซิงก์ไปไว้ข้างปุ่ม **`+ เพิ่มวุฒิลูกเสือ`** เพื่อไม่ให้ปุ่มถูกตัดขอบ พร้อมย้ายดรอปดาวน์ `ระดับวุฒิ / เครื่องหมาย` และ `ประเภทลูกเสือ` ขึ้นเหนือช่อง `ชื่อวุฒิทางลูกเสือ *` และเติมชื่อวุฒิให้อัตโนมัติเมื่อเลือกดรอปดาวน์ (ยังพิมพ์แก้เองได้อิสระ)
- **รายการไฟล์ที่สร้างใหม่ / แก้ไข:**
  - สร้างใหม่: `supabase/migrations/016_phase7_hr_schema_and_scout_columns.sql`, `src/lib/regulations/education-ranking.ts`, `src/lib/regulations/__tests__/education-ranking.test.ts`, `docs/phase-reports/PHASE_07_REPORT.md`
  - แก้ไข: `src/lib/db/serverDb.ts`, `src/lib/data/schoolData.ts`, `src/components/admin/StaffEditModal.tsx`, `src/app/admin/page.tsx`, `src/components/views/ViewRegLicense.tsx`, `src/components/views/ViewRegStanding.tsx`, `src/components/views/ViewRegScout.tsx`, `docs/phase-reports/README.md`

---

## 5. ผลการทดสอบระบบ (Verification Results)

| รายการตรวจสอบ | คำสั่งที่ใช้ | ผลลัพธ์ |
| :--- | :--- | :--- |
| TypeScript Check | `npx tsc --noEmit` | ผ่าน (Exit Code 0, 0 errors) |
| ESLint | `npm run lint` | ผ่าน (Exit Code 0, 0 errors) |
| Unit Tests | `npm test` (`tsx --test src/**/*.test.ts`) | ผ่าน **249 / 249 เคส** (83 suites, 0 failed — เพิ่มใหม่ +6 เคสใน `education-ranking.test.ts` ครอบคลุมการจัดลำดับวุฒิ, backward compatibility และ `scoutToDb`) |
| Production Build | `npm run build` (`next build`) | ผ่าน (Compiled successfully, 0 errors) |

---

## 6. สิ่งที่ไม่สามารถทำได้ / ข้อจำกัด / ประเด็นนอกขอบเขตที่พบ (Cannot Do / Unknowns / Out-of-Scope Notes)
- **ไม่ได้รัน Migration 016 บน Supabase Production และไม่ได้เปิดเบราว์เซอร์ทดสอบการแสดงผลจริง** ในรอบนี้ (ตรวจสอบ schema/mapping/tests/build ในโค้ดครบถ้วนแล้ว)
- **ข้อควรระวังก่อนรัน Migration 016:** หากยังไม่ได้รัน `016_phase7_hr_schema_and_scout_columns.sql` บน Supabase Production แล้วมีการกดบันทึกวุฒิลูกเสือ PostgREST อาจแจ้งไม่พบคอลัมน์ `order_number` / `issued_by` บน `history_scout` — จึงต้องรัน Migration 016 ทันทีหลัง/ก่อน Deploy

---

## 7. สิ่งที่ผู้ใช้ต้องดำเนินการเองและเช็กลิสต์ตรวจสอบ (Manual Steps & QA Checklist)
1. **รัน SQL Migration ใน Supabase SQL Editor (สำคัญ):**
   - เปิดไฟล์ [`supabase/migrations/016_phase7_hr_schema_and_scout_columns.sql`](file:///D:/ManStat-Modern/supabase/migrations/016_phase7_hr_schema_and_scout_columns.sql) คัดลอกคำสั่งทั้งหมดไปรันใน Supabase SQL Editor (ปลอดภัย รันซ้ำได้แบบ idempotent และมี `NOTIFY pgrst, 'reload schema';` ท้ายไฟล์)
2. **รอ Vercel Auto-Deploy** จาก branch `main` แล้วทดสอบเช็กลิสต์:
   - [ ] เปิด `StaffEditModal` -> ลองคลิกพื้นหลังสีดำรอบนอกหรือกด `Esc` -> Modal ต้อง **ไม่ปิด** และเมื่อแก้ไขข้อมูลแล้วกด `X` หรือ `ยกเลิก` ต้องแสดง `ConfirmModal` เตือนก่อนปิด
   - [ ] ตรวจ **แท็บ 3 (`วุฒิการศึกษาและวิชาเอก`)**: เห็นรายการวุฒิเดิมถูก hydrate พร้อมป้าย `วุฒิสูงสุด`, ลองเพิ่มวุฒิใหม่ที่สูงกว่า -> ป้าย `วุฒิสูงสุด` ย้ายอัตโนมัติ และหลังบันทึกหน้า `ทะเบียนประวัติบุคลากร` ตัวกรองวิชาเอกอัปเดตตรงกัน
   - [ ] ตรวจ **แท็บ 4 (`วิทยฐานะ`)** และ `ViewRegStanding`: มีช่อง `ลงวันที่คำสั่ง (ถ้ามี)` ด้วย `ThaiDatePicker` และบันทึก/แสดงผลได้ถูกต้อง
   - [ ] ตรวจ **แท็บ 5 (`ใบอนุญาตฯ`)** และ `ViewRegLicense`: การ์ดในแท็บ 5 แสดงป้ายสถานะ (`ปกติ`/`ใกล้หมดอายุ`/`หมดอายุ`) และมีตัวเลือก `ผ่อนผัน` ในดรอปดาวน์
   - [ ] ตรวจ **แท็บ 6 (`วุฒิลูกเสือ`)**: ดรอปดาวน์ `ระดับวุฒิ` และ `ประเภทลูกเสือ` อยู่บนสุดและเติม `ชื่อวุฒิทางลูกเสือ` ให้อัตโนมัติ, ปุ่ม `+ เพิ่มวุฒิลูกเสือ` ไม่ถูกตัดขอบ และหลังบันทึก `คำสั่งอ้างอิง` กับ `หน่วยงานที่ออก` ถูกเก็บลง `history_scout` จริง
