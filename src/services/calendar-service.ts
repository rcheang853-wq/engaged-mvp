// Core calendar business logic service
import {
  EnhancedCalendarEvent,
  CalendarEventInsert,
  CalendarEventUpdate,
  CreateCalendarEventRequest,
  UpdateCalendarEventRequest,
  CalendarEventsListRequest,
  CalendarFilter,
  CalendarPagination,
  CalendarEventListResult,
  CalendarOperationResult,
  ConflictDetails,
  RecurrencePattern,
  CalendarMetrics,
  EventStatus,
  EventPriority,
  EventVisibility,
  CalendarError
} from '@/types/calendar';
import { createCalendarDatabase, CalendarDatabase } from '@/lib/supabase/calendar';
import { detectEventConflicts, validateEventScheduling, optimizeEventScheduling } from '@/utils/conflict-detection';
import { isValidTimezone, getUserTimezone, convertTimezone } from '@/utils/timezone-handling';

/**
 * Calendar Service - Core business logic for calendar operations
 */
export class CalendarService {
  private db: CalendarDatabase | null = null;

  private async getDatabase(): Promise<CalendarDatabase> {
    if (!this.db) {
      this.db = await createCalendarDatabase();
    }
    return this.db;
  }

  /**
   * Create a new calendar event with validation and conflict detection
   */
  async createEvent(
    request: CreateCalendarEventRequest,
    userId: string
  ): Promise<CalendarOperationResult<EnhancedCalendarEvent>> {
    try {
      // Validate input
      const validationResult = this.validateEventRequest(request);
      if (!validationResult.success) {
        return validationResult;
      }

      // Convert request to database format
      const eventData = this.mapRequestToInsert(request, userId);

      // Create temporary event object for conflict detection
      const tempEvent = this.mapInsertToEnhanced(eventData, userId);

      let conflicts: ConflictDetails[] = [];

      // Check for conflicts if requested
      if (request.checkConflicts) {
        const db = await this.getDatabase();
        const existingEventsResult = await db.getEventsInRange(
          userId,
          tempEvent.startTime,
          tempEvent.endTime
        );

        if (existingEventsResult.success && existingEventsResult.data) {
          conflicts = detectEventConflicts(tempEvent, existingEventsResult.data);

          // If there are critical conflicts, return them
          const criticalConflicts = conflicts.filter(c => c.severity === 'critical');
          if (criticalConflicts.length > 0) {
            return {
              success: false,
              error: 'Critical conflicts detected',
              conflicts: criticalConflicts
            };
          }
        }
      }

      // Create the event
      const db = await this.getDatabase();
      const result = await db.createEvent(eventData, userId);

      if (result.success && result.data) {
        // Store conflicts if any were detected
        if (conflicts.length > 0) {
          await this.storeConflicts(result.data.id, userId, conflicts);
          result.data.conflicts = conflicts;
        }

        // Generate recurring instances if needed
        if (request.recurrencePattern) {
          await this.generateRecurringInstances(result.data, request.recurrencePattern, userId);
        }
      }

      return {
        ...result,
        conflicts: conflicts.length > 0 ? conflicts : undefined
      };
    } catch (error) {
      return this.handleError(error, 'creating event');
    }
  }

  /**
   * Update an existing calendar event
   */
  async updateEvent(
    eventId: string,
    request: UpdateCalendarEventRequest,
    userId: string
  ): Promise<CalendarOperationResult<EnhancedCalendarEvent>> {
    try {
      const db = await this.getDatabase();

      // Get existing event
      const existingResult = await db.getEvent(eventId, userId);
      if (!existingResult.success || !existingResult.data) {
        return {
          success: false,
          error: 'Event not found or access denied'
        };
      }

      const existingEvent = existingResult.data;

      // Validate update request
      const validationResult = this.validateUpdateRequest(request, existingEvent);
      if (!validationResult.success) {
        return validationResult;
      }

      // Handle recurring event updates
      if (existingEvent.isRecurring && request.updateRecurring) {
        return await this.updateRecurringEvent(eventId, request, userId);
      }

      // Convert request to database format
      const updateData = this.mapUpdateRequestToUpdate(request);

      // Check for conflicts if time/date changed
      let conflicts: ConflictDetails[] = [];
      if (this.isTimeChanged(request, existingEvent) && request.conflictResolution !== 'ignore') {
        const updatedEvent = { ...existingEvent, ...updateData } as EnhancedCalendarEvent;
        const existingEventsResult = await db.getEventsInRange(
          userId,
          updatedEvent.startTime,
          updatedEvent.endTime
        );

        if (existingEventsResult.success && existingEventsResult.data) {
          const otherEvents = existingEventsResult.data.filter(e => e.id !== eventId);
          conflicts = detectEventConflicts(updatedEvent, otherEvents);

          if (request.conflictResolution === 'auto_resolve') {
            // Attempt to auto-resolve conflicts
            const optimizedEvents = optimizeEventScheduling([updatedEvent, ...otherEvents]);
            const optimizedEvent = optimizedEvents.find(e => e.id === eventId);
            if (optimizedEvent) {
              updateData.start_time = optimizedEvent.startTime.toISOString();
              updateData.end_time = optimizedEvent.endTime.toISOString();
            }
          } else if (conflicts.some(c => c.severity === 'critical')) {
            return {
              success: false,
              error: 'Critical conflicts detected',
              conflicts
            };
          }
        }
      }

      // Update the event
      const result = await db.updateEvent(eventId, updateData, userId);

      if (result.success && result.data) {
        // Update conflicts
        if (conflicts.length > 0) {
          await this.storeConflicts(result.data.id, userId, conflicts);
          result.data.conflicts = conflicts;
        } else {
          // Clear existing conflicts if time didn't change or no conflicts found
          await this.clearEventConflicts(eventId);
        }
      }

      return {
        ...result,
        conflicts: conflicts.length > 0 ? conflicts : undefined
      };
    } catch (error) {
      return this.handleError(error, 'updating event');
    }
  }

  /**
   * Delete a calendar event
   */
  async deleteEvent(
    eventId: string,
    userId: string,
    deleteRecurring: 'this_only' | 'this_and_future' | 'all_instances' = 'this_only'
  ): Promise<CalendarOperationResult<boolean>> {
    try {
      const db = await this.getDatabase();

      // Get the event to check if it's recurring
      const eventResult = await db.getEvent(eventId, userId);
      if (!eventResult.success || !eventResult.data) {
        return {
          success: false,
          error: 'Event not found or access denied'
        };
      }

      const event = eventResult.data;

      // Handle recurring event deletion
      if (event.isRecurring && deleteRecurring !== 'this_only') {
        return await this.deleteRecurringEvents(event, deleteRecurring, userId);
      }

      // Delete single event
      return await db.deleteEvent(eventId, userId, true); // Soft delete by default
    } catch (error) {
      return this.handleError(error, 'deleting event');
    }
  }

  /**
   * Get a single event
   */
  async getEvent(
    eventId: string,
    userId: string
  ): Promise<CalendarOperationResult<EnhancedCalendarEvent>> {
    try {
      const db = await this.getDatabase();
      return await db.getEvent(eventId, userId);
    } catch (error) {
      return this.handleError(error, 'getting event');
    }
  }

  /**
   * List calendar events with filtering and pagination
   */
  async listEvents(
    request: CalendarEventsListRequest,
    userId: string
  ): Promise<CalendarOperationResult<CalendarEventListResult>> {
    try {
      const db = await this.getDatabase();

      // Parse and validate request
      const filter: CalendarFilter = {
        ...request.filter,
        startDate: request.startDate ? new Date(request.startDate) : undefined,
        endDate: request.endDate ? new Date(request.endDate) : undefined,
        timezone: request.timezone || getUserTimezone()
      };

      const pagination: CalendarPagination = {
        limit: Math.min(request.pagination?.limit || 50, 200), // Max 200 events
        cursor: request.pagination?.cursor,
        orderBy: request.pagination?.orderBy || 'start_time',
        orderDirection: request.pagination?.orderDirection || 'asc'
      };

      // Get events
      const result = await db.listEvents(userId, filter, pagination);

      if (result.success && result.data) {
        // Add conflict information if requested
        if (request.includeConflicts) {
          const events = result.data.events;
          const allConflicts: ConflictDetails[] = [];

          for (let i = 0; i < events.length; i++) {
            const event = events[i];
            const otherEvents = events.filter((_, index) => index !== i);
            const eventConflicts = detectEventConflicts(event, otherEvents);

            if (eventConflicts.length > 0) {
              event.conflicts = eventConflicts;
              allConflicts.push(...eventConflicts);
            }
          }

          result.data.conflicts = allConflicts;
        }
      }

      return result;
    } catch (error) {
      return this.handleError(error, 'listing events');
    }
  }

  /**
   * Get events in a specific date range (optimized for calendar views)
   */
  async getEventsInRange(
    userId: string,
    startDate: Date,
    endDate: Date,
    timezone: string = getUserTimezone(),
    includeConflicts: boolean = false
  ): Promise<CalendarOperationResult<EnhancedCalendarEvent[]>> {
    try {
      const db = await this.getDatabase();

      // Convert dates to user's timezone if needed
      const adjustedStartDate = timezone !== getUserTimezone()
        ? convertTimezone(startDate, getUserTimezone(), timezone)
        : startDate;

      const adjustedEndDate = timezone !== getUserTimezone()
        ? convertTimezone(endDate, getUserTimezone(), timezone)
        : endDate;

      const result = await db.getEventsInRange(userId, adjustedStartDate, adjustedEndDate, true);

      if (result.success && result.data && includeConflicts) {
        const events = result.data;

        for (let i = 0; i < events.length; i++) {
          const event = events[i];
          const otherEvents = events.filter((_, index) => index !== i);
          const eventConflicts = detectEventConflicts(event, otherEvents);

          if (eventConflicts.length > 0) {
            event.conflicts = eventConflicts;
          }
        }
      }

      return result;
    } catch (error) {
      return this.handleError(error, 'getting events in range');
    }
  }

  /**
   * Get calendar metrics for a user
   */
  async getCalendarMetrics(
    userId: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<CalendarOperationResult<CalendarMetrics>> {
    try {
      const db = await this.getDatabase();

      const startDate = dateRange?.start || new Date();
      const endDate = dateRange?.end || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

      const eventsResult = await db.getEventsInRange(userId, startDate, endDate, true);

      if (!eventsResult.success || !eventsResult.data) {
        return {
          success: false,
          error: 'Failed to get calendar metrics'
        };
      }

      const events = eventsResult.data;
      const now = new Date();

      // Calculate metrics
      const metrics: CalendarMetrics = {
        totalEvents: events.length,
        conflictCount: 0,
        upcomingEvents: events.filter(e => e.startTime > now && e.status === 'confirmed').length,
        overdueEvents: events.filter(e => e.endTime < now && e.status === 'confirmed').length,
        syncStatus: {}
      };

      // Count conflicts
      for (const event of events) {
        if (event.conflicts && event.conflicts.length > 0) {
          metrics.conflictCount += event.conflicts.length;
        }
      }

      return {
        success: true,
        data: metrics
      };
    } catch (error) {
      return this.handleError(error, 'getting calendar metrics');
    }
  }

  /**
   * Search calendar events
   */
  async searchEvents(
    userId: string,
    query: string,
    filters?: Partial<CalendarFilter>
  ): Promise<CalendarOperationResult<EnhancedCalendarEvent[]>> {
    try {
      const filter: CalendarFilter = {
        ...filters,
        searchQuery: query
      };

      const listResult = await this.listEvents({
        filter,
        pagination: { limit: 100, orderBy: 'start_time', orderDirection: 'asc' }
      }, userId);

      if (!listResult.success) {
        return listResult;
      }

      return {
        success: true,
        data: listResult.data?.events || []
      };
    } catch (error) {
      return this.handleError(error, 'searching events');
    }
  }

  /**
   * Validate business rules for event scheduling
   */
  async validateEventBusinessRules(
    event: EnhancedCalendarEvent,
    userId: string
  ): Promise<CalendarOperationResult<boolean>> {
    try {
      const db = await this.getDatabase();

      // Get existing events for the same day
      const dayStart = new Date(event.startTime);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(event.startTime);
      dayEnd.setHours(23, 59, 59, 999);

      const existingEventsResult = await db.getEventsInRange(userId, dayStart, dayEnd);

      if (!existingEventsResult.success) {
        return existingEventsResult;
      }

      const existingEvents = existingEventsResult.data || [];

      // Define business rules
      const businessRules = {
        maxEventsPerDay: 10,
        maxConcurrentEvents: 1,
        workingHours: { start: '08:00', end: '18:00' },
        allowWeekends: true,
        minEventGap: 15 // minutes
      };

      return validateEventScheduling(event, existingEvents, businessRules);
    } catch (error) {
      return this.handleError(error, 'validating business rules');
    }
  }

  /**
   * Private helper methods
   */
  private validateEventRequest(request: CreateCalendarEventRequest): CalendarOperationResult<boolean> {
    const errors: string[] = [];

    // Required fields
    if (!request.title?.trim()) {
      errors.push('Title is required');
    }

    if (!request.startTime || !request.endTime) {
      errors.push('Start time and end time are required');
    }

    // Validate dates
    if (request.startTime && request.endTime) {
      const startTime = new Date(request.startTime);
      const endTime = new Date(request.endTime);

      if (startTime >= endTime) {
        errors.push('End time must be after start time');
      }

      if (startTime < new Date()) {
        errors.push('Event cannot be scheduled in the past');
      }

      // Validate event duration (max 24 hours)
      const durationHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
      if (durationHours > 24) {
        errors.push('Event duration cannot exceed 24 hours');
      }
    }

    // Validate timezone
    if (request.timezone && !isValidTimezone(request.timezone)) {
      errors.push('Invalid timezone specified');
    }

    // Validate recurrence pattern
    if (request.recurrencePattern) {
      const validationResult = this.validateRecurrencePattern(request.recurrencePattern);
      if (!validationResult.success) {
        errors.push(validationResult.error || 'Invalid recurrence pattern');
      }
    }

    // Validate priority and visibility
    if (request.priority && !['low', 'normal', 'high', 'urgent'].includes(request.priority)) {
      errors.push('Invalid priority value');
    }

    if (request.visibility && !['private', 'public', 'confidential'].includes(request.visibility)) {
      errors.push('Invalid visibility value');
    }

    return {
      success: errors.length === 0,
      data: errors.length === 0,
      error: errors.length > 0 ? errors.join('; ') : undefined
    };
  }

  private validateUpdateRequest(
    request: UpdateCalendarEventRequest,
    existingEvent: EnhancedCalendarEvent
  ): CalendarOperationResult<boolean> {
    const errors: string[] = [];

    // Validate dates if provided
    if (request.startTime || request.endTime) {
      const startTime = request.startTime ? new Date(request.startTime) : existingEvent.startTime;
      const endTime = request.endTime ? new Date(request.endTime) : existingEvent.endTime;

      if (startTime >= endTime) {
        errors.push('End time must be after start time');
      }

      // Allow past events to be updated (for corrections)
      // if (startTime < new Date()) {
      //   errors.push('Event cannot be scheduled in the past');
      // }
    }

    // Validate timezone
    if (request.timezone && !isValidTimezone(request.timezone)) {
      errors.push('Invalid timezone specified');
    }

    return {
      success: errors.length === 0,
      data: errors.length === 0,
      error: errors.length > 0 ? errors.join('; ') : undefined
    };
  }

  private validateRecurrencePattern(pattern: RecurrencePattern): CalendarOperationResult<boolean> {
    const errors: string[] = [];

    if (!['daily', 'weekly', 'monthly', 'yearly'].includes(pattern.frequency)) {
      errors.push('Invalid recurrence frequency');
    }

    if (pattern.interval < 1 || pattern.interval > 999) {
      errors.push('Recurrence interval must be between 1 and 999');
    }

    if (pattern.count && (pattern.count < 1 || pattern.count > 1000)) {
      errors.push('Recurrence count must be between 1 and 1000');
    }

    if (pattern.until && pattern.until < new Date()) {
      errors.push('Recurrence end date cannot be in the past');
    }

    return {
      success: errors.length === 0,
      data: errors.length === 0,
      error: errors.length > 0 ? errors.join('; ') : undefined
    };
  }

  private mapRequestToInsert(request: CreateCalendarEventRequest, userId: string): CalendarEventInsert {
    return {
      user_id: userId,
      title: request.title,
      description: request.description || null,
      start_time: request.startTime,
      end_time: request.endTime,
      timezone: request.timezone || getUserTimezone(),
      all_day: request.allDay || false,
      location: request.location || null,
      virtual_meeting_url: request.virtualMeetingUrl || null,
      recurrence_pattern: request.recurrencePattern ? JSON.stringify(request.recurrencePattern) : null,
      status: 'confirmed',
      priority: request.priority || 'normal',
      visibility: request.visibility || 'private',
      color: request.color || null,
      created_by: userId
    };
  }

  private mapUpdateRequestToUpdate(request: UpdateCalendarEventRequest): CalendarEventUpdate {
    const update: CalendarEventUpdate = {};

    if (request.title !== undefined) update.title = request.title;
    if (request.description !== undefined) update.description = request.description;
    if (request.startTime !== undefined) update.start_time = request.startTime;
    if (request.endTime !== undefined) update.end_time = request.endTime;
    if (request.timezone !== undefined) update.timezone = request.timezone;
    if (request.allDay !== undefined) update.all_day = request.allDay;
    if (request.location !== undefined) update.location = request.location;
    if (request.virtualMeetingUrl !== undefined) update.virtual_meeting_url = request.virtualMeetingUrl;
    if (request.recurrencePattern !== undefined) {
      update.recurrence_pattern = request.recurrencePattern ? JSON.stringify(request.recurrencePattern) : null;
    }
    if (request.priority !== undefined) update.priority = request.priority;
    if (request.visibility !== undefined) update.visibility = request.visibility;
    if (request.color !== undefined) update.color = request.color;

    return update;
  }

  private mapInsertToEnhanced(insert: CalendarEventInsert, userId: string): EnhancedCalendarEvent {
    return {
      id: 'temp-id',
      userId,
      title: insert.title,
      description: insert.description,
      startTime: new Date(insert.start_time),
      endTime: new Date(insert.end_time),
      timezone: insert.timezone || getUserTimezone(),
      allDay: insert.all_day || false,
      location: insert.location,
      virtualMeetingUrl: insert.virtual_meeting_url,
      recurrencePattern: insert.recurrence_pattern ? JSON.parse(insert.recurrence_pattern) : undefined,
      parentEventId: insert.parent_event_id,
      originalStartTime: insert.original_start_time ? new Date(insert.original_start_time) : undefined,
      status: insert.status as EventStatus || 'confirmed',
      priority: insert.priority as EventPriority || 'normal',
      visibility: insert.visibility as EventVisibility || 'private',
      color: insert.color,
      createdBy: insert.created_by,
      externalCalendarId: insert.external_calendar_id,
      externalEventId: insert.external_event_id,
      syncStatus: insert.sync_status as any,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSyncAt: insert.last_sync_at ? new Date(insert.last_sync_at) : undefined,
      isRecurring: !!insert.recurrence_pattern,
      isException: !!insert.parent_event_id && !!insert.original_start_time
    };
  }

  private isTimeChanged(request: UpdateCalendarEventRequest, existingEvent: EnhancedCalendarEvent): boolean {
    return (request.startTime && new Date(request.startTime).getTime() !== existingEvent.startTime.getTime()) ||
           (request.endTime && new Date(request.endTime).getTime() !== existingEvent.endTime.getTime());
  }

  private async storeConflicts(eventId: string, userId: string, conflicts: ConflictDetails[]): Promise<void> {
    try {
      const db = await this.getDatabase();

      for (const conflict of conflicts) {
        await db.createConflict({
          user_id: userId,
          event_id: eventId,
          conflicting_event_id: conflict.conflictingEventId,
          conflict_type: conflict.type,
          severity: conflict.severity,
          overlap_minutes: conflict.overlapMinutes,
          resolution_suggestions: JSON.stringify(conflict.suggestions),
          is_resolved: false
        });
      }
    } catch (error) {
      console.error('Error storing conflicts:', error);
      // Don't fail the main operation for conflict storage errors
    }
  }

  private async clearEventConflicts(eventId: string): Promise<void> {
    try {
      const db = await this.getDatabase();
      // This would need to be implemented in the database layer
      // await db.clearEventConflicts(eventId);
    } catch (error) {
      console.error('Error clearing conflicts:', error);
    }
  }

  private async generateRecurringInstances(
    parentEvent: EnhancedCalendarEvent,
    pattern: RecurrencePattern,
    userId: string
  ): Promise<void> {
    // This is a simplified implementation
    // In production, you'd want more sophisticated recurring event handling
    try {
      const db = await this.getDatabase();
      const instances: CalendarEventInsert[] = [];

      // Generate up to 100 instances in the next year
      const endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + 1);

      const currentDate = new Date(parentEvent.startTime);
      let count = 0;

      while (currentDate <= endDate && count < 100) {
        if (pattern.count && count >= pattern.count) break;
        if (pattern.until && currentDate > pattern.until) break;

        // Check for exceptions
        const isException = pattern.exceptions?.some(exception =>
          exception.toDateString() === currentDate.toDateString()
        );

        if (!isException && currentDate > parentEvent.startTime) {
          const eventDuration = parentEvent.endTime.getTime() - parentEvent.startTime.getTime();
          const instanceEnd = new Date(currentDate.getTime() + eventDuration);

          instances.push({
            user_id: userId,
            title: parentEvent.title,
            description: parentEvent.description,
            start_time: currentDate.toISOString(),
            end_time: instanceEnd.toISOString(),
            timezone: parentEvent.timezone,
            all_day: parentEvent.allDay,
            location: parentEvent.location,
            virtual_meeting_url: parentEvent.virtualMeetingUrl,
            parent_event_id: parentEvent.id,
            original_start_time: currentDate.toISOString(),
            status: parentEvent.status,
            priority: parentEvent.priority,
            visibility: parentEvent.visibility,
            color: parentEvent.color,
            created_by: userId
          });
        }

        // Calculate next occurrence
        switch (pattern.frequency) {
          case 'daily':
            currentDate.setDate(currentDate.getDate() + pattern.interval);
            break;
          case 'weekly':
            currentDate.setDate(currentDate.getDate() + (7 * pattern.interval));
            break;
          case 'monthly':
            currentDate.setMonth(currentDate.getMonth() + pattern.interval);
            break;
          case 'yearly':
            currentDate.setFullYear(currentDate.getFullYear() + pattern.interval);
            break;
        }

        count++;
      }

      if (instances.length > 0) {
        await db.createBatchEvents(instances, userId);
      }
    } catch (error) {
      console.error('Error generating recurring instances:', error);
      // Don't fail the main operation
    }
  }

  private async updateRecurringEvent(
    eventId: string,
    request: UpdateCalendarEventRequest,
    userId: string
  ): Promise<CalendarOperationResult<EnhancedCalendarEvent>> {
    // Simplified implementation for recurring event updates
    // In production, you'd need more sophisticated handling
    const db = await this.getDatabase();

    switch (request.updateRecurring) {
      case 'this_only':
        // Convert to exception by setting parent_event_id and original_start_time
        const updateData = this.mapUpdateRequestToUpdate(request);
        return await db.updateEvent(eventId, updateData, userId);

      case 'this_and_future':
        // Update this event and all future instances
        // This requires complex logic to handle recurring patterns
        throw new Error('Update this_and_future not yet implemented');

      case 'all_instances':
        // Update the parent event and all instances
        throw new Error('Update all_instances not yet implemented');

      default:
        return {
          success: false,
          error: 'Invalid updateRecurring value'
        };
    }
  }

  private async deleteRecurringEvents(
    event: EnhancedCalendarEvent,
    deleteType: 'this_and_future' | 'all_instances',
    userId: string
  ): Promise<CalendarOperationResult<boolean>> {
    // Simplified implementation
    const db = await this.getDatabase();

    if (deleteType === 'all_instances') {
      // Delete parent event and all instances
      // This would require finding all related events
      return await db.deleteEvent(event.id, userId, true);
    } else {
      // Delete this and future instances
      // This requires complex logic
      throw new Error('Delete this_and_future not yet implemented');
    }
  }

  /**
   * Get calendar metrics for analytics
   */
  async getCalendarMetrics(userId: string): Promise<CalendarOperationResult<any>> {
    try {
      const now = new Date();
      const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
      const endOfWeek = new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000);
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      // Get all events for the user
      const allEventsResult = await this.listEvents({
        filter: {},
        pagination: { limit: 1000, orderBy: 'start_time', orderDirection: 'asc' }
      }, userId);

      if (!allEventsResult.success || !allEventsResult.data) {
        throw new Error('Failed to fetch events for metrics');
      }

      const events = allEventsResult.data.events;

      // Calculate basic metrics
      const totalEvents = events.length;
      const upcomingEvents = events.filter(e => new Date(e.startTime) > now).length;
      const conflictCount = events.filter(e => e.conflicts && e.conflicts.length > 0).length;
      const overdueEvents = events.filter(e =>
        new Date(e.startTime) < now && e.status !== 'completed' && e.status !== 'cancelled'
      ).length;

      const eventsThisWeek = events.filter(e => {
        const eventDate = new Date(e.startTime);
        return eventDate >= startOfWeek && eventDate <= endOfWeek;
      }).length;

      const eventsThisMonth = events.filter(e => {
        const eventDate = new Date(e.startTime);
        return eventDate >= startOfMonth && eventDate <= endOfMonth;
      }).length;

      // Calculate priority distribution
      const eventsByPriority = {
        urgent: events.filter(e => e.priority === 'urgent').length,
        high: events.filter(e => e.priority === 'high').length,
        normal: events.filter(e => e.priority === 'normal').length,
        low: events.filter(e => e.priority === 'low').length
      };

      // Calculate status distribution
      const eventsByStatus = {
        confirmed: events.filter(e => e.status === 'confirmed').length,
        tentative: events.filter(e => e.status === 'tentative').length,
        cancelled: events.filter(e => e.status === 'cancelled').length,
        draft: events.filter(e => e.status === 'draft').length
      };

      const metrics = {
        totalEvents,
        upcomingEvents,
        conflictCount,
        overdueEvents,
        eventsThisWeek,
        eventsThisMonth,
        averageEventsPerDay: totalEvents > 0 ? Math.round((totalEvents / 30) * 10) / 10 : 0,
        mostActiveDay: 'Monday', // Simplified - could calculate actual
        eventsByPriority,
        eventsByStatus,
        eventsByType: {
          meeting: events.filter(e => e.title.toLowerCase().includes('meeting')).length,
          appointment: events.filter(e => e.title.toLowerCase().includes('appointment')).length,
          reminder: events.filter(e => e.title.toLowerCase().includes('reminder')).length,
          deadline: events.filter(e => e.title.toLowerCase().includes('deadline')).length,
          other: events.filter(e => !['meeting', 'appointment', 'reminder', 'deadline'].some(type =>
            e.title.toLowerCase().includes(type)
          )).length
        },
        timeBlockAnalysis: {
          busyHours: [], // Could implement hour-by-hour analysis
          freeHours: [],
          averageBusyHoursPerDay: 8
        },
        externalCalendarStats: {
          totalSynced: 0, // Would need to query external sync records
          lastSyncTime: null,
          syncErrors: 0
        }
      };

      return {
        success: true,
        data: metrics
      };
    } catch (error) {
      return {
        success: false,
        error: `Error calculating calendar metrics: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private handleError(error: unknown, operation: string): CalendarOperationResult<any> {
    console.error(`Error ${operation}:`, error);

    if (error instanceof Error) {
      const calendarError = error as CalendarError;
      return {
        success: false,
        error: calendarError.message,
        ...(calendarError.retryAfter && { retryAfter: calendarError.retryAfter })
      };
    }

    return {
      success: false,
      error: `Failed ${operation}: Unknown error`
    };
  }
}

// Export singleton instance
export const calendarService = new CalendarService();
export default calendarService;