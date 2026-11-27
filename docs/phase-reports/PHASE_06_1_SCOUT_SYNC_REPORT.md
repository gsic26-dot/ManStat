# รายงานผลการดำเนินงาน Phase 6.1 (Targeted Patch) — ซิงก์ `highest_scout` และ `scout_cert_no` กลับตาราง `public.teachers` อัตโนมัติใน `dbDeleteScout` (ManStat-Modern)

## 1. ข้อมูลทั่วไปของรอบแก้ไข
- **ชื่อรอบแก้ไข:** Phase 6.1 (Targeted Patch) — Auto-Sync `highest_scout` & `scout_cert_no` inside `dbDeleteScout` (`DELETE /api/admin/scout`)
- **วันที่ดำเนินการ:** 2026-11-27
- **Branch / Base Commit:** `main` (ต่อยอดจาก Phase 6 commit `c73f899`)
- **สถานะภาพรวม:** เสร็จสมบูรณ์ (ผ่าน `tsc --noEmit`, `eslint`, `npm test` 243/243 เคส และ `next build`)

---

## 2. สกิลที่ค้นพบและนำมาใช้งาน (Skills Discovered & Applied)
- ตรวจสอบโฟลเดอร์ `.agents/` ในโปรเจกต์ `D:\ManStat-Modern`: **ไม่พบโฟลเดอร์ `.agents/`**
- สกิลที่ค้นพบและนำมาใช้งานจากสกิลที่ติดตั้งในระบบ:
  1. **`ponytail`** (`C:\Users\sic26\.gemini\config\skills\ponytail\SKILL.md`) — แก้ไขแบบ Surgical Patch เฉพาะส่วน server DB/API และแยก pure helper `resolveHighestScout()` เพื่อใช้ร่วมกันระหว่าง `dbUpsertScout`, `dbDeleteScout` และ Unit Tests โดยไม่แตะต้อง UI หรือไฟล์นอกขอบเขต

---

## 3. สรุปการแก้ไขจริง (Exact Changes Made)

### 3.1 Pure Helper สำหรับจัดอันดับวุฒิลูกเสือ (`src/lib/regulations/scout-ranking.ts`)
- สร้างฟังก์ชันกลาง `getScoutRankScore()` และ `resolveHighestScout()` จัดลำดับศักดิ์วุฒิลูกเสือตามมาตรฐานสำนักงานลูกเสือแห่งชาติ:
  - `B.T.C.` (ขั้นความรู้เบื้องต้น, 1) < `A.T.C.` (ขั้นความรู้ชั้นสูง, 2) < `W.B.` (วูดแบดจ์ 2 ท่อน, 3) < `A.L.T. / A.L.T.C.` (วูดแบดจ์ 3 ท่อน, 4) < `L.T. / L.T.C.` (วูดแบดจ์ 4 ท่อน, 5)
  - กรณีคะแนนระดับเท่ากัน ใช้ `issueDate` ล่าสุดเป็นตัวตัดสิน และตามด้วยรายการที่มีเลขที่วุฒิบัตร
  - กรณีไม่มีวุฒิคงเหลือ คืนค่ามาตรฐานของระบบคือ `highestScout: 'ไม่มีวุฒิลูกเสือ'` และ `scoutCertNo: ''` (ตรงกับ `serverDb.ts` เดิม)

### 3.2 ลำดับการทำงานของ `dbDeleteScout` และ `dbUpsertScout` (`src/lib/db/serverDb.ts`)
- ตรวจสอบตารางจริงใน Supabase: ใช้ตาราง **`history_scout`** (คอลัมน์ `record_id`, `emp_id`, `scout_qualification`, `scout_type`, `cert_number`, `approved_year`) และตาราง **`teachers`** (คอลัมน์ `highest_scout`, `scout_cert_no`)
- **`dbDeleteScout(id)`:**
  1. ค้นหา `emp_id` เจ้าของรายการจาก `history_scout` ด้วย `record_id = id` ก่อนลบ
  2. ลบแถวเป้าหมายออกจาก `history_scout`
  3. ค้นหารายการวุฒิลูกเสือที่เหลือทั้งหมดของบุคลากรคนนั้น (รองรับทั้ง `id` และ `employee_code`) แล้วคำนวณด้วย `resolveHighestScout()`:
     - **กรณี A (มีวุฒิคงเหลือ):** อัปเดต `teachers.highest_scout` และ `teachers.scout_cert_no` เป็นวุฒิสูงสุดอันดับถัดไปทันที
     - **กรณี B (ลบจนหมด 0 รายการ):** อัปเดต `teachers.highest_scout = 'ไม่มีวุฒิลูกเสือ'` และ `teachers.scout_cert_no = ''` ทันที
  4. ทำงานแบบเดียวกันครบถ้วนใน Local JSON Fallback mode ด้วย
- **`dbUpsertScout(scout)`:** ปรับให้ใช้ `syncHighestScoutToTeacherSupabase()` + `resolveHighestScout()` ชุดเดียวกัน ป้องกันกรณีเพิ่มวุฒิระดับต่ำกว่าแล้วไปเขียนทับวุฒิสูงสุดเดิม
- **`DELETE /api/admin/scout` (`src/app/api/admin/scout/route.ts`):** คืนค่า `{ success: true, message, data: { teacherId, highestScout, scoutCertNo } }` เพิ่มเติมโดยยังคง backward-compatible กับ caller เดิม 100%

### 3.3 รายการไฟล์ทั้งหมดที่สร้างใหม่หรือแก้ไข
- **สร้างใหม่:**
  - `src/lib/regulations/scout-ranking.ts`
  - `src/lib/regulations/__tests__/scout-ranking.test.ts` (+5 unit tests)
  - `docs/phase-reports/PHASE_06_1_SCOUT_SYNC_REPORT.md`
- **แก้ไข:**
  - `src/lib/db/serverDb.ts`
  - `src/app/api/admin/scout/route.ts`
  - `docs/phase-reports/README.md`
- **การยืนยันขอบเขต:** ไม่ได้แก้ไข `StaffEditModal.tsx`, `ViewRegScout.tsx`, UI ใดๆ หรือรายงาน Phase 2–6

---

## 4. ผลการทดสอบระบบ (Verification Results)

| รายการตรวจสอบ | คำสั่งที่ใช้ | ผลลัพธ์ |
| :--- | :--- | :--- |
| TypeScript Check | `npx tsc --noEmit` | ผ่าน (Exit Code 0, 0 errors) |
| ESLint | `npm run lint` | ผ่าน (Exit Code 0, 0 errors) |
| Unit Tests | `npm test` (`tsx --test src/**/*.test.ts`) | ผ่าน **243 / 243 เคส** (82 suites, 0 failed — เพิ่มใหม่ +5 เคสใน `scout-ranking.test.ts`) |
| Production Build | `npm run build` (`next build`) | ผ่าน (Compiled successfully, 0 errors) |

---

## 5. สิ่งที่ไม่สามารถทำได้ / ข้อจำกัด (Cannot Do / Unknowns)
- **ไม่ได้ยิงคำสั่งลบจริงกับฐานข้อมูล Supabase Production** ในรอบนี้ (ตรวจสอบตรรกะการจัดอันดับและการคืนค่าว่างผ่าน Unit Tests และตรวจสอบ type/build ครบถ้วน)

---

## 6. สิ่งที่ผู้ใช้ต้องดำเนินการเองและเช็กลิสต์ทดสอบ (Manual Steps & QA Checklist)
1. **ไม่ต้องรัน SQL Migration เพิ่มเติม**
2. **รอ Vercel Auto-Deploy** จาก branch `main` (หรือรัน `npm run dev`) แล้วทดสอบเช็กลิสต์:
   - [ ] ลองลบวุฒิลูกเสือระดับสูงสุดของครูที่มี 2 วุฒิขึ้นไป (จากหน้า `ทะเบียนวุฒิลูกเสือ` หรือ `StaffEditModal` แท็บ 6) -> รีเฟรชหน้า `/admin` และ `ทะเบียนประวัติบุคลากร` ตรวจว่า `highest_scout` เปลี่ยนเป็นวุฒิอันดับรองทันทีโดยไม่ต้องกดบันทึกซ้ำ
   - [ ] ลองลบวุฒิลูกเสือรายการสุดท้ายของครู -> รีเฟรชหน้าตรวจว่า `highest_scout` กลับมาเป็น `ไม่มีวุฒิลูกเสือ` และ `scout_cert_no` เป็นค่าว่าง
