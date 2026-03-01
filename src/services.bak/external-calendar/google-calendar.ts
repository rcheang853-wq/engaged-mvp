import {
  ExternalCalendarProvider,
  CalendarEvent,
  EnhancedCalendarEvent,
  CalendarOperationResult,
  ExternalCalendarSyncConfig
} from '@/types/calendar';

interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  location?: string;
  status: 'confirmed' | 'tentative' | 'cancelled';
  visibility?: 'default' | 'public' | 'private' | 'confidential';
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus: 'needsAction' | 'declined' | 'tentative' | 'accepted';
  }>;
  recurrence?: string[];
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{
      method: 'email' | 'popup';
      minutes: number;
    }>;
  };
  created: string;
  updated: string;
  htmlLink: string;
}

interface GoogleCalendarList {
  items: Array<{
    id: string;
    summary: string;
    description?: string;
    primary?: boolean;
    accessRole: 'owner' | 'reader' | 'writer' | 'freeBusyReader';
    selected?: boolean;
  }>;
}

interface GoogleCalendarResponse {
  items: GoogleCalendarEvent[];
  nextPageToken?: string;
}

export class GoogleCalendarService {
  private baseUrl = 'https://www.googleapis.com/calendar/v3';

  constructor(private accessToken: string) {}

  /**
   * Get user's calendar list
   */
  async getCalendarList(): Promise<CalendarOperationResult<GoogleCalendarList>> {
    try {
      const response = await fetch(`${this.baseUrl}/users/me/calendarList`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Google Calendar API error: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get events from a specific Google Calendar
   */
  async getEvents(
    calendarId: string = 'primary',
    startDate?: Date,
    endDate?: Date,
    maxResults: number = 2500
  ): Promise<CalendarOperationResult<GoogleCalendarEvent[]>> {
    try {
      const params = new URLSearchParams({
        maxResults: maxResults.toString(),
        singleEvents: 'true',
        orderBy: 'startTime',
      });

      if (startDate) {
        params.append('timeMin', startDate.toISOString());
      }
      if (endDate) {
        params.append('timeMax', endDate.toISOString());
      }

      const response = await fetch(
        `${this.baseUrl}/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Google Calendar API error: ${response.status}`);
      }

      const data: GoogleCalendarResponse = await response.json();
      return { success: true, data: data.items };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Create an event in Google Calendar
   */
  async createEvent(
    calendarId: string = 'primary',
    event: Partial<GoogleCalendarEvent>
  ): Promise<CalendarOperationResult<GoogleCalendarEvent>> {
    try {
      const response = await fetch(
        `${this.baseUrl}/calendars/${encodeURIComponent(calendarId)}/events`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event),
        }
      );

      if (!response.ok) {
        throw new Error(`Google Calendar API error: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Update an event in Google Calendar
   */
  async updateEvent(
    calendarId: string = 'primary',
    eventId: string,
    event: Partial<GoogleCalendarEvent>
  ): Promise<CalendarOperationResult<GoogleCalendarEvent>> {
    try {
      const response = await fetch(
        `${this.baseUrl}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event),
        }
      );

      if (!response.ok) {
        throw new Error(`Google Calendar API error: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Delete an event from Google Calendar
   */
  async deleteEvent(
    calendarId: string = 'primary',
    eventId: string
  ): Promise<CalendarOperationResult<void>> {
    try {
      const response = await fetch(
        `${this.baseUrl}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Google Calendar API error: ${response.status}`);
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Convert Google Calendar event to our internal format
   */
  static convertFromGoogleEvent(
    googleEvent: GoogleCalendarEvent,
    userId: string,
    externalCalendarId: string
  ): EnhancedCalendarEvent {
    const isAllDay = !googleEvent.start.dateTime;
    const startTime = new Date(googleEvent.start.dateTime || googleEvent.start.date!);
    const endTime = new Date(googleEvent.end.dateTime || googleEvent.end.date!);

    return {
      id: `google_${googleEvent.id}`,
      userId,
      title: googleEvent.summary || 'Untitled Event',
      description: googleEvent.description,
      startTime,
      endTime,
      timezone: googleEvent.start.timeZone || 'UTC',
      allDay: isAllDay,
      location: googleEvent.location,

      status: googleEvent.status === 'confirmed' ? 'confirmed' :
              googleEvent.status === 'tentative' ? 'tentative' :
              googleEvent.status === 'cancelled' ? 'cancelled' : 'confirmed',

      priority: 'normal',
      visibility: googleEvent.visibility === 'private' ? 'private' :
                 googleEvent.visibility === 'public' ? 'public' :
                 googleEvent.visibility === 'confidential' ? 'confidential' : 'private',

      createdBy: userId,
      externalCalendarId,
      externalEventId: googleEvent.id,
      syncStatus: 'connected',

      attendees: googleEvent.attendees?.map(attendee => ({
        id: `google_${attendee.email}`,
        email: attendee.email,
        name: attendee.displayName || attendee.email,
        rsvpStatus: attendee.responseStatus === 'accepted' ? 'accepted' :
                   attendee.responseStatus === 'declined' ? 'declined' :
                   attendee.responseStatus === 'tentative' ? 'tentative' : 'pending',
        isOptional: false,
      })),

      reminders: googleEvent.reminders?.overrides?.map((reminder, index) => ({
        id: `google_${googleEvent.id}_${index}`,
        type: reminder.method === 'email' ? 'email' : 'push',
        minutesBefore: reminder.minutes,
        sent: false,
      })),

      createdAt: new Date(googleEvent.created),
      updatedAt: new Date(googleEvent.updated),
      lastSyncAt: new Date(),

      isRecurring: Boolean(googleEvent.recurrence?.length),
      isException: false,
    };
  }

  /**
   * Convert our internal event format to Google Calendar format
   */
  static convertToGoogleEvent(event: EnhancedCalendarEvent): Partial<GoogleCalendarEvent> {
    return {
      summary: event.title,
      description: event.description,
      start: event.allDay
        ? { date: event.startTime.toISOString().split('T')[0] }
        : {
            dateTime: event.startTime.toISOString(),
            timeZone: event.timezone,
          },
      end: event.allDay
        ? { date: event.endTime.toISOString().split('T')[0] }
        : {
            dateTime: event.endTime.toISOString(),
            timeZone: event.timezone,
          },
      location: event.location,
      status: event.status === 'confirmed' ? 'confirmed' :
              event.status === 'tentative' ? 'tentative' :
              event.status === 'cancelled' ? 'cancelled' : 'confirmed',
      visibility: event.visibility === 'private' ? 'private' :
                 event.visibility === 'public' ? 'public' :
                 event.visibility === 'confidential' ? 'confidential' : 'default',
      attendees: event.attendees?.map(attendee => ({
        email: attendee.email,
        displayName: attendee.name,
        responseStatus: attendee.rsvpStatus === 'accepted' ? 'accepted' :
                       attendee.rsvpStatus === 'declined' ? 'declined' :
                       attendee.rsvpStatus === 'tentative' ? 'tentative' : 'needsAction',
      })),
      reminders: {
        useDefault: false,
        overrides: event.reminders?.map(reminder => ({
          method: reminder.type === 'email' ? 'email' : 'popup',
          minutes: reminder.minutesBefore,
        })),
      },
    };
  }
}