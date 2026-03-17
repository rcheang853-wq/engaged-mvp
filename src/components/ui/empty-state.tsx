import { CalendarDays, Inbox, Search, UserPlus } from 'lucide-react';
import Link from 'next/link';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4 text-gray-400">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 max-w-sm mb-6">{description}</p>
      {action && (
        action.href ? (
          <Link
            href={action.href}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            {action.label}
          </Link>
        ) : (
          <button
            onClick={action.onClick}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            {action.label}
          </button>
        )
      )}
    </div>
  );
}

export function NoEventsToday({ calendarId }: { calendarId: string }) {
  return (
    <EmptyState
      icon={<CalendarDays size={32} />}
      title="No events today"
      description="Looks like you have a free day! Browse public events or create your own."
      action={{
        label: "Create Event",
        href: `/calendars/${calendarId}/events/new?date=${new Date().toISOString().split('T')[0]}`,
      }}
    />
  );
}

export function NoCalendarEvents({ calendarId }: { calendarId: string }) {
  return (
    <EmptyState
      icon={<CalendarDays size={32} />}
      title="No events yet"
      description="Start organizing your time by creating your first event."
      action={{
        label: "Create Your First Event",
        href: `/calendars/${calendarId}/events/new`,
      }}
    />
  );
}

export function NoInvites() {
  return (
    <EmptyState
      icon={<Inbox size={32} />}
      title="No invites"
      description="You don't have any pending calendar invitations at the moment."
    />
  );
}

export function NoSearchResults() {
  return (
    <EmptyState
      icon={<Search size={32} />}
      title="No results found"
      description="Try adjusting your search or filters to find what you're looking for."
    />
  );
}

export function NoMembers({ onInvite }: { onInvite?: () => void }) {
  return (
    <EmptyState
      icon={<UserPlus size={32} />}
      title="No members yet"
      description="Invite people to collaborate on this calendar."
      action={onInvite ? {
        label: "Invite Someone",
        onClick: onInvite,
      } : undefined}
    />
  );
}
