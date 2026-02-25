import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// GET /api/auth/me — returns current user or null
export async function GET() {
  try {
    const supabase = (await createServerSupabaseClient()) as any;
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) {
      return NextResponse.json({ user: null }, { status: 200 });
    }
    return NextResponse.json({ user: data.user });
  } catch (err: any) {
    return NextResponse.json({ user: null, error: err.message }, { status: 200 });
  }
}
