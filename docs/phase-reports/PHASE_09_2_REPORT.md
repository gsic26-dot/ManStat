# รายงานผลการดำเนินงาน Phase 9.2 — เครื่องยนต์จัดตารางสอนอัตโนมัติ (`auto-scheduler.ts`), ปักหมุดล็อก 1 คลิก, กล่องรายการรอจัด & โหมดสลับคาบอัจฉริยะ (Smart Swap)

## 1. ข้อมูลทั่วไปของเฟส
- **ชื่อเฟส:** Phase 9.2 — Auto-Scheduler Engine, Pin/Lock Regeneration, Unplaced Queue & Smart Swap UI
- **วันที่ดำเนินการ:** 2026-11-28
- **Branch / Base Commit:** `main` (ต่อยอดจาก Commit `09dfa45` ของ Phase 9.1)
- **สถานะภาพรวม:** เสร็จสมบูรณ์ (ผ่าน `tsc --noEmit`, `npm run lint`, `npm test` 266/266 เทสต์ และ `npm run build` 0 errors)

---

## 2. สกิลที่ค้นพบและนำมาใช้งาน (Skills Discovered & Applied)
จากการตรวจสอบสภาพแวดล้อมและพื้นที่ทำงาน (`D:\ManStat-Modern\.agents` ไม่พบโฟลเดอร์) ได้ค้นพบและนำสกิลที่ตรงเงื่อนไขมาใช้งานจริง 3 สกิล:
1. **`no-emoji-ui-standard`** — บังคับปลอด Emoji 100% ใช้เฉพาะ Lucide SVG (`Sparkles`, `ArrowLeftRight`, `Lock`, `Unlock`, `AlertTriangle`) พร้อมระยะห่างไอคอนกับข้อความมาตรฐาน
2. **`modern-web-guidance` (คู่มือ `forms` & `responsive-table`)** — หลีกเลี่ยงการซ้อน `<button>` ใน `<button>` บนเซลล์ตาราง (แยกปุ่มปักหมุดล็อกอยู่มุมบนขวาแบบ sibling ของปุ่มเซลล์), ใช้ `<fieldset>`/`<legend>` ใน Modal จัดตารางอัตโนมัติ และประกาศผล AJAX ผ่าน `role="status"` / `aria-live="polite"`
3. **`ponytail`** — สร้าง Pure Solver ที่ทำงานเร็ว Deterministic ไม่พึ่ง External AI API, นำโครงสร้างฐานข้อมูล Migration 018 มาใช้ซ้ำโดยไม่สร้าง Migration ใหม่ และไม่ล้ำขอบเขตไปเฟส 9.3

---

## 3. สรุปการแก้ไขจริง (Exact Changes Made)

### 3.1 เครื่องยนต์จัดตารางสอนอัตโนมัติ (`src/lib/regulations/auto-scheduler.ts`)
- **`generateAutoSchedule(params)`** (Pure, Deterministic Constraint Solver):
  - **Hard Constraints (ห้ามละเมิดเด็ดขาด):**
    1. 1 ห้องเรียนมีได้สูงสุด 1 คาบต่อ `(dayOfWeek, periodNo)`
    2. ห้ามครูหลัก (`teacherId`) หรือครูร่วมสอน (`coTeacherId`) ชนคาบข้ามห้องในเวลาเดียวกัน (อนุญาต Co-teaching ในห้องเดียวกัน 100%)
    3. วิชาคู่ 2 คาบติดกัน (`consecutivePeriods === 2`) ลงได้เฉพาะคู่ในครึ่งวันเดียวกัน `(1,2), (2,3), (4,5), (5,6)` เท่านั้น **ห้ามคร่อมพักกลางวัน `(3,4)`**
    4. คาบที่ปักหมุดล็อก (`isLocked === true`) และคาบของห้องนอกขอบเขตถูกคงไว้ 100% พร้อมหักจำนวนคาบที่ล็อกแล้วออกจากโควต้าของแผนการสอนเพื่อไม่ให้จัดเกิน
  - **ลำดับความสำคัญ (Most-Constrained-First):** วิชาคู่ 2 คาบ → ครูสอนเวียนหลายห้อง (Roving Specialists) → วิชาที่มีครูร่วมสอน → วิชาเน้นช่วงเช้า → วิชาทั่วไป
  - **Soft Scoring Heuristic:** ให้คะแนนพิเศษวิชา `preferMorning` ในคาบ 1–4 (สูงสุดคาบ 1–3), หักคะแนนแรงหากลงวิชาเดียวกันซ้ำวันเดิมในห้องเดียวกัน, หักคะแนนเมื่อครูสอนติดกัน 4 คาบขึ้นไปเพื่อลดความล้า และเกลี่ยภาระรายวันให้สมดุล จ.–ศ.
  - **Unplaced Queue:** หากคาบใดไม่สามารถลงได้โดยไม่ละเมิด Hard Constraint จะส่งคืนใน `unplaced[]` พร้อมเหตุผลภาษาไทยที่ชัดเจน (เช่น `ครูผู้สอนไม่มีคาบว่างตรงกับห้องเรียนนี้`, `ไม่พบ 2 คาบติดกันที่ว่างตรงกันระหว่างห้องเรียนและครูผู้สอน`, `ช่องคาบเรียนของห้องเต็มแล้ว`)

### 3.2 ระบบ Smart Swap (Client Highlight + Server Re-validation + Safe Swap)
- **`evaluateSmartSwapTargets(params)` & `applySmartSwap(...)` (`auto-scheduler.ts`):**
  - ประเมินทุกช่องในห้อง (จับคู่คาบ 1–6 กับ 1–6 และคาบ 7 กับ 7) คืนสถานะ `'source' | 'locked' | 'valid' | 'conflict'` พร้อมเหตุผลภาษาไทยระบุชื่อครูและห้องที่ชน
- **Server Persistence (`serverDb.ts`) & API Routes:**
  - เพิ่ม `dbReplaceTimetableSlotsForRooms`, `dbSwapTimetableSlots` (ลบแถวต้นทางและปลายทางเดิมก่อน upsert แถวที่สลับแล้ว เพื่อ **ไม่ให้ชน `UNIQUE (academic_year, semester, room_name, day_of_week, period_no)`** บน Supabase), และ `dbToggleTimetableSlotLock` รองรับทั้ง **Supabase** และ **Local JSON Fallback**
  - สร้าง `POST /api/admin/timetable/auto-schedule` (รองรับ `scopeRooms`, `respectLockedSlots`, `dryRun` + `verifyAdminSession()` + Audit Log `AUTO_SCHEDULE_TIMETABLE`)
  - สร้าง `POST /api/admin/timetable/slots/swap` (Re-validate ฝั่งเซิร์ฟเวอร์ด้วย `evaluateSmartSwapTargets` ก่อนสลับเสมอ คืน `409` หากชนหรือล็อก + Audit Log `SWAP_TIMETABLE_SLOT`)
  - เพิ่ม `PATCH /api/admin/timetable/slots` สำหรับปักหมุดล็อก/ปลดล็อก 1 คลิก (+ Audit Log `TOGGLE_TIMETABLE_LOCK`)

### 3.3 การปรับปรุงหน้าจอ `ViewTimetable.tsx`
- เพิ่มปุ่ม **`จัดตารางสอนอัตโนมัติ`** (Admin เท่านั้น) ทั้งในแท็บ `ตารางเรียนรายห้อง` และ `แผนการสอน` เปิด **Modal ล็อกการปิด** (ปิดได้เฉพาะปุ่ม `X` หรือ `ยกเลิก`) เลือกขอบเขต `จัดตารางทุกห้อง (ป.1–ม.3)` หรือ `จัดเฉพาะห้องนี้` พร้อมตัวเลือก `คงคาบที่ปักหมุดล็อกไว้ทั้งหมด` และสรุปจำนวนแผนการสอน/คาบล็อก
- เพิ่มปุ่มปักหมุดล็อก/ปลดล็อก 1 คลิก (`Lock`/`Unlock`) มุมบนขวาของเซลล์ที่มีรายวิชาบน `ตารางเรียนรายห้อง`
- เพิ่ม **`โหมดสลับคาบ (Smart Swap)`** พร้อมแถบคำแนะนำ, ไฮไลต์ **สีฟ้า** (คาบต้นทาง), **สีเขียว** (สลับ/ย้ายได้ปลอดภัย 0 คาบชน), **สีแดง** (ชนตารางครูพร้อม Tooltip ระบุสาเหตุ) และ **สีเทา/แม่กุญแจ** (คาบล็อก)
- เพิ่มกล่อง **`รายการที่ยังจัดลงตารางไม่ได้ / คาบคงเหลือ`** แบบพับเก็บได้ใต้ตารางห้อง แสดงรายวิชา, ห้อง, ชื่อครูสะอาด, จำนวนคาบคงเหลือ, สาเหตุภาษาไทย และปุ่มกระโดดไปห้องนั้นทันที

### 3.4 รายการไฟล์ที่สร้างใหม่และแก้ไข (และยืนยันขอบเขต)
| ไฟล์ | ประเภท | รายละเอียด |
| :--- | :--- | :--- |
| `src/lib/regulations/auto-scheduler.ts` | สร้างใหม่ | เครื่องยนต์ `generateAutoSchedule`, `evaluateSmartSwapTargets`, `applySmartSwap` |
| `src/lib/regulations/__tests__/auto-scheduler.test.ts` | สร้างใหม่ | Unit Tests 5 เคส (จำลอง 9 ห้อง ป.1–ม.3, วิชาคู่ 2 คาบ, เน้นเช้า, Unplaced Queue, Smart Swap) |
| `src/lib/db/serverDb.ts` | แก้ไข | เพิ่ม `dbToggleTimetableSlotLock`, `dbReplaceTimetableSlotsForRooms`, `dbSwapTimetableSlots` |
| `src/app/api/admin/timetable/auto-schedule/route.ts` | สร้างใหม่ | `POST /api/admin/timetable/auto-schedule` (Admin Guard + Audit Log) |
| `src/app/api/admin/timetable/slots/swap/route.ts` | สร้างใหม่ | `POST /api/admin/timetable/slots/swap` (Server Re-validation + Audit Log) |
| `src/app/api/admin/timetable/slots/route.ts` | แก้ไข | เพิ่ม `PATCH` สำหรับปักหมุดล็อก/ปลดล็อก 1 คลิก |
| `src/components/views/ViewTimetable.tsx` | แก้ไข | เพิ่ม Auto-Schedule Modal, ปุ่มปักหมุดล็อก 1 คลิก, โหมด Smart Swap และกล่อง Unplaced Queue |
| `docs/phase-reports/PHASE_09_2_REPORT.md` | สร้างใหม่ | รายงานสรุปผลการดำเนินงาน Phase 9.2 |
| `docs/phase-reports/README.md` | แก้ไข | เพิ่มแถวดัชนีรายงาน Phase 9.2 |

- **ยืนยันขอบเขตฐานข้อมูล:** **ไม่ต้องรัน SQL Migration เพิ่มเติม** (ใช้ตารางจาก `018_phase9_timetable_schema.sql` เดิมทั้งหมด) และไม่ได้แตะต้องโมดูลอื่นหรือสร้างฟีเจอร์ของเฟส 9.3

---

## 4. ผลการทดสอบระบบ (Verification Results)
| รายการตรวจ | คำสั่ง | ผลลัพธ์ |
| :--- | :--- | :--- |
| TypeScript Type Check | `npx tsc --noEmit` | ผ่าน (0 errors) |
| ESLint | `npm run lint` | ผ่าน (0 errors, 0 warnings) |
| Unit Tests | `npm test` (`tsx --test src/**/*.test.ts`) | ผ่าน **266 / 266** เทสต์ (87 suites, เพิ่มใหม่ 5 เทสต์ใน `auto-scheduler.test.ts`) |
| Production Build | `npm run build` (Next.js 16.4.6 Turbopack) | ผ่าน (0 errors, สร้าง 2 API routes ใหม่ครบสมบูรณ์) |

---

## 5. สิ่งที่ไม่สามารถทำได้ / ข้อจำกัด (Cannot Do / Unknowns)
- ยังไม่ได้ทดสอบคลิกผ่านเว็บเบราว์เซอร์จริง (Live UI / E2E Test) ทั้งโหมด Light/Dark
- ยังไม่ได้ทดสอบยิง `POST /api/admin/timetable/auto-schedule` และ `POST /api/admin/timetable/slots/swap` กับฐานข้อมูล Supabase Production จริง (อาศัยการตรวจจาก Unit Tests, TypeScript, ESLint และ Production Build)

---

## 6. สิ่งที่ผู้ใช้ต้องดำเนินการเองและเช็กลิสต์ตรวจสอบ (Manual Steps & QA Checklist)
1. **ตรวจสอบ Migration 018:** **ไม่ต้องรัน SQL เพิ่มเติมสำหรับ Phase 9.2** (หากยังไม่ได้รัน `supabase/migrations/018_phase9_timetable_schema.sql` จาก Phase 9.1 กรุณารันใน Supabase SQL Editor ก่อนใช้งาน)
2. **เช็กลิสต์ทดสอบบนหน้าเว็บ (`/?view=timetable`):**
   - เพิ่มรายวิชาในแท็บ **`แผนการสอน`** (ลองตั้งค่า `เน้นช่วงเช้า`, `ลงติดกัน 2 คาบ` และ `ครูร่วมสอน`)
   - ลองปักหมุดล็อก 1–2 คาบในแท็บ **`ตารางเรียนรายห้อง`** ด้วยปุ่มแม่กุญแจมุมขวาบน แล้วกด **`จัดตารางสอนอัตโนมัติ`** → ตรวจว่าคาบล็อกไม่ขยับ, วิชาคู่ไม่คร่อมพักกลางวัน, ไม่มีครูชนคาบ (0 conflicts) และหากมีคาบเหลือจะแสดงในกล่องรายการรอจัด
   - เปิด **`โหมดสลับคาบ`** → คลิกคาบต้นทาง → ตรวจไฮไลต์ **สีเขียว/สีแดง/คาบล็อก** และลองคลิกช่องสีเขียวเพื่อสลับคาบจริงพร้อมรีเฟรชหน้ายืนยันว่าข้อมูลบันทึกถาวร
   - ตรวจว่า **Auto-Schedule Modal** ไม่ปิดเมื่อคลิกพื้นหลังหรือกด `Escape`
