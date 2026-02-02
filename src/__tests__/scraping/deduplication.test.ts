import {
  generateEventHash,
  calculateStringSimilarity,
  calculateTimeSimilarity,
  findSimilarEvents,
  isExactDuplicate,
  normalizeEventData,
  mergeEventData,
  calculateEventQualityScore,
} from '@/utils/deduplication';
import type { RawEventData } from '@/types/scraping';

describe('Event Deduplication', () => {
  const mockEvent: RawEventData = {
    title: 'Jazz Concert at Cultural Centre',
    description: 'An amazing jazz performance featuring local artists',
    startTime: '2025-09-25T19:00:00Z',
    endTime: '2025-09-25T21:00:00Z',
    location: 'Macau Cultural Centre',
    price: 'HKD 150',
    imageUrl: 'https://example.com/jazz-concert.jpg',
    sourceUrl: 'https://example.com/events/jazz-concert',
    extractedAt: new Date('2025-09-22T10:00:00Z'),
    sourceId: 'test-source',
    scrapeHash: '',
  };

  describe('generateEventHash', () => {
    it('should generate consistent hash for identical events', () => {
      const hash1 = generateEventHash(mockEvent);
      const hash2 = generateEventHash(mockEvent);
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA256 hash length
    });

    it('should generate different hashes for different events', () => {
      const event2 = { ...mockEvent, title: 'Different Concert' };
      const hash1 = generateEventHash(mockEvent);
      const hash2 = generateEventHash(event2);
      expect(hash1).not.toBe(hash2);
    });

    it('should handle events with missing fields', () => {
      const incompleteEvent = { title: 'Test Event' };
      const hash = generateEventHash(incompleteEvent);
      expect(hash).toBeDefined();
      expect(hash).toHaveLength(64);
    });

    it('should normalize data before hashing', () => {
      const event1 = { ...mockEvent, title: '  Jazz Concert  ' };
      const event2 = { ...mockEvent, title: 'jazz concert' };
      const hash1 = generateEventHash(event1);
      const hash2 = generateEventHash(event2);
      expect(hash1).toBe(hash2);
    });
  });

  describe('calculateStringSimilarity', () => {
    it('should return 1 for identical strings', () => {
      const similarity = calculateStringSimilarity(
        'Jazz Concert',
        'Jazz Concert'
      );
      expect(similarity).toBe(1);
    });

    it('should return 0 for completely different strings', () => {
      const similarity = calculateStringSimilarity(
        'Jazz Concert',
        'Football Match'
      );
      expect(similarity).toBeLessThan(0.3);
    });

    it('should return high similarity for minor differences', () => {
      const similarity = calculateStringSimilarity(
        'Jazz Concert',
        'Jazz Concerts'
      );
      expect(similarity).toBeGreaterThan(0.9);
    });

    it('should be case insensitive', () => {
      const similarity = calculateStringSimilarity(
        'Jazz Concert',
        'JAZZ CONCERT'
      );
      expect(similarity).toBe(1);
    });

    it('should handle empty strings', () => {
      expect(calculateStringSimilarity('', '')).toBe(0);
      expect(calculateStringSimilarity('test', '')).toBe(0);
      expect(calculateStringSimilarity('', 'test')).toBe(0);
    });
  });

  describe('calculateTimeSimilarity', () => {
    const baseTime = '2025-09-25T19:00:00Z';

    it('should return 1 for identical times', () => {
      const similarity = calculateTimeSimilarity(baseTime, baseTime);
      expect(similarity).toBe(1);
    });

    it('should return high similarity for times within tolerance', () => {
      const similarTime = '2025-09-25T19:15:00Z'; // 15 minutes later
      const similarity = calculateTimeSimilarity(baseTime, similarTime, 30);
      expect(similarity).toBeGreaterThanOrEqual(0.5);
    });

    it('should return 0 for times outside tolerance', () => {
      const differentTime = '2025-09-25T21:00:00Z'; // 2 hours later
      const similarity = calculateTimeSimilarity(baseTime, differentTime, 30);
      expect(similarity).toBe(0);
    });

    it('should handle invalid dates', () => {
      const similarity = calculateTimeSimilarity('invalid-date', baseTime);
      expect(similarity).toBe(0);
    });
  });

  describe('findSimilarEvents', () => {
    const existingEvents: RawEventData[] = [
      {
        ...mockEvent,
        title: 'Jazz Concert at Cultural Centre',
        sourceId: 'existing-1',
      },
      {
        ...mockEvent,
        title: 'Rock Concert at Venue',
        location: 'Different Venue',
        sourceId: 'existing-2',
      },
      {
        ...mockEvent,
        title: 'Jazz Performance',
        startTime: '2025-09-25T19:30:00Z', // 30 minutes later
        sourceId: 'existing-3',
      },
    ];

    it('should find exact title matches', () => {
      const newEvent = { ...mockEvent, sourceId: 'new-event' };
      const matches = findSimilarEvents(newEvent, existingEvents);

      expect(matches).toHaveLength(1);
      expect(matches[0].eventId).toBe('existing-1');
      expect(matches[0].similarity).toBeGreaterThan(0.8);
      expect(matches[0].matchType).toBe('title');
    });

    it('should find similar events with combined score', () => {
      const newEvent = {
        ...mockEvent,
        title: 'Jazz Performance at Cultural Centre',
        sourceId: 'new-event',
      };
      const matches = findSimilarEvents(newEvent, existingEvents);

      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].similarity).toBeGreaterThan(0.6);
    });

    it('should sort matches by similarity', () => {
      const newEvent = {
        ...mockEvent,
        title: 'Jazz Show',
        sourceId: 'new-event',
      };
      const matches = findSimilarEvents(newEvent, existingEvents);

      // Check that matches are sorted in descending order of similarity
      for (let i = 1; i < matches.length; i++) {
        expect(matches[i - 1].similarity).toBeGreaterThanOrEqual(
          matches[i].similarity
        );
      }
    });

    it('should return empty array when no similar events found', () => {
      const newEvent = {
        ...mockEvent,
        title: 'Completely Different Event',
        location: 'Nowhere',
        startTime: '2026-01-01T00:00:00Z',
        sourceId: 'new-event',
      };
      const matches = findSimilarEvents(newEvent, existingEvents);

      expect(matches).toHaveLength(0);
    });
  });

  describe('isExactDuplicate', () => {
    it('should return true for exact hash match', () => {
      const hash = generateEventHash(mockEvent);
      const existingHashes = ['other-hash', hash, 'another-hash'];

      expect(isExactDuplicate(hash, existingHashes)).toBe(true);
    });

    it('should return false when hash not found', () => {
      const hash = generateEventHash(mockEvent);
      const existingHashes = ['other-hash', 'another-hash'];

      expect(isExactDuplicate(hash, existingHashes)).toBe(false);
    });

    it('should handle empty hash array', () => {
      const hash = generateEventHash(mockEvent);

      expect(isExactDuplicate(hash, [])).toBe(false);
    });
  });

  describe('normalizeEventData', () => {
    it('should trim whitespace and normalize spaces', () => {
      const unnormalizedEvent: RawEventData = {
        ...mockEvent,
        title: '  Jazz   Concert  ',
        description: '  Amazing    performance  ',
        location: ' Cultural   Centre ',
      };

      const normalized = normalizeEventData(unnormalizedEvent);

      expect(normalized.title).toBe('Jazz Concert');
      expect(normalized.description).toBe('Amazing performance');
      expect(normalized.location).toBe('Cultural Centre');
    });

    it('should normalize dates to ISO format', () => {
      const eventWithDates: RawEventData = {
        ...mockEvent,
        startTime: '2025-09-25 19:00:00',
        endTime: '2025-09-25 21:00:00',
      };

      const normalized = normalizeEventData(eventWithDates);

      expect(normalized.startTime).toBe('2025-09-25T19:00:00.000Z');
      expect(normalized.endTime).toBe('2025-09-25T21:00:00.000Z');
    });
  });

  describe('mergeEventData', () => {
    it('should merge events with incoming data taking precedence', () => {
      const existing: RawEventData = {
        ...mockEvent,
        title: 'Old Title',
        description: 'Old Description',
      };

      const incoming: RawEventData = {
        ...mockEvent,
        title: 'New Title',
        description: 'New Description',
        extractedAt: new Date('2025-09-22T11:00:00Z'),
      };

      const merged = mergeEventData(existing, incoming);

      expect(merged.title).toBe('New Title');
      expect(merged.description).toBe('New Description');
      expect(merged.extractedAt).toEqual(incoming.extractedAt);
      expect(merged.sourceId).toBe(existing.sourceId); // Should keep original
    });

    it('should keep existing data when incoming is empty', () => {
      const existing: RawEventData = { ...mockEvent };
      const incoming: RawEventData = {
        ...mockEvent,
        title: '',
        description: undefined,
        extractedAt: new Date(),
      };

      const merged = mergeEventData(existing, incoming);

      expect(merged.title).toBe(existing.title);
      expect(merged.description).toBe(existing.description);
    });
  });

  describe('calculateEventQualityScore', () => {
    it('should return maximum score for complete event', () => {
      const completeEvent: RawEventData = {
        ...mockEvent,
        title: 'Very Detailed Jazz Concert Performance',
        description:
          'This is a very detailed description of an amazing jazz concert featuring world-class musicians from around the globe. The performance will include multiple sets and special guest appearances.',
        price: 'HKD 150',
        imageUrl: 'https://example.com/image.jpg',
        sourceUrl: 'https://example.com/event',
      };

      const score = calculateEventQualityScore(completeEvent);
      expect(score).toBeGreaterThan(80);
    });

    it('should return low score for minimal event', () => {
      const minimalEvent: RawEventData = {
        title: 'Event',
        extractedAt: new Date(),
        sourceId: 'test',
        scrapeHash: '',
      };

      const score = calculateEventQualityScore(minimalEvent);
      expect(score).toBeLessThan(30);
    });

    it('should give higher scores for longer, more descriptive content', () => {
      const shortEvent: RawEventData = {
        ...mockEvent,
        title: 'Event',
        description: 'Short',
      };

      const longEvent: RawEventData = {
        ...mockEvent,
        title: 'Detailed Jazz Concert Performance',
        description:
          'This is a very detailed and comprehensive description of the event',
      };

      const shortScore = calculateEventQualityScore(shortEvent);
      const longScore = calculateEventQualityScore(longEvent);

      expect(longScore).toBeGreaterThan(shortScore);
    });
  });
});
