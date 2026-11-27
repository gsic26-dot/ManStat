# รายงานผลการดำเนินงาน Phase 4 — ปิดงานตกค้างฝ่ายงาน, ส่งออกรายงาน HR/ใบอนุญาตฯ (CSV UTF-8 BOM + PDPA) และตรวจสอบสิทธิ์ข้ามโมดูล (ManStat-Modern)

## 1. ข้อมูลทั่วไปของเฟส
- **ชื่อเฟส:** Phase 4 — Close Phase 3 Division Carry-Over (`ViewWorkload`), Add Standardized HR & License Expiry Exports, Run Cross-Module Permission/PDPA Audit
- **วันที่ดำเนินการ:** 2026-11-27
- **Branch / Base Commit:** `main` (ต่อยอดจาก Phase 3 commit `0177f76`)
- **สถานะภาพรวม:** เสร็จสมบูรณ์ (ผ่าน `tsc --noEmit`, `eslint`, `npm test` 238/238 เคส และ `next build`)

---

## 2. สกิลที่ค้นพบและนำมาใช้งาน (Skills Discovered & Applied)
- ตรวจสอบโฟลเดอร์ `.agents/` ในโปรเจกต์ `D:\ManStat-Modern`: **ไม่พบโฟลเดอร์ `.agents/`**
- สกิลที่ค้นพบและนำมาใช้งานจากสกิลที่ติดตั้งในระบบ:
  1. **`no-emoji-ui-standard`** (`C:\Users\sic26\.gemini\config\skills\no-emoji-ui-standard\SKILL.md`) — บังคับใช้มาตรฐาน Zero-Emoji, ไอคอน Lucide SVG ล้วน (`Download`), ตัวเลขอารบิก (`0-9`) บนหน้าเว็บทั้งหมด และรองรับ Light / Dark Mode
  2. **`ponytail`** (`C:\Users\sic26\.gemini\config\skills\ponytail\SKILL.md`) — สร้าง pure CSV export helper แบบ zero-dependency และนำ helper กลางเดิม (`getStaffDivisions`, `maskPhoneNumber`, `isAdminRole`, `formatThaiAddress`, `calculateRetirementInfo`, `formatShortStanding`) กลับมาใช้ซ้ำ
  3. **`modern-web-guidance`** (`C:\Users\sic26\.gemini\config\plugins\modern-web-guidance-plugin\skills\modern-web-guidance\SKILL.md`) — เรียกตรวจสอบผ่าน `npx modern-web-guidance@latest search "download button accessibility"` และกำหนด `aria-label` + disabled state บนปุ่มดาวน์โหลด CSV

---

## 3. สรุปผลการตรวจสอบและแก้ไขจริง (Exact Changes Made)

### 3.1 ปิดงานตกค้างจาก Phase 3 (`ViewWorkload.tsx`)
- นำเข้า `getStaffDivisions` ใน `src/components/views/ViewWorkload.tsx` และคำนวณ `derivedDivisions = getStaffDivisions(teacher, workloads)` สำหรับบุคลากรทุกคน
- ปรับการ์ดสรุปด้านที่ 2 (`2. บริหารและงานฝ่าย`) และข้อความ empty state ในแถวขยายให้แสดงรายการฝ่ายงานจาก `derivedDivisions` (`w.derivedDivisions.join(', ')` หรือ `'ยังไม่ระบุภาระงานฝ่าย'`) แทนฟิลด์ `w.division` เดิม ทำให้ทุกหน้าจอในระบบแสดงสังกัดฝ่ายงานจากแหล่งข้อมูลเดียวกัน 100%

### 3.2 ระบบส่งออกรายงานมาตรฐาน HR และใบอนุญาตประกอบวิชาชีพ (`hrExports.ts`)
- สร้าง pure helper **`src/lib/exports/hrExports.ts`** แบบไม่เพิ่ม dependency ภายนอก รองรับ **UTF-8 with BOM (`\uFEFF`)**, **RFC-4180 CSV escaping** และ **Excel Formula-Injection Neutralization** (เติม `'` นำหน้าข้อความที่ขึ้นต้นด้วย `=`, `+`, `@`, `\t`, `\r` หรือ `-` ที่ไม่ใช่ตัวเลขติดลบ)
- **ทะเบียนประวัติบุคลากร (`ViewStaffDirectory.tsx`):**
  - เพิ่มปุ่ม **`ส่งออก Excel (CSV)`** ในแถบส่วนหัว ส่งออกเฉพาะรายการตามตัวกรองปัจจุบัน (ฝ่ายงาน / วิชาเอก / เกษียณภายใน 5 ปี / คำค้นหา) ครบ 23 คอลัมน์มาตรฐาน Phase 1–3
  - **นโยบาย PDPA ในไฟล์ส่งออก:**
    - **ไม่ส่งออก** `เลขประจำตัวประชาชน (13 หลัก)` และข้อมูล `ผู้ติดต่อกรณีฉุกเฉิน` ในทุกสิทธิ์ (ทั้ง Admin และ Teacher)
    - **สิทธิ์ Teacher (non-admin):** ปกปิด `เบอร์โทรศัพท์` ด้วย `maskPhoneNumber()` (เช่น `089-***-4567`) และปกปิด `วันเดือนปีเกิด` กับ `ที่อยู่ปัจจุบัน` เป็น `"สงวนสิทธิ์ (PDPA)"` ขณะที่ยังแสดง `ปีเกษียณอายุราชการ (พ.ศ.)` เพื่อใช้วางแผนอัตรากำลัง
    - **สิทธิ์ Admin (`isAdminRole`):** แสดงวันเกิด (พ.ศ.), เบอร์โทรศัพท์ และที่อยู่ปัจจุบันรูปแบบมาตรฐานไทย เพื่อใช้งานทะเบียนบุคลากร
- **ทะเบียนใบอนุญาตประกอบวิชาชีพ (`ViewRegLicense.tsx`):**
  - เพิ่มปุ่ม **`ส่งออกรายงานใบอนุญาตฯ`** ในแถบส่วนหัว ส่งออก 9 คอลัมน์ (รหัสประจำตัว, ชื่อ-สกุล, ตำแหน่ง, ประเภทใบอนุญาต, เลขที่ใบอนุญาต, วันที่ออกเอกสาร, วันหมดอายุ, สถานะ, คงเหลือ (วัน)) ตามตัวกรองปัจจุบัน และเรียงลำดับความเร่งด่วนอัตโนมัติ: `หมดอายุ` -> `ใกล้หมดอายุ` -> `ยังไม่มีข้อมูล` -> `ปกติ`

### 3.3 ผลการตรวจสอบ Cross-Module Permission & UI Quality Audit (6 หน้า HR/ทะเบียน)

| หน้าจอ (View) | Role Guard (`isAdminRole` / `canManage`) | Native `alert()` / `confirm()` | Native `<input type="date">` | สถานะ |
| :--- | :--- | :---: | :---: | :--- |
| `ViewStaffDirectory.tsx` | Read-only + PDPA Shield + PDPA CSV masking สำหรับ Teacher | 0 | 0 | ผ่าน |
| `ViewRegLicense.tsx` | Admin CRUD ถูก guard ทั้ง UI และ Handler ด้วย `canManage` | 0 | 0 (ใช้ `ThaiDatePicker`) | ผ่าน |
| `ViewRegScout.tsx` | Admin CRUD ถูก guard ทั้ง UI และ Handler ด้วย `canManage` | 0 | 0 (ใช้ `ThaiDatePicker`) | ผ่าน |
| `ViewRegStanding.tsx` | Admin CRUD ถูก guard ทั้ง UI และ Handler ด้วย `canManage` | 0 | 0 (ใช้ `ThaiDatePicker`) | ผ่าน |
| `ViewWorkload.tsx` | Admin CRUD ถูก guard ทั้ง UI และ Handler ด้วย `canManage` | 0 | 0 | ผ่าน |
| `ViewOrgChart.tsx` | Read-only + ซิงก์ `getDivisionMembers()` พร้อม key เฉพาะฝ่าย | 0 | 0 | ผ่าน |

### 3.4 รายการไฟล์ทั้งหมดที่สร้างใหม่หรือแก้ไข
- **สร้างใหม่:**
  - `src/lib/exports/hrExports.ts`
  - `src/lib/exports/__tests__/hrExports.test.ts`
  - `docs/phase-reports/PHASE_04_REPORT.md`
- **แก้ไข:**
  - `src/components/views/ViewWorkload.tsx`
  - `src/components/views/ViewStaffDirectory.tsx`
  - `src/components/views/ViewRegLicense.tsx`
  - `docs/phase-reports/README.md`
- **การยืนยันขอบเขต:** ไม่ได้แก้ไขหรือลบโค้ดนอกขอบเขต และไม่ได้แก้ไข `PHASE_02_REPORT.md` หรือ `PHASE_03_REPORT.md`

---

## 4. ผลการทดสอบระบบ (Verification Results)

| รายการตรวจสอบ | คำสั่งที่ใช้ | ผลลัพธ์ |
| :--- | :--- | :--- |
| TypeScript Check | `npx tsc --noEmit` | ผ่าน (Exit Code 0, 0 errors) |
| ESLint | `npm run lint` | ผ่าน (Exit Code 0, 0 errors) |
| Unit Tests | `npm test` (`tsx --test src/**/*.test.ts`) | ผ่าน **238 / 238 เคส** (81 suites, 0 failed — เพิ่มใหม่ +4 เคสใน `hrExports.test.ts`) |
| Production Build | `npm run build` (`next build`) | ผ่าน (Compiled successfully, 0 errors) |

---

## 5. สิ่งที่ไม่สามารถทำได้ / ข้อมูลที่ไม่ทราบ / ประเด็นนอกขอบเขตที่พบ (Cannot Do / Unknowns / Out-of-Scope Notes)
- **ไม่ได้เปิดไฟล์ `.csv` ที่ดาวน์โหลดจริงใน Microsoft Excel บน Windows/macOS** ในรอบนี้ (ตรวจสอบโครงสร้าง UTF-8 BOM `\uFEFF`, RFC-4180 escaping, formula-injection neutralization และ PDPA masking ด้วย Unit Tests อัตโนมัติแล้ว)
- **ไม่ได้ทดสอบการแสดงผลจริงบนเบราว์เซอร์และข้อมูลจริงใน Supabase Production** ในรอบนี้
- **หมายเหตุไฟล์ส่งออกเดิมในโปรเจกต์:** พบไฟล์เดิม `src/lib/export/excel-exporter.ts` (ใช้ SheetJS สร้าง `.xlsx` 4 ชีตรวมแบบ legacy สำหรับ `StaffDirectoryView`) — คงไว้ไม่แตะต้องตามกฎ Strict Scope และสร้าง `src/lib/exports/hrExports.ts` แยกสำหรับ CSV UTF-8 BOM ของ `TeacherRecord` และ `PersonLicenseRecord` โดยเฉพาะ

---

## 6. สิ่งที่ผู้ใช้ต้องดำเนินการเองและเช็กลิสต์ตรวจสอบ (Manual Steps & QA Checklist)
1. **ไม่ต้องรัน SQL Migration เพิ่มเติม** สำหรับ Phase 4
2. **รอ Vercel Auto-Deploy** จาก branch `main` (หรือรัน `npm run dev`) แล้วทดสอบเช็กลิสต์:
   - [ ] **ตารางสอนและภาระงาน (`ViewWorkload`):** ขยายแถวครูที่รับงานหมวด 2 หลายฝ่าย -> ตรวจว่าการ์ด `2. บริหารและงานฝ่าย` แสดงรายชื่อฝ่ายงานครบตรงกับ `ViewOrgChart` และ `ViewStaffDirectory`
   - [ ] **ส่งออกทะเบียนบุคลากร (`ViewStaffDirectory`):** ลองกรองตามฝ่ายงาน / วิชาเอก / เกษียณภายใน 5 ปี -> กด **`ส่งออก Excel (CSV)`** -> ดับเบิลคลิกเปิดใน Microsoft Excel ตรวจว่าภาษาไทยอ่านได้ปกติไม่เพี้ยน และตรวจว่าสิทธิ์ Teacher ถูกปกปิดเบอร์โทร/วันเกิด/ที่อยู่เป็น PDPA
   - [ ] **ส่งออกรายงานใบอนุญาตฯ (`ViewRegLicense`):** กด **`ส่งออกรายงานใบอนุญาตฯ`** -> เปิดใน Microsoft Excel ตรวจว่าภาษาไทยปกติและรายการ `หมดอายุ` / `ใกล้หมดอายุ` ถูกจัดเรียงขึ้นด้านบนสุด
