'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { Calendar, Clock, MapPin } from 'lucide-react';

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

  return (
    <Link 
      href={`/calendars/${calendarId}/events/${event.id}`}
      onClick={onClick}
      className="group block"
    >
      <div
        className="relative text-[10px] rounded px-1.5 py-0.5 text-white leading-4 overflow-hidden transition-all duration-200 group-hover:shadow-md group-hover:scale-105 group-hover:z-10"
        style={{ backgroundColor: event.color || '#3B82F6' }}
      >
        {/* Subtle gradient overlay for depth */}
        <div className="absolute inset-0 bg-gradient-to-r from-white/0 to-white/10 pointer-events-none" />
        
        {/* Content */}
        <div className="relative flex items-center gap-1">
          {hasTime && (
            <Clock size={8} className="flex-shrink-0 opacity-80" />
          )}
          <span className="truncate font-medium">{event.title}</span>
        </div>
        
        {/* Tooltip on hover */}
        <div className="absolute left-0 bottom-full mb-1 hidden group-hover:block z-50 min-w-[200px]">
          <div className="bg-gray-900 text-white text-xs rounded-lg p-3 shadow-xl">
            <div className="font-semibold mb-1.5">{event.title}</div>
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
                    {event.end_at && ` - ${format(new Date(event.end_at), 'h:mm a')}`}
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
            <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
          </div>
        </div>
      </div>
    </Link>
  );
}

export function EventCardCompact({ event, calendarId, onClick, color }: EventCardProps & { color?: string }) {
  return (
    <Link 
      href={`/calendars/${calendarId}/events/${event.id}`}
      onClick={onClick}
      className="group"
    >
      <div
        className="text-[10px] truncate rounded px-1 text-white leading-4 transition-all duration-200 group-hover:shadow-sm group-hover:scale-105"
        style={{ backgroundColor: color || event.color || '#3B82F6' }}
      >
        {event.title}
      </div>
    </Link>
  );
}
