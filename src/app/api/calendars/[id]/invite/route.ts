import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// POST /api/calendars/[id]/invite — get (or regenerate) invite code
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    // Verify caller is owner or editor
    const { data: member } = await supabase
      .from('calendar_members')
      .select('role')
      .eq('calendar_id', id)
      .eq('user_id', user.id)
      .single();

    if (!member || !['owner', 'editor'].includes(member.role)) {
      return NextResponse.json({ success: false, error: 'Only owners or editors can generate invite links' }, { status: 403 });
    }

    // Generate a new invite code
    const invite_code = Math.random().toString(36).substring(2, 10).toUpperCase();

    const { data, error } = await supabase
      .from('calendars')
      .update({ invite_code, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, name, invite_code')
      .single();

    if (error) throw error;
    return NextResponse.json({
      success: true,
      data: {
        invite_code: data.invite_code,
        invite_url: `${process.env.NEXT_PUBLIC_SITE_URL || ''}/join/${data.invite_code}`,
      }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
