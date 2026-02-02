import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My Calendar - Engaged',
  description: 'Manage your personal calendar, create events, and sync with Google Calendar and Apple Calendar. Never miss an important event again.',
  keywords: [
    'calendar',
    'events',
    'schedule',
    'personal calendar',
    'event management',
    'Google Calendar sync',
    'Apple Calendar sync',
    'time management'
  ],
  openGraph: {
    title: 'My Calendar - Engaged',
    description: 'Keep track of your events in one place. Create, edit, and sync with external calendars.',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'My Calendar - Engaged',
    description: 'Manage your personal calendar and sync with external services.',
  },
};

export default function CalendarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}