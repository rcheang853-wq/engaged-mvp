'use client';

import React, { useMemo, useState } from 'react';
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isToday,
  startOfDay,
  endOfDay,
  addHours,
  getHours,
  getMinutes,
  differenceInMinutes,
} from 'date-fns';
import { Event } from '@/types';
import { cn } from '@/lib/utils';
import EventCard from './event-card';

interface WeekViewProps {
  currentDate: Date;
  events: Event[];
  onEventClick?: (event: Event) => void;
  onTimeSlotClick?: (date: Date, hour: number) => void;
  className?: string;
}

interface PositionedEvent {
  event: Event;
  top: number;
  height: number;
  column: number;
  overlap: number;
  width: number;
  left: number;
}

export const WeekView: React.FC<WeekViewProps> = ({
  currentDate,
  events,
  onEventClick,
  onTimeSlotClick,
  className,
}) => {
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{ date: Date; hour: number } | null>(null);

  // Generate week days
  const weekStart = startOfWeek(currentDate);
  const weekEnd = endOfWeek(currentDate);
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Generate hours (7 AM to 10 PM by default)
  const startHour = 7;
  const endHour = 22;
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => i + startHour);

  // Group events by day and calculate positions
  const { eventsByDay, positionedEvents } = useMemo(() => {
    const eventsByDay: Record<string, Event[]> = {};
    const positioned: PositionedEvent[] = [];

    // Group events by day
    weekDays.forEach(day => {
      const dayKey = format(day, 'yyyy-MM-dd');
      eventsByDay[dayKey] = events.filter(event => {
        return isSameDay(event.startTime, day);
      });
    });

    // Position events
    weekDays.forEach((day, dayIndex) => {
      const dayKey = format(day, 'yyyy-MM-dd');
      const dayEvents = eventsByDay[dayKey] || [];

      // Sort events by start time
      const sortedEvents = [...dayEvents].sort((a, b) =>
        a.startTime.getTime() - b.startTime.getTime()
      );

      // Calculate positions for overlapping events
      const overlappingGroups: Event[][] = [];

      sortedEvents.forEach(event => {
        let placed = false;

        // Try to find a group this event can be added to
        for (const group of overlappingGroups) {
          const hasOverlap = group.some(groupEvent => {
            return (
              event.startTime < groupEvent.endTime &&
              event.endTime > groupEvent.startTime
            );
          });

          if (!hasOverlap) {
            group.push(event);
            placed = true;
            break;
          }
        }

        // If no group found, create a new one
        if (!placed) {
          overlappingGroups.push([event]);
        }
      });

      // Position events within their groups
      overlappingGroups.forEach(group => {
        const groupSize = group.length;

        group.forEach((event, eventIndex) => {
          const eventStart = getHours(event.startTime) + getMinutes(event.startTime) / 60;
          const eventEnd = getHours(event.endTime) + getMinutes(event.endTime) / 60;

          // Calculate position relative to the visible hours
          const top = ((eventStart - startHour) / (endHour - startHour)) * 100;
          const height = ((eventEnd - eventStart) / (endHour - startHour)) * 100;

          // Calculate width and left position for overlapping events
          const width = 100 / groupSize;
          const left = (eventIndex / groupSize) * 100;

          positioned.push({
            event,
            top: Math.max(0, top),
            height: Math.max(2, height), // Minimum height for visibility
            column: dayIndex,
            overlap: groupSize,
            width,
            left,
          });
        });
      });
    });

    return { eventsByDay, positionedEvents: positioned };
  }, [weekDays, events, startHour, endHour]);

  const handleTimeSlotClick = (day: Date, hour: number) => {
    const timeSlot = { date: day, hour };
    setSelectedTimeSlot(timeSlot);
    if (onTimeSlotClick) {
      onTimeSlotClick(day, hour);
    }
  };

  const getDayAllDayEvents = (day: Date) => {
    const dayKey = format(day, 'yyyy-MM-dd');
    return (eventsByDay[dayKey] || []).filter(event => event.allDay);
  };

  return (
    <div className={cn('flex flex-col h-full bg-white overflow-hidden', className)}>
      {/* Week header with all-day events */}
      <div className="border-b border-gray-200">
        {/* Day headers */}
        <div className="grid grid-cols-8">
          {/* Time column header */}
          <div className="p-3 border-r border-gray-200 bg-gray-50">
            <span className="text-xs text-gray-500">Time</span>
          </div>

          {/* Day headers */}
          {weekDays.map(day => (
            <div
              key={day.toISOString()}
              className={cn(
                'p-3 text-center border-r border-gray-200 last:border-r-0 bg-gray-50',
                isToday(day) && 'bg-blue-50'
              )}
            >
              <div className="text-sm font-medium text-gray-900">
                {format(day, 'EEE')}
              </div>
              <div
                className={cn(
                  'text-2xl font-bold mt-1',
                  isToday(day) ? 'text-blue-600' : 'text-gray-900'
                )}
              >
                {format(day, 'd')}
              </div>
            </div>
          ))}
        </div>

        {/* All-day events section */}
        <div className="grid grid-cols-8 border-t border-gray-200 bg-gray-50/50">
          <div className="p-2 border-r border-gray-200 text-xs text-gray-500 flex items-center">
            All day
          </div>
          {weekDays.map(day => {
            const allDayEvents = getDayAllDayEvents(day);
            return (
              <div
                key={day.toISOString()}
                className="p-2 border-r border-gray-200 last:border-r-0 min-h-[40px]"
              >
                {allDayEvents.map(event => (
                  <div
                    key={event.id}
                    className={cn(
                      'text-xs p-1 mb-1 rounded cursor-pointer transition-colors',
                      'bg-blue-100 text-blue-800 hover:bg-blue-200'
                    )}
                    style={{
                      backgroundColor: event.category ? `${event.category.color}20` : undefined,
                      color: event.category?.color || undefined,
                    }}
                    onClick={() => onEventClick?.(event)}
                  >
                    {event.title}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Time slots and events */}
      <div className="flex-1 overflow-auto">
        <div className="relative">
          {/* Hour grid */}
          <div className="grid grid-cols-8">
            {hours.map(hour => (
              <React.Fragment key={hour}>
                {/* Time label */}
                <div className="h-16 border-r border-gray-200 border-b border-gray-100 p-2 bg-gray-50">
                  <span className="text-xs text-gray-500">
                    {format(addHours(startOfDay(new Date()), hour), 'h:mm a')}
                  </span>
                </div>

                {/* Time slots for each day */}
                {weekDays.map(day => (
                  <div
                    key={`${day.toISOString()}-${hour}`}
                    className={cn(
                      'h-16 border-r border-gray-200 last:border-r-0 border-b border-gray-100 cursor-pointer transition-colors hover:bg-gray-50',
                      selectedTimeSlot?.date && isSameDay(selectedTimeSlot.date, day) &&
                      selectedTimeSlot.hour === hour && 'bg-blue-50',
                      isToday(day) && 'bg-yellow-50/30'
                    )}
                    onClick={() => handleTimeSlotClick(day, hour)}
                    role="button"
                    tabIndex={0}
                    aria-label={`${format(day, 'EEEE')} at ${format(addHours(startOfDay(new Date()), hour), 'h:mm a')}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleTimeSlotClick(day, hour);
                      }
                    }}
                  />
                ))}
              </React.Fragment>
            ))}
          </div>

          {/* Positioned events overlay */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="grid grid-cols-8 h-full">
              {/* Skip time column */}
              <div />

              {/* Event columns */}
              {weekDays.map((day, dayIndex) => (
                <div key={day.toISOString()} className="relative border-r border-gray-200 last:border-r-0">
                  {positionedEvents
                    .filter(positioned => positioned.column === dayIndex)
                    .map(({ event, top, height, width, left }) => (
                      <div
                        key={event.id}
                        className="absolute pointer-events-auto cursor-pointer z-10"
                        style={{
                          top: `${top}%`,
                          height: `${height}%`,
                          width: `${width}%`,
                          left: `${left}%`,
                        }}
                        onClick={() => onEventClick?.(event)}
                      >
                        <div
                          className={cn(
                            'h-full p-1 rounded text-xs overflow-hidden',
                            'bg-blue-100 text-blue-800 border border-blue-200 hover:bg-blue-200 transition-colors'
                          )}
                          style={{
                            backgroundColor: event.category ? `${event.category.color}20` : undefined,
                            borderColor: event.category?.color || undefined,
                            color: event.category?.color || undefined,
                          }}
                        >
                          <div className="font-medium truncate">{event.title}</div>
                          <div className="text-[10px] opacity-75 truncate">
                            {format(event.startTime, 'h:mm')} - {format(event.endTime, 'h:mm')}
                          </div>
                          {event.venue && (
                            <div className="text-[10px] opacity-75 truncate">
                              {event.venue.name}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Current time indicator */}
      {weekDays.some(day => isToday(day)) && (
        <CurrentTimeIndicator
          currentTime={new Date()}
          startHour={startHour}
          endHour={endHour}
          weekDays={weekDays}
        />
      )}
    </div>
  );
};

// Current time indicator component
const CurrentTimeIndicator: React.FC<{
  currentTime: Date;
  startHour: number;
  endHour: number;
  weekDays: Date[];
}> = ({ currentTime, startHour, endHour, weekDays }) => {
  const currentHour = getHours(currentTime) + getMinutes(currentTime) / 60;

  if (currentHour < startHour || currentHour > endHour) {
    return null;
  }

  const todayIndex = weekDays.findIndex(day => isToday(day));
  if (todayIndex === -1) {
    return null;
  }

  const topPercent = ((currentHour - startHour) / (endHour - startHour)) * 100;

  return (
    <div
      className="absolute pointer-events-none z-20"
      style={{
        top: `${topPercent}%`,
        left: `${((todayIndex + 1) / 8) * 100}%`,
        width: `${(1 / 8) * 100}%`,
      }}
    >
      <div className="flex items-center">
        <div className="w-2 h-2 bg-red-500 rounded-full -ml-1" />
        <div className="h-0.5 bg-red-500 flex-1" />
      </div>
    </div>
  );
};

export default WeekView;