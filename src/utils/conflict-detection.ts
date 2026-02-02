// Advanced conflict detection algorithms for calendar scheduling
import {
  EnhancedCalendarEvent,
  ConflictDetails,
  ConflictResolutionSuggestion,
  ConflictType,
  ConflictSeverity,
  CalendarOperationResult
} from '@/types/calendar';
import { checkTimezoneAwareOverlap, convertTimezone } from './timezone-handling';

// Configuration for conflict detection
const CONFLICT_CONFIG = {
  // Travel time buffer between events (in minutes)
  DEFAULT_TRAVEL_TIME: 15,
  LOCATION_TRAVEL_TIMES: {
    'same_building': 5,
    'same_city': 30,
    'different_city': 120,
    'virtual': 0
  },

  // Buffer times by priority
  PRIORITY_BUFFERS: {
    'urgent': 30,
    'high': 15,
    'normal': 10,
    'low': 5
  },

  // Severity thresholds (overlap percentage)
  SEVERITY_THRESHOLDS: {
    low: 0.1,    // 10% overlap
    medium: 0.5, // 50% overlap
    high: 0.8,   // 80% overlap
    critical: 1.0 // Complete overlap
  },

  // Maximum number of suggestions per conflict
  MAX_SUGGESTIONS: 5,

  // Look-ahead time for conflict detection (in days)
  CONFLICT_DETECTION_WINDOW: 30
};

/**
 * Detect conflicts for a single event against a list of existing events
 */
export function detectEventConflicts(
  newEvent: EnhancedCalendarEvent,
  existingEvents: EnhancedCalendarEvent[],
  options: {
    includeTravelTime?: boolean;
    includeBufferTime?: boolean;
    customTravelTime?: number;
  } = {}
): ConflictDetails[] {
  const conflicts: ConflictDetails[] = [];
  const {
    includeTravelTime = true,
    includeBufferTime = true,
    customTravelTime
  } = options;

  for (const existingEvent of existingEvents) {
    // Skip if same event
    if (newEvent.id === existingEvent.id) continue;

    // Skip cancelled or draft events
    if (existingEvent.status === 'cancelled' || existingEvent.status === 'draft') continue;

    const conflict = checkEventPairConflict(
      newEvent,
      existingEvent,
      {
        includeTravelTime,
        includeBufferTime,
        customTravelTime
      }
    );

    if (conflict) {
      conflicts.push(conflict);
    }
  }

  // Sort conflicts by severity and overlap time
  conflicts.sort((a, b) => {
    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];

    if (severityDiff !== 0) return severityDiff;
    return b.overlapMinutes - a.overlapMinutes;
  });

  return conflicts;
}

/**
 * Check conflict between two specific events
 */
function checkEventPairConflict(
  event1: EnhancedCalendarEvent,
  event2: EnhancedCalendarEvent,
  options: {
    includeTravelTime?: boolean;
    includeBufferTime?: boolean;
    customTravelTime?: number;
  }
): ConflictDetails | null {
  const { includeTravelTime, includeBufferTime, customTravelTime } = options;

  // Calculate effective times including buffers
  const event1Effective = calculateEffectiveEventTime(event1, {
    includeTravelTime,
    includeBufferTime,
    customTravelTime
  });

  const event2Effective = calculateEffectiveEventTime(event2, {
    includeTravelTime,
    includeBufferTime,
    customTravelTime
  });

  // Check for timezone-aware overlap
  if (!checkTimezoneAwareOverlap(event1Effective, event2Effective)) {
    return null;
  }

  // Calculate overlap details
  const overlapDetails = calculateOverlapDetails(event1Effective, event2Effective);

  if (overlapDetails.overlapMinutes <= 0) {
    return null;
  }

  // Determine conflict type
  const conflictType = determineConflictType(event1, event2, overlapDetails);

  // Determine severity
  const severity = calculateConflictSeverity(overlapDetails, event1, event2);

  // Generate resolution suggestions
  const suggestions = generateResolutionSuggestions(event1, event2, overlapDetails);

  return {
    type: conflictType,
    severity,
    conflictingEventId: event2.id,
    conflictingEventTitle: event2.title,
    overlapMinutes: overlapDetails.overlapMinutes,
    suggestions
  };
}

/**
 * Calculate effective event time including travel and buffer times
 */
function calculateEffectiveEventTime(
  event: EnhancedCalendarEvent,
  options: {
    includeTravelTime?: boolean;
    includeBufferTime?: boolean;
    customTravelTime?: number;
  }
): { startTime: Date; endTime: Date; timezone: string } {
  let effectiveStart = new Date(event.startTime);
  let effectiveEnd = new Date(event.endTime);

  // Add buffer time before event
  if (options.includeBufferTime) {
    const bufferMinutes = CONFLICT_CONFIG.PRIORITY_BUFFERS[event.priority] ||
                         CONFLICT_CONFIG.PRIORITY_BUFFERS.normal;
    effectiveStart = new Date(effectiveStart.getTime() - (bufferMinutes * 60000));
  }

  // Add travel time after event
  if (options.includeTravelTime) {
    const travelMinutes = options.customTravelTime ||
                         calculateTravelTime(event.location || '', '');
    effectiveEnd = new Date(effectiveEnd.getTime() + (travelMinutes * 60000));
  }

  return {
    startTime: effectiveStart,
    endTime: effectiveEnd,
    timezone: event.timezone
  };
}

/**
 * Calculate travel time between locations
 */
function calculateTravelTime(location1: string, location2: string): number {
  // This is a simplified implementation
  // In production, you'd integrate with maps APIs or use more sophisticated logic

  if (!location1 || !location2) {
    return CONFLICT_CONFIG.DEFAULT_TRAVEL_TIME;
  }

  // Check for virtual meetings
  if (isVirtualLocation(location1) || isVirtualLocation(location2)) {
    return CONFLICT_CONFIG.LOCATION_TRAVEL_TIMES.virtual;
  }

  // Simple heuristics based on location strings
  if (location1.toLowerCase() === location2.toLowerCase()) {
    return CONFLICT_CONFIG.LOCATION_TRAVEL_TIMES.same_building;
  }

  // Extract city information (very basic)
  const city1 = extractCity(location1);
  const city2 = extractCity(location2);

  if (city1 && city2) {
    if (city1 === city2) {
      return CONFLICT_CONFIG.LOCATION_TRAVEL_TIMES.same_city;
    } else {
      return CONFLICT_CONFIG.LOCATION_TRAVEL_TIMES.different_city;
    }
  }

  return CONFLICT_CONFIG.DEFAULT_TRAVEL_TIME;
}

/**
 * Check if location is virtual
 */
function isVirtualLocation(location: string): boolean {
  const virtualKeywords = ['zoom', 'teams', 'meet', 'virtual', 'online', 'webinar', 'call'];
  return virtualKeywords.some(keyword =>
    location.toLowerCase().includes(keyword)
  );
}

/**
 * Extract city from location string
 */
function extractCity(location: string): string | null {
  // Very basic city extraction - in production, use proper geocoding
  const parts = location.split(',');
  if (parts.length >= 2) {
    return parts[parts.length - 2].trim();
  }
  return null;
}

/**
 * Calculate detailed overlap information
 */
function calculateOverlapDetails(
  event1: { startTime: Date; endTime: Date; timezone: string },
  event2: { startTime: Date; endTime: Date; timezone: string }
): {
  overlapMinutes: number;
  overlapPercentage: number;
  overlapStart: Date;
  overlapEnd: Date;
} {
  // Convert both events to UTC for accurate calculation
  const event1StartUTC = convertTimezone(event1.startTime, event1.timezone, 'UTC');
  const event1EndUTC = convertTimezone(event1.endTime, event1.timezone, 'UTC');
  const event2StartUTC = convertTimezone(event2.startTime, event2.timezone, 'UTC');
  const event2EndUTC = convertTimezone(event2.endTime, event2.timezone, 'UTC');

  // Calculate overlap
  const overlapStart = new Date(Math.max(event1StartUTC.getTime(), event2StartUTC.getTime()));
  const overlapEnd = new Date(Math.min(event1EndUTC.getTime(), event2EndUTC.getTime()));

  const overlapMillis = Math.max(0, overlapEnd.getTime() - overlapStart.getTime());
  const overlapMinutes = overlapMillis / 60000;

  // Calculate overlap percentage (against the shorter event)
  const event1Duration = (event1EndUTC.getTime() - event1StartUTC.getTime()) / 60000;
  const event2Duration = (event2EndUTC.getTime() - event2StartUTC.getTime()) / 60000;
  const shorterDuration = Math.min(event1Duration, event2Duration);
  const overlapPercentage = shorterDuration > 0 ? overlapMinutes / shorterDuration : 0;

  return {
    overlapMinutes,
    overlapPercentage,
    overlapStart,
    overlapEnd
  };
}

/**
 * Determine the type of conflict
 */
function determineConflictType(
  event1: EnhancedCalendarEvent,
  event2: EnhancedCalendarEvent,
  overlapDetails: { overlapMinutes: number; overlapPercentage: number }
): ConflictType {
  // Check for travel time conflicts
  if (event1.location && event2.location && event1.location !== event2.location) {
    const travelTime = calculateTravelTime(event1.location, event2.location);
    if (overlapDetails.overlapMinutes <= travelTime) {
      return 'travel_time';
    }
  }

  // Check for resource conflicts (same location, limited capacity)
  if (event1.location && event2.location && event1.location === event2.location) {
    return 'resource';
  }

  // Check for availability conflicts (high priority events)
  if (event1.priority === 'urgent' || event2.priority === 'urgent') {
    return 'availability';
  }

  // Default to overlap conflict
  return 'overlap';
}

/**
 * Calculate conflict severity based on overlap and event priorities
 */
function calculateConflictSeverity(
  overlapDetails: { overlapMinutes: number; overlapPercentage: number },
  event1: EnhancedCalendarEvent,
  event2: EnhancedCalendarEvent
): ConflictSeverity {
  const { overlapPercentage } = overlapDetails;

  // Increase severity for high-priority events
  const priorityMultiplier = (event1.priority === 'urgent' || event2.priority === 'urgent') ? 1.5 :
                            (event1.priority === 'high' || event2.priority === 'high') ? 1.2 : 1.0;

  const adjustedOverlap = Math.min(1.0, overlapPercentage * priorityMultiplier);

  if (adjustedOverlap >= CONFLICT_CONFIG.SEVERITY_THRESHOLDS.critical) return 'critical';
  if (adjustedOverlap >= CONFLICT_CONFIG.SEVERITY_THRESHOLDS.high) return 'high';
  if (adjustedOverlap >= CONFLICT_CONFIG.SEVERITY_THRESHOLDS.medium) return 'medium';
  return 'low';
}

/**
 * Generate resolution suggestions for a conflict
 */
function generateResolutionSuggestions(
  event1: EnhancedCalendarEvent,
  event2: EnhancedCalendarEvent,
  overlapDetails: { overlapMinutes: number; overlapStart: Date; overlapEnd: Date }
): ConflictResolutionSuggestion[] {
  const suggestions: ConflictResolutionSuggestion[] = [];

  // Suggestion 1: Reschedule the new event (event1) to after the existing event (event2)
  const afterEvent2 = new Date(event2.endTime.getTime() + (15 * 60000)); // 15 min buffer
  const rescheduleEnd = new Date(afterEvent2.getTime() + (event1.endTime.getTime() - event1.startTime.getTime()));

  suggestions.push({
    type: 'reschedule',
    description: `Move "${event1.title}" to start after "${event2.title}" ends`,
    newStartTime: afterEvent2,
    newEndTime: rescheduleEnd,
    impactScore: calculateImpactScore('reschedule', event1, event2)
  });

  // Suggestion 2: Reschedule to before the existing event
  const beforeEvent2 = new Date(event2.startTime.getTime() - (event1.endTime.getTime() - event1.startTime.getTime()) - (15 * 60000));
  const rescheduleEnd2 = new Date(event2.startTime.getTime() - (15 * 60000));

  if (beforeEvent2 > new Date()) { // Only suggest if it's not in the past
    suggestions.push({
      type: 'reschedule',
      description: `Move "${event1.title}" to before "${event2.title}" starts`,
      newStartTime: beforeEvent2,
      newEndTime: rescheduleEnd2,
      impactScore: calculateImpactScore('reschedule', event1, event2)
    });
  }

  // Suggestion 3: Shorten the new event to end before conflict
  if (overlapDetails.overlapMinutes < (event1.endTime.getTime() - event1.startTime.getTime()) / 60000) {
    const shortenEnd = new Date(overlapDetails.overlapStart.getTime() - (5 * 60000)); // 5 min buffer

    suggestions.push({
      type: 'shorten',
      description: `Shorten "${event1.title}" to end before the conflict`,
      newStartTime: event1.startTime,
      newEndTime: shortenEnd,
      impactScore: calculateImpactScore('shorten', event1, event2)
    });
  }

  // Suggestion 4: Make it virtual if both are in-person
  if (event1.location && !isVirtualLocation(event1.location) &&
      event2.location && !isVirtualLocation(event2.location)) {
    suggestions.push({
      type: 'reschedule', // Using reschedule type but it's really a format change
      description: `Make "${event1.title}" virtual to eliminate travel time conflict`,
      newStartTime: event1.startTime,
      newEndTime: event1.endTime,
      impactScore: calculateImpactScore('virtual', event1, event2)
    });
  }

  // Suggestion 5: Ignore if low priority
  if (event1.priority === 'low' || event2.priority === 'low') {
    suggestions.push({
      type: 'ignore',
      description: 'Accept the conflict as both events are low priority',
      impactScore: calculateImpactScore('ignore', event1, event2)
    });
  }

  // Sort by impact score (lower is better)
  return suggestions
    .sort((a, b) => a.impactScore - b.impactScore)
    .slice(0, CONFLICT_CONFIG.MAX_SUGGESTIONS);
}

/**
 * Calculate impact score for a resolution suggestion
 */
function calculateImpactScore(
  type: 'reschedule' | 'shorten' | 'cancel' | 'ignore' | 'virtual',
  event1: EnhancedCalendarEvent,
  event2: EnhancedCalendarEvent
): number {
  let baseScore = 0;

  // Base scores by type
  const typeScores = {
    'ignore': 10,
    'virtual': 20,
    'shorten': 30,
    'reschedule': 40,
    'cancel': 100
  };

  baseScore = typeScores[type] || 50;

  // Adjust for event priorities
  const priorityScores = { low: 0, normal: 10, high: 20, urgent: 40 };
  baseScore += priorityScores[event1.priority] || 0;
  baseScore += priorityScores[event2.priority] || 0;

  // Adjust for attendee count (if available)
  if (event1.attendees) {
    baseScore += event1.attendees.length * 2;
  }

  // Reduce score for virtual events (easier to change)
  if (event1.virtualMeetingUrl || isVirtualLocation(event1.location || '')) {
    baseScore -= 15;
  }

  return Math.max(0, baseScore);
}

/**
 * Batch conflict detection for multiple events
 */
export function detectBatchConflicts(
  events: EnhancedCalendarEvent[],
  options: {
    includeTravelTime?: boolean;
    includeBufferTime?: boolean;
    parallelProcessing?: boolean;
  } = {}
): { [eventId: string]: ConflictDetails[] } {
  const conflictMap: { [eventId: string]: ConflictDetails[] } = {};

  // Sort events by start time for efficient processing
  const sortedEvents = [...events].sort((a, b) =>
    a.startTime.getTime() - b.startTime.getTime()
  );

  for (let i = 0; i < sortedEvents.length; i++) {
    const currentEvent = sortedEvents[i];
    const conflictsForEvent: ConflictDetails[] = [];

    // Only check against events that could potentially conflict
    // (within the detection window and after current event start)
    for (let j = i + 1; j < sortedEvents.length; j++) {
      const otherEvent = sortedEvents[j];

      // If the other event starts too far in the future, stop checking
      const timeDiff = (otherEvent.startTime.getTime() - currentEvent.startTime.getTime()) / (1000 * 60 * 60 * 24);
      if (timeDiff > CONFLICT_CONFIG.CONFLICT_DETECTION_WINDOW) {
        break;
      }

      const conflict = checkEventPairConflict(currentEvent, otherEvent, options);
      if (conflict) {
        conflictsForEvent.push(conflict);
      }
    }

    if (conflictsForEvent.length > 0) {
      conflictMap[currentEvent.id] = conflictsForEvent;
    }
  }

  return conflictMap;
}

/**
 * Validate event scheduling against business rules
 */
export function validateEventScheduling(
  event: EnhancedCalendarEvent,
  existingEvents: EnhancedCalendarEvent[],
  rules: {
    maxEventsPerDay?: number;
    maxConcurrentEvents?: number;
    workingHours?: { start: string; end: string };
    allowWeekends?: boolean;
    minEventGap?: number; // minutes between events
  } = {}
): CalendarOperationResult<boolean> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check working hours
  if (rules.workingHours && !event.allDay) {
    const eventHour = event.startTime.getHours();
    const eventMinute = event.startTime.getMinutes();
    const eventTime = eventHour * 60 + eventMinute;

    const [startHour, startMinute] = rules.workingHours.start.split(':').map(Number);
    const [endHour, endMinute] = rules.workingHours.end.split(':').map(Number);
    const startTime = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;

    if (eventTime < startTime || eventTime > endTime) {
      warnings.push(`Event is scheduled outside working hours (${rules.workingHours.start}-${rules.workingHours.end})`);
    }
  }

  // Check weekend policy
  if (!rules.allowWeekends) {
    const eventDay = event.startTime.getDay();
    if (eventDay === 0 || eventDay === 6) { // Sunday or Saturday
      warnings.push('Event is scheduled on a weekend');
    }
  }

  // Check max events per day
  if (rules.maxEventsPerDay) {
    const eventDate = event.startTime.toDateString();
    const eventsOnSameDay = existingEvents.filter(e =>
      e.startTime.toDateString() === eventDate && e.status !== 'cancelled'
    );

    if (eventsOnSameDay.length >= rules.maxEventsPerDay) {
      errors.push(`Maximum ${rules.maxEventsPerDay} events per day exceeded`);
    }
  }

  // Check concurrent events
  if (rules.maxConcurrentEvents && rules.maxConcurrentEvents > 0) {
    const concurrentEvents = existingEvents.filter(e =>
      checkTimezoneAwareOverlap(event, e) && e.status !== 'cancelled'
    );

    if (concurrentEvents.length >= rules.maxConcurrentEvents) {
      errors.push(`Maximum ${rules.maxConcurrentEvents} concurrent events exceeded`);
    }
  }

  // Check minimum gap between events
  if (rules.minEventGap) {
    const nearbyEvents = existingEvents.filter(e => {
      const timeDiff = Math.abs(e.startTime.getTime() - event.startTime.getTime()) / 60000;
      return timeDiff < rules.minEventGap && e.status !== 'cancelled';
    });

    if (nearbyEvents.length > 0) {
      warnings.push(`Less than ${rules.minEventGap} minutes between events`);
    }
  }

  return {
    success: errors.length === 0,
    data: errors.length === 0,
    error: errors.length > 0 ? errors.join('; ') : undefined,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

/**
 * Optimize event scheduling to minimize conflicts
 */
export function optimizeEventScheduling(
  events: EnhancedCalendarEvent[],
  constraints: {
    workingHours?: { start: string; end: string };
    preferredGapMinutes?: number;
    maxReschedulingWindow?: number; // days
  } = {}
): EnhancedCalendarEvent[] {
  const optimizedEvents = [...events];
  const { workingHours, preferredGapMinutes = 15, maxReschedulingWindow = 7 } = constraints;

  // Sort events by priority and flexibility
  optimizedEvents.sort((a, b) => {
    const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1 };
    const priorityDiff = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);

    if (priorityDiff !== 0) return priorityDiff;

    // Then by start time
    return a.startTime.getTime() - b.startTime.getTime();
  });

  // Simple optimization: try to reschedule conflicting events
  for (let i = 0; i < optimizedEvents.length; i++) {
    const currentEvent = optimizedEvents[i];
    const conflicts = detectEventConflicts(
      currentEvent,
      optimizedEvents.slice(0, i), // Only check against already processed events
      { includeTravelTime: true, includeBufferTime: true }
    );

    if (conflicts.length > 0) {
      // Try to find a better time slot
      const betterTime = findBetterTimeSlot(
        currentEvent,
        optimizedEvents.slice(0, i),
        constraints
      );

      if (betterTime) {
        optimizedEvents[i] = {
          ...currentEvent,
          startTime: betterTime.startTime,
          endTime: betterTime.endTime
        };
      }
    }
  }

  return optimizedEvents;
}

/**
 * Find a better time slot for an event to avoid conflicts
 */
function findBetterTimeSlot(
  event: EnhancedCalendarEvent,
  existingEvents: EnhancedCalendarEvent[],
  constraints: {
    workingHours?: { start: string; end: string };
    preferredGapMinutes?: number;
    maxReschedulingWindow?: number;
  }
): { startTime: Date; endTime: Date } | null {
  const eventDuration = event.endTime.getTime() - event.startTime.getTime();
  const { preferredGapMinutes = 15, maxReschedulingWindow = 7 } = constraints;

  // Try different time slots within the rescheduling window
  const endDate = new Date(event.startTime.getTime() + (maxReschedulingWindow * 24 * 60 * 60 * 1000));

  for (let day = new Date(event.startTime); day <= endDate; day.setDate(day.getDate() + 1)) {
    // Skip weekends if original event wasn't on weekend
    const originalDay = event.startTime.getDay();
    const currentDay = day.getDay();

    if (originalDay !== 0 && originalDay !== 6 && (currentDay === 0 || currentDay === 6)) {
      continue;
    }

    // Try different hour slots
    for (let hour = 8; hour <= 18; hour++) { // Business hours
      for (let minute = 0; minute < 60; minute += 30) { // 30-minute intervals
        const candidateStart = new Date(day);
        candidateStart.setHours(hour, minute, 0, 0);
        const candidateEnd = new Date(candidateStart.getTime() + eventDuration);

        // Check working hours constraints
        if (constraints.workingHours) {
          const candidateHour = candidateStart.getHours();
          const candidateMinute = candidateStart.getMinutes();
          const candidateTime = candidateHour * 60 + candidateMinute;

          const [startHour = 9, startMin = 0] = constraints.workingHours.start.split(':').map(Number);
          const [endHour = 17, endMin = 0] = constraints.workingHours.end.split(':').map(Number);
          const workStart = startHour * 60 + startMin;
          const workEnd = endHour * 60 + endMin;

          if (candidateTime < workStart || candidateTime > workEnd) {
            continue;
          }
        }

        // Create candidate event for conflict checking
        const candidateEvent: EnhancedCalendarEvent = {
          ...event,
          startTime: candidateStart,
          endTime: candidateEnd
        };

        // Check for conflicts
        const conflicts = detectEventConflicts(candidateEvent, existingEvents);

        if (conflicts.length === 0) {
          return { startTime: candidateStart, endTime: candidateEnd };
        }
      }
    }
  }

  return null; // No suitable time slot found
}

export default {
  detectEventConflicts,
  detectBatchConflicts,
  validateEventScheduling,
  optimizeEventScheduling,
  CONFLICT_CONFIG
};