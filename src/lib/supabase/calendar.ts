// Supabase database operations for calendar functionality
import { createServerSupabaseClient } from './auth';
import {
  CalendarEvent,
  CalendarEventInsert,
  CalendarEventUpdate,
  CalendarInvitation,
  CalendarInvitationInsert,
  CalendarInvitationUpdate,
  ExternalCalendarSync,
  ExternalCalendarSyncInsert,
  ExternalCalendarSyncUpdate,
  CalendarConflict,
  CalendarConflictInsert,
  CalendarConflictUpdate,
  EnhancedCalendarEvent,
  CalendarFilter,
  CalendarPagination,
  CalendarEventListResult,
  CalendarOperationResult,
  RecurrencePattern
} from '@/types/calendar';
import { Database } from '@/types/database';

type SupabaseClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;

/**
 * Calendar database operations class
 */
export class CalendarDatabase {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Create a new calendar event
   */
  async createEvent(
    eventData: CalendarEventInsert,
    userId: string
  ): Promise<CalendarOperationResult<EnhancedCalendarEvent>> {
    try {
      // Ensure user_id and created_by are set
      const insertData: CalendarEventInsert = {
        ...eventData,
        user_id: userId,
        created_by: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await this.supabase
        .from('user_calendar_events')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: `Failed to create event: ${error.message}`
        };
      }

      const enhancedEvent = await this.mapToEnhancedEvent(data);

      return {
        success: true,
        data: enhancedEvent
      };
    } catch (error) {
      return {
        success: false,
        error: `Error creating event: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Update an existing calendar event
   */
  async updateEvent(
    eventId: string,
    eventData: CalendarEventUpdate,
    userId: string
  ): Promise<CalendarOperationResult<EnhancedCalendarEvent>> {
    try {
      // Add updated timestamp
      const updateData: CalendarEventUpdate = {
        ...eventData,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await this.supabase
        .from('user_calendar_events')
        .update(updateData)
        .eq('id', eventId)
        .eq('user_id', userId) // Ensure user can only update their own events
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: `Failed to update event: ${error.message}`
        };
      }

      if (!data) {
        return {
          success: false,
          error: 'Event not found or access denied'
        };
      }

      const enhancedEvent = await this.mapToEnhancedEvent(data);

      return {
        success: true,
        data: enhancedEvent
      };
    } catch (error) {
      return {
        success: false,
        error: `Error updating event: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Delete a calendar event
   */
  async deleteEvent(
    eventId: string,
    userId: string,
    softDelete: boolean = true
  ): Promise<CalendarOperationResult<boolean>> {
    try {
      if (softDelete) {
        // Soft delete by updating status
        const { error } = await this.supabase
          .from('user_calendar_events')
          .update({
            status: 'cancelled',
            updated_at: new Date().toISOString()
          })
          .eq('id', eventId)
          .eq('user_id', userId);

        if (error) {
          return {
            success: false,
            error: `Failed to delete event: ${error.message}`
          };
        }
      } else {
        // Hard delete
        const { error } = await this.supabase
          .from('user_calendar_events')
          .delete()
          .eq('id', eventId)
          .eq('user_id', userId);

        if (error) {
          return {
            success: false,
            error: `Failed to delete event: ${error.message}`
          };
        }
      }

      // Also delete related invitations and conflicts
      await this.cleanupEventRelations(eventId);

      return {
        success: true,
        data: true
      };
    } catch (error) {
      return {
        success: false,
        error: `Error deleting event: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get a single calendar event by ID
   */
  async getEvent(
    eventId: string,
    userId: string
  ): Promise<CalendarOperationResult<EnhancedCalendarEvent>> {
    try {
      const { data, error } = await this.supabase
        .from('user_calendar_events')
        .select(`
          *,
          invitations:calendar_invitations!event_id(*),
          conflicts:calendar_conflicts!event_id(*)
        `)
        .eq('id', eventId)
        .eq('user_id', userId)
        .single();

      if (error) {
        return {
          success: false,
          error: `Failed to get event: ${error.message}`
        };
      }

      if (!data) {
        return {
          success: false,
          error: 'Event not found'
        };
      }

      const enhancedEvent = await this.mapToEnhancedEvent(data);

      return {
        success: true,
        data: enhancedEvent
      };
    } catch (error) {
      return {
        success: false,
        error: `Error getting event: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * List calendar events with filtering and pagination
   */
  async listEvents(
    userId: string,
    filter: CalendarFilter = {},
    pagination: CalendarPagination = { limit: 50, orderBy: 'start_time', orderDirection: 'asc' }
  ): Promise<CalendarOperationResult<CalendarEventListResult>> {
    try {
      let query = this.supabase
        .from('user_calendar_events')
        .select(`
          *,
          invitations:calendar_invitations!event_id(*),
          conflicts:calendar_conflicts!event_id(*)
        `, { count: 'exact' })
        .eq('user_id', userId);

      // Apply filters
      query = this.applyFilters(query, filter);

      // Apply pagination and ordering
      query = query
        .order(pagination.orderBy, { ascending: pagination.orderDirection === 'asc' })
        .range(0, pagination.limit - 1);

      if (pagination.cursor) {
        // Implement cursor-based pagination if needed
        // This is a simplified version - in production, you'd want proper cursor implementation
        query = query.gt('created_at', pagination.cursor);
      }

      const { data, error, count } = await query;

      if (error) {
        return {
          success: false,
          error: `Failed to list events: ${error.message}`
        };
      }

      const enhancedEvents = await Promise.all(
        (data || []).map(event => this.mapToEnhancedEvent(event))
      );

      const result: CalendarEventListResult = {
        events: enhancedEvents,
        totalCount: count || 0,
        hasMore: (count || 0) > pagination.limit,
        nextCursor: enhancedEvents.length > 0 ? enhancedEvents[enhancedEvents.length - 1].createdAt.toISOString() : undefined
      };

      return {
        success: true,
        data: result
      };
    } catch (error) {
      return {
        success: false,
        error: `Error listing events: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get events within a specific date range (optimized for calendar views)
   */
  async getEventsInRange(
    userId: string,
    startDate: Date,
    endDate: Date,
    includeRecurring: boolean = true
  ): Promise<CalendarOperationResult<EnhancedCalendarEvent[]>> {
    try {
      const query = this.supabase
        .from('user_calendar_events')
        .select(`
          *,
          invitations:calendar_invitations!event_id(*),
          conflicts:calendar_conflicts!event_id(*)
        `)
        .eq('user_id', userId)
        .neq('status', 'cancelled')
        .or(
          `and(start_time.gte.${startDate.toISOString()},start_time.lte.${endDate.toISOString()}),` +
          `and(end_time.gte.${startDate.toISOString()},end_time.lte.${endDate.toISOString()}),` +
          `and(start_time.lte.${startDate.toISOString()},end_time.gte.${endDate.toISOString()})`
        )
        .order('start_time', { ascending: true });

      const { data, error } = await query;

      if (error) {
        return {
          success: false,
          error: `Failed to get events in range: ${error.message}`
        };
      }

      let events = await Promise.all(
        (data || []).map(event => this.mapToEnhancedEvent(event))
      );

      // Handle recurring events
      if (includeRecurring) {
        const recurringEvents = events.filter(e => e.isRecurring && e.recurrencePattern);
        const expandedRecurringEvents: EnhancedCalendarEvent[] = [];

        for (const recurringEvent of recurringEvents) {
          const instances = this.generateRecurringInstances(recurringEvent, startDate, endDate);
          expandedRecurringEvents.push(...instances);
        }

        // Remove original recurring events and add expanded instances
        events = events.filter(e => !e.isRecurring);
        events.push(...expandedRecurringEvents);

        // Sort by start time
        events.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
      }

      return {
        success: true,
        data: events
      };
    } catch (error) {
      return {
        success: false,
        error: `Error getting events in range: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Create batch events (useful for recurring events)
   */
  async createBatchEvents(
    eventsData: CalendarEventInsert[],
    userId: string
  ): Promise<CalendarOperationResult<EnhancedCalendarEvent[]>> {
    try {
      const insertData = eventsData.map(event => ({
        ...event,
        user_id: userId,
        created_by: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      const { data, error } = await this.supabase
        .from('user_calendar_events')
        .insert(insertData)
        .select();

      if (error) {
        return {
          success: false,
          error: `Failed to create batch events: ${error.message}`
        };
      }

      const enhancedEvents = await Promise.all(
        (data || []).map(event => this.mapToEnhancedEvent(event))
      );

      return {
        success: true,
        data: enhancedEvents
      };
    } catch (error) {
      return {
        success: false,
        error: `Error creating batch events: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Invitation management methods
   */
  async createInvitation(
    invitationData: CalendarInvitationInsert
  ): Promise<CalendarOperationResult<CalendarInvitation>> {
    try {
      const insertData: CalendarInvitationInsert = {
        ...invitationData,
        sent_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await this.supabase
        .from('calendar_invitations')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: `Failed to create invitation: ${error.message}`
        };
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      return {
        success: false,
        error: `Error creating invitation: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async updateInvitationRSVP(
    invitationId: string,
    rsvpStatus: string,
    responseNote?: string
  ): Promise<CalendarOperationResult<CalendarInvitation>> {
    try {
      const { data, error } = await this.supabase
        .from('calendar_invitations')
        .update({
          rsvp_status: rsvpStatus,
          response_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...(responseNote && { message: responseNote })
        })
        .eq('id', invitationId)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: `Failed to update RSVP: ${error.message}`
        };
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      return {
        success: false,
        error: `Error updating RSVP: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Conflict management methods
   */
  async createConflict(
    conflictData: CalendarConflictInsert
  ): Promise<CalendarOperationResult<CalendarConflict>> {
    try {
      const insertData: CalendarConflictInsert = {
        ...conflictData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await this.supabase
        .from('calendar_conflicts')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: `Failed to create conflict: ${error.message}`
        };
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      return {
        success: false,
        error: `Error creating conflict: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async resolveConflict(
    conflictId: string,
    resolutionMethod: string
  ): Promise<CalendarOperationResult<boolean>> {
    try {
      const { error } = await this.supabase
        .from('calendar_conflicts')
        .update({
          is_resolved: true,
          resolved_at: new Date().toISOString(),
          resolution_method: resolutionMethod,
          updated_at: new Date().toISOString()
        })
        .eq('id', conflictId);

      if (error) {
        return {
          success: false,
          error: `Failed to resolve conflict: ${error.message}`
        };
      }

      return {
        success: true,
        data: true
      };
    } catch (error) {
      return {
        success: false,
        error: `Error resolving conflict: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * External calendar sync management
   */
  async createExternalSync(
    syncData: ExternalCalendarSyncInsert
  ): Promise<CalendarOperationResult<ExternalCalendarSync>> {
    try {
      const insertData: ExternalCalendarSyncInsert = {
        ...syncData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await this.supabase
        .from('external_calendar_sync')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: `Failed to create external sync: ${error.message}`
        };
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      return {
        success: false,
        error: `Error creating external sync: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async updateSyncStatus(
    syncId: string,
    status: string,
    errorMessage?: string
  ): Promise<CalendarOperationResult<boolean>> {
    try {
      const updateData: ExternalCalendarSyncUpdate = {
        sync_status: status,
        updated_at: new Date().toISOString(),
        last_sync_at: status === 'connected' ? new Date().toISOString() : undefined
      };

      if (errorMessage) {
        updateData.last_error = errorMessage;
        updateData.error_count = { increment: 1 } as any; // This would need proper handling in production
      }

      const { error } = await this.supabase
        .from('external_calendar_sync')
        .update(updateData)
        .eq('id', syncId);

      if (error) {
        return {
          success: false,
          error: `Failed to update sync status: ${error.message}`
        };
      }

      return {
        success: true,
        data: true
      };
    } catch (error) {
      return {
        success: false,
        error: `Error updating sync status: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Private helper methods
   */
  private async mapToEnhancedEvent(data: any): Promise<EnhancedCalendarEvent> {
    // Convert database row to EnhancedCalendarEvent
    return {
      id: data.id,
      userId: data.user_id,
      title: data.title,
      description: data.description,
      startTime: new Date(data.start_time),
      endTime: new Date(data.end_time),
      timezone: data.timezone,
      allDay: data.all_day,
      location: data.location,
      virtualMeetingUrl: data.virtual_meeting_url,
      recurrencePattern: data.recurrence_pattern ? JSON.parse(data.recurrence_pattern) : undefined,
      parentEventId: data.parent_event_id,
      originalStartTime: data.original_start_time ? new Date(data.original_start_time) : undefined,
      status: data.status,
      priority: data.priority,
      visibility: data.visibility,
      color: data.color,
      createdBy: data.created_by,
      externalCalendarId: data.external_calendar_id,
      externalEventId: data.external_event_id,
      syncStatus: data.sync_status,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      lastSyncAt: data.last_sync_at ? new Date(data.last_sync_at) : undefined,
      isRecurring: !!data.recurrence_pattern,
      isException: !!data.parent_event_id && !!data.original_start_time,
      // Additional fields would be populated from related data
      attendees: [], // Would be populated from invitations
      conflicts: [] // Would be populated from conflicts
    };
  }

  private applyFilters(query: any, filter: CalendarFilter): any {
    if (filter.startDate) {
      query = query.gte('start_time', filter.startDate.toISOString());
    }

    if (filter.endDate) {
      query = query.lte('end_time', filter.endDate.toISOString());
    }

    if (filter.status) {
      query = query.in('status', filter.status);
    }

    if (filter.priority) {
      query = query.in('priority', filter.priority);
    }

    if (filter.visibility) {
      query = query.in('visibility', filter.visibility);
    }

    if (filter.searchQuery) {
      query = query.or(
        `title.ilike.%${filter.searchQuery}%,description.ilike.%${filter.searchQuery}%`
      );
    }

    if (filter.hasConflicts !== undefined) {
      // This would require a more complex join query in production
    }

    if (filter.isRecurring !== undefined) {
      if (filter.isRecurring) {
        query = query.not('recurrence_pattern', 'is', null);
      } else {
        query = query.is('recurrence_pattern', null);
      }
    }

    if (filter.externalCalendarId) {
      query = query.eq('external_calendar_id', filter.externalCalendarId);
    }

    return query;
  }

  private async cleanupEventRelations(eventId: string): Promise<void> {
    // Delete related invitations
    await this.supabase
      .from('calendar_invitations')
      .delete()
      .eq('event_id', eventId);

    // Delete related conflicts
    await this.supabase
      .from('calendar_conflicts')
      .delete()
      .or(`event_id.eq.${eventId},conflicting_event_id.eq.${eventId}`);
  }

  private generateRecurringInstances(
    event: EnhancedCalendarEvent,
    startDate: Date,
    endDate: Date
  ): EnhancedCalendarEvent[] {
    if (!event.recurrencePattern) return [];

    const instances: EnhancedCalendarEvent[] = [];
    const pattern = event.recurrencePattern;
    const eventDuration = event.endTime.getTime() - event.startTime.getTime();

    let currentDate = new Date(event.startTime);
    let count = 0;
    const maxInstances = 1000; // Safety limit

    while (currentDate <= endDate && count < maxInstances) {
      // Check if this instance should be generated
      if (currentDate >= startDate && currentDate >= event.startTime) {
        // Check for exceptions
        const isException = pattern.exceptions?.some(exception =>
          exception.toDateString() === currentDate.toDateString()
        );

        if (!isException) {
          const instanceEndTime = new Date(currentDate.getTime() + eventDuration);

          instances.push({
            ...event,
            id: `${event.id}_${currentDate.toISOString()}`,
            startTime: new Date(currentDate),
            endTime: instanceEndTime,
            parentEventId: event.id,
            originalStartTime: new Date(currentDate),
            isRecurring: false,
            isException: false
          });
        }
      }

      // Calculate next occurrence
      currentDate = this.calculateNextOccurrence(currentDate, pattern);
      count++;

      // Check count limit
      if (pattern.count && count >= pattern.count) break;

      // Check until date
      if (pattern.until && currentDate > pattern.until) break;
    }

    return instances;
  }

  private calculateNextOccurrence(date: Date, pattern: RecurrencePattern): Date {
    const nextDate = new Date(date);

    switch (pattern.frequency) {
      case 'daily':
        nextDate.setDate(nextDate.getDate() + pattern.interval);
        break;

      case 'weekly':
        nextDate.setDate(nextDate.getDate() + (7 * pattern.interval));
        break;

      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + pattern.interval);
        break;

      case 'yearly':
        nextDate.setFullYear(nextDate.getFullYear() + pattern.interval);
        break;

      default:
        nextDate.setDate(nextDate.getDate() + 1); // Fallback to daily
    }

    return nextDate;
  }
}

/**
 * Factory function to create CalendarDatabase instance
 */
export async function createCalendarDatabase(): Promise<CalendarDatabase> {
  const supabase = await createServerSupabaseClient();
  return new CalendarDatabase(supabase);
}

/**
 * Helper function for client-side usage (with browser client)
 */
export function createClientCalendarDatabase(supabase: any): CalendarDatabase {
  return new CalendarDatabase(supabase);
}

export default CalendarDatabase;