// Individual calendar event API endpoints
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/auth';
import { calendarService } from '@/services/calendar-service';
import {
  UpdateCalendarEventRequest,
  CalendarError
} from '@/types/calendar';
import { z } from 'zod';

export const dynamic = 'force-dynamic'

// Validation schema for updates
const updateEventSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  timezone: z.string().optional(),
  allDay: z.boolean().optional(),
  location: z.string().max(500).optional(),
  virtualMeetingUrl: z.string().url().optional(),
  recurrencePattern: z.object({
    frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
    interval: z.number().min(1).max(999),
    byWeekDay: z.array(z.number().min(0).max(6)).optional(),
    byMonthDay: z.array(z.number().min(1).max(31)).optional(),
    byMonth: z.array(z.number().min(1).max(12)).optional(),
    count: z.number().min(1).max(1000).optional(),
    until: z.string().datetime().optional(),
    exceptions: z.array(z.string().datetime()).optional()
  }).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  visibility: z.enum(['private', 'public', 'confidential']).optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  updateRecurring: z.enum(['this_only', 'this_and_future', 'all_instances']).optional(),
  conflictResolution: z.enum(['ignore', 'auto_resolve', 'manual']).optional()
});

/**
 * GET /api/calendar/events/[id] - Get a single calendar event
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const eventId = params.id;
    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      );
    }

    const result = await calendarService.getEvent(eventId, user.id);

    if (!result.success) {
      const status = result.error?.includes('not found') ? 404 : 400;
      return NextResponse.json(
        { error: result.error },
        { status }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data
    });

  } catch (error) {
    console.error('GET /api/calendar/events/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/calendar/events/[id] - Update a calendar event
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const eventId = params.id;
    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate request body
    const validationResult = updateEventSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const updateRequest: UpdateCalendarEventRequest = {
      ...validationResult.data,
      recurrencePattern: validationResult.data.recurrencePattern ? {
        ...validationResult.data.recurrencePattern,
        until: validationResult.data.recurrencePattern.until ? new Date(validationResult.data.recurrencePattern.until) : undefined,
        exceptions: validationResult.data.recurrencePattern.exceptions?.map(d => new Date(d))
      } : undefined
    };

    const result = await calendarService.updateEvent(eventId, updateRequest, user.id);

    if (!result.success) {
      // Check if it's a conflict error
      if (result.conflicts && result.conflicts.length > 0) {
        return NextResponse.json({
          success: false,
          error: result.error,
          conflicts: result.conflicts
        }, { status: 409 }); // Conflict status
      }

      const status = result.error?.includes('not found') ? 404 : 400;
      return NextResponse.json(
        { error: result.error },
        { status }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      conflicts: result.conflicts
    });

  } catch (error) {
    console.error('PUT /api/calendar/events/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/calendar/events/[id] - Delete a calendar event
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const eventId = params.id;
    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      );
    }

    // Parse query parameters for recurring event handling
    const { searchParams } = new URL(request.url);
    const deleteRecurring = searchParams.get('deleteRecurring') as 'this_only' | 'this_and_future' | 'all_instances' || 'this_only';

    const result = await calendarService.deleteEvent(eventId, user.id, deleteRecurring);

    if (!result.success) {
      const status = result.error?.includes('not found') ? 404 : 400;
      return NextResponse.json(
        { error: result.error },
        { status }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Event deleted successfully'
    });

  } catch (error) {
    console.error('DELETE /api/calendar/events/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/calendar/events/[id] - Partial update of calendar event
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const eventId = params.id;
    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // For PATCH, we allow very minimal updates (like status changes)
    const patchSchema = z.object({
      status: z.enum(['confirmed', 'tentative', 'cancelled', 'draft']).optional(),
      priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
      visibility: z.enum(['private', 'public', 'confidential']).optional(),
      color: z.string().regex(/^#[0-9A-F]{6}$/i).optional()
    });

    const validationResult = patchSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const updateRequest: UpdateCalendarEventRequest = validationResult.data;

    const result = await calendarService.updateEvent(eventId, updateRequest, user.id);

    if (!result.success) {
      const status = result.error?.includes('not found') ? 404 : 400;
      return NextResponse.json(
        { error: result.error },
        { status }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data
    });

  } catch (error) {
    console.error('PATCH /api/calendar/events/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Handle unsupported methods
 */
export async function POST() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST /api/calendar/events to create new events.' },
    { status: 405 }
  );
}

export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Allow': 'GET, PUT, PATCH, DELETE, HEAD, OPTIONS',
      'Access-Control-Allow-Methods': 'GET, PUT, PATCH, DELETE, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}