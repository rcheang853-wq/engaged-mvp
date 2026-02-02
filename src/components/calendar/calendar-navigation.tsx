'use client';

import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  RotateCcw,
  Settings
} from 'lucide-react';
import { format, addMonths, addWeeks, addDays, subMonths, subWeeks, subDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type CalendarView = 'month' | 'week' | 'day' | 'agenda';

interface CalendarNavigationProps {
  currentDate: Date;
  view: CalendarView;
  onDateChange: (date: Date) => void;
  onViewChange: (view: CalendarView) => void;
  onToday: () => void;
  className?: string;
}

export const CalendarNavigation: React.FC<CalendarNavigationProps> = ({
  currentDate,
  view,
  onDateChange,
  onViewChange,
  onToday,
  className,
}) => {
  const navigatePrevious = () => {
    switch (view) {
      case 'month':
        onDateChange(subMonths(currentDate, 1));
        break;
      case 'week':
        onDateChange(subWeeks(currentDate, 1));
        break;
      case 'day':
        onDateChange(subDays(currentDate, 1));
        break;
      case 'agenda':
        onDateChange(subWeeks(currentDate, 1));
        break;
    }
  };

  const navigateNext = () => {
    switch (view) {
      case 'month':
        onDateChange(addMonths(currentDate, 1));
        break;
      case 'week':
        onDateChange(addWeeks(currentDate, 1));
        break;
      case 'day':
        onDateChange(addDays(currentDate, 1));
        break;
      case 'agenda':
        onDateChange(addWeeks(currentDate, 1));
        break;
    }
  };

  const getDateRangeDisplay = () => {
    switch (view) {
      case 'month':
        return format(currentDate, 'MMMM yyyy');
      case 'week':
        const weekStart = new Date(currentDate);
        const weekEnd = addDays(weekStart, 6);
        return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
      case 'day':
        return format(currentDate, 'EEEE, MMMM d, yyyy');
      case 'agenda':
        return format(currentDate, 'MMMM yyyy');
      default:
        return format(currentDate, 'MMMM yyyy');
    }
  };

  const viewButtons: { key: CalendarView; label: string }[] = [
    { key: 'month', label: 'Month' },
    { key: 'week', label: 'Week' },
    { key: 'day', label: 'Day' },
    { key: 'agenda', label: 'Agenda' },
  ];

  return (
    <div className={cn('flex items-center justify-between bg-white border-b border-gray-200 px-4 py-3', className)}>
      {/* Left section - Navigation controls */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-1">
          <Button
            variant="outline"
            size="icon"
            onClick={navigatePrevious}
            className="h-8 w-8"
            aria-label="Previous period"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={navigateNext}
            className="h-8 w-8"
            aria-label="Next period"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <Button
          variant="outline"
          onClick={onToday}
          className="flex items-center space-x-2 h-8"
          aria-label="Go to today"
        >
          <RotateCcw className="h-3 w-3" />
          <span className="hidden sm:inline">Today</span>
        </Button>

        <div className="hidden sm:block w-px h-6 bg-gray-300" />

        <h1 className="text-lg font-semibold text-gray-900 min-w-0">
          {getDateRangeDisplay()}
        </h1>
      </div>

      {/* Right section - View controls */}
      <div className="flex items-center space-x-4">
        {/* View selector */}
        <div className="flex items-center bg-gray-100 rounded-lg p-1">
          {viewButtons.map((viewButton) => (
            <Button
              key={viewButton.key}
              variant={view === viewButton.key ? "default" : "ghost"}
              size="sm"
              onClick={() => onViewChange(viewButton.key)}
              className={cn(
                'h-7 px-3 text-xs font-medium transition-colors',
                view === viewButton.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              )}
            >
              {viewButton.label}
            </Button>
          ))}
        </div>

        <div className="hidden sm:block w-px h-6 bg-gray-300" />

        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          aria-label="Calendar settings"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

// Responsive mobile navigation component
export const MobileCalendarNavigation: React.FC<CalendarNavigationProps> = ({
  currentDate,
  view,
  onDateChange,
  onViewChange,
  onToday,
  className,
}) => {
  const navigatePrevious = () => {
    switch (view) {
      case 'month':
        onDateChange(subMonths(currentDate, 1));
        break;
      case 'week':
        onDateChange(subWeeks(currentDate, 1));
        break;
      case 'day':
        onDateChange(subDays(currentDate, 1));
        break;
      case 'agenda':
        onDateChange(subWeeks(currentDate, 1));
        break;
    }
  };

  const navigateNext = () => {
    switch (view) {
      case 'month':
        onDateChange(addMonths(currentDate, 1));
        break;
      case 'week':
        onDateChange(addWeeks(currentDate, 1));
        break;
      case 'day':
        onDateChange(addDays(currentDate, 1));
        break;
      case 'agenda':
        onDateChange(addWeeks(currentDate, 1));
        break;
    }
  };

  const getDateRangeDisplay = () => {
    switch (view) {
      case 'month':
        return format(currentDate, 'MMM yyyy');
      case 'week':
        const weekStart = new Date(currentDate);
        const weekEnd = addDays(weekStart, 6);
        return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'd')}`;
      case 'day':
        return format(currentDate, 'MMM d, yyyy');
      case 'agenda':
        return format(currentDate, 'MMM yyyy');
      default:
        return format(currentDate, 'MMM yyyy');
    }
  };

  const viewButtons: { key: CalendarView; label: string; icon: React.ReactNode }[] = [
    { key: 'month', label: 'Month', icon: <CalendarIcon className="h-4 w-4" /> },
    { key: 'week', label: 'Week', icon: <CalendarIcon className="h-4 w-4" /> },
    { key: 'day', label: 'Day', icon: <CalendarIcon className="h-4 w-4" /> },
    { key: 'agenda', label: 'List', icon: <CalendarIcon className="h-4 w-4" /> },
  ];

  return (
    <div className={cn('bg-white border-b border-gray-200', className)}>
      {/* Top row - Date navigation */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="icon"
            onClick={navigatePrevious}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-base font-semibold text-gray-900">
            {getDateRangeDisplay()}
          </h1>
          <Button
            variant="outline"
            size="icon"
            onClick={navigateNext}
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onToday}
          className="flex items-center space-x-1 h-8"
        >
          <RotateCcw className="h-3 w-3" />
          <span>Today</span>
        </Button>
      </div>

      {/* Bottom row - View selector */}
      <div className="flex items-center justify-center px-4 pb-3">
        <div className="grid grid-cols-4 gap-1 bg-gray-100 rounded-lg p-1 w-full max-w-sm">
          {viewButtons.map((viewButton) => (
            <Button
              key={viewButton.key}
              variant={view === viewButton.key ? "default" : "ghost"}
              size="sm"
              onClick={() => onViewChange(viewButton.key)}
              className={cn(
                'h-8 flex items-center justify-center text-xs font-medium transition-colors',
                view === viewButton.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              )}
            >
              <span className="sm:hidden">{viewButton.icon}</span>
              <span className="hidden sm:inline">{viewButton.label}</span>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CalendarNavigation;