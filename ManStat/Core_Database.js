function doGet(e) {
  try {
    const ss = DB_getSpreadsheet();
    const tSheet = ss.getSheetByName(CONFIG.SHEETS.TEACHERS);
    if (!tSheet || tSheet.getLastRow() <= 1) {
      setupDatabase();
    }
  } catch (err) {}

  const page = (e && e.parameter && e.parameter.page) ? e.parameter.page : 'index';
  const fileName = (page === 'admin') ? 'Admin' : 'Index';

  let template = HtmlService.createTemplateFromFile(fileName);
  return template.evaluate()
    .setTitle(CONFIG.APP_NAME)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function setupDatabase() {
  const ss = DB_getSpreadsheet();
  
  if (typeof _getUnifiedSchoolSheet === 'function') {
    try { _getUnifiedSchoolSheet(); } catch (e) {}
  }

  const sheetsConfig = CONFIG.SHEETS || {};
  const headersConfig = CONFIG.HEADERS || {};

  for (let key in sheetsConfig) {
    let sheetName = sheetsConfig[key];
    if (!sheetName || sheetName === 'SchoolInfo') continue;

    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }
    
    let headers = headersConfig[sheetName];
    if (headers && headers.length > 0 && sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length)
        .setBackground('#101822')
        .setFontColor('#66c0f4')
        .setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
  }

  const targetUserSheetName = CONFIG.SHEETS.TEACHERS || 'Teachers';
  let tSheet = ss.getSheetByName(targetUserSheetName);
  if (!tSheet) {
    tSheet = ss.insertSheet(targetUserSheetName);
    let defaultHeaders = CONFIG.HEADERS.Teachers;
    tSheet.getRange(1, 1, 1, defaultHeaders.length).setValues([defaultHeaders]);
    tSheet.setFrozenRows(1);
  }

  let hasRealTeacherRow = false;
  if (tSheet.getLastRow() > 1) {
    const existingVals = tSheet.getDataRange().getDisplayValues();
    for (let r = 1; r < existingVals.length; r++) {
      const rowHasText = existingVals[r].some(c => String(c || '').trim() !== '');
      if (rowHasText) {
        hasRealTeacherRow = true;
        break;
      }
    }
  }

  if (!hasRealTeacherRow) {
    let currentEmail = 'admin@school.ac.th';
    try {
      currentEmail = Session.getActiveUser().getEmail() || 'admin@school.ac.th';
    } catch (e) {}
    const superPass = (typeof _hashPasswordSHA256 === 'function')
      ? _hashPasswordSHA256(getSuperuserPass())
      : (typeof getSuperuserPass === 'function' ? getSuperuserPass() : (CONFIG.SUPERUSER_PASS || '44123130114'));

    _seedInitialSchoolData(ss, tSheet, currentEmail, superPass);
  }

  const holidaySheetName = CONFIG.SHEETS.HOLIDAYS || 'Holidays';
  let holidaySheet = ss.getSheetByName(holidaySheetName);
  if (!holidaySheet) {
    holidaySheet = ss.insertSheet(holidaySheetName);
    holidaySheet.appendRow(['HolidayDate', 'ReasonType', 'Note', 'DirectorName', 'Timestamp']);
  }
  if (holidaySheet.getLastRow() <= 1) {
    holidaySheet.appendRow(['23/10/2569', 'วันหยุดนักขัตฤกษ์ (ตามปฏิทินหลวง)', 'วันปิยมหาราช', 'นายธีรศักดิ์ มโนธรรม', '2026-10-01 08:00:00']);
    holidaySheet.appendRow(['05/12/2569', 'วันหยุดนักขัตฤกษ์ (ตามปฏิทินหลวง)', 'วันพ่อแห่งชาติ', 'นายธีรศักดิ์ มโนธรรม', '2026-10-01 08:00:00']);
  }

  clearSystemCache();
  return 'สร้างและอัปเกรดฐานข้อมูล ManStat สำเร็จเรียบร้อย (Null-Safe)';
}

function forceRepairAndLoadStaff() {
  try {
    _cachedSpreadsheetInstance = null;
    if (typeof clearSystemCache === 'function') clearSystemCache();
    const ss = DB_getSpreadsheet();
    const tSheet = ss ? ss.getSheetByName(CONFIG.SHEETS.TEACHERS) : null;
    if (!tSheet || tSheet.getLastRow() <= 1) {
      try { setupDatabase(); } catch (e) {}
    }
    const bundle = getMainBundleData();
    bundle.debugDbName = ss ? ss.getName() : 'ไม่พบไฟล์';
    bundle.debugDbId = ss ? ss.getId() : '-';
    return bundle;
  } catch (err) {
    return {
      status: 'error',
      message: String(err && err.message ? err.message : err),
      usersSummary: []
    };
  }
}

function _seedInitialSchoolData(ss, tSheet, currentEmail, superPass) {
  // 1. เพิ่มข้อมูลบุคลากรเริ่มต้น โรงเรียนชุมชนบ้านตะขบ
  const defaultTeachers = [
    ['EXE-001', 'นายธีรศักดิ์ มโนธรรม', currentEmail, "'0812345678", '', 'ผู้อำนวยการสถานศึกษา', '', superPass, 'Superuser', 'ปกติ', '2015-05-15', 'สายงานบริหารและสนับสนุนการศึกษา', 'ข้าราชการครูและบุคลากรทางการศึกษา', "'1300000000000", 'ผู้บริหารสถานศึกษา', '10001', '-', '1975-01-01'],
    ['EXE-002', 'นางศิริพร บุญยืน', 'deputy@school.ac.th', "'0823456789", '', 'รองผู้อำนวยการสถานศึกษา', '', superPass, 'Admin', 'ปกติ', '2016-08-01', 'สายงานบริหารและสนับสนุนการศึกษา', 'ข้าราชการครูและบุคลากรทางการศึกษา', "'1300000000001", 'ผู้บริหารสถานศึกษา', '10002', '-', '1978-05-12'],
    ['TCH-001', 'นายสมชาย ใจดี', 'somchai@school.ac.th', "'0834567890", 'มัธยมศึกษาปีที่ 1', 'ครู', 'วันจันทร์', superPass, 'User', 'ปกติ', '2017-06-01', 'กลุ่มสาระการเรียนรู้ภาษาไทย', 'ข้าราชการครูและบุคลากรทางการศึกษา', "'1300000000002", 'ฝ่ายบริหารวิชาการ', '10003', '-', '1982-03-15'],
    ['TCH-002', 'นางสาวพิมพ์ใจ รักเรียน', 'pimjai@school.ac.th', "'0845678901", 'มัธยมศึกษาปีที่ 2', 'ครู', 'วันอังคาร', superPass, 'User', 'ปกติ', '2018-09-01', 'กลุ่มสาระการเรียนรู้คณิตศาสตร์', 'ข้าราชการครูและบุคลากรทางการศึกษา', "'1300000000003", 'ฝ่ายบริหารวิชาการ', '10004', '-', '1985-07-20'],
    ['TCH-003', 'นายวิทยา มุ่งมั่น', 'wittaya@school.ac.th', "'0856789012", 'มัธยมศึกษาปีที่ 3', 'ครู', 'วันพุธ', superPass, 'User', 'ปกติ', '2019-10-01', 'กลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี', 'ข้าราชการครูและบุคลากรทางการศึกษา', "'1300000000004", 'ฝ่ายบริหารงบประมาณ', '10005', '-', '1987-11-10'],
    ['TCH-004', 'นางสาวกานดา สดใส', 'kanda@school.ac.th', "'0867890123", 'ประถมศึกษาปีที่ 6', 'ครู', 'วันพฤหัสบดี', superPass, 'User', 'ปกติ', '2020-11-15', 'กลุ่มสาระการเรียนรู้ภาษาต่างประเทศ', 'ข้าราชการครูและบุคลากรทางการศึกษา', "'1300000000005", 'ฝ่ายบริหารงานทั่วไป', '10006', '-', '1990-02-18'],
    ['TCH-005', 'นายประสิทธิ์ ประเสริฐสุข', 'prasit@school.ac.th', "'0878901234", 'ประถมศึกษาปีที่ 5', 'ครู', 'วันศุกร์', superPass, 'User', 'ปกติ', '2018-05-15', 'กลุ่มสาระการเรียนรู้สังคมศึกษา ศาสนา และวัฒนธรรม', 'ข้าราชการครูและบุคลากรทางการศึกษา', "'1300000000006", 'ฝ่ายบริหารบุคคล', '10007', '-', '1984-09-25'],
    ['TCH-006', 'นายสมศักดิ์ แข็งแรง', 'somsak@school.ac.th', "'0889012345", 'ประถมศึกษาปีที่ 4', 'ครู', 'วันจันทร์', superPass, 'User', 'ปกติ', '2021-06-01', 'กลุ่มสาระการเรียนรู้สุขศึกษาและพลศึกษา', 'ข้าราชการครูและบุคลากรทางการศึกษา', "'1300000000007", 'ฝ่ายบริหารงานทั่วไป', '10008', '-', '1992-12-05'],
    ['TCH-007', 'นางสาววิไลลักษณ์ ศิลปิน', 'wilai@school.ac.th', "'0890123456", 'ประถมศึกษาปีที่ 3', 'ครูผู้ช่วย', 'วันอังคาร', superPass, 'User', 'ปกติ', '2023-10-01', 'กลุ่มสาระการเรียนรู้ศิลปะ', 'ข้าราชการครูและบุคลากรทางการศึกษา', "'1300000000008", 'ฝ่ายบริหารวิชาการ', '10009', '-', '1996-04-14'],
    ['TCH-008', 'นายสุรชัย งานดี', 'surachai@school.ac.th', "'0811223344", 'ประถมศึกษาปีที่ 2', 'ครู', 'วันพุธ', superPass, 'User', 'ปกติ', '2016-01-15', 'กลุ่มสาระการเรียนรู้การงานอาชีพ', 'ข้าราชการครูและบุคลากรทางการศึกษา', "'1300000000009", 'ฝ่ายบริหารงานทั่วไป', '10010', '-', '1980-08-30'],
    ['STF-001', 'นางสาวนภา แจ่มใส', 'napha@school.ac.th', "'0822334455", '', 'เจ้าหน้าที่ธุรการ', '', superPass, 'User', 'ปกติ', '2019-01-01', 'สายงานบริหารและสนับสนุนการศึกษา', 'พนักงานราชการ', "'1300000000010", 'ฝ่ายบริหารงานบุคคล', '20001', '-', '1993-06-12'],
    ['STF-002', 'นายวินัย ปลอดภัย', 'winai@school.ac.th', "'0833445566", '', 'ช่างไม้และบริการอาคารสถานที่', '', superPass, 'User', 'ปกติ', '2017-04-01', 'สายงานบริหารและสนับสนุนการศึกษา', 'ลูกจ้างประจำ', "'1300000000011", 'ฝ่ายบริหารงานทั่วไป', '30001', '-', '1979-10-08']
  ];

  defaultTeachers.forEach(row => tSheet.appendRow(row));

  // 2. เติมโควตาการลา (Leave_Quota) ปีงบประมาณ 2570
  let quotaSheetName = CONFIG.SHEETS.QUOTA || 'Leave_Quota';
  let qSheet = ss.getSheetByName(quotaSheetName);
  if (!qSheet) {
    qSheet = ss.insertSheet(quotaSheetName);
    qSheet.appendRow(['EmpID', 'FiscalYear', 'Sick_Max', 'Sick_Used', 'Personal_Max', 'Personal_Used']);
  }
  if (qSheet.getLastRow() <= 1) {
    const quotaData = [
      ['EXE-001', '2570', 60, 0, 45, 0],
      ['EXE-002', '2570', 60, 0, 45, 0],
      ['TCH-001', '2570', 60, 2, 45, 0],
      ['TCH-002', '2570', 60, 0, 45, 1],
      ['TCH-003', '2570', 60, 0, 45, 0],
      ['TCH-004', '2570', 60, 1, 45, 0],
      ['TCH-005', '2570', 60, 0, 45, 1],
      ['TCH-006', '2570', 60, 0, 45, 0],
      ['TCH-007', '2570', 60, 0, 45, 0],
      ['TCH-008', '2570', 60, 0, 45, 0],
      ['STF-001', '2570', 60, 0, 45, 0],
      ['STF-002', '2570', 60, 0, 45, 0]
    ];
    quotaData.forEach(r => qSheet.appendRow(r));
  }

  // 3. เติมประวัติคำร้องการลาตัวอย่าง (Leave_Logs)
  let logSheetName = CONFIG.SHEETS.LOGS || 'Leave_Logs';
  let logSheet = ss.getSheetByName(logSheetName);
  if (!logSheet) {
    logSheet = ss.insertSheet(logSheetName);
    logSheet.appendRow(['LeaveID', 'EmpID', 'Name', 'LeaveType', 'TotalDays', 'TotalHours', 'StartDate', 'EndDate', 'Reason', 'Status', 'ApprovedBy', 'ApproverRole', 'CreatedAt', 'ApproverComment', 'SubstituteName', 'FileUrl']);
  }
  if (logSheet.getLastRow() <= 1) {
    const logData = [
      ['LEV-2570-001', 'TCH-001', 'นายสมชาย ใจดี', 'ลาป่วย', 2, 0, '10/10/2569', '11/10/2569', 'มีอาการไข้หวัด ปวดศีรษะและไอ', 'อนุมัติ', 'นายธีรศักดิ์ มโนธรรม', 'ผู้อำนวยการสถานศึกษา', '2026-10-10 07:30:00', 'อนุมัติการลาตามระเบียบ', 'นางสาวพิมพ์ใจ รักเรียน', ''],
      ['LEV-2570-002', 'TCH-002', 'นางสาวพิมพ์ใจ รักเรียน', 'ลากิจส่วนตัว', 1, 0, '15/10/2569', '15/10/2569', 'ไปติดต่อราชการที่ว่าการอำเภอ', 'อนุมัติ', 'นายธีรศักดิ์ มโนธรรม', 'ผู้อำนวยการสถานศึกษา', '2026-10-14 16:00:00', 'อนุมัติ', 'นายสมชาย ใจดี', ''],
      ['LEV-2570-003', 'TCH-003', 'นายวิทยา มุ่งมั่น', 'ขออนุญาตออกนอกบริเวณสถานศึกษา (3 ชม.)', 0, 3, '18/10/2569', '18/10/2569', 'ไปธนาคารเพื่อส่งเอกสารโครงการห้องเรียนคุณภาพ', 'อนุมัติ', 'นายธีรศักดิ์ มโนธรรม', 'ผู้อำนวยการสถานศึกษา', '2026-10-18 09:00:00', 'อนุญาต', 'นางสาวกานดา สดใส', ''],
      ['LEV-2570-004', 'TCH-004', 'นางสาวกานดา สดใส', 'ลาป่วย', 1, 0, '20/10/2569', '20/10/2569', 'ปวดท้องเฉียบพลันและมีไข้', 'อนุมัติ', 'นายธีรศักดิ์ มโนธรรม', 'ผู้อำนวยการสถานศึกษา', '2026-10-20 07:45:00', 'อนุมัติ', 'นายวิทยา มุ่งมั่น', ''],
      ['LEV-2570-005', 'TCH-005', 'นายประสิทธิ์ ประเสริฐสุข', 'ลากิจส่วนตัว', 1, 0, '24/10/2569', '24/10/2569', 'ไปร่วมงานประเพณีครอบครัวต่างจังหวัด', 'รออนุมัติ', '-', '-', '2026-10-23 15:30:00', '-', 'นายสมศักดิ์ แข็งแรง', ''],
      ['LEV-2570-006', 'STF-001', 'นางสาวนภา แจ่มใส', 'ขออนุญาตออกนอกบริเวณสถานศึกษา (3 ชม.)', 0, 3, '25/10/2569', '25/10/2569', 'ไปส่งเอกสารหนังสือราชการที่สำนักงานเขตพื้นที่การศึกษา', 'อนุมัติ', 'นายธีรศักดิ์ มโนธรรม', 'ผู้อำนวยการสถานศึกษา', '2026-10-25 10:00:00', 'อนุญาต', '-', '']
    ];
    logData.forEach(r => logSheet.appendRow(r));
  }

  // 4. เติมวิทยฐานะ (History_Standing)
  let stdSheetName = CONFIG.SHEETS.STANDING || 'History_Standing';
  let stdSheet = ss.getSheetByName(stdSheetName);
  if (!stdSheet) {
    stdSheet = ss.insertSheet(stdSheetName);
    stdSheet.appendRow(['RecordID', 'EmpID', 'StandingLevel', 'EffectiveDate', 'OrderNumber']);
  }
  if (stdSheet.getLastRow() <= 1) {
    const stdData = [
      ['REC-STD-001', 'EXE-001', 'ผู้อำนวยการชำนาญการพิเศษ', '2018-10-01', 'คำสั่ง สพป.นม.3 ที่ 125/2561'],
      ['REC-STD-002', 'EXE-002', 'รองผู้อำนวยการชำนาญการพิเศษ', '2019-10-01', 'คำสั่ง สพป.นม.3 ที่ 150/2562'],
      ['REC-STD-003', 'TCH-001', 'ครูชำนาญการพิเศษ', '2020-04-01', 'คำสั่ง สพป.นม.3 ที่ 89/2563'],
      ['REC-STD-004', 'TCH-002', 'ครูชำนาญการ', '2021-10-01', 'คำสั่ง สพป.นม.3 ที่ 210/2564'],
      ['REC-STD-005', 'TCH-005', 'ครูชำนาญการ', '2022-04-01', 'คำสั่ง สพป.นม.3 ที่ 95/2565'],
      ['REC-STD-006', 'TCH-008', 'ครูชำนาญการพิเศษ', '2019-04-01', 'คำสั่ง สพป.นม.3 ที่ 77/2562']
    ];
    stdData.forEach(r => stdSheet.appendRow(r));
  }

  // 5. เติมใบอนุญาตประกอบวิชาชีพ (History_Licenses)
  let licSheetName = CONFIG.SHEETS.LICENSES || 'History_Licenses';
  let licSheet = ss.getSheetByName(licSheetName);
  if (!licSheet) {
    licSheet = ss.insertSheet(licSheetName);
    licSheet.appendRow(['RecordID', 'EmpID', 'LicenseCategory', 'LicenseType', 'LicenseNumber', 'IssueDate', 'ExpiryDate']);
  }
  if (licSheet.getLastRow() <= 1) {
    const licData = [
      ['REC-LIC-001', 'EXE-001', 'วิชาชีพผู้บริหารสถานศึกษา', 'ใบอนุญาตประกอบวิชาชีพผู้บริหารสถานศึกษา (ชั้นสูง)', '6210900012345', '2020-05-15', '2027-05-14'],
      ['REC-LIC-002', 'EXE-002', 'วิชาชีพผู้บริหารสถานศึกษา', 'ใบอนุญาตประกอบวิชาชีพผู้บริหารสถานศึกษา (ชั้นสูง)', '6210900012346', '2021-08-01', '2028-07-31'],
      ['REC-LIC-003', 'TCH-001', 'วิชาชีพครู', 'ใบอนุญาตประกอบวิชาชีพครูชั้นสูง (Advanced)', '6110900054321', '2019-06-01', '2026-12-31'],
      ['REC-LIC-004', 'TCH-002', 'วิชาชีพครู', 'ใบอนุญาตประกอบวิชาชีพครูชั้นต้น (Basic)', '6310900065432', '2021-09-01', '2028-08-31'],
      ['REC-LIC-005', 'TCH-003', 'วิชาชีพครู', 'ใบอนุญาตประกอบวิชาชีพครูชั้นต้น (Basic)', '6410900076543', '2022-10-01', '2029-09-30']
    ];
    licData.forEach(r => licSheet.appendRow(r));
  }
}

function linkCustomSpreadsheetAndReload(ssIdOrUrl) {
  try {
    const linkRes = DB_setSpreadsheetIdManual(ssIdOrUrl);
    const bundle = getMainBundleData();
    bundle.linkMessage = linkRes.message;
    return bundle;
  } catch (err) {
    return {
      status: 'error',
      message: String(err && err.message ? err.message : err)
    };
  }
}

function getSheetDataAsObjects(sheetName, useCache = true) {
  const cache = CacheService.getScriptCache();
  const cacheKey = 'MANSTAT_V8_' + sheetName;
  
  if (useCache) {
    const cached = cache.get(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
  }

  const ss = DB_getSpreadsheet();
  if (!ss) return [];
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() <= 1) return [];
  
  const data = sheet.getDataRange().getDisplayValues();
  const headers = data[0].map(h => String(h || '').trim());
  
  const result = [];
  for (let r = 1; r < data.length; r++) {
    const row = data[r];
    const hasAnyValue = row.some(cell => String(cell || '').trim() !== '');
    if (!hasAnyValue) continue;

    let obj = {};
    headers.forEach((h, i) => {
      if (h) obj[h] = row[i];
    });
    result.push(obj);
  }

  if (useCache && result.length > 0) {
    try {
      const jsonStr = JSON.stringify(result);
      if (jsonStr.length < 95000) {
        cache.put(cacheKey, jsonStr, 180);
      }
    } catch (e) {}
  }

  return result;
}

function clearSystemCache(sheetNames = []) {
  try {
    SpreadsheetApp.flush();
    const cache = CacheService.getScriptCache();
    const prefixes = ['MANSTAT_V5_', 'MANSTAT_V6_', 'MANSTAT_V7_', 'MANSTAT_V8_'];
    const targets = sheetNames.length === 0 ? Object.values(CONFIG.SHEETS) : sheetNames;
    let keysToRemove = [];
    prefixes.forEach(pfx => {
      targets.forEach(s => keysToRemove.push(pfx + s));
    });
    cache.removeAll(keysToRemove);
  } catch (e) {}
}

function parseLocalDate(dateStr) {
  if (!dateStr) return null;
  if (Object.prototype.toString.call(dateStr) === '[object Date]') {
    return isNaN(dateStr.getTime()) ? null : dateStr;
  }
  let s = String(dateStr).trim().split(' ')[0];
  if (s.includes('/')) {
    let p = s.split('/');
    if (p.length === 3) {
      let y = parseInt(p[2], 10);
      while (y >= 2900) y -= 543;
      if (y > 2400) y -= 543;
      return new Date(y, parseInt(p[1], 10) - 1, parseInt(p[0], 10));
    }
  }
  const parts = s.split('-');
  if (parts.length !== 3) return new Date(s);
  let yr = parseInt(parts[0], 10);
  while (yr >= 2900) yr -= 543;
  if (yr > 2400) yr -= 543;
  return new Date(yr, parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
}

function sanitizeStr(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function uploadFileToDrive(base64Data, fileName) {
  if (!base64Data || !fileName) return '-';
  try {
    const folders = DriveApp.getFoldersByName(CONFIG.UPLOAD_FOLDER_NAME);
    let folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(CONFIG.UPLOAD_FOLDER_NAME);
    
    const splitBase = base64Data.split(',');
    const contentType = splitBase[0].split(':')[1].split(';')[0];
    const byteCharacters = Utilities.base64Decode(splitBase[1]);
    const safeFileName = Utilities.formatDate(new Date(), 'GMT+7', 'yyyyMMdd_HHmmss_') + fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const blob = Utilities.newBlob(byteCharacters, contentType, safeFileName);
    
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getUrl();
  } catch (e) {
    return 'Error: ' + e.toString();
  }
}

function testDatabaseConnection() {
  const startTime = new Date().getTime();
  try {
    _cachedSpreadsheetInstance = null;
    try {
      PropertiesService.getScriptProperties().deleteProperty('MANSTAT_SPREADSHEET_ID');
    } catch (e) {}
    const ss = DB_getSpreadsheet();
    const teachers = Staff_getAll();
    const school = School_getInfo();
    const latency = new Date().getTime() - startTime;
    return {
      status: 'success',
      dbName: ss.getName(),
      dbId: ss.getId(),
      totalUsers: teachers.length,
      schoolInfo: school,
      latencyMs: latency,
      message: `เชื่อมต่อไฟล์ "${ss.getName()}" สำเร็จ (พบบุคลากร ${teachers.length} คน | ความเร็ว ${latency} ms)`
    };
  } catch (err) {
    return { status: 'error', message: 'ไม่สามารถเชื่อมต่อฐานข้อมูลได้: ' + err.toString() };
  }
}

function getAdminBundle() {
  let htmlContent = HtmlService.createTemplateFromFile('Admin').evaluate().getContent();
  return {
    htmlContent: htmlContent,
    adminData: getAdminData()
  };
}

function getHomeBundle(savedEmail) {
  let htmlContent = HtmlService.createTemplateFromFile('Index').evaluate().getContent();
  return {
    htmlContent: htmlContent,
    initialData: getMainBundleData(savedEmail)
  };
}