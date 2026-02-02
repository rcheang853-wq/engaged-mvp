'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useEvents } from '@/hooks/use-events';
import { Event } from '@/types';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDebounce';

// Import all calendar view components
import CalendarNavigation, { CalendarView, MobileCalendarNavigation } from './calendar-navigation';
import MonthView from './month-view';
import WeekView from './week-view';
import DayView, { CompactDayView } from './day-view';
import AgendaView, { CompactAgendaView } from './agenda-view';

interface CalendarViewProps {
  initialDate?: Date;
  initialView?: CalendarView;
  events?: Event[];
  onEventClick?: (event: Event) => void;
  onDateSelect?: (date: Date) => void;
  onTimeSlotClick?: (date: Date, hour: number, minute?: number) => void;
  onViewChange?: (view: CalendarView) => void;
  className?: string;
  isMobile?: boolean;
}

export const CalendarViewComponent: React.FC<CalendarViewProps> = ({
  initialDate = new Date(),
  initialView = 'month',
  events: providedEvents,
  onEventClick,
  onDateSelect,
  onTimeSlotClick,
  onViewChange,
  className,
  isMobile = false,
}) => {
  const [currentDate, setCurrentDate] = useState<Date>(initialDate);
  const [view, setView] = useState<CalendarView>(initialView);
  const [isLoading, setIsLoading] = useState(false);

  // Debounce date changes to avoid excessive API calls
  const debouncedDate = useDebounce(currentDate, 300);

  // Calculate date range for event fetching based on current view
  const { startDate, endDate } = useMemo(() => {
    const date = debouncedDate;
    switch (view) {
      case 'month':
        // Fetch full month + padding for month view
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        return {
          startDate: new Date(monthStart.getTime() - 7 * 24 * 60 * 60 * 1000), // 1 week before
          endDate: new Date(monthEnd.getTime() + 7 * 24 * 60 * 60 * 1000), // 1 week after
        };
      case 'week':
        // Fetch week + padding
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay()); // Start of week
        return {
          startDate: weekStart,
          endDate: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000),
        };
      case 'day':
        // Fetch just the day
        return {
          startDate: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
          endDate: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1),
        };
      case 'agenda':
        // Fetch current month for agenda view
        return {
          startDate: new Date(date.getFullYear(), date.getMonth(), 1),
          endDate: new Date(date.getFullYear(), date.getMonth() + 1, 0),
        };
      default:
        return {
          startDate: new Date(date.getFullYear(), date.getMonth(), 1),
          endDate: new Date(date.getFullYear(), date.getMonth() + 1, 0),
        };
    }
  }, [debouncedDate, view]);

  // Fetch events from API if not provided
  const {
    data: eventData,
    isLoading: eventsLoading,
    error: eventsError
  } = useEvents({
    filters: {
      dateRange: { start: startDate, end: endDate }
    }
  });

  // Use provided events or fetched events
  const events = providedEvents || eventData?.data || [];

  // Loading state management
  useEffect(() => {
    setIsLoading(eventsLoading);
  }, [eventsLoading]);

  const handleDateChange = useCallback((date: Date) => {
    setCurrentDate(date);
    if (onDateSelect) {
      onDateSelect(date);
    }
  }, [onDateSelect]);

  const handleViewChange = useCallback((newView: CalendarView) => {
    setView(newView);
    if (onViewChange) {
      onViewChange(newView);
    }
  }, [onViewChange]);

  const handleToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const handleEventClick = useCallback((event: Event) => {
    if (onEventClick) {
      onEventClick(event);
    }
  }, [onEventClick]);

  const handleTimeSlotClick = useCallback((date: Date, hour: number, minute?: number) => {
    if (onTimeSlotClick) {
      onTimeSlotClick(date, hour, minute);
    }
  }, [onTimeSlotClick]);

  const renderCalendarView = () => {
    const commonProps = {
      currentDate,
      events,
      onEventClick: handleEventClick,
      onDateSelect: handleDateChange,
    };

    switch (view) {
      case 'month':
        return (
          <MonthView
            {...commonProps}
            className="flex-1"
          />
        );
      case 'week':
        return (
          <WeekView
            {...commonProps}
            onTimeSlotClick={handleTimeSlotClick}
            className="flex-1"
          />
        );
      case 'day':
        return isMobile ? (
          <CompactDayView
            {...commonProps}
            onTimeSlotClick={handleTimeSlotClick}
            className="flex-1"
          />
        ) : (
          <DayView
            {...commonProps}
            onTimeSlotClick={handleTimeSlotClick}
            className="flex-1"
          />
        );
      case 'agenda':
        return isMobile ? (
          <CompactAgendaView
            {...commonProps}
            className="flex-1"
          />
        ) : (
          <AgendaView
            {...commonProps}
            viewRange="month"
            className="flex-1"
          />
        );
      default:
        return (
          <MonthView
            {...commonProps}
            className="flex-1"
          />
        );
    }
  };

  const NavigationComponent = isMobile ? MobileCalendarNavigation : CalendarNavigation;

  return (
    <div className={cn('flex flex-col h-full bg-white rounded-lg shadow-sm border border-gray-200', className)}>
      <NavigationComponent
        currentDate={currentDate}
        view={view}
        onDateChange={handleDateChange}
        onViewChange={handleViewChange}
        onToday={handleToday}
      />

      <div className="flex-1 relative overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
              <span className="text-sm text-gray-600">Loading events...</span>
            </div>
          </div>
        )}

        {eventsError && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
            <div className="text-center">
              <div className="text-red-600 mb-2">Error loading events</div>
              <button
                onClick={() => window.location.reload()}
                className="text-sm text-blue-600 hover:text-blue-700 underline"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {renderCalendarView()}
      </div>
    </div>
  );
};

// Main export with default props
export const Calendar: React.FC<CalendarViewProps> = (props) => {
  return <CalendarViewComponent {...props} />;
};

// Hook for calendar state management
export const useCalendarState = (initialDate: Date = new Date(), initialView: CalendarView = 'month') => {
  const [currentDate, setCurrentDate] = useState<Date>(initialDate);
  const [view, setView] = useState<CalendarView>(initialView);

  const navigateToToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const navigateToDate = useCallback((date: Date) => {
    setCurrentDate(date);
  }, []);

  const changeView = useCallback((newView: CalendarView) => {
    setView(newView);
  }, []);

  return {
    currentDate,
    view,
    navigateToToday,
    navigateToDate,
    changeView,
    setCurrentDate,
    setView,
  };
};

// Utility function to detect mobile screen size
export const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);

    return () => {
      window.removeEventListener('resize', checkIsMobile);
    };
  }, []);

  return isMobile;
};

// Enhanced calendar with responsive behavior
export const ResponsiveCalendar: React.FC<Omit<CalendarViewProps, 'isMobile'>> = (props) => {
  const isMobile = useIsMobile();

  return <CalendarViewComponent {...props} isMobile={isMobile} />;
};

export default Calendar;