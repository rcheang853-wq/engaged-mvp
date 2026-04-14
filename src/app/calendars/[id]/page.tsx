'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Plus, Settings, ChevronLeft, ChevronRight,
  Search, X, Trash2, LogOut,
} from 'lucide-react';
import BottomTabBar from '@/components/BottomTabBar';
import { authClient } from '@/lib/supabase/auth';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameDay, addMonths, subMonths,
} from 'date-fns';
import { CalendarSkeleton } from '@/components/ui/skeleton';
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

const MEMBER_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

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

  const [showHolidays, setShowHolidays] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('calendar_show_holidays') !== 'false';
    }
    return true;
  });
  const [holidays, setHolidays] = useState<Array<{ date: string; name: string; localName: string }>>([]);

  const calendarId = Array.isArray(id) ? id[0] : id;

  useEffect(() => {
    authClient.getCurrentUser().then(u => setCurrentUserId(u?.id ?? null)).catch(() => setCurrentUserId(null));
  }, []);

  useEffect(() => {
    if (searchParams.get('members') === '1') setMembersOpen(true);
  }, [searchParams]);

  useEffect(() => {
    Promise.all([
      fetch(`/api/calendars/${id}`).then(r => r.json()),
      fetch(`/api/calendars/${id}/events?start=${startOfMonth(currentMonth).toISOString()}&end=${endOfMonth(currentMonth).toISOString()}`).then(r => r.json()),
    ])
      .then(([cal, evts]) => { setCalendar(cal.data); setEvents(evts.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id, currentMonth]);

  useEffect(() => {
    if (!showHolidays) { setHolidays([]); return; }
    const locale = 'MO';
    const from = startOfMonth(currentMonth);
    const to = endOfMonth(currentMonth);
    fetch(`/api/holidays?locale=${locale}&from=${from.toISOString()}&to=${to.toISOString()}`)
      .then(r => r.json())
      .then(data => {
        if (data.success && Array.isArray(data.data)) {
          setHolidays(data.data.map((h: any) => ({ date: h.start_at.split('T')[0], name: h.title, localName: h.title })));
        }
      })
      .catch(() => setHolidays([]));
  }, [currentMonth, showHolidays]);

  const selectedDate = useMemo(() => {
    const qp = searchParams.get('date');
    if (qp && /^\d{4}-\d{2}-\d{2}$/.test(qp)) return qp;
    return format(new Date(), 'yyyy-MM-dd');
  }, [searchParams]);

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const firstDayOfWeek = startOfMonth(currentMonth).getDay();

  const trailingCellsTo42 = useMemo(() => {
    const leading = firstDayOfWeek;
    const total = leading + days.length;
    const remainder = total % 7;
    const trailingToCompleteWeeks = remainder === 0 ? 0 : 7 - remainder;
    const totalAfter = total + trailingToCompleteWeeks;
    return trailingToCompleteWeeks + (totalAfter >= 42 ? 0 : 42 - totalAfter);
  }, [days.length, firstDayOfWeek]);

  const eventsOnDay = (day: Date) => events.filter(e => isSameDay(new Date(e.start_at), day));
  const holidaysOnDay = (day: Date) => holidays.filter(h => h.date === format(day, 'yyyy-MM-dd'));

  const eventsForSelectedDate = useMemo(() =>
    events.filter(e => isSameDay(new Date(e.start_at), new Date(selectedDate + 'T12:00:00'))),
    [events, selectedDate]);

  const holidaysForSelectedDate = useMemo(() =>
    holidays.filter(h => h.date === selectedDate),
    [holidays, selectedDate]);

  const memberColor = (userId: string) => {
    const idx = calendar?.calendar_members?.findIndex(m => m.user_id === userId) ?? 0;
    return MEMBER_COLORS[idx % MEMBER_COLORS.length];
  };

  const myRole = currentUserId && calendar?.calendar_members
    ? calendar.calendar_members.find(m => m.user_id === currentUserId)?.role
    : null;
  const isOwner = myRole === 'owner';

  async function refreshMembers() {
    if (!calendarId) return;
    try {
      const res = await fetch(`/api/calendars/${calendarId}/members`);
      const json = await res.json();
      if (json.success && calendar) setCalendar({ ...calendar, calendar_members: json.data });
    } catch {}
  }

  async function sendInvite() {
    if (!calendarId) return;
    const email = inviteEmail.trim();
    if (!email) return;
    setInviting(true); setInviteError(null); setInviteSuccess(null);
    try {
      const res = await fetch(`/api/calendars/${calendarId}/invite`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) { const m = json.error ?? 'Failed to invite'; setInviteError(m); toast.error(m); return; }
      setInviteSuccess('Invite sent'); toast.success(`Invitation sent to ${email}`); setInviteEmail('');
    } catch { const m = 'Failed to invite'; setInviteError(m); toast.error(m); }
    finally { setInviting(false); }
  }

  async function removeMember(userId: string) {
    if (!calendarId) return;
    setRemovingUserId(userId);
    try {
      const res = await fetch(`/api/calendars/${calendarId}/members/${userId}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || !json.success) return;
      if (currentUserId && userId === currentUserId) { router.push('/calendars'); return; }
      await refreshMembers();
    } finally { setRemovingUserId(null); }
  }

  if (loading) {
    return (
      <div className="flex min-h-dvh flex-col pb-20 md:h-dvh" style={{ background: 'var(--engaged-bg)' }}>
        <div className="h-16 border-b bg-white px-4 py-3" />
        <CalendarSkeleton />
        <BottomTabBar />
      </div>
    );
  }

  const calColor = calendar?.color || '#2563EB';

  return (
    <div className="flex min-h-dvh flex-col pb-20 md:h-dvh" style={{ background: 'var(--engaged-bg)' }}>

      {/* ── Header ── */}
      <div className="px-4 pt-3 pb-0" style={{ background: '#fff', borderBottom: '1.5px solid var(--engaged-border)' }}>
        <div className="flex items-center gap-2">
          <button onClick={() => router.back()} className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center" style={{ border: '1.5px solid var(--engaged-border)' }}>
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
          <button className="flex items-center flex-shrink-0" onClick={() => setMembersOpen(true)}>
            {calendar?.calendar_members?.slice(0, 4).map((m, i) => (
              <div key={m.user_id}
                className="w-7 h-7 rounded-full border-2 border-white overflow-hidden flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                style={{ marginLeft: i === 0 ? 0 : -8, background: MEMBER_COLORS[i % MEMBER_COLORS.length] + '30', color: MEMBER_COLORS[i % MEMBER_COLORS.length], zIndex: 10 - i }}>
                {m.profiles?.avatar_url
                  ? <img src={m.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                  : (m.profiles?.full_name?.[0] ?? '?').toUpperCase()}
              </div>
            ))}
          </button>

          {/* Action buttons */}
          <Link href="/search" className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ color: 'var(--engaged-text2)' }} aria-label="Search">
            <Search size={17} />
          </Link>
          <Link href={`/calendars/${id}/settings`} className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ color: 'var(--engaged-text2)' }} aria-label="Settings">
            <Settings size={17} />
          </Link>
          <Link href={`/calendars/${id}/events/new?date=${selectedDate}`}
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white" style={{ background: 'var(--engaged-blue)' }} aria-label="New event">
            <Plus size={17} />
          </Link>
        </div>

        {/* View toggle strip */}
        <div className="flex items-center gap-2 mt-3 pb-3">
          {[
            { key: 'month', label: 'Month', href: `/calendars/${id}?date=${selectedDate}` },
            { key: '3day', label: '3 Days', href: `/calendars/${id}/3day?date=${selectedDate}` },
            { key: 'agenda', label: 'Agenda', href: `/calendars/${id}/agenda?date=${selectedDate}` },
          ].map(tab => (
            <Link key={tab.key} href={tab.href}
              className="h-[30px] px-4 rounded-full text-[13px] font-bold flex items-center flex-shrink-0"
              style={tab.key === 'month'
                ? { background: 'var(--engaged-blue)', color: '#fff' }
                : { background: '#fff', border: '1.5px solid var(--engaged-border)', color: 'var(--engaged-text2)' }}>
              {tab.label}
            </Link>
          ))}
        </div>
      </div>

      {/* ── Month Navigator ── */}
      <div className="flex items-center justify-between px-4 py-2.5" style={{ background: '#fff', borderBottom: '1.5px solid var(--engaged-border)' }}>
        <button onClick={() => setCurrentMonth(m => subMonths(m, 1))}
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ border: '1.5px solid var(--engaged-border)' }}>
          <ChevronLeft size={16} style={{ color: 'var(--engaged-text2)' }} />
        </button>
        <div className="flex items-center gap-3">
          <span>
            <span className="text-[22px] font-black tracking-[-0.04em]" style={{ color: 'var(--engaged-text)' }}>{format(currentMonth, 'MMMM')}</span>
            {' '}
            <span className="text-[14px] font-semibold" style={{ color: 'var(--engaged-text2)' }}>{format(currentMonth, 'yyyy')}</span>
          </span>
          <button
            onClick={() => { const n = !showHolidays; setShowHolidays(n); localStorage.setItem('calendar_show_holidays', String(n)); }}
            className="px-2.5 py-1 rounded-full text-[11px] font-semibold"
            style={showHolidays
              ? { background: 'var(--engaged-blue-lt)', color: 'var(--engaged-blue)', border: '1.5px solid var(--engaged-blue-mid)' }
              : { background: '#fff', border: '1.5px solid var(--engaged-border)', color: 'var(--engaged-text3)' }}>
            {'\uD83C\uDF89'} Holidays
          </button>
        </div>
        <button onClick={() => setCurrentMonth(m => addMonths(m, 1))}
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ border: '1.5px solid var(--engaged-border)' }}>
          <ChevronRight size={16} style={{ color: 'var(--engaged-text2)' }} />
        </button>
      </div>

      {/* ── Calendar Grid ── */}
      <div className="px-3 pt-2 flex-shrink-0">
        {/* Day labels */}
        <div className="grid grid-cols-7 mb-1">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="text-center py-1 text-[10px] font-bold uppercase" style={{ color: 'var(--engaged-text3)', letterSpacing: '0.06em' }}>{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7" style={{ gap: 3 }}>
          {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`el-${i}`} />)}

          {days.map(day => {
            const dayEvts = eventsOnDay(day);
            const dayHols = holidaysOnDay(day);
            const isToday = isSameDay(day, new Date());
            const isSel = format(day, 'yyyy-MM-dd') === selectedDate;

            return (
              <div key={day.toISOString()}
                onClick={() => router.replace(`/calendars/${id}?date=${format(day, 'yyyy-MM-dd')}`)}
                className="flex flex-col items-center pt-1 pb-1 rounded-xl cursor-pointer"
                style={{ aspectRatio: '0.85', background: isSel ? 'var(--engaged-blue-lt)' : isToday ? '#F0F7FF' : '#fff', border: isSel ? '1.5px solid var(--engaged-blue-mid)' : '1.5px solid var(--engaged-border)' }}>
                {/* Date number */}
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-bold flex-shrink-0"
                  style={{ background: isToday ? 'var(--engaged-blue)' : 'transparent', color: isToday ? '#fff' : isSel ? 'var(--engaged-blue)' : 'var(--engaged-text)' }}>
                  {format(day, 'd')}
                </div>
                {/* Event dots */}
                <div className="flex flex-wrap justify-center gap-[2px] mt-0.5 px-0.5 max-h-[14px] overflow-hidden">
                  {dayHols.slice(0, 1).map((_, i) => (
                    <div key={`hd-${i}`} style={{ width: 5, height: 5, borderRadius: '50%', background: '#F97316', flexShrink: 0 }} />
                  ))}
                  {dayEvts.slice(0, 3 - Math.min(dayHols.length, 1)).map(evt => (
                    <div key={evt.id} style={{ width: 5, height: 5, borderRadius: '50%', background: evt.color || memberColor((evt.profiles as any)?.id ?? '') || calColor, flexShrink: 0 }} />
                  ))}
                </div>
              </div>
            );
          })}

          {Array.from({ length: trailingCellsTo42 }).map((_, i) => <div key={`fl-${i}`} />)}
        </div>
      </div>

      {/* ── Selected Day Events ── */}
      <div className="flex-1 overflow-y-auto mt-2 px-4 pb-2" style={{ borderTop: '1.5px solid var(--engaged-border)' }}>
        <div className="flex items-center justify-between pt-3 pb-2">
          <h3 className="text-[15px] font-black tracking-[-0.03em]" style={{ color: 'var(--engaged-text)' }}>
            {format(new Date(selectedDate + 'T12:00:00'), 'EEEE, MMM d')}
          </h3>
          <Link href={`/calendars/${id}/events/new?date=${selectedDate}`} className="text-[12px] font-bold" style={{ color: 'var(--engaged-blue)' }}>+ Add event</Link>
        </div>

        {eventsForSelectedDate.length === 0 && holidaysForSelectedDate.length === 0 ? (
          <p className="text-[13px] py-4" style={{ color: 'var(--engaged-text3)' }}>No events on this day</p>
        ) : (
          <div className="space-y-2 pb-2">
            {holidaysForSelectedDate.map((h, i) => (
              <div key={`hs-${i}`} className="flex items-center gap-3 py-2.5 px-3 rounded-xl"
                style={{ background: '#FFF7ED', borderLeft: '4px solid #F97316' }}>
                <div>
                  <p className="text-[13px] font-bold" style={{ color: '#C2410C' }}>{'\uD83C\uDF89'} {h.localName || h.name}</p>
                  <p className="text-[11px]" style={{ color: '#EA580C' }}>All day · Public holiday</p>
                </div>
              </div>
            ))}
            {eventsForSelectedDate.map(evt => {
              const color = evt.color || memberColor((evt.profiles as any)?.id ?? '') || calColor;
              return (
                <Link key={evt.id} href={`/calendars/${id}/events/${evt.id}`}
                  className="flex items-center gap-3 py-2.5 px-3 rounded-xl block"
                  style={{ background: '#fff', border: '1.5px solid var(--engaged-border)', borderLeft: `4px solid ${color}` }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-bold truncate" style={{ color: 'var(--engaged-text)' }}>{evt.title}</p>
                    <p className="text-[12px]" style={{ color: 'var(--engaged-text2)' }}>
                      {evt.all_day ? 'All day' : format(new Date(evt.start_at), 'h:mm a')}
                      {evt.end_at && !evt.all_day ? ` \u2013 ${format(new Date(evt.end_at), 'h:mm a')}` : ''}
                    </p>
                  </div>
                  <svg width="16" height="16" fill="none" stroke="var(--engaged-border)" strokeWidth="2" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6" /></svg>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Members Modal ── */}
      {membersOpen && (
        <div className="fixed inset-0 z-[999]">
          <button className="absolute inset-0 bg-black/30" onClick={() => setMembersOpen(false)} aria-label="Close" />
          <div className="absolute inset-x-0 top-0 mx-auto flex h-[100dvh] max-w-md flex-col bg-white shadow-xl">
            <div className="flex flex-shrink-0 items-center justify-between border-b px-4 pt-10 pb-3">
              <div>
                <h2 className="text-base font-bold" style={{ color: 'var(--engaged-text)' }}>Calendar members</h2>
                <p className="text-xs" style={{ color: 'var(--engaged-text2)' }}>{calendar?.calendar_members?.length ?? 0} member{(calendar?.calendar_members?.length ?? 0) === 1 ? '' : 's'}</p>
              </div>
              <button onClick={() => setMembersOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-full" aria-label="Close">
                <X size={18} style={{ color: 'var(--engaged-text)' }} />
              </button>
            </div>
            <div className="flex-1 space-y-6 overflow-y-auto px-4 py-4">
              {isOwner && (
                <section className="space-y-2">
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--engaged-text)' }}>Invite by email</h3>
                  <div className="flex items-center gap-2">
                    <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="h-10 flex-1 rounded-xl border px-3 text-sm outline-none" style={{ borderColor: 'var(--engaged-border)' }} />
                    <button onClick={sendInvite} disabled={inviting || !inviteEmail.trim()}
                      className="h-10 rounded-xl px-4 text-sm font-semibold text-white disabled:opacity-40"
                      style={{ background: 'var(--engaged-blue)' }}>
                      {inviting ? 'Inviting\u2026' : 'Invite'}
                    </button>
                  </div>
                  {inviteError && <p className="text-xs text-red-600">{inviteError}</p>}
                  {inviteSuccess && <p className="text-xs text-green-700">{inviteSuccess}</p>}
                  <p className="text-[11px]" style={{ color: 'var(--engaged-text3)' }}>The recipient must sign up then accept the invite.</p>
                </section>
              )}
              <section className="space-y-2">
                <h3 className="text-sm font-semibold" style={{ color: 'var(--engaged-text)' }}>Members</h3>
                <div className="space-y-2">
                  {calendar?.calendar_members?.map((m, i) => {
                    const isMe = currentUserId && m.user_id === currentUserId;
                    const canRemove = isOwner && m.role !== 'owner' && !isMe;
                    const canLeave = isMe && m.role !== 'owner';
                    return (
                      <div key={m.user_id} className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-full"
                            style={{ backgroundColor: MEMBER_COLORS[i % MEMBER_COLORS.length] + '40' }}>
                            {m.profiles.avatar_url
                              ? <img src={m.profiles.avatar_url} alt="" className="h-full w-full object-cover" />
                              : <span className="text-sm font-bold" style={{ color: MEMBER_COLORS[i % MEMBER_COLORS.length] }}>{(m.profiles.full_name || '?')[0]?.toUpperCase()}</span>}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold" style={{ color: 'var(--engaged-text)' }}>{m.profiles.full_name || 'Member'}{isMe ? ' (You)' : ''}</p>
                            <p className="text-xs" style={{ color: 'var(--engaged-text2)' }}>{m.role}</p>
                          </div>
                        </div>
                        <div className="flex flex-shrink-0 items-center gap-2">
                          {canRemove && (
                            <button onClick={() => removeMember(m.user_id)} disabled={removingUserId === m.user_id}
                              className="h-9 rounded-xl border px-3 text-xs font-semibold disabled:opacity-50"
                              style={{ borderColor: 'var(--engaged-border)', color: 'var(--engaged-text)' }}>
                              <span className="inline-flex items-center gap-1"><Trash2 size={14} /> Remove</span>
                            </button>
                          )}
                          {canLeave && (
                            <button onClick={() => removeMember(m.user_id)} disabled={removingUserId === m.user_id}
                              className="h-9 rounded-xl border px-3 text-xs font-semibold disabled:opacity-50"
                              style={{ borderColor: 'var(--engaged-border)', color: 'var(--engaged-text)' }}>
                              <span className="inline-flex items-center gap-1"><LogOut size={14} /> Leave</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {(!calendar?.calendar_members || calendar.calendar_members.length === 0) && (
                    <p className="text-sm" style={{ color: 'var(--engaged-text2)' }}>No members</p>
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      <BottomTabBar />
    </div>
  );
}
