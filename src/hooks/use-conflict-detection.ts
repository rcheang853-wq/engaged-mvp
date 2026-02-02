import { useState, useEffect, useCallback } from 'react';
import { CalendarEvent } from '@/types/calendar';

export interface EventConflict {
  id: string;
  conflictingEventId: string;
  conflictingEventTitle: string;
  conflictType: 'overlap' | 'adjacent' | 'travel_time';
  severity: 'low' | 'medium' | 'high';
  overlapMinutes?: number;
  suggestion?: string;
}

export interface ConflictDetectionResult {
  hasConflicts: boolean;
  conflicts: EventConflict[];
  suggestions: string[];
}

interface UseConflictDetectionParams {
  events: CalendarEvent[];
  currentEvent?: CalendarEvent | null;
  enabled?: boolean;
}

export function useConflictDetection({
  events,
  currentEvent,
  enabled = true
}: UseConflictDetectionParams) {
  const [conflicts, setConflicts] = useState<EventConflict[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // Detect conflicts for a specific event
  const detectConflicts = useCallback(async (
    targetEvent: CalendarEvent,
    allEvents: CalendarEvent[]
  ): Promise<ConflictDetectionResult> => {
    setIsDetecting(true);

    try {
      const detectedConflicts: EventConflict[] = [];
      const eventSuggestions: string[] = [];

      const targetStart = new Date(targetEvent.start_time);
      const targetEnd = new Date(targetEvent.end_time);

      // Check against all other events
      for (const event of allEvents) {
        if (event.id === targetEvent.id) continue;

        const eventStart = new Date(event.start_time);
        const eventEnd = new Date(event.end_time);

        // Check for time overlap
        if (targetStart < eventEnd && targetEnd > eventStart) {
          const overlapStart = new Date(Math.max(targetStart.getTime(), eventStart.getTime()));
          const overlapEnd = new Date(Math.min(targetEnd.getTime(), eventEnd.getTime()));
          const overlapMinutes = Math.round((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60));

          let severity: 'low' | 'medium' | 'high' = 'low';
          let suggestion = '';

          if (overlapMinutes >= 60) {
            severity = 'high';
            suggestion = 'Consider rescheduling one of the events to avoid significant overlap';
          } else if (overlapMinutes >= 15) {
            severity = 'medium';
            suggestion = 'Short overlap detected - consider adjusting start/end times';
          } else {
            severity = 'low';
            suggestion = 'Minor overlap - may be acceptable if events are related';
          }

          detectedConflicts.push({
            id: `conflict-${targetEvent.id}-${event.id}`,
            conflictingEventId: event.id,
            conflictingEventTitle: event.title,
            conflictType: 'overlap',
            severity,
            overlapMinutes,
            suggestion
          });

          eventSuggestions.push(suggestion);
        }

        // Check for tight scheduling (less than 15 minutes between events)
        const timeBetweenEvents = Math.abs(
          Math.min(
            Math.abs(targetStart.getTime() - eventEnd.getTime()),
            Math.abs(eventStart.getTime() - targetEnd.getTime())
          )
        );

        if (timeBetweenEvents > 0 && timeBetweenEvents < 15 * 60 * 1000) { // Less than 15 minutes
          // Check if events have locations (travel time consideration)
          if (targetEvent.location && event.location && targetEvent.location !== event.location) {
            detectedConflicts.push({
              id: `travel-${targetEvent.id}-${event.id}`,
              conflictingEventId: event.id,
              conflictingEventTitle: event.title,
              conflictType: 'travel_time',
              severity: 'medium',
              suggestion: 'Consider travel time between different locations'
            });

            eventSuggestions.push('Add buffer time for travel between locations');
          } else {
            detectedConflicts.push({
              id: `adjacent-${targetEvent.id}-${event.id}`,
              conflictingEventId: event.id,
              conflictingEventTitle: event.title,
              conflictType: 'adjacent',
              severity: 'low',
              suggestion: 'Very tight scheduling - consider adding buffer time'
            });
          }
        }
      }

      return {
        hasConflicts: detectedConflicts.length > 0,
        conflicts: detectedConflicts,
        suggestions: [...new Set(eventSuggestions)] // Remove duplicates
      };

    } catch (error) {
      console.error('Error detecting conflicts:', error);
      return {
        hasConflicts: false,
        conflicts: [],
        suggestions: []
      };
    } finally {
      setIsDetecting(false);
    }
  }, []);

  // Auto-detect conflicts when events or current event changes
  useEffect(() => {
    if (!enabled || !currentEvent) {
      setConflicts([]);
      setSuggestions([]);
      return;
    }

    detectConflicts(currentEvent, events).then((result) => {
      setConflicts(result.conflicts);
      setSuggestions(result.suggestions);
    });
  }, [currentEvent, events, enabled, detectConflicts]);

  // Get suggested time slots for rescheduling
  const getSuggestedTimeSlots = useCallback((
    targetEvent: CalendarEvent,
    preferredDuration: number = 60 // minutes
  ) => {
    const suggestions: Array<{
      start: Date;
      end: Date;
      reason: string;
    }> = [];

    const targetStart = new Date(targetEvent.start_time);
    const eventDuration = new Date(targetEvent.end_time).getTime() - targetStart.getTime();
    const duration = preferredDuration * 60 * 1000; // Convert to milliseconds

    // Find free slots throughout the day
    const dayStart = new Date(targetStart);
    dayStart.setHours(8, 0, 0, 0); // Start from 8 AM

    const dayEnd = new Date(targetStart);
    dayEnd.setHours(18, 0, 0, 0); // End at 6 PM

    const timeSlots: Date[] = [];
    for (let time = dayStart.getTime(); time <= dayEnd.getTime(); time += 30 * 60 * 1000) {
      timeSlots.push(new Date(time));
    }

    // Check each time slot
    for (const slotStart of timeSlots) {
      const slotEnd = new Date(slotStart.getTime() + duration);

      // Skip if slot extends past business hours
      if (slotEnd > dayEnd) continue;

      // Check if this slot conflicts with any existing events
      const hasConflict = events.some(event => {
        if (event.id === targetEvent.id) return false;
        const eventStart = new Date(event.start_time);
        const eventEnd = new Date(event.end_time);
        return slotStart < eventEnd && slotEnd > eventStart;
      });

      if (!hasConflict) {
        suggestions.push({
          start: slotStart,
          end: slotEnd,
          reason: 'Available time slot'
        });

        // Limit to 5 suggestions
        if (suggestions.length >= 5) break;
      }
    }

    return suggestions;
  }, [events]);

  // Check conflicts for any event without setting state
  const checkEventConflicts = useCallback((event: CalendarEvent) => {
    return detectConflicts(event, events);
  }, [detectConflicts, events]);

  return {
    conflicts,
    suggestions,
    isDetecting,
    hasConflicts: conflicts.length > 0,
    detectConflicts,
    getSuggestedTimeSlots,
    checkEventConflicts
  };
}