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
import { Loader2, X, Calendar, Clock, MapPin, FileText, Trash2, Share2, Copy, RefreshCw, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toggleShare, regenerateShareSlug } from '@/lib/supabase/events';

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
  share_slug?: string | null;
  share_enabled?: boolean;
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
  const [shareEnabled, setShareEnabled] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

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
        
        // Initialize share state
        setShareEnabled(event.share_enabled || false);
        if (event.share_slug) {
          const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
          setShareLink(`${baseUrl}/e/${event.share_slug}`);
        } else {
          setShareLink('');
        }
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
        setShareEnabled(false);
        setShareLink('');
      }
      setError(null);
      setCopied(false);
    }
  }, [isOpen, event, defaultDate, defaultStartTime, defaultEndTime, setValue, reset]);

  const handleToggleShare = async () => {
    if (!event || isCreating) return;

    try {
      const newShareEnabled = !shareEnabled;
      const { data, error: toggleError } = await toggleShare(event.id, newShareEnabled);
      
      if (toggleError || !data) {
        setError('Failed to toggle sharing');
        return;
      }

      setShareEnabled(newShareEnabled);
      if (newShareEnabled && data.share_slug) {
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
        setShareLink(`${baseUrl}/e/${data.share_slug}`);
      } else {
        setShareLink('');
      }
    } catch (err) {
      setError('Failed to toggle sharing');
    }
  };

  const handleCopyLink = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRegenerateSlug = async () => {
    if (!event || isCreating) return;

    setRegenerating(true);
    try {
      const { data, error: regenError } = await regenerateShareSlug(event.id);
      
      if (regenError || !data || !data.share_slug) {
        setError('Failed to regenerate link');
        return;
      }

      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      setShareLink(`${baseUrl}/e/${data.share_slug}`);
    } catch (err) {
      setError('Failed to regenerate link');
    } finally {
      setRegenerating(false);
    }
  };

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

          {/* Share Section - only show for existing events */}
          {!isCreating && event && (
            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Share2 className="h-4 w-4 text-gray-600" />
                  <span className="font-medium text-sm">Public Sharing</span>
                </div>
                <button
                  type="button"
                  onClick={handleToggleShare}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                    shareEnabled ? "bg-blue-600" : "bg-gray-200"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                      shareEnabled ? "translate-x-6" : "translate-x-1"
                    )}
                  />
                </button>
              </div>

              {shareEnabled && shareLink && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={shareLink}
                      readOnly
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md bg-gray-50"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCopyLink}
                      className="gap-1"
                    >
                      {copied ? (
                        <>
                          <Check className="h-4 w-4" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRegenerateSlug}
                    disabled={regenerating}
                    className="w-full gap-1 text-xs"
                  >
                    {regenerating ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Regenerating...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-3 w-3" />
                        Regenerate Link
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-gray-500">
                    Anyone with this link can view the event title, time, and location. Notes remain private.
                  </p>
                </div>
              )}
            </div>
          )}

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
