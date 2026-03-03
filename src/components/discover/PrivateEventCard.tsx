'use client';

import Link from 'next/link';
import { format } from 'date-fns';

export type PrivateEvent = {
  id: string;
  calendar_id: string;
  title: string;
  description: string | null;
  location: string | null;
  start_at: string;
  end_at: string | null;
  all_day: boolean;
  color: string | null;
  calendars?: { id: string; name: string; color: string | null } | null;
};

export default function PrivateEventCard({ event }: { event: PrivateEvent }) {
  const start = new Date(event.start_at);
  const timeLabel = event.all_day ? 'All day' : format(start, 'EEE, MMM d · h:mm a');
  const accent = event.color || event.calendars?.color || '#3B82F6';

  return (
    <Link href={`/calendars/${event.calendar_id}/events/${event.id}`} className="block">
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:border-gray-200 transition-colors">
        <div className="flex items-start gap-3">
          <div className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: accent }} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold text-gray-900 truncate">{event.title}</h3>
              {event.calendars?.name && (
                <span className="text-[11px] text-gray-500 flex-shrink-0">{event.calendars.name}</span>
              )}
            </div>
            <p className="text-sm text-gray-600 mt-1">{timeLabel}</p>
            {event.location && <p className="text-sm text-gray-500 truncate mt-1">{event.location}</p>}
          </div>
        </div>
      </div>
    </Link>
  );
}
