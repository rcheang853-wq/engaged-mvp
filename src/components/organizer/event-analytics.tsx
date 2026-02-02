'use client';

import { useState, useEffect } from 'react';
import {
  BarChart3,
  Eye,
  Heart,
  Users,
  ExternalLink,
  Share2,
  TrendingUp,
  Calendar,
  Download,
  Filter,
} from 'lucide-react';
import { EventAnalytics as EventAnalyticsType } from '@/types/organizer';

interface EventAnalyticsProps {
  eventId: string;
  organizerId: string;
}

interface TimeRange {
  label: string;
  value: 'week' | 'month' | 'quarter' | 'year';
}

const timeRanges: TimeRange[] = [
  { label: 'Last 7 days', value: 'week' },
  { label: 'Last 30 days', value: 'month' },
  { label: 'Last 3 months', value: 'quarter' },
  { label: 'Last year', value: 'year' },
];

export function EventAnalytics({ eventId, organizerId }: EventAnalyticsProps) {
  const [analytics, setAnalytics] = useState<EventAnalyticsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>(timeRanges[0]);

  useEffect(() => {
    loadAnalytics();
  }, [eventId, organizerId, selectedTimeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Mock analytics data - in real implementation, call OrganizerService.getEventAnalytics
      const mockAnalytics: EventAnalyticsType = {
        eventId,
        eventTitle: 'Summer Music Festival 2024',
        status: 'published',
        views: 1247,
        saves: 89,
        rsvps: 45,
        ticketClicks: 23,
        shareClicks: 12,
        conversionRate: 3.6,
        engagementScore: 78.5,
        createdAt: new Date('2024-06-01'),
        publishedAt: new Date('2024-06-05'),
        periodStats: {
          daily: [
            { date: '2024-06-01', views: 45, saves: 3, rsvps: 1 },
            { date: '2024-06-02', views: 78, saves: 5, rsvps: 2 },
            { date: '2024-06-03', views: 123, saves: 8, rsvps: 4 },
            { date: '2024-06-04', views: 156, saves: 12, rsvps: 7 },
            { date: '2024-06-05', views: 203, saves: 15, rsvps: 9 },
            { date: '2024-06-06', views: 267, saves: 21, rsvps: 12 },
            { date: '2024-06-07', views: 375, saves: 25, rsvps: 10 },
          ],
          weekly: [],
          monthly: [],
        },
      };

      setAnalytics(mockAnalytics);
    } catch (err) {
      console.error('Error loading analytics:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const getGrowthRate = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toString();
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center">
          <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to load analytics</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadAnalytics}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{analytics.eventTitle}</h2>
            <p className="text-gray-600">Analytics Dashboard</p>
          </div>
          <div className="flex items-center space-x-3">
            <select
              value={selectedTimeRange.value}
              onChange={(e) => {
                const range = timeRanges.find(r => r.value === e.target.value);
                if (range) setSelectedTimeRange(range);
              }}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {timeRanges.map((range) => (
                <option key={range.value} value={range.value}>
                  {range.label}
                </option>
              ))}
            </select>
            <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total Views</p>
                <p className="text-2xl font-bold text-blue-900">{formatNumber(analytics.views)}</p>
              </div>
              <Eye className="w-8 h-8 text-blue-600" />
            </div>
            <div className="mt-2 flex items-center text-sm">
              <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
              <span className="text-green-600 font-medium">+15.3%</span>
              <span className="text-gray-600 ml-1">vs last period</span>
            </div>
          </div>

          <div className="bg-red-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600">Saves</p>
                <p className="text-2xl font-bold text-red-900">{formatNumber(analytics.saves)}</p>
              </div>
              <Heart className="w-8 h-8 text-red-600" />
            </div>
            <div className="mt-2 flex items-center text-sm">
              <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
              <span className="text-green-600 font-medium">+8.7%</span>
              <span className="text-gray-600 ml-1">vs last period</span>
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">RSVPs</p>
                <p className="text-2xl font-bold text-green-900">{formatNumber(analytics.rsvps)}</p>
              </div>
              <Users className="w-8 h-8 text-green-600" />
            </div>
            <div className="mt-2 flex items-center text-sm">
              <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
              <span className="text-green-600 font-medium">+23.1%</span>
              <span className="text-gray-600 ml-1">vs last period</span>
            </div>
          </div>

          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Conversion Rate</p>
                <p className="text-2xl font-bold text-purple-900">{analytics.conversionRate.toFixed(1)}%</p>
              </div>
              <BarChart3 className="w-8 h-8 text-purple-600" />
            </div>
            <div className="mt-2 flex items-center text-sm">
              <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
              <span className="text-green-600 font-medium">+2.1%</span>
              <span className="text-gray-600 ml-1">vs last period</span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Engagement Over Time */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Engagement Over Time</h3>
          <div className="h-64 flex items-end justify-between space-x-2">
            {analytics.periodStats.daily.map((day, index) => {
              const maxViews = Math.max(...analytics.periodStats.daily.map(d => d.views));
              const height = (day.views / maxViews) * 100;
              return (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div className="w-full bg-blue-100 rounded-t" style={{ height: `${height}%` }}>
                    <div
                      className="w-full bg-blue-600 rounded-t"
                      style={{ height: `${(day.saves / day.views) * 100}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-600 mt-2 transform rotate-45 origin-left">
                    {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-center space-x-4 mt-4 text-sm">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-100 rounded mr-2"></div>
              <span className="text-gray-600">Views</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-600 rounded mr-2"></div>
              <span className="text-gray-600">Saves</span>
            </div>
          </div>
        </div>

        {/* Click Sources */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Click Sources</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <ExternalLink className="w-4 h-4 text-blue-600 mr-2" />
                <span className="text-gray-700">Ticket Clicks</span>
              </div>
              <div className="flex items-center">
                <span className="text-gray-900 font-medium mr-2">{analytics.ticketClicks}</span>
                <div className="w-24 h-2 bg-gray-200 rounded">
                  <div
                    className="h-2 bg-blue-600 rounded"
                    style={{
                      width: `${(analytics.ticketClicks / (analytics.ticketClicks + analytics.shareClicks)) * 100}%`
                    }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Share2 className="w-4 h-4 text-green-600 mr-2" />
                <span className="text-gray-700">Share Clicks</span>
              </div>
              <div className="flex items-center">
                <span className="text-gray-900 font-medium mr-2">{analytics.shareClicks}</span>
                <div className="w-24 h-2 bg-gray-200 rounded">
                  <div
                    className="h-2 bg-green-600 rounded"
                    style={{
                      width: `${(analytics.shareClicks / (analytics.ticketClicks + analytics.shareClicks)) * 100}%`
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Breakdown */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Analytics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Performance Metrics</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Engagement Score</span>
                <span className="font-medium">{analytics.engagementScore.toFixed(1)}/100</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">View-to-Save Rate</span>
                <span className="font-medium">{((analytics.saves / analytics.views) * 100).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Save-to-RSVP Rate</span>
                <span className="font-medium">{((analytics.rsvps / analytics.saves) * 100).toFixed(1)}%</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Timeline</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Created</span>
                <span className="font-medium">{analytics.createdAt.toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Published</span>
                <span className="font-medium">
                  {analytics.publishedAt ? analytics.publishedAt.toLocaleDateString() : 'Not published'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Days Live</span>
                <span className="font-medium">
                  {analytics.publishedAt
                    ? Math.ceil((Date.now() - analytics.publishedAt.getTime()) / (1000 * 60 * 60 * 24))
                    : 0
                  }
                </span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Recommendations</h4>
            <div className="space-y-2 text-sm">
              {analytics.conversionRate < 5 && (
                <div className="text-amber-600">
                  • Consider improving event description or images
                </div>
              )}
              {analytics.saves < 50 && (
                <div className="text-blue-600">
                  • Share on social media to increase visibility
                </div>
              )}
              {analytics.engagementScore > 80 && (
                <div className="text-green-600">
                  • Great engagement! Consider creating similar events
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}