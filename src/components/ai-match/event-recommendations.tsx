'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Clock,
  MapPin,
  DollarSign,
  Users,
  Star,
  Heart,
  ExternalLink,
  Filter,
  Grid,
  List,
  Bookmark,
  Share2
} from 'lucide-react';
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

interface EventRecommendationsProps {
  events: Event[];
  title?: string;
  emptyMessage?: string;
  showFilters?: boolean;
  viewMode?: 'grid' | 'list';
  onEventClick?: (event: Event) => void;
  onBookmark?: (eventId: string) => void;
  onShare?: (event: Event) => void;
  className?: string;
}

export function EventRecommendations({
  events,
  title = "Recommended Events",
  emptyMessage = "No events found. Try adjusting your preferences!",
  showFilters = true,
  viewMode: initialViewMode = 'grid',
  onEventClick,
  onBookmark,
  onShare,
  className
}: EventRecommendationsProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(initialViewMode);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'price' | 'popularity'>('date');

  const categories = ['all', ...Array.from(new Set(events.map(event => event.category)))];

  const filteredEvents = events
    .filter(event => filterCategory === 'all' || event.category === filterCategory)
    .sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case 'price':
          return a.price - b.price;
        case 'popularity':
          return (b.attendeesCount || 0) - (a.attendeesCount || 0);
        default:
          return 0;
      }
    });

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

  if (events.length === 0) {
    return (
      <div className={cn("text-center py-12", className)}>
        <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No Events Found
        </h3>
        <p className="text-gray-600 max-w-md mx-auto">
          {emptyMessage}
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          <p className="text-gray-600">{filteredEvents.length} events found</p>
        </div>

        <div className="flex items-center space-x-2">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="px-3"
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="px-3"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center gap-4 p-4 bg-gray-50 rounded-lg"
        >
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filters:</span>
          </div>

          {/* Category Filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {categories.map(category => (
              <option key={category} value={category}>
                {category === 'all' ? 'All Categories' : category}
              </option>
            ))}
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="date">Sort by Date</option>
            <option value="price">Sort by Price</option>
            <option value="popularity">Sort by Popularity</option>
          </select>
        </motion.div>
      )}

      {/* Events Grid/List */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${viewMode}-${filterCategory}-${sortBy}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className={cn(
            viewMode === 'grid'
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              : "space-y-4"
          )}
        >
          {filteredEvents.map((event, index) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              {viewMode === 'grid' ? (
                <EventCard
                  event={event}
                  onEventClick={onEventClick}
                  onBookmark={onBookmark}
                  onShare={onShare}
                  formatDate={formatDate}
                  formatPrice={formatPrice}
                />
              ) : (
                <EventListItem
                  event={event}
                  onEventClick={onEventClick}
                  onBookmark={onBookmark}
                  onShare={onShare}
                  formatDate={formatDate}
                  formatPrice={formatPrice}
                />
              )}
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

interface EventItemProps {
  event: Event;
  onEventClick?: (event: Event) => void;
  onBookmark?: (eventId: string) => void;
  onShare?: (event: Event) => void;
  formatDate: (date: string) => string;
  formatPrice: (price: number) => string;
}

function EventCard({ event, onEventClick, onBookmark, onShare, formatDate, formatPrice }: EventItemProps) {
  return (
    <Card className="group hover:shadow-lg transition-shadow cursor-pointer overflow-hidden">
      <div
        className="relative h-48 bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500"
        onClick={() => onEventClick?.(event)}
      >
        {event.imageUrl ? (
          <img
            src={event.imageUrl}
            alt={event.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white">
            <div className="text-center">
              <Calendar className="w-16 h-16 mx-auto mb-2 text-white/80" />
              <div className="text-lg font-semibold">{event.category}</div>
            </div>
          </div>
        )}

        {/* Price Badge */}
        <div className="absolute top-3 left-3">
          <Badge className={cn(
            "font-semibold",
            event.price === 0
              ? "bg-green-500 text-white"
              : "bg-white/90 text-gray-700"
          )}>
            {formatPrice(event.price)}
          </Badge>
        </div>

        {/* Action Buttons */}
        <div className="absolute top-3 right-3 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {onBookmark && (
            <Button
              size="sm"
              variant="secondary"
              className="w-8 h-8 p-0"
              onClick={(e) => {
                e.stopPropagation();
                onBookmark(event.id);
              }}
            >
              <Bookmark className="w-4 h-4" />
            </Button>
          )}
          {onShare && (
            <Button
              size="sm"
              variant="secondary"
              className="w-8 h-8 p-0"
              onClick={(e) => {
                e.stopPropagation();
                onShare(event);
              }}
            >
              <Share2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      <CardContent className="p-4 space-y-3">
        <div>
          <h3 className="text-lg font-bold text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
            {event.title}
          </h3>
          <p className="text-sm text-gray-600 line-clamp-1">
            by {event.organizer}
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center text-gray-600 text-sm">
            <Calendar className="w-4 h-4 mr-2" />
            {formatDate(event.date)}
            {event.time && (
              <>
                <Clock className="w-4 h-4 ml-3 mr-1" />
                {event.time}
              </>
            )}
          </div>

          <div className="flex items-center text-gray-600 text-sm">
            <MapPin className="w-4 h-4 mr-2" />
            <span className="line-clamp-1">{event.location}</span>
          </div>

          {event.attendeesCount !== undefined && (
            <div className="flex items-center text-gray-600 text-sm">
              <Users className="w-4 h-4 mr-2" />
              {event.attendeesCount}
              {event.maxAttendees && ` / ${event.maxAttendees}`} attending
            </div>
          )}
        </div>

        {event.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {event.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {event.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{event.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        <Button
          className="w-full"
          onClick={(e) => {
            e.stopPropagation();
            onEventClick?.(event);
          }}
        >
          View Details
          <ExternalLink className="w-4 h-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
}

function EventListItem({ event, onEventClick, onBookmark, onShare, formatDate, formatPrice }: EventItemProps) {
  return (
    <Card className="group hover:shadow-md transition-shadow cursor-pointer">
      <CardContent className="p-4">
        <div className="flex items-start space-x-4">
          {/* Event Image/Icon */}
          <div className="w-16 h-16 bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 rounded-lg flex-shrink-0 flex items-center justify-center">
            {event.imageUrl ? (
              <img
                src={event.imageUrl}
                alt={event.title}
                className="w-full h-full object-cover rounded-lg"
              />
            ) : (
              <Calendar className="w-8 h-8 text-white" />
            )}
          </div>

          {/* Event Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-gray-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
                  {event.title}
                </h3>
                <p className="text-sm text-gray-600 mb-2">by {event.organizer}</p>

                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-2">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    {formatDate(event.date)}
                  </div>
                  {event.time && (
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      {event.time}
                    </div>
                  )}
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-1" />
                    <span className="truncate max-w-32">{event.location}</span>
                  </div>
                  <div className="flex items-center">
                    <DollarSign className="w-4 h-4 mr-1" />
                    {formatPrice(event.price)}
                  </div>
                </div>

                {event.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {event.tags.slice(0, 4).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {event.tags.length > 4 && (
                      <Badge variant="outline" className="text-xs">
                        +{event.tags.length - 4}
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2 ml-4">
                {onBookmark && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-8 h-8 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onBookmark(event.id);
                    }}
                  >
                    <Bookmark className="w-4 h-4" />
                  </Button>
                )}
                {onShare && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-8 h-8 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onShare(event);
                    }}
                  >
                    <Share2 className="w-4 h-4" />
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEventClick?.(event);
                  }}
                >
                  View Details
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}