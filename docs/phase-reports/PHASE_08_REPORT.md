# รายงานผลการดำเนินงาน Phase 8 — ยกเครื่องเมนูภาระงานเป็น "งานบริหาร 4 ฝ่ายและหน้าที่พิเศษ" พร้อมมาตรฐานระบบรายงาน สพฐ. และขอบข่ายภาระงาน

**วันที่:** 2026-11-27  
**โครงการ:** ManStat-Modern (สพฐ. / โรงเรียนชุมชนบ้านตะขบ)  
**ขอบเขตงาน:** แยกโครงสร้างงานบริหาร 4 ฝ่ายมาตรฐาน สพฐ. และคณะกรรมการเฉพาะกิจ ออกจากงานสอน (เตรียมรองรับเฟส 9 ตารางสอนและชั่วโมงสอน และเฟส 10 ผังองค์กร / ทำเนียบระบบ สพฐ. / สรุป PA)

---

## 1. สรุปการเปลี่ยนแปลงสำคัญ (Executive Summary)

1. **จัดทำคลังมาตรฐานตำแหน่งงาน 4 ฝ่าย สพฐ. และระบบรายงานอิเล็กทรอนิกส์ 38 ระบบ (`obec-admin-roles.ts`)**
   - ครอบคลุมครบทั้ง 4 ฝ่ายมาตรฐาน สพฐ. (`ฝ่ายบริหารวิชาการ`, `ฝ่ายบริหารงบประมาณ`, `ฝ่ายบริหารงานบุคคล`, `ฝ่ายบริหารทั่วไป`) รวม 31 ตำแหน่งงานมาตรฐาน และ 7 แม่แบบงานโครงการ/คณะกรรมการเฉพาะกิจ พร้อมคำบรรยายขอบข่ายภาระงาน (Job Description) และรหัสระบบรายงาน สพฐ. (`DMC`, `SET`, `e-GP`, `OBEC Asset`, `e-SAR`, `SchoolMIS / OBEC Expert`, `HERO OBEC Care`, `CCT กสศ.`, `DPA`, `ITA Online`, `e-Office` ฯลฯ)
   - ปฏิบัติตามมติคณะรัฐมนตรีวันที่ 23 มกราคม 2567 อย่างเคร่งครัด: **ไม่มีรายการเวรรักษาการณ์สถานศึกษา (กลางวัน/กลางคืน)** ในระบบ
   - ปราศจากข้อความซ้ำซ้อนในชื่อตำแหน่งงาน (เช่น ไม่มีวงเล็บซ้ำ)

2. **ขยายโครงสร้างฐานข้อมูล `staff_workloads` และ API Mapping (Migration 017)**
   - เพิ่มคอลัมน์ใหม่ 4 คอลัมน์แบบ idempotent (`ADD COLUMN IF NOT EXISTS`) บน `public.staff_workloads`:
     - `academic_year TEXT` (ปีการศึกษา เช่น `'2569'`)
     - `scope_description TEXT` (ขอบข่ายภาระงาน / Job Description)
     - `obec_systems JSONB DEFAULT '[]'::jsonb` (รายการรหัสระบบรายงาน สพฐ.)
     - `co_responsible_ids JSONB DEFAULT '[]'::jsonb` (รหัสบุคลากรผู้ร่วมรับผิดชอบหลายคน)
   - อัปเดต `WorkloadItem` ใน `schoolData.ts` และตัวแปลง `workloadFromDb` / `workloadToDb` ใน `serverDb.ts` ให้รองรับครบทั้ง 4 ฟิลด์ทั้งโหมด Supabase และ Local JSON Fallback

3. **ปรับโฉมเมนู `ViewWorkload.tsx` เป็น "งานบริหาร 4 ฝ่ายและหน้าที่พิเศษ"**
   - อัปเดตชื่อเมนูบน Desktop Sidebar และ Mobile Drawer ใน `src/app/page.tsx` และหัวข้อหน้าใน `ViewWorkload.tsx` โดยคง route key `workload` (`/?view=workload`) ไว้เหมือนเดิมเพื่อให้ลิงก์จาก `StaffEditModal` และ `ViewOrgChart` ใช้งานได้ต่อเนื่อง 100%
   - เพิ่มแถบสรุป 4 ฝ่ายมาตรฐาน (คลิกกรองได้), ตัวกรอง **`ปีการศึกษา`** และ **`สังกัดฝ่ายงาน`**
   - ยกเครื่อง Modal `มอบหมายงานบริหารและหน้าที่พิเศษ` พร้อม **ล็อกการปิด Modal** (ปิดได้เฉพาะปุ่ม `X` หรือ `ยกเลิก` เท่านั้น ห้ามปิดเมื่อคลิกพื้นหลังหรือกด `Escape`), เลือกแม่แบบงานแบบ `<optgroup>` แยก 4 ฝ่ายที่เติมข้อมูลฝ่ายงาน/ตำแหน่ง/ขอบข่าย/ระบบรายงานอัตโนมัติ, แผงเลือก **ระบบรายงาน สพฐ.** แบบแท็กพร้อมเพิ่มระบบเองได้, และ **Multi-Select Staff Picker** สำหรับเลือกผู้ร่วมรับผิดชอบหลายคน
   - **คงข้อมูลเดิมอย่างปลอดภัย (Non-Destructive):** ไม่ลบข้อมูลหมวด 1 เดิม (`งานสอนและการจัดการเรียนรู้`) และแสดงแยกในกล่องอ่านอย่างเดียว `รายการงานสอนเดิม — รอโอนย้ายสู่เมนูตารางสอนในเฟส 9`
   - ใช้ `ConfirmModal` แทนป๊อปอัปยืนยันการลบเดิม, ใช้ Lucide SVG 100% ปลอด Emoji, และคงการซิงก์ `WORKLOAD_ADMIN_CATEGORY` กับ `getStaffDivisions()` และ `ViewOrgChart`

---

## 2. รายการไฟล์ที่สร้างใหม่และแก้ไข (Changed Files)

| ไฟล์ | ประเภท | รายละเอียดการเปลี่ยนแปลง |
| :--- | :--- | :--- |
| `src/lib/regulations/obec-admin-roles.ts` | สร้างใหม่ | คลังมาตรฐาน 38 ระบบรายงาน สพฐ. (`OBEC_SYSTEM_CATALOG`), 31 ตำแหน่งงาน 4 ฝ่าย (`OBEC_ADMIN_ROLE_PRESETS`), 7 แม่แบบโครงการ/กรรมการ (`ADHOC_PROJECT_PRESETS`), บทบาทในงาน (`ADMIN_TASK_ROLES`) และ `getCurrentThaiAcademicYear()` |
| `src/lib/regulations/__tests__/obec-admin-roles.test.ts` | สร้างใหม่ | ชุด Unit Test 5 รายการ ตรวจความครบถ้วนทั้ง 4 ฝ่าย, มติ ครม. 23 ม.ค. 2567, ความถูกต้องของรหัสระบบ สพฐ., และ round-trip ของ `workloadToDb` / `workloadFromDb` |
| `supabase/migrations/017_phase8_admin_roles_and_obec_systems.sql` | สร้างใหม่ | SQL Migration เพิ่มคอลัมน์ `academic_year`, `scope_description`, `obec_systems`, `co_responsible_ids` บน `public.staff_workloads` พร้อม `NOTIFY pgrst, 'reload schema'` |
| `src/lib/data/schoolData.ts` | แก้ไข | ขยายอินเทอร์เฟซ `WorkloadItem` เพิ่ม `academicYear?`, `scopeDescription?`, `obecSystems?`, `coResponsibleIds?` และสถานะ `'ดำเนินการแล้วเสร็จ'`, `'รอดำเนินการ'` |
| `src/lib/db/serverDb.ts` | แก้ไข | อัปเดต `workloadFromDb` และ `workloadToDb` ให้บันทึกและอ่านฟิลด์ใหม่ทั้ง 4 ฟิลด์ครบถ้วน |
| `src/app/page.tsx` | แก้ไข | เปลี่ยนชื่อเมนูใน Desktop Sidebar และ Mobile Drawer เป็น `งานบริหาร 4 ฝ่ายและหน้าที่พิเศษ` (คง `activeView === 'workload'`) |
| `src/components/views/ViewWorkload.tsx` | แก้ไข | ยกเครื่องหน้าจอเป็น `งานบริหาร 4 ฝ่ายและหน้าที่พิเศษ` พร้อมตัวกรองปีการศึกษา/ฝ่ายงาน, การ์ดขอบข่ายงานและป้ายระบบ สพฐ., Modal ล็อกการปิดพร้อมตัวเลือกแม่แบบ 4 ฝ่าย + Multi-Select ผู้ร่วมรับผิดชอบ, และกล่องอ่านอย่างเดียวสำหรับงานสอนเดิม |
| `docs/phase-reports/PHASE_08_REPORT.md` | สร้างใหม่ | รายงานสรุปผลการดำเนินงาน Phase 8 ฉบับนี้ |
| `docs/phase-reports/README.md` | แก้ไข | เพิ่มแถวดัชนีรายงาน Phase 8 |

---

## 3. ผลการตรวจสอบอัตโนมัติ (Automated Verification Results)

| รายการตรวจ | คำสั่ง | ผลลัพธ์ |
| :--- | :--- | :--- |
| TypeScript Type Check | `npx tsc --noEmit` | ผ่าน (0 errors) |
| ESLint | `npm run lint` | ผ่าน (0 errors, 0 warnings) |
| Unit Tests | `npm test` (`tsx --test src/**/*.test.ts`) | ผ่าน **254 / 254** เทสต์ (84 suites, รวม 5 เทสต์ใหม่ของ Phase 8) |
| Production Build | `npm run build` (Next.js 16.4.6 Turbopack) | ผ่าน (0 errors) |

---

## 4. ขั้นตอนที่ผู้ใช้ต้องดำเนินการบน Supabase (Manual SQL Migration Required)

ก่อนใช้งานการบันทึก `ปีการศึกษา`, `ขอบข่ายภาระงาน`, `ระบบรายงาน สพฐ.` และ `ผู้ร่วมรับผิดชอบหลายคน` บนฐานข้อมูลจริง กรุณานำไฟล์ต่อไปนี้ไปรันใน **Supabase SQL Editor**:

- ไฟล์ Migration: `supabase/migrations/017_phase8_admin_roles_and_obec_systems.sql`

> สคริปต์ใช้ `ADD COLUMN IF NOT EXISTS` และ `NOTIFY pgrst, 'reload schema'` จึงสามารถรันซ้ำได้อย่างปลอดภัย (Idempotent) โดยไม่กระทบข้อมูลเดิมในตาราง `public.staff_workloads`

---

## 5. สิ่งที่ยังไม่ได้ตรวจสอบในสภาพแวดล้อมจริง (Not Yet Verified in Live Environment)

- ยังไม่ได้รัน `017_phase8_admin_roles_and_obec_systems.sql` กับฐานข้อมูล Supabase Production จริง (ต้องให้ผู้ดูแลระบบรันผ่าน Supabase SQL Editor)
- ยังไม่ได้ทดสอบคลิกผ่านเบราว์เซอร์จริง (Live UI / E2E Test) ทั้งโหมด Light/Dark, การกรองปีการศึกษา/ฝ่ายงาน, การเลือกแม่แบบ 4 ฝ่าย, การบันทึกและรีโหลดข้อมูลจริงหลังรัน Migration 017

---

## 6. ความต่อเนื่องสู่เฟสถัดไป (Roadmap Handoff)

- **Phase 9:** สร้างเมนู **`ตารางสอนและชั่วโมงสอน`** แยกเฉพาะสำหรับภาระงานสอน (หมวด 1 เดิม) พร้อมเครื่องมือโอนย้ายรายการงานสอนเดิมที่แสดงอ่านอย่างเดียวใน Phase 8
- **Phase 10:** เชื่อมโยงข้อมูลจาก Phase 8 + Phase 9 สู่ **ผังองค์กร (`ViewOrgChart`)**, **ทำเนียบผู้รับผิดชอบระบบรายงาน สพฐ.** และ **สรุปชั่วโมงภาระงาน PA ตามเกณฑ์ ว9/2564**
