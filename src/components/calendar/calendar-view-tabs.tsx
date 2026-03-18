'use client';

import Link from 'next/link';

type ViewType = 'month' | 'agenda' | '3day';

interface CalendarViewTabsProps {
  calendarId: string;
  active: ViewType;
  /** Optional selected date (YYYY-MM-DD). When provided, it is forwarded to Agenda/3-day routes. */
  date?: string;
  className?: string;
}

const TABS: Array<{ key: ViewType; label: string; href: (id: string, date?: string) => string }> = [
  { key: 'month', label: 'Month', href: (id) => `/calendars/${id}` },
  {
    key: 'agenda',
    label: 'Agenda',
    href: (id, date) => (date ? `/calendars/${id}/agenda?date=${encodeURIComponent(date)}` : `/calendars/${id}/agenda`),
  },
  {
    key: '3day',
    label: '3 days',
    href: (id, date) => (date ? `/calendars/${id}/3day?date=${encodeURIComponent(date)}` : `/calendars/${id}/3day`),
  },
];

export default function CalendarViewTabs({ calendarId, active, date, className = '' }: CalendarViewTabsProps) {
  return (
    <nav className={`flex items-center gap-1 ${className}`} aria-label="Calendar view switcher">
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Link
            key={tab.key}
            href={tab.href(calendarId, date)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              isActive
                ? 'bg-blue-50 text-blue-600 font-semibold'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
            aria-current={isActive ? 'page' : undefined}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
