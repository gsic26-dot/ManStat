/**
 * =========================================================================
 * MANSTAT MODERN - PURE JAVASCRIPT PERSISTENCE STORE (store.js)
 * =========================================================================
 * Robust, zero-dependency, JSON-file-backed ground-truth store.
 * Fully compatible with Vercel Serverless (read-only filesystem safe).
 * Always seeds from ground-truth data/manstat_db.json (15 sheets).
 * =========================================================================
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

// Serverless detection
const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT);
const bundledDbPath = path.join(__dirname, '../../data/manstat_db.json');
const writableDataDir = isServerless ? os.tmpdir() : path.join(__dirname, '../../data');
const writableDbPath = path.join(writableDataDir, 'manstat_db.json');

// Read bundled baseline ground-truth
function getBundledBaseline() {
  try {
    if (fs.existsSync(bundledDbPath)) {
      const raw = fs.readFileSync(bundledDbPath, 'utf8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('[Store] Could not read bundled db:', err.message);
  }
  return {
    schoolInfo: {
      schoolName: 'โรงเรียนชุมชนบ้านตะขบ',
      schoolCode10: '1030200688',
      schoolCode8: '30030099',
      directorName: 'นายธีรศักดิ์ มโนธรรม',
      contactPhone: '099-173-2233',
      address: 'ม.1 โรงเรียนชุมชนบ้านตะขบ ต.ตะขบ อ.ปักธงชัย จ.นครราชสีมา 30150',
      fiscalYear: '2570',
      academicYear: '2569',
      currentTerm: '2',
      studentCount: 94,
      logoBase64: ''
    },
    activeClasses: [
      'อนุบาล 1', 'อนุบาล 2', 'อนุบาล 3',
      'ประถมศึกษาปีที่ 1', 'ประถมศึกษาปีที่ 2', 'ประถมศึกษาปีที่ 3',
      'ประถมศึกษาปีที่ 4', 'ประถมศึกษาปีที่ 5', 'ประถมศึกษาปีที่ 6',
      'มัธยมศึกษาปีที่ 1', 'มัธยมศึกษาปีที่ 2', 'มัธยมศึกษาปีที่ 3'
    ],
    fiscalData: {
      active: { fiscal_year: 2570, status: 'Active', active_period_mode: 'PERIOD_1' },
      all: [{ fiscal_year: 2570, status: 'Active', active_period_mode: 'PERIOD_1' }]
    },
    teachers: [],
    logs: [],
    feedbacks: [],
    workloads: [],
    boardMembers: [],
    schoolBoardStaffTerms: [],
    boardMeetings: [],
    holidays: []
  };
}

let inMemoryDb = null;

function ensureWritableDirectory() {
  try {
    if (!fs.existsSync(writableDataDir)) {
      fs.mkdirSync(writableDataDir, { recursive: true });
    }
  } catch (err) {
    console.warn('[Store Notice] Directory create skipped:', err.message);
  }
}

function loadDatabase() {
  if (inMemoryDb) return inMemoryDb;

  // 1. Check writable copy in /tmp or data directory
  try {
    ensureWritableDirectory();
    if (fs.existsSync(writableDbPath)) {
      const raw = fs.readFileSync(writableDbPath, 'utf8');
      inMemoryDb = JSON.parse(raw);
      if (inMemoryDb && inMemoryDb.schoolInfo && inMemoryDb.teachers && inMemoryDb.teachers.length > 0) {
        return inMemoryDb;
      }
    }
  } catch (e) {
    console.warn('[Store Notice] Read writable file notice:', e.message);
  }

  // 2. Load from ground-truth bundled file
  inMemoryDb = getBundledBaseline();

  // Try to write to writableDbPath for future writes in this lambda instance
  try {
    ensureWritableDirectory();
    fs.writeFileSync(writableDbPath, JSON.stringify(inMemoryDb, null, 2), 'utf8');
  } catch (err) {
    // Read-only filesystem warning, silent in serverless
  }

  return inMemoryDb;
}

function saveDatabase() {
  if (!inMemoryDb) inMemoryDb = getBundledBaseline();
  try {
    ensureWritableDirectory();
    fs.writeFileSync(writableDbPath, JSON.stringify(inMemoryDb, null, 2), 'utf8');
  } catch (err) {
    console.warn('[Store Notice] Disk write skipped in serverless environment:', err.message);
  }
}

function getDatabase() {
  return loadDatabase();
}

module.exports = {
  getDatabase,
  saveDatabase,
  bundledDbPath,
  writableDbPath
};
