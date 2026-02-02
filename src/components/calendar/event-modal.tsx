'use client';

import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CalendarEvent } from '@/types/calendar';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormField,
  FormLabel,
  FormInput,
  FormError,
  FormSection,
} from '@/components/ui/form-components';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { ConflictDetection } from './conflict-detection';
import { X, Calendar, Clock, MapPin, Users, Repeat, Bell, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Event validation schema
const eventSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters'),
  description: z
    .string()
    .max(2000, 'Description must be less than 2000 characters')
    .optional(),
  start_time: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), 'Invalid start date and time'),
  end_time: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), 'Invalid end date and time'),
  location: z
    .string()
    .max(500, 'Location must be less than 500 characters')
    .optional(),
  is_all_day: z.boolean().default(false),
  is_private: z.boolean().default(false),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  category: z
    .string()
    .max(100, 'Category must be less than 100 characters')
    .optional(),
  reminder_minutes: z
    .number()
    .min(0)
    .max(43200) // Max 30 days in minutes
    .optional(),
  recurring_type: z
    .enum(['none', 'daily', 'weekly', 'monthly', 'yearly'])
    .default('none'),
});

type EventFormData = z.infer<typeof eventSchema>;

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event?: CalendarEvent | null;
  isCreating: boolean;
  onSave: (eventData: Partial<CalendarEvent>) => Promise<void>;
  onDelete?: () => Promise<void>;
  defaultDate?: Date;
  allEvents?: CalendarEvent[];
}

export function EventModal({
  isOpen,
  onClose,
  event,
  isCreating,
  onSave,
  onDelete,
  defaultDate = new Date(),
  allEvents = [],
}: EventModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [currentEventForConflicts, setCurrentEventForConflicts] = useState<CalendarEvent | null>(null);

  const form = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: '',
      description: '',
      start_time: '',
      end_time: '',
      location: '',
      is_all_day: false,
      is_private: false,
      priority: 'medium',
      category: '',
      reminder_minutes: 15,
      recurring_type: 'none',
    },
  });

  // Format date for datetime-local input
  const formatDateTimeLocal = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Reset form when event changes or modal opens/closes
  useEffect(() => {
    if (isOpen) {
      if (event && !isCreating) {
        // Editing existing event
        const startDate = new Date(event.start_time);
        const endDate = new Date(event.end_time);

        form.reset({
          title: event.title || '',
          description: event.description || '',
          start_time: formatDateTimeLocal(startDate),
          end_time: formatDateTimeLocal(endDate),
          location: event.location || '',
          is_all_day: event.is_all_day || false,
          is_private: event.is_private || false,
          priority: (event.priority as 'low' | 'medium' | 'high') || 'medium',
          category: event.category || '',
          reminder_minutes: event.reminder_minutes || 15,
          recurring_type: (event.recurring_type as any) || 'none',
        });
      } else {
        // Creating new event
        const startDate = new Date(defaultDate);
        const endDate = new Date(defaultDate.getTime() + 60 * 60 * 1000); // +1 hour

        form.reset({
          title: '',
          description: '',
          start_time: formatDateTimeLocal(startDate),
          end_time: formatDateTimeLocal(endDate),
          location: '',
          is_all_day: false,
          is_private: false,
          priority: 'medium',
          category: '',
          reminder_minutes: 15,
          recurring_type: 'none',
        });
      }
      setError(null);
    }
  }, [event, isCreating, isOpen, defaultDate, form]);

  // Create current event for conflict detection when form data changes
  useEffect(() => {
    const formData = form.watch();
    if (formData.start_time && formData.end_time && formData.title) {
      const conflictEvent: CalendarEvent = {
        id: event?.id || 'temp-id',
        user_id: event?.user_id || '',
        title: formData.title,
        description: formData.description || null,
        start_time: formData.start_time,
        end_time: formData.end_time,
        location: formData.location || null,
        is_all_day: formData.is_all_day || false,
        is_private: formData.is_private || false,
        priority: formData.priority || 'medium',
        category: formData.category || null,
        reminder_minutes: formData.reminder_minutes || null,
        recurring_type: formData.recurring_type || 'none',
        created_at: event?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as CalendarEvent;

      setCurrentEventForConflicts(conflictEvent);
    }
  }, [form.watch(), event]);

  const onSubmit = async (data: EventFormData) => {
    try {
      setIsLoading(true);
      setError(null);

      // Validate that end time is after start time
      const startTime = new Date(data.start_time);
      const endTime = new Date(data.end_time);

      if (endTime <= startTime) {
        setError('End time must be after start time');
        return;
      }

      await onSave({
        ...data,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
      });
    } catch (err) {
      console.error('Error saving event:', err);
      setError(err instanceof Error ? err.message : 'Failed to save event');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;

    try {
      setIsLoading(true);
      await onDelete();
      setShowDeleteDialog(false);
    } catch (err) {
      console.error('Error deleting event:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete event');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplySuggestion = (suggestion: { start: Date; end: Date; reason: string }) => {
    form.setValue('start_time', formatDateTimeLocal(suggestion.start));
    form.setValue('end_time', formatDateTimeLocal(suggestion.end));
  };

  if (!isOpen) return null;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black bg-opacity-50"
              onClick={onClose}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      {isCreating ? 'Create Event' : 'Edit Event'}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {isCreating
                        ? 'Add a new event to your calendar'
                        : 'Update event details'
                      }
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {!isCreating && onDelete && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowDeleteDialog(true)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onClose}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Form */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-12rem)]">
                <Form onSubmit={form.handleSubmit(onSubmit)}>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg"
                    >
                      <p className="text-sm text-red-800">{error}</p>
                    </motion.div>
                  )}

                  <div className="space-y-6">
                    {/* Basic Information */}
                    <FormSection>
                      <FormField>
                        <FormLabel htmlFor="title" required>
                          Event Title
                        </FormLabel>
                        <FormInput
                          id="title"
                          type="text"
                          placeholder="Enter event title"
                          error={!!form.formState.errors.title}
                          {...form.register('title')}
                        />
                        <FormError>
                          {form.formState.errors.title?.message}
                        </FormError>
                      </FormField>

                      <FormField>
                        <FormLabel htmlFor="description">
                          Description
                        </FormLabel>
                        <textarea
                          id="description"
                          rows={3}
                          placeholder="Add event description (optional)"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          {...form.register('description')}
                        />
                        <FormError>
                          {form.formState.errors.description?.message}
                        </FormError>
                      </FormField>
                    </FormSection>

                    {/* Date and Time */}
                    <FormSection title="Date & Time" icon={<Clock className="w-4 h-4" />}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField>
                          <FormLabel htmlFor="start_time" required>
                            Start Date & Time
                          </FormLabel>
                          <FormInput
                            id="start_time"
                            type="datetime-local"
                            error={!!form.formState.errors.start_time}
                            {...form.register('start_time')}
                          />
                          <FormError>
                            {form.formState.errors.start_time?.message}
                          </FormError>
                        </FormField>

                        <FormField>
                          <FormLabel htmlFor="end_time" required>
                            End Date & Time
                          </FormLabel>
                          <FormInput
                            id="end_time"
                            type="datetime-local"
                            error={!!form.formState.errors.end_time}
                            {...form.register('end_time')}
                          />
                          <FormError>
                            {form.formState.errors.end_time?.message}
                          </FormError>
                        </FormField>
                      </div>

                      <div className="flex items-center space-x-3">
                        <Controller
                          name="is_all_day"
                          control={form.control}
                          render={({ field }) => (
                            <label className="flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={field.value}
                                onChange={field.onChange}
                                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                              />
                              <span className="ml-2 text-sm text-gray-700">All day event</span>
                            </label>
                          )}
                        />
                      </div>
                    </FormSection>

                    {/* Conflict Detection */}
                    <FormSection title="Schedule Conflicts" icon={<Calendar className="w-4 h-4" />}>
                      <ConflictDetection
                        events={allEvents}
                        currentEvent={currentEventForConflicts}
                        onApplySuggestion={handleApplySuggestion}
                        className="w-full"
                      />
                    </FormSection>

                    {/* Location */}
                    <FormSection title="Location" icon={<MapPin className="w-4 h-4" />}>
                      <FormField>
                        <FormLabel htmlFor="location">
                          Event Location
                        </FormLabel>
                        <FormInput
                          id="location"
                          type="text"
                          placeholder="Add location (optional)"
                          error={!!form.formState.errors.location}
                          {...form.register('location')}
                        />
                        <FormError>
                          {form.formState.errors.location?.message}
                        </FormError>
                      </FormField>
                    </FormSection>

                    {/* Settings */}
                    <FormSection title="Settings" icon={<Users className="w-4 h-4" />}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField>
                          <FormLabel htmlFor="priority">
                            Priority
                          </FormLabel>
                          <select
                            id="priority"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            {...form.register('priority')}
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                          </select>
                        </FormField>

                        <FormField>
                          <FormLabel htmlFor="category">
                            Category
                          </FormLabel>
                          <FormInput
                            id="category"
                            type="text"
                            placeholder="e.g., Work, Personal, Meeting"
                            error={!!form.formState.errors.category}
                            {...form.register('category')}
                          />
                        </FormField>
                      </div>

                      <div className="flex items-center space-x-6">
                        <Controller
                          name="is_private"
                          control={form.control}
                          render={({ field }) => (
                            <label className="flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={field.value}
                                onChange={field.onChange}
                                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                              />
                              <span className="ml-2 text-sm text-gray-700">Private event</span>
                            </label>
                          )}
                        />
                      </div>
                    </FormSection>

                    {/* Reminders and Recurrence */}
                    <FormSection title="Reminders & Recurrence" icon={<Bell className="w-4 h-4" />}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField>
                          <FormLabel htmlFor="reminder_minutes">
                            Remind me
                          </FormLabel>
                          <select
                            id="reminder_minutes"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            {...form.register('reminder_minutes', { valueAsNumber: true })}
                          >
                            <option value={0}>No reminder</option>
                            <option value={5}>5 minutes before</option>
                            <option value={15}>15 minutes before</option>
                            <option value={30}>30 minutes before</option>
                            <option value={60}>1 hour before</option>
                            <option value={120}>2 hours before</option>
                            <option value={1440}>1 day before</option>
                          </select>
                        </FormField>

                        <FormField>
                          <FormLabel htmlFor="recurring_type">
                            Repeat
                          </FormLabel>
                          <select
                            id="recurring_type"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            {...form.register('recurring_type')}
                          >
                            <option value="none">No repeat</option>
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                            <option value="yearly">Yearly</option>
                          </select>
                        </FormField>
                      </div>
                    </FormSection>
                  </div>
                </Form>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isLoading}
                >
                  Cancel
                </Button>

                <Button
                  type="button"
                  onClick={form.handleSubmit(onSubmit)}
                  disabled={isLoading}
                  className="min-w-[120px]"
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Saving...
                    </div>
                  ) : isCreating ? (
                    'Create Event'
                  ) : (
                    'Update Event'
                  )}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        title="Delete Event"
        message="Are you sure you want to delete this event? This action cannot be undone."
        confirmText="Delete Event"
        variant="destructive"
        isLoading={isLoading}
      />
    </>
  );
}