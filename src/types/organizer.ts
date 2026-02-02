import { Database } from './database';

// Database types
export type OrganizerRow = Database['public']['Tables']['organizers']['Row'];
export type OrganizerInsert = Database['public']['Tables']['organizers']['Insert'];
export type OrganizerUpdate = Database['public']['Tables']['organizers']['Update'];

// Enhanced organizer types
export interface Organizer {
  id: string;
  userId: string | null;
  organizationName: string;
  contactEmail: string;
  contactPhone: string | null;
  websiteUrl: string | null;
  socialLinks: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
  };
  bio: string | null;
  logoUrl: string | null;
  isVerified: boolean;
  verificationLevel: 'none' | 'basic' | 'verified' | 'premium';
  createdAt: Date;
  updatedAt: Date;
}

// Event status for organizer workflow
export type EventStatus =
  | 'draft'       // Saved but not submitted
  | 'pending'     // Submitted for review
  | 'approved'    // Approved by admin
  | 'published'   // Live and visible
  | 'rejected'    // Rejected by admin
  | 'archived'    // Archived/hidden
  | 'cancelled';  // Cancelled event

// Organizer event with workflow status
export interface OrganizerEvent {
  id: string;
  title: string;
  description: string | null;
  shortDescription: string | null;
  startTime: Date;
  endTime: Date;
  timezone: string;
  allDay: boolean;
  venueId: string | null;
  customLocation: string | null;
  organizerId: string;
  categoryId: string | null;
  posterUrl: string | null;
  galleryUrls: string[];
  tags: string[];
  isFree: boolean;
  priceRange: number[];
  ticketUrl: string | null;
  registrationRequired: boolean;
  capacity: number | null;
  status: EventStatus;
  rejectionReason?: string | null;
  adminNotes?: string | null;
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
  // Analytics data
  views?: number;
  saves?: number;
  rsvps?: number;
  clicks?: number;
}

// Event analytics
export interface EventAnalytics {
  eventId: string;
  eventTitle: string;
  status: EventStatus;
  views: number;
  saves: number;
  rsvps: number;
  ticketClicks: number;
  shareClicks: number;
  conversionRate: number;
  engagementScore: number;
  createdAt: Date;
  publishedAt: Date | null;
  periodStats: {
    daily: { date: string; views: number; saves: number; rsvps: number; }[];
    weekly: { week: string; views: number; saves: number; rsvps: number; }[];
    monthly: { month: string; views: number; saves: number; rsvps: number; }[];
  };
}

// Organizer dashboard stats
export interface OrganizerStats {
  organizerId: string;
  totalEvents: number;
  draftEvents: number;
  pendingEvents: number;
  approvedEvents: number;
  publishedEvents: number;
  rejectedEvents: number;
  totalViews: number;
  totalSaves: number;
  totalRsvps: number;
  averageEngagement: number;
  verificationStatus: string;
  accountAge: number; // days since creation
  lastEventDate: Date | null;
}

// Event submission form data
export interface EventSubmissionData {
  title: string;
  description: string;
  shortDescription?: string;
  startTime: Date;
  endTime: Date;
  timezone: string;
  allDay: boolean;
  venueId?: string | null;
  customLocation?: string;
  categoryId?: string;
  posterUrl?: string;
  galleryUrls?: string[];
  tags?: string[];
  isFree: boolean;
  priceRange?: number[];
  ticketUrl?: string;
  registrationRequired: boolean;
  capacity?: number | null;
  saveAsDraft?: boolean;
}

// Event duplicate detection
export interface EventDuplicate {
  id: string;
  title: string;
  startTime: Date;
  venue: string;
  similarity: number;
  matchType: 'exact' | 'similar' | 'potential';
  reasons: string[];
}

// Bulk operations
export interface BulkOperation {
  eventIds: string[];
  action: 'publish' | 'archive' | 'delete' | 'submit';
  confirmation?: boolean;
}

export interface BulkOperationResult {
  successful: string[];
  failed: Array<{
    eventId: string;
    error: string;
  }>;
  total: number;
}

// Event filters for organizer dashboard
export interface OrganizerEventFilters {
  status?: EventStatus[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  search?: string;
  category?: string;
  sortBy?: 'created' | 'updated' | 'startTime' | 'views' | 'engagement';
  sortOrder?: 'asc' | 'desc';
}

// User roles extension
export interface UserRole {
  userId: string;
  role: 'user' | 'organizer' | 'admin' | 'super_admin';
  organizerId?: string | null; // Link to organizer if role is organizer
  permissions: string[];
  createdAt: Date;
}

// Permission system
export type Permission =
  | 'events:create'
  | 'events:edit'
  | 'events:delete'
  | 'events:publish'
  | 'events:view_analytics'
  | 'events:bulk_operations'
  | 'organizer:edit_profile'
  | 'organizer:view_analytics'
  | 'admin:approve_events'
  | 'admin:reject_events'
  | 'admin:manage_organizers'
  | 'admin:view_all_analytics'
  | 'admin:system_settings';

// API request/response types
export interface CreateOrganizerRequest {
  organizationName: string;
  contactEmail: string;
  contactPhone?: string;
  websiteUrl?: string;
  socialLinks?: Record<string, string>;
  bio?: string;
  logoUrl?: string;
}

export interface UpdateOrganizerRequest extends Partial<CreateOrganizerRequest> {
  id: string;
}

export interface OrganizerListResponse {
  organizers: Organizer[];
  total: number;
  hasMore: boolean;
}

export interface EventListResponse {
  events: OrganizerEvent[];
  total: number;
  hasMore: boolean;
}