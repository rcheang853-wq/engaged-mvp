'use client';

import React, { useState } from 'react';
import { Calendar, ResponsiveCalendar, CalendarView } from '@/components/calendar';
import { Event } from '@/types';

// Demo events for testing
const demoEvents: Event[] = [
  {
    id: '1',
    title: 'Team Meeting',
    description: 'Weekly team sync meeting',
    shortDescription: 'Team sync',
    startTime: new Date(2024, 0, 15, 10, 0),
    endTime: new Date(2024, 0, 15, 11, 0),
    timezone: 'America/New_York',
    allDay: false,
    venue: {
      id: 'office1',
      name: 'Conference Room A',
      address: '123 Business Ave',
      city: 'New York',
      latitude: 40.7128,
      longitude: -74.0060,
    },
    organizer: {
      id: 'user1',
      organizationName: 'Acme Corp',
      isVerified: true,
    },
    category: {
      id: 'work',
      name: 'Work',
      slug: 'work',
      color: '#3B82F6',
    },
    tags: ['meeting', 'team'],
    isFree: true,
    priceRange: [0, 0],
    registrationRequired: false,
    popularityScore: 80,
    qualityScore: 85,
    status: 'published',
    isFeatured: false,
    isTrending: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    publishedAt: new Date(),
    galleryUrls: [],
  },
  {
    id: '2',
    title: 'Project Deadline',
    description: 'Submit final project deliverables',
    shortDescription: 'Project due',
    startTime: new Date(2024, 0, 16, 0, 0),
    endTime: new Date(2024, 0, 16, 23, 59),
    timezone: 'America/New_York',
    allDay: true,
    category: {
      id: 'deadline',
      name: 'Deadline',
      slug: 'deadline',
      color: '#EF4444',
    },
    tags: ['deadline', 'important'],
    isFree: true,
    priceRange: [0, 0],
    registrationRequired: false,
    popularityScore: 90,
    qualityScore: 95,
    status: 'published',
    isFeatured: true,
    isTrending: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    publishedAt: new Date(),
    galleryUrls: [],
  },
  {
    id: '3',
    title: 'Coffee with Client',
    description: 'Discuss new project requirements',
    shortDescription: 'Client meeting',
    startTime: new Date(2024, 0, 17, 15, 30),
    endTime: new Date(2024, 0, 17, 16, 30),
    timezone: 'America/New_York',
    allDay: false,
    venue: {
      id: 'cafe1',
      name: 'Downtown Cafe',
      address: '456 Main St',
      city: 'New York',
      latitude: 40.7580,
      longitude: -73.9855,
    },
    organizer: {
      id: 'user2',
      organizationName: 'Client Solutions Inc',
      isVerified: true,
    },
    category: {
      id: 'business',
      name: 'Business',
      slug: 'business',
      color: '#10B981',
    },
    tags: ['client', 'business'],
    isFree: true,
    priceRange: [0, 0],
    registrationRequired: false,
    popularityScore: 75,
    qualityScore: 80,
    status: 'published',
    isFeatured: false,
    isTrending: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    publishedAt: new Date(),
    galleryUrls: [],
  },
];

/**
 * Calendar Demo Component
 * Showcases all calendar views with demo data
 */
export const CalendarDemo: React.FC = () => {
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
    console.log('Event clicked:', event);
  };

  const handleDateSelect = (date: Date) => {
    console.log('Date selected:', date);
  };

  const handleTimeSlotClick = (date: Date, hour: number, minute?: number) => {
    console.log('Time slot clicked:', { date, hour, minute });
  };

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Calendar UI Components Demo
        </h1>
        <p className="text-gray-600 mb-6">
          Interactive demonstration of all calendar views with sample events.
        </p>
      </div>

      {/* Main Calendar Component */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-4 bg-gray-50 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Full Calendar Component
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Switch between Month, Week, Day, and Agenda views. Click events or dates to interact.
          </p>
        </div>

        <div className="h-[600px]">
          <ResponsiveCalendar
            initialDate={new Date(2024, 0, 15)} // January 15, 2024
            initialView="month"
            events={demoEvents}
            onEventClick={handleEventClick}
            onDateSelect={handleDateSelect}
            onTimeSlotClick={handleTimeSlotClick}
          />
        </div>
      </div>

      {/* Selected Event Details */}
      {selectedEvent && (
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-blue-900">
              Selected Event Details
            </h3>
            <button
              onClick={() => setSelectedEvent(null)}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              Close ×
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="font-medium text-blue-800">Title:</p>
              <p className="text-blue-700">{selectedEvent.title}</p>
            </div>

            <div>
              <p className="font-medium text-blue-800">Category:</p>
              <p className="text-blue-700">{selectedEvent.category?.name || 'None'}</p>
            </div>

            <div>
              <p className="font-medium text-blue-800">Date & Time:</p>
              <p className="text-blue-700">
                {selectedEvent.allDay ? 'All Day' :
                 `${selectedEvent.startTime.toLocaleString()} - ${selectedEvent.endTime.toLocaleTimeString()}`}
              </p>
            </div>

            <div>
              <p className="font-medium text-blue-800">Location:</p>
              <p className="text-blue-700">
                {selectedEvent.venue ? `${selectedEvent.venue.name}, ${selectedEvent.venue.city}` : 'TBD'}
              </p>
            </div>

            {selectedEvent.description && (
              <div className="md:col-span-2">
                <p className="font-medium text-blue-800">Description:</p>
                <p className="text-blue-700">{selectedEvent.description}</p>
              </div>
            )}

            {selectedEvent.tags.length > 0 && (
              <div className="md:col-span-2">
                <p className="font-medium text-blue-800">Tags:</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {selectedEvent.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Usage Instructions */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          How to Use
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-800 mb-2">Navigation</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Use arrow buttons to navigate between periods</li>
              <li>• Click "Today" to jump to current date</li>
              <li>• Switch views using Month/Week/Day/Agenda buttons</li>
              <li>• Click dates in month view to select them</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-gray-800 mb-2">Interactions</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Click events to view details</li>
              <li>• Click time slots in Week/Day views</li>
              <li>• Search events in Agenda view</li>
              <li>• Filter by categories in Agenda view</li>
            </ul>
          </div>
        </div>

        <div className="mt-6 p-4 bg-blue-100 rounded-lg">
          <h4 className="font-medium text-blue-800 mb-2">Features Demonstrated</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-700">
            <div>
              <p className="font-medium">Views:</p>
              <p>Month, Week, Day, Agenda</p>
            </div>
            <div>
              <p className="font-medium">Responsive:</p>
              <p>Mobile-friendly design</p>
            </div>
            <div>
              <p className="font-medium">Accessibility:</p>
              <p>Keyboard navigation, ARIA labels</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarDemo;