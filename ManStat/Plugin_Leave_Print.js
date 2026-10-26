function _getSchoolHolidaysSet() {
  const holidaySheetName = (CONFIG.SHEETS && CONFIG.SHEETS.HOLIDAYS) ? CONFIG.SHEETS.HOLIDAYS : 'Holidays';
  const holidays = getSheetDataAsObjects(holidaySheetName, true) || [];
  const holidaySet = new Set();
  holidays.forEach(h => {
    const raw = h.HolidayDate;
    if (raw) {
      const iso = _normalizeDateToISO(raw);
      if (iso) holidaySet.add(iso);
    }
  });
  return holidaySet;
}

function calculateWorkingDays(startDateStr, endDateStr, isCalendarDays = false) {
  const start = _safeParseLocalDate(startDateStr);
  const end = _safeParseLocalDate(endDateStr);
  if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return 0;

  if (isCalendarDays) {
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }

  const holidaysSet = _getSchoolHolidaysSet();
  let count = 0;
  let curDate = new Date(start.getTime());

  while (curDate <= end) {
    let dayOfWeek = curDate.getDay();
    let iso = Utilities.formatDate(curDate, 'GMT+7', 'yyyy-MM-dd');
    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidaysSet.has(iso)) {
      count++;
    }
    curDate.setDate(curDate.getDate() + 1);
  }
  return count;
}

function _ensureFeedbackSheet() {
  const ss = DB_getSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.SHEETS.FEEDBACK);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEETS.FEEDBACK);
    const headers = CONFIG.HEADERS.System_Feedback;
    sheet.getRange(1, 1, 1, headers.length).setValues([headers])
      .setBackground('#101822')
      .setFontColor('#66c0f4')
      .setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function _ensureWorkloadSheet() {
  const ss = DB_getSpreadsheet();
  const sheetName = (CONFIG.SHEETS && CONFIG.SHEETS.WORKLOAD) ? CONFIG.SHEETS.WORKLOAD : 'Staff_Workloads';
  let sheet = ss.getSheetByName(sheetName);
  const headers = (CONFIG.HEADERS && CONFIG.HEADERS.Staff_Workloads) ? CONFIG.HEADERS.Staff_Workloads : [
    'WorkloadID', 'EmpID', 'CoEmpIds', 'Category', 'Title',
    'SubGroupOrLevel', 'HoursPerWeek', 'RoleInTask', 'AcademicTerm',
    'OrderOrRef', 'EffectivePeriod', 'Status', 'AssignedBy', 'UpdatedBy', 'Timestamp'
  ];
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers])
      .setBackground('#101822')
      .setFontColor('#66c0f4')
      .setFontWeight('bold');
    sheet.setFrozenRows(1);
  } else if (sheet.getLastColumn() < headers.length) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers])
      .setBackground('#101822')
      .setFontColor('#66c0f4')
      .setFontWeight('bold');
  }
  return sheet;
}

function _verifyAdminActorPermission(actorIdentifier) {
  if (!actorIdentifier) return false;
  const clean = String(actorIdentifier).trim();
  const superPass = (typeof getSuperuserPass === 'function') ? getSuperuserPass() : CONFIG.SUPERUSER_PASS;
  if (clean === superPass) return true;

  const teachers = Staff_getAll();
  const cleanLower = clean.toLowerCase();
  const found = teachers.find(t =>
    (t.id && t.id.toLowerCase() === cleanLower) ||
    (t.email && t.email.toLowerCase() === cleanLower) ||
    (t.name && t.name.toLowerCase() === cleanLower)
  );
  if (!found) return false;
  const lv = String(found.accessLevel || '').trim();
  return (lv === 'Admin' || lv === 'Superuser' || lv === 'Super Admin');
}

function saveStaffWorkloadRecord(payload, actorIdentifier) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    if (!_verifyAdminActorPermission(actorIdentifier)) {
      return { status: 'error', message: 'ปฏิเสธการเข้าถึง: เฉพาะผู้ดูแลระบบ (Admin / Superuser) เท่านั้นที่สามารถจัดการภาระงานได้' };
    }

    if (!payload || !payload.empId || !payload.title || !payload.category) {
      return { status: 'error', message: 'กรุณาระบุบุคลากรผู้รับผิดชอบหลัก หมวดภาระงาน และชื่อรายการงานให้ครบถ้วน' };
    }

    const teachers = Staff_getAll();
    const validEmp = teachers.find(t => t.id === payload.empId);
    if (!validEmp) {
      return { status: 'error', message: 'ไม่พบรหัสบุคลากร (' + payload.empId + ') ในทะเบียนจริง' };
    }

    const sheet = _ensureWorkloadSheet();
    const sheetName = (CONFIG.SHEETS && CONFIG.SHEETS.WORKLOAD) ? CONFIG.SHEETS.WORKLOAD : 'Staff_Workloads';
    const data = sheet.getDataRange().getDisplayValues();
    const timestamp = Utilities.formatDate(new Date(), 'GMT+7', 'dd/MM/yyyy HH:mm');

    const wlId = payload.workloadId ? String(payload.workloadId).trim() : ('WL-' + new Date().getTime());
    const rowValues = [
      wlId,
      String(payload.empId).trim(),
      String(payload.coEmpIds || '').trim(),
      String(payload.category || 'งานประจำฝ่าย').trim(),
      String(payload.title || '').trim(),
      String(payload.subGroupOrLevel || '-').trim(),
      String(payload.hoursPerWeek !== undefined && payload.hoursPerWeek !== '' ? payload.hoursPerWeek : '-').trim(),
      String(payload.roleInTask || 'ผู้รับผิดชอบหลัก').trim(),
      String(payload.academicTerm || '2569').trim(),
      String(payload.orderOrRef || '-').trim(),
      String(payload.effectivePeriod || '-').trim(),
      String(payload.status || 'กำลังดำเนินการ').trim(),
      String(payload.assignedBy || '-').trim(),
      String(actorIdentifier || 'Superuser').trim(),
      timestamp
    ];

    let updated = false;
    if (payload.workloadId) {
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === wlId) {
          sheet.getRange(i + 1, 1, 1, rowValues.length).setValues([rowValues]);
          updated = true;
          break;
        }
      }
    }

    if (!updated) {
      sheet.appendRow(rowValues);
    }

    clearSystemCache([sheetName]);
    return {
      status: 'success',
      workloadId: wlId,
      message: updated ? 'แก้ไขข้อมูลภาระงานเรียบร้อยแล้ว' : 'เพิ่มรายการภาระงานใหม่เรียบร้อยแล้ว'
    };
  } catch (err) {
    return { status: 'error', message: 'ไม่สามารถบันทึกภาระงานได้: ' + (err.message || err) };
  } finally {
    lock.releaseLock();
  }
}

function deleteStaffWorkloadRecord(workloadId, actorIdentifier) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    if (!_verifyAdminActorPermission(actorIdentifier)) {
      return { status: 'error', message: 'ปฏิเสธการเข้าถึง: เฉพาะผู้ดูแลระบบ (Admin / Superuser) เท่านั้นที่สามารถลบรายการภาระงานได้' };
    }

    const sheet = _ensureWorkloadSheet();
    const sheetName = (CONFIG.SHEETS && CONFIG.SHEETS.WORKLOAD) ? CONFIG.SHEETS.WORKLOAD : 'Staff_Workloads';
    const data = sheet.getDataRange().getDisplayValues();

    for (let i = data.length - 1; i >= 1; i--) {
      if (data[i][0] === workloadId) {
        sheet.deleteRow(i + 1);
        clearSystemCache([sheetName]);
        return { status: 'success', message: 'ลบรายการภาระงานเรียบร้อยแล้ว' };
      }
    }
    return { status: 'error', message: 'ไม่พบรายการภาระงานที่ต้องการลบ' };
  } catch (err) {
    return { status: 'error', message: 'ลบรายการไม่สำเร็จ: ' + (err.message || err) };
  } finally {
    lock.releaseLock();
  }
}

function _formatThaiDateParts(dateStr) {
  const thaiMonths = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];
  let d = _safeParseLocalDate(dateStr);
  if (!d || isNaN(d.getTime())) {
    return { day: "........", month: "....................", year: "............", full: dateStr || "-" };
  }
  const day = d.getDate();
  const month = thaiMonths[d.getMonth()];
  const yearBE = _normalizeYearToBE(d.getFullYear());
  return {
    day: String(day),
    month: month,
    year: String(yearBE),
    full: `${day} ${month} ${yearBE}`
  };
}

function getMainBundleData(savedEmail) {
  try {
    const ss = DB_getSpreadsheet();
    const tSh = ss.getSheetByName(CONFIG.SHEETS.TEACHERS);
    if (!tSh || tSh.getLastRow() <= 1) {
      try { setupDatabase(); } catch (e) { Logger.log('setupDatabase error: ' + e.message); }
    }
    try { _ensureFeedbackSheet(); } catch (e) { Logger.log('_ensureFeedbackSheet error: ' + e.message); }
    try { _ensureWorkloadSheet(); } catch (e) { Logger.log('_ensureWorkloadSheet error: ' + e.message); }
    try { _ensureFiscalYearSheet(); } catch (e) { Logger.log('_ensureFiscalYearSheet error: ' + e.message); }

    let scriptUrl = '#';
    try {
      scriptUrl = ScriptApp.getService().getUrl() || '#';
    } catch (e) {}

    let logs = [];
    try {
      logs = getSheetDataAsObjects(CONFIG.SHEETS.LOGS, false) || [];
    } catch (e) { Logger.log('logs error: ' + e.message); }

    let feedbacks = [];
    try {
      feedbacks = getSheetDataAsObjects(CONFIG.SHEETS.FEEDBACK, false) || [];
    } catch (e) { Logger.log('feedbacks error: ' + e.message); }

    let workloads = [];
    try {
      const wlSheetName = (CONFIG.SHEETS && CONFIG.SHEETS.WORKLOAD) ? CONFIG.SHEETS.WORKLOAD : 'Staff_Workloads';
      workloads = getSheetDataAsObjects(wlSheetName, false) || [];
    } catch (e) { Logger.log('workloads error: ' + e.message); }

    let usersSummary = [];
    try {
      usersSummary = getAllUsersSummary() || [];
    } catch (e) {
      Logger.log('getAllUsersSummary error in getMainBundleData: ' + e.message);
    }

    let schoolInfo = {};
    try {
      schoolInfo = School_getInfo() || {};
      if (schoolInfo.logoBase64 && schoolInfo.logoBase64.length > 50000) {
        schoolInfo.logoBase64 = '';
      }
    } catch (e) {}

    let fiscalData = null;
    try {
      fiscalData = getFiscalYearsList();
      if (fiscalData && fiscalData.active && fiscalData.active.yearBE) {
        schoolInfo.fiscalYear = fiscalData.active.yearBE;
      }
    } catch (e) { Logger.log('fiscalData error: ' + e.message); }

    let activeClasses = [];
    try {
      activeClasses = School_getActiveClasses() || [];
    } catch (e) {}

    return JSON.parse(JSON.stringify({
      status: 'success',
      scriptUrl: String(scriptUrl),
      logs: logs.slice().reverse(),
      feedbacks: feedbacks.slice().reverse(),
      workloads: workloads,
      usersSummary: usersSummary,
      schoolInfo: schoolInfo,
      fiscalData: fiscalData,
      activeClasses: activeClasses
    }));
  } catch (err) {
    Logger.log('Critical error in getMainBundleData: ' + (err && err.message ? err.message : err));
    let fallbackUsers = [];
    try { fallbackUsers = getAllUsersSummary() || []; } catch(e) {}
    return {
      status: 'error',
      message: String(err && err.message ? err.message : err),
      scriptUrl: '#',
      logs: [],
      feedbacks: [],
      workloads: [],
      usersSummary: fallbackUsers,
      schoolInfo: {},
      fiscalData: null,
      activeClasses: []
    };
  }
}

function submitSystemFeedback(payload) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sheet = _ensureFeedbackSheet();
    const fbId = 'FB-' + new Date().getTime();
    const timestamp = Utilities.formatDate(new Date(), 'GMT+7', 'dd/MM/yyyy HH:mm');

    sheet.appendRow([
      fbId,
      payload.empId || '-',
      payload.fullName || 'ผู้ใช้งาน',
      payload.category || 'เสนอฟีเจอร์ใหม่',
      payload.topic || '-',
      payload.detail || '-',
      'รอดำเนินการ',
      'รอผู้ดูแลระบบตรวจสอบ',
      '-',
      timestamp
    ]);

    clearSystemCache([CONFIG.SHEETS.FEEDBACK]);
    return {
      status: 'success',
      message: 'บันทึกคำขอแจ้งปรับปรุงระบบเรียบร้อยแล้ว'
    };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  } finally {
    lock.releaseLock();
  }
}

function resolveSystemFeedback(fbId, statusLabel, adminReply, adminName) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sheet = _ensureFeedbackSheet();
    const data = sheet.getDataRange().getDisplayValues();
    const timestamp = Utilities.formatDate(new Date(), 'GMT+7', 'dd/MM/yyyy HH:mm');

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === fbId) {
        let row = i + 1;
        sheet.getRange(row, 7).setValue(statusLabel);
        sheet.getRange(row, 8).setValue(adminReply || `${statusLabel}เมื่อ ${timestamp}`);
        sheet.getRange(row, 9).setValue(adminName || 'Superuser');
        clearSystemCache([CONFIG.SHEETS.FEEDBACK]);
        return {
          status: 'success',
          message: `อัปเดตสถานะเป็น "${statusLabel}" และแจ้งผู้ใช้งานเรียบร้อยแล้ว`
        };
      }
    }
    return { status: 'error', message: 'ไม่พบรายการคำขอนี้' };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  } finally {
    lock.releaseLock();
  }
}

function submitLeaveRequest(form) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const ss = DB_getSpreadsheet();
    const logSheet = ss.getSheetByName(CONFIG.SHEETS.LOGS);

    const teachers = Staff_getAll();
    const sender = teachers.find(t => t.id === form.empId || t.name === form.fullName);
    if (sender && String(sender.role || '').indexOf('ผู้อำนวยการสถานศึกษา') !== -1 && form.empId !== 'SUPER_OVERRIDE') {
      return {
        status: 'error',
        message: 'ระเบียบการลา: ผู้อำนวยการสถานศึกษาไม่มีสิทธิยื่นลาและอนุมัติตนเองภายในสถานศึกษา ต้องยื่นใบลาต่อผู้อำนวยการสำนักงานเขตพื้นที่การศึกษา (สพป.) เท่านั้น'
      };
    }

    if (form.leaveType === 'ลาพักผ่อน') {
      return {
        status: 'error',
        message: 'ข้าราชการครูไม่มีสิทธิลาพักผ่อนระหว่างเปิดภาคเรียน เนื่องจากมีวันหยุดปิดภาคเรียนตามระเบียบแล้ว'
      };
    }
    
    let totalDays = 0;
    let totalHours = 0;

    if (form.leaveType === 'ขออนุญาต (ไม่เกิน 3 ชม.)') {
      if (!form.startTime || !form.endTime) {
        return { status: 'error', message: 'กรุณาระบุเวลาเริ่มต้นและเวลาสิ้นสุด' };
      }
      const startParts = form.startTime.split(':');
      const endParts = form.endTime.split(':');
      const startMinutes = parseInt(startParts[0], 10) * 60 + parseInt(startParts[1], 10);
      const endMinutes = parseInt(endParts[0], 10) * 60 + parseInt(endParts[1], 10);
      
      totalHours = Number(((endMinutes - startMinutes) / 60).toFixed(2));
      if (totalHours <= 0) return { status: 'error', message: 'เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น' };
      if (totalHours > 3) return { status: 'error', message: 'ไม่อนุญาต: การขออนุญาตออกนอกบริเวณโรงเรียนต้องไม่เกิน 3 ชั่วโมง' };
    } else {
      const isCalendarDaysLeave = (form.leaveType === 'ลาคลอดบุตร' || form.leaveType === 'ลาอุปสมบทหรือการลาไปประกอบพิธีฮัจย์');
      totalDays = calculateWorkingDays(form.startDate, form.endDate, isCalendarDaysLeave);
      if (totalDays <= 0) {
        return { status: 'error', message: 'จำนวนวันทำการต้องมากกว่า 0 (วันที่เลือกอาจตรงกับวันเสาร์-อาทิตย์หรือวันหยุดราชการทั้งหมด)' };
      }
      
      const quotas = getSheetDataAsObjects(CONFIG.SHEETS.QUOTA, false);
      const userQuota = quotas.find(q => q.EmpID === form.empId);
      if (userQuota) {
        if (form.leaveType && form.leaveType.indexOf('ลาป่วย') !== -1 && (Number(userQuota.Sick_Used) + totalDays > Number(userQuota.Sick_Max))) {
          return { status: 'error', message: 'วันลาป่วยของคุณเกินโควตาที่กำหนดไว้' };
        }
        if (form.leaveType && form.leaveType.indexOf('ลากิจ') !== -1 && (Number(userQuota.Personal_Used) + totalDays > Number(userQuota.Personal_Max))) {
          return { status: 'error', message: 'วันลากิจส่วนตัวของคุณเกินโควตาที่กำหนดไว้' };
        }
      }
    }

    let attachUrl = '-';
    if (form.fileData && form.fileName) {
      attachUrl = uploadFileToDrive(form.fileData, form.fileName);
    }

    const leaveId = 'LV-' + new Date().getTime();
    const timestamp = Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd HH:mm:ss');
    const extraMetaJson = form.formMetaJson || '';

    logSheet.appendRow([
      leaveId,
      form.empId,
      form.fullName,
      form.leaveType,
      _normalizeDateToISO(form.startDate),
      _normalizeDateToISO(form.endDate || form.startDate),
      form.startTime || '-',
      form.endTime || '-',
      totalDays,
      totalHours,
      form.reason,
      form.substituteInfo || 'ไม่มีคาบสอนในวันที่ลา',
      attachUrl,
      'รอดำเนินการ',
      'รอดำเนินการ',
      'รอดำเนินการ',
      'รอดำเนินการ',
      form.signerName || '',
      extraMetaJson,
      timestamp
    ]);

    clearSystemCache([CONFIG.SHEETS.LOGS]);
    return { status: 'success', message: `ยื่นคำร้องสำเร็จ (คำนวณเวลาทำการจริง: ${totalDays > 0 ? totalDays + ' วัน' : totalHours + ' ชม.'})` };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  } finally {
    lock.releaseLock();
  }
}

function processApproval(leaveId, step, action, remark, signerName) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const ss = DB_getSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEETS.LOGS);
    const data = sheet.getDataRange().getDisplayValues();
    
    let rowIndex = -1, rowData = null;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === leaveId) {
        rowIndex = i + 1;
        rowData = data[i];
        break;
      }
    }

    if (rowIndex === -1) return { status: 'error', message: 'ไม่พบรายการคำร้อง' };

    const empId = rowData[1];
    const leaveType = rowData[3];
    const totalDays = parseFloat(rowData[8]) || 0;
    const prevOverallStatus = rowData[13];
    const wasFullyApproved = (prevOverallStatus === 'อนุมัติ' || prevOverallStatus === 'อนุมัติเรียบร้อย');

    const now = new Date();
    const thaiDay = String(now.getDate()).padStart(2, '0');
    const thaiMonth = String(now.getMonth() + 1).padStart(2, '0');
    const thaiYear = _normalizeYearToBE(now.getFullYear());
    const timestamp = `${thaiDay}/${thaiMonth}/${thaiYear} ${Utilities.formatDate(now, 'GMT+7', 'HH:mm')}`;

    let s1 = rowData[14];
    let s2 = rowData[15];
    let s3 = rowData[16];

    if (action === 'UNAPPROVE') {
      if (step === 'HR') s1 = 'รอดำเนินการ';
      else if (step === 'ACADEMIC') s2 = 'รอดำเนินการ';
      else if (step === 'DIRECTOR') s3 = 'รอดำเนินการ';
    } else if (action === 'APPROVE') {
      if (step === 'HR') s1 = 'อนุมัติแล้ว (' + timestamp + ')';
      else if (step === 'ACADEMIC') s2 = 'อนุมัติแล้ว (' + timestamp + ')';
      else if (step === 'DIRECTOR') {
        s3 = 'อนุมัติแล้ว (' + timestamp + ')';
        if (signerName) sheet.getRange(rowIndex, 18).setValue(signerName);
      }
    }

    sheet.getRange(rowIndex, 15, 1, 3).setValues([[s1, s2, s3]]);

    const isS1Done = (s1 && s1 !== 'รอดำเนินการ');
    const isS2Done = (s2 && s2 !== 'รอดำเนินการ');
    const isS3Done = (s3 && s3 !== 'รอดำเนินการ');
    const isNowFullyApproved = (isS1Done && isS2Done && isS3Done);

    let nextStatus = 'รอดำเนินการ';
    if (isNowFullyApproved) {
      nextStatus = 'อนุมัติ';
    } else if (isS1Done && isS2Done) {
      nextStatus = 'รอผู้อำนวยการอนุมัติ';
    } else if (isS1Done) {
      nextStatus = 'รอหัวหน้างานวิชาการอนุมัติ';
    }

    sheet.getRange(rowIndex, 14).setValue(nextStatus);

    if (!wasFullyApproved && isNowFullyApproved && totalDays > 0) {
      updateLeaveQuota(empId, leaveType, totalDays);
    } else if (wasFullyApproved && !isNowFullyApproved && totalDays > 0) {
      updateLeaveQuota(empId, leaveType, -totalDays);
    }

    clearSystemCache([CONFIG.SHEETS.LOGS, CONFIG.SHEETS.QUOTA]);
    return {
      status: 'success',
      fullyApproved: isNowFullyApproved,
      leaveId: leaveId,
      message: isNowFullyApproved
        ? 'อนุมัติครบทุกขั้นตอนแล้ว กรุณาพิมพ์เอกสารเพื่อใช้เป็นหลักฐานราชการ'
        : (action === 'UNAPPROVE' ? 'ยกเลิกการอนุมัติขั้นตอนนี้เรียบร้อยแล้ว' : 'บันทึกการอนุมัติเรียบร้อยแล้ว')
    };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  } finally {
    lock.releaseLock();
  }
}

function deleteLeaveRequest(leaveId, actorName) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const ss = DB_getSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEETS.LOGS);
    const data = sheet.getDataRange().getDisplayValues();

    let rowIndex = -1, rowData = null;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === leaveId) {
        rowIndex = i + 1;
        rowData = data[i];
        break;
      }
    }

    if (rowIndex === -1) return { status: 'error', message: 'ไม่พบรายการคำขอนี้' };
    const currentStatus = rowData[13];
    const empId = rowData[1];
    const leaveType = rowData[3];
    const totalDays = parseFloat(rowData[8]) || 0;

    if ((currentStatus === 'อนุมัติ' || currentStatus === 'อนุมัติเรียบร้อย') && totalDays > 0) {
      updateLeaveQuota(empId, leaveType, -totalDays);
    }

    sheet.deleteRow(rowIndex);
    clearSystemCache([CONFIG.SHEETS.LOGS, CONFIG.SHEETS.QUOTA]);
    return { status: 'success', message: 'ลบคำขอเรียบร้อยแล้ว' };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  } finally {
    lock.releaseLock();
  }
}

function updateLeaveQuota(empId, leaveType, daysToAdd) {
  if (daysToAdd === 0) return;
  const sheet = DB_getSpreadsheet().getSheetByName(CONFIG.SHEETS.QUOTA);
  if (!sheet) return;
  const data = sheet.getDataRange().getDisplayValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === empId) {
      let row = i + 1;
      if (leaveType && String(leaveType).indexOf('ลาป่วย') !== -1) {
        let nextVal = Math.max(0, (parseFloat(data[i][3]) || 0) + daysToAdd);
        sheet.getRange(row, 4).setValue(nextVal);
      } else if (leaveType && String(leaveType).indexOf('ลากิจ') !== -1) {
        let nextVal = Math.max(0, (parseFloat(data[i][5]) || 0) + daysToAdd);
        sheet.getRange(row, 6).setValue(nextVal);
      }
      break;
    }
  }
}

function getOfficialLeaveFormHtml(leaveId) {
  const logs = getSheetDataAsObjects(CONFIG.SHEETS.LOGS);
  const school = School_getInfo();

  const leaveIndex = logs.findIndex(l => l.LeaveID === leaveId);
  if (leaveIndex === -1) return '<h3>ไม่พบข้อมูลคำร้อง</h3>';
  const leave = logs[leaveIndex];

  // Optimize: Targeted single user lookup instead of parsing 7 full sheets with getAllUsersSummary()
  const teachers = Staff_getAll();
  const user = teachers.find(u => u.id === leave.EmpID || u.EmpID === leave.EmpID) || {};
  const isPermit = leave.LeaveType.includes('3 ชม.');
  const schoolName = school.schoolName || 'โรงเรียนชุมชนบ้านตะขบ';
  const affiliation = school.affiliation || 'สำนักงานเขตพื้นที่การศึกษาประถมศึกษานครราชสีมา เขต 3';
  const directorName = leave.SignerName || school.directorName || 'นายธีรศักดิ์ มโนธรรม';
  const directorPos = school.directorPosition || 'ผู้อำนวยการโรงเรียนชุมชนบ้านตะขบ';

  let meta = {};
  try {
    if (leave.Remark && String(leave.Remark).trim().startsWith('{')) {
      meta = JSON.parse(leave.Remark);
    }
  } catch (e) {}

  const writeDate = _formatThaiDateParts(leave.Timestamp);
  const startDateParts = _formatThaiDateParts(leave.StartDate);
  const endDateParts = _formatThaiDateParts(leave.EndDate);

  const isApproved = (leave.Status === 'อนุมัติ' || leave.Status === 'อนุมัติเรียบร้อย');
  const isRejected = (leave.Status === 'ไม่อนุมัติ');
  const hrDone = (leave.Step1_HR && leave.Step1_HR !== 'รอดำเนินการ');
  const acadDone = (leave.Step2_Academic && leave.Step2_Academic !== 'รอดำเนินการ');

  const boxCheck = (checked) => `<span style="display:inline-block; width:13px; height:13px; border:1px solid #000; text-align:center; line-height:12px; font-size:12px; font-weight:bold; vertical-align:middle; margin-right:3px;">${checked ? '✓' : '&nbsp;'}</span>`;

  if (isPermit) {
    const place = meta.place || '-';
    const hasWorkload = (meta.hasWorkload === 'มี');
    const workloads = Array.isArray(meta.workloads) ? meta.workloads : [];
    const r1 = workloads[0] || {};
    const r2 = workloads[1] || {};
    const r3 = workloads[2] || {};

    return `
      <div style="font-family:'Sarabun', sans-serif; width:190mm; max-height:276mm; margin:0 auto; padding:6mm 8mm; box-sizing:border-box; color:#000; background:#fff; font-size:13.5px; line-height:1.55;">
        <div style="text-align:center; font-weight:bold; font-size:15px;">
          แบบขออนุญาตออกนอกบริเวณโรงเรียนในเวลาราชการของข้าราชการครูและบุคลากรทางการศึกษา<br>
          (กรณีไม่เกิน 3 ชั่วโมง)
        </div>

        <div style="text-align:right; margin-top:8px;">
          เขียนที่ <b>${sanitizeStr(schoolName)}</b><br>
          วันที่ <b>${writeDate.day}</b> เดือน <b>${writeDate.month}</b> พ.ศ. <b>${writeDate.year}</b>
        </div>

        <div style="margin-top:6px;">
          <b>เรื่อง</b> &nbsp;ขออนุญาตออกนอกบริเวณโรงเรียน<br>
          <b>เรียน</b> &nbsp;ผู้อำนวยการ${sanitizeStr(schoolName)}
        </div>

        <div style="text-indent:45px; margin-top:6px;">
          ข้าพเจ้า <b>${sanitizeStr(leave.FullName)}</b> &nbsp;&nbsp;ตำแหน่ง <b>${sanitizeStr(user.Position || '-')}</b>
        </div>
        <div>
          ขออนุญาตออกนอกบริเวณโรงเรียน เพื่อ <u>${sanitizeStr(leave.Reason)}</u><br>
          ในวันที่ <b>${startDateParts.day}</b> เดือน <b>${startDateParts.month}</b> พ.ศ. <b>${startDateParts.year}</b> &nbsp;
          ระหว่างเวลา <b>${sanitizeStr(leave.StartTime)}</b> น. ถึง เวลา <b>${sanitizeStr(leave.EndTime)}</b> น. &nbsp;
          รวม <b>${sanitizeStr(leave.TotalHours)}</b> ชั่วโมง &nbsp;สถานที่ไป <u>${sanitizeStr(place)}</u>
        </div>

        <div style="margin-top:8px;">
          <b>ภาระงาน</b> &nbsp;&nbsp;${boxCheck(hasWorkload)} มี &nbsp;&nbsp;&nbsp;&nbsp;${boxCheck(!hasWorkload)} ไม่มี
        </div>

        <div style="margin-top:4px; padding-left:10px; line-height:1.8;">
          <div>1. ชั้น <u>&nbsp;${sanitizeStr(r1.cls || '..........')}&nbsp;</u> คาบที่ <u>&nbsp;${sanitizeStr(r1.period || '........')}&nbsp;</u> งานที่มอบหมาย <u>&nbsp;${sanitizeStr(r1.task || '...........................')}&nbsp;</u> ผู้สอนแทน <u>&nbsp;${sanitizeStr(r1.sub || '...........................')}&nbsp;</u> ลงชื่อผู้สอนแทน........................</div>
          <div>2. ชั้น <u>&nbsp;${sanitizeStr(r2.cls || '..........')}&nbsp;</u> คาบที่ <u>&nbsp;${sanitizeStr(r2.period || '........')}&nbsp;</u> งานที่มอบหมาย <u>&nbsp;${sanitizeStr(r2.task || '...........................')}&nbsp;</u> ผู้สอนแทน <u>&nbsp;${sanitizeStr(r2.sub || '...........................')}&nbsp;</u> ลงชื่อผู้สอนแทน........................</div>
          <div>3. ชั้น <u>&nbsp;${sanitizeStr(r3.cls || '..........')}&nbsp;</u> คาบที่ <u>&nbsp;${sanitizeStr(r3.period || '........')}&nbsp;</u> งานที่มอบหมาย <u>&nbsp;${sanitizeStr(r3.task || '...........................')}&nbsp;</u> ผู้สอนแทน <u>&nbsp;${sanitizeStr(r3.sub || '...........................')}&nbsp;</u> ลงชื่อผู้สอนแทน........................</div>
        </div>

        <div style="text-indent:45px; margin-top:6px;">จึงเรียนมาเพื่อโปรดทราบและพิจารณา</div>

        <div style="text-align:right; margin-top:10px; padding-right:25px;">
          ลงชื่อ....................................................... ผู้ขออนุญาต<br>
          ( <b>${sanitizeStr(leave.FullName)}</b> )<br>
          ตำแหน่ง <b>${sanitizeStr(user.Position || '-')}</b>
        </div>

        <table style="width:100%; border-collapse:collapse; margin-top:12px; color:#000;" border="1">
          <tr>
            <td style="width:50%; vertical-align:top; padding:8px 10px; text-align:left; color:#000; border:1px solid #000;">
              <div style="text-align:center; font-weight:bold; text-decoration:underline; margin-bottom:6px;">ตรวจเสนอเพื่อพิจารณา</div>
              <div>
                เห็นควร &nbsp;${boxCheck(hrDone)} อนุญาต &nbsp;&nbsp;${boxCheck(false)} ไม่อนุญาต เนื่องจาก.........................
              </div>
              <div style="text-align:center; margin-top:14px;">
                ลงชื่อ.......................................................<br>
                (นางสาวทัชชกร ช่วยจังหรีด)<br>
                ตำแหน่ง หัวหน้างานกลุ่มบริหารบุคคล<br>
                วันที่ ........../........../..........
              </div>
              <hr style="border:none; border-top:1px dashed #000; margin:10px 0;">
              <div>
                เห็นควร &nbsp;${boxCheck(acadDone)} อนุญาต &nbsp;&nbsp;${boxCheck(false)} ไม่อนุญาต เนื่องจาก.........................
              </div>
              <div style="text-align:center; margin-top:14px;">
                ลงชื่อ.......................................................<br>
                (นายพันธ์ธนัต ภวฤทธิ์นาคินทร์)<br>
                ตำแหน่ง หัวหน้างานกลุ่มบริหารวิชาการ<br>
                วันที่ ........../........../..........
              </div>
            </td>
            <td style="width:50%; vertical-align:top; padding:8px 10px; text-align:left; color:#000; border:1px solid #000;">
              <div style="text-align:center; font-weight:bold; text-decoration:underline; margin-bottom:6px;">ความเห็นผู้อำนวยการโรงเรียน</div>
              <div style="margin-top:10px; font-weight:bold;">คำสั่ง</div>
              <div style="margin-top:6px; padding-left:15px;">
                ${boxCheck(isApproved)} อนุญาต<br>
                ${boxCheck(isRejected)} ไม่อนุญาต เนื่องจาก <u>${sanitizeStr(meta.rejectReason || '....................................')}</u>
              </div>
              <div style="text-align:center; margin-top:55px;">
                ลงชื่อ.......................................................<br>
                (${sanitizeStr(directorName)})<br>
                ตำแหน่ง ${sanitizeStr(directorPos)}<br>
                วันที่ ........../........../..........
              </div>
            </td>
          </tr>
        </table>
      </div>
    `;
  }

  const isSick = (leave.LeaveType === 'ลาป่วย');
  const isPersonal = (leave.LeaveType !== 'ลาป่วย' && leave.LeaveType !== 'ลาคลอดบุตร');
  const isMaternity = (leave.LeaveType === 'ลาคลอดบุตร');
  const contactAddr = meta.contactAddress || user.phone || '-';

  let prevLeave = null;
  for (let i = leaveIndex - 1; i >= 0; i--) {
    if (logs[i].EmpID === leave.EmpID && !logs[i].LeaveType.includes('3 ชม.')) {
      prevLeave = logs[i];
      break;
    }
  }
  const prevIsSick = prevLeave && prevLeave.LeaveType === 'ลาป่วย';
  const prevIsPers = prevLeave && prevLeave.LeaveType !== 'ลาป่วย' && prevLeave.LeaveType !== 'ลาคลอดบุตร';
  const prevIsMat = prevLeave && prevLeave.LeaveType === 'ลาคลอดบุตร';
  const prevStart = prevLeave ? _formatThaiDateParts(prevLeave.StartDate).full : '.......................';
  const prevEnd = prevLeave ? _formatThaiDateParts(prevLeave.EndDate).full : '.......................';
  const prevDays = prevLeave ? prevLeave.TotalDays : '........';

  let priorSick = 0, priorPers = 0;
  for (let i = 0; i < leaveIndex; i++) {
    if (logs[i].EmpID === leave.EmpID && (logs[i].Status === 'อนุมัติ' || logs[i].Status === 'อนุมัติเรียบร้อย')) {
      if (logs[i].LeaveType === 'ลาป่วย') priorSick += (parseFloat(logs[i].TotalDays) || 0);
      if (logs[i].LeaveType === 'ลากิจ') priorPers += (parseFloat(logs[i].TotalDays) || 0);
    }
  }
  const curSick = isSick ? (parseFloat(leave.TotalDays) || 0) : 0;
  const curPers = isPersonal ? (parseFloat(leave.TotalDays) || 0) : 0;
  const totSick = priorSick + curSick;
  const totPers = priorPers + curPers;

  return `
    <div style="font-family:'Sarabun', sans-serif; width:190mm; max-height:276mm; margin:0 auto; padding:5mm 8mm; box-sizing:border-box; color:#000; background:#fff; font-size:13px; line-height:1.48;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start;">
        <div style="font-weight:bold; font-size:13px;">แฟ้ม บค 4/1</div>
        <div style="border:1px solid #000; padding:4px 10px; width:230px; font-size:12px; line-height:1.45;">
          <div style="text-align:center; font-weight:bold; border-bottom:1px solid #000; margin-bottom:3px;">${sanitizeStr(schoolName)}</div>
          <div>เลขที่รับ ..........................................</div>
          <div>วันที่ ............ / ................. / .............</div>
          <div>เวลา ................ น. ผู้รับ ....................</div>
        </div>
      </div>

      <div style="text-align:center; font-weight:bold; font-size:16px; margin-top:4px;">
        ใบลาป่วย ลาคลอดบุตร ลากิจส่วนตัว
      </div>

      <div style="text-align:right; margin-top:4px;">
        เขียนที่ <b>${sanitizeStr(schoolName)}</b><br>
        วันที่ <b>${writeDate.day}</b> เดือน <b>${writeDate.month}</b> พ.ศ. <b>${writeDate.year}</b>
      </div>

      <div style="margin-top:2px;">
        <b>เรื่อง</b> &nbsp;ขอ${sanitizeStr(leave.LeaveType)}<br>
        <b>เรียน</b> &nbsp;ผู้อำนวยการ${sanitizeStr(schoolName)}
      </div>

      <div style="text-indent:40px; margin-top:4px;">
        ข้าพเจ้า <b>${sanitizeStr(leave.FullName)}</b> &nbsp;&nbsp;ตำแหน่ง <b>${sanitizeStr(user.Position || '-')}</b><br>
        สังกัด <b>${sanitizeStr(affiliation)}</b>
      </div>

      <div style="margin-top:4px; padding-left:20px;">
        ขอลา &nbsp;&nbsp;
        ${boxCheck(isSick)} ป่วย &nbsp;เนื่องจาก <u>${isSick ? sanitizeStr(leave.Reason) : '.................................................................'}</u><br>
        <span style="padding-left:38px;">${boxCheck(isPersonal)} กิจส่วนตัว &nbsp;เนื่องจาก <u>${isPersonal ? sanitizeStr(leave.Reason) : '.........................................................'}</u></span><br>
        <span style="padding-left:38px;">${boxCheck(isMaternity)} คลอดบุตร</span>
      </div>

      <div style="margin-top:4px;">
        ตั้งแต่วันที่ <b>${startDateParts.full}</b> &nbsp;ถึงวันที่ <b>${endDateParts.full}</b> &nbsp;มีกำหนด <b>${sanitizeStr(leave.TotalDays)}</b> วัน<br>
        ข้าพเจ้าได้ลา &nbsp;${boxCheck(prevIsSick)} ป่วย &nbsp;${boxCheck(prevIsPers)} กิจส่วนตัว &nbsp;${boxCheck(prevIsMat)} คลอดบุตร &nbsp;
        ครั้งสุดท้ายตั้งแต่วันที่ <b>${prevStart}</b> ถึงวันที่ <b>${prevEnd}</b> มีกำหนด <b>${prevDays}</b> วัน<br>
        ในระหว่างลาจะติดต่อข้าพเจ้าได้ที่ <u>${sanitizeStr(contactAddr)}</u> &nbsp;(ผู้สอนแทน: <u>${sanitizeStr(leave.SubstituteInfo)}</u>)
      </div>

      <table style="width:100%; border-collapse:collapse; margin-top:8px; color:#000; border:none;" border="0">
        <tr>
          <td style="width:48%; vertical-align:top; padding-right:10px; border:none; text-align:left; color:#000;">
            <div style="font-weight:bold; text-align:center; margin-bottom:3px;">สถิติการลาในปีความดีความชอบนี้</div>
            <table style="width:100%; border-collapse:collapse; text-align:center; font-size:12px; color:#000;" border="1">
              <tr>
                <th style="padding:3px; color:#000; border:1px solid #000; background:#f5f5f5;">ประเภทลา</th>
                <th style="padding:3px; color:#000; border:1px solid #000; background:#f5f5f5;">ลามาแล้ว</th>
                <th style="padding:3px; color:#000; border:1px solid #000; background:#f5f5f5;">ลาครั้งนี้</th>
                <th style="padding:3px; color:#000; border:1px solid #000; background:#f5f5f5;">รวมเป็น</th>
              </tr>
              <tr>
                <td style="padding:3px; color:#000; border:1px solid #000;">ป่วย</td>
                <td style="padding:3px; color:#000; border:1px solid #000;">${priorSick}</td>
                <td style="padding:3px; color:#000; border:1px solid #000;">${curSick}</td>
                <td style="padding:3px; color:#000; border:1px solid #000;">${totSick}</td>
              </tr>
              <tr>
                <td style="padding:3px; color:#000; border:1px solid #000;">กิจส่วนตัว</td>
                <td style="padding:3px; color:#000; border:1px solid #000;">${priorPers}</td>
                <td style="padding:3px; color:#000; border:1px solid #000;">${curPers}</td>
                <td style="padding:3px; color:#000; border:1px solid #000;">${totPers}</td>
              </tr>
              <tr>
                <td style="padding:3px; color:#000; border:1px solid #000;">คลอดบุตร</td>
                <td style="padding:3px; color:#000; border:1px solid #000;">-</td>
                <td style="padding:3px; color:#000; border:1px solid #000;">-</td>
                <td style="padding:3px; color:#000; border:1px solid #000;">-</td>
              </tr>
            </table>

            <div style="font-weight:bold; text-align:center; margin:8px 0 3px 0;">สถิติการลาในปีงบประมาณนี้</div>
            <table style="width:100%; border-collapse:collapse; text-align:center; font-size:12px; color:#000;" border="1">
              <tr>
                <th style="padding:3px; color:#000; border:1px solid #000; background:#f5f5f5;">ประเภทลา</th>
                <th style="padding:3px; color:#000; border:1px solid #000; background:#f5f5f5;">ลามาแล้ว</th>
                <th style="padding:3px; color:#000; border:1px solid #000; background:#f5f5f5;">ลาครั้งนี้</th>
                <th style="padding:3px; color:#000; border:1px solid #000; background:#f5f5f5;">รวมเป็น</th>
              </tr>
              <tr>
                <td style="padding:3px; color:#000; border:1px solid #000;">ป่วย</td>
                <td style="padding:3px; color:#000; border:1px solid #000;">${priorSick}</td>
                <td style="padding:3px; color:#000; border:1px solid #000;">${curSick}</td>
                <td style="padding:3px; color:#000; border:1px solid #000;">${totSick}</td>
              </tr>
              <tr>
                <td style="padding:3px; color:#000; border:1px solid #000;">กิจส่วนตัว</td>
                <td style="padding:3px; color:#000; border:1px solid #000;">${priorPers}</td>
                <td style="padding:3px; color:#000; border:1px solid #000;">${curPers}</td>
                <td style="padding:3px; color:#000; border:1px solid #000;">${totPers}</td>
              </tr>
              <tr>
                <td style="padding:3px; color:#000; border:1px solid #000;">คลอดบุตร</td>
                <td style="padding:3px; color:#000; border:1px solid #000;">-</td>
                <td style="padding:3px; color:#000; border:1px solid #000;">-</td>
                <td style="padding:3px; color:#000; border:1px solid #000;">-</td>
              </tr>
            </table>

            <div style="text-align:center; margin-top:14px;">
              ลงชื่อ....................................................... ผู้ตรวจสอบ<br>
              (นางสาวทัชชกร ช่วยจังหรีด)<br>
              ตำแหน่ง ครูชำนาญการพิเศษ<br>
              วันที่ .......... เดือน ........................ พ.ศ. .............
            </div>
          </td>

          <td style="width:52%; vertical-align:top; padding-left:10px; border:none; text-align:center; color:#000;">
            <div>
              ขอแสดงความนับถือ<br><br>
              ลงชื่อ.......................................................<br>
              ( <b>${sanitizeStr(leave.FullName)}</b> )<br>
              ตำแหน่ง <b>${sanitizeStr(user.Position || '-')}</b>
            </div>

            <div style="margin-top:10px; text-align:left; border-top:1px dashed #000; padding-top:6px;">
              <div style="font-weight:bold; text-decoration:underline;">ความเห็นของผู้บังคับบัญชา</div>
              <div style="border-bottom:1px dotted #000; height:18px; margin-top:4px; text-align:center;">${isApproved ? 'อนุญาตให้ลาได้ตามสิทธิ์' : ''}</div>
              <div style="text-align:center; margin-top:12px;">
                ลงชื่อ.......................................................<br>
                (${sanitizeStr(directorName)})<br>
                ตำแหน่ง ${sanitizeStr(directorPos)}
              </div>
            </div>

            <div style="margin-top:10px; text-align:left; border-top:1px dashed #000; padding-top:6px;">
              <div style="font-weight:bold; text-decoration:underline;">คำสั่ง</div>
              <div style="text-align:center; margin:6px 0;">
                ${boxCheck(isApproved)} อนุญาต &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${boxCheck(isRejected)} ไม่อนุญาต
              </div>
              <div style="text-align:center; margin-top:12px;">
                ลงชื่อ.......................................................<br>
                (${sanitizeStr(directorName)})<br>
                ตำแหน่ง ${sanitizeStr(directorPos)}<br>
                วันที่ .......... เดือน ........................ พ.ศ. .............
              </div>
            </div>
          </td>
        </tr>
      </table>
    </div>
  `;
}

// =========================================================================
// PHASE 4 (4.1): พิมพ์แบบสรุปทะเบียนประวัติรายบุคคล (ก.พ. 7 ย่อ A4)
// =========================================================================
function getPersonnelPortfolioPrintHtml(empId) {
  const usersSummary = getAllUsersSummary();
  const school = School_getInfo();
  const u = usersSummary.find(x => x.EmpID === empId);
  if (!u) return '<h3>ไม่พบข้อมูลบุคลากร</h3>';

  const schoolName = school.schoolName || 'โรงเรียนชุมชนบ้านตะขบ';
  const affiliation = school.affiliation || 'สำนักงานเขตพื้นที่การศึกษาประถมศึกษานครราชสีมา เขต 3';
  const directorName = school.directorName || 'นายธีรศักดิ์ มโนธรรม';
  const ret = u.RetirementInfo || {};
  const todayParts = _formatThaiDateParts(Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd'));

  const eduRows = (u.EducationsHistory || []).map((e, i) => `
    <tr>
      <td style="padding:4px; border:1px solid #000; text-align:center;">${i + 1}</td>
      <td style="padding:4px; border:1px solid #000;">${sanitizeStr(e.DegreeLevel)} (${sanitizeStr(e.DegreeShort)})</td>
      <td style="padding:4px; border:1px solid #000;">${sanitizeStr(e.Major)}</td>
      <td style="padding:4px; border:1px solid #000;">${sanitizeStr(e.Institute)}</td>
      <td style="padding:4px; border:1px solid #000; text-align:center;">${sanitizeStr(e.GradYear)}</td>
    </tr>
  `).join('') || `<tr><td colspan="5" style="padding:4px; border:1px solid #000; text-align:center;">- ไม่มีข้อมูลในระบบ -</td></tr>`;

  const stdRows = (u.StandingsHistory || []).map((s, i) => `
    <tr>
      <td style="padding:4px; border:1px solid #000; text-align:center;">${i + 1}</td>
      <td style="padding:4px; border:1px solid #000;">${sanitizeStr(s.StandingLevel)}</td>
      <td style="padding:4px; border:1px solid #000; text-align:center;">${sanitizeStr(s.FormattedDate || s.EffectiveDate)}</td>
      <td style="padding:4px; border:1px solid #000;">${sanitizeStr(s.OrderNumber)}</td>
    </tr>
  `).join('') || `<tr><td colspan="4" style="padding:4px; border:1px solid #000; text-align:center;">- ไม่มีข้อมูลในระบบ -</td></tr>`;

  const licRows = (u.ActiveLicenses || []).map((l, i) => `
    <tr>
      <td style="padding:4px; border:1px solid #000; text-align:center;">${i + 1}</td>
      <td style="padding:4px; border:1px solid #000;">${sanitizeStr(l.type)}</td>
      <td style="padding:4px; border:1px solid #000; text-align:center;">${sanitizeStr(l.number)}</td>
      <td style="padding:4px; border:1px solid #000; text-align:center;">${sanitizeStr(l.issueDate)}</td>
      <td style="padding:4px; border:1px solid #000; text-align:center;">${sanitizeStr(l.expiryDate)} (${sanitizeStr(l.status)})</td>
    </tr>
  `).join('') || `<tr><td colspan="5" style="padding:4px; border:1px solid #000; text-align:center;">${sanitizeStr(u.LicenseDocStatus || '-')}</td></tr>`;

  return `
    <div style="font-family:'Sarabun', sans-serif; width:190mm; margin:0 auto; padding:6mm 8mm; box-sizing:border-box; color:#000; background:#fff; font-size:12.5px; line-height:1.5;">
      <div style="text-align:center; font-weight:bold; font-size:15.5px; border-bottom:2px solid #000; padding-bottom:6px; margin-bottom:10px;">
        แบบสรุปทะเบียนประวัติข้าราชการครูและบุคลากรทางการศึกษา (ก.พ. 7 ย่อ)<br>
        ${sanitizeStr(schoolName)} • ${sanitizeStr(affiliation)}
      </div>

      <table style="width:100%; border-collapse:collapse; margin-bottom:10px; font-size:12.5px; color:#000;" border="1">
        <tr>
          <td style="padding:5px 8px; border:1px solid #000; width:50%; text-align:left;"><b>ชื่อ-นามสกุล:</b> ${sanitizeStr(u.FullName)}</td>
          <td style="padding:5px 8px; border:1px solid #000; width:50%; text-align:left;"><b>รหัสบุคลากร (EmpID):</b> ${sanitizeStr(u.EmpID)}</td>
        </tr>
        <tr>
          <td style="padding:5px 8px; border:1px solid #000; text-align:left;"><b>ตำแหน่ง:</b> ${sanitizeStr(u.Position)} (${sanitizeStr(u.HighestStanding)})</td>
          <td style="padding:5px 8px; border:1px solid #000; text-align:left;"><b>เลขที่ตำแหน่ง:</b> ${sanitizeStr(u.PositionNo || 'ไม่มีข้อมูล')}</td>
        </tr>
        <tr>
          <td style="padding:5px 8px; border:1px solid #000; text-align:left;"><b>สมาชิกประเภทสามัญ เลขที่:</b> ${sanitizeStr(u.MemberID || 'ไม่มีข้อมูล')}</td>
          <td style="padding:5px 8px; border:1px solid #000; text-align:left;"><b>วันที่บรรจุเข้ารับราชการ:</b> ${sanitizeStr(u.StartDate || '-')}</td>
        </tr>
        <tr>
          <td style="padding:5px 8px; border:1px solid #000; text-align:left;"><b>วันเดือนปีเกิด:</b> ${sanitizeStr(ret.birthDateFormatted || '-')} (อายุ: ${sanitizeStr(ret.ageText || '-')})</td>
          <td style="padding:5px 8px; border:1px solid #000; text-align:left;"><b>วันเกษียณอายุราชการ:</b> ${sanitizeStr(ret.retireDateFormatted || '-')} (คงเหลือ: ${sanitizeStr(ret.remainingToRetireText || '-')})</td>
        </tr>
        <tr>
          <td style="padding:5px 8px; border:1px solid #000; text-align:left;"><b>กลุ่มสาระการเรียนรู้:</b> ${sanitizeStr(u.Department || '-')}</td>
          <td style="padding:5px 8px; border:1px solid #000; text-align:left;"><b>ฝ่ายงาน / ชั้นที่ปรึกษา:</b> ${sanitizeStr(u.Division || '-')} (${sanitizeStr(u.classLevel || '-')})</td>
        </tr>
      </table>

      <div style="font-weight:bold; margin:8px 0 4px 0;">1. ประวัติการศึกษา</div>
      <table style="width:100%; border-collapse:collapse; margin-bottom:8px; font-size:12px; color:#000;" border="1">
        <tr style="background:#f0f0f0;">
          <th style="padding:4px; border:1px solid #000; width:8%;">ลำดับ</th>
          <th style="padding:4px; border:1px solid #000; width:24%;">ระดับวุฒิการศึกษา</th>
          <th style="padding:4px; border:1px solid #000; width:26%;">สาขา / วิชาเอก</th>
          <th style="padding:4px; border:1px solid #000; width:30%;">สถาบันการศึกษา</th>
          <th style="padding:4px; border:1px solid #000; width:12%;">ปี พ.ศ. ที่จบ</th>
        </tr>
        ${eduRows}
      </table>

      <div style="font-weight:bold; margin:8px 0 4px 0;">2. ประวัติการดำรงตำแหน่งและวิทยฐานะ</div>
      <table style="width:100%; border-collapse:collapse; margin-bottom:8px; font-size:12px; color:#000;" border="1">
        <tr style="background:#f0f0f0;">
          <th style="padding:4px; border:1px solid #000; width:8%;">ลำดับ</th>
          <th style="padding:4px; border:1px solid #000; width:36%;">ตำแหน่ง / วิทยฐานะ</th>
          <th style="padding:4px; border:1px solid #000; width:22%;">วันที่มีผล</th>
          <th style="padding:4px; border:1px solid #000; width:34%;">เลขที่คำสั่งอ้างอิง</th>
        </tr>
        ${stdRows}
      </table>

      <div style="font-weight:bold; margin:8px 0 4px 0;">3. ข้อมูลใบอนุญาตประกอบวิชาชีพและวุฒิทางลูกเสือ (วุฒิลูกเสือสูงสุด: ${sanitizeStr(u.HighestScout)} เลขที่ ${sanitizeStr(u.ScoutCert)})</div>
      <table style="width:100%; border-collapse:collapse; margin-bottom:10px; font-size:12px; color:#000;" border="1">
        <tr style="background:#f0f0f0;">
          <th style="padding:4px; border:1px solid #000; width:8%;">ลำดับ</th>
          <th style="padding:4px; border:1px solid #000; width:34%;">ประเภทใบอนุญาตประกอบวิชาชีพ</th>
          <th style="padding:4px; border:1px solid #000; width:20%;">เลขที่ใบอนุญาต</th>
          <th style="padding:4px; border:1px solid #000; width:16%;">วันออกเอกสาร</th>
          <th style="padding:4px; border:1px solid #000; width:22%;">วันหมดอายุ / สถานะ</th>
        </tr>
        ${licRows}
      </table>

      <div style="display:flex; justify-content:space-between; margin-top:18px; text-align:center;">
        <div style="width:45%;">
          ขอรับรองว่าข้อมูลข้างต้นถูกต้องเป็นจริง<br><br>
          ลงชื่อ....................................................... เจ้าของประวัติ<br>
          ( ${sanitizeStr(u.FullName)} )<br>
          วันที่ ${todayParts.full}
        </div>
        <div style="width:45%;">
          ตรวจสอบความถูกต้องเรียบร้อยแล้ว<br><br>
          ลงชื่อ....................................................... ผู้รับรอง<br>
          ( ${sanitizeStr(directorName)} )<br>
          ผู้อำนวยการ${sanitizeStr(schoolName)}
        </div>
      </div>
    </div>
  `;
}

// =========================================================================
// PHASE 4 (4.2): พิมพ์รายงานสรุปสถิติการลาทั้งโรงเรียน แยกตามรอบประเมิน (ช่วงที่ 1 / ช่วงที่ 2 / ทั้งปี)
// =========================================================================
function getSchoolLeaveSummaryPrintHtml(periodMode) {
  const usersSummary = getAllUsersSummary();
  const logs = getSheetDataAsObjects(CONFIG.SHEETS.LOGS);
  const school = School_getInfo();
  const fiscalData = getFiscalYearsList();
  const activeFy = (fiscalData && fiscalData.active) ? fiscalData.active : {};

  const fyYearBE = parseInt(activeFy.yearBE || '2570', 10);
  const fyYearCE = fyYearBE - 543;
  const prevYearCE = fyYearCE - 1;

  let periodTitle = `ประจำปีงบประมาณ พ.ศ. ${fyYearBE} (1 ตุลาคม ${fyYearBE - 1} ถึง 30 กันยายน ${fyYearBE})`;
  let rangeStartNum = prevYearCE * 10000 + 1001; // YYYY-10-01
  let rangeEndNum = fyYearCE * 10000 + 930;    // YYYY-09-30

  if (periodMode === 'PERIOD_1') {
    periodTitle = `รอบที่ 1 (ช่วงที่ 1: 1 ตุลาคม ${fyYearBE - 1} ถึง 31 มีนาคม ${fyYearBE})`;
    rangeStartNum = prevYearCE * 10000 + 1001;
    rangeEndNum = fyYearCE * 10000 + 331;
  } else if (periodMode === 'PERIOD_2') {
    periodTitle = `รอบที่ 2 (ช่วงที่ 2: 1 เมษายน ${fyYearBE} ถึง 30 กันยายน ${fyYearBE})`;
    rangeStartNum = fyYearCE * 10000 + 401;
    rangeEndNum = fyYearCE * 10000 + 930;
  }

  const schoolName = school.schoolName || 'โรงเรียนชุมชนบ้านตะขบ';
  const affiliation = school.affiliation || 'สำนักงานเขตพื้นที่การศึกษาประถมศึกษานครราชสีมา เขต 3';
  const directorName = school.directorName || 'นายธีรศักดิ์ มโนธรรม';
  const todayParts = _formatThaiDateParts(Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd'));

  const activeStaff = usersSummary.filter(u => u.status !== 'ย้าย/เกษียณ');

  const tableRows = activeStaff.map((u, idx) => {
    const empLogs = logs.filter(l => {
      if (l.EmpID !== u.EmpID) return false;
      if (l.Status !== 'อนุมัติ' && l.Status !== 'อนุมัติเรียบร้อย') return false;
      const d = _safeParseLocalDate(l.StartDate);
      if (!d || isNaN(d.getTime())) return true;
      const num = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
      return (num >= rangeStartNum && num <= rangeEndNum);
    });

    let sickC = 0, sickD = 0;
    let persC = 0, persD = 0;
    let otherC = 0, otherD = 0;
    let permC = 0, permH = 0;

    empLogs.forEach(l => {
      if (l.LeaveType === 'ลาป่วย') {
        sickC++; sickD += (parseFloat(l.TotalDays) || 0);
      } else if (l.LeaveType === 'ลากิจ') {
        persC++; persD += (parseFloat(l.TotalDays) || 0);
      } else if (l.LeaveType && l.LeaveType.includes('3 ชม.')) {
        permC++; permH += (parseFloat(l.TotalHours) || 0);
      } else {
        otherC++; otherD += (parseFloat(l.TotalDays) || 0);
      }
    });

    return `
      <tr>
        <td style="padding:4px; border:1px solid #000; text-align:center;">${idx + 1}</td>
        <td style="padding:4px; border:1px solid #000; text-align:center;">${sanitizeStr(u.PositionNo || u.EmpID)}</td>
        <td style="padding:4px 6px; border:1px solid #000; text-align:left;">${sanitizeStr(u.FullName)}</td>
        <td style="padding:4px; border:1px solid #000; text-align:center;">${sanitizeStr(u.Position)}</td>
        <td style="padding:4px; border:1px solid #000; text-align:center;">${sickC} / ${sickD}</td>
        <td style="padding:4px; border:1px solid #000; text-align:center;">${persC} / ${persD}</td>
        <td style="padding:4px; border:1px solid #000; text-align:center;">${otherC} / ${otherD}</td>
        <td style="padding:4px; border:1px solid #000; text-align:center;">${permC} / ${Number(permH.toFixed(2))}</td>
        <td style="padding:4px; border:1px solid #000; text-align:center;"><b>${sickD + persD + otherD}</b></td>
      </tr>
    `;
  }).join('');

  return `
    <div style="font-family:'Sarabun', sans-serif; width:190mm; margin:0 auto; padding:6mm 8mm; box-sizing:border-box; color:#000; background:#fff; font-size:12px; line-height:1.45;">
      <div style="text-align:center; font-weight:bold; font-size:15px; margin-bottom:8px;">
        แบบสรุปสถิติการมาปฏิบัติราชการและการลาของข้าราชการครูและบุคลากรทางการศึกษา<br>
        ${sanitizeStr(schoolName)} • ${sanitizeStr(affiliation)}<br>
        <span style="font-size:13.5px;">${sanitizeStr(periodTitle)}</span>
      </div>

      <table style="width:100%; border-collapse:collapse; font-size:11.5px; color:#000;" border="1">
        <thead>
          <tr style="background:#f0f0f0;">
            <th style="padding:4px; border:1px solid #000; width:6%;">ที่</th>
            <th style="padding:4px; border:1px solid #000; width:11%;">เลขที่ตำแหน่ง</th>
            <th style="padding:4px; border:1px solid #000; width:24%;">ชื่อ - นามสกุล</th>
            <th style="padding:4px; border:1px solid #000; width:15%;">ตำแหน่ง</th>
            <th style="padding:4px; border:1px solid #000; width:9%;">ลาป่วย<br>(ครั้ง/วัน)</th>
            <th style="padding:4px; border:1px solid #000; width:9%;">ลากิจ<br>(ครั้ง/วัน)</th>
            <th style="padding:4px; border:1px solid #000; width:9%;">ลาอื่นๆ<br>(ครั้ง/วัน)</th>
            <th style="padding:4px; border:1px solid #000; width:9%;">ขออนุญาต<br>(ครั้ง/ชม.)</th>
            <th style="padding:4px; border:1px solid #000; width:8%;">รวมวันลา<br>(วัน)</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>

      <div style="display:flex; justify-content:space-between; margin-top:20px; text-align:center; font-size:12.5px;">
        <div style="width:45%;">
          ขอรับรองว่าสถิติการลาข้างต้นถูกต้องตามทะเบียนจริง<br><br>
          ลงชื่อ....................................................... ผู้สรุปรายงาน<br>
          (นางสาวทัชชกร ช่วยจังหรีด)<br>
          หัวหน้างานกลุ่มบริหารงานบุคคล
        </div>
        <div style="width:45%;">
          ทราบและรับรองข้อมูล<br><br>
          ลงชื่อ....................................................... ผู้อำนวยการ<br>
          ( ${sanitizeStr(directorName)} )<br>
          ผู้อำนวยการ${sanitizeStr(schoolName)}<br>
          วันที่ ${todayParts.full}
        </div>
      </div>
    </div>
  `;
}