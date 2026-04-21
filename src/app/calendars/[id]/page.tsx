'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ChevronLeft, ChevronRight, Plus, Settings,
  List, Grid3x3, CalendarDays,
} from 'lucide-react';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek, isSameMonth, isSameDay, isToday,
  addMonths, subMonths, parseISO,
} from 'date-fns';
import BottomTabBar from '@/components/BottomTabBar';

// ── Types ────────────────────────────────────────────────────────────────────

interface CalendarEvent {
  id: string;
  title: string;
  start_at: string;
  end_at: string;
  all_day: boolean;
  color: string | null;
  creator: { full_name: string; avatar_url: string | null } | null;
}

interface CalendarMember {
  user_id: string;
  role: string;
  profiles: { full_name: string; avatar_url: string | null };
}

interface SharedCalendar {
  id: string;
  name: string;
  color: string;
  calendar_members: CalendarMember[];
}

type View = 'month' | '3day' | 'agenda';

// ── Artwork helper ──────────────────────────────────────────────────────────

const ARTWORK_MAP: [RegExp, string][] = [
  [/gym|sport|boulder|climb|bike|cycle|run|jog|swim|hike|trail|volleyball|football|basketball|tennis/i, '/artworks/bicycle_art.png'],
  [/music|band|guitar|rehearsal|concert|gig|jam|sing/i,  '/artworks/guitar_music.png'],
  [/food|eat|brunch|lunch|dinner|breakfast|restaurant|cafe|drink|coffee|beer|wine|sake|bar/i, '/artworks/food_plate.png'],
  [/movie|film|cinema|show|watch/i,  '/artworks/camera_spotlight.png'],
  [/photo|camera|shoot|photography/i, '/artworks/camera_spotlight.png'],
  [/hike|walk|trail|outdoor/i,        '/artworks/walking_woman.png'],
  [/party|birthday|celebrate|gathering/i, '/artworks/flower_cluster.png'],
];

function artworkForTitle(title: string): string {
  for (const [re, src] of ARTWORK_MAP) {
    if (re.test(title)) return src;
  }
  return '/artworks/walking_man.png';
}

// ── Colour helpers ───────────────────────────────────────────────────────────

const MEMBER_COLORS = [
  { bg: '#FDE68A', fg: '#92400E' },
  { bg: '#BBF7D0', fg: '#166534' },
  { bg: '#BFDBFE', fg: '#1E40AF' },
  { bg: '#EDE9FE', fg: '#5B21B6' },
  { bg: '#FCE7F3', fg: '#9D174D' },
];

function eventBadgeStyle(color: string | null) {
  const c = color ?? '#2563EB';
  const map: Record<string, { bg: string; text: string }> = {
    '#22C55E': { bg: '#F0FDF4', text: '#166534' },
    '#8B5CF6': { bg: '#F5F3FF', text: '#5B21B6' },
    '#EC4899': { bg: '#FDF2F8', text: '#9D174D' },
    '#F59E0B': { bg: '#FFFBEB', text: '#92400E' },
    '#14B8A6': { bg: '#F0FDFA', text: '#0F766E' },
    '#F97316': { bg: '#FFF7ED', text: '#C2410C' },
  };
  return map[c] ?? { bg: '#EEF4FF', text: '#1E40AF' };
}

// ── Main component ───────────────────────────────────────────────────────────

export default function CalendarDetailPage() {
  const params   = useParams();
  const router   = useRouter();
  const calId    = params?.id as string;

  const [calendar, setCalendar]         = useState<SharedCalendar | null>(null);
  const [events, setEvents]             = useState<CalendarEvent[]>([]);
  const [loading, setLoading]           = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay]   = useState(new Date());
  const [view, setView]                 = useState<View>('month');
  const [sheetEvent, setSheetEvent]     = useState<CalendarEvent | null>(null);
  const [showHolidays, setShowHolidays] = useState(false);
  const [isDesktop, setIsDesktop]       = useState(false);

  // Responsive detection
  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Fetch calendar + events
  useEffect(() => {
    if (!calId) return;
    Promise.all([
      fetch(`/api/calendars/${calId}`).then(r => r.json()),
      fetch(`/api/calendars/${calId}/events`).then(r => r.json()),
    ]).then(([calData, evtData]) => {
      setCalendar(calData.data ?? null);
      setEvents(evtData.data ?? []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [calId]);

  // Build month grid days (includes leading/trailing days from adjacent months)
  const gridDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth));
    const end   = endOfWeek(endOfMonth(currentMonth));
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  // Events by date key
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    events.forEach(ev => {
      const key = format(parseISO(ev.start_at), 'yyyy-MM-dd');
      (map[key] ??= []).push(ev);
    });
    return map;
  }, [events]);

  // Upcoming events (from today, sorted)
  const upcoming = useMemo(() => {
    const now = new Date();
    return [...events]
      .filter(ev => parseISO(ev.start_at) >= now)
      .sort((a, b) => parseISO(a.start_at).getTime() - parseISO(b.start_at).getTime())
      .slice(0, 10);
  }, [events]);

  const accentColor = calendar?.color ?? '#2563EB';

  if (loading) return <KobeLoader />;
  if (!calendar) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--engaged-bg)' }}>
      <p style={{ color: 'var(--engaged-text2)' }}>Calendar not found</p>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col pb-16" style={{ background: 'var(--engaged-bg)' }}>

      {/* ── Header ── */}
      <div className="sticky top-0 z-30 px-4 pt-10 pb-1" style={{ background: 'var(--engaged-bg)' }}>

        {/* Row 1: Title */}
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: '#fff', border: '1.5px solid var(--engaged-border)' }}
          >
            <ChevronLeft size={16} />
          </button>

          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: accentColor }} />
          <h1 className="flex-1 text-xl font-black tracking-[-0.04em] truncate" style={{ color: 'var(--engaged-text)' }}>
            {calendar.name}
          </h1>

          <button
            onClick={() => router.push(`/calendars/${calId}/settings`)}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: '#fff', border: '1.5px solid var(--engaged-border)' }}
          >
            <Settings size={15} style={{ color: 'var(--engaged-text2)' }} />
          </button>
        </div>

        {/* Row 2: Members + "+ Add" */}
        <div className="flex items-center gap-0 px-1 mb-3">
          {/* Overlapping avatars */}
          {calendar.calendar_members?.slice(0, 5).map((m, i) => {
            const c = MEMBER_COLORS[i % MEMBER_COLORS.length];
            return (
              <div
                key={m.user_id}
                className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold overflow-hidden flex-shrink-0"
                style={{
                  background: m.profiles?.avatar_url ? undefined : c.bg,
                  color: c.fg,
                  border: '2px solid var(--engaged-bg)',
                  marginRight: '-6px',
                  zIndex: 5 - i,
                  position: 'relative',
                }}
              >
                {m.profiles?.avatar_url ? (
                  <img src={m.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  (m.profiles?.full_name?.[0] ?? '?').toUpperCase()
                )}
              </div>
            );
          })}

          {/* + Add button */}
          <button
            onClick={() => router.push(`/calendars/${calId}/settings`)}
            className="flex items-center gap-1 h-6 px-2 rounded-full text-[11px] font-bold flex-shrink-0"
            style={{
              background: 'var(--engaged-blue)',
              color: '#fff',
              marginLeft: 14,
              border: 'none',
            }}
          >
            <Plus size={10} strokeWidth={3} />
            Add
          </button>

          <span className="text-[12px] ml-3 flex-shrink-0" style={{ color: 'var(--engaged-text3)' }}>
            {calendar.calendar_members?.length ?? 0} members
          </span>
        </div>

        {/* Row 3: View toggle */}
        <div className="flex items-center gap-1.5 mb-1">
          {([
            { id: 'month'  as View, icon: Grid3x3,      label: 'Month'  },
            { id: '3day'   as View, icon: CalendarDays,  label: '3 Days' },
            { id: 'agenda' as View, icon: List,           label: 'Agenda' },
          ] as const).map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setView(id)}
              className="flex items-center gap-[5px] h-[30px] px-3 rounded-[15px] text-[12px] font-bold transition-all"
              style={{
                background: view === id ? 'var(--engaged-blue)' : '#fff',
                color: view === id ? '#fff' : 'var(--engaged-text2)',
                border: `1.5px solid ${view === id ? 'var(--engaged-blue)' : 'var(--engaged-border)'}`,
              }}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}

          <div style={{ flex: 1 }} />

          {/* Add event */}
          <button
            onClick={() => router.push(`/calendars/${calId}/events/new`)}
            className="flex items-center gap-1 h-[30px] px-3 rounded-[15px] text-[12px] font-bold"
            style={{ background: 'var(--engaged-blue-lt)', color: 'var(--engaged-blue)', border: 'none' }}
          >
            <Plus size={12} strokeWidth={2.5} />
            Event
          </button>
        </div>
      </div>

      {/* ── View: Month ── */}
      {view === 'month' && (
        <div className="flex-1 overflow-y-auto">
          {/* Month navigator */}
          <div className="flex items-center justify-between px-4 py-2">
            <div className="flex items-center gap-2">
              <span className="text-[22px] font-black tracking-[-0.04em]" style={{ color: 'var(--engaged-text)' }}>
                {format(currentMonth, 'MMMM')}
              </span>
              <span className="text-sm font-semibold" style={{ color: 'var(--engaged-text2)' }}>
                {format(currentMonth, 'yyyy')}
              </span>

              {/* Compact holidays toggle */}
              <button
                onClick={() => setShowHolidays(h => !h)}
                className="flex items-center gap-1 h-6 px-2 rounded-full text-[10px] font-bold transition-all"
                style={{
                  background: showHolidays ? '#FFFBEB' : '#fff',
                  color: showHolidays ? '#92400E' : 'var(--engaged-text3)',
                  border: `1px solid ${showHolidays ? '#FDE68A' : 'var(--engaged-border)'}`,
                }}
              >
                {showHolidays ? '\uD83C\uDF89' : '\uD83C\uDF89'} Holidays
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setCurrentMonth(m => subMonths(m, 1))}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: '#fff', border: '1.5px solid var(--engaged-border)' }}
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => setCurrentMonth(m => addMonths(m, 1))}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: '#fff', border: '1.5px solid var(--engaged-border)' }}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          {/* Day-of-week labels */}
          <div className="grid grid-cols-7 px-3 mb-1">
            {['S','M','T','W','T','F','S'].map((d, i) => (
              <div key={i} className="text-center text-[11px] font-bold py-1" style={{ color: 'var(--engaged-text3)' }}>{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-[3px] px-3">
            {gridDays.map(day => {
              const key     = format(day, 'yyyy-MM-dd');
              const dayEvts = eventsByDate[key] ?? [];
              const inMonth = isSameMonth(day, currentMonth);
              const todayDay = isToday(day);
              const sel     = isSameDay(day, selectedDay);

              return (
                <button
                  key={key}
                  onClick={() => setSelectedDay(day)}
                  className="flex flex-col items-center rounded-xl py-1 px-0.5"
                  style={{
                    background: sel ? 'var(--engaged-blue-lt)' : 'transparent',
                    minHeight: isDesktop ? 72 : undefined,
                    aspectRatio: isDesktop ? undefined : '0.85',
                  }}
                >
                  {/* Day number */}
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[13px] font-bold flex-shrink-0"
                    style={{
                      background: todayDay ? accentColor : 'transparent',
                      color: todayDay
                        ? '#fff'
                        : inMonth
                          ? 'var(--engaged-text)'
                          : 'var(--engaged-border)',  /* grey for prev/next month */
                    }}
                  >
                    {format(day, 'd')}
                  </div>

                  {/* Mobile: event title chips (not dots) */}
                  {!isDesktop && dayEvts.length > 0 && inMonth && (
                    <div className="w-full mt-[2px] space-y-[1px] overflow-hidden" style={{ maxHeight: 28 }}>
                      {dayEvts.slice(0, 2).map(ev => (
                        <div
                          key={ev.id}
                          className="w-full rounded-[3px] px-[2px] text-[8px] font-bold leading-[10px] truncate"
                          style={{
                            background: ev.color ?? accentColor,
                            color: '#fff',
                          }}
                        >
                          {ev.title}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Desktop: larger chips with title */}
                  {isDesktop && dayEvts.length > 0 && inMonth && (
                    <div className="w-full mt-1 space-y-0.5 overflow-hidden flex-1">
                      {dayEvts.slice(0, 3).map(ev => (
                        <div
                          key={ev.id}
                          className="w-full rounded-[4px] px-1 text-[9px] font-bold leading-[12px] truncate"
                          style={{
                            background: ev.color ?? accentColor,
                            color: '#fff',
                          }}
                        >
                          {ev.title}
                        </div>
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Artwork divider */}
          <div className="relative h-20 mx-4 mt-2 overflow-hidden flex items-end justify-between">
            <img src="/artworks/walking_man.png"  alt="" aria-hidden className="h-20 w-auto opacity-60" />
            <img src="/artworks/bicycle_art.png"  alt="" aria-hidden className="h-20 w-auto opacity-60" />
          </div>

          {/* Upcoming events — desktop only */}
          {isDesktop && (
            <div className="px-4 pb-6">
              <h3 className="text-base font-black tracking-tight mb-3 mt-1" style={{ color: 'var(--engaged-text)' }}>
                Upcoming Events
              </h3>
              {upcoming.length === 0 ? (
                <p className="text-sm text-center py-8" style={{ color: 'var(--engaged-text2)' }}>No upcoming events</p>
              ) : (
                upcoming.map(ev => (
                  <EventRow key={ev.id} event={ev} calColor={accentColor} onClick={() => setSheetEvent(ev)} />
                ))
              )}
            </div>
          )}

          {/* Mobile: bottom padding only */}
          {!isDesktop && <div className="h-6" />}
        </div>
      )}

      {/* ── View: 3-Day ── */}
      {view === '3day' && (
        <ThreeDayView
          baseDate={selectedDay}
          eventsByDate={eventsByDate}
          accentColor={accentColor}
          onEventClick={setSheetEvent}
        />
      )}

      {/* ── View: Agenda ── */}
      {view === 'agenda' && (
        <AgendaView
          events={events}
          accentColor={accentColor}
          onEventClick={setSheetEvent}
        />
      )}

      {/* ── FAB ── */}
      <button
        onClick={() => router.push(`/calendars/${calId}/events/new`)}
        className="fixed right-4 bottom-[80px] w-14 h-14 rounded-full flex items-center justify-center z-40"
        style={{
          background: accentColor,
          boxShadow: `0 6px 24px ${accentColor}66`,
        }}
        aria-label="Add event"
      >
        <Plus size={24} color="#fff" strokeWidth={2.5} />
      </button>

      {/* ── Event bottom sheet ── */}
      {sheetEvent && (
        <EventSheet event={sheetEvent} onClose={() => setSheetEvent(null)} />
      )}

      <BottomTabBar />
    </div>
  );
}

// ── Event row (for month upcoming list) ─────────────────────────────────────

function EventRow({
  event, calColor, onClick,
}: {
  event: CalendarEvent;
  calColor: string;
  onClick: () => void;
}) {
  const start  = parseISO(event.start_at);
  const artSrc = artworkForTitle(event.title);

  return (
    <button
      onClick={onClick}
      className="flex items-start gap-3 w-full mb-3 text-left"
    >
      {/* Date column */}
      <div className="w-10 flex-shrink-0 text-center">
        <div className="text-[11px] font-bold uppercase" style={{ color: 'var(--engaged-text3)' }}>
          {format(start, 'EEE')}
        </div>
        <div className="text-[22px] font-black leading-none" style={{ color: event.color ?? calColor }}>
          {format(start, 'd')}
        </div>
      </div>

      {/* Card */}
      <div
        className="flex-1 rounded-[14px] p-3 flex items-center gap-2 min-w-0"
        style={{
          background: '#fff',
          border: '1.5px solid var(--engaged-border)',
          borderLeft: `4px solid ${event.color ?? calColor}`,
        }}
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold truncate" style={{ color: 'var(--engaged-text)' }}>{event.title}</p>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--engaged-text2)' }}>
            {event.all_day
              ? 'All day'
              : event.end_at
                ? `${format(start, 'HH:mm')} \u2013 ${format(parseISO(event.end_at), 'HH:mm')}`
                : format(start, 'HH:mm')}
          </p>
        </div>
        {/* Smart artwork thumbnail */}
        <div className="relative w-10 h-10 flex-shrink-0 overflow-visible">
          <img
            src={artSrc}
            alt=""
            aria-hidden
            className="absolute bottom-[-4px] right-[-4px] h-12 w-auto"
          />
        </div>
      </div>
    </button>
  );
}

// ── 3-Day View ───────────────────────────────────────────────────────────────

function ThreeDayView({
  baseDate, eventsByDate, accentColor, onEventClick,
}: {
  baseDate: Date;
  eventsByDate: Record<string, CalendarEvent[]>;
  accentColor: string;
  onEventClick: (ev: CalendarEvent) => void;
}) {
  const days = [0, 1, 2].map(offset => {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + offset);
    return d;
  });
  const HOURS = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Column headers */}
      <div className="grid grid-cols-[40px_1fr_1fr_1fr] border-b" style={{ borderColor: 'var(--engaged-border)', flexShrink: 0 }}>
        <div />
        {days.map(d => (
          <div key={d.toISOString()} className="text-center py-2">
            <div className="text-[10px] font-bold uppercase" style={{ color: 'var(--engaged-text3)' }}>
              {format(d, 'EEE')}
            </div>
            <div
              className="w-8 h-8 mx-auto rounded-full flex items-center justify-center text-[16px] font-black"
              style={{
                background: isToday(d) ? accentColor : 'transparent',
                color: isToday(d) ? '#fff' : 'var(--engaged-text)',
              }}
            >
              {format(d, 'd')}
            </div>
          </div>
        ))}
      </div>

      {/* Hour rows */}
      <div className="flex-1 overflow-y-auto">
        {HOURS.map(h => (
          <div key={h} className="grid grid-cols-[40px_1fr_1fr_1fr]" style={{ height: 56 }}>
            <div
              className="text-right pr-2 text-[10px] font-semibold"
              style={{ color: 'var(--engaged-text3)', lineHeight: '56px' }}
            >
              {h === 0 ? '' : h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`}
            </div>
            {days.map(d => {
              const key   = format(d, 'yyyy-MM-dd');
              const dayEvts = (eventsByDate[key] ?? []).filter(ev => {
                const hour = parseISO(ev.start_at).getHours();
                return hour === h;
              });
              return (
                <div
                  key={key}
                  className="relative border-t"
                  style={{ borderColor: 'var(--engaged-border)' }}
                >
                  {dayEvts.map(ev => (
                    <button
                      key={ev.id}
                      onClick={() => onEventClick(ev)}
                      className="absolute inset-x-1 top-1 rounded-[6px] px-1.5 py-0.5 text-left z-10"
                      style={{
                        background: ev.color ?? accentColor,
                        color: '#fff',
                        fontSize: 10,
                        fontWeight: 700,
                      }}
                    >
                      {ev.title}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Agenda View ──────────────────────────────────────────────────────────────

function AgendaView({
  events, accentColor, onEventClick,
}: {
  events: CalendarEvent[];
  accentColor: string;
  onEventClick: (ev: CalendarEvent) => void;
}) {
  const sorted = useMemo(() => {
    const grouped: Record<string, CalendarEvent[]> = {};
    [...events]
      .sort((a, b) => parseISO(a.start_at).getTime() - parseISO(b.start_at).getTime())
      .forEach(ev => {
        const key = format(parseISO(ev.start_at), 'yyyy-MM-dd');
        (grouped[key] ??= []).push(ev);
      });
    return grouped;
  }, [events]);

  const dateKeys = Object.keys(sorted);

  if (dateKeys.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm" style={{ color: 'var(--engaged-text2)' }}>No events yet</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 pb-6">
      {dateKeys.map(dateKey => {
        const date = parseISO(dateKey);
        const dayEvts = sorted[dateKey];
        return (
          <div key={dateKey} className="mb-4">
            {/* Date header */}
            <div
              className="flex items-center gap-3 py-3 sticky top-0 z-10"
              style={{ background: 'var(--engaged-bg)', borderBottom: '1.5px solid var(--engaged-border)' }}
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-lg font-black flex-shrink-0"
                style={{
                  background: isToday(date) ? accentColor : 'var(--engaged-blue-lt)',
                  color: isToday(date) ? '#fff' : accentColor,
                }}
              >
                {format(date, 'd')}
              </div>
              <div>
                <div className="text-[13px] font-bold" style={{ color: 'var(--engaged-text)' }}>
                  {isToday(date) ? 'Today' : format(date, 'EEEE')}
                </div>
                <div className="text-[11px]" style={{ color: 'var(--engaged-text3)' }}>
                  {format(date, 'MMMM yyyy')}
                </div>
              </div>
            </div>

            {/* Events */}
            {dayEvts.map(ev => {
              const start  = parseISO(ev.start_at);
              const artSrc = artworkForTitle(ev.title);
              return (
                <button
                  key={ev.id}
                  onClick={() => onEventClick(ev)}
                  className="flex items-center gap-3 w-full py-2.5 text-left border-b"
                  style={{ borderColor: 'var(--engaged-border)' }}
                >
                  {/* Time */}
                  <div className="w-14 flex-shrink-0 text-right">
                    <div className="text-[12px] font-bold" style={{ color: 'var(--engaged-text2)' }}>
                      {ev.all_day ? 'All day' : format(start, 'HH:mm')}
                    </div>
                    {!ev.all_day && ev.end_at && (
                      <div className="text-[10px]" style={{ color: 'var(--engaged-text3)' }}>
                        {format(parseISO(ev.end_at), 'HH:mm')}
                      </div>
                    )}
                  </div>

                  {/* Dot */}
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: ev.color ?? accentColor }} />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-bold truncate" style={{ color: 'var(--engaged-text)' }}>
                      {ev.title}
                    </div>
                  </div>

                  {/* Artwork */}
                  <div className="relative w-9 h-9 overflow-visible flex-shrink-0">
                    <img src={artSrc} alt="" aria-hidden className="absolute bottom-[-2px] right-[-2px] h-10 w-auto" />
                  </div>
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ── Event bottom sheet ───────────────────────────────────────────────────────

function EventSheet({ event, onClose }: { event: CalendarEvent; onClose: () => void }) {
  const start  = parseISO(event.start_at);
  const end    = event.end_at ? parseISO(event.end_at) : null;  // end_at is optional
  const artSrc = artworkForTitle(event.title);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full rounded-t-3xl px-5 pb-10 pt-5 relative"
        style={{ background: 'var(--engaged-bg)' }}
      >
        {/* Handle */}
        <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: 'var(--engaged-border)' }} />

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: '#fff', border: '1.5px solid var(--engaged-border)' }}
        >
          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Artwork */}
        <img src={artSrc} alt="" aria-hidden className="absolute top-2 right-14 h-20 w-auto" />

        {/* Content */}
        <h2 className="text-2xl font-black tracking-[-0.04em] mb-3 pr-24" style={{ color: 'var(--engaged-text)' }}>
          {event.title}
        </h2>
        <div className="flex items-center gap-2 mb-2" style={{ color: 'var(--engaged-text2)' }}>
          <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
          </svg>
          <span className="text-sm">
            {event.all_day
              ? `${format(start, 'EEE, MMM d')} \u00B7 All day`
              : end
                ? `${format(start, 'EEE, MMM d \u00B7 HH:mm')} \u2013 ${format(end, 'HH:mm')}`
                : format(start, 'EEE, MMM d \u00B7 HH:mm')}
          </span>
        </div>
        {event.creator && (
          <div className="flex items-center gap-2 mt-3">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
              style={{ background: 'var(--engaged-blue-lt)', color: 'var(--engaged-blue)' }}
            >
              {event.creator.full_name[0]?.toUpperCase()}
            </div>
            <span className="text-[13px]" style={{ color: 'var(--engaged-text2)' }}>
              Added by {event.creator.full_name}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Loader ───────────────────────────────────────────────────────────────────

function KobeLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--engaged-bg)' }}>
      <div className="text-center">
        <div
          className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-[3px]"
          style={{ borderColor: 'var(--engaged-border)', borderTopColor: 'var(--engaged-blue)' }}
        />
        <p className="text-sm font-semibold" style={{ color: 'var(--engaged-text2)' }}>Loading\u2026</p>
      </div>
    </div>
  );
}
