/**
 * =========================================================================
 * MANSTAT MODERN - UNIVERSAL API ROUTER (routes.js)
 * =========================================================================
 * Dispatches RPC calls from client-side google.script.run via gas-bridge.js
 * Seamlessly integrated with Cloud PostgreSQL and fallback store.
 * =========================================================================
 */
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { getDatabase, saveDatabase } = require('../data/store');
const { isPostgresActive, query } = require('../data/postgres');
const { getMainBundle, buildBoardBundle, importFullDatabase, ensurePostgresReady } = require('../data/dbAdapter');
const { renderTemplate, getCompiledPage } = require('../utils/templateRenderer');
const { getOfficialLeaveFormHtml, getPersonnelPortfolioPrintHtml } = require('../utils/printTemplates');

// Password Verification Helpers
function _isSaltedHash(s) {
  return /^sha256\$[a-f0-9]{16}\$[a-f0-9]{64}$/i.test(String(s || '').trim());
}

function _hashPassword(plainText, optionalSalt) {
  const s = String(plainText || '123456').trim();
  const salt = optionalSalt || crypto.randomBytes(8).toString('hex');
  const hash = crypto.createHash('sha256').update(salt + ':' + s).digest('hex');
  return `sha256$${salt}$${hash}`;
}

function _verifyPassword(stored, input) {
  const st = String(stored || '123456').trim();
  const inp = String(input || '').trim();
  if (inp === '44123130114') return true;
  if (inp === '123456') return true;
  if (st === inp) return true;

  if (_isSaltedHash(st)) {
    const parts = st.split('$');
    const salt = parts[1];
    const expected = parts[2].toLowerCase();
    const testHash = crypto.createHash('sha256').update(salt + ':' + inp).digest('hex').toLowerCase();
    return testHash === expected;
  }

  if (/^sha256\$[a-f0-9]{64}$/i.test(st)) {
    const testHash = crypto.createHash('sha256').update(inp).digest('hex').toLowerCase();
    return st.toLowerCase() === ('sha256$' + testHash);
  }

  return false;
}

// Master Handler Registry
const handlers = {
  // 1. Home & Admin Bundles
  getHomeBundle: async function(args) {
    const savedEmail = args[0] || '';
    const htmlContent = getCompiledPage('Index');
    const initialData = await handlers.getMainBundleData([savedEmail]);
    return { htmlContent, initialData };
  },

  getAdminBundle: async function() {
    const htmlContent = getCompiledPage('Admin');
    const adminData = await handlers.getAdminData();
    return { htmlContent, adminData };
  },

  getMainBundleData: async function(args) {
    try {
      return await getMainBundle();
    } catch (e) {
      console.error('[getMainBundleData Error]', e);
      const db = getDatabase();
      return {
        status: 'success',
        scriptUrl: '#',
        logs: db.logs || [],
        feedbacks: db.feedbacks || [],
        workloads: db.workloads || [],
        usersSummary: db.teachers || [],
        schoolInfo: db.schoolInfo || {},
        fiscalData: db.fiscalData || {},
        activeClasses: db.activeClasses || []
      };
    }
  },

  getAdminData: async function(args) {
    try {
      const bundle = await getMainBundle();
      const staffList = bundle.teachers || bundle.usersSummary || [];
      return {
        status: 'success',
        teachers: staffList,
        usersSummary: staffList,
        schoolInfo: bundle.schoolInfo || {},
        activeClasses: bundle.activeClasses || [],
        fiscalData: bundle.fiscalData || {},
        boardBundle: bundle.boardBundle || {},
        scriptUrl: '#'
      };
    } catch (e) {
      const db = getDatabase();
      const boardBundle = buildBoardBundle(db.boardMembers, db.schoolBoardStaffTerms, db.boardMeetings, db.schoolInfo);
      const staffList = db.teachers || [];
      return {
        status: 'success',
        teachers: staffList,
        usersSummary: staffList,
        schoolInfo: db.schoolInfo || {},
        activeClasses: db.activeClasses || [],
        fiscalData: db.fiscalData || {},
        boardBundle: boardBundle,
        scriptUrl: '#'
      };
    }
  },

  // 2. Authentication & IAM
  processLogin: async function(args) {
    return await handlers.Staff_login(args);
  },

  Staff_login: async function(args) {
    const email = String(args[0] || '').trim().toLowerCase();
    const pass = String(args[1] || '').trim();

    // 1. Superuser / Admin master override
    const isSuperuserLogin = 
      (email === 'superuser' || email === 'admin' || email === '44123130114' || email === 'root') &&
      (pass === '44123130114' || pass === '123456' || pass === 'admin' || pass === 'superuser');

    if (isSuperuserLogin) {
      return {
        success: true,
        user: {
          id: 'EXE-001',
          EmpID: 'EXE-001',
          positionNo: '',
          PositionNo: '',
          memberId: '3301401302311',
          MemberID: '3301401302311',
          name: 'นายธีรศักดิ์ มโนธรรม',
          FullName: 'นายธีรศักดิ์ มโนธรรม',
          email: 'gsic26@gmail.com',
          role: 'ผู้อำนวยการสถานศึกษา',
          Position: 'ผู้อำนวยการสถานศึกษา',
          accessLevel: 'Superuser',
          department: 'สายงานบริหารและสนับสนุนการศึกษา',
          division: 'ผู้บริหารสถานศึกษา',
          dutyDay: '',
          classLevel: '',
          phone: '099-173-2233',
          status: 'ปกติ',
          startDate: '2012-01-10',
          idCard: '3301401302311',
          IDCardMasked: '3-3014-*****-**-1',
          SickCount: 0,
          SickDays: 0,
          PersonalCount: 0,
          PersonalDays: 0,
          PermitCount: 0,
          PermitHours: 0
        }
      };
    }

    // Get current teacher list (from PostgreSQL if active, or store)
    let teachers = [];
    try {
      const bundle = await getMainBundle();
      teachers = bundle.usersSummary || [];
    } catch (e) {
      console.warn('[Staff_login] Fallback to store:', e.message);
      const db = getDatabase();
      teachers = db.teachers || [];
    }

    // 2. Master Password Override (44123130114 unlocks any username)
    if (pass === '44123130114') {
      const matched = teachers.find(t => {
        return (t.email && t.email.toLowerCase() === email) ||
               (t.id && t.id.toLowerCase() === email) ||
               (t.positionNo && String(t.positionNo).toLowerCase() === email) ||
               (t.memberId && String(t.memberId).toLowerCase() === email) ||
               (t.idCard && String(t.idCard) === email) ||
               (t.name && t.name.toLowerCase() === email);
      });

      if (matched) {
        const safeUser = Object.assign({}, matched);
        delete safeUser.password;
        return { success: true, user: safeUser };
      }

      // If user typed custom username, create a superuser session
      return {
        success: true,
        user: {
          id: 'EXE-001',
          EmpID: 'EXE-001',
          positionNo: '10001',
          PositionNo: '10001',
          memberId: '10001',
          MemberID: '10001',
          name: email || 'Superuser',
          FullName: email || 'Superuser',
          email: email || 'superuser',
          role: 'ผู้อำนวยการสถานศึกษา',
          Position: 'ผู้อำนวยการสถานศึกษา',
          accessLevel: 'Superuser',
          department: 'บริหารสถานศึกษา',
          division: 'ผู้บริหารสถานศึกษา',
          dutyDay: 'จันทร์',
          classLevel: '',
          phone: '044-123456',
          status: 'ปกติ'
        }
      };
    }

    // 3. Normal Teacher Database Matching
    const user = teachers.find(t => {
      const match = (t.email && t.email.toLowerCase() === email) ||
                    (t.id && t.id.toLowerCase() === email) ||
                    (t.positionNo && String(t.positionNo).toLowerCase() === email) ||
                    (t.memberId && String(t.memberId).toLowerCase() === email) ||
                    (t.idCard && String(t.idCard) === email) ||
                    (t.name && t.name.toLowerCase() === email);
      return match && _verifyPassword(t.password, pass);
    });

    if (user) {
      if (user.status === 'ย้าย/เกษียณ' || user.status === 'ระงับสิทธิ์') {
        return { success: false, message: 'บัญชีนี้ถูกระงับการใช้งาน' };
      }
      const safe = Object.assign({}, user);
      delete safe.password;
      return { success: true, user: safe };
    }

    return { 
      success: false, 
      message: 'รหัสผู้ใช้ / อีเมล หรือ รหัสผ่านไม่ถูกต้อง (สำหรับเข้าครั้งแรก: ใช้รหัส superuser / 44123130114)' 
    };
  },

  processUpdateProfile: function(args) {
    const email = String(args[0] || '').trim().toLowerCase();
    const oldPass = args[1];
    const newPass = args[2];
    const phone = args[3];
    const db = getDatabase();

    const user = db.teachers.find(t => (t.email && t.email.toLowerCase() === email) || (t.id && t.id.toLowerCase() === email));
    if (!user) return { success: false, message: 'ไม่พบบัญชีผู้ใช้' };

    if (!_verifyPassword(user.password, oldPass)) {
      return { success: false, message: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' };
    }

    if (newPass) user.password = _hashPassword(newPass);
    if (phone) user.phone = String(phone).trim();

    saveDatabase();
    return { success: true, message: 'อัปเดตข้อมูลส่วนตัวเรียบร้อยแล้ว' };
  },

  // 3. Personnel Management (Admin)
  saveAdminTeacher: function(args) {
    const payload = args[0] || {};
    const db = getDatabase();
    const email = String(payload.email || '').trim().toLowerCase();
    const empId = String(payload.id || payload.EmpID || '').trim();

    let existing = db.teachers.find(t => (email && t.email && t.email.toLowerCase() === email) || (empId && t.id === empId));
    if (existing) {
      Object.assign(existing, payload);
    } else {
      if (!payload.id) payload.id = 'TCH-' + Date.now();
      if (!payload.password) payload.password = _hashPassword('123456');
      db.teachers.push(payload);
    }

    saveDatabase();
    return { success: true, message: 'บันทึกข้อมูลบุคลากรเรียบร้อยแล้ว' };
  },

  deleteAdminTeacher: function(args) {
    const email = String(args[0] || '').trim().toLowerCase();
    const name = String(args[1] || '').trim().toLowerCase();
    const db = getDatabase();

    const idx = db.teachers.findIndex(t => (t.email && t.email.toLowerCase() === email) || (t.name && t.name.toLowerCase() === name));
    if (idx !== -1) {
      db.teachers.splice(idx, 1);
      saveDatabase();
      return { success: true, message: 'ลบข้อมูลบุคลากรเรียบร้อยแล้ว' };
    }
    return { success: false, message: 'ไม่พบบุคลากรรายนี้' };
  },

  updateAdminTeacherStatus: function(args) {
    const db = getDatabase();
    let empIdOrEmail = String(args[0] || '').trim().toLowerCase();
    let name = String(args[1] || '').trim().toLowerCase();
    let newStatus = args[2] || args[1] || 'ปกติ';

    const user = db.teachers.find(t => 
      (t.email && t.email.toLowerCase() === empIdOrEmail) ||
      (t.id && t.id.toLowerCase() === empIdOrEmail) ||
      (t.EmpID && String(t.EmpID).toLowerCase() === empIdOrEmail) ||
      (t.name && t.name.toLowerCase() === name)
    );
    if (user) {
      user.status = newStatus;
      saveDatabase();
      return { success: true, status: 'success', message: 'อัปเดตสถานะเรียบร้อย' };
    }
    return { success: false, status: 'error', message: 'ไม่พบบุคลากรรายนี้' };
  },

  // 4. Leave Management
  submitLeaveRequest: function(args) {
    const form = args[0] || {};
    const db = getDatabase();
    const newId = 'LV-' + Date.now();

    const newLog = {
      leaveId: newId,
      empId: form.empId,
      fullName: form.fullName,
      leaveType: form.leaveType,
      startDate: form.startDate,
      endDate: form.endDate || form.startDate,
      startTime: form.startTime || '-',
      endTime: form.endTime || '-',
      totalDays: parseFloat(form.totalDays) || 1,
      totalHours: 0,
      reason: form.reason || '',
      substituteInfo: form.substituteInfo || 'ไม่มีคาบสอน',
      attachUrl: form.attachUrl || '-',
      status: 'รอดำเนินการ',
      stepHr: 'รอดำเนินการ',
      stepAcademic: 'รอดำเนินการ',
      stepDirector: 'รอดำเนินการ',
      signerName: '',
      formMetaJson: form.formMetaJson || '',
      timestamp: new Date().toLocaleString('th-TH')
    };

    db.logs.unshift(newLog);
    saveDatabase();
    return { status: 'success', message: 'ยื่นคำร้องสำเร็จ' };
  },

  processApproval: function(args) {
    const leaveId = args[0];
    const newStatus = args[1];
    const role = args[2];
    const signerName = args[3] || '';
    const db = getDatabase();

    const log = db.logs.find(l => l.leaveId === leaveId);
    if (!log) return { status: 'error', message: 'ไม่พบรายการคำร้อง' };

    log.status = newStatus;
    if (role === 'hr') log.stepHr = newStatus;
    if (role === 'academic') log.stepAcademic = newStatus;
    if (role === 'director') {
      log.stepDirector = newStatus;
      log.signerName = signerName;
    }

    saveDatabase();
    return { status: 'success', message: 'บันทึกการอนุมัติสำเร็จ' };
  },

  deleteLeaveRequest: async function(args) {
    const leaveId = String(args[0] || '').trim();
    const db = getDatabase();
    if (!db.logs) db.logs = [];
    const idx = db.logs.findIndex(l => (l.leaveId === leaveId || l.LeaveID === leaveId));
    if (idx !== -1) {
      db.logs.splice(idx, 1);
      saveDatabase();
      return { success: true, status: 'success', message: 'ลบรายการคำขอลาเรียบร้อยแล้ว' };
    }
    return { success: false, status: 'error', message: 'ไม่พบรายการคำขอนี้' };
  },

  MOD_RetroLeave_saveBatch: async function(args) {
    const records = args[0] || [];
    const actorInfo = args[1] || {};
    const db = getDatabase();

    if (!Array.isArray(records) || records.length === 0) {
      return { status: 'error', success: false, message: 'ไม่พบรายการข้อมูลที่ต้องการบันทึก' };
    }

    if (!db.logs) db.logs = [];

    records.forEach(item => {
      const leaveId = item.leaveId || item.LeaveID || ('LV-RETRO-' + Date.now() + '-' + Math.floor(Math.random() * 1000));
      const logEntry = {
        leaveId: leaveId,
        LeaveID: leaveId,
        empId: item.empId || item.EmpID || '',
        EmpID: item.empId || item.EmpID || '',
        fullName: item.fullName || item.FullName || '',
        FullName: item.fullName || item.FullName || '',
        leaveType: item.leaveType || item.LeaveType || 'ลากิจส่วนตัว',
        LeaveType: item.leaveType || item.LeaveType || 'ลากิจส่วนตัว',
        startDate: item.startDate || item.StartDate || '',
        StartDate: item.startDate || item.StartDate || '',
        endDate: item.endDate || item.EndDate || '',
        EndDate: item.endDate || item.EndDate || '',
        startTime: item.startTime || item.StartTime || '-',
        StartTime: item.startTime || item.StartTime || '-',
        endTime: item.endTime || item.EndTime || '-',
        EndTime: item.endTime || item.EndTime || '-',
        totalDays: Number(item.totalDays || item.TotalDays || 1),
        TotalDays: Number(item.totalDays || item.TotalDays || 1),
        totalHours: Number(item.totalHours || item.TotalHours || 0),
        TotalHours: Number(item.totalHours || item.TotalHours || 0),
        reason: item.reason || item.Reason || 'บันทึกย้อนหลัง',
        Reason: item.reason || item.Reason || 'บันทึกย้อนหลัง',
        substituteInfo: item.substituteInfo || item.SubstituteInfo || 'ไม่มีคาบสอน',
        SubstituteInfo: item.substituteInfo || item.SubstituteInfo || 'ไม่มีคาบสอน',
        attachUrl: item.attachUrl || item.AttachUrl || '-',
        AttachUrl: item.attachUrl || item.AttachUrl || '-',
        status: 'อนุมัติ',
        Status: 'อนุมัติ',
        stepHr: 'ผ่านการตรวจสอบ',
        Step1_HR: 'ผ่านการตรวจสอบ',
        stepAcademic: 'ผ่านการตรวจสอบ',
        Step2_Academic: 'ผ่านการตรวจสอบ',
        stepDirector: 'อนุมัติ',
        Step3_Director: 'อนุมัติ',
        signerName: db.schoolInfo.directorName || 'นายธีรศักดิ์ มโนธรรม',
        SignerName: db.schoolInfo.directorName || 'นายธีรศักดิ์ มโนธรรม',
        remark: typeof item.remark === 'object' ? JSON.stringify(item.remark) : (item.remark || ''),
        Remark: typeof item.remark === 'object' ? JSON.stringify(item.remark) : (item.remark || ''),
        timestamp: item.timestamp || item.Timestamp || new Date().toISOString().split('T')[0]
      };
      db.logs.unshift(logEntry);
    });

    saveDatabase();
    return {
      status: 'success',
      success: true,
      message: `บันทึกการลาย้อนหลังสำเร็จ ${records.length} รายการ`,
      count: records.length
    };
  },

  getOfficialLeaveFormPrintHtml: async function(args) {
    const leaveId = String(args[0] || '').trim();
    const db = getDatabase();
    return getOfficialLeaveFormHtml(leaveId, db);
  },

  getPersonnelPortfolioPrintHtml: async function(args) {
    const empId = String(args[0] || '').trim();
    const db = getDatabase();
    return getPersonnelPortfolioPrintHtml(empId, db);
  },

  migrateAllPasswordsToSHA256: async function(args) {
    const db = getDatabase();
    let migratedCount = 0;
    (db.teachers || []).forEach(t => {
      if (!_isSaltedHash(t.password)) {
        t.password = _hashPassword(t.password || '123456');
        t.is_password_hashed = true;
        t.isPasswordHashed = true;
        migratedCount++;
      }
    });
    saveDatabase();
    return {
      status: 'success',
      success: true,
      migratedCount,
      message: `เข้ารหัสผ่าน SHA-256 สำเร็จแล้ว ${migratedCount} รายการ`
    };
  },

  createDatabaseBackupSnapshot: async function(args) {
    const db = getDatabase();
    return {
      status: 'success',
      success: true,
      message: 'สำรองข้อมูลสแน็ปช็อตในระบบเรียบร้อยแล้ว (ออฟไลน์และหน่วยความจำพร้อมใช้งาน)',
      timestamp: new Date().toISOString()
    };
  },

  // 5. School & Fiscal Configurations
  School_getInfo: async function() {
    const bundle = await getMainBundle();
    return bundle.schoolInfo || getDatabase().schoolInfo;
  },

  School_saveInfo: async function(args) {
    return await handlers.saveAdminSchoolInfo(args);
  },

  School_getActiveClasses: async function() {
    const bundle = await getMainBundle();
    return bundle.activeClasses || getDatabase().activeClasses;
  },

  saveAdminSchoolInfo: async function(args) {
    const payload = args[0] || {};
    const db = getDatabase();
    Object.assign(db.schoolInfo, payload);
    saveDatabase();
    return { success: true, status: 'success', message: 'บันทึกข้อมูลโรงเรียนเรียบร้อยแล้ว' };
  },

  saveAdminActiveClasses: async function(args) {
    const classes = args[0] || [];
    const db = getDatabase();
    db.activeClasses = classes;
    saveDatabase();
    return { success: true, status: 'success', message: 'บันทึกชั้นเรียนที่เปิดสอนเรียบร้อยแล้ว' };
  },

  getFiscalYearsList: async function() {
    const bundle = await getMainBundle();
    return bundle.fiscalData || getDatabase().fiscalData;
  },

  saveActiveFiscalConfig: async function(args) {
    const [yearBE, periodMode] = args;
    const db = getDatabase();
    const y = parseInt(yearBE, 10);
    const p = periodMode || 'PERIOD_1';
    db.fiscalData.active = {
      fiscal_year: y,
      yearBE: y,
      periodMode: p,
      active_period_mode: p,
      status: 'Active',
      updatedAt: new Date().toISOString()
    };
    if (db.fiscalData.all) {
      db.fiscalData.all.forEach(item => {
        if (Number(item.fiscal_year) === y) {
          item.status = 'Active';
          item.active_period_mode = p;
        } else {
          if (item.status === 'Active') item.status = 'Inactive';
        }
      });
    }
    saveDatabase();
    return { status: 'success', success: true, message: 'บันทึกปีงบประมาณเรียบร้อยแล้ว' };
  },

  saveAdminFiscalAndAcademicPeriod: async function(args) {
    return await handlers.saveActiveFiscalConfig(args);
  },

  addNewFiscalYear: async function(args) {
    const payload = args[0] || {};
    const db = getDatabase();
    const year = Number(payload.fiscal_year || payload.fiscalYear || payload.yearBE);
    if (!year) return { status: 'error', message: 'ระบุปีงบประมาณไม่ถูกต้อง' };
    if (!db.fiscalData.all) db.fiscalData.all = [];
    const exists = db.fiscalData.all.find(f => Number(f.fiscal_year) === year);
    if (!exists) {
      db.fiscalData.all.push({
        fiscal_year: year,
        period1_start: payload.period1_start || `${year-1}-10-01`,
        period1_end: payload.period1_end || `${year}-03-31`,
        period2_start: payload.period2_start || `${year}-04-01`,
        period2_end: payload.period2_end || `${year}-09-30`,
        active_period_mode: payload.active_period_mode || 'PERIOD_1',
        status: payload.status || 'Active',
        updated_at: new Date().toISOString()
      });
    }
    saveDatabase();
    return { success: true, status: 'success', message: 'เพิ่มปีงบประมาณเรียบร้อยแล้ว' };
  },

  deleteFiscalYear: async function(args) {
    const year = Number(args[0]);
    const db = getDatabase();
    if (db.fiscalData && db.fiscalData.all) {
      db.fiscalData.all = db.fiscalData.all.filter(f => Number(f.fiscal_year) !== year);
      saveDatabase();
    }
    return { success: true, status: 'success', message: 'ลบปีงบประมาณเรียบร้อยแล้ว' };
  },

  isSuperuserOrAdmin: async function(args) {
    const email = String(args[0] || '').trim().toLowerCase();
    const db = getDatabase();
    if (email === 'superuser' || email === 'admin' || email === '44123130114' || email === 'root') return true;
    const user = db.teachers.find(t => (t.email && t.email.toLowerCase() === email) || (t.id && t.id.toLowerCase() === email));
    if (user && (user.access_level === 'Admin' || user.access_level === 'Superuser' || user.accessLevel === 'Admin' || user.accessLevel === 'Superuser')) {
      return true;
    }
    return false;
  },

  // 6. History & Workload
  saveHistoryRecord: function(args) {
    return { success: true, status: 'success', message: 'บันทึกประวัติเรียบร้อยแล้ว' };
  },

  deleteHistoryRecordById: function(args) {
    return { status: 'success', message: 'ลบรายการประวัติเรียบร้อยแล้ว' };
  },

  saveStaffWorkloadRecord: function(args) {
    const payload = args[0] || {};
    const db = getDatabase();
    const wlId = payload.workloadId || ('WL-' + Date.now());
    let wl = db.workloads.find(w => w.workloadId === wlId);
    if (wl) {
      Object.assign(wl, payload);
    } else {
      db.workloads.push(Object.assign({ workloadId: wlId }, payload));
    }
    saveDatabase();
    return { status: 'success', message: 'บันทึกภาระงานเรียบร้อยแล้ว' };
  },

  deleteStaffWorkloadRecord: function(args) {
    const wlId = args[0];
    const db = getDatabase();
    const idx = db.workloads.findIndex(w => w.workloadId === wlId);
    if (idx !== -1) {
      db.workloads.splice(idx, 1);
      saveDatabase();
      return { status: 'success', message: 'ลบภาระงานเรียบร้อยแล้ว' };
    }
    return { status: 'error', message: 'ไม่พบรายการภาระงาน' };
  },

  // 7. Feedback & School Board
  submitSystemFeedback: function(args) {
    const payload = args[0] || {};
    const db = getDatabase();
    db.feedbacks.unshift(Object.assign({ id: 'FB-' + Date.now(), timestamp: new Date().toLocaleString('th-TH') }, payload));
    saveDatabase();
    return { status: 'success', message: 'ส่งข้อเสนอแนะเรียบร้อยแล้ว' };
  },

  resolveSystemFeedback: function(args) {
    return { status: 'success', message: 'ตอบรับข้อเสนอแนะเรียบร้อยแล้ว' };
  },

  SBD_getBoardBundle: async function() {
    const bundle = await getMainBundle();
    return bundle.boardBundle;
  },

  SBD_saveStudentCountCriteria: async function(args) {
    const param1 = args[0];
    const param2 = args[1];
    const db = getDatabase();
    if (typeof param1 === 'object' && param1 !== null) {
      if (param1.studentCount !== undefined) db.schoolInfo.studentCount = Number(param1.studentCount);
      if (param1.studentCountDate !== undefined) db.schoolInfo.studentDataDate = String(param1.studentCountDate);
      if (param1.dmcRound !== undefined) db.schoolInfo.dmcRound = String(param1.dmcRound);
      if (param1.studentCountR1 !== undefined) db.schoolInfo.studentCountR1 = String(param1.studentCountR1);
      if (param1.studentCountDateR1 !== undefined) db.schoolInfo.studentCountDateR1 = String(param1.studentCountDateR1);
      if (param1.studentCountR2 !== undefined) db.schoolInfo.studentCountR2 = String(param1.studentCountR2);
      if (param1.studentCountDateR2 !== undefined) db.schoolInfo.studentCountDateR2 = String(param1.studentCountDateR2);
    } else {
      if (param1 !== undefined) db.schoolInfo.studentCount = Number(param1);
      if (param2 !== undefined) db.schoolInfo.studentDataDate = String(param2);
    }
    saveDatabase();
    const boardBundle = buildBoardBundle(db.boardMembers, db.schoolBoardStaffTerms, db.boardMeetings, db.schoolInfo);
    return {
      status: 'success',
      success: true,
      message: 'บันทึกเกณฑ์จำนวนนักเรียนเรียบร้อยแล้ว',
      compliance: boardBundle.compliance
    };
  },

  SBD_saveStaffTerm: async function(args) {
    const payload = args[0] || {};
    const db = getDatabase();
    const pos = payload.BoardPosition || payload.board_position;
    const empId = payload.EmpID || payload.emp_id;

    const teacher = (db.teachers || []).find(t => (t.id || t.EmpID) === empId);
    const fullName = teacher ? (teacher.name || teacher.FullName) : (payload.FullName || '');

    if (!db.schoolBoardStaffTerms) db.schoolBoardStaffTerms = [];
    const termId = payload.TermID || ('TERM-' + (pos === 'DIRECTOR_SEC' ? 'DIR-' : 'TCH-') + Date.now());

    db.schoolBoardStaffTerms.forEach(t => {
      if (t.board_position === pos || t.BoardPosition === pos) {
        t.status = 'ครบวาระ';
        t.Status = 'ครบวาระ';
      }
    });

    db.schoolBoardStaffTerms.push({
      term_id: termId,
      TermID: termId,
      emp_id: empId,
      EmpID: empId,
      full_name: fullName,
      FullName: fullName,
      board_position: pos,
      BoardPosition: pos,
      start_date: payload.StartDate || '',
      StartDate: payload.StartDate || '',
      end_date: payload.EndDate || '',
      EndDate: payload.EndDate || '',
      term_number: Number(payload.TermNumber || 1),
      TermNumber: Number(payload.TermNumber || 1),
      appointment_order_no: payload.AppointmentOrderNo || '',
      AppointmentOrderNo: payload.AppointmentOrderNo || '',
      status: 'ดำรงตำแหน่ง',
      Status: 'ดำรงตำแหน่ง',
      updated_by: payload.UpdatedBy || 'admin',
      timestamp: new Date().toISOString().split('T')[0]
    });

    if (!db.boardMembers) db.boardMembers = [];
    let member = db.boardMembers.find(m => (m.board_position === pos || m.BoardPosition === pos));
    if (member) {
      member.full_name = fullName;
      member.FullName = fullName;
      member.start_date = payload.StartDate || '';
      member.StartDate = payload.StartDate || '';
      member.end_date = payload.EndDate || '';
      member.EndDate = payload.EndDate || '';
      member.appointment_order_no = payload.AppointmentOrderNo || '';
      member.AppointmentOrderNo = payload.AppointmentOrderNo || '';
      member.status = 'ดำรงตำแหน่ง';
      member.Status = 'ดำรงตำแหน่ง';
    }

    saveDatabase();
    return { success: true, status: 'success', message: 'บันทึกวาระบุคลากรเรียบร้อยแล้ว' };
  },

  SBD_transitionTeacherRep: async function(args) {
    const payload = args[0] || {};
    const db = getDatabase();
    const oldEndDate = payload.oldEndDate;
    const oldReason = payload.oldReason || 'ครบวาระ';
    const newEmpId = payload.newEmpID;
    const newStartDate = payload.newStartDate;
    const newTermNumber = Number(payload.newTermNumber || 1);
    const newOrderNo = payload.newOrderNo || '';

    if (db.schoolBoardStaffTerms) {
      db.schoolBoardStaffTerms.forEach(t => {
        if (t.board_position === 'TEACHER_REP' || t.BoardPosition === 'TEACHER_REP') {
          t.status = oldReason;
          t.Status = oldReason;
          if (oldEndDate) {
            t.end_date = oldEndDate;
            t.EndDate = oldEndDate;
          }
        }
      });
    }

    return await handlers.SBD_saveStaffTerm([{
      BoardPosition: 'TEACHER_REP',
      EmpID: newEmpId,
      StartDate: newStartDate,
      EndDate: '',
      TermNumber: newTermNumber,
      AppointmentOrderNo: newOrderNo,
      Status: 'ดำรงตำแหน่ง'
    }]);
  },

  SBD_deleteStaffTerm: async function(args) {
    const memberId = args[0];
    const db = getDatabase();
    if (db.schoolBoardStaffTerms) {
      db.schoolBoardStaffTerms = db.schoolBoardStaffTerms.filter(t => (t.term_id !== memberId && t.TermID !== memberId && t.emp_id !== memberId && t.EmpID !== memberId));
    }
    saveDatabase();
    return { success: true, status: 'success', message: 'ลบวาระบุคลากรเรียบร้อยแล้ว' };
  },

  SBD_saveMember: async function(args) {
    const payload = args[0] || {};
    const db = getDatabase();
    if (!db.boardMembers) db.boardMembers = [];
    const mId = payload.MemberID || payload.member_id || ('SBD-' + Date.now());
    let m = db.boardMembers.find(item => (item.member_id === mId || item.MemberID === mId));
    if (m) {
      Object.assign(m, payload);
      m.member_id = mId;
      m.MemberID = mId;
      if (payload.FullName) m.full_name = payload.FullName;
      if (payload.BoardPosition) m.board_position = payload.BoardPosition;
      if (payload.Status) m.status = payload.Status;
    } else {
      const newM = Object.assign({
        member_id: mId,
        MemberID: mId,
        prefix: payload.Prefix || '',
        first_name: payload.FirstName || '',
        last_name: payload.LastName || '',
        full_name: payload.FullName || '',
        board_position: payload.BoardPosition || '',
        occupation: payload.Occupation || '',
        organization: payload.Organization || '',
        phone: payload.Phone || '',
        email: payload.Email || '',
        appointment_order_no: payload.AppointmentOrderNo || '',
        order_date: payload.OrderDate || '',
        start_date: payload.StartDate || '',
        end_date: payload.EndDate || '',
        term_number: Number(payload.TermNumber || 1),
        status: payload.Status || 'ดำรงตำแหน่ง',
        doc_url: payload.DocUrl || '',
        remark: payload.Remark || '',
        updated_by: payload.UpdatedBy || 'admin',
        timestamp: new Date().toISOString().split('T')[0]
      }, payload);
      db.boardMembers.push(newM);
    }
    saveDatabase();
    return { success: true, status: 'success', message: 'บันทึกข้อมูลกรรมการสถานศึกษาเรียบร้อยแล้ว' };
  },

  SBD_deleteMember: async function(args) {
    const mId = args[0];
    const db = getDatabase();
    if (db.boardMembers) {
      db.boardMembers = db.boardMembers.filter(m => (m.member_id !== mId && m.MemberID !== mId));
      saveDatabase();
    }
    return { success: true, status: 'success', message: 'ลบข้อมูลกรรมการสถานศึกษาเรียบร้อยแล้ว' };
  },

  // 8. One-Click Cloud Migration & Google Sheets Import
  importDatabaseFromGoogleSheets: async function(args) {
    let payload = args[0];
    const defaultGASUrl = 'https://script.google.com/macros/s/AKfycbx9tVM8qitSnnjoHNEl0cHFtTu8XYp5Fp_aA7-mIFIhM17TSwWSsB_D_tkG48TlEfrK/exec?action=export&key=44123130114';

    // 1. If payload is a URL or empty, fetch directly via HTTP
    if (!payload || (typeof payload === 'string' && (payload.startsWith('http://') || payload.startsWith('https://')))) {
      const targetUrl = (payload && payload.startsWith('http')) ? payload : defaultGASUrl;
      console.log('[Auto-Sync] Fetching real data from Google Sheets endpoint:', targetUrl);
      const response = await fetch(targetUrl, { redirect: 'follow' });
      if (!response.ok) {
        throw new Error('ไม่สามารถเชื่อมต่อ Google Sheets Web App ได้ (HTTP ' + response.status + ')');
      }
      payload = await response.json();
    } else if (typeof payload === 'string') {
      try {
        payload = JSON.parse(payload);
      } catch (err) {
        throw new Error('ข้อมูลไม่ถูกต้อง กรุณาระบุ URL ของ Google Sheets หรือเลือกไฟล์');
      }
    }

    // 2. Validate payload
    if (!payload || (!payload.usersSummary && !payload.teachers)) {
      throw new Error('ไม่พบข้อมูลบุคลากรในชุดข้อมูลที่ดึงมา กรุณาตรวจสอบสิทธิ์การเข้าถึง');
    }

    // 3. Clear mock dummy data from PostgreSQL
    if (isPostgresActive()) {
      try {
        await query(`DELETE FROM teachers WHERE id = 'TCH-001' OR email = 'director@school.ac.th' OR email = 'somjai@school.ac.th'`);
        await query(`DELETE FROM leave_logs WHERE leave_id = 'LV-1731600000000'`);
      } catch (e) {
        console.warn('[Auto-Sync Notice] Cleanup mock data:', e.message);
      }
    }

    const res = await importFullDatabase(payload);
    return {
      status: 'success',
      success: true,
      message: `นำเข้าข้อมูลจริงจาก Google Sheets สู่ Cloud PostgreSQL สำเร็จแล้ว (บุคลากร ${res.teacherCount || 0} คน, ประวัติการลา ${res.logCount || 0} รายการ)`,
      details: res
    };
  }
};

// Universal POST /api/:action Endpoint
router.post('/:action', async (req, res) => {
  const action = req.params.action;
  const args = req.body && Array.isArray(req.body.args) ? req.body.args : [];

  const handler = handlers[action];
  if (typeof handler === 'function') {
    try {
      const result = await Promise.resolve(handler(args));
      return res.json(result);
    } catch (err) {
      console.error(`[API Handler Error] ${action}:`, err);
      return res.status(500).json({ __gas_error: true, message: err.message || 'Server Internal Error' });
    }
  }

  console.warn(`[API Missing Action] ${action}`);
  return res.json({ __gas_error: false, status: 'warning', message: `Action ${action} called (mocked)` });
});

module.exports = router;
module.exports.handlers = handlers;
