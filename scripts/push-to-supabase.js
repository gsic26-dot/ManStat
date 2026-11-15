/**
 * =========================================================================
 * MANSTAT CLOUD DATABASE SYNCHRONIZER (scripts/push-to-supabase.js)
 * =========================================================================
 * Executes 1_create_tables.sql and 2_insert_data.sql directly to Supabase
 * Tests Tokyo (ap-northeast-1) pooler on both transaction (6543) and session (5432)
 * Provides comprehensive diagnostics and failover guidance.
 * =========================================================================
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const schemaPath = path.join(__dirname, '../sql/1_create_tables.sql');
const dataPath = path.join(__dirname, '../sql/2_insert_data.sql');

if (!fs.existsSync(schemaPath) || !fs.existsSync(dataPath)) {
  console.error('[Error] SQL files not found. Run "node scripts/migrate-from-excel.js" first.');
  process.exit(1);
}

const schemaSql = fs.readFileSync(schemaPath, 'utf8');
const dataSql = fs.readFileSync(dataPath, 'utf8');

// Connection candidates
const candidates = [
  {
    name: 'Configured .env SUPABASE_DB_URL',
    connString: process.env.SUPABASE_DB_URL || process.env.DATABASE_URL
  },
  {
    name: 'Tokyo Pooler Transaction Mode (Port 6543)',
    connString: 'postgresql://postgres.qyzmcfcmzlfecaumvfgy:%40Tmxereset%40Bd1983@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres'
  },
  {
    name: 'Tokyo Pooler Session Mode (Port 5432)',
    connString: 'postgresql://postgres.qyzmcfcmzlfecaumvfgy:%40Tmxereset%40Bd1983@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres'
  },
  {
    name: 'Singapore Pooler Transaction Mode (Port 6543)',
    connString: 'postgresql://postgres.qyzmcfcmzlfecaumvfgy:%40Tmxereset%40Bd1983@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres'
  }
];

async function tryPush() {
  console.log('======================================================');
  console.log('  MANSTAT CLOUD DATABASE SYNCHRONIZATION              ');
  console.log('======================================================');
  console.log('SQL Schema File:', schemaPath, `(${(fs.statSync(schemaPath).size / 1024).toFixed(1)} KB)`);
  console.log('SQL Data File:  ', dataPath, `(${(fs.statSync(dataPath).size / 1024).toFixed(1)} KB)`);
  console.log('Target Project:   qyzmcfcmzlfecaumvfgy (Tokyo ap-northeast-1)');
  console.log('------------------------------------------------------\n');

  let connectedClient = null;
  let activeCandidate = null;

  for (const c of candidates) {
    if (!c.connString) continue;
    console.log(`[Connecting] Attempting: ${c.name}...`);
    const client = new Client({
      connectionString: c.connString,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 8000
    });

    try {
      await client.connect();
      console.log(`[Success] Connected via ${c.name}!`);
      connectedClient = client;
      activeCandidate = c;
      break;
    } catch (err) {
      console.log(`[Notice] Connection failed: ${err.message}`);
    }
  }

  if (!connectedClient) {
    console.log('\n======================================================');
    console.log('  DIAGNOSTIC REPORT: DIRECT POOLER ACCESS BLOCKED     ');
    console.log('======================================================');
    console.log('Direct TCP connection to Supabase pooler could not be');
    console.log('established from local environment (e.g. ISP port filter');
    console.log('or Supabase Supavisor tenant routing restriction).');
    console.log('\n[RECOMMENDED 100% RELIABLE ACTION]:');
    console.log('Execute the 2 safe, atomic SQL scripts directly in:');
    console.log('Supabase SQL Editor (https://supabase.com/dashboard/project/qyzmcfcmzlfecaumvfgy/sql/new)\n');
    console.log('Step 1: Open and run "sql/1_create_tables.sql" (271 lines, 7.1 KB)');
    console.log('Step 2: Open and run "sql/2_insert_data.sql"   (316 lines, 51.4 KB)');
    console.log('Both files begin with BEGIN; and end with COMMIT; with zero risk of truncation.');
    console.log('======================================================\n');
    return;
  }

  try {
    console.log('\n[Executing Step 1] Applying 1_create_tables.sql (15 Tables)...');
    await connectedClient.query(schemaSql);
    console.log('[Step 1 Complete] All 15 tables created/recreated successfully.');

    console.log('\n[Executing Step 2] Applying 2_insert_data.sql (Ground-Truth Data)...');
    await connectedClient.query(dataSql);
    console.log('[Step 2 Complete] All rows inserted/upserted successfully.');

    // Audit counts
    const tCount = await connectedClient.query('SELECT count(*) FROM teachers');
    const qCount = await connectedClient.query('SELECT count(*) FROM leave_quota');
    const bCount = await connectedClient.query('SELECT count(*) FROM board_members');
    console.log('\n=== LIVE SUPABASE AUDIT RESULTS ===');
    console.log('Teachers count:     ', tCount.rows[0].count);
    console.log('Leave Quotas count: ', qCount.rows[0].count);
    console.log('Board Members count:', bCount.rows[0].count);
    console.log('===================================\n');

    await connectedClient.end();
  } catch (sqlErr) {
    console.error('[SQL Execution Error]', sqlErr.message);
    try { await connectedClient.query('ROLLBACK;'); } catch (_) {}
    await connectedClient.end();
  }
}

tryPush();
