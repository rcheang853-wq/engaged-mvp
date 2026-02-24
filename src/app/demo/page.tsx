'use client';

import Link from 'next/link';
import { Calendar, Users, Plus } from 'lucide-react';

// Mock data to show the UI
const mockCalendars = [
  {
    id: '1',
    name: 'Family Calendar',
    description: 'Our family events and activities',
    color: '#3B82F6',
    calendar_members: [
      { user_id: '1', role: 'owner', profiles: { full_name: 'John Doe', avatar_url: null } },
      { user_id: '2', role: 'editor', profiles: { full_name: 'Jane Doe', avatar_url: null } },
      { user_id: '3', role: 'viewer', profiles: { full_name: 'Kid Doe', avatar_url: null } },
    ],
  },
  {
    id: '2',
    name: 'Work Projects',
    description: 'Team deadlines and meetings',
    color: '#10B981',
    calendar_members: [
      { user_id: '1', role: 'owner', profiles: { full_name: 'You', avatar_url: null } },
      { user_id: '4', role: 'editor', profiles: { full_name: 'Colleague 1', avatar_url: null } },
      { user_id: '5', role: 'editor', profiles: { full_name: 'Colleague 2', avatar_url: null } },
      { user_id: '6', role: 'viewer', profiles: { full_name: 'Manager', avatar_url: null } },
    ],
  },
  {
    id: '3',
    name: 'Friends Hangouts',
    description: null,
    color: '#F59E0B',
    calendar_members: [
      { user_id: '1', role: 'owner', profiles: { full_name: 'You', avatar_url: null } },
      { user_id: '7', role: 'editor', profiles: { full_name: 'Best Friend', avatar_url: null } },
    ],
  },
];

const MEMBER_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">My Calendars</h1>
        <button className="flex items-center gap-1 bg-blue-500 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors">
          <Plus size={16} />
          New
        </button>
      </div>

      <div className="px-4 py-4 space-y-3 max-w-2xl mx-auto">
        {mockCalendars.map(cal => (
          <Link key={cal.id} href="/demo/calendar">
            <div className="bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
            {/* Color indicator */}
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: cal.color + '20' }}
            >
              <div className="w-5 h-5 rounded-full" style={{ backgroundColor: cal.color }} />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 truncate">{cal.name}</h3>
              {cal.description && (
                <p className="text-sm text-gray-500 truncate">{cal.description}</p>
              )}
              
              {/* Member avatars */}
              <div className="flex items-center gap-1 mt-2">
                <Users size={12} className="text-gray-400" />
                <div className="flex -space-x-1">
                  {cal.calendar_members.slice(0, 5).map((m, i) => (
                    <div
                      key={i}
                      className="w-5 h-5 rounded-full border-2 border-white text-xs flex items-center justify-center text-white font-semibold overflow-hidden"
                      style={{ backgroundColor: MEMBER_COLORS[i % MEMBER_COLORS.length] }}
                    >
                      {m.profiles?.full_name?.[0] ?? '?'}
                    </div>
                  ))}
                </div>
                <span className="text-xs text-gray-400 ml-1">
                  {cal.calendar_members.length} member{cal.calendar_members.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            <svg className="w-5 h-5 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            </div>
          </Link>
        ))}

        {/* Join with code link */}
        <div className="text-center text-sm text-blue-500 py-2 cursor-pointer hover:text-blue-600">
          + Join with invite code
        </div>

        {/* Demo notice */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-2xl">
          <h3 className="font-semibold text-blue-900 mb-2">🎨 Demo Mode</h3>
          <p className="text-sm text-blue-700 mb-3">
            This is a static preview showing the TimeTree-style UI design. The calendar list, member avatars, and color-coded cards match TimeTree's visual style.
          </p>
          <p className="text-xs text-blue-600">
            To see the live version with working calendar/events, fix the auth and visit <code className="bg-blue-100 px-1 rounded">/calendars</code>
          </p>
        </div>
      </div>
    </div>
  );
}
