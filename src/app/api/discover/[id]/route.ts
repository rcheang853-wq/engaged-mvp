import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { fetchHongKongDiscoverEventById } from '@/lib/discover/hong-kong-lcsd';

export const dynamic = 'force-dynamic';

// GET /api/discover/[id] — single public event
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (id.startsWith('hk-lcsd__')) {
      const data = await fetchHongKongDiscoverEventById(id);
      if (!data) {
        return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
      }

      return NextResponse.json({ success: true, data });
    }

    const supabase = (await createServerSupabaseClient()) as any;

    const { data, error } = await supabase
      .from('public_events')
      .select('*')
      .eq('id', id)
      .eq('status', 'active')
      .single();

    if (error || !data) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
