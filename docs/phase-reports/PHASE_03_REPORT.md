# รายงานผลการดำเนินงาน Phase 3 — มาตรฐานฝ่ายงานภาระงานหมวด 2, ซิงก์ผังองค์กรหลายฝ่าย และตัวกรอง HR + คาดการณ์ปีเกษียณในทะเบียนบุคลากร (ManStat-Modern)

## 1. ข้อมูลทั่วไปของเฟส
- **ชื่อเฟส:** Phase 3 — Standardize Workload Category 2 Divisions, Verify Multi-Division Org Chart Sync, Add HR Filters & Retirement Forecast to Staff Directory
- **วันที่ดำเนินการ:** 2026-11-27
- **Branch / Base Commit:** `main` (ต่อยอดจาก Phase 2 commit `fc669db`)
- **สถานะภาพรวม:** เสร็จสมบูรณ์ (ผ่าน `tsc --noEmit`, `eslint`, `npm test` 234/234 เคส และ `next build`)

---

## 2. สกิลที่ค้นพบและนำมาใช้งาน (Skills Discovered & Applied)
- ตรวจสอบโฟลเดอร์ `.agents/` ในโปรเจกต์ `D:\ManStat-Modern`: **ไม่พบโฟลเดอร์ `.agents/`**
- สกิลที่ค้นพบและนำมาใช้งานจากสกิลที่ติดตั้งในระบบ:
  1. **`no-emoji-ui-standard`** (`C:\Users\sic26\.gemini\config\skills\no-emoji-ui-standard\SKILL.md`) — บังคับใช้มาตรฐาน Zero-Emoji, ไอคอน Lucide SVG ล้วน, ตัวเลขอารบิก (`0-9`) บนหน้าเว็บทั้งหมด และรองรับ Light / Dark Mode
  2. **`ponytail`** (`C:\Users\sic26\.gemini\config\skills\ponytail\SKILL.md`) — แก้ไขเฉพาะส่วนที่จำเป็น ไม่สร้างความซ้ำซ้อน และนำฟังก์ชันกลางเดิม (`getStaffDivisions`, `STANDARD_DIVISIONS`, `normalizeDivisionName`, `calculateRetirementInfo`, `getFiscalYearBE`) กลับมาใช้ซ้ำอย่างเป็นระบบ
  3. **`modern-web-guidance`** (`C:\Users\sic26\.gemini\config\plugins\modern-web-guidance-plugin\skills\modern-web-guidance\SKILL.md`) — เรียกตรวจสอบผ่าน `npx modern-web-guidance@latest search "select form filter table"` และนำแนวทาง accessible `<select>` พร้อม `aria-label` ที่ชัดเจนมาใช้กับแถบตัวกรอง HR

---

## 3. สรุปผลการตรวจสอบและแก้ไขจริง (Exact Changes Made)

### 3.1 มาตรฐานฝ่ายงานในภาระงานหมวด 2 (`ViewWorkload.tsx`)
- เปลี่ยนช่อง `subGroupOrLevel` ใน Modal เพิ่ม/แก้ไขภาระงาน เมื่อเลือกหมวดที่ 2 (`งานบริหารและงานประจำฝ่าย/กลุ่มงาน`) จาก `<input type="text">` อิสระ เป็น `<select required>` ที่มี **4 ฝ่ายมาตรฐาน สพฐ.** (`ฝ่ายบริหารวิชาการ`, `ฝ่ายบริหารงบประมาณ`, `ฝ่ายบริหารงานบุคคล`, `ฝ่ายบริหารทั่วไป`)
- คงความเข้ากันได้ย้อนหลัง (Backward Compatibility): หากรายการเดิมมีค่า `subGroupOrLevel` นอกเหนือจาก 4 ฝ่ายมาตรฐาน จะคงตัวเลือก `<option value={formSubGroup}>{formSubGroup} (ข้อมูลเดิม)</option>` ไว้เพื่อไม่ให้ข้อมูลเดิมหายเมื่อเปิดแก้ไข
- เมื่อเลือก Preset ในหมวดที่ 2 จะ normalize ค่า `found.sub` ผ่าน `normalizeDivisionName()` ให้ตรงกับ 4 ฝ่ายมาตรฐานโดยอัตโนมัติ

### 3.2 การตรวจสอบ `staffDivisions.ts` และ `ViewOrgChart.tsx`
- ตรวจสอบ **`src/lib/staffDivisions.ts`**: ยืนยันว่า `getStaffDivisions()` และ `getDivisionMembers()` ทำงานถูกต้องครบถ้วน — ผู้อำนวยการคืนค่า `['ผู้บริหารสถานศึกษา']`, ครูที่รับงานหมวด 2 ข้าม 1–4 ฝ่ายถูก normalize + deduplicate + เรียงตามลำดับ 4 ฝ่ายมาตรฐาน, และ fallback ไปใช้ `staff.division` เดิมเฉพาะกรณีไม่มีรายการหมวด 2
- ปรับปรุง **`src/components/views/ViewOrgChart.tsx`**: ยืนยันว่าแสดงสมาชิกทุกฝ่ายที่บุคลากรปฏิบัติงานจริงผ่าน `getDivisionMembers()` และปรับ React `key` ของรายชื่อบุคลากรใน Modal กลุ่มงานเป็น `${activeModalDivision.id}-${m.id}` เพื่อป้องกัน key ชนกันเมื่อครูคนเดียวกันอยู่หลายฝ่าย
- เพิ่ม unit tests ใน **`src/lib/__tests__/staffDivisions.test.ts`** (+2 เคส): ครอบคลุมครูที่อยู่ 1 ฝ่าย (override legacy `staff.division`) และครูที่รับงานครบทั้ง 4 ฝ่ายพร้อมรายการซ้ำในฝ่ายเดียวกัน

### 3.3 ยกระดับทะเบียนประวัติบุคลากร (`ViewStaffDirectory.tsx`)
- เพิ่มแถบตัวกรอง HR แบบกะทัดรัดใต้แท็บกลุ่มสาระเดิม (ไม่ซ้ำซ้อนกับตัวกรองเดิม):
  - **สังกัดฝ่ายงาน** (`ทั้งหมด` / `ผู้บริหารสถานศึกษา` / 4 ฝ่ายมาตรฐาน สพฐ.) กรองผ่าน `getStaffDivisions(staff, workloadsList)` รองรับครูหลายฝ่าย
  - **วิชาเอก** (`ทั้งหมด` + รายชื่อวิชาเอกที่ไม่ว่างในระบบ เรียงลำดับตามอักษรภาษาไทย `localeCompare('th')`)
  - **คาดการณ์ปีเกษียณอายุราชการ** (`ทั้งหมด` / `เกษียณภายใน 5 ปี` / `เรียงตามปีเกษียณใกล้สุด`)
  - ปุ่ม **`ล้างตัวกรอง`** แสดงเฉพาะเมื่อมีการใช้งานตัวกรองใดตัวกรองหนึ่ง
- แสดงปีเกษียณอายุราชการ (คำนวณจาก `calculateRetirementInfo` ใน `src/lib/regulations/fiscal-and-retirement.ts` ที่ใช้ร่วมกับ Phase 1) ทั้งใน Table View (`เกษียณ 2575` หรือ `เกษียณ -`) และ Card View (`คาดการณ์เกษียณ: พ.ศ. 2575` หรือ `-`) โดยเน้นสีอำพันแบบสุภาพสำหรับผู้ที่จะเกษียณภายใน 5 ปีงบประมาณ
- เพิ่มไฟล์ unit tests ใหม่ **`src/lib/regulations/__tests__/fiscal-and-retirement.test.ts`** (+5 เคส): ทดสอบกฎเหล็กวันเกิด **1 ตุลาคม** (ไม่บวก 1 ปี) เทียบกับ **2 ตุลาคม** (บวก 1 ปี), 30 กันยายน, 1 มกราคม, 31 ธันวาคม และรอยต่อปีงบประมาณไทย

### 3.4 รายการไฟล์ทั้งหมดที่สร้างใหม่หรือแก้ไข
- **แก้ไข:**
  - `src/components/views/ViewWorkload.tsx`
  - `src/components/views/ViewOrgChart.tsx`
  - `src/components/views/ViewStaffDirectory.tsx`
  - `src/lib/__tests__/staffDivisions.test.ts`
  - `docs/phase-reports/README.md`
- **สร้างใหม่:**
  - `src/lib/regulations/__tests__/fiscal-and-retirement.test.ts`
  - `docs/phase-reports/PHASE_03_REPORT.md`
- **การยืนยันขอบเขต:** ไม่ได้แก้ไขหรือลบโค้ดนอกขอบเขต ไม่ได้แก้ `StaffEditModal.tsx` ของ Phase 1, ไม่ได้แก้ CRUD ทะเบียนของ Phase 2 และไม่ได้แก้ไข `PHASE_02_REPORT.md`

---

## 4. ผลการทดสอบระบบ (Verification Results)

| รายการตรวจสอบ | คำสั่งที่ใช้ | ผลลัพธ์ |
| :--- | :--- | :--- |
| TypeScript Check | `npx tsc --noEmit` | ผ่าน (Exit Code 0, 0 errors) |
| ESLint | `npm run lint` | ผ่าน (Exit Code 0, 0 errors) |
| Unit Tests | `npm test` (`tsx --test src/**/*.test.ts`) | ผ่าน **234 / 234 เคส** (80 suites, 0 failed — เพิ่มใหม่ +7 เคส) |
| Production Build | `npm run build` (`next build`) | ผ่าน (Compiled successfully, 0 errors) |

---

## 5. สิ่งที่ไม่สามารถทำได้ / ข้อมูลที่ไม่ทราบ / ประเด็นนอกขอบเขตที่พบ (Cannot Do / Unknowns / Out-of-Scope Notes)
- **ไม่ได้ทดสอบการแสดงผลจริงบนเบราว์เซอร์และข้อมูลจริงใน Supabase Production** ในรอบนี้ (ตรวจสอบผ่าน TypeScript, ESLint, Unit Tests และ Next.js Production Build เท่านั้น)
- **หมายเหตุนอกขอบเขต (ไม่แก้ไขโดยพลการ):** ใน `ViewWorkload.tsx` บรรทัดที่ 668 (การ์ดสรุปด้านที่ 2 `บริหารและงานฝ่าย` ในแถวขยาย) ยังแสดง `w.division || 'งานประจำฝ่าย'` จากฟิลด์เดิมของบุคลากรแทนการดึงจาก `getStaffDivisions()` — แจ้งไว้เพื่อให้ผู้ใช้พิจารณาว่าต้องการปรับในรอบถัดไปหรือไม่

---

## 6. สิ่งที่ผู้ใช้ต้องดำเนินการเองและเช็กลิสต์ตรวจสอบ (Manual Steps & QA Checklist)
1. **ไม่ต้องรัน SQL Migration เพิ่มเติม** สำหรับ Phase 3
2. **รอ Vercel Auto-Deploy** จาก branch `main` (หรือรัน `npm run dev`) แล้วทดสอบเช็กลิสต์ดังนี้:
   - [ ] **ตารางสอนและภาระงาน (`ViewWorkload`):** กดเพิ่ม/แก้ไขงานในหมวดที่ 2 (`งานบริหารและงานประจำฝ่าย/กลุ่มงาน`) -> ตรวจว่าช่องสังกัดแสดงดรอปดาวน์ 4 ฝ่ายมาตรฐาน สพฐ. และเมื่อแก้รายการเดิมที่มีค่า legacy ข้อมูลไม่หาย
   - [ ] **ผังโครงสร้างองค์กร (`ViewOrgChart`):** ครูที่รับงานหมวด 2 มากกว่า 1 ฝ่าย แสดงครบทุกฝ่ายที่ปฏิบัติงานใน Modal `ดูขอบข่ายภารกิจทั้งหมด` โดยไม่มีชื่อซ้ำในฝ่ายเดียวกัน
   - [ ] **ทะเบียนประวัติบุคลากร (`ViewStaffDirectory`):** ทดสอบตัวกรอง **สังกัดฝ่ายงาน**, **วิชาเอก**, **เกษียณภายใน 5 ปี**, **เรียงตามปีเกษียณใกล้สุด** และปุ่ม **ล้างตัวกรอง** รวมถึงตรวจการแสดง `เกษียณ พ.ศ.` ทั้งใน Table View และ Card View ทั้ง Light Mode และ Dark Mode
