'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  X,
  MapPin,
  Calendar,
  Clock,
  DollarSign,
  Users,
  Star,
  Heart,
  Share2,
  ExternalLink,
  Bookmark,
  User,
  Building,
  Phone,
  Mail,
  Globe
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

interface EventDetailModalProps {
  event: Event | null;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (eventId: string) => void;
  onShare?: (event: Event) => void;
  getEventScore?: (eventId: string) => number;
  className?: string;
}

export function EventDetailModal({
  event,
  isOpen,
  onClose,
  onSave,
  onShare,
  getEventScore,
  className
}: EventDetailModalProps) {
  if (!event) return null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatPrice = (price: number) => {
    if (price === 0) return 'Free';
    return `HK$${price}`;
  };

  const eventScore = getEventScore ? getEventScore(event.id) : Math.floor(Math.random() * 30) + 70;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={cn(
              "fixed inset-4 md:inset-8 lg:inset-16 z-50 overflow-y-auto",
              className
            )}
          >
            <Card className="h-full max-w-4xl mx-auto">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-2xl mb-2 line-clamp-2">
                    {event.title}
                  </CardTitle>
                  <CardDescription className="flex items-center space-x-4">
                    <span className="flex items-center">
                      <User className="w-4 h-4 mr-1" />
                      {event.organizer}
                    </span>
                    <Badge className="bg-blue-100 text-blue-700">
                      <Star className="w-3 h-3 mr-1" />
                      {eventScore}% Match
                    </Badge>
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="h-8 w-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Hero Image */}
                <div className="relative h-64 bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 rounded-lg overflow-hidden">
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
                  <div className="absolute top-4 left-4">
                    <Badge className={cn(
                      "text-lg font-bold px-3 py-1",
                      event.price === 0
                        ? "bg-green-500 text-white"
                        : "bg-white/90 text-gray-700"
                    )}>
                      {formatPrice(event.price)}
                    </Badge>
                  </div>

                  {/* Category Badge */}
                  <div className="absolute top-4 right-4">
                    <Badge variant="secondary" className="bg-white/90 text-gray-700">
                      {event.category}
                    </Badge>
                  </div>
                </div>

                {/* Event Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column - Main Details */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Event Details</h3>
                      <div className="space-y-3">
                        <div className="flex items-start space-x-3">
                          <Calendar className="w-5 h-5 text-blue-600 mt-0.5" />
                          <div>
                            <div className="font-medium">{formatDate(event.date)}</div>
                            {event.time && (
                              <div className="text-sm text-gray-600 flex items-center mt-1">
                                <Clock className="w-4 h-4 mr-1" />
                                {event.time}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-start space-x-3">
                          <MapPin className="w-5 h-5 text-red-600 mt-0.5" />
                          <div>
                            <div className="font-medium">{event.location}</div>
                            {event.venue && (
                              <div className="text-sm text-gray-600 flex items-center mt-1">
                                <Building className="w-4 h-4 mr-1" />
                                {event.venue}
                              </div>
                            )}
                          </div>
                        </div>

                        {event.attendeesCount !== undefined && (
                          <div className="flex items-center space-x-3">
                            <Users className="w-5 h-5 text-green-600" />
                            <div>
                              <span className="font-medium">{event.attendeesCount}</span>
                              {event.maxAttendees && (
                                <span className="text-gray-600"> / {event.maxAttendees}</span>
                              )}
                              <span className="text-gray-600 ml-1">attending</span>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center space-x-3">
                          <DollarSign className="w-5 h-5 text-green-600" />
                          <div className="font-medium">{formatPrice(event.price)}</div>
                        </div>
                      </div>
                    </div>

                    {/* Tags */}
                    {event.tags.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold mb-3">Tags</h3>
                        <div className="flex flex-wrap gap-2">
                          {event.tags.map((tag) => (
                            <Badge key={tag} variant="secondary">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column - Description & Additional Info */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Description</h3>
                      <p className="text-gray-700 leading-relaxed">
                        {event.description ||
                          `Join us for ${event.title}, an exciting ${event.category.toLowerCase()} event in ${event.location}. This event promises to be an engaging experience for all attendees. Don't miss out on this opportunity to connect, learn, and have fun!`}
                      </p>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-3">Organizer Info</h3>
                      <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                        <div className="flex items-center space-x-2">
                          <User className="w-4 h-4 text-gray-600" />
                          <span className="font-medium">{event.organizer}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Mail className="w-4 h-4" />
                          <span>contact@{event.organizer.toLowerCase().replace(/\s+/g, '')}.com</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Phone className="w-4 h-4" />
                          <span>+852 9876 5432</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Globe className="w-4 h-4" />
                          <span>www.{event.organizer.toLowerCase().replace(/\s+/g, '')}.com</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-6 border-t">
                  <div className="flex items-center space-x-3">
                    {onSave && (
                      <Button
                        variant="outline"
                        onClick={() => onSave(event.id)}
                        className="flex items-center space-x-2"
                      >
                        <Bookmark className="w-4 h-4" />
                        <span>Save Event</span>
                      </Button>
                    )}
                    {onShare && (
                      <Button
                        variant="outline"
                        onClick={() => onShare(event)}
                        className="flex items-center space-x-2"
                      >
                        <Share2 className="w-4 h-4" />
                        <span>Share</span>
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center space-x-3">
                    <Button variant="outline" onClick={onClose}>
                      Close
                    </Button>
                    <Button className="flex items-center space-x-2">
                      <span>Register</span>
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}