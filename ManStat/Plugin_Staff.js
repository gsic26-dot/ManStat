var TEACHER_HEADERS = [
  "Teacher_ID", "Name", "Email", "Phone", "Class_Level",
  "Role", "Duty_Day", "Password", "Access_Level", "Status",
  "StartDate", "Department", "EmpType", "IDCard", "Division",
  "Position_No", "Member_ID", "BirthDate"
];

function _normalizeAccessLevel(val) {
  var s = String(val || "User").trim();
  if (s === "Super Admin" || s.toLowerCase() === "superuser") return "Superuser";
  return s;
}

function _isValidEmailServer(emailStr) {
  var s = String(emailStr || "").trim();
  if (!s) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function _formatPhoneString(phoneVal) {
  var p = String(phoneVal || "").trim().replace(/^'+/, "");
  if (!p) return "";
  if (/^[1-9]\d{8}$/.test(p)) p = "0" + p;
  return p;
}

// =========================================================================
// SHA-256 PASSWORD SECURITY & AUTO-MIGRATION
// =========================================================================
function _isHashedPassword(passStr) {
  var s = String(passStr || "").trim();
  return /^sha256\$[a-f0-9]{64}$/i.test(s);
}

function _hashPasswordSHA256(plainText) {
  var s = String(plainText || "").trim();
  if (!s) s = "123456";
  if (_isHashedPassword(s)) return s.toLowerCase();
  var rawBytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8);
  var hex = rawBytes.map(function(b) {
    var v = (b < 0) ? b + 256 : b;
    return ("0" + v.toString(16)).slice(-2);
  }).join("");
  return "sha256$" + hex;
}

function _verifyPasswordMatch(storedPass, inputPlainPass) {
  var stored = String(storedPass || "123456").trim();
  var input = String(inputPlainPass || "").trim();
  var masterPass = (typeof getSuperuserPass === "function") ? getSuperuserPass() : (CONFIG.SUPERUSER_PASS || "44123130114");
  if (input === masterPass) return true;
  if (_isHashedPassword(stored)) {
    return stored.toLowerCase() === _hashPasswordSHA256(input);
  }
  return stored === input;
}

function migrateAllPasswordsToSHA256(actorIdentifier) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var sheet = _getTeacherSheetAndEnsureHeaders();
    var data = sheet.getDataRange().getDisplayValues();
    if (data.length <= 1) return { status: 'success', migratedCount: 0, message: 'ไม่มีข้อมูลบุคลากรให้เข้ารหัส' };

    var headerMap = _buildHeaderMapFromRow(data[0]);
    var idxPass = headerMap["Password"] !== undefined ? headerMap["Password"] : 7;
    var migratedCount = 0;

    for (var i = 1; i < data.length; i++) {
      var curPass = String(data[i][idxPass] || "123456").trim();
      if (!_isHashedPassword(curPass)) {
        var hashed = _hashPasswordSHA256(curPass);
        sheet.getRange(i + 1, idxPass + 1).setNumberFormat("@").setValue(hashed);
        migratedCount++;
      }
    }
    if (typeof clearSystemCache === 'function') clearSystemCache([CONFIG.SHEETS.TEACHERS]);
    return {
      status: 'success',
      migratedCount: migratedCount,
      message: 'เข้ารหัสรหัสผ่านด้วย SHA-256 สำเร็จจำนวน ' + migratedCount + ' บัญชี'
    };
  } catch (e) {
    return { status: 'error', message: 'เกิดข้อผิดพลาดในการทำ SHA-256 Migration: ' + e.message };
  } finally {
    lock.releaseLock();
  }
}

// =========================================================================
// SELF-CONTAINED DATE ENGINE
// =========================================================================
function _normalizeYearToBE(rawYear) {
  var y = parseInt(rawYear, 10);
  if (isNaN(y)) return rawYear;
  while (y >= 2900) {
    y -= 543;
  }
  if (y > 1800 && y < 2400) {
    y += 543;
  }
  return y;
}

function _normalizeYearToCE(rawYear) {
  var y = parseInt(rawYear, 10);
  if (isNaN(y)) return rawYear;
  while (y >= 2900) {
    y -= 543;
  }
  if (y >= 2400) {
    y -= 543;
  }
  return y;
}

function _internalParseDate(dateVal) {
  if (!dateVal || dateVal === '-') return null;
  if (Object.prototype.toString.call(dateVal) === '[object Date]') {
    if (isNaN(dateVal.getTime())) return null;
    return new Date(_normalizeYearToCE(dateVal.getFullYear()), dateVal.getMonth(), dateVal.getDate(), 0, 0, 0);
  }
  var s = String(dateVal).trim().split(' ')[0];
  if (!s) return null;

  if (s.indexOf('-') !== -1) {
    var p = s.split('-');
    if (p.length === 3) {
      var y1 = _normalizeYearToCE(p[0]);
      var m1 = parseInt(p[1], 10) - 1;
      var d1 = parseInt(p[2], 10);
      var dt1 = new Date(y1, m1, d1, 0, 0, 0);
      return isNaN(dt1.getTime()) ? null : dt1;
    }
  }
  if (s.indexOf('/') !== -1) {
    var p2 = s.split('/');
    if (p2.length === 3) {
      var d2 = parseInt(p2[0], 10);
      var m2 = parseInt(p2[1], 10) - 1;
      var y2 = _normalizeYearToCE(p2[2]);
      var dt2 = new Date(y2, m2, d2, 0, 0, 0);
      return isNaN(dt2.getTime()) ? null : dt2;
    }
  }
  var fallback = new Date(s);
  if (!isNaN(fallback.getTime())) {
    return new Date(_normalizeYearToCE(fallback.getFullYear()), fallback.getMonth(), fallback.getDate(), 0, 0, 0);
  }
  return null;
}

function _safeParseLocalDate(dateVal) {
  return _internalParseDate(dateVal);
}

function _formatDateSlashBE(dateVal) {
  if (!dateVal || dateVal === '-') return '-';
  var d = _internalParseDate(dateVal);
  if (d && !isNaN(d.getTime())) {
    var dd = String(d.getDate()).padStart(2, '0');
    var mm = String(d.getMonth() + 1).padStart(2, '0');
    var yyBE = _normalizeYearToBE(d.getFullYear());
    return dd + '/' + mm + '/' + yyBE;
  }
  return String(dateVal).trim();
}

function _normalizeDateToISO(dateVal) {
  if (!dateVal || dateVal === '-') return '';
  var d = _internalParseDate(dateVal);
  if (!d || isNaN(d.getTime())) return '';
  var yyyy = _normalizeYearToCE(d.getFullYear());
  var mm = String(d.getMonth() + 1).padStart(2, '0');
  var dd = String(d.getDate()).padStart(2, '0');
  return yyyy + '-' + mm + '-' + dd;
}

function _diffYMD(startDate, endDate) {
  if (!startDate || !endDate || isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || endDate < startDate) {
    return { years: 0, months: 0, days: 0, text: '0 ปี 0 เดือน 0 วัน' };
  }
  var years = endDate.getFullYear() - startDate.getFullYear();
  var months = endDate.getMonth() - startDate.getMonth();
  var days = endDate.getDate() - startDate.getDate();

  if (days < 0) {
    months--;
    var prevMonthLastDay = new Date(endDate.getFullYear(), endDate.getMonth(), 0).getDate();
    days += prevMonthLastDay;
  }
  if (months < 0) {
    years--;
    months += 12;
  }
  return {
    years: years,
    months: months,
    days: days,
    text: years + ' ปี ' + months + ' เดือน ' + days + ' วัน'
  };
}

function _calculateAgeAndRetirement(birthDateVal) {
  var emptyResult = {
    hasBirthDate: false,
    birthDateISO: '',
    birthDateFormatted: '-',
    ageYears: 0,
    ageMonths: 0,
    ageDays: 0,
    ageText: '-',
    retireDateISO: '',
    retireDateFormatted: '-',
    retireYearBE: '-',
    ageAtRetirementText: '-',
    remainingToRetireText: '-',
    isRetiredByAge: false,
    isOctToDecRuleApplied: false
  };

  if (!birthDateVal || birthDateVal === '-') return emptyResult;
  var bDate = _internalParseDate(birthDateVal);
  if (!bDate || isNaN(bDate.getTime())) return emptyResult;

  var today = new Date();
  today.setHours(0, 0, 0, 0);

  var currentAge = _diffYMD(bDate, today);

  var bMonth = bDate.getMonth() + 1;
  var isOctToDec = (bMonth >= 10 && bMonth <= 12);
  var retireYearCE = bDate.getFullYear() + 60 + (isOctToDec ? 1 : 0);
  var retireYearBE = retireYearCE + 543;
  var retireDateObj = new Date(retireYearCE, 8, 30, 0, 0, 0);

  var ageAtRetire = _diffYMD(bDate, retireDateObj);
  var isRetired = (today > retireDateObj);
  var remainObj = isRetired
    ? { years: 0, months: 0, days: 0, text: 'เกษียณอายุราชการแล้ว' }
    : _diffYMD(today, retireDateObj);

  return {
    hasBirthDate: true,
    birthDateISO: _normalizeDateToISO(birthDateVal),
    birthDateFormatted: _formatDateSlashBE(birthDateVal),
    ageYears: currentAge.years,
    ageMonths: currentAge.months,
    ageDays: currentAge.days,
    ageText: currentAge.text,
    retireDateISO: retireYearCE + '-09-30',
    retireDateFormatted: '30/09/' + retireYearBE,
    retireYearBE: String(retireYearBE),
    ageAtRetirementText: ageAtRetire.text,
    remainingToRetireText: remainObj.text,
    isRetiredByAge: isRetired,
    isOctToDecRuleApplied: isOctToDec
  };
}

// =========================================================================
// FISCAL YEAR ENGINE
// =========================================================================
function _ensureFiscalYearSheet() {
  var ss = DB_getSpreadsheet();
  var sheetName = (CONFIG.SHEETS && CONFIG.SHEETS.FISCAL_YEAR) ? CONFIG.SHEETS.FISCAL_YEAR : 'FiscalYear';
  var sheet = ss.getSheetByName(sheetName);
  var headers = ['FiscalYear', 'StartDate', 'EndDate', 'Status'];

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers])
      .setFontWeight('bold')
      .setBackground('#101822')
      .setFontColor('#66c0f4');
    sheet.setFrozenRows(1);
  }

  if (sheet.getLastRow() <= 1) {
    var now = new Date();
    var curCE = now.getFullYear();
    var curMonth = now.getMonth() + 1;
    var fyBE = (curMonth >= 10) ? (curCE + 543 + 1) : (curCE + 543);
    var startBE = fyBE - 1;
    sheet.appendRow(['FY' + fyBE, '01/10/' + startBE, '30/09/' + fyBE, 'Active']);
  }
  return sheet;
}

function getFiscalYearsList() {
  try {
    var sheet = _ensureFiscalYearSheet();
    var data = sheet.getDataRange().getDisplayValues();
    var list = [];
    var activeFy = null;

    for (var i = 1; i < data.length; i++) {
      var fyCode = String(data[i][0] || '').trim();
      if (!fyCode) continue;
      var sDate = String(data[i][1] || '').trim();
      var eDate = String(data[i][2] || '').trim();
      var st = String(data[i][3] || 'Inactive').trim();
      var fyYearNum = fyCode.replace(/^FY/i, '');
      var prevYearNum = String((parseInt(fyYearNum, 10) || 2570) - 1);

      var item = {
        FiscalYear: fyCode,
        yearBE: fyYearNum,
        StartDate: sDate,
        EndDate: eDate,
        Status: st,
        period1Label: 'ช่วงที่ 1 (1 ต.ค. ' + prevYearNum + ' ถึง 31 มี.ค. ' + fyYearNum + ')',
        period2Label: 'ช่วงที่ 2 (1 เม.ย. ' + fyYearNum + ' ถึง 30 ก.ย. ' + fyYearNum + ')'
      };
      list.push(item);
      if (st === 'Active') activeFy = item;
    }

    if (!activeFy && list.length > 0) {
      activeFy = list[list.length - 1];
    }
    return {
      list: list,
      active: activeFy || {
        FiscalYear: 'FY2570',
        yearBE: '2570',
        StartDate: '01/10/2569',
        EndDate: '30/09/2570',
        Status: 'Active',
        period1Label: 'ช่วงที่ 1 (1 ต.ค. 2569 ถึง 31 มี.ค. 2570)',
        period2Label: 'ช่วงที่ 2 (1 เม.ย. 2570 ถึง 30 ก.ย. 2570)'
      }
    };
  } catch (e) {
    return {
      list: [],
      active: {
        FiscalYear: 'FY2570',
        yearBE: '2570',
        StartDate: '01/10/2569',
        EndDate: '30/09/2570',
        Status: 'Active',
        period1Label: 'ช่วงที่ 1 (1 ต.ค. 2569 ถึง 31 มี.ค. 2570)',
        period2Label: 'ช่วงที่ 2 (1 เม.ย. 2570 ถึง 30 ก.ย. 2570)'
      }
    };
  }
}

function createOrSetActiveFiscalYear(fyYearBEInput) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var sheet = _ensureFiscalYearSheet();
    var data = sheet.getDataRange().getDisplayValues();

    var cleanNum = parseInt(String(fyYearBEInput || '').replace(/\D/g, ''), 10);
    if (isNaN(cleanNum) || cleanNum < 2500 || cleanNum > 2700) {
      return { status: 'error', message: 'กรุณาระบุปีงบประมาณ พ.ศ. 4 หลักให้ถูกต้อง (เช่น 2570 หรือ 2571)' };
    }

    var targetCode = 'FY' + cleanNum;
    var startStr = '01/10/' + (cleanNum - 1);
    var endStr = '30/09/' + cleanNum;
    var foundRow = -1;

    for (var i = 1; i < data.length; i++) {
      var rowCode = String(data[i][0] || '').trim().toUpperCase();
      if (rowCode === targetCode) {
        foundRow = i + 1;
        sheet.getRange(i + 1, 4).setValue('Active');
      } else {
        sheet.getRange(i + 1, 4).setValue('Closed');
      }
    }

    if (foundRow === -1) {
      sheet.appendRow([targetCode, startStr, endStr, 'Active']);
    }

    try {
      if (typeof School_saveInfo === 'function') School_saveInfo({ fiscalYear: String(cleanNum) });
    } catch (e) {}

    return {
      status: 'success',
      fiscalData: getFiscalYearsList(),
      message: 'ตั้งค่าปีงบประมาณ ' + targetCode + ' (' + startStr + ' - ' + endStr + ') เป็นปีงบประมาณปัจจุบันเรียบร้อยแล้ว'
    };
  } catch (err) {
    return { status: 'error', message: 'ไม่สามารถตั้งค่าปีงบประมาณได้: ' + err.message };
  } finally {
    lock.releaseLock();
  }
}

function _getRolePrefix(roleName) {
  var r = String(roleName || "").trim();
  if (r.indexOf("ผู้อำนวยการ") !== -1 || r.indexOf("รองผู้อำนวยการ") !== -1) return "EXE";
  if (
    r.indexOf("ธุรการ") !== -1 || r.indexOf("การเงิน") !== -1 || r.indexOf("พัสดุ") !== -1 ||
    r.indexOf("ภารโรง") !== -1 || r.indexOf("รักษาความปลอดภัย") !== -1 || r.indexOf("รปภ") !== -1 ||
    r.indexOf("แม่บ้าน") !== -1 || r.indexOf("ทำความสะอาด") !== -1 || r.indexOf("ลูกจ้าง") !== -1
  ) {
    return "STF";
  }
  return "TCH";
}

function _formatStaffIdByPrefix(prefix, num) {
  var nStr = String(num);
  while (nStr.length < 3) nStr = "0" + nStr;
  return prefix + "-" + nStr;
}

function _buildHeaderMapFromRow(headerRow) {
  var map = {};
  if (!Array.isArray(headerRow)) return map;
  for (var c = 0; c < headerRow.length; c++) {
    var h = String(headerRow[c] || "").trim();
    if (h) map[h] = c;
  }
  return map;
}

function _findIdx(headerMap, keys, defaultIdx) {
  for (var i = 0; i < keys.length; i++) {
    if (headerMap[keys[i]] !== undefined) return headerMap[keys[i]];
  }
  return defaultIdx;
}

function _getTeacherSheetAndEnsureHeaders() {
  var ss = DB_getSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEETS.TEACHERS) ||
              ss.getSheetByName("Teachers") ||
              ss.getSheetByName("บุคลากร") ||
              ss.getSheetByName("รายชื่อครู") ||
              ss.getSheetByName("ข้อมูลบุคลากร") ||
              ss.getSheetByName("ทะเบียนประวัติ") ||
              ss.getSheetByName("ครูและบุคลากร") ||
              ss.getSheetByName("Staff") ||
              ss.getSheetByName("ครู") ||
              ss.getSheetByName("สถิติการลา") ||
              ss.getSheetByName("รายชื่อ");
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEETS.TEACHERS);
  }

  var lastCol = sheet.getLastColumn();
  if (lastCol === 0) {
    sheet.getRange(1, 1, 1, TEACHER_HEADERS.length)
      .setValues([TEACHER_HEADERS])
      .setFontWeight("bold")
      .setBackground("#101822")
      .setFontColor("#66c0f4");
    sheet.setFrozenRows(1);
    return sheet;
  }

  var headerRow = sheet.getRange(1, 1, 1, lastCol).getDisplayValues()[0];
  var headerMap = _buildHeaderMapFromRow(headerRow);
  var headersNeeded = [];

  if (headerMap["Position_No"] === undefined && headerMap["เลขที่ตำแหน่ง"] === undefined) headersNeeded.push("Position_No");
  if (headerMap["Member_ID"] === undefined && headerMap["สมาชิกประเภทสามัญ เลขที่"] === undefined) headersNeeded.push("Member_ID");
  if (headerMap["BirthDate"] === undefined && headerMap["วันเกิด"] === undefined) headersNeeded.push("BirthDate");

  if (headersNeeded.length > 0) {
    for (var k = 0; k < headersNeeded.length; k++) {
      var nextCol = sheet.getLastColumn() + 1;
      sheet.getRange(1, nextCol)
        .setValue(headersNeeded[k])
        .setFontWeight("bold")
        .setBackground("#101822")
        .setFontColor("#66c0f4");
    }
  }

  return sheet;
}

function _safeGetSheetObjects(sheetName) {
  try {
    if (typeof getSheetDataAsObjects === 'function') {
      var res = getSheetDataAsObjects(sheetName, false);
      if (Array.isArray(res)) return res;
    }
    var ss = DB_getSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) return [];
    var vals = sheet.getDataRange().getDisplayValues();
    if (!vals || vals.length <= 1) return [];
    var headers = vals[0].map(function(h) { return String(h || '').trim(); });
    var list = [];
    for (var r = 1; r < vals.length; r++) {
      var row = vals[r];
      var hasVal = row.some(function(cell) { return String(cell || '').trim() !== ''; });
      if (!hasVal) continue;
      var obj = {};
      for (var c = 0; c < headers.length; c++) {
        var key = headers[c];
        if (key) obj[key] = row[c];
      }
      list.push(obj);
    }
    return list;
  } catch (e) {
    return [];
  }
}

function Staff_getAll() {
  var sheet = _getTeacherSheetAndEnsureHeaders();
  if (!sheet) return [];

  var data = sheet.getDataRange().getDisplayValues();
  // หากชีตมีเฉพาะหัวตาราง ให้สร้างข้อมูลเริ่มต้นอัตโนมัติ
  if (!data || data.length <= 1) {
    if (typeof setupDatabase === 'function') {
      try {
        setupDatabase();
        data = sheet.getDataRange().getDisplayValues();
      } catch (e) {}
    }
    if (!data || data.length <= 1) return [];
  }

  var headerMap = _buildHeaderMapFromRow(data[0]);

  var idxId = _findIdx(headerMap, ["Teacher_ID", "EmpID", "รหัสบุคลากร", "รหัส"], 0);
  var idxName = _findIdx(headerMap, ["Name", "FullName", "ชื่อ-นามสกุล", "ชื่อ-สกุล"], 1);
  var idxEmail = _findIdx(headerMap, ["Email", "อีเมล"], 2);
  var idxPhone = _findIdx(headerMap, ["Phone", "เบอร์โทรศัพท์", "เบอร์โทร"], 3);
  var idxClass = _findIdx(headerMap, ["Class_Level", "ชั้นที่ปรึกษา"], 4);
  var idxRole = _findIdx(headerMap, ["Role", "Position", "ตำแหน่ง"], 5);
  var idxDuty = _findIdx(headerMap, ["Duty_Day", "เวรประจำวัน"], 6);
  var idxPass = _findIdx(headerMap, ["Password", "รหัสผ่าน"], 7);
  var idxAccess = _findIdx(headerMap, ["Access_Level", "สิทธิ์ระบบ", "ระดับสิทธิ์"], 8);
  var idxStatus = _findIdx(headerMap, ["Status", "สถานะ"], 9);
  var idxStart = _findIdx(headerMap, ["StartDate", "วันที่บรรจุ"], 10);
  var idxDept = _findIdx(headerMap, ["Department", "กลุ่มสาระการเรียนรู้", "กลุ่มสาระ"], 11);
  var idxEmpType = _findIdx(headerMap, ["EmpType", "ประเภทบุคลากร"], 12);
  var idxIdCard = _findIdx(headerMap, ["IDCard", "เลขบัตรประชาชน", "เลขประจำตัวประชาชน"], 13);
  var idxDiv = _findIdx(headerMap, ["Division", "ฝ่ายงาน"], 14);
  var idxPosNo = _findIdx(headerMap, ["Position_No", "PositionNo", "เลขที่ตำแหน่ง"], 15);
  var idxMemberId = _findIdx(headerMap, ["Member_ID", "MemberID", "สมาชิกประเภทสามัญ เลขที่"], 16);
  var idxBirthDate = _findIdx(headerMap, ["BirthDate", "วันเกิด", "วันเดือนปีเกิด"], 17);

  var result = [];
  var maxByPrefix = { EXE: 0, TCH: 0, STF: 0 };
  var usedIds = {};

  for (var i = 1; i < data.length; i++) {
    var rawId = String(data[i][idxId] || "").trim();
    if (rawId) {
      usedIds[rawId] = true;
      var m = rawId.match(/^([A-Z]{3})-(\d+)$/);
      if (m) {
        var pfx = m[1];
        var num = parseInt(m[2], 10);
        if (maxByPrefix[pfx] !== undefined && num > maxByPrefix[pfx]) {
          maxByPrefix[pfx] = num;
        }
      }
    }
  }

  var idUpdates = [];

  for (var j = 1; j < data.length; j++) {
    var tId = String(data[j][idxId] || "").trim();
    var tName = String(data[j][idxName] || "").trim();
    var tRole = String(data[j][idxRole] || "").trim() || "ครู";

    if (!tName) continue;

    if (!tId) {
      var targetPrefix = _getRolePrefix(tRole);
      maxByPrefix[targetPrefix] = (maxByPrefix[targetPrefix] || 0) + 1;
      tId = _formatStaffIdByPrefix(targetPrefix, maxByPrefix[targetPrefix]);
      while (usedIds[tId]) {
        maxByPrefix[targetPrefix]++;
        tId = _formatStaffIdByPrefix(targetPrefix, maxByPrefix[targetPrefix]);
      }
      usedIds[tId] = true;
      idUpdates.push({ row: j + 1, col: idxId + 1, id: tId });
    }

    var cleanPhone = _formatPhoneString(data[j][idxPhone]);
    var rawPosNo = idxPosNo < data[j].length ? String(data[j][idxPosNo] || "").replace(/^'+/, "").trim() : "";
    var rawMemberId = idxMemberId < data[j].length ? String(data[j][idxMemberId] || "").replace(/^'+/, "").trim() : "";
    var rawBirthDate = idxBirthDate < data[j].length ? String(data[j][idxBirthDate] || "").trim() : "";

    var isPosLikeEmpId = /^(EXE|TCH|STF)-\d+$/i.test(rawPosNo);
    var verifiedPosNo = (rawPosNo && !isPosLikeEmpId) ? rawPosNo : "";
    var normalizedAccess = _normalizeAccessLevel(data[j][idxAccess]);
    var storedPass = String(data[j][idxPass] || "123456").trim();

    result.push({
      id: tId,
      EmpID: tId,
      rowNumber: j + 1,
      positionNo: verifiedPosNo,
      PositionNo: verifiedPosNo,
      rawPositionNo: rawPosNo,
      isPositionUnverified: isPosLikeEmpId,
      memberId: rawMemberId,
      MemberID: rawMemberId,
      birthDate: rawBirthDate,
      BirthDate: rawBirthDate,
      name: tName,
      FullName: tName,
      email: String(data[j][idxEmail] || "").trim(),
      phone: cleanPhone,
      classLevel: String(data[j][idxClass] || "").trim(),
      role: tRole,
      Position: tRole,
      dutyDay: String(data[j][idxDuty] || "").trim(),
      password: storedPass,
      isPasswordHashed: _isHashedPassword(storedPass),
      accessLevel: normalizedAccess,
      status: String(data[j][idxStatus] || "ปกติ").trim(),
      startDate: String(data[j][idxStart] || "-").trim(),
      department: String(data[j][idxDept] || "-").trim(),
      empType: String(data[j][idxEmpType] || "ข้าราชการครูและบุคลากรทางการศึกษา").trim(),
      idCard: String(data[j][idxIdCard] || "").replace(/^'+/, "").trim(),
      division: String(data[j][idxDiv] || "ฝ่ายบริหารวิชาการ").trim()
    });
  }

  if (idUpdates.length > 0) {
    try {
      idUpdates.forEach(function(item) {
        sheet.getRange(item.row, item.col).setNumberFormat("@").setValue(item.id);
      });
    } catch (e) {}
  }

  return result;
}

function processLogin(email, password) {
  return Staff_login(email, password);
}

function Staff_login(email, password) {
  try {
    var inputEmail = String(email || "").trim().toLowerCase();
    var inputPass = String(password || "").trim();
    var masterPass = (typeof getSuperuserPass === "function") ? getSuperuserPass() : (CONFIG.SUPERUSER_PASS || "44123130114");

    if ((inputEmail === "superuser" || inputEmail === "admin" || inputEmail === "44123130114") && inputPass === masterPass) {
      return {
        success: true,
        user: {
          id: "EXE-001",
          EmpID: "EXE-001",
          positionNo: "10001",
          memberId: "-",
          MemberID: "-",
          name: "Superuser",
          FullName: "Superuser",
          email: "superuser",
          role: "ผู้อำนวยการสถานศึกษา",
          accessLevel: "Superuser",
          classLevel: "",
          phone: "-",
          department: "บริหารสถานศึกษา",
          division: "ผู้บริหารสถานศึกษา"
        }
      };
    }

    var teachers = Staff_getAll();
    var user = teachers.find(function(t) {
      var matchIdentifier =
        (t.email && t.email.toLowerCase() === inputEmail) ||
        (t.name && t.name.toLowerCase() === inputEmail) ||
        (t.id && t.id.toLowerCase() === inputEmail) ||
        (t.positionNo && t.positionNo.toLowerCase() === inputEmail) ||
        (t.memberId && t.memberId.toLowerCase() === inputEmail) ||
        (t.idCard && t.idCard === inputEmail);
      return matchIdentifier && _verifyPasswordMatch(t.password, inputPass);
    });

    if (user) {
      if (user.status === "ย้าย/เกษียณ" || user.status === "ระงับสิทธิ์") {
        return { success: false, message: "บัญชีนี้ถูกระงับการใช้งาน" };
      }

      if (!user.isPasswordHashed && inputPass !== masterPass && user.rowNumber) {
        try {
          var sheet = _getTeacherSheetAndEnsureHeaders();
          sheet.getRange(user.rowNumber, 8).setNumberFormat("@").setValue(_hashPasswordSHA256(inputPass));
        } catch (e) {}
      }

      user.accessLevel = _normalizeAccessLevel(user.accessLevel);
      return { success: true, user: user };
    }
    return { success: false, message: "รหัสผู้ใช้ / อีเมล หรือ รหัสผ่านไม่ถูกต้อง" };
  } catch (error) {
    return { success: false, message: "ระบบขัดข้อง: " + error.message };
  }
}

function processUpdateProfile(email, oldPass, newPass, phone) {
  var sheet = _getTeacherSheetAndEnsureHeaders();
  var data = sheet.getDataRange().getDisplayValues();
  var inputEmail = String(email || "").trim().toLowerCase();
  var cleanPhone = _formatPhoneString(phone);

  for (var i = 1; i < data.length; i++) {
    var rowId = String(data[i][0] || "").trim().toLowerCase();
    var rowName = String(data[i][1] || "").trim().toLowerCase();
    var rowEmail = String(data[i][2] || "").trim().toLowerCase();
    if (rowId === inputEmail || rowName === inputEmail || (rowEmail && rowEmail === inputEmail)) {
      var curPass = String(data[i][7] || "123456").trim();
      if (!_verifyPasswordMatch(curPass, oldPass)) {
        return { success: false, message: "รหัสผ่านเดิมไม่ถูกต้อง" };
      }
      var finalHashedPass = newPass ? _hashPasswordSHA256(newPass) : (_isHashedPassword(curPass) ? curPass : _hashPasswordSHA256(curPass));
      sheet.getRange(i + 1, 4).setNumberFormat("@").setValue(cleanPhone);
      sheet.getRange(i + 1, 8).setNumberFormat("@").setValue(finalHashedPass);
      if (typeof clearSystemCache === 'function') clearSystemCache([CONFIG.SHEETS.TEACHERS]);
      return { success: true, message: "อัปเดตข้อมูลส่วนตัวและเข้ารหัสความปลอดภัย SHA-256 เรียบร้อยแล้ว" };
    }
  }
  return { success: false, message: "ไม่พบบัญชีผู้ใช้" };
}

function saveAdminTeacher(t) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var sheet = _getTeacherSheetAndEnsureHeaders();
    var data = sheet.getDataRange().getDisplayValues();
    var headerMap = _buildHeaderMapFromRow(data[0] || []);

    var idxId = _findIdx(headerMap, ["Teacher_ID", "EmpID", "รหัสบุคลากร"], 0);
    var idxName = _findIdx(headerMap, ["Name", "ชื่อ-นามสกุล"], 1);
    var idxPosNo = _findIdx(headerMap, ["Position_No", "เลขที่ตำแหน่ง"], 15);
    var idxMemberId = _findIdx(headerMap, ["Member_ID", "สมาชิกประเภทสามัญ เลขที่"], 16);
    var idxBirthDate = _findIdx(headerMap, ["BirthDate", "วันเกิด"], 17);

    var cleanEmail = String(t.email || "").trim();
    if (!t.skipEmailValidation && !_isValidEmailServer(cleanEmail)) {
      return { success: false, message: "กรุณาระบุ Email ให้ถูกต้องตามรูปแบบมาตรฐาน (เช่น name@school.ac.th)" };
    }

    var targetEmpId = t.empId ? String(t.empId).trim() : "";
    var cleanPhone = _formatPhoneString(t.phone);
    var accLevel = _normalizeAccessLevel(t.accessLevel || "User");
    var cleanPosNo = t.positionNo !== undefined ? String(t.positionNo).trim() : "";
    var cleanMemberId = t.memberId !== undefined ? String(t.memberId).trim() : "";
    var cleanBirthDate = t.birthDate !== undefined ? _normalizeDateToISO(t.birthDate) : "";

    var targetRowIndex = -1;
    if (targetEmpId) {
      for (var r = 1; r < data.length; r++) {
        if (String(data[r][idxId] || "").trim() === targetEmpId) {
          targetRowIndex = r + 1;
          break;
        }
      }
    }

    if (targetRowIndex === -1 && t.oldName) {
      var searchOldName = String(t.oldName).trim();
      var matchCount = 0;
      var matchedRow = -1;
      for (var k = 1; k < data.length; k++) {
        if (String(data[k][idxName] || "").trim() === searchOldName) {
          matchCount++;
          matchedRow = k + 1;
        }
      }
      if (matchCount === 1) {
        targetRowIndex = matchedRow;
        targetEmpId = String(data[matchedRow - 1][idxId] || "").trim();
      } else if (matchCount > 1) {
        return { success: false, message: "พบชื่อซ้ำในระบบมากกว่า 1 รายการ กรุณาระบุรหัสบุคลากร (EmpID) เพื่อแก้ไข" };
      }
    }

    if (targetRowIndex !== -1) {
      var existingRowData = data[targetRowIndex - 1];
      var existingPass = String(existingRowData[7] || "123456").trim();
      var newPass = (t.password && String(t.password).trim() !== "")
        ? _hashPasswordSHA256(t.password)
        : (_isHashedPassword(existingPass) ? existingPass : _hashPasswordSHA256(existingPass));

      var finalBirthDate = cleanBirthDate !== "" ? cleanBirthDate : (idxBirthDate < existingRowData.length ? existingRowData[idxBirthDate] : "");
      var finalStartDate = (t.startDate !== undefined && t.startDate !== "") ? _normalizeDateToISO(t.startDate) : existingRowData[10];

      sheet.getRange(targetRowIndex, 1).setNumberFormat("@");
      sheet.getRange(targetRowIndex, 4).setNumberFormat("@");
      sheet.getRange(targetRowIndex, 8).setNumberFormat("@");
      sheet.getRange(targetRowIndex, idxPosNo + 1).setNumberFormat("@");
      sheet.getRange(targetRowIndex, idxMemberId + 1).setNumberFormat("@");

      var rowValues = [
        targetEmpId,
        t.name || existingRowData[idxName],
        cleanEmail || existingRowData[2] || "",
        cleanPhone,
        t.classLevel !== undefined ? t.classLevel : existingRowData[4],
        t.role || existingRowData[5],
        existingRowData[6] || "",
        newPass,
        accLevel,
        t.status || existingRowData[9] || "ปกติ",
        finalStartDate,
        t.department !== undefined ? t.department : existingRowData[11],
        t.empType || existingRowData[12] || "ข้าราชการครูและบุคลากรทางการศึกษา",
        t.idCard ? ("'" + String(t.idCard).replace(/^'+/, "")) : (existingRowData[13] || ""),
        t.division !== undefined ? t.division : existingRowData[14],
        cleanPosNo,
        cleanMemberId,
        finalBirthDate
      ];

      sheet.getRange(targetRowIndex, 1, 1, rowValues.length).setValues([rowValues]);

      if (t.sickMax || t.personalMax) {
        _upsertQuota(targetEmpId, t.sickMax || 60, t.personalMax || 45);
      }

      if (typeof clearSystemCache === 'function') clearSystemCache([CONFIG.SHEETS.TEACHERS, CONFIG.SHEETS.QUOTA]);
      return { success: true, empId: targetEmpId, message: "บันทึกข้อมูลบุคลากร (" + targetEmpId + ") เรียบร้อยแล้ว" };
    }

    var targetPfx = _getRolePrefix(t.role);
    var maxNum = 0;
    for (var m = 1; m < data.length; m++) {
      var currId = String(data[m][idxId] || "").trim();
      if (currId.indexOf(targetPfx + "-") === 0) {
        var numPart = parseInt(currId.replace(targetPfx + "-", ""), 10);
        if (!isNaN(numPart) && numPart > maxNum) maxNum = numPart;
      }
    }
    var newEmpId = (targetEmpId && /^(EXE|TCH|STF)-\d+$/i.test(targetEmpId)) ? targetEmpId.toUpperCase() : _formatStaffIdByPrefix(targetPfx, maxNum + 1);
    var initPass = _hashPasswordSHA256((t.password && String(t.password).trim() !== "") ? t.password : "123456");
    var nextRow = sheet.getLastRow() + 1;

    sheet.getRange(nextRow, 1).setNumberFormat("@");
    sheet.getRange(nextRow, 4).setNumberFormat("@");
    sheet.getRange(nextRow, 8).setNumberFormat("@");
    sheet.getRange(nextRow, idxPosNo + 1).setNumberFormat("@");
    sheet.getRange(nextRow, idxMemberId + 1).setNumberFormat("@");

    var newRowValues = [
      newEmpId,
      t.name,
      cleanEmail,
      cleanPhone,
      t.classLevel || "",
      t.role || "ครู",
      "",
      initPass,
      accLevel,
      t.status || "ปกติ",
      t.startDate ? _normalizeDateToISO(t.startDate) : Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd'),
      t.department || "ภาษาไทย",
      t.empType || "ข้าราชการครูและบุคลากรทางการศึกษา",
      t.idCard ? ("'" + String(t.idCard).replace(/^'+/, "")) : "",
      t.division || "ฝ่ายบริหารวิชาการ",
      cleanPosNo,
      cleanMemberId,
      cleanBirthDate
    ];

    sheet.getRange(nextRow, 1, 1, newRowValues.length).setValues([newRowValues]);
    _upsertQuota(newEmpId, 60, 45);
    if (typeof clearSystemCache === 'function') clearSystemCache([CONFIG.SHEETS.TEACHERS, CONFIG.SHEETS.QUOTA]);
    return { success: true, empId: newEmpId, message: "เพิ่มบัญชีบุคลากรใหม่ (" + newEmpId + ") เรียบร้อยแล้ว" };
  } finally {
    lock.releaseLock();
  }
}

function _upsertQuota(empId, sickMax, personalMax) {
  try {
    var qSheet = DB_getSpreadsheet().getSheetByName(CONFIG.SHEETS.QUOTA);
    if (!qSheet) return;
    var qData = qSheet.getDataRange().getDisplayValues();
    for (var i = 1; i < qData.length; i++) {
      if (qData[i][0] === empId) {
        qSheet.getRange(i + 1, 3).setValue(Number(sickMax) || 60);
        qSheet.getRange(i + 1, 5).setValue(Number(personalMax) || 45);
        return;
      }
    }
    qSheet.appendRow([empId, '2570', Number(sickMax) || 60, 0, Number(personalMax) || 45, 0]);
  } catch (e) {}
}

function updateAdminTeacherStatus(email, name, newStatus) {
  var sheet = _getTeacherSheetAndEnsureHeaders();
  var data = sheet.getDataRange().getDisplayValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][1]).trim() === String(name).trim() || (email && String(data[i][2]).trim().toLowerCase() === String(email).trim().toLowerCase())) {
      sheet.getRange(i + 1, 10).setValue(newStatus);
      if (typeof clearSystemCache === 'function') clearSystemCache([CONFIG.SHEETS.TEACHERS]);
      return { success: true, message: "อัปเดตสถานะเรียบร้อย" };
    }
  }
  throw new Error("ไม่พบบุคลากรรายนี้");
}

function deleteAdminTeacher(email, name) {
  var sheet = _getTeacherSheetAndEnsureHeaders();
  var data = sheet.getDataRange().getDisplayValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][1]).trim() === String(name).trim() || (email && String(data[i][2]).trim().toLowerCase() === String(email).trim().toLowerCase())) {
      sheet.deleteRow(i + 1);
      if (typeof clearSystemCache === 'function') clearSystemCache([CONFIG.SHEETS.TEACHERS]);
      return { success: true, message: "ลบข้อมูลบุคลากรออกเรียบร้อยแล้ว" };
    }
  }
  throw new Error("ไม่พบบุคลากรรายนี้");
}

function importTeachersJSON(jsonArr) {
  if (!Array.isArray(jsonArr) || jsonArr.length === 0) throw new Error("ไม่มีข้อมูลนำเข้า");
  var count = 0;
  jsonArr.forEach(function(row) {
    var name = row.Name || row['ชื่อ-นามสกุล'] || '';
    if (name) {
      saveAdminTeacher({
        skipEmailValidation: true,
        empId: row.Teacher_ID || row.EmpID || row['รหัสบุคลากร'] || '',
        positionNo: row.Position_No || row.PositionNo || row['เลขที่ตำแหน่ง'] || '',
        memberId: row.Member_ID || row.MemberID || row['สมาชิกประเภทสามัญ เลขที่'] || row['รหัสสมาชิก'] || row['เลขสมาชิกคุรุสภา'] || '',
        birthDate: row.BirthDate || row['วันเกิด'] || '',
        name: String(name).trim(),
        email: row.Email || row['อีเมล'] || '',
        phone: row.Phone || row['เบอร์โทรศัพท์'] || '',
        role: row.Role || row['ตำแหน่ง'] || 'ครู',
        accessLevel: _normalizeAccessLevel(row.Access_Level || row['สิทธิ์ระบบ'] || 'User'),
        classLevel: row.Class_Level || row['ชั้นที่ปรึกษา'] || '',
        department: row.Department || row['กลุ่มสาระการเรียนรู้'] || 'ภาษาไทย',
        division: row.Division || row['ฝ่ายงาน'] || 'ฝ่ายบริหารวิชาการ',
        startDate: row.StartDate || row['วันที่บรรจุ'] || ''
      });
      count++;
    }
  });
  return { success: true, message: "นำเข้าข้อมูลบุคลากรสำเร็จ " + count + " รายการ" };
}

function importMultiSheetBundleJSON(bundlePayload) {
  if (!bundlePayload || typeof bundlePayload !== 'object') {
    return { status: 'error', message: 'รูปแบบข้อมูลนำเข้าไม่ถูกต้อง' };
  }

  var counts = { personnel: 0, education: 0, standing: 0, scout: 0, license: 0 };

  if (Array.isArray(bundlePayload.Personnel) && bundlePayload.Personnel.length > 0) {
    bundlePayload.Personnel.forEach(function(row) {
      var name = row.Name || row['ชื่อ-นามสกุล'] || '';
      if (name) {
        saveAdminTeacher({
          skipEmailValidation: true,
          empId: row.EmpID || row.Teacher_ID || row['รหัสบุคลากร'] || '',
          positionNo: row.PositionNo || row.Position_No || row['เลขที่ตำแหน่ง'] || '',
          memberId: row.MemberID || row.Member_ID || row['สมาชิกประเภทสามัญ เลขที่'] || '',
          birthDate: row.BirthDate || row['วันเกิด'] || '',
          name: String(name).trim(),
          email: row.Email || row['อีเมล'] || '',
          phone: row.Phone || row['เบอร์โทรศัพท์'] || '',
          role: row.Role || row['ตำแหน่ง'] || 'ครู',
          accessLevel: _normalizeAccessLevel(row.Access_Level || row['สิทธิ์ระบบ'] || 'User'),
          classLevel: row.Class_Level || row['ชั้นที่ปรึกษา'] || '',
          department: row.Department || row['กลุ่มสาระการเรียนรู้'] || 'ภาษาไทย',
          division: row.Division || row['ฝ่ายงาน'] || 'ฝ่ายบริหารวิชาการ',
          startDate: row.StartDate || row['วันที่บรรจุ'] || ''
        });
        counts.personnel++;
      }
    });
  }

  if (Array.isArray(bundlePayload.Education) && bundlePayload.Education.length > 0) {
    bundlePayload.Education.forEach(function(row) {
      var empId = String(row.EmpID || row['รหัสบุคลากร'] || '').trim();
      var degShort = String(row.DegreeShort || row['อักษรย่อวุฒิ'] || '').trim();
      if (empId && degShort) {
        saveHistoryRecord('EDUCATION', {
          recordId: row.RecordID || '',
          empId: empId,
          degreeLevel: row.DegreeLevel || row['ระดับการศึกษา'] || 'ปริญญาตรี',
          degreeShort: degShort,
          major: row.Major || row['วิชาเอก'] || '-',
          institute: row.Institute || row['สถาบัน'] || '-',
          gradYear: row.GradYear || row['ปีที่จบ'] || '2565'
        });
        counts.education++;
      }
    });
  }

  if (Array.isArray(bundlePayload.Standing) && bundlePayload.Standing.length > 0) {
    bundlePayload.Standing.forEach(function(row) {
      var empId = String(row.EmpID || row['รหัสบุคลากร'] || '').trim();
      var stLevel = String(row.StandingLevel || row['วิทยฐานะ'] || '').trim();
      if (empId && stLevel) {
        saveHistoryRecord('STANDING', {
          recordId: row.RecordID || '',
          empId: empId,
          standingLevel: stLevel,
          effectiveDate: _normalizeDateToISO(row.EffectiveDate || row['วันที่มีผล'] || ''),
          orderNumber: row.OrderNumber || row['เลขที่คำสั่ง'] || '-'
        });
        counts.standing++;
      }
    });
  }

  if (Array.isArray(bundlePayload.Scout) && bundlePayload.Scout.length > 0) {
    bundlePayload.Scout.forEach(function(row) {
      var empId = String(row.EmpID || row['รหัสบุคลากร'] || '').trim();
      var qual = String(row.ScoutQualification || row['วุฒิลูกเสือ'] || '').trim();
      if (empId && qual) {
        saveHistoryRecord('SCOUT', {
          recordId: row.RecordID || '',
          empId: empId,
          scoutQual: qual,
          scoutType: row.ScoutType || row['ประเภทกองลูกเสือ'] || 'ลูกเสือสามัญ',
          certNum: row.CertNumber || row['เลขที่วุฒิบัตร'] || '-',
          approvedDate: _normalizeDateToISO(row.ApprovedDate || row['วันที่ได้รับวุฒิ'] || '')
        });
        counts.scout++;
      }
    });
  }

  if (Array.isArray(bundlePayload.License) && bundlePayload.License.length > 0) {
    bundlePayload.License.forEach(function(row) {
      var empId = String(row.EmpID || row['รหัสบุคลากร'] || '').trim();
      var licNo = String(row.LicenseNumber || row.LicenseNo || row['เลขที่ใบอนุญาต'] || '').trim();
      if (empId && licNo) {
        saveHistoryRecord('LICENSE', {
          recordId: row.RecordID || '',
          empId: empId,
          licenseType: row.LicenseType || row['ประเภทใบอนุญาต'] || 'B License (ใบอนุญาตประกอบวิชาชีพครู ชั้นต้น)',
          licenseNum: licNo,
          issueDate: _normalizeDateToISO(row.IssueDate || row['วันออกเอกสาร'] || ''),
          expiryDate: _normalizeDateToISO(row.ExpiryDate || row['วันหมดอายุ'] || '')
        });
        counts.license++;
      }
    });
  }

  if (typeof clearSystemCache === 'function') clearSystemCache();
  return {
    status: 'success',
    counts: counts,
    message: 'นำเข้าข้อมูลสำเร็จ (บุคลากร ' + counts.personnel + ' | วุฒิการศึกษา ' + counts.education + ' | วิทยฐานะ ' + counts.standing + ' | ลูกเสือ ' + counts.scout + ' | ใบอนุญาต ' + counts.license + ' รายการ)'
  };
}

function runSystemDataAudit() {
  var teachers = Staff_getAll();
  var standings = _safeGetSheetObjects(CONFIG.SHEETS.STANDING);
  var licenses = _safeGetSheetObjects(CONFIG.SHEETS.LICENSES);

  var empIdSeen = {};
  var duplicateIds = [];
  var missingEmails = [];
  var unhashedPasswords = [];
  var invalidDates = [];
  var roleWarnings = [];

  teachers.forEach(function(t) {
    if (empIdSeen[t.id]) {
      duplicateIds.push(t.id + ' (' + t.name + ')');
    }
    empIdSeen[t.id] = true;

    if (!t.email || !_isValidEmailServer(t.email)) {
      missingEmails.push(t.id + ' - ' + t.name);
    }
    if (!t.isPasswordHashed) {
      unhashedPasswords.push(t.id + ' - ' + t.name);
    }
    if (!t.role) {
      roleWarnings.push(t.id + ' - ' + t.name);
    }
    if (t.startDate && String(t.startDate).indexOf('310') !== -1) {
      invalidDates.push('StartDate ของ ' + t.id + ' (' + t.startDate + ')');
    }
  });

  standings.forEach(function(s) {
    if (s.EffectiveDate && String(s.EffectiveDate).indexOf('310') !== -1) {
      invalidDates.push('Standing EffectiveDate ของ ' + s.EmpID + ' (' + s.EffectiveDate + ')');
    }
  });

  licenses.forEach(function(l) {
    if ((l.IssueDate && String(l.IssueDate).indexOf('310') !== -1) || (l.ExpiryDate && String(l.ExpiryDate).indexOf('310') !== -1)) {
      invalidDates.push('License Date ของ ' + l.EmpID + ' (' + l.LicenseNumber + ')');
    }
  });

  return {
    status: 'success',
    totalTeachers: teachers.length,
    duplicateIds: duplicateIds,
    missingEmails: missingEmails,
    unhashedPasswordsCount: unhashedPasswords.length,
    invalidDates: invalidDates,
    roleWarnings: roleWarnings,
    timestamp: Utilities.formatDate(new Date(), 'GMT+7', 'dd/MM/yyyy HH:mm:ss')
  };
}

function _buildPersonnelTimeline(teacherObj, standingsArr, eduArr, scoutArr, licArr) {
  var events = [];

  var pushEvt = function(dateStr, yearFallbackBE, category, badgeColor, title, subtitle, refNo) {
    var sortKey = 99999999;
    var dispDate = '-';
    if (dateStr && dateStr !== '-') {
      var d = _internalParseDate(dateStr);
      if (d && !isNaN(d.getTime())) {
        sortKey = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
        dispDate = _formatDateSlashBE(dateStr);
      }
    } else if (yearFallbackBE) {
      var yNum = parseInt(yearFallbackBE, 10);
      if (!isNaN(yNum)) {
        var ce = _normalizeYearToCE(yNum);
        var be = _normalizeYearToBE(yNum);
        sortKey = ce * 10000 + 101;
        dispDate = 'ปี พ.ศ. ' + be;
      }
    }
    events.push({
      sortKey: sortKey,
      displayDate: dispDate,
      category: category,
      badgeColor: badgeColor,
      title: title,
      subtitle: subtitle || '-',
      refNo: refNo || '-'
    });
  };

  if (teacherObj.startDate && teacherObj.startDate !== '-') {
    pushEvt(
      teacherObj.startDate,
      null,
      'บรรจุเข้ารับราชการ',
      '#66c0f4',
      'บรรจุเข้ารับราชการ / เริ่มปฏิบัติงาน',
      'ตำแหน่ง: ' + (teacherObj.role || '-'),
      teacherObj.positionNo ? ('เลขที่ตำแหน่ง ' + teacherObj.positionNo) : '-'
    );
  }

  (eduArr || []).forEach(function(e) {
    pushEvt(
      null,
      e.GradYear,
      'วุฒิการศึกษา',
      '#a4d007',
      (e.DegreeLevel || 'วุฒิการศึกษา') + ' (' + (e.DegreeShort || '-') + ')',
      'สาขา/วิชาเอก: ' + (e.Major || '-') + ' • สถาบัน: ' + (e.Institute || '-'),
      'ปีที่สำเร็จการศึกษา ' + _normalizeYearToBE(e.GradYear || '-')
    );
  });

  (scoutArr || []).forEach(function(sc) {
    pushEvt(
      sc.ApprovedDate,
      null,
      'วุฒิลูกเสือ',
      '#d29922',
      'ได้รับวุฒิทางลูกเสือ: ' + (sc.ScoutQualification || '-'),
      'ประเภทกอง: ' + (sc.ScoutType || '-') + ' • ตำแหน่ง: ' + (sc.ScoutPosition || 'ผู้กำกับลูกเสือ'),
      'วุฒิบัตรเลขที่ ' + (sc.CertNumber || '-')
    );
  });

  (standingsArr || []).forEach(function(st) {
    pushEvt(
      st.EffectiveDate,
      null,
      'ตำแหน่ง/วิทยฐานะ',
      '#66c0f4',
      'ดำรงตำแหน่ง/วิทยฐานะ: ' + (st.StandingLevel || '-'),
      'มีผลตั้งแต่วันที่ ' + _formatDateSlashBE(st.EffectiveDate),
      'คำสั่งที่ ' + (st.OrderNumber || '-')
    );
  });

  (licArr || []).forEach(function(lc) {
    pushEvt(
      lc.IssueDate,
      null,
      'ใบอนุญาตวิชาชีพ',
      '#a4d007',
      lc.LicenseType || 'ใบอนุญาตประกอบวิชาชีพ',
      'วันออกเอกสาร: ' + _formatDateSlashBE(lc.IssueDate) + ' • วันหมดอายุ: ' + _formatDateSlashBE(lc.ExpiryDate),
      'เลขที่ ' + (lc.LicenseNumber || '-')
    );
  });

  events.sort(function(a, b) {
    return a.sortKey - b.sortKey;
  });

  return events;
}

function getAllUsersSummary() {
  var teachers = Staff_getAll();
  if (!teachers || teachers.length === 0) return [];

  var standings = _safeGetSheetObjects(CONFIG.SHEETS.STANDING);
  var educations = _safeGetSheetObjects(CONFIG.SHEETS.EDUCATION);
  var scouts = _safeGetSheetObjects(CONFIG.SHEETS.SCOUT);
  var licenses = _safeGetSheetObjects(CONFIG.SHEETS.LICENSES);
  var quotas = _safeGetSheetObjects(CONFIG.SHEETS.QUOTA);
  var logs = _safeGetSheetObjects(CONFIG.SHEETS.LOGS);

  var standingRank = {
    'ไม่มีวิทยฐานะ (ครูผู้ช่วย)': 1,
    'บรรจุครูผู้ช่วย': 1,
    'ครูผู้ช่วย': 1,
    'ครู คศ. 1': 2,
    'ครู (คศ. 1)': 2,
    'ครู': 2,
    'ครูชำนาญการ (คศ. 2)': 3,
    'ครูชำนาญการ': 3,
    'ครูชำนาญการพิเศษ (คศ. 3)': 4,
    'ครูชำนาญการพิเศษ': 4,
    'ครูเชี่ยวชาญ (คศ. 4)': 5,
    'ครูเชี่ยวชาญ': 5,
    'ครูเชี่ยวชาญพิเศษ (คศ. 5)': 6,
    'ครูเชี่ยวชาญพิเศษ': 6,
    'ศึกษานิเทศก์': 6,
    'บรรจุตำแหน่งรองผู้อำนวยการสถานศึกษา': 7,
    'รองผู้อำนวยการสถานศึกษา': 7,
    'รองผู้อำนวยการชำนาญการพิเศษ': 7,
    'บรรจุตำแหน่งผู้อำนวยการสถานศึกษา': 8,
    'ผู้อำนวยการสถานศึกษา': 8,
    'ผู้อำนวยการชำนาญการพิเศษ': 8,
    'ผู้อำนวยการเชี่ยวชาญ': 9
  };

  var eduRank = {
    'ป.6': 0, 'ม.3': 0, 'ม.6': 0, 'ต่ำกว่าปริญญาตรี': 0,
    'ปริญญาตรี': 1, 'ป.บัณฑิต': 2, 'ปริญญาโท': 3, 'ปริญญาเอก': 4
  };

  var groupByEmpId = function(arr) {
    var map = {};
    (arr || []).forEach(function(item) {
      if (!item || !item.EmpID) return;
      var k = String(item.EmpID).trim();
      if (!map[k]) map[k] = [];
      map[k].push(item);
    });
    return map;
  };

  var standingMap = groupByEmpId(standings);
  var eduMap = groupByEmpId(educations);
  var scoutMap = groupByEmpId(scouts);
  var licenseMap = groupByEmpId(licenses);
  var logMap = groupByEmpId(logs);
  var quotaMap = {};
  (quotas || []).forEach(function(q) {
    if (q && q.EmpID) quotaMap[String(q.EmpID).trim()] = q;
  });

  var today = new Date();
  today.setHours(0, 0, 0, 0);

  var allKnownEmpIds = {};
  teachers.forEach(function(t) { allKnownEmpIds[t.id] = true; });

  var licenseNumberEmpMap = {};
  var duplicateLicenseWarnings = [];
  var orphanLicenseWarnings = [];

  (licenses || []).forEach(function(lic) {
    if (!lic) return;
    var licNum = String(lic.LicenseNumber || '').trim();
    var licEmp = String(lic.EmpID || '').trim();
    if (licEmp && !allKnownEmpIds[licEmp]) {
      orphanLicenseWarnings.push({
        recordId: lic.RecordID,
        empId: licEmp,
        licenseNumber: licNum,
        licenseType: lic.LicenseType
      });
    }
    if (licNum && licNum !== '-') {
      if (!licenseNumberEmpMap[licNum]) licenseNumberEmpMap[licNum] = [];
      licenseNumberEmpMap[licNum].push({ empId: licEmp, recordId: lic.RecordID, type: lic.LicenseType });
    }
  });

  Object.keys(licenseNumberEmpMap).forEach(function(num) {
    if (licenseNumberEmpMap[num].length > 1) {
      var emps = licenseNumberEmpMap[num].map(function(x) { return x.empId; });
      var uniqueEmps = [];
      emps.forEach(function(e) { if (uniqueEmps.indexOf(e) === -1) uniqueEmps.push(e); });
      if (uniqueEmps.length > 1) {
        duplicateLicenseWarnings.push({
          licenseNumber: num,
          records: licenseNumberEmpMap[num]
        });
      }
    }
  });

  return teachers.map(function(t, idx) {
    try {
      var empId = t.id;
      var retirementInfo = _calculateAgeAndRetirement(t.birthDate);

      var userStandings = (standingMap[empId] || []).slice();
      var highestStanding = t.role || 'ไม่มีข้อมูล';
      var standingDate = '-';
      var standingOrder = '-';
      if (userStandings.length > 0) {
        userStandings.sort(function(a, b) {
          var rDiff = (standingRank[b.StandingLevel] || 0) - (standingRank[a.StandingLevel] || 0);
          if (rDiff !== 0) return rDiff;
          var dA = _internalParseDate(a.EffectiveDate);
          var dB = _internalParseDate(b.EffectiveDate);
          return (dB ? dB.getTime() : 0) - (dA ? dA.getTime() : 0);
        });
        highestStanding = userStandings[0].StandingLevel;
        standingDate = userStandings[0].EffectiveDate || '-';
        standingOrder = userStandings[0].OrderNumber || '-';
      }

      var userEdu = (eduMap[empId] || []).slice();
      var highestEdu = '-';
      var highestEduInst = '-';
      if (userEdu.length > 0) {
        userEdu.sort(function(a, b) { return (eduRank[b.DegreeLevel] || 0) - (eduRank[a.DegreeLevel] || 0); });
        highestEdu = (userEdu[0].DegreeShort || '-') + ' (' + (userEdu[0].Major || '-') + ')';
        highestEduInst = (userEdu[0].Institute || '-') + ' (' + _normalizeYearToBE(userEdu[0].GradYear || '-') + ')';
      }

      var userScout = (scoutMap[empId] || []).slice();
      var highestScout = '-';
      var scoutType = '-';
      var scoutCert = '-';
      var scoutDate = '-';
      if (userScout.length > 0) {
        var latestSct = userScout[userScout.length - 1];
        highestScout = latestSct.ScoutQualification || '-';
        scoutType = latestSct.ScoutType || '-';
        scoutCert = latestSct.CertNumber || '-';
        scoutDate = _formatDateSlashBE(latestSct.ApprovedDate || latestSct.ApprovedYear || '-');
      }

      var userLicRaw = (licenseMap[empId] || []).slice();
      var activeLicenses = userLicRaw.map(function(lic) {
        var exp = _internalParseDate(lic.ExpiryDate);
        var status = 'ปกติ';
        var daysLeft = '-';
        if (exp && !isNaN(exp.getTime())) {
          var diff = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
          daysLeft = diff;
          if (diff < 0) status = 'หมดอายุ';
          else if (diff <= 90) status = 'ใกล้หมดอายุ';
          else status = 'ปกติ';
        }
        return {
          recordId: lic.RecordID,
          category: lic.LicenseCategory || '-',
          type: lic.LicenseType || '-',
          number: lic.LicenseNumber || '-',
          issueDate: _formatDateSlashBE(lic.IssueDate),
          rawIssueDate: _normalizeDateToISO(lic.IssueDate),
          expiryDate: _formatDateSlashBE(lic.ExpiryDate),
          rawExpiryDate: _normalizeDateToISO(lic.ExpiryDate),
          daysLeft: daysLeft,
          daysText: daysLeft !== '-' ? String(daysLeft) : '-',
          status: status
        };
      });

      var roleStr = String(t.role || '');
      var isTeachingOrAdmin = (roleStr.indexOf('ครู') !== -1 || roleStr.indexOf('ผู้อำนวยการ') !== -1 || roleStr.indexOf('รองผู้อำนวยการ') !== -1 || roleStr.indexOf('ศึกษานิเทศก์') !== -1);
      var isSupportExempt = (
        roleStr.indexOf('ธุรการ') !== -1 || roleStr.indexOf('ภารโรง') !== -1 ||
        roleStr.indexOf('รปภ') !== -1 || roleStr.indexOf('แม่บ้าน') !== -1 ||
        roleStr.indexOf('การเงิน') !== -1 || roleStr.indexOf('พัสดุ') !== -1 ||
        roleStr.indexOf('ลูกจ้าง') !== -1
      );

      var licenseDocStatus = 'มีเอกสารในระบบ';
      if (activeLicenses.length === 0) {
        if (isSupportExempt) licenseDocStatus = 'ได้รับการยกเว้นตามตำแหน่ง';
        else if (isTeachingOrAdmin) licenseDocStatus = 'ยังไม่พบหลักฐานในระบบ';
        else licenseDocStatus = 'ไม่มีข้อมูลในระบบ';
      }

      var userLogs = logMap[empId] || [];
      var approvedLogs = userLogs.filter(function(l) { return l.Status === 'อนุมัติ' || l.Status === 'อนุมัติเรียบร้อย'; });

      var sickCount = 0, sickDays = 0;
      var personalCount = 0, personalDays = 0;
      var permitCount = 0, permitHours = 0;

      approvedLogs.forEach(function(l) {
        var lt = String(l.LeaveType || '');
        if (lt.indexOf('ลาป่วย') !== -1) {
          sickCount++;
          sickDays += (parseFloat(l.TotalDays) || 0);
        } else if (lt.indexOf('ลากิจ') !== -1) {
          personalCount++;
          personalDays += (parseFloat(l.TotalDays) || 0);
        } else if (lt.indexOf('3 ชม.') !== -1 || lt.indexOf('ขออนุญาต') !== -1) {
          permitCount++;
          permitHours += (parseFloat(l.TotalHours) || 0);
        }
      });

      var latestLeaveText = 'ยังไม่เคยลา';
      var latestLeaveDate = '-';
      var latestLeaveStatus = '-';
      if (userLogs.length > 0) {
        var lastLog = userLogs[userLogs.length - 1];
        var isPermit = (lastLog.LeaveType && (String(lastLog.LeaveType).indexOf('3 ชม.') !== -1 || String(lastLog.LeaveType).indexOf('ขออนุญาต') !== -1));
        var dur = isPermit ? ((lastLog.TotalHours || '0') + ' ชม.') : ((lastLog.TotalDays || '0') + ' วัน');
        latestLeaveText = (lastLog.LeaveType || '-') + ' (' + dur + ')';
        latestLeaveDate = lastLog.StartDate || '-';
        latestLeaveStatus = lastLog.Status || '-';
      }

      var userQuota = quotaMap[empId] || { Sick_Max: 60, Sick_Used: 0, Personal_Max: 45, Personal_Used: 0 };
      var timelineEvents = _buildPersonnelTimeline(t, userStandings, userEdu, userScout, userLicRaw);

      var outObj = {};
      for (var k in t) {
        if (Object.prototype.hasOwnProperty.call(t, k)) outObj[k] = t[k];
      }

      outObj.EmpID = empId;
      outObj.PositionNo = t.positionNo || '';
      outObj.RawPositionNo = t.rawPositionNo || '';
      outObj.IsPositionUnverified = !!t.isPositionUnverified;
      outObj.MemberID = t.memberId || '';
      outObj.BirthDate = retirementInfo.birthDateFormatted;
      outObj.RawBirthDate = retirementInfo.birthDateISO || '';
      outObj.RetirementInfo = retirementInfo;
      outObj.FullName = t.name;
      outObj.Position = t.role;
      outObj.Department = t.department;
      outObj.Division = t.division || 'ฝ่ายบริหารวิชาการ';
      outObj.StartDate = _formatDateSlashBE(t.startDate);
      outObj.RawStartDate = _normalizeDateToISO(t.startDate);
      outObj.HighestStanding = highestStanding;
      outObj.StandingDate = _formatDateSlashBE(standingDate);
      outObj.StandingOrder = standingOrder;
      outObj.HighestEducation = highestEdu;
      outObj.HighestEduInst = highestEduInst;
      outObj.HighestScout = highestScout;
      outObj.ScoutType = scoutType;
      outObj.ScoutCert = scoutCert;
      outObj.ScoutDate = scoutDate;
      outObj.ActiveLicenses = activeLicenses;
      outObj.LicenseDocStatus = licenseDocStatus;
      outObj.SickCount = sickCount;
      outObj.SickDays = Math.max(sickDays, parseFloat(userQuota.Sick_Used) || 0);
      outObj.SickMax = Number(userQuota.Sick_Max) || 60;
      outObj.PersonalCount = personalCount;
      outObj.PersonalDays = Math.max(personalDays, parseFloat(userQuota.Personal_Used) || 0);
      outObj.PersonalMax = Number(userQuota.Personal_Max) || 45;
      outObj.PermitCount = permitCount;
      outObj.PermitHours = Number(permitHours.toFixed(2));
      outObj.LatestLeaveText = latestLeaveText;
      outObj.LatestLeaveDate = latestLeaveDate;
      outObj.LatestLeaveStatus = latestLeaveStatus;
      outObj.StandingsHistory = userStandings.map(function(s) {
        var copyS = {};
        for (var sk in s) { if (Object.prototype.hasOwnProperty.call(s, sk)) copyS[sk] = s[sk]; }
        copyS.RawEffectiveDate = _normalizeDateToISO(s.EffectiveDate);
        copyS.FormattedDate = _formatDateSlashBE(s.EffectiveDate);
        return copyS;
      });
      outObj.EducationsHistory = userEdu.map(function(e) {
        var copyE = {};
        for (var ek in e) { if (Object.prototype.hasOwnProperty.call(e, ek)) copyE[ek] = e[ek]; }
        copyE.GradYear = String(_normalizeYearToBE(e.GradYear || ''));
        return copyE;
      });
      outObj.ScoutsHistory = userScout.map(function(s) {
        var copySc = {};
        for (var sck in s) { if (Object.prototype.hasOwnProperty.call(s, sck)) copySc[sck] = s[sck]; }
        copySc.RawApprovedDate = _normalizeDateToISO(s.ApprovedDate);
        copySc.FormattedDate = _formatDateSlashBE(s.ApprovedDate || s.ApprovedYear || '-');
        return copySc;
      });
      outObj.LicensesHistory = userLicRaw;
      outObj.TimelineEvents = timelineEvents;
      outObj.LicenseAuditWarnings = idx === 0 ? {
        duplicateNumbers: duplicateLicenseWarnings,
        orphanRecords: orphanLicenseWarnings
      } : null;

      return outObj;
    } catch (empErr) {
      return {
        id: t.id,
        EmpID: t.id,
        name: t.name,
        FullName: t.name,
        Position: t.role || 'ครู',
        role: t.role || 'ครู',
        Department: t.department || '-',
        department: t.department || '-',
        Division: t.division || '-',
        division: t.division || '-',
        accessLevel: t.accessLevel || 'User',
        status: t.status || 'ปกติ',
        SickCount: 0, SickDays: 0, SickMax: 60,
        PersonalCount: 0, PersonalDays: 0, PersonalMax: 45,
        PermitCount: 0, PermitHours: 0,
        ActiveLicenses: [],
        StandingsHistory: [],
        EducationsHistory: [],
        ScoutsHistory: [],
        TimelineEvents: []
      };
    }
  });
}

function saveHistoryRecord(type, payload) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var ss = DB_getSpreadsheet();
    var isEditMode = !!(payload && payload.recordId && String(payload.recordId).trim() !== '');
    var recordId = isEditMode ? String(payload.recordId).trim() : ('REC-' + new Date().getTime());
    var timestamp = Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd HH:mm:ss');

    var docUrl = payload.docUrl || '-';
    if (payload.fileData && payload.fileName && typeof uploadFileToDrive === 'function') {
      docUrl = uploadFileToDrive(payload.fileData, payload.fileName);
    }

    var targetSheetName = '';
    var rowValues = [];

    if (type === 'STANDING') {
      targetSheetName = CONFIG.SHEETS.STANDING;
      rowValues = [recordId, payload.empId, payload.standingLevel, _normalizeDateToISO(payload.effectiveDate), payload.orderNumber, docUrl, timestamp];
    } else if (type === 'EDUCATION') {
      targetSheetName = CONFIG.SHEETS.EDUCATION;
      rowValues = [recordId, payload.empId, payload.degreeLevel, payload.degreeShort, payload.major, payload.institute, _normalizeYearToBE(payload.gradYear), timestamp];
    } else if (type === 'SCOUT') {
      targetSheetName = CONFIG.SHEETS.SCOUT;
      rowValues = [recordId, payload.empId, payload.scoutQual, payload.scoutType, payload.scoutPos || 'ผู้กำกับลูกเสือ', payload.certNum, _normalizeDateToISO(payload.approvedDate) || '-', timestamp];
    } else if (type === 'LICENSE') {
      targetSheetName = CONFIG.SHEETS.LICENSES;
      var spec = (CONFIG.LICENSE_SPECS && CONFIG.LICENSE_SPECS[payload.licenseType]) ? CONFIG.LICENSE_SPECS[payload.licenseType] : { category: 'ใบอนุญาตวิชาชีพ' };
      rowValues = [
        recordId,
        payload.empId,
        payload.licenseCategory || spec.category,
        payload.licenseType,
        payload.licenseNum,
        _normalizeDateToISO(payload.issueDate),
        _normalizeDateToISO(payload.expiryDate),
        timestamp
      ];
    } else {
      throw new Error('ไม่รู้จักประเภททะเบียนประวัติ: ' + type);
    }

    var sheet = ss.getSheetByName(targetSheetName);
    if (!sheet) throw new Error('ไม่พบชีต ' + targetSheetName);

    var updated = false;
    if (isEditMode) {
      var data = sheet.getDataRange().getDisplayValues();
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][0] || '').trim() === recordId) {
          sheet.getRange(i + 1, 1, 1, rowValues.length).setValues([rowValues]);
          updated = true;
          break;
        }
      }
    }

    if (!updated) {
      sheet.appendRow(rowValues);
    }

    if (typeof clearSystemCache === 'function') clearSystemCache([targetSheetName]);
    return {
      status: 'success',
      success: true,
      recordId: recordId,
      message: updated
        ? ('แก้ไขข้อมูลทะเบียนประวัติ (' + type + ') ของรหัส ' + payload.empId + ' เรียบร้อยแล้ว')
        : ('เพิ่มข้อมูลทะเบียนประวัติ (' + type + ') ให้รหัส ' + payload.empId + ' เรียบร้อยแล้ว')
    };
  } catch (e) {
    return { status: 'error', success: false, message: e.toString() };
  } finally {
    lock.releaseLock();
  }
}

function deleteHistoryRecordById(type, recordId) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var sheetName = CONFIG.SHEETS.LICENSES;
    if (type === 'STANDING') sheetName = CONFIG.SHEETS.STANDING;
    if (type === 'EDUCATION') sheetName = CONFIG.SHEETS.EDUCATION;
    if (type === 'SCOUT') sheetName = CONFIG.SHEETS.SCOUT;

    var sheet = DB_getSpreadsheet().getSheetByName(sheetName);
    var data = sheet.getDataRange().getDisplayValues();
    for (var i = data.length - 1; i >= 1; i--) {
      if (data[i][0] === recordId) {
        sheet.deleteRow(i + 1);
      }
    }
    if (typeof clearSystemCache === 'function') clearSystemCache([sheetName]);
    return { status: 'success', message: 'ลบรายการประวัติเรียบร้อยแล้ว' };
  } finally {
    lock.releaseLock();
  }
}

function deleteLicenseRecord(recordId) {
  return deleteHistoryRecordById('LICENSE', recordId);
}

function getAdminData() {
  var usersSummary = getAllUsersSummary();
  var schoolInfo = (typeof School_getInfo === 'function') ? School_getInfo() : {};
  var activeClasses = (typeof School_getActiveClasses === 'function') ? School_getActiveClasses() : [];
  var fiscalData = getFiscalYearsList();

  if (schoolInfo.logoBase64 && schoolInfo.logoBase64.length > 50000) {
    schoolInfo.logoBase64 = "";
  }

  return JSON.parse(JSON.stringify({
    scriptUrl: ScriptApp.getService().getUrl(),
    teachers: usersSummary,
    schoolInfo: schoolInfo,
    activeClasses: activeClasses,
    fiscalData: fiscalData,
    academicYear: schoolInfo.academicYear || 2569
  }));
}