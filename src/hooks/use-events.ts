import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createBrowserSupabaseClient } from '@/lib/supabase/auth';

const supabase = createBrowserSupabaseClient();
import { Event, EventFilters, PaginatedResponse } from '@/types';

const EVENTS_QUERY_KEY = 'events';

interface FetchEventsParams {
  page?: number;
  limit?: number;
  filters?: EventFilters;
}

export function useEvents(params: FetchEventsParams = {}) {
  const { page = 1, limit = 20, filters = {} } = params;

  return useQuery({
    queryKey: [EVENTS_QUERY_KEY, page, limit, filters],
    queryFn: async (): Promise<PaginatedResponse<Event>> => {
      let query = supabase
        .from('events')
        .select(`
          *,
          venues (
            id,
            name,
            address,
            city,
            latitude,
            longitude
          ),
          event_categories (
            id,
            name,
            slug,
            icon,
            color
          ),
          organizers (
            id,
            organization_name,
            is_verified,
            logo_url
          )
        `, { count: 'exact' })
        .eq('status', 'published')
        .neq('event_type', 'invalid')
        .range((page - 1) * limit, page * limit - 1)
        .order('start_time', { ascending: true });

      // Apply filters
      if (filters.search) {
        query = query.or(
          `title.ilike.%${filters.search}%,description.ilike.%${filters.search}%,tags.cs.{${filters.search}}`
        );
      }

      if (filters.location) {
        query = query.or(
          `venues.city.ilike.%${filters.location}%,custom_location.ilike.%${filters.location}%`
        );
      }

      if (filters.categories && filters.categories.length > 0) {
        query = query.in('category_id', filters.categories);
      }

      if (filters.dateRange) {
        query = query
          .gte('start_time', filters.dateRange.start.toISOString())
          .lte('start_time', filters.dateRange.end.toISOString());
      }

      const { data, error, count } = await query;

      if (error) {
        throw new Error(error.message);
      }

      const events: Event[] = transformEventsData(data || []);

      return {
        data: events,
        pagination: {
          page,
          limit,
          total: count || 0,
          hasMore: (count || 0) > page * limit,
        },
      };
    },
  });
}

export function useEvent(id: string) {
  return useQuery({
    queryKey: [EVENTS_QUERY_KEY, id],
    queryFn: async (): Promise<Event> => {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          venues (
            id,
            name,
            address,
            city,
            latitude,
            longitude
          ),
          event_categories (
            id,
            name,
            slug,
            icon,
            color
          ),
          organizers (
            id,
            organization_name,
            is_verified,
            logo_url
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        throw new Error(error.message);
      }

      const transformedEvents = transformEventsData([data]);
      if (transformedEvents.length === 0) {
        throw new Error('Event not found');
      }
      return transformedEvents[0];
    },
    enabled: !!id,
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      event: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>
    ) => {
      const { data, error } = await supabase
        .from('events')
        .insert({
          title: event.title,
          description: event.description,
          short_description: event.shortDescription,
          start_time: event.startTime.toISOString(),
          end_time: event.endTime.toISOString(),
          timezone: event.timezone,
          all_day: event.allDay,
          venue_id: event.venue?.id,
          custom_location: event.customLocation,
          organizer_id: event.organizer?.id,
          category_id: event.category?.id,
          poster_url: event.posterUrl,
          gallery_urls: event.galleryUrls,
          tags: event.tags,
          is_free: event.isFree,
          price_range: event.priceRange,
          ticket_url: event.ticketUrl,
          registration_required: event.registrationRequired,
          capacity: event.capacity,
          source_url: event.sourceUrl,
          status: 'published',
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [EVENTS_QUERY_KEY] });
    },
  });
}

/**
 * Transform raw database data to Event interface
 */
function transformEventsData(data: any[]): Event[] {
  return data.map(row => ({
    id: row.id,
    title: row.title,
    description: row.description,
    shortDescription: row.short_description,
    startTime: new Date(row.start_time),
    endTime: new Date(row.end_time),
    timezone: row.timezone,
    allDay: row.all_day,
    venue: row.venues ? {
      id: row.venues.id,
      name: row.venues.name,
      address: row.venues.address,
      city: row.venues.city,
      latitude: row.venues.latitude,
      longitude: row.venues.longitude,
    } : null,
    customLocation: row.custom_location,
    organizer: row.organizers ? {
      id: row.organizers.id,
      organizationName: row.organizers.organization_name,
      isVerified: row.organizers.is_verified,
      logoUrl: row.organizers.logo_url,
    } : null,
    category: row.event_categories ? {
      id: row.event_categories.id,
      name: row.event_categories.name,
      slug: row.event_categories.slug,
      icon: row.event_categories.icon,
      color: row.event_categories.color,
    } : null,
    posterUrl: row.poster_url,
    galleryUrls: row.gallery_urls || [],
    tags: row.tags || [],
    isFree: row.is_free,
    priceRange: row.price_range || [0, 0],
    ticketUrl: row.ticket_url,
    registrationRequired: row.registration_required,
    capacity: row.capacity,
    popularityScore: row.popularity_score,
    qualityScore: row.quality_score,
    status: row.status,
    isFeatured: row.is_featured,
    isTrending: row.is_trending,
    sourceUrl: row.source_url,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    publishedAt: row.published_at ? new Date(row.published_at) : null,
  }));
}
