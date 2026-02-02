import { supabase } from '@/lib/supabase/client';
import { Database } from '@/types/database';

export type PersonalEvent = Database['public']['Tables']['personal_events']['Row'];
export type PersonalEventInsert = Database['public']['Tables']['personal_events']['Insert'];
export type PersonalEventUpdate = Database['public']['Tables']['personal_events']['Update'];

export interface EventFormData {
  title: string;
  start_time: string;
  end_time: string;
  location: string;
  notes: string;
}

export interface CreateEventInput {
  title: string;
  start_time: string;
  end_time: string;
  location?: string;
  notes?: string;
}

export interface UpdateEventInput {
  title?: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  notes?: string;
}

export interface EventsResponse {
  data: PersonalEvent[] | null;
  error: Error | null;
}

export interface EventResponse {
  data: PersonalEvent | null;
  error: Error | null;
}

export async function getEvents(): Promise<EventsResponse> {
  try {
    const { data, error } = await supabase
      .from('personal_events')
      .select('*')
      .order('start_time', { ascending: true });

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data || [], error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error : new Error('Unknown error') };
  }
}

export async function getEvent(id: string): Promise<EventResponse> {
  try {
    const { data, error } = await supabase
      .from('personal_events')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error : new Error('Unknown error') };
  }
}

export async function createEvent(event: CreateEventInput): Promise<EventResponse> {
  try {
    const { data, error } = await supabase
      .from('personal_events')
      .insert(event as PersonalEventInsert)
      .select()
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error : new Error('Unknown error') };
  }
}

export async function updateEvent(id: string, updates: UpdateEventInput): Promise<EventResponse> {
  try {
    const { data, error } = await supabase
      .from('personal_events')
      .update(updates as PersonalEventUpdate)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error : new Error('Unknown error') };
  }
}

export async function deleteEvent(id: string): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { error } = await supabase
      .from('personal_events')
      .delete()
      .eq('id', id);

    if (error) {
      return { success: false, error: new Error(error.message) };
    }

    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error : new Error('Unknown error') };
  }
}

export async function getEventsByDateRange(
  startDate: string,
  endDate: string
): Promise<EventsResponse> {
  try {
    const { data, error } = await supabase
      .from('personal_events')
      .select('*')
      .gte('start_time', startDate)
      .lte('start_time', endDate)
      .order('start_time', { ascending: true });

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data || [], error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error : new Error('Unknown error') };
  }
}

export async function searchEvents(query: string): Promise<EventsResponse> {
  try {
    const { data, error } = await supabase
      .from('personal_events')
      .select('*')
      .ilike('title', `%${query}%`)
      .order('start_time', { ascending: true });

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data || [], error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error : new Error('Unknown error') };
  }
}
