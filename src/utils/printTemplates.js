/**
 * =========================================================================
 * MANSTAT MODERN - OFFICIAL THAI GOVERNMENT PRINT TEMPLATES (printTemplates.js)
 * =========================================================================
 * Generates official Thai civil servant leave forms (แบบใบลาพักผ่อน, ลาป่วย/ลากิจ,
 * ขออนุญาตออกนอกสถานศึกษา) and Personnel Portfolio (ก.พ. 7 ย่อ)
 * =========================================================================
 */

function _safeEscapePrint(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function _formatThaiDateParts(dateStr) {
  const thaiMonths = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];
  if (!dateStr) return { day: "........", month: "....................", year: "............", full: "-" };
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    return { day: "........", month: "....................", year: "............", full: String(dateStr) };
  }
  const day = d.getDate();
  const month = thaiMonths[d.getMonth()];
  let year = d.getFullYear();
  if (year < 2400) year += 543;
  return {
    day: String(day),
    month: month,
    year: String(year),
    full: `${day} ${month} ${year}`
  };
}

function boxCheck(checked) {
  return '<span style="display:inline-block; width:13px; height:13px; border:1px solid #000; text-align:center; line-height:12px; font-size:12px; font-weight:bold; vertical-align:middle; margin-right:3px;">' + (checked ? '✓' : '&nbsp;') + '</span>';
}

function getOfficialLeaveFormHtml(leaveId, db) {
  const logs = db.logs || [];
  const teachers = db.teachers || [];
  const school = db.schoolInfo || {};

  const leave = logs.find(l => (l.leaveId === leaveId || l.LeaveID === leaveId));
  if (!leave) {
    return '<div style="padding:20px; text-align:center; font-family:Sarabun,sans-serif;"><h3>ไม่พบข้อมูลคำร้องขอลา</h3></div>';
  }

  const user = teachers.find(u => (u.id === leave.empId || u.EmpID === leave.empId || u.id === leave.EmpID || u.EmpID === leave.EmpID)) || {};
  const isPermit = String(leave.leaveType || leave.LeaveType || '').indexOf('3 ชม.') !== -1;
  const schoolName = school.schoolName || 'โรงเรียนชุมชนบ้านตะขบ';
  const affiliation = school.affiliation || 'สำนักงานเขตพื้นที่การศึกษาประถมศึกษานครราชสีมา เขต 3';
  const directorName = leave.signerName || leave.SignerName || school.directorName || 'นายธีรศักดิ์ มโนธรรม';
  const directorPos = school.directorPosition || 'ผู้อำนวยการโรงเรียนชุมชนบ้านตะขบ';

  let meta = {};
  try {
    const rmk = leave.remark || leave.Remark || leave.formMetaJson || leave.form_meta_json;
    if (rmk && typeof rmk === 'string' && rmk.trim().startsWith('{')) {
      meta = JSON.parse(rmk);
    } else if (typeof rmk === 'object' && rmk !== null) {
      meta = rmk;
    }
  } catch (e) {}

  const writeDate = _formatThaiDateParts(leave.timestamp || leave.Timestamp);
  const startDateParts = _formatThaiDateParts(leave.startDate || leave.StartDate);
  const endDateParts = _formatThaiDateParts(leave.endDate || leave.EndDate);

  const status = leave.status || leave.Status || 'รออนุมัติ';
  const isApproved = (status === 'อนุมัติ' || status === 'อนุมัติเรียบร้อย');
  const isRejected = (status === 'ไม่อนุมัติ');
  const hrDone = (leave.stepHr === 'ผ่านการตรวจสอบ' || leave.Step1_HR === 'ผ่านการตรวจสอบ');
  const acadDone = (leave.stepAcademic === 'ผ่านการตรวจสอบ' || leave.Step2_Academic === 'ผ่านการตรวจสอบ');

  const fullName = leave.fullName || leave.FullName || user.name || user.FullName || '-';
  const position = user.role || user.Position || '-';
  const reason = leave.reason || leave.Reason || '-';
  const leaveType = leave.leaveType || leave.LeaveType || 'ลากิจส่วนตัว';
  const totalDays = leave.totalDays || leave.TotalDays || 1;
  const totalHours = leave.totalHours || leave.TotalHours || 0;
  const startTime = leave.startTime || leave.StartTime || '-';
  const endTime = leave.endTime || leave.EndTime || '-';

  if (isPermit) {
    const place = meta.place || '-';
    const workloads = Array.isArray(meta.workloads) ? meta.workloads : [];
    const r1 = workloads[0] || {};
    const r2 = workloads[1] || {};
    const r3 = workloads[2] || {};

    return '<div style="font-family:\'Sarabun\', sans-serif; width:190mm; max-height:276mm; margin:0 auto; padding:6mm 8mm; box-sizing:border-box; color:#000; background:#fff; font-size:13.5px; line-height:1.55;">' +
      '<div style="text-align:center; font-weight:bold; font-size:15px;">แบบขออนุญาตออกนอกบริเวณโรงเรียนในเวลาราชการของข้าราชการครูและบุคลากรทางการศึกษา<br>(กรณีไม่เกิน 3 ชั่วโมง)</div>' +
      '<div style="text-align:right; margin-top:8px;">เขียนที่ <b>' + _safeEscapePrint(schoolName) + '</b><br>วันที่ <b>' + writeDate.day + '</b> เดือน <b>' + writeDate.month + '</b> พ.ศ. <b>' + writeDate.year + '</b></div>' +
      '<div style="margin-top:6px;"><b>เรื่อง</b> &nbsp;ขออนุญาตออกนอกบริเวณโรงเรียน<br><b>เรียน</b> &nbsp;ผู้อำนวยการ' + _safeEscapePrint(schoolName) + '</div>' +
      '<div style="text-indent:45px; margin-top:6px;">ข้าพเจ้า <b>' + _safeEscapePrint(fullName) + '</b> &nbsp;&nbsp;ตำแหน่ง <b>' + _safeEscapePrint(position) + '</b></div>' +
      '<div>ขออนุญาตออกนอกบริเวณโรงเรียน เพื่อ <u>' + _safeEscapePrint(reason) + '</u><br>ในวันที่ <b>' + startDateParts.day + '</b> เดือน <b>' + startDateParts.month + '</b> พ.ศ. <b>' + startDateParts.year + '</b> &nbsp;ระหว่างเวลา <b>' + _safeEscapePrint(startTime) + '</b> น. ถึง เวลา <b>' + _safeEscapePrint(endTime) + '</b> น. &nbsp;รวม <b>' + _safeEscapePrint(totalHours) + '</b> ชั่วโมง โดยไปที่ <u>' + _safeEscapePrint(place) + '</u></div>' +
      '<div style="margin-top:6px;">ในระหว่างที่ข้าพเจ้าไม่อยู่นี้ ข้าพเจ้าได้มอบหมายงานให้เพื่อนครูปฏิบัติหน้าที่แทน ดังนี้<br>' +
      '<div>1. ชั้น <u>&nbsp;' + _safeEscapePrint(r1.cls || '..........') + '&nbsp;</u> คาบที่ <u>&nbsp;' + _safeEscapePrint(r1.period || '........') + '&nbsp;</u> งานที่มอบหมาย <u>&nbsp;' + _safeEscapePrint(r1.task || '...........................') + '&nbsp;</u> ผู้สอนแทน <u>&nbsp;' + _safeEscapePrint(r1.sub || '...........................') + '&nbsp;</u> ลงชื่อผู้สอนแทน........................</div>' +
      '<div>2. ชั้น <u>&nbsp;' + _safeEscapePrint(r2.cls || '..........') + '&nbsp;</u> คาบที่ <u>&nbsp;' + _safeEscapePrint(r2.period || '........') + '&nbsp;</u> งานที่มอบหมาย <u>&nbsp;' + _safeEscapePrint(r2.task || '...........................') + '&nbsp;</u> ผู้สอนแทน <u>&nbsp;' + _safeEscapePrint(r2.sub || '...........................') + '&nbsp;</u> ลงชื่อผู้สอนแทน........................</div>' +
      '<div>3. ชั้น <u>&nbsp;' + _safeEscapePrint(r3.cls || '..........') + '&nbsp;</u> คาบที่ <u>&nbsp;' + _safeEscapePrint(r3.period || '........') + '&nbsp;</u> งานที่มอบหมาย <u>&nbsp;' + _safeEscapePrint(r3.task || '...........................') + '&nbsp;</u> ผู้สอนแทน <u>&nbsp;' + _safeEscapePrint(r3.sub || '...........................') + '&nbsp;</u> ลงชื่อผู้สอนแทน........................</div>' +
      '</div>' +
      '<div style="text-indent:45px; margin-top:6px;">จึงเรียนมาเพื่อโปรดทราบและพิจารณา</div>' +
      '<div style="text-align:right; margin-top:10px; padding-right:25px;">ลงชื่อ....................................................... ผู้ขออนุญาต<br>( <b>' + _safeEscapePrint(fullName) + '</b> )<br>ตำแหน่ง <b>' + _safeEscapePrint(position) + '</b></div>' +
      '<table style="width:100%; border-collapse:collapse; margin-top:12px; color:#000;" border="1"><tr>' +
      '<td style="width:50%; vertical-align:top; padding:8px 10px; text-align:left; color:#000; border:1px solid #000;">' +
      '<div style="text-align:center; font-weight:bold; text-decoration:underline; margin-bottom:6px;">ตรวจเสนอเพื่อพิจารณา</div>' +
      '<div>เห็นควร &nbsp;' + boxCheck(hrDone) + ' อนุญาต &nbsp;&nbsp;' + boxCheck(false) + ' ไม่อนุญาต</div>' +
      '<div style="text-align:center; margin-top:14px;">ลงชื่อ.......................................................<br>(นางสาวทัชชกร ช่วยจังหรีด)<br>ตำแหน่ง หัวหน้างานกลุ่มบริหารบุคคล<br>วันที่ ........../........../..........</div>' +
      '<hr style="border:none; border-top:1px dashed #000; margin:10px 0;">' +
      '<div>เห็นควร &nbsp;' + boxCheck(acadDone) + ' อนุญาต &nbsp;&nbsp;' + boxCheck(false) + ' ไม่อนุญาต</div>' +
      '<div style="text-align:center; margin-top:14px;">ลงชื่อ.......................................................<br>(นายพันธ์ธนัต ภวฤทธิ์นาคินทร์)<br>ตำแหน่ง หัวหน้างานกลุ่มบริหารวิชาการ<br>วันที่ ........../........../..........</div>' +
      '</td>' +
      '<td style="width:50%; vertical-align:top; padding:8px 10px; text-align:left; color:#000; border:1px solid #000;">' +
      '<div style="text-align:center; font-weight:bold; text-decoration:underline; margin-bottom:6px;">ความเห็นผู้อำนวยการโรงเรียน</div>' +
      '<div style="margin-top:10px; font-weight:bold;">คำสั่ง</div>' +
      '<div style="margin-top:6px; padding-left:15px;">' + boxCheck(isApproved) + ' อนุญาต<br>' + boxCheck(isRejected) + ' ไม่อนุญาต เนื่องจาก <u>' + _safeEscapePrint(meta.rejectReason || '....................................') + '</u></div>' +
      '<div style="text-align:center; margin-top:55px;">ลงชื่อ.......................................................<br>(' + _safeEscapePrint(directorName) + ')<br>ตำแหน่ง ' + _safeEscapePrint(directorPos) + '<br>วันที่ ........../........../..........</div>' +
      '</td></tr></table></div>';
  }

  // Standard Government Leave Form (แบบใบลาพักผ่อน / ป่วย / กิจ)
  const isVacation = leaveType === 'ลาพักผ่อน';
  const formTitle = isVacation ? 'แบบใบลาพักผ่อน' : 'แบบใบลาป่วย ลากิจส่วนตัว ลาคลอดบุตร';
  const contactAddr = meta.contactAddress || user.phone || '-';

  return '<div style="font-family:\'Sarabun\', sans-serif; width:190mm; margin:0 auto; padding:6mm 8mm; box-sizing:border-box; color:#000; background:#fff; font-size:13.5px; line-height:1.55;">' +
    '<div style="text-align:center; font-weight:bold; font-size:16px;">' + formTitle + '</div>' +
    '<div style="text-align:right; margin-top:8px;">เขียนที่ <b>' + _safeEscapePrint(schoolName) + '</b><br>วันที่ <b>' + writeDate.day + '</b> เดือน <b>' + writeDate.month + '</b> พ.ศ. <b>' + writeDate.year + '</b></div>' +
    '<div style="margin-top:6px;"><b>เรื่อง</b> &nbsp;ขอ' + _safeEscapePrint(leaveType) + '<br><b>เรียน</b> &nbsp;ผู้อำนวยการ' + _safeEscapePrint(schoolName) + '</div>' +
    '<div style="text-indent:45px; margin-top:6px;">ข้าพเจ้า <b>' + _safeEscapePrint(fullName) + '</b> &nbsp;&nbsp;ตำแหน่ง <b>' + _safeEscapePrint(position) + '</b> สังกัด <b>' + _safeEscapePrint(schoolName) + '</b> (' + _safeEscapePrint(affiliation) + ')</div>' +
    '<div>มีความประสงค์ขอ' + _safeEscapePrint(leaveType) + ' เนื่องจาก <u>' + _safeEscapePrint(reason) + '</u> ตั้งแต่วันที่ <b>' + startDateParts.day + '</b> เดือน <b>' + startDateParts.month + '</b> พ.ศ. <b>' + startDateParts.year + '</b> ถึงวันที่ <b>' + endDateParts.day + '</b> เดือน <b>' + endDateParts.month + '</b> พ.ศ. <b>' + endDateParts.year + '</b> มีกำหนด <b>' + _safeEscapePrint(totalDays) + '</b> วัน</div>' +
    '<div>ในระหว่างลาจะติดต่อข้าพเจ้าได้ที่ <u>' + _safeEscapePrint(contactAddr) + '</u></div>' +
    '<div style="text-indent:45px; margin-top:6px;">จึงเรียนมาเพื่อโปรดพิจารณาอนุญาต</div>' +
    '<div style="text-align:right; margin-top:10px; padding-right:25px;">ลงชื่อ....................................................... ผู้ขอลา<br>( <b>' + _safeEscapePrint(fullName) + '</b> )<br>ตำแหน่ง <b>' + _safeEscapePrint(position) + '</b></div>' +
    '<table style="width:100%; border-collapse:collapse; margin-top:14px; color:#000;" border="1"><tr>' +
    '<td style="width:50%; vertical-align:top; padding:8px 10px; text-align:left; border:1px solid #000;">' +
    '<div style="text-align:center; font-weight:bold; text-decoration:underline; margin-bottom:6px;">สถิติการลาในปีงบประมาณนี้</div>' +
    '<div>• ลามาแล้ว: ' + _safeEscapePrint(user.SickDays || 0) + ' วันทำการ</div>' +
    '<div>• ลาครั้งนี้: ' + _safeEscapePrint(totalDays) + ' วันทำการ</div>' +
    '<div style="text-align:center; margin-top:20px;">ลงชื่อ....................................................... ผู้ตรวจสอบ<br>(นางสาวทัชชกร ช่วยจังหรีด)<br>ตำแหน่ง หัวหน้างานกลุ่มบริหารบุคคล</div>' +
    '</td>' +
    '<td style="width:50%; vertical-align:top; padding:8px 10px; text-align:left; border:1px solid #000;">' +
    '<div style="text-align:center; font-weight:bold; text-decoration:underline; margin-bottom:6px;">คำสั่ง / การพิจารณา</div>' +
    '<div style="margin-top:6px; padding-left:15px;">' + boxCheck(isApproved) + ' อนุญาต &nbsp;&nbsp;&nbsp;' + boxCheck(isRejected) + ' ไม่อนุญาต</div>' +
    '<div style="text-align:center; margin-top:40px;">ลงชื่อ.......................................................<br>(' + _safeEscapePrint(directorName) + ')<br>ตำแหน่ง ' + _safeEscapePrint(directorPos) + '<br>วันที่ ........../........../..........</div>' +
    '</td></tr></table></div>';
}

function getPersonnelPortfolioPrintHtml(empId, db) {
  const teachers = db.teachers || [];
  const school = db.schoolInfo || {};
  const u = teachers.find(x => (x.id === empId || x.EmpID === empId));
  if (!u) {
    return '<div style="padding:20px; text-align:center; font-family:Sarabun,sans-serif;"><h3>ไม่พบข้อมูลบุคลากร</h3></div>';
  }

  const schoolName = school.schoolName || 'โรงเรียนชุมชนบ้านตะขบ';
  const affiliation = school.affiliation || 'สำนักงานเขตพื้นที่การศึกษาประถมศึกษานครราชสีมา เขต 3';
  const directorName = school.directorName || 'นายธีรศักดิ์ มโนธรรม';
  const todayParts = _formatThaiDateParts(new Date().toISOString().split('T')[0]);

  const eduRows = (u.EducationsHistory || []).map((e, i) => {
    return '<tr>' +
      '<td style="padding:4px; border:1px solid #000; text-align:center;">' + (i + 1) + '</td>' +
      '<td style="padding:4px; border:1px solid #000;">' + _safeEscapePrint(e.degree_level || e.DegreeLevel) + ' (' + _safeEscapePrint(e.degree_short || e.DegreeShort) + ')</td>' +
      '<td style="padding:4px; border:1px solid #000;">' + _safeEscapePrint(e.major || e.Major) + '</td>' +
      '<td style="padding:4px; border:1px solid #000;">' + _safeEscapePrint(e.institute || e.Institute) + '</td>' +
      '<td style="padding:4px; border:1px solid #000; text-align:center;">' + _safeEscapePrint(e.grad_year || e.GradYear) + '</td></tr>';
  }).join('') || '<tr><td colspan="5" style="padding:4px; border:1px solid #000; text-align:center;">- ไม่มีข้อมูลในระบบ -</td></tr>';

  const stdRows = (u.StandingsHistory || []).map((s, i) => {
    return '<tr>' +
      '<td style="padding:4px; border:1px solid #000; text-align:center;">' + (i + 1) + '</td>' +
      '<td style="padding:4px; border:1px solid #000;">' + _safeEscapePrint(s.standing_level || s.StandingLevel) + '</td>' +
      '<td style="padding:4px; border:1px solid #000; text-align:center;">' + _safeEscapePrint(s.effective_date || s.EffectiveDate) + '</td>' +
      '<td style="padding:4px; border:1px solid #000;">' + _safeEscapePrint(s.order_number || s.OrderNumber) + '</td></tr>';
  }).join('') || '<tr><td colspan="4" style="padding:4px; border:1px solid #000; text-align:center;">- ไม่มีข้อมูลในระบบ -</td></tr>';

  const licRows = (u.ActiveLicenses || []).map((l, i) => {
    return '<tr>' +
      '<td style="padding:4px; border:1px solid #000; text-align:center;">' + (i + 1) + '</td>' +
      '<td style="padding:4px; border:1px solid #000;">' + _safeEscapePrint(l.licenseType || l.type) + '</td>' +
      '<td style="padding:4px; border:1px solid #000; text-align:center;">' + _safeEscapePrint(l.licenseNo || l.number) + '</td>' +
      '<td style="padding:4px; border:1px solid #000; text-align:center;">' + _safeEscapePrint(l.issueDate) + '</td>' +
      '<td style="padding:4px; border:1px solid #000; text-align:center;">' + _safeEscapePrint(l.expireDate || l.expiryDate) + '</td></tr>';
  }).join('') || '<tr><td colspan="5" style="padding:4px; border:1px solid #000; text-align:center;">- ไม่มีข้อมูลในระบบ -</td></tr>';

  return '<div style="font-family:\'Sarabun\', sans-serif; width:190mm; margin:0 auto; padding:6mm 8mm; box-sizing:border-box; color:#000; background:#fff; font-size:12.5px; line-height:1.5;">' +
    '<div style="text-align:center; font-weight:bold; font-size:15.5px; border-bottom:2px solid #000; padding-bottom:6px; margin-bottom:10px;">แบบสรุปทะเบียนประวัติข้าราชการครูและบุคลากรทางการศึกษา (ก.พ. 7 ย่อ)<br>' + _safeEscapePrint(schoolName) + ' • ' + _safeEscapePrint(affiliation) + '</div>' +
    '<table style="width:100%; border-collapse:collapse; margin-bottom:10px; font-size:12.5px; color:#000;" border="1">' +
    '<tr><td style="padding:5px 8px; border:1px solid #000; width:50%; text-align:left;"><b>ชื่อ-นามสกุล:</b> ' + _safeEscapePrint(u.FullName || u.name) + '</td><td style="padding:5px 8px; border:1px solid #000; width:50%; text-align:left;"><b>รหัสบุคลากร:</b> ' + _safeEscapePrint(u.EmpID || u.id) + '</td></tr>' +
    '<tr><td style="padding:5px 8px; border:1px solid #000; text-align:left;"><b>ตำแหน่ง:</b> ' + _safeEscapePrint(u.Position || u.role) + '</td><td style="padding:5px 8px; border:1px solid #000; text-align:left;"><b>เลขที่ตำแหน่ง:</b> ' + _safeEscapePrint(u.PositionNo || u.positionNo || '-') + '</td></tr>' +
    '<tr><td style="padding:5px 8px; border:1px solid #000; text-align:left;"><b>สมาชิก กบข./กสจ. เลขที่:</b> ' + _safeEscapePrint(u.MemberID || u.memberId || '-') + '</td><td style="padding:5px 8px; border:1px solid #000; text-align:left;"><b>วันที่บรรจุเข้ารับราชการ:</b> ' + _safeEscapePrint(u.StartDate || u.startDate || '-') + '</td></tr>' +
    '<tr><td style="padding:5px 8px; border:1px solid #000; text-align:left;"><b>กลุ่มสาระการเรียนรู้:</b> ' + _safeEscapePrint(u.Department || u.department || '-') + '</td><td style="padding:5px 8px; border:1px solid #000; text-align:left;"><b>ฝ่ายงาน / ชั้นที่ปรึกษา:</b> ' + _safeEscapePrint(u.Division || u.division || '-') + ' (' + _safeEscapePrint(u.classLevel || u.Class_Level || '-') + ')</td></tr></table>' +
    '<div style="font-weight:bold; margin:8px 0 4px 0;">1. ประวัติการศึกษา</div>' +
    '<table style="width:100%; border-collapse:collapse; margin-bottom:8px; font-size:12px; color:#000;" border="1"><tr style="background:#f0f0f0;"><th style="padding:4px; border:1px solid #000; width:8%;">ลำดับ</th><th style="padding:4px; border:1px solid #000; width:24%;">ระดับวุฒิการศึกษา</th><th style="padding:4px; border:1px solid #000; width:26%;">สาขา / วิชาเอก</th><th style="padding:4px; border:1px solid #000; width:30%;">สถาบันการศึกษา</th><th style="padding:4px; border:1px solid #000; width:12%;">ปี พ.ศ. ที่จบ</th></tr>' + eduRows + '</table>' +
    '<div style="font-weight:bold; margin:8px 0 4px 0;">2. ประวัติการดำรงตำแหน่งและวิทยฐานะ</div>' +
    '<table style="width:100%; border-collapse:collapse; margin-bottom:8px; font-size:12px; color:#000;" border="1"><tr style="background:#f0f0f0;"><th style="padding:4px; border:1px solid #000; width:8%;">ลำดับ</th><th style="padding:4px; border:1px solid #000; width:36%;">ตำแหน่ง / วิทยฐานะ</th><th style="padding:4px; border:1px solid #000; width:22%;">วันที่มีผล</th><th style="padding:4px; border:1px solid #000; width:34%;">เลขที่คำสั่งอ้างอิง</th></tr>' + stdRows + '</table>' +
    '<div style="font-weight:bold; margin:8px 0 4px 0;">3. ข้อมูลใบอนุญาตประกอบวิชาชีพ</div>' +
    '<table style="width:100%; border-collapse:collapse; margin-bottom:10px; font-size:12px; color:#000;" border="1"><tr style="background:#f0f0f0;"><th style="padding:4px; border:1px solid #000; width:8%;">ลำดับ</th><th style="padding:4px; border:1px solid #000; width:34%;">ประเภทใบอนุญาต</th><th style="padding:4px; border:1px solid #000; width:20%;">เลขที่ใบอนุญาต</th><th style="padding:4px; border:1px solid #000; width:16%;">วันออกเอกสาร</th><th style="padding:4px; border:1px solid #000; width:22%;">วันหมดอายุ</th></tr>' + licRows + '</table>' +
    '<div style="display:flex; justify-content:space-between; margin-top:18px; text-align:center;"><div style="width:45%;">ขอรับรองว่าข้อมูลข้างต้นถูกต้องเป็นจริง<br><br>ลงชื่อ....................................................... เจ้าของประวัติ<br>( ' + _safeEscapePrint(u.FullName || u.name) + ' )<br>วันที่ ' + todayParts.full + '</div>' +
    '<div style="width:45%;">ตรวจสอบความถูกต้องเรียบร้อยแล้ว<br><br>ลงชื่อ....................................................... ผู้รับรอง<br>( ' + _safeEscapePrint(directorName) + ' )<br>ผู้อำนวยการ' + _safeEscapePrint(schoolName) + '</div></div></div>';
}

module.exports = {
  getOfficialLeaveFormHtml,
  getPersonnelPortfolioPrintHtml
};
