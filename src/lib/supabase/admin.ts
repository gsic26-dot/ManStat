import { createClient, SupabaseClient } from '@supabase/supabase-js';

let cachedAdminClient: SupabaseClient | null = null;

/**
 * Checks whether Supabase URL and Service Role Key are legitimately configured.
 * Returns false if keys are missing or contain placeholder dummy values.
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) return false;
  if (url.trim() === '' || serviceKey.trim() === '') return false;
  if (url.includes('placeholder') || serviceKey.includes('placeholder')) return false;
  if (url.includes('your-project-id') || serviceKey.includes('your-service-role-key')) return false;
  if (serviceKey.includes('dummy') || serviceKey.startsWith('ey...')) return false;
  if (url.startsWith('http://localhost') || url.startsWith('https://')) return true;

  return false;
}

/**
 * Creates or returns the singleton Supabase Admin Client using the Service Role Key.
 * Bypasses RLS and should ONLY be used in server-side Route Handlers or Server Actions.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (cachedAdminClient) return cachedAdminClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase is not configured properly. Missing or invalid NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.'
    );
  }

  cachedAdminClient = createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return cachedAdminClient;
}
