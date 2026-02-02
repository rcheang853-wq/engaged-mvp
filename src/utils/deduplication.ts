import Fuse from 'fuse.js';
import levenshtein from 'fast-levenshtein';
import { createHash } from 'node:crypto';
import * as chrono from 'chrono-node';
import type {
  RawEventData,
  EventDeduplicationMatch,
  DeduplicationConfig,
} from '@/types/scraping';
import { SCRAPING_CONFIG } from '@/config/scraping';

/**
 * Generate a hash for event deduplication
 * Uses title, location, and normalized start time
 */
export function generateEventHash(event: Partial<RawEventData>): string {
  const normalizedTitle = event.title?.toLowerCase().trim() || '';
  const normalizedLocation = event.location?.toLowerCase().trim() || '';
  const normalizedTime = event.startTime
    ? new Date(event.startTime).toISOString().split('T')[0]
    : '';

  const hashString = `${normalizedTitle}|${normalizedLocation}|${normalizedTime}`;
  return createHash('sha256').update(hashString).digest('hex');
}

/**
 * Calculate similarity between two strings using multiple algorithms
 */
export function calculateStringSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;

  const normalized1 = str1.toLowerCase().trim();
  const normalized2 = str2.toLowerCase().trim();

  if (normalized1 === normalized2) return 1;

  // Use Levenshtein distance for similarity
  const maxLength = Math.max(normalized1.length, normalized2.length);
  const distance = levenshtein.get(normalized1, normalized2);
  const similarity = 1 - distance / maxLength;

  return Math.max(0, similarity);
}

/**
 * Calculate time similarity between two date strings
 * Returns 1 if within tolerance, decreasing similarity for greater differences
 */
export function calculateTimeSimilarity(
  time1: string,
  time2: string,
  toleranceMinutes: number = SCRAPING_CONFIG.deduplication.timeToleranceMinutes
): number {
  try {
    const date1 = new Date(time1);
    const date2 = new Date(time2);

    if (isNaN(date1.getTime()) || isNaN(date2.getTime())) return 0;

    const diffMinutes =
      Math.abs(date1.getTime() - date2.getTime()) / (1000 * 60);

    if (diffMinutes <= toleranceMinutes) {
      return 1 - diffMinutes / toleranceMinutes;
    }

    return 0;
  } catch {
    return 0;
  }
}

/**
 * Find similar events using fuzzy matching
 */
export function findSimilarEvents(
  newEvent: RawEventData,
  existingEvents: RawEventData[],
  config: DeduplicationConfig = SCRAPING_CONFIG.deduplication
): EventDeduplicationMatch[] {
  const matches: EventDeduplicationMatch[] = [];

  // Create Fuse.js instance for fuzzy search on titles
  const fuse = new Fuse(existingEvents, {
    keys: ['title'],
    threshold: 1 - config.titleSimilarityThreshold,
    includeScore: true,
  });

  // Get fuzzy matches for title
  const titleMatches = fuse.search(newEvent.title);

  // Analyze each potential match
  for (const existingEvent of existingEvents) {
    const titleSimilarity = calculateStringSimilarity(
      newEvent.title,
      existingEvent.title
    );
    const locationSimilarity =
      newEvent.location && existingEvent.location
        ? calculateStringSimilarity(newEvent.location, existingEvent.location)
        : 0;
    const timeSimilarity =
      newEvent.startTime && existingEvent.startTime
        ? calculateTimeSimilarity(
            newEvent.startTime,
            existingEvent.startTime,
            config.timeToleranceMinutes
          )
        : 0;

    // Calculate combined similarity score
    const weights = {
      title: 0.5,
      location: 0.3,
      time: 0.2,
    };

    const combinedSimilarity =
      titleSimilarity * weights.title +
      locationSimilarity * weights.location +
      timeSimilarity * weights.time;

    // Determine match type and confidence
    let matchType: EventDeduplicationMatch['matchType'] = 'combined';
    let confidence = combinedSimilarity;

    if (titleSimilarity >= config.titleSimilarityThreshold) {
      matchType = 'title';
      confidence = Math.max(confidence, titleSimilarity);
    } else if (locationSimilarity >= config.locationSimilarityThreshold) {
      matchType = 'location';
      confidence = Math.max(confidence, locationSimilarity);
    } else if (timeSimilarity >= 0.9) {
      matchType = 'time';
      confidence = Math.max(confidence, timeSimilarity);
    }

    // Add to matches if above threshold
    if (combinedSimilarity >= config.combinedSimilarityThreshold) {
      matches.push({
        eventId: existingEvent.sourceId, // Use sourceId as temporary eventId
        similarity: combinedSimilarity,
        matchType,
        confidence,
      });
    }
  }

  // Sort by similarity (highest first)
  return matches.sort((a, b) => b.similarity - a.similarity);
}

/**
 * Check if an event is a duplicate using exact hash matching
 */
export function isExactDuplicate(
  newEventHash: string,
  existingHashes: string[]
): boolean {
  return existingHashes.includes(newEventHash);
}

/**
 * Normalize event data for better matching
 */
export function normalizeEventData(event: RawEventData): RawEventData {
  // Safely parse dates using both native Date and chrono for natural language
  let normalizedStartTime = event.startTime;
  let normalizedEndTime = event.endTime;

  const normalizeTimestamp = (value: string) => {
    const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(value);
    if (hasTimezone || !value.includes(':')) {
      return value;
    }

    const normalized = value.includes('T') ? value : value.replace(' ', 'T');
    return `${normalized}Z`;
  };

  if (event.startTime) {
    // First try native Date parsing
    let startDate = new Date(normalizeTimestamp(event.startTime));

    // If that fails, try natural language parsing with chrono
    if (isNaN(startDate.getTime())) {
      const parsed = chrono.parseDate(event.startTime);
      startDate = parsed || startDate;
    }

    normalizedStartTime = isNaN(startDate.getTime())
      ? undefined
      : startDate.toISOString();
  }

  if (event.endTime) {
    // First try native Date parsing
    let endDate = new Date(normalizeTimestamp(event.endTime));

    // If that fails, try natural language parsing with chrono
    if (isNaN(endDate.getTime())) {
      const parsed = chrono.parseDate(event.endTime);
      endDate = parsed || endDate;
    }

    normalizedEndTime = isNaN(endDate.getTime())
      ? undefined
      : endDate.toISOString();
  }

  return {
    ...event,
    title: event.title.trim().replace(/\s+/g, ' '),
    description: event.description?.trim().replace(/\s+/g, ' '),
    location: event.location?.trim().replace(/\s+/g, ' '),
    startTime: normalizedStartTime,
    endTime: normalizedEndTime,
  };
}

/**
 * Merge event data when updating existing events
 */
export function mergeEventData(
  existing: RawEventData,
  incoming: RawEventData
): RawEventData {
  return {
    ...existing,
    // Update fields that might have changed
    title: incoming.title || existing.title,
    description: incoming.description || existing.description,
    startTime: incoming.startTime || existing.startTime,
    endTime: incoming.endTime || existing.endTime,
    location: incoming.location || existing.location,
    price: incoming.price || existing.price,
    imageUrl: incoming.imageUrl || existing.imageUrl,
    sourceUrl: incoming.sourceUrl || existing.sourceUrl,
    // Keep original metadata
    extractedAt: incoming.extractedAt,
    sourceId: existing.sourceId,
    scrapeHash: incoming.scrapeHash,
  };
}

/**
 * Calculate quality score for an event based on completeness and data quality
 */
export function calculateEventQualityScore(event: RawEventData): number {
  let score = 0;
  const maxScore = 100;

  // Title quality (30 points)
  if (event.title) {
    score += 20;
    if (event.title.length > 10) score += 5;
    if (event.title.length > 30) score += 5;
  }

  // Description quality (25 points)
  if (event.description) {
    score += 15;
    if (event.description.length > 50) score += 5;
    if (event.description.length > 200) score += 5;
  }

  // Time information (20 points)
  if (event.startTime) {
    score += 15;
    if (event.endTime) score += 5;
  }

  // Location information (15 points)
  if (event.location) {
    score += 10;
    if (event.location.length > 10) score += 5;
  }

  // Additional information (10 points)
  if (event.imageUrl) score += 3;
  if (event.price) score += 3;
  if (event.sourceUrl) score += 4;

  return Math.min(score, maxScore);
}
