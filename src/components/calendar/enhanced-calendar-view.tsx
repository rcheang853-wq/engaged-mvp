'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { CalendarEvent } from '@/types/calendar';
import { cn } from '@/lib/utils';

// Import all calendar view components
import CalendarNavigation, { CalendarView, MobileCalendarNavigation } from './calendar-navigation';
import MonthView from './month-view';
import WeekView from './week-view';
import DayView, { CompactDayView } from './day-view';
import AgendaView, { CompactAgendaView } from './agenda-view';

// Generic event interface that both Event and CalendarEvent can extend
interface BaseEvent {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  description?: string;
  location?: string;
  [key: string]: any;
}

interface EnhancedCalendarViewProps<T extends BaseEvent = BaseEvent> {
  initialDate?: Date;
  initialView?: CalendarView;
  events?: T[];
  onEventClick?: (event: T) => void;
  onDateSelect?: (date: Date) => void;
  onTimeSlotClick?: (date: Date, hour: number, minute?: number) => void;
  onViewChange?: (view: CalendarView) => void;
  className?: string;
  isMobile?: boolean;
  isLoading?: boolean;
}

export const EnhancedCalendarView = <T extends BaseEvent = BaseEvent>({
  initialDate = new Date(),
  initialView = 'month',
  events = [],
  onEventClick,
  onDateSelect,
  onTimeSlotClick,
  onViewChange,
  className,
  isMobile = false,
  isLoading = false,
}: EnhancedCalendarViewProps<T>) => {
  const [currentDate, setCurrentDate] = useState<Date>(initialDate);
  const [view, setView] = useState<CalendarView>(initialView);

  // Filter events for the current view period
  const filteredEvents = useMemo(() => {
    if (!events.length) return [];

    const { startDate, endDate } = getViewDateRange(currentDate, view);
    return events.filter((event) => {
      const eventStart = new Date(event.start_time);
      const eventEnd = new Date(event.end_time);

      // Event overlaps with view period if:
      // - Event starts before view ends AND event ends after view starts
      return eventStart < endDate && eventEnd > startDate;
    });
  }, [events, currentDate, view]);

  const handleViewChange = useCallback((newView: CalendarView) => {
    setView(newView);
    onViewChange?.(newView);
  }, [onViewChange]);

  const handleDateChange = useCallback((newDate: Date) => {
    setCurrentDate(newDate);
  }, []);

  const handleEventClick = useCallback((event: T) => {
    onEventClick?.(event);
  }, [onEventClick]);

  const handleDateSelect = useCallback((date: Date) => {
    onDateSelect?.(date);
  }, [onDateSelect]);

  const handleTimeSlotClick = useCallback((date: Date, hour: number, minute = 0) => {
    onTimeSlotClick?.(date, hour, minute);
  }, [onTimeSlotClick]);

  const renderCalendarView = () => {
    const commonProps = {
      currentDate,
      events: filteredEvents,
      onEventClick: handleEventClick,
      onDateSelect: handleDateSelect,
      onTimeSlotClick: handleTimeSlotClick,
      isLoading,
    };

    switch (view) {
      case 'month':
        return <MonthView {...commonProps} />;
      case 'week':
        return <WeekView {...commonProps} />;
      case 'day':
        return isMobile ?
          <CompactDayView {...commonProps} /> :
          <DayView {...commonProps} />;
      case 'agenda':
        return isMobile ?
          <CompactAgendaView {...commonProps} /> :
          <AgendaView {...commonProps} />;
      default:
        return <MonthView {...commonProps} />;
    }
  };

  return (
    <div className={cn('flex flex-col h-full bg-white', className)}>
      {/* Calendar Navigation */}
      {isMobile ? (
        <MobileCalendarNavigation
          currentDate={currentDate}
          view={view}
          onDateChange={handleDateChange}
          onViewChange={handleViewChange}
        />
      ) : (
        <CalendarNavigation
          currentDate={currentDate}
          view={view}
          onDateChange={handleDateChange}
          onViewChange={handleViewChange}
        />
      )}

      {/* Calendar Content */}
      <div className="flex-1 overflow-hidden">
        {renderCalendarView()}
      </div>
    </div>
  );
};

// Utility function to get date range for a view
function getViewDateRange(date: Date, view: CalendarView) {
  const startDate = new Date(date);
  const endDate = new Date(date);

  switch (view) {
    case 'month':
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
      endDate.setMonth(endDate.getMonth() + 1, 0);
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'week':
      const dayOfWeek = startDate.getDay();
      startDate.setDate(startDate.getDate() - dayOfWeek);
      startDate.setHours(0, 0, 0, 0);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'day':
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'agenda':
      // Show events for the next 30 days
      startDate.setHours(0, 0, 0, 0);
      endDate.setDate(endDate.getDate() + 30);
      endDate.setHours(23, 59, 59, 999);
      break;
    default:
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
  }

  return { startDate, endDate };
}

// Export with specific typing for calendar events
export const CalendarEventsView = (props: Omit<EnhancedCalendarViewProps<CalendarEvent>, 'events'> & {
  events?: CalendarEvent[];
}) => <EnhancedCalendarView<CalendarEvent> {...props} />;

// Custom hook for responsive mobile detection
export const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  React.useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);

    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  return isMobile;
};

export default EnhancedCalendarView;