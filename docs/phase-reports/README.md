# ManStat-Modern — ดัชนีรายงานผลการดำเนินงานรายเฟส (Phase Execution Reports)

สารบัญรวมรายงานผลการดำเนินงานและผลการตรวจสอบในแต่ละ Phase สำหรับการตรวจสอบย้อนหลัง (Audit Trail)

| Phase | วันที่ | สถานะ | ไฟล์รายงาน |
| :--- | :--- | :--- | :--- |
| **Phase 2** — ทะเบียนเฉพาะทาง CRUD (`ใบอนุญาตฯ`, `วุฒิลูกเสือ`, `วิทยฐานะ`) & ลิงก์นำทางด่วนใน `StaffEditModal` | 2026-11-27 | เสร็จสมบูรณ์ (ผ่าน TypeCheck / Lint / 227 Tests / Build) | [PHASE_02_REPORT.md](./PHASE_02_REPORT.md) |
| **Phase 3** — มาตรฐานฝ่ายงานภาระงานหมวด 2, ซิงก์ผังองค์กรหลายฝ่าย & ตัวกรอง HR + คาดการณ์ปีเกษียณในทะเบียนบุคลากร | 2026-11-27 | เสร็จสมบูรณ์ (ผ่าน TypeCheck / Lint / 234 Tests / Build) | [PHASE_03_REPORT.md](./PHASE_03_REPORT.md) |
| **Phase 4** — ปิดงานตกค้างฝ่ายงาน `ViewWorkload`, ส่งออก CSV (UTF-8 BOM + PDPA) & ตรวจสอบสิทธิ์ข้ามโมดูล 6 หน้า | 2026-11-27 | เสร็จสมบูรณ์ (ผ่าน TypeCheck / Lint / 238 Tests / Build) | [PHASE_04_REPORT.md](./PHASE_04_REPORT.md) |
| **Phase 5** — Forensic Audit & Restoration ของทะเบียนใบอนุญาตฯ, วิทยฐานะ, วุฒิลูกเสือ (`?staff=`, Footer Quick-Jump, Standing Parity & Role Hardening) | 2026-11-27 | เสร็จสมบูรณ์ (ผ่าน TypeCheck / Lint / 238 Tests / Build) | [PHASE_05_AUDIT_RESTORE_REPORT.md](./PHASE_05_AUDIT_RESTORE_REPORT.md) |
| **Phase 6** — ปรับโฉม `StaffEditModal` เป็น 6 แท็บ (3×2) `max-w-4xl`, รวมบัญชี/สิทธิ์เข้าแท็บ 2 & กู้คืนแท็บ วิทยฐานะ / ใบอนุญาตฯ / วุฒิลูกเสือ | 2026-11-27 | เสร็จสมบูรณ์ (ผ่าน TypeCheck / Lint / 238 Tests / Build) | [PHASE_06_REPORT.md](./PHASE_06_REPORT.md) |
| **Phase 6.1** — Surgical Patch: ซิงก์ `highest_scout` & `scout_cert_no` กลับตาราง `teachers` อัตโนมัติใน `dbDeleteScout` (`DELETE /api/admin/scout`) | 2026-11-27 | เสร็จสมบูรณ์ (ผ่าน TypeCheck / Lint / 243 Tests / Build) | [PHASE_06_1_SCOUT_SYNC_REPORT.md](./PHASE_06_1_SCOUT_SYNC_REPORT.md) |
| **Phase 7** — End-to-End DB Schema Audit (Migration 016), ล็อกการปิด Modal, ยกเครื่องแท็บ 3 (List+Form ก.ค.ศ.) & ปรับแต่งแท็บ 4–6 | 2026-11-27 | เสร็จสมบูรณ์ (ผ่าน TypeCheck / Lint / 249 Tests / Build) | [PHASE_07_REPORT.md](./PHASE_07_REPORT.md) |
| **Phase 8** — ยกเครื่อง `ViewWorkload` เป็น "งานบริหาร 4 ฝ่ายและหน้าที่พิเศษ", คลัง 38 ระบบรายงาน สพฐ., Migration 017 & Multi-Select ผู้ร่วมรับผิดชอบ | 2026-11-27 | เสร็จสมบูรณ์ (ผ่าน TypeCheck / Lint / 254 Tests / Build) | [PHASE_08_REPORT.md](./PHASE_08_REPORT.md) |
| **Phase 8.1** — ขัดเกลา UX `ViewWorkload` (ตัดวงเล็บซ้ำซ้อน, Cascading 2 ขั้น ฝ่าย→ตำแหน่ง) & คัดลอกโครงสร้างงานข้ามปีการศึกษา (`POST /api/admin/workload/rollover`) | 2026-11-28 | เสร็จสมบูรณ์ (ผ่าน TypeCheck / Lint / 258 Tests / Build) | [PHASE_08_1_REPORT.md](./PHASE_08_1_REPORT.md) |
| **Phase 9.1** — ระบบตารางสอนและชั่วโมงสอน (`ViewTimetable`, Migration 018, 5×7 Grid, Co-Teaching, ตรวจคาบชน & คำนวณ ว 9/2564) | 2026-11-28 | เสร็จสมบูรณ์ (ผ่าน TypeCheck / Lint / 261 Tests / Build) | [PHASE_09_1_REPORT.md](./PHASE_09_1_REPORT.md) |
| **Phase 9.2** — Auto-Scheduler Engine (`auto-scheduler.ts`), ปักหมุดล็อก 1 คลิก, Unplaced Queue & โหมดสลับคาบอัจฉริยะ (Smart Swap) | 2026-11-28 | เสร็จสมบูรณ์ (ผ่าน TypeCheck / Lint / 266 Tests / Build) | [PHASE_09_2_REPORT.md](./PHASE_09_2_REPORT.md) |
| **Phase 9.3** — ปิดจบระบบตารางสอน: ปฐมวัย (`อ.1–อ.3`), คัดลอกข้ามเทอม/ข้ามปี 2 โหมด, พิมพ์ A4 แนวนอน & โอนย้ายงานสอนเดิม | 2026-11-28 | เสร็จสมบูรณ์ (ผ่าน TypeCheck / Lint / 270 Tests / Build) | [PHASE_09_3_REPORT.md](./PHASE_09_3_REPORT.md) |
| **Phase 9.3.1** — ขัดเกลา UI/UX ตารางสอน & Sidebar: ใช้คำว่า "ชั่วโมง", คัดกรองภารโรง, แยกป้ายผู้บริหาร/สายสนับสนุน, เพิ่ม `งานการศึกษาปฐมวัย` & ปรับสัดส่วนตาราง | 2026-11-28 | เสร็จสมบูรณ์ (ผ่าน TypeCheck / Lint / 272 Tests / Build) | [PHASE_09_3_1_REPORT.md](./PHASE_09_3_1_REPORT.md) |
