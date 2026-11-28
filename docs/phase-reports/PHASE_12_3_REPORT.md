# รายงานผลการดำเนินงาน Phase 12.3: คำอธิบายรายวิชา & สัดส่วนคะแนนในคลังหลักสูตร (`Migration 022`) + ระบบติดตามการส่งแผนการสอน / ปพ.5 อัตโนมัติจากตารางสอนจริง (ManStat-Modern)

- **วันที่ดำเนินการ:** 2026-11-28
- **สถานะ:** เสร็จสมบูรณ์ (ผ่าน TypeScript, ESLint, 297/297 Unit Tests และ Production Build)
- **SQL Migration:** เพิ่มใหม่ 1 ไฟล์ — **`supabase/migrations/022_phase12_3_course_specs_and_deliverables.sql`** (ต้องรันใน Supabase SQL Editor)

---

## 1. สกิลที่ค้นพบและนำมาใช้งาน (Skills Discovered & Applied)

- **`no-emoji-ui-standard`:** บังคับใช้มาตรฐาน Zero-Emoji 100% ใช้เฉพาะไอคอน Lucide SVG พร้อมระยะห่างมาตรฐาน 8px (`gap-2`), เลขอารบิก (`0-9`) และรองรับทั้ง Light/Dark Mode
- **`modern-web-guidance` (หัวข้อ `responsive-table` และ `forms`):**
  - ใช้ `<div tabIndex={0} role="region" aria-label="...">` ครอบตารางติดตามงานวิชาการ พร้อม `whitespace-nowrap` บนคอลัมน์ชื่อ-สกุล
  - ใช้ `<search>` ครอบแผงค้นหาและตัวกรอง, กำหนด `<label htmlFor>` / `aria-label` บนตัวเลือกสถานะทุกแถว และประกาศผลการบันทึกผ่าน `role="status" aria-live="polite"`
- **`ponytail`:** ต่อยอดเฉพาะขอบเขต Phase 12.3 (Migration 022 + คลังรายวิชา + ตัวติดตามงานวิชาการอัตโนมัติ) โดยไม่แตะ Sidebar, `SegmentedTabs`, `auto-scheduler.ts` หรือไฟล์นอกขอบเขต

---

## 2. รายการไฟล์ที่สร้างและแก้ไข (Files Created / Modified)

| ไฟล์ | ประเภท | สรุปการเปลี่ยนแปลง |
| :--- | :--- | :--- |
| `supabase/migrations/022_phase12_3_course_specs_and_deliverables.sql` | สร้างใหม่ | ขยายตาราง `public.school_subjects` ด้วย `course_description` และ `assessment_ratio` พร้อมสร้างตาราง `public.academic_deliverables` (Unique ต่อเทอม/ครู/ห้อง/วิชา, Index, RLS และ `NOTIFY pgrst, 'reload schema'`) |
| `src/lib/data/timetableTypes.ts` | แก้ไข | เพิ่ม `courseDescription`, `assessmentRatio` ใน `SchoolSubject` และเพิ่ม `DeliverableStatus`, `AcademicDeliverableRecord` |
| `src/lib/regulations/academic-deliverables-utils.ts` | สร้างใหม่ | Engine `buildTeacherDeliverableRows` ดึงรายการสอนของครูแต่ละคนอัตโนมัติจาก `timetable_slots` (รวมคาบสอนร่วม, ตัด `พบครูประจำชั้น` ออก) ผสานกับสถานะที่บันทึกไว้ พร้อม `exportDeliverablesCsv` (UTF-8 BOM + RFC-4180) |
| `src/lib/regulations/__tests__/academic-deliverables-utils.test.ts` | สร้างใหม่ | Unit Tests 3 ชุด ทดสอบการดึงรายการสอนจากข้อมูลจริง `2/2569` (รวมคาบสอนร่วม ผอ.ธีรศักดิ์ 3 ห้อง), การคำนวณ % ความครบถ้วน และการส่งออก CSV UTF-8 BOM |
| `src/lib/db/serverDb.ts` | แก้ไข | อัปเดต `schoolSubjectFromDb`/`schoolSubjectToDbRow` และเพิ่ม `dbGetAcademicDeliverables`, `dbUpsertAcademicDeliverable` รองรับ Dual-Mode (Supabase + Local JSON Fallback) |
| `src/app/api/admin/timetable/subjects/route.ts` | แก้ไข | บันทึก `courseDescription` และ `assessmentRatio` ลงฐานข้อมูล |
| `src/app/api/timetable/deliverables/route.ts` | สร้างใหม่ | `GET /api/timetable/deliverables?academicYear=...&semester=...` (อ่านได้ทุกคน) |
| `src/app/api/admin/timetable/deliverables/route.ts` | สร้างใหม่ | `POST /api/admin/timetable/deliverables` ป้องกันสิทธิ์ด้วย `verifyTimetableManagerSession()` พร้อม Audit Log (`UPSERT_ACADEMIC_DELIVERABLE`) |
| `src/components/views/SubjectCatalogModal.tsx` | แก้ไข | เพิ่มช่อง `สัดส่วนคะแนน (เก็บ : สอบ)` พร้อมปุ่มลัด `80:20`, `70:30`, `60:40` และช่อง `คำอธิบายรายวิชา (โดยย่อ)` |
| `src/components/views/CurriculumPrintView.tsx` | แก้ไข | แสดงสัดส่วนคะแนนและคำอธิบายรายวิชาโดยย่อบนใบพิมพ์โครงสร้างหลักสูตร A4 เมื่อมีการกรอกไว้ |
| `src/components/views/AcademicDeliverablesModal.tsx` | สร้างใหม่ | Modal ติดตามงานวิชาการแบบ Close-Locked แสดง KPI 4 การ์ด, ค้นหา/กรองสถานะ, อัปเดตสถานะ `แผนการสอน`/`ปพ.5` และ `หมายเหตุ` แบบ Inline, ส่งออก CSV Excel และพิมพ์รายงาน A4 |
| `src/components/views/AcademicDeliverablesPrintView.tsx` | สร้างใหม่ | รายงานพิมพ์ A4 แนวนอน (`@page { size: A4 landscape; margin: 10mm; }`) พร้อมช่องลงนามคู่ (`หัวหน้าฝ่ายบริหารวิชาการ` & `ผู้อำนวยการสถานศึกษา`) |
| `src/components/views/ViewTimetable.tsx` | แก้ไข | เพิ่มปุ่ม **`ติดตามงานวิชาการ`** ข้างปุ่ม `ตรวจหลักสูตร (SAR)` ในแถบเครื่องมือด้านบน และเชื่อมต่อ `<AcademicDeliverablesModal />` |
| `docs/phase-reports/PHASE_12_3_REPORT.md` | สร้างใหม่ | รายงานสรุปผลการดำเนินงาน Phase 12.3 |
| `docs/phase-reports/README.md` | แก้ไข | เพิ่มดัชนีรายงาน Phase 12.3 |

---

## 3. ผลการตรวจสอบและทดสอบ (Verification Results)

| รายการตรวจสอบ | คำสั่ง | ผลลัพธ์ |
| :--- | :--- | :--- |
| TypeScript Type Check | `npx tsc --noEmit` | ผ่าน (0 Errors) |
| ESLint Check | `npm run lint` | ผ่าน (0 Errors, 0 Warnings) |
| Unit Tests (`tsx --test`) | `npm test` | ผ่านทั้งหมด **297 / 297 Tests** (94 Suites, เพิ่มใหม่ 3 Tests) |
| Production Build | `npm run build` | ผ่านสมบูรณ์ (Next.js 16.4.6 Turbopack) |

---

## 4. ข้อจำกัด (Limitations)

- ไม่สามารถรัน SQL Migration 022 บนฐานข้อมูล Supabase Production โดยตรงจากสภาพแวดล้อมนี้ และไม่ได้เปิดตรวจสอบการเรนเดอร์จริงบน Live Browser / ตัวอย่างก่อนพิมพ์ A4 แนวนอน

---

## 5. สิ่งที่ผู้ใช้ต้องดำเนินการเอง (Manual Steps — รวมถึง SQL Migration 022)

1. **รัน SQL Migration 022 ใน Supabase SQL Editor:** นำไฟล์ **`supabase/migrations/022_phase12_3_course_specs_and_deliverables.sql`** ไปรันใน Supabase SQL Editor เพื่อเพิ่มคอลัมน์ `course_description`, `assessment_ratio` และสร้างตาราง `public.academic_deliverables`
2. **ทดลองใช้งาน:** เปิดเมนู **`ตารางสอน`** (`2569 / ภาคเรียนที่ 2`) -> กดปุ่ม **`ติดตามงานวิชาการ`** เพื่อดูรายการสอนที่ดึงอัตโนมัติจากตารางสอนจริง พร้อมทดสอบอัปเดตสถานะ `แผนการสอน`/`ปพ.5`, ส่งออก Excel CSV และพิมพ์รายงาน A4 แนวนอน
