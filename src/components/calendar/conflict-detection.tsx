'use client';

import React from 'react';
import { CalendarEvent } from '@/types/calendar';
import { useConflictDetection, EventConflict } from '@/hooks/use-conflict-detection';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle,
  Clock,
  MapPin,
  Calendar,
  ChevronRight,
  Lightbulb
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConflictDetectionProps {
  events: CalendarEvent[];
  currentEvent: CalendarEvent | null;
  onApplySuggestion?: (suggestion: { start: Date; end: Date; reason: string }) => void;
  className?: string;
}

export function ConflictDetection({
  events,
  currentEvent,
  onApplySuggestion,
  className = ''
}: ConflictDetectionProps) {
  const {
    conflicts,
    suggestions,
    isDetecting,
    hasConflicts,
    getSuggestedTimeSlots
  } = useConflictDetection({
    events,
    currentEvent,
    enabled: !!currentEvent
  });

  const suggestedTimeSlots = currentEvent ? getSuggestedTimeSlots(currentEvent) : [];

  if (!currentEvent || isDetecting) {
    return (
      <div className={`${className} flex items-center justify-center p-4`}>
        <div className="flex items-center space-x-2 text-gray-500">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="text-sm">Checking for conflicts...</span>
        </div>
      </div>
    );
  }

  if (!hasConflicts) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`${className} flex items-center space-x-2 p-3 bg-green-50 border border-green-200 rounded-lg`}
      >
        <div className="flex-shrink-0">
          <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-green-800">No conflicts detected</p>
          <p className="text-xs text-green-700">This event fits well in your schedule</p>
        </div>
      </motion.div>
    );
  }

  const getConflictIcon = (conflictType: EventConflict['conflictType']) => {
    switch (conflictType) {
      case 'overlap':
        return <AlertTriangle className="w-4 h-4" />;
      case 'travel_time':
        return <MapPin className="w-4 h-4" />;
      case 'adjacent':
        return <Clock className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getConflictColor = (severity: EventConflict['severity']) => {
    switch (severity) {
      case 'high':
        return 'text-red-600 bg-red-100 border-red-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'low':
        return 'text-blue-600 bg-blue-100 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className={className}>
      <AnimatePresence>
        {/* Conflict Warnings */}
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-3"
        >
          {/* Header */}
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            <h4 className="text-sm font-semibold text-gray-900">
              {conflicts.length} Scheduling Conflict{conflicts.length !== 1 ? 's' : ''} Detected
            </h4>
          </div>

          {/* Conflict List */}
          <div className="space-y-2">
            {conflicts.map((conflict) => (
              <motion.div
                key={conflict.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`p-3 rounded-lg border ${getConflictColor(conflict.severity)}`}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    {getConflictIcon(conflict.conflictType)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium">
                        {conflict.conflictingEventTitle}
                      </p>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        conflict.severity === 'high' ? 'bg-red-100 text-red-800' :
                        conflict.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {conflict.severity}
                      </span>
                    </div>

                    <p className="text-xs text-gray-600 mt-1">
                      {conflict.conflictType === 'overlap' && conflict.overlapMinutes &&
                        `${conflict.overlapMinutes} minute overlap`}
                      {conflict.conflictType === 'travel_time' && 'Travel time needed'}
                      {conflict.conflictType === 'adjacent' && 'Back-to-back scheduling'}
                    </p>

                    {conflict.suggestion && (
                      <p className="text-xs text-gray-700 mt-2 italic">
                        {conflict.suggestion}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* General Suggestions */}
          {suggestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg"
            >
              <div className="flex items-start space-x-2">
                <Lightbulb className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h5 className="text-sm font-medium text-blue-900 mb-2">Suggestions:</h5>
                  <ul className="text-xs text-blue-800 space-y-1">
                    {suggestions.slice(0, 3).map((suggestion, index) => (
                      <li key={index} className="flex items-start space-x-1">
                        <span className="text-blue-600">•</span>
                        <span>{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          )}

          {/* Alternative Time Slots */}
          {suggestedTimeSlots.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4"
            >
              <div className="flex items-center space-x-2 mb-3">
                <Calendar className="w-4 h-4 text-purple-600" />
                <h5 className="text-sm font-medium text-gray-900">Alternative Time Slots:</h5>
              </div>

              <div className="space-y-2">
                {suggestedTimeSlots.slice(0, 3).map((slot, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <Clock className="w-4 h-4 text-purple-600" />
                      <div>
                        <p className="text-sm font-medium text-purple-900">
                          {formatTime(slot.start)} - {formatTime(slot.end)}
                        </p>
                        <p className="text-xs text-purple-700">{slot.reason}</p>
                      </div>
                    </div>

                    {onApplySuggestion && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onApplySuggestion(slot)}
                        className="text-purple-700 border-purple-300 hover:bg-purple-100"
                      >
                        <span className="text-xs">Use This</span>
                        <ChevronRight className="w-3 h-3 ml-1" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}