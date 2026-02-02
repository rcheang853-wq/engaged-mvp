import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { ExternalCalendarSyncService } from '@/services/external-calendar/sync-service';
import { ExternalCalendarSyncConfig } from '@/types/calendar';

export const dynamic = 'force-dynamic'

/**
 * POST /api/calendar/external/sync - Trigger manual sync for external calendar
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
    const { syncConfigId, direction = 'import' } = body;

    if (!syncConfigId) {
      return NextResponse.json(
        { error: 'Sync configuration ID is required' },
        { status: 400 }
      );
    }

    // Get sync configuration
    const { data: syncConfig, error: configError } = await supabase
      .from('external_calendar_sync')
      .select('*')
      .eq('id', syncConfigId)
      .eq('user_id', user.id)
      .single();

    if (configError || !syncConfig) {
      return NextResponse.json(
        { error: 'Sync configuration not found' },
        { status: 404 }
      );
    }

    // Update status to syncing
    await supabase
      .from('external_calendar_sync')
      .update({
        sync_status: 'syncing',
        updated_at: new Date().toISOString()
      })
      .eq('id', syncConfigId);

    const syncService = new ExternalCalendarSyncService();

    try {
      let result;

      if (direction === 'import') {
        // Import events from external calendar
        result = await syncService.syncFromExternal(syncConfig as any);
      } else if (direction === 'export') {
        // Get user's internal events to export
        const { data: internalEvents } = await supabase
          .from('user_calendar_events')
          .select('*')
          .eq('user_id', user.id)
          .gte('start_time', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()) // 3 months ago
          .lte('start_time', new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString()); // 6 months ahead

        const events = (internalEvents || []).map(event => ({
          id: event.id,
          userId: event.user_id,
          title: event.title,
          description: event.description,
          startTime: new Date(event.start_time),
          endTime: new Date(event.end_time),
          timezone: event.timezone || 'UTC',
          allDay: event.all_day || false,
          location: event.location,
          status: 'confirmed' as const,
          priority: 'normal' as const,
          visibility: 'private' as const,
          createdBy: event.user_id,
          externalCalendarId: event.external_calendar_id,
          externalEventId: event.external_event_id,
          createdAt: new Date(event.created_at),
          updatedAt: new Date(event.updated_at),
          isRecurring: false,
          isException: false,
        }));

        result = await syncService.syncToExternal(syncConfig as any, events as any);
      } else {
        return NextResponse.json(
          { error: 'Invalid sync direction. Must be "import" or "export"' },
          { status: 400 }
        );
      }

      // Update sync status and results
      await supabase
        .from('external_calendar_sync')
        .update({
          sync_status: result.success ? 'connected' : 'error',
          last_sync_at: new Date().toISOString(),
          next_sync_at: new Date(Date.now() + syncConfig.sync_interval * 60 * 1000).toISOString(),
          error_count: result.success ? 0 : syncConfig.error_count + 1,
          last_error: result.success ? null : result.errors.join('; '),
          updated_at: new Date().toISOString()
        })
        .eq('id', syncConfigId);

      if (result.success) {
        return NextResponse.json({
          success: true,
          data: result,
          message: `Sync completed successfully. ${direction === 'import' ? 'Imported' : 'Exported'} ${result.importedEvents} events.`
        });
      } else {
        return NextResponse.json({
          success: false,
          error: result.errors.join('; '),
          data: result
        }, { status: 400 });
      }

    } catch (syncError) {
      // Update error status
      await supabase
        .from('external_calendar_sync')
        .update({
          sync_status: 'error',
          error_count: syncConfig.error_count + 1,
          last_error: syncError instanceof Error ? syncError.message : 'Unknown error',
          updated_at: new Date().toISOString()
        })
        .eq('id', syncConfigId);

      throw syncError;
    }

  } catch (error) {
    console.error('External calendar sync error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/calendar/external/sync - Get sync status for external calendar
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

    const { searchParams } = new URL(request.url);
    const syncConfigId = searchParams.get('id');

    if (!syncConfigId) {
      return NextResponse.json(
        { error: 'Sync configuration ID is required' },
        { status: 400 }
      );
    }

    const { data: syncConfig, error } = await supabase
      .from('external_calendar_sync')
      .select('*')
      .eq('id', syncConfigId)
      .eq('user_id', user.id)
      .single();

    if (error || !syncConfig) {
      return NextResponse.json(
        { error: 'Sync configuration not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: syncConfig.id,
        provider: syncConfig.provider,
        calendarName: syncConfig.calendar_name,
        syncStatus: syncConfig.sync_status,
        lastSyncAt: syncConfig.last_sync_at,
        nextSyncAt: syncConfig.next_sync_at,
        errorCount: syncConfig.error_count,
        lastError: syncConfig.last_error,
        syncInterval: syncConfig.sync_interval
      }
    });

  } catch (error) {
    console.error('Get sync status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}