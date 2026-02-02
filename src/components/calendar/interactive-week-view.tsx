'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CalendarEvent } from '@/types/calendar';
import { cn } from '@/lib/utils';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addMinutes, differenceInMinutes } from 'date-fns';
import { Clock, MapPin, Users, AlertTriangle } from 'lucide-react';

interface InteractiveWeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  onEventDrop?: (eventId: string, newStartTime: Date, newEndTime: Date) => void;
  onEventResize?: (eventId: string, newStartTime: Date, newEndTime: Date) => void;
  onTimeSlotClick?: (date: Date, hour: number, minute?: number) => void;
  onConflictDetected?: (conflicts: any[]) => void;
  workingHours?: { start: number; end: number };
  timeSlotDuration?: number; // in minutes
  showConflicts?: boolean;
  className?: string;
}

interface DraggableEventProps {
  event: CalendarEvent;
  style: React.CSSProperties;
  onEventClick?: (event: CalendarEvent) => void;
  hasConflicts?: boolean;
  isDragging?: boolean;
}

const DraggableEvent: React.FC<DraggableEventProps> = ({
  event,
  style,
  onEventClick,
  hasConflicts = false,
  isDragging = false
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: event.id });

  const dragStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    ...style,
  };

  const eventDuration = differenceInMinutes(new Date(event.end_time), new Date(event.start_time));
  const isShortEvent = eventDuration < 60;

  return (
    <div
      ref={setNodeRef}
      style={dragStyle}
      className={cn(
        'absolute left-1 right-1 rounded-md shadow-sm border cursor-pointer transition-all duration-200',
        'hover:shadow-md hover:z-10',
        'text-xs text-white font-medium',
        {
          'bg-blue-500 border-blue-600': event.priority === 'normal' && !hasConflicts,
          'bg-green-500 border-green-600': event.priority === 'low' && !hasConflicts,
          'bg-orange-500 border-orange-600': event.priority === 'high' && !hasConflicts,
          'bg-red-500 border-red-600': event.priority === 'urgent' && !hasConflicts,
          'bg-red-500 border-red-700 animate-pulse': hasConflicts,
          'opacity-50 scale-95': isDragging || isSortableDragging,
          'z-50': isDragging || isSortableDragging,
          'min-h-[2rem]': isShortEvent,
        }
      )}
      onClick={() => onEventClick?.(event)}
      {...attributes}
      {...listeners}
    >
      <div className="p-1.5 h-full flex flex-col justify-between">
        <div className="flex-1">
          <div className="font-semibold truncate text-xs mb-0.5">
            {event.title}
          </div>
          {!isShortEvent && (
            <>
              <div className="flex items-center gap-1 text-xs opacity-90">
                <Clock className="w-3 h-3" />
                <span>
                  {format(new Date(event.start_time), 'HH:mm')} -
                  {format(new Date(event.end_time), 'HH:mm')}
                </span>
              </div>
              {event.location && (
                <div className="flex items-center gap-1 text-xs opacity-90 mt-0.5">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate">{event.location}</span>
                </div>
              )}
              {event.attendees && event.attendees.length > 0 && (
                <div className="flex items-center gap-1 text-xs opacity-90 mt-0.5">
                  <Users className="w-3 h-3" />
                  <span>{event.attendees.length}</span>
                </div>
              )}
            </>
          )}
        </div>
        {hasConflicts && (
          <div className="flex items-center gap-1 text-xs bg-red-600 bg-opacity-50 rounded px-1 py-0.5 mt-1">
            <AlertTriangle className="w-3 h-3" />
            <span>Conflict</span>
          </div>
        )}
      </div>
    </div>
  );
};

export const InteractiveWeekView: React.FC<InteractiveWeekViewProps> = ({
  currentDate,
  events,
  onEventClick,
  onEventDrop,
  onEventResize,
  onTimeSlotClick,
  onConflictDetected,
  workingHours = { start: 8, end: 18 },
  timeSlotDuration = 30,
  showConflicts = true,
  className,
}) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggedEvent, setDraggedEvent] = useState<CalendarEvent | null>(null);

  // Calculate week days
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Generate time slots
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += timeSlotDuration) {
        slots.push({ hour, minute });
      }
    }
    return slots;
  }, [timeSlotDuration]);

  // Process events for positioning
  const processedEvents = useMemo(() => {
    return events.map(event => {
      const startTime = new Date(event.start_time);
      const endTime = new Date(event.end_time);
      const dayOfWeek = startTime.getDay();

      // Calculate position within the day
      const startMinutes = startTime.getHours() * 60 + startTime.getMinutes();
      const endMinutes = endTime.getHours() * 60 + endTime.getMinutes();
      const duration = endMinutes - startMinutes;

      // Calculate top position (60px per hour)
      const top = (startMinutes / 60) * 60;
      const height = Math.max((duration / 60) * 60, 30); // Minimum 30px height

      return {
        ...event,
        dayOfWeek,
        top,
        height,
        startMinutes,
        endMinutes,
        duration,
      };
    });
  }, [events]);

  // Detect conflicts
  const conflictingEvents = useMemo(() => {
    if (!showConflicts) return new Set();

    const conflicts = new Set<string>();

    for (let i = 0; i < processedEvents.length; i++) {
      for (let j = i + 1; j < processedEvents.length; j++) {
        const event1 = processedEvents[i];
        const event2 = processedEvents[j];

        // Check if events are on the same day and overlap
        if (event1.dayOfWeek === event2.dayOfWeek) {
          const overlap = !(event1.endMinutes <= event2.startMinutes || event2.endMinutes <= event1.startMinutes);
          if (overlap) {
            conflicts.add(event1.id);
            conflicts.add(event2.id);
          }
        }
      }
    }

    return conflicts;
  }, [processedEvents, showConflicts]);

  // Handle drag start
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
    const eventToMove = processedEvents.find(e => e.id === active.id);
    setDraggedEvent(eventToMove || null);
  }, [processedEvents]);

  // Handle drag end
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    setActiveId(null);
    setDraggedEvent(null);

    if (!over || !draggedEvent) return;

    const [dayIndex, timeSlot] = (over.id as string).split('-').map(Number);
    const targetDay = weekDays[dayIndex];

    if (!targetDay) return;

    // Calculate new start time
    const newStartTime = new Date(targetDay);
    const targetHour = Math.floor(timeSlot / (60 / timeSlotDuration));
    const targetMinute = (timeSlot % (60 / timeSlotDuration)) * timeSlotDuration;
    newStartTime.setHours(targetHour, targetMinute, 0, 0);

    // Calculate new end time based on original duration
    const newEndTime = addMinutes(newStartTime, draggedEvent.duration);

    onEventDrop?.(draggedEvent.id, newStartTime, newEndTime);
  }, [draggedEvent, weekDays, timeSlotDuration, onEventDrop]);

  // Handle time slot click
  const handleTimeSlotClick = useCallback((dayIndex: number, timeSlot: number) => {
    const targetDay = weekDays[dayIndex];
    if (!targetDay) return;

    const hour = Math.floor(timeSlot / (60 / timeSlotDuration));
    const minute = (timeSlot % (60 / timeSlotDuration)) * timeSlotDuration;

    onTimeSlotClick?.(targetDay, hour, minute);
  }, [weekDays, timeSlotDuration, onTimeSlotClick]);

  // Group events by day
  const eventsByDay = useMemo(() => {
    const grouped: { [key: number]: typeof processedEvents } = {};

    for (let i = 0; i < 7; i++) {
      grouped[i] = processedEvents.filter(event => event.dayOfWeek === i);
    }

    return grouped;
  }, [processedEvents]);

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className={cn('flex flex-col h-full bg-white', className)}>
        {/* Header with days */}
        <div className="flex border-b border-gray-200">
          <div className="w-20 border-r border-gray-200 p-2">
            <div className="text-xs text-gray-500 font-medium">Time</div>
          </div>
          {weekDays.map((day, index) => (
            <div key={day.toISOString()} className="flex-1 border-r border-gray-200 p-2">
              <div className="text-center">
                <div className="text-xs text-gray-500 font-medium">
                  {format(day, 'EEE')}
                </div>
                <div className={cn(
                  'text-lg font-semibold mt-1',
                  isSameDay(day, new Date()) ? 'text-blue-600' : 'text-gray-900'
                )}>
                  {format(day, 'd')}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Time slots and events */}
        <div className="flex-1 overflow-auto">
          <div className="flex">
            {/* Time column */}
            <div className="w-20 border-r border-gray-200">
              {Array.from({ length: 24 }, (_, hour) => (
                <div key={hour} className="h-15 border-b border-gray-100 p-1">
                  <div className="text-xs text-gray-500 font-medium">
                    {format(new Date().setHours(hour, 0, 0, 0), 'HH:mm')}
                  </div>
                </div>
              ))}
            </div>

            {/* Days columns */}
            {weekDays.map((day, dayIndex) => (
              <div key={day.toISOString()} className="flex-1 border-r border-gray-200 relative">
                {/* Time slot grid */}
                <SortableContext
                  items={timeSlots.map((_, slotIndex) => `${dayIndex}-${slotIndex}`)}
                  strategy={verticalListSortingStrategy}
                >
                  {timeSlots.map((slot, slotIndex) => {
                    const isWorkingHour = slot.hour >= workingHours.start && slot.hour < workingHours.end;
                    const isCurrentTime = isSameDay(day, new Date()) &&
                      new Date().getHours() === slot.hour &&
                      new Date().getMinutes() >= slot.minute &&
                      new Date().getMinutes() < slot.minute + timeSlotDuration;

                    return (
                      <div
                        key={`${dayIndex}-${slotIndex}`}
                        id={`${dayIndex}-${slotIndex}`}
                        className={cn(
                          'h-15 border-b border-gray-100 cursor-pointer transition-colors',
                          {
                            'bg-blue-50': isWorkingHour,
                            'bg-yellow-100': isCurrentTime,
                            'hover:bg-blue-100': isWorkingHour,
                            'hover:bg-gray-100': !isWorkingHour,
                          }
                        )}
                        onClick={() => handleTimeSlotClick(dayIndex, slotIndex)}
                      />
                    );
                  })}
                </SortableContext>

                {/* Events */}
                <div className="absolute inset-0 pointer-events-none">
                  {eventsByDay[dayIndex]?.map((event) => (
                    <div
                      key={event.id}
                      className="pointer-events-auto"
                      style={{
                        top: `${event.top}px`,
                        height: `${event.height}px`,
                      }}
                    >
                      <DraggableEvent
                        event={event}
                        style={{}}
                        onEventClick={onEventClick}
                        hasConflicts={conflictingEvents.has(event.id)}
                        isDragging={activeId === event.id}
                      />
                    </div>
                  ))}
                </div>

                {/* Current time indicator */}
                {isSameDay(day, new Date()) && (
                  <div
                    className="absolute left-0 right-0 border-t-2 border-red-500 bg-red-500 h-0.5 z-10 pointer-events-none"
                    style={{
                      top: `${(new Date().getHours() * 60 + new Date().getMinutes()) / 60 * 60}px`,
                    }}
                  >
                    <div className="absolute -left-1 -top-1 w-2 h-2 bg-red-500 rounded-full" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeId && draggedEvent ? (
          <DraggableEvent
            event={draggedEvent}
            style={{
              width: '200px',
              height: `${draggedEvent.height}px`,
            }}
            isDragging={true}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default InteractiveWeekView;