# รายงานผลการดำเนินงาน Phase 12.5 — ตรวจสอบและปรับปรุงตรรกะการนับวันลาให้ตรงตามระเบียบสำนักนายกรัฐมนตรีว่าด้วยการลาของข้าราชการ พ.ศ. 2555 (ManStat-Modern)

**วันที่:** 2026-11-28  
**ขอบเขตงาน:** ตรวจสอบ (Full-Codebase Audit) และปรับปรุงตรรกะการนับวันลาครบทั้ง **11 ประเภท** ตาม **ระเบียบสำนักนายกรัฐมนตรีว่าด้วยการลาของข้าราชการ พ.ศ. 2555** ทั้ง 2 มิติ (`submissionCalendarDays` และ `calculatedLeaveDays`) ครอบคลุม Pure Engine, Server API, ฟอร์มยื่นลา, บันทึกลาย้อนหลัง, ประวัติการลา, ใบพิมพ์ A4 และ Unit Tests โดย **ไม่ต้องเพิ่ม SQL Migration ใหม่ (0 Migrations)**

---

## 1. สกิลที่ค้นพบและนำมาใช้งาน (Skills Discovered & Applied)
- **`no-emoji-ui-standard`:** บังคับใช้มาตรฐาน Zero-Emoji 100% และใช้ไอคอน Lucide SVG พร้อมระยะห่างมาตรฐานในทุกไฟล์ UI ที่แก้ไข
- **`ponytail`:** แก้ไขที่จุดต้นเหตุเดียว (Single Source of Truth ใน `leave-calculator.ts`) โดยไม่เพิ่ม Migration หรือความซับซ้อนเกินจำเป็น

---

## 2. ตารางเปรียบเทียบผลการตรวจสอบและแก้ไข (Before vs. After Audit Table)

| ลำดับ | ไฟล์ / จุดที่ตรวจสอบ | ปัญหาที่พบก่อนแก้ไข (Before) | การแก้ไขที่ดำเนินการ (After) |
| :---: | :--- | :--- | :--- |
| 1 | `src/lib/regulations/leave-calculator.ts` (`calculateLeaveDays`) | ประเภทการลาแบบ **นับต่อเนื่อง (รวมวันหยุด)** ขาดหายไป **3 จาก 7 ประเภท** (`ลาไปปฏิบัติงานในองค์การระหว่างประเทศ`, `ลาติดตามคู่สมรส`, `ลาไปฟื้นฟูสมรรถภาพด้านอาชีพ`) ทำให้ตกไปนับเฉพาะวันทำการผิดระเบียบฯ 2555 | สร้าง `LEAVE_COUNTING_RULES_2555` ครบทั้ง **11 ประเภท** (4 ประเภทนับเฉพาะวันทำการ + 7 ประเภทนับต่อเนื่องรวมวันหยุด) และ `calculateLeaveDuration()` เป็น Single Source of Truth |
| 2 | `src/lib/regulations/leave-calculator.ts` (Holiday Matching) | ใช้ `new Date(startDate)` + `setHours(0,0,0,0)` + `curr.toISOString().split('T')[0]` ซึ่งในเขตเวลา UTC+7 (ไทย) จะเลื่อนย้อนหลัง 1 วัน (`YYYY-MM-(DD-1)`) ทำให้เทียบวันหยุดราชการไม่ตรง | เปลี่ยนเป็นตัวแปลงวันที่แบบ UTC Integer (`parseIsoDateUtcMs` / `formatUtcMsToIso`) ปลอดปัญหา Timezone Off-by-One 100% |
| 3 | `src/lib/regulations/leave-calculator.ts` (Half-Day & Edge Cases) | ลาครึ่งวันในวันหยุดเสาร์-อาทิตย์หรือวันหยุดนักขัตฤกษ์คืนค่า `0.5` แทนที่จะเป็น `0` และไม่รองรับการลาพักผ่อนครึ่งวัน | ตรวจสอบวันทำการก่อนคืนค่า `0.5` (ถ้าตรงวันหยุดคืน `0`), ควบคุม `allowHalfDay` ผ่านกฎของแต่ละประเภท และรองรับ `ลาป่วย`, `ลากิจส่วนตัว`, `ลาพักผ่อน` |
| 4 | `src/lib/regulations/leave-calculator.ts` (Approval Routing) | ไม่มีมิติ `submissionCalendarDays` (นับต่อเนื่องทุกประเภทเพื่อเสนอ/จัดส่งใบลา) และไม่มีฟังก์ชันตรวจสอบอำนาจการอนุญาต | เพิ่ม `submissionCalendarDays` (นับต่อเนื่องทุกประเภท) และ `evaluateLeaveApprovalAuthority()` เพื่อตรวจสอบเกณฑ์อำนาจ ผอ.สถานศึกษา vs ผอ.สพป. |
| 5 | `src/app/api/admin/leave/route.ts` (`POST`) | เชื่อค่า `body.totalDays` ที่ส่งมาจากฝั่ง Client โดยตรง ไม่ได้คำนวณใหม่และไม่เทียบกับตารางวันหยุดราชการบน Server | คำนวณ `calculateLeaveDuration()` ใหม่บน Server โดยดึงวันหยุดจาก `dbGetHolidays()` ทุกครั้งที่สร้างหรือแก้ไขวันที่/ประเภทการลา พร้อมประเมิน `evaluateLeaveApprovalAuthority()` |
| 6 | `src/components/leave/SmartLeaveForm.tsx` | แสดงป้าย `"จำนวนวันลาที่คำนวณได้จริง (หักวันหยุดราชการ/เสาร์-อาทิตย์): X วันทำการ"` ตายตัวทุกประเภทแม้เลือก `ลาคลอดบุตร` หรือ `ลาอุปสมบท`, ไม่แสดง `submissionCalendarDays` และไม่ส่ง `halfDayPeriod` ไป API | แสดงป้ายแยกชัดเจนตามโหมด (`นับเฉพาะวันทำการ` + `รวมวันหยุดเพื่อเสนอใบลา: Y วันต่อเนื่อง` เมื่อต่างกัน, หรือ `นับต่อเนื่อง (รวมวันหยุด): X วัน`), รีเซ็ตและปิดตัวเลือกครึ่งวันอัตโนมัติเมื่อประเภทไม่รองรับ และส่ง `halfDayPeriod` ไป Server |
| 7 | `src/components/views/ViewRetroLeave.tsx` | ให้กรอก `totalDays` ด้วยมือ ค่าเริ่มต้นเป็น `'1'` ตลอด ไม่คำนวณจากช่วงวันที่และวันหยุดราชการ และเปิดให้ติ๊กลาครึ่งวันได้ทุกประเภท | เชื่อมต่อ `/api/admin/holidays` และ `calculateLeaveDuration()` คำนวณวันลาและวันต่อเนื่องอัตโนมัติ แสดงแถบสรุปแบบเดียวกับ `SmartLeaveForm` และล็อกตัวเลือกครึ่งวันตามสิทธิ |
| 8 | `src/components/views/ViewLeaveRequests.tsx` | แสดงหน่วย `{req.totalDays} วันทำการ` ตายตัวทุกแถวแม้เป็นประเภทลาแบบนับต่อเนื่อง และ Modal ไม่อนุมัติ/ลบยังปิดได้เมื่อคลิกพื้นหลัง | แสดงหน่วยตามกฎจริง (`วันทำการ` vs `วัน (นับต่อเนื่อง)` vs `0 วัน (ไม่ตัดโควตา)`) และล็อกการปิด Modal (Close-Locked) |
| 9 | `src/components/print/OfficialLeavePrintView.tsx` | แถวสถิติ `คลอดบุตร` ในตารางปีงบประมาณใส่ `-` ตายตัว และข้อความ `มีกำหนด X วัน` ไม่แยกหน่วยวันทำการ/วันนับต่อเนื่อง | แสดงหน่วย `วันทำการ` / `วัน (นับต่อเนื่อง)` ตามระเบียบฯ 2555 และแสดงตัวเลขสถิติการลาคลอดบุตรจริงจาก `data.stats` |
| 10 | `src/components/leave/LeaveCriteriaModal.tsx` | ไม่แสดงป้ายวิธีการนับวันลาของแต่ละประเภท และปิด Modal ได้ด้วยปุ่ม Escape/คลิกพื้นหลัง | เพิ่มป้าย `นับเฉพาะวันทำการ` / `นับต่อเนื่อง (รวมวันหยุด)` บนทุกประเภทการลาตามระเบียบฯ 2555 และล็อกการปิด Modal |
| 11 | `supabase/migrations/001_init_manstat_schema.sql` (`fn_calculate_leave_days`) | ฟังก์ชัน SQL เก่าระบุประเภทลาต่อเนื่องเพียง 4 จาก 7 ประเภท *(หมายเหตุ: API หลัก `/api/admin/leave` ไม่ได้เรียกใช้ RPC นี้ แต่คำนวณผ่าน TypeScript Engine บน Server)* | บันทึกในรายงานเพื่อความโปร่งใส (ไม่สร้าง SQL Migration ใหม่ตามขอบเขต Phase 12.5) |

---

## 3. ยืนยันฐานข้อมูล (SQL Migrations)
- **จำนวน SQL Migration ใหม่:** **0 Migrations** (ใช้โครงสร้างฐานข้อมูลเดิมทั้งหมด และคำนวณ `submissionCalendarDays` / `calculatedLeaveDays` ผ่าน Pure Engine บน Server API อย่างแม่นยำ)

---

## 4. ผลการตรวจสอบคุณภาพ (Verification Suite)
- **TypeScript (`npx tsc --noEmit`):** ผ่าน (0 errors)
- **ESLint (`npm run lint`):** ผ่าน (0 warnings / 0 errors)
- **Unit Tests (`npm test`):** ผ่านทั้งหมด **304/304** tests (เพิ่ม 5 Test Cases ครอบคลุมครบทั้ง 11 ประเภทการลา, ลาครึ่งวัน, วันหยุดนักขัตฤกษ์, วันที่ย้อนกลับ และเกณฑ์อำนาจการอนุญาต)
- **Production Build (`npm run build`):** ผ่านสมบูรณ์
