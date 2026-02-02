'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { PersonalEventsCalendar } from '@/components/calendar/personal-events-calendar';
import { createEvent, updateEvent, deleteEvent, getEvents, PersonalEvent } from '@/lib/supabase/events';
import { useAuth } from '@/hooks/use-auth';
import { Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PersonalCalendarPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [events, setEvents] = useState<PersonalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await getEvents();
      
      if (fetchError) {
        setError(fetchError.message);
      } else {
        setEvents(data || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch events');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchEvents();
    }
  }, [user, fetchEvents]);

  const handleCreateEvent = async (eventData: Omit<PersonalEvent, 'id' | 'created_at' | 'updated_at'>) => {
    if (!user) throw new Error('Not authenticated');

    const { data, error: createError } = await createEvent({
      title: eventData.title,
      start_time: eventData.start_time,
      end_time: eventData.end_time,
      location: eventData.location || null,
      notes: eventData.notes || null,
    });

    if (createError) {
      throw new Error(createError.message);
    }

    if (data) {
      setEvents(prev => [...prev, data]);
    }
  };

  const handleUpdateEvent = async (id: string, updates: Partial<PersonalEvent>) => {
    const { data, error: updateError } = await updateEvent(id, {
      title: updates.title || undefined,
      start_time: updates.start_time || undefined,
      end_time: updates.end_time || undefined,
      location: updates.location || undefined,
      notes: updates.notes || undefined,
    });

    if (updateError) {
      throw new Error(updateError.message);
    }

    if (data) {
      setEvents(prev => prev.map(event => event.id === id ? data : event));
    }
  };

  const handleDeleteEvent = async (id: string) => {
    const { success, error: deleteError } = await deleteEvent(id);

    if (!success || deleteError) {
      throw new Error(deleteError?.message || 'Failed to delete event');
    }

    setEvents(prev => prev.filter(event => event.id !== id));
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <AlertCircle className="h-12 w-12 text-gray-400" />
        <p className="text-gray-600">Please sign in to view your calendar</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <div className="bg-white border-b px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900">My Calendar</h1>
        <p className="text-gray-500 mt-1">Manage your personal events</p>
      </div>
      
      <div className="flex-1 overflow-hidden">
        <PersonalEventsCalendar
          events={events}
          onCreateEvent={handleCreateEvent}
          onUpdateEvent={handleUpdateEvent}
          onDeleteEvent={handleDeleteEvent}
          loading={loading}
        />
      </div>
    </div>
  );
}
