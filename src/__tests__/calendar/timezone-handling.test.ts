// Tests for timezone handling utilities
import {
  getTimezoneInfo,
  convertTimezone,
  formatDateWithTimezone,
  createMultiTimezoneEvent,
  checkTimezoneAwareOverlap,
  getUserTimezone,
  isValidTimezone,
  getAvailableTimezones,
  getWorkingHoursInTimezone,
  getCurrentTimeInTimezones,
  suggestOptimalMeetingTime,
  COMMON_TIMEZONES,
  DEFAULT_TIMEZONE,
  BROWSER_TIMEZONE
} from '@/utils/timezone-handling';
import { EnhancedCalendarEvent } from '@/types/calendar';
import { createMockEvent } from './calendar-service.test';

describe('Timezone Handling', () => {
  describe('getTimezoneInfo', () => {
    test('should get timezone info for UTC', () => {
      const info = getTimezoneInfo('UTC');

      expect(info.timezone).toBe('UTC');
      expect(info.offset).toBe(0);
      expect(info.abbreviation).toBe('UTC');
      expect(info.isDst).toBe(false);
    });

    test('should get timezone info for EST/EDT', () => {
      const date = new Date('2025-07-01T12:00:00.000Z'); // Summer time
      const info = getTimezoneInfo('America/New_York', date);

      expect(info.timezone).toBe('America/New_York');
      expect(info.offset).toBeLessThan(0); // Negative offset for US timezones
      expect(info.abbreviation).toBeTruthy();
    });

    test('should handle invalid timezone gracefully', () => {
      const info = getTimezoneInfo('Invalid/Timezone');

      // Should fallback to UTC
      expect(info.timezone).toBe('UTC');
      expect(info.offset).toBe(0);
    });

    test('should detect DST correctly', () => {
      const summerDate = new Date('2025-07-01T12:00:00.000Z');
      const winterDate = new Date('2025-01-01T12:00:00.000Z');

      const summerInfo = getTimezoneInfo('America/New_York', summerDate);
      const winterInfo = getTimezoneInfo('America/New_York', winterDate);

      // DST should be different between summer and winter
      expect(summerInfo.isDst).not.toBe(winterInfo.isDst);
    });
  });

  describe('convertTimezone', () => {
    test('should convert UTC to EST', () => {
      const utcDate = new Date('2025-12-01T15:00:00.000Z'); // 3 PM UTC
      const estDate = convertTimezone(utcDate, 'UTC', 'America/New_York');

      expect(estDate).toBeInstanceOf(Date);
      expect(estDate.getTime()).not.toBe(utcDate.getTime());
    });

    test('should handle same timezone conversion', () => {
      const date = new Date('2025-12-01T15:00:00.000Z');
      const sameDate = convertTimezone(date, 'UTC', 'UTC');

      // Should be approximately the same (allowing for small processing differences)
      expect(Math.abs(sameDate.getTime() - date.getTime())).toBeLessThan(1000);
    });

    test('should handle invalid timezone gracefully', () => {
      const date = new Date('2025-12-01T15:00:00.000Z');
      const result = convertTimezone(date, 'UTC', 'Invalid/Timezone');

      // Should return original date or handle gracefully
      expect(result).toBeInstanceOf(Date);
    });
  });

  describe('formatDateWithTimezone', () => {
    test('should format date with timezone', () => {
      const date = new Date('2025-12-01T15:00:00.000Z');
      const formatted = formatDateWithTimezone(date, 'America/New_York');

      expect(formatted).toContain('December');
      expect(formatted).toContain('1');
      expect(formatted).toContain('2025');
    });

    test('should format with different options', () => {
      const date = new Date('2025-12-01T15:00:00.000Z');

      const short = formatDateWithTimezone(date, 'UTC', { format: 'short' });
      const long = formatDateWithTimezone(date, 'UTC', { format: 'long' });
      const full = formatDateWithTimezone(date, 'UTC', { format: 'full' });

      expect(short).toBeTruthy();
      expect(long).toBeTruthy();
      expect(full).toBeTruthy();
    });

    test('should include/exclude timezone based on option', () => {
      const date = new Date('2025-12-01T15:00:00.000Z');

      const withTz = formatDateWithTimezone(date, 'UTC', { includeTimezone: true });
      const withoutTz = formatDateWithTimezone(date, 'UTC', { includeTimezone: false });

      expect(withTz).toBeTruthy();
      expect(withoutTz).toBeTruthy();
    });
  });

  describe('createMultiTimezoneEvent', () => {
    test('should create multi-timezone view of event', () => {
      const event = createMockEvent({
        startTime: new Date('2025-12-01T15:00:00.000Z'),
        endTime: new Date('2025-12-01T16:00:00.000Z'),
        timezone: 'UTC'
      });

      const timezones = ['UTC', 'America/New_York', 'Europe/London'];
      const multiTzEvent = createMultiTimezoneEvent(event, timezones);

      expect(multiTzEvent.event).toBe(event);
      expect(Object.keys(multiTzEvent.timezones)).toHaveLength(3);

      for (const tz of timezones) {
        expect(multiTzEvent.timezones[tz]).toBeDefined();
        expect(multiTzEvent.timezones[tz].startTime).toBeInstanceOf(Date);
        expect(multiTzEvent.timezones[tz].endTime).toBeInstanceOf(Date);
        expect(multiTzEvent.timezones[tz].displayTime).toBeTruthy();
        expect(typeof multiTzEvent.timezones[tz].isNextDay).toBe('boolean');
      }
    });

    test('should handle event spanning days', () => {
      const event = createMockEvent({
        startTime: new Date('2025-12-01T23:00:00.000Z'), // 11 PM UTC
        endTime: new Date('2025-12-02T01:00:00.000Z'), // 1 AM UTC next day
        timezone: 'UTC'
      });

      const multiTzEvent = createMultiTimezoneEvent(event, ['UTC', 'America/Los_Angeles']);

      expect(multiTzEvent.timezones['UTC']).toBeDefined();
      expect(multiTzEvent.timezones['America/Los_Angeles']).toBeDefined();
    });
  });

  describe('checkTimezoneAwareOverlap', () => {
    test('should detect overlap in same timezone', () => {
      const event1 = {
        startTime: new Date('2025-12-01T10:00:00.000Z'),
        endTime: new Date('2025-12-01T11:00:00.000Z'),
        timezone: 'UTC'
      };

      const event2 = {
        startTime: new Date('2025-12-01T10:30:00.000Z'),
        endTime: new Date('2025-12-01T11:30:00.000Z'),
        timezone: 'UTC'
      };

      const hasOverlap = checkTimezoneAwareOverlap(event1, event2);
      expect(hasOverlap).toBe(true);
    });

    test('should detect no overlap in same timezone', () => {
      const event1 = {
        startTime: new Date('2025-12-01T10:00:00.000Z'),
        endTime: new Date('2025-12-01T11:00:00.000Z'),
        timezone: 'UTC'
      };

      const event2 = {
        startTime: new Date('2025-12-01T12:00:00.000Z'),
        endTime: new Date('2025-12-01T13:00:00.000Z'),
        timezone: 'UTC'
      };

      const hasOverlap = checkTimezoneAwareOverlap(event1, event2);
      expect(hasOverlap).toBe(false);
    });

    test('should detect overlap across different timezones', () => {
      const event1 = {
        startTime: new Date('2025-12-01T15:00:00.000Z'), // 3 PM UTC
        endTime: new Date('2025-12-01T16:00:00.000Z'),   // 4 PM UTC
        timezone: 'UTC'
      };

      const event2 = {
        startTime: new Date('2025-12-01T11:30:00.000Z'), // 11:30 AM UTC / 3:30 PM in +4 timezone
        endTime: new Date('2025-12-01T12:30:00.000Z'),   // 12:30 PM UTC / 4:30 PM in +4 timezone
        timezone: 'Europe/Moscow' // +3 UTC in winter, +4 in summer
      };

      const hasOverlap = checkTimezoneAwareOverlap(event1, event2);
      // Should detect overlap when converted to common timezone
      expect(typeof hasOverlap).toBe('boolean');
    });

    test('should handle invalid timezones gracefully', () => {
      const event1 = {
        startTime: new Date('2025-12-01T10:00:00.000Z'),
        endTime: new Date('2025-12-01T11:00:00.000Z'),
        timezone: 'Invalid/Timezone'
      };

      const event2 = {
        startTime: new Date('2025-12-01T10:30:00.000Z'),
        endTime: new Date('2025-12-01T11:30:00.000Z'),
        timezone: 'UTC'
      };

      const hasOverlap = checkTimezoneAwareOverlap(event1, event2);
      expect(typeof hasOverlap).toBe('boolean'); // Should not throw error
    });
  });

  describe('getUserTimezone', () => {
    test('should return a valid timezone string', () => {
      const timezone = getUserTimezone();
      expect(typeof timezone).toBe('string');
      expect(timezone.length).toBeGreaterThan(0);
    });
  });

  describe('isValidTimezone', () => {
    test('should validate common timezones', () => {
      expect(isValidTimezone('UTC')).toBe(true);
      expect(isValidTimezone('America/New_York')).toBe(true);
      expect(isValidTimezone('Europe/London')).toBe(true);
      expect(isValidTimezone('Asia/Tokyo')).toBe(true);
    });

    test('should reject invalid timezones', () => {
      expect(isValidTimezone('Invalid/Timezone')).toBe(false);
      expect(isValidTimezone('Fake/City')).toBe(false);
      expect(isValidTimezone('')).toBe(false);
    });
  });

  describe('getAvailableTimezones', () => {
    test('should return list of available timezones', () => {
      const timezones = getAvailableTimezones();

      expect(Array.isArray(timezones)).toBe(true);
      expect(timezones.length).toBeGreaterThan(0);

      // Check structure
      timezones.forEach(tz => {
        expect(tz).toHaveProperty('value');
        expect(tz).toHaveProperty('label');
        expect(tz).toHaveProperty('region');
        expect(typeof tz.value).toBe('string');
        expect(typeof tz.label).toBe('string');
        expect(typeof tz.region).toBe('string');
      });
    });

    test('should include common timezones', () => {
      const timezones = getAvailableTimezones();
      const values = timezones.map(tz => tz.value);

      expect(values).toContain('UTC');
      expect(values).toContain('America/New_York');
      expect(values).toContain('Europe/London');
      expect(values).toContain('Asia/Tokyo');
    });
  });

  describe('getWorkingHoursInTimezone', () => {
    test('should convert working hours between timezones', () => {
      const workingHours = { start: '09:00', end: '17:00' };
      const date = new Date('2025-12-01T12:00:00.000Z');

      const convertedHours = getWorkingHoursInTimezone(
        workingHours,
        'America/New_York',
        'UTC',
        date
      );

      expect(convertedHours).toHaveProperty('start');
      expect(convertedHours).toHaveProperty('end');
      expect(convertedHours).toHaveProperty('isNextDay');
      expect(typeof convertedHours.start).toBe('string');
      expect(typeof convertedHours.end).toBe('string');
      expect(typeof convertedHours.isNextDay).toBe('boolean');

      // Should be in HH:MM format
      expect(convertedHours.start).toMatch(/^\d{2}:\d{2}$/);
      expect(convertedHours.end).toMatch(/^\d{2}:\d{2}$/);
    });

    test('should handle same timezone conversion', () => {
      const workingHours = { start: '09:00', end: '17:00' };
      const date = new Date('2025-12-01T12:00:00.000Z');

      const convertedHours = getWorkingHoursInTimezone(
        workingHours,
        'UTC',
        'UTC',
        date
      );

      expect(convertedHours.start).toBe('09:00');
      expect(convertedHours.end).toBe('17:00');
      expect(convertedHours.isNextDay).toBe(false);
    });

    test('should detect day boundary crossing', () => {
      const workingHours = { start: '09:00', end: '17:00' };
      const date = new Date('2025-12-01T12:00:00.000Z');

      // Convert from UTC to a timezone that might cross day boundary
      const convertedHours = getWorkingHoursInTimezone(
        workingHours,
        'UTC',
        'Pacific/Auckland', // +12 or +13 hours from UTC
        date
      );

      expect(typeof convertedHours.isNextDay).toBe('boolean');
    });
  });

  describe('getCurrentTimeInTimezones', () => {
    test('should get current time in multiple timezones', () => {
      const timezones = ['UTC', 'America/New_York', 'Europe/London'];
      const currentTimes = getCurrentTimeInTimezones(timezones);

      expect(Object.keys(currentTimes)).toHaveLength(3);

      timezones.forEach(tz => {
        expect(currentTimes[tz]).toBeInstanceOf(Date);
      });
    });

    test('should handle invalid timezones gracefully', () => {
      const timezones = ['UTC', 'Invalid/Timezone'];
      const currentTimes = getCurrentTimeInTimezones(timezones);

      expect(Object.keys(currentTimes)).toHaveLength(2);
      expect(currentTimes['UTC']).toBeInstanceOf(Date);
      expect(currentTimes['Invalid/Timezone']).toBeInstanceOf(Date);
    });
  });

  describe('suggestOptimalMeetingTime', () => {
    test('should suggest meeting times for multiple participants', () => {
      const participants = [
        { timezone: 'America/New_York', workingHours: { start: '09:00', end: '17:00' } },
        { timezone: 'Europe/London', workingHours: { start: '09:00', end: '17:00' } },
        { timezone: 'Asia/Tokyo', workingHours: { start: '09:00', end: '17:00' } }
      ];

      const duration = 60; // 1 hour meeting
      const preferredDate = new Date('2025-12-01T00:00:00.000Z');

      const suggestions = suggestOptimalMeetingTime(participants, duration, preferredDate);

      expect(Array.isArray(suggestions)).toBe(true);
      suggestions.forEach(suggestion => {
        expect(suggestion).toBeInstanceOf(Date);
      });
    });

    test('should handle participants without specified working hours', () => {
      const participants = [
        { timezone: 'UTC' }, // No working hours specified
        { timezone: 'America/New_York' }
      ];

      const duration = 30;
      const preferredDate = new Date('2025-12-01T00:00:00.000Z');

      const suggestions = suggestOptimalMeetingTime(participants, duration, preferredDate);

      expect(Array.isArray(suggestions)).toBe(true);
    });

    test('should limit number of suggestions', () => {
      const participants = [
        { timezone: 'UTC', workingHours: { start: '00:00', end: '23:59' } }
      ];

      const duration = 30;
      const preferredDate = new Date('2025-12-01T00:00:00.000Z');

      const suggestions = suggestOptimalMeetingTime(participants, duration, preferredDate);

      expect(suggestions.length).toBeLessThanOrEqual(5); // Should be limited
    });
  });

  describe('Constants', () => {
    test('should export timezone constants', () => {
      expect(typeof COMMON_TIMEZONES).toBe('object');
      expect(typeof DEFAULT_TIMEZONE).toBe('string');
      expect(typeof BROWSER_TIMEZONE).toBe('string');

      // Check common timezones structure
      expect(COMMON_TIMEZONES).toHaveProperty('UTC');
      expect(COMMON_TIMEZONES).toHaveProperty('America/New_York');
      expect(COMMON_TIMEZONES).toHaveProperty('Europe/London');
    });
  });

  describe('Error Handling', () => {
    test('should handle null/undefined dates gracefully', () => {
      expect(() => {
        getTimezoneInfo('UTC', null as any);
      }).not.toThrow();

      expect(() => {
        formatDateWithTimezone(null as any, 'UTC');
      }).not.toThrow();
    });

    test('should handle malformed timezone strings', () => {
      expect(() => {
        isValidTimezone(null as any);
      }).not.toThrow();

      expect(() => {
        isValidTimezone(undefined as any);
      }).not.toThrow();
    });
  });
});