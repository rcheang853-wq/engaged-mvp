'use client';

import React, { useMemo, useState } from 'react';
import {
  format,
  startOfDay,
  endOfDay,
  addHours,
  getHours,
  getMinutes,
  isToday,
  isSameDay,
  addMinutes,
} from 'date-fns';
import { Event } from '@/types';
import { cn } from '@/lib/utils';
import { getEventStyles } from '@/lib/color-utils';
import { EventCard } from './event-card';

interface DayViewProps {
  currentDate: Date;
  events: Event[];
  onEventClick?: (event: Event) => void;
  onTimeSlotClick?: (date: Date, hour: number, minute?: number) => void;
  className?: string;
}

interface PositionedEvent {
  event: Event;
  top: number;
  height: number;
  overlap: number;
  width: number;
  left: number;
}

export const DayView: React.FC<DayViewProps> = ({
  currentDate,
  events,
  onEventClick,
  onTimeSlotClick,
  className,
}) => {
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{
    hour: number;
    minute: number;
  } | null>(null);

  // Generate hours (6 AM to 11 PM by default, with 30-minute intervals)
  const startHour = 6;
  const endHour = 23;
  const timeSlots: { hour: number; minute: number }[] = [];

  for (let hour = startHour; hour <= endHour; hour++) {
    timeSlots.push({ hour, minute: 0 });
    timeSlots.push({ hour, minute: 30 });
  }

  // Filter events for the current date
  const dayEvents = useMemo(() => {
    return events.filter(event => isSameDay(event.startTime, currentDate));
  }, [events, currentDate]);

  // Calculate positioned events for overlapping detection
  const positionedEvents = useMemo(() => {
    const positioned: PositionedEvent[] = [];

    // Sort events by start time
    const sortedEvents = [...dayEvents].sort(
      (a, b) => a.startTime.getTime() - b.startTime.getTime()
    );

    // Group overlapping events
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
        if (event.allDay) return; // Skip all-day events for positioning

        const eventStart =
          getHours(event.startTime) + getMinutes(event.startTime) / 60;
        const eventEnd =
          getHours(event.endTime) + getMinutes(event.endTime) / 60;

        // Calculate position relative to the visible hours
        const totalHours = endHour - startHour + 1;
        const top = ((eventStart - startHour) / totalHours) * 100;
        const height = ((eventEnd - eventStart) / totalHours) * 100;

        // Calculate width and left position for overlapping events
        const width = 100 / groupSize;
        const left = (eventIndex / groupSize) * 100;

        positioned.push({
          event,
          top: Math.max(0, top),
          height: Math.max(1, height), // Minimum height for visibility
          overlap: groupSize,
          width,
          left,
        });
      });
    });

    return positioned;
  }, [dayEvents, startHour, endHour]);

  const allDayEvents = useMemo(() => {
    return dayEvents.filter(event => event.allDay);
  }, [dayEvents]);

  const handleTimeSlotClick = (hour: number, minute: number) => {
    const timeSlot = { hour, minute };
    setSelectedTimeSlot(timeSlot);
    if (onTimeSlotClick) {
      onTimeSlotClick(currentDate, hour, minute);
    }
  };

  const getCurrentTimePosition = () => {
    const now = new Date();
    if (!isToday(currentDate)) return null;

    const currentHour = getHours(now) + getMinutes(now) / 60;
    if (currentHour < startHour || currentHour > endHour) return null;

    const totalHours = endHour - startHour + 1;
    return ((currentHour - startHour) / totalHours) * 100;
  };

  const currentTimePosition = getCurrentTimePosition();

  return (
    <div
      className={cn(
        'flex flex-col overflow-hidden bg-white lg:min-h-0 lg:flex-1',
        className
      )}
    >
      {/* Day header */}
      <div className="border-b border-gray-200 bg-gray-50">
        <div className="p-4">
          <div className="text-center">
            <div
              className={cn(
                'text-sm font-medium',
                isToday(currentDate) ? 'text-blue-600' : 'text-gray-600'
              )}
            >
              {format(currentDate, 'EEEE')}
            </div>
            <div
              className={cn(
                'mt-1 text-3xl font-bold',
                isToday(currentDate) ? 'text-blue-600' : 'text-gray-900'
              )}
            >
              {format(currentDate, 'd')}
            </div>
            <div className="mt-1 text-sm text-gray-500">
              {format(currentDate, 'MMMM yyyy')}
            </div>
          </div>
        </div>

        {/* All-day events */}
        {allDayEvents.length > 0 && (
          <div className="border-t border-gray-200 p-3">
            <div className="mb-2 text-xs text-gray-500">All Day</div>
            <div className="space-y-1">
              {allDayEvents.map(event => {
                const eventStyles = getEventStyles(event.category?.color);
                return (
                  <div
                    key={event.id}
                    className="cursor-pointer rounded p-2 transition-colors hover:opacity-80"
                    style={eventStyles}
                    onClick={() => onEventClick?.(event)}
                  >
                    <div className="font-medium">{event.title}</div>
                    {event.venue && (
                      <div className="mt-1 text-xs opacity-75">
                        {event.venue.name}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Time slots and events */}
      <div className="flex-1 overflow-auto">
        <div className="relative">
          {/* Hour grid */}
          <div className="space-y-0">
            {timeSlots.map(({ hour, minute }) => {
              const isHourStart = minute === 0;
              const timeString = format(
                addMinutes(addHours(startOfDay(new Date()), hour), minute),
                'h:mm a'
              );

              return (
                <div
                  key={`${hour}-${minute}`}
                  className={cn(
                    'flex cursor-pointer transition-colors hover:bg-gray-50',
                    selectedTimeSlot?.hour === hour &&
                      selectedTimeSlot?.minute === minute &&
                      'bg-blue-50'
                  )}
                  onClick={() => handleTimeSlotClick(hour, minute)}
                  role="button"
                  tabIndex={0}
                  aria-label={`Time slot ${timeString}`}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleTimeSlotClick(hour, minute);
                    }
                  }}
                >
                  {/* Time label */}
                  <div
                    className={cn(
                      'w-20 flex-shrink-0 border-r border-gray-200 p-2 text-right',
                      isHourStart
                        ? 'border-b border-gray-100'
                        : 'border-b border-gray-50'
                    )}
                  >
                    {isHourStart && (
                      <span className="text-xs text-gray-500">
                        {timeString}
                      </span>
                    )}
                  </div>

                  {/* Event area */}
                  <div
                    className={cn(
                      'h-12 flex-1',
                      isHourStart
                        ? 'border-b border-gray-100'
                        : 'border-b border-gray-50'
                    )}
                  />
                </div>
              );
            })}
          </div>

          {/* Positioned events overlay */}
          <div className="pointer-events-none absolute inset-0">
            <div className="relative mr-4 ml-20 h-full">
              {positionedEvents.map(({ event, top, height, width, left }) => {
                const eventStyles = getEventStyles(event.category?.color);
                return (
                  <div
                    key={event.id}
                    className="pointer-events-auto absolute z-10 cursor-pointer"
                    style={{
                      top: `${top}%`,
                      height: `${height}%`,
                      width: `${width}%`,
                      left: `${left}%`,
                    }}
                    onClick={() => onEventClick?.(event)}
                  >
                    <div
                      className="h-full overflow-hidden rounded border p-2 text-xs shadow-sm transition-colors hover:opacity-80"
                      style={eventStyles}
                    >
                      <div className="truncate font-semibold">{event.title}</div>
                      <div className="mt-1 text-[10px] opacity-75">
                        {format(event.startTime, 'h:mm a')} - {format(event.endTime, 'h:mm a')}
                      </div>
                      {event.venue && (
                        <div className="mt-1 truncate text-[10px] opacity-75">{event.venue.name}</div>
                      )}
                      {event.organizer && (
                        <div className="mt-1 truncate text-[10px] opacity-75">{event.organizer.organizationName}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Current time indicator */}
          {currentTimePosition !== null && (
            <div
              className="pointer-events-none absolute right-0 z-20 ml-20"
              style={{ top: `${currentTimePosition}%` }}
            >
              <div className="flex items-center">
                <div className="-ml-1.5 h-3 w-3 rounded-full bg-red-500" />
                <div className="h-0.5 flex-1 bg-red-500" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Events summary */}
      {dayEvents.length === 0 && (
        <div className="p-8 text-center text-gray-500">
          <div className="mb-2 text-lg">No events scheduled</div>
          <div className="text-sm">Click on a time slot to add an event</div>
        </div>
      )}
    </div>
  );
};

// Compact day view for mobile
export const CompactDayView: React.FC<DayViewProps> = ({
  currentDate,
  events,
  onEventClick,
  onTimeSlotClick,
  className,
}) => {
  const dayEvents = useMemo(() => {
    return events
      .filter(event => isSameDay(event.startTime, currentDate))
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }, [events, currentDate]);

  const allDayEvents = dayEvents.filter(event => event.allDay);
  const timedEvents = dayEvents.filter(event => !event.allDay);

  return (
    <div className={cn('flex h-full flex-col bg-white lg:min-h-0', className)}>
      {/* Day header */}
      <div className="border-b border-gray-200 bg-gray-50 p-4 text-center">
        <div
          className={cn(
            'text-sm font-medium',
            isToday(currentDate) ? 'text-blue-600' : 'text-gray-600'
          )}
        >
          {format(currentDate, 'EEEE')}
        </div>
        <div
          className={cn(
            'mt-1 text-2xl font-bold',
            isToday(currentDate) ? 'text-blue-600' : 'text-gray-900'
          )}
        >
          {format(currentDate, 'd')}
        </div>
        <div className="text-sm text-gray-500">
          {format(currentDate, 'MMMM yyyy')}
        </div>
      </div>

      {/* Events list */}
      <div className="flex-1 space-y-4 overflow-auto p-4">
        {/* All-day events */}
        {allDayEvents.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-medium text-gray-700">All Day</h3>
            <div className="space-y-2">
              {allDayEvents.map(event => (
                <EventCard
                  key={event.id}
                  event={event}
                  variant="compact"
                  onClick={onEventClick}
                />
              ))}
            </div>
          </div>
        )}

        {/* Timed events */}
        {timedEvents.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-medium text-gray-700">Schedule</h3>
            <div className="space-y-2">
              {timedEvents.map(event => (
                <EventCard
                  key={event.id}
                  event={event}
                  variant="compact"
                  onClick={onEventClick}
                />
              ))}
            </div>
          </div>
        )}

        {dayEvents.length === 0 && (
          <div className="py-8 text-center text-gray-500">
            <div className="mb-2 text-lg">No events scheduled</div>
            <div className="text-sm">This day is free for new events</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DayView;
