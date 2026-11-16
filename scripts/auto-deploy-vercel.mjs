#!/usr/bin/env node
/**
 * ============================================================================
 * ManStat-Modern: Automated Vercel Deployment & Environment Sync Engine
 * ============================================================================
 * File: /scripts/auto-deploy-vercel.mjs
 * Purpose:
 *   1. Links the local project to Vercel via 'npx vercel link --yes'
 *   2. Synchronizes required Environment Variables to Vercel Project Settings:
 *      - NEXT_PUBLIC_SUPABASE_URL
 *      - NEXT_PUBLIC_SUPABASE_ANON_KEY
 *      - SUPABASE_SERVICE_ROLE_KEY
 *      - NEXT_PUBLIC_SITE_URL
 *   3. Triggers automated production deployment via 'npx vercel --prod --yes'
 * Standard: 100% Zero manual clicking on Vercel Dashboard
 * ============================================================================
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync, spawnSync } from 'node:child_process';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// 1. Load Environment Variables
const envLocalPath = path.join(projectRoot, '.env.local');
const envPath = path.join(projectRoot, '.env');

if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
} else if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

console.log('------------------------------------------------------------');
console.log(' MANSTAT-MODERN: AUTOMATED VERCEL DEPLOYMENT ENGINE');
console.log('------------------------------------------------------------');

function runCommand(command, description, ignoreError = false) {
  console.log(`[VERCEL] ${description}...`);
  try {
    const output = execSync(command, {
      cwd: projectRoot,
      stdio: ['pipe', 'pipe', 'pipe'],
      encoding: 'utf8',
      shell: true,
    });
    return { success: true, output };
  } catch (err) {
    if (!ignoreError) {
      console.warn(`[VERCEL] [NOTE] ${err.stderr || err.message}`);
    }
    return { success: false, error: err };
  }
}

async function main() {
  // Check if Vercel CLI is authenticated
  console.log('[VERCEL] Checking Vercel CLI authentication status...');
  const whoami = runCommand('npx vercel whoami', 'Verifying Vercel session', true);

  if (!whoami.success) {
    console.log('------------------------------------------------------------');
    console.log('[AUTH REQUIRED] Vercel CLI session not detected.');
    console.log('Please execute this command once to authenticate:');
    console.log('  npx vercel login');
    console.log('After logging in, rerun: npm run setup:vercel (or npm run ship)');
    console.log('------------------------------------------------------------');
    return;
  }

  console.log(`[VERCEL] Authenticated as: ${whoami.output.trim()}`);

  // 1. Link project
  runCommand('npx vercel link --yes', 'Linking Vercel project');

  // 2. Environment Variables Sync
  const envVars = [
    {
      name: 'NEXT_PUBLIC_SUPABASE_URL',
      value: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
    },
    {
      name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      value: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    },
    {
      name: 'SUPABASE_SERVICE_ROLE_KEY',
      value: process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
    {
      name: 'NEXT_PUBLIC_SITE_URL',
      value: process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://manstat.obec.local',
    },
  ];

  console.log('[VERCEL] Synchronizing environment variables to Vercel...');
  for (const env of envVars) {
    if (env.value) {
      // Remove existing variable before adding to avoid duplicate prompt
      runCommand(`npx vercel env rm ${env.name} production --yes`, `Removing old ${env.name}`, true);

      // Add to production, preview, development
      const environments = ['production', 'preview', 'development'];
      for (const targetEnv of environments) {
        try {
          const child = spawnSync(`npx vercel env add ${env.name} ${targetEnv}`, {
            cwd: projectRoot,
            input: `${env.value}\n`,
            shell: true,
            encoding: 'utf8',
          });
          if (child.status === 0) {
            console.log(`[VERCEL] [OK] Configured ${env.name} (${targetEnv})`);
          }
        } catch (e) {
          // Continue to next
        }
      }
    }
  }

  // 3. Deploy to Production
  console.log('[VERCEL] Initiating Production Deployment (npx vercel --prod --yes)...');
  const deploy = runCommand('npx vercel --prod --yes', 'Deploying to Vercel Production');

  if (deploy.success) {
    console.log('------------------------------------------------------------');
    console.log('[SUCCESS] Vercel Production Deployment Completed!');
    console.log(deploy.output);
    console.log('------------------------------------------------------------');
  } else {
    console.log('[VERCEL] Deployment process ended. Details above.');
  }
}

main();
