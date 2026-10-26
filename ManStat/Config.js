const CONFIG = {
  APP_NAME: 'ManStat — ระบบสารสนเทศสถิติการลาและทะเบียนประวัติบุคลากร',
  UPLOAD_FOLDER_NAME: 'ManStat_Uploaded_Files',
  SUPERUSER_PASS: '44123130114',
  // ถ้ารู้รหัส Spreadsheet ID ของไฟล์ Google Sheets ตัวจริง สามารถนำมาวางในเครื่องหมายคำพูดด้านล่างนี้ได้เลยครับ (ถ้าผูกกับชีตอยู่แล้วปล่อยว่างไว้ได้)
  TARGET_SPREADSHEET_ID: '',
  SHEETS: {
    SCHOOL: 'SchoolInfo',
    TEACHERS: 'Teachers',
    STANDING: 'History_Standing',
    EDUCATION: 'History_Education',
    SCOUT: 'History_Scout',
    LICENSES: 'History_Licenses',
    QUOTA: 'Leave_Quota',
    LOGS: 'Leave_Logs',
    FEEDBACK: 'System_Feedback',
    WORKLOAD: 'Staff_Workloads',
    FISCAL_YEAR: 'FiscalYear',
    HOLIDAYS: 'Holidays'
  },
  HEADERS: {
    Teachers: [
      'Teacher_ID', 'Name', 'Email', 'Phone', 'Class_Level', 
      'Role', 'Duty_Day', 'Password', 'Access_Level', 'Status',
      'StartDate', 'Department', 'EmpType', 'IDCard', 'Division',
      'Position_No', 'Member_ID', 'BirthDate'
    ],
    History_Standing: ['RecordID', 'EmpID', 'StandingLevel', 'EffectiveDate', 'OrderNumber', 'DocLink', 'Timestamp'],
    History_Education: ['RecordID', 'EmpID', 'DegreeLevel', 'DegreeShort', 'Major', 'Institute', 'GradYear', 'Timestamp'],
    History_Scout: ['RecordID', 'EmpID', 'ScoutQualification', 'ScoutType', 'ScoutPosition', 'CertNumber', 'ApprovedDate', 'Timestamp'],
    History_Licenses: ['RecordID', 'EmpID', 'LicenseCategory', 'LicenseType', 'LicenseNumber', 'IssueDate', 'ExpiryDate', 'Timestamp'],
    Leave_Quota: ['EmpID', 'FiscalYear', 'Sick_Max', 'Sick_Used', 'Personal_Max', 'Personal_Used'],
    Leave_Logs: [
      'LeaveID', 'EmpID', 'FullName', 'LeaveType', 'StartDate', 'EndDate',
      'StartTime', 'EndTime', 'TotalDays', 'TotalHours', 'Reason',
      'SubstituteInfo', 'AttachUrl', 'Status', 'Step1_HR', 'Step2_Academic',
      'Step3_Director', 'SignerName', 'Remark', 'Timestamp'
    ],
    System_Feedback: [
      'FeedbackID', 'EmpID', 'FullName', 'Category', 'Topic',
      'Detail', 'Status', 'AdminReply', 'UpdatedBy', 'Timestamp'
    ],
    Staff_Workloads: [
      'WorkloadID', 'EmpID', 'CoEmpIDs', 'Category', 'Title',
      'SubGroupOrLevel', 'HoursPerWeek', 'RoleInTask', 'AcademicTerm',
      'OrderOrRef', 'EffectivePeriod', 'Status', 'AssignedBy', 'UpdatedBy', 'Timestamp'
    ],
    FiscalYear: [
      'FiscalYear', 'StartDate', 'EndDate', 'Status'
    ],
    Holidays: [
      'HolidayDate', 'ReasonType', 'Note', 'DirectorName', 'Timestamp'
    ]
  },
  OBEC_STANDARD_POSITIONS: {
    EXECUTIVES: [
      'ผู้อำนวยการสถานศึกษา',
      'รองผู้อำนวยการสถานศึกษา'
    ],
    ACADEMIC: [
      'ครูเชี่ยวชาญพิเศษ',
      'ครูเชี่ยวชาญ',
      'ครูชำนาญการพิเศษ',
      'ครูชำนาญการ',
      'ครู',
      'ครูผู้ช่วย'
    ],
    OTHERS: [
      'ศึกษานิเทศก์',
      'พนักงานราชการ',
      'ครูอัตราจ้าง',
      'ลูกจ้างประจำ',
      'ลูกจ้างชั่วคราว',
      'เจ้าหน้าที่ธุรการ'
    ]
  },
  LICENSE_SPECS: {
    'P License (ใบอนุญาตปฏิบัติหน้าที่ครู)': {
      category: 'ครู',
      years: 2,
      desc: 'อายุการใช้งาน 2 ปี | คุณสมบัติ: จบวุฒิปริญญาทางการศึกษา (ตั้งแต่ปี 2562 เป็นต้นไป), มีประสบการณ์สอนไม่น้อยกว่า 1 ปี และมีอายุไม่ต่ำกว่า 20 ปีบริบูรณ์'
    },
    'B License (ใบอนุญาตประกอบวิชาชีพครู ชั้นต้น)': {
      category: 'ครู',
      years: 5,
      desc: 'อายุการใช้งาน 5 ปี | คุณสมบัติ: จบวุฒิปริญญาทางการศึกษา, มีประสบการณ์สอนไม่น้อยกว่า 1 ปี, ผ่านการทดสอบและประเมินสมรรถนะทางวิชาชีพ และมีอายุไม่ต่ำกว่า 20 ปีบริบูรณ์'
    },
    'A License (ใบอนุญาตประกอบวิชาชีพครู ชั้นสูง)': {
      category: 'ครู',
      years: 7,
      desc: 'อายุการใช้งาน 7 ปี | คุณสมบัติ: มี B License ที่ยังไม่หมดอายุ, ผ่านการประเมินคุณภาพการปฏิบัติงาน และมีอายุไม่ต่ำกว่า 20 ปีบริบูรณ์'
    },
    'ใบอนุญาตประกอบวิชาชีพผู้บริหารสถานศึกษา': {
      category: 'ผู้บริหารสถานศึกษา',
      years: 5,
      desc: 'อายุการใช้งาน 5 ปี | สำหรับผู้ดำรงตำแหน่งรองผู้อำนวยการ หรือผู้อำนวยการสถานศึกษา (สามารถถือครองคู่กับใบอนุญาตครูได้)'
    },
    'ใบอนุญาตประกอบวิชาชีพศึกษานิเทศก์': {
      category: 'ศึกษานิเทศก์',
      years: 5,
      desc: 'อายุการใช้งาน 5 ปี | สำหรับศึกษานิเทศก์'
    }
  }
};

var _cachedSpreadsheetInstance = null;

function _countTeachersInSpreadsheet(ssObj) {
  if (!ssObj) return -1;
  try {
    var sheetNames = [
      'Teachers', 'บุคลากร', 'รายชื่อครู', 'ข้อมูลบุคลากร', 'ทะเบียนประวัติ', 
      'ครูและบุคลากร', 'Staff', 'ครู', 'สถิติการลา', 'รายชื่อ'
    ];
    for (var i = 0; i < sheetNames.length; i++) {
      var sh = ssObj.getSheetByName(sheetNames[i]);
      if (sh && sh.getLastRow() > 1) {
        return Math.max(0, sh.getLastRow() - 1);
      }
    }
    // สแกนทุกชีตที่มีแถวเกิน 1 แถวและมีคอลัมน์ชื่อหรือ Name
    var sheets = ssObj.getSheets();
    for (var s = 0; s < sheets.length; s++) {
      var curSh = sheets[s];
      if (curSh.getLastRow() > 1 && curSh.getLastColumn() > 0) {
        var firstRow = curSh.getRange(1, 1, 1, Math.min(curSh.getLastColumn(), 20)).getDisplayValues()[0];
        var joined = firstRow.join(' ').toLowerCase();
        if (joined.indexOf('ชื่อ') !== -1 || joined.indexOf('name') !== -1 || joined.indexOf('รหัส') !== -1) {
          return Math.max(0, curSh.getLastRow() - 1);
        }
      }
    }
    return 0;
  } catch (e) {
    return -1;
  }
}

function DB_getSpreadsheet() {
  if (_cachedSpreadsheetInstance) return _cachedSpreadsheetInstance;

  // 1. หากระบุ TARGET_SPREADSHEET_ID ไว้ใน CONFIG ให้ใช้ทันที
  if (CONFIG.TARGET_SPREADSHEET_ID && String(CONFIG.TARGET_SPREADSHEET_ID).trim() !== '') {
    try {
      var targetSs = SpreadsheetApp.openById(String(CONFIG.TARGET_SPREADSHEET_ID).trim());
      if (targetSs) {
        _cachedSpreadsheetInstance = targetSs;
        return targetSs;
      }
    } catch (e) { Logger.log('Error opening TARGET_SPREADSHEET_ID: ' + e.message); }
  }

  // 2. ลองดึงจาก Container-bound Spreadsheet (กรณีเปิดสคริปต์ที่ผูกกับ Google Sheets)
  try {
    var active = SpreadsheetApp.getActiveSpreadsheet();
    if (active) {
      var actCount = _countTeachersInSpreadsheet(active);
      if (actCount > 0) {
        _cachedSpreadsheetInstance = active;
        try {
          PropertiesService.getScriptProperties().setProperty('MANSTAT_VALID_SS_ID', active.getId());
          PropertiesService.getScriptProperties().setProperty('MANSTAT_SPREADSHEET_ID', active.getId());
        } catch (e) {}
        return active;
      }
    }
  } catch (e) {}

  var fallbackSs = null;

  // 3. ตรวจสอบจาก PropertiesService ที่เคยบันทึกไว้
  try {
    var props = PropertiesService.getScriptProperties();
    var savedId = props.getProperty('MANSTAT_VALID_SS_ID') || props.getProperty('MANSTAT_SPREADSHEET_ID');
    if (savedId) {
      try {
        var byId = SpreadsheetApp.openById(savedId);
        if (byId) {
          var savedCount = _countTeachersInSpreadsheet(byId);
          if (savedCount > 0) {
            _cachedSpreadsheetInstance = byId;
            return byId;
          } else {
            fallbackSs = byId; // เก็บเป็นตัวสำรองถ้าค้นหาใน Drive ไม่พบไฟล์ที่มีข้อมูล
          }
        }
      } catch (innerErr) {
        Logger.log('Saved spreadsheet ID invalid: ' + innerErr.message);
      }
    }
  } catch (e) {}

  // 4. สแกนหาไฟล์ Google Sheets อัตโนมัติใน Google Drive ด้วยคีย์เวิร์ดที่ครอบคลุม
  var bestSs = null;
  var bestTeacherCount = -1;
  var checkedIds = {};

  var searchQueries = [
    "mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false and title contains 'ManStat'",
    "mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false and title contains 'ตะขบ'",
    "mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false and title contains 'บุคลากร'",
    "mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false and title contains 'สถิติ'",
    "mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false and title contains 'การลา'",
    "mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false and title contains 'ครู'",
    "mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false"
  ];

  for (var qIdx = 0; qIdx < searchQueries.length; qIdx++) {
    try {
      var files = DriveApp.searchFiles(searchQueries[qIdx]);
      var countThisQuery = 0;
      while (files.hasNext() && countThisQuery < 8 && Object.keys(checkedIds).length < 25) {
        var file = files.next();
        var fId = file.getId();
        if (checkedIds[fId]) continue;
        checkedIds[fId] = true;
        countThisQuery++;
        var fName = file.getName();
        if (fName.indexOf('Template') !== -1) continue;

        try {
          var candidateSs = SpreadsheetApp.openById(fId);
          if (candidateSs) {
            var tCount = _countTeachersInSpreadsheet(candidateSs);
            if (tCount > bestTeacherCount) {
              bestTeacherCount = tCount;
              bestSs = candidateSs;
              if (bestTeacherCount >= 5) break;
            }
          }
        } catch (innerErr) {}
      }
      if (bestTeacherCount >= 5) break;
    } catch (queryErr) {
      Logger.log('Drive query error: ' + queryErr.message);
    }
  }

  if (bestSs && bestTeacherCount > 0) {
    _cachedSpreadsheetInstance = bestSs;
    try {
      PropertiesService.getScriptProperties().setProperty('MANSTAT_VALID_SS_ID', bestSs.getId());
      PropertiesService.getScriptProperties().setProperty('MANSTAT_SPREADSHEET_ID', bestSs.getId());
    } catch (e) {}
    Logger.log('Auto-connected to spreadsheet: ' + bestSs.getName() + ' (' + bestSs.getId() + ') with ' + bestTeacherCount + ' staff records');
    return bestSs;
  }

  // หากพบไฟล์เดิมใน PropertiesService ให้ใช้ไฟล์นั้น
  if (fallbackSs) {
    _cachedSpreadsheetInstance = fallbackSs;
    return fallbackSs;
  }

  // 5. Fallback: สร้างไฟล์ฐานข้อมูลเริ่มต้นใหม่
  try {
    var newSs = SpreadsheetApp.create('ManStat_Database_โรงเรียนชุมชนบ้านตะขบ');
    _cachedSpreadsheetInstance = newSs;
    try {
      PropertiesService.getScriptProperties().setProperty('MANSTAT_VALID_SS_ID', newSs.getId());
      PropertiesService.getScriptProperties().setProperty('MANSTAT_SPREADSHEET_ID', newSs.getId());
    } catch (e) {}
    return newSs;
  } catch (createErr) {
    throw new Error('ไม่สามารถเข้าถึงหรือสร้างฐานข้อมูล Google Sheets ได้: ' + createErr.message);
  }
}

function DB_setSpreadsheetIdManual(spreadsheetIdOrUrl) {
  var raw = String(spreadsheetIdOrUrl || '').trim();
  if (!raw) throw new Error('กรุณาระบุ Spreadsheet ID หรือลิงก์ URL ของ Google Sheets');
  var match = raw.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  var cleanId = match ? match[1] : raw;
  var ss = SpreadsheetApp.openById(cleanId);
  if (!ss) throw new Error('ไม่สามารถเปิดไฟล์ Google Sheets จากรหัสนี้ได้');
  _cachedSpreadsheetInstance = ss;
  PropertiesService.getScriptProperties().setProperty('MANSTAT_VALID_SS_ID', ss.getId());
  PropertiesService.getScriptProperties().setProperty('MANSTAT_SPREADSHEET_ID', ss.getId());
  if (typeof clearSystemCache === 'function') clearSystemCache();
  var tCount = _countTeachersInSpreadsheet(ss);
  return {
    status: 'success',
    ssName: ss.getName(),
    ssId: ss.getId(),
    teacherCount: tCount,
    message: 'เชื่อมต่อฐานข้อมูล "' + ss.getName() + '" สำเร็จ (พบบุคลากร ' + tCount + ' คน)'
  };
}

function DB_getSheet(name) {
  var ss = DB_getSpreadsheet();
  return ss ? ss.getSheetByName(name) : null;
}

function getSuperuserPass() {
  try {
    var propPass = PropertiesService.getScriptProperties().getProperty('SUPERUSER_PASS');
    if (propPass) return propPass;
  } catch (e) {}
  return CONFIG.SUPERUSER_PASS || '44123130114';
}