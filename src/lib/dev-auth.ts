import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

const DEV_USER_ID = '00000000-0000-0000-0000-000000000000'; // Fake UUID for dev

export async function getDevUser() {
  const cookieStore = await cookies();
  const devBypass = cookieStore.get('dev-bypass')?.value === 'true';
  
  if (!devBypass) return null;
  
  // Return a fake user object for dev mode
  return {
    id: DEV_USER_ID,
    email: 'dev@example.com',
    user_metadata: {
      full_name: 'Dev User',
    },
  };
}

export async function getAuthUser(supabase: any) {
  // Check for dev bypass first
  const devUser = await getDevUser();
  if (devUser) return { user: devUser, error: null };
  
  // Otherwise check real auth
  return await supabase.auth.getUser();
}
