/**
 * =========================================================================
 * MANSTAT MODERN - CLOUD POSTGRESQL ENGINE (postgres.js)
 * =========================================================================
 * Production-grade PostgreSQL client powered by node-postgres (pg).
 * Seamlessly connects to Supabase / Vercel Postgres / Neon.
 * Automatically provisions 15 ground-truth tables on startup.
 * =========================================================================
 */
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

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
 * Automatically create all 15 tables and populate initial records if missing.
 */
async function initTables() {
  if (!initPool()) return;

  // Try reading supabase-seed.sql if present on disk
  const seedPath = path.join(__dirname, '../../supabase-seed.sql');
  if (fs.existsSync(seedPath)) {
    try {
      const seedSql = fs.readFileSync(seedPath, 'utf8');
      await query(seedSql);
      console.log('[Postgres] Executed supabase-seed.sql successfully.');
      return;
    } catch (e) {
      console.warn('[Postgres Seed Warning]', e.message);
    }
  }

  // Fallback embedded 15-table DDL schema
  const schema = `
    CREATE TABLE IF NOT EXISTS school_info (
      key VARCHAR(100) PRIMARY KEY,
      val TEXT,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS fiscal_data (
      fiscal_year INT PRIMARY KEY,
      period1_start TEXT,
      period1_end TEXT,
      period2_start TEXT,
      period2_end TEXT,
      active_period_mode VARCHAR(50),
      status VARCHAR(50),
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS active_classes (
      id SERIAL PRIMARY KEY,
      class_name VARCHAR(100) UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS teachers (
      id VARCHAR(50) PRIMARY KEY,
      name TEXT NOT NULL,
      email VARCHAR(150),
      phone VARCHAR(50),
      class_level VARCHAR(100),
      role TEXT,
      duty_day VARCHAR(50),
      password TEXT,
      is_password_hashed BOOLEAN DEFAULT true,
      access_level VARCHAR(50) DEFAULT 'User',
      status VARCHAR(50) DEFAULT 'ปกติ',
      start_date TEXT,
      department TEXT,
      emp_type TEXT,
      id_card VARCHAR(50),
      division TEXT,
      position_no VARCHAR(50),
      member_id VARCHAR(50),
      birth_date TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS leave_quota (
      emp_id VARCHAR(50) NOT NULL,
      fiscal_year INT NOT NULL,
      sick_max NUMERIC(5,2) DEFAULT 60,
      sick_used NUMERIC(5,2) DEFAULT 0,
      personal_max NUMERIC(5,2) DEFAULT 45,
      personal_used NUMERIC(5,2) DEFAULT 0,
      vacation_max NUMERIC(5,2) DEFAULT 10,
      vacation_used NUMERIC(5,2) DEFAULT 0,
      PRIMARY KEY (emp_id, fiscal_year)
    );

    CREATE TABLE IF NOT EXISTS leave_logs (
      leave_id VARCHAR(100) PRIMARY KEY,
      emp_id VARCHAR(50),
      full_name TEXT,
      leave_type VARCHAR(100),
      start_date TEXT,
      end_date TEXT,
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
      remark TEXT DEFAULT '',
      form_meta_json TEXT DEFAULT '',
      timestamp TEXT DEFAULT '',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS holidays (
      holiday_date TEXT PRIMARY KEY,
      reason_type TEXT,
      note TEXT,
      director_name TEXT,
      timestamp TEXT
    );

    CREATE TABLE IF NOT EXISTS board_members (
      member_id VARCHAR(100) PRIMARY KEY,
      prefix VARCHAR(50),
      first_name TEXT,
      last_name TEXT,
      full_name TEXT NOT NULL,
      board_position VARCHAR(100),
      occupation TEXT,
      organization TEXT,
      phone VARCHAR(50),
      email VARCHAR(150),
      appointment_order_no TEXT,
      order_date TEXT,
      start_date TEXT,
      end_date TEXT,
      term_number INT DEFAULT 1,
      status VARCHAR(50) DEFAULT 'ดำรงตำแหน่ง',
      doc_url TEXT,
      remark TEXT,
      updated_by TEXT,
      timestamp TEXT
    );

    CREATE TABLE IF NOT EXISTS school_board_staff_terms (
      term_id VARCHAR(100) PRIMARY KEY,
      emp_id VARCHAR(50),
      full_name TEXT,
      board_position VARCHAR(100),
      start_date TEXT,
      end_date TEXT,
      term_number INT DEFAULT 1,
      appointment_order_no TEXT,
      status VARCHAR(50),
      updated_by TEXT,
      timestamp TEXT
    );

    CREATE TABLE IF NOT EXISTS board_meetings (
      meeting_id VARCHAR(100) PRIMARY KEY,
      meeting_no VARCHAR(50),
      fiscal_year VARCHAR(20),
      meeting_date TEXT,
      meeting_time VARCHAR(50),
      location TEXT,
      agenda_summary TEXT,
      present_member_ids TEXT,
      absent_member_ids TEXT,
      resolutions TEXT,
      report_doc_url TEXT,
      recorded_by TEXT,
      timestamp TEXT
    );

    CREATE TABLE IF NOT EXISTS staff_workloads (
      workload_id VARCHAR(100) PRIMARY KEY,
      emp_id VARCHAR(50),
      co_emp_ids TEXT,
      category VARCHAR(100),
      title TEXT,
      sub_group_or_level TEXT,
      hours_per_week NUMERIC(5,2),
      role_in_task TEXT,
      academic_term VARCHAR(50),
      order_or_ref TEXT,
      effective_period TEXT,
      status VARCHAR(50) DEFAULT 'ปกติ',
      assigned_by TEXT,
      updated_by TEXT,
      timestamp TEXT
    );

    CREATE TABLE IF NOT EXISTS system_feedback (
      feedback_id VARCHAR(100) PRIMARY KEY,
      emp_id VARCHAR(50),
      full_name TEXT,
      category VARCHAR(100),
      topic TEXT,
      detail TEXT,
      status VARCHAR(50) DEFAULT 'รอการตอบรับ',
      admin_reply TEXT,
      updated_by TEXT,
      timestamp TEXT
    );

    CREATE TABLE IF NOT EXISTS history_standing (
      record_id VARCHAR(100) PRIMARY KEY,
      emp_id VARCHAR(50),
      standing_level TEXT,
      effective_date TEXT,
      order_number TEXT,
      doc_link TEXT,
      timestamp TEXT
    );

    CREATE TABLE IF NOT EXISTS history_education (
      record_id VARCHAR(100) PRIMARY KEY,
      emp_id VARCHAR(50),
      degree_level TEXT,
      degree_short TEXT,
      major TEXT,
      institute TEXT,
      grad_year VARCHAR(50),
      timestamp TEXT
    );

    CREATE TABLE IF NOT EXISTS history_licenses (
      record_id VARCHAR(100) PRIMARY KEY,
      emp_id VARCHAR(50),
      license_category TEXT,
      license_type TEXT,
      license_number VARCHAR(100),
      issue_date TEXT,
      expiry_date TEXT,
      timestamp TEXT
    );

    CREATE TABLE IF NOT EXISTS history_scout (
      record_id VARCHAR(100) PRIMARY KEY,
      emp_id VARCHAR(50),
      scout_qualification TEXT,
      scout_type TEXT,
      scout_position TEXT,
      cert_number VARCHAR(100),
      approved_year VARCHAR(50),
      timestamp TEXT
    );
  `;

  try {
    await query(schema);
    console.log('[Postgres] 15 tables verified / created successfully.');
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
