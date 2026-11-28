# รายงานผลการดำเนินงาน Phase 9.4 — ระบบจัดสอนแทนรายวันเชื่อมโยงการลา, สิทธิ์ฝ่ายวิชาการ & ล็อกตารางสอน, โหมดเน้นวิชาหลักช่วงเช้า & ตั้งค่าพักกลางวัน (สูงสุด 60 นาที) + Migration 019

## 1. ข้อมูลทั่วไปของเฟส
- **ชื่อเฟส:** Phase 9.4 — Leave-to-Substitute Teacher Bridge, Academic Affairs Permission & Master Timetable Lock, Primary Morning-Core Auto-Schedule Mode & Flexible Lunch/Max-60-Min Time Settings
- **วันที่ดำเนินการ:** 2026-11-28
- **Branch / Base Commit:** `main` (ต่อยอดจาก Commit `0fcbdfc` ของ Phase 9.3.1)
- **สถานะภาพรวม:** เสร็จสมบูรณ์ (ผ่าน `tsc --noEmit`, `npm run lint`, `npm test` 276/276 เทสต์ และ `npm run build` 0 errors)

---

## 2. สกิลที่ค้นพบและนำมาใช้งาน (Skills Discovered & Applied)
จากการตรวจสอบสภาพแวดล้อมและพื้นที่ทำงาน (`D:\ManStat-Modern\.agents` ไม่พบโฟลเดอร์) ได้ค้นพบและนำสกิลที่ตรงเงื่อนไขมาใช้งานจริง 3 สกิล:
1. **`no-emoji-ui-standard`** — บังคับปลอด Emoji 100% ทั้ง UI และข้อความแจ้งสอนแทนสำหรับกลุ่ม LINE ใช้เฉพาะ Lucide SVG (`UserCheck`, `ClipboardCopy`, `Utensils`, `Lock`, `Unlock`)
2. **`modern-web-guidance` (คู่มือ `forms` & `responsive-table`)** — ใช้ `<fieldset>`/`<legend>` ในตัวเลือกโหมดจัดตาราง (`primary_morning_core` vs `balanced`), ผูก `<label htmlFor>`/`id` ในการ์ด `ช่วงพักกลางวัน`, ประกาศผลลัพธ์ผ่าน `role="status"` / `aria-live="polite"`, และหุ้มตารางจัดสอนแทนด้วย `tabIndex={0}` `role="region"`
3. **`ponytail`** — แยก Pure Engine (`substitute-utils.ts`) และรวม Server Auth Guard (`verifyTimetableManagerSession`) ไว้จุดเดียวใน `serverAuth.ts` ไม่ล้ำขอบเขตไปเฟส 10

---

## 3. สรุปการแก้ไขจริง (Exact Changes Made)

### 3.1 ฐานข้อมูล Migration 019 (`supabase/migrations/019_phase9_4_substitutions_and_locks.sql`)
- ขยาย `public.timetable_settings` แบบ Idempotent (`ADD COLUMN IF NOT EXISTS`):
  - `is_locked BOOLEAN NOT NULL DEFAULT FALSE`
  - `lunch_config JSONB NOT NULL DEFAULT '{"afterPeriod":3,"startTime":"11.30","endTime":"12.30","durationMinutes":60}'::jsonb`
- สร้างตารางใหม่ `public.teaching_substitutions` พร้อม `UNIQUE (sub_date, room_name, period_no)`, ดัชนี `(academic_year, semester, sub_date)`, RLS + นโยบายอ่าน และ `NOTIFY pgrst, 'reload schema';`

### 3.2 สิทธิ์ฝ่ายบริหารวิชาการ & ล็อกตารางสอนทั้งภาคเรียน (Master Timetable Lock)
- **`src/lib/auth/serverAuth.ts`:** เพิ่ม `verifyTimetableManagerSession()` อนุญาตให้ **ผู้ดูแลระบบ (`isAdminRole`)**, **ผู้อำนวยการสถานศึกษา**, และ **บุคลากรที่สังกัด `ฝ่ายบริหารวิชาการ`** (ตรวจสอบจริงจาก `getStaffDivisions(staff, workloads)` ฝั่งเซิร์ฟเวอร์) สามารถแก้ไขตารางสอนและจัดสอนแทนได้ ส่วนครูทั่วไปยังคงดูตารางและพิมพ์ A4 ได้ตามปกติ
- **Master Timetable Lock (`settings.isLocked`):**
  - เพิ่มปุ่ม **`ล็อกตารางสอน`** / **`ปลดล็อกตารางสอน`** บนหัวหน้าจอ `ViewTimetable.tsx` พร้อมแบนเนอร์สถานะ `ตารางสอนภาคเรียนนี้ถูกล็อกโดยฝ่ายวิชาการ (โหมดดูอย่างเดียว)`
  - บังคับล็อกฝั่งเซิร์ฟเวอร์ด้วย `dbIsTimetableLocked()` คืนสถานะ **`423 Locked`** บนทุก Endpoint ที่แก้ไขตารางหลัก (`slots`, `slots/swap`, `allocations`, `auto-schedule`, `kindergarten`, `rollover`, `migrate-legacy`, `settings`) โดยยกเว้น **`จัดสอนแทนรายวัน`** (`substitutions`) ที่ยังแก้ไขได้เสมอแม้ตารางหลักจะถูกล็อกแล้ว

### 3.3 ยกระดับ Modal `ตั้งค่าเวลาเรียน` (พักกลางวันยืดหยุ่น + ล็อกสูงสุด 60 นาที)
- เพิ่ม `LunchBreakConfig`, `DEFAULT_LUNCH_CONFIG` และ `clampPeriodDurationMinutes(minutes)` (ล็อกค่า `10–60` นาทีทั้งฝั่ง UI และฝั่งเซิร์ฟเวอร์ใน `POST /api/admin/timetable/settings` & `serverDb.ts`)
- ปรับหัวข้อ Modal เป็น **`ตั้งค่าเวลาเรียนและหมายเหตุตารางสอน`** และ **`โครงสร้างเวลาเรียน (6 ชั่วโมงเรียน + พบครูประจำชั้น)`** พร้อมการ์ด **`ช่วงพักกลางวัน`** (`พักหลังชั่วโมงที่ 2–4`, `เวลาเริ่ม`, `เวลาสิ้นสุด`, `นาที <= 60`)
- ซิงก์ตำแหน่งและเวลาของคอลัมน์พักกลางวันแบบไดนามิกทั้งบน **`ViewTimetable.tsx`** และ **`TimetablePrintView.tsx`**

### 3.4 โหมดจัดตารางอัตโนมัติสำหรับประถมศึกษา (`primary_morning_core`)
- ขยาย `generateAutoSchedule()` ใน **`src/lib/regulations/auto-scheduler.ts`** ด้วย `strategy?: 'balanced' | 'primary_morning_core'` และ `classifyPrimarySubjectWeight()`
- เมื่อเลือก **`เน้นวิชาหลักช่วงเช้า (แนะนำสำหรับประถม)`** ระบบจะดันวิชาหลัก (`ภาษาไทย`, `คณิตศาสตร์`, `วิทยาศาสตร์`, `วิทยาการคำนวณ`, `ภาษาอังกฤษ`) ลงชั่วโมงที่ `1–3` และเกลี่ยวิชาปฏิบัติ/ศิลปะ/พละ/การงานอาชีพ/กิจกรรมพัฒนาผู้เรียนไปช่วงบ่ายชั่วโมงที่ `4–6` โดยไม่ละเมิด Hard Constraints (0 คาบชน)

### 3.5 เชื่อมโยงระบบการลาสู่ `จัดสอนแทนรายวัน` (`substitute-utils.ts`)
- สร้าง **`src/lib/regulations/substitute-utils.ts`**:
  - `getAffectedSlotsForDate()`: ตรวจใบลาที่ทับซ้อนวันที่เลือก (ข้ามใบลาที่ถูกปฏิเสธ/ยกเลิก), แยก **เต็มวัน** / **ครึ่งวันเช้า (ชั่วโมงที่ 1–3)** / **ครึ่งวันบ่าย (ชั่วโมงที่ 4–7)**, ครอบคลุมทั้ง `ป.1–ม.3` และ `อ.1–อ.3` (`periodNo = 0`)
  - คัดกรอง `availableSubstitutes` อย่างเคร่งครัด: ผ่าน `isEligibleForTeaching` (ไม่รวม `นักการภารโรง`), ไม่ได้ลาในวัน/ช่วงนั้น, ไม่มีสอนในห้องใด ๆ ในชั่วโมงนั้น, และไม่ถูกจัดให้สอนแทนห้องอื่นอยู่แล้ว เรียงจากครูที่สอนวันนี้น้อยสุดขึ้นก่อน พร้อมไฮไลต์ครูร่วมสอนที่ยังมาปฏิบัติหน้าที่อยู่ด้านบนสุด
  - `formatSubstitutionLineSummary()`: สร้างข้อความแจ้งสอนแทนภาษาไทยปลอด Emoji พร้อมปุ่ม **`คัดลอกข้อความแจ้งสอนแทน`** 1 คลิก
- สร้าง API `GET /api/timetable/substitutions` และ `POST / DELETE /api/admin/timetable/substitutions` (ตรวจกันชนฝั่งเซิร์ฟเวอร์ + Audit Log) พร้อมแท็บที่ 6 **`จัดสอนแทน`** และกล่องสถิติการสอนแทนสะสมในภาคเรียน

### 3.6 รายการไฟล์ที่สร้างใหม่และแก้ไข
| ไฟล์ | ประเภท | รายละเอียด |
| :--- | :--- | :--- |
| `supabase/migrations/019_phase9_4_substitutions_and_locks.sql` | สร้างใหม่ | ขยาย `timetable_settings` (`is_locked`, `lunch_config`) และสร้าง `teaching_substitutions` + RLS |
| `src/lib/data/timetableTypes.ts` | แก้ไข | เพิ่ม `LunchBreakConfig`, `isLocked`, `lunchConfig` และ `TeachingSubstitution` |
| `src/lib/regulations/timetable-utils.ts` | แก้ไข | เพิ่ม `DEFAULT_LUNCH_CONFIG` และ `clampPeriodDurationMinutes(10..60)` |
| `src/lib/regulations/auto-scheduler.ts` | แก้ไข | เพิ่ม `strategy: 'primary_morning_core'` และ `classifyPrimarySubjectWeight()` |
| `src/lib/regulations/substitute-utils.ts` | สร้างใหม่ | Engine `getAffectedSlotsForDate()`, `detectLeaveHalfDayScope()` และ `formatSubstitutionLineSummary()` |
| `src/lib/auth/serverAuth.ts` | แก้ไข | เพิ่ม `verifyTimetableManagerSession()` (Admin / Director / ฝ่ายบริหารวิชาการ) |
| `src/lib/db/serverDb.ts` | แก้ไข | อัปเดต `timetable_settings` (`isLocked`, `lunchConfig`), เพิ่ม `dbIsTimetableLocked` และ CRUD `teaching_substitutions` |
| `src/app/api/timetable/substitutions/route.ts` | สร้างใหม่ | `GET /api/timetable/substitutions` |
| `src/app/api/admin/timetable/substitutions/route.ts` | สร้างใหม่ | `POST / DELETE /api/admin/timetable/substitutions` (Server clash check + Audit Log) |
| `src/app/api/admin/timetable/{settings,auto-schedule,slots,slots/swap,allocations,kindergarten,rollover,migrate-legacy}/route.ts` | แก้ไข | ใช้ `verifyTimetableManagerSession()`, บังคับ `423 Locked`, ล็อกสูงสุด 60 นาที และรองรับ `strategy` |
| `src/components/views/TimetablePrintView.tsx` | แก้ไข | ซิงก์ตำแหน่งและเวลาพักกลางวันแบบไดนามิกจาก `settings.lunchConfig` |
| `src/components/views/ViewTimetable.tsx` | แก้ไข | เพิ่มปุ่ม/แบนเนอร์ล็อกตารางสอน, แท็บที่ 6 `จัดสอนแทน`, การ์ดพักกลางวันใน `ตั้งค่าเวลาเรียน`, และตัวเลือก `เน้นวิชาหลักช่วงเช้า` |
| `src/lib/regulations/__tests__/{substitute-utils,auto-scheduler,timetable-utils}.test.ts` | สร้างใหม่/แก้ไข | เพิ่ม Unit Test 4 เคสใหม่ (รวม 276/276 เทสต์) |
| `docs/phase-reports/PHASE_09_4_REPORT.md` & `README.md` | สร้างใหม่/แก้ไข | รายงาน Phase 9.4 และอัปเดตดัชนี |

---

## 4. ผลการทดสอบระบบ (Verification Results)
| รายการตรวจ | คำสั่ง | ผลลัพธ์ |
| :--- | :--- | :--- |
| TypeScript Type Check | `npx tsc --noEmit` | ผ่าน (0 errors) |
| ESLint | `npm run lint` | ผ่าน (0 errors, 0 warnings) |
| Unit Tests | `npm test` (`tsx --test src/**/*.test.ts`) | ผ่าน **276 / 276** เทสต์ (89 suites, เพิ่มใหม่ 4 เทสต์) |
| Production Build | `npm run build` (Next.js 16.4.6 Turbopack) | ผ่าน (0 errors, สร้าง 2 API routes ใหม่ครบสมบูรณ์) |

---

## 5. สิ่งที่ไม่สามารถทำได้ / ข้อจำกัด (Cannot Do / Unknowns)
- ยังไม่ได้รัน `supabase/migrations/019_phase9_4_substitutions_and_locks.sql` บนฐานข้อมูล Supabase Production จริง
- ยังไม่ได้ทดสอบคลิกผ่านเว็บเบราว์เซอร์จริง (Live UI / E2E Test) ทั้งโหมด Light/Dark, การคัดลอกข้อความ LINE ไปยัง Clipboard จริง และการสลับบัญชีผู้ใช้ระหว่างครูทั่วไปกับบุคลากรฝ่ายบริหารวิชาการ

---

## 6. สิ่งที่ผู้ใช้ต้องดำเนินการเองและเช็กลิสต์ตรวจสอบ (Manual Steps & QA Checklist)
1. **รัน SQL Migration 019 บน Supabase (จำเป็น):**
   - เปิด **Supabase SQL Editor** แล้วรันไฟล์ `supabase/migrations/019_phase9_4_substitutions_and_locks.sql` (เป็นแบบ Idempotent + `NOTIFY pgrst, 'reload schema'` ปลอดภัยต่อการรันซ้ำ)
2. **เช็กลิสต์ทดสอบบนหน้าเว็บ (`/?view=timetable`):**
   - **ล็อกตารางสอน:** กดปุ่ม **`ล็อกตารางสอน`** → ตรวจแบนเนอร์สีเหลือง, ตรวจว่าปุ่มแก้ไขตารางหลักถูกซ่อน/ป้องกัน แต่แท็บ **`จัดสอนแทน`** และ **`พิมพ์ A4`** ยังใช้งานได้ตามปกติ → กด **`ปลดล็อกตารางสอน`** เพื่อกลับมาแก้ไข
   - **ตั้งค่าเวลาเรียน:** เปิด Modal **`ตั้งค่าเวลาเรียน`** → ลองกรอกตัวเลขเกิน `60` นาที (ต้องถูกจำกัดไม่เกิน `60` ทันที) และทดสอบเปลี่ยน **`พักหลังชั่วโมงที่`** / เวลาพักกลางวัน แล้วตรวจว่าคอลัมน์พักกลางวันบนตารางเว็บและใบพิมพ์ A4 ขยับตามจริง
   - **จัดตารางอัตโนมัติโหมดประถม:** เปิด **`จัดตารางอัตโนมัติ`** เลือก **`เน้นวิชาหลักช่วงเช้า (แนะนำสำหรับประถม)`** → ตรวจว่าภาษาไทย/คณิต/วิทย์/อังกฤษลงชั่วโมงที่ 1–3 และศิลปะ/พละ/กิจกรรมอยู่ช่วงบ่าย
   - **แท็บ `จัดสอนแทน`:** เลือกวันที่มีครูลา → ตรวจรายการชั่วโมงที่ได้รับผลกระทบ, ตรวจว่าดรอปดาวน์คัดกรองเฉพาะผู้ว่างและไม่มีนักการภารโรง, จัดผู้สอนแทน และกด **`คัดลอกข้อความแจ้งสอนแทน`** ทดสอบวางในแชท LINE
