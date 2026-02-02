// Calendar Components Export
export { default as BasicCalendarView, CalendarViewComponent, ResponsiveCalendar, useCalendarState } from './calendar-view';
export { EnhancedCalendarView as Calendar, CalendarEventsView, useIsMobile } from './enhanced-calendar-view';
export { default as CalendarNavigation, MobileCalendarNavigation } from './calendar-navigation';
export { default as MonthView, MonthWeekView } from './month-view';
export { default as WeekView } from './week-view';
export { default as DayView, CompactDayView } from './day-view';
export { default as AgendaView, CompactAgendaView } from './agenda-view';
export { default as EventCard } from './event-card';
export { EventModal } from './event-modal';

// New Calendar Integration Components
export { CalendarDashboard } from './calendar-dashboard';
export { CalendarExportImport } from './calendar-export-import';
export { RealTimeSync } from './real-time-sync';
export { MobileCalendarWidget } from './mobile-calendar-widget';
export { ConflictResolutionDialog } from './conflict-resolution-dialog';
export { EnhancedEventModal } from './enhanced-event-modal';
export { ExternalCalendarSync } from './external-calendar-sync';
export { InvitationManager } from './invitation-manager';
export { InvitationSystem } from './invitation-system';
export { InteractiveWeekView } from './interactive-week-view';

// Re-export types for convenience (CalendarView is available through enhanced-calendar-view import)