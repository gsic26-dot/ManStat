# รายงานผลการดำเนินงาน Phase 11.1: ระบบคลังรายวิชาสถานศึกษา (`คลังรายวิชา อ.1–ม.3`) — Migration 020, หลักสูตรมาตรฐาน สพฐ., API ป้องกันสิทธิ์ฝ่ายวิชาการ & หน้าจัดการ UI (ManStat-Modern)

- **วันที่ดำเนินการ:** 2026-11-28
- **สถานะ:** เสร็จสมบูรณ์ (ผ่าน TypeScript, ESLint, 282/282 Unit Tests และ Production Build)
- **SQL Migration:** เพิ่มใหม่ 1 ไฟล์ — **`supabase/migrations/020_phase11_school_subjects.sql`** (ต้องรันใน Supabase SQL Editor)

---

## 1. สกิลที่ค้นพบและนำมาใช้งาน (Skills Discovered & Applied)

- **`no-emoji-ui-standard`:** บังคับใช้มาตรฐาน Zero-Emoji 100% ใช้เฉพาะไอคอน Lucide SVG พร้อมระยะห่างมาตรฐาน 8px (`gap-2`), เลขอารบิก (`0-9`) และรองรับ Light/Dark Mode
- **`modern-web-guidance` (หัวข้อ `responsive-table` และ `forms`):**
  - ใช้ `<div tabIndex={0} role="region" aria-label="...">` ครอบตารางคลังรายวิชาเพื่อให้เลื่อนแนวนอนด้วยคีย์บอร์ดได้
  - ใช้ `<search>` ครอบแผงค้นหาและตัวกรอง, ใช้ `<form>`, `<fieldset>`/`<legend>`, `<label htmlFor>` คู่กับ `id`/`name` ครบทุกช่อง, ตั้ง `autoCorrect="off" autoCapitalize="none" spellCheck={false}` บนช่องรหัสวิชา และประกาศผลลัพธ์ผ่าน `role="status" aria-live="polite"`
- **`ponytail`:** ออกแบบและแยกส่วน Phase 11.1 (คลังรายวิชา + Migration 020 + API + UI) อย่างชัดเจนโดยยังไม่แตะการผูกกับ `แผนการสอน` หรือ `TimetablePrintView` (เก็บไว้ทำใน Phase 11.2)

---

## 2. รายการไฟล์ที่สร้างและแก้ไข (Files Created / Modified)

| ไฟล์ | ประเภท | สรุปการเปลี่ยนแปลง |
| :--- | :--- | :--- |
| `supabase/migrations/020_phase11_school_subjects.sql` | สร้างใหม่ | สร้างตาราง `public.school_subjects` รองรับ ปฐมวัย/ประถม/ม.ต้น, `grade_levels` (JSONB), `semester_scope`, `default_hours_per_week`, `hours_per_year`, `credits`, `prefer_morning`, `default_consecutive`, `is_active`, Indexes, RLS และ `NOTIFY pgrst, 'reload schema'` |
| `src/lib/data/timetableTypes.ts` | แก้ไข | เพิ่ม Types: `SubjectLevelGroup`, `SubjectSemesterScope`, `SchoolSubjectType`, `SchoolSubject` |
| `src/lib/regulations/school-curriculum-presets.ts` | สร้างใหม่ | คลังหลักสูตรมาตรฐาน สพฐ. ครบทุกระดับ (`อ.1–ม.3`: ปฐมวัย 6 กิจกรรม, ประถม 8 กลุ่มสาระ + กิจกรรม, ม.ต้น แยกภาคเรียนที่ 1/2 พร้อมหน่วยกิต) และฟังก์ชันคำนวณ/คัดกรอง/Dedupe |
| `src/lib/regulations/__tests__/school-curriculum-presets.test.ts` | สร้างใหม่ | Unit Tests 3 ชุด ตรวจสอบความครบถ้วน `อ.1–ม.3`, Dedupe Key, การคำนวณ `ชม./ปี` & `หน่วยกิต` และการกรองรายวิชา |
| `src/lib/db/serverDb.ts` | แก้ไข | เพิ่ม `dbGetSchoolSubjects`, `dbUpsertSchoolSubject`, `dbToggleSchoolSubjectActive`, `dbDeleteSchoolSubject`, `dbSeedSchoolSubjects` รองรับทั้ง Supabase และ Local JSON Fallback |
| `src/app/api/timetable/subjects/route.ts` | สร้างใหม่ | `GET /api/timetable/subjects` (อ่านได้ทุกคน) |
| `src/app/api/admin/timetable/subjects/route.ts` | สร้างใหม่ | `POST`, `PATCH`, `DELETE` ป้องกันสิทธิ์ด้วย `verifyTimetableManagerSession()` พร้อม Validation และ Audit Log |
| `src/app/api/admin/timetable/subjects/seed/route.ts` | สร้างใหม่ | `POST /api/admin/timetable/subjects/seed` นำเข้าหลักสูตรมาตรฐานแบบ Idempotent พร้อม Audit Log |
| `src/components/views/SubjectCatalogModal.tsx` | สร้างใหม่ | Modal จัดการคลังรายวิชาแบบ Close-Locked (ค้นหา, กรอง 5 มิติ, นำเข้า 1 คลิก, เปิด/ปิดใช้งาน, ลบด้วย `ConfirmModal` และฟอร์มเพิ่ม/แก้ไขแบบคำนวณ ชม./ปี และหน่วยกิตอัตโนมัติ) |
| `src/components/views/ViewTimetable.tsx` | แก้ไข | เพิ่มปุ่ม **`คลังรายวิชา`** ในแถบเครื่องมือด้านบน (เข้าดูได้ทุกบทบาท, แก้ไข/นำเข้าได้เฉพาะผู้ดูแลระบบและฝ่ายวิชาการ) และเชื่อมต่อ `<SubjectCatalogModal />` |
| `docs/phase-reports/PHASE_11_1_REPORT.md` | สร้างใหม่ | รายงานสรุปผลการดำเนินงาน Phase 11.1 |
| `docs/phase-reports/README.md` | แก้ไข | เพิ่มดัชนีรายงาน Phase 11.1 |

---

## 3. รายละเอียดเชิงเทคนิคและมาตรฐานที่ยึดถือ (Technical Standards)

- **Idempotent Seeding:** การนำเข้าโครงสร้างหลักสูตรมาตรฐาน (`POST /api/admin/timetable/subjects/seed`) ใช้ `getSubjectDedupeKey` เปรียบเทียบรหัสวิชา ชื่อรายวิชา ชั้นที่เปิดสอน และภาคเรียน จึงสามารถกดซ้ำได้อย่างปลอดภัยโดยไม่สร้างรายการซ้ำและไม่เขียนทับวิชาที่โรงเรียนปรับแก้ไว้แล้ว
- **Modal Close Lock:** ทั้งหน้าต่างคลังรายวิชาและหน้าต่างฟอร์มเพิ่ม/แก้ไขรายวิชาจะไม่ปิดเมื่อคลิกพื้นหลังหรือกด `Escape` โดยบังเอิญ ปิดได้เฉพาะปุ่ม `X` หรือ `ปิด`/`ยกเลิก` เท่านั้น
- **Academic-Guarded RBAC:** การแก้ไข เปลี่ยนสถานะ ลบ และนำเข้าหลักสูตรป้องกันด้วย `verifyTimetableManagerSession()` (Admin / ผู้อำนวยการ / ฝ่ายบริหารวิชาการ) พร้อมบันทึก Audit Log ทุกการเปลี่ยนแปลง

---

## 4. ผลการตรวจสอบและทดสอบ (Verification Results)

| รายการตรวจสอบ | คำสั่ง | ผลลัพธ์ |
| :--- | :--- | :--- |
| TypeScript Type Check | `npx tsc --noEmit` | ผ่าน (0 Errors) |
| ESLint Check | `npm run lint` | ผ่าน (0 Errors, 0 Warnings) |
| Unit Tests (`tsx --test`) | `npm test` | ผ่านทั้งหมด **282 / 282 Tests** (91 Suites, เพิ่มใหม่ 3 Tests ใน `school-curriculum-presets.test.ts`) |
| Production Build | `npm run build` | ผ่านสมบูรณ์ (Next.js 16.4.6 Turbopack) |

---

## 5. ข้อจำกัด (Limitations)

- ไม่ได้รัน SQL Migration 020 บนฐานข้อมูล Supabase Production โดยตรง และไม่ได้ทดสอบการคลิกใช้งานบน Live Browser ทั้ง Light/Dark Mode

---

## 6. สิ่งที่ผู้ใช้ต้องดำเนินการเอง (Manual Steps)

1. **รัน SQL Migration 020 บน Supabase SQL Editor:** นำไฟล์ **`supabase/migrations/020_phase11_school_subjects.sql`** ไปรันใน Supabase SQL Editor เพื่อสร้างตาราง `public.school_subjects` และรีโหลด Schema ของ PostgREST
2. **นำเข้าหลักสูตรเริ่มต้น:** เปิดเมนู **`ตารางสอน`** -> กดปุ่ม **`คลังรายวิชา`** -> กด **`นำเข้าหลักสูตรมาตรฐาน (อ.1–ม.3)`** เพื่อสร้างคลังรายวิชาเริ่มต้นของโรงเรียนชุมชนบ้านตะขบ (หรือเพิ่ม/แก้ไขรายวิชาเพิ่มเติมเฉพาะของโรงเรียนได้ทันที)
