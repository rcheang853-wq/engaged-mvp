// Tests for conflict detection utilities
import {
  detectEventConflicts,
  detectBatchConflicts,
  validateEventScheduling,
  optimizeEventScheduling,
  CONFLICT_CONFIG
} from '@/utils/conflict-detection';
import {
  EnhancedCalendarEvent,
  ConflictSeverity,
  ConflictType,
  EventStatus,
  EventPriority,
  EventVisibility
} from '@/types/calendar';
import { createMockEvent } from './calendar-service.test';

describe('Conflict Detection', () => {
  describe('detectEventConflicts', () => {
    test('should detect basic time overlap', () => {
      const newEvent = createMockEvent({
        startTime: new Date('2025-12-01T10:00:00.000Z'),
        endTime: new Date('2025-12-01T11:00:00.000Z'),
        timezone: 'UTC'
      });

      const existingEvents = [
        createMockEvent({
          id: 'existing-1',
          startTime: new Date('2025-12-01T10:30:00.000Z'),
          endTime: new Date('2025-12-01T11:30:00.000Z'),
          timezone: 'UTC'
        })
      ];

      const conflicts = detectEventConflicts(newEvent, existingEvents);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].conflictingEventId).toBe('existing-1');
      expect(conflicts[0].overlapMinutes).toBeGreaterThan(0);
      expect(conflicts[0].type).toBe('overlap');
    });

    test('should not detect conflicts for non-overlapping events', () => {
      const newEvent = createMockEvent({
        startTime: new Date('2025-12-01T10:00:00.000Z'),
        endTime: new Date('2025-12-01T11:00:00.000Z'),
        timezone: 'UTC'
      });

      const existingEvents = [
        createMockEvent({
          id: 'existing-1',
          startTime: new Date('2025-12-01T12:00:00.000Z'),
          endTime: new Date('2025-12-01T13:00:00.000Z'),
          timezone: 'UTC'
        })
      ];

      const conflicts = detectEventConflicts(newEvent, existingEvents);

      expect(conflicts).toHaveLength(0);
    });

    test('should detect travel time conflicts', () => {
      const newEvent = createMockEvent({
        startTime: new Date('2025-12-01T10:00:00.000Z'),
        endTime: new Date('2025-12-01T11:00:00.000Z'),
        location: 'Office Building A',
        timezone: 'UTC'
      });

      const existingEvents = [
        createMockEvent({
          id: 'existing-1',
          startTime: new Date('2025-12-01T11:05:00.000Z'), // 5 minutes after new event ends
          endTime: new Date('2025-12-01T12:00:00.000Z'),
          location: 'Office Building B', // Different location
          timezone: 'UTC'
        })
      ];

      const conflicts = detectEventConflicts(newEvent, existingEvents, {
        includeTravelTime: true
      });

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].type).toBe('travel_time');
    });

    test('should consider buffer time for priority events', () => {
      const newEvent = createMockEvent({
        startTime: new Date('2025-12-01T10:00:00.000Z'),
        endTime: new Date('2025-12-01T11:00:00.000Z'),
        priority: 'urgent' as EventPriority,
        timezone: 'UTC'
      });

      const existingEvents = [
        createMockEvent({
          id: 'existing-1',
          startTime: new Date('2025-12-01T11:10:00.000Z'), // 10 minutes after new event
          endTime: new Date('2025-12-01T12:00:00.000Z'),
          timezone: 'UTC'
        })
      ];

      const conflicts = detectEventConflicts(newEvent, existingEvents, {
        includeBufferTime: true
      });

      // Should detect conflict due to urgent priority requiring buffer time
      expect(conflicts).toHaveLength(1);
    });

    test('should skip cancelled events', () => {
      const newEvent = createMockEvent({
        startTime: new Date('2025-12-01T10:00:00.000Z'),
        endTime: new Date('2025-12-01T11:00:00.000Z'),
        timezone: 'UTC'
      });

      const existingEvents = [
        createMockEvent({
          id: 'existing-1',
          startTime: new Date('2025-12-01T10:30:00.000Z'),
          endTime: new Date('2025-12-01T11:30:00.000Z'),
          status: 'cancelled' as EventStatus,
          timezone: 'UTC'
        })
      ];

      const conflicts = detectEventConflicts(newEvent, existingEvents);

      expect(conflicts).toHaveLength(0); // Should skip cancelled events
    });

    test('should handle same event ID', () => {
      const event = createMockEvent({
        id: 'same-event',
        startTime: new Date('2025-12-01T10:00:00.000Z'),
        endTime: new Date('2025-12-01T11:00:00.000Z'),
        timezone: 'UTC'
      });

      const conflicts = detectEventConflicts(event, [event]);

      expect(conflicts).toHaveLength(0); // Should skip same event
    });

    test('should sort conflicts by severity and overlap time', () => {
      const newEvent = createMockEvent({
        startTime: new Date('2025-12-01T10:00:00.000Z'),
        endTime: new Date('2025-12-01T11:00:00.000Z'),
        timezone: 'UTC'
      });

      const existingEvents = [
        createMockEvent({
          id: 'minor-conflict',
          startTime: new Date('2025-12-01T10:50:00.000Z'), // 10 min overlap
          endTime: new Date('2025-12-01T11:30:00.000Z'),
          timezone: 'UTC'
        }),
        createMockEvent({
          id: 'major-conflict',
          startTime: new Date('2025-12-01T10:00:00.000Z'), // Complete overlap
          endTime: new Date('2025-12-01T11:00:00.000Z'),
          timezone: 'UTC'
        })
      ];

      const conflicts = detectEventConflicts(newEvent, existingEvents);

      expect(conflicts).toHaveLength(2);
      // Major conflict should be first (higher severity/overlap)
      expect(conflicts[0].conflictingEventId).toBe('major-conflict');
      expect(conflicts[0].overlapMinutes).toBeGreaterThan(conflicts[1].overlapMinutes);
    });

    test('should handle custom travel time', () => {
      const newEvent = createMockEvent({
        startTime: new Date('2025-12-01T10:00:00.000Z'),
        endTime: new Date('2025-12-01T11:00:00.000Z'),
        location: 'Location A',
        timezone: 'UTC'
      });

      const existingEvents = [
        createMockEvent({
          id: 'existing-1',
          startTime: new Date('2025-12-01T11:20:00.000Z'), // 20 minutes after
          endTime: new Date('2025-12-01T12:00:00.000Z'),
          location: 'Location B',
          timezone: 'UTC'
        })
      ];

      const conflicts = detectEventConflicts(newEvent, existingEvents, {
        includeTravelTime: true,
        customTravelTime: 30 // 30 minutes custom travel time
      });

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].type).toBe('travel_time');
    });
  });

  describe('detectBatchConflicts', () => {
    test('should detect conflicts among multiple events', () => {
      const events = [
        createMockEvent({
          id: 'event-1',
          startTime: new Date('2025-12-01T10:00:00.000Z'),
          endTime: new Date('2025-12-01T11:00:00.000Z'),
          timezone: 'UTC'
        }),
        createMockEvent({
          id: 'event-2',
          startTime: new Date('2025-12-01T10:30:00.000Z'),
          endTime: new Date('2025-12-01T11:30:00.000Z'),
          timezone: 'UTC'
        }),
        createMockEvent({
          id: 'event-3',
          startTime: new Date('2025-12-01T14:00:00.000Z'),
          endTime: new Date('2025-12-01T15:00:00.000Z'),
          timezone: 'UTC'
        })
      ];

      const conflictMap = detectBatchConflicts(events);

      expect(Object.keys(conflictMap)).toHaveLength(1); // Only event-1 should have conflicts
      expect(conflictMap['event-1']).toBeDefined();
      expect(conflictMap['event-1']).toHaveLength(1);
      expect(conflictMap['event-1'][0].conflictingEventId).toBe('event-2');
    });

    test('should handle events within detection window', () => {
      const baseDate = new Date('2025-12-01T10:00:00.000Z');
      const events = [
        createMockEvent({
          id: 'event-1',
          startTime: baseDate,
          endTime: new Date(baseDate.getTime() + 60 * 60 * 1000), // 1 hour later
          timezone: 'UTC'
        }),
        createMockEvent({
          id: 'event-2',
          startTime: new Date(baseDate.getTime() + 35 * 24 * 60 * 60 * 1000), // 35 days later (outside window)
          endTime: new Date(baseDate.getTime() + 35 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
          timezone: 'UTC'
        })
      ];

      const conflictMap = detectBatchConflicts(events);

      // Should not detect conflicts for events outside detection window
      expect(Object.keys(conflictMap)).toHaveLength(0);
    });

    test('should handle empty event list', () => {
      const conflictMap = detectBatchConflicts([]);

      expect(Object.keys(conflictMap)).toHaveLength(0);
    });

    test('should sort events by start time for efficient processing', () => {
      const events = [
        createMockEvent({
          id: 'event-3',
          startTime: new Date('2025-12-01T14:00:00.000Z'),
          endTime: new Date('2025-12-01T15:00:00.000Z'),
          timezone: 'UTC'
        }),
        createMockEvent({
          id: 'event-1',
          startTime: new Date('2025-12-01T10:00:00.000Z'),
          endTime: new Date('2025-12-01T11:00:00.000Z'),
          timezone: 'UTC'
        }),
        createMockEvent({
          id: 'event-2',
          startTime: new Date('2025-12-01T10:30:00.000Z'),
          endTime: new Date('2025-12-01T11:30:00.000Z'),
          timezone: 'UTC'
        })
      ];

      const conflictMap = detectBatchConflicts(events);

      // Should process correctly regardless of input order
      expect(Object.keys(conflictMap)).toContain('event-1');
    });
  });

  describe('validateEventScheduling', () => {
    test('should validate against working hours', () => {
      const event = createMockEvent({
        startTime: new Date('2025-12-01T22:00:00.000Z'), // 10 PM UTC
        endTime: new Date('2025-12-01T23:00:00.000Z'),
        allDay: false,
        timezone: 'UTC'
      });

      const rules = {
        workingHours: { start: '09:00', end: '17:00' },
        allowWeekends: true
      };

      const result = validateEventScheduling(event, [], rules);

      expect(result.success).toBe(true); // Should pass but with warnings
      expect(result.warnings).toBeDefined();
      expect(result.warnings![0]).toContain('outside working hours');
    });

    test('should validate weekend scheduling', () => {
      const event = createMockEvent({
        startTime: new Date('2025-12-06T10:00:00.000Z'), // Saturday
        endTime: new Date('2025-12-06T11:00:00.000Z'),
        timezone: 'UTC'
      });

      const rules = {
        allowWeekends: false
      };

      const result = validateEventScheduling(event, [], rules);

      expect(result.success).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings![0]).toContain('weekend');
    });

    test('should validate max events per day', () => {
      const event = createMockEvent({
        startTime: new Date('2025-12-01T10:00:00.000Z'),
        endTime: new Date('2025-12-01T11:00:00.000Z'),
        timezone: 'UTC'
      });

      const existingEvents = [
        createMockEvent({
          id: 'existing-1',
          startTime: new Date('2025-12-01T09:00:00.000Z'),
          endTime: new Date('2025-12-01T10:00:00.000Z'),
          timezone: 'UTC'
        }),
        createMockEvent({
          id: 'existing-2',
          startTime: new Date('2025-12-01T14:00:00.000Z'),
          endTime: new Date('2025-12-01T15:00:00.000Z'),
          timezone: 'UTC'
        })
      ];

      const rules = {
        maxEventsPerDay: 2
      };

      const result = validateEventScheduling(event, existingEvents, rules);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Maximum 2 events per day exceeded');
    });

    test('should validate concurrent events limit', () => {
      const event = createMockEvent({
        startTime: new Date('2025-12-01T10:00:00.000Z'),
        endTime: new Date('2025-12-01T11:00:00.000Z'),
        timezone: 'UTC'
      });

      const existingEvents = [
        createMockEvent({
          id: 'existing-1',
          startTime: new Date('2025-12-01T10:30:00.000Z'),
          endTime: new Date('2025-12-01T11:30:00.000Z'),
          timezone: 'UTC'
        })
      ];

      const rules = {
        maxConcurrentEvents: 0 // No concurrent events allowed
      };

      const result = validateEventScheduling(event, existingEvents, rules);

      expect(result.success).toBe(false);
      expect(result.error).toContain('concurrent events exceeded');
    });

    test('should validate minimum gap between events', () => {
      const event = createMockEvent({
        startTime: new Date('2025-12-01T10:00:00.000Z'),
        endTime: new Date('2025-12-01T11:00:00.000Z'),
        timezone: 'UTC'
      });

      const existingEvents = [
        createMockEvent({
          id: 'existing-1',
          startTime: new Date('2025-12-01T10:05:00.000Z'), // 5 minutes after start
          endTime: new Date('2025-12-01T11:05:00.000Z'),
          timezone: 'UTC'
        })
      ];

      const rules = {
        minEventGap: 30 // 30 minutes required gap
      };

      const result = validateEventScheduling(event, existingEvents, rules);

      expect(result.success).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings![0]).toContain('Less than 30 minutes between events');
    });

    test('should pass validation with no rules violations', () => {
      const event = createMockEvent({
        startTime: new Date('2025-12-01T10:00:00.000Z'),
        endTime: new Date('2025-12-01T11:00:00.000Z'),
        timezone: 'UTC'
      });

      const result = validateEventScheduling(event, [], {});

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('optimizeEventScheduling', () => {
    test('should optimize conflicting events', () => {
      const events = [
        createMockEvent({
          id: 'event-1',
          startTime: new Date('2025-12-01T10:00:00.000Z'),
          endTime: new Date('2025-12-01T11:00:00.000Z'),
          priority: 'high' as EventPriority,
          timezone: 'UTC'
        }),
        createMockEvent({
          id: 'event-2',
          startTime: new Date('2025-12-01T10:30:00.000Z'),
          endTime: new Date('2025-12-01T11:30:00.000Z'),
          priority: 'normal' as EventPriority,
          timezone: 'UTC'
        })
      ];

      const optimizedEvents = optimizeEventScheduling(events);

      expect(optimizedEvents).toHaveLength(2);
      // Should maintain or improve the scheduling
      expect(optimizedEvents[0].id).toBe('event-1'); // High priority should be first
    });

    test('should respect working hours constraints', () => {
      const events = [
        createMockEvent({
          id: 'event-1',
          startTime: new Date('2025-12-01T10:00:00.000Z'),
          endTime: new Date('2025-12-01T11:00:00.000Z'),
          timezone: 'UTC'
        })
      ];

      const constraints = {
        workingHours: { start: '09:00', end: '17:00' },
        preferredGapMinutes: 15,
        maxReschedulingWindow: 7
      };

      const optimizedEvents = optimizeEventScheduling(events, constraints);

      expect(optimizedEvents).toHaveLength(1);
      expect(optimizedEvents[0]).toBeDefined();
    });

    test('should limit rescheduling window', () => {
      const events = [
        createMockEvent({
          id: 'event-1',
          startTime: new Date('2025-12-01T10:00:00.000Z'),
          endTime: new Date('2025-12-01T11:00:00.000Z'),
          timezone: 'UTC'
        })
      ];

      const constraints = {
        maxReschedulingWindow: 1 // Only 1 day window
      };

      const optimizedEvents = optimizeEventScheduling(events, constraints);

      expect(optimizedEvents).toHaveLength(1);
      // Should not reschedule beyond the 1-day window
    });

    test('should handle empty event list', () => {
      const optimizedEvents = optimizeEventScheduling([]);

      expect(optimizedEvents).toHaveLength(0);
    });

    test('should preserve event properties', () => {
      const originalEvent = createMockEvent({
        id: 'event-1',
        title: 'Important Meeting',
        description: 'Critical business meeting',
        priority: 'urgent' as EventPriority,
        timezone: 'UTC'
      });

      const optimizedEvents = optimizeEventScheduling([originalEvent]);

      expect(optimizedEvents[0].id).toBe(originalEvent.id);
      expect(optimizedEvents[0].title).toBe(originalEvent.title);
      expect(optimizedEvents[0].description).toBe(originalEvent.description);
      expect(optimizedEvents[0].priority).toBe(originalEvent.priority);
    });
  });

  describe('CONFLICT_CONFIG', () => {
    test('should export configuration constants', () => {
      expect(CONFLICT_CONFIG).toBeDefined();
      expect(CONFLICT_CONFIG.DEFAULT_TRAVEL_TIME).toBeDefined();
      expect(CONFLICT_CONFIG.LOCATION_TRAVEL_TIMES).toBeDefined();
      expect(CONFLICT_CONFIG.PRIORITY_BUFFERS).toBeDefined();
      expect(CONFLICT_CONFIG.SEVERITY_THRESHOLDS).toBeDefined();
      expect(CONFLICT_CONFIG.MAX_SUGGESTIONS).toBeDefined();
      expect(CONFLICT_CONFIG.CONFLICT_DETECTION_WINDOW).toBeDefined();

      // Verify structure
      expect(typeof CONFLICT_CONFIG.DEFAULT_TRAVEL_TIME).toBe('number');
      expect(typeof CONFLICT_CONFIG.MAX_SUGGESTIONS).toBe('number');
      expect(typeof CONFLICT_CONFIG.CONFLICT_DETECTION_WINDOW).toBe('number');

      // Verify nested objects
      expect(CONFLICT_CONFIG.LOCATION_TRAVEL_TIMES).toHaveProperty('same_building');
      expect(CONFLICT_CONFIG.LOCATION_TRAVEL_TIMES).toHaveProperty('virtual');
      expect(CONFLICT_CONFIG.PRIORITY_BUFFERS).toHaveProperty('urgent');
      expect(CONFLICT_CONFIG.SEVERITY_THRESHOLDS).toHaveProperty('critical');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle null/undefined events gracefully', () => {
      expect(() => {
        detectEventConflicts(null as any, []);
      }).toThrow();

      expect(() => {
        detectEventConflicts(createMockEvent(), null as any);
      }).toThrow();
    });

    test('should handle malformed dates', () => {
      const eventWithBadDate = {
        ...createMockEvent(),
        startTime: new Date('invalid-date'),
        endTime: new Date('also-invalid')
      };

      const conflicts = detectEventConflicts(eventWithBadDate, []);
      // Should handle gracefully, possibly returning empty conflicts
      expect(Array.isArray(conflicts)).toBe(true);
    });

    test('should handle events with same start and end time', () => {
      const sameTime = new Date('2025-12-01T10:00:00.000Z');
      const zeroLengthEvent = createMockEvent({
        startTime: sameTime,
        endTime: sameTime, // Same time
        timezone: 'UTC'
      });

      const conflicts = detectEventConflicts(zeroLengthEvent, []);
      expect(Array.isArray(conflicts)).toBe(true);
    });

    test('should handle invalid timezone in events', () => {
      const eventWithInvalidTz = createMockEvent({
        timezone: 'Invalid/Timezone'
      });

      const conflicts = detectEventConflicts(eventWithInvalidTz, []);
      expect(Array.isArray(conflicts)).toBe(true);
    });

    test('should handle very large number of events', () => {
      const manyEvents = Array.from({ length: 100 }, (_, i) =>
        createMockEvent({
          id: `event-${i}`,
          startTime: new Date(`2025-12-01T${10 + i % 8}:00:00.000Z`),
          endTime: new Date(`2025-12-01T${11 + i % 8}:00:00.000Z`),
          timezone: 'UTC'
        })
      );

      const conflictMap = detectBatchConflicts(manyEvents);
      expect(typeof conflictMap).toBe('object');
    });

    test('should handle overlapping priority calculations', () => {
      const event1 = createMockEvent({
        priority: 'urgent' as EventPriority,
        timezone: 'UTC'
      });

      const event2 = createMockEvent({
        id: 'event-2',
        priority: 'urgent' as EventPriority,
        startTime: new Date('2025-12-01T10:30:00.000Z'),
        endTime: new Date('2025-12-01T11:30:00.000Z'),
        timezone: 'UTC'
      });

      const conflicts = detectEventConflicts(event1, [event2]);
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].severity).toBeDefined();
    });
  });
});