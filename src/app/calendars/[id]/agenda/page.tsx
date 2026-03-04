'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Settings, Calendar as CalendarIcon, Search, UserPlus } from 'lucide-react';
import BottomTabBar from '@/components/BottomTabBar';
import CalendarSwitcher from '@/components/CalendarSwitcher';
import CalendarViewTabs from '@/components/calendar/calendar-view-tabs';
import { addDays, format, isToday, isTomorrow, parseISO, startOfDay } from 'date-fns';

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

interface GroupedEvents {
  date: string;
  allDayEvents: CalendarEvent[];
  timedEvents: CalendarEvent[];
}

const MEMBER_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function CalendarAgendaPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [calendar, setCalendar] = useState<SharedCalendar | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const calendarId = Array.isArray(id) ? id[0] : id;

  useEffect(() => {
    const today = new Date();
    const startDate = startOfDay(today);
    const endDate = addDays(startDate, 90);

    Promise.all([
      fetch(`/api/calendars/${id}`).then((r) => r.json()),
      fetch(`/api/calendars/${id}/events?start=${startDate.toISOString()}&end=${endDate.toISOString()}`).then((r) => r.json()),
    ])
      .then(([cal, evts]) => {
        setCalendar(cal.data);
        setEvents(evts.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

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

  const groupedEvents: GroupedEvents[] = useMemo(() => {
    const grouped = new Map<string, GroupedEvents>();

    for (const event of events) {
      const eventDate = parseISO(event.start_at);
      const dayKey = dayKeyInTz(eventDate);
      const group = grouped.get(dayKey) ?? { date: dayKey, allDayEvents: [], timedEvents: [] };

      if (event.all_day) {
        group.allDayEvents.push(event);
      } else {
        group.timedEvents.push(event);
      }

      grouped.set(dayKey, group);
    }

    return Array.from(grouped.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((group) => ({
        ...group,
        allDayEvents: group.allDayEvents.sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()),
        timedEvents: group.timedEvents.sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()),
      }));
  }, [events, calendarTz]);

  const memberColor = (userId: string) => {
    const idx = calendar?.calendar_members?.findIndex((m) => m.profiles.id === userId) ?? 0;
    return MEMBER_COLORS[idx % MEMBER_COLORS.length];
  };

  const formatEventTime = (event: CalendarEvent) => {
    const start = parseISO(event.start_at);
    const end = event.end_at ? parseISO(event.end_at) : null;

    if (end) {
      return `${formatTimeInTz(start)} - ${formatTimeInTz(end)}`;
    }

    return formatTimeInTz(start);
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
          <Link
            href={`/calendars/${id}?members=1`}
            className="text-gray-400 hover:text-gray-600"
            title="Invite members"
            aria-label="Invite members"
          >
            <UserPlus size={20} />
          </Link>
          <Link href={`/calendars/${id}/settings`} className="text-gray-400 hover:text-gray-600" title="Settings">
            <Settings size={20} />
          </Link>
          <Link
            href={`/calendars/${id}/events/new`}
            className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-blue-600"
          >
            <Plus size={18} />
          </Link>
        </div>
        <CalendarViewTabs
          calendarId={calendarId}
          active="agenda"
          date={searchParams.get('date') ?? undefined}
          className="mt-3 ml-8"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {groupedEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
              <CalendarIcon size={28} className="text-blue-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-800 mb-1">No upcoming events</h2>
            <p className="text-gray-500 text-sm mb-6">Add events to see them here</p>
            <Link
              href={`/calendars/${id}/events/new${searchParams.get('date') ? `?date=${encodeURIComponent(String(searchParams.get('date')))}` : ''}`}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-600"
            >
              Add Event
            </Link>
          </div>
        ) : (
          <div className="px-4 py-4 space-y-4">
            {groupedEvents.map((group) => {
              const dateObj = parseISO(`${group.date}T00:00:00`);
              const dayLabel = isToday(dateObj)
                ? 'Today'
                : isTomorrow(dateObj)
                  ? 'Tomorrow'
                  : format(dateObj, 'EEE, MMM d');

              return (
                <div key={group.date} className="space-y-2">
                  <div className={`text-sm font-bold mb-2 ${dayLabel === 'Today' ? 'text-blue-600' : 'text-gray-900'}`}>
                    {dayLabel}
                  </div>

                  <div className="space-y-2">
                    {group.allDayEvents.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">All-day</div>
                        {group.allDayEvents.map((evt) => {
                          const eventColor = evt.color || memberColor(evt.profiles?.id ?? '') || calendar?.color || '#3B82F6';
                          return (
                            <Link
                              key={evt.id}
                              href={`/calendars/${id}/events/${evt.id}`}
                              className="block bg-white rounded-xl p-3 shadow-sm border-l-4"
                              style={{ borderLeftColor: eventColor }}
                            >
                              <div className="flex items-start gap-3">
                                <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: eventColor }} />
                                <div className="min-w-0 flex-1">
                                  <div className="text-xs text-gray-500">All day</div>
                                  <h3 className="font-semibold text-gray-900 truncate">{evt.title}</h3>
                                  {evt.location && <p className="text-sm text-gray-500 truncate mt-0.5">{evt.location}</p>}
                                </div>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    )}

                    {group.timedEvents.map((evt) => {
                      const eventColor = evt.color || memberColor(evt.profiles?.id ?? '') || calendar?.color || '#3B82F6';

                      return (
                        <Link
                          key={evt.id}
                          href={`/calendars/${id}/events/${evt.id}`}
                          className="block bg-white rounded-xl p-3 shadow-sm border-l-4"
                          style={{ borderLeftColor: eventColor }}
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: eventColor }} />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-gray-600">{formatEventTime(evt)}</div>
                              <h3 className="font-semibold text-gray-900 truncate">{evt.title}</h3>
                              {evt.location && <p className="text-sm text-gray-500 truncate mt-0.5">{evt.location}</p>}
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BottomTabBar />
    </div>
  );
}
