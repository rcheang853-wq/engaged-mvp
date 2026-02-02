'use client';

import React, { useState, useRef } from 'react';
import { motion, PanInfo, useMotionValue, useTransform } from 'framer-motion';
import { Heart, X, MapPin, Calendar, Users, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface User {
  id: string;
  fullName?: string;
  email: string;
  avatar?: string;
  bio?: string;
  age?: number;
  location?: string;
  interests: string[];
  recentEvents: string[];
  eventPreferences: string[];
  profilePicture?: string;
}

interface SwipeDeckProps {
  users: User[];
  onSwipe: (userId: string, direction: 'left' | 'right') => void;
  isLoading?: boolean;
  getMatchingScore?: (userId: string) => number;
  className?: string;
}

export function SwipeDeck({
  users,
  onSwipe,
  isLoading = false,
  getMatchingScore,
  className
}: SwipeDeckProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | null>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const currentUser = users[currentIndex];
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-30, 30]);
  const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0]);

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
    if (!currentUser) return;

    setExitDirection(direction);
    onSwipe(currentUser.id, direction);

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

  if (!currentUser || currentIndex >= users.length) {
    return (
      <div className={cn("w-full max-w-sm mx-auto", className)}>
        <Card className="h-96">
          <CardContent className="p-6 h-full flex items-center justify-center text-center">
            <div>
              <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No more profiles
              </h3>
              <p className="text-gray-600 mb-4">
                You've seen all available matches! Check back later for new people.
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

  const matchingScore = getMatchingScore ? getMatchingScore(currentUser.id) : Math.floor(Math.random() * 40) + 60;

  return (
    <div className={cn("w-full max-w-sm mx-auto relative", className)}>
      {/* Background cards for stack effect */}
      {users.slice(currentIndex + 1, currentIndex + 3).map((user, index) => (
        <Card
          key={user.id}
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
          <div className="relative h-48 bg-gradient-to-br from-purple-400 via-pink-500 to-red-500">
            {currentUser.profilePicture ? (
              <img
                src={currentUser.profilePicture}
                alt={currentUser.fullName || 'Profile'}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white">
                <div className="text-center">
                  <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-2 mx-auto">
                    <span className="text-2xl font-bold">
                      {currentUser.fullName?.[0] || currentUser.email[0].toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Match Score Badge */}
            <div className="absolute top-4 right-4">
              <Badge className="bg-white/90 text-purple-700 font-semibold">
                <Star className="w-3 h-3 mr-1" />
                {matchingScore}% Match
              </Badge>
            </div>

            {/* Swipe Indicators */}
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              style={{ opacity: useTransform(x, [0, 100], [0, 1]) }}
            >
              <div className="bg-green-500 text-white px-6 py-3 rounded-full font-bold text-lg transform rotate-12">
                LIKE
              </div>
            </motion.div>

            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              style={{ opacity: useTransform(x, [-100, 0], [1, 0]) }}
            >
              <div className="bg-red-500 text-white px-6 py-3 rounded-full font-bold text-lg transform -rotate-12">
                PASS
              </div>
            </motion.div>
          </div>

          <CardContent className="p-6 space-y-4">
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                {currentUser.fullName || 'Anonymous User'}
                {currentUser.age && <span className="text-gray-600 font-normal">, {currentUser.age}</span>}
              </h3>
              {currentUser.location && (
                <div className="flex items-center text-gray-600 text-sm mt-1">
                  <MapPin className="w-4 h-4 mr-1" />
                  {currentUser.location}
                </div>
              )}
            </div>

            {currentUser.bio && (
              <p className="text-gray-700 text-sm line-clamp-2">
                {currentUser.bio}
              </p>
            )}

            {currentUser.interests.length > 0 && (
              <div>
                <div className="flex flex-wrap gap-1">
                  {currentUser.interests.slice(0, 3).map((interest) => (
                    <Badge key={interest} variant="secondary" className="text-xs">
                      {interest}
                    </Badge>
                  ))}
                  {currentUser.interests.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{currentUser.interests.length - 3} more
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {currentUser.recentEvents.length > 0 && (
              <div className="flex items-center text-gray-600 text-sm">
                <Calendar className="w-4 h-4 mr-1" />
                Recently attended {currentUser.recentEvents.length} events
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
          <Heart className="w-6 h-6 text-green-500" />
        </Button>
      </div>

      {/* Progress Indicator */}
      <div className="mt-4 text-center text-sm text-gray-500">
        {currentIndex + 1} of {users.length}
      </div>
    </div>
  );
}