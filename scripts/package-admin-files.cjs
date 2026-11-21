const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const stagingDir = path.join(rootDir, '.temp_admin_bundle');

console.log('Packaging ManStat Admin Center Files...');

if (fs.existsSync(stagingDir)) {
  fs.rmSync(stagingDir, { recursive: true, force: true });
}
fs.mkdirSync(stagingDir, { recursive: true });

const files = [
  // 1. คณะกรรมการสถานศึกษา (School Board)
  'src/app/api/admin/board/route.ts',
  'src/components/views/ViewSchoolBoard.tsx',

  // 2. ข้อมูลสถานศึกษา (School Profile / Info)
  'src/app/api/admin/school/route.ts',

  // 3. ปีงบประมาณและวันหยุด (Fiscal Year & Holidays)
  'src/app/api/admin/holidays/route.ts',
  'src/lib/regulations/fiscal-and-retirement.ts',

  // 4. PDPA บันทึกประวัติการเข้าถึงข้อมูลอ่อนไหว และตั้งค่าระบบแสดงผล (Audit & Settings)
  'src/app/api/admin/audit/route.ts',
  'src/app/api/admin/settings/route.ts',
  'src/components/settings/SystemSettingsTab.tsx',
  'src/components/settings/UserSettingsModal.tsx',
  'src/context/UserSettingsContext.tsx',

  // Core Admin Center, Database & Security
  'src/app/admin/page.tsx',
  'src/lib/db/serverDb.ts',
  'data/manstat_db.json',
  'src/lib/data/schoolData.ts',
  'src/lib/auth/serverAuth.ts',
  'src/lib/auth/roles.ts',
  'src/middleware.ts'
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

const readmeContent = `# เอกสารและโครงสร้างไฟล์ศูนย์ผู้ดูแลระบบ (Admin Center Files)
## โครงการ ManStat (โรงเรียนชุมชนบ้านตะขบ)

ไฟล์ชุดนี้รวบรวมโค้ด ฐานข้อมูล และคอมโพเนนต์ทั้งหมดที่เกี่ยวข้องกับ **ศูนย์ผู้ดูแลระบบ (Admin Center)** ใน 4 ฟังก์ชันหลักตามที่ร้องขอ:

---

### 1. หมวดคณะกรรมการสถานศึกษา (School Board)
- **\`src/app/api/admin/board/route.ts\`**: API สำหรับอ่าน (\`GET\`) และบันทึก/แก้ไข/ลบ (\`POST\`, \`DELETE\`) รายชื่อคณะกรรมการสถานศึกษาขั้นพื้นฐาน พร้อมระบบตรวจสอบสิทธิ์ Admin และบันทึก PDPA Audit Log
- **\`src/components/views/ViewSchoolBoard.tsx\`**: หน้าจอแสดงผลคณะกรรมการสถานศึกษาขั้นพื้นฐาน โรงเรียนชุมชนบ้านตะขบ จัดเรียงตามลำดับตำแหน่งตามกฎกระทรวง พ.ศ. 2546 (รวม 9 ท่าน) ทั้งแบบตารางและแบบการ์ด

---

### 2. หมวดข้อมูลสถานศึกษา (School Information & Profile)
- **\`src/app/api/admin/school/route.ts\`**: API สำหรับอ่านและบันทึกข้อมูลโรงเรียน (ชื่อโรงเรียน, สังกัด, รหัส 10 หลัก, รหัส SMIS, ที่อยู่, เบอร์โทรศัพท์, ข้อมูลผู้บริหาร) พร้อมระบบ Audit Log การแก้ไขข้อมูลสถานศึกษา

---

### 3. หมวดปีงบประมาณและวันหยุดราชการ (Fiscal Year & Holidays)
- **\`src/app/api/admin/holidays/route.ts\`**: API สำหรับจัดการวันหยุดราชการประจำปี วันหยุดชดเชย และวันหยุดเฉพาะสถานศึกษา รวมทั้งการกำหนดปีงบประมาณและรอบการประเมิน
- **\`src/lib/regulations/fiscal-and-retirement.ts\`**: โมดูลคำนวณปีงบประมาณตามระเบียบ ก.ค.ศ. ว15/2561 และคำนวณอายุเกษียณราชการตาม พ.ร.บ. บำเหน็จบำนาญข้าราชการ พ.ศ. 2494 ม.19

---

### 4. หมวด PDPA บันทึกประวัติการเข้าถึงข้อมูลอ่อนไหว และตั้งค่าระบบแสดงผล (Audit Logs & Display Settings)
- **\`src/app/api/admin/audit/route.ts\`**: API ดึงประวัติการเข้าถึงและการแก้ไขข้อมูลสำคัญ (Audit Trail) ตามมาตรฐาน PDPA แสดง Actor, Action, Target, IP Address และ Timestamp
- **\`src/app/api/admin/settings/route.ts\`**: API บันทึกและอ่านค่าการตั้งค่าระบบส่วนกลาง
- **\`src/components/settings/SystemSettingsTab.tsx\`**: แท็บสำหรับผู้ดูแลระบบในการปรับแต่ง Theme Mode, Preferred View, Compact Mode, และการซิงก์ฐานข้อมูล
- **\`src/components/settings/UserSettingsModal.tsx\`**: Modal ตั้งค่าการใช้งานส่วนบุคคล และการเปิด/ปิด Masking เลขบัตรประชาชน 13 หลัก (PDPA Protection)
- **\`src/context/UserSettingsContext.tsx\`**: Context จัดการ State ของการตั้งค่าระบบ การเข้ารหัสการแสดงผล และการเชื่อมต่อ LocalStorage

---

### 5. ไฟล์ศูนย์กลางระบบและฐานข้อมูลที่เชื่อมโยง (Core Admin Center & DB Engine)
- **\`src/app/admin/page.tsx\`**: หน้าจอแดชบอร์ดหลักของศูนย์ผู้ดูแลระบบ (Admin Center) รวมแท็บควบคุมทั้ง 5 แท็บ (บุคลากร, คณะกรรมการ, ข้อมูลโรงเรียน, วันหยุด, และ PDPA Audit)
- **\`src/lib/db/serverDb.ts\`**: เอนจินฐานข้อมูลหลัก ควบคุมการบันทึกแบบ Atomic Write, ป้องกัน Stale In-Memory Cache, จัดเก็บ Audit Log (\`recordAuditLog\`), และรองรับ Serverless Fallback
- **\`data/manstat_db.json\`**: ฐานข้อมูล JSON จริงของระบบ ประกอบด้วยข้อมูลครบทุกหมวด (\`boardMembers\`, \`schoolInfo\`, \`holidays\`, \`auditLogs\`, \`settings\`, \`teachers\`)
- **\`src/lib/data/schoolData.ts\`**: Interface Schema และข้อมูลเริ่มต้น (\`INITIAL_BOARD_MEMBERS\`, \`INITIAL_SCHOOL_INFO\`, \`BOARD_STATUTORY_ORDER\`)
- **\`src/lib/auth/serverAuth.ts\`**: ระบบตรวจจับเซสชันและ Guard ป้องกัน API (\`verifyAdminSession\`)
- **\`src/lib/auth/roles.ts\`**: มาตรฐานการแปลงสิทธิ์และบทบาท RBAC (\`isAdminRole\`, \`mapAccessLevelToRole\`)
- **\`src/middleware.ts\`**: Edge Middleware ตรวจสอบสิทธิ์การเข้าถึงโฟลเดอร์ \`/admin/*\`
`;

fs.writeFileSync(path.join(stagingDir, 'README.md'), readmeContent, 'utf8');

const onedriveDesktop = path.join(process.env.USERPROFILE, 'OneDrive', 'Desktop');
const localDesktop = path.join(process.env.USERPROFILE, 'Desktop');
const zipName = 'manstat_admin_center_files.zip';

console.log('Compressing files into zip archive...');
const tempZipPath = path.join(rootDir, zipName);
if (fs.existsSync(tempZipPath)) fs.unlinkSync(tempZipPath);

try {
  execSync(
    `powershell -NoProfile -Command "Compress-Archive -Path '${stagingDir}\\*' -DestinationPath '${tempZipPath}' -Force"`,
    { stdio: 'inherit' }
  );
  console.log(`Created ZIP successfully: ${tempZipPath}`);

  // Copy to OneDrive Desktop if exists
  if (fs.existsSync(onedriveDesktop)) {
    const dest1 = path.join(onedriveDesktop, zipName);
    fs.copyFileSync(tempZipPath, dest1);
    console.log(`Copied to OneDrive Desktop: ${dest1}`);
  }

  // Copy to Local Desktop if exists
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
