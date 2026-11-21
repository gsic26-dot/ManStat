# รายงานการตรวจสอบโครงสร้างตารางข้อมูล การเชื่อมโยง และความถูกต้องของระบบ (Data Linkage & CRUD Verification Matrix)
**ระบบบริหารงานบุคคลและสถิติสถานศึกษาดิจิทัล (ManStat)**  
**วันที่ตรวจสอบ:** 20 พฤศจิกายน 2569 | **สถานะผลการตรวจสอบ:** ผ่านการตรวจสอบสมบูรณ์ (Verified & Type-Safe)

---

## 1. ภาพรวมสถาปัตยกรรมข้อมูล (Data Architecture & Storage Engine)

ระบบ ManStat ทำงานภายใต้สถาปัตยกรรม **Dual-Mode Database Store** ที่ออกแบบมาเพื่อความต่อเนื่องในการทำงานและความปลอดภัยของข้อมูลข้าราชการครู:

1. **โหมดออนไลน์ (Production Relational Database - Supabase PostgreSQL):**
   - เชื่อมต่อตรงกับฐานข้อมูล Relational Database 16 ตารางหลักบนคลาวด์
   - รองรับ Primary Key ชัดเจน (`id` / `employee_code`, `member_id`, `leave_id`, `holiday_date`, `key-val` สำหรับ school_info)
   - ปลอดภัยตามมาตรฐาน PDPA ไม่มีการ Overwrite หรือ Truncate ข้อมูล
2. **โหมดออฟไลน์ / ระบบสำรอง (Local JSON Storage Fallback):**
   - บันทึกลงในไฟล์ `data/manstat_db.json` เมื่อไม่มีการเชื่อมต่อเครือข่ายหรือขณะพัฒนาในเครื่อง
   - โครงสร้างข้อมูล Schema ตรงกับ Supabase 100% ทำให้สลับโหมดได้แบบไร้รอยต่อ

---

## 2. ตารางข้อมูลหลักของระบบ (Data Table Schemas)

| ชื่อตาราง (Entity / Table) | ฟิลด์ข้อมูลหลัก (Primary Fields & Schema) | บทบาทในระบบ (System Role) | การจัดเก็บ (Storage) |
| :--- | :--- | :--- | :--- |
| **`teachers`** | `id`, `employeeCode`, `name`, `citizenId`, `position`, `academicStanding`, `department`, `salary`, `startDate`, `birthDate`, `accessLevel`, `role`, `standings[]`, `educations[]`, `licenses[]`, `sickUsed`, `personalUsed`, `vacationUsed` | ทะเบียนประวัติบุคลากร, สิทธิ์การใช้งาน, ประวัติวิทยฐานะ, วุฒิการศึกษา, ใบอนุญาตฯ | Supabase / `manstat_db.json` |
| **`board_members`** | `id` (`member_id`), `fullName`, `position` (Enum), `positionTitle`, `occupation`, `organization`, `phone`, `status`, `termNumber`, `isExOfficio`, `appointmentDate`, `endDate`, `endReason` | คณะกรรมการสถานศึกษาขั้นพื้นฐาน (กรรมการผู้ทรงคุณวุฒิ และ ผอ. โดยตำแหน่ง) | Supabase / `manstat_db.json` |
| **`leave_requests`** (`leave_logs`) | `id`, `docNo`, `teacherId`, `teacherName`, `position`, `department`, `leaveType`, `leaveTypeName`, `startDate`, `endDate`, `totalDays`, `startTime`, `endTime`, `totalHours`, `reason`, `substituteTeacherName`, `workloadJson`, `status`, `submittedAt`, `supervisorRemark`, `directorRemark`, `currentStep` | ธุรกรรมการลาออนไลน์ 13 ประเภท, ลาย้อนหลัง, ข้อมูลการสอนชดเชย, เส้นทางอนุมัติ | Supabase / `manstat_db.json` |
| **`school_info`** | `schoolName`, `jurisdiction`, `schoolCode`, `address`, `subdistrict`, `district`, `province`, `postalCode`, `phone`, `directorName`, `directorPosition`, `academicYear`, `currentTerm`, `fiscalYear`, `activeClasses[]` | ข้อมูลสถานศึกษา, สังกัด สพฐ./สพป., ขนาดโรงเรียน, ผู้อำนวยการ, ปีการศึกษา | Supabase / `manstat_db.json` |
| **`holidays`** | `id`, `date` (`holiday_date`), `name`, `type` | ปฏิทินวันหยุดราชการประจำปี และวันหยุดกรณีพิเศษตามมติ ครม. | Supabase / `manstat_db.json` |
| **`audit_logs`** | `id`, `action`, `actorName`, `actorRole`, `targetName`, `ipAddress`, `timestamp`, `details` | บันทึกประวัติกิจกรรมและการเปลี่ยนแปลงข้อมูลตามมาตรฐาน PDPA | Supabase / `manstat_db.json` |
| **`system_settings`** | `themeMode`, `preferredView`, `compactMode`, `maskCitizenId`, `fiscalYear`, `currentTerm`, `academicYear` | การตั้งค่าสภาพแวดล้อมระบบและการปกปิดข้อมูลส่วนบุคคล | Supabase / `manstat_db.json` |
| **`scouts`** | `id`, `teacherId`, `teacherName`, `position`, `qualification`, `badgeLevel`, `category`, `issueDate`, `certificateNo`, `issuedBy`, `orderNumber` | ทะเบียนวุฒิและเครื่องหมายผู้บังคับบัญชาลูกเสือ | In-memory / Codebase Registry |

---

## 3. ตารางตรวจสอบการเชื่อมโยง การบันทึก การแก้ไข และการแสดงผลทุกเมนู (Comprehensive CRUD & Linkage Audit Matrix)

| หมวด / เมนู (Module & View) | ตารางข้อมูลที่เกี่ยวข้อง (Linked Data Tables) | บันทึกใหม่ (Create) | แก้ไข (Update) | ลบ (Delete) | แสดงผล (Display / Read) | สถานะการเชื่อมโยง (Linkage Health) |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **ภาพรวม (Executive Dashboard)** | `teachers`, `leave_requests`, `school_info`, `holidays` | N/A | อนุมัติ/ไม่อนุมัติคำร้อง (`/api/admin/leave`) | N/A | Realtime Dynamic Metric Cards, Approval Inbox, ว15/2561 Radar | **เชื่อมโยงสมบูรณ์** (ดึง API อัตโนมัติ พร้อมอัปเดตสถิติสด) |
| **หมวด 2: ยื่นคำร้องขอลาใหม่ (`SmartLeaveForm`)** | `teachers` (ผู้ขอลา, ผู้สอนแทน), `leave_requests` | ส่งคำร้องเข้า `/api/admin/leave` | N/A | N/A | ตรวจสอบสิทธิ์วันลาคงเหลือ คำนวณวันทำการ หักวันหยุด | **เชื่อมโยงสมบูรณ์** (บันทึกลง DB จริงและส่งต่อเข้าคิวอนุมัติ) |
| **หมวด 2: รายการคำร้องขอลา (`ViewLeaveRequests`)** | `leave_requests`, `teachers` | N/A | เปลี่ยนสถานะ (อนุมัติ/ตีกลับ) บันทึกความเห็น ผอ. | ยกเลิก/ลบคำร้องผ่าน API | ตาราง/การ์ดคำร้อง กรองสถานะและค้นหา | **เชื่อมโยงสมบูรณ์** (Full CRUD ผ่าน `/api/admin/leave`) |
| **หมวด 2: ติดตามสถานะคำร้อง (`ViewLeaveTracking`)** | `leave_requests` | N/A | N/A | ลบคำร้องค้าง (Pending) | ไทม์ไลน์ 3 ขั้นตอน (ยื่น -> ตรวจสอบ -> อนุมัติ) | **เชื่อมโยงสมบูรณ์** (สะท้อนสถานะตรงกับฐานข้อมูลทันที) |
| **หมวด 2: บันทึกการลาย้อนหลัง (`ViewRetroLeave`)** | `leave_requests`, `teachers` | บันทึกคำร้องย้อนหลังพร้อมใบรับรองแพทย์ | N/A | N/A | ดึงรายชื่อครูจาก DB แบบ Dynamic คำนวณวันลา | **เชื่อมโยงสมบูรณ์** (ดึงรายชื่อครูจาก API `/api/admin/staff`) |
| **หมวด 2: กราฟและสถิติภาพรวม (`ViewLeaveAnalytics`)** | `leave_requests`, `teachers` | N/A | N/A | N/A | กราฟแนวโน้มวันลา อัตราการลาแต่ละกลุ่มสาระฯ | **เชื่อมโยงสมบูรณ์** (คำนวณจากข้อมูลจริงในฐานข้อมูล) |
| **หมวด 2: สรุปวันลา สพฐ. (`ViewOfficialReports`)** | `teachers`, `leave_requests` | N/A | N/A | N/A | ตาราง A4 สรุปวันลาตามแบบ สพฐ. ส่งออก Excel 4 แผ่น | **เชื่อมโยงสมบูรณ์** (ดึงรายชื่อบุคลากรจาก API `/api/admin/staff`) |
| **หมวด 3: ทะเบียนประวัติบุคลากร (`ViewStaffDirectory`)** | `teachers` | N/A (จัดการในหน้าแอดมิน) | N/A (จัดการในหน้าแอดมิน) | N/A (จัดการในหน้าแอดมิน) | ค้นหา กรองกลุ่มสาระฯ แสดงบัตรประวัติ วุฒิ และวันเกษียณ | **เชื่อมโยงสมบูรณ์** (ดึงจาก `/api/admin/staff` อัปเดตทันที) |
| **หมวด 3: ทะเบียนวิทยฐานะ (`ViewRegStanding`)** | `teachers.standings`, `teachers` | N/A (จัดการในหน้าแอดมิน) | แก้ไขผ่าน Admin Standings Inline | ลบผ่าน Admin Standings Inline | ตารางคำสั่งแต่งตั้งและประวัติวิทยฐานะข้าราชการครู | **เชื่อมโยงสมบูรณ์** (ดึงจาก `/api/admin/staff` เชื่อมโยงกับแอดมิน) |
| **หมวด 3: ทะเบียนใบอนุญาตฯ (`ViewRegLicense`)** | `teachers.licenses`, `teachers` | N/A (จัดการในหน้าแอดมิน) | N/A (จัดการในหน้าแอดมิน) | N/A (จัดการในหน้าแอดมิน) | ตรวจสอบสุขภาพใบอนุญาตคุรุสภา เตือนล่วงหน้า 90 วัน | **เชื่อมโยงสมบูรณ์** (ดึงจาก `/api/admin/staff` ประมวลผลวันหมดอายุ) |
| **หมวด 3: ทะเบียนวุฒิลูกเสือ (`ViewRegScout`)** | `scouts`, `teachers` | N/A | N/A | N/A | ตารางและบัตรวุฒิบัตร Wood Badge และลูกเสือสามัญ | **แสดงผลสมบูรณ์** (ดึงตามมาตรฐานสำนักงานลูกเสือแห่งชาติ) |
| **หมวด 4: คณะกรรมการสถานศึกษา (`ViewSchoolBoard`)** | `board_members`, `teachers` (ผอ. โดยตำแหน่ง) | N/A (จัดการในหน้าแอดมิน) | แก้ไขผ่าน Admin Board CRUD | ลบผ่าน Admin Board CRUD | ตาราง/การ์ดกรรมการ ป้าย "โดยตำแหน่ง" คำนวณอายุงานจริง | **เชื่อมโยงสมบูรณ์** (ซิงก์ข้อมูล ผอ. จาก `teachers` พร้อม Guard) |
| **หมวด 4: โครงสร้างองค์กร (`ViewOrgChart`)** | `school_info`, `board_members`, `teachers` | N/A | N/A | N/A | แผนผัง 4 ฝ่ายงานบริหารโรงเรียน พร้อมรายชื่อครูแต่ละฝ่าย | **เชื่อมโยงสมบูรณ์** (ดึงข้อมูลสถานศึกษาและกรรมการจาก API) |
| **หมวด 4: ภาระงานและ PA (`ViewWorkload`)** | `teachers`, `workloads` | บันทึกภาระงานในหน้าเว็บ | ปรับปรุงชั่วโมงงานสอน | ลบภาระงาน | ประเมินเกณฑ์ PA 4 หมวด (ว9/2564 และ สพฐ.) | **เชื่อมโยงสมบูรณ์** (ดึงรายชื่อครูจาก `/api/admin/staff` ในฟอร์ม) |
| **หมวด 5: ข้อเสนอแนะ / แจ้งปัญหา (`ViewFeedback`)** | `feedbacks`, `teachers` | ส่งคำร้องแจ้งปัญหา/ฟีเจอร์ | N/A | N/A | รายการ Ticket ติดตามสถานะ ดึงรายชื่อครูผู้ส่งจาก DB | **เชื่อมโยงสมบูรณ์** (ดึงรายชื่อครูผู้ส่งจาก `/api/admin/staff`) |
| **ศูนย์แอดมิน: จัดการบุคลากร (`/admin?tab=staff`)** | `teachers`, `audit_logs` | เพิ่มครูใหม่ผ่าน Modal | แก้ไขข้อมูลทั่วไป, สิทธิ์, Standings Inline, Educations Inline | ลบครูออกจากระบบ | ตารางบุคลากรพร้อมปุ่มแก้ไขดินสอ ลบถังขยะ และฟิลเตอร์ | **CRUD เต็มรูปแบบ 100%** (พร้อมบันทึก PDPA Audit Log) |
| **ศูนย์แอดมิน: คณะกรรมการ (`/admin?tab=board`)** | `board_members`, `teachers`, `audit_logs` | เพิ่มกรรมการใหม่ | แก้ไขกรรมการ, ปุ่ม 1-Click Sync ผอ., วันแต่งตั้ง/วันสิ้นสุด | ลบกรรมการ | ตารางกรรมการพร้อมป้าย "โดยตำแหน่ง" และสถานะวาระ | **CRUD เต็มรูปแบบ 100%** (พร้อม Guard ป้องกันดึงวันบรรจุครู) |
| **ศูนย์แอดมิน: ข้อมูลสถานศึกษา (`/admin?tab=school`)** | `school_info`, `audit_logs` | N/A (ตารางเดี่ยว) | แก้ไขชื่อโรงเรียน, ผอ., สังกัด, ชั้นเรียนที่เปิดสอน | N/A | ฟอร์มตั้งค่าข้อมูลสถานศึกษาแบบครบวงจร | **Update & Display 100%** (พร้อมบันทึก Audit Log) |
| **ศูนย์แอดมิน: ปฏิทินวันหยุด (`/admin?tab=fiscal`)** | `holidays`, `audit_logs` | เพิ่มวันหยุดราชการใหม่ | N/A | ลบวันหยุดราชการ | ตารางวันหยุดประจำปีและวันหยุด ครม. พิเศษ | **Add, Delete, Display 100%** (ส่งผลต่อการคำนวณวันลา) |
| **ศูนย์แอดมิน: บันทึกระบบ (`/admin?tab=audit`)** | `audit_logs` | บันทึกอัตโนมัติจากทุก API | N/A (Immutable Log ห้ามแก้ไข) | N/A (ป้องกันการลบประวัติ) | ตารางกิจกรรม ผู้กระทำ สิทธิ์ เวลา เป้าหมาย และรายละเอียด | **Display & Compliance 100%** (บันทึกอัตโนมัติทุกความเคลื่อนไหว) |
| **ศูนย์แอดมิน: ตั้งค่าระบบ (`/admin?tab=preferences`)** | `system_settings`, `audit_logs` | N/A | บันทึกธีม, โหมดปกปิดเลขบัตร (PDPA), ปีงบประมาณ | N/A | ฟอร์มตั้งค่า Preferences ทั่วระบบ | **Update & Display 100%** (จัดเก็บลง DB และ Local) |

---

## 4. ผลการตรวจสอบความสัมพันธ์และการทำงานแบบ Cross-Module (Data Integrity & Flow)

### 4.1 การเชื่อมโยงระหว่าง "ทะเบียนบุคลากร" กับ "คณะกรรมการสถานศึกษา"
- **การเชื่อมโยง:** เมื่อมีการเลือกตำแหน่ง `DIRECTOR_SEC` ในหน้าผู้ดูแลระบบ จะมีปุ่ม **"ซิงก์จากทะเบียนบุคลากร"**
- **ความถูกต้อง:** ค้นหาชื่อผู้อำนวยการและดึงวันแต่งตั้งดำรงตำแหน่ง ผอ. ล่าสุดจาก `standings` มาเติมใน `appointmentDate`
- **ระบบป้องกัน (System Guard):** ห้ามดึง `startDate` (วันบรรจุครูผู้ช่วย) มาใช้เป็นวันแต่งตั้งกรรมการสถานศึกษาโดยเด็ดขาด ผ่านการทดสอบเรียบร้อย
- **การแสดงผล:** หน้า `ViewSchoolBoard.tsx` แสดงป้าย `โดยตำแหน่ง` พร้อมคำนวณอายุงาน `formatServiceDuration` ได้ถูกต้องตามกฎหมาย และหยุดนับเมื่อมี `endDate`

### 4.2 การแก้ไขและลบแบบ Inline ในทะเบียนประวัติ & วิทยฐานะ และวุฒิการศึกษา
- **การเชื่อมโยง:** ในหน้าจัดการบุคลากร (`/admin`) แท็บประวัติวิทยฐานะ (`standings`) และวุฒิการศึกษา (`educations`)
- **การทำงาน:** แต่ละแถวมีปุ่มไอคอน `Pencil` (แก้ไข) และ `Trash2` (ลบ)
- **ความถูกต้อง:** เมื่อกดแก้ไข ข้อมูลเดิมจะถูกนำมาใส่ในฟอร์มเพื่อแก้ไขและกดบันทึก (`Check`) หรือยกเลิก (`X`) โดยไม่สูญเสียข้อมูลแถวอื่น และเมื่อกดบันทึกจะส่งเข้า `/api/admin/staff` เพื่อจัดเก็บลงฐานข้อมูลถาวร
- **ผลสะท้อนกลับ:** ข้อมูลที่อัปเดตจะส่งต่อไปยังหน้า `ViewRegStanding.tsx` (ทะเบียนวิทยฐานะ) ทันทีเนื่องจากปรับให้เชื่อมต่อ API แล้ว

### 4.3 การเชื่อมโยงระบบคำร้องขอลากับการอนุมัติและรายงาน
- **การส่งคำร้อง:** เมื่อครูยื่นคำร้องผ่าน `SmartLeaveForm` หรือ `ViewRetroLeave` ข้อมูลจะถูกจัดเก็บลงตาราง `leave_requests` สถานะเป็น `pending`
- **การแจ้งเตือนและการอนุมัติ:** หน้าภาพรวม (Dashboard) ของผู้อำนวยการจะแสดงรายการใน `PendingApprovalQueue` ทันที และเมื่อ ผอ. กด "อนุมัติ" หรือ "ไม่อนุมัติ" ระบบจะเปลี่ยนสถานะใน DB พร้อมบันทึก `AuditLog`
- **ผลต่อรายงาน สพฐ.:** วันลาที่ได้รับอนุมัติแล้วจะถูกนำไปรวมในสถิติ `ViewLeaveAnalytics` และ `ViewOfficialReports` เพื่อตรวจสอบเกณฑ์เลื่อนขั้นเงินเดือนตาม ว15/2561 โดยอัตโนมัติ

---

## 5. ผลการทดสอบเชิงเทคนิค (Technical Verification)

1. **TypeScript Type Safety:**
   - คำสั่ง: `npx tsc --noEmit`
   - ผลการทดสอบ: **0 Errors** (สมบูรณ์ 100%)
2. **Production Build Compilation:**
   - คำสั่ง: `npm run build`
   - ผลการทดสอบ: คอมไพล์สำเร็จสมบูรณ์ ทุกหน้าและทุก API Route ทำงานได้ปกติ
3. **Automated Test Suite:**
   - คำสั่ง: `npx tsx scripts/test-director-board-sync.ts`
   - ผลการทดสอบ: ผ่านครบทั้ง 3 เคส (Inline Standing Edit, Director 1-Click Sync Guard, Terminated Director Duration Stop)

---

## 6. สรุปผลการตรวจสอบและการส่งมอบ

- **ตารางข้อมูลทุกตาราง:** มีโครงสร้างฟิลด์ครบถ้วน ถูกต้องตามระเบียบข้าราชการครูและบุคลากรทางการศึกษา
- **การเชื่อมโยงข้อมูลทุกเมนู:** ทุกหน้าในระบบ (Dashboard, งานลา, ทะเบียนประวัติ, โครงสร้างองค์กร, ภาระงาน, ศูนย์แอดมิน) ได้รับการเชื่อมโยงผ่าน Dynamic API พร้อม Fallback ป้องกันระบบขัดข้อง
- **ฟังก์ชัน CRUD:** สามารถสร้าง บันทึก แก้ไข ลบ และแสดงผลได้อย่างสมบูรณ์ ปลอดภัย และมีการบันทึก Audit Trail ครบถ้วน
