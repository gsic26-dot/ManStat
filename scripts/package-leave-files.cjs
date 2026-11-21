const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const stagingDir = path.join(rootDir, '.temp_leave_bundle');

console.log('Packaging ManStat Overview & Leave Management Files...');

if (fs.existsSync(stagingDir)) {
  fs.rmSync(stagingDir, { recursive: true, force: true });
}
fs.mkdirSync(stagingDir, { recursive: true });

const files = [
  // หมวด 1: หมวดภาพรวม (Overview & Statistics)
  'src/app/page.tsx',
  'src/components/dashboard/PersonnelSummaryCards.tsx',
  'src/components/dashboard/LeaveProgressRings.tsx',
  'src/components/dashboard/PendingApprovalQueue.tsx',
  'src/components/dashboard/PromotionRadarCard.tsx',

  // หมวด 2: งานวันลา (Leave Management)
  'src/components/views/ViewLeaveSubmit.tsx',
  'src/components/leave/SmartLeaveForm.tsx',
  'src/components/views/ViewLeaveTracking.tsx',
  'src/components/views/ViewRetroLeave.tsx',
  'src/components/views/ViewLeaveReportsHub.tsx',
  'src/components/views/ViewLeaveAnalytics.tsx',
  'src/components/views/ViewLeaveRequests.tsx',
  'src/components/views/ViewLeaveHub.tsx',
  'src/components/views/ViewOfficialReports.tsx',
  'src/components/print/OfficialLeavePrintView.tsx',
  'src/app/leave/print/[id]/page.tsx',
  'src/app/verify/leave/[docNo]/page.tsx',
  'src/hooks/useLeaveRealtime.ts',

  // กฎระเบียบวันลาและข้อบังคับราชการ (Regulations Engine)
  'src/lib/regulations/leave-calculator.ts',
  'src/lib/regulations/leaveTypes.ts',
  'src/lib/regulations/fiscal-and-retirement.ts',
  'src/lib/regulations/thai-numerals.ts',
  'src/lib/regulations/__tests__/regulations.test.ts',

  // API Backend & Database
  'src/app/api/admin/leave/route.ts',
  'data/manstat_db.json',
  'src/lib/db/serverDb.ts',
  'src/lib/data/schoolData.ts'
];

for (const rel of files) {
  const srcPath = path.join(rootDir, rel);
  const destPath = path.join(stagingDir, rel);
  if (!fs.existsSync(srcPath)) {
    console.warn(`File not found: ${srcPath}`);
    continue;
  }
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.copyFileSync(srcPath, destPath);
  console.log(`Copied: ${rel}`);
}

const readmeContent = `# เอกสารและโครงสร้างไฟล์หมวดภาพรวม และหมวดที่ 2 งานวันลา
## โครงการ ManStat (โรงเรียนชุมชนบ้านตะขบ)

ไฟล์ชุดนี้รวบรวมโค้ด ฐานข้อมูล เอนจินกฎหมาย และคอมโพเนนต์ทั้งหมดที่เกี่ยวข้องกับ **หมวด 1: ภาพรวมสถิติและภาพรวม** และ **หมวด 2: งานวันลา** ครบทั้ง 4 ฟังก์ชันหลักตามระเบียบสำนักนายกรัฐมนตรีฯ และมาตรฐาน สพฐ.:

---

### 1. หมวด 1: สถิติและภาพรวม (Overview & Dashboard)
- **\`src/app/page.tsx\`**: หน้าจอแดชบอร์ดหลักของระบบ เชื่อมโยงระบบสถิติ, เมนูนำทาง, การดึงข้อมูลอัตโนมัติ และการสลับ View
- **\`src/components/dashboard/PersonnelSummaryCards.tsx\`**: การ์ดสรุปยอดบุคลากร (ยอดรวม, ปฏิบัติหน้าที่วันนี้, อยู่ระหว่างลา, เกษียณอายุราชการปีนี้)
- **\`src/components/dashboard/LeaveProgressRings.tsx\`**: วงแหวนแสดงสัดส่วนวันลาสะสม 3 ประเภทหลัก (ลาป่วย, ลากิจ, ลาพักผ่อน)
- **\`src/components/dashboard/PendingApprovalQueue.tsx\`**: คิวแสดงรายการคำขอลาที่รอการตรวจสอบและอนุมัติจากผู้บริหาร
- **\`src/components/dashboard/PromotionRadarCard.tsx\`**: การ์ดเรดาร์ประเมินความเสี่ยงสิทธิ์การเลื่อนขั้นเงินเดือนรอบปัจจุบัน (ก.ค.ศ. ว15/2561: ไม่เกิน 6 ครั้ง หรือ 23 วัน)

---

### 2. หมวด 2: งานวันลา (Leave Management)
1. **ยื่นคำร้องขอลา (Submit Leave Request):**
   - **\`src/components/views/ViewLeaveSubmit.tsx\`**: หน้าจอสำหรับบุคลากรยื่นคำร้องขอลา ตรวจสอบโควตาคงเหลือ และบันทึกคำขอ
   - **\`src/components/leave/SmartLeaveForm.tsx\`**: ฟอร์มอัจฉริยะ ตรวจสอบเงื่อนไขวันลาแบบเรียลไทม์ การบังคับแนบใบรับรองแพทย์ (ลาป่วย >= 3 วัน / >= 30 วัน), การคำนวณวันทำการอัตโนมัติ (หักเสาร์-อาทิตย์และวันหยุดราชการ)
2. **ติดตามและประวัติการลา (Track Leave Status):**
   - **\`src/components/views/ViewLeaveTracking.tsx\`**: หน้าจอติดตามสถานะคำขอลา (รอตรวจสอบ, อนุมัติ, ไม่อนุมัติ, ยกเลิก) แสดง Timeline ชัดเจน และมีปุ่มเปิดดู/พิมพ์ใบลาทางการ
   - **\`src/components/views/ViewLeaveRequests.tsx\`**: ศูนย์รวมคำร้องขอลาและการจัดการคำขอ
3. **บันทึกการลาย้อนหลัง (Retroactive Leave):**
   - **\`src/components/views/ViewRetroLeave.tsx\`**: หน้าจอสำหรับบันทึกการลาย้อนหลังสำหรับกรณีเหตุสุดวิสัยหรือคำขอที่ได้รับอนุญาตแล้วในอดีต บันทึกลงฐานข้อมูลพร้อมหมายเหตุประกอบ
4. **รายงานและสถิติวันลา (Leave Reports & Analytics):**
   - **\`src/components/views/ViewLeaveReportsHub.tsx\`**: หน้ารายงานสรุปสถิติวันลาของบุคลากรรายบุคคลและรายกลุ่มงาน/ฝ่าย
   - **\`src/components/views/ViewLeaveAnalytics.tsx\`**: แดชบอร์ดวิเคราะห์สถิติวันลาเชิงลึก สัดส่วนการลาแต่ละประเภท และแนวโน้มสถิติ
   - **\`src/components/views/ViewOfficialReports.tsx\`**: รายงานสถิติวันลาทางการสำหรับจัดพิมพ์ส่งเขตพื้นที่ฯ
5. **การพิมพ์ใบลาและตรวจสอบเอกสาร (Print & Verification):**
   - **\`src/components/print/OfficialLeavePrintView.tsx\`**: แบบฟอร์มใบลาตามแบบราชการไทย (ระเบียบสำนักนายกฯ 2555) แสดงข้อความ วันที่ เลขไทย สถิติการลาเดิม และช่องลงนามครบถ้วน
   - **\`src/app/leave/print/[id]/page.tsx\`**: หน้ารองรับการสั่งพิมพ์ใบลา (Print Preview) รองรับการ Export เป็น PDF
   - **\`src/app/verify/leave/[docNo]/page.tsx\`**: ระบบตรวจสอบความถูกต้องของใบลาผ่าน QR Code ตรวจสอบความถูกต้องตามมาตรฐานความปลอดภัย
   - **\`src/hooks/useLeaveRealtime.ts\`**: Hook ติดตามการยื่นคำร้องและส่งการแจ้งเตือน Toast เมื่อมีคำขอใหม่

---

### 3. กฎระเบียบวันลาและมาตรฐานราชการ (Regulations Engine)
- **\`src/lib/regulations/leave-calculator.ts\`**: เอนจินคำนวณวันลาจริง หักวันหยุดราชการและเสาร์-อาทิตย์, วันลาต่อเนื่อง (ลาคลอด), การลาครึ่งวัน (0.5 วัน), และกฎ **0 วัน** สำหรับการขออนุญาตออกนอกสถานศึกษา (<= 3 ชม.) และการไปราชการ
- **\`src/lib/regulations/leaveTypes.ts\`**: มาตรฐานประเภทวันลา 13 ประเภทของ สพฐ. แบ่งเป็น 2 กลุ่ม พร้อมโควตาวันลาและเงื่อนไขการหักวัน
- **\`src/lib/regulations/fiscal-and-retirement.ts\`**: กฎการแบ่งปีงบประมาณและรอบการประเมิน (รอบ 1: 1 ต.ค. - 31 มี.ค., รอบ 2: 1 เม.ย. - 30 ก.ย.) และการคำนวณวันเกษียณอายุราชการ
- **\`src/lib/regulations/thai-numerals.ts\`**: ฟังก์ชันแปลงเลขอารบิกเป็นเลขไทยสำหรับใช้ในแบบฟอร์มทางราชการ
- **\`src/lib/regulations/__tests__/regulations.test.ts\`**: ชุดทดสอบ Unit Test 29 ข้อ ยืนยันความถูกต้องตามกฎหมายและระเบียบราชการ 100%

---

### 4. API Backend และฐานข้อมูล (API & Database)
- **\`src/app/api/admin/leave/route.ts\`**: API สำหรับอ่าน (\`GET\`), สร้าง/อนุมัติ/ปฏิเสธ (\`POST\`), และลบคำร้องขอลา พร้อมระบบบันทึก PDPA Audit Log
- **\`data/manstat_db.json\`**: ฐานข้อมูลจริง จัดเก็บตาราง \`leaveRequests\`, ข้อมูลบุคลากร \`teachers\`, และวันหยุดราชการ \`holidays\`
- **\`src/lib/db/serverDb.ts\`**: เอนจินฐานข้อมูล Atomic Save & Load และบันทึกประวัติความปลอดภัย PDPA
- **\`src/lib/data/schoolData.ts\`**: Interface \`LeaveRequestRecord\` และชุดข้อมูลคำร้องขอลาตั้งต้น
`;

fs.writeFileSync(path.join(stagingDir, 'README.md'), readmeContent, 'utf8');

const onedriveDesktop = path.join(process.env.USERPROFILE, 'OneDrive', 'Desktop');
const localDesktop = path.join(process.env.USERPROFILE, 'Desktop');
const zipName = 'manstat_overview_and_leave_files.zip';

console.log('Compressing files into zip archive...');
const tempZipPath = path.join(rootDir, zipName);
if (fs.existsSync(tempZipPath)) fs.unlinkSync(tempZipPath);

try {
  execSync(
    `powershell -NoProfile -Command "Compress-Archive -Path '${stagingDir}\\*' -DestinationPath '${tempZipPath}' -Force"`,
    { stdio: 'inherit' }
  );
  console.log(`Created ZIP successfully: ${tempZipPath}`);

  if (fs.existsSync(onedriveDesktop)) {
    const dest1 = path.join(onedriveDesktop, zipName);
    fs.copyFileSync(tempZipPath, dest1);
    console.log(`Copied to OneDrive Desktop: ${dest1}`);
  }

  if (fs.existsSync(localDesktop)) {
    const dest2 = path.join(localDesktop, zipName);
    fs.copyFileSync(tempZipPath, dest2);
    console.log(`Copied to Local Desktop: ${dest2}`);
  }

  const stats = fs.statSync(tempZipPath);
  console.log(`Archive size: ${stats.size} bytes`);
} catch (err) {
  console.error('Error compressing archive:', err);
} finally {
  fs.rmSync(stagingDir, { recursive: true, force: true });
}
