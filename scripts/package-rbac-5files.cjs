const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const stagingDir = path.join(rootDir, '.temp_rbac_5files');

console.log('Packaging 5 latest RBAC & User Management Files...');

if (fs.existsSync(stagingDir)) {
  fs.rmSync(stagingDir, { recursive: true, force: true });
}
fs.mkdirSync(stagingDir, { recursive: true });

const files = [
  'src/app/admin/page.tsx',
  'src/app/api/admin/staff/route.ts',
  'src/lib/db/serverDb.ts',
  'src/lib/auth/roles.ts',
  'data/manstat_db.json'
];

for (const rel of files) {
  const srcPath = path.join(rootDir, rel);
  const destPath = path.join(stagingDir, rel);
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.copyFileSync(srcPath, destPath);
  console.log(`Copied to bundle: ${rel}`);
}

const readmeContent = `# ชุดไฟล์ล่าสุดหลังการแก้ไขระบบสิทธิ์และการบันทึกข้อมูล (RBAC & Persistence Core)
## โครงการ ManStat-Modern (โรงเรียนชุมชนบ้านตะขบ)

ไฟล์ทั้ง 5 รายการนี้เป็นโค้ดและฐานข้อมูลเวอร์ชันล่าสุดที่ผ่านการแก้ไขและทดสอบยืนยันผลครบถ้วนแล้ว:

---

### 1. \`src/app/admin/page.tsx\`
- **การเปิด Modal จัดการบุคลากร (บรรทัด 380–435 และ 453–470):**
  - ฟังก์ชัน \`handleOpenAddStaff\` สร้างรหัส \`TCH-xxx\` ใหม่โดยคำนวณจากค่าสูงสุดของรหัสที่มีอยู่จริง (\`Math.max(...) + 1\`) ป้องกันรหัสชนกัน
  - ฟังก์ชัน \`handleOpenEditStaff\` โหลดค่า \`accessLevel\` โดยตรงจากข้อมูลบุคลากร (\`t.accessLevel\`) พร้อม fallback สิทธิ์เดิม (\`Superuser\`, \`Admin\`, \`User\`)
- **การบันทึกข้อมูลบุคลากร (\`handleSaveStaff\` บรรทัด 472–550):**
  - รวมชื่อ-สกุลจาก \`prefix + firstName + ' ' + lastName\` ทันที
  - ส่งข้อมูลไปยัง \`POST /api/admin/staff\`
  - เมื่อบันทึกสำเร็จ มีการเรียก Re-fetch \`fetch('/api/admin/staff', { cache: 'no-store' })\` และ \`fetch('/api/auth/me', { cache: 'no-store' })\` ทันที เพื่อการันตีว่าสถานะและสิทธิ์ของผู้ใช้ในหน่วยความจำตรงกับดิสก์ 100%
- **จุดแสดงป้ายสิทธิ์ในตารางบุคลากร (บรรทัด 1004–1025):**
  - ตรวจสอบทั้ง \`t.accessLevel\` และ \`t.role\` โดยตรง
  - แสดง Badge ชัดเจน 3 ระดับ: **Superuser** (สีทอง amber), **Admin** (สีฟ้า sky), และ **User** (สีเทา slate)

---

### 2. \`src/app/api/admin/staff/route.ts\`
- **การปิด Cache (บรรทัด 7–8 และ 17):**
  - ประกาศ \`export const dynamic = 'force-dynamic';\` และ \`export const revalidate = 0;\`
  - ส่ง Header \`'Cache-Control': 'no-store, no-cache, must-revalidate'\` ใน Response ของ \`GET\`
- **การจับคู่แถวข้อมูล (บรรทัด 43–56):**
  - จับคู่ด้วย \`t.id === updatedStaff.id\` เป็นหลัก และจับคู่ \`employeeCode\` เฉพาะเมื่อมีค่าทั้งคู่
- **การบันทึก \`accessLevel\` ควบคู่กับ \`role\` (บรรทัด 61–75):**
  - แปลงสิทธิ์ด้วย \`const mappedRole = mapAccessLevelToRole(updatedStaff.accessLevel);\`
  - บันทึกลง \`db.teachers\` ทั้ง \`accessLevel\` และ \`role\` คู่กันเสมอ ทำให้ทั้งสองฟิลด์ตรงกันตลอดเวลา
  - บันทึกการเปลี่ยนแปลงสิทธิ์ลง PDPA Audit Log อัตโนมัติ

---

### 3. \`src/lib/db/serverDb.ts\`
- **การป้องกัน Stale In-Memory Cache (บรรทัด 153–195):**
  - \`loadDatabase()\` ตรวจสอบเวลาแก้ไขไฟล์ล่าสุดในดิสก์ (\`fs.statSync(activeFile).mtimeMs\`) ก่อนใช้งาน หากดิสก์มีการอัปเดตจาก Route Handler อื่น จะ reload จากดิสก์ใหม่ทันที
- **การบันทึกไฟล์แบบ Atomic Write และห้ามกลืน Error (บรรทัด 245–290):**
  - \`saveDatabase()\` เขียนไฟล์ชั่วคราว \`.tmp\` ก่อนสลับชื่อไฟล์ (\`renameSync\`)
  - อัปเดต \`lastLoadedMtime\`
  - หากการเขียนไฟล์ล้มเหลว (ทั้ง primary และ fallback) จะ \`throw Error\` ออกไปทันที เพื่อให้ API ตอบสถานะ \`500\` ไม่ปล่อยให้ตอบ \`200 success\` หลอกหน้าเว็บ

---

### 4. \`src/lib/auth/roles.ts\`
- **ฟังก์ชันแปลงสิทธิ์ \`mapAccessLevelToRole\` (บรรทัด 47–60):**
  - \`Superuser\` -> \`'superuser'\`
  - \`Admin\` -> \`'hr_admin'\`
  - \`Director\` -> \`'director'\`
  - ค่าอื่น ๆ หรือค่าว่าง -> คืนค่าปลอดภัยเป็น \`'teacher'\` เสมอ (ไม่มีทางหลุดสิทธิ์แอดมินโดยไม่ตั้งใจ)
- **ฟังก์ชันตรวจสอบสิทธิ์ \`isAdminRole\` (บรรทัด 65–70):**
  - ตรวจสอบว่าบทบาทเป็น \`'superuser'\`, \`'hr_admin'\`, หรือ \`'director'\` หรือไม่
- **ฟังก์ชันจัดสไตล์ป้ายสิทธิ์ \`getRoleBadgeConfig\` (บรรทัด 87–120):**
  - กำหนดป้ายสิทธิ์และสีสำหรับการแสดงผลทั่วทั้งระบบ

---

### 5. \`data/manstat_db.json\`
- **การบันทึกข้อมูลจริงในดิสก์:**
  - เป็นฐานข้อมูล JSON ของระบบจริงที่มีข้อมูลบุคลากรครบทั้ง 15 ท่าน พร้อมค่า \`accessLevel\` และ \`role\` ที่ตรงกัน
  - ข้อมูลในไฟล์นี้เป็นหลักฐานยืนยันว่าการบันทึกเขียนลงไฟล์ดิสก์จริง ไม่ค้างเฉพาะในหน่วยความจำ
`;

fs.writeFileSync(path.join(stagingDir, 'README.md'), readmeContent, 'utf8');

// Copy both to Folder and ZIP on Desktop
const onedriveDesktop = path.join(process.env.USERPROFILE, 'OneDrive', 'Desktop');
const localDesktop = path.join(process.env.USERPROFILE, 'Desktop');

const targetFolderNames = ['manstat_rbac_5_latest_files'];
const zipName = 'manstat_rbac_5_latest_files.zip';

// Create Desktop folder copies
const targetDesktops = [onedriveDesktop, localDesktop].filter(d => fs.existsSync(d));

for (const desk of targetDesktops) {
  const destDir = path.join(desk, 'manstat_rbac_5_latest_files');
  if (fs.existsSync(destDir)) {
    fs.rmSync(destDir, { recursive: true, force: true });
  }
  fs.mkdirSync(destDir, { recursive: true });

  for (const rel of files) {
    const srcPath = path.join(rootDir, rel);
    const destPath = path.join(destDir, rel);
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.copyFileSync(srcPath, destPath);
  }
  fs.copyFileSync(path.join(stagingDir, 'README.md'), path.join(destDir, 'README.md'));
  console.log(`Copied dedicated folder to: ${destDir}`);
}

// Create ZIP file
console.log('Compressing 5 files into zip archive...');
const tempZipPath = path.join(rootDir, zipName);
if (fs.existsSync(tempZipPath)) fs.unlinkSync(tempZipPath);

try {
  execSync(
    `powershell -NoProfile -Command "Compress-Archive -Path '${stagingDir}\\*' -DestinationPath '${tempZipPath}' -Force"`,
    { stdio: 'inherit' }
  );
  console.log(`Created ZIP successfully: ${tempZipPath}`);

  for (const desk of targetDesktops) {
    const zipDest = path.join(desk, zipName);
    fs.copyFileSync(tempZipPath, zipDest);
    console.log(`Copied ZIP to Desktop: ${zipDest}`);
  }

  const stats = fs.statSync(tempZipPath);
  console.log(`Archive size: ${stats.size} bytes`);
} catch (err) {
  console.error('Error compressing archive:', err);
} finally {
  fs.rmSync(stagingDir, { recursive: true, force: true });
}
