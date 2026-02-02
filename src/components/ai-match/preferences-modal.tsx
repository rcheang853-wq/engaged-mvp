'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import {
  X,
  MapPin,
  DollarSign,
  Clock,
  Heart,
  Settings,
  Filter,
  Plus,
  Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface EventPreferences {
  location: string;
  maxDistance: number;
  interests: string[];
  eventTypes: string[];
  priceRange: [number, number];
  timeOfDay: string[];
}

interface PreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  preferences: EventPreferences;
  onSave: (preferences: EventPreferences) => void;
  className?: string;
}

const AVAILABLE_INTERESTS = [
  'Art & Culture', 'Technology', 'Food & Drink', 'Music', 'Sports', 'Outdoor',
  'Business', 'Education', 'Health & Wellness', 'Gaming', 'Photography',
  'Travel', 'Fashion', 'Film', 'Literature', 'Science', 'Charity'
];

const AVAILABLE_EVENT_TYPES = [
  'Workshop', 'Conference', 'Networking', 'Exhibition', 'Performance',
  'Competition', 'Festival', 'Meetup', 'Class', 'Social', 'Volunteer'
];

const HONG_KONG_AREAS = [
  'Central', 'Wan Chai', 'Causeway Bay', 'Tsim Sha Tsui', 'Mong Kok',
  'Sheung Wan', 'Admiralty', 'Quarry Bay', 'Tai Koo', 'North Point',
  'Jordan', 'Yau Ma Tei', 'Prince Edward', 'Sham Shui Po', 'Lai Chi Kok'
];

const TIME_PERIODS = [
  { id: 'morning', label: 'Morning (6AM - 12PM)', value: 'morning' },
  { id: 'afternoon', label: 'Afternoon (12PM - 6PM)', value: 'afternoon' },
  { id: 'evening', label: 'Evening (6PM - 12AM)', value: 'evening' }
];

export function PreferencesModal({
  isOpen,
  onClose,
  preferences,
  onSave,
  className
}: PreferencesModalProps) {
  const [localPreferences, setLocalPreferences] = useState<EventPreferences>(preferences);

  const handleSave = () => {
    onSave(localPreferences);
    onClose();
  };

  const handleReset = () => {
    setLocalPreferences({
      location: '',
      maxDistance: 50,
      interests: [],
      eventTypes: [],
      priceRange: [0, 500],
      timeOfDay: ['morning', 'afternoon', 'evening']
    });
  };

  const toggleArrayItem = (array: string[], item: string, setter: (newArray: string[]) => void) => {
    if (array.includes(item)) {
      setter(array.filter(i => i !== item));
    } else {
      setter([...array, item]);
    }
  };

  const toggleInterest = (interest: string) => {
    toggleArrayItem(
      localPreferences.interests,
      interest,
      (newInterests) => setLocalPreferences({ ...localPreferences, interests: newInterests })
    );
  };

  const toggleEventType = (eventType: string) => {
    toggleArrayItem(
      localPreferences.eventTypes,
      eventType,
      (newEventTypes) => setLocalPreferences({ ...localPreferences, eventTypes: newEventTypes })
    );
  };

  const toggleTimeOfDay = (time: string) => {
    toggleArrayItem(
      localPreferences.timeOfDay,
      time,
      (newTimeOfDay) => setLocalPreferences({ ...localPreferences, timeOfDay: newTimeOfDay })
    );
  };

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
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <Settings className="w-5 h-5" />
                    <span>Event Preferences</span>
                  </CardTitle>
                  <CardDescription>
                    Customize your event recommendations to match your interests
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
                {/* Location Preferences */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-blue-600" />
                    <h3 className="text-lg font-semibold">Location</h3>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">
                        Preferred Area
                      </label>
                      <select
                        value={localPreferences.location}
                        onChange={(e) => setLocalPreferences({ ...localPreferences, location: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Any area</option>
                        {HONG_KONG_AREAS.map(area => (
                          <option key={area} value={area}>{area}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">
                        Max Distance: {localPreferences.maxDistance}km
                      </label>
                      <Slider
                        value={[localPreferences.maxDistance]}
                        onValueChange={(value) => setLocalPreferences({
                          ...localPreferences,
                          maxDistance: value[0]
                        })}
                        max={100}
                        min={5}
                        step={5}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>

                {/* Price Range */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    <h3 className="text-lg font-semibold">Price Range</h3>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      HK${localPreferences.priceRange[0]} - HK${localPreferences.priceRange[1]}
                    </label>
                    <Slider
                      value={localPreferences.priceRange}
                      onValueChange={(value) => setLocalPreferences({
                        ...localPreferences,
                        priceRange: [value[0], value[1]]
                      })}
                      max={1000}
                      min={0}
                      step={25}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Time Preferences */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-purple-600" />
                    <h3 className="text-lg font-semibold">Preferred Times</h3>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    {TIME_PERIODS.map(time => (
                      <label key={time.id} className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={localPreferences.timeOfDay.includes(time.value)}
                          onChange={() => toggleTimeOfDay(time.value)}
                          className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                        />
                        <span className="text-sm">{time.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Interests */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Heart className="w-4 h-4 text-pink-600" />
                    <h3 className="text-lg font-semibold">Interests</h3>
                    <Badge variant="secondary" className="text-xs">
                      {localPreferences.interests.length} selected
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_INTERESTS.map(interest => (
                      <Badge
                        key={interest}
                        variant={localPreferences.interests.includes(interest) ? "default" : "outline"}
                        className={cn(
                          "cursor-pointer transition-colors",
                          localPreferences.interests.includes(interest)
                            ? "bg-pink-600 hover:bg-pink-700"
                            : "hover:bg-pink-50 hover:border-pink-300"
                        )}
                        onClick={() => toggleInterest(interest)}
                      >
                        {interest}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Event Types */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Filter className="w-4 h-4 text-orange-600" />
                    <h3 className="text-lg font-semibold">Event Types</h3>
                    <Badge variant="secondary" className="text-xs">
                      {localPreferences.eventTypes.length} selected
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_EVENT_TYPES.map(eventType => (
                      <Badge
                        key={eventType}
                        variant={localPreferences.eventTypes.includes(eventType) ? "default" : "outline"}
                        className={cn(
                          "cursor-pointer transition-colors",
                          localPreferences.eventTypes.includes(eventType)
                            ? "bg-orange-600 hover:bg-orange-700"
                            : "hover:bg-orange-50 hover:border-orange-300"
                        )}
                        onClick={() => toggleEventType(eventType)}
                      >
                        {eventType}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-6 border-t">
                  <Button
                    variant="outline"
                    onClick={handleReset}
                    className="flex items-center space-x-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Reset to Defaults</span>
                  </Button>

                  <div className="flex items-center space-x-3">
                    <Button variant="outline" onClick={onClose}>
                      Cancel
                    </Button>
                    <Button onClick={handleSave}>
                      Save Preferences
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