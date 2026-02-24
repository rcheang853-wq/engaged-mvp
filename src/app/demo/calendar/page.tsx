'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Settings, ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, getDay } from 'date-fns';

const MEMBER_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

// Mock calendar data
const calendar = {
  id: '1',
  name: 'Family Calendar',
  color: '#3B82F6',
  calendar_members: [
    { user_id: '1', role: 'owner', profiles: { id: '1', full_name: 'John Doe', avatar_url: null } },
    { user_id: '2', role: 'editor', profiles: { id: '2', full_name: 'Jane Doe', avatar_url: null } },
    { user_id: '3', role: 'viewer', profiles: { id: '3', full_name: 'Kid Doe', avatar_url: null } },
  ],
};

// Mock events - spread throughout the month
const mockEvents = [
  { id: '1', title: "Dad's Birthday 🎂", start_at: '2026-02-23T00:00:00Z', all_day: true, color: '#EF4444', profiles: { id: '1' } },
  { id: '2', title: 'Dentist Appointment', start_at: '2026-02-23T14:00:00Z', all_day: false, color: '#10B981', profiles: { id: '2' } },
  { id: '3', title: 'Soccer Practice', start_at: '2026-02-24T16:00:00Z', all_day: false, color: '#F59E0B', profiles: { id: '3' } },
  { id: '4', title: 'Movie Night 🎬', start_at: '2026-02-28T19:00:00Z', all_day: false, color: '#8B5CF6', profiles: { id: '1' } },
  { id: '5', title: 'School Meeting', start_at: '2026-02-25T10:00:00Z', all_day: false, color: '#10B981', profiles: { id: '2' } },
  { id: '6', title: 'Weekend Trip 🏖️', start_at: '2026-02-27T00:00:00Z', all_day: true, color: '#3B82F6', profiles: { id: '1' } },
  { id: '7', title: 'Team Dinner', start_at: '2026-02-26T18:30:00Z', all_day: false, color: '#F59E0B', profiles: { id: '1' } },
  { id: '8', title: 'Yoga Class', start_at: '2026-02-22T09:00:00Z', all_day: false, color: '#EC4899', profiles: { id: '2' } },
];

export default function DemoCalendarViewPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 1, 23)); // Feb 23, 2026

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const firstDayOfWeek = getDay(startOfMonth(currentMonth));

  const eventsOnDay = (day: Date) =>
    mockEvents.filter(e => isSameDay(new Date(e.start_at), day));

  const memberColor = (userId: string) => {
    const idx = calendar.calendar_members.findIndex(m => m.profiles.id === userId);
    return MEMBER_COLORS[idx % MEMBER_COLORS.length];
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3">
        <Link href="/demo" className="text-gray-500 hover:text-gray-700">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <h1 className="font-bold text-gray-900">{calendar.name}</h1>
          {/* Member avatars */}
          <div className="flex -space-x-1 mt-0.5">
            {calendar.calendar_members.slice(0, 6).map((m, i) => (
              <div
                key={i}
                className="w-5 h-5 rounded-full border-2 border-white overflow-hidden flex items-center justify-center text-white text-[8px] font-semibold"
                style={{ backgroundColor: MEMBER_COLORS[i % MEMBER_COLORS.length] }}
              >
                {m.profiles.full_name[0]}
              </div>
            ))}
          </div>
        </div>
        <button className="text-gray-400 hover:text-gray-600">
          <Settings size={20} />
        </button>
        <button className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-blue-600">
          <Plus size={18} />
        </button>
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
            const isToday = isSameDay(day, new Date(2026, 1, 23)); // Feb 23 is "today"

            return (
              <div key={day.toISOString()}>
                <div className={`min-h-[80px] rounded-xl p-1.5 cursor-pointer hover:bg-gray-100 transition-colors ${isToday ? 'bg-blue-50 ring-1 ring-blue-200' : 'bg-white'}`}>
                  <div className={`text-xs font-semibold w-6 h-6 rounded-full flex items-center justify-center mb-1 ${isToday ? 'bg-blue-500 text-white' : 'text-gray-700'}`}>
                    {format(day, 'd')}
                  </div>
                  {/* Event dots */}
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map(evt => (
                      <div
                        key={evt.id}
                        className="text-[10px] truncate rounded px-1 py-0.5 text-white leading-tight font-medium"
                        style={{ backgroundColor: evt.color || memberColor(evt.profiles.id) }}
                      >
                        {evt.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-[10px] text-gray-400 px-1">+{dayEvents.length - 3}</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Demo notice */}
      <div className="p-4 bg-blue-50 border-t border-blue-200">
        <p className="text-xs text-blue-700 text-center">
          🎨 <strong>Demo:</strong> TimeTree-style calendar view with color-coded events per member
        </p>
      </div>
    </div>
  );
}
