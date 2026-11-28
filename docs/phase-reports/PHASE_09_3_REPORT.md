# รายงานผลการดำเนินงาน Phase 9.3 — ปิดจบระบบตารางสอนครบวงจร: ปฐมวัย (`อ.1–อ.3`), คัดลอกข้ามเทอม/ข้ามปี 2 โหมด, พิมพ์ A4 แนวนอน & โอนย้ายงานสอนเดิม

## 1. ข้อมูลทั่วไปของเฟส
- **ชื่อเฟส:** Phase 9.3 — Kindergarten Experience Schedule, Cross-Term Rollover (2 Modes), Landscape A4 Print View & Legacy Category 1 Migration
- **วันที่ดำเนินการ:** 2026-11-28
- **Branch / Base Commit:** `main` (ต่อยอดจาก Commit `a4ef711` ของ Phase 9.2)
- **สถานะภาพรวม:** เสร็จสมบูรณ์ (ผ่าน `tsc --noEmit`, `npm run lint`, `npm test` 270/270 เทสต์ และ `npm run build` 0 errors)

---

## 2. สกิลที่ค้นพบและนำมาใช้งาน (Skills Discovered & Applied)
จากการตรวจสอบสภาพแวดล้อมและพื้นที่ทำงาน (`D:\ManStat-Modern\.agents` ไม่พบโฟลเดอร์) ได้ค้นพบและนำสกิลที่ตรงเงื่อนไขมาใช้งานจริง 3 สกิล:
1. **`no-emoji-ui-standard`** — บังคับปลอด Emoji 100% ใช้เฉพาะ Lucide SVG (`Baby`, `Copy`, `Printer`, `Archive`, `RotateCcw`) พร้อมระยะห่างไอคอนกับข้อความมาตรฐาน
2. **`modern-web-guidance` (คู่มือ `forms` & `responsive-table` และตรวจสอบหัวข้อ `print stylesheet layout`)** — ใช้ `<fieldset>`/`<legend>` ใน Modal คัดลอกข้ามเทอม, ผูก `<label htmlFor>` + `id` และ `aria-labelledby`, ใช้ `tabIndex={0}` `role="region"` บนตารางปฐมวัยและตารางสรุป ว 9/2564 (สำหรับหัวข้อ print stylesheet layout ไม่มีคู่มือเฉพาะตรงกับ `@page A4 landscape` จึงใช้มาตรฐาน CSS `@media print` ที่รองรับทุกเบราว์เซอร์)
3. **`ponytail`** — ใช้ตาราง `kindergarten_schedules` และโครงสร้างทั้งหมดจาก Migration 018 เดิมโดยไม่สร้าง Migration ใหม่ และคงขอบเขตไม่ล้ำไปเฟส 10

---

## 3. สรุปการแก้ไขจริง (Exact Changes Made)

### 3.1 โหมดปฐมวัย (`ระดับปฐมวัย อ.1–อ.3`) และการรวมชั่วโมงจัดประสบการณ์เข้าตาราง ว 9/2564
- **`src/lib/regulations/timetable-utils.ts`:**
  - เพิ่ม `KINDERGARTEN_ROOMS = ['อ.1', 'อ.2', 'อ.3']` และ `DEFAULT_KINDERGARTEN_ACTIVITIES` ครอบคลุม 6 กิจกรรมหลักปฐมวัย (`เคลื่อนไหวและจังหวะ`, `เสริมประสบการณ์`, `สร้างสรรค์`, `เสรี (เล่นตามมุม)`, `กลางแจ้ง`, `เกมการศึกษา`) พร้อมช่วงพักกลางวัน/นอนพักผ่อน `11.30–14.00` และช่วงเตรียมกลับบ้าน
  - ขยาย `calculateTeacherWeeklyLoads(slots, teachers, periodsConfig, kindergartenSchedules = [])` (คงความเข้ากันได้ย้อนหลัง 100%) เพิ่มฟิลด์ `kindergartenHours` รวมชั่วโมงจัดประสบการณ์ของครูประจำชั้น `อ.1–อ.3` เข้าใน `teachingHoursExclHomeroom` และเกณฑ์ `>= 12 ชม./สัปดาห์` ของ ก.ค.ศ. ว 9/2564 โดยอัตโนมัติ
- **DB & API (`serverDb.ts` & `src/app/api/admin/timetable/kindergarten/route.ts`):**
  - ขยาย `dbGetTimetableBundle` และ `GET /api/timetable` ให้คืน `kindergartenSchedules` จาก `public.kindergarten_schedules` (รองรับทั้ง Supabase และ Local JSON Fallback)
  - เพิ่ม `dbUpsertKindergartenSchedule`, `dbDeleteKindergartenSchedule` และ Admin-guarded `POST / DELETE /api/admin/timetable/kindergarten` พร้อม Audit Log
- **UI (`ViewTimetable.tsx`):**
  - เพิ่มแท็บที่ 5 **`ระดับปฐมวัย (อ.1–อ.3)`** พร้อมปุ่มเลือกห้อง, การ์ดสรุปครูประจำชั้น/ผู้ช่วย, ตารางกิจกรรมประจำวัน, ปุ่ม `พิมพ์ตารางปฐมวัย A4` และ **Modal แก้ไขตารางปฐมวัยแบบล็อกการปิด** (มีปุ่มคืนค่ากิจกรรมมาตรฐานปฐมวัย)
  - เพิ่มคอลัมน์ **`ปฐมวัย (ชม.)`** ในแท็บ **`สรุปชั่วโมงสอน (ว 9/2564)`**

### 3.2 ระบบคัดลอกตารางสอนข้ามเทอม / ข้ามปีการศึกษา (2 โหมด)
- **Pure Helper (`src/lib/regulations/timetable-rollover.ts`):**
  - `buildTimetableRollover(params)` รองรับ 2 โหมดแบบ Non-Destructive, คัดกรองบุคลากรที่ยังปฏิบัติงานอยู่, รีแมป `allocationId` บนคาบที่คัดลอกให้เชื่อมกับแผนการสอนใหม่, และกันซ้ำแบบ Idempotent:
    - **โหมด 1 (`all` — แนะนำสำหรับ เทอม 1 → เทอม 2):** คัดลอกตั้งค่าคาบเรียน, แผนการสอน, คาบเรียนทั้งหมด (คงสถานะ `isLocked`) และตารางปฐมวัย `อ.1–อ.3`
    - **โหมด 2 (`fixed_only` — แนะนำสำหรับขึ้นปีการศึกษาใหม่):** คัดลอกตั้งค่าคาบเรียนและเฉพาะคาบประจำโรงเรียน (`isLocked === true`, `ประจำชั้น`, `ชุมนุม`, `ลูกเสือ`, `สวดมนต์`, `พบครูประจำชั้น`) พร้อมตั้ง `isLocked = true` เพื่อพร้อมให้ Auto-Scheduler ใช้งานต่อทันที
- **Server Persistence & API:** เพิ่ม `dbApplyTimetableRolloverBatch` ใน `serverDb.ts` และ Admin-guarded `POST /api/admin/timetable/rollover` พร้อม Audit Log (`ROLLOVER_TIMETABLE`) และปุ่ม **`คัดลอกข้ามเทอม/ข้ามปี`** + **Rollover Modal แบบล็อกการปิด** บนหัวหน้าจอ `ViewTimetable.tsx`

### 3.3 โหมดพิมพ์ตาราง A4 แนวนอน (`src/components/views/TimetablePrintView.tsx`)
- รองรับการพิมพ์ 4 รูปแบบด้วย `@page { size: A4 landscape; margin: 10mm; }` และ `@media print` ความคมชัดสูง (พื้นขาวเส้นดำ ซ่อนเมนูและปุ่ม UI อัตโนมัติ):
  1. `พิมพ์ห้องนี้ A4` (รายห้อง `ป.1–ม.3`)
  2. `พิมพ์ทุกห้อง A4` (พิมพ์รวดเดียวครบ 9 ห้องด้วย CSS `break-after-page`)
  3. `พิมพ์ตารางสอน A4` (รายบุคคล พร้อมจำนวนคาบและชั่วโมงสอน/สัปดาห์)
  4. `พิมพ์ตารางปฐมวัย A4` (`อ.1–อ.3`)
- แสดงหัวกระดาษ `โรงเรียนชุมชนบ้านตะขบ`, คอลัมน์แนวตั้ง `พักกลางวัน 11.30 - 12.30`, หมายเหตุท้ายตารางจาก `settings.footerNote` และช่องลงชื่อ `ผู้อำนวยการสถานศึกษา`

### 3.4 เครื่องมือโอนย้ายรายการงานสอนเดิม (หมวด 1) อย่างปลอดภัย
- เพิ่ม `mapLegacyWorkloadToAllocation()` ใน `timetable-rollover.ts`, `dbMigrateLegacyTeachingWorkloads()` ใน `serverDb.ts` และ Admin-guarded `POST /api/admin/timetable/migrate-legacy` พร้อม Audit Log (`MIGRATE_LEGACY_TEACHING_WORKLOAD`)
- ในแท็บ **`แผนการสอน`** (Admin เท่านั้น) หากพบรายการงานสอนเดิม (`category === 'งานสอนและการจัดการเรียนรู้'`) ใน `staff_workloads` จะแสดงแบนเนอร์ **`พบรายการงานสอนเดิม X รายการ — โอนย้ายเข้าสู่แผนการสอน`** เปิด **Migration Modal แบบล็อกการปิด** ให้เลือก/ปรับห้องเรียนและจำนวนคาบ/สัปดาห์ พร้อมตัวเลือก `ลบรายการงานสอนเดิมหลังโอนย้ายสำเร็จ` (ไม่ติ๊กเป็นค่าเริ่มต้นเพื่อความปลอดภัย)

### 3.5 รายการไฟล์ที่สร้างใหม่และแก้ไข (และยืนยันขอบเขต)
| ไฟล์ | ประเภท | รายละเอียด |
| :--- | :--- | :--- |
| `src/lib/data/timetableTypes.ts` | แก้ไข | เพิ่ม `KindergartenActivityItem` และเพิ่ม `kindergartenSchedules` ใน `TimetableBundle` |
| `src/lib/regulations/timetable-utils.ts` | แก้ไข | เพิ่ม `KINDERGARTEN_ROOMS`, `DEFAULT_KINDERGARTEN_ACTIVITIES` และรวม `kindergartenHours` ใน `calculateTeacherWeeklyLoads` |
| `src/lib/regulations/timetable-rollover.ts` | สร้างใหม่ | Pure helper `buildTimetableRollover` (2 โหมด) และ `mapLegacyWorkloadToAllocation` |
| `src/lib/regulations/__tests__/timetable-utils.test.ts` | แก้ไข | เพิ่ม Unit Test 1 เคสตรวจชั่วโมงปฐมวัยใน ว 9/2564 |
| `src/lib/regulations/__tests__/timetable-rollover.test.ts` | สร้างใหม่ | Unit Tests 3 เคส (โหมด `all` + remap + dedup, โหมด `fixed_only`, Legacy Category 1 Mapper) |
| `src/lib/db/serverDb.ts` | แก้ไข | เพิ่ม `kindergartenSchedules` ใน `dbGetTimetableBundle`, CRUD ปฐมวัย, `dbApplyTimetableRolloverBatch`, `dbMigrateLegacyTeachingWorkloads` |
| `src/app/api/admin/timetable/kindergarten/route.ts` | สร้างใหม่ | `POST / DELETE /api/admin/timetable/kindergarten` (Admin Guard + Audit Log) |
| `src/app/api/admin/timetable/rollover/route.ts` | สร้างใหม่ | `POST /api/admin/timetable/rollover` (Admin Guard + Audit Log) |
| `src/app/api/admin/timetable/migrate-legacy/route.ts` | สร้างใหม่ | `POST /api/admin/timetable/migrate-legacy` (Admin Guard + Audit Log) |
| `src/components/views/TimetablePrintView.tsx` | สร้างใหม่ | หน้าตัวอย่างก่อนพิมพ์และ `@media print` A4 แนวนอน 4 รูปแบบ |
| `src/components/views/ViewTimetable.tsx` | แก้ไข | เพิ่มแท็บปฐมวัย, ปุ่มคัดลอกข้ามเทอม, ปุ่มพิมพ์ A4, แบนเนอร์โอนย้ายงานสอนเดิม, คอลัมน์ปฐมวัยใน ว 9/2564 และ 3 Modal ล็อกการปิด |
| `docs/phase-reports/PHASE_09_3_REPORT.md` | สร้างใหม่ | รายงานสรุปผลการดำเนินงาน Phase 9.3 |
| `docs/phase-reports/README.md` | แก้ไข | เพิ่มแถวดัชนีรายงาน Phase 9.3 |

- **ยืนยันขอบเขตฐานข้อมูล:** **ไม่ต้องรัน SQL Migration เพิ่มเติม** (ตาราง `public.kindergarten_schedules` และอีก 3 ตารางถูกสร้างครบตั้งแต่ `018_phase9_timetable_schema.sql` แล้ว) และไม่ได้แตะต้องโมดูลอื่นหรือสร้างฟีเจอร์ของเฟส 10

---

## 4. ผลการทดสอบระบบ (Verification Results)
| รายการตรวจ | คำสั่ง | ผลลัพธ์ |
| :--- | :--- | :--- |
| TypeScript Type Check | `npx tsc --noEmit` | ผ่าน (0 errors) |
| ESLint | `npm run lint` | ผ่าน (0 errors, 0 warnings) |
| Unit Tests | `npm test` (`tsx --test src/**/*.test.ts`) | ผ่าน **270 / 270** เทสต์ (88 suites, เพิ่มใหม่ 4 เทสต์) |
| Production Build | `npm run build` (Next.js 16.4.6 Turbopack) | ผ่าน (0 errors, สร้าง 3 API routes ใหม่ครบสมบูรณ์) |

---

## 5. สิ่งที่ไม่สามารถทำได้ / ข้อจำกัด (Cannot Do / Unknowns)
- ยังไม่ได้ทดสอบคลิกผ่านเว็บเบราว์เซอร์จริง (Live UI / E2E Test) ทั้งโหมด Light/Dark
- ยังไม่ได้ทดสอบการสั่งพิมพ์จริงบนเครื่องพิมพ์ A4 หรือ PDF Preview ของ Chrome/Edge/Safari
- ยังไม่ได้ทดสอบยิง API ปฐมวัย/คัดลอกข้ามเทอม/โอนย้ายงานสอนเดิมกับฐานข้อมูล Supabase Production จริง

---

## 6. สิ่งที่ผู้ใช้ต้องดำเนินการเองและเช็กลิสต์ตรวจสอบ (Manual Steps & QA Checklist)
1. **ตรวจสอบ Migration 018:** **ไม่ต้องรัน SQL เพิ่มเติมสำหรับ Phase 9.3** (หากยังไม่ได้รัน `supabase/migrations/018_phase9_timetable_schema.sql` จาก Phase 9.1 กรุณารันใน Supabase SQL Editor ก่อนใช้งาน)
2. **เช็กลิสต์ทดสอบบนหน้าเว็บ (`/?view=timetable`):**
   - **แท็บ `ระดับปฐมวัย (อ.1–อ.3)`:** ตั้งค่าครูประจำชั้น + ผู้ช่วย + ชั่วโมงจัดประสบการณ์ (`25 ชม.`) → สลับไปแท็บ **`สรุปชั่วโมงสอน (ว 9/2564)`** ตรวจว่าคอลัมน์ `ปฐมวัย (ชม.)` และสถานะ `ผ่านเกณฑ์` แสดงผลถูกต้อง
   - **ปุ่ม `คัดลอกข้ามเทอม/ข้ามปี`:** ทดสอบโหมด 1 (`2569/1 → 2569/2`) และโหมด 2 (`2569/1 → 2570/1`) พร้อมตรวจว่าข้อมูลเทอมต้นทางไม่เปลี่ยนแปลงและไม่เกิดข้อมูลซ้ำเมื่อรันซ้ำ
   - **โหมดพิมพ์ A4 แนวนอน:** กด `พิมพ์ห้องนี้ A4`, `พิมพ์ทุกห้อง A4`, `พิมพ์ตารางสอน A4` และ `พิมพ์ตารางปฐมวัย A4` → กด `สั่งพิมพ์ / บันทึก PDF` ใน Chrome/Edge เพื่อตรวจสัดส่วนกระดาษแนวนอน A4 และหมายเหตุท้ายตาราง
   - **โอนย้ายรายการงานสอนเดิม:** หากมีข้อมูลงานสอนเดิมในระบบ ให้เปิดแท็บ `แผนการสอน` กดปุ่ม `โอนย้ายรายการงานสอนเดิม` ตรวจรายการที่แปลงและยืนยันการโอนย้าย
