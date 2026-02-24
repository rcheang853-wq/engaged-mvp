import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const joinSchema = z.object({
  invite_code: z.string().min(1),
});

// POST /api/calendars/join — join a calendar by invite code
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const parsed = joinSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ success: false, error: parsed.error.errors }, { status: 400 });

    // Find calendar by invite code (using service client to bypass RLS for lookup)
    const { data: calendar, error: calError } = await supabase
      .from('calendars')
      .select('id, name')
      .eq('invite_code', parsed.data.invite_code)
      .single();

    if (calError || !calendar) {
      return NextResponse.json({ success: false, error: 'Invalid invite code' }, { status: 404 });
    }

    // Check if already a member
    const { data: existing } = await supabase
      .from('calendar_members')
      .select('id')
      .eq('calendar_id', calendar.id)
      .eq('user_id', user.id)
      .single();

    if (existing) {
      return NextResponse.json({ success: false, error: 'You are already a member of this calendar' }, { status: 409 });
    }

    // Add as viewer
    const { data, error } = await supabase
      .from('calendar_members')
      .insert({ calendar_id: calendar.id, user_id: user.id, role: 'viewer' })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, data: { calendar, membership: data } }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
