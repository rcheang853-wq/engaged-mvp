// Calendar metrics types
export interface CalendarMetrics {
  totalEvents: number;
  upcomingEvents: number;
  conflictCount: number;
  overdueEvents: number;
  eventsThisWeek: number;
  eventsThisMonth: number;
  averageEventsPerDay: number;
  mostActiveDay: string;
  eventsByPriority: {
    urgent: number;
    high: number;
    normal: number;
    low: number;
  };
  eventsByStatus: {
    confirmed: number;
    tentative: number;
    cancelled: number;
    draft: number;
  };
  eventsByType: {
    meeting: number;
    appointment: number;
    reminder: number;
    deadline: number;
    other: number;
  };
  timeBlockAnalysis: {
    busyHours: { hour: number; count: number }[];
    freeHours: { hour: number; available: boolean }[];
    averageBusyHoursPerDay: number;
  };
  externalCalendarStats: {
    totalSynced: number;
    lastSyncTime: Date | null;
    syncErrors: number;
  };
}