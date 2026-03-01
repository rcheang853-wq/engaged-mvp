'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Settings, ChevronLeft, ChevronRight, List, Calendar, Search } from 'lucide-react';
import BottomTabBar from '@/components/BottomTabBar';
import CalendarSwitcher from '@/components/CalendarSwitcher';
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

  const calendarId = Array.isArray(id) ? id[0] : id;

  useEffect(() => {
    Promise.all([
      fetch(`/api/calendars/${id}`).then(r => r.json()),
      fetch(`/api/calendars/${id}/events?start=${startOfMonth(currentMonth).toISOString()}&end=${endOfMonth(currentMonth).toISOString()}`).then(r => r.json()),
    ]).then(([cal, evts]) => {
      setCalendar(cal.data);
      setEvents(evts.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id, currentMonth]);

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const firstDayOfWeek = startOfMonth(currentMonth).getDay();

  const eventsOnDay = (day: Date) =>
    events.filter(e => isSameDay(new Date(e.start_at), day));

  const memberColor = (userId: string) => {
    const idx = calendar?.calendar_members?.findIndex(m => m.profiles.id === userId) ?? 0;
    return MEMBER_COLORS[idx % MEMBER_COLORS.length];
  };

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
              <Link key={day.toISOString()} href={`/calendars/${id}/events/new?date=${format(day, 'yyyy-MM-dd')}`}>
                <div className={`min-h-[60px] rounded-xl p-1 cursor-pointer hover:bg-gray-100 transition-colors ${isToday ? 'bg-blue-50' : 'bg-white'}`}>
                  <div className={`text-xs font-semibold w-6 h-6 rounded-full flex items-center justify-center mb-0.5 ${isToday ? 'bg-blue-500 text-white' : 'text-gray-700'}`}>
                    {format(day, 'd')}
                  </div>
                  {/* Event dots */}
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map(evt => (
                      <Link key={evt.id} href={`/calendars/${id}/events/${evt.id}`} onClick={e => e.stopPropagation()}>
                        <div
                          className="text-[10px] truncate rounded px-1 text-white leading-4"
                          style={{ backgroundColor: evt.color || memberColor(evt.profiles?.id ?? '') || calendar?.color || '#3B82F6' }}
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
              </Link>
            );
          })}
        </div>
      </div>
    <BottomTabBar />
    </div>
  );
}
