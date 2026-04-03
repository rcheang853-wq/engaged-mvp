'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Settings,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  UserPlus,
  Trash2,
  LogOut,
} from 'lucide-react';
import BottomTabBar from '@/components/BottomTabBar';
import CalendarSwitcher from '@/components/CalendarSwitcher';
import CalendarViewTabs from '@/components/calendar/calendar-view-tabs';
import { authClient } from '@/lib/supabase/auth';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  addMonths,
  subMonths,
} from 'date-fns';
import { CalendarSkeleton } from '@/components/ui/skeleton';
import { EventCardCompact } from '@/components/calendar/event-card';
import { NoCalendarEvents } from '@/components/ui/empty-state';
import { useToast } from '@/hooks/use-toast';

interface CalendarEvent {
  id: string;
  title: string;
  start_at: string;
  end_at: string | null;
  all_day: boolean;
  color: string | null;
  profiles: { full_name: string; avatar_url: string | null };
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
  calendar_members: CalendarMember[];
}

const MEMBER_COLORS = [
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#EC4899',
];

export default function CalendarViewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const [calendar, setCalendar] = useState<SharedCalendar | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [membersOpen, setMembersOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);

  // Holidays
  const [showHolidays, setShowHolidays] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('calendar_show_holidays');
      return stored !== 'false'; // default true
    }
    return true;
  });
  const [holidays, setHolidays] = useState<
    Array<{ date: string; name: string; localName: string }>
  >([]);

  const calendarId = Array.isArray(id) ? id[0] : id;

  useEffect(() => {
    // auth user
    authClient
      .getCurrentUser()
      .then(u => setCurrentUserId(u?.id ?? null))
      .catch(() => setCurrentUserId(null));
  }, []);

  useEffect(() => {
    if (searchParams.get('members') === '1') {
      setMembersOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    Promise.all([
      fetch(`/api/calendars/${id}`).then(r => r.json()),
      fetch(
        `/api/calendars/${id}/events?start=${startOfMonth(currentMonth).toISOString()}&end=${endOfMonth(currentMonth).toISOString()}`
      ).then(r => r.json()),
    ])
      .then(([cal, evts]) => {
        setCalendar(cal.data);
        setEvents(evts.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id, currentMonth]);

  // Fetch holidays for current month
  useEffect(() => {
    if (!showHolidays) {
      setHolidays([]);
      return;
    }

    const locale = 'MO'; // Macau - TODO: make this configurable per user
    const from = startOfMonth(currentMonth);
    const to = endOfMonth(currentMonth);

    fetch(`/api/holidays?locale=${locale}&from=${from.toISOString()}&to=${to.toISOString()}`)
      .then(r => r.json())
      .then(data => {
        if (data.success && Array.isArray(data.data)) {
          const transformedHolidays = data.data.map((h: any) => ({
            date: h.start_at.split('T')[0],
            name: h.title,
            localName: h.title,
          }));
          setHolidays(transformedHolidays);
        }
      })
      .catch(() => setHolidays([]));
  }, [currentMonth, showHolidays]);

  const selectedDate = useMemo(() => {
    const qp = searchParams.get('date');
    if (qp && /^\d{4}-\d{2}-\d{2}$/.test(qp)) return qp;
    return format(new Date(), 'yyyy-MM-dd');
  }, [searchParams]);

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });
  const firstDayOfWeek = startOfMonth(currentMonth).getDay();

  // Pad the month grid to a consistent 6 rows (42 cells) so it can stretch to fill available height
  // (avoids a bottom white gap when the month only spans 4–5 weeks).
  const trailingCellsTo42 = useMemo(() => {
    const leading = firstDayOfWeek;
    const total = leading + days.length;
    const remainder = total % 7;
    const trailingToCompleteWeeks = remainder === 0 ? 0 : 7 - remainder;
    const totalAfter = total + trailingToCompleteWeeks;
    const trailingTo42 = totalAfter >= 42 ? 0 : 42 - totalAfter;
    return trailingToCompleteWeeks + trailingTo42;
  }, [days.length, firstDayOfWeek]);

  const eventsOnDay = (day: Date) =>
    events.filter(e => isSameDay(new Date(e.start_at), day));

  const holidaysOnDay = (day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    return holidays.filter(h => h.date === dateStr);
  };

  const memberColor = (userId: string) => {
    const idx =
      calendar?.calendar_members?.findIndex(m => m.user_id === userId) ?? 0;
    return MEMBER_COLORS[idx % MEMBER_COLORS.length];
  };

  const myRole =
    currentUserId && calendar?.calendar_members
      ? calendar.calendar_members.find(m => m.user_id === currentUserId)?.role
      : null;

  const isOwner = myRole === 'owner';

  async function refreshMembers() {
    if (!calendarId) return;
    try {
      const res = await fetch(`/api/calendars/${calendarId}/members`);
      const json = await res.json();
      if (json.success && calendar) {
        setCalendar({ ...calendar, calendar_members: json.data });
      }
    } catch {
      // ignore
    }
  }

  async function sendInvite() {
    if (!calendarId) return;
    const email = inviteEmail.trim();
    if (!email) return;

    setInviting(true);
    setInviteError(null);
    setInviteSuccess(null);
    try {
      const res = await fetch(`/api/calendars/${calendarId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        const errorMsg = json.error ?? 'Failed to invite';
        setInviteError(errorMsg);
        toast.error(errorMsg);
        return;
      }
      setInviteSuccess('Invite sent');
      toast.success(`Invitation sent to ${email}`);
      setInviteEmail('');
    } catch {
      const errorMsg = 'Failed to invite';
      setInviteError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setInviting(false);
    }
  }

  async function removeMember(userId: string) {
    if (!calendarId) return;
    setRemovingUserId(userId);
    try {
      const res = await fetch(
        `/api/calendars/${calendarId}/members/${userId}`,
        {
          method: 'DELETE',
        }
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        return;
      }

      // If I removed myself, go back to calendars list
      if (currentUserId && userId === currentUserId) {
        router.push('/calendars');
        return;
      }

      await refreshMembers();
    } finally {
      setRemovingUserId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-dvh flex-col bg-gray-50 pb-20 md:h-dvh">
        <div className="h-16 border-b bg-white px-4 py-3" />
        <CalendarSkeleton />
        <BottomTabBar />
      </div>
    );
  }

  const hasEvents = events.length > 0;

  return (
    <div className="flex min-h-dvh flex-col bg-gray-50 pb-20 md:h-dvh">
      {/* Header */}
      <div className="border-b bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <CalendarSwitcher currentCalendarId={calendarId} />
            {/* Member avatars */}
            <button
              className="mt-0.5 flex -space-x-1"
              onClick={() => setMembersOpen(true)}
              title="Members"
            >
              {calendar?.calendar_members?.slice(0, 6).map((m, i) => (
                <div
                  key={i}
                  className="flex h-5 w-5 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-gray-200"
                  style={{
                    backgroundColor:
                      MEMBER_COLORS[i % MEMBER_COLORS.length] + '40',
                  }}
                >
                  {m.profiles?.avatar_url ? (
                    <img
                      src={m.profiles.avatar_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span
                      className="text-[8px] font-semibold"
                      style={{ color: MEMBER_COLORS[i % MEMBER_COLORS.length] }}
                    >
                      {m.profiles?.full_name?.[0] ?? '?'}
                    </span>
                  )}
                </div>
              ))}

              {/* Add hint */}
              <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-gray-100">
                <UserPlus size={12} className="text-gray-500" />
              </div>
            </button>
          </div>
          <Link
            href="/search"
            className="text-gray-400 hover:text-gray-600"
            title="Search events"
          >
            <Search size={20} />
          </Link>
          {isOwner && (
            <button
              onClick={() => setMembersOpen(true)}
              className="text-gray-400 hover:text-gray-600"
              title="Invite members"
              aria-label="Invite members"
            >
              <UserPlus size={20} />
            </button>
          )}
          <Link
            href={`/calendars/${id}/settings`}
            className="text-gray-400 hover:text-gray-600"
            title="Settings"
          >
            <Settings size={20} />
          </Link>
          <Link
            href={`/calendars/${id}/events/new?date=${selectedDate}`}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-white hover:bg-blue-600"
          >
            <Plus size={18} />
          </Link>
        </div>
        <CalendarViewTabs
          calendarId={calendarId}
          active="month"
          date={selectedDate}
          className="mt-3 ml-8"
        />
      </div>

      {/* Month navigator */}
      <div className="flex items-center justify-between border-b bg-white px-4 py-2">
        <button
          onClick={() => setCurrentMonth(m => subMonths(m, 1))}
          className="p-1 text-gray-500 hover:text-gray-700"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="flex items-center gap-3">
          <span className="font-semibold text-gray-900">
            {format(currentMonth, 'MMMM yyyy')}
          </span>
          <button
            onClick={() => {
              const next = !showHolidays;
              setShowHolidays(next);
              localStorage.setItem('calendar_show_holidays', String(next));
            }}
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
              showHolidays
                ? 'border border-blue-200 bg-blue-50 text-blue-600'
                : 'border border-gray-200 bg-gray-100 text-gray-500'
            }`}
            title={showHolidays ? 'Hide holidays' : 'Show holidays'}
          >
            🎉 Holidays
          </button>
        </div>
        <button
          onClick={() => setCurrentMonth(m => addMonths(m, 1))}
          className="p-1 text-gray-500 hover:text-gray-700"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Calendar grid */}
      <div className="flex flex-1 min-h-0 flex-col p-3 overflow-hidden">
        {/* Day headers */}
        <div className="mb-1 grid grid-cols-7">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div
              key={d}
              className="py-1 text-center text-xs font-medium text-gray-400"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid flex-1 min-h-0 grid-cols-7 [grid-template-rows:repeat(6,minmax(0,1fr))] md:[grid-template-rows:repeat(6,minmax(120px,1fr))] gap-0.5 overflow-auto">
          {/* Empty cells before first day */}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}

          {days.map(day => {
            const dayEvents = eventsOnDay(day);
            const dayHolidays = holidaysOnDay(day);
            const isToday = isSameDay(day, new Date());
            const isSelected = format(day, 'yyyy-MM-dd') === selectedDate;

            const totalItems = dayHolidays.length + dayEvents.length;
            const maxVisible = 3;

            return (
              // Use div+onClick instead of Link so event-chip Links below aren't nested inside an <a>
              <div
                key={day.toISOString()}
                className={`flex min-h-0 cursor-pointer flex-col rounded-xl p-1 transition-colors ${
                  isSelected
                    ? 'bg-blue-50 ring-2 ring-blue-400 ring-inset'
                    : isToday
                      ? 'bg-blue-50/60'
                      : 'bg-white hover:bg-gray-50'
                }`}
                onClick={() => {
                  const next = format(day, 'yyyy-MM-dd');
                  router.replace(`/calendars/${id}?date=${next}`);
                }}
              >
                <div
                  className={`mb-0.5 flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                    isToday
                      ? 'bg-blue-500 text-white'
                      : isSelected
                        ? 'text-blue-600'
                        : 'text-gray-700'
                  }`}
                >
                  {format(day, 'd')}
                </div>
                {/* Holiday + Event chips */}
                <div className="min-h-0 flex-1 space-y-0.5 overflow-hidden">
                  {/* Holidays */}
                  {dayHolidays.slice(0, maxVisible).map((h, i) => (
                    <div
                      key={`holiday-${i}`}
                      className="truncate rounded bg-gradient-to-r from-orange-400 to-pink-500 px-1 text-[10px] leading-4 font-medium text-white"
                      title={h.localName || h.name}
                    >
                      🎉 {h.localName || h.name}
                    </div>
                  ))}
                  {/* Events */}
                  {dayEvents
                    .slice(0, Math.max(0, maxVisible - dayHolidays.length))
                    .map(evt => (
                      <EventCardCompact
                        key={evt.id}
                        event={evt}
                        calendarId={calendarId}
                        onClick={e => e.stopPropagation()}
                        color={
                          evt.color ||
                          memberColor((evt.profiles as any)?.id ?? '') ||
                          calendar?.color ||
                          '#3B82F6'
                        }
                      />
                    ))}
                  {totalItems > maxVisible && (
                    <div className="text-[10px] font-medium text-blue-400">
                      +{totalItems - maxVisible}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Trailing filler cells to ensure a consistent 6-row (42-cell) grid */}
          {Array.from({ length: trailingCellsTo42 }).map((_, i) => (
            <div key={`filler-${i}`} />
          ))}
        </div>
      </div>
      {/* Members modal */}
      {membersOpen && (
        <div className="fixed inset-0 z-[999]">
          <button
            className="absolute inset-0 bg-black/30"
            onClick={() => setMembersOpen(false)}
            aria-label="Close"
          />

          <div className="absolute relative inset-x-0 top-0 mx-auto flex h-[100dvh] max-w-md flex-col bg-white shadow-xl">
            <div className="flex flex-shrink-0 items-center justify-between border-b px-4 pt-10 pb-3">
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  Calendar members
                </h2>
                <p className="text-xs text-gray-500">
                  {calendar?.calendar_members?.length ?? 0} member
                  {(calendar?.calendar_members?.length ?? 0) === 1 ? '' : 's'}
                </p>
              </div>
              <button
                onClick={() => setMembersOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full"
                aria-label="Close"
              >
                <X size={18} className="text-gray-900" />
              </button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto px-4 py-4">
              {/* Invite by email (owner only) */}
              {isOwner && (
                <section className="space-y-2">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Invite by email
                  </h3>
                  <div className="flex items-center gap-2">
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={e => setInviteEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="h-10 flex-1 rounded-xl border border-gray-200 px-3 text-sm outline-none"
                    />
                    <button
                      onClick={sendInvite}
                      disabled={inviting || !inviteEmail.trim()}
                      className="h-10 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white disabled:bg-gray-300"
                    >
                      {inviting ? 'Inviting…' : 'Invite'}
                    </button>
                  </div>
                  {inviteError && (
                    <p className="text-xs text-red-600">{inviteError}</p>
                  )}
                  {inviteSuccess && (
                    <p className="text-xs text-green-700">{inviteSuccess}</p>
                  )}
                  <p className="text-[11px] text-gray-500">
                    The recipient must sign up / log in, then accept the invite.
                  </p>
                </section>
              )}

              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-900">Members</h3>
                <div className="space-y-2">
                  {calendar?.calendar_members?.map((m, i) => {
                    const isMe = currentUserId && m.user_id === currentUserId;
                    const canRemove = isOwner && m.role !== 'owner' && !isMe;
                    const canLeave = isMe && m.role !== 'owner';

                    return (
                      <div
                        key={m.user_id}
                        className="flex items-center justify-between gap-3"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div
                            className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-full"
                            style={{
                              backgroundColor:
                                MEMBER_COLORS[i % MEMBER_COLORS.length] + '40',
                            }}
                          >
                            {m.profiles.avatar_url ? (
                              <img
                                src={m.profiles.avatar_url}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span
                                className="text-sm font-bold"
                                style={{
                                  color:
                                    MEMBER_COLORS[i % MEMBER_COLORS.length],
                                }}
                              >
                                {(m.profiles.full_name ||
                                  m.profiles.email ||
                                  '?')[0]?.toUpperCase()}
                              </span>
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-gray-900">
                              {m.profiles.full_name ||
                                m.profiles.email ||
                                'Member'}
                              {isMe ? ' (You)' : ''}
                            </p>
                            <p className="truncate text-xs text-gray-500">
                              {m.role}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-shrink-0 items-center gap-2">
                          {canRemove && (
                            <button
                              onClick={() => removeMember(m.user_id)}
                              disabled={removingUserId === m.user_id}
                              className="h-9 rounded-xl border border-gray-200 px-3 text-xs font-semibold text-gray-700 disabled:opacity-50"
                            >
                              <span className="inline-flex items-center gap-1">
                                <Trash2 size={14} />
                                Remove
                              </span>
                            </button>
                          )}

                          {canLeave && (
                            <button
                              onClick={() => removeMember(m.user_id)}
                              disabled={removingUserId === m.user_id}
                              className="h-9 rounded-xl border border-gray-200 px-3 text-xs font-semibold text-gray-700 disabled:opacity-50"
                            >
                              <span className="inline-flex items-center gap-1">
                                <LogOut size={14} />
                                Leave
                              </span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {(!calendar?.calendar_members ||
                    calendar.calendar_members.length === 0) && (
                    <p className="text-sm text-gray-500">No members</p>
                  )}
                </div>

                {!isOwner && (
                  <p className="text-[11px] text-gray-500">
                    Members can view events and comment. Only the owner can edit
                    events.
                  </p>
                )}
              </section>
            </div>
          </div>
        </div>
      )}

      <BottomTabBar />
    </div>
  );
}
