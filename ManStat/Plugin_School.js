const DEFAULT_ACTIVE_CLASSES_JSON = JSON.stringify([
  "อนุบาล 1", "อนุบาล 2", "อนุบาล 3",
  "ประถมศึกษาปีที่ 1", "ประถมศึกษาปีที่ 2", "ประถมศึกษาปีที่ 3",
  "ประถมศึกษาปีที่ 4", "ประถมศึกษาปีที่ 5", "ประถมศึกษาปีที่ 6",
  "มัธยมศึกษาปีที่ 1", "มัธยมศึกษาปีที่ 2", "มัธยมศึกษาปีที่ 3"
]);

const SCHOOL_KEY_MAP = [
  { key: "schoolName", th: "ชื่อสถานศึกษา", def: "โรงเรียนชุมชนบ้านตะขบ" },
  { key: "affiliation", th: "หน่วยงานต้นสังกัด", def: "สำนักงานเขตพื้นที่การศึกษาประถมศึกษานครราชสีมา เขต 3" },
  { key: "schoolCode10", th: "รหัส 10 หลัก", def: "" },
  { key: "schoolCode8", th: "รหัส 8 หลัก", def: "" },
  { key: "systemName", th: "ชื่อระบบแอปพลิเคชัน", def: "ManStat" },
  { key: "directorName", th: "ชื่อผู้อำนวยการ", def: "นายธีรศักดิ์ มโนธรรม" },
  { key: "directorPosition", th: "ตำแหน่งผู้อำนวยการ", def: "ผู้อำนวยการโรงเรียนชุมชนบ้านตะขบ" },
  { key: "contactPhone", th: "เบอร์โทรศัพท์", def: "" },
  { key: "contactEmail", th: "อีเมล", def: "" },
  { key: "address", th: "ที่อยู่", def: "" },
  { key: "lat", th: "ละติจูด (Lat)", def: "" },
  { key: "lng", th: "ลองจิจูด (Lng)", def: "" },
  { key: "logoBase64", th: "Logo Base64", def: "" },
  { key: "deputy1", th: "รักษาการคนที่ 1", def: "" },
  { key: "deputy2", th: "รักษาการคนที่ 2", def: "" },
  { key: "academicYear", th: "ปีการศึกษา", def: "2569" },
  { key: "fiscalYear", th: "ปีงบประมาณ", def: "2570" },
  { key: "activeClassesJson", th: "ชั้นเรียนที่เปิดสอน", def: DEFAULT_ACTIVE_CLASSES_JSON }
];

function _getUnifiedSchoolSheet() {
  const ss = DB_getSpreadsheet();
  let mainSheet = ss.getSheetByName("SchoolInfo");
  let dupSheet = ss.getSheetByName("School_Info");

  if (mainSheet && dupSheet) {
    try { ss.deleteSheet(dupSheet); } catch (e) {}
  } else if (!mainSheet && dupSheet) {
    dupSheet.setName("SchoolInfo");
    mainSheet = dupSheet;
  }

  if (!mainSheet) {
    mainSheet = ss.insertSheet("SchoolInfo");
    const defaults = SCHOOL_KEY_MAP.map(item => [item.th, item.def]);
    mainSheet.getRange(1, 1, defaults.length, 2).setValues(defaults);
    mainSheet.getRange(1, 1, defaults.length, 1).setFontWeight("bold").setBackground("#f3f3f3");
    mainSheet.setColumnWidth(1, 180);
    mainSheet.setColumnWidth(2, 380);
  }
  return mainSheet;
}

function School_getInfo() {
  const sheet = _getUnifiedSchoolSheet();
  const data = sheet.getDataRange().getDisplayValues();
  
  let info = {};
  SCHOOL_KEY_MAP.forEach(item => { info[item.key] = item.def; });

  for (let i = 0; i < data.length; i++) {
    let rawKey = String(data[i][0] || "").trim();
    let val = data[i][1];
    if (!rawKey) continue;

    let matched = SCHOOL_KEY_MAP.find(item => item.th === rawKey || item.key === rawKey);
    if (matched) {
      info[matched.key] = val;
    } else {
      info[rawKey] = val;
    }
  }
  return info;
}

function School_getActiveClasses() {
  const info = School_getInfo();
  try {
    let parsed = JSON.parse(info.activeClassesJson || DEFAULT_ACTIVE_CLASSES_JSON);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch (e) {}
  return JSON.parse(DEFAULT_ACTIVE_CLASSES_JSON);
}

function School_saveInfo(info) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sheet = _getUnifiedSchoolSheet();
    const data = sheet.getDataRange().getDisplayValues();

    // Map existing rows into an array for fast in-memory batch updates
    let rowMap = {};
    let rows = [];
    for (let i = 0; i < data.length; i++) {
      let rKey = String(data[i][0] || "").trim();
      rows.push([rKey, data[i][1] || ""]);
      if (rKey) rowMap[rKey] = i;
    }

    SCHOOL_KEY_MAP.forEach(item => {
      if (info && Object.prototype.hasOwnProperty.call(info, item.key)) {
        let valToSave = info[item.key];
        if ((item.key === "contactPhone" || item.key === "schoolCode10" || item.key === "schoolCode8") && valToSave) {
          valToSave = "'" + String(valToSave).replace(/^'+/, "");
        }

        let idx = (rowMap[item.th] !== undefined) ? rowMap[item.th] : rowMap[item.key];
        if (idx !== undefined) {
          rows[idx][0] = item.th;
          rows[idx][1] = valToSave;
        } else {
          rowMap[item.th] = rows.length;
          rows.push([item.th, valToSave]);
        }
      }
    });

    if (rows.length > 0) {
      sheet.getRange(1, 1, rows.length, 2).setValues(rows);
    }

    if (typeof clearSystemCache === 'function') {
      clearSystemCache(['SchoolInfo']);
    }
    return { success: true, status: 'success', schoolInfo: School_getInfo(), message: "อัปเดตข้อมูลสถานศึกษาเรียบร้อยแล้ว" };
  } catch (e) {
    return { success: false, status: 'error', message: e.toString() };
  } finally {
    lock.releaseLock();
  }
}

function saveAdminSchoolInfo(payload) {
  return School_saveInfo(payload);
}

function saveAdminActiveClasses(activeClassesArr) {
  if (!Array.isArray(activeClassesArr) || activeClassesArr.length === 0) {
    throw new Error("กรุณาเลือกเปิดสอนอย่างน้อย 1 ชั้นเรียน");
  }
  const jsonStr = JSON.stringify(activeClassesArr);
  School_saveInfo({ activeClassesJson: jsonStr });
  return {
    success: true,
    activeClasses: activeClassesArr,
    message: `บันทึกชั้นเรียนที่เปิดสอน (${activeClassesArr.length} ชั้นเรียน) เรียบร้อยแล้ว`
  };
}

function uploadSchoolLogo(fileName, mimeType, base64Data) {
  return School_saveInfo({ logoBase64: base64Data });
}