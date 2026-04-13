'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Loader2, Share2, Copy, RefreshCw, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toggleShare, regenerateShareSlug } from '@/lib/supabase/events';

type LocationType = 'none' | 'text' | 'maps';
type EventType = 'unlimited' | 'limited';
type Visibility = 'public' | 'private' | 'invite_only';

export interface PersonalEventFormDataV2 {
  title: string;
  start_date: string;
  start_time: string;
  end_time?: string;
  location_type: LocationType;
  location?: string;
  event_type: EventType;
  max_attendees?: number;
  visibility: Visibility;
  discoverable_by_others?: boolean;
  notes?: string;
}

export interface PersonalEventV2 {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  location: string | null;
  location_type: LocationType;
  notes: string | null;
  max_attendees: number | null;
  visibility: Visibility;
  discoverable_by_others?: boolean;
  share_slug?: string | null;
  share_enabled?: boolean;
  created_at: string;
  updated_at: string;
}

interface PersonalEventModalV2Props {
  isOpen: boolean;
  onClose: () => void;
  event?: PersonalEventV2 | null;
  isCreating: boolean;
  onSave: (eventData: Omit<PersonalEventV2, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  defaultDate?: Date;
  loading?: boolean;
}

export function PersonalEventModalV2({
  isOpen,
  onClose,
  event,
  isCreating,
  onSave,
  onDelete,
  defaultDate,
  loading = false,
}: PersonalEventModalV2Props) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationType, setLocationType] = useState<LocationType>('none');
  const [eventType, setEventType] = useState<EventType>('unlimited');
  const [visibility, setVisibility] = useState<Visibility>('public');
  const [shareEnabled, setShareEnabled] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [shareSlug, setShareSlug] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isValid },
  } = useForm<PersonalEventFormDataV2>({
    mode: 'onChange',
    defaultValues: {
      title: '',
      start_date: '',
      start_time: '',
      end_time: '',
      location_type: 'none',
      location: '',
      event_type: 'unlimited',
      max_attendees: undefined,
      visibility: 'public',
      discoverable_by_others: false,
      notes: '',
    },
  });

  const title = watch('title');
  const startDate = watch('start_date');
  const startTime = watch('start_time');

  // Validation: Create Event disabled until title + start date + time
  const canSubmit = title?.trim() && startDate && startTime && !isSaving && !loading;

  useEffect(() => {
    if (isOpen) {
      if (event) {
        const startDateTime = new Date(event.start_time);
        const endDateTime = new Date(event.end_time);
        
        setValue('title', event.title);
        setValue('start_date', startDateTime.toISOString().split('T')[0]);
        setValue('start_time', startDateTime.toTimeString().slice(0, 5));
        setValue('end_time', endDateTime.toTimeString().slice(0, 5));
        setValue('location', event.location || '');
        setValue('notes', event.notes || '');
        
        const locType = event.location_type || 'none';
        setLocationType(locType);
        setValue('location_type', locType);
        
        const evtType = event.max_attendees ? 'limited' : 'unlimited';
        setEventType(evtType);
        setValue('event_type', evtType);
        setValue('max_attendees', event.max_attendees || undefined);
        
        const vis = event.visibility || 'public';
        setVisibility(vis);
        setValue('visibility', vis);
        setValue('discoverable_by_others', !!event.discoverable_by_others);

        setShareEnabled(event.share_enabled || false);
        setShareSlug(event.share_slug || null);
        if (event.share_slug) {
          const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
          setShareLink(`${baseUrl}/e/${event.share_slug}`);
        } else {
          setShareLink('');
        }
      } else {
        // Default to today + next full hour
        const now = defaultDate || new Date();
        const nextHour = new Date(now);
        nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
        
        reset({
          title: '',
          start_date: now.toISOString().split('T')[0],
          start_time: nextHour.toTimeString().slice(0, 5),
          end_time: '',
          location_type: 'none',
          location: '',
          event_type: 'unlimited',
          max_attendees: undefined,
          visibility: 'public',
          discoverable_by_others: false,
          notes: '',
        });
        setLocationType('none');
        setEventType('unlimited');
        setVisibility('public');
        setShareEnabled(false);
        setShareSlug(null);
        setShareLink('');
      }
      setError(null);
      setCopied(false);
    }
  }, [isOpen, event, defaultDate, setValue, reset]);

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
      setShareSlug(data.share_slug || null);
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

  const handleCopyLink = async () => {
    if (!shareLink) return;

    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError('Failed to copy link');
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
      setShareSlug(data.share_slug);
      setShareLink(`${baseUrl}/e/${data.share_slug}`);
      setShareEnabled(true);
    } catch (err) {
      setError('Failed to regenerate link');
    } finally {
      setRegenerating(false);
    }
  };

  const onSubmit = async (data: PersonalEventFormDataV2) => {
    setIsSaving(true);
    setError(null);

    try {
      // Combine date + time
      const startDateTime = new Date(`${data.start_date}T${data.start_time}`);
      let endDateTime: Date;
      
      if (data.end_time) {
        endDateTime = new Date(`${data.start_date}T${data.end_time}`);
        // If end time is before start time, assume next day
        if (endDateTime < startDateTime) {
          endDateTime.setDate(endDateTime.getDate() + 1);
        }
      } else {
        // Default: 1 hour after start
        endDateTime = new Date(startDateTime);
        endDateTime.setHours(endDateTime.getHours() + 1);
      }

      await onSave({
        title: data.title,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        location: locationType === 'none' ? null : (data.location || null),
        location_type: locationType,
        notes: data.notes || null,
        max_attendees: eventType === 'limited' ? (data.max_attendees || null) : null,
        visibility: visibility,
        discoverable_by_others: !!data.discoverable_by_others,
        share_slug: shareSlug,
        share_enabled: shareEnabled,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save event');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn(
        "sm:max-w-[480px]",
        "bg-[#1a1a2e] text-white border-none shadow-2xl"
      )}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 p-6">
          {error && (
            <div className="p-3 text-sm text-red-400 bg-red-900/20 rounded-md border border-red-800">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Event Title <span className="text-red-400">*</span>
            </label>
            <input
              {...register('title', { 
                required: 'Title is required',
                maxLength: { value: 80, message: 'Max 80 characters' }
              })}
              placeholder="AI Meetup"
              maxLength={80}
              className={cn(
                "w-full px-4 py-3 rounded-md",
                "bg-white text-gray-900",
                "border border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20",
                "outline-none transition-all",
                errors.title && "border-red-500"
              )}
              disabled={loading}
            />
            {errors.title && (
              <p className="text-xs text-red-400 mt-1">{errors.title.message}</p>
            )}
          </div>

          {/* Date & Time side-by-side */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Date <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                {...register('start_date', { required: 'Date is required' })}
                className={cn(
                  "w-full px-4 py-3 rounded-md",
                  "bg-white text-gray-900",
                  "border border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20",
                  "outline-none transition-all",
                  errors.start_date && "border-red-500"
                )}
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Time <span className="text-red-400">*</span>
              </label>
              <input
                type="time"
                {...register('start_time', { required: 'Time is required' })}
                className={cn(
                  "w-full px-4 py-3 rounded-md",
                  "bg-white text-gray-900",
                  "border border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20",
                  "outline-none transition-all",
                  errors.start_time && "border-red-500"
                )}
                disabled={loading}
              />
            </div>
          </div>

          {/* End Time (optional) */}
          <div>
            <label className="block text-sm font-medium mb-2">
              End Time (optional)
            </label>
            <input
              type="time"
              {...register('end_time')}
              className={cn(
                "w-full px-4 py-3 rounded-md",
                "bg-white text-gray-900",
                "border border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20",
                "outline-none transition-all"
              )}
              disabled={loading}
            />
          </div>

          {/* Location Type Toggle */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Location Type <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setLocationType('none');
                  setValue('location_type', 'none');
                  setValue('location', '');
                }}
                className={cn(
                  "px-4 py-3 rounded-md font-medium transition-all",
                  "border-2",
                  locationType === 'none'
                    ? "bg-[#2d2d44] border-purple-500 text-white"
                    : "bg-transparent border-gray-600 text-gray-400 hover:border-gray-500"
                )}
                disabled={loading}
              >
                None
              </button>
              <button
                type="button"
                onClick={() => {
                  setLocationType('text');
                  setValue('location_type', 'text');
                }}
                className={cn(
                  "px-4 py-3 rounded-md font-medium transition-all",
                  "border-2",
                  locationType === 'text'
                    ? "bg-[#2d2d44] border-purple-500 text-white"
                    : "bg-transparent border-gray-600 text-gray-400 hover:border-gray-500"
                )}
                disabled={loading}
              >
                Plain Text
              </button>
              <button
                type="button"
                onClick={() => {
                  setLocationType('maps');
                  setValue('location_type', 'maps');
                }}
                className={cn(
                  "px-4 py-3 rounded-md font-medium transition-all",
                  "border-2",
                  locationType === 'maps'
                    ? "bg-[#2d2d44] border-purple-500 text-white"
                    : "bg-transparent border-gray-600 text-gray-400 hover:border-gray-500"
                )}
                disabled={loading}
              >
                Google Maps
              </button>
            </div>
            {locationType === 'none' && (
              <p className="text-xs text-gray-500 mt-2">No location specified.</p>
            )}
          </div>

          {/* Location Input (conditionally shown) */}
          {locationType !== 'none' && (
            <div>
              <input
                {...register('location')}
                placeholder={
                  locationType === 'maps' 
                    ? "Enter address for Google Maps" 
                    : "Enter location details"
                }
                className={cn(
                  "w-full px-4 py-3 rounded-md",
                  "bg-white text-gray-900",
                  "border border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20",
                  "outline-none transition-all"
                )}
                disabled={loading}
              />
            </div>
          )}

          {/* Type Toggle (Unlimited / Limited) */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Type <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setEventType('unlimited');
                  setValue('event_type', 'unlimited');
                  setValue('max_attendees', undefined);
                }}
                className={cn(
                  "px-4 py-3 rounded-md font-medium transition-all",
                  "border-2",
                  eventType === 'unlimited'
                    ? "bg-[#2d2d44] border-purple-500 text-white"
                    : "bg-transparent border-gray-600 text-gray-400 hover:border-gray-500"
                )}
                disabled={loading}
              >
                Unlimited
              </button>
              <button
                type="button"
                onClick={() => {
                  setEventType('limited');
                  setValue('event_type', 'limited');
                }}
                className={cn(
                  "px-4 py-3 rounded-md font-medium transition-all",
                  "border-2",
                  eventType === 'limited'
                    ? "bg-[#2d2d44] border-purple-500 text-white"
                    : "bg-transparent border-gray-600 text-gray-400 hover:border-gray-500"
                )}
                disabled={loading}
              >
                Limited
              </button>
            </div>
          </div>

          {/* Max Attendees (conditionally shown) */}
          {eventType === 'limited' && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Max Attendees
              </label>
              <input
                type="number"
                {...register('max_attendees', { min: 1 })}
                placeholder="Enter max capacity"
                min={1}
                className={cn(
                  "w-full px-4 py-3 rounded-md",
                  "bg-white text-gray-900",
                  "border border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20",
                  "outline-none transition-all"
                )}
                disabled={loading}
              />
            </div>
          )}

          {/* Visibility Toggle */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Visibility <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setVisibility('public');
                  setValue('visibility', 'public');
                }}
                className={cn(
                  "px-4 py-3 rounded-md font-medium transition-all text-sm",
                  "border-2",
                  visibility === 'public'
                    ? "bg-[#2d2d44] border-purple-500 text-white"
                    : "bg-transparent border-gray-600 text-gray-400 hover:border-gray-500"
                )}
                disabled={loading}
              >
                🌐 Public
              </button>
              <button
                type="button"
                onClick={() => {
                  setVisibility('private');
                  setValue('visibility', 'private');
                }}
                className={cn(
                  "px-4 py-3 rounded-md font-medium transition-all text-sm",
                  "border-2",
                  visibility === 'private'
                    ? "bg-[#2d2d44] border-purple-500 text-white"
                    : "bg-transparent border-gray-600 text-gray-400 hover:border-gray-500"
                )}
                disabled={loading}
              >
                🔒 Private
              </button>
              <button
                type="button"
                onClick={() => {
                  setVisibility('invite_only');
                  setValue('visibility', 'invite_only');
                }}
                className={cn(
                  "px-4 py-3 rounded-md font-medium transition-all text-sm",
                  "border-2",
                  visibility === 'invite_only'
                    ? "bg-[#2d2d44] border-purple-500 text-white"
                    : "bg-transparent border-gray-600 text-gray-400 hover:border-gray-500"
                )}
                disabled={loading}
              >
                📧 Invite Only
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {visibility === 'public' && 'Public events are visible to everyone with calendar access.'}
              {visibility === 'private' && 'Private events are only visible to you.'}
              {visibility === 'invite_only' && 'Invite Only events require explicit invitation to view.'}
            </p>
          </div>

          {/* Discoverability Toggle (separate from visibility and share-link) */}
          <div className="border border-gray-700 rounded-md p-3 bg-[#141423]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Discoverable by others</p>
                <p className="text-xs text-gray-400 mt-1">
                  If enabled, this event can appear in Discover feed. This is separate from share-link and shared calendars.
                </p>
              </div>
              <input
                type="checkbox"
                {...register('discoverable_by_others')}
                className="h-4 w-4 rounded border-gray-500 text-purple-600 focus:ring-purple-500"
                disabled={loading}
              />
            </div>
          </div>

          {/* Notes (optional, hidden) */}
          <input type="hidden" {...register('notes')} />

          {/* Public Sharing - edit only */}
          {!isCreating && event && (
            <div className="border-t border-gray-700 pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Share2 className="h-4 w-4 text-gray-300" />
                  <span className="text-sm font-medium">Public Sharing</span>
                </div>
                <button
                  type="button"
                  onClick={handleToggleShare}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                    shareEnabled ? "bg-purple-600" : "bg-gray-600"
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
                      className="flex-1 px-3 py-2 text-sm rounded-md bg-white text-gray-900 border border-gray-300"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCopyLink}
                      className="gap-1 border-gray-600 bg-transparent text-gray-200 hover:bg-gray-800 hover:text-white"
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
                    className="w-full gap-1 text-xs text-gray-300 hover:bg-gray-800 hover:text-white"
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
                  <p className="text-xs text-gray-400">
                    Anyone with this link can view the event title, time, and location. Notes remain private.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="flex-1 bg-transparent border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white"
              disabled={loading || isSaving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!canSubmit}
              className={cn(
                "flex-1 font-semibold",
                "bg-gradient-to-r from-purple-600 to-purple-700",
                "hover:from-purple-700 hover:to-purple-800",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                'Create Event'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
