# รายงานผลการดำเนินงาน Phase 12.1: ปีการศึกษา/ภาคเรียนเริ่มต้นอัตโนมัติตามปฏิทิน สพฐ., หลักสูตรโรงเรียนชุมชนบ้านตะขบฉบับทางการ (`อ.1–ม.3`), ระบบเทียบหาชื่อรหัสวิชาอัจฉริยะ & พิมพ์โครงสร้างหลักสูตร A4 (ManStat-Modern)

- **วันที่ดำเนินการ:** 2026-11-28
- **สถานะ:** เสร็จสมบูรณ์ (ผ่าน TypeScript, ESLint, 291/291 Unit Tests และ Production Build)
- **SQL Migration:** ไม่ต้องรัน SQL Migration เพิ่มเติม (0 New Migrations — ใช้ตาราง `public.school_subjects` จาก Migration 020 ร่วมกัน 100%)

---

## 1. สกิลที่ค้นพบและนำมาใช้งาน (Skills Discovered & Applied)

- **`no-emoji-ui-standard`:** บังคับใช้มาตรฐาน Zero-Emoji 100% ใช้เฉพาะไอคอน Lucide SVG พร้อมระยะห่างมาตรฐาน 8px (`gap-2`), เลขอารบิก (`0-9`) และรองรับทั้ง Light/Dark Mode
- **`modern-web-guidance`:** ตรวจสอบโครงสร้าง `<select>` ที่มี `aria-label` ชัดเจน และสื่อพิมพ์ `@media print` แบบ `@page { size: A4 portrait; margin: 12mm; }` ที่ซ่อน UI อื่นขณะสั่งพิมพ์
- **`ponytail`:** เพิ่มฟังก์ชันบริสุทธิ์และคอมโพเนนต์พิมพ์แยกไฟล์อย่างกระชับ โดยไม่แตะ Sidebar, `SegmentedTabs`, `auto-scheduler.ts` หรือสร้าง Migration ใหม่

---

## 2. รายการไฟล์ที่สร้างและแก้ไข (Files Created / Modified)

| ไฟล์ | ประเภท | สรุปการเปลี่ยนแปลง |
| :--- | :--- | :--- |
| `src/lib/regulations/timetable-utils.ts` | แก้ไข | เพิ่ม `getCurrentThaiAcademicTerm(now)` คำนวณปีการศึกษา (พ.ศ.) และภาคเรียนอัตโนมัติ (`พ.ค.–ต.ค.` → เทอม 1, `พ.ย.–ธ.ค.` → เทอม 2 ปีปัจจุบัน, `ม.ค.–เม.ย.` → เทอม 2 ปีก่อนหน้า) |
| `src/lib/regulations/school-curriculum-presets.ts` | แก้ไข | อัปเดต `buildDefaultObecCurriculumPresets()` ด้วยหลักสูตรจริงของโรงเรียนชุมชนบ้านตะขบ (`ป.1–ป.6` รวม 1,120 ชม./ปี, `ม.1–ม.3` รวม 11.0 + 2.5 นก. / 600 ชม./ภาคเรียน) และอัปเกรด `resolveSubjectCodeForDisplay()` ให้รองรับคำย่อและชื่อพ้องบนตารางสอน |
| `src/lib/db/serverDb.ts` | แก้ไข | อัปเกรด `dbSeedSchoolSubjects()` เป็น Upsert/Sync อย่างปลอดภัย (อัปเดตรายการหลักสูตรเดิมตาม `id` โดยไม่สร้างรายการซ้ำและคงสถานะ `isActive`) |
| `src/app/api/admin/timetable/subjects/seed/route.ts` | แก้ไข | คืนค่า `insertedCount`, `updatedCount`, `skippedCount` และบันทึก Audit Log ครบถ้วน |
| `src/components/views/CurriculumPrintView.tsx` | สร้างใหม่ | ใบพิมพ์โครงสร้างหลักสูตรสถานศึกษา A4 แนวตั้ง (ตาราง 1 คอลัมน์รายปี 1,120 ชม. สำหรับ ป.1–ป.6 และตาราง 2 คอลัมน์เคียงกัน เทอม 1 / เทอม 2 สำหรับ ม.1–ม.3 พร้อมหมายเหตุและช่องลงนาม ผอ.) |
| `src/components/views/SubjectCatalogModal.tsx` | แก้ไข | เพิ่มตัวเลือกระดับชั้น + ปุ่ม **`พิมพ์โครงสร้างหลักสูตร A4`** และอัปเดตปุ่ม **`นำเข้า/อัปเดตหลักสูตรโรงเรียน (อ.1–ม.3)`** |
| `src/components/views/ViewTimetable.tsx` | แก้ไข | ใช้ `getCurrentThaiAcademicTerm()` เป็นค่าเริ่มต้นของปีการศึกษา/ภาคเรียน และย่อชื่อแท็บ 4 เป็น **`ระดับปฐมวัย`** ไม่ตัดคำด้วย `...` |
| `src/components/views/ViewWorkload.tsx` | แก้ไข | ใช้ `getCurrentThaiAcademicTerm()` เป็นค่าเริ่มต้นของ `paSemester` และปีการศึกษา |
| `src/components/views/ViewOrgChart.tsx` | แก้ไข | ใช้ `getCurrentThaiAcademicTerm().academicYear` เป็นปีการศึกษาเริ่มต้น |
| `src/lib/regulations/__tests__/school-curriculum-presets.test.ts` | แก้ไข | เพิ่ม Unit Tests 3 ชุด (Test 7–9) ทดสอบ `getCurrentThaiAcademicTerm`, ผลรวมหลักสูตร 1,120 ชม./600 ชม. และ `resolveSubjectCodeForDisplay` สำหรับคำย่อ ม.3/2 |
| `docs/phase-reports/PHASE_12_1_REPORT.md` | สร้างใหม่ | รายงานสรุปผลการดำเนินงาน Phase 12.1 |
| `docs/phase-reports/README.md` | แก้ไข | เพิ่มดัชนีรายงาน Phase 12.1 |

---

## 3. ผลการตรวจสอบและทดสอบ (Verification Results)

| รายการตรวจสอบ | คำสั่ง | ผลลัพธ์ |
| :--- | :--- | :--- |
| TypeScript Type Check | `npx tsc --noEmit` | ผ่าน (0 Errors) |
| ESLint Check | `npm run lint` | ผ่าน (0 Errors, 0 Warnings) |
| Unit Tests (`tsx --test`) | `npm test` | ผ่านทั้งหมด **291 / 291 Tests** (92 Suites, เพิ่มใหม่ 3 Tests) |
| Production Build | `npm run build` | ผ่านสมบูรณ์ (Next.js 16.4.6 Turbopack) |

---

## 4. ข้อจำกัด (Limitations)

- ไม่ได้เปิดทดสอบการแสดงผลจริงบน Live Browser และตัวอย่างก่อนพิมพ์ A4 แนวตั้งในเครื่องผู้ใช้โดยตรง

---

## 5. สิ่งที่ผู้ใช้ต้องดำเนินการเอง (Manual Steps)

1. **ไม่ต้องรัน SQL Migration เพิ่มเติม (0 New Migrations)** — ใช้ตาราง `public.school_subjects` จาก Migration 020 เดิม
2. เปิดเมนู **`ตารางสอน`** (จะเปิดที่ **`2569 / ภาคเรียนที่ 2`** อัตโนมัติตามปฏิทินปัจจุบัน) -> กดปุ่ม **`คลังรายวิชา`** -> กด **`นำเข้า/อัปเดตหลักสูตรโรงเรียน (อ.1–ม.3)`** เพื่ออัปเดตหลักสูตรฉบับทางการลงฐานข้อมูล
3. ทดสอบเปิดสวิตช์ **`แสดงรหัสวิชา`** บนตารางสอน `2/2569` และทดสอบปุ่ม **`พิมพ์โครงสร้างหลักสูตร A4`** สำหรับชั้น ป.1–ป.6 และ ม.1–ม.3
