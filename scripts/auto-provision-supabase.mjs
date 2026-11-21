#!/usr/bin/env node
/**
 * ============================================================================
 * ManStat: Automated Supabase Provisioning Engine
 * ============================================================================
 * File: /scripts/auto-provision-supabase.mjs
 * Purpose:
 *   1. Provisions Database Schemas, Tables, Views, RPC, and RLS (001_init_manstat_schema.sql)
 *   2. Provisions Storage Buckets & Storage RLS (002_storage_buckets.sql)
 *   3. Seeds Default School Settings & FY2570 Official Holidays (seed.sql)
 *   4. Verifies Storage Buckets via @supabase/supabase-js (Idempotent)
 * Standard: 100% Zero-GAS, Zero manual web clicking, Pure CLI automation
 * ============================================================================
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import pg from 'pg';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// 1. Load Environment Variables (prioritize .env.local then .env)
const envLocalPath = path.join(projectRoot, '.env.local');
const envPath = path.join(projectRoot, '.env');

if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
  console.log('[CONFIG] Loaded environment variables from .env.local');
} else if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log('[CONFIG] Loaded environment variables from .env');
} else {
  console.warn('[CONFIG] Warning: Neither .env.local nor .env was found.');
}

const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.SUPABASE_DB_URL;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('------------------------------------------------------------');
console.log(' MANSTAT: AUTOMATED SUPABASE PROVISIONING ENGINE');
console.log('------------------------------------------------------------');

async function runDirectSqlMigrations() {
  if (!databaseUrl) {
    console.warn('[DB] No DATABASE_URL found. Skipping direct PostgreSQL migration.');
    console.warn('[DB] Tip: Add DATABASE_URL to your .env.local to enable automated schema migrations.');
    return;
  }

  console.log('[DB] Connecting to PostgreSQL database via connection pooler...');
  const { Client } = pg;
  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });

  try {
    await client.connect();
    console.log('[DB] Connected successfully to Supabase PostgreSQL.');

    const migrationFiles = [
      'supabase/migrations/001_init_manstat_schema.sql',
      'supabase/migrations/002_storage_buckets.sql',
      'supabase/seed.sql',
    ];

    for (const relPath of migrationFiles) {
      const fullPath = path.join(projectRoot, relPath);
      if (fs.existsSync(fullPath)) {
        console.log(`[DB] Applying: ${relPath}...`);
        const sqlContent = fs.readFileSync(fullPath, 'utf8');
        await client.query(sqlContent);
        console.log(`[DB] [OK] Applied ${relPath} successfully.`);
      } else {
        console.warn(`[DB] [WARN] File not found: ${relPath}`);
      }
    }
  } catch (err) {
    console.error('[DB] [ERROR] PostgreSQL Migration failed:', err.message);
  } finally {
    await client.end().catch(() => {});
  }
}

async function provisionStorageBucketsViaApi() {
  if (!supabaseUrl || !serviceRoleKey) {
    console.log('[STORAGE] SUPABASE_SERVICE_ROLE_KEY or SUPABASE_URL not supplied.');
    console.log('[STORAGE] (Storage buckets are already created via direct SQL migration 002 if DB was connected).');
    return;
  }

  console.log('[STORAGE] Verifying and provisioning Storage Buckets via Supabase Admin API...');
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const bucketsToEnsure = [
    {
      id: 'leave-documents',
      public: false,
      fileSizeLimit: 5242880, // 5MB
      allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    },
    {
      id: 'signatures',
      public: false,
      fileSizeLimit: 2097152, // 2MB
      allowedMimeTypes: ['image/png', 'image/jpeg'],
    },
  ];

  try {
    const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();
    if (listError) {
      console.warn('[STORAGE] listBuckets warning:', listError.message);
    }

    const existingBucketIds = new Set(existingBuckets?.map((b) => b.id) || []);

    for (const b of bucketsToEnsure) {
      if (!existingBucketIds.has(b.id)) {
        console.log(`[STORAGE] Creating bucket '${b.id}'...`);
        const { error: createError } = await supabase.storage.createBucket(b.id, {
          public: b.public,
          fileSizeLimit: b.fileSizeLimit,
          allowedMimeTypes: b.allowedMimeTypes,
        });

        if (createError) {
          console.warn(`[STORAGE] createBucket '${b.id}' note:`, createError.message);
        } else {
          console.log(`[STORAGE] [OK] Bucket '${b.id}' created successfully.`);
        }
      } else {
        console.log(`[STORAGE] [OK] Bucket '${b.id}' already exists.`);
      }
    }
  } catch (err) {
    console.error('[STORAGE] Storage API error:', err.message);
  }
}

async function main() {
  try {
    await runDirectSqlMigrations();
    await provisionStorageBucketsViaApi();
    console.log('------------------------------------------------------------');
    console.log('[SUCCESS] Supabase Provisioning Workflow Completed.');
    console.log('------------------------------------------------------------');
  } catch (err) {
    console.error('[FATAL] Provisioning execution error:', err);
    process.exit(1);
  }
}

main();
