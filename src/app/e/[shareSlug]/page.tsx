'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getEventByShareSlug } from '@/lib/supabase/events';
import { Loader2, Calendar, Clock, MapPin, Lock } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';

export default function SharedEventPage() {
  const params = useParams();
  const shareSlug = params?.shareSlug as string;
  
  const [event, setEvent] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEvent() {
      if (!shareSlug) {
        setError('Invalid share link');
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await getEventByShareSlug(shareSlug);
        
        if (fetchError || !data) {
          setError('Event not found or no longer shared');
        } else {
          setEvent(data);
        }
      } catch (err) {
        setError('Failed to load event');
      } finally {
        setLoading(false);
      }
    }

    fetchEvent();
  }, [shareSlug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Calendar className="h-8 w-8 text-gray-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Event Not Found</h1>
          <p className="text-gray-600 mb-6">
            This event doesn't exist or is no longer being shared.
          </p>
          <Link 
            href="/auth/signup"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition"
          >
            Create Your Own Events
          </Link>
        </div>
      </div>
    );
  }

  const startDate = new Date(event.start_time);
  const endDate = new Date(event.end_time);
  const isSameDay = startDate.toDateString() === endDate.toDateString();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6">
            <div className="flex items-center gap-3 text-white/80 text-sm mb-2">
              <Calendar className="h-4 w-4" />
              <span>Shared Event</span>
            </div>
            <h1 className="text-3xl font-bold text-white">{event.title}</h1>
          </div>

          {/* Event Details */}
          <div className="p-8 space-y-6">
            {/* Date and Time */}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">When</h3>
                <p className="text-gray-700">
                  {format(startDate, 'EEEE, MMMM d, yyyy')}
                </p>
                <p className="text-gray-600 text-sm mt-1">
                  {format(startDate, 'h:mm a')} - {format(endDate, 'h:mm a')}
                  {!isSameDay && ` (${format(endDate, 'MMM d')})`}
                </p>
              </div>
            </div>

            {/* Location */}
            {event.location && (
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <MapPin className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Where</h3>
                  <p className="text-gray-700">{event.location}</p>
                </div>
              </div>
            )}

            {/* Private Notes Hidden Message */}
            <div className="flex items-start gap-4 bg-gray-50 rounded-xl p-4">
              <div className="w-12 h-12 bg-gray-200 rounded-xl flex items-center justify-center flex-shrink-0">
                <Lock className="h-6 w-6 text-gray-500" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-700 mb-1">Private Details</h3>
                <p className="text-gray-600 text-sm">
                  Additional notes and details are kept private by the event owner.
                </p>
              </div>
            </div>
          </div>

          {/* Footer CTA */}
          <div className="bg-gray-50 px-8 py-6 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-700 font-medium">Want to create your own events?</p>
                <p className="text-gray-500 text-sm">Manage your calendar and share events easily.</p>
              </div>
              <Link 
                href="/auth/signup"
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition whitespace-nowrap"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>

        {/* Powered by footer */}
        <div className="text-center mt-6">
          <p className="text-gray-500 text-sm">
            Powered by <span className="font-semibold text-gray-700">Engaged</span>
          </p>
        </div>
      </div>
    </div>
  );
}
