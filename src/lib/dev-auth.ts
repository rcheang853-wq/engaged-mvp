import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

const DEV_EMAIL = 'dev@example.com';
const DEV_PASSWORD = 'DevPass123!';

function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL');
  return createClient(url, key);
}

export async function getDevUser() {
  const cookieStore = await cookies();
  const devBypass = cookieStore.get('dev-bypass')?.value === 'true';
  if (!devBypass) return null;

  // In dev-bypass mode we MUST use a REAL auth.users id, otherwise DB FKs (profiles_id_fkey, calendars_created_by_fkey)
  // will fail. We resolve (or create) a real Supabase Auth user via service role.
  const admin = createSupabaseAdminClient();

  // Try to find existing user by email
  const { data: list, error: listErr } = await admin.auth.admin.listUsers({ perPage: 200 });
  if (listErr) throw listErr;

  const existing = list?.users?.find((u: any) => (u.email ?? '').toLowerCase() === DEV_EMAIL.toLowerCase());
  if (existing) {
    return {
      id: existing.id,
      email: existing.email,
      user_metadata: { full_name: 'Dev User' },
    };
  }

  // Create dev user if missing
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: DEV_EMAIL,
    password: DEV_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: 'Dev User' },
  });
  if (createErr) throw createErr;

  return {
    id: (created as any).user.id,
    email: DEV_EMAIL,
    user_metadata: { full_name: 'Dev User' },
  };
}

export async function getAuthUser(supabase: any) {
  // Normalize return shape to match Supabase: { data: { user }, error }
  const devUser = await getDevUser();
  if (devUser) return { data: { user: devUser }, error: null };

  const { data, error } = await supabase.auth.getUser();
  return { data, error };
}
