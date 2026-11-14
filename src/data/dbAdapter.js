/**
 * =========================================================================
 * MANSTAT MODERN - UNIFIED DATABASE ADAPTER (dbAdapter.js)
 * =========================================================================
 * Bridges between Cloud PostgreSQL and the fallback In-Memory JSON store.
 * Automatically provisions tables on first startup.
 * Provides lightning-fast RPC data access for all ManStat features.
 * =========================================================================
 */
const { isPostgresActive, query, initTables } = require('./postgres');
const fallbackStore = require('./store');

let tablesInitialized = false;

async function ensurePostgresReady() {
  if (isPostgresActive() && !tablesInitialized) {
    await initTables();
    tablesInitialized = true;
  }
}

/**
 * Fetch the complete application bundle (equivalent to getMainBundleData)
 */
async function getMainBundle() {
  if (!isPostgresActive()) {
    const db = fallbackStore.getDatabase();
    return {
      status: 'success',
      scriptUrl: '#',
      logs: db.logs || [],
      feedbacks: db.feedbacks || [],
      workloads: db.workloads || [],
      usersSummary: db.teachers || [],
      schoolInfo: db.schoolInfo || {},
      fiscalData: db.fiscalData || {},
      activeClasses: db.activeClasses || [],
      boardBundle: {
        members: db.boardMembers || [],
        meetings: db.boardMeetings || [],
        compliance: { isCompliant: true, validCount: 15 }
      }
    };
  }

  try {
    await ensurePostgresReady();

    // 1. Fetch School Info
    const schoolRes = await query(`SELECT * FROM school_info WHERE id = 'current' LIMIT 1`);
    let schoolInfo = {
      schoolName: 'โรงเรียนมโนธรรมวิทยาคาร',
      schoolCode10: '1030010001',
      schoolCode8: '30010001',
      directorName: 'นายธีรศักดิ์ มโนธรรม',
      contactPhone: '044-123456',
      address: 'ต.ในเมือง อ.เมือง จ.นครราชสีมา 30000',
      fiscalYear: '2570',
      logoBase64: ''
    };
    if (schoolRes && schoolRes.rows.length > 0) {
      const row = schoolRes.rows[0];
      schoolInfo = {
        schoolName: row.school_name,
        schoolCode10: row.school_code10,
        schoolCode8: row.school_code8,
        directorName: row.director_name,
        contactPhone: row.contact_phone,
        address: row.address,
        fiscalYear: row.fiscal_year,
        logoBase64: row.logo_base64 || ''
      };
    }

    // 2. Fetch Fiscal Data
    const fiscalRes = await query(`SELECT * FROM fiscal_data ORDER BY year_be DESC`);
    const allFiscal = (fiscalRes && fiscalRes.rows.length > 0) ? fiscalRes.rows.map(r => ({
      yearBE: r.year_be,
      yearCE: r.year_ce,
      periodMode: r.period_mode,
      status: r.status,
      updatedAt: r.updated_at
    })) : [
      { yearBE: 2570, yearCE: 2027, periodMode: 'PERIOD_1', status: 'Active', updatedAt: '2026-11-14 19:00:00' }
    ];
    const activeFiscal = allFiscal.find(f => f.status === 'Active') || allFiscal[0];

    // 3. Fetch Active Classes
    const classesRes = await query(`SELECT class_name FROM active_classes ORDER BY id ASC`);
    const activeClasses = (classesRes && classesRes.rows.length > 0) 
      ? classesRes.rows.map(r => r.class_name) 
      : ['มัธยมศึกษาปีที่ 1', 'มัธยมศึกษาปีที่ 2', 'มัธยมศึกษาปีที่ 3', 'มัธยมศึกษาปีที่ 4', 'มัธยมศึกษาปีที่ 5', 'มัธยมศึกษาปีที่ 6'];

    // 4. Fetch Teachers
    const teachersRes = await query(`SELECT * FROM teachers ORDER BY id ASC`);
    const usersSummary = (teachersRes && teachersRes.rows.length > 0) ? teachersRes.rows.map(t => {
      const meta = t.meta_json || {};
      return {
        id: t.id,
        EmpID: t.emp_id || t.id,
        positionNo: t.position_no || '',
        PositionNo: t.position_no || '',
        memberId: t.member_id || '',
        MemberID: t.member_id || '',
        name: t.name,
        FullName: t.full_name || t.name,
        email: t.email,
        phone: t.phone,
        classLevel: t.class_level,
        role: t.role,
        Position: t.position || t.role,
        dutyDay: t.duty_day,
        accessLevel: t.access_level,
        status: t.status,
        startDate: t.start_date,
        department: t.department,
        division: t.division,
        empType: t.emp_type,
        idCard: t.id_card,
        IDCardMasked: t.id_card_masked,
        SickCount: Number(t.sick_count || 0),
        SickDays: Number(t.sick_days || 0),
        SickMax: Number(t.sick_max || 60),
        PersonalCount: Number(t.personal_count || 0),
        PersonalDays: Number(t.personal_days || 0),
        PersonalMax: Number(t.personal_max || 45),
        PermitCount: Number(t.permit_count || 0),
        PermitHours: Number(t.permit_hours || 0),
        ActiveLicenses: meta.ActiveLicenses || [],
        StandingsHistory: meta.StandingsHistory || [],
        EducationsHistory: meta.EducationsHistory || [],
        ScoutsHistory: meta.ScoutsHistory || [],
        TimelineEvents: meta.TimelineEvents || []
      };
    }) : fallbackStore.getDatabase().teachers;

    // 5. Fetch Leave Logs
    const logsRes = await query(`SELECT * FROM leave_logs ORDER BY created_at DESC LIMIT 500`);
    const logs = (logsRes && logsRes.rows.length > 0) ? logsRes.rows.map(l => ({
      leaveId: l.leave_id,
      empId: l.emp_id,
      fullName: l.full_name,
      leaveType: l.leave_type,
      startDate: l.start_date,
      endDate: l.end_date,
      startTime: l.start_time,
      endTime: l.end_time,
      totalDays: Number(l.total_days || 0),
      totalHours: Number(l.total_hours || 0),
      reason: l.reason,
      substituteInfo: l.substitute_info,
      attachUrl: l.attach_url,
      status: l.status,
      stepHr: l.step_hr,
      stepAcademic: l.step_academic,
      stepDirector: l.step_director,
      signerName: l.signer_name,
      formMetaJson: l.form_meta_json,
      remark: l.remark,
      timestamp: l.timestamp
    })) : fallbackStore.getDatabase().logs;

    // 6. Fetch Workloads & Feedbacks
    const wlRes = await query(`SELECT * FROM workloads ORDER BY created_at DESC`);
    const workloads = (wlRes && wlRes.rows.length > 0) ? wlRes.rows.map(w => ({
      workloadId: w.workload_id,
      empId: w.emp_id,
      fullName: w.full_name,
      term: w.term,
      year: w.year,
      subjectCode: w.subject_code,
      subjectName: w.subject_name,
      classLevel: w.class_level,
      hoursPerWeek: Number(w.hours_per_week || 0),
      remark: w.remark
    })) : [];

    const fbRes = await query(`SELECT * FROM feedbacks ORDER BY timestamp DESC`);
    const feedbacks = (fbRes && fbRes.rows.length > 0) ? fbRes.rows.map(f => ({
      id: f.id,
      empId: f.emp_id,
      fullName: f.full_name,
      category: f.category,
      topic: f.topic,
      detail: f.detail,
      status: f.status,
      adminReply: f.admin_reply,
      updatedBy: f.updated_by,
      timestamp: f.timestamp
    })) : [];

    return {
      status: 'success',
      scriptUrl: '#',
      logs,
      feedbacks,
      workloads,
      usersSummary,
      schoolInfo,
      fiscalData: { active: activeFiscal, all: allFiscal },
      activeClasses,
      boardBundle: {
        members: [],
        meetings: [],
        compliance: { isCompliant: true, validCount: 15 }
      }
    };
  } catch (err) {
    console.error('[dbAdapter getMainBundle Error]', err.message);
    const db = fallbackStore.getDatabase();
    return {
      status: 'success',
      scriptUrl: '#',
      logs: db.logs || [],
      feedbacks: db.feedbacks || [],
      workloads: db.workloads || [],
      usersSummary: db.teachers || [],
      schoolInfo: db.schoolInfo || {},
      fiscalData: db.fiscalData || {},
      activeClasses: db.activeClasses || [],
      boardBundle: {
        members: db.boardMembers || [],
        meetings: db.boardMeetings || [],
        compliance: { isCompliant: true, validCount: 15 }
      }
    };
  }
}

/**
 * Import a full Google Sheets JSON dump into PostgreSQL
 */
async function importFullDatabase(dump) {
  if (!dump) throw new Error('No import data provided');

  // If Postgres is not active, write to fallback store
  if (!isPostgresActive()) {
    const db = fallbackStore.getDatabase();
    if (dump.usersSummary && Array.isArray(dump.usersSummary)) db.teachers = dump.usersSummary;
    if (dump.logs && Array.isArray(dump.logs)) db.logs = dump.logs;
    if (dump.schoolInfo) db.schoolInfo = dump.schoolInfo;
    if (dump.fiscalData) db.fiscalData = dump.fiscalData;
    if (dump.workloads && Array.isArray(dump.workloads)) db.workloads = dump.workloads;
    fallbackStore.saveDatabase();
    return { success: true, count: (dump.usersSummary || []).length, mode: 'store' };
  }

  await ensurePostgresReady();

  let teacherCount = 0;
  let logCount = 0;

  // 1. Import School Info
  if (dump.schoolInfo) {
    const s = dump.schoolInfo;
    await query(`
      INSERT INTO school_info (id, school_name, school_code10, school_code8, director_name, contact_phone, address, fiscal_year, logo_base64)
      VALUES ('current', $1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO UPDATE SET
        school_name = EXCLUDED.school_name,
        school_code10 = EXCLUDED.school_code10,
        school_code8 = EXCLUDED.school_code8,
        director_name = EXCLUDED.director_name,
        contact_phone = EXCLUDED.contact_phone,
        address = EXCLUDED.address,
        fiscal_year = EXCLUDED.fiscal_year,
        logo_base64 = EXCLUDED.logo_base64,
        updated_at = CURRENT_TIMESTAMP
    `, [
      s.schoolName || 'โรงเรียนมโนธรรมวิทยาคาร',
      s.schoolCode10 || '',
      s.schoolCode8 || '',
      s.directorName || '',
      s.contactPhone || '',
      s.address || '',
      s.fiscalYear || '2570',
      s.logoBase64 || ''
    ]);
  }

  // 2. Import Teachers
  const teachers = dump.usersSummary || dump.teachers || [];
  for (const t of teachers) {
    const teacherId = t.id || t.EmpID || t.Teacher_ID || ('TCH-' + Math.random().toString(36).substring(2, 7));
    const meta = {
      ActiveLicenses: t.ActiveLicenses || [],
      StandingsHistory: t.StandingsHistory || [],
      EducationsHistory: t.EducationsHistory || [],
      ScoutsHistory: t.ScoutsHistory || [],
      TimelineEvents: t.TimelineEvents || []
    };

    await query(`
      INSERT INTO teachers (
        id, emp_id, position_no, member_id, name, full_name, email, phone, class_level,
        role, position, duty_day, password, is_password_hashed, access_level, status,
        start_date, department, division, emp_type, id_card, id_card_masked,
        sick_count, sick_days, sick_max, personal_count, personal_days, personal_max,
        permit_count, permit_hours, meta_json
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
        $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31
      )
      ON CONFLICT (id) DO UPDATE SET
        emp_id = EXCLUDED.emp_id,
        position_no = EXCLUDED.position_no,
        member_id = EXCLUDED.member_id,
        name = EXCLUDED.name,
        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        phone = EXCLUDED.phone,
        class_level = EXCLUDED.class_level,
        role = EXCLUDED.role,
        position = EXCLUDED.position,
        duty_day = EXCLUDED.duty_day,
        password = CASE WHEN EXCLUDED.password IS NOT NULL AND EXCLUDED.password != '' THEN EXCLUDED.password ELSE teachers.password END,
        access_level = EXCLUDED.access_level,
        status = EXCLUDED.status,
        start_date = EXCLUDED.start_date,
        department = EXCLUDED.department,
        division = EXCLUDED.division,
        emp_type = EXCLUDED.emp_type,
        id_card = EXCLUDED.id_card,
        id_card_masked = EXCLUDED.id_card_masked,
        sick_count = EXCLUDED.sick_count,
        sick_days = EXCLUDED.sick_days,
        sick_max = EXCLUDED.sick_max,
        personal_count = EXCLUDED.personal_count,
        personal_days = EXCLUDED.personal_days,
        personal_max = EXCLUDED.personal_max,
        permit_count = EXCLUDED.permit_count,
        permit_hours = EXCLUDED.permit_hours,
        meta_json = EXCLUDED.meta_json,
        updated_at = CURRENT_TIMESTAMP
    `, [
      teacherId,
      t.EmpID || t.id || teacherId,
      t.positionNo || t.PositionNo || '',
      t.memberId || t.MemberID || '',
      t.name || t.FullName || '',
      t.FullName || t.name || '',
      t.email || '',
      t.phone || '',
      t.classLevel || '',
      t.role || t.Position || '',
      t.Position || t.role || '',
      t.dutyDay || '',
      t.password || '',
      Boolean(t.isPasswordHashed),
      t.accessLevel || 'User',
      t.status || 'ปกติ',
      t.startDate || '',
      t.department || '',
      t.division || '',
      t.empType || '',
      t.idCard || '',
      t.IDCardMasked || '',
      Number(t.SickCount || 0),
      Number(t.SickDays || 0),
      Number(t.SickMax || 60),
      Number(t.PersonalCount || 0),
      Number(t.PersonalDays || 0),
      Number(t.PersonalMax || 45),
      Number(t.PermitCount || 0),
      Number(t.PermitHours || 0),
      JSON.stringify(meta)
    ]);
    teacherCount++;
  }

  // 3. Import Leave Logs
  const logs = dump.logs || [];
  for (const l of logs) {
    const leaveId = l.leaveId || l.LeaveID || ('LV-' + Date.now() + Math.random().toString(36).substring(2, 5));
    await query(`
      INSERT INTO leave_logs (
        leave_id, emp_id, full_name, leave_type, start_date, end_date, start_time, end_time,
        total_days, total_hours, reason, substitute_info, attach_url, status, step_hr,
        step_academic, step_director, signer_name, form_meta_json, remark, timestamp
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
      )
      ON CONFLICT (leave_id) DO UPDATE SET
        status = EXCLUDED.status,
        step_hr = EXCLUDED.step_hr,
        step_academic = EXCLUDED.step_academic,
        step_director = EXCLUDED.step_director,
        signer_name = EXCLUDED.signer_name
    `, [
      leaveId,
      l.empId || l.EmpID || '',
      l.fullName || l.FullName || '',
      l.leaveType || l.LeaveType || '',
      l.startDate || l.StartDate || '',
      l.endDate || l.EndDate || '',
      l.startTime || l.StartTime || '-',
      l.endTime || l.EndTime || '-',
      Number(l.totalDays || l.TotalDays || 0),
      Number(l.totalHours || l.TotalHours || 0),
      l.reason || l.Reason || '',
      l.substituteInfo || l.SubstituteInfo || '',
      l.attachUrl || l.AttachUrl || '',
      l.status || l.Status || 'อนุมัติ',
      l.stepHr || l.Step1_HR || 'อนุมัติแล้ว',
      l.stepAcademic || l.Step2_Academic || 'อนุมัติแล้ว',
      l.stepDirector || l.Step3_Director || 'อนุมัติแล้ว',
      l.signerName || l.SignerName || '',
      l.formMetaJson || '',
      l.remark || '',
      l.timestamp || l.Timestamp || ''
    ]);
    logCount++;
  }

  return { success: true, teacherCount, logCount, mode: 'postgres' };
}

module.exports = {
  getMainBundle,
  importFullDatabase,
  ensurePostgresReady
};
