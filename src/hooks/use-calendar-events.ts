import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarEvent, CalendarEventInsert, CalendarEventUpdate } from '@/types/calendar';

const CALENDAR_EVENTS_QUERY_KEY = 'calendar-events';

interface UseCalendarEventsParams {
  userId?: string;
  enabled?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

interface CalendarEventResponse {
  events: CalendarEvent[];
  isLoading: boolean;
  error: string | null;
  createEvent: (eventData: Partial<CalendarEventInsert>) => Promise<void>;
  updateEvent: (eventId: string, eventData: Partial<CalendarEventUpdate>) => Promise<void>;
  deleteEvent: (eventId: string) => Promise<void>;
  refetch: () => void;
}

export function useCalendarEvents(params: UseCalendarEventsParams = {}): CalendarEventResponse {
  const { userId, enabled = true, dateRange } = params;
  const queryClient = useQueryClient();

  // Fetch calendar events
  const {
    data: events = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: [CALENDAR_EVENTS_QUERY_KEY, userId, dateRange],
    queryFn: async (): Promise<CalendarEvent[]> => {
      if (!userId) return [];

      const searchParams = new URLSearchParams();
      if (dateRange) {
        searchParams.append('start', dateRange.start.toISOString());
        searchParams.append('end', dateRange.end.toISOString());
      }

      const response = await fetch(`/api/calendar/events?${searchParams.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch calendar events: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data?.events || [];
    },
    enabled: enabled && !!userId,
    staleTime: 30000, // 30 seconds
    cacheTime: 300000, // 5 minutes
  });

  // Create event mutation
  const createEventMutation = useMutation({
    mutationFn: async (eventData: Partial<CalendarEventInsert>) => {
      const response = await fetch('/api/calendar/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to create event: ${response.statusText}`);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CALENDAR_EVENTS_QUERY_KEY] });
    },
    onError: (error) => {
      console.error('Error creating calendar event:', error);
    },
  });

  // Update event mutation
  const updateEventMutation = useMutation({
    mutationFn: async ({ eventId, eventData }: { eventId: string; eventData: Partial<CalendarEventUpdate> }) => {
      const response = await fetch(`/api/calendar/events/${eventId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to update event: ${response.statusText}`);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CALENDAR_EVENTS_QUERY_KEY] });
    },
    onError: (error) => {
      console.error('Error updating calendar event:', error);
    },
  });

  // Delete event mutation
  const deleteEventMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const response = await fetch(`/api/calendar/events/${eventId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to delete event: ${response.statusText}`);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CALENDAR_EVENTS_QUERY_KEY] });
    },
    onError: (error) => {
      console.error('Error deleting calendar event:', error);
    },
  });

  return {
    events,
    isLoading: isLoading || createEventMutation.isPending || updateEventMutation.isPending || deleteEventMutation.isPending,
    error: error?.message || createEventMutation.error?.message || updateEventMutation.error?.message || deleteEventMutation.error?.message || null,
    createEvent: (eventData: Partial<CalendarEventInsert>) => createEventMutation.mutateAsync(eventData),
    updateEvent: (eventId: string, eventData: Partial<CalendarEventUpdate>) =>
      updateEventMutation.mutateAsync({ eventId, eventData }),
    deleteEvent: (eventId: string) => deleteEventMutation.mutateAsync(eventId),
    refetch,
  };
}

// Hook for specific date range events (useful for calendar views)
export function useCalendarEventsForDateRange(userId: string | undefined, startDate: Date, endDate: Date) {
  return useCalendarEvents({
    userId,
    enabled: !!userId,
    dateRange: { start: startDate, end: endDate },
  });
}

// Hook for events in a specific month
export function useCalendarEventsForMonth(userId: string | undefined, year: number, month: number) {
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0);

  return useCalendarEventsForDateRange(userId, startDate, endDate);
}

// Hook for events in a specific week
export function useCalendarEventsForWeek(userId: string | undefined, date: Date) {
  const startDate = new Date(date);
  startDate.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)

  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6); // End of week (Saturday)

  return useCalendarEventsForDateRange(userId, startDate, endDate);
}

// Hook for events on a specific day
export function useCalendarEventsForDay(userId: string | undefined, date: Date) {
  const startDate = new Date(date);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(date);
  endDate.setHours(23, 59, 59, 999);

  return useCalendarEventsForDateRange(userId, startDate, endDate);
}