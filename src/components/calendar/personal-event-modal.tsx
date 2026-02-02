'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormField,
  FormLabel,
  FormInput,
  FormTextarea,
  FormError,
} from '@/components/ui/form-components';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Loader2, X, Calendar, Clock, MapPin, FileText, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PersonalEventFormData {
  title: string;
  start_time: string;
  end_time: string;
  location: string;
  notes: string;
}

export interface PersonalEvent {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  location: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface PersonalEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event?: PersonalEvent | null;
  isCreating: boolean;
  onSave: (eventData: Omit<PersonalEvent, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  defaultDate?: Date;
  defaultStartTime?: string;
  defaultEndTime?: string;
  loading?: boolean;
}

export function PersonalEventModal({
  isOpen,
  onClose,
  event,
  isCreating,
  onSave,
  onDelete,
  defaultDate,
  defaultStartTime,
  defaultEndTime,
  loading = false,
}: PersonalEventModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<PersonalEventFormData>({
    defaultValues: {
      title: '',
      start_time: '',
      end_time: '',
      location: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (event) {
        setValue('title', event.title);
        setValue('start_time', formatDateTimeLocal(event.start_time));
        setValue('end_time', formatDateTimeLocal(event.end_time));
        setValue('location', event.location || '');
        setValue('notes', event.notes || '');
      } else {
        const now = defaultDate || new Date();
        const start = defaultStartTime || new Date(now.getTime() + 60 * 60 * 1000).toISOString().slice(0, 16);
        const end = defaultEndTime || new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString().slice(0, 16);
        
        reset({
          title: '',
          start_time: start,
          end_time: end,
          location: '',
          notes: '',
        });
      }
      setError(null);
    }
  }, [isOpen, event, defaultDate, defaultStartTime, defaultEndTime, setValue, reset]);

  const onSubmit = async (data: PersonalEventFormData) => {
    setIsSaving(true);
    setError(null);

    try {
      await onSave({
        title: data.title,
        start_time: new Date(data.start_time).toISOString(),
        end_time: new Date(data.end_time).toISOString(),
        location: data.location || null,
        notes: data.notes || null,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save event');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!event || !onDelete) return;

    setIsDeleting(true);
    setError(null);

    try {
      await onDelete(event.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete event');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn("sm:max-w-[500px]", "bg-white")}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {isCreating ? 'Create Event' : 'Edit Event'}
          </DialogTitle>
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </DialogHeader>

        <Form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
              {error}
            </div>
          )}

          <FormField>
            <FormLabel htmlFor="title" required>Event Title</FormLabel>
            <FormInput
              id="title"
              {...register('title', { required: 'Title is required' })}
              placeholder="Enter event title"
              disabled={loading}
              error={!!errors.title}
            />
            {errors.title && <FormError>{errors.title.message}</FormError>}
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField>
              <FormLabel htmlFor="start_time" required>
                <Clock className="h-3 w-3 inline mr-1" />
                Start Time
              </FormLabel>
              <FormInput
                id="start_time"
                type="datetime-local"
                {...register('start_time', { required: 'Start time is required' })}
                disabled={loading}
                error={!!errors.start_time}
              />
              {errors.start_time && <FormError>{errors.start_time.message}</FormError>}
            </FormField>

            <FormField>
              <FormLabel htmlFor="end_time" required>
                <Clock className="h-3 w-3 inline mr-1" />
                End Time
              </FormLabel>
              <FormInput
                id="end_time"
                type="datetime-local"
                {...register('end_time', { required: 'End time is required' })}
                disabled={loading}
                error={!!errors.end_time}
              />
              {errors.end_time && <FormError>{errors.end_time.message}</FormError>}
            </FormField>
          </div>

          <FormField>
            <FormLabel htmlFor="location">
              <MapPin className="h-3 w-3 inline mr-1" />
              Location
            </FormLabel>
            <FormInput
              id="location"
              {...register('location')}
              placeholder="Enter location or leave empty"
              disabled={loading}
            />
          </FormField>

          <FormField>
            <FormLabel htmlFor="notes">
              <FileText className="h-3 w-3 inline mr-1" />
              Notes
            </FormLabel>
            <FormTextarea
              id="notes"
              {...register('notes')}
              placeholder="Add any notes about this event"
              rows={4}
              disabled={loading}
            />
          </FormField>

          <DialogFooter className="flex justify-between items-center pt-4">
            <div>
              {!isCreating && onDelete && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isDeleting || loading}
                  className="gap-1"
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Delete
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading || isSaving || isDeleting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading || isSaving || isDeleting}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  'Save Event'
                )}
              </Button>
            </div>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function formatDateTimeLocal(dateString: string): string {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
