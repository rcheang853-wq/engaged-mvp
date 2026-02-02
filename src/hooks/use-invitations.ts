import { useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarInvitation, RSVPStatus } from '@/types/calendar';

interface InviteeData {
  email: string;
  name?: string;
  userId?: string;
}

interface SendInvitationRequest {
  eventId: string;
  invitees: InviteeData[];
  message?: string;
  expiresIn?: number; // hours
}

interface RSVPData {
  rsvpStatus: RSVPStatus;
  attendeeName?: string;
  attendeeInfo?: {
    dietary?: string;
    accessibility?: string;
    notes?: string;
  };
}

interface InvitationStats {
  total: number;
  pending: number;
  accepted: number;
  declined: number;
  tentative: number;
  expired: number;
  sent: number;
  delivered: number;
  failed: number;
}

const INVITATIONS_QUERY_KEY = 'invitations';

export function useInvitations() {
  const queryClient = useQueryClient();
  const [selectedInvitation, setSelectedInvitation] = useState<CalendarInvitation | null>(null);

  // Get sent invitations
  const {
    data: sentInvitations = [],
    isLoading: isLoadingSent,
    error: sentError,
    refetch: refetchSent
  } = useQuery({
    queryKey: [INVITATIONS_QUERY_KEY, 'sent'],
    queryFn: async (): Promise<CalendarInvitation[]> => {
      const response = await fetch('/api/calendar/invitations?type=sent');
      if (!response.ok) {
        throw new Error('Failed to fetch sent invitations');
      }
      const data = await response.json();
      return data.data || [];
    }
  });

  // Get received invitations
  const {
    data: receivedInvitations = [],
    isLoading: isLoadingReceived,
    error: receivedError,
    refetch: refetchReceived
  } = useQuery({
    queryKey: [INVITATIONS_QUERY_KEY, 'received'],
    queryFn: async (): Promise<CalendarInvitation[]> => {
      const response = await fetch('/api/calendar/invitations?type=received');
      if (!response.ok) {
        throw new Error('Failed to fetch received invitations');
      }
      const data = await response.json();
      return data.data || [];
    }
  });

  // Send invitations
  const sendInvitationsMutation = useMutation({
    mutationFn: async (request: SendInvitationRequest) => {
      const response = await fetch('/api/calendar/invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invitations');
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [INVITATIONS_QUERY_KEY] });
    }
  });

  // Update invitation status
  const updateInvitationMutation = useMutation({
    mutationFn: async ({
      invitationId,
      status,
      rsvpStatus
    }: {
      invitationId: string;
      status?: string;
      rsvpStatus?: RSVPStatus;
    }) => {
      const response = await fetch('/api/calendar/invitations', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invitationId,
          status,
          rsvpStatus
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update invitation');
      }

      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [INVITATIONS_QUERY_KEY] });
    }
  });

  // Cancel invitation
  const cancelInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const response = await fetch(`/api/calendar/invitations?id=${invitationId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to cancel invitation');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [INVITATIONS_QUERY_KEY] });
    }
  });

  // Send invitations wrapper
  const sendInvitations = useCallback(
    async (request: SendInvitationRequest) => {
      return sendInvitationsMutation.mutateAsync(request);
    },
    [sendInvitationsMutation]
  );

  // Respond to invitation (for received invitations)
  const respondToInvitation = useCallback(
    async (invitationId: string, rsvpStatus: RSVPStatus) => {
      return updateInvitationMutation.mutateAsync({
        invitationId,
        rsvpStatus
      });
    },
    [updateInvitationMutation]
  );

  // Cancel invitation wrapper
  const cancelInvitation = useCallback(
    async (invitationId: string) => {
      return cancelInvitationMutation.mutateAsync(invitationId);
    },
    [cancelInvitationMutation]
  );

  // Get invitations for a specific event
  const getEventInvitations = useCallback(
    (eventId: string) => {
      return sentInvitations.filter(inv => inv.event_id === eventId);
    },
    [sentInvitations]
  );

  // Get invitation statistics
  const getInvitationStats = useCallback(
    (invitations: CalendarInvitation[]): InvitationStats => {
      const stats = {
        total: invitations.length,
        pending: 0,
        accepted: 0,
        declined: 0,
        tentative: 0,
        expired: 0,
        sent: 0,
        delivered: 0,
        failed: 0,
      };

      const now = new Date();

      invitations.forEach(invitation => {
        // RSVP status counts
        if (invitation.rsvp_status === 'pending') stats.pending++;
        else if (invitation.rsvp_status === 'accepted') stats.accepted++;
        else if (invitation.rsvp_status === 'declined') stats.declined++;
        else if (invitation.rsvp_status === 'tentative') stats.tentative++;

        // Delivery status counts
        if (invitation.status === 'sent') stats.sent++;
        else if (invitation.status === 'delivered') stats.delivered++;
        else if (invitation.status === 'failed') stats.failed++;

        // Expiration check
        if (invitation.expires_at && now > new Date(invitation.expires_at)) {
          stats.expired++;
        }
      });

      return stats;
    },
    []
  );

  // Get sent invitation stats
  const sentStats = getInvitationStats(sentInvitations);

  // Get received invitation stats
  const receivedStats = getInvitationStats(receivedInvitations);

  // Filter functions
  const getPendingInvitations = useCallback(
    (invitations: CalendarInvitation[]) => {
      return invitations.filter(inv => inv.rsvp_status === 'pending');
    },
    []
  );

  const getAcceptedInvitations = useCallback(
    (invitations: CalendarInvitation[]) => {
      return invitations.filter(inv => inv.rsvp_status === 'accepted');
    },
    []
  );

  const getDeclinedInvitations = useCallback(
    (invitations: CalendarInvitation[]) => {
      return invitations.filter(inv => inv.rsvp_status === 'declined');
    },
    []
  );

  const getExpiredInvitations = useCallback(
    (invitations: CalendarInvitation[]) => {
      const now = new Date();
      return invitations.filter(inv =>
        inv.expires_at && now > new Date(inv.expires_at)
      );
    },
    []
  );

  return {
    // Data
    sentInvitations,
    receivedInvitations,
    selectedInvitation,
    setSelectedInvitation,

    // Loading states
    isLoadingSent,
    isLoadingReceived,
    isSending: sendInvitationsMutation.isPending,
    isUpdating: updateInvitationMutation.isPending,
    isCanceling: cancelInvitationMutation.isPending,

    // Errors
    sentError,
    receivedError,
    sendError: sendInvitationsMutation.error,
    updateError: updateInvitationMutation.error,
    cancelError: cancelInvitationMutation.error,

    // Actions
    sendInvitations,
    respondToInvitation,
    cancelInvitation,
    refetchSent,
    refetchReceived,

    // Utilities
    getEventInvitations,
    getInvitationStats,
    getPendingInvitations,
    getAcceptedInvitations,
    getDeclinedInvitations,
    getExpiredInvitations,

    // Stats
    sentStats,
    receivedStats,

    // Reset functions
    resetSend: sendInvitationsMutation.reset,
    resetUpdate: updateInvitationMutation.reset,
    resetCancel: cancelInvitationMutation.reset,
  };
}

// Hook for public RSVP pages (no authentication required)
export function usePublicRSVP(token: string) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get invitation details by token
  const {
    data: invitation,
    isLoading: isLoadingInvitation,
    error: invitationError,
  } = useQuery({
    queryKey: ['public-invitation', token],
    queryFn: async () => {
      const response = await fetch(`/api/calendar/rsvp/${token}`);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch invitation');
      }
      const data = await response.json();
      return data.data;
    },
    enabled: !!token
  });

  // Submit RSVP response
  const submitRSVP = useCallback(
    async (rsvpData: RSVPData) => {
      if (!token) return;

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/calendar/rsvp/${token}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(rsvpData),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to submit RSVP');
        }

        return data;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [token]
  );

  return {
    invitation,
    isLoadingInvitation,
    invitationError,
    isLoading,
    error,
    submitRSVP,
  };
}