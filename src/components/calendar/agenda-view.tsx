'use client';

import React, { useMemo, useState } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isToday,
  isBefore,
  isAfter,
  addDays,
  startOfWeek,
  endOfWeek,
} from 'date-fns';
import { Calendar as CalendarIcon, Filter, Search, ChevronDown, ChevronRight } from 'lucide-react';
import { Event } from '@/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import EventCard from './event-card';

interface AgendaViewProps {
  currentDate: Date;
  events: Event[];
  onEventClick?: (event: Event) => void;
  onDateSelect?: (date: Date) => void;
  viewRange?: 'month' | 'week' | 'upcoming';
  className?: string;
}

interface GroupedEvents {
  date: Date;
  events: Event[];
}

export const AgendaView: React.FC<AgendaViewProps> = ({
  currentDate,
  events,
  onEventClick,
  onDateSelect,
  viewRange = 'month',
  className,
}) => {
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('');

  // Get date range based on view
  const { startDate, endDate } = useMemo(() => {
    switch (viewRange) {
      case 'week':
        return {
          startDate: startOfWeek(currentDate),
          endDate: endOfWeek(currentDate),
        };
      case 'upcoming':
        return {
          startDate: new Date(),
          endDate: addDays(new Date(), 30), // Next 30 days
        };
      case 'month':
      default:
        return {
          startDate: startOfMonth(currentDate),
          endDate: endOfMonth(currentDate),
        };
    }
  }, [currentDate, viewRange]);

  // Filter and group events by date
  const groupedEvents = useMemo(() => {
    // Filter events by date range
    let filteredEvents = events.filter(event => {
      const eventDate = event.startTime;
      return (
        (isAfter(eventDate, startDate) || isSameDay(eventDate, startDate)) &&
        (isBefore(eventDate, endDate) || isSameDay(eventDate, endDate))
      );
    });

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filteredEvents = filteredEvents.filter(event =>
        event.title.toLowerCase().includes(searchLower) ||
        event.description?.toLowerCase().includes(searchLower) ||
        event.tags.some(tag => tag.toLowerCase().includes(searchLower)) ||
        event.venue?.name.toLowerCase().includes(searchLower) ||
        event.organizer?.organizationName.toLowerCase().includes(searchLower)
      );
    }

    // Apply category filter
    if (filterCategory) {
      filteredEvents = filteredEvents.filter(event =>
        event.category?.id === filterCategory
      );
    }

    // Group events by date
    const grouped: GroupedEvents[] = [];
    const eventsByDate: Record<string, Event[]> = {};

    filteredEvents.forEach(event => {
      const dateKey = format(event.startTime, 'yyyy-MM-dd');
      if (!eventsByDate[dateKey]) {
        eventsByDate[dateKey] = [];
      }
      eventsByDate[dateKey].push(event);
    });

    // Convert to array and sort
    Object.entries(eventsByDate).forEach(([dateKey, events]) => {
      grouped.push({
        date: new Date(dateKey),
        events: events.sort((a, b) => {
          if (a.allDay && !b.allDay) return -1;
          if (!a.allDay && b.allDay) return 1;
          return a.startTime.getTime() - b.startTime.getTime();
        }),
      });
    });

    return grouped.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [events, startDate, endDate, searchTerm, filterCategory]);

  // Get unique categories for filter
  const categories = useMemo(() => {
    const cats = new Set<string>();
    events.forEach(event => {
      if (event.category) {
        cats.add(event.category.id);
      }
    });
    return Array.from(cats).map(id => {
      const category = events.find(e => e.category?.id === id)?.category;
      return category;
    }).filter(Boolean);
  }, [events]);

  const toggleDateExpansion = (dateKey: string) => {
    const newExpanded = new Set(expandedDates);
    if (newExpanded.has(dateKey)) {
      newExpanded.delete(dateKey);
    } else {
      newExpanded.add(dateKey);
    }
    setExpandedDates(newExpanded);
  };

  const getTotalEventsCount = () => {
    return groupedEvents.reduce((total, group) => total + group.events.length, 0);
  };

  const getViewRangeLabel = () => {
    switch (viewRange) {
      case 'week':
        return format(startDate, 'MMM d') + ' - ' + format(endDate, 'MMM d, yyyy');
      case 'upcoming':
        return 'Next 30 days';
      case 'month':
      default:
        return format(currentDate, 'MMMM yyyy');
    }
  };

  return (
    <div className={cn('flex flex-col h-full bg-white', className)}>
      {/* Header with search and filters */}
      <div className="border-b border-gray-200 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Agenda</h2>
            <p className="text-sm text-gray-500">{getViewRangeLabel()}</p>
          </div>
          <div className="text-sm text-gray-500">
            {getTotalEventsCount()} events
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search events..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Category filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All categories</option>
            {categories.map(category => (
              <option key={category!.id} value={category!.id}>
                {category!.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Events list */}
      <div className="flex-1 overflow-auto">
        {groupedEvents.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {groupedEvents.map(group => {
              const dateKey = format(group.date, 'yyyy-MM-dd');
              const isExpanded = expandedDates.has(dateKey);
              const isDateToday = isToday(group.date);
              const visibleEvents = isExpanded ? group.events : group.events.slice(0, 3);

              return (
                <div key={dateKey} className="bg-white">
                  {/* Date header */}
                  <div
                    className={cn(
                      'sticky top-0 z-10 flex items-center justify-between p-4 cursor-pointer transition-colors hover:bg-gray-50',
                      isDateToday && 'bg-blue-50 hover:bg-blue-100'
                    )}
                    onClick={() => {
                      toggleDateExpansion(dateKey);
                      onDateSelect?.(group.date);
                    }}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={cn(
                        'flex flex-col items-center justify-center w-12 h-12 rounded-lg',
                        isDateToday ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'
                      )}>
                        <span className="text-lg font-bold">
                          {format(group.date, 'd')}
                        </span>
                        <span className="text-xs font-medium">
                          {format(group.date, 'EEE')}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {format(group.date, 'EEEE, MMMM d, yyyy')}
                        </div>
                        <div className="text-sm text-gray-500">
                          {group.events.length} event{group.events.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {group.events.length > 3 && (
                        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">
                          {isExpanded ? 'Show less' : `+${group.events.length - 3} more`}
                        </span>
                      )}
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                  </div>

                  {/* Events for this date */}
                  <div className="px-4 pb-4 space-y-3">
                    {visibleEvents.map(event => (
                      <EventCard
                        key={event.id}
                        event={event}
                        variant="compact"
                        onClick={onEventClick}
                        className="ml-15"
                      />
                    ))}

                    {group.events.length > 3 && !isExpanded && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleDateExpansion(dateKey);
                        }}
                        className="ml-15 text-blue-600 hover:text-blue-700"
                      >
                        Show {group.events.length - 3} more events
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <CalendarIcon className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No events found
            </h3>
            <p className="text-gray-500 max-w-sm">
              {searchTerm || filterCategory
                ? 'Try adjusting your search or filter criteria'
                : `No events scheduled for ${getViewRangeLabel().toLowerCase()}`}
            </p>
            {(searchTerm || filterCategory) && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => {
                  setSearchTerm('');
                  setFilterCategory('');
                }}
              >
                Clear filters
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Compact agenda view for smaller screens
export const CompactAgendaView: React.FC<AgendaViewProps> = ({
  currentDate,
  events,
  onEventClick,
  viewRange = 'upcoming',
  className,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Get upcoming events (next 7 days by default for compact view)
  const upcomingEvents = useMemo(() => {
    const now = new Date();
    const endDate = addDays(now, 7);

    let filteredEvents = events.filter(event => {
      const eventDate = event.startTime;
      return (
        (isAfter(eventDate, now) || isSameDay(eventDate, now)) &&
        (isBefore(eventDate, endDate) || isSameDay(eventDate, endDate))
      );
    });

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filteredEvents = filteredEvents.filter(event =>
        event.title.toLowerCase().includes(searchLower) ||
        event.description?.toLowerCase().includes(searchLower)
      );
    }

    return filteredEvents
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
      .slice(0, 20); // Limit to 20 events for performance
  }, [events, searchTerm]);

  return (
    <div className={cn('flex flex-col h-full bg-white', className)}>
      {/* Compact header */}
      <div className="border-b border-gray-200 p-3">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-900">Upcoming</h2>
          <span className="text-sm text-gray-500">
            {upcomingEvents.length} events
          </span>
        </div>

        {/* Compact search */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-7 pr-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Compact events list */}
      <div className="flex-1 overflow-auto">
        {upcomingEvents.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {upcomingEvents.map(event => (
              <EventCard
                key={event.id}
                event={event}
                variant="minimal"
                onClick={onEventClick}
                className="px-3 py-2"
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-32 text-center px-4">
            <CalendarIcon className="h-8 w-8 text-gray-400 mb-2" />
            <p className="text-sm text-gray-500">
              {searchTerm ? 'No matching events' : 'No upcoming events'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AgendaView;