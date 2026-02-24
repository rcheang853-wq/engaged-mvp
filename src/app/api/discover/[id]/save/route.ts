import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/dev-auth';

export const dynamic = 'force-dynamic';

// POST /api/discover/[id]/save  → save
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = (await createServerSupabaseClient()) as any;
    const { data: auth, error: authError } = await getAuthUser(supabase);
    const user = auth?.user;
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabase
      .from('public_event_saves')
      .upsert({ user_id: user.id, public_event_id: id }, { onConflict: 'user_id,public_event_id' });

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE /api/discover/[id]/save → unsave
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = (await createServerSupabaseClient()) as any;
    const { data: auth, error: authError } = await getAuthUser(supabase);
    const user = auth?.user;
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabase
      .from('public_event_saves')
      .delete()
      .eq('user_id', user.id)
      .eq('public_event_id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
