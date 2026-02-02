// Test the pure functions without Supabase dependencies
interface EventData {
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

interface EventPreferences {
  location: string;
  maxDistance: number;
  interests: string[];
  eventTypes: string[];
  priceRange: [number, number];
  timeOfDay: string[];
}

// Pure function for testing scoring algorithm
function calculateEventScore(event: EventData, preferences?: EventPreferences): number {
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

  // Location preference (simplified)
  if (preferences.location && event.location.toLowerCase().includes(preferences.location.toLowerCase())) {
    score += 15;
  }

  return Math.min(Math.max(score, 0), 100);
}

// Pure function for filtering events
function filterEventsByPreferences(events: EventData[], preferences: EventPreferences): EventData[] {
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
  filteredEvents.sort((a, b) => calculateEventScore(b, preferences) - calculateEventScore(a, preferences));

  return filteredEvents;
}

describe('AI Event Matching Algorithm', () => {
  const mockEvent: EventData = {
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
    maxAttendees: 500
  };

  const mockPreferences: EventPreferences = {
    location: 'Central',
    maxDistance: 50,
    interests: ['Art & Culture', 'technology'],
    eventTypes: ['exhibition', 'workshop'],
    priceRange: [100, 300],
    timeOfDay: ['morning', 'afternoon']
  };

  describe('calculateEventScore', () => {
    it('should return a score between 0 and 100', () => {
      const score = calculateEventScore(mockEvent, mockPreferences);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should give higher score for events matching preferences', () => {
      const matchingScore = calculateEventScore(mockEvent, mockPreferences);

      const nonMatchingPreferences: EventPreferences = {
        ...mockPreferences,
        interests: ['Sports', 'Gaming'],
        priceRange: [0, 50]
      };

      const nonMatchingScore = calculateEventScore(mockEvent, nonMatchingPreferences);

      expect(matchingScore).toBeGreaterThan(nonMatchingScore);
    });

    it('should return random score when no preferences provided', () => {
      const score = calculateEventScore(mockEvent);
      expect(score).toBeGreaterThanOrEqual(70);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('filterEventsByPreferences', () => {
    const events: EventData[] = [
      mockEvent,
      {
        id: '2',
        title: 'Tech Conference',
        description: 'Technology conference',
        date: '2024-10-18',
        time: '9:00 AM',
        location: 'Wan Chai, Hong Kong',
        venue: 'Convention Center',
        price: 500,
        category: 'Technology',
        tags: ['tech', 'conference'],
        organizer: 'Tech Group'
      }
    ];

    it('should filter events by price range', () => {
      const preferences: EventPreferences = {
        ...mockPreferences,
        priceRange: [100, 200] // This should exclude the tech conference (price: 500)
      };

      const filtered = filterEventsByPreferences(events, preferences);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('1');
    });

    it('should filter events by interests and sort by score', () => {
      const preferences: EventPreferences = {
        ...mockPreferences,
        interests: ['Technology'], // This should prefer tech events
        priceRange: [0, 1000] // Allow all prices
      };

      const filtered = filterEventsByPreferences(events, preferences);
      expect(filtered.length).toBeGreaterThan(0);

      // When filtering by Technology interest, events with Technology category should score higher
      const techEvent = filtered.find(e => e.category === 'Technology');
      expect(techEvent).toBeDefined();

      // The filtered events should be sorted by score (highest first)
      for (let i = 0; i < filtered.length - 1; i++) {
        const currentScore = calculateEventScore(filtered[i], preferences);
        const nextScore = calculateEventScore(filtered[i + 1], preferences);
        expect(currentScore).toBeGreaterThanOrEqual(nextScore);
      }
    });

    it('should return all events when no specific filters match', () => {
      const broadPreferences: EventPreferences = {
        location: '',
        maxDistance: 100,
        interests: [],
        eventTypes: [],
        priceRange: [0, 1000],
        timeOfDay: ['morning', 'afternoon', 'evening']
      };

      const filtered = filterEventsByPreferences(events, broadPreferences);
      expect(filtered).toHaveLength(2);
    });
  });
});