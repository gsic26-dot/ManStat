# รายงานผลการดำเนินงาน Phase 11.2: เชื่อมโยงคลังรายวิชาเข้ากับแผนการสอน, ดึงวิชาลงห้องแบบ 1 คลิก, แถบตรวจเกณฑ์โครงสร้างเวลาเรียน สพฐ. & แสดงรหัสวิชาทั้งหน้าเว็บและพิมพ์ A4 (ManStat-Modern)

- **วันที่ดำเนินการ:** 2026-11-28
- **สถานะ:** เสร็จสมบูรณ์ (ผ่าน TypeScript, ESLint, 285/285 Unit Tests และ Production Build)
- **SQL Migration:** ไม่ต้องรัน SQL Migration เพิ่มเติม (0 New Migrations — ใช้ฐานข้อมูลจาก Migration 018, 019 และ 020 ร่วมกัน 100%)

---

## 1. สกิลที่ค้นพบและนำมาใช้งาน (Skills Discovered & Applied)

- **`no-emoji-ui-standard`:** บังคับใช้มาตรฐาน Zero-Emoji 100% ใช้เฉพาะไอคอน Lucide SVG พร้อมระยะห่างมาตรฐาน 8px (`gap-2`), เลขอารบิก (`0-9`) และรองรับทั้ง Light/Dark Mode
- **`modern-web-guidance` (หัวข้อ `responsive-table` และ `forms`):**
  - ตารางดึงรายวิชาจากคลังแบบกลุ่มใช้ `<div tabIndex={0} role="region" aria-label="...">` เพื่อให้เลื่อนแนวนอนด้วยคีย์บอร์ดได้
  - ทุกช่องเลือกและช่องกรอกในฟอร์มเพิ่มแผนการสอนและฟอร์มดึงวิชาแบบกลุ่มมี `<label htmlFor>` หรือ `aria-label` ที่ชัดเจน พร้อม `role="status"` แจ้งผลหลังนำเข้า
- **`ponytail`:** เพิ่มฟังก์ชันคำนวณบริสุทธิ์และ Endpoint แบบ Batch โดยไม่แตะ Sidebar, `SegmentedTabs`, `auto-scheduler.ts` หรือไฟล์นอกขอบเขต

---

## 2. รายการไฟล์ที่สร้างและแก้ไข (Files Created / Modified)

| ไฟล์ | ประเภท | สรุปการเปลี่ยนแปลง |
| :--- | :--- | :--- |
| `src/lib/regulations/school-curriculum-presets.ts` | แก้ไข | เพิ่ม `getMissingCatalogSubjectsForRoom`, `resolveSubjectCodeForDisplay`, `evaluateRoomCurriculumCompliance` (ตรวจเกณฑ์ สพฐ. ป.1–ป.6 >= 1,000 ชม./ปี และ ม.1–ม.3 >= 1,200 ชม./ปี + หน่วยกิต) |
| `src/lib/regulations/__tests__/school-curriculum-presets.test.ts` | แก้ไข | เพิ่ม Unit Tests 3 ชุด (Test 4–6) รวมเป็น 6 Tests ในไฟล์นี้ และ 285 Tests ทั้งโปรเจกต์ |
| `src/app/api/admin/timetable/allocations/batch/route.ts` | สร้างใหม่ | `POST /api/admin/timetable/allocations/batch` นำเข้าแผนการสอนแบบกลุ่มแบบ Idempotent ป้องกันสิทธิ์ด้วย `verifyTimetableManagerSession()`, ตรวจ `dbIsTimetableLocked()` (423 Locked) และบันทึก Audit Log (`BATCH_IMPORT_ALLOCATIONS_FROM_CATALOG`) |
| `src/components/views/SubjectCatalogModal.tsx` | แก้ไข | เพิ่ม `onCatalogChanged?: () => void` เพื่อแจ้ง `ViewTimetable` รีเฟรชคลังรายวิชาทันทีเมื่อมีการบันทึก/นำเข้า/สลับสถานะ/ลบ |
| `src/components/views/TimetablePrintView.tsx` | แก้ไข | เพิ่ม Props `showSubjectCode` และ `schoolSubjects` เพื่อแสดงรหัสวิชา สพฐ. บนใบพิมพ์ตารางเรียนรายห้อง ทุกห้อง และตารางสอนรายบุคคล A4 แนวนอน |
| `src/components/views/ViewTimetable.tsx` | แก้ไข | เชื่อมต่อคลังรายวิชาเข้ากับฟอร์ม `แผนการสอน` (Auto-fill), เพิ่มปุ่มและ Modal **`ดึงวิชาจากคลังลงห้องนี้`** (Close-Locked + ตัวช่วยกำหนดครูประจำชั้นเริ่มต้น), เพิ่มแถบ **OBEC Room Curriculum Compliance** และสวิตช์ **`แสดงรหัสวิชา`** บนตารางรายห้อง/รายบุคคล |
| `docs/phase-reports/PHASE_11_2_REPORT.md` | สร้างใหม่ | รายงานสรุปผลการดำเนินงาน Phase 11.2 |
| `docs/phase-reports/README.md` | แก้ไข | เพิ่มดัชนีรายงาน Phase 11.2 |

---

## 3. รายละเอียดเชิงเทคนิคและมาตรฐานที่ยึดถือ (Technical Standards)

- **Fallback Subject Code Resolution:** `resolveSubjectCodeForDisplay()` ใช้รหัสวิชาที่บันทึกไว้ในคาบเรียนก่อน หากคาบเดิมยังไม่มีรหัสจะค้นหาเทียบจาก `school_subjects` ตาม `(subjectName, roomName, semester)` ให้อัตโนมัติ ทำให้ตารางเดิมที่จัดไว้ก่อน Phase 11 แสดงรหัสวิชาได้ทันทีโดยไม่ต้อง Backfill ข้อมูล
- **Lock-Aware & Idempotent Batch Import:** `POST /api/admin/timetable/allocations/batch` ปฏิเสธการแก้ไขด้วย `423 Locked` หากตารางสอนภาคเรียนนั้นถูกล็อกโดยฝ่ายวิชาการ และข้ามวิชาที่มีอยู่แล้วในห้องโดยอัตโนมัติ
- **Clean Staff Names & Eligible Filtering:** รายชื่อครูใน Modal ดึงวิชาจากคลังคัดกรองผ่าน `eligibleTeachingStaff` (ไม่รวมนักการภารโรง) และแสดงชื่อเต็มสะอาดไม่มีวงเล็บตำแหน่งต่อท้าย

---

## 4. ผลการตรวจสอบและทดสอบ (Verification Results)

| รายการตรวจสอบ | คำสั่ง | ผลลัพธ์ |
| :--- | :--- | :--- |
| TypeScript Type Check | `npx tsc --noEmit` | ผ่าน (0 Errors) |
| ESLint Check | `npm run lint` | ผ่าน (0 Errors, 0 Warnings) |
| Unit Tests (`tsx --test`) | `npm test` | ผ่านทั้งหมด **285 / 285 Tests** (91 Suites, เพิ่มใหม่ 3 Tests) |
| Production Build | `npm run build` | ผ่านสมบูรณ์ (Next.js 16.4.6 Turbopack) |

---

## 5. ข้อจำกัด (Limitations)

- ไม่ได้เปิดทดสอบการคลิกใช้งานจริงบน Live Browser, ตัวอย่างก่อนพิมพ์ A4 แนวนอน หรือฐานข้อมูล Supabase Production โดยตรง

---

## 6. สิ่งที่ผู้ใช้ต้องดำเนินการเอง (Manual Steps)

- **ไม่ต้องรัน SQL Migration เพิ่มเติมใน Phase 11.2** (ใช้ตารางจาก Migration `018`, `019` และ `020` ที่สร้างไว้แล้ว — หากยังไม่ได้รัน `020_phase11_school_subjects.sql` จาก Phase 11.1 ให้รันใน Supabase SQL Editor ก่อนใช้งาน)
- เปิดเมนู **`ตารางสอน`** -> แท็บ **`แผนการสอน`** -> ทดสอบกด **`ดึงวิชาจากคลังลงห้องนี้`** เพื่อนำเข้ารายวิชาเข้าห้องเรียนพร้อมกำหนดครูผู้สอนเริ่มต้น และทดสอบสวิตช์ **`แสดงรหัสวิชา`** ทั้งหน้าเว็บและหน้าพิมพ์ A4 แนวนอน
