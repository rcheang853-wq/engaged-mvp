import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { format } from 'date-fns';
import { Event } from '@/types';

// Import individual components for unit testing
import EventCard from '@/components/calendar/event-card';
import CalendarNavigation from '@/components/calendar/calendar-navigation';

// Simple mock event data
const mockEvent: Event = {
  id: '1',
  title: 'Test Event',
  description: 'This is a test event',
  shortDescription: 'Test event',
  startTime: new Date('2024-01-15T10:00:00Z'),
  endTime: new Date('2024-01-15T11:00:00Z'),
  timezone: 'UTC',
  allDay: false,
  venue: {
    id: 'venue1',
    name: 'Test Venue',
    address: '123 Test St',
    city: 'Test City',
    latitude: 40.7128,
    longitude: -74.0060,
  },
  organizer: {
    id: 'org1',
    organizationName: 'Test Organizer',
    isVerified: true,
    logoUrl: 'https://example.com/logo.png',
  },
  category: {
    id: 'cat1',
    name: 'Test Category',
    slug: 'test-category',
    icon: 'test-icon',
    color: '#3B82F6',
  },
  posterUrl: 'https://example.com/poster.jpg',
  galleryUrls: [],
  tags: ['test', 'event'],
  isFree: false,
  priceRange: [10, 50],
  ticketUrl: 'https://example.com/tickets',
  registrationRequired: true,
  capacity: 100,
  popularityScore: 85,
  qualityScore: 90,
  status: 'published',
  isFeatured: true,
  isTrending: false,
  sourceUrl: 'https://example.com/event',
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  publishedAt: new Date('2024-01-01T00:00:00Z'),
};

describe('EventCard Component', () => {
  test('renders event card with basic information', () => {
    render(<EventCard event={mockEvent} />);

    // Check if title is rendered
    expect(screen.getByText('Test Event')).toBeDefined();

    // Check if venue information is rendered
    expect(screen.getByText(/Test Venue, Test City/)).toBeDefined();

    // Check if organizer is rendered
    expect(screen.getByText('Test Organizer')).toBeDefined();
  });

  test('renders compact variant correctly', () => {
    render(<EventCard event={mockEvent} variant="compact" />);

    expect(screen.getByText('Test Event')).toBeDefined();
    expect(screen.getByText(/Test Venue, Test City/)).toBeDefined();
  });

  test('renders minimal variant correctly', () => {
    render(<EventCard event={mockEvent} variant="minimal" />);

    expect(screen.getByText('Test Event')).toBeDefined();
    // Minimal variant should show time (could vary based on timezone)
    const timeRegex = /\d{1,2}:\d{2} [AP]M - \d{1,2}:\d{2} [AP]M/;
    expect(screen.getByText(timeRegex)).toBeDefined();
  });

  test('handles click events when onClick is provided', () => {
    const mockOnClick = jest.fn();
    render(<EventCard event={mockEvent} onClick={mockOnClick} />);

    const eventElement = screen.getByText('Test Event');
    fireEvent.click(eventElement);

    expect(mockOnClick).toHaveBeenCalledWith(mockEvent);
  });

  test('displays price information for paid events', () => {
    render(<EventCard event={mockEvent} />);

    expect(screen.getByText('$10 - $50')).toBeDefined();
  });

  test('displays free event correctly', () => {
    const freeEvent = { ...mockEvent, isFree: true };
    render(<EventCard event={freeEvent} />);

    expect(screen.getByText('Free')).toBeDefined();
  });

  test('shows featured badge for featured events', () => {
    render(<EventCard event={mockEvent} />);

    expect(screen.getByText('Featured')).toBeDefined();
  });
});

describe('CalendarNavigation Component', () => {
  const mockProps = {
    currentDate: new Date('2024-01-15'),
    view: 'month' as const,
    onDateChange: jest.fn(),
    onViewChange: jest.fn(),
    onToday: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders navigation with correct date', () => {
    render(<CalendarNavigation {...mockProps} />);

    expect(screen.getByText('January 2024')).toBeDefined();
  });

  test('renders all view options', () => {
    render(<CalendarNavigation {...mockProps} />);

    expect(screen.getByText('Month')).toBeDefined();
    expect(screen.getByText('Week')).toBeDefined();
    expect(screen.getByText('Day')).toBeDefined();
    expect(screen.getByText('Agenda')).toBeDefined();
  });

  test('renders today button', () => {
    render(<CalendarNavigation {...mockProps} />);

    expect(screen.getByText('Today')).toBeDefined();
  });

  test('calls onViewChange when view button is clicked', () => {
    render(<CalendarNavigation {...mockProps} />);

    fireEvent.click(screen.getByText('Week'));
    expect(mockProps.onViewChange).toHaveBeenCalledWith('week');
  });

  test('calls onToday when today button is clicked', () => {
    render(<CalendarNavigation {...mockProps} />);

    fireEvent.click(screen.getByText('Today'));
    expect(mockProps.onToday).toHaveBeenCalled();
  });

  test('displays week range for week view', () => {
    const weekProps = { ...mockProps, view: 'week' as const };
    render(<CalendarNavigation {...weekProps} />);

    // Week view should show a date range
    const dateText = screen.getByRole('heading', { level: 1 }).textContent;
    expect(dateText).toMatch(/Jan \d+ - Jan \d+, 2024/);
  });

  test('displays full date for day view', () => {
    const dayProps = { ...mockProps, view: 'day' as const };
    render(<CalendarNavigation {...dayProps} />);

    expect(screen.getByText('Monday, January 15, 2024')).toBeDefined();
  });
});

describe('Calendar Component Integration', () => {
  test('components can be imported successfully', () => {
    // Test that all components can be imported
    expect(EventCard).toBeDefined();
    expect(CalendarNavigation).toBeDefined();
  });

  test('event data structure is valid', () => {
    // Test that our mock event has all required fields
    expect(mockEvent.id).toBeDefined();
    expect(mockEvent.title).toBeDefined();
    expect(mockEvent.startTime).toBeInstanceOf(Date);
    expect(mockEvent.endTime).toBeInstanceOf(Date);
    expect(mockEvent.timezone).toBeDefined();
    expect(typeof mockEvent.allDay).toBe('boolean');
  });

  test('date formatting works correctly', () => {
    const testDate = new Date('2024-01-15T10:00:00Z');
    const formattedDate = format(testDate, 'MMMM yyyy');
    expect(formattedDate).toBe('January 2024');
  });
});

describe('Component Props and API', () => {
  test('EventCard accepts all expected props', () => {
    const props = {
      event: mockEvent,
      variant: 'compact' as const,
      showActions: true,
      className: 'test-class',
      onClick: jest.fn(),
    };

    render(<EventCard {...props} />);
    expect(screen.getByText('Test Event')).toBeDefined();
  });

  test('CalendarNavigation accepts all expected props', () => {
    const props = {
      currentDate: new Date(),
      view: 'month' as const,
      onDateChange: jest.fn(),
      onViewChange: jest.fn(),
      onToday: jest.fn(),
      className: 'test-class',
    };

    render(<CalendarNavigation {...props} />);
    expect(screen.getByText('Today')).toBeDefined();
  });
});

// Test component accessibility basics
describe('Accessibility', () => {
  test('navigation buttons have proper labels', () => {
    render(<CalendarNavigation {...{
      currentDate: new Date('2024-01-15'),
      view: 'month' as const,
      onDateChange: jest.fn(),
      onViewChange: jest.fn(),
      onToday: jest.fn(),
    }} />);

    // Check that navigation buttons exist
    const todayButton = screen.getByText('Today');
    expect(todayButton).toBeDefined();
  });

  test('event cards can be interacted with', () => {
    const mockOnClick = jest.fn();
    render(<EventCard event={mockEvent} onClick={mockOnClick} />);

    const eventCard = screen.getByText('Test Event');
    expect(eventCard).toBeDefined();

    fireEvent.click(eventCard);
    expect(mockOnClick).toHaveBeenCalled();
  });
});

export { mockEvent };