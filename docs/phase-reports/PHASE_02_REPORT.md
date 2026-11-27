# รายงานผลการดำเนินงาน Phase 2 — ทะเบียนเฉพาะทาง CRUD และลิงก์นำทางด่วน (ManStat-Modern)

- **วันที่ดำเนินการ:** 2026-11-27
- **Branch / Base Commit:** `main` (ต่อยอดจาก Phase 1 commit `62bf77e`)
- **สถานะภาพรวม:** เสร็จสมบูรณ์ (ผ่าน `tsc --noEmit`, `eslint`, `npm test` 227/227 เคส และ `next build`)

---

## 1. ภาพรวมและขอบเขตงาน (Phase Overview & Scope)

1. ตรวจสอบและเติมเต็มระบบ CRUD (เพิ่ม / แก้ไข / ลบ เฉพาะสิทธิ์ผู้ดูแลระบบ `isAdminRole`) ในเมนูงานทะเบียนประวัติเฉพาะทางทั้ง 3 เมนู ได้แก่:
   - **ทะเบียนใบอนุญาตประกอบวิชาชีพ (`ViewRegLicense.tsx`)**
   - **ทะเบียนวุฒิทางการลูกเสือ (`ViewRegScout.tsx`)**
   - **ทะเบียนวิทยฐานะ (`ViewRegStanding.tsx`)**
   โดยบังคับใช้ `ThaiDatePicker` (React Portal + Auto-Flip) กับช่องวันที่ทุกช่องใน Modal และใช้ `ConfirmModal` แทน `window.alert()` / `window.confirm()`
2. เปลี่ยนข้อความแนะนำด้านล่างใน `StaffEditModal.tsx` (แท็บตำแหน่งและสังกัด) ให้เป็นปุ่มลิงก์นำทางจริงไปยัง **วิทยฐานะ (`/?view=dir_standing`)**, **ใบอนุญาตฯ (`/?view=dir_license`)** และ **วุฒิลูกเสือ (`/?view=dir_scout`)** พร้อมระบบตรวจสอบการเปลี่ยนแปลงที่ยังไม่ได้บันทึก (`ConfirmModal`) และปิด Modal ก่อนนำทาง
3. สร้างรายงานผลการดำเนินงานถาวร (`docs/phase-reports/PHASE_02_REPORT.md`) และสารบัญรวมรายงาน (`docs/phase-reports/README.md`)

---

## 2. สกิลที่ค้นพบและนำมาใช้งาน (Skills Discovered & Applied)

- ตรวจสอบโฟลเดอร์ `.agents/` ในโปรเจกต์ `D:\ManStat-Modern`: **ไม่พบโฟลเดอร์ `.agents/`**
- สกิลที่ค้นพบและนำมาประยุกต์ใช้จากสกิลที่ติดตั้งในระบบ:
  1. **`no-emoji-ui-standard`** (`C:\Users\sic26\.gemini\config\skills\no-emoji-ui-standard\SKILL.md`) — บังคับใช้มาตรฐาน Zero-Emoji, ไอคอน Lucide SVG ล้วน, ระยะห่างไอคอนกับข้อความมาตรฐาน, ตัวเลขอารบิก (`0-9`) บนหน้าเว็บทั้งหมด และรองรับทั้ง Light Mode / Dark Mode
  2. **`ponytail`** (`C:\Users\sic26\.gemini\config\skills\ponytail\SKILL.md`) — แก้ไขเฉพาะจุดที่ขาดจริง ไม่รื้อระบบที่ใช้งานได้ดีอยู่แล้ว (เช่น คง CRUD เดิมของ `ViewRegScout.tsx` และแก้เฉพาะ date input) และนำคอมโพเนนต์มาตรฐานเดิม (`ThaiDatePicker`, `ConfirmModal`, `POST /api/admin/staff`) กลับมาใช้ซ้ำ
  3. **`modern-web-guidance`** (`C:\Users\sic26\.gemini\config\plugins\modern-web-guidance-plugin\skills\modern-web-guidance\SKILL.md`) — เรียกตรวจสอบผ่าน `npx modern-web-guidance@latest search "modal dialog form"` และนำแนวทาง `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, การกด `Escape` เพื่อปิด และ light-dismiss มาใช้กับ Add/Edit Modal ใน `ViewRegLicense.tsx` และ `ViewRegStanding.tsx`

---

## 3. ผลการตรวจสอบและรายการแก้ไขจริง (Audit Findings & Exact Changes)

### 3.1 ผลการตรวจสอบ 3 เมนูทะเบียนเฉพาะทาง (Part 1)

| เมนูทะเบียน | ไฟล์ | สิ่งที่พบก่อนแก้ไข | สิ่งที่ดำเนินการใน Phase 2 |
| :--- | :--- | :--- | :--- |
| **ทะเบียนวุฒิลูกเสือ** | `src/components/views/ViewRegScout.tsx` | มี CRUD ครบแล้ว (Add / Edit / Delete เฉพาะ Admin ผ่าน `/api/admin/scout` พร้อม modal ยืนยันลบในแอป) แต่ช่อง `วันที่ได้รับวุฒิบัตร` ยังใช้ `<input type="date">` แบบ native | คง CRUD เดิมทั้งหมดไว้ และเปลี่ยนเฉพาะ `<input type="date">` เป็น `<ThaiDatePicker>` (Portal + Auto-Flip) |
| **ทะเบียนใบอนุญาตฯ** | `src/components/views/ViewRegLicense.tsx` | เป็น Read-only ทั้งหมด (มีเพียงปุ่มลิงก์ `จัดการใน Admin`) ไม่มี Add / Edit / Delete ในหน้าทะเบียน | เพิ่ม Admin-only CRUD ครบวงจร: ปุ่ม `เพิ่มใบอนุญาต` ในส่วนหัวและในแถวขยาย, ปุ่ม `แก้ไข` (`Pencil`) และ `ลบ` (`Trash2`) บนการ์ดใบอนุญาตแต่ละฉบับ, Add/Edit Modal พร้อม `ThaiDatePicker` สำหรับวันออกและวันหมดอายุ, `ConfirmModal` ยืนยันการลบ และแถบแจ้งเตือนในแอป บันทึกผ่าน `POST /api/admin/staff` โดยรักษาฟิลด์อื่นของบุคลากรครบถ้วน |
| **ทะเบียนวิทยฐานะ** | `src/components/views/ViewRegStanding.tsx` | เป็น Read-only ทั้งหมด (มีเพียงปุ่มลิงก์ `จัดการใน Admin`) ไม่มี Add / Edit / Delete ในหน้าทะเบียน | เพิ่ม Admin-only CRUD ครบวงจรทั้งใน Table View (แถวขยาย) และ Card View: ปุ่ม `เพิ่มวิทยฐานะ` / `เพิ่มคำสั่งวิทยฐานะ`, ปุ่ม `แก้ไข` (`Pencil`) และ `ลบ` (`Trash2`) ต่อคำสั่ง, Add/Edit Modal พร้อม `ThaiDatePicker` สำหรับวันที่มีผลตามคำสั่ง, `ConfirmModal` ยืนยันการลบ และ sync ฟิลด์ `academicStanding` ให้ตรงกับคำสั่งล่าสุดอัตโนมัติ บันทึกผ่าน `POST /api/admin/staff` |

### 3.2 ลิงก์นำทางด่วนใน StaffEditModal (Part 2)

- **`src/components/admin/StaffEditModal.tsx`**
  - เปลี่ยน prop `onNavigateToWorkload` เป็น `onNavigateToView: (view: StaffQuickJumpView) => void` (`'workload' | 'dir_standing' | 'dir_license' | 'dir_scout'`)
  - เปลี่ยนข้อความด้านล่างแท็บ 2 จากข้อความนิ่งเป็นปุ่มลิงก์คลิกได้จริงสำหรับ **วิทยฐานะ**, **ใบอนุญาตฯ**, และ **วุฒิลูกเสือ** โดยคงขนาดความสูง Modal (`h-[460px] sm:h-[500px]`), แท็บ 2×2 และฟิลด์จาก Phase 1 ไว้เหมือนเดิมทั้งหมด
- **`src/app/admin/page.tsx`**
  - ขยาย `handleNavigateToWorkload` เป็น `handleNavigateToView(view)` ที่ตรวจสอบ `hasStaffUnsavedChanges` ก่อนออกจาก Modal ด้วย `ConfirmModal` พร้อมระบุชื่อเมนูปลายทางชัดเจน จากนั้นปิด `isStaffModalOpen` และนำทางไป `/?view=${view}`

### 3.3 ฐานข้อมูลและ SQL Migration

- **ไม่จำเป็นต้องสร้าง SQL Migration ใหม่** เนื่องจากตรวจสอบ `src/lib/db/serverDb.ts` และ `src/app/api/admin/staff/route.ts` แล้วพบว่าคอลัมน์ `licenses` (JSONB), `standings` (JSONB), `academic_standing` (TEXT) บนตาราง `public.teachers` และตาราง `public.scouts` มีอยู่ครบและเชื่อมต่อ API เรียบร้อยแล้ว

---

## 4. ผลการตรวจสอบและทดสอบ (Verification Results)

| รายการตรวจสอบ | คำสั่งที่ใช้ | ผลลัพธ์ |
| :--- | :--- | :--- |
| TypeScript Check | `npx tsc --noEmit` | ผ่าน (Exit Code 0, 0 errors) |
| ESLint | `npm run lint` | ผ่าน (Exit Code 0, 0 errors) |
| Unit Tests | `npm test` (`tsx --test src/**/*.test.ts`) | ผ่าน 227 / 227 เคส (79 suites, 0 failed) |
| Production Build | `npm run build` (`next build`) | ผ่าน (Compiled successfully, 0 errors) |

---

## 5. สิ่งที่ไม่สามารถทำได้ / ข้อมูลที่ยังไม่ทราบ (Cannot Do / Unknowns — Zero Guessing)

- **ไม่ได้ทดสอบการยิง CRUD จริงกับฐานข้อมูล Supabase บน Production / Live Environment** เนื่องจากในรอบนี้รันเฉพาะการตรวจสอบในเครื่อง (TypeScript, ESLint, Unit Tests และ Next.js Production Build) ยังไม่ได้เปิดเบราว์เซอร์ล็อกอินทดสอบยิงข้อมูลลงฐานข้อมูลจริง
- **ไม่ได้ทดสอบการแสดงผลจริงบนหน้าจอเบราว์เซอร์ทั้ง Light Mode / Dark Mode และ Responsive Viewport** — แนะนำให้ผู้ใช้ทดสอบคลิกจริงหลัง Deploy บน Vercel หรือรัน dev server

---

## 6. สิ่งที่ผู้ใช้ต้องดำเนินการเอง (Manual Steps for User)

1. **ไม่ต้องรัน SQL Migration เพิ่มเติม** สำหรับ Phase 2 (ใช้ Schema เดิมของ `teachers` และ `scouts`)
2. **รอ Vercel Auto-Deploy** จาก branch `main` (หรือทดสอบบนเครื่องด้วย `npm run dev`)
3. **ทดสอบใช้งานจริงในฐานะ Admin (`superuser` / `director` / `hr_admin`):**
   - เข้าเมนู **ทะเบียนใบอนุญาตฯ**: ลองกด `เพิ่มใบอนุญาต`, ขยายแถวบุคลากรเพื่อกด `แก้ไข` และ `ลบ`, ตรวจปฏิทิน `ThaiDatePicker` ว่าไม่ถูกตัดขอบ
   - เข้าเมนู **ทะเบียนวิทยฐานะ**: ลองกด `เพิ่มวิทยฐานะ`, ขยายแถวหรือสลับเป็น Card View เพื่อกด `แก้ไข` / `ลบ` และตรวจว่าวิทยฐานะปัจจุบันอัปเดตตามคำสั่งล่าสุด
   - เข้าเมนู **ทะเบียนวุฒิลูกเสือ**: ลองกด `เพิ่มวุฒิลูกเสือ` และตรวจว่าช่อง `วันที่ได้รับวุฒิบัตร` เปิดปฏิทิน `ThaiDatePicker` (พ.ศ.) ได้ปกติ
   - เข้าหน้า `/admin` -> เปิด `ตั้งค่าและแก้ไขบุคลากร` -> แท็บ `ตำแหน่งและสังกัด` -> ทดสอบคลิกลิงก์ **วิทยฐานะ**, **ใบอนุญาตฯ**, **วุฒิลูกเสือ** ทั้งตอนที่ยังไม่แก้ข้อมูล (นำทางทันที) และตอนที่แก้ข้อมูลค้างไว้ (แสดง `ConfirmModal` เตือนก่อนออก)
