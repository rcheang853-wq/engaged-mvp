import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const createCommentSchema = z.object({
  body: z.string().min(1).max(2000),
});

// GET /api/calendars/[id]/events/[eventId]/comments
export async function GET(_req: NextRequest, { params }: { params: { id: string; eventId: string } }) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabase
      .from('event_comments')
      .select(`id, body, created_at, updated_at, profiles:user_id(id, full_name, avatar_url)`)
      .eq('calendar_event_id', params.eventId)
      .order('created_at');

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST /api/calendars/[id]/events/[eventId]/comments
export async function POST(request: NextRequest, { params }: { params: { id: string; eventId: string } }) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const parsed = createCommentSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ success: false, error: parsed.error.errors }, { status: 400 });

    const { data, error } = await supabase
      .from('event_comments')
      .insert({ body: parsed.data.body, calendar_event_id: params.eventId, user_id: user.id })
      .select(`id, body, created_at, profiles:user_id(id, full_name, avatar_url)`)
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE /api/calendars/[id]/events/[eventId]/comments?commentId=xxx
export async function DELETE(request: NextRequest, { params }: { params: { id: string; eventId: string } }) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const commentId = new URL(request.url).searchParams.get('commentId');
    if (!commentId) return NextResponse.json({ success: false, error: 'commentId query param required' }, { status: 400 });

    // RLS policy ensures only own comments can be deleted
    const { error } = await supabase
      .from('event_comments')
      .delete()
      .eq('id', commentId)
      .eq('calendar_event_id', params.eventId)
      .eq('user_id', user.id);

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    return NextResponse.json({ success: true, message: 'Comment deleted' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
