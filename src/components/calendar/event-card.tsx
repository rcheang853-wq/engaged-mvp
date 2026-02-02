'use client';

import React from 'react';
import { format } from 'date-fns';
import { Clock, MapPin, User, Star, Badge, ExternalLink } from 'lucide-react';
import { Event } from '@/types';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface EventCardProps {
  event: Event;
  variant?: 'default' | 'compact' | 'minimal';
  showActions?: boolean;
  className?: string;
  onClick?: ((event: Event) => void) | undefined;
}

export const EventCard: React.FC<EventCardProps> = ({
  event,
  variant = 'default',
  showActions = false,
  className,
  onClick,
}) => {
  const formatEventTime = (start: Date, end: Date, allDay: boolean) => {
    if (allDay) {
      return 'All day';
    }
    return `${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}`;
  };

  const formatEventDate = (date: Date) => {
    return format(date, 'MMM d, yyyy');
  };

  const getLocationDisplay = (event: Event) => {
    if (event.venue) {
      return `${event.venue.name}, ${event.venue.city}`;
    }
    return event.customLocation || 'Location TBD';
  };

  const handleClick = () => {
    if (onClick) {
      onClick(event);
    }
  };

  const handleExternalClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (event.ticketUrl) {
      window.open(event.ticketUrl, '_blank');
    }
  };

  if (variant === 'minimal') {
    return (
      <div
        className={cn(
          'p-2 border-l-4 border-blue-500 bg-blue-50 hover:bg-blue-100 cursor-pointer transition-colors',
          className
        )}
        onClick={handleClick}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {event.title}
            </p>
            <p className="text-xs text-gray-500">
              {formatEventTime(event.startTime, event.endTime, event.allDay)}
            </p>
          </div>
          {event.isFeatured && (
            <Star className="h-4 w-4 text-yellow-500 ml-2 flex-shrink-0" />
          )}
        </div>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <Card
        className={cn(
          'p-3 hover:shadow-md transition-shadow cursor-pointer',
          className
        )}
        onClick={handleClick}
      >
        <div className="flex items-start space-x-3">
          {event.posterUrl && (
            <img
              src={event.posterUrl}
              alt={event.title}
              className="w-12 h-12 object-cover rounded-md flex-shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-semibold text-gray-900 truncate">
                {event.title}
              </h3>
              {event.isFeatured && (
                <Star className="h-4 w-4 text-yellow-500 flex-shrink-0" />
              )}
            </div>
            <div className="flex items-center text-xs text-gray-500 mt-1">
              <Clock className="h-3 w-3 mr-1" />
              {formatEventTime(event.startTime, event.endTime, event.allDay)}
            </div>
            <div className="flex items-center text-xs text-gray-500 mt-1">
              <MapPin className="h-3 w-3 mr-1" />
              <span className="truncate">{getLocationDisplay(event)}</span>
            </div>
          </div>
          <div className="flex flex-col items-end space-y-1">
            {event.category && (
              <span
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: `${event.category.color}20`,
                  color: event.category.color,
                }}
              >
                {event.category.name}
              </span>
            )}
            {event.isFree ? (
              <span className="text-xs font-medium text-green-600">Free</span>
            ) : (
              <span className="text-xs text-gray-500">
                ${event.priceRange[0]} - ${event.priceRange[1]}
              </span>
            )}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        'overflow-hidden hover:shadow-lg transition-shadow cursor-pointer',
        className
      )}
      onClick={handleClick}
    >
      {event.posterUrl && (
        <div className="aspect-video relative">
          <img
            src={event.posterUrl}
            alt={event.title}
            className="w-full h-full object-cover"
          />
          {event.isFeatured && (
            <div className="absolute top-2 left-2">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                <Star className="h-3 w-3 mr-1" />
                Featured
              </span>
            </div>
          )}
          {event.isTrending && (
            <div className="absolute top-2 right-2">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                Trending
              </span>
            </div>
          )}
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {event.title}
            </h3>

            {event.shortDescription && (
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                {event.shortDescription}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center text-sm text-gray-500">
            <Clock className="h-4 w-4 mr-2" />
            <span>
              {formatEventDate(event.startTime)} • {formatEventTime(event.startTime, event.endTime, event.allDay)}
            </span>
          </div>

          <div className="flex items-center text-sm text-gray-500">
            <MapPin className="h-4 w-4 mr-2" />
            <span className="truncate">{getLocationDisplay(event)}</span>
          </div>

          {event.organizer && (
            <div className="flex items-center text-sm text-gray-500">
              <User className="h-4 w-4 mr-2" />
              <span className="flex items-center">
                {event.organizer.organizationName}
                {event.organizer.isVerified && (
                  <Badge className="h-3 w-3 ml-1 text-blue-500" />
                )}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center space-x-2">
            {event.category && (
              <span
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: `${event.category.color}20`,
                  color: event.category.color,
                }}
              >
                {event.category.name}
              </span>
            )}
            {event.isFree ? (
              <span className="text-sm font-semibold text-green-600">Free</span>
            ) : (
              <span className="text-sm font-semibold text-gray-900">
                ${event.priceRange[0]} - ${event.priceRange[1]}
              </span>
            )}
          </div>

          {showActions && (
            <div className="flex items-center space-x-2">
              {event.ticketUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExternalClick}
                  className="flex items-center"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Tickets
                </Button>
              )}
            </div>
          )}
        </div>

        {event.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {event.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded"
              >
                {tag}
              </span>
            ))}
            {event.tags.length > 3 && (
              <span className="text-xs text-gray-500">
                +{event.tags.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

export default EventCard;