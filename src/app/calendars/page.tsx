'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Users, Calendar, ChevronRight, Search } from 'lucide-react';
import BottomTabBar from '@/components/BottomTabBar';

interface CalendarMember {
  user_id: string;
  role: string;
  profiles: { full_name: string; avatar_url: string | null };
}

interface SharedCalendar {
  id: string;
  type: 'personal' | 'shared';
  name: string;
  description: string | null;
  color: string;
  calendar_members: CalendarMember[];
}

export default function CalendarsPage() {
  const [calendars, setCalendars] = useState<SharedCalendar[]>([]);
  const [loading, setLoading] = useState(true);

  const personalCalendars = calendars.filter(c => c.type === 'personal');
  const sharedCalendars = calendars.filter(c => c.type !== 'personal');

  useEffect(() => {
    fetch('/api/calendars')
      .then(r => r.json())
      .then(d => { setCalendars(d.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b px-4 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">My Calendars</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/search"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Search events"
          >
            <Search size={20} className="text-gray-700" />
          </Link>
          <Link
            href="/calendars/new"
            className="flex items-center gap-1 bg-blue-500 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
          >
            <Plus size={16} />
            New
          </Link>
        </div>
      </div>

      <div className="px-4 py-4 space-y-3 max-w-2xl mx-auto">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl p-4 h-24 animate-pulse" />
            ))}
          </div>
        ) : calendars.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-4">
              <Calendar size={36} className="text-blue-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-800 mb-1">No calendars yet</h2>
            <p className="text-gray-500 text-sm mb-6">Create a shared calendar or join one with an invite code</p>
            <div className="flex gap-3">
              <Link href="/calendars/new" className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium">
                Create Calendar
              </Link>
              <Link href="/join" className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium">
                Join with Code
              </Link>
            </div>
          </div>
        ) : (
          <>
            {personalCalendars.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-xs font-semibold text-gray-500 px-1">Personal</h2>
                {personalCalendars.map(cal => (
                  <Link key={cal.id} href={`/calendars/${cal.id}`}>
                    <div className="bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: cal.color + '20' }}>
                        <div className="w-5 h-5 rounded-full" style={{ backgroundColor: cal.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{cal.name}</h3>
                        <p className="text-xs text-gray-500 mt-1">Just you</p>
                      </div>
                      <ChevronRight size={18} className="text-gray-300 flex-shrink-0" />
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {sharedCalendars.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-xs font-semibold text-gray-500 px-1">Shared</h2>
                {sharedCalendars.map(cal => (
                  <Link key={cal.id} href={`/calendars/${cal.id}`}>
                    <div className="bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: cal.color + '20' }}>
                        <div className="w-5 h-5 rounded-full" style={{ backgroundColor: cal.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{cal.name}</h3>
                        {cal.description && (
                          <p className="text-sm text-gray-500 truncate">{cal.description}</p>
                        )}
                        <div className="flex items-center gap-1 mt-2">
                          <Users size={12} className="text-gray-400" />
                          <div className="flex -space-x-1">
                            {cal.calendar_members?.slice(0, 5).map((m, i) => (
                              <div
                                key={i}
                                className="w-5 h-5 rounded-full bg-gray-300 border-2 border-white text-xs flex items-center justify-center text-gray-600 overflow-hidden"
                              >
                                {m.profiles?.avatar_url ? (
                                  <img src={m.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-[8px]">{m.profiles?.full_name?.[0] ?? '?'}</span>
                                )}
                              </div>
                            ))}
                          </div>
                          <span className="text-xs text-gray-400 ml-1">
                            {cal.calendar_members?.length ?? 0} member{cal.calendar_members?.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-gray-300 flex-shrink-0" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}

        {/* Join with code */}
        {calendars.length > 0 && (
          <Link href="/join" className="block text-center text-sm text-blue-500 py-2">
            + Join with invite code
          </Link>
        )}
      </div>
    <BottomTabBar />
    </div>
  );
}
