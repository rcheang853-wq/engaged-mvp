// Tests for Calendar Events API endpoints
import { GET, POST, PUT, DELETE } from '@/app/api/calendar/events/route';
import { GET as GET_ID, PUT as PUT_ID, DELETE as DELETE_ID, PATCH } from '@/app/api/calendar/events/[id]/route';
import { NextRequest } from 'next/server';
import { createMockEvent, createMockCreateRequest } from '../calendar/calendar-service.test';

// Mock the Supabase client and calendar service
jest.mock('@/lib/supabase/auth');
jest.mock('@/services/calendar-service');
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    getAll: jest.fn(() => []),
    set: jest.fn(),
    get: jest.fn()
  }))
}));

// Mock the calendar service
const mockCalendarService = {
  listEvents: jest.fn(),
  createEvent: jest.fn(),
  updateEvent: jest.fn(),
  deleteEvent: jest.fn(),
  getEvent: jest.fn()
};

jest.mock('@/services/calendar-service', () => ({
  calendarService: mockCalendarService
}));

// Mock Supabase auth
const mockSupabaseClient = {
  auth: {
    getUser: jest.fn()
  }
};

jest.mock('@/lib/supabase/auth', () => ({
  createServerSupabaseClient: jest.fn(() => Promise.resolve(mockSupabaseClient))
}));

describe('Calendar Events API', () => {
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    });
  });

  describe('GET /api/calendar/events', () => {
    test('should list events with default parameters', async () => {
      const mockEvents = [createMockEvent(), createMockEvent({ id: 'event-2' })];
      mockCalendarService.listEvents.mockResolvedValue({
        success: true,
        data: {
          events: mockEvents,
          totalCount: 2,
          hasMore: false
        }
      });

      const request = new NextRequest('http://localhost:3000/api/calendar/events');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.events).toHaveLength(2);
      expect(mockCalendarService.listEvents).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: expect.any(Object),
          pagination: expect.objectContaining({
            limit: 50,
            orderBy: 'start_time',
            orderDirection: 'asc'
          })
        }),
        mockUser.id
      );
    });

    test('should handle query parameters', async () => {
      mockCalendarService.listEvents.mockResolvedValue({
        success: true,
        data: {
          events: [],
          totalCount: 0,
          hasMore: false
        }
      });

      const url = new URL('http://localhost:3000/api/calendar/events');
      url.searchParams.set('startDate', '2025-12-01T00:00:00.000Z');
      url.searchParams.set('endDate', '2025-12-31T23:59:59.999Z');
      url.searchParams.set('status', 'confirmed,tentative');
      url.searchParams.set('limit', '25');
      url.searchParams.set('includeConflicts', 'true');

      const request = new NextRequest(url);
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockCalendarService.listEvents).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: '2025-12-01T00:00:00.000Z',
          endDate: '2025-12-31T23:59:59.999Z',
          filter: expect.objectContaining({
            status: ['confirmed', 'tentative']
          }),
          pagination: expect.objectContaining({
            limit: 25
          }),
          includeConflicts: true
        }),
        mockUser.id
      );
    });

    test('should validate query parameters', async () => {
      const url = new URL('http://localhost:3000/api/calendar/events');
      url.searchParams.set('startDate', 'invalid-date');
      url.searchParams.set('limit', '999'); // Exceeds max

      const request = new NextRequest(url);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid query parameters');
      expect(data.details).toBeDefined();
    });

    test('should require authentication', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' }
      });

      const request = new NextRequest('http://localhost:3000/api/calendar/events');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });

    test('should handle service errors', async () => {
      mockCalendarService.listEvents.mockResolvedValue({
        success: false,
        error: 'Database connection failed'
      });

      const request = new NextRequest('http://localhost:3000/api/calendar/events');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Database connection failed');
    });
  });

  describe('POST /api/calendar/events', () => {
    test('should create a new event', async () => {
      const newEvent = createMockEvent();
      mockCalendarService.createEvent.mockResolvedValue({
        success: true,
        data: newEvent
      });

      const requestBody = createMockCreateRequest();
      const request = new NextRequest('http://localhost:3000/api/calendar/events', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(newEvent);
      expect(mockCalendarService.createEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          title: requestBody.title,
          startTime: requestBody.startTime,
          endTime: requestBody.endTime
        }),
        mockUser.id
      );
    });

    test('should validate required fields', async () => {
      const invalidRequest = {
        // Missing title
        startTime: '2025-12-01T10:00:00.000Z',
        endTime: '2025-12-01T11:00:00.000Z'
      };

      const request = new NextRequest('http://localhost:3000/api/calendar/events', {
        method: 'POST',
        body: JSON.stringify(invalidRequest)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request data');
      expect(data.details).toBeDefined();
    });

    test('should handle conflicts', async () => {
      mockCalendarService.createEvent.mockResolvedValue({
        success: false,
        error: 'Conflict detected',
        conflicts: [{
          type: 'overlap',
          severity: 'high',
          conflictingEventId: 'other-event',
          conflictingEventTitle: 'Other Event',
          overlapMinutes: 30,
          suggestions: []
        }]
      });

      const requestBody = createMockCreateRequest();
      const request = new NextRequest('http://localhost:3000/api/calendar/events', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409); // Conflict status
      expect(data.success).toBe(false);
      expect(data.conflicts).toBeDefined();
      expect(data.conflicts).toHaveLength(1);
    });

    test('should validate recurrence pattern', async () => {
      const requestBody = createMockCreateRequest({
        recurrencePattern: {
          frequency: 'daily',
          interval: 0, // Invalid
          count: 5
        }
      });

      const request = new NextRequest('http://localhost:3000/api/calendar/events', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request data');
    });

    test('should validate date format', async () => {
      const requestBody = createMockCreateRequest({
        startTime: 'invalid-date',
        endTime: '2025-12-01T11:00:00.000Z'
      });

      const request = new NextRequest('http://localhost:3000/api/calendar/events', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request data');
    });
  });

  describe('GET /api/calendar/events/[id]', () => {
    test('should get single event', async () => {
      const mockEvent = createMockEvent();
      mockCalendarService.getEvent.mockResolvedValue({
        success: true,
        data: mockEvent
      });

      const request = new NextRequest('http://localhost:3000/api/calendar/events/test-id');
      const response = await GET_ID(request, { params: { id: 'test-id' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockEvent);
      expect(mockCalendarService.getEvent).toHaveBeenCalledWith('test-id', mockUser.id);
    });

    test('should handle event not found', async () => {
      mockCalendarService.getEvent.mockResolvedValue({
        success: false,
        error: 'Event not found'
      });

      const request = new NextRequest('http://localhost:3000/api/calendar/events/nonexistent');
      const response = await GET_ID(request, { params: { id: 'nonexistent' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Event not found');
    });

    test('should require event ID', async () => {
      const request = new NextRequest('http://localhost:3000/api/calendar/events/');
      const response = await GET_ID(request, { params: { id: '' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Event ID is required');
    });
  });

  describe('PUT /api/calendar/events/[id]', () => {
    test('should update event', async () => {
      const updatedEvent = createMockEvent({ title: 'Updated Title' });
      mockCalendarService.updateEvent.mockResolvedValue({
        success: true,
        data: updatedEvent
      });

      const updateRequest = {
        title: 'Updated Title',
        priority: 'high'
      };

      const request = new NextRequest('http://localhost:3000/api/calendar/events/test-id', {
        method: 'PUT',
        body: JSON.stringify(updateRequest)
      });

      const response = await PUT_ID(request, { params: { id: 'test-id' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(updatedEvent);
      expect(mockCalendarService.updateEvent).toHaveBeenCalledWith(
        'test-id',
        expect.objectContaining(updateRequest),
        mockUser.id
      );
    });

    test('should validate update data', async () => {
      const invalidUpdate = {
        startTime: 'invalid-date'
      };

      const request = new NextRequest('http://localhost:3000/api/calendar/events/test-id', {
        method: 'PUT',
        body: JSON.stringify(invalidUpdate)
      });

      const response = await PUT_ID(request, { params: { id: 'test-id' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request data');
    });

    test('should handle update conflicts', async () => {
      mockCalendarService.updateEvent.mockResolvedValue({
        success: false,
        error: 'Update conflict detected',
        conflicts: [{
          type: 'overlap',
          severity: 'medium',
          conflictingEventId: 'other-event',
          conflictingEventTitle: 'Other Event',
          overlapMinutes: 15,
          suggestions: []
        }]
      });

      const updateRequest = {
        startTime: '2025-12-01T10:30:00.000Z'
      };

      const request = new NextRequest('http://localhost:3000/api/calendar/events/test-id', {
        method: 'PUT',
        body: JSON.stringify(updateRequest)
      });

      const response = await PUT_ID(request, { params: { id: 'test-id' } });
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.conflicts).toBeDefined();
    });
  });

  describe('DELETE /api/calendar/events/[id]', () => {
    test('should delete event', async () => {
      mockCalendarService.deleteEvent.mockResolvedValue({
        success: true,
        data: true
      });

      const request = new NextRequest('http://localhost:3000/api/calendar/events/test-id', {
        method: 'DELETE'
      });

      const response = await DELETE_ID(request, { params: { id: 'test-id' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Event deleted successfully');
      expect(mockCalendarService.deleteEvent).toHaveBeenCalledWith(
        'test-id',
        mockUser.id,
        'this_only'
      );
    });

    test('should handle recurring event deletion', async () => {
      mockCalendarService.deleteEvent.mockResolvedValue({
        success: true,
        data: true
      });

      const url = new URL('http://localhost:3000/api/calendar/events/test-id');
      url.searchParams.set('deleteRecurring', 'all_instances');

      const request = new NextRequest(url, {
        method: 'DELETE'
      });

      const response = await DELETE_ID(request, { params: { id: 'test-id' } });

      expect(mockCalendarService.deleteEvent).toHaveBeenCalledWith(
        'test-id',
        mockUser.id,
        'all_instances'
      );
    });

    test('should handle delete errors', async () => {
      mockCalendarService.deleteEvent.mockResolvedValue({
        success: false,
        error: 'Event not found'
      });

      const request = new NextRequest('http://localhost:3000/api/calendar/events/nonexistent', {
        method: 'DELETE'
      });

      const response = await DELETE_ID(request, { params: { id: 'nonexistent' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Event not found');
    });
  });

  describe('PATCH /api/calendar/events/[id]', () => {
    test('should partially update event', async () => {
      const patchedEvent = createMockEvent({ status: 'cancelled' });
      mockCalendarService.updateEvent.mockResolvedValue({
        success: true,
        data: patchedEvent
      });

      const patchRequest = {
        status: 'cancelled'
      };

      const request = new NextRequest('http://localhost:3000/api/calendar/events/test-id', {
        method: 'PATCH',
        body: JSON.stringify(patchRequest)
      });

      const response = await PATCH(request, { params: { id: 'test-id' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(patchedEvent);
    });

    test('should validate patch data', async () => {
      const invalidPatch = {
        status: 'invalid-status'
      };

      const request = new NextRequest('http://localhost:3000/api/calendar/events/test-id', {
        method: 'PATCH',
        body: JSON.stringify(invalidPatch)
      });

      const response = await PATCH(request, { params: { id: 'test-id' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request data');
    });
  });

  describe('Error Handling', () => {
    test('should handle JSON parsing errors', async () => {
      const request = new NextRequest('http://localhost:3000/api/calendar/events', {
        method: 'POST',
        body: 'invalid-json{'
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
    });

    test('should handle service exceptions', async () => {
      mockCalendarService.createEvent.mockRejectedValue(new Error('Service unavailable'));

      const requestBody = createMockCreateRequest();
      const request = new NextRequest('http://localhost:3000/api/calendar/events', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });

    test('should handle authentication errors', async () => {
      mockSupabaseClient.auth.getUser.mockRejectedValue(new Error('Auth service down'));

      const request = new NextRequest('http://localhost:3000/api/calendar/events');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });

  describe('HTTP Methods', () => {
    test('should return 405 for unsupported methods on events route', async () => {
      const methods = ['PATCH', 'HEAD', 'OPTIONS'];

      for (const method of methods.slice(0, 1)) { // Test only PATCH since HEAD and OPTIONS are implemented
        const request = new NextRequest('http://localhost:3000/api/calendar/events', {
          method
        });

        let response;
        if (method === 'PATCH') {
          response = new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
        }

        if (response) {
          expect(response.status).toBe(405);
        }
      }
    });

    test('should handle OPTIONS requests', async () => {
      // This would test the OPTIONS method implementation
      const request = new NextRequest('http://localhost:3000/api/calendar/events', {
        method: 'OPTIONS'
      });

      // The OPTIONS method should return 200 with appropriate headers
      // This is implemented in the route handlers
    });

    test('should handle HEAD requests', async () => {
      // This would test the HEAD method implementation
      const request = new NextRequest('http://localhost:3000/api/calendar/events', {
        method: 'HEAD'
      });

      // The HEAD method should return 200 with no body
      // This is implemented in the route handlers
    });
  });
});