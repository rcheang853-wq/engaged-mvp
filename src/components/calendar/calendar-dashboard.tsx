'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useCalendarEvents } from '@/hooks/use-calendar-events';
import { EnhancedCalendarView } from './enhanced-calendar-view';
import { MobileCalendarWidget } from './mobile-calendar-widget';
import { CalendarExportImport } from './calendar-export-import';
import { RealTimeSync } from './real-time-sync';
import { ExternalCalendarSync } from './external-calendar-sync';
import { EnhancedEventModal } from './enhanced-event-modal';
import { ConflictResolutionDialog } from './conflict-resolution-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Calendar,
  Clock,
  AlertTriangle,
  TrendingUp,
  Users,
  MapPin,
  Settings,
  Plus,
  Filter,
  Search,
  Bell
} from 'lucide-react';
import { EnhancedCalendarEvent, CalendarMetrics, ConflictDetails } from '@/types/calendar';
import { calendarService } from '@/services/calendar-service';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface CalendarDashboardProps {
  initialView?: 'month' | 'week' | 'day' | 'agenda';
  showSidebar?: boolean;
  className?: string;
}

export const CalendarDashboard: React.FC<CalendarDashboardProps> = ({
  initialView = 'month',
  showSidebar = true,
  className
}) => {
  const { user, isAuthenticated } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentView, setCurrentView] = useState(initialView);
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EnhancedCalendarEvent | null>(null);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [pendingConflicts, setPendingConflicts] = useState<ConflictDetails[]>([]);
  const [metrics, setMetrics] = useState<CalendarMetrics | null>(null);
  const [activeTab, setActiveTab] = useState('calendar');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    priority: [] as string[],
    status: [] as string[],
    hasConflicts: false
  });

  // Get calendar events
  const {
    events,
    isLoading,
    error,
    createEvent,
    updateEvent,
    deleteEvent,
    refetch
  } = useCalendarEvents({
    userId: user?.id,
    enabled: isAuthenticated
  });

  // Load calendar metrics
  useEffect(() => {
    if (user?.id) {
      loadMetrics();
    }
  }, [user?.id, events]);

  const loadMetrics = async () => {
    if (!user?.id) return;

    try {
      const result = await calendarService.getCalendarMetrics(user.id);
      if (result.success && result.data) {
        setMetrics(result.data);
      }
    } catch (error) {
      console.error('Error loading calendar metrics:', error);
    }
  };

  // Filter events based on search and filters
  const filteredEvents = React.useMemo(() => {
    if (!events) return [];

    return events.filter(event => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!event.title.toLowerCase().includes(query) &&
            !event.description?.toLowerCase().includes(query) &&
            !event.location?.toLowerCase().includes(query)) {
          return false;
        }
      }

      // Priority filter
      if (filters.priority.length > 0 && !filters.priority.includes(event.priority)) {
        return false;
      }

      // Status filter
      if (filters.status.length > 0 && !filters.status.includes(event.status)) {
        return false;
      }

      // Conflicts filter
      if (filters.hasConflicts && (!event.conflicts || event.conflicts.length === 0)) {
        return false;
      }

      return true;
    });
  }, [events, searchQuery, filters]);

  const handleEventClick = (event: EnhancedCalendarEvent) => {
    setSelectedEvent(event);
    setShowEventModal(true);
    setIsCreatingEvent(false);
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

  const handleTimeSlotClick = (date: Date, hour: number) => {
    const newEventDate = new Date(date);
    newEventDate.setHours(hour, 0, 0, 0);
    setSelectedDate(newEventDate);
    setSelectedEvent(null);
    setIsCreatingEvent(true);
    setShowEventModal(true);
  };

  const handleCreateEvent = () => {
    setSelectedEvent(null);
    setIsCreatingEvent(true);
    setShowEventModal(true);
  };

  const handleEventSave = async (eventData: Partial<EnhancedCalendarEvent>) => {
    try {
      let result;

      if (isCreatingEvent) {
        result = await createEvent({
          ...eventData,
          start_time: eventData.startTime?.toISOString() || selectedDate.toISOString(),
          end_time: eventData.endTime?.toISOString() || new Date(selectedDate.getTime() + 60 * 60 * 1000).toISOString(),
        });
      } else if (selectedEvent) {
        result = await updateEvent(selectedEvent.id, eventData);
      }

      // Check for conflicts in the response
      if (result && 'conflicts' in result && result.conflicts) {
        setPendingConflicts(result.conflicts);
        setShowConflictDialog(true);
      }

      setShowEventModal(false);
      setSelectedEvent(null);
      setIsCreatingEvent(false);
      refetch();
      loadMetrics();
    } catch (error) {
      console.error('Error saving event:', error);
    }
  };

  const handleEventDelete = async (eventId: string) => {
    try {
      await deleteEvent(eventId);
      setShowEventModal(false);
      setSelectedEvent(null);
      refetch();
      loadMetrics();
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  const handleConflictResolution = async (resolution: any) => {
    // Handle conflict resolution logic here
    setShowConflictDialog(false);
    setPendingConflicts([]);
    refetch();
  };

  const upcomingEvents = React.useMemo(() => {
    if (!events) return [];
    const now = new Date();
    return events
      .filter(event => event.startTime > now && event.status === 'confirmed')
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
      .slice(0, 5);
  }, [events]);

  const conflictEvents = React.useMemo(() => {
    if (!events) return [];
    return events.filter(event => event.conflicts && event.conflicts.length > 0);
  }, [events]);

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Sign in to view your calendar</h3>
          <p className="text-gray-500 mb-4">Access your events, create new ones, and sync with external calendars.</p>
          <Button onClick={() => window.location.href = '/auth/signin'}>
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full bg-gray-50', className)}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
            <p className="text-sm text-gray-500">{user?.fullName || user?.email}</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Quick Actions */}
            <CalendarExportImport userId={user?.id || ''} onEventsUpdated={refetch} />

            <Button onClick={handleCreateEvent} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              New Event
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {showSidebar && (
          <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
            {/* Mini Calendar */}
            <div className="p-4 border-b border-gray-200">
              <MobileCalendarWidget
                events={filteredEvents}
                onEventClick={handleEventClick}
                onDateSelect={handleDateSelect}
                onCreateEvent={handleCreateEvent}
                initialDate={selectedDate}
                compact
                showAgenda={false}
              />
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <TabsList className="grid w-full grid-cols-3 m-4 mb-0">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="agenda">Agenda</TabsTrigger>
                <TabsTrigger value="sync">Sync</TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto">
                <TabsContent value="overview" className="p-4 space-y-4">
                  {/* Metrics Cards */}
                  {metrics && (
                    <div className="grid grid-cols-2 gap-3">
                      <Card>
                        <CardContent className="p-3">
                          <div className="text-2xl font-bold text-blue-600">{metrics.totalEvents}</div>
                          <div className="text-xs text-gray-500">Total Events</div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-3">
                          <div className="text-2xl font-bold text-green-600">{metrics.upcomingEvents}</div>
                          <div className="text-xs text-gray-500">Upcoming</div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-3">
                          <div className="text-2xl font-bold text-red-600">{metrics.conflictCount}</div>
                          <div className="text-xs text-gray-500">Conflicts</div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-3">
                          <div className="text-2xl font-bold text-orange-600">{metrics.overdueEvents}</div>
                          <div className="text-xs text-gray-500">Overdue</div>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* Conflict Alerts */}
                  {conflictEvents.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                          Scheduling Conflicts
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-2">
                          {conflictEvents.slice(0, 3).map(event => (
                            <div
                              key={event.id}
                              onClick={() => handleEventClick(event)}
                              className="flex items-center gap-2 p-2 rounded bg-red-50 cursor-pointer hover:bg-red-100 transition-colors"
                            >
                              <div className="w-2 h-2 bg-red-500 rounded-full" />
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-medium text-red-900 truncate">
                                  {event.title}
                                </div>
                                <div className="text-xs text-red-700">
                                  {event.conflicts?.length} conflict{event.conflicts?.length !== 1 ? 's' : ''}
                                </div>
                              </div>
                            </div>
                          ))}
                          {conflictEvents.length > 3 && (
                            <div className="text-xs text-red-600 text-center">
                              +{conflictEvents.length - 3} more conflicts
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Real-time Sync Status */}
                  <RealTimeSync
                    userId={user?.id || ''}
                    onSyncUpdate={refetch}
                  />
                </TabsContent>

                <TabsContent value="agenda" className="p-4">
                  {/* Upcoming Events */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Upcoming Events</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {upcomingEvents.length > 0 ? (
                        <div className="space-y-3">
                          {upcomingEvents.map(event => (
                            <motion.div
                              key={event.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              onClick={() => handleEventClick(event)}
                              className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors"
                            >
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: event.color || '#3b82f6' }}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-gray-900 truncate">
                                  {event.title}
                                </div>
                                <div className="text-xs text-gray-500 flex items-center gap-2">
                                  <Clock className="w-3 h-3" />
                                  {event.startTime.toLocaleDateString()} • {event.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                                {event.location && (
                                  <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                    <MapPin className="w-3 h-3" />
                                    <span className="truncate">{event.location}</span>
                                  </div>
                                )}
                              </div>
                              {event.priority !== 'normal' && (
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    'text-xs',
                                    event.priority === 'urgent' && 'border-red-200 text-red-700',
                                    event.priority === 'high' && 'border-orange-200 text-orange-700',
                                    event.priority === 'low' && 'border-gray-200 text-gray-600'
                                  )}
                                >
                                  {event.priority}
                                </Badge>
                              )}
                            </motion.div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Calendar className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-500">No upcoming events</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="sync" className="p-4">
                  <ExternalCalendarSync />
                </TabsContent>
              </div>
            </Tabs>
          </div>
        )}

        {/* Main Calendar View */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 bg-white">
            <EnhancedCalendarView
              initialDate={selectedDate}
              initialView={currentView}
              events={filteredEvents}
              onEventClick={handleEventClick}
              onDateSelect={handleDateSelect}
              onTimeSlotClick={handleTimeSlotClick}
              onViewChange={setCurrentView}
              isLoading={isLoading}
              className="h-full"
            />
          </div>
        </div>
      </div>

      {/* Event Modal */}
      {showEventModal && (
        <EnhancedEventModal
          isOpen={showEventModal}
          onClose={() => {
            setShowEventModal(false);
            setSelectedEvent(null);
            setIsCreatingEvent(false);
          }}
          event={selectedEvent}
          isCreating={isCreatingEvent}
          onSave={handleEventSave}
          onDelete={selectedEvent ? () => handleEventDelete(selectedEvent.id) : undefined}
          defaultDate={selectedDate}
          allEvents={events || []}
          invitations={[]} // TODO: Load invitations
          onSendInvitation={async (invitations) => {
            console.log('Send invitations:', invitations);
          }}
          onResendInvitation={async (invitationId) => {
            console.log('Resend invitation:', invitationId);
          }}
          onCancelInvitation={async (invitationId) => {
            console.log('Cancel invitation:', invitationId);
          }}
          onUpdateRSVP={async (invitationId, rsvpStatus, note) => {
            console.log('Update RSVP:', invitationId, rsvpStatus, note);
          }}
          isOrganizer={true}
        />
      )}

      {/* Conflict Resolution Dialog */}
      {showConflictDialog && (
        <ConflictResolutionDialog
          isOpen={showConflictDialog}
          onClose={() => setShowConflictDialog(false)}
          conflicts={pendingConflicts}
          event={selectedEvent}
          onResolve={handleConflictResolution}
        />
      )}
    </div>
  );
};

export default CalendarDashboard;