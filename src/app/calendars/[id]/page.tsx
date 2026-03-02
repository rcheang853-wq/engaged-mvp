'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Settings, ChevronLeft, ChevronRight, List, Calendar, Search, X, UserPlus, Trash2, LogOut } from 'lucide-react';
import BottomTabBar from '@/components/BottomTabBar';
import CalendarSwitcher from '@/components/CalendarSwitcher';
import { authClient } from '@/lib/supabase/auth';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths } from 'date-fns';

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

const MEMBER_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function CalendarViewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
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

  const calendarId = Array.isArray(id) ? id[0] : id;

  useEffect(() => {
    // auth user
    authClient
      .getCurrentUser()
      .then((u) => setCurrentUserId(u?.id ?? null))
      .catch(() => setCurrentUserId(null));
  }, []);

  useEffect(() => {
    Promise.all([
      fetch(`/api/calendars/${id}`).then((r) => r.json()),
      fetch(
        `/api/calendars/${id}/events?start=${startOfMonth(currentMonth).toISOString()}&end=${endOfMonth(currentMonth).toISOString()}`
      ).then((r) => r.json()),
    ])
      .then(([cal, evts]) => {
        setCalendar(cal.data);
        setEvents(evts.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id, currentMonth]);

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const firstDayOfWeek = startOfMonth(currentMonth).getDay();

  const eventsOnDay = (day: Date) =>
    events.filter(e => isSameDay(new Date(e.start_at), day));

  const memberColor = (userId: string) => {
    const idx = calendar?.calendar_members?.findIndex((m) => m.profiles.id === userId) ?? 0;
    return MEMBER_COLORS[idx % MEMBER_COLORS.length];
  };

  const myRole =
    currentUserId && calendar?.calendar_members
      ? calendar.calendar_members.find((m) => m.profiles.id === currentUserId)?.role
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
        setInviteError(json.error ?? 'Failed to invite');
        return;
      }
      setInviteSuccess('Invite sent');
      setInviteEmail('');
    } catch {
      setInviteError('Failed to invite');
    } finally {
      setInviting(false);
    }
  }

  async function removeMember(userId: string) {
    if (!calendarId) return;
    setRemovingUserId(userId);
    try {
      const res = await fetch(`/api/calendars/${calendarId}/members/${userId}`, {
        method: 'DELETE',
      });
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

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-20">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <CalendarSwitcher currentCalendarId={calendarId} />
          {/* Member avatars */}
          <button
            className="flex -space-x-1 mt-0.5"
            onClick={() => setMembersOpen(true)}
            title="Members"
          >
            {calendar?.calendar_members?.slice(0, 6).map((m, i) => (
              <div
                key={i}
                className="w-5 h-5 rounded-full border-2 border-white overflow-hidden bg-gray-200 flex items-center justify-center"
                style={{ backgroundColor: MEMBER_COLORS[i % MEMBER_COLORS.length] + '40' }}
              >
                {m.profiles?.avatar_url ? (
                  <img src={m.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span
                    className="text-[8px] font-semibold"
                    style={{ color: MEMBER_COLORS[i % MEMBER_COLORS.length] }}
                  >
                    {m.profiles?.full_name?.[0] ?? m.profiles?.email?.[0] ?? '?'}
                  </span>
                )}
              </div>
            ))}

            {/* Add hint */}
            <div className="w-5 h-5 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center">
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
        <Link
          href={`/calendars/${id}/agenda`}
          className="text-gray-400 hover:text-gray-600"
          title="Agenda view"
        >
          <List size={20} />
        </Link>
        <Link href={`/calendars/${id}/settings`} className="text-gray-400 hover:text-gray-600">
          <Settings size={20} />
        </Link>
        <Link
          href={`/calendars/${id}/events/new`}
          className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-blue-600"
        >
          <Plus size={18} />
        </Link>
      </div>

      {/* Month navigator */}
      <div className="bg-white px-4 py-2 flex items-center justify-between border-b">
        <button onClick={() => setCurrentMonth(m => subMonths(m, 1))} className="p-1 text-gray-500 hover:text-gray-700">
          <ChevronLeft size={20} />
        </button>
        <span className="font-semibold text-gray-900">{format(currentMonth, 'MMMM yyyy')}</span>
        <button onClick={() => setCurrentMonth(m => addMonths(m, 1))} className="p-1 text-gray-500 hover:text-gray-700">
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Calendar grid */}
      <div className="flex-1 p-3">
        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="text-center text-xs text-gray-400 font-medium py-1">{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-0.5">
          {/* Empty cells before first day */}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`empty-${i}`} />)}

          {days.map(day => {
            const dayEvents = eventsOnDay(day);
            const isToday = isSameDay(day, new Date());

            return (
              // Use div+onClick instead of Link so event-chip Links below aren't nested inside an <a>
              <div
                key={day.toISOString()}
                className={`min-h-[60px] rounded-xl p-1 cursor-pointer hover:bg-gray-100 transition-colors ${isToday ? 'bg-blue-50' : 'bg-white'}`}
                onClick={() => router.push(`/calendars/${id}/events/new?date=${format(day, 'yyyy-MM-dd')}`)}
              >
                <div className={`text-xs font-semibold w-6 h-6 rounded-full flex items-center justify-center mb-0.5 ${isToday ? 'bg-blue-500 text-white' : 'text-gray-700'}`}>
                  {format(day, 'd')}
                </div>
                {/* Event chips */}
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 3).map(evt => (
                    <Link key={evt.id} href={`/calendars/${id}/events/${evt.id}`} onClick={e => e.stopPropagation()}>
                      <div
                        className="text-[10px] truncate rounded px-1 text-white leading-4"
                        style={{ backgroundColor: evt.color || memberColor((evt.profiles as any)?.id ?? '') || calendar?.color || '#3B82F6' }}
                      >
                        {evt.title}
                      </div>
                    </Link>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-[10px] text-gray-400">+{dayEvents.length - 3} more</div>
                  )}
                </div>
              </div>
            );
          })}
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

          <div className="absolute inset-x-0 top-0 mx-auto max-w-md bg-white h-[100dvh] shadow-xl flex flex-col relative">
            <div className="px-4 pt-10 pb-3 flex items-center justify-between border-b flex-shrink-0">
              <div>
                <h2 className="text-base font-bold text-gray-900">Calendar members</h2>
                <p className="text-xs text-gray-500">
                  {calendar?.calendar_members?.length ?? 0} member{(calendar?.calendar_members?.length ?? 0) === 1 ? '' : 's'}
                </p>
              </div>
              <button
                onClick={() => setMembersOpen(false)}
                className="w-10 h-10 rounded-full flex items-center justify-center"
                aria-label="Close"
              >
                <X size={18} className="text-gray-900" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
              {/* Invite by email (owner only) */}
              {isOwner && (
                <section className="space-y-2">
                  <h3 className="text-sm font-semibold text-gray-900">Invite by email</h3>
                  <div className="flex items-center gap-2">
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="flex-1 h-10 px-3 rounded-xl border border-gray-200 text-sm outline-none"
                    />
                    <button
                      onClick={sendInvite}
                      disabled={inviting || !inviteEmail.trim()}
                      className="h-10 px-4 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:bg-gray-300"
                    >
                      {inviting ? 'Inviting…' : 'Invite'}
                    </button>
                  </div>
                  {inviteError && <p className="text-xs text-red-600">{inviteError}</p>}
                  {inviteSuccess && <p className="text-xs text-green-700">{inviteSuccess}</p>}
                  <p className="text-[11px] text-gray-500">
                    The recipient must sign up / log in, then accept the invite.
                  </p>
                </section>
              )}

              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-900">Members</h3>
                <div className="space-y-2">
                  {calendar?.calendar_members?.map((m, i) => {
                    const isMe = currentUserId && m.profiles.id === currentUserId;
                    const canRemove = isOwner && m.role !== 'owner' && !isMe;
                    const canLeave = isMe && m.role !== 'owner';

                    return (
                      <div key={m.user_id} className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: MEMBER_COLORS[i % MEMBER_COLORS.length] + '40' }}
                          >
                            {m.profiles.avatar_url ? (
                              <img src={m.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span
                                className="text-sm font-bold"
                                style={{ color: MEMBER_COLORS[i % MEMBER_COLORS.length] }}
                              >
                                {(m.profiles.full_name || m.profiles.email || '?')[0]?.toUpperCase()}
                              </span>
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {m.profiles.full_name || m.profiles.email || 'Member'}
                              {isMe ? ' (You)' : ''}
                            </p>
                            <p className="text-xs text-gray-500 truncate">{m.role}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          {canRemove && (
                            <button
                              onClick={() => removeMember(m.profiles.id)}
                              disabled={removingUserId === m.profiles.id}
                              className="h-9 px-3 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 disabled:opacity-50"
                            >
                              <span className="inline-flex items-center gap-1">
                                <Trash2 size={14} />
                                Remove
                              </span>
                            </button>
                          )}

                          {canLeave && (
                            <button
                              onClick={() => removeMember(m.profiles.id)}
                              disabled={removingUserId === m.profiles.id}
                              className="h-9 px-3 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 disabled:opacity-50"
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

                  {(!calendar?.calendar_members || calendar.calendar_members.length === 0) && (
                    <p className="text-sm text-gray-500">No members</p>
                  )}
                </div>

                {!isOwner && (
                  <p className="text-[11px] text-gray-500">
                    Members can view events and comment. Only the owner can edit events.
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
