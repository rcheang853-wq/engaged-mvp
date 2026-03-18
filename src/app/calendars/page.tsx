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
  const totalCount = calendars.length;

  useEffect(() => {
    fetch('/api/calendars')
      .then(r => r.json())
      .then(d => { setCalendars(d.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#F9FAFB] pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#F9FAFB] px-4 pt-12 pb-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-base font-bold text-[#111827]">My Calendars</h1>
            {!loading && (
              <p className="text-xs text-[#6B7280]">
                {totalCount} total | {sharedCalendars.length} shared
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/search"
              className="w-9 h-9 rounded-full bg-white border border-[#E5E7EB] flex items-center justify-center hover:bg-[#F9FAFB] transition-colors"
              title="Search events"
              aria-label="Search events"
            >
              <Search size={16} className="text-[#6B7280]" />
            </Link>
            <Link
              href="/calendars/new"
              className="flex items-center gap-1 bg-[#3B82F6] text-white px-3 py-2 rounded-xl text-sm font-semibold hover:bg-[#2563EB] transition-colors"
            >
              <Plus size={16} />
              New
            </Link>
          </div>
        </div>
      </div>

      <div className="px-4 pb-6 space-y-4 max-w-2xl mx-auto">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white border border-[#E5E7EB] rounded-2xl p-4 h-24 animate-pulse" />
            ))}
          </div>
        ) : calendars.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-4">
              <Calendar size={32} className="text-[#3B82F6]" />
            </div>
            <h2 className="text-base font-semibold text-[#111827] mb-1">No calendars yet</h2>
            <p className="text-[#6B7280] text-sm mb-6">Create a shared calendar or join one with an invite code</p>
            <div className="flex gap-3">
              <Link href="/calendars/new" className="bg-[#3B82F6] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#2563EB] transition-colors">
                Create Calendar
              </Link>
              <Link href="/join" className="bg-[#F3F4F6] text-[#374151] px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#E5E7EB] transition-colors">
                Join with Code
              </Link>
            </div>
          </div>
        ) : (
          <>
            {personalCalendars.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-xs font-semibold text-[#6B7280] px-1 uppercase tracking-[0.08em]">Personal</h2>
                {personalCalendars.map(cal => (
                  <Link key={cal.id} href={`/calendars/${cal.id}`}>
                    <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md hover:border-[#BFDBFE] transition-all">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: cal.color + '20' }}>
                        <div className="w-5 h-5 rounded-full" style={{ backgroundColor: cal.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-[#111827] truncate">{cal.name}</h3>
                        <p className="text-xs text-[#6B7280] mt-1">Just you</p>
                      </div>
                      <ChevronRight size={18} className="text-[#D1D5DB] flex-shrink-0" />
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {sharedCalendars.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-xs font-semibold text-[#6B7280] px-1 uppercase tracking-[0.08em]">Shared</h2>
                {sharedCalendars.map(cal => (
                  <Link key={cal.id} href={`/calendars/${cal.id}`}>
                    <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md hover:border-[#BFDBFE] transition-all">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: cal.color + '20' }}>
                        <div className="w-5 h-5 rounded-full" style={{ backgroundColor: cal.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-[#111827] truncate">{cal.name}</h3>
                        {cal.description ? (
                          <p className="text-sm text-[#6B7280] truncate">{cal.description}</p>
                        ) : (
                          <p className="text-sm text-[#9CA3AF] truncate">No description</p>
                        )}
                        <div className="flex items-center gap-1.5 mt-2">
                          <Users size={12} className="text-[#9CA3AF]" />
                          <div className="flex -space-x-2">
                            {cal.calendar_members?.slice(0, 5).map((m, i) => (
                              <div
                                key={i}
                                className="w-5 h-5 rounded-full bg-[#E5E7EB] border-2 border-white text-[10px] flex items-center justify-center text-[#6B7280] overflow-hidden"
                              >
                                {m.profiles?.avatar_url ? (
                                  <img src={m.profiles.avatar_url} alt={m.profiles?.full_name ?? 'Member'} className="w-full h-full object-cover" />
                                ) : (
                                  <span>{m.profiles?.full_name?.[0] ?? '?'}</span>
                                )}
                              </div>
                            ))}
                          </div>
                          <span className="text-xs text-[#9CA3AF] ml-1">
                            {cal.calendar_members?.length ?? 0} member{cal.calendar_members?.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-[#D1D5DB] flex-shrink-0" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}

        {/* Join with code */}
        {calendars.length > 0 && (
          <Link
            href="/join"
            className="flex items-center justify-center gap-2 text-sm font-semibold text-[#3B82F6] bg-white border border-[#E5E7EB] rounded-2xl py-3 hover:bg-blue-50 transition-colors"
          >
            <Users size={16} />
            Join with invite code
          </Link>
        )}
      </div>
    <BottomTabBar />
    </div>
  );
}
