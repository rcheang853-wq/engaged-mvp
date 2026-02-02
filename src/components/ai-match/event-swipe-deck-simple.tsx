'use client';

import React, { useState } from 'react';
import { Heart, X, MapPin, Calendar, Clock, DollarSign, Users, Star, BookmarkPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Event {
  id: string;
  title: string;
  description?: string;
  date: string;
  time?: string;
  location: string;
  venue?: string;
  price: number;
  category: string;
  tags: string[];
  imageUrl?: string;
  organizer: string;
  attendeesCount?: number;
  maxAttendees?: number;
}

interface EventSwipeDeckProps {
  events: Event[];
  onSwipe: (eventId: string, direction: 'left' | 'right') => void;
  isLoading?: boolean;
  getEventScore?: (eventId: string) => number;
  className?: string;
}

export function EventSwipeDeck({
  events,
  onSwipe,
  isLoading = false,
  getEventScore,
  className
}: EventSwipeDeckProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentEvent = events[currentIndex];

  const handleSwipe = (direction: 'left' | 'right') => {
    if (!currentEvent) return;

    onSwipe(currentEvent.id, direction);
    setCurrentIndex((prev) => prev + 1);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatPrice = (price: number) => {
    if (price === 0) return 'Free';
    return `HK$${price}`;
  };

  if (isLoading) {
    return (
      <div className={cn("w-full max-w-sm mx-auto", className)}>
        <Card className="h-96 animate-pulse">
          <CardContent className="p-6 h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-32 mx-auto mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-24 mx-auto"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentEvent || currentIndex >= events.length) {
    return (
      <div className={cn("w-full max-w-sm mx-auto", className)}>
        <Card className="h-96">
          <CardContent className="p-6 h-full flex items-center justify-center text-center">
            <div>
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No more events
              </h3>
              <p className="text-gray-600 mb-4">
                You've seen all recommended events! Check back later for new recommendations.
              </p>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const eventScore = getEventScore ? getEventScore(currentEvent.id) : Math.floor(Math.random() * 30) + 70;

  return (
    <div className={cn("w-full max-w-sm mx-auto relative", className)}>
      {/* Main card */}
      <Card className="h-96 overflow-hidden shadow-xl">
        <div className="relative h-48 bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500">
          {currentEvent.imageUrl ? (
            <img
              src={currentEvent.imageUrl}
              alt={currentEvent.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white">
              <div className="text-center">
                <Calendar className="w-16 h-16 mx-auto mb-2 text-white/80" />
                <div className="text-lg font-semibold">{currentEvent.category}</div>
              </div>
            </div>
          )}

          {/* Event Score Badge */}
          <div className="absolute top-4 right-4">
            <Badge className="bg-white/90 text-blue-700 font-semibold">
              <Star className="w-3 h-3 mr-1" />
              {eventScore}% Match
            </Badge>
          </div>

          {/* Price Badge */}
          <div className="absolute top-4 left-4">
            <Badge className={cn(
              "font-semibold",
              currentEvent.price === 0
                ? "bg-green-500 text-white"
                : "bg-white/90 text-gray-700"
            )}>
              {formatPrice(currentEvent.price)}
            </Badge>
          </div>
        </div>

        <CardContent className="p-4 space-y-3">
          <div>
            <h3 className="text-lg font-bold text-gray-900 line-clamp-2">
              {currentEvent.title}
            </h3>
            <p className="text-sm text-gray-600 line-clamp-1">
              by {currentEvent.organizer}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center text-gray-600 text-sm">
              <Calendar className="w-4 h-4 mr-2" />
              {formatDate(currentEvent.date)}
              {currentEvent.time && (
                <>
                  <Clock className="w-4 h-4 ml-3 mr-1" />
                  {currentEvent.time}
                </>
              )}
            </div>

            <div className="flex items-center text-gray-600 text-sm">
              <MapPin className="w-4 h-4 mr-2" />
              <span className="line-clamp-1">{currentEvent.location}</span>
            </div>

            {currentEvent.attendeesCount !== undefined && (
              <div className="flex items-center text-gray-600 text-sm">
                <Users className="w-4 h-4 mr-2" />
                {currentEvent.attendeesCount}
                {currentEvent.maxAttendees && ` / ${currentEvent.maxAttendees}`} attending
              </div>
            )}
          </div>

          {currentEvent.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {currentEvent.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {currentEvent.tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{currentEvent.tags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-center items-center space-x-4 mt-6">
        <Button
          variant="outline"
          size="lg"
          className="w-14 h-14 rounded-full border-2 border-red-200 hover:border-red-300 hover:bg-red-50"
          onClick={() => handleSwipe('left')}
        >
          <X className="w-6 h-6 text-red-500" />
        </Button>

        <Button
          variant="outline"
          size="lg"
          className="w-14 h-14 rounded-full border-2 border-green-200 hover:border-green-300 hover:bg-green-50"
          onClick={() => handleSwipe('right')}
        >
          <BookmarkPlus className="w-6 h-6 text-green-500" />
        </Button>
      </div>

      {/* Progress Indicator */}
      <div className="mt-4 text-center text-sm text-gray-500">
        {currentIndex + 1} of {events.length}
      </div>
    </div>
  );
}