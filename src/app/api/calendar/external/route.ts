import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { ExternalCalendarSyncService } from '@/services/external-calendar/sync-service';
import {
  ExternalCalendarProvider,
  ExternalCalendarSyncConfig
} from '@/types/calendar';

export const dynamic = 'force-dynamic'

/**
 * GET /api/calendar/external - Get user's external calendar sync configs
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: syncConfigs, error } = await supabase
      .from('external_calendar_sync')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching external calendar configs:', error);
      return NextResponse.json(
        { error: 'Failed to fetch external calendar configurations' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: syncConfigs || []
    });

  } catch (error) {
    console.error('External calendar GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/calendar/external - Initialize external calendar sync
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      provider,
      accessToken,
      refreshToken,
      syncDirection = 'bidirectional',
      conflictResolution = 'local_wins'
    } = body;

    if (!provider || !accessToken) {
      return NextResponse.json(
        { error: 'Provider and access token are required' },
        { status: 400 }
      );
    }

    const syncService = new ExternalCalendarSyncService();

    // Initialize sync and get available calendars
    const initResult = await syncService.initializeSync(
      provider as ExternalCalendarProvider,
      accessToken,
      user.id
    );

    if (!initResult.success) {
      return NextResponse.json(
        { error: initResult.error },
        { status: 400 }
      );
    }

    // Save sync configurations to database
    const configs = initResult.data!;
    const configsToInsert = configs.map(config => ({
      user_id: user.id,
      provider: config.provider,
      provider_calendar_id: config.providerCalendarId,
      calendar_name: config.calendarName,
      sync_direction: syncDirection,
      sync_status: 'pending',
      access_token: accessToken, // In production, encrypt this
      refresh_token: refreshToken, // In production, encrypt this
      sync_interval: 15,
      error_count: 0,
      settings: {
        syncEvents: true,
        syncReminders: true,
        syncAttendees: true,
        conflictResolution,
      }
    }));

    const { data: insertedConfigs, error: insertError } = await supabase
      .from('external_calendar_sync')
      .insert(configsToInsert)
      .select();

    if (insertError) {
      console.error('Error saving sync configs:', insertError);
      return NextResponse.json(
        { error: 'Failed to save external calendar configurations' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: insertedConfigs,
      message: `Successfully connected ${configs.length} ${provider} calendar(s)`
    });

  } catch (error) {
    console.error('External calendar POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/calendar/external - Update external calendar sync config
 */
export async function PUT(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      id,
      syncDirection,
      syncInterval,
      settings
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Sync configuration ID is required' },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (syncDirection) updateData.sync_direction = syncDirection;
    if (syncInterval) updateData.sync_interval = syncInterval;
    if (settings) updateData.settings = settings;
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('external_calendar_sync')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating sync config:', error);
      return NextResponse.json(
        { error: 'Failed to update external calendar configuration' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Sync configuration not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
      message: 'External calendar configuration updated successfully'
    });

  } catch (error) {
    console.error('External calendar PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/calendar/external - Remove external calendar sync
 */
export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Sync configuration ID is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('external_calendar_sync')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting sync config:', error);
      return NextResponse.json(
        { error: 'Failed to delete external calendar configuration' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'External calendar sync removed successfully'
    });

  } catch (error) {
    console.error('External calendar DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}