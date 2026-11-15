/**
 * =========================================================================
 * MANSTAT MODERN - CLOUD POSTGRESQL ENGINE (postgres.js)
 * =========================================================================
 * Production-grade PostgreSQL client powered by node-postgres (pg).
 * Seamlessly connects to Supabase / Vercel Postgres / Neon.
 * Automatically provisions tables and initial seed data on startup.
 * =========================================================================
 */
const { Pool } = require('pg');

function getConnectionString() {
  return process.env.SUPABASE_DB_URL || 
         process.env.POSTGRES_URL || 
         process.env.DATABASE_URL || 
         process.env.POSTGRES_PRISMA_URL ||
         '';
}

let pool = null;

function initPool() {
  if (pool) return pool;
  const connectionString = getConnectionString();
  if (connectionString) {
    try {
      pool = new Pool({
        connectionString,
        ssl: {
          rejectUnauthorized: false
        },
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000
      });
      console.log('[Postgres] Connected to Cloud PostgreSQL / Supabase.');
    } catch (err) {
      console.error('[Postgres Init Error]', err.message);
    }
  } else {
    console.log('[Postgres] No connection string configured. Running in in-memory fallback mode.');
  }
  return pool;
}

// Initial attempt
initPool();

async function query(text, params) {
  const p = initPool();
  if (!p) return null;
  const start = Date.now();
  try {
    const res = await p.query(text, params);
    const duration = Date.now() - start;
    return res;
  } catch (err) {
    console.error('[Postgres Query Error]', err.message, text ? text.substring(0, 100) : '');
    throw err;
  }
}

/**
 * Automatically create all tables and populate initial records if missing.
 */
async function initTables() {
  if (!initPool()) return;
  const schema = `
    CREATE TABLE IF NOT EXISTS school_info (
      id VARCHAR(50) PRIMARY KEY DEFAULT 'current',
      school_name TEXT DEFAULT 'โรงเรียนมโนธรรมวิทยาคาร',
      school_code10 VARCHAR(50) DEFAULT '',
      school_code8 VARCHAR(50) DEFAULT '',
      director_name TEXT DEFAULT '',
      contact_phone VARCHAR(50) DEFAULT '',
      address TEXT DEFAULT '',
      fiscal_year VARCHAR(20) DEFAULT '2570',
      logo_base64 TEXT DEFAULT '',
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS fiscal_data (
      id SERIAL PRIMARY KEY,
      year_be INT,
      year_ce INT,
      period_mode VARCHAR(20) DEFAULT 'PERIOD_1',
      status VARCHAR(20) DEFAULT 'Active',
      updated_at VARCHAR(50) DEFAULT CURRENT_TIMESTAMP::text
    );

    CREATE TABLE IF NOT EXISTS active_classes (
      id SERIAL PRIMARY KEY,
      class_name VARCHAR(100) UNIQUE
    );

    CREATE TABLE IF NOT EXISTS teachers (
      id VARCHAR(50) PRIMARY KEY,
      emp_id VARCHAR(50),
      position_no VARCHAR(50),
      member_id VARCHAR(50),
      name TEXT NOT NULL,
      full_name TEXT NOT NULL,
      email VARCHAR(150),
      phone VARCHAR(50),
      class_level VARCHAR(100),
      role TEXT,
      position TEXT,
      duty_day VARCHAR(50),
      password TEXT,
      is_password_hashed BOOLEAN DEFAULT false,
      access_level VARCHAR(50) DEFAULT 'User',
      status VARCHAR(50) DEFAULT 'ปกติ',
      start_date VARCHAR(50),
      department TEXT,
      division TEXT,
      emp_type TEXT,
      id_card VARCHAR(50),
      id_card_masked VARCHAR(50),
      sick_count INT DEFAULT 0,
      sick_days NUMERIC(5,2) DEFAULT 0,
      sick_max NUMERIC(5,2) DEFAULT 60,
      personal_count INT DEFAULT 0,
      personal_days NUMERIC(5,2) DEFAULT 0,
      personal_max NUMERIC(5,2) DEFAULT 45,
      permit_count INT DEFAULT 0,
      permit_hours NUMERIC(5,2) DEFAULT 0,
      meta_json JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS leave_logs (
      leave_id VARCHAR(100) PRIMARY KEY,
      emp_id VARCHAR(50),
      full_name TEXT NOT NULL,
      leave_type VARCHAR(100) NOT NULL,
      start_date VARCHAR(50),
      end_date VARCHAR(50),
      start_time VARCHAR(20) DEFAULT '-',
      end_time VARCHAR(20) DEFAULT '-',
      total_days NUMERIC(5,2) DEFAULT 1,
      total_hours NUMERIC(5,2) DEFAULT 0,
      reason TEXT,
      substitute_info TEXT DEFAULT 'ไม่มีคาบสอน',
      attach_url TEXT DEFAULT '-',
      status VARCHAR(50) DEFAULT 'รออนุมัติ',
      step_hr VARCHAR(50) DEFAULT 'รอตรวจสอบ',
      step_academic VARCHAR(50) DEFAULT 'รอตรวจสอบ',
      step_director VARCHAR(50) DEFAULT 'รอลงนาม',
      signer_name TEXT DEFAULT '',
      form_meta_json TEXT DEFAULT '',
      remark TEXT DEFAULT '',
      timestamp VARCHAR(50),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS workloads (
      workload_id VARCHAR(100) PRIMARY KEY,
      emp_id VARCHAR(50),
      full_name TEXT,
      term VARCHAR(20),
      year VARCHAR(20),
      subject_code VARCHAR(50),
      subject_name TEXT,
      class_level VARCHAR(50),
      hours_per_week NUMERIC(5,2),
      remark TEXT,
      meta_json JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS feedbacks (
      id VARCHAR(100) PRIMARY KEY,
      emp_id VARCHAR(50),
      full_name TEXT,
      category VARCHAR(100),
      topic TEXT,
      detail TEXT,
      status VARCHAR(50) DEFAULT 'รอการตอบรับ',
      admin_reply TEXT,
      updated_by TEXT,
      timestamp VARCHAR(50)
    );

    CREATE TABLE IF NOT EXISTS board_members (
      id VARCHAR(100) PRIMARY KEY,
      name TEXT NOT NULL,
      position TEXT,
      role TEXT,
      phone VARCHAR(50),
      status VARCHAR(50) DEFAULT 'Active'
    );

    CREATE TABLE IF NOT EXISTS board_meetings (
      id VARCHAR(100) PRIMARY KEY,
      meeting_no VARCHAR(50),
      fiscal_year VARCHAR(20),
      date VARCHAR(50),
      attendees_count INT DEFAULT 0,
      status VARCHAR(50) DEFAULT 'Completed'
    );

    -- Auto-seed initial records
    INSERT INTO school_info (id, school_name, director_name, fiscal_year)
    VALUES ('current', 'โรงเรียนมโนธรรมวิทยาคาร', 'นายธีรศักดิ์ มโนธรรม', '2570')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO fiscal_data (year_be, year_ce, period_mode, status)
    VALUES (2570, 2027, 'PERIOD_1', 'Active')
    ON CONFLICT DO NOTHING;

    INSERT INTO active_classes (class_name) VALUES
    ('มัธยมศึกษาปีที่ 1'),
    ('มัธยมศึกษาปีที่ 2'),
    ('มัธยมศึกษาปีที่ 3'),
    ('มัธยมศึกษาปีที่ 4'),
    ('มัธยมศึกษาปีที่ 5'),
    ('มัธยมศึกษาปีที่ 6')
    ON CONFLICT DO NOTHING;

    INSERT INTO teachers (
      id, emp_id, position_no, name, full_name, email, role, position,
      access_level, status, password, department, division
    )
    VALUES (
      'EXE-001', 'EXE-001', '10001', 'Superuser (ผู้ดูแลระบบสูงสุด)', 'Superuser (ผู้ดูแลระบบสูงสุด)',
      'superuser', 'ผู้อำนวยการสถานศึกษา', 'ผู้อำนวยการสถานศึกษา', 'Superuser', 'ปกติ',
      '44123130114', 'บริหารสถานศึกษา', 'ผู้บริหารสถานศึกษา'
    )
    ON CONFLICT (id) DO NOTHING;
  `;

  try {
    await query(schema);
    console.log('[Postgres] Auto-installed schema tables and seed data successfully.');
  } catch (e) {
    console.error('[Postgres Schema Init Error]', e.message);
  }
}

function isPostgresActive() {
  return initPool() !== null;
}

module.exports = {
  pool,
  query,
  initTables,
  isPostgresActive
};
