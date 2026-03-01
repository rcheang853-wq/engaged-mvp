'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { ChevronDown } from 'lucide-react';

interface CalendarMember {
  user_id: string;
  role: string;
}

interface SharedCalendar {
  id: string;
  type: 'personal' | 'shared';
  name: string;
  color: string;
  calendar_members?: CalendarMember[];
}

interface CalendarSwitcherProps {
  currentCalendarId: string;
  className?: string;
}

export default function CalendarSwitcher({ currentCalendarId, className = '' }: CalendarSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [calendars, setCalendars] = useState<SharedCalendar[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const currentCalendar = calendars.find(c => c.id === currentCalendarId);
  const personalCalendars = calendars.filter(c => c.type === 'personal');
  const sharedCalendars = calendars.filter(c => c.type !== 'personal');

  useEffect(() => {
    fetch('/api/calendars')
      .then(r => r.json())
      .then(d => {
        setCalendars(d.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleCalendarSelect = (calendarId: string) => {
    setIsOpen(false);

    if (pathname.includes('/agenda')) {
      router.push(`/calendars/${calendarId}/agenda`);
    } else {
      router.push(`/calendars/${calendarId}`);
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="w-6 h-6 bg-gray-200 rounded-full animate-pulse" />
        <div className="w-24 h-4 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  if (!currentCalendar) return null;

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 hover:bg-gray-50 rounded-lg px-2 py-1 transition-colors"
      >
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: currentCalendar.color + '40' }}
        >
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: currentCalendar.color }} />
        </div>
        <span className="font-semibold text-gray-900 text-sm">{currentCalendar.name}</span>
        <ChevronDown size={16} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-1 bg-white rounded-2xl shadow-lg border border-gray-200 z-50 w-72 max-h-96 overflow-y-auto">
            {personalCalendars.length > 0 && (
              <div className="p-2">
                <div className="text-xs font-semibold text-gray-500 px-2 py-1">Personal</div>
                {personalCalendars.map(cal => (
                  <button
                    key={cal.id}
                    onClick={() => handleCalendarSelect(cal.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors ${cal.id === currentCalendarId ? 'bg-blue-50' : ''}`}
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: cal.color + '20' }}>
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cal.color }} />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-semibold text-sm text-gray-900">{cal.name}</div>
                      <div className="text-xs text-gray-500">Just you</div>
                    </div>
                    {cal.id === currentCalendarId && (
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                    )}
                  </button>
                ))}
              </div>
            )}

            {sharedCalendars.length > 0 && (
              <div className="p-2 border-t border-gray-100">
                <div className="text-xs font-semibold text-gray-500 px-2 py-1">Shared</div>
                {sharedCalendars.map(cal => (
                  <button
                    key={cal.id}
                    onClick={() => handleCalendarSelect(cal.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors ${cal.id === currentCalendarId ? 'bg-blue-50' : ''}`}
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: cal.color + '20' }}>
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cal.color }} />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-semibold text-sm text-gray-900">{cal.name}</div>
                      <div className="text-xs text-gray-500">
                        {cal.calendar_members?.length || 0} member{cal.calendar_members?.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                    {cal.id === currentCalendarId && (
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
