import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const addMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['editor', 'viewer']).optional().default('viewer'),
});

// GET /api/calendars/[id]/members
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabase
      .from('calendar_members')
      .select(`id, role, joined_at, profiles(id, full_name, avatar_url, email)`)
      .eq('calendar_id', params.id)
      .order('joined_at');

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST /api/calendars/[id]/members — add member by email
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const parsed = addMemberSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ success: false, error: parsed.error.errors }, { status: 400 });

    // Look up user by email in profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', parsed.data.email)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ success: false, error: 'User not found with that email' }, { status: 404 });
    }

    const { data, error } = await supabase
      .from('calendar_members')
      .insert({ calendar_id: params.id, user_id: profile.id, role: parsed.data.role })
      .select(`id, role, joined_at, profiles(id, full_name, avatar_url, email)`)
      .single();

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE /api/calendars/[id]/members?userId=xxx — remove member (owner only via RLS, or self-leave)
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const userId = new URL(request.url).searchParams.get('userId');
    if (!userId) return NextResponse.json({ success: false, error: 'userId query param required' }, { status: 400 });

    const { error } = await supabase
      .from('calendar_members')
      .delete()
      .eq('calendar_id', params.id)
      .eq('user_id', userId);

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    return NextResponse.json({ success: true, message: 'Member removed' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
