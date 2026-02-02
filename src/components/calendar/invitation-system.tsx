'use client';

import React, { useState, useCallback, useMemo } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { CalendarEvent, CalendarInvitationDetails, RSVPStatus } from '@/types/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  Mail,
  Users,
  Clock,
  MapPin,
  Check,
  X,
  AlertCircle,
  Send,
  UserPlus,
  Calendar,
  XCircle,
  Plus,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

interface InvitationSystemProps {
  event: CalendarEvent;
  invitations: CalendarInvitationDetails[];
  onSendInvitation: (invitations: { email: string; name: string; message?: string }[]) => void;
  onResendInvitation: (invitationId: string) => void;
  onCancelInvitation: (invitationId: string) => void;
  onUpdateRSVP: (invitationId: string, rsvpStatus: RSVPStatus, note?: string) => void;
  isOrganizer?: boolean;
}

interface InviteGuestsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSendInvitations: (invitations: { email: string; name: string; message?: string }[]) => void;
  event: CalendarEvent;
}

interface RSVPDialogProps {
  isOpen: boolean;
  onClose: () => void;
  invitation: CalendarInvitationDetails;
  onUpdateRSVP: (rsvpStatus: RSVPStatus, note?: string) => void;
}

const inviteGuestsSchema = z.object({
  guests: z.array(z.object({
    email: z.string().email('Invalid email address'),
    name: z.string().min(1, 'Name is required'),
  })).min(1, 'At least one guest is required'),
  message: z.string().max(500).optional(),
});

type InviteGuestsForm = z.infer<typeof inviteGuestsSchema>;

const rsvpSchema = z.object({
  rsvpStatus: z.enum(['accepted', 'declined', 'tentative']),
  note: z.string().max(200).optional(),
});

type RSVPForm = z.infer<typeof rsvpSchema>;

const RSVPStatusBadge: React.FC<{ status: RSVPStatus }> = ({ status }) => {
  const getStatusConfig = (status: RSVPStatus) => {
    switch (status) {
      case 'accepted':
        return { color: 'bg-green-100 text-green-800', icon: Check, label: 'Accepted' };
      case 'declined':
        return { color: 'bg-red-100 text-red-800', icon: X, label: 'Declined' };
      case 'tentative':
        return { color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle, label: 'Tentative' };
      case 'pending':
        return { color: 'bg-gray-100 text-gray-800', icon: Clock, label: 'Pending' };
      case 'no_response':
        return { color: 'bg-gray-100 text-gray-600', icon: Clock, label: 'No Response' };
      default:
        return { color: 'bg-gray-100 text-gray-600', icon: AlertCircle, label: 'Unknown' };
    }
  };

  const { color, icon: Icon, label } = getStatusConfig(status);

  return (
    <div className={cn('inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium', color)}>
      <Icon className="w-3 h-3" />
      <span>{label}</span>
    </div>
  );
};

const InviteGuestsDialog: React.FC<InviteGuestsDialogProps> = ({
  isOpen,
  onClose,
  onSendInvitations,
  event,
}) => {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<InviteGuestsForm>({
    resolver: zodResolver(inviteGuestsSchema),
    defaultValues: {
      guests: [{ email: '', name: '' }],
      message: `You're invited to "${event.title}"`,
    },
  });

  const guests = watch('guests');

  const addGuest = useCallback(() => {
    setValue('guests', [...guests, { email: '', name: '' }]);
  }, [guests, setValue]);

  const removeGuest = useCallback((index: number) => {
    if (guests.length > 1) {
      setValue('guests', guests.filter((_, i) => i !== index));
    }
  }, [guests, setValue]);

  const onSubmit = useCallback(async (data: InviteGuestsForm) => {
    try {
      await onSendInvitations(data.guests.map(guest => ({
        ...guest,
        message: data.message,
      })));
      reset();
      onClose();
    } catch (error) {
      console.error('Error sending invitations:', error);
    }
  }, [onSendInvitations, reset, onClose]);

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 animate-in fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl max-h-[90vh] overflow-y-auto -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-lg animate-in fade-in-0 zoom-in-95">
          <div className="p-6">
            <div className="flex items-center justify-between pb-4 border-b">
              <div>
                <Dialog.Title className="text-lg font-semibold text-gray-900">
                  Invite Guests
                </Dialog.Title>
                <Dialog.Description className="text-sm text-gray-600 mt-1">
                  Send invitations for "{event.title}"
                </Dialog.Description>
              </div>
              <Dialog.Close className="text-gray-400 hover:text-gray-600">
                <XCircle className="w-6 h-6" />
              </Dialog.Close>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-6">
              {/* Event Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">{event.title}</h3>
                <div className="space-y-1 text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4" />
                    <span>
                      {format(new Date(event.start_time), 'MMM d, yyyy HH:mm')} -
                      {format(new Date(event.end_time), 'HH:mm')}
                    </span>
                  </div>
                  {event.location && (
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4" />
                      <span>{event.location}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Guests */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-900">Guest List</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addGuest}
                    className="flex items-center space-x-1"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Guest</span>
                  </Button>
                </div>

                <div className="space-y-3">
                  {guests.map((guest, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <div className="flex-1 grid grid-cols-2 gap-3">
                        <div>
                          <input
                            {...register(`guests.${index}.name`)}
                            placeholder="Guest name"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          {errors.guests?.[index]?.name && (
                            <p className="text-red-500 text-xs mt-1">
                              {errors.guests[index]?.name?.message}
                            </p>
                          )}
                        </div>
                        <div>
                          <input
                            {...register(`guests.${index}.email`)}
                            type="email"
                            placeholder="Guest email"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          {errors.guests?.[index]?.email && (
                            <p className="text-red-500 text-xs mt-1">
                              {errors.guests[index]?.email?.message}
                            </p>
                          )}
                        </div>
                      </div>
                      {guests.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeGuest(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Message */}
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                  Invitation Message
                </label>
                <textarea
                  {...register('message')}
                  rows={3}
                  placeholder="Optional personal message to include with the invitation"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.message && (
                  <p className="text-red-500 text-xs mt-1">{errors.message.message}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="flex items-center space-x-2">
                  <Send className="w-4 h-4" />
                  <span>{isSubmitting ? 'Sending...' : 'Send Invitations'}</span>
                </Button>
              </div>
            </form>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

const RSVPDialog: React.FC<RSVPDialogProps> = ({
  isOpen,
  onClose,
  invitation,
  onUpdateRSVP,
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RSVPForm>({
    resolver: zodResolver(rsvpSchema),
    defaultValues: {
      rsvpStatus: invitation.rsvp_status as RSVPStatus,
      note: '',
    },
  });

  const onSubmit = useCallback(async (data: RSVPForm) => {
    try {
      await onUpdateRSVP(data.rsvpStatus, data.note);
      onClose();
    } catch (error) {
      console.error('Error updating RSVP:', error);
    }
  }, [onUpdateRSVP, onClose]);

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 animate-in fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-lg animate-in fade-in-0 zoom-in-95">
          <div className="p-6">
            <div className="flex items-center justify-between pb-4 border-b">
              <Dialog.Title className="text-lg font-semibold text-gray-900">
                RSVP Response
              </Dialog.Title>
              <Dialog.Close className="text-gray-400 hover:text-gray-600">
                <XCircle className="w-6 h-6" />
              </Dialog.Close>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-6">
              {/* Response Options */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Your Response
                </label>
                <div className="space-y-2">
                  {[
                    { value: 'accepted', label: 'Accept', icon: Check, color: 'text-green-600' },
                    { value: 'declined', label: 'Decline', icon: X, color: 'text-red-600' },
                    { value: 'tentative', label: 'Maybe', icon: AlertCircle, color: 'text-yellow-600' },
                  ].map(({ value, label, icon: Icon, color }) => (
                    <label key={value} className="flex items-center space-x-3 cursor-pointer">
                      <input
                        {...register('rsvpStatus')}
                        type="radio"
                        value={value}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <Icon className={cn('w-4 h-4', color)} />
                      <span className="text-sm font-medium text-gray-900">{label}</span>
                    </label>
                  ))}
                </div>
                {errors.rsvpStatus && (
                  <p className="text-red-500 text-xs mt-1">{errors.rsvpStatus.message}</p>
                )}
              </div>

              {/* Optional Note */}
              <div>
                <label htmlFor="note" className="block text-sm font-medium text-gray-700 mb-2">
                  Optional Note
                </label>
                <textarea
                  {...register('note')}
                  rows={3}
                  placeholder="Add a personal note with your response"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.note && (
                  <p className="text-red-500 text-xs mt-1">{errors.note.message}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Updating...' : 'Submit Response'}
                </Button>
              </div>
            </form>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export const InvitationSystem: React.FC<InvitationSystemProps> = ({
  event,
  invitations,
  onSendInvitation,
  onResendInvitation,
  onCancelInvitation,
  onUpdateRSVP,
  isOrganizer = false,
}) => {
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showRSVPDialog, setShowRSVPDialog] = useState(false);
  const [selectedInvitation, setSelectedInvitation] = useState<CalendarInvitationDetails | null>(null);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = invitations.length;
    const accepted = invitations.filter(i => i.rsvp_status === 'accepted').length;
    const declined = invitations.filter(i => i.rsvp_status === 'declined').length;
    const tentative = invitations.filter(i => i.rsvp_status === 'tentative').length;
    const pending = invitations.filter(i => ['pending', 'no_response'].includes(i.rsvp_status)).length;

    return { total, accepted, declined, tentative, pending };
  }, [invitations]);

  const handleRSVP = useCallback((invitation: CalendarInvitationDetails) => {
    setSelectedInvitation(invitation);
    setShowRSVPDialog(true);
  }, []);

  const handleUpdateRSVP = useCallback(async (rsvpStatus: RSVPStatus, note?: string) => {
    if (selectedInvitation) {
      await onUpdateRSVP(selectedInvitation.id, rsvpStatus, note);
    }
  }, [selectedInvitation, onUpdateRSVP]);

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Event Invitations</h3>
          <p className="text-sm text-gray-600">
            {stats.total} guest{stats.total !== 1 ? 's' : ''} invited
          </p>
        </div>
        {isOrganizer && (
          <Button
            onClick={() => setShowInviteDialog(true)}
            className="flex items-center space-x-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>Invite Guests</span>
          </Button>
        )}
      </div>

      {/* RSVP Statistics */}
      {stats.total > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <Check className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-900">Accepted</span>
            </div>
            <p className="text-2xl font-bold text-green-600 mt-1">{stats.accepted}</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <X className="w-4 h-4 text-red-600" />
              <span className="text-sm font-medium text-red-900">Declined</span>
            </div>
            <p className="text-2xl font-bold text-red-600 mt-1">{stats.declined}</p>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-900">Tentative</span>
            </div>
            <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.tentative}</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-900">Pending</span>
            </div>
            <p className="text-2xl font-bold text-gray-600 mt-1">{stats.pending}</p>
          </div>
        </div>
      )}

      {/* Invitations List */}
      {invitations.length > 0 ? (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">Guest List</h4>
          <div className="divide-y divide-gray-200">
            {invitations.map((invitation) => (
              <div key={invitation.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                      <Users className="w-4 h-4 text-gray-600" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {invitation.invitee_name || invitation.invitee_email}
                    </p>
                    <p className="text-xs text-gray-500">{invitation.invitee_email}</p>
                    {invitation.response_at && (
                      <p className="text-xs text-gray-500">
                        Responded {format(new Date(invitation.response_at), 'MMM d, HH:mm')}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <RSVPStatusBadge status={invitation.rsvp_status as RSVPStatus} />
                  {!isOrganizer && ['pending', 'no_response'].includes(invitation.rsvp_status) && (
                    <Button
                      size="sm"
                      onClick={() => handleRSVP(invitation)}
                      className="flex items-center space-x-1"
                    >
                      <Calendar className="w-3 h-3" />
                      <span>RSVP</span>
                    </Button>
                  )}
                  {isOrganizer && (
                    <div className="flex items-center space-x-1">
                      {['pending', 'no_response'].includes(invitation.rsvp_status) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onResendInvitation(invitation.id)}
                        >
                          <Mail className="w-3 h-3" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onCancelInvitation(invitation.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Invitations Yet</h3>
          <p className="text-gray-600 mb-4">
            Start by inviting guests to your event
          </p>
          {isOrganizer && (
            <Button onClick={() => setShowInviteDialog(true)}>
              Invite Your First Guest
            </Button>
          )}
        </div>
      )}

      {/* Dialogs */}
      <InviteGuestsDialog
        isOpen={showInviteDialog}
        onClose={() => setShowInviteDialog(false)}
        onSendInvitations={onSendInvitation}
        event={event}
      />

      {selectedInvitation && (
        <RSVPDialog
          isOpen={showRSVPDialog}
          onClose={() => {
            setShowRSVPDialog(false);
            setSelectedInvitation(null);
          }}
          invitation={selectedInvitation}
          onUpdateRSVP={handleUpdateRSVP}
        />
      )}
    </div>
  );
};

export default InvitationSystem;