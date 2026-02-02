'use client';

import React, { useState, useRef } from 'react';
import { motion, PanInfo, useMotionValue, useTransform } from 'framer-motion';
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
  // Always call hooks in the same order
  const [currentIndex, setCurrentIndex] = useState(0);
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | null>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-30, 30]);
  const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0]);
  const interestedOpacity = useTransform(x, [0, 100], [0, 1]);
  const passOpacity = useTransform(x, [-100, 0], [1, 0]);

  const currentEvent = events[currentIndex];

  const handleDragEnd = (event: any, info: PanInfo) => {
    const threshold = 100;
    const velocity = info.velocity.x;
    const offset = info.offset.x;

    if (Math.abs(velocity) >= 500 || Math.abs(offset) >= threshold) {
      const direction = offset > 0 ? 'right' : 'left';
      handleSwipe(direction);
    } else {
      // Snap back to center
      x.set(0);
    }
  };

  const handleSwipe = (direction: 'left' | 'right') => {
    if (!currentEvent) return;

    setExitDirection(direction);
    onSwipe(currentEvent.id, direction);

    // Move to next card after animation
    setTimeout(() => {
      setCurrentIndex((prev) => prev + 1);
      setExitDirection(null);
      x.set(0);
    }, 300);
  };

  const handleButtonSwipe = (direction: 'left' | 'right') => {
    if (direction === 'left') {
      x.set(-200);
    } else {
      x.set(200);
    }
    handleSwipe(direction);
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

  // Early returns after all hooks are called
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
      {/* Background cards for stack effect */}
      {events.slice(currentIndex + 1, currentIndex + 3).map((event, index) => (
        <Card
          key={event.id}
          className={cn(
            "absolute inset-0 h-96 bg-white shadow-lg",
            index === 0 ? "scale-95 z-10" : "scale-90 z-0"
          )}
          style={{
            transform: `scale(${1 - (index + 1) * 0.05}) translateY(${(index + 1) * 8}px)`,
            opacity: 1 - (index + 1) * 0.3
          }}
        />
      ))}

      {/* Main card */}
      <motion.div
        ref={(el) => (cardRefs.current[currentIndex] = el)}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        style={{ x, rotate, opacity }}
        initial={false}
        animate={exitDirection ? {
          x: exitDirection === 'right' ? 300 : -300,
          opacity: 0,
          scale: 0.8
        } : { x: 0, opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="relative z-20 cursor-grab active:cursor-grabbing"
      >
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

            {/* Swipe Indicators */}
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              style={{ opacity: interestedOpacity }}
            >
              <div className="bg-green-500 text-white px-6 py-3 rounded-full font-bold text-lg transform rotate-12">
                INTERESTED
              </div>
            </motion.div>

            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              style={{ opacity: passOpacity }}
            >
              <div className="bg-red-500 text-white px-6 py-3 rounded-full font-bold text-lg transform -rotate-12">
                PASS
              </div>
            </motion.div>
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
      </motion.div>

      {/* Action Buttons */}
      <div className="flex justify-center items-center space-x-4 mt-6">
        <Button
          variant="outline"
          size="lg"
          className="w-14 h-14 rounded-full border-2 border-red-200 hover:border-red-300 hover:bg-red-50"
          onClick={() => handleButtonSwipe('left')}
        >
          <X className="w-6 h-6 text-red-500" />
        </Button>

        <Button
          variant="outline"
          size="lg"
          className="w-14 h-14 rounded-full border-2 border-green-200 hover:border-green-300 hover:bg-green-50"
          onClick={() => handleButtonSwipe('right')}
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