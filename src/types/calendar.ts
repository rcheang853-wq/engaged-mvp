// Calendar-specific types and interfaces for comprehensive calendar system
import { Database } from './database';

// Base calendar event types
export type CalendarEvent = Database['public']['Tables']['user_calendar_events']['Row'];
export type CalendarEventInsert = Database['public']['Tables']['user_calendar_events']['Insert'];
export type CalendarEventUpdate = Database['public']['Tables']['user_calendar_events']['Update'];

export type CalendarInvitation = Database['public']['Tables']['calendar_invitations']['Row'];
export type CalendarInvitationInsert = Database['public']['Tables']['calendar_invitations']['Insert'];
export type CalendarInvitationUpdate = Database['public']['Tables']['calendar_invitations']['Update'];

export type ExternalCalendarSync = Database['public']['Tables']['external_calendar_sync']['Row'];
export type ExternalCalendarSyncInsert = Database['public']['Tables']['external_calendar_sync']['Insert'];
export type ExternalCalendarSyncUpdate = Database['public']['Tables']['external_calendar_sync']['Update'];

export type CalendarConflict = Database['public']['Tables']['calendar_conflicts']['Row'];
export type CalendarConflictInsert = Database['public']['Tables']['calendar_conflicts']['Insert'];
export type CalendarConflictUpdate = Database['public']['Tables']['calendar_conflicts']['Update'];

// Recurrence pattern types
export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface RecurrencePattern {
  frequency: RecurrenceFrequency;
  interval: number; // Every X days/weeks/months/years
  byWeekDay?: number[]; // 0-6, where 0 = Sunday
  byMonthDay?: number[]; // 1-31
  byMonth?: number[]; // 1-12
  count?: number; // Number of occurrences
  until?: Date; // End date for recurrence
  exceptions?: Date[]; // Dates to exclude from recurrence
}

// Calendar view types
export type CalendarViewType = 'month' | 'week' | 'day' | 'agenda' | 'year';

export interface CalendarViewConfig {
  type: CalendarViewType;
  startDate: Date;
  endDate: Date;
  timezone: string;
  showWeekends: boolean;
  workingHours?: {
    start: string; // HH:MM format
    end: string; // HH:MM format
  };
  firstDayOfWeek: number; // 0-6, where 0 = Sunday
}

// Event status and RSVP types
export type EventStatus = 'confirmed' | 'tentative' | 'cancelled' | 'draft';
export type RSVPStatus = 'accepted' | 'declined' | 'tentative' | 'pending' | 'no_response';
export type InvitationStatus = 'pending' | 'sent' | 'delivered' | 'failed';

// Event priority and visibility
export type EventPriority = 'low' | 'normal' | 'high' | 'urgent';
export type EventVisibility = 'private' | 'public' | 'confidential';

// External calendar types
export type ExternalCalendarProvider = 'google' | 'outlook' | 'apple' | 'ical';
export type SyncStatus = 'connected' | 'syncing' | 'error' | 'disconnected' | 'pending';

// Conflict detection types
export type ConflictType = 'overlap' | 'travel_time' | 'resource' | 'availability';
export type ConflictSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ConflictDetails {
  type: ConflictType;
  severity: ConflictSeverity;
  conflictingEventId: string;
  conflictingEventTitle: string;
  overlapMinutes: number;
  suggestions: ConflictResolutionSuggestion[];
}

export interface ConflictResolutionSuggestion {
  type: 'reschedule' | 'shorten' | 'cancel' | 'ignore';
  description: string;
  newStartTime?: Date;
  newEndTime?: Date;
  impactScore: number; // 0-100, higher = more disruptive
}

// Calendar event with enhanced properties
export interface EnhancedCalendarEvent {
  id: string;
  userId: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  timezone: string;
  allDay: boolean;
  location?: string;
  virtualMeetingUrl?: string;

  // Recurrence
  recurrencePattern?: RecurrencePattern;
  parentEventId?: string; // For recurring event instances
  originalStartTime?: Date; // For modified recurring instances

  // Status and metadata
  status: EventStatus;
  priority: EventPriority;
  visibility: EventVisibility;
  color?: string; // Hex color for display

  // Collaboration
  createdBy: string;
  attendees?: EventAttendee[];
  organizer?: EventOrganizer;

  // External integration
  externalCalendarId?: string;
  externalEventId?: string;
  syncStatus?: SyncStatus;

  // Reminders and notifications
  reminders?: EventReminder[];

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastSyncAt?: Date;

  // Computed properties
  conflicts?: ConflictDetails[];
  isRecurring: boolean;
  isException: boolean; // Modified instance of recurring event
}

export interface EventAttendee {
  id: string;
  userId?: string; // If they're a platform user
  email: string;
  name: string;
  rsvpStatus: RSVPStatus;
  isOptional: boolean;
  responseAt?: Date;
  note?: string;
}

export interface EventOrganizer {
  userId: string;
  name: string;
  email: string;
}

export interface EventReminder {
  id: string;
  type: 'email' | 'push' | 'sms';
  minutesBefore: number;
  sent: boolean;
  sentAt?: Date;
}

// Calendar invitation types
export interface CalendarInvitationDetails {
  id: string;
  eventId: string;
  inviterId: string;
  inviterName: string;
  inviteeEmail: string;
  inviteeName?: string;
  inviteeUserId?: string; // If they're a platform user
  status: InvitationStatus;
  rsvpStatus: RSVPStatus;
  message?: string;
  sentAt: Date;
  responseAt?: Date;
  expiresAt?: Date;
  remindersSent: number;
  lastReminderAt?: Date;
}

// External calendar sync configuration
export interface ExternalCalendarSyncConfig {
  id: string;
  userId: string;
  provider: ExternalCalendarProvider;
  providerCalendarId: string;
  calendarName: string;
  syncDirection: 'import' | 'export' | 'bidirectional';
  syncStatus: SyncStatus;
  accessToken?: string; // Encrypted
  refreshToken?: string; // Encrypted
  lastSyncAt?: Date;
  nextSyncAt?: Date;
  syncInterval: number; // Minutes
  errorCount: number;
  lastError?: string;
  settings: {
    syncEvents: boolean;
    syncReminders: boolean;
    syncAttendees: boolean;
    conflictResolution: 'local_wins' | 'remote_wins' | 'manual';
  };
  createdAt: Date;
  updatedAt: Date;
}

// Timezone handling types
export interface TimezoneInfo {
  timezone: string;
  offset: number; // Minutes from UTC
  abbreviation: string;
  isDst: boolean;
  dstStart?: Date;
  dstEnd?: Date;
}

export interface MultiTimezoneEvent {
  event: EnhancedCalendarEvent;
  timezones: {
    [timezone: string]: {
      startTime: Date;
      endTime: Date;
      displayTime: string;
      isNextDay: boolean;
    };
  };
}

// Calendar operation results
export interface CalendarOperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  conflicts?: ConflictDetails[];
  warnings?: string[];
}

export interface CalendarEventListResult {
  events: EnhancedCalendarEvent[];
  totalCount: number;
  hasMore: boolean;
  nextCursor?: string;
  conflicts?: ConflictDetails[];
}

// Calendar filter and search types
export interface CalendarFilter {
  startDate?: Date;
  endDate?: Date;
  timezone?: string;
  status?: EventStatus[];
  priority?: EventPriority[];
  visibility?: EventVisibility[];
  attendeeEmail?: string;
  searchQuery?: string;
  categoryIds?: string[];
  hasConflicts?: boolean;
  isRecurring?: boolean;
  externalCalendarId?: string;
}

export interface CalendarPagination {
  limit: number;
  cursor?: string;
  orderBy: 'start_time' | 'created_at' | 'updated_at';
  orderDirection: 'asc' | 'desc';
}

// Calendar performance optimization types
export interface CalendarCacheKey {
  userId: string;
  viewType: CalendarViewType;
  startDate: string; // ISO date
  endDate: string; // ISO date
  timezone: string;
  filters?: string; // Serialized filter hash
}

export interface CalendarMetrics {
  totalEvents: number;
  conflictCount: number;
  upcomingEvents: number;
  overdueEvents: number;
  syncStatus: {
    [provider in ExternalCalendarProvider]?: {
      connected: boolean;
      lastSync: Date;
      errorCount: number;
    };
  };
}

// Error types specific to calendar operations
export interface CalendarError extends Error {
  code: 'INVALID_TIMEZONE' | 'CONFLICT_DETECTED' | 'EXTERNAL_SYNC_FAILED' |
        'INVALID_RECURRENCE' | 'PERMISSION_DENIED' | 'EVENT_NOT_FOUND' |
        'INVALID_DATE_RANGE' | 'SYNC_IN_PROGRESS' | 'RATE_LIMIT_EXCEEDED';
  details?: any;
  retryAfter?: number; // Seconds to wait before retry
}

// API request/response types
export interface CreateCalendarEventRequest {
  title: string;
  description?: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
  timezone: string;
  allDay?: boolean;
  location?: string;
  virtualMeetingUrl?: string;
  recurrencePattern?: RecurrencePattern;
  priority?: EventPriority;
  visibility?: EventVisibility;
  color?: string;
  attendees?: Omit<EventAttendee, 'id' | 'rsvpStatus' | 'responseAt'>[];
  reminders?: Omit<EventReminder, 'id' | 'sent' | 'sentAt'>[];
  checkConflicts?: boolean;
}

export interface UpdateCalendarEventRequest extends Partial<CreateCalendarEventRequest> {
  updateRecurring?: 'this_only' | 'this_and_future' | 'all_instances';
  conflictResolution?: 'ignore' | 'auto_resolve' | 'manual';
}

export interface CalendarEventsListRequest {
  startDate?: string; // ISO string
  endDate?: string; // ISO string
  timezone?: string;
  filter?: Partial<CalendarFilter>;
  pagination?: Partial<CalendarPagination>;
  includeConflicts?: boolean;
  includeDeleted?: boolean;
}

export interface CalendarSyncRequest {
  provider: ExternalCalendarProvider;
  calendarId?: string;
  accessToken?: string;
  syncDirection?: 'import' | 'export' | 'bidirectional';
  conflictResolution?: 'local_wins' | 'remote_wins' | 'manual';
}

// Export all types for easy import
export type {
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
  CalendarConflictUpdate
};