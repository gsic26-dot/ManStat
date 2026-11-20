import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database.types';

function sanitizeUrl(rawUrl?: string): string {
  if (!rawUrl) return 'https://qyzmcfcmzlfecaumvfgy.supabase.co';
  let url = rawUrl.trim();
  url = url.replace(/\/rest\/v1\/?$/i, '');
  url = url.replace(/\/+$/, '');
  return url;
}

const defaultSupabaseUrl = sanitizeUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
const defaultAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    defaultSupabaseUrl,
    defaultAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
          }
        },
      },
    }
  );
}

export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || defaultAnonKey;

  return createServerClient<Database>(
    defaultSupabaseUrl,
    serviceRoleKey,
    {
      cookies: {
        getAll: () => [],
        setAll: () => {},
      },
    }
  );
}
