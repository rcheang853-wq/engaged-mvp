'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, Settings, Search } from 'lucide-react';
import { addDays, addHours, endOfDay, format, isToday, parseISO, startOfDay } from 'date-fns';
import BottomTabBar from '@/components/BottomTabBar';
import CalendarSwitcher from '@/components/CalendarSwitcher';
import CalendarViewTabs from '@/components/calendar/calendar-view-tabs';

interface CalendarEvent {
  id: string;
  title: string;
  start_at: string;
  end_at: string | null;
  all_day: boolean;
  color: string | null;
  location: string | null;
  profiles: { id?: string; full_name: string; avatar_url: string | null };
}

interface CalendarMember {
  user_id: string;
  role: string;
  profiles: { id: string; full_name: string; avatar_url: string | null };
}

interface SharedCalendar {
  id: string;
  name: string;
  color: string;
  timezone?: string;
  calendar_members: CalendarMember[];
}

const MEMBER_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
const HOUR_HEIGHT = 64;
const TOTAL_HEIGHT = HOUR_HEIGHT * 24;

export default function CalendarThreeDayPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [calendar, setCalendar] = useState<SharedCalendar | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const calendarId = Array.isArray(id) ? id[0] : id;

  const baseDate = useMemo(() => {
    const dateParam = searchParams.get('date');
    if (!dateParam) return startOfDay(new Date());

    const parsed = parseISO(dateParam);
    return Number.isNaN(parsed.getTime()) ? startOfDay(new Date()) : startOfDay(parsed);
  }, [searchParams]);

  const baseDateKey = format(baseDate, 'yyyy-MM-dd');

  useEffect(() => {
    const start = startOfDay(baseDate);
    const end = endOfDay(addDays(baseDate, 2));

    setLoading(true);
    Promise.all([
      fetch(`/api/calendars/${id}`).then((r) => r.json()),
      fetch(`/api/calendars/${id}/events?start=${start.toISOString()}&end=${end.toISOString()}`).then((r) => r.json()),
    ])
      .then(([cal, evts]) => {
        setCalendar(cal.data);
        setEvents(evts.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id, baseDateKey]);

  const calendarTz = calendar?.timezone || 'Asia/Macau';

  const dayKeyInTz = (d: Date) =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: calendarTz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);

  const formatTimeInTz = (d: Date) =>
    new Intl.DateTimeFormat('en-US', {
      timeZone: calendarTz,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(d);

  const days = useMemo(() => [0, 1, 2].map((offset) => addDays(baseDate, offset)), [baseDate]);

  const eventsByDay = useMemo(() => {
    const dayKeys = days.map((day) => dayKeyInTz(day));

    return dayKeys.map((dayKey) => {
      const dayEvents = events
        .filter((event) => dayKeyInTz(parseISO(event.start_at)) === dayKey)
        .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());

      return {
        dayKey,
        allDayEvents: dayEvents.filter((event) => event.all_day),
        timedEvents: dayEvents.filter((event) => !event.all_day),
      };
    });
  }, [days, events, calendarTz]);

  const hasEvents = eventsByDay.some((entry) => entry.allDayEvents.length > 0 || entry.timedEvents.length > 0);

  const memberColor = (userId: string) => {
    const idx = calendar?.calendar_members?.findIndex((m) => m.profiles.id === userId) ?? 0;
    return MEMBER_COLORS[idx % MEMBER_COLORS.length];
  };

  const shiftBaseDate = (deltaDays: number) => {
    const next = addDays(baseDate, deltaDays);
    router.push(`/calendars/${id}/3day?date=${format(next, 'yyyy-MM-dd')}`);
  };

  const getEventBlockStyle = (event: CalendarEvent) => {
    const start = parseISO(event.start_at);
    const rawEnd = event.end_at ? parseISO(event.end_at) : addHours(start, 1);
    const end = rawEnd.getTime() <= start.getTime() ? addHours(start, 1) : rawEnd;

    const startMinutes = start.getHours() * 60 + start.getMinutes();
    const endMinutes = end.getHours() * 60 + end.getMinutes();
    const durationMinutes = Math.max(endMinutes - startMinutes, 30);

    const top = (startMinutes / 60) * HOUR_HEIGHT;
    const height = Math.max((durationMinutes / 60) * HOUR_HEIGHT, 22);

    return { top, height };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-20">
      <div className="bg-white border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <CalendarSwitcher currentCalendarId={calendarId} />
            <div className="flex -space-x-1 mt-0.5">
              {calendar?.calendar_members?.slice(0, 6).map((m, i) => (
                <div
                  key={i}
                  className="w-5 h-5 rounded-full border-2 border-white overflow-hidden bg-gray-200 flex items-center justify-center"
                  style={{ backgroundColor: MEMBER_COLORS[i % MEMBER_COLORS.length] + '40' }}
                >
                  {m.profiles?.avatar_url ? (
                    <img src={m.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[8px] font-semibold" style={{ color: MEMBER_COLORS[i % MEMBER_COLORS.length] }}>
                      {m.profiles?.full_name?.[0] ?? '?'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
          <Link href="/search" className="text-gray-400 hover:text-gray-600" title="Search events">
            <Search size={20} />
          </Link>
          <Link href={`/calendars/${id}/settings`} className="text-gray-400 hover:text-gray-600">
            <Settings size={20} />
          </Link>
          <Link
            href={`/calendars/${id}/events/new?date=${baseDateKey}`}
            className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-blue-600"
          >
            <Plus size={18} />
          </Link>
        </div>

        <div className="mt-3 ml-8 flex items-center justify-between gap-3">
          <CalendarViewTabs calendarId={calendarId} active="3day" date={baseDateKey} />
          <div className="flex items-center gap-1">
            <button onClick={() => shiftBaseDate(-3)} className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100" aria-label="Previous 3 days">
              <ChevronLeft size={16} />
            </button>
            <button onClick={() => shiftBaseDate(3)} className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100" aria-label="Next 3 days">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="min-w-[680px] px-2 py-3">
          <div className="grid grid-cols-[56px_repeat(3,minmax(0,1fr))] gap-2 mb-2">
            <div />
            {days.map((day) => (
              <div key={day.toISOString()} className="bg-white border rounded-lg px-2 py-2 text-center">
                <div className="text-sm font-semibold text-gray-900">{format(day, 'EEE, MMM d')}</div>
                {isToday(day) && <div className="text-[11px] text-blue-600 font-medium mt-0.5">Today</div>}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-[56px_repeat(3,minmax(0,1fr))] gap-2 mb-2">
            <div className="text-[11px] text-gray-500 font-medium pt-2">All day</div>
            {eventsByDay.map((entry, idx) => (
              <div key={entry.dayKey + idx} className="bg-white border rounded-lg p-2 min-h-[56px] space-y-1">
                {entry.allDayEvents.length === 0 ? (
                  <div className="text-xs text-gray-400">No all-day events</div>
                ) : (
                  entry.allDayEvents.map((event) => {
                    const color = event.color || memberColor(event.profiles?.id ?? '') || calendar?.color || '#3B82F6';
                    return (
                      <Link
                        key={event.id}
                        href={`/calendars/${id}/events/${event.id}`}
                        className="block text-xs rounded px-2 py-1 text-white truncate"
                        style={{ backgroundColor: color }}
                      >
                        {event.title}
                      </Link>
                    );
                  })
                )}
              </div>
            ))}
          </div>

          {!hasEvents && (
            <div className="bg-white border rounded-lg px-4 py-3 text-sm text-gray-500 mb-2">
              No events in this 3-day range.
            </div>
          )}

          <div className="grid grid-cols-[56px_repeat(3,minmax(0,1fr))] gap-2">
            <div className="relative" style={{ height: TOTAL_HEIGHT }}>
              {Array.from({ length: 24 }).map((_, hour) => (
                <div key={hour} className="absolute left-0 right-0" style={{ top: hour * HOUR_HEIGHT }}>
                  <div className="text-[11px] text-gray-500 -translate-y-1/2">{`${hour.toString().padStart(2, '0')}:00`}</div>
                </div>
              ))}
            </div>

            {eventsByDay.map((entry, idx) => (
              <div key={entry.dayKey + '-timed-' + idx} className="relative bg-white border rounded-lg" style={{ height: TOTAL_HEIGHT }}>
                {Array.from({ length: 24 }).map((_, hour) => (
                  <div
                    key={hour}
                    className="absolute left-0 right-0 border-t border-gray-100"
                    style={{ top: hour * HOUR_HEIGHT }}
                  />
                ))}

                {entry.timedEvents.map((event) => {
                  const color = event.color || memberColor(event.profiles?.id ?? '') || calendar?.color || '#3B82F6';
                  const { top, height } = getEventBlockStyle(event);

                  return (
                    <Link
                      key={event.id}
                      href={`/calendars/${id}/events/${event.id}`}
                      className="absolute left-1.5 right-1.5 rounded-md px-2 py-1 text-xs overflow-hidden"
                      style={{
                        top,
                        minHeight: height,
                        backgroundColor: color + '22',
                        borderLeft: `3px solid ${color}`,
                      }}
                    >
                      <div className="font-semibold text-gray-900 truncate">{event.title}</div>
                      <div className="text-gray-600 truncate">
                        {formatTimeInTz(parseISO(event.start_at))}
                        {event.end_at ? ` - ${formatTimeInTz(parseISO(event.end_at))}` : ''}
                      </div>
                      {event.location && <div className="text-gray-500 truncate">{event.location}</div>}
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <BottomTabBar />
    </div>
  );
}
