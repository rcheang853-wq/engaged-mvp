'use client';

import React, { useState } from 'react';
import { useInvitations } from '@/hooks/use-invitations';
import { Button } from '@/components/ui/button';
import {
  Send,
  Mail,
  MailOpen,
  UserCheck,
  UserX,
  UserMinus,
  Clock,
  AlertTriangle,
  Plus,
  Trash2,
  RefreshCw,
  Calendar,
  Users,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarInvitation, RSVPStatus } from '@/types/calendar';

interface InvitationManagerProps {
  eventId?: string;
  className?: string;
}

export function InvitationManager({ eventId, className = '' }: InvitationManagerProps) {
  const {
    sentInvitations,
    receivedInvitations,
    isLoadingSent,
    isLoadingReceived,
    isSending,
    isUpdating,
    isCanceling,
    sendInvitations,
    respondToInvitation,
    cancelInvitation,
    getEventInvitations,
    sentStats,
    receivedStats,
    refetchSent,
    refetchReceived
  } = useInvitations();

  const [activeTab, setActiveTab] = useState<'sent' | 'received'>('sent');
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteeEmails, setInviteeEmails] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [selectedInvitations, setSelectedInvitations] = useState<Set<string>>(new Set());

  const displayInvitations = eventId
    ? getEventInvitations(eventId)
    : activeTab === 'sent'
    ? sentInvitations
    : receivedInvitations;

  const isLoading = activeTab === 'sent' ? isLoadingSent : isLoadingReceived;
  const stats = activeTab === 'sent' ? sentStats : receivedStats;

  const handleSendInvitations = async () => {
    if (!eventId || !inviteeEmails.trim()) return;

    const emails = inviteeEmails
      .split(/[,\n]/)
      .map(email => email.trim())
      .filter(email => email && email.includes('@'));

    if (emails.length === 0) return;

    const invitees = emails.map(email => ({ email }));

    try {
      await sendInvitations({
        eventId,
        invitees,
        message: inviteMessage.trim() || undefined,
        expiresIn: 168 // 7 days
      });

      setInviteeEmails('');
      setInviteMessage('');
      setShowInviteForm(false);
    } catch (error) {
      console.error('Failed to send invitations:', error);
    }
  };

  const handleRSVP = async (invitationId: string, rsvpStatus: RSVPStatus) => {
    try {
      await respondToInvitation(invitationId, rsvpStatus);
    } catch (error) {
      console.error('Failed to respond to invitation:', error);
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      await cancelInvitation(invitationId);
    } catch (error) {
      console.error('Failed to cancel invitation:', error);
    }
  };

  const handleBulkCancel = async () => {
    if (selectedInvitations.size === 0) return;

    try {
      await Promise.all(
        Array.from(selectedInvitations).map(id => cancelInvitation(id))
      );
      setSelectedInvitations(new Set());
    } catch (error) {
      console.error('Failed to cancel invitations:', error);
    }
  };

  const toggleInvitationSelection = (invitationId: string) => {
    const newSelection = new Set(selectedInvitations);
    if (newSelection.has(invitationId)) {
      newSelection.delete(invitationId);
    } else {
      newSelection.add(invitationId);
    }
    setSelectedInvitations(newSelection);
  };

  const getStatusIcon = (invitation: CalendarInvitation) => {
    if (invitation.rsvp_status === 'accepted') {
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    } else if (invitation.rsvp_status === 'declined') {
      return <XCircle className="w-4 h-4 text-red-600" />;
    } else if (invitation.rsvp_status === 'tentative') {
      return <Clock className="w-4 h-4 text-yellow-600" />;
    } else {
      return <Mail className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (invitation: CalendarInvitation) => {
    if (invitation.rsvp_status === 'accepted') {
      return 'text-green-600 bg-green-50 border-green-200';
    } else if (invitation.rsvp_status === 'declined') {
      return 'text-red-600 bg-red-50 border-red-200';
    } else if (invitation.rsvp_status === 'tentative') {
      return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    } else {
      return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className={`${className} flex items-center justify-center p-8`}>
        <div className="flex items-center space-x-3">
          <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
          <span className="text-gray-600">Loading invitations...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {eventId ? 'Event Invitations' : 'Invitation Manager'}
            </h2>
            <p className="text-sm text-gray-500">
              Manage event invitations and RSVPs
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => activeTab === 'sent' ? refetchSent() : refetchReceived()}
            disabled={isLoading}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>

          {eventId && (
            <Button
              onClick={() => setShowInviteForm(!showInviteForm)}
              size="sm"
              className="flex items-center space-x-2"
              disabled={isSending}
            >
              <Plus className="w-4 h-4" />
              <span>Invite</span>
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center space-x-3">
            <Mail className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-gray-900">Total</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-sm font-medium text-gray-900">Accepted</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.accepted}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center space-x-3">
            <Clock className="w-8 h-8 text-yellow-600" />
            <div>
              <p className="text-sm font-medium text-gray-900">Pending</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.pending}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center space-x-3">
            <XCircle className="w-8 h-8 text-red-600" />
            <div>
              <p className="text-sm font-medium text-gray-900">Declined</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.declined}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation (only if not event-specific) */}
      {!eventId && (
        <div className="flex items-center space-x-1 mb-6">
          <button
            onClick={() => setActiveTab('sent')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'sent'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            Sent ({sentStats.total})
          </button>
          <button
            onClick={() => setActiveTab('received')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'received'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            Received ({receivedStats.total})
          </button>
        </div>
      )}

      {/* Invite Form */}
      <AnimatePresence>
        {showInviteForm && eventId && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 bg-white rounded-lg border border-gray-200 p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Send Invitations</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Addresses
                </label>
                <textarea
                  value={inviteeEmails}
                  onChange={(e) => setInviteeEmails(e.target.value)}
                  placeholder="Enter email addresses separated by commas or new lines"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Separate multiple emails with commas or line breaks
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Personal Message (Optional)
                </label>
                <textarea
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  placeholder="Add a personal message to your invitation"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center space-x-3">
                <Button
                  onClick={handleSendInvitations}
                  disabled={!inviteeEmails.trim() || isSending}
                  className="flex items-center space-x-2"
                >
                  {isSending ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span>{isSending ? 'Sending...' : 'Send Invitations'}</span>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {
                    setShowInviteForm(false);
                    setInviteeEmails('');
                    setInviteMessage('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Actions */}
      {activeTab === 'sent' && selectedInvitations.size > 0 && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-700">
              {selectedInvitations.size} invitation(s) selected
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkCancel}
              disabled={isCanceling}
              className="text-red-600 border-red-300 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Cancel Selected
            </Button>
          </div>
        </div>
      )}

      {/* Invitations List */}
      <div className="space-y-4">
        {displayInvitations.length === 0 ? (
          <div className="text-center py-12">
            <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No {activeTab} invitations
            </h3>
            <p className="text-gray-500 mb-4">
              {activeTab === 'sent'
                ? 'You haven\'t sent any invitations yet.'
                : 'You don\'t have any pending invitations.'}
            </p>
            {eventId && activeTab === 'sent' && (
              <Button onClick={() => setShowInviteForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Send Invitations
              </Button>
            )}
          </div>
        ) : (
          displayInvitations.map((invitation) => (
            <motion.div
              key={invitation.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg border border-gray-200 p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  {activeTab === 'sent' && (
                    <input
                      type="checkbox"
                      checked={selectedInvitations.has(invitation.id)}
                      onChange={() => toggleInvitationSelection(invitation.id)}
                      className="mt-1"
                    />
                  )}

                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="font-semibold text-gray-900">
                        {invitation.event?.title || 'Untitled Event'}
                      </h3>
                      <div className={`px-2 py-1 rounded-full border text-xs font-medium ${
                        getStatusColor(invitation)
                      }`}>
                        <div className="flex items-center space-x-1">
                          {getStatusIcon(invitation)}
                          <span className="capitalize">{invitation.rsvp_status}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex items-center space-x-4">
                        <span>
                          <strong>
                            {activeTab === 'sent' ? 'To:' : 'From:'}
                          </strong>{' '}
                          {activeTab === 'sent'
                            ? `${invitation.invitee_name || invitation.invitee_email}`
                            : `${invitation.inviter_name} (${invitation.inviter_email})`
                          }
                        </span>
                        {invitation.event?.start_time && (
                          <span>
                            <strong>Event:</strong>{' '}
                            {formatDate(invitation.event.start_time)}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-4">
                        <span>
                          <strong>Sent:</strong> {formatDate(invitation.sent_at)}
                        </span>
                        {invitation.response_at && (
                          <span>
                            <strong>Responded:</strong> {formatDate(invitation.response_at)}
                          </span>
                        )}
                      </div>
                    </div>

                    {invitation.message && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-md">
                        <p className="text-sm text-gray-700">{invitation.message}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  {activeTab === 'received' && invitation.rsvp_status === 'pending' && (
                    <div className="flex items-center space-x-1">
                      <Button
                        size="sm"
                        onClick={() => handleRSVP(invitation.id, 'accepted')}
                        disabled={isUpdating}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRSVP(invitation.id, 'tentative')}
                        disabled={isUpdating}
                        className="text-yellow-600 border-yellow-300 hover:bg-yellow-50"
                      >
                        <Clock className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRSVP(invitation.id, 'declined')}
                        disabled={isUpdating}
                        className="text-red-600 border-red-300 hover:bg-red-50"
                      >
                        <XCircle className="w-4 h-4" />
                      </Button>
                    </div>
                  )}

                  {activeTab === 'sent' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCancelInvitation(invitation.id)}
                      disabled={isCanceling}
                      className="text-red-600 border-red-300 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}