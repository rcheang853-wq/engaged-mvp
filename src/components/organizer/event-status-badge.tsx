import {
  CheckCircle,
  Clock,
  XCircle,
  FileText,
  Archive,
  AlertCircle,
  Star,
} from 'lucide-react';
import { EventStatus } from '@/types/organizer';

interface EventStatusBadgeProps {
  status: EventStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export function EventStatusBadge({
  status,
  size = 'md',
  showIcon = true,
  className = '',
}: EventStatusBadgeProps) {
  const getStatusConfig = (status: EventStatus) => {
    switch (status) {
      case 'draft':
        return {
          label: 'Draft',
          icon: FileText,
          className: 'bg-gray-100 text-gray-700 border-gray-200',
        };
      case 'pending':
        return {
          label: 'Pending Review',
          icon: Clock,
          className: 'bg-yellow-100 text-yellow-700 border-yellow-200',
        };
      case 'approved':
        return {
          label: 'Approved',
          icon: CheckCircle,
          className: 'bg-blue-100 text-blue-700 border-blue-200',
        };
      case 'published':
        return {
          label: 'Published',
          icon: Star,
          className: 'bg-green-100 text-green-700 border-green-200',
        };
      case 'rejected':
        return {
          label: 'Rejected',
          icon: XCircle,
          className: 'bg-red-100 text-red-700 border-red-200',
        };
      case 'archived':
        return {
          label: 'Archived',
          icon: Archive,
          className: 'bg-purple-100 text-purple-700 border-purple-200',
        };
      case 'cancelled':
        return {
          label: 'Cancelled',
          icon: AlertCircle,
          className: 'bg-gray-100 text-gray-700 border-gray-200',
        };
      default:
        return {
          label: 'Unknown',
          icon: AlertCircle,
          className: 'bg-gray-100 text-gray-700 border-gray-200',
        };
    }
  };

  const getSizeClasses = (size: string) => {
    switch (size) {
      case 'sm':
        return 'px-2 py-1 text-xs';
      case 'lg':
        return 'px-4 py-2 text-sm';
      default: // md
        return 'px-3 py-1 text-sm';
    }
  };

  const getIconSize = (size: string) => {
    switch (size) {
      case 'sm':
        return 'w-3 h-3';
      case 'lg':
        return 'w-5 h-5';
      default: // md
        return 'w-4 h-4';
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <span
      className={`
        inline-flex items-center font-medium rounded-full border
        ${config.className}
        ${getSizeClasses(size)}
        ${className}
      `}
    >
      {showIcon && <Icon className={`${getIconSize(size)} mr-1`} />}
      {config.label}
    </span>
  );
}

// Helper component for status with description
interface EventStatusCardProps {
  status: EventStatus;
  title?: string;
  description?: string;
  rejectionReason?: string;
  adminNotes?: string;
  updatedAt?: Date;
}

export function EventStatusCard({
  status,
  title,
  description,
  rejectionReason,
  adminNotes,
  updatedAt,
}: EventStatusCardProps) {
  const getStatusMessage = (status: EventStatus) => {
    switch (status) {
      case 'draft':
        return {
          title: 'Draft Saved',
          description: 'Your event is saved as a draft. You can continue editing and submit it for review when ready.',
          action: 'Continue editing or submit for approval',
        };
      case 'pending':
        return {
          title: 'Under Review',
          description: 'Your event has been submitted and is being reviewed by our team. We\'ll notify you once it\'s approved.',
          action: 'We typically review events within 24-48 hours',
        };
      case 'approved':
        return {
          title: 'Approved',
          description: 'Great! Your event has been approved and is now live on the platform.',
          action: 'Share your event to increase visibility',
        };
      case 'published':
        return {
          title: 'Published & Live',
          description: 'Your event is live and visible to users. Track its performance in analytics.',
          action: 'Monitor engagement and promote your event',
        };
      case 'rejected':
        return {
          title: 'Needs Revision',
          description: 'Your event submission needs some changes before it can be approved.',
          action: 'Please review the feedback and resubmit',
        };
      case 'archived':
        return {
          title: 'Archived',
          description: 'This event has been archived and is no longer visible to users.',
          action: 'You can restore it or create a new event',
        };
      case 'cancelled':
        return {
          title: 'Cancelled',
          description: 'This event has been cancelled.',
          action: 'Contact support if you need assistance',
        };
      default:
        return {
          title: 'Status Unknown',
          description: 'Unable to determine event status.',
          action: 'Contact support for assistance',
        };
    }
  };

  const statusInfo = getStatusMessage(status);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center mb-2">
            <h3 className="text-lg font-medium text-gray-900 mr-3">
              {title || statusInfo.title}
            </h3>
            <EventStatusBadge status={status} />
          </div>
          <p className="text-gray-600 text-sm">
            {description || statusInfo.description}
          </p>
        </div>
      </div>

      {/* Additional information for specific statuses */}
      {status === 'rejected' && (rejectionReason || adminNotes) && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <h4 className="text-sm font-medium text-red-800 mb-2">Review Feedback</h4>
          {rejectionReason && (
            <p className="text-sm text-red-700 mb-2">
              <strong>Reason:</strong> {rejectionReason}
            </p>
          )}
          {adminNotes && (
            <p className="text-sm text-red-700">
              <strong>Notes:</strong> {adminNotes}
            </p>
          )}
        </div>
      )}

      {status === 'approved' && adminNotes && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="text-sm font-medium text-blue-800 mb-2">Admin Notes</h4>
          <p className="text-sm text-blue-700">{adminNotes}</p>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs text-gray-500">
          {statusInfo.action}
        </p>
        {updatedAt && (
          <p className="text-xs text-gray-500">
            Updated {updatedAt.toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  );
}