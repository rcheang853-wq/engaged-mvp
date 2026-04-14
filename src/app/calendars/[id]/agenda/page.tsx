'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Settings, Calendar as CalendarIcon, Search, X, UserPlus } from 'lucide-react';
import BottomTabBar from '@/components/BottomTabBar';
import { addDays, format, isToday, parseISO, startOfDay } from 'date-fns';

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

  const selectedDate = useMemo(() => {
    const qp = searchParams.get('date');
    if (qp && /^\d{4}-\d{2}-\d{2}$/.test(qp)) return qp;
    return format(new Date(), 'yyyy-MM-dd');
  }, [searchParams]);

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

  const calColor = calendar?.color || '#2563EB';

  const viewToggleTabs = [
    { key: 'month', label: 'Month', href: `/calendars/${id}?date=${selectedDate}` },
    { key: '3day', label: '3 Days', href: `/calendars/${id}/3day?date=${selectedDate}` },
    { key: 'agenda', label: 'Agenda', href: `/calendars/${id}/agenda?date=${selectedDate}` },
  ];

  if (loading) {
    return (
      <div className="flex min-h-dvh flex-col pb-20" style={{ background: 'var(--engaged-bg)' }}>
        <div className="h-16 border-b bg-white px-4 py-3" />
        <div className="px-4 py-4 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
              {[1, 2].map((j) => (
                <div key={j} className="flex items-center gap-3 py-2">
                  <div className="w-14 h-8 bg-gray-200 rounded animate-pulse" />
                  <div className="w-2.5 h-2.5 rounded-full bg-gray-200 flex-shrink-0" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3.5 w-40 bg-gray-200 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col pb-20" style={{ background: 'var(--engaged-bg)' }}>

      {/* ── Header ── */}
      <div className="px-4 pt-3 pb-0" style={{ background: '#fff', borderBottom: '1.5px solid var(--engaged-border)', flexShrink: 0 }}>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center"
            style={{ border: '1.5px solid var(--engaged-border)' }}
          >
            <ArrowLeft size={17} style={{ color: 'var(--engaged-text2)' }} />
          </button>

          {/* Color dot + name */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: calColor }} />
            <span className="text-[20px] font-black tracking-[-0.04em] truncate" style={{ color: 'var(--engaged-text)' }}>
              {calendar?.name ?? '\u2026'}
            </span>
          </div>

          {/* Member avatars */}
          <div className="flex items-center flex-shrink-0">
            {calendar?.calendar_members?.slice(0, 4).map((m, i) => (
              <div
                key={m.user_id}
                className="w-7 h-7 rounded-full border-2 border-white overflow-hidden flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                style={{ marginLeft: i === 0 ? 0 : -8, background: MEMBER_COLORS[i % MEMBER_COLORS.length] + '30', color: MEMBER_COLORS[i % MEMBER_COLORS.length], zIndex: 10 - i }}
              >
                {m.profiles?.avatar_url
                  ? <img src={m.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                  : (m.profiles?.full_name?.[0] ?? '?').toUpperCase()}
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <Link href="/search" className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ color: 'var(--engaged-text2)' }} aria-label="Search">
            <Search size={17} />
          </Link>
          <Link href={`/calendars/${id}/settings`} className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ color: 'var(--engaged-text2)' }} aria-label="Settings">
            <Settings size={17} />
          </Link>
          <Link
            href={`/calendars/${id}/events/new?date=${selectedDate}`}
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white"
            style={{ background: 'var(--engaged-blue)' }}
            aria-label="New event"
          >
            <Plus size={17} />
          </Link>
        </div>

        {/* View toggle strip */}
        <div className="flex items-center gap-2 mt-3 pb-3">
          {viewToggleTabs.map(tab => (
            <Link
              key={tab.key}
              href={tab.href}
              className="h-[30px] px-4 rounded-full text-[13px] font-bold flex items-center flex-shrink-0"
              style={tab.key === 'agenda'
                ? { background: 'var(--engaged-blue)', color: '#fff' }
                : { background: '#fff', border: '1.5px solid var(--engaged-border)', color: 'var(--engaged-text2)' }}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>

      {/* ── Agenda Content ── */}
      <div className="flex-1 overflow-y-auto">
        {groupedEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-5" style={{ background: 'var(--engaged-blue-lt)' }}>
              <CalendarIcon size={32} style={{ color: 'var(--engaged-blue)' }} />
            </div>
            <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--engaged-text)' }}>Nothing coming up</h2>
            <p className="text-sm mb-6 max-w-xs" style={{ color: 'var(--engaged-text2)' }}>
              Your schedule is clear for the next 90 days. Add an event to get started.
            </p>
            <Link
              href={`/calendars/${id}/events/new?date=${selectedDate}`}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'var(--engaged-blue)' }}
            >
              Add Event
            </Link>
          </div>
        ) : (
          <div>
            {groupedEvents.map((group) => {
              const dateObj = parseISO(`${group.date}T00:00:00`);
              const isTodayGroup = isToday(dateObj);
              const allEventsInGroup = [...group.allDayEvents, ...group.timedEvents];

              return (
                <div key={group.date} style={{ padding: '0 16px', marginBottom: 4 }}>
                  {/* Sticky date header */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 0 6px',
                      borderBottom: '1.5px solid var(--engaged-border)',
                      position: 'sticky',
                      top: 0,
                      background: 'var(--engaged-bg)',
                      zIndex: 10,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 22,
                        fontWeight: 900,
                        letterSpacing: '-0.04em',
                        width: 36,
                        textAlign: 'center',
                        lineHeight: 1,
                        color: isTodayGroup ? 'var(--engaged-blue)' : 'var(--engaged-text)',
                      }}
                    >
                      {format(dateObj, 'd')}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--engaged-text2)' }}>
                        {format(dateObj, 'EEEE')}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--engaged-text3)' }}>
                        {format(dateObj, 'MMMM yyyy')}
                      </div>
                    </div>
                    {isTodayGroup && (
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: 'var(--engaged-blue)',
                          background: 'var(--engaged-blue-lt)',
                          padding: '2px 8px',
                          borderRadius: 20,
                        }}
                      >
                        Today
                      </div>
                    )}
                  </div>

                  {/* Event rows */}
                  {allEventsInGroup.map((evt) => {
                    const eventColor = evt.color || memberColor(evt.profiles?.id ?? '') || calColor;
                    const startDate = parseISO(evt.start_at);
                    const endDate = evt.end_at ? parseISO(evt.end_at) : null;

                    return (
                      <Link
                        key={evt.id}
                        href={`/calendars/${id}/events/${evt.id}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: '10px 0',
                          borderBottom: '1px solid var(--engaged-border)',
                          textDecoration: 'none',
                        }}
                      >
                        {/* Time column */}
                        <div style={{ width: 60, flexShrink: 0, textAlign: 'right' }}>
                          {evt.all_day ? (
                            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--engaged-text2)' }}>All day</span>
                          ) : (
                            <>
                              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--engaged-text2)' }}>
                                {formatTimeInTz(startDate)}
                              </div>
                              {endDate && (
                                <div style={{ fontSize: 10, color: 'var(--engaged-text3)', marginTop: 1 }}>
                                  {formatTimeInTz(endDate)}
                                </div>
                              )}
                            </>
                          )}
                        </div>

                        {/* Color dot */}
                        <div
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            background: eventColor,
                            flexShrink: 0,
                          }}
                        />

                        {/* Event info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--engaged-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {evt.title}
                          </div>
                          {evt.location && (
                            <div style={{ fontSize: 12, color: 'var(--engaged-text2)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {evt.location}
                            </div>
                          )}
                        </div>
                      </Link>
                    );
                  })}
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
