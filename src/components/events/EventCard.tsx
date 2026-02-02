'use client';

import { Event } from '@/types';
import Image from 'next/image';
import Link from 'next/link';
import {
  Calendar,
  MapPin,
  Clock,
  Star,
  Bookmark,
  Share2,
  ExternalLink,
  Users,
  Tag
} from 'lucide-react';
import { useState } from 'react';

interface EventCardProps {
  event: Event;
  variant?: 'default' | 'compact' | 'featured';
  showDistance?: boolean;
  distance?: number; // in kilometers
  className?: string;
}

export function EventCard({
  event,
  variant = 'default',
  showDistance = false,
  distance,
  className = ''
}: EventCardProps) {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [imageError, setImageError] = useState(false);

  const formatDate = (date: Date) => {
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isTomorrow = date.toDateString() === new Date(now.getTime() + 86400000).toDateString();

    if (isToday) return 'Today';
    if (isTomorrow) return 'Tomorrow';

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  const formatTime = (date: Date) => {
    if (event.allDay) return 'All day';

    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getLocationDisplay = () => {
    if (event.venue) {
      return event.venue.name;
    }
    return event.customLocation || 'Location TBA';
  };

  const getPriceDisplay = () => {
    if (event.isFree) return 'Free';

    const [min, max] = event.priceRange;
    if (min === max) return `HK$${min}`;
    if (min === 0) return `Up to HK$${max}`;
    return `HK$${min} - HK$${max}`;
  };

  const handleBookmark = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsBookmarked(!isBookmarked);
    // TODO: Implement actual bookmark functionality
  };

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // TODO: Implement share functionality
    if (navigator.share) {
      const shareData: ShareData = {
        title: event.title,
        url: window.location.origin + `/events/${event.id}`,
      };

      const description = event.shortDescription || event.description;
      if (description) {
        shareData.text = description;
      }

      navigator.share(shareData);
    }
  };

  if (variant === 'compact') {
    return (
      <Link
        href={`/events/${event.id}`}
        className={`group block bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200 ${className}`}
      >
        <div className="p-4">
          <div className="flex items-start space-x-3">
            {event.posterUrl && !imageError && (
              <div className="flex-shrink-0">
                <Image
                  src={event.posterUrl}
                  alt={event.title}
                  width={60}
                  height={60}
                  className="rounded-md object-cover"
                  onError={() => setImageError(true)}
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                {event.title}
              </h3>
              <div className="mt-1 flex items-center text-xs text-gray-500 space-x-2">
                <div className="flex items-center">
                  <Calendar className="w-3 h-3 mr-1" />
                  {formatDate(event.startTime)}
                </div>
                <div className="flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  {formatTime(event.startTime)}
                </div>
              </div>
              <div className="mt-1 flex items-center text-xs text-gray-500">
                <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                <span className="truncate">{getLocationDisplay()}</span>
                {showDistance && distance && (
                  <span className="ml-2 text-blue-600 font-medium">
                    {distance.toFixed(1)}km
                  </span>
                )}
              </div>
            </div>
            <div className="flex-shrink-0 text-xs font-medium text-green-600">
              {getPriceDisplay()}
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <div className={`group bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all duration-300 overflow-hidden ${variant === 'featured' ? 'ring-2 ring-blue-500 ring-opacity-20' : ''} ${className}`}>
      {/* Event Image */}
      <div className="relative aspect-[16/9] bg-gray-100">
        {event.posterUrl && !imageError ? (
          <Image
            src={event.posterUrl}
            alt={event.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex items-center justify-center h-full bg-gradient-to-br from-blue-50 to-purple-50">
            <Calendar className="w-12 h-12 text-gray-400" />
          </div>
        )}

        {/* Overlay badges */}
        <div className="absolute top-3 left-3 flex space-x-2">
          {event.isFeatured && (
            <span className="bg-yellow-500 text-white text-xs font-medium px-2 py-1 rounded-full flex items-center">
              <Star className="w-3 h-3 mr-1" />
              Featured
            </span>
          )}
          {event.isTrending && (
            <span className="bg-red-500 text-white text-xs font-medium px-2 py-1 rounded-full">
              Trending
            </span>
          )}
          {event.isFree && (
            <span className="bg-green-500 text-white text-xs font-medium px-2 py-1 rounded-full">
              Free
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div className="absolute top-3 right-3 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleBookmark}
            className={`p-2 rounded-full backdrop-blur-sm transition-colors ${
              isBookmarked
                ? 'bg-blue-600 text-white'
                : 'bg-white/80 hover:bg-white text-gray-600 hover:text-gray-900'
            }`}
            aria-label={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
          >
            <Bookmark className="w-4 h-4" />
          </button>
          <button
            onClick={handleShare}
            className="p-2 rounded-full bg-white/80 hover:bg-white text-gray-600 hover:text-gray-900 backdrop-blur-sm transition-colors"
            aria-label="Share event"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Event Content */}
      <div className="p-4">
        {/* Category and organizer */}
        <div className="flex items-center justify-between mb-2">
          {event.category && (
            <span
              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
              style={{
                backgroundColor: `${event.category.color}15`,
                color: event.category.color
              }}
            >
              {event.category.icon && <span className="mr-1">{event.category.icon}</span>}
              {event.category.name}
            </span>
          )}
          {event.organizer?.isVerified && (
            <span className="flex items-center text-xs text-blue-600">
              <Star className="w-3 h-3 mr-1 fill-current" />
              Verified
            </span>
          )}
        </div>

        {/* Title */}
        <Link href={`/events/${event.id}`}>
          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2 mb-2">
            {event.title}
          </h3>
        </Link>

        {/* Description */}
        {event.shortDescription && (
          <p className="text-sm text-gray-600 line-clamp-2 mb-3">
            {event.shortDescription}
          </p>
        )}

        {/* Event details */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center text-sm text-gray-700">
            <Calendar className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
            <span>{formatDate(event.startTime)}</span>
            <span className="mx-2">•</span>
            <span>{formatTime(event.startTime)}</span>
          </div>

          <div className="flex items-start text-sm text-gray-700">
            <MapPin className="w-4 h-4 mr-2 mt-0.5 text-gray-400 flex-shrink-0" />
            <span className="flex-1">{getLocationDisplay()}</span>
            {showDistance && distance && (
              <span className="ml-2 text-blue-600 font-medium">
                {distance.toFixed(1)}km
              </span>
            )}
          </div>

          {event.capacity && (
            <div className="flex items-center text-sm text-gray-700">
              <Users className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
              <span>Up to {event.capacity} people</span>
            </div>
          )}
        </div>

        {/* Tags */}
        {event.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {event.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-1 rounded bg-gray-100 text-xs text-gray-600"
              >
                <Tag className="w-3 h-3 mr-1" />
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

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold text-green-600">
            {getPriceDisplay()}
          </div>

          <div className="flex items-center space-x-2">
            {event.ticketUrl && (
              <a
                href={event.ticketUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 font-medium"
                onClick={(e) => e.stopPropagation()}
              >
                Get tickets
                <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            )}

            <Link
              href={`/events/${event.id}`}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              View details
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}