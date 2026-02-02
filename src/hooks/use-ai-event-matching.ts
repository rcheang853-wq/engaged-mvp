'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { AIMatchingService, type EventData, type EventPreferences, type EventAnalytics } from '@/services/ai-matching-service';

// Use types from service
type Event = EventData;

interface UseAIEventMatchingProps {
  userId?: string;
  enabled?: boolean;
  preferences?: EventPreferences;
}

type SwipeAction = 'interested' | 'not_interested';

export function useAIEventMatching({
  userId,
  enabled = true,
  preferences
}: UseAIEventMatchingProps = {}) {
  const [recommendedEvents, setRecommendedEvents] = useState<Event[]>([]);
  const [savedEvents, setSavedEvents] = useState<Event[]>([]);
  const [analytics, setAnalytics] = useState<EventAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fallback mock data for demonstration
  const getFallbackEvents = (): Event[] => [
    {
      id: '1',
      title: 'Hong Kong Art Fair 2024',
      description: 'Contemporary art exhibition featuring local and international artists',
      date: '2024-10-15',
      time: '10:00 AM',
      location: 'Central, Hong Kong',
      venue: 'Hong Kong Convention and Exhibition Centre',
      price: 150,
      category: 'Art & Culture',
      tags: ['art', 'exhibition', 'contemporary', 'culture'],
      organizer: 'Hong Kong Art Foundation',
      attendeesCount: 250,
      maxAttendees: 500,
      imageUrl: '/api/placeholder/400/300'
    },
    {
      id: '2',
      title: 'Tech Startup Networking Night',
      description: 'Connect with fellow entrepreneurs and tech enthusiasts',
      date: '2024-10-18',
      time: '7:00 PM',
      location: 'Wan Chai, Hong Kong',
      venue: 'WeWork Tower 535',
      price: 0,
      category: 'Technology',
      tags: ['networking', 'startup', 'tech', 'business'],
      organizer: 'Hong Kong Tech Community',
      attendeesCount: 85,
      maxAttendees: 100
    },
    {
      id: '3',
      title: 'Dim Sum Workshop',
      description: 'Learn to make traditional dim sum from master chefs',
      date: '2024-10-20',
      time: '2:00 PM',
      location: 'Tsim Sha Tsui, Hong Kong',
      venue: 'Cooking Academy HK',
      price: 280,
      category: 'Food & Drink',
      tags: ['cooking', 'dim sum', 'workshop', 'traditional'],
      organizer: 'Culinary Arts HK',
      attendeesCount: 12,
      maxAttendees: 20
    },
    {
      id: '4',
      title: 'Victoria Peak Night Hike',
      description: 'Guided night hike to see Hong Kong\'s stunning skyline',
      date: '2024-10-22',
      time: '6:30 PM',
      location: 'Victoria Peak, Hong Kong',
      venue: 'Peak Tram Station',
      price: 120,
      category: 'Outdoor & Sports',
      tags: ['hiking', 'night', 'skyline', 'outdoor'],
      organizer: 'HK Adventure Club',
      attendeesCount: 35,
      maxAttendees: 50
    },
    {
      id: '5',
      title: 'Jazz Night at Fringe Club',
      description: 'Intimate jazz performance featuring local musicians',
      date: '2024-10-25',
      time: '8:00 PM',
      location: 'Central, Hong Kong',
      venue: 'Hong Kong Fringe Club',
      price: 200,
      category: 'Music',
      tags: ['jazz', 'music', 'live', 'intimate'],
      organizer: 'Fringe Club',
      attendeesCount: 45,
      maxAttendees: 80
    }
  ];

  // Load real events from database or fallback to mock data
  const getEventsData = async (): Promise<Event[]> => {
    if (userId) {
      const realEvents = await AIMatchingService.loadEvents();
      if (realEvents.length > 0) {
        return realEvents;
      }
    }
    return getFallbackEvents();
  };

  // Calculate event score based on user preferences
  const calculateEventScore = useCallback((event: Event): number => {
    return AIMatchingService.calculateEventScore(event, preferences);
  }, [preferences]);

  // Get event score for a specific event
  const getEventScore = useCallback((eventId: string): number => {
    const event = [...recommendedEvents, ...savedEvents].find(e => e.id === eventId);
    return event ? calculateEventScore(event) : 75;
  }, [recommendedEvents, savedEvents, calculateEventScore]);

  // Load recommended events
  const loadRecommendedEvents = useCallback(async () => {
    if (!enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      // Load events from database or use fallback
      let events = await getEventsData();

      if (preferences) {
        events = AIMatchingService.filterEventsByPreferences(events, preferences);
      }

      setRecommendedEvents(events);
    } catch (err) {
      setError('Failed to load recommended events');
      console.error('Error loading recommended events:', err);
    } finally {
      setIsLoading(false);
    }
  }, [enabled, preferences, calculateEventScore]);

  // Load saved events
  const loadSavedEvents = useCallback(async () => {
    if (!enabled || !userId) return;

    try {
      // Try to load from database first
      const savedEventsList = await AIMatchingService.loadSavedEvents(userId);

      if (savedEventsList.length > 0) {
        setSavedEvents(savedEventsList);
        return;
      }

      // Fallback to localStorage for offline functionality
      const saved = localStorage.getItem(`savedEvents_${userId}`);
      if (saved) {
        const savedEventIds = JSON.parse(saved);
        const allEvents = await getEventsData();
        const fallbackSavedEvents = allEvents.filter(event => savedEventIds.includes(event.id));
        setSavedEvents(fallbackSavedEvents);
      }
    } catch (err) {
      console.error('Error loading saved events:', err);
    }
  }, [enabled, userId]);

  // Load analytics
  const loadAnalytics = useCallback(async () => {
    if (!enabled || !userId) return;

    try {
      // In a real implementation, this would calculate analytics from your database
      // For now, we'll simulate analytics based on saved events and mock data
      const saved = localStorage.getItem(`savedEvents_${userId}`);
      const swipeHistory = localStorage.getItem(`swipeHistory_${userId}`);

      const savedEventIds = saved ? JSON.parse(saved) : [];
      const swipes = swipeHistory ? JSON.parse(swipeHistory) : [];

      const interestedCount = swipes.filter((s: any) => s.action === 'interested').length;
      const passedCount = swipes.filter((s: any) => s.action === 'not_interested').length;
      const totalSwipes = swipes.length;

      // Calculate category preferences
      const categoryCount: Record<string, number> = {};
      savedEventIds.forEach((id: string) => {
        const event = mockEvents.find(e => e.id === id);
        if (event) {
          categoryCount[event.category] = (categoryCount[event.category] || 0) + 1;
        }
      });

      const topCategories = Object.entries(categoryCount)
        .map(([name, count]) => ({
          name,
          count,
          percentage: totalSwipes > 0 ? (count / totalSwipes) * 100 : 0
        }))
        .sort((a, b) => b.count - a.count);

      // Calculate average event score
      const avgEventScore = savedEventIds.length > 0
        ? savedEventIds.reduce((sum: number, id: string) => {
            const event = mockEvents.find(e => e.id === id);
            return sum + (event ? calculateEventScore(event) : 75);
          }, 0) / savedEventIds.length
        : 75;

      // Mock time and location preferences
      const timePreferences = [
        { time: 'morning', count: Math.floor(Math.random() * 10) + 1 },
        { time: 'afternoon', count: Math.floor(Math.random() * 15) + 1 },
        { time: 'evening', count: Math.floor(Math.random() * 20) + 1 }
      ];

      const locationPreferences = [
        { location: 'Central', count: Math.floor(Math.random() * 10) + 1 },
        { location: 'Wan Chai', count: Math.floor(Math.random() * 8) + 1 },
        { location: 'Tsim Sha Tsui', count: Math.floor(Math.random() * 12) + 1 },
        { location: 'Causeway Bay', count: Math.floor(Math.random() * 6) + 1 }
      ];

      const analyticsData: EventAnalytics = {
        totalSwipes,
        interestedCount,
        passedCount,
        savedEvents: savedEventIds.length,
        topCategories,
        avgEventScore,
        priceRangePreference: { min: 0, max: 300 },
        timePreferences,
        locationPreferences
      };

      setAnalytics(analyticsData);
    } catch (err) {
      console.error('Error loading analytics:', err);
    }
  }, [enabled, userId, calculateEventScore]);

  // Handle swipe action
  const swipeOnEvent = useCallback(async (eventId: string, action: SwipeAction) => {
    if (!userId) return;

    try {
      // Track usage in database
      await AIMatchingService.trackSwipe(userId);

      // Save swipe history to localStorage for analytics
      const swipeHistory = localStorage.getItem(`swipeHistory_${userId}`);
      const swipes = swipeHistory ? JSON.parse(swipeHistory) : [];
      swipes.push({ eventId, action, timestamp: new Date().toISOString() });
      localStorage.setItem(`swipeHistory_${userId}`, JSON.stringify(swipes));

      // If interested, save to database and localStorage
      if (action === 'interested') {
        // Save to database
        const success = await AIMatchingService.saveEvent(userId, eventId);

        if (success) {
          // Also save to localStorage as backup
          const saved = localStorage.getItem(`savedEvents_${userId}`);
          const savedEventIds = saved ? JSON.parse(saved) : [];
          if (!savedEventIds.includes(eventId)) {
            savedEventIds.push(eventId);
            localStorage.setItem(`savedEvents_${userId}`, JSON.stringify(savedEventIds));

            // Update saved events state
            const allEvents = await getEventsData();
            const event = allEvents.find(e => e.id === eventId);
            if (event) {
              setSavedEvents(prev => [...prev, event]);
            }
          }
        } else {
          // Database save failed, but still save to localStorage as fallback
          console.warn('Failed to save event to database, using localStorage fallback');
          const saved = localStorage.getItem(`savedEvents_${userId}`);
          const savedEventIds = saved ? JSON.parse(saved) : [];
          if (!savedEventIds.includes(eventId)) {
            savedEventIds.push(eventId);
            localStorage.setItem(`savedEvents_${userId}`, JSON.stringify(savedEventIds));

            // Update saved events state
            const allEvents = await getEventsData();
            const event = allEvents.find(e => e.id === eventId);
            if (event) {
              setSavedEvents(prev => [...prev, event]);
            }
          }
          setError('Failed to save event to database. Event saved locally.');
        }
      }

      // Reload analytics to reflect new data
      loadAnalytics();
    } catch (err) {
      console.error('Error recording swipe:', err);
    }
  }, [userId, loadAnalytics]);

  // Update preferences
  const updatePreferences = useCallback(async (newPreferences: Partial<EventPreferences>) => {
    if (!preferences || !userId) return;

    try {
      // Update local preferences object
      const updatedPreferences = { ...preferences, ...newPreferences };

      // Save to database
      await AIMatchingService.saveUserPreferences(userId, updatedPreferences);

      // Trigger reload of recommended events with new preferences
      loadRecommendedEvents();
    } catch (error) {
      console.error('Error updating preferences:', error);
    }
  }, [preferences, userId, loadRecommendedEvents]);

  // Load data on mount and when dependencies change
  useEffect(() => {
    if (enabled) {
      loadRecommendedEvents();
      loadSavedEvents();
      loadAnalytics();
    }
  }, [enabled, userId, loadRecommendedEvents, loadSavedEvents, loadAnalytics]);

  return {
    recommendedEvents,
    savedEvents,
    analytics,
    isLoading,
    error,
    swipeOnEvent,
    getEventScore,
    updatePreferences,
    refresh: () => {
      loadRecommendedEvents();
      loadSavedEvents();
      loadAnalytics();
    }
  };
}