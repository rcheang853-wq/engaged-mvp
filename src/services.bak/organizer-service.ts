import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';
import {
  Organizer,
  OrganizerEvent,
  EventSubmissionData,
  EventAnalytics,
  OrganizerStats,
  EventDuplicate,
  BulkOperation,
  BulkOperationResult,
  OrganizerEventFilters,
  EventStatus,
  CreateOrganizerRequest,
  UpdateOrganizerRequest,
} from '@/types/organizer';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export class OrganizerService {
  // Organizer profile management
  static async createOrganizerProfile(
    userId: string,
    data: CreateOrganizerRequest
  ): Promise<{ organizer: Organizer | null; error: string | null }> {
    try {
      const { data: insertedData, error } = await supabase
        .from('organizers')
        .insert({
          user_id: userId,
          organization_name: data.organizationName,
          contact_email: data.contactEmail,
          contact_phone: data.contactPhone || null,
          website_url: data.websiteUrl || null,
          social_links: data.socialLinks || {},
          bio: data.bio || null,
          logo_url: data.logoUrl || null,
          is_verified: false,
          verification_level: 'none',
        })
        .select()
        .single();

      if (error) throw error;

      return {
        organizer: this.transformOrganizerRow(insertedData),
        error: null,
      };
    } catch (error) {
      console.error('Error creating organizer profile:', error);
      return {
        organizer: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  static async updateOrganizerProfile(
    organizerId: string,
    data: Partial<UpdateOrganizerRequest>
  ): Promise<{ organizer: Organizer | null; error: string | null }> {
    try {
      const updateData: Record<string, unknown> = {};
      if (data.organizationName) updateData.organization_name = data.organizationName;
      if (data.contactEmail) updateData.contact_email = data.contactEmail;
      if (data.contactPhone !== undefined) updateData.contact_phone = data.contactPhone;
      if (data.websiteUrl !== undefined) updateData.website_url = data.websiteUrl;
      if (data.socialLinks) updateData.social_links = data.socialLinks;
      if (data.bio !== undefined) updateData.bio = data.bio;
      if (data.logoUrl !== undefined) updateData.logo_url = data.logoUrl;

      const { data: updatedData, error } = await supabase
        .from('organizers')
        .update(updateData)
        .eq('id', organizerId)
        .select()
        .single();

      if (error) throw error;

      return {
        organizer: this.transformOrganizerRow(updatedData),
        error: null,
      };
    } catch (error) {
      console.error('Error updating organizer profile:', error);
      return {
        organizer: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  static async getOrganizerByUserId(
    userId: string
  ): Promise<{ organizer: Organizer | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('organizers')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      return {
        organizer: data ? this.transformOrganizerRow(data) : null,
        error: null,
      };
    } catch (error) {
      console.error('Error fetching organizer by user ID:', error);
      return {
        organizer: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  static async getOrganizerById(
    organizerId: string
  ): Promise<{ organizer: Organizer | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('organizers')
        .select('*')
        .eq('id', organizerId)
        .single();

      if (error) throw error;

      return {
        organizer: this.transformOrganizerRow(data),
        error: null,
      };
    } catch (error) {
      console.error('Error fetching organizer by ID:', error);
      return {
        organizer: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Event management
  static async createEvent(
    organizerId: string,
    eventData: EventSubmissionData
  ): Promise<{ event: OrganizerEvent | null; error: string | null }> {
    try {
      // Check for potential duplicates first
      const duplicates = await this.checkForDuplicates({
        title: eventData.title,
        startTime: eventData.startTime,
        customLocation: eventData.customLocation || '',
      });

      if (duplicates.length > 0) {
        return {
          event: null,
          error: `Potential duplicate event detected: "${duplicates[0].title}". Please review and confirm if this is a new event.`,
        };
      }

      const status = eventData.saveAsDraft ? 'draft' : 'pending';

      const { data: insertedData, error } = await supabase
        .from('events')
        .insert({
          title: eventData.title,
          description: eventData.description,
          short_description: eventData.shortDescription || null,
          start_time: eventData.startTime.toISOString(),
          end_time: eventData.endTime.toISOString(),
          timezone: eventData.timezone,
          all_day: eventData.allDay,
          venue_id: eventData.venueId || null,
          custom_location: eventData.customLocation || null,
          organizer_id: organizerId,
          category_id: eventData.categoryId || null,
          poster_url: eventData.posterUrl || null,
          gallery_urls: eventData.galleryUrls || [],
          tags: eventData.tags || [],
          is_free: eventData.isFree,
          price_range: eventData.priceRange || [0, 0],
          ticket_url: eventData.ticketUrl || null,
          registration_required: eventData.registrationRequired,
          capacity: eventData.capacity || null,
          status: status,
          is_featured: false,
          is_trending: false,
          popularity_score: 0,
          quality_score: 0,
          ai_score_factors: {},
        })
        .select(`
          *,
          organizers (
            id,
            organization_name,
            is_verified,
            logo_url
          ),
          event_categories (
            id,
            name,
            slug,
            icon,
            color
          ),
          venues (
            id,
            name,
            address,
            city
          )
        `)
        .single();

      if (error) throw error;

      return {
        event: this.transformEventRow(insertedData),
        error: null,
      };
    } catch (error) {
      console.error('Error creating event:', error);
      return {
        event: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  static async updateEvent(
    eventId: string,
    organizerId: string,
    eventData: Partial<EventSubmissionData>
  ): Promise<{ event: OrganizerEvent | null; error: string | null }> {
    try {
      const updateData: Record<string, unknown> = {};

      if (eventData.title) updateData.title = eventData.title;
      if (eventData.description !== undefined) updateData.description = eventData.description;
      if (eventData.shortDescription !== undefined) updateData.short_description = eventData.shortDescription;
      if (eventData.startTime) updateData.start_time = eventData.startTime.toISOString();
      if (eventData.endTime) updateData.end_time = eventData.endTime.toISOString();
      if (eventData.timezone) updateData.timezone = eventData.timezone;
      if (eventData.allDay !== undefined) updateData.all_day = eventData.allDay;
      if (eventData.venueId !== undefined) updateData.venue_id = eventData.venueId;
      if (eventData.customLocation !== undefined) updateData.custom_location = eventData.customLocation;
      if (eventData.categoryId !== undefined) updateData.category_id = eventData.categoryId;
      if (eventData.posterUrl !== undefined) updateData.poster_url = eventData.posterUrl;
      if (eventData.galleryUrls) updateData.gallery_urls = eventData.galleryUrls;
      if (eventData.tags) updateData.tags = eventData.tags;
      if (eventData.isFree !== undefined) updateData.is_free = eventData.isFree;
      if (eventData.priceRange) updateData.price_range = eventData.priceRange;
      if (eventData.ticketUrl !== undefined) updateData.ticket_url = eventData.ticketUrl;
      if (eventData.registrationRequired !== undefined) updateData.registration_required = eventData.registrationRequired;
      if (eventData.capacity !== undefined) updateData.capacity = eventData.capacity;

      // Handle draft status
      if (eventData.saveAsDraft !== undefined) {
        updateData.status = eventData.saveAsDraft ? 'draft' : 'pending';
      }

      const { data: updatedData, error } = await supabase
        .from('events')
        .update(updateData)
        .eq('id', eventId)
        .eq('organizer_id', organizerId) // Ensure organizer owns the event
        .select(`
          *,
          organizers (
            id,
            organization_name,
            is_verified,
            logo_url
          ),
          event_categories (
            id,
            name,
            slug,
            icon,
            color
          ),
          venues (
            id,
            name,
            address,
            city
          )
        `)
        .single();

      if (error) throw error;

      return {
        event: this.transformEventRow(updatedData),
        error: null,
      };
    } catch (error) {
      console.error('Error updating event:', error);
      return {
        event: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  static async getOrganizerEvents(
    organizerId: string,
    filters: OrganizerEventFilters = {},
    page = 1,
    limit = 20
  ): Promise<{ events: OrganizerEvent[]; total: number; hasMore: boolean; error: string | null }> {
    try {
      let query = supabase
        .from('events')
        .select(`
          *,
          organizers (
            id,
            organization_name,
            is_verified,
            logo_url
          ),
          event_categories (
            id,
            name,
            slug,
            icon,
            color
          ),
          venues (
            id,
            name,
            address,
            city
          )
        `, { count: 'exact' })
        .eq('organizer_id', organizerId)
        .neq('event_type', 'invalid');

      // Apply filters
      if (filters.status && filters.status.length > 0) {
        query = query.in('status', filters.status);
      }

      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      if (filters.category) {
        query = query.eq('category_id', filters.category);
      }

      if (filters.dateRange) {
        query = query
          .gte('start_time', filters.dateRange.start.toISOString())
          .lte('start_time', filters.dateRange.end.toISOString());
      }

      // Apply sorting
      const sortBy = filters.sortBy || 'updated';
      const sortOrder = filters.sortOrder || 'desc';

      switch (sortBy) {
        case 'created':
          query = query.order('created_at', { ascending: sortOrder === 'asc' });
          break;
        case 'updated':
          query = query.order('updated_at', { ascending: sortOrder === 'asc' });
          break;
        case 'startTime':
          query = query.order('start_time', { ascending: sortOrder === 'asc' });
          break;
        case 'views':
        case 'engagement':
          // These would require analytics data - for now sort by popularity_score
          query = query.order('popularity_score', { ascending: sortOrder === 'asc' });
          break;
        default:
          query = query.order('updated_at', { ascending: false });
      }

      // Apply pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      const events = data?.map(this.transformEventRow) || [];
      const total = count || 0;
      const hasMore = total > page * limit;

      return { events, total, hasMore, error: null };
    } catch (error) {
      console.error('Error fetching organizer events:', error);
      return {
        events: [],
        total: 0,
        hasMore: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  static async deleteEvent(
    eventId: string,
    organizerId: string
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId)
        .eq('organizer_id', organizerId);

      if (error) throw error;

      return { success: true, error: null };
    } catch (error) {
      console.error('Error deleting event:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Bulk operations
  static async performBulkOperation(
    organizerId: string,
    operation: BulkOperation
  ): Promise<BulkOperationResult> {
    const result: BulkOperationResult = {
      successful: [],
      failed: [],
      total: operation.eventIds.length,
    };

    for (const eventId of operation.eventIds) {
      try {
        const updateData: Record<string, unknown> = {};

        switch (operation.action) {
          case 'publish':
            updateData.status = 'pending'; // Submit for approval
            break;
          case 'archive':
            updateData.status = 'archived';
            break;
          case 'delete':
            const { error } = await supabase
              .from('events')
              .delete()
              .eq('id', eventId)
              .eq('organizer_id', organizerId);

            if (error) throw error;
            result.successful.push(eventId);
            continue;
          case 'submit':
            updateData.status = 'pending';
            break;
        }

        if (Object.keys(updateData).length > 0) {
          const { error } = await supabase
            .from('events')
            .update(updateData)
            .eq('id', eventId)
            .eq('organizer_id', organizerId);

          if (error) throw error;
        }

        result.successful.push(eventId);
      } catch (error) {
        result.failed.push({
          eventId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return result;
  }

  // Analytics
  static async getEventAnalytics(
    eventId: string,
    organizerId: string
  ): Promise<{ analytics: EventAnalytics | null; error: string | null }> {
    try {
      // First verify the event belongs to the organizer
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('id, title, status, created_at, published_at')
        .eq('id', eventId)
        .eq('organizer_id', organizerId)
        .neq('event_type', 'invalid')
        .single();

      if (eventError || !eventData) {
        throw new Error('Event not found or access denied');
      }

      // For now, return mock analytics data
      // In a real implementation, you'd query an analytics table
      const analytics: EventAnalytics = {
        eventId: eventData.id,
        eventTitle: eventData.title,
        status: eventData.status as EventStatus,
        views: Math.floor(Math.random() * 1000),
        saves: Math.floor(Math.random() * 100),
        rsvps: Math.floor(Math.random() * 50),
        ticketClicks: Math.floor(Math.random() * 25),
        shareClicks: Math.floor(Math.random() * 15),
        conversionRate: Math.random() * 10,
        engagementScore: Math.random() * 100,
        createdAt: new Date(eventData.created_at),
        publishedAt: eventData.published_at ? new Date(eventData.published_at) : null,
        periodStats: {
          daily: [],
          weekly: [],
          monthly: [],
        },
      };

      return { analytics, error: null };
    } catch (error) {
      console.error('Error fetching event analytics:', error);
      return {
        analytics: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  static async getOrganizerStats(
    organizerId: string
  ): Promise<{ stats: OrganizerStats | null; error: string | null }> {
    try {
      // Get organizer info
      const { data: organizer, error: orgError } = await supabase
        .from('organizers')
        .select('created_at, verification_level')
        .eq('id', organizerId)
        .single();

      if (orgError || !organizer) {
        throw new Error('Organizer not found');
      }

      // Get event counts by status
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('status, created_at, popularity_score')
        .eq('organizer_id', organizerId)
        .neq('event_type', 'invalid');

      if (eventsError) throw eventsError;

      const statusCounts = {
        draft: 0,
        pending: 0,
        approved: 0,
        published: 0,
        rejected: 0,
      };

      let totalEvents = 0;
      let totalViews = 0;
      let totalSaves = 0;
      let totalRsvps = 0;
      let latestEventDate: Date | null = null;

      events?.forEach(event => {
        totalEvents++;
        const status = event.status as EventStatus;
        if (status in statusCounts) {
          statusCounts[status as keyof typeof statusCounts]++;
        }

        // Mock analytics aggregation
        totalViews += Math.floor(Math.random() * 100);
        totalSaves += Math.floor(Math.random() * 20);
        totalRsvps += Math.floor(Math.random() * 10);

        const eventDate = new Date(event.created_at);
        if (!latestEventDate || eventDate > latestEventDate) {
          latestEventDate = eventDate;
        }
      });

      const createdAt = new Date(organizer.created_at);
      const accountAge = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
      const averageEngagement = totalEvents > 0 ? (totalSaves + totalRsvps) / totalEvents : 0;

      const stats: OrganizerStats = {
        organizerId,
        totalEvents,
        draftEvents: statusCounts.draft,
        pendingEvents: statusCounts.pending,
        approvedEvents: statusCounts.approved,
        publishedEvents: statusCounts.published,
        rejectedEvents: statusCounts.rejected,
        totalViews,
        totalSaves,
        totalRsvps,
        averageEngagement,
        verificationStatus: organizer.verification_level,
        accountAge,
        lastEventDate: latestEventDate,
      };

      return { stats, error: null };
    } catch (error) {
      console.error('Error fetching organizer stats:', error);
      return {
        stats: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Utility methods
  static async checkForDuplicates(eventData: {
    title: string;
    startTime: Date;
    customLocation: string;
  }): Promise<EventDuplicate[]> {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('id, title, start_time, custom_location, venues(name)')
        .neq('event_type', 'invalid')
        .or(`title.ilike.%${eventData.title}%,custom_location.ilike.%${eventData.customLocation}%`)
        .gte('start_time', new Date(eventData.startTime.getTime() - 24 * 60 * 60 * 1000).toISOString())
        .lte('start_time', new Date(eventData.startTime.getTime() + 24 * 60 * 60 * 1000).toISOString())
        .limit(5);

      if (error) throw error;

      const duplicates: EventDuplicate[] = data?.map(event => ({
        id: event.id,
        title: event.title,
        startTime: new Date(event.start_time),
        venue: event.custom_location || (event.venues as any)?.name || 'Unknown',
        similarity: this.calculateSimilarity(eventData.title, event.title),
        matchType: 'potential' as const,
        reasons: this.generateMatchReasons(eventData, event),
      })) || [];

      return duplicates.filter(d => d.similarity > 0.7);
    } catch (error) {
      console.error('Error checking for duplicates:', error);
      return [];
    }
  }

  private static calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[str2.length][str1.length];
  }

  private static generateMatchReasons(eventData: any, existingEvent: any): string[] {
    const reasons = [];
    if (eventData.title.toLowerCase().includes(existingEvent.title.toLowerCase())) {
      reasons.push('Similar title');
    }
    if (eventData.customLocation && existingEvent.custom_location &&
        eventData.customLocation.toLowerCase().includes(existingEvent.custom_location.toLowerCase())) {
      reasons.push('Same location');
    }
    const timeDiff = Math.abs(eventData.startTime.getTime() - new Date(existingEvent.start_time).getTime());
    if (timeDiff < 2 * 60 * 60 * 1000) { // Within 2 hours
      reasons.push('Similar time');
    }
    return reasons;
  }

  private static transformOrganizerRow(row: Record<string, unknown>): Organizer {
    return {
      id: row.id as string,
      userId: row.user_id as string | null,
      organizationName: row.organization_name as string,
      contactEmail: row.contact_email as string,
      contactPhone: row.contact_phone as string | null,
      websiteUrl: row.website_url as string | null,
      socialLinks: (row.social_links as Record<string, string>) || {},
      bio: row.bio as string | null,
      logoUrl: row.logo_url as string | null,
      isVerified: row.is_verified as boolean,
      verificationLevel: row.verification_level as 'none' | 'basic' | 'verified' | 'premium',
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }

  private static transformEventRow(row: Record<string, unknown>): OrganizerEvent {
    return {
      id: row.id as string,
      title: row.title as string,
      description: row.description as string | null,
      shortDescription: row.short_description as string | null,
      startTime: new Date(row.start_time as string),
      endTime: new Date(row.end_time as string),
      timezone: row.timezone as string,
      allDay: row.all_day as boolean,
      venueId: row.venue_id as string | null,
      customLocation: row.custom_location as string | null,
      organizerId: row.organizer_id as string,
      categoryId: row.category_id as string | null,
      posterUrl: row.poster_url as string | null,
      galleryUrls: (row.gallery_urls as string[]) || [],
      tags: (row.tags as string[]) || [],
      isFree: row.is_free as boolean,
      priceRange: (row.price_range as number[]) || [0, 0],
      ticketUrl: row.ticket_url as string | null,
      registrationRequired: row.registration_required as boolean,
      capacity: row.capacity as number | null,
      status: row.status as EventStatus,
      rejectionReason: (row.rejection_reason as string) || null,
      adminNotes: (row.admin_notes as string) || null,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
      publishedAt: row.published_at ? new Date(row.published_at as string) : null,
      views: (row.views as number) || 0,
      saves: (row.saves as number) || 0,
      rsvps: (row.rsvps as number) || 0,
      clicks: (row.clicks as number) || 0,
    };
  }
}