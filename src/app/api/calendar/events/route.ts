// Calendar events API endpoints
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/auth';
import { calendarService } from '@/services/calendar-service';
import {
  CreateCalendarEventRequest,
  UpdateCalendarEventRequest,
  CalendarEventsListRequest,
  CalendarError
} from '@/types/calendar';
import { z } from 'zod';
import { logApiRequest, logAuthFailure, logValidationError, logSuccess, logApiError } from '@/lib/api-logger';

export const dynamic = 'force-dynamic'

// Validation schemas
const createEventSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(2000).optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
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
  attendees: z.array(z.object({
    email: z.string().email(),
    name: z.string(),
    isOptional: z.boolean().optional()
  })).optional(),
  reminders: z.array(z.object({
    type: z.enum(['email', 'push', 'sms']),
    minutesBefore: z.number().min(0).max(10080) // Max 7 days
  })).optional(),
  checkConflicts: z.boolean().optional()
});

const updateEventSchema = createEventSchema.partial().extend({
  updateRecurring: z.enum(['this_only', 'this_and_future', 'all_instances']).optional(),
  conflictResolution: z.enum(['ignore', 'auto_resolve', 'manual']).optional()
});

const listEventsSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  timezone: z.string().optional(),
  status: z.array(z.string()).optional(),
  priority: z.array(z.string()).optional(),
  visibility: z.array(z.string()).optional(),
  searchQuery: z.string().max(200).optional(),
  hasConflicts: z.boolean().optional(),
  isRecurring: z.boolean().optional(),
  includeConflicts: z.boolean().optional(),
  includeDeleted: z.boolean().optional(),
  limit: z.number().min(1).max(200).optional(),
  cursor: z.string().optional(),
  orderBy: z.enum(['start_time', 'created_at', 'updated_at']).optional(),
  orderDirection: z.enum(['asc', 'desc']).optional()
});

/**
 * GET /api/calendar/events - List calendar events
 */
export async function GET(request: NextRequest) {
  try {
    logApiRequest(request);

    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      logAuthFailure(authError, { user: user ? 'present' : 'null' });
      return NextResponse.json(
        { error: 'Authentication required', details: authError?.message },
        { status: 401 }
      );
    }

    logSuccess('User authenticated', undefined, { userId: user.id, email: user.email });

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryParams: any = Object.fromEntries(searchParams);

    // Convert arrays from comma-separated strings
    ['status', 'priority', 'visibility'].forEach(key => {
      if (queryParams[key] && typeof queryParams[key] === 'string') {
        queryParams[key] = queryParams[key].split(',');
      }
    });

    // Convert booleans
    ['hasConflicts', 'isRecurring', 'includeConflicts', 'includeDeleted'].forEach(key => {
      if (queryParams[key] !== undefined) {
        queryParams[key] = queryParams[key] === 'true' || queryParams[key] === true;
      }
    });

    // Convert numbers
    if (queryParams.limit) {
      queryParams.limit = parseInt(queryParams.limit, 10);
      if (isNaN(queryParams.limit)) {
        delete queryParams.limit;
      }
    }

    const validationResult = listEventsSchema.safeParse(queryParams);
    if (!validationResult.success) {
      logValidationError(validationResult.error.errors, { queryParams });
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const requestData: CalendarEventsListRequest = {
      ...validationResult.data,
      filter: {
        startDate: validationResult.data.startDate,
        endDate: validationResult.data.endDate,
        timezone: validationResult.data.timezone,
        status: validationResult.data.status,
        priority: validationResult.data.priority,
        visibility: validationResult.data.visibility,
        searchQuery: validationResult.data.searchQuery,
        hasConflicts: validationResult.data.hasConflicts,
        isRecurring: validationResult.data.isRecurring
      },
      pagination: {
        limit: validationResult.data.limit || 50,
        cursor: validationResult.data.cursor,
        orderBy: validationResult.data.orderBy || 'start_time',
        orderDirection: validationResult.data.orderDirection || 'asc'
      },
      includeConflicts: validationResult.data.includeConflicts || false,
      includeDeleted: validationResult.data.includeDeleted || false
    };

    const result = await calendarService.listEvents(requestData, user.id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      conflicts: result.conflicts
    });

  } catch (error) {
    logApiError(error, 'GET /api/calendar/events');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/calendar/events - Create a new calendar event
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate request body
    const validationResult = createEventSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const createRequest: CreateCalendarEventRequest = {
      ...validationResult.data,
      recurrencePattern: validationResult.data.recurrencePattern ? {
        ...validationResult.data.recurrencePattern,
        until: validationResult.data.recurrencePattern.until ? new Date(validationResult.data.recurrencePattern.until) : undefined,
        exceptions: validationResult.data.recurrencePattern.exceptions?.map(d => new Date(d))
      } : undefined
    };

    const result = await calendarService.createEvent(createRequest, user.id);

    if (!result.success) {
      // Check if it's a conflict error
      if (result.conflicts && result.conflicts.length > 0) {
        return NextResponse.json({
          success: false,
          error: result.error,
          conflicts: result.conflicts
        }, { status: 409 }); // Conflict status
      }

      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      conflicts: result.conflicts
    }, { status: 201 });

  } catch (error) {
    console.error('POST /api/calendar/events error:', error);
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

      return NextResponse.json(
        { error: result.error },
        { status: 400 }
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
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
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
 * Handle unsupported methods
 */
export async function PATCH() {
  return NextResponse.json(
    { error: 'Method not allowed' },
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
      'Allow': 'GET, POST, PUT, DELETE, HEAD, OPTIONS',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}