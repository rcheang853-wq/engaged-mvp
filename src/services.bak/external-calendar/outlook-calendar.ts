import {
  ExternalCalendarProvider,
  CalendarEvent,
  EnhancedCalendarEvent,
  CalendarOperationResult,
  ExternalCalendarSyncConfig
} from '@/types/calendar';

interface OutlookCalendarEvent {
  id: string;
  subject: string;
  body?: {
    contentType: 'text' | 'html';
    content: string;
  };
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  isAllDay: boolean;
  location?: {
    displayName: string;
    address?: {
      street: string;
      city: string;
      state: string;
      countryOrRegion: string;
      postalCode: string;
    };
  };
  showAs: 'free' | 'tentative' | 'busy' | 'oof' | 'workingElsewhere' | 'unknown';
  sensitivity: 'normal' | 'personal' | 'private' | 'confidential';
  attendees?: Array<{
    emailAddress: {
      address: string;
      name: string;
    };
    status: {
      response: 'none' | 'organizer' | 'tentativelyAccepted' | 'accepted' | 'declined' | 'notResponded';
      time: string;
    };
  }>;
  recurrence?: {
    pattern: {
      type: 'daily' | 'weekly' | 'absoluteMonthly' | 'relativeMonthly' | 'absoluteYearly' | 'relativeYearly';
      interval: number;
    };
    range: {
      type: 'endDate' | 'noEnd' | 'numbered';
      startDate: string;
      endDate?: string;
      numberOfOccurrences?: number;
    };
  };
  createdDateTime: string;
  lastModifiedDateTime: string;
  webLink: string;
}

interface OutlookCalendarList {
  value: Array<{
    id: string;
    name: string;
    description?: string;
    owner?: {
      name: string;
      address: string;
    };
    canShare: boolean;
    canViewPrivateItems: boolean;
    canEdit: boolean;
  }>;
}

interface OutlookCalendarResponse {
  value: OutlookCalendarEvent[];
  '@odata.nextLink'?: string;
}

export class OutlookCalendarService {
  private baseUrl = 'https://graph.microsoft.com/v1.0';

  constructor(private accessToken: string) {}

  /**
   * Get user's calendar list
   */
  async getCalendarList(): Promise<CalendarOperationResult<OutlookCalendarList>> {
    try {
      const response = await fetch(`${this.baseUrl}/me/calendars`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Microsoft Graph API error: ${response.status}`);
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
   * Get events from a specific Outlook Calendar
   */
  async getEvents(
    calendarId: string = 'me/calendar',
    startDate?: Date,
    endDate?: Date,
    maxResults: number = 1000
  ): Promise<CalendarOperationResult<OutlookCalendarEvent[]>> {
    try {
      const params = new URLSearchParams({
        '$top': maxResults.toString(),
        '$orderby': 'start/dateTime',
      });

      if (startDate || endDate) {
        const filters = [];
        if (startDate) {
          filters.push(`start/dateTime ge '${startDate.toISOString()}'`);
        }
        if (endDate) {
          filters.push(`end/dateTime le '${endDate.toISOString()}'`);
        }
        params.append('$filter', filters.join(' and '));
      }

      const endpoint = calendarId === 'me/calendar'
        ? `${this.baseUrl}/me/events`
        : `${this.baseUrl}/me/calendars/${calendarId}/events`;

      const response = await fetch(`${endpoint}?${params}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Microsoft Graph API error: ${response.status}`);
      }

      const data: OutlookCalendarResponse = await response.json();
      return { success: true, data: data.value };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Create an event in Outlook Calendar
   */
  async createEvent(
    calendarId: string = 'me/calendar',
    event: Partial<OutlookCalendarEvent>
  ): Promise<CalendarOperationResult<OutlookCalendarEvent>> {
    try {
      const endpoint = calendarId === 'me/calendar'
        ? `${this.baseUrl}/me/events`
        : `${this.baseUrl}/me/calendars/${calendarId}/events`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      });

      if (!response.ok) {
        throw new Error(`Microsoft Graph API error: ${response.status}`);
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
   * Update an event in Outlook Calendar
   */
  async updateEvent(
    eventId: string,
    event: Partial<OutlookCalendarEvent>
  ): Promise<CalendarOperationResult<OutlookCalendarEvent>> {
    try {
      const response = await fetch(`${this.baseUrl}/me/events/${eventId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      });

      if (!response.ok) {
        throw new Error(`Microsoft Graph API error: ${response.status}`);
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
   * Delete an event from Outlook Calendar
   */
  async deleteEvent(eventId: string): Promise<CalendarOperationResult<void>> {
    try {
      const response = await fetch(`${this.baseUrl}/me/events/${eventId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Microsoft Graph API error: ${response.status}`);
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
   * Convert Outlook Calendar event to our internal format
   */
  static convertFromOutlookEvent(
    outlookEvent: OutlookCalendarEvent,
    userId: string,
    externalCalendarId: string
  ): EnhancedCalendarEvent {
    return {
      id: `outlook_${outlookEvent.id}`,
      userId,
      title: outlookEvent.subject || 'Untitled Event',
      description: outlookEvent.body?.content,
      startTime: new Date(outlookEvent.start.dateTime),
      endTime: new Date(outlookEvent.end.dateTime),
      timezone: outlookEvent.start.timeZone || 'UTC',
      allDay: outlookEvent.isAllDay,
      location: outlookEvent.location?.displayName,

      status: 'confirmed', // Outlook doesn't have tentative/cancelled in the same way
      priority: 'normal',
      visibility: outlookEvent.sensitivity === 'private' ? 'private' :
                 outlookEvent.sensitivity === 'confidential' ? 'confidential' : 'public',

      createdBy: userId,
      externalCalendarId,
      externalEventId: outlookEvent.id,
      syncStatus: 'connected',

      attendees: outlookEvent.attendees?.map(attendee => ({
        id: `outlook_${attendee.emailAddress.address}`,
        email: attendee.emailAddress.address,
        name: attendee.emailAddress.name || attendee.emailAddress.address,
        rsvpStatus: attendee.status.response === 'accepted' ? 'accepted' :
                   attendee.status.response === 'declined' ? 'declined' :
                   attendee.status.response === 'tentativelyAccepted' ? 'tentative' : 'pending',
        isOptional: false,
        responseAt: attendee.status.time ? new Date(attendee.status.time) : undefined,
      })),

      createdAt: new Date(outlookEvent.createdDateTime),
      updatedAt: new Date(outlookEvent.lastModifiedDateTime),
      lastSyncAt: new Date(),

      isRecurring: Boolean(outlookEvent.recurrence),
      isException: false,
    };
  }

  /**
   * Convert our internal event format to Outlook Calendar format
   */
  static convertToOutlookEvent(event: EnhancedCalendarEvent): Partial<OutlookCalendarEvent> {
    return {
      subject: event.title,
      body: event.description ? {
        contentType: 'text',
        content: event.description,
      } : undefined,
      start: {
        dateTime: event.startTime.toISOString(),
        timeZone: event.timezone,
      },
      end: {
        dateTime: event.endTime.toISOString(),
        timeZone: event.timezone,
      },
      isAllDay: event.allDay,
      location: event.location ? {
        displayName: event.location,
      } : undefined,
      showAs: 'busy',
      sensitivity: event.visibility === 'private' ? 'private' :
                  event.visibility === 'confidential' ? 'confidential' : 'normal',
      attendees: event.attendees?.map(attendee => ({
        emailAddress: {
          address: attendee.email,
          name: attendee.name,
        },
        status: {
          response: attendee.rsvpStatus === 'accepted' ? 'accepted' :
                   attendee.rsvpStatus === 'declined' ? 'declined' :
                   attendee.rsvpStatus === 'tentative' ? 'tentativelyAccepted' : 'notResponded',
          time: attendee.responseAt?.toISOString() || new Date().toISOString(),
        },
      })),
    };
  }
}