'use client';

import { supabase } from '@/lib/supabase/client';
import type { Tables } from '@/types/database';

export interface EventData {
  id: string;
  title: string;
  description?: string;
  date: string;
  time?: string;
  location: string;
  venue?: string;
  price: number;
  category: string;
  tags: string[];
  imageUrl?: string;
  organizer: string;
  attendeesCount?: number;
  maxAttendees?: number;
}

export interface EventPreferences {
  location: string;
  maxDistance: number;
  interests: string[];
  eventTypes: string[];
  priceRange: [number, number];
  timeOfDay: string[];
}

export interface EventAnalytics {
  totalSwipes: number;
  interestedCount: number;
  passedCount: number;
  savedEvents: number;
  topCategories: Array<{ name: string; count: number; percentage: number }>;
  avgEventScore: number;
  priceRangePreference: { min: number; max: number };
  timePreferences: Array<{ time: string; count: number }>;
  locationPreferences: Array<{ location: string; count: number }>;
}

export class AIMatchingService {
  /**
   * Load events from database with proper relationships
   */
  static async loadEvents(limit: number = 50): Promise<EventData[]> {
    try {
      const { data: events, error } = await supabase
        .from('events')
        .select(`
          id,
          title,
          description,
          start_time,
          end_time,
          custom_location,
          poster_url,
          tags,
          is_free,
          price_range,
          organizers(organization_name),
          event_categories(name),
          venues(name, address, city)
        `)
        .eq('status', 'published')
        .neq('event_type', 'invalid')
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .limit(limit);

      if (error) throw error;

      return events?.map(event => ({
        id: event.id,
        title: event.title,
        description: event.description || '',
        date: event.start_time.split('T')[0],
        time: new Date(event.start_time).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }),
        location: event.venues?.city || event.custom_location || 'Hong Kong',
        venue: event.venues?.name,
        price: event.is_free ? 0 : (event.price_range?.[0] || 0),
        category: event.event_categories?.name || 'Other',
        tags: event.tags || [],
        imageUrl: event.poster_url,
        organizer: event.organizers?.organization_name || 'Event Organizer',
        attendeesCount: Math.floor(Math.random() * 100) + 10,
        maxAttendees: Math.floor(Math.random() * 200) + 50
      })) || [];
    } catch (error) {
      console.error('Error loading events from database:', error);
      return [];
    }
  }

  /**
   * Load user's saved events
   */
  static async loadSavedEvents(userId: string): Promise<EventData[]> {
    try {
      const { data: userEvents, error } = await supabase
        .from('user_events')
        .select(`
          event_id,
          events(
            id, title, description, start_time, end_time, custom_location,
            poster_url, tags, is_free, price_range,
            organizers(organization_name),
            event_categories(name),
            venues(name, address, city)
          )
        `)
        .eq('user_id', userId)
        .eq('save_type', 'saved');

      if (error || !userEvents?.length) {
        return [];
      }

      return userEvents
        .map(ue => ue.events)
        .filter(event => event)
        .map(event => ({
          id: event.id,
          title: event.title,
          description: event.description || '',
          date: event.start_time.split('T')[0],
          time: new Date(event.start_time).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          }),
          location: event.venues?.city || event.custom_location || 'Hong Kong',
          venue: event.venues?.name,
          price: event.is_free ? 0 : (event.price_range?.[0] || 0),
          category: event.event_categories?.name || 'Other',
          tags: event.tags || [],
          imageUrl: event.poster_url,
          organizer: event.organizers?.organization_name || 'Event Organizer',
          attendeesCount: Math.floor(Math.random() * 100) + 10,
          maxAttendees: Math.floor(Math.random() * 200) + 50
        }));
    } catch (error) {
      console.error('Error loading saved events:', error);
      return [];
    }
  }

  /**
   * Save event for user
   */
  static async saveEvent(userId: string, eventId: string): Promise<boolean> {
    try {
      // Validate inputs
      if (!userId || !eventId) {
        console.error('Invalid userId or eventId:', { userId, eventId });
        return false;
      }

      // First verify the event exists to provide better error messages
      const { data: eventExists, error: checkError } = await supabase
        .from('events')
        .select('id')
        .eq('id', eventId)
        .neq('event_type', 'invalid')
        .single();

      if (checkError || !eventExists) {
        console.error('Event does not exist:', {
          eventId,
          error: checkError,
          message: checkError?.message
        });
        return false;
      }

      // Attempt to save the user event
      const { error } = await supabase
        .from('user_events')
        .upsert({
          user_id: userId,
          event_id: eventId,
          save_type: 'saved',
          calendar_reminder: false,
          reminder_minutes: 15
        }, {
          onConflict: 'user_id,event_id'
        });

      if (error) {
        console.error('Error saving event to database:', {
          error,
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          userId,
          eventId
        });
        return false;
      }

      console.log('Successfully saved event:', { userId, eventId });
      return true;
    } catch (error) {
      console.error('Exception while saving event:', error);
      return false;
    }
  }

  /**
   * Track user swipe action
   */
  static async trackSwipe(userId: string): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];

      // First check if we have the RPC function
      const { error } = await supabase.rpc('increment_user_usage', {
        p_user_id: userId,
        p_date: today,
        p_swipes_count: 1
      });

      if (error) {
        // Fallback: manual upsert if RPC doesn't exist
        const { data: existingUsage } = await supabase
          .from('user_usage')
          .select('*')
          .eq('user_id', userId)
          .eq('date', today)
          .single();

        if (existingUsage) {
          await supabase
            .from('user_usage')
            .update({
              swipes_count: existingUsage.swipes_count + 1
            })
            .eq('user_id', userId)
            .eq('date', today);
        } else {
          await supabase
            .from('user_usage')
            .insert({
              user_id: userId,
              date: today,
              swipes_count: 1
            });
        }
      }
    } catch (error) {
      console.error('Error tracking swipe:', error);
    }
  }

  /**
   * Calculate AI match score for event based on user preferences
   */
  static calculateEventScore(event: EventData, preferences?: EventPreferences): number {
    if (!preferences) return Math.floor(Math.random() * 30) + 70;

    let score = 50; // Base score

    // Price preference matching
    const [minPrice, maxPrice] = preferences.priceRange;
    if (event.price >= minPrice && event.price <= maxPrice) {
      score += 20;
    } else if (Math.abs(event.price - minPrice) <= 50 || Math.abs(event.price - maxPrice) <= 50) {
      score += 10; // Close to preferred range
    }

    // Category/interest matching
    const eventCategories = [event.category, ...event.tags].map(c => c.toLowerCase());
    const userInterests = [...preferences.interests, ...preferences.eventTypes].map(i => i.toLowerCase());
    const matchingInterests = eventCategories.filter(cat =>
      userInterests.some(interest => cat.includes(interest) || interest.includes(cat))
    );
    score += Math.min(matchingInterests.length * 10, 30);

    // Location preference (simplified - would need geolocation in real app)
    if (preferences.location && event.location.toLowerCase().includes(preferences.location.toLowerCase())) {
      score += 15;
    }

    return Math.min(Math.max(score, 0), 100);
  }

  /**
   * Filter events based on user preferences
   */
  static filterEventsByPreferences(events: EventData[], preferences: EventPreferences): EventData[] {
    let filteredEvents = [...events];

    // Filter by price range
    filteredEvents = filteredEvents.filter(event =>
      event.price >= preferences.priceRange[0] &&
      event.price <= preferences.priceRange[1]
    );

    // Filter by interests/categories
    if (preferences.interests.length > 0 || preferences.eventTypes.length > 0) {
      const userInterests = [...preferences.interests, ...preferences.eventTypes].map(i => i.toLowerCase());
      filteredEvents = filteredEvents.filter(event => {
        const eventCategories = [event.category, ...event.tags].map(c => c.toLowerCase());
        return eventCategories.some(cat =>
          userInterests.some(interest => cat.includes(interest) || interest.includes(cat))
        );
      });
    }

    // Sort by calculated score
    filteredEvents.sort((a, b) =>
      this.calculateEventScore(b, preferences) - this.calculateEventScore(a, preferences)
    );

    return filteredEvents;
  }

  /**
   * Load user preferences from profile
   */
  static async loadUserPreferences(userId: string): Promise<EventPreferences | null> {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('preferred_categories, preferred_times, preferred_price_range, city, preferred_radius, ai_preferences')
        .eq('id', userId)
        .single();

      if (error || !profile) {
        return null;
      }

      return {
        location: profile.city || '',
        maxDistance: profile.preferred_radius || 50,
        interests: profile.preferred_categories || [],
        eventTypes: [], // Can be extracted from ai_preferences if structured
        priceRange: profile.preferred_price_range || [0, 500],
        timeOfDay: profile.preferred_times || ['morning', 'afternoon', 'evening']
      };
    } catch (error) {
      console.error('Error loading user preferences:', error);
      return null;
    }
  }

  /**
   * Save user preferences to profile
   */
  static async saveUserPreferences(userId: string, preferences: EventPreferences): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          city: preferences.location,
          preferred_radius: preferences.maxDistance,
          preferred_categories: preferences.interests,
          preferred_times: preferences.timeOfDay,
          preferred_price_range: preferences.priceRange,
          ai_preferences: {
            eventTypes: preferences.eventTypes,
            lastUpdated: new Date().toISOString()
          }
        })
        .eq('id', userId);

      if (error) {
        console.error('Error saving user preferences:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error saving user preferences:', error);
      return false;
    }
  }
}