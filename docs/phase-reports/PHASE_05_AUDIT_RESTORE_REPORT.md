# รายงานการตรวจสอบและกู้คืน Phase 5 — Forensic Audit & Restoration ของทะเบียนใบอนุญาตฯ, ทะเบียนวิทยฐานะ และทะเบียนวุฒิลูกเสือ (ManStat-Modern)

## 1. ข้อมูลทั่วไปของรอบตรวจสอบและกู้คืน
- **วันที่ดำเนินการ:** 2026-11-27
- **Branch / Base Commit:** `main` (ต่อยอดจาก Phase 4 commit `cd431ff`; เทียบย้อนหลังกับ commit `12b98c3` ก่อนแยกแท็บใน `9f7eae2`)
- **สถานะภาพรวม:** ตรวจสอบครบทั้ง 4 ชั้นและกู้คืนจุดที่ขาดหายเรียบร้อย (ผ่าน `tsc --noEmit`, `eslint`, `npm test` 238/238 เคส และ `next build`)

---

## 2. สกิลที่ค้นพบและนำมาใช้งาน (Skills Discovered & Applied)
- ตรวจสอบโฟลเดอร์ `.agents/` ในโปรเจกต์ `D:\ManStat-Modern`: **ไม่พบโฟลเดอร์ `.agents/`**
- สกิลที่ค้นพบและนำมาใช้งานจากสกิลที่ติดตั้งในระบบ:
  1. **`no-emoji-ui-standard`** (`C:\Users\sic26\.gemini\config\skills\no-emoji-ui-standard\SKILL.md`) — คงมาตรฐาน Zero-Emoji, ไอคอน Lucide SVG ล้วน, ตัวเลขอารบิก (`0-9`) และรองรับ Light / Dark Mode
  2. **`ponytail`** (`C:\Users\sic26\.gemini\config\skills\ponytail\SKILL.md`) — กู้คืนเฉพาะจุดที่ขาดจริงโดยไม่สร้างระบบบันทึกซ้ำซ้อน (คง Single Source of Truth) และไม่กระทบฟีเจอร์ Phase 1–4

---

## 3. รายงานการตรวจสอบสิ่งที่หายไป (Forensic Audit Findings — เทียบ Git History)

| ส่วนที่ตรวจสอบ | เดิมมีอะไร (ก่อน `9f7eae2` / commit `12b98c3`) | สิ่งที่ตรวจพบใน `HEAD` (หายไปตอนไหน/เพราะอะไร) | สิ่งที่กู้คืนและปรับปรุงใน Phase 5 |
| :--- | :--- | :--- | :--- |
| **เมนูหลัก / Sidebar / Mobile Drawer / Hub** | มีเมนูครบทั้ง 3 ทะเบียนในหมวด 3 (`ทะเบียนวิทยฐานะ`, `ทะเบียนใบอนุญาตฯ`, `ทะเบียนวุฒิลูกเสือ`) ใน `src/app/page.tsx` และแท็บใน `ViewPersonnelHub.tsx` | **ไม่หาย** — ยังอยู่ครบทั้ง Desktop Sidebar (`L560-606`), Mobile Drawer (`L881-919`) และ `ViewPersonnelHub` (`L67-109`) | คงไว้เหมือนเดิมทั้งหมด |
| **หน้า `/admin` และ `StaffEditModal`** | มีแท็บ `ใบอนุญาต & วุฒิลูกเสือ` และแท็บ `ประวัติการศึกษา & วิทยฐานะ` อยู่ใน Modal แก้ไขบุคลากรโดยตรง | แท็บทั้ง 2 ถูกถอดออกตามแผน Single Source of Truth ใน commit `9f7eae2` แต่ใน **แถวขยายบุคลากรหน้า `/admin`** มีเพียงข้อความ read-only ไม่มีปุ่มข้ามไปแก้ไข และใน **`StaffEditModal`** ลิงก์ข้ามถูกซ่อนอยู่ล่างสุดของแท็บ 2 (ต้องเลื่อนลงสุดจึงจะเห็น) | 1. เพิ่มลิงก์ด่วน **`วิทยฐานะ · ใบอนุญาตฯ · วุฒิลูกเสือ`** ไว้ด้านซ้ายของ **Footer คงที่ใน `StaffEditModal`** (มองเห็นตลอดเวลาจากทุกแท็บโดยไม่เปลี่ยนความสูง Modal)<br>2. เพิ่มลิงก์ด่วน 3 รายการเดียวกันใน **แถวขยายบุคลากรหน้า `/admin`** ใต้ `วุฒิลูกเสือ & ใบอนุญาต` |
| **ลิงก์ `?view=` และบริบทบุคลากร (`?staff=`)** | `page.tsx` อ่าน `?view=dir_standing`, `dir_license`, `dir_scout` ได้แล้ว (เพิ่มใน `9f7eae2`) | การกดลิงก์จาก `/admin` ไม่ได้ส่ง `&staff=` ไปด้วย ทำให้ผู้ใช้ไปโผล่หน้ารวมและต้องค้นหาชื่อครูใหม่เองทุกครั้ง | ส่ง `&staff=<employeeCode หรือ id>` จากทั้ง `StaffEditModal` และแถวขยายหน้า `/admin` และให้ `ViewRegLicense`, `ViewRegStanding`, `ViewRegScout` อ่าน `?staff=` เพื่อ **กรองชื่อและขยายแถวครูคนนั้นอัตโนมัติ** ทันที |
| **ฟิลด์แก้ไขใบอนุญาตฯ (`ViewRegLicense`)** | มี `category`, `type`, `number`, `issueDate`, `expiryDate` ในแท็บเก่าของ `admin/page.tsx` | **ครบ 100%** ตั้งแต่ Phase 2 (มี Add/Edit/Delete + `ThaiDatePicker` Portal + `ConfirmModal`) | เพิ่มการรับ `?staff=` เพื่อเปิดแถวบุคลากรเป้าหมายอัตโนมัติ |
| **ฟิลด์แก้ไขวิทยฐานะ (`ViewRegStanding`)** | แท็บเก่า (`STANDARD_STANDINGS` ใน `12b98c3`) รองรับทั้ง `ไม่มีวิทยฐานะ`, `ครูผู้ช่วย` และระดับ `ชำนาญการ`–`เชี่ยวชาญพิเศษ` โดยไม่บังคับเลขที่คำสั่งสำหรับสถานะเริ่มต้น | **พบจุดขาด parity:** Phase 2 มีเพียง 4 ระดับ (`ชำนาญการ`–`เชี่ยวชาญพิเศษ`) และบังคับกรอกเลขที่คำสั่ง + วันที่มีผลทุกกรณี ทำให้ตั้งค่า `ไม่มีวิทยฐานะ` หรือ `ครูผู้ช่วย` ไม่ได้ | กู้คืนตัวเลือก **`ไม่มีวิทยฐานะ`** และ **`ครูผู้ช่วย`** ใน `ViewRegStanding.tsx` พร้อมผ่อนผันให้ `เลขที่คำสั่งแต่งตั้ง` และ `วันที่มีผลตามคำสั่ง` เป็น optional สำหรับ 2 ระดับเริ่มต้นนี้ |
| **ฟิลด์แก้ไขวุฒิลูกเสือ (`ViewRegScout`)** | แท็บเก่ามี `highestScout` และ `scoutCertNo` บนตาราง `teachers` | **ครบ 100% + ซิงก์อัตโนมัติ:** ตรวจสอบ `dbUpsertScout` (`serverDb.ts` L1878-1887) ยืนยันว่าบันทึก `history_scout` และซิงก์ `highest_scout` + `scout_cert_no` กลับตาราง `teachers` อัตโนมัติอยู่แล้ว | เพิ่มการรับ `?staff=` เพื่อกรองหาบุคลากรเป้าหมายอัตโนมัติ |
| **การตรวจสิทธิ์ Admin (`isAdminRole`)** | ตรวจเฉพาะ string ตัวพิมพ์เล็ก (`'superuser'`, `'hr_admin'`, `'director'`) | **พบความเสี่ยง:** หาก `localStorage` หรือแหล่งอื่นเก็บ `'Admin'` / `'Superuser'` / `'Director'` ตัวพิมพ์ใหญ่ จะทำให้ `isAdminRole()` คืนค่า `false` และซ่อนปุ่มเพิ่ม/แก้ไข/ลบใน 3 ทะเบียน | ปรับ `isAdminRole()` ใน `src/lib/auth/roles.ts` ให้ normalize ผ่าน `mapAccessLevelToRole()` รองรับทั้งตัวพิมพ์เล็ก/ใหญ่และชื่อสิทธิ์แบบเดิมโดยยังคงบล็อก `'teacher'` / `'user'` เหมือนเดิม |

---

## 4. รายการไฟล์ที่แก้ไขจริงและการยืนยันขอบเขต (Exact Changes Made)
- **แก้ไข:**
  - `src/lib/auth/roles.ts` — ปรับ `isAdminRole()` ให้ normalize ผ่าน `mapAccessLevelToRole()` ป้องกันเคสตัวพิมพ์ใหญ่/ชื่อสิทธิ์ legacy ซ่อนปุ่ม CRUD
  - `src/components/admin/StaffEditModal.tsx` — แสดงลิงก์ด่วน `วิทยฐานะ · ใบอนุญาตฯ · วุฒิลูกเสือ` ใน Footer คงที่ของ Modal (เห็นได้จากทุกแท็บ) และส่ง `staffKey` ไปด้วย
  - `src/app/admin/page.tsx` — ส่ง `&staff=...` ใน `handleNavigateToView()` และเพิ่มลิงก์ด่วน 3 ทะเบียนในแถวขยายบุคลากรหน้า `/admin`
  - `src/components/views/ViewRegLicense.tsx` — อ่าน `?staff=` เพื่อ auto-filter และ auto-expand บุคลากรเป้าหมาย
  - `src/components/views/ViewRegStanding.tsx` — อ่าน `?staff=` เพื่อ auto-filter/auto-expand + กู้คืนระดับ `ไม่มีวิทยฐานะ` และ `ครูผู้ช่วย` (ไม่บังคับเลขที่คำสั่ง/วันที่สำหรับสถานะเริ่มต้น)
  - `src/components/views/ViewRegScout.tsx` — อ่าน `?staff=` เพื่อ auto-filter บุคลากรเป้าหมาย
  - `docs/phase-reports/README.md` — เพิ่มรายการ Phase 5
- **สร้างใหม่:**
  - `docs/phase-reports/PHASE_05_AUDIT_RESTORE_REPORT.md`
- **การยืนยันขอบเขต:** ไม่ได้แก้ไขหรือทำลายฟีเจอร์ Phase 1–4 (`StaffEditModal` 2×2 fixed height, ที่อยู่ไทย, สมาชิกคุรุสภา, ก.ค.ศ. 105+ วิชาเอก, Workload Cat 2, HR CSV Exports) และไม่ได้แก้ไข `PHASE_02_REPORT.md`, `PHASE_03_REPORT.md`, `PHASE_04_REPORT.md`

---

## 5. ผลการทดสอบระบบ (Verification Results)

| รายการตรวจสอบ | คำสั่งที่ใช้ | ผลลัพธ์ |
| :--- | :--- | :--- |
| TypeScript Check | `npx tsc --noEmit` | ผ่าน (Exit Code 0, 0 errors) |
| ESLint | `npm run lint` | ผ่าน (Exit Code 0, 0 errors) |
| Unit Tests | `npm test` (`tsx --test src/**/*.test.ts`) | ผ่าน **238 / 238 เคส** (81 suites, 0 failed) |
| Production Build | `npm run build` (`next build`) | ผ่าน (Compiled successfully, 0 errors) |

---

## 6. สิ่งที่ไม่สามารถทำได้ / ข้อจำกัด / ประเด็นที่ให้ผู้ใช้ตัดสินใจ (Cannot Do / Unknowns / Decisions Needed)
- **ไม่ได้เปิดเบราว์เซอร์จริงและไม่ได้ทดสอบกับฐานข้อมูล Supabase Production** ในรอบนี้ (ตรวจสอบผ่าน Git Forensic Diff, TypeScript, ESLint, Unit Tests และ Next.js Production Build)
- **ประเด็นให้ผู้ใช้ตัดสินใจ (Architecture Decision):**
  - แท็บแก้ไข `ใบอนุญาตฯ`, `วิทยฐานะ`, `วุฒิลูกเสือ` ภายใน `StaffEditModal` เดิมถูกถอดออกตั้งใจตั้งแต่ Phase 1 เพื่อป้องกันปัญหาข้อมูลขัดแย้งกัน (Single Source of Truth) ในรอบนี้จึง **ไม่ได้นำแท็บซ้ำกลับเข้าไปใน `StaffEditModal`** แต่กู้คืนทางเข้าให้เข้าถึงได้ทันทีใน 1 คลิกจาก **Footer ของ `StaffEditModal` (เห็นจากทุกแท็บ)** และจาก **แถวขยายหน้า `/admin`** พร้อมเปิดแถวของครูคนนั้นอัตโนมัติในทะเบียนเฉพาะทาง — หากผู้ใช้ต้องการให้นำแท็บแก้ไขกลับไปไว้ใน `StaffEditModal` โดยตรงแทน สามารถยืนยันเพื่อให้ดำเนินการแยกได้ครับ

---

## 7. สิ่งที่ผู้ใช้ต้องดำเนินการเองและเช็กลิสต์ทดสอบการกู้คืน (Manual Steps & QA Checklist)
1. **ไม่ต้องรัน SQL Migration เพิ่มเติม**
2. **รอ Vercel Auto-Deploy** จาก branch `main` (หรือรัน `npm run dev`) แล้วทดสอบเช็กลิสต์:
   - [ ] **Sidebar หลัก (`/`):** ตรวจหมวด 3 (`งานทะเบียนประวัติ`) ว่ามีเมนู **ทะเบียนวิทยฐานะ**, **ทะเบียนใบอนุญาตฯ**, **ทะเบียนวุฒิลูกเสือ** ครบและกดเข้าได้ทั้ง Desktop และ Mobile Drawer
   - [ ] **จากหน้า `/admin` -> แถวขยายบุคลากร:** กดลิงก์ **วิทยฐานะ / ใบอนุญาตฯ / วุฒิลูกเสือ** -> ตรวจว่าระบบเปิดหน้าทะเบียนนั้นพร้อมกรองและขยายแถวครูคนนั้นให้แก้ทันที
   - [ ] **จาก `StaffEditModal`:** ตรวจว่าเห็นลิงก์ **ทะเบียน: วิทยฐานะ · ใบอนุญาตฯ · วุฒิลูกเสือ** ที่มุมซ้ายล่างของ Footer ตลอดเวลาจากทั้ง 4 แท็บ และกดข้ามไปที่ครูคนเดิมได้ถูกต้อง
   - [ ] **ใน `ทะเบียนวิทยฐานะ`:** ทดสอบเพิ่ม/แก้ไขโดยเลือก `ไม่มีวิทยฐานะ` หรือ `ครูผู้ช่วย` ว่าบันทึกได้โดยไม่ติดบังคับเลขที่คำสั่ง
   - [ ] **สิทธิ์ Admin (`superuser` / `director` / `hr_admin`):** ตรวจว่าปุ่ม **เพิ่ม / แก้ไข / ลบ** แสดงครบในทั้ง 3 ทะเบียน
