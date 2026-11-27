# รายงานผลการดำเนินงาน Phase 6 — ปรับโฉม `StaffEditModal` เป็น 6 แท็บสมดุล (3×2) กว้าง `max-w-4xl`, รวมบัญชี/สิทธิ์เข้าแท็บ 2 และกู้คืนแท็บ วิทยฐานะ / ใบอนุญาตฯ / วุฒิลูกเสือ (ManStat-Modern)

## 1. ข้อมูลทั่วไปของเฟส
- **ชื่อเฟส:** Phase 6 — Redesign `StaffEditModal` into Balanced 6-Tab (3×2) Wider Layout, Merge Account/Permissions into Tab 2 & Restore In-Modal `วิทยฐานะ`, `ใบอนุญาตฯ`, and `วุฒิลูกเสือ` Tabs
- **วันที่ดำเนินการ:** 2026-11-27
- **Branch / Base Commit:** `main` (ต่อยอดจาก Phase 5 commit `35d4b8f`)
- **สถานะภาพรวม:** เสร็จสมบูรณ์ (ผ่าน `tsc --noEmit`, `eslint`, `npm test` 238/238 เคส และ `next build`)

---

## 2. สกิลที่ค้นพบและนำมาใช้งาน (Skills Discovered & Applied)
- ตรวจสอบโฟลเดอร์ `.agents/` ในโปรเจกต์ `D:\ManStat-Modern`: **ไม่พบโฟลเดอร์ `.agents/`**
- สกิลที่ค้นพบและนำมาใช้งานจากสกิลที่ติดตั้งในระบบ:
  1. **`no-emoji-ui-standard`** (`C:\Users\sic26\.gemini\config\skills\no-emoji-ui-standard\SKILL.md`) — บังคับใช้มาตรฐาน Zero-Emoji, ไอคอน Lucide SVG ล้วน, ตัวเลขอารบิก (`0-9`) บนหน้าเว็บทั้งหมด และรองรับ Light / Dark Mode
  2. **`ponytail`** (`C:\Users\sic26\.gemini\config\skills\ponytail\SKILL.md`) — นำคอมโพเนนต์มาตรฐานเดิม (`ThaiDatePicker`, `ConfirmModal`, `formatThaiDateDisplay`, `formatShortStanding`) และ API เดิม (`/api/admin/staff`, `/api/admin/scout`) กลับมาใช้ซ้ำโดยไม่สร้างเส้นทางบันทึกซ้ำซ้อน
  3. **`modern-web-guidance`** (`C:\Users\sic26\.gemini\config\plugins\modern-web-guidance-plugin\skills\modern-web-guidance\SKILL.md`) — เรียกตรวจสอบผ่าน `npx modern-web-guidance@latest search "tablist tabs modal"` เพื่อคง semantic `role="tablist"`, `role="tab"`, `aria-selected`, `role="dialog"` และ `aria-modal="true"` บน Modal 6 แท็บ

---

## 3. สรุปผลการตรวจสอบและแก้ไขจริง (Exact Changes Made)

### 3.1 โครงสร้างใหม่ของ `StaffEditModal` (กว้าง `max-w-4xl`, 6 แท็บสมดุล 3×2, ล็อกความสูง)
- ขยายความกว้างของ Modal จาก `max-w-2xl` เป็น **`max-w-4xl w-full`** เพื่อให้แท็บ 3 ช่องต่อแถวมีพื้นที่กว้างอ่านสบาย ไม่ตัดคำขึ้น 2 บรรทัด (`whitespace-nowrap`)
- ปรับแถบแท็บเป็น **`grid-cols-2 sm:grid-cols-3`** (3 แท็บ × 2 แถวบนเดสก์ท็อป):
  - **แถวที่ 1:** `1. ข้อมูลส่วนตัว` · `2. ตำแหน่งและสังกัด` · `3. วุฒิการศึกษาและวิชาเอก`
  - **แถวที่ 2:** `4. วิทยฐานะ` · `5. ใบอนุญาตฯ` · `6. วุฒิลูกเสือ`
- ล็อกความสูงของกล่องเนื้อหากลางไว้ที่ **`h-[460px] sm:h-[500px] overflow-y-auto px-1`** ทำให้สลับทั้ง 6 แท็บแล้วกรอบ Modal และ Footer ไม่กระโดด
- ย้ายกลุ่ม **`บัญชีและสิทธิ์ระบบ`** (`รหัสประจำตัวบุคลากร`, `ระดับสิทธิ์การใช้งานระบบ`) ไปไว้เป็น Sub-group 2 คอลัมน์ด้านล่างของ **แท็บ 2 (`ตำแหน่งและสังกัด`)**
- ย้ายปุ่ม **`ลบข้อมูลบุคลากร`** (สไตล์ outline สีแดงสุภาพ พร้อมไอคอน `Trash2` ที่เรียก `ConfirmModal` ก่อนลบ) ไปไว้ **มุมซ้ายล่างของ Footer** คู่กับปุ่ม **`ยกเลิก`** และ **`บันทึกการเปลี่ยนแปลง`** ด้านขวาล่าง และถอดลิงก์ข้ามที่ซ้ำซ้อนออกจาก Footer (คงลิงก์ข้ามในแถวขยายหน้า `/admin` ไว้ตามเดิม)

### 3.2 การเชื่อมต่อข้อมูลแบบ Single Source of Truth ของแท็บ 4–6 และการป้องกัน Stale Overwrite
- **แท็บ 4 (`วิทยฐานะ`):** แสดงประวัติคำสั่งแต่งตั้ง (`standings[]`) พร้อม Add / Edit / Delete ในแท็บ (`ConfirmModal`), ใช้ `ThaiDatePicker` (Portal + Auto-Flip), รองรับครบ 6 ระดับ (`ไม่มีวิทยฐานะ`, `ครูผู้ช่วย` ที่ผ่อนผันเลขที่คำสั่ง/วันที่, และ `ชำนาญการ`–`เชี่ยวชาญพิเศษ`), ปรับ `academicStanding` ตามคำสั่งล่าสุดอัตโนมัติ และบันทึกผ่าน `POST /api/admin/staff` ตรงกับ `ViewRegStanding` 100%
- **แท็บ 5 (`ใบอนุญาตฯ`):** แสดงรายการใบอนุญาตที่ถือครอง (`licenses[]`) พร้อม Add / Edit / Delete ในแท็บ (`ConfirmModal`), รองรับประเภทใบอนุญาตมาตรฐานคุรุสภา + ระบุเอง, ใช้ `ThaiDatePicker` สำหรับวันออกและวันหมดอายุ และบันทึกผ่าน `POST /api/admin/staff` ตรงกับ `ViewRegLicense` 100%
- **แท็บ 6 (`วุฒิลูกเสือ`):** ดึงและบันทึกตรงผ่าน **`/api/admin/scout`** (GET / POST / DELETE) ตัวเดียวกับ `ViewRegScout`, ใช้ `ThaiDatePicker` สำหรับวันที่ได้รับวุฒิบัตร และ `ConfirmModal` สำหรับยืนยันการลบ
- **การป้องกันไม่ให้การบันทึกแท็บ 1–5 เขียนทับ `highest_scout` / `scout_cert_no`:**
  - เพิ่ม callback `onScoutSynced(staffId, highestScout, scoutCertNo)` จาก `StaffEditModal` กลับไปที่ `src/app/admin/page.tsx` (`handleScoutSynced`)
  - ทุกครั้งที่เพิ่ม/แก้ไข/ลบวุฒิลูกเสือในแท็บ 6 ระบบจะอัปเดตทั้ง `teachers` list, `selectedStaff`, และ `initialStaffSnapshot` พร้อมกันทันที ทำให้ (1) การกด `บันทึกการเปลี่ยนแปลง` บนแท็บ 1–5 ส่งค่า `highestScout`/`scoutCertNo` ล่าสุดเสมอ ไม่เขียนทับด้วยค่าเก่า และ (2) ไม่ทำให้ `hasStaffUnsavedChanges` แสดงสถานะแก้ไขค้างแบบผิดพลาด (`staffTabDirty.scout = false`)

### 3.3 รายการไฟล์ที่แก้ไขจริงและการยืนยันขอบเขต
- **แก้ไข:**
  - `src/components/admin/StaffEditModal.tsx`
  - `src/app/admin/page.tsx`
  - `docs/phase-reports/README.md`
- **สร้างใหม่:**
  - `docs/phase-reports/PHASE_06_REPORT.md`
- **การยืนยันขอบเขต:** ไม่ได้แก้ไขหรือลบโค้ดใน `ViewRegStanding`, `ViewRegLicense`, `ViewRegScout`, `ViewWorkload`, `ViewOrgChart`, `ViewStaffDirectory`, HR CSV Exports, ลิงก์ด่วนในแถวขยายหน้า `/admin` หรือรายงาน Phase 2–5 ใดๆ

---

## 4. ผลการทดสอบระบบ (Verification Results)

| รายการตรวจสอบ | คำสั่งที่ใช้ | ผลลัพธ์ |
| :--- | :--- | :--- |
| TypeScript Check | `npx tsc --noEmit` | ผ่าน (Exit Code 0, 0 errors) |
| ESLint | `npm run lint` | ผ่าน (Exit Code 0, 0 errors) |
| Unit Tests | `npm test` (`tsx --test src/**/*.test.ts`) | ผ่าน **238 / 238 เคส** (81 suites, 0 failed) |
| Production Build | `npm run build` (`next build`) | ผ่าน (Compiled successfully, 0 errors) |

---

## 5. สิ่งที่ไม่สามารถทำได้ / ข้อมูลที่ไม่ทราบ / ประเด็นนอกขอบเขตที่พบ (Cannot Do / Unknowns / Out-of-Scope Notes)
- **ไม่ได้เปิดเบราว์เซอร์จริงเพื่อตรวจการแสดงผล Light/Dark Mode และไม่ได้ทดสอบการบันทึกจริงกับ Supabase Production** ในรอบนี้ (ตรวจสอบผ่าน TypeScript, ESLint, Unit Tests และ Next.js Production Build)
- **หมายเหตุพฤติกรรมหลังลบวุฒิลูกเสือ (`DELETE /api/admin/scout`):** `dbUpsertScout` ใน `serverDb.ts` ซิงก์ `highest_scout`/`scout_cert_no` กลับตาราง `teachers` อัตโนมัติตอนเพิ่ม/แก้ไข แต่ `dbDeleteScout` ไม่ได้อัปเดตคอลัมน์ `highest_scout` บนตาราง `teachers` โดยตรง — ใน `StaffEditModal` แท็บ 6 `handleScoutSynced` จะอัปเดต state ของหน้า `/admin` ให้ทันที และหากผู้ใช้กด `บันทึกการเปลี่ยนแปลง` บน Modal ค่าใหม่จะถูกบันทึกลงตาราง `teachers` ด้วย (หากต้องการให้ `dbDeleteScout` ซิงก์ตาราง `teachers` อัตโนมัติในระดับ API สามารถแจ้งให้เพิ่มในรอบถัดไปได้ครับ)

---

## 6. สิ่งที่ผู้ใช้ต้องดำเนินการเองและเช็กลิสต์ตรวจสอบ (Manual Steps & QA Checklist)
1. **ไม่ต้องรัน SQL Migration เพิ่มเติม** สำหรับ Phase 6
2. **รอ Vercel Auto-Deploy** จาก branch `main` (หรือรัน `npm run dev`) แล้วทดสอบเช็กลิสต์:
   - [ ] เปิด `/admin` -> กดแก้ไขบุคลากร -> ตรวจว่า Modal กว้างขึ้น (`max-w-4xl`), แท็บเรียง 3×2 สมดุลไม่ตัดบรรทัด, สลับครบ 6 แท็บแล้วกรอบ Modal ไม่กระโดด
   - [ ] ตรวจ **แท็บ 2 (`ตำแหน่งและสังกัด`)** ด้านล่างมี Sub-group **`บัญชีและสิทธิ์ระบบ`** (รหัสประจำตัว + ระดับสิทธิ์) และมุมซ้ายล่างของ Footer มีปุ่ม **`ลบข้อมูลบุคลากร`** ที่เรียก `ConfirmModal`
   - [ ] ทดสอบ **แท็บ 4 (`วิทยฐานะ`)** เพิ่ม/แก้ไข/ลบคำสั่งวิทยฐานะ + กด `บันทึกการเปลี่ยนแปลง` -> ไปตรวจหน้า `ทะเบียนวิทยฐานะ` ว่าข้อมูลตรงกัน 100%
   - [ ] ทดสอบ **แท็บ 5 (`ใบอนุญาตฯ`)** เพิ่ม/แก้ไข/ลบใบอนุญาต + `ThaiDatePicker` + กด `บันทึกการเปลี่ยนแปลง` -> ไปตรวจหน้า `ทะเบียนใบอนุญาตฯ` ว่าข้อมูลตรงกัน 100%
   - [ ] ทดสอบ **แท็บ 6 (`วุฒิลูกเสือ`)** เพิ่ม/แก้ไข/ลบวุฒิลูกเสือ -> ตรวจว่าบันทึกทันทีเข้าหน้า `ทะเบียนวุฒิลูกเสือ` และลองแก้ข้อมูลในแท็บ 1 แล้วกด `บันทึกการเปลี่ยนแปลง` ตรวจว่าไม่เขียนทับ `highest_scout` ที่เพิ่งเพิ่มในแท็บ 6
