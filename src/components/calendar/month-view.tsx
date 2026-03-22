'use client';

import React, { useState, useMemo } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addDays,
  parseISO,
} from 'date-fns';
import { Event } from '@/types';
import { cn } from '@/lib/utils';
import { getEventStyles } from '@/lib/color-utils';
import { EventCard } from './event-card';

interface MonthViewProps {
  currentDate: Date;
  events: Event[];
  onDateSelect?: (date: Date) => void;
  onEventClick?: (event: Event) => void;
  className?: string;
}

export const MonthView: React.FC<MonthViewProps> = ({
  currentDate,
  events,
  onDateSelect,
  onEventClick,
  className,
}) => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Generate calendar days
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  });

  // Group events by date
  const eventsByDate = useMemo(() => {
    const grouped: Record<string, Event[]> = {};
    events.forEach(event => {
      const dateKey = format(event.startTime, 'yyyy-MM-dd');
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(event);
    });
    return grouped;
  }, [events]);

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    if (onDateSelect) {
      onDateSelect(date);
    }
  };

  const getDayEvents = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return eventsByDate[dateKey] || [];
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div
      className={cn(
        'flex flex-col overflow-hidden bg-white lg:min-h-0 lg:flex-1',
        className
      )}
    >
      {/* Week header */}
      <div className="grid flex-shrink-0 grid-cols-7 border-b border-gray-200 bg-gray-50">
        {weekDays.map(day => (
          <div
            key={day}
            className="border-r border-gray-200 py-2 text-center text-sm font-medium text-gray-700 last:border-r-0"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid flex-1 grid-rows-6 lg:min-h-0 lg:overflow-auto">
        {Array.from({ length: 6 }).map((_, weekIndex) => (
          <div
            key={weekIndex}
            className="grid grid-cols-7 border-b border-gray-200 last:border-b-0"
          >
            {calendarDays.slice(weekIndex * 7, (weekIndex + 1) * 7).map(day => {
              const dayEvents = getDayEvents(day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isDayToday = isToday(day);
              const isSelected = selectedDate && isSameDay(day, selectedDate);

              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    'min-h-[120px] cursor-pointer border-r border-gray-200 p-2 transition-colors last:border-r-0 hover:bg-gray-50 lg:min-h-[140px] xl:min-h-[160px]',
                    !isCurrentMonth && 'bg-gray-50/50 text-gray-400',
                    isSelected && 'bg-blue-50',
                    isDayToday && 'bg-yellow-50'
                  )}
                  onClick={() => handleDateClick(day)}
                  role="button"
                  tabIndex={0}
                  aria-label={`${format(day, 'EEEE, MMMM d, yyyy')} - ${dayEvents.length} events`}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleDateClick(day);
                    }
                  }}
                >
                  {/* Date number */}
                  <div className="mb-1 flex items-center justify-between">
                    <span
                      className={cn(
                        'text-sm font-medium',
                        isDayToday &&
                          'flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs text-white',
                        !isCurrentMonth && 'text-gray-400'
                      )}
                    >
                      {format(day, 'd')}
                    </span>
                    {dayEvents.length > 3 && (
                      <span className="rounded-full bg-gray-200 px-1 text-xs text-gray-500">
                        +{dayEvents.length - 3}
                      </span>
                    )}
                  </div>

                  {/* Events */}
                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map(event => {
                      const eventStyles = getEventStyles(event.category?.color);
                      return (
                        <div
                          key={event.id}
                          className="cursor-pointer truncate rounded p-1 text-xs transition-colors hover:opacity-80"
                          onClick={e => {
                            e.stopPropagation();
                            if (onEventClick) onEventClick(event);
                          }}
                          style={eventStyles}
                        >
                          <div className="flex items-center">
                            {event.allDay ? (
                              <span className="font-medium">{event.title}</span>
                            ) : (
                              <>
                                <span className="mr-1 text-[10px]">
                                  {format(event.startTime, 'h:mm')}
                                </span>
                                <span className="truncate font-medium">
                                  {event.title}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Selected date details panel (mobile) */}
      {selectedDate && (
        <div className="border-t border-gray-200 bg-white lg:hidden">
          <div className="p-4">
            <h3 className="mb-3 text-lg font-semibold text-gray-900">
              {format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </h3>
            {getDayEvents(selectedDate).length > 0 ? (
              <div className="space-y-2">
                {getDayEvents(selectedDate).map(event => (
                  <EventCard
                    key={event.id}
                    event={event}
                    variant="compact"
                    onClick={onEventClick}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No events scheduled</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Week view within month (alternative compact layout)
export const MonthWeekView: React.FC<MonthViewProps> = ({
  currentDate,
  events,
  onDateSelect,
  onEventClick,
  className,
}) => {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);

  // Generate weeks in the month
  const weeks: Date[][] = [];
  let currentWeekStart = startOfWeek(monthStart);

  while (currentWeekStart <= monthEnd) {
    const weekEnd = endOfWeek(currentWeekStart);
    const week = eachDayOfInterval({ start: currentWeekStart, end: weekEnd });
    weeks.push(week);
    currentWeekStart = addDays(weekEnd, 1);
  }

  // Group events by date
  const eventsByDate = useMemo(() => {
    const grouped: Record<string, Event[]> = {};
    events.forEach(event => {
      const dateKey = format(event.startTime, 'yyyy-MM-dd');
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(event);
    });
    return grouped;
  }, [events]);

  const getDayEvents = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return eventsByDate[dateKey] || [];
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className={cn('flex h-full flex-col bg-white', className)}>
      {/* Week header */}
      <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
        {weekDays.map(day => (
          <div
            key={day}
            className="border-r border-gray-200 py-3 text-center text-sm font-medium text-gray-700 last:border-r-0"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Weeks */}
      <div className="flex-1 overflow-auto lg:min-h-0">
        {weeks.map((week, weekIndex) => (
          <div
            key={weekIndex}
            className="grid min-h-[100px] grid-cols-7 border-b border-gray-200 lg:min-h-[120px] xl:min-h-[140px]"
          >
            {week.map(day => {
              const dayEvents = getDayEvents(day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isDayToday = isToday(day);

              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    'cursor-pointer border-r border-gray-200 p-2 transition-colors last:border-r-0 hover:bg-gray-50',
                    !isCurrentMonth && 'bg-gray-50/50 text-gray-400',
                    isDayToday && 'bg-yellow-50'
                  )}
                  onClick={() => onDateSelect?.(day)}
                  role="button"
                  tabIndex={0}
                  aria-label={`${format(day, 'EEEE, MMMM d, yyyy')} - ${dayEvents.length} events`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span
                      className={cn(
                        'text-sm font-medium',
                        isDayToday &&
                          'flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs text-white'
                      )}
                    >
                      {format(day, 'd')}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-600">
                        {dayEvents.length}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    {dayEvents.slice(0, 2).map(event => (
                      <EventCard
                        key={event.id}
                        event={event}
                        variant="minimal"
                        onClick={onEventClick}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MonthView;
