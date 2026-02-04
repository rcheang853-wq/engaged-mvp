'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Calendar, dateFnsLocalizer, View, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, startOfMonth, endOfMonth, endOfWeek, addMonths, subMonths, addDays, subDays } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { PersonalEventModalV2, PersonalEventV2 } from './personal-event-modal-v2';

// Legacy imports for backward compatibility
import type { PersonalEvent } from './personal-event-modal';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

export interface PersonalEventsCalendarProps {
  events?: PersonalEvent[];
  onCreateEvent?: (event: Omit<PersonalEvent, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  onUpdateEvent?: (id: string, updates: Partial<PersonalEvent>) => Promise<void>;
  onDeleteEvent?: (id: string) => Promise<void>;
  loading?: boolean;
  className?: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  resource?: PersonalEvent;
}

export function PersonalEventsCalendar({
  events = [],
  onCreateEvent,
  onUpdateEvent,
  onDeleteEvent,
  loading = false,
  className,
}: PersonalEventsCalendarProps) {
  const [view, setView] = useState<View>(Views.MONTH);
  const [date, setDate] = useState(new Date());
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<PersonalEvent | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [defaultDate, setDefaultDate] = useState<Date | undefined>(undefined);
  const [defaultStartTime, setDefaultStartTime] = useState<string | undefined>(undefined);
  const [defaultEndTime, setDefaultEndTime] = useState<string | undefined>(undefined);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [localLoading, setLocalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const formattedEvents: CalendarEvent[] = events.map(event => ({
      id: event.id,
      title: event.title,
      start: new Date(event.start_time),
      end: new Date(event.end_time),
      allDay: false,
      resource: event,
    }));
    setCalendarEvents(formattedEvents);
  }, [events]);

  const handleSelectSlot = useCallback(({ start, end }: { start: Date; end: Date }) => {
    setSelectedEvent(null);
    setIsCreating(true);
    setDefaultDate(start);
    setDefaultStartTime(start.toISOString().slice(0, 16));
    setDefaultEndTime(end.toISOString().slice(0, 16));
    setModalOpen(true);
  }, []);

  const handleSelectEvent = useCallback((calendarEvent: CalendarEvent) => {
    setSelectedEvent(calendarEvent.resource || null);
    setIsCreating(false);
    setModalOpen(true);
  }, []);

  const handleNavigate = useCallback((newDate: Date) => {
    setDate(newDate);
  }, []);

  const handleViewChange = useCallback((newView: View) => {
    setView(newView);
  }, []);

  const handleCreateEvent = async (eventData: Omit<PersonalEvent, 'id' | 'created_at' | 'updated_at'>) => {
    if (!onCreateEvent) return;
    
    setLocalLoading(true);
    setError(null);
    
    try {
      await onCreateEvent(eventData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create event');
      throw err;
    } finally {
      setLocalLoading(false);
    }
  };

  const handleUpdateEvent = async (updates: Partial<PersonalEvent>) => {
    if (!selectedEvent || !onUpdateEvent) return;
    
    setLocalLoading(true);
    setError(null);
    
    try {
      await onUpdateEvent(selectedEvent.id, updates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update event');
      throw err;
    } finally {
      setLocalLoading(false);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!onDeleteEvent) return;
    
    setLocalLoading(true);
    setError(null);
    
    try {
      await onDeleteEvent(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete event');
      throw err;
    } finally {
      setLocalLoading(false);
    }
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedEvent(null);
    setIsCreating(false);
    setDefaultDate(undefined);
    setDefaultStartTime(undefined);
    setDefaultEndTime(undefined);
  };

  const today = new Date();

  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    const backgroundColor = '#3b82f6';
    const style: React.CSSProperties = {
      backgroundColor,
      borderRadius: '4px',
      opacity: 0.9,
      color: 'white',
      border: 'none',
      display: 'block',
      fontSize: '12px',
      padding: '2px 6px',
    };
    return { style };
  }, []);

  const components = useMemo(() => ({
    event: ({ event }: { event: CalendarEvent }) => {
      const isShared = event.resource?.share_enabled && event.resource?.share_slug;
      return (
        <div className="truncate font-medium text-xs flex items-center gap-1">
          {isShared && <Share2 className="h-3 w-3 flex-shrink-0" />}
          <span className="truncate">{event.title}</span>
        </div>
      );
    },
  }), []);

  const formats = useMemo(() => ({
    monthHeaderFormat: 'MMMM yyyy',
    dayHeaderFormat: 'EEEE, MMMM d, yyyy',
    dayRangeHeaderFormat: ({ start, end }: { start: Date; end: Date }) =>
      `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`,
  }), []);

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="flex items-center justify-between p-4 border-b bg-white">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleNavigate(subMonths(date, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold min-w-[140px] text-center">
            {format(date, 'MMMM yyyy')}
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleNavigate(addMonths(date, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleNavigate(today)}
          >
            Today
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => {
              setSelectedEvent(null);
              setIsCreating(true);
              setDefaultDate(new Date());
              setDefaultStartTime(new Date().toISOString().slice(0, 16));
              setDefaultEndTime(new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16));
              setModalOpen(true);
            }}
            className="gap-1"
          >
            <Plus className="h-4 w-4" />
            New Event
          </Button>
        </div>
      </div>

      {error && (
        <div className="mx-4 mt-2 p-3 text-sm text-red-600 bg-red-50 rounded-md">
          {error}
        </div>
      )}

      <div className="flex-1 p-4 bg-white">
        {(loading || localLoading) ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : (
            <Calendar
            localizer={localizer}
            events={calendarEvents}
            view={view}
            onView={handleViewChange}
            date={date}
            onNavigate={handleNavigate}
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
            selectable
            eventPropGetter={eventStyleGetter}
            components={components}
            formats={formats}
            views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
            defaultView={Views.MONTH}
            popup
            showMultiDayTimes
          />
        )}
      </div>

      <PersonalEventModalV2
        isOpen={modalOpen}
        onClose={handleCloseModal}
        event={selectedEvent as any /* TODO: update to PersonalEventV2 after DB migration */}
        isCreating={isCreating}
        onSave={isCreating ? handleCreateEvent : handleUpdateEvent}
        {...(defaultDate ? { defaultDate } : {})}
        {...(!isCreating && onDeleteEvent ? { onDelete: handleDeleteEvent } : {})}
        loading={localLoading}
      />
    </div>
  );
}

export default PersonalEventsCalendar;
