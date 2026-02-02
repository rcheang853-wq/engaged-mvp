'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CalendarEvent, CalendarInvitationDetails, ConflictDetails, RecurrencePattern } from '@/types/calendar';
import { cn } from '@/lib/utils';
import { format, addHours, setHours, setMinutes } from 'date-fns';
import { detectEventConflicts } from '@/utils/conflict-detection';
import { getUserTimezone, getAvailableTimezones } from '@/utils/timezone-handling';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Repeat,
  Bell,
  Trash2,
  XCircle,
  Save,
  AlertTriangle,
  Eye,
  EyeOff,
  Globe,
  Video,
  Plus,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import ConflictResolutionDialog from './conflict-resolution-dialog';
import InvitationSystem from './invitation-system';

const eventSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(2000).optional(),
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
  timezone: z.string().optional(),
  all_day: z.boolean().default(false),
  location: z.string().max(500).optional(),
  virtual_meeting_url: z.string().url().optional().or(z.literal('')),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  visibility: z.enum(['private', 'public', 'confidential']).default('private'),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  recurrence_pattern: z.object({
    frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
    interval: z.number().min(1).max(999),
    count: z.number().min(1).max(1000).optional(),
    until: z.string().datetime().optional(),
  }).optional(),
  reminders: z.array(z.object({
    type: z.enum(['email', 'push', 'sms']),
    minutes_before: z.number().min(0).max(10080),
  })).default([]),
});

type EventFormData = z.infer<typeof eventSchema>;

interface EnhancedEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event?: CalendarEvent | null;
  isCreating: boolean;
  onSave: (eventData: Partial<CalendarEvent>) => Promise<void>;
  onDelete?: () => Promise<void>;
  defaultDate?: Date;
  allEvents?: CalendarEvent[];
  invitations?: CalendarInvitationDetails[];
  onSendInvitation?: (invitations: { email: string; name: string; message?: string }[]) => void;
  onResendInvitation?: (invitationId: string) => void;
  onCancelInvitation?: (invitationId: string) => void;
  onUpdateRSVP?: (invitationId: string, rsvpStatus: any, note?: string) => void;
  isOrganizer?: boolean;
}

export const EnhancedEventModal: React.FC<EnhancedEventModalProps> = ({
  isOpen,
  onClose,
  event,
  isCreating,
  onSave,
  onDelete,
  defaultDate = new Date(),
  allEvents = [],
  invitations = [],
  onSendInvitation,
  onResendInvitation,
  onCancelInvitation,
  onUpdateRSVP,
  isOrganizer = true,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [detectedConflicts, setDetectedConflicts] = useState<ConflictDetails[]>([]);
  const [activeTab, setActiveTab] = useState<'details' | 'invitations' | 'recurrence'>('details');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const timezones = getAvailableTimezones();

  const form = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: '',
      description: '',
      start_time: format(defaultDate, "yyyy-MM-dd'T'HH:mm"),
      end_time: format(addHours(defaultDate, 1), "yyyy-MM-dd'T'HH:mm"),
      timezone: getUserTimezone(),
      all_day: false,
      location: '',
      virtual_meeting_url: '',
      priority: 'normal',
      visibility: 'private',
      color: '#3b82f6',
      reminders: [{ type: 'email', minutes_before: 15 }],
    },
  });

  const { watch, setValue, formState: { errors, isSubmitting } } = form;
  const watchedValues = watch();

  // Load event data when editing
  useEffect(() => {
    if (event && !isCreating) {
      form.reset({
        title: event.title,
        description: event.description || '',
        start_time: format(new Date(event.start_time), "yyyy-MM-dd'T'HH:mm"),
        end_time: format(new Date(event.end_time), "yyyy-MM-dd'T'HH:mm"),
        timezone: event.timezone,
        all_day: event.all_day,
        location: event.location || '',
        virtual_meeting_url: event.virtualMeetingUrl || '',
        priority: event.priority,
        visibility: event.visibility,
        color: event.color || '#3b82f6',
        recurrence_pattern: event.recurrencePattern ? {
          frequency: event.recurrencePattern.frequency,
          interval: event.recurrencePattern.interval,
          count: event.recurrencePattern.count,
          until: event.recurrencePattern.until ? format(event.recurrencePattern.until, "yyyy-MM-dd'T'HH:mm") : undefined,
        } : undefined,
        reminders: event.reminders || [{ type: 'email', minutes_before: 15 }],
      });
    }
  }, [event, isCreating, form]);

  // Real-time conflict detection
  const potentialEvent = useMemo(() => {
    if (!watchedValues.title || !watchedValues.start_time || !watchedValues.end_time) {
      return null;
    }

    return {
      id: event?.id || 'temp-id',
      userId: event?.userId || 'current-user',
      title: watchedValues.title,
      description: watchedValues.description,
      startTime: new Date(watchedValues.start_time),
      endTime: new Date(watchedValues.end_time),
      timezone: watchedValues.timezone || getUserTimezone(),
      allDay: watchedValues.all_day,
      location: watchedValues.location,
      virtualMeetingUrl: watchedValues.virtual_meeting_url,
      priority: watchedValues.priority,
      visibility: watchedValues.visibility,
      color: watchedValues.color,
      createdBy: event?.createdBy || 'current-user',
      status: 'confirmed' as const,
      isRecurring: !!watchedValues.recurrence_pattern,
      isException: false,
      createdAt: event?.createdAt || new Date(),
      updatedAt: new Date(),
    } as CalendarEvent;
  }, [watchedValues, event]);

  const conflicts = useMemo(() => {
    if (!potentialEvent) return [];

    const otherEvents = allEvents.filter(e => e.id !== event?.id);
    return detectEventConflicts(potentialEvent, otherEvents, {
      includeTravelTime: true,
      includeBufferTime: true,
    });
  }, [potentialEvent, allEvents, event?.id]);

  const handleSave = useCallback(async (data: EventFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      // Check for critical conflicts
      const criticalConflicts = conflicts.filter(c => c.severity === 'critical');

      if (criticalConflicts.length > 0) {
        setDetectedConflicts(conflicts);
        setShowConflictDialog(true);
        setIsLoading(false);
        return;
      }

      const eventData: Partial<CalendarEvent> = {
        title: data.title,
        description: data.description,
        start_time: data.start_time,
        end_time: data.end_time,
        timezone: data.timezone,
        all_day: data.all_day,
        location: data.location,
        virtualMeetingUrl: data.virtual_meeting_url || undefined,
        priority: data.priority,
        visibility: data.visibility,
        color: data.color,
        recurrencePattern: data.recurrence_pattern ? {
          frequency: data.recurrence_pattern.frequency,
          interval: data.recurrence_pattern.interval,
          count: data.recurrence_pattern.count,
          until: data.recurrence_pattern.until ? new Date(data.recurrence_pattern.until) : undefined,
        } : undefined,
        reminders: data.reminders.map(r => ({
          id: '',
          type: r.type,
          minutesBefore: r.minutes_before,
          sent: false,
        })),
      };

      await onSave(eventData);
      onClose();
    } catch (error) {
      console.error('Error saving event:', error);
      setError('Failed to save event. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [conflicts, onSave, onClose]);

  const handleDelete = useCallback(async () => {
    if (!onDelete) return;

    setIsLoading(true);
    try {
      await onDelete();
      onClose();
    } catch (error) {
      console.error('Error deleting event:', error);
      setError('Failed to delete event. Please try again.');
    } finally {
      setIsLoading(false);
      setShowDeleteDialog(false);
    }
  }, [onDelete, onClose]);

  const handleConflictResolution = useCallback(async (suggestion: any) => {
    if (suggestion.newStartTime && suggestion.newEndTime) {
      setValue('start_time', format(suggestion.newStartTime, "yyyy-MM-dd'T'HH:mm"));
      setValue('end_time', format(suggestion.newEndTime, "yyyy-MM-dd'T'HH:mm"));
    }
    setShowConflictDialog(false);
  }, [setValue]);

  const addReminder = useCallback(() => {
    const currentReminders = watchedValues.reminders || [];
    setValue('reminders', [...currentReminders, { type: 'email', minutes_before: 15 }]);
  }, [watchedValues.reminders, setValue]);

  const removeReminder = useCallback((index: number) => {
    const currentReminders = watchedValues.reminders || [];
    setValue('reminders', currentReminders.filter((_, i) => i !== index));
  }, [watchedValues.reminders, setValue]);

  const hasConflicts = conflicts.length > 0;
  const hasCriticalConflicts = conflicts.some(c => c.severity === 'critical');

  return (
    <>
      <Dialog.Root open={isOpen} onOpenChange={onClose}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 animate-in fade-in-0" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-4xl max-h-[90vh] overflow-y-auto -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-lg animate-in fade-in-0 zoom-in-95">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b">
                <div>
                  <Dialog.Title className="text-lg font-semibold text-gray-900">
                    {isCreating ? 'Create Event' : 'Edit Event'}
                  </Dialog.Title>
                  {hasConflicts && (
                    <div className="flex items-center space-x-2 mt-1">
                      <AlertTriangle className={cn(
                        'w-4 h-4',
                        hasCriticalConflicts ? 'text-red-500' : 'text-yellow-500'
                      )} />
                      <span className={cn(
                        'text-sm',
                        hasCriticalConflicts ? 'text-red-600' : 'text-yellow-600'
                      )}>
                        {conflicts.length} conflict{conflicts.length > 1 ? 's' : ''} detected
                      </span>
                    </div>
                  )}
                </div>
                <Dialog.Close className="text-gray-400 hover:text-gray-600">
                  <XCircle className="w-6 h-6" />
                </Dialog.Close>
              </div>

              {/* Tabs */}
              <div className="flex border-b">
                {['details', 'invitations', 'recurrence'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={cn(
                      'px-6 py-3 text-sm font-medium border-b-2 transition-colors',
                      activeTab === tab
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    )}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>

              {/* Content */}
              <div className="flex-1 p-6">
                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800">{error}</p>
                  </div>
                )}

                <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
                  {activeTab === 'details' && (
                    <div className="space-y-6">
                      {/* Title */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Event Title *
                        </label>
                        <input
                          {...form.register('title')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter event title"
                        />
                        {errors.title && (
                          <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>
                        )}
                      </div>

                      {/* Description */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Description
                        </label>
                        <textarea
                          {...form.register('description')}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Event description"
                        />
                        {errors.description && (
                          <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
                        )}
                      </div>

                      {/* Date and Time */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Start Date & Time *
                          </label>
                          <input
                            {...form.register('start_time')}
                            type="datetime-local"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          {errors.start_time && (
                            <p className="text-red-500 text-sm mt-1">{errors.start_time.message}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            End Date & Time *
                          </label>
                          <input
                            {...form.register('end_time')}
                            type="datetime-local"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          {errors.end_time && (
                            <p className="text-red-500 text-sm mt-1">{errors.end_time.message}</p>
                          )}
                        </div>
                      </div>

                      {/* All Day and Timezone */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center space-x-2">
                          <input
                            {...form.register('all_day')}
                            type="checkbox"
                            className="text-blue-600 focus:ring-blue-500"
                          />
                          <label className="text-sm font-medium text-gray-700">
                            All Day Event
                          </label>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Timezone
                          </label>
                          <select
                            {...form.register('timezone')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {timezones.map(tz => (
                              <option key={tz.value} value={tz.value}>
                                {tz.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Location and Virtual Meeting */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            <MapPin className="w-4 h-4 inline mr-1" />
                            Location
                          </label>
                          <input
                            {...form.register('location')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Event location"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            <Video className="w-4 h-4 inline mr-1" />
                            Virtual Meeting URL
                          </label>
                          <input
                            {...form.register('virtual_meeting_url')}
                            type="url"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="https://meet.example.com/..."
                          />
                        </div>
                      </div>

                      {/* Priority and Visibility */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Priority
                          </label>
                          <select
                            {...form.register('priority')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="low">Low</option>
                            <option value="normal">Normal</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Visibility
                          </label>
                          <select
                            {...form.register('visibility')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="private">Private</option>
                            <option value="public">Public</option>
                            <option value="confidential">Confidential</option>
                          </select>
                        </div>
                      </div>

                      {/* Color */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Event Color
                        </label>
                        <input
                          {...form.register('color')}
                          type="color"
                          className="w-20 h-10 border border-gray-300 rounded-md"
                        />
                      </div>

                      {/* Reminders */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <label className="block text-sm font-medium text-gray-700">
                            <Bell className="w-4 h-4 inline mr-1" />
                            Reminders
                          </label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addReminder}
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Add
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {watchedValues.reminders?.map((reminder, index) => (
                            <div key={index} className="flex items-center space-x-2">
                              <select
                                {...form.register(`reminders.${index}.type`)}
                                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="email">Email</option>
                                <option value="push">Push</option>
                                <option value="sms">SMS</option>
                              </select>
                              <input
                                {...form.register(`reminders.${index}.minutes_before`, { valueAsNumber: true })}
                                type="number"
                                min="0"
                                max="10080"
                                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-600">minutes before</span>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeReminder(index)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'invitations' && isOrganizer && (
                    <InvitationSystem
                      event={potentialEvent || event!}
                      invitations={invitations}
                      onSendInvitation={onSendInvitation!}
                      onResendInvitation={onResendInvitation!}
                      onCancelInvitation={onCancelInvitation!}
                      onUpdateRSVP={onUpdateRSVP!}
                      isOrganizer={isOrganizer}
                    />
                  )}

                  {activeTab === 'recurrence' && (
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <Repeat className="w-4 h-4 inline mr-1" />
                          Repeat Event
                        </label>
                        <select
                          {...form.register('recurrence_pattern.frequency')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Does not repeat</option>
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                          <option value="monthly">Monthly</option>
                          <option value="yearly">Yearly</option>
                        </select>
                      </div>

                      {watchedValues.recurrence_pattern?.frequency && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Repeat every
                            </label>
                            <div className="flex items-center space-x-2">
                              <input
                                {...form.register('recurrence_pattern.interval', { valueAsNumber: true })}
                                type="number"
                                min="1"
                                max="999"
                                className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-600">
                                {watchedValues.recurrence_pattern.frequency}(s)
                              </span>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              End repeat
                            </label>
                            <div className="space-y-2">
                              <label className="flex items-center space-x-2">
                                <input type="radio" name="end_repeat" value="never" defaultChecked />
                                <span className="text-sm">Never</span>
                              </label>
                              <label className="flex items-center space-x-2">
                                <input type="radio" name="end_repeat" value="after" />
                                <span className="text-sm">After</span>
                                <input
                                  {...form.register('recurrence_pattern.count', { valueAsNumber: true })}
                                  type="number"
                                  min="1"
                                  max="1000"
                                  className="w-20 px-2 py-1 border border-gray-300 rounded-md text-sm"
                                />
                                <span className="text-sm">occurrences</span>
                              </label>
                              <label className="flex items-center space-x-2">
                                <input type="radio" name="end_repeat" value="on" />
                                <span className="text-sm">On</span>
                                <input
                                  {...form.register('recurrence_pattern.until')}
                                  type="datetime-local"
                                  className="px-2 py-1 border border-gray-300 rounded-md text-sm"
                                />
                              </label>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-6 border-t">
                    <div className="flex space-x-2">
                      {!isCreating && onDelete && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowDeleteDialog(true)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </Button>
                      )}
                    </div>
                    <div className="flex space-x-3">
                      <Button type="button" variant="outline" onClick={onClose}>
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={isLoading || isSubmitting || hasCriticalConflicts}
                        className="flex items-center space-x-2"
                      >
                        <Save className="w-4 h-4" />
                        <span>{isLoading ? 'Saving...' : 'Save Event'}</span>
                      </Button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Conflict Resolution Dialog */}
      {potentialEvent && (
        <ConflictResolutionDialog
          isOpen={showConflictDialog}
          onClose={() => setShowConflictDialog(false)}
          conflicts={detectedConflicts}
          event={potentialEvent}
          onResolutionSelect={handleConflictResolution}
          onIgnoreConflict={() => setShowConflictDialog(false)}
          onCancelEvent={onClose}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        title="Delete Event"
        description="Are you sure you want to delete this event? This action cannot be undone."
        confirmText="Delete"
        confirmVariant="destructive"
      />
    </>
  );
};

export default EnhancedEventModal;