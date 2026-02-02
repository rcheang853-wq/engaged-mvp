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
  addMonths,
  subMonths
} from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar, Plus, Clock, MapPin, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EnhancedCalendarEvent } from '@/types/calendar';
import { cn } from '@/lib/utils';

interface MobileCalendarWidgetProps {
  events: EnhancedCalendarEvent[];
  onEventClick?: (event: EnhancedCalendarEvent) => void;
  onDateSelect?: (date: Date) => void;
  onCreateEvent?: (date?: Date) => void;
  initialDate?: Date;
  className?: string;
  compact?: boolean;
  showAgenda?: boolean;
}

export const MobileCalendarWidget: React.FC<MobileCalendarWidgetProps> = ({
  events = [],
  onEventClick,
  onDateSelect,
  onCreateEvent,
  initialDate = new Date(),
  className,
  compact = false,
  showAgenda = true
}) => {
  const [currentDate, setCurrentDate] = useState(initialDate);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [view, setView] = useState<'month' | 'agenda'>('month');

  // Generate calendar days
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Group events by date
  const eventsByDate = useMemo(() => {
    const grouped: { [key: string]: EnhancedCalendarEvent[] } = {};

    events.forEach(event => {
      const dateKey = format(event.startTime, 'yyyy-MM-dd');
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(event);
    });

    return grouped;
  }, [events]);

  // Get events for selected or today's date
  const agendaEvents = useMemo(() => {
    const targetDate = selectedDate || new Date();
    const dateKey = format(targetDate, 'yyyy-MM-dd');
    return eventsByDate[dateKey] || [];
  }, [eventsByDate, selectedDate]);

  // Get upcoming events (next 3 days)
  const upcomingEvents = useMemo(() => {
    const today = new Date();
    const threeDaysFromNow = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);

    return events
      .filter(event => event.startTime >= today && event.startTime <= threeDaysFromNow)
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
      .slice(0, 5);
  }, [events]);

  const handleDateClick = (date: Date) => {
    setSelectedDate(isSameDay(date, selectedDate || new Date()) ? null : date);
    onDateSelect?.(date);
  };

  const handlePrevMonth = () => {
    setCurrentDate(prev => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => addMonths(prev, 1));
  };

  const getEventIndicator = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const dayEvents = eventsByDate[dateKey] || [];

    if (dayEvents.length === 0) return null;

    if (dayEvents.length === 1) {
      const event = dayEvents[0];
      return (
        <div
          className="w-1.5 h-1.5 rounded-full mt-0.5"
          style={{ backgroundColor: event.color || '#3b82f6' }}
        />
      );
    }

    return (
      <div className="flex gap-0.5 mt-0.5">
        {dayEvents.slice(0, 3).map((event, index) => (
          <div
            key={index}
            className="w-1 h-1 rounded-full"
            style={{ backgroundColor: event.color || '#3b82f6' }}
          />
        ))}
        {dayEvents.length > 3 && (
          <div className="w-1 h-1 rounded-full bg-gray-400" />
        )}
      </div>
    );
  };

  const formatEventTime = (event: EnhancedCalendarEvent) => {
    if (event.allDay) return 'All day';
    return format(event.startTime, 'h:mm a');
  };

  const getEventDuration = (event: EnhancedCalendarEvent) => {
    if (event.allDay) return null;
    const duration = (event.endTime.getTime() - event.startTime.getTime()) / (1000 * 60);
    if (duration < 60) return `${duration}m`;
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  };

  if (compact) {
    return (
      <div className={cn('bg-white rounded-lg border shadow-sm', className)}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="font-medium text-gray-900">Calendar</h3>
            <p className="text-sm text-gray-500">{format(new Date(), 'MMMM d, yyyy')}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onCreateEvent?.()}
            className="flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Add
          </Button>
        </div>

        {/* Upcoming Events */}
        <div className="p-4">
          {upcomingEvents.length > 0 ? (
            <div className="space-y-3">
              {upcomingEvents.map(event => (
                <div
                  key={event.id}
                  onClick={() => onEventClick?.(event)}
                  className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: event.color || '#3b82f6' }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {event.title}
                    </div>
                    <div className="text-xs text-gray-500">
                      {format(event.startTime, 'MMM d')} • {formatEventTime(event)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <Calendar className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No upcoming events</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('bg-white rounded-lg border shadow-sm overflow-hidden', className)}>
      {/* Header with Navigation */}
      <div className="flex items-center justify-between p-4 border-b bg-gray-50">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePrevMonth}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <h2 className="text-lg font-semibold text-gray-900">
            {format(currentDate, 'MMMM yyyy')}
          </h2>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleNextMonth}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {showAgenda && (
          <div className="flex bg-gray-100 rounded-lg p-1">
            <Button
              variant={view === 'month' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('month')}
              className="text-xs h-7"
            >
              Month
            </Button>
            <Button
              variant={view === 'agenda' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('agenda')}
              className="text-xs h-7"
            >
              Agenda
            </Button>
          </div>
        )}
      </div>

      {view === 'month' ? (
        <div className="p-4">
          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-xs font-medium text-gray-500 text-center py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map(day => {
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isTodayDate = isToday(day);

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => handleDateClick(day)}
                  className={cn(
                    'aspect-square flex flex-col items-center justify-center p-1 rounded-lg text-sm transition-colors',
                    'hover:bg-gray-100',
                    !isCurrentMonth && 'text-gray-300',
                    isCurrentMonth && 'text-gray-900',
                    isTodayDate && 'bg-blue-100 text-blue-900 font-semibold',
                    isSelected && 'bg-blue-600 text-white hover:bg-blue-700'
                  )}
                >
                  <span>{format(day, 'd')}</span>
                  {getEventIndicator(day)}
                </button>
              );
            })}
          </div>

          {/* Selected Date Events */}
          {selectedDate && agendaEvents.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <h3 className="text-sm font-medium text-gray-900 mb-3">
                {format(selectedDate, 'MMMM d, yyyy')}
              </h3>
              <div className="space-y-2">
                {agendaEvents.slice(0, 3).map(event => (
                  <div
                    key={event.id}
                    onClick={() => onEventClick?.(event)}
                    className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: event.color || '#3b82f6' }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {event.title}
                      </div>
                      <div className="text-xs text-gray-500 flex items-center gap-2">
                        <span>{formatEventTime(event)}</span>
                        {getEventDuration(event) && (
                          <>
                            <span>•</span>
                            <span>{getEventDuration(event)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {agendaEvents.length > 3 && (
                  <div className="text-xs text-gray-500 text-center">
                    +{agendaEvents.length - 3} more events
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-4">
          {/* Agenda View */}
          <div className="space-y-4">
            {/* Today's Events */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">
                Today • {format(new Date(), 'MMMM d')}
              </h3>
              {agendaEvents.length > 0 ? (
                <div className="space-y-3">
                  {agendaEvents.map(event => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onClick={() => onEventClick?.(event)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500 py-4">
                  No events today
                </div>
              )}
            </div>

            {/* Upcoming Events */}
            {upcomingEvents.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">
                  Coming Up
                </h3>
                <div className="space-y-3">
                  {upcomingEvents.map(event => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onClick={() => onEventClick?.(event)}
                      showDate
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="border-t p-4 bg-gray-50">
        <Button
          onClick={() => onCreateEvent?.(selectedDate || new Date())}
          className="w-full flex items-center gap-2"
          size="sm"
        >
          <Plus className="w-4 h-4" />
          Add Event
        </Button>
      </div>
    </div>
  );
};

// Event Card Component for Agenda View
const EventCard: React.FC<{
  event: EnhancedCalendarEvent;
  onClick: () => void;
  showDate?: boolean;
}> = ({ event, onClick, showDate = false }) => {
  return (
    <div
      onClick={onClick}
      className="flex items-start gap-3 p-3 rounded-lg border bg-white cursor-pointer hover:bg-gray-50 transition-colors"
    >
      <div
        className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
        style={{ backgroundColor: event.color || '#3b82f6' }}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-gray-900 truncate">
              {event.title}
            </h4>

            <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>
                  {showDate && `${format(event.startTime, 'MMM d')} • `}
                  {formatEventTime(event)}
                  {!event.allDay && ` - ${format(event.endTime, 'h:mm a')}`}
                </span>
              </div>

              {event.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate">{event.location}</span>
                </div>
              )}
            </div>

            {event.description && (
              <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                {event.description}
              </p>
            )}

            {/* Status Badges */}
            <div className="flex items-center gap-2 mt-2">
              {event.priority !== 'normal' && (
                <Badge
                  variant="outline"
                  className={cn(
                    'text-xs px-1.5 py-0.5',
                    event.priority === 'urgent' && 'border-red-200 text-red-700',
                    event.priority === 'high' && 'border-orange-200 text-orange-700',
                    event.priority === 'low' && 'border-gray-200 text-gray-600'
                  )}
                >
                  {event.priority}
                </Badge>
              )}

              {event.status !== 'confirmed' && (
                <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                  {event.status}
                </Badge>
              )}

              {event.conflicts && event.conflicts.length > 0 && (
                <Badge variant="outline" className="text-xs px-1.5 py-0.5 border-red-200 text-red-700">
                  Conflict
                </Badge>
              )}
            </div>
          </div>

          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 ml-2">
            <MoreVertical className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MobileCalendarWidget;