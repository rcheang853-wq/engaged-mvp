import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// POST /api/auth/signout
export async function POST() {
  try {
    const supabase = (await createServerSupabaseClient()) as any;
    await supabase.auth.signOut();
    const res = NextResponse.json({ success: true });
    // Clear dev-bypass cookie too
    res.cookies.set('dev-user-id', '', { maxAge: 0, path: '/' });
    return res;
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
