'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { Calendar, Clock, MapPin } from 'lucide-react';
import { getEventStyles } from '@/lib/color-utils';

interface EventCardProps {
  event: {
    id: string;
    title: string;
    start_at: string;
    end_at: string | null;
    all_day: boolean;
    color: string | null;
    location?: string | null;
  };
  calendarId: string;
  onClick?: (e: React.MouseEvent) => void;
}

export function EventCard({ event, calendarId, onClick }: EventCardProps) {
  const startTime = new Date(event.start_at);
  const hasTime = !event.all_day;
  const eventStyles = getEventStyles(event.color);

  return (
    <Link
      href={`/calendars/${calendarId}/events/${event.id}`}
      onClick={onClick}
      className="group block"
    >
      <div
        className="relative overflow-hidden rounded px-1.5 py-0.5 text-[10px] leading-4 transition-all duration-200 group-hover:z-10 group-hover:scale-105 group-hover:shadow-md"
        style={eventStyles}
      >
        {/* Subtle gradient overlay for depth */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/0 to-white/10" />

        {/* Content */}
        <div className="relative flex items-center gap-1">
          {hasTime && <Clock size={8} className="flex-shrink-0 opacity-80" />}
          <span className="truncate font-medium">{event.title}</span>
        </div>

        {/* Tooltip on hover */}
        <div className="absolute bottom-full left-0 z-50 mb-1 hidden min-w-[200px] group-hover:block">
          <div className="rounded-lg bg-gray-900 p-3 text-xs text-white shadow-xl">
            <div className="mb-1.5 font-semibold">{event.title}</div>
            <div className="space-y-1 text-gray-300">
              <div className="flex items-center gap-1.5">
                <Calendar size={12} />
                <span>{format(startTime, 'MMM d, yyyy')}</span>
              </div>
              {hasTime && (
                <div className="flex items-center gap-1.5">
                  <Clock size={12} />
                  <span>
                    {format(startTime, 'h:mm a')}
                    {event.end_at &&
                      ` - ${format(new Date(event.end_at), 'h:mm a')}`}
                  </span>
                </div>
              )}
              {event.location && (
                <div className="flex items-center gap-1.5">
                  <MapPin size={12} />
                  <span className="truncate">{event.location}</span>
                </div>
              )}
            </div>
            {/* Arrow pointing down */}
            <div className="absolute top-full left-4 h-0 w-0 border-t-4 border-r-4 border-l-4 border-transparent border-t-gray-900" />
          </div>
        </div>
      </div>
    </Link>
  );
}

export function EventCardCompact({
  event,
  calendarId,
  onClick,
  color,
}: EventCardProps & { color?: string }) {
  const eventStyles = getEventStyles(color || event.color);

  return (
    <Link
      href={`/calendars/${calendarId}/events/${event.id}`}
      onClick={onClick}
      className="group"
    >
      <div
        className="truncate rounded px-1 text-[10px] leading-4 transition-all duration-200 group-hover:scale-105 group-hover:shadow-sm"
        style={eventStyles}
      >
        {event.title}
      </div>
    </Link>
  );
}
