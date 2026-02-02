'use client';

import React, { useState, useCallback } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { ConflictDetails, ConflictResolutionSuggestion, CalendarEvent } from '@/types/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  AlertTriangle,
  Clock,
  MapPin,
  Users,
  CheckCircle,
  XCircle,
  Calendar,
  ArrowRight,
  Lightbulb
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ConflictResolutionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  conflicts: ConflictDetails[];
  event: CalendarEvent;
  onResolutionSelect: (
    suggestion: ConflictResolutionSuggestion,
    conflictId?: string
  ) => void;
  onIgnoreConflict: (conflictId: string) => void;
  onCancelEvent: () => void;
}

const SeverityIcon: React.FC<{ severity: ConflictDetails['severity'] }> = ({ severity }) => {
  switch (severity) {
    case 'critical':
      return <XCircle className="w-5 h-5 text-red-500" />;
    case 'high':
      return <AlertTriangle className="w-5 h-5 text-orange-500" />;
    case 'medium':
      return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    case 'low':
      return <AlertTriangle className="w-5 h-5 text-blue-500" />;
    default:
      return <AlertTriangle className="w-5 h-5 text-gray-500" />;
  }
};

const ConflictTypeIcon: React.FC<{ type: ConflictDetails['type'] }> = ({ type }) => {
  switch (type) {
    case 'overlap':
      return <Calendar className="w-4 h-4" />;
    case 'travel_time':
      return <MapPin className="w-4 h-4" />;
    case 'resource':
      return <Users className="w-4 h-4" />;
    case 'availability':
      return <Clock className="w-4 h-4" />;
    default:
      return <AlertTriangle className="w-4 h-4" />;
  }
};

const ConflictCard: React.FC<{
  conflict: ConflictDetails;
  onResolutionSelect: (suggestion: ConflictResolutionSuggestion) => void;
  onIgnore: () => void;
}> = ({ conflict, onResolutionSelect, onIgnore }) => {
  const [selectedSuggestion, setSelectedSuggestion] = useState<ConflictResolutionSuggestion | null>(null);

  const getSeverityColor = (severity: ConflictDetails['severity']) => {
    switch (severity) {
      case 'critical': return 'border-red-300 bg-red-50';
      case 'high': return 'border-orange-300 bg-orange-50';
      case 'medium': return 'border-yellow-300 bg-yellow-50';
      case 'low': return 'border-blue-300 bg-blue-50';
      default: return 'border-gray-300 bg-gray-50';
    }
  };

  const getTypeDescription = (type: ConflictDetails['type']) => {
    switch (type) {
      case 'overlap': return 'Time overlap conflict';
      case 'travel_time': return 'Insufficient travel time';
      case 'resource': return 'Resource booking conflict';
      case 'availability': return 'Availability conflict';
      default: return 'Scheduling conflict';
    }
  };

  return (
    <div className={cn(
      'border rounded-lg p-4 space-y-4',
      getSeverityColor(conflict.severity)
    )}>
      {/* Conflict Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <SeverityIcon severity={conflict.severity} />
          <div>
            <h4 className="font-semibold text-gray-900">
              {conflict.conflictingEventTitle}
            </h4>
            <div className="flex items-center space-x-2 text-sm text-gray-600 mt-1">
              <ConflictTypeIcon type={conflict.type} />
              <span>{getTypeDescription(conflict.type)}</span>
              <span>•</span>
              <span>{conflict.overlapMinutes} min overlap</span>
            </div>
          </div>
        </div>
        <div className={cn(
          'px-2 py-1 rounded-full text-xs font-medium',
          {
            'bg-red-100 text-red-800': conflict.severity === 'critical',
            'bg-orange-100 text-orange-800': conflict.severity === 'high',
            'bg-yellow-100 text-yellow-800': conflict.severity === 'medium',
            'bg-blue-100 text-blue-800': conflict.severity === 'low',
          }
        )}>
          {conflict.severity.toUpperCase()}
        </div>
      </div>

      {/* Resolution Suggestions */}
      {conflict.suggestions.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Lightbulb className="w-4 h-4 text-yellow-500" />
            <h5 className="font-medium text-gray-900">Suggested resolutions:</h5>
          </div>

          <div className="space-y-2">
            {conflict.suggestions.map((suggestion, index) => (
              <div
                key={index}
                className={cn(
                  'border rounded-md p-3 cursor-pointer transition-all duration-200',
                  selectedSuggestion === suggestion
                    ? 'border-blue-300 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                )}
                onClick={() => setSelectedSuggestion(suggestion)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {suggestion.description}
                    </p>
                    {suggestion.newStartTime && suggestion.newEndTime && (
                      <div className="flex items-center space-x-2 text-xs text-gray-600 mt-1">
                        <Clock className="w-3 h-3" />
                        <span>
                          {format(suggestion.newStartTime, 'MMM d, HH:mm')}
                        </span>
                        <ArrowRight className="w-3 h-3" />
                        <span>
                          {format(suggestion.newEndTime, 'HH:mm')}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={cn(
                      'px-2 py-1 rounded text-xs font-medium',
                      suggestion.impactScore < 30
                        ? 'bg-green-100 text-green-800'
                        : suggestion.impactScore < 60
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    )}>
                      Impact: {suggestion.impactScore}
                    </div>
                    {selectedSuggestion === suggestion && (
                      <CheckCircle className="w-4 h-4 text-blue-500" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex space-x-2 pt-2">
            <Button
              size="sm"
              onClick={() => selectedSuggestion && onResolutionSelect(selectedSuggestion)}
              disabled={!selectedSuggestion}
              className="flex-1"
            >
              Apply Resolution
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onIgnore}
              className="flex-1"
            >
              Ignore Conflict
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export const ConflictResolutionDialog: React.FC<ConflictResolutionDialogProps> = ({
  isOpen,
  onClose,
  conflicts,
  event,
  onResolutionSelect,
  onIgnoreConflict,
  onCancelEvent,
}) => {
  const [processing, setProcessing] = useState(false);

  const handleResolutionSelect = useCallback(async (
    suggestion: ConflictResolutionSuggestion,
    conflictId?: string
  ) => {
    setProcessing(true);
    try {
      await onResolutionSelect(suggestion, conflictId);
      onClose();
    } catch (error) {
      console.error('Error applying resolution:', error);
    } finally {
      setProcessing(false);
    }
  }, [onResolutionSelect, onClose]);

  const handleIgnoreConflict = useCallback(async (conflictId: string) => {
    setProcessing(true);
    try {
      await onIgnoreConflict(conflictId);
    } catch (error) {
      console.error('Error ignoring conflict:', error);
    } finally {
      setProcessing(false);
    }
  }, [onIgnoreConflict]);

  const criticalConflicts = conflicts.filter(c => c.severity === 'critical');
  const otherConflicts = conflicts.filter(c => c.severity !== 'critical');

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 animate-in fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-4xl max-h-[90vh] overflow-y-auto -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-lg animate-in fade-in-0 zoom-in-95">
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b">
              <div>
                <Dialog.Title className="text-lg font-semibold text-gray-900">
                  Schedule Conflicts Detected
                </Dialog.Title>
                <Dialog.Description className="text-sm text-gray-600 mt-1">
                  The event "{event.title}" conflicts with {conflicts.length} existing event{conflicts.length > 1 ? 's' : ''}
                </Dialog.Description>
              </div>
              <Dialog.Close className="text-gray-400 hover:text-gray-600">
                <XCircle className="w-6 h-6" />
              </Dialog.Close>
            </div>

            {/* Event Summary */}
            <div className="py-4 border-b">
              <h3 className="font-medium text-gray-900 mb-2">Event Details</h3>
              <div className="bg-gray-50 rounded-lg p-3">
                <h4 className="font-semibold text-gray-900">{event.title}</h4>
                <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                  <div className="flex items-center space-x-1">
                    <Clock className="w-4 h-4" />
                    <span>
                      {format(new Date(event.start_time), 'MMM d, HH:mm')} -
                      {format(new Date(event.end_time), 'HH:mm')}
                    </span>
                  </div>
                  {event.location && (
                    <div className="flex items-center space-x-1">
                      <MapPin className="w-4 h-4" />
                      <span>{event.location}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Critical Conflicts */}
            {criticalConflicts.length > 0 && (
              <div className="py-4 space-y-4">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <h3 className="font-medium text-red-900">
                    Critical Conflicts ({criticalConflicts.length})
                  </h3>
                </div>
                <div className="space-y-3">
                  {criticalConflicts.map((conflict, index) => (
                    <ConflictCard
                      key={`critical-${index}`}
                      conflict={conflict}
                      onResolutionSelect={(suggestion) =>
                        handleResolutionSelect(suggestion, conflict.conflictingEventId)
                      }
                      onIgnore={() => handleIgnoreConflict(conflict.conflictingEventId)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Other Conflicts */}
            {otherConflicts.length > 0 && (
              <div className="py-4 space-y-4">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  <h3 className="font-medium text-gray-900">
                    Other Conflicts ({otherConflicts.length})
                  </h3>
                </div>
                <div className="space-y-3">
                  {otherConflicts.map((conflict, index) => (
                    <ConflictCard
                      key={`other-${index}`}
                      conflict={conflict}
                      onResolutionSelect={(suggestion) =>
                        handleResolutionSelect(suggestion, conflict.conflictingEventId)
                      }
                      onIgnore={() => handleIgnoreConflict(conflict.conflictingEventId)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-gray-600">
                {criticalConflicts.length > 0
                  ? 'Critical conflicts must be resolved before saving'
                  : 'You can proceed with the event or resolve conflicts'
                }
              </div>
              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={onCancelEvent}
                  disabled={processing}
                >
                  Cancel Event
                </Button>
                {criticalConflicts.length === 0 && (
                  <Button
                    onClick={onClose}
                    disabled={processing}
                  >
                    Proceed with Event
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default ConflictResolutionDialog;