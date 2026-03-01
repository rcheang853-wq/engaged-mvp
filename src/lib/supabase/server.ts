import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from '@/types/database';

// Server-side Supabase client for API routes and server components
export async function createServerSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. Please check your .env.local file.'
    );
  }

  const cookieStore = await cookies();

  // Dev-bypass mode: use service role on the server to avoid RLS blocking local development.
  // This is ONLY server-side (never exposed to the browser).
  const devBypass = cookieStore.get('dev-bypass')?.value === 'true';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const keyToUse = devBypass && serviceRoleKey ? serviceRoleKey : supabaseAnonKey;

  return createServerClient<Database>(supabaseUrl, keyToUse, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  });
}

// Direct export for backward compatibility
export const createClient = createServerSupabaseClient;