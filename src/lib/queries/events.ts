import { createBrowserSupabaseClient } from '@/lib/supabase/auth';

const supabase = createBrowserSupabaseClient();
import { Event } from '@/types';

export interface DiscoveryParams {
  limit?: number;
  userLocation?: {
    latitude: number;
    longitude: number;
  };
  radius?: number; // in kilometers
}

/**
 * Fetch trending events based on popularity score and recent activity
 */
export async function getTrendingEvents(params: DiscoveryParams = {}) {
  const { limit = 10 } = params;

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
    .eq('status', 'published')
    .neq('event_type', 'invalid')
    .eq('is_trending', true)
    .gte('start_time', new Date().toISOString())
    .order('popularity_score', { ascending: false })
    .order('start_time', { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch trending events: ${error.message}`);
  }

  return transformEventsData(data);
}

/**
 * Fetch nearby events based on user location
 */
export async function getNearbyEvents(params: DiscoveryParams) {
  const { limit = 10, userLocation, radius = 50 } = params;

  if (!userLocation) {
    throw new Error('User location is required for nearby events');
  }

  // Use PostGIS for location-based queries
  const { data, error } = await supabase
    .rpc('get_nearby_events', {
      user_lat: userLocation.latitude,
      user_lng: userLocation.longitude,
      radius_km: radius,
      event_limit: limit
    });

  if (error) {
    // Fallback to basic query if PostGIS function not available
    const { data: fallbackData, error: fallbackError } = await supabase
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
      .eq('status', 'published')
      .neq('event_type', 'invalid')
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true })
      .limit(limit);

    if (fallbackError) {
      throw new Error(`Failed to fetch nearby events: ${fallbackError.message}`);
    }

    return transformEventsData(fallbackData);
  }

  return transformEventsData(data);
}

/**
 * Fetch top 10 curated events (featured events)
 */
export async function getTopEvents(params: DiscoveryParams = {}) {
  const { limit = 10 } = params;

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
    .eq('status', 'published')
    .neq('event_type', 'invalid')
    .eq('is_featured', true)
    .gte('start_time', new Date().toISOString())
    .order('quality_score', { ascending: false })
    .order('start_time', { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch top events: ${error.message}`);
  }

  return transformEventsData(data);
}

/**
 * Search events with filters
 */
export async function searchEvents(
  query: string,
  params: DiscoveryParams & {
    categories?: string[];
    dateRange?: {
      start: Date;
      end: Date;
    };
    priceRange?: {
      min: number;
      max: number;
    };
    page?: number;
  } = {}
) {
  const {
    limit = 20,
    page = 1,
    categories,
    dateRange,
    priceRange,
    userLocation,
    radius = 50
  } = params;

  let dbQuery = supabase
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
    .gte('start_time', new Date().toISOString());

  // Text search
  if (query.trim()) {
    dbQuery = dbQuery.or(
      `title.ilike.%${query}%,description.ilike.%${query}%,tags.cs.{${query}}`
    );
  }

  // Category filter
  if (categories && categories.length > 0) {
    dbQuery = dbQuery.in('category_id', categories);
  }

  // Date range filter
  if (dateRange) {
    dbQuery = dbQuery
      .gte('start_time', dateRange.start.toISOString())
      .lte('start_time', dateRange.end.toISOString());
  }

  // Price range filter
  if (priceRange) {
    dbQuery = dbQuery
      .gte('price_range->0', priceRange.min)
      .lte('price_range->1', priceRange.max);
  }

  // Pagination
  const offset = (page - 1) * limit;
  dbQuery = dbQuery.range(offset, offset + limit - 1);

  // Ordering
  dbQuery = dbQuery
    .order('popularity_score', { ascending: false })
    .order('start_time', { ascending: true });

  const { data, error, count } = await dbQuery;

  if (error) {
    throw new Error(`Failed to search events: ${error.message}`);
  }

  const events = transformEventsData(data);

  return {
    events,
    pagination: {
      page,
      limit,
      total: count || 0,
      hasMore: (count || 0) > page * limit,
    },
  };
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

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}