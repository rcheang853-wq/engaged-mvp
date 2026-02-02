import { NextRequest, NextResponse } from 'next/server';
import { ExternalCalendarSyncService } from '@/services/external-calendar/sync-service';
import { ExternalCalendarProvider } from '@/types/calendar';

/**
 * POST /api/calendar/external/test - Test connection to external calendar provider
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider, accessToken } = body;

    if (!provider || !accessToken) {
      return NextResponse.json(
        { error: 'Provider and access token are required' },
        { status: 400 }
      );
    }

    if (!['google', 'outlook'].includes(provider)) {
      return NextResponse.json(
        { error: 'Unsupported provider. Only "google" and "outlook" are supported.' },
        { status: 400 }
      );
    }

    const syncService = new ExternalCalendarSyncService();

    const result = await syncService.testConnection(
      provider as ExternalCalendarProvider,
      accessToken
    );

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: {
          provider,
          connected: result.data,
          message: `Successfully connected to ${provider} calendar`
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error || 'Connection test failed',
        data: {
          provider,
          connected: false
        }
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Connection test error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}