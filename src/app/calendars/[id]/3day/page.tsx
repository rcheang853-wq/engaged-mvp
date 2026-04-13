'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, Settings, Search } from 'lucide-react';
import { addDays, addHours, endOfDay, format, isToday, parseISO, startOfDay } from 'date-fns';
import BottomTabBar from '@/components/BottomTabBar';

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
const HOUR_HEIGHT = 56; // matches mockup
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

  const calColor = calendar?.color || '#2563EB';

  const viewToggleTabs = [
    { key: 'month', label: 'Month', href: `/calendars/${id}?date=${baseDateKey}` },
    { key: '3day', label: '3 Days', href: `/calendars/${id}/3day?date=${baseDateKey}` },
    { key: 'agenda', label: 'Agenda', href: `/calendars/${id}/agenda?date=${baseDateKey}` },
  ];

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center" style={{ background: 'var(--engaged-bg)' }}>
        <div className="animate-spin w-6 h-6 border-2 border-t-transparent rounded-full" style={{ borderColor: 'var(--engaged-blue)', borderTopColor: 'transparent' }} />
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
            href={`/calendars/${id}/events/new?date=${baseDateKey}`}
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white"
            style={{ background: 'var(--engaged-blue)' }}
            aria-label="New event"
          >
            <Plus size={17} />
          </Link>
        </div>

        {/* View toggle strip + nav arrows */}
        <div className="flex items-center justify-between gap-2 mt-3 pb-3">
          <div className="flex items-center gap-2">
            {viewToggleTabs.map(tab => (
              <Link
                key={tab.key}
                href={tab.href}
                className="h-[30px] px-4 rounded-full text-[13px] font-bold flex items-center flex-shrink-0"
                style={tab.key === '3day'
                  ? { background: 'var(--engaged-blue)', color: '#fff' }
                  : { background: '#fff', border: '1.5px solid var(--engaged-border)', color: 'var(--engaged-text2)' }}
              >
                {tab.label}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => shiftBaseDate(-3)}
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ border: '1.5px solid var(--engaged-border)', color: 'var(--engaged-text2)' }}
              aria-label="Previous 3 days"
            >
              <ChevronLeft size={15} />
            </button>
            <button
              onClick={() => shiftBaseDate(3)}
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ border: '1.5px solid var(--engaged-border)', color: 'var(--engaged-text2)' }}
              aria-label="Next 3 days"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Day header columns ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '40px 1fr 1fr 1fr',
          background: '#fff',
          borderBottom: '1.5px solid var(--engaged-border)',
          flexShrink: 0,
        }}
      >
        <div style={{ width: 40 }} />
        {days.map((day) => {
          const today = isToday(day);
          return (
            <div key={day.toISOString()} style={{ textAlign: 'center', padding: '6px 4px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--engaged-text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {format(day, 'EEE')}
              </div>
              {today ? (
                <div
                  style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: 'var(--engaged-blue)', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '2px auto', fontSize: 16, fontWeight: 900, letterSpacing: '-0.03em',
                  }}
                >
                  {format(day, 'd')}
                </div>
              ) : (
                <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--engaged-text)', lineHeight: 1.3 }}>
                  {format(day, 'd')}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── All-day events row ── */}
      {eventsByDay.some(e => e.allDayEvents.length > 0) && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '40px 1fr 1fr 1fr',
            background: '#fff',
            borderBottom: '1.5px solid var(--engaged-border)',
            flexShrink: 0,
          }}
        >
          <div style={{ paddingRight: 8, paddingTop: 6, textAlign: 'right' }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--engaged-text3)' }}>All day</span>
          </div>
          {eventsByDay.map((entry, idx) => (
            <div key={entry.dayKey + '-allday-' + idx} style={{ padding: '4px 2px', minHeight: 28 }}>
              {entry.allDayEvents.map(event => {
                const color = event.color || memberColor(event.profiles?.id ?? '') || calColor;
                return (
                  <Link
                    key={event.id}
                    href={`/calendars/${id}/events/${event.id}`}
                    style={{
                      display: 'block', fontSize: 10, fontWeight: 700,
                      padding: '2px 6px', borderRadius: 6, color: '#fff',
                      background: color, marginBottom: 2,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      textDecoration: 'none',
                    }}
                  >
                    {event.title}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* ── Timed grid ── */}
      <div className="flex-1 overflow-auto">
        <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 1fr 1fr', minHeight: TOTAL_HEIGHT }}>
          {/* Hour labels */}
          <div style={{ position: 'relative', height: TOTAL_HEIGHT }}>
            {Array.from({ length: 24 }).map((_, hour) => (
              <div
                key={hour}
                style={{
                  position: 'absolute', left: 0, right: 0,
                  top: hour * HOUR_HEIGHT,
                  paddingRight: 8, textAlign: 'right',
                  fontSize: 10, fontWeight: 600, color: 'var(--engaged-text3)',
                  lineHeight: 1,
                }}
              >
                {hour === 0 ? '' : `${hour < 12 ? hour : hour === 12 ? 12 : hour - 12}${hour < 12 ? 'am' : 'pm'}`}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {eventsByDay.map((entry, idx) => (
            <div
              key={entry.dayKey + '-timed-' + idx}
              style={{
                position: 'relative',
                height: TOTAL_HEIGHT,
                borderLeft: '1px solid var(--engaged-border)',
              }}
            >
              {/* Hour lines */}
              {Array.from({ length: 24 }).map((_, hour) => (
                <div
                  key={hour}
                  style={{
                    position: 'absolute', left: 0, right: 0,
                    top: hour * HOUR_HEIGHT,
                    borderTop: `1px solid var(--engaged-border)`,
                    height: HOUR_HEIGHT,
                  }}
                />
              ))}

              {/* Events */}
              {entry.timedEvents.map((event) => {
                const color = event.color || memberColor(event.profiles?.id ?? '') || calColor;
                const { top, height } = getEventBlockStyle(event);
                return (
                  <Link
                    key={event.id}
                    href={`/calendars/${id}/events/${event.id}`}
                    style={{
                      position: 'absolute',
                      left: 2, right: 2,
                      top,
                      minHeight: height,
                      borderRadius: 8,
                      padding: '3px 6px',
                      fontSize: 10, fontWeight: 700,
                      color: '#fff',
                      background: color,
                      overflow: 'hidden',
                      textDecoration: 'none',
                    }}
                  >
                    <div style={{ fontSize: 9, fontWeight: 600, opacity: 0.85, marginBottom: 1 }}>
                      {formatTimeInTz(parseISO(event.start_at))}
                    </div>
                    <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {event.title}
                    </div>
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <BottomTabBar />
    </div>
  );
}
