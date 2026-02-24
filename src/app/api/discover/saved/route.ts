import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/dev-auth';

export const dynamic = 'force-dynamic';

// GET /api/discover/saved
// Returns the user's saved public events.
export async function GET() {
  try {
    const supabase = (await createServerSupabaseClient()) as any;
    const { data: auth, error: authError } = await getAuthUser(supabase);
    const user = auth?.user;
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('public_event_saves')
      .select('created_at, public_events:public_event_id(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Flatten to just event list (keep save timestamp for UI if needed)
    const events = (data ?? []).map((row: any) => ({
      saved_at: row.created_at,
      ...(row.public_events ?? {}),
    }));

    return NextResponse.json({ success: true, data: events });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
